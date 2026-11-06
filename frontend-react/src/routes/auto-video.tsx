import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, autovideoCreate, autovideoJob, type AvJob, type AvScene } from "@/lib/api";
import s1 from "@/assets/scene-1.jpg";
import s2 from "@/assets/scene-2.jpg";
import s3 from "@/assets/scene-3.jpg";

export const Route = createFileRoute("/auto-video")({
  component: AutoVideo,
});

const STAGES = ["Script", "Voiceover", "Video clip", "Captions"] as const;
const imgs = [s1, s2, s3];
const lines = [
  "Did you know the universe is still expanding right now?",
  "Cities of the future may glow brighter than the stars.",
  "Ancient builders aligned their monuments with the sky.",
  "Some mountains are still growing every single year.",
  "Light from distant stars is older than our planet.",
  "Rain in neon cities paints the streets with color.",
  "Deserts hide secrets that are thousands of years old.",
  "Nature's golden hour lasts only a few minutes.",
];

/** Backend stage text -> which of the 4 build stages is current. */
function stageIndex(job: AvJob | null): number {
  const s = (job?.stage || "").toLowerCase();
  if (s.includes("script") || s.includes("building scenes")) return 0;
  if (s.includes("voiceover")) return 1;
  if (s.includes("visual")) return 2;
  if (s.includes("assembl")) return 3;
  if (job?.status === "done") return 4;
  const p = job?.progress ?? 0;
  return p < 25 ? 0 : p < 50 ? 1 : p < 75 ? 2 : 3;
}

function AutoVideo() {
  const [title, setTitle] = useState("10 Mind-Blowing Facts About Our World");
  const [dur, setDur] = useState(2);
  const [phase, setPhase] = useState<"form" | "build" | "done">("form");
  const [job, setJob] = useState<AvJob | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const sceneCount = job?.scenes?.length || dur * 3;
  const pct = job?.progress ?? 0;
  const current = Math.min(sceneCount - 1, Math.floor((pct / 100) * sceneCount));
  const stageIdx = stageIndex(job);
  const caption = job?.scenes?.[current]?.caption || job?.scenes?.[current]?.narration || lines[current % lines.length];

  const start = async () => {
    if (!title.trim()) return;
    setError("");
    setJob(null);
    setPhase("build");
    try {
      const data = await autovideoCreate(title.trim(), dur, "en-US-AriaNeural");
      setJobId(data.job_id);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(async () => {
        try {
          const j = await autovideoJob(data.job_id);
          setJob(j);
          if (j.status === "done") {
            if (timer.current) clearInterval(timer.current);
            setPhase("done");
          } else if (j.status === "failed") {
            if (timer.current) clearInterval(timer.current);
            setPhase("form");
            setError("Failed: " + (j.error || "Unknown error."));
          }
        } catch {
          /* Keep polling on a transient error. */
        }
      }, 3000);
    } catch (e) {
      setPhase("form");
      setError(
        e instanceof ApiError && e.status === 402
          ? "Not enough credits — activate a license key or top up."
          : "Failed: " + (e instanceof Error ? e.message : "Could not start the video."),
      );
    }
  };

  return (
    <div>
      <PageHeader icon="🎬" title="Auto Video from Title" sub="One title in, one finished video out." />

      {phase === "form" && (
        <div className="glass mx-auto max-w-2xl space-y-6 p-8">
          <div>
            <label className="mb-2 block font-semibold">Video title</label>
            <input className="field text-lg" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 5 Secrets of the Ocean" />
          </div>
          <div>
            <label className="mb-2 block font-semibold">Length</label>
            <div className="seg">
              {[1, 2, 3, 5].map((d) => <button key={d} data-on={dur === d} onClick={() => setDur(d)}>{d} min</button>)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">About {dur * 3} scenes · 1 credit</p>
          </div>
          <button className="btn btn-primary w-full py-4 text-lg" disabled={!title.trim()} onClick={() => void start()}>🚀 Build my video</button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {phase === "build" && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="glass p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-bold">Building scene {current + 1} of {sceneCount}</h3>
              <span className="font-display text-3xl font-bold text-gradient">{Math.round(pct)}%</span>
            </div>
            <div className="bar mb-5"><div style={{ width: `${pct}%` }} /></div>
            <p className="mb-4 text-sm text-muted-foreground">{job?.stage || "Starting…"}</p>
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <img src={imgs[current % 3]} alt="" className="h-full w-full object-cover animate-kenburns" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background p-5">
                <p className="text-lg font-semibold">{stageIdx >= 3 ? caption : "…"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {STAGES.map((s, i) => {
                const state = i < stageIdx ? "done" : i === stageIdx ? "now" : "wait";
                return (
                  <div key={s} className={`rounded-xl border p-3 text-center text-sm ${state === "now" ? "border-primary bg-accent" : "border-border"}`}>
                    <div className={state === "now" ? "animate-pulseglow" : ""}>{state === "done" ? "✓" : state === "now" ? "●" : "○"}</div>
                    {s}
                  </div>
                );
              })}
            </div>
          </div>
          <SceneList count={sceneCount} current={current} scenes={job?.scenes} done={false} />
        </div>
      )}

      {phase === "done" && job && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="glass p-6">
            <span className="chip mb-3 text-success">✓ Your video is ready</span>
            <h3 className="mb-4 text-2xl font-bold">{title}</h3>
            {job.download_url ? (
              <video src={job.download_url} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black" />
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-xl">
                <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Finished in about {job.final_minutes ?? dur} minutes · Script: {job.script_words ?? "?"} words ({job.script_source ?? ""}) · Images used: {job.images_used ?? "?"}, Clips used: {job.clips_used ?? "?"} (found: {job.images_found ?? "?"} images, {job.clips_found ?? "?"} clips)
              {job.ai_images ? ` · AI images: ${job.ai_images}` : ""}{job.title_cards ? ` · Title cards: ${job.title_cards}` : ""} · Voice: {job.voice_engine || ""}
              {job.visual_warning ? ` · ${job.visual_warning}` : ""}
            </p>
            {job.script && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Script</summary>
                <p className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">{job.script}</p>
              </details>
            )}
            <div className="mt-5 flex gap-3">
              {job.download_url && (
                <a className="btn btn-amber flex-1" href={job.download_url} download={`autovideo-${jobId ?? "video"}.mp4`}>⬇ Download MP4</a>
              )}
              <button className="btn btn-ghost" onClick={() => { setPhase("form"); setJob(null); }}>Make another</button>
            </div>
          </div>
          <SceneList count={sceneCount} current={-1} scenes={job.scenes} done />
        </div>
      )}
    </div>
  );
}

function SceneList({ count, current, scenes, done }: { count: number; current: number; scenes?: AvScene[] | undefined; done: boolean }) {
  return (
    <div className="glass max-h-[640px] overflow-auto p-4">
      <h3 className="mb-3 px-2 font-semibold">Scenes</h3>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => {
          const s = scenes?.[i];
          const isDone = done || i < current;
          const active = !done && i === current;
          const line = s?.caption || s?.narration || lines[i % lines.length];
          return (
            <div key={i} className={`flex items-center gap-3 rounded-xl p-2 ${active ? "bg-accent" : ""}`}>
              <img src={imgs[i % 3]} alt="" className={`h-12 w-20 rounded-lg object-cover ${isDone || active ? "" : "opacity-30 grayscale"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Scene {i + 1}{s?.kind ? ` · ${s.kind}` : ""}{s?.duration_sec ? ` · ${s.duration_sec}s` : ""}</div>
                <div className="truncate text-xs text-muted-foreground">{line}</div>
              </div>
              <span className="text-sm">{isDone ? "✓" : active ? "⏳" : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
