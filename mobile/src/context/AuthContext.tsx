import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../lib/api';
import type { User } from '../lib/types';

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; phone?: string; role: 'patient' | 'doctor' }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

// Hospital staff and platform admins work in the web panel; the app has no screens for them
const MOBILE_ROLES: User['role'][] = ['patient', 'doctor'];
const WEB_ONLY_MESSAGE = 'This account is for the Mediqo web panel. Please sign in there instead.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await tokenStore.get();
    if (!token) return setUser(null);
    try {
      const { data } = await api.get('/auth/me');
      if (!MOBILE_ROLES.includes(data.user.role)) throw new Error(WEB_ONLY_MESSAGE);
      setUser(data.user);
    } catch {
      await tokenStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!MOBILE_ROLES.includes(data.user.role)) throw new Error(WEB_ONLY_MESSAGE);
    await tokenStore.set(data.token);
    setUser(data.user);
  };

  const register: AuthState['register'] = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    await tokenStore.set(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
