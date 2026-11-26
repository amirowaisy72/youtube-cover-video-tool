"""What the Talking Presenter needs besides the app: two Python libraries (MediaPipe, OpenCV) and three small
model files (about 19 MB). They are kept away from the nearly full system drive when another drive exists.

face_landmarker.task  MediaPipe's face points (Apache-2.0)
yunet.onnx            finds faces, also small ones, in the whole photo (OpenCV Zoo, MIT)
rvm.onnx              cuts the person out of the photo (Robust Video Matting, GPL-3.0, used on this computer)
"""
from __future__ import annotations

import importlib.util
import json
import os
import shutil
import string
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

# name -> (address, size in bytes or 0, what it is)
FILES: dict[str, tuple[str, int, str]] = {
    "face_landmarker.task": ("https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/"
                             "face_landmarker.task", 3758596, "face points"),
    "rvm.onnx": ("https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx",
                 14975696, "cut-out"),
    "yunet.onnx": ("https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/"
                   "face_detection_yunet_2023mar.onnx", 232589, "face finder"),
}
LIBRARIES = ["mediapipe==1.2.3", "opencv-contrib-python==5.1.0.95", "absl-py", "matplotlib", "contourpy", "cycler",
             "fonttools", "kiwisolver", "sounddevice"]

_state: dict = {"busy": False, "file": "", "done": 0, "total": 0, "error": ""}
_stop = threading.Event()


def _settings_file() -> Path:
    import tools_animator as ta
    return ta.BASE_DIR / "presenter_settings.json"


def default_folder() -> Path:
    """On Windows: a fixed drive other than the system drive (the one already used, else the emptiest)."""
    import tools_animator as ta
    if os.name == "nt":
        system = (os.environ.get("SystemDrive") or "C:").upper()
        found = []
        for letter in string.ascii_uppercase:
            drive = f"{letter}:"
            if drive == system:
                continue
            try:
                import ctypes
                if ctypes.windll.kernel32.GetDriveTypeW(drive + "\\") != 3:  # fixed disks only
                    continue
                found.append((shutil.disk_usage(drive + "\\").free, drive))
            except (OSError, AttributeError):
                continue
        existing = [d for _f, d in found if Path(d + "\\YTGuru-AI\\models").is_dir()]
        if existing:
            return Path(existing[0] + "\\YTGuru-AI\\models")
        if found and max(found)[0] > 2**30:
            return Path(max(found)[1] + "\\YTGuru-AI\\models")
    return ta.BASE_DIR / "presenter_models"


def folder() -> Path:
    try:
        saved = json.loads(_settings_file().read_text(encoding="utf-8")).get("models")
    except (OSError, ValueError, AttributeError):
        saved = ""
    return Path(saved) if saved else default_folder()


def set_folder(path_: str) -> Path:
    p = Path(path_.strip().strip('"'))
    if not p.is_absolute():
        raise ValueError("Give a full folder path, for example F:\\YTGuru-AI\\models")
    p.mkdir(parents=True, exist_ok=True)
    _settings_file().write_text(json.dumps({"models": str(p)}), encoding="utf-8")
    return p


def library_folder() -> Path:
    return folder().parent / "pylib"


def add_libraries() -> bool:
    """Make MediaPipe and OpenCV importable (the app's own first, else the folder they were installed into)."""
    def present() -> bool:
        return all(importlib.util.find_spec(n) is not None for n in ("cv2", "mediapipe"))
    if present():
        return True
    extra = str(library_folder())
    if library_folder().is_dir() and extra not in sys.path:
        sys.path.append(extra)  # at the end: the app's own numpy and Pillow stay in charge
        importlib.invalidate_caches()
    return present()


def path(name: str) -> Path:
    f = folder() / name
    if not f.exists():
        raise RuntimeError(f"The model file {name} is missing. In the Photo step press “Set up the presenter”.")
    return f


def have(name: str) -> bool:
    try:
        size = (folder() / name).stat().st_size
    except OSError:
        return False
    return size == FILES[name][1] if FILES[name][1] else size > 100_000


def status() -> dict:
    missing = [n for n in FILES if not have(n)]
    libraries = add_libraries()
    return {"folder": str(folder()), "ready": not missing and libraries, "libraries": libraries, "missing": missing,
            "download": dict(_state)}


def fetch(url: str, target: Path, size: int = 0, progress=None, stop: threading.Event | None = None, tries: int = 40) -> None:
    """One file, resumed where it stopped after every network break."""
    part = target.with_name(target.name + ".part")
    target.parent.mkdir(parents=True, exist_ok=True)
    last = ""
    for attempt in range(tries):
        have_now = part.stat().st_size if part.exists() else 0
        headers = {"User-Agent": "YTGuru"}
        if have_now:
            headers["Range"] = f"bytes={have_now}-"
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as r:
                resumed = r.status == 206
                total = (have_now if resumed else 0) + int(r.headers.get("Content-Length") or 0)
                done = have_now if resumed else 0
                with open(part, "ab" if resumed else "wb") as out:
                    while True:
                        if stop is not None and stop.is_set():
                            raise InterruptedError("stopped")
                        block = r.read(1 << 18)
                        if not block:
                            break
                        out.write(block)
                        done += len(block)
                        if progress:
                            progress(done, total)
            got = part.stat().st_size
            if (size and got != size) or (total and got < total) or got < 1000:
                if size and got > size:
                    part.unlink()
                raise OSError(f"incomplete ({got} bytes)")
            part.replace(target)
            return
        except InterruptedError:
            raise
        except urllib.error.HTTPError as exc:
            if exc.code == 416:  # the part is longer than the file: start again
                part.unlink(missing_ok=True)
            last = f"HTTP {exc.code}"
        except Exception as exc:  # noqa: BLE001
            last = str(exc)[:150]
        if (stop or threading.Event()).wait(min(10, 1 + attempt)):
            raise InterruptedError("stopped")
    raise RuntimeError(f"Could not download {target.name}: {last}. Check the internet connection and try again.")


def install_libraries() -> None:
    """pip into the presenter's own folder, with its cache and temporary files on the same drive."""
    if getattr(sys, "frozen", False):
        raise RuntimeError("This installed version does not include MediaPipe and OpenCV. Install the newest version.")
    target = library_folder()
    base = target.parent
    for sub in ("cache/pip", "tmp"):
        (base / sub).mkdir(parents=True, exist_ok=True)
    env = {**os.environ, "PIP_CACHE_DIR": str(base / "cache" / "pip"), "TMP": str(base / "tmp"), "TEMP": str(base / "tmp")}
    flags = {"creationflags": subprocess.CREATE_NO_WINDOW} if sys.platform == "win32" else {}
    run = subprocess.run([sys.executable, "-m", "pip", "install", "--no-deps", "--upgrade", "--target", str(target), *LIBRARIES],
                         capture_output=True, text=True, timeout=1800, env=env, **flags)
    if run.returncode:
        raise RuntimeError("Installing MediaPipe and OpenCV failed: " + (run.stderr or run.stdout)[-300:])


def setup_all() -> None:
    """Fetch and install whatever is missing (in this thread)."""
    _state.update(busy=True, error="")
    try:
        for n in [n for n in FILES if not have(n)]:
            url, size, _what = FILES[n]
            _state.update(file=n, done=0, total=size)
            fetch(url, folder() / n, size, lambda d, t: _state.update(done=d, total=t), _stop)
        if not add_libraries():
            _state.update(file="MediaPipe and OpenCV (about 300 MB)", done=0, total=0)
            install_libraries()
            if not add_libraries():
                raise RuntimeError("MediaPipe and OpenCV were installed but cannot be loaded. Restart the app.")
    except InterruptedError:
        _state.update(error="Stopped. Press the button again: it carries on where it stopped.")
    except Exception as exc:  # noqa: BLE001
        _state.update(error=str(exc)[:400])
    finally:
        _state.update(busy=False, file="")


def start_setup() -> None:
    if _state["busy"]:
        return
    _stop.clear()
    _state.update(busy=True, error="")
    threading.Thread(target=setup_all, daemon=True).start()
    time.sleep(0.05)


def stop_setup() -> None:
    _stop.set()
