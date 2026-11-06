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
let liveOutline = false;
let liveVideoError = false;
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

function clampPan(wPct, hPct) {
  const zoom = getZoom();
  if (zoom <= 1.01) { panX = 0; panY = 0; return; }
  // FIX (user, 2026-11-02): the old clamp allowed pan up to
  // (zoom-1)/2*100 in BOTH directions, whatever the video's
  // actual size in the box was. In Full mode that is wrong:
  // at 1.2x a 16:9 video is 120% wide but only 89% tall in a
  // 1.32:1 box, so the true vertical room is only (100-89)/2
  // = 5.5%, not 10%. Live let the user drag to 10% (video
  // partly outside the box), final could not follow it, and
  // placement differed. Now the clamp is exact, from the
  // video's actual size in the box: |pan| <= |100 - size%|/2
  // in each direction. Callers that know the size pass it;
  // others fall back to the old zoom-only bound, and the
  // layout pass below re-clamps exactly anyway.
  const maxX = wPct === undefined ? (zoom - 1) / 2 * 100 : Math.abs(100 - wPct) / 2;
  const maxY = hPct === undefined ? (zoom - 1) / 2 * 100 : Math.abs(100 - hPct) / 2;
  panX = Math.max(-maxX, Math.min(maxX, panX));
  panY = Math.max(-maxY, Math.min(maxY, panY));
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

// Stale-final warning (user, 2026-11-01): live and final looked
// different because live settings can change AFTER a process, and
// the old final preview stays on screen with no warning. The
// encode itself matches live (verified with stripe markers for
// cover/full, zoom 1.0–2.0, pan 0–17.5%, and a circular mask).
// So track the settings the last successful process used; if live
// changes afterwards, show a clear warning until Process is
// pressed again — that press is what makes final match live.
let lastProcessedKey = null;
function currentLiveKey() {
  return [getZoom(), panX.toFixed(1), panY.toFixed(1), fitMode, flip,
          document.getElementById("speed").value].join("|");
}
function updateStaleWarning() {
  const el = document.getElementById("live-stale-warning");
  if (!el) return;
  el.hidden = !(lastProcessedKey && lastProcessedKey !== currentLiveKey());
  updateFinalStaleWarning();
}

// Final-settings display (user, 2026-11-02): live vs final looked
// different, and Step 4 showed no clue why. Now Step 4 always
// shows exactly which settings the final was processed with, and
// the same stale warning as Step 3, so a difference after changing
// live settings is explained instead of looking like a bug.
let processedSettings = null;
function updateFinalSettings(job) {
  if (!job || job.zoom === undefined) return;
  const gr = job.green_rect_used || {};
  processedSettings = {
    flip: job.flip, speed: job.speed, zoom: job.zoom,
    pan_x: job.pan_x, pan_y: job.pan_y, fit_mode: job.fit_mode,
    green_rect: job.green_rect_used || null,
    voice_pitch: job.voice_pitch,
  };
  const el = document.getElementById("final-settings");
  if (el) {
    el.textContent = `Final was processed with: Flip ${job.flip ? "on" : "off"} | Speed ${job.speed || 1}x | Zoom ${job.zoom}x | Pan ${job.pan_x || 0}%, ${job.pan_y || 0}% | Fit ${job.fit_mode || "cover"} | Green ${gr.x || 0},${gr.y || 0} ${gr.w || 0}x${gr.h || 0}. Compare these with the Live note in Step 3 — if they differ, the final is from older settings.`;
  }
  updateFinalStaleWarning();
}
function updateFinalStaleWarning() {
  const el = document.getElementById("final-stale-warning");
  if (!el) return;
  el.hidden = !(lastProcessedKey && lastProcessedKey !== currentLiveKey());
}

// Save a finished video's effects as a named preset (user,
// 2026-11-07): the effects this final was processed with —
// flip, speed, zoom, pan, fit, green area, voice pitch, plus
// the current encoder/CRF/ffmpeg preset — become a preset
// under the name typed here, so the same look can be reused
// on the next video. Profiles are re-fetched first, so saving
// here can never wipe presets the Admin page has not loaded.
document.getElementById("btn-save-job-preset").addEventListener("click", async () => {
  const result = document.getElementById("save-preset-result");
  const name = document.getElementById("save-preset-name").value.trim();
  if (!name) { result.textContent = "Enter a preset name first."; return; }
  if (!processedSettings) { result.textContent = "Process a video first — there are no finished-video effects to save yet."; return; }
  try {
    const s = await api("/api/settings");
    adminPresets = (s.profiles && typeof s.profiles === "object") ? s.profiles : {};
    const wasExisting = !!adminPresets[name];
    const base = readAdminSettings();
    const preset = {
      ...base,
      default_speed: processedSettings.speed,
      manual_speed: processedSettings.speed,
      default_flip: processedSettings.flip,
      manual_flip: processedSettings.flip,
      fit_mode: processedSettings.fit_mode,
      manual_fit_mode: processedSettings.fit_mode,
      // The saved green area is used as-is: auto-detect off, or
      // the next video would re-detect and ignore this rectangle.
      green_rect: processedSettings.green_rect || base.green_rect,
      auto_detect_green: false,
      manual_zoom: processedSettings.zoom,
      manual_pan_x: processedSettings.pan_x,
      manual_pan_y: processedSettings.pan_y,
    };
    if (processedSettings.voice_pitch !== undefined && processedSettings.voice_pitch !== null) {
      preset.voice_pitch_factor = processedSettings.voice_pitch;
      preset.manual_voice_pitch_factor = processedSettings.voice_pitch;
    }
    adminPresets[name] = preset;
    await savePresetsToBackend();
    renderPresetList();
    result.textContent = `Preset "${name}" saved${wasExisting ? " (overwrote the old one)" : ""} — open it in Admin settings to set it as Active.`;
  } catch (err) { result.textContent = "Save failed: " + err.message; }
});
function applyLiveVideoLayout() {
  updateStaleWarning();
  saveState();
  const video = document.getElementById("live-video");
  const greenBox = document.getElementById("live-green-box");
  const zoom = getZoom();
  clampPan();
  if (liveCover) {
    // Percentages are relative to the cover display size, which has
    // the same aspect as the original — no onload wait needed, so a
    // changed green rectangle moves the box immediately.
    // A video cover reports its size from videoWidth/Height (once
    // its metadata is loaded); an image cover from naturalWidth/Height.
    const coverVid = document.getElementById("live-cover-video");
    const nw = liveCover.is_video
      ? (coverVid.videoWidth || 1280)
      : (document.getElementById("live-cover-img").naturalWidth || 1280);
    const nh = liveCover.is_video
      ? (coverVid.videoHeight || 720)
      : (document.getElementById("live-cover-img").naturalHeight || 720);
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
    clampPan(wPct, hPct);
    video.style.objectFit = "fill";
    video.style.width = wPct + "%";
    video.style.height = hPct + "%";
    video.style.left = ((100 - wPct) / 2 + panX) + "%";
    video.style.top = ((100 - hPct) / 2 + panY) + "%";
  } else {
    clampPan(zoom * 100, zoom * 100);
    video.style.objectFit = "cover";
    video.style.width = (zoom * 100) + "%";
    video.style.height = (zoom * 100) + "%";
    video.style.left = (-(zoom - 1) / 2 * 100 + panX) + "%";
    video.style.top = (-(zoom - 1) / 2 * 100 + panY) + "%";
  }
  video.style.transform = flip ? "scaleX(-1)" : "none";
  video.style.display = (!jobId || liveVideoHidden) ? "none" : "block";
  // Green-area outline: same position/size as the green box, but
  // unmasked, so it stays visible even when a wrong mask hides
  // the video (the user's 2026-11-01 bug: video downloaded but
  // nothing showed on the green screen, with no clue where it went).
  const outline = document.getElementById("live-green-outline");
  if (outline) {
    outline.hidden = !(liveOutline && !!liveCover);
    if (liveCover) {
      outline.style.left = greenBox.style.left;
      outline.style.top = greenBox.style.top;
      outline.style.width = greenBox.style.width;
      outline.style.height = greenBox.style.height;
    }
  }
  updateLiveVideoStatus();
  greenBox.classList.toggle("selected", liveSelected && !!liveCover && !!jobId);
  document.querySelectorAll(".live-handle").forEach((h) => {
    h.hidden = !(liveSelected && !!liveCover && !!jobId);
  });
  document.getElementById("btn-live-hide").textContent =
    liveVideoHidden ? "Show video" : "Hide video — check cover";
  // Save again after the exact clamp above, so a clamped pan is
  // what Process sends and what a refresh restores — not the
  // pre-clamp drag value saved at the top of this function.
  saveState();
}

function updateLivePreview() {
  const box = document.getElementById("live-preview-box");
  const video = document.getElementById("live-video");
  const greenBox = document.getElementById("live-green-box");
  const img = document.getElementById("live-cover-img");
  const coverVid = document.getElementById("live-cover-video");
  const empty = document.getElementById("live-empty");
  // Cover shows immediately, even before any video is downloaded:
  // any asset you choose appears on the screen right away.
  // A video cover plays (muted, looped) in place of the image.
  if (liveCover) {
    empty.hidden = true;
    box.classList.add("has-cover");
    const src = liveCover.path || ("/api/covers/" + liveCover.filename);
    if (liveCover.is_video) {
      img.hidden = true;
      coverVid.hidden = false;
      if (coverVid.src !== src && !coverVid.src.endsWith(src)) {
        coverVid.src = src;
        coverVid.onloadedmetadata = () => applyLiveVideoLayout();
      }
      coverVid.play().catch(() => {});
    } else {
      coverVid.hidden = true;
      coverVid.pause();
      img.hidden = false;
      if (img.src !== src && !img.src.endsWith(src)) {
        img.src = src;
        img.onload = () => applyLiveVideoLayout();
      }
    }
  } else {
    empty.hidden = !jobId;
    box.classList.remove("has-cover");
    img.hidden = true;
    coverVid.hidden = true;
    coverVid.pause();
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

// Live video status (user, 2026-11-01): the video used to fail
// silently — downloaded, but nothing showed on the green screen
// and no message said why. Now the reason is always written here.
function updateLiveVideoStatus() {
  const el = document.getElementById("live-video-status");
  if (!el) return;
  if (!jobId) {
    el.textContent = "No video downloaded yet — download a video in Step 1 first.";
  } else if (!liveCover) {
    el.textContent = "Video downloaded, but no cover selected — choose a cover in Step 2.";
  } else if (liveVideoError) {
    el.textContent = "Video file could not be loaded — try downloading the video again in Step 1.";
  } else if (liveVideoHidden) {
    el.textContent = "Video is hidden (Hide video — check cover). Press Show video to see it again.";
  } else if (greenRect.x === 0 && greenRect.y === 0 && greenRect.w === 640 && greenRect.h === 360) {
    el.textContent = "Warning: green area is still the default 0,0 640x360 — it may not match this cover, so the video can be hidden by the mask. Press Detect green area below.";
  } else {
    el.textContent = `Video should appear inside the green area (${greenRect.x},${greenRect.y} ${greenRect.w}x${greenRect.h}). If you cannot see it, tick Show green area outline and press Detect green area.`;
  }
}

document.getElementById("live-video").addEventListener("error", () => {
  liveVideoError = true;
  updateLiveVideoStatus();
});
document.getElementById("live-video").addEventListener("loadeddata", () => {
  liveVideoError = false;
  updateLiveVideoStatus();
});

document.getElementById("live-outline").addEventListener("change", (e) => {
  liveOutline = e.target.checked;
  applyLiveVideoLayout();
});

document.getElementById("btn-detect-green").addEventListener("click", async () => {
  const status = document.getElementById("live-video-status");
  if (!liveCover) {
    if (status) status.textContent = "Choose a cover in Step 2 first, then press Detect green area.";
    return;
  }
  try {
    const data = await api("/api/detect-green/" + liveCover.id);
    greenRect = data.green_rect;
    syncAdminGreenInputs();
    updateLivePreview();
    setStatus(`Green area detected: ${greenRect.x},${greenRect.y} ${greenRect.w}x${greenRect.h} — video should now appear in the green area.`);
    if (status) status.textContent = `Green area detected: ${greenRect.x},${greenRect.y} ${greenRect.w}x${greenRect.h}. Video should now appear in the green area.`;
  } catch (err) {
    if (status) status.textContent = "Green area detection failed: " + err.message + " — check the cover image, then try again.";
    setStatus("Green area detection failed: " + err.message);
  }
});

// Keep the Admin green-rectangle inputs in sync with the live
// green rectangle, so the preset shows the area that is actually used.
function syncAdminGreenInputs() {
  const x = document.getElementById("set-green-x");
  const y = document.getElementById("set-green-y");
  const w = document.getElementById("set-green-w");
  const h = document.getElementById("set-green-h");
  if (x) x.value = greenRect.x;
  if (y) y.value = greenRect.y;
  if (w) w.value = greenRect.w;
  if (h) h.value = greenRect.h;
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
      mode: currentMode,
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
      if (job.zoom !== undefined) {
        lastProcessedKey = [job.zoom, (job.pan_x || 0).toFixed(1), (job.pan_y || 0).toFixed(1), job.fit_mode, job.flip, job.speed].join("|");
        updateFinalSettings(job);
      }
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
    li.innerHTML = `<strong>${t.step}</strong> — ${fmtDuration(t.duration_sec)}<br><span class="muted">${t.detail || ""}</span>`;
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
  // FIX (user, 2026-11-01): green area belongs to the cover, not
  // to the preset. Previously detection ran only when auto-detect
  // was on, so a new cover could keep an old cover's rectangle
  // (or the 0,0 640x360 default). That rectangle's mask is mostly
  // black over the new cover, so the downloaded video was hidden
  // completely — with no message. Now detection always runs on
  // cover select, and a failure is shown in the live status too.
  if (cover) {
    try {
      const data = await api("/api/detect-green/" + cover.id);
      greenRect = data.green_rect;
      syncAdminGreenInputs();
      setStatus(`Green area auto-detected: ${greenRect.x},${greenRect.y} ${greenRect.w}x${greenRect.h} — video will fill exactly this area.`);
    } catch (err) {
      setStatus("Green area auto-detection failed, using the manual rectangle: " + err.message);
      const status = document.getElementById("live-video-status");
      if (status) status.textContent = "Green area detection failed: " + err.message + " — video may not appear. Press Detect green area in Live preview to retry.";
    }
  }
  updateLivePreview();
  selectedCoverId = cover ? cover.id : "";
  const select = document.getElementById("cover-select");
  select.value = selectedCoverId;
  const wrap = document.getElementById("cover-preview-wrap");
  const pvImg = document.getElementById("cover-preview");
  const pvVid = document.getElementById("cover-preview-video");
  if (cover) {
    wrap.hidden = false;
    const src = cover.path || ("/api/covers/" + cover.filename);
    if (cover.is_video) {
      pvImg.hidden = true;
      pvVid.hidden = false;
      if (pvVid.src !== src && !pvVid.src.endsWith(src)) pvVid.src = src;
      pvVid.play().catch(() => {});
    } else {
      pvVid.hidden = true;
      pvVid.pause();
      pvImg.hidden = false;
      pvImg.src = src;
    }
    document.getElementById("cover-selected-name").textContent = "Selected: " + (cover.display_name || cover.filename) + (cover.is_video ? " (video cover — loops to your video's length)" : "");
  } else {
    wrap.hidden = true;
    pvVid.pause();
    pvVid.removeAttribute("src");
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
    // Video covers get a moving thumbnail; image covers a still one.
    const thumb = cover.is_video ? document.createElement("video") : document.createElement("img");
    thumb.src = cover.path || ("/api/covers/" + cover.filename);
    if (cover.is_video) { thumb.muted = true; thumb.preload = "metadata"; thumb.playsInline = true; }
    thumb.alt = cover.display_name || cover.filename;
    const span = document.createElement("span");
    span.textContent = (cover.display_name || cover.filename) + (cover.is_video ? " (video)" : "");
    const del = document.createElement("button");
    del.type = "button";
    del.className = "cover-delete";
    del.textContent = "×";
    del.title = "Delete this cover";
    del.setAttribute("aria-label", "Delete cover " + (cover.display_name || cover.filename));
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!(await showConfirm("Delete cover?", `Delete "${cover.display_name || cover.filename}"? This cannot be undone.`))) return;
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
    btn.append(thumb, span, del);
    btn.addEventListener("click", () => selectCover(cover));
    grid.appendChild(btn);
  }
  const toSelect = data.covers.find((c) => c.id === (autoSelectId || selectedCoverId)) || data.covers[0];
  // Auto-select the newest cover on first load, so Process works
  // without the user having to guess which dropdown entry to pick.
  // Awaited (2026-11-01 fix): previously the first paint could
  // show the old/default green rectangle before detection finished.
  await selectCover(toSelect);
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
  adminPresets = (s.profiles && typeof s.profiles === "object") ? s.profiles : {};
  activePresetName = s.active_preset || "";
  // Manual Edit (and Auto, via the backend) use the Active preset,
  // or the first preset if none is marked Active — not a separate
  // global default. Apply it here so Tool starts with the right values.
  if (getActivePresetName()) applyAdminSettings(adminPresets[getActivePresetName()]);
  renderPresetList();
  showAdminTab("manual");
  updateLivePreview();
}

// Admin YouTube channels (multi-channel, user 2026-11-02):
// NO manual add any more. A channel only appears after a real
// Connect (it then has its own token), and picking it at upload
// time really uploads to it. The old manual list never changed
// the upload destination, so it was removed, not redesigned.
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
    document.getElementById("yt-credentials-result").textContent = "Saved on this computer. Next: press Connect YouTube account below and sign in with Google.";
    document.getElementById("yt-client-secret").value = "";
    await loadYoutubeStatus();
  } catch (err) {
    document.getElementById("yt-credentials-result").textContent = "Save failed: " + err.message;
  }
});

// One-click YouTube connect (user, 2026-11-01): no terminal, no
// pip, no script, no restart. The tool installs the libraries,
// opens Google sign-in, and saves the token itself. This polls
// until connected, failed, or 5 minutes pass.
let ytConnectTimer = null;
function stopYtConnectPolling() {
  if (ytConnectTimer) { clearInterval(ytConnectTimer); ytConnectTimer = null; }
}
document.getElementById("btn-connect-youtube").addEventListener("click", async () => {
  const result = document.getElementById("yt-connect-result");
  stopYtConnectPolling();
  // FIX (user, 2026-11-02): the tab never opened, but the message
  // claimed it did. Root cause: window.open() was called AFTER
  // awaiting the API, so the browser no longer counted it as a
  // click and its popup blocker silently blocked it. Now the tab
  // is opened synchronously inside the click itself, and its
  // address is set once the sign-in URL arrives. A clickable
  // fallback link is always shown too, so even if the tab is
  // blocked, one more click (a real user gesture) opens it.
  const popup = window.open("", "_blank");
  const popupBlocked = !popup;
  if (popup) {
    try {
      popup.document.write("<p>Please wait — Google sign-in is loading…</p>");
    } catch (e) { /* cross-origin blank tab, ignore */ }
  }
  result.textContent = popupBlocked
    ? "Starting… (your browser blocked the new tab — a clickable sign-in link will appear below, press it.)"
    : "Starting… the tool is getting what it needs ready (first time can take a minute). Google sign-in will open in a new tab.";
  try {
    const data = await api("/api/youtube/connect-start", { method: "POST" });
    if (data.already_connected) {
      if (popup) popup.close();
      result.textContent = "YouTube is already connected. Your channels are in the Upload step.";
      await loadYoutubeStatus();
      return;
    }
    if (data.auth_url) {
      if (popup) { popup.location.href = data.auth_url; popup.focus(); }
      result.textContent = popupBlocked
        ? "Your browser blocked the new tab. Click the link below to sign in with Google, then come back here — your channels will appear automatically. "
        : "Google sign-in opened in a new tab. Sign in with the Google account that owns your channel, then come back here — your channels will appear automatically. If no tab opened, click the link below. ";
      const link = document.createElement("a");
      link.href = data.auth_url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Click here to sign in with Google";
      result.appendChild(link);
    } else {
      if (popup) popup.close();
      result.textContent = "Could not start Google sign-in. Press Connect again.";
      return;
    }
    const started = Date.now();
    ytConnectTimer = setInterval(async () => {
      try {
        const st = await api("/api/youtube/connect-status");
        if (st.connected) {
          stopYtConnectPolling();
          result.textContent = "Connected! Your channels are now in the Upload step.";
          await loadYoutubeStatus();
        } else if (st.error) {
          stopYtConnectPolling();
          result.textContent = "Connect failed: " + st.error;
          await loadYoutubeStatus();
        } else if (Date.now() - started > 5 * 60 * 1000) {
          stopYtConnectPolling();
          result.textContent = "Sign-in was not completed in time. Press Connect YouTube account again.";
        }
      } catch (e) { /* keep polling until timeout */ }
    }, 3000);
  } catch (err) {
    if (popup) popup.close();
    result.textContent = "Connect failed: " + err.message;
  }
});
document.getElementById("btn-disconnect-youtube").addEventListener("click", async () => {
  const result = document.getElementById("yt-connect-result");
  try {
    await api("/api/youtube/disconnect", { method: "POST" });
    result.textContent = "All channels disconnected. Press Connect YouTube account to sign in again.";
    await loadYoutubeStatus();
  } catch (err) {
    result.textContent = "Disconnect failed: " + err.message;
  }
});

let ytConnected = false;
// Easy setup checklist (user, 2026-11-02): ticks for Steps 1–4
// are remembered on this computer (localStorage); Step 5 ticks
// itself when the tool is actually connected.
const YT_SETUP_KEY = "yt-setup-checklist";
function updateYtSetupProgress() {
  const boxes = [1, 2, 3, 4, 5].map((n) => document.getElementById("yt-setup-" + n));
  if (boxes.some((b) => !b)) return;
  const done = boxes.filter((b) => b.checked).length;
  const el = document.getElementById("yt-setup-progress");
  if (el) el.textContent = `Setup progress: ${done} of 5 steps done.` + (done === 5 ? " You are fully connected." : "");
}
function loadYtSetupChecklist() {
  try {
    const saved = JSON.parse(localStorage.getItem(YT_SETUP_KEY) || "{}");
    [1, 2, 3, 4].forEach((n) => {
      const box = document.getElementById("yt-setup-" + n);
      if (box && saved[n]) box.checked = true;
    });
  } catch (e) { /* ignore bad saved data */ }
  updateYtSetupProgress();
}
[1, 2, 3, 4].forEach((n) => {
  const box = document.getElementById("yt-setup-" + n);
  if (box) box.addEventListener("change", () => {
    try {
      const saved = JSON.parse(localStorage.getItem(YT_SETUP_KEY) || "{}");
      saved[n] = box.checked;
      localStorage.setItem(YT_SETUP_KEY, JSON.stringify(saved));
    } catch (e) { /* private mode etc. */ }
    updateYtSetupProgress();
  });
});
async function loadYoutubeStatus() {
  try {
    const s = await api("/api/youtube/status");
    ytConnected = !!s.connected;
    document.getElementById("yt-status").textContent = "YouTube: " + s.message;
    // Upload gating (user, 2026-11-02): Step 5 used to let the user
    // press Upload with only a channel name listed and no Google
    // sign-in, then fail with a 400. Now the button is disabled
    // until actually connected, with a clear warning and a button
    // that jumps straight to Admin → YouTube channels to connect.
    const uploadBtn = document.getElementById("btn-upload-yt");
    if (uploadBtn) uploadBtn.disabled = !s.connected;
    const warn = document.getElementById("yt-upload-warning");
    if (warn) warn.hidden = !!s.connected;
    const gotoBtn = document.getElementById("btn-goto-yt-connect");
    if (gotoBtn) gotoBtn.hidden = !!s.connected;
    const connectBtn = document.getElementById("btn-connect-youtube");
    const disconnectBtn = document.getElementById("btn-disconnect-youtube");
    if (connectBtn) connectBtn.textContent = s.connected ? "Connect another channel" : "Connect YouTube account";
    if (disconnectBtn) disconnectBtn.hidden = !s.connected;
    const setup5 = document.getElementById("yt-setup-5");
    if (setup5) setup5.checked = !!s.connected;
    updateYtSetupProgress();
    // Connected channels (multi-channel, user 2026-11-02): ONLY
    // channels with a real token are listed here and in the
    // Upload dropdown. Each row can be removed on its own.
    const apiList = document.getElementById("yt-api-channel-list");
    if (apiList) {
      apiList.innerHTML = "";
      if (!s.connected) {
        apiList.innerHTML = '<li class="muted">Not connected yet. Do Step 1 above.</li>';
      } else if ((s.channels || []).length) {
        for (const ch of s.channels) {
          const li = document.createElement("li");
          li.textContent = `${ch.title} (${ch.id}) `;
          const del = document.createElement("button");
          del.type = "button";
          del.className = "btn px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-xl border border-slate-500 transition-colors whitespace-nowrap shrink-0";
          del.textContent = "Remove";
          del.addEventListener("click", async () => {
            await api("/api/youtube/disconnect-channel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ channel_id: ch.id }),
            });
            await loadYoutubeStatus();
          });
          li.appendChild(del);
          apiList.appendChild(li);
        }
      } else {
        apiList.innerHTML = '<li class="muted">Connected, but no channel could be listed yet. Disconnect and Connect again and allow the new permission (see the note below).</li>';
      }
    }
    const chanErr = document.getElementById("yt-channel-error");
    if (chanErr) {
      if (s.channel_list_error) {
        chanErr.hidden = false;
        chanErr.textContent = s.channel_list_error;
      } else {
        chanErr.hidden = true;
      }
    }
    const adminStatus = document.getElementById("yt-admin-status");
    if (adminStatus) {
      adminStatus.textContent = !s.connected
        ? "Not connected yet — start with Step 1 below."
        : ((s.channels || []).length
          ? `Connected: ${(s.channels || []).length} channel(s) ready. Pick one when you upload.`
          : "Connected, but no channel is listed yet — see the note in Step 2.");
    }
    const select = document.getElementById("channel-select");
    select.innerHTML = "";
    if (!(s.channels || []).length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = s.connected ? "Signed-in channel (default)" : "-- not connected --";
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
// Time is NEVER shown as seconds-only (user, 2026-11-01):
// 73 seconds is wrong, "1 minute 13 seconds" is correct.
// Used for timeline durations, download ETA, process elapsed/ETA.
function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "";
  const s = Math.round(seconds);
  if (s < 60) return s + (s === 1 ? " second" : " seconds");
  const m = Math.floor(s / 60);
  const r = s % 60;
  const minPart = m + (m === 1 ? " minute" : " minutes");
  if (r === 0) return minPart;
  return minPart + " " + r + (r === 1 ? " second" : " seconds");
}
function fmtEta(seconds) {
  if (!seconds && seconds !== 0) return "";
  return " • " + fmtDuration(seconds) + " left";
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
        lastProcessedKey = null;
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
  showMode("manual");
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
          div.textContent = `✓ ${t.step} — ${fmtDuration(t.duration_sec)} — ${t.detail || ""}`;
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
  if (!file) { setStatus("Choose a cover image or video first."); return; }
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
  if (!(await showConfirm("Delete cover?", "Delete the selected cover? This cannot be undone."))) return;
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
  document.getElementById("btn-process-below-preview").disabled = true;
}
function hideProcessLock() {
  document.body.classList.remove("processing-open");
  document.getElementById("process-overlay").hidden = true;
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
      const elapsed = job.process_elapsed ? ` • ${fmtDuration(job.process_elapsed)} elapsed` : "";
      const eta = job.process_eta ? ` • about ${fmtDuration(job.process_eta)} left` : "";
      text.textContent = `${job.process_stage || "Processing…"} ${pct}%${elapsed}${eta}`;
      overlayText.textContent = text.textContent;
      overlayLog.textContent = document.getElementById("process-log").textContent;
      if (job.status === "processed") {
        clearInterval(processTimer);
        bar.style.width = "100%";
        overlayBar.style.width = "100%";
        text.textContent = "Done 100% — preview ready.";
        overlayText.textContent = "Done 100% — preview ready.";
        lastProcessedKey = currentLiveKey();
        updateFinalSettings(job);
        updateStaleWarning();
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

document.getElementById("btn-process-below-preview").addEventListener("click", async () => {
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
// Group Auto upload gating (user, 2026-11-01): upload options
// must NOT show as if they work when no YouTube channel is
// configured and Google sign-in is not complete. "Configured
// channels" alone do NOT enable upload — only a real connection
// (Client ID/Secret + token + library + at least one channel)
// does. When not ready, Group shows a clear OFF warning and
// only offers "save locally"; upload choices appear only when
// the status check says uploading actually works.
let groupUploadReady = false;
async function refreshGroupYoutubeStatus() {
  const warn = document.getElementById("group-yt-warning");
  try {
    const s = await api("/api/youtube/status");
    groupUploadReady = !!(s.connected && s.channels && s.channels.length);
    if (warn) {
      if (groupUploadReady) {
        warn.hidden = true;
        warn.textContent = "";
      } else {
        warn.hidden = false;
        let detail;
        if (!s.channels || !s.channels.length) {
          detail = "You have not added any YouTube channel yet.";
        } else if (!s.connected) {
          detail = `You have added ${s.channels.length} channel(s) to the list, but Google sign-in is not complete.`;
        } else {
          detail = "Google sign-in is connected, but no channel was found for that account.";
        }
        warn.textContent = `YouTube uploading is OFF — ${detail} Your YouTube video uploading functionality is off because you have not completed the configuration yet (Admin → YouTube channels: Client ID/Secret + Google sign-in). Until then, group videos can only be saved locally, not uploaded.` + (s.message ? ` (${s.message})` : "");
      }
    }
  } catch (err) {
    groupUploadReady = false;
    if (warn) {
      warn.hidden = false;
      warn.textContent = "YouTube uploading is OFF — YouTube status could not be checked, so upload choices are not available. Group videos can only be saved locally until YouTube is configured (Admin → YouTube channels).";
    }
  }
  return groupUploadReady;
}

// Group overlay (user, 2026-11-01): while a group runs, the
// background blurs and only this activity shows. Same pattern
// as the Auto popup / Processing lock: no close button while
// running, Close appears when the group is done.
function showGroupOverlay(name) {
  document.getElementById("group-overlay-title").textContent = `Group "${name}" — processing`;
  document.getElementById("group-overlay-text").textContent = "Working through all videos by itself…";
  document.getElementById("group-overlay-bar").style.width = "0%";
  document.getElementById("group-overlay-progress-text").textContent = "0%";
  document.getElementById("group-overlay-eta").textContent = "Calculating estimated time…";
  document.getElementById("group-overlay-list").innerHTML = "";
  document.getElementById("btn-group-overlay-close").hidden = true;
  document.getElementById("btn-group-overlay-retry").hidden = true;
  document.getElementById("group-overlay").hidden = false;
  document.body.classList.add("group-open");
}
function hideGroupOverlay() {
  document.getElementById("group-overlay").hidden = true;
  document.body.classList.remove("group-open");
}
function renderGroupOverlay(items, group) {
  // Group ETA (user, 2026-11-02): the backend estimates the
  // whole group's remaining time from completed videos' real
  // durations + the current video's own progress, so this line
  // moves as the group learns — it is an estimate, hence "about".
  const etaEl = document.getElementById("group-overlay-eta");
  if (etaEl) {
    if (group && group.status === "done") {
      etaEl.textContent = "Group complete.";
    } else if (group && group.eta_sec !== null && group.eta_sec !== undefined) {
      const elapsed = group.elapsed_sec ? ` • ${fmtDuration(group.elapsed_sec)} elapsed` : "";
      etaEl.textContent = `Estimated time left: about ${fmtDuration(group.eta_sec)}${elapsed}`;
    } else {
      etaEl.textContent = "Calculating estimated time…";
    }
  }
  const list = document.getElementById("group-overlay-list");
  list.innerHTML = "";
  let done = 0;
  items.forEach((it, i) => {
    if (it.status === "done_local" || it.status === "uploaded") done += 1;
    const li = document.createElement("li");
    let text = `${i + 1}. ${it.title || it.url} — ${it.status}`;
    if (it.status === "processing") text += ` ${it.progress || 0}% ${it.stage || ""}`;
    // User, 2026-11-01: NO download link here — a done video is
    // just saved locally, and is uploaded later from Records.
    // Showing "Download final video" made it look like the only
    // next step was downloading to the browser.
    if (it.status === "done_local" || it.status === "failed_upload") text += " — saved locally";
    if (it.error) text += ` — ${it.error}`;
    li.textContent = text;
    if (it.youtube_url) {
      const a = document.createElement("a");
      a.href = it.youtube_url; a.target = "_blank"; a.textContent = " Watch on YouTube";
      li.appendChild(a);
    }
    list.appendChild(li);
  });
  const pct = items.length ? Math.round(done / items.length * 100) : 0;
  document.getElementById("group-overlay-bar").style.width = pct + "%";
  document.getElementById("group-overlay-progress-text").textContent = `${done} of ${items.length} done — ${pct}%`;
}
document.getElementById("btn-group-overlay-close").addEventListener("click", hideGroupOverlay);

// Records (user, 2026-11-01): batch history, shown ONLY after
// the Records button is clicked, paginated (10 batches per page).
// Each batch shows its video count, how many are uploaded vs
// still saved locally, and expanding it shows every video with
// its saved title, description, tags, and YouTube or download link.
let recordsPage = 1;
let recordsTotalPages = 1;
// Records -> YouTube upload (user, 2026-11-01): locally saved,
// not-yet-uploaded videos can be selected in Records and taken
// straight to the YouTube upload step — no Manual wizard needed.
// Selection persists across Records pages until uploaded.
let selectedRecords = new Map();
let recordsItemsByKey = {};
let recordsUploadReady = false;
function updateRecordsUploadInfo() {
  const info = document.getElementById("records-upload-info");
  if (info) info.textContent = selectedRecords.size
    ? `${selectedRecords.size} video(s) selected for YouTube upload. Choose privacy and press Upload selected to YouTube.`
    : "Select locally saved videos above (checkbox on each video), then choose privacy and upload.";
}
async function refreshRecordsUploadStatus() {
  const warn = document.getElementById("records-upload-warning");
  const btn = document.getElementById("btn-records-upload");
  try {
    const s = await api("/api/youtube/status");
    recordsUploadReady = !!(s.connected && s.channels && s.channels.length);
    if (warn) {
      warn.hidden = recordsUploadReady;
      warn.textContent = recordsUploadReady ? "" : "YouTube uploading is OFF — no channel is configured and Google sign-in is not complete (Admin → YouTube channels). Upload is disabled until then; selected videos stay saved locally.";
    }
    if (btn) btn.disabled = !recordsUploadReady;
  } catch {
    recordsUploadReady = false;
    if (warn) { warn.hidden = false; warn.textContent = "YouTube status could not be checked, so upload is disabled. Selected videos stay saved locally."; }
    if (btn) btn.disabled = true;
  }
  return recordsUploadReady;
}
function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
async function loadRecords(page) {
  try {
    const data = await api(`/api/records?page=${page || recordsPage}&per_page=10`);
    recordsPage = data.page;
    recordsTotalPages = data.total_pages;
    document.getElementById("records-summary").textContent = `${data.total} batch(es) in total.`;
    document.getElementById("records-page-text").textContent = `Page ${data.page} of ${data.total_pages}`;
    document.getElementById("btn-records-prev").disabled = data.page <= 1;
    document.getElementById("btn-records-next").disabled = data.page >= data.total_pages;
    document.getElementById("records-empty").hidden = data.total > 0;
    const list = document.getElementById("records-list");
    list.innerHTML = "";
    recordsItemsByKey = {};
    data.records.forEach((rec) => {
      const card = document.createElement("div");
      card.className = "record-card";
      const date = rec.created_at ? new Date(rec.created_at).toLocaleString() : "";
      let html = `<h3>${escHtml(rec.name)}</h3><p class="record-counts">${date ? escHtml(date) + " • " : ""}${rec.total} video(s) • ${rec.uploaded} uploaded to YouTube • ${rec.local} still saved locally • ${rec.failed} failed • Status: ${escHtml(rec.status)}</p><details><summary class="muted">Show ${rec.total} video(s)</summary>`;
      (rec.items || []).forEach((it, i) => {
        const statusClass = it.status === "uploaded" ? "record-status-uploaded" : (it.status === "done_local" || it.status === "failed_upload" ? "record-status-local" : "record-status-failed");
        html += `<div class="record-item"><strong>${i + 1}. ${escHtml(it.title || it.url)}</strong> — <span class="${statusClass}">${escHtml(it.status)}</span>`;
        if (it.preset_name) html += `<p class="muted">Preset: ${escHtml(it.preset_name)} • Upload choice: ${escHtml(it.upload)}</p>`;
        if (it.original_title && it.original_title !== it.title) html += `<p class="muted">Original: ${escHtml(it.original_title)}</p>`;
        if (it.generated_description) html += `<p class="record-desc">${escHtml(it.generated_description)}</p>`;
        if (it.generated_tags && it.generated_tags.length) html += `<p class="muted">Tags: ${escHtml(it.generated_tags.join(", "))}</p>`;
        if (it.youtube_url) html += `<p><a href="${escHtml(it.youtube_url)}" target="_blank">Watch on YouTube</a> <span class="muted">(local file deleted after upload — no local space used)</span></p>`;
        else if (it.status === "done_local" || it.status === "failed_upload") {
          // No download link (user, 2026-11-01): the video is
          // just saved locally. Instead, a checkbox takes it
          // straight to the YouTube upload step below.
          const key = `${rec.id}:${it.job_id || i}`;
          recordsItemsByKey[key] = {
            batch_id: rec.id, job_id: it.job_id || "",
            title: it.title || it.generated_title || "",
            description: it.generated_description || "",
            tags: (it.generated_tags || []).join(", "),
          };
          html += `<p class="muted">(saved locally)</p><label class="check"><input type="checkbox" class="record-select" data-key="${escHtml(key)}" ${selectedRecords.has(key) ? "checked" : ""} /> Select for YouTube upload</label>`;
        }
        if (it.error) html += `<p class="muted">Error: ${escHtml(it.error)}</p>`;
        html += `</div>`;
      });
      html += `</details>`;
      card.innerHTML = html;
      list.appendChild(card);
    });
    list.querySelectorAll(".record-select").forEach((cb) => {
      cb.addEventListener("change", () => {
        const key = cb.dataset.key;
        if (cb.checked && recordsItemsByKey[key]) selectedRecords.set(key, recordsItemsByKey[key]);
        else selectedRecords.delete(key);
        updateRecordsUploadInfo();
      });
    });
    updateRecordsUploadInfo();
  } catch (err) {
    document.getElementById("records-summary").textContent = "Records could not be loaded: " + err.message;
  }
}
function showRecords() {
  document.getElementById("records-overlay").hidden = false;
  document.body.classList.add("records-open");
  loadRecords(1);
  refreshRecordsUploadStatus();
}
document.getElementById("btn-records-upload").addEventListener("click", async () => {
  const resultEl = document.getElementById("records-upload-result");
  if (!selectedRecords.size) { resultEl.textContent = "Select at least one locally saved video first (checkbox on each video)."; return; }
  const ready = await refreshRecordsUploadStatus();
  if (!ready) { resultEl.textContent = "YouTube uploading is OFF — configure a channel and Google sign-in first (Admin → YouTube channels). Selected videos stay saved locally."; return; }
  resultEl.textContent = `Uploading ${selectedRecords.size} video(s) to YouTube…`;
  try {
    const data = await api("/api/records/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [...selectedRecords.values()],
        privacy_status: document.getElementById("records-upload-privacy").value,
      }),
    });
    // Uploaded videos leave the selection (their local file is
    // deleted); failed ones stay selected so they can be retried.
    data.results.forEach((r) => {
      if (r.status === "uploaded") {
        for (const key of [...selectedRecords.keys()]) {
          if (selectedRecords.get(key).job_id === r.job_id) selectedRecords.delete(key);
        }
      }
    });
    const failed = data.results.filter((r) => r.status !== "uploaded");
    resultEl.textContent = `Uploaded ${data.uploaded} video(s).` + (failed.length ? ` ${failed.length} failed: ${failed.map((r) => r.error || r.job_id).join(" | ")}` : " Local files for uploaded videos were deleted to save space.");
    loadRecords(recordsPage);
  } catch (err) {
    resultEl.textContent = "Upload failed: " + err.message;
  }
});
function hideRecords() {
  document.getElementById("records-overlay").hidden = true;
  document.body.classList.remove("records-open");
}
document.getElementById("btn-records").addEventListener("click", showRecords);
document.getElementById("btn-records-close").addEventListener("click", hideRecords);
document.getElementById("btn-records-prev").addEventListener("click", () => { if (recordsPage > 1) loadRecords(recordsPage - 1); });
document.getElementById("btn-records-next").addEventListener("click", () => { if (recordsPage < recordsTotalPages) loadRecords(recordsPage + 1); });

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
  const ytReady = await refreshGroupYoutubeStatus();
  groupRows = urls.map((url) => ({ url, preset_name: "", upload: "skip" }));
  const wrap = document.getElementById("group-rows");
  wrap.innerHTML = "";
  urls.forEach((url, i) => {
    const row = document.createElement("div");
    // UI refresh: one clean grid row per video (see .group-row
    // in style.css) — URL truncated with ellipsis, dropdowns
    // aligned, never overlapping like the old flex row did.
    row.className = "group-row";
    const label = document.createElement("span");
    label.className = "group-row-url";
    // Group rows show the video TITLE, not just "Video 1" or a
    // bare URL (user, 2026-11-01): "Video 1: <title> — preset"
    // is how you tell which video gets which preset. Titles
    // load in the background, one per link, so Build list never
    // waits; if a title cannot be fetched, the URL is shown.
    label.textContent = `Video ${i + 1}: Loading title…`;
    label.title = url;
    api("/api/video-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).then((info) => {
      const t = (info.title || "").trim();
      label.textContent = t ? `Video ${i + 1}: ${t}` : `Video ${i + 1}: ${url}`;
      label.title = t ? `${t}\n${url}` : url;
    }).catch(() => {
      label.textContent = `Video ${i + 1}: ${url}`;
    });
    const presetSel = document.createElement("select");
    // No more "Admin defaults" — the Active preset (or first
    // preset) is the default. Show its name so it is obvious.
    const activeName = getActivePresetName();
    presetSel.innerHTML = `<option value="">Active preset${activeName ? " (" + activeName + ")" : ""}</option>` + presets.map((p) => `<option value="${p}">${p}</option>`).join("");
    presetSel.addEventListener("change", () => { groupRows[i].preset_name = presetSel.value || null; });
    const uploadSel = document.createElement("select");
    if (ytReady) {
      uploadSel.innerHTML = '<option value="skip">Do not upload — save locally</option><option value="public">Upload — Public</option><option value="private">Upload — Private</option><option value="unlisted">Upload — Unlisted (link only, not in search)</option>';
    } else {
      // Uploading is OFF: only "save locally" exists, and it is
      // disabled so it cannot be changed to an upload that would
      // fail later. See refreshGroupYoutubeStatus().
      uploadSel.innerHTML = '<option value="skip">Do not upload — save locally</option>';
      uploadSel.disabled = true;
    }
    uploadSel.addEventListener("change", () => { groupRows[i].upload = uploadSel.value; });
    row.append(label, presetSel, uploadSel);
    wrap.appendChild(row);
  });
  document.getElementById("btn-group-start").hidden = false;
  document.getElementById("group-result").textContent = `${urls.length} video(s) ready. Choose a preset and upload choice for each, then start.`;
});
// Group polling + retry (user, 2026-11-02): one function used
// both when a group first starts and when failed videos are
// retried, so retry resumes the same group with the same overlay
// and the same 2-second polling. currentGroup tracks the group
// the overlay belongs to, so Retry knows what to retry.
let currentGroup = null;
function startGroupPolling(group) {
  currentGroup = group;
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
        if (it.status === "done_local" || it.status === "failed_upload") text += " — saved locally";
        if (it.error) text += ` — ${it.error}`;
        li.textContent = text;
        if (it.youtube_url) {
          const a = document.createElement("a");
          a.href = it.youtube_url; a.target = "_blank"; a.textContent = " Watch on YouTube";
          li.appendChild(a);
        }
        list.appendChild(li);
      });
      renderGroupOverlay(g.items, g);
      if (g.status === "done") {
        clearInterval(groupTimer);
        document.getElementById("group-result").textContent = `Group "${g.name}" done.`;
        document.getElementById("group-overlay-text").textContent = `Group "${g.name}" done.`;
        document.getElementById("btn-group-overlay-close").hidden = false;
        const failedCount = g.items.filter((it) => it.status === "failed" || it.status === "failed_upload").length;
        document.getElementById("btn-group-overlay-retry").hidden = failedCount === 0;
      }
    } catch (err) { clearInterval(groupTimer); hideGroupOverlay(); }
  }, 2000);
}
document.getElementById("btn-group-overlay-retry").addEventListener("click", async () => {
  if (!currentGroup) return;
  try {
    const g = await api("/api/groups/" + currentGroup.id + "/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    document.getElementById("group-result").textContent = g.message || `Retrying failed videos in group "${g.name}".`;
    showGroupOverlay(g.name);
    startGroupPolling(g);
  } catch (err) {
    document.getElementById("group-result").textContent = "Retry failed: " + err.message;
  }
});
document.getElementById("btn-group-start").addEventListener("click", async () => {
  if (!groupRows.length) return;
  // Re-check right before starting: if uploading went OFF since
  // Build list, force every item to "save locally" instead of
  // letting uploads fail halfway through the group.
  const ytReadyAtStart = await refreshGroupYoutubeStatus();
  if (!ytReadyAtStart) groupRows.forEach((r) => { r.upload = "skip"; });
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
    document.getElementById("group-result").textContent = `Group "${group.name}" started. It will work through all videos by itself.` + (ytReadyAtStart ? "" : " YouTube uploading is OFF, so videos will be saved locally only.");
    showGroupOverlay(group.name);
    startGroupPolling(group);
  } catch (err) {
    document.getElementById("group-result").textContent = "Group start failed: " + err.message;
  }
});

document.getElementById("btn-download-final").addEventListener("click", () => {
  if (!jobId) { setStatus("Process a video first."); return; }
  window.location.href = "/api/download/" + jobId;
});

document.getElementById("btn-delete-local-files").addEventListener("click", async () => {
  if (!jobId) { setStatus("No job to delete."); return; }
  if (!(await showConfirm("Delete local files?", "Delete all local working files for this job (source, final, preview)? Your downloaded copy in Downloads is not affected."))) return;
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
  // Start over (user, 2026-11-01): ALL steps reset and the wizard
  // goes back to Step 1. It used to only clear the job, leaving
  // the wizard stuck on Step 4/5 with old progress, timeline and
  // metadata still showing, so the user could not get back to
  // Step 1 from here. Cover selection is kept on purpose — a new
  // video usually reuses the same cover.
  clearSavedState();
  lastProcessedKey = null;
  jobId = ""; downloadReady = false;
  flip = true;
  document.getElementById("flip-state").textContent = "Flip: on";
  document.getElementById("yt-url").value = "";
  document.getElementById("job-info").textContent = "";
  document.getElementById("preview-player").removeAttribute("src");
  document.getElementById("preview-player").load();
  const dlWrap = document.getElementById("download-progress-wrap");
  if (dlWrap) dlWrap.hidden = true;
  const prWrap = document.getElementById("process-progress-wrap");
  if (prWrap) prWrap.hidden = true;
  const orig = document.getElementById("original-info");
  if (orig) orig.hidden = true;
  const gen = document.getElementById("generated-info");
  if (gen) gen.hidden = true;
  document.getElementById("generated-title").value = "";
  document.getElementById("generated-tags").value = "";
  document.getElementById("generated-description").value = "";
  document.getElementById("yt-title").value = "";
  document.getElementById("yt-description").value = "";
  document.getElementById("yt-tags").value = "";
  document.getElementById("local-files-result").textContent = "";
  document.getElementById("yt-result").textContent = "";
  document.getElementById("timeline-list").innerHTML = '<li class="muted">No step completed yet.</li>';
  showMode("manual");
  showManualStep(1);
  updateLivePreview();
  setStatus("Cleared. Paste a new YouTube link to start over.");
});

document.getElementById("btn-goto-yt-connect").addEventListener("click", () => {
  showTab("admin");
  document.getElementById("tab-admin").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("btn-upload-yt").addEventListener("click", async () => {
  if (!jobId) { setStatus("Process a video first."); return; }
  if (!ytConnected) {
    setStatus("Google sign-in is not connected yet. Press Go to Admin → YouTube channels to connect, then come back here to upload.");
    return;
  }
  const title = document.getElementById("yt-title").value.trim();
  if (!title) { setStatus("Enter a video title first."); return; }
  // Multi-channel (user, 2026-11-02): the picked channel is
  // actually sent now — previously the dropdown was filled but
  // never read, so every upload silently went to the default
  // token's channel no matter what was picked.
  const picked = document.getElementById("channel-select");
  const pickedId = picked ? picked.value : "";
  const pickedName = picked && picked.selectedOptions.length ? picked.selectedOptions[0].textContent : "";
  setStatus(pickedId ? `Uploading to ${pickedName}…` : "Uploading to YouTube…");
  // Upload progress (user, 2026-11-02): the upload fetch runs
  // in the background, so poll the backend every second and
  // move the bar + MB counts while it runs. Polling stops as
  // soon as the upload fetch itself returns (success or error).
  const progWrap = document.getElementById("yt-upload-progress");
  const progBar = document.getElementById("yt-upload-progress-bar");
  const progText = document.getElementById("yt-upload-progress-text");
  if (progWrap) progWrap.hidden = false;
  if (progBar) progBar.style.width = "0%";
  if (progText) progText.textContent = "Uploading… 0%";
  const progTimer = setInterval(async () => {
    try {
      const p = await api("/api/upload-progress/" + jobId);
      if (progBar) progBar.style.width = (p.percent || 0) + "%";
      if (progText) {
        const up = (p.uploaded_bytes / 1048576).toFixed(1);
        const tot = (p.total_bytes / 1048576).toFixed(1);
        progText.textContent = p.total_bytes
          ? `Uploading… ${p.percent}% (${up} MB of ${tot} MB)`
          : `Uploading… ${p.percent}%`;
      }
    } catch (e) { /* keep the upload itself running; bar just stalls */ }
  }, 1000);
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
        channel_id: pickedId,
      }),
    });
    clearInterval(progTimer);
    if (progBar) progBar.style.width = "100%";
    if (progText) progText.textContent = "Upload complete — 100%";
    document.getElementById("yt-result").textContent = "Uploaded: " + (data.url || data.video_id);
    setStatus("Uploaded to YouTube. Local working files for this job were deleted to save space.");
    if (data.local_files_deleted) { clearSavedState(); }
  } catch (err) {
    clearInterval(progTimer);
    if (progText) progText.textContent = "Upload failed.";
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
    // Zoom/pan are live Manual values, not Admin form fields —
    // but a preset must round-trip them, or a saved preset
    // cannot reproduce the look of the video it came from
    // (user, 2026-11-07: save a finished video's effects).
    manual_zoom: getZoom(),
    manual_pan_x: panX,
    manual_pan_y: panY,
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
  // Zoom/pan from the preset, when it has them (older presets
  // don't): the live preview then matches the saved look.
  if (s.manual_zoom !== undefined) setZoomValue(parseFloat(s.manual_zoom) || 1);
  if (s.manual_pan_x !== undefined) panX = parseFloat(s.manual_pan_x) || 0;
  if (s.manual_pan_y !== undefined) panY = parseFloat(s.manual_pan_y) || 0;
  updateLivePreview();
}
// Presets are the ONLY settings system (user, 2026-11-01):
// no "Save admin settings" button any more. By default Admin
// shows only preset names. Click a name to open its details,
// edit it, delete it, or set it as Active. The Active preset
// (or the first preset, if none is marked Active) is used for
// Auto, Manual and Group videos. There is nothing else to save.

let activePresetName = "";
let detailPresetName = null;   // original name of the preset open in detail, null = new preset
let detailIsNew = false;
function getActivePresetName() {
  if (activePresetName && adminPresets[activePresetName]) return activePresetName;
  const names = Object.keys(adminPresets);
  return names.length ? names[0] : "";
}
function getPresetSummary(p) {
  const onOff = (v) => v ? "on" : "off";
  return `Manual ${p.manual_speed !== undefined ? p.manual_speed : p.default_speed}x, pitch ${p.manual_voice_pitch_factor !== undefined ? p.manual_voice_pitch_factor : p.voice_pitch_factor} • Auto ${p.default_speed}x, pitch ${p.voice_pitch_factor} • ${p.encoder || "libx265"}, CRF ${p.crf}, ${p.preset}`;
}
function renderPresetList() {
  const list = document.getElementById("preset-list");
  const empty = document.getElementById("preset-list-empty");
  const names = Object.keys(adminPresets);
  const active = getActivePresetName();
  list.innerHTML = "";
  empty.hidden = names.length > 0;
  names.forEach((name) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "preset-row" + (name === active ? " preset-row-active" : "") + (name === detailPresetName ? " preset-row-open" : "");
    const title = document.createElement("span");
    title.className = "preset-row-name";
    title.textContent = name;
    const badge = document.createElement("span");
    badge.className = "pill";
    badge.textContent = name === active ? "★ Active" : "Click to open";
    const summary = document.createElement("span");
    summary.className = "muted preset-row-summary";
    summary.textContent = getPresetSummary(adminPresets[name]);
    row.append(title, badge);
    row.appendChild(document.createElement("br"));
    row.appendChild(summary);
    row.addEventListener("click", () => openPresetDetail(name, false));
    list.appendChild(row);
  });
  updateToolActivePreset();
}
function updateToolActivePreset() {
  const el = document.getElementById("active-preset-note");
  if (!el) return;
  const active = getActivePresetName();
  el.textContent = active ? `Active preset: ${active} — used for Auto, Manual and Group videos. Change it in Admin settings → Presets.` : "No presets yet — create one in Admin settings → Presets.";
}
function updatePresetActiveNote() {
  const note = document.getElementById("preset-active-note");
  if (!note) return;
  if (detailIsNew) { note.textContent = "New preset — not saved yet. Give it a name, adjust its settings, then press Create preset."; return; }
  const active = getActivePresetName();
  note.textContent = detailPresetName === active
    ? "★ Active preset — currently used for Auto, Manual and Group videos."
    : "Not active — press Set as Active to use this preset for Auto, Manual and Group videos.";
}
function openPresetDetail(name, isNew) {
  detailIsNew = !!isNew;
  detailPresetName = isNew ? null : name;
  const card = document.getElementById("preset-detail-card");
  card.hidden = false;
  const title = document.getElementById("preset-detail-title");
  const saveBtn = document.getElementById("btn-preset-save");
  if (isNew) {
    title.textContent = "New preset";
    document.getElementById("preset-detail-name").value = "";
    saveBtn.textContent = "Create preset";
    // Start from built-in defaults, not from whatever preset was open before.
    applyAdminSettings({
      default_speed: 1.0, default_flip: true, fit_mode: "cover",
      manual_speed: 1.0, manual_flip: true, manual_voice_enabled: true,
      manual_voice_pitch_factor: 1.05, manual_fit_mode: "cover",
      voice_enabled: true, voice_pitch_factor: 1.05, crf: 22, preset: "fast",
      encoder: "libx265", auto_detect_green: true,
      green_rect: { x: 0, y: 0, w: 640, h: 360 },
    });
    showAdminTab("manual");
  } else {
    title.textContent = `Preset: ${name}`;
    document.getElementById("preset-detail-name").value = name;
    saveBtn.textContent = "Save changes";
    applyAdminSettings(adminPresets[name]);
  }
  updatePresetActiveNote();
  document.getElementById("preset-detail-result").textContent = "";
  renderPresetList();
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}
async function savePresetsToBackend() {
  await api("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...readAdminSettings(), profiles: adminPresets, active_preset: activePresetName }),
  });
}
document.getElementById("btn-add-preset").addEventListener("click", () => openPresetDetail(null, true));
document.getElementById("btn-preset-save").addEventListener("click", async () => {
  const name = document.getElementById("preset-detail-name").value.trim();
  const result = document.getElementById("preset-detail-result");
  if (!name) { result.textContent = "Enter a preset name first."; return; }
  if (detailIsNew && adminPresets[name]) { result.textContent = `A preset named "${name}" already exists — open that preset to edit it, or choose a different name.`; return; }
  if (!detailIsNew && detailPresetName && detailPresetName !== name && adminPresets[name]) { result.textContent = `A preset named "${name}" already exists — choose a different name.`; return; }
  const wasActive = !detailIsNew && detailPresetName && detailPresetName === getActivePresetName();
  if (!detailIsNew && detailPresetName && detailPresetName !== name) delete adminPresets[detailPresetName];
  adminPresets[name] = readAdminSettings();
  if (wasActive) activePresetName = name;
  try {
    await savePresetsToBackend();
    detailIsNew = false;
    detailPresetName = name;
    document.getElementById("preset-detail-title").textContent = `Preset: ${name}`;
    document.getElementById("btn-preset-save").textContent = "Save changes";
    updatePresetActiveNote();
    renderPresetList();
    result.textContent = `Preset "${name}" saved.`;
    updateToolActivePreset();
  } catch (err) { result.textContent = "Save failed: " + err.message; }
});
document.getElementById("btn-preset-active").addEventListener("click", async () => {
  const result = document.getElementById("preset-detail-result");
  // For a new, unsaved preset, save it first, then mark it Active.
  if (detailIsNew) {
    const name = document.getElementById("preset-detail-name").value.trim();
    if (!name) { result.textContent = "Enter a preset name first, then press Set as Active."; return; }
    if (adminPresets[name]) { result.textContent = `A preset named "${name}" already exists — open that preset to edit it.`; return; }
    adminPresets[name] = readAdminSettings();
    detailIsNew = false;
    detailPresetName = name;
    document.getElementById("preset-detail-title").textContent = `Preset: ${name}`;
    document.getElementById("btn-preset-save").textContent = "Save changes";
  }
  const name = detailPresetName;
  if (!name || !adminPresets[name]) { result.textContent = "Open a preset first."; return; }
  activePresetName = name;
  try {
    await savePresetsToBackend();
    updatePresetActiveNote();
    renderPresetList();
    result.textContent = `Preset "${name}" is now Active — it will be used for Auto, Manual and Group videos.`;
    updateToolActivePreset();
  } catch (err) { result.textContent = "Set as Active failed: " + err.message; }
});
document.getElementById("btn-preset-delete").addEventListener("click", async () => {
  const result = document.getElementById("preset-detail-result");
  const name = detailPresetName;
  if (!name || !adminPresets[name]) { result.textContent = "Open a preset first."; return; }
  if (!(await showConfirm("Delete preset?", `Delete preset "${name}"? This cannot be undone.`))) return;
  const wasActive = name === getActivePresetName();
  delete adminPresets[name];
  if (wasActive) activePresetName = "";
  try {
    await savePresetsToBackend();
    document.getElementById("preset-detail-card").hidden = true;
    detailPresetName = null;
    detailIsNew = false;
    renderPresetList();
    document.getElementById("preset-list-result").textContent = `Preset "${name}" deleted.` + (wasActive ? " The first remaining preset is now used automatically." : "");
  } catch (err) { result.textContent = "Delete failed: " + err.message; }
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

// Simple mode picker: only the chosen mode (Auto / Group Auto /
// Manual) is shown. Remembered in localStorage via saveState().
let currentMode = "auto";
function showMode(mode) {
  // By default NO mode is selected (user, 2026-11-01): a mode
  // appears only after the user chooses it. "" (the "Choose a
  // mode" placeholder) hides all three mode sections. The only
  // exception is a restored in-progress manual job, which still
  // opens in Manual so its progress is not hidden.
  currentMode = ["auto", "group", "manual"].includes(mode) ? mode : "";
  const sel = document.getElementById("mode-select");
  if (sel) sel.value = currentMode;
  const auto = document.getElementById("mode-auto");
  const group = document.getElementById("mode-group");
  const manual = document.getElementById("mode-manual");
  if (auto) auto.hidden = currentMode !== "auto";
  if (group) group.hidden = currentMode !== "group";
  if (manual) manual.hidden = currentMode !== "manual";
  if (currentMode === "group") refreshGroupYoutubeStatus();
  saveState();
}
document.getElementById("mode-select").addEventListener("change", (e) => showMode(e.target.value));

// Professional confirm popup: replaces every native confirm()
// ("localhost:8000 says…") with a themed modal card. Returns a
// Promise<boolean>, so callers await it instead of the blocking
// confirm(). Cancel, backdrop click and Escape all mean "no".
function showConfirm(title, message, confirmLabel = "Delete") {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-overlay");
    const okBtn = document.getElementById("btn-confirm-ok");
    const cancelBtn = document.getElementById("btn-confirm-cancel");
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    okBtn.textContent = confirmLabel;
    overlay.hidden = false;
    document.body.classList.add("confirm-open");
    const done = (result) => {
      overlay.hidden = true;
      document.body.classList.remove("confirm-open");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onOk = () => done(true);
    const onCancel = () => done(false);
    const onBackdrop = (e) => { if (e.target === overlay) done(false); };
    const onKey = (e) => { if (e.key === "Escape") done(false); };
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    okBtn.focus();
  });
}

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
  // By default no mode is selected (user, 2026-11-01) — the user
  // chooses a mode and only then does it appear. A restored
  // manual job is the only exception: it opens in Manual mode
  // so its progress is not hidden. A previously remembered mode
  // is deliberately NOT auto-applied any more.
  showMode(saved && saved.jobId ? "manual" : "");
  loadYtSetupChecklist();
  loadYoutubeStatus();
  refreshGroupYoutubeStatus();
})();

// ------------------------------------------------------------------ YT Guru
// Tool chooser (user, 2026-11-03): the app starts on the home
// screen. Picking a tool shows ONLY that tool's full use case;
// the other tool stays hidden. "All tools" goes back home.
// The video tool's own tabs (Tool / Admin settings) are untouched
// inside #tool-video.
function showTool(tool) {
  document.getElementById("tool-home").hidden = tool !== "home";
  document.getElementById("tool-video").hidden = tool !== "video";
  document.getElementById("tool-tts").hidden = tool !== "tts";
  document.getElementById("tool-autovideo").hidden = tool !== "autovideo";
  if (tool === "tts" || tool === "autovideo") loadTtsVoices();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.getElementById("btn-open-video-tool").addEventListener("click", () => showTool("video"));
document.getElementById("btn-open-tts-tool").addEventListener("click", () => showTool("tts"));
document.getElementById("btn-open-av-tool").addEventListener("click", () => showTool("autovideo"));

// License (YT Guru commercial): activation box on the home page.
// Shows the balance when activated, the key form when not.
async function loadLicenseStatus() {
  const text = document.getElementById("license-text");
  const balanceEl = document.getElementById("license-balance");
  const form = document.getElementById("license-form");
  if (!text) return;
  try {
    const data = await api("/api/license/status");
    if (data.activated) {
      form.hidden = true;
      text.textContent = "Activated — you can make videos and voiceovers.";
      const costs = data.costs || {};
      balanceEl.textContent = `Balance: ${data.balance} credit(s) · 1 cover video = ${costs.cover_video ?? 1} credit · 1 voiceover = ${costs.tts ?? 1} · 1 auto video = ${costs.autovideo ?? 1}`;
    } else {
      form.hidden = false;
      text.textContent = "Activate the tool with your license key to make videos and voiceovers.";
      balanceEl.textContent = "";
    }
  } catch (err) {
    text.textContent = "Could not reach the license server — check your internet connection. Already-made files still work.";
  }
}
document.getElementById("btn-license-activate").addEventListener("click", async () => {
  const key = document.getElementById("license-key").value.trim();
  const statusEl = document.getElementById("license-balance");
  if (!key) { statusEl.textContent = "Paste your license key first."; return; }
  statusEl.textContent = "Activating…";
  try {
    const data = await api("/api/license/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: key }),
    });
    document.getElementById("license-key").value = "";
    await loadLicenseStatus();
    setStatus(`Activated — balance: ${data.balance} credit(s).`);
  } catch (err) {
    statusEl.textContent = `Activation failed: ${err.message}`;
  }
});
loadLicenseStatus();
document.getElementById("btn-back-tools").addEventListener("click", () => showTool("home"));
document.getElementById("btn-back-tools-tts").addEventListener("click", () => showTool("home"));
document.getElementById("btn-back-tools-av").addEventListener("click", () => showTool("home"));

// ------------------------------------------------------------ Text to Voice
let ttsVoicesLoaded = false;
async function loadTtsVoices() {
  if (ttsVoicesLoaded) return;
  const selects = ["tts-voice", "av-voice"].map((id) => document.getElementById(id)).filter(Boolean);
  try {
    const res = await fetch("/api/tts/voices");
    const data = await res.json();
    for (const select of selects) {
      select.innerHTML = "";
      for (const voice of data.voices || []) {
        const option = document.createElement("option");
        option.value = voice.id;
        option.textContent = voice.label;
        select.appendChild(option);
      }
    }
    // Auto Video default: Aria, the most expressive voice, so the
    // narration does not sound flat by default.
    const avSelect = document.getElementById("av-voice");
    if (avSelect) avSelect.value = "en-US-AriaNeural";
    ttsVoicesLoaded = true;
  } catch {
    for (const select of selects) {
      select.innerHTML = "";
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Could not load voices — check the server is running.";
      select.appendChild(option);
    }
  }
}
document.getElementById("tts-text").addEventListener("input", (event) => {
  document.getElementById("tts-count").textContent =
    `${event.target.value.length} characters (max 10,000)`;
});
document.getElementById("btn-tts-generate").addEventListener("click", async () => {
  const text = document.getElementById("tts-text").value.trim();
  const voice = document.getElementById("tts-voice").value;
  const rate = document.getElementById("tts-rate").value;
  const status = document.getElementById("tts-status");
  const result = document.getElementById("tts-result");
  const button = document.getElementById("btn-tts-generate");
  if (!text) { status.textContent = "Please type some text first."; return; }
  if (text.length > 10000) { status.textContent = "Text is too long — keep it under 10,000 characters."; return; }
  if (!voice) { status.textContent = "Please pick a voice first."; return; }
  button.disabled = true;
  result.hidden = true;
  status.textContent = "Generating voiceover… please wait (long scripts take longer).";
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Voice generation failed.");
    const player = document.getElementById("tts-player");
    player.src = data.download_url;
    const download = document.getElementById("tts-download");
    download.href = data.download_url;
    download.setAttribute("download", `voiceover-${data.tts_id}.mp3`);
    document.getElementById("tts-info").textContent =
      `${data.voice_label} · ${data.chars} characters · ${(data.size_bytes / 1024).toFixed(0)} KB MP3 · ${data.engine_note || ""}`;
    result.hidden = false;
    status.textContent = "Done — listen above, or download the MP3.";
  } catch (err) {
    status.textContent = `Failed: ${err.message}`;
  } finally {
    button.disabled = false;
  }
});

// ------------------------------------------------------- Auto Video (Tool 3)
let avPollTimer = null;
document.getElementById("btn-av-generate").addEventListener("click", async () => {
  const title = document.getElementById("av-title").value.trim();
  const minutes = parseInt(document.getElementById("av-minutes").value, 10);
  const visuals = document.getElementById("av-visuals").value;
  const voice = document.getElementById("av-voice").value;
  const expressive = document.getElementById("av-expressive").checked;
  const status = document.getElementById("av-status");
  const button = document.getElementById("btn-av-generate");
  const wrap = document.getElementById("av-progress-wrap");
  const bar = document.getElementById("av-progress-bar");
  const progressText = document.getElementById("av-progress-text");
  const result = document.getElementById("av-result");
  if (!title || title.length < 3) { status.textContent = "Please give a video title first."; return; }
  if (!minutes || minutes < 1 || minutes > 30) { status.textContent = "Minutes must be between 1 and 30."; return; }
  if (!voice) { status.textContent = "Please pick a voice first."; return; }
  if (avPollTimer) clearInterval(avPollTimer);
  button.disabled = true;
  result.hidden = true;
  wrap.hidden = false;
  status.textContent = "Starting… script, voiceover, visuals, then assembly. This can take a few minutes for a long video.";
  try {
    const res = await fetch("/api/autovideo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, minutes, visuals, voice, expressive }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Could not start the video.");
    const jobId = data.job_id;
    avPollTimer = setInterval(async () => {
      try {
        const jobRes = await fetch(`/api/autovideo/${jobId}`);
        const job = await jobRes.json();
        bar.style.width = `${job.progress || 0}%`;
        progressText.textContent = `${job.stage || ""} ${job.progress || 0}%`;
        if (job.status === "done") {
          clearInterval(avPollTimer);
          avPollTimer = null;
          button.disabled = false;
          const player = document.getElementById("av-player");
          player.src = job.download_url;
          const download = document.getElementById("av-download");
          download.href = job.download_url;
          download.setAttribute("download", `autovideo-${jobId}.mp4`);
          document.getElementById("av-info").textContent =
            `Finished in about ${job.final_minutes} minutes · Script: ${job.script_words} words (${job.script_source}) · Images used: ${job.images_used}, Clips used: ${job.clips_used} (found: ${job.images_found} images, ${job.clips_found} clips)${job.ai_images ? ` · AI images: ${job.ai_images}` : ""}${job.title_cards ? ` · Title cards: ${job.title_cards}` : ""} · Voice: ${job.voice_engine || ""}${job.visual_warning ? " · " + job.visual_warning : ""}`;
          document.getElementById("av-script").textContent = job.script || "";
          const scenesEl = document.getElementById("av-scenes");
          if (scenesEl) {
            scenesEl.textContent = (job.scenes || []).map((s, i) =>
              `Scene ${i + 1} (${s.kind}, ${s.duration_sec}s): ${s.caption || ""} — Visual: ${s.visual || ""}`
            ).join("\n") || "Scene list not available for this video.";
          }
          result.hidden = false;
          status.textContent = "Done — watch above, or download the video.";
        } else if (job.status === "failed") {
          clearInterval(avPollTimer);
          avPollTimer = null;
          button.disabled = false;
          status.textContent = `Failed: ${job.error || "Unknown error."}`;
        }
      } catch {
        /* Keep polling on a transient error. */
      }
    }, 3000);
  } catch (err) {
    button.disabled = false;
    status.textContent = `Failed: ${err.message}`;
  }
});
