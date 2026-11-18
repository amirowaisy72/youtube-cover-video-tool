"""Studio presenter for Auto Video (user, 2026-11-18).

"Sometimes the studio look — the character speaking — and sometimes
stock footage." For a scene you choose, this makes a 3D timeline: your
own character (Characters page) standing in a TV studio, lip-synced to
that scene's voiceover, with presenter gestures and expressions that
follow the mood of each sentence (from tools_presenter). The browser
films it with the same 3D engine as the Animator and sends the clip
back here; it becomes that scene's footage, so the render treats it
like any other clip (captions, pop-ups, music, transitions).
"""

from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

router = APIRouter(prefix="/api/animator/studio", tags=["studio"])


def _app():
    """main.py's Auto Video helpers (whatever name main.py runs under)."""
    for mod in list(sys.modules.values()):
        if mod is not None and hasattr(mod, "_av_read") and hasattr(mod, "_plan_scene_visual"):
            return mod
    raise HTTPException(500, "Auto Video is not loaded.")


# presenter mood → face + the hand gestures that suit it
_LOOK = {
    "excited":  ("happy",      ["point", "wave", "point", "shrug"]),
    "emphatic": ("happy",      ["point", "idle", "point", "hips"]),
    "curious":  ("suspicious", ["think", "shrug", "think"]),
    "serious":  ("normal",     ["idle", "think", "idle"]),
    "warm":     ("happy",      ["wave", "idle", "shrug"]),
    "normal":   ("normal",     ["idle", "point", "idle", "shrug"]),
}


def _runs_for(voice_path: Path, duration: float) -> list[dict]:
    side = voice_path.with_suffix(".json")
    try:
        runs = json.loads(side.read_text(encoding="utf-8"))
        if runs:
            return runs
    except Exception:  # noqa: BLE001
        pass
    return [{"start": 0.0, "end": duration, "mood": "normal"}]


@router.get("/{job_id}/pick")
def studio_pick(job_id: str) -> dict:
    """Which scenes the presenter says to camera — the app decides from what
    each scene says (user, 2026-11-18: "no fixed formula"), balanced so the
    studio is never too much and never gone."""
    import autovideo_smart as sm
    app = _app()
    job = app._av_read(job_id)
    scenes = job.get("scenes") or []
    if scenes and not all(s.get("plan") for s in scenes):
        sm.attach_scene_plans(str(job.get("title") or ""), scenes)  # an older job: plan it now
        job["scenes"] = scenes
        app._av_write(job)
    return {"scenes": sm.pick_studio_scenes(scenes), "count": len(scenes)}


@router.get("/{job_id}/timeline")
def studio_timeline(job_id: str, scene: int, character: str, variant: int = 0) -> dict:
    """The 3D timeline of one studio scene (one character, lip-synced)."""
    import tools_animator as ta
    app = _app()
    job = app._av_read(job_id)
    scenes = job.get("scenes") or []
    files = job.get("voice_files") or []
    if scene < 0 or scene >= len(scenes) or scene >= len(files):
        raise HTTPException(400, "Make the voiceover first (Audio step).")
    voice = Path(str(files[scene]))
    if not voice.is_absolute():
        voice = app._av_job_dir(job_id) / voice.name
    if not voice.exists():
        raise HTTPException(404, "This scene's voice file is missing — run the Audio step again.")
    duration = float(scenes[scene].get("duration_sec") or 0) or 1.0
    wav = voice.with_name(f"studio-{scene:02d}.wav")
    ta._run_ffmpeg(["-i", str(voice), "-ac", "1", "-ar", str(ta.SAMPLE_RATE), "-c:a", "pcm_s16le", str(wav)])
    mouths = ta._mouth_track(ta._read_pcm(wav))
    wav.unlink(missing_ok=True)
    fps = ta.FPS
    total = max(1, math.ceil(duration * fps))
    runs = _runs_for(voice, duration)
    # the pop-ups of this scene: the presenter looks toward the side each one appears on
    looks: list[tuple[float, float, str]] = []
    try:
        import autovideo_smart as sm
        one = [dict(s, studio=(k == scene)) for k, s in enumerate(scenes)]
        offset = sum(float(s.get("duration_sec") or 0) for s in scenes[:scene])
        for p in sm.plan_auto_popups(one, app._av_job_dir(job_id), "normal", runs_by_scene={scene: runs}, only_scene=scene):
            looks.append((p["start"] - offset, p["end"] - offset, p.get("side") or "right"))
    except Exception:  # noqa: BLE001 — no looks, still a fine scene
        looks = []
    rng = random.Random(f"{job_id}-{scene}-{variant}")
    fmt = "reel" if job.get("video_type") == "short" else "long"
    frames = []
    pose, pose_until = "idle", 0
    blink_at = rng.randint(30, 80)
    shot, shot_until = 1.0, 0
    for n in range(total):
        t = n / fps
        run = next((r for r in runs if r["start"] <= t < r["end"] + 0.25), runs[-1])
        expr, gestures = _LOOK.get(str(run.get("mood")), _LOOK["normal"])
        mouth = mouths[n] if n < len(mouths) else None
        talking = any(m for m in mouths[max(0, n - 12):n + 12]) if mouths else False
        if n >= pose_until:
            # a new gesture every ~2 s while speaking; hands down in the pauses
            pose = rng.choice(gestures) if talking else "idle"
            pose_until = n + rng.randint(int(fps * 1.6), int(fps * 2.8))
        if n >= shot_until:
            # the camera operator: medium, close, a slow push
            shot = rng.choice([1.0, 1.18, 1.35, 1.18])
            shot_until = n + rng.randint(int(fps * 3), int(fps * 6))
        look = next((sd for a, b, sd in looks if a <= t < min(b, a + 1.6)), None)  # a glance at the word, then back
        if look:
            pose = "point"  # a hand toward the word too
        blink = blink_at <= n < blink_at + 3
        if n >= blink_at + 3:
            blink_at = n + rng.randint(55, 110)
        frames.append({
            "scene": 0,
            "chars": [{"cid": character, "x": 0.5, "facing": "right", "stance": "stand", "sprite_stance": "stand",
                       "pose": pose, "expr": expr, "mouth": mouth, "blink": blink, "look": look, "flags": {},
                       "dx": 0.0, "dy": 0.0, "rot": 0, "emote": None, "act": None, "wact": None, "form": None,
                       "hand": None, "morph": None}],
            "cam": {"z": shot, "x": ta.FORMATS[fmt][0] / 2, "y": ta.FORMATS[fmt][1] * 0.42, "sx": 0, "sy": 0},
        })
    w, h = ta.FORMATS[fmt]
    sw, sh = ta._sprite_size(fmt)
    return {
        "actions": {}, "frames": frames, "cues": [], "pops": [], "extras": [], "effects": [], "auto_chars": [],
        "layouts": [{"kind": "studio", "blueprint": "studio", "name": "studio", "location": "tv studio",
                     "seed": 7 + variant, "props": [], "quiet": True}],
        "fps": fps, "format": fmt, "size": [sw, sh], "width": w, "height": h, "feetY": ta._feet_y(fmt),
        "geometry": ta._geometry(fmt), "scenes": 1, "subtitles": False,
        "lie": [{"sitting": False, "seat_end": None}],
        "studio": True,
    }


@router.post("/{job_id}/scene/{scene}")
async def studio_scene_upload(job_id: str, scene: int, fps: int = Form(24),
                              file: UploadFile = File(...)) -> dict:
    """The filmed studio clip (raw H.264 from the browser) → this scene's footage."""
    app = _app()
    job = app._av_read(job_id)
    scenes = job.get("scenes") or []
    if scene < 0 or scene >= len(scenes):
        raise HTTPException(404, "Scene not found.")
    job_dir = app._av_job_dir(job_id)
    raw = job_dir / f"studio-{scene:02d}.h264"
    with open(raw, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    clip = job_dir / f"studio-{scene:02d}.mp4"
    # + half a second of the last picture, so the clip never runs short of its scene
    import tools_animator as ta
    try:
        ta._run_ffmpeg(["-f", "h264", "-r", str(fps), "-i", str(raw),
                        "-vf", "tpad=stop_mode=clone:stop_duration=0.6", "-c:v", "libx264", "-preset", "veryfast",
                        "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(clip)])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"The studio clip could not be saved: {str(exc)[-300:]}") from exc
    finally:
        raw.unlink(missing_ok=True)
    if not clip.exists():
        raise HTTPException(502, "The studio clip could not be saved.")
    job = app._av_read(job_id)
    job["scenes"][scene]["studio"] = True
    if (job_dir / "final.mp4").exists() and job.get("status") == "done":
        res = app._apply_scene_visual(job, job_dir, scene, clip, "clip")
        return {"scene": scene, "applied": True, "final_duration_sec": res.get("final_duration_sec")}
    app._plan_scene_visual(job, scene, clip, "clip")
    return {"scene": scene, "applied": False}
