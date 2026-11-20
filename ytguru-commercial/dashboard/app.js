// YT Guru Master Dashboard — SCAFFOLD (Phase 1).
// Wires the static page in index.html to the license-server
// /admin/* endpoints. No mock data is faked: every section shows
// "No data yet" until the real server answers.

const API = ""; // same origin — the license server serves this page
let adminToken = null; // kept in memory only, never localStorage

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { Authorization: "Bearer " + adminToken } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function showTab(name) {
  document.querySelectorAll("nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll("main section").forEach((s) =>
    s.classList.toggle("active", s.id === name));
  if (name === "overview") loadOverview();
  if (name === "customers") loadCustomers();
  if (name === "usage") loadUsage();
  if (name === "ledger") loadLedger();
  if (name === "credits") loadSettings();
}

document.querySelectorAll("nav button").forEach((b) =>
  b.addEventListener("click", () => showTab(b.dataset.tab)));

document.getElementById("btn-login").addEventListener("click", async () => {
  const msg = document.getElementById("login-msg");
  try {
    const data = await api("/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: document.getElementById("admin-user").value,
        password: document.getElementById("admin-pass").value,
      }),
    });
    adminToken = data.token;
    document.getElementById("login").classList.remove("active");
    showTab("overview");
  } catch (e) {
    msg.textContent = "Login failed: " + e.message;
  }
});

async function loadOverview() {
  try {
    const d = await api("/admin/overview");
    document.getElementById("stat-customers").textContent = d.total_customers;
    document.getElementById("stat-issued").textContent = d.credits_issued;
    document.getElementById("stat-spent").textContent = d.credits_spent;
    document.getElementById("stat-out").textContent = d.credits_outstanding;
    document.getElementById("stat-videos").textContent = d.videos_completed;
    document.getElementById("recent-jobs").innerHTML = (d.recent_jobs || [])
      .map((j) => `<tr><td>${j.customer_id}</td><td>${j.tool}</td>
        <td>${escapeHtml(j.topic || j.title || "")}</td><td>${j.credits}</td>
        <td>${new Date(j.created_at * 1000).toLocaleString()}</td></tr>`)
      .join("") || '<tr><td colspan="5" class="muted">No videos yet.</td></tr>';
  } catch (e) { /* TODO: show error banner */ }
}

function byToolText(byTool) {
  return Object.entries(byTool || {})
    .map(([t, n]) => t + ": " + n).join(", ") || "—";
}

async function loadUsage() {
  try {
    const d = await api("/admin/usage");
    document.getElementById("usage-customers").innerHTML = (d.by_customer || [])
      .map((c) => `<tr><td>${escapeHtml(c.name || c.customer_id)}${c.email ? "<br><span class='muted'>" + escapeHtml(c.email) + "</span>" : ""}</td>
        <td>${c.total}</td><td>${escapeHtml(byToolText(c.by_tool))}</td>
        <td>${c.credits_spent}</td>
        <td>${c.last_active ? new Date(c.last_active * 1000).toLocaleString() : "—"}</td></tr>`)
      .join("") || '<tr><td colspan="5" class="muted">No usage yet.</td></tr>';
    document.getElementById("usage-devices").innerHTML = (d.unregistered || [])
      .map((u) => `<tr><td>${escapeHtml(u.device_fp)}</td>
        <td>${u.total}</td><td>${escapeHtml(byToolText(u.by_tool))}</td>
        <td>${u.last_active ? new Date(u.last_active * 1000).toLocaleString() : "—"}</td></tr>`)
      .join("") || '<tr><td colspan="4" class="muted">No unregistered devices yet.</td></tr>';
    document.getElementById("usage-recent").innerHTML = (d.recent || [])
      .map((u) => `<tr><td>${new Date(u.created_at * 1000).toLocaleString()}</td>
        <td>${escapeHtml(u.customer_name || u.device_fp || "—")}</td>
        <td>${escapeHtml(u.tool)}</td>
        <td>${escapeHtml(u.topic || u.title || "")}</td>
        <td>${escapeHtml(u.status)}</td></tr>`)
      .join("") || '<tr><td colspan="5" class="muted">No usage yet.</td></tr>';
  } catch (e) { /* TODO: show error banner */ }
}

async function loadCustomers() {
  try {
    const d = await api("/admin/customers");
    document.getElementById("customer-rows").innerHTML = d.customers
      .map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.email || "")}</td>
        <td>${c.balance}</td><td>${c.videos}</td>
        <td><button class="btn" onclick="openCustomer('${c.id}')">Open</button></td></tr>`)
      .join("") || '<tr><td colspan="5" class="muted">No customers yet.</td></tr>';
  } catch (e) { /* TODO: show error banner */ }
}

async function openCustomer(id) {
  const d = await api("/admin/customers/" + id);
  const el = document.getElementById("customer-detail");
  el.innerHTML =
    "<h3>" + escapeHtml(d.name) + " — balance " + d.balance + "</h3>" +
    "<p class='muted'>Email: " + escapeHtml(d.email || "—") +
    " · Videos: " + d.history.length +
    " · Usage: " + (d.usage || []).length + " jobs" +
    (d.usage_by_tool ? " (" + escapeHtml(byToolText(d.usage_by_tool)) + ")" : "") + "</p>" +
    ((d.usage || []).length ? "<h3>Recent usage</h3><table><thead><tr><th>When</th><th>Tool</th><th>Title / topic</th><th>Status</th></tr></thead><tbody>" +
      d.usage.slice(0, 20).map((u) => `<tr><td>${new Date(u.created_at * 1000).toLocaleString()}</td>
        <td>${escapeHtml(u.tool)}</td><td>${escapeHtml(u.topic || u.title || "")}</td>
        <td>${escapeHtml(u.status)}</td></tr>`).join("") + "</tbody></table>" : "") +
    "<div class='form-box'>" +
    "<h3 style='margin-top:0'>Add / remove credits</h3>" +
    "<label>Credits <input id='cc-delta' type='number' placeholder='+10 to add, -5 to remove'></label>" +
    "<label>Reason <input id='cc-reason' placeholder='e.g. bought 10 credits'></label>" +
    "<button class='btn' id='btn-change-credits'>Update credits</button>" +
    "<p class='muted' id='credits-msg'></p></div>";
  document.getElementById("btn-change-credits").addEventListener("click", async () => {
    const msg = document.getElementById("credits-msg");
    const delta = +document.getElementById("cc-delta").value;
    if (!delta) { msg.textContent = "Enter a non-zero number: +10 to add, -5 to remove."; return; }
    msg.textContent = "Updating…";
    try {
      const r = await api("/admin/customers/" + id + "/credits", {
        method: "POST",
        body: JSON.stringify({
          delta,
          reason: document.getElementById("cc-reason").value.trim() || "manual adjustment",
        }),
      });
      loadCustomers();
      await openCustomer(id);
      document.getElementById("credits-msg").textContent = "Done — new balance: " + r.balance + ".";
    } catch (e) { msg.textContent = "Update failed: " + e.message; }
  });
}

async function loadSettings() {
  try {
    const s = await api("/admin/settings");
    document.getElementById("set-cover").value = s.credits_per_cover_video;
    document.getElementById("set-tts").value = s.credits_per_tts;
    document.getElementById("set-av").value = s.credits_per_autovideo;
    document.getElementById("set-animator").value = s.credits_per_animator;
    document.getElementById("set-visual").value = s.credits_per_visual;
    document.getElementById("set-voiceclone").value = s.credits_per_voiceclone;
    document.getElementById("set-trial").value = s.trial_credits;
    document.getElementById("set-price").value = s.price_per_credit_pkr;
    document.getElementById("set-packs").value = (s.packs || [])
      .map((p) => p.credits + ", " + p.price_pkr).join("\n");
  } catch (e) { /* TODO: show error banner */ }
  try {
    const c = await api("/v1/charging");
    document.getElementById("set-charging").checked = !!c.charging_enabled;
  } catch (e) { /* TODO: show error banner */ }
}

document.getElementById("btn-save-charging").addEventListener("click", async () => {
  const msg = document.getElementById("charging-msg");
  const on = document.getElementById("set-charging").checked;
  msg.textContent = "Saving…";
  try {
    const r = await api("/admin/charging", {
      method: "POST",
      body: JSON.stringify({ charging_enabled: on }),
    });
    msg.textContent = r.charging_enabled
      ? "Charging is ON — tools will ask for a subscription / credits within a few minutes, on already-installed tools too."
      : "Charging is OFF — everything is free again.";
  } catch (e) { msg.textContent = "Save failed: " + e.message; }
});

function parsePacks(text) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => {
      const parts = l.split(",").map((x) => +x.trim());
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error("Bad pack line (want 'credits, price'): " + l);
      }
      return { credits: parts[0], price_pkr: parts[1] };
    });
}

document.getElementById("btn-save-settings").addEventListener("click", async () => {
  const msg = document.getElementById("settings-msg");
  try {
    await api("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: {
        credits_per_cover_video: +document.getElementById("set-cover").value,
        credits_per_tts: +document.getElementById("set-tts").value,
        credits_per_autovideo: +document.getElementById("set-av").value,
        credits_per_animator: +document.getElementById("set-animator").value,
        credits_per_visual: +document.getElementById("set-visual").value,
        credits_per_voiceclone: +document.getElementById("set-voiceclone").value,
        trial_credits: +document.getElementById("set-trial").value,
        price_per_credit_pkr: +document.getElementById("set-price").value,
        packs: parsePacks(document.getElementById("set-packs").value),
      }}),
    });
    msg.textContent = "Saved — the new values apply to every customer tool on its next license check.";
  } catch (e) { msg.textContent = "Save failed: " + e.message; }
});

async function loadLedger() {
  try {
    const d = await api("/admin/ledger");
    document.getElementById("ledger-rows").innerHTML = d.ledger
      .map((r) => `<tr><td>${new Date(r.created_at * 1000).toLocaleString()}</td>
        <td>${r.customer_id}</td><td>${r.delta > 0 ? "+" : ""}${r.delta}</td>
        <td>${escapeHtml(r.reason || "")}</td></tr>`)
      .join("") || '<tr><td colspan="4" class="muted">No entries yet.</td></tr>';
  } catch (e) { /* TODO: show error banner */ }
}

document.getElementById("btn-new-customer").addEventListener("click", () => {
  document.getElementById("new-customer-form").style.display = "block";
  document.getElementById("new-key-box").style.display = "none";
  document.getElementById("new-customer-msg").textContent = "";
  document.getElementById("nc-name").focus();
});

document.getElementById("btn-cancel-customer").addEventListener("click", () => {
  document.getElementById("new-customer-form").style.display = "none";
  document.getElementById("new-customer-msg").textContent = "";
});

document.getElementById("btn-create-customer").addEventListener("click", async () => {
  const msg = document.getElementById("new-customer-msg");
  const name = document.getElementById("nc-name").value.trim();
  if (!name) { msg.textContent = "Name is required."; return; }
  msg.textContent = "Creating…";
  try {
    const d = await api("/admin/customers", {
      method: "POST",
      body: JSON.stringify({
        name,
        email: document.getElementById("nc-email").value.trim(),
        notes: document.getElementById("nc-notes").value.trim(),
      }),
    });
    // The raw key is shown ONCE — the server stores only its hash.
    document.getElementById("new-key-value").textContent = d.license_key;
    document.getElementById("new-key-meta").textContent =
      "Customer: " + name + " — trial credits: " + d.trial_credits +
      ". Send this key to the customer; it will not be shown again.";
    document.getElementById("new-key-box").style.display = "block";
    document.getElementById("new-customer-form").style.display = "none";
    msg.textContent = "";
    document.getElementById("nc-name").value = "";
    document.getElementById("nc-email").value = "";
    document.getElementById("nc-notes").value = "";
    loadCustomers();
  } catch (e) { msg.textContent = "Create failed: " + e.message; }
});

document.getElementById("btn-copy-key").addEventListener("click", async () => {
  const key = document.getElementById("new-key-value").textContent;
  const meta = document.getElementById("new-key-meta");
  try {
    await navigator.clipboard.writeText(key);
    meta.textContent = "Copied — send this key to the customer.";
  } catch (e) {
    const r = document.createRange();
    r.selectNodeContents(document.getElementById("new-key-value"));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    meta.textContent = "Copy failed — the key is selected, press Ctrl+C.";
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
