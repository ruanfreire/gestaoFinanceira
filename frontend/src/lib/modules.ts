import { ROUTES } from "@/lib/constants";

export const MODULE_KEYS = [
  "finance",
  "fiscal_emissao",
  "integrations_honest",
  "document_core",
  "logistics_frete",
  "fiscal_cte",
  "tms",
  "wms",
  "erp",
  "health_tiss",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleStatus = "production" | "beta" | "disabled";

export const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  [ROUTES.documentos]: "document_core",
  [ROUTES.operacoesConfirmar]: "logistics_frete",
  [ROUTES.operacoesConfirmarSem]: "logistics_frete",
  "/configuracoes/integracoes/honest": "integrations_honest",
  "/configuracoes/emissao-nf": "fiscal_emissao",
};

export function routeRequiresModule(path: string): ModuleKey | null {
  if (path.startsWith("/operacoes")) return "logistics_frete";
  if (path.startsWith("/documentos")) return "document_core";
  if (path.startsWith("/configuracoes/integracoes/honest")) return "integrations_honest";
  if (path.startsWith("/configuracoes/emissao-nf")) return "fiscal_emissao";
  return ROUTE_MODULE_MAP[path] ?? null;
}

export function hasModule(enabled: string[] | undefined, moduleKey: ModuleKey): boolean {
  return (enabled ?? ["finance"]).includes(moduleKey);
}
