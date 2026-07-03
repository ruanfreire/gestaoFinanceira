import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tomadoresApi } from "./api";
import type { CreateTomadorPayload, UpdateTomadorPayload } from "./types";

export const tomadoresQueryKey = (params?: { page?: number; q?: string }) =>
  ["tomadores", params ?? {}] as const;

export function useTomadoresQuery(params?: { page?: number; limit?: number; q?: string }, enabled = true) {
  return useQuery({
    queryKey: tomadoresQueryKey(params),
    queryFn: () => tomadoresApi.list(params),
    enabled,
  });
}

export function useCreateTomadorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTomadorPayload) => tomadoresApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tomadores"] });
    },
  });
}

export function useUpdateTomadorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTomadorPayload }) =>
      tomadoresApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tomadores"] });
    },
  });
}

export function useDeleteTomadorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tomadoresApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tomadores"] });
    },
  });
}

export function useImportarTomadoresMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tomadoresApi.importarDeNotas(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tomadores"] });
    },
  });
}
