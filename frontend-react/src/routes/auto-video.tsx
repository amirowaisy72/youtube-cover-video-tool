import { createFileRoute } from "@tanstack/react-router";
// Note (2026-11-07): this route's chunk hash is content-based;
// a comment-only edit does not change the built bundle.
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { useApp } from "@/lib/app-store";
import { ApiError, autovideoCreate, autovideoJob, type AvJob, type AvScene, validateStockKey } from "@/lib/api";
import { getPexelsKey, getPixabayKey, setPexelsKey, setPixabayKey } from "@/lib/keys";
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

/** Backend stage text -> which of the 4 build stages is current.
    The master pipeline reports per-scene progress ("Building
    scene X of Y…"), which is the video-clip stage, and "Joining
    scenes…" is the final assembly. */
function stageIndex(job: AvJob | null): number {
  const s = (job?.stage || "").toLowerCase();
  if (s.includes("building scene")) return 2;
  if (s.includes("joining")) return 3;
  if (s.includes("script")) return 0;
  if (s.includes("voiceover")) return 1;
  if (s.includes("visual")) return 2;
  if (s.includes("assembl")) return 3;
  if (job?.status === "done") return 4;
  const p = job?.progress ?? 0;
  return p < 25 ? 0 : p < 50 ? 1 : p < 75 ? 2 : 3;
}

function AutoVideo() {
  const { jobs, registerJob, updateJob, removeJob } = useApp();
  const [title, setTitle] = useState("10 Mind-Blowing Facts About Our World");
  const [dur, setDur] = useState(2);
  const [durInput, setDurInput] = useState("2");
  const [subtitles, setSubtitles] = useState(true);
  // Mood music + transitions (2026-11-08): a mood-matched
  // background track (needs the Pixabay key below) and a
  // different transition style + sound at every scene change.
  const [music, setMusic] = useState(true);
  const [transitions, setTransitions] = useState(true);
  // Stock-media keys (Pexels / Pixabay, free): shared with the
  // Stock and Music tools via localStorage — entering one here
  // connects it everywhere, and vice versa. Empty = Commons only.
  const [pexelsKey, setPexelsKeyState] = useState("");
  const [pixabayKey, setPixabayKeyState] = useState("");
  // Key validation (user, 2026-11-08): a wrong key must be
  // caught here, not weeks later when videos silently miss
  // the stock footage and fall back to Commons.
  const [keyTest, setKeyTest] = useState<string | null>(null);
  const [keyTesting, setKeyTesting] = useState(false);

  const testKeys = async () => {
    setKeyTesting(true);
    setKeyTest(null);
    const parts: string[] = [];
    for (const [label, source, key] of [["Pexels", "pexels", pexelsKey], ["Pixabay", "pixabay", pixabayKey]] as const) {
      if (!key.trim()) { parts.push(`${label}: — (no key)`); continue; }
      try {
        const res = await validateStockKey(source, key.trim());
        if (res.valid) parts.push(`${label}: ✓ valid`);
        else if (res.reason === "invalid") parts.push(`${label}: ✗ invalid — wrong or revoked key`);
        else parts.push(`${label}: ⚠ could not verify right now`);
      } catch {
        parts.push(`${label}: ⚠ could not verify right now`);
      }
    }
    setKeyTest(parts.join(" · "));
    setKeyTesting(false);
  };
  const [phase, setPhase] = useState<"form" | "build" | "done">("form");
  const [job, setJob] = useState<AvJob | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobKey = useRef<string | null>(null);

  const poll = (id: string) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const j = await autovideoJob(id);
        setJob(j);
        if (jobKey.current) {
          updateJob(jobKey.current, {
            progress: j.progress ?? 0,
            stage: j.stage || "",
            status: j.status === "done" ? "done" : j.status === "failed" ? "failed" : "running",
          });
        }
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
  };

  // Load the shared stock-media keys (entered here, in the
  // Stock tool or in the Music tool — one key works everywhere).
  useEffect(() => {
    setPexelsKeyState(getPexelsKey());
    setPixabayKeyState(getPixabayKey());
  }, []);

  // Restore a job that was started earlier and is still in the
  // background store (user left the page and came back via the
  // top progress bar, or refreshed). The backend job kept
  // running the whole time.
  useEffect(() => {
    const active = jobs.find((j) => j.tool === "auto-video" && j.status === "running");
    const finished = jobs.find((j) => j.tool === "auto-video" && j.status === "done");
    const found = active ?? finished;
    if (!found || jobId) return;
    jobKey.current = found.key;
    setJobId(found.jobId);
    void autovideoJob(found.jobId).then((j) => {
      setJob(j);
      if (j.status === "done") setPhase("done");
      else if (j.status === "failed") { setPhase("form"); setError("Failed: " + (j.error || "Unknown error.")); }
      else { setPhase("build"); poll(found.jobId); }
    }).catch(() => { /* Job gone (server restarted): stay on the form. */ });
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const data = await autovideoCreate(title.trim(), dur, "en-US-AriaNeural", subtitles, pexelsKey, pixabayKey, music, transitions);
      setJobId(data.job_id);
      // Background job: the build keeps running if the user
      // leaves this page, and the top bar shows its progress.
      const key = `autovideo:${data.job_id}`;
      jobKey.current = key;
      registerJob({ key, tool: "auto-video", title: title.trim(), route: "/auto-video", jobId: data.job_id });
      poll(data.job_id);
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
    <div data-tool="auto-video">
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
              {[1, 2, 3, 5].map((d) => <button key={d} data-on={dur === d} onClick={() => { setDur(d); setDurInput(String(d)); }}>{d} min</button>)}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-muted-foreground" htmlFor="av-custom-min">Custom:</label>
              <input
                id="av-custom-min"
                className="field w-20 text-center"
                type="number" min={1} max={30} step={1}
                value={durInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setDurInput(v);
                  const n = parseInt(v, 10);
                  if (Number.isFinite(n)) setDur(Math.min(30, Math.max(1, n)));
                }}
                onBlur={() => setDurInput(String(dur))}
                aria-label="Custom length in minutes"
              />
              <span className="text-sm text-muted-foreground">minutes (1–30)</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">About {dur * 3} scenes · 1 credit · longer videos take longer to build, scene by scene</p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} />
            <span>
              <span className="block font-semibold">💬 Live captions (subtitles)</span>
              <span className="block text-sm text-muted-foreground">Words appear at the bottom as the voice speaks them, YouTube-caption style. Off shows one caption per scene instead.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={music} onChange={(e) => setMusic(e.target.checked)} />
            <span>
              <span className="block font-semibold">🎵 Background music by mood</span>
              <span className="block text-sm text-muted-foreground">A royalty-free track that fits the script's mood (suspense, happy, motivational…) plays softly under the voice. Needs your Pixabay key below — without it, the video has no music.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={transitions} onChange={(e) => setTransitions(e.target.checked)} />
            <span>
              <span className="block font-semibold">✨ Transitions + sounds</span>
              <span className="block text-sm text-muted-foreground">A different transition style (fade, wipe, slide, circle…) and a different sound effect at every scene change, so the video never repeats the same look or sound. Sounds need your Pixabay key below.</span>
            </span>
          </label>
          <div className="rounded-xl border border-border px-4 py-3">
            <div className="font-semibold">🎞️ Richer stock footage (optional)</div>
            <p className="mt-1 text-sm text-muted-foreground">Add your free Pexels / Pixabay API keys and the video uses their professional clips first (Commons is the fallback). A key entered here works in the Stock and Music tools too — never enter it twice.</p>
            <div className="mt-3 space-y-2">
              <input
                className="field"
                type="password"
                autoComplete="off"
                placeholder="Pexels API key (optional)"
                value={pexelsKey}
                onChange={(e) => { setPexelsKeyState(e.target.value); setPexelsKey(e.target.value); }}
              />
              <input
                className="field"
                type="password"
                autoComplete="off"
                placeholder="Pixabay API key (optional)"
                value={pixabayKey}
                onChange={(e) => { setPixabayKeyState(e.target.value); setPixabayKey(e.target.value); }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Free keys: pexels.com/api · pixabay.com/api/docs — stored only in this browser.</p>
            <div className="mt-3 flex items-center gap-3">
              <button type="button" className="btn btn-ghost btn-sm" disabled={keyTesting || (!pexelsKey.trim() && !pixabayKey.trim())} onClick={() => void testKeys()}>
                {keyTesting ? "Testing…" : "🔑 Test my keys"}
              </button>
              {keyTest && <span className="text-sm text-muted-foreground">{keyTest}</span>}
            </div>
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
            {/* Mood music + transitions status (2026-11-08): what
                actually got added, so a missing track is never
                silent. "Key rejected" means the Pixabay key is
                wrong — press "Test my keys" below to check it. */}
            {(job.mood || job.music_status || job.sfx_status || job.join) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {job.mood ? `Mood: ${job.mood} · ` : ""}
                Music: {job.music_status === "ok" ? "✓ added" : job.music_status === "no_key" ? "✗ no Pixabay key" : job.music_status === "key_rejected" ? "✗ Pixabay key rejected — press “Test my keys” below" : job.music_status === "no_results" ? "✗ no matching track found" : "off"}
                {" · "}Sounds: {job.sfx_status === "ok" ? `✓ ${job.transition_sfx ?? 0} different sounds` : job.sfx_status === "no_key" ? "✗ no Pixabay key" : job.sfx_status === "key_rejected" ? "✗ Pixabay key rejected — press “Test my keys” below" : job.sfx_status === "no_results" ? "✗ no sounds found" : "off"}
                {" · "}Transitions: {job.join === "xfade" ? "✓ applied (different style each scene)" : "✗ not applied (fell back to plain join)"}
              </p>
            )}
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
              <button className="btn btn-ghost" onClick={() => { if (jobKey.current) removeJob(jobKey.current); jobKey.current = null; setJobId(null); setPhase("form"); setJob(null); }}>Make another</button>
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
