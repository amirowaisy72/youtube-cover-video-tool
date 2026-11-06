import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, api } from "@/lib/api";

export const Route = createFileRoute("/keywords")({
  component: Keywords,
});

const EXPANSIONS = ["how to", "best", "for beginners", "2026", "vs"];

type KeywordsResponse = { seed: string; suggestions: string[] };

function Keywords() {
  const [seed, setSeed] = useState("");
  const [searched, setSearched] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const search = async (text: string) => {
    const q = text.trim();
    if (!q) {
      setError("Type a keyword first.");
      return;
    }
    setLoading(true);
    setError("");
    setCopied("");
    try {
      const res = await api<KeywordsResponse>(
        `/api/keywords?q=${encodeURIComponent(q)}`,
      );
      setSeed(res.seed);
      setSearched(res.seed);
      setSuggestions(res.suggestions);
      if (res.suggestions.length === 0) {
        setError(`No suggestions found for "${res.seed}". Try a broader word.`);
      }
    } catch (e) {
      setSuggestions([]);
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not reach YouTube suggestions. Check your internet connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
    } catch {
      setCopied("");
    }
  };

  return (
    <div>
      <PageHeader
        icon="🔍"
        title="Keyword Research"
        sub="Find what people actually search for on YouTube."
      />

      <form
        className="glass mx-auto max-w-2xl space-y-5 p-8"
        onSubmit={(e) => {
          e.preventDefault();
          search(seed);
        }}
      >
        <h2 className="text-2xl font-bold">Start with a seed keyword</h2>
        <input
          className="field text-lg"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="e.g. home workout"
          autoFocus
        />
        <button
          className="btn btn-primary w-full py-4 text-lg"
          type="submit"
          disabled={!seed.trim() || loading}
        >
          {loading ? "Searching…" : "🔍 Find keywords"}
        </button>
        {error && (
          <p className="rounded-xl border border-amber/50 bg-amber/10 p-4 text-sm text-amber">
            ⚠ {error}
          </p>
        )}
      </form>

      {searched && !loading && suggestions.length > 0 && (
        <div className="mx-auto mt-8 max-w-2xl space-y-6">
          <div className="glass p-6">
            <h3 className="mb-3 font-semibold">
              Try these expansions of{" "}
              <span className="text-gradient">“{searched}”</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {EXPANSIONS.map((x) => (
                <button
                  key={x}
                  className="chip hover:border-primary"
                  onClick={() => search(`${searched} ${x}`)}
                >
                  {searched} {x}
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-6">
            <h3 className="mb-1 text-xl font-bold">
              {suggestions.length} suggestions for{" "}
              <span className="text-gradient">“{searched}”</span>
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Click a keyword to dig deeper, or copy it for your title, tags
              or description.
            </p>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <button
                    className="min-w-0 flex-1 text-left font-medium hover:text-primary"
                    onClick={() => search(s)}
                    title="Search this keyword"
                  >
                    {s}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copy(s)}
                  >
                    {copied === s ? "✓ Copied" : "⧉ Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
