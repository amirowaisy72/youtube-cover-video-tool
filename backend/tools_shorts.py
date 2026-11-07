"""Shorts Maker for YT Guru — turn your own long video into a vertical
9:16 Shorts clip (1080x1920, blurred-background fill).

Totally free: FFmpeg + yt-dlp only, no paid API, no credits, no
license check — this tool is free for every user.

Input: either upload a video file, or paste a YouTube link (the
video is downloaded first with yt-dlp, same as the cover tool).
The user picks start and end seconds; the clip is at most 60s.

Output: 1080x1920 MP4. The frame is filled with a blurred copy of
the video itself and the sharp video is fitted on top, so the full
frame stays visible (better quality than a hard center crop).

Endpoints (prefix /api/shorts):
  POST /api/shorts/upload    multipart file + start_seconds + end_seconds
  POST /api/shorts/from-url  JSON {url, start_seconds, end_seconds}
  GET  /api/shorts/{job_id}  job status (poll this)
  GET  /api/shorts/file/{job_id}  the finished 1080x1920 MP4

Wiring (do this in backend/main.py — this file is self-contained):
  from tools_shorts import router as shorts_router
  app.include_router(shorts_router)
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Allow `import video` when run as `python -m uvicorn backend.main:app`
# from the project root (same as backend/main.py does).
sys.path.insert(0, str(Path(__file__).resolve().parent))

import video  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
JOBS_DIR = BASE_DIR / "jobs"

MAX_CLIP_SECONDS = 60
VIDEO_EXTS = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"}

router = APIRouter(prefix="/api/shorts")


# ------------------------------------------------------------------ jobs
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


def _set(job_id: str, status: str, progress: float, **extra) -> None:
    job = _read_job(job_id)
    job.update({"status": status, "progress": progress})
    job.update(extra)
    _write_job(job)


def _validate_range(start: float, end: float) -> None:
    if start < 0:
        raise HTTPException(400, "Start must be 0 seconds or more.")
    if end <= start:
        raise HTTPException(400, "End must be after start.")
    if end - start > MAX_CLIP_SECONDS:
        raise HTTPException(
            400, f"Clip can be at most {MAX_CLIP_SECONDS} seconds long."
        )


def _is_youtube_url(url: str) -> bool:
    u = url.strip().lower()
    return "youtube.com" in u or "youtu.be" in u


# ------------------------------------------------------------------ encode
def _encode(job_id: str, source: Path, start: float, end: float,
            base: float, span: float, title: str | None = None,
            duration: float | None = None) -> None:
    """Cut source[start:end] into a 1080x1920 blurred-background Short."""
    missing = video.check_ffmpeg()
    if missing:
        _set(job_id, "failed", 0, error=missing)
        return
    if not source.exists():
        _set(job_id, "failed", 0, error="Source video not found.")
        return

    if duration is None:
        duration = video.get_duration(source)
    clamped = False
    if duration:
        if start >= duration:
            _set(job_id, "failed", 0,
                 error=f"Start ({start:g}s) is past the end of the video "
                       f"({duration:.1f}s). Pick an earlier start.")
            return
        if end > duration:
            end = duration
            clamped = True
    clip = end - start
    if clip <= 0:
        _set(job_id, "failed", 0, error="Clip is empty after trimming.")
        return

    out = _job_dir(job_id) / "shorts.mp4"
    # Blurred-background fill: a blurred copy of the frame fills the
    # whole 1080x1920 canvas, the sharp video is fitted on top.
    graph = (
        "[0:v]split[a][b];"
        "[a]scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,gblur=sigma=40[bg];"
        "[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]"
    )
    cmd = [
        "ffmpeg", "-y",
        "-i", str(source),
        "-ss", str(start),
        "-t", str(clip),
        "-filter_complex", graph,
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(out),
    ]

    def _on_progress(pct: float, elapsed: float, eta: float | None) -> None:
        _set(job_id, "processing", pct,
             stage="Making your Short (1080x1920, blurred background)…")

    _set(job_id, "processing", base,
         stage="Making your Short (1080x1920, blurred background)…",
         start=start, end=end, clip_seconds=round(clip, 1), clamped=clamped,
         title=title, duration=duration)
    ok, tail = video.run_with_progress(cmd, clip, base, span,
                                       on_progress=_on_progress)
    if not ok or not out.exists():
        _set(job_id, "failed", 0,
             error=f"FFmpeg failed: {tail[-2000:]}" if tail else "FFmpeg failed.")
        return
    size_mb = out.stat().st_size / 1024 / 1024
    _set(job_id, "done", 100, stage="Done — your Short is ready.",
         start=start, end=end, clip_seconds=round(clip, 1), clamped=clamped,
         title=title, duration=duration, output_mb=round(size_mb, 1),
         download_url=f"/api/shorts/file/{job_id}")


def _download_source(job_id: str, url: str, target: Path) -> dict | None:
    """Download a YouTube video with yt-dlp (same settings as the
    cover tool). Returns the video info dict, or None on failure
    (the job is already marked failed in that case)."""
    info: dict = {}

    def hook(d: dict) -> None:
        total = d.get("total_bytes") or d.get("total_bytes_estimate")
        downloaded = d.get("downloaded_bytes", 0) or 0
        pct = round(downloaded * 100 / total, 1) if total else 0
        _set(job_id, "downloading", round(pct * 0.25, 1),
             stage="Downloading video from YouTube…")

    for attempt in range(1, 4):
        try:
            import yt_dlp
            opts = {
                "format": "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b",
                "merge_output_format": "mp4",
                "retries": 10,
                "fragment_retries": 10,
                "socket_timeout": 60,
                "outtmpl": str(target),
                "progress_hooks": [hook],
                "quiet": True,
                "no_warnings": True,
            }
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True) or {}
            if target.exists():
                return info
            _set(job_id, "failed", 0,
                 error="Download finished but no file was created.")
            return None
        except ImportError:
            break
        except Exception as exc:  # noqa: BLE001
            if attempt < 3:
                _set(job_id, "downloading", 0,
                     stage="Download hit a problem — retrying…")
                time.sleep(5 * attempt)
                continue
            _set(job_id, "failed", 0, error=str(exc)[-2000:])
            return None
    # Python module missing: fall back to the yt-dlp binary.
    if not shutil.which("yt-dlp"):
        _set(job_id, "failed", 0,
             error="yt-dlp was not found. Install it with "
                   "'pip install yt-dlp' (or install the yt-dlp binary) and retry.")
        return None
    cmd = [
        "yt-dlp",
        "-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b",
        "--merge-output-format", "mp4",
        "-o", str(target),
        url,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True,
                          **video.no_window_kwargs())
    if proc.returncode != 0 or not target.exists():
        _set(job_id, "failed", 0,
             error=(proc.stderr or proc.stdout or "yt-dlp failed.")[-2000:])
        return None
    return info


def _run_from_url(job_id: str, url: str, start: float, end: float) -> None:
    directory = _job_dir(job_id)
    target = directory / "source.mp4"
    info = _download_source(job_id, url, target)
    if info is None:
        return
    _encode(job_id, target, start, end, base=25, span=75,
            title=info.get("title"),
            duration=info.get("duration"))


# ------------------------------------------------------------------ routes
@router.post("/upload")
async def create_from_upload(
    file: UploadFile = File(...),
    start_seconds: float = Form(...),
    end_seconds: float = Form(...),
) -> dict:
    """Make a Short from an uploaded video file."""
    _validate_range(start_seconds, end_seconds)
    missing = video.check_ffmpeg()
    if missing:
        raise HTTPException(400, missing)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in VIDEO_EXTS:
        raise HTTPException(
            400,
            f"Not a video file. Upload one of: {', '.join(sorted(VIDEO_EXTS))}.",
        )
    job_id = uuid.uuid4().hex[:12]
    directory = _job_dir(job_id)
    target = directory / f"source{suffix}"
    data = await file.read()
    if not data:
        raise HTTPException(400, "The uploaded file is empty.")
    target.write_bytes(data)
    _write_job({
        "id": job_id, "tool": "shorts", "source": "upload",
        "status": "processing", "progress": 0,
        "stage": "Making your Short (1080x1920, blurred background)…",
        "title": file.filename, "start": start_seconds, "end": end_seconds,
    })
    threading.Thread(
        target=_encode,
        args=(job_id, target, start_seconds, end_seconds, 0, 100),
        kwargs={"title": file.filename},
        daemon=True,
    ).start()
    return {"job_id": job_id, "status": "processing"}


class ShortsUrlRequest(BaseModel):
    url: str = Field(..., min_length=8)
    start_seconds: float = Field(..., ge=0)
    end_seconds: float = Field(..., gt=0)


@router.post("/from-url")
def create_from_url(payload: ShortsUrlRequest) -> dict:
    """Make a Short from a YouTube link: download it, then cut the clip."""
    _validate_range(payload.start_seconds, payload.end_seconds)
    if not _is_youtube_url(payload.url):
        raise HTTPException(400, "Paste a YouTube link (youtube.com or youtu.be).")
    # A watch link carrying &list=... would make yt-dlp fetch the
    # whole playlist (user, 2026-11-07).
    url = video.clean_youtube_url(payload.url.strip())
    if url is None:
        raise HTTPException(
            400,
            "That is a playlist link, not one video. "
            "Open the video itself and paste its link (youtube.com/watch?v=…).",
        )
    if not shutil.which("yt-dlp"):
        try:
            import yt_dlp  # noqa: F401
        except ImportError:
            raise HTTPException(
                400,
                "yt-dlp was not found. Install it with "
                "'pip install yt-dlp' (or install the yt-dlp binary) and retry.",
            )
    job_id = uuid.uuid4().hex[:12]
    _write_job({
        "id": job_id, "tool": "shorts", "source": "youtube",
        "status": "downloading", "progress": 0,
        "stage": "Downloading video from YouTube…",
        "url": url, "start": payload.start_seconds,
        "end": payload.end_seconds,
    })
    threading.Thread(
        target=_run_from_url,
        args=(job_id, url, payload.start_seconds, payload.end_seconds),
        daemon=True,
    ).start()
    return {"job_id": job_id, "status": "downloading"}


@router.get("/file/{job_id}")
def download_short(job_id: str):
    """The finished 1080x1920 MP4. (Registered before /{job_id}.)"""
    job = _read_job(job_id)
    if job.get("status") == "unknown":
        raise HTTPException(404, "Short job not found.")
    path = JOBS_DIR / job_id / "shorts.mp4"
    if job.get("status") != "done" or not path.exists():
        raise HTTPException(
            400, f"Short is not ready yet (status: {job.get('status')}).")
    return FileResponse(path, media_type="video/mp4",
                        filename=f"short-{job_id}.mp4")


@router.get("/{job_id}")
def get_shorts_job(job_id: str) -> dict:
    """Poll this for status/progress while the Short is being made."""
    return _read_job(job_id)
