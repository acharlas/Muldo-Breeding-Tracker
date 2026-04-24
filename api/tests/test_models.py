from app.models.models import (
    MuldoSpecies, BreedingRecipe, MuldoIndividual, BreedingLog, CloneLog,
    SexEnum, OriginEnum,
)


def test_table_names():
    assert MuldoSpecies.__tablename__ == "muldo_species"
    assert BreedingRecipe.__tablename__ == "breeding_recipe"
    assert MuldoIndividual.__tablename__ == "muldo_individual"
    assert BreedingLog.__tablename__ == "breeding_log"
    assert CloneLog.__tablename__ == "clone_log"


def test_sex_enum_values():
    assert SexEnum.F.value == "F"
    assert SexEnum.M.value == "M"


def test_origin_enum_values():
    assert set(o.value for o in OriginEnum) == {
        "captured", "bred_success", "bred_fail", "cloned"
    }


def test_muldo_species_columns():
    cols = {c.name for c in MuldoSpecies.__table__.columns}
    assert cols == {"id", "name", "generation"}


def test_breeding_recipe_columns():
    cols = {c.name for c in BreedingRecipe.__table__.columns}
    assert cols == {"id", "child_species_id", "parent_f_species_id", "parent_m_species_id", "is_optimal"}


def test_muldo_individual_columns():
    cols = {c.name for c in MuldoIndividual.__table__.columns}
    assert cols == {"id", "species_id", "sex", "is_fertile", "origin", "parent_f_id", "parent_m_id", "created_at"}


def test_breeding_log_columns():
    cols = {c.name for c in BreedingLog.__table__.columns}
    assert cols == {"id", "parent_f_id", "parent_m_id", "child_id", "target_species_id", "success", "cycle_number", "created_at"}


def test_clone_log_columns():
    cols = {c.name for c in CloneLog.__table__.columns}
    assert cols == {"id", "donor_1_id", "donor_2_id", "result_id", "created_at"}
