from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dashboard import DashboardMetrics
from app.services.dashboard_service import build_metrics

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetrics)
def metrics(db: Session = Depends(get_db)):
    return build_metrics(db)
