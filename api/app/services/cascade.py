from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe, MuldoIndividual


def compute_cascade(
    all_species: list,
    owned_fertile: dict[int, int],
    fertile_f: dict[int, int],
    fertile_m: dict[int, int],
    max_gen: int,
) -> list[dict]:
    """
    Correct cascade model: parents are reusable across sessions.

    Gen < max_gen: target = 1 pair (1 fertile F + 1 fertile M).
    Gen == max_gen: target = 1 (produce at least 1 of each end-product species).

    Success rate affects how many breeding sessions a pair needs,
    not how many individuals to acquire.
    """
    result = []
    for species in sorted(all_species, key=lambda s: (s.generation, s.name)):
        gen = species.generation
        owned = owned_fertile.get(species.id, 0)
        fF = fertile_f.get(species.id, 0)
        fM = fertile_m.get(species.id, 0)

        if gen == max_gen:
            t = 1
            rem = max(0, 1 - owned)
        else:
            t = 1  # 1 complete pair
            rem = max(0, 1 - min(fF, fM))

        if rem == 0:
            status = "ok"
        elif owned > 0:
            status = "en_cours"
        else:
            status = "a_faire"

        result.append({
            "species_name": species.name,
            "generation": gen,
            "production_target": t,
            "fertile_f": fF,
            "fertile_m": fM,
            "total_owned": owned,
            "remaining": rem,
            "status": status,
            "expected_f": 1,
            "expected_m": 0 if gen == max_gen else 1,
        })
    return result


async def get_cascade(db: AsyncSession, success_rate: float = 0.30) -> list[dict]:
    """
    success_rate is kept for API / planner compatibility.
    It no longer determines individual targets since parents are reusable;
    it affects how many sessions a pair needs (handled by the planner).
    """
    all_species = list((await db.execute(select(MuldoSpecies))).scalars())

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
    return compute_cascade(all_species, dict(owned_fertile), dict(fertile_f), dict(fertile_m), max_gen)
