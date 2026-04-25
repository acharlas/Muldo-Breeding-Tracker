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
