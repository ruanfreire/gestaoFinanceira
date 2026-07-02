import { describe, expect, it } from "vitest";
import { resolvePageTitle, formatDocumentTitle } from "./page-titles";
import { ROUTES } from "./constants";

import { APP_NAME } from "./brand";

describe("page-titles", () => {
  it("resolve títulos por rota", () => {
    expect(resolvePageTitle(ROUTES.home)).toBe("Início");
    expect(resolvePageTitle(ROUTES.notas)).toBe("Minhas notas");
    expect(resolvePageTitle("/empresa-demo")).toBe("Início");
    expect(resolvePageTitle("/unknown-page/extra")).toBe(APP_NAME);
  });

  it("formata document.title", () => {
    expect(formatDocumentTitle("Início")).toBe(`Início · ${APP_NAME}`);
    expect(formatDocumentTitle(APP_NAME)).toBe(APP_NAME);
  });
});
