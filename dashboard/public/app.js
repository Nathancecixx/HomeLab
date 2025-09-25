// Connect to Server-Sent Events stream and update the UI live
const $ = (id) => document.getElementById(id);

function fmtPct(n){ return `${Number(n).toFixed(0)}%`; }
function fmtTemp(n){ return (n==null) ? "—" : `${n.toFixed(1)}°C`; }
function fmtUptime(sec){
  sec = Math.floor(Number(sec||0));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d?d+"d ": ""}${h}h ${m}m`;
}
function fmtTime(iso){
  try { return new Date(iso).toLocaleString(); } catch { return iso || "—"; }
}

function updateDisks(disks){
  const tbody = $("disks").querySelector("tbody");
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
  $("docker-meta").textContent = `${docker.count} containers · ${docker.running} running, ${docker.stopped} stopped`;
  const tbody = $("containers").querySelector("tbody");
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

  $("host").textContent = `${meta.hostname} · ${meta.platform}`;
  $("last-updated").textContent = `Updated ${new Date(meta.now).toLocaleTimeString()} (every ${Math.round(meta.refreshMs/1000)}s)`;

  $("cpu-model").textContent = cpu.model;
  $("cpu-cores").textContent = cpu.cores ?? "—";
  $("cpu-load").textContent = fmtPct(cpu.load);
  $("cpu-temp").textContent = fmtTemp(cpu.temp);

  $("mem-total").textContent = memory.total;
  $("mem-used").textContent = `${memory.used} (${fmtPct(memory.usedPct)})`;
  $("mem-free").textContent = memory.free;

  $("boot-time").textContent = fmtTime(uptime.boot);
  $("uptime").textContent = fmtUptime(uptime.uptimeSec);
  $("kernel").textContent = uptime.kernel || "—";
  $("node").textContent = data.versions?.node || "—";

  updateDisks(disks);
  updateContainers(docker);

  const dockerErr = document.getElementById("docker-error");
  dockerErr.textContent = meta.dockerError ? `Note: Docker info unavailable (${meta.dockerError}). Add your user to the 'docker' group.` : "";
}

function start(){
  const ev = new EventSource("/api/stream");
  ev.onmessage = (e) => {
    try { render(JSON.parse(e.data)); } catch {}
  };
  ev.addEventListener("error", () => {
    // Keep UI hint while the stream reconnects (browser retries automatically)
    document.getElementById("last-updated").textContent = "Reconnecting…";
  });
}

start();
