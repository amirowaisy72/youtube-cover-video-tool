import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, api } from "@/lib/api";

export const Route = createFileRoute("/inspector")({
  component: Inspector,
});

type InspectorData = {
  video_id: string;
  title: string;
  description: string;
  tags: string[];
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  upload_date: string;
  uploader: string;
  uploader_id: string;
  uploader_url: string;
  channel: string;
  channel_id: string;
  channel_url: string;
  subscriber_count: number | null;
  duration_sec: number | null;
  duration: string;
  categories: string[];
  language: string;
  thumbnail: string;
  webpage_url: string;
  age_limit: number | null;
  is_live: boolean;
  live_status: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  formats: {
    count: number;
    resolutions: string[];
    highest: string;
    best_video: string;
    best_audio_kbps: number | null;
  };
};

function fmtNum(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtFull(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function Inspector() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<InspectorData | null>(null);
  const [copied, setCopied] = useState(false);

  const inspect = async () => {
    if (!url.trim()) {
      setError("Paste a YouTube video link first.");
      return;
    }
    setError("");
    setData(null);
    setCopied(false);
    setLoading(true);
    try {
      const result = await api<InspectorData>("/api/inspector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      setData(result);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not read that video: " + (e instanceof Error ? e.message : "unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  const copyTags = async () => {
    if (!data || !data.tags.length) return;
    const text = data.tags.join(", ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats: { label: string; value: string; sub: string }[] = data
    ? [
        { label: "Views", value: fmtNum(data.view_count), sub: fmtFull(data.view_count) },
        { label: "Likes", value: fmtNum(data.like_count), sub: fmtFull(data.like_count) },
        { label: "Comments", value: fmtNum(data.comment_count), sub: fmtFull(data.comment_count) },
        { label: "Duration", value: data.duration || "—", sub: data.duration_sec !== null ? `${data.duration_sec} sec` : "" },
        { label: "Uploaded", value: data.upload_date || "—", sub: "" },
        {
          label: "Subscribers",
          value: fmtNum(data.subscriber_count),
          sub: fmtFull(data.subscriber_count),
        },
      ]
    : [];

  const rows: { label: string; value: string }[] = data
    ? [
        { label: "Video ID", value: data.video_id },
        { label: "Channel", value: data.channel },
        { label: "Uploader", value: data.uploader },
        { label: "Channel ID", value: data.channel_id },
        { label: "Categories", value: data.categories.length ? data.categories.join(", ") : "—" },
        { label: "Language", value: data.language || "—" },
        { label: "Age limit", value: data.age_limit !== null ? `${data.age_limit}+` : "—" },
        { label: "Live status", value: data.live_status || (data.is_live ? "Live" : "Not live") },
        {
          label: "Resolution",
          value: data.width && data.height ? `${data.width}x${data.height}${data.fps ? ` · ${data.fps}fps` : ""}` : "—",
        },
        {
          label: "Available formats",
          value: `${data.formats.count} formats${data.formats.highest ? ` · up to ${data.formats.highest}` : ""}`,
        },
        { label: "Best video", value: data.formats.best_video || "—" },
        {
          label: "Best audio",
          value: data.formats.best_audio_kbps !== null ? `${data.formats.best_audio_kbps} kbps` : "—",
        },
        { label: "Resolutions", value: data.formats.resolutions.length ? data.formats.resolutions.join(", ") : "—" },
      ]
    : [];

  return (
    <div>
      <PageHeader icon="🔍" title="Competitor Inspector" sub="Paste any YouTube link — see every detail: tags, views, likes and more." />

      <div className="glass mx-auto max-w-2xl space-y-5 p-8">
        <h2 className="text-2xl font-bold">Inspect a video</h2>
        <input
          className="field text-lg"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") void inspect(); }}
          placeholder="https://youtube.com/watch?v=…"
        />
        <button className="btn btn-primary w-full py-4 text-lg" disabled={!url.trim() || loading} onClick={() => void inspect()}>
          {loading ? "Inspecting…" : "🔍 Inspect video"}
        </button>
        {loading && <div className="bar"><div style={{ width: "60%" }} /></div>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-sm text-muted-foreground">Free — no download, no credits. Works with any public video link, including Shorts.</p>
      </div>

      {data && (
        <div className="mt-8 space-y-6">
          <div className="glass flex flex-col gap-5 p-6 md:flex-row">
            {data.thumbnail && (
              <img src={data.thumbnail} alt={data.title} className="h-auto w-full rounded-xl object-cover md:w-80" />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-snug">{data.title || "Untitled video"}</h2>
              <p className="mt-2 text-muted-foreground">
                {data.channel}
                {data.subscriber_count !== null ? ` · ${fmtNum(data.subscriber_count)} subscribers` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="chip">⏱ {data.duration || "—"}</span>
                <span className="chip">📅 {data.upload_date || "—"}</span>
                {data.is_live && <span className="chip">🔴 Live</span>}
              </div>
              {data.webpage_url && (
                <a className="btn btn-ghost btn-sm mt-4" href={data.webpage_url} target="_blank" rel="noreferrer">
                  Open on YouTube ↗
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="glass p-4">
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="font-display text-2xl font-bold">{s.value}</div>
                {s.sub && s.sub !== s.value && <div className="text-xs text-muted-foreground">{s.sub}</div>}
              </div>
            ))}
          </div>

          <div className="glass p-6">
            <h3 className="mb-4 font-semibold">Details</h3>
            <div className="space-y-2 text-sm">
              {rows.map((r) => (
                <div key={r.label} className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 md:flex-row md:gap-4">
                  <span className="w-40 shrink-0 text-muted-foreground">{r.label}</span>
                  <span className="min-w-0 flex-1 break-words font-medium">{r.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="font-semibold">Tags ({data.tags.length})</h3>
              <button className="btn btn-amber btn-sm ml-auto" disabled={!data.tags.length} onClick={() => void copyTags()}>
                {copied ? "✓ Copied" : "📋 Copy all tags"}
              </button>
            </div>
            {data.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {data.tags.map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This video has no tags.</p>
            )}
          </div>

          <div className="glass p-6">
            <h3 className="mb-3 font-semibold">Description</h3>
            {data.description ? (
              <p className="max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {data.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">This video has no description.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
