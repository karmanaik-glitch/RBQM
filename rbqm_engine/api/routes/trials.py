from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from db.database import get_db
from db.models import Trial, Site, User
from api.auth import get_current_user
from db.logger import log_event
from api.permissions import require_study_access, require_any_authenticated, require_cro_admin

router = APIRouter(prefix="/api/trials", tags=["trials"])

class SiteCreate(BaseModel):
    site_id: str
    site_name: str
    country: str
    target_enrollment: int

class TrialCreate(BaseModel):
    trial_id: str
    title: str
    phase: str
    therapeutic_area: str
    indication: str
    sponsor_name: str
    target_lock_date: datetime
    sites: List[SiteCreate]
    org_id: Optional[int] = None

@router.post("", dependencies=[Depends(require_cro_admin)])
def create_trial(request: Request, req: TrialCreate, db: Session = Depends(get_db)):
    trial = db.query(Trial).filter(Trial.trial_id == req.trial_id).first()
    if trial:
        raise HTTPException(status_code=400, detail="Trial already exists")
    
    role = getattr(request.state, "role", None)
    if role == "platform_admin":
        if not req.org_id:
            raise HTTPException(status_code=400, detail="Platform Admin must specify org_id for trials")
        org_id = req.org_id
    else:
        org_id = request.state.org_id
        
    new_trial = Trial(
        trial_id=req.trial_id,
        title=req.title,
        phase=req.phase,
        therapeutic_area=req.therapeutic_area,
        indication=req.indication,
        sponsor_name=req.sponsor_name,
        target_lock_date=req.target_lock_date,
        org_id=org_id
    )
    db.add(new_trial)
    db.commit()
    db.refresh(new_trial)
    
    for s in req.sites:
        new_site = Site(
            site_id=s.site_id,
            site_name=s.site_name,
            country=s.country,
            target_enrollment=s.target_enrollment,
            trial_id=new_trial.id
        )
        db.add(new_site)
    db.commit()
    return {"message": "Trial created successfully", "id": new_trial.id, "trial_id": new_trial.trial_id}
@router.get("", dependencies=[Depends(require_any_authenticated)])
def get_trials(request: Request, db: Session = Depends(get_db)):
    if request.state.role == "platform_admin":
        trials = db.query(Trial).all()
    else:
        trials = db.query(Trial).filter(Trial.org_id == request.state.org_id).all()
    res = []
    for t in trials:
        site_count = db.query(Site).filter(Site.trial_id == t.id).count()
        res.append({
            "id": t.id,
            "trial_id": t.trial_id,
            "title": t.title,
            "phase": t.phase,
            "status": t.status,
            "target_lock_date": t.target_lock_date,
            "site_count": site_count
        })
    return res

@router.get("/{id}")
def get_trial(id: int, request: Request, db: Session = Depends(get_db)):
    # Note: require_study_access dependency can be applied at router method level or within
    require_study_access(id)(request)
    t = db.query(Trial).filter(Trial.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trial not found")
    return t

@router.put("/{id}", dependencies=[Depends(require_cro_admin)])
def update_trial(id: int, request: Request, req: dict, db: Session = Depends(get_db)):
    require_study_access(id)(request)
    t = db.query(Trial).filter(Trial.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trial not found")
    for k, v in req.items():
        setattr(t, k, v)
    db.commit()
    return {"message": "Updated"}

@router.delete("/{id}", dependencies=[Depends(require_cro_admin)])
def delete_trial(id: int, request: Request, db: Session = Depends(get_db)):
    require_study_access(id)(request)
    t = db.query(Trial).filter(Trial.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trial not found")
    db.delete(t)
    db.commit()
    return {"message": "Deleted"}

@router.get("/{id}/sites")
def get_trial_sites(id: int, request: Request, db: Session = Depends(get_db)):
    require_study_access(id)(request)
    # The 'Sight Lines' principle: site monitors only see assigned sites
    if request.state.role == "site_monitor":
        from db.models import UserSiteAssignment
        assignments = db.query(UserSiteAssignment).filter(
            UserSiteAssignment.user_id == request.state.user_id,
            UserSiteAssignment.study_id == id,
            UserSiteAssignment.is_active == True
        ).all()
        assigned_site_ids = [a.site_id for a in assignments]
        sites = db.query(Site).filter(Site.trial_id == id, Site.id.in_(assigned_site_ids)).all()
    else:
        sites = db.query(Site).filter(Site.trial_id == id).all()
    return sites

@router.post("/{id}/sites", dependencies=[Depends(require_cro_admin)])
def add_trial_site(id: int, request: Request, req: SiteCreate, db: Session = Depends(get_db)):
    require_study_access(id)(request)
    new_site = Site(
        site_id=req.site_id,
        site_name=req.site_name,
        country=req.country,
        target_enrollment=req.target_enrollment,
        trial_id=id
    )
    db.add(new_site)
    db.commit()
    return {"message": "Site added"}
