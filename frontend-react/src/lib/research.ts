/** Topic Research Lab + New Channel Wizard: shared bits (user, 2026-11-19). */
import { getKey } from "./config";

export const COUNTRIES: [string, string][] = [
  ["US", "United States"], ["PK", "Pakistan"], ["IN", "India"], ["GB", "United Kingdom"], ["CA", "Canada"], ["AU", "Australia"],
  ["AE", "UAE"], ["SA", "Saudi Arabia"], ["BD", "Bangladesh"], ["NG", "Nigeria"], ["ZA", "South Africa"], ["EG", "Egypt"],
  ["TR", "Turkey"], ["DE", "Germany"], ["FR", "France"], ["ES", "Spain"], ["IT", "Italy"], ["NL", "Netherlands"], ["BR", "Brazil"],
  ["MX", "Mexico"], ["AR", "Argentina"], ["ID", "Indonesia"], ["PH", "Philippines"], ["MY", "Malaysia"], ["SG", "Singapore"],
  ["JP", "Japan"], ["KR", "South Korea"], ["VN", "Vietnam"], ["TH", "Thailand"], ["RU", "Russia"],
];
export const LANGUAGES: [string, string][] = [
  ["en", "English"], ["ur", "Urdu"], ["hi", "Hindi"], ["ar", "Arabic"], ["bn", "Bengali"], ["es", "Spanish"], ["pt", "Portuguese"],
  ["fr", "French"], ["de", "German"], ["tr", "Turkish"], ["id", "Indonesian"],
];
export const CATEGORIES: [string, string][] = [
  ["", "All categories"], ["20", "Gaming"], ["27", "Education"], ["24", "Entertainment"], ["23", "Comedy"], ["10", "Music"],
  ["28", "Science & Technology"], ["26", "Howto & Style"], ["17", "Sports"], ["25", "News & Politics"], ["22", "People & Blogs"],
  ["1", "Film & Animation"], ["15", "Pets & Animals"], ["2", "Cars"],
];

export type Video = {
  id: string; title: string; channel: string; views: number; age_days: number; views_per_day: number; subs: number;
  ratio: number; short: boolean; thumb: string; url: string; views_per_hour?: number; countries?: string[]; category?: string; fits?: boolean;
};
export type Cpm = { niche: string; country: string; cpm_low: number; cpm_high: number; rpm_low: number; rpm_high: number };

/** "$12–$32" — an estimate for long videos in that audience country. */
export function cpmText(c?: Cpm): string {
  if (!c) return "–";
  const f = (n: number) => (n >= 10 ? `$${Math.round(n)}` : `$${n.toFixed(n < 1 ? 2 : 1)}`);
  return `${f(c.cpm_low)}–${f(c.cpm_high)}`;
}

export function cpmTip(c?: Cpm): string {
  if (!c) return "";
  return `Estimated CPM (what advertisers pay per 1,000 ad views) for ${c.niche}, audience ${c.country}, long videos. ` +
    `You would earn roughly $${c.rpm_low}–$${c.rpm_high} per 1,000 views (RPM). Shorts pay far less. An estimate, not a promise — Studio shows your real numbers.`;
}

export type KwResult = {
  keyword: string; score: number; demand: number; competition: number; views_per_day: number; median_views: number;
  median_subs: number; big_channels: number; small_wins: number; exact_titles: number; shorts_share: number;
  label: "great" | "ok" | "hard"; videos: Video[]; examples: Video[]; cpm?: Cpm;
};

export function fmt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
}

export function age(days: number): string {
  if (days < 1) return `${Math.round(days * 24)} h ago`;
  if (days < 60) return `${Math.round(days)} d ago`;
  if (days < 730) return `${Math.round(days / 30)} mo ago`;
  return `${Math.round(days / 365)} y ago`;
}

/** POST to the research API with the keys and the selected channel. */
export async function research<T>(path: string, body: Record<string, unknown>, channelId = ""): Promise<T> {
  const r = await fetch(`/api/research/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, api_key: getKey("youtube"), gemini_key: getKey("gemini"), channel_id: channelId }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const det = (d as { detail?: unknown }).detail;
    const msg = typeof det === "string" ? det
      : Array.isArray(det) ? det.map((x: { loc?: unknown[]; msg?: string }) => `${(x.loc || []).slice(-1)[0] ?? ""}: ${x.msg ?? ""}`).join("; ")
      : "";
    throw new Error(msg || `Research failed (${r.status})`);
  }
  return d as T;
}

/** Send a title to a video tool (it fills the title box once). */
export function sendTitle(tool: "av" | "anim", title: string) {
  try { localStorage.setItem(tool === "av" ? "ytguru-title-in-av" : "ytguru-title-in-anim", title); } catch { /* private mode */ }
}

export const SCORE_STYLE: Record<string, string> = {
  great: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  ok: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  hard: "border-rose-500/50 bg-rose-500/10 text-rose-300",
};

/** Very small markdown → JSX-free HTML-safe text blocks (headings, bullets, bold). */
export function mdLines(text: string): { kind: "h" | "li" | "p"; text: string }[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    if (/^#{1,4}\s/.test(l)) return { kind: "h" as const, text: l.replace(/^#+\s*/, "").replace(/\*\*/g, "") };
    if (/^([-*•]|\d+[.)])\s/.test(l)) return { kind: "li" as const, text: l.replace(/^([-*•]|\d+[.)])\s*/, "").replace(/\*\*/g, "") };
    return { kind: "p" as const, text: l.replace(/\*\*/g, "") };
  });
}
