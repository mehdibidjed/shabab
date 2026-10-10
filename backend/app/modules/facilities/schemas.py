import datetime as dt

from pydantic import BaseModel, ConfigDict


class FacilityOut(BaseModel):
    id: int
    code: str
    name_ar: str
    name_fr: str
    type: str
    office: str  # "opow" | "odej"
    path: str
    status: str
    capacity: int
    commune_ar: str
    commune_fr: str
    lat: float
    lng: float
    members: int
    activities_30d: int
    occupancy_30d: float  # 0..100


class StaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name_ar: str
    full_name_fr: str
    position: str
    reports_to_id: int | None


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title_ar: str
    title_fr: str
    category: str
    date: dt.date
    attendees: int


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    space: str
    date: dt.date
    slot: str
    requester: str


class MemberStats(BaseModel):
    total: int
    active: int
    male: int
    female: int
    age_bands: dict[str, int]


class FacilityDetail(FacilityOut):
    office_name_ar: str
    office_name_fr: str
    staff: list[StaffOut]
    member_stats: MemberStats
    recent_activities: list[ActivityOut]
    upcoming_bookings: list[BookingOut]
