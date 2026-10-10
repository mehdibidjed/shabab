from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.schemas import InsightsRequest, InsightsResponse
from app.ai.service import generate_insights
from app.core.db import get_db
from app.core.scope import Scope, get_scope

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/insights", response_model=InsightsResponse)
def insights(body: InsightsRequest | None = None, db: Session = Depends(get_db), scope: Scope = Depends(get_scope)):
    return generate_insights(db, scope, (body or InsightsRequest()).locale)
