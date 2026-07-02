import { describe, expect, it } from "vitest";
import { validatePeriodFilter } from "@/design-system/molecules";

describe("validatePeriodFilter", () => {
  it("aceita filtro por mês", () => {
    expect(
      validatePeriodFilter({
        filterMode: "mes",
        mesPagamento: "2026-07",
        from: "",
        to: "",
      }),
    ).toBeNull();
  });

  it("rejeita período sem datas", () => {
    expect(
      validatePeriodFilter({
        filterMode: "periodo",
        mesPagamento: "",
        from: "",
        to: "",
      }),
    ).toBeTruthy();
  });
});
