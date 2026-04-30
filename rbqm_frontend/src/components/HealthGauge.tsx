import { useEffect, useRef, useState } from 'react'

interface Props {
  score: number  // 0-100
  label: string
}

export function HealthGauge({ score, label }: Props) {
  const [animated, setAnimated] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 1200
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimated(eased * score)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [score])

  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (animated / 100) * circ * 0.75 // 270° arc
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#facc15' : '#f87171'
  const statusLabel = score >= 75 ? 'Healthy' : score >= 50 ? 'At Risk' : 'Critical'
  const statusColor = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="glass-card p-6 flex items-center gap-8 animate-fade-up">
      <div className="relative w-[140px] h-[140px] flex items-center justify-center flex-shrink-0">
        <svg className="absolute inset-0" width="140" height="140" viewBox="0 0 140 140">
          {/* Background arc */}
          <circle
            cx="70" cy="70" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeLinecap="round"
            transform="rotate(135 70 70)"
          />
          {/* Value arc */}
          <circle
            cx="70" cy="70" r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(135 70 70)"
            className="drop-shadow-lg transition-all duration-300"
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>
        <div className="text-center z-10">
          <p className="text-4xl font-black text-foreground tracking-tight">{Math.round(animated)}</p>
          <p className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold mt-0.5">/100</p>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest mb-1">Trial Health Score</p>
        <p className={`text-lg font-bold ${statusColor}`}>{statusLabel}</p>
        <p className="text-xs text-foreground-muted mt-2 leading-relaxed">{label}</p>
      </div>
    </div>
  )
}
