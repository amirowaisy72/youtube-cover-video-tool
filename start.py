"""Single-click launcher for the YouTube Cover Video Tool.

Double-click run.bat (Windows) or run.sh (Linux/Mac) — or run
`python start.py` — and this script does everything:

  1. Checks Python 3.10+, FFmpeg, and yt-dlp, printing a clear
     message (and stopping) if something is missing.
  2. Installs requirements.txt if fastapi/uvicorn are missing
     (with a clear error if pip fails, e.g. offline).
  3. Starts the FastAPI app with uvicorn on localhost:8000 in a
     background process. Nothing is hosted live anywhere — the
     server runs only on this computer.
  4. Opens http://localhost:8000 in the default browser.
     That browser page IS the program.
  5. Keeps running until you close it (Ctrl+C, or closing the
     window, stops the server too).

No uvicorn / python -m command is needed from the user.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
URL = "http://localhost:8000"
HEALTH_URL = "http://127.0.0.1:8000/api/health"


def fail(message: str) -> "SystemExit":
    print(f"\nERROR: {message}\n", file=sys.stderr)
    raise SystemExit(1)


def check_python() -> None:
    if sys.version_info < (3, 10):
        fail(
            f"Python 3.10+ is required, found {sys.version}. "
            "Install Python 3.10 or newer from python.org and try again."
        )


def check_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None:
        fail(
            "FFmpeg was not found.\n"
            "  Windows: download it from https://ffmpeg.org/download.html\n"
            "           and add its bin folder to PATH, then double-click again.\n"
            "  macOS:   brew install ffmpeg\n"
            "  Linux:   sudo apt install ffmpeg"
        )


def check_yt_dlp(python: str) -> None:
    if shutil.which("yt-dlp") is not None:
        return
    proc = subprocess.run(
        [python, "-c", "import yt_dlp"], capture_output=True
    )
    if proc.returncode != 0:
        fail(
            "yt-dlp was not found and pip could not install it.\n"
            "Check your internet connection and run: "
            "pip install yt-dlp"
        )


def _can_import(python: str) -> bool:
    proc = subprocess.run(
        [python, "-c", "import fastapi, uvicorn, yt_dlp"],
        capture_output=True,
    )
    return proc.returncode == 0


def ensure_dependencies() -> str:
    """Install requirements.txt only if fastapi/uvicorn are missing.

    Returns the Python executable to run the server with.
    On Windows, a plain pip install normally works. On Linux systems
    with an externally-managed Python (PEP 668), a plain pip install
    is refused, so this falls back to creating a local .venv and
    installing there — still with no command needed from the user.
    """
    if _can_import(sys.executable):
        return sys.executable
    print("Installing required Python packages (fastapi, uvicorn, yt-dlp)…")
    print("This needs internet the first time only.")
    proc = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(ROOT / "requirements.txt")]
    )
    if proc.returncode == 0 and _can_import(sys.executable):
        return sys.executable
    # PEP 668 fallback: local virtual environment.
    print("Plain pip install did not work — trying a local .venv instead…")
    venv_dir = ROOT / ".venv"
    venv_python = (
        venv_dir / "Scripts" / "python.exe"
        if sys.platform.startswith("win")
        else venv_dir / "bin" / "python"
    )
    if not venv_python.exists():
        venv_proc = subprocess.run([sys.executable, "-m", "venv", str(venv_dir)])
        if venv_proc.returncode != 0 or not venv_python.exists():
            fail(
                "pip install failed (are you offline, or is this an "
                "externally-managed Python?). On Windows, connect to the "
                "internet and double-click again. On Linux, run:\n"
                "  python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
            )
    venv_install = subprocess.run(
        [str(venv_python), "-m", "pip", "install", "-r", str(ROOT / "requirements.txt")]
    )
    if venv_install.returncode == 0 and _can_import(str(venv_python)):
        print(f"Using virtual environment: {venv_dir}")
        return str(venv_python)
    fail(
        "Could not install fastapi/uvicorn/yt-dlp. "
        "Check your internet connection and double-click again."
    )
    raise AssertionError("unreachable")


def wait_for_server(timeout: int = 60) -> bool:
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
    check_python()
    check_ffmpeg()
    server_python = ensure_dependencies()
    check_yt_dlp(server_python)

    print(f"\nStarting the tool locally at {URL} …")
    print("Nothing is hosted live — this runs only on your computer.")
    print("The browser page that opens IS the program.")
    print("Keep this window open while you use the tool.")
    print("To stop: press Ctrl+C here, or close this window.\n")

    proc = subprocess.Popen(
        [server_python, "-m", "uvicorn", "backend.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(ROOT),
    )
    try:
        if wait_for_server():
            print(f"Open in your browser: {URL}")
            webbrowser.open(URL)
        else:
            print(
                f"Warning: the server did not answer at {HEALTH_URL} "
                "within 60 seconds. If port 8000 is already in use, "
                "close the other program and double-click again."
            )
            webbrowser.open(URL)
        proc.wait()
    except KeyboardInterrupt:
        print("\nStopping…")
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
