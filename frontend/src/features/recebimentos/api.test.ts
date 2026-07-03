import { describe, expect, it } from "vitest";
import { itemKey, matchExplanation } from "./api";
import type { LancamentoConciliacaoItem } from "./types";

describe("itemKey", () => {
  it("combina source e id do lançamento", () => {
    const item = {
      source: "bank" as const,
      lancamento: { _id: "abc123" },
      candidatas: [],
    } satisfies LancamentoConciliacaoItem;
    expect(itemKey(item)).toBe("bank-abc123");
  });
});

describe("matchExplanation", () => {
  it("monta explicação com nome, valor e competência", () => {
    const text = matchExplanation({
      nameScore: 0.92,
      valueMatch: true,
      competenciaMatch: true,
      partialMatch: false,
      dateClose: true,
      daysDiff: null,
      totalScore: 0.95,
    });
    expect(text).toContain("Nome 92%");
    expect(text).toContain("Valor exato");
    expect(text).toContain("Competência");
  });

  it("retorna vazio sem match", () => {
    expect(matchExplanation(undefined)).toBe("");
  });
});
