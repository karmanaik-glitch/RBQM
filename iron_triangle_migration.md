# RBQM PLATFORM — IRON TRIANGLE AUTH MIGRATION
# Complete handover prompt for AI IDE (Google Project IDX / Cursor / Windsurf)
# Replace the current flat auth system with a multi-tenant, role-based,
# site-scoped security architecture.

---

## IMPORTANT PRE-READ NOTES

1. **Zero existing users.** The database is empty. There is no user data to
   migrate or backfill. All migration steps that reference "backfill" in
   older versions of this spec are removed. Start clean.

2. **Invite-only onboarding via email.** There is no self-registration.
   Every user account is created by a CRO Admin or Platform Admin sending an
   email invitation via the Resend API. The invited user clicks the link in
   their email, sets a password, and is immediately logged in.

3. **JWT stored in httpOnly cookies, not localStorage.** This is a security
   requirement for a GxP-adjacent platform. localStorage is XSS-vulnerable.
   All auth tokens travel via httpOnly, SameSite=Strict cookies only.

---

## CONTEXT — WHAT EXISTS TODAY

The platform is a working RBQM (Risk-Based Quality Management) tool for
clinical trials. Stack: FastAPI + SQLAlchemy + Supabase PostgreSQL +
React TypeScript + Tailwind CSS v3.

Current auth is basic and flat:
- Single users table with a role string column
- No tenant isolation
- No site-level scoping
- Public /register endpoint (anyone can sign up)
- JWT stored in localStorage

This must be completely replaced with the Iron Triangle architecture described
below. Do NOT preserve the old auth system. Migrate cleanly. The database is
empty, so there is no user or session data to preserve.

---

## THE IRON TRIANGLE — CORE SECURITY MODEL

Every API request is validated against three intersecting rules simultaneously:

```
┌─────────────────────────────────────────────────────┐
│                  IRON TRIANGLE                       │
│                                                      │
│   1. TENANCY     2. ROLE        3. CONTEXT          │
│   "Which CRO?"  "What job?"    "Which Study/Site?"  │
│                                                      │
│   All three must pass. Fail any one → 403 Forbidden. │
└─────────────────────────────────────────────────────┘
```

**Rule 1 — Tenancy (The Invisible Wall)**
- Every user belongs to exactly one CRO (tenant) permanently
- A user from CRO Alpha cannot see, query, or interact with ANY data
  from CRO Beta
- This is enforced at the database query level — every query is filtered
  by org_id
- The wall is invisible: the system behaves as if other tenants do not exist
- No role can bypass this except the Platform Super Admin

**Rule 2 — Role (The Permission Layer)**
- Five roles with strict capability boundaries (defined below, includes the
  new Sponsor Viewer role)
- Roles are assigned at account creation by the CRO Admin or Platform Admin
- A user cannot change their own role

**Rule 3 — Context (The Site Geofence)**
- Site Monitors are explicitly assigned to specific sites within a study
- They can ONLY see data for their assigned sites
- This assignment is stored in a pivot table: user_site_assignments
- Central Monitors and CRO Admins have no site restriction within their tenant
- The "Sight Lines" principle applies everywhere: absent data, not denied data

---

## PART 1 — DATABASE MIGRATION

### 1.0 Schema philosophy

Since there are zero existing users, the migration is purely additive. Create
all tables fresh. Use Supabase migration files stored in `supabase/migrations/`
with timestamped filenames (e.g. `20240101000001_iron_triangle_auth.sql`).
This ensures the schema is version-controlled and reproducible across
local dev, staging, and production.

Run migrations via Supabase CLI:
```bash
supabase db push
# or during development:
supabase migration up
```

### 1.1 Users table — full definition

```sql
-- supabase/migrations/20240101000001_iron_triangle_auth.sql

CREATE TABLE organisations (
    id                          SERIAL PRIMARY KEY,
    name                        VARCHAR(200) NOT NULL,
    slug                        VARCHAR(100) UNIQUE NOT NULL,
    is_active                   BOOLEAN DEFAULT TRUE,
    max_users                   INTEGER DEFAULT 50,
    subscription_tier           VARCHAR(50) DEFAULT 'standard',
    created_by_platform_admin   BOOLEAN DEFAULT FALSE,
    created_at                  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(200) UNIQUE NOT NULL,
    hashed_pw       VARCHAR(200) NOT NULL,
    full_name       VARCHAR(200),
    org_id          INTEGER NOT NULL REFERENCES organisations(id),
    role            VARCHAR(50) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    invited_by      INTEGER REFERENCES users(id),
    invite_accepted BOOLEAN DEFAULT FALSE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 1.2 New tables to create

**user_site_assignments** — The geofence pivot table
```sql
CREATE TABLE user_site_assignments (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id     INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    study_id    INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active   BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, site_id, study_id)
);
```

**kri_library** — CRO-level KRI configuration (per-tenant KRI definitions)
```sql
CREATE TABLE kri_library (
    id              SERIAL PRIMARY KEY,
    org_id          INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    kri_id          VARCHAR(10) NOT NULL,
    kri_name        VARCHAR(200) NOT NULL,
    domain          VARCHAR(100),
    default_yellow  FLOAT,
    default_red     FLOAT,
    higher_is_worse BOOLEAN DEFAULT TRUE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, kri_id)
);
```

**study_kri_config** — Per-study KRI threshold overrides
```sql
CREATE TABLE study_kri_config (
    id               SERIAL PRIMARY KEY,
    study_id         INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    kri_id           VARCHAR(10) NOT NULL,
    yellow_threshold FLOAT,
    red_threshold    FLOAT,
    is_active        BOOLEAN DEFAULT TRUE,
    set_by           INTEGER REFERENCES users(id),
    set_at           TIMESTAMP DEFAULT NOW(),
    UNIQUE(study_id, kri_id)
);
```

**invitations** — Pending invite tracking
```sql
CREATE TABLE invitations (
    id              SERIAL PRIMARY KEY,
    org_id          INTEGER NOT NULL REFERENCES organisations(id),
    invited_email   VARCHAR(200) NOT NULL,
    role            VARCHAR(50) NOT NULL,
    token           VARCHAR(200) UNIQUE NOT NULL,
    invited_by      INTEGER NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP NOT NULL,
    accepted_at     TIMESTAMP,
    is_used         BOOLEAN DEFAULT FALSE
);
```

**platform_admins** — Platform-level super admins (separate from CRO users)
```sql
CREATE TABLE platform_admins (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(200) UNIQUE NOT NULL,
    hashed_pw   VARCHAR(200) NOT NULL,
    full_name   VARCHAR(200),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

**sessions** — Active session tracking (for GxP compliance + session revocation)
```sql
CREATE TABLE sessions (
    id          SERIAL PRIMARY KEY,
    jti         VARCHAR(200) UNIQUE NOT NULL,  -- JWT ID claim
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform_admin_id INTEGER REFERENCES platform_admins(id) ON DELETE CASCADE,
    ip_address  VARCHAR(50),
    user_agent  VARCHAR(500),
    created_at  TIMESTAMP DEFAULT NOW(),
    last_seen   TIMESTAMP DEFAULT NOW(),
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    revoked_at  TIMESTAMP
);
```

**password_reset_tokens** — For forgot-password flow
```sql
CREATE TABLE password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(200) UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    expires_at  TIMESTAMP NOT NULL,
    is_used     BOOLEAN DEFAULT FALSE
);
```

**audit_log** — Fully Iron Triangle-scoped audit trail
```sql
CREATE TABLE audit_log (
    id          SERIAL PRIMARY KEY,
    org_id      INTEGER REFERENCES organisations(id),  -- NULL for platform-level events
    study_id    INTEGER REFERENCES trials(id),         -- NULL for org-level events
    site_id     INTEGER REFERENCES sites(id),          -- NULL for study-level events
    actor_id    INTEGER,                               -- user.id or platform_admin.id
    actor_role  VARCHAR(50),
    action      VARCHAR(200) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   INTEGER,
    detail      JSONB,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

**sponsor_study_access** — Cross-tenant read-only access for Sponsor Viewer role
```sql
CREATE TABLE sponsor_study_access (
    id          SERIAL PRIMARY KEY,
    sponsor_org_id  INTEGER NOT NULL REFERENCES organisations(id),
    cro_org_id      INTEGER NOT NULL REFERENCES organisations(id),
    study_id        INTEGER NOT NULL REFERENCES trials(id),
    granted_by      INTEGER REFERENCES platform_admins(id),
    granted_at      TIMESTAMP DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE(sponsor_org_id, study_id)
);
```

**totp_credentials** — 2FA for CRO Admins and Central Monitors
```sql
CREATE TABLE totp_credentials (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret          VARCHAR(200) NOT NULL,   -- encrypted TOTP secret
    is_enabled      BOOLEAN DEFAULT FALSE,
    backup_codes    TEXT[],                  -- hashed backup codes
    enabled_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

**study_team_members** — Optional study-level user scoping (Central Monitors can
be restricted to specific studies rather than seeing all org studies)
```sql
CREATE TABLE study_team_members (
    id              SERIAL PRIMARY KEY,
    study_id        INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_override   VARCHAR(50),           -- NULL = inherit user.role
    assigned_by     INTEGER REFERENCES users(id),
    assigned_at     TIMESTAMP DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE(study_id, user_id)
);
```

### 1.3 SQLAlchemy Models

Update `db/models.py` with all new tables and relationships.

Key relationships to define:
```python
# User → Organisation (many-to-one, mandatory)
# User → user_site_assignments (one-to-many)
# User → invitations sent (one-to-many, invited_by)
# User → sessions (one-to-many)
# User → totp_credentials (one-to-one)
# Organisation → users (one-to-many)
# Organisation → trials (one-to-many)
# Organisation → kri_library (one-to-many)
# Trial → study_kri_config (one-to-many)
# Trial → user_site_assignments (one-to-many)
# Trial → study_team_members (one-to-many)
# Site → user_site_assignments (one-to-many)
```

### 1.4 Supabase Row Level Security (RLS)

**CRITICAL — Custom JWT vs Supabase Auth**

This platform uses a **custom FastAPI JWT**, not Supabase Auth (GoTrue).
This means `auth.uid()` is always NULL inside RLS policies and will silently
allow everything or block everything depending on policy logic. Do NOT use
`auth.uid()` in any RLS policy.

Instead, FastAPI injects the current user's ID into the Postgres session as a
local variable before executing any query:

```python
# In api/middleware/tenancy.py, before each query:
db.execute(
    text("SET LOCAL app.current_user_id = :uid"),
    {"uid": str(current_user.id)}
)
db.execute(
    text("SET LOCAL app.current_org_id = :oid"),
    {"oid": str(current_user.org_id)}
)
```

RLS policies then read these session variables:
```sql
-- Correct pattern for all tables
ALTER TABLE trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their org trials"
ON trials FOR ALL
USING (
    org_id = current_setting('app.current_org_id', true)::integer
);

-- For tables with site-level scoping (e.g. kri_snapshots):
CREATE POLICY "Site monitors see only assigned sites"
ON kri_snapshots FOR SELECT
USING (
    -- CRO Admins and Central Monitors: org match is sufficient
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = current_setting('app.current_user_id', true)::integer
          AND u.org_id = (SELECT org_id FROM trials t WHERE t.id = kri_snapshots.trial_id)
          AND u.role IN ('cro_admin', 'central_monitor')
    )
    OR
    -- Site Monitors: must have explicit assignment
    EXISTS (
        SELECT 1 FROM user_site_assignments usa
        WHERE usa.user_id = current_setting('app.current_user_id', true)::integer
          AND usa.site_id = kri_snapshots.site_id
          AND usa.is_active = TRUE
    )
);
```

Apply `current_setting`-based RLS to:
trials, sites, uploads, kri_snapshots, alerts, action_items,
user_site_assignments, kri_library, study_kri_config, invitations,
audit_log, study_team_members.

Note: RLS is a second layer of defence. The primary enforcement is in
FastAPI middleware. Both must be in place.

---

## PART 2 — ROLE DEFINITIONS

### Roles enum (use exactly these strings in database):
```python
class UserRole(str, Enum):
    PLATFORM_ADMIN  = "platform_admin"   # Platform owner — can create CROs
    CRO_ADMIN       = "cro_admin"        # Tenant gatekeeper
    CENTRAL_MONITOR = "central_monitor"  # Study-wide analyst
    SITE_MONITOR    = "site_monitor"     # Site-geofenced field worker
    SPONSOR_VIEWER  = "sponsor_viewer"   # Cross-tenant read-only (Sponsor company)
```

### Permissions matrix:

| Action | platform_admin | cro_admin | central_monitor | site_monitor | sponsor_viewer |
|---|---|---|---|---|---|
| Create CRO/Organisation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deactivate users | ✅ | ✅ (own org) | ❌ | ❌ | ❌ |
| Create study | ✅ | ✅ | ❌ | ❌ | ❌ |
| View studies (own org) | ✅ | ✅ | ✅ (all or assigned) | ❌ (assigned only) | ✅ (granted only) |
| Assign KRIs to study | ✅ | ✅ | ✅ | ❌ | ❌ |
| Set KRI thresholds | ✅ | ✅ | ✅ | ❌ | ❌ |
| Trigger KRI engine | ✅ | ✅ | ✅ | ❌ | ❌ |
| Upload EDC data | ✅ | ✅ | ✅ | ✅ (assigned sites) | ❌ |
| View KRI results | ✅ | ✅ | ✅ (all sites) | ✅ (assigned sites) | ✅ (read-only) |
| View lock readiness | ✅ | ✅ | ✅ | ✅ (own sites) | ✅ (read-only) |
| Generate AI report | ✅ | ✅ | ✅ | ❌ | ❌ |
| Download PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage KRI library | ✅ | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ (own org) | ✅ (own studies) | ❌ | ❌ |
| Assign site monitors | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cross-tenant data access | ✅ | ❌ | ❌ | ❌ | ✅ (granted studies only) |
| Manage own sessions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enable/disable 2FA | N/A | ✅ (required) | ✅ (required) | Optional | Optional |

### Sponsor Viewer — Special cross-tenant role

The Sponsor Viewer belongs to a **Sponsor Organisation** (a separate org entry
with subscription_tier = 'sponsor'). They are granted read-only access to
specific studies belonging to CRO orgs by a Platform Admin.

The grant is stored in `sponsor_study_access`. When a Sponsor Viewer queries
data, the tenancy middleware detects their role and queries the
sponsor_study_access table to determine which studies they can see, across
which CRO orgs. They cannot see any data outside their granted studies.

---

## PART 3 — BACKEND CHANGES

### 3.1 Authentication — httpOnly Cookies (not localStorage)

**All JWT tokens are issued as httpOnly, SameSite=Strict cookies.**

```python
# In FastAPI login endpoint:
from fastapi import Response

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="rbqm_token",
        value=token,
        httponly=True,
        secure=True,           # HTTPS only
        samesite="strict",
        max_age=86400,         # 24 hours (matches TOKEN_EXPIRY_HOURS)
        path="/"
    )

def clear_auth_cookie(response: Response):
    response.delete_cookie(key="rbqm_token", path="/")
```

Reading the token on each request:
```python
from fastapi import Cookie

async def get_current_user(rbqm_token: str = Cookie(None), db = Depends(get_db)):
    if not rbqm_token:
        raise HTTPException(status_code=401)
    # decode JWT, verify jti not revoked in sessions table
    ...
```

The frontend API client sends requests with `credentials: 'include'` so the
browser automatically attaches the cookie. The client never touches the token
directly — it has no access to an httpOnly cookie.

### 3.2 JWT — include jti for session revocation

Every JWT must include a `jti` (JWT ID) claim. On every request, verify the
jti exists in the sessions table and is not revoked.

```python
import uuid

def create_access_token(user: User) -> str:
    payload = {
        "sub":      user.email,
        "jti":      str(uuid.uuid4()),     # unique per session
        "role":     user.role,
        "org_id":   user.org_id,
        "org_name": user.organisation.name,
        "user_id":  user.id,
        "exp":      datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    # Write session record
    session = Session(
        jti=payload["jti"],
        user_id=user.id,
        expires_at=payload["exp"]
    )
    db.add(session)
    db.commit()
    return token
```

On logout:
```python
# Mark session as revoked — token is now dead even if not yet expired
session.revoked = True
session.revoked_at = datetime.utcnow()
db.commit()
```

### 3.3 Tenancy middleware

Create `api/middleware/tenancy.py`:

```python
class TenancyMiddleware:
    """
    Injects the current user's org_id into every request state.
    Sets Postgres session variables for RLS.
    All subsequent DB queries MUST filter by request.state.org_id.
    """
    async def __call__(self, request: Request, call_next):
        token = request.cookies.get("rbqm_token")
        if token and request.url.path not in PUBLIC_PATHS:
            payload   = decode_jwt(token)
            user_id   = payload.get("user_id")
            org_id    = payload.get("org_id")
            role      = payload.get("role")

            # Verify session is not revoked
            session = db.query(Session).filter(
                Session.jti == payload.get("jti"),
                Session.revoked == False
            ).first()
            if not session:
                return JSONResponse({"detail": "Session revoked"}, status_code=401)

            # Inject into request state
            request.state.user_id = user_id
            request.state.org_id  = org_id
            request.state.role    = role

            # Inject into Postgres session for RLS
            db.execute(text("SET LOCAL app.current_user_id = :uid"), {"uid": str(user_id)})
            db.execute(text("SET LOCAL app.current_org_id = :oid"),  {"oid": str(org_id)})

        response = await call_next(request)
        return response
```

### 3.4 Permission decorators

Create `api/permissions.py` with dependency functions:

```python
def require_cro_admin():
    """Only CRO Admin and Platform Admin."""

def require_central_monitor():
    """CRO Admin, Central Monitor, Platform Admin."""

def require_any_authenticated():
    """Any authenticated user in any role."""

def require_study_access(study_id: int):
    """
    Platform Admin:      always passes.
    CRO Admin / Central Monitor: passes if study belongs to their org.
                         If study_team_members is configured, Central Monitor
                         must also be in study_team_members for that study.
    Site Monitor:        passes only if they have an active site assignment
                         in this study.
    Sponsor Viewer:      passes only if sponsor_study_access grants this study.
    """

def require_site_access(site_id: int, study_id: int):
    """
    Platform Admin:      always passes.
    CRO Admin / Central Monitor: passes if site belongs to their org's study.
    Site Monitor:        passes only if this specific site is in their
                         user_site_assignments.
    Sponsor Viewer:      passes if parent study is in sponsor_study_access.
    """
```

Usage in routes:
```python
@router.get("/api/trials/{study_id}/kri")
def get_kri(
    study_id: int,
    user = Depends(require_study_access(study_id)),
    db   = Depends(get_db)
):
    # All DB queries must still filter by user.org_id.
    ...
```

### 3.5 Rate limiting on auth endpoints

Install: `pip install slowapi`

Apply rate limits using in-memory limiter (swap for Redis in production):

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/api/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):
    ...

@router.post("/api/auth/accept-invite")
@limiter.limit("5/minute")
async def accept_invite(request: Request, ...):
    ...

@router.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, ...):
    ...
```

### 3.6 Auth routes — complete list

**DELETE** the existing public `/api/auth/register` endpoint entirely.

**KEEP (unchanged logic, update cookie behaviour):**
```
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

**NEW auth routes:**
```
GET  /api/auth/validate-invite?token={token}   Validate invite token (used by frontend on mount)
POST /api/auth/accept-invite                   Accept invite + set password
POST /api/auth/forgot-password                 Send password reset email
POST /api/auth/reset-password                  Consume reset token + set new password
POST /api/auth/refresh                         Refresh JWT token (new jti, new session record)
GET  /api/auth/sessions                        List current user's active sessions
DELETE /api/auth/sessions/{jti}               Revoke a specific session
DELETE /api/auth/sessions                      Revoke all sessions except current
```

**Platform Admin routes:**
```
POST /api/platform/orgs                        Platform Admin: create new CRO
GET  /api/platform/orgs                        Platform Admin: list all CROs
PUT  /api/platform/orgs/{id}                   Platform Admin: update CRO
POST /api/platform/admins                      Platform Admin: create another platform admin
POST /api/platform/sponsor-access              Grant sponsor read access to a study
DELETE /api/platform/sponsor-access/{id}       Revoke sponsor access
```

**CRO Admin routes:**
```
POST   /api/admin/users/invite                 CRO Admin: invite user by email
GET    /api/admin/users                        CRO Admin: list all users in org
PUT    /api/admin/users/{id}                   CRO Admin: change role / deactivate
GET    /api/admin/invitations                  CRO Admin: list pending invites
DELETE /api/admin/invitations/{id}             CRO Admin: cancel pending invite
POST   /api/admin/invitations/{id}/resend      CRO Admin: resend invite (invalidates old token, issues new one)

POST   /api/admin/sites/{site_id}/assign       Assign site monitor to site
DELETE /api/admin/sites/{site_id}/assign/{user_id}  Remove assignment
GET    /api/admin/sites/{site_id}/monitors     List monitors assigned to site
GET    /api/admin/users/{user_id}/sites        List sites assigned to a user

GET    /api/admin/kri-library                  CRO's KRI library
POST   /api/admin/kri-library                  Add KRI to library
PUT    /api/admin/kri-library/{kri_id}         Update default thresholds
DELETE /api/admin/kri-library/{kri_id}         Remove KRI from library

GET    /api/admin/study-team/{study_id}        List users assigned to a study
POST   /api/admin/study-team/{study_id}        Assign user to study team
DELETE /api/admin/study-team/{study_id}/{user_id} Remove user from study team
```

### 3.7 Invite flow (backend logic)

```
CRO Admin hits POST /api/admin/users/invite
  → Validate email not already registered
  → Create invitations record with:
      - org_id (from admin's org — cannot be overridden)
      - role (from request body)
      - token (uuid4, cryptographically random)
      - expires_at (NOW + 72 hours)
  → Write to audit_log: action="invitation_sent", detail={email, role}
  → Send email via Resend API with invite link
  → Return: { "message": "Invitation sent", "invite_id": id }

GET /api/auth/validate-invite?token={token}
  → Lookup token in invitations table
  → If not found → 404
  → If is_used = TRUE → 410 Gone
  → If expires_at < NOW → 410 Gone
  → Return: { "org_name": "...", "role": "...", "email": "..." }

New user hits POST /api/auth/accept-invite with { token, full_name, password }
  → Re-validate token (same checks as above)
  → Hash password with bcrypt
  → Create user record:
      - email from invitation.invited_email
      - org_id from invitation.org_id (LOCKED — user cannot change this)
      - role from invitation.role (LOCKED — only admin can change)
      - invited_by from invitation.invited_by
      - invite_accepted = TRUE
  → Mark invitation: is_used = TRUE, accepted_at = NOW
  → Write to audit_log: action="user_registered"
  → Issue JWT, write session record
  → Set httpOnly cookie on response
  → Return: { "user": {...} } (no token in body — it's in the cookie)
```

### 3.8 Password reset flow

```
POST /api/auth/forgot-password with { email }
  → Always return 200 (do not reveal whether email exists — prevents enumeration)
  → If user exists:
      - Create password_reset_tokens record (expires_at = NOW + 1 hour)
      - Send email via Resend with reset link
      - Invalidate any previous unused tokens for this user

POST /api/auth/reset-password with { token, new_password }
  → Validate token exists, not used, not expired
  → Hash new password
  → Update user.hashed_pw
  → Mark token as used
  → Revoke ALL active sessions for this user (security: unknown actor reset pw)
  → Write to audit_log: action="password_reset"
  → Return 200
```

### 3.9 Two-Factor Authentication (CRO Admin + Central Monitor)

Install: `pip install pyotp`

Required for `cro_admin` and `central_monitor` roles. Optional for others.

```
GET  /api/auth/2fa/setup
  → Generate TOTP secret for current user
  → Return: { "secret": "...", "qr_url": "otpauth://totp/..." }
  → Do NOT save to DB yet — user must verify first

POST /api/auth/2fa/enable  with { totp_code }
  → Verify the code against the pending secret
  → If valid: save to totp_credentials, set is_enabled = TRUE
  → Generate and return backup codes (hash and store, show plaintext once)

POST /api/auth/2fa/disable  with { totp_code }
  → CRO Admin and Central Monitor CANNOT disable 2FA once enabled
  → Only Platform Admin can disable it for another user

POST /api/auth/login  (updated 2FA flow)
  → Step 1: verify email + password → return { "requires_2fa": true, "pre_token": "..." }
  → Step 2: POST /api/auth/2fa/verify with { pre_token, totp_code }
        → Verify TOTP code
        → Issue full JWT cookie
  → For roles without 2FA: step 1 issues the cookie directly
```

### 3.10 Session management

```
GET /api/auth/sessions
  → Return list of non-revoked sessions for current user:
    [{ jti, ip_address, user_agent, created_at, last_seen, is_current }]

DELETE /api/auth/sessions/{jti}
  → Revoke specific session (cannot revoke current session this way)
  → Write to audit_log

DELETE /api/auth/sessions
  → Revoke all sessions except the current one
  → Write to audit_log: action="all_other_sessions_revoked"
```

### 3.11 Modify ALL existing routes for tenancy

Every existing route must be audited and updated to filter by org_id.

**Pattern for every DB query:**
```python
# WRONG — returns all trials globally
trials = db.query(Trial).all()

# CORRECT — scoped to tenant
trials = db.query(Trial).filter(Trial.org_id == current_user.org_id).all()
```

Routes that need tenancy filter added:
- GET /api/trials → filter by org_id
- GET /api/kri/summary → only KRI snapshots for org's trials
- GET /api/kri/sites → only sites belonging to org's trials
- GET /api/kri/site/{id} → validate site belongs to org's trial
- GET /api/lock/trial → org-scoped
- GET /api/actions/alerts → org-scoped
- GET /api/report/pdf/{trial_id} → org-scoped
- GET /api/actions/audit-log → org-scoped, role-scoped (see 3.12 below)

Routes that need BOTH tenancy AND site-scoping for site monitors:
- GET /api/kri/sites → site monitors only see assigned sites
- GET /api/kri/site/{id} → site monitors blocked from unassigned sites
- GET /api/lock/site/{id} → same
- GET /api/actions/alerts/{trial_id} → site monitors see alerts for assigned sites only
- POST /api/ingest/{trial_id}/upload → site monitors upload for assigned sites only

Apply "Sight Lines" principle: do not return error messages for inaccessible
records. Simply do not include them in the result set. An absent row, not a
denied row.

### 3.12 Audit log — Iron Triangle-scoped

The audit_log table has org_id, study_id, site_id columns. All queries are
scoped according to the requesting user's role:

```python
def query_audit_log(user: User, db):
    q = db.query(AuditLog)
    if user.role == "platform_admin":
        pass                                            # sees everything
    elif user.role == "cro_admin":
        q = q.filter(AuditLog.org_id == user.org_id)   # own org only
    elif user.role == "central_monitor":
        # own org, plus studies they're assigned to
        assigned_study_ids = [...]
        q = q.filter(
            AuditLog.org_id == user.org_id,
            AuditLog.study_id.in_(assigned_study_ids)
        )
    else:
        raise HTTPException(status_code=403)            # site_monitor cannot view audit log
    return q.order_by(AuditLog.created_at.desc()).all()
```

### 3.13 KRI Library + threshold lookup with caching

The three-tier threshold lookup (study → org library → hardcoded) must cache
its results per request to avoid N+1 DB hits (20 KRIs × N sites).

```python
def get_threshold_overrides(study_id: int, org_id: int, db) -> dict:
    """
    Returns a dict keyed by kri_id with yellow and red values.
    Merges study-level overrides on top of org defaults.
    Result is cached in a local dict for the duration of the request.
    """
    cache = {}

    # Layer 1: org defaults
    org_kris = db.query(KRILibrary).filter(
        KRILibrary.org_id == org_id,
        KRILibrary.is_active == True
    ).all()
    for k in org_kris:
        cache[k.kri_id] = {"yellow": k.default_yellow, "red": k.default_red}

    # Layer 2: study overrides (win over org defaults)
    study_kris = db.query(StudyKRIConfig).filter(
        StudyKRIConfig.study_id == study_id,
        StudyKRIConfig.is_active == True
    ).all()
    for k in study_kris:
        cache[k.kri_id] = {"yellow": k.yellow_threshold, "red": k.red_threshold}

    # Layer 3: hardcoded engine defaults fill any remaining gaps
    return cache
```

Update `engine/kri_calculator.py` to accept this dict:
```python
def calculate_all_kris(data, site_id, threshold_overrides: dict = None):
    """
    threshold_overrides format:
    {
        "1.1": {"yellow": 4.0, "red": 8.0},
        "2.1": {"yellow": 97.0, "red": 90.0},
        ...
    }
    If a KRI's thresholds are not in the dict, the engine's own defaults apply.
    """
```

### 3.14 Invite email — Resend setup

Install: `pip install resend`

**IMPORTANT:** Resend requires a verified sending domain before emails will
deliver. Before deploying to production:
1. Create an account at resend.com
2. Go to Domains → Add Domain
3. Verify your domain by adding DNS TXT + MX records
4. Use your verified domain in the `from` field below

```python
import resend
resend.api_key = os.getenv("RESEND_API_KEY")

def send_invite_email(invited_email: str, org_name: str, role: str, token: str):
    invite_link = f"{os.getenv('INVITE_BASE_URL')}/accept-invite?token={token}"
    resend.Emails.send({
        "from":    f"RBQM Platform <noreply@{os.getenv('SENDING_DOMAIN')}>",
        "to":      invited_email,
        "subject": f"You've been invited to join {org_name} on RBQM Platform",
        "html": f"""
            <p>You've been invited to join <strong>{org_name}</strong>
               on RBQM Platform as a <strong>{role.replace('_', ' ').title()}</strong>.</p>
            <p><a href="{invite_link}">Accept Invitation</a></p>
            <p>This link expires in 72 hours.</p>
        """
    })

def send_password_reset_email(email: str, token: str):
    reset_link = f"{os.getenv('INVITE_BASE_URL')}/reset-password?token={token}"
    resend.Emails.send({
        "from":    f"RBQM Platform <noreply@{os.getenv('SENDING_DOMAIN')}>",
        "to":      email,
        "subject": "Reset your RBQM Platform password",
        "html": f"""
            <p>We received a request to reset your password.</p>
            <p><a href="{reset_link}">Reset Password</a></p>
            <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
        """
    })
```

### 3.15 Environment variables

```
# Auth
SECRET_KEY=change_this_to_64_char_random_string
TOKEN_EXPIRY_HOURS=24
INVITE_EXPIRY_HOURS=72
RESET_TOKEN_EXPIRY_HOURS=1

# Email
RESEND_API_KEY=re_xxxx
SENDING_DOMAIN=yourdomain.com     # Must be verified in Resend dashboard
INVITE_BASE_URL=https://rbqm-platform.vercel.app

# Platform bootstrap
PLATFORM_ADMIN_EMAIL=admin@yourplatform.com
PLATFORM_ADMIN_PASSWORD=changeme_on_first_login

# Database
DATABASE_URL=postgresql://...
```

---

## PART 4 — FRONTEND CHANGES

### 4.1 Remove public registration

- Delete `src/pages/Register.tsx` entirely
- Remove /register route from React Router
- Landing page has no "Sign Up" button — only "Log In"
- Add a small "Contact us to get access" link instead

### 4.2 API client — cookies not localStorage

Update `src/api/client.ts`. All fetches must include `credentials: 'include'`
so the browser attaches the httpOnly cookie automatically.

```typescript
const BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',    // CRITICAL — sends the httpOnly cookie
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (res.status === 401) {
    // Session expired or revoked — redirect to login
    window.location.href = '/login'
    throw new Error('Session expired')
  }
  if (res.status === 403) {
    throw new Error('You do not have permission to perform this action')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `API error: ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:    <T>(path: string)                        => request<T>(path),
  post:   <T>(path: string, body: unknown)         => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)         => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T>(path: string)                        => request<T>(path, { method: 'DELETE' }),
}
```

There is no token in localStorage. The frontend never reads or writes auth
tokens. It only knows the user's identity via the `/api/auth/me` response.

### 4.3 Update AuthContext

Update `src/context/AuthContext.tsx`:

```typescript
interface User {
  id:         number
  email:      string
  full_name:  string
  role:       UserRole
  org_id:     number
  org_name:   string
  last_login: string | null
  site_assignments: number[]   // array of site_ids — for canAccessSite()
}

interface AuthContextType {
  user:              User | null
  isAdmin:           boolean               // shortcut for cro_admin
  isCentralMonitor:  boolean
  isSiteMonitor:     boolean
  isPlatformAdmin:   boolean
  isSponsorViewer:   boolean
  canAccessSite:     (siteId: number) => boolean
  canAccessStudy:    (studyId: number) => boolean   // uses study_team_members if set
  login:             (email: string, password: string) => Promise<{ requires_2fa: boolean }>
  verify2FA:         (pre_token: string, code: string) => Promise<void>
  logout:            () => Promise<void>
  isAuthenticated:   boolean
  isLoading:         boolean
}
```

On login success, the JWT is in an httpOnly cookie (not readable by JS).
The frontend calls `GET /api/auth/me` to get the user object. This is the
only source of truth for who is logged in.

`canAccessSite(siteId)` — returns `true` for cro_admin / central_monitor / platform_admin always.
For site_monitor: returns `true` only if `siteId` is in `user.site_assignments`.

### 4.4 New pages to build

**`src/pages/AcceptInvite.tsx`** — `/accept-invite?token={token}`
- On mount: call `GET /api/auth/validate-invite?token={token}`
  - If 404 or 410: show error card "This invitation has expired or is invalid."
  - If valid: show the org name and role from response
- Form: Full Name + Password + Confirm Password
- Submit: `POST /api/auth/accept-invite` → { token, full_name, password }
- On success: redirect to /dashboard (cookie is set, user is logged in)
- Design: same dark card as login, shows:
  "You're joining **{CRO Name}** as a **{Role}**"

**`src/pages/ForgotPassword.tsx`** — `/forgot-password`
- Single email field
- Calls `POST /api/auth/forgot-password`
- Always shows "If that email is registered, you'll receive a reset link."
  (do not reveal whether email exists)
- Link back to login

**`src/pages/ResetPassword.tsx`** — `/reset-password?token={token}`
- On mount: validate token (call `GET /api/auth/validate-reset-token?token={token}`)
- Form: New Password + Confirm Password
- Calls `POST /api/auth/reset-password`
- On success: redirect to /login with success message

**`src/pages/AdminPanel.tsx`** — `/admin` (cro_admin only, ProtectedRoute)

Tabs:
1. **Team** — user list with role badges, invite button, deactivate toggle,
   resend invite button
2. **Invitations** — pending invites with cancel button and expiry countdown
3. **KRI Library** — manage which KRIs are active + default thresholds
4. **Site Assignments** — assign site monitors to specific sites across studies
5. **Study Teams** — assign Central Monitors to specific studies (optional scope)

**`src/pages/PlatformAdmin.tsx`** — `/platform` (platform_admin only)
- List of all CROs with user counts, study counts, subscription tier, status
- "Create New CRO" button → form with org name, slug, admin email (triggers invite)
- Deactivate CRO toggle
- Sponsor Access management: grant/revoke read access to studies
- **Note: Platform Admin impersonation ("Impersonate CRO view") is deferred.**
  It requires careful audit trail design to be GxP-safe. Do not implement now.
  Leave a TODO comment and a disabled button in the UI.

**`src/pages/Sessions.tsx`** — `/settings/sessions` (all authenticated users)
- List of active sessions: IP address, user agent, last seen, created at
- Current session highlighted with "This device" badge
- "Revoke" button per session
- "Revoke all other sessions" button at top

**`src/pages/TwoFactorSetup.tsx`** — `/settings/2fa`
- Shows QR code from `GET /api/auth/2fa/setup`
- Input field for first TOTP code to verify
- Calls `POST /api/auth/2fa/enable`
- On success: shows backup codes (one-time display, user must copy them)
- For cro_admin / central_monitor: banner on dashboard prompting 2FA setup
  if not yet enabled

### 4.5 Components to build

**`src/components/InviteUserModal.tsx`**
- Email field
- Role dropdown: Central Monitor / Site Monitor / Sponsor Viewer
- Calls `POST /api/admin/users/invite`
- Shows success: "Invitation sent to {email}. It expires in 72 hours."

**`src/components/TeamTable.tsx`**
- Columns: Name, Email, Role badge, Last Login, Status, Actions
- Actions: Change Role dropdown, Deactivate toggle, Resend Invite (if not yet accepted)
- Only CRO Admin sees this
- Calls `GET /api/admin/users`

**`src/components/InvitationsTable.tsx`**
- Columns: Email, Role, Invited By, Sent At, Expires At, Countdown timer, Cancel
- Resend button generates a new token and resets the expiry
- Calls `GET /api/admin/invitations`

**`src/components/SiteAssignmentManager.tsx`**
- Study selector dropdown
- For each site in the study: show list of assigned monitors
- "Assign Monitor" button opens user picker (only site_monitor role users)
- Remove assignment button per user
- CRO Admin and Central Monitor can use this

**`src/components/KRILibraryEditor.tsx`**
- Table of all 20 KRIs with columns:
  KRI ID, Name, Domain, Default Yellow, Default Red, Active toggle
- Inline editing of threshold values
- CRO Admin only
- Saves to `PUT /api/admin/kri-library/{kri_id}`

**`src/components/RoleGate.tsx`** — utility component
```typescript
interface RoleGateProps {
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode   // optional: render this instead of null
}

function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <>{fallback}</>
  return <>{children}</>
}
```

Use `<RoleGate>` everywhere in the UI to conditionally render elements.
Never CSS-hide sensitive elements — always conditional render.

**`src/components/TenantContextBar.tsx`**

Appears at the top of every authenticated page:
```
[Org Initial/Logo]  [Org Name]  >  [Study Name if in context]  |  [Role badge]  |  [User name]  |  [Sessions icon]
```
- Org context is permanent — no org switcher
- Role badge colours as defined in the Design System section
- Sessions icon links to /settings/sessions
- 2FA warning icon if cro_admin/central_monitor hasn't set up 2FA

**`src/components/SponsorViewBanner.tsx`**

Shown to sponsor_viewer users:
```
👁  Read-only access to [Study Name] — sponsored by [Your Org]
```

**`src/components/SessionsPanel.tsx`**

Used in /settings/sessions page (see above).

### 4.6 Update existing components for role visibility

**`src/components/SiteTable.tsx`**
- Site Monitor: filter `sites` to only show assigned sites (Sight Lines principle)
- Do NOT show a "restricted" row — simply omit unassigned sites entirely
- CRO Admin / Central Monitor: see all sites

**`src/components/AlertsPanel.tsx`**
- Site Monitor: filter alerts to assigned sites only
- Sponsor Viewer: filter to granted study's data, read-only controls

**`src/components/SiteDetail.tsx`**
- Wrap KRI threshold edit controls in `<RoleGate roles={['cro_admin', 'central_monitor']}>`
- Site Monitors and Sponsor Viewers see values but not edit controls

**`src/pages/TrialDetail.tsx`**
- Compliance tab: `<RoleGate roles={['cro_admin', 'central_monitor', 'platform_admin']}>`
- Data Upload tab: visible to all; upload form scoped to assigned sites for site monitors
- Team tab (new): shows site assignments for this study — `<RoleGate roles={['cro_admin']}>`

**`src/components/Sidebar.tsx`**
- Admin link: `<RoleGate roles={['cro_admin']}>`
- Platform link: `<RoleGate roles={['platform_admin']}>`
- Sessions link: always visible (all roles)
- 2FA Setup link: `<RoleGate roles={['cro_admin', 'central_monitor']}>`
- Alerts badge: scoped to what the current user can see

### 4.7 Login page — add "Forgot password" link

```typescript
// In src/pages/Login.tsx — add below the password field:
<a href="/forgot-password" className="text-sm text-slate-400 hover:text-slate-200">
  Forgot your password?
</a>
```

Also update the submit handler to handle `requires_2fa` response:
```typescript
const result = await login(email, password)
if (result.requires_2fa) {
  navigate('/2fa-verify', { state: { pre_token: result.pre_token } })
} else {
  navigate('/dashboard')
}
```

---

## PART 5 — THE UX FLOW

### 5.1 Login experience
1. User lands on `/login`
2. Enters email + password
3. **If no 2FA required:** backend sets httpOnly cookie, frontend calls
   `/api/auth/me`, redirects to `/dashboard`
4. **If 2FA required (cro_admin / central_monitor):** backend returns
   `{ requires_2fa: true, pre_token: "..." }` — a short-lived, limited-scope
   token. Frontend redirects to `/2fa-verify`. User enters TOTP code.
   Backend validates code, issues full JWT cookie.
5. Navbar shows: "Veeda Clinical Research" as the org context — always visible
6. There is NO way to switch org. The org context is permanent.

### 5.2 Portfolio view — the study list
The first screen after login is a list of studies.

- CRO Admin: all studies in their org
- Central Monitor: all studies in their org (or only assigned studies if
  study_team_members is configured for them)
- Site Monitor: ONLY studies where they have at least one active site assignment
- Sponsor Viewer: ONLY studies granted in sponsor_study_access

Each study card: title, phase, status, site count, last KRI run, lock score ring.

### 5.3 Sight Lines principle — enforced everywhere

When a Site Monitor is assigned to Boston Hospital and London Clinic only:
- Site table shows ONLY Boston Hospital and London Clinic
- Heatmap covers only those 2 sites
- Alerts are filtered to those 2 sites only
- Lock readiness shows only their 2 sites' scores
- No "you don't have access" message — other sites simply do not exist

This applies equally to dropdowns, selectors, exports, and API responses.
An unassigned site never appears in any list, anywhere, for any reason.

### 5.4 Admin panel flows

**Invite flow:**
1. Click "Invite Team Member"
2. Enter email, select role
3. System sends email via Resend with accept link
4. Pending invite appears in Invitations tab with 72-hour countdown timer
5. "Resend" button available — generates new token, resets countdown, old link dies
6. When user accepts, they appear in the Team tab

**Site assignment flow:**
1. Go to Site Assignments tab
2. Select study
3. Click "Assign Monitor" next to site name
4. Pick from dropdown of site_monitor users in the org
5. Assignment saved immediately

**Session management (user self-service):**
1. Go to Settings → Sessions
2. See all active sessions with device info and last seen time
3. Click Revoke to kill a session
4. "Sign out everywhere else" button revokes all other sessions

---

## PART 6 — SEED DATA FOR TESTING

Create `rbqm_engine/seed_iron_triangle.py`:

```python
"""
Creates a complete Iron Triangle demo environment.
Safe to run on empty DB only. Does not handle re-seeding.

Platform Admin:
  platform@rbqm.com / Platform123!

CRO Alpha — "Veeda Clinical Research" (slug: veeda-clinical):
  CRO Admin:        admin@veeda.com / Admin123!         [2FA setup pending]
  Central Monitor:  monitor@veeda.com / Monitor123!     [2FA setup pending]
  Site Monitor 1:   cra1@veeda.com / CRA123!            [assigned: SITE001, SITE002]
  Site Monitor 2:   cra2@veeda.com / CRA123!            [assigned: SITE003, SITE004]
  Sponsor Viewer:   sponsor@pharma.com / Sponsor123!    [read-only: TRIAL-2024-001]

CRO Beta — "Lambda Therapeutic" (slug: lambda-therapeutic):
  CRO Admin:        admin@lambda.com / Admin123!
  Central Monitor:  monitor@lambda.com / Monitor123!

Trials:
  Veeda:  TRIAL-2024-001 (5 sites, KRIs run, alerts active)
  Lambda: TRIAL-2024-002 (3 sites, different data — completely invisible to Veeda users)

Sponsor org: "Pharma Corp" (slug: pharma-corp, tier: sponsor)
  sponsor_study_access: pharma-corp → TRIAL-2024-001 (read-only)

Post-seed verification checklist:
  ✅ cra1@veeda.com → sees only SITE001 and SITE002
  ✅ monitor@veeda.com → sees all 5 Veeda sites
  ✅ admin@lambda.com → cannot see ANY Veeda data (Invisible Wall)
  ✅ platform@rbqm.com → can see both CROs
  ✅ sponsor@pharma.com → can see TRIAL-2024-001 read-only, nothing from Lambda
  ✅ GET /api/trials from admin@lambda.com → zero Veeda trials in response
  ✅ GET /api/kri/sites for TRIAL-2024-001 as cra1@veeda.com → only 2 sites
"""
```

---

## PART 7 — MIGRATION SEQUENCE

Execute in this exact order. Since there are zero existing users and the
database is being built fresh, steps marked [SKIP — no existing data] can
be executed as simple CREATE statements.

```
Step 1:   Create supabase/migrations/ directory
Step 2:   Write 20240101000001_iron_triangle_schema.sql with all new tables
Step 3:   Run: supabase db push
Step 4:   Update db/models.py with all SQLAlchemy models and relationships
Step 5:   Create api/middleware/tenancy.py (with Postgres SET LOCAL for RLS)
Step 6:   Create api/permissions.py
Step 7:   Install: pip install resend pyotp slowapi
Step 8:   Add all new env vars to .env
Step 9:   Remove public /register endpoint
Step 10:  Build new auth routes (accept-invite, forgot/reset-password,
          2fa/setup, 2fa/verify, sessions)
Step 11:  Update login route → httpOnly cookie + jti session record
Step 12:  Update ALL existing routes with tenancy filters + org_id scoping
Step 13:  Build CRO Admin routes (invite, users, site assignments, kri-library,
          study-team)
Step 14:  Build Platform Admin routes (orgs, sponsor-access)
Step 15:  Update engine/kri_calculator.py to accept threshold_overrides dict
Step 16:  Apply Supabase RLS policies (using current_setting, not auth.uid())
Step 17:  Delete src/pages/Register.tsx and /register route
Step 18:  Update src/api/client.ts → credentials: 'include', remove localStorage
Step 19:  Update src/context/AuthContext.tsx with new interface + cookie-aware flow
Step 20:  Build RoleGate component
Step 21:  Build AcceptInvite, ForgotPassword, ResetPassword pages
Step 22:  Build AdminPanel with all 5 tabs
Step 23:  Build Sessions, TwoFactorSetup pages
Step 24:  Build PlatformAdmin page (with deferred impersonation button, disabled)
Step 25:  Update Sidebar, SiteTable, AlertsPanel for role visibility
Step 26:  Add TenantContextBar to authenticated layout
Step 27:  Run seed_iron_triangle.py
Step 28:  Test all five roles manually against the verification checklist
Step 29:  Verify RLS policies block cross-tenant queries at DB level
Step 30:  Deploy
```

---

## PART 8 — DO NOT CHANGE

The following must not be modified during this migration:
- `engine/kri_calculator.py` — all 20 KRI calculations (only add threshold_overrides param)
- `engine/lock_readiness.py` — lock scoring logic
- `engine/report_generator.py` — Groq prompt and streaming
- `engine/pdf_report.py` — PDF generation
- The KRI threshold values (unless overridden via kri_library/study_kri_config)
- The existing frontend component visual design (dark theme, slate colours)
- The database column names that the KRI engine writes to (kri_snapshots fields)

---

## DESIGN SYSTEM (unchanged + additions)

```
Background:     bg-[#0f1117]
Cards:          bg-slate-800/60 border border-slate-700
Primary text:   text-slate-100
Secondary text: text-slate-400
Badges:         text-xs font-medium rounded-full px-2.5 py-0.5 border

Role badge colours:
  platform_admin  → bg-purple-900/50 text-purple-400 border-purple-800
  cro_admin       → bg-blue-900/50   text-blue-400   border-blue-800
  central_monitor → bg-cyan-900/50   text-cyan-400   border-cyan-800
  site_monitor    → bg-slate-800     text-slate-400  border-slate-700
  sponsor_viewer  → bg-amber-900/50  text-amber-400  border-amber-800

Tenant context bar (top of every authenticated page):
  bg-slate-900 border-b border-slate-800
  [Org Initial]  [Org Name]  >  [Study Name if active]  |  [Role badge]  |  [User name]  |  [Sessions icon]

Sponsor Viewer read-only banner:
  bg-amber-900/20 border border-amber-800 text-amber-300

2FA setup warning banner (for cro_admin / central_monitor who haven't enabled it):
  bg-yellow-900/20 border border-yellow-700 text-yellow-300
  "Secure your account — Two-factor authentication is required for your role."  [Set up now →]
```

---

## APPENDIX — ARCHITECTURAL DECISIONS SUMMARY

| Decision | Choice | Reason |
|---|---|---|
| JWT storage | httpOnly cookie | XSS protection; GxP-adjacent platform |
| RLS identity | Postgres SET LOCAL session var | Custom JWT — auth.uid() always NULL |
| Email provider | Resend API | Free tier 3000/mo; simple SDK |
| 2FA method | TOTP via pyotp | Standard TOTP; works with Authenticator apps |
| Rate limiting | slowapi (in-memory) | Simple; swap for Redis at scale |
| Invite expiry | 72 hours | Balance between convenience and security |
| Password reset expiry | 1 hour | Short window for sensitive operation |
| Session revocation | jti in sessions table | Allows instant kill without token expiry |
| Impersonation | Deferred | Requires GxP-safe audit design |
| Schema migrations | supabase/migrations/ | Version-controlled, reproducible |
| Threshold caching | Per-request dict | Avoid N+1 queries across 20 KRIs × N sites |
| "Denied" UI pattern | Absent data (Sight Lines) | Invisible Wall — absence, not denial |
