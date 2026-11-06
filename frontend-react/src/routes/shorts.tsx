import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, api } from "@/lib/api";

export const Route = createFileRoute("/shorts")({
  component: Shorts,
});

const MAX_CLIP = 60;

type ShortsJob = {
  id: string;
  status: string;
  progress?: number;
  stage?: string;
  error?: string;
  title?: string;
  duration?: number;
  start?: number;
  end?: number;
  clip_seconds?: number;
  output_mb?: number;
  clamped?: boolean;
  download_url?: string;
};

function fmtDur(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return "";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Shorts() {
  const [mode, setMode] = useState<"upload" | "youtube">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileDur, setFileDur] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("30");
  const [formError, setFormError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ShortsJob | null>(null);
  const [working, setWorking] = useState(false);
  const [runError, setRunError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNum = parseFloat(start);
  const endNum = parseFloat(end);
  const clipLen = Number.isFinite(startNum) && Number.isFinite(endNum) ? endNum - startNum : NaN;

  const validate = (): string | null => {
    if (mode === "upload" && !file) return "Choose a video file first.";
    if (mode === "youtube" && !url.trim()) return "Paste a YouTube link first.";
    if (!Number.isFinite(startNum) || startNum < 0) return "Start must be 0 seconds or more.";
    if (!Number.isFinite(endNum) || endNum <= startNum) return "End must be after start.";
    if (clipLen > MAX_CLIP) return `Clip can be at most ${MAX_CLIP} seconds long.`;
    if (fileDur !== null && startNum >= fileDur) return `Start is past the end of the video (${fmtDur(fileDur)}).`;
    return null;
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setFormError("");
    setJob(null);
    setJobId(null);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const obj = URL.createObjectURL(f);
    setFileUrl(obj);
    setFileDur(null);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.src = obj;
    el.onloadedmetadata = () => {
      setFileDur(el.duration);
      if (Number.isFinite(el.duration) && (!end || parseFloat(end) > el.duration)) {
        setEnd(String(Math.min(30, Math.max(1, Math.floor(el.duration)))));
      }
    };
  };

  const startPolling = (id: string) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const j = await api<ShortsJob>(`/api/shorts/${id}`);
        setJob(j);
        if (j.status === "done" || j.status === "failed") {
          if (timer.current) clearInterval(timer.current);
          setWorking(false);
          if (j.status === "failed") setRunError(j.error || "Making the Short failed.");
        }
      } catch (e) {
        if (timer.current) clearInterval(timer.current);
        setWorking(false);
        setRunError("Progress check failed: " + (e instanceof Error ? e.message : "unknown error"));
      }
    }, 1000);
  };

  const makeShort = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError("");
    setRunError("");
    setJob(null);
    setWorking(true);
    try {
      let data: { job_id: string; status: string };
      if (mode === "upload" && file) {
        const form = new FormData();
        form.append("file", file);
        form.append("start_seconds", String(startNum));
        form.append("end_seconds", String(endNum));
        const res = await fetch("/api/shorts/upload", { method: "POST", body: form });
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) throw new ApiError(res.status, (body["detail"] as string) || "Upload failed.");
        data = body as unknown as { job_id: string; status: string };
      } else {
        data = await api<{ job_id: string; status: string }>("/api/shorts/from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), start_seconds: startNum, end_seconds: endNum }),
        });
      }
      setJobId(data.job_id);
      startPolling(data.job_id);
    } catch (e) {
      setWorking(false);
      setRunError(e instanceof Error ? e.message : "Could not start the Short.");
    }
  };

  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    setJob(null);
    setJobId(null);
    setWorking(false);
    setRunError("");
    setFormError("");
  };

  const done = job?.status === "done";
  const failed = job?.status === "failed";
  const progress = job?.progress ?? 0;

  return (
    <div>
      <PageHeader icon="📱" title="Shorts Maker" sub="Your long video, cut into a vertical 9:16 Short." />
      <p className="mb-6 text-sm text-muted-foreground">
        Use your <b className="text-foreground">own</b> video — cutting someone else&apos;s video into a Short does not remove its copyright.
      </p>

      <div className="glass mx-auto max-w-2xl space-y-5 p-8">
        <div className="seg">
          <button data-on={mode === "upload"} onClick={() => setMode("upload")}>⬆ Upload video</button>
          <button data-on={mode === "youtube"} onClick={() => setMode("youtube")}>▶ YouTube link</button>
        </div>

        {mode === "upload" ? (
          <div>
            {fileUrl ? (
              <video src={fileUrl} controls preload="metadata" className="mx-auto aspect-[9/16] max-h-[420px] rounded-xl bg-black" />
            ) : (
              <button onClick={() => fileRef.current?.click()} className="grid aspect-video w-full place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary">
                <div className="text-center"><div className="text-4xl">⬆</div>Upload your long video (MP4 / MOV / WebM)</div>
              </button>
            )}
            <input ref={fileRef} type="file" accept="video/*" hidden
              onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                {file ? "Change video" : "⬆ Choose video"}
              </button>
              {file && (
                <>
                  <span className="chip">{file.name}</span>
                  {fileDur !== null && <span className="chip">⏱ {fmtDur(fileDur)}</span>}
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="mb-2 text-xl font-bold">Paste a YouTube link</h2>
            <p className="mb-3 text-sm text-muted-foreground">Your own video — it is downloaded first, then the Short is cut from it.</p>
            <input className="field text-lg" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
            {job?.duration ? <p className="mt-2 text-sm text-muted-foreground">Video length: {fmtDur(job.duration)}</p> : null}
          </div>
        )}

        <div>
          <h3 className="mb-2 font-semibold">Clip range (seconds)</h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              Start
              <input className="field w-24" type="number" min={0} step={1} value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              End
              <input className="field w-24" type="number" min={1} step={1} value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <span className="chip">
              {Number.isFinite(clipLen) ? `Clip: ${clipLen}s / max ${MAX_CLIP}s` : `Max ${MAX_CLIP}s per clip`}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            {[15, 30, 60].map((n) => (
              <button key={n} className="btn btn-ghost btn-sm" onClick={() => setEnd(String((Number.isFinite(startNum) ? startNum : 0) + n))}>
                {n}s clip
              </button>
            ))}
          </div>
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <button className="btn btn-primary w-full py-4 text-lg" disabled={working} onClick={() => void makeShort()}>
          {working ? `${job?.stage || "Working…"} ${Math.round(progress)}%` : "✂️ Make my Short"}
        </button>
        {working && <div className="bar"><div style={{ width: `${progress}%` }} /></div>}
        {job?.stage && working && <p className="text-sm text-muted-foreground">{job.stage}</p>}
        {runError && <p className="text-sm text-destructive">{runError}</p>}
        {failed && job?.error && <p className="text-sm text-destructive">{job.error}</p>}
      </div>

      {done && job && (
        <div className="glass mx-auto mt-6 max-w-2xl space-y-5 p-8">
          <span className="chip text-success">✓ Your Short is ready — 1080x1920</span>
          {job.title && <h3 className="text-xl font-bold">{job.title}</h3>}
          <video src={`/api/shorts/file/${job.id}`} controls preload="metadata" className="mx-auto aspect-[9/16] max-h-[480px] rounded-xl bg-black" />
          <div className="flex flex-wrap gap-2">
            {job.clip_seconds !== undefined && <span className="chip">⏱ {job.clip_seconds}s clip</span>}
            {job.output_mb !== undefined && <span className="chip">💾 {job.output_mb} MB</span>}
            {job.clamped && <span className="chip text-amber">End was trimmed to the video&apos;s length</span>}
          </div>
          <div className="flex gap-3">
            <a className="btn btn-amber flex-1 py-4 text-lg" href={`/api/shorts/file/${job.id}`} download={`short-${job.id}.mp4`}>⬇ Download Short</a>
            <button className="btn btn-ghost" onClick={reset}>Make another</button>
          </div>
        </div>
      )}
    </div>
  );
}
