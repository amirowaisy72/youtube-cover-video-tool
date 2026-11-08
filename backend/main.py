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
from starlette.background import BackgroundTask
from pydantic import BaseModel, Field

# Allow `import video` / `import youtube_upload` when run as
# `python -m uvicorn backend.main:app` from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import video  # noqa: E402
import youtube_upload  # noqa: E402
import metadata as local_metadata  # noqa: E402
import tts as tts_module  # noqa: E402
import autovideo  # noqa: E402
import licensing  # noqa: E402
import tools_thumbnail  # noqa: E402
import tools_shorts  # noqa: E402
import tools_downloader  # noqa: E402
import tools_titles  # noqa: E402
import tools_trimmer  # noqa: E402
import tools_subtitles  # noqa: E402
import tools_keywords  # noqa: E402
import tools_inspector  # noqa: E402
import tools_seo  # noqa: E402
import tools_audio  # noqa: E402
import tools_music  # noqa: E402
import tools_script  # noqa: E402
import tools_stock  # noqa: E402
import tools_channel  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
# React SPA build (frontend-react/dist). The frontend is the Lovable
# design ported to React; the old vanilla frontend/ above is kept
# only as a fallback until the React app is built (npm run build
# in frontend-react, or `bun run build`).
REACT_BUILD_DIR = BASE_DIR / "frontend-react" / "dist"
# Local builds go to dist-local/ (gitignored) — see start.py.
# A local rebuild used to rewrite the committed dist/ files with
# new hashes, dirtying the working tree and blocking `git pull`
# (user, 2026-11-07). dist-local is served first when present.
REACT_LOCAL_BUILD_DIR = BASE_DIR / "frontend-react" / "dist-local"


def _frontend_dir() -> Path:
    """Local React build first, then the committed build, else the
    old vanilla frontend."""
    if (REACT_LOCAL_BUILD_DIR / "index.html").is_file():
        return REACT_LOCAL_BUILD_DIR
    if (REACT_BUILD_DIR / "index.html").is_file():
        return REACT_BUILD_DIR
    return FRONTEND_DIR
JOBS_DIR = BASE_DIR / "jobs"
COVERS_DIR = BASE_DIR / "covers"
GROUPS_DIR = BASE_DIR / "groups"
TTS_DIR = BASE_DIR / "tts"
AV_DIR = BASE_DIR / "autovideos"
RECORDS_FILE = BASE_DIR / "records.json"
SETTINGS_FILE = BASE_DIR / "backend" / "settings.json"

JOBS_DIR.mkdir(exist_ok=True)
COVERS_DIR.mkdir(exist_ok=True)
GROUPS_DIR.mkdir(exist_ok=True)
TTS_DIR.mkdir(exist_ok=True)
AV_DIR.mkdir(exist_ok=True)

# License/credit system (YT Guru commercial, v1.0.2): the installed
# tool charges 1 credit per video/voiceover through the license
# server. CLIENT_VERSION is sent with every license call so the
# server can refuse old builds.
CLIENT_VERSION = "1.0.3"

# Retry any license reports/refunds that failed while offline.
threading.Thread(target=licensing.flush_outbox, daemon=True).start()

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
    "crf": 20,
    # Speed (user, 2026-11-07): HEVC (libx265) renders far too slowly
    # — a 2-3 minute video took many minutes. H.264 (libx264) with
    # preset "veryfast" encodes several times faster at the same
    # visual quality (CRF 20 H.264 ≈ CRF 22 HEVC); the file is a bit
    # larger, but speed matters more than size here. HEVC is still
    # available in Admin settings if a smaller file is wanted.
    "preset": "veryfast",
    "encoder": "libx264",
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
            # Speed migration (2026-11-07): the old HEVC defaults
            # (libx265 + preset fast + CRF 22) render far too slowly.
            # Move installs still on those exact defaults to H.264 +
            # veryfast + CRF 20 (same look, several times faster, a
            # bit larger file). A deliberate HEVC choice with other
            # values is left alone.
            if (saved.get("encoder") == "libx265"
                    and saved.get("preset") == "fast"
                    and saved.get("crf") == 22):
                saved["encoder"] = "libx264"
                saved["preset"] = "veryfast"
                saved["crf"] = 20
            if saved.get("preset") in ("ultrafast",):
                saved["preset"] = "veryfast"
            if "encoder" not in saved:
                saved["encoder"] = "libx264"
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


# ---------------------------------------------------------- licensing
def _license_error_to_http(exc: licensing.LicenseError) -> HTTPException:
    """Map a license error to the HTTP status the server reported
    (401 bad key, 402 no credits / not activated, 403 device limit)."""
    msg = str(exc)
    code = 402
    for prefix, status in (("401:", 401), ("402:", 402), ("403:", 403)):
        if msg.startswith(prefix):
            code = status
            msg = msg[len(prefix):].strip()
            break
    return HTTPException(code, msg or "License check failed.")


def _consume_or_402(action: str, job_ref: str) -> str:
    """Reserve credits for one job BEFORE any FFmpeg/yt-dlp work.
    Raises 402 (with the server's message) when the job must not
    start — no key, no credits, or the server is unreachable."""
    try:
        return licensing.consume(action, job_ref, CLIENT_VERSION)
    except licensing.LicenseError as exc:
        raise _license_error_to_http(exc) from exc


def _close_job_token(token: str | None, job: dict, tool: str) -> None:
    """Report a finished job or refund a failed one (best-effort:
    a failed report/refund is queued and retried on next startup).
    The customer is never charged for a video that was not made."""
    if not token:
        return
    title = job.get("original_title") or job.get("title") or ""
    if job.get("status") in ("processed", "done"):
        licensing.report(token, "completed", tool=tool, title=title,
                         topic=title, minutes=job.get("final_minutes"))
    else:
        licensing.refund(token)


def _yt_dlp_download_opts(outtmpl: str, hook, attempt: int = 1) -> dict:
    """yt-dlp options for one download attempt.

    Prevention (user, 2026-11-02): the purpose is NOT just a
    Retry button — the ConnectionResetError must not interrupt
    the work in the first place. A reset usually comes from
    YouTube closing one of many parallel DASH fragment
    connections, so later attempts deliberately get MORE
    stable, not just repeated: attempt 2 halves parallel
    fragments; attempts 3+ switch to a single progressive file
    (one connection, no fragment merge at all). Combined with
    yt-dlp's own 10 fragment retries and the caller's outer
    retries, a single reset — or even several — resumes instead
    of failing the video.

    Speed (user, 2026-11-07): a 2-minute video took 5-7 minutes
    to download, while other downloaders take seconds. The DASH
    path (separate video+audio fragments) is what stalls: each
    fragment connection is throttled and retries drag it out.
    Attempt 1 now prefers a SINGLE progressive file (one
    connection, full speed, no merge) — the format other
    downloaders use — and falls back to DASH only when no
    progressive file exists.
    """
    if attempt <= 1:
        fmt = "b[height<=720][ext=mp4]/b[height<=720]/bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b"
        fragments = 8
    elif attempt == 2:
        fmt = "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b"
        fragments = 4
    else:
        fmt = "b[height<=720][ext=mp4]/b[height<=720]"
        fragments = 1
    return {
        "format": fmt,
        "merge_output_format": "mp4",
        "concurrent_fragment_downloads": fragments,
        "retries": 10,
        "fragment_retries": 10,
        "extractor_retries": 3,
        # A watch link copied from YouTube often carries &list=...
        # (a playlist). Without this, yt-dlp downloads the WHOLE
        # playlist, so the progress bar sits at 0% for a very long
        # time (user, 2026-11-07). The URL is also cleaned to one
        # video by clean_youtube_url at the endpoints; this is the
        # safety net for any path that still passes a list link.
        "noplaylist": True,
        "socket_timeout": 60,
        "outtmpl": outtmpl,
        "progress_hooks": [hook],
        "quiet": True,
        "no_warnings": True,
    }


def yt_dlp_available() -> bool:
    if shutil.which("yt-dlp"):
        return True
    try:
        import yt_dlp  # noqa: F401
        return True
    except ImportError:
        return False


app = FastAPI(title="Copyright free video generator")

# New free tools (YT Guru all-in-one, 2026-11-07): each router is
# self-contained in backend/tools_*.py. Mounted here, BEFORE the
# SPA catch-all at the bottom, or /api/* would be swallowed by it.
app.include_router(tools_thumbnail.router)
app.include_router(tools_shorts.router)
app.include_router(tools_downloader.router)
app.include_router(tools_titles.router)
app.include_router(tools_trimmer.router)
app.include_router(tools_subtitles.router)
app.include_router(tools_keywords.router)
app.include_router(tools_inspector.router)
app.include_router(tools_seo.router)
app.include_router(tools_audio.router)
app.include_router(tools_music.router)
app.include_router(tools_script.router)
app.include_router(tools_stock.router)
app.include_router(tools_channel.router)


@app.get("/favicon.ico")
def favicon() -> "Response":
    """Serve the React app's favicon when built; otherwise answer
    204, so the browser's automatic /favicon.ico request does not
    log a 404 (user, 2026-11-02)."""
    from fastapi.responses import Response as _Response
    icon = _frontend_dir() / "favicon.ico"
    if icon.is_file():
        return FileResponse(icon)
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
    # A cover can be a still image OR a video (user, 2026-11-07):
    # the secondary (cover) video plays behind the primary video,
    # looped to the primary's length, with the primary video in
    # its green area.
    if suffix not in {".png", ".jpg", ".jpeg", ".webp",
                      ".mp4", ".mov", ".webm"}:
        raise HTTPException(400, "Cover must be a PNG, JPG, WebP image or an MP4, MOV, WebM video.")
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
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp",
                                                      ".mp4", ".mov", ".webm"}:
            covers.append({"id": path.stem.split("_", 1)[0] if "_" in path.stem else path.stem,
                           "filename": path.name,
                           "display_name": _cover_display_name(path.name),
                           "is_video": video.is_video_cover(path),
                           "path": f"/api/covers/{path.name}"})
    return {"covers": covers}


def _cover_frame_for_detect(cover: Path) -> Path:
    """Still image for green detection / mask building.

    Image covers are used as-is. For a video cover the first
    frame is extracted to the system temp dir (NOT the covers
    dir, so it never shows up as a cover itself) and detection
    runs on that frame — the green area is assumed fixed in
    place across the cover video."""
    import tempfile
    if video.is_video_cover(cover):
        return video.cover_first_frame(cover, Path(tempfile.gettempdir()))
    return cover


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


def _pick_thumbnail(info: dict) -> str:
    """Best thumbnail URL from a yt-dlp info dict (user, 2026-11-07):
    Step 1 must show the video's REAL thumbnail, not a demo picture.
    Prefer the widest entry of the `thumbnails` list, fall back to
    the single `thumbnail` URL, else empty (frontend hides the image
    instead of showing a wrong one)."""
    try:
        thumbs = [t for t in (info.get("thumbnails") or [])
                  if isinstance(t, dict) and t.get("url")]
        if thumbs:
            best = max(thumbs, key=lambda t: t.get("width") or 0)
            return best.get("url") or ""
    except Exception:
        pass
    return info.get("thumbnail") or ""


def fetch_original_info(url: str) -> dict:
    """Return the source video's original title, description, tags,
    thumbnail and uploader via yt-dlp, without downloading. Never fails
    the download: on any error it returns empty fields, and the caller
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
            "original_thumbnail": _pick_thumbnail(info),
        }
    except Exception:
        pass
    try:
        proc = subprocess.run(["yt-dlp", "-J", "--no-warnings", url],
                              capture_output=True, text=True, timeout=60,
                              **video.no_window_kwargs())
        if proc.returncode == 0:
            info = json.loads(proc.stdout or "{}")
            return {
                "original_title": info.get("title") or "",
                "original_description": info.get("description") or "",
                "original_tags": list(info.get("tags") or []),
                "original_uploader": info.get("uploader") or "",
                "original_thumbnail": _pick_thumbnail(info),
            }
    except Exception:
        pass
    return {"original_title": "", "original_description": "",
            "original_tags": [], "original_uploader": "",
            "original_thumbnail": ""}


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
    url = video.clean_youtube_url(url) or url
    job = {"id": job_id, "status": "downloading", "url": url,
           "progress": 0, "downloaded_bytes": 0, "total_bytes": None,
           "speed": None, "eta": None, "timeline": [],
           # Stage so the UI can say what is happening while the
           # bar is still at 0%: "info" = fetching the video's
           # title/thumbnail (yt-dlp), "downloading" = bytes moving.
           "stage": "info"}
    job.update(fetch_original_info(url))
    job["stage"] = "downloading"
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
            "stage": "downloading",
        })
        write_job(job)

    # Same prevention as Auto (user, 2026-11-02): up to 5
    # attempts, each later one more stable (see
    # _yt_dlp_download_opts), yt-dlp resumes partial files.
    # _dl_error stays None when yt-dlp is simply not installed
    # (ImportError), so the CLI fallback below still runs.
    _dl_done = False
    _dl_error = None
    _dl_missing = False
    for _attempt in range(1, 6):
        try:
            import yt_dlp
            opts = _yt_dlp_download_opts(str(target), hook, _attempt)
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([url])
            _dl_done = True
            break
        except ImportError:
            _dl_missing = True
            break
        except Exception as exc:  # noqa: BLE001
            _dl_error = exc
            if _attempt < 5:
                _time.sleep(10 * _attempt)
                continue
            break
    if _dl_done:
        pass
    elif _dl_error is not None:
        job["status"] = "failed"
        job["error"] = str(_dl_error)[-2000:]
        write_job(job)
        return
    elif _dl_missing:
        # Python module missing: fall back to the yt-dlp binary,
        # with the same 3-attempt retry (binary resumes .part files).
        _cli_ok = False
        for _attempt in range(1, 4):
            cmd = [
                "yt-dlp",
                "-f", "b[height<=720][ext=mp4]/b[height<=720]/bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][ext=mp4]/bv*+ba/b",
                "--merge-output-format", "mp4",
                "--concurrent-fragments", "8",
                "--no-playlist",
                "-o", str(target),
                url,
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True,
                                  **video.no_window_kwargs())
            if proc.returncode == 0:
                _cli_ok = True
                break
            if _attempt < 3:
                _time.sleep(5 * _attempt)
                continue
            job["status"] = "failed"
            job["error"] = (proc.stderr or proc.stdout or "yt-dlp failed.")[-2000:]
            write_job(job)
            return
        if not _cli_ok:
            job["status"] = "failed"
            job["error"] = "yt-dlp failed."
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
        job.update({"status": "downloaded", "progress": 100, "stage": "done"})
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
    url = video.clean_youtube_url(payload.url.strip())
    if url is None:
        raise HTTPException(
            400,
            "That is a playlist link, not one video. "
            "Open the video itself and paste its link (youtube.com/watch?v=…).",
        )
    job_id = uuid.uuid4().hex[:12]
    directory = job_dir(job_id)
    target = directory / "source.mp4"
    # Return immediately; the frontend polls progress (below) while
    # the download runs in the background.
    threading.Thread(target=_run_download, args=(job_id, url, target),
                     daemon=True).start()
    return {"job_id": job_id, "status": "downloading"}


# ------------------------------------------------------------------ auto
class AutoRequest(BaseModel):
    url: str = Field(..., min_length=8)
    cover_id: str | None = None


def _run_auto_impl(job_id: str, url: str, cover_id: str | None, settings_override: dict | None = None) -> None:
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
    # Download prevention (user, 2026-11-02): a Group video failed
    # mid-download with ConnectionResetError 10054 ("connection
    # forcibly closed by the remote host") and the whole item was
    # marked failed. The Retry button is only a fallback — the
    # download itself must not be interrupted by a reset. So:
    # up to 5 attempts, longer waits between them, and each later
    # attempt uses a MORE stable download method (see
    # _yt_dlp_download_opts: fewer fragments, then a single
    # file). yt-dlp resumes from its partial (.part) files, so
    # a retry continues where the download left off instead of
    # starting over.
    dl_start = _time.time()
    _dl_error = None
    for _attempt in range(1, 6):
        try:
            import yt_dlp
            def hook(d: dict) -> None:
                total = d.get("total_bytes") or d.get("total_bytes_estimate")
                downloaded = d.get("downloaded_bytes", 0) or 0
                pct = round(downloaded * 100 / total, 1) if total else 0
                _set("downloading", round(pct * 0.25, 1))
            opts = _yt_dlp_download_opts(str(source), hook, _attempt)
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([url])
            _dl_error = None
            break
        except Exception as exc:  # noqa: BLE001
            _dl_error = exc
            if _attempt < 5:
                _set("downloading (connection retry…)", 0, {"status": "downloading"})
                _time.sleep(10 * _attempt)
                continue
            break
    if _dl_error is not None:
        _set("failed", 0, {"status": "failed", "error": str(_dl_error)[-2000:]})
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
        covers = sorted([p for p in COVERS_DIR.iterdir() if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov", ".webm"}],
                        key=lambda p: p.stat().st_mtime, reverse=True)
        cover = covers[0] if covers else None
    if cover is None:
        _set("failed", 0, {"status": "failed", "error": "Auto needs a cover: upload a cover first, then start Auto."})
        return
    green_rect = settings.get("green_rect") or {"x": 0, "y": 0, "w": 640, "h": 360}
    if settings.get("auto_detect_green", True):
        detected = video.detect_green_rect(_cover_frame_for_detect(cover))
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
        mask_path=None, cover_is_video=video.is_video_cover(cover),
    )
    # Mask for shape accuracy, built from the cover itself
    # (first frame, for a video cover).
    try:
        mask_img = video.green_mask(_cover_frame_for_detect(cover))
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
                cover_is_video=video.is_video_cover(cover),
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


def _run_auto(job_id: str, url: str, cover_id: str | None, settings_override: dict | None = None,
              job_token: str | None = None) -> None:
    """Auto worker with license accounting: the job token is
    reported completed when the video was produced, refunded
    otherwise — the customer never pays for a failed video."""
    try:
        _run_auto_impl(job_id, url, cover_id, settings_override)
    except Exception:
        if job_token:
            licensing.refund(job_token)
        raise
    if job_token:
        _close_job_token(job_token, read_job(job_id), "cover_video")


@app.post("/api/auto")
def auto_video(payload: AutoRequest) -> dict:
    if not yt_dlp_available():
        raise HTTPException(400, "yt-dlp was not found. Install it with 'pip install yt-dlp' and retry.")
    url = video.clean_youtube_url(payload.url.strip())
    if url is None:
        raise HTTPException(
            400,
            "That is a playlist link, not one video. "
            "Open the video itself and paste its link (youtube.com/watch?v=…).",
        )
    job_id = uuid.uuid4().hex[:12]
    # Credit check: reserve 1 credit BEFORE any download/FFmpeg work.
    token = _consume_or_402("cover_video", job_id)
    directory = job_dir(job_id)
    threading.Thread(target=_run_auto, args=(job_id, url, payload.cover_id),
                     kwargs={"job_token": token}, daemon=True).start()
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
    import time as _time
    group = _read_group(group_id)
    if not group:
        return
    group["status"] = "running"
    group["started_at"] = _time.time()
    _write_group(group)

    def _finish_item(it: dict) -> None:
        # Group ETA (user, 2026-11-02): record when each video
        # started/finished, so the remaining time can be estimated
        # from real completed videos, not guessed.
        now = _time.time()
        it["finished_at"] = now
        if it.get("started_at"):
            it["duration_sec"] = round(now - it["started_at"], 1)
    settings = effective_settings()
    profiles = settings.get("profiles") or {}
    for idx, item in enumerate(group["items"]):
        # Resume safety (user, 2026-11-02): a retried group must
        # NOT redo videos that already finished — only failed /
        # waiting videos run. Done videos keep their title, link
        # and local file exactly as they were.
        if item.get("status") in ("done_local", "uploaded"):
            continue
        group["current_index"] = idx
        item["status"] = "processing"
        item["started_at"] = _time.time()
        item.pop("finished_at", None)
        item.pop("duration_sec", None)
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
            _run_auto(job_id, item["url"], item.get("cover_id"), settings_override=preset,
                      job_token=item.get("job_token"))
        except Exception as exc:  # noqa: BLE001
            item["status"] = "failed"
            item["error"] = str(exc)[-1000:]
            _finish_item(item)
            _write_group(group)
            continue
        job = read_job(job_id)
        if job.get("status") != "processed":
            item["status"] = "failed"
            item["error"] = (job.get("error") or "Processing failed.")[-1000:]
            _finish_item(item)
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
            _finish_item(item)
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
            _finish_item(item)
            _write_group(group)
            shutil.rmtree(job_dir(job_id), ignore_errors=True)
        except Exception as exc:  # noqa: BLE001
            item["status"] = "failed_upload"
            item["error"] = str(exc)[-1000:]
            item["download_url"] = f"/api/download/{job_id}"
            _finish_item(item)
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
    # Clean every item's link FIRST, before any credit is spent:
    # a watch link carrying &list=... would otherwise make yt-dlp
    # download the whole playlist and sit at 0% (user, 2026-11-07).
    cleaned: list[str] = []
    for it in payload.items:
        url = video.clean_youtube_url(it.url.strip())
        if url is None:
            raise HTTPException(
                400,
                "One of the links is a playlist, not one video. "
                "Open the video itself and paste its link (youtube.com/watch?v=…).",
            )
        cleaned.append(url)
    group_id = uuid.uuid4().hex[:12]
    # Credit check: reserve 1 credit per video, up front, before
    # any work starts. If a later item cannot be reserved, refund
    # the tokens already taken so a group that never starts costs
    # nothing.
    tokens: list[str] = []
    try:
        for index in range(len(payload.items)):
            tokens.append(_consume_or_402(
                "cover_video", f"group-{group_id}-{index}"))
    except HTTPException:
        for tok in tokens:
            licensing.refund(tok)
        raise
    group = {
        "id": group_id,
        "name": payload.name or "Group 1",
        "created_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "status": "running",
        "current_index": 0,
        "items": [
            {"url": url, "preset_name": it.preset_name, "cover_id": it.cover_id,
             "upload": it.upload or "skip", "status": "waiting", "job_id": None,
             "job_token": tok}
            for it, tok, url in zip(payload.items, tokens, cleaned)
        ],
    }
    _write_group(group)
    threading.Thread(target=_run_group, args=(group_id,), daemon=True).start()
    return group


@app.post("/api/groups/{group_id}/retry")
def retry_group(group_id: str) -> dict:
    """Retry only the failed videos of a finished group, from
    where it left off (user, 2026-11-02).

    Failed / failed_upload items go back to "waiting" and the
    group runs again; _run_group skips done_local / uploaded
    items, so completed videos are never re-downloaded or
    re-uploaded. Returns 400 while a group is still running,
    and a plain message when nothing failed.
    """
    group = _read_group(group_id)
    if not group:
        raise HTTPException(404, "Group not found.")
    if group.get("status") == "running":
        raise HTTPException(400, "Group is still running. Wait for it to finish, then retry.")
    failed = [it for it in group["items"] if it.get("status") in ("failed", "failed_upload")]
    if not failed:
        return {**group, "retried": 0, "message": "No failed videos to retry."}
    # Credit check: reserve 1 credit per failed video being retried
    # only — completed videos are never charged again. A failed
    # reservation refunds the tokens already taken for this retry.
    tokens: list[str] = []
    try:
        for index in range(len(failed)):
            tokens.append(_consume_or_402(
                "cover_video", f"group-{group_id}-retry-{index}"))
    except HTTPException:
        for tok in tokens:
            licensing.refund(tok)
        raise
    for it, tok in zip(failed, tokens):
        it["job_token"] = tok
        it["status"] = "waiting"
        it["error"] = None
        it["job_id"] = None
        it.pop("progress", None)
        it.pop("stage", None)
    group["status"] = "running"
    group["current_index"] = None
    _write_group(group)
    threading.Thread(target=_run_group, args=(group_id,), daemon=True).start()
    return {**group, "retried": len(failed),
            "message": f"Retrying {len(failed)} failed video(s); completed videos will not run again."}


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
    # Group ETA (user, 2026-11-02): estimated seconds left, from
    # real data only — average time of completed videos, plus the
    # current video's remaining time extrapolated from its own
    # progress. Returns None (frontend shows "Calculating…")
    # until there is any data to base it on, instead of a fake
    # number. All values are labelled "about" in the UI, because
    # videos differ in length and encode speed.
    import time as _time
    now = _time.time()
    started = group.get("started_at")
    group["elapsed_sec"] = round(now - started, 1) if started else None
    if group.get("status") == "done":
        group["eta_sec"] = 0
        return group
    done_statuses = ("done_local", "uploaded", "failed", "failed_upload")
    done_items = [it for it in group["items"] if it["status"] in done_statuses]
    durations = [it["duration_sec"] for it in done_items if it.get("duration_sec")]
    avg = sum(durations) / len(durations) if durations else None
    current = next((it for it in group["items"] if it["status"] == "processing"), None)
    current_remaining = None
    current_total = None
    if current and current.get("started_at"):
        elapsed = now - current["started_at"]
        pct = current.get("progress") or 0
        if pct and pct > 5 and pct < 100:
            current_total = elapsed / (pct / 100.0)
            current_remaining = max(0.0, current_total - elapsed)
        elif avg is not None:
            current_remaining = avg
    remaining_items = len(group["items"]) - len(done_items) - (1 if current else 0)
    if current_remaining is None and avg is None:
        group["eta_sec"] = None
    else:
        # Waiting videos: use the average of finished videos if
        # any exist; otherwise use the current video's own total
        # as a rough proxy — better than counting them as zero,
        # which would claim the group is almost done when a whole
        # video is still waiting. Still labelled "about" in UI.
        per_video = avg if avg is not None else current_total
        eta = (current_remaining or 0) + remaining_items * (per_video or 0)
        group["eta_sec"] = round(eta, 1)
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
    url = video.clean_youtube_url(payload.url.strip())
    if url is None:
        raise HTTPException(
            400,
            "That is a playlist link, not one video. "
            "Open the video itself and paste its link (youtube.com/watch?v=…).",
        )
    info = fetch_original_info(url)
    return {"url": url, "title": info.get("original_title", ""),
            "uploader": info.get("original_uploader", ""),
            "thumbnail": info.get("original_thumbnail", "")}


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
    rect = video.detect_green_rect(_cover_frame_for_detect(matches[0]))
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
    frame = _cover_frame_for_detect(matches[0])
    mask = video.green_mask(frame)
    if mask is None:
        raise HTTPException(404, "Mask could not be built.")
    rect = None
    if x is not None and y is not None and w and h:
        rect = {"x": x, "y": y, "w": w, "h": h}
    else:
        rect = video.detect_green_rect(frame)
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
                 speed, voice_enabled, pitch, green_rect, zoom, pan_x, pan_y,
                 job_token: str | None = None) -> None:
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
    # License accounting: completed video is reported, a failed
    # encode is refunded — the customer never pays for a failure.
    _close_job_token(job_token, job, "cover_video")


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
    # Snap to even pixels (see video.snap_rect_even): an odd green
    # height (e.g. 661 on the new office cover) made FFmpeg fail
    # instantly with an alphamerge size mismatch, so the Process
    # popup vanished ~1 second after starting.
    green_rect = payload.green_rect or settings["green_rect"]
    _cover_size = video.get_media_size(cover)
    green_rect = video.snap_rect_even(
        green_rect,
        cover_w=_cover_size[0] if _cover_size else None,
        cover_h=_cover_size[1] if _cover_size else None)
    green_source = "manual"
    if payload.green_rect is None and settings.get("auto_detect_green", True):
        detected = video.detect_green_rect(_cover_frame_for_detect(cover))
        if detected:
            green_rect = detected
            green_source = "auto-detected"
    final_path = directory / "final.mp4"
    preview_path = directory / "preview.mp4"

    # Credit check: reserve 1 credit BEFORE any FFmpeg work.
    # (Validation above already passed, so a 402 here means the
    # job genuinely cannot start — no charge for a bad request.)
    token = _consume_or_402("cover_video", payload.job_id)

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
        speed, voice_enabled, pitch, green_rect, zoom, pan_x, pan_y, token), daemon=True).start()
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
    # Multi-channel (user, 2026-11-02): channels here are ONLY
    # channels with a real saved token — real upload destinations.
    # Manually typed channels are deliberately NOT merged in any
    # more: they never changed the upload destination (upload
    # always went to the signed-in channel), so listing them here
    # was misleading. Old manual entries in settings are ignored.
    api_channels = []
    if status["connected"]:
        api_channels = youtube_upload.list_channels()
        if not api_channels:
            # Connected (a token exists) but no channel could be
            # identified — usually an old token without the
            # readonly scope. Upload with the default token still
            # works, but picking a channel needs a reconnect.
            status["channel_list_error"] = (
                "Connected, but no channel could be listed for this "
                "sign-in. Disconnect and Connect again and allow the "
                "new 'view your YouTube account' permission."
            )
    status["channels"] = api_channels
    status["configured_channels"] = []
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
    """Remove ALL saved Google sign-ins."""
    return youtube_upload.disconnect()


class YoutubeDisconnectChannelRequest(BaseModel):
    channel_id: str


@app.post("/api/youtube/disconnect-channel")
def disconnect_youtube_channel(payload: YoutubeDisconnectChannelRequest) -> dict:
    """Remove one connected channel (its token only, secrets kept)."""
    return youtube_upload.disconnect_channel(payload.channel_id)


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
    channel_id: str = ""


@app.get("/api/upload-progress/{job_id}")
def get_upload_progress(job_id: str) -> dict:
    """Upload progress for Step 5 polling (user, 2026-11-02).

    The upload request itself runs synchronously, so the frontend
    polls this endpoint every second while it waits for that
    request to return. Returns percent + byte counts, or
    status 'unknown' before any upload for this job has started.
    """
    return {"job_id": job_id, **youtube_upload.get_upload_progress(job_id)}


@app.post("/api/upload-youtube")
def upload_youtube(payload: UploadRequest) -> dict:
    final_path = job_dir(payload.job_id) / "final.mp4"
    if not final_path.exists():
        raise HTTPException(404, "Final video not ready yet. Process a video first.")
    youtube_upload._set_upload_progress(payload.job_id, 0, 0, 0, "uploading")

    def _progress(pct: float, uploaded: int, total: int) -> None:
        youtube_upload._set_upload_progress(
            payload.job_id, pct, uploaded, total, "uploading")

    try:
        result = youtube_upload.upload_video(
            final_path,
            title=payload.title,
            description=payload.description,
            tags=payload.tags or "",
            privacy_status=payload.privacy_status or "private",
            channel_id=payload.channel_id or "",
            on_progress=_progress,
        )
    except RuntimeError as exc:
        youtube_upload._set_upload_progress(payload.job_id, 0, 0, 0, "error")
        raise HTTPException(400, str(exc))
    except Exception as exc:
        youtube_upload._set_upload_progress(payload.job_id, 0, 0, 0, "error")
        raise HTTPException(500, f"YouTube upload failed: {exc}")
    youtube_upload._set_upload_progress(payload.job_id, 100, 0, 0, "done")
    # Uploaded copy is now on YouTube — delete all local files for
    # this job so nothing accumulates on disk.
    shutil.rmtree(job_dir(payload.job_id), ignore_errors=True)
    return {"job_id": payload.job_id, "status": "uploaded",
            "local_files_deleted": True, **result}


# ------------------------------------------------------- text to voice
# YT Guru Tool 2 (free): text -> MP3 voiceover. No API key, no
# payment — edge-tts voices. Long text is chunked in tts.py and
# merged with FFmpeg, so a full script works, not just a sentence.
class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=tts_module.MAX_TEXT_CHARS)
    voice: str = "en-US-ChristopherNeural"
    # edge-tts rate: "-20%", "+0%", "+20%" etc.
    rate: str = "+0%"


@app.get("/api/tts/voices")
def tts_voices() -> dict:
    return {
        "voices": [
            {"id": voice, "label": label} for voice, label in tts_module.VOICES
        ],
        "max_text_chars": tts_module.MAX_TEXT_CHARS,
    }


@app.post("/api/tts")
def tts_generate(payload: TtsRequest) -> dict:
    text = payload.text.strip()
    if not text:
        raise HTTPException(400, "Text is empty.")
    if payload.voice not in tts_module.VOICE_IDS:
        raise HTTPException(400, "Unknown voice. Pick one from the voice list.")
    if payload.rate not in {"-20%", "-10%", "+0%", "+10%", "+20%"}:
        raise HTTPException(400, "Unknown speed. Pick Slow, Normal, or Fast.")
    # Credit check: reserve 1 credit BEFORE synthesis. A failed
    # voiceover is refunded; a finished one is reported.
    token = _consume_or_402("tts", uuid.uuid4().hex[:12])
    try:
        final_path, engine = tts_module.synthesize(text, payload.voice, payload.rate, TTS_DIR)
    except ImportError as exc:
        licensing.refund(token)
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        licensing.refund(token)
        raise HTTPException(500, f"Voice generation failed: {str(exc)[-1000:]}") from exc
    licensing.report(token, "completed", tool="tts", chars=len(text))
    return {
        "tts_id": final_path.stem,
        "voice": payload.voice,
        "voice_label": tts_module.voice_label(payload.voice),
        "engine": engine,
        "engine_note": (
            "Generated with the voice you picked."
            if engine == "edge-tts"
            else "Edge voices could not be reached, so this was generated with Google's free voice in the same language (not the male/female voice you picked)."
        ),
        "chars": len(text),
        "size_bytes": final_path.stat().st_size,
        "download_url": f"/api/tts/download/{final_path.stem}",
    }


@app.get("/api/tts/download/{tts_id}")
def tts_download(tts_id: str) -> FileResponse:
    # Only ids this tool created (12 hex chars) — no path traversal.
    if len(tts_id) != 12 or not all(c in "0123456789abcdef" for c in tts_id):
        raise HTTPException(404, "Voiceover not found.")
    path = TTS_DIR / f"{tts_id}.mp3"
    if not path.exists():
        raise HTTPException(404, "Voiceover not found.")
    return FileResponse(path, media_type="audio/mpeg", filename=f"voiceover-{tts_id}.mp3")


# --------------------------------------------------- auto video from title
# YT Guru Tool 3 (free): title + minutes -> script -> voiceover
# -> Commons visuals -> finished video. Runs in a background
# thread; the frontend polls the job below, because scripting
# + voiceover + assembly can take minutes for a long video.
class AutoVideoRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    minutes: int = Field(..., ge=1, le=30)
    visuals: str = "both"  # images | videos | both
    voice: str = "en-US-AriaNeural"
    expressive: bool = True
    subtitles: bool = True  # live word-by-word captions (Whisper)
    # Mood-matched background music (Freesound, user's key) + a
    # different transition sound at each scene change (Freesound
    # SFX). Both default ON; no key -> skipped. Pixabay's API
    # has no audio endpoint (verified 2026-11-08), so audio
    # uses Freesound; Pixabay/Pexels keys are for stock video
    # clips only.
    music: bool = True
    transitions: bool = True  # visual xfade transitions + SFX
    # Optional stock-media keys (free, user's own). When set,
    # Pexels/Pixabay clips are tried before Commons. The keys
    # are the user's, stored only in their browser, sent with
    # each job and never saved on the server.
    pexels_key: str | None = None
    pixabay_key: str | None = None
    freesound_key: str | None = None


def _av_job_dir(job_id: str) -> Path:
    path = AV_DIR / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _av_read(job_id: str) -> dict:
    meta = _av_job_dir(job_id) / "job.json"
    if meta.exists():
        try:
            return json.loads(meta.read_text(encoding="utf-8"))
        except ValueError:
            pass
    return {"id": job_id, "status": "unknown"}


def _av_write(job: dict) -> None:
    (_av_job_dir(job["id"]) / "job.json").write_text(
        json.dumps(job, indent=2), encoding="utf-8")


def _run_autovideo_impl(job_id: str, title: str, minutes: int, visuals: str, voice: str,
                   expressive: bool = True, subtitles: bool = True,
                   pexels_key: str | None = None,
                   pixabay_key: str | None = None,
                   freesound_key: str | None = None,
                   music: bool = True,
                   transitions: bool = True) -> None:
    directory = _av_job_dir(job_id)

    def _set(stage: str, progress: float, extra: dict | None = None) -> None:
        job = _av_read(job_id)
        job.update({"stage": stage, "progress": progress})
        if extra:
            job.update(extra)
        _av_write(job)

    try:
        # MASTER pipeline first: scene-based video (hook +
        # scenes, per-scene visuals, pan motion, captions,
        # quality gates). If it fails for any reason, the old
        # paragraph pipeline below runs instead, so the job
        # still completes — never a failed job for a pipeline
        # upgrade.
        try:
            import autovideo2
            _set("Building scenes…", 10, {"status": "running"})

            def _master_progress(done: int, total: int, stage: str) -> None:
                # 10% for the script, 10-90% for the scenes, 90-100%
                # for the join/mux. The old code sat at 10% for the
                # whole build, which is why the bar looked stuck.
                pct = 10 + (80 * done / max(total, 1)) if total else 10
                _set(stage, round(pct, 1), {"status": "running"})

            report = autovideo2.run_master(
                title, minutes, visuals, voice, directory,
                expressive=expressive, progress_cb=_master_progress,
                subtitles=subtitles,
                pexels_key=pexels_key, pixabay_key=pixabay_key,
                freesound_key=freesound_key,
                music=music, transitions=transitions)
            kinds = report["kinds"]
            _set("done", 100, {
                "status": "done",
                "download_url": f"/api/autovideo/download/{job_id}",
                "script": report["script"],
                "script_source": report["script_source"],
                "script_words": report["script_words"],
                "voice_duration_sec": report["voice_duration_sec"],
                "voice_engine": report["voice_engine"],
                "mood": report.get("mood"),
                "music": report.get("music"),
                "music_status": report.get("music_status", "off"),
                "transition_sfx": report.get("transition_sfx", 0),
                "sfx_status": report.get("sfx_status", "off"),
                "transitions": report.get("transitions", transitions),
                "join": report.get("join", "copy"),
                "final_minutes": round(report["voice_duration_sec"] / 60, 1),
                "scenes": report["scenes"],
                "distinct_commons_visuals": report["distinct_commons_visuals"],
                "images_found": kinds["image"] + kinds["ai"] + kinds["card"],
                "clips_found": kinds["clip"],
                "images_used": kinds["image"] + kinds["ai"] + kinds["card"],
                "clips_used": kinds["clip"],
                "ai_images": kinds["ai"],
                "title_cards": kinds["card"],
                "visual_warning": "",
                "pipeline": "master-scenes"})
            return
        except Exception as master_exc:  # noqa: BLE001
            _set("Master pipeline fell back…", 5, {
                "status": "running",
                "master_fallback": str(master_exc)[-500:]})
        _set("Writing script…", 5, {"status": "running"})
        script, source = autovideo.generate_script(title, minutes)
        words = len(script.split())
        _av_write({**_av_read(job_id), "script": script, "script_source": source,
                   "script_words": words})
        _set("Making voiceover…", 25, {"status": "running"})
        paragraphs = autovideo.split_paragraphs(script)
        voice_path, engine, durations, fallback_used = tts_module.synthesize_paragraphs(
            paragraphs, voice, "+0%", directory, expressive=expressive)
        voice_duration = video.get_duration(voice_path) or sum(durations)
        if not voice_duration:
            raise RuntimeError("Could not measure the voiceover length.")
        _set("Finding visuals…", 50, {
            "status": "running", "voice_duration_sec": round(voice_duration, 1),
            "voice_engine": engine,
            "voice_fallback_used": fallback_used})
        found = autovideo.fetch_visuals(title, visuals)
        image_paths: list[tuple[Path, str]] = []
        clip_paths: list[tuple[Path, str]] = []
        for index, item in enumerate(found["images"]):
            dest = directory / f"img-{index:02d}.jpg"
            if autovideo._download(item["url"], dest):
                image_paths.append((dest, item["title"]))
        for index, item in enumerate(found["videos"]):
            suffix = ".webm" if "webm" in (item.get("mime") or "") else ".mp4"
            dest = directory / f"clip-{index:02d}{suffix}"
            if autovideo._download(item["url"], dest):
                clip_paths.append((dest, item["title"]))
        # Reliability chain — every video must complete, never a
        # black video and never a failed job for visuals:
        # 1. Commons (real photos/clips) first.
        # 2. If Commons coverage is shorter than the voiceover,
        #    generate one AI image per spoken paragraph (prompt
        #    from that paragraph, so the picture matches what
        #    is being said at that moment).
        # 3. If even generation fails, a local title card is
        #    generated per paragraph — no network, no model,
        #    so it cannot fail. The video always completes.
        import math as _math
        coverage = (len(image_paths) * autovideo.IMAGE_SEGMENT_SEC
                    + len(clip_paths) * autovideo.CLIP_SEGMENT_SEC)
        ai_images = 0
        title_cards = 0
        if coverage < voice_duration:
            needed = _math.ceil((voice_duration - coverage)
                                / autovideo.IMAGE_SEGMENT_SEC)
            generated = autovideo.generate_fallback_visuals(
                title, paragraphs, directory, min(max(needed, 1), 12))
            for gen_path, gen_title, is_ai in generated:
                image_paths.append((gen_path, gen_title))
                if is_ai:
                    ai_images += 1
                else:
                    title_cards += 1
        visual_warning = ""
        if ai_images or title_cards:
            visual_warning = (
                f"Commons visuals were short, so {ai_images} AI-generated "
                f"image(s) and {title_cards} title card(s) were added for "
                f"the spoken paragraphs, so the video still completes.")
        elif visuals in ("videos", "both") and not clip_paths and image_paths:
            visual_warning = ("No video clips could be found/downloaded for "
                              "this title, so images were used instead.")
        _set("Assembling video…", 75, {
            "status": "running", "visual_warning": visual_warning,
            "images_found": len(image_paths), "clips_found": len(clip_paths)})
        para_plan = [(para, dur) for para, dur in zip(paragraphs, durations)
                     if dur and dur > 0]
        if not para_plan:
            para_plan = [(script, voice_duration)]
        final_path, images_used, clips_used = autovideo.assemble_by_paragraphs(
            voice_path, para_plan, image_paths, clip_paths, directory, voice_duration)
        # The download endpoint serves final.mp4 in the job dir.
        if final_path.name != "final.mp4":
            import shutil as _shutil
            _shutil.copyfile(final_path, directory / "final.mp4")
        _set("done", 100, {
            "status": "done",
            "download_url": f"/api/autovideo/download/{job_id}",
            "final_minutes": round(voice_duration / 60, 1),
            "images_found": len(image_paths), "clips_found": len(clip_paths),
            "images_used": images_used, "clips_used": clips_used,
            "ai_images": ai_images, "title_cards": title_cards,
            "visual_warning": visual_warning})
    except Exception as exc:  # noqa: BLE001
        _set("failed", 0, {"status": "failed", "error": str(exc)[-2000:]})


def _run_autovideo(job_id: str, title: str, minutes: int, visuals: str, voice: str,
                   expressive: bool = True, job_token: str | None = None,
                   subtitles: bool = True,
                   pexels_key: str | None = None,
                   pixabay_key: str | None = None,
                   freesound_key: str | None = None,
                   music: bool = True,
                   transitions: bool = True) -> None:
    """Auto-video worker with license accounting: the job token is
    reported completed when the video was produced, refunded
    otherwise — the customer never pays for a failed video."""
    try:
        _run_autovideo_impl(job_id, title, minutes, visuals, voice, expressive, subtitles,
                            pexels_key, pixabay_key, freesound_key, music, transitions)
    except Exception:
        if job_token:
            licensing.refund(job_token)
        raise
    if job_token:
        job = _av_read(job_id)
        if job.get("status") == "done":
            licensing.report(job_token, "completed", tool="autovideo",
                             title=title, topic=title,
                             minutes=job.get("final_minutes"))
        else:
            licensing.refund(job_token)


@app.post("/api/autovideo")
def autovideo_create(payload: AutoVideoRequest) -> dict:
    if payload.visuals not in ("images", "videos", "both"):
        raise HTTPException(400, "Visuals must be images, videos, or both.")
    if payload.voice not in tts_module.VOICE_IDS:
        raise HTTPException(400, "Unknown voice. Pick one from the voice list.")
    job_id = uuid.uuid4().hex[:12]
    # Credit check: reserve 1 credit BEFORE any scripting/voice work.
    token = _consume_or_402("autovideo", job_id)
    _av_write({"id": job_id, "status": "running", "stage": "Starting…",
               "progress": 0, "title": payload.title,
               "minutes": payload.minutes, "visuals": payload.visuals,
               "voice": payload.voice})
    threading.Thread(
        target=_run_autovideo,
        args=(job_id, payload.title, payload.minutes, payload.visuals, payload.voice,
              payload.expressive, token, payload.subtitles,
              payload.pexels_key, payload.pixabay_key,
              payload.freesound_key, payload.music, payload.transitions),
        daemon=True).start()
    return {"job_id": job_id, "status": "running"}


@app.get("/api/autovideo/{job_id}")
def autovideo_job(job_id: str) -> dict:
    return _av_read(job_id)


@app.get("/api/autovideo/download/{job_id}")
def autovideo_download(job_id: str) -> FileResponse:
    path = _av_job_dir(job_id) / "final.mp4"
    if not path.exists():
        raise HTTPException(404, "Video not ready yet.")
    return FileResponse(path, media_type="video/mp4", filename=f"autovideo-{job_id}.mp4")


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "ffmpeg": video.check_ffmpeg() is None,
        "yt_dlp": yt_dlp_available(),
    }


# --------------------------------------------------- license activation
class LicenseActivateRequest(BaseModel):
    license_key: str


@app.post("/api/license/activate")
def license_activate(payload: LicenseActivateRequest) -> dict:
    """Activate the installed tool with a license key (first run).
    Binds the key to this PC and returns the balance + costs."""
    key = (payload.license_key or "").strip()
    if not key:
        raise HTTPException(400, "Paste your license key first.")
    try:
        data = licensing.activate(key, CLIENT_VERSION)
    except licensing.LicenseError as exc:
        raise _license_error_to_http(exc) from exc
    return {"activated": True, **data}


@app.get("/api/license/status")
def license_status() -> dict:
    """Balance + costs from the license server, or activated=False
    when no key is stored yet (the home page shows the box).

    installed=True only when running from the frozen .exe
    (PyInstaller sets sys.frozen); run.bat / plain python is NOT
    the installed setup, and the public demo has no backend at
    all — the frontend locks the tools unless installed+activated.
    """
    installed = bool(getattr(sys, "frozen", False))
    try:
        data = licensing.balance()
    except licensing.LicenseError as exc:
        if str(exc).startswith("No license key"):
            return {"activated": False, "balance": None, "costs": None, "installed": installed}
        raise HTTPException(503, str(exc)) from exc
    return {"activated": True, "installed": installed, **data}


# Frontend (registered last so /api/* routes win): serve the built
# files directly, and fall back to index.html for SPA routes
# (/cover, /voice, /auto-video, /presets), so a refresh or a direct
# link to a tool page loads the app instead of a 404.
@app.get("/{full_path:path}")
def frontend_fallback(full_path: str):
    directory = _frontend_dir().resolve()
    candidate = (directory / full_path).resolve()
    if candidate.is_file() and candidate.is_relative_to(directory):
        return FileResponse(candidate)
    return FileResponse(directory / "index.html")
