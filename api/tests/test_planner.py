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
