import datetime as dt

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

CATEGORIES = ("sport", "culture", "science", "scouting", "environment", "digital")
SLOTS = ("morning", "afternoon", "evening")


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    title_ar: Mapped[str] = mapped_column(String(200))
    title_fr: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(16), index=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    date: Mapped[dt.date] = mapped_column(index=True)
    attendees: Mapped[int] = mapped_column(Integer)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    space: Mapped[str] = mapped_column(String(100))
    date: Mapped[dt.date] = mapped_column(index=True)
    slot: Mapped[str] = mapped_column(String(16))
    requester: Mapped[str] = mapped_column(String(200))
