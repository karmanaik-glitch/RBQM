from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from db.models import Organisation, PlatformAdmin, SponsorStudyAccess, Trial
from api.permissions import require_platform_admin
from api.auth import get_password_hash

router = APIRouter(prefix="/api/platform", tags=["platform"], dependencies=[Depends(require_platform_admin)])

class CreateOrgRequest(BaseModel):
    name: str
    slug: str
    max_users: int = 50
    subscription_tier: str = "standard"

class UpdateOrgRequest(BaseModel):
    name: str
    is_active: bool

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    full_name: str

class GrantSponsorAccessRequest(BaseModel):
    sponsor_org_id: int
    cro_org_id: int
    study_id: int

@router.post("/orgs")
def create_org(request: Request, req: CreateOrgRequest, db: Session = Depends(get_db)):
    org = db.query(Organisation).filter(Organisation.slug == req.slug).first()
    if org:
        raise HTTPException(status_code=400, detail="Organisation slug already exists")
        
    new_org = Organisation(
        name=req.name,
        slug=req.slug,
        max_users=req.max_users,
        subscription_tier=req.subscription_tier,
        created_by_platform_admin=True
    )
    db.add(new_org)
    db.commit()
    return {"message": "Organisation created", "org_id": new_org.id}

@router.get("/orgs")
def list_orgs(request: Request, db: Session = Depends(get_db)):
    orgs = db.query(Organisation).all()
    return orgs

@router.put("/orgs/{org_id}")
def update_org(request: Request, org_id: int, req: UpdateOrgRequest, db: Session = Depends(get_db)):
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
        
    org.name = req.name
    org.is_active = req.is_active
    db.commit()
    return {"message": "Organisation updated"}

@router.post("/admins")
def create_admin(request: Request, req: CreateAdminRequest, db: Session = Depends(get_db)):
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.email == req.email).first()
    if admin:
        raise HTTPException(status_code=400, detail="Admin already exists")
        
    new_admin = PlatformAdmin(
        email=req.email,
        hashed_pw=get_password_hash(req.password),
        full_name=req.full_name
    )
    db.add(new_admin)
    db.commit()
    return {"message": "Platform admin created", "admin_id": new_admin.id}

@router.post("/sponsor-access")
def grant_sponsor_access(request: Request, req: GrantSponsorAccessRequest, db: Session = Depends(get_db)):
    # Validate
    sponsor = db.query(Organisation).filter(Organisation.id == req.sponsor_org_id, Organisation.subscription_tier == "sponsor").first()
    if not sponsor:
        raise HTTPException(status_code=400, detail="Invalid sponsor org")
        
    trial = db.query(Trial).filter(Trial.id == req.study_id, Trial.org_id == req.cro_org_id).first()
    if not trial:
        raise HTTPException(status_code=400, detail="Invalid study or CRO org")
        
    access = SponsorStudyAccess(
        sponsor_org_id=req.sponsor_org_id,
        cro_org_id=req.cro_org_id,
        study_id=req.study_id,
        granted_by=request.state.user_id if hasattr(request.state, "user_id") else None
    )
    db.add(access)
    db.commit()
    return {"message": "Access granted"}

@router.delete("/sponsor-access/{access_id}")
def revoke_sponsor_access(request: Request, access_id: int, db: Session = Depends(get_db)):
    access = db.query(SponsorStudyAccess).filter(SponsorStudyAccess.id == access_id).first()
    if access:
        db.delete(access)
        db.commit()
    return {"message": "Access revoked"}
