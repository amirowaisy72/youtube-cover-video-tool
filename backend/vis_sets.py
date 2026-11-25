"""YT Guru — flat backgrounds for Script mode scenes: setting("street") and friends.

Drawn in code, in quiet dark tones so the things in front stay the clearest part of the picture.
Each setting has a back layer (wall or sky), a far layer and a near layer; the far and near layers
move at different speeds when the camera moves (parallax). Built for the 16:9 stage (x -7..7,
floor at y = -2.4) and wide enough for zooms; a Short sees the same stage with more wall above.
"""
from __future__ import annotations

import math
import random

from manim import Circle, Line, Polygon, Rectangle, VGroup

SETTINGS = ("plain", "street", "office", "home", "shop", "bank", "night")
ALIASES = {"city": "street", "city_street": "street", "outside": "street", "market": "shop", "store": "shop", "supermarket": "shop",
           "bank_hall": "bank", "hall": "bank", "house": "home", "living_room": "home", "work": "office", "stage": "plain",
           "plain_stage": "plain", "sky": "night", "night_sky": "night"}

# wall colour, floor colour
PALETTE = {"plain": ("#1d2740", "#2c3856"), "street": ("#243a55", "#333f52"), "office": ("#22334a", "#3a3f55"),
           "home": ("#33304a", "#4a3a3c"), "shop": ("#1f3a40", "#38484a"), "bank": ("#27324c", "#46465c"),
           "night": ("#10182c", "#1d2a40")}


def setting_name(name) -> str | None:
    n = str(name or "").strip().lower().replace(" ", "_").replace("-", "_")
    n = ALIASES.get(n, n)
    return n if n in SETTINGS else None


def _r(w, h, c, x=0.0, y=0.0, o=1.0):
    return Rectangle(width=w, height=h, fill_color=c, fill_opacity=o, stroke_width=0).move_to([x, y, 0])


def _c(r, c, x, y, o=1.0):
    return Circle(radius=r, fill_color=c, fill_opacity=o, stroke_width=0).move_to([x, y, 0])


def _p(pts, c, o=1.0):
    return Polygon(*[[x, y, 0] for x, y in pts], fill_color=c, fill_opacity=o, stroke_width=0)


def _stand(w, h, c, x, floor):  # a block standing on the floor
    return _r(w, h, c, x, floor + h / 2)


def _skyline(floor, colour, window, seed, low, high, lit=0.25):
    rnd = random.Random(seed)
    g, x = VGroup(), -10.5
    while x < 10.5:
        w, h = rnd.uniform(0.9, 1.7), rnd.uniform(low, high)
        g.add(_stand(w, h, colour, x + w / 2, floor))
        cols = max(1, int(w / 0.45))
        for row in range(int(h / 0.55)):
            for col in range(cols):
                if rnd.random() < lit:
                    g.add(_r(0.14, 0.2, window, x + (col + 0.5) * w / cols, floor + 0.4 + row * 0.55))
        x += w + rnd.uniform(0.08, 0.3)
    return g


def _window(x, y, w, h, frame, glass, floor_inside=True):
    g = VGroup(_r(w + 0.18, h + 0.18, frame, x, y), _r(w, h, glass, x, y))
    if floor_inside:
        rnd = random.Random(int(x * 10) + 7)
        for k in range(5):
            bw = w / 5 * 0.8
            bh = rnd.uniform(0.25, 0.7) * h
            g.add(_r(bw, bh, "#31496b", x - w / 2 + (k + 0.5) * w / 5, y - h / 2 + bh / 2))
    g.add(_r(0.07, h, frame, x, y), _r(w, 0.07, frame, x, y))
    return g


def build(name: str, floor: float) -> tuple[VGroup, VGroup, VGroup]:
    """-> (back, far, near) layers of a setting."""
    wall, _ground = PALETTE[name]
    back = VGroup(_r(48, 60, wall))
    far, near = VGroup(), VGroup()
    f = floor
    if name == "plain":
        for x, y, r in ((-4.6, 1.9, 2.4), (4.9, 0.4, 3.0), (0.6, 3.4, 1.7)):
            far.add(_c(r, "#25304d", x, y), _c(r * 0.62, "#293656", x, y))
    elif name == "street":
        back.add(_r(48, 3.0, "#2d4766", 0, f + 1.5))
        far.add(_skyline(f, "#1f314a", "#c9a765", 5, 1.4, 3.9, 0.16))
        for x in (-6.3, 6.4):  # street lamps
            near.add(_stand(0.12, 3.5, "#121c2c", x, f), _r(0.8, 0.1, "#121c2c", x - math.copysign(0.35, x), f + 3.5),
                     _c(0.17, "#e7c46e", x - math.copysign(0.7, x), f + 3.36))
        for x in (-5.2, 5.2):  # trees
            near.add(_stand(0.18, 0.8, "#2b2a30", x, f), _c(0.62, "#2c5a4e", x, f + 1.2), _c(0.45, "#32695a", x + 0.3, f + 1.5))
    elif name == "office":
        far.add(_window(-4.4, 1.5, 3.4, 2.3, "#3c4d6b", "#486a94"), _window(4.4, 1.5, 3.4, 2.3, "#3c4d6b", "#486a94"))
        far.add(_c(0.5, "#3c4d6b", 0, 2.6), _c(0.4, "#c9d2e0", 0, 2.6, 0.55), _r(0.05, 0.28, "#27324c", 0, 2.73),
                _r(0.2, 0.05, "#27324c", 0.08, 2.6))
        for x in (-6.1, 6.1):  # filing cabinet / plant
            if x < 0:
                near.add(_stand(1.0, 1.5, "#3a4660", x, f), *[_r(0.34, 0.07, "#6b7896", x, f + 0.35 + 0.45 * k) for k in range(3)])
            else:
                near.add(_stand(0.55, 0.5, "#8a5a44", x, f), _c(0.42, "#2f6150", x, f + 0.95), _c(0.3, "#38745f", x - 0.25, f + 1.25),
                         _c(0.26, "#38745f", x + 0.28, f + 1.2))
    elif name == "home":
        back.add(*[_r(0.04, 60, "#383452", x) for x in range(-20, 21, 2)])
        far.add(_window(-4.5, 1.4, 2.6, 2.1, "#57496a", "#5878a8", floor_inside=False))
        far.add(_p([(-6.1, 2.65), (-5.55, 2.65), (-5.75, 0.2), (-6.2, 0.2)], "#6b3f52"),
                _p([(-2.9, 2.65), (-3.45, 2.65), (-3.25, 0.2), (-2.8, 0.2)], "#6b3f52"))
        for x, y, w, h, c in ((5.75, 1.55, 0.95, 0.75, "#3f6b73"),):  # at the edge: the middle stays free for the scene
            far.add(_r(w + 0.16, h + 0.16, "#1f1d2e", x, y), _r(w, h, c, x, y), _c(min(w, h) * 0.2, "#d8b56a", x, y + 0.1, 0.8))
        near.add(_stand(0.09, 2.4, "#1f1d2e", 6.4, f), _p([(6.0, f + 2.3), (6.8, f + 2.3), (6.62, f + 2.95), (6.18, f + 2.95)], "#d9a860"),
                 _stand(1.9, 0.55, "#4b3a4f", -5.7, f), _r(1.9, 0.7, "#5a465f", -5.7, f + 0.85), _r(0.3, 0.95, "#4b3a4f", -6.6, f + 0.5))
    elif name == "shop":
        for k, c in enumerate(["#a5564a", "#e0d6c2"] * 14):  # the awning
            x = -9.45 + k * 0.7
            far.add(_r(0.7, 0.55, c, x, 3.72, 0.75), _c(0.35, c, x, 3.45, 0.75))
        rnd = random.Random(11)
        for side in (-1, 1):
            for row, y in enumerate((f + 0.9, f + 2.0, f + 3.1)):
                x = 4.4
                while x < 8.4:
                    w, h = rnd.uniform(0.35, 0.6), rnd.uniform(0.4, 0.75)
                    far.add(_r(w, h, rnd.choice(["#4f7d78", "#8d6b4d", "#6d5a80", "#a08a55"]), side * (x + w / 2), y + h / 2, 0.5))
                    x += w + 0.1
                far.add(_r(4.4, 0.1, "#16282d", side * 5.7, y - 0.05))
        near.add(_stand(1.7, 0.85, "#6b4f3c", -6.0, f), _r(1.9, 0.14, "#8a6a4f", -6.0, f + 0.92))
    elif name == "bank":
        far.add(_p([(-7.6, 3.15), (0, 4.35), (7.6, 3.15)], "#33405e"), _r(15.4, 0.35, "#3d4b6c", 0, 3.0))
        for x in (-6.2, -4.3, 4.3, 6.2):
            far.add(_stand(0.75, 5.25, "#3d4b6c", x, f), _r(1.05, 0.25, "#4a597c", x, 2.72), _r(1.05, 0.25, "#4a597c", x, f + 0.12),
                    *[_stand(0.07, 4.8, "#34415f", x + d, f + 0.3) for d in (-0.18, 0.18)])
        far.add(_c(0.55, "#b99a55", 0, 3.45, 0.55), _c(0.36, "#27324c", 0, 3.45), _c(0.2, "#b99a55", 0, 3.45, 0.55))
    elif name == "night":
        rnd = random.Random(23)
        for _ in range(55):
            far.add(_c(rnd.uniform(0.018, 0.05), "#e8eefc", rnd.uniform(-9.5, 9.5), rnd.uniform(-0.2, 5.5), rnd.uniform(0.35, 0.95)))
        far.add(_c(0.45, "#f0e2b0", 6.3, 3.25), _c(0.4, wall, 6.12, 3.4))
        near.add(_skyline(f, "#18233a", "#d9b866", 31, 0.5, 1.7, 0.14))
    return back, far, near


def floor_details(name: str, floor: float) -> VGroup:
    """Marks on the ground (they stay below the floor line, where the captions are)."""
    g = VGroup(Line([-20, floor, 0], [20, floor, 0], color="#ffffff", stroke_width=1.2, stroke_opacity=0.12))
    if name == "street":
        g.add(*[_r(1.1, 0.09, "#8c93a3", x, floor - 0.75, 0.45) for x in range(-12, 13, 3)])
    elif name in ("home", "office"):
        g.add(*[Line([-20, floor - d, 0], [20, floor - d, 0], color="#000000", stroke_width=1.5, stroke_opacity=0.18) for d in (0.5, 1.15)])
    elif name in ("bank", "shop"):
        g.add(*[Line([x, floor, 0], [x * 1.5, floor - 2.5, 0], color="#000000", stroke_width=1.5, stroke_opacity=0.2)
                for x in range(-12, 13, 2)])
    return g
