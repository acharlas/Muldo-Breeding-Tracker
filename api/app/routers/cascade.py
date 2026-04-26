from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import CascadeItem
from app.services.cascade import get_cascade

router = APIRouter(prefix="/api")


@router.get("/cascade", response_model=list[CascadeItem])
async def cascade(
    db: AsyncSession = Depends(get_db),
    base_level: int = Query(default=0, ge=0),
):
    success_rate = min(1.0, base_level * 0.30 + 0.30)
    return await get_cascade(db, success_rate)
