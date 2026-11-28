"""YT Guru — 3D Explainer render engine (user, 2026-11-28).

Deterministic frame-stepping: the frontend scene (opened with
``?render=1``) exposes ``window.__x3d_ready``, ``window.__x3d_duration``
and ``window.__x3d_seek(t)``; this engine steps time frame by frame,
screenshots each frame with Playwright/Chromium (software WebGL via
SwiftShader), then encodes each shot's frames to ``shot.mp4`` with
ffmpeg. State lives in the project folder's ``job.json`` so a render
can be stopped, watched and resumed — resuming skips any shot whose
``shot.mp4`` already exists and any frame already captured.

If Playwright or WebGL is unavailable the job is set to ``error``
with a clear message (including the time estimate) — never a hang.
Playwright is imported lazily inside the worker so this module (and
its pure helpers) import fine without it.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import threading
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROJECTS_DIR = REPO_ROOT / "autovideos"
STOP_FILE = "stop.flag"

# quality -> (width, height, fps, crf) for landscape; shorts swap w/h.
QUALITY_PRESETS = {
    "low": (854, 480, 24, 26),
    "medium": (1280, 720, 30, 21),
    "high": (1920, 1080, 30, 18),
}

_jobs: dict[str, threading.Thread] = {}
_lock = threading.Lock()


def preset(settings: dict | None) -> tuple[int, int, int, int]:
    """(width, height, fps, crf) for the settings, shorts-aware."""
    settings = settings or {}
    w, h, fps, crf = QUALITY_PRESETS.get(
        str(settings.get("quality") or "medium"), QUALITY_PRESETS["medium"])
    if settings.get("fps"):
        try:
            fps = max(1, int(settings["fps"]))
        except (TypeError, ValueError):
            pass
    if str(settings.get("orientation") or "landscape") == "shorts":
        w, h = h, w
    return w, h, fps, crf


def estimate_seconds(project: dict, settings: dict | None,
                     measured_fps: float | None = None) -> float:
    """Estimated wall-clock seconds for the whole render.

    Monotonic in total duration and in resolution work; with a
    measured capture rate (frames/sec) it is simply frames / rate,
    otherwise a conservative 2 fps software-GL guess is used.
    """
    _w, _h, fps, _crf = preset(settings)
    total = sum(float(s.get("duration") or 0)
                for s in (project or {}).get("shots") or [])
    frames = total * fps
    rate = measured_fps if measured_fps and measured_fps > 0 else 2.0
    return round(frames / rate, 1)


def project_dir(project_id: str) -> Path:
    return PROJECTS_DIR / project_id


def _job_path(project_id: str) -> Path:
    return project_dir(project_id) / "job.json"


def _read_job(project_id: str) -> dict:
    try:
        data = json.loads(_job_path(project_id).read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:  # noqa: BLE001
        return {}


def _write_job(project_id: str, **updates) -> dict:
    job = _read_job(project_id)
    job.update(updates)
    job["id"] = project_id
    project_dir(project_id).mkdir(parents=True, exist_ok=True)
    _job_path(project_id).write_text(
        json.dumps(job, indent=2), encoding="utf-8")
    return job


def status(project_id: str) -> dict:
    job = _read_job(project_id)
    return job or {"id": project_id, "status": "unknown",
                   "message": "No render job for this project yet."}


def stop_render(project_id: str) -> dict:
    """Ask a running render to stop (flag file, checked per frame)."""
    folder = project_dir(project_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / STOP_FILE).write_text("stop", encoding="utf-8")
    if status(project_id).get("status") in ("rendering", "queued"):
        _write_job(project_id, message="Stopping…")
    return status(project_id)


def _stopped(project_id: str) -> bool:
    return (project_dir(project_id) / STOP_FILE).exists()


def _encode_shot(folder: Path, fps: int, crf: int) -> bool:
    """ffmpeg image2 frames -> shot.mp4. True on success."""
    if not shutil.which("ffmpeg"):
        return False
    cmd = ["ffmpeg", "-y", "-framerate", str(fps), "-i",
           str(folder / "f%06d.png"), "-c:v", "libx264", "-pix_fmt",
           "yuv420p", "-crf", str(crf), str(folder / "shot.mp4")]
    try:
        return subprocess.run(cmd, capture_output=True, timeout=3600).returncode == 0
    except Exception:  # noqa: BLE001
        return False


def _render_worker(project_id: str, project: dict, settings: dict,
                   base_url: str, on_done=None) -> None:
    folder = project_dir(project_id)
    shots = project.get("shots") or []
    w, h, fps, crf = preset(settings)
    total_frames = int(sum(float(s.get("duration") or 0) for s in shots) * fps)
    frames_done = 0
    started = time.time()
    measured_fps = None
    try:
        (folder / STOP_FILE).unlink(missing_ok=True)
    except OSError:
        pass

    def progress(message: str) -> None:
        elapsed = max(time.time() - started, 0.001)
        rate = frames_done / elapsed if frames_done else None
        eta = None
        if rate:
            eta = round((total_frames - frames_done) / rate, 1)
        _write_job(project_id, status="rendering", message=message,
                   progress=round(frames_done / total_frames, 4) if total_frames else 0,
                   frames_done=frames_done, eta_seconds=eta)

    ok = False
    try:
        try:
            from playwright.sync_api import sync_playwright  # lazy (user, 2026-11-28)
        except Exception as exc:  # noqa: BLE001
            est = estimate_seconds(project, settings)
            _write_job(
                project_id, status="error", progress=0,
                message=f"Playwright is not available ({exc}). Install it with "
                        f"'pip install playwright && playwright install chromium'. "
                        f"Estimated render time once installed: ~{est:.0f}s "
                        f"for {total_frames} frames.")
            return
        with sync_playwright() as pw:
            browser = None
            for args in (["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
                         ["--enable-unsafe-swiftshader"], []):
                try:
                    browser = pw.chromium.launch(args=args)
                    break
                except Exception:  # noqa: BLE001
                    browser = None
            if browser is None:
                est = estimate_seconds(project, settings)
                _write_job(
                    project_id, status="error", progress=0,
                    message="Chromium/WebGL could not start (SwiftShader "
                            "fallback included). Estimated render time on a "
                            f"working setup: ~{est:.0f}s for {total_frames} frames.")
                return
            page = browser.new_page(viewport={"width": w, "height": h})
            # Probe WebGL once: a dead context means every frame is black.
            page.goto("about:blank")
            webgl = page.evaluate(
                "() => { try { const c = document.createElement('canvas');"
                " return !!(c.getContext('webgl2') || c.getContext('webgl')); }"
                " catch (e) { return false; } }")
            if not webgl:
                browser.close()
                est = estimate_seconds(project, settings)
                _write_job(
                    project_id, status="error", progress=0,
                    message="WebGL is unavailable in this Chromium, so 3D "
                            "frames cannot be captured. Estimated render time "
                            f"with WebGL: ~{est:.0f}s for {total_frames} frames.")
                return
            for i, shot in enumerate(shots):
                if _stopped(project_id):
                    _write_job(project_id, status="stopped",
                               message="Render stopped by the user.",
                               frames_done=frames_done)
                    return
                shot_folder = folder / "frames" / f"shot-{i + 1:02d}"
                shot_folder.mkdir(parents=True, exist_ok=True)
                count = int(float(shot.get("duration") or 0) * fps)
                if (shot_folder / "shot.mp4").is_file():
                    frames_done += count  # resume: whole shot already done
                    progress(f"Shot {i + 1}/{len(shots)} already rendered — skipped.")
                    continue
                url = (f"{base_url.rstrip('/')}/explainer3d"
                       f"?render=1&project={project_id}&shot={i}")
                page.goto(url)
                try:
                    page.wait_for_function(
                        "() => window.__x3d_ready === true", timeout=60000)
                except Exception:  # noqa: BLE001
                    browser.close()
                    _write_job(
                        project_id, status="error",
                        message=f"Shot {i + 1}: the 3D scene did not become "
                                "ready within 60s (window.__x3d_ready).",
                        frames_done=frames_done)
                    return
                duration = page.evaluate(
                    "() => window.__x3d_duration || 0") or float(
                        shot.get("duration") or 0)
                count = int(duration * fps) or count
                for f in range(count):
                    if _stopped(project_id):
                        browser.close()
                        _write_job(project_id, status="stopped",
                                   message="Render stopped by the user.",
                                   frames_done=frames_done)
                        return
                    frame_file = shot_folder / f"f{f:06d}.png"
                    if not frame_file.is_file():  # resume: skip captured
                        page.evaluate("t => window.__x3d_seek(t)", f / fps)
                        page.screenshot(path=str(frame_file))
                    frames_done += 1
                    if f % 10 == 0:
                        progress(f"Rendering shot {i + 1}/{len(shots)}, "
                                 f"frame {f + 1}/{count}.")
                progress(f"Encoding shot {i + 1}/{len(shots)}…")
                if not _encode_shot(shot_folder, fps, crf):
                    browser.close()
                    _write_job(project_id, status="error",
                               message=f"Shot {i + 1}: ffmpeg could not encode "
                                       "the captured frames (is ffmpeg installed?).",
                               frames_done=frames_done)
                    return
            browser.close()
        elapsed = max(time.time() - started, 0.001)
        measured_fps = frames_done / elapsed if frames_done else None
        _write_job(project_id, status="rendered", progress=1.0,
                   message="All shots rendered. Ready to assemble.",
                   frames_done=frames_done, eta_seconds=0,
                   measured_fps=measured_fps)
        ok = True
    except Exception as exc:  # noqa: BLE001 — never hang silently
        _write_job(project_id, status="error",
                   message=f"Render failed: {exc}", frames_done=frames_done)
    finally:
        if on_done is not None:
            try:
                on_done(ok)
            except Exception:  # noqa: BLE001
                pass


def start_render(project: dict, settings: dict | None = None,
                 base_url: str = "http://127.0.0.1:8000",
                 on_done=None) -> dict:
    """Start (or resume) a render in a background thread."""
    project_id = str(project.get("id") or "")
    settings = settings or {}
    _write_job(project_id, status="rendering", progress=0,
               message="Render starting…", frames_done=0,
               eta_seconds=estimate_seconds(project, settings),
               settings=settings)
    thread = threading.Thread(
        target=_render_worker,
        args=(project_id, project, settings, base_url, on_done),
        daemon=True)
    with _lock:
        _jobs[project_id] = thread
    thread.start()
    return status(project_id)
