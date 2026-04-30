import type { Alert } from '../types'

interface Props {
  alerts: Alert[]
  onSiteClick: (id: string) => void
}

const DOMAIN_COLORS: Record<string, string> = {
  'Data Quality':           'text-blue-400 bg-blue-900/30 border-blue-800',
  'Safety':                 'text-red-400 bg-red-900/30 border-red-800',
  'Protocol Adherence':     'text-orange-400 bg-orange-900/30 border-orange-800',
  'Site Performance':       'text-purple-400 bg-purple-900/30 border-purple-800',
  'Investigational Product':'text-pink-400 bg-pink-900/30 border-pink-800',
  'Statistical Monitoring': 'text-cyan-400 bg-cyan-900/30 border-cyan-800',
}

export function AlertsPanel({ alerts, onSiteClick }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-6 text-center">
        <p className="text-emerald-400 text-sm font-medium">● No RED KRIs across all sites</p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden animate-fade-up">
      <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-white/[0.02]">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
          Action Required
        </h2>
        <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold px-3 py-1 rounded shadow-inner-highlight uppercase tracking-widest">
          {alerts.length} RED
        </span>
      </div>

      <div className="divide-y divide-border-default max-h-[600px] overflow-y-auto custom-scrollbar">
        {alerts.map((a, i) => {
          const domainStyle = DOMAIN_COLORS[a.domain] ?? 'text-foreground-subtle bg-white/[0.03] border-white/10'
          return (
            <div key={i} className="px-6 py-5 hover:bg-white/[0.02] transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <button
                      onClick={() => onSiteClick(a.site_id)}
                      className="font-mono text-[10px] text-foreground-subtle hover:text-accent transition-colors tracking-widest"
                    >
                      {a.site_id}
                    </button>
                    <span className="text-foreground-muted/30">/</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${domainStyle}`}>
                      {a.domain}
                    </span>
                    <span className="text-[10px] text-foreground-subtle font-mono uppercase tracking-widest">KRI {a.kri_id}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{a.kri_name}</p>
                  {a.interpretation && (
                    <p className="text-xs text-red-400/90 mt-2 leading-relaxed bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                      ↳ {a.interpretation}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-red-400 font-mono tracking-tight group-hover:scale-110 transition-transform">
                    {a.value !== null ? a.value : '—'}
                  </p>
                  <p className="text-[10px] text-foreground-subtle uppercase tracking-widest mt-1">{a.unit}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
