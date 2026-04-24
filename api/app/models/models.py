import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SexEnum(str, enum.Enum):
    F = "F"
    M = "M"


class OriginEnum(str, enum.Enum):
    captured = "captured"
    bred_success = "bred_success"
    bred_fail = "bred_fail"
    cloned = "cloned"


class MuldoSpecies(Base):
    __tablename__ = "muldo_species"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    generation: Mapped[int] = mapped_column(Integer, nullable=False)

    recipes_as_child: Mapped[list["BreedingRecipe"]] = relationship(
        "BreedingRecipe", foreign_keys="[BreedingRecipe.child_species_id]", back_populates="child_species"
    )
    recipes_as_parent_f: Mapped[list["BreedingRecipe"]] = relationship(
        "BreedingRecipe", foreign_keys="[BreedingRecipe.parent_f_species_id]", back_populates="parent_f_species"
    )
    recipes_as_parent_m: Mapped[list["BreedingRecipe"]] = relationship(
        "BreedingRecipe", foreign_keys="[BreedingRecipe.parent_m_species_id]", back_populates="parent_m_species"
    )


class BreedingRecipe(Base):
    __tablename__ = "breeding_recipe"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_species_id: Mapped[int] = mapped_column(ForeignKey("muldo_species.id"), nullable=False)
    parent_f_species_id: Mapped[int] = mapped_column(ForeignKey("muldo_species.id"), nullable=False)
    parent_m_species_id: Mapped[int] = mapped_column(ForeignKey("muldo_species.id"), nullable=False)
    is_optimal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    child_species: Mapped["MuldoSpecies"] = relationship(
        "MuldoSpecies", foreign_keys=[child_species_id], back_populates="recipes_as_child"
    )
    parent_f_species: Mapped["MuldoSpecies"] = relationship(
        "MuldoSpecies", foreign_keys=[parent_f_species_id], back_populates="recipes_as_parent_f"
    )
    parent_m_species: Mapped["MuldoSpecies"] = relationship(
        "MuldoSpecies", foreign_keys=[parent_m_species_id], back_populates="recipes_as_parent_m"
    )


class MuldoIndividual(Base):
    __tablename__ = "muldo_individual"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    species_id: Mapped[int] = mapped_column(ForeignKey("muldo_species.id"), nullable=False)
    sex: Mapped[SexEnum] = mapped_column(Enum(SexEnum), nullable=False)
    is_fertile: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    origin: Mapped[OriginEnum] = mapped_column(Enum(OriginEnum), nullable=False)
    parent_f_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("muldo_individual.id", use_alter=True, name="fk_muldo_individual_parent_f"),
        nullable=True,
    )
    parent_m_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("muldo_individual.id", use_alter=True, name="fk_muldo_individual_parent_m"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    species: Mapped["MuldoSpecies"] = relationship("MuldoSpecies", foreign_keys=[species_id])


class BreedingLog(Base):
    __tablename__ = "breeding_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_f_id: Mapped[Optional[int]] = mapped_column(ForeignKey("muldo_individual.id", ondelete="SET NULL"), nullable=True)
    parent_m_id: Mapped[Optional[int]] = mapped_column(ForeignKey("muldo_individual.id", ondelete="SET NULL"), nullable=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("muldo_individual.id"), nullable=False)
    target_species_id: Mapped[int] = mapped_column(ForeignKey("muldo_species.id"), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    parent_f: Mapped[Optional["MuldoIndividual"]] = relationship("MuldoIndividual", foreign_keys=[parent_f_id], passive_deletes=True)
    parent_m: Mapped[Optional["MuldoIndividual"]] = relationship("MuldoIndividual", foreign_keys=[parent_m_id], passive_deletes=True)
    child: Mapped["MuldoIndividual"] = relationship("MuldoIndividual", foreign_keys=[child_id])
    target_species: Mapped["MuldoSpecies"] = relationship("MuldoSpecies", foreign_keys=[target_species_id])


class CloneLog(Base):
    __tablename__ = "clone_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    donor_1_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    donor_2_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    result_id: Mapped[int] = mapped_column(ForeignKey("muldo_individual.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    result: Mapped["MuldoIndividual"] = relationship("MuldoIndividual", foreign_keys=[result_id])
