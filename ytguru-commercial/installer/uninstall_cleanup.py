"""Run by the uninstaller before it removes the program files.

    python.exe uninstall_cleanup.py --keep     keep my videos and settings (in the data folder)
    python.exe uninstall_cleanup.py --delete   remove them too

Only things YT Guru made are touched: a folder the user chose may hold other files.
"""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent
sys.path.insert(0, str(APP))

import launcher  # noqa: E402

MARKER = ".ytguru-data"


def delete(path: Path) -> None:
    if launcher.is_junction(path):
        try:
            os.rmdir(path)  # the link only, never what it points to
        except OSError:
            pass
    elif path.is_dir():
        shutil.rmtree(path, ignore_errors=True)
    else:
        try:
            path.unlink()
        except OSError:
            pass


def clean(app: Path, data: Path | None, keep: bool) -> None:
    if data is not None and keep:
        try:  # videos an older version still holds inside its own folder come out first
            launcher.migrate_old_version(app)
            launcher.link_folders(data, app)
        except OSError:
            return  # better to leave everything than to lose a video
    for name in launcher.DATA_DIRS:
        if launcher.is_junction(app / name):
            delete(app / name)
    if keep:
        if data is not None:
            for name in launcher.SETTING_FILES:
                source, goal = app / name, data / launcher.BACKUP / name
                if source.exists():
                    goal.parent.mkdir(parents=True, exist_ok=True)
                    delete(goal)
                    shutil.move(str(source), str(goal))
    else:
        for name in launcher.SETTING_FILES:
            delete(app / name)
    if data is not None and data.is_dir():
        gone = ["parts", "cache", "models/huggingface", "models/presenter", "models/torch"]  # downloadable again
        if not keep:
            gone += [*launcher.DATA_DIRS, "models", "backend", launcher.BACKUP, MARKER]
        for name in gone:
            delete(data / name)
        for folder in (data / "backend", data / "models", data):
            try:
                folder.rmdir()  # only when empty
            except OSError:
                pass
    left = ["_internal", "bin", "installed.json", ".migrated", "launcher-error.log", "setup-error.log", "manim-error.log",
            "__pycache__", "backend/__pycache__"]
    if keep and data is None:
        left.remove("_internal")
    for name in left:
        delete(app / name)


def main() -> int:
    keep = "--delete" not in sys.argv
    try:
        data = Path(launcher.installed()["data"])
    except (OSError, ValueError, KeyError):
        data = None
    clean(APP, data, keep)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
