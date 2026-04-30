"""
routes/kri.py — KRI API endpoints

POST /api/kri/run          Run all KRIs using data already in /data folder
GET  /api/kri/sites        List all sites with risk levels
GET  /api/kri/site/{id}    Full KRI report for one site
GET  /api/kri/alerts       All RED KRIs across all sites
GET  /api/kri/summary      Portfolio-level counts
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from engine.kri_calculator import calculate_all_kris
from engine.models import SiteReport
from db.database import get_db
from db.models import UserSiteAssignment, Trial, Site, KRILibrary, StudyKRIConfig
from api.permissions import require_any_authenticated
import pandas as pd
import os

router = APIRouter(prefix="/api/kri", tags=["KRI Engine"], dependencies=[Depends(require_any_authenticated)])

DATA_DIR = "data"


def _load_data():
    required = ["sites", "patients", "visits", "queries",
                "saes", "deviations", "ip_records", "measurements"]
    for f in required:
        if not os.path.exists(f"{DATA_DIR}/{f}.csv"):
            raise FileNotFoundError(
                f"{f}.csv not found. Run generate_data.py first."
            )
    return {
        "sites":        pd.read_csv(f"{DATA_DIR}/sites.csv"),
        "patients":     pd.read_csv(f"{DATA_DIR}/patients.csv"),
        "visits":       pd.read_csv(f"{DATA_DIR}/visits.csv"),
        "queries":      pd.read_csv(f"{DATA_DIR}/queries.csv"),
        "saes":         pd.read_csv(f"{DATA_DIR}/saes.csv"),
        "deviations":   pd.read_csv(f"{DATA_DIR}/deviations.csv"),
        "ip_records":   pd.read_csv(f"{DATA_DIR}/ip_records.csv"),
        "measurements": pd.read_csv(f"{DATA_DIR}/measurements.csv"),
    }


def _get_threshold_overrides(study_id: int, org_id: int, db: Session) -> dict:
    cache = {}
    org_kris = db.query(KRILibrary).filter(KRILibrary.org_id == org_id, KRILibrary.is_active == True).all()
    for k in org_kris:
        cache[k.kri_id] = {"yellow": k.default_yellow, "red": k.default_red}
        
    study_kris = db.query(StudyKRIConfig).filter(StudyKRIConfig.study_id == study_id, StudyKRIConfig.is_active == True).all()
    for k in study_kris:
        cache[k.kri_id] = {"yellow": k.yellow_threshold, "red": k.red_threshold}
        
    return cache

def _build_reports(data, request: Request, db: Session):
    reports = []
    
    # Apply Tenancy & Context Filtering
    org_id = request.state.org_id
    role = request.state.role
    user_id = request.state.user_id
    
    allowed_site_ids = set()
    if role == "platform_admin":
        allowed_site_ids = set(data["sites"]["site_id"].tolist())
    elif role == "site_monitor":
        assignments = db.query(UserSiteAssignment).filter(
            UserSiteAssignment.user_id == user_id,
            UserSiteAssignment.is_active == True
        ).all()
        # In DB, sites have an integer ID, but CSV uses site_id string.
        # We join with Site table to get site_id string.
        assigned_site_ints = [a.site_id for a in assignments]
        db_sites = db.query(Site).filter(Site.id.in_(assigned_site_ints)).all()
        allowed_site_ids = set([s.site_id for s in db_sites])
    else:
        # CRO Admin, Central Monitor
        db_sites = db.query(Site).join(Trial).filter(Trial.org_id == org_id).all()
        allowed_site_ids = set([s.site_id for s in db_sites])

    # We need study_id mapping to fetch threshold overrides
    # For simplicity here, we assume TRIAL-2024-001 (or we lookup the study for the site)
    
    for _, site in data["sites"].iterrows():
        sid = site["site_id"]
        if sid not in allowed_site_ids:
            continue
            
        # Try to find study_id for this site from DB to get threshold overrides
        db_site = db.query(Site).filter(Site.site_id == sid).first()
        overrides = {}
        if db_site and org_id:
            overrides = _get_threshold_overrides(db_site.trial_id, org_id, db)
            
        kri_results = calculate_all_kris(data, sid, overrides)
        report = SiteReport(
            site_id   = sid,
            site_name = site["site_name"],
            kris      = kri_results,
        )
        reports.append(report)
    return reports


def _kri_to_dict(kri):
    return {
        "kri_id":           kri.kri_id,
        "kri_name":         kri.kri_name,
        "domain":           kri.domain,
        "value":            kri.value,
        "unit":             kri.unit,
        "threshold_yellow": kri.threshold_yellow,
        "threshold_red":    kri.threshold_red,
        "status":           kri.status,
        "interpretation":   kri.interpretation,
    }


def _report_to_dict(report):
    return {
        "site_id":      report.site_id,
        "site_name":    report.site_name,
        "risk_level":   report.risk_level,
        "red_count":    report.red_count,
        "yellow_count": report.yellow_count,
        "green_count":  report.green_count,
        "kris":         [_kri_to_dict(k) for k in report.kris],
    }


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(request: Request, db: Session = Depends(get_db)):
    """Portfolio-level KRI summary across all sites."""
    data    = _load_data()
    reports = _build_reports(data, request, db)

    total_red    = sum(r.red_count for r in reports)
    total_yellow = sum(r.yellow_count for r in reports)
    total_green  = sum(r.green_count for r in reports)
    risk_counts  = {}
    for r in reports:
        risk_counts[r.risk_level] = risk_counts.get(r.risk_level, 0) + 1

    return {
        "trial_id":         "TRIAL-2024-001",
        "total_sites":      len(reports),
        "total_red":        total_red,
        "total_yellow":     total_yellow,
        "total_green":      total_green,
        "sites_by_risk":    risk_counts,
        "critical_sites":   [r.site_id for r in reports if r.risk_level == "CRITICAL"],
        "alerts_count":     total_red, # Mapping red KRIs to alerts for summary
        "lock_ready_count": sum(1 for r in reports if r.red_count == 0), # Sites with zero critical issues
    }


@router.get("/sites")
def get_sites(request: Request, db: Session = Depends(get_db)):
    """All sites with their risk level and KRI counts."""
    data    = _load_data()
    reports = _build_reports(data, request, db)

    return [
        {
            "site_id":      r.site_id,
            "site_name":    r.site_name,
            "risk_level":   r.risk_level,
            "red_count":    r.red_count,
            "yellow_count": r.yellow_count,
            "green_count":  r.green_count,
        }
        for r in reports
    ]


@router.get("/site/{site_id}")
def get_site(site_id: str, request: Request, db: Session = Depends(get_db)):
    """Full KRI report for a single site."""
    data    = _load_data()
    reports = _build_reports(data, request, db)

    match = next((r for r in reports if r.site_id == site_id), None)
    if not match:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found.")

    return _report_to_dict(match)


@router.get("/alerts")
def get_alerts(request: Request, db: Session = Depends(get_db)):
    """All RED KRIs across all sites — action required list."""
    data    = _load_data()
    reports = _build_reports(data, request, db)

    alerts = []
    for report in reports:
        for kri in report.kris:
            if kri.status == "RED":
                alerts.append({
                    "site_id":       report.site_id,
                    "site_name":     report.site_name,
                    "kri_id":        kri.kri_id,
                    "kri_name":      kri.kri_name,
                    "domain":        kri.domain,
                    "value":         kri.value,
                    "unit":          kri.unit,
                    "interpretation": kri.interpretation,
                })

    return {
        "total_alerts": len(alerts),
        "alerts":       alerts,
    }


@router.get("/domain/{domain_name}")
def get_by_domain(domain_name: str, request: Request, db: Session = Depends(get_db)):
    """All KRI results for a specific domain across all sites."""
    data    = _load_data()
    reports = _build_reports(data, request, db)

    results = []
    for report in reports:
        for kri in report.kris:
            if kri.domain.lower().replace(" ", "_") == domain_name.lower().replace(" ", "_"):
                d = _kri_to_dict(kri)
                d["site_id"]   = report.site_id
                d["site_name"] = report.site_name
                results.append(d)

    if not results:
        from fastapi import HTTPException
        raise HTTPException(status_code=404,
                            detail=f"Domain '{domain_name}' not found.")
    return results
