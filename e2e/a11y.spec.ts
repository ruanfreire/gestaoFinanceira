import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./helpers/auth";

const BLOCKING_IMPACTS = new Set(["critical", "serious"]);

function formatViolations(violations: { id: string; impact?: string; description: string; nodes: unknown[] }[]) {
  return violations.map((v) => `${v.id} (${v.impact}): ${v.description} — ${v.nodes.length} nó(s)`).join("\n");
}

test.describe("WCAG — axe-core", () => {
  test("login sem violações críticas ou sérias", async ({ page }) => {
    await page.goto("/auth/entrar");
    await expect(page.getByRole("heading", { name: "Fecho", level: 2 })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ""));
    expect(blocking, formatViolations(blocking)).toEqual([]);
  });

  test.describe("autenticado", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("início sem violações críticas ou sérias", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Início", level: 1 })).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ""));
      expect(blocking, formatViolations(blocking)).toEqual([]);
    });

    test("minhas notas sem violações críticas ou sérias", async ({ page }) => {
      await page.goto("/notas");
      await expect(page.getByRole("heading", { name: /minhas notas/i, level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ""));
      expect(blocking, formatViolations(blocking)).toEqual([]);
    });
  });
});
