import { useEffect, useState } from 'react'
import { lockApi } from '../api/client'
import type { TrialLock, SiteLock, LockBlocker, LockStatus } from '../types/lock'

// ── Helpers ──────────────────────────────────────────────────────────────────

const lockColors: Record<LockStatus, { bg: string; border: string; text: string; badge: string }> = {
  READY:   { bg: 'bg-emerald-500/5 shadow-inner-highlight', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  AT_RISK: { bg: 'bg-yellow-500/5 shadow-inner-highlight',  border: 'border-yellow-500/20',  text: 'text-yellow-400',  badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'  },
  BLOCKED: { bg: 'bg-red-500/5 shadow-inner-highlight',     border: 'border-red-500/20',     text: 'text-red-400',     badge: 'bg-red-400/10 text-red-400 border-red-400/20'           },
}

const lockIcon: Record<LockStatus, string> = {
  READY: '✓', AT_RISK: '▲', BLOCKED: '✖',
}

function LockBadge({ status }: { status: LockStatus }) {
  const c = lockColors[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${c.badge}`}>
      {lockIcon[status]} {status}
    </span>
  )
}

function ScoreRing({ score, status }: { score: number; status: LockStatus }) {
  const c = lockColors[status]
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90 drop-shadow-lg" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={status === 'READY' ? '#34d399' : status === 'AT_RISK' ? '#facc15' : '#f87171'}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all duration-1000"
        />
      </svg>
      <div className="text-center z-10">
        <p className={`text-2xl font-black ${c.text}`}>{score}</p>
        <p className="text-[10px] text-foreground-subtle uppercase tracking-widest">/100</p>
      </div>
    </div>
  )
}

// ── Trial Header ──────────────────────────────────────────────────────────────

function TrialHeader({ trial }: { trial: TrialLock }) {
  const c = lockColors[trial.trial_lock_status]
  return (
    <div className={`glass-card p-8 border backdrop-blur-md ${c.bg} ${c.border}`}>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-8">
          <ScoreRing score={trial.trial_lock_score} status={trial.trial_lock_status} />
          <div>
            <p className="text-[11px] font-bold tracking-widest text-accent mb-1 uppercase">{trial.trial_id}</p>
            <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Database Lock Readiness</h2>
            <LockBadge status={trial.trial_lock_status} />
            <p className={`text-sm mt-3 font-medium ${c.text}`}>{trial.summary}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 justify-center h-24 px-8 border-l border-white/5">
          <p className="text-[10px] text-foreground-subtle font-bold uppercase tracking-widest">Est. days to lock</p>
          <p className={`text-5xl font-black ${c.text} drop-shadow-md`}>{trial.predicted_lock_days}</p>
          <p className="text-[10px] text-foreground-muted font-mono uppercase tracking-widest">if action taken today</p>
        </div>
      </div>
    </div>
  )
}

// ── Critical Path ─────────────────────────────────────────────────────────────

function CriticalPath({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <h3 className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">
          Critical Path — Action Sequence
        </h3>
        <span className="text-[10px] text-accent font-bold uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">{items.length} items</span>
      </div>
      <ol className="divide-y divide-white/5 bg-black/20">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-background-elevated border border-white/10 text-foreground-muted text-[10px] flex items-center justify-center font-black group-hover:text-accent group-hover:border-accent/30 transition-all shadow-inner-highlight">
              {i + 1}
            </span>
            <p className="text-sm text-foreground font-medium leading-relaxed mt-0.5">{item}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Site Lock Cards ───────────────────────────────────────────────────────────

function BlockerRow({ b, type }: { b: LockBlocker; type: 'hard' | 'soft' }) {
  return (
    <div className={`px-5 py-4 border-l-2 bg-black/10 ${type === 'hard' ? 'border-red-500' : 'border-yellow-500'}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-subtle">KRI {b.kri_id}</span>
        <span className="text-[10px] font-mono text-foreground-muted bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/5">-{b.score_impact} pts · ~{b.est_days}d</span>
      </div>
      <p className="text-sm font-bold text-foreground tracking-tight">{b.kri_name}</p>
      <p className={`text-[11px] mt-1.5 leading-relaxed font-medium ${type === 'hard' ? 'text-red-400' : 'text-yellow-400'}`}>
        {b.interpretation}
      </p>
    </div>
  )
}

function SiteLockCard({ site, onSelect }: { site: SiteLock; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const c = lockColors[site.lock_status]

  return (
    <div className={`glass-card glass-card-hover overflow-hidden border ${c.bg} ${c.border}`}>
      <div
        className="flex items-center gap-5 px-6 py-5 cursor-pointer group"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="group-hover:scale-105 transition-transform">
          <ScoreRing score={site.lock_score} status={site.lock_status} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-widest uppercase text-accent mb-0.5">{site.site_id}</p>
          <p className="text-base font-bold text-foreground truncate tracking-tight">{site.site_name}</p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <LockBadge status={site.lock_status} />
            {site.hard_blockers.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">
                ✖ {site.hard_blockers.length} hard
              </span>
            )}
            {site.soft_blockers.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                ▲ {site.soft_blockers.length} soft
              </span>
            )}
          </div>
          <p className="text-xs text-foreground-muted mt-3 font-medium">{site.summary}</p>
        </div>
        <div className="text-right flex-shrink-0 pl-4 border-l border-white/5 flex flex-col justify-center h-full">
          <p className="text-[10px] text-foreground-subtle font-bold uppercase tracking-widest">est. lock</p>
          <p className={`text-3xl font-black ${c.text}`}>{site.est_days_to_lock}d</p>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            className="mt-2 text-[10px] font-bold text-accent hover:text-accent-bright uppercase tracking-widest flex items-center gap-1 justify-end"
          >
            Details <span className="text-[12px]">→</span>
          </button>
        </div>
      </div>

      {expanded && site.total_blockers > 0 && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {site.hard_blockers.map((b: LockBlocker, i: number) => (
            <BlockerRow key={`h${i}`} b={b} type="hard" />
          ))}
          {site.soft_blockers.map((b: LockBlocker, i: number) => (
            <BlockerRow key={`s${i}`} b={b} type="soft" />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  onSiteSelect: (id: string) => void
}

export function LockReadiness({ onSiteSelect }: Props) {
  const [data, setData]       = useState<TrialLock | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    lockApi.trial().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
      Computing lock readiness…
    </div>
  )
  if (!data) return null

  const sorted = [...data.sites].sort((a, b) => a.lock_score - b.lock_score)

  return (
    <div className="space-y-5">
      <TrialHeader trial={data} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sorted.map(site => (
          <SiteLockCard
            key={site.site_id}
            site={site}
            onSelect={() => onSiteSelect(site.site_id)}
          />
        ))}
      </div>

      <CriticalPath items={data.critical_path} />
    </div>
  )
}
