from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import MuldoOut, InventoryEntry, InventoryStats, CaptureRequest, BulkCaptureRequest
from app.services import inventory as inv_svc
from app.models.models import MuldoSpecies
from sqlalchemy import select

router = APIRouter(prefix="/api/inventory")


def _muldo_to_out(muldo, species: MuldoSpecies) -> MuldoOut:
    return MuldoOut(
        id=muldo.id,
        species_name=species.name,
        generation=species.generation,
        sex=muldo.sex.value,
        is_fertile=muldo.is_fertile,
        origin=muldo.origin.value,
        created_at=muldo.created_at,
    )


@router.get("", response_model=dict[str, InventoryEntry])
async def get_inventory(db: AsyncSession = Depends(get_db)):
    return await inv_svc.get_inventory(db)


@router.post("/capture", response_model=MuldoOut)
async def capture(body: CaptureRequest, db: AsyncSession = Depends(get_db)):
    muldo = await inv_svc.capture(db, body.species_name, body.sex, body.is_fertile)
    species = (await db.execute(select(MuldoSpecies).where(MuldoSpecies.id == muldo.species_id))).scalar_one()
    return _muldo_to_out(muldo, species)


@router.post("/bulk-capture", response_model=list[MuldoOut])
async def bulk_capture(body: BulkCaptureRequest, db: AsyncSession = Depends(get_db)):
    muldos = await inv_svc.bulk_capture(db, body.species_name, body.sex, body.count, body.is_fertile)
    species = (await db.execute(select(MuldoSpecies).where(MuldoSpecies.name == body.species_name))).scalar_one()
    return [_muldo_to_out(m, species) for m in muldos]


@router.get("/stats", response_model=InventoryStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    return await inv_svc.get_stats(db)


@router.delete("/by-species", status_code=200)
async def remove_by_species(
    species_name: str = Query(...),
    sex: str = Query(...),
    count: int = Query(1, ge=1),
    is_fertile: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    removed = await inv_svc.remove_by_species(db, species_name, sex, count, is_fertile)
    return {"removed": removed}


@router.delete("/{muldo_id}", status_code=204)
async def delete_muldo(muldo_id: int, db: AsyncSession = Depends(get_db)):
    await inv_svc.delete_muldo(db, muldo_id)
    return Response(status_code=204)
