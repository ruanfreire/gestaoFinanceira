import { describe, expect, it } from "vitest";
import { buildCsv } from "./download";

describe("buildCsv", () => {
  it("escapa células com vírgula", () => {
    const csv = buildCsv([["Nome", "Valor"], ["Empresa, LTDA", "1.234,56"]]);
    expect(csv).toContain('"Empresa, LTDA"');
  });

  it("inclui BOM para Excel", () => {
    const csv = buildCsv([["a"]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
});
