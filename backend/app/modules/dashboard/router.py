from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.scope import Scope, get_scope
from app.modules.dashboard import service
from app.modules.dashboard.schemas import Kpis, Trends

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=Kpis)
def kpis(db: Session = Depends(get_db), scope: Scope = Depends(get_scope)):
    return service.get_kpis(db, scope)


@router.get("/trends", response_model=Trends)
def trends(db: Session = Depends(get_db), scope: Scope = Depends(get_scope)):
    return service.get_trends(db, scope)
