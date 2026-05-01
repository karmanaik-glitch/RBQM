import { useEffect, useState } from 'react';
import { History, User, Activity as ActivityIcon, CheckCircle2, AlertTriangle, Upload, Zap } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { ActivitySkeleton } from './Skeleton';

interface AuditLog {
  id: number;
  action: string;
  user_email: string;
  detail: any;
  created_at: string;
}

export function RecentActivity() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/actions/audit-log`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    if (!type) return <History size={14} className="text-foreground-muted" />;
    switch (type.toUpperCase()) {
      case 'LOGIN': return <User size={14} className="text-blue-400" />;
      case 'REGISTER': return <User size={14} className="text-purple-400" />;
      case 'TRIAL_CREATED': return <Zap size={14} className="text-emerald-400" />;
      case 'UPLOAD': return <Upload size={14} className="text-amber-400" />;
      case 'KRI_RUN': return <ActivityIcon size={14} className="text-red-400" />;
      case 'ALERT_UPDATED': return <AlertTriangle size={14} className="text-orange-400" />;
      case 'ACTION_CREATED': return <CheckCircle2 size={14} className="text-emerald-400" />;
      default: return <History size={14} className="text-foreground-muted" />;
    }
  };

  if (loading) return <ActivitySkeleton />;

  return (
    <SpotlightCard>
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-[10px] font-mono tracking-[0.2em] uppercase text-foreground-subtle flex items-center gap-2">
          <History size={12} className="text-accent" />
          Audit Stream <span className="text-[9px] text-foreground-muted ml-2 tracking-widest">(Latest 5)</span>
        </h3>
        <span className="text-[9px] text-accent font-bold bg-accent/10 px-2 py-0.5 rounded-full">LIVE</span>
      </div>
      <div className="p-2 space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="p-3 hover:bg-white/[0.03] rounded-xl transition-all duration-200 flex items-start gap-3 group">
            <div className="mt-0.5 p-2 bg-background-elevated border border-white/5 rounded-lg group-hover:border-white/10 transition-colors shadow-inner-highlight">
              {getIcon(log.action)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-bold text-foreground tracking-tight uppercase">{(log.action || 'ACTIVITY').replace('_', ' ')}</span>
                <span className="text-[9px] text-foreground-subtle font-mono">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-foreground-muted truncate group-hover:text-foreground-subtle transition-colors">{typeof log.detail === 'string' ? log.detail : JSON.stringify(log.detail)}</p>
            </div>
          </div>
        ))}
      </div>
    </SpotlightCard>
  );
}
