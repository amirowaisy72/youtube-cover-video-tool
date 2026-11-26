import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ColabLight, openColab, useColab } from "@/components/ColabPanel";
import { ttsQuota, validateStockKey, youtubeStatus } from "@/lib/api";
import { useApp } from "@/lib/app-store";
import { getKey, installDashboardButton, KEY_INFO, type KeyId, type KeyInfo, maskKey, setKey, useKey } from "@/lib/config";

installDashboardButton();

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type Test = { state: "idle" | "testing" | "ok" | "bad" | "unknown"; note: string };

const GROUPS: { id: KeyInfo["group"]; title: string; sub: string }[] = [
  { id: "media", title: "🎞 Stock footage, music & sounds", sub: "Free keys. Without them the tools fall back to free Wikimedia footage and the built-in music pack." },
  { id: "ai", title: "🧠 AI", sub: "Free key. Without it the app uses the free Pollinations AI (slower, shorter answers)." },
  { id: "voice", title: "🎙 Paid voice providers (optional)", sub: "Only if you use these voices. The free Edge voices, acting voices and cloned voices need no key." },
];

async function testKey(id: KeyId, key: string): Promise<Test> {
  try {
    if (id === "pexels" || id === "pixabay" || id === "freesound") {
      const r = await validateStockKey(id, key);
      if (r.valid) return { state: "ok", note: "Working" };
      return r.reason === "invalid" ? { state: "bad", note: "Rejected — wrong or revoked key" } : { state: "unknown", note: "Could not check right now" };
    }
    if (id === "gemini" || id === "youtube") {
      const res = await fetch("/api/animator/config/test-key", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: id, key }),
      });
      const r = (await res.json()) as { valid: boolean; reason: string };
      if (r.valid) return { state: "ok", note: "Working" };
      return r.reason === "invalid" ? { state: "bad", note: "Rejected — wrong key" } : { state: "unknown", note: "Could not check right now" };
    }
    await ttsQuota(id, key);
    return { state: "ok", note: "Working" };
  } catch (e) {
    return { state: "bad", note: e instanceof Error ? e.message.slice(0, 120) : "Rejected" };
  }
}

function StatusPill({ ok, warn, text }: { ok: boolean; warn?: boolean; text: string }) {
  const cls = ok ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
    : warn ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-border bg-white/5 text-muted-foreground";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

function KeyRow({ info }: { info: KeyInfo }) {
  const saved = useKey(info.id);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [test, setTest] = useState<Test>({ state: "idle", note: "" });

  const runTest = async (k: string) => {
    setTest({ state: "testing", note: "Checking…" });
    setTest(await testKey(info.id, k));
  };
  const save = async () => {
    const k = val.trim();
    if (!k) return;
    setKey(info.id, k);
    setEditing(false);
    setVal("");
    await runTest(k);
  };
  const remove = () => {
    setKey(info.id, "");
    setTest({ state: "idle", note: "" });
  };

  const pill = !saved ? <StatusPill ok={false} text="○ Not set" />
    : test.state === "bad" ? <StatusPill ok={false} warn text="✗ Rejected" />
    : test.state === "ok" ? <StatusPill ok text="✓ Working" />
    : <StatusPill ok text="✓ Saved" />;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{info.label}</span>
            {pill}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{info.what}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Used by: {info.usedBy}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saved && !editing && <code className="rounded bg-white/5 px-2 py-1 text-xs">{maskKey(saved)}</code>}
          {saved && !editing && (
            <button className="btn btn-ghost btn-sm" disabled={test.state === "testing"} onClick={() => void runTest(saved)}>
              {test.state === "testing" ? "Checking…" : "Test"}
            </button>
          )}
          {!editing && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>{saved ? "Change" : "+ Add key"}</button>}
          {saved && !editing && <button className="btn btn-ghost btn-sm" onClick={remove}>Remove</button>}
        </div>
      </div>
      {test.note && test.state !== "testing" && (
        <p className={`mt-2 text-xs ${test.state === "ok" ? "text-emerald-300" : test.state === "bad" ? "text-amber-300" : "text-muted-foreground"}`}>{test.note}</p>
      )}
      {editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="field min-w-0 flex-1" type="password" autoFocus value={val} placeholder={info.placeholder}
            onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void save(); }} />
          <button className="btn btn-primary btn-sm" disabled={!val.trim()} onClick={() => void save()}>Save</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setVal(""); }}>Cancel</button>
          <a className="btn btn-ghost btn-sm" href={info.getUrl} target="_blank" rel="noreferrer">Get a free key ↗</a>
        </div>
      )}
    </div>
  );
}

type Engine = { installed: boolean; installing: boolean; device: string | null; model_cached: boolean };

function ColabRow() {
  const st = useColab();
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">⚡ Google Colab (free GPU)</span>
            {st && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold"><ColabLight st={st} /></span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Makes your cloned and acting voices on Google's graphics chip, much faster than this computer. One notebook, with a picture guide.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Used by: Story Animator, Auto Video, Visual Explainer (cloned & acting voices)</p>
          {st?.error && <p className="mt-1 text-xs text-amber-300">{st.error}</p>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={openColab}>⚡ Connect Google Colab</button>
      </div>
    </div>
  );
}

function EngineRow() {
  const [st, setSt] = useState<Engine | null>(null);
  useEffect(() => {
    fetch("/api/voiceclone/status").then((r) => r.json()).then((d) => setSt(d as Engine)).catch(() => setSt(null));
  }, []);
  const pill = !st ? <StatusPill ok={false} text="…" />
    : st.installing ? <StatusPill ok={false} warn text="⏳ Installing" />
    : st.installed ? <StatusPill ok text={`✓ Installed${st.device ? ` · ${st.device.toUpperCase()}` : ""}`} />
    : <StatusPill ok={false} text="○ Not installed" />;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="font-semibold">🎭 Voice engine (acting + cloning)</span>{pill}</div>
          <p className="mt-1 text-sm text-muted-foreground">Free engine on this computer for acting voices and your cloned voices. Set up once.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Used by: Story Animator, Auto Video, Voice Cloner</p>
        </div>
        <Link to="/voice-clone" className="btn btn-ghost btn-sm">{st?.installed ? "Open Voice Cloner" : "Set it up →"}</Link>
      </div>
    </div>
  );
}

function GraphicsRow() {
  const [st, setSt] = useState<{ installed: boolean; installing: boolean; error: string } | null>(null);
  const load = () => fetch("/api/animator/graphics/status").then((r) => r.json()).then(setSt).catch(() => setSt(null));
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!st?.installing) return;
    const t = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(t);
  }, [st?.installing]);
  const install = async () => { await fetch("/api/animator/graphics/install", { method: "POST" }); void load(); };
  const pill = !st ? <StatusPill ok={false} text="…" /> : st.installing ? <StatusPill ok={false} warn text="⏳ Installing" />
    : st.installed ? <StatusPill ok text="✓ Installed" /> : <StatusPill ok={false} text="○ Not installed" />;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="font-semibold">📊 Motion graphics engine (Manim + physics)</span>{pill}</div>
          <p className="mt-1 text-sm text-muted-foreground">Free. Animated explainer graphics: counting money, bars, lists, timelines, meters, coins piling up, stacks falling…</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Used by: Auto Video (graphics scenes), Story Animator (graphic panels)</p>
          {st?.error && <p className="mt-1 text-xs text-amber-300">{st.error}</p>}
        </div>
        {st && !st.installed && <button className="btn btn-primary btn-sm" disabled={st.installing} onClick={() => void install()}>{st.installing ? "Installing…" : "Install (free)"}</button>}
      </div>
    </div>
  );
}

function YoutubeRow() {
  const [st, setSt] = useState<{ connected: boolean; channels?: { id: string; title: string }[] } | null>(null);
  useEffect(() => { youtubeStatus().then(setSt).catch(() => setSt({ connected: false })); }, []);
  const n = st?.channels?.length ?? 0;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">▶ YouTube channels</span>
            {!st ? <StatusPill ok={false} text="…" /> : st.connected ? <StatusPill ok text={`✓ ${n} connected`} /> : <StatusPill ok={false} text="○ Not connected" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {st?.channels?.length ? st.channels.map((c) => c.title).join(" · ") : "Connect a channel for uploads and channel tools."}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Add or switch channels from the YouTube button at the top right.</p>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { licensed, credits } = useApp();
  const [, force] = useState(0);
  useEffect(() => {
    const on = () => force((n) => n + 1);
    window.addEventListener("ytguru-config-changed", on);
    return () => window.removeEventListener("ytguru-config-changed", on);
  }, []);
  const setCount = KEY_INFO.filter((k) => getKey(k.id)).length;
  const missing = KEY_INFO.filter((k) => k.group !== "voice" && !getKey(k.id)).map((k) => k.label);

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24">
      <PageHeader icon="⚙" title="Dashboard" sub="Every key and setting in one place. Set it here once — every tool uses it." />

      <div className="glass mb-6 flex flex-wrap items-center gap-3 p-4">
        <StatusPill ok={setCount > 0} text={`${setCount} of ${KEY_INFO.length} keys set`} />
        <StatusPill ok={licensed} text={licensed ? `✓ Licensed${credits !== null ? ` · ${credits} credits` : ""}` : "○ Not licensed"} />
        {missing.length > 0
          ? <span className="text-sm text-muted-foreground">Still free to add: {missing.join(", ")}</span>
          : <span className="text-sm text-emerald-300">All the free keys are set 🎉</span>}
      </div>

      <div className="glass mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/visual" className="rounded-xl border border-border p-3 hover:bg-white/5">
          <p className="font-semibold">🎨 Visual Explainer</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Explainers made only of animated drawings, with a sound for every motion.</p>
        </Link>
        <Link to="/research" className="rounded-xl border border-border p-3 hover:bg-white/5">
          <p className="font-semibold">🔎 Topic Research Lab</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Next video topic, trending (any country / worldwide), small-channel wins, niche finder.</p>
        </Link>
        <Link to="/new-channel" className="rounded-xl border border-border p-3 hover:bg-white/5">
          <p className="font-semibold">🚀 New Channel Wizard</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Niche, name, description, all settings, and when to post the first video.</p>
        </Link>
        <Link to="/research" className="rounded-xl border border-border p-3 hover:bg-white/5" onClick={() => { try { localStorage.setItem("ytguru-rl-tab", "doctor"); } catch { /* private mode */ } }}>
          <p className="font-semibold">🩺 Channel Doctor</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Why your channel is not getting views — measured problems and the fixes.</p>
        </Link>
      </div>

      <Link to="/downloads" className="glass mb-6 flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-white/5">
        <span>
          <span className="font-semibold">⬇ Downloads</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">The optional parts (speech recogniser, motion graphics, lip-sync, cloned voice…): what is installed, its size, download or remove.</span>
        </span>
        <span className="btn btn-secondary btn-sm">Open →</span>
      </Link>

      {GROUPS.map((g) => (
        <section key={g.id} className="mb-8">
          <h2 className="font-display text-lg font-bold">{g.title}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{g.sub}</p>
          <div className="grid gap-3">{KEY_INFO.filter((k) => k.group === g.id).map((k) => <KeyRow key={k.id} info={k} />)}</div>
        </section>
      ))}

      <section className="mb-8">
        <h2 className="font-display text-lg font-bold">🖥 Voice engines</h2>
        <p className="mb-3 text-sm text-muted-foreground">Where the acting and cloned voices are made.</p>
        <div className="grid gap-3"><EngineRow /><ColabRow /><GraphicsRow /></div>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-lg font-bold">🧭 Script Planner & add-on packs</h2>
        <div className="mt-3 rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Paste a planned script: see what the app cannot show yet, get one prompt for ChatGPT / Gemini, and add the file it makes
            (new places, actions, things, outfits, sounds, character looks).
          </p>
          <Link to="/planner" className="btn btn-primary btn-sm mt-3">Open the Script Planner →</Link>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-lg font-bold">🔗 Accounts</h2>
        <div className="mt-3 grid gap-3"><YoutubeRow /></div>
      </section>

      <p className="text-xs text-muted-foreground">
        Keys are kept only on this computer (in this browser) and are sent only to the service they belong to.
      </p>
    </div>
  );
}
