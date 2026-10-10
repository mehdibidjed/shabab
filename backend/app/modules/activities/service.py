from collections import defaultdict
from datetime import date, timedelta
from statistics import median

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.dates import month_key, month_start
from app.core.pagination import Page, PageParams
from app.core.scope import Scope
from app.modules.activities.models import CATEGORIES, Activity
from app.modules.activities.schemas import ActivitiesStats, ActivityRow, CategoryPoint, FacilityPoint, MonthPoint
from app.modules.facilities.models import Facility
from app.modules.org.models import OrgUnit


def list_activities(
    db: Session, scope: Scope, params: PageParams, *, category: str | None, facility_id: int | None,
    month: str | None, q: str | None,
) -> Page[ActivityRow]:
    conds = [scope.filter(Activity.org_path), Activity.date <= date.today()]
    if category in CATEGORIES:
        conds.append(Activity.category == category)
    if facility_id:
        conds.append(Activity.facility_id == facility_id)
    if month:
        y, m = map(int, month.split("-"))
        start = date(y, m, 1)
        conds += [Activity.date >= start, Activity.date < month_start(start.replace(day=28) + timedelta(days=4))]
    if q and q.strip():
        like = f"%{q.strip()}%"
        conds.append(or_(Activity.title_ar.ilike(like), Activity.title_fr.ilike(like)))

    total = db.scalar(select(func.count()).select_from(Activity).where(*conds)) or 0
    rows = db.execute(
        select(Activity, OrgUnit.name_ar, OrgUnit.name_fr, OrgUnit.type)
        .join(Facility, Facility.id == Activity.facility_id)
        .join(OrgUnit, OrgUnit.id == Facility.org_unit_id)
        .where(*conds)
        .order_by(Activity.date.desc(), Activity.id.desc())
        .offset(params.offset).limit(params.page_size)
    ).all()
    items = [
        ActivityRow(
            id=a.id, title_ar=a.title_ar, title_fr=a.title_fr, category=a.category, date=a.date,
            attendees=a.attendees, facility_id=a.facility_id, facility_name_ar=name_ar, facility_name_fr=name_fr,
            facility_type=type_,
        )
        for a, name_ar, name_fr, type_ in rows
    ]
    return Page(items=items, total=total, page=params.page, page_size=params.page_size)


def activities_stats(db: Session, scope: Scope, months: int = 6) -> ActivitiesStats:
    today = date.today()
    start = month_start(today, months - 1)
    this_month, last_month = month_start(today), month_start(today, 1)
    last_month_same_day = min(last_month + (today - this_month), this_month - timedelta(days=1))

    rows = db.execute(
        select(Activity.date, Activity.category, Activity.attendees, Activity.facility_id)
        .where(scope.filter(Activity.org_path), Activity.date >= min(start, last_month), Activity.date <= today)
    ).all()
    in_window = [r for r in rows if r.date >= start]

    per_month = defaultdict(lambda: [0, 0])
    per_cat = defaultdict(lambda: [0, 0])
    per_fac = defaultdict(int)
    for r in in_window:
        per_month[month_key(r.date)][0] += 1
        per_month[month_key(r.date)][1] += r.attendees
        per_cat[r.category][0] += 1
        per_cat[r.category][1] += r.attendees
        per_fac[r.facility_id] += 1

    names = {
        f_id: (a, f, t)
        for f_id, a, f, t in db.execute(
            select(Facility.id, OrgUnit.name_ar, OrgUnit.name_fr, OrgUnit.type)
            .join(OrgUnit, OrgUnit.id == Facility.org_unit_id)
            .where(Facility.id.in_(per_fac.keys()))
        ).all()
    }

    return ActivitiesStats(
        this_month=sum(r.date >= this_month for r in rows),
        last_month_same_period=sum(last_month <= r.date <= last_month_same_day for r in rows),
        attendees_this_month=sum(r.attendees for r in rows if r.date >= this_month),
        median_attendees=int(median(r.attendees for r in in_window)) if in_window else 0,
        months=[
            MonthPoint(month=(k := month_key(month_start(today, i))), activities=per_month[k][0], attendees=per_month[k][1])
            for i in range(months - 1, -1, -1)
        ],
        by_category=sorted(
            (CategoryPoint(category=c, activities=per_cat[c][0], attendees=per_cat[c][1]) for c in CATEGORIES if per_cat[c][0]),
            key=lambda p: -p.activities,
        ),
        by_facility=sorted(
            (FacilityPoint(facility_id=i, name_ar=names[i][0], name_fr=names[i][1], type=names[i][2], activities=n)
             for i, n in per_fac.items()),
            key=lambda p: -p.activities,
        ),
    )
