"""Frozen-app launcher for the installed YT Guru (Windows).

PyInstaller entry point (--onedir, --windowed). Replaces start.py
for the installed build:

  * Bundled ffmpeg.exe / ffprobe.exe are put on PATH (they sit in
    the same folder as this exe after PyInstaller + Inno Setup).
  * Data dirs (jobs, covers, groups, tts, autovideos, tokens) live
    next to the install folder so the customer sees "the project"
    where they installed it.
  * Starts uvicorn on 127.0.0.1:8000, waits for /api/health, opens
    the browser — exactly like start.py, but with no Python install
    and no console window for the customer.
  * License hook: before serving, checks the stored license key
    against the license server (client/licensing.py). If the server
    cannot be reached, credit-consuming endpoints refuse new jobs
    (strict offline mode — see DESIGN.md section 6.3).

Errors go to launcher-error.log next to the exe (there is no console
in --windowed mode, so a silent failure must still leave a trace).

TODO (Phase 2, on the Windows build machine):
- Test that `backend.main:app` imports cleanly from the frozen
  bundle (uvicorn + FastAPI + yt_dlp + PIL inside PyInstaller).
- Decide data-dir location: install folder (simple) vs %APPDATA%
  (survives reinstall). Install folder is drafted here.
- Wire the real license-server URL (env at build time).
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent

LOG_FILE = BASE_DIR / "launcher-error.log"
URL = "http://127.0.0.1:8000"
HEALTH_URL = "http://127.0.0.1:8000/api/health"


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


def main() -> int:
    _ensure_ffmpeg_on_path()
    # Data dirs next to the install, like the source layout.
    for name in ("jobs", "covers", "groups", "tts", "autovideos", "tokens"):
        (BASE_DIR / name).mkdir(exist_ok=True)

    # TODO: license check on startup (client/licensing.py):
    #   - no stored key -> the home page shows the activation box
    #     (the backend still refuses credit endpoints without a
    #     job token, so activation is enforced server-side too).
    #   - key present -> POST /v1/activate to bind this device.
    # Never block the tool from opening on a license-server outage
    # for already-made files; only new jobs are gated.

    env = dict(os.environ)
    env["PYTHONPATH"] = str(BASE_DIR)
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(BASE_DIR),
        env=env,
    )
    try:
        if _wait_for_server():
            webbrowser.open(URL)
        else:
            _log("WARNING: server did not answer /api/health in 60s.")
            webbrowser.open(URL)
        proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
    return proc.returncode or 0


if __name__ == "__main__":
    raise SystemExit(main())
