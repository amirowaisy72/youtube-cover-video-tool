// Plain JS frontend — no build step. All API calls go to the FastAPI
// backend that serves this page.
let jobId = "";
let flip = false;

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || "Request failed");
  }
  return data;
}

async function loadCovers() {
  const data = await api("/api/covers");
  const select = document.getElementById("cover-select");
  select.innerHTML = "";
  if (!data.covers.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- no covers yet --";
    select.appendChild(opt);
    return;
  }
  for (const cover of data.covers) {
    const opt = document.createElement("option");
    opt.value = cover.id;
    opt.textContent = cover.filename;
    select.appendChild(opt);
  }
}

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
  document.getElementById("voice-enabled").checked = !!s.voice_enabled;
  document.getElementById("voice-pitch").value = s.voice_pitch_factor;
  document.getElementById("voice-pitch-value").textContent = s.voice_pitch_factor;
  document.getElementById("speed").value = s.default_speed;
  document.getElementById("speed-value").textContent = s.default_speed + "x";
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
    document.getElementById("job-info").textContent = "Job: " + jobId + " — downloaded.";
    setStatus("Downloaded. Choose a cover and press Process video.");
  } catch (err) {
    setStatus("Download failed: " + err.message);
  }
});

document.getElementById("btn-cover-upload").addEventListener("click", async () => {
  const file = document.getElementById("cover-file").files[0];
  if (!file) { setStatus("Choose a cover image first."); return; }
  const form = new FormData();
  form.append("file", file);
  setStatus("Uploading cover…");
  try {
    await api("/api/covers", { method: "POST", body: form });
    await loadCovers();
    setStatus("Cover uploaded.");
  } catch (err) {
    setStatus("Cover upload failed: " + err.message);
  }
});

document.getElementById("btn-covers-refresh").addEventListener("click", loadCovers);

document.getElementById("btn-flip").addEventListener("click", () => {
  flip = !flip;
  document.getElementById("flip-state").textContent = "Flip: " + (flip ? "on" : "off");
});

document.getElementById("speed").addEventListener("input", (e) => {
  document.getElementById("speed-value").textContent = e.target.value + "x";
});

document.getElementById("voice-pitch").addEventListener("input", (e) => {
  document.getElementById("voice-pitch-value").textContent = e.target.value;
});

document.getElementById("btn-process").addEventListener("click", async () => {
  if (!jobId) { setStatus("Download a video first."); return; }
  const coverId = document.getElementById("cover-select").value;
  if (!coverId) { setStatus("Choose a cover first."); return; }
  setStatus("Processing… FFmpeg is compositing, flipping, and compressing.");
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
      }),
    });
    const player = document.getElementById("preview-player");
    player.src = data.preview_url + "?t=" + Date.now();
    player.load();
    setStatus("Done. Preview above — check it before downloading." + (data.note ? " " + data.note : ""));
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
        green_rect: {
          x: parseInt(document.getElementById("set-green-x").value, 10),
          y: parseInt(document.getElementById("set-green-y").value, 10),
          w: parseInt(document.getElementById("set-green-w").value, 10),
          h: parseInt(document.getElementById("set-green-h").value, 10),
        },
      }),
    });
    document.getElementById("settings-result").textContent = "Settings saved.";
  } catch (err) {
    document.getElementById("settings-result").textContent = "Save failed: " + err.message;
  }
});

loadCovers();
loadSettings();
loadYoutubeStatus();
