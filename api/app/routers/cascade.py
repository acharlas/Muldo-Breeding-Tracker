from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import CascadeItem
from app.services.cascade import get_cascade

router = APIRouter(prefix="/api")


@router.get("/cascade", response_model=list[CascadeItem])
async def cascade(db: AsyncSession = Depends(get_db)):
    return await get_cascade(db)
