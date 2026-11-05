"""Frozen-app launcher for the installed YT Guru (Windows).

PyInstaller entry point (--onedir, --windowed). Replaces start.py
for the installed build:

  * Bundled ffmpeg.exe / ffprobe.exe are put on PATH (they sit in
    the same folder as this exe after PyInstaller + Inno Setup).
  * Data dirs (jobs, covers, groups, tts, autovideos, tokens) live
    next to the install folder so the customer sees "the project"
    where they installed it.
  * Runs uvicorn IN-PROCESS (import uvicorn, uvicorn.run) — a
    frozen --windowed exe has no `python -m` to spawn, so the old
    subprocess call could never work. The server runs on the main
    thread; a background thread waits for /api/health and opens
    the browser.
  * License hook: before serving, the backend checks the stored
    license key against the license server (backend/licensing.py).
    If the server cannot be reached, credit-consuming endpoints
    refuse new jobs (strict offline mode — see DESIGN.md §6.3);
    already-made files still work.

Errors go to launcher-error.log next to the exe (there is no
console in --windowed mode, so a silent failure must still
leave a trace).
"""

from __future__ import annotations

import os
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent

# The backend package (bundled as data by PyInstaller) and the
# frontend live next to this launcher; make them importable.
sys.path.insert(0, str(BASE_DIR))

LOG_FILE = BASE_DIR / "launcher-error.log"
URL = "http://127.0.0.1:8000"
HEALTH_URL = "http://127.0.0.1:8000/api/health"

if getattr(sys, "frozen", False):
    # --windowed mode has no console: send stdout/stderr to the
    # log file so uvicorn/FastAPI errors still leave a trace.
    try:
        _log_stream = open(LOG_FILE, "a", encoding="utf-8")
        sys.stdout = _log_stream
        sys.stderr = _log_stream
    except OSError:
        pass

try:
    import uvicorn
except ImportError:  # pragma: no cover - only on a broken bundle
    uvicorn = None  # type: ignore[assignment]


def _log(message: str) -> None:
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(time.strftime("[%Y-%m-%d %H:%M:%S] ") + message + "\n")
    except OSError:
        pass


def _ensure_ffmpeg_on_path() -> None:
    """Bundled ffmpeg.exe / ffprobe.exe sit next to this launcher."""
    os.environ["PATH"] = str(BASE_DIR) + os.pathsep + os.environ.get("PATH", "")
    import shutil

    if shutil.which("ffmpeg") is None:
        _log("ERROR: bundled ffmpeg.exe not found next to the launcher.")
        raise SystemExit(1)


def _wait_for_server(timeout: int = 60) -> bool:
    for _ in range(timeout * 2):
        try:
            with urllib.request.urlopen(HEALTH_URL, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def _open_when_ready() -> None:
    if _wait_for_server():
        webbrowser.open(URL)
    else:
        _log("WARNING: server did not answer /api/health in 60s.")
        webbrowser.open(URL)


def _serve() -> None:
    """Run the FastAPI app in-process (no subprocess: a frozen
    --windowed exe cannot spawn `python -m uvicorn`)."""
    if uvicorn is None:
        _log("ERROR: uvicorn is not bundled — the installer is broken.")
        raise SystemExit(1)
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000,
                log_level="warning")


def main() -> int:
    _ensure_ffmpeg_on_path()
    # Data dirs next to the install, like the source layout.
    for name in ("jobs", "covers", "groups", "tts", "autovideos", "tokens"):
        (BASE_DIR / name).mkdir(exist_ok=True)

    # The server runs on the main thread (uvicorn needs it for
    # signal handling); the browser opens from a helper thread
    # once /api/health answers.
    threading.Thread(target=_open_when_ready, daemon=True).start()
    try:
        _serve()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
