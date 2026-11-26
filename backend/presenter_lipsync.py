"""Lip-sync without any big AI model: the still photo itself is animated with OpenCV.

  voice + word timings -> for every video frame: how open the mouth is (loudness) and its shape (the sounds:
                          closed for m/b/p, round for o/u, wide for e/i, open for a)
  face points          -> the real lower lip, chin and jaw are moved down (a thin-plate-spline warp that fades into
                          the cheeks and neck) and the gap is filled with a soft dark colour taken from the photo's own
                          mouth shadow; teeth show only where the photo already shows them. A blink lays skin from just
                          above the eye over the eye, inside the eye shape only. The head moves a very little.

ENGINES: an engine opens one presenter at one size and gives the picture and cut-out of any video frame.
Today there is "pc". A cloud engine only has to offer the same two methods (open -> frame) and be added.
Everything is decided from the frame number, so any scene can be drawn on its own and always looks the same.
"""
from __future__ import annotations

import math
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

import presenter_models as models

FPS = 25
DELAY = 1                 # the mouth follows the sound by this many frames
VERSION = "puppet-2"
DEFAULT_MOTION = {"mouth": 1.0, "blink": True, "head": 1.0}

# MediaPipe Face Mesh point numbers
LIP_UP = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]       # inner edge, left to right in the picture
LIP_LOW = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]
CORNERS = (61, 291)
CHIN = 152
MAX_GAP = 0.20            # the widest opening, in parts of the mouth width
BROWS = ([46, 53, 52, 65, 55], [276, 283, 282, 295, 285])   # lower edge of each eyebrow
# points that say how far the skin follows the jaw (0 = stays, 1 = moves with the chin)
JAW = {152: 1.0, 175: 1.0, 199: 1.0, 200: 1.0, 18: 1.0, 148: 1.0, 377: 1.0, 176: 0.95, 400: 0.95, 149: 0.85, 378: 0.85,
       150: 0.72, 379: 0.72, 136: 0.55, 365: 0.55, 172: 0.38, 397: 0.38, 58: 0.2, 288: 0.2, 132: 0.07, 361: 0.07,
       201: 0.95, 421: 0.95, 32: 0.85, 262: 0.85, 204: 0.7, 424: 0.7, 169: 0.68, 394: 0.68, 210: 0.55, 430: 0.55,
       202: 0.4, 422: 0.4, 212: 0.25, 432: 0.25, 214: 0.18, 434: 0.18, 61: 0.1, 291: 0.1, 187: 0.03, 411: 0.03,
       205: 0.0, 425: 0.0, 2: 0.0, 98: 0.0, 327: 0.0}
EYES = (  # (the two corners, upper lid, lower lid)
    ((33, 133), [33, 246, 161, 160, 159, 158, 157, 173, 133], [33, 7, 163, 144, 145, 153, 154, 155, 133]),
    ((362, 263), [362, 398, 384, 385, 386, 387, 388, 466, 263], [362, 382, 381, 380, 374, 373, 390, 249, 263]))


_cv_module: list = []


def _cv():
    if not _cv_module:  # looked up once: this is asked for in every frame
        if not models.add_libraries():
            raise RuntimeError("OpenCV is not installed. In the Photo step press “Set up the presenter”.")
        import cv2
        _cv_module.append(cv2)
    return _cv_module[0]


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


# ================================================================== what the mouth does, frame by frame
def read_voice(path: Path) -> np.ndarray:
    """Any sound file -> 16 kHz mono samples."""
    import video
    run = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, timeout=900, **video.no_window_kwargs())
    if run.returncode or not run.stdout:
        raise RuntimeError("The voice file could not be read: " + run.stderr.decode(errors="ignore")[-200:])
    return np.frombuffer(run.stdout, np.float32)


def loudness(samples: np.ndarray, count: int) -> np.ndarray:
    """0..1 per video frame."""
    hop = 16000 // FPS
    padded = np.concatenate([np.zeros(hop // 2, np.float32), samples, np.zeros(count * hop + hop, np.float32)])
    power = np.array([np.sqrt(np.mean(padded[i * hop:i * hop + hop] ** 2)) for i in range(count)], np.float32)
    top = float(np.percentile(power, 95)) or 1.0
    level = np.clip(power / top, 0, 1.2)
    level[level < 0.06] = 0
    return np.clip(level, 0, 1) ** 0.6


# a sound -> (how open, how wide: -1 round .. +1 spread, share of the word's time)
SHAPES = {"closed": (0.0, 0.0, 0.8), "teeth": (0.12, 0.25, 0.7), "round": (0.55, -1.0, 1.2), "wide": (0.38, 0.9, 1.1),
          "open": (1.0, 0.15, 1.4), "mid": (0.6, 0.35, 1.1), "small": (0.24, 0.2, 0.6)}
_SOUNDS = (("oo|ou|ow|oa|u|o|w|q", "round"), ("ee|ea|ie|i|y|e", "wide"), ("ai|ay|au|a", "open"), ("m|b|p", "closed"),
           ("f|v|ph", "teeth"), ("er|ar|h", "mid"))
_PARTS = re.compile("ph|oo|ou|ow|oa|ee|ea|ie|ai|ay|au|er|ar|[a-z]")


def sounds_of(word: str) -> list[str]:
    """The mouth shapes of one word, in order (from its spelling: good enough to look right)."""
    w = word.lower()
    if re.search(r"\d", w):  # numbers are spoken as several syllables
        return ["small", "open", "mid", "wide", "round"][:max(2, min(5, len(re.sub(r"\D", "", w)) + 1))]
    w = re.sub(r"[^a-z]", "", w)
    if len(w) > 3 and w.endswith("e") and not w.endswith("ee"):
        w = w[:-1]  # a silent last e
    out = []
    for part in _PARTS.findall(w):
        shape = next((name for pattern, name in _SOUNDS if re.fullmatch(pattern, part)), "small")
        if not out or out[-1] != shape:
            out.append(shape)
    if w and not w.isascii():
        return ["open", "small", "round"]
    return out or ["mid", "small"]


def timeline(samples: np.ndarray, words: list[dict], duration: float, unexplained: bool = True
             ) -> tuple[np.ndarray, np.ndarray]:
    """(open 0..1, wide -1..1) for every frame of the voiceover."""
    count = max(1, int(math.ceil(duration * FPS)))
    loud = loudness(samples, count)
    opening = np.zeros(count, np.float32)
    wide = np.zeros(count, np.float32)
    shut = np.zeros(count, bool)
    spoken = np.zeros(count, bool)
    for w in words:
        shapes = sounds_of(str(w.get("word", "")))
        start, end = float(w["start"]), max(float(w["end"]), float(w["start"]) + 0.08)
        end = min(end, start + 0.14 * len(shapes) + 0.35)  # a word never fills a long pause
        total = sum(SHAPES[s][2] for s in shapes)
        at = start
        for s in shapes:
            o, wd, share = SHAPES[s]
            nxt = at + (end - start) * share / total
            a, b = int(round(at * FPS)), max(int(round(nxt * FPS)), int(round(at * FPS)) + 1)
            a, b = max(0, min(count - 1, a)), min(count, b)
            opening[a:b], wide[a:b] = o, wd
            spoken[a:b] = True
            if s == "closed":
                shut[a:max(a + 1, min(b, a + 2))] = True
            at = nxt
    if unexplained:  # in a made voiceover, sound the words do not explain is still speech (not music)
        opening[~spoken & (loud > 0.25)] = 0.5
    opening *= np.where(loud > 0, 0.35 + 0.75 * loud, 0.0)
    opening = _soften(opening, 1.1)                         # ease in and out between the shapes
    for i in range(1, count):                               # never a jump from one frame to the next
        opening[i] = min(max(opening[i], opening[i - 1] - 0.17), opening[i - 1] + 0.2)
    wide = _soften(wide, 1.8)
    lips = np.clip(_soften(shut.astype(np.float32), 0.8) * 2.2, 0, 1)
    opening *= 1 - 0.93 * lips                              # lips meet on m, b and p
    opening = np.concatenate([np.zeros(DELAY, np.float32), opening[:-DELAY]])
    wide = np.concatenate([np.zeros(DELAY, np.float32), wide[:-DELAY]])
    return np.clip(opening, 0, 1).astype(np.float32), np.clip(wide, -1, 1).astype(np.float32)


def _soften(values: np.ndarray, sigma: float) -> np.ndarray:
    reach = int(math.ceil(sigma * 3))
    kernel = np.exp(-0.5 * (np.arange(-reach, reach + 1) / sigma) ** 2)
    kernel /= kernel.sum()
    padded = np.concatenate([np.zeros(reach), values, np.zeros(reach)])
    return np.convolve(padded, kernel, "valid").astype(np.float32)


def blinks(count: int, seed: int = 7) -> np.ndarray:
    """How far the eyelids are shut (0..1) in every frame: a blink every few seconds, sometimes two."""
    rng = np.random.default_rng(seed)
    out = np.zeros(count, np.float32)
    curve = np.array([0.3, 0.75, 1.0, 1.0, 0.72, 0.42, 0.15], np.float32)
    at = int(rng.integers(22, 55))
    while at < count:
        part = curve[:count - at]
        out[at:at + len(part)] = part
        at += int(rng.integers(8, 12)) if rng.random() < 0.12 else int(rng.integers(60, 130))
    return out


def head_motion(count: int, loud: np.ndarray, seed: int = 11) -> np.ndarray:
    """(count, 3): tilt in degrees, sideways and up/down in parts of the face width. Slow and small."""
    rng = np.random.default_rng(seed)
    t = np.arange(count) / FPS
    out = np.zeros((count, 3), np.float32)
    for k, (size, speeds) in enumerate(((0.9, (0.09, 0.21)), (0.011, (0.07, 0.17)), (0.006, (0.11, 0.27)))):
        phase = rng.uniform(0, 2 * math.pi, 2)
        out[:, k] = size * (0.65 * np.sin(2 * math.pi * speeds[0] * t + phase[0])
                            + 0.35 * np.sin(2 * math.pi * speeds[1] * t + phase[1]))
    soft = np.convolve(loud, np.hanning(15) / np.hanning(15).sum(), "same")[:count]
    out[:, 2] += 0.008 * soft                                # a small nod with the voice
    return out


# ================================================================== drawing the face
class _Area:
    """A turned rectangle around a feature: pixel grids in its own coordinates (x along `axis`, y downwards)."""

    def __init__(self, centre: np.ndarray, axis: np.ndarray, half_w: float, up: float, down: float, shape: tuple[int, int]):
        self.c = centre
        self.u = axis / (np.linalg.norm(axis) or 1.0)
        if self.u[0] < 0:
            self.u = -self.u
        self.v = np.array([-self.u[1], self.u[0]])
        corners = np.array([centre + self.u * a + self.v * b for a in (-half_w, half_w) for b in (-up, down)])
        h, w = shape
        self.x0, self.y0 = max(0, int(corners[:, 0].min())), max(0, int(corners[:, 1].min()))
        self.x1, self.y1 = min(w, int(corners[:, 0].max()) + 2), min(h, int(corners[:, 1].max()) + 2)
        gx, gy = np.meshgrid(np.arange(self.x0, self.x1, dtype=np.float32), np.arange(self.y0, self.y1, dtype=np.float32))
        dx, dy = gx - float(centre[0]), gy - float(centre[1])
        self.X = (dx * float(self.u[0]) + dy * float(self.u[1])).astype(np.float32)
        self.Y = (dx * float(self.v[0]) + dy * float(self.v[1])).astype(np.float32)
        # 1 inside, 0 at the border: no edge can show
        fx = smoothstep((half_w - np.abs(self.X)) / max(1.0, half_w * 0.18))
        fy = smoothstep((self.Y + up) / max(1.0, up * 0.2)) * smoothstep((down - self.Y) / max(1.0, down * 0.2))
        self.edge = (fx * fy).astype(np.float32)

    def local(self, points: np.ndarray) -> np.ndarray:
        d = points - self.c
        return np.column_stack([d @ self.u, d @ self.v])

    def sample(self, cv2, source: np.ndarray, X: np.ndarray, Y: np.ndarray) -> np.ndarray:
        """The source picture read at local coordinates (X, Y) for every pixel of the area."""
        X = self.X + (X - self.X) * self.edge
        Y = self.Y + (Y - self.Y) * self.edge
        mx = (self.c[0] + X * self.u[0] + Y * self.v[0]).astype(np.float32)
        my = (self.c[1] + X * self.u[1] + Y * self.v[1]).astype(np.float32)
        return cv2.remap(source, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def _spline(points: np.ndarray, values: np.ndarray, at_x: np.ndarray, at_y: np.ndarray, smoothing: float = 0.02):
    """Thin-plate spline: the smooth surface through `values` at `points`, read at the grid (at_x, at_y)."""
    def basis(r2):
        return 0.5 * r2 * np.log(r2 + 1e-12)
    n = len(points)
    between = ((points[:, None, :] - points[None, :, :]) ** 2).sum(-1)
    plane = np.column_stack([np.ones(n), points])
    system = np.zeros((n + 3, n + 3))
    system[:n, :n] = basis(between) + smoothing * np.eye(n)
    system[:n, n:] = plane
    system[n:, :n] = plane.T
    solved = np.linalg.lstsq(system, np.concatenate([values, np.zeros(3)]), rcond=None)[0]
    grid = np.column_stack([at_x.ravel(), at_y.ravel()])
    r2 = ((grid[:, None, :] - points[None, :, :]) ** 2).sum(-1)
    out = basis(r2) @ solved[:n] + solved[n] + grid @ solved[n + 1:]
    return out.reshape(at_x.shape)


def grain(image: np.ndarray, spots: list) -> float:
    """How grainy the photo is (standard deviation of the noise), measured on smooth skin."""
    cv2 = _cv()
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(np.float32)
    fine = np.abs(gray - cv2.GaussianBlur(gray, (0, 0), 1.0))
    found = []
    for x, y in spots:
        part = fine[max(0, int(y) - 6):int(y) + 6, max(0, int(x) - 6):int(x) + 6]
        if part.size:
            found.append(float(np.median(part)) * 1.6)
    return float(np.clip(np.median(found) if found else 1.0, 0.3, 7.0))


def eye_check(photo: np.ndarray, points: np.ndarray) -> dict:
    """Glasses? A frame shows as a long edge across the nose bridge and under both eyes, where bare skin has none.
    -> {"glasses": bool, "blink": the most the lids may close, 0..1}"""
    cv2 = _cv()
    gray = cv2.cvtColor(np.ascontiguousarray(photo), cv2.COLOR_RGB2GRAY)
    width = float(np.mean([np.linalg.norm(points[b] - points[a]) for (a, b), _u, _l in EYES])) or 10.0
    k = 64.0 / width                                         # every face is judged at the same eye size
    small = cv2.resize(gray, None, fx=k, fy=k, interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC)
    q = points * k
    edges = cv2.Canny(cv2.GaussianBlur(small, (0, 0), 1.0), 60, 140, L2gradient=True)

    def box(x0, x1, y0, y1):
        return edges[max(0, int(y0)):max(0, int(y1)), max(0, int(x0)):max(0, int(x1))]

    def covered(part) -> float:
        """The share of columns of a box that hold an edge."""
        return float((part > 0).any(axis=0).mean()) if part.size else 0.0

    inner = sorted([q[133][0], q[362][0]])
    gap = inner[1] - inner[0]
    eyes_y = (q[133][1] + q[362][1]) / 2
    bridge = covered(box(inner[0] + gap * 0.3, inner[1] - gap * 0.3, eyes_y - 22, eyes_y + 8))
    under, longest = [], []
    for (a, b), _upper, lower in EYES:
        xs = sorted([q[a][0], q[b][0]])
        low = max(q[i][1] for i in lower)
        under.append(covered(box(xs[0], xs[1], low + 22, low + 58)))
        region = (box(xs[0] - 24, xs[1] + 24, low + 16, low + 62) > 0).astype(np.uint8)
        count, _labels, stats, _c = cv2.connectedComponentsWithStats(region, 8) if region.size else (0, None, [], None)
        longest.append(max([stats[i, cv2.CC_STAT_WIDTH] for i in range(1, count)] or [0]) / 64)
    rim, line = float(np.mean(under)), float(min(longest))
    glasses = bridge > 0.6 and rim > 0.45 or rim > 0.85 and line > 1.0
    return {"glasses": bool(glasses), "blink": 0.85 if glasses else 1.0, "bridge": bridge, "rim": rim}


class Puppet:
    """One photo at one size: photo RGB, how solid it is, and its 478 face points."""

    def __init__(self, photo: np.ndarray, alpha: np.ndarray, points: np.ndarray, blink_limit: float = 1.0):
        self.cv = cv2 = _cv()
        self.base = np.dstack([photo, alpha]).astype(np.uint8)
        self.blink_limit = float(blink_limit)
        h, w = alpha.shape
        p = points.astype(np.float64)
        rng = np.random.default_rng(3)
        self.noise = grain(np.ascontiguousarray(photo), [p[i] for i in (205, 425, 151, 50, 280)])
        self._mouth_setup(cv2, photo, p, (h, w), rng)
        self.eyes = [self._eye_setup(cv2, photo, p, (h, w), rng, side) for side in range(2)]
        # the head: everything down to the chin moves as one piece, fading out towards the shoulders
        face_w = float(np.linalg.norm(p[454] - p[234])) or self.mw * 2
        face_h = float(np.linalg.norm(p[10] - p[CHIN])) or face_w
        self.face_w = face_w
        self.pivot = p[CHIN] + (p[CHIN] - p[10]) * 0.18
        gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
        fall_y = 1 - smoothstep((gy - float(p[CHIN][1]) - face_h * 0.06) / (face_h * 0.9))
        fall_x = 1 - smoothstep((np.abs(gx - float(self.pivot[0])) - face_w * 1.3) / (face_w * 0.9))
        self.head_weight = (fall_y * fall_x).astype(np.float32)
        rows = np.nonzero(self.head_weight.max(axis=1) > 0.001)[0]
        self.head_rows = int(rows.max()) + 1 if len(rows) else h
        cols = np.nonzero(self.head_weight.max(axis=0) > 0.001)[0]
        self.head_cols = (int(cols.min()), int(cols.max()) + 1) if len(cols) else (0, w)
        self.gx, self.gy = gx, gy

    # -------- mouth and jaw
    def _mouth_setup(self, cv2, photo, p, shape, rng) -> None:
        left, right = p[CORNERS[0]], p[CORNERS[1]]
        centre = (left + right) / 2
        mw = self.mw = float(np.linalg.norm(right - left)) or 10.0
        chin_far = float(np.linalg.norm(p[CHIN] - centre))
        face_w = float(np.linalg.norm(p[454] - p[234])) or mw * 2
        up = max(mw * 0.3, float(np.linalg.norm(p[2] - centre)) * 0.9)   # never as high as the nose or the glasses
        m = self.mouth = _Area(centre, right - left, max(face_w * 0.75, mw * 1.5), up, chin_far + mw * 1.25, shape)
        upper, lower = m.local(p[LIP_UP]), m.local(p[LIP_LOW])
        inner = m.local(p[[LIP_UP[0], LIP_UP[-1]]])
        self.half = float(abs(inner[1, 0] - inner[0, 0]) / 2) or mw * 0.4
        self.already_open = float(np.linalg.norm(p[13] - p[14])) / mw
        # are teeth showing in the photo? then they stay with the upper lip, as they are
        self.teeth = False
        if self.already_open > 0.045:
            ring = np.array([p[i] for i in LIP_UP] + [p[i] for i in LIP_LOW[::-1]], np.int32)
            area = np.zeros(shape, np.uint8)
            cv2.fillPoly(area, [ring], 1)
            inside = photo[area > 0].astype(np.float32)
            if len(inside) > 20:
                bright = inside @ np.array((0.3, 0.59, 0.11), np.float32)
                colour = inside.max(axis=1) - inside.min(axis=1)
                skin = float(np.median(photo[np.clip(p[[205, 425], 1].astype(int), 0, shape[0] - 1),
                                              np.clip(p[[205, 425], 0].astype(int), 0, shape[1] - 1)]))
                self.teeth = bool(((bright > skin * 0.8) & (colour < 75)).mean() > 0.22)
        share = 0.85 if self.teeth else 0.5                   # where the mouth parts: 0 = upper inner lip, 1 = lower
        line = upper * (1 - share) + lower * share
        order = np.argsort(line[:, 0])
        self.seam = np.interp(m.X.ravel(), line[order, 0], line[order, 1]).reshape(m.X.shape).astype(np.float32)
        self.profile = (np.clip(1 - (m.X / (self.half * 1.04)) ** 2, 0, 1) ** 0.75).astype(np.float32)
        # how far every pixel follows the jaw
        self.chin = float(m.local(p[[CHIN]])[0, 1])
        spots = m.local(p[list(JAW)])
        values = np.array([JAW[i] for i in JAW], np.float64)
        extra, worth = [], []
        for x in (-0.75, -0.35, 0.0, 0.35, 0.75):            # the neck follows a little, then nothing
            extra.append((x * mw, self.chin + 0.3 * mw))
            worth.append(0.55 if abs(x) < 0.5 else 0.3)
        for x in (-1.4, -0.7, 0.0, 0.7, 1.4):
            extra.append((x * mw, self.chin + 1.05 * mw))
            worth.append(0.0)
        side = max(face_w * 0.75, mw * 1.5)
        for y in (-up, 0.0, self.chin * 0.5, self.chin, self.chin + 0.6 * mw):
            extra += [(-side, y), (side, y)]
            worth += [0.0, 0.0]
        pts = np.vstack([spots, extra]) / mw
        vals = np.concatenate([values, worth])
        step = 4
        coarse = _spline(pts, vals, m.X[::step, ::step] / mw, m.Y[::step, ::step] / mw)
        jaw = cv2.resize(coarse.astype(np.float32), (m.X.shape[1], m.X.shape[0]), interpolation=cv2.INTER_LINEAR)
        self.jaw = np.clip((jaw - 0.02) / 0.98, 0, 1.05)
        # the lower lip moves in one piece, blending into the jaw towards the chin
        t = smoothstep((m.Y - self.seam) / max(1.0, self.chin * 0.6))
        self.follow = ((self.profile * (1 - t) + self.jaw * t) * m.edge).astype(np.float32)
        self.lift = (self.profile * np.exp(-(np.maximum(self.seam - m.Y, 0) / (mw * 0.26)) ** 2) * m.edge).astype(np.float32)
        self.near = np.exp(-((m.X / (mw * 0.8)) ** 2) - ((m.Y - self.seam) / (mw * 0.36)) ** 2).astype(np.float32)
        # the colour of the inside: the darkest tones of the photo's own mouth line
        band = (np.abs(m.Y - self.seam) < max(2.0, mw * 0.13)) & (np.abs(m.X) < self.half * 1.05)  # corners included
        roi = photo[m.y0:m.y1, m.x0:m.x1][band].astype(np.float32)
        if len(roi) > 10:
            light = roi @ np.array((0.3, 0.59, 0.11), np.float32)
            dark = np.median(roi[light <= np.percentile(light, 9)], axis=0)
        else:
            dark = np.array((70, 35, 35), np.float32)
        dark = dark * min(1.0, 62.0 / max(1.0, float(dark @ np.array((0.3, 0.59, 0.11)))))  # a mouth is dark inside
        self.dark = (dark * 0.75).astype(np.float32)
        self.shadow = (dark * np.array((1.05, 0.86, 0.86), np.float32)).astype(np.float32)
        speck = rng.standard_normal(m.X.shape).astype(np.float32)
        self.speck = cv2.GaussianBlur(speck, (0, 0), 0.5) * self.noise * 1.2
        # only the part that can move is worked on in each frame (much faster)
        busy = (self.follow > 0.012) | (self.lift > 0.02) | (self.near * m.edge > 0.08)
        rows, cols = np.nonzero(busy.any(axis=1))[0], np.nonzero(busy.any(axis=0))[0]
        y0, y1 = (int(rows.min()), int(rows.max()) + 1) if len(rows) else (0, m.X.shape[0])
        x0, x1 = (int(cols.min()), int(cols.max()) + 1) if len(cols) else (0, m.X.shape[1])
        for name in ("X", "Y", "edge"):
            setattr(m, name, np.ascontiguousarray(getattr(m, name)[y0:y1, x0:x1]))
        for name in ("seam", "profile", "jaw", "follow", "lift", "near", "speck"):
            setattr(self, name, np.ascontiguousarray(getattr(self, name)[y0:y1, x0:x1]))
        m.x1, m.y1 = m.x0 + x1, m.y0 + y1
        m.x0, m.y0 = m.x0 + x0, m.y0 + y0
        # where the opening can ever be
        low = self.seam - mw * 0.2
        high = self.seam + mw * (MAX_GAP * 1.3 + 0.15)
        gap_area = (m.Y > low) & (m.Y < high) & (np.abs(m.X) < self.half * 1.12)
        rows, cols = np.nonzero(gap_area.any(axis=1))[0], np.nonzero(gap_area.any(axis=0))[0]
        self.hole_at = ((slice(int(rows.min()), int(rows.max()) + 1), slice(int(cols.min()), int(cols.max()) + 1))
                        if len(rows) else (slice(0, 1), slice(0, 1)))

    def _mouth(self, img: np.ndarray, opening: float, wide: float) -> None:
        if opening < 0.012 and abs(wide) < 0.05:
            return
        cv2, m, mw = self.cv, self.mouth, self.mw
        X, Y, seam, profile = m.X, m.Y, self.seam, self.profile
        round_ = max(0.0, -wide)
        strength = min(1.0, opening * 4)                     # a shut mouth is not stretched
        stretch = wide * (0.035 if wide > 0 else 0.085) * strength
        half = self.half * (1 + stretch)
        gap = min(opening, 1.3) * mw * MAX_GAP
        raise_ = 0.0 if self.teeth else 0.14                 # visible teeth and the upper lip stay as photographed
        top = seam - raise_ * gap * profile
        bottom = seam + 0.86 * gap * profile
        sx = X / (1 + stretch * self.near * m.edge)
        up = raise_ * gap * self.lift
        down = 0.86 * gap * self.follow
        lower = Y > (top + bottom) / 2
        sy = np.where(lower, Y - down, Y + up)
        inside_x = np.abs(X) < half * 1.15                   # the two lips never borrow from each other
        own = 0.4 if self.teeth else max(0.8, mw * 0.022)
        below, above = seam + max(0.4, mw * 0.012), seam - own
        floor = np.where(Y > seam, np.minimum(Y, below), below)      # the lower lip never reads above the parting
        roof = np.where(Y < seam, np.maximum(Y, above), above)       # and the upper lip never below it
        sy = np.where(inside_x & lower, np.maximum(sy, floor), sy)
        sy = (sy if self.teeth else np.where(inside_x & ~lower, np.minimum(sy, roof), sy)).astype(np.float32)
        cx, cy, ux, uy, vx, vy = (float(a) for a in (*m.c, *m.u, *m.v))
        mx = cx + sx * ux + sy * vx
        my = cy + sx * uy + sy * vy
        warped = cv2.remap(self.base, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        filled = np.zeros(X.shape, bool)
        if gap > 0.5:
            soft = max(1.1, mw * 0.04)
            at = self.hole_at
            x, y, upper_edge, lower_edge = X[at], Y[at], top[at], bottom[at]
            # solid from the parting line down, so no sliver of the other lip is left hanging in the opening
            edge_top = soft * (0.5 if self.teeth else 0.7)
            hole = smoothstep((y - upper_edge) / edge_top + (0.55 if self.teeth else 0.75))
            hole *= smoothstep((lower_edge - y) / soft + 0.4)
            hole *= smoothstep((half * 0.98 - np.abs(x)) / (mw * 0.1))
            hole *= m.edge[at] * min(1.0, gap / max(1.0, mw * 0.05))
            deep = smoothstep(np.minimum(y - upper_edge, lower_edge - y) / max(1.0, gap * 0.45))[:, :, None]
            inside = self.shadow + (self.dark - self.shadow) * deep
            inside *= (1 - 0.3 * np.clip(np.abs(x) / half, 0, 1) ** 2)[:, :, None]
            inside += self.speck[at][:, :, None]
            part = warped[at]
            colour = part[:, :, :3].astype(np.float32)
            colour += (inside - colour) * hole[:, :, None]
            part[:, :, :3] = np.clip(colour + 0.5, 0, 255).astype(np.uint8)
            filled[at] = hole > 0.004
        moved = ((np.abs(sx - X) > 0.02) | (np.abs(sy - Y) > 0.02) | filled) & (m.edge > 0)
        roi = img[m.y0:m.y1, m.x0:m.x1]
        roi[moved] = warped[moved]                           # everything that did not move stays the photo, pixel for pixel

    # -------- eyes
    def _eye_setup(self, cv2, photo, p, shape, rng, side: int) -> dict:
        (a, b), upper_ids, lower_ids = EYES[side]
        ring = np.array([p[i] for i in upper_ids] + [p[i] for i in lower_ids[::-1][1:-1]], np.float64)
        ew = float(np.linalg.norm(p[b] - p[a])) or 6.0
        pad = int(max(3, ew * 0.2))
        x0, y0 = max(0, int(ring[:, 0].min()) - pad), max(0, int(ring[:, 1].min()) - pad)
        x1, y1 = min(shape[1], int(ring[:, 0].max()) + pad + 1), min(shape[0], int(ring[:, 1].max()) + pad + 1)
        size = (x1 - x0, y1 - y0)
        fine = 4
        big = np.zeros((size[1] * fine, size[0] * fine), np.uint8)
        cv2.fillPoly(big, [((ring - (x0, y0)) * fine).astype(np.int32)], 255, cv2.LINE_AA)
        grow = max(1, int(round(ew * 0.05 * fine)))           # a little past the contour, to cover the lashes
        big = cv2.dilate(big, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow * 2 + 1, grow * 2 + 1)))
        mask = cv2.resize(big, size, interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        mask = cv2.GaussianBlur(mask, (0, 0), max(0.7, ew * 0.025))
        gx, gy = np.meshgrid(np.arange(x0, x1, dtype=np.float32), np.arange(y0, y1, dtype=np.float32))
        curve = lambda ids: np.interp(gx[0], *zip(*sorted((float(p[i][0]), float(p[i][1])) for i in ids)))  # noqa: E731
        top = curve(upper_ids)
        bottom = np.maximum(curve(lower_ids), top + 0.5)
        brow = curve(BROWS[side])
        room = np.maximum(top - brow, ew * 0.08)               # the skin between the lid and the eyebrow
        height = np.maximum(bottom - top, 1.0)
        margin = np.minimum(ew * 0.1, room * 0.3)
        depth = np.minimum(np.maximum(height * 0.9, ew * 0.12), room * 0.45)
        down = np.clip((gy - (top - ew * 0.06)) / (height + ew * 0.12), 0, 1)
        source_y = (top - margin - depth * (1 - down)).astype(np.float32)
        patch = cv2.remap(np.ascontiguousarray(photo), gx.astype(np.float32), source_y, cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        patch = cv2.GaussianBlur(patch, (0, 0), sigmaX=max(0.8, ew * 0.045), sigmaY=max(0.5, ew * 0.012))
        under = cv2.remap(np.ascontiguousarray(photo), gx.astype(np.float32),
                          (bottom + np.maximum(ew * 0.16, 2.0) + 0 * gy).astype(np.float32), cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        covered = mask > 0.5
        if covered.any():  # half way between the skin above and below the eye
            wanted = (np.median(patch[covered], axis=0) + np.median(under[covered], axis=0)) / 2
            patch *= np.clip(wanted / np.maximum(np.median(patch[covered], axis=0), 1.0), 0.82, 1.12)
        shade = (0.95 - 0.1 * down ** 3 + 0.05 * np.exp(-((down - 0.55) / 0.22) ** 2)          # the lid is round
                 - 0.07 * np.exp(-((down - 0.12) / 0.1) ** 2))                                 # with a soft crease
        patch *= shade[:, :, None]
        patch += (cv2.GaussianBlur(rng.standard_normal(gy.shape).astype(np.float32), (0, 0), 0.5) * self.noise * 1.2)[:, :, None]
        if self.blink_limit < 1:  # glasses: if a frame or a dark reflection would be copied onto the lid, no blinking
            luma = np.array((0.3, 0.59, 0.11), np.float32)
            copied = (patch @ luma)[mask > 0.5]
            if copied.size and float((copied < np.median(copied) * 0.62).mean()) > 0.14:
                self.blink_limit = 0.0
        line = (np.abs(gy - top) < max(1.0, ew * 0.05)) & (mask > 0.5)
        sample = photo[y0:y1, x0:x1][line].astype(np.float32)
        if len(sample) > 6:
            light = sample @ np.array((0.3, 0.59, 0.11), np.float32)
            lash = np.median(sample[light <= np.percentile(light, 25)], axis=0) * 0.85
        else:
            lash = np.array((60, 42, 38), np.float32)
        middle, reach = float(p[[a, b], 0].mean()), ew * 0.54
        across = np.clip(1 - (np.abs(gx - middle) / reach) ** 4, 0, 1)
        return {"box": (x0, y0, x1, y1), "mask": mask, "patch": np.clip(patch, 0, 255), "y": gy, "top": top.astype(np.float32),
                "bottom": (bottom + ew * 0.035).astype(np.float32), "lash": lash.astype(np.float32), "across": across,
                "width": ew}

    def _blink(self, img: np.ndarray, shut: float) -> None:
        shut = min(float(shut), 1.0) * self.blink_limit
        if shut < 0.04:
            return
        for e in self.eyes:
            x0, y0, x1, y1 = e["box"]
            y, ew = e["y"], e["width"]
            lid = e["top"] + (e["bottom"] - e["top"]) * shut
            soft = max(0.8, ew * 0.03)
            cover = (e["mask"] * smoothstep((lid - y) / soft + 0.5) * min(1.0, shut / 0.2))[:, :, None]
            roi = img[y0:y1, x0:x1, :3]
            out = roi.astype(np.float32) * (1 - cover) + e["patch"] * cover
            thick = max(0.8, ew * 0.042) * (0.6 + 0.4 * e["across"])
            lash = np.exp(-((y - lid + soft * 0.5) / thick) ** 2) * e["across"] * np.clip(e["mask"] * 1.4, 0, 1)
            lash = (lash * min(1.0, max(0.0, shut - 0.12) * 1.6) * 0.9)[:, :, None]
            out = out * (1 - lash) + e["lash"] * lash
            roi[:] = np.clip(out + 0.5, 0, 255).astype(np.uint8)

    # -------- head
    def _head(self, img: np.ndarray, tilt: float, dx: float, dy: float) -> np.ndarray:
        rows, (c0, c1) = self.head_rows, self.head_cols
        gx, gy, w = self.gx[:rows, c0:c1], self.gy[:rows, c0:c1], self.head_weight[:rows, c0:c1]
        a = math.radians(tilt)
        cos, sin = math.cos(a), math.sin(a)
        px, py = float(self.pivot[0]), float(self.pivot[1])
        rx, ry = gx - px, gy - py
        mx = gx + w * (cos * rx + sin * ry - rx - dx * self.face_w)
        my = gy + w * (-sin * rx + cos * ry - ry - dy * self.face_w)
        out = img.copy()
        out[:rows, c0:c1] = self.cv.remap(img, mx, my, self.cv.INTER_LINEAR, borderMode=self.cv.BORDER_REPLICATE)
        return out

    def frame(self, opening: float = 0.0, wide: float = 0.0, shut: float = 0.0, head=(0.0, 0.0, 0.0)):
        """-> (rgb uint8, how solid uint8)"""
        img = self.base.copy()
        self._mouth(img, float(opening), float(wide))
        self._blink(img, float(shut))
        if any(abs(float(v)) > 1e-5 for v in head):
            img = self._head(img, float(head[0]), float(head[1]), float(head[2]))
        return img[:, :, :3], img[:, :, 3]


# ================================================================== engines
class Performance:
    """What the face does over the whole voiceover, and the puppet that acts it."""

    def __init__(self, puppet: Puppet, samples: np.ndarray, words: list[dict], duration: float, motion: dict):
        motion = {**DEFAULT_MOTION, **(motion or {})}
        self.puppet = puppet
        self.opening, self.wide = timeline(samples, words, duration, not motion.get("recording"))
        n = len(self.opening)
        strength = max(0.3, min(1.6, float(motion["mouth"])))
        self.opening = np.clip(self.opening * strength, 0, 1)
        self.shut = blinks(n) if motion["blink"] else np.zeros(n, np.float32)
        self.head = head_motion(n, loudness(samples, n)) * max(0.0, min(2.0, float(motion["head"])))

    def frame(self, index: int):
        i = max(0, min(len(self.opening) - 1, index))
        return self.puppet.frame(self.opening[i], self.wide[i], self.shut[i], self.head[i])


class LocalEngine:
    id = "pc"
    name = "This computer"
    note = "Animates your photo itself on this computer: free, private and quick."

    def open(self, folder: Path, size: tuple[int, int], box: tuple[int, int, int, int], samples: np.ndarray,
             words: list[dict], duration: float, motion: dict) -> Performance:
        """The presenter of this video (folder: photo.png, cutout.png, face.npy), the part `box` of the photo,
        drawn at `size`."""
        cut = Image.open(folder / "cutout.png").convert("RGBA").crop(box).resize(size, Image.LANCZOS)
        arr = np.asarray(cut)
        points = np.load(folder / "face.npy")[:, :2]
        limit = eye_check(np.asarray(Image.open(folder / "photo.png").convert("RGB")), points)["blink"]
        points = (points - (box[0], box[1])) * (size[0] / (box[2] - box[0]), size[1] / (box[3] - box[1]))
        return Performance(Puppet(arr[:, :, :3], arr[:, :, 3], points, limit), samples, words, duration, motion)


ENGINES = {LocalEngine.id: LocalEngine()}


def engine(name: str = "pc"):
    return ENGINES.get(name) or ENGINES["pc"]
