export type HonestEmpresaOption = {
  id: number;
  nome: string;
  cpfcnpj?: string;
};

export type HonestDiscoveredEndpoint = {
  id: string;
  url: string;
  method: string;
  label: string;
  nota_count: number;
  score: number;
  captured_at: string;
  source: "scan" | "browse" | "manual";
  confirmed?: boolean;
};

export type IntegrationCatalogItem = {
  key: string;
  name: string;
  description: string;
  configured: boolean;
  enabled: boolean;
  auto_sync_enabled?: boolean;
  last_sync_at?: string;
  last_sync_status?: "success" | "failed" | "running" | null;
};

export type HonestIntegration = {
  provider: "honest";
  name: string;
  description: string;
  enabled: boolean;
  emissao_nf_habilitada?: boolean;
  sync_ready?: boolean;
  auto_sync_enabled: boolean;
  api_login?: string;
  api_base_url?: string;
  has_credentials: boolean;
  is_connected: boolean;
  discovery_active: boolean;
  discovery_token?: string;
  browse_path?: string;
  empresa_id?: number;
  empresa_cnpj?: string;
  empresa_nome?: string;
  org_profile_ready?: boolean;
  honest_empresa_resolved?: boolean;
  honest_empresas_disponiveis?: HonestEmpresaOption[];
  graphql_url?: string;
  graphql_verified?: boolean;
  graphql_nota_count?: number;
  graphql_verified_at?: string;
  graphql_verify_error?: string;
  discovered_endpoints: HonestDiscoveredEndpoint[];
  selected_endpoint_id?: string;
  sync_interval_minutes: number;
  last_sync_at?: string;
  last_sync_status?: "success" | "failed" | "running" | null;
  last_sync_error?: string;
  last_sync_trigger?: "manual" | "worker" | null;
  last_sync_stats?: {
    imported: number;
    ignored: number;
    total_faturas: number;
    vinculadas?: number;
    urls_ok: number;
    urls_failed: number;
    importacao_id?: string;
  };
};

export type UpdateHonestIntegrationPayload = {
  enabled?: boolean;
  emissao_nf_habilitada?: boolean;
  auto_sync_enabled?: boolean;
  api_login?: string;
  api_password?: string;
  api_base_url?: string;
  sync_interval_minutes?: number;
};

export type HonestConnectPayload = {
  api_login: string;
  api_password: string;
  api_base_url: string;
};
