from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DbSession

from app.core.db import get_db
from app.modules.psych import schemas as s
from app.modules.psych import service
from app.modules.psych.policy import Actor, get_actor

router = APIRouter(prefix="/psych", tags=["psych"])
Db = Depends(get_db)
Me = Depends(get_actor)


# ---------------------------------------------------------------- aggregated (management + psychologist)
@router.get("/stats", response_model=s.PsychStats)
def stats(db: DbSession = Db, actor: Actor = Me):
    return service.stats(db, actor)


@router.get("/calendar", response_model=list[s.CalendarItem])
def calendar(db: DbSession = Db, actor: Actor = Me):
    return service.calendar(db, actor)


# ---------------------------------------------------------------- psychologist + educator
@router.get("/members", response_model=list[s.MemberLookup])
def members(q: str | None = Query(None, max_length=100), db: DbSession = Db, actor: Actor = Me):
    return service.search_members(db, actor, q)


# ---------------------------------------------------------------- psychologist
@router.get("/alerts", response_model=list[s.AlertOut])
def alerts(status: str | None = None, db: DbSession = Db, actor: Actor = Me):
    return service.list_alerts(db, actor, status)


@router.patch("/alerts/{alert_id}", status_code=204)
def update_alert(alert_id: int, body: s.AlertUpdate, db: DbSession = Db, actor: Actor = Me):
    service.update_alert(db, actor, alert_id, body)


@router.get("/cases", response_model=list[s.CaseSummary])
def cases(status: str | None = None, db: DbSession = Db, actor: Actor = Me):
    return service.list_cases(db, actor, status)


@router.post("/cases", response_model=s.CaseDetail, status_code=201)
def create_case(body: s.CaseCreate, db: DbSession = Db, actor: Actor = Me):
    return service.create_case(db, actor, body)


@router.get("/cases/{case_id}", response_model=s.CaseDetail)
def get_case(case_id: int, db: DbSession = Db, actor: Actor = Me):
    return service.get_case(db, actor, case_id)


@router.patch("/cases/{case_id}", response_model=s.CaseDetail)
def update_case(case_id: int, body: s.CaseUpdate, db: DbSession = Db, actor: Actor = Me):
    return service.update_case(db, actor, case_id, body)


@router.post("/cases/{case_id}/consent", response_model=s.CaseDetail)
def consent(case_id: int, body: s.ConsentIn, db: DbSession = Db, actor: Actor = Me):
    return service.record_consent(db, actor, case_id, body)


@router.post("/cases/{case_id}/transfer", status_code=204)
def transfer(case_id: int, body: s.TransferIn, db: DbSession = Db, actor: Actor = Me):
    service.transfer_case(db, actor, case_id, body)


@router.get("/cases/{case_id}/sessions", response_model=list[s.SessionOut])
def sessions(case_id: int, db: DbSession = Db, actor: Actor = Me):
    return service.list_sessions(db, actor, case_id)


@router.post("/cases/{case_id}/sessions", response_model=s.SessionOut, status_code=201)
def add_session(case_id: int, body: s.SessionIn, db: DbSession = Db, actor: Actor = Me):
    return service.add_session(db, actor, case_id, body)


@router.get("/cases/{case_id}/assessments", response_model=list[s.AssessmentOut])
def assessments(case_id: int, db: DbSession = Db, actor: Actor = Me):
    return service.list_assessments(db, actor, case_id)


@router.post("/cases/{case_id}/assessments", response_model=s.AssessmentOut, status_code=201)
def add_assessment(case_id: int, body: s.AssessmentIn, db: DbSession = Db, actor: Actor = Me):
    return service.add_assessment(db, actor, case_id, body)


@router.get("/cases/{case_id}/plan", response_model=s.PlanOut)
def plan(case_id: int, db: DbSession = Db, actor: Actor = Me):
    return service.get_plan(db, actor, case_id)


@router.put("/cases/{case_id}/plan", response_model=s.PlanOut)
def put_plan(case_id: int, body: s.PlanIn, db: DbSession = Db, actor: Actor = Me):
    return service.put_plan(db, actor, case_id, body)


@router.get("/cases/{case_id}/parent-reports", response_model=list[s.ParentReportOut])
def parent_reports_of_case(case_id: int, db: DbSession = Db, actor: Actor = Me):
    return service.list_parent_reports(db, actor, case_id)


@router.post("/cases/{case_id}/parent-reports", response_model=s.ParentReportOut, status_code=201)
def add_parent_report(case_id: int, body: s.ParentReportIn, db: DbSession = Db, actor: Actor = Me):
    return service.add_parent_report(db, actor, case_id, body)


@router.get("/cases/{case_id}/access-log", response_model=list[s.AccessLogOut])
def access_log(case_id: int, db: DbSession = Db, actor: Actor = Me):
    return service.access_log(db, actor, case_id)


@router.get("/referrals/received", response_model=list[s.ReferralForPsychologist])
def received_referrals(db: DbSession = Db, actor: Actor = Me):
    return service.received_referrals(db, actor)


@router.post("/referrals/{referral_id}/received", status_code=204)
def mark_received(referral_id: int, db: DbSession = Db, actor: Actor = Me):
    service.mark_referral_received(db, actor, referral_id)


@router.post("/referrals/{referral_id}/guidance", response_model=s.GuidanceOut, status_code=201)
def add_guidance(referral_id: int, body: s.GuidanceIn, db: DbSession = Db, actor: Actor = Me):
    return service.add_guidance(db, actor, referral_id, body)


@router.get("/appointments", response_model=list[s.AppointmentOut])
def agenda(days: int = Query(14, ge=1, le=60), db: DbSession = Db, actor: Actor = Me):
    return service.agenda(db, actor, days)


@router.post("/appointments", response_model=s.AppointmentOut, status_code=201)
def create_appointment(body: s.AppointmentIn, db: DbSession = Db, actor: Actor = Me):
    return service.create_appointment(db, actor, body)


@router.patch("/appointments/{appointment_id}", status_code=204)
def update_appointment(appointment_id: int, body: s.AppointmentUpdate, db: DbSession = Db, actor: Actor = Me):
    service.update_appointment(db, actor, appointment_id, body)


@router.get("/programs", response_model=list[s.ProgramOut])
def programs(db: DbSession = Db, actor: Actor = Me):
    return service.list_programs(db, actor)


@router.post("/programs", response_model=s.ProgramOut, status_code=201)
def create_program(body: s.ProgramIn, db: DbSession = Db, actor: Actor = Me):
    return service.create_program(db, actor, body)


@router.put("/programs/{program_id}", response_model=s.ProgramOut)
def update_program(program_id: int, body: s.ProgramIn, db: DbSession = Db, actor: Actor = Me):
    return service.update_program(db, actor, program_id, body)


@router.post("/programs/{program_id}/publish", response_model=s.ProgramOut)
def publish(program_id: int, db: DbSession = Db, actor: Actor = Me):
    return service.publish(db, actor, program_id)


# ---------------------------------------------------------------- educator
@router.get("/referrals", response_model=list[s.ReferralForEducator])
def my_referrals(db: DbSession = Db, actor: Actor = Me):
    return service.my_referrals(db, actor)


@router.post("/referrals", response_model=s.ReferralForEducator, status_code=201)
def create_referral(body: s.ReferralIn, db: DbSession = Db, actor: Actor = Me):
    return service.create_referral(db, actor, body)


# ---------------------------------------------------------------- parent
@router.get("/parent/child", response_model=s.ChildOut)
def parent_child(db: DbSession = Db, actor: Actor = Me):
    return service.parent_child(db, actor)


@router.get("/parent/reports", response_model=list[s.SharedReport])
def parent_reports(db: DbSession = Db, actor: Actor = Me):
    return service.parent_reports(db, actor)


@router.get("/parent/meeting-requests", response_model=list[s.MeetingRequestOut])
def parent_requests(db: DbSession = Db, actor: Actor = Me):
    return service.parent_requests(db, actor)


@router.post("/parent/meeting-requests", response_model=s.MeetingRequestOut, status_code=201)
def parent_request(body: s.MeetingRequestIn, db: DbSession = Db, actor: Actor = Me):
    return service.parent_request_meeting(db, actor, body)


# ---------------------------------------------------------------- young member
@router.get("/youth/slots", response_model=list[str])
def youth_slots(db: DbSession = Db, actor: Actor = Me):
    return [t.isoformat() for t in service.youth_slots(db, actor)]


@router.get("/youth/appointments", response_model=list[s.AppointmentOut])
def youth_appointments(db: DbSession = Db, actor: Actor = Me):
    return service.youth_appointments(db, actor)


@router.post("/youth/appointments", response_model=s.AppointmentOut, status_code=201)
def youth_book(body: s.YouthBooking, db: DbSession = Db, actor: Actor = Me):
    return service.youth_book(db, actor, body)


@router.post("/youth/appointments/{appointment_id}/cancel", status_code=204)
def youth_cancel(appointment_id: int, db: DbSession = Db, actor: Actor = Me):
    service.youth_cancel(db, actor, appointment_id)
