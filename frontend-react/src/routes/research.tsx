import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { useApp } from "@/lib/app-store";
import { installDashboardButton } from "@/lib/config";
import { getChannelNiche } from "@/lib/keys";
import { age, CATEGORIES, COUNTRIES, type Cpm, cpmText, cpmTip, fmt, type KwResult, LANGUAGES, mdLines, research, SCORE_STYLE, sendTitle, type Video } from "@/lib/research";
import { ChannelDoctor } from "@/components/ChannelDoctor";

installDashboardButton();

export const Route = createFileRoute("/research")({
  component: ResearchLab,
});

type Tab = "next" | "trending" | "outliers" | "niches" | "doctor";
type Niche = { name: string; search: string; why: string; score: number; demand: number; competition: number; views_per_day: number; median_subs: number; small_wins: number; label: string; shorts_share: number; videos: Video[]; cpm?: Cpm };

function load(k: string, d = "") { try { return localStorage.getItem(k) ?? d; } catch { return d; } }
function store(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }

function Md({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {mdLines(text).map((l, i) => l.kind === "h" ? <p key={i} className="pt-2 font-semibold text-primary">{l.text}</p>
        : l.kind === "li" ? <p key={i} className="pl-4">• {l.text}</p> : <p key={i}>{l.text}</p>)}
    </div>
  );
}

function VideoCard({ v, badge }: { v: Video; badge?: string }) {
  return (
    <a href={v.url} target="_blank" rel="noreferrer" className="flex gap-3 rounded-xl border border-border p-2 hover:bg-white/5">
      {v.thumb ? <img src={v.thumb} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" loading="lazy" /> : <div className="h-16 w-28 shrink-0 rounded-lg bg-white/5" />}
      <div className="min-w-0 text-xs">
        <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
        <p className="mt-0.5 text-muted-foreground">{v.channel}{v.subs ? ` · ${fmt(v.subs)} subs` : ""}</p>
        <p className="text-muted-foreground">{fmt(v.views)} views · {age(v.age_days)}{v.short ? " · Short" : ""}</p>
        {badge && <span className="mt-1 inline-block rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 text-emerald-300">{badge}</span>}
      </div>
    </a>
  );
}

function Advice({ kind, niche, data, channelId, label }: { kind: string; niche: string; data: unknown; channelId: string; label: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true); setErr("");
    try { setText((await research<{ text: string }>("advice", { kind, niche, data }, channelId)).text); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  };
  return (
    <div className="glass p-4">
      <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void run()}>{busy ? "Thinking…" : label}</button>
      {err && <p className="mt-2 text-sm text-rose-300">{err}</p>}
      {text && <div className="mt-3"><Md text={text} /></div>}
    </div>
  );
}

function ResearchLab() {
  const { activeChannelId } = useApp();
  const cid = activeChannelId ?? "";
  const [tab, setTab] = useState<Tab>(() => (load("ytguru-rl-tab", "next") as Tab));
  const [seed, setSeedState] = useState(() => load("ytguru-rl-seed") || (cid ? getChannelNiche(cid) : ""));
  const setSeed = (v: string) => { setSeedState(v); store("ytguru-rl-seed", v); };
  const [country, setCountryState] = useState(() => load("ytguru-rl-country", "US"));
  const setCountry = (v: string) => { setCountryState(v); store("ytguru-rl-country", v); };
  const [language, setLanguage] = useState(() => load("ytguru-rl-lang", "en"));
  const [count, setCount] = useState(10);
  const [category, setCategory] = useState("");
  const [days, setDays] = useState(90);
  const [interests, setInterests] = useState(() => load("ytguru-nc-interests"));
  const [face, setFace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState<{ connected: boolean; used_today: number; limit: number } | null>(null);
  const [kw, setKw] = useState<{ results: KwResult[]; more: string[]; errors: string[] } | null>(null);
  const [open, setOpen] = useState<string>("");
  const [trend, setTrend] = useState<{ videos: Video[]; topics: string[]; countries: string[] } | null>(null);
  const [onlyFits, setOnlyFits] = useState(false);
  const [outl, setOutl] = useState<{ videos: Video[]; searched: string[] } | null>(null);
  const [niches, setNiches] = useState<Niche[] | null>(null);

  const refresh = () => fetch("/api/research/status").then((r) => r.json()).then(setStatus).catch(() => undefined);
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { store("ytguru-rl-tab", tab); }, [tab]);
  useEffect(() => { store("ytguru-rl-lang", language); }, [language]);

  const go = async (fn: () => Promise<void>) => {
    setBusy(true); setErr("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Research failed."); }
    setBusy(false); void refresh();
  };
  const runKw = (s = seed) => go(async () => {
    const d = await research<{ seed: string; results: KwResult[]; more: string[]; errors: string[] }>("keywords", { seed: s, country: country === "WW" ? "US" : country, language, count }, cid);
    setKw(d);
    if (d.seed && d.seed !== s) setSeed(d.seed); // a long niche is turned into the search people really type
  });
  const runTrend = () => go(async () => { setTrend(await research("trending", { country, category, niche: seed }, cid)); });
  const runOut = () => go(async () => {
    const d = await research<{ videos: Video[]; searched: string[] }>("outliers", { seed, country: country === "WW" ? "US" : country, language, days }, cid);
    setOutl(d);
    if (d.searched?.[0] && d.searched[0] !== seed) setSeed(d.searched[0]);
  });
  const runNiche = () => go(async () => {
    store("ytguru-nc-interests", interests);
    setNiches((await research<{ niches: Niche[] }>("niches", { interests, language, country: country === "WW" ? "US" : country, face, format: "both", count: 8 }, cid)).niches);
  });

  const make = (title: string) => (
    <span className="flex flex-wrap gap-1.5">
      <Link to="/auto-video" className="btn btn-secondary btn-sm" onClick={() => sendTitle("av", title)}>🎬 Auto Video</Link>
      <Link to="/animator" className="btn btn-ghost btn-sm" onClick={() => sendTitle("anim", title)}>🧸 Story Animator</Link>
    </span>
  );

  const countrySel = (withWorld: boolean) => (
    <select className="field" value={!withWorld && country === "WW" ? "US" : country} onChange={(e) => setCountry(e.target.value)}>
      {withWorld && <option value="WW">🌍 Worldwide (12 big countries)</option>}
      {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
    </select>
  );

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <PageHeader icon="🔎" title="Topic Research Lab" sub="Real YouTube data: what to make next, what is trending, what works for small channels, which niche to start." />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {status && (status.connected ? <span className="chip text-emerald-300">✓ Using your connected channel's YouTube access</span>
          : <span className="chip text-amber-300">○ Connect a YouTube channel (top right) or add a YouTube API key in the ⚙ Dashboard</span>)}
        {status && <span className="chip">Free research used today: {fmt(status.used_today)} / {fmt(status.limit)} units</span>}
        <Link to="/new-channel" className="btn btn-ghost btn-sm ml-auto">🚀 New Channel Wizard →</Link>
      </div>

      <div className="seg mb-4">
        <button data-on={tab === "next"} onClick={() => setTab("next")}>🎯 Next video</button>
        <button data-on={tab === "trending"} onClick={() => setTab("trending")}>🔥 Trending now</button>
        <button data-on={tab === "outliers"} onClick={() => setTab("outliers")}>💎 Small-channel wins</button>
        <button data-on={tab === "niches"} onClick={() => setTab("niches")}>🧭 Niche finder</button>
        <button data-on={tab === "doctor"} onClick={() => setTab("doctor")}>🩺 Channel Doctor</button>
      </div>

      {tab === "next" && (
        <div className="space-y-4">
          <div className="glass grid gap-3 p-5 sm:grid-cols-[2fr_1fr_1fr_1fr]">
            <input className="field" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Your channel's topic or a seed keyword, e.g. personal finance" />
            {countrySel(false)}
            <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
            <select className="field" value={count} onChange={(e) => setCount(+e.target.value)}>
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} keywords (~{n * 102} units)</option>)}
            </select>
            <button className="btn btn-primary sm:col-span-4" disabled={busy || seed.trim().length < 2} onClick={() => void runKw()}>
              {busy ? "Researching… (searches, views, channel sizes)" : "🔍 Find my next video topic"}
            </button>
            <p className="text-xs text-muted-foreground sm:col-span-4">
              Score = how many views the videos for that search get per day (demand) against how big the channels ranking there are,
              how many titles already target it (competition) — plus a bonus when small channels win there.
            </p>
          </div>
          {kw && (
            <>
              <p className="text-xs text-muted-foreground">💵 Est. CPM = what advertisers pay per 1,000 ad views for that topic in {COUNTRIES.find(([c]) => c === (country === "WW" ? "US" : country))?.[1] ?? country}, long videos. You keep roughly 40–50% of it. It is an estimate — hover it for details.</p>
              <div className="glass overflow-x-auto p-2">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr><th className="p-2">Search</th><th className="p-2">Score</th><th className="p-2">Demand</th><th className="p-2">Competition</th><th className="p-2">Views/day</th><th className="p-2">Typical channel</th><th className="p-2">Small wins</th><th className="p-2" title="Estimated CPM: what advertisers pay per 1,000 ad views (long videos, this country)">Est. CPM ⓘ</th><th className="p-2" /></tr>
                  </thead>
                  <tbody>
                    {kw.results.map((r) => (
                      <Fragment key={r.keyword}>
                        <tr className="cursor-pointer border-t border-border hover:bg-white/5" onClick={() => setOpen(open === r.keyword ? "" : r.keyword)}>
                          <td className="p-2 font-medium">{r.keyword}</td>
                          <td className="p-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${SCORE_STYLE[r.label]}`}>{r.score}</span></td>
                          <td className="p-2">{r.demand}</td>
                          <td className="p-2">{r.competition}%</td>
                          <td className="p-2">{fmt(r.views_per_day)}</td>
                          <td className="p-2">{fmt(r.median_subs)} subs</td>
                          <td className="p-2">{r.small_wins}</td>
                          <td className="p-2 whitespace-nowrap text-emerald-300" title={cpmTip(r.cpm)}>{cpmText(r.cpm)}</td>
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>{make(r.keyword)}</td>
                        </tr>
                        {open === r.keyword && (
                          <tr><td colSpan={9} className="p-3">
                            <p className="mb-2 text-xs text-muted-foreground">Top videos for this search (fastest first){r.shorts_share ? ` · ${r.shorts_share}% are Shorts` : ""} · {r.big_channels}% of the top 10 are channels with 500K+ subs · {r.exact_titles}% of titles target it exactly</p>
                            <div className="grid gap-2 md:grid-cols-2">{r.videos.map((v) => <VideoCard key={v.id} v={v} />)}</div>
                            {r.examples.length > 0 && <>
                              <p className="mb-2 mt-3 text-xs font-semibold text-emerald-300">Small channels that won here:</p>
                              <div className="grid gap-2 md:grid-cols-2">{r.examples.map((v) => <VideoCard key={v.id} v={v} badge={`${v.ratio}× its subscribers`} />)}</div>
                            </>}
                          </td></tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {kw.errors.length > 0 && <p className="text-sm text-amber-300">⚠ {kw.errors[0]}</p>}
              {kw.more.length > 0 && (
                <div className="glass p-4">
                  <p className="mb-2 text-sm font-semibold">More searches people type (click to research it):</p>
                  <div className="flex flex-wrap gap-1.5">{kw.more.slice(0, 30).map((m) => <button key={m} className="chip hover:border-primary" onClick={() => { setSeed(m); void runKw(m); }}>{m}</button>)}</div>
                </div>
              )}
              <Advice kind="topics" niche={seed} data={kw} channelId={cid} label="🤖 Tell me the 5 best videos to make next (with titles)" />
            </>
          )}
        </div>
      )}

      {tab === "trending" && (
        <div className="space-y-4">
          <div className="glass grid gap-3 p-5 sm:grid-cols-3">
            {countrySel(true)}
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
            <input className="field" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Your niche (to mark what fits you)" />
            <button className="btn btn-primary sm:col-span-3" disabled={busy} onClick={() => void runTrend()}>{busy ? "Loading trending videos…" : "🔥 Show what is trending now"}</button>
          </div>
          {trend && (
            <>
              {trend.topics.length > 0 && <div className="glass p-4"><p className="mb-2 text-sm font-semibold">Words that keep coming back in trending titles:</p>
                <div className="flex flex-wrap gap-1.5">{trend.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div></div>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyFits} onChange={(e) => setOnlyFits(e.target.checked)} /> Only what fits my niche</label>
              <div className="grid gap-2 md:grid-cols-2">
                {trend.videos.filter((v) => !onlyFits || v.fits).map((v) => (
                  <div key={v.id} className="space-y-1">
                    <VideoCard v={v} badge={v.countries && v.countries.length > 1 ? `trending in ${v.countries.length} countries` : v.fits ? "fits your niche" : undefined} />
                    <p className="px-2 text-xs text-muted-foreground">{fmt(v.views_per_hour ?? 0)} views/hour · {v.category}{v.countries ? ` · ${v.countries.join(", ")}` : ""}</p>
                  </div>
                ))}
              </div>
              <Advice kind="trending" niche={seed} data={trend} channelId={cid} label="🤖 Which trends can my channel ride this week?" />
            </>
          )}
        </div>
      )}

      {tab === "outliers" && (
        <div className="space-y-4">
          <div className="glass grid gap-3 p-5 sm:grid-cols-[2fr_1fr_1fr_1fr]">
            <input className="field" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Topic, e.g. budget travel" />
            {countrySel(false)}
            <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
            <select className="field" value={days} onChange={(e) => setDays(+e.target.value)}>{[30, 90, 180, 365].map((d) => <option key={d} value={d}>last {d} days</option>)}</select>
            <button className="btn btn-primary sm:col-span-4" disabled={busy || seed.trim().length < 2} onClick={() => void runOut()}>{busy ? "Searching…" : "💎 Find small channels that won big (~310 units)"}</button>
            <p className="text-xs text-muted-foreground sm:col-span-4">Videos from channels under 250K subscribers that got many times more views than they have subscribers — the clearest proof that a topic can work for a new channel.</p>
          </div>
          {outl && (
            <div className="grid gap-2 md:grid-cols-2">
              {outl.videos.map((v) => (
                <div key={v.id} className="space-y-1">
                  <VideoCard v={v} badge={`${v.ratio}× its subscribers`} />
                  <div className="px-2">{make(v.title)}</div>
                </div>
              ))}
              {outl.videos.length === 0 && <p className="text-sm text-muted-foreground">No small-channel wins found for this topic in this time — try a wider topic or a longer time.</p>}
            </div>
          )}
        </div>
      )}

      {tab === "niches" && (
        <div className="space-y-4">
          <div className="glass grid gap-3 p-5 sm:grid-cols-3">
            <input className="field sm:col-span-3" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="What do you like / know? e.g. cricket, cooking, tech, stories, money (leave empty for any)" />
            {countrySel(false)}
            <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={face} onChange={(e) => setFace(e.target.checked)} /> I will show my face</label>
            <button className="btn btn-primary sm:col-span-3" disabled={busy} onClick={() => void runNiche()}>{busy ? "Testing niches on real data…" : "🧭 Find the best niche for a new channel (~820 units)"}</button>
          </div>
          {niches && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {niches.map((n) => (
                  <div key={n.name} className="glass space-y-2 p-4">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${SCORE_STYLE[n.label] ?? ""}`}>{n.score}</span>
                      <span className="font-semibold">{n.name}</span>
                    </div>
                    {n.why && <p className="text-sm text-muted-foreground">{n.why}</p>}
                    <p className="text-xs text-muted-foreground">Search "{n.search}": {fmt(n.views_per_day)} views/day · typical channel {fmt(n.median_subs)} subs · {n.small_wins} small-channel wins · competition {n.competition}%</p>
                    {n.cpm && <p className="text-xs text-emerald-300" title={cpmTip(n.cpm)}>💵 Est. CPM {cpmText(n.cpm)} · you earn ≈ ${n.cpm.rpm_low}–${n.cpm.rpm_high} per 1,000 views (estimate)</p>}
                    <Link to="/new-channel" className="btn btn-secondary btn-sm" onClick={() => store("ytguru-nc-niche", n.name)}>🚀 Start a channel in this niche</Link>
                  </div>
                ))}
              </div>
              <Advice kind="niche" niche={`interests: ${interests || "open"}; ${face ? "shows face" : "faceless"}; language ${language}; country ${country}`} data={{ niches }} channelId={cid} label="🤖 Which niche should I pick, and why?" />
            </>
          )}
        </div>
      )}

      {tab === "doctor" && <ChannelDoctor channelId={cid} country={country === "WW" ? "US" : country} />}

      {err && <p className="mt-4 text-sm text-rose-300">{err}</p>}
    </div>
  );
}
