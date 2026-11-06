import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";

export const Route = createFileRoute("/subtitles")({
  component: Subtitles,
});

type SubStatus = {
  job_id: string;
  status: string;
  progress: number;
  stage: string;
  language?: string | null;
  language_probability?: number | null;
  transcript?: string | null;
  segments?: number;
  duration_sec?: number | null;
  download_url?: string | null;
  can_burn?: boolean | null;
  error?: string | null;
};

type BurnStatus = {
  burn_id: string;
  job_id: string;
  status: string;
  progress: number;
  stage: string;
  style?: string | null;
  download_url?: string | null;
  error?: string | null;
};

const BURN_STYLES: Array<[string, string, string]> = [
  ["tiktok", "TikTok Bold", "Big bold white text, black outline"],
  ["yellow", "Classic Yellow", "Yellow text with black outline"],
  ["minimal", "Minimal White", "Smaller clean white text"],
];

const LANGUAGES: Array<[string, string]> = [
  ["", "Auto-detect"],
  ["en", "English"],
  ["ur", "Urdu"],
  ["hi", "Hindi"],
  ["ar", "Arabic"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["tr", "Turkish"],
];

function fmtDur(sec: number | null | undefined) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function Subtitles() {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<SubStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [burnStyle, setBurnStyle] = useState("tiktok");
  const [burn, setBurn] = useState<BurnStatus | null>(null);
  const [burnBusy, setBurnBusy] = useState(false);
  const [burnError, setBurnError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const burnTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (burnTimer.current) clearInterval(burnTimer.current);
  }, []);

  const startPolling = (jobId: string) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/subtitles/${jobId}`);
        if (!res.ok) throw new Error(`Status check failed (${res.status}).`);
        const data = (await res.json()) as SubStatus;
        setJob(data);
        if (data.status === "done" || data.status === "failed") {
          if (timer.current) clearInterval(timer.current);
          setBusy(false);
          if (data.status === "failed") setError(data.error || "Subtitle generation failed.");
        }
      } catch (e) {
        if (timer.current) clearInterval(timer.current);
        setBusy(false);
        setError(e instanceof Error ? e.message : "Status check failed.");
      }
    }, 1000);
  };

  const startBurnPolling = (burnId: string) => {
    if (burnTimer.current) clearInterval(burnTimer.current);
    burnTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/subtitles/burn/${burnId}`);
        if (!res.ok) throw new Error(`Burn check failed (${res.status}).`);
        const data = (await res.json()) as BurnStatus;
        setBurn(data);
        if (data.status === "done" || data.status === "failed") {
          if (burnTimer.current) clearInterval(burnTimer.current);
          setBurnBusy(false);
          if (data.status === "failed") setBurnError(data.error || "Burn-in failed.");
        }
      } catch (e) {
        if (burnTimer.current) clearInterval(burnTimer.current);
        setBurnBusy(false);
        setBurnError(e instanceof Error ? e.message : "Burn check failed.");
      }
    }, 1000);
  };

  const startBurn = async () => {
    if (!job) return;
    setBurnError("");
    setBurn(null);
    setBurnBusy(true);
    try {
      const res = await fetch("/api/subtitles/burn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.job_id, style: burnStyle }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail || `Could not start burn-in (${res.status}).`);
      }
      const data = (await res.json()) as { burn_id: string; status: string };
      startBurnPolling(data.burn_id);
    } catch (e) {
      setBurnBusy(false);
      setBurnError(e instanceof Error ? e.message : "Could not start burn-in.");
    }
  };

  const start = async () => {
    setError("");
    setJob(null);
    setCopied(false);
    setBurn(null);
    setBurnError("");
    setBurnBusy(false);
    if (burnTimer.current) clearInterval(burnTimer.current);
    setBusy(true);
    try {
      let res: Response;
      if (mode === "upload") {
        if (!file) throw new Error("Choose a video or audio file first.");
        const form = new FormData();
        form.append("file", file);
        form.append("language", language);
        res = await fetch("/api/subtitles", { method: "POST", body: form });
      } else {
        if (!url.trim()) throw new Error("Paste a YouTube link first.");
        res = await fetch("/api/subtitles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), language }),
        });
      }
      if (!res.ok) {
        const detail = await res.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail || `Could not start subtitles (${res.status}).`);
      }
      const data = (await res.json()) as { job_id: string; status: string };
      startPolling(data.job_id);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Could not start subtitles.");
    }
  };

  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    if (burnTimer.current) clearInterval(burnTimer.current);
    setJob(null);
    setError("");
    setBusy(false);
    setFile(null);
    setUrl("");
    setCopied(false);
    setBurn(null);
    setBurnError("");
    setBurnBusy(false);
  };

  const copyTranscript = async () => {
    if (!job?.transcript) return;
    try {
      await navigator.clipboard.writeText(job.transcript);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const running = busy && job?.status !== "done" && job?.status !== "failed";
  const done = job?.status === "done";

  return (
    <div>
      <PageHeader icon="💬" title="Subtitle Generator" sub="Turn any video or audio into subtitles — free, on your computer." />

      <div className="mx-auto max-w-2xl space-y-5">
        <div className="glass space-y-5 p-8">
          <div className="seg">
            <button data-on={mode === "upload"} onClick={() => setMode("upload")}>⬆ Upload file</button>
            <button data-on={mode === "url"} onClick={() => setMode("url")}>▶ YouTube link</button>
          </div>

          {mode === "upload" ? (
            <>
              <button onClick={() => fileRef.current?.click()} className="grid w-full place-items-center rounded-xl border-2 border-dashed border-border p-8 text-muted-foreground hover:border-primary">
                <div className="text-center">
                  <div className="text-4xl">⬆</div>
                  <div className="mt-2">Upload a video or audio file</div>
                  <div className="mt-1 text-sm">MP4, WebM, MOV, MKV, MP3, WAV, M4A, OGG, FLAC — max 2 GB</div>
                </div>
              </button>
              <input ref={fileRef} type="file" accept="video/*,audio/*,.mp4,.webm,.mov,.mkv,.avi,.mp3,.wav,.m4a,.ogg,.flac,.aac,.wma" hidden
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); e.target.value = ""; }} />
              {file && (
                <div className="flex items-center gap-2">
                  <span className="chip">📄 {file.name}</span>
                  <span className="chip">💾 {fmtSize(file.size)}</span>
                </div>
              )}
            </>
          ) : (
            <input className="field text-lg" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…" />
          )}

          <div>
            <h3 className="mb-2 font-semibold">Spoken language</h3>
            <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map(([value, label]) => (
                <option key={value || "auto"} value={value}>{label}</option>
              ))}
            </select>
            <p className="mt-2 text-sm text-muted-foreground">Auto-detect works for most videos. Pick a language only if it guesses wrong.</p>
          </div>

          <button className="btn btn-primary w-full py-4 text-lg" disabled={busy} onClick={() => void start()}>
            {busy ? "Working…" : "✨ Generate subtitles"}
          </button>
          <p className="text-sm text-muted-foreground">
            Free, private, on your computer. First run downloads the tiny speech model (~75 MB, one time only).
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {job && running && (
          <div className="glass space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{job.stage || "Working…"}</h3>
              <span className="font-display text-2xl font-bold text-gradient">{Math.round(job.progress ?? 0)}%</span>
            </div>
            <div className="bar"><div style={{ width: `${job.progress ?? 0}%` }} /></div>
            {job.status === "downloading_model" && (
              <p className="text-sm text-muted-foreground">
                First run only: downloading the tiny speech model (~75 MB). Next time it starts instantly.
              </p>
            )}
          </div>
        )}

        {done && job && (
          <div className="space-y-5">
            <div className="glass p-6">
              <span className="chip mb-3 text-success">✓ Subtitles ready</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.language && <span className="chip">🌐 {job.language.toUpperCase()}</span>}
                {job.duration_sec ? <span className="chip">⏱ {fmtDur(job.duration_sec)}</span> : null}
                {job.segments ? <span className="chip">💬 {job.segments} lines</span> : null}
              </div>
              {job.transcript && (
                <div className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-border p-4 text-sm leading-relaxed">
                  {job.transcript}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                {job.download_url && (
                  <a className="btn btn-amber flex-1 py-3" href={job.download_url} download="subtitles.srt">⬇ Download .SRT</a>
                )}
                <button className="btn btn-ghost" onClick={() => void copyTranscript()}>
                  {copied ? "✓ Copied" : "📋 Copy text"}
                </button>
                <button className="btn btn-ghost" onClick={reset}>Make another</button>
              </div>
            </div>

            {job.can_burn ? (
              <div className="glass p-6">
                <h3 className="font-semibold">🔥 Burn captions into the video</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Renders the captions onto your video, TikTok / Shorts style — ready to upload.
                </p>
                <div className="seg mt-4 flex-wrap">
                  {BURN_STYLES.map(([value, label]) => (
                    <button key={value} data-on={burnStyle === value} onClick={() => setBurnStyle(value)}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {BURN_STYLES.find(([value]) => value === burnStyle)?.[2]}
                </p>
                {!burn && (
                  <button className="btn btn-primary mt-4 w-full py-3" disabled={burnBusy} onClick={() => void startBurn()}>
                    {burnBusy ? "Starting…" : "🔥 Burn captions into video"}
                  </button>
                )}
                {burn && burn.status !== "done" && burn.status !== "failed" && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{burn.stage || "Burning…"}</h3>
                      <span className="font-display text-2xl font-bold text-gradient">{Math.round(burn.progress ?? 0)}%</span>
                    </div>
                    <div className="bar"><div style={{ width: `${burn.progress ?? 0}%` }} /></div>
                  </div>
                )}
                {burn?.status === "done" && burn.download_url && (
                  <a className="btn btn-amber mt-4 w-full py-3" href={burn.download_url} download={`captioned-${job.job_id}.mp4`}>
                    ⬇ Download video with captions
                  </a>
                )}
                {burn?.status === "done" && (
                  <button className="btn btn-ghost mt-3 w-full" onClick={() => { setBurn(null); setBurnError(""); }}>
                    Burn with a different style
                  </button>
                )}
                {burnError && <p className="mt-3 text-sm text-destructive">{burnError}</p>}
              </div>
            ) : (
              <div className="glass p-6">
                <h3 className="font-semibold">🔥 Burn captions into the video</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Burn-in needs an uploaded video file — this job used audio or a YouTube link,
                  so there is no video to burn the captions into. Upload a video file to use it.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
