import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { exec as _exec } from 'node:child_process';
import util from 'node:util';
import compression from 'compression';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import si from 'systeminformation';

dotenv.config();

const exec = util.promisify(_exec);

const PORT = Number.parseInt(process.env.PORT, 10) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

// Security + perf
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false // allows inline assets for this simple app
}));
app.use(compression());
app.use(morgan('tiny'));

// Static UI
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, {
  etag: true,
  maxAge: '1h',
  immutable: true,
}));

// ------ helpers ------
async function getCpuTemp() {
  // Try systeminformation first
  try {
    const t = await si.cpuTemperature();
    const c = t?.main || t?.max || null;
    if (c && Number.isFinite(c)) {
      return { celsius: c, source: 'systeminformation' };
    }
  } catch { /* ignore */ }

  // Try vcgencmd (Raspberry Pi)
  try {
    const { stdout } = await exec('vcgencmd measure_temp');
    // output like: temp=49.8'C
    const m = stdout.match(/temp=([\d.]+)'C/);
    if (m) {
      return { celsius: Number.parseFloat(m[1]), source: 'vcgencmd' };
    }
  } catch { /* ignore */ }

  // Try common thermal zone
  try {
    const { stdout } = await exec("awk '{print $1/1000}' /sys/class/thermal/thermal_zone0/temp");
    const v = Number.parseFloat(stdout.trim());
    if (Number.isFinite(v)) {
      return { celsius: v, source: 'thermal_zone0' };
    }
  } catch { /* ignore */ }

  return { celsius: null, source: null };
}

async function getDockerPs() {
  try {
    const { stdout } = await exec(`docker ps --format '{{json .}}'`);
    const lines = stdout.split('\n').map(s => s.trim()).filter(Boolean);
    const items = lines.map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    // Normalize a few fields
    return items.map(i => ({
      id: i.ID,
      image: i.Image,
      name: i.Names,
      status: i.Status,
      ports: i.Ports,
      createdAt: i.RunningFor,
    }));
  } catch (e) {
    return { error: e?.message || String(e) };
  }
}

async function getDockerInfo() {
  try {
    const { stdout } = await exec(`docker info --format '{{json .}}'`);
    const obj = JSON.parse(stdout);
    return {
      serverVersion: obj.ServerVersion,
      driver: obj.Driver,
      cgroupDriver: obj.CgroupDriver,
      loggingDriver: obj.LoggingDriver,
      kernelVersion: obj.KernelVersion,
      containers: obj.Containers,
      containersRunning: obj.ContainersRunning,
      containersPaused: obj.ContainersPaused,
      containersStopped: obj.ContainersStopped,
      images: obj.Images
    };
  } catch {
    return null; // Not fatal
  }
}

function pickDisks(fsArr) {
  const wanted = ['/', '/srv/storage'];
  const out = [];
  for (const d of fsArr) {
    if (wanted.includes(d.mount)) out.push(d);
  }
  // If '/' missing, add the largest mount as a proxy
  if (!out.find(d => d.mount === '/') && fsArr.length) {
    const largest = fsArr.reduce((a, b) => (a.size > b.size ? a : b));
    out.unshift(largest);
  }
  return out;
}

async function getSystem() {
  const [osInfo, mem, load, fs, cpu, time] = await Promise.all([
    si.osInfo(),
    si.mem(),
    si.currentLoad(),
    si.fsSize(),
    si.cpu(),
    si.time()
  ]);
  const uptime = os.uptime();
  const bootTime = Date.now() - uptime * 1000;
  const disks = pickDisks(fs);

  return {
    host: {
      hostname: os.hostname(),
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      kernel: osInfo.kernel,
      arch: osInfo.arch,
      node: process.versions.node,
      time: time,
    },
    uptime: { seconds: uptime, boot: new Date(bootTime).toISOString() },
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed, // GHz
      load: load.currentload
    },
    memory: {
      total: mem.total,
      free: mem.free,
      used: mem.total - mem.free,
      active: mem.active,
      available: mem.available
    },
    disks: disks.map(d => ({
      fs: d.fs,
      type: d.type,
      mount: d.mount,
      size: d.size,
      used: d.used,
      use: d.use
    }))
  };
}

// ------ routes ------
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    uptimeSec: process.uptime(),
    pid: process.pid
  });
});

app.get('/api/system', async (_req, res) => {
  try {
    const sys = await getSystem();
    const temp = await getCpuTemp();
    res.json({ ...sys, temperature: temp });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/api/containers', async (_req, res) => {
  try {
    const [ps, info] = await Promise.all([getDockerPs(), getDockerInfo()]);
    res.json({ list: ps, info });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/api/summary', async (_req, res) => {
  try {
    const [sys, temp, dockerPs, dockerInfo] = await Promise.all([
      getSystem(),
      getCpuTemp(),
      getDockerPs(),
      getDockerInfo()
    ]);
    res.json({
      ok: true,
      system: sys,
      temperature: temp,
      docker: { list: dockerPs, info: dockerInfo }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Fallback to UI
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[dashboard] listening on ${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`[dashboard] received ${signal}, shutting down...`);
  server.close(err => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
