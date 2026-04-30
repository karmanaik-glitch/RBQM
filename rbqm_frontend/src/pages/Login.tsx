import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Activity } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      addToast('success', 'Welcome back!', 'You have been signed in successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
      addToast('error', 'Sign in failed', err.message);
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
          <h2 className="text-lg font-semibold text-slate-200">Sign in to your account</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-slate-100 text-slate-900 font-medium py-2.5 rounded-lg hover:bg-white transition-colors mt-2"
          >
            Sign In
          </button>
        </form>
        
        <div className="border-t border-slate-700 px-6 py-4 text-center">
          <p className="text-sm text-slate-400">
            For access, please contact your Organization Administrator for an invite.
          </p>
        </div>
      </div>
    </div>
  );
}
