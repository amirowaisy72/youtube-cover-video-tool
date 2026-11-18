import { useEffect, useRef, useState } from "react";
import { characterList } from "@/lib/api";
import { encodeH264, StoryPlayer, type Timeline } from "@/lib/player";
import type { CharacterConfig } from "@/lib/stickman";

/**
 * Preview of the cartoon, drawn live in the browser with the real
 * voices/music, and the button that turns exactly this preview into
 * the final MP4 (encoded here in the browser, then joined with the
 * sound on the computer's backend).
 */
export function StoryPreview({ jobId, onDone, mode = "2d" }: { jobId: string; onDone: (videoUrl: string) => void; mode?: "2d" | "3d" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<StoryPlayer | null>(null);
  const rafRef = useRef(0);
  const [status, setStatus] = useState("Loading the preview…");
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [total, setTotal] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [cues, setCues] = useState<Timeline["cues"]>([]);
  // Music loudness (1 = default). Changing it mixes the sound again on the server.
  const [music, setMusic] = useState(1);
  const [audioV, setAudioV] = useState(() => Date.now());
  const [mixing, setMixing] = useState(false);
  const remix = async (level: number) => {
    setMixing(true);
    try {
      const res = await fetch(`/api/animator/jobs/${jobId}/remix`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ music_level: level }),
      });
      if (!res.ok) throw new Error("Could not change the music volume.");
      const a = audioRef.current;
      const at = a ? a.currentTime : 0;
      setAudioV(Date.now());
      setTimeout(() => { if (audioRef.current) audioRef.current.currentTime = at; }, 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMixing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tl, chars] = await Promise.all([
          fetch(`/api/animator/jobs/${jobId}/timeline`).then((r) => {
            if (!r.ok) throw new Error("Could not load the video timeline.");
            return r.json() as Promise<Timeline>;
          }),
          characterList(),
        ]);
        const configs = new Map(chars.map((c) => [c.id, c.config as unknown as CharacterConfig]));
        // 3D: a real 3D film from the same timeline (three.js is loaded only when needed)
        const Player = mode === "3d" ? (await import("@/lib/three3d/player3d")).StoryPlayer3D : StoryPlayer;
        const player = new Player(tl, configs, (i) => `/api/animator/jobs/${jobId}/background/${i}`);
        await player.prepare((msg) => !cancelled && setStatus(msg));
        if (cancelled) return;
        playerRef.current = player;
        setTotal(player.frameCount);
        setCues(tl.cues);
        const canvas = canvasRef.current!;
        canvas.width = player.W;
        canvas.height = player.H;
        player.drawFrame(canvas.getContext("2d")!, 0);
        setReady(true);
        setStatus("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview failed.");
      }
    })();
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current); };
  }, [jobId]);

  const draw = (n: number) => {
    const p = playerRef.current, c = canvasRef.current;
    if (!p || !c) return;
    p.drawFrame(c.getContext("2d")!, n);
    setFrame(n);
  };

  const loop = () => {
    const a = audioRef.current, p = playerRef.current;
    if (!a || !p) return;
    draw(Math.floor(a.currentTime * p.tl.fps));
    if (!a.paused && !a.ended) rafRef.current = requestAnimationFrame(loop);
    else setPlaying(false);
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !ready) return;
    if (a.paused) {
      void a.play().then(() => { setPlaying(true); rafRef.current = requestAnimationFrame(loop); });
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (n: number) => {
    const a = audioRef.current, p = playerRef.current;
    if (!a || !p) return;
    a.currentTime = n / p.tl.fps;
    draw(n);
  };

  const render = async () => {
    const p = playerRef.current;
    if (!p || rendering) return;
    audioRef.current?.pause();
    setRendering(true);
    setError("");
    try {
      const started = performance.now();
      const blob = await encodeH264(p, (done, all) => {
        const secs = (performance.now() - started) / 1000;
        const left = done > 10 ? (secs / done) * (all - done) : 0;
        setStatus(`Rendering the final video… ${Math.round((done / all) * 100)}%${left ? ` · ~${Math.ceil(left)} s left` : ""} — keep this tab open`);
      });
      setStatus("Joining picture and sound…");
      const form = new FormData();
      form.append("file", blob, "video.h264");
      const res = await fetch(`/api/animator/jobs/${jobId}/video-upload`, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { video_url?: string; detail?: string };
      if (!res.ok || !data.video_url) throw new Error(data.detail || "Could not save the video.");
      setStatus("");
      onDone(data.video_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render failed.");
      setStatus("");
    } finally {
      setRendering(false);
    }
  };

  const fps = playerRef.current?.tl.fps ?? 24;
  const fmt = (n: number) => `${Math.floor(n / fps / 60)}:${String(Math.floor((n / fps) % 60)).padStart(2, "0")}`;
  const duration = total / fps;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border bg-black">
        <canvas ref={canvasRef} className="mx-auto block max-h-[70vh] w-full object-contain" style={{ aspectRatio: playerRef.current ? `${playerRef.current.W} / ${playerRef.current.H}` : "16 / 9" }} />
      </div>
      <audio ref={audioRef} src={`/api/animator/jobs/${jobId}/audio?v=${audioV}`} preload="auto" onEnded={() => setPlaying(false)} />
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ready && (
        <>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary h-11 w-11 rounded-full p-0" onClick={toggle} disabled={rendering}>{playing ? "❚❚" : "▶"}</button>
            <input type="range" min={0} max={Math.max(0, total - 1)} value={frame} className="flex-1"
              onChange={(e) => seek(Number(e.target.value))} disabled={rendering} />
            <span className="chip">{fmt(frame)} / {fmt(total)}</span>
          </div>
          {/* Timeline: one block per spoken part — click to jump there. */}
          <div className="relative h-10 rounded-lg bg-secondary">
            {cues.map((c, i) => (
              <button key={i} title={c.text}
                className="absolute top-1 h-8 overflow-hidden rounded bg-primary/60 px-1 text-left text-[10px] leading-8 text-white hover:bg-primary"
                style={{ left: `${(c.start / duration) * 100}%`, width: `${Math.max(0.6, ((c.end - c.start) / duration) * 100)}%` }}
                onClick={() => seek(Math.round(c.start * fps))}>
                {c.text}
              </button>
            ))}
            <div className="pointer-events-none absolute top-0 h-10 w-0.5 bg-amber" style={{ left: `${(frame / Math.max(1, total)) * 100}%` }} />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0">🎵 Music volume</span>
            <input type="range" min={0} max={2} step={0.1} value={music} className="flex-1" disabled={rendering || mixing}
              onChange={(e) => setMusic(Number(e.target.value))}
              onMouseUp={() => void remix(music)} onTouchEnd={() => void remix(music)} onKeyUp={() => void remix(music)} />
            <span className="chip w-16 justify-center">{mixing ? "…" : `${Math.round(music * 100)}%`}</span>
          </label>
          <button className="btn btn-amber w-full py-4 text-lg" onClick={() => void render()} disabled={rendering}>
            {rendering ? "Rendering…" : "🎬 Render final video"}
          </button>
        </>
      )}
    </div>
  );
}
