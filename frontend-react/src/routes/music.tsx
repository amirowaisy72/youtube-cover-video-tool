import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, api } from "@/lib/api";
import { getFreesoundKey, setFreesoundKey } from "@/lib/keys";

export const Route = createFileRoute("/music")({
  component: Music,
});

type SearchResult = {
  id: number | string;
  name: string;
  duration?: number | null;
  tags?: string | null;
  preview_url?: string | null;
  download_url?: string | null;
  username?: string | null;
  license?: string | null;
};

type PackTrack = {
  name: string;
  artist: string;
  license: string;
  file: string;
  duration?: number | null;
};

function fmtDur(sec?: number | null) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function Music() {
  const [tab, setTab] = useState<"music" | "effects">("music");
  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pack, setPack] = useState<PackTrack[]>([]);
  const [packError, setPackError] = useState("");

  useEffect(() => {
    setApiKey(getFreesoundKey());
    api<{ tracks: PackTrack[] }>("/api/music/pack")
      .then((d) => setPack(d.tracks ?? []))
      .catch((e) => setPackError(e instanceof Error ? e.message : "Could not load the starter pack."));
  }, []);

  const saveKey = () => {
    setFreesoundKey(apiKey);
    setKeySaved(true);
    setError("");
  };

  const doSearch = async (p: number) => {
    if (!apiKey.trim()) {
      setError("Add your free Freesound API key first — get one at freesound.org/apiv2/apply.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api<{ results: SearchResult[]; page: number; total_pages: number }>(
        `/api/music/search?type=${tab}&q=${encodeURIComponent(query.trim())}&page=${p}&key=${encodeURIComponent(apiKey.trim())}`,
      );
      setResults(data.results ?? []);
      setPage(data.page);
      setTotalPages(data.total_pages ?? 1);
      setSearched(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Search failed. Check your key and connection.");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: "music" | "effects") => {
    setTab(t);
    setResults([]);
    setSearched(false);
    setPage(1);
    setTotalPages(1);
    setError("");
  };

  return (
    <div>
      <PageHeader icon="🎵" title="Royalty-Free Music & Sound Effects" sub="Free music and sounds for your YouTube videos — preview, then download." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="seg">
          <button data-on={tab === "music"} onClick={() => switchTab("music")}>🎵 Music</button>
          <button data-on={tab === "effects"} onClick={() => switchTab("effects")}>🔊 Sound Effects</button>
        </div>
        <span className="chip">Freesound — check each track's license before using it</span>
      </div>

      <div className="glass mb-6 space-y-3 p-6">
        <h2 className="text-lg font-bold">Your Freesound API key</h2>
        <p className="text-sm text-muted-foreground">
          Freesound gives free music and sound effects. Pixabay's API does not provide audio, so this tool
          uses Freesound instead — the same key Auto Video already uses for background music, so it is
          filled in automatically if you added it there. Your key is stored only in your browser, never
          sent anywhere except to Freesound. Get your free key at{" "}
          <a className="text-primary underline" href="https://freesound.org/apiv2/apply" target="_blank" rel="noreferrer">freesound.org/apiv2/apply</a>.
        </p>
        <div className="flex gap-2">
          <input
            className="field"
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setKeySaved(false); }}
            placeholder="Paste your Freesound API key here"
          />
          <button className="btn btn-primary" disabled={!apiKey.trim()} onClick={saveKey}>Save key</button>
        </div>
        {keySaved && <p className="text-sm text-success">✓ Key saved in your browser.</p>}
      </div>

      <div className="glass mb-6 space-y-4 p-6">
        <h2 className="text-lg font-bold">🎁 Built-in starter pack — no key needed</h2>
        {packError && <p className="text-sm text-destructive">{packError}</p>}
        {pack.length === 0 && !packError && (
          <p className="text-sm text-muted-foreground">No starter tracks bundled yet — use the Freesound search below.</p>
        )}
        {pack.map((t) => (
          <div key={t.file} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-muted-foreground">
                {t.artist} · {t.license}
                {t.duration ? ` · ${fmtDur(t.duration)}` : ""}
              </div>
            </div>
            <audio controls preload="none" src={`/api/music/pack/${encodeURIComponent(t.file)}`} className="h-10 w-full max-w-xs" />
            <a className="btn btn-amber btn-sm" href={`/api/music/pack/${encodeURIComponent(t.file)}`} download={t.file}>⬇ Download</a>
          </div>
        ))}
      </div>

      <div className="glass space-y-4 p-6">
        <h2 className="text-lg font-bold">{tab === "music" ? "Search music" : "Search sound effects"}</h2>
        <div className="flex gap-2">
          <input
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void doSearch(1); }}
            placeholder={tab === "music" ? "e.g. calm piano, upbeat, cinematic…" : "e.g. applause, whoosh, rain…"}
          />
          <button className="btn btn-primary" disabled={loading} onClick={() => void doSearch(1)}>
            {loading ? "Searching…" : "🔍 Search"}
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {searched && results.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No results — try a different word.</p>
        )}

        {results.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-muted-foreground">
                {r.username ? `by ${r.username}` : ""}
                {r.duration ? ` · ${fmtDur(r.duration)}` : ""}
                {r.license ? ` · ${r.license}` : ""}
                {r.tags ? ` · ${r.tags}` : ""}
              </div>
            </div>
            {r.preview_url && (
              <audio controls preload="none" src={r.preview_url} className="h-10 w-full max-w-xs" />
            )}
            {r.download_url && (
              <a className="btn btn-amber btn-sm" href={r.download_url} download target="_blank" rel="noreferrer">⬇ Download</a>
            )}
          </div>
        ))}

        {searched && results.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1 || loading} onClick={() => void doSearch(page - 1)}>← Prev</button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages || loading} onClick={() => void doSearch(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
