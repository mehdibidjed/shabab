"""Module 2 services. Every function takes an `Actor` and enforces the policy
itself, so the privacy rules hold whatever router or job calls it."""
import datetime as dt
from collections import Counter, defaultdict

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session as DbSession

from app.core.dates import month_key, month_start
from app.modules.activities.models import Activity
from app.modules.facilities.models import Facility, Staff
from app.modules.members.models import Member
from app.modules.org.models import OrgUnit
from app.modules.psych import schemas as s
from app.modules.psych.models import (
    Alert,
    Appointment,
    Assessment,
    CaseAccessLog,
    CaseFile,
    FollowUpPlan,
    Guidance,
    ParentReport,
    PreventiveProgram,
    Referral,
)
from app.modules.psych.models import Session as CounselingSession
from app.modules.psych.policy import STATS_ROLES, Actor, owned_case, require, suppress

ADULT_AGE = 18
OPEN_CASE = ("open", "follow_up")


def _now() -> dt.datetime:
    return dt.datetime.now(dt.UTC).replace(tzinfo=None)


def _member_ref(m: Member) -> s.PersonRef:
    return s.PersonRef(kind="member", id=m.id, name_ar=m.full_name_ar, name_fr=m.full_name_fr, age=m.age,
                       facility_id=m.facility_id)


def _staff_ref(st: Staff) -> s.PersonRef:
    return s.PersonRef(kind="staff", id=st.id, name_ar=st.full_name_ar, name_fr=st.full_name_fr,
                       facility_id=st.facility_id)


def _psychologist_of(db: DbSession, facility_id: int) -> Staff:
    psy = db.scalar(select(Staff).where(Staff.facility_id == facility_id, Staff.position == "psychologist"))
    if psy is None:
        raise HTTPException(status_code=409, detail="No psychologist in this facility")
    return psy


def _facility_member(db: DbSession, actor: Actor, member_id: int) -> Member:
    m = db.get(Member, member_id)
    if m is None or m.facility_id != actor.facility_id:
        raise HTTPException(status_code=404, detail="Member not found in your facility")
    return m


# ================================================================ lookups
def search_members(db: DbSession, actor: Actor, q: str | None) -> list[s.MemberLookup]:
    """For the referral form / opening a case: members of the actor's own facility."""
    require(actor, "psychologist", "educator")
    conds = [Member.facility_id == actor.facility_id, Member.active]
    if q and q.strip():
        like = f"%{q.strip()}%"
        conds.append(or_(Member.full_name_ar.ilike(like), Member.full_name_fr.ilike(like), Member.member_no.ilike(like)))
    rows = db.scalars(select(Member).where(*conds).order_by(Member.full_name_ar).limit(20))
    return [s.MemberLookup(id=m.id, member_no=m.member_no, full_name_ar=m.full_name_ar,
                           full_name_fr=m.full_name_fr, age=m.age) for m in rows]


# ================================================================ alerts (psychologist inbox)
def list_alerts(db: DbSession, actor: Actor, status: str | None) -> list[s.AlertOut]:
    require(actor, "psychologist")
    conds = [Alert.facility_id == actor.facility_id]
    if status == "open":
        conds.append(Alert.status != "closed")
    rows = db.execute(select(Alert, Member).join(Member, Member.id == Alert.member_id).where(*conds)
                      .order_by(Alert.status != "new", Alert.created_at.desc())).all()
    open_cases = dict(db.execute(
        select(CaseFile.subject_member_id, CaseFile.id)
        .where(CaseFile.owner_staff_id == actor.staff.id, CaseFile.status.in_(OPEN_CASE))).all())
    return [s.AlertOut(id=a.id, type=a.type, status=a.status, details=a.details, created_at=a.created_at,
                       member=_member_ref(m), open_case_id=open_cases.get(m.id)) for a, m in rows]


def update_alert(db: DbSession, actor: Actor, alert_id: int, body: s.AlertUpdate) -> None:
    require(actor, "psychologist")
    alert = db.get(Alert, alert_id)
    if alert is None or alert.facility_id != actor.facility_id:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = body.status
    db.commit()


# ================================================================ cases
def _summaries(db: DbSession, cases: list[CaseFile]) -> list[s.CaseSummary]:
    ids = [c.id for c in cases]
    stats = {cid: (n, last) for cid, n, last in db.execute(
        select(CounselingSession.case_id, func.count(), func.max(CounselingSession.date))
        .where(CounselingSession.case_id.in_(ids)).group_by(CounselingSession.case_id)).all()}
    members = {m.id: m for m in db.scalars(select(Member).where(Member.id.in_([c.subject_member_id for c in cases if c.subject_member_id])))}
    staff = {x.id: x for x in db.scalars(select(Staff).where(Staff.id.in_([c.subject_staff_id for c in cases if c.subject_staff_id])))}
    out = []
    for c in cases:
        subject = _member_ref(members[c.subject_member_id]) if c.subject_member_id else _staff_ref(staff[c.subject_staff_id])
        n, last = stats.get(c.id, (0, None))
        out.append(s.CaseSummary(id=c.id, code=c.code, subject=subject, is_minor=c.is_minor,
                                 consent_recorded=c.guardian_consent_at is not None, status=c.status, origin=c.origin,
                                 opened_at=c.opened_at, sessions=n, last_session=last))
    return out


def list_cases(db: DbSession, actor: Actor, status: str | None) -> list[s.CaseSummary]:
    require(actor, "psychologist")
    conds = [CaseFile.owner_staff_id == actor.staff.id]
    if status in ("open", "follow_up", "closed"):
        conds.append(CaseFile.status == status)
    elif status == "consent_pending":
        conds += [CaseFile.is_minor, CaseFile.guardian_consent_at.is_(None)]
    cases = list(db.scalars(select(CaseFile).where(*conds).order_by(CaseFile.status == "closed", CaseFile.opened_at.desc())))
    return _summaries(db, cases)


def get_case(db: DbSession, actor: Actor, case_id: int) -> s.CaseDetail:
    case = owned_case(db, actor, case_id, "view")
    summary = _summaries(db, [case])[0]
    prev = db.get(Staff, case.transferred_from_staff_id) if case.transferred_from_staff_id else None
    return s.CaseDetail(**summary.model_dump(), guardian_name=case.guardian_name,
                        guardian_consent_at=case.guardian_consent_at, closed_at=case.closed_at,
                        transferred_from=prev.full_name_ar if prev else None)


def _next_code(db: DbSession) -> str:
    return f"PS-{(db.scalar(select(func.count()).select_from(CaseFile)) or 0) + 1:04d}"


def create_case(db: DbSession, actor: Actor, body: s.CaseCreate) -> s.CaseDetail:
    require(actor, "psychologist")
    member = staff = None
    if body.member_id:
        member = _facility_member(db, actor, body.member_id)
    elif body.staff_id:
        staff = db.get(Staff, body.staff_id)
        if staff is None or staff.facility_id != actor.facility_id:
            raise HTTPException(status_code=404, detail="Staff not found in your facility")
    else:
        raise HTTPException(status_code=422, detail="member_id or staff_id is required")
    fac = db.get(Facility, actor.facility_id)
    case = CaseFile(code=_next_code(db), facility_id=fac.id, org_path=fac.org_path, owner_staff_id=actor.staff.id,
                    subject_member_id=member.id if member else None, subject_staff_id=staff.id if staff else None,
                    is_minor=bool(member and member.age < ADULT_AGE), status="open", origin=body.origin,
                    opened_at=dt.date.today())
    db.add(case)
    db.flush()
    if body.referral_id:
        ref = db.get(Referral, body.referral_id)
        if ref and ref.facility_id == actor.facility_id:
            ref.case_id, ref.status = case.id, "received"
    if body.alert_id:
        alert = db.get(Alert, body.alert_id)
        if alert and alert.facility_id == actor.facility_id:
            alert.status = "acknowledged"
    db.commit()
    return get_case(db, actor, case.id)


def update_case(db: DbSession, actor: Actor, case_id: int, body: s.CaseUpdate) -> s.CaseDetail:
    case = owned_case(db, actor, case_id, "update")
    case.status = body.status
    case.closed_at = dt.date.today() if body.status == "closed" else None
    db.commit()
    return get_case(db, actor, case_id)


def record_consent(db: DbSession, actor: Actor, case_id: int, body: s.ConsentIn) -> s.CaseDetail:
    case = owned_case(db, actor, case_id, "consent")
    case.guardian_name, case.guardian_consent_at = body.guardian_name, _now()
    db.commit()
    return get_case(db, actor, case_id)


def transfer_case(db: DbSession, actor: Actor, case_id: int, body: s.TransferIn) -> None:
    """Formal transfer: ownership (and with it read access) moves to another psychologist."""
    case = owned_case(db, actor, case_id, "transfer")
    target = db.get(Staff, body.to_staff_id)
    if target is None or target.position != "psychologist" or target.id == actor.staff.id:
        raise HTTPException(status_code=422, detail="Target must be another psychologist")
    case.transferred_from_staff_id, case.owner_staff_id = case.owner_staff_id, target.id
    db.commit()


# ---------------------------------------------------------------- confidential content
def list_sessions(db: DbSession, actor: Actor, case_id: int) -> list[s.SessionOut]:
    owned_case(db, actor, case_id, "sessions")
    rows = db.scalars(select(CounselingSession).where(CounselingSession.case_id == case_id)
                      .order_by(CounselingSession.date.desc()))
    return [s.SessionOut.model_validate(r) for r in rows]


def add_session(db: DbSession, actor: Actor, case_id: int, body: s.SessionIn) -> s.SessionOut:
    case = owned_case(db, actor, case_id, "add_session")
    if case.is_minor and case.guardian_consent_at is None:
        raise HTTPException(status_code=409, detail="Guardian consent must be recorded before adding session notes for a minor")
    row = CounselingSession(case_id=case.id, date=body.date, duration_min=body.duration_min, notes=body.notes)
    db.add(row)
    db.commit()
    return s.SessionOut.model_validate(row)


def list_assessments(db: DbSession, actor: Actor, case_id: int) -> list[s.AssessmentOut]:
    owned_case(db, actor, case_id, "assessments")
    rows = db.scalars(select(Assessment).where(Assessment.case_id == case_id).order_by(Assessment.date.desc()))
    return [s.AssessmentOut.model_validate(r) for r in rows]


def add_assessment(db: DbSession, actor: Actor, case_id: int, body: s.AssessmentIn) -> s.AssessmentOut:
    case = owned_case(db, actor, case_id, "add_assessment")
    if case.is_minor and case.guardian_consent_at is None:
        raise HTTPException(status_code=409, detail="Guardian consent must be recorded first")
    if body.score > body.max_score:
        raise HTTPException(status_code=422, detail="score exceeds max_score")
    row = Assessment(case_id=case.id, **body.model_dump())
    db.add(row)
    db.commit()
    return s.AssessmentOut.model_validate(row)


def get_plan(db: DbSession, actor: Actor, case_id: int) -> s.PlanOut:
    owned_case(db, actor, case_id, "plan")
    plan = db.scalar(select(FollowUpPlan).where(FollowUpPlan.case_id == case_id))
    if plan is None:
        return s.PlanOut(content="", review_date=None, updated_at=None)
    return s.PlanOut(content=plan.content, review_date=plan.review_date, updated_at=plan.updated_at)


def put_plan(db: DbSession, actor: Actor, case_id: int, body: s.PlanIn) -> s.PlanOut:
    case = owned_case(db, actor, case_id, "update_plan")
    if case.is_minor and case.guardian_consent_at is None:
        raise HTTPException(status_code=409, detail="Guardian consent must be recorded first")
    plan = db.scalar(select(FollowUpPlan).where(FollowUpPlan.case_id == case_id))
    if plan is None:
        plan = FollowUpPlan(case_id=case_id, content="")
        db.add(plan)
    plan.content, plan.review_date, plan.updated_at = body.content, body.review_date, _now()
    db.commit()
    return s.PlanOut(content=plan.content, review_date=plan.review_date, updated_at=plan.updated_at)


def list_parent_reports(db: DbSession, actor: Actor, case_id: int) -> list[s.ParentReportOut]:
    owned_case(db, actor, case_id, "reports")
    rows = db.scalars(select(ParentReport).where(ParentReport.case_id == case_id).order_by(ParentReport.created_at.desc()))
    return [s.ParentReportOut.model_validate(r) for r in rows]


def add_parent_report(db: DbSession, actor: Actor, case_id: int, body: s.ParentReportIn) -> s.ParentReportOut:
    case = owned_case(db, actor, case_id, "add_report")
    if case.subject_member_id is None:
        raise HTTPException(status_code=422, detail="Parent reports apply to young members only")
    row = ParentReport(case_id=case.id, period=body.period, summary=body.summary, shared=body.shared,
                       shared_at=_now() if body.shared else None)
    db.add(row)
    db.commit()
    return s.ParentReportOut.model_validate(row)


def access_log(db: DbSession, actor: Actor, case_id: int) -> list[s.AccessLogOut]:
    owned_case(db, actor, case_id, "access_log")
    rows = db.scalars(select(CaseAccessLog).where(CaseAccessLog.case_id == case_id)
                      .order_by(CaseAccessLog.at.desc(), CaseAccessLog.id.desc()).limit(200))
    return [s.AccessLogOut.model_validate(r) for r in rows]


# ================================================================ referrals & guidance
def _guidance_for(db: DbSession, referral_ids: list[int]) -> dict[int, list[s.GuidanceOut]]:
    out: dict[int, list[s.GuidanceOut]] = defaultdict(list)
    rows = db.execute(select(Guidance, Staff).join(Staff, Staff.id == Guidance.from_staff_id)
                      .where(Guidance.referral_id.in_(referral_ids)).order_by(Guidance.created_at)).all()
    for g, st in rows:
        out[g.referral_id].append(s.GuidanceOut(id=g.id, text=g.text, created_at=g.created_at,
                                                from_name_ar=st.full_name_ar, from_name_fr=st.full_name_fr))
    return out


def create_referral(db: DbSession, actor: Actor, body: s.ReferralIn) -> s.ReferralForEducator:
    require(actor, "educator")
    member = _facility_member(db, actor, body.member_id)
    fac = db.get(Facility, actor.facility_id)
    ref = Referral(facility_id=fac.id, org_path=fac.org_path, from_staff_id=actor.staff.id, member_id=member.id,
                   category=body.category, observation=body.observation, aggressive_behavior=body.aggressive_behavior)
    db.add(ref)
    db.flush()
    if body.aggressive_behavior:
        # An educator flagging aggressive behavior raises an alert in the psychologist's inbox.
        db.add(Alert(facility_id=fac.id, org_path=fac.org_path, member_id=member.id, type="educator_flag",
                     details=f"referral:{ref.id}"))
    db.commit()
    return my_referrals(db, actor, only_id=ref.id)[0]


def my_referrals(db: DbSession, actor: Actor, only_id: int | None = None) -> list[s.ReferralForEducator]:
    require(actor, "educator")
    conds = [Referral.from_staff_id == actor.staff.id] + ([Referral.id == only_id] if only_id else [])
    rows = db.execute(select(Referral, Member).join(Member, Member.id == Referral.member_id).where(*conds)
                      .order_by(Referral.created_at.desc())).all()
    guidance = _guidance_for(db, [r.id for r, _ in rows])
    return [s.ReferralForEducator(id=r.id, member=_member_ref(m), category=r.category, observation=r.observation,
                                  aggressive_behavior=r.aggressive_behavior, status=r.status, created_at=r.created_at,
                                  guidance=guidance.get(r.id, [])) for r, m in rows]


def received_referrals(db: DbSession, actor: Actor) -> list[s.ReferralForPsychologist]:
    require(actor, "psychologist")
    rows = db.execute(select(Referral, Member, Staff).join(Member, Member.id == Referral.member_id)
                      .join(Staff, Staff.id == Referral.from_staff_id)
                      .where(Referral.facility_id == actor.facility_id)
                      .order_by(Referral.status != "sent", Referral.created_at.desc())).all()
    guidance = _guidance_for(db, [r.id for r, _, _ in rows])
    return [s.ReferralForPsychologist(id=r.id, member=_member_ref(m), category=r.category, observation=r.observation,
                                      aggressive_behavior=r.aggressive_behavior, status=r.status,
                                      created_at=r.created_at, guidance=guidance.get(r.id, []),
                                      from_name_ar=st.full_name_ar, from_name_fr=st.full_name_fr, case_id=r.case_id)
            for r, m, st in rows]


def mark_referral_received(db: DbSession, actor: Actor, referral_id: int) -> None:
    require(actor, "psychologist")
    ref = db.get(Referral, referral_id)
    if ref is None or ref.facility_id != actor.facility_id:
        raise HTTPException(status_code=404, detail="Referral not found")
    if ref.status == "sent":
        ref.status = "received"
    db.commit()


def add_guidance(db: DbSession, actor: Actor, referral_id: int, body: s.GuidanceIn) -> s.GuidanceOut:
    require(actor, "psychologist")
    ref = db.get(Referral, referral_id)
    if ref is None or ref.facility_id != actor.facility_id:
        raise HTTPException(status_code=404, detail="Referral not found")
    g = Guidance(referral_id=ref.id, from_staff_id=actor.staff.id, text=body.text)
    db.add(g)
    if ref.status == "sent":
        ref.status = "received"
    db.commit()
    return s.GuidanceOut(id=g.id, text=g.text, created_at=g.created_at, from_name_ar=actor.staff.full_name_ar,
                         from_name_fr=actor.staff.full_name_fr)


# ================================================================ appointments
def _appointments(db: DbSession, conds, with_person: bool) -> list[s.AppointmentOut]:
    rows = db.scalars(select(Appointment).where(*conds).order_by(Appointment.starts_at))
    out = []
    for a in rows:
        person = None
        if with_person and a.member_id:
            person = _member_ref(db.get(Member, a.member_id))
        elif with_person and a.staff_id:
            person = _staff_ref(db.get(Staff, a.staff_id))
        out.append(s.AppointmentOut(id=a.id, type=a.type, status=a.status, starts_at=a.starts_at,
                                    requested_by=a.requested_by, with_person=person, note=a.note))
    return out


def agenda(db: DbSession, actor: Actor, days: int) -> list[s.AppointmentOut]:
    require(actor, "psychologist")
    start = dt.datetime.combine(dt.date.today(), dt.time.min)
    return _appointments(db, [Appointment.psychologist_staff_id == actor.staff.id, Appointment.starts_at >= start,
                              Appointment.starts_at < start + dt.timedelta(days=days)], with_person=True)


def create_appointment(db: DbSession, actor: Actor, body: s.AppointmentIn) -> s.AppointmentOut:
    require(actor, "psychologist")
    member = _facility_member(db, actor, body.member_id) if body.member_id else None
    fac = db.get(Facility, actor.facility_id)
    a = Appointment(facility_id=fac.id, org_path=fac.org_path, psychologist_staff_id=actor.staff.id,
                    member_id=member.id if member else None, requested_by="psychologist", type=body.type,
                    starts_at=body.starts_at, status="confirmed", note=body.note)
    db.add(a)
    db.commit()
    return _appointments(db, [Appointment.id == a.id], with_person=True)[0]


def update_appointment(db: DbSession, actor: Actor, appointment_id: int, body: s.AppointmentUpdate) -> None:
    require(actor, "psychologist")
    a = db.get(Appointment, appointment_id)
    if a is None or a.psychologist_staff_id != actor.staff.id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    a.status = body.status
    db.commit()


# ---------------------------------------------------------------- young member
SLOT_HOURS = (9, 10, 11, 14, 15)


def youth_slots(db: DbSession, actor: Actor) -> list[dt.datetime]:
    """Free listening slots over the next 10 working days (Sun–Thu in Algeria)."""
    require(actor, "young_member")
    psy = _psychologist_of(db, actor.facility_id)
    taken = set(db.scalars(select(Appointment.starts_at).where(
        Appointment.psychologist_staff_id == psy.id, Appointment.status != "cancelled")))
    out, day = [], dt.date.today() + dt.timedelta(days=1)
    while len({x.date() for x in out}) < 10:
        if day.weekday() not in (4, 5):  # Friday, Saturday
            out += [t for h in SLOT_HOURS if (t := dt.datetime.combine(day, dt.time(h))) not in taken]
        day += dt.timedelta(days=1)
    return out


def youth_book(db: DbSession, actor: Actor, body: s.YouthBooking) -> s.AppointmentOut:
    require(actor, "young_member")
    if body.starts_at not in youth_slots(db, actor):
        raise HTTPException(status_code=409, detail="This slot is not available")
    psy = _psychologist_of(db, actor.facility_id)
    fac = db.get(Facility, actor.facility_id)
    a = Appointment(facility_id=fac.id, org_path=fac.org_path, psychologist_staff_id=psy.id,
                    member_id=actor.member.id, requested_by="youth", type="listening", starts_at=body.starts_at)
    db.add(a)
    db.commit()
    return _appointments(db, [Appointment.id == a.id], with_person=False)[0]


def youth_appointments(db: DbSession, actor: Actor) -> list[s.AppointmentOut]:
    require(actor, "young_member")
    return _appointments(db, [Appointment.member_id == actor.member.id, Appointment.requested_by == "youth"],
                         with_person=False)


def youth_cancel(db: DbSession, actor: Actor, appointment_id: int) -> None:
    require(actor, "young_member")
    a = db.get(Appointment, appointment_id)
    if a is None or a.member_id != actor.member.id or a.requested_by != "youth":
        raise HTTPException(status_code=404, detail="Appointment not found")
    a.status = "cancelled"
    db.commit()


# ================================================================ parent
def _child(actor: Actor) -> Member:
    require(actor, "parent")
    if actor.member is None:
        raise HTTPException(status_code=404, detail="No child linked to this account")
    return actor.member


def parent_child(db: DbSession, actor: Actor) -> s.ChildOut:
    child = _child(actor)
    unit = db.scalar(select(OrgUnit).join(Facility, Facility.org_unit_id == OrgUnit.id).where(Facility.id == child.facility_id))
    return s.ChildOut(first_name_ar=child.full_name_ar.split(" ")[0], first_name_fr=child.full_name_fr.split(" ")[0],
                      facility_name_ar=unit.name_ar, facility_name_fr=unit.name_fr)


def parent_reports(db: DbSession, actor: Actor) -> list[s.SharedReport]:
    """Only reports the psychologist explicitly shared, only about this parent's child."""
    child = _child(actor)
    rows = db.execute(select(ParentReport, Staff).join(CaseFile, CaseFile.id == ParentReport.case_id)
                      .join(Staff, Staff.id == CaseFile.owner_staff_id)
                      .where(CaseFile.subject_member_id == child.id, ParentReport.shared)
                      .order_by(ParentReport.shared_at.desc())).all()
    return [s.SharedReport(id=r.id, period=r.period, summary=r.summary, shared_at=r.shared_at,
                           psychologist_name_ar=st.full_name_ar, psychologist_name_fr=st.full_name_fr) for r, st in rows]


def parent_request_meeting(db: DbSession, actor: Actor, body: s.MeetingRequestIn) -> s.MeetingRequestOut:
    child = _child(actor)
    fac = db.get(Facility, child.facility_id)
    alert = Alert(facility_id=fac.id, org_path=fac.org_path, member_id=child.id, type="parent_request",
                  details=f"reason:{body.reason};preferred:{body.preferred}")
    db.add(alert)
    db.commit()
    return s.MeetingRequestOut(id=alert.id, status=alert.status, created_at=alert.created_at)


def parent_requests(db: DbSession, actor: Actor) -> list[s.MeetingRequestOut]:
    child = _child(actor)
    rows = db.scalars(select(Alert).where(Alert.member_id == child.id, Alert.type == "parent_request")
                      .order_by(Alert.created_at.desc()))
    return [s.MeetingRequestOut(id=a.id, status=a.status, created_at=a.created_at) for a in rows]


# ================================================================ preventive programs
def list_programs(db: DbSession, actor: Actor) -> list[s.ProgramOut]:
    require(actor, "psychologist")
    rows = db.scalars(select(PreventiveProgram).where(PreventiveProgram.facility_id == actor.facility_id)
                      .order_by(PreventiveProgram.start_date.desc()))
    return [s.ProgramOut.model_validate(p) for p in rows]


def create_program(db: DbSession, actor: Actor, body: s.ProgramIn) -> s.ProgramOut:
    require(actor, "psychologist")
    fac = db.get(Facility, actor.facility_id)
    p = PreventiveProgram(facility_id=fac.id, org_path=fac.org_path, owner_staff_id=actor.staff.id, **body.model_dump())
    db.add(p)
    db.commit()
    return s.ProgramOut.model_validate(p)


def update_program(db: DbSession, actor: Actor, program_id: int, body: s.ProgramIn) -> s.ProgramOut:
    require(actor, "psychologist")
    p = db.get(PreventiveProgram, program_id)
    if p is None or p.facility_id != actor.facility_id:
        raise HTTPException(status_code=404, detail="Program not found")
    if p.status == "published":
        raise HTTPException(status_code=409, detail="A published program cannot be edited")
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    db.commit()
    return s.ProgramOut.model_validate(p)


def publish_program(db: DbSession, program: PreventiveProgram, attendees_for_past: int = 0) -> None:
    """Adds one `prevention` activity per session to the facility's calendar."""
    for i in range(program.sessions_count):
        day = program.start_date + dt.timedelta(days=i * program.every_days)
        db.add(Activity(title_ar=f"{program.title_ar} ({i + 1}/{program.sessions_count})",
                        title_fr=f"{program.title_fr} ({i + 1}/{program.sessions_count})", category="prevention",
                        facility_id=program.facility_id, org_path=program.org_path, date=day, program_id=program.id,
                        attendees=attendees_for_past if day <= dt.date.today() else 0))
    program.status, program.published_at = "published", _now()


def publish(db: DbSession, actor: Actor, program_id: int) -> s.ProgramOut:
    require(actor, "psychologist")
    p = db.get(PreventiveProgram, program_id)
    if p is None or p.facility_id != actor.facility_id:
        raise HTTPException(status_code=404, detail="Program not found")
    if p.status != "published":
        publish_program(db, p)
        db.commit()
    return s.ProgramOut.model_validate(p)


def calendar(db: DbSession, actor: Actor) -> list[s.CalendarItem]:
    """Upcoming prevention sessions in the actor's facility — public information."""
    fac_id = actor.facility_id
    if fac_id is None:  # management roles: their scope
        conds = [actor.scope.filter(Activity.org_path)]
    else:
        conds = [Activity.facility_id == fac_id]
    rows = db.execute(select(Activity, PreventiveProgram.theme)
                      .outerjoin(PreventiveProgram, PreventiveProgram.id == Activity.program_id)
                      .where(*conds, Activity.category == "prevention", Activity.date >= dt.date.today())
                      .order_by(Activity.date).limit(30)).all()
    return [s.CalendarItem(activity_id=a.id, date=a.date, title_ar=a.title_ar, title_fr=a.title_fr, theme=theme)
            for a, theme in rows]


# ================================================================ aggregated statistics
def stats(db: DbSession, actor: Actor) -> s.PsychStats:
    """Anonymous aggregates for the actor's scope. Never names, ids or case codes."""
    require(actor, *STATS_ROLES)
    today = dt.date.today()

    def scoped(model):
        # A psychologist's scope is their facility; management roles use their org subtree.
        if actor.role == "psychologist":
            return model.facility_id == actor.facility_id
        return actor.scope.filter(model.org_path)

    cases = db.execute(select(CaseFile.status, CaseFile.opened_at).where(scoped(CaseFile))).all()
    start = month_start(today, 5)
    sessions = Counter(month_key(d) for d in db.scalars(
        select(CounselingSession.date).join(CaseFile, CaseFile.id == CounselingSession.case_id)
        .where(scoped(CaseFile), CounselingSession.date >= start, CounselingSession.date <= today)))
    referrals = Counter(db.scalars(select(Referral.category).where(scoped(Referral))))
    appts = db.scalar(select(func.count()).select_from(Appointment).where(
        scoped(Appointment), Appointment.starts_at >= dt.datetime.combine(month_start(today), dt.time.min),
        Appointment.status != "cancelled")) or 0
    alerts = db.scalar(select(func.count()).select_from(Alert).where(scoped(Alert), Alert.status != "closed")) or 0
    programs = db.scalar(select(func.count()).select_from(PreventiveProgram).where(
        scoped(PreventiveProgram), PreventiveProgram.status == "published")) or 0
    upcoming = db.scalar(select(func.count()).select_from(Activity).where(
        scoped(Activity), Activity.category == "prevention", Activity.date >= today)) or 0

    return s.PsychStats(
        active_cases=suppress(sum(st in OPEN_CASE for st, _ in cases)),
        new_cases_this_month=suppress(sum(o >= month_start(today) for _, o in cases)),
        sessions_per_month=[s.MonthCount(month=(k := month_key(month_start(today, i))), count=suppress(sessions.get(k, 0)))
                            for i in range(5, -1, -1)],
        referrals_by_category=[s.CategoryCount(category=c, count=suppress(referrals.get(c, 0)))
                               for c in ("behavior", "isolation", "school", "family", "stress", "other")],
        appointments_this_month=suppress(appts),
        open_alerts=suppress(alerts),
        programs_published=programs,
        prevention_sessions_upcoming=upcoming,
    )
