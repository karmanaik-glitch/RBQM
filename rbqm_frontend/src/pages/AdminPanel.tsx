import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Building, Link as LinkIcon, Database, Trash2 } from 'lucide-react';

export function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [orgs, setOrgs] = useState<any[]>([]);

  const fetchOrgs = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/platform/orgs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrgs(await res.json());
    } catch (e) { console.error(e); }
  };

  useState(() => { if (user?.role === 'platform_admin') fetchOrgs(); });

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
        return <UserManagement orgs={orgs} />;
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
        return <OrgManagement orgs={orgs} fetchOrgs={fetchOrgs} />;
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

  );
}

function UserManagement({ orgs }: { orgs: any[] }) {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'cro_admin', org_id: '' });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/admin/users/invite`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
          org_id: (user?.role === 'platform_admin' && inviteData.org_id) ? parseInt(inviteData.org_id) : undefined
        })
      });
      if (res.ok) {
        alert('Invitation sent successfully!');
        setShowInvite(false);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to send invitation');
      }
    } catch (e) { alert('Connection error'); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Remove this user from the organization?')) return;
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchUsers();
      else alert('Failed to remove user');
    } catch (e) { alert('Connection error'); }
  };

  useState(() => { fetchUsers(); });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">User Management</h3>
        <button 
          onClick={() => setShowInvite(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-500 transition-colors"
        >
          Invite New User
        </button>
      </div>

      {showInvite && (
        <div className="bg-slate-900/50 border border-emerald-500/30 p-6 rounded-xl mb-6">
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="col-span-1">
              <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Email Address</label>
              <input 
                type="email"
                value={inviteData.email}
                onChange={e => setInviteData({...inviteData, email: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                placeholder="user@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Role</label>
              <select 
                value={inviteData.role}
                onChange={e => setInviteData({...inviteData, role: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
              >
                <option value="cro_admin">CRO Admin</option>
                <option value="project_manager">Project Manager</option>
                <option value="central_monitor">Central Monitor</option>
                <option value="cdm_lead">CDM Lead</option>
                <option value="data_manager">Data Manager</option>
                <option value="site_monitor">Site Monitor</option>
                <option value="sponsor_viewer">Sponsor Viewer</option>
              </select>
            </div>
            {user?.role === 'platform_admin' && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Target Organisation</label>
                <select 
                  value={inviteData.org_id}
                  onChange={e => setInviteData({...inviteData, org_id: e.target.value})}
                  className="w-full bg-slate-800 border border-emerald-500/50 rounded p-2 text-sm text-slate-200 focus:border-emerald-500 outline-none"
                  required
                >
                  <option value="">Select Org...</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={user?.role === 'platform_admin' && !inviteData.org_id}
                className="flex-1 bg-emerald-600 text-white p-2 rounded text-sm font-bold uppercase tracking-widest hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invite
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="px-4 bg-slate-700 text-slate-300 rounded text-sm hover:bg-slate-600">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-900/30 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{u.full_name || 'Pending Invite'}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-3 capitalize text-slate-400">{u.role.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-400">{u.org_name || 'N/A'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Remove User"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">No users found in this view</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrgManagement({ orgs, fetchOrgs }: { orgs: any[], fetchOrgs: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', tier: 'standard' });

  const handleAdd = async (e: React.FormEvent) => {
    // ... rest of handleAdd logic using fetchOrgs() from props
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This will delete all users and trials for this organization.')) return;
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const token = localStorage.getItem('rbqm_token');
      const res = await fetch(`${BASE_URL}/api/platform/orgs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchOrgs();
      else alert('Failed to delete organization');
    } catch (e) { alert('Connection error'); }
  };

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
              <th className="px-4 py-3 text-right">Actions</th>
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
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => handleDelete(org.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Delete Organization"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">No organizations found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
