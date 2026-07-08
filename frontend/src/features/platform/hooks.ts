import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { platformApi } from "./api";
import type { UserStatus } from "@/features/auth/types";
import type { PlanId } from "@/features/billing/api";

export const platformKeys = {
  dashboard: ["platform", "dashboard"] as const,
  clients: (status?: UserStatus) => ["platform", "clients", status] as const,
  client: (id: string) => ["platform", "client", id] as const,
  clientModules: (id: string) => ["platform", "client", id, "modules"] as const,
  notifications: ["platform", "notifications"] as const,
  unread: ["platform", "notifications", "unread"] as const,
};

export function useSuperadminDashboard() {
  return useQuery({ queryKey: platformKeys.dashboard, queryFn: () => platformApi.getDashboard() });
}

export function useSuperadminClients(status?: UserStatus) {
  return useQuery({
    queryKey: platformKeys.clients(status),
    queryFn: () => platformApi.listClients(status),
  });
}

export function useSuperadminClient(id: string) {
  return useQuery({
    queryKey: platformKeys.client(id),
    queryFn: () => platformApi.getClient(id),
    enabled: Boolean(id),
  });
}

export function useSuperadminClientModules(id: string) {
  return useQuery({
    queryKey: platformKeys.clientModules(id),
    queryFn: () => platformApi.getClientModules(id),
    enabled: Boolean(id),
  });
}

export function useClientAction() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["platform"] });
  };
  return {
    approve: useMutation({ mutationFn: platformApi.approveClient, onSuccess: invalidate }),
    reject: useMutation({ mutationFn: ({ id, note }: { id: string; note?: string }) => platformApi.rejectClient(id, note), onSuccess: invalidate }),
    suspend: useMutation({ mutationFn: ({ id, note }: { id: string; note?: string }) => platformApi.suspendClient(id, note), onSuccess: invalidate }),
    setPlan: useMutation({
      mutationFn: ({ id, plan }: { id: string; plan: PlanId }) => platformApi.setClientPlan(id, plan),
      onSuccess: invalidate,
    }),
    toggleModule: useMutation({
      mutationFn: ({ id, key, enabled }: { id: string; key: string; enabled: boolean }) =>
        platformApi.toggleClientModule(id, key, enabled),
      onSuccess: (_data, variables) => {
        invalidate();
        qc.invalidateQueries({ queryKey: platformKeys.clientModules(variables.id) });
      },
    }),
  };
}

export function useNotifications() {
  return useQuery({
    queryKey: platformKeys.notifications,
    queryFn: () => platformApi.listNotifications(),
    refetchInterval: 30_000,
  });
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: platformKeys.unread,
    queryFn: () => platformApi.unreadCount(),
    refetchInterval: 30_000,
  });
}
