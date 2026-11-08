import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  api,
  autovideoJob,
  factorToPitch,
  getJob,
  getSettings,
  licenseActivate,
  licenseStatus,
  pitchToFactor,
  putSettings,
  type Settings,
} from "./api";

export type Preset = {
  id: string; name: string; flip: boolean; speed: number; zoom: number;
  panX: number; panY: number; fit: "cover" | "full"; voice: boolean; pitch: number;
};

export const defaultPreset: Omit<Preset, "id" | "name"> = {
  flip: false, speed: 1, zoom: 1, panX: 0, panY: 0, fit: "cover", voice: true, pitch: 0,
};

/** Design preset <-> backend profile (settings.profiles[name]). */
export function presetFromProfile(name: string, p: Record<string, unknown>): Preset {
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
  const pitchFactor = num(p["manual_voice_pitch_factor"], num(p["voice_pitch_factor"], 1.05));
  return {
    id: name,
    name,
    flip: bool(p["manual_flip"], bool(p["default_flip"], true)),
    speed: num(p["manual_speed"], num(p["default_speed"], 1)),
    zoom: num(p["manual_zoom"], 1),
    panX: num(p["manual_pan_x"], 0),
    panY: num(p["manual_pan_y"], 0),
    fit: (str(p["manual_fit_mode"], str(p["fit_mode"], "cover")) === "full" ? "full" : "cover"),
    voice: bool(p["manual_voice_enabled"], bool(p["voice_enabled"], true)),
    pitch: factorToPitch(pitchFactor),
  };
}

/** Merge a design preset into its existing backend profile (keeps encoder/CRF/green rect/etc.). */
export function profileFromPreset(p: Preset, existing: Record<string, unknown> = {}): Record<string, unknown> {
  const factor = pitchToFactor(p.pitch);
  return {
    ...existing,
    default_flip: p.flip,
    manual_flip: p.flip,
    default_speed: p.speed,
    manual_speed: p.speed,
    fit_mode: p.fit,
    manual_fit_mode: p.fit,
    voice_enabled: p.voice,
    manual_voice_enabled: p.voice,
    voice_pitch_factor: factor,
    manual_voice_pitch_factor: factor,
    manual_zoom: p.zoom,
    manual_pan_x: p.panX,
    manual_pan_y: p.panY,
  };
}

/** A long-running tool job that keeps working in the background
    (user, 2026-11-07): when the user leaves a tool's page while
    it is processing, the job is NOT cancelled — the backend
    keeps running it — and a progress bar for it stays at the
    top of the home page (and every page, under the TopBar).
    Clicking it returns to that tool, which restores the job
    view. `route` is where the bar links to; `jobId` is the
    backend job the bar polls. */
export type ActiveJob = {
  key: string;
  // One entry per tool that runs a background job:
  // "auto-video" | "cover" | "downloader" | "trimmer" |
  // "shorts" | "subtitles" | "audio". (add more tools here)
  tool: string;
  title: string;
  route: string;
  jobId: string;
  progress: number;
  stage: string;
  status: "running" | "done" | "failed";
};

/** One status read for a job, normalised across tools. The
    cover auto job reports "processed" when done and uses
    auto_progress/auto_stage; the auto-video job uses the plain
    fields and "done". Every other tool reports "done" /
    "failed" / a running state with a progress number. */
async function fetchJobStatus(tool: string, jobId: string): Promise<{
  progress: number; stage: string; status: "running" | "done" | "failed";
}> {
  const norm = (status: string): "running" | "done" | "failed" =>
    status === "done" || status === "processed"
      ? "done"
      : status === "failed"
        ? "failed"
        : "running";
  if (tool === "auto-video") {
    const j = await autovideoJob(jobId);
    return {
      progress: j.progress ?? 0,
      stage: j.stage || "",
      status: norm(j.status),
    };
  }
  if (tool === "cover") {
    const j = await getJob(jobId);
    return {
      progress: j.auto_progress ?? j.progress ?? 0,
      stage: j.auto_stage || j.stage || "",
      status: norm(j.status),
    };
  }
  if (tool === "downloader") {
    const j = await api<{ status: string; progress?: number; title?: string }>(`/api/downloader/${jobId}`);
    return { progress: j.progress ?? 0, stage: j.title || "Downloading…", status: norm(j.status) };
  }
  if (tool === "trimmer") {
    const j = await api<{ status: string; progress?: number | null; title?: string }>(`/api/trimmer/${jobId}`);
    return { progress: j.progress ?? 0, stage: j.title || "Trimming…", status: norm(j.status) };
  }
  if (tool === "shorts") {
    const j = await api<{ status: string; progress?: number; stage?: string }>(`/api/shorts/${jobId}`);
    return { progress: j.progress ?? 0, stage: j.stage || "Making the Short…", status: norm(j.status) };
  }
  if (tool === "subtitles") {
    const j = await api<{ status: string; progress?: number; stage?: string }>(`/api/subtitles/${jobId}`);
    return { progress: j.progress ?? 0, stage: j.stage || "Transcribing…", status: norm(j.status) };
  }
  if (tool === "audio") {
    const j = await api<{ status: string; progress?: number; title?: string }>(`/api/audio/${jobId}`);
    const stage = j.status === "downloading"
      ? "Downloading audio…"
      : j.status === "converting"
        ? "Converting to MP3…"
        : j.title || "Extracting audio…";
    return { progress: j.progress ?? 0, stage, status: norm(j.status) };
  }
  return { progress: 0, stage: "", status: "running" };
}

const JOBS_STORAGE_KEY = "ytguru-active-jobs";
const ACTIVE_CHANNEL_KEY = "ytguru-active-channel";

type Store = {
  /** Credit balance from the license server; null when not activated / unknown. */
  credits: number | null;
  licensed: boolean;
  /** True only when the backend is the frozen .exe (installed setup). */
  installed: boolean;
  /** True once the first /api/license/status read has landed (or failed). */
  licenseChecked: boolean;
  /** The channel uploads and channel operations target by default.
      Persisted locally; the TopBar channel switcher changes it. */
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  /** Tools are usable only in the installed setup with an active license. */
  unlocked: boolean;
  licenseKey: string | null;
  licenseError: string;
  activate: (k: string) => Promise<boolean>;
  refreshLicense: () => Promise<void>;
  presets: Preset[];
  /** Persists to /api/settings (optimistic local update first). */
  setPresets: (p: Preset[]) => void;
  activePresetId: string;
  setActivePresetId: (id: string) => void;
  /** Raw backend settings (encoder/CRF/green rect/active preset...). */
  settings: Settings | null;
  refreshSettings: () => Promise<void>;
  /** Long-running jobs, kept across routes (see ActiveJob). */
  jobs: ActiveJob[];
  registerJob: (job: Omit<ActiveJob, "progress" | "stage" | "status"> & { progress?: number; stage?: string }) => void;
  updateJob: (key: string, patch: Partial<Pick<ActiveJob, "progress" | "stage" | "status">>) => void;
  removeJob: (key: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [licensed, setLicensed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [activeChannelId, setActiveChannelIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_CHANNEL_KEY);
    } catch {
      return null;
    }
  });
  const setActiveChannelId = useCallback((id: string | null) => {
    setActiveChannelIdState(id);
    try {
      if (id) localStorage.setItem(ACTIVE_CHANNEL_KEY, id);
      else localStorage.removeItem(ACTIVE_CHANNEL_KEY);
    } catch {
      // Storage blocked: the active channel still works in memory.
    }
  }, []);
  const [licenseKey, setKey] = useState<string | null>(null);
  const [licenseError, setLicenseError] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  // Background jobs (see ActiveJob): restored from localStorage
  // so a refresh does not lose a running job either; the
  // poller below corrects any stale "running" state.
  const [jobs, setJobs] = useState<ActiveJob[]>(() => {
    try {
      const raw = localStorage.getItem(JOBS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ActiveJob[];
      return Array.isArray(parsed) ? parsed.filter((j) => j && j.key && j.jobId) : [];
    } catch {
      return [];
    }
  });

  const registerJob = useCallback((job: Omit<ActiveJob, "progress" | "stage" | "status"> & { progress?: number; stage?: string }) => {
    const full: ActiveJob = {
      ...job,
      progress: job.progress ?? 0,
      stage: job.stage ?? "Starting…",
      status: "running",
    };
    // One active job per tool: starting a new build replaces
    // the previous one for that tool.
    setJobs((prev) => [...prev.filter((j) => j.tool !== job.tool), full]);
  }, []);

  const updateJob = useCallback((key: string, patch: Partial<Pick<ActiveJob, "progress" | "stage" | "status">>) => {
    setJobs((prev) => prev.map((j) => (j.key === key ? { ...j, ...patch } : j)));
  }, []);

  const removeJob = useCallback((key: string) => {
    setJobs((prev) => prev.filter((j) => j.key !== key));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    } catch {
      // Storage full/blocked: jobs still work in memory.
    }
  }, [jobs]);

  // Global poller: every 3s, refresh each running job's
  // progress/stage. This is what keeps the bar moving after
  // the user leaves the tool's page (the tool page's own
  // poller stops when it unmounts). Finished jobs stay in the
  // bar as "Ready" until dismissed, so the user can click
  // through to the result.
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  useEffect(() => {
    const timer = setInterval(async () => {
      const running = jobsRef.current.filter((j) => j.status === "running");
      for (const job of running) {
        try {
          const s = await fetchJobStatus(job.tool, job.jobId);
          setJobs((prev) => prev.map((j) => (j.key === job.key ? { ...j, ...s } : j)));
        } catch {
          // Transient poll error: keep the last known progress.
        }
      }
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Raw profiles (backend shape) kept alongside, so saving never
  // wipes keys the design does not edit (encoder, CRF, green rect...).
  const rawProfilesRef = useRef<Record<string, Record<string, unknown>>>({});
  const activeRef = useRef("");

  const refreshSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      rawProfilesRef.current = (s.profiles || {}) as Record<string, Record<string, unknown>>;
      activeRef.current = s.active_preset || "";
    } catch {
      // Settings load failure must not block the UI; presets just stay empty.
    }
  }, []);

  const refreshLicense = useCallback(async () => {
    try {
      const d = await licenseStatus();
      setLicensed(!!d.activated);
      setInstalled(!!d.installed);
      setCredits(d.activated ? (d.balance ?? null) : null);
      setLicenseError("");
    } catch (e) {
      // No backend (public demo) or license server unreachable:
      // not installed, not licensed — the tools stay locked.
      setLicensed(false);
      setInstalled(false);
      setCredits(null);
      setLicenseError(e instanceof Error ? e.message : "License server unreachable.");
    } finally {
      setLicenseChecked(true);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    refreshLicense();
  }, [refreshSettings, refreshLicense]);

  const presets = useMemo(
    () => Object.entries(rawProfilesRef.current).map(([name, p]) => presetFromProfile(name, p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings],
  );
  const activePresetId = useMemo(() => {
    const names = Object.keys(rawProfilesRef.current);
    if (activeRef.current && rawProfilesRef.current[activeRef.current]) return activeRef.current;
    return names.length ? names[0]! : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const persistProfiles = useCallback(async (profiles: Record<string, Record<string, unknown>>, active: string) => {
    try {
      const s = await putSettings({ profiles, active_preset: active });
      rawProfilesRef.current = (s.profiles || {}) as Record<string, Record<string, unknown>>;
      activeRef.current = s.active_preset || "";
      setSettings(s);
    } catch {
      // Persist failure: local state already shows the change; a refresh restores the server truth.
    }
  }, []);

  const setPresets = useCallback(
    (next: Preset[]) => {
      const profiles: Record<string, Record<string, unknown>> = {};
      for (const p of next) {
        // Rename support: a preset whose id differs from its name replaces the old key.
        const existing = rawProfilesRef.current[p.name] ?? rawProfilesRef.current[p.id] ?? {};
        profiles[p.name] = profileFromPreset({ ...p, id: p.name }, existing);
      }
      rawProfilesRef.current = profiles;
      const active = activeRef.current && profiles[activeRef.current] ? activeRef.current : Object.keys(profiles)[0] || "";
      activeRef.current = active;
      // Optimistic: rebuild settings state from the new profiles so the UI updates at once.
      setSettings((s) => (s ? { ...s, profiles, active_preset: active } : s));
      void persistProfiles(profiles, active);
    },
    [persistProfiles],
  );

  const setActivePresetId = useCallback(
    (id: string) => {
      if (!rawProfilesRef.current[id]) return;
      activeRef.current = id;
      setSettings((s) => (s ? { ...s, active_preset: id } : s));
      void persistProfiles(rawProfilesRef.current, id);
    },
    [persistProfiles],
  );

  const activate = useCallback(async (k: string) => {
    try {
      const d = await licenseActivate(k);
      setLicensed(true);
      setKey(k.trim().toUpperCase());
      setCredits(d.balance ?? null);
      setLicenseError("");
      return true;
    } catch (e) {
      setLicenseError(e instanceof Error ? e.message : "Activation failed.");
      return false;
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        credits, licensed, installed, licenseChecked, unlocked: installed && licensed,
        activeChannelId, setActiveChannelId,
        licenseKey, licenseError, activate, refreshLicense,
        presets, setPresets, activePresetId, setActivePresetId,
        settings, refreshSettings,
        jobs, registerJob, updateJob, removeJob,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
