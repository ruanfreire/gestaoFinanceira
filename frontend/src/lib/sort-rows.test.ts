import { describe, expect, it } from "vitest";
import { nextSortDirection, sortRows } from "./sort-rows";

describe("sortRows", () => {
  it("ordena strings em pt-BR", () => {
    const rows = [{ name: "Zeta" }, { name: "Ana" }, { name: "Beta" }];
    const sorted = sortRows(rows, (r) => r.name, "asc");
    expect(sorted.map((r) => r.name)).toEqual(["Ana", "Beta", "Zeta"]);
  });

  it("ordena números desc", () => {
    const rows = [{ v: 10 }, { v: 2 }, { v: 30 }];
    const sorted = sortRows(rows, (r) => r.v, "desc");
    expect(sorted.map((r) => r.v)).toEqual([30, 10, 2]);
  });
});

describe("nextSortDirection", () => {
  it("alterna asc e desc", () => {
    expect(nextSortDirection("asc")).toBe("desc");
    expect(nextSortDirection("desc")).toBe("asc");
  });
});
