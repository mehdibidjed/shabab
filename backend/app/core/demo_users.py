"""Demo users for the prototype (no real authentication).

Access = role x scope, where scope is an org path; a user sees the node at
`scope` and its whole subtree. Module 2 roles are additionally restricted by
`app/modules/psych/policy.py` (e.g. a psychologist reads only their own cases).

`person` links a demo user to a seeded Staff/Member row through its `demo_key`
column (prototype only): the psychologist is a real staff member of the
center, the parent is linked to their child, the young member to themselves.
"""
from dataclasses import dataclass

MANAGEMENT_ROLES = frozenset({"djs_director", "opow_director", "odej_director", "dc_director", "wali_inspector"})


@dataclass(frozen=True)
class DemoUser:
    key: str
    role: str
    scope: str
    name_ar: str
    name_fr: str
    read_only: bool = False
    group: str = "management"  # management | care | family (role switcher grouping)
    person: str | None = None  # demo_key of the linked Staff (staff roles) or Member (parent's child, young member)
    hidden: bool = False  # not offered in the role switcher (used by tests)


DC01 = "djs.odej.dc_constantine_01"
DC02 = "djs.odej.dc_constantine_02"

DEMO_USERS: dict[str, DemoUser] = {
    u.key: u
    for u in [
        DemoUser("djs_director", "djs_director", "djs", "مدير الشباب والرياضة", "Directeur de la Jeunesse et des Sports"),
        DemoUser("opow_director", "opow_director", "djs.opow", "مدير ديوان المركب المتعدد الرياضات", "Directeur de l'OPOW"),
        DemoUser("odej_director", "odej_director", "djs.odej", "مدير ديوان مؤسسات الشباب", "Directeur de l'ODEJ"),
        DemoUser("dc_director", "dc_director", DC01, "مدير دار الشباب - قسنطينة وسط", "Directeur de la Maison de jeunes - Constantine centre"),
        DemoUser("wali_inspector", "wali_inspector", "djs", "مفتش الولاية - التفتيش والمتابعة", "Inspecteur de la wilaya", read_only=True),
        DemoUser("psychologist", "psychologist", DC01, "نفساني عيادي - دار الشباب قسنطينة وسط", "Psychologue clinicien - Constantine centre",
                 group="care", person="psy_dc01"),
        DemoUser("psychologist_b", "psychologist", DC02, "نفساني عيادي - دار الشباب علي منجلي", "Psychologue clinicien - Ali Mendjeli",
                 group="care", person="psy_dc02", hidden=True),
        DemoUser("educator", "educator", DC01, "مربٍّ - دار الشباب قسنطينة وسط", "Éducateur - Constantine centre",
                 group="care", person="edu_dc01"),
        DemoUser("parent", "parent", DC01, "وليّ أمر", "Parent", group="family", person="child_dc01"),
        DemoUser("young_member", "young_member", DC01, "شاب منخرط", "Jeune adhérent", group="family", person="youth_dc01"),
    ]
}

DEFAULT_USER = "djs_director"
