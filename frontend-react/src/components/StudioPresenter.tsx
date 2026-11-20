import { useEffect, useRef, useState } from "react";
import { characterList } from "@/lib/api";
import { encodeH264, type Timeline } from "@/lib/player";
import type { CharacterConfig } from "@/lib/stickman";

/**
 * Studio presenter for Auto Video (user, 2026-11-18): "sometimes the studio
 * look with the character speaking, sometimes stock footage". Your own
 * character (Characters page) stands in a 3D TV studio, lip-synced to the
 * scene's voiceover, with presenter gestures. This browser films those
 * scenes and sends them to the app; the render then uses them like any
 * other footage (captions, pop-ups, music).
 * (user, 2026-11-21) no auto-pick: the user picks the scene in the preview
 * ("Want to replace this scene with studio?") — this films just that one.
 */
type Char = { id: string; name: string; config: unknown };

/** Can this browser make 3D pictures right now? */
function webglOk(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch { return false; }
}

export function StudioPresenter({ jobId, presenter, onPresenterChange, filmRequest, onFilmRequestDone, onBusy }: {
  jobId: string; presenter: string; onPresenterChange: (id: string) => void;
  filmRequest: number | null; onFilmRequestDone: () => void; onBusy?: (busy: boolean) => void;
}) {
  const [chars, setChars] = useState<Char[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<number[]>([]);
  const handledRef = useRef<number | null>(null);

  useEffect(() => {
    characterList()
      .then((l) => setChars((l || []) as unknown as Char[]))
      .catch(() => setError("Could not load your characters."));
  }, []);

  // (user, 2026-11-21) the preview asks for one scene at a time — film
  // just that scene. A request that arrives twice (a re-render while the
  // parent still holds it) must film only once, so handledRef remembers
  // the scene already started.
  useEffect(() => {
    if (filmRequest == null) { handledRef.current = null; return; }
    if (handledRef.current === filmRequest || busy) return;
    handledRef.current = filmRequest;
    if (!presenter) {
      setError("Choose a presenter first (Teddy or Peddy) — then press the button on the scene again.");
      onFilmRequestDone();
      return;
    }
    void film([filmRequest]).finally(() => onFilmRequestDone());
  }, [filmRequest, presenter, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const film = async (list: number[]) => {
    const ch = chars.find((c) => c.id === presenter);
    if (!ch) return;
    if (!webglOk()) {
      setError("Chrome's 3D is switched off right now — this happens after a 3D crash (it is not this page). Close ALL Chrome windows, open Chrome again, come back to this video (it is saved) and press Film again.");
      return;
    }
    setBusy(true);
    onBusy?.(true);
    setError("");
    const made: number[] = [];
    try {
      const { StoryPlayer3D } = await import("@/lib/three3d/player3d");
      const configs = new Map<string, CharacterConfig>([[ch.id, ch.config as CharacterConfig]]);
      for (const [k, i] of list.entries()) {
        setStatus(`Studio scene ${k + 1} of ${list.length}: setting up…`);
        const r = await fetch(`/api/animator/studio/${jobId}/timeline?scene=${i}&character=${encodeURIComponent(ch.id)}&variant=${k}`);
        if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { detail?: string }).detail || "Could not plan the studio scene.");
        const tl = (await r.json()) as Timeline;
        const player = new StoryPlayer3D(tl, configs, () => "");
        let blob: Blob;
        try {
          await player.prepare((m) => setStatus(`Studio scene ${k + 1} of ${list.length}: ${m}`));
          blob = await encodeH264(player, (d, t) => setStatus(`Studio scene ${k + 1} of ${list.length}: filming… ${Math.round((d / Math.max(1, t)) * 100)}%`));
        } finally {
          player.dispose(); // one 3D context at a time (the browser allows only a few)
        }
        const form = new FormData();
        form.append("file", blob, "studio.h264");
        form.append("fps", String(tl.fps));
        const up = await fetch(`/api/animator/studio/${jobId}/scene/${i}`, { method: "POST", body: form });
        if (!up.ok) throw new Error(((await up.json().catch(() => ({}))) as { detail?: string }).detail || "Could not save the studio scene.");
        made.push(i);
        setDone([...made]);
      }
      setStatus(`✓ ${made.length} studio scene${made.length === 1 ? "" : "s"} ready — they will be in the video. Rebuild the preview to see ${made.length === 1 ? "it" : "them"} there.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Studio filming failed.";
      setError(/webgl/i.test(msg)
        ? "The browser refused to make 3D (WebGL). Close other 3D tabs (like the Animator preview), refresh this page and press Film again. If it still fails: Chrome Settings → System → turn on \"Use graphics acceleration when available\"."
        : msg);
      setStatus("");
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };

  return (
    <div className="glass p-6">
      <h3 className="text-xl font-bold">🎙 Studio presenter <span className="text-sm font-normal text-muted-foreground">(optional)</span></h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Your character presents the scenes you choose from a TV studio — lip-synced to the voiceover, with gestures — and the other scenes show stock footage.
        Make or change characters on the Characters page.
      </p>
      {chars.length === 0 && !error && <p className="mt-3 text-sm text-muted-foreground">No characters yet — make one on the Characters page first.</p>}
      {chars.length > 0 && (
        <>
          <p className="mt-4 mb-1 text-sm font-semibold">Presenter</p>
          <div className="flex flex-wrap gap-2">
            <button className={`btn btn-sm ${presenter === "" ? "btn-primary" : "btn-ghost"}`} onClick={() => onPresenterChange("")} disabled={busy}>No presenter</button>
            {chars.map((c) => (
              <button key={c.id} className={`btn btn-sm ${presenter === c.id ? "btn-primary" : "btn-ghost"}`} onClick={() => onPresenterChange(c.id)} disabled={busy}>{c.name}</button>
            ))}
          </div>
        </>
      )}
      {presenter && done.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Studio scenes ready: <b>{done.map((i) => `scene ${i + 1}`).join(", ")}</b> — they will be in the video.
        </p>
      )}
      {presenter && done.length === 0 && !busy && (
        <p className="mt-3 text-xs text-muted-foreground">Pause the preview on any scene and press “Want to replace this scene with studio?” — that scene is filmed here and takes the studio look. Filming runs in this tab (keep it open).</p>
      )}
      {status && <p className="mt-3 text-sm text-emerald-400">{status}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
