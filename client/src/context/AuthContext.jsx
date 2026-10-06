import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api.js';

const TOKEN_KEY = 'bb_token';
const USER_KEY = 'bb_user';

const AuthContext = createContext(null);

/**
 * Holds the single source of truth for "who is logged in" on the client.
 * The backend still re-validates the JWT on every protected request.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [initialising, setInitialising] = useState(true);

  const persist = useCallback((nextToken, nextUser) => {
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
    else localStorage.removeItem(TOKEN_KEY);

    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(USER_KEY);

    setToken(nextToken);
    setUser(nextUser);
  }, []);

  // On first load, confirm the stored token is still valid.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setInitialising(false);
        return;
      }

      try {
        const data = await authApi.me();
        if (!cancelled) persist(storedToken, data.user);
      } catch {
        if (!cancelled) persist(null, null);
      } finally {
        if (!cancelled) setInitialising(false);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [persist]);

  const login = useCallback(
    async (credentials) => {
      const data = await authApi.login(credentials);
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload);
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logging out locally matters more than the server acknowledging it.
    }
    persist(null, null);
  }, [persist]);

  /** Called after trades or a capital reset so the navbar balance stays fresh. */
  const refreshUser = useCallback(
    async (nextUser) => {
      if (nextUser) {
        persist(token, nextUser);
        return nextUser;
      }

      try {
        const data = await authApi.me();
        persist(token, data.user);
        return data.user;
      } catch {
        return null;
      }
    },
    [persist, token]
  );

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(user && token), initialising, login, register, logout, refreshUser }),
    [user, token, initialising, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export default AuthContext;
