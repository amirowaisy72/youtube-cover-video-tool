// Assets panel for the 3D Explainer: built-in + downloaded 3D/texture
// assets from the backend (/api/3d/assets), plus Poly Haven search →
// download. Every asset shows its source + licence so nothing
// unlicensed slips into a video. All fetches are plain fetch() against
// the backend; failures (backend offline etc.) show as plain text.

import { useCallback, useEffect, useState } from "react";

export interface Asset3D {
  id: string;
  name: string;
  kind?: string; // "model" | "texture" | "hdri" | …
  source?: string; // e.g. "Poly Haven", "Built-in"
  licence?: string; // e.g. "CC0"
  url?: string;
  builtin?: boolean;
}

interface SearchHit {
  id: string;
  name: string;
  source?: string;
  licence?: string;
}

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => r.statusText)}`);
  return (await r.json()) as T;
}

export default function AssetsPanel() {
  const [assets, setAssets] = useState<Asset3D[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await j<{ assets: Asset3D[] } | Asset3D[]>("/api/3d/assets");
      setAssets(Array.isArray(data) ? data : data.assets ?? []);
      setError("");
    } catch (e) {
      setError(`Could not load assets — is the app backend running? (${e instanceof Error ? e.message : String(e)})`);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const search = async () => {
    if (!query.trim()) return;
    setBusy("search");
    setNote("");
    try {
      const data = await j<{ results: SearchHit[] } | SearchHit[]>(`/api/3d/assets/search?q=${encodeURIComponent(query.trim())}&source=polyhaven`);
      setHits(Array.isArray(data) ? data : data.results ?? []);
      if (!(Array.isArray(data) ? data : data.results ?? []).length) setNote("No results — try another word.");
    } catch (e) {
      setError(`Search failed (offline?). ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(""); }
  };

  const download = async (hit: SearchHit) => {
    setBusy(`dl-${hit.id}`);
    try {
      await j("/api/3d/assets/download", { method: "POST", body: JSON.stringify({ id: hit.id, source: hit.source ?? "Poly Haven" }) });
      setNote(`Downloaded “${hit.name}”.`);
      await load();
    } catch (e) {
      setError(`Download failed (offline?). ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(""); }
  };

  const remove = async (asset: Asset3D) => {
    setBusy(`del-${asset.id}`);
    try {
      await j(`/api/3d/assets/${encodeURIComponent(asset.id)}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(`Delete failed. ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(""); }
  };

  return (
    <div className="glass p-6">
      <h2 className="text-xl font-bold">3D assets</h2>
      <p className="mt-1 text-sm text-muted-foreground">Models &amp; textures your shots can use. Source and licence are shown for every asset.</p>
      {error && <p className="mt-3 rounded bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}

      <div className="mt-4 space-y-2">
        {assets.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-2 rounded border border-white/10 p-3">
            <span className="font-medium">{a.name}</span>
            {a.kind && <span className="chip">{a.kind}</span>}
            <span className="text-xs text-muted-foreground">{a.source ?? "—"} · {a.licence ?? "licence unknown"}{a.builtin ? " · built-in" : ""}</span>
            <span className="ml-auto" />
            {!a.builtin && (
              <button className="btn" disabled={busy === `del-${a.id}`} onClick={() => void remove(a)}>Delete</button>
            )}
          </div>
        ))}
        {!assets.length && !error && <p className="text-sm text-muted-foreground">No assets yet — search Poly Haven below (CC0, free for videos).</p>}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          className="w-full rounded border border-white/10 bg-transparent p-2"
          placeholder="Search Poly Haven — e.g. container ship, earth, circuit"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
        />
        <button className="btn btn-primary" disabled={busy === "search"} onClick={() => void search()}>
          {busy === "search" ? "Searching…" : "Search"}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {hits.map((h) => (
          <div key={h.id} className="flex flex-wrap items-center gap-2 rounded border border-white/10 p-3">
            <span className="font-medium">{h.name}</span>
            <span className="text-xs text-muted-foreground">{h.source ?? "Poly Haven"} · {h.licence ?? "CC0"}</span>
            <span className="ml-auto" />
            <button className="btn" disabled={busy === `dl-${h.id}`} onClick={() => void download(h)}>
              {busy === `dl-${h.id}` ? "Downloading…" : "Download"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
