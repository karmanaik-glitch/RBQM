from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from datetime import datetime, timezone
from db.database import Base

class Organisation(Base):
    __tablename__ = "organisations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    max_users = Column(Integer, default=50)
    subscription_tier = Column(String(50), default='standard')
    created_by_platform_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="organisation")
    trials = relationship("Trial", back_populates="organisation")
    kri_library = relationship("KRILibrary", back_populates="organisation")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    hashed_pw = Column(String(200), nullable=False)
    full_name = Column(String(200))
    org_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    role = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    invited_by = Column(Integer, ForeignKey("users.id"))
    invite_accepted = Column(Boolean, default=False)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organisation = relationship("Organisation", back_populates="users")
    site_assignments = relationship("UserSiteAssignment", back_populates="user", cascade="all, delete-orphan", foreign_keys="[UserSiteAssignment.user_id]")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    totp_credentials = relationship("TOTPCredential", back_populates="user", uselist=False, cascade="all, delete-orphan")
    invitations_sent = relationship("Invitation", back_populates="inviter", foreign_keys="[Invitation.invited_by]")

class Trial(Base):
    __tablename__ = "trials"
    id = Column(Integer, primary_key=True, index=True)
    trial_id = Column(String(200), unique=True, nullable=False, index=True)
    title = Column(String(500))
    phase = Column(String(50))
    therapeutic_area = Column(String(200))
    indication = Column(String(200))
    sponsor_name = Column(String(200))
    status = Column(String(50), default="ACTIVE")
    target_lock_date = Column(DateTime)
    org_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)

    organisation = relationship("Organisation", back_populates="trials")
    sites = relationship("Site", back_populates="trial", cascade="all, delete-orphan")
    uploads = relationship("Upload", back_populates="trial", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="trial", cascade="all, delete-orphan")
    study_kri_config = relationship("StudyKRIConfig", back_populates="trial", cascade="all, delete-orphan")
    user_site_assignments = relationship("UserSiteAssignment", back_populates="trial", cascade="all, delete-orphan")
    study_team_members = relationship("StudyTeamMember", back_populates="trial", cascade="all, delete-orphan")

class Site(Base):
    __tablename__ = "sites"
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(String(200), nullable=False, index=True)
    site_name = Column(String(500))
    country = Column(String(100))
    target_enrollment = Column(Integer)
    trial_id = Column(Integer, ForeignKey("trials.id", ondelete="CASCADE"), nullable=False)

    trial = relationship("Trial", back_populates="sites")
    user_site_assignments = relationship("UserSiteAssignment", back_populates="site", cascade="all, delete-orphan")

class Upload(Base):
    __tablename__ = "uploads"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    status = Column(String)
    rows_parsed = Column(Integer, default=0)
    trial_id = Column(Integer, ForeignKey("trials.id"))
    trial = relationship("Trial", back_populates="uploads")
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class KRISnapshot(Base):
    __tablename__ = "kri_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    kri_id = Column(String, index=True)
    kri_name = Column(String)
    domain = Column(String)
    value = Column(Float, nullable=True)
    unit = Column(String)
    status = Column(String)
    site_ext_id = Column(String, index=True)
    trial_id = Column(Integer, ForeignKey("trials.id"))
    run_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    kri_id = Column(String, index=True)
    severity = Column(String)
    status = Column(String, default="OPEN")
    trial_id = Column(Integer, ForeignKey("trials.id"))
    site_ext_id = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    trial = relationship("Trial", back_populates="alerts")
    action_items = relationship("ActionItem", back_populates="alert")
    comments = relationship("Comment")

class ActionItem(Base):
    __tablename__ = "action_items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    owner_name = Column(String)
    due_date = Column(DateTime)
    status = Column(String, default="OPEN")
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    alert = relationship("Alert", back_populates="action_items")
    assignee = relationship("User")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    user_email = Column(String)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    action_item_id = Column(Integer, ForeignKey("action_items.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class UserSiteAssignment(Base):
    __tablename__ = "user_site_assignments"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    study_id = Column(Integer, ForeignKey("trials.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="site_assignments", foreign_keys=[user_id])
    site = relationship("Site", back_populates="user_site_assignments")
    trial = relationship("Trial", back_populates="user_site_assignments")

class KRILibrary(Base):
    __tablename__ = "kri_library"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    kri_id = Column(String(10), nullable=False)
    kri_name = Column(String(200), nullable=False)
    domain = Column(String(100))
    default_yellow = Column(Float)
    default_red = Column(Float)
    higher_is_worse = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organisation = relationship("Organisation", back_populates="kri_library")

class StudyKRIConfig(Base):
    __tablename__ = "study_kri_config"
    id = Column(Integer, primary_key=True)
    study_id = Column(Integer, ForeignKey("trials.id", ondelete="CASCADE"), nullable=False)
    kri_id = Column(String(10), nullable=False)
    yellow_threshold = Column(Float)
    red_threshold = Column(Float)
    is_active = Column(Boolean, default=True)
    set_by = Column(Integer, ForeignKey("users.id"))
    set_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    trial = relationship("Trial", back_populates="study_kri_config")

class Invitation(Base):
    __tablename__ = "invitations"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    invited_email = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False)
    token = Column(String(200), unique=True, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    platform_admin_id = Column(Integer, ForeignKey("platform_admins.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime)
    is_used = Column(Boolean, default=False)

    inviter = relationship("User", back_populates="invitations_sent", foreign_keys=[invited_by])
    platform_inviter = relationship("PlatformAdmin", foreign_keys=[platform_admin_id])
    organisation = relationship("Organisation")

class PlatformAdmin(Base):
    __tablename__ = "platform_admins"
    id = Column(Integer, primary_key=True)
    email = Column(String(200), unique=True, nullable=False)
    hashed_pw = Column(String(200), nullable=False)
    full_name = Column(String(200))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    sessions = relationship("Session", back_populates="platform_admin", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    jti = Column(String(200), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    platform_admin_id = Column(Integer, ForeignKey("platform_admins.id", ondelete="CASCADE"))
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime)

    user = relationship("User", back_populates="sessions")
    platform_admin = relationship("PlatformAdmin", back_populates="sessions")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    platform_admin_id = Column(Integer, ForeignKey("platform_admins.id", ondelete="CASCADE"), nullable=True)
    token = Column(String(200), unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organisations.id"))
    study_id = Column(Integer, ForeignKey("trials.id"))
    site_id = Column(Integer, ForeignKey("sites.id"))
    actor_id = Column(Integer)
    actor_role = Column(String(50))
    action = Column(String(200), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(Integer)
    detail = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SponsorStudyAccess(Base):
    __tablename__ = "sponsor_study_access"
    id = Column(Integer, primary_key=True)
    sponsor_org_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    cro_org_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    study_id = Column(Integer, ForeignKey("trials.id"), nullable=False)
    granted_by = Column(Integer, ForeignKey("platform_admins.id"))
    granted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

class TOTPCredential(Base):
    __tablename__ = "totp_credentials"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    secret = Column(String(200), nullable=False)
    is_enabled = Column(Boolean, default=False)
    backup_codes = Column(Text)
    enabled_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="totp_credentials")

class StudyTeamMember(Base):
    __tablename__ = "study_team_members"
    id = Column(Integer, primary_key=True)
    study_id = Column(Integer, ForeignKey("trials.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_override = Column(String(50))
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    trial = relationship("Trial", back_populates="study_team_members")
