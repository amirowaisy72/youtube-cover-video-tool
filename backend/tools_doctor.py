"""Channel Doctor + CPM estimates (user, 2026-11-19).

Channel Doctor looks at a connected channel and names the main reasons
it is not getting views, each with the evidence and the fix:
  * YouTube Data API (public): uploads, titles, lengths, schedule, likes,
    comments, made-for-kids, About/keywords.
  * YouTube Analytics API (needs a one-time "Allow analytics" sign-in,
    a separate read-only token so uploads are never touched):
    retention, how long people watch, where views come from, Shorts vs
    long, countries, subscribers per view, and real CPM/RPM when the
    channel is monetized.
  * Impressions and click-through rate are NOT in any YouTube API — the
    user can upload Studio's export (Advanced mode -> Export -> CSV zip).

CPM estimates for topics are clearly labelled estimates: niche ranges
from 2026 creator-reported benchmarks x an audience-country factor.
"""
from __future__ import annotations

import base64
import csv
import datetime
import http.server
import io
import json
import re
import socket
import statistics
import threading
import time
import urllib.parse
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import tools_research as tr

router = APIRouter(prefix="/api/doctor", tags=["channel-doctor"])

BASE_DIR = Path(__file__).resolve().parent.parent
TOKENS = BASE_DIR / "tokens"
SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
]
CTR_FILE = BASE_DIR / "doctor_ctr.json"


# ---------------------------------------------------------------- CPM estimates
# US long-form CPM ranges (advertiser price per 1,000 ad views), 2026 creator-reported
# benchmarks. Real numbers differ per channel; Studio shows the true ones.
CPM_NICHES: list[tuple[str, tuple[float, float], list[str]]] = [
    ("Finance & investing", (15, 40), ["financ", "invest", "stock", "money", "budget", "saving", "debt", "credit", "loan", "bank", "tax",
                                       "retire", "crypto", "bitcoin", "insurance", "income", "wealth", "salary", "paycheck", "etf", "dividend", "trading"]),
    ("Real estate", (15, 30), ["real estate", "house", "mortgage", "property", "rent", "realtor", "airbnb"]),
    ("Business & marketing", (10, 30), ["business", "marketing", "startup", "entrepreneur", "sales", "ecommerce", "dropship", "side hustle",
                                        "make money", "freelanc", "seo", "affiliate", "amazon fba", "brand"]),
    ("Software, AI & tech", (8, 25), ["ai ", "ai,", "chatgpt", "software", "coding", "program", "python", "tech", "laptop", "phone", "iphone",
                                      "android", "computer", "pc ", "gadget", "app ", "excel", "cyber", "cloud"]),
    ("Legal & careers", (8, 22), ["law", "legal", "lawyer", "career", "job", "resume", "interview", "visa", "immigration"]),
    ("Health & medical", (6, 15), ["health", "medical", "doctor", "diet", "nutrition", "weight loss", "sleep", "mental", "skin"]),
    ("Education & how-to", (6, 15), ["learn", "explained", "tutorial", "how to", "course", "study", "english", "math", "exam", "guide"]),
    ("Cars", (6, 15), ["car ", "cars", "auto", "vehicle", "tesla", "bmw", "toyota", "motor", "ev "]),
    ("Fitness", (5, 12), ["fitness", "workout", "gym", "exercise", "yoga", "muscle", "running"]),
    ("Travel", (5, 12), ["travel", "trip", "hotel", "flight", "tour", "visit", "country"]),
    ("Beauty & fashion", (5, 12), ["beauty", "makeup", "fashion", "outfit", "hair", "skincare", "style"]),
    ("Science, history & facts", (4, 10), ["history", "science", "space", "facts", "documentary", "war", "ancient", "planet", "physics"]),
    ("Cooking & food", (4, 10), ["cook", "recipe", "food", "kitchen", "bake", "meal"]),
    ("News & politics", (3, 8), ["news", "politic", "election", "government", "today"]),
    ("Sports", (3, 8), ["sport", "football", "soccer", "cricket", "nba", "nfl", "match", "ufc", "boxing"]),
    ("Stories & true crime", (3, 8), ["story", "stories", "crime", "mystery", "horror", "case"]),
    ("Gaming", (2, 6), ["game", "gaming", "gta", "minecraft", "fortnite", "roblox", "gameplay", "playstation", "xbox", "nintendo"]),
    ("Entertainment & comedy", (2, 5), ["funny", "comedy", "prank", "meme", "movie", "film", "celebrity", "reaction", "vlog"]),
    ("Music", (1, 4), ["music", "song", "lyrics", "remix", "beat", "lofi", "album"]),
    ("Kids", (1, 4), ["kids", "children", "nursery", "cartoon", "toy"]),
]
DEFAULT_CPM = ("General", (3, 8))
# Audience country vs US advertiser prices (rough, long-form).
COUNTRY_FACTOR = {
    "US": 1.0, "AU": 0.8, "CA": 0.75, "GB": 0.7, "DE": 0.65, "NL": 0.55, "SG": 0.5, "FR": 0.5, "JP": 0.45, "AE": 0.45,
    "KR": 0.35, "SA": 0.35, "IT": 0.35, "ES": 0.35, "ZA": 0.18, "BR": 0.15, "MX": 0.15, "MY": 0.12, "TR": 0.1, "TH": 0.1,
    "AR": 0.1, "IN": 0.08, "RU": 0.08, "PH": 0.07, "ID": 0.07, "VN": 0.07, "PK": 0.06, "EG": 0.06, "NG": 0.06, "BD": 0.05,
}


def cpm_estimate(topic: str, country: str = "US") -> dict:
    """Estimated CPM / RPM for a topic and audience country (long videos)."""
    t = f" {topic.lower()} "
    best, rng, hits = DEFAULT_CPM[0], DEFAULT_CPM[1], 0
    for name, r, words in CPM_NICHES:
        h = sum(1 for w in words if w in t)
        if h > hits:
            best, rng, hits = name, r, h
    f = COUNTRY_FACTOR.get((country or "US").upper(), 0.25 if country not in ("WW", "") else 0.45)
    lo, hi = rng[0] * f, rng[1] * f
    # Creators keep 55% of ad money and not every view shows an ad: RPM is roughly 40-50% of CPM.
    return {"niche": best, "country": country or "US", "cpm_low": round(lo, 2), "cpm_high": round(hi, 2),
            "rpm_low": round(lo * 0.4, 2), "rpm_high": round(hi * 0.5, 2), "estimate": True,
            "shorts_rpm": "about $0.03-0.08 per 1,000 Shorts views"}


# ---------------------------------------------------------------- analytics sign-in
_flow_state = {"busy": False, "error": "", "url": "", "done_id": "", "started": 0.0}


def _token_file(channel_id: str) -> Path:
    return TOKENS / f"analytics_token_{re.sub(r'[^A-Za-z0-9_-]', '', channel_id)[:60]}.json"


def _free_port() -> int:
    s = socket.socket()
    s.bind(("localhost", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def _secrets() -> dict:
    p = BASE_DIR / "client_secrets.json"
    if not p.exists():
        raise HTTPException(400, "Connect YouTube once first (top right) — the Google sign-in details are missing.")
    return json.loads(p.read_text(encoding="utf-8"))


def _wait(flow, port: int) -> None:
    got = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            got["path"] = self.path
            ok = "code=" in self.path
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            msg = ("✅ Analytics access allowed. You can close this tab and go back to YT Guru." if ok
                   else "Access was not allowed. Close this tab and try again in YT Guru.")
            self.wfile.write(f"<html><body style='font-family:sans-serif;padding:40px'><h2>{msg}</h2></body></html>".encode())

        def log_message(self, *a):  # quiet
            pass

    srv = http.server.HTTPServer(("localhost", port), H)
    srv.timeout = 300
    try:
        srv.handle_request()
    finally:
        srv.server_close()
    try:
        path = got.get("path", "")
        if "code=" not in path:
            raise RuntimeError("Google did not send access (it was cancelled or timed out).")
        flow.fetch_token(authorization_response=f"https://localhost:{port}{path}")
        creds = flow.credentials
        from googleapiclient.discovery import build
        yt = build("youtube", "v3", credentials=creds, cache_discovery=False)
        me = (yt.channels().list(part="id,snippet", mine=True).execute().get("items") or [{}])[0]
        cid = me.get("id")
        if not cid:
            raise RuntimeError("This Google account has no YouTube channel.")
        TOKENS.mkdir(parents=True, exist_ok=True)
        _token_file(cid).write_text(creds.to_json(), encoding="utf-8")
        _flow_state.update(done_id=cid, error="")
    except Exception as exc:  # noqa: BLE001
        _flow_state["error"] = str(exc)[:300]
    finally:
        _flow_state["busy"] = False


@router.post("/connect")
def connect() -> dict:
    """Open Google sign-in once to allow read-only analytics for a channel."""
    if _flow_state["busy"] and time.time() - _flow_state["started"] < 300:
        return {"auth_url": _flow_state["url"]}
    from google_auth_oauthlib.flow import Flow
    port = _free_port()
    flow = Flow.from_client_config(_secrets(), scopes=SCOPES, redirect_uri=f"http://localhost:{port}")
    url, _ = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="false")
    _flow_state.update(busy=True, error="", url=url, done_id="", started=time.time())
    threading.Thread(target=_wait, args=(flow, port), daemon=True).start()
    return {"auth_url": url}


@router.get("/connect-status")
def connect_status() -> dict:
    return {"busy": _flow_state["busy"], "error": _flow_state["error"], "channel_id": _flow_state["done_id"]}


def _analytics(channel_id: str):
    f = _token_file(channel_id)
    if not f.exists():
        return None
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    creds = Credentials.from_authorized_user_file(str(f))
    if not creds.valid and creds.refresh_token:
        creds.refresh(Request())
        f.write_text(creds.to_json(), encoding="utf-8")
    return build("youtubeAnalytics", "v2", credentials=creds, cache_discovery=False)


def _q(ya, start: str, end: str, metrics: str, **kw) -> list[dict]:
    """One Analytics report as a list of dicts (empty on error)."""
    try:
        d = ya.reports().query(ids="channel==MINE", startDate=start, endDate=end, metrics=metrics, **kw).execute()
    except Exception as exc:  # noqa: BLE001
        return [{"_error": str(exc)[:200]}]
    cols = [c["name"] for c in d.get("columnHeaders") or []]
    return [dict(zip(cols, r)) for r in d.get("rows") or []]


# ---------------------------------------------------------------- Studio CTR export
def _parse_ctr(raw: bytes, name: str) -> dict:
    """Studio export (zip or csv) -> {video_id: {impressions, ctr}} + channel totals."""
    texts = []
    if name.lower().endswith(".zip") or raw[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            for n in z.namelist():
                if n.lower().endswith(".csv"):
                    texts.append((n, z.read(n).decode("utf-8-sig", "replace")))
    else:
        texts.append((name, raw.decode("utf-8-sig", "replace")))
    out: dict = {"videos": {}, "total": {}}
    for n, txt in texts:
        rows = list(csv.DictReader(io.StringIO(txt)))
        if not rows:
            continue
        keys = list(rows[0].keys())
        k_imp = next((k for k in keys if k and k.strip().lower() == "impressions"), None)
        k_ctr = next((k for k in keys if k and "click-through" in k.lower()), None)
        k_id = next((k for k in keys if k and k.strip().lower() in ("content", "video")), None)
        k_title = next((k for k in keys if k and "title" in k.lower()), None)
        if not (k_imp and k_ctr):
            continue
        for r in rows:
            vid = (r.get(k_id) or "").strip() if k_id else ""
            try:
                imp = float((r.get(k_imp) or "0").replace(",", ""))
                ctr = float((r.get(k_ctr) or "0").replace(",", "").replace("%", ""))
            except ValueError:
                continue
            if vid.lower() == "total" or (not vid and (r.get(k_title) or "").strip().lower() == "total"):
                out["total"] = {"impressions": imp, "ctr": ctr}
            elif re.fullmatch(r"[A-Za-z0-9_-]{11}", vid):
                out["videos"][vid] = {"impressions": imp, "ctr": ctr, "title": (r.get(k_title) or "")[:100]}
    if not out["videos"] and not out["total"]:
        raise HTTPException(400, "This file has no Impressions / click-through columns. In Studio use Analytics → Advanced mode → "
                                 "Content tab → Export (↓) → Comma-separated values, then upload the zip it downloads.")
    if not out["total"] and out["videos"]:
        imp = sum(v["impressions"] for v in out["videos"].values())
        clicks = sum(v["impressions"] * v["ctr"] / 100 for v in out["videos"].values())
        out["total"] = {"impressions": imp, "ctr": round(100 * clicks / imp, 2) if imp else 0}
    return out


class CtrReq(BaseModel):
    channel_id: str = Field("", max_length=200)
    name: str = Field("export.zip", max_length=200)
    data_b64: str = Field(..., max_length=30_000_000)


@router.post("/ctr")
def upload_ctr(req: CtrReq) -> dict:
    try:
        raw = base64.b64decode(req.data_b64.split(",")[-1])
    except Exception:  # noqa: BLE001
        raise HTTPException(400, "The file could not be read.") from None
    parsed = _parse_ctr(raw, req.name)
    allc = {}
    try:
        allc = json.loads(CTR_FILE.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        pass
    allc[req.channel_id or "_"] = {**parsed, "saved": time.time()}
    CTR_FILE.write_text(json.dumps(allc), encoding="utf-8")
    return {"videos": len(parsed["videos"]), "total": parsed["total"]}


def _ctr_for(cid: str) -> dict:
    try:
        allc = json.loads(CTR_FILE.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}
    return allc.get(cid) or allc.get("_") or {}


# ---------------------------------------------------------------- the check
class CheckReq(tr.Base):
    days: int = Field(90, ge=28, le=365)
    country: str = Field("US", max_length=3)


def _gap_days(dates: list[float]) -> float:
    gaps = [b - a for a, b in zip(dates, dates[1:])]
    return statistics.median(gaps) if gaps else 0


def _f(sev: str, area: str, title: str, evidence: str, fix: str, weight: float) -> dict:
    return {"severity": sev, "area": area, "title": title, "evidence": evidence, "fix": fix, "weight": weight}


@router.post("/check")
def check(req: CheckReq) -> dict:
    key, cid = req.api_key, req.channel_id
    try:
        chans = tr._get("channels", {"part": "snippet,statistics,contentDetails,status,brandingSettings",
                                     **({"id": cid} if cid else {"mine": "true"})}, key if cid else "", cid)
    except tr.ApiProblem as exc:
        raise HTTPException(400, str(exc)) from None
    ch = (chans.get("items") or [None])[0]
    if not ch:
        raise HTTPException(400, "Channel not found. Pick your channel at the top right.")
    cid = ch["id"]
    st, sn = ch.get("statistics") or {}, ch.get("snippet") or {}
    uploads = ((ch.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads", "")
    ids: list[str] = []
    page = ""
    for _ in range(2):  # last 100 uploads
        d = tr._get("playlistItems", {"part": "contentDetails", "playlistId": uploads, "maxResults": 50, "pageToken": page}, key, cid)
        ids += [it["contentDetails"]["videoId"] for it in d.get("items") or []]
        page = d.get("nextPageToken") or ""
        if not page:
            break
    vids = [tr._video_row(v, {cid: ch}) for v in tr._videos(ids, key, cid)]
    vids.sort(key=lambda v: v["age_days"])
    for v in vids:
        v["published_ago"] = v["age_days"]

    findings: list[dict] = []
    subs = int(tr._num(st.get("subscriberCount")))
    n = len(vids)
    longs = [v for v in vids if not v["short"]]
    shorts = [v for v in vids if v["short"]]
    recent30 = [v for v in vids if v["age_days"] <= 30]
    if n == 0:
        findings.append(_f("high", "uploads", "No public videos yet", "The channel has no public uploads.",
                           "Publish 3 videos in the first week, then keep a fixed schedule.", 10))
    else:
        dates = sorted(-v["age_days"] for v in vids[:20])
        gap = _gap_days(dates)
        if len(recent30) < 4:
            findings.append(_f("high" if len(recent30) <= 1 else "medium", "uploads", "Not uploading often enough",
                               f"{len(recent30)} uploads in the last 30 days (typical gap between uploads: {gap:.0f} days).",
                               "New channels grow on volume: at least 2 long videos (or 1 long + 3 Shorts) a week, on fixed days, for 3 months.", 7))
        if vids[0]["age_days"] > 21:
            findings.append(_f("high", "uploads", "The channel has gone quiet", f"Last upload was {vids[0]['age_days']:.0f} days ago.",
                               "YouTube stops testing a channel that stops posting. Upload again this week and keep the schedule.", 8))
        med_views = statistics.median([v["views"] for v in vids[:20]])
        ranked = sorted(vids, key=lambda v: -v["views_per_day"])
        best = ranked[0]
        if best["views"] > max(3 * med_views, 200):
            findings.append(_f("info", "winners", "One video worked much better — make more like it",
                               f"“{best['title']}” has {tr._fmt(best['views'])} views vs a typical {tr._fmt(med_views)}.",
                               "Make 3 more videos on the same topic and promise (similar title shape and thumbnail style).", 6))
        titles = [v["title"] for v in vids[:30]]
        bad_len = [t for t in titles if len(t) > 70 or len(t) < 25]
        if len(bad_len) > len(titles) * 0.4:
            findings.append(_f("medium", "titles", "Titles are too long or too short",
                               f"{len(bad_len)} of {len(titles)} recent titles are outside 25-70 characters (e.g. “{bad_len[0][:80]}”).",
                               "Keep titles 40-60 characters: the main searched words first, then a clear promise or curiosity.", 4))
        likes = sum(v["likes"] for v in vids[:20])
        views20 = sum(v["views"] for v in vids[:20]) or 1
        if views20 > 500 and likes / views20 < 0.02:
            findings.append(_f("low", "engagement", "Few likes per view",
                               f"{100 * likes / views20:.1f}% of viewers like the videos (healthy: 3-5%).",
                               "Deliver the title's promise fast, and ask one specific question near the end to start comments.", 2))
        if longs and shorts and len(shorts) > len(longs) * 3:
            findings.append(_f("medium", "format", "Mostly Shorts",
                               f"{len(shorts)} Shorts vs {len(longs)} long videos. Shorts viewers rarely subscribe or watch long videos, and pay much less.",
                               "Use Shorts as trailers: every Short cut from a long video, with the long video linked as a related video.", 4))
        if longs and statistics.median([v["secs"] for v in longs]) < 240:
            findings.append(_f("low", "format", "Long videos are very short",
                               f"Typical long video is {statistics.median([v['secs'] for v in longs]) / 60:.1f} minutes.",
                               "8-12 minutes earns more watch time and allows mid-roll ads once monetized — if the story really fills it.", 2))
    status = ch.get("status") or {}
    if status.get("madeForKids"):
        findings.append(_f("high", "settings", "Channel is set as “Made for kids”",
                           "Made-for-kids turns off comments, notifications bell and personalized ads, and limits recommendations.",
                           "If children are not your real audience: Studio → Settings → Channel → Advanced → “No, it's not made for kids”.", 9))
    br = (ch.get("brandingSettings") or {}).get("channel") or {}
    if len(sn.get("description") or "") < 100 or not br.get("keywords"):
        findings.append(_f("low", "settings", "About section is thin",
                           f"Description has {len(sn.get('description') or '')} characters; keywords {'are missing' if not br.get('keywords') else 'set'}.",
                           "Write a 2-3 paragraph About with your main search words, and add channel keywords (New Channel Wizard writes them).", 1.5))

    # ---- analytics (if allowed)
    ana: dict = {"connected": False}
    ya = None
    try:
        ya = _analytics(cid)
    except Exception as exc:  # noqa: BLE001
        ana["error"] = f"Analytics sign-in expired — allow analytics again. ({str(exc)[:100]})"
    if ya is not None:
        end = (datetime.date.today() - datetime.timedelta(days=2)).isoformat()
        start = (datetime.date.today() - datetime.timedelta(days=2 + req.days)).isoformat()
        ana["connected"] = True
        tot = _q(ya, start, end, "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,shares")
        ana["totals"] = tot[0] if tot and "_error" not in tot[0] else {}
        if tot and "_error" in tot[0]:
            ana["error"] = tot[0]["_error"]
        src = [r for r in _q(ya, start, end, "views", dimensions="insightTrafficSourceType", sort="-views") if "_error" not in r]
        ana["traffic"] = src
        ana["countries"] = [r for r in _q(ya, start, end, "views,averageViewPercentage", dimensions="country", sort="-views", maxResults=10)
                            if "_error" not in r]
        ana["types"] = [r for r in _q(ya, start, end, "views,averageViewPercentage,averageViewDuration", dimensions="creatorContentType")
                        if "_error" not in r]
        per = [r for r in _q(ya, start, end, "views,averageViewDuration,averageViewPercentage,subscribersGained",
                             dimensions="video", sort="-views", maxResults=50) if "_error" not in r]
        by_id = {r["video"]: r for r in per}
        for v in vids:
            r = by_id.get(v["id"])
            if r:
                v.update(avg_view_pct=round(float(r.get("averageViewPercentage") or 0), 1),
                         avg_view_secs=int(r.get("averageViewDuration") or 0), subs_gained=int(r.get("subscribersGained") or 0))
        money = _q(ya, start, end, "estimatedRevenue,cpm,playbackBasedCpm,monetizedPlaybacks")
        if money and "_error" not in money[0] and float(money[0].get("monetizedPlaybacks") or 0) > 0:
            m = money[0]
            views = float(ana["totals"].get("views") or 0)
            ana["money"] = {"revenue": round(float(m.get("estimatedRevenue") or 0), 2), "cpm": round(float(m.get("cpm") or 0), 2),
                            "playback_cpm": round(float(m.get("playbackBasedCpm") or 0), 2),
                            "rpm": round(1000 * float(m.get("estimatedRevenue") or 0) / views, 2) if views else 0}
        # retention curve of the latest long videos: how many are still watching at 30 seconds
        curves = []
        for v in [x for x in vids if not x["short"] and x["secs"] >= 90][:5]:
            rows = [r for r in _q(ya, start, end, "audienceWatchRatio,relativeRetentionPerformance", dimensions="elapsedVideoTimeRatio",
                                  filters=f"video=={v['id']}") if "_error" not in r]
            if not rows:
                continue
            at = min(0.99, 30 / v["secs"])
            near = min(rows, key=lambda r: abs(float(r["elapsedVideoTimeRatio"]) - at))
            rel = statistics.mean(float(r.get("relativeRetentionPerformance") or 0.5) for r in rows)
            curves.append({"id": v["id"], "title": v["title"], "at30": round(100 * float(near["audienceWatchRatio"])),
                           "vs_similar": round(rel, 2)})
            v["at30"] = round(100 * float(near["audienceWatchRatio"]))
        ana["retention"] = curves

        t = ana["totals"]
        avp = float(t.get("averageViewPercentage") or 0)
        avd = float(t.get("averageViewDuration") or 0)
        if curves:
            hook = statistics.mean(c["at30"] for c in curves)
            if hook < 60:
                findings.append(_f("high", "hook", "Viewers leave in the first 30 seconds",
                                   f"Only {hook:.0f}% are still watching at 0:30 on your latest long videos (good: 70%+).",
                                   "Start with the title's promise in the first sentence, cut intros/logos/greetings, show the most interesting picture first.", 9))
            rel = statistics.mean(c["vs_similar"] for c in curves)
            if rel < 0.4:
                findings.append(_f("high", "retention", "People stop watching sooner than on similar videos",
                                   f"Your retention is below most YouTube videos of the same length (score {rel:.2f}, middle = 0.50).",
                                   "Tighter scripts: one idea per scene, no repeats, change the picture every few seconds, put a reason to stay before each section.", 8))
        if avp and avp < 35 and longs:
            findings.append(_f("medium", "retention", "Low average view percentage",
                               f"Viewers watch {avp:.0f}% of a video on average ({avd / 60:.1f} min).",
                               "Shorter, faster videos until retention is above 40%; remove slow parts you see in Studio's retention graph.", 6))
        tv = sum(float(r.get("views") or 0) for r in src) or 0
        if tv > 100:
            share = {r["insightTrafficSourceType"]: float(r["views"]) / tv for r in src}
            browse = share.get("SUBSCRIBER", 0)
            ext = share.get("EXT_URL", 0) + share.get("NO_LINK_OTHER", 0)
            if share.get("YT_SEARCH", 0) < 0.1 and share.get("RELATED_VIDEO", 0) < 0.15 and browse < 0.15 and share.get("SHORTS", 0) < 0.3:
                findings.append(_f("high", "discovery", "YouTube is not recommending the videos",
                                   f"Search {share.get('YT_SEARCH', 0):.0%}, suggested {share.get('RELATED_VIDEO', 0):.0%}, home/browse {browse:.0%} of views.",
                                   "Pick topics people already search (Research Lab → Next video, score 55+) and copy the angle of small channels that won.", 9))
            if ext > 0.4:
                findings.append(_f("medium", "discovery", "Most views come from outside YouTube",
                                   f"{ext:.0%} of views are from links/other sites — these viewers rarely watch long, which hurts recommendations.",
                                   "Stop sharing in groups for views; let YouTube's search and suggestions bring the right viewers.", 5))
            ana["traffic_share"] = {k: round(v * 100, 1) for k, v in share.items()}
        sg = float(t.get("subscribersGained") or 0)
        vv = float(t.get("views") or 0)
        if vv > 1000 and sg / vv * 1000 < 2:
            findings.append(_f("low", "subscribers", "Viewers don't subscribe",
                               f"{1000 * sg / vv:.1f} new subscribers per 1,000 views (healthy: 5+).",
                               "Make series (part 1/2/3) and say what the next video is; keep every video in one niche.", 3))

    # ---- impressions & CTR (Studio export)
    ctr = _ctr_for(cid)
    if ctr:
        ana["ctr"] = ctr.get("total") or {}
        for v in vids:
            c = (ctr.get("videos") or {}).get(v["id"])
            if c:
                v.update(impressions=int(c["impressions"]), ctr=c["ctr"])
        c = ana["ctr"].get("ctr") or 0
        imp = ana["ctr"].get("impressions") or 0
        if imp and c < 3:
            findings.append(_f("high", "click", "Thumbnails and titles don't get clicks",
                               f"Click-through rate is {c:.1f}% of {tr._fmt(imp)} impressions (new channels should aim for 4-8%).",
                               "One big face/object + max 3 words on the thumbnail, strong contrast; title = a clear benefit or curiosity, not a description.", 9))
        elif imp and n and imp / max(1, n) < 1000:
            findings.append(_f("medium", "click", "YouTube shows the videos to very few people",
                               f"About {tr._fmt(imp / max(1, n))} impressions per video.",
                               "Topics with search demand + a consistent niche so YouTube learns who to show you to.", 6))

    findings.sort(key=lambda f: -f["weight"])
    score = max(5, round(100 - sum(f["weight"] for f in findings if f["severity"] != "info") * 1.4))
    topic = " ".join(v["title"] for v in vids[:15]) + " " + (sn.get("description") or "")[:300]
    cpm = cpm_estimate(topic, req.country)
    return {"channel": {"id": cid, "title": sn.get("title", ""), "subs": subs, "views": int(tr._num(st.get("viewCount"))),
                        "videos": int(tr._num(st.get("videoCount"))), "thumb": ((sn.get("thumbnails") or {}).get("default") or {}).get("url", "")},
            "score": score, "findings": findings, "videos": vids[:50], "analytics": ana, "cpm": cpm, "days": req.days,
            "has_ctr": bool(ctr), "used_today": tr._quota()["used"]}


class DiagnoseReq(tr.Base):
    data: dict = Field(default_factory=dict)
    language: str = Field("en", max_length=5)


@router.post("/diagnose")
def diagnose(req: DiagnoseReq) -> dict:
    """AI: the top reasons the channel is not getting views, in priority order, with fixes."""
    d = req.data or {}
    vids = d.get("videos") or []
    lines = "\n".join(
        f"- {v.get('title')} | {v.get('views')} views | {round((v.get('secs') or 0) / 60, 1)} min{' (Short)' if v.get('short') else ''} | "
        f"{v.get('age_days')} d ago" + (f" | {v['avg_view_pct']}% watched" if v.get("avg_view_pct") else "")
        + (f" | {v['at30']}% at 0:30" if v.get("at30") else "") + (f" | CTR {v['ctr']}%" if v.get("ctr") is not None else "")
        for v in vids[:25])
    finds = "\n".join(f"- [{f.get('severity')}] {f.get('title')}: {f.get('evidence')}" for f in d.get("findings") or [])
    a = d.get("analytics") or {}
    p = (f"You are a strict, practical YouTube growth coach. Channel: {(d.get('channel') or {}).get('title')} "
         f"({(d.get('channel') or {}).get('subs')} subscribers). Measured problems:\n{finds or '- none measured'}\n"
         f"Analytics: {json.dumps({k: a.get(k) for k in ('totals', 'traffic_share', 'ctr', 'types', 'retention')}, default=str)[:1500]}\n"
         f"Recent videos:\n{lines}\n\n"
         "Write in simple English: '## Why you are not getting views' — the TOP 5 reasons in priority order, each with the "
         "evidence from the data (numbers), and 2-3 exact fixes. Judge the TITLES yourself too (clarity, curiosity, search words, "
         "one niche or scattered). Then '## Your next 3 videos' with 3 titles that fix these problems, and '## This week' with a "
         "5-step checklist. No fluff, no generic advice without evidence.")
    try:
        text = tr._ai(p, req.gemini_key)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"AI is busy: {str(exc)[:120]}") from None
    return {"text": (text or "").strip()}


class CpmReq(BaseModel):
    topics: list[str] = Field(default_factory=list, max_length=60)
    country: str = Field("US", max_length=3)


@router.post("/cpm")
def cpm(req: CpmReq) -> dict:
    return {"items": {t: cpm_estimate(t, req.country) for t in req.topics[:60]}}
