from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.pagination import Page, PageParams
from app.core.scope import Scope, get_scope
from app.modules.members import service
from app.modules.members.schemas import MemberOut, MembersStats

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=Page[MemberOut])
def list_members(
    facility_id: int | None = Query(None),
    gender: str | None = Query(None, pattern="^(m|f)$"),
    age_band: str | None = Query(None),
    status: str | None = Query(None, pattern="^(active|inactive)$"),
    q: str | None = Query(None, max_length=100),
    params: PageParams = Depends(),
    db: Session = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    return service.list_members(db, scope, params, facility_id=facility_id, gender=gender, age_band=age_band,
                                status=status, q=q)


@router.get("/stats", response_model=MembersStats)
def stats(db: Session = Depends(get_db), scope: Scope = Depends(get_scope)):
    return service.members_stats(db, scope)
