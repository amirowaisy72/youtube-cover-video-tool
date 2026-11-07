"""Video / MP3 Downloader tool — free, no credits.

Standalone downloader: paste a YouTube link, pick Video (MP4, best
quality) or Audio (MP3), download with yt-dlp into a job folder.

Mounted by the parent app as an APIRouter (prefix /api/downloader):
  POST /api/downloader            {"url", "format": "mp4"|"mp3"} -> {job_id, status}
  GET  /api/downloader/{job_id}   -> {status, progress, title, download_url, ...}
  GET  /api/downloader/file/{job_id} -> the downloaded file

yt-dlp runs in a background thread; the frontend polls the status
endpoint. No license/credit calls — this tool is free. No new pip
dependency: yt-dlp and FFmpeg are already required by the app.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
JOBS_DIR = BASE_DIR / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/downloader")

_YT_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
}

_JOB_ID_RE = re.compile(r"dl_[0-9a-f]{12}")


class DownloaderRequest(BaseModel):
    url: str = Field(..., min_length=8)
    format: str = "mp4"  # "mp4" (video) or "mp3" (audio only)


def _job_dir(job_id: str) -> Path:
    path = JOBS_DIR / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _read_job(job_id: str) -> dict | None:
    meta_file = JOBS_DIR / job_id / "job.json"
    if not meta_file.exists():
        return None
    try:
        return json.loads(meta_file.read_text(encoding="utf-8"))
    except ValueError:
        return None


def _write_job(job: dict) -> None:
    _job_dir(job["id"])
    (JOBS_DIR / job["id"] / "job.json").write_text(
        json.dumps(job, indent=2), encoding="utf-8"
    )


def _is_youtube_url(url: str) -> bool:
    """True when the URL looks like a YouTube video link."""
    try:
        u = urlparse(url.strip())
    except ValueError:
        return False
    if u.scheme not in ("http", "https"):
        return False
    host = (u.netloc or "").lower().split(":")[0]
    if host not in _YT_HOSTS:
        return False
    path = u.path or ""
    if host.endswith("youtu.be"):
        return bool(path.strip("/"))
    if path.startswith(("/watch", "/shorts", "/live", "/embed")):
        return True
    return "v=" in (u.query or "")


def _safe_filename(title: str, fmt: str) -> str:
    """Download filename from the video title (no illegal characters)."""
    name = re.sub(r'[\\/:*?"<>|]', "", title or "video").strip()
    name = re.sub(r"\s+", " ", name)[:120] or "video"
    return f"{name}.{'mp4' if fmt == 'mp4' else 'mp3'}"


def _no_window_kwargs() -> dict:
    """No console window flashing on Windows (same as video.py)."""
    if sys.platform.startswith("win"):
        return {"creationflags": 0x08000000}  # CREATE_NO_WINDOW
    return {}


def _yt_dlp_available() -> bool:
    if shutil.which("yt-dlp"):
        return True
    try:
        import yt_dlp  # noqa: F401
        return True
    except ImportError:
        return False


def _target_path(job_id: str, fmt: str) -> Path:
    directory = JOBS_DIR / job_id
    return directory / ("video.mp4" if fmt == "mp4" else "audio.mp3")


def _run_download(job_id: str, url: str, fmt: str) -> None:
    """Run yt-dlp in a background thread, writing progress to job.json."""
    directory = _job_dir(job_id)
    job = _read_job(job_id) or {"id": job_id}
    target = _target_path(job_id, fmt)

    # Best-effort title/duration first (never blocks the download).
    title = ""
    duration = None
    try:
        import yt_dlp
        with yt_dlp.YoutubeDL(
            {"quiet": True, "no_warnings": True, "socket_timeout": 30}
        ) as ydl:
            info = ydl.extract_info(url, download=False) or {}
        title = info.get("title") or ""
        duration = info.get("duration")
    except Exception:
        pass
    if not title:
        try:
            proc = subprocess.run(
                ["yt-dlp", "-J", "--no-warnings", "--no-playlist", url],
                capture_output=True, text=True, timeout=60,
                **_no_window_kwargs(),
            )
            if proc.returncode == 0:
                info = json.loads(proc.stdout or "{}")
                title = info.get("title") or ""
                duration = info.get("duration")
        except Exception:
            pass
    job.update({"title": title, "duration_sec": duration})
    _write_job(job)

    def hook(d: dict) -> None:
        total = d.get("total_bytes") or d.get("total_bytes_estimate")
        downloaded = d.get("downloaded_bytes", 0) or 0
        pct = round(downloaded * 100 / total, 1) if total else 0
        job.update({
            "progress": pct,
            "downloaded_bytes": downloaded,
            "total_bytes": total,
            "speed": d.get("speed"),
            "eta": d.get("eta"),
        })
        _write_job(job)

    if fmt == "mp3":
        if not shutil.which("ffmpeg"):
            job.update({
                "status": "failed",
                "error": "FFmpeg is required for MP3 conversion but was not found.",
            })
            _write_job(job)
            return
        opts = {
            "format": "ba/b",
            "outtmpl": str(directory / "audio.%(ext)s"),
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
            "progress_hooks": [hook],
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
        }
    else:
        opts = {
            # Best quality, progressive single file first (fast,
            # one connection — same reason as Tool 1, user 2026-11-07),
            # DASH only when no progressive file exists.
            "format": "b[ext=mp4]/b/bv*+ba/b",
            "merge_output_format": "mp4",
            "outtmpl": str(target),
            "progress_hooks": [hook],
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
        }

    done = False
    error: Exception | None = None
    for attempt in range(1, 4):
        try:
            import yt_dlp
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([url])
            done = True
            break
        except ImportError:
            break
        except Exception as exc:  # noqa: BLE001
            error = exc
            if attempt < 3:
                time.sleep(5 * attempt)
                continue
            break
    if not done and error is None:
        # yt-dlp Python module missing: fall back to the CLI binary.
        if fmt == "mp3":
            cmd = [
                "yt-dlp", "-f", "ba/b", "-x", "--audio-format", "mp3",
                "--audio-quality", "192K",
                "-o", str(directory / "audio.%(ext)s"), url,
            ]
        else:
            cmd = [
                "yt-dlp", "-f", "bv*+ba/b", "--merge-output-format", "mp4",
                "-o", str(target), url,
            ]
        for attempt in range(1, 3):
            proc = subprocess.run(
                cmd, capture_output=True, text=True, **_no_window_kwargs()
            )
            if proc.returncode == 0:
                done = True
                break
            error = Exception((proc.stderr or proc.stdout or "yt-dlp failed.").strip())
            if attempt < 2:
                time.sleep(5 * attempt)
    if done and target.exists():
        size = target.stat().st_size
        job.update({
            "status": "done",
            "progress": 100,
            "filename": _safe_filename(title, fmt),
            "size_bytes": size,
            "size_mb": round(size / 1024 / 1024, 1),
        })
    else:
        job.update({
            "status": "failed",
            "error": str(error)[-2000:] if error else "yt-dlp finished but no file was created.",
        })
    _write_job(job)


@router.post("")
def start_download(payload: DownloaderRequest) -> dict:
    """Start a download; returns immediately, frontend polls status."""
    url = payload.url.strip()
    fmt = payload.format.strip().lower()
    if fmt not in ("mp4", "mp3"):
        raise HTTPException(400, "format must be 'mp4' or 'mp3'.")
    if not _is_youtube_url(url):
        raise HTTPException(400, "That does not look like a YouTube video link.")
    # A watch link carrying &list=... would make yt-dlp download
    # the whole playlist and sit at 0% (user, 2026-11-07).
    import video as _video
    url = _video.clean_youtube_url(url)
    if url is None:
        raise HTTPException(
            400,
            "That is a playlist link, not one video. "
            "Open the video itself and paste its link (youtube.com/watch?v=…).",
        )
    if not _yt_dlp_available():
        raise HTTPException(
            400,
            "yt-dlp was not found. Install it with "
            "'pip install yt-dlp' (or install the yt-dlp binary) and retry.",
        )
    job_id = "dl_" + uuid.uuid4().hex[:12]
    job = {
        "id": job_id,
        "tool": "downloader",
        "url": url,
        "format": fmt,
        "status": "downloading",
        "progress": 0,
        "downloaded_bytes": 0,
        "total_bytes": None,
        "speed": None,
        "eta": None,
        "title": "",
        "duration_sec": None,
        "filename": None,
        "size_bytes": None,
        "error": None,
    }
    _write_job(job)
    threading.Thread(target=_run_download, args=(job_id, url, fmt), daemon=True).start()
    return {"job_id": job_id, "status": "downloading"}


@router.get("/{job_id}")
def get_status(job_id: str) -> dict:
    """Download status for the frontend progress bar / done state."""
    if not _JOB_ID_RE.fullmatch(job_id or ""):
        raise HTTPException(404, "Download not found.")
    job = _read_job(job_id)
    if not job or job.get("tool") != "downloader":
        raise HTTPException(404, "Download not found.")
    return {
        "job_id": job["id"],
        "status": job.get("status", "unknown"),
        "progress": job.get("progress", 0),
        "title": job.get("title") or "",
        "duration_sec": job.get("duration_sec"),
        "filename": job.get("filename"),
        "size_bytes": job.get("size_bytes"),
        "size_mb": job.get("size_mb"),
        "speed": job.get("speed"),
        "eta": job.get("eta"),
        "download_url": f"/api/downloader/file/{job_id}" if job.get("status") == "done" else None,
        "error": job.get("error"),
    }


@router.get("/file/{job_id}")
def download_file(job_id: str) -> FileResponse:
    """The finished file (video.mp4 or audio.mp3)."""
    if not _JOB_ID_RE.fullmatch(job_id or ""):
        raise HTTPException(404, "Download not found.")
    job = _read_job(job_id)
    if not job or job.get("tool") != "downloader":
        raise HTTPException(404, "Download not found.")
    if job.get("status") != "done":
        raise HTTPException(409, "Download is not ready yet.")
    target = _target_path(job_id, str(job.get("format") or "mp4"))
    if not target.exists():
        raise HTTPException(404, "Downloaded file is gone.")
    fmt = str(job.get("format") or "mp4")
    return FileResponse(
        target,
        media_type="video/mp4" if fmt == "mp4" else "audio/mpeg",
        filename=job.get("filename") or _safe_filename(job.get("title") or "", fmt),
    )
