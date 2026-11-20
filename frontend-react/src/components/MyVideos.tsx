import { useEffect, useState } from "react";

/** My videos + the queue (user, 2026-11-19): every video can be opened again (a
 * "New video" click never loses one), several scripts wait their turn, and the
 * finished ones can be filmed one after another by themselves. */
export type JobRow = {
  id: string; title: string; status: string; progress?: number; message?: string;
  format?: string; mode?: string; created_at?: string; video_url?: string;
};

const LABEL: Record<string, [string, string]> = {
  waiting: ["⏸ In the queue", "text-sky-300"],
  queued: ["⏳ Starting", "text-amber-300"],
  writing: ["✍ Writing", "text-amber-300"],
  voicing: ["🎙 Voices", "text-amber-300"],
  backgrounds: ["🖼 Places", "text-amber-300"],
  script_ready: ["📝 Script to check", "text-sky-300"],
  ready: ["🎬 Ready to film", "text-violet-300"],
  rendering: ["🎬 Filming", "text-amber-300"],
  done: ["✓ Done", "text-emerald-300"],
  error: ["✗ Stopped", "text-rose-300"],
};

export function useJobList(open: boolean): [JobRow[], () => void] {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const load = () => {
    fetch("/api/animator/jobs").then((r) => r.json()).then((d: { jobs?: JobRow[] }) => setJobs(d.jobs ?? [])).catch(() => undefined);
  };
  useEffect(() => {
    load();
    if (!open) return;
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [open]);
  return [jobs, load];
}

export function MyVideos({ jobs, current, onOpen, onRefresh, autoRender, setAutoRender }: {
  jobs: JobRow[]; current: string; onOpen: (j: JobRow) => void; onRefresh: () => void;
  autoRender: boolean; setAutoRender: (v: boolean) => void;
}) {
  const [show, setShow] = useState(false);
  const waiting = jobs.filter((j) => j.status === "waiting").length;
  const ready = jobs.filter((j) => j.status === "ready").length;
  const unqueue = async (id: string) => {
    await fetch(`/api/animator/jobs/${id}/unqueue`, { method: "POST" }).catch(() => undefined);
    onRefresh();
  };
  return (
    <div className="glass mb-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className="font-semibold" onClick={() => setShow((v) => !v)}>📂 My videos ({jobs.length}) {show ? "▲" : "▼"}</button>
        {waiting > 0 && <span className="chip text-sky-300">⏸ {waiting} in the queue</span>}
        {ready > 0 && <span className="chip text-violet-300">🎬 {ready} ready to film</span>}
        <label className="ml-auto flex items-center gap-2 text-sm" title="Keep this tab open: finished videos are filmed one after another">
          <input type="checkbox" checked={autoRender} onChange={(e) => setAutoRender(e.target.checked)} />
          Film finished videos by themselves (keep this tab open)
        </label>
      </div>
      {show && (
        <div className="mt-3 max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {jobs.length === 0 && <p className="p-3 text-sm text-muted-foreground">No videos yet.</p>}
          {jobs.map((j) => {
            const [lbl, col] = LABEL[j.status] ?? [j.status, "text-muted-foreground"];
            return (
              <div key={j.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${j.id === current ? "bg-primary/10" : ""}`}>
                <span className={`w-36 shrink-0 font-medium ${col}`}>{lbl}{["writing", "voicing", "backgrounds"].includes(j.status) && j.progress ? ` ${j.progress}%` : ""}</span>
                <span className="min-w-0 flex-1 truncate">{j.title}</span>
                <span className="text-xs text-muted-foreground">{(j.mode ?? "").toUpperCase()} {j.format === "reel" ? "· reel" : ""} · {(j.created_at ?? "").replace("T", " ").slice(5, 16)}</span>
                {j.status === "waiting" && <button className="btn btn-ghost btn-sm" onClick={() => void unqueue(j.id)}>Remove from queue</button>}
                {j.id !== current && <button className="btn btn-secondary btn-sm" onClick={() => onOpen(j)}>Open</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
