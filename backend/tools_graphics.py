"""Motion graphics (Manim + Pymunk) for Auto Video and the Story Animator (user, 2026-11-19).

The look is the "Why are you always broke?" sample. Nothing is a fixed template:
a GRAPHIC SPEC is made of building blocks (money counter, cards, bars, timeline,
meter, stars, countdown, chat, map, stamp, physics: coins piling up, a stack
toppling, things scattering / bouncing, a scale tipping…). The AI (or simple
rules) fills the blocks with the scene's own numbers, words and icons; every
element appears when its words are spoken. graphics_scene.py draws a spec.

  GET  /api/animator/graphics/status   -> is the free graphics engine installed?
  POST /api/animator/graphics/install  -> pip install manim pymunk (background)
"""
from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(prefix="/api/animator/graphics", tags=["graphics"])
HERE = Path(__file__).resolve().parent
SCENE = HERE / "graphics_scene.py"
TYPES = {"headline", "money", "counter", "compare", "list", "steps", "timeline", "meter", "stars", "countdown",
         "chat", "map", "physics", "stamp"}
PHYSICS = {"pile", "fall", "topple", "scatter", "bounce", "scale"}
_install = {"running": False, "error": "", "log": []}


def available() -> bool:
    return importlib.util.find_spec("manim") is not None and importlib.util.find_spec("pymunk") is not None


def _no_window() -> dict:
    if os.name == "nt":
        return {"creationflags": 0x08000000}  # CREATE_NO_WINDOW
    return {}


@router.get("/status")
def status() -> dict:
    return {"installed": available(), "installing": _install["running"], "error": _install["error"], "log": _install["log"][-4:]}


def _run_install() -> None:
    try:
        p = subprocess.Popen([sys.executable, "-m", "pip", "install", "--progress-bar", "off", "manim", "pymunk"],
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
                             **_no_window())
        for line in p.stdout:  # type: ignore[union-attr]
            if line.strip():
                _install["log"].append(line.strip()[-200:])
                del _install["log"][:-30]
        if p.wait() != 0:
            _install["error"] = "Could not install the graphics engine: " + " | ".join(_install["log"][-3:])[-400:]
        importlib.invalidate_caches()
    except Exception as exc:  # noqa: BLE001
        _install["error"] = f"Install failed: {str(exc)[:300]}"
    finally:
        _install["running"] = False


@router.post("/install")
def install() -> dict:
    if available():
        return {"ok": True, "installed": True}
    if not _install["running"]:
        _install.update(running=True, error="", log=[])
        threading.Thread(target=_run_install, daemon=True).start()
    return {"ok": True, "installing": True}


# ------------------------------------------------------------------ specs
def _num(v, d=0.0) -> float:
    try:
        return float(str(v).replace(",", "").strip().lstrip("$₹Rs").strip() or d)
    except (TypeError, ValueError):
        return d


def _s(v, n=60) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()[:n]


def clean_spec(spec: dict) -> dict | None:
    """Only known blocks and sane values (an AI answer can never break the render)."""
    if not isinstance(spec, dict):
        return None
    out = []
    for b in (spec.get("blocks") or [])[:4]:
        if not isinstance(b, dict) or b.get("type") not in TYPES:
            continue
        t = b["type"]
        c: dict = {"type": t, "say": _s(b.get("say"), 80), "at": _num(b.get("at"), 0)}
        if t == "headline":
            c.update(text=_s(b.get("text"), 50), accent=_s(b.get("accent"), 20))
            if not c["text"]:
                continue
        elif t == "money":
            c.update(label=_s(b.get("label"), 40) or "Your money", currency=_s(b.get("currency"), 4) or "$", start=_num(b.get("start")))
            c["steps"] = [{"say": _s(x.get("say"), 80), "value": _num(x.get("value")), "note": _s(x.get("note"), 34),
                           "icon": _s(x.get("icon"), 24), **({"day": int(_num(x.get("day")))} if x.get("day") else {})}
                          for x in (b.get("steps") or [])[:6] if isinstance(x, dict)]
            if c["start"] <= 0 and not c["steps"]:
                continue
        elif t == "counter":
            c.update(label=_s(b.get("label"), 50), prefix=_s(b.get("prefix"), 4), suffix=_s(b.get("suffix"), 6),
                     **{"from": _num(b.get("from")), "to": _num(b.get("to"))})
        elif t == "compare":
            c["items"] = [{"label": _s(x.get("label"), 20), "value": _num(x.get("value")), "icon": _s(x.get("icon"), 24)}
                          for x in (b.get("items") or [])[:5] if isinstance(x, dict)]
            c["unit"] = _s(b.get("unit"), 6)
            if len(c["items"]) < 2:
                continue
        elif t == "list":
            c["items"] = [{"text": _s(x.get("text") if isinstance(x, dict) else x, 34), "value": _s(x.get("value"), 14) if isinstance(x, dict) else "",
                           "icon": _s(x.get("icon"), 24) if isinstance(x, dict) else "", "say": _s(x.get("say"), 80) if isinstance(x, dict) else ""}
                          for x in (b.get("items") or [])[:6]]
            if len(c["items"]) < 2:
                continue
        elif t == "steps":
            c["items"] = [{"text": _s(x.get("text") if isinstance(x, dict) else x, 30), "say": _s(x.get("say"), 80) if isinstance(x, dict) else ""}
                          for x in (b.get("items") or [])[:5]]
            if len(c["items"]) < 2:
                continue
        elif t == "timeline":
            c.update(unit=_s(b.get("unit"), 10) or "days", label_to=_s(b.get("label_to"), 30),
                     **{"from": _num(b.get("from"), 1), "to": _num(b.get("to"), 30)})
        elif t == "meter":
            c.update(label=_s(b.get("label"), 40) or "Level", **{"from": max(0, min(100, _num(b.get("from"), 90))), "to": max(0, min(100, _num(b.get("to"), 5)))})
        elif t == "stars":
            c["count"] = int(max(1, min(5, _num(b.get("count"), 3))))
        elif t == "countdown":
            c["from"] = int(max(1, min(10, _num(b.get("from"), 3))))
            c["end"] = _s(b.get("end"), 12) or "GO!"
        elif t == "chat":
            c["messages"] = [{"who": _s(m.get("who"), 16), "text": _s(m.get("text"), 60), "me": bool(m.get("me")), "say": _s(m.get("say"), 80)}
                             for m in (b.get("messages") or [])[:6] if isinstance(m, dict)]
            if not c["messages"]:
                continue
        elif t == "map":
            c["stops"] = [_s(x, 18) for x in (b.get("stops") or [])][:6]
            if len(c["stops"]) < 2:
                continue
        elif t == "physics":
            kind = str(b.get("kind") or "pile")
            c.update(kind=kind if kind in PHYSICS else "pile", icon=_s(b.get("icon"), 24) or "coin",
                     count=int(max(3, min(30, _num(b.get("count"), 12)))), label=_s(b.get("label"), 50))
            if c["kind"] == "scale":
                for side in ("left", "right"):
                    x = b.get(side) if isinstance(b.get(side), dict) else {}
                    c[side] = {"label": _s(x.get("label"), 20), "value": _num(x.get("value"), 1), "icon": _s(x.get("icon"), 24)}
        elif t == "stamp":
            c.update(text=_s(b.get("text"), 14) or "WOW", color=_s(b.get("color"), 8) or "red")
        out.append(c)
    if not out:
        return None
    return {"blocks": out}


def icon_words(spec: dict) -> set[str]:
    words: set[str] = set()
    for b in spec.get("blocks") or []:
        for k in ("icon",):
            if b.get(k):
                words.add(str(b[k]).lower())
        for x in (b.get("steps") or []) + (b.get("items") or []):
            if isinstance(x, dict):
                words.add(str(x.get("icon") or x.get("note") or x.get("label") or x.get("text") or "").lower())
        for side in ("left", "right"):
            if isinstance(b.get(side), dict):
                words.add(str(b[side].get("icon") or b[side].get("label") or "").lower())
    return {w for w in words if w}


def icons_for(spec: dict) -> dict:
    """word -> picture file (OpenMoji / your Asset Library), downloaded once."""
    out = {}
    try:
        import tools_assets
    except Exception:  # noqa: BLE001
        return out
    alias = {"dinner": "plate", "lunch": "plate", "food": "plate", "movies": "clapper board", "movie": "clapper board",
             "cinema": "clapper board", "coin": "coin", "coins": "coin", "money": "money bag", "salary": "money bag",
             "savings": "piggy bank", "saving": "piggy bank", "rent": "house", "bills": "receipt", "bill": "receipt",
             "shopping": "shopping bags", "clothes": "t-shirt", "phone": "mobile phone", "time": "hourglass", "days": "calendar"}
    for w in icon_words(spec):
        found = None
        for cand in [alias.get(w, w), w] + w.split()[::-1]:
            try:
                found = tools_assets.find_asset(cand, strong=False)
            except Exception:  # noqa: BLE001
                found = None
            if found:
                break
        if found:
            try:
                p = tools_assets.asset_file(found["src"])
                if p and p.exists() and p.suffix.lower() in (".svg", ".png", ".jpg", ".jpeg"):
                    out[w] = str(p)
            except Exception:  # noqa: BLE001
                pass
    return out


class _Clock:
    """When each word is spoken (subtitle cues), or evenly spread over the scene."""

    def __init__(self, narration: str, duration: float, cues: list[dict] | None = None):
        self.words = narration.split()
        self.dur = max(0.1, duration)
        self.times: list[tuple[str, float]] = []
        for sp in cues or []:
            ws = str(sp.get("text") or "").split()
            a, b = float(sp.get("start", 0)), float(sp.get("end", 0))
            for k, w in enumerate(ws):
                self.times.append((_norm(w), a + (k + 0.5) / max(1, len(ws)) * (b - a)))

    def at_word(self, wi: int) -> float:
        n = max(1, len(self.words))
        if not self.times:
            return wi / n * self.dur
        guess = round(wi / n * len(self.times))
        target = _norm(self.words[wi]) if wi < len(self.words) else ""
        best = min(range(max(0, guess - 8), min(len(self.times), guess + 9)),
                   key=lambda j: (self.times[j][0] != target, abs(j - guess)), default=None)
        return self.times[best][1] if best is not None else wi / n * self.dur

    @staticmethod
    def word_index(char_pos: int, text: str) -> int:
        return len(text[:char_pos].split())


def _norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


def timed(spec: dict, narration: str, duration: float, cues: list[dict] | None = None) -> dict:
    """"say" words → seconds: every element appears when its words are spoken."""
    clock = _Clock(narration, duration, cues)
    low = narration.lower()

    def when(say: str, default: float) -> float:
        say = (say or "").lower().strip()
        if not say:
            return default
        p = low.find(say)
        if p < 0:
            first = say.split()[0] if say.split() else ""
            p = low.find(first) if first else -1
        if p < 0:
            return default
        return max(0.0, min(duration - 0.8, clock.at_word(clock.word_index(p, narration)) - 0.1))
    spec = json.loads(json.dumps(spec))
    n = max(1, len(spec["blocks"]))
    for k, b in enumerate(spec["blocks"]):
        b["at"] = when(b.get("say", ""), b.get("at") or (0.0 if k == 0 else duration * k / (n + 1)))
        base = b["at"]
        for key in ("steps", "items", "messages"):
            items = b.get(key) or []
            for j, x in enumerate(items):
                if isinstance(x, dict):
                    gap = (duration - base) / (len(items) + 1)
                    x["at"] = max(base + 0.4, when(x.get("say", ""), base + gap * (j + 1)))
        if b["type"] in ("timeline", "map"):
            b["dur"] = max(1.2, min(4.0, duration - b["at"] - 1.0))
    spec["duration"] = round(duration, 2)
    return spec


def render(spec: dict, out_path: Path, width: int, height: int, fps: int = 30, png_dir: Path | None = None,
           transparent: bool = False, timeout: int = 900, still: bool = False) -> Path | None:
    """Draws a spec with Manim. mp4 (out_path), or transparent PNG frames into png_dir."""
    if not available():
        return None
    spec = dict(spec)
    spec["icons"] = {**icons_for(spec), **(spec.get("icons") or {})}
    if transparent:
        spec["transparent"] = True
    work = Path(tempfile.mkdtemp(prefix="ytg-gfx-"))
    try:
        (work / "spec.json").write_text(json.dumps(spec), encoding="utf-8")
        name = "out"
        cmd = ["render", "--resolution", f"{width},{height}", "--frame_rate", str(fps),
               "--disable_caching", "--media_dir", str(work / "media"), "-o", name, "-v", "WARNING"]
        if still:
            cmd += ["-s"]
        elif png_dir is not None:
            cmd += ["--format", "png-sequence"] + (["-t"] if transparent else [])
        if spec.get("theme") == "docu":
            cmd += [str(HERE / "docu_scene.py"), "Docu"]
        else:
            cmd += [str(SCENE), "Graphic"]
        env = {**os.environ, "YTG_SPEC": str(work / "spec.json")}
        import manim_cli
        code, output = manim_cli.run(cmd, work, env, timeout, **_no_window())
        if still:
            pics = sorted((work / "media" / "images").rglob("*.png"))
            if not pics:
                raise RuntimeError("No picture: " + manim_cli.error_summary(output, code))
            out_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(pics[-1]), str(out_path))
            return out_path
        if png_dir is not None:
            frames = sorted((work / "media" / "images").rglob("*.png"))
            if not frames:
                raise RuntimeError("No frames: " + manim_cli.error_summary(output, code))
            png_dir.mkdir(parents=True, exist_ok=True)
            for k, f in enumerate(frames):
                shutil.move(str(f), str(png_dir / f"{k:04d}.png"))
            return png_dir
        vids = [p for p in (work / "media" / "videos").rglob("*.mp4") if "partial" not in str(p)]
        if not vids:
            raise RuntimeError("No video: " + manim_cli.error_summary(output, code))
        out_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(vids[0]), str(out_path))
        return out_path
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ------------------------------------------------------------------ Auto Video: which scenes, what graphic
BLOCK_HELP = (
    'BLOCKS (use 1-2 per graphic; "say" = the EXACT words of the scene when it appears; "icon" = one simple English noun):\n'
    '- headline: {"type":"headline","text":"Why no PC version?","accent":"2027","say":"..."}  (a big title, accent word in colour; '
    'use it WITH another block, alone only when nothing else fits)\n'
    '- money: {"type":"money","label":"Your money","currency":"$","start":3000,"say":"salary","steps":[{"say":"dinner","value":2700,"note":"Dinner out","icon":"burger"}]}  (a balance going up/down with cards)\n'
    '- counter: {"type":"counter","label":"...","from":0,"to":1000000,"prefix":"$","suffix":"","say":"..."}  (one big number counting)\n'
    '- compare: {"type":"compare","unit":"%","say":"...","items":[{"label":"Rent","value":40,"icon":"house"},{"label":"Savings","value":5,"icon":"piggy bank"}]}\n'
    '- list: {"type":"list","items":[{"text":"Dinner","value":"$50","icon":"burger","say":"dinner"}]}  (cards one by one)\n'
    '- steps: {"type":"steps","items":[{"text":"Save first","say":"save"},{"text":"Then spend","say":"spend"}]}  (a process with arrows)\n'
    '- timeline: {"type":"timeline","from":7,"to":30,"unit":"days","label_to":"Payday","say":"wait"}  (waiting / time passing)\n'
    '- meter: {"type":"meter","label":"Motivation","from":90,"to":5,"say":"..."}  (a level going up/down, 0-100)\n'
    '- stamp: {"type":"stamp","text":"BROKE","color":"red","say":"broke"}  (a big stamp word at the punchline)\n'
    '- physics: {"type":"physics","kind":"pile|fall|topple|scatter|bounce","icon":"coin","count":15,"label":"...","say":"..."}  '
    '(REAL physics: pile = things fill a jar (saving, collecting), fall = things rain down (too many / buying a lot), '
    'topple = a stack falls over (losing it all, collapse), scatter = things fly apart (money gone, chaos), bounce = fun/energy)\n'
    '- physics scale: {"type":"physics","kind":"scale","left":{"label":"Spending","value":9,"icon":"shopping bag"},"right":{"label":"Saving","value":2,"icon":"piggy bank"}}  (a balance tipping)\n'
    '- countdown {"type":"countdown","from":3}, stars {"type":"stars","count":3}, chat {"type":"chat","messages":[{"who":"Boss","text":"...","me":false}]}, '
    'map {"type":"map","stops":["Home","Office"]}\n')


# Graphics intensity (user, 2026-11-19): how much of an Auto Video is motion graphics.
AMOUNTS = {"few": 0.12, "medium": 0.3, "many": 0.55, "all": 1.0}
_STYLE = Path(__file__).resolve().parent / "av_style.json"


def style() -> dict:
    """Auto Video look: graphics amount, theme ("classic" | "docu" = Documentary Explainer)
    and the source links the user gave for the documentary."""
    try:
        d = json.loads(_STYLE.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        d = {}
    g = d.get("graphics") if d.get("graphics") in AMOUNTS else "medium"
    theme = d.get("theme") if d.get("theme") in ("classic", "docu", "visual") else "classic"
    src = [str(u) for u in d.get("sources") or [] if isinstance(u, str)][:8]
    design = d.get("design") if d.get("design") in ("gemini", "script") else "gemini"
    av_design = d.get("av_design") if d.get("av_design") in ("auto", "script") else "auto"
    return {"graphics": g, "theme": theme, "sources": src, "design": design, "av_design": av_design}


def save_style(graphics: str, theme: str | None = None, sources: list[str] | None = None, design: str | None = None,
               av_design: str | None = None) -> dict:
    if graphics not in AMOUNTS:
        graphics = "medium"
    old = style()
    data = {"graphics": graphics, "theme": theme if theme in ("classic", "docu", "visual") else old["theme"],
            "sources": [u.strip() for u in (sources if sources is not None else old["sources"]) if u.strip()][:8],
            "design": design if design in ("gemini", "script") else old["design"],
            "av_design": av_design if av_design in ("auto", "script") else old["av_design"]}
    _STYLE.write_text(json.dumps(data), encoding="utf-8")
    return style()


def _want_text(amount: str, count: int) -> str:
    if amount == "all":
        return ("EVERY scene MUST get a graphic (this video is made only of motion graphics). Use 2-3 blocks per scene so "
                "the picture keeps changing while it is spoken (e.g. a headline, then a list / counter / compare / stamp / "
                "physics), each appearing at its own words. ")
    k = max(1, round(count * AMOUNTS.get(amount, 0.3)))
    return (f"Give a graphic to about {k} of these {count} scenes - the ones a graphic explains best (numbers, money, "
            "comparisons, lists, steps, time, a rise/fall, a punchline). ")


def graphics_prompt(title: str, part: list[tuple[int, str]], amount: str = "medium") -> str:
    lines = "\n".join(f"{n}. {t[:600]}" for n, t in part)
    return (
        f'You design animated explainer GRAPHICS for a YouTube video titled "{title}". Some scenes are shown much better '
        "as a clean motion graphic than as stock footage: scenes with NUMBERS, money, prices, percentages, comparisons, "
        "lists of things, steps, time passing, a level rising/falling, or something piling up / collapsing. For EACH numbered "
        "scene decide if it gets a graphic. " + _want_text(amount, len(part)) +
        'Reply with ONLY JSON: {"scenes":[{"n":1,"graphic":null},{"n":2,"graphic":{"blocks":[...]}}]}\n'
        + BLOCK_HELP +
        "Use the scene's OWN numbers and words (invent a believable example amount only when the scene clearly talks about "
        "money/amounts without one). Keep labels short (1-4 words).\nScenes:\n" + lines)


def rules_graphic(text: str, plan: dict) -> dict | None:
    """Without the AI: lists and big numbers still become graphics."""
    items = list((plan or {}).get("list") or [])
    if len(items) >= 3:
        return {"blocks": [{"type": "list", "items": [{"text": it[:30][:1].upper() + it[:30][1:], "icon": it.split()[-1], "say": it} for it in items[:5]]}]}
    ms = [m for m in re.finditer(r"([$₹£€]|rs\.?\s?)?\s?(\d[\d,]*(?:\.\d+)?)\s?(%|percent|k|million|thousand|lakh|crore|gb|tb|mb|hours|days|years|fps)?\b", text, re.I)
          if _num(m.group(2)) >= 10]
    m = ms[0] if ms else None
    if m:
        v = _num(m.group(2))
        mult = {"k": 1e3, "thousand": 1e3, "million": 1e6, "lakh": 1e5, "crore": 1e7}.get((m.group(3) or "").lower(), 1)
        pct = (m.group(3) or "").lower() in ("%", "percent")
        sentence = next((s for s in re.split(r"(?<=[.!?])\s+", text) if m.group(2) in s), text)
        unit = (m.group(3) or "").lower()
        return {"blocks": [{"type": "counter", "label": _s(_gist(sentence.replace(m.group(0).strip(), " "), 5), 48), "from": 0, "to": v * mult,
                            "prefix": (m.group(1) or "").strip().upper().replace("RS.", "Rs ").replace("RS", "Rs "),
                            "suffix": "%" if pct else (unit.upper() if unit in ("gb", "tb", "mb", "fps") else (" " + unit if unit in ("hours", "days", "years") else "")),
                            "say": m.group(2)}]}
    return None


_SMALL = set("the a an and or but if of to in on at for with from by as is are was were be been it its this that these those "
             "you your we our they their he she his her i me my not no so than then too very just can will would should could do "
             "does did have has had about into over more most less some any all each every what which who how why when where "
             "there here also only even still like one meanwhile however because while first same thing things wants want "
             "need needs make makes made get got use using going come coming".split())


def _gist(sentence: str, n: int = 4) -> str:
    """The heart of a sentence in a few words: names and numbers first, then its longest words."""
    names = re.findall(r"(?:[A-Z][\w'-]*|\d[\w.,%$]*)(?:\s+(?:[A-Z][\w'-]*|\d[\w.,%$]*))*", sentence)
    names = [x for x in names if x.lower() not in _SMALL and len(x) > 1]
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'-]+|\d[\w.,%$]*", sentence) if w.lower() not in _SMALL and len(w) > 2]
    keep: list[str] = []
    for x in names + sorted(words, key=len, reverse=True):
        if len(" ".join(keep + [x]).split()) > n:
            continue
        if not any(x.lower() in k.lower() or k.lower() in x.lower() for k in keep):
            keep.append(x)
        if len(" ".join(keep).split()) >= n - 1:
            break
    order = sentence.lower()
    keep.sort(key=lambda k: order.find(k.lower()))
    out = " ".join(keep).strip(" ,.;:")
    return out[:1].upper() + out[1:]


def basic_graphic(text: str, plan: dict, title: str) -> dict:
    """A graphic for any scene (used when more graphics are wanted than the AI chose): the
    scene's point as a headline, then its main points one by one as they are spoken."""
    sents = [x.strip() for x in re.split(r"(?<=[.!?])\s+", text.strip()) if len(x.split()) >= 3]
    key = str((plan or {}).get("key") or "")
    head = _gist(sents[0] if sents else title, 5) or _s(title, 40)
    blocks: list[dict] = [{"type": "headline", "text": _s(head, 46), "accent": _s(key.upper(), 20) if key and key.lower() not in head.lower() else "",
                           "say": " ".join((sents[0] if sents else text).split()[:3])}]
    rest = sents[1:5]
    if len(rest) >= 2:
        blocks.append({"type": "list", "items": [{"text": _s(_gist(x, 4), 34), "icon": str(k + 1), "say": " ".join(x.split()[:3])}
                                                  for k, x in enumerate(rest)]})
    elif key:
        blocks.append({"type": "stamp", "text": _s(key.upper(), 16), "color": "red", "say": key})
    return {"blocks": blocks}


def plan_graphics(title: str, scenes: list[dict], share: float | None = None, amount: str | None = None) -> list[int]:
    """scene["graphic"] = spec for the scenes that are explained best as a graphic (about a quarter)."""
    try:
        import tools_animator as ta
    except Exception:  # noqa: BLE001
        ta = None
    amount = amount or style()["graphics"]
    st = style()
    if st["theme"] == "docu":  # Documentary Explainer: its own cards, maps, clippings and number tags
        import tools_docu
        return tools_docu.plan(title, scenes, amount, tools_docu.fetch_sources(st["sources"]))
    if share is None:
        share = AMOUNTS.get(amount, 0.3)
    n = len(scenes)
    found: dict[int, dict] = {}
    if ta is not None:
        for start in range(0, n, 8):
            part = [(start + k + 1, scenes[start + k]["narration"]) for k in range(min(8, n - start))]
            try:
                data = ta._json_in(ta._ask_ai(graphics_prompt(title, part, amount), timeout=120, attempts=2))
            except Exception:  # noqa: BLE001
                continue
            try:
                import autovideo_smart
                items = autovideo_smart.ai_scene_items(data)
            except Exception:  # noqa: BLE001
                items = [x for x in ((data.get("scenes") or []) if isinstance(data, dict) else []) if isinstance(x, dict)]
            for item in items:
                try:
                    i = int(item.get("n")) - 1
                except (TypeError, ValueError):
                    continue
                spec = clean_spec(item.get("graphic")) if 0 <= i < n and isinstance(item.get("graphic"), dict) else None
                if spec:
                    found[i] = spec
    hi = max(1, round(n * share)) if n >= 3 else (n if share >= 1 else (1 if found else 0))
    if len(found) < hi:  # the AI chose fewer than asked: numbers and lists first, then any scene
        for i, sc in enumerate(scenes):
            if i not in found:
                spec = rules_graphic(sc["narration"], sc.get("plan") or {})
                if spec:
                    found[i] = spec
    basic: set[int] = set()
    if len(found) < hi:
        order = list(range(n)) if amount in ("many", "all") else sorted(range(n), key=lambda k: (-len((scenes[k].get("plan") or {}).get("key") or ""), k))
        for i in order:
            if len(found) >= hi * (1 if amount == "all" else 2):
                break
            if i not in found:
                spec = clean_spec(basic_graphic(scenes[i]["narration"], scenes[i].get("plan") or {}, title))
                if spec:
                    found[i] = spec
                    basic.add(i)
    chosen: list[int] = []
    spaced = amount in ("few", "medium")
    for i in sorted(found, key=lambda k: (k in basic, -len(found[k]["blocks"]))):  # the AI's and the number/list graphics first
        if len(chosen) >= hi:
            break
        if spaced and (i - 1 in chosen or i + 1 in chosen):
            continue  # never two in a row
        chosen.append(i)
    for i in chosen:
        scenes[i]["graphic"] = found[i]
    return sorted(chosen)


def add_to_footage(title: str, scenes: list[dict], work_dir: Path, vertical: bool, progress_cb=None,
                   amount: str | None = None) -> list[int]:
    """Auto Video, after the footage is collected: about a quarter of the scenes become
    motion graphics. A still preview is shown in the footage review; the real animation
    is made at render time, timed to the voice."""
    if not available():
        return []
    chosen = [i for i, sc in enumerate(scenes) if sc.get("graphic")]  # already planned before the footage (faster)
    if not chosen:
        chosen = plan_graphics(title, scenes, amount=amount)
    w, h = (540, 960) if vertical else (960, 540)
    for k, i in enumerate(chosen):
        sc = scenes[i]
        if progress_cb:
            progress_cb(k, len(chosen), f"Designing motion graphics — {k + 1} of {len(chosen)}…")
        est = max(3.0, len(sc["narration"].split()) / 2.6)
        still = work_dir / f"scene-{i:02d}-graphic.png"
        try:
            render(timed(sc["graphic"], sc["narration"], est), still, w, h, fps=15, still=True, timeout=300)
        except Exception:  # noqa: BLE001 — this scene keeps its footage
            sc.pop("graphic", None)
            continue
        sc["footage_file"], sc["footage_kind"] = sc.get("visual_file"), sc.get("kind")
        sc["visual_file"], sc["kind"] = still.name, "image"
        sc["graphic_file"] = still.name
        sc["visual_source"] = "Motion graphic (made by the app — animated in the final video)"
    return chosen


def clip_for_scene(scene: dict, index: int, work_dir: Path, duration: float, srt_path: Path | None, vertical: bool) -> Path | None:
    """The scene's motion graphic, animated in time with its voice (render step)."""
    if not scene.get("graphic") or scene.get("visual_file") != scene.get("graphic_file") or not available():
        return None
    if scene["graphic"].get("theme") == "visual":  # Visual Explainer: its own engine, with sound effects
        import tools_visual
        cues = None
        if srt_path and srt_path.exists():
            try:
                import autovideo2 as av2
                cues = av2._parse_srt_cues(srt_path) or None
            except Exception:  # noqa: BLE001
                cues = None
        return tools_visual.clip_for_scene(scene, index, work_dir, duration, cues, vertical)
    cues = None
    if srt_path and srt_path.exists():
        try:
            import autovideo2 as av2
            cues = av2._parse_srt_cues(srt_path) or None
        except Exception:  # noqa: BLE001
            cues = None
    out = work_dir / f"scene-{index:02d}-graphic.mp4"
    w, h = (1080, 1920) if vertical else (1280, 720)
    return render(timed(scene["graphic"], scene["narration"], duration, cues), out, w, h, fps=30)
