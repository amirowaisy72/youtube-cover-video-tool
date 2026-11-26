"""YT Guru — Visual Explainer: whole-video preview before the render, with "fix this part" (user, 2026-11-20).

After the voice is made, every scene is drawn quickly in low resolution with its real voice, sound effects and
captions and played as one video. The user pauses where something is wrong, writes (Urdu or English) what he
wants, copies a prompt for any AI, pastes the AI's new scene code back — the scene is marked "modified" — and
"Fix all the modified parts" redraws only those scenes.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import threading
import time
from pathlib import Path

import parts
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/visual/preview", tags=["visual-preview"])
_STATE: dict[str, dict] = {}
_JOB_LOCK = threading.Lock()

# Scene sound effects under the voice (user, 2026-11-23): was 0.4,
# too loud. The value is part of the preview cache key below, so a
# change rebuilds the preview instead of replaying the old loud file.
_PREVIEW_SFX_VOLUME = 0.2


def _app():
    import tools_visual as tv
    app = tv._av()
    if app is None:
        raise HTTPException(503, "The app is not ready.")
    return app


def _read(job_id: str) -> dict:
    try:
        return _app()._av_read(job_id)
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        raise HTTPException(404, "Video not found.") from None


def _update_scene(job_id: str, i: int, fields: dict, drop: tuple = ()) -> dict:
    """Changes one scene in the saved job (other scenes and other writers are left alone)."""
    with _JOB_LOCK:
        app = _app()
        job = app._av_read(job_id)
        sc = job["scenes"][i]
        sc.update(fields)
        for k in drop:
            sc.pop(k, None)
        app._av_write(job)
        return sc


def _voice_ready(job: dict, work_dir: Path) -> list[Path]:
    scenes = job.get("scenes") or []
    files = [work_dir / n for n in (job.get("voice_files") or [])]
    if not scenes or len(files) != len(scenes) or any(not f.exists() for f in files) \
            or not all(float(s.get("duration_sec") or 0) > 0 for s in scenes):
        raise HTTPException(400, "Make the voice first (step 3 · Audio) — the preview uses the real voice and its timing.")
    return files


def _clean_voice(voice: Path) -> Path:
    """The voice without sound effects (a render mixes them into the voice file and keeps the clean copy)."""
    clean = voice.with_name(voice.stem + ".nosfx" + voice.suffix)
    return clean if clean.exists() else voice


# ------------------------------------------------------------------ one scene
def _visual_job(job: dict) -> bool:
    """A Visual Explainer video (every scene is an animation) — else an Auto Video (stock footage)."""
    scs = job.get("scenes") or []
    return bool(scs) and all((sc.get("graphic") or {}).get("theme") == "visual" for sc in scs)


def build_scene(job: dict, i: int, work_dir: Path, voice: Path, cues: list[dict]) -> dict:
    import tools_script as ts
    import tools_visual as tv
    sc = job["scenes"][i]
    dur = float(sc.get("duration_sec") or 0)
    vertical = (job.get("video_type") or "long") == "short"
    w, h = (360, 640) if vertical else (640, 360)
    code_ok = bool(sc.get("code")) and not ts.check(sc["code"])[0]
    g = sc.get("graphic") or {}
    animated = code_ok or _visual_job(job) or (g.get("theme") == "visual" and sc.get("visual_file") == sc.get("graphic_file"))
    # A filmed studio scene (user, 2026-11-23): the presenter clip
    # replaces the animation — even in a Visual Explainer job, where
    # every scene would otherwise be animated. Only when the clip
    # file is actually on disk; otherwise fall back to the animation.
    studio_clip = bool(sc.get("studio")) and (work_dir / str(sc.get("visual_file") or "")).is_file()
    animated = animated and not studio_clip
    if animated:
        if code_ok:
            spec = ts.spec_for(sc, i, work_dir, dur, cues)
        else:
            if not g.get("beats"):
                g = tv.basic_plan(sc.get("narration") or "")
            spec = tv.timed(g, sc.get("narration") or "", dur, cues)
        what = {"s": spec, "c": code_ok, "sfx": _PREVIEW_SFX_VOLUME}
    else:  # stock footage: the scene's clip (and its extra shots, cut at their words) or picture
        vf = work_dir / str(sc.get("visual_file") or "")
        shots = [(sh.get("file"), (work_dir / str(sh.get("file"))).stat().st_mtime) for sh in sc.get("shots") or []
                 if (work_dir / str(sh.get("file") or "x")).exists()]
        what = {"v": sc.get("visual_file"), "m": vf.stat().st_mtime if vf.exists() else 0, "shots": shots,
                "g": sc.get("graphic_file") if g else None}
    key = hashlib.sha1(json.dumps({**what, "vert": vertical, "voice": voice.stat().st_mtime, "d": dur},
                                  sort_keys=True, default=str).encode()).hexdigest()[:12]
    out = work_dir / f"scene-{i:02d}-preview-{key}.mp4"
    result = {"pv_file": out.name, "pv_dur": round(dur, 2), "pv_cues": cues}
    if out.exists():
        return result
    events: list = []
    tmp: list[Path] = []
    image = False
    if animated:
        src = work_dir / f"scene-{i:02d}-pvanim.mp4"
        rep: dict = {}
        tv.render(spec, src, w, h, fps=15, script=code_ok, report=rep, timeout=900)
        if code_ok:
            result["script_test"] = {"ok": not rep.get("error"), "error": rep.get("error") or "",
                                     "warnings": list(rep.get("warnings") or [])[:10], "at": time.time()}
        sfx_json = src.with_suffix(".sfx.json")
        if sfx_json.exists():
            events = json.loads(sfx_json.read_text(encoding="utf-8"))
        tmp += [src, sfx_json]
    else:
        src = work_dir / str(sc.get("visual_file") or "")
        if g and sc.get("visual_file") == sc.get("graphic_file"):  # a classic motion graphic (the same file the render uses)
            import tools_graphics
            srt = work_dir / f"scene-{i:02d}.srt"
            src = tools_graphics.clip_for_scene(sc, i, work_dir, dur, srt if srt.exists() else None, vertical) or src
        elif sc.get("shots") and sc.get("kind") == "clip" and not sc.get("studio"):
            # (same studio exclusion as the final render: extra shots
            # must never be cut in over the presenter clip)
            import autovideo_smart
            srt = work_dir / f"scene-{i:02d}.srt"
            multi = autovideo_smart.compose_shots(work_dir, i, src, sc, dur, srt if srt.exists() else None, voice, vertical)
            if multi is not None:
                src = multi
        if not src.exists():
            raise RuntimeError(f"Scene {i + 1} has no footage file.")
        image = src.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    sfx_wav = work_dir / f"scene-{i:02d}-pvsfx.wav"
    has_sfx = bool(events) and bool(tv.sfx_track(events, dur, sfx_wav, seed=i)) and sfx_wav.exists()
    tmp.append(sfx_wav)
    vin = (["-loop", "1", "-i", str(src)] if image else ["-stream_loop", "-1", "-i", str(src)])
    cmd = ["ffmpeg", "-v", "error", "-y"] + vin + ["-i", str(voice)]
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps=15,format=yuv420p"
    if has_sfx:
        cmd += ["-i", str(sfx_wav), "-filter_complex",
                f"[0:v]{vf}[v];[2:a]volume={_PREVIEW_SFX_VOLUME}[s];[1:a][s]amix=inputs=2:duration=first:normalize=0[a]", "-map", "[v]", "-map", "[a]"]
    else:
        cmd += ["-filter_complex", f"[0:v]{vf}[v]", "-map", "[v]", "-map", "1:a"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "96k", "-t", f"{dur:.2f}", str(out)]
    r = subprocess.run(cmd, capture_output=True, text=True, **tv._no_window())
    for p in tmp:
        try:
            p.unlink()
        except OSError:
            pass
    if r.returncode != 0 or not out.exists():
        raise RuntimeError("Could not make the preview of scene %d: %s" % (i + 1, (r.stderr or "")[-300:]))
    for old in work_dir.glob(f"scene-{i:02d}-preview-*.mp4"):  # the scene's older previews
        if old != out:
            try:
                old.unlink()
            except OSError:
                pass
    return result


def _worker(job_id: str, only: list[int] | None) -> None:
    import autovideo2
    st = _STATE[job_id]
    try:
        app = _app()
        job = app._av_read(job_id)
        work_dir = app._av_job_dir(job_id)
        voices = _voice_ready(job, work_dir)
        scenes = job["scenes"]
        todo = [i for i in range(len(scenes)) if only is None or i in only]
        st.update(total=len(todo), done=0)
        plans = [i for i in todo if scenes[i].get("av_pending")]
        if plans:  # Auto Video: the new footage the AI planned for the marked parts is downloaded first
            import tools_avscript
            tools_avscript.run_apply(job_id, plans, st.get("keys") or {}, st)
            st["done"] = 0
            job = app._av_read(job_id)
            scenes = job["scenes"]
        autovideo2._remember_narrations(work_dir, scenes)
        cues: dict[int, list] = {}
        for k, i in enumerate(todo):  # word timing first (one at a time: speech recognition is heavy)
            st["stage"] = f"Reading the voice timing — scene {i + 1} ({k + 1} of {len(todo)})…"
            srt = autovideo2._transcribe_scene_voice(_clean_voice(voices[i]), work_dir, i)
            cues[i] = autovideo2._parse_srt_cues(srt) if srt else []
        from concurrent.futures import ThreadPoolExecutor
        lock = threading.Lock()

        def one(i):
            res = build_scene(job, i, work_dir, _clean_voice(voices[i]), cues[i])
            fields = {**res, "pv_error": ""}
            drop = ("pv_modified", "fix_requests") if only is not None else ()
            _update_scene(job_id, i, fields, drop)
            with lock:
                st["done"] += 1
                st["stage"] = f"Drawing the preview — {st['done']} of {len(todo)} scenes ready…"

        def safe(i):
            try:
                one(i)
            except Exception as exc:  # noqa: BLE001 — one scene never stops the others
                _update_scene(job_id, i, {"pv_error": str(exc)[-300:]})
                with lock:
                    st["done"] += 1
        workers = 2 if len(todo) > 1 else 1
        with ThreadPoolExecutor(max_workers=workers) as pool:
            list(pool.map(safe, todo))
        st.update(running=False, stage="Preview ready.", finished=time.time())
    except Exception as exc:  # noqa: BLE001
        st.update(running=False, error=str(getattr(exc, "detail", exc))[-400:], stage="")


# ------------------------------------------------------------------ endpoints
class BuildReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    only_modified: bool = False
    pexels_key: str = Field("", max_length=200)  # Auto Video: new footage for the fixed parts
    pixabay_key: str = Field("", max_length=200)


@router.post("/build")
def build(req: BuildReq) -> dict:
    parts.require("graphics", "whisper")
    job = _read(req.job_id)
    _voice_ready(job, _app()._av_job_dir(req.job_id))
    st = _STATE.get(req.job_id)
    if st and st.get("running"):
        return status(req.job_id)
    only = None
    if req.only_modified:
        only = [i for i, sc in enumerate(job["scenes"]) if sc.get("pv_modified")]
        if not only:
            raise HTTPException(400, "No part is marked to fix yet.")
    _STATE[req.job_id] = {"running": True, "done": 0, "total": 0, "stage": "Starting…", "error": "", "only": only,
                          "keys": {"pexels": req.pexels_key, "pixabay": req.pixabay_key}}
    threading.Thread(target=_worker, args=(req.job_id, only), daemon=True).start()
    return status(req.job_id)


@router.get("/{job_id}")
def status(job_id: str) -> dict:
    job = _read(job_id)
    st = _STATE.get(job_id) or {"running": False, "done": 0, "total": 0, "stage": "", "error": ""}
    scenes = []
    for i, sc in enumerate(job.get("scenes") or []):
        scenes.append({"index": i, "file": sc.get("pv_file") or "", "duration": float(sc.get("pv_dur") or sc.get("duration_sec") or 0),
                       "cues": sc.get("pv_cues") or [], "modified": bool(sc.get("pv_modified")), "error": sc.get("pv_error") or "",
                       "requests": sc.get("fix_requests") or [], "has_code": bool(sc.get("code")),
                       "test": sc.get("script_test") or None, "narration": sc.get("narration") or ""})
    voice_ok = True
    try:
        _voice_ready(job, _app()._av_job_dir(job_id))
    except HTTPException:
        voice_ok = False
    return {"running": bool(st.get("running")), "done": st.get("done", 0), "total": st.get("total", 0),
            "stage": st.get("stage", ""), "error": st.get("error", ""), "voice_ready": voice_ok, "scenes": scenes}


def _spoken_around(sc: dict, t: float) -> str:
    cues = sc.get("pv_cues") or []
    near = [c["text"] for c in cues if c["end"] >= t - 1.5 and c["start"] <= t + 1.5]
    return " ".join(near).strip()


class FixPromptReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    index: int = Field(..., ge=0, le=500)
    t: float = Field(0, ge=0, le=3600)
    request: str = Field(..., min_length=2, max_length=3000)


@router.post("/fix-prompt")
def fix_prompt(req: FixPromptReq) -> dict:
    """The prompt for any AI: this scene, the paused moment, what is spoken there, and what the user wants."""
    import tools_script as ts
    job = _read(req.job_id)
    if not 0 <= req.index < len(job["scenes"]):
        raise HTTPException(404, "Scene not found.")
    sc = job["scenes"][req.index]
    n = req.index + 1
    words = _spoken_around(sc, req.t)
    nar = str(sc.get("narration") or "").strip()
    dur = float(sc.get("duration_sec") or 0) or ts.est_duration(nar)
    reqs = list(sc.get("fix_requests") or []) + [{"t": round(req.t, 1), "request": req.request.strip()}]
    _update_scene(req.job_id, req.index, {"fix_requests": reqs[-8:]})
    asks = "\n".join(f'- at second {r["t"]:.1f}' + (f' (the narrator says: "{_spoken_around(sc, r["t"])}")' if _spoken_around(sc, r["t"]) else "")
                     + f': {r["request"]}' for r in reqs[-8:])
    if not _visual_job(job):  # Auto Video: the scene's footage plan (or an animation) is what changes
        import tools_avscript as tas
        plan = sc.get("plan") or {}
        if sc.get("code"):
            cur = f"# === SCENE {n} ===\nanimation:\n{sc['code']}"
        else:
            cur = (f"# === SCENE {n} ===\nmain: " + " | ".join(plan.get("queries") or []) + "\navoid: "
                   + ", ".join(plan.get("avoid") or []) + "\n"
                   + "".join(f'shot: "{sh.get("words", "")}" -> {sh.get("query", "")}\n' for sh in sc.get("shots") or plan.get("shots") or []))
        prompt = (tas.GUIDE + tas._anim_guide() + f'\n\nVIDEO TITLE: "{job.get("title") or ""}"\n\n'
                  f"SCENE {n} (it lasts {dur:.1f} seconds): {nar}\n\nWHAT SCENE {n} SHOWS NOW:\n```\n{cur}```\n\n"
                  f"The viewer watched the preview and paused there. What the viewer wants (it may be written in Urdu or "
                  f"English — understand it and do it):\n{asks}\n\nChange ONLY what the viewer asked about (around those "
                  f"words); keep the rest of the scene's plan.\n\n" + ts.saved_sources(job["scenes"], job.get("sources"), req.index)
                  + f"\nANSWER WITH THE CODE BLOCK ONLY: one code block with the whole plan of scene {n} (footage lines, or "
                  "animation), starting with its marker line. No text before or after it.")
        return {"prompt": prompt, "spoken": words}
    if sc.get("code"):
        current = (f"VISUAL IDEA of this scene: {ts.idea_of(sc['code']) or '(none written yet — write one)'}\n\n"
                   f"THE CURRENT CODE OF SCENE {n}:\n```python\n# === SCENE {n} ===\n{sc['code']}```\n\n")
        task = (f"Change ONLY the part(s) the viewer asked about (around those words); keep everything else in the scene "
                f"exactly as it is. ANSWER WITH THE CODE BLOCK ONLY: one code block holding the WHOLE corrected code of "
                f"scene {n}, starting with its marker line and its # VISUAL IDEA line. No text before or after it.")
    else:
        current = (f"Scene {n} has no code yet (it was made automatically). Write its whole code, and make sure the "
                   f"viewer's requests are done.\n\n")
        task = (f"ANSWER WITH THE CODE BLOCK ONLY: one code block with the whole code of scene {n}, starting with its marker "
                "line and its # VISUAL IDEA line. No text before or after it.")
    frames = _sheet(req.job_id, job, req.index, req.t)[1] if sc.get("code") else []
    if frames:
        task = (f"I attached an image: the contact sheet of this scene as it looks now.\n{ts.frame_list(frames)}\n"
                "(If no image is attached, ask me to attach it.) Look at the frames, especially the PAUSED one, to understand "
                "what the viewer means, and check your fix keeps the scene clear:\n" + ts.REVIEW_CHECKS + "\n\n" + task)
    prompt = (ts.GUIDE.replace("{library}", ts._library()) + f'\nVIDEO TITLE: "{job.get("title") or ""}"\n\n'
              + ts.other_ideas(job["scenes"], req.index) +
              f"SCENE {n} (it lasts {dur:.1f} seconds): {nar}\n\n{current}"
              f"The viewer watched the preview and paused there. What the viewer wants (it may be written in Urdu or "
              f"English — understand it and do it):\n{asks}\n\n"
              + ts.saved_sources(job["scenes"], job.get("sources"), req.index) + f"\n{task}")
    return {"prompt": prompt, "spoken": words}


def _sheet(job_id: str, job: dict, index: int, t: float) -> tuple[str, list[dict]]:
    """Contact sheet of the scene's preview clip with the paused moment marked -> (file name or "", frames)."""
    import tools_script as ts
    sc = job["scenes"][index]
    work_dir = _app()._av_job_dir(job_id)
    video = work_dir / Path(str(sc.get("pv_file") or "x")).name
    dur = float(sc.get("pv_dur") or sc.get("duration_sec") or 0)
    if not video.is_file() or dur <= 0:
        return "", []
    old = sc.get("pv_sheet")
    try:
        made = ts.make_sheet(sc, index, work_dir, video, ts.word_times(sc, index, work_dir, dur, sc.get("pv_cues") or None), dur, t)
    except Exception as exc:  # noqa: BLE001 — the prompt still works without the picture
        print(f"scene {index + 1}: contact sheet failed:", exc)
        return "", []
    if old and old != made["sheet"]:
        (work_dir / Path(old).name).unlink(missing_ok=True)
    _update_scene(job_id, index, {"pv_sheet": made["sheet"]})
    return made["sheet"], made["frames"]


class SheetReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    index: int = Field(..., ge=0, le=500)
    t: float = Field(0, ge=0, le=3600)


@router.post("/sheet")
def sheet(req: SheetReq) -> dict:
    job = _read(req.job_id)
    if not 0 <= req.index < len(job["scenes"]):
        raise HTTPException(404, "Scene not found.")
    name = _sheet(req.job_id, job, req.index, req.t)[0]
    if not name:
        raise HTTPException(400, "This scene has no preview yet — make the preview first.")
    return {"sheet": name}


class FixSaveReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    index: int = Field(..., ge=0, le=500)
    code: str = Field(..., min_length=3, max_length=60000)


@router.post("/fix-save")
def fix_save(req: FixSaveReq) -> dict:
    """The AI's new code for one scene: checked, saved, and the scene is marked to be redrawn."""
    import tools_script as ts
    job = _read(req.job_id)
    if not 0 <= req.index < len(job["scenes"]):
        raise HTTPException(404, "Scene not found.")
    parts = ts.parse(req.code)
    code = parts.get(req.index + 1) or (next(iter(parts.values())) if len(parts) == 1 else None)
    if code is None:
        if parts:
            raise HTTPException(400, f"This answer is for scene {', '.join(map(str, parts))} — paste the code of scene {req.index + 1}.")
        code = ts.single_block(req.code)
    if not _visual_job(job):  # Auto Video: a footage plan (or an animation), downloaded at "Fix all the modified parts"
        import tools_avscript as tas
        try:
            tas.parse_block(code, job["scenes"][req.index].get("narration") or "")
        except ValueError as exc:
            raise HTTPException(400, f"The answer has a problem — {exc}. Ask the AI to fix it (or paste its whole answer).") from None
        _update_scene(req.job_id, req.index, {"av_script": code, "av_pending": True, "pv_modified": True})
        return {"ok": True, "index": req.index, "modified": True}
    err, _ = ts.check(code)
    if err:
        raise HTTPException(400, f"The code has a problem — {err.rstrip('.')}. Ask the AI to fix it (or paste the whole answer again).")
    sc = _update_scene(req.job_id, req.index, {"code": code, "pv_modified": True, "visual_idea": ts.idea_of(code),
                                               "graphic": {**(job["scenes"][req.index].get("graphic") or {}), "theme": "visual"}},
                       drop=("script_test", "script_review"))
    return {"ok": True, "index": req.index, "modified": True, "has_code": bool(sc.get("code"))}


class UnmarkReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    index: int = Field(..., ge=0, le=500)


@router.post("/clear-requests")
def clear_requests(req: UnmarkReq) -> dict:
    """Forget the written requests of a scene (after it was fixed, or when they were a mistake)."""
    _update_scene(req.job_id, req.index, {}, drop=("fix_requests",))
    return {"ok": True}
