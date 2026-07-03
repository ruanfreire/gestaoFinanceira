import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

function loadEnv() {
  const envPath = resolve(process.cwd(), "backend/.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function login(page, baseURL, email, password) {
  await page.goto(`${baseURL}/auth/entrar`, { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.getByRole("textbox", { name: "Senha" }).fill(password);
  const loginResponse = page.waitForResponse((res) => res.url().includes("/api/auth/login"), { timeout: 30_000 });
  await page.getByRole("button", { name: "Entrar" }).click();
  const res = await loginResponse;
  const body = await res.json().catch(() => null);
  if (!res.ok() || !body?.ok) throw new Error(body?.message || `Login falhou (${res.status()})`);
  await page.waitForURL((url) => !url.pathname.includes("/auth/entrar"), { timeout: 20_000 });
}

async function main() {
  loadEnv();
  const email = process.env.SMOKE_EMAIL || process.env.TEST_LOGIN || process.env.USERTESTE;
  const password = process.env.SMOKE_PW || process.env.TEST_SENHA || process.env.PW;
  if (!email || !password) throw new Error("Defina credenciais (SMOKE_EMAIL/SMOKE_PW ou TEST_LOGIN/TEST_SENHA)");

  const baseURL = process.env.CRAWL_BASE_URL || "https://financeiro.seumovimento.com.br";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const jobResponses = [];
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/relatorios/fluxo-caixa/jobs")) {
      jobResponses.push({ url, status: res.status(), method: res.request().method() });
    }
  });

  console.log(`Login ${email} em ${baseURL}`);
  await login(page, baseURL, email, password);

  const parts = new URL(page.url()).pathname.split("/").filter(Boolean);
  const orgSlug = parts[0];
  const fluxoPath = `/${orgSlug}/analises/fluxo-caixa`;
  console.log(`Abrindo ${fluxoPath}`);
  await page.goto(`${baseURL}${fluxoPath}`, { waitUntil: "networkidle" });

  const mes = process.env.SMOKE_MES_PAGAMENTO;
  if (mes) {
    const monthInput = page.locator('input[type="month"]').first();
    if (await monthInput.isVisible().catch(() => false)) {
      await monthInput.fill(mes);
    }
  }

  await page.getByRole("button", { name: /continuar/i }).first().click();
  await page.getByRole("button", { name: /continuar/i }).first().click();

  const downloadPromise = page.waitForEvent("download", { timeout: 180_000 }).catch(() => null);
  await page.getByRole("button", { name: /baixar excel|preparando/i }).click();

  await page.getByText(/preparando relatório|gerando relatório|na fila/i).waitFor({ timeout: 15_000 }).catch(() => {});

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const preparing = await page.getByText(/preparando|gerando|na fila/i).isVisible().catch(() => false);
    const download = await downloadPromise;
    if (download) {
      const path = await download.path();
      console.log("DOWNLOAD_OK", download.suggestedFilename(), path);
      await browser.close();
      console.log("JOB_API", jobResponses);
      return;
    }
    if (!preparing) break;
    await page.waitForTimeout(2000);
  }

  await browser.close();
  console.error("JOB_API", jobResponses);
  throw new Error("Exportação via UI não concluiu download no tempo esperado");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
