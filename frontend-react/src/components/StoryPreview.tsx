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
type Pending = { id: string; time: number; scene: number; line: number; said: string; instruction: string; told: string[] };

export function StoryPreview({ jobId, onDone, mode = "2d", autoRender = false, onRebuild }: { jobId: string; onDone: (videoUrl: string) => void; mode?: "2d" | "3d"; autoRender?: boolean; onRebuild?: () => void }) {
  // (user, 2026-11-20) pause → "Want to fix this part?" → explain → copy prompt → paste the AI's answer → marked;
  // "Fix all the modified parts" changes them all at once (only changed lines get new voices).
  const [pending, setPending] = useState<Pending[]>([]);
  const [fixAt, setFixAt] = useState<number | null>(null);
  const [fixBusy, setFixBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/animator/jobs/${jobId}/fix/pending`).then((r) => r.json()).then((d: { pending?: Pending[] }) => setPending(d.pending || [])).catch(() => undefined);
  }, [jobId]);
  const unmark = async (id: string) => {
    const r = await fetch(`/api/animator/jobs/${jobId}/fix/pending/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) setPending(((await r.json()) as { pending: Pending[] }).pending || []);
  };
  const fixAll = async () => {
    setFixBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/animator/jobs/${jobId}/fix/apply-all`, { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { detail?: string };
      if (!r.ok) throw new Error(d.detail || "Could not fix the parts.");
      setPending([]);
      onRebuild?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not fix the parts."); }
    setFixBusy(false);
  };
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

  // the queue: films by itself once the preview is ready
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoRender && ready && !rendering && !autoStarted.current) { autoStarted.current = true; void render(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRender, ready]);

  const [fastFilm, setFastFilm] = useState(() => { try { return localStorage.getItem("ytguru-fast-film") === "1"; } catch { return false; } });
  const setFast = (v: boolean) => { setFastFilm(v); try { localStorage.setItem("ytguru-fast-film", v ? "1" : "0"); } catch { /* private mode */ } };

  const render = async () => {
    const p = playerRef.current;
    if (!p || rendering) return;
    (p as unknown as { setFilmScale?: (k: number) => void }).setFilmScale?.(fastFilm && mode === "3d" ? 0.75 : 1);
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
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        {ready && !playing && !rendering && (
          <button className="absolute right-3 top-3 z-10 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black shadow-lg hover:bg-amber-300"
            onClick={() => setFixAt(frame / fps)}>❓ Want to fix this part?</button>
        )}
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
            {cues.map((c, i) => {
              const ln = (c as { line?: number[] }).line;
              const marked = !!ln && pending.some((p) => p.scene === ln[0] && p.line === ln[1]);
              return (
              <button key={i} title={c.text}
                className={`absolute top-1 h-8 overflow-hidden rounded px-1 text-left text-[10px] leading-8 hover:bg-primary ${marked ? "bg-amber-500 text-black" : "bg-primary/60 text-white"}`}
                style={{ left: `${(c.start / duration) * 100}%`, width: `${Math.max(0.6, ((c.end - c.start) / duration) * 100)}%` }}
                onClick={() => seek(Math.round(c.start * fps))}>
                {c.text}
              </button>
              );
            })}
            <div className="pointer-events-none absolute top-0 h-10 w-0.5 bg-amber" style={{ left: `${(frame / Math.max(1, total)) * 100}%` }} />
          </div>
          {pending.length > 0 && (
            <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
              <p className="font-semibold">🟠 {pending.length} part{pending.length === 1 ? "" : "s"} ready to fix:</p>
              <ul className="mt-1 space-y-1 text-xs">
                {pending.map((p) => (
                  <li key={p.id} className="flex items-start gap-2">
                    <button className="underline" onClick={() => seek(Math.round(p.time * fps))}>{fmt(Math.round(p.time * fps))}</button>
                    <span className="flex-1">{p.instruction} — <span className="text-muted-foreground">{p.told.join(" · ")}</span></span>
                    <button className="text-rose-300" title="Forget this fix" onClick={() => void unmark(p.id)}>✕</button>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary mt-2 w-full" disabled={fixBusy || rendering} onClick={() => void fixAll()}>{fixBusy ? "Starting…" : "🔧 Fix all the modified parts"}</button>
              <p className="mt-1 text-xs text-muted-foreground">The video is made again with these changes — only the changed lines get new voices. Then you get a new preview.</p>
            </div>
          )}
          <label className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0">🎵 Music volume</span>
            <input type="range" min={0} max={2} step={0.1} value={music} className="flex-1" disabled={rendering || mixing}
              onChange={(e) => setMusic(Number(e.target.value))}
              onMouseUp={() => void remix(music)} onTouchEnd={() => void remix(music)} onKeyUp={() => void remix(music)} />
            <span className="chip w-16 justify-center">{mixing ? "…" : `${Math.round(music * 100)}%`}</span>
          </label>
          {mode === "3d" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground" title="The 3D picture is drawn at 75% size and scaled up: about 1.7x faster on a weak graphics card, a slightly softer picture">
              <input type="checkbox" checked={fastFilm} disabled={rendering} onChange={(e) => setFast(e.target.checked)} />
              ⚡ Faster filming (about 1.7x faster, slightly softer picture)
            </label>
          )}
          <button className="btn btn-amber w-full py-4 text-lg" onClick={() => void render()} disabled={rendering}>
            {rendering ? "Rendering…" : "🎬 Render final video"}
          </button>
        </>
      )}
      {fixAt !== null && (
        <FixPartModal jobId={jobId} time={fixAt} said={cues.filter((c) => c.start - 0.4 <= fixAt).slice(-1)[0]?.text || ""}
          onClose={() => setFixAt(null)} onSaved={(p) => { setPending(p); setFixAt(null); }} />
      )}
    </div>
  );
}

function FixPartModal({ jobId, time, said, onClose, onSaved }: { jobId: string; time: number; said: string; onClose: () => void; onSaved: (p: Pending[]) => void }) {
  const [instruction, setInstruction] = useState("");
  const [answer, setAnswer] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const copy = async () => {
    setErr("");
    try {
      const r = await fetch(`/api/animator/jobs/${jobId}/fix/prompt`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, time }) });
      const d = (await r.json()) as { prompt?: string; detail?: string };
      if (!r.ok || !d.prompt) throw new Error(d.detail || "Could not make the prompt.");
      await navigator.clipboard.writeText(d.prompt);
      setCopied(true);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not copy"); }
  };
  const save = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/animator/jobs/${jobId}/fix/mark`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, time, answer }) });
      const d = (await r.json()) as { pending?: Pending[]; detail?: string };
      if (!r.ok) throw new Error(d.detail || "Could not save.");
      onSaved(d.pending || []);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-xl space-y-3 rounded-2xl border border-border bg-background p-5 text-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <b className="text-base">🔧 Fix this part — at {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, "0")}</b>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {said && <p className="text-muted-foreground">The line here: “{said}”</p>}
        <div>
          <p className="mb-1 font-semibold">1 · Explain how you want to fix this part <span className="font-normal text-muted-foreground">(Urdu or English)</span></p>
          <textarea className="field h-24 w-full" value={instruction} onChange={(e) => { setInstruction(e.target.value); setCopied(false); }}
            placeholder="e.g. yahan Teddy gir jaye aur Peddy hanse / make Sara run away here" />
        </div>
        <button className="btn btn-secondary w-full" disabled={instruction.trim().length < 2} onClick={() => void copy()}>{copied ? "✓ Prompt copied — paste it into your AI" : "📋 2 · Copy prompt"}</button>
        <div>
          <p className="mb-1 font-semibold">3 · Paste the AI's answer</p>
          <textarea className="field h-36 w-full font-mono text-xs" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={'{"summary": "...", "changes": [ ... ]}'} />
        </div>
        <button className="btn btn-primary w-full" disabled={busy || answer.trim().length < 2 || instruction.trim().length < 2} onClick={() => void save()}>{busy ? "Checking…" : "💾 Save — mark this part to fix"}</button>
        {err && <p className="text-rose-300">{err}</p>}
        <p className="text-xs text-muted-foreground">Mark as many parts as you like, then press “Fix all the modified parts” under the player.</p>
      </div>
    </div>
  );
}
