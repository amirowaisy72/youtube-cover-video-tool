import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/script")({
  component: Script,
});

type ScriptSection = { heading: string; text: string; bullets: string[] };
type ScriptResult = { hook: string; script: ScriptSection[]; description: string; estimated_words: number };
type Length = "short" | "medium" | "long";

const LENGTHS: { id: Length; label: string }[] = [
  { id: "short", label: "Short · ~2 min" },
  { id: "medium", label: "Medium · ~5 min" },
  { id: "long", label: "Long · ~10 min" },
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function sectionText(s: ScriptSection): string {
  const lines = [s.heading, s.text];
  for (const b of s.bullets) lines.push(`• ${b}`);
  return lines.join("\n");
}

function fullScriptText(result: ScriptResult): string {
  const parts = [result.hook, ""];
  for (const s of result.script) parts.push(sectionText(s), "");
  return parts.join("\n").trim();
}

function Script() {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState<Length>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScriptResult | null>(null);
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
      const data = await api<ScriptResult>("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), keywords: keywords.trim() || undefined, length }),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate a script. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader icon="📝" title="Script Generator" sub="Type a topic — get a full ready-to-record script, hooks and description." />

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
        <div>
          <label className="mb-2 block font-semibold">Video length</label>
          <div className="seg">
            {LENGTHS.map((l) => (
              <button key={l.id} type="button" data-on={length === l.id} onClick={() => setLength(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary w-full py-4 text-lg" disabled={!topic.trim() || loading} onClick={generate}>
          {loading ? "Writing…" : "✨ Generate script"}
        </button>
        {error && <p className="text-sm text-amber">{error}</p>}
        <p className="text-center text-sm text-muted-foreground">Structured template script — no AI, no key, free forever.</p>
      </div>

      {result && (
        <div className="mx-auto mt-8 max-w-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="chip">≈ {result.estimated_words} words</span>
            <button className="btn btn-amber btn-sm" onClick={() => doCopy("all", fullScriptText(result))}>
              {copied === "all" ? "✓ Copied" : "⧉ Copy full script"}
            </button>
          </div>

          {result.script.map((s, i) => (
            <div key={i} className="glass p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold">
                  {s.heading === "Hook" ? (
                    <span className="text-gradient">{s.heading}</span>
                  ) : (
                    s.heading
                  )}
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={() => doCopy(`s${i}`, sectionText(s))}>
                  {copied === `s${i}` ? "✓ Copied" : "⧉ Copy"}
                </button>
              </div>
              <p className="leading-relaxed">{s.text}</p>
              {s.bullets.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {s.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="glass p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Description</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => doCopy("desc", result.description)}>
                {copied === "desc" ? "✓ Copied" : "⧉ Copy description"}
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
