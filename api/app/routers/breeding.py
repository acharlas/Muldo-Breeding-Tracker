from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import BreedRequest, BreedResult, MuldoOut, ClonePerformed
from app.services import breeding as breed_svc

router = APIRouter(prefix="/api")


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
