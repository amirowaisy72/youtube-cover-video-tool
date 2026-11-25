"""Visual Explainer (user, 2026-11-19): pure motion-graphics explainer videos.

No stock footage and no cards: every scene is drawn by vis_scene.py from a plan of
illustrated objects (vis_kit.py) and motions that SHOW the idea (a factory splitting into
shares, coins flowing to investors, a city growing). The AI writes one plan per scene;
objects come from (1) the drawn library, (2) My Shapes (drawn by the user / AI as small
recipes), (3) OpenMoji icons, (4) a word chip — in that order (user's hybrid rule).
Every motion has its sound effect, generated here (no files, no keys) and mixed under the
voice of that scene.

Endpoints (/api/visual): shapes (list / draw with AI / save / delete), redo one scene of an
Auto Video job (storyboard), missing shapes of a job.
"""
from __future__ import annotations

import json
import math
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import wave
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import icon_pack
import manim_cli
import vis_transitions

HERE = Path(__file__).resolve().parent
SCENE = HERE / "vis_scene.py"
SHAPES_FILE = HERE / "my_shapes.json"
router = APIRouter(prefix="/api/visual", tags=["visual-explainer"])

ACTIONS = {"enter", "exit", "move", "scale", "split", "give", "join", "flow", "count", "label", "title", "badge", "swap", "drop",
           "topple", "shake", "pulse", "color", "connect", "chart", "pile", "camera", "clear", "clone"}


def _n(v, d=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def _s(v, n):
    return re.sub(r"\s+", " ", str(v or "")).strip()[:n]


def _no_window() -> dict:
    try:
        import video
        return video.no_window_kwargs()
    except Exception:  # noqa: BLE001
        return {}


# ================================================================== sound effects (generated)
SR = 44100


def _np():
    import numpy as np
    return np


def synth(kind: str, rnd: random.Random):
    """One sound effect as float samples (-1..1). Small random changes so repeats never sound copied."""
    np = _np()

    def t_(sec):
        return np.arange(int(SR * sec)) / SR

    def noise(n):
        return np.random.default_rng(rnd.randrange(1 << 30)).uniform(-1, 1, n)

    def lowpass(x, a):
        y = np.empty_like(x)
        acc = 0.0
        for i, v in enumerate(x):
            acc += a * (v - acc)
            y[i] = acc
        return y
    v = rnd.uniform(0.9, 1.1)
    if kind == "pop":
        t = t_(0.12)
        f = 520 * v * np.exp(-t * 18) + 220
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32)
        return s * 0.7
    if kind in ("whoosh", "swoosh", "swoosh_down"):
        dur = {"whoosh": 0.5, "swoosh": 0.38, "swoosh_down": 0.45}[kind] * v
        t = t_(dur)
        n = noise(len(t))
        env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
        # a filter sweeping up (or down) through the noise
        sweep = np.linspace(0.02, 0.25, len(t)) if kind != "swoosh_down" else np.linspace(0.25, 0.02, len(t))
        y = np.empty_like(n)
        acc = 0.0
        for i, x in enumerate(n):
            acc += sweep[i] * (x - acc)
            y[i] = acc
        return y * env * (1.7 if kind == "whoosh" else 1.4)
    if kind == "marker":  # a felt-tip stroke over paper: soft, rubbing noise with a faint squeak
        dur = 0.26 * v
        t = t_(dur)
        n = noise(len(t))
        hiss = lowpass(n, 0.45) - lowpass(n, 0.08)
        grain = 0.75 + 0.25 * np.sin(2 * np.pi * 38 * v * t)
        f = 1500 * v + 500 * (t / dur)
        squeak = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.05
        env = np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.1, 0, 1)
        return (hiss * grain * 0.75 + squeak) * env
    if kind == "riser":
        t = t_(0.9 * v)
        f = 180 + 520 * (t / t[-1]) ** 2
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
        n = lowpass(noise(len(t)), 0.08) * 1.5
        env = (t / t[-1]) ** 1.5 * np.exp(-np.clip(t - t[-1] * 0.92, 0, None) * 40)
        return (tone + n) * env * 0.8
    if kind == "coin":
        t = t_(0.45)
        s = sum(a * np.sin(2 * np.pi * f * v * t) for f, a in ((2093, 0.5), (3136, 0.35), (4186, 0.25), (5274, 0.12)))
        s2 = np.zeros_like(s)
        d = int(SR * 0.06)
        s2[d:] = s[:-d] * 0.5
        return (s + s2) * np.exp(-t * 9) * 0.45
    if kind == "thud":
        t = t_(0.4)
        s = np.sin(2 * np.pi * (60 * v) * t) * np.exp(-t * 12)
        n = lowpass(noise(len(t)), 0.05) * np.exp(-t * 30) * 2
        return (s + n) * 0.9
    if kind in ("tick", "click"):
        t = t_(0.03 if kind == "tick" else 0.05)
        f = 2400 * v if kind == "tick" else 1400 * v
        return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) * (0.35 if kind == "tick" else 0.5)
    if kind == "ding":
        t = t_(1.2)
        s = sum(a * np.sin(2 * np.pi * f * v * t) for f, a in ((1318, 0.5), (2637, 0.25), (3951, 0.1)))
        return s * np.exp(-t * 3.2) * 0.5
    if kind == "crack":
        out = np.zeros(int(SR * 0.35))
        for k in range(5):
            st = int(SR * (k * 0.06 + rnd.uniform(0, 0.02)))
            t = t_(0.025)
            c = np.sin(2 * np.pi * rnd.uniform(900, 1600) * t) * np.exp(-t * 200) * 0.5
            out[st:st + len(c)] += c[:max(0, len(out) - st)]
        return out
    if kind == "rumble":
        t = t_(0.7)
        n = lowpass(noise(len(t)), 0.012) * 6
        return n * np.sin(np.pi * t / t[-1]) * 0.7
    if kind == "zap":
        t = t_(0.25)
        f = 1800 - 1400 * t / t[-1]
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10) * 0.3
    return np.zeros(1)


def sfx_track(events: list[dict], duration: float, out: Path, seed: int = 0) -> Path | None:
    """All the scene's sound effects on one track (mono wav), each at its moment."""
    if not events:
        return None
    np = _np()
    total = np.zeros(int(SR * (duration + 1.5)))
    rnd = random.Random(seed)
    cache: dict[str, list] = {}
    last: dict[str, float] = {}
    for e in sorted(events, key=lambda e: _n(e.get("t")))[:120]:
        k = str(e.get("k") or "")
        t0 = _n(e.get("t"))
        if t0 > duration or t0 - last.get(k, -9) < (0.09 if k == "tick" else 0.06):
            continue
        last[k] = t0
        pool = cache.setdefault(k, [])
        if len(pool) < 3:
            pool.append(synth(k, rnd))
        s = pool[rnd.randrange(len(pool))]
        st = int(t0 * SR)
        end = min(len(total), st + len(s))
        if end > st:
            total[st:end] += s[:end - st]
    peak = float(np.max(np.abs(total))) or 1.0
    total = total / max(1.0, peak / 0.9)
    pcm = (total * 32767).astype("<i2")
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return out


def _probe_audio(p: Path) -> tuple[int, int]:
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels", "-of",
                            "csv=p=0", str(p)], capture_output=True, text=True, timeout=30, **_no_window())
        sr, ch = (r.stdout.strip().split(",") + ["", ""])[:2]
        return int(sr or 24000), int(ch or 1)
    except Exception:  # noqa: BLE001
        return 24000, 1


def mix_into_voice(voice: Path, events: list[dict], duration: float, seed: int = 0, volume: float = 0.2) -> bool:
    """Put the scene's sound effects under its voice (same file, same format/length).
    The clean voice is kept as *.nosfx.* so a re-render mixes again from the original."""
    if not events or not voice.exists():
        return False
    orig = voice.with_name(voice.stem + ".nosfx" + voice.suffix)
    if not orig.exists():
        shutil.copy2(voice, orig)
    track = voice.with_name(voice.stem + ".sfx.wav")
    if sfx_track(events, duration, track, seed) is None:
        return False
    sr, ch = _probe_audio(orig)
    tmp = voice.with_name(voice.stem + ".mix" + voice.suffix)
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(orig), "-i", str(track), "-filter_complex",
           f"[1:a]volume={volume:.2f}[s];[0:a][s]amix=inputs=2:duration=first:normalize=0[a]", "-map", "[a]",
           "-ar", str(sr), "-ac", str(ch)]
    cmd += (["-c:a", "libmp3lame", "-b:a", "160k"] if voice.suffix.lower() == ".mp3" else [])
    cmd.append(str(tmp))
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120, **_no_window())
    if r.returncode != 0 or not tmp.exists():
        return False
    os.replace(tmp, voice)
    st = orig.stat()
    os.utime(voice, (st.st_atime, st.st_mtime))  # same time as the clean voice: its word timings stay valid
    return True


# ================================================================== objects: library -> My Shapes -> OpenMoji -> chip
def my_shapes() -> dict:
    try:
        d = json.loads(SHAPES_FILE.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except Exception:  # noqa: BLE001
        return {}


def _vk():
    sys.path.insert(0, str(HERE))
    import vis_kit
    return vis_kit


def resolve_objects(spec: dict) -> list[str]:
    """Each object -> how it is drawn. Returns the names that are NOT in the drawn library or My Shapes
    (they use an icon or a word chip) — the "missing shapes" the user may draw."""
    K = _vk()
    shapes = my_shapes()
    spec.setdefault("shapes", {})
    spec.setdefault("icons", {})
    missing = []
    names = [o.get("obj") for o in spec.get("objects") or []]
    names += [b.get("item") for b in spec.get("beats") or [] if b.get("do") in ("flow", "pile") and b.get("item")]
    names += [b.get("obj") for b in spec.get("beats") or [] if b.get("do") == "swap" and b.get("obj")]
    for raw in names:
        name = _s(raw, 30).lower()
        if not name or name == "text":
            continue
        lib = K.resolve(name)
        key_ = name.replace(" ", "_")
        if lib:
            _rename(spec, raw, lib)
            continue
        if key_ in shapes:
            spec["shapes"][key_] = shapes[key_]
            _rename(spec, raw, key_)
            continue
        if icon_pack.key_of(name):  # the app's own icon set: nothing to download
            _rename(spec, raw, icon_pack.key_of(name))
            continue
        icon = None
        try:
            import tools_assets
            hit = tools_assets.find_asset(name, strong=True)
            if hit:
                p = tools_assets.asset_file(hit["src"])
                icon = str(p) if p and Path(p).exists() else None
        except Exception:  # noqa: BLE001
            icon = None
        if icon:
            spec["icons"][key_] = icon
        _rename(spec, raw, key_)
        if key_ not in missing:
            missing.append(key_)
    return missing


def _rename(spec, raw, new):
    for o in spec.get("objects") or []:
        if o.get("obj") == raw:
            o["obj"] = new
    for b in spec.get("beats") or []:
        if b.get("item") == raw:
            b["item"] = new
        if b.get("do") == "swap" and b.get("obj") == raw:
            b["obj"] = new


# ================================================================== the plan (AI)
def library_names() -> list[str]:
    return sorted(n for n in _vk().BUILDERS if n != "chip")


# Width / height of each drawn object (measured), for the layout.
ASPECT = {"building": 0.4, "skyline": 3.613, "house": 1.087, "factory": 1.111, "shop": 1.0, "bank": 1.185, "warehouse": 1.667,
          "tree": 0.919, "sun": 1.0, "cloud": 1.56, "globe": 1.0, "ship": 2.735, "truck": 2.192, "car": 1.667, "plane": 1.75,
          "train": 4.585, "rocket": 0.533, "laptop": 1.776, "phone": 0.529, "monitor": 1.414, "gear": 1.0, "lightbulb": 0.674,
          "clock": 1.0, "calendar": 0.914, "hourglass": 0.615, "coin": 1.0, "cash": 1.654, "money_bag": 0.857, "wallet": 1.286,
          "piggy_bank": 1.203, "gold_bar": 2.222, "credit_card": 1.6, "price_tag": 2.8, "scale": 1.707, "person": 0.556,
          "worker": 0.524, "crowd": 5.378, "box": 1.111, "basket": 1.053, "egg": 0.764, "oil_barrel": 0.731, "wheat": 0.213,
          "document": 0.75, "lock": 0.933, "key": 2.583, "shield": 0.824, "magnifier": 1.005, "fence": 4.5, "waves": 20.0,
          "arrow_up": 0.706, "arrow_down": 0.706, "line_chart": 1.818, "bar_chart": 1.605, "pie": 0.999,
          "console": 2.549, "controller": 2.667, "game_case": 0.765, "headset": 1.273, "tv": 1.455, "map": 1.216, "trophy": 1.019,
          "star": 1.051, "microphone": 0.486, "video_camera": 1.375, "arrow_right": 2.5, "track": 33.333}
SKY = {"sun", "cloud", "plane"}
ROLE_H = {"main": 3.4, "side": 2.2, "small": 1.0}

def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9$%.]+", " ", str(t).lower()).strip()


MOTION = {"move", "scale", "split", "give", "join", "flow", "pile", "count", "topple", "shake", "swap", "chart", "drop"}


def _drawable(name: str, shapes: dict) -> bool:
    """Library thing, My Shape, or a real icon — never a word box."""
    K = _vk()
    if K.resolve(name) or name.replace(" ", "_") in shapes or icon_pack.key_of(name):
        return True
    try:
        import tools_assets
        hit = tools_assets.find_asset(name, strong=True)
        return bool(hit and tools_assets.asset_file(hit["src"]))
    except Exception:  # noqa: BLE001
        return False


def check_plan(item, narration: str, prev_sig: str = "") -> tuple[dict | None, str]:
    """The AI's plan for one scene, cleaned — or (None, why it was rejected)."""
    if not isinstance(item, dict):
        return None, "not a plan"
    shapes = my_shapes()
    low = _norm(narration)
    things, ids = [], set()
    raw_things = item.get("things") if isinstance(item.get("things"), list) else item.get("objects")
    for o in (raw_things if isinstance(raw_things, list) else [])[:8]:
        if not isinstance(o, dict):
            continue
        i, name = _s(o.get("id"), 16), _s(o.get("obj"), 30).lower()
        if not i or not name or i in ids or name in ("chip", "word"):
            continue
        if name == "text":
            if not _s(o.get("text"), 30):
                continue
        elif not _drawable(name, shapes):
            continue  # cannot be drawn: left out (never a word box)
        c = {"id": i, "obj": name, "role": o.get("role") if o.get("role") in ROLE_H else "side"}
        for k in ("color", "style", "group"):
            if o.get(k):
                c[k] = _s(o[k], 12)
        if o.get("text"):
            c["text"] = _s(o["text"], 30)
        if o.get("count") is not None:
            c["count"] = int(max(2, min(14, _n(o["count"], 6))))
        for k in ("points", "values"):
            if isinstance(o.get(k), list):
                c[k] = [_n(x) for x in o[k][:20]]
        if o.get("share") is not None:
            c["share"] = max(0.02, min(0.98, _n(o["share"], 0.3)))
        things.append(c)
        ids.add(i)
    if not any(t["obj"] != "text" for t in things):
        return None, "no drawable things"
    beats, said, total = [], 0, 0
    for b in (item.get("beats") if isinstance(item.get("beats"), list) else [])[:14]:
        if not isinstance(b, dict) or b.get("do") not in ACTIONS:
            continue
        total += 1
        say = _s(b.get("say"), 60)
        if not say or _norm(say) not in low:
            continue  # words not in THIS scene: a copied or invented beat
        said += 1
        c = {"do": b["do"], "say": say}
        for k in ("id", "from", "near", "how", "side", "axis", "item", "label", "text", "color", "obj"):
            if b.get(k) is not None and not isinstance(b.get(k), (dict, list)):
                c[k] = _s(b[k], 30)
        for k in ("prefix", "suffix"):
            if b.get(k) is not None and not isinstance(b.get(k), (dict, list)):
                c[k] = re.sub(r"\s+", " ", str(b[k]))[:16]
        if b.get("to") is not None and not isinstance(b.get("to"), (dict, list)):
            c["to"] = _n(b["to"], 1.0) if b["do"] in ("scale", "count") else _s(b["to"], 16)
        if b["do"] == "count":
            c["from"], c["to"] = _n(b.get("from")), _n(b.get("to"), 100)
        for k in ("rows", "cols", "n", "piece", "decimals"):
            if b.get(k) is not None:
                c[k] = int(max(0, min(20, _n(b[k]))))
        if c["do"] in ("flow", "pile") and c.get("item") and not _drawable(c["item"].lower(), shapes):
            c["item"] = "coin" if "$" in narration or "money" in low else "box"
        if c["do"] == "swap" and c.get("obj") and c["obj"] != "text" and not _drawable(c["obj"].lower(), shapes):
            continue
        refs = [c.get(k) for k in ("id", "from", "near") if c.get(k)] + ([c["to"]] if isinstance(c.get("to"), str) and c["to"] not in ("left", "right", "center") else [])
        if any(r not in ids for r in refs):
            continue
        beats.append(c)
    if total == 0 or said / total < 0.6:
        return None, "its words are not from this scene (copied or invented)"
    if len(beats) < 3:
        return None, "too few steps"
    if not any(b["do"] in MOTION or (b["do"] == "enter" and b.get("how") in ("left", "right", "drop")) for b in beats):
        return None, "nothing moves"
    sig = ",".join(sorted(t["obj"] for t in things if t["obj"] != "text"))
    if prev_sig and sig == prev_sig:
        return None, "same things as the previous scene"
    layout = item.get("layout") if item.get("layout") in ("center", "row", "compare", "flow") else "row"
    return {"layout": layout, "things": things, "beats": beats, "sig": sig}, ""


# ------------------------------------------------------------------ layout: the app places everything
GROUND = -2.4
TOP_TEXT_Y = 2.95
MAX_H = 4.4


def _size(t: dict) -> tuple[float, float]:
    name = t["obj"]
    K = _vk()
    lib = K.resolve(name) or name
    asp = ASPECT.get(lib, 1.0)
    role = t.get("role", "side")
    if lib == "crowd":
        w = min(7.0, 0.62 * t.get("count", 6) + 0.4) * (1.0 if role != "small" else 0.6)
        return w, w / asp
    if lib in ("skyline", "fence", "waves", "train"):
        w = {"main": 9.0, "side": 6.0, "small": 4.0}[role] if lib != "waves" else 7.0
        return w, w / asp
    h = ROLE_H.get(role, 1.7)
    w = h * asp
    if w > 5.6:
        w = 5.6
        h = w / asp
    return w, h


def _row(items: list[dict], x0: float, x1: float, spread: bool = False) -> None:
    if not items:
        return
    gap = 0.55
    widths = [it["_w"] for it in items]
    total = sum(widths) + gap * (len(items) - 1)
    avail = x1 - x0
    k = min(1.0, avail / total) if total > 0 else 1.0
    if k >= 1.0:  # few things: make them bigger so the picture is full (never taller than MAX_H)
        k = min(1.45, (avail * 0.72) / total, MAX_H / max(it["_h"] for it in items))
        k = max(1.0, k)
    for it in items:
        it["_w"] *= k
        it["_h"] *= k
    widths = [it["_w"] for it in items]
    total = sum(widths) + gap * k * (len(items) - 1)
    g = gap * k
    if spread and len(items) > 1:
        g = (avail - sum(widths)) / (len(items) - 1)
        x = x0
    else:
        x = (x0 + x1) / 2 - total / 2
    for it in items:
        it["_x"] = x + it["_w"] / 2
        x += it["_w"] + g


def layout(plan: dict) -> dict:
    """Positions and sizes for every thing: one stage per "clear", things side by side on the ground,
    sky things up high, numbers on top — nothing overlaps, nothing is cut off."""
    K = _vk()
    things = {t["id"]: dict(t) for t in plan["things"]}
    stage_of, stage = {}, 0
    for b in plan["beats"]:
        if b["do"] == "clear":
            stage += 1
            continue
        for k in ("id", "from", "to", "near"):
            v = b.get(k)
            if isinstance(v, str) and v in things and v not in stage_of:
                stage_of[v] = stage
    for i in things:
        stage_of.setdefault(i, 0)
    objects = []
    for st in sorted(set(stage_of.values())):
        ids = [i for i in things if stage_of[i] == st]
        order = sorted(ids, key=lambda i: next((k for k, b in enumerate(plan["beats"]) if i in (b.get("id"), b.get("from"), b.get("to"), b.get("near"))), 99))
        texts = [things[i] for i in order if things[i]["obj"] == "text"][:2]
        sky = [things[i] for i in order if (K.resolve(things[i]["obj"]) or things[i]["obj"]) in SKY]
        ground = [things[i] for i in order if things[i] not in texts and things[i] not in sky]
        for t in ground + sky:
            t["_w"], t["_h"] = _size(t)
            if t["_h"] > MAX_H:
                t["_w"], t["_h"] = t["_w"] * MAX_H / t["_h"], MAX_H
        lay = plan.get("layout", "row")
        if lay == "compare":
            left = [t for t in ground if t.get("group") == "left"] or ground[: (len(ground) + 1) // 2]
            right = [t for t in ground if t not in left]
            _row(left, -6.4, -0.5)
            _row(right, 0.5, 6.4)
        elif lay == "center" and len(ground) > 1:
            main = next((t for t in ground if t.get("role") == "main"), ground[0])
            others = [t for t in ground if t is not main]
            mid = others[: len(others) // 2] + [main] + others[len(others) // 2:]
            _row(mid, -6.4, 6.4)
        else:
            _row(ground, -6.4, 6.4, spread=(lay == "flow"))
        for t in ground:
            name = K.resolve(t["obj"]) or t["obj"]
            t["_y"] = GROUND + t["_h"] / 2 + (0.15 if name == "waves" else 0)
        for k, t in enumerate(sky):
            t["_x"], t["_y"] = (5.0 if k % 2 == 0 else -5.0), 1.9
            t["_w"], t["_h"] = min(t["_w"], 2.2), min(t["_h"], 1.4)
        for k, t in enumerate(texts):
            if lay == "compare" and len(texts) == 2:
                t["_x"], t["_y"] = (-3.4 if k == 0 else 3.4), TOP_TEXT_Y
            else:
                t["_x"], t["_y"] = 0.0, TOP_TEXT_Y - k * 0.8
        for t in ground + sky + texts:
            name = K.resolve(t["obj"]) or t["obj"]
            o = {"id": t["id"], "obj": t["obj"], "x": round(t.get("_x", 0.0), 2), "y": round(t.get("_y", 0.0), 2)}
            if t["obj"] == "text":
                o["size"] = 1.0 if t is (texts[0] if texts else None) else 0.8
            else:  # the engine reads "size" as the width for wide library things, else the height
                o["size"] = round(t["_w"] if name in K.WIDE else t["_h"], 2)
            for k2 in ("color", "style", "text", "count", "points", "values", "share"):
                if t.get(k2) is not None:
                    o[k2] = t[k2]
            objects.append(o)
    pos = {o["id"]: (o["x"], o["y"]) for o in objects}
    beats = []
    for b in plan["beats"]:
        b = dict(b)
        if b.get("to") in ("left", "right", "center") and b.get("id") in pos:
            b["to"] = [{"left": -4.5, "right": 4.5, "center": 0.0}[b["to"]], pos[b["id"]][1]]
        if b["do"] == "pile":
            tgt = pos.get(b.get("to")) or (0.0, 0.0)
            b["pos"] = [tgt[0], 0.0]
        if b["do"] in ("badge",):
            b["pos"] = [0.0, 1.4]
        beats.append(b)
    return {"theme": "visual", "objects": objects, "beats": beats}


def basic_plan(text: str) -> dict:
    """Without a usable AI answer: the things the scene names (drawn library / My Shapes), brought in as
    they are spoken, and its number counted — calm and clean, never word boxes."""
    K = _vk()
    shapes = my_shapes()
    low = text.lower()
    found = []
    for key in sorted(set(K.ALIASES) | set(K.BUILDERS) | set(shapes), key=len, reverse=True):
        k2 = key.replace("_", " ")
        m = re.search(r"\b" + re.escape(k2) + r"s?\b", low)
        if m and key != "chip":
            name = K.resolve(key) or key
            if name not in [f[1] for f in found] and not any(m.start() >= f[2] and m.end() <= f[3] for f in found):
                found.append((text[m.start():m.end()], name, m.start(), m.end()))
    found.sort(key=lambda f: f[2])
    found = found[:3]
    things, beats = [], []
    first_word = text.split()[0] if text.split() else ""
    for k, (w, name, _a, _b) in enumerate(found):
        things.append({"id": f"o{k}", "obj": name, "role": "main" if k == 0 else "side"})
        beats.append({"say": first_word if k == 0 else w, "do": "enter", "id": f"o{k}", "how": "grow" if k == 0 else ("right" if k % 2 else "left")})
    m = re.search(r"([$€£]?)(\d[\d,]*(?:\.\d+)?)\s?(%|percent|million|billion|trillion|thousand)?", text)
    if m and _n(m.group(2).replace(",", "")) >= 10:
        things.append({"id": "n", "obj": "text", "text": m.group(0).strip()[:24], "style": "number"})
        beats.append({"say": m.group(2), "do": "count", "id": "n", "from": 0, "to": _n(m.group(2).replace(",", "")),
                      "prefix": m.group(1) or "", "suffix": (" " + m.group(3)) if m.group(3) and m.group(3) not in ("%",) else (m.group(3) or "")})
    if len(found) >= 1:
        beats.append({"say": found[0][0], "do": "pulse", "id": "o0"})
    if not things:
        words = [w for w in re.findall(r"[A-Za-z][A-Za-z'-]{3,}", text) if w.lower() not in ("that", "this", "with", "from", "they", "their", "your", "have", "will", "when", "what", "which")][:3]
        things = [{"id": "t", "obj": "text", "text": " ".join(words)[:28] or "…", "style": "title"}]
        beats = [{"say": (words[0] if words else text.split()[0]), "do": "enter", "id": "t", "how": "pop"}]
    beats.sort(key=lambda b: low.find(b["say"].lower()))
    plan = {"layout": "row", "things": things, "beats": beats}
    spec = layout(plan)
    spec["basic"] = True
    return spec


# ================================================================== VISUAL MOVES (user, 2026-11-20)
# Proven little choreographies. The AI picks one move per ~5 seconds of narration and fills its
# slots (things, numbers, labels); the app does the staging, timing and sounds — so every scene
# really SHOWS its idea with motion, never a row of icons standing still.
MOVES = {
    "grow": "something grows (or shrinks with down:true) while a number counts — {thing, number, label, down}",
    "split_share": "a company/thing splits into pieces and one piece goes to a person — {thing, to, label}",
    "money_flow": "coins or items flow from one thing to another — {from, to, item, number, label}",
    "pile_count": "items rain down into a pile while the total counts up — {item, number, label}",
    "price_jump": "a price tag jumps from an old to a new price — {thing, old, new, label}",
    "compare": "left vs right with their numbers — {left:{thing,label,number}, right:{thing,label,number}}",
    "timeline": "2-4 dates/steps appear one by one on a line — {items:[{label, thing}]}",
    "crash": "a chart rises then crashes (or a thing topples) — {thing, number, label}",
    "multiply": "one thing becomes many — {thing, n, number, label}",
    "rush": "a crowd runs to a thing (hype, demand) — {target, count, label}",
    "process": "A → B → C, each step appears with arrows — {steps:[{thing,label}] (2-3)}",
    "badge": "a big name card with its thing (a product, place, company) — {name, thing, sub}",
    "choose": "a person in front of 2-3 options, one gets picked — {thing, options:[thing..], pick, label}",
    "bars": "a bar chart grows with the key number — {values:[..], number, label}",
    "reveal_number": "one big number counts up with what it means — {number, label, thing}",
}
NUMBER_HELP = '{"from":0,"to":235,"prefix":"$","suffix":" million","decimals":0}'

G_FLOOR = -2.4
TOP_Y = 2.75


def _thing(i, name, x, h=None, w=None, y=None, ground=True, maxw=11.8, **kw):
    K = _vk()
    lib = K.resolve(name) or name
    asp = ASPECT.get(lib, 1.0)
    if h is None:
        h = (w or 2.0) / asp
    w = h * asp
    if w > maxw:  # wide things: keep them inside their place
        w, h = maxw, maxw / asp
    if y is None:
        y = G_FLOOR + h / 2 if ground else 0.0
    o = {"id": i, "obj": name, "x": round(x, 2), "y": round(y, 2), "size": round(w if lib in K.WIDE else h, 2)}
    o.update({k: v for k, v in kw.items() if v is not None})
    return o


def _text(i, text, x=0.0, y=TOP_Y, style="number", size=1.0, color=None):
    o = {"id": i, "obj": "text", "text": str(text)[:30], "style": style, "x": x, "y": y, "size": size}
    if color:
        o["color"] = color
    return o


def _num(n) -> dict | None:
    """A number slot -> count beat fields (or None)."""
    if isinstance(n, (int, float)):
        n = {"to": n}
    if not isinstance(n, dict) or n.get("to") is None:
        return None
    to = _n(n.get("to"), None)
    if to is None:
        return None
    pre = re.sub(r"\s+", " ", str(n.get("prefix") or ""))[:6]
    suf = re.sub(r"\s+", " ", str(n.get("suffix") or ""))[:18]
    dec = int(max(0, min(2, _n(n.get("decimals"), 0 if float(to).is_integer() else 1))))
    if abs(to) < 2 and dec == 0 and "%" not in suf:  # "1 path", "1 start today": no counter for that
        return None
    return {"from": _n(n.get("from"), 0), "to": to, "prefix": pre, "suffix": suf, "decimals": dec}


def _price(v, default: str) -> str:
    """A price slot: "$79.99", 79.99 or {"to": 79.99, "prefix": "$"} -> "$79.99"."""
    if isinstance(v, dict):
        nn = _num({**v, "decimals": v.get("decimals", 2 if not float(_n(v.get("to"), 0)).is_integer() else 0)}) or None
        if nn is None and v.get("to") is not None:
            nn = {"to": _n(v["to"]), "prefix": str(v.get("prefix") or "$"), "suffix": "", "decimals": 2}
        return _fmt({**nn, "prefix": nn["prefix"] or "$"})[:12] if nn else default
    if isinstance(v, (int, float)):
        return f"${v:,.2f}".replace(".00", "")[:12]
    t = _s(v, 12)
    return t or default


def _fmt(nn: dict) -> str:
    return f"{nn['prefix']}{nn['to']:,.{nn['decimals']}f}{nn['suffix']}"


def compile_move(m: dict, k: int, pick) -> tuple[list, list]:
    """One move -> objects + beats (beats carry the move's "say" and an "after" delay in seconds)."""
    p = f"m{k}_"
    say = m["say"]
    mv = m["move"]
    objs, beats = [], []

    def B(after, **kw):
        d = {"say": say, "after": round(after, 2)}
        d.update(kw)
        beats.append(d)

    def number_on_top(after, nn, x=0.0, i="n", size=1.2):
        objs.append(_text(p + i, _fmt(nn), x, TOP_Y, "number", size))
        B(after, do="count", id=p + i, **{kk: nn[kk] for kk in ("from", "to", "prefix", "suffix", "decimals")}, dur=1.3)

    def label(after, text, x=0.0, y=TOP_Y - 0.9, i="l"):
        if text:
            objs.append(_text(p + i, text, x, y, "label", 1.35))
            B(after, do="enter", id=p + i, how="pop")

    nn = _num(m.get("number"))
    if mv == "grow":
        t = pick(m.get("thing"), "skyline")
        objs.append(_thing(p + "t", t, 0, h=3.3) if (_vk().resolve(t) or t) not in _vk().WIDE else _thing(p + "t", t, 0, w=8.5))
        if m.get("down"):
            B(0, do="enter", id=p + "t", how="pop")
            B(0.6, do="scale", id=p + "t", to=0.35, axis="y", dur=1.4)
        else:
            B(0, do="enter", id=p + "t", how="grow", dur=1.4)
        if nn:
            number_on_top(1.5, nn)
        label(2.9, m.get("label"))
    elif mv == "split_share":
        t = pick(m.get("thing"), "factory")
        to = pick(m.get("to"), "person")
        objs += [_thing(p + "t", t, -2.6, h=3.3), _thing(p + "p", to, 4.4, h=1.9, color="gold")]
        B(0, do="enter", id=p + "t", how="grow")
        B(1.0, do="split", id=p + "t", rows=3, cols=5)
        B(1.8, do="enter", id=p + "p", how="right")
        B(2.6, do="give", id=p + "t", to=p + "p", piece=7, label=_s(m.get("label") or "1 share", 18))
    elif mv == "money_flow":
        a, z = pick(m.get("from"), "crowd"), pick(m.get("to"), "bank")
        objs += [_thing(p + "a", a, -3.9, h=2.6, maxw=5.0), _thing(p + "z", z, 3.9, h=2.8, maxw=5.0)]
        B(0, do="enter", id=p + "a", how="left")
        B(0.5, do="enter", id=p + "z", how="right")
        B(1.3, do="flow", **{"from": p + "a"}, to=p + "z", item=pick(m.get("item"), "coin"), n=10, size=0.75, dur=1.7)
        if nn:
            number_on_top(3.0, nn)
        B(4.4 if nn else 3.0, do="pulse", id=p + "z")
        label(4.9 if nn else 3.5, m.get("label"))
    elif mv == "pile_count":
        it = pick(m.get("item"), "coin")
        if nn:
            number_on_top(0, nn, size=1.15)
        B(1.4 if nn else 0, do="pile", item=it, n=14, size=1.05 if it != "coin" else 0.7, pos=[0, 0], dur=1.8)
        label(3.4 if nn else 1.9, m.get("label"))
    elif mv == "price_jump":
        t = pick(m.get("thing"), "box")
        old, new = _price(m.get("old"), "$70"), _price(m.get("new"), "$140")
        objs += [_thing(p + "t", t, -3.6, h=3.3, maxw=5.5), _thing(p + "tag", "price_tag", 2.0, w=4.2, y=0.3, ground=False, text=old),
                 _thing(p + "up", "arrow_up", 5.6, h=1.6, y=0.3, ground=False, color="green")]
        B(0, do="enter", id=p + "t", how="grow")
        B(0.7, do="enter", id=p + "tag", how="pop")
        B(1.7 if not m.get("then_say") else 0, **({"say": m["then_say"]} if m.get("then_say") else {}), do="enter", id=p + "up", how="drop")
        B(2.2 if not m.get("then_say") else 0.5, **({"say": m["then_say"]} if m.get("then_say") else {}), do="swap", id=p + "tag", obj="price_tag", text=new)
        B(2.9 if not m.get("then_say") else 1.2, **({"say": m["then_say"]} if m.get("then_say") else {}), do="pulse", id=p + "tag")
        label(3.4, m.get("label"), y=TOP_Y)
    elif mv == "compare":
        sides = []
        for side, x in (("left", -3.6), ("right", 3.6)):
            d = m.get(side) if isinstance(m.get(side), dict) else {}
            sides.append((side, x, pick(d.get("thing"), "box"), _s(d.get("label"), 18), _num(d.get("number"))))
        t0 = 0.0
        for side, x, t, lab, num_ in sides:
            same = side == "right" and sides[0][2] == t
            objs.append(_thing(p + side, t, x, h=2.6, maxw=4.6, color="teal" if same else None))
            B(t0, do="enter", id=p + side, how="left" if side == "left" else "right")
            if lab:
                objs.append(_text(p + side + "l", lab, x, G_FLOOR + 3.3, "label", 1.3))
                B(t0 + 0.6, do="enter", id=p + side + "l", how="pop")
            if num_:
                objs.append(_text(p + side + "n", _fmt(num_), x, TOP_Y, "number", 0.9))
                B(t0 + 1.0, do="count", id=p + side + "n", **{kk: num_[kk] for kk in ("from", "to", "prefix", "suffix", "decimals")}, dur=1.0)
            t0 += 2.2
    elif mv == "timeline":
        items = [x for x in (m.get("items") or []) if isinstance(x, dict) and _s(x.get("label"), 14)][:4]
        if len(items) < 2:
            return [], []
        xs = {2: [-3, 3], 3: [-4.5, 0, 4.5], 4: [-4.8, -1.6, 1.6, 4.8]}[len(items)]
        objs.append(_thing(p + "tr", "track", 0, w=11.5, y=-0.5, ground=False))
        B(0, do="enter", id=p + "tr", how="fade")
        for j, (it, x) in enumerate(zip(items, xs)):
            gap = 12.0 / len(items)
            lab = _s(it["label"], 18)
            objs.append(_text(p + f"y{j}", lab, x, 0.45, "number", min(0.9, gap / max(1.0, 0.36 * len(lab)))))
            sj = it.get("say") if isinstance(it.get("say"), str) else None
            B(0.6 + j * 1.1 if not sj else 0, **({"say": sj} if sj else {}), do="enter", id=p + f"y{j}", how="pop")
            th = pick(it.get("thing"), None)
            if th:
                objs.append(_thing(p + f"t{j}", th, x, h=1.3))
                B(0.9 + j * 1.1 if not sj else 0.3, **({"say": sj} if sj else {}), do="drop", id=p + f"t{j}")
    elif mv == "crash":
        t = pick(m.get("thing"), None)
        objs.append(_thing(p + "c", "line_chart", -1.2 if t else 0, w=7.5, y=-0.4, ground=False, points=[2, 3, 3.6, 5, 6.2, 5.8, 2.2, 1.2]))
        B(0, do="enter", id=p + "c", how="draw", dur=2.0)
        if t:
            objs.append(_thing(p + "t", t, 4.9, h=3.0, maxw=3.4))
            B(0.2, do="enter", id=p + "t", how="pop")
            B(2.3, do="topple", id=p + "t", side="right")
        else:
            objs.append(_thing(p + "d", "arrow_down", 5.0, h=1.8, color="red"))
            B(2.3, do="drop", id=p + "d")
        B(3.0, do="shake", id=p + "c")
        if nn:
            number_on_top(3.4, nn)
    elif mv == "multiply":
        t = pick(m.get("thing"), "game_case")
        objs.append(_thing(p + "t", t, 0, h=2.0, y=-0.6, ground=False, maxw=4.0))
        B(0, do="enter", id=p + "t", how="pop")
        B(0.8, do="clone", id=p + "t", n=int(max(4, min(20, _n(m.get("n"), 12)))))
        if nn:
            number_on_top(2.4, nn)
        label(3.8 if nn else 2.4, m.get("label"))
    elif mv == "rush":
        t = pick(m.get("target"), "shop")
        cnt = int(max(4, min(12, _n(m.get("count"), 9))))
        objs += [_thing(p + "t", t, -3.6, h=3.0), _thing(p + "c", "crowd", 3.6, w=min(6.0, 0.62 * cnt + 0.4), count=cnt)]
        B(0, do="enter", id=p + "t", how="grow")
        B(0.8, do="enter", id=p + "c", how="right")
        B(1.8, do="move", id=p + "c", to=p + "t", side="right", dur=1.0)
        B(2.9, do="shake", id=p + "t")
        label(3.6, m.get("label"))
    elif mv == "process":
        steps = [x for x in (m.get("steps") or []) if isinstance(x, dict)][:3]
        steps = [(pick(x.get("thing"), None), _s(x.get("label"), 16), x.get("say")) for x in steps]
        steps = [x for x in steps if x[0]]
        if len(steps) < 2:
            return [], []
        xs = [-4.6, 0, 4.6] if len(steps) == 3 else [-3.2, 3.2]
        for j, ((t, lab, sj), x) in enumerate(zip(steps, xs)):
            objs.append(_thing(p + f"s{j}", t, x, h=2.6, maxw=3.6))
            when = {"say": sj, "after": 0} if isinstance(sj, str) else {"after": j * 1.4}
            beats.append({"say": say, **when, "do": "enter", "id": p + f"s{j}", "how": "pop"})
            if lab:
                objs.append(_text(p + f"l{j}", lab, x, G_FLOOR + 2.95, "label", 1.15))
                beats.append({"say": say, **{**when, "after": when["after"] + 0.4}, "do": "enter", "id": p + f"l{j}", "how": "pop"})
            if j < len(steps) - 1:
                ax = (x + xs[j + 1]) / 2
                objs.append(_thing(p + f"a{j}", "arrow_right", ax, w=1.4, y=G_FLOOR + 1.1, ground=False))
                beats.append({"say": say, **{**when, "after": when["after"] + 0.8}, "do": "enter", "id": p + f"a{j}", "how": "left"})
    elif mv == "badge":
        name = _s(m.get("name"), 26)
        if not name:
            return [], []
        objs.append(_text(p + "nm", name, 0, 2.5, "title", 1.5))
        B(0, do="enter", id=p + "nm", how="pop")
        t = pick(m.get("thing"), None)
        if t:
            objs.append(_thing(p + "t", t, 0, h=3.0, maxw=6.5))
            B(0.6, do="drop", id=p + "t")
            B(1.6, do="pulse", id=p + "t")
        if m.get("sub"):
            objs.append(_text(p + "sb", _s(m["sub"], 30), 0, 1.5, "label", 1.3))
            B(1.0, do="enter", id=p + "sb", how="pop")
    elif mv == "choose":
        who = pick(m.get("thing"), "person")
        opts = [pick(o, None) for o in (m.get("options") or [])][:3]
        opts = [o for o in opts if o]
        if len(opts) < 2:
            return [], []
        objs.append(_thing(p + "w", who, 0, h=2.6))
        B(0, do="enter", id=p + "w", how="pop")
        xs = [-4.4, 0, 4.4] if len(opts) == 3 else [-4.0, 4.0]
        ys = [0.6, 1.4, 0.6] if len(opts) == 3 else [0.6, 0.6]
        for j, (o, x, y) in enumerate(zip(opts, xs, ys)):
            objs.append(_thing(p + f"o{j}", o, x, h=2.0, y=y, ground=False, maxw=3.6))
            B(0.6 + j * 0.6, do="enter", id=p + f"o{j}", how="pop")
        pk = int(max(0, min(len(opts) - 1, _n(m.get("pick"), 0))))
        B(0.8 + len(opts) * 0.6, do="pulse", id=p + f"o{pk}")
        B(1.5 + len(opts) * 0.6, do="move", id=p + "w", to=p + f"o{pk}", side="down", dur=0.9)
        label(2.6 + len(opts) * 0.6, m.get("label"), y=TOP_Y)
    elif mv == "bars":
        vals = [max(0.0, _n(v)) for v in (m.get("values") or [])][:6]
        if len(vals) < 2:
            return [], []
        objs.append(_thing(p + "b", "bar_chart", 0, w=6.5, values=vals))
        B(0, do="enter", id=p + "b", how="build", dur=1.4)
        if nn:
            number_on_top(1.5, nn)
        label(2.9 if nn else 1.5, m.get("label"))
    elif mv == "reveal_number":
        if not nn:
            return [], []
        objs.append(_text(p + "n", _fmt(nn), 0, 1.6, "number", 1.9))
        B(0, do="count", id=p + "n", **{kk: nn[kk] for kk in ("from", "to", "prefix", "suffix", "decimals")}, dur=1.5)
        label(1.6, m.get("label"), y=0.45)
        t = pick(m.get("thing"), None)
        if t:
            objs.append(_thing(p + "t", t, 0, h=1.9, maxw=4.5))
            B(2.1, do="drop", id=p + "t")
    return objs, beats


GUIDE = """You direct an animated EXPLAINER video (flat drawn things moving on a dark background). For each scene you pick
VISUAL MOVES — ready-made animations that SHOW the narration — and fill in their things, numbers and labels.
The app does all staging, timing and sound. Use about ONE move per 12-15 spoken words (a 40-word scene = 2-3 moves).

MOVES:
{moves}

THINGS (prefer these drawn names): {lib}. Other simple concrete nouns are allowed (drawn as icons).
Numbers: {nhelp} — use them for EVERY figure the narrator says (235 million copies, $10 billion, 3-8%, 30-50%).
Labels: 1-3 words (never sentences). badge "name" = the real name said (PS5, Vice City, Take-Two).

EVERY move: {{"move":"...","say":"1-4 words copied EXACTLY from this scene where the move starts", ...slots}}.
Moves are listed in the order spoken. Show THIS scene's own subject. Avoid the things of the last 2 scenes
(already used: {used}). Variety: never the same move twice in a row.

Reply ONLY JSON: {{"scenes":[{{"n":<scene number>,"moves":[...]}}]}}
Example (scene: "GTA 5 sold 235 million copies and earned over $10 billion, so Take-Two's share price kept climbing."):
{{"n":1,"moves":[{{"move":"pile_count","say":"GTA 5 sold","item":"game_case","number":{{"to":235,"suffix":" million"}},"label":"copies sold"}},
{{"move":"reveal_number","say":"over $10 billion","number":{{"to":10,"prefix":"$","suffix":" billion"}},"label":"earned","thing":"cash"}},
{{"move":"grow","say":"share price","thing":"line_chart","label":"Take-Two stock"}}]}}"""


def plan_prompt(title: str, part: list[tuple[int, str]], hint: str = "", avoid: str = "", used: str = "") -> str:
    lines = "\n".join(f"Scene {n} ({len(t.split())} words): {t[:900]}" for n, t in part)
    extra = f"\nThe user wants this scene to show: {hint}" if hint else ""
    extra += f"\nDo NOT repeat this idea: {avoid}" if avoid else ""
    return (GUIDE.format(moves="\n".join(f"- {k}: {v}" for k, v in MOVES.items()), lib=", ".join(library_names()),
                         nhelp=NUMBER_HELP, used=used or "none yet") + f'\n\nVideo title: "{title}".{extra}\n'
            "Now plan EACH scene below (use its number as n):\n" + lines)


def check_moves(item, narration: str, prev_sig: str = "", recent: list | None = None) -> tuple[dict | None, str]:
    """The AI's moves for one scene, checked and compiled — or (None, why it was rejected)."""
    if not isinstance(item, dict) or not isinstance(item.get("moves"), list):
        return None, "no moves"
    shapes = my_shapes()
    low = _norm(narration)

    K = _vk()

    def pick(name, default):
        n = _s(name, 30).lower().strip() if isinstance(name, str) else ""
        if n and _drawable(n, shapes):
            return K.resolve(n) or n
        return default
    raw = [m for m in item["moves"] if isinstance(m, dict) and m.get("move") in MOVES][:5]
    total = len(raw)
    good = []
    for m in raw:
        say = _s(m.get("say"), 60)
        if not say or _norm(say) not in low:
            continue
        m = dict(m)
        m["say"] = say
        if m.get("then_say") and _norm(_s(m["then_say"], 60)) not in low:
            m.pop("then_say")
        good.append(m)
    if total == 0 or len(good) / total < 0.6:
        return None, "its words are not from this scene (copied or invented)"
    good.sort(key=lambda m: low.find(_norm(m["say"])))
    spaced, last_w, total_w = [], -99, len(low.split())
    for m in good:  # moves need room to play: ~7 spoken words apart, and ~2.5 s left before the scene ends
        w = len(low[: low.find(_norm(m["say"]))].split())
        if not spaced or (w - last_w >= 6 and total_w - w >= 4):
            spaced.append(m)
            last_w = w
    good = spaced
    objects, beats, used = [], [], []
    for k, m in enumerate(good):
        objs, bts = compile_move(m, k, pick)
        if not objs:
            continue
        if beats:  # a new move: the stage is cleared as it starts
            beats.append({"say": m["say"], "after": 0, "do": "clear"})
        objects += objs
        beats += bts
        used += [o["obj"] for o in objs if o["obj"] not in ("text", "track", "arrow_right", "arrow_up", "arrow_down")]
        used += [b["item"] for b in bts if b.get("item")]
    if not objects:
        return None, "no usable move"
    sig = ",".join(sorted(set(used)))
    if prev_sig and sig == prev_sig:
        return None, "same things as the previous scene"
    if recent and len(recent) >= 2:  # variety: one thing in at most 2 scenes in a row
        again = sorted(set(used) & set(recent[-1].split(",")) & set(recent[-2].split(",")) - {""})
        if again:
            return None, f"{', '.join(again)} already showed in the last 2 scenes — show something else"
    return {"theme": "visual", "objects": objects, "beats": beats, "sig": sig, "moves": [m["move"] for m in good]}, ""


def _ask(prompt: str) -> tuple[object, str]:
    """ONLY Gemini (user, 2026-11-20: "video sirf Gemini se hi banni chahiye"), never a shortened prompt.
    Returns (answer, "") or (None, why Gemini did not answer)."""
    import tools_animator as ta
    key = str(ta._AI.get("gemini_key") or "")
    if not key:
        return None, "no Gemini key"
    if not ta._gemini_ready(key):
        return None, ta._AI_STATUS["gemini_error"] or "Gemini is paused for a moment"
    try:
        return ta._json_in(ta._gemini_only(prompt, key)), ""
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)[:200]


WAIT_BUDGET = 600  # seconds the storyboard waits for a busy Gemini before it stops


def _ask_waiting(prompt: str, progress_cb, budget: dict, where: str) -> object:
    """Ask Gemini; while Google is busy, wait and try again (the page shows the countdown). After about
    10 minutes of waiting the job STOPS with a clear message — it never makes a video out of guesses."""
    import tools_animator as ta
    while True:
        data, err = _ask(prompt)
        if data is not None or not err:
            return data
        if "not valid" in err.lower() or "no gemini key" in err.lower():
            raise RuntimeError(f"Gemini cannot be used: {err}. Fix the key in the Dashboard and try again.")
        wait = max(15.0, min(90.0, ta._AI_STATUS["retry_at"] - time.time()))
        if budget["waited"] + wait > WAIT_BUDGET:
            raise RuntimeError(f"Gemini is busy right now ({err}). Nothing was made from guesses — your script and settings are "
                               "kept. Please try again later (Google's free servers are usually free in the morning), or pick "
                               "another Gemini model in the AI writer box.")
        if progress_cb:
            progress_cb(budget.get("at", 0), budget.get("n", 1),
                        f"Gemini is busy ({err[:70]}) — trying again in {int(wait)}s ({where})…")
        time.sleep(wait)
        budget["waited"] += wait
        ta._AI_STATUS["retry_at"] = 0.0


def need_gemini() -> None:
    import tools_animator as ta
    if not str(ta._AI.get("gemini_key") or "").strip():
        raise RuntimeError("The Visual Explainer needs your free Gemini key (the free AI cannot design the animations well). "
                           "Get one at aistudio.google.com/apikey and add it in the Dashboard, then try again.")


def plan_scenes(title: str, scenes: list[dict], progress_cb=None) -> int:
    """A checked plan for every scene (scene["graphic"]). Returns how many scenes got the simple version."""
    import autovideo_smart
    need_gemini()
    n = len(scenes)
    got: dict[int, dict] = {}
    chunk = 3
    budget = {"waited": 0.0}

    def recent(i):
        return [got[j]["sig"] for j in (i - 2, i - 1) if j in got]

    def used_before(i):
        names = []
        for j in range(max(0, i - 3), i):
            names += [x for x in got.get(j, {}).get("sig", "").split(",") if x]
        return ", ".join(dict.fromkeys(names))
    for start in range(0, n, chunk):
        part = [(start + k + 1, scenes[start + k]["narration"]) for k in range(min(chunk, n - start))]
        if progress_cb:
            progress_cb(start, n, f"Designing the animation — scenes {start + 1}-{start + len(part)} of {n}…")
        budget["at"], budget["n"] = start, n
        data = _ask_waiting(plan_prompt(title, part, used=used_before(start)), progress_cb, budget, f"scenes {start + 1}-{start + len(part)}")
        items = sorted((x for x in autovideo_smart.ai_scene_items(data) if isinstance(x, dict)), key=lambda x: _n(x.get("n"), 99))
        for item in items:
            try:
                i = int(item.get("n")) - 1
            except (TypeError, ValueError):
                continue
            if start <= i < start + len(part) and i not in got:
                p, _why = check_moves(item, scenes[i]["narration"], got.get(i - 1, {}).get("sig", ""), recent(i))
                if p:
                    got[i] = p
        for k in range(len(part)):  # a scene whose plan was missing or rejected: ask again for it alone, with the reason
            i = start + k
            why = "missing"
            for _try in range(2):
                if i in got:
                    break
                prev = got.get(i - 1, {})
                data = _ask_waiting(plan_prompt(title, [(1, scenes[i]["narration"])], avoid=prev.get("sig", ""), used=used_before(i))
                                    + f"\n(Your last plan for this scene was rejected: {why}.)", progress_cb, budget, f"scene {i + 1}")
                items = autovideo_smart.ai_scene_items(data)
                # the last try is not refused for variety alone (a real plan beats the simple version)
                p, why = check_moves(items[0], scenes[i]["narration"], prev.get("sig", ""), recent(i) if _try == 0 else None) if items else (None, "no answer")
                if p:
                    got[i] = p
    basic = 0
    for i, sc in enumerate(scenes):
        if i in got:
            sc["graphic"] = got[i]
        else:
            sc["graphic"] = basic_plan(sc["narration"])
            basic += 1
    return basic


def timed(spec: dict, narration: str, duration: float, cues=None) -> dict:
    """Beat times from their spoken words (the real voice timing when known). A beat may carry "after":
    seconds after its words. Each move (the beats between two clears) is squeezed so it ends before the next starts."""
    import tools_graphics as tg
    s = json.loads(json.dumps(spec))
    s["duration"] = round(max(1.0, duration), 2)
    clock = tg._Clock(narration, duration, cues)
    low = narration.lower()
    pos = 0

    def when(say):
        nonlocal pos
        say = str(say or "").lower().strip()
        p = low.find(say, pos) if say else -1
        if p < 0 and say:
            p = low.find(say)
        if p < 0:
            return None
        pos = max(pos, p)
        return clock.at_word(clock.word_index(p, narration)) - 0.12

    segs, cur = [], []
    for b in s.get("beats") or []:
        if b.get("do") == "clear" and cur:
            segs.append(cur)
            cur = []
        cur.append(b)
    if cur:
        segs.append(cur)
    last_t = 0.0
    for seg in segs:  # the anchor (the words) of each beat
        for b in seg:
            t = when(b.get("say"))
            b["_t"] = t
    starts = []
    for seg in segs:
        ts = [b["_t"] for b in seg if b["_t"] is not None]
        starts.append(min(ts) if ts else None)
    out = []
    for k, seg in enumerate(segs):
        start = starts[k] if starts[k] is not None else last_t + 0.6
        start = max(last_t + 0.05 if out else 0.0, start)
        nxt = next((x for x in starts[k + 1:] if x is not None), duration)
        room = max(0.6, min(nxt, duration) - start - 0.35)
        ends = [((b["_t"] if b["_t"] is not None else start) - start) + _n(b.get("after"), 0) for b in seg]
        f = min(1.0, room / max(ends)) if ends and max(ends) > 0 else 1.0
        for b, e in zip(seg, ends):
            t = start + e * f
            b["at"] = round(max(0.0, min(duration - 0.4, t)), 2)
            b.pop("_t", None)
            b.pop("after", None)
            out.append(b)
        last_t = max(b["at"] for b in seg)
    out.sort(key=lambda b: b["at"])  # stable: a clear stays before the beats of its move
    first = next((b for b in out if b.get("do") not in ("clear",)), None)
    if first is not None and first.get("at", 0) > 0.9:
        f0 = first["at"]
        shift = f0 - 0.15
        first_clear = min((c["at"] for c in out if c.get("do") == "clear"), default=duration + 1)
        for b in out:  # the first move starts at once: nothing waits on an empty stage
            if b["at"] <= f0 + 3.0 and b["at"] < first_clear:
                b["at"] = round(b["at"] - shift, 2)
        out.sort(key=lambda b: b["at"])
    s["beats"] = out
    return s


# ================================================================== render
def _keep_log(output: str) -> None:
    """The full output of the last failed scene, for troubleshooting (manim-error.log next to the app)."""
    try:
        (HERE.parent / "manim-error.log").write_text(output[-60000:], encoding="utf-8")
    except OSError:
        pass


def render(spec: dict, out_path: Path, width: int, height: int, fps: int = 30, still: bool = False, timeout: int = 1200,
           script: bool = False, report: dict | None = None) -> Path | None:
    """Draws one plan with Manim. Writes <out>.sfx.json (the sound effects) next to a video.
    script=True runs the user's scene code (Script mode, vis_script.py); report gets its error/warnings."""
    spec = dict(spec)
    resolve_objects(spec)
    work = Path(tempfile.mkdtemp(prefix="ytg-vis-"))
    try:
        (work / "spec.json").write_text(json.dumps(spec), encoding="utf-8")
        sfx = work / "sfx.json"
        args = ["render", "--resolution", f"{width},{height}", "--frame_rate", str(fps),
                "--disable_caching", "--media_dir", str(work / "media"), "-o", "out", "-v", "WARNING"]
        if still:
            args += ["-s"]
        args += [str(HERE / "vis_script.py"), "ScriptScene"] if script else [str(SCENE), "Visual"]
        env = {**os.environ, "YTG_SPEC": str(work / "spec.json"), "YTG_SFX": str(sfx), "YTG_ERR": str(work / "err.json")}
        code, output = manim_cli.run(args, work, env, timeout, **_no_window())
        if report is not None:
            try:
                report.update(json.loads((work / "err.json").read_text(encoding="utf-8")))
            except Exception:  # noqa: BLE001
                report["error"] = report.get("error") or (
                    "The scene could not run: " + manim_cli.error_summary(output, code) if code else "")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        if still:
            pics = sorted((work / "media" / "images").rglob("*.png"))
            if not pics:
                _keep_log(output)
                raise RuntimeError("No picture: " + manim_cli.error_summary(output, code))
            shutil.move(str(pics[-1]), str(out_path))
            return out_path
        vids = [p for p in (work / "media" / "videos").rglob("*.mp4") if "partial" not in str(p)]
        if not vids:
            _keep_log(output)
            raise RuntimeError("No video: " + manim_cli.error_summary(output, code))
        shutil.move(str(vids[0]), str(out_path))
        if script and spec.get("transitions"):  # whip / zoom / slide into or out of the scene
            vis_transitions.apply(out_path, spec["transitions"], width, height, fps, _n(spec.get("duration"), 6.0),
                                  spec.get("backdrop") or "#1b2433", **_no_window())
        if sfx.exists():
            shutil.move(str(sfx), str(out_path.with_suffix(".sfx.json")))
        return out_path
    finally:
        shutil.rmtree(work, ignore_errors=True)


def preview_spec(spec: dict, est: float) -> dict:
    """The storyboard picture: what is on screen after the scene's last "clear", every beat played quickly."""
    s = json.loads(json.dumps(spec))
    beats = s.get("beats") or []
    last_clear = max([k for k, b in enumerate(beats) if b.get("do") == "clear"], default=-1)
    keep = [b for b in beats[last_clear + 1:] if b.get("do") not in ("exit", "camera")]
    if last_clear >= 0:
        used = {b.get(k) for b in keep for k in ("id", "from", "to", "near") if isinstance(b.get(k), str)}
        s["objects"] = [o for o in s.get("objects") or [] if o.get("id") in used]
    for k, b in enumerate(keep):
        b["at"] = round(0.1 + k * 0.05, 2)
        b["dur"] = 0.1
    s["beats"] = keep
    s["duration"] = 0.3 + len(keep) * 0.05 + 2.0
    _ = est
    return s


def add_to_footage(title: str, scenes: list[dict], work_dir: Path, vertical: bool, progress_cb=None) -> dict:
    """Visual Explainer, step 2: every scene gets its animation plan and a storyboard picture."""
    w, h = (540, 960) if vertical else (960, 540)
    try:
        import tools_graphics as _tg
        design = _tg.style().get("design", "gemini")
    except Exception:  # noqa: BLE001
        design = "gemini"
    if design == "script":  # Script mode (user, 2026-11-20): no Gemini — the scenes wait for the user's scene code
        import tools_script
        for i, sc in enumerate(scenes):
            still = work_dir / f"scene-{i:02d}-visual.png"
            tools_script.placeholder(still, i + 1, w, h)
            sc["graphic"] = {"theme": "visual", "script": True, "objects": [], "beats": []}
            sc["missing"] = []
            sc["kind"], sc["visual_file"], sc["graphic_file"] = "image", still.name, still.name
            sc["visual_source"] = "Script mode — paste your scene code (Script mode box below)"
        return {"basic": 0}
    basic = plan_scenes(title, scenes, progress_cb)
    done = [0]
    lock = threading.Lock()

    def one(i):
        sc = scenes[i]
        still = work_dir / f"scene-{i:02d}-visual.png"
        try:
            render(preview_spec(sc["graphic"], 8), still, w, h, fps=15, still=True, timeout=300)
        except Exception as exc:  # noqa: BLE001
            print("storyboard picture failed:", exc)
            _blank(still, w, h)
        sc["missing"] = resolve_objects(json.loads(json.dumps(sc["graphic"])))
        sc["kind"], sc["visual_file"], sc["graphic_file"] = "image", still.name, still.name
        sc["visual_source"] = ("Visual explainer — simple version (the AI was busy), press Redo for a better idea"
                               if sc["graphic"].get("basic") else "Visual explainer — animated with sound effects in the final video")
        with lock:
            done[0] += 1
            if progress_cb:
                progress_cb(done[0], len(scenes), f"Drawing the storyboard — scene {done[0]} of {len(scenes)}…")
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max(1, min(3, (os.cpu_count() or 2) // 2))) as pool:
        list(pool.map(one, range(len(scenes))))
    return {"basic": basic}


def _blank(path: Path, w: int, h: int) -> None:
    try:
        from PIL import Image
        Image.new("RGB", (w, h), (27, 36, 51)).save(path)
    except Exception:  # noqa: BLE001
        pass


def clip_for_scene(scene: dict, index: int, work_dir: Path, duration: float, cues, vertical: bool) -> Path | None:
    """The scene's animation in time with its voice; reused when nothing changed."""
    test = scene.get("script_test") or {}
    if scene.get("code") and (not test or test.get("ok")):  # Script mode: the user's own scene code
        import tools_script
        if not tools_script.check(scene["code"])[0]:
            return tools_script.clip_for_scene(scene, index, work_dir, duration, cues, vertical)
    graphic = scene["graphic"]
    if not graphic.get("beats"):  # Script mode, a scene without code: the simple version, never an empty stage
        graphic = basic_plan(scene["narration"])
    spec = timed(graphic, scene["narration"], duration, cues)
    out = work_dir / f"scene-{index:02d}-visual.mp4"
    key = json.dumps({"s": spec, "v": vertical}, sort_keys=True)
    stamp = out.with_suffix(".key")
    if out.exists() and stamp.exists() and stamp.read_text(encoding="utf-8") == key:
        return out
    w, h = (1080, 1920) if vertical else (1280, 720)
    p = render(spec, out, w, h, fps=30)
    if p is not None:
        stamp.write_text(key, encoding="utf-8")
    return p


# ================================================================== storyboard: redo one scene
def _av():
    import autovideo2
    return autovideo2._av_app()


class RedoReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    index: int = Field(..., ge=0, le=500)
    hint: str = Field("", max_length=300)
    gemini_key: str = Field("", max_length=200)


@router.post("/redo")
def redo(req: RedoReq) -> dict:
    """A new idea for one scene (optionally what the user wants to see), with a new storyboard picture."""
    app = _av()
    if app is None:
        raise HTTPException(503, "The app is not ready.")
    job = app._av_read(req.job_id)
    scenes = job.get("scenes") or []
    if not 0 <= req.index < len(scenes):
        raise HTTPException(404, "Scene not found.")
    _set_key(req.gemini_key)
    try:
        need_gemini()
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from None
    sc = scenes[req.index]
    old = (sc.get("graphic") or {})
    old_sig = old.get("sig") or ",".join(sorted(set(o.get("obj", "") for o in old.get("objects") or [] if o.get("obj") != "text")))
    hint = req.hint.strip()
    import autovideo_smart
    p, why = None, ""
    for _try in range(3):
        prompt = plan_prompt(job.get("title") or "", [(1, sc["narration"])], hint or "a DIFFERENT, clearer visual idea", avoid=old_sig)
        if why:
            prompt += f"\n(Your last plan was rejected: {why}.)"
        data, err = _ask(prompt)
        items = autovideo_smart.ai_scene_items(data)
        p, why = check_moves(items[0], sc["narration"], "" if hint else old_sig) if items else (None, err or "no answer")
        if p:
            break
    if p is None:
        raise HTTPException(502, f"The AI could not make a good plan ({why}). Try again in a minute, or describe what you want to see.")
    spec = p
    work_dir = app._av_job_dir(req.job_id)
    vertical = (job.get("video_type") or "long") == "short"
    w, h = (540, 960) if vertical else (960, 540)
    still = work_dir / f"scene-{req.index:02d}-visual-{int(time.time()) % 100000}.png"
    try:
        render(preview_spec(spec, 8), still, w, h, fps=15, still=True, timeout=300)
    except Exception:  # noqa: BLE001
        _blank(still, w, h)
    sc.pop("code", None)  # a new AI idea replaces the scene code
    sc.pop("script_test", None)
    sc.update(graphic=spec, kind="image", visual_file=still.name, graphic_file=still.name,
              visual_source="Visual explainer — your new idea (animated with sound effects in the final video)",
              missing=resolve_objects(json.loads(json.dumps(spec))))
    app._av_write(job)
    return {"scene": sc}


@router.get("/missing/{job_id}")
def missing(job_id: str) -> dict:
    app = _av()
    if app is None:
        return {"missing": []}
    job = app._av_read(job_id)
    shapes = my_shapes()
    names = []
    for sc in job.get("scenes") or []:
        for m in sc.get("missing") or []:
            if m not in names and m not in shapes:
                names.append(m)
    return {"missing": names}


def _set_key(k: str) -> None:
    if k.strip():
        try:
            import tools_animator as ta
            ta._AI["gemini_key"] = k.strip()
        except Exception:  # noqa: BLE001
            pass


# ================================================================== My Shapes
SHAPE_GUIDE = """Draw a flat, simple, friendly illustration of "{name}" for an explainer video (style: flat shapes, no outlines,
soft colours on a dark navy background, like a modern infographic icon). Use 6-30 parts inside a 0..1 box (x right, y UP).
Reply ONLY JSON: {{"parts":[...]}} with parts of these kinds:
{{"shape":"rect","x":0.5,"y":0.3,"w":0.8,"h":0.4,"r":0.05,"fill":"#c8553d"}}   (x,y = centre; r = corner radius)
{{"shape":"circle","x":0.5,"y":0.8,"r":0.12,"fill":"#f2c14e"}}
{{"shape":"ellipse","x":0.5,"y":0.5,"w":0.6,"h":0.3,"fill":"#5b8def"}}
{{"shape":"polygon","points":[[0.1,0.1],[0.9,0.1],[0.5,0.9]],"fill":"#2a9d8f"}}
{{"shape":"line","points":[[0.2,0.2],[0.8,0.2]],"stroke":"#f1ece1","sw":4}}
{{"shape":"arc","x":0.5,"y":0.5,"r":0.3,"start":0,"angle":180,"stroke":"#f1ece1","sw":6}}
Optional "rot" (degrees) on any part. Later parts are drawn on top. Palette: #f1ece1 cream, #e0782f orange, #2a9d8f teal,
#f2c14e gold, #5b8def blue, #e05a47 red, #3a4a5f slate, #5cb85c green, #9b7bd4 purple, #8c5a3c brown, #f4c9a0 skin, #1d2430 ink.
Make it clearly recognisable as {name} from its silhouette."""


def clean_recipe(r) -> dict | None:
    if not isinstance(r, dict) or not isinstance(r.get("parts"), list):
        return None
    parts = []
    for p in r["parts"][:80]:
        if not isinstance(p, dict) or str(p.get("shape") or "") not in ("rect", "circle", "ellipse", "polygon", "line", "arc"):
            continue
        c = {"shape": p["shape"]}
        for k in ("x", "y", "w", "h", "r", "start", "angle", "sw", "rot"):
            if p.get(k) is not None:
                c[k] = round(_n(p[k]), 4)
        for k in ("fill", "stroke"):
            if p.get(k):
                c[k] = _s(p[k], 9)
        if isinstance(p.get("points"), list):
            c["points"] = [[round(_n(a), 4), round(_n(b), 4)] for a, b in [q for q in p["points"] if isinstance(q, (list, tuple)) and len(q) >= 2][:40]]
        parts.append(c)
    return {"parts": parts} if len(parts) >= 2 else None


@router.get("/shapes")
def shapes_list() -> dict:
    return {"shapes": my_shapes(), "library": library_names()}


class DrawReq(BaseModel):
    name: str = Field(..., min_length=2, max_length=30)
    gemini_key: str = Field("", max_length=200)
    hint: str = Field("", max_length=200)


def _key_name(n: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", n.lower()).strip("_")[:30]


@router.post("/shapes/draw")
def shapes_draw(req: DrawReq) -> dict:
    """The AI draws a missing shape as a recipe (you see it before saving)."""
    _set_key(req.gemini_key)
    name = _key_name(req.name)
    prompt = SHAPE_GUIDE.format(name=req.name.strip()) + (f"\nAlso: {req.hint}" if req.hint.strip() else "")
    data, err = _ask(prompt)
    r = clean_recipe(data)
    if r is None:
        raise HTTPException(502, f"The AI did not draw it ({err or 'bad answer'}). Try again, or use 'Copy prompt' with another AI.")
    return {"name": name, "recipe": r}


@router.get("/shapes/prompt")
def shapes_prompt(name: str) -> dict:
    return {"prompt": SHAPE_GUIDE.format(name=name.strip()[:30])}


class SaveShape(BaseModel):
    name: str = Field(..., min_length=2, max_length=30)
    recipe: dict


@router.post("/shapes")
def shapes_save(req: SaveShape) -> dict:
    r = clean_recipe(req.recipe)
    if r is None:
        raise HTTPException(400, "This shape has no drawable parts.")
    d = my_shapes()
    d[_key_name(req.name)] = r
    SHAPES_FILE.write_text(json.dumps(d), encoding="utf-8")
    return {"shapes": d}


@router.delete("/shapes/{name}")
def shapes_delete(name: str) -> dict:
    d = my_shapes()
    d.pop(_key_name(name), None)
    SHAPES_FILE.write_text(json.dumps(d), encoding="utf-8")
    return {"shapes": d}


_unused = (math,)
