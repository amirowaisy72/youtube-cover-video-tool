"""YT Guru — Script mode scene (user, 2026-11-20).

The user asks any AI (Claude, ChatGPT, Gemini…) to write the animation of each scene as a short piece of
Python, pastes it into the app, and this scene runs it: full freedom (any Manim drawing or motion) plus the
app's drawn library, timing by spoken words and sound effects — the way the hand-made sample was made.

YTG_SPEC: {"code": "...", "narration": "...", "duration": 9.4, "words": [[word, seconds], ...],
           "shapes": {...}, "icons": {...}}
The code is checked before it runs (script_check): no imports, no files, no hidden attributes.
"""
import json
import math
import os
import random
import traceback
from pathlib import Path

import numpy as np
import manim as _M
from manim import DOWN, LEFT, RIGHT, UP, FadeIn, Rectangle, UpdateFromAlphaFunc, config, rate_functions

import vis_scene as V
import vis_people as P
import vis_master
import vis_sets
import vis_transitions
from vis_scene import GROUND_Y, H, W, XMAX, YMAX, YMIN, K, make_obj, num, text_mob

SPEC = V.SPEC
ERR_OUT = os.environ.get("YTG_ERR", "")

# Manim names the scene code may use: shapes, text, animations, colors, directions, rate functions.
_BLOCK = {"config", "tempconfig", "logger", "console", "error_console", "cli", "Scene", "ThreeDScene", "MovingCameraScene",
          "ZoomedScene", "VectorScene", "LinearTransformationScene", "SceneFileWriter", "Code", "SVGMobject", "ImageMobject",
          "Tex", "MathTex", "SingleStringMathTex", "Title", "BulletedList", "Table", "MathTable", "DecimalTable", "IntegerTable",
          "Variable", "Matrix", "DecimalMatrix", "IntegerMatrix", "MobjectMatrix", "VMobjectFromSVGPath", "SVGPathMobject"}


def _manim_names() -> dict:
    """Only drawing things, animations, colours, directions and a few helpers — no file or config tools."""
    out = {}
    fns = {"always_redraw", "interpolate_color", "color_gradient", "rate_functions", "smooth", "linear", "there_and_back",
           "rush_into", "rush_from", "double_smooth", "wiggle", "ManimColor", "interpolate", "rotate_vector"}
    # Manim versions differ: a name may be missing or raise when it is read — it is skipped, never fatal.
    color_type = getattr(_M, "ManimColor", None)
    values = (int, float, str, np.ndarray) + ((color_type,) if isinstance(color_type, type) else ())
    drawable = (_M.Mobject, _M.Animation)
    for k in dir(_M):
        if k.startswith("_") or k in _BLOCK:
            continue
        try:
            v = getattr(_M, k)
            if isinstance(v, type):
                if issubclass(v, drawable) or k == "ManimColor":
                    out[k] = v
            elif isinstance(v, values) or k in fns:
                out[k] = v
        except Exception:  # noqa: BLE001
            continue
    return out


_SAFE_BUILTINS = {n: __builtins__[n] if isinstance(__builtins__, dict) else getattr(__builtins__, n)
                  for n in ("abs", "all", "any", "bool", "dict", "enumerate", "float", "int", "isinstance", "len", "list", "max",
                            "min", "range", "reversed", "round", "set", "sorted", "str", "sum", "tuple", "zip", "print", "map",
                            "filter", "True", "False", "None", "Exception", "ValueError")}


def _norm_words(t: str) -> list[str]:
    """Words for matching: "today—invest" and "Take-Two" are two words each."""
    import re
    return [w for w in (re.sub(r"[^a-z0-9%$]+", "", x.lower()) for x in re.split(r"[\s—–\-/]+", str(t))) if w]


class ScriptScene(V.Visual):
    def construct(self):
        self.t = 0.0
        self.total = max(1.0, num(SPEC.get("duration"), 6.0))
        self.sfx = []
        self.objs, self.on = {}, set()
        self.pieces, self.home, self.defs = {}, {}, {}
        self.warnings = []
        self.speed = 1.0
        self._n = 0
        self._pos = 0
        self.floor_rect = Rectangle(width=W * 3, height=6, fill_color=K.GROUND, fill_opacity=1, stroke_width=0).move_to([0, GROUND_Y - 3.0, 0])
        self.add(self.floor_rect)
        self.scenery = []  # the setting's layers: they stay through clear()
        frame = self.camera.frame
        if V.TALL:
            frame.set(width=W)
        rate = 0.02 / self.total
        frame.add_updater(lambda m, dt: m.scale(1 - rate * dt))
        words = [(str(w), float(t)) for w, t in (SPEC.get("words") or [])]
        self.word_norm = [(p, t) for w, t in words for p in (_norm_words(w) or [""])]
        ns = dict(_manim_names())
        ns.update(self.api())
        ns["__builtins__"] = _SAFE_BUILTINS
        err = ""
        try:
            exec(compile(str(SPEC.get("code") or ""), "<scene>", "exec"), ns)  # noqa: S102 — checked by script_check first
        except Exception as exc:  # noqa: BLE001
            line = ""
            for fr in traceback.extract_tb(exc.__traceback__):
                if fr.filename == "<scene>":
                    line = f"line {fr.lineno}: "
            err = f"{line}{type(exc).__name__}: {exc}"[:600]
        if self.total > self.t + 0.02:
            self.wait(self.total - self.t)
        if V.SFX_OUT:
            Path(V.SFX_OUT).write_text(json.dumps(self.sfx), encoding="utf-8")
        if ERR_OUT:
            Path(ERR_OUT).write_text(json.dumps({"error": err, "warnings": self.warnings[:12], "sounds": len(self.sfx)}),
                                     encoding="utf-8")

    def get_moving_and_static_mobjects(self, animations):
        """Manim lists every part an object has when an animation starts and draws that list on every frame — a
        character or a number whose parts are replaced while it animates was drawn twice (old and new). Only the
        outermost objects are listed here: their parts are read fresh for each frame (and drawn once, faster)."""
        moving, static = super().get_moving_and_static_mobjects(animations)
        inner = {id(part) for m in moving for part in m.get_family()[1:]}
        return [m for m in moving if id(m) not in inner], static

    def run(self, *anims, rt=0.7, rf=None):  # the library actions, faster while the code is running late
        return super().run(*anims, rt=max(0.2, rt * self.speed), rf=rf)

    # ------------------------------------------------------------ the scene code's tools
    def api(self) -> dict:
        S = self

        def at(words, offset=0.0):
            """Seconds when these words are spoken in this scene."""
            want = _norm_words(words)
            if not want or not S.word_norm:
                S.warnings.append(f'at("{words}"): no words')
                return S.t
            seq = [w for w, _ in S.word_norm]

            def find(start):
                for i in range(start, len(seq) - len(want) + 1):
                    if seq[i:i + len(want)] == want:
                        return i
                return -1
            i = find(S._pos)
            if i < 0:
                i = find(0)
            if i < 0 and len(want) > 1:  # the first words only
                for k in range(len(want) - 1, 0, -1):
                    want = want[:k]
                    i = find(S._pos)
                    if i >= 0:
                        break
                S.warnings.append(f'at("{words}"): these exact words are not in the narration')
            if i < 0:
                S.warnings.append(f'at("{words}"): not found in the narration')
                return S.t
            S._pos = i
            return max(0.0, S.word_norm[i][1] - 0.1 + num(offset))

        def wait_until(t):
            t = max(0.0, min(S.total - 0.05, num(t)))
            if t > S.t + 0.02:
                S.wait(t - S.t)
                S.t = t

        def when(words, offset=0.0):
            """Wait until these words are spoken. When the code is running late (too many actions before),
            the next actions play faster until it has caught up with the voice."""
            t = at(words, offset)
            late = S.t - t
            S.speed = 1.0 if late <= 0.3 else max(0.35, 1.0 - late / 3.0)
            wait_until(t)

        def wait(sec=0.5):
            wait_until(S.t + max(0.0, num(sec)))

        def now():
            return S.t

        def remaining():
            return max(0.0, S.total - S.t)

        def sfx(kind="pop", delay=0.0):
            """A sound effect now (or a little later)."""
            if kind in ("pop", "whoosh", "swoosh", "swoosh_down", "riser", "coin", "thud", "tick", "click", "ding", "crack",
                        "rumble", "zap", "marker"):
                S.snd(kind, num(delay))
            else:
                S.warnings.append(f'sfx("{kind}"): unknown sound')

        def play(*anims, run_time=1.0, rate_func=None, sound=None):
            """Any Manim animations, kept inside the scene's time."""
            if sound:
                sfx(sound)
            rt = max(0.1, min(num(run_time, 1.0) * S.speed, S.total - S.t - 0.05))
            if rt <= 0.1 or not anims:
                return 0
            kw = {"run_time": rt}
            if rate_func is not None:
                kw["rate_func"] = rate_func
            S.play(*anims, **kw)
            S.t += rt
            return rt

        def add(*mobs):
            S.add(*mobs)

        def remove(*mobs):
            S.remove(*mobs)

        def _reg(m, d):
            S._n += 1
            i = f"s{S._n}"
            S.objs[i] = m
            S.defs[i] = d
            S.home[i] = m.get_center().copy()
            m._ytg_id = i
            return m

        def _shown(m):
            for top in S.mobjects:
                if top is m or m in top.get_family():
                    return True
            return False

        def _id(m):
            return getattr(m, "_ytg_id", None) if m is not None else None

        def thing(name, x=0.0, y=None, h=None, w=None, color=None, **opts):
            """A drawn object from the library (or My Shapes / icons). Not shown until enter()/play()."""
            name = str(name)
            lib = K.resolve(name) or name
            size = num(w if (w is not None and lib in K.WIDE) else h, 0) or None
            d = {"obj": lib if lib in K.BUILDERS else name.lower().strip().replace(" ", "_"), "size": size or (3.0 if lib in K.WIDE else 2.0), "color": color}
            d.update({k: v for k, v in opts.items() if k in ("text", "count", "points", "values", "share", "flip")})
            m = make_obj(d)
            if m is None:
                S.warnings.append(f'thing("{name}"): cannot be drawn — a simple box is used')
                m = _M.RoundedRectangle(width=1.6, height=1.6, corner_radius=0.2, fill_color=K.SLATE, fill_opacity=1, stroke_width=0)
                if h:
                    m.scale_to_fit_height(num(h))
            if h is not None and num(h) > 0:  # h is the height, w the width — whatever the kind of thing
                m.scale_to_fit_height(num(h))
            elif w is not None and num(w) > 0:
                m.scale_to_fit_width(num(w))
            if m.width > W * 0.92:
                m.scale_to_fit_width(W * 0.92)
            if m.height > (YMAX - GROUND_Y):
                m.scale_to_fit_height(YMAX - GROUND_Y)
            yy = GROUND_Y + m.height / 2 if y is None else num(y)
            m.move_to([num(x), yy, 0])
            return _reg(m, d)

        def text(s, x=0.0, y=2.6, size=1.0, style="label", color=None):
            """Text: style "number" (big gold), "title" (serif) or "label" (bold small)."""
            d = {"obj": "text", "text": str(s), "style": style, "size": size, "color": color}
            m = text_mob(d).move_to([num(x), num(y), 0])
            return _reg(m, d)

        def do(action, m=None, **kw):
            b = dict(kw)
            if m is not None:
                if _id(m) is None:  # any Manim object made by the code can use the actions too
                    _reg(m, {"obj": "raw"})
                b["id"] = _id(m)
                if b["id"] and _shown(m):  # already shown by the code itself: no second pop-in
                    S.on.add(b["id"])
            for k in ("to", "from", "near"):
                v = b.get(k)
                if hasattr(v, "get_center"):
                    if _id(v) is None:
                        _reg(v, {"obj": "raw"})
                    if _shown(v):
                        S.on.add(_id(v))
                    b[k] = _id(v)
                elif isinstance(v, (list, tuple)):
                    b[k] = [num(v[0]), num(v[1])]
            if S.total - S.t < 0.3:  # the voice has ended: nothing more is drawn
                return 0
            fn = getattr(S, "a_" + action)
            used = fn(b) or 0.0
            S.t += used
            return used

        def enter(m, how="pop", dur=None):
            """Show a thing: pop, grow, draw, fade, build, left, right, top, bottom (with sound)."""
            return do("enter", m, how=how, **({"dur": dur} if dur else {}))

        def exit(m, how="fade"):  # noqa: A001
            return do("exit", m, how=how)

        def move(m, to, side=None, dur=1.0, arc=False):
            """Move to (x, y) or next to another thing (side: up/down/left/right)."""
            return do("move", m, to=to, side=side, dur=dur, arc=arc)

        def grow(m, k=1.5, axis=None, dur=1.2):
            """Scale by k (axis "y" = grow upward from its base, like a bar or a building)."""
            return do("scale", m, to=k, axis=axis, dur=dur)

        def split(m, rows=3, cols=5, color=None):
            return do("split", m, rows=rows, cols=cols, color=color)

        def give(m, to, label="", piece=None):
            return do("give", m, to=to, label=label, **({"piece": piece} if piece is not None else {}))

        def flow(a, b, item="coin", n=8, size=0.5, dur=1.6):
            """Items fly from a to b (coins by default)."""
            return do("flow", None, **{"from": a, "to": b}, item=item, n=n, size=size, dur=dur)

        def count(m, to, frm=0, prefix="", suffix="", decimals=0, dur=1.4):
            """A text made with text() counts up to a number (ticking sound)."""
            return do("count", m, **{"from": frm, "to": to}, prefix=prefix, suffix=suffix, decimals=decimals, dur=dur)

        def drop(m, dur=0.9):
            return do("drop", m, dur=dur)

        def topple(m, side="right"):
            return do("topple", m, side=side)

        def shake(m, dur=0.8):
            return do("shake", m, dur=dur)

        def pulse(m):
            return do("pulse", m)

        def recolor(m, color):
            return do("color", m, color=color)

        def swap(m, name=None, text=None):
            """Turn a thing into another thing (or a text into another text)."""
            if name is None and m is not None:  # a price tag (or any thing) keeps its kind, only its text changes
                kind = (S.defs.get(_id(m)) or {}).get("obj")
                name = kind if kind not in (None, "text", "raw") else None
            return do("swap", m, obj=name, text=text)

        def clone(m, n=8):
            return do("clone", m, n=n)

        def pile(item="coin", n=12, x=0.0, size=0.6, dur=1.6):
            """Items rain down into a heap on the floor (physics)."""
            return do("pile", None, item=item, n=n, pos=[num(x), 0], size=size, dur=dur)

        def label(m, s, side="up", size=1.0):
            return do("label", None, near=m, text=s, side=side, size=size)

        def badge(s, x=0.0, y=1.2, size=1.0, color=None):
            return do("badge", None, text=s, pos=[num(x), num(y)], size=size, color=color)

        def clear(dur=0.5):
            """Everything on stage leaves (swoosh) — a clean stage for the next idea."""
            ms = [m for m in S.mobjects if m is not S.floor_rect and not any(m is s for s in S.scenery)]
            if not ms:
                return 0
            S.snd("swoosh")
            used = play(*[_M.FadeOut(m) for m in ms], run_time=dur)
            for m in ms:
                S.remove(m)
            S.on.clear()
            return used

        def camera(zoom=1.3, to=(0, 0), dur=1.0):
            return do("camera", None, zoom=zoom, to=to, dur=dur)

        def no_floor():
            S.remove(S.floor_rect, *S.scenery[3:])

        # -------------------------------------------------------- characters
        def person(pose="standing", x=0.0, y=None, h=3.2, who="sam", mood=None, color=None, flip=False):
            """A character (feet on the floor unless y). Not shown until enter()."""
            name = P.pose_name(pose)
            if name is None:
                S.warnings.append(f'person(pose="{pose}"): unknown pose — standing is used')
                name = "standing"
            who_ = str(who).strip().lower()
            if who_ not in P.CAST:
                S.warnings.append(f'person(who="{who}"): unknown character — sam is used')
                who_ = "sam"
            _check_mood(mood)
            m = P.Person(who_, name, mood, color, flip, min(num(h, 3.2) or 3.2, YMAX - GROUND_Y))
            m.shift([num(x), GROUND_Y if y is None else num(y), 0])
            return _reg(m, {"obj": "raw"})

        def _check_mood(mood):
            if mood is not None and mood not in P.MOODS:
                S.warnings.append(f'mood "{mood}": unknown (use one of {", ".join(P.MOODS)})')

        def _is_person(m, tool):
            if isinstance(m, P.Person):
                return True
            S.warnings.append(f"{tool}(): the first value must be a person(...)")
            return False

        def _morph(m, to, mood, flip, dur):
            frm = m.pose_now
            flip = m.flip_now if flip is None else bool(flip)

            def step(mob, a):
                mob.show(P.between(frm, to, a), mood if a >= 0.5 else m.mood_now, flip)
            used = 0
            if _shown(m) and S.total - S.t > 0.3:
                used = play(UpdateFromAlphaFunc(m, step), run_time=dur, rate_func=rate_functions.ease_in_out_sine)
            m.show(to, mood, flip)
            m.pose_now, m.mood_now, m.flip_now = to, mood, flip
            return used

        def pose(m, name, mood=None, flip=None, dur=0.45, sound=True):
            """The character moves into another pose (with its sound)."""
            if not _is_person(m, "pose"):
                return 0
            new = P.pose_name(name)
            if new is None:
                S.warnings.append(f'pose("{name}"): unknown pose')
                return 0
            _check_mood(mood)
            if sound and _shown(m):
                sfx({"celebrating": "ding", "happy": "pop", "surprised": "pop", "worried": "swoosh_down", "sad": "swoosh_down",
                     "holding_money": "coin", "thinking": "click"}.get(new, "swoosh"))
            m.pose_label = new
            return _morph(m, P.POSES[new], mood, flip, dur)

        def mood(m, name, dur=0.25):
            """Only the face changes."""
            if not _is_person(m, "mood"):
                return 0
            _check_mood(name)
            sfx("click")
            return _morph(m, m.pose_now, name, None, dur)

        def run_to(m, to, dur=1.6, end="standing"):
            """The character runs to x (or to (x, y) / next to a thing), legs moving, then takes the pose `end`."""
            if not _is_person(m, "run"):
                return 0
            start = m.submobjects[0].get_center().copy()
            if hasattr(to, "get_center"):
                tx = to.get_center()[0] + (-1 if to.get_center()[0] > start[0] else 1) * (to.width / 2 + 0.8)
                goal = np.array([tx, start[1], 0.0])
            elif isinstance(to, (list, tuple)):
                goal = np.array([num(to[0]), num(to[1], start[1]), 0.0])
            else:
                goal = np.array([num(to), start[1], 0.0])
            if not _shown(m):
                S.add(m)
                S.on.add(m._ytg_id)
            flip = bool(goal[0] < start[0])
            length = max(0.4, min(num(dur, 1.6), S.total - S.t - 0.05))

            def step(mob, a):
                swing = (1 - math.cos(math.pi * a * length / 0.2)) / 2
                mob.shift(start + (goal - start) * a - mob.submobjects[0].get_center())
                mob.show(P.between(P.POSES["running"], P._RUN2, swing), None, flip)
            k = 0.0
            while k < length - 0.05:
                sfx("tick", k)
                k += 0.2
            used = play(UpdateFromAlphaFunc(m, step), run_time=length, rate_func=rate_functions.ease_in_out_sine)
            m.pose_now, m.mood_now, m.flip_now = P.POSES["running"], None, flip
            new = P.pose_name(end) or "standing"
            m.pose_label = new
            return used + _morph(m, P.POSES[new], None, False if new != "pointing" else flip, 0.25)

        # -------------------------------------------------------- settings and transitions
        def setting(name):
            """A background: plain, street, office, home, shop, bank or night (the camera sees it with depth)."""
            key = vis_sets.setting_name(name)
            if key is None:
                S.warnings.append(f'setting("{name}"): unknown — use one of {", ".join(vis_sets.SETTINGS)}')
                return
            S.remove(*S.scenery)
            back, far, near = vis_sets.build(key, GROUND_Y)
            marks = vis_sets.floor_details(key, GROUND_Y)
            S.floor_rect.set_fill(vis_sets.PALETTE[key][1])
            if config.pixel_height > config.pixel_width and S.floor_rect.height < 15:  # a Short: the ground reaches the bottom of the picture
                S.floor_rect.stretch_to_fit_height(16).move_to([0, GROUND_Y - 8.0, 0])
            for layer, follow, drift in ((far, 0.45, -0.22), (near, 0.2, -0.4)):
                state = {"t": 0.0, "off": np.zeros(3)}

                def move_layer(mob, dt, follow=follow, drift=drift, state=state):
                    state["t"] += dt
                    off = frame_.get_center() * follow + RIGHT * drift * min(1.0, state["t"] / S.total)
                    mob.shift(off - state["off"])
                    state["off"] = off
                frame_ = S.camera.frame
                layer.add_updater(move_layer)
            S.scenery = [back, far, near, marks]
            on_top = [m for m in S.mobjects if m is not S.floor_rect and not any(m is s for s in S.scenery)]
            floor = [S.floor_rect] if S.floor_rect in S.mobjects else []
            S.remove(*on_top, *floor)
            S.add(back, far, near, *floor, marks, *on_top)

        def transition(kind="whip", when="in"):
            """How the scene arrives ("in") or leaves ("out"): whip, zoom or slide. The picture is done by the app."""
            if vis_transitions.kind_name(kind) is None or when not in ("in", "out"):
                S.warnings.append(f'transition("{kind}", "{when}"): use whip, zoom or slide, and "in" or "out"')
                return
            at_time = 0.0 if when == "in" else max(0.0, S.total - vis_transitions.LENGTH - 0.05)
            S.snd("whoosh" if when == "in" else "swoosh", at_time - S.t)

        def color(name):
            return K.col(name, K.CREAM)

        def source(url, quote, highlight_words=None, until=None, hold=None):
            """The REAL web page as proof: it floats in, the camera zooms to the quoted sentence, the paragraph
            lifts toward the viewer and its words are marked as the narrator says them. Fills the screen, then
            leaves: at `until` words, `hold` seconds after the last mark, or 1.4 s after it."""
            import source_view
            url, quote = str(url), str(quote)
            left = S.total - S.t
            if left < 1.5:
                S.warnings.append("source(): called too close to the end of the scene — call it earlier")
                return 0
            data = next((d for d in SPEC.get("sources") or [] if d.get("url") == url and d.get("quote") == quote), None)
            if data is None:
                data = {"ok": False, "url": url, "domain": url.split("//")[-1].split("/")[0].replace("www.", ""),
                        "reason": "the page was not captured"}
            if not data.get("ok"):
                S.warnings.append(f"source({data.get('domain')}): {data.get('reason')} — a quote card is shown instead"
                                  + (". Check that the sentence is really on that page" if data.get("not_found") else ""))
            view = source_view.View(data, quote, config.pixel_width, config.pixel_height)
            if not view.choose(highlight_words):
                S.warnings.append("source(): highlight_words are not in the quote — the whole quote is marked")
            t0 = S.t
            said, found = source_view.sync_times(view.hl_words, S.word_norm, t0)
            if not found:
                S.warnings.append("source(): the narrator does not say the marked words here — they are marked at a steady pace")
            first = next((t for t in said if t is not None), None)
            intro = 2.4 if first is None else max(1.2, min(2.6, first - t0))
            intro = min(intro, max(0.8, left * 0.55))
            marks = [t - t0 for t in source_view.fill_times(said, t0 + intro, S.total - 0.1)]
            done = marks[-1] + 0.35
            if until is not None:
                end = at(until) - t0
            else:
                end = done + (max(0.0, num(hold, 1.4)) if hold is not None else 1.4)
            end = max(end, intro + 0.8)
            if left - end < (0.6 if until is not None else 1.2):
                end = left
            leaves = left - end > 0.05
            view.times(marks, intro, end, leaves)
            S.snd("whoosh", 0.02)
            if data.get("ok"):
                S.snd("swoosh", intro * 0.28)
            S.snd("pop", intro * 0.68)
            prev_t, prev_y = -9.0, -1e9
            for (_w, _x, y, _ww, h), t in zip(view.hl_words, marks):
                if t - prev_t > 0.45 or abs(y - prev_y) > h * 0.5:
                    S.snd("marker", t)
                    prev_t, prev_y = t, y
            if leaves:
                S.snd("swoosh_down", end - source_view.EXIT)
            frame = S.camera.frame
            img = _M.ImageMobject(view.frame(0.0))
            img.set_resampling_algorithm(_M.RESAMPLING_ALGORITHMS["linear"])
            img.scale_to_fit_height(frame.height).move_to(frame.get_center())

            def draw(mob, alpha):
                mob.pixel_array = view.frame(alpha * end)
                mob.orig_alpha_pixel_array = mob.pixel_array[..., 3].copy()
            S.play(UpdateFromAlphaFunc(img, draw), run_time=end, rate_func=rate_functions.linear)
            S.t += end
            if leaves:
                S.remove(img)
            return end

        tools = {
            "at": at, "when": when, "wait": wait, "wait_until": wait_until, "now": now, "remaining": remaining,
            "sfx": sfx, "play": play, "add": add, "remove": remove, "thing": thing, "text": text,
            "enter": enter, "exit": exit, "move": move, "grow": grow, "split": split, "give": give, "flow": flow,
            "count": count, "drop": drop, "topple": topple, "shake": shake, "pulse": pulse, "recolor": recolor,
            "swap": swap, "clone": clone, "pile": pile, "label": label, "badge": badge, "clear": clear, "camera": camera,
            "no_floor": no_floor, "color": color, "person": person, "pose": pose, "mood": mood, "run_to": run_to,
            "setting": setting, "transition": transition, "math": math, "random": random.Random(7), "np": np,
            "FLOOR": GROUND_Y, "TOP": YMAX - 0.4, "XMAX": XMAX, "YMIN": YMIN, "W": W, "H": H, "DURATION": S.total,
            "ORANGE": K.ORANGE, "TEAL": K.TEAL, "GOLD": K.GOLD, "CREAM": K.CREAM, "RED": K.RED, "GREEN": K.GREEN,
            "BLUE": K.BLUE, "PURPLE": K.PURPLE, "PINK": K.PINK, "SLATE": K.SLATE, "INK": K.INK, "BG": K.BG, "GREY": K.GREY,
            "BROWN": K.BROWN, "source": source, "SERIF": K.SERIF, "FONT": K.FONT, "rate": rate_functions, "FadeIn": FadeIn,
            "UP": UP, "DOWN": DOWN, "LEFT": LEFT, "RIGHT": RIGHT,
        }
        tools.update(vis_master.make(S, tools, str(SPEC.get("narration") or "")))  # compound(), revenue_split() ...
        return tools
