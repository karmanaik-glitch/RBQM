import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Building, Link as LinkIcon, Database } from 'lucide-react';

export function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  if (user?.role !== 'cro_admin' && user?.role !== 'platform_admin') {
    return (
      <div className="p-8 text-center text-slate-400">
        You do not have permission to view this page.
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-slate-200">User Management</h3>
              <button className="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-500 transition-colors">
                Invite User
              </button>
            </div>
            {/* Placeholder for Users Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-500">
              User list will appear here
            </div>
          </div>
        );
      case 'kri':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-slate-200">KRI Library Configurations</h3>
              <button className="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-500 transition-colors">
                Add KRI Override
              </button>
            </div>
            {/* Placeholder for KRI Table */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-500">
              KRI configurations will appear here
            </div>
          </div>
        );
      case 'sites':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-200 mb-6">Site Assignments</h3>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-500">
              Manage Site Monitors
            </div>
          </div>
        );
      case 'orgs':
        return <OrgManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <Shield className="w-6 h-6 mr-3 text-emerald-400" />
          Administration Panel
        </h1>
        <p className="text-slate-400 mt-2">
          Manage {user?.role === 'platform_admin' ? 'Platform' : 'Organization'} settings and user access.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Nav */}
        <div className="col-span-3 space-y-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}
          >
            <Users className="w-4 h-4 mr-3" /> Users & Invites
          </button>
          
          <button
            onClick={() => setActiveTab('sites')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'sites' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}
          >
            <LinkIcon className="w-4 h-4 mr-3" /> Site Assignments
          </button>

          <button
            onClick={() => setActiveTab('kri')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'kri' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}
          >
            <Database className="w-4 h-4 mr-3" /> KRI Library
          </button>
          
          {user?.role === 'platform_admin' && (
            <button
              onClick={() => setActiveTab('orgs')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orgs' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'}`}
            >
              <Building className="w-4 h-4 mr-3" /> Organizations
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="col-span-9">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 min-h-[500px]">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgManagement() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', tier: 'standard' });

  const fetchOrgs = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/platform/orgs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrgs(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/platform/orgs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: newOrg.name,
          slug: newOrg.slug,
          subscription_tier: newOrg.tier
        })
      });
      if (res.ok) {
        setShowAdd(false);
        fetchOrgs();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to create organization');
      }
    } catch (e) { alert('Connection error'); }
  };

  useState(() => { fetchOrgs(); });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">Organization Portfolio</h3>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-500 transition-colors"
        >
          Add Organisation
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-900/50 border border-emerald-500/30 p-4 rounded-xl mb-6">
          <form onSubmit={handleAdd} className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Org Name</label>
              <input 
                value={newOrg.name}
                onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                placeholder="e.g. Acme CRO"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Slug (URL ID)</label>
              <input 
                value={newOrg.slug}
                onChange={e => setNewOrg({...newOrg, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                placeholder="acme-cro"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-emerald-600 text-white p-2 rounded text-sm font-bold uppercase tracking-widest hover:bg-emerald-500">Create</button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-900/30 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {orgs.map(org => (
              <tr key={org.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-slate-200">{org.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{org.slug}</td>
                <td className="px-4 py-3 capitalize text-slate-400">{org.subscription_tier}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${org.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {org.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && orgs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">No organizations found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
