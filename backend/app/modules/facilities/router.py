from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.scope import Scope, get_scope
from app.modules.facilities import service
from app.modules.facilities.schemas import FacilityDetail, FacilityOut

router = APIRouter(prefix="/facilities", tags=["facilities"])


@router.get("", response_model=list[FacilityOut])
def list_facilities(type: str | None = Query(default=None), db: Session = Depends(get_db),
                    scope: Scope = Depends(get_scope)):
    return service.list_facilities(db, scope, type)


@router.get("/{facility_id}", response_model=FacilityDetail)
def get_facility(facility_id: int, db: Session = Depends(get_db), scope: Scope = Depends(get_scope)):
    return service.get_facility(db, scope, facility_id)
