from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from db.database import get_db
from db.models import Alert, ActionItem, AuditLog, User, Comment, Trial, UserSiteAssignment, Site
from api.auth import get_current_user
from db.logger import log_event
from api.permissions import require_any_authenticated, require_study_access, require_platform_admin

router = APIRouter(prefix="/api/actions", tags=["actions"], dependencies=[Depends(require_any_authenticated)])

@router.get("/alerts")
def get_all_alerts(request: Request, db: Session = Depends(get_db)):
    role = request.state.role
    org_id = request.state.org_id
    user_id = request.state.user_id
    
    query = db.query(Alert)
    if role != "platform_admin":
        query = query.join(Trial).filter(Trial.org_id == org_id)
        if role == "site_monitor":
            assignments = db.query(UserSiteAssignment).filter(
                UserSiteAssignment.user_id == user_id,
                UserSiteAssignment.is_active == True
            ).all()
            assigned_site_ints = [a.site_id for a in assignments]
            db_sites = db.query(Site).filter(Site.id.in_(assigned_site_ints)).all()
            allowed_site_ids = set([s.site_id for s in db_sites])
            query = query.filter(Alert.site_ext_id.in_(allowed_site_ids))
    return query.all()

@router.get("/alerts/{trial_id}")
def get_trial_alerts(trial_id: int, request: Request, db: Session = Depends(get_db)):
    require_study_access(trial_id)(request)
    
    query = db.query(Alert).filter(Alert.trial_id == trial_id)
    if request.state.role == "site_monitor":
        assignments = db.query(UserSiteAssignment).filter(
            UserSiteAssignment.user_id == request.state.user_id,
            UserSiteAssignment.study_id == trial_id,
            UserSiteAssignment.is_active == True
        ).all()
        assigned_site_ints = [a.site_id for a in assignments]
        db_sites = db.query(Site).filter(Site.id.in_(assigned_site_ints)).all()
        allowed_site_ids = set([s.site_id for s in db_sites])
        query = query.filter(Alert.site_ext_id.in_(allowed_site_ids))
        
    return query.all()

@router.put("/alert/{id}")
def update_alert(id: int, req: dict, request: Request, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    require_study_access(alert.trial_id)(request)
    
    if "status" in req:
        alert.status = req["status"]
    db.commit()
    
    current_user_email = request.state.user_email if hasattr(request.state, "user_email") else request.state.user_id
    log_event(db, "ALERT_UPDATED", f"Alert {id} (KRI {alert.kri_id}) status updated to {alert.status}", org_id=request.state.org_id, study_id=alert.trial_id, actor_id=request.state.user_id)
    return alert

class ActionItemCreate(BaseModel):
    title: str
    description: str
    owner_name: str
    due_date: datetime

@router.post("/alert/{id}/item")
def create_action_item(id: int, req: ActionItemCreate, request: Request, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    require_study_access(alert.trial_id)(request)
    
    item = ActionItem(
        title=req.title,
        description=req.description,
        owner_name=req.owner_name,
        due_date=req.due_date,
        alert_id=id
    )
    db.add(item)
    db.commit()
    current_user_email = request.state.user_email if hasattr(request.state, "user_email") else request.state.user_id
    log_event(db, "ACTION_CREATED", f"Action item created for alert {id}: {req.title}", org_id=request.state.org_id, study_id=alert.trial_id, actor_id=request.state.user_id)
    return item

@router.get("/alert/{id}/items")
def get_action_items(id: int, request: Request, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if alert:
        require_study_access(alert.trial_id)(request)
    return db.query(ActionItem).filter(ActionItem.alert_id == id).all()

@router.put("/item/{id}")
def update_action_item(id: int, req: dict, request: Request, db: Session = Depends(get_db)):
    item = db.query(ActionItem).filter(ActionItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    alert = db.query(Alert).filter(Alert.id == item.alert_id).first()
    if alert:
        require_study_access(alert.trial_id)(request)
        
    if "status" in req:
        item.status = req["status"]
    db.commit()
    
    current_user_email = request.state.user_email if hasattr(request.state, "user_email") else request.state.user_id
    log_event(db, "ACTION_UPDATED", f"Action item {id} status updated to {item.status}", org_id=request.state.org_id, study_id=alert.trial_id if alert else None, actor_id=request.state.user_id)
    return item

@router.get("/audit-log")
def get_audit_log(request: Request, db: Session = Depends(get_db)):
    # By default, Platform Admins see all, CRO Admins see their org's logs.
    if request.state.role == "platform_admin":
        return db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    else:
        # For a more complete implementation, filter by trial_id in org.
        # But here we do a simple filter or return all if CRO Admin.
        # Ideally, AuditLog should have org_id. Assuming log_event uses trial_id.
        trials = db.query(Trial).filter(Trial.org_id == request.state.org_id).all()
        trial_ids = [t.id for t in trials]
        return db.query(AuditLog).filter(AuditLog.study_id.in_(trial_ids)).order_by(AuditLog.created_at.desc()).all()

@router.get("/my-items")
def get_my_items(request: Request, db: Session = Depends(get_db)):
    return db.query(ActionItem).filter(ActionItem.assigned_to == request.state.user_id).all()

class CommentCreate(BaseModel):
    text: str
    alert_id: Optional[int] = None
    action_item_id: Optional[int] = None

@router.post("/comment")
def add_comment(req: CommentCreate, request: Request, db: Session = Depends(get_db)):
    current_user_email = request.state.user_email if hasattr(request.state, "user_email") else request.state.user_id
    comment = Comment(
        text=req.text,
        user_email=str(current_user_email),
        alert_id=req.alert_id,
        action_item_id=req.action_item_id
    )
    db.add(comment)
    db.commit()
    
    # Log event
    detail = f"Comment added to {'alert ' + str(req.alert_id) if req.alert_id else 'action item ' + str(req.action_item_id)}"
    trial_id = None
    if req.alert_id:
        alert = db.query(Alert).filter(Alert.id == req.alert_id).first()
        if alert: trial_id = alert.trial_id
    elif req.action_item_id:
        item = db.query(ActionItem).filter(ActionItem.id == req.action_item_id).first()
        if item:
            alert = db.query(Alert).filter(Alert.id == item.alert_id).first()
            if alert: trial_id = alert.trial_id

    log_event(db, "COMMENT_ADDED", detail, org_id=request.state.org_id, study_id=trial_id, actor_id=request.state.user_id)
    return comment

@router.get("/alert/{id}/comments")
def get_alert_comments(id: int, request: Request, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if alert:
        require_study_access(alert.trial_id)(request)
    return db.query(Comment).filter(Comment.alert_id == id).all()

