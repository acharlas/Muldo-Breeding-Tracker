import math
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe, MuldoIndividual


def compute_cascade(
    all_species: list,
    optimal_recipes: list,
    owned_fertile: dict[int, int],
    fertile_f: dict[int, int],
    fertile_m: dict[int, int],
    success_rate: float,
    max_gen: int,
) -> list[dict]:
    """
    Top-down cascade: Gen max_gen → Gen 1.

    Gen max_gen (end products): target = 1 per species.

    Gen 1 to max_gen-1 (breeding stock):
        target = ceil(total_breed_attempts / 2)

        where total_breed_attempts = sum of ceil(remaining[child] / success_rate)
        for every child species this species parents.

        Reasoning: breeding consumes both parents (they become sterile).
        Cloning recovers one fertile per two sterile of same sex, so the net
        cost is halved — every 2 breed uses → 1 parent recovered via clone.
    """
    children_of: dict[int, list[int]] = defaultdict(list)
    for recipe in optimal_recipes:
        children_of[recipe.parent_f_species_id].append(recipe.child_species_id)
        children_of[recipe.parent_m_species_id].append(recipe.child_species_id)

    by_gen: dict[int, list] = defaultdict(list)
    for s in all_species:
        by_gen[s.generation].append(s)

    target: dict[int, int] = {}
    remaining: dict[int, int] = {}

    for gen in range(max_gen, 0, -1):
        for species in by_gen.get(gen, []):
            if gen == max_gen:
                target[species.id] = 1
            else:
                total_attempts = sum(
                    math.ceil(remaining.get(child_id, 0) / success_rate)
                    for child_id in children_of[species.id]
                )
                target[species.id] = math.ceil(total_attempts / 2)

            owned = owned_fertile.get(species.id, 0)
            remaining[species.id] = max(0, target[species.id] - owned)

    result = []
    for species in sorted(all_species, key=lambda s: (s.generation, s.name)):
        gen = species.generation
        t = target.get(species.id, 0)
        rem = remaining.get(species.id, 0)
        owned = owned_fertile.get(species.id, 0)
        fF = fertile_f.get(species.id, 0)
        fM = fertile_m.get(species.id, 0)

        if rem == 0:
            status = "ok"
        elif owned > 0:
            status = "en_cours"
        else:
            status = "a_faire"

        expected_f = round(t * 0.66)
        result.append({
            "species_name": species.name,
            "generation": gen,
            "production_target": t,
            "fertile_f": fF,
            "fertile_m": fM,
            "total_owned": owned,
            "remaining": rem,
            "status": status,
            "expected_f": expected_f,
            "expected_m": t - expected_f,
        })
    return result


async def get_cascade(db: AsyncSession, success_rate: float = 0.30) -> list[dict]:
    all_species = list((await db.execute(select(MuldoSpecies))).scalars())

    optimal_recipes = list(
        (await db.execute(
            select(BreedingRecipe).where(BreedingRecipe.is_optimal == True)  # noqa: E712
        )).scalars()
    )

    fertile_rows = (
        await db.execute(
            select(MuldoIndividual.species_id, MuldoIndividual.sex)
            .where(MuldoIndividual.is_fertile == True)  # noqa: E712
        )
    ).all()

    owned_fertile: dict[int, int] = defaultdict(int)
    fertile_f: dict[int, int] = defaultdict(int)
    fertile_m: dict[int, int] = defaultdict(int)
    for species_id, sex in fertile_rows:
        owned_fertile[species_id] += 1
        if sex.value == "F":
            fertile_f[species_id] += 1
        else:
            fertile_m[species_id] += 1

    max_gen = max((s.generation for s in all_species), default=10)
    return compute_cascade(
        all_species, optimal_recipes,
        dict(owned_fertile), dict(fertile_f), dict(fertile_m),
        success_rate, max_gen,
    )
