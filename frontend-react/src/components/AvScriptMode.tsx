/** Auto Video Script mode (user, 2026-11-20): any AI plans every scene's footage (search words, the new clip at
    chosen words, or a drawn animation); the app downloads exactly that. */
import { useEffect, useState } from "react";
import { getKey } from "@/lib/config";

type St = { running: boolean; stage: string; done: number; total: number; error: string; code: string;
  scenes: { index: number; has_script: boolean; error: string; kind?: string; visual_file?: string; visual_source?: string; shots: number; animation: boolean }[] };

export function getAvDesign(): "auto" | "script" {
  try { return localStorage.getItem("ytguru-av-design") === "script" ? "script" : "auto"; } catch { return "auto"; }
}
export function setAvDesign(d: "auto" | "script") {
  try { localStorage.setItem("ytguru-av-design", d); } catch { /* private mode */ }
}

export function AvDesignChoice({ value, onChange }: { value: "auto" | "script"; onChange: (v: "auto" | "script") => void }) {
  const opt = (id: "auto" | "script", title: string, note: string) => (
    <button type="button" onClick={() => onChange(id)} className={`flex-1 rounded-xl border p-3 text-left ${value === id ? "border-primary bg-primary/10" : "border-border"}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </button>
  );
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="mb-2 font-semibold">🎬 Who picks the footage?</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {opt("auto", "🤖 The app (automatic)", "The app reads every scene and finds footage by itself.")}
        {opt("script", "✍️ Script mode — best quality", "You copy one prompt into any AI (Claude, ChatGPT, Gemini). It plans every scene: the search words, a new clip at the right words, or an animation for numbers and charts.")}
      </div>
    </div>
  );
}

async function j<T>(r: Response): Promise<T> {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { detail?: string }).detail || `Error ${r.status}`);
  return d as T;
}

export function AvScriptMode({ jobId, startOpen = false, onChanged }: { jobId: string; startOpen?: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(startOpen);
  const [st, setSt] = useState<St | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const s = await j<St>(await fetch(`/api/avscript/${jobId}`));
      setSt(s);
      setCode((c) => c || s.code || "");
      return s;
    } catch { return null; }
  };
  useEffect(() => { if (open) void load(); }, [open, jobId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st?.running) return;
    const id = setInterval(() => {
      void load().then((s) => { if (s && !s.running) onChanged(); });
    }, 2500);
    return () => clearInterval(id);
  }, [st?.running]); // eslint-disable-line react-hooks/exhaustive-deps

  const keys = { pexels_key: getKey("pexels") || "", pixabay_key: getKey("pixabay") || "" };
  const copy = async () => {
    setErr("");
    try {
      const d = await j<{ prompt: string }>(await fetch(`/api/avscript/${jobId}/prompt`));
      await navigator.clipboard.writeText(d.prompt);
      setMsg("✓ Prompt copied — paste it into Claude, ChatGPT or Gemini, then paste its answer here.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not copy"); }
  };
  const save = async () => {
    setErr(""); setMsg("");
    try {
      const d = await j<St & { problems: string[]; applying: number; found: number }>(await fetch("/api/avscript/save", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: jobId, code, ...keys }) }));
      setSt(d);
      setMsg(`✓ Saved — plans for ${d.found} scene${d.found === 1 ? "" : "s"}; getting the footage of ${d.applying} now…`);
      if (d.problems.length) setErr(d.problems.join("  ·  "));
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); }
  };
  const autoRest = async () => {
    setErr("");
    try { setSt(await j<St>(await fetch("/api/avscript/auto-rest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: jobId, ...keys }) }))); }
    catch (e) { setErr(e instanceof Error ? e.message : "failed"); }
  };

  const scenes = st?.scenes || [];
  const waiting = scenes.filter((s) => (s.visual_file || "").endsWith("-wait.png")).length;
  return (
    <div className="rounded-xl border border-primary/50 bg-primary/5 p-4">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-semibold">✍️ Script mode — your AI plans the footage of every scene</span>
        <span className="text-sm text-muted-foreground">{scenes.length ? `${scenes.filter((s) => s.has_script).length}/${scenes.length} planned` : ""} {open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li><b className="text-foreground">Copy the prompt</b> (your scenes + how to plan them).</li>
            <li>Paste it into <b className="text-foreground">Claude, ChatGPT or Gemini</b>.</li>
            <li>Paste the AI's whole answer below → <b className="text-foreground">Save & get the footage</b>. The scenes above change to the new footage.</li>
          </ol>
          <button className="btn btn-secondary btn-sm" onClick={() => void copy()}>📋 Copy the prompt</button>
          <textarea className="field h-56 w-full font-mono text-xs" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder={'# === SCENE 1 ===\nmain: gamer playing video game at night | teenager with controller\navoid: cartoon, kids\nshot: "spending $79.99" -> person paying at store counter\n# === SCENE 2 ===\nanimation:\n…'} />
          <button className="btn btn-primary w-full" disabled={!!st?.running || !code.trim()} onClick={() => void save()}>{st?.running ? st.stage || "Working…" : "💾 Save & get the footage"}</button>
          {st?.running && <div className="bar"><div style={{ width: `${st.total ? (100 * st.done) / st.total : 3}%` }} /></div>}
          {msg && <p className="text-emerald-300">{msg}</p>}
          {err && <p className="text-rose-300">{err}</p>}
          {waiting > 0 && !st?.running && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-xs">
              ⚠ {waiting} scene{waiting === 1 ? " is" : "s are"} still waiting for footage — they would show the "waiting" picture in the video.{" "}
              <button className="underline" onClick={() => void autoRest()}>Let the app find footage for them</button>
            </div>
          )}
          {scenes.some((s) => s.error) && (
            <ul className="text-xs text-rose-300">{scenes.filter((s) => s.error).map((s) => <li key={s.index}>Scene {s.index + 1}: {s.error}</li>)}</ul>
          )}
          <p className="text-xs text-muted-foreground">Uses your Pexels / Pixabay keys (Dashboard) for the best clips. Not happy with a scene later? In step 4 pause the preview there and ask for a fix.</p>
        </div>
      )}
    </div>
  );
}
