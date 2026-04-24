from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.models import (
    MuldoIndividual, MuldoSpecies, BreedingRecipe, BreedingLog, CloneLog,
    SexEnum, OriginEnum,
)


async def _get_current_cycle(db: AsyncSession) -> int:
    result = await db.scalar(select(func.max(BreedingLog.cycle_number)))
    return result or 0


async def _load_muldo_or_404(db: AsyncSession, muldo_id: int) -> MuldoIndividual:
    result = await db.execute(select(MuldoIndividual).where(MuldoIndividual.id == muldo_id))
    muldo = result.scalar_one_or_none()
    if muldo is None:
        raise HTTPException(status_code=404, detail=f"Muldo {muldo_id} not found")
    return muldo


async def _load_species_by_name(db: AsyncSession, name: str) -> MuldoSpecies:
    result = await db.execute(select(MuldoSpecies).where(MuldoSpecies.name == name))
    species = result.scalar_one_or_none()
    if species is None:
        raise HTTPException(status_code=422, detail=f"Species '{name}' not found")
    return species


async def _run_auto_clone(db: AsyncSession) -> list[dict]:
    """Find and process all cloneable pairs (same species + same sex, 2+ sterile). Returns list of clone records."""
    clones = []
    while True:
        # Find any species+sex group with 2+ sterile
        stmt = (
            select(MuldoIndividual.species_id, MuldoIndividual.sex)
            .where(MuldoIndividual.is_fertile == False)  # noqa: E712
            .group_by(MuldoIndividual.species_id, MuldoIndividual.sex)
            .having(func.count() >= 2)
            .limit(1)
        )
        row = (await db.execute(stmt)).first()
        if row is None:
            break

        species_id, sex = row

        # Pick the 2 oldest sterile of this group
        victims_result = await db.execute(
            select(MuldoIndividual)
            .where(
                MuldoIndividual.species_id == species_id,
                MuldoIndividual.sex == sex,
                MuldoIndividual.is_fertile == False,  # noqa: E712
            )
            .order_by(MuldoIndividual.created_at, MuldoIndividual.id)
            .limit(2)
        )
        victims = list(victims_result.scalars())

        # Create clone result
        clone = MuldoIndividual(
            species_id=species_id,
            sex=sex,
            is_fertile=True,
            origin=OriginEnum.cloned,
        )
        db.add(clone)
        await db.flush()

        # Log clone (donor IDs are plain integers, not FKs; they survive donor deletion)
        log = CloneLog(
            donor_1_id=victims[0].id,
            donor_2_id=victims[1].id,
            result_id=clone.id,
        )
        db.add(log)
        await db.flush()

        # Delete the 2 sterile donors; ON DELETE SET NULL propagates to
        # breeding_log parent FKs and muldo_individual self-ref FKs
        await db.delete(victims[0])
        await db.delete(victims[1])
        await db.flush()

        species_result = await db.execute(select(MuldoSpecies).where(MuldoSpecies.id == species_id))
        species = species_result.scalar_one()
        clones.append({"species_name": species.name, "sex": sex.value})

    return clones


async def breed(
    db: AsyncSession,
    parent_f_id: int,
    parent_m_id: int,
    success: bool,
    child_species_name: str,
    child_sex: str,
    cycle_number: int | None = None,
) -> dict:
    parent_f = await _load_muldo_or_404(db, parent_f_id)
    parent_m = await _load_muldo_or_404(db, parent_m_id)

    # Validate sex
    if parent_f.sex != SexEnum.F:
        raise HTTPException(status_code=400, detail="parent_f_id must be a female muldo")
    if parent_m.sex != SexEnum.M:
        raise HTTPException(status_code=400, detail="parent_m_id must be a male muldo")

    # Validate fertility
    if not parent_f.is_fertile:
        raise HTTPException(status_code=400, detail=f"Muldo {parent_f_id} is not fertile")
    if not parent_m.is_fertile:
        raise HTTPException(status_code=400, detail=f"Muldo {parent_m_id} is not fertile")

    child_species = await _load_species_by_name(db, child_species_name)

    # Validate recipe when success=True
    if success:
        recipe_check = await db.execute(
            select(BreedingRecipe).where(
                BreedingRecipe.child_species_id == child_species.id,
                or_(
                    and_(
                        BreedingRecipe.parent_f_species_id == parent_f.species_id,
                        BreedingRecipe.parent_m_species_id == parent_m.species_id,
                    ),
                    and_(
                        BreedingRecipe.parent_f_species_id == parent_m.species_id,
                        BreedingRecipe.parent_m_species_id == parent_f.species_id,
                    ),
                ),
            )
        )
        if recipe_check.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=422,
                detail=f"'{child_species_name}' is not a valid child of these parent species",
            )

    # Mark parents infertile
    parent_f.is_fertile = False
    parent_m.is_fertile = False

    # Create child
    child = MuldoIndividual(
        species_id=child_species.id,
        sex=SexEnum(child_sex),
        is_fertile=True,
        origin=OriginEnum.bred_success if success else OriginEnum.bred_fail,
        parent_f_id=parent_f_id,
        parent_m_id=parent_m_id,
    )
    db.add(child)
    await db.flush()

    # Log breed
    if cycle_number is None:
        cycle_number = await _get_current_cycle(db)
    log = BreedingLog(
        parent_f_id=parent_f_id,
        parent_m_id=parent_m_id,
        child_id=child.id,
        target_species_id=child_species.id,
        success=success,
        cycle_number=cycle_number,
    )
    db.add(log)
    await db.flush()

    # Auto-clone
    clones = await _run_auto_clone(db)

    await db.commit()
    await db.refresh(child)

    return {"child": child, "child_species": child_species, "clones_performed": clones}
