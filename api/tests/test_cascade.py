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
    """Status is 'a_faire' when remaining > 0 but none owned."""
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
