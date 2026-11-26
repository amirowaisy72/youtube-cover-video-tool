"""YT Guru — the headlines montage (headlines() in Script mode): real headlines from the source pages slam
onto the screen one after another, documentary style. Drawn with Pillow like source_view.py: each card is
made once; a frame only places the cards (and nothing is redrawn while nothing moves).

A card shows the photograph of the page's own headline. When the page could be read but not photographed it
shows the page's title as text; a text the scene code supplied for an unreadable page is marked "summary",
never presented as the site's headline.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from source_view import BICUBIC, _clamp, _ease, _font, _nice_date

SLAM = 0.24
EXIT = 0.35
PAPER = (250, 248, 242)


def _wrap(text, font, width, most):
    lines, cur = [], ""
    for w in str(text).split():
        trial = f"{cur} {w}".strip()
        if cur and font.getlength(trial) > width:
            lines.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        lines.append(cur)
    if len(lines) > most:
        lines = lines[:most]
        lines[-1] = lines[-1].rstrip(".,;:") + "…"
    return lines


def _trim(shot: Image.Image) -> Image.Image:
    """The photograph without its empty margins, so the headline fills the card."""
    a = np.asarray(shot).astype(np.int16)
    ring = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    paper = np.median(ring, axis=0)
    ink = (np.abs(a - paper).sum(axis=2) > 60)
    rows, cols = np.where(ink.any(axis=1))[0], np.where(ink.any(axis=0))[0]
    if not len(rows) or not len(cols):
        return shot
    pad = 14
    return shot.crop((max(0, cols[0] - pad), max(0, rows[0] - pad), min(shot.width, cols[-1] + pad),
                      min(shot.height, rows[-1] + pad)))


def card_picture(item: dict, width: int, max_height: int) -> Image.Image:
    """One headline card: the site and date above the headline (photograph, or typeset text)."""
    s = width / 1000.0
    pad, bar = int(34 * s), int(78 * s)
    body = None
    if item.get("image"):
        try:
            shot = _trim(Image.open(item["image"]).convert("RGB"))
            k = min((width - 2 * pad) / shot.width, (max_height - bar - pad) / shot.height, 1.4 * s)
            body = shot.resize((max(1, int(shot.width * k)), max(1, int(shot.height * k))), Image.Resampling.LANCZOS)
        except (OSError, ValueError):
            body = None
    if body is None:
        size = int(62 * s)
        while True:
            font = _font("DMSerifDisplay-Regular.ttf", size)
            lines = _wrap(item.get("headline") or item.get("domain") or "", font, width - 2 * pad, 3)
            h = int(len(lines) * size * 1.25) + int(10 * s)
            if h <= max_height - bar - pad or size < 24:
                break
            size -= 4
        body = Image.new("RGB", (width - 2 * pad, h), PAPER)
        d = ImageDraw.Draw(body)
        for i, line in enumerate(lines):
            d.text((0, i * size * 1.25), line, font=font, fill=(24, 26, 32))
    paper = PAPER
    if item.get("image") and body is not None:  # the card takes the page's own background colour
        edge = np.asarray(body)
        ring = np.concatenate([edge[0], edge[-1], edge[:, 0], edge[:, -1]])
        paper = tuple(int(v) for v in np.median(ring, axis=0))
    card = Image.new("RGB", (width, bar + body.height + pad), paper)
    d = ImageDraw.Draw(card)
    d.rectangle([0, 0, width, bar], fill=(19, 25, 38))
    d.rectangle([0, 0, int(12 * s), bar], fill=(242, 169, 59))
    name = (item.get("site") or "").strip()
    name = name if 0 < len(name) <= 30 else (item.get("domain") or name)[:40]  # a long official name: the web address
    d.text((pad, bar / 2), name, font=_font("Poppins-Bold.ttf", 34 * s), fill=(244, 240, 230), anchor="lm")
    right = "summary" if item.get("summary") else _nice_date(item.get("date", ""))
    if right:
        d.text((width - pad, bar / 2), right, font=_font("Poppins-Medium.ttf", 27 * s), fill=(170, 178, 196), anchor="rm")
    card.paste(body, (pad, bar + pad // 2))
    return card.convert("RGBA")


def layout(count: int, tall: bool) -> list[tuple]:
    """(centre x, centre y, width, max height, tilt) as shares of the picture; the bottom stays free for captions."""
    if tall:
        step = {1: 0.0, 2: 0.24, 3: 0.2, 4: 0.165}[count]
        first = {1: 0.45, 2: 0.33, 3: 0.26, 4: 0.2}[count]
        return [(0.5 + (0.012, -0.014, 0.008, -0.01)[i], first + step * i, 0.9, min(0.2, step or 0.3) * 0.94,
                 (-1.4, 1.2, -0.8, 1.0)[i]) for i in range(count)]
    if count == 1:
        return [(0.5, 0.44, 0.8, 0.5, -1.0)]
    if count == 2:
        return [(0.47, 0.27, 0.74, 0.34, -1.5), (0.53, 0.63, 0.74, 0.34, 1.3)]
    if count == 3:
        return [(0.45, 0.19, 0.7, 0.25, -1.6), (0.56, 0.46, 0.7, 0.25, 1.3), (0.47, 0.72, 0.7, 0.25, -0.8)]
    return [(0.265, 0.26, 0.465, 0.36, -1.6), (0.735, 0.29, 0.465, 0.36, 1.4), (0.27, 0.65, 0.465, 0.36, 1.0),
            (0.73, 0.66, 0.465, 0.36, -1.2)]


class Montage:
    def __init__(self, items: list[dict], width: int, height: int):
        self.W, self.H = width, height
        self.cards = []
        for item, (cx, cy, w, h, tilt) in zip(items, layout(len(items), height > width)):
            box_w, box_h = int(w * width), int(h * height)
            pic = card_picture(item, box_w, box_h)
            if pic.height > box_h:
                k = box_h / pic.height
                pic = pic.resize((int(pic.width * k), box_h), Image.Resampling.LANCZOS)
            pic = pic.rotate(tilt, BICUBIC, expand=True)
            m = max(8, int(width * 0.02))
            alpha = Image.new("L", (pic.width + 4 * m, pic.height + 4 * m), 0)
            alpha.paste(pic.getchannel("A").point(lambda v: int(v * 0.66)), (2 * m, 2 * m + m // 2))
            shadow = Image.new("RGBA", alpha.size, (0, 0, 0, 255))
            shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(m)))
            dim = ImageEnhance.Brightness(pic.convert("RGB")).enhance(0.72).convert("RGBA")
            dim.putalpha(pic.getchannel("A"))
            self.cards.append({"pic": pic, "dim": dim, "shadow": shadow, "at": (cx * width, cy * height), "margin": 2 * m})
        self.bg = self._background()
        self.times: list[float] = []
        self.dur, self.leaves = 4.0, False
        self._key, self._frame = None, None

    def _background(self):
        yy, xx = np.mgrid[0:90, 0:160]
        r = np.sqrt(((xx - 80) / 120) ** 2 + ((yy - 40) / 80) ** 2)
        a, b = np.array([34, 44, 66.0]), np.array([9, 13, 22.0])
        img = a + (b - a) * np.clip(r, 0, 1)[..., None]
        return Image.fromarray(img.astype(np.uint8), "RGB").resize((self.W, self.H), BICUBIC).convert("RGBA")

    def timeline(self, times: list[float], duration: float, leaves: bool):
        self.times, self.dur, self.leaves = times, duration, leaves

    def _place(self, canvas, pic, centre, scale, alpha):
        if alpha <= 0.004:
            return
        if abs(scale - 1) > 0.002:
            pic = pic.resize((max(1, int(pic.width * scale)), max(1, int(pic.height * scale))), Image.Resampling.BILINEAR)
        if alpha < 0.996:
            pic = pic.copy()
            pic.putalpha(pic.getchannel("A").point(lambda v: int(v * alpha)))
        x, y = int(centre[0] - pic.width / 2), int(centre[1] - pic.height / 2)
        left, top = max(0, -x), max(0, -y)  # a big card may hang over the edge while it flies in
        right, bottom = min(pic.width, self.W - x), min(pic.height, self.H - y)
        if right > left and bottom > top:
            canvas.alpha_composite(pic.crop((left, top, right, bottom)), (x + left, y + top))

    def frame(self, t: float) -> np.ndarray:
        fade = _ease(t / 0.25)
        if self.leaves:
            fade = min(fade, _ease((self.dur - t) / EXIT))
        states, shake = [], 0.0
        for i, hit in enumerate(self.times[:len(self.cards)]):
            p = _clamp((t - (hit - SLAM)) / SLAM)
            after = t - hit
            bounce = -0.035 * math.sin(math.pi * after / 0.14) if 0 <= after < 0.14 else 0.0
            dimmed = i + 1 < len(self.times) and t >= self.times[i + 1]
            states.append((round(p, 3), round(bounce, 4), dimmed))
            if 0 <= after < 0.18:
                shake = math.sin(after * 90) * (1 - after / 0.18) * self.W * 0.006
        key = (round(fade, 3), tuple(states), round(shake, 1))
        if key == self._key:
            return self._frame
        canvas = self.bg.copy()
        for card, (p, bounce, dimmed) in zip(self.cards, states):
            if p <= 0:
                continue
            scale = 1 + 0.75 * (1 - p) ** 2 + bounce
            centre = (card["at"][0] + shake, card["at"][1] + shake * 0.6)
            alpha = _clamp(p * 1.8)
            if p >= 0.999:
                self._place(canvas, card["shadow"], centre, scale, 1.0)
            self._place(canvas, card["dim"] if dimmed else card["pic"], centre, scale, alpha)
        arr = np.asarray(canvas).copy()
        arr[..., 3] = int(round(255 * fade))
        self._key, self._frame = key, arr
        return arr
