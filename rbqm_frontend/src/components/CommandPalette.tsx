import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutGrid, FlaskConical, Bell, FileText, ArrowRight } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  group: string
  icon: any
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const items: CommandItem[] = [
    { id: 'dashboard', label: 'Go to Dashboard', group: 'Pages', icon: LayoutGrid, action: () => navigate('/dashboard') },
    { id: 'trials',    label: 'Go to Trials',    group: 'Pages', icon: FlaskConical, action: () => navigate('/trials') },
    { id: 'alerts',    label: 'Go to Alerts',    group: 'Pages', icon: Bell,         action: () => navigate('/alerts') },
    { id: 'reports',   label: 'Go to Reports',   group: 'Pages', icon: FileText,     action: () => navigate('/reports') },
  ]

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
  )

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action()
      setOpen(false)
    }
  }

  if (!open) return null

  const groups = [...new Set(filtered.map(i => i.group))]

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh] p-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div
        className="relative glass-card w-full max-w-lg overflow-hidden animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <Search size={16} className="text-foreground-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none"
          />
          <kbd className="text-[9px] text-foreground-muted bg-white/[0.05] border border-white/10 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-8">No results found</p>
          ) : (
            groups.map(group => (
              <div key={group}>
                <p className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest px-5 py-2">{group}</p>
                {filtered.filter(i => i.group === group).map((item, idx) => {
                  const globalIdx = filtered.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      onClick={() => { item.action(); setOpen(false) }}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                        globalIdx === selectedIndex
                          ? 'bg-white/[0.06] text-foreground'
                          : 'text-foreground-muted hover:bg-white/[0.03] hover:text-foreground'
                      }`}
                    >
                      <item.icon size={16} className={globalIdx === selectedIndex ? 'text-accent' : 'text-foreground-subtle'} />
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100" />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-5 py-2.5 flex items-center gap-4 text-[10px] text-foreground-muted font-mono uppercase tracking-widest">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>esc Close</span>
        </div>
      </div>
    </div>
  )
}
