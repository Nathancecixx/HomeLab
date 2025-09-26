// public/app.js — dashboard renderer + Apps buttons (auto from Docker)

/* ---------- tiny DOM helpers & formatters ---------- */
const $ = (id) => document.getElementById(id);
function fmtPct(n){ const x = Number(n); return Number.isFinite(x) ? `${x.toFixed(0)}%` : "—"; }
function fmtTemp(n){ const x = Number(n); return (x==null || !Number.isFinite(x)) ? "—" : `${x.toFixed(1)}°C`; }
function fmtUptime(sec){
  sec = Math.floor(Number(sec||0));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d?d+"d ": ""}${h}h ${m}m`;
}
function fmtTime(iso){
  try { const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString(); } catch { return "—"; }
}

/* ---------- Services registry (easy to extend) ----------
   Add entries here for friendly names and preferred ports.
   A button shows up only if a running container matches.
*/
const SERVICES = [
  { id: "nextcloud", label: "Nextcloud", emoji: "☁️", preferPort: 8081,
    match: (c) => /nextcloud/i.test(c.name||"") || /nextcloud/i.test(c.image||"") },

  { id: "kiwix", label: "Wikipedia (Kiwix)", emoji: "📚", preferPort: 8082,
    match: (c) => /kiwix/i.test(c.name||"") || /kiwix/i.test(c.image||"") },
  { id: "Bitcoin", label: "Node Dashboard", emoji: "₿", preferPort: 8083,
    match: (c) => /kiwix/i.test(c.name||"") || /kiwix/i.test(c.image||"") },

  // Example template to copy:
  // { id: "grafana", label: "Grafana", emoji: "📈", preferPort: 3000,
  //   match: (c) => /grafana/i.test(c.name||"") || /grafana/i.test(c.image||"") },
];

/* ---------- Docker ports parsing helpers ---------- */
const HTTPISH = new Set([80, 81, 3000, 3001, 4173, 5000, 5173, 7000, 8080, 8081, 8082, 8083, 8200, 8443, 8888, 9000, 9443]);

// Accepts a Docker "ports" text like "0.0.0.0:8081->80/tcp, :::8081->80/tcp"
function extractHostPorts(portsText){
  if (!portsText) return [];
  const out = [];
  // Match hostport patterns before ->containerport
  const re = /(?::|^|\s)(\d{2,5})(?=->)/g; // captures 8081 from "...:8081->"
  let m;
  while((m = re.exec(portsText))){ out.push(Number(m[1])); }
  return [...new Set(out)];
}

function pickBestPort(c, preferPort){
  const list = extractHostPorts(c.ports || "");
  if (!list.length) return null;
  if (preferPort && list.includes(preferPort)) return preferPort;
  // Prefer any http-ish port; else first
  const http = list.find(p => HTTPISH.has(p) || (p >= 8000 && p <= 8999));
  return http ?? list[0];
}

function urlFromPort(port){
  const proto = (port === 443 || port === 8443 || port === 9443) ? "https" : "http";
  const host = location.hostname; // ensures it works over LAN/VPN names
  return `${proto}://${host}:${port}/`;
}

/* ---------- UI updaters ---------- */
function updateDisks(disks){
  const tbody = $("disks")?.querySelector("tbody"); if (!tbody) return;
  tbody.innerHTML = "";
  (disks || []).forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.mount}</td>
      <td>${d.size}</td>
      <td>${d.used}</td>
      <td class="usage">
        <div class="bar"><span style="width:${d.usage}%;"></span></div>
        ${d.usage}%
      </td>`;
    tbody.appendChild(tr);
  });
}

function updateContainers(docker){
  const meta = `${docker.count} containers · ${docker.running} running, ${docker.stopped} stopped`;
  const metaEl = $("docker-meta"); if (metaEl) metaEl.textContent = meta;

  const tbody = $("containers")?.querySelector("tbody"); if (!tbody) return;
  tbody.innerHTML = "";
  (docker.containers || []).forEach(c => {
    const chipClass = c.up ? "ok" : "bad";
    const chipText = c.up ? "running" : "stopped";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name || "—"}</td>
      <td>${c.image || "—"}</td>
      <td><span class="chip ${chipClass}">${chipText}</span> <span class="muted">${c.status || ""}</span></td>
      <td>${c.ports || ""}</td>`;
    tbody.appendChild(tr);
  });
}

function updateApps(docker){
  const card = $("apps-card");
  const wrap = $("apps");
  const countEl = $("apps-count");
  if (!card || !wrap) return;

  // Build a quick lookup of running containers
  const running = (docker.containers || []).filter(c => c.up);

  // For each configured SERVICE, try to find a matching running container + a usable port
  const buttons = [];
  SERVICES.forEach(svc => {
    const found = running.find(c => svc.match(c));
    if (!found) return;
    const port = pickBestPort(found, svc.preferPort);
    if (!port) return; // exposed but no host port → skip (no button to click)
    const href = urlFromPort(port);
    buttons.push({ label: svc.label, emoji: svc.emoji, href });
  });

  // Also surface generic “unknown” web UIs (containers with HTTP-ish ports) not covered above
  running.forEach(c => {
    const known = SERVICES.some(svc => svc.match(c));
    if (known) return;
    const port = pickBestPort(c, null);
    if (!port) return;
    // Heuristic: only show if port looks like a web UI
    if (!(HTTPISH.has(port) || (port>=8000 && port<=8999) || (port>=3000 && port<=3999))) return;
    buttons.push({ label: c.name || c.image || `:${port}`, emoji: "🧩", href: urlFromPort(port) });
  });

  // Render
  wrap.innerHTML = "";
  buttons.forEach(b => {
    const a = document.createElement("a");
    a.className = "svc-btn";
    a.href = b.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `
      <span class="icon">${b.emoji || "🔗"}</span>
      <span>
        <strong>${b.label}</strong>
        <small>${b.href.replace(/^https?:\/\//,'')}</small>
      </span>`;
    wrap.appendChild(a);
  });

  // Show/hide Apps card
  const has = buttons.length > 0;
  card.style.display = has ? "" : "none";
  if (countEl) countEl.textContent = has ? `${buttons.length} available` : "";
}

/* ---------- main render ---------- */
function render(data){
  const { meta, cpu, memory, uptime, disks, docker } = data;

  const hostEl = $("host"); if (hostEl) hostEl.textContent = `${meta.hostname} · ${meta.platform}`;

  const last = $("last-updated");
  if (last) last.textContent = `Updated ${new Date(meta.now).toLocaleTimeString()} (every ${Math.round(meta.refreshMs/1000)}s)`;

  const cModel = $("cpu-model"); if (cModel) cModel.textContent = cpu.model;
  const cCores = $("cpu-cores"); if (cCores) cCores.textContent = cpu.cores ?? "—";
  const cLoad = $("cpu-load"); if (cLoad) cLoad.textContent = fmtPct(cpu.load);
  const cTemp = $("cpu-temp"); if (cTemp) cTemp.textContent = fmtTemp(cpu.temp);

  const mTot = $("mem-total"); if (mTot) mTot.textContent = memory.total;
  const mUsed = $("mem-used"); if (mUsed) mUsed.textContent = `${memory.used} (${fmtPct(memory.usedPct)})`;
  const mFree = $("mem-free"); if (mFree) mFree.textContent = memory.free;

  const boot = $("boot-time"); if (boot) boot.textContent = fmtTime(uptime.boot);
  const up = $("uptime"); if (up) up.textContent = fmtUptime(uptime.uptimeSec);
  const kern = $("kernel"); if (kern) kern.textContent = uptime.kernel || "—";
  const node = $("node"); if (node) node.textContent = data.versions?.node || "—";

  updateDisks(disks);
  updateContainers(docker);
  updateApps(docker);

  const dockerErr = $("docker-error");
  if (dockerErr) dockerErr.textContent = meta.dockerError ? `Note: Docker info unavailable (${meta.dockerError}). Add your user to the 'docker' group.` : "";
}

/* ---------- SSE lifecycle ---------- */
let ev;
function start(){
  try { ev?.close(); } catch {}
  ev = new EventSource("/api/stream");
  ev.onmessage = (e) => {
    try { render(JSON.parse(e.data)); } catch {}
  };
  ev.addEventListener("error", () => {
    const last = $("last-updated");
    if (last) last.textContent = "Reconnecting…";
  });
}

window.addEventListener("load", start);
window.addEventListener("beforeunload", () => { try { ev?.close(); } catch {} });