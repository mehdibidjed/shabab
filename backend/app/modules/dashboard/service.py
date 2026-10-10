from collections import Counter
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.scope import Scope
from app.modules.activities.models import CATEGORIES, Activity, Booking
from app.modules.dashboard.schemas import CategoryPoint, Kpis, MonthPoint, Trends, TypePoint
from app.modules.facilities.models import Facility
from app.modules.members.models import Member
from app.modules.org.models import FACILITY_TYPES, OrgUnit

SLOTS_PER_DAY = 3


def _month_start(d: date, back: int = 0) -> date:
    y, m = d.year, d.month - back
    while m <= 0:
        y, m = y - 1, m + 12
    return date(y, m, 1)


def _count(db: Session, model, scope: Scope, *where) -> int:
    return db.scalar(select(func.count()).select_from(model).where(scope.filter(model.org_path), *where)) or 0


def _occupancy(db: Session, scope: Scope, start: date, end: date) -> float:
    """Booked slots / available slots over [start, end] for open facilities."""
    spaces = db.scalar(select(func.coalesce(func.sum(Facility.bookable_spaces), 0))
                       .where(scope.filter(Facility.org_path), Facility.status != "closed")) or 0
    available = spaces * SLOTS_PER_DAY * ((end - start).days + 1)
    booked = _count(db, Booking, scope, Booking.date >= start, Booking.date <= end,
                    Booking.facility_id.in_(select(Facility.id).where(Facility.status != "closed")))
    return round(100 * booked / available, 1) if available else 0.0


def get_kpis(db: Session, scope: Scope) -> Kpis:
    today = date.today()
    this_month = _month_start(today)
    last_month = _month_start(today, 1)
    last_month_end = this_month - timedelta(days=1)
    last_month_same_day = min(last_month + (today - this_month), last_month_end)

    return Kpis(
        facilities=_count(db, Facility, scope),
        facilities_active=_count(db, Facility, scope, Facility.status == "active"),
        active_members=_count(db, Member, scope, Member.active),
        new_members_this_month=_count(db, Member, scope, Member.joined_at >= this_month),
        activities_this_month=_count(db, Activity, scope, Activity.date >= this_month, Activity.date <= today),
        activities_last_month_same_period=_count(db, Activity, scope, Activity.date >= last_month,
                                                 Activity.date <= last_month_same_day),
        occupancy_pct=_occupancy(db, scope, this_month, today),
        occupancy_last_month_pct=_occupancy(db, scope, last_month, last_month_end),
    )


def get_trends(db: Session, scope: Scope, months: int = 6) -> Trends:
    today = date.today()
    start = _month_start(today, months - 1)

    # Month bucketing in Python keeps the query portable (SQLite now, Postgres later).
    joined = Counter(d.strftime("%Y-%m") for d in db.scalars(
        select(Member.joined_at).where(scope.filter(Member.org_path), Member.joined_at >= start)))
    acts = Counter(d.strftime("%Y-%m") for d in db.scalars(
        select(Activity.date).where(scope.filter(Activity.org_path), Activity.date >= start, Activity.date <= today)))

    points = []
    total = _count(db, Member, scope, Member.joined_at < start)
    for i in range(months - 1, -1, -1):
        key = _month_start(today, i).strftime("%Y-%m")
        total += joined.get(key, 0)
        points.append(MonthPoint(month=key, new_members=joined.get(key, 0), total_members=total,
                                 activities=acts.get(key, 0)))

    by_cat = {c: (n, a) for c, n, a in db.execute(
        select(Activity.category, func.count(), func.sum(Activity.attendees))
        .where(scope.filter(Activity.org_path), Activity.date >= start, Activity.date <= today)
        .group_by(Activity.category)).all()}
    categories = sorted(
        (CategoryPoint(category=c, activities=by_cat.get(c, (0, 0))[0], attendees=by_cat.get(c, (0, 0))[1] or 0)
         for c in CATEGORIES), key=lambda p: -p.activities)

    by_type = dict(db.execute(select(OrgUnit.type, func.count()).join(Facility, Facility.org_unit_id == OrgUnit.id)
                              .where(scope.filter(Facility.org_path)).group_by(OrgUnit.type)).all())
    types = [TypePoint(type=t, count=by_type[t]) for t in FACILITY_TYPES if by_type.get(t)]

    return Trends(months=points, activities_by_category=categories, facilities_by_type=types)
