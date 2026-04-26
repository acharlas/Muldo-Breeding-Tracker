import math
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe, MuldoIndividual, SexEnum
from app.services.cascade import get_cascade

SUCCESS_CHANCE = 0.303  # base success rate


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

    # Load cascade to get remaining counts
    cascade_items = await get_cascade(db)
    remaining_by_name = {item["species_name"]: item["remaining"] for item in cascade_items}

    # Load species map
    all_species = {s.id: s for s in (await db.execute(select(MuldoSpecies))).scalars()}

    # Build candidate pairs.
    # Fix 1: skip species that have met their target (remaining <= 0).
    # Fix 2: try both sex assignments per recipe (original and reversed).
    seen: set[tuple[int, int, int]] = set()  # (child_id, f_species_id, m_species_id)
    candidates = []

    for recipe, child_species in recipe_rows:
        remaining = remaining_by_name.get(child_species.name, 0)
        if remaining <= 0:
            continue  # Fix 1: target already met

        directions = [(recipe.parent_f_species_id, recipe.parent_m_species_id)]
        if recipe.parent_f_species_id != recipe.parent_m_species_id:
            directions.append((recipe.parent_m_species_id, recipe.parent_f_species_id))  # Fix 2

        for f_sid, m_sid in directions:
            key = (child_species.id, f_sid, m_sid)
            if key in seen:
                continue
            seen.add(key)

            pf_available = list(available_f.get(f_sid, []))
            pm_available = list(available_m.get(m_sid, []))
            if not pf_available or not pm_available:
                continue

            candidates.append({
                "child_species": child_species,
                "f_sid": f_sid,
                "m_sid": m_sid,
                "pf": pf_available,
                "pm": pm_available,
                "remaining": remaining,
            })

    # Sort: child generation ASC, then remaining DESC
    candidates.sort(key=lambda c: (c["child_species"].generation, -c["remaining"]))

    # Fix 3: proportional slot allocation weighted by remaining.
    # Each candidate gets ceil(remaining / total_remaining * capacity) slots,
    # capped by available parents. Trim rounding excess from lowest-priority candidates.
    total_weight = sum(c["remaining"] for c in candidates)
    for c in candidates:
        max_pairs = min(len(c["pf"]), len(c["pm"]))
        if total_weight > 0:
            raw = (c["remaining"] / total_weight) * capacity
            c["budget"] = max(1, min(max_pairs, math.ceil(raw)))
        else:
            c["budget"] = max_pairs

    # Trim ceil over-allocation from the back (lowest priority)
    total_budgeted = sum(c["budget"] for c in candidates)
    for i in range(len(candidates) - 1, -1, -1):
        if total_budgeted <= capacity:
            break
        cut = min(total_budgeted - capacity, candidates[i]["budget"] - 1)
        candidates[i]["budget"] -= cut
        total_budgeted -= cut

    # If still over (more candidates than capacity, each at budget=1), drop lowest-priority
    while total_budgeted > capacity:
        candidates.pop()
        total_budgeted -= 1

    # Assign pairs respecting per-candidate budget (each individual used at most once)
    used_ids: set[int] = set()
    pairs: list[dict] = []

    for cand in candidates:
        count = 0
        while count < cand["budget"] and len(pairs) < capacity:
            pf = next((m for m in cand["pf"] if m.id not in used_ids), None)
            pm = next((m for m in cand["pm"] if m.id not in used_ids), None)
            if pf is None or pm is None:
                break

            used_ids.add(pf.id)
            used_ids.add(pm.id)

            pairs.append({
                "parent_f": {"id": pf.id, "species_name": all_species[pf.species_id].name, "sex": "F"},
                "parent_m": {"id": pm.id, "species_name": all_species[pm.species_id].name, "sex": "M"},
                "target_child_species": cand["child_species"].name,
                "success_chance": SUCCESS_CHANCE,
            })
            count += 1

    # Pack pairs into enclos (5 per enclos)
    enclos = []
    for i in range(0, len(pairs), 5):
        enclos.append({
            "enclos_number": len(enclos) + 1,
            "pairs": pairs[i:i + 5],
        })

    total_pairs = len(pairs)
    estimated_successes = round(total_pairs * SUCCESS_CHANCE, 2)

    # Per-species remaining estimate (fix cosmetic: was cross-species aggregate before)
    pairs_by_species: dict[str, int] = defaultdict(int)
    for p in pairs:
        pairs_by_species[p["target_child_species"]] += 1

    remaining_after = sum(
        max(0, remaining_by_name.get(name, 0) - round(count * SUCCESS_CHANCE))
        for name, count in pairs_by_species.items()
    ) + sum(
        rem for name, rem in remaining_by_name.items()
        if name not in pairs_by_species and rem > 0
    )

    return {
        "enclos": enclos,
        "summary": {
            "total_pairs": total_pairs,
            "estimated_successes": estimated_successes,
            "remaining_after": remaining_after,
        },
    }
