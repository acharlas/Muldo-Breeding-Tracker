from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import BreedingLog
from app.schemas.schemas import (
    BreedRequest, BreedResult, MuldoOut, ClonePerformed,
    BatchBreedRequest, BatchBreedResult, BatchBreedError, CascadeItem,
)
from app.services import breeding as breed_svc
from app.services.cascade import get_cascade

router = APIRouter(prefix="/api")


# /breed/batch must be registered before /breed (FastAPI first-match routing)
@router.post("/breed/batch", response_model=BatchBreedResult)
async def breed_batch(body: BatchBreedRequest, db: AsyncSession = Depends(get_db)):
    if body.results:
        current_max = await db.scalar(select(func.max(BreedingLog.cycle_number)))
        cycle_number = (current_max or 0) + 1
    else:
        cycle_number = 0

    total_breeds = len(body.results)
    successes = 0
    fails = 0
    clones_auto = 0
    errors: list[BatchBreedError] = []

    for i, breed_req in enumerate(body.results):
        try:
            result = await breed_svc.breed(
                db,
                parent_f_id=breed_req.parent_f_id,
                parent_m_id=breed_req.parent_m_id,
                success=breed_req.success,
                child_species_name=breed_req.child_species_name,
                child_sex=breed_req.child_sex,
                cycle_number=cycle_number,
            )
            if breed_req.success:
                successes += 1
            else:
                fails += 1
            clones_auto += len(result["clones_performed"])
        except HTTPException as exc:
            await db.rollback()
            errors.append(BatchBreedError(index=i, detail=exc.detail))

    cascade = await get_cascade(db)

    return BatchBreedResult(
        cycle_number=cycle_number,
        total_breeds=total_breeds,
        successes=successes,
        fails=fails,
        clones_auto=clones_auto,
        errors=errors,
        updated_cascade=[CascadeItem(**item) for item in cascade],
    )


@router.post("/breed", response_model=BreedResult)
async def breed(body: BreedRequest, db: AsyncSession = Depends(get_db)):
    result = await breed_svc.breed(
        db,
        parent_f_id=body.parent_f_id,
        parent_m_id=body.parent_m_id,
        success=body.success,
        child_species_name=body.child_species_name,
        child_sex=body.child_sex,
    )
    child = result["child"]
    child_species = result["child_species"]
    return BreedResult(
        child=MuldoOut(
            id=child.id,
            species_name=child_species.name,
            generation=child_species.generation,
            sex=child.sex.value,
            is_fertile=child.is_fertile,
            origin=child.origin.value,
            created_at=child.created_at,
        ),
        clones_performed=[ClonePerformed(**c) for c in result["clones_performed"]],
    )
