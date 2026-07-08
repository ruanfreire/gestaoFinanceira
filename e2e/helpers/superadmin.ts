import { expect, type Page } from "@playwright/test";

export const E2E_SUPERADMIN = {
  email: process.env.E2E_SUPERADMIN_EMAIL ?? "admin@fecho.local",
  password: process.env.E2E_SUPERADMIN_PASSWORD ?? "fechoadmin@2026",
};

export async function clearAuthSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("/auth/entrar");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

export async function loginAsSuperadmin(page: Page, credentials = E2E_SUPERADMIN) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  await page.goto("/auth/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill(credentials.email);
  await page.getByRole("textbox", { name: "Senha" }).fill(credentials.password);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes("/api/auth/login") && res.status() === 200,
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  await loginResponse;

  await expect(page).toHaveURL(/\/superadmin\/?$/, { timeout: 20_000 });
  await expect(page.getByText("SuperAdmin", { exact: true })).toBeVisible({ timeout: 15_000 });

  return { consoleErrors, pageErrors };
}
