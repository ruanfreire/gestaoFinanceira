import api from "@/lib/api-client";
import type {
  HonestConnectPayload,
  HonestIntegration,
  IntegrationCatalogItem,
  UpdateHonestIntegrationPayload,
} from "./types";

export const integrationsApi = {
  list: async () => {
    const { data } = await api.get<{ items: IntegrationCatalogItem[] }>("/integrations");
    return data.items;
  },

  getHonest: async () => {
    const { data } = await api.get<HonestIntegration>("/integrations/honest");
    return data;
  },

  connectHonest: async (payload: HonestConnectPayload) => {
    const { data } = await api.post<HonestIntegration>("/integrations/honest/connect", payload);
    return data;
  },

  updateHonest: async (payload: UpdateHonestIntegrationPayload) => {
    const { data } = await api.patch<HonestIntegration>("/integrations/honest", payload);
    return data;
  },

  startHonestDiscovery: async () => {
    const { data } = await api.post<HonestIntegration>("/integrations/honest/discover/start");
    return data;
  },

  stopHonestDiscovery: async () => {
    const { data } = await api.post<HonestIntegration>("/integrations/honest/discover/stop");
    return data;
  },

  scanHonestDiscovery: async () => {
    const { data } = await api.post<HonestIntegration>("/integrations/honest/discover/scan");
    return data;
  },

  confirmHonestEndpoint: async (endpointId: string) => {
    const { data } = await api.post<HonestIntegration>("/integrations/honest/discover/confirm", {
      endpoint_id: endpointId,
    });
    return data;
  },

  discoverHonestEmpresa: async () => {
    const { data } = await api.post<HonestIntegration>("/integrations/honest/discover/empresa");
    return data;
  },

  verifyHonestGraphql: async () => {
    const { data } = await api.post<HonestIntegration>("/integrations/honest/verify/graphql");
    return data;
  },

  selectHonestEmpresa: async (empresaId: number) => {
    const { data } = await api.post<HonestIntegration>("/integrations/honest/select-empresa", {
      empresa_id: String(empresaId),
    });
    return data;
  },

  fetchHonestBrowseHtml: async (path: string, token: string) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const { data } = await api.get<string>(`/integrations/honest/browse${normalized === "/" ? "" : normalized}`, {
      params: { token },
      responseType: "text",
      transformResponse: [(value) => value],
    });
    return data;
  },

  syncHonest: async () => {
    const { data } = await api.post<HonestIntegration & { ok: boolean }>("/integrations/honest/sync");
    return data;
  },
};
