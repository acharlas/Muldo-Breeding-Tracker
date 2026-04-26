# Historique View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Historique view showing the full history of breeding sessions (cycles) with per-cycle drill-down into pair results and auto-clone events.

**Architecture:** Snapshot display data (species names, sex) onto `breeding_log` and `clone_log` at write time so deleted individuals don't corrupt history. A new `GET /api/history` endpoint groups rows by `cycle_number` and returns structured JSON. The frontend renders an accordion list of `CycleCard` components fetched via a simple Zustand store.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy async, Alembic, Next.js 15, React, Zustand v5, shadcn/ui base-nova, lucide-react, TypeScript.

---

## File Map

**Create:**
- `api/alembic/versions/20260426_d1e2f3a4b5c6_historique_snapshot_columns.py`
- `api/app/services/history.py`
- `api/app/routers/history.py`
- `frontend/src/stores/history.ts`
- `frontend/src/components/historique/CycleCard.tsx`
- `frontend/src/components/historique/HistoriqueView.tsx`

**Modify:**
- `api/app/models/models.py` — add snapshot columns to `BreedingLog` and `CloneLog`
- `api/app/services/breeding.py` — populate snapshots at write time
- `api/app/schemas/schemas.py` — add history Pydantic models
- `api/app/main.py` — register history router
- `frontend/src/types/index.ts` — add history TypeScript types
- `frontend/src/lib/api.ts` — add `getHistory` call
- `frontend/src/components/layout/Sidebar.tsx` — add Historique nav item
- `frontend/src/app/page.tsx` — add `'historique'` to View type and render branch

---

## Task 1: DB Migration — add snapshot columns

**Files:**
- Create: `api/alembic/versions/20260426_d1e2f3a4b5c6_historique_snapshot_columns.py`

- [ ] **Step 1: Create the migration file**

```python
# api/alembic/versions/20260426_d1e2f3a4b5c6_historique_snapshot_columns.py
"""historique_snapshot_columns

Revision ID: d1e2f3a4b5c6
Revises: c3f1a2b8e994
Create Date: 2026-04-26 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c3f1a2b8e994'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('breeding_log', sa.Column('parent_f_species_name', sa.String(), nullable=True))
    op.add_column('breeding_log', sa.Column('parent_m_species_name', sa.String(), nullable=True))
    op.add_column('breeding_log', sa.Column('child_sex', sa.String(), nullable=True))
    op.add_column('clone_log', sa.Column('cycle_number', sa.Integer(), nullable=True))
    op.add_column('clone_log', sa.Column('species_name', sa.String(), nullable=True))
    op.add_column('clone_log', sa.Column('sex', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('clone_log', 'sex')
    op.drop_column('clone_log', 'species_name')
    op.drop_column('clone_log', 'cycle_number')
    op.drop_column('breeding_log', 'child_sex')
    op.drop_column('breeding_log', 'parent_m_species_name')
    op.drop_column('breeding_log', 'parent_f_species_name')
```

- [ ] **Step 2: Apply the migration inside the running container**

```bash
docker compose exec api alembic upgrade head
```

Expected output: `Running upgrade c3f1a2b8e994 -> d1e2f3a4b5c6, historique_snapshot_columns`

- [ ] **Step 3: Verify columns exist**

```bash
docker compose exec db psql -U muldo -d muldo -c "\d breeding_log"
docker compose exec db psql -U muldo -d muldo -c "\d clone_log"
```

Expected: `parent_f_species_name`, `parent_m_species_name`, `child_sex` in `breeding_log`; `cycle_number`, `species_name`, `sex` in `clone_log`.

- [ ] **Step 4: Commit**

```bash
git add api/alembic/versions/20260426_d1e2f3a4b5c6_historique_snapshot_columns.py
git commit -m "feat: add snapshot columns to breeding_log and clone_log for history"
```

---

## Task 2: Update models + breeding service to populate snapshots

**Files:**
- Modify: `api/app/models/models.py`
- Modify: `api/app/services/breeding.py`

- [ ] **Step 1: Add snapshot columns to SQLAlchemy models**

In `api/app/models/models.py`, add to `BreedingLog` (after `cycle_number`):

```python
parent_f_species_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
parent_m_species_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
child_sex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
```

Add to `CloneLog` (after `created_at`):

```python
cycle_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
species_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
sex: Mapped[Optional[str]] = mapped_column(String, nullable=True)
```

- [ ] **Step 2: Update `_run_auto_clone` to accept and store cycle_number**

In `api/app/services/breeding.py`, change the signature of `_run_auto_clone`:

```python
async def _run_auto_clone(db: AsyncSession, cycle_number: int) -> list[dict]:
```

Inside the loop, after `species = species_result.scalar_one()`, update the `CloneLog` creation to include snapshots:

```python
log = CloneLog(
    donor_1_id=victims[0].id,
    donor_2_id=victims[1].id,
    result_id=clone.id,
    cycle_number=cycle_number,
    species_name=species.name,
    sex=sex.value,
)
```

- [ ] **Step 3: Update `breed()` to populate breeding_log snapshots and pass cycle_number to clone**

In `api/app/services/breeding.py`, in the `breed()` function:

After `child_species = await _load_species_by_name(db, child_species_name)` and before creating the child, resolve parent species names. The parents are already loaded as `parent_f` and `parent_m` (`MuldoIndividual`). Load their species:

```python
parent_f_species_result = await db.execute(
    select(MuldoSpecies).where(MuldoSpecies.id == parent_f.species_id)
)
parent_f_species_name = parent_f_species_result.scalar_one().name

parent_m_species_result = await db.execute(
    select(MuldoSpecies).where(MuldoSpecies.id == parent_m.species_id)
)
parent_m_species_name = parent_m_species_result.scalar_one().name
```

Then update the `BreedingLog` creation:

```python
log = BreedingLog(
    parent_f_id=parent_f_id,
    parent_m_id=parent_m_id,
    child_id=child.id,
    target_species_id=child_species.id,
    success=success,
    cycle_number=cycle_number,
    parent_f_species_name=parent_f_species_name,
    parent_m_species_name=parent_m_species_name,
    child_sex=child.sex.value,
)
```

Update the `_run_auto_clone` call:

```python
clones = await _run_auto_clone(db, cycle_number)
```

- [ ] **Step 4: Verify the API still starts**

```bash
docker compose restart api
docker compose logs api --tail=20
```

Expected: no import or startup errors.

- [ ] **Step 5: Commit**

```bash
git add api/app/models/models.py api/app/services/breeding.py
git commit -m "feat: snapshot species names and sex onto breeding_log and clone_log at write time"
```

---

## Task 3: History schemas, service, router, and main registration

**Files:**
- Modify: `api/app/schemas/schemas.py`
- Create: `api/app/services/history.py`
- Create: `api/app/routers/history.py`
- Modify: `api/app/main.py`

- [ ] **Step 1: Add Pydantic schemas**

Append to `api/app/schemas/schemas.py`:

```python
class PairHistory(BaseModel):
    parent_f_species: str
    parent_m_species: str
    child_species: str
    child_sex: str
    success: bool


class CloneHistory(BaseModel):
    species_name: str
    sex: str


class CycleSummary(BaseModel):
    total: int
    successes: int
    fails: int
    clones: int


class CycleHistory(BaseModel):
    cycle_number: int
    date: datetime
    pairs: list[PairHistory]
    clones: list[CloneHistory]
    summary: CycleSummary
```

- [ ] **Step 2: Create the history service**

Create `api/app/services/history.py`:

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import BreedingLog, CloneLog, MuldoSpecies
from app.schemas.schemas import CycleHistory, PairHistory, CloneHistory, CycleSummary


async def get_history(db: AsyncSession) -> list[CycleHistory]:
    # Fetch all breeding_log rows, ordered by cycle then id
    stmt = (
        select(BreedingLog, MuldoSpecies.name.label("child_species_name"))
        .join(MuldoSpecies, BreedingLog.target_species_id == MuldoSpecies.id)
        .order_by(BreedingLog.cycle_number.desc(), BreedingLog.id.asc())
    )
    rows = (await db.execute(stmt)).all()

    # Fetch all clone_log rows with a cycle_number (post-migration only)
    clone_stmt = (
        select(CloneLog)
        .where(CloneLog.cycle_number.is_not(None))
        .order_by(CloneLog.cycle_number.desc(), CloneLog.id.asc())
    )
    clone_rows = list((await db.execute(clone_stmt)).scalars())

    # Group clones by cycle_number
    clones_by_cycle: dict[int, list[CloneHistory]] = {}
    for c in clone_rows:
        clones_by_cycle.setdefault(c.cycle_number, []).append(
            CloneHistory(
                species_name=c.species_name or "Inconnu",
                sex=c.sex or "Inconnu",
            )
        )

    # Group breeding rows by cycle_number; date = MIN(created_at) per cycle
    cycles_map: dict[int, dict] = {}
    for log, child_species_name in rows:
        cn = log.cycle_number
        if cn not in cycles_map:
            cycles_map[cn] = {"date": log.created_at, "pairs": []}
        elif log.created_at < cycles_map[cn]["date"]:
            cycles_map[cn]["date"] = log.created_at
        cycles_map[cn]["pairs"].append(
            PairHistory(
                parent_f_species=log.parent_f_species_name or "Inconnu",
                parent_m_species=log.parent_m_species_name or "Inconnu",
                child_species=child_species_name or "Inconnu",
                child_sex=log.child_sex or "Inconnu",
                success=log.success,
            )
        )

    # Build ordered result (descending cycle_number)
    result: list[CycleHistory] = []
    for cn in sorted(cycles_map.keys(), reverse=True):
        data = cycles_map[cn]
        pairs = data["pairs"]
        clones = clones_by_cycle.get(cn, [])
        successes = sum(1 for p in pairs if p.success)
        result.append(
            CycleHistory(
                cycle_number=cn,
                date=data["date"],
                pairs=pairs,
                clones=clones,
                summary=CycleSummary(
                    total=len(pairs),
                    successes=successes,
                    fails=len(pairs) - successes,
                    clones=len(clones),
                ),
            )
        )
    return result
```

- [ ] **Step 3: Create the history router**

Create `api/app/routers/history.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import CycleHistory
from app.services import history as history_svc

router = APIRouter(prefix="/api")


@router.get("/history", response_model=list[CycleHistory])
async def get_history(db: AsyncSession = Depends(get_db)):
    return await history_svc.get_history(db)
```

- [ ] **Step 4: Register the router in main.py**

In `api/app/main.py`, add:

```python
from app.routers.history import router as history_router
```

And below the other `app.include_router(...)` calls:

```python
app.include_router(history_router)
```

- [ ] **Step 5: Test the endpoint**

```bash
docker compose restart api
curl -s http://localhost:8000/api/history | python3 -m json.tool | head -40
```

Expected: JSON array (may be empty `[]` if no cycles exist yet, or populated if you have already submitted batches).

- [ ] **Step 6: Commit**

```bash
git add api/app/schemas/schemas.py api/app/services/history.py api/app/routers/history.py api/app/main.py
git commit -m "feat: add GET /api/history endpoint with cycle grouping and snapshot fallbacks"
```

---

## Task 4: Frontend types, API call, and Zustand store

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/stores/history.ts`

- [ ] **Step 1: Add TypeScript types**

Append to `frontend/src/types/index.ts`:

```ts
export type PairHistory = {
  parent_f_species: string
  parent_m_species: string
  child_species: string
  child_sex: string
  success: boolean
}

export type CloneHistory = {
  species_name: string
  sex: string
}

export type CycleHistory = {
  cycle_number: number
  date: string
  pairs: PairHistory[]
  clones: CloneHistory[]
  summary: { total: number; successes: number; fails: number; clones: number }
}
```

- [ ] **Step 2: Add API call**

In `frontend/src/lib/api.ts`, add to the `apiCalls` object:

```ts
getHistory: () => api.get<CycleHistory[]>('/api/history'),
```

Also add `CycleHistory` to the import from `@/types` at the top of the file.

- [ ] **Step 3: Create the history store**

Create `frontend/src/stores/history.ts`:

```ts
import { create } from 'zustand'
import type { CycleHistory } from '@/types'
import { apiCalls } from '@/lib/api'

type HistoryStore = {
  cycles: CycleHistory[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export const useHistoryStore = create<HistoryStore>()((set) => ({
  cycles: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const cycles = await apiCalls.getHistory()
      set({ cycles, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },
}))
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/stores/history.ts
git commit -m "feat: add history types, API call, and Zustand store"
```

---

## Task 5: CycleCard component

**Files:**
- Create: `frontend/src/components/historique/CycleCard.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/historique/CycleCard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CycleHistory } from '@/types'

const PINK = '#F472B6'
const BLUE = '#60A5FA'
const MUTED = '#6B7280'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function SexSymbol({ sex }: { sex: string }) {
  if (sex === 'F') return <span style={{ color: PINK }}>♀</span>
  if (sex === 'M') return <span style={{ color: BLUE }}>♂</span>
  return <span style={{ color: MUTED }}>?</span>
}

function ResultBadge({ success }: { success: boolean }) {
  return success ? (
    <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 12, fontWeight: 600,
      background: 'rgba(74,222,128,0.15)', color: '#4ADE80',
      border: '1px solid rgba(74,222,128,0.3)' }}>Succès</span>
  ) : (
    <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 12, fontWeight: 600,
      background: 'rgba(248,113,113,0.15)', color: '#F87171',
      border: '1px solid rgba(248,113,113,0.3)' }}>Échec</span>
  )
}

export function CycleCard({ cycle, defaultOpen }: { cycle: CycleHistory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const { summary } = cycle

  return (
    <Collapsible open={open} onOpenChange={setOpen}
      style={{ background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(220,220,230,0.1)', borderRadius: 12, overflow: 'hidden' }}>

      <CollapsibleTrigger style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px', background: 'rgba(220,220,230,0.05)',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        borderBottom: open ? '1px solid rgba(220,220,230,0.08)' : 'none',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#E5E7EB' }}>
          Cycle {cycle.cycle_number}
        </span>
        <span style={{ fontSize: 13, color: MUTED }}>{formatDate(cycle.date)}</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {summary.successes > 0 && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, fontWeight: 600,
              background: 'rgba(74,222,128,0.12)', color: '#4ADE80',
              border: '1px solid rgba(74,222,128,0.25)' }}>
              ✓ {summary.successes} succès
            </span>
          )}
          {summary.fails > 0 && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, fontWeight: 600,
              background: 'rgba(248,113,113,0.12)', color: '#F87171',
              border: '1px solid rgba(248,113,113,0.25)' }}>
              ✗ {summary.fails} échec{summary.fails > 1 ? 's' : ''}
            </span>
          )}
          {summary.clones > 0 && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, fontWeight: 600,
              background: 'rgba(167,139,250,0.12)', color: '#A78BFA',
              border: '1px solid rgba(167,139,250,0.25)' }}>
              ⟳ {summary.clones} clone{summary.clones > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <ChevronRight size={14} style={{ color: MUTED,
          transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Pairs table */}
          <Table style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <TableHeader>
              <TableRow style={{ fontSize: 12, color: '#374151', letterSpacing: '0.08em' }}>
                <TableHead><span style={{ color: PINK }}>♀</span> Espèce</TableHead>
                <TableHead><span style={{ color: BLUE }}>♂</span> Espèce</TableHead>
                <TableHead>Enfant</TableHead>
                <TableHead>Sexe</TableHead>
                <TableHead>Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycle.pairs.map((pair, i) => (
                <TableRow key={i} style={{ fontSize: 14 }}>
                  <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: pair.parent_f_species === 'Inconnu' ? MUTED : '#E5E7EB' }}>
                    {pair.parent_f_species}
                  </TableCell>
                  <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: pair.parent_m_species === 'Inconnu' ? MUTED : '#E5E7EB' }}>
                    {pair.parent_m_species}
                  </TableCell>
                  <TableCell style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: pair.child_species === 'Inconnu' ? MUTED : '#D1D5DB' }}>
                    {pair.child_species}
                  </TableCell>
                  <TableCell><SexSymbol sex={pair.child_sex} /></TableCell>
                  <TableCell><ResultBadge success={pair.success} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Clones section */}
          {cycle.clones.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: MUTED, letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 8 }}>
                Clonages automatiques
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cycle.clones.map((c, i) => (
                  <span key={i} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 13,
                    background: 'rgba(167,139,250,0.1)', color: '#A78BFA',
                    border: '1px solid rgba(167,139,250,0.2)' }}>
                    {c.species_name} · {c.sex === 'F' ? '♀' : c.sex === 'M' ? '♂' : '?'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/historique/CycleCard.tsx
git commit -m "feat: add CycleCard component for history view"
```

---

## Task 6: HistoriqueView component

**Files:**
- Create: `frontend/src/components/historique/HistoriqueView.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/historique/HistoriqueView.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { History } from 'lucide-react'
import { useHistoryStore } from '@/stores/history'
import { CycleCard } from './CycleCard'

export function HistoriqueView() {
  const { cycles, loading, error, fetch } = useHistoryStore()

  useEffect(() => {
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Historique</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          Historique de vos sessions d'élevage
        </p>
      </div>

      {loading && (
        <div style={{ color: '#6B7280', textAlign: 'center', padding: 60 }}>Chargement…</div>
      )}

      {error && (
        <div style={{ padding: 14, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
          fontSize: 13, color: '#F87171' }}>
          {error}
        </div>
      )}

      {!loading && !error && cycles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#6B7280' }}>
          <History size={48} strokeWidth={1.5} />
          <div style={{ fontSize: 15 }}>Aucune session enregistrée</div>
        </div>
      )}

      {!loading && !error && cycles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cycles.map((cycle, i) => (
            <CycleCard key={cycle.cycle_number} cycle={cycle} defaultOpen={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/historique/HistoriqueView.tsx
git commit -m "feat: add HistoriqueView with loading, error, empty, and populated states"
```

---

## Task 7: Wire navigation — Sidebar and page.tsx

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Add Historique to Sidebar**

In `frontend/src/components/layout/Sidebar.tsx`:

Change the import line to add `History`:
```ts
import { BarChart2, Package, LayoutGrid, History } from 'lucide-react'
```

Change the `View` type:
```ts
type View = 'cascade' | 'inventaire' | 'enclos' | 'historique'
```

Add to `NAV_ITEMS` array (after `enclos`):
```ts
{ id: 'historique', icon: <History size={16} />, label: 'Historique' },
```

- [ ] **Step 2: Add Historique to page.tsx**

In `frontend/src/app/page.tsx`:

Add the import:
```ts
import { HistoriqueView } from '@/components/historique/HistoriqueView'
```

Change the `View` type:
```ts
type View = 'cascade' | 'inventaire' | 'enclos' | 'historique'
```

Add the render branch inside the `<main>` div (after the enclos line):
```tsx
{activeView === 'historique' && <HistoriqueView />}
```

- [ ] **Step 3: Verify in the browser**

Open `http://localhost:3000`. You should see "Historique" in the sidebar. Clicking it should show either the empty state or a list of past cycles. Submit a breeding batch from Enclos, then navigate to Historique — the new cycle should appear with pairs and any clone events.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/app/page.tsx
git commit -m "feat: add Historique tab to sidebar and page routing"
```
