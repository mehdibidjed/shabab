"""Module 2 — Psychological Care & Prevention (مصلحة الإرشاد والمتابعة النفسية).

Confidential fields use `EncryptedText` (Fernet at rest). Who may read what is
decided in `policy.py`; services never load confidential rows for anyone else.
"""
import datetime as dt

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.crypto import EncryptedText
from app.core.db import Base

PROGRAM_THEMES = ("addiction", "stress", "behavior")
CASE_STATUSES = ("open", "follow_up", "closed")
REFERRAL_CATEGORIES = ("behavior", "isolation", "school", "family", "stress", "other")
ALERT_TYPES = ("attendance_drop", "educator_flag", "parent_request")
APPOINTMENT_TYPES = ("listening", "follow_up", "parent_meeting")
APPOINTMENT_STATUSES = ("requested", "confirmed", "done", "cancelled")


def _now() -> dt.datetime:
    return dt.datetime.now(dt.UTC).replace(tzinfo=None)


class PreventiveProgram(Base):
    __tablename__ = "psych_programs"

    id: Mapped[int] = mapped_column(primary_key=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    owner_staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"))
    theme: Mapped[str] = mapped_column(String(16))
    title_ar: Mapped[str] = mapped_column(String(200))
    title_fr: Mapped[str] = mapped_column(String(200))
    description_ar: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[dt.date]
    sessions_count: Mapped[int] = mapped_column(Integer)
    every_days: Mapped[int] = mapped_column(Integer, default=7)
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft | published
    published_at: Mapped[dt.datetime | None] = mapped_column(DateTime)


class CaseFile(Base):
    """الملف النفسي السري. Subject is a member (youth/child) or a staff member (worker)."""

    __tablename__ = "psych_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True)  # e.g. "PS-0007", used in anonymous contexts
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    owner_staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"), index=True)
    subject_member_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"))
    subject_staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"))
    is_minor: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(16), default="open")
    origin: Mapped[str] = mapped_column(String(16))  # referral | alert | self | parent
    opened_at: Mapped[dt.date]
    closed_at: Mapped[dt.date | None]
    guardian_consent_at: Mapped[dt.datetime | None] = mapped_column(DateTime)
    guardian_name: Mapped[str | None] = mapped_column(String(150))
    transferred_from_staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"))


class Session(Base):
    __tablename__ = "psych_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("psych_cases.id"), index=True)
    date: Mapped[dt.date] = mapped_column(index=True)
    duration_min: Mapped[int] = mapped_column(Integer, default=45)
    notes: Mapped[str] = mapped_column(EncryptedText)


class Assessment(Base):
    __tablename__ = "psych_assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("psych_cases.id"), index=True)
    date: Mapped[dt.date]
    form_name: Mapped[str] = mapped_column(String(100))
    score: Mapped[int] = mapped_column(Integer)
    max_score: Mapped[int] = mapped_column(Integer)
    answers: Mapped[str] = mapped_column(EncryptedText)  # JSON, encrypted


class FollowUpPlan(Base):
    __tablename__ = "psych_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("psych_cases.id"), unique=True)
    content: Mapped[str] = mapped_column(EncryptedText)  # goals and actions
    review_date: Mapped[dt.date | None]
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_now)


class Referral(Base):
    """Educator/counselor -> psychologist: an observed behavior, nothing clinical."""

    __tablename__ = "psych_referrals"

    id: Mapped[int] = mapped_column(primary_key=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    from_staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"), index=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id"))
    category: Mapped[str] = mapped_column(String(16))
    observation: Mapped[str] = mapped_column(Text)
    aggressive_behavior: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(16), default="sent")  # sent | received | closed
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_now)
    case_id: Mapped[int | None] = mapped_column(ForeignKey("psych_cases.id"))  # never exposed to the educator


class Guidance(Base):
    """Psychologist -> educator: pedagogical advice only. No clinical fields, by design."""

    __tablename__ = "psych_guidance"

    id: Mapped[int] = mapped_column(primary_key=True)
    referral_id: Mapped[int] = mapped_column(ForeignKey("psych_referrals.id"), index=True)
    from_staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_now)


class ParentReport(Base):
    __tablename__ = "psych_parent_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("psych_cases.id"), index=True)
    period: Mapped[str] = mapped_column(String(32))  # e.g. "2026-09"
    summary: Mapped[str] = mapped_column(EncryptedText)  # simplified, written for the parent
    shared: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_at: Mapped[dt.datetime | None] = mapped_column(DateTime)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_now)


class Appointment(Base):
    __tablename__ = "psych_appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    psychologist_staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"), index=True)
    member_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"))
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"))  # a worker booking for themselves
    requested_by: Mapped[str] = mapped_column(String(16))  # youth | parent | psychologist | worker
    type: Mapped[str] = mapped_column(String(16))
    starts_at: Mapped[dt.datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(16), default="requested")
    note: Mapped[str | None] = mapped_column(String(300))  # logistics only, never clinical


class Alert(Base):
    __tablename__ = "psych_alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    org_path: Mapped[str] = mapped_column(String(255), index=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id"))
    type: Mapped[str] = mapped_column(String(24))
    details: Mapped[str] = mapped_column(String(300))  # factual: counts, who raised it; no diagnosis
    status: Mapped[str] = mapped_column(String(16), default="new")  # new | acknowledged | closed
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=_now)


class CaseAccessLog(Base):
    """Every read of (or denied attempt on) a case file. Visible to the owning psychologist."""

    __tablename__ = "psych_access_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(Integer, index=True)  # no FK: denied attempts may name any id
    user_key: Mapped[str] = mapped_column(String(32))
    role: Mapped[str] = mapped_column(String(32))
    action: Mapped[str] = mapped_column(String(24))  # view | sessions | assessments | plan | reports | denied
    at: Mapped[dt.datetime] = mapped_column(DateTime, default=_now)
