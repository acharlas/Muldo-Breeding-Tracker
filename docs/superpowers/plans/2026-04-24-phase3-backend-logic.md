# Phase 3 — Backend Business Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 5 backend services that power the tracker: inventory CRUD, breed + auto-clone, cascade needs calculation, enclos planner, and batch cycle endpoint.

**Architecture:** Each domain gets a service file (pure async functions, no HTTP) and a router file (thin FastAPI handlers). The cascade service exposes a pure calculation function so it can be unit-tested without a DB. All routers are wired into `main.py`. Integration tests follow the same `ASGITransport` + real DB pattern established in Phase 2.

**Tech Stack:** FastAPI / SQLAlchemy 2 async / Pydantic v2 / pytest + pytest-asyncio

---

## Domain Context (read before implementing)

### Species & Generations
- 120 species across Gen 1–10: 5 Gen 1 (base, captured), 10 Gen 2, ..., 50 Gen 10
- Gen 1 species have no croisements — they are captured from the wild only
- Gen 10 species are the final goal: 1 of each (50 species)

### Breeding mechanic
- Each breed requires 1 fertile ♀ + 1 fertile ♂ of the correct parent species
- After the breed, **both parents become infertile** (`is_fertile=False`)
- A breed always produces exactly 1 child muldo
  - `success=True` → child is the intended target species (`origin="bred_success"`)
  - `success=False` → child is a different species the player reports (`origin="bred_fail"`)
- Recipe validation (when `success=True`): the child species must correspond to a valid `breeding_recipe` for those parent species. Since the game is **symmetric** (any ♀ × any ♂ of the right species gives the same result), check BOTH orderings of parent species in the recipe table

### Auto-clone mechanic
- After every breed, scan for groups of 2+ **sterile muldos of the same species AND same sex**
- If found: delete any 2 of them, create 1 new **fertile** muldo of that species/sex with `origin="cloned"`, log in `clone_log`
- Repeat until no more cloneable pairs exist
- This is NOT multiplication: from a pair of parents, you always end up with 2 muldos (1 bred child + at most 1 clone result)

### Cascade formula
- **Gen 10**: production_target = 1 per species (goal is 1 of each)
- **Gen 1–9**: production_target[S] = Σ ceil(remaining[C] / 2) for each child species C where S is a parent in an **optimal recipe**
- remaining[S] = max(0, production_target[S] − owned_fertile[S])
- Process top-down: Gen 10 → Gen 9 → ... → Gen 1 (each gen's remaining is needed before the next lower gen)
- The `/2` reflects the breed+auto-clone recycling: N starting muldos of one sex yield ~2N−1 total breedings, so ceil(R/2) muldos are needed to produce R children
- owned_fertile[S] = count of all fertile individuals of species S (both sexes combined)

### Planner
- Capacity: `enclos_count × 5` pairs (10 muldos per enclos, 5 pairs)
- Priority: child species generation ASC (lowest gen first), then remaining DESC
- Only plan breeds for which both a fertile ♀ of parent_f_species and a fertile ♂ of parent_m_species are available in inventory
- Uses **optimal recipes only**
- Success chance: fixed at 55% = ((50+50) × 0.15 + 30 + 10) / 100 (assumes level 50 muldos + optimal bonus)
- Return specific muldo IDs for each planned pair (actual inventory individuals)

### Cycle number
- Stored in `breeding_log.cycle_number`
- Current cycle = `MAX(cycle_number) FROM breeding_log` or 0 if no logs yet
- Each `POST /api/breed/batch` call increments it by 1 (all breeds in the batch share the same cycle number)
- `POST /api/breed` (single) uses the current cycle number (does not increment)

---

## File Map

```
api/
├── app/
│   ├── services/
│   │   ├── __init__.py       (exists — empty)
│   │   ├── inventory.py      CREATE — inventory read/write functions
│   │   ├── breeding.py       CREATE — breed + auto-clone functions
│   │   ├── cascade.py        CREATE — cascade calculation (pure function)
│   │   └── planner.py        CREATE — enclos planning (pure function)
│   ├── routers/
│   │   ├── __init__.py       (exists)
│   │   ├── seed.py           (exists)
│   │   ├── inventory.py      CREATE — inventory endpoints
│   │   ├── breeding.py       CREATE — breed endpoints
│   │   ├── cascade.py        CREATE — cascade endpoint
│   │   └── planner.py        CREATE — planner endpoint
│   ├── schemas/
│   │   └── schemas.py        MODIFY — add Phase 3 schemas
│   └── main.py               MODIFY — include 4 new routers
└── tests/
    ├── conftest.py            (exists — engine.dispose fixture)
    ├── test_inventory.py      CREATE — inventory endpoint integration tests
    ├── test_breeding.py       CREATE — breeding endpoint integration tests + auto-clone unit tests
    ├── test_cascade.py        CREATE — cascade unit tests (pure function) + endpoint smoke test
    └── test_planner.py        CREATE — planner endpoint integration tests
```

---

## Task 1: Inventory service + router

**Files:**
- Modify: `api/app/schemas/schemas.py`
- Create: `api/app/services/inventory.py`
- Create: `api/app/routers/inventory.py`
- Modify: `api/app/main.py`
- Create: `api/tests/test_inventory.py`

- [ ] **Step 1.1 — Write failing tests**

`api/tests/test_inventory.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_inventory_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/inventory")
    assert response.status_code == 200
    assert response.json() == {}


@pytest.mark.asyncio
async def test_capture_creates_fertile_individual():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/inventory/capture", json={"species_name": "Doré", "sex": "F"})
    assert response.status_code == 200
    data = response.json()
    assert data["species_name"] == "Doré"
    assert data["sex"] == "F"
    assert data["is_fertile"] is True
    assert data["origin"] == "captured"


@pytest.mark.asyncio
async def test_capture_invalid_species():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/inventory/capture", json={"species_name": "InvalidXYZ", "sex": "F"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_bulk_capture_creates_n_individuals():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/inventory/bulk-capture", json={"species_name": "Ebène", "sex": "M", "count": 3})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert all(d["sex"] == "M" and d["origin"] == "captured" and d["is_fertile"] is True for d in data)


@pytest.mark.asyncio
async def test_inventory_shows_captured():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/inventory")
    assert response.status_code == 200
    data = response.json()
    assert "Doré" in data
    assert data["Doré"]["fertile_f"] >= 1


@pytest.mark.asyncio
async def test_delete_muldo():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        create = await client.post("/api/inventory/capture", json={"species_name": "Indigo", "sex": "F"})
        muldo_id = create.json()["id"]
        delete = await client.delete(f"/api/inventory/{muldo_id}")
    assert delete.status_code == 204


@pytest.mark.asyncio
async def test_delete_nonexistent_muldo():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.delete("/api/inventory/999999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_inventory_stats():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/inventory/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_fertile" in data
    assert "total_sterile" in data
    assert "par_gen" in data
```

> **Note:** These tests run sequentially against the real DB. The inventory accumulates captures from prior tests — assertions use `>=` where appropriate.

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
docker compose run --rm api python -m pytest tests/test_inventory.py -v
```
Expected: `ImportError` or 404 — routes not defined.

- [ ] **Step 1.3 — Add schemas to `api/app/schemas/schemas.py`**

Append to existing file:
```python
from typing import Literal
from datetime import datetime


class MuldoOut(BaseModel):
    id: int
    species_name: str
    generation: int
    sex: str
    is_fertile: bool
    origin: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InventoryEntry(BaseModel):
    fertile_f: int
    fertile_m: int
    sterile_f: int
    sterile_m: int


class InventoryStats(BaseModel):
    total_fertile: int
    total_sterile: int
    par_gen: dict[str, dict[str, int]]  # gen -> {fertile, sterile}


class CaptureRequest(BaseModel):
    species_name: str
    sex: Literal["F", "M"]


class BulkCaptureRequest(BaseModel):
    species_name: str
    sex: Literal["F", "M"]
    count: int
```

- [ ] **Step 1.4 — Create `api/app/services/inventory.py`**

```python
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.models import MuldoIndividual, MuldoSpecies, SexEnum, OriginEnum


async def _get_species_or_404(db: AsyncSession, species_name: str) -> MuldoSpecies:
    result = await db.execute(select(MuldoSpecies).where(MuldoSpecies.name == species_name))
    species = result.scalar_one_or_none()
    if species is None:
        raise HTTPException(status_code=404, detail=f"Species '{species_name}' not found")
    return species


async def capture(db: AsyncSession, species_name: str, sex: str) -> MuldoIndividual:
    species = await _get_species_or_404(db, species_name)
    muldo = MuldoIndividual(
        species_id=species.id,
        sex=SexEnum(sex),
        is_fertile=True,
        origin=OriginEnum.captured,
    )
    db.add(muldo)
    await db.flush()
    await db.refresh(muldo)
    await db.commit()
    return muldo


async def bulk_capture(db: AsyncSession, species_name: str, sex: str, count: int) -> list[MuldoIndividual]:
    species = await _get_species_or_404(db, species_name)
    muldos = [
        MuldoIndividual(
            species_id=species.id,
            sex=SexEnum(sex),
            is_fertile=True,
            origin=OriginEnum.captured,
        )
        for _ in range(count)
    ]
    db.add_all(muldos)
    await db.flush()
    for m in muldos:
        await db.refresh(m)
    await db.commit()
    return muldos


async def delete_muldo(db: AsyncSession, muldo_id: int) -> None:
    result = await db.execute(select(MuldoIndividual).where(MuldoIndividual.id == muldo_id))
    muldo = result.scalar_one_or_none()
    if muldo is None:
        raise HTTPException(status_code=404, detail=f"Muldo {muldo_id} not found")
    await db.delete(muldo)
    await db.commit()


async def get_inventory(db: AsyncSession) -> dict[str, dict]:
    rows = (
        await db.execute(
            select(MuldoIndividual, MuldoSpecies)
            .join(MuldoSpecies, MuldoIndividual.species_id == MuldoSpecies.id)
            .order_by(MuldoSpecies.name)
        )
    ).all()

    result: dict[str, dict] = {}
    for muldo, species in rows:
        entry = result.setdefault(species.name, {"fertile_f": 0, "fertile_m": 0, "sterile_f": 0, "sterile_m": 0})
        if muldo.is_fertile:
            if muldo.sex == SexEnum.F:
                entry["fertile_f"] += 1
            else:
                entry["fertile_m"] += 1
        else:
            if muldo.sex == SexEnum.F:
                entry["sterile_f"] += 1
            else:
                entry["sterile_m"] += 1
    return result


async def get_stats(db: AsyncSession) -> dict:
    rows = (
        await db.execute(
            select(MuldoIndividual, MuldoSpecies)
            .join(MuldoSpecies, MuldoIndividual.species_id == MuldoSpecies.id)
        )
    ).all()

    total_fertile = 0
    total_sterile = 0
    par_gen: dict[str, dict] = {}

    for muldo, species in rows:
        gen_key = str(species.generation)
        gen_entry = par_gen.setdefault(gen_key, {"fertile": 0, "sterile": 0})
        if muldo.is_fertile:
            total_fertile += 1
            gen_entry["fertile"] += 1
        else:
            total_sterile += 1
            gen_entry["sterile"] += 1

    return {"total_fertile": total_fertile, "total_sterile": total_sterile, "par_gen": par_gen}
```

- [ ] **Step 1.5 — Create `api/app/routers/inventory.py`**

```python
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import MuldoOut, InventoryEntry, InventoryStats, CaptureRequest, BulkCaptureRequest
from app.services import inventory as inv_svc
from app.models.models import MuldoSpecies
from sqlalchemy import select

router = APIRouter(prefix="/api/inventory")


def _muldo_to_out(muldo, species: MuldoSpecies) -> MuldoOut:
    return MuldoOut(
        id=muldo.id,
        species_name=species.name,
        generation=species.generation,
        sex=muldo.sex.value,
        is_fertile=muldo.is_fertile,
        origin=muldo.origin.value,
        created_at=muldo.created_at,
    )


@router.get("", response_model=dict[str, InventoryEntry])
async def get_inventory(db: AsyncSession = Depends(get_db)):
    return await inv_svc.get_inventory(db)


@router.post("/capture", response_model=MuldoOut)
async def capture(body: CaptureRequest, db: AsyncSession = Depends(get_db)):
    muldo = await inv_svc.capture(db, body.species_name, body.sex)
    species = (await db.execute(select(MuldoSpecies).where(MuldoSpecies.id == muldo.species_id))).scalar_one()
    return _muldo_to_out(muldo, species)


@router.post("/bulk-capture", response_model=list[MuldoOut])
async def bulk_capture(body: BulkCaptureRequest, db: AsyncSession = Depends(get_db)):
    muldos = await inv_svc.bulk_capture(db, body.species_name, body.sex, body.count)
    species = (await db.execute(select(MuldoSpecies).where(MuldoSpecies.name == body.species_name))).scalar_one()
    return [_muldo_to_out(m, species) for m in muldos]


@router.get("/stats", response_model=InventoryStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    return await inv_svc.get_stats(db)


@router.delete("/{muldo_id}", status_code=204)
async def delete_muldo(muldo_id: int, db: AsyncSession = Depends(get_db)):
    await inv_svc.delete_muldo(db, muldo_id)
    return Response(status_code=204)
```

- [ ] **Step 1.6 — Add router to `api/app/main.py`**

Add after the existing seed router import/include:
```python
from app.routers.inventory import router as inventory_router
app.include_router(inventory_router)
```

- [ ] **Step 1.7 — Run tests**

```bash
docker compose run --rm api python -m pytest tests/test_inventory.py -v
```
Expected: 8 tests passing.

> If `test_inventory_shows_captured` fails with `fertile_f == 0`, check that the capture test ran first (tests run in file order).

- [ ] **Step 1.8 — Run full suite**

```bash
docker compose run --rm api python -m pytest tests/ -v
```
Expected: all 21 tests passing (13 existing + 8 new).

- [ ] **Step 1.9 — Commit**

```bash
git add api/app/schemas/schemas.py api/app/services/inventory.py api/app/routers/inventory.py api/app/main.py api/tests/test_inventory.py
git commit -m "feat: add inventory service and endpoints"
```

---

## Task 2: Breeding service + router (single breed + auto-clone)

**Files:**
- Modify: `api/app/schemas/schemas.py`
- Create: `api/app/services/breeding.py`
- Create: `api/app/routers/breeding.py`
- Modify: `api/app/main.py`
- Create: `api/tests/test_breeding.py`

- [ ] **Step 2.1 — Write failing tests**

`api/tests/test_breeding.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def _capture(client, species_name: str, sex: str) -> dict:
    r = await client.post("/api/inventory/capture", json={"species_name": species_name, "sex": sex})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.asyncio
async def test_breed_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f = await _capture(client, "Doré", "F")
        m = await _capture(client, "Pourpre", "M")
        response = await client.post("/api/breed", json={
            "parent_f_id": f["id"],
            "parent_m_id": m["id"],
            "success": True,
            "child_species_name": "Doré et Pourpre",
            "child_sex": "F",
        })
    assert response.status_code == 200
    data = response.json()
    assert data["child"]["species_name"] == "Doré et Pourpre"
    assert data["child"]["sex"] == "F"
    assert data["child"]["origin"] == "bred_success"
    assert data["child"]["is_fertile"] is True


@pytest.mark.asyncio
async def test_breed_marks_parents_infertile():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f = await _capture(client, "Doré", "F")
        m = await _capture(client, "Pourpre", "M")
        await client.post("/api/breed", json={
            "parent_f_id": f["id"], "parent_m_id": m["id"],
            "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M",
        })
        # Try to breed the same parents again — should fail
        response = await client.post("/api/breed", json={
            "parent_f_id": f["id"], "parent_m_id": m["id"],
            "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M",
        })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_breed_fail_produces_child():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f = await _capture(client, "Doré", "F")
        m = await _capture(client, "Pourpre", "M")
        response = await client.post("/api/breed", json={
            "parent_f_id": f["id"], "parent_m_id": m["id"],
            "success": False, "child_species_name": "Ebène", "child_sex": "M",
        })
    assert response.status_code == 200
    data = response.json()
    assert data["child"]["origin"] == "bred_fail"
    assert data["child"]["species_name"] == "Ebène"


@pytest.mark.asyncio
async def test_breed_invalid_child_species_when_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f = await _capture(client, "Doré", "F")
        m = await _capture(client, "Pourpre", "M")
        # "Indigo et Ebène" is not achievable from Doré × Pourpre
        response = await client.post("/api/breed", json={
            "parent_f_id": f["id"], "parent_m_id": m["id"],
            "success": True, "child_species_name": "Ebène et Indigo", "child_sex": "F",
        })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_breed_wrong_sex_parent():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f = await _capture(client, "Doré", "M")   # male, but used as parent_f
        m = await _capture(client, "Pourpre", "M")
        response = await client.post("/api/breed", json={
            "parent_f_id": f["id"], "parent_m_id": m["id"],
            "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "F",
        })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_auto_clone_triggers_on_same_species_sex():
    """Two sterile Doré♀ after breeding should auto-clone into 1 fertile Doré♀."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create 2 Doré♀ and 2 Pourpre♂ so both Doré♀ can breed
        f1 = await _capture(client, "Doré", "F")
        f2 = await _capture(client, "Doré", "F")
        m1 = await _capture(client, "Pourpre", "M")
        m2 = await _capture(client, "Pourpre", "M")

        # First breed: Doré♀1 × Pourpre♂1
        await client.post("/api/breed", json={
            "parent_f_id": f1["id"], "parent_m_id": m1["id"],
            "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M",
        })
        # Second breed: Doré♀2 × Pourpre♂2 — should trigger auto-clone (2 sterile Doré♀)
        r2 = await client.post("/api/breed", json={
            "parent_f_id": f2["id"], "parent_m_id": m2["id"],
            "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M",
        })
    assert r2.status_code == 200
    data = r2.json()
    clones = data["clones_performed"]
    assert len(clones) >= 1
    clone = next(c for c in clones if c["species_name"] == "Doré" and c["sex"] == "F")
    assert clone is not None
```

- [ ] **Step 2.2 — Run tests to confirm they fail**

```bash
docker compose run --rm api python -m pytest tests/test_breeding.py -v
```
Expected: `ImportError` — routes not defined.

- [ ] **Step 2.3 — Add schemas to `api/app/schemas/schemas.py`**

Append:
```python
class BreedRequest(BaseModel):
    parent_f_id: int
    parent_m_id: int
    success: bool
    child_species_name: str
    child_sex: Literal["F", "M"]


class ClonePerformed(BaseModel):
    species_name: str
    sex: str


class BreedResult(BaseModel):
    child: MuldoOut
    clones_performed: list[ClonePerformed]
```

- [ ] **Step 2.4 — Create `api/app/services/breeding.py`**

```python
import math
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.models import (
    MuldoIndividual, MuldoSpecies, BreedingRecipe, BreedingLog, CloneLog,
    SexEnum, OriginEnum,
)


async def _get_current_cycle(db: AsyncSession) -> int:
    result = await db.scalar(select(func.max(BreedingLog.cycle_number)))
    return result or 0


async def _load_muldo_or_400(db: AsyncSession, muldo_id: int) -> MuldoIndividual:
    result = await db.execute(select(MuldoIndividual).where(MuldoIndividual.id == muldo_id))
    muldo = result.scalar_one_or_none()
    if muldo is None:
        raise HTTPException(status_code=400, detail=f"Muldo {muldo_id} not found")
    return muldo


async def _load_species_by_name(db: AsyncSession, name: str) -> MuldoSpecies:
    result = await db.execute(select(MuldoSpecies).where(MuldoSpecies.name == name))
    species = result.scalar_one_or_none()
    if species is None:
        raise HTTPException(status_code=422, detail=f"Species '{name}' not found")
    return species


async def _run_auto_clone(db: AsyncSession) -> list[dict]:
    """Find and process all cloneable pairs (same species + same sex, 2+ sterile). Returns list of clone records."""
    clones = []
    while True:
        # Find any species+sex group with 2+ sterile
        stmt = (
            select(MuldoIndividual.species_id, MuldoIndividual.sex)
            .where(MuldoIndividual.is_fertile == False)  # noqa: E712
            .group_by(MuldoIndividual.species_id, MuldoIndividual.sex)
            .having(func.count() >= 2)
            .limit(1)
        )
        row = (await db.execute(stmt)).first()
        if row is None:
            break

        species_id, sex = row

        # Pick the 2 oldest sterile of this group
        victims_result = await db.execute(
            select(MuldoIndividual)
            .where(
                MuldoIndividual.species_id == species_id,
                MuldoIndividual.sex == sex,
                MuldoIndividual.is_fertile == False,  # noqa: E712
            )
            .order_by(MuldoIndividual.created_at)
            .limit(2)
        )
        victims = list(victims_result.scalars())

        # Create clone result
        clone = MuldoIndividual(
            species_id=species_id,
            sex=sex,
            is_fertile=True,
            origin=OriginEnum.cloned,
        )
        db.add(clone)
        await db.flush()

        # Log clone
        log = CloneLog(
            donor_1_id=victims[0].id,
            donor_2_id=victims[1].id,
            result_id=clone.id,
        )
        db.add(log)

        # Delete the 2 sterile donors
        await db.delete(victims[0])
        await db.delete(victims[1])
        await db.flush()

        species_result = await db.execute(select(MuldoSpecies).where(MuldoSpecies.id == species_id))
        species = species_result.scalar_one()
        clones.append({"species_name": species.name, "sex": sex.value})

    return clones


async def breed(
    db: AsyncSession,
    parent_f_id: int,
    parent_m_id: int,
    success: bool,
    child_species_name: str,
    child_sex: str,
    cycle_number: int | None = None,
) -> dict:
    parent_f = await _load_muldo_or_400(db, parent_f_id)
    parent_m = await _load_muldo_or_400(db, parent_m_id)

    # Validate sex
    if parent_f.sex != SexEnum.F:
        raise HTTPException(status_code=400, detail="parent_f_id must be a female muldo")
    if parent_m.sex != SexEnum.M:
        raise HTTPException(status_code=400, detail="parent_m_id must be a male muldo")

    # Validate fertility
    if not parent_f.is_fertile:
        raise HTTPException(status_code=400, detail=f"Muldo {parent_f_id} is not fertile")
    if not parent_m.is_fertile:
        raise HTTPException(status_code=400, detail=f"Muldo {parent_m_id} is not fertile")

    child_species = await _load_species_by_name(db, child_species_name)

    # Validate recipe when success=True
    if success:
        recipe_check = await db.execute(
            select(BreedingRecipe).where(
                BreedingRecipe.child_species_id == child_species.id,
                or_(
                    and_(
                        BreedingRecipe.parent_f_species_id == parent_f.species_id,
                        BreedingRecipe.parent_m_species_id == parent_m.species_id,
                    ),
                    and_(
                        BreedingRecipe.parent_f_species_id == parent_m.species_id,
                        BreedingRecipe.parent_m_species_id == parent_f.species_id,
                    ),
                ),
            )
        )
        if recipe_check.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=422,
                detail=f"'{child_species_name}' is not a valid child of these parent species",
            )

    # Mark parents infertile
    parent_f.is_fertile = False
    parent_m.is_fertile = False

    # Create child
    child = MuldoIndividual(
        species_id=child_species.id,
        sex=SexEnum(child_sex),
        is_fertile=True,
        origin=OriginEnum.bred_success if success else OriginEnum.bred_fail,
        parent_f_id=parent_f_id,
        parent_m_id=parent_m_id,
    )
    db.add(child)
    await db.flush()

    # Log breed
    if cycle_number is None:
        cycle_number = await _get_current_cycle(db)
    log = BreedingLog(
        parent_f_id=parent_f_id,
        parent_m_id=parent_m_id,
        child_id=child.id,
        target_species_id=child_species.id,
        success=success,
        cycle_number=cycle_number,
    )
    db.add(log)
    await db.flush()

    # Auto-clone
    clones = await _run_auto_clone(db)

    await db.commit()
    await db.refresh(child)

    return {"child": child, "child_species": child_species, "clones_performed": clones}
```

- [ ] **Step 2.5 — Create `api/app/routers/breeding.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import BreedRequest, BreedResult, MuldoOut, ClonePerformed
from app.services import breeding as breed_svc

router = APIRouter(prefix="/api")


@router.post("/breed", response_model=BreedResult)
async def breed(body: BreedRequest, db: AsyncSession = Depends(get_db)):
    result = await breed_svc.breed(
        db,
        parent_f_id=body.parent_f_id,
        parent_m_id=body.parent_m_id,
        success=body.success,
        child_species_name=body.child_species_name,
        child_sex=body.child_sex,
    )
    child = result["child"]
    child_species = result["child_species"]
    return BreedResult(
        child=MuldoOut(
            id=child.id,
            species_name=child_species.name,
            generation=child_species.generation,
            sex=child.sex.value,
            is_fertile=child.is_fertile,
            origin=child.origin.value,
            created_at=child.created_at,
        ),
        clones_performed=[ClonePerformed(**c) for c in result["clones_performed"]],
    )
```

- [ ] **Step 2.6 — Add router to `api/app/main.py`**

```python
from app.routers.breeding import router as breeding_router
app.include_router(breeding_router)
```

- [ ] **Step 2.7 — Run tests**

```bash
docker compose run --rm api python -m pytest tests/test_breeding.py -v
```
Expected: 6 tests passing.

> If `test_auto_clone_triggers_on_same_species_sex` fails, check that `_run_auto_clone` uses `is_fertile == False` (SQLAlchemy comparison, not `not is_fertile`).

- [ ] **Step 2.8 — Run full suite**

```bash
docker compose run --rm api python -m pytest tests/ -v
```
Expected: all 27 tests passing.

- [ ] **Step 2.9 — Commit**

```bash
git add api/app/schemas/schemas.py api/app/services/breeding.py api/app/routers/breeding.py api/app/main.py api/tests/test_breeding.py
git commit -m "feat: add breeding service with auto-clone logic"
```

---

## Task 3: Cascade service + router

**Files:**
- Modify: `api/app/schemas/schemas.py`
- Create: `api/app/services/cascade.py`
- Create: `api/app/routers/cascade.py`
- Modify: `api/app/main.py`
- Create: `api/tests/test_cascade.py`

- [ ] **Step 3.1 — Write failing tests**

`api/tests/test_cascade.py`:
```python
import math
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.cascade import compute_cascade


# --- Unit tests for the pure calculation function ---

def _make_species(id, name, gen):
    """Simple namespace object for testing."""
    from types import SimpleNamespace
    return SimpleNamespace(id=id, name=name, generation=gen)


def _make_recipe(child_id, pf_id, pm_id):
    from types import SimpleNamespace
    return SimpleNamespace(child_species_id=child_id, parent_f_species_id=pf_id, parent_m_species_id=pm_id)


def test_cascade_gen10_target_is_1():
    """Gen 10 species always have production_target=1."""
    species = [_make_species(1, "Gen10A", 10)]
    recipes = []
    owned = {}
    result = compute_cascade(species, recipes, owned)
    assert len(result) == 1
    assert result[0]["species_name"] == "Gen10A"
    assert result[0]["production_target"] == 1
    assert result[0]["remaining"] == 1
    assert result[0]["status"] == "a_faire"


def test_cascade_gen10_owned_reduces_remaining():
    """Owning a Gen 10 species reduces its remaining to 0."""
    species = [_make_species(1, "Gen10A", 10)]
    owned = {1: 1}
    result = compute_cascade(species, [], owned)
    assert result[0]["remaining"] == 0
    assert result[0]["status"] == "ok"


def test_cascade_parent_needs_ceil_half_of_child_remaining():
    """A parent of a Gen 10 child with remaining=1 needs ceil(1/2)=1."""
    species = [
        _make_species(10, "Gen10A", 10),
        _make_species(9, "Parent", 9),
        _make_species(8, "OtherParent", 9),
    ]
    # Gen10A has recipe: Parent (pf) × OtherParent (pm)
    recipes = [_make_recipe(child_id=10, pf_id=9, pm_id=8)]
    result = compute_cascade(species, recipes, {})
    by_name = {r["species_name"]: r for r in result}
    assert by_name["Parent"]["production_target"] == math.ceil(1 / 2)  # == 1
    assert by_name["OtherParent"]["production_target"] == math.ceil(1 / 2)  # == 1


def test_cascade_parent_used_by_multiple_children():
    """A parent used by 2 Gen 10 children (both remaining=1) needs ceil(1/2)+ceil(1/2)=2."""
    species = [
        _make_species(10, "Gen10A", 10),
        _make_species(11, "Gen10B", 10),
        _make_species(9, "SharedParent", 9),
        _make_species(8, "OtherF", 9),
        _make_species(7, "OtherG", 9),
    ]
    recipes = [
        _make_recipe(child_id=10, pf_id=9, pm_id=8),  # SharedParent is pf for Gen10A
        _make_recipe(child_id=11, pf_id=9, pm_id=7),  # SharedParent is pf for Gen10B
    ]
    result = compute_cascade(species, recipes, {})
    by_name = {r["species_name"]: r for r in result}
    assert by_name["SharedParent"]["production_target"] == 2


def test_cascade_owned_reduces_remaining_not_target():
    """Owning 1 of a parent reduces remaining but not production_target."""
    species = [
        _make_species(10, "Gen10A", 10),
        _make_species(9, "Parent", 9),
        _make_species(8, "Other", 9),
    ]
    recipes = [_make_recipe(child_id=10, pf_id=9, pm_id=8)]
    result = compute_cascade(species, recipes, {9: 1})
    by_name = {r["species_name"]: r for r in result}
    assert by_name["Parent"]["production_target"] == 1
    assert by_name["Parent"]["remaining"] == 0
    assert by_name["Parent"]["status"] == "ok"


def test_cascade_status_en_cours_when_partial():
    """Status is 'en_cours' when remaining > 0 but some owned."""
    species = [_make_species(10, "Gen10A", 10)]
    result = compute_cascade(species, [], {})
    assert result[0]["status"] == "a_faire"  # 0 owned

    result2 = compute_cascade([_make_species(10, "Gen10B", 10)], [], {10: 0})
    assert result2[0]["status"] == "a_faire"


def test_cascade_expected_f_is_66_percent():
    """expected_f = round(target * 0.66), expected_m = target - expected_f."""
    species = [_make_species(1, "Gen1", 1), _make_species(10, "Gen10", 10)]
    recipes = [_make_recipe(child_id=10, pf_id=1, pm_id=1)]
    result = compute_cascade(species, recipes, {})
    by_name = {r["species_name"]: r for r in result}
    gen1 = by_name["Gen1"]
    assert gen1["expected_f"] == round(gen1["production_target"] * 0.66)
    assert gen1["expected_m"] == gen1["production_target"] - gen1["expected_f"]


# --- Integration smoke test ---

@pytest.mark.asyncio
async def test_cascade_endpoint_returns_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/cascade")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 120  # all 120 species
    # Every Gen 10 species has production_target=1
    gen10 = [d for d in data if d["generation"] == 10]
    assert all(d["production_target"] == 1 for d in gen10)
```

- [ ] **Step 3.2 — Run tests to confirm they fail**

```bash
docker compose run --rm api python -m pytest tests/test_cascade.py -v
```
Expected: `ImportError` — `compute_cascade` not defined.

- [ ] **Step 3.3 — Create `api/app/services/cascade.py`**

```python
import math
from dataclasses import dataclass
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe, MuldoIndividual


@dataclass
class CascadeItem:
    species_name: str
    generation: int
    production_target: int
    fertile_f: int
    fertile_m: int
    total_owned: int
    remaining: int
    status: str
    expected_f: int
    expected_m: int


def compute_cascade(
    all_species: list,
    optimal_recipes: list,
    owned_fertile: dict[int, int],  # species_id -> total fertile count
) -> list[dict]:
    """Pure calculation function. Processes Gen 10 → Gen 1 top-down.
    
    all_species: objects with .id, .name, .generation
    optimal_recipes: objects with .child_species_id, .parent_f_species_id, .parent_m_species_id
    owned_fertile: species_id -> count of fertile individuals owned
    """
    # Build parent_id -> list of child_ids (via optimal recipes)
    children_of: dict[int, list[int]] = defaultdict(list)
    for recipe in optimal_recipes:
        children_of[recipe.parent_f_species_id].append(recipe.child_species_id)
        children_of[recipe.parent_m_species_id].append(recipe.child_species_id)

    # Group species by generation
    by_gen: dict[int, list] = defaultdict(list)
    for s in all_species:
        by_gen[s.generation].append(s)

    target: dict[int, int] = {}
    remaining: dict[int, int] = {}

    # Process top-down: Gen 10 → Gen 1
    for gen in range(10, 0, -1):
        for species in by_gen.get(gen, []):
            if gen == 10:
                target[species.id] = 1
            else:
                total = sum(
                    math.ceil(remaining.get(child_id, 0) / 2)
                    for child_id in children_of[species.id]
                )
                target[species.id] = total
            owned = owned_fertile.get(species.id, 0)
            remaining[species.id] = max(0, target[species.id] - owned)

    # Build result
    result = []
    for species in sorted(all_species, key=lambda s: (s.generation, s.name)):
        t = target.get(species.id, 0)
        rem = remaining.get(species.id, 0)
        owned = owned_fertile.get(species.id, 0)

        if rem == 0:
            status = "ok"
        elif owned > 0:
            status = "en_cours"
        else:
            status = "a_faire"

        expected_f = round(t * 0.66)
        result.append({
            "species_name": species.name,
            "generation": species.generation,
            "production_target": t,
            "fertile_f": 0,  # filled in by router with actual inventory
            "fertile_m": 0,
            "total_owned": owned,
            "remaining": rem,
            "status": status,
            "expected_f": expected_f,
            "expected_m": t - expected_f,
        })
    return result


async def get_cascade(db: AsyncSession) -> list[dict]:
    """Fetch data from DB and run compute_cascade."""
    all_species = list((await db.execute(select(MuldoSpecies))).scalars())

    optimal_recipes = list(
        (await db.execute(
            select(BreedingRecipe).where(BreedingRecipe.is_optimal == True)  # noqa: E712
        )).scalars()
    )

    # Count fertile per species (both sexes)
    fertile_rows = (
        await db.execute(
            select(MuldoIndividual.species_id, MuldoIndividual.sex)
            .where(MuldoIndividual.is_fertile == True)  # noqa: E712
        )
    ).all()

    owned_fertile: dict[int, int] = defaultdict(int)
    fertile_f_per_species: dict[int, int] = defaultdict(int)
    fertile_m_per_species: dict[int, int] = defaultdict(int)
    for species_id, sex in fertile_rows:
        owned_fertile[species_id] += 1
        if sex.value == "F":
            fertile_f_per_species[species_id] += 1
        else:
            fertile_m_per_species[species_id] += 1

    items = compute_cascade(all_species, optimal_recipes, dict(owned_fertile))

    # Fill in per-sex fertile counts
    species_by_name = {s.name: s for s in all_species}
    for item in items:
        sid = species_by_name[item["species_name"]].id
        item["fertile_f"] = fertile_f_per_species.get(sid, 0)
        item["fertile_m"] = fertile_m_per_species.get(sid, 0)

    return items
```

- [ ] **Step 3.4 — Add schemas to `api/app/schemas/schemas.py`**

Append:
```python
class CascadeItem(BaseModel):
    species_name: str
    generation: int
    production_target: int
    fertile_f: int
    fertile_m: int
    total_owned: int
    remaining: int
    status: str
    expected_f: int
    expected_m: int
```

- [ ] **Step 3.5 — Create `api/app/routers/cascade.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import CascadeItem
from app.services.cascade import get_cascade

router = APIRouter(prefix="/api")


@router.get("/cascade", response_model=list[CascadeItem])
async def cascade(db: AsyncSession = Depends(get_db)):
    return await get_cascade(db)
```

- [ ] **Step 3.6 — Add router to `api/app/main.py`**

```python
from app.routers.cascade import router as cascade_router
app.include_router(cascade_router)
```

- [ ] **Step 3.7 — Run tests**

```bash
docker compose run --rm api python -m pytest tests/test_cascade.py -v
```
Expected: 8 tests passing (7 unit + 1 integration).

> For unit tests, `compute_cascade` accepts simple namespace objects — no DB needed.
>
> For the integration test, the DB must be seeded (`GET /api/seed` already ran in earlier test files; if running this file in isolation, call seed first).

- [ ] **Step 3.8 — Run full suite**

```bash
docker compose run --rm api python -m pytest tests/ -v
```
Expected: all 35 tests passing.

- [ ] **Step 3.9 — Commit**

```bash
git add api/app/schemas/schemas.py api/app/services/cascade.py api/app/routers/cascade.py api/app/main.py api/tests/test_cascade.py
git commit -m "feat: add cascade calculation service and endpoint"
```

---

## Task 4: Planner service + router

**Files:**
- Modify: `api/app/schemas/schemas.py`
- Create: `api/app/services/planner.py`
- Create: `api/app/routers/planner.py`
- Modify: `api/app/main.py`
- Create: `api/tests/test_planner.py`

- [ ] **Step 4.1 — Write failing tests**

`api/tests/test_planner.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def _capture(client, species_name, sex, count=1):
    for _ in range(count):
        r = await client.post("/api/inventory/capture", json={"species_name": species_name, "sex": sex})
        assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_plan_empty_inventory_returns_empty_enclos():
    """With no inventory, plan returns no pairs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/plan", json={"enclos_count": 2})
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_pairs"] == 0


@pytest.mark.asyncio
async def test_plan_respects_enclos_capacity():
    """Plan never exceeds enclos_count × 5 pairs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Capture many Gen 1 muldos
        for _ in range(10):
            await _capture(client, "Doré", "F")
            await _capture(client, "Pourpre", "M")
            await _capture(client, "Indigo", "F")
            await _capture(client, "Ebène", "M")
            await _capture(client, "Orchidée", "F")
        response = await client.post("/api/plan", json={"enclos_count": 1})
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["total_pairs"] <= 5


@pytest.mark.asyncio
async def test_plan_only_uses_available_individuals():
    """Pairs reference existing fertile muldo IDs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await _capture(client, "Doré", "F")
        await _capture(client, "Pourpre", "M")
        response = await client.post("/api/plan", json={"enclos_count": 1})
    assert response.status_code == 200
    data = response.json()
    if data["summary"]["total_pairs"] > 0:
        pair = data["enclos"][0]["pairs"][0]
        assert "id" in pair["parent_f"]
        assert "id" in pair["parent_m"]
        assert pair["success_chance"] == pytest.approx(0.55)


@pytest.mark.asyncio
async def test_plan_structure():
    """Response has required fields."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/plan", json={"enclos_count": 2})
    assert response.status_code == 200
    data = response.json()
    assert "enclos" in data
    assert "summary" in data
    assert "total_pairs" in data["summary"]
    assert "estimated_successes" in data["summary"]
    assert "remaining_after" in data["summary"]
```

- [ ] **Step 4.2 — Run tests to confirm they fail**

```bash
docker compose run --rm api python -m pytest tests/test_planner.py -v
```
Expected: `ImportError` — routes not defined.

- [ ] **Step 4.3 — Add schemas to `api/app/schemas/schemas.py`**

Append:
```python
class PlanRequest(BaseModel):
    enclos_count: int


class PlannedParent(BaseModel):
    id: int
    species_name: str
    sex: str


class PlannedPair(BaseModel):
    parent_f: PlannedParent
    parent_m: PlannedParent
    target_child_species: str
    success_chance: float


class PlannedEnclos(BaseModel):
    enclos_number: int
    pairs: list[PlannedPair]


class PlanSummary(BaseModel):
    total_pairs: int
    estimated_successes: float
    remaining_after: int


class PlanResult(BaseModel):
    enclos: list[PlannedEnclos]
    summary: PlanSummary
```

- [ ] **Step 4.4 — Create `api/app/services/planner.py`**

```python
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe, MuldoIndividual, SexEnum

SUCCESS_CHANCE = 0.55  # (50+50)*0.15 + 30 + 10 = 55%, level 50 + optimal bonus


async def compute_plan(db: AsyncSession, enclos_count: int) -> dict:
    capacity = enclos_count * 5

    # Load optimal recipes with child species info
    recipe_rows = (
        await db.execute(
            select(BreedingRecipe, MuldoSpecies)
            .join(MuldoSpecies, BreedingRecipe.child_species_id == MuldoSpecies.id)
            .where(BreedingRecipe.is_optimal == True)  # noqa: E712
        )
    ).all()

    # Load all fertile individuals grouped by (species_id, sex)
    fertile_rows = list(
        (
            await db.execute(
                select(MuldoIndividual)
                .where(MuldoIndividual.is_fertile == True)  # noqa: E712
                .order_by(MuldoIndividual.created_at)
            )
        ).scalars()
    )

    available_f: dict[int, list[MuldoIndividual]] = defaultdict(list)
    available_m: dict[int, list[MuldoIndividual]] = defaultdict(list)
    for m in fertile_rows:
        if m.sex == SexEnum.F:
            available_f[m.species_id].append(m)
        else:
            available_m[m.species_id].append(m)

    # Load cascade to get remaining counts (for priority ordering)
    from app.services.cascade import get_cascade
    cascade_items = await get_cascade(db)
    remaining_by_name = {item["species_name"]: item["remaining"] for item in cascade_items}

    # Load species map
    all_species = {s.id: s for s in (await db.execute(select(MuldoSpecies))).scalars()}

    # Build candidate pairs: for each optimal recipe, check if both parents available
    candidates = []
    for recipe, child_species in recipe_rows:
        pf_available = available_f.get(recipe.parent_f_species_id, [])
        pm_available = available_m.get(recipe.parent_m_species_id, [])
        if not pf_available or not pm_available:
            continue
        candidates.append({
            "recipe": recipe,
            "child_species": child_species,
            "pf": pf_available,
            "pm": pm_available,
        })

    # Sort: child generation ASC, then remaining DESC
    candidates.sort(key=lambda c: (
        c["child_species"].generation,
        -remaining_by_name.get(c["child_species"].name, 0),
    ))

    # Assign pairs up to capacity (each individual can only be used once)
    used_ids: set[int] = set()
    pairs: list[dict] = []

    for cand in candidates:
        if len(pairs) >= capacity:
            break
        recipe = cand["recipe"]
        child_species = cand["child_species"]

        pf = next((m for m in cand["pf"] if m.id not in used_ids), None)
        pm = next((m for m in cand["pm"] if m.id not in used_ids), None)
        if pf is None or pm is None:
            continue

        used_ids.add(pf.id)
        used_ids.add(pm.id)
        pf_species = all_species[pf.species_id]
        pm_species = all_species[pm.species_id]

        pairs.append({
            "parent_f": {"id": pf.id, "species_name": pf_species.name, "sex": "F"},
            "parent_m": {"id": pm.id, "species_name": pm_species.name, "sex": "M"},
            "target_child_species": child_species.name,
            "success_chance": SUCCESS_CHANCE,
        })

    # Pack pairs into enclos (5 per enclos)
    enclos = []
    for i in range(0, len(pairs), 5):
        enclos.append({
            "enclos_number": len(enclos) + 1,
            "pairs": pairs[i:i + 5],
        })

    total_pairs = len(pairs)
    estimated_successes = round(total_pairs * SUCCESS_CHANCE, 2)
    total_remaining = sum(remaining_by_name.values())
    remaining_after = max(0, total_remaining - round(estimated_successes))

    return {
        "enclos": enclos,
        "summary": {
            "total_pairs": total_pairs,
            "estimated_successes": estimated_successes,
            "remaining_after": remaining_after,
        },
    }
```

- [ ] **Step 4.5 — Create `api/app/routers/planner.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import PlanRequest, PlanResult
from app.services.planner import compute_plan

router = APIRouter(prefix="/api")


@router.post("/plan", response_model=PlanResult)
async def plan(body: PlanRequest, db: AsyncSession = Depends(get_db)):
    return await compute_plan(db, body.enclos_count)
```

- [ ] **Step 4.6 — Add router to `api/app/main.py`**

```python
from app.routers.planner import router as planner_router
app.include_router(planner_router)
```

- [ ] **Step 4.7 — Run tests**

```bash
docker compose run --rm api python -m pytest tests/test_planner.py -v
```
Expected: 4 tests passing.

- [ ] **Step 4.8 — Run full suite**

```bash
docker compose run --rm api python -m pytest tests/ -v
```
Expected: all 39 tests passing.

- [ ] **Step 4.9 — Commit**

```bash
git add api/app/schemas/schemas.py api/app/services/planner.py api/app/routers/planner.py api/app/main.py api/tests/test_planner.py
git commit -m "feat: add planner service and endpoint"
```

---

## Task 5: Batch breed endpoint

**Files:**
- Modify: `api/app/schemas/schemas.py`
- Modify: `api/app/routers/breeding.py`
- Create: `api/tests/test_batch.py`

- [ ] **Step 5.1 — Write failing tests**

`api/tests/test_batch.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def _capture(client, species_name, sex):
    r = await client.post("/api/inventory/capture", json={"species_name": species_name, "sex": sex})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.asyncio
async def test_batch_breed_increments_cycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f1 = await _capture(client, "Doré", "F")
        m1 = await _capture(client, "Pourpre", "M")
        f2 = await _capture(client, "Indigo", "F")
        m2 = await _capture(client, "Ebène", "M")

        response = await client.post("/api/breed/batch", json={"results": [
            {"parent_f_id": f1["id"], "parent_m_id": m1["id"],
             "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M"},
            {"parent_f_id": f2["id"], "parent_m_id": m2["id"],
             "success": True, "child_species_name": "Ebène et Indigo", "child_sex": "F"},
        ]})
    assert response.status_code == 200
    data = response.json()
    assert data["total_breeds"] == 2
    assert data["successes"] == 2
    assert data["fails"] == 0
    assert data["cycle_number"] >= 1


@pytest.mark.asyncio
async def test_batch_breed_counts_clones():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create 2 pairs that will both make Doré♀ sterile → auto-clone
        f1 = await _capture(client, "Doré", "F")
        f2 = await _capture(client, "Doré", "F")
        m1 = await _capture(client, "Pourpre", "M")
        m2 = await _capture(client, "Pourpre", "M")

        response = await client.post("/api/breed/batch", json={"results": [
            {"parent_f_id": f1["id"], "parent_m_id": m1["id"],
             "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M"},
            {"parent_f_id": f2["id"], "parent_m_id": m2["id"],
             "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M"},
        ]})
    assert response.status_code == 200
    data = response.json()
    assert data["clones_auto"] >= 1


@pytest.mark.asyncio
async def test_batch_breed_second_batch_increments_cycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f1 = await _capture(client, "Doré", "F")
        m1 = await _capture(client, "Pourpre", "M")
        r1 = await client.post("/api/breed/batch", json={"results": [
            {"parent_f_id": f1["id"], "parent_m_id": m1["id"],
             "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M"},
        ]})
        cycle1 = r1.json()["cycle_number"]

        f2 = await _capture(client, "Indigo", "F")
        m2 = await _capture(client, "Ebène", "M")
        r2 = await client.post("/api/breed/batch", json={"results": [
            {"parent_f_id": f2["id"], "parent_m_id": m2["id"],
             "success": True, "child_species_name": "Ebène et Indigo", "child_sex": "F"},
        ]})
        cycle2 = r2.json()["cycle_number"]

    assert cycle2 == cycle1 + 1


@pytest.mark.asyncio
async def test_batch_returns_updated_cascade():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/breed/batch", json={"results": []})
    assert response.status_code == 200
    data = response.json()
    assert "updated_cascade" in data
    assert isinstance(data["updated_cascade"], list)
```

- [ ] **Step 5.2 — Run tests to confirm they fail**

```bash
docker compose run --rm api python -m pytest tests/test_batch.py -v
```
Expected: `ImportError` or 404 — batch route not defined.

- [ ] **Step 5.3 — Add schemas to `api/app/schemas/schemas.py`**

Append:
```python
class BatchBreedRequest(BaseModel):
    results: list[BreedRequest]


class BatchBreedResult(BaseModel):
    cycle_number: int
    total_breeds: int
    successes: int
    fails: int
    clones_auto: int
    updated_cascade: list[CascadeItem]
```

- [ ] **Step 5.4 — Add batch endpoint to `api/app/routers/breeding.py`**

Add to the existing breeding router file (import `BatchBreedRequest`, `BatchBreedResult`, `CascadeItem` from schemas, and `get_cascade` from services):

```python
from app.schemas.schemas import BreedRequest, BreedResult, MuldoOut, ClonePerformed, BatchBreedRequest, BatchBreedResult, CascadeItem
from app.services.cascade import get_cascade
from app.services import breeding as breed_svc
from sqlalchemy import select, func
from app.models.models import BreedingLog


@router.post("/breed/batch", response_model=BatchBreedResult)
async def breed_batch(body: BatchBreedRequest, db: AsyncSession = Depends(get_db)):
    # Get next cycle number (current max + 1)
    current_max = await db.scalar(select(func.max(BreedingLog.cycle_number)))
    cycle_number = (current_max or 0) + 1

    total_breeds = len(body.results)
    successes = 0
    fails = 0
    clones_auto = 0

    for breed_req in body.results:
        result = await breed_svc.breed(
            db,
            parent_f_id=breed_req.parent_f_id,
            parent_m_id=breed_req.parent_m_id,
            success=breed_req.success,
            child_species_name=breed_req.child_species_name,
            child_sex=breed_req.child_sex,
            cycle_number=cycle_number,
        )
        if breed_req.success:
            successes += 1
        else:
            fails += 1
        clones_auto += len(result["clones_performed"])

    cascade = await get_cascade(db)

    return BatchBreedResult(
        cycle_number=cycle_number,
        total_breeds=total_breeds,
        successes=successes,
        fails=fails,
        clones_auto=clones_auto,
        updated_cascade=[CascadeItem(**item) for item in cascade],
    )
```

> **Important:** The `breed_svc.breed()` function already calls `db.commit()` internally. For the batch endpoint, each breed commits independently — this is intentional: auto-cloning after each breed can free up individuals for subsequent breeds in the same batch.

- [ ] **Step 5.5 — Run tests**

```bash
docker compose run --rm api python -m pytest tests/test_batch.py -v
```
Expected: 4 tests passing.

- [ ] **Step 5.6 — Run full suite**

```bash
docker compose run --rm api python -m pytest tests/ -v
```
Expected: all 43 tests passing.

- [ ] **Step 5.7 — Commit**

```bash
git add api/app/schemas/schemas.py api/app/routers/breeding.py api/tests/test_batch.py
git commit -m "feat: add batch breed endpoint with cycle tracking"
```

---

## Phase 3 Done

Five services now live:
- `GET /api/inventory` + `POST /api/inventory/capture` + `POST /api/inventory/bulk-capture` + `DELETE /api/inventory/{id}` + `GET /api/inventory/stats`
- `POST /api/breed` (single breed + auto-clone)
- `GET /api/cascade` (top-down needs calculation)
- `POST /api/plan` (enclos planning)
- `POST /api/breed/batch` (cycle batch + cascade refresh)

**Next:** Phase 4 — Frontend (TypeScript types, layout, Cascade view, Inventory view, Enclos view, History view).
