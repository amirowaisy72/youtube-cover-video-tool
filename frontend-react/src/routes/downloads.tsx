import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { PartProgress } from "@/components/PartPrompt";
import { partsCall, size, type PartsStatus } from "@/lib/parts";

export const Route = createFileRoute("/downloads")({ component: Downloads });

function Downloads() {
  const [st, setSt] = useState<PartsStatus | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");  // stays until the next button (the refresh below has none)
  const load = () => partsCall().then(setSt).catch((e: Error) => setErr(e.message));
  useEffect(() => { void load(); }, []);
  const busy = !!st?.state.busy;
  useEffect(() => {
    // also picks up a download started from a tool's question
    const t = window.setInterval(() => void load(), busy ? 1000 : 5000);
    return () => window.clearInterval(t);
  }, [busy]);
  const act = (path: string) => {
    setErr(""); setNote("");
    partsCall(path, "POST").then((d) => { setSt(d); setNote(d.note || ""); }).catch((e: Error) => setErr(e.message));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon="⬇" title="Downloads" sub="The big optional parts. Each one is downloaded only when you say so, and can be removed to free space." />
      {!st && !err && <p className="text-muted-foreground">Loading…</p>}
      {err && <p className="mb-3 text-sm text-destructive">{err}</p>}
      {st && !st.enabled && <p className="glass p-5 text-muted-foreground">This page belongs to the installed app. Running from source, the libraries come from pip.</p>}
      {st?.enabled && (
        <div className="space-y-3">
          <div className="glass p-4 text-sm">
            <p className="break-all">Data folder: <b>{st.data_folder}</b></p>
            <p className="text-muted-foreground">{st.free ? `${size(st.free)} free on that drive.` : ""}</p>
          </div>
          {note && <p className="text-sm text-amber-300">{note}</p>}
          {st.parts.map((p) => {
            const mine = st.state.part === p.id;
            const running = mine && st.state.busy;
            return (
              <div key={p.id} className="glass space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{p.name}</b>
                    {p.installed ? <span className="chip text-success">✓ Installed</span> : <span className="chip">{p.removing ? "Removed when you restart YT Guru" : "Not installed"}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {running ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => act("/cancel")}>Cancel</button>
                    ) : p.installed ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm(`Remove ${p.name}? It frees about ${p.space_text}. You can download it again later.`)) act(`/${p.id}/remove`); }}>🗑 Remove</button>
                    ) : (
                      <>
                        {p.partly > 0 && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(`/${p.id}/remove`)}>Delete part-download</button>}
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(`/${p.id}/get`)}>⬇ {p.partly > 0 ? "Continue" : "Download"}</button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{p.what}</p>
                <p className="text-xs text-muted-foreground">Download {p.download_text} · uses about {p.space_text}{p.partly > 0 && !running ? ` · ${size(p.partly)} already downloaded` : ""}</p>
                {running && <PartProgress st={st} />}
                {mine && !running && !p.installed && st.state.error && <p className="text-sm text-amber-300">{st.state.error}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
