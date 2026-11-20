/**
 * ONE place for every setting (user, 2026-11-19: "a Dashboard page where
 * I can clearly see what is configured and what is left — not managed
 * separately in every tool"). The keys are the SAME browser keys the
 * tools always used (so nothing already saved is lost); the Dashboard
 * edits them, and every tool reads them from here.
 */
import { useEffect, useState } from "react";

export type KeyId = "pexels" | "pixabay" | "freesound" | "gemini" | "google" | "unreal" | "elevenlabs" | "youtube";

export interface KeyInfo {
  id: KeyId;
  label: string;
  storage: string;
  what: string;
  usedBy: string;
  getUrl: string;
  group: "media" | "ai" | "voice";
  placeholder: string;
}

export const KEY_INFO: KeyInfo[] = [
  { id: "pexels", label: "Pexels", storage: "ytguru-pexels-key", group: "media", placeholder: "Pexels API key",
    what: "Professional stock videos and photos.", usedBy: "Auto Video, Stock", getUrl: "https://www.pexels.com/api/" },
  { id: "pixabay", label: "Pixabay", storage: "ytguru-pixabay-key", group: "media", placeholder: "Pixabay API key",
    what: "Stock videos and pictures (also 2D animator backgrounds).", usedBy: "Auto Video, Stock, Story Animator (2D)",
    getUrl: "https://pixabay.com/api/docs/" },
  { id: "freesound", label: "Freesound", storage: "ytguru-freesound-key", group: "media", placeholder: "Freesound API key",
    what: "Background music, laughs, slaps, whooshes and other sounds.", usedBy: "Auto Video, Story Animator, Music",
    getUrl: "https://freesound.org/apiv2/apply" },
  { id: "gemini", label: "Gemini", storage: "ytguru-gemini-tts-key", group: "ai", placeholder: "Gemini API key (AIza…)",
    what: "Smarter AI writing (stories, titles, footage choices) and the 🎭 Gemini acting voices.",
    usedBy: "Story Animator, Characters, Action Builder, 3D World Designer", getUrl: "https://aistudio.google.com/apikey" },
  { id: "youtube", label: "YouTube Data API (optional)", storage: "ytguru-youtube-api-key", group: "ai", placeholder: "YouTube Data API key (AIza…)",
    what: "Only needed when no YouTube channel is connected: research uses your connected channel's sign-in by default.",
    usedBy: "Topic Research Lab, New Channel Wizard", getUrl: "https://console.cloud.google.com/apis/library/youtube.googleapis.com" },
  { id: "google", label: "Google Cloud TTS", storage: "ytguru-google-tts-key", group: "voice", placeholder: "Google Cloud API key",
    what: "Google Chirp 3 HD voices.", usedBy: "Auto Video, Characters, Voice", getUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "unreal", label: "Unreal Speech", storage: "ytguru-unreal-speech-key", group: "voice", placeholder: "Unreal Speech API key",
    what: "Unreal Speech voices.", usedBy: "Auto Video, Characters, Voice", getUrl: "https://unrealspeech.com/" },
  { id: "elevenlabs", label: "ElevenLabs", storage: "ytguru-elevenlabs-key", group: "voice", placeholder: "ElevenLabs API key",
    what: "ElevenLabs voices (v3 acting).", usedBy: "Auto Video, Characters, Voice", getUrl: "https://elevenlabs.io/app/settings/api-keys" },
];

const EVENT = "ytguru-config-changed";

export function getKey(id: KeyId): string {
  const info = KEY_INFO.find((k) => k.id === id);
  try {
    return info ? (localStorage.getItem(info.storage) ?? "").trim() : "";
  } catch {
    return "";
  }
}

export function setKey(id: KeyId, value: string): void {
  const info = KEY_INFO.find((k) => k.id === id);
  if (!info) return;
  try {
    if (value.trim()) localStorage.setItem(info.storage, value.trim());
    else localStorage.removeItem(info.storage);
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** A key that stays up to date when it is changed on the Dashboard (or in another tab). */
export function useKey(id: KeyId): string {
  const [v, setV] = useState(() => getKey(id));
  useEffect(() => {
    const on = () => setV(getKey(id));
    window.addEventListener(EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, [id]);
  return v;
}

/** The user's voice-provider keys, as the backends expect them. */
export function voiceKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ["unreal", "elevenlabs", "google", "gemini"] as KeyId[]) {
    const k = getKey(id);
    if (k) out[id] = k;
  }
  return out;
}

export function maskKey(k: string): string {
  if (!k) return "";
  return k.length <= 8 ? "••••" : `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

/** Go to the Dashboard from anywhere without a page reload. */
export function openDashboard(): void {
  if (window.location.pathname === "/dashboard") return;
  // The app's router listens to pushState itself and shows the page.
  const st = (window.history.state ?? {}) as Record<string, unknown>;
  const idx = typeof st.__TSR_index === "number" ? st.__TSR_index : 0;
  window.history.pushState({ __TSR_index: idx + 1, key: Math.random().toString(36).slice(2, 10) }, "", "/dashboard");
}

/** A small "⚙ Dashboard" button on every page (bottom-left), so the
    Dashboard is one click away from Home and every tool. */
export function installDashboardButton(): void {
  if (typeof document === "undefined" || document.getElementById("ytguru-dashboard-btn")) return;
  const add = () => {
    if (document.getElementById("ytguru-dashboard-btn")) return;
    const b = document.createElement("button");
    b.id = "ytguru-dashboard-btn";
    b.type = "button";
    b.textContent = "⚙ Dashboard";
    b.title = "All your keys and settings in one place";
    b.style.cssText = "position:fixed;left:18px;bottom:18px;z-index:60;padding:10px 16px;border-radius:999px;"
      + "border:1px solid rgba(168,85,247,.5);background:rgba(20,18,30,.92);color:#e9d5ff;font-weight:600;"
      + "font-size:14px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.45);backdrop-filter:blur(8px)";
    b.onclick = openDashboard;
    document.body.appendChild(b);
  };
  if (document.body) add();
  else window.addEventListener("DOMContentLoaded", add);
}
