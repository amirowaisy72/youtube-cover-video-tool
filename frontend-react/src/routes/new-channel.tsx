import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { useApp } from "@/lib/app-store";
import { installDashboardButton } from "@/lib/config";
import { COUNTRIES, type Cpm, cpmText, cpmTip, fmt, LANGUAGES, mdLines, research, SCORE_STYLE } from "@/lib/research";

installDashboardButton();

export const Route = createFileRoute("/new-channel")({
  component: NewChannelWizard,
});

type Profile = { interests: string; language: string; country: string; face: boolean; format: string; hours: string };
type Niche = { name: string; search: string; why: string; score: number; views_per_day: number; median_subs: number; small_wins: number; competition: number; label: string; cpm?: Cpm };
type Name = { name: string; handle: string; why: string; taken: boolean | null; owner: string; owner_subs: number };
type Details = { description?: string; short_bio?: string; keywords?: string[]; tagline?: string; links?: string[]; playlists?: string[] };
type State = { step: number; profile: Profile; niche: string; niches: Niche[]; name: string; handle: string; names: Name[]; details: Details | null; checks: Record<string, boolean>; launch: string };

const KEY = "ytguru-new-channel";
const START: State = {
  step: 0, profile: { interests: "", language: "en", country: "US", face: false, format: "both", hours: "5" },
  niche: "", niches: [], name: "", handle: "", names: [], details: null, checks: {}, launch: "",
};
const STEPS = ["You", "Niche", "Name", "Details", "Create & settings", "Launch plan"];

function loadState(): State {
  try {
    const s = { ...START, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<State>) };
    const picked = localStorage.getItem("ytguru-nc-niche");
    if (picked) { localStorage.removeItem("ytguru-nc-niche"); return { ...s, niche: picked, step: Math.max(s.step, 1) }; }
    return s;
  } catch { return START; }
}

/** The settings checklist: official YouTube Studio steps, in order. */
const CHECKLIST: { id: string; title: string; how: string; tip?: string }[] = [
  { id: "account", title: "Use a separate Google account (or a Brand Account)", how: "youtube.com → profile picture → Settings → Add or manage your channel(s) → Create a channel. A Brand Account lets you add managers later and sell/transfer the channel.", tip: "Never use your personal email name as the channel name." },
  { id: "create", title: "Create the channel with your name", how: "Type the channel name from Step 3. YouTube suggests a handle — change it to your chosen @handle." },
  { id: "verify", title: "Verify with your phone number", how: "youtube.com/verify. Unlocks videos longer than 15 minutes, custom thumbnails and live streaming.", tip: "Do this first — without it you cannot upload your own thumbnails." },
  { id: "2sv", title: "Turn on 2-Step Verification", how: "myaccount.google.com → Security → 2-Step Verification. Required for monetization and protects against hacks." },
  { id: "picture", title: "Profile picture", how: "Studio → Customization → Branding → Picture. 800×800 px, simple logo readable at tiny size.", tip: "Make it in YT Guru → Channel art." },
  { id: "banner", title: "Banner", how: "Studio → Customization → Branding → Banner. 2560×1440 px; keep text inside the middle 1546×423 px (safe on phones).", tip: "Put the tagline from Step 4 + upload days, e.g. “New video every Friday”." },
  { id: "watermark", title: "Video watermark (subscribe button)", how: "Studio → Customization → Branding → Video watermark. 150×150 px, show for the entire video." },
  { id: "about", title: "Description & links", how: "Studio → Customization → Basic info. Paste the description from Step 4, add links and a contact email (for brand deals)." },
  { id: "country", title: "Country & channel keywords", how: "Studio → Settings → Channel → Basic info. Set your country (affects monetization) and paste the channel keywords." },
  { id: "audience", title: "Audience: “No, it's not made for kids”", how: "Studio → Settings → Channel → Advanced settings. Choose “made for kids” ONLY if children are your real audience — it turns off comments and personalized ads." },
  { id: "defaults", title: "Upload defaults", how: "Studio → Settings → Upload defaults: default description (your social links + 3 hashtags), tags, category, language, license “Standard YouTube”, visibility. Saves time on every upload." },
  { id: "layout", title: "Home page layout", how: "Studio → Customization → Layout. Add a channel trailer for non-subscribers later (after 3+ videos) and sections for your playlists." },
  { id: "playlists", title: "Create the playlists", how: "Studio → Content → Playlists → New playlist. Use the names from Step 4 — playlists add watch time and session time." },
  { id: "features", title: "Check feature eligibility", how: "Studio → Settings → Channel → Feature eligibility. Make sure “Intermediate features” are on after phone verification." },
  { id: "connect", title: "Connect the channel in YT Guru", how: "Top-right channel chip → Connect channel. Then Auto Video can upload, and Research Lab uses your channel's free YouTube access." },
];

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => { void navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}>
      {done ? "✓ Copied" : "📋 Copy"}
    </button>
  );
}

function NewChannelWizard() {
  const { activeChannelId } = useApp();
  const cid = activeChannelId ?? "";
  const [s, setS] = useState<State>(loadState);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [own, setOwn] = useState("");
  const [ownName, setOwnName] = useState("");
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }, [s]);
  const up = (p: Partial<State>) => setS((o) => ({ ...o, ...p }));
  const prof = (p: Partial<Profile>) => setS((o) => ({ ...o, profile: { ...o.profile, ...p } }));
  const P = s.profile;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Failed — try again."); }
    setBusy(false);
  };
  const findNiches = () => run(async () => {
    const d = await research<{ niches: Niche[] }>("niches", { interests: P.interests, language: P.language, country: P.country, face: P.face, format: P.format, count: 8 }, cid);
    up({ niches: d.niches });
  });
  const findNames = () => run(async () => {
    const d = await research<{ names: Name[] }>("names", { niche: s.niche, language: P.language }, cid);
    up({ names: d.names });
  });
  const writeDetails = () => run(async () => {
    const d = await research<{ json: Details }>("advice", { kind: "channel", niche: s.niche, language: P.language, data: { name: s.name } }, cid);
    up({ details: d.json });
  });
  const writeLaunch = () => run(async () => {
    const pick = s.niches.find((n) => n.name === s.niche);
    const d = await research<{ text: string }>("advice", {
      kind: "launch", niche: `${s.niche} (${P.face ? "face on camera" : "faceless"}, ${P.format === "shorts" ? "Shorts first" : P.format === "long" ? "long videos" : "long videos + Shorts"}, about ${P.hours} hours a week)`,
      language: P.language, data: { name: s.name, niches: pick ? [pick] : [] },
    }, cid);
    up({ launch: d.text });
  });

  const canNext = [true, !!s.niche, !!s.name, true, true, true][s.step];
  const done = CHECKLIST.filter((c) => s.checks[c.id]).length;

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24">
      <PageHeader icon="🚀" title="New Channel Wizard" sub="From idea to first upload: niche on real data, a free name, all settings, and your launch plan." />

      <div className="mb-6 flex flex-wrap gap-1.5">
        {STEPS.map((t, i) => (
          <button key={t} className={`chip ${i === s.step ? "border-primary text-primary" : i < s.step ? "text-emerald-300" : ""}`} onClick={() => up({ step: i })}>
            {i < s.step ? "✓" : i + 1}. {t}
          </button>
        ))}
        <button className="btn btn-ghost btn-sm ml-auto" onClick={() => { if (confirm("Start the wizard again? Your answers here will be cleared.")) setS(START); }}>↺ Start over</button>
      </div>

      {s.step === 0 && (
        <div className="glass grid gap-4 p-6 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm">What do you like or know about? <span className="text-muted-foreground">(leave empty if open to anything)</span>
            <input className="field mt-1" value={P.interests} onChange={(e) => prof({ interests: e.target.value })} placeholder="e.g. cricket, stories, AI tools, cooking, history" />
          </label>
          <label className="text-sm">Video language
            <select className="field mt-1" value={P.language} onChange={(e) => prof({ language: e.target.value })}>{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
          </label>
          <label className="text-sm">Main audience country
            <select className="field mt-1" value={P.country} onChange={(e) => prof({ country: e.target.value })}>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
          </label>
          <label className="text-sm">Video type
            <select className="field mt-1" value={P.format} onChange={(e) => prof({ format: e.target.value })}>
              <option value="both">Long videos + Shorts (best)</option><option value="long">Long videos only</option><option value="shorts">Shorts only</option>
            </select>
          </label>
          <label className="text-sm">Time per week
            <select className="field mt-1" value={P.hours} onChange={(e) => prof({ hours: e.target.value })}>
              {["2", "5", "10", "20"].map((h) => <option key={h} value={h}>about {h} hours</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={P.face} onChange={(e) => prof({ face: e.target.checked })} /> I will show my face</label>
          <p className="sm:col-span-2 text-xs text-muted-foreground">Tip: English + a US/UK/Canada/Australia audience usually pays the most per view; your own language can grow faster with less competition.</p>
        </div>
      )}

      {s.step === 1 && (
        <div className="space-y-4">
          <div className="glass p-5">
            <button className="btn btn-primary" disabled={busy} onClick={() => void findNiches()}>{busy ? "Testing niches on real YouTube data…" : s.niches.length ? "↻ Find niches again" : "🧭 Find the best niches for me"}</button>
            <p className="mt-2 text-xs text-muted-foreground">Each niche is checked on today's YouTube: views per day, size of the channels that rank, and whether small channels win there.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {s.niches.map((n) => (
              <button key={n.name} className={`glass space-y-1.5 p-4 text-left ${s.niche === n.name ? "ring-2 ring-primary" : ""}`} onClick={() => up({ niche: n.name, names: [], name: "", details: null, launch: "" })}>
                <div className="flex items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${SCORE_STYLE[n.label] ?? ""}`}>{n.score}</span><span className="font-semibold">{n.name}</span></div>
                {n.why && <p className="text-sm text-muted-foreground">{n.why}</p>}
                <p className="text-xs text-muted-foreground">{fmt(n.views_per_day)} views/day · typical channel {fmt(n.median_subs)} subs · {n.small_wins} small-channel wins</p>
                {n.cpm && <p className="text-xs text-emerald-300" title={cpmTip(n.cpm)}>💵 Est. CPM {cpmText(n.cpm)} (estimate)</p>}
              </button>
            ))}
          </div>
          <div className="glass flex gap-2 p-4">
            <input className="field min-w-0 flex-1" value={own} onChange={(e) => setOwn(e.target.value)} placeholder="…or type your own niche" />
            <button className="btn btn-secondary" disabled={own.trim().length < 3} onClick={() => up({ niche: own.trim(), names: [], name: "", details: null, launch: "" })}>Use it</button>
          </div>
          {s.niche && <p className="text-sm text-emerald-300">✓ Niche: {s.niche}</p>}
        </div>
      )}

      {s.step === 2 && (
        <div className="space-y-4">
          <div className="glass p-5">
            <button className="btn btn-primary" disabled={busy} onClick={() => void findNames()}>{busy ? "Thinking of names + checking handles…" : s.names.length ? "↻ More names" : "✨ Suggest channel names"}</button>
            <p className="mt-2 text-xs text-muted-foreground">A good name: 1–3 words, easy to say and spell, not tied to one video, and the @handle is free. Green = handle free right now.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {s.names.map((n) => (
              <button key={n.handle} className={`rounded-xl border border-border p-3 text-left hover:bg-white/5 ${s.name === n.name ? "ring-2 ring-primary" : ""}`}
                onClick={() => up({ name: n.name, handle: n.handle, details: null })}>
                <p className="font-semibold">{n.name} <span className={`ml-1 text-xs ${n.taken === false ? "text-emerald-300" : n.taken ? "text-rose-300" : "text-muted-foreground"}`}>
                  {n.handle} {n.taken === false ? "✓ free" : n.taken ? `✗ taken${n.owner ? ` (${n.owner}, ${fmt(n.owner_subs)} subs)` : ""}` : "? not checked"}</span></p>
                {n.why && <p className="mt-0.5 text-xs text-muted-foreground">{n.why}</p>}
              </button>
            ))}
          </div>
          <div className="glass flex gap-2 p-4">
            <input className="field min-w-0 flex-1" value={ownName} onChange={(e) => setOwnName(e.target.value)} placeholder="…or type your own name" />
            <button className="btn btn-secondary" disabled={ownName.trim().length < 2} onClick={() => up({ name: ownName.trim(), handle: "@" + ownName.trim().replace(/[^A-Za-z0-9._-]/g, ""), details: null })}>Use it</button>
          </div>
          {s.name && <p className="text-sm text-emerald-300">✓ Name: {s.name} ({s.handle}) — if the handle is taken when you create the channel, add a short word like “HQ” or “TV”.</p>}
        </div>
      )}

      {s.step === 3 && (
        <div className="space-y-4">
          <div className="glass p-5">
            <button className="btn btn-primary" disabled={busy} onClick={() => void writeDetails()}>{busy ? "Writing…" : s.details ? "↻ Write again" : "📝 Write description, bio & keywords"}</button>
            <Link to="/channel" className="btn btn-ghost ml-2">🎨 Make logo & banner →</Link>
          </div>
          {s.details && (
            <div className="space-y-3">
              {s.details.description && <div className="glass p-4"><div className="mb-1 flex items-center justify-between"><p className="font-semibold">Description (About)</p><Copy text={s.details.description} /></div>
                <p className="whitespace-pre-wrap text-sm">{s.details.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">The first ~130 characters show in search — they must say what the viewer gets.</p></div>}
              {s.details.short_bio && <div className="glass p-4"><div className="mb-1 flex items-center justify-between"><p className="font-semibold">Short bio (social links, Shorts)</p><Copy text={s.details.short_bio} /></div><p className="text-sm">{s.details.short_bio}</p></div>}
              {s.details.tagline && <div className="glass p-4"><div className="mb-1 flex items-center justify-between"><p className="font-semibold">Banner tagline</p><Copy text={s.details.tagline} /></div><p className="text-sm">{s.details.tagline}</p></div>}
              {!!s.details.keywords?.length && <div className="glass p-4"><div className="mb-1 flex items-center justify-between"><p className="font-semibold">Channel keywords</p><Copy text={s.details.keywords.map((k) => (k.includes(" ") ? `"${k}"` : k)).join(" ")} /></div>
                <div className="flex flex-wrap gap-1.5">{s.details.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div></div>}
              {!!s.details.playlists?.length && <div className="glass p-4"><p className="mb-1 font-semibold">Playlists to create</p>{s.details.playlists.map((p) => <p key={p} className="text-sm">• {p}</p>)}</div>}
              {!!s.details.links?.length && <div className="glass p-4"><p className="mb-1 font-semibold">Links to add</p>{s.details.links.map((p) => <p key={p} className="text-sm">• {p}</p>)}</div>}
            </div>
          )}
        </div>
      )}

      {s.step === 4 && (
        <div className="space-y-2">
          <p className="mb-2 text-sm text-muted-foreground">Tick each one when done ({done}/{CHECKLIST.length}). Your ticks are saved.</p>
          {CHECKLIST.map((c, i) => (
            <label key={c.id} className={`flex cursor-pointer gap-3 rounded-xl border border-border p-4 ${s.checks[c.id] ? "opacity-60" : ""}`}>
              <input type="checkbox" className="mt-1" checked={!!s.checks[c.id]} onChange={(e) => up({ checks: { ...s.checks, [c.id]: e.target.checked } })} />
              <div>
                <p className="font-semibold">{i + 1}. {c.title}</p>
                <p className="text-sm text-muted-foreground">{c.how}</p>
                {c.tip && <p className="mt-0.5 text-xs text-amber-300">💡 {c.tip}</p>}
              </div>
            </label>
          ))}
        </div>
      )}

      {s.step === 5 && (
        <div className="space-y-4">
          <div className="glass space-y-2 p-5 text-sm">
            <p className="font-semibold">When to post the first video</p>
            <p>• Don't upload the day you create the channel. First finish the settings, then have <b>3 videos ready</b>.</p>
            <p>• Post video 1, then video 2 after 2–3 days, then video 3 after 2–3 more days — then keep a fixed schedule (e.g. every Friday) you can keep for months.</p>
            <p>• Post when your audience is awake — for {COUNTRIES.find(([c]) => c === P.country)?.[1] ?? "your country"}, early evening local time is a safe start. After 2–3 weeks, check Studio → Analytics → Audience → “When your viewers are on YouTube”.</p>
            <p>• With Shorts: 3–5 Shorts a week from your long videos' best moments bring new viewers to the channel.</p>
          </div>
          <div className="glass p-5">
            <button className="btn btn-primary" disabled={busy || !s.niche} onClick={() => void writeLaunch()}>{busy ? "Planning…" : s.launch ? "↻ Write the plan again" : "📅 Write my 30-day launch plan"}</button>
            {s.launch && <div className="mt-3 space-y-1.5 text-sm leading-relaxed">{mdLines(s.launch).map((l, i) => l.kind === "h" ? <p key={i} className="pt-2 font-semibold text-primary">{l.text}</p> : l.kind === "li" ? <p key={i} className="pl-4">• {l.text}</p> : <p key={i}>{l.text}</p>)}</div>}
          </div>
          <div className="glass space-y-1.5 p-5 text-sm">
            <p className="font-semibold">💰 Monetization (YouTube Partner Program)</p>
            <p>• Ads money: <b>1,000 subscribers</b> + <b>4,000 public watch hours</b> in the last 12 months, <i>or</i> 1,000 subscribers + <b>10 million Shorts views</b> in 90 days.</p>
            <p>• Earlier fan-funding tier (memberships, Super Thanks): 500 subscribers + 3 public uploads in 90 days + 3,000 watch hours in 12 months or 3M Shorts views in 90 days.</p>
            <p className="text-amber-300">• Announced change: from 1 February 2027, new applicants need 8,000 watch hours or 20M Shorts views (with 1,000 subscribers). Check Studio → Earn for your current numbers.</p>
            <p>• Also needed: 2-Step Verification on, AdSense account, no active Community Guidelines strikes, and following the monetization policies (reused content must add real value).</p>
          </div>
          <div className="glass flex flex-wrap gap-2 p-5">
            <Link to="/research" className="btn btn-secondary" onClick={() => { try { localStorage.setItem("ytguru-rl-seed", s.niche); localStorage.setItem("ytguru-rl-tab", "next"); } catch { /* private mode */ } }}>🔎 Research my first 3 videos →</Link>
            <Link to="/auto-video" className="btn btn-ghost">🎬 Open Auto Video</Link>
          </div>
        </div>
      )}

      {err && <p className="mt-4 text-sm text-rose-300">{err}</p>}

      <div className="mt-6 flex justify-between">
        <button className="btn btn-ghost" disabled={s.step === 0} onClick={() => up({ step: s.step - 1 })}>← Back</button>
        {s.step < STEPS.length - 1 && <button className="btn btn-primary" disabled={!canNext} onClick={() => up({ step: s.step + 1 })}>Next: {STEPS[s.step + 1]} →</button>}
      </div>
    </div>
  );
}
