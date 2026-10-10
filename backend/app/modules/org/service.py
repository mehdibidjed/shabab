from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.scope import Scope
from app.modules.facilities.models import Facility
from app.modules.members.models import Member
from app.modules.org.models import FACILITY_TYPES, OFFICE_TYPES, OrgUnit
from app.modules.org.schemas import OrgNode


def get_tree(db: Session, scope: Scope) -> OrgNode:
    order = {t: i for i, t in enumerate(OFFICE_TYPES + FACILITY_TYPES)}
    units = sorted(db.scalars(select(OrgUnit).where(scope.filter(OrgUnit.path))),
                   key=lambda u: (u.path.count("."), order.get(u.type, 99), u.id))
    facilities = {f.org_unit_id: f for f in db.scalars(select(Facility).where(scope.filter(Facility.org_path)))}
    members = dict(db.execute(
        select(Member.facility_id, func.count()).where(scope.filter(Member.org_path), Member.active)
        .group_by(Member.facility_id)
    ).all())

    nodes: dict[int, OrgNode] = {}
    for u in units:
        fac = facilities.get(u.id)
        nodes[u.id] = OrgNode(
            id=u.id, code=u.code, name_ar=u.name_ar, name_fr=u.name_fr, type=u.type, path=u.path,
            facility_id=fac.id if fac else None, status=fac.status if fac else None,
            members=members.get(fac.id, 0) if fac else 0, children=[],
        )
    root = None
    for u in units:
        if u.path == scope.path:
            root = nodes[u.id]
        elif u.parent_id in nodes:
            nodes[u.parent_id].children.append(nodes[u.id])
    # Roll member counts up to offices.
    def total(n: OrgNode) -> int:
        if n.children:
            n.members = sum(total(c) for c in n.children)
        return n.members
    total(root)
    return root
