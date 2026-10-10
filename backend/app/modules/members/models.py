import datetime as dt

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# Shared by facility detail and the members page.
AGE_BANDS = [("12-15", 12, 15), ("16-18", 16, 18), ("19-24", 19, 24), ("25-30", 25, 30)]


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_no: Mapped[str] = mapped_column(String(16), unique=True)
    full_name_ar: Mapped[str] = mapped_column(String(150))
    full_name_fr: Mapped[str] = mapped_column(String(150))
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(1))  # "m" | "f"
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    joined_at: Mapped[dt.date]
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    demo_key: Mapped[str | None] = mapped_column(String(32), unique=True)  # links a demo user (prototype only)
