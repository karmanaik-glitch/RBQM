"""
routes/lock.py — Database Lock Readiness endpoints

GET  /api/lock/trial          Trial-level lock readiness + critical path
GET  /api/lock/sites          All sites lock scores and status
GET  /api/lock/site/{id}      Full lock report for one site
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from engine.kri_calculator import calculate_all_kris
from engine.models import SiteReport
from engine.lock_readiness import compute_trial_lock_readiness
from api.routes.kri import _load_data, _build_reports
from db.database import get_db
from api.permissions import require_any_authenticated

router = APIRouter(prefix="/api/lock", tags=["Lock Readiness"], dependencies=[Depends(require_any_authenticated)])

def _get_site_reports(request: Request, db: Session):
    data = _load_data()
    return _build_reports(data, request, db)


def _blocker_to_dict(b):
    return {
        "kri_id":          b.kri_id,
        "kri_name":        b.kri_name,
        "domain":          b.domain,
        "site_id":         b.site_id,
        "status":          b.status,
        "is_hard_blocker": b.is_hard_blocker,
        "score_impact":    b.score_impact,
        "est_days":        b.est_days,
        "action":          b.action,
        "interpretation":  b.interpretation,
    }


def _site_lock_to_dict(s):
    return {
        "site_id":          s.site_id,
        "site_name":        s.site_name,
        "lock_score":       s.lock_score,
        "lock_status":      s.lock_status,
        "est_days_to_lock": s.est_days_to_lock,
        "hard_blockers":    [_blocker_to_dict(b) for b in s.hard_blockers],
        "soft_blockers":    [_blocker_to_dict(b) for b in s.soft_blockers],
        "total_blockers":   s.total_blockers,
        "summary":          s.summary,
    }


@router.get("/trial")
def get_trial_lock(request: Request, db: Session = Depends(get_db)):
    """Trial-level lock readiness report with critical path."""
    reports = _get_site_reports(request, db)
    trial   = compute_trial_lock_readiness(reports)
    return {
        "trial_id":            trial.trial_id,
        "trial_lock_score":    trial.trial_lock_score,
        "trial_lock_status":   trial.trial_lock_status,
        "predicted_lock_days": trial.predicted_lock_days,
        "summary":             trial.summary,
        "critical_path":       trial.critical_path,
        "sites":               [_site_lock_to_dict(s) for s in trial.sites],
    }


@router.get("/sites")
def get_sites_lock(request: Request, db: Session = Depends(get_db)):
    """Lock score and status for all sites."""
    reports = _get_site_reports(request, db)
    trial   = compute_trial_lock_readiness(reports)
    return [
        {
            "site_id":          s.site_id,
            "site_name":        s.site_name,
            "lock_score":       s.lock_score,
            "lock_status":      s.lock_status,
            "est_days_to_lock": s.est_days_to_lock,
            "total_blockers":   s.total_blockers,
            "hard_blockers":    len(s.hard_blockers),
        }
        for s in trial.sites
    ]


@router.get("/site/{site_id}")
def get_site_lock(site_id: str, request: Request, db: Session = Depends(get_db)):
    """Full lock readiness report for a single site."""
    reports = _get_site_reports(request, db)
    trial   = compute_trial_lock_readiness(reports)
    match   = next((s for s in trial.sites if s.site_id == site_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found.")
    return _site_lock_to_dict(match)
