const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const apiPort = process.env.E2E_API_PORT || "4001";
const webPort = process.env.E2E_WEB_PORT || "4173";
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/finance_e2e";

const children = [];

function start(name, command, args, options) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    ...options,
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[e2e] ${name} encerrou com código ${code}`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("backend", "node", ["backend/dist/main.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: apiPort,
    MONGO_URI: mongoUri,
    NODE_ENV: "test",
    SEED_ADMIN_PASSWORD: "e2e-test-pass",
    SEED_SUPERADMIN_EMAIL: "admin@fecho.local",
    SEED_SUPERADMIN_PASSWORD: "e2e-test-pass",
    JWT_ACCESS_SECRET: "e2e-access-secret",
    JWT_REFRESH_SECRET: "e2e-refresh-secret",
  },
});

start("frontend", "npm", ["run", "preview", "--", "--port", webPort, "--strictPort", "--host", "127.0.0.1"], {
  cwd: path.join(root, "frontend"),
  env: {
    ...process.env,
    E2E_API_PROXY: `http://127.0.0.1:${apiPort}`,
  },
});
