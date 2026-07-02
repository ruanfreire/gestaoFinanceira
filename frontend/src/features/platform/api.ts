import api from "@/lib/api-client";
import type { UserStatus } from "@/features/auth/types";

export type PlatformClient = {
  _id: string;
  name: string;
  email: string;
  company?: string;
  cnpj?: string;
  phone?: string;
  status: UserStatus;
  createdAt?: string;
  lastLogin?: string;
  lastLoginIp?: string;
};

export type PlatformNotification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
  targetUserId?: string;
};

export type PushCategories = {
  platform: boolean;
  imports: boolean;
  conciliation: boolean;
  billing: boolean;
  team: boolean;
};

export const platformApi = {
  async getDashboard() {
    const res = await api.get<{
      counts: { total: number; pending: number; approved: number; rejected: number; suspended: number };
      recent: PlatformClient[];
    }>("/superadmin/dashboard");
    return res.data;
  },

  async listClients(status?: UserStatus) {
    const res = await api.get<{ items: PlatformClient[]; total: number }>("/superadmin/clients", {
      params: status ? { status } : undefined,
    });
    return res.data;
  },

  async getClient(id: string) {
    const res = await api.get<{
      client: PlatformClient;
      history: { action: string; note?: string; createdAt?: string; ip?: string }[];
    }>(`/superadmin/clients/${id}`);
    return res.data;
  },

  async approveClient(id: string) {
    const res = await api.post(`/superadmin/clients/${id}/approve`);
    return res.data;
  },

  async rejectClient(id: string, note?: string) {
    const res = await api.post(`/superadmin/clients/${id}/reject`, { note });
    return res.data;
  },

  async suspendClient(id: string, note?: string) {
    const res = await api.post(`/superadmin/clients/${id}/suspend`, { note });
    return res.data;
  },

  async listNotifications() {
    const res = await api.get<PlatformNotification[]>("/notifications");
    return res.data;
  },

  async unreadCount() {
    const res = await api.get<{ count: number }>("/notifications/unread-count");
    return res.data.count;
  },

  async markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead() {
    await api.post("/notifications/read-all");
  },

  async getVapidPublicKey() {
    const res = await api.get<{ publicKey: string | null }>("/push/vapid-public-key");
    return res.data.publicKey;
  },

  async subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    await api.post("/push/subscribe", subscription);
  },

  async getPushPreferences() {
    const res = await api.get<PushCategories>("/notifications/push-preferences");
    return res.data;
  },

  async updatePushPreferences(prefs: PushCategories) {
    await api.patch("/notifications/push-preferences", prefs);
  },
};
