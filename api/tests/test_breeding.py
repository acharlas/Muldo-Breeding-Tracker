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
        # "Ebène et Indigo" is not achievable from Doré × Pourpre
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
