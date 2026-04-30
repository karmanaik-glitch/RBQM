"""
lock_readiness.py — Database Lock Readiness Engine
-----------------------------------------------------
Takes KRI results for all sites and computes:
  1. Per-site lock readiness score (0–100)
  2. Trial-level lock readiness score
  3. Predicted days to lock based on open blockers
  4. Prioritised action list — what must be resolved first

Lock blockers are KRIs that MUST be resolved before a database can be
locked under ICH E6 R3 and standard CDM practice. These are non-negotiable:
  - SAE reconciliation < 100% (every unreconciled SAE blocks lock)
  - Open queries (any outstanding query blocks lock)
  - IP accountability discrepancies
  - Unresolved important protocol deviations
  - Eligibility violations without documented waivers

Score deductions are weighted by regulatory consequence.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from engine.models import KRIResult, SiteReport


# ── BLOCKER DEFINITIONS ───────────────────────────────────────────────────────
# Each blocker maps a KRI to: weight (score deduction), estimated days to fix,
# and whether it is a hard blocker (lock impossible until resolved)

BLOCKER_CONFIG = {
    # KRI_ID: (weight, est_days_to_resolve, is_hard_blocker, label)
    "2.3": (25, 14, True,  "SAE reconciliation incomplete — hard lock blocker"),
    "1.2": (15, 7,  True,  "Outstanding queries must be resolved before lock"),
    "5.1": (15, 10, True,  "IP accountability discrepancies unresolved"),
    "3.3": (20, 21, True,  "Eligibility violations require documented waiver or exclusion"),
    "3.2": (10, 14, False, "High important deviation ratio — requires sponsor review"),
    "2.1": (10, 7,  False, "SAE reporting compliance breach — regulatory risk"),
    "1.4": (5,  3,  False, "Data entry lag — incomplete data at lock"),
    "6.1": (10, 21, False, "Data fabrication signal — requires SDV and investigation"),
    "6.2": (10, 21, False, "Digit preference detected — requires source data verification"),
    "4.3": (5,  7,  False, "High dropout — missing data imputation plan needed"),
}


@dataclass
class LockBlocker:
    kri_id:          str
    kri_name:        str
    domain:          str
    site_id:         str
    status:          str          # RED or YELLOW
    is_hard_blocker: bool
    score_impact:    int          # points deducted from lock score
    est_days:        int          # estimated days to resolve
    action:          str          # what to do
    interpretation:  str          # from KRI result


@dataclass
class SiteLockReport:
    site_id:          str
    site_name:        str
    lock_score:       int         # 0–100
    lock_status:      str         # READY / AT_RISK / BLOCKED
    hard_blockers:    List[LockBlocker] = field(default_factory=list)
    soft_blockers:    List[LockBlocker] = field(default_factory=list)
    est_days_to_lock: Optional[int] = None
    summary:          str = ""

    @property
    def total_blockers(self):
        return len(self.hard_blockers) + len(self.soft_blockers)


@dataclass
class TrialLockReport:
    trial_id:          str
    trial_lock_score:  int
    trial_lock_status: str
    predicted_lock_days: Optional[int]
    sites:             List[SiteLockReport] = field(default_factory=list)
    critical_path:     List[str] = field(default_factory=list)  # ordered actions
    summary:           str = ""


# ── SCORING ENGINE ────────────────────────────────────────────────────────────

def _score_site(report: SiteReport) -> SiteLockReport:
    score = 100
    hard_blockers = []
    soft_blockers = []

    kri_map = {k.kri_id: k for k in report.kris}

    for kri_id, (weight, est_days, is_hard, action) in BLOCKER_CONFIG.items():
        if kri_id not in kri_map:
            continue
        kri = kri_map[kri_id]
        if kri.status not in ("RED", "YELLOW"):
            continue

        # RED deducts full weight, YELLOW deducts half
        deduction = weight if kri.status == "RED" else weight // 2
        score -= deduction

        blocker = LockBlocker(
            kri_id          = kri_id,
            kri_name        = kri.kri_name,
            domain          = kri.domain,
            site_id         = report.site_id,
            status          = kri.status,
            is_hard_blocker = is_hard and kri.status == "RED",
            score_impact    = deduction,
            est_days        = est_days,
            action          = action,
            interpretation  = kri.interpretation,
        )
        if blocker.is_hard_blocker:
            hard_blockers.append(blocker)
        else:
            soft_blockers.append(blocker)

    score = max(0, score)

    # Determine lock status
    if hard_blockers:
        lock_status = "BLOCKED"
    elif score >= 80:
        lock_status = "READY"
    elif score >= 55:
        lock_status = "AT_RISK"
    else:
        lock_status = "BLOCKED"

    # Estimate days to lock = max of critical path items
    all_blockers = hard_blockers + soft_blockers
    est_days = max((b.est_days for b in all_blockers), default=0)
    # Add 5 days baseline for lock procedures even if all clear
    est_days = max(est_days + 5, 5)

    # Summary sentence
    if lock_status == "READY":
        summary = f"Site is lock-ready (score {score}/100). Minor items to monitor."
    elif lock_status == "AT_RISK":
        summary = (f"Site has {len(all_blockers)} items requiring resolution "
                   f"before lock can be confirmed (score {score}/100).")
    else:
        summary = (f"Site is BLOCKED from lock. {len(hard_blockers)} hard blocker(s) "
                   f"must be resolved. Estimated {est_days} days minimum (score {score}/100).")

    return SiteLockReport(
        site_id          = report.site_id,
        site_name        = report.site_name,
        lock_score       = score,
        lock_status      = lock_status,
        hard_blockers    = hard_blockers,
        soft_blockers    = soft_blockers,
        est_days_to_lock = est_days,
        summary          = summary,
    )


def compute_trial_lock_readiness(
    site_reports: list,
    trial_id: str = "TRIAL-2024-001"
) -> TrialLockReport:
    """
    Compute trial-level lock readiness from all site KRI reports.
    The trial cannot lock until ALL sites are lock-ready.
    The critical path is the longest chain of blockers across all sites.
    """
    site_lock_reports = [_score_site(r) for r in site_reports]

    # Trial score = average of site scores, weighted down by blocked sites
    blocked_count = sum(1 for s in site_lock_reports if s.lock_status == "BLOCKED")
    avg_score     = sum(s.lock_score for s in site_lock_reports) / len(site_lock_reports)

    # Each blocked site pulls trial score down further
    trial_score = int(avg_score * (1 - 0.1 * blocked_count))
    trial_score = max(0, trial_score)

    if blocked_count == 0 and trial_score >= 80:
        trial_status = "READY"
    elif blocked_count <= 1 and trial_score >= 60:
        trial_status = "AT_RISK"
    else:
        trial_status = "BLOCKED"

    # Critical path = max estimated days across all sites
    predicted_days = max(
        (s.est_days_to_lock for s in site_lock_reports if s.est_days_to_lock),
        default=5
    )

    # Build prioritised action list across all sites
    all_hard = []
    all_soft = []
    for sr in site_lock_reports:
        all_hard.extend(sr.hard_blockers)
        all_soft.extend(sr.soft_blockers)

    # Sort by impact descending
    all_hard.sort(key=lambda b: b.score_impact, reverse=True)
    all_soft.sort(key=lambda b: b.score_impact, reverse=True)

    critical_path = []
    seen = set()
    for b in all_hard + all_soft:
        key = f"{b.site_id}:{b.kri_id}"
        if key not in seen:
            seen.add(key)
            critical_path.append(
                f"[{b.site_id}] {b.kri_name} — {b.action}"
            )

    if trial_status == "READY":
        summary = (f"Trial is approaching lock-readiness (score {trial_score}/100). "
                   f"All sites are either ready or have minor items only.")
    elif trial_status == "AT_RISK":
        summary = (f"Trial lock is AT RISK (score {trial_score}/100). "
                   f"{blocked_count} site(s) blocked. "
                   f"Estimated {predicted_days} days to lock if action taken now.")
    else:
        summary = (f"Trial CANNOT lock in current state (score {trial_score}/100). "
                   f"{blocked_count} site(s) have hard blockers. "
                   f"Minimum {predicted_days} days to lock assuming immediate action.")

    return TrialLockReport(
        trial_id           = trial_id,
        trial_lock_score   = trial_score,
        trial_lock_status  = trial_status,
        predicted_lock_days = predicted_days,
        sites              = site_lock_reports,
        critical_path      = critical_path,
        summary            = summary,
    )
