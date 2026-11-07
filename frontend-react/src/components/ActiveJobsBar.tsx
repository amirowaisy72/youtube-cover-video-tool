import { Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-store";

const TOOL_LABEL: Record<string, string> = {
  "auto-video": "🎬 Auto Video",
  "cover": "🎨 Cover Video",
  "downloader": "⬇️ Downloader",
  "trimmer": "✂️ Trimmer",
  "shorts": "📱 Shorts Maker",
  "subtitles": "💬 Subtitles",
  "audio": "🎵 Audio Extractor",
};

/** Background-jobs bar (user, 2026-11-07): when a tool is
    processing and the user leaves its page, the job keeps
    running (the backend never stops it) and this bar stays at
    the top of the home page — and every page, under the
    TopBar — showing the tool's live progress. Clicking a job
    returns to that tool, which restores the job view. A
    finished job stays as "Ready" until dismissed (✕). */
export function ActiveJobsBar() {
  const { jobs, removeJob } = useApp();
  if (!jobs.length) return null;
  return (
    <div className="border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl space-y-2 px-6 py-3">
        {jobs.map((job) => (
          <div key={job.key} className="glass flex items-center gap-3 px-4 py-2">
            <Link to={job.route} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="shrink-0 text-sm font-semibold">{TOOL_LABEL[job.tool] ?? "⚙️ Job"}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{job.title}</span>
              {job.status === "running" ? (
                <>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{job.stage}</span>
                  <div className="bar w-32 shrink-0"><div style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }} /></div>
                  <span className="shrink-0 text-sm font-bold">{Math.round(job.progress)}%</span>
                </>
              ) : job.status === "done" ? (
                <span className="shrink-0 text-sm font-semibold text-success">✓ Ready — click to view</span>
              ) : (
                <span className="shrink-0 text-sm font-semibold text-destructive">Failed — click to see</span>
              )}
            </Link>
            <button className="btn btn-ghost btn-sm shrink-0" onClick={() => removeJob(job.key)} aria-label="Dismiss job">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
