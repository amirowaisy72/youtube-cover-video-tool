import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, api } from "@/lib/api";

export const Route = createFileRoute("/seo")({
  component: Seo,
});

type SeoCheck = { label: string; passed: boolean; hint: string; points: number; max_points: number };
type SeoResult = { score: number; checks: SeoCheck[]; suggestions: string[] };

function scoreColor(score: number) {
  if (score >= 80) return "text-gradient";
  if (score >= 50) return "";
  return "";
}

function Seo() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SeoResult | null>(null);

  const tagCount = tags.split(",").map((t) => t.trim()).filter(Boolean).length;

  const check = async () => {
    if (!title.trim()) {
      setError("Enter a video title first.");
      return;
    }
    setError("");
    setChecking(true);
    try {
      const r = await api<SeoResult>("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description, tags }),
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Check failed. Is the server running?");
      setResult(null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <PageHeader icon="📈" title="SEO Score Checker" sub="Score your title, description and tags before you publish." />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass space-y-5 p-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Video title</h3>
              <span className="chip">{title.length} chars · ideal 50–60</span>
            </div>
            <input
              className="field text-lg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 10 Mind-Blowing Facts About Our World"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Description</h3>
              <span className="chip">{description.length} chars · aim 200+</span>
            </div>
            <textarea
              className="field min-h-40 resize-y leading-relaxed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What the video covers, who it is for, links, timestamps…"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Tags (comma-separated)</h3>
              <span className="chip">{tagCount} tags · aim 5–15</span>
            </div>
            <textarea
              className="field min-h-24 resize-y leading-relaxed"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="facts, mind blowing, universe, space, science"
            />
            <p className="mt-2 text-sm text-muted-foreground">Tip: put your main keyword as the first tag.</p>
          </div>

          <button className="btn btn-primary w-full py-4 text-lg" disabled={!title.trim() || checking} onClick={check}>
            {checking ? "Checking…" : "📈 Check my SEO score"}
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="glass p-6">
          {result ? (
            <>
              <div className="text-center">
                <div className={`font-display text-7xl font-bold ${scoreColor(result.score)}`}>{result.score}</div>
                <div className="mt-1 text-muted-foreground">out of 100</div>
                <div className="bar mt-4">
                  <div style={{ width: `${result.score}%` }} />
                </div>
                <p className="mt-3 text-lg font-semibold">
                  {result.score >= 80 ? "Excellent — ready to publish!" : result.score >= 50 ? "Good — fix the items below." : "Needs work — see the checklist."}
                </p>
              </div>
              <div className="mt-6">
                <h3 className="mb-3 font-semibold">Suggestions</h3>
                <ul className="space-y-2">
                  {result.suggestions.map((s) => (
                    <li key={s} className="text-sm text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="grid h-full min-h-60 place-items-center text-center text-muted-foreground">
              Enter your title, description and tags, then check the score.
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-6">
          <h3 className="mb-3 text-xl font-bold">Checklist</h3>
          <div className="grid gap-3">
            {result.checks.map((c) => (
              <div key={c.label} className="glass flex items-start gap-4 p-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg ${c.passed ? "btn-primary" : "btn-amber"} p-0`}>
                  {c.passed ? "✓" : "✗"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{c.label}</div>
                  <div className="text-sm text-muted-foreground">{c.hint}</div>
                </div>
                <span className="chip shrink-0">{c.points}/{c.max_points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
