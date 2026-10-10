from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.pagination import Page, PageParams
from app.core.scope import Scope, get_scope
from app.modules.activities import service
from app.modules.activities.schemas import ActivitiesStats, ActivityRow

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("", response_model=Page[ActivityRow])
def list_activities(
    category: str | None = Query(None),
    facility_id: int | None = Query(None),
    month: str | None = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    q: str | None = Query(None, max_length=100),
    params: PageParams = Depends(),
    db: Session = Depends(get_db),
    scope: Scope = Depends(get_scope),
):
    return service.list_activities(db, scope, params, category=category, facility_id=facility_id, month=month, q=q)


@router.get("/stats", response_model=ActivitiesStats)
def stats(db: Session = Depends(get_db), scope: Scope = Depends(get_scope)):
    return service.activities_stats(db, scope)
