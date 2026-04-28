from typing import Literal
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import ImportResult
from app.services import export_import as svc

router = APIRouter(prefix="/api")


@router.get("/export")
async def export_data(db: AsyncSession = Depends(get_db)):
    return await svc.export_all(db)


@router.post("/import", response_model=ImportResult)
async def import_data(
    data: dict,
    mode: Literal["replace", "merge"] = "replace",
    db: AsyncSession = Depends(get_db),
):
    if mode == "replace":
        counts = await svc.import_replace(db, data)
    else:
        counts = await svc.import_merge(db, data)
    return ImportResult(inserted=counts)
