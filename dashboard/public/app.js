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

function updateDisks(disks){
  const table = $("disks"); if (!table) return;
  const tbody = table.querySelector("tbody"); if (!tbody) return;
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

  const table = $("containers"); if (!table) return;
  const tbody = table.querySelector("tbody"); if (!tbody) return;
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

  const dockerErr = $("docker-error");
  if (dockerErr) dockerErr.textContent = meta.dockerError ? `Note: Docker info unavailable (${meta.dockerError}). Add your user to the 'docker' group.` : "";
}

// --- SSE lifecycle (open after load; keep a single connection) ---
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
    // Do NOT close; browser will auto-retry using server's "retry:"
  });
}

window.addEventListener("load", start);
window.addEventListener("beforeunload", () => { try { ev?.close(); } catch {} });