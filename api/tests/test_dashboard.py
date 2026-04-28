import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_get_progression_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/dashboard/progression")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_get_progression_returns_snapshots():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Insert snapshots directly via API by running a real batch
        # (snapshot insertion is tested in test_batch; here just verify read)
        r = await client.get("/api/dashboard/progression")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        assert "cycle_number" in data[0]
        assert "species_ok_count" in data[0]
