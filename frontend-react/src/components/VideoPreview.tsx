/** Whole-video preview before the render (user, 2026-11-20): every scene drawn quickly with its real voice,
    sounds and captions, played as one video. Pause anywhere → "Want to fix this part?" → write what you want
    (Urdu or English) → copy the prompt for any AI → paste its answer → the part is marked → "Fix all the
    modified parts" redraws only those scenes. Pause anywhere → "Want to replace this scene with studio?"
    (user, 2026-11-21) films just this scene with the chosen presenter and puts the studio clip in its place. */
import { useEffect, useRef, useState } from "react";
import { SceneFrames } from "@/components/SceneFrames";
import { getKey } from "@/lib/config";

type Cue = { start: number; end: number; text: string };
type PvScene = { index: number; file: string; duration: number; cues: Cue[]; modified: boolean; error: string;
  requests: { t: number; request: string }[]; has_code: boolean; narration: string;
  test: { ok: boolean; error: string; warnings: string[] } | null };
type PvStatus = { running: boolean; done: number; total: number; stage: string; error: string; voice_ready: boolean; scenes: PvScene[] };

const fileUrl = (jobId: string, name: string) => `/api/autovideo/${jobId}/scene-file/${encodeURIComponent(name)}`;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

async function j<T>(r: Response): Promise<T> {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { detail?: string }).detail || `Error ${r.status}`);
  return d as T;
}

export function VideoPreview({ jobId, onStudioScene, canStudio }: { jobId: string; onStudioScene?: (index: number) => void; canStudio?: boolean }) {
  const [st, setSt] = useState<PvStatus | null>(null);
  const [err, setErr] = useState("");
  const [cur, setCur] = useState(0);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(true);
  const [fix, setFix] = useState<{ index: number; t: number } | null>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const autoplay = useRef(false);

  const load = async () => {
    try { setSt(await j<PvStatus>(await fetch(`/api/visual/preview/${jobId}`))); } catch (e) { setErr(e instanceof Error ? e.message : "failed"); }
  };
  useEffect(() => { void load(); }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st?.running) return;
    const id = setInterval(() => void load(), 2000);
    return () => clearInterval(id);
  }, [st?.running]); // eslint-disable-line react-hooks/exhaustive-deps

  const build = async (onlyModified: boolean) => {
    setErr("");
    try {
      setSt(await j<PvStatus>(await fetch("/api/visual/preview/build", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, only_modified: onlyModified, pexels_key: getKey("pexels") || "", pixabay_key: getKey("pixabay") || "" }) })));
    } catch (e) { setErr(e instanceof Error ? e.message : "failed"); }
  };

  if (!st) return null;
  const scenes = st.scenes;
  const ready = scenes.length > 0 && scenes.every((s) => s.file);
  const total = scenes.reduce((a, s) => a + s.duration, 0) || 1;
  const before = (i: number) => scenes.slice(0, i).reduce((a, s) => a + s.duration, 0);
  const modified = scenes.filter((s) => s.modified);
  const scene = scenes[cur];
  const cue = scene?.cues.find((c) => time >= c.start && time <= c.end);

  const go = (i: number, t = 0, play = false) => {
    autoplay.current = play;
    setCur(i);
    setTime(t);
    requestAnimationFrame(() => { const v = vid.current; if (v) { v.currentTime = t; if (play) void v.play(); } });
  };

  return (
    <div className="rounded-xl border border-primary/50 bg-primary/5 p-4">
      <div className="mb-2 font-semibold">▶ Preview the whole video — fix any part before the render</div>
      {!st.voice_ready && <p className="text-sm text-muted-foreground">Make the voice first (step 3 · Audio): the preview uses the real voice.</p>}
      {st.voice_ready && !ready && !st.running && (
        <>
          <p className="mb-2 text-sm text-muted-foreground">Every scene is drawn quickly in low quality with its voice, sound effects and captions (a few minutes). Watch it, pause where something is wrong and ask for a fix.</p>
          <button className="btn btn-primary w-full" onClick={() => void build(false)}>▶ Make the preview</button>
        </>
      )}
      {st.running && (
        <div className="space-y-1">
          <p className="text-sm">{st.stage || "Working…"}</p>
          <div className="bar"><div style={{ width: `${st.total ? (100 * st.done) / st.total : 3}%` }} /></div>
        </div>
      )}
      {st.error && <p className="text-sm text-rose-300">{st.error}</p>}
      {err && <p className="text-sm text-rose-300">{err}</p>}

      {ready && scene && (
        <div className="mt-2 space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video key={scene.file} ref={vid} src={fileUrl(jobId, scene.file)} className="aspect-video w-full" controls playsInline
              autoPlay={autoplay.current}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onPlay={() => { setPaused(false); setFix(null); }}
              onPause={(e) => { if (!e.currentTarget.ended) setPaused(true); }}
              onEnded={() => { if (cur + 1 < scenes.length) go(cur + 1, 0, true); else setPaused(true); }} />
            {cue && <div className="pointer-events-none absolute inset-x-6 bottom-14 text-center"><span className="rounded bg-black/70 px-2 py-1 text-sm font-semibold text-white">{cue.text}</span></div>}
            {paused && (
              <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                <button className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black shadow-lg hover:bg-amber-300"
                  onClick={() => setFix({ index: cur, t: time })}>❓ Want to fix this part?</button>
                {onStudioScene && (
                  <button className="rounded-full bg-violet-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-violet-400 disabled:opacity-50"
                    disabled={!canStudio} title={canStudio ? undefined : "Choose a presenter above first"}
                    onClick={() => onStudioScene(cur)}>🎬 Want to replace this scene with studio?</button>
                )}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Scene {cur + 1} of {scenes.length} · {fmt(before(cur) + time)} / {fmt(total)}</div>
          {/* the timeline: one block per scene; orange = marked to fix, red = a problem */}
          <div className="flex h-6 w-full overflow-hidden rounded-md border border-border">
            {scenes.map((s, i) => (
              <button key={i} title={`Scene ${i + 1}${s.modified ? " — marked to fix" : ""}`} onClick={() => go(i, 0, true)}
                style={{ width: `${(100 * s.duration) / total}%` }}
                className={`border-r border-black/40 text-[10px] ${i === cur ? "bg-primary text-white" : s.modified ? "bg-amber-500 text-black" : s.error || (s.test && !s.test.ok) ? "bg-rose-600 text-white" : "bg-slate-700 text-slate-200"}`}>
                {i + 1}
              </button>
            ))}
          </div>
          {scenes.some((s) => s.error || (s.test && !s.test.ok)) && (
            <p className="text-xs text-rose-300">Red scenes have a problem in their code ({scenes.filter((s) => s.error || (s.test && !s.test.ok)).map((s) => `#${s.index + 1}`).join(", ")}): pause there and ask for a fix — they get the simple animation until then.</p>
          )}
          {modified.length > 0 && (
            <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
              <p className="font-semibold">🟠 {modified.length} part{modified.length === 1 ? "" : "s"} ready to fix:</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {modified.map((s) => <li key={s.index}>Scene {s.index + 1}: {s.requests.map((r) => r.request).join(" · ") || "new code"}</li>)}
              </ul>
              <button className="btn btn-primary mt-2 w-full" disabled={st.running} onClick={() => void build(true)}>🔧 Fix all the modified parts</button>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" disabled={st.running} onClick={() => void build(false)}>↻ Make the whole preview again</button>
        </div>
      )}
      {fix && scenes[fix.index] && (
        <FixModal jobId={jobId} scene={scenes[fix.index]!} t={fix.t} onClose={() => setFix(null)} onSaved={() => { setFix(null); void load(); }} />
      )}
    </div>
  );
}

function FixModal({ jobId, scene, t, onClose, onSaved }: { jobId: string; scene: PvScene; t: number; onClose: () => void; onSaved: () => void }) {
  const [request, setRequest] = useState("");
  const [answer, setAnswer] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const spoken = scene.cues.filter((c) => c.end >= t - 1.5 && c.start <= t + 1.5).map((c) => c.text).join(" ");

  const copy = async () => {
    setErr("");
    try {
      const d = await j<{ prompt: string }>(await fetch("/api/visual/preview/fix-prompt", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, index: scene.index, t, request }) }));
      await navigator.clipboard.writeText(d.prompt);
      setCopied(true);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not copy"); }
  };
  const save = async () => {
    setBusy(true); setErr("");
    try {
      await j(await fetch("/api/visual/preview/fix-save", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, index: scene.index, code: answer }) }));
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl space-y-3 overflow-y-auto rounded-2xl border border-border bg-background p-5 text-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <b className="text-base">🔧 Fix this part — scene {scene.index + 1}, second {t.toFixed(1)}</b>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {spoken && <p className="text-muted-foreground">The narrator says here: “{spoken}”</p>}
        <div>
          <p className="mb-1 font-semibold">1 · Explain how you want to fix this part <span className="font-normal text-muted-foreground">(Urdu or English)</span></p>
          <textarea className="field h-24 w-full" value={request} onChange={(e) => { setRequest(e.target.value); setCopied(false); }}
            placeholder="e.g. yahan bank bada ho aur coins zyada giren / show the number bigger and in the centre" />
        </div>
        <button className="btn btn-secondary w-full" disabled={request.trim().length < 2} onClick={() => void copy()}>{copied ? "✓ Prompt copied — paste it into your AI" : "📋 2 · Copy prompt"}</button>
        {scene.has_code && scene.file && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Add this picture to the same message, so the AI sees the scene (the paused moment is marked red):</p>
            <SceneFrames jobId={jobId} label={`scene-${scene.index + 1}-frames`} getSheet={async () =>
              (await j<{ sheet: string }>(await fetch("/api/visual/preview/sheet", { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_id: jobId, index: scene.index, t }) }))).sheet} />
          </div>
        )}
        <div>
          <p className="mb-1 font-semibold">3 · Paste the AI's answer</p>
          <textarea className="field h-36 w-full font-mono text-xs" value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder={`# === SCENE ${scene.index + 1} ===\n…`} />
        </div>
        <button className="btn btn-primary w-full" disabled={busy || answer.trim().length < 3} onClick={() => void save()}>{busy ? "Saving…" : "💾 Save — mark this part to fix"}</button>
        {err && <p className="text-rose-300">{err}</p>}
        <p className="text-xs text-muted-foreground">You can mark many parts; then press “Fix all the modified parts” — only those scenes are drawn again.</p>
      </div>
    </div>
  );
}
