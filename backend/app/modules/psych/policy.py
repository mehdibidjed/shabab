"""Module 2 access policy — the single place that decides who may read what.

Rules (CLAUDE.md, "Privacy rules for this module"):
- Session notes, assessments, follow-up plans and parent-report drafts are readable
  only by the psychologist who owns the case (ownership moves on formal transfer).
  Directors, DJS, OPOW/ODEJ and the Wali inspector are refused (403) before any
  lookup; another psychologist gets 404 so a case's existence does not leak.
- Every read of a case file, and every refused attempt naming a case, is logged.
- Everyone above the psychologist only gets aggregated, anonymous statistics with
  small counts suppressed (see `suppress`).
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.db import get_db
from app.core.demo_users import MANAGEMENT_ROLES, DemoUser
from app.core.scope import Scope, get_scope
from app.modules.facilities.models import Staff
from app.modules.members.models import Member
from app.modules.psych.models import CaseAccessLog, CaseFile

SMALL_COUNT = 5
STAFF_ROLES = {"psychologist", "educator"}
STATS_ROLES = MANAGEMENT_ROLES | {"psychologist"}


@dataclass
class Actor:
    user: DemoUser
    scope: Scope
    staff: Staff | None  # psychologist / educator
    member: Member | None  # parent's child, or the young member themselves

    @property
    def role(self) -> str:
        return self.user.role

    @property
    def facility_id(self) -> int | None:
        if self.staff:
            return self.staff.facility_id
        return self.member.facility_id if self.member else None


def get_actor(db: DbSession = Depends(get_db), scope: Scope = Depends(get_scope)) -> Actor:
    user = scope.user
    staff = member = None
    if user.person and user.role in STAFF_ROLES:
        staff = db.scalar(select(Staff).where(Staff.demo_key == user.person))
    elif user.person:
        member = db.scalar(select(Member).where(Member.demo_key == user.person))
    return Actor(user=user, scope=scope, staff=staff, member=member)


def require(actor: Actor, *roles: str) -> None:
    if actor.role not in roles:
        raise HTTPException(status_code=403, detail="Forbidden for this role")


def log_access(db: DbSession, actor: Actor, case_id: int, action: str) -> None:
    db.add(CaseAccessLog(case_id=case_id, user_key=actor.user.key, role=actor.role, action=action))
    db.commit()


def owned_case(db: DbSession, actor: Actor, case_id: int, action: str) -> CaseFile:
    """The case, if `actor` is its owning psychologist; logs the read. Otherwise:
    non-psychologists -> 403 (attempt logged), other psychologists -> 404."""
    if actor.role != "psychologist" or actor.staff is None:
        log_access(db, actor, case_id, "denied")
        raise HTTPException(status_code=403, detail="Case files are visible to the owning psychologist only")
    case = db.get(CaseFile, case_id)
    if case is None or case.owner_staff_id != actor.staff.id:
        if case is not None:
            log_access(db, actor, case_id, "denied")
        raise HTTPException(status_code=404, detail="Case not found")
    log_access(db, actor, case_id, action)
    return case


def suppress(n: int) -> int | str:
    """Small-count suppression for aggregated statistics: 1-4 become "<5".
    Zero stays 0 (it identifies nobody); everything else is exact."""
    return "<5" if 0 < n < SMALL_COUNT else n
