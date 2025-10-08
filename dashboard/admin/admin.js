//auth + services table + env editor

const TOK_KEY = "brp.jwt";

function getToken() {
  return sessionStorage.getItem(TOK_KEY);
}
function setToken(t) {
  if (t) sessionStorage.setItem(TOK_KEY, t);
  else sessionStorage.removeItem(TOK_KEY);
}



async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(path, {
    credentials: "same-origin", // harmless; we’re not using cookies now
    headers,
    ...opts,
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { status: r.status, data });
  return data;
}





function showLogin(show) {
  document.getElementById("login-modal").style.display = show ? "flex" : "none";
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else n.setAttribute(k, v);
  });
  children.forEach((c) => n.appendChild(c));
  return n;
}

function renderProtectedShell() {
  const root = document.getElementById("admin-root");
  root.innerHTML = "";

  const wrap = el("section", { class: "card" });
  const header = el("div", { class: "row" }, [
    el("h2", { text: "Services" }),
    el("div", { class: "row gap" }, [
      el("button", { class: "btn", id: "btn-refresh", text: "Refresh", type: "button" }),
      el("button", { class: "btn ghost", id: "btn-logout", text: "Logout", type: "button" }),
    ]),
  ]);
  const table = el("table", { id: "svc-table" });
  table.innerHTML = `
    <thead><tr>
      <th scope="col">Service</th>
      <th scope="col">Status</th>
      <th scope="col">Actions</th>
      <th scope="col">.env</th>
    </tr></thead>
    <tbody></tbody>
  `;

  wrap.appendChild(header);
  wrap.appendChild(table);
  root.appendChild(wrap);

  async function load() {
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = `<tr class="table-message"><td colspan="4"><span class="table-state muted">Loading…</span></td></tr>`;
    try {
      const data = await api("/api/admin/services");
      const services = data.services || [];
      tbody.innerHTML = "";
      if (!services.length) {
        tbody.innerHTML = `<tr class="table-message"><td colspan="4"><span class="table-state muted">No services reported yet.</span></td></tr>`;
        return;
      }

      services.forEach(s => {
        const status = s.running === true ? ["ok", "Running"]
                    : s.running === false ? ["neutral", "Stopped"]
                    : ["neutral", "Unknown"];
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${s.label}</td>
          <td><span class="chip ${status[0]}">${status[1]}</span></td>
          <td>
            <div class="row gap">
              <button class="btn" type="button" data-act="start"   data-id="${s.id}">Start</button>
              <button class="btn" type="button" data-act="stop"    data-id="${s.id}">Stop</button>
              <button class="btn" type="button" data-act="restart" data-id="${s.id}">Restart</button>
            </div>
          </td>
          <td>
            <button class="btn" type="button" data-edit="${s.id}">${s.hasEnv ? "Edit Env" : "Create Env"}</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr class="table-message"><td colspan="4"><span class="table-state muted">Failed: ${e?.data?.error || e.message}</span></td></tr>`;
    }
  }

  table.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");
    const editId = btn.getAttribute("data-edit");

    if (act && id) {
      btn.disabled = true;
      try {
        await api(`/api/admin/services/${id}/${act}`, { method: "POST" });
        await load();
      } catch (e) {
        alert(e?.data?.error || e.message);
      } finally {
        btn.disabled = false;
      }
    }

    if (editId) openEnvEditor(editId);
  });

  document.getElementById("btn-refresh").onclick = load;
  document.getElementById("btn-logout").onclick = async () => {
    try { await api("/api/logout", { method: "POST" }); }
    finally { setToken(null); location.reload(); }
  };

  load();
}


async function checkAuth() {
  try {
    const me = await api("/api/me");
    return !!me.auth;
  } catch {
    return false;
  }
}





async function loginFlow() {
  const pw = document.getElementById("pw");
  const err = document.getElementById("login-err");
  err.textContent = "";

  const password = pw.value.trim();
  if (!password) { err.textContent = "Please enter your password."; return; }

  try {
    const { token } = await api("/api/login", { method: "POST", body: JSON.stringify({ password }) });
    setToken(token);
    showLogin(false);
    renderProtectedShell();
  } catch (e) {
    err.textContent = e?.data?.error || "Login failed";
  }
}






function wireUi() {
  const btnLogin = document.getElementById("btn-login");
  const btnCancel = document.getElementById("btn-cancel");

  btnLogin.onclick = loginFlow;
  btnCancel.onclick = () => (location.href = "/");
  document.getElementById("pw").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") loginFlow();
  });
}

(async function main() {
  wireUi();
  const authed = await checkAuth();
  if (authed) renderProtectedShell();
  else showLogin(true);
})();

async function openEnvEditor(id) {
  let meta;
  try { meta = await api(`/api/admin/services/${id}/env`); }
  catch (e) { return alert(e?.data?.error || e.message); }

  const modal = el("div", { class: "modal" });
  const panel = el("div", { class: "panel" });
  const title = el("h3", { text: `Edit .env (${id})` });
  const ta = el("textarea");
  ta.value = meta.text || "";
  const info = el("div", { class: "muted", text: meta.exists ? meta.path : "(file will be created on save)" });

  const row = el("div", { class: "row gap", style: "margin-top:12px" }, [
    el("button", { class: "btn ghost", id: "env-cancel", text: "Cancel", type: "button" }),
    el("button", { class: "btn ok", id: "env-save", text: "Save", type: "button" }),
  ]);
  panel.appendChild(title); panel.appendChild(info); panel.appendChild(ta); panel.appendChild(row);
  modal.appendChild(panel); document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById("env-cancel").onclick = close;
  document.getElementById("env-save").onclick = async () => {
    try {
      await api(`/api/admin/services/${id}/env`, {
        method: "PUT",
        body: JSON.stringify({ text: ta.value }),
      });
      close();
      const btnRefresh = document.getElementById("btn-refresh");
      if (btnRefresh) btnRefresh.click();
    } catch (e) {
      alert(e?.data?.error || e.message);
    }
  };
}