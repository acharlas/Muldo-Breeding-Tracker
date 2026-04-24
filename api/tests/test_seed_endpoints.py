import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_seed_returns_counts():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/seed")
    assert response.status_code == 200
    data = response.json()
    assert data["species_count"] == 120
    assert data["recipes_count"] == 162


@pytest.mark.asyncio
async def test_seed_is_idempotent():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r1 = await client.get("/api/seed")
        r2 = await client.get("/api/seed")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r2.json()["already_seeded"] is True


@pytest.mark.asyncio
async def test_species_grouped_by_generation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/species")
    assert response.status_code == 200
    data = response.json()
    assert len(data["1"]) == 5   # 5 Gen 1 species
    assert len(data["10"]) == 50  # 50 Gen 10 species
    assert sum(len(v) for v in data.values()) == 120


@pytest.mark.asyncio
async def test_recipes_includes_optimal():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/recipes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 162
    optimal = [r for r in data if r["is_optimal"]]
    assert len(optimal) == 115
