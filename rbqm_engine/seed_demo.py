import os
import shutil
import subprocess
from datetime import datetime, timedelta, timezone
from db.database import init_db, SessionLocal
from db.models import Organisation, User, Trial, Site, Alert, ActionItem
from api.auth import get_password_hash
from engine.kri_calculator import calculate_all_kris
from engine.models import SiteReport
import pandas as pd
from db.models import KRISnapshot

def seed():
    from db.database import Base, engine
    print("Initializing Database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    print("Creating Demo Organisation...")
    org = db.query(Organisation).filter(Organisation.name == "Veeda Clinical Research").first()
    if not org:
        org = Organisation(name="Veeda Clinical Research", type="CRO")
        db.add(org)
        db.commit()
        db.refresh(org)
    
    print("Creating Demo User...")
    user = db.query(User).filter(User.email == "demo@rbqm.com").first()
    if not user:
        user = User(
            email="demo@rbqm.com",
            hashed_pw=get_password_hash("demo1234"),
            role="cdm_lead",
            org_id=org.id
        )
        db.add(user)
        db.commit()
    
    print("Creating Demo Trial...")
    trial = db.query(Trial).filter(Trial.trial_id == "TRIAL-2024-001").first()
    if not trial:
        trial = Trial(
            trial_id="TRIAL-2024-001",
            title="A Phase III Study in Type 2 Diabetes",
            phase="Phase III",
            therapeutic_area="Endocrinology",
            indication="Type 2 Diabetes",
            sponsor_name="Global Pharma",
            target_lock_date=datetime.now(timezone.utc) + timedelta(days=60)
        )
        db.add(trial)
        db.commit()
        db.refresh(trial)
        
        sites = [
            ("SITE-101", "Mumbai General", "India", 100),
            ("SITE-102", "Delhi Clinical", "India", 80),
            ("SITE-103", "Bangalore Med", "India", 120),
            ("SITE-104", "Chennai Health", "India", 90),
            ("SITE-105", "Pune Trials", "India", 70),
        ]
        for sid, name, country, enroll in sites:
            s = Site(site_id=sid, site_name=name, country=country, target_enrollment=enroll, trial_id=trial.id)
            db.add(s)
        db.commit()
        
    print("Generating Synthetic Data...")
    subprocess.run(["python", "generate_data.py"], check=True)
    
    print("Copying CSVs to uploads/1/")
    os.makedirs(f"uploads/{trial.id}", exist_ok=True)
    for f in os.listdir("Data"):
        if f.endswith(".csv"):
            shutil.copy(os.path.join("Data", f), os.path.join(f"uploads/{trial.id}", f))
    
    print("Running KRI Engine...")
    data_dir = f"uploads/{trial.id}"
    data_dict = {
        "patients": pd.read_csv(f"{data_dir}/patients.csv"),
        "visits": pd.read_csv(f"{data_dir}/visits.csv"),
        "deviations": pd.read_csv(f"{data_dir}/deviations.csv"),
        "queries": pd.read_csv(f"{data_dir}/queries.csv"),
        "saes": pd.read_csv(f"{data_dir}/saes.csv"),
        "measurements": pd.read_csv(f"{data_dir}/measurements.csv"),
        "ip_records": pd.read_csv(f"{data_dir}/ip_records.csv"),
        "sites": pd.read_csv(f"{data_dir}/sites.csv"),
    }
    site_ids = data_dict["sites"]["site_id"].unique()
    results = []
    for sid in site_ids:
        kris = calculate_all_kris(data_dict, sid)
        site_name = data_dict["sites"].loc[data_dict["sites"]["site_id"] == sid, "site_name"].values[0]
        results.append(SiteReport(site_id=sid, site_name=site_name, kris=kris))
    db.query(KRISnapshot).filter(KRISnapshot.trial_id == trial.id).delete()
    for site_report in results:
        for kri in site_report.kris:
            snap = KRISnapshot(
                kri_id=kri.kri_id, kri_name=kri.kri_name, domain=kri.domain,
                value=kri.value, unit=kri.unit, status=kri.status,
                site_ext_id=kri.site_id, trial_id=trial.id
            )
            db.add(snap)
            if kri.status == "RED":
                existing_alert = db.query(Alert).filter(Alert.trial_id == trial.id, Alert.site_ext_id == kri.site_id, Alert.kri_id == kri.kri_id).first()
                if not existing_alert:
                    alert = Alert(kri_id=kri.kri_id, severity="CRITICAL", trial_id=trial.id, site_ext_id=kri.site_id)
                    db.add(alert)
    db.commit()
    
    print("Creating Action Items for top RED alert...")
    top_alert = db.query(Alert).filter(Alert.severity == "CRITICAL").first()
    if top_alert:
        for i in range(3):
            item = ActionItem(
                title=f"Investigate Root Cause {i+1}",
                description="Please review source documents.",
                owner_name="Demo Lead",
                due_date=datetime.now(timezone.utc) + timedelta(days=7),
                alert_id=top_alert.id
            )
            db.add(item)
        db.commit()
        
    print("\n" + "="*50)
    print("SEED COMPLETED SUCCESSFULLY")
    print("Login Email: demo@rbqm.com")
    print("Password:    demo1234")
    print("="*50 + "\n")

if __name__ == "__main__":
    seed()
