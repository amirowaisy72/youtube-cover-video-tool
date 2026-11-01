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
  6. POST /api/upload-youtube {job_id, title, description, tags}
                                         -> YouTube Data API (see youtube_upload.py)
  Original metadata: when a video is downloaded (manual or Auto),
  yt-dlp also returns its original title, description and tags.
  They are stored in job.json (original_title, original_description,
  original_tags), shown in the UI, and prefilled into the upload
  form, so the user can upload with the original title/description/
  tags or edit them first.
  7. GET/PUT /api/settings               -> admin defaults (JSON file)

Totally free stack: Python + FastAPI + FFmpeg + yt-dlp. No Node build
step — the frontend in ../frontend is plain HTML/JS/CSS served by this
app. No secrets are hardcoded anywhere; YouTube credentials live only
in files the user creates (see README.md).
"""

from __future__ import annotations

import datetime
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
from starlette.background import BackgroundTask
from pydantic import BaseModel, Field

# Allow `import video` / `import youtube_upload` when run as
# `python -m uvicorn backend.main:app` from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import video  # noqa: E402
import youtube_upload  # noqa: E402
import metadata as local_metadata  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
JOBS_DIR = BASE_DIR / "jobs"
COVERS_DIR = BASE_DIR / "covers"
GROUPS_DIR = BASE_DIR / "groups"
RECORDS_FILE = BASE_DIR / "records.json"
SETTINGS_FILE = BASE_DIR / "backend" / "settings.json"

JOBS_DIR.mkdir(exist_ok=True)
COVERS_DIR.mkdir(exist_ok=True)
GROUPS_DIR.mkdir(exist_ok=True)

DEFAULT_SETTINGS = {
    "default_speed": 1.0,
    "default_flip": True,
    "fit_mode": "cover",
    "manual_speed": 1.0,
    "manual_flip": True,
    "manual_voice_enabled": True,
    "manual_voice_pitch_factor": 1.05,
    "manual_fit_mode": "cover",
    "profiles": {},
    # Active preset (user, 2026-11-01): presets are the ONLY
    # settings system — there is no separate "Save admin settings".
    # The Active preset's values are the defaults for Auto,
    # Manual and Group (when a group video has no preset of its
    # own). If no preset is marked Active, the first preset in
    # the list is used. Empty = no presets yet, fall back to the
    # built-in defaults above.
    "active_preset": "",
    "youtube_channels": [],
    "voice_enabled": True,
    "voice_pitch_factor": 1.05,
    "crf": 22,
    # Size AND quality, as requested 2026-11-01: H.264 could not do
    # both (CRF 26 shrank but dulled, CRF 20 kept quality but grew).
    # HEVC (libx265) can: CRF 22 HEVC looks like H.264 CRF 20 at
    # roughly 25-40% smaller size. Preset "fast" keeps HEVC encode
    # time close to H.264 medium. If libx265 is missing, the code
    # falls back to H.264 CRF 20 for quality.
    "preset": "fast",
    "encoder": "libx265",
    "green_rect": {"x": 0, "y": 0, "w": 640, "h": 360},
    # Auto-detect the green area from the cover image itself, so the
    # video lands exactly on the green screen, not at a guessed 0,0.
    # Falls back to green_rect when no green area is found.
    "auto_detect_green": True,
    # Cap the final cover at 1920px wide for quality: at 1280px the
    # green-area video was downscaled to ~770px wide and lost detail.
    "output_width": 1920,
    "output_height": None,
}


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            saved = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            # Quality migration (2026-11-01): old installs saved
            # CRF 26 / 1280px, which dulled detailed videos. Move to
            # CRF 20 / 1920px so the final keeps the source's look.
            # At 1920px the green-area video stays near source
            # resolution instead of being downscaled to ~770px wide.
            if saved.get("preset") in ("ultrafast", "veryfast"):
                saved["preset"] = "medium"
            if saved.get("crf") in (20, 26):
                saved["crf"] = 22
            if saved.get("preset") in ("medium",):
                saved["preset"] = "fast"
            if "encoder" not in saved:
                saved["encoder"] = "libx265"
            if "default_flip" not in saved:
                saved["default_flip"] = True
            if "fit_mode" not in saved:
                saved["fit_mode"] = "cover"
            if "profiles" not in saved or not isinstance(saved.get("profiles"), dict):
                saved["profiles"] = {}
            for k, v in [("manual_speed", 1.0), ("manual_flip", True),
                         ("manual_voice_enabled", True),
                         ("manual_voice_pitch_factor", 1.05),
                         ("manual_fit_mode", "cover")]:
                if k not in saved:
                    saved[k] = v
            if saved.get("output_width") in (1280,):
                saved["output_width"] = 1920
            merged = dict(DEFAULT_SETTINGS)
            merged.update(saved)
            green = dict(DEFAULT_SETTINGS["green_rect"])
            green.update(saved.get("green_rect", {}))
            merged["green_rect"] = green
            return merged
        except (ValueError, OSError):
            pass
    return dict(DEFAULT_SETTINGS)


def effective_settings() -> dict:
    """Defaults actually used by Auto / Manual / Group: the Active
    preset's values, or the first preset if none is marked Active,
    or the built-in defaults if there are no presets at all."""
    settings = load_settings()
    profiles = settings.get("profiles") or {}
    if not profiles:
        return settings
    active = settings.get("active_preset") or ""
    if active in profiles:
        preset = profiles[active]
        active_name = active
    else:
        active_name = next(iter(profiles.keys()))
        preset = profiles[active_name]
    merged = dict(settings)
    for k, v in (preset or {}).items():
        if k not in ("profiles", "youtube_channels", "active_preset"):
            merged[k] = v
    merged["active_preset"] = active_name
    return merged


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


app = FastAPI(title="Copyright free video generator")


@app.get("/favicon.ico")
def favicon() -> "Response":
    """No favicon file is shipped, so the browser's automatic
    /favicon.ico request used to log a 404. Answer 204 instead,
    so the logs stay clean (user, 2026-11-02)."""
    from fastapi.responses import Response as _Response
    return _Response(status_code=204)


@app.on_event("startup")
def cleanup_old_jobs() -> None:
    """Delete job folders older than 24h on startup, EXCEPT jobs
    that are locally saved videos in a batch record (user,
    2026-11-01: locally saved videos must stay, with their title,
    tags and description, until they are uploaded — uploaded
    videos are already deleted at upload time, so they never
    consume space). Unrecorded test jobs still clean up."""
    # Quiet the scary-looking Windows log noise (user, 2026-11-02):
    # when the browser closes a video stream early (seek, pause,
    # switching steps, closing the preview), Windows asyncio logs
    # ConnectionResetError [WinError 10054] from its own transport
    # callback. The video file is fine and nothing failed — the
    # browser just stopped downloading a stream it no longer needs.
    # Swallow only that error; all other loop errors still surface.
    try:
        import asyncio as _asyncio
        _loop = _asyncio.get_running_loop()
        _orig_handler = _loop.get_exception_handler()

        def _quiet_reset(loop, context):
            _exc = context.get("exception")
            if isinstance(_exc, ConnectionResetError):
                return
            if _orig_handler:
                _orig_handler(loop, context)
            else:
                loop.default_exception_handler(context)

        _loop.set_exception_handler(_quiet_reset)
    except RuntimeError:
        pass
    import time as _time
    now = _time.time()
    protected = set()
    for source in (GROUPS_DIR,):
        if not source.exists():
            continue
        for path in source.glob("*.json"):
            try:
                g = json.loads(path.read_text(encoding="utf-8"))
            except ValueError:
                continue
            for it in g.get("items") or []:
                if it.get("status") in ("done_local", "failed_upload") and it.get("job_id"):
                    protected.add(it["job_id"])
    if RECORDS_FILE.exists():
        try:
            for rec in json.loads(RECORDS_FILE.read_text(encoding="utf-8")) or []:
                for it in rec.get("items") or []:
                    if it.get("status") in ("done_local", "failed_upload") and it.get("job_id"):
                        protected.add(it["job_id"])
        except ValueError:
            pass
    for directory in JOBS_DIR.iterdir():
        if not directory.is_dir():
            continue
        if directory.name in protected:
            continue
        try:
            age = now - directory.stat().st_mtime
        except OSError:
            continue
        if age > 24 * 3600:
            import shutil as _shutil
            _shutil.rmtree(directory, ignore_errors=True)


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


@app.delete("/api/covers/{cover_id}")
def delete_cover(cover_id: str) -> dict:
    """Delete one uploaded cover by its id (from the thumbnail grid)."""
    matches = list(COVERS_DIR.glob(f"{cover_id}_*.*")) or list(COVERS_DIR.glob(f"{cover_id}.*"))
    if not matches:
        raise HTTPException(404, "Cover not found.")
    matches[0].unlink()
    return {"deleted": cover_id, "filename": matches[0].name}


def fetch_original_info(url: str) -> dict:
    """Return the source video's original title, description, tags
    and uploader via yt-dlp, without downloading. Never fails the
    download: on any error it returns empty fields, and the caller
    just shows nothing instead of blocking the video."""
    try:
        import yt_dlp
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
            info = ydl.extract_info(url, download=False) or {}
        return {
            "original_title": info.get("title") or "",
            "original_description": info.get("description") or "",
            "original_tags": list(info.get("tags") or []),
            "original_uploader": info.get("uploader") or "",
        }
    except Exception:
        pass
    try:
        proc = subprocess.run(["yt-dlp", "-J", "--no-warnings", url],
                              capture_output=True, text=True, timeout=60)
        if proc.returncode == 0:
            info = json.loads(proc.stdout or "{}")
            return {
                "original_title": info.get("title") or "",
                "original_description": info.get("description") or "",
                "original_tags": list(info.get("tags") or []),
                "original_uploader": info.get("uploader") or "",
            }
    except Exception:
        pass
    return {"original_title": "", "original_description": "",
            "original_tags": [], "original_uploader": ""}


# ---------------------------------------------------------------- download
def _fmt_duration(seconds: float) -> str:
    """Minutes + seconds, never seconds-only (user, 2026-11-01):
    73 -> '1 minute 13 seconds', not '73 seconds'."""
    s = int(round(seconds))
    if s < 60:
        return f"{s} second" if s == 1 else f"{s} seconds"
    m, r = divmod(s, 60)
    min_part = f"{m} minute" if m == 1 else f"{m} minutes"
    if r == 0:
        return min_part
    return f"{min_part} {r} second" if r == 1 else f"{min_part} {r} seconds"


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
    job.update(fetch_original_info(url))
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
            "detail": f"{size_mb:.1f} MB in {_fmt_duration(dur)} (avg {avg:.1f} MB/s)",
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


# ------------------------------------------------------------------ auto
class AutoRequest(BaseModel):
    url: str = Field(..., min_length=8)
    cover_id: str | None = None


def _run_auto(job_id: str, url: str, cover_id: str | None, settings_override: dict | None = None) -> None:
    """Auto mode: download -> apply admin defaults -> compress -> preview.

    The user only gives a download link. Everything else comes from
    Admin defaults (speed, voice, pitch, encoder, CRF, preset, green
    auto-detect) and the selected cover (or the newest cover). The
    frontend blurs the page and shows a popup with one overall
    progress bar and a timeline; this thread writes auto_stage,
    auto_progress and, at the end, auto_summary to job.json, which
    the popup polls. Summary sizes, in order:
      downloaded: the YouTube source as downloaded
      applied: after cover + voice + speed + shape are applied,
        encoded at high quality (H.264 CRF 18, not yet compressed)
      final: after the admin compression (HEVC CRF 22 by default)
    The intermediate applied file is deleted after compression, so
    only the final (and preview) remain, like normal jobs.
    """
    import time as _time
    directory = job_dir(job_id)
    source = directory / "source.mp4"
    applied_path = directory / "applied.mp4"
    final_path = directory / "final.mp4"
    preview_path = directory / "preview.mp4"
    timeline: list[dict] = []

    def _set(stage: str, pct: float, extra: dict | None = None) -> None:
        job = read_job(job_id)
        job.update({"auto": True, "auto_stage": stage, "auto_progress": pct})
        if extra:
            job.update(extra)
        write_job(job)

    _set("downloading", 0, {"status": "downloading", "url": url, "timeline": timeline,
                            **fetch_original_info(url)})
    # --- Stage 1: download (same yt-dlp settings as manual download)
    dl_start = _time.time()
    try:
        import yt_dlp
        def hook(d: dict) -> None:
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0) or 0
            pct = round(downloaded * 100 / total, 1) if total else 0
            _set("downloading", round(pct * 0.25, 1))
        opts = {
            "format": "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b",
            "merge_output_format": "mp4",
            "concurrent_fragment_downloads": 8,
            "outtmpl": str(source),
            "progress_hooks": [hook],
            "quiet": True, "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as exc:  # noqa: BLE001
        _set("failed", 0, {"status": "failed", "error": str(exc)[-2000:]})
        return
    if not source.exists():
        _set("failed", 0, {"status": "failed", "error": "Download finished but no file was created."})
        return
    downloaded_mb = source.stat().st_size / 1024 / 1024
    timeline.append({"step": "YouTube download", "duration_sec": round(_time.time() - dl_start, 1),
                     "detail": f"{downloaded_mb:.1f} MB"})
    # --- Cover + admin defaults (or a preset's Auto + shared settings,
    # when this job is part of a group task with a preset per video)
    settings = effective_settings()
    if settings_override:
        for k in ("default_speed", "default_flip", "fit_mode", "voice_enabled",
                  "voice_pitch_factor", "encoder", "crf", "preset",
                  "green_rect", "auto_detect_green"):
            if k in settings_override:
                settings[k] = settings_override[k]
    cover = None
    if cover_id:
        matches = list(COVERS_DIR.glob(f"{cover_id}_*.*")) or list(COVERS_DIR.glob(f"{cover_id}.*"))
        cover = matches[0] if matches else None
    if cover is None:
        covers = sorted([p for p in COVERS_DIR.iterdir() if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}],
                        key=lambda p: p.stat().st_mtime, reverse=True)
        cover = covers[0] if covers else None
    if cover is None:
        _set("failed", 0, {"status": "failed", "error": "Auto needs a cover: upload a cover first, then start Auto."})
        return
    green_rect = settings.get("green_rect") or {"x": 0, "y": 0, "w": 640, "h": 360}
    if settings.get("auto_detect_green", True):
        detected = video.detect_green_rect(cover)
        if detected:
            green_rect = detected
    speed = float(settings.get("default_speed", 1.0))
    voice_enabled = bool(settings.get("voice_enabled", True))
    pitch = float(settings.get("voice_pitch_factor", 1.05))
    # --- Stage 2: apply everything, high quality (not yet compressed)
    _set("applying", 25, {"status": "processing", "timeline": timeline})
    apply_start = _time.time()
    cmd = video.build_process_command(
        source, cover, applied_path, green_rect,
        flip=bool(settings.get("default_flip", True)), speed=speed, voice_enabled=voice_enabled, fit_mode=str(settings.get("fit_mode", "cover")),
        voice_pitch_factor=pitch, crf=18, preset="medium",
        output_width=settings.get("output_width"),
        output_height=settings.get("output_height"),
        zoom=1.0, pan_x=0.0, pan_y=0.0,
        mask_path=None,
    )
    # Mask for shape accuracy, built from the cover itself.
    try:
        mask_img = video.green_mask(cover)
        if mask_img is not None:
            mask_path = directory / "green_mask.png"
            mask_img.save(mask_path)
            cmd = video.build_process_command(
                source, cover, applied_path, green_rect,
                flip=bool(settings.get("default_flip", True)), speed=speed, voice_enabled=voice_enabled, fit_mode=str(settings.get("fit_mode", "cover")),
                voice_pitch_factor=pitch, crf=18, preset="medium",
                output_width=settings.get("output_width"),
                output_height=settings.get("output_height"),
                zoom=1.0, pan_x=0.0, pan_y=0.0,
                mask_path=mask_path, output_duration=None,
            )
            # Masked encode needs -t (see video.py): duration / speed.
            dur = video.get_duration(source)
            if dur:
                dur = dur / max(0.5, min(2.0, speed))
                cmd = cmd[:-1] + ["-t", str(dur), cmd[-1]]
    except Exception:
        pass
    # Use run_with_progress directly: apply maps 25-70, compress 70-90.
    ok, out = video.run_with_progress(cmd, video.get_duration(source), 0, 100,
                                      on_progress=lambda p, e, eta: _set("applying", round(25 + p * 0.45, 1)))
    if not ok or not applied_path.exists():
        _set("failed", 0, {"status": "failed", "error": f"Auto apply step failed:\n{out}"[-2000:]})
        return
    applied_mb = applied_path.stat().st_size / 1024 / 1024
    timeline.append({"step": "Apply cover + voice + speed + shape (admin defaults)",
                     "duration_sec": round(_time.time() - apply_start, 1),
                     "detail": f"{applied_mb:.1f} MB"})
    # --- Stage 3: compress with admin encoder/CRF/preset
    _set("compressing", 70, {"status": "processing", "timeline": timeline})
    comp_start = _time.time()
    encoder = str(settings.get("encoder", "libx265"))
    crf = int(settings.get("crf", 22))
    preset = str(settings.get("preset", "fast"))
    if encoder == "libx265" and not video.encoder_available("libx265"):
        encoder = "libx264"
        crf = 20
    comp_cmd = ["ffmpeg", "-y", "-i", str(applied_path),
                "-c:v", encoder, "-crf", str(crf), "-preset", preset,
                "-pix_fmt", "yuv420p", "-c:a", "copy",
                "-movflags", "+faststart"]
    if encoder == "libx265":
        comp_cmd += ["-tag:v", "hvc1"]
    comp_cmd += [str(final_path)]
    ok, out = video.run_with_progress(comp_cmd, video.get_duration(source), 0, 100,
                                      on_progress=lambda p, e, eta: _set("compressing", round(70 + p * 0.20, 1)))
    if not ok or not final_path.exists():
        _set("failed", 0, {"status": "failed", "error": f"Auto compress step failed:\n{out}"[-2000:]})
        return
    final_mb = final_path.stat().st_size / 1024 / 1024
    timeline.append({"step": f"Compress ({encoder}, CRF {crf}, preset {preset})",
                     "duration_sec": round(_time.time() - comp_start, 1),
                     "detail": f"{final_mb:.1f} MB"})
    try:
        applied_path.unlink()
    except OSError:
        pass
    # --- Stage 4: preview (H.264, browser-playable, like normal jobs)
    _set("preview", 90, {"status": "processing", "timeline": timeline})
    video.run_with_progress(video.build_preview_command(final_path, preview_path),
                            video.get_duration(source), 0, 100,
                            on_progress=lambda p, e, eta: _set("preview", round(90 + p * 0.10, 1)))
    summary = {
        "downloaded_mb": round(downloaded_mb, 1),
        "applied_mb": round(applied_mb, 1),
        "final_mb": round(final_mb, 1),
        "saved_mb": round(applied_mb - final_mb, 1),
        "saved_pct": round((applied_mb - final_mb) / applied_mb * 100, 1) if applied_mb else 0,
        "encoder": encoder, "crf": crf,
    }
    _set("done", 100, {"status": "processed", "timeline": timeline,
                       "auto_summary": summary, "cover_id": cover_id,
                       "process_progress": 100, "process_stage": "Done"})


@app.post("/api/auto")
def auto_video(payload: AutoRequest) -> dict:
    if not yt_dlp_available():
        raise HTTPException(400, "yt-dlp was not found. Install it with 'pip install yt-dlp' and retry.")
    job_id = uuid.uuid4().hex[:12]
    directory = job_dir(job_id)
    threading.Thread(target=_run_auto, args=(job_id, payload.url, payload.cover_id),
                     daemon=True).start()
    return {"job_id": job_id, "status": "downloading", "auto": True}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    """Download progress for the frontend progress bar."""
    return read_job(job_id)


# ----------------------------------------------------------------- group auto
class GroupItemRequest(BaseModel):
    url: str = Field(..., min_length=8)
    preset_name: str | None = None
    cover_id: str | None = None
    upload: str = "skip"  # skip | public | private | unlisted


class GroupRequest(BaseModel):
    name: str = "Group 1"
    items: list[GroupItemRequest] = Field(..., min_length=1)


def _read_group(group_id: str) -> dict | None:
    path = GROUPS_DIR / f"{group_id}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        return None


def _write_group(group: dict) -> None:
    (GROUPS_DIR / f"{group['id']}.json").write_text(
        json.dumps(group, indent=2), encoding="utf-8")


# ---------------------------------------------------------------- records
# Batch history (user, 2026-11-01): every Group batch is a record
# with its videos, their saved title/description/tags, and which
# videos are uploaded vs still saved locally. Uploaded videos keep
# only the history entry + YouTube link — their local file is
# deleted at upload time, so they use no local space. Locally
# saved videos keep their download link and are protected from
# the 24h cleanup above.
def _read_records() -> list:
    if not RECORDS_FILE.exists():
        return []
    try:
        return json.loads(RECORDS_FILE.read_text(encoding="utf-8")) or []
    except ValueError:
        return []


def _write_records(records: list) -> None:
    RECORDS_FILE.write_text(json.dumps(records, indent=2), encoding="utf-8")


def _group_to_record(group: dict) -> dict:
    items = []
    for it in group.get("items") or []:
        status = it.get("status") or "waiting"
        local = status in ("done_local", "failed_upload")
        items.append({
            "url": it.get("url") or "",
            "title": it.get("title") or it.get("generated_title") or it.get("original_title") or it.get("url") or "",
            "original_title": it.get("original_title") or "",
            "generated_title": it.get("generated_title") or "",
            "generated_description": it.get("generated_description") or "",
            "generated_tags": it.get("generated_tags") or [],
            "preset_name": it.get("preset_name") or "",
            "upload": it.get("upload") or "skip",
            "status": status,
            "youtube_url": it.get("youtube_url") or "",
            "youtube_video_id": it.get("youtube_video_id") or "",
            # Uploaded = file deleted, no download link, no space.
            # Local = download link only while the file still exists.
            "download_url": (f"/api/download/{it['job_id']}"
                             if local and it.get("job_id")
                             and (JOBS_DIR / it["job_id"] / "final.mp4").exists()
                             else ""),
            "job_id": it.get("job_id") or "",
            "error": it.get("error") or "",
        })
    return {
        "id": group.get("id") or "",
        "name": group.get("name") or "Group 1",
        "created_at": group.get("created_at") or "",
        "finished_at": (datetime.datetime.now().isoformat(timespec="seconds")
                        if group.get("status") == "done" else ""),
        "status": group.get("status") or "running",
        "total": len(items),
        "uploaded": sum(1 for i in items if i["status"] == "uploaded"),
        "local": sum(1 for i in items if i["status"] in ("done_local", "failed_upload")),
        "failed": sum(1 for i in items if i["status"] == "failed"),
        "items": items,
    }


def _upsert_group_record(group: dict) -> None:
    records = _read_records()
    record = _group_to_record(group)
    records = [r for r in records if r.get("id") != record["id"]]
    records.append(record)
    records.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    _write_records(records)


def _run_group(group_id: str) -> None:
    """Run a group task sequentially, one video at a time.

    Each video: download -> apply its preset (or Admin Auto defaults)
    -> compress -> preview -> generate metadata -> then either save
    locally (upload=skip, final file stays for later download) or
    upload to YouTube with its chosen privacy (public / private /
    unlisted). A failed video does not stop the rest of the group.
    Uploaded videos have their working files deleted, like a normal
    upload; skipped / failed-upload videos keep their final file.
    """
    group = _read_group(group_id)
    if not group:
        return
    group["status"] = "running"
    _write_group(group)
    settings = effective_settings()
    profiles = settings.get("profiles") or {}
    for idx, item in enumerate(group["items"]):
        group["current_index"] = idx
        item["status"] = "processing"
        _write_group(group)
        job_id = uuid.uuid4().hex[:12]
        item["job_id"] = job_id
        _write_group(group)
        # Create the job record first, so _run_auto can update it.
        job_dir(job_id)
        write_job({"id": job_id, "status": "downloading", "url": item["url"]})
        preset = None
        if item.get("preset_name") and item["preset_name"] in profiles:
            preset = profiles[item["preset_name"]]
        try:
            _run_auto(job_id, item["url"], item.get("cover_id"), settings_override=preset)
        except Exception as exc:  # noqa: BLE001
            item["status"] = "failed"
            item["error"] = str(exc)[-1000:]
            _write_group(group)
            continue
        job = read_job(job_id)
        if job.get("status") != "processed":
            item["status"] = "failed"
            item["error"] = (job.get("error") or "Processing failed.")[-1000:]
            _write_group(group)
            continue
        # Generated metadata, like Auto done in the frontend.
        try:
            gen = local_metadata.generate_metadata(
                job.get("original_title", ""), job.get("original_description", ""),
                job.get("original_tags") or [], variant=0)
            job.update(gen)
            write_job(job)
            item["title"] = gen.get("generated_title") or job.get("original_title") or item["url"]
            # Saved for Records: locally saved videos keep their
            # full title, description and tags, not just the title.
            item["generated_title"] = gen.get("generated_title") or ""
            item["generated_description"] = gen.get("generated_description") or ""
            item["generated_tags"] = gen.get("generated_tags") or []
            item["original_title"] = job.get("original_title") or ""
        except Exception:
            item["title"] = job.get("original_title") or item["url"]
            item["original_title"] = job.get("original_title") or ""
        upload = item.get("upload") or "skip"
        if upload == "skip":
            item["status"] = "done_local"
            item["download_url"] = f"/api/download/{job_id}"
            _write_group(group)
            continue
        # Upload with the chosen privacy: public, private, or unlisted
        # (unlisted = only people with the link can watch, not in search).
        if upload not in ("public", "private", "unlisted"):
            upload = "private"
        try:
            final_path = job_dir(job_id) / "final.mp4"
            result = youtube_upload.upload_video(
                final_path,
                title=job.get("generated_title") or job.get("original_title") or "Video",
                description=job.get("generated_description") or "",
                tags=", ".join(job.get("generated_tags") or []),
                privacy_status=upload,
            )
            item["status"] = "uploaded"
            item["youtube_video_id"] = result.get("video_id")
            item["youtube_url"] = f"https://www.youtube.com/watch?v={result.get('video_id')}" if result.get("video_id") else ""
            _write_group(group)
            shutil.rmtree(job_dir(job_id), ignore_errors=True)
        except Exception as exc:  # noqa: BLE001
            item["status"] = "failed_upload"
            item["error"] = str(exc)[-1000:]
            item["download_url"] = f"/api/download/{job_id}"
            _write_group(group)
            continue
    group["status"] = "done"
    group["current_index"] = None
    _write_group(group)
    _upsert_group_record(group)


@app.post("/api/groups")
def create_group(payload: GroupRequest) -> dict:
    if not yt_dlp_available():
        raise HTTPException(400, "yt-dlp was not found. Install it with 'pip install yt-dlp' and retry.")
    group_id = uuid.uuid4().hex[:12]
    group = {
        "id": group_id,
        "name": payload.name or "Group 1",
        "created_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "status": "running",
        "current_index": 0,
        "items": [
            {"url": it.url, "preset_name": it.preset_name, "cover_id": it.cover_id,
             "upload": it.upload or "skip", "status": "waiting", "job_id": None}
            for it in payload.items
        ],
    }
    _write_group(group)
    threading.Thread(target=_run_group, args=(group_id,), daemon=True).start()
    return group


@app.get("/api/groups")
def list_groups() -> dict:
    groups = []
    for path in sorted(GROUPS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        g = _read_group(path.stem)
        if g:
            groups.append({"id": g["id"], "name": g["name"], "status": g["status"],
                           "total": len(g["items"]),
                           "done": sum(1 for it in g["items"] if it["status"] in ("done_local", "uploaded", "failed", "failed_upload"))})
    return {"groups": groups}


@app.get("/api/records")
def list_records(page: int = 1, per_page: int = 10) -> dict:
    """Batch history, paginated, newest first. Only served here —
    the frontend shows it only after the Records button is clicked,
    never automatically. Merges records.json with groups on disk,
    so batches processed before Records existed also appear, and a
    running group's latest status is shown even before it is done."""
    by_id = {r["id"]: r for r in _read_records() if r.get("id")}
    for path in sorted(GROUPS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        g = _read_group(path.stem)
        if not g:
            continue
        if g["id"] not in by_id or by_id[g["id"]].get("status") != g.get("status"):
            by_id[g["id"]] = _group_to_record(g)
    records = sorted(by_id.values(), key=lambda r: r.get("created_at") or "", reverse=True)
    total = len(records)
    per_page = min(max(per_page, 1), 50)
    total_pages = max(1, (total + per_page - 1) // per_page)
    page = min(max(page, 1), total_pages)
    start = (page - 1) * per_page
    return {"total": total, "page": page, "per_page": per_page,
            "total_pages": total_pages, "records": records[start:start + per_page]}


class RecordUploadItem(BaseModel):
    batch_id: str
    job_id: str
    title: str = ""
    description: str = ""
    tags: str = ""


class RecordUploadRequest(BaseModel):
    items: list[RecordUploadItem] = Field(..., min_length=1)
    privacy_status: str = "private"


@app.post("/api/records/upload")
def upload_records(payload: RecordUploadRequest) -> dict:
    """Upload locally saved batch videos to YouTube, directly from
    Records (user, 2026-11-01): select videos that are still saved
    locally and not uploaded yet, and upload them without going
    through the Manual wizard. Uses each video's saved title,
    description and tags. Uploaded videos have their local file
    deleted (space freed) and their group + record updated to
    'uploaded' with the YouTube link; failed items stay local so
    they can be retried, and do not stop the rest."""
    privacy = payload.privacy_status if payload.privacy_status in ("public", "private", "unlisted") else "private"
    results = []
    for item in payload.items:
        final_path = job_dir(item.job_id) / "final.mp4"
        if not final_path.exists():
            results.append({"batch_id": item.batch_id, "job_id": item.job_id,
                            "status": "failed", "error": "Local file not found — it may have been deleted already."})
            continue
        try:
            result = youtube_upload.upload_video(
                final_path,
                title=item.title or "Video",
                description=item.description or "",
                tags=item.tags or "",
                privacy_status=privacy,
            )
            youtube_url = f"https://www.youtube.com/watch?v={result.get('video_id')}" if result.get("video_id") else ""
            shutil.rmtree(job_dir(item.job_id), ignore_errors=True)
            # Update the group file, then the record, so Records
            # and the group list both show this video as uploaded.
            group = _read_group(item.batch_id)
            if group:
                for it in group.get("items") or []:
                    if it.get("job_id") == item.job_id:
                        it["status"] = "uploaded"
                        it["youtube_video_id"] = result.get("video_id") or ""
                        it["youtube_url"] = youtube_url
                        it["error"] = ""
                _write_group(group)
                _upsert_group_record(group)
            results.append({"batch_id": item.batch_id, "job_id": item.job_id,
                            "status": "uploaded", "youtube_url": youtube_url})
        except Exception as exc:  # noqa: BLE001
            results.append({"batch_id": item.batch_id, "job_id": item.job_id,
                            "status": "failed", "error": str(exc)[-1000:]})
    return {"results": results,
            "uploaded": sum(1 for r in results if r["status"] == "uploaded"),
            "failed": sum(1 for r in results if r["status"] != "uploaded")}


@app.get("/api/groups/{group_id}")
def get_group(group_id: str) -> dict:
    group = _read_group(group_id)
    if not group:
        raise HTTPException(404, "Group not found.")
    # Attach live progress for the currently processing item.
    for item in group["items"]:
        if item.get("job_id") and item["status"] == "processing":
            job = read_job(item["job_id"])
            item["progress"] = job.get("auto_progress") or job.get("process_progress") or 0
            item["stage"] = job.get("auto_stage") or job.get("process_stage") or ""
    return group


class VideoInfoRequest(BaseModel):
    url: str


@app.post("/api/video-info")
def video_info(payload: VideoInfoRequest) -> dict:
    """Title (and uploader) for one YouTube link, without downloading.

    Used by Group Auto Build list (user, 2026-11-01): rows must show
    "Video 1: <title>" — not just "Video 1" or a bare URL, which
    tells the user nothing about which video gets which preset.
    Never fails: on any yt-dlp error the title is empty and the
    frontend falls back to showing the URL."""
    info = fetch_original_info(payload.url)
    return {"url": payload.url, "title": info.get("original_title", ""),
            "uploader": info.get("original_uploader", "")}


class GenerateMetadataRequest(BaseModel):
    job_id: str
    variant: int = 0


@app.post("/api/generate-metadata")
def generate_metadata_endpoint(payload: GenerateMetadataRequest) -> dict:
    """Generate a NEW, copyright-safe title, description and tags
    from the job's original metadata — locally, free, no AI API.
    Stored in job.json so it shows with the final video, and the
    user can edit it in the Upload step before publishing."""
    job = read_job(payload.job_id)
    if not job or job.get("status") == "unknown":
        raise HTTPException(404, "Job not found.")
    gen = local_metadata.generate_metadata(
        job.get("original_title", ""), job.get("original_description", ""),
        job.get("original_tags") or [], variant=payload.variant or 0)
    job.update(gen)
    write_job(job)
    return {"job_id": payload.job_id, **gen}


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str) -> dict:
    """Delete all local working files for one job (source, final, preview)."""
    directory = JOBS_DIR / job_id
    if not directory.exists():
        raise HTTPException(404, "Job not found.")
    shutil.rmtree(directory, ignore_errors=True)
    return {"deleted": job_id}


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


@app.get("/api/green-mask/{cover_id}")
def green_mask_endpoint(cover_id: str, x: int | None = None, y: int | None = None,
                        w: int | None = None, h: int | None = None):
    """Green-shape mask for one cover, cropped to its green rectangle.

    White = green area, black = rest. The live preview uses this as
    a CSS mask-image on the green box, so the live video is clipped
    to the green shape exactly like the final FFmpeg alphamerge.
    If no green area is found, a plain white rectangle is returned,
    so the preview behaves as before (rectangle video).
    """
    from io import BytesIO
    from fastapi.responses import Response
    matches = list(COVERS_DIR.glob(f"{cover_id}_*.*")) or list(COVERS_DIR.glob(f"{cover_id}.*"))
    if not matches:
        raise HTTPException(404, "Cover not found.")
    mask = video.green_mask(matches[0])
    if mask is None:
        raise HTTPException(404, "Mask could not be built.")
    rect = None
    if x is not None and y is not None and w and h:
        rect = {"x": x, "y": y, "w": w, "h": h}
    else:
        rect = video.detect_green_rect(matches[0])
    if rect:
        mask = mask.crop((rect["x"], rect["y"],
                          rect["x"] + rect["w"], rect["y"] + rect["h"]))
    # FIX (user, 2026-11-01): if the rectangle does not actually
    # contain green — e.g. a stale/default 0,0 640x360 rectangle on
    # a cover whose green area is on the right — the cropped mask
    # is almost all black, so the live video is hidden completely
    # and the user cannot test anything. In that case fall back to
    # a plain white rectangle: the video shows as a rectangle in
    # the green box (testable), instead of vanishing silently.
    # The final encode still uses the real green mask, so this
    # fallback only affects the live preview.
    if mask.size[0] and mask.size[1]:
        _hist = mask.histogram()
        _white = _hist[255] if len(_hist) > 255 else 0
        _total = mask.size[0] * mask.size[1]
        if _total and _white / _total < 0.05:
            from PIL import Image as _WhiteImage
            mask = _WhiteImage.new("L", mask.size, 255)
    # BUG FIX (2026-11-01, live video still looked rectangular):
    # the old endpoint returned a grayscale (L) PNG. Browsers' CSS
    # mask-image defaults to alpha, not luminance, so a grayscale
    # mask with no alpha channel was ignored and the video stayed
    # a rectangle. Return RGBA instead: white with alpha = mask
    # (white = visible, black = transparent), so the mask works
    # in Chrome/Edge/Firefox without relying on luminance mode.
    from PIL import Image as _Image
    rgba = _Image.new("RGBA", mask.size, (255, 255, 255, 255))
    rgba.putalpha(mask)
    buf = BytesIO()
    rgba.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


class ProcessRequest(BaseModel):
    job_id: str
    cover_id: str
    flip: bool | None = None
    speed: float | None = None
    voice_pitch: float | None = None
    compress: bool = True
    zoom: float | None = None
    pan_x: float | None = None
    pan_y: float | None = None
    green_rect: dict | None = None
    fit_mode: str | None = None


def _run_process(payload: ProcessRequest, settings: dict, directory,
                 source, cover, final_path, preview_path,
                 speed, voice_enabled, pitch, green_rect, zoom, pan_x, pan_y) -> None:
    import time as _time
    started = _time.time()
    preview_started = [None]

    def _append_log(line: str) -> None:
        job = read_job(payload.job_id)
        log = job.get("process_log") or []
        elapsed = _time.time() - started
        log.append(f"[{int(elapsed // 60):02d}:{int(elapsed % 60):02d}] {line}")
        job["process_log"] = log[-200:]
        write_job(job)

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
        preset=str(settings.get("preset", "fast")),
        encoder=str(settings.get("encoder", "libx265")),
        output_width=settings.get("output_width"),
        output_height=settings.get("output_height"),
        zoom=zoom, pan_x=pan_x, pan_y=pan_y,
        fit_mode=payload.fit_mode or str(settings.get("manual_fit_mode", "cover")),
        on_progress=on_progress, on_log=_append_log,
    )
    job = read_job(payload.job_id)
    ended = _time.time()
    prev_timeline = [t for t in (job.get("timeline") or [])
                     if not str(t.get("step", "")).startswith("Final video encode")
                     and not str(t.get("step", "")).startswith("Preview encode")]
    if ok and final_path.exists():
        pv_start = preview_started[0] or ended
        prev_timeline.append({
            "step": "Final video encode ("
                    f"{'HEVC libx265' if settings.get('encoder', 'libx265') == 'libx265' else 'libx264'}, "
                    f"preset {settings.get('preset', 'fast')}, "
                    f"CRF {settings.get('crf', 22)}, max width "
                    f"{settings.get('output_width', 1920)}px)",
            "duration_sec": round(pv_start - started, 1),
            "detail": f"Source {source.stat().st_size / 1024 / 1024:.1f} MB → "
                      f"final {final_path.stat().st_size / 1024 / 1024:.1f} MB"
                      if source.exists() else "",
        })
        prev_timeline.append({
            "step": "Preview encode (720px, veryfast preset)",
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
        "fit_mode": payload.fit_mode or str(settings.get("manual_fit_mode", "cover")),
        "speed": speed,
        "voice_pitch": pitch,
        "compress": payload.compress,
        "zoom": zoom,
        "pan_x": pan_x, "pan_y": pan_y,
        "green_rect_used": green_rect,
        "error": None if ok else message,
    })
    write_job(job)


@app.post("/api/process")
def process_video(payload: ProcessRequest) -> dict:
    settings = effective_settings()
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

    if payload.flip is None:
        payload.flip = bool(settings.get("default_flip", True))
    speed = payload.speed if payload.speed is not None else settings["default_speed"]
    voice_enabled = bool(settings.get("voice_enabled", True))
    pitch = payload.voice_pitch
    if pitch is None:
        pitch = float(settings.get("voice_pitch_factor", 1.05))
    # FIX (user, 2026-11-02): zoom used to be clamped to a minimum
    # of 1.0 here, while live preview allows 0.5x–2.0x — so a video
    # processed at 0.7x came out at 1.0x and looked different from
    # live. Now the clamp matches live and video.py (0.5x–2.0x),
    # and pan is forced to 0 at zoom <= 1, exactly like the live
    # preview's clampPan().
    zoom = payload.zoom if payload.zoom is not None else 1.0
    zoom = max(0.5, min(2.0, float(zoom)))
    if zoom <= 1.0:
        pan_x, pan_y = 0.0, 0.0
    else:
        max_pan = (zoom - 1) / 2 * 100
        pan_x = max(-max_pan, min(max_pan, float(payload.pan_x or 0)))
        pan_y = max(-max_pan, min(max_pan, float(payload.pan_y or 0)))
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
                "green_rect_used": green_rect, "green_source": green_source,
                "process_log": [
                    "[00:00] Starting processing…",
                    f"[00:00] Green area ({green_source}): x={green_rect.get('x')}, y={green_rect.get('y')}, w={green_rect.get('w')}, h={green_rect.get('h')}",
                    f"[00:00] Cover file: {cover.name}",
                    f"[00:00] Source file: source.mp4 ({source.stat().st_size / 1024 / 1024:.1f} MB)",
                ]})
    write_job(job)
    threading.Thread(target=_run_process, args=(
        payload, settings, directory, source, cover, final_path, preview_path,
        speed, voice_enabled, pitch, green_rect, zoom, pan_x, pan_y), daemon=True).start()
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
    directory = job_dir(job_id)
    path = directory / "final.mp4"
    if not path.exists():
        raise HTTPException(404, "Final video not ready yet. Process a video first.")

    def _delete_source_and_preview() -> None:
        # Save space after the final download: the downloaded copy is
        # in the user's Downloads folder, and the final video stays
        # here for YouTube upload. Only the bulky source and the
        # redundant preview are removed (after the response is sent).
        for name in ("source.mp4", "preview.mp4"):
            try:
                (directory / name).unlink()
            except OSError:
                pass

    return FileResponse(
        path, media_type="video/mp4", filename=f"covered-{job_id}.mp4",
        background=BackgroundTask(_delete_source_and_preview),
    )


# ------------------------------------------------------------ youtube api
@app.get("/api/youtube/status")
def get_youtube_status() -> dict:
    status = youtube_upload.youtube_status()
    # Configured channels (Admin) always show, even before Google
    # sign-in, merged with API channels when connected.
    configured = []
    for ch in load_settings().get("youtube_channels") or []:
        if isinstance(ch, dict) and ch.get("id"):
            configured.append({"id": ch["id"], "title": ch.get("title") or ch["id"],
                               "configured": True})
    api_channels = []
    if status["connected"]:
        try:
            api_channels = youtube_upload.list_channels()
        except Exception as exc:  # keep the page usable on API errors
            status["message"] = f"Connected, but channel list failed: {exc}"
    seen = set()
    merged = []
    for ch in configured + api_channels:
        if ch["id"] not in seen:
            seen.add(ch["id"])
            merged.append(ch)
    status["channels"] = merged
    status["configured_channels"] = configured
    return status


class YoutubeCredentialsRequest(BaseModel):
    client_id: str
    client_secret: str


@app.post("/api/youtube/connect-start")
def start_youtube_connect() -> dict:
    """One-click YouTube connect (user, 2026-11-01): the tool
    installs the Google libraries itself and runs the sign-in flow
    in the background. The frontend opens the returned auth_url in
    a new tab; the user only signs in with Google — no terminal,
    no pip, no script, no restart."""
    try:
        return youtube_upload.start_connect()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))


@app.get("/api/youtube/connect-status")
def get_youtube_connect_status() -> dict:
    """Polling state for the one-click connect flow."""
    return youtube_upload.connect_status()


@app.post("/api/youtube/disconnect")
def disconnect_youtube() -> dict:
    """Remove the saved Google sign-in so another account can connect."""
    return youtube_upload.disconnect()


@app.post("/api/youtube/credentials")
def save_youtube_credentials(payload: YoutubeCredentialsRequest) -> dict:
    """Save Google OAuth credentials to client_secrets.json (local,
    gitignored, never pushed). The file format is the Desktop-app
    format Google Cloud downloads: {"installed": {client_id,
    client_secret, ...}}. After saving, press Connect YouTube
    account in Admin — the tool does the sign-in itself."""
    if not payload.client_id.strip() or not payload.client_secret.strip():
        raise HTTPException(400, "Client ID and Client Secret are both required.")
    data = {
        "installed": {
            "client_id": payload.client_id.strip(),
            "client_secret": payload.client_secret.strip(),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "redirect_uris": ["http://localhost"],
        }
    }
    youtube_upload.client_secrets_path().write_text(
        json.dumps(data, indent=2), encoding="utf-8")
    return {"saved": True, "path": str(youtube_upload.client_secrets_path())}


class UploadRequest(BaseModel):
    job_id: str
    title: str
    description: str = ""
    tags: str = ""
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
            tags=payload.tags or "",
            privacy_status=payload.privacy_status or "private",
        )
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"YouTube upload failed: {exc}")
    # Uploaded copy is now on YouTube — delete all local files for
    # this job so nothing accumulates on disk.
    shutil.rmtree(job_dir(payload.job_id), ignore_errors=True)
    return {"job_id": payload.job_id, "status": "uploaded",
            "local_files_deleted": True, **result}


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "ffmpeg": video.check_ffmpeg() is None,
        "yt_dlp": yt_dlp_available(),
    }


# Frontend must be mounted last so /api/* routes win.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
