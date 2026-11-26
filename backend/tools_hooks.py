"""YT Guru — Hook builder: three different openings for the first scene, previewed, one picked.

The AI (any AI by copy-paste, or Gemini with a free key) answers with three hooks — a big question, a
shocking number, proof on screen. Two modes:
  "visuals"  the words stay; only the first scene's animation changes.
  "words"    each hook also has new opening words that replace the first sentence of scene 1. When one is
             picked and the video already has its voice, ONLY scene 1's voice is made again.
Nothing changes until a hook is picked, and the previous opening can be brought back.
"""
from __future__ import annotations

import copy
import json
import re
import shutil
import subprocess
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import tools_script as ts

router = APIRouter(prefix="/api/visual/hooks", tags=["visual-hooks"])
KINDS = ("question", "number", "proof")
LABELS = {"question": "Big question", "number": "Shocking number", "proof": "Proof on screen"}
_MARK = re.compile(r"^\s*#+\s*=*\s*HOOK\s+(\d)\b\s*[:\-–—]?\s*([A-Za-z ]*)[^\n]*$", re.I | re.M)
_WORDS = re.compile(r"^[ \t#>*_]*NEW[ _](?:OPENING[ _])?WORDS[ \t*_]*[:=][ \t*_]*(.*?)[ \t*_]*$", re.I)


def split_first_sentence(narration: str) -> tuple[str, str]:
    """(the first sentence, the rest)."""
    text = str(narration or "").strip()
    m = re.search(r"[.!?…][\"'”’)]*\s+", text)
    return (text[:m.end()].strip(), text[m.end():].strip()) if m else (text, "")


def new_narration(narration: str, words: str) -> str:
    """The scene's narration with its first sentence replaced by the new opening words."""
    words = str(words or "").strip()
    if not words:
        return str(narration or "").strip()
    if words[-1] not in ".!?…":
        words += "."
    return f"{words} {split_first_sentence(narration)[1]}".strip()


def parse_hooks(text: str) -> list[dict]:
    """The pasted answer -> [{"n", "kind", "words", "code"}]."""
    t = str(text or "").replace("\r\n", "\n")
    blocks = re.findall(r"^[ \t]*```[\w+-]*[ \t]*\n(.*?)^[ \t]*```", t, re.M | re.S)
    marked = [b for b in blocks if _MARK.search(b)]
    if marked and sum(len(_MARK.findall(b)) for b in marked) == len(_MARK.findall(t)):
        t = "\n".join(marked)
    else:
        t = re.sub(r"^\s*```[a-zA-Z]*\s*$", "", t, flags=re.M)
    marks = list(_MARK.finditer(t))
    out: dict[int, dict] = {}
    for k, m in enumerate(marks):
        body = t[m.end():marks[k + 1].start() if k + 1 < len(marks) else len(t)]
        words, lines = "", []
        for line in body.strip("\n").split("\n"):
            w = _WORDS.match(line)
            if w:
                words = w.group(1).strip().strip('"“”').strip()
                continue
            lines.append(ts._idea_line(line) or line)
        n = int(m.group(1))
        code = "\n".join(lines).strip("\n")
        if 1 <= n <= 3 and any(x.strip() and not x.lstrip().startswith("#") for x in lines):
            kind = next((x for x in KINDS if x in m.group(2).lower()), KINDS[n - 1])
            out[n] = {"n": n, "kind": kind, "words": words[:300], "code": code.rstrip() + "\n"}
    return [out[n] for n in sorted(out)]


def build_prompt(job: dict, mode: str) -> str:
    sc = job["scenes"][0]
    nar = str(sc.get("narration") or "").strip()
    first, rest = split_first_sentence(nar)
    usable = [s for s in job.get("sources") or [] if s.get("url")]
    quoted = [s for s in usable if s.get("quote")]
    lines = [ts.GUIDE.replace("{library}", ts._library()),
             "=== YOUR TASK NOW: THREE HOOKS FOR THE FIRST SCENE (this replaces the ANSWER FORMAT above) ===",
             f'VIDEO TITLE: "{job.get("title") or ""}"', f"SCENE 1 narration: {nar}",
             f"CURRENT CODE OF SCENE 1:\n{sc.get('code') or '(none yet)'}",
             "The first seconds decide whether the viewer stays. Make THREE clearly different openings for scene 1:",
             "  HOOK 1 question — a big question the viewer wants answered, shown as a picture of the puzzle.",
             "  HOOK 2 number — one shocking number from the narration or the sources, huge, counting up, with a reaction.",
             "  HOOK 3 proof — evidence on screen from the first second: source(), headlines() or data_chart(), using only "
             "the sources below or a data series you are sure of. If there is none, show the proof with a real comparison "
             "from the narration instead.",
             "Rules: something striking moves within the first half second; 1-3 things on stage; never promise what the "
             "video does not deliver; never invent numbers or sources."]
    if quoted or usable:
        lines.append("SOURCES:\n" + "\n".join(ts._source_line(s) if s.get("quote") else f"  url: {s['url']}\n  ({s.get('fact')})"
                                             for s in usable[:12]))
    if mode == "words":
        lines.append(f'NEW OPENING WORDS: for every hook also write new opening words that REPLACE the first sentence ("{first}"). '
                     "One or two short spoken sentences (at most 22 words), plain text, no quotes. The rest of the narration "
                     f'stays exactly: "{rest or "(nothing)"}". Put them in a line "# NEW WORDS: ..." right under the hook\'s '
                     "marker, and use when() with words of the new narration (your new words + that rest).")
    else:
        lines.append("Keep the narration exactly as it is: only the animation changes. when() uses its exact words.")
    lines.append("ANSWER with ONE code block, nothing else:\n"
                 + "".join(f"# === HOOK {i + 1}: {k} ===\n" + ("# NEW WORDS: ...\n" if mode == "words" else "")
                           + "# VISUAL IDEA: ...\n<code>\n" for i, k in enumerate(KINDS)))
    return "\n\n".join(lines)


# ------------------------------------------------------------------ endpoints
def _job(job_id: str):
    app, job = ts._job(job_id)
    return app, job


def _view(job: dict) -> dict:
    first, rest = split_first_sentence(job["scenes"][0].get("narration") or "")
    return {"hooks": job.get("hooks") or [], "mode": job.get("hooks_mode") or "visuals", "first_sentence": first,
            "narration": job["scenes"][0].get("narration") or "", "can_undo": bool(job.get("hook_original")),
            "voiced": bool(job.get("voice_files"))}


@router.get("/{job_id}")
def get_hooks(job_id: str) -> dict:
    return _view(_job(job_id)[1])


@router.get("/{job_id}/prompt")
def get_prompt(job_id: str, mode: str = "visuals") -> dict:
    return {"prompt": build_prompt(_job(job_id)[1], "words" if mode == "words" else "visuals")}


def _save(job_id: str, text: str, mode: str) -> dict:
    found = parse_hooks(text)
    if not found:
        raise HTTPException(400, "No hooks found. Each one starts with a line like  # === HOOK 1: question ===")
    for h in found:
        if mode != "words":
            h["words"] = ""
        elif not h["words"]:
            h["error"] = "no '# NEW WORDS:' line — ask the AI to add the new opening words"
        h["error"] = h.get("error") or ts.check(h["code"])[0]
        h["idea"] = ts.idea_of(h["code"])
    with ts._LOCK:
        app, job = _job(job_id)
        job["hooks"], job["hooks_mode"] = found, mode
        app._av_write(job)
    return _view(job)


class SaveReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    code: str = Field(..., max_length=120000)
    mode: str = "visuals"


@router.post("/save")
def save(req: SaveReq) -> dict:
    return _save(req.job_id, req.code, "words" if req.mode == "words" else "visuals")


class GeminiReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    gemini_key: str = Field("", max_length=200)
    mode: str = "visuals"


@router.post("/gemini")
def gemini(req: GeminiReq) -> dict:
    """Gemini writes the three hooks (nothing is applied)."""
    _app, job = _job(req.job_id)
    if not req.gemini_key.strip():
        raise HTTPException(400, "This needs your free Gemini key (add it in the Dashboard) — or copy the prompt into any AI.")
    mode = "words" if req.mode == "words" else "visuals"
    import tools_animator as ta
    try:
        answer = ta._gemini_only(build_prompt(job, mode), req.gemini_key)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Gemini could not write the hooks: {str(exc)[:250]}") from None
    return _save(req.job_id, answer, mode)


class PickReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    n: int = Field(..., ge=1, le=3)


def _hook(job: dict, n: int) -> dict:
    h = next((h for h in job.get("hooks") or [] if h.get("n") == n), None)
    if h is None:
        raise HTTPException(404, "That hook is not saved.")
    return h


@router.post("/test")
def test(req: PickReq) -> dict:
    """A quick preview of one hook (the video's own scene 1 stays as it is)."""
    app, job = _job(req.job_id)
    h = _hook(job, req.n)
    work = app._av_job_dir(req.job_id)
    folder = work / "hooks" / str(req.n)
    folder.mkdir(parents=True, exist_ok=True)
    sc = copy.deepcopy(job["scenes"][0])
    for key in ("visual_file", "graphic_file", "script_test"):
        sc.pop(key, None)
    sc["code"] = h["code"]
    changed = bool(h.get("words"))
    (folder / "scene-00.words.json").unlink(missing_ok=True)
    if changed:
        sc["narration"] = new_narration(sc.get("narration") or "", h["words"])
        sc["duration_sec"] = ts.est_duration(sc["narration"])
    elif (work / "scene-00.words.json").exists():  # the real voice timing
        shutil.copy2(work / "scene-00.words.json", folder / "scene-00.words.json")
    trial = {**job, "scenes": [sc, *job["scenes"][1:]]}
    res = ts.test_scene(trial, 0, folder)
    stamp = int(time.time() * 10) % 1000000
    preview = sheet = ""
    video = folder / str(sc.get("visual_file") or "x")
    if video.is_file():
        preview = f"hook-{req.n}-{stamp}.mp4"
        shutil.copy2(video, work / preview)
    if res.get("sheet") and (folder / res["sheet"]).is_file():
        sheet = f"hook-{req.n}-{stamp}.png"
        shutil.copy2(folder / res["sheet"], work / sheet)
    with ts._LOCK:
        fresh = app._av_read(req.job_id)
        target = _hook(fresh, req.n)
        for old in (target.get("preview"), target.get("sheet")):
            if old:
                (work / Path(old).name).unlink(missing_ok=True)
        target.update(preview=preview, sheet=sheet, ok=bool(res.get("ok")), error=res.get("error") or "",
                      warnings=res.get("warnings") or [], sources=sc.get("auto_sources") or [])
        app._av_write(fresh)
    shutil.rmtree(folder, ignore_errors=True)
    return _view(fresh)


def revoice_first(job: dict, work: Path, key: str) -> dict:
    """Makes ONLY scene 1's voice again (its narration changed) and joins the voiceover anew."""
    import autovideo2
    import video as video_module
    scenes = job["scenes"]
    voice = job.get("voice") or "en-US-AriaNeural"
    provider = job.get("tts_provider") or "edge"
    # old copies of this scene's voice must not come back: the clean copy a render keeps, word timings, notes
    old_name = Path(str((job.get("voice_files") or [""])[0])).stem
    for pattern in (f"{old_name}.nosfx.*", f"{old_name}.sfx.wav", "scene-00.words.json", "scene-00.srt",
                    "scene-00.srt.meta.json", "scene-00.voice-done.json", "scene-00-presenter.nosfx.*"):
        for f in work.glob(pattern):
            f.unlink(missing_ok=True)
    path, engine, duration, fell_back, error = autovideo2._voice_scene_with_fallback(
        0, scenes[0]["narration"], voice, work, provider, key or None, True, len(scenes) == 1)
    if path is None or duration <= 0:
        raise RuntimeError("The new voice for scene 1 could not be made — try again.")
    scenes[0]["duration_sec"] = round(duration, 1)
    files = list(job.get("voice_files") or [])
    files[0] = Path(path).name
    job["voice_files"] = files
    voices = job.get("scene_voices") or {}
    voices["0"] = {"voice_path": files[0], "engine": engine, "duration": duration,
                   "voice_hash": autovideo2._voice_hash(scenes[0]["narration"], voice, provider)}
    job["scene_voices"] = voices
    listing = work / "master-audio.txt"
    listing.write_text("".join(f"file '{(work / n).resolve()}'\n" for n in files), encoding="utf-8")
    joined = work / "master-voice.mp3"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(listing), "-c:a", "libmp3lame",
                    str(joined)], capture_output=True, timeout=600, **video_module.no_window_kwargs())
    total = sum(float(s.get("duration_sec") or 0) for s in scenes)
    job["voice_duration_sec"], job["final_minutes"] = round(total, 1), round(total / 60, 1)
    try:  # word timings of the new voice, for the preview and the captions
        autovideo2._remember_narrations(work, scenes)
        autovideo2._transcribe_scene_voice(Path(path), work, 0)
    except Exception as exc:  # noqa: BLE001 — the render makes them again if needed
        print("hook voice timings:", exc)
    return {"engine": engine, "fallback": error if fell_back else ""}


def _apply(req_job: str, change: dict, tts_keys: dict) -> dict:
    """Puts an opening {"code", "narration"} into scene 1; revoices that scene when the words changed."""
    app, job = _job(req_job)
    if job.get("phase") not in ("planned", "audio-ready", "done"):
        raise HTTPException(400, "Wait until the current step (voice or render) has finished.")
    sc = job["scenes"][0]
    words_changed = change["narration"].strip() != str(sc.get("narration") or "").strip()
    voiced = bool(job.get("voice_files"))
    note = ""
    if words_changed:
        import autovideo2
        sc["narration"] = change["narration"]
        sc["caption"] = autovideo2._caption_text(sc)
    if change.get("code"):
        sc["code"] = change["code"]
        sc["visual_idea"] = ts.idea_of(change["code"])
        sc["graphic"] = {**(sc.get("graphic") or {}), "theme": "visual"}
    else:
        sc.pop("code", None)
        sc.pop("visual_idea", None)
    sc.pop("script_test", None)
    sc.pop("script_review", None)
    job["script"] = "\n\n".join(str(s.get("narration") or "") for s in job["scenes"])
    job["script_code"] = "\n".join(f"# === SCENE {i + 1} ===\n{s['code']}" for i, s in enumerate(job["scenes"]) if s.get("code"))
    if words_changed and voiced:
        provider = job.get("tts_provider") or "edge"
        try:
            made = revoice_first(job, app._av_job_dir(req_job), str(tts_keys.get(provider) or ""))
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(502, f"Scene 1's new voice failed, nothing was changed: {str(exc)[:250]}") from None
        note = "Only scene 1's voice was made again."
        if made["fallback"]:
            note += f" Your voice provider failed ({made['fallback'][:120]}), so the free default voice spoke scene 1."
    if job.get("phase") == "done":  # the finished video is older than this change: render it again
        job.update(status="audio-ready", phase="audio-ready", stage="The opening changed — render the video again.")
        note += " Render the video again to see it."
    with ts._LOCK:
        app._av_write(job)
    return {"job": job, "note": note.strip()}


class ApplyReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    n: int = Field(..., ge=1, le=3)
    tts_keys: dict = Field(default_factory=dict)  # the browser's voice keys, used only for this request


@router.post("/apply")
def apply(req: ApplyReq) -> dict:
    _app, job = _job(req.job_id)
    h = _hook(job, req.n)
    if h.get("error"):
        raise HTTPException(400, "This hook has a problem — test it or ask the AI to fix it first.")
    sc = job["scenes"][0]
    original = job.get("hook_original") or {"code": sc.get("code") or "", "narration": sc.get("narration") or ""}
    change = {"code": h["code"], "narration": new_narration(original["narration"], h["words"]) if h.get("words")
              else str(sc.get("narration") or "")}
    out = _apply(req.job_id, change, req.tts_keys)
    with ts._LOCK:
        app, fresh = _job(req.job_id)
        fresh["hook_original"] = original
        import tools_source
        tools_source.add_found(fresh, h.get("sources"))
        app._av_write(fresh)
    return {**_view(fresh), "note": out["note"] or "The hook is now scene 1. Press Test on it to check it in place."}


class UndoReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    tts_keys: dict = Field(default_factory=dict)


@router.post("/undo")
def undo(req: UndoReq) -> dict:
    _app, job = _job(req.job_id)
    original = job.get("hook_original")
    if not original:
        raise HTTPException(400, "There is no earlier opening to bring back.")
    out = _apply(req.job_id, original, req.tts_keys)
    with ts._LOCK:
        app, fresh = _job(req.job_id)
        fresh.pop("hook_original", None)
        app._av_write(fresh)
    return {**_view(fresh), "note": ("The earlier opening is back. " + out["note"]).strip()}
