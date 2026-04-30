import { useEffect, useState } from 'react';
import { Clock, User, Upload, Activity, Bell, CheckCircle2, LogIn, FileText } from 'lucide-react';

interface AuditEvent {
  id: number;
  event_type: string;
  user_email: string;
  trial_id: number | null;
  detail: string;
  created_at: string;
}

interface AuditLogPanelProps {
  trialId?: number;
}

const EVENT_ICONS: Record<string, { icon: typeof Clock; color: string }> = {
  LOGIN: { icon: LogIn, color: 'text-blue-400' },
  REGISTER: { icon: User, color: 'text-cyan-400' },
  UPLOAD: { icon: Upload, color: 'text-purple-400' },
  KRI_RUN: { icon: Activity, color: 'text-emerald-400' },
  ALERT_CREATED: { icon: Bell, color: 'text-red-400' },
  ALERT_UPDATED: { icon: Bell, color: 'text-yellow-400' },
  ACTION_CREATED: { icon: CheckCircle2, color: 'text-emerald-400' },
  ACTION_UPDATED: { icon: CheckCircle2, color: 'text-yellow-400' },
  TRIAL_CREATED: { icon: FileText, color: 'text-cyan-400' },
  REPORT_GENERATED: { icon: FileText, color: 'text-purple-400' },
};

function getEventConfig(eventType: string) {
  return EVENT_ICONS[eventType] || { icon: Clock, color: 'text-slate-400' };
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AuditLogPanel({ trialId }: AuditLogPanelProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog();
  }, [trialId]);

  const fetchAuditLog = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/actions/audit-log`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        let data: AuditEvent[] = await res.json();
        // Filter by trial if provided
        if (trialId) {
          data = data.filter(e => e.trial_id === trialId || e.trial_id === null);
        }
        setEvents(data);
      }
    } catch (err) {
      console.error('Error fetching audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading Audit Log...</div>;

  if (events.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-12 text-center">
        <Clock size={48} className="mx-auto text-slate-700 mb-4" />
        <p className="text-slate-500 text-sm">No audit events recorded yet.</p>
        <p className="text-slate-600 text-xs mt-1">Events will appear here as actions are performed in the system.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Audit Trail</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Complete history of system events (ICH E6 R3 — Section 5.5)</p>
        </div>
        <span className="text-xs text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded border border-slate-700">
          {events.length} events
        </span>
      </div>

      <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
        {events.map((event, idx) => {
          const config = getEventConfig(event.event_type);
          const Icon = config.icon;

          return (
            <div key={event.id || idx} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-700/10 transition-colors group">
              {/* Timeline dot */}
              <div className="flex flex-col items-center mt-0.5">
                <div className={`w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center ${config.color} group-hover:border-slate-600 transition-colors`}>
                  <Icon size={14} />
                </div>
                {idx < events.length - 1 && (
                  <div className="w-px h-full bg-slate-700/50 mt-1 min-h-[20px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                      event.event_type.includes('ALERT') ? 'bg-red-900/20 text-red-400 border-red-800/50' :
                      event.event_type.includes('KRI') ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50' :
                      event.event_type.includes('UPLOAD') ? 'bg-purple-900/20 text-purple-400 border-purple-800/50' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    {event.user_email && (
                      <span className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <User size={10} /> {event.user_email}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap" title={new Date(event.created_at).toLocaleString()}>
                    {formatTimestamp(event.created_at)}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{event.detail}</p>
                {event.trial_id && (
                  <span className="text-[10px] text-slate-600 font-mono mt-1 inline-block">
                    Trial #{event.trial_id}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
