"""Talking Presenter, steps 4–9: the presenter photo, the storyboard and its backgrounds, layout and extras,
preview with "Fix this part", the render and the YouTube upload. (Steps 1–3 are in tools_talk.py.)
"""
from __future__ import annotations

import io
import json
import re
import shutil
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageDraw, ImageOps
from pydantic import BaseModel, Field

import licensing
import parts
import presenter_face as pf
import presenter_lipsync as ls
import presenter_models as models
import presenter_video as pv
import tools_talk as talk

router = APIRouter(prefix="/api/presenter", tags=["talking-presenter"])
MAX_UPLOAD = 40 * 2**20
MAX_CLIP = 300 * 2**20
STOCK_HOSTS = ("pexels.com", "pixabay.com", "vimeo.com")


# ------------------------------------------------------------------ setup (libraries and small model files)
@router.get("/setup")
def setup_status() -> dict:
    return models.status()


@router.post("/setup")
def setup_start() -> dict:
    models.start_setup()
    return models.status()


@router.post("/setup/stop")
def setup_stop() -> dict:
    models.stop_setup()
    return models.status()


class Folder(BaseModel):
    path: str = Field(..., min_length=3, max_length=400)


@router.post("/setup/folder")
def setup_folder(req: Folder) -> dict:
    try:
        models.set_folder(req.path)
    except (ValueError, OSError) as exc:
        raise HTTPException(400, f"That folder cannot be used: {exc}") from None
    return models.status()


# ------------------------------------------------------------------ the saved presenters
def _people() -> Path:
    import tools_animator as ta
    path = ta.BASE_DIR / "presenter_people"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _person(pid: str) -> tuple[Path, dict]:
    if not re.fullmatch(r"[a-f0-9]{12}", pid or ""):
        raise HTTPException(404, "That presenter does not exist.")
    folder = _people() / pid
    try:
        return folder, json.loads((folder / "meta.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise HTTPException(404, "That presenter does not exist.") from None


def _save_person(folder: Path, meta: dict) -> dict:
    (folder / "meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    return meta


def _need_setup() -> None:
    if not models.status()["ready"]:
        raise HTTPException(400, "Press “Set up the presenter” first.")


def _picture(data: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img).convert("RGB")
    except Exception:  # noqa: BLE001
        raise HTTPException(400, "That file is not a picture the app can read (use JPG or PNG).") from None
    if max(img.size) > 3000:
        img.thumbnail((3000, 3000), Image.LANCZOS)
    return img


@router.get("/people")
def people() -> dict:
    out = []
    for meta in _people().glob("*/meta.json"):
        try:
            out.append(json.loads(meta.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            continue
    return {"people": sorted(out, key=lambda m: -m.get("created", 0))}


def choose_face(folder: Path, meta: dict, index: int) -> dict:
    """Take the chosen person out of the photo: their picture, face points and cut-out."""
    img = np.asarray(Image.open(folder / "original.jpg").convert("RGB"))
    try:
        photo, _face = pf.prepare(img, index)
        found = pf.faces(photo)
        if not found:
            raise ValueError("No face was found. Use a clear photo where the person looks at the camera.")
        points = pf.mesh(photo, found[0])
        alpha = pf.Matter().still(photo)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None
    Image.fromarray(photo).save(folder / "photo.png")
    Image.fromarray(np.dstack([photo, alpha])).save(folder / "cutout.png")
    np.save(folder / "face.npy", points)
    warnings = list(meta["faces"][index]["warnings"]) if index < len(meta["faces"]) else []
    width = float(np.linalg.norm(points[291] - points[61])) or 1.0
    if float(np.linalg.norm(points[13] - points[14])) / width > 0.2:
        warnings.append("The mouth is wide open in this photo. A closed or gently smiling mouth looks much better.")
    if ls.eye_check(photo, points)["glasses"]:
        warnings.append("Glasses found: blinks are drawn smaller and only inside the eyes; the frames are never moved. "
                        "A photo without glasses blinks most naturally.")
    if (alpha[:2] > 128).mean() > 0.03:
        warnings.append("The top of the head touches the edge of the photo, so it looks flat in the video. Use a photo with "
                        "some space above the head.")
    if (alpha > 128).mean() < 0.05:
        warnings.append("The person could not be cut out well. Use a photo with a calmer background.")
    pf.release()
    meta.update(chosen=index, warnings=warnings, version=int(time.time()))
    return _save_person(folder, meta)


@router.post("/people")
def add_person(file: UploadFile = File(...), name: str = Form("")) -> dict:
    parts.require("presenter")
    _need_setup()
    data = file.file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(400, "The photo is too large (40 MB at most).")
    img = _picture(data)
    array = np.asarray(img)
    found = pf.faces(array)
    if not found:
        raise HTTPException(400, "No clear face was found. Use a photo where the person looks at the camera, with the "
                                 "face large and well lit.")
    faces = pf.judge(array, found)
    pid = uuid.uuid4().hex[:12]
    folder = _people() / pid
    folder.mkdir()
    img.save(folder / "original.jpg", quality=95)
    marked = img.copy()
    draw = ImageDraw.Draw(marked)
    thick = max(3, marked.width // 250)
    for f in faces:
        x, y, w, h = f["box"]
        draw.rectangle((x, y, x + w, y + h), outline=(246, 196, 69), width=thick)
        if len(faces) > 1:
            side = max(24, w // 4)
            draw.rectangle((x, y, x + side, y + side), fill=(246, 196, 69))
            draw.text((x + side / 2, y + side / 2), str(f["index"] + 1), fill="black", anchor="mm", font_size=int(side * 0.7))
    marked.save(folder / "faces.jpg", quality=88)
    meta = _save_person(folder, {"id": pid, "name": name.strip()[:60] or Path(file.filename or "presenter").stem[:60],
                                 "created": time.time(), "faces": faces, "chosen": -1, "warnings": []})
    if len(faces) == 1:
        meta = choose_face(folder, meta, 0)
    else:
        meta["warnings"] = ["There is more than one person. Click the number of the one who should present."]
        _save_person(folder, meta)
    return meta


class Choose(BaseModel):
    index: int = Field(..., ge=0, le=50)


@router.post("/people/{pid}/choose")
def choose(pid: str, req: Choose) -> dict:
    parts.require("presenter")
    _need_setup()
    folder, meta = _person(pid)
    if req.index >= len(meta["faces"]):
        raise HTTPException(400, "There is no such person in this photo.")
    return choose_face(folder, meta, req.index)


@router.delete("/people/{pid}")
def remove_person(pid: str) -> dict:
    folder, _meta = _person(pid)
    shutil.rmtree(folder, ignore_errors=True)
    return {"deleted": True}


@router.get("/people/{pid}/file/{name}")
def person_file(pid: str, name: str) -> FileResponse:
    folder, _meta = _person(pid)
    if name not in ("original.jpg", "faces.jpg", "cutout.png") or not (folder / name).exists():
        raise HTTPException(404, "Not found.")
    return FileResponse(folder / name)


# ------------------------------------------------------------------ the video's settings
def _idle(job_id: str) -> dict:
    job = talk.read(job_id)
    if job_id in talk._running:
        raise HTTPException(409, "A step is still running. Wait for it, or press Stop.")
    return job


def _settings(job: dict) -> dict:
    layout = {**pv.DEFAULT_LAYOUT, **(job.get("layout") or {})}
    extras = {k: {**v, **((job.get("extras") or {}).get(k) or {})} for k, v in pv.DEFAULT_EXTRAS.items()}
    motion = {**ls.DEFAULT_MOTION, **(job.get("motion") or {})}
    return {"layout": layout, "extras": extras, "motion": motion}


def _storyboard_fresh(job: dict) -> bool:
    return bool(job.get("storyboard")) and job.get("storyboard_for") == talk.board_stamp(job)


def extend_public(job: dict) -> dict:
    """What the page needs to know about steps 4–9."""
    folder = talk._dir(job["id"])
    out = {**_settings(job), "has_photo": (folder / "face.npy").exists(), "storyboard_ready": _storyboard_fresh(job),
           "has_final": (folder / "final.mp4").exists(), "video_bg": {**VIDEO_BG, **(job.get("video_bg") or {})}}
    if job.get("storyboard") and job.get("words"):
        full = {**job, **out}
        scenes = []
        for i, s in enumerate(job["storyboard"]):
            try:
                name = f"scene-{i:02d}-{pv.scene_key(folder, full, job['storyboard'], i)}.mp4"
            except (OSError, IndexError):
                name = ""
            scenes.append({**s, "problem": pv.background_problem(folder, s),
                           "preview": name if name and (folder / "preview" / name).exists() else ""})
        out["storyboard"] = scenes
        try:
            whole = f"whole-{pv.whole_key(folder, full)}.mp4"
        except (OSError, IndexError):
            whole = ""
        out["whole_preview"] = whole if whole and (folder / "preview" / whole).exists() else ""
        out["problems"] = pv.problems(folder, full)
        out["render_estimate"] = round(job["storyboard"][-1]["end"] * _speed())
    return out


talk.PUBLIC_EXTRAS.append(extend_public)


class Photo(BaseModel):
    person: str = Field(..., min_length=12, max_length=12)


@router.post("/jobs/{job_id}/photo")
def use_photo(job_id: str, req: Photo) -> dict:
    _idle(job_id)
    folder, meta = _person(req.person)
    if not (folder / "face.npy").exists():
        raise HTTPException(400, "Choose which person presents first.")
    for name in ("photo.png", "cutout.png", "face.npy"):
        shutil.copy(folder / name, talk._dir(job_id) / name)
    return talk.public(talk.update(job_id, person={"id": meta["id"], "name": meta["name"], "version": meta.get("version", 0)}))


def ensure_storyboard(job_id: str, flag) -> dict:
    """Scenes with their times, made from the voiceover (kept until the voice changes)."""
    job = talk.read(job_id)
    if _storyboard_fresh(job):
        return job
    if not job.get("voice_file") or job.get("voice_for") != talk.voice_stamp(job.get("script", ""), job.get("voice") or {}):
        raise RuntimeError("Make the voiceover first (step 3).")
    talk.update(job_id, stage="Timing every word of the voiceover…")
    folder = talk._dir(job_id)
    words = pv.hear_words(folder / "voice.mp3", job["script"])
    if flag.is_set():
        raise talk.Stop()
    duration = float(job.get("voice_duration") or words[-1]["end"])
    scenes = pv.build_scenes(job["script"], words, duration, job.get("storyboard"))
    if job.get("video_bg"):  # scenes that are new after a voice change follow the whole video
        apply_background(scenes, {**VIDEO_BG, **job["video_bg"]})
    shutil.rmtree(folder / "preview", ignore_errors=True)
    return talk.update(job_id, words=words, storyboard=scenes, storyboard_for=talk.board_stamp(job), **_settings(job))


@router.post("/jobs/{job_id}/storyboard")
def storyboard(job_id: str) -> dict:
    parts.require("whisper")
    _idle(job_id)
    talk.start(job_id, "storyboard", lambda flag: ensure_storyboard(job_id, flag))
    return talk.public(talk.read(job_id))


def _scene(job: dict, index: int) -> dict:
    scenes = job.get("storyboard") or []
    if not 0 <= index < len(scenes):
        raise HTTPException(404, "There is no such scene. Make the storyboard first.")
    return scenes[index]


def _save_scenes(job: dict) -> dict:
    return talk.public(talk.update(job["id"], storyboard=job["storyboard"]))


# ------------------------------------------------------------------ backgrounds: the whole video, then single scenes
VIDEO_BG = {"type": "color", "color": "#1b2433", "files": []}
_KEPT = ("files", "parts", "code", "test", "credit")
_NUMBERS = re.compile(r"\d|[$€£%]|\b(?:hundred|thousand|million|billion|trillion|percent|half|halves|third|quarter|double|doubled|"
                      r"triple|twice|once|dozen|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|fifty)\b|"
                      r"\b(?:more|less|fewer|bigger|smaller|higher|lower|faster|slower) than\b|\bcompared\b|\bversus\b|\bvs\b",
                      re.I)


def mix_choice(narration: str) -> str:
    """"Mix (auto)": numbers and comparisons are shown with graphics, everything else with stock footage."""
    return "graphic" if _NUMBERS.search(narration) else "stock"


def switch_type(bg: dict, kind: str) -> None:
    """Change a background's type; what each type had is kept, so switching back brings it back."""
    if kind == bg.get("type"):
        return
    saved = bg.pop("saved", {})
    saved[bg.get("type", "color")] = {k: bg[k] for k in _KEPT if k in bg}
    for k in _KEPT:
        bg.pop(k, None)
    bg.update(type=kind, **saved.pop(kind, {}), saved=saved)


def apply_background(scenes: list[dict], whole: dict, include_own: bool = False) -> None:
    """Give the scenes the whole video's background (not the ones changed one by one, unless include_own)."""
    if include_own:
        for s in scenes:
            s["bg"].pop("own", None)
    spread = pv.spread_slides(whole["files"], scenes) if whole["type"] == "slides" and whole.get("files") and scenes else None
    for i, s in enumerate(scenes):
        bg = s["bg"]
        if bg.get("own"):
            continue
        kind = mix_choice(s["narration"]) if whole["type"] == "mix" else whole["type"]
        switch_type(bg, kind)
        if kind == "color":
            bg["color"] = whole.get("color") or VIDEO_BG["color"]
        elif kind == "image" and whole.get("files"):
            bg["files"] = [whole["files"][0]]
        elif kind == "slides" and spread:
            bg["parts"] = spread[i]
            bg["files"] = [p["file"] for p in spread[i]]


class VideoBg(BaseModel):
    type: str | None = Field(None, pattern="^(color|graphic|stock|image|slides|mix)$")
    color: str | None = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    include_own: bool = False  # also the scenes changed one by one


def _board(job_id: str) -> dict:
    job = _idle(job_id)
    if not job.get("storyboard"):
        raise HTTPException(400, "Make the storyboard first.")
    return job


@router.post("/jobs/{job_id}/video-bg")
def video_background(job_id: str, req: VideoBg) -> dict:
    job = _board(job_id)
    whole = {**VIDEO_BG, **(job.get("video_bg") or {})}
    if req.type and req.type != whole["type"]:
        if {req.type, whole["type"]} != {"image", "slides"}:
            whole["files"] = []
        whole["type"] = req.type
    if req.color:
        whole["color"] = req.color
    apply_background(job["storyboard"], whole, req.include_own)
    return talk.public(talk.update(job_id, video_bg=whole, storyboard=job["storyboard"]))


def _save_images(job_id: str, files: list[UploadFile], most: int) -> list[str]:
    if len(files) > most:
        raise HTTPException(400, f"At most {most} images at once.")
    names = []
    for f in files:
        data = f.file.read(MAX_UPLOAD + 1)
        if len(data) > MAX_UPLOAD:
            raise HTTPException(400, f"{f.filename} is too large (40 MB at most).")
        name = f"img-{uuid.uuid4().hex[:10]}.jpg"
        _picture(data).save(_media(job_id) / name, quality=92)
        names.append(name)
    return names


@router.post("/jobs/{job_id}/video-bg/files")
def video_background_files(job_id: str, files: list[UploadFile] = File(...)) -> dict:
    job = _board(job_id)
    whole = {**VIDEO_BG, **(job.get("video_bg") or {})}
    if whole["type"] not in ("image", "slides"):
        raise HTTPException(400, "Choose “One image” or “Sliding images” for the whole video first.")
    whole["files"] = _save_images(job_id, files[:1] if whole["type"] == "image" else files, 80)
    apply_background(job["storyboard"], whole)
    return talk.public(talk.update(job_id, video_bg=whole, storyboard=job["storyboard"]))


class SceneReq(BaseModel):
    presenter: bool | None = None
    position: str | None = Field(None, pattern="^(|bottom-left|bottom-right|center|hidden)$")
    size: float | None = Field(None, ge=0, le=0.98)
    effect: str | None = Field(None, pattern="^(|none|shadow|border)$")
    wave: str | None = Field(None, pattern="^(|on|off)$")           # "" = as the whole video
    subs: str | None = Field(None, pattern="^(|on|off)$")
    subs_position: str | None = Field(None, pattern="^(|bottom|middle|top)$")
    type: str | None = Field(None, pattern="^(color|graphic|stock|image|slides)$")
    color: str | None = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    query: str | None = Field(None, max_length=100)
    apply_all: bool = False  # this scene's background, presenter and position for every scene


@router.post("/jobs/{job_id}/scenes/{index}")
def edit_scene(job_id: str, index: int, req: SceneReq) -> dict:
    job = _idle(job_id)
    scene = _scene(job, index)
    for key in ("presenter", "position", "size", "effect"):
        if getattr(req, key) is not None:
            scene[key] = getattr(req, key)
    for value, group, key in ((req.wave, "wave", "on"), (req.subs, "subs", "on"), (req.subs_position, "subs", "position")):
        if value is None:
            continue
        own = scene.setdefault("extras", {}).setdefault(group, {})
        if value == "":
            own.pop(key, None)
        else:
            own[key] = value == "on" if key == "on" else value
    bg = scene["bg"]
    if req.type or req.color:
        if req.type:
            switch_type(bg, req.type)
        if req.color:
            bg["color"] = req.color
        bg["own"] = True
    if req.query is not None:
        bg["query"] = req.query
    if req.apply_all:  # everything this scene shows, not only its type
        whole = {**VIDEO_BG, "type": bg.get("type", "color"), "color": bg.get("color") or VIDEO_BG["color"],
                 "files": list(bg.get("files") or [])}
        for other in job["storyboard"]:
            other["presenter"], other["position"] = scene["presenter"], scene.get("position", "")
            if other is scene:
                other["bg"].pop("own", None)
                continue
            target = other["bg"]
            target.pop("own", None)
            switch_type(target, whole["type"])
            if whole["type"] == "color":
                target["color"] = whole["color"]
            elif whole["type"] in ("image", "slides", "stock") and bg.get("files"):
                target["files"] = list(bg["files"])
                target.pop("parts", None)
                if bg.get("credit"):
                    target["credit"] = bg["credit"]
        job["video_bg"] = whole
        return talk.public(talk.update(job_id, video_bg=whole, storyboard=job["storyboard"]))
    return _save_scenes(job)


class Reset(BaseModel):
    part: str = Field(..., pattern="^(bg|layout|extras)$")
    scene: int | None = Field(None, ge=0, le=999)  # one scene; None = every scene


@router.post("/jobs/{job_id}/reset")
def reset(job_id: str, req: Reset) -> dict:
    """Back to the whole video's settings."""
    job = _board(job_id)
    chosen = [_scene(job, req.scene)] if req.scene is not None else job["storyboard"]
    for s in chosen:
        if req.part == "layout":
            s.update(presenter=True, position="", size=0, effect="")
        elif req.part == "extras":
            s.pop("extras", None)
        else:
            s["bg"].pop("own", None)
    if req.part == "bg":
        apply_background(job["storyboard"], {**VIDEO_BG, **(job.get("video_bg") or {})})
    return _save_scenes(job)


def _media(job_id: str) -> Path:
    path = talk._dir(job_id) / "media"
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.post("/jobs/{job_id}/scenes/{index}/files")
def scene_files(job_id: str, index: int, files: list[UploadFile] = File(...)) -> dict:
    job = _idle(job_id)
    scene = _scene(job, index)
    kind = scene["bg"].get("type")
    if kind not in ("image", "slides"):
        raise HTTPException(400, "Choose “One image” or “Sliding images” for this scene first.")
    scene["bg"].pop("parts", None)
    scene["bg"].update(files=_save_images(job_id, files[:1] if kind == "image" else files, 12), own=True)
    return _save_scenes(job)


def download_stock(url: str, folder: Path, flag=None) -> str:
    parts = urllib.parse.urlparse(url)
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or not any(host == h or host.endswith("." + h) for h in STOCK_HOSTS):
        raise RuntimeError("Only clips from Pexels or Pixabay can be downloaded.")
    name = f"stock-{uuid.uuid4().hex[:10]}.mp4"
    part = folder / (name + ".part")
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "YTGuru"}), timeout=60) as r, \
                open(part, "wb") as out:
            total = 0
            while True:
                if flag is not None and flag.is_set():
                    raise talk.Stop()
                block = r.read(1 << 18)
                if not block:
                    break
                total += len(block)
                if total > MAX_CLIP:
                    raise RuntimeError("That clip is too large.")
                out.write(block)
        part.replace(folder / name)
    finally:
        part.unlink(missing_ok=True)
    return name


class StockPick(BaseModel):
    url: str = Field(..., min_length=10, max_length=1500)
    credit: str = Field("", max_length=200)


@router.post("/jobs/{job_id}/scenes/{index}/stock")
def pick_stock(job_id: str, index: int, req: StockPick) -> dict:
    job = _idle(job_id)
    scene = _scene(job, index)
    try:
        name = download_stock(req.url, _media(job_id))
    except talk.Stop:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"The clip could not be downloaded: {str(exc)[:200]}") from None
    switch_type(scene["bg"], "stock")
    scene["bg"].update(files=[name], credit=req.credit, own=True)
    return _save_scenes(job)


_COMMON = set("about after again also because before being between could every first from have into just like many more most "
              "much only other over some such than that their them then there these they this those through very want were what "
              "when where which while will with would your".split())


def search_words(narration: str) -> str:
    words = [w for w in re.findall(r"[A-Za-z]{4,}", narration) if w.lower() not in _COMMON]
    return " ".join(sorted(dict.fromkeys(words), key=len, reverse=True)[:2]) or "background"


class StockAuto(BaseModel):
    source: str = Field(..., pattern="^(pexels|pixabay)$")
    key: str = Field(..., min_length=5, max_length=200)
    again: bool = False  # new clips also for the scenes that have one (not the ones picked one by one)


@router.post("/jobs/{job_id}/stock-auto")
def stock_auto(job_id: str, req: StockAuto) -> dict:
    job = _idle(job_id)
    if not job.get("storyboard"):
        raise HTTPException(400, "Make the storyboard first.")

    def work(flag):
        import tools_stock
        current = talk.read(job_id)
        scenes = current["storyboard"]
        old = set()
        if req.again:
            for s in scenes:
                if s["bg"].get("type") == "stock" and not s["bg"].get("own"):
                    old.update(s["bg"].pop("files", []) or [])
        todo = [i for i, s in enumerate(scenes) if s["bg"].get("type") == "stock" and pv.background_problem(talk._dir(job_id), s)]
        if not todo:
            raise RuntimeError("No stock scene is waiting for a clip. Set a scene's background to “Stock footage” first.")
        upright = current["layout"]["format"] == "short"
        used: set = set(current.get("stock_used") or []) if req.again else set()
        missed = []
        for n, i in enumerate(todo):
            if flag.is_set():
                raise talk.Stop()
            query = scenes[i]["bg"].get("query") or search_words(scenes[i]["narration"])
            talk.update(job_id, progress=round(100 * n / len(todo)), stage=f"Finding a clip for scene {i + 1}: {query}…")
            find = tools_stock._search_pexels if req.source == "pexels" else tools_stock._search_pixabay
            orientation = ("portrait" if req.source == "pexels" else "vertical") if upright else None
            results = find(query, 1, req.key.strip(), orientation)["results"]
            hit = next((r for r in results if r["video_url"] not in used), None)
            if hit is None:
                missed.append(str(i + 1))
                continue
            used.add(hit["video_url"])
            name = download_stock(hit["video_url"], _media(job_id), flag)
            scenes[i]["bg"].update(files=[name], query=query, credit=f"{req.source.title()}: {hit.get('user') or ''}".strip())
            talk.update(job_id, storyboard=scenes, stock_used=sorted(used)[-300:])
        talk.update(job_id, notice=f"No clip was found for scene {', '.join(missed)}: change its search words." if missed else "")

    talk.start(job_id, "stock", work)
    return talk.public(talk.read(job_id))


# ------------------------------------------------------------------ graphics (Script mode scene code)
def graphics_prompt_for(job: dict) -> str:
    import tools_script as ts
    scenes = job["storyboard"]
    wanted = [i for i, s in enumerate(scenes) if s["bg"].get("type") == "graphic"]
    if not wanted:
        raise HTTPException(400, "No scene uses graphics yet. Set a scene's background to “Graphics” first.")
    subset = [pv.graphic_scene(scenes)[i] for i in wanted]
    prompt = ts.build_prompt(job.get("title") or "My video", subset, job.get("sources"))
    head, mark, tail = prompt.partition("\nTHE SCENES:\n")
    tail = re.sub(r"(?m)^SCENE (\d+) \(", lambda m: f"SCENE {wanted[int(m.group(1)) - 1] + 1} (", tail)
    layout = {**pv.DEFAULT_LAYOUT, **(job.get("layout") or {})}
    notes = []
    for i in wanted:
        s = scenes[i]
        position = s.get("position") or layout["position"]
        if s.get("presenter") and position != "hidden":
            area = {"bottom-right": "the right third (x greater than 2)", "bottom-left": "the left third (x less than -2)",
                    "center": "the lower middle (put everything in the upper half, or far left and far right)"}[position]
            notes.append(f"  Scene {i + 1}: keep {area} empty.")
    extra = ("\n\nTHIS VIDEO HAS A PRESENTER standing in front of the animation, with a voice wave and captions along the "
             "bottom. Keep the bottom quarter of the picture free of important things.\n" + "\n".join(notes))
    return (head + mark + tail + extra + "\nWrite code only for these scenes, and keep these scene numbers in the "
            "markers: " + ", ".join(f"# === SCENE {i + 1} ===" for i in wanted))


@router.get("/jobs/{job_id}/graphics/prompt")
def graphics_prompt(job_id: str) -> dict:
    job = talk.read(job_id)
    if not job.get("storyboard"):
        raise HTTPException(400, "Make the storyboard first.")
    return {"prompt": graphics_prompt_for(job)}


class Code(BaseModel):
    text: str = Field(..., min_length=1, max_length=400_000)
    scene: int | None = Field(None, ge=0, le=999)  # the code of this one scene (Fix this part)


def _test_scenes(job_id: str, wanted: list[int], flag) -> None:
    import tools_script as ts
    import tools_source
    folder = talk._dir(job_id)
    work = folder / "graphics"
    for n, i in enumerate(wanted):
        if flag.is_set():
            raise talk.Stop()
        job = talk.read(job_id)
        scenes = job["storyboard"]
        talk.update(job_id, progress=round(100 * n / len(wanted)), stage=f"Testing the graphics of scene {i + 1}…")
        pv.write_word_files(work, scenes, job["words"])
        script = pv.graphic_scene(scenes)
        script[i]["visual_file"] = (scenes[i]["bg"].get("test") or {}).get("video") or ""
        result = ts.test_scene({"scenes": script, "video_type": job["layout"]["format"]}, i, work)
        scenes[i]["bg"]["test"] = {"ok": result["ok"], "error": result.get("error", ""), "warnings": result.get("warnings", []),
                                   "frames": result.get("frames", []), "sheet": result.get("sheet", ""),
                                   "video": script[i].get("visual_file") or ""}
        tools_source.add_found(job, script[i].get("auto_sources") or [])
        talk.update(job_id, storyboard=scenes, sources=job.get("sources") or [])


@router.post("/jobs/{job_id}/graphics/save")
def graphics_save(job_id: str, req: Code) -> dict:
    parts.require("graphics")
    import tools_script as ts
    import tools_source
    job = _idle(job_id)
    scenes = job.get("storyboard") or []
    code_text, found = tools_source.split_answer(req.text)
    if req.scene is not None:
        _scene(job, req.scene)
        parsed = ts.parse(code_text)
        code = parsed.get(req.scene + 1) or (next(iter(parsed.values())) if len(parsed) == 1 else "") or ts.single_block(code_text)
        parsed = {req.scene + 1: code} if code.strip() else {}
    else:
        parsed = ts.parse(code_text)
    saved = []
    tools_source.merge_found(job, found)
    for number, code in parsed.items():
        i = number - 1
        if 0 <= i < len(scenes) and scenes[i]["bg"].get("type") == "graphic":
            scenes[i]["bg"]["code"] = code
            scenes[i]["bg"].pop("test", None)
            saved.append(i)
    if not saved:
        raise HTTPException(400, "No scene code was found for a graphics scene. Paste the whole code block, with its "
                                 "“# === SCENE n ===” lines.")
    talk.update(job_id, storyboard=scenes)
    talk.start(job_id, "graphics", lambda flag: _test_scenes(job_id, sorted(saved), flag))
    return talk.public(talk.read(job_id))


@router.get("/jobs/{job_id}/graphics/fix/{index}")
def graphics_fix(job_id: str, index: int) -> dict:
    import tools_script as ts
    job = talk.read(job_id)
    scene = _scene(job, index)
    test = scene["bg"].get("test") or {}
    prompt = ts.fix_prompt(job.get("title") or "My video", pv.graphic_scene(job["storyboard"]), index, test.get("error", ""),
                           test.get("warnings", []), job.get("sources"))
    return {"prompt": prompt, "sheet": test.get("sheet", "")}


# ------------------------------------------------------------------ layout, extras, presenter movement
class SettingsReq(BaseModel):
    layout: dict | None = None
    extras: dict | None = None
    motion: dict | None = None


def _colour(value, fallback: str) -> str:
    return value if isinstance(value, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", value) else fallback


@router.post("/jobs/{job_id}/settings")
def settings(job_id: str, req: SettingsReq) -> dict:
    job = _idle(job_id)
    now = _settings(job)
    layout, extras, motion = now["layout"], now["extras"], now["motion"]
    new = req.layout or {}
    if new.get("format") in pv.SIZES and new["format"] != layout["format"]:
        layout.update(format=new["format"], **pv.PRESETS[new["format"]])
    if new.get("position") in pv.POSITIONS:
        layout["position"] = new["position"]
    if isinstance(new.get("size"), (int, float)):
        layout["size"] = round(max(0.2, min(0.98, float(new["size"]))), 3)
    if new.get("effect") in ("none", "shadow", "border"):
        layout["effect"] = new["effect"]
    layout["border_color"] = _colour(new.get("border_color"), layout["border_color"])
    wave, subs = (req.extras or {}).get("wave") or {}, (req.extras or {}).get("subs") or {}
    for group, given in (("wave", wave), ("subs", subs)):
        if isinstance(given.get("on"), bool):
            extras[group]["on"] = given["on"]
    if wave.get("style") in ("bars", "line", "dots"):
        extras["wave"]["style"] = wave["style"]
    extras["wave"]["color"] = _colour(wave.get("color"), extras["wave"]["color"])
    if subs.get("style") in ("pop", "highlight", "box"):
        extras["subs"]["style"] = subs["style"]
    if subs.get("font") in pv.FONTS:
        extras["subs"]["font"] = subs["font"]
    if subs.get("position") in ("bottom", "middle", "top"):
        extras["subs"]["position"] = subs["position"]
    if isinstance(subs.get("size"), (int, float)):
        extras["subs"]["size"] = round(max(0.6, min(1.8, float(subs["size"]))), 2)
    for key in ("color", "highlight"):
        extras["subs"][key] = _colour(subs.get(key), extras["subs"][key])
    moved = req.motion or {}
    for key, low, high in (("mouth", 0.3, 1.6), ("head", 0.0, 2.0)):
        if isinstance(moved.get(key), (int, float)):
            motion[key] = round(max(low, min(high, float(moved[key]))), 2)
    if isinstance(moved.get("blink"), bool):
        motion["blink"] = moved["blink"]
    return talk.public(talk.update(job_id, layout=layout, extras=extras, motion=motion))


# ------------------------------------------------------------------ preview, render, files, upload
def _speed_file() -> Path:
    import tools_animator as ta
    return ta.BASE_DIR / "presenter_speed.json"


def _speed() -> float:
    """Seconds of work per second of video (measured on the last render here)."""
    try:
        return float(json.loads(_speed_file().read_text(encoding="utf-8"))["per_second"])
    except (OSError, ValueError, KeyError, TypeError):
        return 2.5


def _require_parts(job_id: str) -> None:
    """The optional downloads this video needs before a preview or a render."""
    job = talk.read(job_id)
    scenes = job.get("storyboard") or []
    need = ["presenter"]
    if not _storyboard_fresh(job):
        need.append("whisper")
    if any((s.get("bg") or {}).get("type") == "graphic" for s in scenes):
        need.append("graphics")
    parts.require(*need)


@router.post("/jobs/{job_id}/preview/{index}")
def preview(job_id: str, index: int) -> dict:
    _require_parts(job_id)
    _idle(job_id)

    def work(flag):
        job = ensure_storyboard(job_id, flag)
        i = max(0, min(index, len(job["storyboard"]) - 1))
        talk.update(job_id, stage=f"Making the preview of scene {i + 1}…")
        shown = [0.0]

        def progress(f):
            if time.time() - shown[0] > 0.7:
                shown[0] = time.time()
                talk.update(job_id, progress=round(100 * f))
        pv.preview(talk._dir(job_id), talk.read(job_id), i, progress, flag.is_set)

    talk.start(job_id, "preview", work)
    return talk.public(talk.read(job_id))


@router.post("/jobs/{job_id}/preview-all")
def preview_all(job_id: str) -> dict:
    _require_parts(job_id)
    _idle(job_id)

    def work(flag):
        ensure_storyboard(job_id, flag)
        current = talk.update(job_id, **_settings(talk.read(job_id)))
        shown = [0.0]

        def progress(f, text):
            if time.time() - shown[0] > 0.8 or f > 0.9:
                shown[0] = time.time()
                talk.update(job_id, progress=round(100 * f, 1), stage=text)
        pv.preview_whole(talk._dir(job_id), current, progress, flag.is_set)

    talk.start(job_id, "preview", work)
    return talk.public(talk.read(job_id))


def _charge(job: dict) -> str:
    """Reserve the credit before any work. A video that was already paid for renders again for free."""
    if job.get("paid"):
        return ""
    try:
        return licensing.consume("presenter", job["id"], "1.0.8")
    except licensing.LicenseError as exc:
        code = int(str(exc)[:3]) if str(exc)[:3] in ("401", "403") else 402
        raise HTTPException(code, re.sub(r"^\d{3}:\s*", "", str(exc)) or "License check failed.") from None


@router.post("/jobs/{job_id}/render")
def render(job_id: str) -> dict:
    _require_parts(job_id)
    job = _idle(job_id)
    if not _storyboard_fresh(job):
        raise HTTPException(400, "The voiceover changed: make the storyboard again (step 6).")
    wrong = pv.problems(talk._dir(job_id), {**job, **_settings(job)})
    if wrong:
        raise HTTPException(400, " ".join(wrong[:4]))
    token = _charge(job)

    def work(flag):
        try:
            make(flag)
        except BaseException:
            if token:
                licensing.refund(token)
            licensing.report_usage(tool="presenter", title=job.get("title") or "", status="failed")
            raise
        minutes = round(talk.read(job_id)["storyboard"][-1]["end"] / 60, 2)
        if token:
            licensing.report(token, "completed", tool="presenter", title=job.get("title") or "", minutes=minutes)
            talk.update(job_id, paid=True)
        licensing.report_usage(tool="presenter", title=job.get("title") or "", status="completed", minutes=minutes)

    def make(flag):
        current = talk.update(job_id, **_settings(talk.read(job_id)))
        shown = [0.0]

        def progress(f, text):
            if time.time() - shown[0] > 0.8 or f > 0.9:
                shown[0] = time.time()
                talk.update(job_id, progress=round(100 * f, 1), stage=text)
        started = time.time()
        fresh = not list((talk._dir(job_id) / "scenes").glob("*.mp4"))
        pv.render(talk._dir(job_id), current, progress, flag.is_set)
        took, long = time.time() - started, current["storyboard"][-1]["end"]
        if fresh and long > 5:
            _speed_file().write_text(json.dumps({"per_second": round(took / long, 3)}), encoding="utf-8")
        talk.update(job_id, rendered={"seconds": round(took), "length": round(long, 1), "at": int(time.time())})

    try:
        talk.start(job_id, "render", work)
    except BaseException:
        if token:
            licensing.refund(token)
        raise
    return talk.public(talk.read(job_id))


@router.get("/jobs/{job_id}/file/{area}/{name}")
def job_file(job_id: str, area: str, name: str) -> FileResponse:
    if area not in ("media", "preview", "graphics", "final") or not re.fullmatch(r"[A-Za-z0-9._-]{1,90}", name) or ".." in name:
        raise HTTPException(404, "Not found.")
    folder = talk._dir(job_id)
    path = folder / "final.mp4" if area == "final" else folder / area / name
    if not path.is_file() or path.suffix.lower() not in (".mp4", ".jpg", ".png"):
        raise HTTPException(404, "Not found.")
    return FileResponse(path, filename=f"presenter-{job_id}.mp4" if area == "final" else path.name,
                        content_disposition_type="inline")


class Upload(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field("", max_length=4900)
    tags: str = Field("", max_length=500)
    privacy: str = Field("private", pattern="^(private|unlisted|public)$")
    channel_id: str = Field("", max_length=100)


@router.post("/jobs/{job_id}/upload")
def upload(job_id: str, req: Upload) -> dict:
    job = _idle(job_id)
    final = talk._dir(job_id) / "final.mp4"
    if not final.exists():
        raise HTTPException(404, "Render the video first.")
    import tools_source
    description = tools_source.description_with_sources(req.description, job.get("sources") or [])

    def work(flag):
        import youtube_upload
        talk.update(job_id, stage="Uploading to YouTube…")
        result = youtube_upload.upload_video(
            final, title=req.title.strip(), description=description, tags=req.tags, privacy_status=req.privacy,
            channel_id=req.channel_id, on_progress=lambda pct, done, total: talk.update(job_id, progress=round(pct, 1)))
        talk.update(job_id, youtube={"title": req.title.strip(), "url": result.get("url") or result.get("video_url") or "",
                                     "id": result.get("video_id") or result.get("id") or "", "privacy": req.privacy})

    talk.start(job_id, "upload", work)
    return talk.public(talk.read(job_id))
