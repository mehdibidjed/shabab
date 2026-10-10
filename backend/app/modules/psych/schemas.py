"""Response/request shapes. Separate schemas per audience make the privacy rules
structural: e.g. `ReferralForEducator` and `GuidanceOut` simply have no field
that could carry clinical content or a case id."""
import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Count = int | Literal["<5"]


# ---------------------------------------------------------------- shared
class PersonRef(BaseModel):
    kind: Literal["member", "staff"]
    id: int
    name_ar: str
    name_fr: str
    age: int | None = None
    facility_id: int


class MemberLookup(BaseModel):
    id: int
    member_no: str
    full_name_ar: str
    full_name_fr: str
    age: int


# ---------------------------------------------------------------- psychologist
class AlertOut(BaseModel):
    id: int
    type: str
    status: str
    details: str
    created_at: dt.datetime
    member: PersonRef
    open_case_id: int | None  # an existing case of this psychologist for the member


class AlertUpdate(BaseModel):
    status: Literal["acknowledged", "closed"]


class CaseSummary(BaseModel):
    id: int
    code: str
    subject: PersonRef
    is_minor: bool
    consent_recorded: bool
    status: str
    origin: str
    opened_at: dt.date
    sessions: int
    last_session: dt.date | None


class CaseDetail(CaseSummary):
    guardian_name: str | None
    guardian_consent_at: dt.datetime | None
    closed_at: dt.date | None
    transferred_from: str | None


class CaseCreate(BaseModel):
    member_id: int | None = None
    staff_id: int | None = None
    origin: Literal["referral", "alert", "self", "parent"] = "self"
    referral_id: int | None = None
    alert_id: int | None = None


class CaseUpdate(BaseModel):
    status: Literal["open", "follow_up", "closed"]


class ConsentIn(BaseModel):
    guardian_name: str = Field(min_length=3, max_length=150)


class TransferIn(BaseModel):
    to_staff_id: int


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: dt.date
    duration_min: int
    notes: str


class SessionIn(BaseModel):
    date: dt.date
    duration_min: int = Field(45, ge=10, le=180)
    notes: str = Field(min_length=3, max_length=5000)


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: dt.date
    form_name: str
    score: int
    max_score: int
    answers: str  # JSON


class AssessmentIn(BaseModel):
    date: dt.date
    form_name: str = Field(min_length=2, max_length=100)
    score: int = Field(ge=0)
    max_score: int = Field(gt=0)
    answers: str = Field("{}", max_length=5000)


class PlanOut(BaseModel):
    content: str
    review_date: dt.date | None
    updated_at: dt.datetime | None


class PlanIn(BaseModel):
    content: str = Field(max_length=5000)
    review_date: dt.date | None = None


class ParentReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    period: str
    summary: str
    shared: bool
    shared_at: dt.datetime | None
    created_at: dt.datetime


class ParentReportIn(BaseModel):
    period: str = Field(min_length=4, max_length=32)
    summary: str = Field(min_length=3, max_length=3000)
    shared: bool = True


class AccessLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_key: str
    role: str
    action: str
    at: dt.datetime


# ---------------------------------------------------------------- referrals & guidance
class GuidanceOut(BaseModel):
    """Pedagogical guidance: how to accompany the young person. Text only."""

    id: int
    text: str
    created_at: dt.datetime
    from_name_ar: str
    from_name_fr: str


class GuidanceIn(BaseModel):
    text: str = Field(min_length=3, max_length=2000)


class ReferralForEducator(BaseModel):
    id: int
    member: PersonRef
    category: str
    observation: str
    aggressive_behavior: bool
    status: str  # sent | received | closed — "received" is all the educator learns
    created_at: dt.datetime
    guidance: list[GuidanceOut]


class ReferralForPsychologist(ReferralForEducator):
    from_name_ar: str
    from_name_fr: str
    case_id: int | None


class ReferralIn(BaseModel):
    member_id: int
    category: Literal["behavior", "isolation", "school", "family", "stress", "other"]
    observation: str = Field(min_length=10, max_length=1000)
    aggressive_behavior: bool = False


# ---------------------------------------------------------------- appointments & programs
class AppointmentOut(BaseModel):
    id: int
    type: str
    status: str
    starts_at: dt.datetime
    requested_by: str
    with_person: PersonRef | None  # omitted for the young member's own view
    note: str | None


class AppointmentIn(BaseModel):
    member_id: int | None = None
    type: Literal["listening", "follow_up", "parent_meeting"] = "follow_up"
    starts_at: dt.datetime
    note: str | None = Field(None, max_length=300)


class AppointmentUpdate(BaseModel):
    status: Literal["confirmed", "done", "cancelled"]


class YouthBooking(BaseModel):
    starts_at: dt.datetime


class ProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    theme: str
    title_ar: str
    title_fr: str
    description_ar: str
    start_date: dt.date
    sessions_count: int
    every_days: int
    status: str
    published_at: dt.datetime | None


class ProgramIn(BaseModel):
    theme: Literal["addiction", "stress", "behavior"]
    title_ar: str = Field(min_length=3, max_length=200)
    title_fr: str = Field(min_length=3, max_length=200)
    description_ar: str = Field("", max_length=2000)
    start_date: dt.date
    sessions_count: int = Field(ge=1, le=20)
    every_days: int = Field(7, ge=1, le=31)


class CalendarItem(BaseModel):
    activity_id: int
    date: dt.date
    title_ar: str
    title_fr: str
    theme: str | None


# ---------------------------------------------------------------- parent
class ChildOut(BaseModel):
    first_name_ar: str
    first_name_fr: str
    facility_name_ar: str
    facility_name_fr: str


class SharedReport(BaseModel):
    id: int
    period: str
    summary: str
    shared_at: dt.datetime
    psychologist_name_ar: str
    psychologist_name_fr: str


class MeetingRequestIn(BaseModel):
    reason: Literal["worried", "follow_up", "other"] = "follow_up"
    preferred: Literal["morning", "afternoon", "any"] = "any"


class MeetingRequestOut(BaseModel):
    id: int
    status: str
    created_at: dt.datetime


# ---------------------------------------------------------------- aggregated stats
class MonthCount(BaseModel):
    month: str
    count: Count


class CategoryCount(BaseModel):
    category: str
    count: Count


class PsychStats(BaseModel):
    """Anonymous aggregates only: no names, ids or case codes. Counts 1-4 -> "<5"."""

    active_cases: Count
    new_cases_this_month: Count
    sessions_per_month: list[MonthCount]
    referrals_by_category: list[CategoryCount]
    appointments_this_month: Count
    open_alerts: Count
    programs_published: int  # programs are public activities, not about individuals
    prevention_sessions_upcoming: int
