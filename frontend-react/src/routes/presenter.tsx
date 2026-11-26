import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ColabEstimate } from "@/components/ColabPanel";
import { VoicePicker } from "@/components/VoicePicker";
import { BackgroundStep, call, ExtrasStep, type Job, LayoutStep, LipStep, PhotoStep, RenderStep, RULE, type Tools } from "@/components/PresenterSteps";
import { getKey, installDashboardButton, type KeyId } from "@/lib/config";

installDashboardButton();

export const Route = createFileRoute("/presenter")({
  component: Presenter,
});

const STEPS = ["Link", "Script", "Voice", "Photo", "Lip-sync", "Backgrounds", "Layout", "Extras", "Render"];

const load = (k: string) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
  const [backup, setBackup] = useState<"" | "file" | "text">("");
  const [source, setSource] = useState<"new" | "original" | "upload">("new");
  const [words_, setWords] = useState("");
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
    setSource(j.voice?.provider === "original" || j.voice?.provider === "upload" ? (j.voice.provider as "original" | "upload") : "new");
  };
  const open = async (id: string) => {
    const j = await call<Job>(`jobs/${id}`);
    show(j);
    setStep(j.has_final ? 8 : j.storyboard_ready ? 5 : j.voice_ready ? 3 : j.script ? 2 : j.transcript ? 1 : 0);
  };
  const refreshRecent = () => call<{ jobs: { id: string; title: string }[] }>("jobs").then((d) => setRecent(d.jobs)).catch(() => undefined);

  useEffect(() => {
    void refreshRecent();
    const last = new URLSearchParams(window.location.search).get("job") || load("ytguru-presenter-job");
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
  const run = async (fn: () => Promise<Job | void>, done?: string) => {
    await act(async () => {
      const j = await fn();
      if (j) setJob(j);
      if (done) setNote(done);
    });
  };
  const stop = () => act(async () => setJob(await call<Job>(`jobs/${job!.id}/stop`, "POST")));
  const fromLink = () => act(async () => {
    if (job && job.transcript && !window.confirm("Read the link again? The script and voiceover of this video will have to be made again.")) return;
    show(await call<Job>(job ? `jobs/${job.id}/link` : "jobs", "POST", { url }));
    void refreshRecent();
  });
  const startNew = () => { setJob(null); setUrl(""); setText(""); setMode(""); setPaste(""); setWords(""); setBackup(""); setErr(""); setNote(""); setStep(0); store("ytguru-presenter-job", ""); };
  const replaceOk = () => !job?.transcript || window.confirm("Replace the words? The script and voiceover of this video will have to be made again.");
  const fromFile = (file: File) => act(async () => {
    if (!replaceOk()) return;
    const form = new FormData();
    form.append("file", file);
    form.append("job", job?.id ?? "");
    form.append("url", url.trim());
    show(await call<Job>("source/file", "POST", form));
    void refreshRecent();
  });
  const fromText = () => act(async () => {
    if (!replaceOk()) return;
    show(await call<Job>("source/text", "POST", { text: words_, url: url.trim(), job: job?.id ?? "" }));
    setWords(""); setBackup("");
    void refreshRecent();
  });
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

  const canNext = !working && !!job && (step === 0 ? !!job.transcript : step === 1 ? text.trim().split(/\s+/).length >= 3
    : step === 2 ? job.voice_ready : step === 4 ? true : step === 5 ? !!job.storyboard_ready : job.voice_ready);
  const reachable = (i: number) => i === 0 || (!!job && (i === 1 || i === 2 ? !!job.transcript : job.voice_ready));
  const useOriginal = () => act(async () => setJob(await call<Job>(`jobs/${job!.id}/voice-original`, "POST")));
  const fetchAudio = () => act(async () => setJob(await call<Job>(`jobs/${job!.id}/fetch-audio`, "POST")));
  const ownAudio = (file: File) => act(async () => {
    const form = new FormData();
    form.append("file", file);
    setJob(await call<Job>(`jobs/${job!.id}/voice-file`, "POST", form));
  });
  const tools: Tools | null = job ? { job, busy, working: !!working, act: run } : null;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24">
      <PageHeader icon="🧑‍💼" title="Talking Presenter" sub="A video link becomes your own script and voiceover, presented by a person from your photo." />

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
              disabled={!reachable(i)} onClick={() => { setStep(i); setErr(""); setNote(""); }}>
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="glass space-y-4 p-5">
        {working && <Working job={job!} onStop={() => void stop()} />}
        {job?.status === "failed" && (
          <p className="whitespace-pre-line break-words rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm"><b>This step failed:</b> {job.error}</p>
        )}
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
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-sm text-muted-foreground">Link not working? Use one of these instead. The link above, if you filled it in, is still saved in Sources.</p>
              <div className="flex flex-wrap gap-2">
                <button className={`btn btn-sm ${backup === "file" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBackup(backup === "file" ? "" : "file")}>📁 Or upload the video/audio file</button>
                <button className={`btn btn-sm ${backup === "text" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBackup(backup === "text" ? "" : "text")}>📋 Or paste the transcript</button>
              </div>
              {backup === "file" && (
                <input type="file" accept="video/*,audio/*" className="w-full text-sm" disabled={busy || working} aria-label="Video or audio file"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); e.target.value = ""; }} />
              )}
              {backup === "text" && (
                <div className="space-y-2">
                  <textarea className="field min-h-[140px] text-sm" value={words_} placeholder="Paste the transcript here. Times like 0:15 are fine. On YouTube: open the description, press “Show transcript”, select it all and copy."
                    onChange={(e) => setWords(e.target.value)} />
                  <button className="btn btn-primary btn-sm" disabled={busy || working || words_.trim().split(/\s+/).length < 3} onClick={() => void fromText()}>Use this transcript</button>
                </div>
              )}
            </div>
            {job?.transcript && (
              <p className="text-sm text-emerald-300">
                ✓ {job.title || "Transcript ready"}{job.channel ? ` · ${job.channel}` : ""}{job.duration ? ` · ${clock(job.duration)}` : ""}
                {" "}· {job.transcript.split(/\s+/).length} words.{job.sources?.length ? " The link is saved in this video's Sources." : ""}
              </p>
            )}
          </>
        )}

        {step === 1 && job && (
          <>
            <h2 className="font-display text-lg font-bold">2. Your script</h2>
            <p className="text-sm text-muted-foreground">
              Using the video's own sound (your own video, or one you have permission for)? No rewrite is needed.{" "}
              <button type="button" className="underline" onClick={() => { setSource("original"); setStep(2); setErr(""); setNote(""); }}>Go to step 3 and use the original audio →</button>
            </p>
            <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              The transcript is <b>someone else's work</b>: use it as research. A rewrite in your own words is the safer choice for your channel.
            </p>
            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-semibold">The transcript, with times</summary>
              <div className="mt-2 max-h-64 overflow-y-auto text-sm">
                {(job.segments ?? []).map((s, i) => (
                  <p key={i}>{s.start >= 0 && <span className="mr-2 font-mono text-xs text-muted-foreground">{clock(s.start)}</span>}{s.text}</p>
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
            <h2 className="font-display text-lg font-bold">3. The voice</h2>
            <p className="rounded-lg border border-border p-2 text-sm">{RULE}</p>
            <div className="space-y-2" role="radiogroup" aria-label="Where the voice comes from">
              {([["new", "🎙 Make a new voiceover from my script"], ["original", "🔊 Use the original audio from the video as it is"],
                ["upload", "📁 Upload my own audio file"]] as const).map(([id, label]) => (
                <label key={id} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${source === id ? "border-primary bg-primary/10" : "border-border"}`}>
                  <input type="radio" name="voice-source" className="mt-1 accent-primary" checked={source === id} onChange={() => { setSource(id); setErr(""); }} />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{label}</span>
                    {id !== "new" && (
                      <span className="mt-1 block text-xs text-amber-300">⚠ Use only your own videos or audio you have permission for. Re-using someone else's audio can bring copyright strikes and stop monetisation.</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {source === "new" && (
              <>
                {!job.script && <p className="text-sm text-amber-300">Save your script first (step 2).</p>}
                <VoicePicker provider={provider} voice={voice} onChange={chooseVoice} />
                {voice.startsWith("clone:") && <ColabEstimate chars={job.script.length} />}
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-primary" disabled={busy || working || !job.script} onClick={() => void makeVoice(false)}>🎙 Make the voice</button>
                  {job.voice_ready && job.voice?.provider !== "original" && job.voice?.provider !== "upload" && (
                    <button className="btn btn-ghost btn-sm" disabled={busy || working} onClick={() => void makeVoice(true)}>Make every part again</button>
                  )}
                </div>
              </>
            )}
            {source === "original" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No rewrite and no new voice: the transcript becomes the script, and its timing drives the scenes, subtitles and lip-sync. You can still correct misheard words in step 2.</p>
                {job.has_original ? (
                  <>
                    <audio className="w-full" controls preload="none" src={`/api/presenter/jobs/${job.id}/original`} />
                    <button className="btn btn-primary" disabled={busy || working} onClick={() => void useOriginal()}>✓ Use the original audio</button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-amber-300">The original sound is not saved for this video.</p>
                    {job.url ? <button className="btn btn-primary btn-sm" disabled={busy || working} onClick={() => void fetchAudio()}>⬇ Get the original audio</button>
                      : <p className="text-xs text-muted-foreground">Upload the video or audio file in step 1, or use “Upload my own audio file”.</p>}
                  </>
                )}
              </div>
            )}
            {source === "upload" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Your recording is used as it is. The app writes down its words; if your saved script matches them, your spelling is kept.</p>
                <input type="file" accept="audio/*,video/*" className="w-full text-sm" disabled={busy || working} aria-label="My own audio file"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void ownAudio(f); e.target.value = ""; }} />
              </div>
            )}
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

        {tools && step === 3 && <PhotoStep t={tools} />}
        {tools && step === 4 && <LipStep t={tools} />}
        {tools && step === 5 && <BackgroundStep t={tools} />}
        {tools && step >= 6 && step <= 7 && !(tools.job.layout && tools.job.extras) && <p className="text-sm">{tools.job.setup_error || "Loading…"}</p>}
        {tools && step === 6 && tools.job.layout && <LayoutStep t={tools} />}
        {tools && step === 7 && tools.job.extras && <ExtrasStep t={tools} />}
        {tools && step === 8 && <RenderStep t={tools} />}
        {job?.notice && <p className="text-sm text-amber-300">{job.notice}</p>}

        {note && <p className="text-sm text-emerald-300">{note}</p>}
        {err && <p className="text-sm text-amber-300">{err}</p>}

        {step < STEPS.length - 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <button className="btn btn-ghost" disabled={step === 0} onClick={() => { setStep(step - 1); setErr(""); setNote(""); }}>← Back</button>
            <button className="btn btn-primary px-8 text-lg" disabled={!canNext || busy} onClick={() => void next()}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
