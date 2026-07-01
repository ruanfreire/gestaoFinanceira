import { describe, expect, it } from "vitest";
import {
  formatCompetencia,
  formatCurrency,
  formatDate,
  pagamentosResumo,
} from "./nota-format.util";

describe("nota-format.util", () => {
  it("formata moeda em BRL", () => {
    expect(formatCurrency(1234.5)).toMatch(/R\$\s*1\.234,50/);
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("formata data em pt-BR", () => {
    expect(formatDate("2024-03-15")).toMatch(/\d{2}\/\d{2}\/2024/);
    expect(formatDate(undefined)).toBe("—");
  });

  it("formata competência YYYY-MM", () => {
    expect(formatCompetencia("2024-06")).toBe("06/2024");
    expect(formatCompetencia(undefined)).toBe("—");
  });

  it("resume pagamentos vinculados", () => {
    expect(pagamentosResumo()).toBe("—");
    expect(
      pagamentosResumo([
        { source: "asaas", data: "2024-01-10", valor: 100 },
      ]),
    ).toContain("ASAAS");
  });
});
