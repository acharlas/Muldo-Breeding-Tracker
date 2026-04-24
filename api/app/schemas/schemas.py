from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class SpeciesOut(BaseModel):
    id: int
    name: str
    generation: int

    model_config = {"from_attributes": True}


class RecipeOut(BaseModel):
    id: int
    child_species_name: str
    parent_f_species_name: str
    parent_m_species_name: str
    is_optimal: bool


class SeedResponse(BaseModel):
    already_seeded: bool
    species_count: int
    recipes_count: int


class MuldoOut(BaseModel):
    id: int
    species_name: str
    generation: int
    sex: str
    is_fertile: bool
    origin: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InventoryEntry(BaseModel):
    fertile_f: int
    fertile_m: int
    sterile_f: int
    sterile_m: int


class InventoryStats(BaseModel):
    total_fertile: int
    total_sterile: int
    par_gen: dict[str, dict[str, int]]  # gen -> {fertile, sterile}


class CaptureRequest(BaseModel):
    species_name: str
    sex: Literal["F", "M"]


class BulkCaptureRequest(BaseModel):
    species_name: str
    sex: Literal["F", "M"]
    count: int = Field(ge=1, le=500)


class BreedRequest(BaseModel):
    parent_f_id: int
    parent_m_id: int
    success: bool
    child_species_name: str
    child_sex: Literal["F", "M"]


class ClonePerformed(BaseModel):
    species_name: str
    sex: str


class BreedResult(BaseModel):
    child: MuldoOut
    clones_performed: list[ClonePerformed]
