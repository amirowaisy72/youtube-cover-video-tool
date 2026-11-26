import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ColabEstimate } from "@/components/ColabPanel";
import { VoicePicker } from "@/components/VoicePicker";
import { getKey, installDashboardButton, type KeyId } from "@/lib/config";

installDashboardButton();

export const Route = createFileRoute("/presenter")({
  component: Presenter,
});

type Job = {
  id: string; url: string; title: string; channel?: string; duration?: number; language?: string;
  status: "idle" | "working" | "failed" | "stopped"; step_working?: string; progress?: number; stage?: string; error?: string;
  transcript: string; segments?: { start: number; end: number; text: string }[]; sources: { url: string; fact: string }[];
  script: string; script_mode: string; copied?: number;
  voice: { provider: string; voice: string } | null; voice_ready: boolean; voice_outdated: boolean;
  voice_duration?: number; voice_version?: number; voice_warnings?: string[];
};

const STEPS = ["Link", "Script", "Voice", "Photo", "Lip-sync", "Backgrounds", "Layout", "Extras", "Render"];
const READY = 3; // the steps built so far

const load = (k: string) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(`/api/presenter/${path}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? null : JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as T & { detail?: string };
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : "That did not work. Try again.");
  return data;
}

function Working({ job, onStop }: { job: Job; onStop: () => void }) {
  return (
    <div className="rounded-xl border border-primary/50 bg-primary/5 p-4" role="status">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{job.stage || "Working…"}</p>
        <button className="btn btn-ghost btn-sm" onClick={onStop}>⏹ Stop</button>
      </div>
      <div className="bar mt-2"><div style={{ width: `${Math.min(100, job.progress ?? 0)}%` }} /></div>
      <p className="mt-1 text-xs text-muted-foreground">{Math.round(job.progress ?? 0)}% · you can leave this page, the step carries on</p>
    </div>
  );
}

function Presenter() {
  const [job, setJob] = useState<Job | null>(null);
  const [recent, setRecent] = useState<{ id: string; title: string }[]>([]);
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"asis" | "own" | "edited" | "">("");
  const [paste, setPaste] = useState("");
  const [provider, setProvider] = useState(() => load("ytguru-presenter-provider") || "edge");
  const [voice, setVoice] = useState(() => load("ytguru-presenter-voice") || "en-US-AriaNeural");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const show = (j: Job) => {
    setJob(j);
    store("ytguru-presenter-job", j.id);
    setUrl(j.url);
    setText(j.script || "");
    setMode((j.script_mode as typeof mode) || "");
  };
  const open = async (id: string) => {
    const j = await call<Job>(`jobs/${id}`);
    show(j);
    setStep(j.voice_ready || j.script ? 2 : j.transcript ? 1 : 0);
  };
  const refreshRecent = () => call<{ jobs: { id: string; title: string }[] }>("jobs").then((d) => setRecent(d.jobs)).catch(() => undefined);

  useEffect(() => {
    void refreshRecent();
    const last = load("ytguru-presenter-job");
    if (last) void open(last).catch(() => store("ytguru-presenter-job", ""));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // follow a running step
  useEffect(() => {
    if (job?.status !== "working") return;
    const t = window.setInterval(() => {
      call<Job>(`jobs/${job.id}`).then((j) => {
        setJob(j);
        if (j.status !== "working") { setText(j.script || ""); void refreshRecent(); }
      }).catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(t);
  }, [job?.id, job?.status]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(""); setNote("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "That did not work."); } finally { setBusy(false); }
  };
  const working = job?.status === "working";
  const stop = () => act(async () => setJob(await call<Job>(`jobs/${job!.id}/stop`, "POST")));
  const fromLink = () => act(async () => {
    if (job && job.transcript && !window.confirm("Read the link again? The script and voiceover of this video will have to be made again.")) return;
    show(await call<Job>(job ? `jobs/${job.id}/link` : "jobs", "POST", { url }));
    void refreshRecent();
  });
  const startNew = () => { setJob(null); setUrl(""); setText(""); setMode(""); setPaste(""); setErr(""); setNote(""); setStep(0); store("ytguru-presenter-job", ""); };
  const remove = () => act(async () => {
    if (!job || !window.confirm("Delete this presenter video and its files?")) return;
    await call(`jobs/${job.id}`, "DELETE");
    startNew();
    await refreshRecent();
  });
  const copyPrompt = () => act(async () => {
    const d = await call<{ prompt: string }>(`jobs/${job!.id}/prompt`);
    await navigator.clipboard.writeText(d.prompt);
    setNote("Prompt copied. Paste it into ChatGPT, Gemini or Claude, then paste the answer below.");
  });
  const saveScript = (value: string, how: "asis" | "own" | "edited") => act(async () => {
    const j = await call<Job>(`jobs/${job!.id}/script`, "POST", { text: value, mode: how });
    setJob(j); setText(j.script); setMode(how); setPaste(""); setNote("Script saved.");
  });
  const next = () => act(async () => {
    if (step === 1 && text.trim() !== (job?.script || "")) {
      const j = await call<Job>(`jobs/${job!.id}/script`, "POST", { text, mode: mode || "edited" });
      setJob(j); setText(j.script);
    }
    setStep(step + 1);
  });
  const chooseVoice = (p: string, v: string) => {
    setProvider(p); setVoice(v); store("ytguru-presenter-provider", p); store("ytguru-presenter-voice", v);
  };
  const makeVoice = (again: boolean) => act(async () => {
    const clone = voice.startsWith("clone:");
    setJob(await call<Job>(`jobs/${job!.id}/voice`, "POST", {
      provider: clone ? "edge" : provider, voice, key: clone || provider === "edge" ? "" : getKey(provider as KeyId), again,
    }));
  });

  const canNext = !working && (step === 0 ? !!job?.transcript : step === 1 ? text.trim().split(/\s+/).length >= 3 : step === 2 ? !!job?.voice_ready : false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24">
      <PageHeader icon="🧑‍💼" title="Talking Presenter" sub="A video link becomes your own script and voiceover; a person from your photo will present it." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {recent.length > 0 && (
          <select className="field max-w-xs" value={job?.id ?? ""} aria-label="Open an earlier presenter video"
            onChange={(e) => { if (e.target.value) void act(() => open(e.target.value)); else startNew(); }}>
            <option value="">＋ New video</option>
            {recent.map((r) => <option key={r.id} value={r.id}>{r.title || r.id}</option>)}
          </select>
        )}
        {job && <button className="btn btn-ghost btn-sm" onClick={startNew}>＋ New</button>}
        {job && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void remove()}>🗑 Delete</button>}
      </div>

      <ol className="mb-5 flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button className={`btn btn-sm ${i === step ? "btn-primary" : "btn-ghost"}`}
              disabled={i >= READY || (i === 1 && !job?.transcript) || (i === 2 && !job?.script)}
              title={i >= READY ? "Coming in the next parts" : ""} onClick={() => { setStep(i); setErr(""); setNote(""); }}>
              {i + 1}. {s}{i >= READY ? " (soon)" : ""}
            </button>
          </li>
        ))}
      </ol>

      <div className="glass space-y-4 p-5">
        {working && <Working job={job!} onStop={() => void stop()} />}
        {job?.status === "failed" && <p className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm"><b>This step failed:</b> {job.error}</p>}
        {job?.status === "stopped" && <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">{job.stage}</p>}

        {step === 0 && (
          <>
            <h2 className="font-display text-lg font-bold">1. Paste a video link</h2>
            <p className="text-sm text-muted-foreground">YouTube or another site. Only the sound is downloaded, and the words are written down on your computer.</p>
            <div className="flex flex-wrap gap-2">
              <input className="field min-w-0 flex-1" value={url} placeholder="https://www.youtube.com/watch?v=…"
                onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && url.trim() && !working) void fromLink(); }} />
              <button className="btn btn-primary" disabled={busy || working || !url.trim()} onClick={() => void fromLink()}>
                {job?.transcript ? "Read it again" : "Get the words"}
              </button>
            </div>
            {job?.transcript && (
              <p className="text-sm text-emerald-300">
                ✓ {job.title || "Transcript ready"}{job.channel ? ` · ${job.channel}` : ""}{job.duration ? ` · ${clock(job.duration)}` : ""}
                {" "}· {job.transcript.split(/\s+/).length} words. The link is saved in this video's Sources.
              </p>
            )}
          </>
        )}

        {step === 1 && job && (
          <>
            <h2 className="font-display text-lg font-bold">2. Your script</h2>
            <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              The transcript is <b>someone else's work</b>: use it as research. A rewrite in your own words is the safer choice for your channel.
            </p>
            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold">The transcript, with times</summary>
              <div className="mt-2 max-h-64 overflow-y-auto text-sm">
                {(job.segments ?? []).map((s, i) => (
                  <p key={i}><span className="mr-2 font-mono text-xs text-muted-foreground">{clock(s.start)}</span>{s.text}</p>
                ))}
              </div>
            </details>

            <div className="flex flex-wrap gap-2">
              <button className={`btn ${mode === "own" ? "btn-primary" : "btn-ghost"}`} onClick={() => { setMode("own"); setNote(""); }}>✍ Rewrite in my own words</button>
              <button className={`btn ${mode === "asis" ? "btn-primary" : "btn-ghost"}`} disabled={busy} onClick={() => void saveScript(job.transcript, "asis")}>Use as is</button>
              <button className={`btn ${mode === "edited" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => { setMode("edited"); if (!text) setText(job.transcript); }}>Edit by hand</button>
            </div>

            {mode === "own" && (
              <div className="space-y-2 rounded-xl border border-primary/50 p-3">
                <p className="text-sm">1. Copy the prompt and give it to any AI. 2. Paste the AI's answer here. 3. Save.</p>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void copyPrompt()}>📋 Copy the rewrite prompt</button>
                <textarea className="field min-h-[110px] text-sm" value={paste} placeholder="Paste the AI's new script here" onChange={(e) => setPaste(e.target.value)} />
                <button className="btn btn-primary btn-sm" disabled={busy || !paste.trim()} onClick={() => void saveScript(paste, "own")}>💾 Save the new script</button>
              </div>
            )}

            {(text || mode === "edited") && (
              <div>
                <p className="mb-1 text-sm font-semibold">Your narration (you can change anything)</p>
                <textarea className="field min-h-[220px] text-sm" value={text} onChange={(e) => setText(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">{words} words · about {clock(words / 2.5)} when spoken</p>
                {job.script && text === job.script && (job.copied ?? 0) >= 15 && (
                  <p className="mt-1 text-sm text-amber-300">⚠ About {job.copied}% of this script is still word for word from the original video.</p>
                )}
                {job.script && text !== job.script && (
                  <button className="btn btn-ghost btn-sm mt-1" disabled={busy} onClick={() => void saveScript(text, mode || "edited")}>💾 Save changes</button>
                )}
              </div>
            )}
            {job.sources?.length > 0 && (
              <p className="break-all text-xs text-muted-foreground">Sources: {job.sources.map((s) => s.url).join(" · ")}</p>
            )}
          </>
        )}

        {step === 2 && job && (
          <>
            <h2 className="font-display text-lg font-bold">3. Choose a voice and make the voiceover</h2>
            <p className="rounded-lg border border-border p-2 text-sm">Use your own face or voice, ones you have permission for, or AI-made ones.</p>
            <VoicePicker provider={provider} voice={voice} onChange={chooseVoice} />
            {voice.startsWith("clone:") && <ColabEstimate chars={job.script.length} />}
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn btn-primary" disabled={busy || working} onClick={() => void makeVoice(false)}>🎙 Make the voice</button>
              {job.voice_ready && <button className="btn btn-ghost btn-sm" disabled={busy || working} onClick={() => void makeVoice(true)}>Make every part again</button>}
            </div>
            {job.voice_outdated && !working && <p className="text-sm text-amber-300">The script or the voice changed since this recording. Press “Make the voice”.</p>}
            {(job.voice_warnings ?? []).map((w, i) => <p key={i} className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-sm">⚠ {w}</p>)}
            {(job.voice_ready || job.voice_outdated) && !working && (
              <div>
                <audio className="w-full" controls preload="none" src={`/api/presenter/jobs/${job.id}/audio?v=${job.voice_version}`} />
                <p className="mt-1 text-xs text-muted-foreground">Voiceover: {clock(job.voice_duration ?? 0)}</p>
              </div>
            )}
          </>
        )}

        {step >= READY && (
          <p className="text-sm text-muted-foreground">✓ Your script and voiceover are saved. The photo, lip-sync, backgrounds and render steps come in the next parts.</p>
        )}

        {note && <p className="text-sm text-emerald-300">{note}</p>}
        {err && <p className="text-sm text-amber-300">{err}</p>}

        {step < READY && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <button className="btn btn-ghost" disabled={step === 0} onClick={() => { setStep(step - 1); setErr(""); setNote(""); }}>← Back</button>
            <button className="btn btn-primary px-8 text-lg" disabled={!canNext || busy} onClick={() => void next()}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
