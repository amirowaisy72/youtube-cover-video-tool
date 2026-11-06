"""Royalty-Free Music & Sound Effects — free tool, no credits.

Endpoints (all under /api/music):
  GET /api/music/search?type=music|effects&q=<query>&page=<n>&key=<pixabay key>
      -> {results: [{id, name, duration, tags, preview_url, download_url, username}], page, total_pages}
      Proxies the free Pixabay API. The user's key is never logged or stored
      server-side — it is only forwarded to Pixabay in this one request.
  GET /api/music/pack
      -> {tracks: [{name, artist, license, file, duration}]} — built-in starter
      pack, works with no API key.
  GET /api/music/pack/{filename} -> the audio file (path-traversal guarded).

Pixabay music/sound effects are cleared for use in YouTube videos
(Pixabay License). The user supplies their own free Pixabay API key
(get it at pixabay.com/api/docs) in the page; it is kept in localStorage.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/music")

BASE_DIR = Path(__file__).resolve().parent.parent
PACK_DIR = BASE_DIR / "backend" / "music_pack"
PACK_JSON = PACK_DIR / "pack.json"

PIXABAY_BASE = "https://pixabay.com/api"
PER_PAGE = 20


def _load_pack() -> list[dict]:
    """Read the starter-pack manifest. Missing/corrupt manifest -> empty list."""
    try:
        data = json.loads(PACK_JSON.read_text(encoding="utf-8"))
        tracks = data.get("tracks", [])
        return tracks if isinstance(tracks, list) else []
    except (OSError, ValueError):
        return []


@router.get("/pack")
def get_pack() -> dict:
    """Built-in starter pack — no API key needed."""
    tracks = []
    for t in _load_pack():
        # Only list tracks whose file actually exists on disk.
        if t.get("file") and (PACK_DIR / str(t["file"])).is_file():
            tracks.append(
                {
                    "name": t.get("name", "Untitled"),
                    "artist": t.get("artist", "Unknown"),
                    "license": t.get("license", ""),
                    "file": t["file"],
                    "duration": t.get("duration"),
                }
            )
    return {"tracks": tracks}


@router.get("/pack/{filename}")
def get_pack_file(filename: str):
    """Serve one starter-pack track. Guards against path traversal."""
    # Reject anything that is not a plain file name inside PACK_DIR.
    if not filename or "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    path = (PACK_DIR / filename).resolve()
    if path.parent != PACK_DIR.resolve() or not path.is_file():
        raise HTTPException(status_code=404, detail="Track not found.")
    return FileResponse(path, media_type="audio/mpeg", filename=filename)


@router.get("/search")
def search_pixabay(
    type: str = Query("music", pattern="^(music|effects)$"),
    q: str = Query("", max_length=100),
    page: int = Query(1, ge=1, le=100),
    key: str = Query("", max_length=100),
) -> dict:
    """Search Pixabay music or sound effects (proxied, key never stored)."""
    if not key.strip():
        raise HTTPException(
            status_code=400,
            detail="Add your free Pixabay API key first (get one at pixabay.com/api/docs).",
        )
    endpoint = "music" if type == "music" else "sound-effects"
    params = {
        "key": key.strip(),
        "q": q.strip(),
        "page": str(page),
        "per_page": str(PER_PAGE),
    }
    url = f"{PIXABAY_BASE}/{endpoint}/?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "YT-Guru/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (400, 401, 403, 404):
            raise HTTPException(
                status_code=400,
                detail="Pixabay rejected the key or query — check your API key.",
            ) from e
        if e.code == 429:
            raise HTTPException(
                status_code=502,
                detail="Pixabay rate limit reached — try again in a minute.",
            ) from e
        raise HTTPException(
            status_code=502,
            detail=f"Pixabay returned an error ({e.code}). Try again.",
        ) from e
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Pixabay: {e.reason}. Check your connection.",
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail="Pixabay returned an unexpected response. Try again.",
        ) from e

    hits = data.get("hits", []) if isinstance(data, dict) else []
    results = []
    for h in hits:
        if type == "music":
            results.append(
                {
                    "id": h.get("id"),
                    "name": h.get("name") or h.get("title") or "Untitled",
                    "duration": h.get("duration"),
                    "tags": h.get("tags"),
                    "preview_url": h.get("audio"),
                    "download_url": h.get("audio"),
                    "username": h.get("username"),
                }
            )
        else:
            results.append(
                {
                    "id": h.get("id"),
                    "name": h.get("name") or h.get("title") or "Untitled",
                    "duration": h.get("duration"),
                    "tags": h.get("tags"),
                    "preview_url": h.get("audio"),
                    "download_url": h.get("audio"),
                    "username": h.get("username"),
                }
            )
    total = int(data.get("totalHits") or 0)
    total_pages = max(1, -(-total // PER_PAGE)) if total else 1
    return {"results": results, "page": page, "total_pages": total_pages}
