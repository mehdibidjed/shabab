from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.scope import Scope, get_scope
from app.modules.org import service
from app.modules.org.schemas import OrgNode

router = APIRouter(prefix="/org", tags=["org"])


@router.get("/tree", response_model=OrgNode)
def org_tree(db: Session = Depends(get_db), scope: Scope = Depends(get_scope)):
    return service.get_tree(db, scope)
