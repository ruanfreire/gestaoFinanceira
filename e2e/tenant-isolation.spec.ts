import { test, expect } from "@playwright/test";
import { apiLogin, E2E_TENANT_USERS } from "./helpers/api";
import { loginAs } from "./helpers/auth";

test.describe("Isolamento multi-tenant (Fase 2A.1)", () => {
  test("notas de um tenant não aparecem em outro (API)", async ({ request }) => {
    const demo = E2E_TENANT_USERS.demo;
    const acme = E2E_TENANT_USERS.acme;

    const demoToken = await apiLogin(request, demo.email, demo.password);
    const acmeToken = await apiLogin(request, acme.email, acme.password);

    const marker = `E2E-TenantIso-${Date.now()}`;
    const numero = `ISO-${Date.now()}`;

    const createRes = await request.post("http://127.0.0.1:4001/api/notas", {
      headers: { Authorization: `Bearer ${demoToken}` },
      data: {
        empresa: demo.empresa,
        numero,
        tomador: marker,
        valor: 150.5,
        data_emissao: new Date().toISOString(),
        status_emissao: "NORMAL",
        status_pagamento: "em_aberto",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { _id?: string };
    expect(created._id).toBeTruthy();

    const acmeSearch = await request.get(
      `http://127.0.0.1:4001/api/notas?q=${encodeURIComponent(marker)}`,
      { headers: { Authorization: `Bearer ${acmeToken}` } },
    );
    expect(acmeSearch.ok()).toBeTruthy();
    const acmeList = (await acmeSearch.json()) as { items?: unknown[]; total?: number };
    expect(acmeList.total ?? acmeList.items?.length ?? 0).toBe(0);

    const demoSearch = await request.get(
      `http://127.0.0.1:4001/api/notas?q=${encodeURIComponent(marker)}`,
      { headers: { Authorization: `Bearer ${demoToken}` } },
    );
    expect(demoSearch.ok()).toBeTruthy();
    const demoList = (await demoSearch.json()) as { items?: Array<{ _id?: string }>; total?: number };
    expect(demoList.total ?? demoList.items?.length ?? 0).toBeGreaterThan(0);
    expect(demoList.items?.[0]?._id).toBe(created._id);
  });

  test("login redireciona para slug correto de cada organização", async ({ page }) => {
    await loginAs(page, E2E_TENANT_USERS.demo);
    await expect(page).toHaveURL(/\/empresa-demo\/?$/);

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await loginAs(page, E2E_TENANT_USERS.acme);
    await expect(page).toHaveURL(/\/acme-consultoria\/?$/);
  });
});
