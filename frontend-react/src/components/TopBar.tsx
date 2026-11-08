import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-store";
import { connectYoutubeFlow, saveYoutubeCredentials, youtubeStatus } from "@/lib/api";
import { SETUP_DOWNLOAD_URL } from "@/lib/setup";

export function TopBar() {
  const { credits, licensed, installed, licenseKey, licenseError, activate, activeChannelId, setActiveChannelId } = useApp();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // YouTube connect, always visible (user, 2026-11-07): the channel
  // link is needed in many tools, not just the Channel Wizard, so
  // it lives up here. Connected state comes from /api/youtube/status.
  const [ytConnected, setYtConnected] = useState<boolean | null>(null);
  const [ytChannel, setYtChannel] = useState("");
  const [ytChannels, setYtChannels] = useState<{ id: string; title: string }[]>([]);
  // Channel switcher (user, 2026-11-09): the chip opens a menu with
  // every connected channel plus "Connect another channel", so any
  // channel can be added and picked for uploads and other tools.
  const [ytMenuOpen, setYtMenuOpen] = useState(false);
  const [ytBusy, setYtBusy] = useState(false);
  const [ytError, setYtError] = useState("");
  // First-time YouTube setup (user, 2026-11-08): a fresh install has
  // NO client_secrets.json, so Connect failed with a 400 — and the
  // error only lived in the button's hover tooltip, so the user saw
  // "nothing happens". The setup panel below shows the error IN the
  // UI and lets anyone paste their Google OAuth Client ID + Secret
  // (free, one-time) instead of hunting for a file to copy.
  const [ytSecretsPresent, setYtSecretsPresent] = useState<boolean | null>(null);
  const [ytSetupOpen, setYtSetupOpen] = useState(false);
  const [ytClientId, setYtClientId] = useState("");
  const [ytClientSecret, setYtClientSecret] = useState("");
  const [ytSetupMsg, setYtSetupMsg] = useState("");
  const [ytSetupBusy, setYtSetupBusy] = useState(false);

  const refreshYt = async (): Promise<{ id: string; title: string }[]> => {
    try {
      const s = await youtubeStatus();
      setYtConnected(s.connected);
      const chans = s.channels ?? [];
      setYtChannels(chans);
      setYtChannel(chans[0]?.title ?? "");
      setYtSecretsPresent(s.client_secrets_present ?? null);
      return chans;
    } catch {
      setYtConnected(false);
      return [];
    }
  };

  useEffect(() => {
    void refreshYt();
  }, []);

  // Default the active channel to the first connected one when
  // nothing is picked yet (or the picked one is gone).
  useEffect(() => {
    if (ytChannels.length && (!activeChannelId || !ytChannels.some((c) => c.id === activeChannelId))) {
      setActiveChannelId(ytChannels[0]!.id);
    }
  }, [ytChannels, activeChannelId, setActiveChannelId]);

  const activeChannelTitle =
    ytChannels.find((c) => c.id === activeChannelId)?.title ?? ytChannel;

  const connectYt = async () => {
    if (ytBusy) return;
    setYtBusy(true);
    setYtError("");
    const beforeIds = new Set(ytChannels.map((c) => c.id));
    try {
      const ok = await connectYoutubeFlow();
      if (ok) {
        const fresh = await refreshYt();
        setYtSetupOpen(false);
        setYtMenuOpen(false);
        // Make the just-connected channel the active one.
        const added = fresh.find((c) => !beforeIds.has(c.id));
        if (added) setActiveChannelId(added.id);
      } else {
        setYtError("Sign-in did not finish. Try again.");
        setYtSetupOpen(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start the YouTube sign-in.";
      setYtError(msg);
      // Any connect failure opens the setup panel, so the error is
      // VISIBLE in the UI instead of hidden in a hover tooltip.
      setYtSetupOpen(true);
    } finally {
      setYtBusy(false);
    }
  };

  const saveYtCredentials = async () => {
    if (!ytClientId.trim() || !ytClientSecret.trim()) {
      setYtError("Paste both the Client ID and the Client Secret first.");
      return;
    }
    setYtSetupBusy(true);
    setYtSetupMsg("");
    setYtError("");
    try {
      await saveYoutubeCredentials(ytClientId.trim(), ytClientSecret.trim());
      setYtSecretsPresent(true);
      setYtSetupMsg("✓ Saved on this computer. Now press Connect YouTube and sign in with Google.");
    } catch (e) {
      setYtError(e instanceof Error ? e.message : "Could not save. Check both values and try again.");
    } finally {
      setYtSetupBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl btn-primary p-0 text-lg">▶</span>
          <span className="font-display text-xl font-bold">YT <span className="text-gradient">Guru</span></span>
        </Link>
        {/* Top nav removed entirely (user, 2026-11-07): the names up
            here are gone. Every tool, including Presets, is reached
            from Home, and each page has a ← Home button. */}
        <div className="ml-auto flex items-center gap-3">
          {ytConnected === true ? (
            <div className="relative">
              <button
                className="chip"
                onClick={() => setYtMenuOpen((v) => !v)}
                title="Switch YouTube channel — click to see all your channels or add another"
              >
                <span className="text-red-500">▶</span>
                {activeChannelTitle ? ` ${activeChannelTitle}` : " YouTube"} ▾
              </button>
              {ytMenuOpen && (
                <div className="glass absolute right-0 mt-3 w-72 p-3 shadow-2xl">
                  <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your channels</p>
                  {ytChannels.map((c) => (
                    <button
                      key={c.id}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-primary/10"
                      onClick={() => { setActiveChannelId(c.id); setYtMenuOpen(false); }}
                    >
                      <span className="text-red-500">▶</span>
                      <span className="flex-1 truncate font-medium">{c.title}</span>
                      {c.id === activeChannelId && <span className="text-primary">✓</span>}
                    </button>
                  ))}
                  <button
                    className="btn btn-ghost mt-2 w-full"
                    disabled={ytBusy}
                    onClick={() => void connectYt()}
                  >
                    {ytBusy ? "Waiting for Google sign-in…" : "＋ Connect another channel"}
                  </button>
                  {ytError && <p className="mt-2 text-xs text-destructive">{ytError}</p>}
                  <p className="mt-2 px-2 text-xs text-muted-foreground">
                    Uploads and channel tools use the selected channel.
                  </p>
                </div>
              )}
            </div>
          ) : ytConnected === false ? (
            <div className="relative">
              <button
                className="btn btn-sm btn-ghost"
                disabled={ytBusy}
                onClick={() => {
                  // No credentials yet: open the setup panel instead of
                  // failing silently — a first-time user has no file to
                  // copy and needs the form, not a hidden tooltip.
                  if (ytSecretsPresent === false) setYtSetupOpen(true);
                  else void connectYt();
                }}
                title="Connect your YouTube channel — needed to upload videos"
              >
                {ytBusy ? "Waiting for Google sign-in…" : "🔗 Connect YouTube"}
              </button>
              {ytSetupOpen && (
                <div className="glass absolute right-0 mt-3 w-80 p-5 shadow-2xl">
                  <h4 className="font-semibold">Connect YouTube</h4>
                  {ytError && <p className="mt-2 text-xs text-destructive">{ytError}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    YouTube needs your Google OAuth Client ID and Secret — free, one-time setup.
                    In Google Cloud Console: create a project, enable YouTube Data API v3, then
                    create an OAuth client (Desktop app) and copy the ID and Secret here.
                  </p>
                  <a className="mt-1 block text-xs text-primary underline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
                    Open Google Cloud Console →
                  </a>
                  <input
                    className="field mt-3 font-mono"
                    placeholder="Client ID (…apps.googleusercontent.com)"
                    value={ytClientId}
                    onChange={(e) => { setYtClientId(e.target.value); setYtError(""); setYtSetupMsg(""); }}
                  />
                  <input
                    className="field mt-3 font-mono"
                    type="password"
                    placeholder="Client Secret"
                    value={ytClientSecret}
                    onChange={(e) => { setYtClientSecret(e.target.value); setYtError(""); setYtSetupMsg(""); }}
                  />
                  {ytSetupMsg && <p className="mt-2 text-xs text-success">{ytSetupMsg}</p>}
                  <button className="btn btn-primary mt-3 w-full" disabled={ytSetupBusy} onClick={() => void saveYtCredentials()}>
                    {ytSetupBusy ? "Saving…" : "Save credentials"}
                  </button>
                  <button className="btn btn-ghost mt-2 w-full" disabled={ytBusy || ytSecretsPresent !== true} onClick={() => void connectYt()}>
                    {ytBusy ? "Waiting for Google sign-in…" : "🔗 Connect YouTube"}
                  </button>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Saved only on your computer — never sent anywhere except Google.
                  </p>
                </div>
              )}
            </div>
          ) : null}
          {!installed && (
            <a className="btn btn-sm btn-primary" href={SETUP_DOWNLOAD_URL} title="Download the Windows setup — installing it unlocks all tools">⬇ Install Setup</a>
          )}
          {licensed && credits !== null && (
            <span className="chip"><span className="text-amber">◆</span>{credits} credits</span>
          )}
          {installed && (<div className="relative">
            <button className={`btn btn-sm ${licensed ? "btn-ghost" : "btn-amber"}`} onClick={() => setOpen(!open)}>
              {licensed ? "✓ Licensed" : "Activate"}
            </button>
            {open && (
              <div className="glass absolute right-0 mt-3 w-80 p-5 shadow-2xl">
                {licensed ? (
                  <>
                    <h4 className="font-semibold">License active</h4>
                    <p className="mt-1 font-mono text-sm text-muted-foreground">{licenseKey}</p>
                    {credits !== null && <p className="mt-2 text-sm">Balance: <b>{credits} credit(s)</b></p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Buy more credits: WhatsApp{" "}
                      <a className="underline" href="https://wa.me/923100668952" target="_blank" rel="noreferrer">03100668952</a>
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="font-semibold">Enter your license key</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Activate the tool to make videos and voiceovers.</p>
                    <input className="field mt-3 font-mono" placeholder="YTG-XXXX-XXXX-XXXX" value={key}
                      onChange={(e) => { setKey(e.target.value); setErr(""); }} />
                    {(err || licenseError) && <p className="mt-2 text-xs text-destructive">{err || licenseError}</p>}
                    <button className="btn btn-primary mt-3 w-full" disabled={busy} onClick={async () => {
                      if (!key.trim()) { setErr("Paste your license key first."); return; }
                      setBusy(true);
                      const ok = await activate(key);
                      setBusy(false);
                      if (ok) setOpen(false);
                      else setErr("That key didn't work. Check it and try again.");
                    }}>{busy ? "Activating…" : "Activate"}</button>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Don&apos;t have a key? Get one on WhatsApp:{" "}
                      <a className="underline" href="https://wa.me/923100668952" target="_blank" rel="noreferrer">03100668952</a>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>)}
        </div>
      </div>
    </header>
  );
}

export function PageHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <Link to="/" className="btn btn-ghost btn-sm">← Home</Link>
      <span className="text-3xl">{icon}</span>
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
