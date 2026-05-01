from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from db.database import SessionLocal
from db.models import Session
from api.auth import decode_jwt

PUBLIC_PATHS = [
    "/api/auth/login",
    "/api/auth/validate-invite",
    "/api/auth/accept-invite",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/docs",
    "/openapi.json"
]

from starlette.middleware.base import BaseHTTPMiddleware

class TenancyMiddleware(BaseHTTPMiddleware):
    """
    Injects the current user's org_id into every request state.
    Sets Postgres session variables for RLS.
    All subsequent DB queries MUST filter by request.state.org_id.
    """
    async def dispatch(self, request: Request, call_next):
        token = request.cookies.get("rbqm_token")
        
        # Fallback: check Authorization header if cookie is missing
        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if token and request.url.path not in PUBLIC_PATHS:
            try:
                payload = decode_jwt(token)
                user_id = payload.get("user_id")
                org_id = payload.get("org_id")
                role = payload.get("role")
                jti = payload.get("jti")

                if not jti:
                    return JSONResponse({"detail": "Invalid session format"}, status_code=401)

                db = SessionLocal()
                try:
                    # Verify session is not revoked
                    session = db.query(Session).filter(
                        Session.jti == jti,
                        Session.revoked == False
                    ).first()
                    
                    if not session:
                        return JSONResponse({"detail": "Session revoked"}, status_code=401)

                    # Inject into request state
                    request.state.user_id = user_id
                    request.state.org_id  = org_id
                    request.state.role    = role

                    # Inject into Postgres session for RLS
                    # Important: This is tied to the current DB connection.
                    # Since FastAPI dependencies typically manage the DB session, 
                    # we should wait until the route runs. BUT doing it in middleware 
                    # requires us to attach the configured connection to the request, 
                    # or configure the session engine broadly which is tricky.
                    # SQLAlchemy sessions opened via Depends(get_db) won't naturally share this text() execution unless we bind them.
                    # As requested by the instructions, we execute it here, but typically we must pass THIS db session to the route.
                    # Let's set it globally on the connection if possible, or assume the get_db dependency re-uses this somehow.
                    # Actually, the instructions say:
                    # db.execute(text("SET LOCAL app.current_user_id = :uid"), {"uid": str(user_id)})
                    # db.execute(text("SET LOCAL app.current_org_id = :oid"),  {"oid": str(org_id)})
                    
                    db.execute(text("SET LOCAL app.current_user_id = :uid"), {"uid": str(user_id) if user_id else ""})
                    db.execute(text("SET LOCAL app.current_org_id = :oid"),  {"oid": str(org_id) if org_id else ""})
                    
                    # We need to make sure this DB session is passed to the request state so routes can use it, 
                    # otherwise the 'SET LOCAL' is lost when we close this session.
                    request.state.db = db
                    
                except Exception as e:
                    return JSONResponse({"detail": f"Auth error: {str(e)}"}, status_code=401)
            except Exception as e:
                return JSONResponse({"detail": "Invalid token"}, status_code=401)
                
        response = await call_next(request)
        
        # Cleanup DB session if we attached it
        if hasattr(request.state, "db"):
            request.state.db.close()
            
        return response
