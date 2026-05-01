import type { Portfolio, SiteSummary, SiteDetail, Alert } from '../types'
import type { TrialLock, SiteLock } from '../types/lock'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const BASE = `${BASE_URL}/api/kri`
const LOCK_BASE = `${BASE_URL}/api/lock`

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include', // Iron Triangle: Always send httpOnly cookie
    headers: {
      ...options.headers,
      ...(localStorage.getItem('rbqm_token') ? { 'Authorization': `Bearer ${localStorage.getItem('rbqm_token')}` } : {})
    },
  }
  const res = await fetch(url, mergedOptions)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  summary:  ()          => fetchWithAuth<Portfolio>(`${BASE}/summary`),
  sites:    ()          => fetchWithAuth<SiteSummary[]>(`${BASE}/sites`),
  site:     (id: string) => fetchWithAuth<SiteDetail>(`${BASE}/site/${id}`),
  alerts:   ()          => fetchWithAuth<{ total_alerts: number; alerts: Alert[] }>(`${BASE}/alerts`),
}

export const lockApi = {
  trial:    ()          => fetchWithAuth<TrialLock>(`${LOCK_BASE}/trial`),
  sites:    ()          => fetchWithAuth<SiteLock[]>(`${LOCK_BASE}/sites`),
  site:     (id: string) => fetchWithAuth<SiteLock>(`${LOCK_BASE}/site/${id}`),
}

export const authApi = {
  me:       ()          => fetchWithAuth(`${BASE_URL}/api/auth/me`),
}
