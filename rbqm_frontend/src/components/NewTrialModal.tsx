import { useState } from 'react';
import { X, Plus, Trash2, FlaskConical, AlertCircle } from 'lucide-react';

interface NewTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface SiteRow {
  site_id: string;
  site_name: string;
  country: string;
  target_enrollment: number;
}

const PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'BA-BE'];

export function NewTrialModal({ isOpen, onClose, onCreated }: NewTrialModalProps) {
  const [trialId, setTrialId] = useState('');
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState('Phase III');
  const [therapeuticArea, setTherapeuticArea] = useState('');
  const [indication, setIndication] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [targetLockDate, setTargetLockDate] = useState('');
  const [sites, setSites] = useState<SiteRow[]>([
    { site_id: '', site_name: '', country: 'India', target_enrollment: 50 }
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const addSiteRow = () => {
    setSites([...sites, { site_id: '', site_name: '', country: 'India', target_enrollment: 50 }]);
  };

  const removeSiteRow = (idx: number) => {
    if (sites.length <= 1) return;
    setSites(sites.filter((_, i) => i !== idx));
  };

  const updateSite = (idx: number, field: keyof SiteRow, value: string | number) => {
    const updated = [...sites];
    updated[idx] = { ...updated[idx], [field]: value };
    setSites(updated);
  };

  const validate = (): string | null => {
    if (!trialId.trim()) return 'Trial ID is required.';
    if (!title.trim()) return 'Title is required.';
    if (!targetLockDate) return 'Target lock date is required.';
    if (sites.length === 0) return 'At least one site is required.';
    for (let i = 0; i < sites.length; i++) {
      if (!sites[i].site_id.trim()) return `Site ${i + 1}: Site ID is required.`;
      if (!sites[i].site_name.trim()) return `Site ${i + 1}: Site name is required.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Create trial with sites in one request
      const response = await fetch(`${BASE_URL}/api/trials`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          trial_id: trialId,
          title,
          phase,
          therapeutic_area: therapeuticArea,
          indication,
          sponsor_name: sponsorName,
          target_lock_date: targetLockDate,
          sites: sites.map(s => ({
            site_id: s.site_id,
            site_name: s.site_name,
            country: s.country,
            target_enrollment: s.target_enrollment
          }))
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create trial');
      }

      onCreated();
      onClose();

      // Reset form
      setTrialId('');
      setTitle('');
      setPhase('Phase III');
      setTherapeuticArea('');
      setIndication('');
      setSponsorName('');
      setTargetLockDate('');
      setSites([{ site_id: '', site_name: '', country: 'India', target_enrollment: 50 }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/30 border border-emerald-800 rounded-lg">
              <FlaskConical size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Create New Trial</h2>
              <p className="text-xs text-slate-500">Set up a new clinical trial with site enrollment targets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Trial Details */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Trial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Trial ID *</label>
                <input
                  type="text"
                  placeholder="e.g. TRIAL-2024-002"
                  value={trialId}
                  onChange={e => setTrialId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="Study title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phase</label>
                <select
                  value={phase}
                  onChange={e => setPhase(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                >
                  {PHASES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Therapeutic Area</label>
                <input
                  type="text"
                  placeholder="e.g. Oncology"
                  value={therapeuticArea}
                  onChange={e => setTherapeuticArea(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Indication</label>
                <input
                  type="text"
                  placeholder="e.g. NSCLC"
                  value={indication}
                  onChange={e => setIndication(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Sponsor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Global Pharma"
                  value={sponsorName}
                  onChange={e => setSponsorName(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Target Lock Date *</label>
                <input
                  type="date"
                  value={targetLockDate}
                  onChange={e => setTargetLockDate(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Sites Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sites ({sites.length})</h3>
              <button
                onClick={addSiteRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-800/50 rounded-lg transition-colors"
              >
                <Plus size={14} /> Add Site
              </button>
            </div>
            <div className="space-y-3">
              {sites.map((site, idx) => (
                <div key={idx} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site {idx + 1}</span>
                    {sites.length > 1 && (
                      <button
                        onClick={() => removeSiteRow(idx)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Site ID (e.g. SITE-201)"
                      value={site.site_id}
                      onChange={e => updateSite(idx, 'site_id', e.target.value)}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Site Name"
                      value={site.site_name}
                      onChange={e => updateSite(idx, 'site_name', e.target.value)}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={site.country}
                      onChange={e => updateSite(idx, 'country', e.target.value)}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                    />
                    <input
                      type="number"
                      placeholder="Target Enrollment"
                      value={site.target_enrollment}
                      onChange={e => updateSite(idx, 'target_enrollment', parseInt(e.target.value) || 0)}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-400 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Trial'}
          </button>
        </div>
      </div>
    </div>
  );
}
