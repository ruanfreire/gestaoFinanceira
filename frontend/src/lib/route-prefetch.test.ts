import { describe, expect, it, beforeEach, vi } from "vitest";
import { ROUTES } from "@/lib/constants";
import { prefetchRoute, resolvePrefetchPath, resetPrefetchCache } from "./route-prefetch";

vi.mock("@/lib/lazy-routes", () => ({
  lazyRoutes: {
    home: vi.fn(() => Promise.resolve({})),
    notas: vi.fn(() => Promise.resolve({})),
    recebimentos: vi.fn(() => Promise.resolve({})),
    analisesSituacao: vi.fn(() => Promise.resolve({})),
    arquivosHistorico: vi.fn(() => Promise.resolve({})),
  },
}));

describe("route-prefetch", () => {
  beforeEach(() => {
    resetPrefetchCache();
    vi.clearAllMocks();
  });

  it("resolve prefixos de rota", () => {
    expect(resolvePrefetchPath("/notas/nova")).toBe(ROUTES.financeiroNotas);
    expect(resolvePrefetchPath("/recebimentos/sem-correspondencia")).toBe(ROUTES.financeiroConfirmar);
    expect(resolvePrefetchPath("/analises/fluxo-caixa")).toBe(ROUTES.relatoriosSituacao);
    expect(resolvePrefetchPath("/financeiro/confirmar")).toBe(ROUTES.financeiroConfirmar);
  });

  it("prefetch só dispara uma vez por rota", async () => {
    const { lazyRoutes } = await import("@/lib/lazy-routes");
    prefetchRoute(ROUTES.home);
    prefetchRoute(ROUTES.home);
    expect(lazyRoutes.home).toHaveBeenCalledTimes(1);
  });
});
