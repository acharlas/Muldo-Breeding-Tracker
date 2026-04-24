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

    # Mark optimal recipes
    for child_name, (parent_f_name, parent_m_name) in opti.items():
        child_id = name_to_id[child_name]
        parent_f_id = name_to_id[parent_f_name]
        parent_m_id = name_to_id[parent_m_name]
        result = await db.execute(
            select(BreedingRecipe).where(
                BreedingRecipe.child_species_id == child_id,
                BreedingRecipe.parent_f_species_id == parent_f_id,
                BreedingRecipe.parent_m_species_id == parent_m_id,
            )
        )
        recipe = result.scalar_one_or_none()
        if recipe is None:
            raise RuntimeError(
                f"Optimal recipe not found: {child_name!r} from {parent_f_name!r} × {parent_m_name!r}. "
                "opti_recipe.json ordering may not match croisements convention (index 0 = female, index 1 = male)."
            )
        recipe.is_optimal = True

    await db.commit()

    species_count = await db.scalar(select(func.count()).select_from(MuldoSpecies))
    recipe_count = await db.scalar(select(func.count()).select_from(BreedingRecipe))
    return {"already_seeded": False, "species_count": species_count, "recipes_count": recipe_count}
