from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import ProgressionSnapshot
from app.schemas.schemas import ProgressionSnapshotOut


async def get_progression(db: AsyncSession) -> list[ProgressionSnapshotOut]:
    stmt = select(ProgressionSnapshot).order_by(ProgressionSnapshot.cycle_number.asc())
    rows = list((await db.execute(stmt)).scalars())
    return [ProgressionSnapshotOut.model_validate(r) for r in rows]
