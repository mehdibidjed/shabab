import datetime as dt

from pydantic import BaseModel


class ActivityRow(BaseModel):
    id: int
    title_ar: str
    title_fr: str
    category: str
    date: dt.date
    attendees: int
    facility_id: int
    facility_name_ar: str
    facility_name_fr: str
    facility_type: str


class MonthPoint(BaseModel):
    month: str  # "YYYY-MM"
    activities: int
    attendees: int


class CategoryPoint(BaseModel):
    category: str
    activities: int
    attendees: int


class FacilityPoint(BaseModel):
    facility_id: int
    name_ar: str
    name_fr: str
    type: str
    activities: int


class ActivitiesStats(BaseModel):
    this_month: int
    last_month_same_period: int
    attendees_this_month: int
    median_attendees: int  # over 6 months; the median resists stadium events
    months: list[MonthPoint]  # last 6 months
    by_category: list[CategoryPoint]  # last 6 months
    by_facility: list[FacilityPoint]  # last 6 months, most active first
