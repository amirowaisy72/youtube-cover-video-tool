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

function getZoom() { return parseFloat(document.getElementById("zoom").value) || 1; }

function clampPan() {
  const zoom = getZoom();
  const max = (zoom - 1) / 2 * 100;
  panX = Math.max(-max, Math.min(max, panX));
  panY = Math.max(-max, Math.min(max, panY));
  if (zoom <= 1.01) { panX = 0; panY = 0; }
}

function setZoomValue(z) {
  z = Math.max(1, Math.min(2, z));
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
  // Video is sized at zoom x the box and offset by pan, inside an
  // overflow-hidden box. object-fit: contain fits the WHOLE video
  // inside the box at 1.0x (no cropping, no false zoom), matching
  // the final FFmpeg scale=decrease + centred overlay, so live
  // and final match. At higher zoom the box clips the bigger video.
  video.style.position = liveCover ? "absolute" : "";
  video.style.width = (zoom * 100) + "%";
  video.style.height = (zoom * 100) + "%";
  video.style.left = (-(zoom - 1) / 2 * 100 + panX) + "%";
  video.style.top = (-(zoom - 1) / 2 * 100 + panY) + "%";
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
      jobId, selectedCoverId, flip, panX, panY, downloadReady,
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
    flip = saved.flip !== undefined ? !!saved.flip : true;
    document.getElementById("flip-state").textContent = "Flip: " + (flip ? "on" : "off");
    panX = saved.panX || 0; panY = saved.panY || 0;
    document.getElementById("job-info").textContent = "Job: " + jobId + " — " + job.status + " (restored after refresh).";
    renderTimeline(job);
    renderProcessLog(job);
    if (job.status === "downloading") {
      startDownloadPolling(jobId);
    } else if (job.status === "processing") {
      document.getElementById("process-progress-wrap").hidden = false;
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
  document.getElementById("voice-enabled").checked = !!s.voice_enabled;
  document.getElementById("voice-pitch").value = s.voice_pitch_factor;
  document.getElementById("voice-pitch-value").textContent = s.voice_pitch_factor;
  document.getElementById("speed").value = s.default_speed;
  document.getElementById("speed-value").textContent = s.default_speed + "x";
  greenRect = s.green_rect || greenRect;
  updateLivePreview();
}

async function loadYoutubeStatus() {
  try {
    const s = await api("/api/youtube/status");
    document.getElementById("yt-status").textContent = "YouTube: " + s.message;
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
  document.getElementById("btn-auto-close").hidden = true;
  document.getElementById("auto-error").hidden = true;
}
function closeAutoPopup() {
  document.getElementById("auto-overlay").hidden = true;
  document.body.classList.remove("auto-open");
  if (autoTimer) clearInterval(autoTimer);
}
document.getElementById("btn-auto-close").addEventListener("click", closeAutoPopup);
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
          document.getElementById("btn-auto-close").hidden = false;
          document.getElementById("auto-stage-text").textContent = AUTO_STAGES.done;
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

function startProcessPolling(id, previewUrl) {
  const wrap = document.getElementById("process-progress-wrap");
  const bar = document.getElementById("process-progress-bar");
  const text = document.getElementById("process-progress-text");
  wrap.hidden = false;
  if (processTimer) clearInterval(processTimer);
  processTimer = setInterval(async () => {
    try {
      const job = await api("/api/jobs/" + id);
      renderTimeline(job);
      renderProcessLog(job);
      const pct = job.process_progress || 0;
      bar.style.width = pct + "%";
      const elapsed = job.process_elapsed ? ` • ${Math.round(job.process_elapsed)}s elapsed` : "";
      const eta = job.process_eta ? ` • about ${Math.round(job.process_eta)}s left` : "";
      text.textContent = `${job.process_stage || "Processing…"} ${pct}%${elapsed}${eta}`;
      if (job.status === "processed") {
        clearInterval(processTimer);
        bar.style.width = "100%";
        text.textContent = "Done 100% — preview ready.";
        const player = document.getElementById("preview-player");
        player.src = previewUrl + "?t=" + Date.now();
        player.load();
        setStatus("Done. Preview below — check it before downloading.");
      } else if (job.status === "failed") {
        clearInterval(processTimer);
        setStatus("Processing failed: " + (job.error || "unknown error"));
      }
    } catch (err) {
      clearInterval(processTimer);
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
      }),
    });
    startProcessPolling(jobId, data.preview_url);
  } catch (err) {
    setStatus("Processing failed: " + err.message);
  }
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

document.getElementById("btn-save-settings").addEventListener("click", async () => {
  try {
    await api("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        default_speed: parseFloat(document.getElementById("set-speed").value),
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
