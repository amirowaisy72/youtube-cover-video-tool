"""Royalty-Free Music & Sound Effects — free tool, no credits.

Endpoints (all under /api/music):
  GET /api/music/search?type=music|effects&q=<query>&page=<n>&key=<freesound key>
      -> {results: [{id, name, duration, tags, preview_url, download_url, username, license}], page, total_pages}
      Proxies the free Freesound API. The user's key is never logged or stored
      server-side — it is only forwarded to Freesound in this one request.
  GET /api/music/pack
      -> {tracks: [{name, artist, license, file, duration}]} — built-in starter
      pack, works with no API key.
  GET /api/music/pack/{filename} -> the audio file (path-traversal guarded).

FREESOUND (2026-11-08, user: "pixabay to audio provide hi nhi krta"):
Pixabay's public API covers images + videos ONLY — it has NO audio
endpoint (verified live: /api/audio/ returns 403 Access denied for a
key that is valid for images/videos). The earlier "one audio endpoint"
/api/audio/ fix was a dead end. Freesound is a real audio API (free key
at freesound.org/apiv2/apply) serving both music and sound effects —
the same source Auto Video already uses for mood music + transition
sounds (proven working with the user's key). The key is shared with
Auto Video (same localStorage key), so it is already filled in.
Freesound tracks carry a per-track license (CC0 / CC-BY / CC-BY-NC…)
shown in the UI — check it before using a track in a video.
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

FREESOUND_BASE = "https://freesound.org/apiv2/search/text/"
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
def search_music(
    type: str = Query("music", pattern="^(music|effects)$"),
    q: str = Query("", max_length=100),
    page: int = Query(1, ge=1, le=100),
    key: str = Query("", max_length=100),
) -> dict:
    """Search Freesound music or sound effects (proxied, key never stored).

    FREESOUND (2026-11-08): Pixabay has NO audio endpoint — the old
    /api/audio/ code returned 403 for a valid key. Freesound's
    /apiv2/search/text/ is a real audio API (same source Auto Video
    uses). Music = long tracks (>= 20 s), effects = short clips
    (<= 10 s) — the same duration split Auto Video uses. The
    preview MP3 (hq, else lq) is both the preview and the download
    — Freesound previews need only the API key, no OAuth.
    """
    if not key.strip():
        raise HTTPException(
            status_code=400,
            detail="Add your free Freesound API key first (get one at freesound.org/apiv2/apply).",
        )
    # Freesound needs a query; an empty search shows a broad browse.
    query = q.strip() or ("music" if type == "music" else "sound effect")
    params = {
        "query": query,
        "token": key.strip(),
        "page": str(page),
        "page_size": str(PER_PAGE),
        "fields": "id,name,duration,previews,license,tags,username",
    }
    url = f"{FREESOUND_BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "YT-Guru/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise HTTPException(
                status_code=400,
                detail="Freesound rejected the key — check your API key.",
            ) from e
        if e.code == 429:
            raise HTTPException(
                status_code=502,
                detail="Freesound rate limit reached — try again in a minute.",
            ) from e
        raise HTTPException(
            status_code=502,
            detail=f"Freesound returned an error ({e.code}). Try again.",
        ) from e
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Freesound: {e.reason}. Check your connection.",
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail="Freesound returned an unexpected response. Try again.",
        ) from e

    hits = data.get("results", []) if isinstance(data, dict) else []
    results = []
    for h in hits:
        dur = h.get("duration") or 0
        # Music = long tracks, effects = short clips.
        if type == "music" and dur < 20:
            continue
        if type == "effects" and not (0 < dur <= 10):
            continue
        previews = h.get("previews") or {}
        preview = previews.get("preview-hq-mp3") or previews.get("preview-lq-mp3")
        if not preview:
            continue
        tags = h.get("tags")
        results.append(
            {
                "id": h.get("id"),
                "name": h.get("name") or "Untitled",
                "duration": h.get("duration"),
                "tags": ", ".join(tags) if isinstance(tags, list) else (tags or None),
                "preview_url": preview,
                "download_url": preview,
                "username": h.get("username"),
                "license": h.get("license"),
            }
        )
    total = int(data.get("count") or 0)
    total_pages = max(1, -(-total // PER_PAGE)) if total else 1
    return {"results": results, "page": page, "total_pages": total_pages}
