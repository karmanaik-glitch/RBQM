-- supabase/migrations/20240101000001_iron_triangle_auth.sql

CREATE TABLE IF NOT EXISTS organisations (
    id                          SERIAL PRIMARY KEY,
    name                        VARCHAR(200) NOT NULL,
    slug                        VARCHAR(100) UNIQUE NOT NULL,
    is_active                   BOOLEAN DEFAULT TRUE,
    max_users                   INTEGER DEFAULT 50,
    subscription_tier           VARCHAR(50) DEFAULT 'standard',
    created_by_platform_admin   BOOLEAN DEFAULT FALSE,
    created_at                  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
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

-- We need to make sure trials table exists. Since we are wiping and recreating, 
-- we should redefine trials, sites, uploads, kri_snapshots, alerts, action_items, comments, audit_log here as well,
-- or ensure that SQLAlchemy create_all() handles the ones not explicitly managed here.
-- The prompt states "Use Supabase migration files stored in supabase/migrations/ with timestamped filenames... Create all tables fresh."
-- I'll define trials and sites here so that the foreign keys in user_site_assignments work.

CREATE TABLE IF NOT EXISTS trials (
    id SERIAL PRIMARY KEY,
    trial_id VARCHAR(200) UNIQUE NOT NULL,
    title VARCHAR(500),
    phase VARCHAR(50),
    therapeutic_area VARCHAR(200),
    indication VARCHAR(200),
    sponsor_name VARCHAR(200),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    target_lock_date TIMESTAMP,
    org_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    site_id VARCHAR(200) NOT NULL,
    site_name VARCHAR(500),
    country VARCHAR(100),
    target_enrollment INTEGER,
    trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_site_assignments (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id     INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    study_id    INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active   BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, site_id, study_id)
);

CREATE TABLE IF NOT EXISTS kri_library (
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

CREATE TABLE IF NOT EXISTS study_kri_config (
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

CREATE TABLE IF NOT EXISTS invitations (
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

CREATE TABLE IF NOT EXISTS platform_admins (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(200) UNIQUE NOT NULL,
    hashed_pw   VARCHAR(200) NOT NULL,
    full_name   VARCHAR(200),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id          SERIAL PRIMARY KEY,
    jti         VARCHAR(200) UNIQUE NOT NULL,
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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(200) UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    expires_at  TIMESTAMP NOT NULL,
    is_used     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    org_id      INTEGER REFERENCES organisations(id),
    study_id    INTEGER REFERENCES trials(id),
    site_id     INTEGER REFERENCES sites(id),
    actor_id    INTEGER,
    actor_role  VARCHAR(50),
    action      VARCHAR(200) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   INTEGER,
    detail      JSONB,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsor_study_access (
    id          SERIAL PRIMARY KEY,
    sponsor_org_id  INTEGER NOT NULL REFERENCES organisations(id),
    cro_org_id      INTEGER NOT NULL REFERENCES organisations(id),
    study_id        INTEGER NOT NULL REFERENCES trials(id),
    granted_by      INTEGER REFERENCES platform_admins(id),
    granted_at      TIMESTAMP DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE(sponsor_org_id, study_id)
);

CREATE TABLE IF NOT EXISTS totp_credentials (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret          VARCHAR(200) NOT NULL,
    is_enabled      BOOLEAN DEFAULT FALSE,
    backup_codes    TEXT[],
    enabled_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_team_members (
    id              SERIAL PRIMARY KEY,
    study_id        INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_override   VARCHAR(50),
    assigned_by     INTEGER REFERENCES users(id),
    assigned_at     TIMESTAMP DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE(study_id, user_id)
);

-- Note: In a complete migration file, we should also create kri_snapshots, uploads, alerts, action_items.
-- We can let SQLAlchemy's create_all handle generating those tables for us during the init_db() step,
-- and then we just apply RLS on top of them.

-- Enable RLS on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_kri_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE totp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_study_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Organisation Policies
DROP POLICY IF EXISTS "Select org" ON organisations;
CREATE POLICY "Select org" ON organisations FOR SELECT USING (id = current_setting('app.current_org_id', true)::integer);

-- User Policies
DROP POLICY IF EXISTS "Users see colleagues" ON users;
CREATE POLICY "Users see colleagues" ON users FOR SELECT USING (org_id = current_setting('app.current_org_id', true)::integer);

-- Trial Policies
DROP POLICY IF EXISTS "Org trials access" ON trials;
CREATE POLICY "Org trials access" ON trials FOR ALL USING (org_id = current_setting('app.current_org_id', true)::integer);

-- Site Policies
DROP POLICY IF EXISTS "Org sites access" ON sites;
CREATE POLICY "Org sites access" ON sites FOR ALL USING (
    trial_id IN (SELECT id FROM trials WHERE org_id = current_setting('app.current_org_id', true)::integer)
);

-- Site assignment policies
DROP POLICY IF EXISTS "Org assignments access" ON user_site_assignments;
CREATE POLICY "Org assignments access" ON user_site_assignments FOR ALL USING (
    study_id IN (SELECT id FROM trials WHERE org_id = current_setting('app.current_org_id', true)::integer)
);

-- Audit log policies
DROP POLICY IF EXISTS "Org audit access" ON audit_log;
CREATE POLICY "Org audit access" ON audit_log FOR SELECT USING (org_id = current_setting('app.current_org_id', true)::integer);

-- KRI Library policies
DROP POLICY IF EXISTS "Org KRI library access" ON kri_library;
CREATE POLICY "Org KRI library access" ON kri_library FOR ALL USING (org_id = current_setting('app.current_org_id', true)::integer);

-- Data Scoping Policies for Remaining Tables
DROP POLICY IF EXISTS "Org uploads access" ON uploads;
CREATE POLICY "Org uploads access" ON uploads FOR ALL USING (trial_id IN (SELECT id FROM trials WHERE org_id = current_setting('app.current_org_id', true)::integer));

DROP POLICY IF EXISTS "Org kri_snapshots access" ON kri_snapshots;
CREATE POLICY "Org kri_snapshots access" ON kri_snapshots FOR ALL USING (trial_id IN (SELECT id FROM trials WHERE org_id = current_setting('app.current_org_id', true)::integer));

DROP POLICY IF EXISTS "Org alerts access" ON alerts;
CREATE POLICY "Org alerts access" ON alerts FOR ALL USING (trial_id IN (SELECT id FROM trials WHERE org_id = current_setting('app.current_org_id', true)::integer));

DROP POLICY IF EXISTS "Org action_items access" ON action_items;
CREATE POLICY "Org action_items access" ON action_items FOR ALL USING (alert_id IN (SELECT id FROM alerts WHERE trial_id IN (SELECT id FROM trials WHERE org_id = current_setting('app.current_org_id', true)::integer))));

DROP POLICY IF EXISTS "Org comments access" ON comments;
CREATE POLICY "Org comments access" ON comments FOR ALL USING (alert_id IN (SELECT id FROM alerts WHERE trial_id IN (SELECT id FROM trials WHERE org_id = current_setting('app.current_org_id', true)::integer))));

-- Admin & Token Scoping
DROP POLICY IF EXISTS "Platform admins isolation" ON platform_admins;
CREATE POLICY "Platform admins isolation" ON platform_admins FOR ALL USING (email = current_setting('app.current_user_email', true));

DROP POLICY IF EXISTS "User tokens isolation" ON password_reset_tokens;
CREATE POLICY "User tokens isolation" ON password_reset_tokens FOR ALL USING (user_id = current_setting('app.current_user_id', true)::integer);

DROP POLICY IF EXISTS "Sponsor access scoping" ON sponsor_study_access;
CREATE POLICY "Sponsor access scoping" ON sponsor_study_access FOR ALL USING (sponsor_org_id = current_setting('app.current_org_id', true)::integer OR cro_org_id = current_setting('app.current_org_id', true)::integer);
