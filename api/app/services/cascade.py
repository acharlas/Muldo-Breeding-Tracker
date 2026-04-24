import math
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe, MuldoIndividual


def compute_cascade(
    all_species: list,
    optimal_recipes: list,
    owned_fertile: dict[int, int],  # species_id -> total fertile count
) -> list[dict]:
    """Pure calculation function. Processes Gen 10 → Gen 1 top-down.

    all_species: objects with .id, .name, .generation
    optimal_recipes: objects with .child_species_id, .parent_f_species_id, .parent_m_species_id
    owned_fertile: species_id -> count of fertile individuals owned
    """
    # Build parent_id -> list of child_ids (via optimal recipes)
    children_of: dict[int, list[int]] = defaultdict(list)
    for recipe in optimal_recipes:
        children_of[recipe.parent_f_species_id].append(recipe.child_species_id)
        children_of[recipe.parent_m_species_id].append(recipe.child_species_id)

    # Group species by generation
    by_gen: dict[int, list] = defaultdict(list)
    for s in all_species:
        by_gen[s.generation].append(s)

    target: dict[int, int] = {}
    remaining: dict[int, int] = {}

    # Process top-down: Gen 10 → Gen 1
    for gen in range(10, 0, -1):
        for species in by_gen.get(gen, []):
            if gen == 10:
                target[species.id] = 1
            else:
                total = sum(
                    math.ceil(remaining.get(child_id, 0) / 2)
                    for child_id in children_of[species.id]
                )
                target[species.id] = total
            owned = owned_fertile.get(species.id, 0)
            remaining[species.id] = max(0, target[species.id] - owned)

    # Build result
    result = []
    for species in sorted(all_species, key=lambda s: (s.generation, s.name)):
        t = target.get(species.id, 0)
        rem = remaining.get(species.id, 0)
        owned = owned_fertile.get(species.id, 0)

        if rem == 0:
            status = "ok"
        elif owned > 0:
            status = "en_cours"
        else:
            status = "a_faire"

        expected_f = round(t * 0.66)
        result.append({
            "species_name": species.name,
            "generation": species.generation,
            "production_target": t,
            "fertile_f": 0,  # filled in by get_cascade with actual inventory
            "fertile_m": 0,
            "total_owned": owned,
            "remaining": rem,
            "status": status,
            "expected_f": expected_f,
            "expected_m": t - expected_f,
        })
    return result


async def get_cascade(db: AsyncSession) -> list[dict]:
    """Fetch data from DB and run compute_cascade."""
    all_species = list((await db.execute(select(MuldoSpecies))).scalars())

    optimal_recipes = list(
        (await db.execute(
            select(BreedingRecipe).where(BreedingRecipe.is_optimal == True)  # noqa: E712
        )).scalars()
    )

    # Count fertile per species (both sexes)
    fertile_rows = (
        await db.execute(
            select(MuldoIndividual.species_id, MuldoIndividual.sex)
            .where(MuldoIndividual.is_fertile == True)  # noqa: E712
        )
    ).all()

    owned_fertile: dict[int, int] = defaultdict(int)
    fertile_f_per_species: dict[int, int] = defaultdict(int)
    fertile_m_per_species: dict[int, int] = defaultdict(int)
    for species_id, sex in fertile_rows:
        owned_fertile[species_id] += 1
        if sex.value == "F":
            fertile_f_per_species[species_id] += 1
        else:
            fertile_m_per_species[species_id] += 1

    items = compute_cascade(all_species, optimal_recipes, dict(owned_fertile))

    # Fill in per-sex fertile counts
    species_by_name = {s.name: s for s in all_species}
    for item in items:
        sid = species_by_name[item["species_name"]].id
        item["fertile_f"] = fertile_f_per_species.get(sid, 0)
        item["fertile_m"] = fertile_m_per_species.get(sid, 0)

    return items
