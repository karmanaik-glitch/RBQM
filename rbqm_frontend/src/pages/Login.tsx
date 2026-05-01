import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VritasLogo } from '../components/VritasLogo';

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
        <VritasLogo variant="full" />
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#1e232e] px-2 text-slate-500">Or continue with</span></div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setEmail('admin@acmecro.com');
              setPassword('Password123!');
              // Wait a tiny bit for state to update (optional, but cleaner for UI)
              setTimeout(async () => {
                 try {
                   await login('admin@acmecro.com', 'Password123!');
                   addToast('success', 'Demo Access Granted', 'Exploring as ACME CRO Admin');
                   navigate('/dashboard');
                 } catch (err: any) {
                   setError('Demo login failed. Check connection.');
                 }
              }, 100);
            }}
            className="w-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-medium py-2.5 rounded-lg hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            Quick Demo Login
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
