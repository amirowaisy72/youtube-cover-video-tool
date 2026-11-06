"""Subtitle Generator — transcribe any video/audio to .srt subtitles.

Free tool: local transcription with faster-whisper (tiny model, CPU).
No credits, no license check, no paid APIs.

Upload a video/audio file, or paste a YouTube link (its audio is
downloaded with yt-dlp first). Transcription runs in a background
thread; the frontend polls GET /api/subtitles/{job_id}.

Mount in backend/main.py (one line each, parent wiring):
    import tools_subtitles  # noqa: E402
    app.include_router(tools_subtitles.router)

New pip dependency (NOT installed here — add to requirements.txt):
    faster-whisper
Its first run downloads the ~75MB tiny model once, from Hugging Face.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import threading
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/subtitles")

BASE_DIR = Path(__file__).resolve().parent.parent
JOBS_DIR = BASE_DIR / "jobs"
JOBS_DIR.mkdir(exist_ok=True)

# Audio/video containers faster-whisper can decode (via PyAV).
_MEDIA_SUFFIXES = {
    ".mp4", ".webm", ".mov", ".mkv", ".avi",
    ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma",
}
MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB

# Hosts yt-dlp accepts as YouTube (incl. Shorts / Music / mobile).
_YT_HOSTS = {
    "youtube.com", "www.youtube.com", "m.youtube.com",
    "music.youtube.com", "youtu.be", "www.youtu.be",
    "youtube-nocookie.com", "www.youtube-nocookie.com",
}

_MODEL = None
_MODEL_LOCK = threading.Lock()


def _job_dir(job_id: str) -> Path:
    path = JOBS_DIR / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _read_job(job_id: str) -> dict:
    meta_file = _job_dir(job_id) / "job.json"
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


def _set(job_id: str, **fields) -> dict:
    job = _read_job(job_id)
    job.update(fields)
    _write_job(job)
    return job


def _whisper_available() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def _yt_dlp_available() -> bool:
    if shutil.which("yt-dlp"):
        return True
    try:
        import yt_dlp  # noqa: F401
        return True
    except ImportError:
        return False


def _looks_like_youtube(url: str) -> bool:
    """True only for http(s) YouTube watch/shorts/live/share links."""
    from urllib.parse import urlparse

    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.netloc or "").lower().split(":")[0]
    if host not in _YT_HOSTS:
        return False
    return bool(parsed.path and parsed.path != "/")


def _media_duration(path: Path) -> float | None:
    """Duration in seconds via ffprobe, or None when unavailable."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=30,
        )
        return float(out.stdout.strip())
    except Exception:
        return None


def _srt_timestamp(seconds: float) -> str:
    """123.456 -> '00:02:03,456'."""
    total_ms = max(0, int(round(seconds * 1000)))
    h, rem = divmod(total_ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _segments_to_srt(segments: list[dict]) -> str:
    """[{start, end, text}] -> a valid .srt document."""
    lines: list[str] = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{_srt_timestamp(seg['start'])} --> {_srt_timestamp(seg['end'])}")
        lines.append(seg["text"].strip())
        lines.append("")
    return "\n".join(lines)


def _get_model():
    """Lazy-load the tiny model once per process (downloads ~75MB
    from Hugging Face on first use only)."""
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    with _MODEL_LOCK:
        if _MODEL is not None:
            return _MODEL
        from faster_whisper import WhisperModel

        _MODEL = WhisperModel("tiny", device="cpu", compute_type="int8")
        return _MODEL


def _run_transcribe(job_id: str, media_path: Path, language: str | None) -> None:
    """Transcribe one media file and write subtitles.srt + job.json."""
    directory = _job_dir(job_id)
    try:
        _set(job_id, status="downloading_model", progress=15,
             stage="Loading the speech model — first run downloads it (~75 MB, one time only)…")
        model = _get_model()
        duration = _media_duration(media_path)
        _set(job_id, status="transcribing", progress=20,
             stage="Transcribing…", duration_sec=duration)
        segments_iter, info = model.transcribe(
            str(media_path), language=language, beam_size=5,
        )
        segments: list[dict] = []
        for seg in segments_iter:
            segments.append({
                "start": float(seg.start),
                "end": float(seg.end),
                "text": seg.text,
            })
            if duration:
                pct = 20 + 75 * min(1.0, seg.end / duration)
                _set(job_id, progress=round(pct, 1), segments=len(segments),
                     stage=f"Transcribing… {len(segments)} segments so far")
            else:
                _set(job_id, segments=len(segments),
                     stage=f"Transcribing… {len(segments)} segments so far")
        srt_text = _segments_to_srt(segments)
        (directory / "subtitles.srt").write_text(srt_text, encoding="utf-8")
        transcript = " ".join(s["text"].strip() for s in segments).strip()
        _set(job_id, status="done", progress=100,
             stage="Done — subtitles are ready.",
             language=info.language,
             language_probability=round(float(info.language_probability), 2),
             transcript=transcript,
             segments=len(segments),
             download_url=f"/api/subtitles/file/{job_id}")
    except Exception as exc:  # noqa: BLE001
        _set(job_id, status="failed", progress=0,
             stage="Failed.", error=str(exc)[-2000:])


def _run_url(job_id: str, url: str, language: str | None) -> None:
    """Download a YouTube video's audio with yt-dlp, then transcribe it."""
    directory = _job_dir(job_id)
    try:
        _set(job_id, status="downloading", progress=0,
             stage="Downloading audio from YouTube…")

        def hook(d: dict) -> None:
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0) or 0
            pct = round(downloaded * 100 / total, 1) if total else 0
            # Audio download is the first 15% of the job.
            _set(job_id, progress=round(pct * 0.15, 1))

        import yt_dlp

        opts = {
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "outtmpl": str(directory / "audio.%(ext)s"),
            "progress_hooks": [hook],
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 60,
            "retries": 3,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
        audio_files = sorted(directory.glob("audio.*"))
        audio_files = [p for p in audio_files if p.suffix.lower() != ".part"]
        if not audio_files:
            raise RuntimeError("Audio download finished but no file was created.")
        _run_transcribe(job_id, audio_files[0], language)
    except Exception as exc:  # noqa: BLE001
        _set(job_id, status="failed", progress=0,
             stage="Failed.", error=str(exc)[-2000:])


def _clean_language(raw: str | None) -> str | None:
    """'' / 'auto' -> None (auto-detect); otherwise a 2-3 letter code."""
    if not raw:
        return None
    lang = raw.strip().lower()
    if lang in ("auto", "auto-detect"):
        return None
    if not re.fullmatch(r"[a-z]{2,3}", lang):
        raise HTTPException(400, "Language must be 'auto' or a 2-3 letter code (e.g. en, ur).")
    return lang


@router.post("")
async def create_subtitles(request: Request, file: UploadFile | None = File(None)):
    """Start a subtitle job.

    Multipart form: file=<video/audio> + optional language field.
    JSON body: {"url": "<youtube link>", "language": "auto"|"en"|...}.
    Returns immediately; poll GET /api/subtitles/{job_id}.
    """
    if not _whisper_available():
        raise HTTPException(
            400,
            "faster-whisper is not installed. Run 'pip install faster-whisper' "
            "and restart the tool, then try again.",
        )
    content_type = request.headers.get("content-type", "")
    url: str | None = None
    language: str | None = None
    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(400, "Invalid JSON body.") from None
        if not isinstance(body, dict):
            raise HTTPException(400, "JSON body must be an object.") from None
        url = (body.get("url") or "").strip() or None
        language = _clean_language(body.get("language"))
    else:
        form = await request.form()
        lang_value = form.get("language")
        language = _clean_language(str(lang_value) if lang_value is not None else None)
        # request.form() already consumed the file part into `file` when
        # present; when the client sent only fields, file stays None.

    job_id = uuid.uuid4().hex[:12]
    directory = _job_dir(job_id)

    if file is not None and file.filename:
        suffix = Path(file.filename).suffix.lower()
        if suffix not in _MEDIA_SUFFIXES:
            raise HTTPException(
                400,
                f"Unsupported file type '{suffix}'. Upload a video or audio file "
                "(mp4, webm, mov, mkv, mp3, wav, m4a, ogg, flac).",
            )
        target = directory / f"source{suffix}"
        size = 0
        with target.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    target.unlink(missing_ok=True)
                    raise HTTPException(400, "File is too large (max 2 GB).")
                out.write(chunk)
        _set(job_id, status="queued", progress=0, stage="Starting…",
             source=file.filename)
        threading.Thread(
            target=_run_transcribe, args=(job_id, target, language),
            daemon=True).start()
        return {"job_id": job_id, "status": "queued"}

    if url:
        if not _looks_like_youtube(url):
            raise HTTPException(400, "That does not look like a YouTube video link.")
        if not _yt_dlp_available():
            raise HTTPException(
                400,
                "yt-dlp was not found. Install it with 'pip install yt-dlp' and retry.",
            )
        _set(job_id, status="queued", progress=0, stage="Starting…", source=url)
        threading.Thread(
            target=_run_url, args=(job_id, url, language),
            daemon=True).start()
        return {"job_id": job_id, "status": "queued"}

    raise HTTPException(400, "Upload a video/audio file or paste a YouTube link.")


@router.get("/{job_id}")
def get_subtitles(job_id: str) -> dict:
    """Poll a subtitle job: status, progress, language, transcript."""
    job = _read_job(job_id)
    if job.get("status") == "unknown":
        raise HTTPException(404, "Subtitle job not found.")
    return {
        "job_id": job["id"],
        "status": job.get("status"),
        "progress": job.get("progress", 0),
        "stage": job.get("stage", ""),
        "language": job.get("language"),
        "language_probability": job.get("language_probability"),
        "transcript": job.get("transcript"),
        "segments": job.get("segments", 0),
        "duration_sec": job.get("duration_sec"),
        "download_url": job.get("download_url"),
        "error": job.get("error"),
    }


@router.get("/file/{job_id}")
def download_srt(job_id: str) -> FileResponse:
    """The finished .srt subtitle file."""
    path = _job_dir(job_id) / "subtitles.srt"
    if not path.is_file():
        job = _read_job(job_id)
        if job.get("status") == "unknown":
            raise HTTPException(404, "Subtitle job not found.")
        raise HTTPException(404, "Subtitles are not ready yet.")
    return FileResponse(
        path, media_type="application/x-subrip",
        filename="subtitles.srt",
    )
