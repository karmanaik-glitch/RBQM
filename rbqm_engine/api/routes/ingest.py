from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Trial, Upload, KRISnapshot, Alert, User
from api.auth import get_current_user
from db.logger import log_event
from engine.models import SiteReport
from engine.kri_calculator import calculate_all_kris
from api.routes.kri import _get_threshold_overrides
from api.permissions import require_cro_admin, require_study_access
import pandas as pd
from typing import List
import shutil
from db.storage import save_file, get_file_path

router = APIRouter(prefix="/api/ingest", tags=["ingest"], dependencies=[Depends(require_cro_admin)])

@router.post("/{id}/upload")
async def upload_file(id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    require_study_access(id)(request)
    current_user_email = request.state.user_id # Using user_id for logs if email not easily accessible
    if hasattr(request.state, "user_email"):
        current_user_email = request.state.user_email
    t = db.query(Trial).filter(Trial.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trial not found")
    
    file_path = save_file(id, file.filename, file.file)
    
    # check if upload record exists
    upload = db.query(Upload).filter(Upload.trial_id == id, Upload.filename == file.filename).first()
    if not upload:
        upload = Upload(filename=file.filename, file_path=file_path, status="COMPLETE", trial_id=id)
        db.add(upload)
    else:
        upload.status = "COMPLETE"
        upload.file_path = file_path
    db.commit()
    db.commit()
    log_event(db, "UPLOAD", str(current_user_email), f"Uploaded file {file.filename} for trial {t.trial_id}", trial_id=id)
    return {"message": "File uploaded", "filename": file.filename}

@router.get("/{id}/uploads")
def get_uploads(id: int, request: Request, db: Session = Depends(get_db)):
    require_study_access(id)(request)
    uploads = db.query(Upload).filter(Upload.trial_id == id).all()
    return uploads

@router.get("/schema")
def get_schema():
    return {
        "patients.csv": ["patient_id", "site_id", "enrolled_date", "status"],
        "visits.csv": ["visit_id", "patient_id", "visit_date", "status"],
        "deviations.csv": ["deviation_id", "patient_id", "site_id", "type", "severity", "date"],
        "queries.csv": ["query_id", "patient_id", "site_id", "opened_date", "resolved_date", "status"],
        "saes.csv": ["sae_id", "patient_id", "site_id", "reported_date", "event_date", "is_fatal"],
        "measurements.csv": ["measurement_id", "patient_id", "site_id", "type", "value", "date"],
        "ip_records.csv": ["record_id", "site_id", "received_count", "dispensed_count", "returned_count", "date"],
        "sites.csv": ["site_id", "site_name", "country", "target_enrollment"]
    }

@router.post("/{id}/run-kri")
def run_kri(id: int, request: Request, db: Session = Depends(get_db)):
    require_study_access(id)(request)
    current_user_email = request.state.user_id
    if hasattr(request.state, "user_email"):
        current_user_email = request.state.user_email
    t = db.query(Trial).filter(Trial.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trial not found")
    
    # Check if all files are uploaded (simplified, assuming we just run calculation)
    # The real calculation calls engine.kri_calculator.calculate_all_kris(trial_id)
    # But since engine doesn't use the db directly for its pandas logic, we just pass the directory
    try:
        data = {
            "patients": pd.read_csv(get_file_path(id, "patients.csv")),
            "visits": pd.read_csv(get_file_path(id, "visits.csv")),
            "deviations": pd.read_csv(get_file_path(id, "deviations.csv")),
            "queries": pd.read_csv(get_file_path(id, "queries.csv")),
            "saes": pd.read_csv(get_file_path(id, "saes.csv")),
            "measurements": pd.read_csv(get_file_path(id, "measurements.csv")),
            "ip_records": pd.read_csv(get_file_path(id, "ip_records.csv")),
            "sites": pd.read_csv(get_file_path(id, "sites.csv")),
        }
        site_ids = data["sites"]["site_id"].unique()
        results = []
        org_id = request.state.org_id
        overrides = _get_threshold_overrides(id, org_id, db) if org_id else {}
        for sid in site_ids:
            kris = calculate_all_kris(data, sid, overrides)
            site_name = data["sites"].loc[data["sites"]["site_id"] == sid, "site_name"].values[0]
            results.append(SiteReport(site_id=sid, site_name=site_name, kris=kris))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # Delete old snapshots for this trial
    db.query(KRISnapshot).filter(KRISnapshot.trial_id == id).delete()
    
    reds = yellows = greens = 0
    for site_report in results:
        for kri in site_report.kris:
            snap = KRISnapshot(
                kri_id=kri.kri_id,
                kri_name=kri.kri_name,
                domain=kri.domain,
                value=kri.value,
                unit=kri.unit,
                status=kri.status,
                site_ext_id=kri.site_id,
                trial_id=id
            )
            db.add(snap)
            if kri.status == "RED":
                reds += 1
                # Create alert
                existing_alert = db.query(Alert).filter(Alert.trial_id == id, Alert.site_ext_id == kri.site_id, Alert.kri_id == kri.kri_id).first()
                if not existing_alert:
                    alert = Alert(kri_id=kri.kri_id, severity="CRITICAL", trial_id=id, site_ext_id=kri.site_id)
                    db.add(alert)
            elif kri.status == "YELLOW":
                yellows += 1
            elif kri.status == "GREEN":
                greens += 1
    db.commit()
    db.commit()
    log_event(db, "KRI_RUN", str(current_user_email), f"KRI Engine run completed. Summary: {reds} Red, {yellows} Yellow, {greens} Green", trial_id=id)
    return {"message": "KRI run completed", "summary": {"RED": reds, "YELLOW": yellows, "GREEN": greens}}
