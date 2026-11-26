"""The "downloading the essential files" step of Setup: Python packages, FFmpeg and Deno (which
yt-dlp needs for YouTube). Runs with the app's own embeddable Python. Resumes where it stopped.

    python.exe setup_essentials.py [--status FILE] [--cancel FILE] [--console] [--start]

--status: Setup reads this file for its progress bar (state / percent / text / heartbeat).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import zipfile
from pathlib import Path

APP = Path(__file__).resolve().parent
sys.path.insert(0, str(APP / "backend"))

import parts  # noqa: E402
import parts_download as dl  # noqa: E402

PYTHON = APP / "python"
SITE = PYTHON / "Lib" / "site-packages"
MARK = PYTHON / "essentials.ok"
BOOT = ("ytg_boot.py", "ytg_boot.pth")


class Status:
    def __init__(self, path: str, console: bool):
        self.path, self.console = Path(path) if path else None, console
        self.state, self.percent, self.text, self.beat = "running", 0, "Starting…", 0
        self.lock = threading.Lock()
        self.shown = 0.0
        threading.Thread(target=self._tick, daemon=True).start()

    def _tick(self) -> None:
        while self.state == "running":
            self.write()
            time.sleep(1)

    def set(self, percent: float, text: str, state: str = "running") -> None:
        self.percent, self.text, self.state = int(percent), text, state
        if state != "running" or time.time() - self.shown > 0.7:
            self.shown = time.time()
            self.write()
            if self.console:
                print(f"\r{self.percent:3d}%  {self.text[:100]:100}", end="" if state == "running" else "\n", flush=True)

    def write(self) -> None:
        if not self.path:
            return
        with self.lock:
            self.beat += 1
            text = self.text.replace("\n", " ")
            temp = self.path.with_suffix(".new")
            try:
                temp.write_text(f"{self.state}\n{self.percent}\n{text}\n{self.beat}\n", encoding="utf-8")
                os.replace(temp, self.path)
            except OSError:
                pass  # Setup is reading it this very moment: the next beat writes again


def stamp(group: dict) -> str:
    names = sorted(w["name"] for w in group["wheels"]) + sorted(p["name"] for p in group["programs"])
    return str(parts.hash_text("|".join(names)))


def ready(group: dict) -> bool:
    try:
        same = MARK.read_text(encoding="utf-8") == stamp(group)
    except OSError:
        return False
    return same and all((APP / "bin" / name).exists() for p in group["programs"] for name in p["take"])


def items(group: dict, cache: Path) -> list[tuple[dict, Path]]:
    return [(f, cache / f["name"]) for f in [w for w in group["wheels"] if w.get("url")] + group["programs"]]


def install(status: Status, stop: threading.Event) -> None:
    group = parts.lock()["essentials"]
    if ready(group):
        status.set(100, "Everything needed is already here.", "done")
        return
    data = parts.data_dir()
    cache = data / "cache" / "essentials"
    cache.mkdir(parents=True, exist_ok=True)
    todo = items(group, cache)
    total = sum(f["size"] for f, _p in todo)
    unpacked = sum(w.get("installed", 0) for w in group["wheels"]) + sum(p.get("installed", 0) for p in group["programs"])
    have = sum(min(f["size"], parts._on_disk(p)) for f, p in todo)
    for folder, need, what in ((data, total - have, "the data folder"), (APP, unpacked, "the install folder")):
        free = shutil.disk_usage(folder).free
        if free < need + 200e6:
            raise dl.DownloadError(f"Not enough free space on the drive of {what}: about {parts.human(need + 200e6)} is "
                                   f"needed, {parts.human(free)} is free.")

    def progress(done: int, whole: int, name: str) -> None:
        status.set(85 * done / whole, f"Downloading {done / 1e6:.0f} of {whole / 1e6:.0f} MB  ({name[:48]})")

    parts.download_all(todo, stop, progress)
    status.set(86, "Installing the downloaded files (a few minutes)…")
    fresh = SITE.with_name("site-packages.new")
    shutil.rmtree(fresh, ignore_errors=True)
    wheels = [cache / w["name"] if w.get("url") else APP / "wheels" / w["name"] for w in group["wheels"]]
    ticks = [86.0]

    def tick() -> None:
        ticks[0] = min(95.0, ticks[0] + 0.05)
        status.set(ticks[0], "Installing the downloaded files (a few minutes)…")

    parts.pip_install(wheels, fresh, cache / "tmp", stop, tick)
    for name in BOOT:
        shutil.copy(SITE / name, fresh / name)
    old = SITE.with_name("site-packages.old")
    shutil.rmtree(old, ignore_errors=True)
    MARK.unlink(missing_ok=True)
    try:
        os.replace(SITE, old)
    except OSError:
        raise dl.DownloadError("YT Guru is still running. Close it (or restart the PC), then press Retry.") from None
    os.replace(fresh, SITE)
    shutil.rmtree(old, ignore_errors=True)
    status.set(96, "Unpacking FFmpeg and Deno…")
    (APP / "bin").mkdir(exist_ok=True)
    for program in group["programs"]:
        with zipfile.ZipFile(cache / program["name"]) as z:
            for member in z.infolist():
                name = member.filename.rsplit("/", 1)[-1]
                if name in program["take"]:
                    with z.open(member) as source, open(APP / "bin" / name, "wb") as out:
                        shutil.copyfileobj(source, out, 1 << 20)
    status.set(98, "Checking that it all starts…")
    check = subprocess.run([str(PYTHON / "python.exe"), "-c",
                            "import fastapi, uvicorn, yt_dlp, PIL, numpy, edge_tts, playwright, googleapiclient"],
                           capture_output=True, text=True, timeout=300, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    if check.returncode:
        raise dl.DownloadError("The installed files do not start: " + " ".join(check.stderr.split())[-250:])
    MARK.write_text(stamp(group), encoding="utf-8")
    shutil.rmtree(cache, ignore_errors=True)
    status.set(100, "Done.", "done")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--status", default="")
    ap.add_argument("--cancel", default="")
    ap.add_argument("--console", action="store_true")
    ap.add_argument("--start", action="store_true", help="open YT Guru when finished")
    args = ap.parse_args()
    status, stop = Status(args.status, args.console), threading.Event()
    if args.cancel:
        def watch() -> None:
            while not stop.wait(0.5):
                if Path(args.cancel).exists():
                    stop.set()
        threading.Thread(target=watch, daemon=True).start()
    try:
        install(status, stop)
        code = 0
    except dl.Stopped:
        status.set(status.percent, "Cancelled. What is already downloaded is kept.", "error")
        code = 2
    except dl.DownloadError as exc:
        status.set(status.percent, str(exc), "error")
        code = 1
    except Exception as exc:  # noqa: BLE001
        import traceback

        try:
            (APP / "setup-error.log").write_text(traceback.format_exc(), encoding="utf-8")
        except OSError:
            pass
        reason = dl.explain(exc) if isinstance(exc, OSError) else str(exc)[:250]
        status.set(status.percent, f"The setup step failed: {reason}", "error")
        code = 1
    if args.console:
        if code == 0 and args.start:
            subprocess.Popen([str(PYTHON / "pythonw.exe"), str(APP / "launcher.py")])
        elif code:
            input("\nPress Enter to close this window.")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
