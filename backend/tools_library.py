"""YT Guru — My Videos (user, 2026-11-20): every video the app has made or is making, from every video tool,
in one list — watch it, see how much space it takes, and delete it (or keep only the finished video) to free
the disk. Nothing outside the app's own video folders is ever touched.
"""
from __future__ import annotations

import json
import re
import shutil
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/library", tags=["my-videos"])
BASE_DIR = Path(__file__).resolve().parent.parent

# folder -> (tool id, label). Only these folders are listed or cleaned.
ROOTS = {
    "autovideos": ("autovideo", "Auto Video"),
    "animations": ("animator", "Story Animator"),
    "jobs": ("cover", "Cover Video / other tools"),
    "groups": ("cover", "Cover Video (group)"),
    "tts": ("voice", "Text to Voice"),
    "presenter": ("presenter", "Talking Presenter"),
}
VIDEO_EXT = (".mp4", ".webm", ".mov", ".mkv")
AUDIO_EXT = (".mp3", ".wav", ".m4a")
BUSY = {"running", "rendering", "audio", "planning", "voicing", "queued", "writing", "backgrounds", "uploading",
        "processing", "downloading", "collecting", "starting", "working"}
_ID = re.compile(r"^[A-Za-z0-9._-]{1,80}$")


def _size(p: Path) -> int:
    if p.is_file():
        return p.stat().st_size
    total = 0
    for f in p.rglob("*"):
        try:
            if f.is_file():
                total += f.stat().st_size
        except OSError:
            pass
    return total


def _job(p: Path) -> dict:
    try:
        return json.loads((p / "job.json").read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}


def _final(p: Path, job: dict) -> Path | None:
    """The finished video of a folder: the job's own final file, else a file named final*, else the biggest video."""
    for k in ("final_file", "final_path", "video_file", "output"):
        v = job.get(k)
        if isinstance(v, str) and v:
            f = p / Path(v).name
            if f.is_file() and f.suffix.lower() in VIDEO_EXT:
                return f
    for name in ("final-popups.mp4", "final.mp4", "video.mp4", "final-landscape.mp4", "output.mp4"):
        f = p / name
        if f.is_file() and f.stat().st_size > 0:
            return f
    finals = [f for f in p.iterdir() if f.is_file() and f.suffix.lower() in VIDEO_EXT and f.stem.lower().startswith("final")]
    return max(finals, key=lambda f: f.stat().st_mtime) if finals else None


def _kind(root: str, job: dict) -> tuple[str, str]:
    tool, label = ROOTS[root]
    if root == "autovideos":
        scenes = job.get("scenes") or []
        if any((s.get("graphic") or {}).get("theme") == "visual" for s in scenes if isinstance(s, dict)):
            return "visual", "Visual Explainer"
        if any(s.get("docu_tag") or s.get("tags") for s in scenes if isinstance(s, dict)):
            return "autovideo", "Auto Video / Documentary"
    return tool, label


def _busy(job: dict, p: Path) -> bool:
    st = str(job.get("status") or job.get("phase") or "").lower()
    try:
        recent = time.time() - (p / "job.json").stat().st_mtime < 600
    except OSError:
        recent = False
    return st in BUSY and recent


def _path(root: str, item: str) -> Path:
    if root not in ROOTS or not _ID.match(item) or item in (".", ".."):
        raise HTTPException(400, "Bad name.")
    base = (BASE_DIR / root).resolve()
    p = (base / item).resolve()
    if p.parent != base or not p.exists():
        raise HTTPException(404, "Not found.")
    return p


@router.get("")
def list_videos(tool: str = "") -> dict:
    out, total = [], 0
    for root in ROOTS:
        base = BASE_DIR / root
        if not base.is_dir():
            continue
        for p in base.iterdir():
            if not _ID.match(p.name):
                continue
            if p.is_file() and p.suffix.lower() not in AUDIO_EXT + VIDEO_EXT:
                continue
            job = _job(p) if p.is_dir() else {}
            kind, label = _kind(root, job)
            if tool and kind != tool:
                continue
            size = _size(p)
            total += size
            fin = _final(p, job) if p.is_dir() else (p if p.suffix.lower() in VIDEO_EXT else None)
            try:
                when = p.stat().st_mtime
            except OSError:
                when = 0
            out.append({
                "root": root, "id": p.name, "tool": kind, "tool_label": label,
                "title": str(job.get("title") or job.get("name") or (p.stem if p.is_file() else p.name))[:140],
                "status": str(job.get("status") or job.get("phase") or ("done" if fin else "")),
                "busy": _busy(job, p) if p.is_dir() else False,
                "size": size, "final": fin.name if fin else "", "final_size": fin.stat().st_size if fin else 0,
                "audio": p.name if p.is_file() and p.suffix.lower() in AUDIO_EXT else "",
                "modified": when, "folder": p.is_dir(),
            })
    out.sort(key=lambda r: r["modified"], reverse=True)
    try:
        # the videos' own drive (in the installed app they live in the data folder, behind a link)
        videos = BASE_DIR / "autovideos"
        free = shutil.disk_usage(videos if videos.is_dir() else BASE_DIR).free
    except OSError:
        free = 0
    return {"items": out, "total": total, "free": free}


@router.get("/file/{root}/{item}")
def file(root: str, item: str, name: str = "") -> FileResponse:
    p = _path(root, item)
    if p.is_dir():
        if not name or not _ID.match(name):
            raise HTTPException(400, "Bad file.")
        f = (p / name).resolve()
        if f.parent != p or not f.is_file():
            raise HTTPException(404, "Not found.")
    else:
        f = p
    if f.suffix.lower() not in VIDEO_EXT + AUDIO_EXT:
        raise HTTPException(400, "Not a video.")
    media = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".mkv": "video/x-matroska",
             ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4"}[f.suffix.lower()]
    return FileResponse(f, media_type=media, filename=f.name)


@router.delete("/{root}/{item}")
def delete(root: str, item: str, keep_final: bool = False) -> dict:
    """Delete a video (all its working files), or keep_final=True: keep only the finished video (and its
    job file) — the working files (footage, voices, scene clips) are deleted."""
    p = _path(root, item)
    job = _job(p) if p.is_dir() else {}
    if p.is_dir() and _busy(job, p):
        raise HTTPException(409, "This video is still being made — wait until it finishes (if it got stuck because the app was closed, try again in 10 minutes).")
    before = _size(p)
    if root == "presenter" and p.is_dir():  # its saved original audio lives on another drive
        try:
            import tools_talk
            tools_talk.remove_audio(item)
        except Exception as exc:  # noqa: BLE001
            print("presenter audio not removed:", exc)
    if keep_final:
        if not p.is_dir():
            raise HTTPException(400, "Nothing to clean here.")
        fin = _final(p, job)
        if fin is None:
            raise HTTPException(400, "This video is not finished — there is no final video to keep. Delete it instead.")
        for f in list(p.iterdir()):
            if f == fin or f.name == "job.json":
                continue
            if f.is_dir():
                shutil.rmtree(f, ignore_errors=True)
            else:
                try:
                    f.unlink()
                except OSError:
                    pass
        freed = before - _size(p)
    else:
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        else:
            p.unlink(missing_ok=True)
        freed = before
    return {"ok": True, "freed": freed}
