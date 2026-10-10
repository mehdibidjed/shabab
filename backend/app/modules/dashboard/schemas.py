from pydantic import BaseModel


class Kpis(BaseModel):
    facilities: int
    facilities_active: int
    active_members: int
    new_members_this_month: int
    activities_this_month: int
    activities_last_month_same_period: int
    occupancy_pct: float  # month to date
    occupancy_last_month_pct: float


class MonthPoint(BaseModel):
    month: str  # "YYYY-MM"
    new_members: int
    total_members: int
    activities: int


class CategoryPoint(BaseModel):
    category: str
    activities: int
    attendees: int


class TypePoint(BaseModel):
    type: str
    count: int


class Trends(BaseModel):
    months: list[MonthPoint]
    activities_by_category: list[CategoryPoint]
    facilities_by_type: list[TypePoint]
