import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { connectYoutubeFlow, youtubeStatus } from "@/lib/api";
import { useApp } from "@/lib/app-store";
import { getKey } from "@/lib/config";

/** Talking Presenter, steps 4–9: photo, lip-sync, backgrounds, layout, extras, render. */

export type Scene = {
  narration: string; start: number; end: number; presenter: boolean; position: string; size?: number; effect?: string;
  problem: string; preview: string;
  extras?: { wave?: { on?: boolean }; subs?: { on?: boolean; position?: string } };
  bg: { type: string; own?: boolean; color?: string; code?: string; files?: string[]; query?: string; credit?: string;
    test?: { ok: boolean; error: string; warnings: string[]; video: string; sheet: string } };
};
export type Job = {
  id: string; url: string; title: string; channel?: string; duration?: number; language?: string;
  status: "idle" | "working" | "failed" | "stopped"; step_working?: string; progress?: number; stage?: string; error?: string; notice?: string;
  transcript: string; segments?: { start: number; end: number; text: string }[]; sources: { url: string; fact: string }[];
  script: string; script_mode: string; copied?: number;
  voice: { provider: string; voice: string } | null; voice_ready: boolean; voice_outdated: boolean;
  voice_duration?: number; voice_version?: number; voice_warnings?: string[];
  person?: { id: string; name: string; version: number }; has_photo?: boolean; setup_error?: string;
  layout?: { format: "long" | "short"; position: string; size: number; effect: string; border_color: string };
  extras?: { wave: { on: boolean; style: string; color: string };
    subs: { on: boolean; style: string; font: string; color: string; highlight: string; position: string; size: number } };
  motion?: { mouth: number; head: number; blink: boolean };
  storyboard?: Scene[]; storyboard_ready?: boolean; problems?: string[]; render_estimate?: number; has_final?: boolean;
  rendered?: { seconds: number; length: number; at: number };
  video_bg?: { type: string; color: string; files: string[] }; whole_preview?: string; has_original?: boolean;
  youtube?: { title: string; url: string; privacy: string };
};

export async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const form = body instanceof FormData;
  const r = await fetch(`/api/presenter/${path}`, {
    method, headers: form ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? null : form ? body : JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as T & { detail?: string };
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : "That did not work. Try again.");
  return data;
}

export type Tools = {
  job: Job; busy: boolean; working: boolean;
  /** run an action; a returned job replaces the one on screen */
  act: (fn: () => Promise<Job | void>, done?: string) => Promise<void>;
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const about = (s: number) => (s < 90 ? "about a minute" : `about ${Math.round(s / 60)} minutes`);
export const RULE = "Use your own face or voice, ones you have permission for, or AI-made ones.";

// ------------------------------------------------------------------ preview of one scene
function ScenePreview({ t, index, label = "👁 Preview this scene" }: { t: Tools; index: number; label?: string }) {
  const s = t.job.storyboard?.[index];
  const short = t.job.layout?.format === "short";
  return (
    <div>
      <button className="btn btn-ghost btn-sm" disabled={t.busy || t.working}
        onClick={() => void t.act(() => call<Job>(`jobs/${t.job.id}/preview/${index}`, "POST"))}>{label}</button>
      {s?.preview && !t.working && (
        <video className={`mt-2 w-full rounded-xl border border-border ${short ? "max-w-[240px]" : "max-w-xl"}`} controls autoPlay
          src={`/api/presenter/jobs/${t.job.id}/file/preview/${s.preview}`} />
      )}
    </div>
  );
}

function WholePreview({ t }: { t: Tools }) {
  const short = t.job.layout?.format === "short";
  return (
    <div className="space-y-2">
      <button className="btn btn-primary" disabled={t.busy || t.working}
        onClick={() => void t.act(() => call<Job>(`jobs/${t.job.id}/preview-all`, "POST"))}>▶ Preview the whole video</button>
      <p className="text-xs text-muted-foreground">A small, quick version of everything with sound. Scenes you did not change are reused.</p>
      {t.job.whole_preview && !t.working && (
        <video className={`w-full rounded-xl border border-border ${short ? "max-w-[240px]" : "max-w-xl"}`} controls
          src={`/api/presenter/jobs/${t.job.id}/file/preview/${t.job.whole_preview}`} />
      )}
    </div>
  );
}

/** The scene-by-scene controls, folded away: only for fixes. */
function PerScene({ children, note }: { children: React.ReactNode; note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border p-3">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold" aria-expanded={open}
        onClick={() => setOpen(!open)}>
        <span>{open ? "▾" : "▸"} Change one scene</span>
        <span className="text-xs font-normal text-muted-foreground">{note}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ 4. photo
type Setup = { folder: string; ready: boolean; libraries: boolean; missing: string[];
  download: { busy: boolean; file: string; done: number; total: number; error: string } };
type Face = { index: number; box: number[]; warnings: string[]; usable: boolean };
type Person = { id: string; name: string; faces: Face[]; chosen: number; warnings: string[]; version?: number };

export function PhotoStep({ t }: { t: Tools }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [current, setCurrent] = useState<Person | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState("");
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const readSetup = () => call<Setup>("setup").then(setSetup).catch(() => undefined);
  const readPeople = async () => {
    const d = await call<{ people: Person[] }>("people");
    setPeople(d.people);
    setCurrent((c) => c ?? d.people.find((p) => p.id === t.job.person?.id) ?? null);
  };
  useEffect(() => { void readSetup(); void readPeople(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!setup?.download.busy) return;
    const timer = window.setInterval(() => void readSetup(), 1500);
    return () => window.clearInterval(timer);
  }, [setup?.download.busy]);

  const attempt = async (label: string, fn: () => Promise<void>) => {
    setLoading(label); setErr("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "That did not work."); } finally { setLoading(""); }
  };
  const upload = (file: File) => attempt("Checking the photo…", async () => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    setCurrent(await call<Person>("people", "POST", form));
    setName("");
    await readPeople();
  });
  const pick = (index: number) => attempt("Cutting the person out…", async () => {
    setCurrent(await call<Person>(`people/${current!.id}/choose`, "POST", { index }));
    await readPeople();
  });

  return (
    <>
      <h2 className="font-display text-lg font-bold">4. Choose the presenter photo</h2>
      <p className="rounded-lg border border-border p-2 text-sm">{RULE}</p>
      {setup && !setup.ready && (
        <div className="space-y-2 rounded-xl border border-primary/50 bg-primary/5 p-3">
          <p className="text-sm">The presenter needs a one-time setup: three small model files{setup.libraries ? "" : " and the MediaPipe and OpenCV libraries (about 300 MB)"}. They are kept in <code>{setup.folder}</code>.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary btn-sm" disabled={setup.download.busy} onClick={() => void call<Setup>("setup", "POST").then(setSetup)}>
              {setup.download.busy ? "Setting up…" : "Set up the presenter"}
            </button>
            {setup.download.busy && <button className="btn btn-ghost btn-sm" onClick={() => void call<Setup>("setup/stop", "POST").then(setSetup)}>⏹ Stop</button>}
            <button className="btn btn-ghost btn-sm" disabled={setup.download.busy} onClick={() => {
              const path = window.prompt("Folder for the presenter's files (full path):", setup.folder);
              if (path) void attempt("", async () => setSetup(await call<Setup>("setup/folder", "POST", { path })));
            }}>Change folder</button>
          </div>
          {setup.download.busy && <p className="text-xs text-muted-foreground">{setup.download.file}{setup.download.total ? ` · ${Math.round((100 * setup.download.done) / setup.download.total)}%` : "…"}</p>}
          {setup.download.error && <p className="text-sm text-amber-300">{setup.download.error}</p>}
        </div>
      )}
      <p className="text-sm text-muted-foreground">One still photo of a seated person looking at the camera, mouth closed, good light. A large face looks best.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input className="field max-w-xs" value={name} placeholder="Name for this presenter (optional)" onChange={(e) => setName(e.target.value)} />
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        <button className="btn btn-primary" disabled={!setup?.ready || !!loading} onClick={() => input.current?.click()}>📷 Upload a photo</button>
        {loading && <span className="text-sm text-muted-foreground">{loading}</span>}
      </div>
      {err && <p className="text-sm text-amber-300">{err}</p>}
      {people.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">Saved presenters</p>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => (
              <button key={p.id} className={`btn btn-sm ${current?.id === p.id ? "btn-primary" : "btn-ghost"}`} onClick={() => setCurrent(p)}>
                {p.name}{t.job.person?.id === p.id ? " ✓" : ""}
              </button>
            ))}
          </div>
        </div>
      )}
      {current && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          {current.warnings.map((w, i) => <p key={i} className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-sm">⚠ {w}</p>)}
          <div className="flex flex-wrap items-start gap-3">
            <img className="max-h-72 rounded-lg border border-border" alt="The photo with the faces found" src={`/api/presenter/people/${current.id}/file/faces.jpg`} />
            {current.chosen >= 0 && (
              <img className="max-h-72 rounded-lg border border-border" alt="The person cut out of the photo"
                style={{ background: "repeating-conic-gradient(#3a4256 0% 25%, #252c3d 0% 50%) 0 0 / 24px 24px" }}
                src={`/api/presenter/people/${current.id}/file/cutout.png?v=${current.version ?? 0}`} />
            )}
          </div>
          {current.faces.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Who presents?
              {current.faces.map((f) => (
                <button key={f.index} className={`btn btn-sm ${current.chosen === f.index ? "btn-primary" : "btn-ghost"}`}
                  disabled={!f.usable || !!loading} onClick={() => void pick(f.index)}>Person {f.index + 1}</button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={current.chosen < 0 || t.busy || t.working}
              onClick={() => void t.act(() => call<Job>(`jobs/${t.job.id}/photo`, "POST", { person: current.id }), "This presenter is in the video.")}>
              ✓ Use this presenter
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              if (window.confirm("Delete this saved presenter?")) void attempt("", async () => { await call(`people/${current.id}`, "DELETE"); setCurrent(null); await readPeople(); });
            }}>🗑 Delete</button>
          </div>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ sliders that save when released
function Slider({ label, value, min, max, step, onSave, disabled }: {
  label: string; value: number; min: number; max: number; step: number; onSave: (v: number) => void; disabled?: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const done = () => { if (v !== value) onSave(v); };
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-36">{label}</span>
      <input type="range" className="flex-1 accent-primary" min={min} max={max} step={step} value={v} disabled={disabled}
        onChange={(e) => setV(Number(e.target.value))} onPointerUp={done} onKeyUp={done} onBlur={done} />
      <span className="w-12 text-right font-mono text-xs">{v.toFixed(2)}</span>
    </label>
  );
}

function Choice({ label, value, options, onPick, disabled }: {
  label: string; value: string; options: [string, string][]; onPick: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-36">{label}</span>
      {options.map(([id, text]) => (
        <button key={id} className={`btn btn-sm ${value === id ? "btn-primary" : "btn-ghost"}`} disabled={disabled} onClick={() => onPick(id)}>{text}</button>
      ))}
    </div>
  );
}

function Colour({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-36">{label}</span>
      <input type="color" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== value) onSave(v); }} />
    </label>
  );
}

const save = (t: Tools, body: unknown) => void t.act(() => call<Job>(`jobs/${t.job.id}/settings`, "POST", body));

// ------------------------------------------------------------------ 5. lip-sync
export function LipStep({ t }: { t: Tools }) {
  const m = t.job.motion ?? { mouth: 1, head: 1, blink: true };
  return (
    <>
      <h2 className="font-display text-lg font-bold">5. Lip-sync</h2>
      <p className="text-sm text-muted-foreground">
        Your photo is animated on this computer: the mouth follows the voice and its sounds, the eyes blink and the head moves a little.
        There is nothing to wait for: it is drawn when you preview or render.
      </p>
      <div className="space-y-2 rounded-xl border border-border p-3">
        <Slider label="Mouth movement" value={m.mouth} min={0.3} max={1.6} step={0.05} disabled={t.working} onSave={(v) => save(t, { motion: { mouth: v } })} />
        <Slider label="Head movement" value={m.head} min={0} max={2} step={0.1} disabled={t.working} onSave={(v) => save(t, { motion: { head: v } })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={m.blink} onChange={(e) => save(t, { motion: { blink: e.target.checked } })} /> Blink every few seconds
        </label>
      </div>
      <ScenePreview t={t} index={0} label="▶ Try it on the first scene" />
    </>
  );
}

// ------------------------------------------------------------------ 6. backgrounds
const TYPES: [string, string][] = [["color", "Plain colour"], ["graphic", "Graphics"], ["stock", "Stock footage"], ["image", "One image"], ["slides", "Sliding images"]];
type Clip = { id: number; poster_url: string | null; video_url: string; user: string | null; duration: number | null };

function StockSearch({ t, index, scene }: { t: Tools; index: number; scene: Scene }) {
  const [source, setSource] = useState<"pexels" | "pixabay">(() => (getKey("pexels") || !getKey("pixabay") ? "pexels" : "pixabay"));
  const [q, setQ] = useState(scene.bg.query ?? "");
  const [clips, setClips] = useState<Clip[]>([]);
  const [msg, setMsg] = useState("");
  const search = async () => {
    const key = getKey(source);
    if (!key) { setMsg(`Add your free ${source} key in the Dashboard first.`); return; }
    setMsg("Searching…");
    const r = await fetch(`/api/stock/search?source=${source}&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`);
    const d = (await r.json()) as { results?: Clip[]; detail?: string };
    setClips((d.results ?? []).slice(0, 8));
    setMsg(!r.ok ? d.detail ?? "The search failed." : d.results?.length ? "Click a clip to use it." : "Nothing found. Try other words.");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select className="field w-32" value={source} onChange={(e) => setSource(e.target.value as "pexels" | "pixabay")} aria-label="Stock source">
          <option value="pexels">Pexels</option><option value="pixabay">Pixabay</option>
        </select>
        <input className="field min-w-0 flex-1" value={q} placeholder="Search words, e.g. cinema audience" onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
        <button className="btn btn-ghost btn-sm" disabled={!q.trim()} onClick={() => void search()}>Search</button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      {clips.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {clips.map((c) => (
            <button key={c.video_url} className="overflow-hidden rounded-lg border border-border hover:border-primary" disabled={t.busy || t.working}
              onClick={() => void t.act(async () => {
                const j = await call<Job>(`jobs/${t.job.id}/scenes/${index}/stock`, "POST", { url: c.video_url, credit: `${source}: ${c.user ?? ""}` });
                setClips([]); setMsg(""); return j;
              }, "Clip saved.")}>
              {c.poster_url ? <img src={c.poster_url} alt="" className="aspect-video w-full object-cover" />
                : <video src={c.video_url} muted preload="metadata" className="aspect-video w-full object-cover" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SceneCard({ t, scene, index }: { t: Tools; scene: Scene; index: number }) {
  const [fix, setFix] = useState(false);
  const [code, setCode] = useState("");
  const kind = scene.bg.type;
  const edit = (body: unknown) => void t.act(() => call<Job>(`jobs/${t.job.id}/scenes/${index}`, "POST", body));
  const upload = (list: FileList) => void t.act(() => {
    const form = new FormData();
    Array.from(list).forEach((f) => form.append("files", f));
    return call<Job>(`jobs/${t.job.id}/scenes/${index}/files`, "POST", form);
  }, "Images saved.");
  const copyFix = () => void t.act(async () => {
    const d = await call<{ prompt: string; sheet: string }>(`jobs/${t.job.id}/graphics/fix/${index}`);
    await navigator.clipboard.writeText(d.prompt);
  }, "Fix prompt copied. Attach the test picture below to your AI, then paste its answer here.");
  const test = scene.bg.test;
  const off = t.busy || t.working;
  return (
    <li className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-sm"><b>Scene {index + 1}</b> <span className="font-mono text-xs text-muted-foreground">{clock(scene.start)}–{clock(scene.end)}</span> {scene.narration}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="field w-44" value={kind} disabled={off} aria-label={`Background of scene ${index + 1}`} onChange={(e) => edit({ type: e.target.value })}>
          {TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" disabled={off} title="Give every scene this background, presenter tick and position"
          onClick={() => edit({ apply_all: true })}>Use for all scenes</button>
        {scene.bg.own && (
          <button className="btn btn-ghost btn-sm" disabled={off}
            onClick={() => void t.act(() => call<Job>(`jobs/${t.job.id}/reset`, "POST", { part: "bg", scene: index }))}>↩ Same as whole video</button>
        )}
      </div>
      {scene.problem && <p className="text-xs text-amber-300">⚠ This scene {scene.problem}.</p>}
      {kind === "color" && <Colour label="Colour" value={scene.bg.color ?? "#1b2433"} onSave={(v) => edit({ color: v })} />}
      {(kind === "image" || kind === "slides") && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept="image/*" multiple={kind === "slides"} disabled={off} className="w-full max-w-full text-sm sm:w-auto"
            onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />
          {(scene.bg.files ?? []).map((f) => <img key={f} src={`/api/presenter/jobs/${t.job.id}/file/media/${f}`} alt="" className="h-14 rounded border border-border" />)}
        </div>
      )}
      {kind === "stock" && (
        <>
          {scene.bg.files?.[0] && (
            <div>
              <video className="h-24 rounded border border-border" muted controls preload="metadata" src={`/api/presenter/jobs/${t.job.id}/file/media/${scene.bg.files[0]}`} />
              {scene.bg.credit && <p className="text-xs text-muted-foreground">{scene.bg.credit}</p>}
            </div>
          )}
          <StockSearch t={t} index={index} scene={scene} />
        </>
      )}
      {kind === "graphic" && test && (
        <div className="text-xs">
          <p className={test.ok ? "text-emerald-300" : "text-red-300"}>{test.ok ? "✓ The scene code works." : `✗ ${test.error}`}</p>
          {test.warnings?.map((w, i) => <p key={i} className="text-amber-300">• {w}</p>)}
          {test.sheet && <a className="underline" target="_blank" rel="noreferrer" href={`/api/presenter/jobs/${t.job.id}/file/graphics/${test.sheet}`}>Test picture (frames) ↗</a>}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <ScenePreview t={t} index={index} />
        {kind === "graphic" && <button className="btn btn-ghost btn-sm" onClick={() => setFix(!fix)}>🔧 Fix this part</button>}
      </div>
      {fix && kind === "graphic" && (
        <div className="space-y-2 rounded-lg border border-primary/50 p-2">
          <button className="btn btn-ghost btn-sm" disabled={off || !scene.bg.code} onClick={copyFix}>📋 Copy the fix prompt</button>
          <textarea className="field min-h-[90px] font-mono text-xs" value={code} placeholder="Paste the corrected code for this scene" onChange={(e) => setCode(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={off || !code.trim()}
            onClick={() => void t.act(async () => { const j = await call<Job>(`jobs/${t.job.id}/graphics/save`, "POST", { text: code, scene: index }); setCode(""); return j; })}>
            💾 Save & test
          </button>
        </div>
      )}
    </li>
  );
}

const WHOLE: [string, string, string][] = [
  ["mix", "Mix (auto)", "Graphics for numbers and comparisons, stock footage for the rest."],
  ["graphic", "Graphics", "Animated scenes from code your AI writes, one prompt for the whole script."],
  ["stock", "Stock footage", "Free clips found from each scene's words."],
  ["image", "One image", "One picture behind the whole video."],
  ["slides", "Sliding images", "Many pictures, spread over the video in order and timed to the narration."],
  ["color", "Plain colour", "A calm single colour."],
];

function GraphicsBox({ t, count }: { t: Tools; count: number }) {
  const [code, setCode] = useState("");
  const off = t.busy || t.working;
  const graphics = (t.job.storyboard ?? []).map((s, i) => ({ s, i })).filter(({ s }) => s.bg.type === "graphic");
  const works = graphics.filter(({ s }) => s.bg.test?.ok).length;
  const broken = graphics.filter(({ s }) => s.bg.test && !s.bg.test.ok).map(({ i }) => i + 1);
  return (
    <div className="space-y-2 rounded-xl border border-primary/50 p-3">
      <p className="text-sm font-semibold">Graphics: {count} scene{count > 1 ? "s" : ""}, {works} working</p>
      <p className="text-xs text-muted-foreground">1. Copy the prompt (it holds the whole script). 2. Give it to any AI. 3. Paste the whole answer once: the app splits it at “# === SCENE N ===” and tests every scene.</p>
      <button className="btn btn-primary btn-sm" disabled={off} onClick={() => void t.act(async () => {
        const d = await call<{ prompt: string }>(`jobs/${t.job.id}/graphics/prompt`);
        await navigator.clipboard.writeText(d.prompt);
      }, "Prompt copied.")}>📋 Copy the prompt</button>
      <textarea className="field min-h-[100px] font-mono text-xs" value={code} placeholder="Paste the AI's whole answer here" onChange={(e) => setCode(e.target.value)} />
      <button className="btn btn-primary btn-sm" disabled={off || !code.trim()}
        onClick={() => void t.act(async () => { const j = await call<Job>(`jobs/${t.job.id}/graphics/save`, "POST", { text: code }); setCode(""); return j; })}>
        💾 Save & test all
      </button>
      {broken.length > 0 && <p className="text-xs text-red-300">Scene {broken.join(", ")} has an error: open “Change one scene” and press “Fix this part”.</p>}
    </div>
  );
}

function WholeBackground({ t }: { t: Tools }) {
  const scenes = t.job.storyboard!;
  const whole = t.job.video_bg ?? { type: "color", color: "#1b2433", files: [] };
  const off = t.busy || t.working;
  const own = scenes.filter((s) => s.bg.own).length;
  const stock = scenes.filter((s) => s.bg.type === "stock");
  const empty = stock.filter((s) => !s.bg.files?.length).length;
  const graphics = scenes.filter((s) => s.bg.type === "graphic").length;
  const set = (body: unknown) => void t.act(() => call<Job>(`jobs/${t.job.id}/video-bg`, "POST", body));
  const images = (list: FileList) => void t.act(() => {
    const form = new FormData();
    Array.from(list).forEach((f) => form.append("files", f));
    return call<Job>(`jobs/${t.job.id}/video-bg/files`, "POST", form);
  }, "Images are in every scene.");
  const fill = (again: boolean) => {
    const source = getKey("pexels") ? "pexels" : "pixabay";
    void t.act(() => {
      if (!getKey(source)) throw new Error("Add a free Pexels or Pixabay key in the Dashboard first.");
      return call<Job>(`jobs/${t.job.id}/stock-auto`, "POST", { source, key: getKey(source), again });
    });
  };
  return (
    <div className="space-y-3 rounded-xl border-2 border-primary/60 bg-primary/5 p-4">
      <p className="font-semibold">🎬 Whole video</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Background of the whole video">
        {WHOLE.map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={whole.type === id} disabled={off}
            className={`btn btn-sm ${whole.type === id ? "btn-primary" : "btn-ghost"}`} onClick={() => set({ type: id })}>{label}</button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{WHOLE.find(([id]) => id === whole.type)?.[2]}</p>
      {whole.type === "color" && <Colour label="Colour" value={whole.color} onSave={(v) => set({ color: v })} />}
      {(whole.type === "image" || whole.type === "slides") && (
        <div className="space-y-2">
          <label className="block text-sm">
            {whole.type === "image" ? "Upload one image (used in every scene)" : "Upload all your images at once (they play in the order you pick them)"}
            <input type="file" accept="image/*" multiple={whole.type === "slides"} disabled={off} className="mt-1 block w-full text-sm"
              onChange={(e) => { if (e.target.files?.length) images(e.target.files); e.target.value = ""; }} />
          </label>
          {whole.files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {whole.files.slice(0, 40).map((f) => <img key={f} src={`/api/presenter/jobs/${t.job.id}/file/media/${f}`} alt="" className="h-12 rounded border border-border" />)}
              <span className="self-center text-xs text-muted-foreground">{whole.files.length} image{whole.files.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}
      {stock.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary btn-sm" disabled={off || !empty} onClick={() => fill(false)}>
            🎞 {empty ? `Fill ${empty === stock.length ? "every" : empty} ${empty === 1 ? "scene" : "scenes"} with footage` : "Every stock scene has a clip"}
          </button>
          {empty < stock.length && <button className="btn btn-ghost btn-sm" disabled={off} onClick={() => fill(true)}>Find different clips</button>}
        </div>
      )}
      {graphics > 0 && <GraphicsBox t={t} count={graphics} />}
      {own > 0 && (
        <p className="text-xs text-muted-foreground">
          {own} scene{own > 1 ? "s keep their" : " keeps its"} own background.{" "}
          <button type="button" className="underline" disabled={off} onClick={() => set({ include_own: true })}>Make {own > 1 ? "them" : "it"} follow the whole video</button>
        </p>
      )}
      {(t.job.problems ?? []).filter((p) => p.startsWith("Scene")).slice(0, 4).map((p, i) => <p key={i} className="text-xs text-amber-300">⚠ {p}</p>)}
      <WholePreview t={t} />
    </div>
  );
}

export function BackgroundStep({ t }: { t: Tools }) {
  const scenes = t.job.storyboard;
  const off = t.busy || t.working;
  const make = () => void t.act(() => call<Job>(`jobs/${t.job.id}/storyboard`, "POST"));
  if (!scenes || !t.job.storyboard_ready) {
    return (
      <>
        <h2 className="font-display text-lg font-bold">6. Backgrounds</h2>
        <p className="text-sm text-muted-foreground">First the voiceover is split into scenes, with the time of every word.{scenes ? " The voiceover changed since the last time." : ""}</p>
        <button className="btn btn-primary" disabled={off} onClick={make}>🎬 Make the storyboard</button>
      </>
    );
  }
  return (
    <>
      <h2 className="font-display text-lg font-bold">6. Backgrounds</h2>
      <p className="text-sm text-muted-foreground">Choose once what plays behind the presenter. Change single scenes only if you want to.</p>
      <WholeBackground t={t} />
      <PerScene note={`${scenes.length} scenes · only for fixes`}>
        <ol className="space-y-3">{scenes.map((s, i) => <SceneCard key={`${i}-${s.start}`} t={t} scene={s} index={i} />)}</ol>
      </PerScene>
    </>
  );
}

// ------------------------------------------------------------------ 7. layout, 8. extras
/** A list of scenes with a few "same as the whole video" choices each. */
function Overrides({ t, part, count, children }: { t: Tools; part: "layout" | "extras"; count: number; children: (s: Scene, i: number) => React.ReactNode }) {
  const scenes = t.job.storyboard;
  if (!scenes || !t.job.storyboard_ready) {
    return <p className="text-xs text-muted-foreground">To change single scenes, make the storyboard first (step 6).</p>;
  }
  return (
    <PerScene note={count ? `${count} scene${count > 1 ? "s" : ""} changed` : "optional"}>
      {count > 0 && (
        <button className="btn btn-ghost btn-sm mb-3" disabled={t.busy || t.working}
          onClick={() => void t.act(() => call<Job>(`jobs/${t.job.id}/reset`, "POST", { part }))}>↩ All scenes same as the whole video</button>
      )}
      <ol className="space-y-2">
        {scenes.map((s, i) => (
          <li key={`${i}-${s.start}`} className="space-y-2 rounded-lg border border-border p-2">
            <p className="text-sm"><b>Scene {i + 1}</b> <span className="font-mono text-xs text-muted-foreground">{clock(s.start)}–{clock(s.end)}</span> {s.narration.slice(0, 90)}{s.narration.length > 90 ? "…" : ""}</p>
            <div className="flex flex-wrap items-center gap-2">{children(s, i)}</div>
          </li>
        ))}
      </ol>
    </PerScene>
  );
}

function Pick({ label, value, options, disabled, onPick }: {
  label: string; value: string; options: [string, string][]; disabled: boolean; onPick: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs">
      {label}
      <select className="field w-40" value={value} disabled={disabled} onChange={(e) => onPick(e.target.value)}>
        <option value="">Same as whole video</option>
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </label>
  );
}

export function LayoutStep({ t }: { t: Tools }) {
  const l = t.job.layout!;
  const off = t.busy || t.working;
  const scene = (i: number, body: unknown) => void t.act(() => call<Job>(`jobs/${t.job.id}/scenes/${i}`, "POST", body));
  const changed = (t.job.storyboard ?? []).filter((s) => !s.presenter || s.position || s.size || s.effect).length;
  return (
    <>
      <h2 className="font-display text-lg font-bold">7. Layout</h2>
      <div className="space-y-3 rounded-xl border-2 border-primary/60 bg-primary/5 p-4">
        <p className="font-semibold">🎬 Whole video</p>
        <Choice label="Video shape" value={l.format} disabled={t.working} options={[["long", "Landscape (16:9)"], ["short", "Shorts (9:16)"]]} onPick={(v) => save(t, { layout: { format: v } })} />
        <Choice label="Presenter sits" value={l.position} disabled={t.working} options={[["bottom-left", "Bottom left"], ["center", "Centre"], ["bottom-right", "Bottom right"], ["hidden", "Hidden"]]} onPick={(v) => save(t, { layout: { position: v } })} />
        <Slider label="Presenter size" value={l.size} min={0.25} max={0.95} step={0.01} disabled={t.working} onSave={(v) => save(t, { layout: { size: v } })} />
        <Choice label="Edge" value={l.effect} disabled={t.working} options={[["shadow", "Soft shadow"], ["border", "Border"], ["none", "None"]]} onPick={(v) => save(t, { layout: { effect: v } })} />
        {l.effect === "border" && <Colour label="Border colour" value={l.border_color} onSave={(v) => save(t, { layout: { border_color: v } })} />}
        <p className="text-xs text-muted-foreground">Changing the video shape sets a fitting position and size.</p>
        <WholePreview t={t} />
      </div>
      <Overrides t={t} part="layout" count={changed}>
        {(s, i) => (
          <>
            <Pick label="Presenter" value={!s.presenter ? "hidden" : s.position} disabled={off}
              options={[["bottom-left", "Bottom left"], ["center", "Centre"], ["bottom-right", "Bottom right"], ["hidden", "Hidden"]]}
              onPick={(v) => scene(i, { presenter: true, position: v })} />
            <Pick label="Size" value={s.size ? String(s.size) : ""} disabled={off}
              options={[["0.4", "Small"], ["0.6", "Medium"], ["0.85", "Large"]]} onPick={(v) => scene(i, { size: Number(v || 0) })} />
            <Pick label="Edge" value={s.effect ?? ""} disabled={off}
              options={[["shadow", "Soft shadow"], ["border", "Border"], ["none", "None"]]} onPick={(v) => scene(i, { effect: v })} />
            <ScenePreview t={t} index={i} label="👁 Preview" />
          </>
        )}
      </Overrides>
    </>
  );
}

export function ExtrasStep({ t }: { t: Tools }) {
  const { wave, subs } = t.job.extras!;
  const off = t.busy || t.working;
  const w = (v: object) => save(t, { extras: { wave: v } });
  const s = (v: object) => save(t, { extras: { subs: v } });
  const scene = (i: number, body: unknown) => void t.act(() => call<Job>(`jobs/${t.job.id}/scenes/${i}`, "POST", body));
  const changed = (t.job.storyboard ?? []).filter((x) => Object.keys({ ...x.extras?.wave, ...x.extras?.subs }).length).length;
  const onOff = (v: boolean | undefined) => (v === undefined ? "" : v ? "on" : "off");
  return (
    <>
      <h2 className="font-display text-lg font-bold">8. Voice wave and subtitles</h2>
      <div className="space-y-3 rounded-xl border-2 border-primary/60 bg-primary/5 p-4">
        <p className="font-semibold">🎬 Whole video</p>
        <div className="space-y-2 rounded-xl border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={wave.on} onChange={(e) => w({ on: e.target.checked })} /> Voice wave</label>
          {wave.on && <>
            <Choice label="Style" value={wave.style} disabled={t.working} options={[["bars", "Bars"], ["line", "Waves"], ["dots", "Dots"]]} onPick={(v) => w({ style: v })} />
            <Colour label="Colour" value={wave.color} onSave={(v) => w({ color: v })} />
          </>}
        </div>
        <div className="space-y-2 rounded-xl border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={subs.on} onChange={(e) => s({ on: e.target.checked })} /> Word-by-word subtitles</label>
          {subs.on && <>
            <Choice label="Style" value={subs.style} disabled={t.working} options={[["pop", "Pop in"], ["highlight", "Highlight"], ["box", "Marker box"]]} onPick={(v) => s({ style: v })} />
            <Choice label="Font" value={subs.font} disabled={t.working} options={[["Poppins", "Poppins"], ["DM Serif Display", "DM Serif"], ["Cormorant Garamond", "Cormorant"]]} onPick={(v) => s({ font: v })} />
            <Choice label="Position" value={subs.position} disabled={t.working} options={[["bottom", "Bottom"], ["middle", "Middle"], ["top", "Top"]]} onPick={(v) => s({ position: v })} />
            <Slider label="Size" value={subs.size} min={0.6} max={1.8} step={0.05} disabled={t.working} onSave={(v) => s({ size: v })} />
            <Colour label="Text colour" value={subs.color} onSave={(v) => s({ color: v })} />
            <Colour label="Spoken word" value={subs.highlight} onSave={(v) => s({ highlight: v })} />
          </>}
        </div>
        <WholePreview t={t} />
      </div>
      <Overrides t={t} part="extras" count={changed}>
        {(x, i) => (
          <>
            <Pick label="Wave" value={onOff(x.extras?.wave?.on)} disabled={off} options={[["on", "On"], ["off", "Off"]]} onPick={(v) => scene(i, { wave: v })} />
            <Pick label="Subtitles" value={onOff(x.extras?.subs?.on)} disabled={off} options={[["on", "On"], ["off", "Off"]]} onPick={(v) => scene(i, { subs: v })} />
            <Pick label="Position" value={x.extras?.subs?.position ?? ""} disabled={off}
              options={[["bottom", "Bottom"], ["middle", "Middle"], ["top", "Top"]]} onPick={(v) => scene(i, { subs_position: v })} />
            <ScenePreview t={t} index={i} label="👁 Preview" />
          </>
        )}
      </Overrides>
    </>
  );
}

// ------------------------------------------------------------------ 9. render and upload
function UploadBox({ t }: { t: Tools }) {
  const { activeChannelId } = useApp();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [title, setTitle] = useState(t.job.title.slice(0, 100));
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState("private");
  useEffect(() => { youtubeStatus().then((s) => setConnected(s.connected)).catch(() => setConnected(false)); }, []);
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="font-semibold">▶ Upload to YouTube</p>
      <input className="field" value={title} maxLength={100} placeholder="Your video title" onChange={(e) => setTitle(e.target.value)} />
      <textarea className="field min-h-[80px] text-sm" value={description} placeholder="Description" onChange={(e) => setDescription(e.target.value)} />
      <input className="field" value={tags} placeholder="Tags, separated by commas" onChange={(e) => setTags(e.target.value)} />
      <p className="break-all text-xs text-muted-foreground">Added under the description: Sources — {t.job.sources.map((s) => s.url).join(" · ") || "none saved"}</p>
      <p className="text-xs text-amber-300">YouTube asks you to mark realistic altered or AI-made content. Tick that in YouTube Studio if it applies.</p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="field w-36" value={privacy} onChange={(e) => setPrivacy(e.target.value)} aria-label="Who can see it">
          <option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option>
        </select>
        {connected === false ? (
          <button className="btn btn-ghost btn-sm" onClick={() => void connectYoutubeFlow().then((ok) => setConnected(ok)).catch(() => undefined)}>🔗 Connect YouTube</button>
        ) : (
          <button className="btn btn-primary" disabled={t.busy || t.working || !title.trim() || !connected}
            onClick={() => void t.act(() => call<Job>(`jobs/${t.job.id}/upload`, "POST", { title, description, tags, privacy, channel_id: activeChannelId ?? "" }))}>
            Upload
          </button>
        )}
      </div>
      {t.job.youtube?.url && <p className="text-sm text-emerald-300">✓ Uploaded ({t.job.youtube.privacy}): <a className="underline" href={t.job.youtube.url} target="_blank" rel="noreferrer">{t.job.youtube.url}</a></p>}
    </div>
  );
}

export function RenderStep({ t }: { t: Tools }) {
  const job = t.job;
  const short = job.layout?.format === "short";
  return (
    <>
      <h2 className="font-display text-lg font-bold">9. Render</h2>
      {!job.storyboard_ready ? <p className="text-sm text-amber-300">Make the storyboard first (step 6).</p> : (
        <>
          {(job.problems ?? []).map((p, i) => <p key={i} className="text-sm text-amber-300">⚠ {p}</p>)}
          <button className="btn btn-primary px-8 text-lg" disabled={t.busy || t.working || !!job.problems?.length}
            onClick={() => void t.act(() => call<Job>(`jobs/${job.id}/render`, "POST"))}>
            {job.has_final ? "Render again" : "🎬 Render the video"}
          </button>
          <p className="text-xs text-muted-foreground">
            Estimate: {about(job.render_estimate ?? 60)}, plus extra time for new graphics scenes. Unchanged scenes are not drawn again.
          </p>
        </>
      )}
      {job.has_final && !t.working && (
        <>
          <video className={`w-full rounded-xl border border-border ${short ? "max-w-[300px]" : ""}`} controls
            src={`/api/presenter/jobs/${job.id}/file/final/final.mp4?v=${job.rendered?.at ?? 0}`} />
          {job.rendered && <p className="text-xs text-muted-foreground">Last render: {clock(job.rendered.length)} of video in {job.rendered.seconds} seconds.</p>}
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-ghost btn-sm" href={`/api/presenter/jobs/${job.id}/file/final/final.mp4`} download={`presenter-${job.id}.mp4`}>⬇ Download</a>
            <Link to="/my-videos" className="btn btn-ghost btn-sm">My Videos (delete to free space)</Link>
          </div>
          <UploadBox t={t} />
        </>
      )}
    </>
  );
}
