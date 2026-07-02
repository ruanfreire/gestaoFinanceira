import { expect, type Page } from "@playwright/test";

export const E2E_USER = {
  email: "admin@finance.local",
  password: "e2e-test-pass",
};

export async function login(page: Page) {
  await page.goto("/auth/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill(E2E_USER.email);
  await page.getByRole("textbox", { name: "Senha" }).fill(E2E_USER.password);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes("/api/auth/login") && res.status() === 200,
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  await loginResponse;

  await expect(page).toHaveURL("/", { timeout: 15_000 });
  await page.waitForFunction(() => Boolean(localStorage.getItem("accessToken")));
  await expect(page.getByRole("heading", { name: "Início", level: 1 })).toBeVisible({ timeout: 15_000 });
}
