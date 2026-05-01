"""
api/main.py — FastAPI Application
-----------------------------------
Start the server:
    uvicorn api.main:app --reload

Interactive API docs:
    http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from api.routes.kri import router as kri_router
from api.routes.lock import router as lock_router
from api.routes.report import router as report_router
from api.routes.auth import router as auth_router, limiter
from api.routes.trials import router as trials_router
from api.routes.ingest import router as ingest_router
from api.routes.actions import router as actions_router
from api.routes.admin import router as admin_router
from api.routes.platform import router as platform_router
from api.middleware.tenancy import TenancyMiddleware
from db.database import init_db

app = FastAPI(
    title        = "RBQM KRI Engine API",
    description  = "Risk-Based Quality Management — ICH E6 R3 Aligned KRI Engine",
    version      = "1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

import os

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    base_url = frontend_url.rstrip('/')
    origins.append(base_url)
    origins.append(f"{base_url}/")

app.add_middleware(TenancyMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = origins,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
    expose_headers    = ["*"]
)

from fastapi.responses import JSONResponse
import logging

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Global error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true"
        }
    )

app.include_router(kri_router)
app.include_router(lock_router)
app.include_router(report_router)
app.include_router(auth_router)
app.include_router(trials_router)
app.include_router(ingest_router)
app.include_router(actions_router)
app.include_router(admin_router)
app.include_router(platform_router)

@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {
        "service":  "RBQM KRI Engine",
        "version":  "1.0.0",
        "docs":     "/docs",
        "endpoints": [
            "GET  /api/kri/summary",
            "GET  /api/kri/sites",
            "GET  /api/kri/site/{site_id}",
            "GET  /api/kri/alerts",
            "GET  /api/kri/domain/{domain_name}",
        ]
    }
