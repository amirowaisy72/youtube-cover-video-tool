// 3D Explainer — tool page.
//
// Flow (mirrors Visual Explainer's Script mode):
//  1. Title + narration + sources → "Copy the prompt" (backend builds
//     the narration prompt) … or just type the narration yourself.
//  2. "Copy the shot prompt" → paste the AI's JSON answer → Save & test.
//  3. Every shot gets a live 3D preview; "Fix this shot" per shot.
//  4. Voice: shared VoicePicker + ttsGenerate → one voiceover file.
//  5. Render (per-shot WebGL capture on the backend), watch progress,
//     Stop / Resume, then Assemble → final.mp4 player + download.
//
// Render mode (?render=1&project=<id>&shot=<index>): renders ONLY a
// full-viewport scene for one shot and wires window.__x3d_ready /
// __x3d_seek / __x3d_duration for the backend's deterministic capture.
// No UI chrome, background is the scene's own STYLE3D.bg.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import VoicePicker from "@/components/VoicePicker";
import { ttsGenerate } from "@/lib/api";
import ExplainerSceneView from "@/components/explainer3d/ExplainerScene";
import AssetsPanel from "@/components/explainer3d/AssetsPanel";
import type { ExplainerScene } from "@/components/explainer3d/scene";
import { QUALITY, dimsFor, type Orientation, type QualityName } from "@/components/explainer3d/style";
import { EXAMPLES, TEMPLATES, makeShot, type Shot } from "@/components/explainer3d/templates";

declare global {
  interface Window {
    __x3d_ready?: boolean;
    __x3d_seek?: (t: number) => void;
    __x3d_duration?: number;
  }
}

export const Route = createFileRoute("/explainer3d")({
  component: Explainer3DPage,
  validateSearch: (s: Record<string, unknown>) => s,
});

// ------------------------------------------------------------ fetch helpers

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text().catch(() => r.statusText)}`);
  return (await r.json()) as T;
}

interface Project {
  id: string;
  title?: string;
  narration?: string;
  sources?: string;
  shots?: Shot[];
  [k: string]: unknown;
}

async function copyText(text: string, setNote: (s: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    setNote("Copied — paste it into your AI chat.");
  } catch {
    setNote("Copy failed — select the text manually.");
  }
}

/** Pull the first JSON array/object out of a pasted AI answer. */
function parseShotsJson(raw: string): Shot[] {
  const start = raw.indexOf("[");
  const objStart = raw.indexOf("{");
  let parsed: unknown;
  if (start >= 0 && (objStart < 0 || start < objStart)) {
    parsed = JSON.parse(raw.slice(start, raw.lastIndexOf("]") + 1));
  } else if (objStart >= 0) {
    parsed = JSON.parse(raw.slice(objStart, raw.lastIndexOf("}") + 1));
  } else {
    throw new Error("No JSON found in the pasted text.");
  }
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : ((parsed as { shots?: unknown[] }).shots ?? []);
  if (!arr.length) throw new Error("JSON parsed, but it contains no shots.");
  return arr.map((s, i) => {
    const shot = s as Partial<Shot>;
    const base = makeShot(typeof shot.template === "string" && TEMPLATES[shot.template] ? shot.template : "globe");
    return {
      ...base,
      ...shot,
      id: shot.id || `shot-${i + 1}`,
      params: { ...base.params, ...(shot.params ?? {}) },
      labels: shot.labels ?? [],
      cards: shot.cards ?? [],
    } as Shot;
  });
}

// ------------------------------------------------------------ render mode

function RenderMode({ projectId, shotSel, quality, orientation }: { projectId: string; shotSel: string; quality: QualityName; orientation: Orientation }) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [error, setError] = useState("");
  const dims = dimsFor(quality, orientation);

  useEffect(() => {
    let alive = true;
    j<Project>(`/api/3d/projects/${encodeURIComponent(projectId)}`)
      .then((p) => {
        if (!alive) return;
        const shots = p.shots ?? [];
        const byId = shots.find((s) => s.id === shotSel);
        const idx = Number.isFinite(Number(shotSel)) ? Number(shotSel) : -1;
        const found = byId ?? shots[idx] ?? shots[0];
        if (!found) { setError("Shot not found in project."); return; }
        setShot(found);
        window.__x3d_duration = found.duration;
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [projectId, shotSel]);

  const onReady = useCallback((scene: ExplainerScene) => {
    window.__x3d_seek = (t: number) => { scene.seek(t); scene.render(); };
    window.__x3d_duration = scene.duration;
    window.__x3d_ready = true;
  }, []);

  if (error) return <div style={{ background: "#04101f", color: "#fff", width: dims.w, height: dims.h }}>{error}</div>;
  if (!shot) return <div style={{ background: "#04101f", width: dims.w, height: dims.h }} />;
  return (
    <div style={{ background: "#04101f", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <ExplainerSceneView shot={shot} width={dims.w} height={dims.h} time={0} quality={quality} onReady={onReady} style={{ width: dims.w, height: dims.h }} />
    </div>
  );
}

// ------------------------------------------------------------ shot preview card

function ShotPreview({ projectId, shot, index, onFixed }: { projectId: string; shot: Shot; index: number; onFixed: (s: Shot) => void }) {
  const [playing, setPlaying] = useState(false);
  const [fixPrompt, setFixPrompt] = useState("");
  const [fixAnswer, setFixAnswer] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const getFixPrompt = async () => {
    setBusy(true);
    try {
      const data = await j<{ prompt: string }>(`/api/3d/projects/${projectId}/shots/${index}/fix-prompt`);
      setFixPrompt(data.prompt);
      await copyText(data.prompt, setNote);
    } catch (e) { setNote(`Could not get the fix prompt: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  };

  const saveFix = async () => {
    setBusy(true);
    try {
      const parsed = parseShotsJson(fixAnswer);
      const fixed = parsed[0];
      const data = await j<{ shot?: Shot }>(`/api/3d/projects/${projectId}/shots/${index}/fix-save`, {
        method: "POST",
        body: JSON.stringify({ shot: fixed }),
      });
      onFixed(data.shot ?? fixed);
      setNote("Fix saved.");
      setFixAnswer("");
    } catch (e) { setNote(`Fix not saved: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  };

  return (
    <div className="glass p-4">
      <div className="overflow-hidden rounded">
        <ExplainerSceneView shot={shot} width={480} height={270} playing={playing} time={shot.duration * 0.4} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="chip">{TEMPLATES[shot.template]?.title ?? shot.template}</span>
        <span className="chip">{shot.duration}s</span>
        <button className="btn" onClick={() => setPlaying((p) => !p)}>{playing ? "⏸ Pause" : "▶ Play"}</button>
        <button className="btn" disabled={busy || !projectId} onClick={() => void getFixPrompt()}>Fix this shot</button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{shot.narration || shot.say || ""}</p>
      {fixPrompt && (
        <div className="mt-3 space-y-2">
          <textarea className="w-full rounded border border-white/10 bg-transparent p-2 text-sm" rows={5} readOnly value={fixPrompt} />
          <textarea className="w-full rounded border border-white/10 bg-transparent p-2 text-sm" rows={4} placeholder="Paste the AI's fixed shot JSON here…" value={fixAnswer} onChange={(e) => setFixAnswer(e.target.value)} />
          <button className="btn btn-primary" disabled={busy || !fixAnswer.trim()} onClick={() => void saveFix()}>Save fix</button>
        </div>
      )}
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}

// ------------------------------------------------------------ main page

function Explainer3DPage() {
  const search = Route.useSearch() as Record<string, unknown>;
  if (typeof window !== "undefined" && (search.render === "1" || search.render === 1 || new URLSearchParams(window.location.search).get("render") === "1")) {
    const qs = new URLSearchParams(window.location.search);
    return (
      <RenderMode
        projectId={String(search.project ?? qs.get("project") ?? "")}
        shotSel={String(search.shot ?? qs.get("shot") ?? "0")}
        quality={((search.quality ?? qs.get("quality") ?? "medium") as QualityName)}
        orientation={((search.orientation ?? qs.get("orientation") ?? "landscape") as Orientation)}
      />
    );
  }
  return <ToolPage />;
}

function ToolPage() {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [narration, setNarration] = useState("");
  const [sources, setSources] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [shotsJson, setShotsJson] = useState("");
  const [parseError, setParseError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  // VoicePicker wiring: the shared picker reports (provider, voice).
  // ttsGenerate(text, voice, rate) covers the "edge" provider path;
  // other providers go through the same call with their voice id —
  // the backend TTS route resolves the provider from the voice id.
  const [voiceSel, setVoiceSel] = useState<{ provider: string; voice: string }>({ provider: "edge", voice: "" });
  const [voiceUrl, setVoiceUrl] = useState("");
  const [quality, setQuality] = useState<QualityName>("medium");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [renderState, setRenderState] = useState<{ status: string; progress: number }>({ status: "", progress: 0 });
  const [finalUrl, setFinalUrl] = useState("");
  const pollRef = useRef<number | null>(null);

  const ensureProject = useCallback(async (): Promise<string> => {
    if (projectId) return projectId;
    const p = await j<Project>("/api/3d/projects", {
      method: "POST",
      body: JSON.stringify({ title, narration, sources }),
    });
    setProjectId(p.id);
    return p.id;
  }, [projectId, title, narration, sources]);

  const saveProject = async (extra: Partial<Project> = {}) => {
    const id = await ensureProject();
    await j(`/api/3d/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, narration, sources, shots, ...extra }),
    });
    return id;
  };

  const getPrompt = async (kind: "prompt-narration" | "prompt-shots") => {
    setBusy(kind);
    try {
      const id = await saveProject();
      const data = await j<{ prompt: string }>(`/api/3d/projects/${id}/${kind}`);
      await copyText(data.prompt, setNote);
    } catch (e) { setNote(`Could not get the prompt: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(""); }
  };

  const saveAndTest = async () => {
    setParseError("");
    let parsed: Shot[];
    try {
      parsed = parseShotsJson(shotsJson);
    } catch (e) {
      setParseError(`That JSON did not parse: ${e instanceof Error ? e.message : String(e)} — paste the AI's whole answer and try again.`);
      return;
    }
    setBusy("shots");
    try {
      const id = await ensureProject();
      await j(`/api/3d/projects/${id}`, { method: "PUT", body: JSON.stringify({ title, narration, sources, shots: parsed }) });
      setShots(parsed);
      setNote(`${parsed.length} shot(s) saved — previews below.`);
    } catch (e) { setParseError(`Shots parsed but saving failed: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(""); }
  };

  const makeVoice = async () => {
    const text = shots.length ? shots.map((s) => s.say || s.narration).join("\n\n") : narration;
    if (!text.trim()) { setNote("Write the narration (or save shots) first."); return; }
    setBusy("voice");
    try {
      // ttsGenerate(text, voice, rate) — see @/lib/api. Returns the
      // generated audio (url/file fields vary by provider); the URL is
      // stored and passed to Assemble so it is muxed into final.mp4.
      const res = (await ttsGenerate(text, voiceSel.voice, "+0%")) as unknown as { download_url?: string; audio_url?: string; url?: string; file?: string } | string;
      const url = typeof res === "string" ? res : res.download_url ?? res.audio_url ?? res.url ?? res.file ?? "";
      setVoiceUrl(url);
      setNote(url ? "Voice made — it will be sent to Assemble." : "Voice made (no URL returned — Assemble will use the project's voice file).");
    } catch (e) { setNote(`Voice failed: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(""); }
  };

  const pollStatus = useCallback((id: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      j<{ status: string; progress?: number; done?: boolean }>(`/api/3d/projects/${id}/render-status`)
        .then((s) => {
          setRenderState({ status: s.status, progress: s.progress ?? 0 });
          if (s.status === "done" || s.done) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            setFinalUrl(`/api/3d/projects/${id}/file/final.mp4`);
          }
          if (["error", "stopped", "failed"].includes(s.status) && pollRef.current) window.clearInterval(pollRef.current);
        })
        .catch(() => { /* keep polling through brief backend hiccups */ });
    }, 2000);
  }, []);

  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const startRender = async () => {
    setBusy("render");
    try {
      const id = await saveProject();
      await j(`/api/3d/projects/${id}/render`, { method: "POST", body: JSON.stringify({ quality, orientation }) });
      setRenderState({ status: "rendering", progress: 0 });
      pollStatus(id);
    } catch (e) { setNote(`Render could not start: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(""); }
  };

  const stopRender = async () => {
    if (!projectId) return;
    try { await j(`/api/3d/projects/${projectId}/stop`, { method: "POST" }); } catch { /* status poll will show it */ }
    setRenderState((s) => ({ ...s, status: "stopped" }));
  };

  const assemble = async () => {
    setBusy("assemble");
    try {
      const id = await ensureProject();
      const data = await j<{ file?: string; url?: string }>(`/api/3d/projects/${id}/assemble`, {
        method: "POST",
        body: JSON.stringify({ voiceover_url: voiceUrl || undefined }),
      });
      setFinalUrl(data.url ?? data.file ?? `/api/3d/projects/${id}/file/final.mp4`);
      setNote("Assembled — watch it below.");
    } catch (e) { setNote(`Assemble failed: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(""); }
  };

  const dims = dimsFor(quality, orientation);
  const stopped = ["stopped", "error", "failed", "partial"].includes(renderState.status);

  return (
    <div className="space-y-8">
      <section>
        <span className="chip mb-3">✦ New · 3D Explainer</span>
        <h1 className="text-4xl font-bold">3D <span className="text-gradient">Explainer</span></h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Real 3D scenes — globes, cutaways, underwater cables, flying over circuits — built from a shot list your AI writes. Same flow as Visual Explainer, in 3D.</p>
      </section>
      {note && <p className="glass p-3 text-sm">{note}</p>}

      {/* 1 — narration */}
      <div className="glass p-6">
        <h2 className="text-xl font-bold">1 · Title &amp; narration</h2>
        <input className="mt-4 w-full rounded border border-white/10 bg-transparent p-2" placeholder="Video title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="mt-3 w-full rounded border border-white/10 bg-transparent p-2" rows={7} placeholder="Narration script — or copy the prompt below, let your AI write it, and paste it here." value={narration} onChange={(e) => setNarration(e.target.value)} />
        <textarea className="mt-3 w-full rounded border border-white/10 bg-transparent p-2" rows={3} placeholder="Sources / facts the narration must stick to (optional)" value={sources} onChange={(e) => setSources(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy === "prompt-narration"} onClick={() => void getPrompt("prompt-narration")}>Copy the prompt</button>
          <button className="btn" disabled={busy === "save"} onClick={() => { setBusy("save"); void saveProject().then(() => setNote("Saved.")).catch((e) => setNote(String(e))).finally(() => setBusy("")); }}>Save</button>
        </div>
      </div>

      {/* 2 — shots */}
      <div className="glass p-6">
        <h2 className="text-xl font-bold">2 · Shots</h2>
        <p className="mt-1 text-sm text-muted-foreground">Copy the shot prompt, paste it to your AI with the narration, then paste its JSON answer here.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy === "prompt-shots"} onClick={() => void getPrompt("prompt-shots")}>Copy the shot prompt</button>
          <button className="btn" onClick={() => { setShotsJson(JSON.stringify([EXAMPLES.globe, EXAMPLES.underwater], null, 2)); setParseError(""); }}>Insert example shots</button>
        </div>
        <textarea className="mt-3 w-full rounded border border-white/10 bg-transparent p-2 font-mono text-sm" rows={8} placeholder='Paste the AI answer — a JSON array of shots (templates: globe, map_zoom, hero_object, cutaway, macro_flyover, underwater, city_aerial, data_card)' value={shotsJson} onChange={(e) => setShotsJson(e.target.value)} />
        {parseError && <p className="mt-2 rounded bg-red-500/10 p-3 text-sm text-red-400">{parseError}</p>}
        <button className="btn btn-primary mt-3" disabled={busy === "shots" || !shotsJson.trim()} onClick={() => void saveAndTest()}>Save &amp; test</button>
      </div>

      {/* 3 — previews */}
      {shots.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-bold">3 · Preview &amp; fix shots</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {shots.map((s, i) => (
              <ShotPreview key={s.id} projectId={projectId} shot={s} index={i} onFixed={(fixed) => setShots((prev) => prev.map((x) => (x.id === s.id ? fixed : x)))} />
            ))}
          </div>
        </div>
      )}

      <AssetsPanel />

      {/* 4 — voice */}
      <div className="glass p-6">
        <h2 className="text-xl font-bold">4 · Voice</h2>
        <div className="mt-3">
          <VoicePicker
            provider={voiceSel.provider}
            voice={voiceSel.voice}
            onChange={(a: unknown, b?: unknown) => {
              // VoicePicker reports either onChange(provider, voice) or
              // onChange({provider, voice}) depending on version.
              if (typeof a === "object" && a !== null) {
                const o = a as { provider?: string; voice?: string };
                setVoiceSel({ provider: o.provider ?? voiceSel.provider, voice: o.voice ?? voiceSel.voice });
              } else {
                setVoiceSel({ provider: String(a ?? voiceSel.provider), voice: String(b ?? voiceSel.voice) });
              }
            }}
          />
        </div>
        <button className="btn btn-primary mt-3" disabled={busy === "voice"} onClick={() => void makeVoice()}>{busy === "voice" ? "Making voice…" : "Make the voice"}</button>
        {voiceUrl && <p className="mt-2 text-sm text-muted-foreground">Voiceover ready — it is sent to Assemble below.</p>}
      </div>

      {/* 5 — render */}
      <div className="glass p-6">
        <h2 className="text-xl font-bold">5 · Render &amp; assemble</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm">Quality
            <select className="ml-2 rounded border border-white/10 bg-transparent p-2" value={quality} onChange={(e) => setQuality(e.target.value as QualityName)}>
              {(Object.keys(QUALITY) as QualityName[]).map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </label>
          <label className="text-sm">Orientation
            <select className="ml-2 rounded border border-white/10 bg-transparent p-2" value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
              <option value="landscape">Landscape</option>
              <option value="shorts">Shorts (9:16)</option>
            </select>
          </label>
          <span className="chip">{dims.w}×{dims.h} · {dims.fps} fps</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy === "render" || !shots.length} onClick={() => void startRender()}>Render</button>
          {renderState.status === "rendering" && <button className="btn" onClick={() => void stopRender()}>Stop</button>}
          {stopped && <button className="btn" onClick={() => void startRender()}>Resume</button>}
          <button className="btn" disabled={busy === "assemble"} onClick={() => void assemble()}>Assemble</button>
        </div>
        {renderState.status && (
          <div className="mt-4">
            <div className="h-3 w-full overflow-hidden rounded bg-white/10">
              <div className="h-full bg-orange-500 transition-all" style={{ width: `${Math.round(renderState.progress <= 1 ? renderState.progress * 100 : renderState.progress)}%` }} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{renderState.status} · {Math.round(renderState.progress <= 1 ? renderState.progress * 100 : renderState.progress)}%</p>
          </div>
        )}
        {finalUrl && (
          <div className="mt-5">
            <video className="w-full rounded" controls src={finalUrl} />
            <div className="mt-3 flex gap-2">
              <a className="btn btn-primary" href={finalUrl} download>⬇ Download final.mp4</a>
              <Link to="/my-videos" className="btn">Open My Videos</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
