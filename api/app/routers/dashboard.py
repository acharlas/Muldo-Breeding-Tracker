from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import ProgressionSnapshotOut
from app.services import dashboard as dashboard_svc

router = APIRouter(prefix="/api")


@router.get("/dashboard/progression", response_model=list[ProgressionSnapshotOut])
async def get_progression(db: AsyncSession = Depends(get_db)):
    return await dashboard_svc.get_progression(db)
