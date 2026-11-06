"""Video Trimmer — download ONLY a selected section of a YouTube video.

Free tool: no license/credit calls anywhere in here.

Flow: paste a YouTube link + a start time and an end time, and yt-dlp
fetches only that section (``--download-sections "*START-END"``), so
the whole video is never downloaded. The result is a single MP4.

Mounted by the parent (backend/main.py) with:
    from tools_trimmer import router as trimmer_router
    app.include_router(trimmer_router)
(`backend/` is on sys.path already — see main.py — so a plain
``import tools_trimmer`` works.)
"""

from __future__ import annotations

import json
import re
import shutil
import threading
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/trimmer")

BASE_DIR = Path(__file__).resolve().parent.parent
JOBS_DIR = BASE_DIR / "jobs"

MAX_SECTION_SECONDS = 600  # 10 minutes, per the tool's limit

_YOUTUBE_RE = re.compile(
    r"^(https?://)?(www\.|m\.|music\.)?"
    r"(youtube\.com/(watch|shorts|live|embed|v)/|youtu\.be/)",
    re.IGNORECASE,
)


# ------------------------------------------------------------ job storage
# Same job.json layout as the rest of the app (jobs/<id>/job.json),
# kept local here so this module never imports backend/main.py.

def _job_dir(job_id: str) -> Path:
    path = JOBS_DIR / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _read_job(job_id: str) -> dict:
    meta_file = JOBS_DIR / job_id / "job.json"
    if meta_file.exists():
        try:
            return json.loads(meta_file.read_text(encoding="utf-8"))
        except ValueError:
            pass
    return {"id": job_id, "status": "unknown"}


def _write_job(job: dict) -> None:
    _job_dir(job["id"])
    (JOBS_DIR / job["id"] / "job.json").write_text(
        json.dumps(job, indent=2), encoding="utf-8"
    )


# ------------------------------------------------------------ time parsing

def parse_time(value: str | int | float) -> float:
    """Parse seconds ("90"), "m:ss" ("1:30") or "h:mm:ss" ("1:02:30")."""
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        raise ValueError("Empty time.")
    parts = text.split(":")
    try:
        nums = [float(p) for p in parts]
    except ValueError:
        raise ValueError(f"Time {text!r} is not a number or m:ss.") from None
    if len(nums) == 1:
        return nums[0]
    if len(nums) == 2:
        minutes, seconds = nums
        return minutes * 60 + seconds
    if len(nums) == 3:
        hours, minutes, seconds = nums
        return hours * 3600 + minutes * 60 + seconds
    raise ValueError(f"Time {text!r} has too many parts (use h:mm:ss).")


def _fmt_hms(seconds: float) -> str:
    """Seconds -> "HH:MM:SS" for yt-dlp --download-sections."""
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def _fmt_clock(seconds: float) -> str:
    """Seconds -> "m:ss" for display."""
    total = int(seconds)
    m, s = divmod(total, 60)
    return f"{m}:{s:02d}"


def _yt_dlp_available() -> bool:
    if shutil.which("yt-dlp"):
        return True
    try:
        import yt_dlp  # noqa: F401
        return True
    except ImportError:
        return False


# ------------------------------------------------------------ the download

def _run_trim(job_id: str, url: str, start: float, end: float, target: Path) -> None:
    """Background thread: fetch video info, then download only the section."""
    job = _read_job(job_id)
    section = f"{_fmt_clock(start)}-{_fmt_clock(end)}"
    try:
        import yt_dlp
    except ImportError:
        job.update({"status": "failed", "error": "yt-dlp is not installed."})
        _write_job(job)
        return

    def hook(d: dict) -> None:
        total = d.get("total_bytes") or d.get("total_bytes_estimate")
        downloaded = d.get("downloaded_bytes", 0) or 0
        if total:
            job = _read_job(job_id)
            job.update({"progress": round(downloaded * 100 / total, 1)})
            _write_job(job)

    # 1) Video info first: title for the UI + duration to validate the range.
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
            info = ydl.extract_info(url, download=False) or {}
    except Exception as exc:  # noqa: BLE001 - surface yt-dlp's message
        job.update({"status": "failed", "error": str(exc)[-2000:] or "Could not read this video."})
        _write_job(job)
        return
    title = str(info.get("title") or "YouTube video")
    duration = info.get("duration")
    if isinstance(duration, (int, float)) and end > duration:
        job.update({
            "status": "failed",
            "error": f"End time {_fmt_clock(end)} is past the end of this video "
                     f"({_fmt_clock(float(duration))}).",
        })
        _write_job(job)
        return
    job.update({"title": title, "status": "downloading", "progress": 0})
    _write_job(job)

    # 2) Download ONLY the selected section.
    section_spec = f"*{_fmt_hms(start)}-{_fmt_hms(end)}"
    opts = {
        "format": "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b",
        "merge_output_format": "mp4",
        "download_sections": [section_spec],
        "retries": 10,
        "fragment_retries": 10,
        "extractor_retries": 3,
        "socket_timeout": 60,
        "outtmpl": str(target),
        "progress_hooks": [hook],
        "quiet": True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as exc:  # noqa: BLE001 - surface yt-dlp's message
        job = _read_job(job_id)
        job.update({"status": "failed", "error": str(exc)[-2000:] or "Section download failed."})
        _write_job(job)
        return

    job = _read_job(job_id)
    if target.exists():
        size_mb = round(target.stat().st_size / 1024 / 1024, 1)
        job.update({
            "status": "done",
            "progress": 100,
            "title": title,
            "section": section,
            "size_mb": size_mb,
            "download_url": f"/api/trimmer/file/{job_id}",
        })
    else:
        job.update({"status": "failed", "error": "Download finished but no file was created."})
    _write_job(job)


# ------------------------------------------------------------ the API

class TrimmerRequest(BaseModel):
    url: str = Field(..., min_length=8)
    # Times as seconds (90) or "m:ss" ("1:30") / "h:mm:ss".
    start: str | int | float = Field(...)
    end: str | int | float = Field(...)


class TrimmerInfoRequest(BaseModel):
    url: str = Field(..., min_length=8)


@router.post("/info")
def get_trimmer_info(payload: TrimmerInfoRequest) -> dict:
    """Video title + duration for the timeline slider. No download."""
    if not _yt_dlp_available():
        raise HTTPException(
            400,
            "yt-dlp was not found. Install it with 'pip install yt-dlp' "
            "(or install the yt-dlp binary) and retry.",
        )
    url = payload.url.strip()
    if not _YOUTUBE_RE.match(url):
        raise HTTPException(400, "That does not look like a YouTube link.")
    try:
        import yt_dlp
    except ImportError:
        raise HTTPException(400, "yt-dlp is not installed.") from None
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
            info = ydl.extract_info(url, download=False) or {}
    except Exception as exc:  # noqa: BLE001 - surface yt-dlp's message
        raise HTTPException(
            404,
            "Could not read that video — it may be private, deleted, "
            "age-restricted, or the link may be wrong. "
            "You can still trim by typing the times manually.",
        ) from exc
    duration = info.get("duration")
    return {
        "title": str(info.get("title") or "YouTube video"),
        "duration_sec": float(duration) if isinstance(duration, (int, float)) else None,
    }


@router.post("")
def create_trimmer_job(payload: TrimmerRequest) -> dict:
    """Start a section download. Returns immediately; poll the job."""
    if not _yt_dlp_available():
        raise HTTPException(
            400,
            "yt-dlp was not found. Install it with 'pip install yt-dlp' "
            "(or install the yt-dlp binary) and retry.",
        )
    url = payload.url.strip()
    if not _YOUTUBE_RE.match(url):
        raise HTTPException(400, "That does not look like a YouTube link.")
    try:
        start = parse_time(payload.start)
        end = parse_time(payload.end)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None
    if start < 0:
        raise HTTPException(400, "Start time cannot be negative.")
    if end <= start:
        raise HTTPException(400, "End time must be after the start time.")
    if end - start > MAX_SECTION_SECONDS:
        raise HTTPException(
            400,
            f"Section is longer than 10 minutes ({_fmt_clock(end - start)}). "
            "Pick a shorter section.",
        )
    job_id = uuid.uuid4().hex[:12]
    directory = _job_dir(job_id)
    target = directory / "section.mp4"
    job = {
        "id": job_id,
        "tool": "trimmer",
        "status": "downloading",
        "progress": 0,
        "url": url,
        "start": start,
        "end": end,
        "section": f"{_fmt_clock(start)}-{_fmt_clock(end)}",
        "title": "",
    }
    _write_job(job)
    threading.Thread(
        target=_run_trim, args=(job_id, url, start, end, target), daemon=True
    ).start()
    return {"job_id": job_id, "status": "downloading"}


@router.get("/{job_id}")
def get_trimmer_job(job_id: str) -> dict:
    """Progress + result for one trimmer job."""
    job = _read_job(job_id)
    return {
        "id": job["id"],
        "status": job.get("status", "unknown"),
        "progress": job.get("progress"),
        "title": job.get("title") or "",
        "section": job.get("section") or "",
        "size_mb": job.get("size_mb"),
        "download_url": job.get("download_url") or "",
        "error": job.get("error") or "",
    }


@router.get("/file/{job_id}")
def get_trimmer_file(job_id: str):
    """The trimmed MP4 section."""
    target = JOBS_DIR / job_id / "section.mp4"
    if not target.exists():
        raise HTTPException(404, "Section video not ready yet.")
    job = _read_job(job_id)
    title = str(job.get("title") or "section")
    safe = re.sub(r"[^A-Za-z0-9 _.-]+", "", title).strip() or "section"
    return FileResponse(
        target,
        media_type="video/mp4",
        filename=f"{safe[:60]} ({job.get('section', '')}).mp4",
    )
