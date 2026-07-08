import api, { getApiErrorMessage } from "@/lib/api-client";
import type { AuthUser, LoginCredentials, LoginResponse, SignupCredentials, SignupResponse, AcceptInviteResponse } from "./types";

const TOKEN_KEY = "accessToken";
const USER_KEY = "user";
const REMEMBER_EMAIL_KEY = "finance.rememberEmail";

export const authApi = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  },

  getRememberedEmail(): string {
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  },

  setRememberedEmail(email: string, remember: boolean) {
    try {
      if (remember && email.trim()) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      /* ignore */
    }
  },

  persistSession(accessToken: string, user?: AuthUser) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  async signup(credentials: SignupCredentials): Promise<SignupResponse> {
    const res = await api.post<SignupResponse>("/auth/signup", credentials);
    return res.data;
  },

  async fetchMe(): Promise<AuthUser | null> {
    if (!this.isAuthenticated()) return null;
    try {
      const res = await api.get<{ ok: boolean; user?: AuthUser }>("/auth/me");
      if (res.data?.ok && res.data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (!status || status === 401 || status === 403) {
        this.clearSession();
      }
    }
    return null;
  },

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { email, password, remember = false } = credentials;
    const res = await api.post<LoginResponse>("/auth/login", { email, password });

    if (res.data?.ok && res.data.accessToken) {
      this.persistSession(res.data.accessToken, res.data.user);
      this.setRememberedEmail(email, remember);
      return res.data;
    }

    return { ok: false, message: res.data?.message || "Credenciais inválidas" };
  },

  async acceptInvite(payload: {
    token: string;
    name: string;
    password: string;
  }): Promise<AcceptInviteResponse> {
    const res = await api.post<AcceptInviteResponse>("/auth/accept-invite", payload);
    if (res.data?.ok && res.data.accessToken) {
      this.persistSession(res.data.accessToken, res.data.user);
    }
    return res.data;
  },

  async requestPasswordReset(email: string): Promise<{ ok: boolean; message: string }> {
    const res = await api.post<{ ok: boolean; message: string }>("/auth/forgot-password", { email });
    return res.data;
  },

  async previewPasswordReset(token: string): Promise<{ ok: boolean; email: string; expiresAt: string }> {
    const res = await api.get<{ ok: boolean; email: string; expiresAt: string }>(
      `/auth/reset-password/${token}`,
    );
    return res.data;
  },

  async resetPassword(payload: {
    token: string;
    password: string;
  }): Promise<{ ok: boolean; message: string }> {
    const res = await api.post<{ ok: boolean; message: string }>("/auth/reset-password", payload);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch {
      /* sessão local sempre limpa */
    } finally {
      this.clearSession();
    }
  },

  getLoginErrorMessage(error: unknown): string {
    return getApiErrorMessage(error, "Erro de conexão com o servidor");
  },
};
