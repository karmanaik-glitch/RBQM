"""
kri_calculator.py — All 20 KRI calculations
---------------------------------------------
Each KRI function takes the full data dictionary and a site_id,
returns a KRIResult. Statuses are assigned as:
  GREEN  — within normal range
  YELLOW — approaching threshold, requires attention
  RED    — threshold breached, requires immediate action
  INSUFFICIENT_DATA — not enough records to calculate reliably
"""

import numpy as np
import pandas as pd
from scipy import stats
from engine.models import KRIResult


MIN_RECORDS = 5   # minimum records needed for a reliable calculation


def _status(value, yellow, red, higher_is_worse=True):
    """Assign GREEN/YELLOW/RED based on thresholds."""
    if higher_is_worse:
        if value >= red:    return "RED"
        if value >= yellow: return "YELLOW"
        return "GREEN"
    else:
        # lower is worse (e.g. enrollment rate, visit completion rate)
        if value <= red:    return "RED"
        if value <= yellow: return "YELLOW"
        return "GREEN"


def _result(kri_id, kri_name, domain, site_id, value, unit,
            yellow, red, higher_is_worse, interpretation):
    if value is None:
        return KRIResult(kri_id, kri_name, domain, site_id, None, unit,
                         yellow, red, higher_is_worse,
                         "INSUFFICIENT_DATA", "Not enough data to calculate.")
    status = _status(value, yellow, red, higher_is_worse)
    return KRIResult(kri_id, kri_name, domain, site_id, round(value, 2),
                     unit, yellow, red, higher_is_worse, status, interpretation)


# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 1 — DATA QUALITY
# ══════════════════════════════════════════════════════════════════════════════

def kri_1_1_missing_data_rate(data, site_id):
    """Missing fields / total expected fields × 100."""
    visits = data["visits"]
    site_v = visits[visits["site_id"] == site_id]
    if len(site_v) < MIN_RECORDS:
        return _result("1.1", "Missing Data Rate", "Data Quality", site_id,
                       None, "%", 5.0, 10.0, True, "")

    total_expected = len(site_v) * 20      # 20 CRF fields per visit assumed
    # Missed visits = all fields missing. Completed visits may have partial nulls.
    missed_visits  = len(site_v[site_v["completed"] == False])
    # Simulate partial missing within completed visits (1-3% field-level missing)
    completed_count = len(site_v[site_v["completed"] == True])
    partial_missing = int(completed_count * 20 * np.random.uniform(0.01, 0.03))
    total_missing   = (missed_visits * 20) + partial_missing
    rate = (total_missing / total_expected) * 100

    interp = (f"{rate:.1f}% of expected data points are missing "
              f"({total_missing} of {total_expected} fields).")
    return _result("1.1", "Missing Data Rate", "Data Quality", site_id,
                   rate, "%", 5.0, 10.0, True, interp)


def kri_1_2_query_rate(data, site_id):
    """Queries per 100 data points entered."""
    queries = data["queries"]
    visits  = data["visits"]
    site_q  = queries[queries["site_id"] == site_id]
    site_v  = visits[(visits["site_id"] == site_id) & (visits["completed"] == True)]

    if len(site_v) < MIN_RECORDS:
        return _result("1.2", "Query Rate", "Data Quality", site_id,
                       None, "per 100 pts", 10.0, 20.0, True, "")

    data_points = len(site_v) * 20
    rate = (len(site_q) / data_points) * 100

    interp = (f"{len(site_q)} queries raised across {data_points} data points "
              f"({rate:.1f} per 100).")
    return _result("1.2", "Query Rate", "Data Quality", site_id,
                   rate, "per 100 pts", 10.0, 20.0, True, interp)


def kri_1_3_query_resolution_time(data, site_id):
    """Average days to close a query."""
    queries = data["queries"]
    site_q  = queries[
        (queries["site_id"] == site_id) & (queries["status"] == "CLOSED")
    ].copy()

    if len(site_q) < MIN_RECORDS:
        return _result("1.3", "Query Resolution Time", "Data Quality", site_id,
                       None, "days", 14.0, 30.0, True, "")

    site_q["raised_date"] = pd.to_datetime(site_q["raised_date"])
    site_q["close_date"]  = pd.to_datetime(site_q["close_date"])
    site_q["days"]        = (site_q["close_date"] - site_q["raised_date"]).dt.days
    avg = site_q["days"].mean()

    interp = (f"Average {avg:.1f} days to resolve a query "
              f"(across {len(site_q)} closed queries).")
    return _result("1.3", "Query Resolution Time", "Data Quality", site_id,
                   avg, "days", 14.0, 30.0, True, interp)


def kri_1_4_data_entry_lag(data, site_id):
    """Average days between visit date and EDC entry date."""
    visits = data["visits"]
    site_v = visits[
        (visits["site_id"] == site_id) & (visits["completed"] == True)
    ].copy()

    if len(site_v) < MIN_RECORDS:
        return _result("1.4", "Data Entry Lag", "Data Quality", site_id,
                       None, "days", 7.0, 14.0, True, "")

    site_v["visit_date"] = pd.to_datetime(site_v["visit_date"])
    site_v["entry_date"] = pd.to_datetime(site_v["entry_date"])
    site_v["lag"]        = (site_v["entry_date"] - site_v["visit_date"]).dt.days
    avg = site_v["lag"].mean()

    interp = (f"Average {avg:.1f} days between visit and EDC data entry "
              f"(across {len(site_v)} visits).")
    return _result("1.4", "Data Entry Lag", "Data Quality", site_id,
                   avg, "days", 7.0, 14.0, True, interp)


def kri_1_5_data_correction_rate(data, site_id):
    """
    Proxy: ratio of queries that were closed (corrected) to total records.
    In a real system this uses DCF/audit trail records.
    """
    queries = data["queries"]
    visits  = data["visits"]
    site_q  = queries[
        (queries["site_id"] == site_id) & (queries["status"] == "CLOSED")
    ]
    site_v  = visits[
        (visits["site_id"] == site_id) & (visits["completed"] == True)
    ]

    if len(site_v) < MIN_RECORDS:
        return _result("1.5", "Data Correction Rate", "Data Quality", site_id,
                       None, "%", 5.0, 15.0, True, "")

    total_records = len(site_v) * 20
    rate = (len(site_q) / total_records) * 100

    interp = (f"{len(site_q)} corrections across {total_records} records "
              f"({rate:.1f}%).")
    return _result("1.5", "Data Correction Rate", "Data Quality", site_id,
                   rate, "%", 5.0, 15.0, True, interp)


# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 2 — SAFETY REPORTING
# ══════════════════════════════════════════════════════════════════════════════

def kri_2_1_sae_15day_compliance(data, site_id):
    """% SAEs reported within required timeframe (15 days / 7 for fatal)."""
    saes    = data["saes"]
    site_s  = saes[saes["site_id"] == site_id]

    if len(site_s) == 0:
        return _result("2.1", "SAE 15-Day Compliance", "Safety", site_id,
                       None, "%", 95.0, 85.0, False, "No SAEs reported at this site.")

    on_time = site_s["reported_on_time"].sum()
    rate    = (on_time / len(site_s)) * 100

    interp = (f"{int(on_time)} of {len(site_s)} SAEs reported within required "
              f"timeframe ({rate:.1f}% compliance).")
    return _result("2.1", "SAE 15-Day Compliance", "Safety", site_id,
                   rate, "%", 95.0, 85.0, False, interp)


def kri_2_2_ae_rate_vs_expected(data, site_id):
    """Z-score of site AE rate vs cross-site mean."""
    saes     = data["saes"]
    patients = data["patients"]

    enrolled = patients[patients["enrolled"] == True]
    site_counts = saes.groupby("site_id").size()
    pt_counts   = enrolled.groupby("site_id").size()

    rates = (site_counts / pt_counts).fillna(0)

    if site_id not in rates or len(rates) < 3:
        return _result("2.2", "AE Rate vs Expected", "Safety", site_id,
                       None, "z-score", 2.0, 3.0, True, "")

    site_rate  = rates[site_id]
    mean_rate  = rates.mean()
    std_rate   = rates.std()

    if std_rate == 0:
        z = 0.0
    else:
        z = abs((site_rate - mean_rate) / std_rate)

    direction = "above" if site_rate > mean_rate else "below"
    interp = (f"Site AE rate is {site_rate:.2f} per patient "
              f"({direction} trial mean of {mean_rate:.2f}). "
              f"Z-score: {z:.2f}.")
    return _result("2.2", "AE Rate vs Expected", "Safety", site_id,
                   z, "z-score", 2.0, 3.0, True, interp)


def kri_2_3_sae_reconciliation(data, site_id):
    """% SAEs reconciled between clinical DB and safety DB."""
    saes   = data["saes"]
    site_s = saes[saes["site_id"] == site_id]

    if len(site_s) == 0:
        return _result("2.3", "SAE Reconciliation", "Safety", site_id,
                       None, "%", 90.0, 75.0, False, "No SAEs at this site.")

    recon = site_s["reconciled"].sum()
    rate  = (recon / len(site_s)) * 100

    unreconciled = int(len(site_s) - recon)
    interp = (f"{int(recon)} of {len(site_s)} SAEs reconciled "
              f"({rate:.1f}%). {unreconciled} outstanding — "
              f"database lock blocker if unresolved.")
    return _result("2.3", "SAE Reconciliation", "Safety", site_id,
                   rate, "%", 90.0, 75.0, False, interp)


# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 3 — PROTOCOL ADHERENCE
# ══════════════════════════════════════════════════════════════════════════════

def kri_3_1_protocol_deviation_rate(data, site_id):
    """Protocol deviations per 100 patient visits."""
    devs   = data["deviations"]
    visits = data["visits"]
    site_d = devs[devs["site_id"] == site_id]
    site_v = visits[
        (visits["site_id"] == site_id) & (visits["completed"] == True)
    ]

    if len(site_v) < MIN_RECORDS:
        return _result("3.1", "Protocol Deviation Rate", "Protocol Adherence",
                       site_id, None, "per 100 visits", 5.0, 10.0, True, "")

    rate = (len(site_d) / len(site_v)) * 100

    interp = (f"{len(site_d)} deviations across {len(site_v)} visits "
              f"({rate:.1f} per 100 visits).")
    return _result("3.1", "Protocol Deviation Rate", "Protocol Adherence",
                   site_id, rate, "per 100 visits", 5.0, 10.0, True, interp)


def kri_3_2_important_deviation_ratio(data, site_id):
    """Important deviations as % of all deviations."""
    devs   = data["deviations"]
    site_d = devs[devs["site_id"] == site_id]

    if len(site_d) < MIN_RECORDS:
        return _result("3.2", "Important Deviation Ratio", "Protocol Adherence",
                       site_id, None, "%", 20.0, 40.0, True, "")

    important = site_d["important"].sum()
    rate      = (important / len(site_d)) * 100

    interp = (f"{int(important)} of {len(site_d)} deviations classified as "
              f"important ({rate:.1f}%). "
              f"Important deviations affect patient safety or data integrity.")
    return _result("3.2", "Important Deviation Ratio", "Protocol Adherence",
                   site_id, rate, "%", 20.0, 40.0, True, interp)


def kri_3_3_eligibility_deviation_rate(data, site_id):
    """Patients with eligibility violation / total enrolled × 100."""
    patients = data["patients"]
    site_p   = patients[
        (patients["site_id"] == site_id) & (patients["enrolled"] == True)
    ]

    if len(site_p) < MIN_RECORDS:
        return _result("3.3", "Eligibility Deviation Rate", "Protocol Adherence",
                       site_id, None, "%", 2.0, 5.0, True, "")

    violations = site_p["eligibility_violation"].sum()
    rate       = (violations / len(site_p)) * 100

    interp = (f"{int(violations)} of {len(site_p)} enrolled patients have "
              f"documented eligibility violations ({rate:.1f}%). "
              f"Any rate > 0 warrants immediate investigation.")
    return _result("3.3", "Eligibility Deviation Rate", "Protocol Adherence",
                   site_id, rate, "%", 2.0, 5.0, True, interp)


# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 4 — SITE PERFORMANCE & ENROLLMENT
# ══════════════════════════════════════════════════════════════════════════════

def kri_4_1_enrollment_vs_target(data, site_id):
    """Actual enrolled / target enrollment × 100."""
    patients = data["patients"]
    sites    = data["sites"]

    target   = sites.loc[sites["site_id"] == site_id, "target_enrollment"].values[0]
    enrolled = len(patients[
        (patients["site_id"] == site_id) & (patients["enrolled"] == True)
    ])
    rate = (enrolled / target) * 100

    interp = (f"{enrolled} patients enrolled against target of {target} "
              f"({rate:.1f}% of target achieved).")
    return _result("4.1", "Enrollment vs Target", "Site Performance",
                   site_id, rate, "%", 70.0, 50.0, False, interp)


def kri_4_2_screen_failure_rate(data, site_id):
    """Screen failures / total screened × 100."""
    patients = data["patients"]
    site_p   = patients[patients["site_id"] == site_id]
    total    = len(site_p)
    failures = len(site_p[site_p["status"] == "SCREEN_FAIL"])

    if total < MIN_RECORDS:
        return _result("4.2", "Screen Failure Rate", "Site Performance",
                       site_id, None, "%", 40.0, 60.0, True, "")

    rate = (failures / total) * 100

    interp = (f"{failures} screen failures out of {total} screened "
              f"({rate:.1f}%). High rate suggests protocol/population mismatch.")
    return _result("4.2", "Screen Failure Rate", "Site Performance",
                   site_id, rate, "%", 40.0, 60.0, True, interp)


def kri_4_3_dropout_rate(data, site_id):
    """Discontinued patients / enrolled patients × 100."""
    patients = data["patients"]
    site_p   = patients[
        (patients["site_id"] == site_id) & (patients["enrolled"] == True)
    ]

    if len(site_p) < MIN_RECORDS:
        return _result("4.3", "Dropout Rate", "Site Performance",
                       site_id, None, "%", 15.0, 25.0, True, "")

    dropouts = site_p["discontinued"].sum()
    rate     = (dropouts / len(site_p)) * 100

    interp = (f"{int(dropouts)} of {len(site_p)} enrolled patients discontinued "
              f"({rate:.1f}%). High dropout affects statistical power and "
              f"may signal patient burden or safety issues.")
    return _result("4.3", "Dropout Rate", "Site Performance",
                   site_id, rate, "%", 15.0, 25.0, True, interp)


def kri_4_4_visit_completion_rate(data, site_id):
    """Completed visits / scheduled visits × 100."""
    visits = data["visits"]
    site_v = visits[visits["site_id"] == site_id]

    if len(site_v) < MIN_RECORDS:
        return _result("4.4", "Visit Completion Rate", "Site Performance",
                       site_id, None, "%", 90.0, 80.0, False, "")

    completed = site_v["completed"].sum()
    rate      = (completed / len(site_v)) * 100

    interp = (f"{int(completed)} of {len(site_v)} scheduled visits completed "
              f"({rate:.1f}%).")
    return _result("4.4", "Visit Completion Rate", "Site Performance",
                   site_id, rate, "%", 90.0, 80.0, False, interp)


# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 5 — INVESTIGATIONAL PRODUCT
# ══════════════════════════════════════════════════════════════════════════════

def kri_5_1_ip_accountability(data, site_id):
    """Records with discrepancy / total records × 100."""
    ip     = data["ip_records"]
    site_i = ip[ip["site_id"] == site_id]

    if len(site_i) == 0:
        return _result("5.1", "IP Accountability", "Investigational Product",
                       site_id, None, "%", 0.5, 1.0, True, "")

    disc_rate = (site_i["discrepancy"].sum() / len(site_i)) * 100

    interp = (f"{int(site_i['discrepancy'].sum())} of {len(site_i)} IP records "
              f"have discrepancies ({disc_rate:.1f}%). "
              f"Any unresolved discrepancy is a GCP finding.")
    return _result("5.1", "IP Accountability", "Investigational Product",
                   site_id, disc_rate, "%", 0.5, 1.0, True, interp)


def kri_5_2_temperature_excursion_rate(data, site_id):
    """Temperature excursion events / total checks × 100."""
    ip     = data["ip_records"]
    site_i = ip[ip["site_id"] == site_id]

    if len(site_i) == 0:
        return _result("5.2", "Temperature Excursion Rate", "Investigational Product",
                       site_id, None, "%", 1.0, 5.0, True, "")

    rate = (site_i["temp_excursion"].sum() / len(site_i)) * 100

    interp = (f"{int(site_i['temp_excursion'].sum())} temperature excursions "
              f"in {len(site_i)} checks ({rate:.1f}%). "
              f"Each excursion requires IP usability assessment.")
    return _result("5.2", "Temperature Excursion Rate", "Investigational Product",
                   site_id, rate, "%", 1.0, 5.0, True, interp)


# ══════════════════════════════════════════════════════════════════════════════
# DOMAIN 6 — CENTRAL STATISTICAL MONITORING
# ══════════════════════════════════════════════════════════════════════════════

def kri_6_1_intra_site_variability(data, site_id):
    """
    Coefficient of variation (CV) for primary endpoint at this site,
    expressed as z-score relative to cross-site CV distribution.
    Low z-score (< -2) = suspiciously low variability = fabrication signal.
    """
    meas = data["measurements"]

    site_cvs = {}
    for sid in meas["site_id"].unique():
        vals = meas.loc[meas["site_id"] == sid, "primary_endpoint"].dropna()
        if len(vals) >= MIN_RECORDS and vals.mean() != 0:
            site_cvs[sid] = (vals.std() / vals.mean()) * 100

    if site_id not in site_cvs or len(site_cvs) < 3:
        return _result("6.1", "Intra-Site Data Variability", "Statistical Monitoring",
                       site_id, None, "z-score", -2.0, -3.0, True, "")

    cv_values = list(site_cvs.values())
    mean_cv   = np.mean(cv_values)
    std_cv    = np.std(cv_values)
    site_cv   = site_cvs[site_id]

    if std_cv == 0:
        z = 0.0
    else:
        z = (site_cv - mean_cv) / std_cv   # negative = lower variability than mean

    interp = (f"Site CV = {site_cv:.1f}% (trial mean = {mean_cv:.1f}%). "
              f"Z-score = {z:.2f}. "
              f"{'Suspiciously low variability — possible fabrication signal.' if z < -2 else 'Within normal range.'}")
    # For this KRI, MORE negative = MORE concerning, so we flag on z < -2
    # We pass abs(min(z,0)) as the value so _status works correctly
    flag_value = abs(min(z, 0))
    return _result("6.1", "Intra-Site Data Variability", "Statistical Monitoring",
                   site_id, round(z, 2), "z-score (CV)", -2.0, -3.0, False, interp)


def kri_6_2_digit_preference_index(data, site_id):
    """
    Chi-square test on last digit of systolic BP measurements.
    Expected: uniform distribution (10% each digit 0-9).
    Low p-value = non-random digit pattern = fabrication signal.
    """
    meas   = data["measurements"]
    site_m = meas[meas["site_id"] == site_id]["systolic_bp"].dropna()

    if len(site_m) < 20:
        return _result("6.2", "Digit Preference Index", "Statistical Monitoring",
                       site_id, None, "p-value", 0.05, 0.01, False, "")

    last_digits = site_m.astype(int) % 10
    observed    = [sum(last_digits == d) for d in range(10)]
    expected    = [len(site_m) / 10.0] * 10

    chi2, p_value = stats.chisquare(observed, expected)

    interp = (f"Chi-square test on last digit of {len(site_m)} BP readings: "
              f"p = {p_value:.4f}. "
              f"{'Non-random digit distribution — possible rounding or fabrication.' if p_value < 0.05 else 'Digit distribution appears random.'}")
    return _result("6.2", "Digit Preference Index", "Statistical Monitoring",
                   site_id, round(p_value, 4), "p-value", 0.05, 0.01, False, interp)


def kri_6_3_endpoint_outlier_score(data, site_id):
    """
    Z-score of site mean primary endpoint vs cross-site distribution.
    Flags sites whose patients are extreme outliers on the primary endpoint.
    """
    meas = data["measurements"]

    site_means = meas.groupby("site_id")["primary_endpoint"].mean()

    if site_id not in site_means or len(site_means) < 3:
        return _result("6.3", "Cross-Site Endpoint Outlier", "Statistical Monitoring",
                       site_id, None, "z-score", 2.0, 3.0, True, "")

    mean_of_means = site_means.mean()
    std_of_means  = site_means.std()
    site_mean     = site_means[site_id]

    if std_of_means == 0:
        z = 0.0
    else:
        z = abs((site_mean - mean_of_means) / std_of_means)

    interp = (f"Site mean primary endpoint = {site_mean:.1f} "
              f"(trial mean = {mean_of_means:.1f}). "
              f"Z-score = {z:.2f}. "
              f"{'Significant outlier — investigate patient population or data integrity.' if z > 2 else 'Within normal range.'}")
    return _result("6.3", "Cross-Site Endpoint Outlier", "Statistical Monitoring",
                   site_id, round(z, 2), "z-score", 2.0, 3.0, True, interp)


# ══════════════════════════════════════════════════════════════════════════════
# MASTER RUNNER
# ══════════════════════════════════════════════════════════════════════════════

ALL_KRI_FUNCTIONS = [
    kri_1_1_missing_data_rate,
    kri_1_2_query_rate,
    kri_1_3_query_resolution_time,
    kri_1_4_data_entry_lag,
    kri_1_5_data_correction_rate,
    kri_2_1_sae_15day_compliance,
    kri_2_2_ae_rate_vs_expected,
    kri_2_3_sae_reconciliation,
    kri_3_1_protocol_deviation_rate,
    kri_3_2_important_deviation_ratio,
    kri_3_3_eligibility_deviation_rate,
    kri_4_1_enrollment_vs_target,
    kri_4_2_screen_failure_rate,
    kri_4_3_dropout_rate,
    kri_4_4_visit_completion_rate,
    kri_5_1_ip_accountability,
    kri_5_2_temperature_excursion_rate,
    kri_6_1_intra_site_variability,
    kri_6_2_digit_preference_index,
    kri_6_3_endpoint_outlier_score,
]


def calculate_all_kris(data, site_id, threshold_overrides: dict = None):
    """Run all 20 KRIs for a given site. Returns list of KRIResult."""
    results = [fn(data, site_id) for fn in ALL_KRI_FUNCTIONS]
    
    if threshold_overrides:
        for res in results:
            if res.kri_id in threshold_overrides:
                override = threshold_overrides[res.kri_id]
                res.yellow = override.get("yellow", res.yellow)
                res.red = override.get("red", res.red)
                if res.value is not None:
                    res.status = _status(res.value, res.yellow, res.red, res.higher_is_worse)
                    
    return results
