import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const API_PORT = 4001;
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/finance_e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    ...devices["Desktop Chrome"],
  },
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "node scripts/e2e-servers.js",
    url: `http://127.0.0.1:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      E2E_API_PORT: String(API_PORT),
      E2E_WEB_PORT: String(PORT),
      MONGO_URI,
    },
  },
});
