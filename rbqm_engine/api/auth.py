import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import User, Session as DBSession

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "rbqm-platform-secret-2024-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = int(os.getenv("TOKEN_EXPIRY_HOURS", "24"))

# Use PBKDF2-SHA256 for maximum compatibility across environments (avoids bcrypt's 72-char limit)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def decode_jwt(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def create_access_token(user: User, db: Session, request: Request, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)
        
    jti = str(uuid.uuid4())
    
    # Capture device fingerprint
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Platform Admin doesn't have an org
    org_id = user.org_id if hasattr(user, "org_id") else None
    org_name = user.organisation.name if hasattr(user, "organisation") and user.organisation else None
    
    payload = {
        "sub": user.email,
        "jti": jti,
        "role": user.role if hasattr(user, "role") else "platform_admin",
        "org_id": org_id,
        "org_name": org_name,
        "user_id": user.id,
        "exp": int(expire.timestamp()),
    }
    
    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    # Write session record with device fingerprint
    session_record = DBSession(
        jti=jti,
        user_id=user.id if hasattr(user, "org_id") else None,
        platform_admin_id=user.id if not hasattr(user, "org_id") else None,
        ip_address=ip_address,
        user_agent=user_agent[:200],
        expires_at=expire
    )
    db.add(session_record)
    db.commit()
    
    return encoded_jwt

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("rbqm_token")
    
    # Fallback: check Authorization header if cookie is missing
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        jti: str = payload.get("jti")
        if email is None or jti is None:
            print(f"AUTH ERROR: Missing sub or jti in token: {payload}")
            raise credentials_exception
    except JWTError as e:
        print(f"AUTH ERROR: JWT Decode error: {str(e)}")
        raise credentials_exception
        
    # Check if session is valid and not revoked
    session_record = db.query(DBSession).filter(DBSession.jti == jti, DBSession.revoked == False).first()
    if not session_record:
        print(f"AUTH ERROR: Session {jti} not found or revoked")
        raise HTTPException(status_code=401, detail="Session revoked or invalid")
        
    # Could be User or PlatformAdmin
    if session_record.user_id:
        user = db.query(User).filter(User.id == session_record.user_id).first()
    else:
        from db.models import PlatformAdmin
        user = db.query(PlatformAdmin).filter(PlatformAdmin.id == session_record.platform_admin_id).first()
        
    if user is None:
        print(f"AUTH ERROR: User not found for session {jti}")
        raise credentials_exception
        
    # Normalize PlatformAdmin for downstream role/tenancy checks
    if not hasattr(user, "role"):
        user.role = "platform_admin"
    if not hasattr(user, "org_id"):
        user.org_id = None
        
    return user
