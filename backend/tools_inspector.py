"""Competitor Inspector — maximum details for ANY YouTube video link.

Free tool: extracts metadata with yt-dlp WITHOUT downloading the
video. No credits, no license check, no paid APIs.

Mount in backend/main.py (one line each, parent wiring):
    import tools_inspector  # noqa: E402
    app.include_router(tools_inspector.router)
"""

from __future__ import annotations

import json
import subprocess
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/inspector")

# Hosts yt-dlp accepts as YouTube (incl. Shorts / Music / mobile).
_YT_HOSTS = {
    "youtube.com", "www.youtube.com", "m.youtube.com",
    "music.youtube.com", "youtu.be", "www.youtu.be",
    "youtube-nocookie.com", "www.youtube-nocookie.com",
}


class InspectorRequest(BaseModel):
    url: str


def _looks_like_youtube(url: str) -> bool:
    """True only for http(s) YouTube watch/shorts/live/share links."""
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.netloc or "").lower().split(":")[0]
    if host not in _YT_HOSTS:
        return False
    # A bare youtube.com homepage has no video — require a path.
    return bool(parsed.path and parsed.path != "/")


def _fmt_duration(seconds: float | None) -> str:
    """123 -> '2:03'; 3661 -> '1:01:01'; None -> ''."""
    if seconds is None:
        return ""
    total = int(round(seconds))
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def _fmt_upload_date(raw: str | None) -> str:
    """'20240301' -> '2024-03-01'; anything else passes through."""
    if raw and len(raw) == 8 and raw.isdigit():
        return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw or ""


def _best_thumbnail(info: dict) -> str:
    """Largest thumbnail URL (yt-dlp lists them smallest first)."""
    thumbs = info.get("thumbnails") or []
    if thumbs:
        best = thumbs[-1] or {}
        if best.get("url"):
            return str(best["url"])
    return str(info.get("thumbnail") or "")


def _formats_summary(info: dict) -> dict:
    """Compact summary of the available formats (no full list)."""
    formats = info.get("formats") or []
    heights: set[int] = set()
    best_video = ""
    best_audio_kbps: int | None = None
    top_h = 0
    for f in formats:
        vcodec = str(f.get("vcodec") or "none")
        acodec = str(f.get("acodec") or "none")
        h = f.get("height")
        if vcodec != "none" and isinstance(h, int) and h > 0:
            heights.add(h)
            if h >= top_h:
                top_h = h
                ext = str(f.get("ext") or "")
                fps = f.get("fps")
                best_video = f"{f.get('width', '')}x{h} · {ext}".strip()
                if fps:
                    best_video += f" · {fps}fps"
        if acodec != "none":
            abr = f.get("abr")
            if isinstance(abr, (int, float)) and abr > 0:
                kbps = int(round(abr))
                best_audio_kbps = kbps if best_audio_kbps is None else max(best_audio_kbps, kbps)
    resolutions = sorted(f"{h}p" for h in heights)
    return {
        "count": len(formats),
        "resolutions": resolutions,
        "highest": resolutions[-1] if resolutions else "",
        "best_video": best_video,
        "best_audio_kbps": best_audio_kbps,
    }


def _summarize(info: dict) -> dict:
    """Pick the maximum-detail fields out of a raw yt-dlp info dict."""
    duration = info.get("duration")
    return {
        "video_id": str(info.get("id") or ""),
        "title": str(info.get("title") or ""),
        "description": str(info.get("description") or ""),
        "tags": [str(t) for t in (info.get("tags") or [])],
        "view_count": info.get("view_count"),
        "like_count": info.get("like_count"),
        "comment_count": info.get("comment_count"),
        "upload_date": _fmt_upload_date(info.get("upload_date")),
        "upload_date_raw": str(info.get("upload_date") or ""),
        "uploader": str(info.get("uploader") or ""),
        "uploader_id": str(info.get("uploader_id") or ""),
        "uploader_url": str(info.get("uploader_url") or ""),
        "channel": str(info.get("channel") or info.get("uploader") or ""),
        "channel_id": str(info.get("channel_id") or ""),
        "channel_url": str(info.get("channel_url") or ""),
        "subscriber_count": info.get("channel_follower_count"),
        "duration_sec": int(duration) if isinstance(duration, (int, float)) else None,
        "duration": _fmt_duration(duration if isinstance(duration, (int, float)) else None),
        "categories": [str(c) for c in (info.get("categories") or [])],
        "language": str(info.get("language") or ""),
        "thumbnail": _best_thumbnail(info),
        "webpage_url": str(info.get("webpage_url") or ""),
        "age_limit": info.get("age_limit"),
        "is_live": bool(info.get("is_live") or False),
        "live_status": str(info.get("live_status") or ""),
        "width": info.get("width"),
        "height": info.get("height"),
        "fps": info.get("fps"),
        "formats": _formats_summary(info),
    }


def _extract_info(url: str) -> dict | None:
    """Raw yt-dlp info dict, or None on any failure. No download.

    Same two-step pattern as main.py fetch_original_info: the
    Python API first, the yt-dlp CLI (-J) as fallback."""
    try:
        import yt_dlp

        with yt_dlp.YoutubeDL({
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "skip_download": True,
            "socket_timeout": 15,
        }) as ydl:
            info = ydl.extract_info(url, download=False) or {}
        # A playlist link still resolves to its first video.
        if info.get("_type") == "playlist":
            entries = info.get("entries") or []
            info = entries[0] if entries else {}
        return info or None
    except Exception:
        pass
    try:
        kwargs: dict = {}
        try:
            import video as _video

            kwargs = _video.no_window_kwargs()
        except Exception:
            kwargs = {}
        proc = subprocess.run(
            ["yt-dlp", "-J", "--no-warnings", "--no-playlist", url],
            capture_output=True, text=True, timeout=45, **kwargs,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            info = json.loads(proc.stdout)
            if info.get("_type") == "playlist":
                entries = info.get("entries") or []
                info = entries[0] if entries else {}
            return info or None
    except Exception:
        pass
    return None


@router.post("")
def inspect_video(payload: InspectorRequest) -> dict:
    """POST /api/inspector {url} -> maximum video details, no download.

    Fast, no job: one yt-dlp metadata fetch. Errors are explicit:
    400 for a non-YouTube link, 404 for a private / deleted /
    unavailable video, 503 when yt-dlp is not installed at all.
    """
    url = (payload.url or "").strip()
    if not url:
        raise HTTPException(400, "Paste a YouTube video link first.")
    if not _looks_like_youtube(url):
        raise HTTPException(400, "That does not look like a YouTube video link.")
    info = _extract_info(url)
    if not info:
        raise HTTPException(
            404,
            "Could not read that video — it may be private, deleted, "
            "age-restricted, or the link may be wrong. Check the link and try again.",
        )
    return _summarize(info)
