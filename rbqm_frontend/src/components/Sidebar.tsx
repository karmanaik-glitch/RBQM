import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, FlaskConical, Bell, FileText, LogOut, ChevronRight, Command, Sun, Moon, HelpCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { resetOnboarding } from './OnboardingTour';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [alertCount, setAlertCount] = useState(0);
  const [apiOnline, setApiOnline] = useState(true);

  // Fetch alert count for badge
  useEffect(() => {
    const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
    const token = localStorage.getItem('rbqm_token');
    
    const checkAlerts = () => {
      fetch(`${BASE_URL}/api/kri/alerts`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      })
        .then(r => { setApiOnline(true); return r.json() })
        .then(data => setAlertCount(data.alerts?.filter((a: any) => a.status === 'RED').length ?? 0))
        .catch(() => setApiOnline(false))
    }

    checkAlerts()
    const interval = setInterval(checkAlerts, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    addToast('info', 'Signed out', 'You have been logged out successfully.');
    logout();
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard', badge: 0 },
    { to: '/trials', icon: FlaskConical, label: 'Trials', badge: 0 },
    { to: '/alerts', icon: Bell, label: 'Alerts', badge: alertCount },
    { to: '/reports', icon: FileText, label: 'Reports', badge: 0 },
  ];

  if (user?.role === 'cro_admin' || user?.role === 'platform_admin') {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin', badge: 0 });
  }

  return (
    <aside className="w-64 bg-background-deep border-r border-border-default flex flex-col h-screen sticky top-0 z-50">
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-accent-glow">
          <span className="text-white font-bold text-lg">R</span>
        </div>
        <span className="text-gradient font-semibold tracking-tight text-xl uppercase">Vritas</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-white/[0.05] text-foreground border-l-2 border-accent shadow-inner-highlight'
                  : 'text-foreground-muted hover:bg-white/[0.03] hover:text-foreground'
              }`
            }
          >
            <div className="flex items-center gap-3 relative">
              <item.icon className={`w-4 h-4 transition-colors group-hover:text-accent`} />
              {item.label}
              {item.badge > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-black animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-accent" />
          </NavLink>
        ))}

        {/* Command Palette Shortcut */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground-muted hover:bg-white/[0.03] hover:text-foreground transition-all mt-4"
        >
          <Command className="w-4 h-4" />
          Search
          <kbd className="ml-auto text-[9px] text-foreground-muted bg-white/[0.05] border border-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </button>

        {/* Theme Toggle & Tour */}
        <div className="flex items-center gap-1 mt-2 px-2">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:bg-white/[0.03] hover:text-foreground transition-all"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={resetOnboarding}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:bg-white/[0.03] hover:text-foreground transition-all"
            title="Replay Onboarding Tour"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Tour
          </button>
        </div>
      </nav>

      {user && (
        <div className="p-4 border-t border-border-default space-y-3">
          {/* Backend Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-foreground-muted">
            <div className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {apiOnline ? 'API Connected' : 'API Offline'}
          </div>
          
          <div className="bg-white/[0.03] border border-border-default rounded-2xl p-4 flex items-center justify-between group shadow-inner-highlight">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-background-elevated border border-border-default flex items-center justify-center text-foreground-muted text-xs font-bold uppercase ring-1 ring-white/5">
                {user.email.substring(0, 2)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate">{user.email.split('@')[0]}</p>
                <p className="text-[10px] text-foreground-subtle uppercase tracking-widest font-mono mt-0.5">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-foreground-muted hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
