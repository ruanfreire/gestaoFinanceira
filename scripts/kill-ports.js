const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function getDefaultPorts() {
  const backendEnv = loadEnvFile(path.resolve(__dirname, '../backend/.env'));
  const backendPort = Number(process.env.PORT || backendEnv.PORT || 4000);
  const mongoUri = process.env.MONGO_URI || backendEnv.MONGO_URI || 'mongodb://localhost:27017/finance';
  const mongoMatch = mongoUri.match(/:(\d+)(?:\/|$)/);
  const mongoPort = mongoMatch ? Number(mongoMatch[1]) : 27017;

  return {
    backend: backendPort,
    frontend: [5173, 5174],
    mongo: mongoPort,
  };
}

function getPidsOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const output = execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
      );
      return [...new Set(output.split('\n').map((pid) => pid.trim()).filter(Boolean))];
    } catch {
      // fallback abaixo
    }

    try {
      const output = execSync('netstat -ano -p TCP', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const pids = new Set();
      for (const line of output.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5 || parts[3] !== 'LISTENING') continue;
        const localAddress = parts[1];
        const pid = parts[4];
        const match = localAddress.match(/:(\d+)$/);
        if (match && Number(match[1]) === port && pid && pid !== '0') {
          pids.add(pid);
        }
      }
      return [...pids];
    } catch {
      return [];
    }
  }

  try {
    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return output
      .split('\n')
      .map((pid) => pid.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function killPid(pid) {
  if (!pid || pid === String(process.pid)) return false;

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

function killPort(port, { silent = false } = {}) {
  const pids = getPidsOnPort(port);
  if (!pids.length) {
    if (!silent) console.log(`Porta ${port}: livre`);
    return 0;
  }

  let killed = 0;
  for (const pid of pids) {
    if (killPid(pid)) {
      killed += 1;
      if (!silent) console.log(`Porta ${port}: processo ${pid} encerrado`);
    }
  }
  return killed;
}

function killDevPorts(options = {}) {
  const { silent = false, includeMongo = true } = options;
  const ports = getDefaultPorts();
  const uniquePorts = includeMongo
    ? [...new Set([ports.backend, ...ports.frontend, ports.mongo])]
    : [...new Set([ports.backend, ...ports.frontend])];
  let total = 0;

  if (!silent) {
    console.log(`Liberando portas: ${uniquePorts.join(', ')}`);
  }

  for (const port of uniquePorts) {
    total += killPort(port, { silent });
  }

  if (!silent && total === 0) {
    console.log('Nenhum processo preso nas portas de desenvolvimento.');
  }

  return total;
}

function killStaleDevOrchestrators() {
  if (process.platform !== 'win32') return 0;

  try {
    const output = execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*dev-orchestrator.js*' -and $_.ProcessId -ne ${process.pid} } | Select-Object -ExpandProperty ProcessId"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    );
    let killed = 0;
    for (const pid of output.split('\n').map((value) => value.trim()).filter(Boolean)) {
      if (killPid(pid)) killed += 1;
    }
    if (killed) {
      console.log(`Encerradas ${killed} instancia(s) antiga(s) do dev-orchestrator`);
    }
    return killed;
  } catch {
    return 0;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortFree(port) {
  return getPidsOnPort(port).length === 0;
}

async function waitForPort(port, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isPortFree(port)) return true;
    await sleep(200);
  }
  return isPortFree(port);
}

async function prepareAppPorts() {
  killDevPorts({ includeMongo: false });
  await sleep(300);
  killDevPorts({ includeMongo: false, silent: true });

  const ports = getDefaultPorts();
  for (const port of [ports.backend, ...ports.frontend]) {
    const free = await waitForPort(port);
    if (!free) {
      killPort(port);
      await waitForPort(port, 3000);
    }
  }
}

if (require.main === module) {
  killDevPorts();
}

module.exports = {
  getDefaultPorts,
  getPidsOnPort,
  killPort,
  killDevPorts,
  killStaleDevOrchestrators,
  prepareAppPorts,
};
