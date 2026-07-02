import { describe, expect, it } from "vitest";
import { resolvePageTitle, formatDocumentTitle } from "./page-titles";
import { ROUTES } from "./constants";

describe("page-titles", () => {
  it("resolve títulos por rota", () => {
    expect(resolvePageTitle(ROUTES.home)).toBe("Início");
    expect(resolvePageTitle(ROUTES.notas)).toBe("Minhas notas");
    expect(resolvePageTitle("/empresa-demo")).toBe("Início");
    expect(resolvePageTitle("/unknown-page/extra")).toBe("Gestão Financeira");
  });

  it("formata document.title", () => {
    expect(formatDocumentTitle("Início")).toBe("Início · Gestão Financeira");
    expect(formatDocumentTitle("Gestão Financeira")).toBe("Gestão Financeira");
  });
});
