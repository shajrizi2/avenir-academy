'use client';

import type { AuthResponse, LoginInput, PublicUser, RegisterInput } from '@ai-academy/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE, apiFetch, onSessionChange, refreshSession, setSession } from './api';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  login: (input: LoginInput) => Promise<PublicUser>;
  register: (input: RegisterInput) => Promise<PublicUser>;
  logout: () => Promise<void>;
  /** Replace the cached user after a profile update. */
  setUser: (user: PublicUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<PublicUser | null>(null);

  useEffect(() => {
    const unsubscribe = onSessionChange((session) => {
      setUserState(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });
    // Restore the session from the refresh cookie on first load.
    void refreshSession();
    return unsubscribe;
  }, []);

  const authenticate = useCallback(
    async (path: string, body: unknown) => {
      const session = await apiFetch<AuthResponse>(path, { method: 'POST', body });
      queryClient.clear();
      setSession(session);
      return session.user;
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: (input) => authenticate('/auth/login', input),
      register: (input) => authenticate('/auth/register', input),
      logout: async () => {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
        queryClient.clear();
        setSession(null);
      },
      setUser: (next) => setUserState(next),
    }),
    [status, user, authenticate, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
