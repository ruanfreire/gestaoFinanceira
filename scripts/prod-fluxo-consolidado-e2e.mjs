#!/usr/bin/env node
/**
 * E2E Chromium: export consolidado de fluxo de caixa + validação do Excel.
 * Uso: node scripts/prod-fluxo-consolidado-e2e.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const envPath = join(ROOT, "backend/.env");
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
  const loginResponse = page.waitForResponse((res) => res.url().includes("/api/auth/login"), {
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Entrar" }).click();
  const res = await loginResponse;
  const body = await res.json().catch(() => null);
  if (!res.ok() || !body?.ok) throw new Error(body?.message || `Login falhou (${res.status()})`);
  await page.waitForURL((url) => !url.pathname.includes("/auth/entrar"), { timeout: 20_000 });
}

function parseAnalysis(stdout) {
  const sheets = [];
  let current = null;
  for (const line of stdout.split("\n")) {
    if (line.startsWith("=== ") && line.endsWith(" ===")) {
      if (current) sheets.push(current);
      current = { name: line.slice(4, -4), lines: [] };
      continue;
    }
    if (!current) continue;
    current.lines.push(line);
    const linhas = line.match(/^Linhas:\s*(\d+)/);
    if (linhas) current.rowCount = Number(linhas[1]);
    const entradas = line.match(/Entradas:\s*(\d+)/);
    if (entradas) current.entradas = Number(entradas[1]);
    const saidas = line.match(/Saídas:\s*(\d+)/);
    if (saidas) current.saidas = Number(saidas[1]);
    const taxasErro = line.match(/Taxas como Entrada \(erro\):\s*(\d+)/);
    if (taxasErro) current.taxasEntrada = Number(taxasErro[1]);
    const nfs = line.match(/^NFs \(\d+\):\s*(.*)$/);
    if (nfs) current.nfs = nfs[1].trim();
  }
  if (current) sheets.push(current);
  return sheets.filter((s) => s.name !== "Lista");
}

async function main() {
  loadEnv();
  const email = process.env.SMOKE_EMAIL || process.env.USERTESTE;
  let password = process.env.SMOKE_PW;
  if (!password && process.env.PW) password = process.env.PW;
  if (!email || !password) throw new Error("Defina USERTESTE + PW (ou SMOKE_EMAIL + SMOKE_PW)");

  const baseURL = process.env.CRAWL_BASE_URL || "https://financeiro.seumovimento.com.br";
  const mesPagamento = process.env.SMOKE_MES_PAGAMENTO || "2026-06";
  const mesCompetenciaNf = process.env.SMOKE_MES_COMPETENCIA_NF || "2026-06";

  const outDir = join(ROOT, "tmp", "e2e-fluxo");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `fluxo-consolidado-${mesPagamento}-e2e.xlsx`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const jobResponses = [];
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/relatorios/fluxo-caixa/jobs")) {
      jobResponses.push({ url, status: res.status(), method: res.request().method() });
    }
  });

  console.log(`Login ${email} → ${baseURL}`);
  await login(page, baseURL, email, password);

  const orgSlug = new URL(page.url()).pathname.split("/").filter(Boolean)[0];
  await page.goto(`${baseURL}/${orgSlug}/analises/fluxo-caixa`, { waitUntil: "networkidle" });

  const monthInputs = page.locator('input[type="month"]');
  await monthInputs.nth(0).fill(mesPagamento);
  const competencia = page.locator("#mesCompetenciaNf");
  if (await competencia.isVisible().catch(() => false)) {
    await competencia.fill(mesCompetenciaNf);
  }

  await page.getByRole("button", { name: /continuar/i }).first().click();

  const consolidado = page.getByRole("button", { name: /consolidado/i }).first();
  if (await consolidado.isVisible().catch(() => false)) {
    await consolidado.click();
  }
  await page.getByRole("button", { name: /continuar/i }).first().click();

  const downloadPromise = page.waitForEvent("download", { timeout: 180_000 });
  await page.getByRole("button", { name: /baixar excel|preparando/i }).click();
  await page.getByText(/preparando relatório|gerando relatório|na fila/i).waitFor({ timeout: 20_000 }).catch(() => {});

  let download;
  try {
    download = await downloadPromise;
  } catch {
    const errText = await page.locator("body").innerText().catch(() => "");
    await browser.close();
    console.error("JOB_API", JSON.stringify(jobResponses, null, 2));
    throw new Error(`Download não concluído. UI: ${errText.slice(0, 300)}`);
  }

  const suggested = download.suggestedFilename();
  await download.saveAs(outFile);
  await browser.close();
  console.log("DOWNLOAD_OK", suggested, outFile);
  console.log("JOB_API", JSON.stringify(jobResponses, null, 2));

  const analyze = spawnSync("node", [join(ROOT, "backend/scripts/analyze-fluxo-xlsx.mjs"), outFile], {
    encoding: "utf8",
    cwd: ROOT,
  });
  if (analyze.stdout) console.log(analyze.stdout);
  if (analyze.status !== 0) {
    console.error(analyze.stderr);
    throw new Error("Falha na análise do Excel");
  }

  const sheets = parseAnalysis(analyze.stdout);
  const report = {
    file: outFile,
    sheets: sheets.map((s) => ({
      name: s.name,
      rows: s.rowCount ?? 0,
      entradas: s.entradas ?? 0,
      saidas: s.saidas ?? 0,
      taxasComoEntrada: s.taxasEntrada ?? 0,
      nfs: s.nfs ?? "",
    })),
  };
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log("\n=== VALIDAÇÃO ===");
  console.log(JSON.stringify(report, null, 2));

  const errors = [];
  const fluxoSheets = report.sheets.filter((s) => s.name.toLowerCase().includes("fluxo de caixa"));
  if (fluxoSheets.length === 0) errors.push("Nenhuma aba de fluxo de caixa gerada");

  for (const sheet of fluxoSheets) {
    if (sheet.rows === 0) errors.push(`Aba vazia: ${sheet.name}`);
    if (sheet.taxasComoEntrada > 0) errors.push(`Taxas como entrada em ${sheet.name}`);
    if (/\(2\)|\(3\)/.test(sheet.name)) errors.push(`Aba duplicada suspeita: ${sheet.name}`);
  }

  const asaas = fluxoSheets.find((s) => s.name.toLowerCase().includes("asaas"));
  if (!asaas) errors.push("Aba ASAAS ausente no consolidado");
  else if (asaas.entradas < 20) errors.push(`Poucas entradas ASAAS: ${asaas.entradas}`);

  const emptyDuplicates = fluxoSheets.filter((s) => s.rows === 0);
  if (emptyDuplicates.length) errors.push(`Abas vazias: ${emptyDuplicates.map((s) => s.name).join(", ")}`);

  if (errors.length) {
    console.error("\nFALHAS:", errors.join("; "));
    process.exit(1);
  }

  console.log("\nOK: consolidado válido —", fluxoSheets.length, "aba(s) com dados");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
