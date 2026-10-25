import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PublicUser } from '@titanapt/shared';
import { apiData, ensureCsrf } from '../lib/api';

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  bootstrapError: string | null;
  login: (email: string, password: string) => Promise<PublicUser>;
  signup: (displayName: string, email: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        await ensureCsrf();
        const me = await apiData<{ user: PublicUser }>('/api/auth/me');
        if (active) setUser(me.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('titanapt:unauthorized', onUnauthorized);
    return () => window.removeEventListener('titanapt:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const body = await apiData<{ user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setUser(body.user);
    setBootstrapError(null);
    return body.user;
  }, []);

  const signup = useCallback(async (displayName: string, email: string, password: string) => {
    const body = await apiData<{ user: PublicUser }>('/api/auth/signup', {
      method: 'POST',
      body: { displayName, email, password },
    });
    setUser(body.user);
    setBootstrapError(null);
    return body.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiData('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setBootstrapError(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await apiData<{ user: PublicUser }>('/api/auth/me');
      setUser(me.user);
    } catch {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, bootstrapError, login, signup, logout, refresh }),
    [user, loading, bootstrapError, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
