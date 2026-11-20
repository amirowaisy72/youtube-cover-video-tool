"""YT Guru — Script mode for the Visual Explainer (user, 2026-11-20).

The user copies a ready prompt (his scenes + the scene-code guide) into any AI, pastes the AI's scene code
back, saves it with the video, tests each scene, and the final render draws every scene from that code —
timed to the real voice, with sound effects. Code is checked before it runs (check()).
"""
from __future__ import annotations

import ast
import json
import re
import threading
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/visual/script", tags=["visual-script"])
WORDS_PER_SEC = 2.6
_LOCK = threading.Lock()

# ------------------------------------------------------------------ safety check
_BAD_NAMES = {"eval", "exec", "open", "compile", "__import__", "getattr", "setattr", "delattr", "globals", "locals", "vars",
              "input", "breakpoint", "help", "memoryview", "type", "object", "super", "classmethod", "staticmethod",
              "property", "os", "sys", "subprocess", "shutil", "pathlib", "Path", "socket", "requests", "urllib",
              "importlib", "builtins", "__builtins__", "quit"}
_BAD_ATTRS = {"format", "format_map", "mro", "func_globals", "gi_frame", "f_globals", "f_locals", "f_back", "tb_frame",
              "co_code", "system", "popen", "remove_file", "write_text", "write_bytes", "unlink", "rmdir", "spawn",
              "save_image", "get_image", "save", "savez", "savez_compressed", "savetxt", "load", "loadtxt", "fromfile",
              "tofile", "genfromtxt", "memmap", "lib", "ctypeslib", "f2py", "distutils", "testing", "dump", "dumps",
              "write", "writelines", "open", "file", "path", "renderer", "camera_config", "config", "ctypes"}


def check(code: str) -> tuple[str, list[str]]:
    """("", names used with thing()/items) when the code may run, else (the reason, [])."""
    if not code.strip():
        return "This scene has no code.", []
    if len(code) > 20000:
        return "This scene's code is too long (keep it under ~200 lines).", []
    try:
        tree = ast.parse(code, "<scene>")
    except SyntaxError as exc:
        return f"line {exc.lineno}: SyntaxError: {exc.msg}", []
    names = []
    for node in ast.walk(tree):
        line = getattr(node, "lineno", "?")
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return f"line {line}: imports are not allowed (everything needed is already available).", []
        if isinstance(node, (ast.ClassDef, ast.Global, ast.Nonlocal, ast.AsyncFunctionDef, ast.Await, ast.With,
                             ast.AsyncWith, ast.AsyncFor)):
            return f"line {line}: '{type(node).__name__}' is not allowed in scene code.", []
        if isinstance(node, ast.Name) and (node.id in _BAD_NAMES or node.id.startswith("__")):
            return f"line {line}: '{node.id}' is not allowed in scene code.", []
        if isinstance(node, ast.Attribute) and (node.attr.startswith("_") or node.attr in _BAD_ATTRS):
            return f"line {line}: '.{node.attr}' is not allowed in scene code.", []
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and "__" in node.value:
            return f"line {line}: text with '__' is not allowed.", []
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            fn = node.func.id
            if fn in ("thing", "swap", "pile") and node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                names.append(node.args[0].value)
            if fn in ("swap",) and len(node.args) > 1 and isinstance(node.args[1], ast.Constant) and isinstance(node.args[1].value, str):
                names.append(node.args[1].value)
            for kw in node.keywords:
                if kw.arg in ("item", "name") and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                    names.append(kw.value.value)
    return "", list(dict.fromkeys(n for n in names if n))


_MARK = re.compile(r"^\s*#+\s*=*\s*SCENE\s+(\d+)\b[^\n]*$", re.I | re.M)


def parse(text: str) -> dict[int, str]:
    """The pasted AI answer -> {scene number: code}. Markdown fences and chat text around them are ignored."""
    t = text.replace("\r\n", "\n")
    t = re.sub(r"^\s*```[a-zA-Z]*\s*$", "", t, flags=re.M)
    marks = list(_MARK.finditer(t))
    out: dict[int, str] = {}
    for k, m in enumerate(marks):
        end = marks[k + 1].start() if k + 1 < len(marks) else len(t)
        body = t[m.end():end].strip("\n")
        n = int(m.group(1))
        if body.strip():
            out[n] = body.rstrip() + "\n"
    return out


# ------------------------------------------------------------------ timing
def word_times(scene: dict, index: int, work_dir: Path, duration: float, cues=None) -> list[list]:
    """[word, seconds] for every word of the narration: the real voice when known, else an estimate."""
    narration = str(scene.get("narration") or "")
    words = narration.split()
    wf = work_dir / f"scene-{index:02d}.words.json"
    if wf.exists():
        try:
            import autovideo2
            heard = json.loads(wf.read_text(encoding="utf-8"))
            al = autovideo2._align_to_script(heard, narration)
            if len(al) == len(words) and all(a["word"] == w for a, w in zip(al, words)):
                return [[w, round(a["start"], 3)] for a, w in zip(al, words)]
        except Exception:  # noqa: BLE001
            pass
    import tools_graphics as tg
    clock = tg._Clock(narration, duration, cues)
    if cues:
        return [[w, round(clock.at_word(i), 3)] for i, w in enumerate(words)]
    # no voice yet: syllable-weighted estimate (long words take longer)
    weights = [max(1, len(re.findall(r"[aeiouy]+", w.lower()))) + (0.6 if w.endswith((".", ",", ":", ";", "?", "!")) else 0)
               for w in words]
    tot = sum(weights) or 1
    out, acc = [], 0.15
    span = max(0.5, duration - 0.4)
    for w, wt in zip(words, weights):
        out.append([w, round(acc, 3)])
        acc += wt / tot * span
    return out


def est_duration(narration: str) -> float:
    return round(len(narration.split()) / WORDS_PER_SEC + 0.6, 2)


def spec_for(scene: dict, index: int, work_dir: Path, duration: float, cues=None) -> dict:
    _err, names = check(scene.get("code") or "")
    return {"theme": "visual", "code": scene.get("code") or "", "narration": scene.get("narration") or "",
            "duration": round(max(1.0, duration), 2), "words": word_times(scene, index, work_dir, duration, cues),
            "objects": [{"id": f"n{k}", "obj": n} for k, n in enumerate(names)], "beats": []}


def clip_for_scene(scene: dict, index: int, work_dir: Path, duration: float, cues, vertical: bool) -> Path | None:
    """The final animation of a scene from its code, in time with the voice (cached while nothing changes)."""
    import tools_visual as tv
    err, _ = check(scene.get("code") or "")
    if err:
        raise RuntimeError(f"Scene {index + 1} code: {err}")
    spec = spec_for(scene, index, work_dir, duration, cues)
    out = work_dir / f"scene-{index:02d}-visual.mp4"
    key = json.dumps({"s": spec, "v": vertical, "script": 1}, sort_keys=True)
    stamp = out.with_suffix(".key")
    if out.exists() and stamp.exists() and stamp.read_text(encoding="utf-8") == key:
        return out
    w, h = (1080, 1920) if vertical else (1280, 720)
    rep: dict = {}
    p = tv.render(spec, out, w, h, fps=30, script=True, report=rep, timeout=1500)
    if rep.get("error"):
        print(f"scene {index + 1} code error:", rep["error"])
    if p is not None:
        stamp.write_text(key, encoding="utf-8")
    return p


# ------------------------------------------------------------------ the prompts
def _library() -> str:
    import tools_visual as tv
    names = tv.library_names()
    mine = sorted(tv.my_shapes())
    return ", ".join(names) + (f"\nThe user's own drawn shapes: {', '.join(mine)}" if mine else "")


GUIDE = r'''You are the animation director of a YouTube EXPLAINER video. Write the animation of EVERY scene below as
Python code for my app (it runs Manim Community Edition with extra tools). Style: flat, colourful drawn objects on a
dark navy background (#1b2433) with a floor; every idea is SHOWN with motion, numbers COUNT up, every motion has a
sound effect. No stock footage, no static slides, no long sentences on screen.

THE STAGE (16:9): x from -7 (left) to 7 (right); y from FLOOR = -2.4 (the floor line) up to TOP = 3.6.
Below the floor is the caption area: never put anything below FLOOR. Things that stand on the floor are placed
there automatically (thing(...) without y). Keep big things 2.5-4 units tall; keep the stage full, centred and tidy;
never let things overlap text.

TIMING: the narration is spoken while your code runs. Use when("exact words") to wait until those words are spoken,
then animate. Copy the words EXACTLY from that scene's narration, in order. A new visual action every 3-5 seconds.
Something must already move in the FIRST second of every scene (before the first when()).
Actions run ONE AFTER ANOTHER and take time (enter 0.5-1 s, flow/pile 1.6 s, count 1.4 s), so give each when() at
most 2-3 actions (use dur= to make them quicker). If the code falls behind the voice the app speeds it up. Use clear() between
ideas. Each scene lasts about the time shown (words / 2.6 per second); the code simply stops when the voice ends.

TOOLS (already available — NO imports):
  when("words"), at("words") -> seconds, wait(sec), now(), remaining(), DURATION
  thing(name, x=0, y=None, h=None, w=None, color=None, text=None, count=None, points=None, values=None, share=None)
      -> a drawn object, not shown yet.  text= for price_tag; count= for crowd/skyline; points=[..] for line_chart;
         values=[..] for bar_chart; share=0.3 for pie.  h = height (w = width for wide things).
  text("$235 million", x=0, y=2.6, size=1.0, style="number"|"title"|"label", color=None) -> text, not shown yet
  enter(m, how="pop"|"grow"|"draw"|"fade"|"build"|"left"|"right"|"top"|"bottom")   exit(m)   clear()
  move(m, to=(x, y) or other_thing, side="up"|"down"|"left"|"right", dur=1.0, arc=False)
  grow(m, k=1.5, axis="y")   (axis "y" grows upward from its base, like a bar or a tower)
  count(text_obj, to=235, frm=0, prefix="$", suffix=" million", decimals=0, dur=1.4)   (counts up, ticking)
  flow(a, b, item="coin", n=8)   pile(item="coin", n=12, x=0, size=0.6)   clone(m, n=8)
  split(m, rows=3, cols=5)   give(m, to=person, label="1 share")   drop(m)   topple(m)   shake(m)   pulse(m)
  swap(m, name="trophy") / swap(text_obj, text="$100")   recolor(m, RED)   label(m, "PS5")   badge("VICE CITY")
  camera(zoom=1.3, to=(x, y))   no_floor()
  play(*any_manim_animations, run_time=1.0, sound="whoosh")   sfx("pop")   add(m)   remove(m)
  Plain Manim is available too: Circle, Square, Rectangle, RoundedRectangle, Line, Arrow, Dot, Polygon, Arc, VGroup,
  Text, FadeIn, FadeOut, Create, Write, Transform, ReplacementTransform, GrowFromCenter, GrowFromEdge, Indicate,
  Rotate, LaggedStart, Succession, ValueTracker, always_redraw, m.animate..., UP/DOWN/LEFT/RIGHT, rate.ease_out_back.
  Colours: ORANGE TEAL GOLD CREAM RED GREEN BLUE PURPLE PINK SLATE INK GREY BROWN BG.  Fonts: SERIF, FONT.
  Sounds: pop whoosh swoosh swoosh_down riser coin thud tick click ding crack rumble zap. The tools above make
  their own sounds; with play(...) give sound="..." so EVERY motion is heard.

DRAWN OBJECTS (names for thing()): {library}
Other simple nouns also work (drawn as an icon), but prefer these.
Tips: a crowd is a row of small people — use count=4-6 for a big crowd. split() looks best on wide things (factory,
box, pie, gold_bar). Make the main thing of each idea big (h=3-4) and put at most 3-4 things on stage at once.

RULES: no import, no files, no names starting with "_", no class. Text on screen: 1-4 words, numbers as
"$10 billion". Show what the narrator says at the moment he says it (names as badges/labels: "PS5", "Take-Two").
Do not show copyrighted logos or characters.

ANSWER FORMAT — one code block, every scene starting with its marker line, nothing else:
# === SCENE 1 ===
<code>
# === SCENE 2 ===
<code>

EXAMPLE (scene: "A small bakery sells 200 loaves a day. Then a big chain opens next door and her sales fall by half."):
# === SCENE 1 ===
shop = thing("shop", x=-3.5, h=3.2)
when("A small bakery")
enter(shop, "grow")
n = text("0 loaves", x=-3.5, y=2.7, style="number")
when("200 loaves")
pile("bread", n=10, x=2.5, size=0.8)
count(n, to=200, suffix=" loaves")
when("Then a big")
clear()
big = thing("factory", x=3.2, h=3.8, color="blue")
small = thing("shop", x=-3.5, h=2.4)
enter(small, "pop")
enter(big, "right")
shake(small)
s = text("200", x=-3.5, y=1.6, style="number")
when("fall by half")
add(s)
count(s, to=100, frm=200)
recolor(small, GREY)
'''


def build_prompt(title: str, scenes: list[dict]) -> str:
    lines = []
    for i, sc in enumerate(scenes):
        nar = str(sc.get("narration") or "").strip()
        d = float(sc.get("duration_sec") or 0) or est_duration(nar)
        lines.append(f"SCENE {i + 1} (about {d:.0f} seconds): {nar}")
    return (GUIDE.replace("{library}", _library()) + f'\nVIDEO TITLE: "{title}"\n\nTHE SCENES:\n' + "\n\n".join(lines)
            + "\n\nWrite the code for ALL scenes now.")


def fix_prompt(title: str, scenes: list[dict], index: int, error: str, warnings: list[str]) -> str:
    sc = scenes[index]
    nar = str(sc.get("narration") or "").strip()
    probs = (f"ERROR: {error}\n" if error else "") + "".join(f"WARNING: {w}\n" for w in warnings or [])
    return (GUIDE.replace("{library}", _library()) + f'\nVIDEO TITLE: "{title}"\n\nSCENE {index + 1} '
            f"(about {est_duration(nar):.0f} seconds): {nar}\n\nThis code for scene {index + 1} has a problem:\n"
            f"{probs}\n```python\n# === SCENE {index + 1} ===\n{sc.get('code') or ''}```\n\n"
            f"Fix it and answer with the whole corrected code of scene {index + 1} only, starting with its marker line.")


# ------------------------------------------------------------------ storyboard / test
def placeholder(path: Path, n: int, w: int, h: int, note: str = "waiting for your scene code") -> None:
    try:
        from PIL import Image, ImageDraw, ImageFont
        im = Image.new("RGB", (w, h), (27, 36, 51))
        d = ImageDraw.Draw(im)
        d.rectangle([0, int(h * 0.8), w, h], fill=(36, 48, 72))
        try:
            f1 = ImageFont.truetype(str(Path(__file__).resolve().parent / "fonts" / "Poppins-Bold.ttf"), max(18, h // 10))
            f2 = ImageFont.truetype(str(Path(__file__).resolve().parent / "fonts" / "Poppins-Regular.ttf"), max(12, h // 22))
        except Exception:  # noqa: BLE001
            f1 = f2 = ImageFont.load_default()
        d.text((w // 2, int(h * 0.38)), f"Scene {n}", fill=(242, 169, 59), font=f1, anchor="mm")
        d.text((w // 2, int(h * 0.55)), note, fill=(230, 226, 214), font=f2, anchor="mm")
        im.save(path)
    except Exception:  # noqa: BLE001
        pass


def test_scene(job: dict, index: int, work_dir: Path) -> dict:
    """A quick low-resolution run of one scene's code: the preview video becomes its storyboard."""
    import tools_visual as tv
    sc = job["scenes"][index]
    err, _ = check(sc.get("code") or "")
    if err:
        sc["script_test"] = {"ok": False, "error": err, "warnings": [], "at": time.time()}
        return sc["script_test"]
    vertical = (job.get("video_type") or "long") == "short"
    w, h = (360, 640) if vertical else (640, 360)
    dur = float(sc.get("duration_sec") or 0) or est_duration(sc.get("narration") or "")
    spec = spec_for(sc, index, work_dir, dur, None)
    out = work_dir / f"scene-{index:02d}-script-{int(time.time()) % 100000}.mp4"
    rep: dict = {}
    try:
        tv.render(spec, out, w, h, fps=15, script=True, report=rep, timeout=600)
    except Exception as exc:  # noqa: BLE001
        rep["error"] = rep.get("error") or str(exc)[-500:]
    ok = not rep.get("error") and out.exists()
    warn = list(rep.get("warnings") or [])
    if ok and rep.get("sounds", 0) < max(2, dur / 4):
        warn.append(f"only {rep.get('sounds', 0)} sound effects in {dur:.0f} seconds — add more motion with sounds")
    if out.exists():
        old = sc.get("visual_file")
        sc.update(kind="clip", visual_file=out.name, graphic_file=out.name,
                  visual_source="Your scene code — " + ("tested ✓ (low-resolution preview; the final video is sharp and has the voice)"
                                                      if ok else "has a problem — see Script mode"))
        if old and old != out.name and old.startswith(f"scene-{index:02d}-script-"):
            try:
                (work_dir / old).unlink()
                (work_dir / old).with_suffix(".sfx.json").unlink(missing_ok=True)
            except OSError:
                pass
    sc["script_test"] = {"ok": ok, "error": rep.get("error") or "", "warnings": warn[:10], "at": time.time()}
    return sc["script_test"]


# ------------------------------------------------------------------ endpoints
def _app():
    import tools_visual as tv
    app = tv._av()
    if app is None:
        raise HTTPException(503, "The app is not ready.")
    return app


def _job(job_id: str):
    app = _app()
    try:
        job = app._av_read(job_id)
    except Exception:  # noqa: BLE001
        raise HTTPException(404, "Video not found.") from None
    if not job.get("scenes"):
        raise HTTPException(400, "Make the storyboard first (step 2) — the scenes are needed for the prompt.")
    return app, job


def _status(job: dict) -> dict:
    return {"code": job.get("script_code") or "",
            "scenes": [{"index": i, "has_code": bool(sc.get("code")), "test": sc.get("script_test") or None,
                        "visual_file": sc.get("visual_file"), "kind": sc.get("kind"), "visual_source": sc.get("visual_source")}
                       for i, sc in enumerate(job.get("scenes") or [])]}


@router.get("/{job_id}")
def get_script(job_id: str) -> dict:
    _app_, job = _job(job_id)
    return _status(job)


@router.get("/{job_id}/prompt")
def get_prompt(job_id: str) -> dict:
    _app_, job = _job(job_id)
    return {"prompt": build_prompt(job.get("title") or "", job["scenes"])}


@router.get("/{job_id}/fix/{index}")
def get_fix(job_id: str, index: int) -> dict:
    _app_, job = _job(job_id)
    if not 0 <= index < len(job["scenes"]):
        raise HTTPException(404, "Scene not found.")
    t = job["scenes"][index].get("script_test") or {}
    return {"prompt": fix_prompt(job.get("title") or "", job["scenes"], index, t.get("error") or "", t.get("warnings") or [])}


class SaveReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    code: str = Field(..., max_length=400000)
    replace: bool = True  # False: only the scenes in this paste change (a fixed scene)


@router.post("/save")
def save_script(req: SaveReq) -> dict:
    """Saves the pasted code with the video: each scene's code is checked (not run yet)."""
    app, job = _job(req.job_id)
    parts = parse(req.code)
    if not parts:
        raise HTTPException(400, "No scene code found. The answer must contain lines like  # === SCENE 1 ===  before each scene's code.")
    scenes = job["scenes"]
    extra = sorted(n for n in parts if not 1 <= n <= len(scenes))
    results = []
    with _LOCK:
        for i, sc in enumerate(scenes):
            code = parts.get(i + 1)
            if code is None:
                if req.replace:
                    sc.pop("code", None)
                    sc.pop("script_test", None)
                continue
            err, names = check(code)
            if sc.get("code") != code:
                sc.pop("script_test", None)
            sc["code"] = code
            sc.setdefault("graphic", {"theme": "visual", "script": True, "objects": [], "beats": []})
            sc["graphic"] = {**(sc.get("graphic") or {}), "theme": "visual"}
            if err:
                sc["script_test"] = {"ok": False, "error": err, "warnings": [], "at": time.time()}
            results.append({"index": i, "error": err, "objects": names})
        if req.replace:
            job["script_code"] = req.code
        else:  # a fixed scene: the saved full text gets that scene's new code
            job["script_code"] = "\n".join(f"# === SCENE {i + 1} ===\n{sc['code']}" for i, sc in enumerate(scenes) if sc.get("code"))
        app._av_write(job)
    missing = [i + 1 for i, sc in enumerate(scenes) if not sc.get("code")]
    return {**_status(job), "found": len(parts), "missing": missing, "extra": extra, "results": results}


class TestReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    index: int = Field(..., ge=0, le=500)


@router.post("/test")
def test(req: TestReq) -> dict:
    app, job = _job(req.job_id)
    if not 0 <= req.index < len(job["scenes"]):
        raise HTTPException(404, "Scene not found.")
    if not job["scenes"][req.index].get("code"):
        raise HTTPException(400, "This scene has no code yet.")
    work_dir = app._av_job_dir(req.job_id)
    res = test_scene(job, req.index, work_dir)
    with _LOCK:  # the job may have changed while the scene was drawn: only this scene's result is written
        fresh = app._av_read(req.job_id)
        fresh["scenes"][req.index].update({k: job["scenes"][req.index].get(k) for k in
                                           ("script_test", "kind", "visual_file", "graphic_file", "visual_source")})
        app._av_write(fresh)
    return {"result": res, "scene": fresh["scenes"][req.index]}


class ClearReq(BaseModel):
    job_id: str = Field(..., max_length=40)


@router.post("/clear")
def clear(req: ClearReq) -> dict:
    """Removes the scene code: the scenes go back to the app's own animation (or the simple version)."""
    app, job = _job(req.job_id)
    with _LOCK:
        for sc in job["scenes"]:
            sc.pop("code", None)
            sc.pop("script_test", None)
        job["script_code"] = ""
        app._av_write(job)
    return _status(job)
