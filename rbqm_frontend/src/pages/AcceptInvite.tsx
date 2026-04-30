import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Activity } from 'lucide-react';

export function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/auth/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName, password }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to accept invite');
      
      addToast('success', 'Account created!', 'You can now sign in with your new password.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col justify-center items-center p-4">
      <Link to="/" className="mb-8 flex items-center space-x-3 hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 rounded-lg bg-emerald-900/50 border border-emerald-800 flex items-center justify-center">
          <Activity className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Vritas RBQM</h1>
      </Link>
      
      <div className="w-full max-w-md bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
        <div className="border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-200">Accept Invitation</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              disabled={!token || isLoading}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Set Password</label>
            <input
              type="password"
              required
              disabled={!token || isLoading}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              disabled={!token || isLoading}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={!token || isLoading}
            className="w-full bg-slate-100 text-slate-900 font-medium py-2.5 rounded-lg hover:bg-white transition-colors mt-2 disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Join Platform'}
          </button>
        </form>
      </div>
    </div>
  );
}
