/** Script mode (user, 2026-11-20): copy a ready prompt into any AI (Claude, ChatGPT, Gemini…), paste its scene
    code back, save it with the video and test every scene. The final video is drawn from that code — the way
    the hand-made sample was made — with the real voice timing and sound effects. */
import { useEffect, useState } from "react";
import { SceneFrames } from "@/components/SceneFrames";
import { askSourceCheck } from "@/components/SourceCheck";
import { getKey } from "@/lib/config";

type Test = { ok: boolean; error: string; warnings: string[]; at: number; sheet?: string } | null;
type SceneState = { index: number; has_code: boolean; test: Test; idea?: string; visual_file?: string; kind?: string; visual_source?: string };
type Review = { index: number; verdict: "good" | "fix" | "error"; seen: string; problems: string[]; code: string; code_error?: string; error?: string };
type Reviews = { running: boolean; done: number; total: number; stage: string; error: string; reviews: Review[] };
type Status = { code: string; scenes: SceneState[] };

export function getVisualDesign(): "gemini" | "script" {
  try { return localStorage.getItem("ytguru-visual-design") === "script" ? "script" : "gemini"; } catch { return "gemini"; }
}
export function setVisualDesign(d: "gemini" | "script") {
  try { localStorage.setItem("ytguru-visual-design", d); } catch { /* private mode */ }
}

/** Step 1 choice: who designs the animation. */
export function DesignChoice({ value, onChange }: { value: "gemini" | "script"; onChange: (v: "gemini" | "script") => void }) {
  const opt = (id: "gemini" | "script", title: string, note: string) => (
    <button type="button" onClick={() => onChange(id)}
      className={`flex-1 rounded-xl border p-3 text-left ${value === id ? "border-primary bg-primary/10" : "border-border"}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </button>
  );
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="mb-2 font-semibold">🎬 Who designs the animation?</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {opt("gemini", "🤖 Gemini (automatic)", "Gemini picks ready-made animations for every scene. Needs your free Gemini key.")}
        {opt("script", "✍️ Script mode — best quality", "You copy one prompt into any AI (Claude, ChatGPT, Gemini), paste its scene code back. Every scene is made just for your script. No Gemini key needed.")}
      </div>
    </div>
  );
}

async function j<T>(r: Response): Promise<T> {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { detail?: string }).detail || `Error ${r.status}`);
  return d as T;
}

export function ScriptMode({ jobId, onScene, startOpen = false, onMainSaved }: {
  jobId: string; startOpen?: boolean;
  onScene: (i: number, sc: Record<string, unknown>) => void;
  /** Auto Mode (user, 2026-11-22): called after the main "Save & test"
      finishes (never for a per-scene fix save), with how many scenes'
      code works. The parent decides whether to auto-advance. */
  onMainSaved?: (workingScenes: number) => void;
}) {
  const [open, setOpen] = useState(startOpen);
  const [st, setSt] = useState<Status | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [fix, setFix] = useState<number | null>(null);
  const [fixCode, setFixCode] = useState("");
  const [rv, setRv] = useState<Reviews | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const load = async () => {
    try {
      const s = await j<Status>(await fetch(`/api/visual/script/${jobId}`));
      setSt(s);
      setCode((c) => c || s.code || "");
    } catch { /* storyboard not ready yet */ }
  };
  // the Hook builder changed scene 1's code: take the saved code, so a later "Save & test" keeps the hook
  useEffect(() => {
    const on = () => {
      void fetch(`/api/visual/script/${jobId}`).then((r) => j<Status>(r)).then((s) => { setSt(s); setCode(s.code || ""); }).catch(() => undefined);
    };
    window.addEventListener("ytguru-code-changed", on);
    return () => window.removeEventListener("ytguru-code-changed", on);
  }, [jobId]);

  const loadReviews = async () => {
    try { setRv(await j<Reviews>(await fetch(`/api/visual/script/review/${jobId}`))); } catch { /* no storyboard yet */ }
  };
  useEffect(() => { setRv(null); if (open) { void load(); void loadReviews(); } }, [open, jobId]); // eslint-disable-line react-hooks/exhaustive-deps
  // while Gemini reviews: follow its progress (it may test scenes too)
  useEffect(() => {
    if (!open || !rv?.running) return;
    const t = setTimeout(() => { void loadReviews(); void load(); }, 3000);
    return () => clearTimeout(t);
  }, [open, rv]); // eslint-disable-line react-hooks/exhaustive-deps

  const reviewAll = async () => {
    setErr(""); setDismissed([]);
    try {
      setRv(await j<Reviews>(await fetch("/api/visual/script/review", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, gemini_key: getKey("gemini") }) })));
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not start the review"); }
  };
  const stopReview = () => void fetch("/api/visual/script/review/stop", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }) });
  const makeSheet = (i: number) => async () =>
    (await j<{ sheet: string }>(await fetch(`/api/visual/script/sheet/${jobId}/${i}`, { method: "POST" }))).sheet;

  const copy = async (url: string, what: string) => {
    setErr("");
    try {
      const d = await j<{ prompt: string }>(await fetch(url));
      await navigator.clipboard.writeText(d.prompt);
      setMsg(`✓ ${what} copied — paste it into Claude, ChatGPT or Gemini, then paste the AI's answer here.`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not copy"); }
  };

  const testAll = async (indexes: number[]) => {
    for (let k = 0; k < indexes.length; k++) {
      const i = indexes[k]!;
      setBusy(`Testing scene ${i + 1} (${k + 1} of ${indexes.length})… a quick low-resolution run`);
      try {
        const d = await j<{ result: Test; scene: Record<string, unknown> }>(await fetch("/api/visual/script/test", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: jobId, index: i }) }));
        onScene(i, d.scene);
        setSt((s) => s ? { ...s, scenes: s.scenes.map((x) => x.index === i ? { ...x, test: d.result, visual_file: d.scene.visual_file as string } : x) } : s);
      } catch (e) {
        setErr(`Scene ${i + 1}: ${e instanceof Error ? e.message : "test failed"}`);
      }
    }
    setBusy("");
    window.dispatchEvent(new Event("ytguru-sources-changed"));
  };

  const save = async (text: string, replace: boolean) => {
    setErr(""); setMsg("");
    setBusy("Saving and checking the code…");
    try {
      const d = await j<Status & { sources_found?: number; found: number; missing: number[]; extra: number[]; results: { index: number; error: string }[] }>(
        await fetch("/api/visual/script/save", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId, code: text, replace }) }));
      setSt(d);
      if (replace) setCode(d.code);
      const notes = [`✓ Saved — code for ${d.found} scene${d.found === 1 ? "" : "s"}.`];
      if (d.missing.length) notes.push(`No code yet for scene ${d.missing.join(", ")} (they get the simple animation).`);
      if (d.extra.length) notes.push(`Ignored scene ${d.extra.join(", ")} (this video has fewer scenes).`);
      if (d.sources_found) notes.push(`${d.sources_found} source${d.sources_found === 1 ? "" : "s"} saved to 📚 Sources — checking them against the real pages now.`);
      setMsg(notes.join(" "));
      askSourceCheck(jobId, d.sources_found);
      const runnable = d.results.filter((r) => !r.error).map((r) => r.index);
      await testAll(runnable);
      void loadReviews();
      // Auto Mode (user, 2026-11-22): the parent auto-advances
      // after the main save — but only from the "Save & test"
      // button (replace), never from a per-scene fix save.
      if (replace) onMainSaved?.(runnable.length);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); setBusy(""); }
  };

  const clearAll = async () => {
    if (!confirm("Remove all scene code from this video?")) return;
    try {
      const d = await j<Status>(await fetch("/api/visual/script/clear", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }) }));
      setSt(d); setCode(""); setMsg("Scene code removed.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  };

  const scenes = st?.scenes || [];
  const withCode = scenes.filter((s) => s.has_code);
  const good = withCode.filter((s) => s.test?.ok).length;
  const bad = withCode.filter((s) => s.test && !s.test.ok);

  return (
    <div className="rounded-xl border border-primary/50 bg-primary/5 p-4">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-semibold">✍️ Script mode — your AI writes each scene's animation</span>
        <span className="text-sm text-muted-foreground">{withCode.length ? `${withCode.length}/${scenes.length} scenes · ${good} tested ✓` : ""} {open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li><b className="text-foreground">Copy the prompt</b> (your scenes + how to write the code).</li>
            <li>Paste it into <b className="text-foreground">Claude, ChatGPT or Gemini</b> (a strong AI = a better video).</li>
            <li>Paste the AI's whole answer below and press <b className="text-foreground">Save & test</b>. Every scene gets a quick preview — hover a scene above to watch it.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => void copy(`/api/visual/script/${jobId}/prompt`, "Prompt")}>📋 Copy the prompt</button>
            <span className="text-xs text-muted-foreground">Recommended AI: <b className="text-foreground">Claude</b></span>
            {withCode.length > 0 && <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => void testAll(withCode.map((s) => s.index))}>▶ Test all scenes again</button>}
            {withCode.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => void clearAll()}>🗑 Remove the code</button>}
            {withCode.length > 0 && !!getKey("gemini") && (rv?.running
              ? <button className="btn btn-ghost btn-sm" onClick={stopReview}>⏹ Stop the review</button>
              : <button className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => void reviewAll()}
                  title="Gemini looks at every scene's frames and suggests fixes. Nothing changes until you accept.">🤖 Review all scenes</button>)}
          </div>
          {rv && (rv.running || rv.error || rv.reviews.length > 0) && (
            <p className={`text-xs ${rv.error ? "text-rose-300" : "text-muted-foreground"}`}>
              {rv.running ? `🤖 ${rv.stage} (${rv.done} of ${rv.total} done)` : rv.error
                || `🤖 Reviewed ${rv.reviews.length} scene${rv.reviews.length === 1 ? "" : "s"}: ${rv.reviews.filter((r) => r.verdict === "fix").length} with suggested fixes. Nothing is changed until you accept it.`}
            </p>
          )}
          <textarea className="field h-56 w-full font-mono text-xs" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder={"Paste the AI's answer here. It looks like:\n# === SCENE 1 ===\nshop = thing(\"shop\", x=-3)\nwhen(\"A small bakery\")\nenter(shop, \"grow\")\n# === SCENE 2 ===\n…"} />
          <button className="btn btn-primary w-full" disabled={!!busy || !code.trim()} onClick={() => void save(code, true)}>{busy || "💾 Save & test"}</button>
          {msg && <p className="text-emerald-300">{msg}</p>}
          {err && <p className="text-rose-300">{err}</p>}
          {withCode.length > 0 && (
            <div className="space-y-1">
              {scenes.map((s) => (
                <div key={s.index} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <b>Scene {s.index + 1}</b>
                    {!s.has_code ? <span className="text-muted-foreground">no code — the simple animation</span>
                      : !s.test ? <span className="text-muted-foreground">not tested yet</span>
                      : s.test.ok ? <span className="text-emerald-300">✓ works{s.test.warnings.length ? ` · ${s.test.warnings.length} note${s.test.warnings.length === 1 ? "" : "s"}` : ""}</span>
                      : <span className="text-rose-300">✗ problem</span>}
                    {s.has_code && s.test && (
                      <button className="btn btn-ghost btn-sm ml-auto" onClick={() => { setFix(fix === s.index ? null : s.index); setFixCode(""); }}>
                        {!s.test.ok || s.test.warnings.length > 0 ? "🔧 Fix it" : "👁 Review / fix"}</button>
                    )}
                  </div>
                  {s.has_code && (s.idea
                    ? <p className="mt-1 text-xs text-sky-300">💡 {s.idea}</p>
                    : <p className="mt-1 text-xs text-muted-foreground">💡 No visual idea written for this scene.</p>)}
                  {s.test?.error && <p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-rose-300">{s.test.error}</p>}
                  {s.test?.warnings?.map((w, k) => <p key={k} className="mt-0.5 text-xs text-amber-300">• {w}</p>)}
                  {rv?.reviews.filter((r) => r.index === s.index && !dismissed.includes(`${r.index}:${r.code}`)).map((r) => (
                    <div key="review" className="mt-2 space-y-1 rounded-md border border-violet-500/50 bg-violet-500/10 p-2 text-xs">
                      <p className="font-semibold">🤖 Gemini: {r.verdict === "good" ? "looks clear ✓" : r.verdict === "fix" ? "suggests a fix" : "could not review this scene"}</p>
                      {r.seen && <p>It sees: {r.seen}</p>}
                      {r.error && <p className="text-rose-300">{r.error}</p>}
                      {r.problems.map((p, k) => <p key={k} className="text-amber-300">• {p}</p>)}
                      {r.code_error && <p className="text-rose-300">Its new code cannot be used: {r.code_error}</p>}
                      {r.code && (
                        <>
                          <details>
                            <summary className="cursor-pointer">Show the corrected code</summary>
                            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre rounded bg-black/40 p-2 font-mono">{r.code}</pre>
                          </details>
                          <div className="flex gap-2">
                            {!r.code_error && <button className="btn btn-primary btn-sm" disabled={!!busy}
                              onClick={() => void save(`# === SCENE ${s.index + 1} ===\n${r.code}`, false)}>✓ Accept & test</button>}
                            <button className="btn btn-ghost btn-sm" onClick={() => setDismissed((d) => [...d, `${r.index}:${r.code}`])}>✕ Keep mine</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {fix === s.index && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-muted-foreground">1) Copy the prompt and paste it into the same AI. 2) Add the frames picture to that message (Claude, ChatGPT and Gemini can see it). 3) Paste its answer here.</p>
                      <button className="btn btn-secondary btn-sm" onClick={() => void copy(`/api/visual/script/${jobId}/fix/${s.index}`, "Fix prompt")}>📋 Copy the fix prompt</button>
                      <SceneFrames key={s.test?.sheet || "none"} jobId={jobId} fileName={s.test?.sheet} getSheet={makeSheet(s.index)} label={`scene-${s.index + 1}-frames`} />
                      <textarea className="field h-32 w-full font-mono text-xs" value={fixCode} onChange={(e) => setFixCode(e.target.value)}
                        placeholder={`# === SCENE ${s.index + 1} ===\n…`} />
                      <button className="btn btn-primary btn-sm" disabled={!!busy || !fixCode.trim()} onClick={() => {
                        const t = /#\s*=*\s*SCENE\s+\d+/i.test(fixCode) ? fixCode : `# === SCENE ${s.index + 1} ===\n${fixCode}`;
                        void save(t, false).then(() => setFix(null));
                      }}>💾 Save & test this scene</button>
                    </div>
                  )}
                </div>
              ))}
              {bad.length > 0 && <p className="text-xs text-amber-300">Scenes with a problem get the simple animation in the final video until they are fixed.</p>}
            </div>
          )}
          <p className="text-xs text-muted-foreground">The code is saved with this video. It is checked before it runs: it can only draw and animate (no files, no internet).</p>
        </div>
      )}
    </div>
  );
}
