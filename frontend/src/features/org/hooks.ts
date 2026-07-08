import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "./api";
import type { TenantRole } from "@/features/auth/types";

export function useOrgMembers(enabled = true) {
  return useQuery({
    queryKey: ["org", "members"],
    queryFn: () => orgApi.listMembers(),
    enabled,
  });
}

export function useOrgInvites(enabled = true) {
  return useQuery({
    queryKey: ["org", "invites"],
    queryFn: () => orgApi.listInvites(),
    enabled,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; tenantRole?: TenantRole }) => orgApi.createInvite(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "invites"] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orgApi.revokeInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "invites"] });
    },
  });
}

export function useRegenerateInviteLink() {
  return useMutation({
    mutationFn: (id: string) => orgApi.regenerateInviteLink(id),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orgApi.removeMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "members"] });
    },
  });
}

export function useOrgProfile(enabled = true) {
  return useQuery({
    queryKey: ["org", "profile"],
    queryFn: () => orgApi.getProfile(),
    enabled,
  });
}

export function useUpdateOrgProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; cnpj?: string; phone?: string }) => orgApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["integrations", "honest"] });
    },
  });
}

export function useOrgEmissaoConfig(enabled = true) {
  return useQuery({
    queryKey: ["org", "emissao"],
    queryFn: () => orgApi.getEmissaoConfig(),
    enabled,
  });
}

export function useUpdateOrgEmissaoConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { emissao_nf_habilitada?: boolean; prefeitura_codigo?: string | null }) =>
      orgApi.updateEmissaoConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", "emissao"] });
    },
  });
}
