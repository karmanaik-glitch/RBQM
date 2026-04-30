import { useState } from 'react'
import { Search, Download } from 'lucide-react'
import type { SiteSummary } from '../types'
import { RiskBadge } from './Badges'
import { useToast } from '../context/ToastContext'

interface Props {
  sites: SiteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function SiteTable({ sites, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const { addToast } = useToast()
  const q = query.toLowerCase()
  const filtered = sites.filter(s =>
    s.site_id.toLowerCase().includes(q) || s.site_name.toLowerCase().includes(q)
  )

  const exportCSV = () => {
    const header = 'Site ID,Site Name,Risk Level,Red,Yellow,Green'
    const rows = sites.map(s => `${s.site_id},"${s.site_name}",${s.risk_level},${s.red_count},${s.yellow_count},${s.green_count}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'vritas_sites.csv'; a.click()
    URL.revokeObjectURL(url)
    addToast('success', 'CSV Exported', `${sites.length} sites exported successfully.`)
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3 flex-none">
        <h2 className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest flex-shrink-0">
          Active Sites
        </h2>
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search sites..."
            className="w-full bg-white/[0.03] border border-white/5 rounded-lg pl-7 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-accent/30 focus:bg-white/[0.05] transition-all"
          />
        </div>
        <button onClick={exportCSV} className="text-foreground-muted hover:text-accent transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]" title="Export CSV">
          <Download size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left relative">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/5 bg-background-elevated">
              <th className="px-5 py-3 text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">Site</th>
              <th className="px-4 py-3 text-[10px] font-bold text-foreground-subtle uppercase tracking-widest">Risk</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-red-400 uppercase tracking-widest">Red</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Yellow</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Green</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-xs text-foreground-muted">
                  No sites matching "{query}"
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.site_id}
                  onClick={() => onSelect(s.site_id)}
                  className={`
                    cursor-pointer transition-all duration-200 group
                    ${selectedId === s.site_id
                      ? 'bg-white/[0.05] shadow-inner-highlight'
                      : 'hover:bg-white/[0.02]'}
                  `}
                >
                  <td className="px-5 py-4">
                    <p className="font-mono text-[11px] font-bold tracking-widest text-accent group-hover:scale-105 transition-transform origin-left">{s.site_id}</p>
                    <p className="text-foreground text-sm font-semibold mt-0.5 group-hover:text-accent transition-colors">{s.site_name}</p>
                  </td>
                  <td className="px-4 py-4">
                    <RiskBadge level={s.risk_level} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`font-semibold ${s.red_count > 0 ? 'text-red-400' : 'text-foreground-muted'}`}>
                      {s.red_count}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`font-semibold ${s.yellow_count > 0 ? 'text-yellow-400' : 'text-foreground-muted'}`}>
                      {s.yellow_count}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-emerald-400">{s.green_count}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
