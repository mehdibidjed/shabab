from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.org.models import OrgUnit

STATUSES = ("active", "maintenance", "closed")
POSITIONS = (
    "director", "counselor", "head_educator", "educator", "secretariat",
    "finance_admin", "coordination_admin", "associations_admin",
    "activities_admin", "professional_worker",
)


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[int] = mapped_column(primary_key=True)
    org_unit_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), unique=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    capacity: Mapped[int] = mapped_column(Integer)
    bookable_spaces: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    commune_ar: Mapped[str] = mapped_column(String(100))
    commune_fr: Mapped[str] = mapped_column(String(100))

    org_unit: Mapped[OrgUnit] = relationship(lazy="joined")


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name_ar: Mapped[str] = mapped_column(String(150))
    full_name_fr: Mapped[str] = mapped_column(String(150))
    position: Mapped[str] = mapped_column(String(32))
    reports_to_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"))
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
