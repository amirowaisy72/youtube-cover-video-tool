/** Channel Doctor (user, 2026-11-19): why the channel is not getting views, and the fixes. */
import { useEffect, useRef, useState } from "react";
import { getKey } from "@/lib/config";
import { type Cpm, cpmText, cpmTip, fmt, mdLines } from "@/lib/research";

type Finding = { severity: "high" | "medium" | "low" | "info"; area: string; title: string; evidence: string; fix: string };
type DVideo = {
  id: string; title: string; views: number; age_days: number; secs: number; short: boolean; thumb: string; url: string;
  likes: number; comments: number; avg_view_pct?: number; at30?: number; subs_gained?: number; impressions?: number; ctr?: number;
};
type Report = {
  channel: { id: string; title: string; subs: number; views: number; videos: number; thumb: string };
  score: number; findings: Finding[]; videos: DVideo[]; days: number; has_ctr: boolean; cpm: Cpm;
  analytics: {
    connected: boolean; error?: string; totals?: Record<string, number>; traffic_share?: Record<string, number>;
    ctr?: { impressions?: number; ctr?: number }; money?: { revenue: number; cpm: number; playback_cpm: number; rpm: number };
    retention?: { id: string; title: string; at30: number; vs_similar: number }[];
  };
};

const SEV: Record<string, string> = {
  high: "border-rose-500/60 bg-rose-500/10",
  medium: "border-amber-500/60 bg-amber-500/10",
  low: "border-sky-500/50 bg-sky-500/5",
  info: "border-emerald-500/50 bg-emerald-500/10",
};
const SEV_LABEL: Record<string, string> = { high: "🔴 Big problem", medium: "🟠 Problem", low: "🔵 Small", info: "🟢 What worked" };
const SOURCE: Record<string, string> = {
  YT_SEARCH: "YouTube search", RELATED_VIDEO: "Suggested videos", SUBSCRIBER: "Home / browse", SHORTS: "Shorts feed",
  YT_CHANNEL: "Your channel page", EXT_URL: "Outside links", NO_LINK_OTHER: "Direct / unknown", PLAYLIST: "Playlists",
  NOTIFICATION: "Notifications", YT_OTHER_PAGE: "Other YouTube pages", END_SCREEN: "End screens", ANNOTATION: "Cards",
  HASHTAGS: "Hashtags", SOUND_PAGE: "Sound pages", CAMPAIGN_CARD: "Campaigns", ADVERTISING: "Ads", VIDEO_REMIXES: "Remixes",
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const det = (d as { detail?: unknown }).detail;
    throw new Error(typeof det === "string" ? det : Array.isArray(det) ? det.map((x: { msg?: string }) => x.msg).join("; ") : `Failed (${r.status})`);
  }
  return d as T;
}

export function ChannelDoctor({ channelId, country }: { channelId: string; country: string }) {
  const [days, setDays] = useState(90);
  const [rep, setRep] = useState<Report | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [ai, setAi] = useState("");
  const [ctrMsg, setCtrMsg] = useState("");
  const [showHow, setShowHow] = useState(false);
  const poll = useRef<number | null>(null);
  useEffect(() => () => { if (poll.current) window.clearInterval(poll.current); }, []);

  const run = async () => {
    setBusy("Checking your channel…"); setErr(""); setAi("");
    try {
      const r = await post<Report>("/api/doctor/check", { channel_id: channelId, api_key: getKey("youtube"), gemini_key: getKey("gemini"), days, country });
      setRep(r);
      setBusy("AI is reading the results…");
      try {
        const a = await post<{ text: string }>("/api/doctor/diagnose", { data: r, gemini_key: getKey("gemini"), channel_id: channelId });
        setAi(a.text);
      } catch (e) { setAi(`(AI summary failed: ${e instanceof Error ? e.message : "busy"} — the measured problems below are still correct.)`); }
    } catch (e) { setErr(e instanceof Error ? e.message : "Check failed."); }
    setBusy("");
  };

  const allow = async () => {
    setErr("");
    try {
      const { auth_url } = await post<{ auth_url: string }>("/api/doctor/connect", {});
      window.open(auth_url, "_blank");
      setBusy("Waiting for Google… (allow access in the tab that opened)");
      if (poll.current) window.clearInterval(poll.current);
      poll.current = window.setInterval(async () => {
        const s = await fetch("/api/doctor/connect-status").then((x) => x.json()).catch(() => null) as { busy: boolean; error: string; channel_id: string } | null;
        if (!s || s.busy) return;
        if (poll.current) window.clearInterval(poll.current);
        setBusy("");
        if (s.error) setErr(s.error); else void run();
      }, 2000);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not open Google sign-in."); }
  };

  const upload = async (f: File) => {
    setCtrMsg("Reading the file…");
    const b64 = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(f); });
    try {
      const r = await post<{ videos: number; total: { impressions: number; ctr: number } }>("/api/doctor/ctr", { channel_id: rep?.channel.id || channelId, name: f.name, data_b64: b64 });
      setCtrMsg(`✓ Loaded: ${r.videos} videos, ${fmt(r.total.impressions || 0)} impressions, CTR ${r.total.ctr ?? "?"}%. Run the check again to include it.`);
    } catch (e) { setCtrMsg(e instanceof Error ? e.message : "Could not read the file."); }
  };

  const a = rep?.analytics;
  const t = a?.totals || {};
  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center gap-3 p-5">
        <p className="w-full text-sm text-muted-foreground">Checks the channel selected at the top right: uploads, titles, retention, where views come from, clicks — then names the main reasons for low views and how to fix each.</p>
        <select className="field w-auto" value={days} onChange={(e) => setDays(+e.target.value)}>
          {[28, 90, 180, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}
        </select>
        <button className="btn btn-primary" disabled={!!busy} onClick={() => void run()}>{busy || "🩺 Check my channel"}</button>
        {rep && !a?.connected && <button className="btn btn-secondary" disabled={!!busy} onClick={() => void allow()}>🔓 Allow analytics (one time)</button>}
        {rep && a?.connected && <span className="chip text-emerald-300">✓ Analytics connected</span>}
      </div>

      {rep && !a?.connected && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          <b>Only public data was checked.</b> For the most important reasons (do viewers leave in the first 30 seconds? does YouTube recommend you?)
          press <b>🔓 Allow analytics</b> once — read-only, it cannot change or upload anything.{a?.error ? ` (${a.error})` : ""}
          <span className="mt-1 block text-xs text-muted-foreground">If Google says “app not verified”: Advanced → Go to YT Guru (it's your own app). If it says access blocked: Google Cloud → OAuth consent screen → Test users → add your email.</span>
        </div>
      )}

      <div className="glass p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <b>📈 Impressions & click-through rate</b>
          {rep?.has_ctr ? <span className="chip text-emerald-300">✓ loaded</span> : <span className="chip">not loaded</span>}
          <label className="btn btn-ghost btn-sm cursor-pointer">⬆ Upload Studio export (.zip / .csv)
            <input type="file" accept=".zip,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
          </label>
          <button className="text-xs underline text-muted-foreground" onClick={() => setShowHow(!showHow)}>How?</button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">YouTube does not share these through its API, so take them from Studio once (takes 30 seconds).</p>
        {showHow && (
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs">
            <li>Open studio.youtube.com → <b>Analytics</b> → <b>Advanced mode</b> (top right).</li>
            <li>Set the period (top right) to <b>Last 90 days</b>, tab <b>Content</b>.</li>
            <li>Click the <b>Export</b> icon (↓) → <b>Comma-separated values (.csv)</b>. A zip downloads.</li>
            <li>Upload that zip here, then press <b>Check my channel</b> again.</li>
          </ol>
        )}
        {ctrMsg && <p className="mt-1 text-xs">{ctrMsg}</p>}
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}

      {rep && (
        <>
          <div className="glass grid gap-4 p-5 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center px-4">
              <div className={`text-5xl font-black ${rep.score >= 70 ? "text-emerald-300" : rep.score >= 45 ? "text-amber-300" : "text-rose-300"}`}>{rep.score}</div>
              <div className="text-xs text-muted-foreground">channel health</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <Stat k="Subscribers" v={fmt(rep.channel.subs)} />
              <Stat k="Public videos" v={String(rep.channel.videos)} />
              {t.views !== undefined && <Stat k={`Views (${rep.days} d)`} v={fmt(t.views)} />}
              {t.averageViewPercentage !== undefined && <Stat k="Avg % watched" v={`${Math.round(t.averageViewPercentage)}%`} />}
              {t.averageViewDuration !== undefined && <Stat k="Avg watch time" v={`${(t.averageViewDuration / 60).toFixed(1)} min`} />}
              {t.subscribersGained !== undefined && <Stat k={`New subs (${rep.days} d)`} v={fmt(t.subscribersGained - (t.subscribersLost || 0))} />}
              {a?.ctr?.ctr !== undefined && <Stat k="Click-through" v={`${a.ctr.ctr}%`} />}
              {a?.money ? <Stat k="Your real CPM / RPM" v={`$${a.money.cpm} / $${a.money.rpm}`} /> : <Stat k="Est. CPM (your topic)" v={cpmText(rep.cpm)} tip={cpmTip(rep.cpm)} />}
            </div>
          </div>

          {ai && <div className="glass p-5"><Md text={ai} /></div>}

          <div className="space-y-2">
            <p className="text-sm font-semibold">Measured problems (biggest first)</p>
            {rep.findings.length === 0 && <p className="text-sm text-muted-foreground">No clear problem found in this data.</p>}
            {rep.findings.map((f, i) => (
              <div key={i} className={`rounded-xl border p-4 ${SEV[f.severity]}`}>
                <p className="text-xs">{SEV_LABEL[f.severity]} · {f.area}</p>
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.evidence}</p>
                <p className="mt-1 text-sm">✅ <b>Fix:</b> {f.fix}</p>
              </div>
            ))}
          </div>

          {a?.traffic_share && (
            <div className="glass p-4">
              <p className="mb-2 text-sm font-semibold">Where your views come from</p>
              <div className="space-y-1">
                {Object.entries(a.traffic_share).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-40 shrink-0">{SOURCE[k] ?? k}</span>
                    <div className="h-2 flex-1 rounded bg-white/5"><div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, v)}%` }} /></div>
                    <span className="w-12 text-right">{v}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="p-2">Video</th><th className="p-2">Views</th><th className="p-2">Length</th><th className="p-2">% watched</th><th className="p-2">At 0:30</th><th className="p-2">CTR</th><th className="p-2">Likes</th></tr>
              </thead>
              <tbody>
                {rep.videos.slice(0, 30).map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="max-w-[340px] p-2"><a href={v.url} target="_blank" rel="noreferrer" className="line-clamp-1 hover:underline">{v.short ? "📱 " : ""}{v.title}</a>
                      <span className="text-xs text-muted-foreground">{Math.round(v.age_days)} d ago</span></td>
                    <td className="p-2">{fmt(v.views)}</td>
                    <td className="p-2">{Math.floor(v.secs / 60)}:{String(v.secs % 60).padStart(2, "0")}</td>
                    <td className={`p-2 ${v.avg_view_pct !== undefined && v.avg_view_pct < 35 ? "text-rose-300" : ""}`}>{v.avg_view_pct !== undefined ? `${v.avg_view_pct}%` : "–"}</td>
                    <td className={`p-2 ${v.at30 !== undefined && v.at30 < 60 ? "text-rose-300" : ""}`}>{v.at30 !== undefined ? `${v.at30}%` : "–"}</td>
                    <td className={`p-2 ${v.ctr !== undefined && v.ctr < 3 ? "text-rose-300" : ""}`}>{v.ctr !== undefined ? `${v.ctr}%` : "–"}</td>
                    <td className="p-2">{fmt(v.likes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ k, v, tip }: { k: string; v: string; tip?: string }) {
  return (
    <div className="rounded-xl border border-border p-3" title={tip}>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-lg font-bold">{v}</div>
    </div>
  );
}

function Md({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {mdLines(text).map((l, i) => l.kind === "h" ? <p key={i} className="pt-2 font-semibold text-primary">{l.text}</p>
        : l.kind === "li" ? <p key={i} className="pl-4">• {l.text}</p> : <p key={i}>{l.text}</p>)}
    </div>
  );
}
