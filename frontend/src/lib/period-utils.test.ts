import { describe, expect, it } from "vitest";
import { previousPeriodFilter, percentChange, isToday } from "./period-utils";

describe("previousPeriodFilter", () => {
  it("shifts month mode to previous month", () => {
    const result = previousPeriodFilter({
      filterMode: "mes",
      mesPagamento: "2026-03",
      from: "2026-03-01",
      to: "2026-03-31",
    });
    expect(result.mesPagamento).toBe("2026-02");
    expect(result.from).toBe("2026-02-01");
    expect(result.to).toBe("2026-02-28");
  });

  it("shifts custom period by same length", () => {
    const result = previousPeriodFilter({
      filterMode: "periodo",
      mesPagamento: "2026-03",
      from: "2026-03-10",
      to: "2026-03-20",
    });
    expect(result.from).toBe("2026-02-27");
    expect(result.to).toBe("2026-03-09");
  });
});

describe("percentChange", () => {
  it("calculates delta", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe("isToday", () => {
  it("matches current date prefix", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isToday(`${today}T12:00:00.000Z`)).toBe(true);
    expect(isToday("2020-01-01")).toBe(false);
  });
});
