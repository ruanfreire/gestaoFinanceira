import { defineConfig, devices } from "@playwright/test";

/** Testes contra `npm run dev` já em execução (frontend :5174, backend :4000). */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "superadmin.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5174",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
});
