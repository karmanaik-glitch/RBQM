import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/client';

export interface User {
  email: string;
  role: string;
  org_id: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rbqm_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    // Re-verify session on load
    authApi.me()
      .then(u => setUser(u as User))
      .catch(() => {
        setUser(null);
        localStorage.removeItem('rbqm_user');
      });
  }, []);

  const login = async (email: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
    
    // Abort after 10 seconds so the UI never hangs when API is unreachable
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
        credentials: 'include',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem('rbqm_user', JSON.stringify(data.user));
      if (data.access_token) localStorage.setItem('rbqm_token', data.access_token);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. Please verify the backend is running.');
      }
      throw err;
    }
  };

  const logout = async () => {
    const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout request failed', err);
    }
    setUser(null);
    localStorage.removeItem('rbqm_user');
    localStorage.removeItem('rbqm_token');
    window.location.href = '/';
  };

  const isAdmin = user?.role === 'cro_admin' || user?.role === 'platform_admin';
  const canEdit = user?.role !== 'sponsor' && user?.role !== 'site_monitor';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isAdmin, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
