import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("API", () => {
  test("health responde ok", async ({ request }) => {
    const res = await request.get("http://127.0.0.1:4001/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.mongo).toBe("up");
    expect(["healthy", "degraded"]).toContain(body.status);
  });
});

test.describe("Smoke pós-login", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("navega para minhas notas", async ({ page }) => {
    await page.goto("/notas", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/notas/);
    await expect(page.getByRole("heading", { name: /minhas notas/i })).toBeVisible({ timeout: 15_000 });
  });

  test("navega para confirmar recebimentos", async ({ page }) => {
    await page.goto("/recebimentos", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/recebimentos/);
    await expect(page.getByRole("heading", { name: /confirmar recebimentos/i })).toBeVisible({
      timeout: 15_000,
    });
  });

});
