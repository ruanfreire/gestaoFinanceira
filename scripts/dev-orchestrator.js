const { spawn } = require('child_process');
const mongoose = require('mongoose');
const { killDevPorts, killStaleDevOrchestrators, prepareAppPorts } = require('./kill-ports');

async function checkMongo(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    await mongoose.connection.close();
    console.log('MongoDB reachable');
    return true;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message || err);
    return false;
  }
}

async function start() {
  killStaleDevOrchestrators();
  killDevPorts({ includeMongo: true });

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
  const ok = await checkMongo(mongoUri);
  let mongodProcess = null;

  // If Mongo is not reachable, attempt to start a local mongod from C:\bin\mongod.exe
  if (!ok) {
    const fs = require('fs');
    const path = require('path');
    const mongodExe = 'C:\\\\bin\\\\mongod.exe';
    const dbPath = path.resolve(process.cwd(), '.data', 'db');

    if (fs.existsSync(mongodExe)) {
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      console.log(`Starting local mongod from ${mongodExe} with dbpath ${dbPath}`);
      mongodProcess = spawn(mongodExe, ['--dbpath', dbPath, '--bind_ip', '127.0.0.1'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });

      mongodProcess.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(`[mongod] ${text}`);
      });
      mongodProcess.stderr.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(`[mongod] ${text}`);
      });

      // wait for mongo to accept connections (retry for up to 15s)
      const startAt = Date.now();
      let started = false;
      while (Date.now() - startAt < 15000) {
        // eslint-disable-next-line no-await-in-loop
        // small delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 500));
        // eslint-disable-next-line no-await-in-loop
        if (await checkMongo(mongoUri)) {
          started = true;
          break;
        }
      }
      if (!started) {
        console.error('Failed to start local mongod within timeout. Aborting.');
        if (mongodProcess) mongodProcess.kill();
        process.exit(1);
      }
      console.log('Local mongod started and reachable.');
    } else {
      console.error(`mongod executable not found at ${mongodExe}. Install MongoDB or place mongod.exe there.`);
      process.exit(1);
    }
  }

  await prepareAppPorts();

  const backend = spawn('npm', ['--workspace', 'backend', 'run', 'dev'], { stdio: 'inherit', shell: true });
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

