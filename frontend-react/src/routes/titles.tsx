import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/titles")({
  component: Titles,
});

type TitlesResult = { titles: string[]; description: string; tags: string[] };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function Titles() {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TitlesResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const doCopy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    }
  };

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api<TitlesResult>("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), keywords: keywords.trim() || undefined }),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate titles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader icon="🏷️" title="Title + Tags Generator" sub="Type a topic — get clickable titles, a description, and tags." />

      <div className="glass mx-auto max-w-2xl space-y-5 p-8">
        <div>
          <label className="mb-2 block font-semibold">Video topic</label>
          <input
            className="field text-lg"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="e.g. How to grow on YouTube"
          />
        </div>
        <div>
          <label className="mb-2 block font-semibold">Keywords <span className="text-muted-foreground">(optional, comma separated)</span></label>
          <input
            className="field"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="e.g. youtube, seo, growth"
          />
        </div>
        <button className="btn btn-primary w-full py-4 text-lg" disabled={!topic.trim() || loading} onClick={generate}>
          {loading ? "Generating…" : "✨ Generate titles"}
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
      </div>

      {result && (
        <div className="mx-auto mt-8 max-w-2xl space-y-6">
          <div className="glass p-6">
            <h3 className="mb-4 font-semibold">Titles — pick your favourite</h3>
            <div className="space-y-2">
              {result.titles.map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="font-display text-lg font-bold text-gradient">{i + 1}</span>
                  <span className="flex-1">{t}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => doCopy(`t${i}`, t)}>
                    {copied === `t${i}` ? "✓ Copied" : "⧉ Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Description</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => doCopy("desc", result.description)}>
                {copied === "desc" ? "✓ Copied" : "⧉ Copy description"}
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.description}</p>
          </div>

          <div className="glass p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Tags</h3>
              <button className="btn btn-amber btn-sm" onClick={() => doCopy("tags", result.tags.join(", "))}>
                {copied === "tags" ? "✓ Copied" : "⧉ Copy all tags"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.tags.map((tag) => (
                <button key={tag} className="chip" onClick={() => doCopy(`tag-${tag}`, tag)}>
                  {copied === `tag-${tag}` ? "✓ " : ""}{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
