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
            {/* Placeholder for Site Assignments */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center text-slate-500">
              Manage Site Monitors
            </div>
          </div>
        );
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
