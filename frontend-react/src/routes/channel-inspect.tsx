import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/app-store";
import { getChannelNiche } from "@/lib/keys";

export const Route = createFileRoute("/channel-inspect")({
  component: ChannelInspector,
});

type InspectResult = {
  id: string;
  title: string;
  handle: string;
  description: string;
  keywords: string;
  profile_pic_url: string;
  banner_url: string;
  published_at: string;
  country: string;
  subscriber_count: string | null;
  video_count: string | null;
  view_count: string | null;
};

type GenerateResult = { names: string[]; description: string; tags: string[] };
type BrandingResult = { banner_file: string; logo_file: string; banner_url: string; logo_url: string };
type ApplyResult = {
  updated: { description: boolean; keywords: boolean; banner: boolean };
  channel: { id: string; title: string };
  errors: string[];
  scope_note: string;
};
type StatusResult = { connected: boolean; channels: { id: string; title: string }[]; message: string };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function fmtNum(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("en-US");
}

function ChannelInspector() {
  const { activeChannelId } = useApp();
  const [channels, setChannels] = useState<{ id: string; title: string }[]>([]);
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<InspectResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Editable fixes — pre-filled from the live channel, so the user
  // sees what is there now and edits it (or pastes AI output).
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [bannerFile, setBannerFile] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerLoading, setBannerLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [applyError, setApplyError] = useState("");

  const doCopy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    }
  };

  // Channel list + default to the TopBar active channel.
  useEffect(() => {
    api<StatusResult>("/api/channel/status")
      .then((s) => {
        setChannels(s.channels);
        const preferred = activeChannelId
          ? s.channels.find((c) => c.id === activeChannelId)
          : undefined;
        const first = preferred ?? s.channels[0];
        if (first) setChannelId(first.id);
      })
      .catch(() => setChannels([]));
  }, [activeChannelId]);

  const inspect = async () => {
    if (!channelId || loading) return;
    setLoading(true);
    setError("");
    setData(null);
    setApplyResult(null);
    setBannerFile("");
    setBannerUrl("");
    try {
      const d = await api<InspectResult>(
        `/api/channel/inspect?channel_id=${encodeURIComponent(channelId)}`,
      );
      setData(d);
      setDesc(d.description);
      setTags(d.keywords);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not inspect the channel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const niche = channelId ? getChannelNiche(channelId) : "";
  const channelName = data?.title || channels.find((c) => c.id === channelId)?.title || "";

  const aiPrompts = {
    description: `Write an engaging YouTube channel About description (120-150 words) for a channel called "${channelName || "my channel"}"${niche ? ` about ${niche}` : ""}. Tell new visitors what the channel is about, what kind of videos they will find, how often new videos are uploaded, and end with a call to subscribe. Friendly, clear tone.`,
    tags: `Suggest 15 YouTube channel tags for a channel called "${channelName || "my channel"}"${niche ? ` about ${niche}` : ""}. Tags should cover the topic, related searches, and audience intent. Return them as a comma-separated list only, no numbering, no extra text.`,
  };

  const promptBtn = (key: keyof typeof aiPrompts) => (
    <button
      className="btn btn-ghost btn-sm"
      title="Prompt for AI — copy a ready-made prompt for Gemini or any AI"
      onClick={() => void doCopy(`prompt-${key}`, aiPrompts[key])}
    >
      {copied === `prompt-${key}` ? "✓ Copied" : "✨ Prompt for AI"}
    </button>
  );

  // Suggest an improved description + tags from the channel's niche.
  const suggest = async () => {
    if (!data || suggestLoading) return;
    setSuggestLoading(true);
    setSuggestError("");
    try {
      const gen = await api<GenerateResult>("/api/channel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: niche || data.title,
          keywords: data.keywords || undefined,
        }),
      });
      setDesc(gen.description);
      setTags(gen.tags.join(", "));
    } catch (e) {
      setSuggestError(e instanceof ApiError ? e.message : "Could not generate suggestions. Please try again.");
    } finally {
      setSuggestLoading(false);
    }
  };

  // Generate a banner for this channel (same renderer as the wizard).
  const genBanner = async () => {
    if (!data || bannerLoading) return;
    setBannerLoading(true);
    try {
      const b = await api<BrandingResult>("/api/channel/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.title, tagline: niche || undefined, style: "violet" }),
      });
      setBannerFile(b.banner_file);
      setBannerUrl(b.banner_url);
    } catch {
      setBannerFile("");
      setBannerUrl("");
    } finally {
      setBannerLoading(false);
    }
  };

  // Apply the fixes to the channel (description + keywords + banner).
  const apply = async () => {
    if (!data || !desc.trim() || applyLoading) return;
    setApplyLoading(true);
    setApplyError("");
    setApplyResult(null);
    try {
      const res = await api<ApplyResult>("/api/channel/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc.trim(),
          tags: tags.trim(),
          banner_file: bannerFile || undefined,
          channel_id: data.id,
        }),
      });
      setApplyResult(res);
      // Refresh the audit so it shows the fixed state.
      await inspect();
    } catch (e) {
      setApplyError(e instanceof ApiError ? e.message : "Could not apply the fixes. Please try again.");
    } finally {
      setApplyLoading(false);
    }
  };

  const descLen = data?.description.trim().length ?? 0;
  const tagCount = data ? data.keywords.split(" ").filter(Boolean).length : 0;
  const videoCount = data?.video_count ? Number(data.video_count) : null;

  const checks = data
    ? [
        {
          label: "About / Description",
          ok: descLen >= 100,
          warn: descLen > 0 && descLen < 100,
          text:
            descLen === 0
              ? "Missing — no description at all. Viewers and YouTube cannot tell what the channel is about."
              : descLen < 100
                ? `Too short (${descLen} characters). A longer description (100+ characters) helps YouTube understand the channel.`
                : `Good — ${descLen} characters.`,
        },
        {
          label: "Keywords / Tags",
          ok: tagCount >= 5,
          warn: tagCount > 0 && tagCount < 5,
          text:
            tagCount === 0
              ? "Missing — no keywords. YouTube cannot match the channel to searches."
              : tagCount < 5
                ? `Only ${tagCount} keyword(s). Add more so YouTube can match the channel to searches.`
                : `Good — ${tagCount} keywords.`,
        },
        {
          label: "Banner",
          ok: Boolean(data.banner_url),
          warn: false,
          text: data.banner_url
            ? "Good — a banner is set."
            : "Missing — no banner. The channel looks unfinished without one.",
        },
        {
          label: "Profile picture",
          ok: Boolean(data.profile_pic_url),
          warn: false,
          text: data.profile_pic_url
            ? "A picture is set. If it is the default grey avatar, upload your logo in YouTube Studio — the API cannot set it."
            : "Missing — no profile picture.",
        },
        {
          label: "Handle",
          ok: Boolean(data.handle),
          warn: false,
          text: data.handle
            ? `Good — @${data.handle}.`
            : "No handle set. Set one in YouTube Studio so people can find the channel as @handle.",
        },
        {
          label: "Videos",
          ok: videoCount !== null && videoCount > 0,
          warn: false,
          text:
            videoCount === null
              ? "Video count not available."
              : videoCount === 0
                ? "No videos yet — upload the first video so the channel has something to watch."
                : `${fmtNum(data.video_count)} video(s) published.`,
        },
      ]
    : [];

  return (
    <div data-tool="channel-inspect">
      <PageHeader icon="🔍" title="Channel Inspector" sub="Audit an existing channel — see what is missing, fix it here." />

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="glass space-y-5 p-8">
          <div>
            <label className="mb-2 block font-semibold">Channel to inspect</label>
            <select className="field" value={channelId} onChange={(e) => { setChannelId(e.target.value); setData(null); }}>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button className="btn btn-primary w-full py-4 text-lg" disabled={!channelId || loading} onClick={() => void inspect()}>
            {loading ? "Inspecting…" : "🔍 Inspect this channel"}
          </button>
          {channels.length === 0 && (
            <p className="text-sm text-muted-foreground">No channel connected yet. Connect YouTube first (TopBar), then inspect.</p>
          )}
        </div>

        {data && (
          <>
            <div className="glass flex items-center gap-4 p-6">
              {data.profile_pic_url && (
                <img src={data.profile_pic_url} alt="" className="h-16 w-16 rounded-full" />
              )}
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold">{data.title}</h3>
                {data.handle && <p className="text-sm text-muted-foreground">@{data.handle}</p>}
                <p className="mt-1 text-sm text-muted-foreground">
                  {fmtNum(data.subscriber_count)} subscribers · {fmtNum(data.video_count)} videos · {fmtNum(data.view_count)} views
                </p>
              </div>
            </div>

            <div className="glass space-y-3 p-6">
              <h3 className="font-semibold">Audit — what is missing or weak</h3>
              {checks.map((c) => (
                <div key={c.label} className="flex gap-3 rounded-xl border border-border p-3">
                  <span className="text-lg">{c.ok ? "✓" : c.warn ? "⚠" : "✗"}</span>
                  <div>
                    <p className="font-semibold">{c.label}</p>
                    <p className="text-sm text-muted-foreground">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Fix it here — then Apply</h3>
                <button className="btn btn-ghost btn-sm" disabled={suggestLoading} onClick={() => void suggest()}>
                  {suggestLoading ? "Suggesting…" : "✨ Suggest improvements"}
                </button>
              </div>
              {suggestError && <p className="text-sm text-destructive">{suggestError}</p>}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-semibold">About / Description</label>
                  {promptBtn("description")}
                </div>
                <textarea className="field w-full text-sm leading-relaxed" rows={6} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-semibold">Keywords <span className="text-muted-foreground">(comma separated)</span></label>
                  {promptBtn("tags")}
                </div>
                <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="keyword one, keyword two" />
              </div>
              <div>
                <label className="mb-2 block font-semibold">Banner</label>
                {data.banner_url && !bannerUrl && (
                  <img src={data.banner_url} alt="Current banner" className="w-full rounded-xl" />
                )}
                {bannerUrl && (
                  <img src={bannerUrl} alt="New banner" className="w-full rounded-xl" />
                )}
                {!data.banner_url && !bannerUrl && (
                  <p className="text-sm text-muted-foreground">No banner set on this channel.</p>
                )}
                <button className="btn btn-ghost mt-3" disabled={bannerLoading} onClick={() => void genBanner()}>
                  {bannerLoading ? "Generating…" : bannerUrl ? "↻ Regenerate banner" : "🎨 Generate a banner"}
                </button>
              </div>
              {applyError && <p className="text-sm text-destructive">{applyError}</p>}
              <button className="btn btn-primary w-full py-4 text-lg" disabled={!desc.trim() || applyLoading} onClick={() => void apply()}>
                {applyLoading ? "Applying…" : "✓ Apply these fixes to the channel"}
              </button>
              {applyResult && (
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p>{applyResult.updated.description ? "✓" : "✗"} Description {applyResult.updated.description ? "updated" : "not updated"}</p>
                  <p>{applyResult.updated.keywords ? "✓" : "✗"} Keywords {applyResult.updated.keywords ? "updated" : "not updated"}</p>
                  <p>{applyResult.updated.banner ? "✓ Banner uploaded" : "— Banner not changed"}</p>
                  {applyResult.errors.map((e) => (
                    <p key={e} className="text-destructive">{e}</p>
                  ))}
                  {applyResult.scope_note && <p className="mt-2 text-muted-foreground">{applyResult.scope_note}</p>}
                </div>
              )}
            </div>

            <div className="glass space-y-3 p-6">
              <h3 className="font-semibold">Do these in YouTube Studio (the API cannot change them)</h3>
              <p className="text-sm text-muted-foreground">
                <b>Channel name</b> — change it in YouTube Studio → Customization → Profile. The API cannot rename a channel.
              </p>
              <p className="text-sm text-muted-foreground">
                <b>Profile picture / logo</b> — upload it in YouTube Studio → Customization → Profile. The API cannot set it.
              </p>
              <p className="text-sm text-muted-foreground">
                <b>Handle</b> — set it in YouTube Studio → Customization → Profile. Pick one that matches the channel name.
              </p>
              <a className="text-sm text-primary underline" href="https://studio.youtube.com/channel/customization" target="_blank" rel="noreferrer">
                Open YouTube Studio → Customization
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
