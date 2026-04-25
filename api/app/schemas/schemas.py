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


class CascadeItem(BaseModel):
    species_name: str
    generation: int
    production_target: int
    fertile_f: int
    fertile_m: int
    total_owned: int
    remaining: int
    status: Literal["ok", "en_cours", "a_faire"]
    expected_f: int
    expected_m: int


class PlanRequest(BaseModel):
    enclos_count: int = Field(ge=1)


class PlannedParent(BaseModel):
    id: int
    species_name: str
    sex: str


class PlannedPair(BaseModel):
    parent_f: PlannedParent
    parent_m: PlannedParent
    target_child_species: str
    success_chance: float


class PlannedEnclos(BaseModel):
    enclos_number: int
    pairs: list[PlannedPair]


class PlanSummary(BaseModel):
    total_pairs: int
    estimated_successes: float
    remaining_after: int


class PlanResult(BaseModel):
    enclos: list[PlannedEnclos]
    summary: PlanSummary


class BatchBreedRequest(BaseModel):
    results: list[BreedRequest] = Field(default=[], max_length=500)


class BatchBreedResult(BaseModel):
    cycle_number: int
    total_breeds: int
    successes: int
    fails: int
    clones_auto: int
    errors: list[dict]  # list of {"index": i, "detail": "..."} for failed breeds
    updated_cascade: list[CascadeItem]
