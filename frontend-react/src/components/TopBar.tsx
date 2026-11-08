import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-store";
import { connectYoutubeFlow, youtubeStatus } from "@/lib/api";
import { SETUP_DOWNLOAD_URL } from "@/lib/setup";

export function TopBar() {
  const { credits, licensed, installed, licenseKey, licenseError, activate } = useApp();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // YouTube connect, always visible (user, 2026-11-07): the channel
  // link is needed in many tools, not just the Channel Wizard, so
  // it lives up here. Connected state comes from /api/youtube/status.
  const [ytConnected, setYtConnected] = useState<boolean | null>(null);
  const [ytChannel, setYtChannel] = useState("");
  const [ytBusy, setYtBusy] = useState(false);
  const [ytError, setYtError] = useState("");

  const refreshYt = async () => {
    try {
      const s = await youtubeStatus();
      setYtConnected(s.connected);
      setYtChannel(s.channels?.[0]?.title ?? "");
    } catch {
      setYtConnected(false);
    }
  };

  useEffect(() => {
    void refreshYt();
  }, []);

  const connectYt = async () => {
    if (ytBusy) return;
    setYtBusy(true);
    setYtError("");
    try {
      const ok = await connectYoutubeFlow();
      if (ok) await refreshYt();
      else setYtError("Sign-in did not finish. Try again.");
    } catch (e) {
      setYtError(e instanceof Error ? e.message : "Could not start the YouTube sign-in.");
    } finally {
      setYtBusy(false);
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
          {installed && (ytConnected === true ? (
            <span className="chip" title={ytChannel || "YouTube connected"}>
              <span className="text-red-500">▶</span>
              {ytChannel ? ` ${ytChannel}` : " YouTube"}
            </span>
          ) : ytConnected === false ? (
            <button className="btn btn-sm btn-ghost" disabled={ytBusy} onClick={() => void connectYt()} title={ytError || "Connect your YouTube channel — needed to upload videos"}>
              {ytBusy ? "Waiting for Google sign-in…" : "🔗 Connect YouTube"}
            </button>
          ) : null)}
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
