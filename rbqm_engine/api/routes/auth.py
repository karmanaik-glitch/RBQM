from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from db.database import get_db
from db.models import User, Organisation, Invitation, Session as DBSession, PasswordResetToken, TOTPCredential, PlatformAdmin
from api.auth import get_password_hash, verify_password, create_access_token, get_current_user
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid
import pyotp
import resend
import os
from db.logger import log_event
from api.email_service import send_password_reset_email

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/auth", tags=["auth"])

resend.api_key = os.getenv("RESEND_API_KEY")

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="rbqm_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=int(os.getenv("TOKEN_EXPIRY_HOURS", "24")) * 3600,
        path="/"
    )

def clear_auth_cookie(response: Response):
    response.delete_cookie(key="rbqm_token", path="/", httponly=True, secure=True, samesite="strict")

class AcceptInviteRequest(BaseModel):
    token: str
    full_name: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class LoginResponse(BaseModel):
    requires_2fa: bool
    pre_token: Optional[str] = None
    user: Optional[dict] = None

class Verify2FARequest(BaseModel):
    pre_token: str
    totp_code: str

@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    platform_admin = None
    
    if not user:
        platform_admin = db.query(PlatformAdmin).filter(PlatformAdmin.email == form_data.username).first()
        if not platform_admin or not verify_password(form_data.password, platform_admin.hashed_pw):
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        actor = platform_admin
    else:
        if not verify_password(form_data.password, user.hashed_pw):
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        actor = user

    # Update last login
    actor.last_login = datetime.now(timezone.utc)
    db.commit()

    role = actor.role if hasattr(actor, "role") else "platform_admin"
    
    # 2FA Check
    if role in ["cro_admin", "central_monitor"]:
        # Check if 2FA is enabled
        totp = db.query(TOTPCredential).filter(TOTPCredential.user_id == actor.id).first()
        if totp and totp.is_enabled:
            # Issue a short-lived pre_token for 2FA verification
            pre_token = str(uuid.uuid4())
            # We can store this in the session table or a dedicated table, 
            # for simplicity we create a revoked session with the pre_token that gets activated, or a simple cache.
            # Using a simple cache or DB is needed. Let's just create a session but mark it special or use a JWT.
            # Actually, let's just use a special JWT.
            import jwt
            from api.auth import SECRET_KEY, ALGORITHM
            payload = {"sub": actor.email, "type": "pre_token", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
            encoded_pre = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
            return {"requires_2fa": True, "pre_token": encoded_pre}

    # Issue full token if no 2FA or not required
    token = create_access_token(actor, db)
    set_auth_cookie(response, token)
    log_event(db, "LOGIN", actor.email, "User logged in successfully")
    
    org_id = actor.org_id if hasattr(actor, "org_id") else None
    
    return {"requires_2fa": False, "user": {"id": actor.id, "email": actor.email, "role": role, "org_id": org_id}}


@router.post("/2fa/verify")
def verify_2fa(req: Verify2FARequest, response: Response, db: Session = Depends(get_db)):
    import jwt
    from api.auth import SECRET_KEY, ALGORITHM
    try:
        payload = jwt.decode(req.pre_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "pre_token":
            raise HTTPException(status_code=400, detail="Invalid token type")
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired pre-token")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    totp = db.query(TOTPCredential).filter(TOTPCredential.user_id == user.id).first()
    if not totp or not totp.is_enabled:
        raise HTTPException(status_code=400, detail="2FA not enabled")
        
    totp_obj = pyotp.TOTP(totp.secret)
    if not totp_obj.verify(req.totp_code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")
        
    token = create_access_token(user, db)
    set_auth_cookie(response, token)
    return {"message": "2FA verified", "user": {"id": user.id, "email": user.email, "role": user.role, "org_id": user.org_id}}

@router.get("/me")
def read_users_me(current_user = Depends(get_current_user)):
    org_id = current_user.org_id if hasattr(current_user, "org_id") else None
    org_name = current_user.organisation.name if org_id and current_user.organisation else None
    role = current_user.role if hasattr(current_user, "role") else "platform_admin"
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": role,
        "org_id": org_id,
        "org_name": org_name,
        "site_assignments": [sa.site_id for sa in getattr(current_user, "site_assignments", []) if sa.is_active]
    }

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("rbqm_token")
    if token:
        import jwt
        from api.auth import SECRET_KEY, ALGORITHM
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            jti = payload.get("jti")
            if jti:
                session_record = db.query(DBSession).filter(DBSession.jti == jti).first()
                if session_record:
                    session_record.revoked = True
                    session_record.revoked_at = datetime.now(timezone.utc)
                    db.commit()
        except Exception:
            pass
    clear_auth_cookie(response)
    return {"message": "Logged out successfully"}

@router.get("/validate-invite")
def validate_invite(token: str, db: Session = Depends(get_db)):
    invite = db.query(Invitation).filter(Invitation.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.is_used:
        raise HTTPException(status_code=410, detail="Invitation already used")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation expired")
        
    return {
        "email": invite.invited_email,
        "role": invite.role,
        "org_name": invite.organisation.name
    }

@router.post("/accept-invite")
@limiter.limit("5/minute")
def accept_invite(request: Request, response: Response, req: AcceptInviteRequest, db: Session = Depends(get_db)):
    invite = db.query(Invitation).filter(Invitation.token == req.token).first()
    if not invite or invite.is_used or invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
        
    user = User(
        email=invite.invited_email,
        hashed_pw=get_password_hash(req.password),
        full_name=req.full_name,
        org_id=invite.org_id,
        role=invite.role,
        invited_by=invite.invited_by,
        invite_accepted=True
    )
    db.add(user)
    
    invite.is_used = True
    invite.accepted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    log_event(db, "USER_REGISTERED", user.email, f"User accepted invite for org {invite.org_id}")
    
    token = create_access_token(user, db)
    set_auth_cookie(response, token)
    return {"user": {"id": user.id, "email": user.email, "role": user.role}}

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        # Invalidate previous tokens
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id, PasswordResetToken.is_used == False).update({"is_used": True})
        
        token_str = str(uuid.uuid4())
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token_str,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=int(os.getenv("RESET_TOKEN_EXPIRY_HOURS", "1")))
        )
        db.add(reset_token)
        db.commit()
        
        reset_link = f"{os.getenv('INVITE_BASE_URL')}/reset-password?token={token_str}"
        send_password_reset_email(user.email, reset_link)
            
    return {"message": "If that email is registered, you'll receive a reset link."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == req.token,
        PasswordResetToken.is_used == False
    ).first()
    
    if not reset_token or reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_pw = get_password_hash(req.new_password)
    reset_token.is_used = True
    
    # Revoke all sessions
    db.query(DBSession).filter(DBSession.user_id == user.id, DBSession.revoked == False).update({
        "revoked": True,
        "revoked_at": datetime.now(timezone.utc)
    })
    
    db.commit()
    log_event(db, "PASSWORD_RESET", user.email, "User reset their password")
    
    return {"message": "Password reset successfully"}

@router.get("/sessions")
def get_sessions(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    # Platform admin or user
    if hasattr(current_user, "org_id"):
        sessions = db.query(DBSession).filter(DBSession.user_id == current_user.id, DBSession.revoked == False).all()
    else:
        sessions = db.query(DBSession).filter(DBSession.platform_admin_id == current_user.id, DBSession.revoked == False).all()
        
    return [
        {
            "jti": s.jti,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "created_at": s.created_at,
            "last_seen": s.last_seen
        } for s in sessions
    ]

@router.delete("/sessions/{jti}")
def revoke_session(jti: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    session_record = db.query(DBSession).filter(DBSession.jti == jti).first()
    if not session_record:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if hasattr(current_user, "org_id") and session_record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    elif not hasattr(current_user, "org_id") and session_record.platform_admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
        
    session_record.revoked = True
    session_record.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Session revoked"}
