import type { Status, RiskLevel } from '../types'

const statusStyles: Record<Status, string> = {
  GREEN:             'bg-emerald-900/50 text-emerald-400 border border-emerald-800',
  YELLOW:            'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
  RED:               'bg-red-900/50 text-red-400 border border-red-800',
  INSUFFICIENT_DATA: 'bg-slate-800 text-slate-500 border border-slate-700',
}

const statusIcon: Record<Status, string> = {
  GREEN:             '●',
  YELLOW:            '▲',
  RED:               '✖',
  INSUFFICIENT_DATA: '–',
}

const riskStyles: Record<RiskLevel, string> = {
  LOW:      'bg-emerald-900/50 text-emerald-400 border border-emerald-800',
  MEDIUM:   'bg-cyan-900/50 text-cyan-400 border border-cyan-800',
  HIGH:     'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
  CRITICAL: 'bg-red-900/50 text-red-400 border border-red-800',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${statusStyles[status]}`}>
      <span>{statusIcon[status]}</span>
      <span>{status === 'INSUFFICIENT_DATA' ? 'N/A' : status}</span>
    </span>
  )
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold tracking-wide ${riskStyles[level]}`}>
      {level}
    </span>
  )
}
