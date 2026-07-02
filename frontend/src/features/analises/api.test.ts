import { describe, expect, it, beforeEach } from "vitest";
import { buildExtracaoCsvFilename } from "./api";

describe("buildExtracaoCsvFilename", () => {
  it("usa mês de pagamento no nome", () => {
    const name = buildExtracaoCsvFilename({
      filterMode: "mes",
      mesPagamento: "2026-06",
      from: "",
      to: "",
    });
    expect(name).toContain("2026-06");
    expect(name).toMatch(/^situacao-notas-/);
  });

  it("usa intervalo no nome", () => {
    const name = buildExtracaoCsvFilename({
      filterMode: "intervalo",
      mesPagamento: "",
      from: "2026-01-01",
      to: "2026-06-30",
    });
    expect(name).toContain("2026-01-01-a-2026-06-30");
  });
});
