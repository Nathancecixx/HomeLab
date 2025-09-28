// server.js — BigRedPi website (Dashboard + Auth + Admin scaffold)
//
// Install deps (from project root):
//   npm i express helmet compression morgan systeminformation bcryptjs express-session express-rate-limit uuid dotenv
//
// Start:
//   HOST=0.0.0.0 PORT=8080 node server.js

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
import bcrypt from "bcryptjs";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { SERVICES, getService } from "./modules/services.js";

import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS || 600);
function signJwt(payload, ttlSec = JWT_TTL_SECONDS) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ttlSec });
}
function requireJwt(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return err(res, 401, "Unauthorized");
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); }
  catch { return err(res, 401, "Unauthorized"); }
}




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execp = promisify(exec);

// ----- Config -----
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);
const REFRESH_MS = Number(process.env.REFRESH_MS || 2000);

// Password may be plain (ADMIN_PASSWORD) or bcrypt hash (ADMIN_PASSWORD_BCRYPT)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_PASSWORD_BCRYPT = process.env.ADMIN_PASSWORD_BCRYPT || "";

// Session secret: use provided or auto-generate at boot (good for single-node, LAN)
const SESSION_SECRET =
  (process.env.SESSION_SECRET && process.env.SESSION_SECRET !== "auto")
    ? process.env.SESSION_SECRET
    : uuidv4();

const app = express();
app.disable("x-powered-by");

// Helmet: keep CSP disabled (LAN/VPN-only, some pages inline scripts/styles)
app.use(helmet({ contentSecurityPolicy: false }));

// Parsing & logs
app.use(express.json({ limit: "256kb" }));
app.use(morgan("tiny"));

// Compression (but not for SSE)
app.use(
  compression({
    filter: (req, res) => (req.path === "/api/stream" ? false : compression.filter(req, res)),
  })
);

// Sessions
app.use(
  session({
    name: "brp.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 12, // 12h
    },
  })
);

// ---------- Utilities ----------
function ok(res, data) { return res.json(data); }
function err(res, status, message) { return res.status(status).json({ error: message }); }

function requireAuth(req, res, next) {
  if (req.session?.auth?.role === "admin") return next();
  return err(res, 401, "Unauthorized");
}

async function verifyPassword(inputPw) {
  if (ADMIN_PASSWORD_BCRYPT) {
    try {
      return await bcrypt.compare(inputPw, ADMIN_PASSWORD_BCRYPT);
    } catch {
      return false;
    }
  }
  if (!ADMIN_PASSWORD) return false;
  // Constant-time-ish compare
  const a = Buffer.from(String(inputPw));
  const b = Buffer.from(String(ADMIN_PASSWORD));
  if (a.length !== b.length) return false;
  return cryptoSafeEqual(a, b);
}

function cryptoSafeEqual(a, b) {
  // Small helper to avoid timing leaks when not using bcrypt
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length && i < b.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

//---------- Networking ----------
// Build network list with totals + identity (works with systeminformation)
async function getNetworkInfo(si){
  const [ifs, stats] = await Promise.all([
    si.networkInterfaces(),
    si.networkStats()  // array of { iface, rx_bytes, tx_bytes, ... }
  ]);

  const byIfaceStat = new Map();
  for (const s of stats) {
    // Some builds expose s.ifaceName; normalize to s.iface
    const name = s.iface || s.ifaceName || s.ifaceid || s.interface || s.nic || s?.operstate?.iface || "";
    if (!name) continue;
    byIfaceStat.set(name, s);
  }

  // Merge identities (IP/MAC/speed) with counters (rx/tx bytes)
  const list = ifs.map(i => {
    const s = byIfaceStat.get(i.iface) || {};
    return {
      name: i.iface,
      ip4: i.ip4 || i.ipv4 || "",
      mac: i.mac || "",
      speed_mbps: i.speed || null,
      driver: i.type || "",

      // totals expected by the frontend
      rx_bytes: s.rx_bytes ?? s.rxBytes ?? s.rx ?? 0,
      tx_bytes: s.tx_bytes ?? s.txBytes ?? s.tx ?? 0,
    };
  });

  // Fallback: if networkStats returned extra ifaces not in networkInterfaces
  for (const [name, s] of byIfaceStat) {
    if (!list.find(x => x.name === name)) {
      list.push({
        name,
        ip4: "",
        mac: "",
        speed_mbps: null,
        driver: "",
        rx_bytes: s.rx_bytes ?? s.rxBytes ?? s.rx ?? 0,
        tx_bytes: s.tx_bytes ?? s.txBytes ?? s.tx ?? 0,
      });
    }
  }

  // Only keep useful ones (have any totals or an IP/MAC)
  return list.filter(n => (n.rx_bytes || n.tx_bytes || n.ip4 || n.mac));
}




// ---------- System / Docker helpers ----------
async function listContainers() {
  try {
    const cmd = 'docker ps --no-trunc --format "{{.Names}}||{{.Image}}||{{.Status}}||{{.Ports}}"';
    const { stdout } = await execp(cmd, { timeout: 3000 });
    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const [name, image, status, ports] = line.split("||");
      const isUp = /^Up\b/i.test(status || "");
      return { name, image, status, ports: ports || "", up: isUp };
    });
  } catch (err) {
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
  const [cpu, load, mem, fs, temp, osInfo, time, versions, docker] = await Promise.all([
    si.cpu(),
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.cpuTemperature(),
    si.osInfo(),
    si.time(),
    si.versions(),
    listContainers(),
  ]);

  const netList = await getNetworkInfo(si);

  const hostname = os.hostname();
  const now = new Date();

  const memUsed = mem.active ?? (mem.total - mem.available);
  const disks = (fs || []).map((d) => ({
    mount: d.mount,
    size: bytesTo(d.size).pretty,
    used: bytesTo(d.used).pretty,
    usage: Math.round(d.use || usePercent(d.used, d.size)),
  }));

  let containers = [];
  let dockerError = null;
  if (Array.isArray(docker)) {
    containers = docker;
  } else if (docker && Array.isArray(docker.containers)) {
    containers = docker.containers;
    dockerError = docker.error || null;
  }

  const running = containers.filter((c) => c.up).length;
  const stopped = containers.length - running;

  const uptimeSec = Number(time?.uptime || 0);
  const bootMs =
    typeof time?.boot === "number" && isFinite(time.boot) && time.boot > 0
      ? time.boot * 1000
      : Date.now() - uptimeSec * 1000;

  return {
    meta: {
      hostname,
      platform: `${osInfo.distro} ${osInfo.release}`,
      kernel: osInfo.kernel,
      node: versions.node,
      now: now.toISOString(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dockerError,
      refreshMs: REFRESH_MS,
    },
    cpu: {
      model: cpu.brand || cpu.manufacturer || "Unknown CPU",
      cores: cpu.cores,
      load: Number(load.currentLoad.toFixed(1)),
      temp: temp && typeof temp.main === "number" ? Number(temp.main.toFixed(1)) : null,
    },
    memory: {
      total: bytesTo(mem.total).pretty,
      used: bytesTo(memUsed).pretty,
      free: bytesTo(mem.available || (mem.total - memUsed)).pretty,
      usedPct: Number(usePercent(memUsed, mem.total).toFixed(1)),
    },
    uptime: {
      boot: new Date(bootMs).toISOString(),
      uptimeSec,
      kernel: osInfo.kernel,
    },
    versions: { node: versions.node },
    disks,
    docker: {
      count: containers.length,
      running,
      stopped,
      containers,
    },
    net: netList,
  };
}


async function isComposeRunning(dir, project) {
  // 1) Fast & reliable: check by compose project label
  if (project) {
    try {
      const { stdout } = await execp(
        `docker ps --filter label=com.docker.compose.project=${project} --filter status=running --format '{{.Names}}'`,
        { timeout: 3000 }
      );
      if (stdout.trim().length > 0) return true;
    } catch {}
  }
  // 2) Fallback: run compose in the directory (works when the compose file is there)
  try {
    const { stdout } = await execp("docker compose ps --services --status=running", { cwd: dir, timeout: 4000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}




async function getEnvText(envPath) {
  try {
    const buf = await fsp.readFile(envPath);
    return buf.toString("utf8");
  } catch {
    return "";
  }
}



// ---------- Routers ----------

// Static site (public dashboard). Add more pages here as you grow:
//   /           -> public/index.html (dashboard)
//   /assets/... -> public assets
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h", extensions: ["html"] }));

// Admin static files (JS/CSS) are public, but the admin HTML route is gated below.
app.use(
  "/admin/assets",
  express.static(path.join(__dirname, "admin"), {
    etag: false,
    lastModified: false,
    maxAge: 0,
  })
);


// Health snapshot
app.get("/api/health", async (_req, res) => {
  try { ok(res, await getHealth()); } catch (e) { err(res, 500, e.message || String(e)); }
});

// SSE stream for live dashboard
app.get("/api/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Keep-Alive", "timeout=60, max=1000");
  res.write("retry: 5000\n\n");

  const send = async () => {
    try { res.write(`data: ${JSON.stringify(await getHealth())}\n\n`); }
    catch (e) { res.write(`event: error\ndata: ${JSON.stringify({ message: e.message || String(e) })}\n\n`); }
  };
  const hb = setInterval(() => res.write(`: hb ${Date.now()}\n\n`), 15000);
  await send();
  const iv = setInterval(send, REFRESH_MS);
  req.on("close", () => { clearInterval(iv); clearInterval(hb); });
});

// ---- Auth endpoints ----
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/api/me", (req, res) => {
  const [_, t] = (req.headers.authorization || "").split(" ");
  if (t) try { const c = jwt.verify(t, JWT_SECRET); return ok(res, { auth: true, user: { role: c.role }, exp: c.exp }); } catch {}
  return ok(res, { auth: false, user: null });
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== "string" || !password) return err(res, 400, "Password required");
  if (!(await verifyPassword(password))) return err(res, 401, "Invalid credentials");
  const token = signJwt({ role: "admin" });
  const { exp } = jwt.decode(token);
  ok(res, { ok: true, token, exp });
});

app.post("/api/logout", (_req, res) => ok(res, { ok: true }));



// -------- Admin: Services & Env (protected) --------
app.get("/api/admin/services", requireJwt, async (_req, res) => {
  try {
    const out = await Promise.all(
      SERVICES.map(async (s) => {
        const running = await isComposeRunning(s.dir, s.project);
        const hasEnv = fs.existsSync(s.envPath);
        return { id: s.id, label: s.label, running, hasEnv };
      })
    );
    ok(res, { services: out });
  } catch (e) {
    err(res, 500, e.message || "Failed to list services");
  }
});

app.post("/api/admin/services/:id/:action", requireJwt, async (req, res) => {
  const { id, action } = req.params;
  const svc = getService(id);
  if (!svc) return err(res, 404, "Unknown service");

  const target =
    action === "start" ? svc.make.start :
    action === "stop" ? svc.make.stop :
    action === "restart" ? svc.make.restart : null;

  if (!target) return err(res, 400, "Bad action");

  try {
    // call Makefile target in that directory
    const { stdout, stderr } = await execp(`make ${target}`, { cwd: svc.dir, timeout: 60_000 });
    ok(res, { ok: true, stdout, stderr });
  } catch (e) {
    err(res, 500, e.stderr || e.message || "Command failed");
  }
});

app.get("/api/admin/services/:id/env", requireJwt, async (req, res) => {
  const { id } = req.params;
  const svc = getService(id);
  if (!svc) return err(res, 404, "Unknown service");

  const exists = fs.existsSync(svc.envPath);
  const text = exists ? await getEnvText(svc.envPath) : "";
  ok(res, { path: svc.envPath, exists, text });
});

// Replace your current PUT /api/admin/services/:id/env with this improved one:
app.put("/api/admin/services/:id/env", requireJwt, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body || {};
  if (typeof text !== "string") return err(res, 400, "text is required");

  const svc = getService(id);
  if (!svc) return err(res, 404, "Unknown service");

  try {
    await fsp.mkdir(path.dirname(svc.envPath), { recursive: true });
    // 👇 add targeted diagnostics
    console.log("[ENV SAVE]", {
      envPath: svc.envPath,
      cwd: process.cwd(),
      uid: process.getuid?.(),
      user: process.env.USER,
    });

    await fsp.writeFile(svc.envPath, text, "utf8");
    ok(res, { ok: true });
  } catch (e) {
    console.error("[ENV SAVE ERROR]", e); // 👈 log the real error once
    const msg =
      e?.code === "EROFS" ? `Filesystem is read-only at ${svc.envPath}.`
    : e?.code === "EACCES" || e?.code === "EPERM" ? `Permission denied writing ${svc.envPath} (uid=${process.getuid?.()}).`
    : e?.code === "ENOENT" ? `Directory missing for ${svc.envPath}.`
    : e?.message || "Failed to write env";
    err(res, 500, msg);
  }
});





app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "admin", "admin.html"));
});





// Fallback: send dashboard for unknown root routes (handy for future pages)
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 (JSON for /api/*, HTML otherwise)
app.use((req, res) => {
  if (req.path.startsWith("/api/")) return err(res, 404, "Not found");
  res.status(404).send("<h1>404</h1><p>Not found</p>");
});

// Boot
app.listen(PORT, HOST, () => {
  console.log(`[bigredpi] listening on http://${HOST}:${PORT} (refresh=${REFRESH_MS}ms)`);
});
