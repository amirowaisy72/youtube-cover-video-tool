/** My Videos (user, 2026-11-20): every video from every video tool in one list — watch, download, and
    delete (or keep only the finished video) to free the disk. */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

type Item = { root: string; id: string; tool: string; tool_label: string; title: string; status: string; busy: boolean;
  size: number; final: string; final_size: number; audio: string; modified: number; folder: boolean };
type Lib = { items: Item[]; total: number; free: number };

const TOOLS: [string, string][] = [["", "All"], ["visual", "Visual Explainer"], ["autovideo", "Auto Video"],
  ["animator", "Story Animator"], ["cover", "Cover Video / others"], ["voice", "Voices"]];

export function fmtSize(b: number) {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(0)} MB`;
  return `${Math.max(1, Math.round(b / 1e3))} KB`;
}
const url = (it: Item, name?: string) => `/api/library/file/${it.root}/${encodeURIComponent(it.id)}${name ? `?name=${encodeURIComponent(name)}` : ""}`;

/** A small button for every video tool's page: opens My Videos filtered to that tool. */
export function MyVideosLink({ tool }: { tool: string }) {
  return (
    <a href={`/my-videos?tool=${tool}`} className="btn btn-ghost btn-sm" title="All your videos from this tool — watch or delete them to free space">📁 My videos</a>
  );
}

export function VideoLibrary({ initialTool = "" }: { initialTool?: string }) {
  const [tool, setTool] = useState(initialTool);
  const [lib, setLib] = useState<Lib | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [watch, setWatch] = useState<Item | null>(null);
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      const r = await fetch(`/api/library${tool ? `?tool=${tool}` : ""}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "failed");
      setLib(d as Lib);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not load"); }
  };
  useEffect(() => { void load(); }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (it: Item, keepFinal: boolean) => {
    const q = keepFinal
      ? `Keep only the finished video of “${it.title}” and delete its working files (${fmtSize(it.size - it.final_size)})?\nYou can still watch and upload it, but you cannot edit its scenes any more.`
      : `Delete “${it.title}” completely (${fmtSize(it.size)})? This cannot be undone.`;
    if (!confirm(q)) return;
    setBusy(it.root + it.id); setErr(""); setMsg("");
    try {
      const r = await fetch(`/api/library/${it.root}/${encodeURIComponent(it.id)}${keepFinal ? "?keep_final=true" : ""}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "failed");
      setMsg(`✓ Freed ${fmtSize(d.freed)}.`);
      if (watch && watch.id === it.id && !keepFinal) setWatch(null);
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not delete"); }
    setBusy("");
  };

  const items = lib?.items || [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TOOLS.map(([id, label]) => (
          <button key={id} className={`btn btn-sm ${tool === id ? "btn-primary" : "btn-ghost"}`} onClick={() => setTool(id)}>{label}</button>
        ))}
      </div>
      {lib && (
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} · they use <b className="text-foreground">{fmtSize(lib.total)}</b>
          {lib.free > 0 && <> · free space on this disk: <b className="text-foreground">{fmtSize(lib.free)}</b></>}
        </p>
      )}
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {err && <p className="text-sm text-rose-300">{err}</p>}
      {watch && (watch.final || watch.audio) && (
        <div className="glass p-3">
          <div className="mb-2 flex items-center justify-between"><b className="truncate">{watch.title}</b><button className="btn btn-ghost btn-sm" onClick={() => setWatch(null)}>✕</button></div>
          {watch.audio
            ? <audio src={url(watch)} controls autoPlay className="w-full" />
            : <video src={url(watch, watch.final)} controls autoPlay playsInline className="aspect-video w-full rounded-lg bg-black" />}
        </div>
      )}
      {lib && !items.length && <p className="text-sm text-muted-foreground">No videos here.</p>}
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.root + it.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{it.title}</div>
              <div className="text-xs text-muted-foreground">
                {it.tool_label} · {new Date(it.modified * 1000).toLocaleString()} · <b>{fmtSize(it.size)}</b>
                {it.busy ? <span className="text-amber-300"> · being made now</span> : it.final ? <span className="text-emerald-300"> · finished</span> : it.status ? <span> · {it.status}</span> : null}
              </div>
            </div>
            {(it.final || it.audio) && <button className="btn btn-ghost btn-sm" onClick={() => setWatch(it)}>▶ {it.audio ? "Listen" : "Watch"}</button>}
            {it.final && <a className="btn btn-ghost btn-sm" href={url(it, it.final)} download>⬇ Download</a>}
            {it.folder && it.final && it.size - it.final_size > 5e6 && (
              <button className="btn btn-ghost btn-sm" disabled={it.busy || busy === it.root + it.id} onClick={() => void remove(it, true)}
                title="Keep the finished video, delete the working files">🧹 Keep only the video ({fmtSize(it.size - it.final_size)} free)</button>
            )}
            <button className="btn btn-ghost btn-sm text-rose-300" disabled={it.busy || busy === it.root + it.id} onClick={() => void remove(it, false)}>🗑 Delete</button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Deleting only removes the app's own video folders. Videos already uploaded to YouTube stay on YouTube. <Link to="/" className="underline">← Home</Link></p>
    </div>
  );
}
