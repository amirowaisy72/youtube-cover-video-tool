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
};

export type AvJob = {
  id: string;
  status: string;
  stage?: string;
  progress?: number;
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
  // Mood music + transitions (2026-11-08): what actually got
  // added, so a missing track is never silent. music_status /
  // sfx_status: "ok" | "no_key" | "key_rejected" | "no_results" |
  // "off". join: "xfade" (transitions applied) | "copy" (fallback).
  mood?: string;
  music?: string | null;
  music_status?: string;
  transition_sfx?: number;
  sfx_status?: string;
  transitions?: boolean;
  join?: string;
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
  api<{ connected: boolean; channels?: { id: string; title: string }[] }>("/api/youtube/status");

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
    if (st.connected) return true;
    if (!st.in_progress) break;
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
export const autovideoCreate = (title: string, minutes: number, voice: string, subtitles = true, pexelsKey = "", pixabayKey = "", music = true, transitions = true) =>
  api<{ job_id: string; status: string }>("/api/autovideo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, minutes, visuals: "both", voice, expressive: true, subtitles, pexels_key: pexelsKey || null, pixabay_key: pixabayKey || null, music, transitions }),
  });

export const autovideoJob = (jobId: string) => api<AvJob>(`/api/autovideo/${jobId}`);

/** Test a stock-media API key (Pixabay / Pexels) with one tiny
    request, so a wrong key is caught when it is saved — not
    weeks later when videos silently miss the stock footage. */
export type StockKeyValidation = { valid: boolean; reason: string; detail: string };
export const validateStockKey = (source: "pixabay" | "pexels", key: string) =>
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
