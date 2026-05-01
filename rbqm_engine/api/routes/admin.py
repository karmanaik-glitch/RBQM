from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from db.database import get_db
from db.models import User, Invitation, UserSiteAssignment, KRILibrary, StudyTeamMember, Trial, Site
from api.permissions import require_cro_admin
from api.auth import get_password_hash
import uuid
import resend
import os
from db.logger import log_event
from api.email_service import send_invite_email

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_cro_admin)])

class InviteUserRequest(BaseModel):
    email: str
    role: str

class UpdateUserRoleRequest(BaseModel):
    role: str
    is_active: bool

class AssignMonitorRequest(BaseModel):
    user_id: int

class KRILibraryItemRequest(BaseModel):
    kri_id: str
    kri_name: str
    domain: Optional[str] = None
    default_yellow: float
    default_red: float
    higher_is_worse: bool = True

class StudyTeamAssignRequest(BaseModel):
    user_id: int
    role_override: Optional[str] = None

@router.post("/users/invite")
def invite_user(request: Request, req: InviteUserRequest, db: Session = Depends(get_db)):
    role = getattr(request.state, "role", None)
    
    # Platform Admin can specify org_id, others use their own
    if role == "platform_admin":
        if not req.org_id:
            raise HTTPException(status_code=400, detail="Platform Admin must specify org_id for invitations")
        org_id = req.org_id
    else:
        org_id = request.state.org_id
        
    user_id = request.state.user_id
    
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
        
    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=int(os.getenv("INVITE_EXPIRY_HOURS", "72")))
    
    invite = Invitation(
        org_id=org_id,
        invited_email=req.email,
        role=req.role,
        token=token,
        invited_by=user_id,
        expires_at=expires_at
    )
    db.add(invite)
    db.commit()
    
    log_event(db, "INVITATION_SENT", f"Invited {req.email} with role {req.role} to org {org_id}", org_id=org_id, actor_id=user_id)
    
    invite_link = f"{os.getenv('INVITE_BASE_URL')}/accept-invite?token={token}"
    
    # Get the real org name for the email
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    org_name = org.name if org else "Vritas RBQM"
    
    send_invite_email(req.email, invite_link, req.role, org_name)
        
    return {"message": "Invitation sent", "invite_id": invite.id}

@router.get("/users")
def get_users(request: Request, db: Session = Depends(get_db)):
    role = getattr(request.state, "role", None)
    if role == "platform_admin":
        users = db.query(User).all()
    else:
        users = db.query(User).filter(User.org_id == request.state.org_id).all()
    
    return [
        {
            "id": u.id, 
            "email": u.email, 
            "full_name": u.full_name, 
            "role": u.role, 
            "is_active": u.is_active, 
            "last_login": u.last_login,
            "org_name": u.organisation.name if u.organisation else "N/A"
        } 
        for u in users
    ]

@router.put("/users/{user_id}")
def update_user(request: Request, user_id: int, req: UpdateUserRoleRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.org_id == request.state.org_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = req.role
    user.is_active = req.is_active
    db.commit()
    return {"message": "User updated"}

@router.delete("/users/{user_id}")
def delete_user(request: Request, user_id: int, db: Session = Depends(get_db)):
    # Platform Admin can delete anyone, CRO Admin can only delete from their org
    role = getattr(request.state, "role", None)
    if role == "platform_admin":
        user = db.query(User).filter(User.id == user_id).first()
    else:
        user = db.query(User).filter(User.id == user_id, User.org_id == request.state.org_id).first()
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"message": "User removed from system"}

@router.get("/invitations")
def get_invitations(request: Request, db: Session = Depends(get_db)):
    invites = db.query(Invitation).filter(Invitation.org_id == request.state.org_id).all()
    return [{"id": i.id, "email": i.invited_email, "role": i.role, "is_used": i.is_used, "expires_at": i.expires_at} for i in invites]

@router.delete("/invitations/{invite_id}")
def delete_invitation(request: Request, invite_id: int, db: Session = Depends(get_db)):
    invite = db.query(Invitation).filter(Invitation.id == invite_id, Invitation.org_id == request.state.org_id).first()
    if invite:
        db.delete(invite)
        db.commit()
    return {"message": "Invitation deleted"}

@router.post("/invitations/{invite_id}/resend")
def resend_invitation(request: Request, invite_id: int, db: Session = Depends(get_db)):
    invite = db.query(Invitation).filter(Invitation.id == invite_id, Invitation.org_id == request.state.org_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Not found")
        
    invite.token = str(uuid.uuid4())
    invite.expires_at = datetime.now(timezone.utc) + timedelta(hours=int(os.getenv("INVITE_EXPIRY_HOURS", "72")))
    db.commit()
    
    # Resend email logic here
    return {"message": "Invitation resent"}

@router.post("/sites/{site_id}/assign")
def assign_site(request: Request, site_id: int, req: AssignMonitorRequest, db: Session = Depends(get_db)):
    # Verify site belongs to org
    site = db.query(Site).join(Trial).filter(Site.id == site_id, Trial.org_id == request.state.org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    # Verify user belongs to org
    user = db.query(User).filter(User.id == req.user_id, User.org_id == request.state.org_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    assignment = UserSiteAssignment(
        user_id=user.id,
        site_id=site.id,
        study_id=site.trial_id,
        assigned_by=request.state.user_id
    )
    db.add(assignment)
    db.commit()
    return {"message": "Assigned successfully"}

@router.delete("/sites/{site_id}/assign/{user_id}")
def remove_assignment(request: Request, site_id: int, user_id: int, db: Session = Depends(get_db)):
    site = db.query(Site).join(Trial).filter(Site.id == site_id, Trial.org_id == request.state.org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    assignment = db.query(UserSiteAssignment).filter(
        UserSiteAssignment.user_id == user_id, 
        UserSiteAssignment.site_id == site_id
    ).first()
    
    if assignment:
        db.delete(assignment)
        db.commit()
    return {"message": "Assignment removed"}

@router.get("/sites/{site_id}/monitors")
def get_site_monitors(request: Request, site_id: int, db: Session = Depends(get_db)):
    site = db.query(Site).join(Trial).filter(Site.id == site_id, Trial.org_id == request.state.org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    assignments = db.query(UserSiteAssignment).filter(UserSiteAssignment.site_id == site_id).all()
    monitors = []
    for a in assignments:
        u = db.query(User).filter(User.id == a.user_id).first()
        if u:
            monitors.append({"id": u.id, "email": u.email, "full_name": u.full_name})
    return monitors

@router.get("/kri-library")
def get_kri_library(request: Request, db: Session = Depends(get_db)):
    items = db.query(KRILibrary).filter(KRILibrary.org_id == request.state.org_id).all()
    return items

@router.post("/kri-library")
def add_kri_library(request: Request, req: KRILibraryItemRequest, db: Session = Depends(get_db)):
    item = KRILibrary(
        org_id=request.state.org_id,
        kri_id=req.kri_id,
        kri_name=req.kri_name,
        domain=req.domain,
        default_yellow=req.default_yellow,
        default_red=req.default_red,
        higher_is_worse=req.higher_is_worse,
        created_by=request.state.user_id
    )
    db.add(item)
    db.commit()
    return {"message": "Added to KRI library"}

@router.get("/study-team/{study_id}")
def get_study_team(request: Request, study_id: int, db: Session = Depends(get_db)):
    trial = db.query(Trial).filter(Trial.id == study_id, Trial.org_id == request.state.org_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Study not found")
        
    team = db.query(StudyTeamMember).filter(StudyTeamMember.study_id == study_id).all()
    return team

@router.post("/study-team/{study_id}")
def add_study_team(request: Request, study_id: int, req: StudyTeamAssignRequest, db: Session = Depends(get_db)):
    trial = db.query(Trial).filter(Trial.id == study_id, Trial.org_id == request.state.org_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Study not found")
        
    member = StudyTeamMember(
        study_id=study_id,
        user_id=req.user_id,
        role_override=req.role_override,
        assigned_by=request.state.user_id
    )
    db.add(member)
    db.commit()
    return {"message": "Added to study team"}
