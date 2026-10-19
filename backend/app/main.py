import os

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.ai.router import router as ai_router
from app.modules.activities.router import router as activities_router
from app.core.demo_users import DEMO_USERS
from app.core.permissions import management_only
from app.core.scope import Scope, get_scope
from app.modules.dashboard.router import router as dashboard_router
from app.modules.facilities.router import router as facilities_router
from app.modules.members.router import router as members_router
from app.modules.org.router import router as org_router
from app.modules.psych.router import router as psych_router

app = FastAPI(title="Shabab Platform API (prototype)", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    # e.g. ^https://shabab[a-z0-9-]*\.vercel\.app$ to also accept Vercel preview deployments
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX") or None,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


@api.get("/me", tags=["auth"])
def me(scope: Scope = Depends(get_scope)):
    """Current demo user plus the list for the role switcher."""
    return {"user": scope.user.__dict__, "users": [u.__dict__ for u in DEMO_USERS.values() if not u.hidden]}


# Management-only routers (dashboards, registers, AI); Module 2 does its own
# per-role checks in app/modules/psych/policy.py.
for r in (org_router, dashboard_router, facilities_router, members_router, activities_router, ai_router):
    api.include_router(r, dependencies=[Depends(management_only)])
api.include_router(psych_router)
app.include_router(api)


@app.get("/health")
def health():
    return {"ok": True}
