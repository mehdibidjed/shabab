"""Module 2 seed: fictional cases only, generic wording, no realistic disorder
descriptions (CLAUDE.md). Uses its own RNG so the rest of the seed is unchanged."""
import datetime as dt
import json
import random

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.modules.activities.models import Activity, ActivityAttendance
from app.modules.facilities.models import Facility, Staff
from app.modules.members.models import Member
from app.modules.org.models import OrgUnit
from app.modules.psych.alerts import WINDOW_DAYS, run_attendance_alerts
from app.modules.psych.models import (
    Alert,
    Appointment,
    Assessment,
    CaseFile,
    FollowUpPlan,
    Guidance,
    ParentReport,
    PreventiveProgram,
    Referral,
)
from app.modules.psych.models import Session as CounselingSession
from app.modules.psych.service import publish_program

prng = random.Random(99)

SESSION_NOTES = [
    "حصة استماع أولى. عبّر الشاب عن ضغط مرتبط بالدراسة وتنظيم الوقت. تم الاتفاق على مواعيد منتظمة.",
    "حصة متابعة. تحسن في تنظيم الوقت. نواصل العمل على مهارات التعامل مع الضغط.",
    "حصة متابعة. تم التطرق إلى العلاقات مع الأقران. الشاب متعاون ومنخرط في الحوار.",
    "مراجعة الأهداف المتفق عليها. التقدم مرضٍ، مع تشجيعه على المشاركة في النشاطات الجماعية.",
    "حصة متابعة. تم تقييم الأسابيع الأخيرة بشكل إيجابي. اقتراح تباعد المواعيد.",
]
PLAN = ("الأهداف:\n- تحسين تنظيم الوقت\n- تعزيز الثقة بالنفس والتواصل مع الأقران\n"
        "الإجراءات:\n- حصة متابعة كل أسبوعين\n- المشاركة في ورشة «إدارة الضغط»\n- تقييم مرحلي بعد شهرين")
FORMS = [("مقياس الضغط المدرك (نسخة تجريبية)", 40), ("استبيان التكيف الاجتماعي (تجريبي)", 30)]
PARENT_SUMMARIES = [
    "يحضر ابنكم الحصص بانتظام ويُظهر تعاونًا جيدًا. ننصح بتشجيعه على المشاركة في نشاطات دار الشباب.",
    "نلاحظ تطورًا إيجابيًا في تنظيم الوقت. نقترح الحفاظ على روتين نوم منتظم خلال فترة الامتحانات.",
    "مسودة: ملخص الفترة القادمة (غير مُرسل بعد).",
]
GUIDANCE = [
    "يُنصح بإشراكه في نشاطات جماعية صغيرة وتكليفه بمهام بسيطة تعزز ثقته بنفسه، مع تجنب مقارنته بزملائه أمام الآخرين.",
    "عند التوتر، يُفضّل منحه وقتًا قصيرًا للهدوء ثم الحديث معه على انفراد بنبرة هادئة، وتثمين أي سلوك إيجابي مباشرة.",
    "يُنصح بالحفاظ على تواصل منتظم معه وتشجيعه على المبادرة دون ضغط، وإبلاغي بأي تغيّر ملحوظ.",
]
REFERRALS = [
    ("isolation", "يلاحَظ انعزاله عن المجموعة خلال الورشات الأخيرة وقلة تفاعله مع زملائه.", False),
    ("behavior", "انفعال شديد ومشادات متكررة مع زملائه خلال حصة الرياضة هذا الأسبوع.", True),
    ("school", "يذكر صعوبات في التركيز والدراسة ويبدو قلقًا بشأن الامتحانات.", False),
    ("stress", "يبدو متعبًا ومتوترًا في الآونة الأخيرة ويغيب عن بعض النشاطات.", False),
    ("family", "أشار إلى ظروف عائلية صعبة ويطلب التحدث مع شخص مختص.", False),
]


def _facility(db: DbSession, code: str) -> Facility:
    return db.scalar(select(Facility).join(OrgUnit, OrgUnit.id == Facility.org_unit_id).where(OrgUnit.code == code))


def _at(day: dt.date, hour: int) -> dt.datetime:
    return dt.datetime.combine(day, dt.time(hour))


def _workday(day: dt.date) -> dt.date:
    while day.weekday() in (4, 5):  # skip Friday/Saturday
        day += dt.timedelta(days=1)
    return day


DELIBERATE_DROPS = {"dc_constantine_01": 2, "dc_constantine_02": 1}


def seed_attendance(db: DbSession, today: dt.date) -> None:
    """Per-member attendance consistent with engagement; a few deliberate drops in
    the last 4 weeks so the alert job has something to find."""
    codes = dict(db.execute(select(Facility.id, OrgUnit.code).join(OrgUnit, OrgUnit.id == Facility.org_unit_id)).all())
    facility_ids = set(db.scalars(select(Member.facility_id).distinct()))
    drop_after = today - dt.timedelta(days=WINDOW_DAYS)
    for fac_id in sorted(facility_ids):
        members = list(db.scalars(select(Member).where(Member.facility_id == fac_id).order_by(Member.id)))
        rate = {m.id: prng.uniform(0.4, 0.7) if m.active else prng.uniform(0.05, 0.12) for m in members}
        eligible = [m for m in members if m.active and m.demo_key is None and rate[m.id] > 0.5]
        dropping = {m.id for m in prng.sample(eligible, k=DELIBERATE_DROPS.get(codes[fac_id], 0))}
        acts = db.scalars(select(Activity).where(Activity.facility_id == fac_id, Activity.date <= today,
                                                 Activity.category != "prevention").order_by(Activity.date))
        for a in acts:
            for m in members:
                if m.joined_at > a.date:
                    continue
                p = rate[m.id] * (0.1 if m.id in dropping and a.date > drop_after else 1)
                if prng.random() < p:
                    db.add(ActivityAttendance(activity_id=a.id, member_id=m.id, date=a.date))
    db.flush()


def seed_psych(db: DbSession, today: dt.date) -> dict[str, int]:
    dc01, dc02 = _facility(db, "dc_constantine_01"), _facility(db, "dc_constantine_02")

    # --- psychologists inside the Dar Chabab (reporting to the director)
    psy = {}
    for fac, key, ar, fr in [(dc01, "psy_dc01", "سلمى بن جدو", "Selma Bendjeddou"),
                             (dc02, "psy_dc02", "كريم لعرابي", "Karim Laarabi")]:
        director = db.scalar(select(Staff).where(Staff.facility_id == fac.id, Staff.position == "director"))
        psy[fac.id] = Staff(full_name_ar=ar, full_name_fr=fr, position="psychologist", reports_to_id=director.id,
                            facility_id=fac.id, org_path=fac.org_path, demo_key=key)
        db.add(psy[fac.id])
    db.flush()

    # --- demo-user links: educator, a minor child (parent account), a young adult member
    educators = list(db.scalars(select(Staff).where(Staff.facility_id == dc01.id, Staff.position == "educator")
                                .order_by(Staff.id)))
    educators[0].demo_key = "edu_dc01"
    dc01_members = list(db.scalars(select(Member).where(Member.facility_id == dc01.id, Member.active).order_by(Member.id)))
    child = next(m for m in dc01_members if 13 <= m.age <= 15)
    child.demo_key = "child_dc01"
    youth = next(m for m in dc01_members if 19 <= m.age <= 24)
    youth.demo_key = "youth_dc01"
    db.flush()

    seed_attendance(db, today)

    # --- preventive programs (dc01)
    programs = [
        ("addiction", "الوقاية من الإدمان", "Prévention des addictions",
         "سلسلة لقاءات تفاعلية حول مخاطر التدخين والمخدرات ومهارات قول «لا».", today - dt.timedelta(days=14), 6, True),
        ("stress", "إدارة الضغط النفسي", "Gestion du stress",
         "ورشات عملية لتعلم تقنيات الاسترخاء وتنظيم الوقت خلال فترة الامتحانات.", today + dt.timedelta(days=3), 4, True),
        ("behavior", "التوجيه السلوكي والتواصل", "Orientation comportementale et communication",
         "لقاءات حول التواصل الإيجابي وحل النزاعات بين الأقران.", today + dt.timedelta(days=21), 5, False),
    ]
    for theme, ar, fr, desc, start, n, published in programs:
        p = PreventiveProgram(facility_id=dc01.id, org_path=dc01.org_path, owner_staff_id=psy[dc01.id].id, theme=theme,
                              title_ar=ar, title_fr=fr, description_ar=desc, start_date=start, sessions_count=n)
        db.add(p)
        db.flush()
        if published:
            publish_program(db, p, attendees_for_past=prng.randint(18, 30))

    # --- case files: 8 for the dc01 psychologist, 4 for dc02
    n_cases = 0

    def new_case(fac, subject: Member | None = None, staff: Staff | None = None, *, origin, status="follow_up",
                 consent=True, n_sessions=3, opened_days_ago=90):
        nonlocal n_cases
        n_cases += 1
        minor = bool(subject and subject.age < 18)
        opened = today - dt.timedelta(days=opened_days_ago)
        c = CaseFile(code=f"PS-{n_cases:04d}", facility_id=fac.id, org_path=fac.org_path, owner_staff_id=psy[fac.id].id,
                     subject_member_id=subject.id if subject else None, subject_staff_id=staff.id if staff else None,
                     is_minor=minor, status=status, origin=origin, opened_at=opened,
                     closed_at=today - dt.timedelta(days=10) if status == "closed" else None)
        if minor and consent:
            c.guardian_consent_at = dt.datetime.combine(opened, dt.time(10))
            c.guardian_name = "وليّ أمر تجريبي"
        db.add(c)
        db.flush()
        if minor and not consent:
            return c  # no notes until consent is recorded
        step = max(7, opened_days_ago // max(n_sessions, 1))
        for i in range(n_sessions):
            db.add(CounselingSession(case_id=c.id, date=opened + dt.timedelta(days=i * step + 1),
                                     duration_min=prng.choice((30, 45, 60)), notes=SESSION_NOTES[i % len(SESSION_NOTES)]))
        for j, (form, mx) in enumerate(FORMS[: 1 + (n_sessions > 2)]):
            db.add(Assessment(case_id=c.id, date=opened + dt.timedelta(days=2 + 30 * j), form_name=form,
                              score=prng.randint(mx // 4, 3 * mx // 4), max_score=mx,
                              answers=json.dumps({f"q{k}": prng.randint(0, 4) for k in range(1, 11)})))
        db.add(FollowUpPlan(case_id=c.id, content=PLAN, review_date=today + dt.timedelta(days=30)))
        return c

    others = [m for m in dc01_members if m.demo_key is None]
    minors = [m for m in others if m.age < 18]
    adults = [m for m in others if m.age >= 18]
    child_case = new_case(dc01, child, origin="parent", n_sessions=4, opened_days_ago=75)
    for k, summary in enumerate(PARENT_SUMMARIES):
        shared = k < 2
        db.add(ParentReport(case_id=child_case.id, period=(today - dt.timedelta(days=60 - 30 * k)).strftime("%Y-%m"),
                            summary=summary, shared=shared,
                            shared_at=dt.datetime.combine(today - dt.timedelta(days=55 - 30 * k), dt.time(12)) if shared else None))
    pending = new_case(dc01, minors[0], origin="referral", status="open", consent=False, opened_days_ago=3)
    new_case(dc01, minors[1], origin="referral", n_sessions=5, opened_days_ago=120)
    new_case(dc01, minors[2], origin="alert", status="open", n_sessions=2, opened_days_ago=20)
    new_case(dc01, adults[0], origin="self", n_sessions=3, opened_days_ago=60)
    new_case(dc01, adults[1], origin="self", status="closed", n_sessions=5, opened_days_ago=150)
    worker = db.scalar(select(Staff).where(Staff.facility_id == dc01.id, Staff.position == "professional_worker"))
    new_case(dc01, staff=worker, origin="self", n_sessions=2, opened_days_ago=40)
    new_case(dc01, minors[3], origin="referral", status="open", n_sessions=1, opened_days_ago=8)
    dc02_members = [m for m in db.scalars(select(Member).where(Member.facility_id == dc02.id, Member.active).order_by(Member.id))]
    for i, m in enumerate(dc02_members[:4]):
        new_case(dc02, m, origin=("self", "referral", "alert", "self")[i], n_sessions=2 + i, opened_days_ago=30 + 20 * i)

    # --- referrals from dc01 educators, some with guidance
    refs = []
    for i, (cat, text, aggressive) in enumerate(REFERRALS):
        member = minors[0] if i == 0 else minors[4 + i]
        r = Referral(facility_id=dc01.id, org_path=dc01.org_path, from_staff_id=educators[i % 2].id, member_id=member.id,
                     category=cat, observation=text, aggressive_behavior=aggressive,
                     status=("received", "sent", "received", "sent", "closed")[i],
                     created_at=dt.datetime.combine(today - dt.timedelta(days=(4, 1, 12, 2, 30)[i]), dt.time(11)),
                     case_id=pending.id if i == 0 else None)
        db.add(r)
        refs.append(r)
    db.flush()
    for r, text in [(refs[0], GUIDANCE[0]), (refs[2], GUIDANCE[2]), (refs[4], GUIDANCE[1])]:
        db.add(Guidance(referral_id=r.id, from_staff_id=psy[dc01.id].id, text=text,
                        created_at=r.created_at + dt.timedelta(days=1)))

    # --- appointments: agenda for the coming days (+ a few done this month)
    def appt(fac, member, kind, by, day, hour, status):
        db.add(Appointment(facility_id=fac.id, org_path=fac.org_path, psychologist_staff_id=psy[fac.id].id,
                           member_id=member.id if member else None, requested_by=by, type=kind,
                           starts_at=_at(_workday(day), hour), status=status))

    appt(dc01, youth, "listening", "youth", today + dt.timedelta(days=2), 10, "requested")
    appt(dc01, child, "follow_up", "psychologist", today + dt.timedelta(days=1), 9, "confirmed")
    appt(dc01, child, "parent_meeting", "parent", today + dt.timedelta(days=4), 14, "confirmed")
    appt(dc01, minors[1], "follow_up", "psychologist", today + dt.timedelta(days=3), 11, "confirmed")
    appt(dc01, adults[0], "follow_up", "psychologist", today + dt.timedelta(days=6), 15, "confirmed")
    appt(dc01, minors[2], "follow_up", "psychologist", today - dt.timedelta(days=3), 10, "done")
    appt(dc02, dc02_members[0], "follow_up", "psychologist", today + dt.timedelta(days=2), 9, "confirmed")
    appt(dc02, dc02_members[1], "listening", "youth", today + dt.timedelta(days=5), 11, "requested")

    # --- alerts: educator flag (aggressive behavior), parent request, then the attendance job
    db.add(Alert(facility_id=dc01.id, org_path=dc01.org_path, member_id=refs[1].member_id, type="educator_flag",
                 details=f"referral:{refs[1].id}", created_at=refs[1].created_at))
    db.add(Alert(facility_id=dc01.id, org_path=dc01.org_path, member_id=child.id, type="parent_request",
                 details="reason:follow_up;preferred:afternoon",
                 created_at=dt.datetime.combine(today - dt.timedelta(days=1), dt.time(18))))
    db.commit()
    created = run_attendance_alerts(db, today)

    return {"cases": n_cases, "referrals": len(refs), "attendance_alerts": len(created),
            "attendance_rows": db.query(ActivityAttendance).count()}
