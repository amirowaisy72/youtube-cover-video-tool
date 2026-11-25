/** The contact sheet of a scene (frames + spoken words): view it, download it or copy it, to attach it
    to the AI together with the fix prompt — so the AI can see what its code draws. */
import { useState } from "react";

export const sceneFileUrl = (jobId: string, name: string) => `/api/autovideo/${jobId}/scene-file/${encodeURIComponent(name)}`;

export function SceneFrames({ jobId, fileName, getSheet, label }: {
  jobId: string;
  /** an existing sheet, shown as a small picture */
  fileName?: string | undefined;
  /** makes (or returns) the sheet -> its file name */
  getSheet: () => Promise<string>;
  label: string;
}) {
  const [made, setMade] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const shown = made || fileName || "";

  const picture = async () => {
    const name = await getSheet();
    setMade(name);
    const r = await fetch(sceneFileUrl(jobId, name));
    if (!r.ok) throw new Error("The frames picture is missing — test the scene again.");
    return { name, blob: await r.blob() };
  };
  const run = async (job: () => Promise<void>) => {
    setBusy(true); setMsg(""); setErr("");
    try { await job(); } catch (e) { setErr(e instanceof Error ? e.message : "That did not work."); }
    setBusy(false);
  };
  const download = () => run(async () => {
    const { blob } = await picture();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${label}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setMsg("✓ Downloaded — attach this picture to the AI with the prompt.");
  });
  const copy = () => run(async () => {
    if (typeof ClipboardItem === "undefined") throw new Error("This browser cannot copy pictures — use Download.");
    // the promise goes straight into the clipboard call, so the browser still counts it as your click
    await navigator.clipboard.write([new ClipboardItem({ "image/png": picture().then((p) => p.blob) })]);
    setMsg("✓ Frames copied — paste them (Ctrl+V) into the AI chat.");
  });

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void download()}>📷 Download frames</button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void copy()}>📋 Copy frames</button>
        {busy && <span className="text-xs text-muted-foreground">Making the frames…</span>}
      </div>
      {msg && <p className="text-xs text-emerald-300">{msg}</p>}
      {err && <p className="text-xs text-rose-300">{err}</p>}
      {shown && (
        <a href={sceneFileUrl(jobId, shown)} target="_blank" rel="noreferrer" title="Open the frames full size">
          <img src={sceneFileUrl(jobId, shown)} alt="Frames of this scene" className="max-h-56 rounded-md border border-border" />
        </a>
      )}
    </div>
  );
}
