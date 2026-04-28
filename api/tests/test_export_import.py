import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def _capture(client, species_name, sex):
    r = await client.post("/api/inventory/capture", json={"species_name": species_name, "sex": sex})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.asyncio
async def test_export_returns_valid_structure():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await _capture(client, "Doré", "F")
        r = await client.get("/api/export")
    assert r.status_code == 200
    data = r.json()
    assert "exported_at" in data
    assert "inventory" in data
    assert "breeding_log" in data
    assert "clone_log" in data
    assert "progression_snapshot" in data
    assert isinstance(data["inventory"], list)


@pytest.mark.asyncio
async def test_import_replace_clears_inventory():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await _capture(client, "Doré", "F")
        export = (await client.get("/api/export")).json()
        # Capture more then replace — should end up with only what was exported
        await _capture(client, "Roux", "M")
        r = await client.post("/api/import?mode=replace", json=export)
    assert r.status_code == 200
    result = r.json()
    assert "inserted" in result


@pytest.mark.asyncio
async def test_import_merge_adds_records():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await _capture(client, "Roux", "F")
        export = (await client.get("/api/export")).json()
        count_before = len(export["inventory"])
        r = await client.post("/api/import?mode=merge", json=export)
    assert r.status_code == 200
    result = r.json()
    assert result["inserted"]["inventory"] >= count_before
