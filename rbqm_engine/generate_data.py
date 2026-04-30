"""
Synthetic Clinical Trial Data Generator
----------------------------------------
Generates realistic EDC-style CSV data for 5 sites across a fictional
Phase II trial (TRIAL-2024-001) in Type 2 Diabetes.

Site profiles (deliberately varied for KRI testing):
  SITE001 - Mumbai      : Model site. All KRIs green.
  SITE002 - Delhi       : High query rate, slow resolution, data entry lag.
  SITE003 - Chennai     : Late SAE reporting, poor SAE reconciliation.
  SITE004 - Ahmedabad   : Data fabrication signals (low variability, digit preference).
  SITE005 - Pune        : High protocol deviations, low enrollment, high dropout.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os
import random

random.seed(42)
np.random.seed(42)

TRIAL_START = datetime(2023, 6, 1)
DATA_CUTOFF  = datetime(2024, 6, 1)
OUTPUT_DIR   = "data"
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── SITES ──────────────────────────────────────────────────────────────────────

sites = pd.DataFrame([
    {"site_id": "SITE001", "site_name": "KEM Hospital Mumbai",         "country": "India", "target_enrollment": 40},
    {"site_id": "SITE002", "site_name": "AIIMS Delhi",                  "country": "India", "target_enrollment": 40},
    {"site_id": "SITE003", "site_name": "Apollo Chennai",               "country": "India", "target_enrollment": 35},
    {"site_id": "SITE004", "site_name": "Sterling Ahmedabad",           "country": "India", "target_enrollment": 35},
    {"site_id": "SITE005", "site_name": "Ruby Hall Pune",               "country": "India", "target_enrollment": 30},
])
sites.to_csv(f"{OUTPUT_DIR}/sites.csv", index=False)


# ── HELPERS ────────────────────────────────────────────────────────────────────

def rand_date(start, end):
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(delta, 0)))

def date_plus(dt, days):
    return dt + timedelta(days=int(days))


# ── PATIENTS ───────────────────────────────────────────────────────────────────
# Each site has enrolled patients + screened-but-failed patients.
# SITE005 has high screen failure and dropout.

patient_rows = []
pid = 1

site_profiles = {
    "SITE001": {"enrolled": 38, "screen_fail_extra": 8,  "dropout_rate": 0.05, "elig_violation_rate": 0.01},
    "SITE002": {"enrolled": 34, "screen_fail_extra": 10, "dropout_rate": 0.08, "elig_violation_rate": 0.02},
    "SITE003": {"enrolled": 30, "screen_fail_extra": 9,  "dropout_rate": 0.10, "elig_violation_rate": 0.03},
    "SITE004": {"enrolled": 32, "screen_fail_extra": 8,  "dropout_rate": 0.09, "elig_violation_rate": 0.02},
    "SITE005": {"enrolled": 16, "screen_fail_extra": 18, "dropout_rate": 0.28, "elig_violation_rate": 0.06},
}

for site_id, prof in site_profiles.items():
    # Screen failures
    for _ in range(prof["screen_fail_extra"]):
        patient_rows.append({
            "patient_id":          f"PT{pid:04d}",
            "site_id":             site_id,
            "screen_date":         rand_date(TRIAL_START, TRIAL_START + timedelta(days=180)),
            "enrolled":            False,
            "enroll_date":         None,
            "discontinued":        False,
            "discontinue_date":    None,
            "eligibility_violation": False,
            "status":              "SCREEN_FAIL",
        })
        pid += 1

    # Enrolled patients
    for i in range(prof["enrolled"]):
        enroll_date = rand_date(TRIAL_START, TRIAL_START + timedelta(days=270))
        discontinued = random.random() < prof["dropout_rate"]
        disc_date = date_plus(enroll_date, random.randint(30, 200)) if discontinued else None
        elig_viol = random.random() < prof["elig_violation_rate"]
        patient_rows.append({
            "patient_id":          f"PT{pid:04d}",
            "site_id":             site_id,
            "screen_date":         date_plus(enroll_date, -random.randint(3, 14)),
            "enrolled":            True,
            "enroll_date":         enroll_date,
            "discontinued":        discontinued,
            "discontinue_date":    disc_date,
            "eligibility_violation": elig_viol,
            "status":              "DISCONTINUED" if discontinued else "ACTIVE",
        })
        pid += 1

patients = pd.DataFrame(patient_rows)
patients.to_csv(f"{OUTPUT_DIR}/patients.csv", index=False)
enrolled = patients[patients["enrolled"] == True].copy()


# ── VISITS ─────────────────────────────────────────────────────────────────────
# Protocol: 6 visits per patient (Screening, Week 4, 8, 12, 24, End of Study)
# Visit window: ±7 days
# SITE002: high data entry lag (avg 12 days)
# SITE005: many missed/out-of-window visits

visit_rows = []
vid = 1
VISIT_OFFSETS = [0, 28, 56, 84, 168, 336]   # days from enroll

entry_lag_profile = {
    "SITE001": (2, 2),   # mean, sd (days)
    "SITE002": (12, 5),
    "SITE003": (6, 3),
    "SITE004": (4, 2),
    "SITE005": (5, 3),
}

for _, pt in enrolled.iterrows():
    enroll = pd.to_datetime(pt["enroll_date"])
    disc   = pd.to_datetime(pt["discontinue_date"]) if pd.notna(pt["discontinue_date"]) else None
    lag_mean, lag_sd = entry_lag_profile[pt["site_id"]]

    for v_num, offset in enumerate(VISIT_OFFSETS, start=1):
        scheduled = enroll + timedelta(days=offset)
        if scheduled > DATA_CUTOFF:
            break
        if disc and scheduled > disc:
            break

        # window jitter: SITE005 often out-of-window
        if pt["site_id"] == "SITE005" and random.random() < 0.22:
            jitter = random.choice([-1, 1]) * random.randint(8, 20)
            completed = random.random() > 0.15
        else:
            jitter = random.randint(-5, 5)
            completed = random.random() > 0.03

        actual_date = scheduled + timedelta(days=jitter)
        in_window   = abs(jitter) <= 7

        if not completed:
            visit_rows.append({
                "visit_id":    f"V{vid:05d}",
                "patient_id":  pt["patient_id"],
                "site_id":     pt["site_id"],
                "visit_num":   v_num,
                "scheduled_date": scheduled,
                "visit_date":  None,
                "entry_date":  None,
                "completed":   False,
                "in_window":   False,
            })
        else:
            lag = max(1, int(np.random.normal(lag_mean, lag_sd)))
            entry_date = actual_date + timedelta(days=lag)
            visit_rows.append({
                "visit_id":    f"V{vid:05d}",
                "patient_id":  pt["patient_id"],
                "site_id":     pt["site_id"],
                "visit_num":   v_num,
                "scheduled_date": scheduled,
                "visit_date":  actual_date,
                "entry_date":  entry_date,
                "completed":   True,
                "in_window":   in_window,
            })
        vid += 1

visits = pd.DataFrame(visit_rows)
visits.to_csv(f"{OUTPUT_DIR}/visits.csv", index=False)


# ── QUERIES ────────────────────────────────────────────────────────────────────
# SITE002: high query rate + slow resolution

query_rows = []
qid = 1

query_rate_profile = {
    "SITE001": 0.06,   # queries per data point
    "SITE002": 0.22,
    "SITE003": 0.09,
    "SITE004": 0.07,
    "SITE005": 0.11,
}

resolution_days_profile = {
    "SITE001": (5, 3),
    "SITE002": (28, 12),
    "SITE003": (10, 5),
    "SITE004": (8, 4),
    "SITE005": (14, 7),
}

completed_visits = visits[visits["completed"] == True]

for _, v in completed_visits.iterrows():
    n_fields = 20   # assume 20 CRF fields per visit
    q_rate   = query_rate_profile[v["site_id"]]
    n_queries = np.random.poisson(n_fields * q_rate)
    res_mean, res_sd = resolution_days_profile[v["site_id"]]

    for _ in range(n_queries):
        raised = pd.to_datetime(v["entry_date"]) + timedelta(days=random.randint(1, 5))
        resolved = random.random() > 0.12   # 12% still open
        if resolved:
            days_to_resolve = max(1, int(np.random.normal(res_mean, res_sd)))
            close_date = raised + timedelta(days=days_to_resolve)
        else:
            close_date = None

        query_rows.append({
            "query_id":    f"Q{qid:05d}",
            "visit_id":    v["visit_id"],
            "patient_id":  v["patient_id"],
            "site_id":     v["site_id"],
            "raised_date": raised,
            "close_date":  close_date,
            "status":      "CLOSED" if resolved else "OPEN",
        })
        qid += 1

queries = pd.DataFrame(query_rows)
queries.to_csv(f"{OUTPUT_DIR}/queries.csv", index=False)


# ── SERIOUS ADVERSE EVENTS ─────────────────────────────────────────────────────
# SITE003: late SAE reporting + poor reconciliation

sae_rows = []
sae_id = 1

sae_rate_profile    = {"SITE001": 0.08, "SITE002": 0.09, "SITE003": 0.10, "SITE004": 0.08, "SITE005": 0.10}
late_report_profile = {"SITE001": 0.03, "SITE002": 0.05, "SITE003": 0.38, "SITE004": 0.06, "SITE005": 0.08}
recon_rate_profile  = {"SITE001": 0.97, "SITE002": 0.93, "SITE003": 0.62, "SITE004": 0.95, "SITE005": 0.88}

for _, pt in enrolled.iterrows():
    if random.random() < sae_rate_profile[pt["site_id"]]:
        enroll = pd.to_datetime(pt["enroll_date"])
        aware_date  = rand_date(enroll, enroll + timedelta(days=300))
        is_fatal    = random.random() < 0.06
        deadline    = 7 if is_fatal else 15

        if random.random() < late_report_profile[pt["site_id"]]:
            report_days = random.randint(deadline + 1, deadline + 20)
        else:
            report_days = random.randint(1, deadline - 1)

        report_date  = date_plus(aware_date, report_days)
        reconciled   = random.random() < recon_rate_profile[pt["site_id"]]

        sae_rows.append({
            "sae_id":       f"SAE{sae_id:04d}",
            "patient_id":   pt["patient_id"],
            "site_id":      pt["site_id"],
            "aware_date":   aware_date,
            "report_date":  report_date,
            "fatal":        is_fatal,
            "deadline_days": deadline,
            "reported_on_time": report_days <= deadline,
            "reconciled":   reconciled,
        })
        sae_id += 1

saes = pd.DataFrame(sae_rows)
saes.to_csv(f"{OUTPUT_DIR}/saes.csv", index=False)


# ── PROTOCOL DEVIATIONS ────────────────────────────────────────────────────────
# SITE005: high deviation rate with high important-deviation ratio

dev_rows = []
did = 1

dev_rate_profile      = {"SITE001": 0.03, "SITE002": 0.06, "SITE003": 0.05, "SITE004": 0.05, "SITE005": 0.14}
important_rate_profile= {"SITE001": 0.15, "SITE002": 0.20, "SITE003": 0.22, "SITE004": 0.18, "SITE005": 0.48}

DEV_TYPES = ["Visit out of window", "Prohibited medication", "Missed assessment",
             "Dose error", "Eligibility criteria", "Procedure timing", "Consent issue"]

for _, v in completed_visits.iterrows():
    if random.random() < dev_rate_profile[v["site_id"]]:
        important = random.random() < important_rate_profile[v["site_id"]]
        dev_rows.append({
            "deviation_id": f"DEV{did:04d}",
            "visit_id":     v["visit_id"],
            "patient_id":   v["patient_id"],
            "site_id":      v["site_id"],
            "deviation_type": random.choice(DEV_TYPES),
            "important":    important,
        })
        did += 1

deviations = pd.DataFrame(dev_rows)
deviations.to_csv(f"{OUTPUT_DIR}/deviations.csv", index=False)


# ── INVESTIGATIONAL PRODUCT ────────────────────────────────────────────────────

ip_rows = []
iid = 1

ip_disc_profile = {"SITE001": 0.005, "SITE002": 0.01, "SITE003": 0.008, "SITE004": 0.009, "SITE005": 0.015}
ip_temp_profile = {"SITE001": 0.005, "SITE002": 0.012, "SITE003": 0.009, "SITE004": 0.008, "SITE005": 0.018}

for site_id in sites["site_id"]:
    for week in range(52):
        check_date = TRIAL_START + timedelta(weeks=week)
        discrepancy = random.random() < ip_disc_profile[site_id]
        temp_excursion = random.random() < ip_temp_profile[site_id]

        ip_rows.append({
            "record_id":      f"IP{iid:04d}",
            "site_id":        site_id,
            "check_date":     check_date,
            "dispensed":      random.randint(1, 10),
            "discrepancy":    discrepancy,
            "temp_excursion": temp_excursion,
        })
        iid += 1

ip_records = pd.DataFrame(ip_rows)
ip_records.to_csv(f"{OUTPUT_DIR}/ip_records.csv", index=False)


# ── MEASUREMENTS (Primary Endpoint + BP) ──────────────────────────────────────
# SITE004: fabricated data — suspiciously low variability + digit preference

meas_rows = []
mid = 1

for _, v in completed_visits.iterrows():
    site = v["site_id"]

    # Primary endpoint (e.g. HbA1c reduction score 0-100)
    if site == "SITE004":
        # Fabricated: very tight clustering, digit preference (rounds to 0 or 5)
        raw = np.random.normal(47, 1.8)
        primary = round(raw / 5) * 5   # strong rounding to multiples of 5
    else:
        primary = round(np.random.normal(45, 11), 1)

    # Systolic BP
    if site == "SITE004":
        raw_sbp = np.random.normal(128, 2.5)
        systolic = round(raw_sbp / 10) * 10   # rounds to nearest 10
    else:
        systolic = round(np.random.normal(132, 14), 0)

    diastolic = round(np.random.normal(82, 9), 0)

    meas_rows.append({
        "measurement_id":    f"M{mid:05d}",
        "visit_id":          v["visit_id"],
        "patient_id":        v["patient_id"],
        "site_id":           site,
        "primary_endpoint":  primary,
        "systolic_bp":       systolic,
        "diastolic_bp":      diastolic,
    })
    mid += 1

measurements = pd.DataFrame(meas_rows)
measurements.to_csv(f"{OUTPUT_DIR}/measurements.csv", index=False)


# ── SUMMARY ────────────────────────────────────────────────────────────────────
print("Synthetic data generated successfully.")
print()
print(f"  sites.csv          {len(sites):>5} rows")
print(f"  patients.csv       {len(patients):>5} rows")
print(f"  visits.csv         {len(visits):>5} rows")
print(f"  queries.csv        {len(queries):>5} rows")
print(f"  saes.csv           {len(saes):>5} rows")
print(f"  deviations.csv     {len(deviations):>5} rows")
print(f"  ip_records.csv     {len(ip_records):>5} rows")
print(f"  measurements.csv   {len(measurements):>5} rows")
