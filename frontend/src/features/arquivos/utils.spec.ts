import { describe, expect, it } from "vitest";
import { detectJsonInconsistencies } from "./utils";
import type { FaturaPreview } from "./types";

describe("detectJsonInconsistencies", () => {
  it("detecta campos ausentes e duplicatas", () => {
    const faturas: FaturaPreview[] = [
      { numero: "100", tomador: "Cliente A", valor: 100 },
      { numero: "100", tomador: "Cliente B", valor: 200 },
      { tomador: "Sem número", valor: undefined },
      { numero: "200", valor: 50, status_emissao: "CANCELADA" },
    ];

    const issues = detectJsonInconsistencies(faturas);

    expect(issues.some((i) => i.type === "duplicate_numero")).toBe(true);
    expect(issues.some((i) => i.type === "missing_numero")).toBe(true);
    expect(issues.some((i) => i.type === "missing_valor")).toBe(true);
    expect(issues.some((i) => i.type === "missing_tomador")).toBe(true);
    expect(issues.some((i) => i.type === "cancelada")).toBe(true);
  });

  it("retorna vazio quando notas estão consistentes", () => {
    const faturas: FaturaPreview[] = [
      { numero: "1", tomador: "A", valor: 10 },
      { numero: "2", tomador: "B", valor: 20 },
    ];
    expect(detectJsonInconsistencies(faturas)).toEqual([]);
  });
});
