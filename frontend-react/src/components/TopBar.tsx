import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-store";

export function TopBar() {
  const { credits, licensed, licenseKey, licenseError, activate } = useApp();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl btn-primary p-0 text-lg">▶</span>
          <span className="font-display text-xl font-bold">YT <span className="text-gradient">Guru</span></span>
        </Link>
        <nav className="ml-6 hidden gap-1 md:flex">
          {[
            ["/cover", "Cover Video"],
            ["/voice", "Text to Voice"],
            ["/auto-video", "Auto Video"],
            ["/presets", "Presets"],
          ].map(([to, label]) => (
            <Link key={to} to={to as "/cover"} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {licensed && credits !== null && (
            <span className="chip"><span className="text-amber">◆</span>{credits} credits</span>
          )}
          <div className="relative">
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
                  </>
                )}
              </div>
            )}
          </div>
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
