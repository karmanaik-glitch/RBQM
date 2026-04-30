import { useState, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }: Props) {
  const btnColor = variant === 'danger'
    ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
    : variant === 'warning'
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
    : 'bg-accent/20 text-accent border-accent/30 hover:bg-accent/30'

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div
        className="relative glass-card p-6 w-full max-w-md animate-fade-up space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-xl ${variant === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
            <p className="text-sm text-foreground-muted mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="text-foreground-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors rounded-xl hover:bg-white/[0.05]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
