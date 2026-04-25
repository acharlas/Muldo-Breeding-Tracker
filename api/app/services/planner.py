from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe, MuldoIndividual, SexEnum
from app.services.cascade import get_cascade

SUCCESS_CHANCE = 0.55  # (50+50)*0.15 + 30 + 10 = 55%, level 50 + optimal bonus


async def compute_plan(db: AsyncSession, enclos_count: int) -> dict:
    capacity = enclos_count * 5

    # Load optimal recipes with child species info
    recipe_rows = (
        await db.execute(
            select(BreedingRecipe, MuldoSpecies)
            .join(MuldoSpecies, BreedingRecipe.child_species_id == MuldoSpecies.id)
            .where(BreedingRecipe.is_optimal == True)  # noqa: E712
        )
    ).all()

    # Load all fertile individuals grouped by (species_id, sex)
    fertile_rows = list(
        (
            await db.execute(
                select(MuldoIndividual)
                .where(MuldoIndividual.is_fertile == True)  # noqa: E712
                .order_by(MuldoIndividual.created_at)
            )
        ).scalars()
    )

    available_f: dict[int, list[MuldoIndividual]] = defaultdict(list)
    available_m: dict[int, list[MuldoIndividual]] = defaultdict(list)
    for m in fertile_rows:
        if m.sex == SexEnum.F:
            available_f[m.species_id].append(m)
        else:
            available_m[m.species_id].append(m)

    # Load cascade to get remaining counts (for priority ordering)
    cascade_items = await get_cascade(db)
    remaining_by_name = {item["species_name"]: item["remaining"] for item in cascade_items}

    # Load species map
    all_species = {s.id: s for s in (await db.execute(select(MuldoSpecies))).scalars()}

    # Build candidate pairs: for each optimal recipe, check if both parents available
    candidates = []
    for recipe, child_species in recipe_rows:
        pf_available = available_f.get(recipe.parent_f_species_id, [])
        pm_available = available_m.get(recipe.parent_m_species_id, [])
        if not pf_available or not pm_available:
            continue
        candidates.append({
            "recipe": recipe,
            "child_species": child_species,
            "pf": pf_available,
            "pm": pm_available,
        })

    # Sort: child generation ASC, then remaining DESC
    candidates.sort(key=lambda c: (
        c["child_species"].generation,
        -remaining_by_name.get(c["child_species"].name, 0),
    ))

    # Assign pairs up to capacity (each individual can only be used once)
    used_ids: set[int] = set()
    pairs: list[dict] = []

    for cand in candidates:
        if len(pairs) >= capacity:
            break
        child_species = cand["child_species"]

        while len(pairs) < capacity:
            pf = next((m for m in cand["pf"] if m.id not in used_ids), None)
            pm = next((m for m in cand["pm"] if m.id not in used_ids), None)
            if pf is None or pm is None:
                break  # no more available pairs for this recipe

            used_ids.add(pf.id)
            used_ids.add(pm.id)
            pf_species = all_species[pf.species_id]
            pm_species = all_species[pm.species_id]

            pairs.append({
                "parent_f": {"id": pf.id, "species_name": pf_species.name, "sex": "F"},
                "parent_m": {"id": pm.id, "species_name": pm_species.name, "sex": "M"},
                "target_child_species": child_species.name,
                "success_chance": SUCCESS_CHANCE,
            })

    # Pack pairs into enclos (5 per enclos)
    enclos = []
    for i in range(0, len(pairs), 5):
        enclos.append({
            "enclos_number": len(enclos) + 1,
            "pairs": pairs[i:i + 5],
        })

    total_pairs = len(pairs)
    estimated_successes = round(total_pairs * SUCCESS_CHANCE, 2)
    total_remaining = sum(remaining_by_name.values())
    # rough heuristic: cross-species aggregate, not per-species
    remaining_after = max(0, total_remaining - round(estimated_successes))

    return {
        "enclos": enclos,
        "summary": {
            "total_pairs": total_pairs,
            "estimated_successes": estimated_successes,
            "remaining_after": remaining_after,
        },
    }
