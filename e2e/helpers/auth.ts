import { expect, type Page } from "@playwright/test";
import { E2E_TENANT_USERS } from "./api";

export const E2E_USER = {
  email: E2E_TENANT_USERS.demo.email,
  password: E2E_TENANT_USERS.demo.password,
};

type LoginCredentials = {
  email: string;
  password: string;
  slug?: string;
};

export async function loginAs(page: Page, credentials: LoginCredentials) {
  await page.goto("/auth/entrar");
  await page.getByRole("textbox", { name: "E-mail" }).fill(credentials.email);
  await page.getByRole("textbox", { name: "Senha" }).fill(credentials.password);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes("/api/auth/login") && res.status() === 200,
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  await loginResponse;

  const slugPattern = credentials.slug
    ? new RegExp(`\\/${credentials.slug}\\/?$`)
    : /\/(empresa-demo|[a-z0-9-]+)\/?$/;
  await expect(page).toHaveURL(slugPattern, { timeout: 15_000 });
  await page.waitForFunction(() => Boolean(localStorage.getItem("accessToken")));
  await expect(page.getByRole("heading", { name: "Início", level: 1 })).toBeVisible({ timeout: 15_000 });
}

export async function login(page: Page) {
  await loginAs(page, { ...E2E_USER, slug: E2E_TENANT_USERS.demo.slug });
}
