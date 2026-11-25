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

import vis_master

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
        if (isinstance(node, ast.Constant) and isinstance(node.value, str) and "__" in node.value
                and not re.match(r"https?://\S+$", node.value)):
            return f"line {line}: text with '__' is not allowed.", []
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            fn = node.func.id
            if fn == "transition" and any(not isinstance(a, ast.Constant) for a in [*node.args, *[k.value for k in node.keywords]]):
                return (f"line {line}: transition() needs plain text, e.g. transition(\"whip\", \"in\")."), []
            if fn == "source" and not all(_source_args(node)):
                return (f"line {line}: source() needs the page link and the quoted sentence written as plain text: "
                        'source("https://...", "the exact sentence").'), []
            if fn in ("thing", "swap", "pile") and node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                names.append(node.args[0].value)
            if fn in ("swap",) and len(node.args) > 1 and isinstance(node.args[1], ast.Constant) and isinstance(node.args[1].value, str):
                names.append(node.args[1].value)
            for kw in node.keywords:
                if kw.arg in ("item", "name") and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                    names.append(kw.value.value)
    return "", list(dict.fromkeys(n for n in names if n))


def _source_nodes(node: ast.Call) -> list:
    given = dict(zip(("url", "quote"), node.args))
    given.update({kw.arg: kw.value for kw in node.keywords if kw.arg in ("url", "quote")})
    return [given.get("url"), given.get("quote")]


def _source_args(node: ast.Call) -> tuple[str, str]:
    """The (url, quote) of a source() call when both are written as plain text, else empty strings.
    Returned exactly as written: vis_script.py matches these strings."""
    url, quote = (v.value if isinstance(v, ast.Constant) and isinstance(v.value, str) else "" for v in _source_nodes(node))
    return (url if url.strip().lower().startswith(("http://", "https://")) else ""), (quote if quote.strip() else "")


def source_calls(code: str) -> list[tuple[str, str]]:
    """Every (url, quote) the scene code shows with source()."""
    try:
        tree = ast.parse(code or "")
    except SyntaxError:
        return []
    out = [_source_args(n) for n in ast.walk(tree)
           if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "source"]
    return list(dict.fromkeys(c for c in out if all(c)))


def _calls(code: str):
    """(function name, [positional text values or None], {keyword: text or None}) for every simple call, in order."""
    try:
        tree = ast.parse(code or "")
    except SyntaxError:
        return []
    text = lambda v: v.value if isinstance(v, ast.Constant) and isinstance(v.value, str) else None  # noqa: E731
    nodes = [n for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)]
    return [(n.func.id, [text(a) for a in n.args], {k.arg: text(k.value) for k in n.keywords})
            for n in sorted(nodes, key=lambda n: (n.lineno, n.col_offset))]


def transitions_of(code: str) -> dict:
    """{"in": kind, "out": kind} asked for with transition()."""
    import vis_transitions
    out = {}
    for fn, args, kw in _calls(code):
        if fn == "transition":
            kind = vis_transitions.kind_name(args[0] if args else kw.get("kind", "whip"))
            when = (args[1] if len(args) > 1 else kw.get("when", "in")) or "in"
            if kind and when in ("in", "out"):
                out[when] = kind
    return out


def setting_of(code: str) -> str:
    import vis_sets
    for fn, args, kw in _calls(code):
        if fn == "setting":
            return vis_sets.setting_name(args[0] if args else kw.get("name")) or ""
    return ""


def things_of(code: str) -> list[str]:
    """The drawn things a scene's code puts on stage (characters, text and settings are not counted)."""
    import icon_pack
    import tools_visual as tv
    K = tv._vk()
    out = []
    for fn, args, kw in _calls(code):
        names = []
        if fn == "thing":
            names = [args[0] if args else kw.get("name")]
        elif fn == "pile":
            names = [args[0] if args else kw.get("item", "coin")]
        elif fn == "flow":
            names = [args[2] if len(args) > 2 else kw.get("item", "coin")]
        elif fn == "swap":
            names = [args[1] if len(args) > 1 else kw.get("name")]
        for n in names:
            if n:
                key = K.resolve(n) or icon_pack.key_of(n) or n.strip().lower().replace(" ", "_")
                if key not in out:
                    out.append(key)
    return out


def masters_of(code: str) -> list[str]:
    """The master scenes (compound(), revenue_split() ...) a scene's code calls."""
    return [fn for fn, _a, _k in _calls(code) if fn in vis_master.NAMES]


MAX_USES = 3  # one thing in at most this many scenes of a video


def used_things(scenes: list[dict], skip: int = -1) -> dict[str, list[int]]:
    """thing -> the scene numbers that use it."""
    out: dict[str, list[int]] = {}
    for i, sc in enumerate(scenes):
        if i != skip:
            for n in things_of(sc.get("code")):
                out.setdefault(n, []).append(i + 1)
    return out


def used_summary(scenes: list[dict], skip: int = -1) -> str:
    used = used_things(scenes, skip)
    shown = [f"{n}() in scene {i + 1}" for i, sc in enumerate(scenes) if i != skip for n in masters_of(sc.get("code"))]
    masters = f"MASTER SCENES already used: {', '.join(shown)}.\n\n" if shown else ""
    if not used:
        return masters
    lines = [f"  {n}: scene{'s' if len(s) > 1 else ''} {', '.join(map(str, s[:6]))}"
             + ("  <- limit reached, do NOT use it again" if len(s) >= MAX_USES else "")
             for n, s in sorted(used.items(), key=lambda x: -len(x[1]))[:40]]
    near = []
    for k, word in ((skip - 1, "previous"), (skip + 1, "next")):
        if skip >= 0 and 0 <= k < len(scenes) and things_of(scenes[k].get("code")):
            near.append(f"The {word} scene shows: {', '.join(things_of(scenes[k]['code']))} — do not repeat these.")
    return ("THINGS ALREADY USED in the other scenes (for variety):\n" + "\n".join(lines + near) + "\n\n") + masters


def variety_warnings(scenes: list[dict], index: int) -> list[str]:
    """Repetition that makes a video boring: the previous scene's things again, or one thing too often."""
    cur = things_of(scenes[index].get("code"))
    out = []
    if index > 0:
        same = [n for n in cur if n in things_of(scenes[index - 1].get("code"))]
        if same and len(same) * 2 >= len(cur):
            out.append(f"repeats the previous scene's main thing{'s' if len(same) > 1 else ''} ({', '.join(same)}) — "
                       "show this idea with something else")
    before = used_things(scenes[:index + 1])
    for n in cur:
        if len(before.get(n, [])) > MAX_USES:
            out.append(f"'{n}' is now in {len(before[n])} scenes ({', '.join(map(str, before[n]))}) — "
                       f"use one thing in at most {MAX_USES} scenes")
    mine = masters_of(scenes[index].get("code"))
    if len(mine) > 1:
        out.append(f"two master scenes in one scene ({', '.join(mine)}) — each fills the whole screen, use only one")
    for n in mine[:1]:
        if index > 0 and n in masters_of(scenes[index - 1].get("code")):
            out.append(f"{n}() is also the previous scene — do not use the same master scene twice in a row")
        uses = [i + 1 for i in range(index + 1) if n in masters_of(scenes[i].get("code"))]
        if len(uses) > 2:
            out.append(f"{n}() is now in {len(uses)} scenes — use a master scene at most 2 times in a video")
    here = setting_of(scenes[index].get("code"))
    if here and index > 1 and all(setting_of(scenes[k].get("code")) == here for k in (index - 1, index - 2)):
        out.append(f'the third scene in a row in setting("{here}") — change the background')
    return out


_MARK = re.compile(r"^\s*#+\s*=*\s*SCENE\s+(\d+)\b[^\n]*$", re.I | re.M)
# "# VISUAL IDEA: ..." — also accepted without "#", in bold or with "=" (an AI's habits), then made a comment
_IDEA = re.compile(r"^[ \t#>*_-]*VISUAL[ _]IDEA\b[ \t*_]*[:=\u2013\u2014-](?![=])[ \t*_]*(.*?)[ \t*_]*$", re.I)
_IDEA_QUOTED = re.compile(r"""^(["'])(.*)\1$""")


def _idea_line(line: str) -> str | None:
    """The line as a "# VISUAL IDEA: ..." comment, or None when it is not such a line."""
    m = _IDEA.match(line)
    if not m:
        return None
    text = _IDEA_QUOTED.sub(r"\2", m.group(1).strip())
    return f"# VISUAL IDEA: {text}"


def idea_of(code: str) -> str:
    """The scene's VISUAL IDEA (its comment line, plus indented comment lines right under it)."""
    lines = str(code or "").split("\n")
    for k, line in enumerate(lines):
        if line.lstrip().startswith("#") and _idea_line(line):
            text = [_idea_line(line).split(":", 1)[1].strip()]
            for more in lines[k + 1:]:
                m = re.match(r"^\s*#\s{2,}(\S.*)$", more)
                if not m:
                    break
                text.append(m.group(1).strip())
            return " ".join(x for x in text if x)[:400]
    return ""


def _unfence(t: str) -> str:
    """When the answer has code blocks with the scene markers inside, only those blocks count
    (a review or other chat text around them is not code)."""
    blocks = re.findall(r"^[ \t]*```[\w+-]*[ \t]*\n(.*?)^[ \t]*```", t, re.M | re.S)
    marked = [b for b in blocks if _MARK.search(b)]
    if marked and sum(len(_MARK.findall(b)) for b in marked) == len(_MARK.findall(t)):
        return "\n".join(marked)
    return re.sub(r"^\s*```[a-zA-Z]*\s*$", "", t, flags=re.M)


def single_block(text: str) -> str:
    """An answer without a scene marker: the code inside its one code block, else the whole text."""
    t = str(text).replace("\r\n", "\n")
    blocks = re.findall(r"^[ \t]*```[\w+-]*[ \t]*\n(.*?)^[ \t]*```", t, re.M | re.S)
    code = blocks[0] if len(blocks) == 1 else t.strip().strip("`").removeprefix("python")
    return "\n".join(_idea_line(x) or x for x in code.strip("\n").split("\n")).rstrip() + "\n"



def parse(text: str) -> dict[int, str]:
    """The pasted AI answer -> {scene number: code}. Markdown fences and chat text around them are ignored."""
    t = _unfence(text.replace("\r\n", "\n"))
    marks = list(_MARK.finditer(t))
    out: dict[int, str] = {}

    def trailing_idea(chunk: str) -> tuple[str, list[str]]:
        """An idea written ABOVE a scene marker belongs to that scene."""
        lines = chunk.rstrip().split("\n")
        k = len(lines)
        while k and (not lines[k - 1].strip() or _idea_line(lines[k - 1])):
            k -= 1
        return "\n".join(lines[:k]), [_idea_line(x) for x in lines[k:] if x.strip()]

    carried = trailing_idea(t[:marks[0].start()])[1] if marks else []
    for k, m in enumerate(marks):
        end = marks[k + 1].start() if k + 1 < len(marks) else len(t)
        body, below = trailing_idea(t[m.end():end]) if k + 1 < len(marks) else (t[m.end():end], [])
        body = "\n".join(carried + [_idea_line(x) or x for x in body.strip("\n").split("\n")])
        carried = below
        n = int(m.group(1))
        if any(x.strip() and not x.lstrip().startswith("#") for x in body.split("\n")):
            out[n] = body.strip("\n").rstrip() + "\n"
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
    extra = {}
    calls = source_calls(scene.get("code") or "")
    if calls:  # the web pages are photographed here, once (cached), before the animation is drawn
        import tools_source
        shots = tools_source.capture_many([(u.strip(), q.strip()) for u, q in calls])
        extra["sources"] = [{**d, "url": u, "quote": q} for (u, q), d in zip(calls, shots)]
    moves = transitions_of(scene.get("code") or "")
    if moves:
        import vis_sets
        extra["transitions"] = moves
        here = setting_of(scene.get("code") or "")
        extra["backdrop"] = vis_sets.PALETTE[here][0] if here else "#1b2433"
    return {**extra, "theme": "visual", "code": scene.get("code") or "", "narration": scene.get("narration") or "",
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
    import icon_pack
    import tools_visual as tv
    mine = sorted(tv.my_shapes())
    icons = "".join(f"\n  {cat.replace('_', ' ')}: {', '.join(names)}" for cat, names in icon_pack.by_category().items())
    return ("\n  drawn in the app's style (take color=): " + ", ".join(tv.library_names())
            + "\n  MORE THINGS (colourful icons; their colours are fixed):" + icons
            + (f"\n  the user's own drawn shapes: {', '.join(mine)}" if mine else ""))


GUIDE = r'''You are the animation director of a YouTube EXPLAINER video. Write the animation of EVERY scene below as
Python code for my app (it runs Manim Community Edition with extra tools). Style: flat, colourful drawn objects and
characters in front of quiet backgrounds with a floor; every idea is SHOWN with motion, numbers COUNT up, every motion has a
sound effect. No stock footage, no static slides, no long sentences on screen.

STEP 1 — IDEA FIRST, THEN CODE (required for every scene)
The first line of every scene's code is its idea, as a comment:
  # VISUAL IDEA: <what the viewer must understand in ONE glance> = <the visual metaphor that shows it>
  e.g.  # VISUAL IDEA: inflation makes money weaker = one big banknote SHRINKS while the bread's price tag GROWS
Test it: with the sound off, would a viewer understand the idea from the picture alone? "A coin appears, then a bank
appears" is NOT an idea. Show a CHANGE with a cause and an effect: something grows, shrinks, drains, fills, tips,
splits, snowballs, gets crushed, overtakes, runs out. Then write code that shows exactly that idea and nothing else.

STEP 2 — MAKE IT READABLE (required)
  - ONE main idea per moment. 1-3 things on stage at the same time, never more (a pile or flow counts as one).
  - The main thing is BIG (h = 3 to 4.5) and in the centre; helpers are clearly smaller and to the side.
  - Text on screen: 1-4 words or one number. Never a sentence. Text never covers an object.
  - Cause -> effect must be visible: first the cause moves, THEN (a moment later) the effect reacts to it.
  - Before a new idea: clear(), or exit() what is no longer needed. Do not collect old things on stage.
  - Compare with size and position: before on the left / after on the right; the bigger value is visibly bigger.
  - One visual language in the whole video: money, savings and the key number = GOLD; cost, loss, debt, danger = RED;
    growth, gain, good result = GREEN; banks and companies = BLUE; the viewer / a person = TEAL; past or unimportant =
    GREY. The same idea uses the same object and colour in every scene.

THE STAGE (16:9): x from -7 (left) to 7 (right); y from FLOOR = -2.4 (the floor line) up to TOP = 3.6.
Below the floor is the caption area: never put anything below FLOOR. Things that stand on the floor are placed
there automatically (thing(...) without y). Keep big things 2.5-4 units tall; keep the stage full, centred and tidy;
never let things overlap text.

TIMING: the narration is spoken while your code runs. Use when("exact words") to wait until those words are spoken,
then animate. Copy the words EXACTLY from that scene's narration, in order. A new visual action every 3-5 seconds.
Something must already move in the FIRST second of every scene (before the first when()).
Actions run ONE AFTER ANOTHER and take time (enter 0.5-1 s, flow/pile 1.6 s, count 1.4 s), so give each when() at
most 2-3 actions (use dur= to make them quicker). To move two things at the same moment (cause and effect together)
use play(a.animate..., b.animate..., sound="..."). If the code falls behind the voice the app speeds it up. Use clear()
between ideas. Each scene lasts about the time shown (words / 2.6 per second); the code simply stops when the voice ends.

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
  source(url, quote, highlight_words=None, until=None, hold=None)   PROOF on screen, like a documentary: the REAL
      web page floats in, the camera zooms to the sentence, its paragraph lifts toward the viewer and the words are
      marked exactly when the narrator says them (with sound). It fills the whole screen for about 5-8 seconds and
      then leaves by itself (or at until="words", or hold=seconds after the last mark). Use it in the scenes with
      the most important facts and numbers (about 1 scene in 3, at most once per scene):
        when("words said just before the fact", -1.0)     # call it about 2 seconds BEFORE the fact is spoken
        source("https://full.page/address", "The exact sentence copied from that page.",
               highlight_words=["the words", "that prove it"])
      url and quote must be copied EXACTLY from the SOURCES listed below (plain text in quotes, no variables):
      never invent or reword them; if a fact has no source below, do not use source() for it. highlight_words =
      short parts of the quote (default: the whole quote); prefer words the narrator also says. Add other
      animation after it only if enough time is left.
  play(*any_manim_animations, run_time=1.0, sound="whoosh")   sfx("pop")   add(m)   remove(m)
  Plain Manim is available too: Circle, Square, Rectangle, RoundedRectangle, Line, Arrow, Dot, Polygon, Arc, VGroup,
  Text, FadeIn, FadeOut, Create, Write, Transform, ReplacementTransform, GrowFromCenter, GrowFromEdge, Indicate,
  Rotate, LaggedStart, Succession, ValueTracker, always_redraw, m.animate..., UP/DOWN/LEFT/RIGHT, rate.ease_out_back.
  Colours: ORANGE TEAL GOLD CREAM RED GREEN BLUE PURPLE PINK SLATE INK GREY BROWN BG.  Fonts: SERIF, FONT.
  Sounds: pop whoosh swoosh swoosh_down riser coin thud tick click ding crack rumble zap. The tools above make
  their own sounds; with play(...) give sound="..." so EVERY motion is heard.

CHARACTERS — people who react (use them instead of thing("person") whenever someone feels or does something):
  p = person(pose="standing", x=-3, h=3.4, who="maya", mood=None, color=None, flip=False)   then enter(p)
      who: sam, maya, leo, nina, omar, grandpa, boss — keep ONE main character (same who) through the whole video
      pose: standing, happy, worried, sad, thinking, pointing, celebrating, running, shrug, surprised,
            holding_money, holding_phone        (pointing points right; flip=True points left)
      mood (only the face): neutral, happy, joy, worried, sad, thinking, surprised, angry, determined, confused
  pose(p, "worried")  -> moves smoothly into that pose, with sound.   mood(p, "surprised")  -> only the face.
  run_to(p, to=4, end="celebrating")  -> runs to x=4 with moving legs, then takes that pose.
  Change the pose ON THE WORD that causes the feeling:
      hero = person("happy", x=-3.5, who="maya")
      enter(hero, "left")
      when("the bill arrives")
      pose(hero, "worried")

SETTINGS — where the scene happens: setting("street") as the FIRST line after the idea. plain, street, office, home,
  shop, bank (a bank hall), night. Without setting() the plain navy stage. Choose what fits the narration; do not put
  more than 2 scenes in a row in the same setting. A setting is background only: it needs no thing() to repeat it
  (inside setting("bank") do not add thing("bank")).

TRANSITIONS — transition("whip" | "zoom" | "slide", "in" | "out"), with its sound; the app draws it in the first
  ("in") or last ("out") 0.3 s of the scene without changing its length. For one connected cut write
  transition("whip", "out") at the start of the earlier scene's code AND transition("whip", "in") in the next one.
  Use one on about 1 cut in 3, where the story jumps (new place, new time, new idea) — not on every scene.
  whip = meanwhile / another side; zoom = going deeper into a detail; slide = the next step.

VARIETY (the test warns about this):
  - A scene must not show the same main things as the scene before it.
  - One thing (coin, bank, wallet...) in at most 3 scenes of the whole video. Pick the specific object from the list
    (receipt, shopping_cart, umbrella, locked...) instead of "coin" and "bank" again.
  - Vary the layout too: not always "one thing left, one number right".

THINGS (names for thing(), flow(), pile()):{library}
Other simple nouns also work (drawn as an icon), but prefer these.
Tips: a crowd is a row of small people — use count=4-6 for a big crowd. split() looks best on wide things (factory,
box, pie, gold_bar).

RULES: no import, no files, no names starting with "_", no class. Text on screen: 1-4 words, numbers as
"$10 billion". Show what the narrator says at the moment he says it (names as badges/labels: "PS5", "Take-Two").
Do not show copyrighted logos or characters.

ANSWER FORMAT — one code block, every scene starting with its marker line, then its VISUAL IDEA line, nothing else:
# === SCENE 1 ===
# VISUAL IDEA: ...
<code>
# === SCENE 2 ===
# VISUAL IDEA: ...
<code>

EXAMPLE
(scene 1: "Inflation is a quiet thief. Your hundred dollars stays the same, but the price of bread keeps climbing."
 scene 2: "At seven percent a year, after ten years, that same hundred dollars buys only about half as much.")
# === SCENE 1 ===
# VISUAL IDEA: the money stays but prices run away = a still gold banknote next to a bread price that keeps rising
cash = thing("cash", x=-3, w=4.4, color=GOLD)
enter(cash, "pop")
have = text("$100", x=-3, y=0.9, style="number", size=1.3)
when("hundred dollars")
enter(have)
when("price of bread", -0.5)
loaf = thing("bread", x=3.2, h=1.9)
enter(loaf, "right", dur=0.5)
tag = thing("price_tag", x=3.2, y=0.6, h=1.3, text="$2", color=RED)
enter(tag, "pop", dur=0.4)
when("keeps climbing", -0.2)
move(tag, to=(3.2, 2.5), dur=0.5)
swap(tag, text="$4")
transition("whip", "out")
# === SCENE 2 ===
# VISUAL IDEA: the same money buys half = 8 shopping bags on the right, 4 of them fade away: before -> after
transition("whip", "in")
setting("plain")
money = text("$100", x=-4, y=1.2, style="number", size=1.5)
enter(money, "pop")
bags = VGroup(*[thing("shopping_bags", x=-0.7 + 1.9 * (i % 4), y=1.9 - 2.1 * (i // 4), h=1.4) for i in range(8)])
when("ten years")
play(LaggedStart(*[FadeIn(m, scale=0.5) for m in bags], lag_ratio=0.08), run_time=1.0, sound="pop")
when("only about half", -0.2)
play(*[bags[i].animate.set_opacity(0.1).shift(0.4 * DOWN) for i in (4, 5, 6, 7)], run_time=0.8, sound="swoosh_down")
half = text("half", x=-4, y=-0.5, style="number", size=1.5, color=RED)
when("half as much", -0.2)
enter(half)
'''


GUIDE = GUIDE.replace("CHARACTERS — people who react", vis_master.GUIDE + "CHARACTERS — people who react")


# General direction rules (user, 2026-11-22): appended to the copied prompt so the AI
# directs every scene well — camera, timing, new objects, physics, and a story that
# feels written for this video, not generic.
GENERAL_DIRECTION_RULES = '''GENERAL DIRECTION RULES (apply to every scene):
1. Smart camera use: keep the camera on the acting objects, with smooth zoom in/out — zoom in on the
important object, zoom out when a wide picture is needed.
2. Visuals and animation must stay well synced with the narration — timing matters most: the visual for
a word must appear at the exact moment that word is spoken (use when() correctly).
3. Do not limit yourself to only the given graphical objects — draw and animate new objects yourself
when needed (using Manim shapes). The end goal: the scene's demand is fulfilled and the scene is easy
to understand.
4. Pay close attention to physics — things fall with gravity, bounce when they bounce, slide with
momentum. Good physics in both the animations and the visuals.
5. The script must feel written specifically for this video, not generic. Every scene must connect to
the previous one and keep the viewer hooked in the story.'''


def _keys(text: str) -> tuple[set, set]:
    t = str(text or "").lower().replace(",", "")
    return set(re.findall(r"\d+(?:\.\d+)?", t)), set(re.findall(r"[a-z]{5,}", t))


def sources_by_scene(scenes: list[dict], sources: list[dict]) -> dict[int, list[dict]]:
    """Which source belongs to which scene (shared numbers and words); -1 = no clear scene."""
    texts = [_keys(sc.get("narration")) for sc in scenes]
    out: dict[int, list[dict]] = {}
    for s in sources:
        nums, words = _keys(f"{s.get('fact', '')} {s.get('quote', '')}")
        scores = [3 * len(nums & n) + len(words & w) for n, w in texts]
        best = max(range(len(scores)), key=scores.__getitem__) if scores else -1
        out.setdefault(best if scores and scores[best] >= 3 else -1, []).append(s)
    return out


def _source_line(s: dict) -> str:
    quote = str(s.get("quote") or "").replace('"', "'").replace("\\", " ")  # fits inside "…" in the code
    return f'  url: {s["url"]}\n  quote: "{quote}"' + (f'\n  (supports: {s["fact"]})' if s.get("fact") else "")


def build_prompt(title: str, scenes: list[dict], sources: list[dict] | None = None) -> str:
    usable = [s for s in sources or [] if s.get("url") and s.get("quote")]
    matched = sources_by_scene(scenes, usable)
    lines = []
    for i, sc in enumerate(scenes):
        nar = str(sc.get("narration") or "").strip()
        d = float(sc.get("duration_sec") or 0) or est_duration(nar)
        block = f"SCENE {i + 1} (about {d:.0f} seconds): {nar}"
        if matched.get(i):
            block += "\nSOURCES for this scene (for source()):\n" + "\n".join(_source_line(s) for s in matched[i])
        lines.append(block)
    if matched.get(-1):
        lines.append("OTHER SOURCES of this video (use one in the scene whose fact it supports):\n"
                     + "\n".join(_source_line(s) for s in matched[-1]))
    if not usable:
        lines.append("SOURCES: none were saved for this video, so do not use source().")
    if used_summary(scenes):  # scenes that already have code
        lines.append(used_summary(scenes).strip())
    return (GUIDE.replace("{library}", _library()) + f'\nVIDEO TITLE: "{title}"\n\nTHE SCENES:\n' + "\n\n".join(lines)
            + "\n\nFirst decide the video's visual language (which object and colour stands for each main idea) and keep it "
            "in every scene. Then write the code for ALL scenes now — each starting with its # VISUAL IDEA line.\n\n"
            + GENERAL_DIRECTION_RULES)


REVIEW_CHECKS = """  1. One glance: with the sound off, does a viewer understand the VISUAL IDEA from the pictures? Is it a real change
     (cause -> effect), or only objects appearing?
  2. Focus: is the main thing big and centred? More than 3 things on stage? Anything tiny or cluttered?
  3. Layout: anything overlapping, hidden, cut off at an edge, below the floor, or text too long / unreadable?
  4. Timing: does each frame show what the words spoken at that moment talk about? Anything early, late, or an empty
     or frozen stage?
  5. Visual language: do colours and objects mean the same as in the other scenes (money gold, loss red, growth green)?"""


def other_ideas(scenes: list[dict], index: int) -> str:
    """The VISUAL IDEA lines of the other scenes, so a fixed scene stays consistent with the video."""
    lines = [f"  Scene {i + 1}: {idea_of(sc.get('code'))}" for i, sc in enumerate(scenes)
             if i != index and idea_of(sc.get("code"))]
    if len(lines) > 12:  # a long video: the scenes around this one
        lines = [x for x in lines if abs(int(x.split()[1].rstrip(":")) - 1 - index) <= 6]
    ideas = ("VISUAL IDEAS OF THE OTHER SCENES (keep this video's visual language):\n" + "\n".join(lines) + "\n\n") if lines else ""
    return ideas + used_summary(scenes, index)


def frame_list(frames: list[dict]) -> str:
    return "\n".join(f'  Frame {k + 1} at {f["t"]:.1f} s' + (" (PAUSED HERE)" if f.get("paused") else "")
                     + (f' — spoken since the frame before: "{f["said"]}"' if f.get("said") else " — no new words")
                     for k, f in enumerate(frames))


def fix_prompt(title: str, scenes: list[dict], index: int, error: str, warnings: list[str],
               sources: list[dict] | None = None) -> str:
    sc = scenes[index]
    nar = str(sc.get("narration") or "").strip()
    code = sc.get("code") or ""
    frames = (sc.get("script_test") or {}).get("frames") or []
    probs = (f"ERROR: {error}\n" if error else "") + "".join(f"WARNING: {w}\n" for w in warnings or [])
    usable = [s for s in sources or [] if s.get("url") and s.get("quote")]
    mine = sources_by_scene(scenes, usable)
    shown = mine.get(index, []) + mine.get(-1, [])
    if shown:
        probs += "SOURCES (for source()):\n" + "\n".join(_source_line(s) for s in shown) + "\n"
    idea = idea_of(code)
    look = ""
    if frames:
        look = (f"\nSELF-CHECK — I attached an image: the contact sheet of this scene ({len(frames)} frames from a low-resolution "
                f"test; timings are estimates until the voice is made).\n{frame_list(frames)}\n"
                "(If no image is attached, ask me to attach it before judging the look.)\n"
                f"LOOK at the frames and judge them against the VISUAL IDEA and the narration:\n{REVIEW_CHECKS}\n")
    return (GUIDE.replace("{library}", _library()) + f'\nVIDEO TITLE: "{title}"\n\n' + other_ideas(scenes, index)
            + f"SCENE {index + 1} (about {est_duration(nar):.0f} seconds): {nar}\n"
            + f"VISUAL IDEA of this scene: {idea or '(none written yet — write one first)'}\n\n"
            + f"The current code of scene {index + 1}:\n```python\n# === SCENE {index + 1} ===\n{code}```\n\n{probs}{look}\n"
            + "ANSWER: first a short REVIEW (max 6 lines: what is wrong, or that it is already clear), then ONE code block with "
            f"the whole corrected code of scene {index + 1} only, starting with its marker line and its # VISUAL IDEA line "
            "(improve the idea itself if the picture cannot show it). Nothing after the code block.")


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
    if ok:
        warn.extend(variety_warnings(job["scenes"], index))
    if ok and not idea_of(sc.get("code")):
        warn.append("no '# VISUAL IDEA:' line — ask the AI to write what the viewer should understand in one glance")
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
    old_sheet = (sc.get("script_test") or {}).get("sheet")
    sc["script_test"] = {"ok": ok, "error": rep.get("error") or "", "warnings": warn[:10], "at": time.time()}
    if old_sheet:
        (work_dir / Path(old_sheet).name).unlink(missing_ok=True)
    if out.exists():
        try:
            sc["script_test"].update(make_sheet(sc, index, work_dir, out, spec["words"], spec["duration"]))
        except Exception as exc:  # noqa: BLE001 — the test itself still counts
            print(f"scene {index + 1}: contact sheet failed:", exc)
    return sc["script_test"]


def make_sheet(sc: dict, index: int, work_dir: Path, video: Path, words: list, duration: float, mark: float | None = None) -> dict:
    """The contact sheet of a scene preview -> {"sheet": file name, "frames": [...]}."""
    import scene_sheet
    name = f"scene-{index:02d}-sheet-{int(time.time() * 10) % 1000000}.png"
    tail = 0.3 if "out" in transitions_of(sc.get("code")) else 0.0  # no frame in the middle of a leaving transition
    frames = scene_sheet.make(video, work_dir / name, words, duration, index + 1, idea_of(sc.get("code")),
                              str(sc.get("narration") or ""), mark, tail)
    return {"sheet": name, "frames": frames}


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
                        "idea": idea_of(sc.get("code")),
                        "visual_file": sc.get("visual_file"), "kind": sc.get("kind"), "visual_source": sc.get("visual_source")}
                       for i, sc in enumerate(job.get("scenes") or [])]}


@router.get("/{job_id}")
def get_script(job_id: str) -> dict:
    _app_, job = _job(job_id)
    return _status(job)


@router.get("/{job_id}/prompt")
def get_prompt(job_id: str) -> dict:
    _app_, job = _job(job_id)
    return {"prompt": build_prompt(job.get("title") or "", job["scenes"], job.get("sources"))}


@router.get("/{job_id}/fix/{index}")
def get_fix(job_id: str, index: int) -> dict:
    _app_, job = _job(job_id)
    if not 0 <= index < len(job["scenes"]):
        raise HTTPException(404, "Scene not found.")
    t = job["scenes"][index].get("script_test") or {}
    return {"prompt": fix_prompt(job.get("title") or "", job["scenes"], index, t.get("error") or "", t.get("warnings") or [],
                                 job.get("sources"))}


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
                    for k in ("code", "script_test", "script_review", "visual_idea"):
                        sc.pop(k, None)
                continue
            err, names = check(code)
            if sc.get("code") != code:
                sc.pop("script_test", None)
                sc.pop("script_review", None)
            sc["code"] = code
            sc["visual_idea"] = idea_of(code)
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


@router.post("/sheet/{job_id}/{index}")
def sheet(job_id: str, index: int) -> dict:
    """The contact sheet of a tested scene (made now for scenes tested before sheets existed)."""
    app, job = _job(job_id)
    if not 0 <= index < len(job["scenes"]):
        raise HTTPException(404, "Scene not found.")
    sc = job["scenes"][index]
    test = sc.get("script_test") or {}
    work_dir = app._av_job_dir(job_id)
    if test.get("sheet") and (work_dir / Path(test["sheet"]).name).exists():
        return {"sheet": test["sheet"]}
    video = work_dir / Path(str(sc.get("visual_file") or "x")).name
    if not test or not video.name.startswith(f"scene-{index:02d}-script-") or not video.exists():
        raise HTTPException(400, "Test this scene first (▶ Test all scenes again), then its frames can be made.")
    dur = float(sc.get("duration_sec") or 0) or est_duration(sc.get("narration") or "")
    try:
        made = make_sheet(sc, index, work_dir, video, word_times(sc, index, work_dir, dur), dur)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"The frames could not be made ({str(exc)[:200]}).") from None
    with _LOCK:
        fresh = app._av_read(job_id)
        fresh["scenes"][index]["script_test"] = {**test, **made}
        app._av_write(fresh)
    return {"sheet": made["sheet"]}


class ClearReq(BaseModel):
    job_id: str = Field(..., max_length=40)


@router.post("/clear")
def clear(req: ClearReq) -> dict:
    """Removes the scene code: the scenes go back to the app's own animation (or the simple version)."""
    app, job = _job(req.job_id)
    with _LOCK:
        for sc in job["scenes"]:
            for k in ("code", "script_test", "script_review", "visual_idea"):
                sc.pop(k, None)
        job["script_code"] = ""
        app._av_write(job)
    return _status(job)
