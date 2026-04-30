import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const CONFIG = {
  success: { icon: CheckCircle2, border: 'border-l-emerald-400', iconColor: 'text-emerald-400', bar: 'bg-emerald-400' },
  error:   { icon: XCircle,      border: 'border-l-red-400',     iconColor: 'text-red-400',     bar: 'bg-red-400'     },
  warning: { icon: AlertTriangle, border: 'border-l-amber-400',  iconColor: 'text-amber-400',   bar: 'bg-amber-400'   },
  info:    { icon: Info,          border: 'border-l-blue-400',    iconColor: 'text-blue-400',    bar: 'bg-blue-400'    },
}

function ToastItem({ id, type, title, message }: { id: string; type: keyof typeof CONFIG; title: string; message?: string }) {
  const { removeToast } = useToast()
  const [progress, setProgress] = useState(100)
  const cfg = CONFIG[type]
  const Icon = cfg.icon

  useEffect(() => {
    const start = Date.now()
    const duration = 4000
    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(pct)
      if (pct > 0) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [])

  return (
    <div className={`glass-card border-l-4 ${cfg.border} px-4 py-3 min-w-[320px] max-w-[420px] animate-slide-in-right relative overflow-hidden`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`${cfg.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground tracking-tight">{title}</p>
          {message && <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">{message}</p>}
        </div>
        <button onClick={() => removeToast(id)} className="text-foreground-muted hover:text-foreground transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
        <div className={`h-full ${cfg.bar} transition-none`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  )
}
