"""Topic Research Lab + New Channel Wizard (user, 2026-11-19).

"Research and tell me which topic to make next — high views, low competition";
"what is trending now (by country, or worldwide)"; "which niche would work for a
new channel, what name, what description".

Free data, honestly used:
  * the YouTube Data API — with your connected channel's sign-in (or an optional
    API key in the Dashboard). 10,000 free units a day: a search costs 100, video /
    channel details cost 1. Results are cached for a day so nothing is paid twice.
  * YouTube search suggestions (what people type).
  * the AI (your Gemini key, else the free AI) only to explain the numbers and write
    names / descriptions — the scores themselves come from real data.

  GET  /api/research/status
  POST /api/research/keywords   {seed, country, language, count}
  POST /api/research/trending   {country | "WW", category, niche}
  POST /api/research/outliers   {seed, country, days}
  POST /api/research/niches     {interests, language, country, face, format}
  POST /api/research/names      {niche, language, style}
  POST /api/research/advice     {kind, niche, data}
"""
from __future__ import annotations

import datetime
import json
import math
import re
import statistics
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

router = APIRouter(prefix="/api/research", tags=["research"])
BASE_DIR = Path(__file__).resolve().parent.parent
CACHE_FILE = BASE_DIR / "research_cache.json"
QUOTA_FILE = BASE_DIR / "research_quota.json"
DAILY_UNITS = 10000
_lock = threading.Lock()

WORLD = ["US", "GB", "IN", "PK", "CA", "AU", "BR", "MX", "DE", "JP", "ID", "PH"]
CATEGORIES = {"1": "Film & Animation", "2": "Cars", "10": "Music", "15": "Pets & Animals", "17": "Sports",
              "20": "Gaming", "22": "People & Blogs", "23": "Comedy", "24": "Entertainment", "25": "News & Politics",
              "26": "Howto & Style", "27": "Education", "28": "Science & Technology"}


# ------------------------------------------------------------------ the API
class ApiProblem(Exception):
    pass


def _quota() -> dict:
    today = datetime.date.today().isoformat()
    try:
        q = json.loads(QUOTA_FILE.read_text(encoding="utf-8"))
        if q.get("day") == today:
            return q
    except (OSError, ValueError):
        pass
    return {"day": today, "used": 0}


def _spend(units: int) -> None:
    with _lock:
        q = _quota()
        q["used"] = int(q.get("used", 0)) + units
        QUOTA_FILE.write_text(json.dumps(q), encoding="utf-8")


_COST = {"search": 100}
_client_cache: dict = {}


def _oauth_client(channel_id: str = ""):
    import youtube_upload as yu
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    chans = yu.list_connected_channels()
    if not chans:
        raise ApiProblem("No YouTube channel is connected. Connect one (top right), or add a YouTube API key in the Dashboard.")
    cid = channel_id if any(c["id"] == channel_id for c in chans) else chans[0]["id"]
    if cid in _client_cache:
        return _client_cache[cid]
    token = yu.token_path_for_channel(cid)
    creds = Credentials.from_authorized_user_file(str(token))
    yt = build("youtube", "v3", credentials=creds, cache_discovery=False)
    _client_cache[cid] = yt
    return yt


def _get(resource: str, params: dict, key: str = "", channel_id: str = "") -> dict:
    """One YouTube Data API call (search / videos / channels / videoCategories)."""
    cost = _COST.get(resource, 1)
    if _quota()["used"] + cost > DAILY_UNITS:
        raise ApiProblem("Today's free YouTube research limit is used up (10,000 units). It resets tomorrow — cached results still work.")
    params = {k: v for k, v in params.items() if v not in (None, "")}
    try:
        if key:
            url = f"https://www.googleapis.com/youtube/v3/{resource}?" + urllib.parse.urlencode({**params, "key": key})
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "YTGuru"}), timeout=30) as r:
                data = json.loads(r.read().decode())
        else:
            yt = _oauth_client(channel_id)
            data = getattr(yt, resource)().list(**params).execute()
    except ApiProblem:
        raise
    except urllib.error.HTTPError as exc:
        _spend(cost)
        body = exc.read().decode("utf-8", "ignore")[:300]
        if "quotaExceeded" in body:
            raise ApiProblem("YouTube says today's API limit is used up. Try again tomorrow.") from exc
        if exc.code in (400, 403) and "key" in body.lower():
            raise ApiProblem("The YouTube API key was not accepted — check it in the Dashboard.") from exc
        raise ApiProblem(f"YouTube API error {exc.code}: {body[:160]}") from exc
    except Exception as exc:  # noqa: BLE001
        _spend(cost)
        t = str(exc)
        if "quotaExceeded" in t:
            raise ApiProblem("YouTube says today's API limit is used up. Try again tomorrow.") from exc
        if "videoChartNotFound" in t or "notFound" in t:
            return {"items": []}
        raise ApiProblem(f"YouTube API: {t[:200]}") from exc
    _spend(cost)
    return data


# ------------------------------------------------------------------ cache
def _cache_get(k: str, hours: float = 24):
    try:
        c = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        v = c.get(k)
        if v and time.time() - v["t"] < hours * 3600:
            return v["d"]
    except (OSError, ValueError):
        pass
    return None


def _cache_put(k: str, d) -> None:
    with _lock:
        try:
            c = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            c = {}
        now = time.time()
        c = {kk: vv for kk, vv in c.items() if now - vv.get("t", 0) < 3 * 86400}
        c[k] = {"t": now, "d": d}
        CACHE_FILE.write_text(json.dumps(c), encoding="utf-8")


# ------------------------------------------------------------------ helpers
def _num(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _age_days(published: str) -> float:
    try:
        t = datetime.datetime.fromisoformat(published.replace("Z", "+00:00"))
        return max(0.5, (datetime.datetime.now(datetime.timezone.utc) - t).total_seconds() / 86400)
    except (ValueError, AttributeError):
        return 365.0


def _secs(iso: str) -> int:
    m = re.match(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return 0
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + s


def _median(xs: list[float]) -> float:
    return float(statistics.median(xs)) if xs else 0.0


def _fmt(n: float) -> str:
    n = float(n)
    for div, suf in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if n >= div:
            return f"{n / div:.1f}".rstrip("0").rstrip(".") + suf
    return str(int(n))


def suggestions(seed: str, language: str = "en", country: str = "US", deep: bool = True) -> list[str]:
    """What people type on YouTube around a seed (free suggest endpoint)."""
    seed = seed.strip()
    if not seed:
        return []
    queries = [seed] + ([f"{seed} {c}" for c in "abcdefghijklmnoprstuvwy"] + [f"how to {seed}", f"why {seed}", f"best {seed}",
                                                                              f"{seed} for beginners", f"{seed} tips"] if deep else [])
    found: dict[str, int] = {}

    def one(q: str) -> list[str]:
        url = "https://suggestqueries.google.com/complete/search?" + urllib.parse.urlencode(
            {"client": "youtube", "ds": "yt", "q": q, "hl": language or "en", "gl": (country or "US")[:2]})
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=10) as r:
                body = r.read().decode("utf-8", "ignore").strip()
            if body.startswith("window.google.ac.h("):
                body = body[len("window.google.ac.h("):-1]
            data = json.loads(body)
            return [str(x[0]) for x in data[1]][:10]
        except Exception:  # noqa: BLE001
            return []
    with ThreadPoolExecutor(max_workers=8) as pool:
        for k, res in enumerate(pool.map(one, queries)):
            for rank, s in enumerate(res):
                s = s.strip().lower()
                if s and s != seed.lower():
                    found[s] = found.get(s, 0) + (12 - rank) + (8 if k == 0 else 0)
    return [s for s, _ in sorted(found.items(), key=lambda x: -x[1])][:80]


def _videos(ids: list[str], key: str, cid: str) -> list[dict]:
    out = []
    for i in range(0, len(ids), 50):
        d = _get("videos", {"part": "snippet,statistics,contentDetails", "id": ",".join(ids[i:i + 50])}, key, cid)
        out += d.get("items") or []
    return out


def _channels(ids: list[str], key: str, cid: str) -> dict:
    out = {}
    ids = list(dict.fromkeys(ids))
    for i in range(0, len(ids), 50):
        d = _get("channels", {"part": "statistics,snippet", "id": ",".join(ids[i:i + 50])}, key, cid)
        for it in d.get("items") or []:
            out[it["id"]] = it
    return out


def _video_row(v: dict, ch: dict) -> dict:
    sn, st = v.get("snippet") or {}, v.get("statistics") or {}
    views = _num(st.get("viewCount"))
    age = _age_days(sn.get("publishedAt", ""))
    subs = _num(((ch.get(sn.get("channelId", "")) or {}).get("statistics") or {}).get("subscriberCount"))
    secs = _secs((v.get("contentDetails") or {}).get("duration", ""))
    return {"id": v.get("id"), "title": sn.get("title", ""), "channel": sn.get("channelTitle", ""), "channel_id": sn.get("channelId", ""),
            "views": int(views), "age_days": round(age, 1), "views_per_day": round(views / age, 1), "subs": int(subs),
            "ratio": round(views / max(subs, 100), 2), "short": 0 < secs <= 62, "secs": secs,
            "likes": int(_num(st.get("likeCount"))), "comments": int(_num(st.get("commentCount"))),
            "thumb": ((sn.get("thumbnails") or {}).get("medium") or {}).get("url", ""),
            "url": f"https://www.youtube.com/watch?v={v.get('id')}"}


def analyze_keyword(kw: str, country: str, language: str, key: str = "", cid: str = "") -> dict:
    """Demand vs competition for one keyword, from the videos ranking for it right now."""
    ck = f"kw|{kw.lower()}|{country}|{language}"
    hit = _cache_get(ck)
    if hit:
        return hit
    s = _get("search", {"part": "id", "q": kw, "type": "video", "maxResults": 20, "regionCode": country if country != "WW" else "",
                        "relevanceLanguage": language, "order": "relevance"}, key, cid)
    ids = [it["id"]["videoId"] for it in s.get("items") or [] if (it.get("id") or {}).get("videoId")]
    vids = _videos(ids, key, cid) if ids else []
    chs = _channels([(v.get("snippet") or {}).get("channelId", "") for v in vids], key, cid) if vids else {}
    rows = [_video_row(v, chs) for v in vids]
    top = rows[:10]
    recent = [r for r in rows if r["age_days"] <= 365] or rows
    vpd = _median([r["views_per_day"] for r in recent[:10]])
    med_views = _median([r["views"] for r in top])
    med_subs = _median([r["subs"] for r in top])
    big = sum(1 for r in top if r["subs"] >= 500_000) / max(1, len(top))
    small_win = [r for r in rows if r["subs"] < 100_000 and r["views"] >= max(10_000, r["subs"] * 2)]
    words = [w for w in re.findall(r"[a-z0-9]+", kw.lower()) if len(w) > 2]
    exact = sum(1 for r in top if words and all(w in r["title"].lower() for w in words)) / max(1, len(top))
    demand = min(100.0, 25 * math.log10(vpd + 1))
    comp = min(1.0, 0.45 * big + 0.35 * min(1.0, math.log10(med_subs + 1) / 6.3) + 0.2 * exact)
    score = max(0.0, min(100.0, demand * (1 - 0.7 * comp) + 12 * min(1.0, len(small_win) / 4)))
    out = {"keyword": kw, "score": round(score), "demand": round(demand), "competition": round(comp * 100),
           "views_per_day": round(vpd), "median_views": int(med_views), "median_subs": int(med_subs),
           "big_channels": round(big * 100), "small_wins": len(small_win), "exact_titles": round(exact * 100),
           "shorts_share": round(100 * sum(1 for r in rows if r["short"]) / max(1, len(rows))),
           "label": "great" if score >= 60 else "ok" if score >= 38 else "hard",
           "videos": sorted(top, key=lambda r: -r["views_per_day"])[:6], "examples": sorted(small_win, key=lambda r: -r["ratio"])[:4]}
    _cache_put(ck, out)
    return out


def _ai(prompt: str, gemini_key: str = "") -> str:
    import tools_animator as ta
    return ta._ai_text(prompt, gemini_key)


def _ai_json(prompt: str, gemini_key: str = ""):
    import tools_animator as ta
    try:
        return ta._json_in(_ai(prompt, gemini_key))
    except Exception:  # noqa: BLE001
        return None


# ------------------------------------------------------------------ endpoints
class Base(BaseModel):
    api_key: str = Field("", max_length=200)
    channel_id: str = Field("", max_length=200)
    gemini_key: str = Field("", max_length=200)

    @model_validator(mode="before")
    @classmethod
    def _fit(cls, v):
        """Long text is cut to fit instead of failing (a channel's niche can be a whole paragraph)."""
        if isinstance(v, dict):
            v = dict(v)
            for k, n in (("seed", 400), ("niche", 1500), ("interests", 300), ("country", 3), ("language", 5), ("category", 4), ("format", 10), ("style", 20)):
                if isinstance(v.get(k), str):
                    v[k] = v[k].strip()[:n]
            for k in ("api_key", "gemini_key", "channel_id"):
                if isinstance(v.get(k), str):
                    v[k] = v[k].strip()[:200]
        return v


_SEED_STOP = set("the a an and or of for to in on with my your our channel videos video youtube about how why what best "
                 "tips daily explained explainer explainers micro bite sized short shorts long form content".split())


def short_seed(text: str, gemini_key: str = "") -> str:
    """A YouTube search people really type (2-4 words) from a long niche description."""
    t = re.sub(r"\s+", " ", text or "").strip()
    if len(t.split()) <= 4 and len(t) <= 40:
        return t
    try:
        out = _ai(f'This describes a YouTube channel: "{t[:600]}". Reply with ONLY the 2-4 word YouTube search that best '
                  "names its topic, the way viewers type it (e.g. personal finance tips). No quotes, no brand names.", gemini_key)
        out = re.sub(r"[^\w\s'&-]", "", (out or "").strip().splitlines()[0] if out and out.strip() else "").strip().lower()
        if 1 <= len(out.split()) <= 5 and 3 <= len(out) <= 50:
            return out
    except Exception:  # noqa: BLE001
        pass
    words = [w for w in re.findall(r"[a-z0-9']+", t.lower()) if w not in _SEED_STOP and len(w) > 2]
    return " ".join(words[1:4] if len(words) > 3 else words[:3]) or t[:40]


def _add_cpm(rows: list[dict], field: str, extra: str, country: str) -> None:
    """Estimated CPM / RPM for each topic (a labelled estimate, user 2026-11-19)."""
    try:
        import tools_doctor
    except Exception:  # noqa: BLE001
        return
    for r in rows:
        r["cpm"] = tools_doctor.cpm_estimate(f"{r.get(field, '')} {r.get('search', '')} {extra}", country)


@router.get("/status")
def status() -> dict:
    q = _quota()
    chans = []
    try:
        import youtube_upload as yu
        chans = yu.list_connected_channels()
    except Exception:  # noqa: BLE001
        pass
    return {"connected": bool(chans), "channels": chans, "used_today": q.get("used", 0), "limit": DAILY_UNITS,
            "categories": CATEGORIES, "world": WORLD}


class KeywordReq(Base):
    seed: str = Field(..., min_length=2, max_length=400)
    country: str = Field("US", max_length=3)
    language: str = Field("en", max_length=5)
    count: int = Field(10, ge=3, le=25)


@router.post("/keywords")
def keywords(req: KeywordReq) -> dict:
    """Next video for my channel: the seed's searches, each scored on real data."""
    req.seed = short_seed(req.seed, req.gemini_key)
    sugg = suggestions(req.seed, req.language, req.country)
    pick = [req.seed.lower()] + [s for s in sugg if len(s.split()) >= 2][: req.count - 1]
    results, errors = [], []
    for kw in pick:
        try:
            results.append(analyze_keyword(kw, req.country, req.language, req.api_key, req.channel_id))
        except ApiProblem as exc:
            errors.append(str(exc))
            break
    results.sort(key=lambda r: -r["score"])
    if not results and errors:
        raise HTTPException(400, errors[0])
    _add_cpm(results, "keyword", req.seed, req.country)
    return {"seed": req.seed, "results": results, "more": [s for s in sugg if s not in pick][:40], "errors": errors,
            "used_today": _quota()["used"]}


class TrendReq(Base):
    country: str = Field("US", max_length=3)
    category: str = Field("", max_length=4)
    niche: str = Field("", max_length=1500)


@router.post("/trending")
def trending(req: TrendReq) -> dict:
    """What is trending right now — one country, or worldwide (several countries joined)."""
    regions = WORLD if req.country == "WW" else [req.country]
    ck = f"tr|{req.country}|{req.category}"
    rows = _cache_get(ck, hours=3)
    errors: list[str] = []
    if rows is None:
        seen: dict[str, dict] = {}
        for rg in regions:
            try:
                d = _get("videos", {"part": "snippet,statistics,contentDetails", "chart": "mostPopular", "regionCode": rg,
                                    "videoCategoryId": req.category, "maxResults": 50}, req.api_key, req.channel_id)
            except ApiProblem as exc:
                errors.append(str(exc))
                break
            for rank, v in enumerate(d.get("items") or []):
                r = seen.get(v["id"])
                if r is None:
                    r = _video_row(v, {})
                    r.update(countries=[], best_rank=rank + 1, category=CATEGORIES.get((v.get("snippet") or {}).get("categoryId", ""), ""),
                             tags=((v.get("snippet") or {}).get("tags") or [])[:12])
                    r["views_per_hour"] = round(r["views"] / max(1.0, r["age_days"] * 24))
                    seen[v["id"]] = r
                if rg not in r["countries"]:
                    r["countries"].append(rg)
                r["best_rank"] = min(r["best_rank"], rank + 1)
        rows = sorted(seen.values(), key=lambda r: (-len(r["countries"]), r["best_rank"], -r["views_per_hour"]))
        if rows:
            _cache_put(ck, rows)
    words = {w for w in re.findall(r"[a-z0-9]+", req.niche.lower()) if len(w) > 2}
    for r in rows:
        text = (r["title"] + " " + " ".join(r.get("tags") or [])).lower()
        r["fits"] = bool(words) and any(w in text for w in words)
    # what keeps coming back in the trending titles (topics)
    counts: dict[str, int] = {}
    stop = set("the and for with you your this that from are was have has not but all how why what who when new official video "
               "trailer episode full part live 2024 2025 2026 vs ft feat".split())
    for r in rows[:150]:
        for w in set(re.findall(r"[a-z][a-z0-9]{3,}", r["title"].lower())):
            if w not in stop:
                counts[w] = counts.get(w, 0) + 1
    topics = [w for w, c in sorted(counts.items(), key=lambda x: -x[1]) if c >= 2][:20]
    if not rows and errors:
        raise HTTPException(400, errors[0])
    return {"videos": rows[:100], "topics": topics, "errors": errors, "countries": regions, "used_today": _quota()["used"]}


class OutlierReq(Base):
    seed: str = Field(..., min_length=2, max_length=400)
    country: str = Field("US", max_length=3)
    language: str = Field("en", max_length=5)
    days: int = Field(90, ge=7, le=365)


@router.post("/outliers")
def outliers(req: OutlierReq) -> dict:
    """Small channels whose recent videos did far better than their size — proof a topic works."""
    req.seed = short_seed(req.seed, req.gemini_key)
    since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=req.days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    sugg = [s for s in suggestions(req.seed, req.language, req.country, deep=False) if len(s.split()) >= 2][:2]
    ids: list[str] = []
    errors = []
    for q in [req.seed] + sugg:
        ck = f"out|{q}|{req.country}|{req.days}"
        got = _cache_get(ck)
        if got is None:
            try:
                d = _get("search", {"part": "id", "q": q, "type": "video", "maxResults": 50, "order": "viewCount",
                                    "publishedAfter": since, "regionCode": req.country if req.country != "WW" else "",
                                    "relevanceLanguage": req.language}, req.api_key, req.channel_id)
            except ApiProblem as exc:
                errors.append(str(exc))
                break
            got = [it["id"]["videoId"] for it in d.get("items") or [] if (it.get("id") or {}).get("videoId")]
            _cache_put(ck, got)
        ids += got
    ids = list(dict.fromkeys(ids))
    rows = []
    if ids:
        try:
            vids = _videos(ids, req.api_key, req.channel_id)
            chs = _channels([(v.get("snippet") or {}).get("channelId", "") for v in vids], req.api_key, req.channel_id)
            rows = [_video_row(v, chs) for v in vids]
        except ApiProblem as exc:
            errors.append(str(exc))
    if not rows and errors:
        raise HTTPException(400, errors[0])
    rows = [r for r in rows if r["subs"] < 250_000 and r["views"] >= 5_000]
    rows.sort(key=lambda r: -(r["ratio"] * math.log10(r["views"] + 10)))
    return {"videos": rows[:30], "searched": [req.seed] + sugg, "errors": errors, "used_today": _quota()["used"]}


class NicheReq(Base):
    interests: str = Field("", max_length=300)
    language: str = Field("en", max_length=5)
    country: str = Field("US", max_length=3)
    face: bool = False
    format: str = Field("both", max_length=10)
    count: int = Field(8, ge=3, le=12)


DEFAULT_NICHES = ["personal finance tips", "ai tools tutorial", "true crime stories", "history facts", "space facts",
                  "animal facts", "motivation stories", "home workout", "cooking recipes easy", "tech reviews budget",
                  "gaming news", "kids cartoon stories", "psychology facts", "travel vlog budget", "study tips",
                  "business ideas", "mystery stories", "cricket highlights analysis", "islamic stories", "horror stories animated"]


@router.post("/niches")
def niches(req: NicheReq) -> dict:
    """Which niche would work for a NEW channel now (demand vs competition on real data)."""
    cands: list[dict] = []
    ai = _ai_json(
        "Suggest YouTube niches for a NEW channel. " + (f"The creator likes: {req.interests}. " if req.interests else "")
        + f"Language: {req.language}. Main audience country: {req.country}. "
        + ("They will show their face. " if req.face else "Faceless channel (voiceover, animation, stock footage). ")
        + f"Format: {req.format}. Give {req.count + 4} specific niches (not too broad: 'budget travel in Asia', not 'travel'), "
          'each with ONE short search phrase people type on YouTube. Reply ONLY JSON: {"niches":[{"name":"...","search":"...","why":"..."}]}',
        req.gemini_key)
    for n in ((ai.get("niches") or []) if isinstance(ai, dict) else []):
        if isinstance(n, dict) and n.get("search"):
            cands.append({"name": str(n.get("name") or n["search"])[:60], "search": str(n["search"])[:60], "why": str(n.get("why") or "")[:200]})
    if not cands:
        words = [w for w in re.findall(r"[a-z]+", req.interests.lower()) if len(w) > 3]
        cands = [{"name": n, "search": n, "why": ""} for n in DEFAULT_NICHES if not words or any(w in n for w in words)]
        cands = cands or [{"name": n, "search": n, "why": ""} for n in DEFAULT_NICHES]
    results, errors = [], []
    for c in cands[: req.count]:
        try:
            a = analyze_keyword(c["search"], req.country, req.language, req.api_key, req.channel_id)
            results.append({**c, **{k: a[k] for k in ("score", "demand", "competition", "views_per_day", "median_subs", "small_wins", "label", "shorts_share")},
                            "videos": a["videos"][:3]})
        except ApiProblem as exc:
            errors.append(str(exc))
            break
    results.sort(key=lambda r: -r["score"])
    if not results and errors:
        raise HTTPException(400, errors[0])
    _add_cpm(results, "name", "", req.country)
    return {"niches": results, "errors": errors, "used_today": _quota()["used"]}


class NameReq(Base):
    niche: str = Field(..., min_length=2, max_length=1500)
    language: str = Field("en", max_length=5)
    style: str = Field("brandable", max_length=20)


def _handle(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "", name.replace(" ", ""))[:30]


@router.post("/names")
def names(req: NameReq) -> dict:
    """Channel names, and whether the @handle is still free (1 unit each)."""
    ai = _ai_json(
        f'Suggest 16 YouTube channel names for a new channel about "{req.niche}" (language: {req.language}). Style: {req.style}. '
        "Rules: 1-3 words, easy to say and spell, memorable, not a person's real name, no numbers, no existing big brand, "
        "works as an @handle; mix: some brandable (invented word), some that say the topic. "
        'Reply ONLY JSON: {"names":[{"name":"...","why":"..."}]}', req.gemini_key)
    cands = [n for n in (ai or {}).get("names") or [] if isinstance(n, dict) and n.get("name")] if isinstance(ai, dict) else []
    if not cands:
        words = [w.capitalize() for w in re.findall(r"[a-z]+", req.niche.lower()) if len(w) > 2][:2] or ["Daily"]
        cands = [{"name": f"{a}{b}", "why": ""} for a in words for b in ("Lab", "Hub", "Explained", "Daily", "Minute", "Bites", "Point", "Nation")]
    out, errors = [], []
    for c in cands[:16]:
        h = _handle(str(c["name"]))
        if len(h) < 3:
            continue
        taken = None
        try:
            d = _get("channels", {"part": "snippet,statistics", "forHandle": h}, req.api_key, req.channel_id)
            items = d.get("items") or []
            taken = bool(items)
            owner = items[0]["snippet"]["title"] if items else ""
            subs = int(_num((items[0].get("statistics") or {}).get("subscriberCount"))) if items else 0
        except ApiProblem as exc:
            errors.append(str(exc))
            owner, subs = "", 0
        out.append({"name": str(c["name"])[:40], "handle": "@" + h, "why": str(c.get("why") or "")[:160], "taken": taken, "owner": owner, "owner_subs": subs})
    out.sort(key=lambda r: (r["taken"] is True, r["taken"] is None))
    return {"names": out, "errors": errors[:1], "used_today": _quota()["used"]}


class AdviceReq(Base):
    kind: str = Field(..., pattern="^(topics|niche|channel|launch|trending)$")
    niche: str = Field("", max_length=1500)
    language: str = Field("en", max_length=5)
    data: dict = Field(default_factory=dict)


def _compact(data: dict, n: int = 12) -> str:
    rows = data.get("results") or data.get("niches") or data.get("videos") or []
    keep = []
    for r in rows[:n]:
        keep.append({k: r.get(k) for k in ("keyword", "name", "search", "score", "demand", "competition", "views_per_day",
                                            "median_subs", "small_wins", "title", "views", "views_per_hour", "countries", "label") if k in r})
        if isinstance(r.get("cpm"), dict):
            keep[-1]["est_cpm_usd"] = f"{r['cpm']['cpm_low']}-{r['cpm']['cpm_high']}"
    return json.dumps(keep, ensure_ascii=False)[:6000]


@router.post("/advice")
def advice(req: AdviceReq) -> dict:
    """The AI explains the real numbers and writes the plan (it never invents the scores)."""
    lang = "Write in simple English." if req.language == "en" else f"Write in the language with code '{req.language}' (Roman script is fine)."
    if req.kind == "topics":
        p = (f"You are a YouTube growth strategist. Here is REAL research data for the niche \"{req.niche}\": keywords with an "
             "opportunity score (0-100, higher = more views for less competition), demand, competition, median views per day of "
             f"ranking videos, median subscribers of ranking channels, and small channels that won. DATA: {_compact(req.data)}\n"
             "Pick the 5 best video topics to make NEXT for a small channel. For each: the topic, why (cite the numbers), 3 click-worthy "
             "title ideas (under 60 characters), a thumbnail idea (3-4 words + picture), and the hook for the first 10 seconds. "
             "Order from best to good. Be specific and honest; if the data shows all topics are hard, say so and suggest narrower angles. "
             + lang + " Use short headings and bullet points.")
    elif req.kind == "niche":
        p = (f"You are a YouTube strategist. A creator wants to start a NEW channel. Their profile: {req.niche}. REAL niche research "
             f"(score 0-100 = demand vs competition): {_compact(req.data)}\nRecommend the best 1-2 niches for them NOW and explain with the "
             "numbers, the risks, what kind of videos to make (long / Shorts), how often, and 5 first video ideas. " + lang)
    elif req.kind == "channel":
        p = (f"Write the channel details for a new YouTube channel. Niche: {req.niche}. Channel name: {req.data.get('name', '')}. "
             'Reply ONLY JSON: {"description":"the About text: first 2 lines say what the channel gives the viewer (they show in search), '
             'then what videos come and how often, natural keywords, a call to subscribe, max 900 characters",'
             '"short_bio":"one line under 100 characters","keywords":["15 channel keywords"],"tagline":"banner text under 6 words",'
             '"links":["2-3 link ideas"],"playlists":["4 playlist names"]}')
        data = _ai_json(p, req.gemini_key)
        if not isinstance(data, dict):
            raise HTTPException(502, "The AI did not answer — try again, or add a free Gemini key in the Dashboard.")
        return {"json": data}
    elif req.kind == "launch":
        p = (f"Write a launch plan for a brand new YouTube channel. Niche: {req.niche}. Name: {req.data.get('name', '')}. Research: "
             f"{_compact(req.data)}\nInclude: what to finish BEFORE the first upload (3 videos ready, 1 trailer optional), when to publish "
             "the first video and the next two (days apart), a 30-day schedule (long videos and Shorts), the first 3 video topics with "
             "titles (use the research), how to use Shorts to grow, what to check in YouTube Analytics after 48 hours, and simple "
             "milestones. " + lang + " Use short headings and bullet points.")
    else:
        p = (f"Here are videos trending on YouTube right now: {_compact(req.data, 25)}\nThe creator's niche: {req.niche or 'any'}. "
             "Find the 5 trends a small channel in this niche can ride THIS WEEK (an angle that fits the niche, not a copy), each with "
             "a title idea and why it can work now. Say which trends to avoid (copyright, news risk). " + lang)
    try:
        return {"text": _ai(p, req.gemini_key)}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"The AI did not answer ({str(exc)[:120]}). Try again.") from exc
