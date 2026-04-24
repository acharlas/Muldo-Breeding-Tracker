from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import MuldoSpecies, BreedingRecipe
from app.schemas.schemas import SeedResponse, SpeciesOut, RecipeOut
from app.seed import seed_db

router = APIRouter(prefix="/api")


@router.get("/seed", response_model=SeedResponse)
async def run_seed(db: AsyncSession = Depends(get_db)):
    result = await seed_db(db)
    return SeedResponse(**result)


@router.get("/species", response_model=dict[str, list[SpeciesOut]])
async def get_species(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(MuldoSpecies).order_by(MuldoSpecies.generation, MuldoSpecies.name))).scalars().all()
    grouped: dict[str, list[SpeciesOut]] = defaultdict(list)
    for s in rows:
        grouped[str(s.generation)].append(SpeciesOut.model_validate(s))
    return dict(grouped)


@router.get("/recipes", response_model=list[RecipeOut])
async def get_recipes(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(BreedingRecipe).options(
                selectinload(BreedingRecipe.child_species),
                selectinload(BreedingRecipe.parent_f_species),
                selectinload(BreedingRecipe.parent_m_species),
            )
        )
    ).scalars().all()
    return [
        RecipeOut(
            id=r.id,
            child_species_name=r.child_species.name,
            parent_f_species_name=r.parent_f_species.name,
            parent_m_species_name=r.parent_m_species.name,
            is_optimal=r.is_optimal,
        )
        for r in rows
    ]
