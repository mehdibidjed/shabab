"""Seed a fictional but plausible dataset for the wilaya of Blida.

Run with `python -m app.seed`. Recreates the database from scratch. Dates are
relative to today so the dashboard always shows "this month" data; the random
generator is seeded so numbers are reproducible for a given day.
"""
import random
from datetime import date, timedelta

from app.core.db import Base, SessionLocal, engine
from app.models import Activity, Booking, Facility, Member, OrgUnit, Staff

rng = random.Random(42)
TODAY = date.today()
START = (TODAY.replace(day=1) - timedelta(days=150)).replace(day=1)  # ~6 months back
BOOKING_HORIZON = TODAY + timedelta(days=14)

# ---------------------------------------------------------------- org units
OFFICES = [
    # code, parent, type, name_ar, name_fr
    ("djs", None, "djs", "مديرية الشباب والرياضة لولاية البليدة", "Direction de la Jeunesse et des Sports de Blida"),
    ("opow", "djs", "opow", "ديوان المركب المتعدد الرياضات", "Office du Parc Omnisports de Wilaya (OPOW)"),
    ("odej", "djs", "odej", "ديوان مؤسسات الشباب", "Office des Établissements de Jeunes (ODEJ)"),
]

COMMUNES = {
    "blida": ("البليدة", "Blida", 36.4703, 2.8277),
    "boufarik": ("بوفاريك", "Boufarik", 36.5750, 2.9120),
    "larbaa": ("الأربعاء", "Larbaa", 36.5650, 3.1540),
    "ouled_yaich": ("أولاد يعيش", "Ouled Yaïch", 36.5040, 2.8640),
    "beni_mered": ("بني مراد", "Béni Mered", 36.5230, 2.8600),
    "soumaa": ("الصومعة", "Souma", 36.5180, 2.9050),
    "chrea": ("الشريعة", "Chréa", 36.4250, 2.8780),
    "mouzaia": ("موزاية", "Mouzaïa", 36.4670, 2.6900),
    "bougara": ("بوقرة", "Bougara", 36.5420, 3.0810),
    "el_affroun": ("العفرون", "El Affroun", 36.4700, 2.6250),
    "oued_alleug": ("وادي العلايق", "Oued El Alleug", 36.5550, 2.7900),
}

# code, parent office, type, name_ar, name_fr, commune, capacity, bookable spaces, status
FACILITIES = [
    ("hall_blida", "opow", "hall", "القاعة المتعددة الرياضات - البليدة", "Salle omnisports - Blida", "blida", 1200, 2, "active"),
    ("hall_boufarik", "opow", "hall", "القاعة المتعددة الرياضات - بوفاريك", "Salle omnisports - Boufarik", "boufarik", 800, 2, "active"),
    ("hall_larbaa", "opow", "hall", "القاعة المتعددة الرياضات - الأربعاء", "Salle omnisports - Larbaa", "larbaa", 600, 1, "maintenance"),
    ("field_ouled_yaich", "opow", "proximity_field", "الملعب الجواري - أولاد يعيش", "Terrain de proximité - Ouled Yaïch", "ouled_yaich", 150, 1, "active"),
    ("field_beni_mered", "opow", "proximity_field", "الملعب الجواري - بني مراد", "Terrain de proximité - Béni Mered", "beni_mered", 150, 1, "active"),
    ("field_soumaa", "opow", "proximity_field", "الملعب الجواري - الصومعة", "Terrain de proximité - Souma", "soumaa", 120, 1, "closed"),
    ("stadium_blida", "opow", "stadium", "الملعب الرئيسي لولاية البليدة", "Stade principal de Blida", "blida", 25000, 1, "active"),
    ("hostel_chrea", "odej", "youth_hostel", "بيت الشباب - الشريعة", "Auberge de jeunes - Chréa", "chrea", 80, 1, "active"),
    ("hostel_mouzaia", "odej", "youth_hostel", "بيت الشباب - موزاية", "Auberge de jeunes - Mouzaïa", "mouzaia", 50, 1, "active"),
    ("complex_bougara", "odej", "proximity_complex", "المركب الرياضي الجواري - بوقرة", "Complexe sportif de proximité - Bougara", "bougara", 300, 2, "active"),
    ("complex_el_affroun", "odej", "proximity_complex", "المركب الرياضي الجواري - العفرون", "Complexe sportif de proximité - El Affroun", "el_affroun", 250, 2, "maintenance"),
    ("science_blida", "odej", "science_center", "مركز التسلية العلمية - البليدة", "Centre de loisirs scientifiques - Blida", "blida", 200, 2, "active"),
    ("dc_blida_01", "odej", "dar_chabab", "دار الشباب - البليدة وسط", "Maison de jeunes - Blida centre", "blida", 300, 3, "active"),
    ("dc_blida_02", "odej", "dar_chabab", "دار الشباب - بوفاريك", "Maison de jeunes - Boufarik", "boufarik", 250, 3, "active"),
    ("dc_blida_03", "odej", "dar_chabab", "دار الشباب - الأربعاء", "Maison de jeunes - Larbaa", "larbaa", 220, 2, "active"),
    ("dc_blida_04", "odej", "dar_chabab", "دار الشباب - وادي العلايق", "Maison de jeunes - Oued El Alleug", "oued_alleug", 180, 2, "active"),
]

# Approximate member counts per facility type (~600 total).
MEMBERS_PER_TYPE = {
    "dar_chabab": (85, 115), "proximity_complex": (40, 55), "science_center": (35, 45),
    "hall": (15, 25), "proximity_field": (0, 0), "stadium": (0, 0), "youth_hostel": (0, 0),
}

# Activities per week and category weights per facility type.
ACTIVITY_PROFILE = {
    "dar_chabab": (3, {"culture": 4, "science": 2, "scouting": 2, "environment": 1, "digital": 3, "sport": 2}),
    "proximity_complex": (2, {"sport": 8, "environment": 1, "culture": 1}),
    "science_center": (2, {"science": 6, "digital": 4, "environment": 1}),
    "hall": (2, {"sport": 10}),
    "proximity_field": (1, {"sport": 10}),
    "stadium": (1, {"sport": 10}),
    "youth_hostel": (1, {"scouting": 5, "environment": 3, "culture": 2}),
}
OCCUPANCY_TARGET = {
    "dar_chabab": 0.6, "proximity_complex": 0.7, "science_center": 0.45, "hall": 0.75,
    "proximity_field": 0.8, "stadium": 0.3, "youth_hostel": 0.5,
}

ACTIVITY_TITLES = {
    "sport": [("دورة في كرة القدم المصغرة", "Tournoi de mini-foot"), ("حصة تدريبية في الكاراتيه", "Entraînement de karaté"),
              ("بطولة كرة السلة للشباب", "Championnat de basket jeunes"), ("سباق العدو الريفي", "Cross-country"),
              ("حصة كرة اليد", "Séance de handball"), ("دورة في تنس الطاولة", "Tournoi de tennis de table")],
    "culture": [("ورشة المسرح", "Atelier théâtre"), ("أمسية شعرية", "Soirée poétique"), ("ورشة الرسم", "Atelier de dessin"),
                ("نادي القراءة", "Club de lecture"), ("حفل موسيقي أندلسي", "Concert de musique andalouse")],
    "science": [("ورشة الروبوتيك", "Atelier robotique"), ("مسابقة علمية", "Concours scientifique"),
                ("سهرة فلكية", "Soirée d'astronomie"), ("تجارب الكيمياء الممتعة", "Chimie amusante")],
    "scouting": [("خرجة كشفية", "Sortie scoute"), ("مخيم نهاية الأسبوع", "Camp de week-end"),
                 ("رحلة استكشافية إلى الشريعة", "Randonnée à Chréa")],
    "environment": [("حملة تشجير", "Campagne de reboisement"), ("حملة تنظيف الحي", "Nettoyage du quartier"),
                    ("ورشة إعادة التدوير", "Atelier recyclage")],
    "digital": [("ورشة البرمجة للمبتدئين", "Initiation à la programmation"), ("تكوين في التصميم الرقمي", "Formation en design numérique"),
                ("ورشة صناعة المحتوى", "Atelier création de contenu"), ("الأمن الرقمي للشباب", "Sécurité numérique pour les jeunes")],
}

SPACE_NAMES = {
    "dar_chabab": ["قاعة النشاطات", "قاعة الإعلام الآلي", "قاعة الموسيقى"],
    "hall": ["الأرضية الرئيسية", "قاعة التدريب"],
    "proximity_complex": ["الملعب المعشوشب", "القاعة المغطاة"],
    "science_center": ["المخبر", "قاعة العرض"],
    "proximity_field": ["أرضية الملعب"],
    "stadium": ["أرضية الملعب"],
    "youth_hostel": ["قاعة الاجتماعات"],
}

REQUESTERS = [
    "جمعية الأمل للشباب", "النادي الرياضي للهواة البليدة", "جمعية نسيم للثقافة", "الكشافة الإسلامية - فوج الفتح",
    "جمعية أصدقاء البيئة", "نادي الشطرنج المتيجة", "جمعية الإبداع الفني", "النادي الرياضي لكرة السلة بوفاريك",
    "جمعية الشباب الرقمي", "رابطة كرة القدم للأحياء", "مدرسة الكاراتيه الأطلس", "جمعية الأحياء للتضامن",
]

FIRST_NAMES = [("محمد", "Mohamed"), ("أمين", "Amine"), ("ياسين", "Yacine"), ("كريم", "Karim"), ("سفيان", "Sofiane"),
               ("رضا", "Reda"), ("عبد القادر", "Abdelkader"), ("نسيم", "Nassim"), ("فاطمة", "Fatima"), ("أمينة", "Amina"),
               ("سارة", "Sarah"), ("نور الهدى", "Nour El Houda"), ("خديجة", "Khadidja"), ("إيمان", "Imane"),
               ("ليلى", "Leila"), ("مريم", "Meriem"), ("هشام", "Hichem"), ("وليد", "Walid"), ("سمير", "Samir"), ("حنان", "Hanane")]
LAST_NAMES = [("بن علي", "Benali"), ("بوزيد", "Bouzid"), ("حمدي", "Hamdi"), ("مزيان", "Meziane"), ("زروقي", "Zerrouki"),
              ("بلقاسم", "Belkacem"), ("سعيدي", "Saidi"), ("عمراني", "Amrani"), ("رحماني", "Rahmani"), ("قاسمي", "Kacemi"),
              ("بوعلام", "Boualem"), ("شريف", "Cherif"), ("حداد", "Haddad"), ("مسعودي", "Messaoudi"), ("طالبي", "Talbi")]

# Internal structure of a Dar Chabab: (position, count, reports_to position).
DAR_CHABAB_STRUCTURE = [
    ("director", 1, None),
    ("counselor", 2, "director"),
    ("head_educator", 1, "director"),
    ("educator", 3, "head_educator"),
    ("secretariat", 1, "director"),
    ("finance_admin", 1, "director"),
    ("coordination_admin", 1, "director"),
    ("associations_admin", 1, "director"),
    ("activities_admin", 1, "director"),
    ("professional_worker", 3, "director"),
]
OTHER_STRUCTURE = [
    ("director", 1, None),
    ("secretariat", 1, "director"),
    ("activities_admin", 1, "director"),
    ("professional_worker", 2, "secretariat"),
]


def random_name() -> tuple[str, str]:
    (fa, ff), (la, lf) = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
    return f"{fa} {la}", f"{ff} {lf}"


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def seed() -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()

    units: dict[str, OrgUnit] = {}
    for code, parent, type_, name_ar, name_fr in OFFICES:
        parent_unit = units.get(parent) if parent else None
        unit = OrgUnit(code=code, name_ar=name_ar, name_fr=name_fr, type=type_,
                       parent_id=parent_unit.id if parent_unit else None,
                       path=f"{parent_unit.path}.{code}" if parent_unit else code)
        db.add(unit)
        db.flush()
        units[code] = unit

    counts = {"facilities": 0, "staff": 0, "members": 0, "activities": 0, "bookings": 0}
    for code, parent, type_, name_ar, name_fr, commune, capacity, spaces, status in FACILITIES:
        parent_unit = units[parent]
        path = f"{parent_unit.path}.{code}"
        unit = OrgUnit(code=code, name_ar=name_ar, name_fr=name_fr, type=type_, parent_id=parent_unit.id, path=path)
        db.add(unit)
        db.flush()
        c_ar, c_fr, lat, lng = COMMUNES[commune]
        fac = Facility(org_unit_id=unit.id, org_path=path, capacity=capacity, bookable_spaces=spaces, status=status,
                       lat=lat + rng.uniform(-0.01, 0.01), lng=lng + rng.uniform(-0.01, 0.01),
                       commune_ar=c_ar, commune_fr=c_fr)
        db.add(fac)
        db.flush()
        counts["facilities"] += 1

        # Staff with a reports_to hierarchy.
        by_position: dict[str, Staff] = {}
        for position, n, boss in DAR_CHABAB_STRUCTURE if type_ == "dar_chabab" else OTHER_STRUCTURE:
            for _ in range(n):
                ar, fr = random_name()
                s = Staff(full_name_ar=ar, full_name_fr=fr, position=position, facility_id=fac.id, org_path=path,
                          reports_to_id=by_position[boss].id if boss else None)
                db.add(s)
                db.flush()
                by_position.setdefault(position, s)
                counts["staff"] += 1

        # Members, joined over the last 12 months with more recent sign-ups.
        lo, hi = MEMBERS_PER_TYPE[type_]
        for _ in range(rng.randint(lo, hi) if hi else 0):
            days_ago = int(365 * (rng.random() ** 1.4))
            db.add(Member(age=rng.choices(range(12, 31), weights=[3] * 7 + [2] * 7 + [1] * 5)[0],
                          gender=rng.choices("mf", weights=[55, 45])[0], facility_id=fac.id, org_path=path,
                          joined_at=TODAY - timedelta(days=days_ago), active=rng.random() > 0.15))
            counts["members"] += 1

        # Activities: fewer while in maintenance, none once closed (recently).
        per_week, weights = ACTIVITY_PROFILE[type_]
        cats, w = list(weights), list(weights.values())
        for d in daterange(START, TODAY):
            if status == "closed" and d > TODAY - timedelta(days=45):
                continue
            rate = per_week / 7 * (0.4 if status == "maintenance" and d > TODAY - timedelta(days=60) else 1)
            if rng.random() < rate:
                cat = rng.choices(cats, weights=w)[0]
                ar, fr = rng.choice(ACTIVITY_TITLES[cat])
                attendees = max(5, int(rng.gauss(min(capacity, 400) * 0.12, 6)))
                if type_ == "stadium":
                    attendees = rng.randint(2000, 18000)
                db.add(Activity(title_ar=ar, title_fr=fr, category=cat, facility_id=fac.id, org_path=path,
                                date=d, attendees=attendees))
                counts["activities"] += 1

        # Bookings: each space x 3 daily slots, filled with a facility-specific probability.
        target = OCCUPANCY_TARGET[type_] + rng.uniform(-0.12, 0.12)
        if status == "maintenance":
            target *= 0.5
        for d in daterange(START, BOOKING_HORIZON):
            if status == "closed" and d > TODAY - timedelta(days=45):
                continue
            weekend_boost = 1.15 if d.weekday() in (4, 5) else 1.0  # Fri/Sat
            for space in SPACE_NAMES[type_][:spaces]:
                for slot in ("morning", "afternoon", "evening"):
                    if rng.random() < target * weekend_boost * (0.8 if d > TODAY else 1):
                        db.add(Booking(facility_id=fac.id, org_path=path, space=space, date=d, slot=slot,
                                       requester=rng.choice(REQUESTERS)))
                        counts["bookings"] += 1

    db.commit()
    db.close()
    print("Seeded Blida demo data:", ", ".join(f"{k}={v}" for k, v in counts.items()))


if __name__ == "__main__":
    seed()
