import { test, expect } from "@playwright/test";
import { clearAuthSession, loginAsSuperadmin } from "./helpers/superadmin";

test.describe("Superadmin", () => {
  test("login redireciona para /superadmin sem erros de console", async ({ page }) => {
    const { consoleErrors, pageErrors } = await loginAsSuperadmin(page);

    await expect(page.getByRole("navigation", { name: "SuperAdmin" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "SuperAdmin" }).getByRole("link", { name: "Painel" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "SuperAdmin" }).getByRole("link", { name: "Clientes" })).toBeVisible();

    const ignored = [/favicon/i, /manifest/i, /service.?worker/i, /workbox/i];
    const criticalConsole = consoleErrors.filter((e) => !ignored.some((r) => r.test(e)));
    const criticalPage = pageErrors.filter((e) => !ignored.some((r) => r.test(e)));

    expect(criticalPage, `pageerror: ${criticalPage.join(" | ")}`).toEqual([]);
    expect(criticalConsole, `console.error: ${criticalConsole.join(" | ")}`).toEqual([]);
  });

  test("navega para lista de clientes", async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.getByRole("navigation", { name: "SuperAdmin" }).getByRole("link", { name: "Clientes" }).click();
    await expect(page).toHaveURL(/\/superadmin\/clients/);
    await expect(page.getByRole("heading", { name: /clientes/i })).toBeVisible({ timeout: 15_000 });
  });

  test("acesso direto a /superadmin pede login", async ({ page }) => {
    await clearAuthSession(page);
    await page.goto("/superadmin", { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/auth\/entrar/, { timeout: 15_000 });
    await expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible();
  });

  test("superadmin.html redireciona para rota limpa", async ({ page }) => {
    await clearAuthSession(page);
    await page.goto("/superadmin.html", { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/(superadmin|auth\/entrar)/, { timeout: 15_000 });
    expect(page.url()).not.toContain(".html");
  });
});
