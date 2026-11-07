"""Audio Extractor tool — extract a video's audio as an MP3 (192k).

Free tool: no license/credit calls. Two inputs:
  (a) an uploaded video file, or
  (b) a YouTube link (yt-dlp downloads the audio-only stream).
FFmpeg converts to MP3 (libmp3lame, 192k) in a background thread;
the frontend polls GET /api/audio/{job_id}.

Wire-up (in backend/main.py — NOT done here):
    import tools_audio  # noqa: E402
    app.include_router(tools_audio.router)
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import threading
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

# Same import rule as backend/main.py: allow `import video` when run
# as `python -m uvicorn backend.main:app` from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import video  # noqa: E402

router = APIRouter(prefix="/api/audio")

BASE_DIR = Path(__file__).resolve().parent.parent
JOBS_DIR = BASE_DIR / "jobs"
JOBS_DIR.mkdir(exist_ok=True)

VIDEO_SUFFIXES = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v", ".flv", ".wmv"}


def _job_dir(job_id: str) -> Path:
    path = JOBS_DIR / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _read_job(job_id: str) -> dict:
    meta = _job_dir(job_id) / "job.json"
    if meta.exists():
        try:
            return json.loads(meta.read_text(encoding="utf-8"))
        except ValueError:
            pass
    return {"id": job_id, "status": "unknown"}


def _write_job(job: dict) -> None:
    _job_dir(job["id"])
    (JOBS_DIR / job["id"] / "job.json").write_text(
        json.dumps(job, indent=2), encoding="utf-8"
    )


def _fail(job_id: str, message: str) -> None:
    job = _read_job(job_id)
    job.update({"status": "failed", "error": message})
    _write_job(job)


def _done(job_id: str, title: str) -> None:
    target = _job_dir(job_id) / "audio.mp3"
    job = _read_job(job_id)
    job.update({
        "status": "done",
        "progress": 100,
        "title": title,
        "size_bytes": target.stat().st_size if target.exists() else None,
        "download_url": f"/api/audio/file/{job_id}",
    })
    _write_job(job)


def _safe_filename(title: str) -> str:
    name = re.sub(r"[^\w\s.-]", "", title or "audio").strip()
    name = re.sub(r"\s+", " ", name).strip(" .")
    return (name or "audio")[:80]


def _convert_to_mp3(source: Path, target: Path, job_id: str) -> bool:
    """FFmpeg: any audio/video input -> MP3 192k. False on failure."""
    job = _read_job(job_id)
    job.update({"status": "converting", "progress": 90})
    _write_job(job)
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", str(source), "-vn",
         "-c:a", "libmp3lame", "-b:a", "192k", str(target)],
        capture_output=True, text=True, **video.no_window_kwargs(),
    )
    if proc.returncode != 0:
        _fail(job_id, "Audio conversion failed: " + ((proc.stderr or "")[-1000:]))
        return False
    return True


def _run_upload(job_id: str, source: Path, title: str) -> None:
    directory = _job_dir(job_id)
    if not _convert_to_mp3(source, directory / "audio.mp3", job_id):
        return
    _done(job_id, title)


def _run_youtube(job_id: str, url: str) -> None:
    directory = _job_dir(job_id)
    try:
        import yt_dlp
    except ImportError:
        _fail(job_id, "yt-dlp was not found. Install it with 'pip install yt-dlp' and retry.")
        return
    title_holder: dict = {}

    def hook(d: dict) -> None:
        info = d.get("info_dict") or {}
        if info.get("title"):
            title_holder["title"] = info["title"]
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0) or 0
            pct = round(downloaded * 100 / total, 1) if total else 0
            job = _read_job(job_id)
            # Audio download is 0-80%; conversion takes the rest.
            job.update({"progress": round(pct * 0.8, 1)})
            if title_holder.get("title"):
                job["title"] = title_holder["title"]
            _write_job(job)

    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(directory / "source.%(ext)s"),
        "progress_hooks": [hook],
        "quiet": True,
        "no_warnings": True,
        "retries": 10,
        "socket_timeout": 60,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as exc:  # noqa: BLE001
        _fail(job_id, "Download failed: " + str(exc)[-1000:])
        return
    raws = [p for p in directory.glob("source.*")
            if p.suffix.lower() in {".m4a", ".webm", ".opus", ".mp3", ".ogg",
                                    ".wav", ".flac", ".aac", ".mka"}]
    if not raws:
        _fail(job_id, "Download finished but no audio file was created.")
        return
    raw = raws[0]
    title = title_holder.get("title") or raw.stem
    if not _convert_to_mp3(raw, directory / "audio.mp3", job_id):
        return
    try:
        raw.unlink()
    except OSError:
        pass
    _done(job_id, title)


@router.post("")
async def extract_audio(
    file: UploadFile | None = File(None),
    url: str | None = Form(None),
) -> dict:
    """Start an audio extraction. Multipart form with either `file`
    (a video upload) or `url` (a YouTube link). Returns immediately;
    poll GET /api/audio/{job_id}."""
    missing = video.check_ffmpeg()
    if missing:
        raise HTTPException(400, missing)
    if shutil.which("yt-dlp") is None:
        try:
            import yt_dlp  # noqa: F401
        except ImportError:
            raise HTTPException(
                400,
                "yt-dlp was not found. Install it with "
                "'pip install yt-dlp' (or install the yt-dlp binary) and retry.",
            ) from None
    url = (url or "").strip()
    if file is not None and url:
        raise HTTPException(400, "Send either a video file or a YouTube link, not both.")
    if file is None and not url:
        raise HTTPException(400, "Upload a video file or paste a YouTube link.")
    if url and "youtu" not in url:
        raise HTTPException(400, "That does not look like a YouTube link.")
    if url:
        # A watch link carrying &list=... would make yt-dlp fetch
        # the whole playlist (user, 2026-11-07).
        url = video.clean_youtube_url(url)
        if url is None:
            raise HTTPException(
                400,
                "That is a playlist link, not one video. "
                "Open the video itself and paste its link (youtube.com/watch?v=…).",
            )
    job_id = uuid.uuid4().hex[:12]
    directory = _job_dir(job_id)
    if file is not None:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in VIDEO_SUFFIXES:
            raise HTTPException(
                400,
                "Unsupported video file. Upload an MP4, MOV, WebM, MKV or AVI video.",
            )
        source = directory / f"source{suffix}"
        # Stream to disk in chunks (never load a whole video in memory).
        with source.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
        title = Path(file.filename or "video").stem
        job = {"id": job_id, "status": "converting", "progress": 10,
               "source": "upload", "title": title, "filename": file.filename}
        _write_job(job)
        threading.Thread(target=_run_upload, args=(job_id, source, title),
                         daemon=True).start()
    else:
        job = {"id": job_id, "status": "downloading", "progress": 0,
               "source": "youtube", "url": url, "title": ""}
        _write_job(job)
        threading.Thread(target=_run_youtube, args=(job_id, url), daemon=True).start()
    return {"job_id": job_id, "status": job["status"]}


@router.get("/{job_id}")
def audio_status(job_id: str) -> dict:
    """Poll an extraction: status, progress, title, download URL."""
    job = _read_job(job_id)
    if job.get("status") == "unknown":
        raise HTTPException(404, "Audio job not found.")
    return {
        "id": job["id"],
        "status": job.get("status"),
        "progress": job.get("progress", 0),
        "title": job.get("title", ""),
        "size_bytes": job.get("size_bytes"),
        "error": job.get("error"),
        "download_url": job.get("download_url") if job.get("status") == "done" else None,
    }


@router.get("/file/{job_id}")
def audio_file(job_id: str):
    """The finished MP3."""
    job = _read_job(job_id)
    target = _job_dir(job_id) / "audio.mp3"
    if job.get("status") != "done" or not target.exists():
        raise HTTPException(404, "Audio is not ready yet.")
    return FileResponse(
        target,
        media_type="audio/mpeg",
        filename=f"{_safe_filename(job.get('title') or 'audio')}.mp3",
    )
