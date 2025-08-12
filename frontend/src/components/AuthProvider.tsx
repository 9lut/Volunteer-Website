'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/axios';
import { decodeJwt } from 'jose';
import { clearAuthTokenCookie, getAuthTokenFromCookie, setAuthTokenCookie } from '@/lib/jwt';

type Role = 'student' | 'president' | 'admin';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
}

interface AuthContextValue {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: AuthUser | null;
  backendToken?: string;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const loadFromCookie = useCallback(() => {
    try {
      const t = getAuthTokenFromCookie();
      if (!t) {
        setUser(null);
        setToken(undefined);
        setStatus('unauthenticated');
        return;
      }
      const payload: any = decodeJwt(t);
      const expMs = payload?.exp ? payload.exp * 1000 : undefined;
      if (expMs && Date.now() >= expMs) {
        clearAuthTokenCookie();
        setUser(null);
        setToken(undefined);
        setStatus('unauthenticated');
        return;
      }
      setUser({ id: payload.id, email: payload.email, role: payload.role, name: payload.name });
      setToken(t);
      setStatus('authenticated');
    } catch {
      clearAuthTokenCookie();
      setUser(null);
      setToken(undefined);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    loadFromCookie();
  }, [loadFromCookie]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      const backendToken: string = data?.token;
      if (!backendToken) return { ok: false, error: 'Invalid response' };
      let expMs: number | undefined;
      try {
        const payload: any = decodeJwt(backendToken);
        expMs = payload?.exp ? payload.exp * 1000 : undefined;
      } catch {}
      setAuthTokenCookie(backendToken, expMs);
      loadFromCookie();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ' };
    }
  }, [loadFromCookie]);

  const signOut = useCallback(async () => {
    clearAuthTokenCookie();
    loadFromCookie();
  }, [loadFromCookie]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    backendToken: token,
    signIn,
    signOut,
  }), [status, user, token, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}