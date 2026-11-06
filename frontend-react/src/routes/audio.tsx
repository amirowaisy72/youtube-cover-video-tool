import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";

export const Route = createFileRoute("/audio")({
  component: AudioExtractor,
});

type AudioStatus = {
  id: string;
  status: string;
  progress: number;
  title: string;
  size_bytes?: number | null;
  error?: string;
  download_url?: string | null;
};

async function apiJson(r: Response): Promise<Record<string, unknown>> {
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    throw new Error(
      typeof data["detail"] === "string" ? data["detail"] : `Request failed (${r.status}).`,
    );
  }
  return data;
}

function fmtSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function AudioExtractor() {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [sizeBytes, setSizeBytes] = useState<number | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    },
    [],
  );

  const startPolling = (id: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/audio/${id}`);
        const data = (await apiJson(r)) as unknown as AudioStatus;
        setProgress(data.progress ?? 0);
        setStatus(data.status);
        if (data.title) setTitle(data.title);
        if (data.status === "done") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setProgress(null);
          setDownloadUrl(data.download_url ?? null);
          setSizeBytes(data.size_bytes ?? null);
        } else if (data.status === "failed") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setProgress(null);
          setError("Extraction failed: " + (data.error || "unknown error"));
        }
      } catch (e) {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setProgress(null);
        setError("Progress check failed: " + (e instanceof Error ? e.message : "unknown error"));
      }
    }, 1000);
  };

  const start = async () => {
    setError("");
    setDownloadUrl(null);
    setSizeBytes(null);
    setTitle("");
    if (mode === "upload" && !file) {
      setError("Choose a video file first.");
      return;
    }
    if (mode === "url" && !url.trim()) {
      setError("Paste a YouTube link first.");
      return;
    }
    const form = new FormData();
    if (mode === "upload" && file) form.append("file", file);
    if (mode === "url") form.append("url", url.trim());
    setProgress(0);
    setStatus(mode === "upload" ? "converting" : "downloading");
    try {
      const r = await fetch("/api/audio", { method: "POST", body: form });
      const data = await apiJson(r);
      const id = String(data["job_id"] ?? "");
      if (!id) throw new Error("Server did not return a job id.");
      setJobId(id);
      startPolling(id);
    } catch (e) {
      setProgress(null);
      setError("Could not start: " + (e instanceof Error ? e.message : "unknown error"));
    }
  };

  const reset = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setJobId(null);
    setProgress(null);
    setStatus("");
    setTitle("");
    setDownloadUrl(null);
    setSizeBytes(null);
    setError("");
    setFile(null);
    setUrl("");
  };

  const stageText =
    status === "downloading"
      ? "Downloading audio from YouTube…"
      : status === "converting"
        ? "Converting to MP3 (192k)…"
        : status === "done"
          ? "Done — your MP3 is ready."
          : status === "failed"
            ? "Failed."
            : "Working…";

  return (
    <div>
      <PageHeader icon="🎵" title="Audio Extractor" sub="Turn any video into a clean MP3. Free, no credits." />

      <div className="glass mx-auto max-w-2xl space-y-5 p-8">
        <div className="seg">
          <button data-on={mode === "upload"} onClick={() => setMode("upload")}>⬆ Upload video</button>
          <button data-on={mode === "url"} onClick={() => setMode("url")}>🔗 YouTube link</button>
        </div>

        {mode === "upload" ? (
          <>
            {file ? (
              <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                <span className="text-3xl">🎬</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{file.name}</div>
                  <div className="mt-1 flex gap-2">
                    <span className="chip">💾 {fmtSize(file.size)}</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>Remove</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="grid aspect-video w-full place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary"
              >
                <div className="text-center">
                  <div className="text-4xl">⬆</div>
                  Upload a video (MP4 / MOV / WebM / MKV / AVI)
                </div>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/avi,.mp4,.mov,.webm,.mkv,.avi"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </>
        ) : (
          <input
            className="field text-lg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
          />
        )}

        {!downloadUrl && (
          <button
            className="btn btn-primary w-full py-4 text-lg"
            disabled={progress !== null || (mode === "upload" ? !file : !url.trim())}
            onClick={() => void start()}
          >
            {progress !== null ? `${stageText} ${Math.round(progress)}%` : "🎵 Extract MP3"}
          </button>
        )}
        {progress !== null && <div className="bar"><div style={{ width: `${progress}%` }} /></div>}
        {title && <p className="text-sm text-muted-foreground">🎵 {title}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {downloadUrl && (
          <>
            <div className="rounded-xl border border-border p-4">
              <span className="chip mb-3 text-success">✓ MP3 ready</span>
              <audio src={downloadUrl} controls preload="metadata" className="mt-3 w-full" />
              <div className="mt-2 text-sm text-muted-foreground">
                {title && <b className="text-foreground">{title}</b>}
                {sizeBytes ? ` · MP3 192k · ${fmtSize(sizeBytes)}` : " · MP3 192k"}
              </div>
            </div>
            <div className="flex gap-3">
              <a className="btn btn-amber flex-1 py-4 text-lg" href={downloadUrl} download={`${(title || "audio").replace(/[^\w\s.-]/g, "")}.mp3`}>
                ⬇ Download MP3
              </a>
              <button className="btn btn-ghost" onClick={reset}>Extract another</button>
            </div>
          </>
        )}
      </div>

      {jobId && !downloadUrl && !error && (
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">
          Extracting… keep this page open. You can start a new one when it finishes.
        </p>
      )}
    </div>
  );
}
