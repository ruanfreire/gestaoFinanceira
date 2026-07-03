import axios, { type InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
    if (res.data?.ok && res.data?.accessToken) {
      localStorage.setItem("accessToken", res.data.accessToken);
      return res.data.accessToken;
    }
  } catch {
    /* refresh indisponível */
  }
  return null;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const isAuthRoute = original?.url?.includes("/auth/");

    if ((status === 401 || status === 403) && original && !original._retry && !isAuthRoute) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }

      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/auth/entrar")) {
        window.location.href = "/auth/entrar";
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = "Ocorreu um erro"): string {
  const err = error as { response?: { data?: { message?: string | string[] } } };
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default api;
