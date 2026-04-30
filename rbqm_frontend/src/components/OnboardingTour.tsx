import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

interface TourStep {
  target: string      // CSS selector
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="site-table"]',
    title: 'Site Feed',
    description: 'Browse all active clinical trial sites. Click any row to view its full KRI profile. Use the search bar to quickly find specific sites.',
  },
  {
    target: '[data-tour="health-gauge"]',
    title: 'Trial Health Score',
    description: 'A real-time aggregate score (0-100) reflecting the overall health of your trial. RED and YELLOW KRIs pull this score down.',
  },
  {
    target: '[data-tour="portfolio-stats"]',
    title: 'Portfolio Overview',
    description: 'Key metrics at a glance — critical sites, action items, total sites, and lock readiness. Numbers animate on load.',
  },
  {
    target: '[data-tour="kri-detail"]',
    title: 'KRI Detail Panel',
    description: 'Detailed breakdown of all Key Risk Indicators for the selected site. Domain sections are collapsible — RED and YELLOW domains auto-expand.',
  },
  {
    target: '[data-tour="tabs"]',
    title: 'Dashboard Tabs',
    description: 'Switch between Overview, Lock Readiness, Alerts, Risk Heatmap, and AI Insights. The tab bar sticks to the top when you scroll.',
  },
  {
    target: '[data-tour="audit-stream"]',
    title: 'Audit Stream',
    description: 'The latest 5 audit log entries for your trial. All user actions are tracked for ICH E6 R3 compliance.',
  },
]

const STORAGE_KEY = 'vritas_onboarding_complete'

export function OnboardingTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Listen for manual trigger from sidebar
  useEffect(() => {
    const handler = () => {
      // Only start if dashboard elements actually exist
      const firstTarget = document.querySelector(TOUR_STEPS[0].target)
      if (firstTarget) {
        setStep(0)
        setActive(true)
      }
    }
    window.addEventListener('start-onboarding', handler)
    return () => window.removeEventListener('start-onboarding', handler)
  }, [])

  // Position the tooltip near the target element
  useEffect(() => {
    if (!active) return
    const el = document.querySelector(TOUR_STEPS[step].target)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setRect(el.getBoundingClientRect()), 400)
    } else {
      setRect(null)
    }
  }, [active, step])

  const finish = useCallback(() => {
    setActive(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const next = () => {
    if (step < TOUR_STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

  if (!active) return null

  const current = TOUR_STEPS[step]

  return (
    <div className="fixed inset-0 z-[10000]">
      {/* Dark overlay with cutout */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={finish} />
      
      {/* Spotlight cutout */}
      {rect && (
        <div
          className="absolute border-2 border-accent rounded-2xl transition-all duration-500 ease-out pointer-events-none"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7), 0 0 30px rgba(16,185,129,0.3)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute glass-card p-5 w-[360px] animate-fade-up"
        style={{
          top: rect ? Math.min(rect.bottom + 20, window.innerHeight - 220) : '50%',
          left: rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 380) : '50%',
          transform: rect ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest">
              Step {step + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button onClick={finish} className="text-foreground-muted hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        <h3 className="text-base font-bold text-foreground tracking-tight mb-1.5">{current.title}</h3>
        <p className="text-sm text-foreground-muted leading-relaxed mb-4">{current.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-accent w-6' : i < step ? 'bg-accent/40' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={prev} className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.05]">
                <ChevronLeft size={12} /> Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-lg hover:bg-accent/20 transition-all"
            >
              {step === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Trigger to start the tour from sidebar */
export function resetOnboarding() {
  window.dispatchEvent(new Event('start-onboarding'))
}
