export type LockStatus = 'READY' | 'AT_RISK' | 'BLOCKED';

export interface LockBlocker {
  kri_id: string;
  kri_name: string;
  score_impact: number;
  est_days: number;
  interpretation: string;
}

export interface SiteLock {
  site_id: string;
  site_name: string;
  lock_score: number;
  lock_status: LockStatus;
  hard_blockers: LockBlocker[];
  soft_blockers: LockBlocker[];
  total_blockers: number;
  summary: string;
  est_days_to_lock: number;
}

export interface TrialLock {
  trial_id: string;
  trial_lock_score: number;
  trial_lock_status: LockStatus;
  summary: string;
  predicted_lock_days: number;
  critical_path: string[];
  sites: SiteLock[];
}
