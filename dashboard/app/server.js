import "dotenv/config";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import si from "systeminformation";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execp = promisify(exec);

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan("tiny"));

// Serve static files (index.html, style.css, app.js) from ./public
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h" }));

const REFRESH_MS = Number(process.env.REFRESH_MS || 2000);

async function listContainers() {
  try {
    // --no-trunc to avoid truncated names/images; custom delimiter to parse safely
    const cmd = 'docker ps --no-trunc --format "{{.Names}}||{{.Image}}||{{.Status}}||{{.Ports}}"' ;
    const { stdout } = await execp(cmd, { timeout: 3000 });
    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map(line => {
      const [name, image, status, ports] = line.split("||");
      const isUp = /^Up\b/i.test(status || "");
      return { name, image, status, ports: ports || "", up: isUp };
    });
  } catch (err) {
    // Docker might not be installed or user lacks permissions; fail soft
    return { error: err.message, containers: [] };
  }
}

function bytesTo(x) {
  if (x == null) return null;
  const gb = x / (1024 ** 3);
  return { gb, pretty: `${gb.toFixed(1)} GiB` };
}

function usePercent(used, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (used / total) * 100));
}

async function getHealth() {
  const [cpu, load, mem, fs, temp, osInfo, time, versions, batteries, docker] = await Promise.all([
    si.cpu(),
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.cpuTemperature(),
    si.osInfo(),
    si.time(),
    si.versions(),
    si.battery().catch(() => null),
    listContainers()
  ]);

  const hostname = os.hostname();
  const now = new Date();

  const memUsed = mem.active ?? (mem.total - mem.available);
  const disks = (fs || []).map(d => ({
    mount: d.mount,
    size: bytesTo(d.size).pretty,
    used: bytesTo(d.used).pretty,
    usage: Math.round(d.use || usePercent(d.used, d.size))
  }));

  let containers = [];
  let dockerError = null;
  if (Array.isArray(docker)) {
    containers = docker;
  } else if (docker && Array.isArray(docker.containers)) {
    containers = docker.containers;
    dockerError = docker.error || null;
  }

  const running = containers.filter(c => c.up).length;
  const stopped = containers.length - running;

  return {
    meta: {
      hostname,
      platform: `${osInfo.distro} ${osInfo.release}`,
      kernel: osInfo.kernel,
      node: versions.node,
      now: now.toISOString(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dockerError,
      refreshMs: REFRESH_MS
    },
    cpu: {
      model: cpu.brand || cpu.manufacturer || "Unknown CPU",
      cores: cpu.cores,
      load: Number(load.currentLoad.toFixed(1)),
      temp: (temp && typeof temp.main === "number") ? Number(temp.main.toFixed(1)) : null
    },
    memory: {
      total: bytesTo(mem.total).pretty,
      used: bytesTo(memUsed).pretty,
      free: bytesTo(mem.available || (mem.total - memUsed)).pretty,
      usedPct: Number(usePercent(memUsed, mem.total).toFixed(1))
    },
    uptime: {
      boot: new Date(time.boot * 1000).toISOString(),
      uptimeSec: time.uptime,
      kernel: osInfo.kernel
    },
    versions: {
      node: versions.node
    },
    disks,
    docker: {
      count: containers.length,
      running,
      stopped,
      containers
    },
  };
}

// One-off JSON snapshot (useful for debugging)
app.get("/api/health", async (_req, res) => {
  try {
    const data = await getHealth();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// SSE live stream for the UI
app.get("/api/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = async () => {
    try {
      const payload = await getHealth();
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: e.message || String(e) })}\n\n`);
    }
  };

  // Initial retry hint & first payload
  res.write("retry: 5000\n\n");
  await send();
  const iv = setInterval(send, REFRESH_MS);

  req.on("close", () => {
    clearInterval(iv);
  });
});

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, HOST, () => {
  console.log(`[dashboard] listening on ${HOST}:${PORT}`);
});
