import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, api } from "@/lib/api";

export const Route = createFileRoute("/downloader")({
  component: Downloader,
});

type DlStatus = {
  job_id: string;
  status: string;
  progress?: number;
  title?: string;
  duration_sec?: number | null;
  filename?: string | null;
  size_bytes?: number | null;
  size_mb?: number | null;
  speed?: number | null;
  eta?: number | null;
  download_url?: string | null;
  error?: string;
};

function fmtDur(sec: number | null | undefined) {
  if (!sec || sec <= 0) return "";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function fmtSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmtSpeed(bps: number | null | undefined) {
  if (!bps || bps <= 0) return "";
  if (bps >= 1048576) return `${(bps / 1048576).toFixed(1)} MB/s`;
  return `${Math.round(bps / 1024)} KB/s`;
}

function Downloader() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");
  const [progress, setProgress] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [done, setDone] = useState<DlStatus | null>(null);
  const [dlError, setDlError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const startDownload = async () => {
    if (!url.trim()) {
      setDlError("Paste a YouTube link first.");
      return;
    }
    setDlError("");
    setDone(null);
    setJobId(null);
    setProgress(0);
    try {
      const data = await api<{ job_id: string; status: string }>("/api/downloader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), format }),
      });
      setJobId(data.job_id);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(async () => {
        try {
          const st = await api<DlStatus>(`/api/downloader/${data.job_id}`);
          setProgress(st.progress ?? 0);
          if (st.status === "done") {
            if (timer.current) clearInterval(timer.current);
            setProgress(null);
            setDone(st);
          } else if (st.status === "failed") {
            if (timer.current) clearInterval(timer.current);
            setProgress(null);
            setDlError("Download failed: " + (st.error || "unknown error"));
          }
        } catch (e) {
          if (timer.current) clearInterval(timer.current);
          setProgress(null);
          setDlError(
            "Download progress check failed: " +
              (e instanceof Error ? e.message : "unknown error"),
          );
        }
      }, 1000);
    } catch (e) {
      setProgress(null);
      setDlError(
        "Download failed: " +
          (e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "unknown error"),
      );
    }
  };

  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    setUrl("");
    setProgress(null);
    setJobId(null);
    setDone(null);
    setDlError("");
  };

  const busy = progress !== null;

  return (
    <div>
      <PageHeader
        icon="⬇️"
        title="Video / MP3 Downloader"
        sub="Paste a YouTube link, pick a format, get the file. Free — no credits needed."
      />
      <div className="glass mx-auto max-w-2xl space-y-5 p-8">
        <h2 className="text-2xl font-bold">Paste a YouTube link</h2>
        <input
          className="field text-lg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=…"
        />
        <div>
          <h3 className="mb-2 font-semibold">Format</h3>
          <div className="seg">
            <button data-on={format === "mp4"} onClick={() => !busy && setFormat("mp4")}>
              🎬 Video · MP4
            </button>
            <button data-on={format === "mp3"} onClick={() => !busy && setFormat("mp3")}>
              🎵 Audio · MP3
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {format === "mp4"
              ? "Best quality video with sound, saved as MP4."
              : "Audio only, converted to MP3 at 192 kbps."}
          </p>
        </div>
        {!done && (
          <button
            className="btn btn-primary w-full py-4 text-lg"
            disabled={!url.trim() || busy}
            onClick={() => void startDownload()}
          >
            {busy
              ? `Downloading… ${Math.round(progress ?? 0)}%`
              : format === "mp4"
                ? "⬇ Download video"
                : "⬇ Download MP3"}
          </button>
        )}
        {busy && (
          <>
            <div className="bar">
              <div style={{ width: `${progress ?? 0}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">
              Downloading your file… keep this tab open.
            </p>
          </>
        )}
        {dlError && <p className="text-sm text-destructive">{dlError}</p>}
        {done && (
          <>
            <div className="rounded-xl border border-border p-4">
              <div className="font-semibold">{done.title || "Downloaded file"}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="chip">{format === "mp4" ? "🎬 MP4 video" : "🎵 MP3 audio"}</span>
                {fmtDur(done.duration_sec) && <span className="chip">⏱ {fmtDur(done.duration_sec)}</span>}
                {fmtSize(done.size_bytes) && <span className="chip">💾 {fmtSize(done.size_bytes)}</span>}
              </div>
              {done.filename && (
                <p className="mt-2 text-sm text-muted-foreground">{done.filename}</p>
              )}
            </div>
            <div className="flex gap-3">
              {done.download_url && (
                <a
                  className="btn btn-amber flex-1 py-4 text-lg"
                  href={done.download_url}
                  download={done.filename ?? undefined}
                >
                  ⬇ Download file
                </a>
              )}
              <button className="btn btn-ghost" onClick={reset}>
                Download another
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Tip: use your own videos, or videos you have permission to use.
              {jobId ? ` Job ${jobId}.` : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
