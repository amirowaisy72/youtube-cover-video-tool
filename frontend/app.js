// Plain JS frontend — no build step. All API calls go to the FastAPI
// backend that serves this page.
let jobId = "";
let flip = false;
let greenRect = { x: 0, y: 0, w: 640, h: 360 };
let liveCover = null;
let autoDetectGreen = true;

function updateLivePreview() {
  const box = document.getElementById("live-preview-box");
  const video = document.getElementById("live-video");
  const greenBox = document.getElementById("live-green-box");
  const img = document.getElementById("live-cover-img");
  const empty = document.getElementById("live-empty");
  if (!jobId) { empty.hidden = false; return; }
  empty.hidden = true;
  if (!video.src || !video.src.includes("/api/source/" + jobId)) {
    video.src = "/api/source/" + jobId;
    video.load();
  }
  video.playbackRate = parseFloat(document.getElementById("speed").value) || 1;
  const zoom = parseFloat(document.getElementById("zoom").value) || 1;
  // Zoom is a scale inside the green box (overflow hidden), so the
  // video can never spill outside the green area.
  video.style.transform = (flip ? "scaleX(-1) " : "") + `scale(${zoom})`;
  if (liveCover) {
    box.classList.add("has-cover");
    img.hidden = false;
    img.src = liveCover.path || ("/api/covers/" + liveCover.filename);
    // Position the green box inside the cover once the cover image
    // size is known; percentages keep it correct at any width.
    img.onload = () => {
      const nw = img.naturalWidth || 1280, nh = img.naturalHeight || 720;
      greenBox.style.left = (greenRect.x / nw * 100) + "%";
      greenBox.style.top = (greenRect.y / nh * 100) + "%";
      greenBox.style.width = (greenRect.w / nw * 100) + "%";
      greenBox.style.height = (greenRect.h / nh * 100) + "%";
    };
  } else {
    box.classList.remove("has-cover");
    img.hidden = true;
    greenBox.style.left = ""; greenBox.style.top = ""; greenBox.style.width = ""; greenBox.style.height = "";
  }
  const voiceOn = document.getElementById("voice-enabled").checked;
  const pitch = document.getElementById("voice-pitch").value;
  document.getElementById("live-note").textContent =
    `Live: Flip ${flip ? "on" : "off"} • Speed ${document.getElementById("speed").value}x • Zoom ${zoom}x • Green ${greenRect.x},${greenRect.y} ${greenRect.w}x${greenRect.h} • Voice ${voiceOn ? "on (pitch " + pitch + ", final preview mein sunai degi)" : "off"}`;
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function renderTimeline(job) {
  const list = document.getElementById("timeline-list");
  if (!list) return;
  const entries = job.timeline || [];
  if (!entries.length) {
    const current = job.process_stage || job.status || "";
    list.innerHTML = current ? `<li class="muted">Chal raha hai: ${current}</li>`
                             : `<li class="muted">Abhi koi step complete nahi hua.</li>`;
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
      setStatus(`Green area auto-detected: ${greenRect.x},${greenRect.y} ${greenRect.w}x${greenRect.h} — video exactly isi area mein aayegi.`);
    } catch (err) {
      setStatus("Green area auto-detect nahi hui, manual rectangle istemal hoga: " + err.message);
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
    btn.append(img, span);
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
    document.getElementById("job-info").textContent = "Job: " + jobId + " — downloading…";
    startDownloadPolling(jobId);
  } catch (err) {
    setStatus("Download failed: " + err.message);
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
  updateLivePreview();
});

document.getElementById("voice-enabled").addEventListener("change", updateLivePreview);

let processTimer = null;

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
      const pct = job.process_progress || 0;
      bar.style.width = pct + "%";
      const elapsed = job.process_elapsed ? ` • ${Math.round(job.process_elapsed)}s guzar gaye` : "";
      const eta = job.process_eta ? ` • taqreeban ${Math.round(job.process_eta)}s baqi` : "";
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
    setStatus("Uploaded to YouTube.");
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

function showTab(tab) {
  const isAdmin = tab === "admin";
  document.getElementById("tab-tool").hidden = isAdmin;
  document.getElementById("tab-admin").hidden = !isAdmin;
  document.getElementById("tab-btn-tool").classList.toggle("active", !isAdmin);
  document.getElementById("tab-btn-admin").classList.toggle("active", isAdmin);
}
document.getElementById("tab-btn-tool").addEventListener("click", () => showTab("tool"));
document.getElementById("tab-btn-admin").addEventListener("click", () => showTab("admin"));

loadCovers();
loadSettings();
loadYoutubeStatus();
