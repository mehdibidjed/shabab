import datetime as dt

from pydantic import BaseModel


class MemberOut(BaseModel):
    id: int
    member_no: str
    full_name_ar: str
    full_name_fr: str
    age: int
    gender: str
    joined_at: dt.date
    active: bool
    facility_id: int
    facility_name_ar: str
    facility_name_fr: str
    facility_type: str


class MonthCount(BaseModel):
    month: str  # "YYYY-MM"
    count: int


class FacilityCount(BaseModel):
    facility_id: int
    name_ar: str
    name_fr: str
    type: str
    count: int


class MembersStats(BaseModel):
    total: int
    active: int
    new_this_month: int
    male: int  # active members only, like the age bands
    female: int
    age_bands: dict[str, int]
    new_per_month: list[MonthCount]  # last 12 months
    by_facility: list[FacilityCount]  # active members, facilities with members only
