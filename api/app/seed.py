import json
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe

_DATA = Path(__file__).parent / "data"


async def seed_db(db: AsyncSession) -> dict:
    count = await db.scalar(select(func.count()).select_from(MuldoSpecies))
    if count and count > 0:
        recipe_count = await db.scalar(select(func.count()).select_from(BreedingRecipe))
        return {"already_seeded": True, "species_count": count, "recipes_count": recipe_count}

    tree: list[dict] = json.loads((_DATA / "muldo_tree.json").read_text())
    opti: dict[str, list[str]] = json.loads((_DATA / "opti_recipe.json").read_text())

    # Insert species
    species_objects = [MuldoSpecies(name=s["nom"], generation=s["gen"]) for s in tree]
    db.add_all(species_objects)
    await db.flush()  # populate IDs without committing

    # Build name → id index
    name_to_id: dict[str, int] = {s.name: s.id for s in species_objects}

    # Insert all recipes
    recipes: list[BreedingRecipe] = []
    for species_data in tree:
        child_id = name_to_id[species_data["nom"]]
        for parent_f_name, parent_m_name in species_data["croisements"]:
            recipes.append(BreedingRecipe(
                child_species_id=child_id,
                parent_f_species_id=name_to_id[parent_f_name],
                parent_m_species_id=name_to_id[parent_m_name],
                is_optimal=False,
            ))
    db.add_all(recipes)
    await db.flush()

    # Build lookup from already-flushed recipes (avoids N+1 queries)
    recipe_lookup: dict[tuple[int, int, int], BreedingRecipe] = {
        (r.child_species_id, r.parent_f_species_id, r.parent_m_species_id): r
        for r in recipes
    }

    for child_name, (parent_f_name, parent_m_name) in opti.items():
        try:
            key = (name_to_id[child_name], name_to_id[parent_f_name], name_to_id[parent_m_name])
        except KeyError as exc:
            raise RuntimeError(
                f"opti_recipe.json references unknown species {exc} for child {child_name!r}"
            ) from exc
        recipe = recipe_lookup.get(key)
        if recipe is None:
            raise RuntimeError(
                f"Optimal recipe not found: {child_name!r} from {parent_f_name!r} × {parent_m_name!r}. "
                "opti_recipe.json ordering may not match croisements convention (index 0 = female, index 1 = male)."
            )
        recipe.is_optimal = True

    await db.commit()

    return {"already_seeded": False, "species_count": len(species_objects), "recipes_count": len(recipes)}
