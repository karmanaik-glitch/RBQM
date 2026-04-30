import { useEffect, useState } from 'react';
import { Bell, Search, ChevronRight, AlertCircle, CheckCircle2, User, Calendar, Plus, X, Shield } from 'lucide-react';
import { SpotlightCard } from '../components/SpotlightCard';

interface Alert {
  id: number;
  kri_id: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  site_ext_id: string;
  trial_id: number;
  created_at: string;
}

interface ActionItem {
  id: number;
  title: string;
  description: string;
  owner_name: string;
  due_date: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  assigned_to?: number;
}

interface Comment {
  id: number;
  text: string;
  user_email: string;
  created_at: string;
}

interface PlatformUser {
  id: number;
  email: string;
  role: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Alert['status'] | 'ALL'>('ALL');
  const [severityFilter] = useState<Alert['severity'] | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionForm, setShowActionForm] = useState(false);
  const [newAction, setNewAction] = useState({ title: '', description: '', owner_name: '', due_date: '', assigned_to: '' });
  const [creatingAction, setCreatingAction] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedAlert) {
      fetchActionItems(selectedAlert.id);
      fetchComments(selectedAlert.id);
    }
  }, [selectedAlert]);

  const fetchAlerts = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/actions/alerts`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
        if (data.length > 0 && !selectedAlert) setSelectedAlert(data[0]);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActionItems = async (alertId: number) => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/actions/alert/${alertId}/items`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) setActionItems(await res.json());
    } catch (err) {
      console.error('Error fetching action items:', err);
    }
  };

  const fetchComments = async (alertId: number) => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/actions/alert/${alertId}/comments`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) setComments(await res.json());
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/auth/users`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const updateAlertStatus = async (alertId: number, status: string) => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      await fetch(`${BASE_URL}/api/actions/alert/${alertId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ status })
      });
      fetchAlerts();
    } catch (err) {
      console.error('Error updating alert status:', err);
    }
  };

  const updateActionItemStatus = async (itemId: number, status: string) => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      await fetch(`${BASE_URL}/api/actions/item/${itemId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ status })
      });
      if (selectedAlert) fetchActionItems(selectedAlert.id);
    } catch (err) {
      console.error('Error updating action item:', err);
    }
  };

  const createActionItem = async () => {
    if (!selectedAlert) return;
    if (!newAction.title.trim() || !newAction.due_date) return;

    setCreatingAction(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const payload = {
        ...newAction,
        assigned_to: newAction.assigned_to ? parseInt(newAction.assigned_to) : null,
        owner_name: newAction.owner_name || (users.find(u => u.id === parseInt(newAction.assigned_to))?.email ?? 'Unknown')
      };
      const res = await fetch(`${BASE_URL}/api/actions/alert/${selectedAlert.id}/item`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchActionItems(selectedAlert.id);
        setNewAction({ title: '', description: '', owner_name: '', due_date: '', assigned_to: '' });
        setShowActionForm(false);
      }
    } catch (err) {
      console.error('Error creating action item:', err);
    } finally {
      setCreatingAction(false);
    }
  };

  const addComment = async () => {
    if (!selectedAlert || !newComment.trim()) return;
    setAddingComment(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/actions/comment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ text: newComment, alert_id: selectedAlert.id })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments(selectedAlert.id);
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setAddingComment(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.kri_id.toLowerCase().includes(q) || a.site_ext_id.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <div className="p-8 text-foreground-muted">Loading alerts...</div>;

  return (
    <div className="flex h-screen bg-transparent overflow-hidden animate-fade-up">
      {/* Alert List */}
      <div className="w-96 border-r border-border-default flex flex-col overflow-hidden bg-background-deep/50 backdrop-blur-md">
        <div className="p-8 border-b border-border-default">
          <h1 className="text-xl font-bold text-gradient flex items-center gap-2">
            <Bell size={20} className="text-accent" />
            Alerts Center
          </h1>
          <div className="mt-6 flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
              <input 
                type="text" 
                placeholder="Search KRI or Site..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground focus:border-accent outline-none transition-all"
              />
            </div>
          </div>
          {/* Filters */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as Alert['status'] | 'ALL')}
              className="bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-foreground-subtle outline-none hover:border-white/20 transition-all"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAlerts.map(alert => (
            <button
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              className={`w-full p-5 rounded-2xl border text-left transition-all duration-300 ${
                selectedAlert?.id === alert.id 
                  ? 'bg-white/[0.08] border-accent/50 shadow-inner-highlight scale-[1.02]' 
                  : 'bg-white/[0.03] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-[0.1em] ${
                  alert.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                  alert.severity === 'MAJOR' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-white/5 text-foreground-subtle border border-white/10'
                }`}>
                  {alert.severity}
                </span>
                <span className="text-[10px] text-foreground-subtle font-mono">
                  {new Date(alert.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">Site {alert.site_ext_id} — KRI {alert.kri_id}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    alert.status === 'OPEN' ? 'bg-red-500' : 
                    alert.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <span className="text-[10px] text-foreground-subtle font-bold uppercase tracking-widest">{alert.status.replace('_', ' ')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Alert Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedAlert ? (
          <div className="p-8 lg:p-12 overflow-y-auto space-y-10">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-foreground-subtle bg-white/[0.03] px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">TRIAL-{selectedAlert.trial_id}</span>
                  <ChevronRight size={12} className="text-foreground-subtle" />
                  <span className="text-[10px] font-mono text-foreground-subtle bg-white/[0.03] px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">SITE-{selectedAlert.site_ext_id}</span>
                </div>
                <h2 className="text-4xl font-semibold tracking-tight text-gradient">KRI Breach: {selectedAlert.kri_id}</h2>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={selectedAlert.status}
                  onChange={(e) => updateAlertStatus(selectedAlert.id, e.target.value)}
                  className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent transition-all shadow-inner-highlight"
                >
                  <option value="OPEN">Mark as Open</option>
                  <option value="IN_PROGRESS">Mark In Progress</option>
                  <option value="RESOLVED">Mark as Resolved</option>
                  <option value="CLOSED">Mark as Closed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SpotlightCard className="p-8">
                <h3 className="text-xs font-bold text-foreground-subtle uppercase tracking-widest mb-6 flex items-center gap-2">
                  <AlertCircle size={14} className="text-accent" />
                  Investigation Protocol
                </h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  The missing data rate at Site {selectedAlert.site_ext_id} has exceeded the critical threshold. 
                  This indicates a potential breakdown in data entry processes or investigator oversight. 
                  Immediate reconciliation with source documents is required to ensure data integrity for the upcoming interim analysis.
                </p>
              </SpotlightCard>
              
              <SpotlightCard className="p-8">
                <h3 className="text-xs font-bold text-foreground-subtle uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Shield size={14} className="text-accent" />
                  Regulatory Context (ICH E6 R3)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-mono bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded text-foreground-subtle">Section 5.0</span>
                    <p className="text-xs text-foreground-muted italic leading-relaxed">"The sponsor should implement a system to manage quality throughout all stages of the trial process... focusing on critical data and processes."</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-mono bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded text-foreground-subtle">Section 5.18</span>
                    <p className="text-xs text-foreground-muted italic leading-relaxed">"Monitoring should be proportionate to the risks... including centralized monitoring for data quality."</p>
                  </div>
                </div>
              </SpotlightCard>
            </div>

            {/* Action Items */}
            <SpotlightCard className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest">Corrective Actions</h3>
                <button
                  onClick={() => setShowActionForm(!showActionForm)}
                  className="flex items-center gap-1.5 text-xs font-bold text-accent hover:text-accent-bright transition-colors"
                >
                  {showActionForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Action Item</>}
                </button>
              </div>

              {showActionForm && (
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-6 animate-fade-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-foreground-subtle uppercase tracking-widest mb-2 font-bold">Action Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Reconcile source documents with EDC"
                        value={newAction.title}
                        onChange={e => setNewAction({ ...newAction, title: e.target.value })}
                        className="w-full bg-background-base/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent transition-all placeholder:text-foreground-subtle/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-foreground-subtle uppercase tracking-widest mb-2 font-bold">Assignee</label>
                      <select
                        value={newAction.assigned_to}
                        onChange={e => setNewAction({ ...newAction, assigned_to: e.target.value })}
                        className="w-full bg-background-base/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent transition-all"
                      >
                        <option value="">Select Member...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-foreground-subtle uppercase tracking-widest mb-2 font-bold">Due Date</label>
                      <input
                        type="date"
                        value={newAction.due_date}
                        onChange={e => setNewAction({ ...newAction, due_date: e.target.value })}
                        className="w-full bg-background-base/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={createActionItem}
                      disabled={creatingAction || !newAction.title.trim() || !newAction.due_date}
                      className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-bright text-white text-sm font-bold transition-all shadow-accent-glow disabled:opacity-50"
                    >
                      {creatingAction ? 'Processing...' : 'Deploy Action'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {actionItems.map(item => (
                  <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                        item.status === 'DONE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-background-elevated border-white/5 text-foreground-subtle'
                      }`}>
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <h4 className={`text-sm font-medium ${item.status === 'DONE' ? 'text-foreground-subtle line-through' : 'text-foreground'}`}>
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-foreground-subtle font-mono uppercase tracking-tighter">
                            <User size={10} /> {item.owner_name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-foreground-subtle font-mono uppercase tracking-tighter">
                            <Calendar size={10} /> {new Date(item.due_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <select
                      value={item.status}
                      onChange={e => updateActionItemStatus(item.id, e.target.value)}
                      className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-all ${
                        item.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        item.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-white/5 text-foreground-subtle border-white/10'
                      }`}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">Progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>
                ))}
              </div>
            </SpotlightCard>

            {/* Comments Timeline */}
            <SpotlightCard className="p-8 space-y-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest">Investigation Timeline</h3>
              
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden shadow-inner-highlight">
                <div className="p-4 border-b border-white/5 flex gap-3">
                  <input 
                    type="text"
                    placeholder="Document investigation progress..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment()}
                    className="flex-1 bg-background-base/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent placeholder:text-foreground-subtle/30"
                  />
                  <button
                    onClick={addComment}
                    disabled={addingComment || !newComment.trim()}
                    className="px-6 py-2.5 bg-accent hover:bg-accent-bright text-white text-xs font-bold rounded-xl transition-all shadow-accent-glow disabled:opacity-50"
                  >
                    Post Update
                  </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-background-elevated border border-white/5 flex items-center justify-center text-[10px] font-bold text-foreground-subtle uppercase shadow-inner-highlight">
                        {comment.user_email.substring(0, 2)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-foreground">{comment.user_email}</span>
                          <span className="text-[9px] text-foreground-subtle font-mono uppercase">{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground-muted leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground-subtle space-y-6">
            <div className="p-8 rounded-full bg-white/[0.02] border border-white/5 animate-pulse">
              <Bell size={64} className="opacity-20" />
            </div>
            <p className="font-medium tracking-widest uppercase text-xs">Select an investigation to begin oversight</p>
          </div>
        )}
      </div>
    </div>
  );
}
