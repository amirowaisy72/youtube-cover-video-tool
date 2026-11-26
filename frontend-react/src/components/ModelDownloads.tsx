/** Big-model downloads, lazy on first use (user, 2026-11-21):
    no model downloads at install time — the Whisper tiny model
    (~75 MB) and the Voice Clone model (~3.2 GB) download only when
    the user asks, from GET/POST /api/downloads/*, with a visible
    progress bar (MB done, speed). Mount where the feature lives:
    <ModelDownloads only={["chatterbox-model"]} /> on Voice Clone,
    <ModelDownloads only={["whisper-tiny"]} /> on Subtitles.
    Not mounted anywhere yet — see the mount note in the report. */
import { useEffect, useState } from "react";

type Download = {
  id: string;
  name: string;
  description: string;
  size_label: string;
  used_by: string;
  status: "missing" | "downloading" | "downloaded" | "error";
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed_bps: number;
  error: string;
  engine_installed?: boolean;
  engine_install_url?: string;
};

function fmtMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 1024 ** 3 ? 2 : 0)} MB`;
}

function fmtSpeed(bps: number) {
  if (bps <= 0) return "";
  return ` · ${(bps / 1024 / 1024).toFixed(1)} MB/s`;
}

export function ModelDownloads({ only }: { only?: string[] }) {
  const [items, setItems] = useState<Download[] | null>(null);
  const [err, setErr] = useState("");
  const [starting, setStarting] = useState("");
  const onlyKey = (only ?? []).join(",");

  const refresh = async () => {
    try {
      // the installed app has its own Downloads page and asks before every download
      if ((await fetch("/api/parts").then((r) => r.json())).enabled) { setItems([]); return; }
      const d = await fetch("/api/downloads/status").then((r) => r.json());
      const all = (d.downloads ?? []) as Download[];
      setItems(only ? all.filter((x) => only.includes(x.id)) : all);
      setErr("");
    } catch {
      setErr("Could not reach the download status.");
    }
  };

  useEffect(() => {
    void refresh();
    // Poll only while something downloads; a finished list is static.
    const t = window.setInterval(() => {
      setItems((cur) => {
        if (cur?.some((x) => x.status === "downloading")) void refresh();
        return cur;
      });
    }, 2000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyKey]);

  const start = async (id: string) => {
    setStarting(id);
    setErr("");
    try {
      const r = await fetch(`/api/downloads/${id}/start`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not start the download.");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start the download.");
    }
    setStarting("");
  };

  if (!items) return null;
  if (items.length === 0) return null;
  if (items.every((x) => x.status === "downloaded")) {
    return (
      <p className="text-sm text-muted-foreground">
        ✓ {items.map((x) => x.name).join(" and ")} downloaded — ready offline.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((x) => (
        <div key={x.id} className="glass space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <b>{x.name}</b>
            <span className="chip">{x.size_label}</span>
            {x.status === "downloaded" && <span className="chip text-success">✓ Downloaded</span>}
            {x.status === "downloading" && <span className="chip">Downloading… {Math.round(x.progress)}%</span>}
            {x.status === "error" && <span className="chip text-destructive">Failed — try again</span>}
          </div>
          <p className="text-sm text-muted-foreground">{x.description} One-time download, then it works offline.</p>
          {x.id === "chatterbox-model" && x.engine_installed === false && (
            <p className="text-sm text-muted-foreground">
              The voice engine itself is a separate one-time install (button at the top of Voice Clone).
            </p>
          )}
          {x.status === "downloading" && (
            <>
              <div className="bar">
                <div style={{ width: `${x.progress}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">
                {fmtMB(x.downloaded_bytes)} of {fmtMB(x.total_bytes)}
                {fmtSpeed(x.speed_bps)}
              </p>
            </>
          )}
          {x.status === "error" && x.error && <p className="text-sm text-destructive">{x.error}</p>}
          {(x.status === "missing" || x.status === "error") && (
            <button className="btn btn-primary btn-sm" disabled={starting === x.id} onClick={() => void start(x.id)}>
              {starting === x.id ? "Starting…" : `⬇ Download now (${x.size_label})`}
            </button>
          )}
        </div>
      ))}
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}
