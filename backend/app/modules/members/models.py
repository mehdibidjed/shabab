import datetime as dt

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(1))  # "m" | "f"
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    joined_at: Mapped[dt.date]
    active: Mapped[bool] = mapped_column(Boolean, default=True)
