from datetime import datetime, timezone
from sqlalchemy import select, delete, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import MuldoIndividual, BreedingLog, CloneLog, ProgressionSnapshot


def _deserialize_row(row_dict, datetime_cols):
    """Convert ISO string datetimes to datetime objects in specified columns."""
    result = {}
    for k, v in row_dict.items():
        if k in datetime_cols and isinstance(v, str):
            result[k] = datetime.fromisoformat(v)
        else:
            result[k] = v
    return result


async def export_all(db: AsyncSession) -> dict:
    inv = list((await db.execute(select(MuldoIndividual))).scalars())
    bl = list((await db.execute(select(BreedingLog))).scalars())
    cl = list((await db.execute(select(CloneLog))).scalars())
    ps = list((await db.execute(select(ProgressionSnapshot))).scalars())

    def row_to_dict(obj):
        return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "inventory": [row_to_dict(r) for r in inv],
        "breeding_log": [row_to_dict(r) for r in bl],
        "clone_log": [row_to_dict(r) for r in cl],
        "progression_snapshot": [row_to_dict(r) for r in ps],
    }


async def import_replace(db: AsyncSession, data: dict) -> dict:
    # Clear tables respecting FK order
    await db.execute(delete(BreedingLog))
    await db.execute(delete(CloneLog))
    await db.execute(delete(ProgressionSnapshot))
    await db.execute(delete(MuldoIndividual))

    counts = {}
    for row in data.get("inventory", []):
        # Keep original id so parent_f_id/parent_m_id references stay valid
        fields = _deserialize_row(row, {"created_at"})
        db.add(MuldoIndividual(**fields))
    counts["inventory"] = len(data.get("inventory", []))

    if counts["inventory"] > 0:
        max_id = max(row["id"] for row in data["inventory"])
        await db.execute(text(f"SELECT setval('muldo_individual_id_seq', {max_id})"))

    for row in data.get("breeding_log", []):
        fields = _deserialize_row({k: v for k, v in row.items() if k != "id"}, {"created_at"})
        db.add(BreedingLog(**fields))
    counts["breeding_log"] = len(data.get("breeding_log", []))

    for row in data.get("clone_log", []):
        fields = _deserialize_row({k: v for k, v in row.items() if k != "id"}, {"created_at"})
        db.add(CloneLog(**fields))
    counts["clone_log"] = len(data.get("clone_log", []))

    for row in data.get("progression_snapshot", []):
        fields = _deserialize_row({k: v for k, v in row.items() if k != "id"}, {"created_at"})
        db.add(ProgressionSnapshot(**fields))
    counts["progression_snapshot"] = len(data.get("progression_snapshot", []))

    await db.commit()
    return counts


async def import_merge(db: AsyncSession, data: dict) -> dict:
    counts = {}
    id_map: dict[int, int] = {}

    # Pass 1: insert without parent refs
    for row in data.get("inventory", []):
        old_id = row["id"]
        fields = _deserialize_row({k: v for k, v in row.items() if k not in ("id", "parent_f_id", "parent_m_id")}, {"created_at"})
        obj = MuldoIndividual(**fields)
        db.add(obj)
        await db.flush()
        id_map[old_id] = obj.id
    counts["inventory"] = len(id_map)

    # Pass 2: update parent refs using id_map
    for row in data.get("inventory", []):
        old_id = row["id"]
        new_id = id_map[old_id]
        pf = id_map.get(row.get("parent_f_id")) if row.get("parent_f_id") else None
        pm = id_map.get(row.get("parent_m_id")) if row.get("parent_m_id") else None
        if pf is not None or pm is not None:
            await db.execute(
                text("UPDATE muldo_individual SET parent_f_id=:pf, parent_m_id=:pm WHERE id=:id"),
                {"pf": pf, "pm": pm, "id": new_id}
            )

    for row in data.get("breeding_log", []):
        fields = _deserialize_row({k: v for k, v in row.items() if k != "id"}, {"created_at"})
        fields["parent_f_id"] = id_map.get(fields.get("parent_f_id"), None)
        fields["parent_m_id"] = id_map.get(fields.get("parent_m_id"), None)
        fields["child_id"] = id_map.get(fields.get("child_id"), None)
        db.add(BreedingLog(**fields))
    counts["breeding_log"] = len(data.get("breeding_log", []))

    for row in data.get("clone_log", []):
        fields = _deserialize_row({k: v for k, v in row.items() if k != "id"}, {"created_at"})
        fields["result_id"] = id_map.get(fields.get("result_id"), None)
        db.add(CloneLog(**fields))
    counts["clone_log"] = len(data.get("clone_log", []))

    for row in data.get("progression_snapshot", []):
        fields = _deserialize_row({k: v for k, v in row.items() if k != "id"}, {"created_at"})
        db.add(ProgressionSnapshot(**fields))
    counts["progression_snapshot"] = len(data.get("progression_snapshot", []))

    await db.commit()
    return counts
