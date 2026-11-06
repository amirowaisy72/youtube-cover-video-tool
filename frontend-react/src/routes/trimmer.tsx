import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { api } from "@/lib/api";

export const Route = createFileRoute("/trimmer")({
  component: Trimmer,
});

const MAX_SECTION_SECONDS = 600; // 10 minutes

type TrimmerJob = {
  id: string;
  status: string;
  progress: number | null;
  title: string;
  section: string;
  size_mb: number | null;
  download_url: string;
  error: string;
};

/** "90" | "1:30" | "1:02:30" -> seconds, or null when unparseable. */
function parseTime(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(":");
  if (parts.some((p) => p === "" || Number.isNaN(Number(p)))) return null;
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0]!;
  if (nums.length === 2) return nums[0]! * 60 + nums[1]!;
  if (nums.length === 3) return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
  return null;
}

function fmtClock(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Trimmer() {
  const [url, setUrl] = useState("");
  const [start, setStart] = useState("0:00");
  const [end, setEnd] = useState("1:00");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const startSec = parseTime(start);
  const endSec = parseTime(end);
  const sectionLen =
    startSec !== null && endSec !== null && endSec > startSec ? endSec - startSec : null;
  const sectionValid =
    sectionLen !== null && sectionLen > 0 && sectionLen <= MAX_SECTION_SECONDS;

  const startTrim = async () => {
    if (!url.trim()) {
      setError("Paste a YouTube link first.");
      return;
    }
    if (startSec === null || endSec === null) {
      setError("Start and end must be times like 1:30 or 90 (seconds).");
      return;
    }
    if (endSec <= startSec) {
      setError("End time must be after the start time.");
      return;
    }
    if (sectionLen !== null && sectionLen > MAX_SECTION_SECONDS) {
      setError(`Section is longer than 10 minutes (${fmtClock(sectionLen)}). Pick a shorter section.`);
      return;
    }
    setError("");
    setTitle("");
    setFileUrl(null);
    setBusy(true);
    setProgress(0);
    try {
      const data = await api<{ job_id: string; status: string }>("/api/trimmer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), start: startSec, end: endSec }),
      });
      setJobId(data.job_id);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(async () => {
        try {
          const job = await api<TrimmerJob>(`/api/trimmer/${data.job_id}`);
          if (typeof job.progress === "number") setProgress(job.progress);
          if (job.status === "done") {
            if (timer.current) clearInterval(timer.current);
            setBusy(false);
            setProgress(100);
            setTitle(job.title);
            setFileUrl(job.download_url);
          } else if (job.status === "failed") {
            if (timer.current) clearInterval(timer.current);
            setBusy(false);
            setProgress(null);
            setError("Download failed: " + (job.error || "unknown error"));
          }
        } catch (e) {
          if (timer.current) clearInterval(timer.current);
          setBusy(false);
          setProgress(null);
          setError("Progress check failed: " + (e instanceof Error ? e.message : "unknown error"));
        }
      }, 1000);
    } catch (e) {
      setBusy(false);
      setProgress(null);
      setError("Could not start: " + (e instanceof Error ? e.message : "unknown error"));
    }
  };

  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    setJobId(null);
    setProgress(null);
    setTitle("");
    setFileUrl(null);
    setError("");
    setBusy(false);
  };

  return (
    <div>
      <PageHeader
        icon="✂️"
        title="Video Trimmer"
        sub="Download only the part you need — paste a link, pick start and end."
      />
      <div className="glass mx-auto max-w-2xl space-y-5 p-8">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Paste a YouTube link</h2>
          <input
            className="field text-lg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-semibold">Start</label>
            <input
              className="field text-lg"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="0:00"
            />
          </div>
          <div>
            <label className="mb-2 block font-semibold">End</label>
            <input
              className="field text-lg"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="1:00"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Times as m:ss (1:30), h:mm:ss, or plain seconds (90). Max section: 10:00.
        </p>
        <div className="flex flex-wrap gap-2">
          {sectionLen !== null && sectionLen > 0 && (
            <span className="chip">
              ✂️ Section: {fmtClock(startSec ?? 0)} – {fmtClock(endSec ?? 0)} ({fmtClock(sectionLen)})
            </span>
          )}
          {sectionLen !== null && sectionLen > MAX_SECTION_SECONDS && (
            <span className="chip text-amber">⚠ Over 10 minutes — shorten it</span>
          )}
        </div>
        <button
          className="btn btn-primary w-full py-4 text-lg"
          disabled={busy || !url.trim() || !sectionValid}
          onClick={() => void startTrim()}
        >
          {busy
            ? progress !== null
              ? `Downloading section… ${Math.round(progress)}%`
              : "Downloading section…"
            : "✂️ Download this section only"}
        </button>
        {progress !== null && busy && (
          <div className="bar">
            <div style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {fileUrl && (
          <div className="space-y-4 rounded-xl border border-border p-4">
            <span className="chip text-success">✓ Section ready</span>
            {title && <div className="font-semibold">{title}</div>}
            <video src={fileUrl} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black" />
            <div className="flex gap-3">
              <a className="btn btn-amber flex-1 py-3" href={fileUrl} download>
                ⬇ Download MP4
              </a>
              <button className="btn btn-ghost" onClick={reset}>
                Trim another
              </button>
            </div>
          </div>
        )}
        {jobId && !fileUrl && !error && (
          <p className="text-sm text-muted-foreground">
            Only the selected section is being fetched — the rest of the video is never downloaded.
          </p>
        )}
      </div>
    </div>
  );
}
