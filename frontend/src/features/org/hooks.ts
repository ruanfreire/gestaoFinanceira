import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "./api";
import type { TenantRole } from "@/features/auth/types";

export function useOrgMembers() {
  return useQuery({
    queryKey: ["org", "members"],
    queryFn: () => orgApi.listMembers(),
  });
}

export function useOrgInvites() {
  return useQuery({
    queryKey: ["org", "invites"],
    queryFn: () => orgApi.listInvites(),
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
