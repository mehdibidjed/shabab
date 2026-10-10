"""Attendance-drop alert job.

Flags members whose attendance over the last 4 weeks fell by more than 50%
compared with the 4 weeks before. Attendance is measured as a participation
rate — activities attended / activities their facility offered in the window —
so a center that simply ran fewer activities does not flag all its members.
Run from the seed for the prototype; in production this is a nightly job.
"""
import datetime as dt
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.modules.activities.models import Activity, ActivityAttendance
from app.modules.members.models import Member
from app.modules.psych.models import Alert

WINDOW_DAYS = 28
DROP_RATIO = 0.5
MIN_PREVIOUS = 4  # attendances in the previous window; below this a "drop" is noise
MIN_OFFERED = 4  # activities offered in each window; fewer gives too few chances to judge


def run_attendance_alerts(db: DbSession, today: dt.date | None = None) -> list[Alert]:
    today = today or dt.date.today()
    recent_start = today - dt.timedelta(days=WINDOW_DAYS)
    previous_start = recent_start - dt.timedelta(days=WINDOW_DAYS)

    def window(d: dt.date) -> str:
        return "recent" if d > recent_start else "previous"

    attended = Counter(
        (m, window(d)) for m, d in db.execute(
            select(ActivityAttendance.member_id, ActivityAttendance.date)
            .where(ActivityAttendance.date > previous_start, ActivityAttendance.date <= today)))
    offered = Counter(
        (f, window(d)) for f, d in db.execute(
            select(Activity.facility_id, Activity.date)
            .where(Activity.date > previous_start, Activity.date <= today, Activity.category != "prevention")))

    already_open = set(db.scalars(select(Alert.member_id).where(Alert.type == "attendance_drop", Alert.status != "closed")))
    candidates = {m for (m, w), n in attended.items() if w == "previous" and n >= MIN_PREVIOUS} - already_open
    created = []
    for m in db.scalars(select(Member).where(Member.id.in_(candidates), Member.active).order_by(Member.id)):
        before, after = attended[(m.id, "previous")], attended[(m.id, "recent")]
        offered_before, offered_after = offered[(m.facility_id, "previous")], offered[(m.facility_id, "recent")]
        if offered_before < MIN_OFFERED or offered_after < MIN_OFFERED:
            continue  # too little on offer to judge (e.g. facility in maintenance)
        rate_before, rate_after = before / offered_before, after / offered_after
        if rate_after < rate_before * (1 - DROP_RATIO):
            alert = Alert(facility_id=m.facility_id, org_path=m.org_path, member_id=m.id, type="attendance_drop",
                          details=f"previous:{before}/{offered_before};recent:{after}/{offered_after}")
            db.add(alert)
            created.append(alert)
    db.commit()
    return created
