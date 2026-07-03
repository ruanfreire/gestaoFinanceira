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
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const CLIENT_ROUTES = [
  "/",
  "/notas",
  "/notas/nova",
  "/recebimentos",
  "/recebimentos/sem-correspondencia",
  "/arquivos/notas",
  "/arquivos/importar-banco",
  "/arquivos/historico",
  "/analises/situacao",
  "/analises/fluxo-caixa",
  "/configuracoes",
  "/configuracoes/plano",
  "/configuracoes/equipe",
  "/configuracoes/perfil",
  "/configuracoes/importacao-ia",
  "/configuracoes/integracoes",
  "/configuracoes/integracoes/honest",
];

async function dismissOverlays(page) {
  const agoraNao = page.getByRole("button", { name: /agora não/i });
  if (await agoraNao.isVisible().catch(() => false)) {
    await agoraNao.click();
  }
  const entendi = page.getByRole("button", { name: /^entendi$/i });
  if (await entendi.isVisible().catch(() => false)) {
    await entendi.click();
  }
}

async function login(page, baseURL, email, password) {
  await page.goto(`${baseURL}/auth/entrar`, { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.getByRole("textbox", { name: "Senha" }).fill(password);
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes("/api/auth/login"),
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  const res = await loginResponse;
  const body = await res.json().catch(() => null);
  if (!res.ok() || !body?.ok) {
    throw new Error(body?.message || `Login falhou (${res.status()})`);
  }
  await page.waitForURL((url) => !url.pathname.includes("/auth/entrar"), { timeout: 20_000 });
  await dismissOverlays(page);
}

function resolveOrgSlug(pageUrl) {
  const { pathname } = new URL(pageUrl);
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const slug = parts[0];
  if (slug === "auth" || slug === "superadmin" || slug === "convite") return null;
  return slug;
}

async function main() {
  loadEnv();
  const email = process.env.USERTESTE;
  const password = process.env.PW;
  if (!email || !password) {
    throw new Error("Defina USERTESTE e PW no backend/.env");
  }

  const baseURL = process.env.CRAWL_BASE_URL || "http://127.0.0.1:5174";
  const issues = [];
  const visited = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      issues.push({ kind: "console", route: visited[visited.length - 1] ?? "?", message: msg.text() });
    }
  });
  page.on("pageerror", (err) => {
    issues.push({ kind: "pageerror", route: visited[visited.length - 1] ?? "?", message: err.message });
  });
  page.on("response", (res) => {
    const url = res.url();
    if (!url.includes("/api/")) return;
    if (res.status() >= 400) {
      issues.push({
        kind: "api",
        route: visited[visited.length - 1] ?? "?",
        message: `${res.status()} ${res.request().method()} ${url}`,
      });
    }
  });

  console.log(`Login em ${baseURL} como ${email}`);
  await login(page, baseURL, email, password);

  const orgSlug = resolveOrgSlug(page.url());
  if (!orgSlug) {
    throw new Error(`Não foi possível detectar slug da organização após login (${page.url()})`);
  }
  console.log(`Organização: ${orgSlug}`);

  for (const route of CLIENT_ROUTES) {
    const path = `/${orgSlug}${route === "/" ? "" : route}`;
    visited.push(path);
    console.log(`→ ${path}`);
    await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle", timeout: 45_000 });
    await dismissOverlays(page);
    await page.waitForTimeout(400);
  }

  await browser.close();

  const unique = new Map();
  for (const issue of issues) {
    unique.set(`${issue.kind}|${issue.route}|${issue.message}`, issue);
  }
  const list = [...unique.values()];

  console.log("\n========== RELATÓRIO CRAWL ==========");
  console.log(`Rotas visitadas: ${visited.length}`);
  console.log(`Problemas: ${list.length}`);
  for (const issue of list) {
    console.log(`[${issue.kind}] ${issue.route}\n  ${issue.message}`);
  }

  if (list.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
