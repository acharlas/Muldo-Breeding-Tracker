import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_inventory_empty_or_valid_structure():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/inventory")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    for entry in data.values():
        assert "fertile_f" in entry
        assert "fertile_m" in entry
        assert "sterile_f" in entry
        assert "sterile_m" in entry


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
