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
import threading
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
    # veryfast is ~2-3x faster than medium at the same CRF (same look,
    # slightly bigger file) — the old medium preset was a big slowdown.
    "preset": "veryfast",
    "green_rect": {"x": 0, "y": 0, "w": 640, "h": 360},
    # Auto-detect the green area from the cover image itself, so the
    # video lands exactly on the green screen, not at a guessed 0,0.
    # Falls back to green_rect when no green area is found.
    "auto_detect_green": True,
    # Cap the final cover at 1280px wide: a 2048px cover encoded at
    # full size was the other big slowdown; 1280 is still full HD.
    "output_width": 1280,
    "output_height": None,
}


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            saved = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            # Speed migration: old installs saved "medium", which was
            # the main encode slowdown. Upgrade it once to veryfast;
            # the user can still pick medium/slow in the Admin tab.
            if saved.get("preset") == "medium":
                saved["preset"] = "veryfast"
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
def _cover_display_name(filename: str) -> str:
    # New uploads are saved as <id>_<original-name>; old ones are <id>.<ext>.
    parts = filename.split("_", 1)
    if len(parts) == 2 and len(parts[0]) == 12 and parts[0].isalnum():
        return parts[1]
    return filename


@app.post("/api/covers")
async def upload_cover(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "cover.png").suffix.lower() or ".png"
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(400, "Cover must be a PNG, JPG, or WebP image.")
    # Keep the original name (sanitised) so the user recognises their
    # own cover later, instead of only seeing a hash like bc59f1….jpg.
    original = "".join(c for c in (file.filename or "cover.png")
                       if c.isalnum() or c in ("-", "_", ".", " ")).strip() or "cover.png"
    cover_id = uuid.uuid4().hex[:12]
    dest = COVERS_DIR / f"{cover_id}_{original}"
    content = await file.read()
    dest.write_bytes(content)
    return {"id": cover_id, "filename": dest.name,
            "display_name": original, "path": f"/api/covers/{dest.name}"}


@app.get("/api/covers")
def list_covers() -> dict:
    covers = []
    for path in sorted(COVERS_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
            covers.append({"id": path.stem.split("_", 1)[0] if "_" in path.stem else path.stem,
                           "filename": path.name,
                           "display_name": _cover_display_name(path.name),
                           "path": f"/api/covers/{path.name}"})
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


def _run_download(job_id: str, url: str, target: Path) -> None:
    """Run yt-dlp in a background thread, writing progress to job.json.

    The frontend polls GET /api/jobs/{job_id} while this runs, so the
    user sees a real progress bar instead of a frozen 'Downloading…'.
    """
    import time as _time
    dl_start = _time.time()
    job = {"id": job_id, "status": "downloading", "url": url,
           "progress": 0, "downloaded_bytes": 0, "total_bytes": None,
           "speed": None, "eta": None, "timeline": []}
    write_job(job)

    def hook(d: dict) -> None:
        total = d.get("total_bytes") or d.get("total_bytes_estimate")
        downloaded = d.get("downloaded_bytes", 0) or 0
        percent = round(downloaded * 100 / total, 1) if total else 0
        job.update({
            "status": "downloading" if d.get("status") != "finished" else "downloading",
            "progress": percent,
            "downloaded_bytes": downloaded,
            "total_bytes": total,
            "speed": d.get("speed"),
            "eta": d.get("eta"),
        })
        write_job(job)

    try:
        import yt_dlp
        opts = {
            # Speed fix 1: cap at 720p. The old "best video" often
            # pulled 1080p/4K, but the video is only shown in a
            # 640x360 green area — the extra pixels only cost
            # download + merge + encode time. 8 parallel fragments
            # also speed up DASH downloads on a normal connection.
            "format": "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b",
            "merge_output_format": "mp4",
            "concurrent_fragment_downloads": 8,
            "outtmpl": str(target),
            "progress_hooks": [hook],
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except ImportError:
        cmd = [
            "yt-dlp",
            "-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b",
            "--merge-output-format", "mp4",
            "--concurrent-fragments", "8",
            "-o", str(target),
            url,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            job["status"] = "failed"
            job["error"] = (proc.stderr or proc.stdout or "yt-dlp failed.")[-2000:]
            write_job(job)
            return
    except Exception as exc:  # noqa: BLE001 - report it in job.json
        job["status"] = "failed"
        job["error"] = str(exc)[-2000:]
        write_job(job)
        return
    if target.exists():
        dur = _time.time() - dl_start
        size_mb = target.stat().st_size / 1024 / 1024
        avg = size_mb / dur if dur else 0
        job["timeline"] = [{
            "step": "YouTube download (yt-dlp, max 720p, 8 fragments)",
            "duration_sec": round(dur, 1),
            "detail": f"{size_mb:.1f} MB in {dur:.0f}s (avg {avg:.1f} MB/s)",
        }]
        job.update({"status": "downloaded", "progress": 100})
    else:
        job.update({"status": "failed", "error": "yt-dlp finished but no file was created."})
    write_job(job)


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
    # Return immediately; the frontend polls progress (below) while
    # the download runs in the background.
    threading.Thread(target=_run_download, args=(job_id, payload.url, target),
                     daemon=True).start()
    return {"job_id": job_id, "status": "downloading"}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    """Download progress for the frontend progress bar."""
    return read_job(job_id)


# ----------------------------------------------------------------- process
@app.get("/api/detect-green/{cover_id}")
def detect_green(cover_id: str) -> dict:
    """Auto-detected green rectangle for one uploaded cover."""
    matches = list(COVERS_DIR.glob(f"{cover_id}_*.*")) or list(COVERS_DIR.glob(f"{cover_id}.*"))
    if not matches:
        raise HTTPException(404, "Cover not found.")
    rect = video.detect_green_rect(matches[0])
    if not rect:
        raise HTTPException(404, "No green area found in this cover. Use the manual rectangle in Admin settings.")
    return {"cover_id": cover_id, "green_rect": rect, "source": "auto-detected"}


class ProcessRequest(BaseModel):
    job_id: str
    cover_id: str
    flip: bool = False
    speed: float | None = None
    voice_pitch: float | None = None
    compress: bool = True
    zoom: float | None = None
    green_rect: dict | None = None


def _run_process(payload: ProcessRequest, settings: dict, directory,
                 source, cover, final_path, preview_path,
                 speed, voice_enabled, pitch, green_rect, zoom) -> None:
    import time as _time
    started = _time.time()
    preview_started = [None]

    def on_progress(pct, elapsed, eta):
        # Only record the preview start time here; the full timeline
        # is built once at the end, so entries are never duplicated
        # by repeated polling writes.
        if pct >= 90 and preview_started[0] is None:
            preview_started[0] = _time.time()
        job = read_job(payload.job_id)
        job.update({
            "status": "processing",
            "process_progress": pct,
            "process_stage": "Final video encoding…" if pct < 90 else "Preview encoding…",
            "process_elapsed": round(elapsed, 1) if elapsed else None,
            "process_eta": round(eta, 1) if eta else None,
        })
        write_job(job)

    ok, message = video.process_job(
        source, cover, final_path, preview_path,
        green_rect=green_rect,
        flip=payload.flip,
        speed=float(speed),
        voice_enabled=voice_enabled,
        voice_pitch_factor=float(pitch),
        compress=payload.compress,
        crf=int(settings.get("crf", 22)),
        preset=str(settings.get("preset", "medium")),
        output_width=settings.get("output_width"),
        output_height=settings.get("output_height"),
        zoom=zoom,
        on_progress=on_progress,
    )
    job = read_job(payload.job_id)
    ended = _time.time()
    prev_timeline = [t for t in (job.get("timeline") or [])
                     if not str(t.get("step", "")).startswith("Final video encode")
                     and not str(t.get("step", "")).startswith("Preview encode")]
    if ok and final_path.exists():
        pv_start = preview_started[0] or ended
        prev_timeline.append({
            "step": "Final video encode (libx264, "
                    f"preset {settings.get('preset', 'veryfast')}, "
                    f"CRF {settings.get('crf', 22)}, max width "
                    f"{settings.get('output_width', 1280)}px)",
            "duration_sec": round(pv_start - started, 1),
            "detail": f"Source {source.stat().st_size / 1024 / 1024:.1f} MB → "
                      f"final {final_path.stat().st_size / 1024 / 1024:.1f} MB"
                      if source.exists() else "",
        })
        prev_timeline.append({
            "step": "Preview encode (640px, fast preset)",
            "duration_sec": round(ended - pv_start, 1),
            "detail": f"Preview {preview_path.stat().st_size / 1024 / 1024:.1f} MB"
                      if preview_path.exists() else "Preview not created",
        })
    job.update({
        "status": "processed" if ok and final_path.exists() else "failed",
        "timeline": prev_timeline,
        "process_progress": 100 if ok and final_path.exists() else job.get("process_progress", 0),
        "process_stage": "Done" if ok and final_path.exists() else "Failed",
        "cover_id": payload.cover_id,
        "flip": payload.flip,
        "speed": speed,
        "voice_pitch": pitch,
        "compress": payload.compress,
        "zoom": zoom,
        "green_rect_used": green_rect,
        "error": None if ok else message,
    })
    write_job(job)


@app.post("/api/process")
def process_video(payload: ProcessRequest) -> dict:
    settings = load_settings()
    directory = job_dir(payload.job_id)
    source = directory / "source.mp4"
    if not source.exists():
        raise HTTPException(404, "Source video not found. Download a video first.")
    cover_matches = list(COVERS_DIR.glob(f"{payload.cover_id}_*.*")) or list(COVERS_DIR.glob(f"{payload.cover_id}.*"))
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
    zoom = payload.zoom if payload.zoom is not None else 1.0
    zoom = max(1.0, min(2.0, float(zoom)))
    # Green area: the frontend may already have auto-detected it and
    # sent it; otherwise auto-detect here from the cover itself.
    # Manual admin rectangle is the last fallback.
    green_rect = payload.green_rect or settings["green_rect"]
    green_source = "manual"
    if payload.green_rect is None and settings.get("auto_detect_green", True):
        detected = video.detect_green_rect(cover)
        if detected:
            green_rect = detected
            green_source = "auto-detected"
    final_path = directory / "final.mp4"
    preview_path = directory / "preview.mp4"

    # Return immediately; the frontend polls /api/jobs/{job_id} and
    # shows the progress bar right in the Edit section itself.
    job = read_job(payload.job_id)
    job.update({"status": "processing", "process_progress": 0,
                "process_stage": "Starting…",
                "green_rect_used": green_rect, "green_source": green_source})
    write_job(job)
    threading.Thread(target=_run_process, args=(
        payload, settings, directory, source, cover, final_path, preview_path,
        speed, voice_enabled, pitch, green_rect, zoom), daemon=True).start()
    return {
        "job_id": payload.job_id,
        "status": "processing",
        "green_rect_used": green_rect,
        "green_source": green_source,
        "preview_url": f"/api/preview/{payload.job_id}",
        "download_url": f"/api/download/{payload.job_id}",
    }


@app.get("/api/source/{job_id}")
def get_source(job_id: str) -> FileResponse:
    """Raw downloaded video, for the live preview while editing."""
    path = job_dir(job_id) / "source.mp4"
    if not path.exists():
        raise HTTPException(404, "Source video not ready yet. Download a video first.")
    return FileResponse(path, media_type="video/mp4")


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
