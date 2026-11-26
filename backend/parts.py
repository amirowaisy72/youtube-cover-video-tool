"""Optional parts of the installed app: the big things that are downloaded only when a tool first
needs them, and can be removed again to free space.

In the installed app, <app>/installed.json names the data folder. Run from source (run.bat) there is
no such file: every function here then does nothing and tools behave as they always did.

  GET  /api/parts              every part: installed or not, size, progress of a running download
  POST /api/parts/{id}/get     download and install it (only ever called by a button the user pressed)
  POST /api/parts/cancel       stop; what is already downloaded is kept and continues next time
  POST /api/parts/{id}/remove  delete it and free the space
"""
from __future__ import annotations

import importlib
import json
import os
import shutil
import site
import subprocess
import sys
import threading
import time
import zipfile
from pathlib import Path

import parts_download as dl

ROOT = Path(__file__).resolve().parent.parent
LOCK_FILE = ROOT / "backend" / "parts_lock.json"

PARTS = {
    "whisper": ("Speech recogniser (Whisper)", "Writes down the words in video and sound: Subtitles, Talking Presenter, "
                "word-by-word captions in Auto Video and Visual Explainer."),
    "graphics": ("Motion graphics (Manim)", "Draws the animated scenes: Visual Explainer, presenter graphics, "
                 "Auto Video graphics."),
    "presenter": ("Lip-sync and cut-out (MediaPipe)", "Cuts the person out of your photo and moves the mouth and eyes: "
                  "Talking Presenter."),
    "voice": ("Cloned-voice engine", "Voice Cloner and free acting voices on this PC. (Google Colab is the other choice.)"),
    "browser": ("Small browser for Sources", "Only needed if Microsoft Edge and Google Chrome cannot be used for "
                "source screenshots."),
}


def installed_info() -> dict | None:
    try:
        return json.loads((ROOT / "installed.json").read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return None


def enabled() -> bool:
    return installed_info() is not None


def data_dir() -> Path:
    info = installed_info() or {}
    return Path(info.get("data") or ROOT)


def lock() -> dict:
    return json.loads(LOCK_FILE.read_text(encoding="utf-8"))


def part_dir(pid: str) -> Path:
    return data_dir() / "parts" / pid


def site_dir(pid: str) -> Path:
    return part_dir(pid) / "site"


def model_dir() -> Path:
    return data_dir() / "models"


def hf_repo_dir(repo: str) -> Path:
    return model_dir() / "huggingface" / "hub" / ("models--" + repo.replace("/", "--"))


def stamp(group: dict) -> str:
    """Changes when a new version of the app wants different files for this part."""
    names = sorted(w["name"] for w in group.get("wheels", [])) + sorted(f["name"] for f in group.get("files", []))
    names += [(group.get("hf") or {}).get("commit", ""), (group.get("archive") or {}).get("name", "")]
    return str(abs(hash_text("|".join(names))))


def hash_text(text: str) -> int:
    import hashlib
    return int(hashlib.sha1(text.encode()).hexdigest()[:12], 16)


def have(pid: str) -> bool:
    if not enabled():
        return True
    try:
        mark = json.loads((part_dir(pid) / "ok.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False
    return mark.get("stamp") == stamp(lock()["parts"][pid])


# ------------------------------------------------------------------ sizes
def _targets(pid: str, group: dict) -> list[tuple[dict, Path]]:
    """(file entry, where it is saved) for everything this part downloads."""
    cache = data_dir() / "cache" / pid
    out = [(w, cache / w["name"]) for w in group.get("wheels", []) if w.get("url")]
    out += [(f, model_dir() / pid / f["name"]) for f in group.get("files", [])]
    hf = group.get("hf")
    if hf:
        snap = hf_repo_dir(hf["repo"]) / "snapshots" / hf["commit"]
        out += [(f, snap / f["name"]) for f in hf["files"]]
    if "archive" in group:
        out.append((group["archive"], cache / group["archive"]["name"]))
    return out


def download_size(group: dict) -> int:
    return sum(f.get("size", 0) for f in dl.entry_files(group))


def disk_size(group: dict) -> int:
    """About how much space it takes once installed."""
    total = sum(w.get("installed", w.get("size", 0)) for w in group.get("wheels", []))
    total += sum(f.get("size", 0) for f in group.get("files", []) + (group.get("hf") or {}).get("files", []))
    if "archive" in group:
        total += group["archive"].get("installed", group["archive"]["size"])
    return total


def human(n: float) -> str:
    return f"{n / 1e9:.1f} GB" if n >= 950e6 else f"{max(1, round(n / 1e6))} MB"


def _on_disk(path: Path) -> int:
    for p in (path, path.with_name(path.name + ".part")):
        try:
            return p.stat().st_size
        except OSError:
            continue
    return 0


def info(pid: str) -> dict:
    group = lock()["parts"][pid]
    name, what = PARTS[pid]
    ok = have(pid)
    removing = (data_dir() / "parts" / f"{pid}.remove").exists()  # goes at the next start (files were in use)
    done = download_size(group) if ok else 0 if removing else min(download_size(group),
                                                                  sum(_on_disk(p) for _f, p in _targets(pid, group)))
    return {"id": pid, "name": name, "what": what, "installed": ok, "download": download_size(group), "space": disk_size(group),
            "download_text": human(download_size(group)), "space_text": human(disk_size(group)), "partly": done if not ok else 0,
            "removing": removing}


MODULES = {"manim": "graphics", "manimpango": "graphics", "pymunk": "graphics", "faster_whisper": "whisper",
           "ctranslate2": "whisper", "cv2": "presenter", "mediapipe": "presenter", "torch": "voice", "torchaudio": "voice",
           "chatterbox": "voice"}


def part_of_module(name: str) -> str:
    return MODULES.get(name.split(".")[0], "")


class PartNeeded(RuntimeError):
    def __init__(self, pid: str):
        self.pid = pid
        group = lock()["parts"][pid]
        super().__init__(f"This tool needs {PARTS[pid][0]} ({human(download_size(group))} download). "
                         "Open Dashboard → Downloads to get it, then try again.")


def require(*ids: str) -> None:
    """Call before starting work that needs a part. Never downloads anything by itself."""
    for pid in ids:
        if not have(pid):
            raise PartNeeded(pid)


# ------------------------------------------------------------------ using installed parts
def activate() -> None:
    """Make the installed parts importable in this process."""
    if not enabled():
        return
    for pid in PARTS:
        folder = site_dir(pid)
        if (part_dir(pid) / "ok.json").exists() and folder.is_dir() and str(folder) not in sys.path:
            site.addsitedir(str(folder))
    importlib.invalidate_caches()


def remove_marked() -> None:
    """Finish removals that Windows refused while the files were in use (runs at start, before activate)."""
    if not enabled():
        return
    for mark in (data_dir() / "parts").glob("*.remove"):
        pid = mark.stem
        if pid in PARTS:
            _delete_files(pid)
            if not part_dir(pid).exists():
                mark.unlink(missing_ok=True)


# ------------------------------------------------------------------ download + install
_state = {"busy": False, "part": "", "step": "", "done": 0, "total": 0, "speed": 0, "error": "", "finished": ""}
_stop = threading.Event()
_guard = threading.Lock()


def _no_window() -> dict:
    return {"creationflags": 0x08000000} if os.name == "nt" else {}


def pip_install(wheels: list[Path], target: Path, work: Path, stop: threading.Event, tick=None) -> None:
    """Unpack already downloaded wheels into target (nothing is fetched here)."""
    work.mkdir(parents=True, exist_ok=True)
    listing = work / "install.txt"
    listing.write_text("\n".join(str(w) for w in wheels), encoding="utf-8")
    env = {**os.environ, "TMP": str(work), "TEMP": str(work)}
    log = work / "pip.log"
    with open(log, "w", encoding="utf-8") as out:
        proc = subprocess.Popen([sys.executable, str(ROOT / "python" / "pip.pyz"), "install", "--no-deps", "--no-index",
                                 "--no-compile", "--no-cache-dir", "--disable-pip-version-check", "--upgrade",
                                 "--target", str(target), "-r", str(listing)], stdout=out, stderr=subprocess.STDOUT,
                                env=env, **_no_window())
        while proc.poll() is None:
            if stop.wait(0.4):
                proc.kill()
                proc.wait()
                raise dl.Stopped()
            if tick:
                tick()
    if proc.returncode:
        tail = " ".join(log.read_text(encoding="utf-8", errors="replace").split())[-300:]
        if "No space left" in tail:
            raise dl.DownloadError("The disk is full. Free some space, then try again.")
        raise dl.DownloadError("Installing failed: " + tail)


def download_all(items: list[tuple[dict, Path]], stop: threading.Event, progress) -> None:
    """progress(bytes_done_of_all, total, file_name)"""
    total = sum(f.get("size", 0) for f, _p in items)
    before = 0
    for f, path in items:
        size = f.get("size", 0)
        if not (path.exists() and (not size or path.stat().st_size == size)):
            dl.fetch(f["url"], path, size, f.get("sha256", ""), lambda got, b=before, n=path.name: progress(b + got, total, n), stop)
        before += size
        progress(before, total, path.name)


def _unzip(archive: Path, target: Path) -> None:
    with zipfile.ZipFile(archive) as z:
        z.extractall(target)


def _install(pid: str) -> None:
    group = lock()["parts"][pid]
    items = _targets(pid, group)
    missing = disk_size(group) + sum(max(0, f.get("size", 0) - _on_disk(p)) for f, p in items if "cache" in p.parts)
    data_dir().mkdir(parents=True, exist_ok=True)
    free = shutil.disk_usage(data_dir()).free
    if free < missing + 300e6:
        raise dl.DownloadError(f"Not enough free space on the drive of the data folder: this needs about {human(missing + 300e6)}, "
                               f"{human(free)} is free.")
    last = [time.time(), 0]

    def progress(done, total, name):
        now = time.time()
        if now - last[0] >= 1:
            _state["speed"] = max(0, (done - last[1]) / (now - last[0]))
            last[:] = [now, done]
        _state.update(step="Downloading", done=done, total=total)

    download_all(items, _stop, progress)
    _state.update(step="Installing", speed=0)
    cache = data_dir() / "cache" / pid
    if group.get("wheels"):
        wheels = [cache / w["name"] if w.get("url") else ROOT / "wheels" / w["name"] for w in group["wheels"]]
        fresh = part_dir(pid) / "site.new"
        shutil.rmtree(fresh, ignore_errors=True)
        pip_install(wheels, fresh, cache / "tmp", _stop)
        shutil.rmtree(site_dir(pid), ignore_errors=True)
        if site_dir(pid).exists():
            raise dl.DownloadError("Close YT Guru completely, start it again, and press Download once more.")
        os.replace(fresh, site_dir(pid))
    if group.get("hf"):
        ref = hf_repo_dir(group["hf"]["repo"]) / "refs" / "main"
        ref.parent.mkdir(parents=True, exist_ok=True)
        ref.write_text(group["hf"]["commit"], encoding="utf-8")
    if "archive" in group:
        folder = part_dir(pid) / "ms-playwright" / group["archive"]["folder"]
        shutil.rmtree(folder, ignore_errors=True)
        _unzip(cache / group["archive"]["name"], folder)
        (folder / "INSTALLATION_COMPLETE").write_text("", encoding="utf-8")
    part_dir(pid).mkdir(parents=True, exist_ok=True)
    (part_dir(pid) / "ok.json").write_text(json.dumps({"stamp": stamp(group), "at": int(time.time())}), encoding="utf-8")
    shutil.rmtree(cache, ignore_errors=True)
    activate()


def _work(pid: str) -> None:
    try:
        _install(pid)
        _state.update(finished=pid)
    except dl.Stopped:
        _state.update(error="Cancelled. What is already downloaded is kept: press Download to continue.")
    except dl.DownloadError as exc:
        _state.update(error=str(exc))
    except OSError as exc:
        _state.update(error="Could not save the files: " + dl.explain(exc))
    except Exception as exc:  # noqa: BLE001
        _state.update(error=f"It failed: {str(exc)[:300]}")
    finally:
        _state.update(busy=False, step="", speed=0)


def start(pid: str) -> None:
    with _guard:
        if _state["busy"]:
            if _state["part"] == pid:
                return
            raise RuntimeError("Another download is running. Wait for it to finish, or cancel it.")
        _stop.clear()
        group = lock()["parts"][pid]
        _state.update(busy=True, part=pid, step="Downloading", done=0, total=download_size(group), error="", finished="")
        (data_dir() / "parts" / f"{pid}.remove").unlink(missing_ok=True)
        threading.Thread(target=_work, args=(pid,), daemon=True).start()


def cancel() -> None:
    _stop.set()


def _delete_files(pid: str) -> None:
    group = lock()["parts"][pid]
    (part_dir(pid) / "ok.json").unlink(missing_ok=True)
    shutil.rmtree(data_dir() / "cache" / pid, ignore_errors=True)
    if group.get("files"):
        shutil.rmtree(model_dir() / pid, ignore_errors=True)
    if group.get("hf"):
        shutil.rmtree(hf_repo_dir(group["hf"]["repo"]), ignore_errors=True)
    shutil.rmtree(part_dir(pid), ignore_errors=True)


def remove(pid: str) -> bool:
    """True = gone now; False = some files are in use and go at the next start."""
    if _state["busy"] and _state["part"] == pid:
        raise RuntimeError("This part is downloading. Cancel it first.")
    folder = str(site_dir(pid))
    loaded = any(str(getattr(m, "__file__", "") or "").startswith(folder) for m in list(sys.modules.values()))
    if folder in sys.path:
        sys.path.remove(folder)
    mark = data_dir() / "parts" / f"{pid}.remove"
    if loaded:  # deleting a loaded engine would leave it half there
        mark.parent.mkdir(parents=True, exist_ok=True)
        mark.write_text("", encoding="utf-8")
        (part_dir(pid) / "ok.json").unlink(missing_ok=True)
        return False
    _delete_files(pid)
    if part_dir(pid).exists():
        mark.parent.mkdir(parents=True, exist_ok=True)
        mark.write_text("", encoding="utf-8")
        return False
    importlib.invalidate_caches()
    return True


# ------------------------------------------------------------------ routes
def make_router():
    from fastapi import APIRouter, HTTPException

    router = APIRouter(prefix="/api/parts", tags=["parts"])

    def known(pid: str) -> None:
        if not enabled():
            raise HTTPException(400, "Optional downloads belong to the installed app. From source, use pip.")
        if pid not in PARTS:
            raise HTTPException(404, "Unknown part.")

    @router.get("")
    def status() -> dict:
        if not enabled():
            return {"enabled": False, "parts": [], "state": dict(_state)}
        try:
            free = shutil.disk_usage(data_dir()).free
        except OSError:
            free = 0
        return {"enabled": True, "parts": [info(p) for p in PARTS], "state": dict(_state), "data_folder": str(data_dir()),
                "free": free}

    @router.post("/cancel")
    def stop() -> dict:
        cancel()
        return status()

    @router.post("/{pid}/get")
    def get(pid: str) -> dict:
        known(pid)
        try:
            start(pid)
        except RuntimeError as exc:
            raise HTTPException(409, str(exc)) from exc
        return status()

    @router.post("/{pid}/remove")
    def delete(pid: str) -> dict:
        known(pid)
        try:
            gone = remove(pid)
        except RuntimeError as exc:
            raise HTTPException(409, str(exc)) from exc
        return {**status(), "note": "" if gone else "Close YT Guru and start it again to finish freeing the space."}

    return router
