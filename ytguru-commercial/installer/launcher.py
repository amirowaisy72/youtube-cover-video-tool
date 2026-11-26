"""Starts the installed YT Guru (Windows). The shortcuts run:  <app>\\python\\pythonw.exe <app>\\launcher.py

  * The app is plain Python (embeddable Python in <app>\\python), so it can add its optional parts
    later and run Manim as `python -m manim` — no frozen .exe.
  * Videos, models and optional parts live in the data folder chosen in Setup (installed.json).
    The app's content folders are Windows junctions into it, so no tool needs to know.
  * Keys, settings and the license stay in <app>, like every version before.
  * No console window: errors go to launcher-error.log, and problems that stop the start are
    shown in a message box in plain words.
"""
from __future__ import annotations

import ctypes
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
LOG_FILE = BASE_DIR / "launcher-error.log"
PORT = int(os.environ.get("YTG_PORT") or 8000)  # YTG_PORT: automated tests beside a running copy
URL = f"http://127.0.0.1:{PORT}"
HEALTH_URL = URL + "/api/health"

# content folders: <app>\<name> is a junction to <data>\<name>
DATA_DIRS = ("animations", "assets", "autovideos", "channel_branding", "characters", "covers", "data_cache", "groups",
             "jobs", "presenter", "presenter_people", "sfx_cache", "source_cache", "text_cache", "thumbnails", "tts",
             "tts-previews", "voice_clones", "voicebank", "worlds", "backend/av_audio_cache", "backend/models_cache")
# the user's own settings (kept in <app>; Setup's "keep" choice on uninstall copies them to the data folder)
SETTING_FILES = ("license.json", "license-outbox.jsonl", "records.json", "research_cache.json", "research_quota.json",
                 "animator_actions.json", "animator_pack.json", "doctor_ctr.json", "colab_voice.txt",
                 "colab_settings.json", "presenter_speed.json", "client_secrets.json", "tokens",
                 "backend/settings.json", "backend/av_style.json", "backend/footage_memory.json", "backend/my_shapes.json")
BACKUP = "settings-backup"


def _log(message: str) -> None:
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(time.strftime("[%Y-%m-%d %H:%M:%S] ") + message + "\n")
    except OSError:
        pass


def _tell(message: str, question: bool = False) -> bool:
    """A message box (there is no console). question=True -> Yes / No."""
    _log(message)
    if os.environ.get("YTG_NO_WINDOWS"):  # automated tests
        return False
    style = (0x04 | 0x20) if question else 0x30
    return ctypes.windll.user32.MessageBoxW(None, message, "YT Guru", style) == 6


def installed() -> dict:
    return json.loads((BASE_DIR / "installed.json").read_text(encoding="utf-8-sig"))


def is_junction(path: Path) -> bool:
    try:
        return bool(os.lstat(path).st_file_attributes & 0x400)  # a reparse point
    except OSError:
        return False


def move_into(source: Path, target: Path) -> None:
    """Move files (never overwriting) — used to carry an older version's videos over."""
    target.mkdir(parents=True, exist_ok=True)
    for item in list(source.iterdir()):
        goal = target / item.name
        if not goal.exists():
            shutil.move(str(item), str(goal))
        elif item.is_dir() and goal.is_dir():
            move_into(item, goal)
    try:
        source.rmdir()
    except OSError:
        pass


def link_folders(data: Path, app: Path = BASE_DIR) -> None:
    import _winapi

    for name in DATA_DIRS:
        link, target = app / name, data / name
        target.mkdir(parents=True, exist_ok=True)
        if is_junction(link):
            if os.path.exists(link) and os.path.samefile(link, target):
                continue
            os.rmdir(link)  # removes the link only (the data folder was changed in Setup)
        elif link.is_dir():
            move_into(link, target)
            if link.exists():  # a file with the same name is in both places: keep the old one beside it
                link.rename(link.with_name(link.name + "-old"))
        link.parent.mkdir(parents=True, exist_ok=True)
        _winapi.CreateJunction(str(target), str(link))


def migrate_old_version(app: Path = BASE_DIR) -> None:
    """Versions up to 1.0.7 kept videos and settings inside <app>\\_internal: bring them over once."""
    old = app / "_internal"
    if not old.is_dir() or (app / ".migrated").exists():
        return
    for name in DATA_DIRS:
        if (old / name).is_dir() and not is_junction(old / name):
            if name == "backend/models_cache" or (old / name).exists():
                move_into(old / name, app / name)
    for name in SETTING_FILES:
        source, goal = old / name, app / name
        if source.exists() and not goal.exists():
            goal.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(goal))
    (app / ".migrated").write_text("1", encoding="utf-8")
    _log("Videos and settings of the earlier version were moved to their new place.")


def restore_settings(data: Path, app: Path = BASE_DIR) -> None:
    """After "uninstall, keep my videos and settings" and a new install: put the settings back."""
    backup = data / BACKUP
    if not backup.is_dir():
        return
    for name in SETTING_FILES:
        source, goal = backup / name, app / name
        if source.exists() and not goal.exists():
            goal.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(goal))
    shutil.rmtree(backup, ignore_errors=True)


def essentials_ready() -> bool:
    return (BASE_DIR / "python" / "essentials.ok").exists()


def _health() -> dict | None:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=3) as resp:
            return json.loads(resp.read())
    except Exception:  # noqa: BLE001
        return None


def _open_when_ready() -> None:
    for _ in range(240):
        if _health() is not None:
            break
        time.sleep(0.5)
    else:
        _log("WARNING: the server did not answer /api/health in 2 minutes.")
    if not os.environ.get("YTG_NO_WINDOWS"):
        webbrowser.open(URL)


def main() -> int:
    if sys.stdout is None or sys.executable.lower().endswith("pythonw.exe"):
        try:
            if LOG_FILE.exists() and LOG_FILE.stat().st_size > 5_000_000:
                LOG_FILE.unlink()
            stream = open(LOG_FILE, "a", encoding="utf-8", errors="replace")  # noqa: SIM115
            sys.stdout = sys.stderr = stream
        except OSError:
            pass
    running = _health()
    if running is not None:
        if "ffmpeg" in running:  # YT Guru is already open: just show it
            if not os.environ.get("YTG_NO_WINDOWS"):
                webbrowser.open(URL)
            return 0
    try:
        data = Path(installed()["data"])
    except (OSError, ValueError, KeyError):
        _tell("The installation is incomplete (installed.json is missing). Run YT Guru Setup again.")
        return 1
    try:
        data.mkdir(parents=True, exist_ok=True)
    except OSError:
        _tell(f"The data folder cannot be opened:\n{data}\n\nIf it is on a USB or network drive, connect it and start "
              "YT Guru again. Or run Setup again and choose another data folder.")
        return 1
    if not essentials_ready():
        if _tell("Setup did not finish downloading the files YT Guru needs.\n\nDownload them now? (It continues where it "
                 "stopped.)", question=True):
            subprocess.Popen([str(BASE_DIR / "python" / "python.exe"), str(BASE_DIR / "setup_essentials.py"), "--console",
                              "--start"], creationflags=subprocess.CREATE_NEW_CONSOLE)
        return 1
    try:
        migrate_old_version()
        link_folders(data)
        restore_settings(data)
    except OSError as exc:
        _tell(f"A folder could not be prepared:\n{exc}\n\nClose other copies of YT Guru and start it again. The app "
              "folder must be on a normal (NTFS) drive.")
        return 1
    sys.path.insert(0, str(BASE_DIR / "backend"))
    sys.path.insert(0, str(BASE_DIR))
    try:
        import parts

        parts.remove_marked()
        parts.activate()
        import uvicorn

        os.chdir(BASE_DIR)
        threading.Thread(target=_open_when_ready, daemon=True).start()
        uvicorn.run("backend.main:app", host="127.0.0.1", port=PORT, log_level="warning")
    except KeyboardInterrupt:
        return 0
    except SystemExit as exc:  # uvicorn: the port is taken
        if exc.code:
            _tell(f"YT Guru could not start: port {PORT} is used by another program.\nClose that program (or restart the "
                  "PC) and try again.")
        return 1
    except Exception:  # noqa: BLE001
        import traceback

        _log(traceback.format_exc())
        _tell(f"YT Guru could not start. The details are in:\n{LOG_FILE}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
