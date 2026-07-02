import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authApi } from "./api";
import type { AuthUser, LoginCredentials } from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authApi.getUser());

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await authApi.login(credentials);
    if (!res.ok || !res.accessToken) {
      throw new Error(res.message || "Credenciais inválidas");
    }
    setUser(res.user ?? authApi.getUser());
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && authApi.getToken()),
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
