/** Which AI is writing right now (user, 2026-11-19/20): your Gemini key or the free Pollinations AI,
    why Gemini is not used (the real error), when it was last tried and when it is tried again —
    plus the Gemini model switcher and "Gemini only" (never the free AI). */
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getKey } from "@/lib/config";

type Status = {
  using: "gemini" | "pollinations" | "waiting"; has_key: boolean; last_engine: string; last_model: string;
  last_ok_ago: number | null; last_try_ago: number | null; reason: string; retry_in: number | null; free_error: string;
  model: string; gemini_only: boolean;
};
type Model = { id: string; label: string };

const MODEL_KEY = "ytguru-gemini-model";
const ONLY_KEY = "ytguru-gemini-only";

function ago(s: number | null) {
  if (s == null) return "not yet";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

function inTime(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60}s`;
  return `${Math.round(s / 3600)} h`;
}

function saved(k: string, d = "") { try { return localStorage.getItem(k) ?? d; } catch { return d; } }

/** Send the key + model choice to the backend (the Dashboard keeps the key in this browser). */
export async function pushAiSettings(forceGeminiOnly = false): Promise<Status | null> {
  try {
    const r = await fetch("/api/animator/config/ai-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gemini_key: getKey("gemini"), model: saved(MODEL_KEY), gemini_only: forceGeminiOnly || saved(ONLY_KEY) === "1" }),
    });
    return await r.json();
  } catch { return null; }
}

export function AiStatusBox({ compact = false, geminiOnly = false }: { compact?: boolean; geminiOnly?: boolean }) {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<Model[] | null>(null);
  const [model, setModel] = useState(() => saved(MODEL_KEY));
  const [only, setOnly] = useState(() => geminiOnly || saved(ONLY_KEY) === "1");
  const [tests, setTests] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    void pushAiSettings(geminiOnly).then((d) => { if (alive && d) setSt(d); });
    const t = window.setInterval(() => {
      void fetch("/api/animator/config/ai-status").then((r) => r.json()).then((d: Status) => { if (alive) setSt(d); }).catch(() => undefined);
    }, 3000);
    return () => { alive = false; window.clearInterval(t); };
  }, [geminiOnly]);
  if (!st) return null;
  const gem = st.using === "gemini";
  const retry = async () => {
    setBusy(true);
    try { setSt(await fetch("/api/animator/config/ai-status/retry", { method: "POST" }).then((r) => r.json())); } catch { /* next poll */ }
    setBusy(false);
  };
  const apply = async (m: string, o: boolean) => {
    try { localStorage.setItem(MODEL_KEY, m); localStorage.setItem(ONLY_KEY, o ? "1" : "0"); } catch { /* private mode */ }
    const d = await pushAiSettings(geminiOnly);
    if (d) setSt(d);
  };
  const loadModels = async () => {
    setErr("");
    try {
      const r = await fetch("/api/animator/config/ai-models");
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not load the models");
      setModels(d.models);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };
  const test = async (id: string) => {
    setTests((t) => ({ ...t, [id]: "testing…" }));
    try {
      const d = await fetch("/api/animator/config/ai-models/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: id }) }).then((r) => r.json());
      setTests((t) => ({ ...t, [id]: d.ok ? `✓ works (${d.seconds}s)` : `✗ ${d.error || "failed"}` }));
    } catch { setTests((t) => ({ ...t, [id]: "✗ failed" })); }
  };
  const label = gem ? `Gemini (your key)${st.model ? ` · ${st.model}` : st.last_model && st.last_engine === "gemini" ? ` · ${st.last_model}` : ""}`
    : st.using === "waiting" ? "Gemini only — waiting for Gemini" : "Free AI (Pollinations) — slower, weaker plans";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${gem ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/50 bg-amber-500/10"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <b>🧠 AI writer:</b>
        <span className={gem ? "text-emerald-300" : "text-amber-300"}>{label}</span>
        <span className="text-xs text-muted-foreground">· last answer {ago(st.last_ok_ago)}{st.last_engine ? ` from ${st.last_engine === "gemini" ? "Gemini" : "the free AI"}` : ""}</span>
        {!compact && <button className="ml-auto text-xs underline" onClick={() => { setOpen(!open); if (!models) void loadModels(); }}>⚙ Gemini model</button>}
      </div>
      {!gem && !compact && (
        <div className="mt-1 space-y-1 text-xs">
          <p><b>Why not Gemini:</b> {st.reason || "—"}</p>
          {st.has_key && st.retry_in != null && st.retry_in > 0 && (
            <p>Last Gemini try {ago(st.last_try_ago)} · tries Gemini again in <b>{inTime(st.retry_in)}</b>
              <button className="btn btn-ghost btn-sm ml-2" disabled={busy} onClick={() => void retry()}>↻ Try Gemini now</button></p>
          )}
          {!st.has_key && <Link to="/dashboard" className="btn btn-secondary btn-sm">⚙ Add your free Gemini key</Link>}
          {st.free_error && st.using === "pollinations" && <p className="text-rose-300">Free AI error: {st.free_error}</p>}
        </div>
      )}
      {open && !compact && (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={only || geminiOnly} disabled={geminiOnly} onChange={(e) => { setOnly(e.target.checked); void apply(model, e.target.checked); }} />
            <span><b>Use only Gemini</b> — never the free AI. When Google is busy the app waits and tries again instead.{geminiOnly ? " (Always on in the Visual Explainer.)" : ""}</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span>Model:</span>
            <select className="field h-8 w-auto text-xs" value={model} onChange={(e) => { setModel(e.target.value); void apply(e.target.value, only); }}>
              <option value="">Automatic (best available, tried in order)</option>
              {(models || []).map((m) => <option key={m.id} value={m.id}>{m.label} ({m.id})</option>)}
              {model && !(models || []).some((m) => m.id === model) && <option value={model}>{model}</option>}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => void loadModels()}>↻ Load my models</button>
          </div>
          {err && <p className="text-rose-300">{err}</p>}
          {models && (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {models.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{m.label} <span className="text-muted-foreground">({m.id})</span></span>
                  <span className={tests[m.id]?.startsWith("✓") ? "text-emerald-300" : tests[m.id]?.startsWith("✗") ? "text-rose-300" : "text-muted-foreground"}>{tests[m.id] || ""}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => void test(m.id)}>Test</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setModel(m.id); void apply(m.id, only); }}>Use</button>
                </div>
              ))}
            </div>
          )}
          <p className="text-muted-foreground">Tip: "Flash" models are fast and have the biggest free limits; "Pro" models think more but are often busy on the free plan.</p>
        </div>
      )}
    </div>
  );
}
