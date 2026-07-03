import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationsApi } from "./api";
import type { HonestConnectPayload, UpdateHonestIntegrationPayload } from "./types";

export function useIntegrationsCatalog() {
  return useQuery({
    queryKey: ["integrations", "catalog"],
    queryFn: () => integrationsApi.list(),
  });
}

export function useHonestIntegration() {
  return useQuery({
    queryKey: ["integrations", "honest"],
    queryFn: () => integrationsApi.getHonest(),
  });
}

export function useConnectHonestIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: HonestConnectPayload) => integrationsApi.connectHonest(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useUpdateHonestIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateHonestIntegrationPayload) => integrationsApi.updateHonest(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useScanHonestDiscovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsApi.scanHonestDiscovery(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations", "honest"] }),
  });
}

export function useConfirmHonestEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) => integrationsApi.confirmHonestEndpoint(endpointId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useDiscoverHonestEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsApi.discoverHonestEmpresa(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useVerifyHonestGraphql() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsApi.verifyHonestGraphql(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useSelectHonestEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (empresaId: number) => integrationsApi.selectHonestEmpresa(empresaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useSyncHonestIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsApi.syncHonest(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["arquivos"] });
      qc.invalidateQueries({ queryKey: ["notas"] });
      qc.invalidateQueries({ queryKey: ["recebimentos"] });
    },
  });
}
