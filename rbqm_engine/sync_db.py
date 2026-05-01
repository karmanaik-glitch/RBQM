import os
import sys

# Ensure rbqm_engine is in path if running from root
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "rbqm_engine"))

from sqlalchemy import create_engine, text
from rbqm_engine.db.database import DATABASE_URL

def sync_schema():
    print(f"Connecting to: {DATABASE_URL.split('@')[-1]}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Checking for missing columns...")
        
        # 1. AuditLog actor_id
        try:
            conn.execute(text("ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_id INTEGER"))
            print("Verified audit_log.actor_id")
        except Exception as e:
            print(f"Note on audit_log: {e}")

        # 2. Invitation platform_admin_id and invited_by nullability
        try:
            conn.execute(text("ALTER TABLE invitations ADD COLUMN IF NOT EXISTS platform_admin_id INTEGER"))
            conn.execute(text("ALTER TABLE invitations ALTER COLUMN invited_by DROP NOT NULL"))
            conn.execute(text("ALTER TABLE invitations ADD CONSTRAINT fk_invitation_platform FOREIGN KEY (platform_admin_id) REFERENCES platform_admins(id)"))
            print("Verified invitations schema")
        except Exception as e:
            print(f"Note on invitations: {e}")

        # 3. Session fingerprinting columns
        try:
            conn.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50)"))
            conn.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500)"))
            print("Verified sessions fingerprinting")
        except Exception as e:
            print(f"Note on sessions: {e}")

        # 4. KRILibrary, StudyKRIConfig, etc. tracking
        models_to_fix = ["kri_library", "study_kri_config", "user_site_assignments", "study_team_members"]
        for table in models_to_fix:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS platform_admin_id INTEGER"))
                conn.execute(text(f"ALTER TABLE {table} ADD CONSTRAINT fk_{table}_platform FOREIGN KEY (platform_admin_id) REFERENCES platform_admins(id)"))
                print(f"Verified {table} tracking")
            except Exception as e:
                print(f"Note on {table}: {e}")

        conn.commit()
        print("Schema sync complete!")

if __name__ == "__main__":
    sync_schema()
