"""YT Guru — Visual Explainer scene (user, 2026-11-19).

ONE generic Manim scene that draws a JSON plan (YTG_SPEC) of illustrated objects and the
motions that explain the narration — the AI only writes the plan, never code:

  {"duration": 12.0,
   "objects": [{"id":"f","obj":"factory","x":0,"y":0,"size":3}, {"id":"n","obj":"text","text":"$78.7 trillion","style":"number","x":-4,"y":2.6}],
   "beats":   [{"at":0.4,"do":"enter","id":"f","how":"grow"}, {"at":3.1,"do":"split","id":"f","rows":3,"cols":6}, ...]}

Actions (do): enter, exit, move, scale, split, give, join, flow, count, label, title, badge, swap, drop, topple,
shake, pulse, color, connect, chart, pile, camera, clear.
Every motion is logged with its sound effect (pop, whoosh, coin, thud, tick, ding, riser, swoosh, crack, rumble,
zap) into YTG_SFX, and the app mixes those sounds under the voice.
"""
import json
import math
import os
import random
from pathlib import Path

from manim import (DOWN, LEFT, ORIGIN, RIGHT, UP, Arc, ArcBetweenPoints, BackgroundRectangle, Create, DashedLine, FadeIn, FadeOut,
                   GrowFromEdge, Group, ImageMobject, Indicate, LaggedStart, Line, MovingCameraScene, Rectangle, Rotate,
                   RoundedRectangle, SVGMobject, Text, Transform, ValueTracker, VGroup, Wiggle, always_redraw, config,
                   rate_functions)

HERE = Path(__file__).resolve().parent
import sys  # noqa: E402

sys.path.insert(0, str(HERE))
import vis_kit as K  # noqa: E402

SPEC = json.loads(Path(os.environ.get("YTG_SPEC", "spec.json")).read_text(encoding="utf-8"))
SFX_OUT = os.environ.get("YTG_SFX", "")
try:
    import manimpango
    for f in (HERE / "fonts").glob("*.ttf"):
        manimpango.register_font(str(f))
    _have = set(manimpango.list_fonts())
    if "Poppins" not in _have:
        K.FONT = "Sans"
    if "DM Serif Display" not in _have:
        K.SERIF = "Serif"
except Exception:  # noqa: BLE001
    pass

config.background_color = K.BG
W, H = config.frame_width, config.frame_height
TALL = H > W
if TALL:  # a Short: the same 16:9 stage, full width, in the middle of the tall picture
    H, W = H * 14.222 / W, 14.222
XMAX, YMIN, YMAX = W / 2 - 0.6, -H / 2 + 1.6, H / 2 - 0.5   # keep clear of the captions band
GROUND_Y = -H / 2 + 1.6   # the stage floor sits above the captions (user, 2026-11-20)
if TALL:
    YMIN = GROUND_Y = -2.4
    YMAX = 4.0


def num(v, d=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def text_mob(o):
    style = str(o.get("style") or "label")
    s = str(o.get("text") or "")[:60]
    color = K.col(o.get("color"), K.GOLD if style == "number" else K.CREAM)
    if style == "number":
        t = Text(s, font=K.SERIF, font_size=int(64 * num(o.get("size"), 1.0)), color=color)
    elif style == "title":
        t = Text(s, font=K.SERIF, font_size=int(56 * num(o.get("size"), 1.0)), color=color)
    else:
        t = Text(s, font=K.FONT, font_size=int(30 * num(o.get("size"), 1.0)), color=color, weight="BOLD")
    if t.width > W * 0.8:
        t.scale_to_fit_width(W * 0.8)
    return t


def image_mob(path, size):
    try:
        m = SVGMobject(path) if path.endswith(".svg") else ImageMobject(path)
        m.scale_to_fit_height(size)
        return m
    except Exception:  # noqa: BLE001
        return None


def make_obj(o):
    name = str(o.get("obj") or "")
    size = clamp(num(o.get("size"), 1.6), 0.3, 13.0)
    if name == "text":
        return text_mob(o)
    kw = {}
    if name in ("price_tag", "chip"):
        kw["text"] = str(o.get("text") or ("$50" if name == "price_tag" else "Word"))[:24]
    if name == "crowd":
        kw["n"] = int(clamp(num(o.get("count"), 8), 2, 16))
    if name == "skyline":
        kw["n"] = int(clamp(num(o.get("count"), 10), 3, 16))
    if name == "line_chart" and o.get("points"):
        kw["points"] = o["points"]
    if name == "bar_chart" and o.get("values"):
        kw["values"] = o["values"]
    if name == "pie" and o.get("share") is not None:
        kw["share"] = o["share"]
    m = None
    if name in K.BUILDERS:
        m = K.build(name, o.get("color"), **kw)
    elif isinstance(SPEC.get("shapes"), dict) and name in SPEC["shapes"]:
        m = K.recipe_mob(SPEC["shapes"][name], o.get("color"))
    elif isinstance(SPEC.get("icons"), dict) and SPEC["icons"].get(name):
        m = image_mob(SPEC["icons"][name], size)
    if m is None or (hasattr(m, "submobjects") and len(m.submobjects) == 0 and not isinstance(m, ImageMobject)):
        return None  # cannot be drawn: left out — never a word box (user, 2026-11-19)
    if name in K.WIDE:
        m.scale_to_fit_width(size)
        if m.height > H * 0.62:
            m.scale_to_fit_height(H * 0.62)
    else:
        m.scale_to_fit_height(size)
        if m.width > W * 0.8:
            m.scale_to_fit_width(W * 0.8)
    if o.get("flip"):
        m.flip()
    return m


class Visual(MovingCameraScene):
    def construct(self):
        self.t = 0.0
        self.total = max(1.0, num(SPEC.get("duration"), 6.0))
        self.sfx = []
        self.objs, self.on = {}, set()
        self.pieces = {}
        self.home = {}
        self.defs = {}
        if SPEC.get("ground", True):
            self.add(Rectangle(width=W * 3, height=3 if not TALL else 6, fill_color=K.GROUND, fill_opacity=1, stroke_width=0).move_to([0, GROUND_Y - (1.5 if not TALL else 3.0), 0]))
        frame = self.camera.frame
        if TALL:
            frame.set(width=W)
        rate = 0.025 / self.total
        frame.add_updater(lambda m, dt: m.scale(1 - rate * dt))
        for o in (SPEC.get("objects") or [])[:60]:
            if not isinstance(o, dict) or not o.get("id"):
                continue
            try:
                m = make_obj(o)
            except Exception:  # noqa: BLE001
                m = None
            if m is None:
                continue
            x = clamp(num(o.get("x")), -XMAX, XMAX)
            y = clamp(num(o.get("y")), YMIN + m.height / 2 - 0.05, YMAX - m.height / 2 + 0.05)
            m.move_to([x, y, 0])
            # always fully inside the picture
            if m.get_right()[0] > W / 2 - 0.25:
                m.shift(LEFT * (m.get_right()[0] - W / 2 + 0.25))
            if m.get_left()[0] < -W / 2 + 0.25:
                m.shift(RIGHT * (-W / 2 + 0.25 - m.get_left()[0]))
            if m.get_top()[1] > H / 2 - 0.2:
                m.shift(DOWN * (m.get_top()[1] - H / 2 + 0.2))
            self.objs[str(o["id"])] = m
            self.defs[str(o["id"])] = o
            self.home[str(o["id"])] = m.get_center().copy()
        beats = sorted([b for b in (SPEC.get("beats") or []) if isinstance(b, dict)], key=lambda b: num(b.get("at")))[:60]
        used = {str(b.get(k)) for b in beats for k in ("id", "from", "to", "near") if isinstance(b.get(k), str)}
        quiet = [self.objs[i] for i in self.objs if i not in used]  # never mentioned: on screen from the start
        if quiet:
            self.add(*quiet)
            self.on.update(i for i in self.objs if i not in used)
        for b in beats:
            at = clamp(num(b.get("at")), 0, self.total - 0.3)
            if at > self.t + 0.02:
                self.wait(at - self.t)
                self.t = at
            fn = getattr(self, "a_" + str(b.get("do") or ""), None)
            if fn is None:
                continue
            try:
                used = fn(b) or 0.0
            except Exception as exc:  # noqa: BLE001 — one bad beat never stops the scene
                print("beat failed:", b.get("do"), exc)
                used = 0.0
            self.t += used
        if self.total > self.t + 0.02:
            self.wait(self.total - self.t)
        if SFX_OUT:
            Path(SFX_OUT).write_text(json.dumps(self.sfx), encoding="utf-8")

    # ------------------------------------------------------------ helpers
    def snd(self, kind, dt=0.0):
        self.sfx.append({"t": round(self.t + dt, 3), "k": kind})

    def run(self, *anims, rt=0.7, rf=None):
        rt = max(0.25, min(rt, self.total - self.t - 0.05))  # an action near the end still finishes inside the scene
        kw = {"run_time": rt}
        if rf is not None:
            kw["rate_func"] = rf
        self.play(*anims, **kw)
        return rt

    def get(self, i):
        return self.objs.get(str(i)) if i is not None else None

    def ensure(self, i):
        m = self.get(i)
        if m is not None and str(i) not in self.on:
            self.snd("pop")
            self.play(FadeIn(m, scale=0.6), run_time=0.3)
            self.t += 0.3
            self.on.add(str(i))
        return m

    def point(self, b, key="to"):
        v = b.get(key)
        if isinstance(v, (list, tuple)) and len(v) >= 2:
            return [clamp(num(v[0]), -XMAX, XMAX), clamp(num(v[1]), YMIN, YMAX), 0]
        tgt = self.get(v)
        if tgt is not None:
            return tgt.get_center()
        return None

    # ------------------------------------------------------------ actions
    def a_enter(self, b):
        i = str(b.get("id"))
        m = self.get(i)
        if m is None or i in self.on:
            return 0
        how = str(b.get("how") or "pop")
        self.on.add(i)
        if how in ("left", "right", "top", "bottom"):
            d = {"left": LEFT, "right": RIGHT, "top": UP, "bottom": DOWN}[how]
            start = m.get_center() + d * (W if how in ("left", "right") else H)
            target = m.get_center().copy()
            m.move_to(start)
            self.add(m)
            self.snd("whoosh")
            return self.run(m.animate.move_to(target), rt=num(b.get("dur"), 1.0), rf=rate_functions.ease_out_cubic)
        if how == "grow":
            self.snd("riser" if m.height > 2 else "pop")
            if isinstance(m, VGroup) and len(m) > 3 and str(b.get("stagger")) != "false":
                return self.run(LaggedStart(*[GrowFromEdge(x, DOWN) for x in m], lag_ratio=0.08), rt=num(b.get("dur"), 1.2))
            return self.run(GrowFromEdge(m, DOWN), rt=num(b.get("dur"), 0.8))
        if how == "draw":
            self.snd("riser")
            line = getattr(m, "line", None)
            if line is not None:
                self.add(m[0])
                return self.run(Create(line), rt=num(b.get("dur"), 1.6), rf=rate_functions.ease_in_out_sine)
            return self.run(Create(m), rt=num(b.get("dur"), 1.2))
        if how == "fade":
            self.snd("swoosh")
            return self.run(FadeIn(m), rt=num(b.get("dur"), 0.6))
        if how == "build" and isinstance(m, VGroup) and len(m) > 1:
            self.snd("pop")
            for k in range(1, min(6, len(m))):
                self.snd("tick", 0.12 * k)
            return self.run(LaggedStart(*[FadeIn(x, shift=UP * 0.2) for x in m], lag_ratio=0.15), rt=num(b.get("dur"), 1.0))
        self.snd("pop")
        return self.run(FadeIn(m, scale=0.4), rt=num(b.get("dur"), 0.5), rf=rate_functions.ease_out_back)

    def a_exit(self, b):
        i = str(b.get("id"))
        m = self.get(i)
        if m is None or i not in self.on:
            return 0
        self.on.discard(i)
        how = str(b.get("how") or "fade")
        self.snd("whoosh" if how != "fade" else "swoosh")
        if how in ("left", "right", "top", "bottom", "down", "up"):
            d = {"left": LEFT, "right": RIGHT, "top": UP, "up": UP, "bottom": DOWN, "down": DOWN}[how]
            used = self.run(m.animate.shift(d * W), rt=0.7, rf=rate_functions.ease_in_cubic)
        elif how == "shrink":
            used = self.run(m.animate.scale(0.01), rt=0.5)
        else:
            used = self.run(FadeOut(m), rt=0.5)
        self.remove(m)
        return used

    def a_clear(self, b):
        ms = [self.objs[i] for i in list(self.on)]
        extra, seen = [], set()
        for top in self.mobjects:  # also inside the groups Manim makes while animating many things at once
            for x in (top.get_family() if hasattr(top, "get_family") else [top]):
                if getattr(x, "_vis_extra", False) and id(x) not in seen:
                    seen.add(id(x))
                    extra.append(x)
        if not ms and not extra:
            return 0
        self.on.clear()
        self.snd("swoosh")
        used = self.run(*[FadeOut(x) for x in ms + extra], rt=0.5)
        for x in ms + extra:
            self.remove(x)
        return used

    def a_move(self, b):
        m = self.ensure(b.get("id"))
        p = self.point(b)
        if m is None or p is None:
            return 0
        if isinstance(b.get("to"), str) and self.get(b["to"]) is not None:
            tgt = self.get(b["to"])
            side = {"left": LEFT, "right": RIGHT, "down": DOWN}.get(str(b.get("side") or ""), UP)
            p = tgt.get_center() + side * (tgt.height / 2 + m.height / 2 + 0.1) if side is UP or side is DOWN else tgt.get_center() + side * (tgt.width / 2 + m.width / 2 + 0.1)
        self.snd("whoosh")
        dur = num(b.get("dur"), 1.0)
        tiles = self.pieces.get(str(b.get("id")))
        if tiles is not None and len(tiles):
            grp = VGroup(m, tiles)
            return self.run(grp.animate.shift(p - m.get_center()), rt=dur, rf=rate_functions.ease_in_out_cubic)
        if b.get("arc"):
            from manim import MoveAlongPath
            path = ArcBetweenPoints(m.get_center(), p, angle=-1.0)
            return self.run(MoveAlongPath(m, path), rt=dur, rf=rate_functions.ease_in_out_sine)
        return self.run(m.animate.move_to(p), rt=dur, rf=rate_functions.ease_in_out_cubic if dur < 1.5 else rate_functions.linear)

    def a_scale(self, b):
        m = self.ensure(b.get("id"))
        if m is None:
            return 0
        k = clamp(num(b.get("to"), 1.5), 0.05, 6.0)
        axis = str(b.get("axis") or "")
        self.snd("riser" if k > 1 else "swoosh_down")
        dur = num(b.get("dur"), 1.2)
        if axis in ("y", "x"):
            dim = 1 if axis == "y" else 0
            parts = list(m) if (isinstance(m, VGroup) and len(m) > 2 and str(b.get("id")) and K_is_row(m)) else [m]
            return self.run(*[x.animate.stretch(k, dim, about_edge=DOWN if dim else LEFT) for x in parts], rt=dur,
                            rf=rate_functions.ease_in_out_cubic)
        tiles = self.pieces.get(str(b.get("id")))
        if tiles is not None and len(tiles):
            c = m.get_center()
            return self.run(VGroup(m, tiles).animate.scale(k, about_point=c), rt=dur, rf=rate_functions.ease_in_out_cubic)
        return self.run(m.animate.scale(k), rt=dur, rf=rate_functions.ease_in_out_cubic)

    def a_split(self, b):
        i = str(b.get("id"))
        m = self.ensure(i)
        if m is None:
            return 0
        rows = int(clamp(num(b.get("rows"), 3), 1, 8))
        cols = int(clamp(num(b.get("cols"), 5), 1, 12))
        area = getattr(m, "body", None) or m
        w, h = area.width / cols, area.height / rows
        tiles = VGroup()
        for r in range(rows):
            for c in range(cols):
                sq = Rectangle(width=w * 0.94, height=h * 0.94, fill_color=K.col(b.get("color"), K.ORANGE), fill_opacity=0.9,
                               stroke_color=K.CREAM, stroke_width=2)
                sq.move_to(area.get_corner(UP + LEFT) + RIGHT * w * (c + 0.5) + DOWN * h * (r + 0.5))
                tiles.add(sq)
        tiles._vis_extra = True
        self.pieces[i] = tiles
        self.snd("crack")
        return self.run(LaggedStart(*[FadeIn(t, scale=0.7) for t in tiles], lag_ratio=0.03), rt=0.7)

    def a_give(self, b):
        i = str(b.get("id"))
        tiles = self.pieces.get(i)
        if tiles is None:
            self.a_split({"id": i})
            self.t += 0.7
            tiles = self.pieces.get(i)
        if not tiles or len(tiles) == 0:
            return 0
        tgt = self.ensure(b.get("to"))
        k = int(clamp(num(b.get("piece"), len(tiles) // 2), 0, len(tiles) - 1))
        piece = tiles[k]
        tiles.remove(piece)
        piece._vis_extra = True
        self.add(piece)
        dest = tgt.get_top() + UP * 0.45 if tgt is not None else self.point(b) or [3, 1, 0]
        self.snd("whoosh")
        used = self.run(piece.animate.scale(1.5).move_to(dest).set_fill(K.GOLD, 1), rt=1.0, rf=rate_functions.ease_in_out_back)
        if b.get("label"):
            lab = inside(Text(str(b["label"])[:30], font=K.SERIF, font_size=40, color=K.GOLD).next_to(piece, UP, buff=0.15))
            lab._vis_extra = True
            self.snd("pop")
            used += self.run(FadeIn(lab, shift=UP * 0.1), rt=0.4)
        return used

    def a_join(self, b):
        i = str(b.get("id"))
        tiles = self.pieces.pop(i, None)
        if not tiles:
            return 0
        m = self.get(i)
        self.snd("whoosh")
        used = self.run(*[t.animate.move_to(m.get_center()).scale(0.2).set_opacity(0) for t in tiles], rt=0.8)
        self.remove(tiles)
        if m is not None:
            self.snd("pop")
            used += self.run(Indicate(m, scale_factor=1.08, color=None), rt=0.5)
        return used

    def a_flow(self, b):
        src, dst = self.ensure(b.get("from")), self.ensure(b.get("to"))
        a = src.get_center() if src is not None else self.point(b, "from")
        z = dst.get_center() if dst is not None else self.point(b, "to")
        if a is None or z is None:
            return 0
        n = int(clamp(num(b.get("n"), 6), 1, 20))
        item = str(b.get("item") or "coin")
        size = clamp(num(b.get("size"), 0.45), 0.15, 1.5)
        items = []
        for k in range(n):
            o = make_obj({"obj": item, "size": size}) or make_obj({"obj": "coin", "size": size})
            o.move_to(a + [random.uniform(-0.3, 0.3), random.uniform(-0.2, 0.2), 0])
            items.append(o)
        dur = num(b.get("dur"), 1.6)
        lag = 0.6 / max(1, n)
        anims = [o.animate(rate_func=rate_functions.ease_in_out_sine).move_to(z + [random.uniform(-0.2, 0.2), 0, 0]).set_opacity(0.0 if b.get("vanish", True) else 1.0)
                 for o in items]
        for k in range(n):
            self.snd("coin" if item == "coin" else "pop", dur * (0.4 + 0.6 * k / max(1, n)))
        for o in items:
            self.add(o)
        used = self.run(LaggedStart(*anims, lag_ratio=lag), rt=dur)
        if b.get("vanish", True):
            for o in items:
                self.remove(o)
        else:
            for o in items:
                o._vis_extra = True
        return used

    def a_count(self, b):
        m = self.get(b.get("id"))
        a0, a1 = num(b.get("from")), num(b.get("to"), 100)
        dec = int(clamp(num(b.get("decimals"), 0 if float(a1).is_integer() and float(a0).is_integer() else 1), 0, 3))
        pre, suf = str(b.get("prefix") or ""), str(b.get("suffix") or "")
        if suf[:1].isalpha():
            suf = " " + suf
        if pre[-1:].isalpha():
            pre = pre + " "
        tr = ValueTracker(a0)
        d = self.defs.get(str(b.get("id"))) or {}
        size = int(64 * num(d.get("size"), 1.0)) if d.get("style", "number") in ("number", "title") else int(40 * num(d.get("size"), 1.0))
        pos = m.get_center() if m is not None else (self.point(b, "pos") or [0, 1.5, 0])
        color = K.col(d.get("color"), K.GOLD if d.get("style", "number") == "number" else K.CREAM)

        def make():
            v = tr.get_value()
            s = f"{pre}{v:,.{dec}f}{suf}"
            return Text(s, font=K.SERIF, font_size=size, color=color).move_to(pos)
        if m is not None and str(b.get("id")) in self.on:
            self.remove(m)
            self.on.discard(str(b.get("id")))
        live = always_redraw(make)
        live._vis_extra = True
        self.add(live)
        dur = num(b.get("dur"), 1.4)
        for k in range(int(dur / 0.12)):
            self.snd("tick", k * 0.12)
        used = self.run(tr.animate.set_value(a1), rt=dur, rf=rate_functions.ease_out_cubic)
        final = make()
        final._vis_extra = True
        self.remove(live)
        self.add(final)
        if m is not None:
            self.objs[str(b.get("id"))] = final
            self.on.add(str(b.get("id")))
        return used

    def a_label(self, b):
        near = self.get(b.get("near"))
        t = Text(str(b.get("text") or "")[:40], font=K.FONT, font_size=int(28 * num(b.get("size"), 1.0)), color=K.col(b.get("color"), K.CREAM), weight="BOLD")
        pill = RoundedRectangle(width=t.width + 0.35, height=t.height + 0.22, corner_radius=0.1, fill_color=K.INK, fill_opacity=0.75, stroke_width=0)
        g = VGroup(pill, t)
        t.move_to(pill)
        if near is not None:
            side = {"left": LEFT, "right": RIGHT, "down": DOWN}.get(str(b.get("side") or ""), UP)
            g.next_to(near, side, buff=0.15)
        else:
            g.move_to(self.point(b, "pos") or [0, 2.6, 0])
        inside(g)
        g._vis_extra = True
        self.snd("pop")
        return self.run(FadeIn(g, shift=UP * 0.1), rt=0.4)

    def a_title(self, b):
        t = Text(str(b.get("text") or "")[:40], font=K.SERIF, font_size=int(64 * num(b.get("size"), 1.0)), color=K.col(b.get("color"), K.GOLD))
        if t.width > W * 0.85:
            t.scale_to_fit_width(W * 0.85)
        t.move_to(self.point(b, "pos") or [0, YMAX - 0.4, 0])
        inside(t)
        t._vis_extra = True
        self.snd("swoosh")
        return self.run(FadeIn(t, shift=DOWN * 0.2), rt=0.6)

    def a_badge(self, b):
        bt = Text(str(b.get("text") or "")[:20], font=K.SERIF, font_size=int(96 * num(b.get("size"), 1.0)), color=K.col(b.get("color"), K.GOLD))
        if bt.width > W * 0.7:
            bt.scale_to_fit_width(W * 0.7)
        box = RoundedRectangle(width=bt.width + 0.8, height=bt.height + 0.5, corner_radius=0.2, fill_color=K.BG, fill_opacity=0.92,
                               stroke_color=K.col(b.get("color"), K.GOLD), stroke_width=3)
        g = VGroup(box, bt)
        bt.move_to(box)
        g.move_to(self.point(b, "pos") or [0, 1.2, 0])
        inside(g)
        g._vis_extra = True
        self.snd("ding")
        return self.run(FadeIn(g, scale=1.6), rt=0.6, rf=rate_functions.ease_out_back)

    def a_swap(self, b):
        i = str(b.get("id"))
        m = self.ensure(i)
        if m is None:
            return 0
        d = self.defs.get(i) or {}
        if (b.get("obj") in (None, "", "text")) and d.get("obj") == "text":
            n = text_mob({**d, "text": b.get("text") or d.get("text")}).move_to(m)
        else:
            new_name = K.resolve(str(b.get("obj") or "")) or str(b.get("obj") or "")
            old_name = str(d.get("obj") or "")
            same = new_name == (K.resolve(old_name) or old_name)  # the same kind of thing keeps its colour (a red price tag stays red)
            n = make_obj({"obj": b.get("obj") or "", "size": max(m.width if new_name in K.WIDE else m.height, 0.5),
                          "color": b.get("color") or (d.get("color") if same else None), "text": b.get("text")})
            if n is None:
                return 0
            n.move_to(m)
        self.snd("pop")
        used = self.run(Transform(m, n), rt=0.6)
        return used

    def a_drop(self, b):
        i = str(b.get("id"))
        m = self.get(i)
        if m is None:
            return 0
        target = m.get_center().copy()
        if i not in self.on:
            m.move_to(target + UP * (H / 2 + 2))
            self.add(m)
            self.on.add(i)
        dur = num(b.get("dur"), 0.9)
        self.snd("whoosh")
        self.snd("thud", dur * 0.55)
        return self.run(m.animate.move_to(target), rt=dur, rf=rate_functions.ease_out_bounce)

    def a_topple(self, b):
        m = self.ensure(b.get("id"))
        if m is None:
            return 0
        side = -1 if str(b.get("side") or "right") == "right" else 1
        pivot = m.get_corner(DOWN + (RIGHT if side < 0 else LEFT))
        self.snd("thud", 0.6)
        return self.run(Rotate(m, angle=side * math.pi / 2, about_point=pivot), rt=0.8, rf=rate_functions.ease_in_quad)

    def a_shake(self, b):
        m = self.ensure(b.get("id"))
        if m is None:
            return 0
        self.snd("rumble")
        return self.run(Wiggle(m, scale_value=1.05, rotation_angle=0.06 * math.pi), rt=num(b.get("dur"), 0.8))

    def a_clone(self, b):
        """One becomes many: copies spring out of the thing into a neat grid around it."""
        m = self.ensure(b.get("id"))
        if m is None:
            return 0
        n = int(clamp(num(b.get("n"), 8), 2, 24))
        cols = min(8, n)
        rows = math.ceil(n / cols)
        w, h = m.width, m.height
        sc = min(1.0, (W * 0.8) / (cols * w * 1.15), (H * 0.42) / (rows * h * 1.15))
        copies = []
        cx, cy = 0.0, clamp(GROUND_Y + rows * h * sc * 1.15 / 2 + 0.1, YMIN, YMAX - 0.5)
        for k in range(n):
            r, c = divmod(k, cols)
            target = [cx + (c - (cols - 1) / 2) * w * sc * 1.15, cy + ((rows - 1) / 2 - r) * h * sc * 1.15, 0]
            cp = m.copy()
            cp._vis_extra = True
            copies.append((cp, target))
        for cp, _ in copies:
            self.add(cp)
        for k in range(min(n, 12)):
            self.snd("pop", 0.08 * k)
        anims = [cp.animate.scale(sc).move_to(t) for cp, t in copies]
        self.remove(m)
        self.on.discard(str(b.get("id")))
        return self.run(LaggedStart(*anims, lag_ratio=0.08), rt=num(b.get("dur"), 1.4), rf=rate_functions.ease_out_back)

    def a_pulse(self, b):
        m = self.ensure(b.get("id"))
        if m is None:
            return 0
        self.snd("tick")
        return self.run(Indicate(m, scale_factor=1.15, color=None), rt=0.6)

    def a_color(self, b):
        m = self.ensure(b.get("id"))
        if m is None:
            return 0
        self.snd("click")
        return self.run(m.animate.set_fill(K.col(b.get("color"), K.RED)), rt=0.5)

    def a_connect(self, b):
        a, z = self.ensure(b.get("from")), self.ensure(b.get("to"))
        if a is None or z is None:
            return 0
        ln = (DashedLine if b.get("dashed") else Line)(a.get_center(), z.get_center(), color=K.col(b.get("color"), K.GOLD), stroke_width=4)
        ln._vis_extra = True
        self.add_foreground_mobjects()
        self.snd("zap")
        used = self.run(Create(ln), rt=0.6)
        self.bring_to_back(ln)
        return used

    def a_chart(self, b):
        i = str(b.get("id"))
        m = self.get(i)
        if m is None:
            return 0
        if i not in self.on:
            return self.a_enter({"id": i, "how": "draw", "dur": b.get("dur", 1.8)})
        self.snd("riser")
        return self.run(Indicate(m, scale_factor=1.05, color=None), rt=0.6)

    def a_pile(self, b):
        n = int(clamp(num(b.get("n"), 10), 2, 30))
        item = str(b.get("item") or "coin")
        size = clamp(num(b.get("size"), 0.5), 0.2, 1.5)
        x0 = clamp(num((b.get("pos") or [0, 0])[0] if isinstance(b.get("pos"), list) else 0), -XMAX, XMAX)
        floor = GROUND_Y + 0.02
        objs = [make_obj({"obj": item, "size": size}) or make_obj({"obj": "coin", "size": size}) for _ in range(n)]
        # a pile, settled with a small physics model (pymunk when installed, else stacking)
        spots = []
        try:
            import pymunk
            space = pymunk.Space()
            space.gravity = (0, -9.8)
            ground = pymunk.Segment(space.static_body, (-20, floor), (20, floor), 0.05)
            ground.friction = 1.0
            space.add(ground)
            space.damping = 0.6
            # a heap, not things rolling away: low invisible walls keep it together (user, 2026-11-20)
            half = max(1.2, math.sqrt(n) * max(objs[0].width, objs[0].height) * 0.75)
            for wx in (x0 - half, x0 + half):
                wall = pymunk.Segment(space.static_body, (wx, floor), (wx, floor + 20), 0.05)
                wall.friction = 1.0
                space.add(wall)
            bodies = []
            for k, o in enumerate(objs):
                ww, hh = o.width * 0.96, o.height * 0.96
                body = pymunk.Body(1, pymunk.moment_for_box(1, (ww, hh)))
                body.position = (x0 + random.uniform(-half * 0.7, half * 0.7), floor + 2 + k * (hh + 0.1))
                body.angle = random.uniform(-0.35, 0.35)
                shp = pymunk.Poly.create_box(body, (ww, hh), 0.02)
                shp.friction = 0.9
                space.add(body, shp)
                bodies.append(body)
            for _ in range(1200):
                space.step(1 / 120)
            spots = [(bd.position.x, bd.position.y, bd.angle) for bd in bodies]
        except Exception:  # noqa: BLE001
            per = max(1, int(math.sqrt(n * 2)))
            for k in range(n):
                row, c = divmod(k, per)
                spots.append((x0 + (c - per / 2) * size * 0.95 + (row % 2) * size * 0.45, floor + size / 2 + row * size * 0.8, 0))
        anims = []
        for o, (x, y, ang) in zip(objs, spots):
            o.rotate(ang)
            o.move_to([clamp(x, -XMAX, XMAX), y + H, 0])
            o._vis_extra = True
            self.add(o)
            anims.append(o.animate(rate_func=rate_functions.ease_out_bounce).move_to([clamp(x, -XMAX, XMAX), max(floor + o.height / 2 - 0.05, y), 0]))
        dur = num(b.get("dur"), 1.6)
        for k in range(min(n, 10)):
            self.snd("coin" if item == "coin" else "thud", 0.5 + k * dur / max(1, n) * 0.8)
        return self.run(LaggedStart(*anims, lag_ratio=0.08), rt=dur)

    def a_camera(self, b):
        frame = self.camera.frame
        z = clamp(num(b.get("zoom"), 1.4), 0.5, 3.0)
        p = self.point(b, "to") or frame.get_center()
        self.snd("swoosh")
        return self.run(frame.animate.scale(1 / z).move_to(p), rt=num(b.get("dur"), 1.0), rf=rate_functions.ease_in_out_cubic)


def inside(m):
    """Keep a label / badge / title fully in the picture."""
    if m.get_right()[0] > W / 2 - 0.2:
        m.shift(LEFT * (m.get_right()[0] - W / 2 + 0.2))
    if m.get_left()[0] < -W / 2 + 0.2:
        m.shift(RIGHT * (-W / 2 + 0.2 - m.get_left()[0]))
    if m.get_top()[1] > H / 2 - 0.15:
        m.shift(DOWN * (m.get_top()[1] - H / 2 + 0.15))
    if m.get_bottom()[1] < YMIN - 0.3:
        m.shift(UP * (YMIN - 0.3 - m.get_bottom()[1]))
    return m


def K_is_row(m):
    """A row of separate things (skyline, crowd) is stretched piece by piece."""
    try:
        ys = [round(x.get_bottom()[1], 2) for x in m]
        return len(set(ys)) <= 2 and len(m) >= 3
    except Exception:  # noqa: BLE001
        return False


_unused = (Arc, BackgroundRectangle, ORIGIN, Group)
