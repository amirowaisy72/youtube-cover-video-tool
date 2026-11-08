import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/channel")({
  component: ChannelWizard,
});

type GenerateResult = { names: string[]; description: string; tags: string[] };
type BrandingResult = { banner_file: string; logo_file: string; banner_url: string; logo_url: string };
type ChannelInfo = { id: string; title: string };
type StatusResult = { connected: boolean; channels: ChannelInfo[]; message: string };
type ApplyResult = {
  updated: { description: boolean; keywords: boolean; banner: boolean };
  channel: { id: string; title: string };
  errors: string[];
  scope_note: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const CREATE_CHANNEL_URL = "https://www.youtube.com/create_channel";

function ChannelWizard() {
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gen, setGen] = useState<GenerateResult | null>(null);
  const [pickedName, setPickedName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [style, setStyle] = useState("violet");
  const [tagline, setTagline] = useState("");
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState("");
  const [brand, setBrand] = useState<BrandingResult | null>(null);

  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [applyDesc, setApplyDesc] = useState("");
  const [applyTags, setApplyTags] = useState("");
  const [useBanner, setUseBanner] = useState(true);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");

  const doCopy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    }
  };

  const generate = async () => {
    if (!niche.trim() || loading) return;
    setLoading(true);
    setError("");
    setGen(null);
    setPickedName("");
    try {
      const data = await api<GenerateResult>("/api/channel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim(), keywords: keywords.trim() || undefined }),
      });
      setGen(data);
      const firstName = data.names[0];
      if (firstName) setPickedName(firstName);
      setApplyDesc(data.description);
      setApplyTags(data.tags.join(", "));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate channel details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateBranding = async () => {
    if (!pickedName.trim() || brandLoading) return;
    setBrandLoading(true);
    setBrandError("");
    setBrand(null);
    try {
      const data = await api<BrandingResult>("/api/channel/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pickedName.trim(), tagline: tagline.trim() || undefined, style }),
      });
      setBrand(data);
    } catch (e) {
      setBrandError(e instanceof ApiError ? e.message : "Could not generate the banner and logo. Please try again.");
    } finally {
      setBrandLoading(false);
    }
  };

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const data = await api<StatusResult>("/api/channel/status");
      setStatus(data);
      const firstChannel = data.channels[0];
      if (firstChannel) setChannelId(firstChannel.id);
    } catch {
      setStatus({ connected: false, channels: [], message: "Could not check the YouTube connection." });
    } finally {
      setStatusLoading(false);
    }
  };

  const connectYoutube = async () => {
    if (connectLoading) return;
    setConnectLoading(true);
    setConnectError("");
    try {
      const data = await api<{ auth_url: string }>("/api/youtube/connect-start", { method: "POST" });
      if (data.auth_url) window.open(data.auth_url, "_blank");
      // Poll until the sign-in finishes (or fails) — same flow as the old Admin connect button.
      for (let i = 0; i < 150; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const st = await api<{ in_progress: boolean; error: string; connected: boolean }>("/api/youtube/connect-status");
        if (st.error) {
          setConnectError(st.error);
          break;
        }
        // Wait until THIS sign-in finishes — "connected" is already true
        // when another channel is connected, so it alone cannot mean
        // this sign-in is done.
        if (!st.in_progress) {
          if (st.connected) await loadStatus();
          break;
        }
      }
    } catch (e) {
      setConnectError(e instanceof ApiError ? e.message : "Could not start the YouTube sign-in. Please try again.");
    } finally {
      setConnectLoading(false);
    }
  };

  useEffect(() => {
    if (step === 4) loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const apply = async () => {
    if (!applyDesc.trim() || applyLoading) return;
    setApplyLoading(true);
    setApplyError("");
    setApplyResult(null);
    try {
      const data = await api<ApplyResult>("/api/channel/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: applyDesc.trim(),
          tags: applyTags.trim(),
          banner_file: useBanner && brand ? brand.banner_file : undefined,
          channel_id: channelId || undefined,
        }),
      });
      setApplyResult(data);
    } catch (e) {
      setApplyError(e instanceof ApiError ? e.message : "Could not apply the settings. Please try again.");
    } finally {
      setApplyLoading(false);
    }
  };

  const steps = ["Details", "Branding", "Create channel", "Apply"];

  return (
    <div>
      <PageHeader icon="📺" title="Channel Setup Wizard" sub="Prepare a new YouTube channel — names, description, tags, banner and logo — then create it on YouTube." />

      <div className="glass mx-auto mb-6 max-w-2xl p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Honest note: YouTube does not let any app create a channel, set its name, or set its logo.
          This wizard prepares everything SEO-ready and applies what the API allows (About description,
          keywords and banner) to a channel you connect.
        </p>
        <div className="mt-4 flex gap-2">
          {steps.map((s, i) => (
            <button
              key={s}
              className="chip flex-1 justify-center py-2"
              data-on={step === i + 1}
              onClick={() => setStep(i + 1)}
              style={step === i + 1 ? { background: "var(--gradient-primary)", color: "var(--primary-foreground)" } : undefined}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="glass space-y-5 p-8">
            <div>
              <label className="mb-2 block font-semibold">Your niche</label>
              <input
                className="field text-lg"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                placeholder="e.g. Tech Gadgets, Cooking, AI News"
              />
            </div>
            <div>
              <label className="mb-2 block font-semibold">Keywords <span className="text-muted-foreground">(optional, comma separated)</span></label>
              <input
                className="field"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                placeholder="e.g. gadgets, reviews, unboxing"
              />
            </div>
            <button className="btn btn-primary w-full py-4 text-lg" disabled={!niche.trim() || loading} onClick={generate}>
              {loading ? "Generating…" : "✨ Generate channel details"}
            </button>
            {error && <p className="text-sm text-amber">{error}</p>}
          </div>

          {gen && (
            <>
              <div className="glass p-6">
                <h3 className="mb-4 font-semibold">Channel names — click to pick one</h3>
                <div className="space-y-2">
                  {gen.names.map((n) => (
                    <button
                      key={n}
                      onClick={() => setPickedName(n)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:border-primary"
                      style={pickedName === n ? { borderColor: "var(--primary)" } : undefined}
                    >
                      <span className="font-display text-lg font-bold text-gradient">{pickedName === n ? "●" : "○"}</span>
                      <span className="flex-1 font-semibold">{n}</span>
                      <span className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); doCopy(`name-${n}`, n); }}>
                        {copied === `name-${n}` ? "✓ Copied" : "⧉ Copy"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">About / Description</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => doCopy("desc", gen.description)}>
                    {copied === "desc" ? "✓ Copied" : "⧉ Copy description"}
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{gen.description}</p>
              </div>

              <div className="glass p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Tags</h3>
                  <button className="btn btn-amber btn-sm" onClick={() => doCopy("tags", gen.tags.join(", "))}>
                    {copied === "tags" ? "✓ Copied" : "⧉ Copy all tags"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gen.tags.map((tag) => (
                    <button key={tag} className="chip" onClick={() => doCopy(`tag-${tag}`, tag)}>
                      {copied === `tag-${tag}` ? "✓ " : ""}{tag}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary w-full py-4 text-lg" onClick={() => setStep(2)}>
                Continue to branding →
              </button>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="glass space-y-5 p-8">
            <p className="text-sm text-muted-foreground">
              Channel name: <span className="font-semibold text-foreground">{pickedName || "— pick a name in Step 1 first —"}</span>
            </p>
            <div>
              <label className="mb-2 block font-semibold">Tagline <span className="text-muted-foreground">(optional, shown on the banner)</span></label>
              <input
                className="field"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. New videos every week"
              />
            </div>
            <div>
              <label className="mb-2 block font-semibold">Style</label>
              <div className="seg">
                {(["violet", "ocean", "sunset"] as const).map((s) => (
                  <button key={s} data-on={style === s} onClick={() => setStyle(s)}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary w-full py-4 text-lg" disabled={!pickedName.trim() || brandLoading} onClick={generateBranding}>
              {brandLoading ? "Generating…" : "🎨 Generate banner & logo"}
            </button>
            {brandError && <p className="text-sm text-amber">{brandError}</p>}
          </div>

          {brand && (
            <>
              <div className="glass p-6">
                <h3 className="mb-4 font-semibold">Banner (2560×1440)</h3>
                <img src={brand.banner_url} alt="Channel banner" className="w-full rounded-xl" />
                <a href={brand.banner_url} download={brand.banner_file} className="btn btn-amber mt-4 w-full">
                  ⬇ Download banner
                </a>
              </div>
              <div className="glass p-6">
                <h3 className="mb-4 font-semibold">Logo (800×800)</h3>
                <img src={brand.logo_url} alt="Channel logo" className="mx-auto w-48 rounded-xl" />
                <p className="mt-3 text-sm text-muted-foreground">
                  YouTube&apos;s API cannot set a channel logo — download the logo and upload it yourself
                  on YouTube (YouTube Studio → Customization → Profile picture).
                </p>
                <a href={brand.logo_url} download={brand.logo_file} className="btn btn-amber mt-4 w-full">
                  ⬇ Download logo
                </a>
              </div>
              <button className="btn btn-primary w-full py-4 text-lg" onClick={() => setStep(3)}>
                Continue to create the channel →
              </button>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="glass space-y-5 p-8 text-center">
            <h3 className="text-xl font-bold">Create the channel on YouTube</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              YouTube only lets you create a channel on its own website — no app can do it for you.
              Click below, sign in with Google, and create the channel with the name you picked.
            </p>
            <a href={CREATE_CHANNEL_URL} target="_blank" rel="noreferrer" className="btn btn-primary w-full py-4 text-lg">
              ▶ Create Channel on YouTube
            </a>
            <div className="space-y-2 text-left text-sm">
              <p className="font-semibold">Checklist — once the channel exists:</p>
              <p>☐ Paste the channel name: <span className="font-semibold">{pickedName || "(pick one in Step 1)"}</span></p>
              <p>☐ Paste the About description (Step 1 — Copy button)</p>
              <p>☐ Upload the logo as your profile picture (YouTube Studio → Customization)</p>
              <p>☐ Upload the banner (YouTube Studio → Customization → Banner image)</p>
              <p>☐ Connect the channel in Step 4 afterwards, so Step 4 can apply the details for you.</p>
            </div>
            <button className="btn btn-ghost w-full py-3" onClick={() => setStep(4)}>
              I created it — continue to Step 4 →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="glass space-y-5 p-8">
            <h3 className="text-xl font-bold">Apply to my connected channel</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This sets the About description, keywords and banner on the channel you already connected.
              It cannot change the channel name or logo — those are set by hand on YouTube.
            </p>
            {statusLoading && <p className="text-sm">Checking the YouTube connection…</p>}
            {status && !status.connected && (
              <div className="rounded-xl border border-border p-4 text-sm leading-relaxed">
                <p className="font-semibold">No YouTube account is connected yet.</p>
                <p className="mt-2 text-muted-foreground">
                  Press the button below, sign in with Google in the tab that opens, then come back here —
                  the connection is checked automatically. One-time note: Apply needs the full YouTube
                  permission, so if you connected before, sign in again once to grant it.
                </p>
                <button className="btn btn-primary mt-4 w-full py-3" disabled={connectLoading} onClick={connectYoutube}>
                  {connectLoading ? "Waiting for Google sign-in…" : "🔗 Connect YouTube account"}
                </button>
                {connectError && <p className="mt-3 text-sm text-amber">{connectError}</p>}
                <button className="btn btn-ghost btn-sm mt-3" onClick={loadStatus}>↻ Refresh connection status</button>
              </div>
            )}
            {status && status.connected && (
              <>
                <div>
                  <label className="mb-2 block font-semibold">Channel</label>
                  {status.channels.length ? (
                    <select className="field" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                      {status.channels.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Connected, but no channel could be listed for this sign-in. Uploads still work with the
                      default sign-in; disconnect and connect again if the channel list stays empty.
                    </p>
                  )}
                </div>
                <div>
                  <button className="btn btn-ghost btn-sm" disabled={connectLoading} onClick={() => void connectYoutube()}>
                    {connectLoading ? "Waiting for Google sign-in…" : "🔗 Connect another channel"}
                  </button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your new channel is not listed yet? Connect it here — sign in with Google and pick the new
                    channel, then it appears in the list above.
                  </p>
                  {connectError && <p className="mt-2 text-sm text-amber">{connectError}</p>}
                </div>
                <div>
                  <label className="mb-2 block font-semibold">About / Description</label>
                  <textarea className="field" rows={5} value={applyDesc} onChange={(e) => setApplyDesc(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block font-semibold">Tags <span className="text-muted-foreground">(comma separated)</span></label>
                  <input className="field" value={applyTags} onChange={(e) => setApplyTags(e.target.value)} />
                </div>
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={useBanner} onChange={(e) => setUseBanner(e.target.checked)} />
                  Also upload the generated banner {brand ? "" : "(generate one in Step 2 first)"}
                </label>
                <button className="btn btn-primary w-full py-4 text-lg" disabled={!applyDesc.trim() || applyLoading} onClick={apply}>
                  {applyLoading ? "Applying…" : "🚀 Apply to my channel"}
                </button>
                {applyError && <p className="text-sm text-amber">{applyError}</p>}
              </>
            )}
          </div>

          {applyResult && (
            <div className="glass p-6">
              <h3 className="mb-4 font-semibold">Result — {applyResult.channel.title || applyResult.channel.id}</h3>
              <div className="space-y-2 text-sm">
                <p>{applyResult.updated.description ? "✓" : "✗"} About description {applyResult.updated.description ? "updated" : "not updated"}</p>
                <p>{applyResult.updated.keywords ? "✓" : "✗"} Keywords {applyResult.updated.keywords ? "updated" : "not updated"}</p>
                <p>{applyResult.updated.banner ? "✓ Banner uploaded" : "— Banner not uploaded"}</p>
              </div>
              {applyResult.errors.length > 0 && (
                <div className="mt-4 space-y-2 text-sm text-amber">
                  {applyResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
              {applyResult.scope_note && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{applyResult.scope_note}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
