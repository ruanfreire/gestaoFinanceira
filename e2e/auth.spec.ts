import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Autenticação", () => {
  test("exibe erro com credenciais inválidas", async ({ page }) => {
    await page.goto("/auth/entrar");
    await page.getByRole("textbox", { name: "E-mail" }).fill("admin@finance.local");
    await page.getByRole("textbox", { name: "Senha" }).fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toContainText(/não foi possível entrar/i);
  });

  test("login redireciona para o início", async ({ page }) => {
    await login(page);
    await expect(page).toHaveTitle(/Início/);
  });
});
