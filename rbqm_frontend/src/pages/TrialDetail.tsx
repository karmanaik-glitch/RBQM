import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SiteTable } from '../components/SiteTable';
import { SiteDetailPanel } from '../components/SiteDetail';
import { AlertsPanel } from '../components/AlertsPanel';
import { DataUploadPanel } from '../components/DataUploadPanel';
import { ComplianceChecklist } from '../components/ComplianceChecklist';
import { QueryManagementView } from '../components/QueryManagementView';
import { AuditLogPanel } from '../components/AuditLogPanel';
import { LayoutGrid, Calendar, Building2, ChevronRight, Activity, Bell, FileCheck, Upload, Search, History } from 'lucide-react';

type TrialTab = 'overview' | 'sites' | 'uploads' | 'kri' | 'alerts' | 'queries' | 'compliance' | 'auditlog';

export default function TrialDetail() {
  const { id } = useParams<{ id: string }>();
  const [trial, setTrial] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [tab, setTab] = useState<TrialTab>('overview');
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
        const token = localStorage.getItem('rbqm_token');
        const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        const trialRes = await fetch(`${BASE_URL}/api/trials/${id}`, { headers });
        const sitesRes = await fetch(`${BASE_URL}/api/trials/${id}/sites`, { headers });
        const alertsRes = await fetch(`${BASE_URL}/api/actions/alerts/${id}`, { headers });

        if (trialRes.ok) setTrial(await trialRes.json());
        if (sitesRes.ok) setSites(await sitesRes.json());
        if (alertsRes.ok) setAlerts(await alertsRes.json());
      } catch (err) {
        console.error('Error fetching trial data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="animate-spin mr-2">
          <Activity size={20} />
        </div>
        Loading Trial Details...
      </div>
    );
  }

  if (!trial) return <div className="p-8 text-red-400">Trial not found.</div>;

  const tabs: { id: TrialTab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'sites', label: 'Sites', icon: Building2 },
    { id: 'uploads', label: 'Data Upload', icon: Upload },
    { id: 'kri', label: 'KRI Results', icon: Activity },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'queries', label: 'Queries', icon: Search },
    { id: 'compliance', label: 'Compliance', icon: FileCheck },
    { id: 'auditlog', label: 'Audit Log', icon: History },
  ];

  const handleSiteSelect = (siteId: string) => {
    setSelectedSite(siteId);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-foreground-subtle uppercase tracking-widest bg-white/[0.03] w-fit px-3 py-1 rounded border border-white/5">
              <span>Trial ID: {trial.trial_id}</span>
              <ChevronRight size={12} />
              <span className="text-accent">{trial.sponsor_name}</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{trial.title}</h1>
            <div className="flex items-center gap-4 mt-3">
              <span className="bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-inner-highlight">
                {trial.phase}
              </span>
              <span className="bg-white/[0.03] text-foreground-subtle border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-inner-highlight">
                {trial.status}
              </span>
            </div>
          </div>
          <div className="text-right space-y-2 bg-background-elevated/50 p-4 rounded-xl border border-white/5">
            <p className="text-[10px] text-foreground-subtle uppercase tracking-widest font-bold">Target Lock Date</p>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar size={16} className="text-accent" />
              <span className="font-semibold">{new Date(trial.target_lock_date).toLocaleDateString()}</span>
            </div>
            <p className="text-[10px] text-accent font-bold uppercase tracking-widest">
              {Math.ceil((new Date(trial.target_lock_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-default pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-widest transition-all rounded-t-xl ${
              tab === t.id
                ? 'bg-white/[0.03] text-foreground border border-b-0 border-white/10 shadow-inner-highlight'
                : 'text-foreground-subtle hover:text-foreground hover:bg-white/[0.02]'
            }`}
          >
            <t.icon size={14} className={tab === t.id ? 'text-accent' : ''} />
            {t.label}
            {t.id === 'alerts' && alerts.length > 0 && (
              <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-bold shadow-inner-highlight">
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Sites" value={sites.length.toString()} icon={Building2} color="text-accent" />
            <StatCard title="Open Alerts" value={alerts.length.toString()} icon={Bell} color="text-red-400" />
            <StatCard title="Last KRI Run" value="Today" icon={Activity} color="text-emerald-400" />
            <StatCard title="Lock Score" value="82/100" icon={FileCheck} color="text-yellow-400" />
          </div>
        )}

        {tab === 'sites' && (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-default text-foreground-subtle text-[10px] uppercase tracking-widest font-bold bg-white/[0.02]">
                  <th className="px-6 py-4">Site ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Country</th>
                  <th className="px-6 py-4">Target Enrollment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {sites.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-mono text-[11px] text-accent tracking-widest">{s.site_id}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{s.site_name}</td>
                    <td className="px-6 py-4 text-sm text-foreground-muted">{s.country}</td>
                    <td className="px-6 py-4 text-sm text-foreground font-mono">{s.target_enrollment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'uploads' && <DataUploadPanel trialId={Number(id)} />}

        {tab === 'kri' && (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
            <SiteTable 
              sites={sites.map(s => ({ 
                site_id: s.site_id, 
                site_name: s.site_name, 
                risk_level: 'LOW',
                red_count: 0,
                yellow_count: 0,
                green_count: 0
              }))} 
              selectedId={selectedSite} 
              onSelect={setSelectedSite} 
            />
            {selectedSite ? (
              <SiteDetailPanel siteId={selectedSite} />
            ) : (
              <div className="bg-slate-800/40 border border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-sm h-64">
                Select a site to view KRI details
              </div>
            )}
          </div>
        )}

        {tab === 'alerts' && <AlertsPanel alerts={alerts} onSiteClick={handleSiteSelect} />}

        {tab === 'queries' && <QueryManagementView />}

        {tab === 'compliance' && <ComplianceChecklist trialId={Number(id)} />}

        {tab === 'auditlog' && <AuditLogPanel trialId={Number(id)} />}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: typeof import('lucide-react').Activity; color: string }) {
  return (
    <div className="glass-card p-6 flex items-center gap-5 group">
      <div className={`p-4 rounded-xl bg-background-elevated border border-white/5 shadow-inner-highlight transition-all group-hover:scale-110 ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] text-foreground-subtle uppercase tracking-widest font-bold mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      </div>
    </div>
  );
}
