import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Activity, ShieldCheck, Copy, Check } from 'lucide-react';

export function Setup2FA() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [qrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate setup
    setTimeout(() => {
        setSecret('JBSWY3DPEHPK3PXP');
        setIsLoading(false);
    }, 1000);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    
    // Simulated verification
    addToast('success', '2FA Enabled', 'Two-factor authentication is now active.');
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin text-emerald-400">
          <Activity className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
        <div className="border-b border-slate-700 px-6 py-4 flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-emerald-900/50 border border-emerald-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200">Set Up 2-Factor Auth</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-300">
            Scan the QR code with your authenticator app (like Google Authenticator or Authy).
          </p>

          <div className="flex justify-center bg-white p-4 rounded-lg">
             {qrCode ? (
                <img src={`data:image/png;base64,${qrCode}`} alt="2FA QR Code" className="w-48 h-48" />
             ) : (
                <div className="w-48 h-48 bg-slate-200 flex items-center justify-center text-slate-500 text-sm rounded">
                  [QR Code Placeholder]
                </div>
             )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
              Or enter code manually
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-slate-300 text-center tracking-widest font-mono">
                {secret.match(/.{1,4}/g)?.join(' ')}
              </code>
              <button 
                onClick={handleCopy}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4 pt-4 border-t border-slate-700">
            {error && (
              <div className="bg-red-900/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Verify Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors tracking-widest text-center text-lg font-mono placeholder:text-slate-600"
                value={token}
                onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            
            <button
              type="submit"
              disabled={token.length !== 6}
              className="w-full bg-emerald-600 text-white font-medium py-2.5 rounded-lg hover:bg-emerald-500 transition-colors mt-2 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              Verify & Enable 2FA
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
