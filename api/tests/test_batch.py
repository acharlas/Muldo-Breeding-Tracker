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


@pytest.mark.asyncio
async def test_batch_partial_failure_accumulates_errors():
    """A bad breed in a batch should not stop other breeds; errors are returned in the response."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f1 = await _capture(client, "Doré", "F")
        m1 = await _capture(client, "Pourpre", "M")
        response = await client.post("/api/breed/batch", json={"results": [
            # index 0: valid breed
            {"parent_f_id": f1["id"], "parent_m_id": m1["id"],
             "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M"},
            # index 1: nonexistent IDs — should fail and be captured in errors
            {"parent_f_id": 999999, "parent_m_id": 999998,
             "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M"},
        ]})
    assert response.status_code == 200
    data = response.json()
    assert data["successes"] == 1
    assert len(data["errors"]) == 1
    assert data["errors"][0]["index"] == 1


@pytest.mark.asyncio
async def test_batch_failure_does_not_corrupt_parent_fertility():
    """A failed breed should not mark parents as infertile in subsequent reads."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f1 = await _capture(client, "Doré", "F")
        m1 = await _capture(client, "Pourpre", "M")
        # index 0: invalid recipe (Doré × Pourpre cannot produce "Orchidée") — should fail
        # index 1: valid breed with the same parents — should succeed if parents not marked infertile
        response = await client.post("/api/breed/batch", json={"results": [
            {"parent_f_id": f1["id"], "parent_m_id": m1["id"],
             "success": True, "child_species_name": "Orchidée", "child_sex": "F"},
            {"parent_f_id": f1["id"], "parent_m_id": m1["id"],
             "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M"},
        ]})
    assert response.status_code == 200
    data = response.json()
    assert len(data["errors"]) == 1  # index 0 failed
    assert data["errors"][0]["index"] == 0
    assert data["successes"] == 1    # index 1 succeeded


@pytest.mark.asyncio
async def test_batch_creates_progression_snapshot():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        f = await _capture(client, "Doré", "F")
        m = await _capture(client, "Pourpre", "M")
        await client.post("/api/breed/batch", json={"results": [
            {"parent_f_id": f["id"], "parent_m_id": m["id"],
             "success": True, "child_species_name": "Doré et Pourpre", "child_sex": "M"},
        ]})
        r = await client.get("/api/dashboard/progression")
    assert r.status_code == 200
    snapshots = r.json()
    assert len(snapshots) >= 1
    assert snapshots[-1]["species_ok_count"] >= 0


@pytest.mark.asyncio
async def test_empty_batch_no_snapshot():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        snapshot_before = (await client.get("/api/dashboard/progression")).json()
        await client.post("/api/breed/batch", json={"results": []})
        snapshot_after = (await client.get("/api/dashboard/progression")).json()
    assert len(snapshot_after) == len(snapshot_before)
