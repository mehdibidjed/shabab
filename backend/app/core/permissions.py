"""Role checks layered on top of scope. A role outside the allowed set gets 403
before any data is looked up."""
from fastapi import Depends, HTTPException

from app.core.demo_users import MANAGEMENT_ROLES
from app.core.scope import Scope, get_scope


def require_roles(*roles: str):
    allowed = frozenset(roles)

    def dependency(scope: Scope = Depends(get_scope)) -> Scope:
        if scope.user.role not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden for this role")
        return scope

    return dependency


# Dashboards, registers and AI insights are for management roles. Psychologists,
# educators, parents and young members have their own workspaces (Module 2):
# the member register lists minors by name, which a parent must never browse.
management_only = require_roles(*MANAGEMENT_ROLES)
