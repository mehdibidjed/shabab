from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

OFFICE_TYPES = ("djs", "opow", "odej")
FACILITY_TYPES = (
    "hall", "proximity_field", "stadium",                              # OPOW
    "youth_hostel", "proximity_complex", "science_center", "dar_chabab",  # ODEJ
)


class OrgUnit(Base):
    __tablename__ = "org_units"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name_ar: Mapped[str] = mapped_column(String(200))
    name_fr: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(32), index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("org_units.id"))
    # Dotted path of codes, e.g. "djs.odej.dc_constantine_01" (Postgres ltree later).
    path: Mapped[str] = mapped_column(String(255), unique=True, index=True)
