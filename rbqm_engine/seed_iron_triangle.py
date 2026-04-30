import os
import sys
from datetime import datetime, timezone
import random
from sqlalchemy.orm import Session
from db.database import SessionLocal, init_db, engine, Base
from db.models import (
    Organisation, User, PlatformAdmin, Trial, Site, 
    UserSiteAssignment, KRILibrary, StudyTeamMember
)
from api.auth import get_password_hash

def seed_db():
    print("Connecting to DB...")
    # Drop existing schema to ensure clean slate with new columns
    Base.metadata.drop_all(bind=engine)
    # Initialize schema
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print("Clearing existing data...")
        # Simplistic clearing. Note: In real scenarios, use truncate cascade.
        db.query(UserSiteAssignment).delete()
        db.query(StudyTeamMember).delete()
        db.query(KRILibrary).delete()
        db.query(Site).delete()
        db.query(Trial).delete()
        db.query(User).delete()
        db.query(Organisation).delete()
        db.query(PlatformAdmin).delete()
        db.commit()

        print("Seeding Platform Admin...")
        padmin = PlatformAdmin(
            email="platform.admin@vritas.com",
            hashed_pw=get_password_hash("Admin123!"),
            full_name="Vritas Admin"
        )
        db.add(padmin)
        db.commit()

        print("Seeding Organisation...")
        org = Organisation(
            name="Acme CRO",
            slug="acme-cro",
            subscription_tier="enterprise"
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        print("Seeding Users...")
        # 1 CRO Admin
        cro_admin = User(
            email="admin@acmecro.com",
            hashed_pw=get_password_hash("Password123!"),
            full_name="Alice (CRO Admin)",
            role="cro_admin",
            org_id=org.id,
            is_active=True
        )
        
        # 1 Central Monitor
        central_monitor = User(
            email="central@acmecro.com",
            hashed_pw=get_password_hash("Password123!"),
            full_name="Bob (Central Monitor)",
            role="central_monitor",
            org_id=org.id,
            is_active=True
        )

        # 2 Site Monitors
        site_monitor1 = User(
            email="monitor1@acmecro.com",
            hashed_pw=get_password_hash("Password123!"),
            full_name="Charlie (Site Monitor US)",
            role="site_monitor",
            org_id=org.id,
            is_active=True
        )
        site_monitor2 = User(
            email="monitor2@acmecro.com",
            hashed_pw=get_password_hash("Password123!"),
            full_name="Dave (Site Monitor EU)",
            role="site_monitor",
            org_id=org.id,
            is_active=True
        )

        # 1 Sponsor
        sponsor = User(
            email="sponsor@bigpharma.com",
            hashed_pw=get_password_hash("Password123!"),
            full_name="Eve (Sponsor)",
            role="sponsor",
            org_id=org.id,
            is_active=True
        )

        db.add_all([cro_admin, central_monitor, site_monitor1, site_monitor2, sponsor])
        db.commit()
        
        print("Seeding Trial...")
        trial = Trial(
            trial_id="TRIAL-2024-001",
            title="Phase III Efficacy Study",
            phase="Phase III",
            therapeutic_area="Oncology",
            indication="NSCLC",
            sponsor_name="Big Pharma Corp",
            org_id=org.id,
            target_lock_date=datetime(2025, 12, 1, tzinfo=timezone.utc)
        )
        db.add(trial)
        db.commit()
        db.refresh(trial)

        print("Seeding Sites...")
        sites = [
            Site(site_id="US-101", site_name="Boston General", country="USA", target_enrollment=50, trial_id=trial.id),
            Site(site_id="US-102", site_name="NY Presbyterian", country="USA", target_enrollment=40, trial_id=trial.id),
            Site(site_id="EU-201", site_name="London Clinic", country="UK", target_enrollment=30, trial_id=trial.id),
            Site(site_id="EU-202", site_name="Berlin Charité", country="DE", target_enrollment=35, trial_id=trial.id),
        ]
        db.add_all(sites)
        db.commit()

        print("Assigning Monitors to Sites...")
        # Charlie -> US sites
        db.add(UserSiteAssignment(user_id=site_monitor1.id, site_id=sites[0].id, study_id=trial.id))
        db.add(UserSiteAssignment(user_id=site_monitor1.id, site_id=sites[1].id, study_id=trial.id))
        
        # Dave -> EU sites
        db.add(UserSiteAssignment(user_id=site_monitor2.id, site_id=sites[2].id, study_id=trial.id))
        db.add(UserSiteAssignment(user_id=site_monitor2.id, site_id=sites[3].id, study_id=trial.id))
        db.commit()

        print("Assigning Team Members to Study...")
        db.add(StudyTeamMember(user_id=central_monitor.id, study_id=trial.id))
        db.add(StudyTeamMember(user_id=sponsor.id, study_id=trial.id))
        db.commit()

        print("Seeding complete!")
        print("--- Accounts Created ---")
        print("Platform Admin: platform.admin@vritas.com / Admin123!")
        print("CRO Admin: admin@acmecro.com / Password123!")
        print("Central Monitor: central@acmecro.com / Password123!")
        print("Site Monitor US: monitor1@acmecro.com / Password123!")
        print("Site Monitor EU: monitor2@acmecro.com / Password123!")
        print("Sponsor: sponsor@bigpharma.com / Password123!")

    except Exception as e:
        print(f"Error seeding DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
