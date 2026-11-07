import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-store";

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

/** YouTube video id from any YouTube link (watch?v=, youtu.be, Shorts, live, embed). */
function extractVideoId(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const isId = (s: string) => /^[A-Za-z0-9_-]{11}$/.test(s);
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return isId(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v && isId(v)) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if ((parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed" || parts[0] === "v") && parts[1] && isId(parts[1])) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

// Minimal YouTube IFrame API typing (loaded from youtube.com/iframe_api).
type YTPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
  loadVideoById: (videoId: string) => void;
  destroy: () => void;
};
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: { onReady?: () => void };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function Trimmer() {
  const { jobs, registerJob, updateJob } = useApp();
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
  const jobKey = useRef<string | null>(null);
  // Timeline (draggable handles) — filled by /api/trimmer/info.
  const [videoTitle, setVideoTitle] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragTarget = useRef<"start" | "end" | null>(null);
  // Video preview (YouTube embed, user 2026-11-08): so the user can
  // SEE the video while picking cut points, instead of guessing
  // from times alone. The player seeks to a handle as it is
  // dragged, and the player can set a handle to its current time.
  const [videoId, setVideoId] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const lastSeekRef = useRef(0);

  // Load the YouTube IFrame API once (for seeking + current time).
  useEffect(() => {
    if (window.YT?.Player) {
      setApiReady(true);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      setApiReady(true);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create the player once the API is ready and a video is loaded;
  // later videos load into the same player.
  useEffect(() => {
    if (!apiReady || !videoId) return;
    const YT = window.YT;
    if (!YT?.Player) return;
    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
      return;
    }
    const host = playerHostRef.current;
    if (!host) return;
    playerRef.current = new YT.Player(host, {
      videoId,
      playerVars: { rel: 0 },
      events: { onReady: () => setPlayerReady(true) },
    });
  }, [apiReady, videoId]);

  // Destroy the player when leaving the page.
  useEffect(
    () => () => {
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
    },
    [],
  );

  /** Seek the preview player (throttled while dragging). */
  const seekPlayer = (t: number) => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    const now = Date.now();
    if (now - lastSeekRef.current < 150) return;
    lastSeekRef.current = now;
    try {
      p.seekTo(Math.max(0, t), true);
    } catch {
      /* player not ready yet */
    }
  };

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const poll = (id: string) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const job = await api<TrimmerJob>(`/api/trimmer/${id}`);
        if (typeof job.progress === "number") setProgress(job.progress);
        if (jobKey.current) {
          updateJob(jobKey.current, {
            progress: job.progress ?? 0,
            stage: job.title || "Trimming…",
            status: job.status === "done" ? "done" : job.status === "failed" ? "failed" : "running",
          });
        }
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
  };

  // Restore a trim that was started earlier and is still in
  // the background store (user left the page and came back via
  // the top progress bar, or refreshed). The backend job kept
  // running the whole time.
  useEffect(() => {
    const active = jobs.find((j) => j.tool === "trimmer" && j.status === "running");
    const finished = jobs.find((j) => j.tool === "trimmer" && j.status === "done");
    const found = active ?? finished;
    if (!found || jobId) return;
    jobKey.current = found.key;
    setJobId(found.jobId);
    void api<TrimmerJob>(`/api/trimmer/${found.jobId}`).then((job) => {
      if (job.status === "done") { setBusy(false); setProgress(100); setTitle(job.title); setFileUrl(job.download_url); }
      else if (job.status === "failed") setError("Download failed: " + (job.error || "unknown error"));
      else { setBusy(true); if (typeof job.progress === "number") setProgress(job.progress); poll(found.jobId); }
    }).catch(() => { /* Job gone (server restarted): stay on the form. */ });
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSec = parseTime(start);
  const endSec = parseTime(end);
  const sectionLen =
    startSec !== null && endSec !== null && endSec > startSec ? endSec - startSec : null;
  const sectionValid =
    sectionLen !== null && sectionLen > 0 && sectionLen <= MAX_SECTION_SECONDS;

  /** Fetch title + duration so the timeline bar can be drawn. */
  const loadVideoInfo = async () => {
    if (!url.trim()) {
      setInfoError("Paste a YouTube link first.");
      return;
    }
    setInfoError("");
    setInfoLoading(true);
    try {
      const info = await api<{ title: string; duration_sec: number | null }>(
        "/api/trimmer/info",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        },
      );
      setVideoTitle(info.title);
      setVideoId(extractVideoId(url.trim()));
      if (typeof info.duration_sec === "number" && info.duration_sec > 0) {
        const dur = info.duration_sec;
        setDurationSec(dur);
        // Keep the current times, but clamp them inside the video.
        if (startSec !== null && startSec >= dur) setStart("0:00");
        if (endSec !== null && endSec > dur) setEnd(fmtClock(dur));
      } else {
        setDurationSec(null);
        setInfoError("This video has no duration (live stream?) — type the times manually.");
      }
    } catch (e) {
      setDurationSec(null);
      setVideoTitle("");
      setVideoId(null);
      setInfoError(e instanceof Error ? e.message : "Could not load the video.");
    } finally {
      setInfoLoading(false);
    }
  };

  /** Seconds under the pointer on the timeline track, or null. */
  const timeFromClientX = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track || durationSec === null) return null;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return pct * durationSec;
  };

  /** Move one handle to a time, keeping start < end and section <= 10 min. */
  const moveHandle = (which: "start" | "end", t: number) => {
    const s = startSec ?? 0;
    const e = endSec ?? 0;
    if (which === "start") {
      const next = Math.min(Math.max(0, t), Math.max(0, e - 1), e - 1);
      const clamped = Math.max(next, e - MAX_SECTION_SECONDS);
      const v = Math.floor(Math.max(0, clamped));
      setStart(fmtClock(v));
      seekPlayer(v);
    } else {
      const next = Math.max(Math.min(durationSec ?? t, t), s + 1);
      const clamped = Math.min(next, s + MAX_SECTION_SECONDS);
      const v = Math.floor(clamped);
      setEnd(fmtClock(v));
      seekPlayer(v);
    }
  };

  /** Set a handle to the preview player's current time (so the user
      can scrub inside the YouTube player itself, then capture the
      exact moment). */
  const setFromPlayer = (which: "start" | "end") => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    try {
      moveHandle(which, p.getCurrentTime());
    } catch {
      /* player not ready yet */
    }
  };

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (durationSec === null) return;
    const t = timeFromClientX(e.clientX);
    if (t === null) return;
    // Pause the preview so the frame stays on the cut point while
    // the user drags, instead of playing past it.
    try {
      playerRef.current?.pauseVideo();
    } catch {
      /* player not ready yet */
    }
    // Grab the nearest handle (a handle's own pointerdown sets it directly).
    const handle = (e.target as HTMLElement).closest("[data-handle]")?.getAttribute("data-handle");
    const which: "start" | "end" =
      handle === "end" || handle === "start"
        ? handle
        : Math.abs(t - (startSec ?? 0)) <= Math.abs(t - (endSec ?? 0))
          ? "start"
          : "end";
    dragTarget.current = which;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    moveHandle(which, t);
  };

  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragTarget.current) return;
    const t = timeFromClientX(e.clientX);
    if (t === null) return;
    moveHandle(dragTarget.current, t);
  };

  const onTrackPointerUp = () => {
    dragTarget.current = null;
  };

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
      // Background job: the trim keeps running if the user
      // leaves this page, and the top bar shows its progress.
      const key = `trimmer:${data.job_id}`;
      jobKey.current = key;
      registerJob({ key, tool: "trimmer", title: url.trim(), route: "/trimmer", jobId: data.job_id });
      poll(data.job_id);
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
        sub="Download only the part you need — load the video, watch it, drag to pick start and end."
      />
      <div className="glass mx-auto max-w-2xl space-y-5 p-8">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Paste a YouTube link</h2>
          <input
            className="field text-lg"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              // The loaded video no longer matches this link.
              setDurationSec(null);
              setVideoTitle("");
              setVideoId(null);
              setInfoError("");
            }}
            placeholder="https://youtube.com/watch?v=…"
          />
          <button
            className="btn btn-ghost mt-3"
            disabled={!url.trim() || infoLoading}
            onClick={() => void loadVideoInfo()}
          >
            {infoLoading ? "Loading video…" : "📺 Load video (shows the timeline)"}
          </button>
          {infoError && <p className="mt-2 text-sm text-destructive">{infoError}</p>}
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
        {durationSec !== null && startSec !== null && endSec !== null && (
          <div>
            {videoTitle && (
              <p className="mb-2 truncate text-sm font-semibold" title={videoTitle}>
                {videoTitle} · {fmtClock(durationSec)}
              </p>
            )}
            {/* Video preview (user, 2026-11-08): the actual video,
                so the user can SEE where to cut. Dragging a handle
                seeks the player to that moment; the buttons below
                capture the player's current time as a cut point. */}
            {videoId && (
              <div className="mb-3 overflow-hidden rounded-xl bg-black">
                <div ref={playerHostRef} className="aspect-video w-full" />
              </div>
            )}
            {videoId && playerReady && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFromPlayer("start")}>
                  ⏱ Set start to video position
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFromPlayer("end")}>
                  ⏱ Set end to video position
                </button>
              </div>
            )}
            <div
              ref={trackRef}
              className="relative h-12 cursor-pointer select-none"
              style={{ touchAction: "none" }}
              onPointerDown={onTrackPointerDown}
              onPointerMove={onTrackPointerMove}
              onPointerUp={onTrackPointerUp}
              onPointerCancel={onTrackPointerUp}
              role="slider"
              aria-label="Video timeline — drag the handles to pick your section"
            >
              {/* full track */}
              <div
                className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full"
                style={{ background: "var(--secondary)" }}
              />
              {/* selected section */}
              <div
                className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full"
                style={{
                  left: `${(startSec / durationSec) * 100}%`,
                  width: `${Math.max(0, ((endSec - startSec) / durationSec) * 100)}%`,
                  background: "var(--gradient-brand)",
                }}
              />
              {/* start handle */}
              <div
                data-handle="start"
                className="absolute top-1/2 z-10 flex h-9 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-white bg-primary shadow-lg"
                style={{ left: `${(startSec / durationSec) * 100}%`, touchAction: "none" }}
              >
                <span className="text-[10px] font-bold text-white">◂</span>
              </div>
              {/* end handle */}
              <div
                data-handle="end"
                className="absolute top-1/2 z-10 flex h-9 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-white bg-primary shadow-lg"
                style={{ left: `${(endSec / durationSec) * 100}%`, touchAction: "none" }}
              >
                <span className="text-[10px] font-bold text-white">▸</span>
              </div>
              {/* handle time bubbles */}
              <span
                className="absolute -top-1 z-10 -translate-x-1/2 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white"
                style={{ left: `${(startSec / durationSec) * 100}%` }}
              >
                {fmtClock(startSec)}
              </span>
              <span
                className="absolute -top-1 z-10 -translate-x-1/2 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white"
                style={{ left: `${(endSec / durationSec) * 100}%` }}
              >
                {fmtClock(endSec)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>0:00</span>
              <span>Drag the handles — or tap the bar to move the nearest one</span>
              <span>{fmtClock(durationSec)}</span>
            </div>
          </div>
        )}
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
