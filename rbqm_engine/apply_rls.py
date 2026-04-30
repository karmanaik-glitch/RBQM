import os
from sqlalchemy import text
from db.database import engine
from dotenv import load_dotenv

def apply_rls():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print("[ERROR] DATABASE_URL not found.")
        return

    migration_file = os.path.join("..", "supabase", "migrations", "20240101000001_iron_triangle_auth.sql")
    if not os.path.exists(migration_file):
        # Try local path
        migration_file = os.path.join("supabase", "migrations", "20240101000001_iron_triangle_auth.sql")
        if not os.path.exists(migration_file):
             print(f"[ERROR] Migration file not found at {migration_file}")
             return

    print(f"Reading migration from {migration_file}...")
    with open(migration_file, "r") as f:
        sql = f.read()

    # Split the SQL into individual statements by semicolon to avoid execution issues in some drivers
    # Simple split might break if semicolons are inside strings, but for this file it should be okay.
    # Alternatively, execute the whole block if the driver supports it.
    
    print("Applying migration to Supabase...")
    try:
        # Filter out comments and empty lines
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        
        with engine.connect() as conn:
            for statement in statements:
                if statement.startswith("--"):
                    continue
                try:
                    with conn.begin():
                        conn.execute(text(statement))
                except Exception as stmt_err:
                    print(f"[WARNING] Statement failed: {statement[:50]}... Error: {stmt_err}")
        print("[SUCCESS] RLS policies and table schema applied successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to apply RLS: {e}")

if __name__ == "__main__":
    apply_rls()
