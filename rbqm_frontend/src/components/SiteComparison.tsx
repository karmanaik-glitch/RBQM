import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { SiteDetail, KRI } from '../types'
import { StatusBadge, RiskBadge } from './Badges'
import { GitCompareArrows, X } from 'lucide-react'
import { SiteDetailSkeleton } from './Skeleton'

interface Props {
  siteA: string
  siteB: string
  onClose: () => void
}

const DOMAIN_ORDER = [
  'Data Quality', 'Safety', 'Protocol Adherence',
  'Site Performance', 'Investigational Product', 'Statistical Monitoring',
]

export function SiteComparison({ siteA, siteB, onClose }: Props) {
  const [dataA, setDataA] = useState<SiteDetail | null>(null)
  const [dataB, setDataB] = useState<SiteDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.site(siteA), api.site(siteB)])
      .then(([a, b]) => { setDataA(a); setDataB(b) })
      .finally(() => setLoading(false))
  }, [siteA, siteB])

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative glass-card p-8 w-full max-w-5xl animate-fade-up">
          <div className="grid grid-cols-2 gap-8">
            <SiteDetailSkeleton />
            <SiteDetailSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (!dataA || !dataB) return null

  // Build KRI lookup for side B
  const kriMapB = new Map<string, KRI>()
  dataB.kris.forEach(k => kriMapB.set(k.kri_id, k))

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <GitCompareArrows size={18} className="text-accent" />
            <h2 className="text-base font-bold text-foreground tracking-tight">Site Comparison</h2>
          </div>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]">
            <X size={16} />
          </button>
        </div>

        {/* Site Headers */}
        <div className="grid grid-cols-2 border-b border-white/5 flex-shrink-0">
          {[dataA, dataB].map((d, i) => (
            <div key={i} className={`px-6 py-4 ${i === 0 ? 'border-r border-white/5' : ''}`}>
              <p className="font-mono text-[11px] font-bold tracking-widest text-accent">{d.site_id}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{d.site_name}</p>
              <div className="flex items-center gap-3 mt-2">
                <RiskBadge level={d.risk_level} />
                <span className="text-xs font-bold text-red-400">✖ {d.red_count}</span>
                <span className="text-xs font-bold text-yellow-400">▲ {d.yellow_count}</span>
                <span className="text-xs font-bold text-emerald-400">● {d.green_count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* KRI Comparison Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {DOMAIN_ORDER.map(domain => {
            const krisA = dataA.kris.filter(k => k.domain === domain)
            if (krisA.length === 0) return null

            return (
              <div key={domain}>
                <div className="px-6 py-2.5 bg-white/[0.02] border-y border-white/5">
                  <span className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">{domain}</span>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">
                      <th className="px-6 py-2 w-[30%]">KRI</th>
                      <th className="px-4 py-2 w-[15%] text-center">{dataA.site_id}</th>
                      <th className="px-4 py-2 w-[15%] text-center">Status</th>
                      <th className="px-4 py-2 w-[15%] text-center">{dataB.site_id}</th>
                      <th className="px-4 py-2 w-[15%] text-center">Status</th>
                      <th className="px-4 py-2 w-[10%] text-center">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {krisA.map(ka => {
                      const kb = kriMapB.get(ka.kri_id)
                      const valA = ka.value ?? 0
                      const valB = kb?.value ?? 0
                      const delta = valA - valB
                      const deltaColor = Math.abs(delta) < 0.01 ? 'text-foreground-muted' : delta > 0 ? 'text-red-400' : 'text-emerald-400'

                      return (
                        <tr key={ka.kri_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3">
                            <span className="text-sm font-medium text-foreground">{ka.kri_name}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-mono text-foreground-muted">{ka.value ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={ka.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-mono text-foreground-muted">{kb?.value ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {kb && <StatusBadge status={kb.status} />}
                          </td>
                          <td className={`px-4 py-3 text-center text-xs font-bold font-mono ${deltaColor}`}>
                            {Math.abs(delta) < 0.01 ? '=' : delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
