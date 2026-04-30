import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewTrialModal } from '../components/NewTrialModal';
import { FlaskConical, Plus, Calendar } from 'lucide-react';

interface Trial {
  id: number;
  trial_id: string;
  title: string;
  phase: string;
  status: string;
  site_count: number;
  sponsor_name: string;
  target_lock_date: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-900/50 text-emerald-400 border-emerald-800',
  ON_HOLD: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
  LOCKED: 'bg-blue-900/50 text-blue-400 border-blue-800',
  COMPLETED: 'bg-slate-700 text-slate-300 border-slate-600',
};

export default function TrialList() {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchTrials = async () => {
    const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
    const token = localStorage.getItem('rbqm_token');
    const res = await fetch(`${BASE_URL}/api/trials`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (res.ok) setTrials(await res.json());
  };

  useEffect(() => {
    fetchTrials();
  }, []);

  return (
    <div className="p-8 lg:p-12 space-y-12 animate-fade-up">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-semibold tracking-tight text-gradient">
            Clinical <span className="text-accent-gradient">Trials</span>
          </h1>
          <p className="text-foreground-muted max-w-2xl text-lg leading-relaxed">
            Manage and monitor your clinical trial portfolio
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent-bright text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all shadow-accent-glow"
        >
          <Plus size={16} />
          New Trial
        </button>
      </div>

      <div className="glass-card overflow-hidden animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-default text-foreground-subtle text-[10px] uppercase tracking-widest bg-white/[0.02]">
              <th className="px-6 py-4 font-bold">Trial ID</th>
              <th className="px-6 py-4 font-bold">Title</th>
              <th className="px-6 py-4 font-bold">Phase</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold">Sponsor</th>
              <th className="px-6 py-4 font-bold">Lock Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {trials.map(t => (
              <tr
                key={t.id}
                onClick={() => navigate(`/trials/${t.id}`)}
                className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
              >
                <td className="px-6 py-5 font-mono font-bold tracking-widest text-accent text-[11px] group-hover:scale-105 transition-transform origin-left">{t.trial_id}</td>
                <td className="px-6 py-5 text-foreground text-sm font-semibold group-hover:text-accent transition-colors">{t.title}</td>
                <td className="px-6 py-5">
                  <span className="text-[10px] font-bold text-foreground-subtle bg-white/[0.03] px-3 py-1 rounded-full border border-white/5 uppercase tracking-widest shadow-inner-highlight">
                    {t.phase}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-inner-highlight ${STATUS_STYLES[t.status] || STATUS_STYLES.ACTIVE}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-foreground-muted text-sm">{t.sponsor_name || '—'}</td>
                <td className="px-6 py-5">
                  {t.target_lock_date ? (
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-foreground-subtle">
                      <Calendar size={12} className="text-accent" />
                      {new Date(t.target_lock_date).toLocaleDateString()}
                    </div>
                  ) : (
                    <span className="text-foreground-muted/30 text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
            {trials.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center border-dashed border-t border-white/10 bg-white/[0.01]">
                  <FlaskConical size={48} className="mx-auto text-foreground-subtle/30 mb-5" />
                  <p className="text-foreground-subtle text-sm font-bold uppercase tracking-widest mb-2">No trials found</p>
                  <p className="text-foreground-muted text-xs leading-relaxed max-w-sm mx-auto">Create your first clinical trial to begin managing site performance and lock readiness.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NewTrialModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchTrials}
      />
    </div>
  );
}
