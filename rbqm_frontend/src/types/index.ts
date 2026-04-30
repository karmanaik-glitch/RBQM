/** Core types for Vritas RBQM - ICH E6 R3 Aligned */

export type Status = 'GREEN' | 'YELLOW' | 'RED' | 'INSUFFICIENT_DATA'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface SiteDetail extends SiteSummary {
  kris: KRI[]
}

export interface SiteSummary {
  site_id: string
  site_name: string
  risk_level: RiskLevel
  red_count: number
  yellow_count: number
  green_count: number
}

export interface KRI {
  kri_id: string
  kri_name: string
  domain: string
  value: number | null
  unit: string
  threshold_yellow: number
  threshold_red: number
  status: Status
  interpretation: string
}

export interface Alert {
  site_id: string
  site_name: string
  kri_id: string
  kri_name: string
  domain: string
  value: number | null
  unit: string
  interpretation: string
}

export interface Portfolio {
  trial_id: string
  total_sites: number
  total_red: number
  total_yellow: number
  total_green: number
  sites_by_risk: Record<string, number>
  critical_sites: string[]
  alerts_count: number
  lock_ready_count: number
}

export interface User {
  email: string
  role: string
  org_id?: number
}
