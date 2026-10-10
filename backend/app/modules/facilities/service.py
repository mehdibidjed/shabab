from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.scope import Scope
from app.modules.activities.models import Activity, Booking
from app.modules.facilities.models import Facility, Staff
from app.modules.facilities.schemas import FacilityDetail, FacilityOut, MemberStats
from app.modules.members.models import AGE_BANDS, Member
from app.modules.org.models import OrgUnit

SLOTS_PER_DAY = 3


def _summaries(db: Session, scope: Scope, type_: str | None = None) -> list[FacilityOut]:
    q = select(Facility).where(scope.filter(Facility.org_path)).join(Facility.org_unit).order_by(OrgUnit.path)
    if type_:
        q = q.where(OrgUnit.type == type_)
    facilities = db.scalars(q).all()

    since = date.today() - timedelta(days=29)
    members = dict(db.execute(select(Member.facility_id, func.count())
                              .where(scope.filter(Member.org_path), Member.active).group_by(Member.facility_id)).all())
    activities = dict(db.execute(select(Activity.facility_id, func.count())
                                 .where(scope.filter(Activity.org_path), Activity.date >= since, Activity.date <= date.today())
                                 .group_by(Activity.facility_id)).all())
    bookings = dict(db.execute(select(Booking.facility_id, func.count())
                               .where(scope.filter(Booking.org_path), Booking.date >= since, Booking.date <= date.today())
                               .group_by(Booking.facility_id)).all())

    out = []
    for f in facilities:
        slots = f.bookable_spaces * SLOTS_PER_DAY * 30
        out.append(FacilityOut(
            id=f.id, code=f.org_unit.code, name_ar=f.org_unit.name_ar, name_fr=f.org_unit.name_fr,
            type=f.org_unit.type, office=f.org_path.split(".")[1], path=f.org_path, status=f.status,
            capacity=f.capacity, commune_ar=f.commune_ar, commune_fr=f.commune_fr, lat=f.lat, lng=f.lng,
            members=members.get(f.id, 0), activities_30d=activities.get(f.id, 0),
            occupancy_30d=round(100 * bookings.get(f.id, 0) / slots, 1) if slots else 0.0,
        ))
    return out


def list_facilities(db: Session, scope: Scope, type_: str | None) -> list[FacilityOut]:
    return _summaries(db, scope, type_)


def get_facility(db: Session, scope: Scope, facility_id: int) -> FacilityDetail:
    fac = db.get(Facility, facility_id)
    # Out-of-scope facilities are reported as missing, not forbidden, to avoid leaking existence.
    if fac is None or not scope.contains(fac.org_path):
        raise HTTPException(status_code=404, detail="Facility not found")

    summary = next(s for s in _summaries(db, scope) if s.id == fac.id)
    office = db.get(OrgUnit, fac.org_unit.parent_id)
    staff = db.scalars(select(Staff).where(Staff.facility_id == fac.id).order_by(Staff.id)).all()
    members = db.scalars(select(Member).where(Member.facility_id == fac.id)).all()
    active = [m for m in members if m.active]
    stats = MemberStats(
        total=len(members), active=len(active),
        male=sum(m.gender == "m" for m in active), female=sum(m.gender == "f" for m in active),
        age_bands={label: sum(lo <= m.age <= hi for m in active) for label, lo, hi in AGE_BANDS},
    )
    recent = db.scalars(select(Activity).where(Activity.facility_id == fac.id, Activity.date <= date.today())
                        .order_by(Activity.date.desc()).limit(8)).all()
    upcoming = db.scalars(select(Booking).where(Booking.facility_id == fac.id, Booking.date >= date.today())
                          .order_by(Booking.date, Booking.slot).limit(6)).all()
    return FacilityDetail(
        **summary.model_dump(),
        office_name_ar=office.name_ar, office_name_fr=office.name_fr,
        staff=staff, member_stats=stats,
        recent_activities=recent, upcoming_bookings=upcoming,
    )
