from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.models import MuldoIndividual, MuldoSpecies, SexEnum, OriginEnum


async def _get_species_or_404(db: AsyncSession, species_name: str) -> MuldoSpecies:
    result = await db.execute(select(MuldoSpecies).where(MuldoSpecies.name == species_name))
    species = result.scalar_one_or_none()
    if species is None:
        raise HTTPException(status_code=404, detail=f"Species '{species_name}' not found")
    return species


async def capture(db: AsyncSession, species_name: str, sex: str) -> MuldoIndividual:
    species = await _get_species_or_404(db, species_name)
    muldo = MuldoIndividual(
        species_id=species.id,
        sex=SexEnum(sex),
        is_fertile=True,
        origin=OriginEnum.captured,
    )
    db.add(muldo)
    await db.flush()
    await db.refresh(muldo)
    await db.commit()
    return muldo


async def bulk_capture(db: AsyncSession, species_name: str, sex: str, count: int) -> list[MuldoIndividual]:
    species = await _get_species_or_404(db, species_name)
    muldos = [
        MuldoIndividual(
            species_id=species.id,
            sex=SexEnum(sex),
            is_fertile=True,
            origin=OriginEnum.captured,
        )
        for _ in range(count)
    ]
    db.add_all(muldos)
    await db.flush()
    for m in muldos:
        await db.refresh(m)
    await db.commit()
    return muldos


async def delete_muldo(db: AsyncSession, muldo_id: int) -> None:
    result = await db.execute(select(MuldoIndividual).where(MuldoIndividual.id == muldo_id))
    muldo = result.scalar_one_or_none()
    if muldo is None:
        raise HTTPException(status_code=404, detail=f"Muldo {muldo_id} not found")
    await db.delete(muldo)
    await db.commit()


async def get_inventory(db: AsyncSession) -> dict[str, dict]:
    rows = (
        await db.execute(
            select(MuldoIndividual, MuldoSpecies)
            .join(MuldoSpecies, MuldoIndividual.species_id == MuldoSpecies.id)
            .order_by(MuldoSpecies.name)
        )
    ).all()

    result: dict[str, dict] = {}
    for muldo, species in rows:
        entry = result.setdefault(species.name, {"fertile_f": 0, "fertile_m": 0, "sterile_f": 0, "sterile_m": 0})
        if muldo.is_fertile:
            if muldo.sex == SexEnum.F:
                entry["fertile_f"] += 1
            else:
                entry["fertile_m"] += 1
        else:
            if muldo.sex == SexEnum.F:
                entry["sterile_f"] += 1
            else:
                entry["sterile_m"] += 1
    return result


async def get_stats(db: AsyncSession) -> dict:
    rows = (
        await db.execute(
            select(MuldoIndividual, MuldoSpecies)
            .join(MuldoSpecies, MuldoIndividual.species_id == MuldoSpecies.id)
        )
    ).all()

    total_fertile = 0
    total_sterile = 0
    par_gen: dict[str, dict] = {}

    for muldo, species in rows:
        gen_key = str(species.generation)
        gen_entry = par_gen.setdefault(gen_key, {"fertile": 0, "sterile": 0})
        if muldo.is_fertile:
            total_fertile += 1
            gen_entry["fertile"] += 1
        else:
            total_sterile += 1
            gen_entry["sterile"] += 1

    return {"total_fertile": total_fertile, "total_sterile": total_sterile, "par_gen": par_gen}
