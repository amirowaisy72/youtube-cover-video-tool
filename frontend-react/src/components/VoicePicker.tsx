import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ColabEstimate } from "@/components/ColabPanel";
import { ApiError, ttsPreview, ttsProviderVoices, ttsProviders, ttsQuota, type TtsProvider, type TtsVoiceOption, voiceCloneList } from "@/lib/api";
import { type KeyId, useKey } from "@/lib/config";

/** The voice choice every tool shares: the free Edge voices, your own keys' providers and your cloned voices,
 *  each one playable before you pick it. */
export function VoicePicker({ provider, voice, onChange }: {
  provider: string;
  voice: string;
  onChange: (provider: string, voice: string) => void;
}) {
  const [providers, setProviders] = useState<TtsProvider[]>([]);
  const [voices, setVoices] = useState<TtsVoiceOption[]>([]);
  const key = useKey(provider as KeyId);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [playError, setPlayError] = useState("");
  const [quota, setQuota] = useState<{ quota_api: boolean; remaining_chars: number | null; limit_chars: number | null; used_chars: number | null; note: string } | null>(null);
  const [quotaError, setQuotaError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selected = providers.find((p) => p.id === provider);
  // your own cloned voices (Voice Cloner) — spoken like a studio presenter too (user, 2026-11-18)
  const [clones, setClones] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    voiceCloneList().then((l) => setClones((l || []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })))).catch(() => undefined);
  }, []);

  useEffect(() => {
    ttsProviders()
      .then((d) => setProviders(d.providers || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setQuota(null);
    setQuotaError("");
    if (provider === "edge") {
      setLoadingVoices(true);
      setVoicesError("");
      ttsProviderVoices("edge")
        .then((d) => setVoices(d.voices || []))
        .catch((e) => setVoicesError(e instanceof Error ? e.message : "Could not load voices."))
        .finally(() => setLoadingVoices(false));
      return;
    }
    setVoices([]);
  }, [provider]);

  const loadVoices = async () => {
    if (!key.trim()) {
      setVoicesError("Add your API key first (link above).");
      return;
    }
    setLoadingVoices(true);
    setVoicesError("");
    try {
      const d = await ttsProviderVoices(provider, key.trim());
      setVoices(d.voices || []);
      if ((d.voices || []).length === 0) setVoicesError("No voices returned — check the key.");
    } catch (e) {
      setVoicesError(e instanceof ApiError ? e.message : "Could not load voices.");
    } finally {
      setLoadingVoices(false);
    }
  };

  const checkQuota = async () => {
    if (!key.trim()) {
      setQuotaError("Add your API key first.");
      return;
    }
    setQuotaError("");
    try {
      const q = await ttsQuota(provider, key.trim());
      setQuota(q);
    } catch (e) {
      setQuotaError(e instanceof ApiError ? e.message : "Could not check quota.");
    }
  };

  const playSample = async (v: TtsVoiceOption) => {
    if (audioRef.current) audioRef.current.pause();
    setPlaying(v.id);
    setPlayError("");
    try {
      const url = v.sample_url || (await ttsPreview(provider, v.id, key.trim())).sample_url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(null);
      await audio.play();
    } catch (e) {
      setPlaying(null);
      setPlayError(e instanceof ApiError ? e.message : "Could not play this voice — check the API key and try again.");
    }
  };

  // Clicking a voice selects it AND plays it (user, 2026-11-09):
  // he clicks a voice to hear it, so the card itself must play
  // the sample — the small Listen button alone was too easy to
  // miss, and a silent card click looked broken.
  const selectAndPlay = (v: TtsVoiceOption) => {
    onChange(provider, v.id);
    void playSample(v);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <button
            key={p.id}
            className={`btn btn-sm ${provider === p.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => onChange(p.id, p.id === "edge" ? "en-US-AriaNeural" : voice)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {clones.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-sm font-semibold">🧬 Your cloned voices</p>
          <div className="flex flex-wrap gap-2">
            {clones.map((c) => (
              <button key={c.id} className={`btn btn-sm ${voice === `clone:${c.id}` ? "btn-primary" : "btn-ghost"}`}
                onClick={() => onChange("edge", `clone:${c.id}`)}>
                {c.name}
              </button>
            ))}
          </div>
          {voice.startsWith("clone:") && <ColabEstimate />}
        </div>
      )}
      {selected && selected.key_name && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{selected.key_name}:</span>
            {key ? <span className="text-emerald-400">✓ set in the Dashboard</span> : <span className="text-amber-300">○ not set yet</span>}
            <Link to="/dashboard" className="btn btn-ghost btn-sm">⚙ {key ? "Change" : "Add it"} in Dashboard</Link>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{selected.key_help}</p>
          <div className="mt-2 flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled={loadingVoices} onClick={() => void loadVoices()}>
              {loadingVoices ? "Loading voices…" : "Load voices"}
            </button>
            {selected.quota_api && (
              <button className="btn btn-ghost btn-sm" onClick={() => void checkQuota()}>Check remaining quota</button>
            )}
          </div>
          {voicesError && <p className="mt-2 text-sm text-destructive">{voicesError}</p>}
          {quota && (
            <p className="mt-2 text-sm">
              {quota.quota_api && quota.remaining_chars !== null
                ? <>Remaining: <b>{quota.remaining_chars.toLocaleString()}</b> / {quota.limit_chars?.toLocaleString()} characters this month.</>
                : quota.note}
            </p>
          )}
          {quotaError && <p className="mt-2 text-sm text-destructive">{quotaError}</p>}
          {!selected.quota_api && (
            <p className="mt-2 text-xs text-muted-foreground">{selected.quota_note}</p>
          )}
        </div>
      )}
      {selected && !selected.key_name && (
        <p className="mt-2 text-xs text-muted-foreground">{selected.quota_note}</p>
      )}
      {voices.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {voices.map((v) => (
            <button
              key={v.id}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm ${voice === v.id ? "border-primary bg-primary/10" : "border-border"}`}
              onClick={() => selectAndPlay(v)}
            >
              <span className="min-w-0 flex-1 truncate">{v.label}</span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">
                {playing === v.id ? "⏸ Playing…" : "▶ Listen"}
              </span>
            </button>
          ))}
        </div>
      )}
      {playError && <p className="mt-2 text-sm text-destructive">{playError}</p>}
      {provider !== "edge" && voices.length === 0 && !loadingVoices && (
        <p className="mt-2 text-xs text-muted-foreground">Add your key above, then Load voices to hear and pick a variant.</p>
      )}
    </div>
  );
}
