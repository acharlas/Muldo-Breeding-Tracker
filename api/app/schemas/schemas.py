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
    is_fertile: bool = True


class BulkCaptureRequest(BaseModel):
    species_name: str
    sex: Literal["F", "M"]
    count: int = Field(ge=1, le=500)
    is_fertile: bool = True


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
    base_level: int = Field(default=0, ge=0)


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


class BatchBreedError(BaseModel):
    index: int
    detail: str


class BatchBreedResult(BaseModel):
    cycle_number: int
    total_breeds: int
    successes: int
    fails: int
    clones_auto: int
    errors: list[BatchBreedError]
    updated_cascade: list[CascadeItem]


class PairHistory(BaseModel):
    parent_f_species: str
    parent_m_species: str
    child_species: str
    child_sex: str
    success: bool


class CloneHistory(BaseModel):
    species_name: str
    sex: str


class CycleSummary(BaseModel):
    total: int
    successes: int
    fails: int
    clones: int


class CycleHistory(BaseModel):
    cycle_number: int
    date: datetime
    pairs: list[PairHistory]
    clones: list[CloneHistory]
    summary: CycleSummary
