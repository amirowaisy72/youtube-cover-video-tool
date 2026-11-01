// Plain JS frontend — no build step. All API calls go to the FastAPI
// backend that serves this page.
let jobId = "";
let flip = true;
let greenRect = { x: 0, y: 0, w: 640, h: 360 };
let liveCover = null;
let autoDetectGreen = true;
// Pan in percent of the green box. At zoom 1 it is forced to 0,
// so the video always fills the green box exactly; at higher zoom
// it is clamped to the excess size, so the video never leaves the box.
let panX = 0, panY = 0;
let liveVideoHidden = false;
let liveSelected = false;
// Fit mode, mutually exclusive checkboxes in Live preview:
// "cover" = Fit to green screen (default, fills box, no black area)
// "full" = Display full video (no crop, leftover area is black)
// Live preview and final video use the SAME mode, so what you see
// live is exactly what the final video will be — never live black
// but final green, or vice versa.
let fitMode = "cover";
function setFitMode(mode) {
  fitMode = mode === "full" ? "full" : "cover";
  document.getElementById("fit-cover").checked = fitMode === "cover";
  document.getElementById("fit-full").checked = fitMode === "full";
  saveState();
  updateLivePreview();
}
document.getElementById("fit-cover").addEventListener("change", (e) => {
  setFitMode(e.target.checked ? "cover" : "full");
});
document.getElementById("fit-full").addEventListener("change", (e) => {
  setFitMode(e.target.checked ? "full" : "cover");
});
// Admin fit checkboxes are also mutually exclusive pairs.
function bindFitPair(coverId, fullId) {
  const c = document.getElementById(coverId), f = document.getElementById(fullId);
  if (!c || !f) return;
  c.addEventListener("change", () => { if (c.checked) f.checked = false; else f.checked = true; });
  f.addEventListener("change", () => { if (f.checked) c.checked = false; else c.checked = true; });
}
bindFitPair("set-fit-cover", "set-fit-full");
bindFitPair("set-manual-fit-cover", "set-manual-fit-full");

function getZoom() { return parseFloat(document.getElementById("zoom").value) || 1; }

function clampPan() {
  const zoom = getZoom();
  if (zoom <= 1.01) { panX = 0; panY = 0; return; }
  const max = (zoom - 1) / 2 * 100;
  panX = Math.max(-max, Math.min(max, panX));
  panY = Math.max(-max, Math.min(max, panY));
}

function setZoomValue(z) {
  // Zoom now goes BELOW 1.0x too (0.5x–2.0x): sometimes the video
  // needs to shrink inside the green box, not only grow.
  z = Math.max(0.5, Math.min(2, z));
  document.getElementById("zoom").value = z;
  document.getElementById("zoom-value").textContent = z.toFixed(2).replace(/0$/, "") + "x";
  document.getElementById("live-zoom-value").textContent = document.getElementById("zoom-value").textContent;
  clampPan();
  updateLivePreview();
}

function applyLiveVideoLayout() {
  saveState();
  const video = document.getElementById("live-video");
  const greenBox = document.getElementById("live-green-box");
  const zoom = getZoom();
  clampPan();
  if (liveCover) {
    // Percentages are relative to the cover display size, which has
    // the same aspect as the original — no onload wait needed, so a
    // changed green rectangle moves the box immediately.
    const nw = document.getElementById("live-cover-img").naturalWidth || 1280;
    const nh = document.getElementById("live-cover-img").naturalHeight || 720;
    greenBox.style.left = (greenRect.x / nw * 100) + "%";
    greenBox.style.top = (greenRect.y / nh * 100) + "%";
    greenBox.style.width = (greenRect.w / nw * 100) + "%";
    greenBox.style.height = (greenRect.h / nh * 100) + "%";
    // Shape-accurate clip: mask the green box itself (not the video
    // element, which is zoom-sized) to the green area's actual shape,
    // so a circle/rounded/L-shaped green area shows video only
    // inside that shape, exactly like the final FFmpeg alphamerge.
    const maskUrl = liveCover.id ? ("url(/api/green-mask/" + liveCover.id + "?x=" + greenRect.x + "&y=" + greenRect.y + "&w=" + greenRect.w + "&h=" + greenRect.h + ")") : "";
    greenBox.style.maskImage = maskUrl;
    greenBox.style.webkitMaskImage = maskUrl;
    greenBox.style.maskSize = "100% 100%";
    greenBox.style.webkitMaskSize = "100% 100%";
    greenBox.style.maskRepeat = "no-repeat";
    greenBox.style.webkitMaskRepeat = "no-repeat";
    greenBox.style.maskMode = "alpha";
    greenBox.style.webkitMaskMode = "alpha";
  } else {
    greenBox.style.maskImage = "";
    greenBox.style.webkitMaskImage = "";
  }
  // Green box background is black, so any empty area inside the
  // box is black, never green — in live and in the final video.
  greenBox.style.background = "#000";
  // FIX (user, 2026-11-01): in Full mode, dragging a corner used to
  // zoom the BLACK BARS, not the video. Root cause: the video
  // element was zoom-sized with object-fit: contain, so the bars
  // were INSIDE the element and scaled with it. Fix: size the
  // element to the video's contain-fit size x zoom, with
  // object-fit: fill, so the element IS the video — no bars inside
  // it. Bars are now just empty black box background outside the
  // element, so zooming shrinks them and finally removes them,
  // exactly like the final FFmpeg scale + pad / crop. Cover mode
  // at zoom >= 1 keeps its proven cover behaviour; cover at
  // zoom < 1 uses the same fit-size logic, so the video shrinks
  // with black around it instead of revealing green.
  video.style.position = liveCover ? "absolute" : "";
  if (fitMode === "full" || zoom < 1) {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const boxAspect = greenRect.w / Math.max(1, greenRect.h);
    const vidAspect = vw / Math.max(1, vh);
    let fitW, fitH;
    if (fitMode === "full") {
      if (vidAspect >= boxAspect) { fitW = 100; fitH = 100 * boxAspect / vidAspect; }
      else { fitH = 100; fitW = 100 * vidAspect / boxAspect; }
    } else {
      if (vidAspect >= boxAspect) { fitH = 100; fitW = 100 * vidAspect / boxAspect; }
      else { fitW = 100; fitH = 100 * boxAspect / vidAspect; }
    }
    const wPct = fitW * zoom;
    const hPct = fitH * zoom;
    video.style.objectFit = "fill";
    video.style.width = wPct + "%";
    video.style.height = hPct + "%";
    video.style.left = ((100 - wPct) / 2 + panX) + "%";
    video.style.top = ((100 - hPct) / 2 + panY) + "%";
  } else {
    video.style.objectFit = "cover";
    video.style.width = (zoom * 100) + "%";
    video.style.height = (zoom * 100) + "%";
    video.style.left = (-(zoom - 1) / 2 * 100 + panX) + "%";
    video.style.top = (-(zoom - 1) / 2 * 100 + panY) + "%";
  }
  video.style.transform = flip ? "scaleX(-1)" : "none";
  video.style.display = (!jobId || liveVideoHidden) ? "none" : "block";
  greenBox.classList.toggle("selected", liveSelected && !!liveCover && !!jobId);
  document.querySelectorAll(".live-handle").forEach((h) => {
    h.hidden = !(liveSelected && !!liveCover && !!jobId);
  });
  document.getElementById("btn-live-hide").textContent =
    liveVideoHidden ? "Show video" : "Hide video — check cover";
}

function updateLivePreview() {
  const box = document.getElementById("live-preview-box");
  const video = document.getElementById("live-video");
  const greenBox = document.getElementById("live-green-box");
  const img = document.getElementById("live-cover-img");
  const empty = document.getElementById("live-empty");
  // Cover shows immediately, even before any video is downloaded:
  // any asset you choose appears on the screen right away.
  if (liveCover) {
    empty.hidden = true;
    box.classList.add("has-cover");
    img.hidden = false;
    const src = liveCover.path || ("/api/covers/" + liveCover.filename);
    if (img.src !== src && !img.src.endsWith(src)) {
      img.src = src;
      img.onload = () => applyLiveVideoLayout();
    }
  } else {
    empty.hidden = !jobId;
    box.classList.remove("has-cover");
    img.hidden = true;
    greenBox.style.left = ""; greenBox.style.top = ""; greenBox.style.width = ""; greenBox.style.height = "";
  }
  if (jobId) {
    if (!video.src || !video.src.includes("/api/source/" + jobId)) {
      video.src = "/api/source/" + jobId;
      video.load();
    }
    video.playbackRate = parseFloat(document.getElementById("speed").value) || 1;
    // No controls on the live video on purpose: the browser's black
    // control bar made the video look like a separate rectangle
    // player pasted on the cover, instead of video inside the green
    // shape. It plays automatically, muted, in a loop.
    video.play().catch(() => {});
  } else {
    video.removeAttribute("src");
    video.load();
  }
  const zoom = getZoom();
  applyLiveVideoLayout();
  const voiceOn = document.getElementById("voice-enabled").checked;
  const pitch = document.getElementById("voice-pitch").value;
  document.getElementById("live-note").textContent =
    `Live: Flip ${flip ? "on" : "off"} | Speed ${document.getElementById("speed").value}x | Zoom ${zoom}x | Pan ${panX.toFixed(0)}%, ${panY.toFixed(0)}% | Green ${greenRect.x},${greenRect.y} ${greenRect.w}x${greenRect.h} | Voice ${voiceOn ? "on (pitch " + pitch + ", heard in the final preview)" : "off"}`;
}

// Direct manipulation: drag the video to move it, click to select,
// drag a corner handle to zoom. Pointer events cover mouse + touch.
let dragState = null;
document.getElementById("live-video").addEventListener("pointerdown", (e) => {
  if (!liveCover) return;
  dragState = { type: "move", startX: e.clientX, startY: e.clientY, panX, panY, moved: false };
});
document.querySelectorAll(".live-handle").forEach((handle) => {
  handle.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    dragState = { type: "zoom", startX: e.clientX, startY: e.clientY, zoom: getZoom(), moved: false };
  });
});
window.addEventListener("pointermove", (e) => {
  if (!dragState) return;
  const box = document.getElementById("live-green-box");
  const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragState.moved = true;
  if (dragState.type === "move" && box.clientWidth) {
    panX = dragState.panX + dx / box.clientWidth * 100;
    panY = dragState.panY + dy / box.clientHeight * 100;
    applyLiveVideoLayout();
    document.getElementById("live-note").textContent =
      `Live: Zoom ${getZoom()}x | Pan ${panX.toFixed(0)}%, ${panY.toFixed(0)}%`;
  } else if (dragState.type === "zoom") {
    setZoomValue(dragState.zoom + (dx + dy) / 300);
  }
});
window.addEventListener("pointerup", (e) => {
  if (!dragState) return;
  const wasClick = !dragState.moved && dragState.type === "move";
  dragState = null;
  if (wasClick) {
    liveSelected = !liveSelected;
    applyLiveVideoLayout();
  } else {
    updateLivePreview();
  }
});

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

// Refresh persistence: the current job, cover and edits are saved
// to localStorage on every change, so a page refresh resumes exactly
// where you left off — downloading/processing polling restarts,
// the live preview, timeline and log come back, and no work is lost.
const STATE_KEY = "yt-cover-tool-state";
function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      jobId, selectedCoverId, flip, fitMode, panX, panY, downloadReady,
      url: document.getElementById("yt-url").value,
      speed: document.getElementById("speed").value,
      voiceEnabled: document.getElementById("voice-enabled").checked,
      voicePitch: document.getElementById("voice-pitch").value,
      compress: document.getElementById("compress").checked,
      zoom: document.getElementById("zoom").value,
      title: document.getElementById("yt-title").value,
      description: document.getElementById("yt-description").value,
    }));
  } catch (e) { /* private mode etc. — refresh persistence just skips */ }
}
function readSavedState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY) || "null"); }
  catch (e) { return null; }
}
function clearSavedState() {
  try { localStorage.removeItem(STATE_KEY); } catch (e) {}
}
async function restoreState() {
  const saved = readSavedState();
  if (!saved || !saved.jobId) return;
  try {
    const job = await api("/api/jobs/" + saved.jobId);
    if (!job || job.status === "unknown") { clearSavedState(); return; }
    jobId = saved.jobId;
    if (saved.url) document.getElementById("yt-url").value = saved.url;
    if (saved.speed) { document.getElementById("speed").value = saved.speed; document.getElementById("speed-value").textContent = saved.speed + "x"; }
    if (saved.voicePitch) { document.getElementById("voice-pitch").value = saved.voicePitch; document.getElementById("voice-pitch-value").textContent = saved.voicePitch; }
    if (saved.voiceEnabled !== undefined) document.getElementById("voice-enabled").checked = saved.voiceEnabled;
    if (saved.compress !== undefined) document.getElementById("compress").checked = saved.compress;
    if (saved.zoom) { document.getElementById("zoom").value = saved.zoom; document.getElementById("zoom-value").textContent = saved.zoom + "x"; document.getElementById("live-zoom-value").textContent = saved.zoom + "x"; }
    if (saved.title) document.getElementById("yt-title").value = saved.title;
    if (saved.description) document.getElementById("yt-description").value = saved.description;
    if (saved.flip !== undefined) flip = !!saved.flip;
    // else keep the Admin default set by loadSettings()
    if (saved.fitMode) setFitMode(saved.fitMode);
    document.getElementById("flip-state").textContent = "Flip: " + (flip ? "on" : "off");
    panX = saved.panX || 0; panY = saved.panY || 0;
    document.getElementById("job-info").textContent = "Job: " + jobId + " — " + job.status + " (restored after refresh).";
    showOriginalInfo(job);
    if (job.generated_title) {
      currentGenerated = job;
      const box = document.getElementById("generated-info");
      if (box) {
        box.hidden = false;
        document.getElementById("generated-title").value = job.generated_title;
        document.getElementById("generated-tags").value = (job.generated_tags || []).join(", ");
        document.getElementById("generated-description").value = job.generated_description;
      }
      document.getElementById("yt-title").value = job.generated_title;
      document.getElementById("yt-description").value = job.generated_description;
      document.getElementById("yt-tags").value = (job.generated_tags || []).join(", ");
    }
    renderTimeline(job);
    renderProcessLog(job);
    if (job.status === "downloading") {
      startDownloadPolling(jobId);
    } else if (job.status === "processing") {
      document.getElementById("process-progress-wrap").hidden = false;
      showProcessLock();
      startProcessPolling(jobId, "/api/preview/" + jobId);
    } else if (job.status === "downloaded") {
      downloadReady = true;
      document.getElementById("download-progress-wrap").hidden = false;
      document.getElementById("download-progress-bar").style.width = "100%";
      document.getElementById("download-progress-text").textContent = "Downloaded 100%.";
    } else if (job.status === "processed") {
      downloadReady = true;
      const player = document.getElementById("preview-player");
      player.src = "/api/preview/" + jobId + "?t=" + Date.now();
      player.load();
    }
    updateLivePreview();
    setStatus("Restored after refresh: " + job.status + ". Your progress was not lost.");
  } catch (e) {
    // Job may have been cleaned up — start fresh, do not block the page.
    clearSavedState();
  }
}

function renderTimeline(job) {
  const list = document.getElementById("timeline-list");
  if (!list) return;
  const entries = job.timeline || [];
  if (!entries.length) {
    const current = job.process_stage || job.status || "";
    list.innerHTML = current ? `<li class="muted">Running: ${current}</li>`
                             : `<li class="muted">No step completed yet.</li>`;
    return;
  }
  list.innerHTML = "";
  for (const t of entries) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${t.step}</strong> — ${t.duration_sec}s<br><span class="muted">${t.detail || ""}</span>`;
    list.appendChild(li);
  }
}

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || "Request failed");
  }
  return data;
}

let selectedCoverId = "";

async function selectCover(cover) {
  liveCover = cover || null;
  if (cover && autoDetectGreen) {
    try {
      const data = await api("/api/detect-green/" + cover.id);
      greenRect = data.green_rect;
      setStatus(`Green area auto-detected: ${greenRect.x},${greenRect.y} ${greenRect.w}x${greenRect.h} — video will fill exactly this area.`);
    } catch (err) {
      setStatus("Green area auto-detection failed, using the manual rectangle: " + err.message);
    }
  }
  updateLivePreview();
  selectedCoverId = cover ? cover.id : "";
  const select = document.getElementById("cover-select");
  select.value = selectedCoverId;
  const wrap = document.getElementById("cover-preview-wrap");
  if (cover) {
    wrap.hidden = false;
    document.getElementById("cover-preview").src = cover.path || ("/api/covers/" + cover.filename);
    document.getElementById("cover-selected-name").textContent = "Selected: " + (cover.display_name || cover.filename);
  } else {
    wrap.hidden = true;
  }
  document.querySelectorAll(".cover-thumb").forEach((el) => {
    el.classList.toggle("selected", el.dataset.coverId === selectedCoverId);
  });
}

async function loadCovers(autoSelectId) {
  const data = await api("/api/covers");
  const select = document.getElementById("cover-select");
  select.innerHTML = "";
  const grid = document.getElementById("cover-grid");
  grid.innerHTML = "";
  document.getElementById("cover-empty").hidden = !!data.covers.length;
  if (!data.covers.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- no covers yet --";
    select.appendChild(opt);
    selectCover(null);
    return;
  }
  for (const cover of data.covers) {
    const opt = document.createElement("option");
    opt.value = cover.id;
    opt.textContent = cover.display_name || cover.filename;
    select.appendChild(opt);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cover-thumb";
    btn.dataset.coverId = cover.id;
    const img = document.createElement("img");
    img.src = cover.path || ("/api/covers/" + cover.filename);
    img.alt = cover.display_name || cover.filename;
    const span = document.createElement("span");
    span.textContent = cover.display_name || cover.filename;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "cover-delete";
    del.textContent = "×";
    del.title = "Delete this cover";
    del.setAttribute("aria-label", "Delete cover " + (cover.display_name || cover.filename));
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete cover "${cover.display_name || cover.filename}"? This cannot be undone.`)) return;
      try {
        await api("/api/covers/" + cover.id, { method: "DELETE" });
        if (selectedCoverId === cover.id) selectedCoverId = "";
        if (liveCover && liveCover.id === cover.id) liveCover = null;
        await loadCovers();
        setStatus("Cover deleted.");
      } catch (err) {
        setStatus("Cover delete failed: " + err.message);
      }
    });
    btn.append(img, span, del);
    btn.addEventListener("click", () => selectCover(cover));
    grid.appendChild(btn);
  }
  const toSelect = data.covers.find((c) => c.id === (autoSelectId || selectedCoverId)) || data.covers[0];
  // Auto-select the newest cover on first load, so Process works
  // without the user having to guess which dropdown entry to pick.
  selectCover(toSelect);
}

document.getElementById("cover-select").addEventListener("change", async (e) => {
  const data = await api("/api/covers");
  const cover = data.covers.find((c) => c.id === e.target.value);
  selectCover(cover || null);
});

async function loadSettings() {
  const s = await api("/api/settings");
  document.getElementById("set-speed").value = s.default_speed;
  document.getElementById("set-voice-enabled").checked = !!s.voice_enabled;
  document.getElementById("set-flip").checked = s.default_flip !== false;
  document.getElementById("set-fit-cover").checked = (s.fit_mode || "cover") === "cover";
  document.getElementById("set-fit-full").checked = (s.fit_mode || "cover") === "full";
  document.getElementById("set-manual-speed").value = s.manual_speed !== undefined ? s.manual_speed : s.default_speed;
  document.getElementById("set-manual-pitch").value = s.manual_voice_pitch_factor !== undefined ? s.manual_voice_pitch_factor : s.voice_pitch_factor;
  document.getElementById("set-manual-voice-enabled").checked = s.manual_voice_enabled !== undefined ? !!s.manual_voice_enabled : !!s.voice_enabled;
  document.getElementById("set-manual-flip").checked = s.manual_flip !== undefined ? !!s.manual_flip : (s.default_flip !== false);
  document.getElementById("set-manual-fit-cover").checked = (s.manual_fit_mode || "cover") === "cover";
  document.getElementById("set-manual-fit-full").checked = (s.manual_fit_mode || "cover") === "full";
  // Manual Edit starts with Manual defaults, NOT Auto defaults.
  flip = document.getElementById("set-manual-flip").checked;
  document.getElementById("flip-state").textContent = "Flip: " + (flip ? "on" : "off");
  setFitMode((s.manual_fit_mode || "cover") === "full" ? "full" : "cover");
  document.getElementById("set-pitch").value = s.voice_pitch_factor;
  document.getElementById("set-crf").value = s.crf;
  document.getElementById("set-preset").value = s.preset;
  if (document.getElementById("set-encoder")) {
    document.getElementById("set-encoder").value = s.encoder || "libx265";
  }
  document.getElementById("set-green-x").value = s.green_rect.x;
  document.getElementById("set-green-y").value = s.green_rect.y;
  document.getElementById("set-green-w").value = s.green_rect.w;
  document.getElementById("set-green-h").value = s.green_rect.h;
  autoDetectGreen = s.auto_detect_green !== false;
  document.getElementById("set-auto-detect").checked = autoDetectGreen;
  document.getElementById("voice-enabled").checked = document.getElementById("set-manual-voice-enabled").checked;
  document.getElementById("voice-pitch").value = document.getElementById("set-manual-pitch").value;
  document.getElementById("voice-pitch-value").textContent = document.getElementById("set-manual-pitch").value;
  document.getElementById("speed").value = document.getElementById("set-manual-speed").value;
  document.getElementById("speed-value").textContent = document.getElementById("set-manual-speed").value + "x";
  greenRect = s.green_rect || greenRect;
  adminChannels = Array.isArray(s.youtube_channels) ? s.youtube_channels : [];
  renderAdminChannels();
  adminPresets = (s.profiles && typeof s.profiles === "object") ? s.profiles : {};
  renderPresets();
  showAdminTab("manual");
  updateLivePreview();
}

// Admin YouTube channels: configured in Admin, shown in Upload.
let adminChannels = [];
function renderAdminChannels() {
  const list = document.getElementById("yt-channel-list");
  if (!list) return;
  list.innerHTML = "";
  if (!adminChannels.length) {
    list.innerHTML = '<li class="muted">No channels configured yet.</li>';
    return;
  }
  adminChannels.forEach((ch, i) => {
    const li = document.createElement("li");
    li.textContent = `${ch.title} (${ch.id}) `;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-xl border border-slate-500 transition-colors whitespace-nowrap shrink-0";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      adminChannels.splice(i, 1);
      await saveAdminChannels();
    });
    li.appendChild(del);
    list.appendChild(li);
  });
}
async function saveAdminChannels() {
  const s = await api("/api/settings");
  await api("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...s, youtube_channels: adminChannels }),
  });
  renderAdminChannels();
  await loadYoutubeStatus();
}
document.getElementById("btn-add-channel").addEventListener("click", async () => {
  const name = document.getElementById("yt-channel-name").value.trim();
  const id = document.getElementById("yt-channel-id").value.trim();
  if (!name || !id) { setStatus("Enter both a channel name and a Channel ID."); return; }
  adminChannels.push({ title: name, id });
  document.getElementById("yt-channel-name").value = "";
  document.getElementById("yt-channel-id").value = "";
  await saveAdminChannels();
  setStatus("Channel added. It now shows in the Upload step.");
});
document.getElementById("btn-save-yt-credentials").addEventListener("click", async () => {
  const clientId = document.getElementById("yt-client-id").value.trim();
  const clientSecret = document.getElementById("yt-client-secret").value.trim();
  if (!clientId || !clientSecret) {
    document.getElementById("yt-credentials-result").textContent = "Enter both Client ID and Client Secret.";
    return;
  }
  try {
    await api("/api/youtube/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    });
    document.getElementById("yt-credentials-result").textContent = "Saved to client_secrets.json on this computer. Next: install the libraries and run python scripts/youtube_connect.py, then restart run.bat.";
    document.getElementById("yt-client-secret").value = "";
    await loadYoutubeStatus();
  } catch (err) {
    document.getElementById("yt-credentials-result").textContent = "Save failed: " + err.message;
  }
});

async function loadYoutubeStatus() {
  try {
    const s = await api("/api/youtube/status");
    document.getElementById("yt-status").textContent = "YouTube: " + s.message;
    const adminStatus = document.getElementById("yt-admin-status");
    if (adminStatus) {
      adminStatus.textContent = s.configured_channels && s.configured_channels.length
        ? `Configured channels: ${s.configured_channels.length}. ${s.connected ? "Google sign-in is also connected." : "Google sign-in is not connected yet — upload needs the sign-in step above."}`
        : "No channels configured yet.";
    }
    const select = document.getElementById("channel-select");
    select.innerHTML = "";
    if (!s.channels.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = s.connected ? "-- no channels found --" : "-- not connected --";
      select.appendChild(opt);
      return;
    }
    for (const ch of s.channels) {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = ch.title;
      select.appendChild(opt);
    }
  } catch (err) {
    document.getElementById("yt-status").textContent = "YouTube: " + err.message;
  }
}

let downloadReady = false;
let downloadTimer = null;

function fmtMB(bytes) {
  if (!bytes) return "0 MB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
function fmtSpeed(bytesPerSec) {
  if (!bytesPerSec) return "";
  return " • " + (bytesPerSec / 1024 / 1024).toFixed(2) + " MB/s";
}
function fmtEta(seconds) {
  if (!seconds && seconds !== 0) return "";
  return " • " + Math.round(seconds) + "s left";
}

function startDownloadPolling(id) {
  const wrap = document.getElementById("download-progress-wrap");
  const bar = document.getElementById("download-progress-bar");
  const text = document.getElementById("download-progress-text");
  wrap.hidden = false;
  downloadReady = false;
  if (downloadTimer) clearInterval(downloadTimer);
  downloadTimer = setInterval(async () => {
    try {
      const job = await api("/api/jobs/" + id);
      const pct = job.progress || 0;
      bar.style.width = pct + "%";
      if (job.total_bytes) {
        text.textContent = `Downloading… ${pct}% — ${fmtMB(job.downloaded_bytes)} / ${fmtMB(job.total_bytes)}${fmtSpeed(job.speed)}${fmtEta(job.eta)}`;
      } else {
        text.textContent = `Downloading… ${pct}% — ${fmtMB(job.downloaded_bytes)} downloaded${fmtSpeed(job.speed)}`;
      }
      renderTimeline(job);
      showOriginalInfo(job);
      if (job.status === "downloaded") {
        clearInterval(downloadTimer);
        bar.style.width = "100%";
        text.textContent = "Downloaded 100%.";
        downloadReady = true;
        updateLivePreview();
        document.getElementById("job-info").textContent = "Job: " + id + " — downloaded.";
        setStatus("Downloaded. Choose a cover and press Process video.");
      } else if (job.status === "failed") {
        clearInterval(downloadTimer);
        setStatus("Download failed: " + (job.error || "unknown error"));
      }
    } catch (err) {
      clearInterval(downloadTimer);
      setStatus("Download progress check failed: " + err.message);
    }
  }, 1000);
}

// Original metadata: after a download, show the source video's
// original title, description and tags, and prefill the upload
// form with them (title, description, tags) — the user can edit
// any of them before uploading, or leave them as-is.
function showOriginalInfo(job) {
  if (!job || !job.original_title) return;
  const box = document.getElementById("original-info");
  if (!box) return;
  box.hidden = false;
  document.getElementById("original-title").textContent = job.original_title;
  const tags = job.original_tags || [];
  document.getElementById("original-tags").textContent = tags.length ? "Tags: " + tags.join(", ") : "";
  document.getElementById("original-description").textContent = job.original_description || "";
  const titleEl = document.getElementById("yt-title");
  if (titleEl && !titleEl.value) titleEl.value = job.original_title;
  const descEl = document.getElementById("yt-description");
  if (descEl && !descEl.value) descEl.value = job.original_description || "";
  const tagsEl = document.getElementById("yt-tags");
  if (tagsEl && !tagsEl.value) tagsEl.value = tags.join(", ");
}

// Generated metadata: after the final video is ready, fetch the
// new copyright-safe title/description/tags, show them with the
// final video, and let the user double-check / edit them in the
// Upload step before anything is published. Default upload form
// uses the generated version, not the original.
let generatedVariant = 0;
let currentGenerated = null;
async function loadGeneratedMetadata(variant) {
  if (!jobId) return;
  try {
    const gen = await api("/api/generate-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, variant: variant || 0 }),
    });
    currentGenerated = gen;
    const box = document.getElementById("generated-info");
    if (box) {
      box.hidden = false;
      document.getElementById("generated-title").value = gen.generated_title;
      document.getElementById("generated-tags").value = (gen.generated_tags || []).join(", ");
      document.getElementById("generated-description").value = gen.generated_description;
    }
    // Prefill upload form with the generated version by default.
    document.getElementById("yt-title").value = gen.generated_title;
    document.getElementById("yt-description").value = gen.generated_description;
    document.getElementById("yt-tags").value = (gen.generated_tags || []).join(", ");
  } catch (e) { /* no original metadata yet — just skip */ }
}
document.getElementById("btn-regenerate").addEventListener("click", async () => {
  generatedVariant += 1;
  await loadGeneratedMetadata(generatedVariant);
});
document.getElementById("btn-use-generated").addEventListener("click", () => {
  // Use the CURRENT edited values in Step 4, not the stored generated ones,
  // so a user's own edits are what goes to upload.
  document.getElementById("yt-title").value = document.getElementById("generated-title").value;
  document.getElementById("yt-description").value = document.getElementById("generated-description").value;
  document.getElementById("yt-tags").value = document.getElementById("generated-tags").value;
  showManualStep(5);
  setStatus("Generated title, description and tags are in the upload form. Check them, then upload.");
});
["generated-title", "generated-description", "generated-tags"].forEach((id) => {
  const el = document.getElementById(id);
  const target = id === "generated-title" ? "yt-title" : id === "generated-description" ? "yt-description" : "yt-tags";
  el.addEventListener("input", () => { document.getElementById(target).value = el.value; });
});
document.getElementById("btn-use-original").addEventListener("click", async () => {
  if (!jobId) return;
  try {
    const job = await api("/api/jobs/" + jobId);
    document.getElementById("yt-title").value = job.original_title || "";
    document.getElementById("yt-description").value = job.original_description || "";
    document.getElementById("yt-tags").value = (job.original_tags || []).join(", ");
    document.getElementById("generated-title").value = job.original_title || "";
    document.getElementById("generated-description").value = job.original_description || "";
    document.getElementById("generated-tags").value = (job.original_tags || []).join(", ");
    showManualStep(5);
    setStatus("Original title, description and tags are in the upload form.");
  } catch (e) { setStatus("Could not load original metadata."); }
});

document.getElementById("btn-download").addEventListener("click", async () => {
  const url = document.getElementById("yt-url").value.trim();
  if (!url) { setStatus("Paste a YouTube link first."); return; }
  setStatus("Downloading… this can take a while for long videos.");
  try {
    const data = await api("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    jobId = data.job_id;
    saveState();
    document.getElementById("job-info").textContent = "Job: " + jobId + " — downloading…";
    startDownloadPolling(jobId);
  } catch (err) {
    setStatus("Download failed: " + err.message);
  }
});

// Auto mode: one link, popup with blur + overall progress + timeline,
// then a size summary and a Close button to see results / edit further.
let autoTimer = null;
const AUTO_STAGES = {
  downloading: "Downloading video from YouTube…",
  applying: "Applying cover, green shape, speed and voice (Admin defaults)…",
  compressing: "Compressing the finished video (smaller file, same look)…",
  preview: "Building the preview…",
  done: "Done — your finished video is ready.",
  failed: "Auto failed.",
};
function openAutoPopup() {
  document.getElementById("auto-overlay").hidden = false;
  document.body.classList.add("auto-open");
  document.getElementById("auto-summary").hidden = true;
  const dl0 = document.getElementById("auto-download-link");
  dl0.hidden = true;
  dl0.removeAttribute("href");
  document.getElementById("btn-auto-goto-final").hidden = true;
  document.getElementById("btn-auto-close").hidden = true;
  document.getElementById("auto-error").hidden = true;
}
function closeAutoPopup() {
  document.getElementById("auto-overlay").hidden = true;
  document.body.classList.remove("auto-open");
  if (autoTimer) clearInterval(autoTimer);
}
document.getElementById("btn-auto-close").addEventListener("click", closeAutoPopup);
document.getElementById("btn-auto-goto-final").addEventListener("click", () => {
  closeAutoPopup();
  showManualStep(4);
  const player = document.getElementById("preview-player");
  if (player) player.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("btn-auto").addEventListener("click", async () => {
  const url = document.getElementById("auto-url").value.trim();
  if (!url) { setStatus("Paste a YouTube link for Auto mode first."); return; }
  try {
    const data = await api("/api/auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, cover_id: selectedCoverId || null }),
    });
    jobId = data.job_id;
    saveState();
    openAutoPopup();
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(async () => {
      try {
        const job = await api("/api/jobs/" + jobId);
        const pct = job.auto_progress || 0;
        document.getElementById("auto-progress-bar").style.width = pct + "%";
        document.getElementById("auto-progress-text").textContent = pct + "%";
        document.getElementById("auto-stage-text").textContent =
          AUTO_STAGES[job.auto_stage] || (job.auto_stage || "Working…");
        const tl = document.getElementById("auto-timeline");
        tl.innerHTML = "";
        (job.timeline || []).forEach((t) => {
          const div = document.createElement("div");
          div.className = "auto-step";
          div.textContent = `✓ ${t.step} — ${t.duration_sec}s — ${t.detail || ""}`;
          tl.appendChild(div);
        });
        // Until the job is actually done, the Download button must
        // stay hidden on every poll — it used to show early because
        // the button's display CSS beat the hidden attribute.
        if (job.status !== "processed") {
          document.getElementById("auto-download-link").hidden = true;
          document.getElementById("btn-auto-goto-final").hidden = true;
        }
        if (job.status === "processed" && job.auto_summary) {
          clearInterval(autoTimer);
          const s = job.auto_summary;
          const sum = document.getElementById("auto-summary");
          sum.hidden = false;
          sum.innerHTML =
            `<b>Summary</b><br>` +
            `Downloaded video: <b>${s.downloaded_mb} MB</b><br>` +
            `After cover, voice, speed and shape: <b>${s.applied_mb} MB</b><br>` +
            `After compression (${s.encoder}, CRF ${s.crf}): <b>${s.final_mb} MB</b><br>` +
            `Saved by compression: <b>${s.saved_mb} MB (${s.saved_pct}%)</b>`;
          const dl = document.getElementById("auto-download-link");
          dl.hidden = false;
          dl.href = "/api/download/" + jobId;
          document.getElementById("btn-auto-goto-final").hidden = false;
          document.getElementById("btn-auto-close").hidden = false;
          document.getElementById("auto-stage-text").textContent = AUTO_STAGES.done;
          showOriginalInfo(job);
          loadGeneratedMetadata(0);
          // Load the finished job into the normal UI, so after Close
          // the user sees the preview and can edit further.
          downloadReady = true;
          const player = document.getElementById("preview-player");
          if (player) { player.src = "/api/preview/" + jobId + "?t=" + Date.now(); player.load(); }
          setStatus("Auto done. Close the popup to see the result and edit further.");
        } else if (job.status === "failed") {
          clearInterval(autoTimer);
          const err = document.getElementById("auto-error");
          err.hidden = false;
          err.textContent = "Auto failed: " + (job.error || "unknown error");
          document.getElementById("btn-auto-close").hidden = false;
        }
      } catch (err) {
        clearInterval(autoTimer);
        setStatus("Auto progress check failed: " + err.message);
      }
    }, 1000);
  } catch (err) {
    setStatus("Auto failed to start: " + err.message);
  }
});

async function uploadSelectedCover() {
  const file = document.getElementById("cover-file").files[0];
  if (!file) { setStatus("Choose a cover image first."); return; }
  const form = new FormData();
  form.append("file", file);
  setStatus("Uploading cover…");
  try {
    const data = await api("/api/covers", { method: "POST", body: form });
    await loadCovers(data.id);
    setStatus("Cover uploaded and selected: " + (data.display_name || file.name));
  } catch (err) {
    setStatus("Cover upload failed: " + err.message);
  }
}

document.getElementById("btn-delete-selected-cover").addEventListener("click", async () => {
  if (!selectedCoverId) return;
  const name = document.getElementById("cover-selected-name").textContent;
  if (!confirm(`Delete the selected cover? This cannot be undone.`)) return;
  try {
    await api("/api/covers/" + selectedCoverId, { method: "DELETE" });
    selectedCoverId = "";
    liveCover = null;
    await loadCovers();
    setStatus("Selected cover deleted.");
  } catch (err) {
    setStatus("Cover delete failed: " + err.message);
  }
});

document.getElementById("btn-cover-upload").addEventListener("click", uploadSelectedCover);
// Easy flow: choosing a file uploads it at once — no second click needed.
document.getElementById("cover-file").addEventListener("change", uploadSelectedCover);

document.getElementById("btn-covers-refresh").addEventListener("click", loadCovers);

document.getElementById("btn-flip").addEventListener("click", () => {
  flip = !flip;
  document.getElementById("flip-state").textContent = "Flip: " + (flip ? "on" : "off");
  updateLivePreview();
});

document.getElementById("speed").addEventListener("input", (e) => {
  document.getElementById("speed-value").textContent = e.target.value + "x";
  updateLivePreview();
});

document.getElementById("voice-pitch").addEventListener("input", (e) => {
  document.getElementById("voice-pitch-value").textContent = e.target.value;
  updateLivePreview();
});

document.getElementById("zoom").addEventListener("input", (e) => {
  document.getElementById("zoom-value").textContent = e.target.value + "x";
  document.getElementById("live-zoom-value").textContent = e.target.value + "x";
  updateLivePreview();
});
document.getElementById("btn-live-hide").addEventListener("click", () => {
  liveVideoHidden = !liveVideoHidden;
  applyLiveVideoLayout();
});
document.getElementById("live-video").addEventListener("loadedmetadata", updateLivePreview);
document.getElementById("btn-live-zoom-in").addEventListener("click", () => setZoomValue(getZoom() + 0.1));
document.getElementById("btn-live-zoom-out").addEventListener("click", () => setZoomValue(getZoom() - 0.1));

document.getElementById("voice-enabled").addEventListener("change", updateLivePreview);

let processTimer = null;
let processDetailsVisible = false;

function toggleProcessDetails() {
  processDetailsVisible = !processDetailsVisible;
  document.getElementById("process-details").hidden = !processDetailsVisible;
  document.getElementById("btn-process-details").textContent =
    processDetailsVisible ? "Hide processing details ▴" : "Show processing details ▾";
}
document.getElementById("btn-process-details").addEventListener("click", toggleProcessDetails);
document.getElementById("process-progress-wrap").addEventListener("click", (e) => {
  if (e.target.id === "btn-process-details") return;
  if (e.target.closest("#process-details")) return;
  toggleProcessDetails();
});

function renderProcessLog(job) {
  const logEl = document.getElementById("process-log");
  if (!logEl) return;
  const lines = job.process_log || [];
  if (lines.length) {
    logEl.textContent = lines.join("\n");
    if (processDetailsVisible) logEl.scrollTop = logEl.scrollHeight;
  }
}

function showProcessLock() {
  document.body.classList.add("processing-open");
  document.getElementById("process-overlay").hidden = false;
  document.getElementById("process-overlay-bar").style.width = "0%";
  document.getElementById("process-overlay-text").textContent = "Processing… 0%";
  document.getElementById("btn-process").disabled = true;
  document.getElementById("btn-process-below-preview").disabled = true;
}
function hideProcessLock() {
  document.body.classList.remove("processing-open");
  document.getElementById("process-overlay").hidden = true;
  document.getElementById("btn-process").disabled = false;
  document.getElementById("btn-process-below-preview").disabled = false;
}
function startProcessPolling(id, previewUrl) {
  const wrap = document.getElementById("process-progress-wrap");
  const bar = document.getElementById("process-progress-bar");
  const text = document.getElementById("process-progress-text");
  const overlayBar = document.getElementById("process-overlay-bar");
  const overlayText = document.getElementById("process-overlay-text");
  const overlayLog = document.getElementById("process-overlay-log");
  wrap.hidden = false;
  if (processTimer) clearInterval(processTimer);
  processTimer = setInterval(async () => {
    try {
      const job = await api("/api/jobs/" + id);
      renderTimeline(job);
      renderProcessLog(job);
      const pct = job.process_progress || 0;
      bar.style.width = pct + "%";
      overlayBar.style.width = pct + "%";
      const elapsed = job.process_elapsed ? ` • ${Math.round(job.process_elapsed)}s elapsed` : "";
      const eta = job.process_eta ? ` • about ${Math.round(job.process_eta)}s left` : "";
      text.textContent = `${job.process_stage || "Processing…"} ${pct}%${elapsed}${eta}`;
      overlayText.textContent = text.textContent;
      overlayLog.textContent = document.getElementById("process-log").textContent;
      if (job.status === "processed") {
        clearInterval(processTimer);
        bar.style.width = "100%";
        overlayBar.style.width = "100%";
        text.textContent = "Done 100% — preview ready.";
        overlayText.textContent = "Done 100% — preview ready.";
        hideProcessLock();
        const player = document.getElementById("preview-player");
        player.src = previewUrl + "?t=" + Date.now();
        player.load();
        loadGeneratedMetadata(0);
        setStatus("Done. Preview below — check it before downloading.");
      } else if (job.status === "failed") {
        clearInterval(processTimer);
        hideProcessLock();
        setStatus("Processing failed: " + (job.error || "unknown error"));
      }
    } catch (err) {
      clearInterval(processTimer);
      hideProcessLock();
      setStatus("Processing progress check failed: " + err.message);
    }
  }, 1000);
}

document.getElementById("btn-process").addEventListener("click", async () => {
  if (!jobId) { setStatus("Download a video first."); return; }
  if (!downloadReady) { setStatus("Wait — the video is still downloading. Check the progress bar above."); return; }
  const coverId = selectedCoverId || document.getElementById("cover-select").value;
  if (!coverId) { setStatus("Choose a cover first."); return; }
  setStatus("Processing… see the progress bar right here in Edit.");
  showProcessLock();
  try {
    const data = await api("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        cover_id: coverId,
        flip: flip,
        speed: parseFloat(document.getElementById("speed").value),
        voice_pitch: parseFloat(document.getElementById("voice-pitch").value),
        compress: document.getElementById("compress").checked,
        zoom: parseFloat(document.getElementById("zoom").value),
        pan_x: panX,
        pan_y: panY,
        green_rect: greenRect,
        fit_mode: fitMode,
      }),
    });
    startProcessPolling(jobId, data.preview_url);
  } catch (err) {
    hideProcessLock();
    setStatus("Processing failed: " + err.message);
  }
});

// Same Process action, from below the Live preview video, so the
// user does not have to scroll back up after checking the preview.
// Group Auto: build rows from links, one preset + upload choice each.
let groupRows = [];
let groupTimer = null;
async function getPresetNames() {
  try {
    const s = await api("/api/settings");
    return Object.keys(s.profiles || {});
  } catch { return []; }
}
document.getElementById("btn-group-build").addEventListener("click", async () => {
  const urls = document.getElementById("group-urls").value.split("\n").map((u) => u.trim()).filter(Boolean);
  if (!urls.length) { document.getElementById("group-result").textContent = "Paste at least one link first."; return; }
  const presets = await getPresetNames();
  groupRows = urls.map((url) => ({ url, preset_name: "", upload: "skip" }));
  const wrap = document.getElementById("group-rows");
  wrap.innerHTML = "";
  urls.forEach((url, i) => {
    const row = document.createElement("div");
    row.className = "flex flex-col sm:flex-row gap-3 mt-2";
    const label = document.createElement("span");
    label.className = "muted flex-1 min-w-0";
    label.textContent = `${i + 1}. ${url}`;
    label.title = url;
    const presetSel = document.createElement("select");
    presetSel.innerHTML = '<option value="">Admin defaults</option>' + presets.map((p) => `<option value="${p}">${p}</option>`).join("");
    presetSel.addEventListener("change", () => { groupRows[i].preset_name = presetSel.value || null; });
    const uploadSel = document.createElement("select");
    uploadSel.innerHTML = '<option value="skip">Do not upload — save locally</option><option value="public">Upload — Public</option><option value="private">Upload — Private</option><option value="unlisted">Upload — Unlisted (link only, not in search)</option>';
    uploadSel.addEventListener("change", () => { groupRows[i].upload = uploadSel.value; });
    row.append(label, presetSel, uploadSel);
    wrap.appendChild(row);
  });
  document.getElementById("btn-group-start").hidden = false;
  document.getElementById("group-result").textContent = `${urls.length} video(s) ready. Choose a preset and upload choice for each, then start.`;
});
document.getElementById("btn-group-start").addEventListener("click", async () => {
  if (!groupRows.length) return;
  try {
    const group = await api("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("group-name").value.trim() || "Group 1",
        items: groupRows.map((r) => ({
          url: r.url,
          preset_name: r.preset_name || null,
          cover_id: selectedCoverId || null,
          upload: r.upload || "skip",
        })),
      }),
    });
    document.getElementById("group-result").textContent = `Group "${group.name}" started. It will work through all videos by itself.`;
    if (groupTimer) clearInterval(groupTimer);
    groupTimer = setInterval(async () => {
      try {
        const g = await api("/api/groups/" + group.id);
        const list = document.getElementById("group-progress-list");
        list.innerHTML = "";
        g.items.forEach((it, i) => {
          const li = document.createElement("li");
          let text = `${i + 1}. ${it.title || it.url} — ${it.status}`;
          if (it.status === "processing") text += ` ${it.progress || 0}% ${it.stage || ""}`;
          if (it.error) text += ` — ${it.error}`;
          li.textContent = text;
          if (it.download_url) {
            const a = document.createElement("a");
            a.href = it.download_url; a.textContent = " Download final video";
            li.appendChild(a);
          }
          if (it.youtube_url) {
            const a = document.createElement("a");
            a.href = it.youtube_url; a.target = "_blank"; a.textContent = " Watch on YouTube";
            li.appendChild(a);
          }
          list.appendChild(li);
        });
        if (g.status === "done") {
          clearInterval(groupTimer);
          document.getElementById("group-result").textContent = `Group "${g.name}" done.`;
        }
      } catch (err) { clearInterval(groupTimer); }
    }, 2000);
  } catch (err) {
    document.getElementById("group-result").textContent = "Group start failed: " + err.message;
  }
});

document.getElementById("btn-process-below-preview").addEventListener("click", () => {
  document.getElementById("btn-process").click();
});

document.getElementById("btn-download-final").addEventListener("click", () => {
  if (!jobId) { setStatus("Process a video first."); return; }
  window.location.href = "/api/download/" + jobId;
});

document.getElementById("btn-delete-local-files").addEventListener("click", async () => {
  if (!jobId) { setStatus("No job to delete."); return; }
  if (!confirm("Delete all local working files for this job (source, final, preview)? Your downloaded copy in Downloads is not affected.")) return;
  try {
    await api("/api/jobs/" + jobId, { method: "DELETE" });
    document.getElementById("local-files-result").textContent = "Local working files deleted. Disk space freed.";
    clearSavedState();
    jobId = ""; downloadReady = false;
    document.getElementById("job-info").textContent = "";
    setStatus("Local files deleted. Start a new video to continue.");
  } catch (err) {
    setStatus("Local delete failed: " + err.message);
  }
});
document.getElementById("btn-start-over").addEventListener("click", () => {
  clearSavedState();
  jobId = ""; downloadReady = false;
  flip = true;
  document.getElementById("flip-state").textContent = "Flip: on";
  document.getElementById("yt-url").value = "";
  document.getElementById("job-info").textContent = "";
  document.getElementById("preview-player").removeAttribute("src");
  document.getElementById("preview-player").load();
  updateLivePreview();
  setStatus("Cleared. Paste a new YouTube link to start over.");
});

document.getElementById("btn-upload-yt").addEventListener("click", async () => {
  if (!jobId) { setStatus("Process a video first."); return; }
  const title = document.getElementById("yt-title").value.trim();
  if (!title) { setStatus("Enter a video title first."); return; }
  setStatus("Uploading to YouTube…");
  try {
    const data = await api("/api/upload-youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        title: title,
        description: document.getElementById("yt-description").value,
        tags: document.getElementById("yt-tags").value,
        privacy_status: document.getElementById("yt-privacy").value,
      }),
    });
    document.getElementById("yt-result").textContent = "Uploaded: " + (data.url || data.video_id);
    setStatus("Uploaded to YouTube. Local working files for this job were deleted to save space.");
    if (data.local_files_deleted) { clearSavedState(); }
  } catch (err) {
    document.getElementById("yt-result").textContent = "";
    setStatus("YouTube upload failed: " + err.message);
  }
});

// Admin tabs: Manual or Auto, never both scattered at once.
function showAdminTab(tab) {
  const manual = tab === "manual";
  document.getElementById("admin-manual-section").hidden = !manual;
  document.getElementById("admin-auto-section").hidden = manual;
  const btnM = document.getElementById("btn-admin-tab-manual");
  const btnA = document.getElementById("btn-admin-tab-auto");
  const primary = "btn-primary px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-sm transition-colors whitespace-nowrap shrink-0";
  const secondary = "btn px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 font-semibold rounded-xl border border-slate-500 transition-colors whitespace-nowrap shrink-0";
  btnM.className = manual ? primary : secondary;
  btnA.className = manual ? secondary : primary;
}
document.getElementById("btn-admin-tab-manual").addEventListener("click", () => showAdminTab("manual"));
document.getElementById("btn-admin-tab-auto").addEventListener("click", () => showAdminTab("auto"));

// Presets: a named snapshot of Manual + Auto + shared settings.
// Save = create or overwrite with that name (that is how you edit a
// preset: load it, change settings, Save again with the same name).
let adminPresets = {};
function readAdminSettings() {
  return {
    default_speed: parseFloat(document.getElementById("set-speed").value),
    default_flip: document.getElementById("set-flip").checked,
    fit_mode: document.getElementById("set-fit-cover").checked ? "cover" : "full",
    manual_speed: parseFloat(document.getElementById("set-manual-speed").value),
    manual_flip: document.getElementById("set-manual-flip").checked,
    manual_voice_enabled: document.getElementById("set-manual-voice-enabled").checked,
    manual_voice_pitch_factor: parseFloat(document.getElementById("set-manual-pitch").value),
    manual_fit_mode: document.getElementById("set-manual-fit-cover").checked ? "cover" : "full",
    voice_enabled: document.getElementById("set-voice-enabled").checked,
    voice_pitch_factor: parseFloat(document.getElementById("set-pitch").value),
    crf: parseInt(document.getElementById("set-crf").value, 10),
    preset: document.getElementById("set-preset").value,
    encoder: document.getElementById("set-encoder").value,
    auto_detect_green: document.getElementById("set-auto-detect").checked,
    green_rect: {
      x: parseInt(document.getElementById("set-green-x").value, 10),
      y: parseInt(document.getElementById("set-green-y").value, 10),
      w: parseInt(document.getElementById("set-green-w").value, 10),
      h: parseInt(document.getElementById("set-green-h").value, 10),
    },
  };
}
function applyAdminSettings(s) {
  document.getElementById("set-speed").value = s.default_speed;
  document.getElementById("set-pitch").value = s.voice_pitch_factor;
  document.getElementById("set-voice-enabled").checked = !!s.voice_enabled;
  document.getElementById("set-flip").checked = s.default_flip !== false;
  document.getElementById("set-fit-cover").checked = (s.fit_mode || "cover") === "cover";
  document.getElementById("set-fit-full").checked = (s.fit_mode || "cover") === "full";
  document.getElementById("set-manual-speed").value = s.manual_speed !== undefined ? s.manual_speed : s.default_speed;
  document.getElementById("set-manual-pitch").value = s.manual_voice_pitch_factor !== undefined ? s.manual_voice_pitch_factor : s.voice_pitch_factor;
  document.getElementById("set-manual-voice-enabled").checked = s.manual_voice_enabled !== undefined ? !!s.manual_voice_enabled : !!s.voice_enabled;
  document.getElementById("set-manual-flip").checked = s.manual_flip !== undefined ? !!s.manual_flip : (s.default_flip !== false);
  document.getElementById("set-manual-fit-cover").checked = (s.manual_fit_mode || "cover") === "cover";
  document.getElementById("set-manual-fit-full").checked = (s.manual_fit_mode || "cover") === "full";
  document.getElementById("set-crf").value = s.crf;
  document.getElementById("set-preset").value = s.preset;
  if (document.getElementById("set-encoder")) document.getElementById("set-encoder").value = s.encoder || "libx265";
  document.getElementById("set-auto-detect").checked = s.auto_detect_green !== false;
  if (s.green_rect) {
    document.getElementById("set-green-x").value = s.green_rect.x;
    document.getElementById("set-green-y").value = s.green_rect.y;
    document.getElementById("set-green-w").value = s.green_rect.w;
    document.getElementById("set-green-h").value = s.green_rect.h;
    greenRect = s.green_rect;
  }
  autoDetectGreen = s.auto_detect_green !== false;
  // Manual Edit follows Manual defaults, as after Save admin settings.
  flip = document.getElementById("set-manual-flip").checked;
  document.getElementById("flip-state").textContent = "Flip: " + (flip ? "on" : "off");
  document.getElementById("speed").value = document.getElementById("set-manual-speed").value;
  document.getElementById("speed-value").textContent = document.getElementById("set-manual-speed").value + "x";
  document.getElementById("voice-enabled").checked = document.getElementById("set-manual-voice-enabled").checked;
  document.getElementById("voice-pitch").value = document.getElementById("set-manual-pitch").value;
  document.getElementById("voice-pitch-value").textContent = document.getElementById("set-manual-pitch").value;
  setFitMode(document.getElementById("set-manual-fit-cover").checked ? "cover" : "full");
  updateLivePreview();
}
function renderPresets() {
  const select = document.getElementById("preset-select");
  select.innerHTML = "";
  const names = Object.keys(adminPresets);
  if (!names.length) {
    const opt = document.createElement("option");
    opt.value = ""; opt.textContent = "-- no presets yet --";
    select.appendChild(opt);
    if (!document.getElementById("preset-name").value) document.getElementById("preset-name").value = "Preset 1";
    return;
  }
  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name;
    select.appendChild(opt);
  }
}
async function savePresetsToBackend() {
  await api("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...readAdminSettings(), profiles: adminPresets }),
  });
}
document.getElementById("btn-save-preset").addEventListener("click", async () => {
  const name = document.getElementById("preset-name").value.trim();
  if (!name) { document.getElementById("preset-result").textContent = "Enter a preset name first."; return; }
  const existed = !!adminPresets[name];
  adminPresets[name] = readAdminSettings();
  try {
    await savePresetsToBackend();
    renderPresets();
    document.getElementById("preset-select").value = name;
    document.getElementById("preset-result").textContent = existed ? `Preset "${name}" updated.` : `Preset "${name}" saved.`;
  } catch (err) { document.getElementById("preset-result").textContent = "Save preset failed: " + err.message; }
});
document.getElementById("btn-load-preset").addEventListener("click", async () => {
  const name = document.getElementById("preset-select").value;
  if (!name || !adminPresets[name]) { document.getElementById("preset-result").textContent = "Choose a preset first."; return; }
  document.getElementById("preset-name").value = name;
  applyAdminSettings(adminPresets[name]);
  try {
    await savePresetsToBackend();
    document.getElementById("preset-result").textContent = `Preset "${name}" loaded and applied.`;
  } catch (err) { document.getElementById("preset-result").textContent = "Load preset failed: " + err.message; }
});
document.getElementById("btn-rename-preset").addEventListener("click", async () => {
  const oldName = document.getElementById("preset-select").value;
  const newName = document.getElementById("preset-name").value.trim();
  if (!oldName || !adminPresets[oldName]) { document.getElementById("preset-result").textContent = "Choose a preset first."; return; }
  if (!newName || newName === oldName) { document.getElementById("preset-result").textContent = "Enter a new name to rename."; return; }
  adminPresets[newName] = adminPresets[oldName];
  delete adminPresets[oldName];
  try {
    await savePresetsToBackend();
    renderPresets();
    document.getElementById("preset-select").value = newName;
    document.getElementById("preset-result").textContent = `Preset renamed to "${newName}".`;
  } catch (err) { document.getElementById("preset-result").textContent = "Rename failed: " + err.message; }
});
document.getElementById("btn-delete-preset").addEventListener("click", async () => {
  const name = document.getElementById("preset-select").value;
  if (!name || !adminPresets[name]) { document.getElementById("preset-result").textContent = "Choose a preset first."; return; }
  if (!confirm(`Delete preset "${name}"?`)) return;
  delete adminPresets[name];
  try {
    await savePresetsToBackend();
    renderPresets();
    document.getElementById("preset-result").textContent = `Preset "${name}" deleted.`;
  } catch (err) { document.getElementById("preset-result").textContent = "Delete failed: " + err.message; }
});
document.getElementById("preset-select").addEventListener("change", (e) => {
  if (e.target.value) document.getElementById("preset-name").value = e.target.value;
});

document.getElementById("btn-save-settings").addEventListener("click", async () => {
  try {
    await api("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        default_speed: parseFloat(document.getElementById("set-speed").value),
        default_flip: document.getElementById("set-flip").checked,
        fit_mode: document.getElementById("set-fit-cover").checked ? "cover" : "full",
        manual_speed: parseFloat(document.getElementById("set-manual-speed").value),
        manual_flip: document.getElementById("set-manual-flip").checked,
        manual_voice_enabled: document.getElementById("set-manual-voice-enabled").checked,
        manual_voice_pitch_factor: parseFloat(document.getElementById("set-manual-pitch").value),
        manual_fit_mode: document.getElementById("set-manual-fit-cover").checked ? "cover" : "full",
        voice_enabled: document.getElementById("set-voice-enabled").checked,
        voice_pitch_factor: parseFloat(document.getElementById("set-pitch").value),
        crf: parseInt(document.getElementById("set-crf").value, 10),
        preset: document.getElementById("set-preset").value,
        encoder: document.getElementById("set-encoder").value,
        auto_detect_green: document.getElementById("set-auto-detect").checked,
        green_rect: {
          x: parseInt(document.getElementById("set-green-x").value, 10),
          y: parseInt(document.getElementById("set-green-y").value, 10),
          w: parseInt(document.getElementById("set-green-w").value, 10),
          h: parseInt(document.getElementById("set-green-h").value, 10),
        },
      }),
    });
    document.getElementById("settings-result").textContent = "Settings saved.";
    // Manual Edit follows Manual defaults after save, Auto follows Auto defaults.
    flip = document.getElementById("set-manual-flip").checked;
    document.getElementById("flip-state").textContent = "Flip: " + (flip ? "on" : "off");
    document.getElementById("speed").value = document.getElementById("set-manual-speed").value;
    document.getElementById("speed-value").textContent = document.getElementById("set-manual-speed").value + "x";
    document.getElementById("voice-enabled").checked = document.getElementById("set-manual-voice-enabled").checked;
    document.getElementById("voice-pitch").value = document.getElementById("set-manual-pitch").value;
    document.getElementById("voice-pitch-value").textContent = document.getElementById("set-manual-pitch").value;
    setFitMode(document.getElementById("set-manual-fit-cover").checked ? "cover" : "full");
    autoDetectGreen = document.getElementById("set-auto-detect").checked;
    if (!autoDetectGreen) {
      greenRect = {
        x: parseInt(document.getElementById("set-green-x").value, 10),
        y: parseInt(document.getElementById("set-green-y").value, 10),
        w: parseInt(document.getElementById("set-green-w").value, 10),
        h: parseInt(document.getElementById("set-green-h").value, 10),
      };
    } else if (liveCover) {
      // Re-detect for the current cover with the new setting on.
      await selectCover(liveCover);
      return;
    }
    updateLivePreview();
  } catch (err) {
    document.getElementById("settings-result").textContent = "Save failed: " + err.message;
  }
});

// Manual mode, step by step: only one manual step is visible at a
// time, so the user never sees the whole long form at once.
// Step 1 Download, 2 Cover, 3 Edit & live preview, 4 Timeline +
// Preview & download, 5 Upload to YouTube. Auto mode stays above
// the wizard as its own short card.
const MANUAL_STEPS = [
  "Download video",
  "Choose cover",
  "Edit & live preview",
  "Preview & download",
  "Upload to YouTube",
];
let manualStep = 1;
function showManualStep(n) {
  manualStep = Math.max(1, Math.min(MANUAL_STEPS.length, n));
  document.querySelectorAll(".manual-step").forEach((el) => {
    el.hidden = parseInt(el.dataset.manualStep, 10) !== manualStep;
  });
  const ind = document.getElementById("manual-step-indicator");
  if (ind) ind.textContent = `Step ${manualStep} of ${MANUAL_STEPS.length}: ${MANUAL_STEPS[manualStep - 1]}`;
  const bar = document.getElementById("manual-step-bar");
  if (bar) bar.style.width = (manualStep / MANUAL_STEPS.length * 100) + "%";
  const head = document.querySelector(".manual-wizard-head");
  if (head) head.scrollIntoView({ behavior: "smooth", block: "start" });
}
function manualNext() {
  if (manualStep === 1 && !downloadReady) {
    setStatus(jobId ? "Wait — the video is still downloading. Check the progress bar above." : "Download a video first, then press Next.");
    return;
  }
  if (manualStep === 2 && !selectedCoverId) {
    setStatus("Choose a cover first, then press Next.");
    return;
  }
  showManualStep(manualStep + 1);
}
function buildManualNav() {
  document.querySelectorAll(".manual-step").forEach((el) => {
    const n = parseInt(el.dataset.manualStep, 10);
    const nav = document.createElement("div");
    nav.className = "flex flex-wrap gap-3 mt-4";
    if (n > 1) {
      const back = document.createElement("button");
      back.type = "button";
      back.className = "btn px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 font-semibold rounded-xl border border-slate-500 transition-colors whitespace-nowrap shrink-0";
      back.textContent = "← Back";
      back.addEventListener("click", () => showManualStep(n - 1));
      nav.appendChild(back);
    }
    if (n < MANUAL_STEPS.length) {
      const next = document.createElement("button");
      next.type = "button";
      next.className = "btn-primary px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-sm transition-colors whitespace-nowrap shrink-0";
      next.textContent = `Next: ${MANUAL_STEPS[n]} →`;
      next.addEventListener("click", manualNext);
      nav.appendChild(next);
    }
    el.appendChild(nav);
  });
  showManualStep(1);
}
buildManualNav();

function showTab(tab) {
  const isAdmin = tab === "admin";
  document.getElementById("tab-tool").hidden = isAdmin;
  document.getElementById("tab-admin").hidden = !isAdmin;
  document.getElementById("tab-btn-tool").classList.toggle("active", !isAdmin);
  document.getElementById("tab-btn-admin").classList.toggle("active", isAdmin);
}
document.getElementById("tab-btn-tool").addEventListener("click", () => showTab("tool"));
document.getElementById("tab-btn-admin").addEventListener("click", () => showTab("admin"));

(async () => {
  await loadSettings();
  const saved = readSavedState();
  await loadCovers(saved && saved.selectedCoverId ? saved.selectedCoverId : undefined);
  // loadCovers auto-selects; restoreState then re-applies the saved
  // job, cover and edits, and restarts any in-progress polling.
  await restoreState();
  loadYoutubeStatus();
})();
