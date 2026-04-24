from pydantic import BaseModel


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
