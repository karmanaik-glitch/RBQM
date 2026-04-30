import os
from db.database import engine, Base, init_db
from sqlalchemy import text
from dotenv import load_dotenv

def setup():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print("[ERROR] DATABASE_URL not found in .env file.")
        print("Please add your Supabase connection string to .env:")
        print("DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres")
        return

    if "supabase.co" not in db_url and "supabase.com" not in db_url:
        print("[WARNING] Your DATABASE_URL does not appear to be a Supabase instance.")
        confirm = input("Do you want to proceed with schema initialization on this DB? (y/n): ")
        if confirm.lower() != 'y':
            return

    print(f"Connecting to: {db_url.split('@')[-1]}...")
    
    try:
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[SUCCESS] Connection successful!")
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return

    print("Initializing database schema (creating tables)...")
    try:
        init_db()
        print("[SUCCESS] Database schema initialized successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to initialize schema: {e}")
        return

    print("\n" + "="*50)
    print("SUPABASE INTEGRATION COMPLETE")
    print("="*50)
    print("Your backend is now using Supabase for persistent storage.")
    print("Next steps:")
    print("1. Run 'python seed_demo.py' to populate your cloud instance with demo data.")
    print("2. Deploy your backend to Render.com and set the DATABASE_URL environment variable.")
    print("="*50)

if __name__ == "__main__":
    setup()
