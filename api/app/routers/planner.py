from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import PlanRequest, PlanResult
from app.services.planner import compute_plan

router = APIRouter(prefix="/api")


@router.post("/plan", response_model=PlanResult)
async def plan(body: PlanRequest, db: AsyncSession = Depends(get_db)):
    return await compute_plan(db, body.enclos_count)
