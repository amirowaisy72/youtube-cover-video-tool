/** Hook builder: three openings for the first scene (big question, shocking number, proof on screen), each with
    a preview; you pick one. New visuals only, or new opening words too (then only scene 1's voice is remade). */
import { useEffect, useState } from "react";
import { askSourceCheck } from "@/components/SourceCheck";
import { sceneFileUrl } from "@/components/SceneFrames";
import { api } from "@/lib/api";
import { getKey, voiceKeys } from "@/lib/config";

type Hook = { n: number; kind: string; words: string; code: string; idea?: string; error?: string; ok?: boolean;
  preview?: string; sheet?: string; warnings?: string[] };
type Data = { hooks: Hook[]; mode: "visuals" | "words"; first_sentence: string; narration: string; can_undo: boolean;
  voiced: boolean; note?: string };

const LABELS: Record<string, string> = { question: "❓ Big question", number: "💥 Shocking number", proof: "🧾 Proof on screen" };
const post = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function HookBuilder({ jobId, onApplied }: { jobId: string; onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [mode, setMode] = useState<"visuals" | "words">("visuals");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setData(null); setCode(""); setMsg(""); setErr("");
    if (!open) return;
    api<Data>(`/api/visual/hooks/${jobId}`).then((d) => { setData(d); if (d.hooks.length) setMode(d.mode); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Not ready yet."));
  }, [jobId, open]);

  const run = async (what: string, job: () => Promise<void>) => {
    setBusy(what); setErr(""); setMsg("");
    try { await job(); } catch (e) { setErr(e instanceof Error ? e.message : "That did not work."); }
    setBusy("");
  };
  const testAll = async (d: Data) => {
    for (const h of d.hooks.filter((x) => !x.error)) {
      setBusy(`Drawing the preview of hook ${h.n}…`);
      setData(await api<Data>("/api/visual/hooks/test", post({ job_id: jobId, n: h.n })));
    }
  };
  // scene 1 changed: the page and the Script mode box must show the new code (an old paste would undo it)
  const changed = () => {
    window.dispatchEvent(new Event("ytguru-code-changed"));
    window.dispatchEvent(new Event("ytguru-sources-changed"));
    onApplied();
  };
  const copy = () => run("Copying…", async () => {
    const d = await api<{ prompt: string }>(`/api/visual/hooks/${jobId}/prompt?mode=${mode}`);
    await navigator.clipboard.writeText(d.prompt);
    setMsg("✓ Hook prompt copied — paste it into your AI, then paste its answer below.");
  });
  const save = () => run("Saving…", async () => {
    const d = await api<Data & { sources_found?: number }>("/api/visual/hooks/save", post({ job_id: jobId, code, mode }));
    setData(d); setCode("");
    askSourceCheck(jobId, d.sources_found);
    await testAll(d);
  });
  const gemini = () => run("Gemini is writing three hooks…", async () => {
    const d = await api<Data>("/api/visual/hooks/gemini", post({ job_id: jobId, gemini_key: getKey("gemini"), mode }));
    setData(d);
    await testAll(d);
  });
  const use = (n: number) => run(data?.voiced && data.mode === "words" ? "Making scene 1's new voice…" : "Applying…", async () => {
    const d = await api<Data>("/api/visual/hooks/apply", post({ job_id: jobId, n, tts_keys: voiceKeys() }));
    setData(d); setMsg(d.note || "Done."); changed();
  });
  const undo = () => run("Bringing the earlier opening back…", async () => {
    const d = await api<Data>("/api/visual/hooks/undo", post({ job_id: jobId, tts_keys: voiceKeys() }));
    setData(d); setMsg(d.note || "Done."); changed();
  });

  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-semibold">🪝 Hook builder — three openings for scene 1</span>
        <span className="text-sm text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row">
            {([["visuals", "New visuals only", "The words and the voice stay."],
              ["words", "New opening words too", "Replaces the first sentence. Only scene 1's voice is remade."]] as const).map(([id, title, note]) => (
              <button key={id} type="button" onClick={() => setMode(id)}
                className={`flex-1 rounded-xl border p-3 text-left ${mode === id ? "border-primary bg-primary/10" : "border-border"}`}>
                <div className="font-semibold">{title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{note}</div>
              </button>
            ))}
          </div>
          {data?.first_sentence && <p className="text-muted-foreground">Now the video opens with: “{data.first_sentence}”</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => void copy()}>📋 Copy the hook prompt</button>
            {!!getKey("gemini") && <button className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => void gemini()}>🤖 Let Gemini write them</button>}
            {data?.can_undo && <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => void undo()}>↩ Bring back the earlier opening</button>}
          </div>
          <textarea className="field h-28 w-full font-mono text-xs" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder={"Paste the AI's answer here:\n# === HOOK 1: question ===\n…"} />
          <button className="btn btn-primary w-full" disabled={!!busy || !code.trim()} onClick={() => void save()}>{busy || "💾 Make the 3 previews"}</button>
          {busy && !code.trim() && <p className="text-muted-foreground">{busy}</p>}
          {msg && <p className="text-emerald-300">{msg}</p>}
          {err && <p className="text-rose-300">{err}</p>}
          {!!data?.hooks.length && (
            <div className="grid gap-3 md:grid-cols-3">
              {data.hooks.map((h) => (
                <div key={h.n} className="space-y-1 rounded-lg border border-border p-2">
                  <p className="font-semibold">{LABELS[h.kind] || `Hook ${h.n}`}</p>
                  {h.preview
                    ? <video className="w-full rounded-md" src={sceneFileUrl(jobId, h.preview)} controls muted playsInline preload="metadata" />
                    : <p className="text-xs text-muted-foreground">No preview yet.</p>}
                  {h.words && <p className="text-xs">New words: “{h.words}”</p>}
                  {h.idea && <p className="text-xs text-sky-300">💡 {h.idea}</p>}
                  {h.error && <p className="whitespace-pre-wrap text-xs text-rose-300">{h.error}</p>}
                  {h.warnings?.map((w, k) => <p key={k} className="text-xs text-amber-300">• {w}</p>)}
                  {h.sheet && <a className="text-xs text-primary underline" href={sceneFileUrl(jobId, h.sheet)} target="_blank" rel="noreferrer">See its frames</a>}
                  <button className="btn btn-primary btn-sm w-full" disabled={!!busy || !!h.error || !h.preview} onClick={() => void use(h.n)}>✓ Use this hook</button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Previews are silent, quick and low-resolution; with new words their timing is an estimate.</p>
        </div>
      )}
    </div>
  );
}
