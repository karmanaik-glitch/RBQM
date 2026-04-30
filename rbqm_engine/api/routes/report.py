"""
routes/report.py — AI Report Generation endpoints

POST /api/report/generate         Full report (non-streaming)
POST /api/report/stream           Streaming SSE report generation
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse, FileResponse, Response
from pydantic import BaseModel
from typing import Optional
from engine.kri_calculator import calculate_all_kris
from engine.models import SiteReport
from engine.report_generator import generate_report_stream, generate_report_full
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Trial, Site, KRISnapshot, UserSiteAssignment
import pandas as pd
from engine.pdf_report import generate_pdf_report
import io
import os
from datetime import datetime
from api.permissions import require_study_access, require_any_authenticated

router = APIRouter(prefix="/api/report", tags=["AI Report"], dependencies=[Depends(require_any_authenticated)])


class ReportRequest(BaseModel):
    api_key: str   # Groq API key passed from frontend
    trial_id: Optional[int] = None


def _get_site_reports_for_trial(trial_id: int, request: Request, db: Session):
    trial = db.query(Trial).filter(Trial.id == trial_id).first()
    if not trial:
        return []
        
    role = request.state.role
    user_id = request.state.user_id
    
    if role == "site_monitor":
        assignments = db.query(UserSiteAssignment).filter(
            UserSiteAssignment.user_id == user_id,
            UserSiteAssignment.study_id == trial_id,
            UserSiteAssignment.is_active == True
        ).all()
        assigned_site_ids = [a.site_id for a in assignments]
        sites = db.query(Site).filter(Site.trial_id == trial_id, Site.id.in_(assigned_site_ids)).all()
    else:
        sites = db.query(Site).filter(Site.trial_id == trial_id).all()
        
    reports = []
    
    for site in sites:
        snapshots = db.query(KRISnapshot).filter(
            KRISnapshot.trial_id == trial_id,
            KRISnapshot.site_ext_id == site.site_id
        ).all()
        
        kri_results = []
        for s in snapshots:
            from engine.models import KRIResult
            kri_results.append(KRIResult(
                kri_id=s.kri_id,
                kri_name=s.kri_name,
                domain=s.domain,
                site_id=s.site_ext_id,
                value=s.value,
                unit=s.unit,
                threshold_yellow=0,
                threshold_red=0,
                higher_is_worse=True,
                status=s.status,
                interpretation=""
            ))
            
        reports.append(SiteReport(
            site_id=site.site_id,
            site_name=site.site_name,
            kris=kri_results
        ))
    return reports

COMPLIANCE_ITEMS = [
    {"section": "5.0", "requirement": "The sponsor should implement a system to manage quality throughout all stages of the trial process.", "kris_mapped": ["1.1", "1.2"], "evidence_required": "Quality Management Plan"},
    {"section": "5.3", "requirement": "The sponsor should maintain a record of all deviations from the protocol.", "kris_mapped": ["3.1", "3.2"], "evidence_required": "Deviation Log"},
    {"section": "5.5", "requirement": "The sponsor should monitor the trial to ensure subject rights and safety.", "kris_mapped": ["2.1", "2.2", "2.3"], "evidence_required": "Monitoring Reports"},
    {"section": "Appx C", "requirement": "Risk-based approach to monitoring should include KRIs for safety and data quality.", "kris_mapped": ["1.1", "2.1", "6.1"], "evidence_required": "RBQM Strategy"},
    {"section": "5.18", "requirement": "The sponsor should ensure that the investigational product is handled correctly.", "kris_mapped": ["5.1", "5.2"], "evidence_required": "IP Accountability Log"},
    {"section": "5.1", "requirement": "The sponsor is responsible for implementing and maintaining QA and QC systems.", "kris_mapped": ["1.4", "1.5"], "evidence_required": "SOPs"},
    {"section": "4.1", "requirement": "The investigator should ensure that trial subjects are properly enrolled.", "kris_mapped": ["4.1", "4.2", "3.3"], "evidence_required": "Enrollment Log"},
    {"section": "4.8", "requirement": "Informed consent must be obtained before any trial-related procedures.", "kris_mapped": ["3.3"], "evidence_required": "ICF Audit Log"},
    {"section": "5.0.2", "requirement": "The sponsor should identify those processes and data that are critical.", "kris_mapped": ["6.1", "6.2", "6.3"], "evidence_required": "Critical Data Definition"}
]

@router.get("/compliance")
def get_compliance_checklist():
    return [ {**item, "status": "INSUFFICIENT_DATA"} for item in COMPLIANCE_ITEMS ]

@router.get("/compliance/{trial_id}")
def get_trial_compliance(trial_id: int, db: Session = Depends(get_db)):
    snapshots = db.query(KRISnapshot).filter(KRISnapshot.trial_id == trial_id).all()
    if not snapshots:
        return [ {**item, "status": "INSUFFICIENT_DATA"} for item in COMPLIANCE_ITEMS ]
    
    results = []
    for item in COMPLIANCE_ITEMS:
        # Determine status based on mapped KRIs
        mapped_snaps = [s for s in snapshots if s.kri_id in item["kris_mapped"]]
        if not mapped_snaps:
            status = "INSUFFICIENT_DATA"
        elif any(s.status == "RED" for s in mapped_snaps):
            status = "NON_COMPLIANT"
        elif any(s.status == "YELLOW" for s in mapped_snaps):
            status = "AT_RISK"
        else:
            status = "COMPLIANT"
            
        results.append({**item, "status": status})
    return results


@router.post("/generate")
def generate_report(request: Request, req: ReportRequest, db: Session = Depends(get_db)):
    """Generate full CDM narrative report (non-streaming)."""
    if not req.api_key or not req.api_key.startswith("gsk_"):
        raise HTTPException(status_code=400, detail="Invalid Groq API key format.")
    try:
        if req.trial_id:
            require_study_access(req.trial_id)(request)
            reports = _get_site_reports_for_trial(req.trial_id, request, db)
        else:
            from api.routes.kri import _load_data, _build_reports
            data = _load_data()
            reports = _build_reports(data, request, db)
        
        if not reports:
            raise HTTPException(status_code=404, detail="No data found for report generation.")
            
        report  = generate_report_full(reports, req.api_key)
        return { "report": report, "word_count": len(report.split()) }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.post("/stream")
def stream_report(request: Request, req: ReportRequest, db: Session = Depends(get_db)):
    """Stream CDM narrative report as Server-Sent Events."""
    if not req.api_key or not req.api_key.startswith("gsk_"):
        raise HTTPException(status_code=400, detail="Invalid Groq API key format.")

    if req.trial_id:
        require_study_access(req.trial_id)(request)
        reports = _get_site_reports_for_trial(req.trial_id, request, db)
    else:
        from api.routes.kri import _load_data, _build_reports
        data = _load_data()
        reports = _build_reports(data, request, db)
    
    if not reports:
        raise HTTPException(status_code=404, detail="No data found for report generation.")

    def event_stream():
        try:
            for chunk in generate_report_stream(reports, req.api_key):
                safe = chunk.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type = "text/event-stream",
        headers    = {
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        }
    )

@router.get("/pdf/{trial_id}")
def get_trial_pdf(trial_id: int, request: Request, db: Session = Depends(get_db)):
    """Generate and return trial-specific PDF report."""
    require_study_access(trial_id)(request)
    trial = db.query(Trial).filter(Trial.id == trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
        
    reports = _get_site_reports_for_trial(trial_id, request, db)
    if not reports:
        raise HTTPException(status_code=404, detail="No KRI data found for this trial.")
        
    pdf_path = f"reports/trial_{trial_id}_report.pdf"
    os.makedirs("reports", exist_ok=True)
    
    generate_pdf_report(reports, pdf_path, trial_title=trial.title)
    
    return FileResponse(
        pdf_path, 
        media_type="application/pdf", 
        filename=f"RBQM_Report_{trial.trial_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    )

@router.get("/audit-csv")
def export_audit_log_csv(db: Session = Depends(get_db)):
    from db.models import AuditLog
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    data = []
    for l in logs:
        data.append({
            "timestamp": l.created_at,
            "type": l.event_type,
            "user": l.user_email,
            "trial_id": l.trial_id,
            "detail": l.detail
        })
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(
        content=stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=audit_log_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.get("/kri-csv/{trial_id}")
def export_kri_results_csv(trial_id: int, db: Session = Depends(get_db)):
    trial = db.query(Trial).filter(Trial.id == trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
    
    snaps = db.query(KRISnapshot).filter(KRISnapshot.trial_id == trial_id).all()
    data = []
    for s in snaps:
        data.append({
            "site_id": s.site_ext_id,
            "kri_id": s.kri_id,
            "kri_name": s.kri_name,
            "domain": s.domain,
            "value": s.value,
            "unit": s.unit,
            "status": s.status,
            "run_at": s.run_at
        })
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(
        content=stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=kri_results_{trial.trial_id}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

