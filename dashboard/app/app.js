const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function fmtBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

function fmtPct(v) {
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(1)}%`;
}

function fmtDate(s) {
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

function fmtDuration(sec) {
  if (!Number.isFinite(sec)) return '—';
  const d = Math.floor(sec / 86400);
  sec -= d * 86400;
  const h = Math.floor(sec / 3600);
  sec -= h * 3600;
  const m = Math.floor(sec / 60);
  return `${d}d ${h}h ${m}m`;
}

async function load() {
  const res = await fetch('/api/summary', { cache: 'no-store' });
  const data = await res.json();

  const sys = data.system;
  const temp = data.temperature;

  // Header
  $('#host').textContent = `${sys.host.hostname} • ${sys.host.distro} ${sys.host.release}`;

  // CPU
  $('#cpu-model').textContent = `${sys.cpu.brand}`;
  $('#cpu-cores').textContent = `${sys.cpu.physicalCores ?? sys.cpu.cores} cores`;
  $('#cpu-load').textContent = fmtPct(sys.cpu.load);
  $('#cpu-temp').textContent = temp?.celsius != null ? `${temp.celsius.toFixed(1)}°C` : 'N/A';

  // Memory
  $('#mem-total').textContent = fmtBytes(sys.memory.total);
  $('#mem-used').textContent = fmtBytes(sys.memory.used);
  $('#mem-free').textContent = fmtBytes(sys.memory.free);

  // Uptime / kernel
  $('#boot-time').textContent = fmtDate(sys.uptime.boot);
  $('#uptime').textContent = fmtDuration(sys.uptime.seconds);
  $('#kernel').textContent = `${sys.host.kernel}`;
  $('#node').textContent = `${sys.host.node}`;

  // Disks
  const tb = $('#disks tbody');
  tb.innerHTML = '';
  (sys.disks || []).forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.mount}</td>
                    <td>${fmtBytes(d.size)}</td>
                    <td>${fmtBytes(d.used)}</td>
                    <td>${fmtPct(d.use)}</td>`;
    tb.appendChild(tr);
  });

  // Docker
  const docker = data.docker || {};
  const meta = docker.info
      ? `v${docker.info.serverVersion} • ${docker.info.containersRunning}/${docker.info.containers} running`
      : `Not available`;
  $('#docker-meta').textContent = meta;

  const cb = $('#containers tbody');
  cb.innerHTML = '';
  const list = Array.isArray(docker.list) ? docker.list : [];
  list.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.name}</td>
                    <td>${c.image}</td>
                    <td>${c.status}</td>
                    <td>${c.ports || ''}</td>`;
    cb.appendChild(tr);
  });

  $('#last-updated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

$('#refresh').addEventListener('click', load);

// Auto-refresh every 10s
setInterval(load, 10000);
load().catch(console.error);
