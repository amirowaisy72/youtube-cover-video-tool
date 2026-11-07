"""Stock Video & B-Roll Fetcher — free tool, no credits.

Endpoints (all under /api/stock):
  GET /api/stock/search?source=pixabay|pexels&q=<query>&page=<n>&key=<user key>
      -> {results: [{id, poster_url, video_url, duration, tags, user}],
          page, total_pages}
      Proxies the free Pixabay Videos API (primary) or the free Pexels
      Videos API (second tab). The user's key is never logged or stored
      server-side — it is only forwarded to the provider in this one request.

Both providers' content is cleared for use in YouTube videos
(Pixabay License / Pexels License). The user supplies their own free
API key for each source (Pixabay: pixabay.com/api/docs,
Pexels: pexels.com/api) in the page; keys are kept in localStorage.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/stock")

PIXABAY_VIDEOS_BASE = "https://pixabay.com/api/videos/"
PEXELS_SEARCH_BASE = "https://api.pexels.com/videos/search"
PER_PAGE = 20
# Pixabay caps totalHits at 500, so pages beyond that would be empty.
PIXABAY_MAX_RESULTS = 500


def _get_json(url: str, headers: dict | None = None) -> dict:
    """Fetch JSON from a provider URL, mapping failures to clear HTTP errors."""
    req = urllib.request.Request(
        url, headers={"User-Agent": "YT-Guru/1.0", **(headers or {})}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (400, 401, 403):
            raise HTTPException(
                status_code=400,
                detail="The provider rejected the key or query — check your API key.",
            ) from e
        if e.code == 429:
            raise HTTPException(
                status_code=502,
                detail="Rate limit reached — try again in a minute.",
            ) from e
        raise HTTPException(
            status_code=502,
            detail=f"The provider returned an error ({e.code}). Try again.",
        ) from e
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach the provider: {e.reason}. Check your connection.",
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail="The provider returned an unexpected response. Try again.",
        ) from e
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=502,
            detail="The provider returned an unexpected response. Try again.",
        )
    return data


def _pick_pixabay_video(videos: dict) -> str | None:
    """Best available Pixabay video variant URL (largest first)."""
    for quality in ("large", "medium", "small", "tiny"):
        variant = videos.get(quality)
        if isinstance(variant, dict) and variant.get("url"):
            return variant["url"]
    return None


def _search_pixabay(q: str, page: int, key: str) -> dict:
    params = {
        "key": key,
        "q": q,
        "page": str(page),
        "per_page": str(PER_PAGE),
    }
    url = f"{PIXABAY_VIDEOS_BASE}?{urllib.parse.urlencode(params)}"
    data = _get_json(url)
    results = []
    for h in data.get("hits", []) or []:
        video_url = _pick_pixabay_video(h.get("videos") or {})
        if not video_url:
            continue
        results.append(
            {
                "id": h.get("id"),
                "poster_url": None,
                "video_url": video_url,
                "duration": h.get("duration"),
                "tags": h.get("tags"),
                "user": h.get("user"),
            }
        )
    total = min(int(data.get("totalHits") or 0), PIXABAY_MAX_RESULTS)
    total_pages = max(1, -(-total // PER_PAGE)) if total else 1
    return {"results": results, "page": page, "total_pages": total_pages}


def _pick_pexels_video(video_files: list) -> str | None:
    """Best Pexels video file: prefer HD mp4, else the largest mp4."""
    mp4s = [
        f
        for f in video_files
        if isinstance(f, dict) and f.get("file_type") == "video/mp4" and f.get("link")
    ]
    if not mp4s:
        return None
    for f in mp4s:
        if f.get("quality") == "hd":
            return f["link"]
    return max(mp4s, key=lambda f: (f.get("width") or 0) * (f.get("height") or 0))[
        "link"
    ]


def _search_pexels(q: str, page: int, key: str) -> dict:
    params = {
        "query": q,
        "page": str(page),
        "per_page": str(PER_PAGE),
    }
    url = f"{PEXELS_SEARCH_BASE}?{urllib.parse.urlencode(params)}"
    data = _get_json(url, headers={"Authorization": key})
    results = []
    for v in data.get("videos", []) or []:
        video_url = _pick_pexels_video(v.get("video_files") or [])
        if not video_url:
            continue
        user = v.get("user") or {}
        results.append(
            {
                "id": v.get("id"),
                "poster_url": v.get("image"),
                "video_url": video_url,
                "duration": v.get("duration"),
                "tags": None,
                "user": user.get("name"),
            }
        )
    total = int(data.get("total_results") or 0)
    total_pages = max(1, -(-total // PER_PAGE)) if total else 1
    return {"results": results, "page": page, "total_pages": total_pages}


class ValidateRequest(BaseModel):
    source: str  # pixabay | pexels
    key: str


@router.post("/validate")
def validate_key(payload: ValidateRequest) -> dict:
    """Test an API key with ONE tiny request, so the user knows
    immediately if the key is wrong. Without this, a wrong key
    fails silently: the Stock search shows an error only when
    you search, and Auto Video just falls back to Commons with
    no warning at all — so a bad key can sit there for weeks
    while every video quietly misses the stock footage.
    Returns {valid, reason, detail}:
      valid=true  -> the provider accepted the key.
      valid=false, reason='invalid' -> the provider rejected
        the key (401/403): it is wrong or revoked.
      valid=false, reason='unreachable' -> could not check
        (network, rate limit, provider down): the key might
        still be fine, so the caller should save it anyway and
        tell the user to test with a search."""
    source = payload.source.lower()
    key = (payload.key or "").strip()
    if source not in ("pixabay", "pexels"):
        return {"valid": False, "reason": "invalid",
                "detail": "Unknown source — pick Pixabay or Pexels."}
    if not key:
        return {"valid": False, "reason": "invalid",
                "detail": "Paste a key first."}
    try:
        if source == "pixabay":
            url = (f"{PIXABAY_VIDEOS_BASE}?"
                   f"{urllib.parse.urlencode({'key': key, 'q': 'test', 'per_page': '3'})}")
            _get_json(url)
        else:
            url = (f"{PEXELS_SEARCH_BASE}?"
                   f"{urllib.parse.urlencode({'query': 'test', 'page': '1', 'per_page': '1'})}")
            _get_json(url, headers={"Authorization": key})
    except HTTPException as e:
        if e.status_code == 400:
            return {"valid": False, "reason": "invalid",
                    "detail": "The provider rejected this key — it is wrong or revoked. Copy it exactly from the provider's API page and try again."}
        return {"valid": False, "reason": "unreachable",
                "detail": e.detail or "Could not reach the provider."}
    except Exception:
        return {"valid": False, "reason": "unreachable",
                "detail": "Could not reach the provider. Check your connection."}
    return {"valid": True, "reason": "ok",
            "detail": "Key accepted by the provider."}


@router.get("/search")
def search_stock(
    source: str = Query("pixabay", pattern="^(pixabay|pexels)$"),
    q: str = Query("", max_length=100),
    page: int = Query(1, ge=1, le=100),
    key: str = Query("", max_length=100),
) -> dict:
    """Search free stock videos (Pixabay or Pexels, proxied, key never stored)."""
    if not key.strip():
        if source == "pixabay":
            detail = (
                "Add your free Pixabay API key first "
                "(get one at pixabay.com/api/docs)."
            )
        else:
            detail = (
                "Add your free Pexels API key first "
                "(get one at pexels.com/api)."
            )
        raise HTTPException(status_code=400, detail=detail)
    if source == "pixabay":
        return _search_pixabay(q.strip(), page, key.strip())
    return _search_pexels(q.strip(), page, key.strip())
