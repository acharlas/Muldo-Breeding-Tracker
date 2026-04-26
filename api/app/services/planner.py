import math
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoSpecies, BreedingRecipe, MuldoIndividual, SexEnum
from app.services.cascade import get_cascade


def compute_success_rate(base_level: int) -> float:
    """(level1 + level2) * 0.15% + 30%, both parents same level → level * 0.003 + 0.30."""
    return min(1.0, base_level * 0.003 + 0.30)


async def compute_plan(db: AsyncSession, enclos_count: int, base_level: int = 0) -> dict:
    capacity = enclos_count * 5
    success_rate = compute_success_rate(base_level)

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

    # Load cascade with the same success_rate so remaining counts are consistent
    cascade_items = await get_cascade(db, success_rate)
    remaining_by_name = {item["species_name"]: item["remaining"] for item in cascade_items}

    # Load species map
    all_species = {s.id: s for s in (await db.execute(select(MuldoSpecies))).scalars()}

    # Build recipe lookup: child_species_id -> list of (recipe, child_species)
    recipes_by_child: dict[int, list] = defaultdict(list)
    for recipe, child_sp in recipe_rows:
        recipes_by_child[child_sp.id].append((recipe, child_sp))

    # Build candidate pairs.
    # Fix 1: skip species that have met their target (remaining <= 0).
    # Fix 2: try both sex assignments per recipe (original and reversed).
    seen: set[tuple[int, int, int]] = set()  # (child_id, f_species_id, m_species_id)
    candidates = []

    for recipe, child_species in recipe_rows:
        remaining = remaining_by_name.get(child_species.name, 0)
        if remaining <= 0:
            continue

        directions = [(recipe.parent_f_species_id, recipe.parent_m_species_id)]
        if recipe.parent_f_species_id != recipe.parent_m_species_id:
            directions.append((recipe.parent_m_species_id, recipe.parent_f_species_id))

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

    # Fix 3: proportional slot allocation weighted by remaining
    total_weight = sum(c["remaining"] for c in candidates)
    for c in candidates:
        max_pairs = min(len(c["pf"]), len(c["pm"]))
        if total_weight > 0:
            raw = (c["remaining"] / total_weight) * capacity
            c["budget"] = max(1, min(max_pairs, math.ceil(raw)))
        else:
            c["budget"] = max_pairs

    # Trim ceil over-allocation from lowest-priority candidates
    total_budgeted = sum(c["budget"] for c in candidates)
    for i in range(len(candidates) - 1, -1, -1):
        if total_budgeted <= capacity:
            break
        cut = min(total_budgeted - capacity, candidates[i]["budget"] - 1)
        candidates[i]["budget"] -= cut
        total_budgeted -= cut

    while total_budgeted > capacity:
        candidates.pop()
        total_budgeted -= 1

    # Pair assignment helpers
    used_ids: set[int] = set()
    pairs: list[dict] = []

    def _take_pairs(cand: dict, limit: int) -> None:
        count = 0
        while count < limit and len(pairs) < capacity:
            pf = next((m for m in cand["pf"] if m.id not in used_ids), None)
            pm = next((m for m in cand["pm"] if m.id not in used_ids), None)
            if pf is None or pm is None:
                break
            used_ids.add(pf.id)
            used_ids.add(pm.id)
            pairs.append({
                "parent_f": {"id": pf.id, "species_name": all_species[pf.species_id].name, "sex": "F", "_sid": pf.species_id},
                "parent_m": {"id": pm.id, "species_name": all_species[pm.species_id].name, "sex": "M", "_sid": pm.species_id},
                "target_child_species": cand["child_species"].name,
                "success_chance": success_rate,
            })
            count += 1

    # Phase 1: budget-limited proportional allocation
    for cand in candidates:
        _take_pairs(cand, cand["budget"])

    # Lookahead: count how many times each species is consumed as a parent
    consumed: dict[int, int] = defaultdict(int)
    for p in pairs:
        consumed[p["parent_f"]["_sid"]] += 1
        consumed[p["parent_m"]["_sid"]] += 1

    # Phase 2: replenishment — breed replacements for consumed parents that are "done"
    replenishment: list[dict] = []
    for sid, count in consumed.items():
        sp = all_species[sid]
        if remaining_by_name.get(sp.name, 0) > 0:
            continue  # already a primary target
        if sp.generation <= 1:
            continue  # Gen 1 can only be captured, not bred
        # Find recipes that produce this species
        for recipe, child_sp in recipes_by_child.get(sid, []):
            directions = [(recipe.parent_f_species_id, recipe.parent_m_species_id)]
            if recipe.parent_f_species_id != recipe.parent_m_species_id:
                directions.append((recipe.parent_m_species_id, recipe.parent_f_species_id))
            for f_sid, m_sid in directions:
                key = (sid, f_sid, m_sid)
                if key in seen:
                    continue
                seen.add(key)
                pf_av = list(available_f.get(f_sid, []))
                pm_av = list(available_m.get(m_sid, []))
                if not pf_av or not pm_av:
                    continue
                replenishment.append({
                    "child_species": child_sp,
                    "f_sid": f_sid,
                    "m_sid": m_sid,
                    "pf": pf_av,
                    "pm": pm_av,
                    "remaining": count,
                    "budget": count,
                })

    for cand in replenishment:
        if len(pairs) >= capacity:
            break
        _take_pairs(cand, cand["budget"])

    # Phase 3: greedy fill to keep enclos full (cheaper per-enclos cost)
    if len(pairs) < capacity:
        for cand in candidates + replenishment:
            if len(pairs) >= capacity:
                break
            _take_pairs(cand, capacity)

    # Strip internal _sid before building response
    for p in pairs:
        p["parent_f"].pop("_sid", None)
        p["parent_m"].pop("_sid", None)

    # Pack pairs into enclos (5 per enclos)
    enclos = []
    for i in range(0, len(pairs), 5):
        enclos.append({
            "enclos_number": len(enclos) + 1,
            "pairs": pairs[i:i + 5],
        })

    total_pairs = len(pairs)
    estimated_successes = round(total_pairs * success_rate, 2)

    pairs_by_species: dict[str, int] = defaultdict(int)
    for p in pairs:
        pairs_by_species[p["target_child_species"]] += 1

    remaining_after = sum(
        max(0, remaining_by_name.get(name, 0) - round(count * success_rate))
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
