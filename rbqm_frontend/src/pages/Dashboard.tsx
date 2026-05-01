import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import type { Portfolio, SiteSummary, Alert } from '../types'
import { useAuth } from '../context/AuthContext'
import { PortfolioSummary }  from '../components/PortfolioSummary'
import { SiteTable }         from '../components/SiteTable'
import { SiteDetailPanel }   from '../components/SiteDetail'
import { AlertsPanel }       from '../components/AlertsPanel'
import { LockReadiness }     from '../components/LockReadiness'
import { ReportGenerator }   from '../components/ReportGenerator'
import { SiteHeatmap }       from '../components/SiteHeatmap'
import { RecentActivity }   from '../components/RecentActivity'
import { SpotlightCard }     from '../components/SpotlightCard'
import { HealthGauge }       from '../components/HealthGauge'
import { SiteMap }           from '../components/SiteMap'
import { SiteComparison }   from '../components/SiteComparison'
import { Activity, Bell, FileText, LayoutGrid, Shield, RefreshCw, Map, GitCompareArrows } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'overview' | 'lock' | 'alerts' | 'report' | 'heatmap' | 'map'

export default function Dashboard() {
  const [portfolio, setPortfolio]       = useState<Portfolio | null>(null)
  const [sites, setSites]               = useState<SiteSummary[]>([])
  const [alerts, setAlerts]             = useState<Alert[]>([])
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [tab, setTab]                   = useState<Tab>('overview')
  const [loading, setLoading]           = useState(true)
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null)
  const [relativeTime, setRelativeTime] = useState('')
  const [compareMode, setCompareMode]   = useState(false)
  const [compareSiteA, setCompareSiteA] = useState<string | null>(null)
  const [compareSiteB, setCompareSiteB] = useState<string | null>(null)
  const { user } = useAuth()

  // Role-based default tab
  useEffect(() => {
    if (user?.role === 'data_manager') setTab('overview')
    else if (user?.role === 'medical_monitor') setTab('alerts')
    else setTab('overview')
  }, [user?.role])

  useEffect(() => {
    Promise.all([api.summary(), api.sites(), api.alerts()])
      .then(([summary, siteList, alertData]) => {
        setPortfolio(summary)
        setSites(siteList)
        setAlerts(alertData.alerts)
        const first = summary.critical_sites[0] ?? siteList[0]?.site_id ?? null
        setSelectedSite(first)
      })
      .catch(() => console.error('Cannot reach API. Make sure the backend is running on localhost:8000.'))
      .finally(() => { setLoading(false); setLastUpdated(new Date()) })
  }, [])

  // Update relative time every 30s
  useEffect(() => {
    if (!lastUpdated) return
    const update = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
      if (seconds < 60) setRelativeTime('just now')
      else if (seconds < 3600) setRelativeTime(`${Math.floor(seconds / 60)}m ago`)
      else setRelativeTime(`${Math.floor(seconds / 3600)}h ago`)
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // Keyboard navigation for sites
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (tab !== 'overview') return

      const idx = sites.findIndex(s => s.site_id === selectedSite)
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        const next = Math.min(idx + 1, sites.length - 1)
        setSelectedSite(sites[next]?.site_id ?? null)
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        const prev = Math.max(idx - 1, 0)
        setSelectedSite(sites[prev]?.site_id ?? null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sites, selectedSite, tab])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getHealthScore = () => {
    if (!portfolio) return 0
    const redPenalty = (portfolio.alerts_count || 0) * 8
    const criticalPenalty = (portfolio.critical_sites?.length || 0) * 15
    return Math.max(0, Math.min(100, 100 - redPenalty - criticalPenalty))
  }

  const handleSiteSelect = (id: string) => {
    setSelectedSite(id)
    setTab('overview')
  }

  const openCompare = useCallback(() => {
    if (sites.length >= 2) {
      setCompareSiteA(sites[0]?.site_id)
      setCompareSiteB(sites[1]?.site_id)
      setCompareMode(true)
    }
  }, [sites])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background-base">
      <div className="text-center animate-fade-up">
        <div className="w-12 h-12 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-6" />
        <p className="text-foreground-muted text-sm font-medium tracking-widest uppercase">Initializing KRI Engine...</p>
      </div>
    </div>
  )

  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'lock',     label: 'Lock Readiness', icon: Shield },
    { id: 'alerts',   label: 'Alerts', icon: Bell, badge: alerts.length },
    { id: 'heatmap',  label: 'Risk Heatmap', icon: Activity },
    { id: 'map',      label: 'Site Map', icon: Map },
    { id: 'report',   label: 'AI Insights', icon: FileText },
  ]

  return (
    <div className="p-8 lg:p-12 space-y-10 animate-fade-up">
      {/* Hero Header — Personalized Greeting */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-gradient">
            {getGreeting()}, <span className="text-accent-gradient">{user?.email?.split('@')[0] || 'User'}</span>
          </h1>
          <p className="text-foreground-muted max-w-2xl text-base leading-relaxed">
            {portfolio && portfolio.critical_sites.length > 0
              ? `${portfolio.critical_sites.length} site${portfolio.critical_sites.length > 1 ? 's' : ''} need${portfolio.critical_sites.length === 1 ? 's' : ''} your attention.`
              : 'All sites are within acceptable thresholds.'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Compare Button */}
          {sites.length >= 2 && (
            <button
              onClick={openCompare}
              className="flex items-center gap-2 text-[10px] text-foreground-muted font-mono uppercase tracking-widest bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] hover:text-accent transition-all"
            >
              <GitCompareArrows size={10} />
              Compare Sites
            </button>
          )}
          {lastUpdated && (
            <div className="flex items-center gap-2 text-[10px] text-foreground-muted font-mono uppercase tracking-widest bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded-lg">
              <RefreshCw size={10} className="text-accent" />
              Refreshed {relativeTime}
            </div>
          )}
        </div>
      </div>

      {/* Health Gauge + Portfolio Stats */}
      {portfolio && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-tour="health-gauge">
          <HealthGauge
            score={getHealthScore()}
            label={`Monitoring ${portfolio.total_sites} sites across all active trials. ${portfolio.alerts_count} KRIs require action.`}
          />
          <div className="lg:col-span-2" data-tour="portfolio-stats">
            <PortfolioSummary data={portfolio} />
          </div>
        </div>
      )}

      {/* Tabs Navigation — Sticky */}
      <div className="sticky top-0 z-20 py-3 -mx-8 lg:-mx-12 px-8 lg:px-12 bg-background-base/80 backdrop-blur-md" data-tour="tabs">
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-border-default rounded-2xl w-fit backdrop-blur-md">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              tab === t.id
                ? 'text-foreground'
                : 'text-foreground-muted hover:text-foreground hover:bg-white/[0.03]'
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="dashboard-tab-pill"
                className="absolute inset-0 bg-white/[0.08] border border-white/[0.05] shadow-inner-highlight rounded-xl"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              <t.icon size={16} className={`transition-colors ${tab === t.id ? 'text-accent' : 'text-foreground-subtle group-hover:text-foreground-muted'}`} />
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-accent/20 text-accent text-[10px] font-bold shadow-[0_0_10px_rgba(94,106,210,0.3)]">
                  {t.badge}
                </span>
              )}
            </div>
          </button>
        ))}
        </div>
      </div>

      <div className="space-y-8 relative min-h-[600px]">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Site Selection & Feed - Left Column */}
                <div className="lg:col-span-4 flex flex-col gap-6" data-tour="site-table">
                  <SpotlightCard className="p-0">
                    <SiteTable sites={sites} selectedId={selectedSite} onSelect={setSelectedSite} />
                  </SpotlightCard>
                  <div data-tour="audit-stream">
                    <RecentActivity />
                  </div>
                </div>

                {/* Site Detail - Main Content */}
                <div className="lg:col-span-8" data-tour="kri-detail">
                  {selectedSite ? (
                    <SpotlightCard>
                      <SiteDetailPanel siteId={selectedSite} />
                    </SpotlightCard>
                  ) : (
                    <div className="h-[600px] glass-card flex flex-col items-center justify-center text-foreground-muted space-y-4">
                      <LayoutGrid size={48} className="opacity-20" />
                      <p className="font-medium">Select a site to analyze risk profile</p>
                      <p className="text-xs text-foreground-subtle">Use ↑↓ arrow keys or J/K to navigate</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'lock' && (
            <motion.div key="lock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <LockReadiness onSiteSelect={handleSiteSelect} />
            </motion.div>
          )}
          
          {tab === 'alerts' && (
            <motion.div key="alerts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <AlertsPanel alerts={alerts} onSiteClick={handleSiteSelect} />
            </motion.div>
          )}
          
          {tab === 'heatmap' && (
            <motion.div key="heatmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <SiteHeatmap />
            </motion.div>
          )}
          
          {tab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <SiteMap sites={sites} selectedId={selectedSite} onSelect={handleSiteSelect} />
            </motion.div>
          )}
          
          {tab === 'report' && (
            <motion.div key="report" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <SpotlightCard className="p-8">
                <ReportGenerator />
              </SpotlightCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Site Comparison Modal */}
      {compareMode && compareSiteA && compareSiteB && (
        <SiteComparison
          siteA={compareSiteA}
          siteB={compareSiteB}
          onClose={() => setCompareMode(false)}
        />
      )}
    </div>
  )
}
