from collections import Counter
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.pagination import Page, PageParams
from app.core.dates import month_start
from app.core.scope import Scope
from app.modules.facilities.models import Facility
from app.modules.members.models import AGE_BANDS, Member
from app.modules.members.schemas import FacilityCount, MemberOut, MembersStats, MonthCount
from app.modules.org.models import OrgUnit



def list_members(
    db: Session, scope: Scope, params: PageParams, *, facility_id: int | None, gender: str | None,
    age_band: str | None, status: str | None, q: str | None,
) -> Page[MemberOut]:
    conds = [scope.filter(Member.org_path)]
    if facility_id:
        conds.append(Member.facility_id == facility_id)
    if gender in ("m", "f"):
        conds.append(Member.gender == gender)
    band = next((b for b in AGE_BANDS if b[0] == age_band), None)
    if band:
        conds.append(Member.age.between(band[1], band[2]))
    if status in ("active", "inactive"):
        conds.append(Member.active.is_(status == "active"))
    if q and q.strip():
        like = f"%{q.strip()}%"
        conds.append(or_(Member.full_name_ar.ilike(like), Member.full_name_fr.ilike(like), Member.member_no.ilike(like)))

    total = db.scalar(select(func.count()).select_from(Member).where(*conds)) or 0
    rows = db.execute(
        select(Member, OrgUnit.name_ar, OrgUnit.name_fr, OrgUnit.type)
        .join(Facility, Facility.id == Member.facility_id)
        .join(OrgUnit, OrgUnit.id == Facility.org_unit_id)
        .where(*conds)
        .order_by(Member.joined_at.desc(), Member.id.desc())
        .offset(params.offset).limit(params.page_size)
    ).all()
    items = [
        MemberOut(
            id=m.id, member_no=m.member_no, full_name_ar=m.full_name_ar, full_name_fr=m.full_name_fr, age=m.age,
            gender=m.gender, joined_at=m.joined_at, active=m.active, facility_id=m.facility_id,
            facility_name_ar=name_ar, facility_name_fr=name_fr, facility_type=type_,
        )
        for m, name_ar, name_fr, type_ in rows
    ]
    return Page(items=items, total=total, page=params.page, page_size=params.page_size)


def members_stats(db: Session, scope: Scope) -> MembersStats:
    today = date.today()
    members = db.execute(
        select(Member.age, Member.gender, Member.joined_at, Member.active).where(scope.filter(Member.org_path))
    ).all()
    active = [m for m in members if m.active]
    start = month_start(today, 11)
    joined = Counter(m.joined_at.strftime("%Y-%m") for m in members if m.joined_at >= start)

    by_facility = db.execute(
        select(Facility.id, OrgUnit.name_ar, OrgUnit.name_fr, OrgUnit.type, func.count(Member.id))
        .join(OrgUnit, OrgUnit.id == Facility.org_unit_id)
        .join(Member, Member.facility_id == Facility.id)
        .where(scope.filter(Member.org_path), Member.active)
        .group_by(Facility.id, OrgUnit.name_ar, OrgUnit.name_fr, OrgUnit.type)
        .order_by(func.count(Member.id).desc())
    ).all()

    return MembersStats(
        total=len(members),
        active=len(active),
        new_this_month=sum(m.joined_at >= month_start(today) for m in members),
        male=sum(m.gender == "m" for m in active),
        female=sum(m.gender == "f" for m in active),
        age_bands={label: sum(lo <= m.age <= hi for m in active) for label, lo, hi in AGE_BANDS},
        new_per_month=[
            MonthCount(month=(k := month_start(today, i).strftime("%Y-%m")), count=joined.get(k, 0))
            for i in range(11, -1, -1)
        ],
        by_facility=[FacilityCount(facility_id=i, name_ar=a, name_fr=f, type=t, count=c) for i, a, f, t, c in by_facility],
    )
