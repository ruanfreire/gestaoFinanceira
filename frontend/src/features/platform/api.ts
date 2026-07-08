import api from "@/lib/api-client";
import type { UserStatus } from "@/features/auth/types";
import type { BillingStatus, PlanId } from "@/features/billing/api";

export type PlatformOrganization = {
  _id: string;
  name: string;
  slug?: string;
  status?: UserStatus;
  cnpj?: string;
  plan?: PlanId;
  billingStatus?: BillingStatus;
  trialEndsAt?: string;
  enabled_modules?: string[];
};

export type ModuleCatalogItem = {
  key: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  status: "production" | "beta" | "disabled";
  requires?: string[];
  enabled: boolean;
  killSwitchActive: boolean;
};

export type OrganizationModulesResponse = {
  organization_id: string;
  organization_name?: string;
  enabled_modules: string[];
  catalog: ModuleCatalogItem[];
  module_meta?: Record<string, unknown>;
};

export type PlatformClient = {
  _id: string;
  name: string;
  email: string;
  company?: string;
  cnpj?: string;
  phone?: string;
  status: UserStatus;
  tenantId?: string;
  organization?: PlatformOrganization;
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

  async setClientPlan(id: string, plan: PlanId) {
    const res = await api.patch<{ ok: boolean; client: PlatformClient }>(`/superadmin/clients/${id}/plan`, { plan });
    return res.data;
  },

  async getClientModules(id: string) {
    const res = await api.get<OrganizationModulesResponse>(`/superadmin/clients/${id}/modules`);
    return res.data;
  },

  async updateClientModules(id: string, enabled_modules: string[]) {
    const res = await api.patch<OrganizationModulesResponse>(`/superadmin/clients/${id}/modules`, { enabled_modules });
    return res.data;
  },

  async toggleClientModule(id: string, key: string, enabled: boolean) {
    const action = enabled ? "enable" : "disable";
    const res = await api.post<OrganizationModulesResponse>(`/superadmin/clients/${id}/modules/${key}/${action}`);
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
