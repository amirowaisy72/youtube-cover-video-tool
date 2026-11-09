// Typed client for the real YT Guru FastAPI backend (same origin).
// Every call goes to /api/* — no mock data anywhere in here.

export type GreenRect = { x: number; y: number; w: number; h: number };

export type Cover = {
  id: string;
  filename: string;
  display_name: string;
  is_video: boolean;
  path: string;
};

export type TimelineStep = { step: string; duration_sec: number; detail?: string };

export type Job = {
  id: string;
  status: string;
  progress?: number;
  downloaded_bytes?: number;
  total_bytes?: number | null;
  speed?: number | null;
  eta?: number | null;
  error?: string;
  original_title?: string;
  original_description?: string;
  original_tags?: string[];
  original_uploader?: string;
  original_thumbnail?: string;
  stage?: string;
  timeline?: TimelineStep[];
  // Auto mode
  auto_stage?: string;
  auto_progress?: number;
  auto_summary?: {
    downloaded_mb: number;
    applied_mb: number;
    final_mb: number;
    saved_mb: number;
    saved_pct: number;
    encoder: string;
    crf: number;
  };
  // Process
  process_progress?: number;
  process_stage?: string;
  process_elapsed?: number;
  process_eta?: number;
  process_log?: string[];
  flip?: boolean;
  zoom?: number;
  pan_x?: number;
  pan_y?: number;
  fit_mode?: string;
  green_rect_used?: GreenRect;
  green_source?: string;
  voice_pitch?: number;
};

export type Settings = {
  default_speed: number;
  default_flip: boolean;
  fit_mode: string;
  manual_speed: number;
  manual_flip: boolean;
  manual_voice_enabled: boolean;
  manual_voice_pitch_factor: number;
  manual_fit_mode: string;
  profiles: Record<string, Record<string, unknown>>;
  active_preset: string;
  youtube_channels: unknown[];
  voice_enabled: boolean;
  voice_pitch_factor: number;
  crf: number;
  preset: string;
  encoder: string;
  green_rect: GreenRect;
  auto_detect_green: boolean;
  output_width: number;
  output_height: number | null;
  manual_zoom?: number;
  manual_pan_x?: number;
  manual_pan_y?: number;
};

export type LicenseStatus = {
  activated: boolean;
  /** True only when the backend is the frozen .exe (installed setup). */
  installed?: boolean;
  balance: number | null;
  costs: { cover_video?: number; tts?: number; autovideo?: number } | null;
  [key: string]: unknown;
};

export type TtsVoice = { id: string; label: string };

export type TtsResult = {
  tts_id: string;
  voice: string;
  voice_label: string;
  engine: string;
  engine_note: string;
  chars: number;
  size_bytes: number;
  download_url: string;
};

export type AvScene = {
  kind?: string;
  duration_sec?: number;
  caption?: string;
  visual?: string;
  narration?: string;
  visual_source?: string;
  // Step flow (user, 2026-11-09): the collected footage file in
  // the job dir + its original URL.
  visual_file?: string;
  visual_url?: string;
  // Word suggestions (user, 2026-11-09): the scene's main words
  // as clickable search chips in the footage browser.
  keywords?: string[];
};

export type AvTimelineEvent = { t: number; text: string };

export type AvJob = {
  id: string;
  status: string;
  stage?: string;
  progress?: number;
  scene_total?: number;
  timeline?: AvTimelineEvent[];
  title?: string;
  minutes?: number;
  error?: string;
  download_url?: string;
  script?: string;
  script_source?: string;
  script_words?: number;
  voice_duration_sec?: number;
  voice_engine?: string;
  final_minutes?: number;
  scenes?: AvScene[];
  images_found?: number;
  clips_found?: number;
  images_used?: number;
  clips_used?: number;
  ai_images?: number;
  title_cards?: number;
  visual_warning?: string;
  pipeline?: string;
  // File size + compression (user, 2026-11-09): the finished
  // video's size in MB, and after compressing, the original
  // size + how much was saved.
  final_size_mb?: number;
  original_size_mb?: number;
  compressed?: boolean;
  compress_encoder?: string;
  compress_crf?: number;
  compress_saved_pct?: number;
  compress_error?: string;
  // Set when the re-encoded file was NOT smaller than the
  // original — the original is kept and nothing is replaced.
  compress_no_gain?: boolean;
  compress_note?: string;
  // Video type (user, 2026-11-09): "long" (16:9) or "short"
  // (9:16 YouTube Short). short_seconds is the Short length.
  video_type?: string;
  short_seconds?: number;
  // Number pop-ups (user, 2026-11-09): figures the voiceover
  // says pop up big on screen at that moment.
  popups_applied?: boolean;
  popups_count?: number;
  popups_error?: string;
  popups_note?: string;
  // Realistic step (user, 2026-11-09): words picked to pop up
  // wherever they are spoken.
  realistic_words?: string[];
  // Voice provider (user, 2026-11-09): which TTS provider
  // voiced this video ("edge" default, "google", "unreal",
  // "elevenlabs"). Set when the user re-voices a finished video.
  tts_provider?: string;
  revoice_error?: string;
  // Set when the chosen voice provider failed and the default
  // Edge voice was used instead, so the video still completed.
  voice_fallback?: boolean;
  voice_fallback_note?: string;
  // Trimmed version (user, 2026-11-09): cutting the first seconds
  // off the finished video (e.g. an unwanted Hook).
  trimmed_url?: string;
  trimmed_start_seconds?: number;
  trimmed_duration_sec?: number;
  // Uploaded to YouTube (user, 2026-11-09): the video id + watch
  // URL from the last upload of this job.
  uploaded_video_id?: string;
  uploaded_url?: string;
  uploaded_privacy?: string;
  // Upload progress (user, 2026-11-09): the YouTube upload runs
  // in the background, so the job carries its live progress.
  upload_status?: string;
  upload_progress?: number;
  upload_stage?: string;
  upload_error?: string;
  thumbnail_set?: boolean;
  thumbnail_error?: string;
  // Mood music + transitions (2026-11-08): what actually got
  // added, so a missing track is never silent. music_status /
  // sfx_status: "ok" | "no_key" | "key_rejected" | "no_results" |
  // "off". join: "xfade" (transitions applied) | "copy" (fallback).
  mood?: string;
  music?: string | null;
  music_status?: string;
  music_volume?: number;
  transition_sfx?: number;
  sfx_status?: string;
  transitions?: boolean;
  join?: string;
  // Step flow (user, 2026-11-09): "planning" -> "planned" ->
  // "audio" -> "audio-ready" -> "rendering" -> "done".
  phase?: string;
  music_options?: AvMusicOption[];
  music_options_status?: string;
};

/** Error with the HTTP status attached (402 = out of credits, etc.). */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof data["detail"] === "string" && data["detail"]) ||
      (typeof data["message"] === "string" && data["message"]) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

// ---------------------------------------------------------------- settings
export const getSettings = () => api<Settings>("/api/settings");
export const putSettings = (patch: Record<string, unknown>) =>
  api<Settings>("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

// ------------------------------------------------------------------ covers
export const listCovers = async () => (await api<{ covers: Cover[] }>("/api/covers")).covers;

export async function uploadCover(file: File): Promise<Cover> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/covers", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, (data["detail"] as string) || "Cover upload failed.");
  return data as unknown as Cover;
}

export const deleteCover = (id: string) =>
  api<{ deleted: string }>(`/api/covers/${id}`, { method: "DELETE" });

export const detectGreen = async (coverId: string) =>
  (await api<{ cover_id: string; green_rect: GreenRect }>(`/api/detect-green/${coverId}`)).green_rect;

// ------------------------------------------------------------------- jobs
export const downloadVideo = (url: string) =>
  api<{ job_id: string; status: string }>("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

export const getJob = (jobId: string) => api<Job>(`/api/jobs/${jobId}`);

export type ProcessBody = {
  job_id: string;
  cover_id: string;
  flip: boolean;
  speed: number;
  voice_pitch: number;
  compress: boolean;
  zoom: number;
  pan_x: number;
  pan_y: number;
  green_rect: GreenRect;
  fit_mode: string;
};

export const processVideo = (body: ProcessBody) =>
  api<{ job_id: string; status: string; preview_url: string; download_url: string; green_rect_used: GreenRect }>(
    "/api/process",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );

export const autoVideo = (url: string, coverId: string | null) =>
  api<{ job_id: string; status: string }>("/api/auto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, cover_id: coverId }),
  });

// -------------------------------------------------------------------- group
export type GroupItem = {
  url: string;
  preset_name?: string | null;
  cover_id?: string | null;
  upload: string;
  status: string;
  job_id?: string | null;
  title?: string;
  download_url?: string;
  youtube_url?: string;
  error?: string | null;
  progress?: number;
  stage?: string;
  duration_sec?: number;
};

export type Group = {
  id: string;
  name: string;
  status: string;
  current_index?: number | null;
  items: GroupItem[];
  elapsed_sec?: number | null;
  eta_sec?: number | null;
};

export type GroupListItem = { id: string; name: string; status: string; total: number; done: number };

export const videoInfo = (url: string) =>
  api<{ title?: string; uploader?: string }>("/api/video-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

export const createGroup = (
  name: string,
  items: { url: string; preset_name: string | null; cover_id: string | null; upload: string }[],
) =>
  api<Group>("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, items }),
  });

export const getGroup = (id: string) => api<Group>(`/api/groups/${id}`);

export const retryGroup = (id: string) =>
  api<Group & { retried?: number; message?: string }>(`/api/groups/${id}/retry`, { method: "POST" });

export const listGroups = async () => (await api<{ groups: GroupListItem[] }>("/api/groups")).groups;

export const youtubeStatus = () =>
  api<{
    connected: boolean;
    channels?: { id: string; title: string }[];
    client_secrets_present?: boolean;
    token_present?: boolean;
    library_present?: boolean;
    message?: string;
  }>("/api/youtube/status");

/** Save Google OAuth Client ID + Secret (first-time YouTube setup).
    The backend writes client_secrets.json on this computer only;
    the user pastes them in the TopBar YouTube panel. */
export const saveYoutubeCredentials = (clientId: string, clientSecret: string) =>
  api<{ saved: boolean; path: string }>("/api/youtube/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

// YouTube sign-in, shared by the top bar and the Cover upload step:
// opens Google sign-in, then polls until it finishes. Returns true
// once the account is connected.
export async function connectYoutubeFlow(): Promise<boolean> {
  const data = await api<{ auth_url: string }>("/api/youtube/connect-start", { method: "POST" });
  if (data.auth_url) window.open(data.auth_url, "_blank");
  for (let i = 0; i < 150; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await api<{ in_progress: boolean; error: string; connected: boolean }>(
      "/api/youtube/connect-status",
    );
    if (st.error) throw new Error(st.error);
    // Wait until THIS sign-in finishes — "connected" is already true
    // when another channel is connected, so returning on it alone
    // ends the wait after 2s, before the new channel is saved.
    // (Bug found 2026-11-09: a second channel never appeared.)
    if (!st.in_progress) return st.connected;
  }
  return false;
}

// ------------------------------------------------------------------ upload
export const generateMetadata = (jobId: string, variant: number = 0) =>
  api<{ job_id: string; generated_title: string; generated_description: string; generated_tags: string[] }>(
    "/api/generate-metadata",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, variant }),
    },
  );

export const uploadYoutube = (body: {
  job_id: string;
  title: string;
  description: string;
  tags: string;
  privacy_status: string;
  channel_id: string;
}) =>
  api<{ job_id: string; status: string; video_id?: string; url?: string; local_files_deleted?: boolean }>(
    "/api/upload-youtube",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );

export const uploadProgress = (jobId: string) =>
  api<{ job_id: string; percent?: number; uploaded_bytes?: number; total_bytes?: number; status?: string }>(
    `/api/upload-progress/${jobId}`,
  );

// --------------------------------------------------------------------- tts
export const ttsVoices = () => api<{ voices: TtsVoice[]; max_text_chars: number }>("/api/tts/voices");

export const ttsGenerate = (text: string, voice: string, rate: string) =>
  api<TtsResult>("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, rate }),
  });

// -------------------------------------------------------------- auto video
export const autovideoCreate = (title: string, minutes: number, voice: string, subtitles = true, pexelsKey = "", pixabayKey = "", freesoundKey = "", music = true, transitions = true, script = "") =>
  api<{ job_id: string; status: string }>("/api/autovideo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, minutes, visuals: "both", voice, expressive: true, subtitles, pexels_key: pexelsKey || null, pixabay_key: pixabayKey || null, freesound_key: freesoundKey || null, music, transitions, script: script.trim() || null }),
  });

// -------------------------------------------------------------- auto video — step flow (user, 2026-11-09)
// Setup (Step 1) -> Footage (Step 2) -> Audio (Step 3) -> Render (Step 4).
// The decisions happen BEFORE any rendering, so a scene's footage or the
// music can be changed instantly until the final render.
export const autovideoPlan = (title: string, minutes: number, voice: string, pexelsKey = "", pixabayKey = "", script = "", ttsProvider = "edge", ttsKey = "", videoType = "long", shortSeconds = 60) =>
  api<{ job_id: string; status: string; phase: string }>("/api/autovideo/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, minutes, visuals: "both", voice, pexels_key: pexelsKey || null, pixabay_key: pixabayKey || null, script: script.trim() || null, tts_provider: ttsProvider, tts_key: ttsKey || null, video_type: videoType, short_seconds: shortSeconds }),
  });

export const autovideoPrepareAudio = (jobId: string, freesoundKey = "", music = true, ttsProvider = "", ttsVoice = "", ttsKey = "") =>
  api<{ job_id: string; status: string; phase: string }>(`/api/autovideo/${jobId}/prepare-audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ freesound_key: freesoundKey || null, music, tts_provider: ttsProvider || null, tts_voice: ttsVoice || null, tts_key: ttsKey || null }),
  });

// Re-voice a completed video with a different voice (user,
// 2026-11-09). Runs in the background; poll the job.
export const autovideoRevoice = (jobId: string, ttsProvider: string, ttsVoice: string, ttsKey = "") =>
  api<{ job_id: string; status: string }>(`/api/autovideo/${jobId}/revoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tts_provider: ttsProvider, tts_voice: ttsVoice, tts_key: ttsKey || null }),
  });

// Voice providers (user, 2026-11-09): the narration voice can
// come from Google Cloud TTS, Unreal Speech or ElevenLabs
// instead of the default Edge voice.
export type TtsProvider = {
  id: string;
  label: string;
  key_name: string | null;
  key_url: string | null;
  key_help: string;
  quota_api: boolean;
  quota_note: string;
};

export type TtsVoiceOption = {
  id: string;
  label: string;
  sample_url?: string | null;
};

export const ttsProviders = () =>
  api<{ providers: TtsProvider[] }>("/api/tts/providers");

export const ttsProviderVoices = (provider: string, key = "") =>
  api<{ provider: string; voices: TtsVoiceOption[] }>(`/api/tts/voices?provider=${encodeURIComponent(provider)}${key ? `&key=${encodeURIComponent(key)}` : ""}`);

export const ttsQuota = (provider: string, key = "") =>
  api<{ quota_api: boolean; remaining_chars: number | null; limit_chars: number | null; used_chars: number | null; note: string }>(`/api/tts/quota?provider=${encodeURIComponent(provider)}${key ? `&key=${encodeURIComponent(key)}` : ""}`);

export const ttsPreview = (provider: string, voice: string, key = "") =>
  api<{ provider: string; voice: string; sample_url: string }>("/api/tts/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, voice, key: key || null }),
  });

export const autovideoRender = (jobId: string, musicVolume = 0.2, transitions = true, subtitles = true, music = true) =>
  api<{ job_id: string; status: string; phase: string }>(`/api/autovideo/${jobId}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ music_volume: musicVolume, music, transitions, subtitles }),
  });

// Compress the finished video to a smaller file at the same
// visual quality (user, 2026-11-09 — HEVC CRF 22). Runs in the
// background; poll the job for progress and the new size.
export const autovideoCompress = (jobId: string) =>
  api<{ job_id: string; status: string }>(`/api/autovideo/${jobId}/compress`, {
    method: "POST",
  });

// Number pop-ups (user, 2026-11-09): every figure the voiceover
// says pops up big on screen at that moment, flying in from a
// random corner. Post-processing on the finished video — works
// on an already-rendered video too. Runs in the background;
// poll the job for progress and the pop-up count.
export const autovideoNumberPopups = (jobId: string) =>
  api<{ job_id: string; status: string }>(`/api/autovideo/${jobId}/number-popups`, {
    method: "POST",
  });

// Realistic step (user, 2026-11-09): the narration's important
// words, so the user can pick which ones pop up wherever they
// are spoken — every occurrence in a different random style.
export type RealisticWord = { word: string; count: number };
export const autovideoRealisticWords = (jobId: string) =>
  api<{ job_id: string; suggestions: RealisticWord[]; chosen: string[] }>(
    `/api/autovideo/${jobId}/realistic-words`,
  );
export const autovideoSaveRealisticWords = (jobId: string, words: string[]) =>
  api<{ job_id: string; words: string[] }>(`/api/autovideo/${jobId}/realistic-words`, {
    method: "POST",
    body: JSON.stringify({ words }),
  });

// URL of one collected footage file (Step 2 preview).
export const autovideoSceneFileUrl = (jobId: string, filename: string) =>
  `/api/autovideo/${jobId}/scene-file/${encodeURIComponent(filename)}`;

export const autovideoJob = (jobId: string) => api<AvJob>(`/api/autovideo/${jobId}`);

export const autovideoTrim = (jobId: string, startSeconds: number) =>
  api<{ trimmed_url: string; trimmed_start_seconds: number; trimmed_duration_sec: number }>(
    `/api/autovideo/${jobId}/trim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_seconds: startSeconds }),
    },
  );

export type AvUploadResult = {
  video_id: string;
  url: string;
  privacy_status: string;
  thumbnail_set: boolean;
  thumbnail_error: string;
};
export const autovideoUpload = (
  jobId: string,
  fields: { title: string; description: string; tags: string; privacy: string; channelId: string },
  thumbnail: File | null,
) => {
  const form = new FormData();
  form.append("title", fields.title);
  form.append("description", fields.description);
  form.append("tags", fields.tags);
  form.append("privacy_status", fields.privacy);
  form.append("channel_id", fields.channelId);
  if (thumbnail) form.append("thumbnail", thumbnail);
  // Upload runs in the background (user, 2026-11-09) — the video
  // is large, so the response only starts it; poll the job for
  // upload_progress and the video URL when it finishes.
  return api<{ job_id: string; status: string }>(`/api/autovideo/${jobId}/upload`, { method: "POST", body: form });
};

export type AvAltVisual = {
  url: string;
  thumb: string;
  title: string;
  kind: "clip" | "image";
  source: string;
  mime: string;
};

export type AvSceneAlternatives = {
  scene: number;
  query?: string;
  clips: AvAltVisual[];
  images: AvAltVisual[];
  // Load more (user, 2026-11-09): the offset this page was
  // fetched with, so the picker can ask for the next page.
  offset?: number;
};

export const autovideoSceneAlternatives = (
  jobId: string, idx: number, pexelsKey = "", pixabayKey = "", query = "",
  offset = 0,
) => {
  const qs = new URLSearchParams();
  if (pexelsKey) qs.set("pexels_key", pexelsKey);
  if (pixabayKey) qs.set("pixabay_key", pixabayKey);
  if (query) qs.set("query", query);
  if (offset > 0) qs.set("offset", String(offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api<AvSceneAlternatives>(
    `/api/autovideo/${jobId}/scene/${idx}/alternatives${suffix}`,
  );
};

export const autovideoSceneVisual = (jobId: string, idx: number, url: string, kind: "clip" | "image") =>
  api<{ scene: number; kind: string; video_url: string; final_duration_sec: number; join: string }>(
    `/api/autovideo/${jobId}/scene/${idx}/visual`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, kind }),
    },
  );

export const autovideoSceneUpload = async (
  jobId: string, idx: number, file: File,
) => {
  const form = new FormData();
  form.append("file", file);
  return api<{ scene: number; kind: string; video_url: string; final_duration_sec: number; join: string }>(
    `/api/autovideo/${jobId}/scene/${idx}/upload-visual`,
    { method: "POST", body: form },
  );
};

export type AvMusicOption = {
  id: number;
  name: string;
  duration_sec: number;
  preview_url: string;
  license: string;
};

export type AvMusicOptions = {
  mood: string;
  status: string;
  moods: string[];
  options: AvMusicOption[];
};

export const autovideoMusicOptions = (jobId: string, mood: string, freesoundKey: string) =>
  api<AvMusicOptions>(
    `/api/autovideo/${jobId}/music-options?mood=${encodeURIComponent(mood)}&freesound_key=${encodeURIComponent(freesoundKey)}`,
  );

export const autovideoRemixMusic = (
  jobId: string, previewUrl: string, name: string, volume: number,
) =>
  api<{ video_url: string; final_duration_sec: number; music: string; volume: number }>(
    `/api/autovideo/${jobId}/remix-music`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview_url: previewUrl, name, volume }),
    },
  );

export const autovideoRemixVolume = (jobId: string, volume: number) =>
  api<{ video_url: string; final_duration_sec: number; music: string; volume: number }>(
    `/api/autovideo/${jobId}/remix-volume`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volume }),
    },
  );

/** Test a stock-media API key (Pixabay / Pexels) with one tiny
    request, so a wrong key is caught when it is saved — not
    weeks later when videos silently miss the stock footage. */
export type StockKeyValidation = { valid: boolean; reason: string; detail: string };
export const validateStockKey = (source: "pixabay" | "pexels" | "freesound", key: string) =>
  api<StockKeyValidation>("/api/stock/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, key }),
  });

// ----------------------------------------------------------------- license
export const licenseStatus = () => api<LicenseStatus>("/api/license/status");

export const licenseActivate = (licenseKey: string) =>
  api<LicenseStatus & { activated: boolean }>("/api/license/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ license_key: licenseKey }),
  });

// ------------------------------------------------------------------ helpers
/** Design pitch is semitones (-6..+6); the backend wants a factor (1.0 = unchanged). */
export const pitchToFactor = (semitones: number) => Math.pow(2, semitones / 12);
export const factorToPitch = (factor: number) =>
  Math.max(-6, Math.min(6, Math.round(12 * Math.log2(Math.max(0.1, factor)))));

/** Green rect: design works in % of the cover; the backend works in pixels. */
export const rectPctToPx = (r: GreenRect, w: number, h: number): GreenRect => ({
  x: Math.round((r.x / 100) * w),
  y: Math.round((r.y / 100) * h),
  w: Math.round((r.w / 100) * w),
  h: Math.round((r.h / 100) * h),
});
export const rectPxToPct = (r: GreenRect, w: number, h: number): GreenRect => ({
  x: (r.x / Math.max(1, w)) * 100,
  y: (r.y / Math.max(1, h)) * 100,
  w: (r.w / Math.max(1, w)) * 100,
  h: (r.h / Math.max(1, h)) * 100,
});

/** Design TTS speed slider (0.5x–2x) -> edge-tts rate the backend accepts. */
export function speedToTtsRate(speed: number): string {
  if (speed <= 0.65) return "-20%";
  if (speed <= 0.9) return "-10%";
  if (speed <= 1.15) return "+0%";
  if (speed <= 1.5) return "+10%";
  return "+20%";
}

/** Pan clamp the backend applies (see main.py): forced to 0 at zoom <= 1. */
export function clampPanForBackend(panX: number, panY: number, zoom: number) {
  if (zoom <= 1) return { panX: 0, panY: 0 };
  const maxPan = ((zoom - 1) / 2) * 100;
  return {
    panX: Math.max(-maxPan, Math.min(maxPan, panX)),
    panY: Math.max(-maxPan, Math.min(maxPan, panY)),
  };
}
