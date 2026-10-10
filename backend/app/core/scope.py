"""Scope filtering: every list query goes through `Scope.filter`.

Org paths are dotted strings (`djs.odej.dc_blida_01`), mirroring Postgres
`ltree`; `path <@ scope` becomes `path = scope OR path LIKE 'scope.%'`.
"""
from fastapi import Header, HTTPException
from sqlalchemy import ColumnElement, or_

from app.core.demo_users import DEFAULT_USER, DEMO_USERS, DemoUser


class Scope:
    def __init__(self, user: DemoUser):
        self.user = user
        self.path = user.scope

    def filter(self, path_column) -> ColumnElement[bool]:
        return or_(path_column == self.path, path_column.like(f"{self.path}.%"))

    def contains(self, path: str) -> bool:
        return path == self.path or path.startswith(f"{self.path}.")


def get_scope(x_demo_user: str | None = Header(default=None)) -> Scope:
    key = x_demo_user or DEFAULT_USER
    user = DEMO_USERS.get(key)
    if user is None:
        raise HTTPException(status_code=401, detail=f"Unknown demo user: {key}")
    return Scope(user)
