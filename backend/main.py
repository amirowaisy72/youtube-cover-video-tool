"""FastAPI backend for the YouTube cover video tool.

Run from the project root (see README.md):
    pip install -r requirements.txt
    python -m uvicorn backend.main:app --reload

Flow:
  1. POST /api/download {url}            -> jobs/<id>/source.mp4
  2. POST /api/covers (file upload)      -> covers/<id>.<ext>
  3. POST /api/process {job_id, cover_id, flip, speed, ...}
                                         -> jobs/<id>/final.mp4 + preview.mp4
  4. GET  /api/preview/{job_id}           -> preview player file
  5. GET  /api/download/{job_id}         -> final file download
  6. POST /api/upload-youtube {job_id, title, description}
                                         -> YouTube Data API (see youtube_upload.py)
  7. GET/PUT /api/settings               -> admin defaults (JSON file)

Totally free stack: Python + FastAPI + FFmpeg + yt-dlp. No Node build
step — the frontend in ../frontend is plain HTML/JS/CSS served by this
app. No secrets are hardcoded anywhere; YouTube credentials live only
in files the user creates (see README.md).
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Allow `import video` / `import youtube_upload` when run as
# `python -m uvicorn backend.main:app` from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import video  # noqa: E402
import youtube_upload  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
JOBS_DIR = BASE_DIR / "jobs"
COVERS_DIR = BASE_DIR / "covers"
SETTINGS_FILE = BASE_DIR / "backend" / "settings.json"

JOBS_DIR.mkdir(exist_ok=True)
COVERS_DIR.mkdir(exist_ok=True)

DEFAULT_SETTINGS = {
    "default_speed": 1.0,
    "voice_enabled": True,
    "voice_pitch_factor": 1.05,
    "crf": 22,
    "preset": "medium",
    "green_rect": {"x": 0, "y": 0, "w": 640, "h": 360},
    "output_width": None,
    "output_height": None,
}


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            saved = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            merged = dict(DEFAULT_SETTINGS)
            merged.update(saved)
            green = dict(DEFAULT_SETTINGS["green_rect"])
            green.update(saved.get("green_rect", {}))
            merged["green_rect"] = green
            return merged
        except (ValueError, OSError):
            pass
    return dict(DEFAULT_SETTINGS)


def save_settings(data: dict) -> dict:
    merged = load_settings()
    merged.update(data)
    if "green_rect" in data and isinstance(data["green_rect"], dict):
        green = dict(load_settings()["green_rect"])
        green.update(data["green_rect"])
        merged["green_rect"] = green
    SETTINGS_FILE.write_text(json.dumps(merged, indent=2), encoding="utf-8")
    return merged


def job_dir(job_id: str) -> Path:
    path = JOBS_DIR / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def read_job(job_id: str) -> dict:
    meta_file = job_dir(job_id) / "job.json"
    if meta_file.exists():
        try:
            return json.loads(meta_file.read_text(encoding="utf-8"))
        except ValueError:
            pass
    return {"id": job_id, "status": "unknown"}


def write_job(job: dict) -> None:
    job_dir(job["id"])
    (JOBS_DIR / job["id"] / "job.json").write_text(
        json.dumps(job, indent=2), encoding="utf-8"
    )


def yt_dlp_available() -> bool:
    if shutil.which("yt-dlp"):
        return True
    try:
        import yt_dlp  # noqa: F401
        return True
    except ImportError:
        return False


app = FastAPI(title="YouTube Cover Video Tool")


# ---------------------------------------------------------------- settings
@app.get("/api/settings")
def get_settings() -> dict:
    return load_settings()


@app.put("/api/settings")
def put_settings(payload: dict) -> dict:
    allowed = set(DEFAULT_SETTINGS)
    cleaned = {k: v for k, v in payload.items() if k in allowed}
    return save_settings(cleaned)


# ------------------------------------------------------------------ covers
@app.post("/api/covers")
async def upload_cover(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "cover.png").suffix.lower() or ".png"
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(400, "Cover must be a PNG, JPG, or WebP image.")
    cover_id = uuid.uuid4().hex[:12]
    dest = COVERS_DIR / f"{cover_id}{suffix}"
    content = await file.read()
    dest.write_bytes(content)
    return {"id": cover_id, "filename": dest.name, "path": f"/api/covers/{dest.name}"}


@app.get("/api/covers")
def list_covers() -> dict:
    covers = []
    for path in sorted(COVERS_DIR.iterdir()):
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
            covers.append({"id": path.stem, "filename": path.name})
    return {"covers": covers}


@app.get("/api/covers/{filename}")
def get_cover(filename: str) -> FileResponse:
    path = COVERS_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Cover not found.")
    return FileResponse(path)


# ---------------------------------------------------------------- download
class DownloadRequest(BaseModel):
    url: str = Field(..., min_length=8)


@app.post("/api/download")
def download_video(payload: DownloadRequest) -> dict:
    if not yt_dlp_available():
        raise HTTPException(
            400,
            "yt-dlp was not found. Install it with "
            "'pip install yt-dlp' (or install the yt-dlp binary) and retry.",
        )
    job_id = uuid.uuid4().hex[:12]
    directory = job_dir(job_id)
    target = directory / "source.mp4"
    job = {"id": job_id, "status": "downloading", "url": payload.url}
    write_job(job)
    # Prefer the module form so a pip install is enough; fall back to
    # the binary if the module is unavailable.
    try:
        import yt_dlp  # noqa: F401
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
            "--merge-output-format", "mp4",
            "-o", str(target),
            payload.url,
        ]
    except ImportError:
        cmd = [
            "yt-dlp",
            "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
            "--merge-output-format", "mp4",
            "-o", str(target),
            payload.url,
        ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not target.exists():
        job["status"] = "failed"
        job["error"] = (proc.stderr or proc.stdout or "yt-dlp failed.")[-2000:]
        write_job(job)
        raise HTTPException(400, f"Download failed: {job['error']}")
    job["status"] = "downloaded"
    write_job(job)
    return {"job_id": job_id, "status": "downloaded"}


# ----------------------------------------------------------------- process
class ProcessRequest(BaseModel):
    job_id: str
    cover_id: str
    flip: bool = False
    speed: float | None = None
    voice_pitch: float | None = None
    compress: bool = True


@app.post("/api/process")
def process_video(payload: ProcessRequest) -> dict:
    settings = load_settings()
    directory = job_dir(payload.job_id)
    source = directory / "source.mp4"
    if not source.exists():
        raise HTTPException(404, "Source video not found. Download a video first.")
    cover_matches = list(COVERS_DIR.glob(f"{payload.cover_id}.*"))
    if not cover_matches:
        raise HTTPException(404, "Cover not found. Upload a cover first.")
    cover = cover_matches[0]
    missing = video.check_ffmpeg()
    if missing:
        raise HTTPException(400, missing)

    speed = payload.speed if payload.speed is not None else settings["default_speed"]
    voice_enabled = bool(settings.get("voice_enabled", True))
    pitch = payload.voice_pitch
    if pitch is None:
        pitch = float(settings.get("voice_pitch_factor", 1.05))
    final_path = directory / "final.mp4"
    preview_path = directory / "preview.mp4"

    ok, message = video.process_job(
        source, cover, final_path, preview_path,
        green_rect=settings["green_rect"],
        flip=payload.flip,
        speed=float(speed),
        voice_enabled=voice_enabled,
        voice_pitch_factor=float(pitch),
        compress=payload.compress,
        crf=int(settings.get("crf", 22)),
        preset=str(settings.get("preset", "medium")),
        output_width=settings.get("output_width"),
        output_height=settings.get("output_height"),
    )
    job = read_job(payload.job_id)
    job.update({
        "status": "processed" if ok and final_path.exists() else "failed",
        "cover_id": payload.cover_id,
        "flip": payload.flip,
        "speed": speed,
        "voice_pitch": pitch,
        "compress": payload.compress,
        "error": None if ok else message,
    })
    write_job(job)
    if not ok or not final_path.exists():
        raise HTTPException(500, f"Processing failed: {message}")
    return {
        "job_id": payload.job_id,
        "status": "processed",
        "preview_url": f"/api/preview/{payload.job_id}",
        "download_url": f"/api/download/{payload.job_id}",
        "note": message if message != "ok" else "",
    }


@app.get("/api/preview/{job_id}")
def get_preview(job_id: str) -> FileResponse:
    path = job_dir(job_id) / "preview.mp4"
    if not path.exists():
        raise HTTPException(404, "Preview not ready yet. Process a video first.")
    return FileResponse(path, media_type="video/mp4")


@app.get("/api/download/{job_id}")
def get_final(job_id: str) -> FileResponse:
    path = job_dir(job_id) / "final.mp4"
    if not path.exists():
        raise HTTPException(404, "Final video not ready yet. Process a video first.")
    return FileResponse(
        path, media_type="video/mp4", filename=f"covered-{job_id}.mp4"
    )


# ------------------------------------------------------------ youtube api
@app.get("/api/youtube/status")
def get_youtube_status() -> dict:
    status = youtube_upload.youtube_status()
    if status["connected"]:
        try:
            status["channels"] = youtube_upload.list_channels()
        except Exception as exc:  # keep the page usable on API errors
            status["channels"] = []
            status["message"] = f"Connected, but channel list failed: {exc}"
    return status


class UploadRequest(BaseModel):
    job_id: str
    title: str
    description: str = ""
    privacy_status: str = "private"


@app.post("/api/upload-youtube")
def upload_youtube(payload: UploadRequest) -> dict:
    final_path = job_dir(payload.job_id) / "final.mp4"
    if not final_path.exists():
        raise HTTPException(404, "Final video not ready yet. Process a video first.")
    try:
        result = youtube_upload.upload_video(
            final_path,
            title=payload.title,
            description=payload.description,
            privacy_status=payload.privacy_status or "private",
        )
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"YouTube upload failed: {exc}")
    return {"job_id": payload.job_id, "status": "uploaded", **result}


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "ffmpeg": video.check_ffmpeg() is None,
        "yt_dlp": yt_dlp_available(),
    }


# Frontend must be mounted last so /api/* routes win.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
