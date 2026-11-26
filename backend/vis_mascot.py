"""YT Guru — the channel mascot: "Professor Coin", a clever gold coin with round glasses (user's choice, design A).

mascot() in scene code. Drawn here from simple filled shapes (no outside artwork), and a reaction is only
numbers, so it moves smoothly from one into the next, blinks by itself, points at things and flips a coin.

Coordinates are in "coin units": the coin has radius 1.0 around (0, 0); the soles are at y = -1.23.
"""
from __future__ import annotations

import math

try:  # the app only reads GUIDE; the drawing runs where Manim is installed (an optional download)
    import manim as M
    from manim import Annulus, Ellipse, Line, UpdateFromAlphaFunc, VGroup, rate_functions

    from vis_people import _arc, _chain, _dot, _poly
except ImportError:
    M, VGroup = None, object

GOLD, DEEP, RIM, LIGHT = "#f6c445", "#d99a22", "#b97d17", "#ffe08a"
INK, WHITE, TONGUE = "#2a1d18", "#ffffff", "#e8737a"
FEET = 1.23          # soles below the centre of the coin
TALL_UNITS = 2.23    # soles to the top of the coin
TOSS_X, TOSS_Y = 1.45, 0.38   # where the small coin rests, above the right hand

_LEFT = [(-0.92, -0.1), (-1.15, -0.35), (-1.12, -0.62)]
_RIGHT = [(0.92, -0.1), (1.15, -0.35), (1.12, -0.62)]


def _p(mouth="smile", al=_LEFT, ar=_RIGHT, pupil=0.075, look=(0.0, 0.0), brows=(0.34, 0.36, 0.34, 0.36), finger=0.0,
       lift=0.0, toss=0.0):
    """One reaction. brows = (left inner, left outer, right inner, right outer) height above the eye."""
    return {"mouth": mouth, "al": list(al), "ar": list(ar), "pupil": pupil, "look": look, "brows": tuple(brows),
            "finger": finger, "lift": lift, "toss": toss, "ty": 0.0, "spin": 0.7}


POSES = {
    "calm": _p(),
    "happy": _p("big", al=[(-0.92, -0.08), (-1.28, -0.2), (-1.45, -0.05)], ar=[(0.92, -0.08), (1.28, -0.2), (1.45, -0.05)],
                brows=(0.38, 0.39, 0.38, 0.39)),
    "surprised": _p("o", al=[(-0.92, 0.0), (-1.25, 0.2), (-1.2, 0.55)], ar=[(0.92, 0.0), (1.25, 0.2), (1.2, 0.55)],
                    pupil=0.055, brows=(0.47, 0.49, 0.47, 0.49)),
    "pointing": _p(al=[(-0.92, -0.1), (-1.15, -0.35), (-0.98, -0.55)], ar=[(0.92, 0.02), (1.28, 0.1), (1.62, 0.28)],
                   look=(0.05, 0.01), finger=1.0),
    "thinking": _p("hmm", ar=[(0.92, -0.2), (1.08, -0.66), (0.4, -0.6)], look=(0.05, 0.06), brows=(0.32, 0.33, 0.44, 0.45)),
    "worried": _p("wavy", al=[(-0.92, -0.15), (-1.2, -0.3), (-0.86, -0.5)], ar=[(0.92, -0.15), (1.2, -0.3), (0.86, -0.5)],
                  pupil=0.065, brows=(0.44, 0.31, 0.44, 0.31)),
    "celebrating": _p("big", al=[(-0.92, 0.1), (-1.3, 0.45), (-1.38, 0.9)], ar=[(0.92, 0.1), (1.3, 0.45), (1.38, 0.9)],
                      brows=(0.42, 0.43, 0.42, 0.43), lift=0.16),
    "flipping": _p("big", ar=[(0.92, -0.05), (1.3, -0.22), (1.42, 0.08)], look=(0.04, 0.03),
                   brows=(0.34, 0.36, 0.38, 0.32), toss=1.0),
}
ALIASES = {"neutral": "calm", "standing": "calm", "idle": "calm", "smile": "calm", "joy": "happy", "surprise": "surprised",
           "shocked": "surprised", "wow": "surprised", "point": "pointing", "think": "thinking", "worry": "worried",
           "sad": "worried", "celebrate": "celebrating", "cheer": "celebrating", "flip": "flipping", "coin": "flipping"}
SOUNDS = {"calm": "click", "happy": "pop", "surprised": "pop", "pointing": "swoosh", "thinking": "click",
          "worried": "swoosh_down", "celebrating": "ding", "flipping": "coin"}


def pose_name(name) -> str | None:
    n = str(name or "").strip().lower()
    n = ALIASES.get(n, n)
    return n if n in POSES else None


def _mouth(kind: str, y: float = -0.32) -> VGroup:
    if kind == "o":
        return VGroup(_dot((0, y), 0.085, INK))
    if kind == "big":
        return VGroup(_poly([(-0.17, y + 0.03)] + _arc(0, y + 0.03, 0.17, 0.17, 180, 360, 12) + [(0.17, y + 0.03)], INK),
                      _chain(_arc(0, y - 0.035, 0.08, 0.06, 215, 325), 0.022, TONGUE))
    if kind == "hmm":
        return VGroup(_chain([(-0.02, y - 0.01), (0.16, y + 0.03)], 0.024, INK))
    if kind == "wavy":
        return VGroup(_chain([(-0.15, y - 0.03), (-0.075, y + 0.025), (0, y - 0.02), (0.075, y + 0.025), (0.15, y - 0.03)],
                             0.021, INK))
    return VGroup(_chain(_arc(0, y + 0.08, 0.15, 0.11, 220, 320), 0.024, INK))


def _small_coin(x: float, y: float, turn: float) -> VGroup:
    w = max(0.04, abs(math.cos(turn)) * 0.2)
    g = VGroup(Ellipse(width=2 * w, height=0.4, fill_color=DEEP, fill_opacity=1, stroke_width=0).move_to([x + 0.025, y, 0]),
               Ellipse(width=2 * w * 0.86, height=0.36, fill_color=GOLD, fill_opacity=1, stroke_width=0).move_to([x, y, 0]))
    g.add(Ellipse(width=max(0.02, w * 0.7), height=0.18, fill_color=LIGHT, fill_opacity=1, stroke_width=0).move_to([x, y, 0]))
    return g


def draw(pose: dict, blink: bool = False) -> VGroup:
    """The mascot in one reaction, soles on (0, 0)."""
    g = VGroup()
    lift = pose["lift"]
    for s in (-1, 1):  # legs: the feet leave the floor with a hop
        g.add(_chain([(s * 0.28, -0.78), (s * 0.34, -1.12)], 0.075, RIM),
              _chain([(s * 0.30, -1.15), (s * 0.52, -1.15)], 0.08, INK))
    for arm in (pose["al"], pose["ar"]):
        g.add(_chain(arm, 0.072, RIM))
    g.add(_dot((0, 0), 1.0, RIM), _dot((0, 0), 0.95, GOLD))
    for k in range(28):  # the ridged edge
        a = k * math.tau / 28
        g.add(_chain([(0.87 * math.cos(a), 0.87 * math.sin(a)), (0.93 * math.cos(a), 0.93 * math.sin(a))], 0.018, DEEP))
    g.add(Annulus(inner_radius=0.755, outer_radius=0.8, fill_color=DEEP, fill_opacity=1, stroke_width=0),
          _chain(_arc(0, 0, 0.66, 0.66, 105, 155, 10), 0.035, LIGHT))
    bi_l, bo_l, bi_r, bo_r = pose["brows"]
    for s, inner, outer in ((-1, bi_l, bo_l), (1, bi_r, bo_r)):
        ex, ey = s * 0.28, 0.16
        g.add(_dot((ex, ey), 0.2, WHITE),
              Annulus(inner_radius=0.195, outer_radius=0.25, fill_color=INK, fill_opacity=1, stroke_width=0).move_to([ex, ey, 0]))
        if blink:
            g.add(_chain(_arc(ex, ey + 0.05, 0.12, 0.07, 215, 325), 0.024, INK))
        else:
            px, py = ex + pose["look"][0], ey + pose["look"][1]
            g.add(_dot((px, py), pose["pupil"], INK), _dot((px + 0.025, py + 0.028), pose["pupil"] * 0.28, WHITE))
        g.add(_chain([(ex - s * 0.12, ey + inner), (ex + s * 0.12, ey + outer)], 0.026, INK))
    g.add(_chain([(-0.04, 0.18), (0.04, 0.18)], 0.025, INK))
    g.add(_mouth(pose["mouth"]))
    # hands last: a hand may rest in front of the coin
    for arm in (pose["al"], pose["ar"]):
        g.add(_dot(arm[-1], 0.12, LIGHT))
    if pose["finger"] > 0.05:
        arm = pose["al"] if pose.get("point_left") else pose["ar"]
        (ax, ay), (hx, hy) = arm[-2], arm[-1]
        n = math.hypot(hx - ax, hy - ay) or 1.0
        reach = 0.29 * pose["finger"]
        g.add(_chain([(hx, hy), (hx + (hx - ax) / n * reach, hy + (hy - ay) / n * reach)], 0.045, LIGHT))
    if pose["toss"] > 0.5:
        x, y = TOSS_X, TOSS_Y + pose["ty"]
        g.add(_small_coin(x, y, pose["spin"]))
        if pose["ty"] > 0.25:  # speed lines while it flies
            g.add(_chain([(x - 0.2, y - 0.42), (x - 0.15, y - 0.26)], 0.015, WHITE),
                  _chain([(x + 0.2, y - 0.44), (x + 0.15, y - 0.28)], 0.015, WHITE))
    g.shift([0, FEET + lift, 0])
    return g


def between(a: dict, b: dict, t: float) -> dict:
    """The reaction t (0..1) of the way from a to b. The mouth changes half way."""
    mix = lambda u, v: u + (v - u) * t  # noqa: E731
    pt = lambda u, v: (mix(u[0], v[0]), mix(u[1], v[1]))  # noqa: E731
    near = a if t < 0.5 else b
    return {**near,
            "al": [pt(u, v) for u, v in zip(a["al"], b["al"])], "ar": [pt(u, v) for u, v in zip(a["ar"], b["ar"])],
            "look": pt(a["look"], b["look"]), "brows": tuple(mix(u, v) for u, v in zip(a["brows"], b["brows"])),
            **{k: mix(a[k], b[k]) for k in ("pupil", "finger", "lift", "ty", "spin")}}


def pointing_at(dx: float, dy: float) -> dict:
    """The pointing reaction aimed at (dx, dy), measured from the centre of the coin."""
    left = bool(dx < 0)  # a plain bool: the measurements come in as numpy numbers
    ax = abs(dx)
    angle = max(math.radians(-55), min(math.radians(72), math.atan2(dy, max(0.05, ax - 0.92))))
    c, s = math.cos(angle), math.sin(angle)
    arm = [(0.92, 0.0), (0.92 + 0.38 * c, 0.38 * s - 0.03), (0.92 + 0.76 * c, 0.76 * s)]
    rest = [(0.92, -0.1), (1.15, -0.35), (0.98, -0.55)]
    flip = lambda pts: [(-x, y) for x, y in pts]  # noqa: E731
    side = -1 if left else 1
    pose = _p(al=flip(arm if left else rest), ar=(rest if left else arm), look=(0.055 * side * c, 0.055 * s), finger=1.0)
    pose["point_left"] = left
    return pose


class Mascot(VGroup):
    """[an invisible ruler at the soles, the drawing] — the ruler tells where it is and how big, after any
    move or scale. It blinks by itself."""

    def __init__(self, pose: str = "calm", height: float = 2.6):
        super().__init__()
        self.pose_now = dict(POSES[pose])
        self.blinking, self.clock = False, 0.0
        self.add(Line([-0.5, 0, 0], [0.5, 0, 0], stroke_width=0, stroke_opacity=0), draw(self.pose_now))
        self.scale(max(0.3, height) / TALL_UNITS, about_point=[0, 0, 0])
        self.add_updater(Mascot._tick)

    def _tick(self, dt: float) -> None:
        self.clock += dt
        shut = (self.clock % 3.1) > 2.95  # a short blink every three seconds
        if shut != self.blinking:
            self.blinking = shut
            self.show(self.pose_now)

    def show(self, pose: dict) -> None:
        ruler = self.submobjects[0]
        k, at = ruler.width, ruler.get_center()
        body = draw(pose, self.blinking)
        body.scale(k, about_point=[0, 0, 0]).shift(at)
        opacity = max((m.get_fill_opacity() for m in self.submobjects[1].family_members_with_points()), default=1.0)
        if opacity < 0.99:  # a faded mascot stays faded
            body.set_opacity(opacity)
        self.submobjects = [ruler, body]

    def centre(self):
        """The middle of the coin on the screen."""
        ruler = self.submobjects[0]
        return ruler.get_center() + M.UP * FEET * ruler.width


GUIDE = r'''THE CHANNEL MASCOT — "Professor Coin", a clever gold coin with round glasses. It is this channel's face: use it
  where it adds feeling (the hook, a surprising number, the key point, the ending) — in about 1 scene in 3, the same way
  every video. It is not a person: people in the story are still person(...).
  m = mascot("calm", x=-4.2, h=2.6)   then enter(m)      (feet on the floor unless y=; it blinks by itself)
  react(m, "surprised")   reactions: calm, happy, surprised, pointing, thinking, worried, celebrating
  point_at(m, thing_or_(x, y))   turns its arm and eyes to the thing, left or right by itself
  flip_coin(m, then="happy")     tosses a spinning coin and catches it (a choice, a chance, "heads or tails")
  Keep it beside the main thing, never on top of it. React ON THE WORD:
      coin = mascot("calm", x=-4.2)
      enter(coin, "left")
      number = text("$48 billion", x=2, y=1.2, style="number")
      when("forty eight billion")
      enter(number)
      react(coin, "surprised")
      point_at(coin, number)

'''


def make(S, tools) -> dict:
    """The mascot's tools for scene code."""
    from vis_scene import GROUND_Y, XMAX, YMAX, num  # only inside the renderer: it reads the scene's data
    play, sfx = tools["play"], tools["sfx"]

    def _shown(m):
        return any(top is m or m in top.get_family() for top in S.mobjects)

    def _check(m, tool):
        if isinstance(m, Mascot):
            return True
        S.warnings.append(f"{tool}(): the first value must be a mascot(...)")
        return False

    def mascot(pose="calm", x=-4.0, y=None, h=2.6):
        """The channel mascot. Not shown until enter()."""
        name = pose_name(pose)
        if name is None:
            S.warnings.append(f'mascot("{pose}"): unknown reaction — calm is used')
            name = "calm"
        m = Mascot(name, min(num(h, 2.6) or 2.6, (YMAX - GROUND_Y) * 0.8))
        half = m.height * 0.75  # room for the arms and the tossed coin
        px = max(-XMAX + half, min(XMAX - half, num(x, -4.0)))
        m.shift([px, GROUND_Y if y is None else num(y), 0])
        return m

    def _morph(m, to, dur):
        frm = m.pose_now
        used = 0
        if _shown(m) and S.total - S.t > 0.3:
            used = play(UpdateFromAlphaFunc(m, lambda mob, a: mob.show(between(frm, to, a))), run_time=dur,
                        rate_func=rate_functions.ease_in_out_sine)
        m.pose_now = dict(to)
        m.show(m.pose_now)
        return used

    def _hop(m, to, dur=0.4):
        """A quick jump on the way into the reaction."""
        frm = m.pose_now
        if not _shown(m) or S.total - S.t <= 0.3:
            return _morph(m, to, dur)

        def step(mob, a):
            pose = between(frm, to, min(1.0, a * 1.6))
            pose["lift"] = pose["lift"] + 0.28 * math.sin(math.pi * a)
            mob.show(pose)
        used = play(UpdateFromAlphaFunc(m, step), run_time=dur, rate_func=rate_functions.linear)
        m.pose_now = dict(to)
        m.show(m.pose_now)
        return used

    def react(m, name, dur=0.45, sound=True):
        """The mascot changes how it feels (with its sound)."""
        if not _check(m, "react"):
            return 0
        new = pose_name(name)
        if new is None:
            S.warnings.append(f'react("{name}"): unknown — use one of {", ".join(POSES)}')
            return 0
        if new == "flipping":
            return flip_coin(m)
        if sound and _shown(m):
            sfx(SOUNDS[new])
        move = _hop if new in ("surprised", "celebrating", "happy") else _morph
        return move(m, POSES[new], max(0.2, num(dur, 0.45)))

    def point_at(m, target, dur=0.4, sound=True):
        """Arm, finger and eyes turn to a thing or to (x, y)."""
        if not _check(m, "point_at"):
            return 0
        if hasattr(target, "get_center"):
            spot = target.get_center()
        elif isinstance(target, (list, tuple)) and len(target) >= 2:
            spot = [num(target[0]), num(target[1]), 0]
        else:
            S.warnings.append("point_at(): give a thing or (x, y)")
            return 0
        k = m.submobjects[0].width or 1.0
        centre = m.centre()
        if sound and _shown(m):
            sfx("swoosh")
        return _morph(m, pointing_at((spot[0] - centre[0]) / k, (spot[1] - centre[1]) / k), max(0.2, num(dur, 0.4)))

    def flip_coin(m, dur=1.3, height=1.5, then="happy"):
        """A spinning coin is tossed up and caught."""
        if not _check(m, "flip_coin"):
            return 0
        used = _morph(m, POSES["flipping"], 0.25)
        left = S.total - S.t
        if not _shown(m) or left < 0.5:
            return used
        k = m.submobjects[0].width or 1.0
        room = (YMAX - m.centre()[1]) / k - TOSS_Y - 0.2  # the coin stays inside the picture
        top = max(0.3, min(num(height, 1.5), room))
        length = max(0.4, min(num(dur, 1.3), left - 0.05))

        def step(mob, a):
            mob.show({**POSES["flipping"], "ty": top * 4 * a * (1 - a), "spin": 0.7 + a * 5 * math.pi})
        sfx("coin")
        sfx("riser" if length > 1.6 else "swoosh", 0.05)
        sfx("coin", max(0.1, length - 0.03))
        used += play(UpdateFromAlphaFunc(m, step), run_time=length, rate_func=rate_functions.linear)
        m.pose_now = dict(POSES["flipping"])
        m.show(m.pose_now)
        new = pose_name(then)
        if new and new != "flipping" and S.total - S.t > 0.45:
            used += react(m, new, 0.35)
        return used

    return {"mascot": mascot, "react": react, "point_at": point_at, "flip_coin": flip_coin}
