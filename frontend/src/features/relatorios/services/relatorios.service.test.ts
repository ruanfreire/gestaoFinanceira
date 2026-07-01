import { describe, expect, it, vi, beforeEach } from "vitest";
import api from "@/shared/services/api.client";
import {
  buildExtracaoCsvFilename,
  buildFluxoCaixaFilename,
  relatoriosService,
} from "./relatorios.service";

vi.mock("@/shared/services/api.client", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("@/utils/download.util", () => ({
  downloadApiFile: vi.fn(),
}));

describe("relatorios.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("monta nome do CSV por mês de pagamento", () => {
    const name = buildExtracaoCsvFilename({
      filterMode: "mes",
      mesPagamento: "2024-05",
      from: "",
      to: "",
      statusPagamento: "",
    });
    expect(name).toMatch(/^extracao-notas-pagamento-2024-05-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("monta nome do Excel por período de pagamento", () => {
    const name = buildFluxoCaixaFilename({
      banco: "nubank",
      filterMode: "periodo",
      mesPagamento: "",
      from: "2024-01-01",
      to: "2024-01-31",
      empresaNome: "",
      empresaCnpj: "",
      contaCorrente: "",
      saldoInicial: "0",
    });
    expect(name).toContain("fluxo-caixa-nubank-2024-01-01-a-2024-01-31");
  });

  it("busca extração de notas com params de mês de pagamento", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], total: 0, totais: { valor_nf: 0, valor_pago: 0, saldo_aberto: 0 } },
    });

    await relatoriosService.getExtracaoNotas({
      filterMode: "mes",
      mesPagamento: "2024-06",
      from: "",
      to: "",
      statusPagamento: "pago",
    });

    expect(api.get).toHaveBeenCalledWith("/notas/extracao", {
      params: {
        mes_pagamento: "2024-06",
        status_pagamento: "pago",
      },
    });
  });
});
