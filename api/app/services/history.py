from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import BreedingLog, CloneLog, MuldoSpecies
from app.schemas.schemas import CycleHistory, PairHistory, CloneHistory, CycleSummary


async def get_history(db: AsyncSession) -> list[CycleHistory]:
    stmt = (
        select(BreedingLog, MuldoSpecies.name.label("child_species_name"))
        .join(MuldoSpecies, BreedingLog.target_species_id == MuldoSpecies.id)
        .order_by(BreedingLog.cycle_number.desc(), BreedingLog.id.asc())
    )
    rows = (await db.execute(stmt)).all()

    clone_stmt = (
        select(CloneLog)
        .where(CloneLog.cycle_number.is_not(None))
        .order_by(CloneLog.cycle_number.desc(), CloneLog.id.asc())
    )
    clone_rows = list((await db.execute(clone_stmt)).scalars())

    clones_by_cycle: dict[int, list[CloneHistory]] = {}
    for c in clone_rows:
        clones_by_cycle.setdefault(c.cycle_number, []).append(
            CloneHistory(
                species_name=c.species_name or "Inconnu",
                sex=c.sex or "Inconnu",
            )
        )

    cycles_map: dict[int, dict] = {}
    for log, child_species_name in rows:
        cn = log.cycle_number
        if cn not in cycles_map:
            cycles_map[cn] = {"date": log.created_at, "pairs": []}
        elif log.created_at < cycles_map[cn]["date"]:
            cycles_map[cn]["date"] = log.created_at
        cycles_map[cn]["pairs"].append(
            PairHistory(
                parent_f_species=log.parent_f_species_name or "Inconnu",
                parent_m_species=log.parent_m_species_name or "Inconnu",
                child_species=child_species_name or "Inconnu",
                child_sex=log.child_sex or "Inconnu",
                success=log.success,
            )
        )

    result: list[CycleHistory] = []
    for cn in sorted(cycles_map.keys(), reverse=True):
        data = cycles_map[cn]
        pairs = data["pairs"]
        clones = clones_by_cycle.get(cn, [])
        successes = sum(1 for p in pairs if p.success)
        result.append(
            CycleHistory(
                cycle_number=cn,
                date=data["date"],
                pairs=pairs,
                clones=clones,
                summary=CycleSummary(
                    total=len(pairs),
                    successes=successes,
                    fails=len(pairs) - successes,
                    clones=len(clones),
                ),
            )
        )
    return result
