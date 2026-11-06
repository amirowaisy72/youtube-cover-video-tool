import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  factorToPitch,
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

type Store = {
  /** Credit balance from the license server; null when not activated / unknown. */
  credits: number | null;
  licensed: boolean;
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
};

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [licensed, setLicensed] = useState(false);
  const [licenseKey, setKey] = useState<string | null>(null);
  const [licenseError, setLicenseError] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);

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
      setCredits(d.activated ? (d.balance ?? null) : null);
      setLicenseError("");
    } catch (e) {
      // License server unreachable (offline): keep the tool usable.
      setLicensed(false);
      setCredits(null);
      setLicenseError(e instanceof Error ? e.message : "License server unreachable.");
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
        credits, licensed, licenseKey, licenseError, activate, refreshLicense,
        presets, setPresets, activePresetId, setActivePresetId,
        settings, refreshSettings,
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
