"""Demo users for the prototype (no real authentication).

Access = role x scope, where scope is an org path; a user sees the node at
`scope` and its whole subtree.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class DemoUser:
    key: str
    role: str
    scope: str
    name_ar: str
    name_fr: str
    read_only: bool = False


DEMO_USERS: dict[str, DemoUser] = {
    u.key: u
    for u in [
        DemoUser("djs_director", "djs_director", "djs", "مدير الشباب والرياضة", "Directeur de la Jeunesse et des Sports"),
        DemoUser("opow_director", "opow_director", "djs.opow", "مدير ديوان المركب المتعدد الرياضات", "Directeur de l'OPOW"),
        DemoUser("odej_director", "odej_director", "djs.odej", "مدير ديوان مؤسسات الشباب", "Directeur de l'ODEJ"),
        DemoUser("dc_director", "dc_director", "djs.odej.dc_constantine_01", "مدير دار الشباب - قسنطينة وسط", "Directeur de la Maison de jeunes - Constantine centre"),
        DemoUser("wali_inspector", "wali_inspector", "djs", "مفتش الولاية - التفتيش والمتابعة", "Inspecteur de la wilaya", read_only=True),
    ]
}

DEFAULT_USER = "djs_director"
