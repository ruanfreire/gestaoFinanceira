import api from "@/lib/api-client";
import type { TenantRole } from "@/features/auth/types";

export type OrgMember = {
  _id: string;
  name: string;
  email: string;
  tenantRole?: TenantRole;
  status?: string;
  createdAt?: string;
  lastLogin?: string;
};

export type OrgInvite = {
  _id: string;
  email: string;
  tenantRole: TenantRole;
  status: string;
  expiresAt: string;
  createdAt?: string;
};

export const orgApi = {
  async resolveSlug(slug: string) {
    const { data } = await api.get<{ name: string; slug: string; status: string }>(`/orgs/resolve/${slug}`);
    return data;
  },

  async listMembers() {
    const { data } = await api.get<{ items: OrgMember[]; total: number }>("/org/members");
    return data;
  },

  async listInvites() {
    const { data } = await api.get<{ items: OrgInvite[]; total: number }>("/org/invites");
    return data;
  },

  async createInvite(payload: { email: string; tenantRole?: TenantRole }) {
    const { data } = await api.post<{
      ok: boolean;
      inviteUrl: string;
      email: string;
      tenantRole: TenantRole;
      expiresAt: string;
    }>("/org/invites", payload);
    return data;
  },

  async revokeInvite(id: string) {
    const { data } = await api.delete<{ ok: boolean }>(`/org/invites/${id}`);
    return data;
  },
};
