const { spawn } = require('child_process');
const net = require('net');
const mongoose = require('mongoose');
const { killDevPorts, killStaleDevOrchestrators, prepareAppPorts } = require('./kill-ports');

const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/finance';
const BACKEND_PORT = Number(process.env.PORT || 4000);

function waitForPort(port, host = '127.0.0.1', timeoutMs = 45_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timeout aguardando ${host}:${port}`));
        return;
      }

      const socket = net.createConnection({ port, host }, () => {
        socket.end();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        setTimeout(attempt, 300);
      });
    };

    attempt();
  });
}

async function checkMongo(uri, { silent = false } = {}) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000, family: 4 });
    await mongoose.connection.close();
    if (!silent) {
      console.log('MongoDB reachable');
    }
    return true;
  } catch (err) {
    if (!silent) {
      console.log('MongoDB local não detectado; tentando iniciar mongod...');
    }
    return false;
  }
}

function attachMongodLogs(mongodProcess) {
  const showLine = (line) => {
    const text = line.trim();
    if (!text) return;
    const isNoise =
      text.includes('"s":"I"') ||
      text.includes('"s":"W"') ||
      text.includes('WiredTiger message') ||
      text.includes('client metadata') ||
      text.includes('Connection accepted') ||
      text.includes('Connection ended') ||
      text.includes('Connection not authenticating') ||
      text.includes('Received first command') ||
      text.includes('startupWarnings') ||
      text.includes('WindowsPdhError') ||
      text.includes('Access control is not enabled');
    const isImportant =
      text.includes('"s":"E"') ||
      text.includes('"s":"F"') ||
      text.includes('startup complete') ||
      text.includes('Waiting for connections') ||
      text.includes('Unclean shutdown') ||
      text.includes('Failed to start');
    if (isImportant || (!isNoise && text.includes('"s":"E"'))) {
      process.stdout.write(`[mongod] ${text}\n`);
    }
  };

  const flush = (chunk, isErr) => {
    const prefix = isErr ? '[mongod:err] ' : '';
    chunk
      .toString()
      .split(/\r?\n/)
      .forEach((line) => {
        if (!line.trim()) return;
        if (isErr) {
          process.stderr.write(`${prefix}${line}\n`);
          return;
        }
        showLine(line);
      });
  };

  mongodProcess.stdout.on('data', (data) => flush(data, false));
  mongodProcess.stderr.on('data', (data) => flush(data, true));
}

async function start() {
  killStaleDevOrchestrators();
  killDevPorts({ includeMongo: true });

  const mongoUri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
  const ok = await checkMongo(mongoUri);
  let mongodProcess = null;

  if (!ok) {
    const fs = require('fs');
    const path = require('path');
    const mongodExe = 'C:\\\\bin\\\\mongod.exe';
    const dbPath = path.resolve(process.cwd(), '.data', 'db');

    if (fs.existsSync(mongodExe)) {
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      console.log(`Iniciando MongoDB local (${dbPath})`);
      mongodProcess = spawn(
        mongodExe,
        ['--dbpath', dbPath, '--bind_ip', '127.0.0.1', '--quiet'],
        { stdio: ['ignore', 'pipe', 'pipe'], shell: false },
      );

      attachMongodLogs(mongodProcess);

      const startAt = Date.now();
      let started = false;
      while (Date.now() - startAt < 15000) {
        await new Promise((r) => setTimeout(r, 500));
        if (await checkMongo(mongoUri, { silent: true })) {
          started = true;
          break;
        }
      }
      if (!started) {
        console.error('Não foi possível iniciar o MongoDB local dentro do tempo limite.');
        if (mongodProcess) mongodProcess.kill();
        process.exit(1);
      }
      console.log('MongoDB local pronto.');
    } else {
      console.error(`mongod não encontrado em ${mongodExe}. Instale o MongoDB ou coloque mongod.exe nesse caminho.`);
      process.exit(1);
    }
  }

  await prepareAppPorts();

  const backend = spawn('npm', ['--workspace', 'backend', 'run', 'dev'], { stdio: 'inherit', shell: true });

  console.log(`Aguardando backend na porta ${BACKEND_PORT}...`);
  try {
    await waitForPort(BACKEND_PORT);
    console.log(`Backend pronto na porta ${BACKEND_PORT}.`);
  } catch (err) {
    console.warn(`Backend não respondeu a tempo (${err.message}). Iniciando frontend mesmo assim.`);
  }

  const frontend = spawn('npm', ['--workspace', 'frontend', 'run', 'dev'], { stdio: 'inherit', shell: true });

  const cleanup = () => {
    try {
      backend.kill('SIGTERM');
    } catch (e) {}
    try {
      frontend.kill('SIGTERM');
    } catch (e) {}
    if (mongodProcess) {
      try {
        mongodProcess.kill('SIGTERM');
      } catch (e) {}
    }
  };

  const onExit = (code) => {
    cleanup();
    killDevPorts({ silent: true, includeMongo: !!mongodProcess });
    process.exit(code ?? 0);
  };

  process.on('SIGINT', () => onExit(0));
  process.on('SIGTERM', () => onExit(0));

  backend.on('exit', onExit);
  frontend.on('exit', onExit);
}

start();
