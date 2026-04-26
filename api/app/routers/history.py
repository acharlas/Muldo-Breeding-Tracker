from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import CycleHistory
from app.services import history as history_svc

router = APIRouter(prefix="/api")


@router.get("/history", response_model=list[CycleHistory])
async def get_history(db: AsyncSession = Depends(get_db)):
    return await history_svc.get_history(db)
