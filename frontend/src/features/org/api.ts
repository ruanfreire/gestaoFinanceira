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

export type OrgProfile = {
  name: string;
  cnpj: string;
  phone: string;
  slug?: string;
};

export type OrgEmissaoConfig = {
  emissao_nf_habilitada: boolean;
  prefeitura_codigo: string | null;
  org_profile_ready: boolean;
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

  async regenerateInviteLink(id: string) {
    const { data } = await api.post<{ ok: boolean; inviteUrl: string }>(`/org/invites/${id}/link`);
    return data;
  },

  async removeMember(id: string) {
    const { data } = await api.delete<{ ok: boolean }>(`/org/members/${id}`);
    return data;
  },

  async getProfile() {
    const { data } = await api.get<OrgProfile>("/org/profile");
    return data;
  },

  async updateProfile(payload: { name?: string; cnpj?: string; phone?: string }) {
    const { data } = await api.patch<OrgProfile>("/org/profile", payload);
    return data;
  },

  async getEmissaoConfig() {
    const { data } = await api.get<OrgEmissaoConfig>("/org/emissao");
    return data;
  },

  async updateEmissaoConfig(payload: {
    emissao_nf_habilitada?: boolean;
    prefeitura_codigo?: string | null;
  }) {
    const { data } = await api.patch<OrgEmissaoConfig>("/org/emissao", payload);
    return data;
  },
};
