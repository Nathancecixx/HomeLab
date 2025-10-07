// dashboard renderer + Apps buttons + Networking graph

/* ---------- tiny DOM helpers & formatters ---------- */
const $ = (id) => document.getElementById(id);

function applyTableLabels(row, labels){
  if (!row || !labels) return;
  Array.from(row.children || []).forEach((cell, idx) => {
    if (cell && labels[idx]){
      cell.setAttribute('data-label', labels[idx]);
    }
  });
}

function fmtPct(n){
  const x = Number(n);
  return Number.isFinite(x) ? `${x.toFixed(0)}%` : "—";
}
function fmtTemp(n){
  const x = Number(n);
  return (x==null || !Number.isFinite(x)) ? "—" : `${x.toFixed(1)}°C`;
}
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
function fmtBytes(n){
  const x = Number(n||0);
  if (!Number.isFinite(x)) return "—";
  const u = ["B","KB","MB","GB","TB"];
  let i = 0, v = x;
  while (v >= 1024 && i < u.length-1){ v /= 1024; i++; }
  return `${v.toFixed(v<10&&i>0?2:1)} ${u[i]}`;
}
function fmtBitsPerSec(n){
  const x = Number(n||0);
  if (!Number.isFinite(x)) return "—";
  const u = ["bps","Kbps","Mbps","Gbps","Tbps"];
  let i = 0, v = x;
  while (v >= 1000 && i < u.length-1){ v /= 1000; i++; }
  return `${v.toFixed(v<10?2:1)} ${u[i]}`;
}

/* ---------- Services registry (easy to extend) ----------
   A button shows only if a running container matches. */
const SERVICES = [
  { id: "nextcloud", label: "Nextcloud", emoji: "☁️", preferPort: 8081,
    match: (c) => /nextcloud/i.test(c.name||"") || /nextcloud/i.test(c.image||"") },

  { id: "kiwix", label: "Wikipedia (Kiwix)", emoji: "📚", preferPort: 8083,
    match: (c) => /kiwix/i.test(c.name||"") || /kiwix/i.test(c.image||"") },

  { id: "btcexplorer", label: "Bitcoin Explorer", emoji: "🧭", preferPort: 3002,
    match: (c) => /btc-?rpc-?explorer/i.test(c.name||"") || /btc-?rpc-?explorer/i.test(c.image||"") },
];

/* ---------- Docker ports parsing helpers ---------- */
const HTTPISH = new Set([80,81,3000,3001,4173,5000,5173,7000,8080,8081,8082,8083,8200,8443,8888,9000,9443]);

// Accepts Docker "ports" text like "0.0.0.0:8081->80/tcp, :::8081->80/tcp"
function extractHostPorts(portsText){
  if (!portsText) return [];
  const out = [];
  const re = /(?::|^|\s)(\d{2,5})(?=->)/g; // captures 8081 from "...:8081->"
  let m;
  while((m = re.exec(portsText))){ out.push(Number(m[1])); }
  return [...new Set(out)];
}
function pickBestPort(c, preferPort){
  const list = extractHostPorts(c.ports || "");
  if (!list.length) return null;
  if (preferPort && list.includes(preferPort)) return preferPort;
  const http = list.find(p => HTTPISH.has(p) || (p >= 8000 && p <= 8999));
  return http ?? list[0];
}
function urlFromPort(port){
  const proto = (port === 443 || port === 8443 || port === 9443) ? "https" : "http";
  const host = location.hostname;
  return `${proto}://${host}:${port}/`;
}

/* ---------- Networking live graph ---------- */
const NET = {
  historyLen: 120, // ~last 2 minutes if refresh ~1s
  byIface: new Map(), // name -> { last:{rx,tx,t}, up:[], down:[], peakUp:0, peakDown:0, info:{} }
  selected: null,
  dpr: Math.max(1, window.devicePixelRatio || 1),
};

function pickPrimaryInterface(list){
  if (!list?.length) return null;
  const withIPv4 = list.filter(i => (i.ip4||i.ipv4||"").includes("."));
  const wired = withIPv4.find(i => /^e(n|th)/i.test(i.name||""));
  return wired || withIPv4[0] || list[0];
}
// Support various backend shapes: data.net / data.network / data.networks
function normalizeNet(data){
  const net = data?.net || data?.network || data?.networks;
  if (!net) return [];
  let list = Array.isArray(net?.list) ? net.list : Array.isArray(net) ? net : [net];
  return list.map(x => ({
    name: x.name || x.iface || x.if || "unknown",
    ip4: x.ip4 || x.ipv4 || x.ip || "",
    mac: x.mac || x.hwaddr || "",
    rx: x.rx_bytes ?? x.rxBytes ?? x.recv ?? x.bytes_in ?? 0,
    tx: x.tx_bytes ?? x.txBytes ?? x.sent ?? x.bytes_out ?? 0,
    speedMbps: x.speed_mbps ?? x.speedMbps ?? x.speed ?? null,
    driver: x.driver || x.type || "",
  }));
}
function ensureIfaceState(name){
  if (!NET.byIface.has(name)){
    NET.byIface.set(name, {
      last: { rx:0, tx:0, t:0 },
      up: [], down: [],
      peakUp: 0, peakDown: 0,
      info: {},
    });
  }
  return NET.byIface.get(name);
}
function pushHistory(arr, v){
  arr.push(v);
  if (arr.length > NET.historyLen) arr.shift();
}
function drawNetGraph(){
  const canvas = $("net-graph");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const wrap = canvas.parentElement;

  const cssW = Math.max(320, wrap.clientWidth - 16);
  const cssH = 200;
  const W = Math.floor(cssW * NET.dpr);
  const H = Math.floor(cssH * NET.dpr);
  if (canvas.width !== W || canvas.height !== H){
    canvas.width = W; canvas.height = H;
  }
  ctx.clearRect(0,0,W,H);

  const st = NET.byIface.get(NET.selected);
  if (!st) return;

  const up = st.up, down = st.down;
  const n = Math.max(up.length, down.length);
  if (!n) return;

  const pad = 12 * NET.dpr;
  const chartW = W - pad*2;
  const chartH = H - pad*2 - 8*NET.dpr;
  const ymax = Math.max(1, ...up, ...down);
  const ymap = (v) => (chartH - (v / ymax) * chartH) + pad;
  const xstep = chartW / Math.max(1, n-1);

  // grid
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i=0;i<=4;i++){
    const y = pad + (chartH/4)*i;
    ctx.moveTo(pad, y); ctx.lineTo(pad+chartW, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  function strokeSeries(series, gradFrom, gradTo){
    if (!series.length) return;
    const grad = ctx.createLinearGradient(pad,0, pad+chartW,0);
    grad.addColorStop(0, gradFrom);
    grad.addColorStop(1, gradTo);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2 * NET.dpr;
    ctx.beginPath();
    series.forEach((v,i) => {
      const x = pad + i*xstep;
      const y = ymap(v);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // subtle fill
    const gfill = ctx.createLinearGradient(0,pad, 0, pad+chartH);
    gfill.addColorStop(0, gradFrom + "88");
    gfill.addColorStop(1, "transparent");
    ctx.fillStyle = gfill;
    ctx.globalAlpha = 0.10;
    ctx.lineTo(pad+chartW, pad+chartH);
    ctx.lineTo(pad, pad+chartH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Upload (warm), Download (cool)
  strokeSeries(up,   "#ffb703", "#fb7185");
  strokeSeries(down, "#34ceff", "#7dd3fc");
}
function updateNetwork(data){
  const card = $("net-card");
  if (!card) return;

  const list = normalizeNet(data);
  if (!list.length){
    card.style.display = "none";
    return;
  }

  // Refresh select options
  const sel = $("net-iface");
  const existing = new Set(Array.from(sel.options).map(o => o.value));
  list.forEach(i => {
    if (!existing.has(i.name)){
      const opt = document.createElement("option");
      opt.value = i.name;
      opt.textContent = i.name;
      sel.appendChild(opt);
    }
  });
  Array.from(sel.options).forEach(o => {
    if (!list.find(i => i.name === o.value)) sel.removeChild(o);
  });

  if (!NET.selected){
    const primary = pickPrimaryInterface(list);
    NET.selected = (primary && primary.name) || list[0].name;
    sel.value = NET.selected;
  } else if (![...sel.options].some(o => o.value === NET.selected)){
    NET.selected = list[0].name;
    sel.value = NET.selected;
  }

  // Update per-interface state from counters
  const now = performance.now();
  list.forEach(info => {
    const st = ensureIfaceState(info.name);
    st.info = info;

    const dt = (now - st.last.t) / 1000;
    if (dt > 0 && st.last.t){
      const upBps   = Math.max(0, (info.tx - st.last.tx) * 8 / dt);
      const downBps = Math.max(0, (info.rx - st.last.rx) * 8 / dt);
      pushHistory(st.up, upBps);
      pushHistory(st.down, downBps);
      st.peakUp = Math.max(st.peakUp, upBps);
      st.peakDown = Math.max(st.peakDown, downBps);
    }
    st.last = { rx: info.rx, tx: info.tx, t: now };
  });

  // Fill UI for selected iface
  const st = NET.byIface.get(NET.selected);
  const info = st?.info;
  if (info){
    const ipEl = $("net-ip");
    const spEl = $("net-speed");
    const upNow = $("net-up-now");
    const dnNow = $("net-down-now");
    const upPk = $("net-up-peak");
    const dnPk = $("net-down-peak");
    const txT = $("net-tx-total");
    const rxT = $("net-rx-total");
    const mac = $("net-mac");
    const drv = $("net-driver");

    const curUp = st.up.at(-1) || 0;
    const curDn = st.down.at(-1) || 0;

    ipEl.textContent = info.ip4 || "no IPv4";
    spEl.textContent = info.speedMbps ? `${info.speedMbps} Mbps` : "—";
    upNow.textContent = fmtBitsPerSec(curUp);
    dnNow.textContent = fmtBitsPerSec(curDn);
    upPk.textContent = fmtBitsPerSec(st.peakUp);
    dnPk.textContent = fmtBitsPerSec(st.peakDown);
    txT.textContent = fmtBytes(info.tx);
    rxT.textContent = fmtBytes(info.rx);
    mac.textContent = info.mac || "—";
    drv.textContent = info.driver ? `${info.driver}${info.speedMbps?` / ${info.speedMbps} Mbps`:''}` : (info.speedMbps? `${info.speedMbps} Mbps` : "—");
  }

  drawNetGraph();
  card.style.display = "";
}

// manual iface switching + responsive redraw
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "net-iface"){
    NET.selected = e.target.value;
    drawNetGraph();
  }
});
window.addEventListener("resize", () => drawNetGraph());

/* ---------- UI updaters (Disks / Docker / Apps) ---------- */
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
    applyTableLabels(tr, ["Mount", "Size", "Used", "Usage"]);
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
    applyTableLabels(tr, ["Name", "Image", "Status", "Ports"]);
    tbody.appendChild(tr);
  });
}
function updateApps(docker){
  const card = $("apps-card");
  const wrap = $("apps");
  const countEl = $("apps-count");
  if (!card || !wrap) return;

  const running = (docker.containers || []).filter(c => c.up);
  const buttons = [];
  SERVICES.forEach(svc => {
    const found = running.find(c => svc.match(c));
    if (!found) return;
    const port = pickBestPort(found, svc.preferPort);
    if (!port) return;
    const href = urlFromPort(port);
    buttons.push({ label: svc.label, emoji: svc.emoji, href });
  });

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
  updateNetwork(data); // NEW: networking card

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
