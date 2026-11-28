"""YT Guru — 3D Explainer API (user, 2026-11-28).

Projects live under ``<repo root>/autovideos/<id>/`` as project.json
(title, narration, sources, shots, settings) + job.json (render
state) — the same folder convention the My Videos library scans.
Credits follow backend/credit_gate.py: a render costs nothing while
charging is off or the price is 0; every licensing call is
best-effort so free mode and unit tests never break.
"""
from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel

from . import assets as assets_mod
from . import assemble as assemble_mod
from . import prompts as prompts_mod
from . import render as render_mod
from . import shots as shots_mod

router = APIRouter(prefix="/api/3d", tags=["explainer3d"])

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROJECTS_DIR = REPO_ROOT / "autovideos"
ACTION = "explainer3d"
CLIENT_VERSION = "1.0.8"
_ID = re.compile(r"^[A-Za-z0-9_-]{1,80}$")


# ------------------------------------------------------------ licensing
def _price() -> float:
    """Current price of one explainer render (0 when free/unavailable)."""
    try:
        import licensing  # noqa: PLC0415 — optional, guarded (user, 2026-11-28)
        if not licensing.charging_enabled():
            return 0
        return float(licensing.price_of(ACTION) or 0)
    except Exception:  # noqa: BLE001 — standalone/tests: free
        return 0


def _consume(project_id: str) -> str:
    """Reserve credits before a render; '' when the render is free."""
    try:
        import licensing  # noqa: PLC0415
        if not licensing.charging_enabled() or licensing.price_of(ACTION) <= 0:
            return ""
        return licensing.consume(ACTION, project_id, CLIENT_VERSION) or ""
    except Exception:  # noqa: BLE001 — never break free mode
        return ""


def _close_token(token: str, ok: bool) -> None:
    if not token:
        return
    try:
        import licensing  # noqa: PLC0415
        if ok:
            licensing.report(token, "completed", tool=ACTION)
        else:
            licensing.refund(token)
    except Exception:  # noqa: BLE001
        pass


# ------------------------------------------------------------ storage
def _folder(project_id: str) -> Path:
    if not _ID.match(project_id or ""):
        raise HTTPException(404, "Project not found.")
    return PROJECTS_DIR / project_id


def _read(path: Path, default):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, type(default)) else default
    except Exception:  # noqa: BLE001
        return default


def _write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _project(project_id: str) -> dict:
    folder = _folder(project_id)
    project = _read(folder / "project.json", {})
    if not project:
        raise HTTPException(404, "Project not found.")
    project["id"] = project_id
    return project


# ------------------------------------------------------------ models
class ProjectIn(BaseModel):
    title: str = ""
    narration: str = ""
    sources: str = ""


class ProjectSave(BaseModel):
    title: str | None = None
    narration: str | None = None
    sources: str | None = None
    shots: list | None = None
    settings: dict | None = None


class RenderIn(BaseModel):
    quality: str = "medium"
    orientation: str = "landscape"
    fps: int | None = None


class FixSaveIn(BaseModel):
    shot: dict


class DownloadIn(BaseModel):
    id: str = ""
    url: str = ""
    source: str = ""
    licence: str = ""


class AssembleIn(BaseModel):
    voice_file: str | None = None
    music_file: str | None = None
    # The shared TTS pipeline returns a download URL / file name; the
    # assemble route resolves it to a local file when it can (the file
    # may also simply be dropped into the project folder as voice.mp3).
    voiceover_url: str | None = None


# ------------------------------------------------------------ routes
@router.get("/status")
def get_status():
    return {"ok": True, "action": ACTION, "cost": _price()}


@router.post("/projects")
def create_project(body: ProjectIn):
    project_id = uuid.uuid4().hex[:12]
    folder = PROJECTS_DIR / project_id
    folder.mkdir(parents=True, exist_ok=True)
    project = {"id": project_id, "title": body.title,
               "narration": body.narration, "sources": body.sources,
               "shots": [], "settings": {}}
    _write(folder / "project.json", project)
    _write(folder / "job.json",
           {"id": project_id, "status": "draft", "title": body.title,
            "message": "Project created."})
    return project


@router.get("/projects/{project_id}")
def get_project(project_id: str):
    project = _project(project_id)
    project["job"] = _read(_folder(project_id) / "job.json", {})
    project["warnings"] = shots_mod.variety_warnings(project.get("shots") or [])
    return project


@router.put("/projects/{project_id}")
def save_project(project_id: str, body: ProjectSave):
    folder = _folder(project_id)
    project = _project(project_id)
    errors: list[str] = []
    for field in ("title", "narration", "sources"):
        value = getattr(body, field)
        if value is not None:
            project[field] = value
    if body.settings is not None:
        project["settings"] = body.settings
    if body.shots is not None:
        clean, errors = shots_mod.validate_shotlist(body.shots)
        project["shots"] = clean
    _write(folder / "project.json", project)
    project["errors"] = errors
    project["warnings"] = shots_mod.variety_warnings(project.get("shots") or [])
    return project


@router.get("/projects/{project_id}/prompt-narration",
            response_class=PlainTextResponse)
def get_narration_prompt(project_id: str):
    project = _project(project_id)
    return prompts_mod.narration_prompt(project.get("title", ""))


@router.get("/projects/{project_id}/prompt-shots",
            response_class=PlainTextResponse)
def get_shots_prompt(project_id: str):
    project = _project(project_id)
    return prompts_mod.shot_prompt(project.get("title", ""),
                                   project.get("narration", ""),
                                   project.get("sources", ""))


@router.get("/projects/{project_id}/shots/{index}/fix-prompt",
            response_class=PlainTextResponse)
def get_fix_prompt(project_id: str, index: int):
    project = _project(project_id)
    if not 0 <= index < len(project.get("shots") or []):
        raise HTTPException(404, "Shot not found.")
    return prompts_mod.fix_shot_prompt(project, index)


@router.post("/projects/{project_id}/shots/{index}/fix-save")
def fix_save(project_id: str, index: int, body: FixSaveIn):
    folder = _folder(project_id)
    project = _project(project_id)
    shots = list(project.get("shots") or [])
    if not 0 <= index < len(shots):
        raise HTTPException(404, "Shot not found.")
    clean, errors = shots_mod.validate_shotlist([body.shot])
    if errors:
        raise HTTPException(422, "; ".join(errors))
    shots[index] = clean[0]
    project["shots"] = shots
    _write(folder / "project.json", project)
    return project


@router.get("/assets")
def get_assets():
    return {"catalogue": assets_mod.catalogue(),
            "downloaded": assets_mod.list_downloaded()}


@router.get("/assets/search")
def search_assets(q: str = Query("")):
    return assets_mod.search_polyhaven(q)


@router.post("/assets/download")
def download_asset(body: DownloadIn):
    target = body.id or body.url
    if not target:
        raise HTTPException(422, "Give an asset id or a URL.")
    licence_info = {}
    if body.source:
        licence_info["source"] = body.source
    if body.licence:
        licence_info["licence"] = body.licence
    result = assets_mod.download_asset(target, licence_info or None)
    if result.get("error"):
        raise HTTPException(400, result["error"])
    return result


@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: str):
    if not assets_mod.delete_asset(asset_id):
        raise HTTPException(404, "Downloaded asset not found.")
    return {"ok": True}


@router.post("/projects/{project_id}/render")
def start_render(project_id: str, body: RenderIn, request: Request):
    project = _project(project_id)
    if not project.get("shots"):
        raise HTTPException(422, "Add a shot list before rendering.")
    settings = {"quality": body.quality, "orientation": body.orientation}
    if body.fps:
        settings["fps"] = body.fps
    project["settings"] = settings
    _write(_folder(project_id) / "project.json", project)
    token = _consume(project_id)
    base_url = str(request.base_url).rstrip("/")

    def _done(ok: bool, _token: str = token) -> None:
        _close_token(_token, ok)

    return render_mod.start_render(project, settings, base_url, on_done=_done)


@router.post("/projects/{project_id}/stop")
def stop_render(project_id: str):
    _project(project_id)
    return render_mod.stop_render(project_id)


@router.get("/projects/{project_id}/render-status")
def render_status(project_id: str):
    _project(project_id)
    return render_mod.status(project_id)


def _resolve_voice(project_id: str, body: AssembleIn) -> str | None:
    """Best-effort: turn the TTS download URL into a local voice file."""
    if body.voice_file:
        return body.voice_file
    url = (body.voiceover_url or "").strip()
    if not url:
        return None
    folder = _folder(project_id)
    name = Path(url.split("?")[0]).name
    candidates = [folder / name, REPO_ROOT / "tts" / name,
                  REPO_ROOT / "tts" / f"{name}.mp3"]
    for cand in candidates:
        if cand.is_file():
            if cand.parent != folder:
                import shutil
                shutil.copyfile(cand, folder / "voice.mp3")
            return "voice.mp3"
    if url.startswith(("http://", "https://")):
        try:  # the app's own file URL on the same machine
            import urllib.request
            target = folder / "voice.mp3"
            urllib.request.urlretrieve(url, target)  # noqa: S310
            if target.is_file() and target.stat().st_size > 0:
                return "voice.mp3"
        except Exception:  # noqa: BLE001 — voice is optional
            pass
    return None


@router.post("/projects/{project_id}/assemble")
def assemble_project(project_id: str, body: AssembleIn):
    _project(project_id)
    voice = _resolve_voice(project_id, body)
    result = assemble_mod.assemble(project_id, voice, body.music_file)
    if body.voiceover_url and not voice:
        result["voice_note"] = (
            "Voiceover file could not be found locally — assembled "
            "without voice. Tip: copy the voice file into the project "
            "folder as voice.mp3 and assemble again.")
    return result


@router.get("/projects/{project_id}/file/{name}")
def project_file(project_id: str, name: str):
    """Serve a finished file (final.mp4, captions.srt…) of a project."""
    folder = _folder(project_id)
    _project(project_id)
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,120}", name or ""):
        raise HTTPException(400, "Bad file name.")
    target = (folder / name).resolve()
    if target.parent != folder.resolve() or not target.is_file():
        raise HTTPException(404, "File not found.")
    return FileResponse(target)


@router.get("/projects/{project_id}/frame/{shot}")
def preview_frame(project_id: str, shot: int, t: float = Query(0.0)):
    """One already-rendered frame (live preview is client-side)."""
    folder = _folder(project_id)
    _project(project_id)
    frames_dir = folder / "frames" / f"shot-{shot + 1:02d}"
    if frames_dir.is_dir():
        frames = sorted(frames_dir.glob("f*.png"))
        if frames:
            fps = max(len(frames) // max(int(
                (_project(project_id).get("shots") or [{}])[shot].get(
                    "duration") or 1) if shot < len(
                        _project(project_id).get("shots") or []) else 1, 1), 1)
            idx = min(int(t * fps), len(frames) - 1)
            return FileResponse(frames[idx], media_type="image/png")
    raise HTTPException(
        404, "No rendered frame yet — the live preview is client-side; "
             "render the project to capture frames.")
