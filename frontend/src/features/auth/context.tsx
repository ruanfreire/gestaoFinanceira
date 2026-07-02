import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "./api";
import type { AuthUser, LoginCredentials } from "./types";
import { isSuperadmin } from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  setSession: (user: AuthUser) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authApi.getUser());
  const [isBootstrapping, setIsBootstrapping] = useState(() => authApi.isAuthenticated());

  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const refreshed = await authApi.fetchMe();
        if (cancelled) return;

        if (refreshed) {
          setUser(refreshed);
        } else if (!authApi.isAuthenticated()) {
          setUser(null);
        } else {
          const stored = authApi.getUser();
          if (stored && !isSuperadmin(stored) && !stored.organization?.slug) {
            authApi.clearSession();
            setUser(null);
          } else {
            setUser(stored);
          }
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await authApi.login(credentials);
    if (!res.ok || !res.accessToken) {
      throw new Error(res.message || "Credenciais inválidas");
    }
    setUser(res.user ?? authApi.getUser());
    setIsBootstrapping(false);
  }, []);

  const setSession = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    setIsBootstrapping(false);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setIsBootstrapping(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: authApi.isAuthenticated(),
      isBootstrapping,
      login,
      setSession,
      logout,
    }),
    [user, isBootstrapping, login, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
