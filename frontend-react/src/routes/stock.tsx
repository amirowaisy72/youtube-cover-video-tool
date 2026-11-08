import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, api, validateStockKey } from "@/lib/api";
import { getPexelsKey, getPixabayKey, setPexelsKey as savePexelsKey, setPixabayKey as savePixabayKey } from "@/lib/keys";

export const Route = createFileRoute("/stock")({
  component: Stock,
});

type SearchResult = {
  id: number | string;
  poster_url?: string | null;
  video_url?: string | null;
  duration?: number | null;
  tags?: string | null;
  user?: string | null;
};

type Source = "pixabay" | "pexels";

function fmtDur(sec?: number | null) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function Stock() {
  const [source, setSource] = useState<Source>("pixabay");
  const [pixabayKey, setPixabayKey] = useState("");
  const [pexelsKey, setPexelsKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  // Key validation result (user, 2026-11-08): a wrong key must
  // be caught when it is saved, not weeks later when videos
  // silently miss the stock footage.
  const [keyStatus, setKeyStatus] = useState<{ kind: "checking" | "valid" | "invalid" | "unreachable"; text: string } | null>(null);
  const [keyChecking, setKeyChecking] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPixabayKey(getPixabayKey());
    setPexelsKey(getPexelsKey());
  }, []);

  const activeKey = source === "pixabay" ? pixabayKey : pexelsKey;

  const setActiveKey = (v: string) => {
    if (source === "pixabay") setPixabayKey(v);
    else setPexelsKey(v);
    setKeySaved(false);
    setKeyStatus(null);
  };

  const saveKey = async () => {
    const key = activeKey.trim();
    if (!key) return;
    setKeyChecking(true);
    setKeySaved(false);
    setKeyStatus({ kind: "checking", text: "Checking the key with the provider…" });
    setError("");
    try {
      const res = await validateStockKey(source, key);
      if (res.valid) {
        if (source === "pixabay") savePixabayKey(key);
        else savePexelsKey(key);
        setKeySaved(true);
        setKeyStatus({ kind: "valid", text: "✓ Key is valid and saved in your browser." });
      } else if (res.reason === "invalid") {
        // Wrong key: do NOT save it — saving a bad key would
        // only make every later search (and Auto Video build)
        // silently miss the stock footage.
        setKeyStatus({ kind: "invalid", text: "✗ " + (res.detail || "This key was rejected — it is wrong or revoked. Copy it exactly from the provider's API page and try again.") });
      } else {
        // Could not check (network / rate limit / provider down):
        // save it anyway, but tell the user to test with a search.
        if (source === "pixabay") savePixabayKey(key);
        else savePexelsKey(key);
        setKeySaved(true);
        setKeyStatus({ kind: "unreachable", text: "⚠ Key saved, but it could not be verified right now (" + (res.detail || "provider unreachable") + "). Do a test search below to confirm it works." });
      }
    } catch {
      // Validation request itself failed (server down): save
      // anyway and tell the user to test with a search.
      if (source === "pixabay") savePixabayKey(key);
      else savePexelsKey(key);
      setKeySaved(true);
      setKeyStatus({ kind: "unreachable", text: "⚠ Key saved, but it could not be verified right now. Do a test search below to confirm it works." });
    } finally {
      setKeyChecking(false);
    }
  };

  const doSearch = async (p: number) => {
    if (!activeKey.trim()) {
      setError(
        source === "pixabay"
          ? "Add your free Pixabay API key first — get one at pixabay.com/api/docs."
          : "Add your free Pexels API key first — get one at pexels.com/api.",
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api<{ results: SearchResult[]; page: number; total_pages: number }>(
        `/api/stock/search?source=${source}&q=${encodeURIComponent(query.trim())}&page=${p}&key=${encodeURIComponent(activeKey.trim())}`,
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

  const switchSource = (s: Source) => {
    setSource(s);
    setResults([]);
    setSearched(false);
    setPage(1);
    setTotalPages(1);
    setError("");
    setKeySaved(false);
  };

  return (
    <div>
      <PageHeader icon="🎬" title="Stock Video & B-Roll" sub="Free stock footage for your YouTube videos — preview, then download." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="seg">
          <button data-on={source === "pixabay"} onClick={() => switchSource("pixabay")}>📷 Pixabay</button>
          <button data-on={source === "pexels"} onClick={() => switchSource("pexels")}>🎥 Pexels</button>
        </div>
        <span className="chip">
          {source === "pixabay" ? "Pixabay License — safe for YouTube" : "Pexels License — free for commercial use"}
        </span>
      </div>

      <div className="glass mb-6 space-y-3 p-6">
        <h2 className="text-lg font-bold">
          {source === "pixabay" ? "Your Pixabay API key" : "Your Pexels API key"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {source === "pixabay" ? (
            <>
              Pixabay gives free stock videos. You need your own free API key — it is stored only in
              your browser, never sent anywhere except to Pixabay. Get your free key at{" "}
              <a className="text-primary underline" href="https://pixabay.com/api/docs" target="_blank" rel="noreferrer">pixabay.com/api/docs</a>.
            </>
          ) : (
            <>
              Pexels gives free stock videos. You need your own free API key — it is stored only in
              your browser, never sent anywhere except to Pexels. Get your free key at{" "}
              <a className="text-primary underline" href="https://www.pexels.com/api/" target="_blank" rel="noreferrer">pexels.com/api</a>.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <input
            className="field"
            type="password"
            value={activeKey}
            autoComplete="off"
            onChange={(e) => setActiveKey(e.target.value)}
            placeholder={source === "pixabay" ? "Paste your Pixabay API key here" : "Paste your Pexels API key here"}
          />
          <button className="btn btn-primary" disabled={!activeKey.trim() || keyChecking} onClick={() => void saveKey()}>{keyChecking ? "Checking…" : "Save key"}</button>
        </div>
        {keyStatus && (
          <p className={`text-sm ${keyStatus.kind === "valid" ? "text-success" : keyStatus.kind === "invalid" ? "text-destructive" : "text-amber"}`}>
            {keyStatus.text}
          </p>
        )}
      </div>

      <div className="glass space-y-4 p-6">
        <h2 className="text-lg font-bold">Search stock videos</h2>
        <div className="flex gap-2">
          <input
            className="field"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void doSearch(1); }}
            placeholder="e.g. city night, ocean waves, cooking… (leave empty for popular clips)"
          />
          <button className="btn btn-primary" disabled={loading} onClick={() => void doSearch(1)}>
            {loading ? "Searching…" : "🔍 Search"}
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {searched && results.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No results — try a different word.</p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {results.map((r) => (
            <div key={`${source}-${r.id}`} className="overflow-hidden rounded-xl border border-border">
              {r.video_url && (
                <video
                  controls
                  preload="metadata"
                  src={r.video_url}
                  poster={r.poster_url ?? undefined}
                  className="aspect-video w-full bg-black object-cover"
                />
              )}
              <div className="space-y-2 p-4">
                <div className="text-sm text-muted-foreground">
                  {r.user ? `by ${r.user}` : ""}
                  {r.duration ? ` · ${fmtDur(r.duration)}` : ""}
                  {r.tags ? ` · ${r.tags}` : ""}
                </div>
                {r.video_url && (
                  <a className="btn btn-amber btn-sm" href={r.video_url} download target="_blank" rel="noreferrer">⬇ Download clip</a>
                )}
              </div>
            </div>
          ))}
        </div>

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
