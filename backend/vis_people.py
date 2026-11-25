"""YT Guru — the Visual Explainer's characters: an original flat cast drawn in code.

person(pose="worried", who="maya") in scene code. Every picture is made here from simple filled shapes
(no outside artwork, so no licence conditions), in the app's flat style, and a pose is only numbers —
so a character moves smoothly from one pose into the next.

Coordinates are in "body units": feet at (0, 0), the whole figure about 1.0 tall.
"""
from __future__ import annotations

import math

from manim import Annulus, Circle, Line, Polygon, RoundedRectangle, Text, VGroup

import vis_kit as K

SKINS = {"light": ("#f4c9a0", "#e2ab80"), "tan": ("#dda072", "#c4865a"), "brown": ("#a8704a", "#8f5b39"), "dark": ("#7a4e34", "#63402b")}
CAST = {
    "sam": dict(skin="light", hair="short", hair_color="#3b2a23", shirt=K.TEAL, pants="#33425c"),
    "maya": dict(skin="tan", hair="long", hair_color="#241a17", shirt=K.ORANGE, pants="#3d3552"),
    "leo": dict(skin="dark", hair="curly", hair_color="#1a1412", shirt=K.BLUE, pants="#2f3a4d"),
    "nina": dict(skin="light", hair="bun", hair_color="#a5522a", shirt=K.PURPLE, pants="#31405a"),
    "omar": dict(skin="brown", hair="parted", hair_color="#1d1512", shirt=K.GREEN, pants="#34445a", beard=True),
    "grandpa": dict(skin="light", hair="bald", hair_color="#c9ced6", shirt="#6f8f72", pants="#4a4f63", glasses=True),
    "boss": dict(skin="tan", hair="parted", hair_color="#4a4f5c", shirt="#4b5873", pants="#252d40", tie=K.RED, glasses=True),
}
SHOE = "#1d2430"
LIMB = 0.043  # arm / leg thickness (radius)

# pose -> arms (elbow, hand) and legs (knee, foot) for the left (L) and right (R) of the picture, where the
# body is lifted / leans, the head moves, the usual face, and what comes with it
_STAND = dict(le=(-0.19, 0.46), lh=(-0.205, 0.33), re=(0.19, 0.46), rh=(0.205, 0.33),
              lk=(-0.075, 0.18), lf=(-0.085, 0.025), rk=(0.075, 0.18), rf=(0.085, 0.025))


def _p(mood="happy", prop="", lift=0.0, lean=0.0, head=(0.0, 0.0), **limbs):
    return {**_STAND, **limbs, "mood": mood, "prop": prop, "lift": lift, "lean": lean, "hx": head[0], "hy": head[1]}


POSES = {
    "standing": _p("neutral"),
    "happy": _p("happy", le=(-0.25, 0.49), lh=(-0.31, 0.39), re=(0.25, 0.49), rh=(0.31, 0.39)),
    "worried": _p("worried", "sweat", le=(-0.26, 0.47), lh=(-0.17, 0.66), re=(0.26, 0.47), rh=(0.17, 0.66), head=(0, -0.012)),
    "sad": _p("sad", le=(-0.155, 0.44), lh=(-0.11, 0.31), re=(0.155, 0.44), rh=(0.11, 0.31), head=(0, -0.045)),
    "thinking": _p("thinking", "question", le=(-0.17, 0.45), lh=(0.09, 0.46), re=(0.23, 0.47), rh=(0.065, 0.625), head=(0.015, 0)),
    "pointing": _p("happy", "finger", re=(0.31, 0.57), rh=(0.45, 0.65), le=(-0.21, 0.46), lh=(-0.155, 0.36)),
    "celebrating": _p("joy", "confetti", lift=0.07, le=(-0.29, 0.69), lh=(-0.34, 0.9), re=(0.29, 0.69), rh=(0.34, 0.9),
                      lk=(-0.15, 0.20), lf=(-0.14, 0.055), rk=(0.15, 0.20), rf=(0.14, 0.055)),
    "running": _p("determined", "speed", lift=0.03, lean=0.075, le=(-0.19, 0.50), lh=(-0.28, 0.38), re=(0.23, 0.46), rh=(0.28, 0.61),
                  lk=(-0.17, 0.19), lf=(-0.33, 0.17), rk=(0.20, 0.24), rf=(0.24, 0.05)),
    "shrug": _p("confused", le=(-0.26, 0.45), lh=(-0.36, 0.57), re=(0.26, 0.45), rh=(0.36, 0.57), head=(0.012, -0.008)),
    "surprised": _p("surprised", le=(-0.27, 0.50), lh=(-0.30, 0.68), re=(0.27, 0.50), rh=(0.30, 0.68)),
    "holding_money": _p("happy", "money", re=(0.25, 0.44), rh=(0.30, 0.57)),
    "holding_phone": _p("neutral", "phone", re=(0.22, 0.43), rh=(0.13, 0.55), le=(-0.19, 0.45), lh=(-0.19, 0.33)),
}
# the second step of a run (the legs and arms change over)
_RUN2 = _p("determined", "speed", lift=0.065, lean=0.075, le=(-0.12, 0.45), lh=(0.01, 0.50), re=(0.12, 0.50), rh=(0.02, 0.40),
           lk=(0.12, 0.25), lf=(0.03, 0.13), rk=(-0.02, 0.17), rf=(-0.14, 0.06))
ALIASES = {"stand": "standing", "neutral": "standing", "idle": "standing", "worry": "worried", "stressed": "worried",
           "think": "thinking", "point": "pointing", "celebrate": "celebrating", "cheer": "celebrating", "cheering": "celebrating",
           "run": "running", "shrugging": "shrug", "confused": "shrug", "shocked": "surprised", "money": "holding_money",
           "phone": "holding_phone", "holding money": "holding_money", "holding phone": "holding_phone", "unhappy": "sad"}
MOODS = ("neutral", "happy", "joy", "worried", "sad", "thinking", "surprised", "angry", "determined", "confused")


def pose_name(name) -> str | None:
    n = str(name or "").strip().lower().replace("-", "_")
    n = ALIASES.get(n, n)
    n = ALIASES.get(n.replace("_", " "), n).replace(" ", "_")
    return n if n in POSES else None


# ------------------------------------------------------------------ shapes
def _v(p):
    return [p[0], p[1], 0]


def _dot(p, r, c):
    return Circle(radius=r, fill_color=c, fill_opacity=1, stroke_width=0).move_to(_v(p))


def _poly(pts, c):
    return Polygon(*[_v(p) for p in pts], fill_color=c, fill_opacity=1, stroke_width=0)


def _chain(points, radii, color, joints=True):
    """A thick rounded line through the points (filled shapes, so it grows and shrinks with the figure)."""
    radii = radii if isinstance(radii, (list, tuple)) else [radii] * len(points)
    g = VGroup()
    for (a, ra), (b, rb) in zip(zip(points, radii), zip(points[1:], radii[1:])):
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1e-6
        ux, uy = -dy / n, dx / n
        g.add(_poly([(a[0] + ux * ra, a[1] + uy * ra), (b[0] + ux * rb, b[1] + uy * rb),
                     (b[0] - ux * rb, b[1] - uy * rb), (a[0] - ux * ra, a[1] - uy * ra)], color))
    if joints:
        g.add(*[_dot(p, r, color) for p, r in zip(points, radii)])
    return g


def _arc(cx, cy, rx, ry, a0, a1, n=7):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * k / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * k / n)))
            for k in range(n + 1)]


def _face(mood: str, cx: float, cy: float, look_down: bool) -> VGroup:
    ink, g = "#2a1d18", VGroup()
    ey = cy - 0.002 - (0.012 if look_down else 0)
    for s in (-1, 1):
        ex = cx + s * 0.062
        if mood == "joy":
            g.add(_chain(_arc(ex, ey - 0.012, 0.026, 0.027, 20, 160), 0.008, ink))
        elif mood == "surprised":
            g.add(_dot((ex, ey), 0.027, "#ffffff"), _dot((ex, ey), 0.015, ink))
        else:
            g.add(_dot((ex + (0.008 if mood == "thinking" else 0), ey + (0.006 if mood == "thinking" else 0)), 0.019, ink))
        # eyebrows: (inner end height, outer end height)
        inner, outer = {"worried": (0.064, 0.040), "sad": (0.060, 0.036), "angry": (0.032, 0.062), "determined": (0.036, 0.058),
                        "surprised": (0.074, 0.074), "thinking": (0.050, 0.050) if s < 0 else (0.070, 0.068),
                        "confused": (0.045, 0.045) if s < 0 else (0.068, 0.064)}.get(mood, (0.050, 0.048))
        g.add(_chain([(cx + s * 0.034, ey + inner), (cx + s * 0.092, ey + outer)], 0.0075, ink))
    my = cy - 0.072
    if mood == "happy":
        g.add(_chain(_arc(cx, my + 0.028, 0.052, 0.040, 215, 325), 0.0085, ink))
    elif mood == "joy":
        g.add(_poly([(cx - 0.055, my + 0.016)] + _arc(cx, my + 0.016, 0.055, 0.056, 180, 360, 10) + [(cx + 0.055, my + 0.016)], ink))
        g.add(_chain(_arc(cx, my - 0.006, 0.024, 0.020, 210, 330), 0.008, "#e8737a"))
    elif mood in ("sad", "angry"):
        g.add(_chain(_arc(cx, my - 0.034, 0.045, 0.034, 40, 140), 0.0085, ink))
    elif mood == "worried":
        g.add(_chain([(cx - 0.048, my - 0.008), (cx - 0.024, my + 0.008), (cx, my - 0.006), (cx + 0.024, my + 0.008),
                      (cx + 0.048, my - 0.008)], 0.0075, ink))
    elif mood == "surprised":
        g.add(_dot((cx, my - 0.006), 0.027, ink))
    elif mood == "thinking":
        g.add(_chain([(cx + 0.004, my - 0.006), (cx + 0.046, my + 0.004)], 0.0085, ink))
    elif mood == "confused":
        g.add(_chain([(cx - 0.038, my - 0.008), (cx + 0.038, my + 0.008)], 0.0085, ink))
    else:  # neutral, determined
        g.add(_chain([(cx - 0.034, my), (cx + 0.034, my)], 0.0085, ink))
    return g


def _hair(style: str, color: str, cx: float, cy: float, r: float) -> tuple[VGroup, VGroup]:
    """-> (behind the head, in front of the head)"""
    back, front = VGroup(), VGroup()
    cap = lambda lo, drop: _poly(_arc(cx, cy + 0.004, r * 1.07, r * 1.09, -4, 184, 16)  # noqa: E731
                                 + [(cx - r * 0.98, cy + lo), (cx - r * 0.45, cy + drop), (cx + r * 0.3, cy + drop + 0.028),
                                    (cx + r * 0.98, cy + lo)], color)
    if style == "short":
        front.add(cap(0.03, 0.085))
    elif style == "parted":
        front.add(cap(0.025, 0.105))
    elif style == "long":
        back.add(_poly(_arc(cx, cy + 0.01, r * 1.2, r * 1.17, 0, 180, 16) + [(cx - r * 1.28, cy - r * 1.35),
                 (cx - r * 0.55, cy - r * 1.5), (cx + r * 0.55, cy - r * 1.5), (cx + r * 1.28, cy - r * 1.35)], color))
        front.add(cap(0.015, 0.075))
    elif style == "curly":
        for k, (x, y) in enumerate(_arc(cx, cy + 0.045, r * 0.98, r * 0.94, -8, 188, 9)):
            front.add(_dot((x, y + 0.012), r * (0.31 if k % 2 else 0.35), color))
        front.add(_dot((cx, cy + r * 0.88), r * 0.42, color))
    elif style == "bun":
        back.add(_dot((cx, cy + r * 1.22), r * 0.46, color))
        front.add(cap(0.02, 0.08))
    elif style == "bald":
        for s in (-1, 1):
            front.add(_dot((cx + s * r * 0.93, cy + 0.025), r * 0.27, color), _dot((cx + s * r * 0.84, cy + 0.07), r * 0.2, color))
    return back, front


def _prop(kind: str, d: dict, hand_r, head) -> VGroup:
    g = VGroup()
    hx, hy = head
    if kind == "sweat":
        for x, y, k in ((hx + 0.215, hy + 0.08, 1.0), (hx - 0.22, hy + 0.03, 0.7)):
            g.add(_dot((x, y), 0.026 * k, "#7cc4ff"), _poly([(x - 0.022 * k, y + 0.012 * k), (x, y + 0.062 * k),
                                                              (x + 0.022 * k, y + 0.012 * k)], "#7cc4ff"))
    elif kind == "question":
        g.add(Text("?", font=K.SERIF, font_size=14, color=K.GOLD).scale_to_fit_height(0.17).move_to([hx + 0.28, hy + 0.17, 0]))
        g.add(_dot((hx + 0.19, hy + 0.08), 0.013, K.GOLD))
    elif kind == "finger":
        e, h = d["re"], d["rh"]
        n = math.hypot(h[0] - e[0], h[1] - e[1]) or 1
        tip = (hand_r[0] + (h[0] - e[0]) / n * 0.085, hand_r[1] + (h[1] - e[1]) / n * 0.085)
        g.add(_chain([hand_r, tip], 0.018, d["_skin"]))
    elif kind == "confetti":
        spots = [(-0.46, 0.93, K.GOLD), (-0.28, 1.1, K.RED), (0.0, 1.16, K.TEAL), (0.27, 1.09, K.PURPLE), (0.47, 0.9, K.GREEN),
                 (-0.5, 0.7, K.BLUE), (0.52, 0.68, K.ORANGE)]
        for k, (x, y, c) in enumerate(spots):
            g.add(_chain([(x, y), (x + 0.025 * (-1) ** k, y + 0.035)], 0.011, c))
    elif kind == "speed":
        for y, x0, x1 in ((0.62, -0.62, -0.40), (0.46, -0.70, -0.43), (0.28, -0.60, -0.46)):
            g.add(_chain([(x0, y), (x1, y)], 0.009, "#8fa3c4"))
    elif kind == "money":
        x, y = hand_r
        for k, (dx, c) in enumerate(((-0.045, "#3f9d62"), (0.0, "#4fb874"), (0.045, "#63cf88"))):
            note = RoundedRectangle(width=0.2, height=0.115, corner_radius=0.012, fill_color=c, fill_opacity=1, stroke_width=0)
            note.rotate(math.radians(22 - 22 * k)).move_to([x + dx, y + 0.065 + 0.012 * (k == 1), 0])
            g.add(note)
        g.add(Text("$", font=K.SERIF, font_size=14, color=K.CREAM).scale_to_fit_height(0.075).move_to(g[-1].get_center()))
        g.add(_dot(hand_r, LIMB * 0.8, d["_skin"]))
    elif kind == "phone":
        x, y = hand_r
        g.add(RoundedRectangle(width=0.11, height=0.19, corner_radius=0.022, fill_color=SHOE, fill_opacity=1, stroke_width=0)
              .move_to([x, y + 0.055, 0]))
        g.add(RoundedRectangle(width=0.085, height=0.15, corner_radius=0.012, fill_color="#8fd0ff", fill_opacity=1, stroke_width=0)
              .move_to([x, y + 0.058, 0]))
        g.add(_dot((x + 0.045, y + 0.004), LIMB * 0.62, d["_skin"]))
    return g


def draw(pose: dict, look: dict, flip: bool = False, mood: str | None = None) -> VGroup:
    """The figure in one pose (a dict like POSES' values)."""
    skin, shade = SKINS.get(look["skin"], SKINS["light"])
    d = {**pose, "_skin": skin}
    lift, lean = d["lift"], d["lean"]
    up = lambda p, k=1.0: (p[0] + lean * k, p[1] + lift)  # noqa: E731
    hip_l, hip_r = (-0.068 + lean * 0.35, 0.34 + lift), (0.068 + lean * 0.35, 0.34 + lift)
    sh_l, sh_r = up((-0.118, 0.578)), up((0.118, 0.578))
    head = (d["hx"] + lean * 1.25, 0.785 + d["hy"] + lift)
    r = 0.165
    g = VGroup()
    back, front = _hair(look["hair"], look["hair_color"], head[0], head[1], r)
    g.add(back)
    for knee, foot, hip, side in ((d["lk"], d["lf"], hip_l, -1), (d["rk"], d["rf"], hip_r, 1)):
        knee, foot = (knee[0] + lean * 0.15, knee[1] + lift), (foot[0], foot[1] + lift)
        g.add(_chain([hip, knee, foot], [LIMB * 1.2, LIMB, LIMB * 0.86], look["pants"]))
        g.add(_chain([(foot[0] - 0.012, foot[1]), (foot[0] + 0.052 * (1 if side > 0 or d["prop"] == "speed" else -0.9), foot[1])],
                     0.029, SHOE))
    # torso and neck
    g.add(_chain([up((0, 0.72), 1.1), up((0, 0.62))], 0.043, shade))
    torso = [(sh_l[0] - 0.022, sh_l[1] - 0.012), (sh_l[0] + 0.012, sh_l[1] + 0.038), (sh_r[0] - 0.012, sh_r[1] + 0.038),
             (sh_r[0] + 0.022, sh_r[1] - 0.012), (hip_r[0] + 0.048, hip_r[1] - 0.005), (hip_l[0] - 0.048, hip_l[1] - 0.005)]
    g.add(_poly(torso, look["shirt"]))
    g.add(_chain([(hip_l[0] - 0.012, hip_l[1]), (hip_r[0] + 0.012, hip_r[1])], 0.037, look["pants"]))
    if look.get("tie"):
        top = up((0, 0.615))
        g.add(_poly([(top[0] - 0.05, top[1] + 0.008), (top[0], top[1] - 0.06), (top[0] + 0.05, top[1] + 0.008)], "#ffffff"),
              _poly([(top[0] - 0.014, top[1] - 0.018), (top[0] + 0.014, top[1] - 0.018), (top[0] + 0.027, top[1] - 0.16),
                     (top[0], top[1] - 0.19), (top[0] - 0.027, top[1] - 0.16)], look["tie"]))
    # head
    for s in (-1, 1):
        g.add(_dot((head[0] + s * r * 0.98, head[1] - 0.012), 0.033, skin))
    g.add(_dot(head, r, skin))
    if look.get("beard"):
        g.add(_poly(_arc(head[0], head[1] - 0.012, r * 0.99, r * 0.99, 188, 352, 14) + _arc(head[0], head[1] - 0.04, r * 0.55, r * 0.4,
                                                                                            352, 188, 10), look["hair_color"]))
    g.add(front)
    face = mood if mood in MOODS else d["mood"]
    g.add(_face(face, head[0], head[1] - 0.012, d["prop"] == "phone"))
    if look.get("glasses"):
        for s in (-1, 1):
            g.add(Annulus(inner_radius=0.038, outer_radius=0.049, fill_color=SHOE, fill_opacity=1, stroke_width=0)
                  .move_to([head[0] + s * 0.062, head[1] - 0.014, 0]))
        g.add(Line([head[0] - 0.015, head[1] - 0.008, 0], [head[0] + 0.015, head[1] - 0.008, 0], color=SHOE, stroke_width=0.8))
    # arms, drawn last so a hand can cover the face or chest
    hands = []
    for elbow, hand, shoulder in ((d["le"], d["lh"], sh_l), (d["re"], d["rh"], sh_r)):
        elbow, hand = up(elbow), up(hand)
        hands.append(hand)
        g.add(_chain([shoulder, elbow], [LIMB, LIMB * 0.92], look["shirt"]))
        g.add(_chain([elbow, hand], [LIMB * 0.8, LIMB * 0.68], skin, joints=False), _dot(elbow, LIMB * 0.86, look["shirt"]),
              _dot(hand, LIMB * 0.95, skin))
    if d["prop"]:
        prop_pose = {**d, "re": up(d["re"]), "rh": hands[1]}
        g.add(_prop(d["prop"], prop_pose, hands[1], head))
    if flip:
        g.stretch(-1, 0, about_point=[0, 0, 0])
    return g


def between(a: dict, b: dict, t: float) -> dict:
    """The pose t (0..1) of the way from a to b. The face and the prop change half way."""
    out = {}
    for k, va in a.items():
        vb = b[k]
        if isinstance(va, tuple):
            out[k] = (va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t)
        elif isinstance(va, (int, float)):
            out[k] = va + (vb - va) * t
        else:
            out[k] = va if t < 0.5 else vb
    return out


class Person(VGroup):
    """A character: [an invisible ruler at its feet, the drawing]. The ruler tells where it is and how big,
    after any move or scale, so a new pose is drawn exactly in place."""

    def __init__(self, who: str = "sam", pose: str = "standing", mood: str | None = None, color=None, flip: bool = False,
                 height: float = 3.2):
        super().__init__()
        self.look = dict(CAST.get(who, CAST["sam"]))
        if color:
            self.look["shirt"] = K.col(color, self.look["shirt"])
        self.pose_now = POSES[pose]
        self.pose_label, self.mood_now, self.flip_now = pose, mood, bool(flip)
        ruler = Line([-0.5, 0, 0], [0.5, 0, 0], stroke_width=0, stroke_opacity=0)
        self.add(ruler, draw(self.pose_now, self.look, self.flip_now, mood))
        # the height is that of a standing figure, whatever the pose
        self.scale(max(0.2, height) / 0.98, about_point=[0, 0, 0])

    def show(self, pose: dict, mood: str | None = None, flip: bool | None = None) -> None:
        ruler = self.submobjects[0]
        k, at = ruler.width, ruler.get_center()
        body = draw(pose, self.look, self.flip_now if flip is None else flip, mood)
        body.scale(k, about_point=[0, 0, 0]).shift(at)
        old = self.submobjects[1]
        opacity = max((m.get_fill_opacity() for m in old.family_members_with_points()), default=1.0)
        if opacity < 0.99:  # a faded character stays faded
            body.set_opacity(opacity)
        self.submobjects = [ruler, body]
