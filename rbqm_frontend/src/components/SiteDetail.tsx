import { useEffect, useState } from 'react'
import { ChevronDown, ChevronsUpDown } from 'lucide-react'
import { api } from '../api/client'
import type { SiteDetail, KRI } from '../types'
import { StatusBadge, RiskBadge } from './Badges'
import { SiteDetailSkeleton } from './Skeleton'

interface Props { siteId: string }

const DOMAIN_ORDER = [
  'Data Quality',
  'Safety',
  'Protocol Adherence',
  'Site Performance',
  'Investigational Product',
  'Statistical Monitoring',
]

function KRIRow({ kri }: { kri: KRI }) {
  const [open, setOpen] = useState(false)
  const hasDetail = kri.status === 'RED' || kri.status === 'YELLOW'

  return (
    <>
      <tr
        className={`
          border-b border-white/5 transition-all duration-200 group
          ${hasDetail ? 'cursor-pointer hover:bg-white/[0.02]' : ''}
        `}
        onClick={() => hasDetail && setOpen(o => !o)}
      >
        <td className="px-4 py-4">
          <span className="font-mono text-[11px] font-bold text-foreground-subtle tracking-widest group-hover:text-accent transition-colors">{kri.kri_id}</span>
        </td>
        <td className="px-4 py-4 text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{kri.kri_name}</td>
        <td className="px-4 py-4 text-sm font-mono text-foreground-muted">
          {kri.value !== null ? `${kri.value} ${kri.unit}` : '—'}
        </td>
        <td className="px-4 py-4">
          <StatusBadge status={kri.status} />
        </td>
        <td className="px-4 py-4 text-xs text-foreground-subtle text-right">
          {hasDetail && (
            <span className="transition-transform inline-block group-hover:text-accent">{open ? '▲' : '▼'}</span>
          )}
        </td>
      </tr>
      {open && kri.interpretation && (
        <tr className="bg-white/[0.01] border-b border-white/5 shadow-inner-highlight">
          <td colSpan={5} className="px-6 py-4">
            <p className={`text-xs font-medium leading-relaxed ${
              kri.status === 'RED' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              ↳ {kri.interpretation}
            </p>
            <p className="text-[10px] text-foreground-muted mt-2 uppercase tracking-widest font-mono font-bold">
              Thresholds — Yellow: {kri.threshold_yellow} · Red: {kri.threshold_red} {kri.unit}
            </p>
          </td>
        </tr>
      )}
    </>
  )
}

function DomainSection({ domain, kris, forceOpen }: { domain: string; kris: KRI[]; forceOpen?: boolean | null }) {
  const red    = kris.filter(k => k.status === 'RED').length
  const yellow = kris.filter(k => k.status === 'YELLOW').length
  const hasRisk = red > 0 || yellow > 0
  const [isOpen, setIsOpen] = useState(hasRisk)

  useEffect(() => {
    if (forceOpen !== null && forceOpen !== undefined) setIsOpen(forceOpen)
  }, [forceOpen])

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 bg-white/[0.02] border-y border-white/5 shadow-inner-highlight backdrop-blur-sm hover:bg-white/[0.04] transition-colors cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest group-hover:text-foreground transition-colors">
            {domain}
          </span>
          {red > 0 && (
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">✖ {red} RED</span>
          )}
          {yellow > 0 && (
            <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">▲ {yellow} YELLOW</span>
          )}
          {!hasRisk && (
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">● ALL GREEN</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-foreground-muted font-mono tracking-widest">{kris.length} KRI{kris.length !== 1 ? 's' : ''}</span>
          <ChevronDown
            size={14}
            className={`text-foreground-subtle group-hover:text-accent transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </div>
      </button>
      {isOpen && (
        <table className="w-full text-left">
          <tbody>
            {kris.map(k => <KRIRow key={k.kri_id} kri={k} />)}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function SiteDetailPanel({ siteId }: Props) {
  const [data, setData]     = useState<SiteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [forceOpen, setForceOpen] = useState<boolean | null>(null)
  const allExpanded = forceOpen === true

  useEffect(() => {
    setLoading(true)
    api.site(siteId)
      .then(setData)
      .finally(() => setLoading(false))
  }, [siteId])

  if (loading) return <SiteDetailSkeleton />
  if (!data) return null

  const grouped = DOMAIN_ORDER.reduce<Record<string, KRI[]>>((acc, d) => {
    acc[d] = data.kris.filter(k => k.domain === d)
    return acc
  }, {})

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between bg-white/[0.01]">
        <div>
          <p className="font-mono text-[11px] font-bold tracking-widest text-accent mb-1">{data.site_id}</p>
          <h2 className="text-xl font-bold text-foreground tracking-tight">{data.site_name}</h2>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <RiskBadge level={data.risk_level} />
          <span className="text-xs font-bold text-red-400">✖ {data.red_count}</span>
          <span className="text-xs font-bold text-yellow-400">▲ {data.yellow_count}</span>
          <span className="text-xs font-bold text-emerald-400">● {data.green_count}</span>
        </div>
      </div>

      {/* Column headers + Expand/Collapse toggle */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="grid grid-cols-[80px_1fr_160px_120px_40px] flex-1 text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">
          <span>ID</span>
          <span>Key Risk Indicator</span>
          <span>Value</span>
          <span>Status</span>
          <span></span>
        </div>
        <button
          onClick={() => setForceOpen(prev => prev === true ? false : true)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-foreground-muted hover:text-accent uppercase tracking-widest transition-colors flex-shrink-0 ml-4"
        >
          <ChevronsUpDown size={12} />
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* KRI sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {DOMAIN_ORDER.map(domain =>
          grouped[domain]?.length > 0 && (
            <DomainSection key={domain} domain={domain} kris={grouped[domain]} forceOpen={forceOpen} />
          )
        )}
      </div>
    </div>
  )
}
