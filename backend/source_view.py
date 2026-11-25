"""YT Guru — the documentary "source on a web page" picture (the source() tool of Script mode).

Draws RGBA frames with Pillow (no browser, no 3D engine — fast on a CPU-only PC):
  the captured page floats in in 3D perspective -> the camera pans and zooms to the quote ->
  the page goes out of focus and darker -> the paragraph lifts toward the camera ->
  its words are marked one by one at the moments the narrator says them -> fade out.
Without a capture (blocked page, quote not found) the same motion shows a clean quote card.
The blurred page is made once (tools_source); a picture that does not change is not drawn again.
"""
from __future__ import annotations

import math
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

FONTS = Path(__file__).resolve().parent / "fonts"
BICUBIC, BILINEAR = Image.Resampling.BICUBIC, Image.Resampling.BILINEAR
PERSPECTIVE = Image.Transform.PERSPECTIVE
MARK = (255, 214, 48)
EXIT = 0.4


def _font(name: str, size: float):
    try:
        return ImageFont.truetype(str(FONTS / name), max(8, int(size)))
    except OSError:
        return ImageFont.load_default()


def _clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def _ease(t):  # smooth start and stop
    t = _clamp(t)
    return t * t * t * (t * (t * 6 - 15) + 10)


def _back(t):  # a little overshoot: the paragraph "pops" toward the camera
    t = _clamp(t) - 1
    return 1 + t * t * (2.1 * t + 1.1)


def _lerp(a, b, t):
    return a + (b - a) * t


def _coeffs(out_quad, in_quad):
    """Pillow's perspective numbers: for each output point, where to read in the input picture."""
    A, B = [], []
    for (x, y), (u, v) in zip(out_quad, in_quad):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        B.extend([u, v])
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def _warp(canvas: Image.Image, img: Image.Image, in_quad, out_quad, alpha: float = 1.0, quality=BICUBIC) -> None:
    """Draws the in_quad part of img onto the out_quad of the canvas (only that area is computed)."""
    W, H = canvas.size
    xs, ys = [p[0] for p in out_quad], [p[1] for p in out_quad]
    x0, y0 = max(0, int(min(xs)) - 1), max(0, int(min(ys)) - 1)
    x1, y1 = min(W, int(max(xs)) + 2), min(H, int(max(ys)) + 2)
    if x1 - x0 < 2 or y1 - y0 < 2 or alpha <= 0.003:
        return
    try:
        c = _coeffs([(x - x0, y - y0) for x, y in out_quad], in_quad)
    except np.linalg.LinAlgError:
        return
    layer = img.transform((x1 - x0, y1 - y0), PERSPECTIVE, c, quality)
    if alpha < 0.997:
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * alpha)))
    canvas.alpha_composite(layer, (x0, y0))


def _project(points, rx: float, ry: float, focal: float):
    """3D tilt (degrees) of flat points given around the screen centre, seen in perspective."""
    a, b = math.radians(rx), math.radians(ry)
    out = []
    for x, y in points:
        y2, z = y * math.cos(a), y * math.sin(a)
        x2, z2 = x * math.cos(b) - z * math.sin(b), x * math.sin(b) + z * math.cos(b)
        k = focal / max(focal * 0.35, focal + z2)
        out.append((x2 * k, y2 * k))
    return out


def _rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius, fill=255)
    img = img.convert("RGBA")
    img.putalpha(mask)
    return img


def _nice_date(raw: str) -> str:
    m = re.match(r"\s*(\d{4})-(\d{2})-(\d{2})", raw or "")
    if not m:
        return (raw or "").strip()[:24]
    months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return f"{d} {months[mo - 1]} {y}" if 1 <= mo <= 12 else str(y)


# ------------------------------------------------------------------ the quote card (when there is no capture)
def _quote_card(data: dict, quote: str, width: int):
    """A clean card: site, date, the quote, the page. -> (picture, [[word, x, y, w, h], ...])"""
    s = width / 1500.0
    pad = int(90 * s)
    words = quote.split()
    size = int(76 * s)
    while True:
        font = _font("DMSerifDisplay-Regular.ttf", size)
        space, lh = font.getlength(" "), int(size * 1.42)
        rects, x, y = [], 0.0, 0
        for w in words:
            ww = font.getlength(w)
            if x and x + ww > width - 2 * pad:
                x, y = 0.0, y + lh
            rects.append([w, x, y, ww, int(size * 1.22)])
            x += ww + space
        if y + lh <= width * 0.42 or size <= 34 * s:
            break
        size -= max(1, int(4 * s))
    top = int(215 * s)
    height = top + rects[-1][2] + int(size * 1.3) + int(150 * s)
    card = Image.new("RGB", (width, height), (251, 248, 241))
    d = ImageDraw.Draw(card)
    d.rectangle([0, 0, int(18 * s), height], fill=(242, 169, 59))
    site = (data.get("site") or data.get("domain") or "Source").strip()[:48]
    d.text((pad, int(62 * s)), site, font=_font("Poppins-Bold.ttf", 50 * s), fill=(27, 36, 51))
    date = _nice_date(data.get("date", ""))
    if date:
        d.text((width - pad, int(70 * s)), date, font=_font("Poppins-Medium.ttf", 36 * s), fill=(120, 124, 134), anchor="ra")
    d.line([pad, int(160 * s), width - pad, int(160 * s)], fill=(224, 218, 204), width=max(1, int(3 * s)))
    d.text((pad - int(62 * s), top - int(40 * s)), "“", font=_font("DMSerifDisplay-Regular.ttf", 120 * s), fill=(242, 169, 59))
    for r in rects:
        r[1] += pad
        r[2] += top
        d.text((r[1], r[2]), r[0], font=font, fill=(28, 30, 36))
    foot = (data.get("domain") or "")[:70]
    d.text((pad, height - int(92 * s)), foot, font=_font("Poppins-Medium.ttf", 36 * s), fill=(95, 105, 125))
    return card, rects


class View:
    """One source() picture. times() sets the timeline; frame(t) draws the moment t (seconds from its start)."""

    def __init__(self, data: dict, quote: str, width: int, height: int):
        self.W, self.H = width, height
        self.tall = height > width
        self.data = data
        self.page = None
        self.cache_key, self.cache = None, None
        self.page_key, self.page_layer = None, None
        self.under_key, self.under = None, None  # page + shadow: unchanged while only the marker moves
        if data.get("ok"):
            try:
                self._load_page()
            except Exception:  # noqa: BLE001 — a damaged cache picture: the quote card
                self.page = None
        if self.page is None:
            self.card_base, rects = _quote_card(data, quote, 1500 if not self.tall else 1100)
            self.words = rects
        cw, ch = self.card_base.size
        self.card_hl = None
        self.hl_state = None
        light = np.asarray(self.card_base.convert("L").resize((64, 64))).mean()
        self.dark_page = light < 110
        radius = max(10, int(cw * 0.016))
        self.card_mask = Image.new("L", (cw, ch), 0)
        ImageDraw.Draw(self.card_mask).rounded_rectangle([0, 0, cw - 1, ch - 1], radius, fill=255)
        # where the card ends up: wide enough to read, above the captions
        max_w, max_h = (0.9, 0.5) if self.tall else (0.84, 0.64)
        k = min(max_w * width / cw, max_h * height / ch, 1.9 * width / 1280)
        self.end_w, self.end_h = cw * k, ch * k
        self.end_center = (width / 2, height * 0.46)
        # the soft shadow, made once (small: it is blurred)
        sw = 360
        sh = max(40, int(sw * ch / cw))
        m = int(sw * 0.12)
        shadow = Image.new("L", (sw + 2 * m, sh + 2 * m), 0)
        ImageDraw.Draw(shadow).rounded_rectangle([m, m, m + sw, m + sh], int(sw * 0.03), fill=190)
        shadow = shadow.filter(ImageFilter.GaussianBlur(m * 0.45))
        self.shadow = Image.new("RGBA", shadow.size, (0, 0, 0, 255))
        self.shadow.putalpha(shadow)
        self.shadow_pad = (m / sw, m / sh)
        self.bg = self._background()
        self.chip = self._chip()
        self.hl_words = self.words
        self.hl_times: list[float] = []
        self.hl_dur: list[float] = []
        self.dur, self.intro, self.exit = 4.0, 2.0, True

    # -------------------------------------------------------------- pictures made once
    def _load_page(self):
        d = self.data
        self.page = Image.open(d["image"]).convert("RGBA")
        self.blur = Image.open(d["blur"]).convert("RGBA")
        self.mips = [(1.0, self.page)]
        for f in (0.5, 0.25):
            self.mips.append((f, self.page.resize((int(self.page.width * f), int(self.page.height * f)), Image.Resampling.LANCZOS)))
        x, y, w, h = d["card"]
        pad_x, pad_y = 34, 26  # screenshot pixels (2x)
        box = (max(0, int(x) - 8), max(0, int(y) - 6), min(self.page.width, int(x + w) + 9), min(self.page.height, int(y + h) + 7))
        crop = self.page.crop(box).convert("RGB")
        edge = np.asarray(crop)
        ring = np.concatenate([edge[0], edge[-1], edge[:, 0], edge[:, -1]])
        paper = tuple(int(v) for v in np.median(ring, axis=0))
        card = Image.new("RGB", (crop.width + 2 * pad_x, crop.height + 2 * pad_y), paper)
        card.paste(crop, (pad_x, pad_y))
        self.card_base = card
        dx, dy = pad_x - box[0], pad_y - box[1]
        self.words = [[t, wx + dx, wy + dy, ww, wh] for t, wx, wy, ww, wh in d["words"]]
        self.card_on_page = (-dx, -dy, card.width - dx, card.height - dy)

    def _background(self):
        W, H = self.W, self.H
        yy, xx = np.mgrid[0:90, 0:160]
        r = np.sqrt(((xx - 80) / 110) ** 2 + ((yy - 38) / 70) ** 2)
        a, b = np.array([38, 52, 76.0]), np.array([13, 18, 28.0])
        img = a + (b - a) * np.clip(r, 0, 1)[..., None]
        return Image.fromarray(img.astype(np.uint8), "RGB").resize((W, H), BICUBIC).convert("RGBA")

    def _chip(self):
        """The site's name at the top: where the fact comes from."""
        u = min(self.W, self.H) / 720.0
        name = self.data.get("domain") or self.data.get("site") or "source"
        date = _nice_date(self.data.get("date", ""))
        f1, f2 = _font("Poppins-Bold.ttf", 24 * u), _font("Poppins-Medium.ttf", 19 * u)
        w1, w2 = f1.getlength(name), f2.getlength(date) + 18 * u if date else 0
        h = int(52 * u)
        chip = Image.new("RGBA", (int(w1 + w2 + 78 * u), h), (0, 0, 0, 0))
        d = ImageDraw.Draw(chip)
        d.rounded_rectangle([0, 0, chip.width - 1, h - 1], h // 2, fill=(12, 17, 27, 225), outline=(242, 169, 59, 255),
                            width=max(1, int(2 * u)))
        d.ellipse([20 * u, h / 2 - 7 * u, 34 * u, h / 2 + 7 * u], fill=(242, 169, 59, 255))
        d.text((48 * u, h / 2), name, font=f1, fill=(244, 240, 230, 255), anchor="lm")
        if date:
            d.text((48 * u + w1 + 18 * u, h / 2 + 1), date, font=f2, fill=(170, 178, 195, 255), anchor="lm")
        return chip

    # -------------------------------------------------------------- the timeline
    def choose(self, phrases) -> bool:
        """Mark only these words/phrases of the quote. False when none of them is in it (then: all)."""
        if not phrases:
            return True
        norm = lambda t: re.sub(r"[^\w%$€£]+", "", str(t).lower())  # noqa: E731
        parts = [norm(w[0]) for w in self.words]
        stream = "".join(parts)
        owner = [i for i, p in enumerate(parts) for _ in p]
        keep: set[int] = set()
        for ph in ([phrases] if isinstance(phrases, str) else list(phrases)):
            n = norm(ph)
            a = stream.find(n) if n else -1
            if a >= 0:
                keep.update(owner[a:a + len(n)])
        if not keep:
            return False
        self.hl_words = [self.words[i] for i in sorted(keep)]
        return True

    def times(self, hl_times: list[float], intro: float, duration: float, leaves: bool):
        self.intro, self.dur, self.exit = intro, duration, leaves
        self.hl_times = hl_times
        self.hl_dur = [_clamp((hl_times[i + 1] - t) if i + 1 < len(hl_times) else 0.3, 0.07, 0.32) for i, t in enumerate(hl_times)]

    # -------------------------------------------------------------- one frame
    def _page_camera(self, p_move: float):
        """The camera on the page: from the whole floating sheet to the quote."""
        W, H = self.W, self.H
        pw, ph = self.page.size
        cx0, cy0, cx1, cy1 = self.card_on_page
        s0 = (0.9 if self.tall else 0.6) * W / pw
        s1 = _clamp((0.96 if self.tall else 0.8) * W / max(1, cx1 - cx0), s0 * 1.25, 1.35 * W / 1280)
        start = (pw / 2, min(ph / 2, max(H * 0.5 / s0, (cy0 + cy1) / 2 - H * 0.9 / s0)))
        end = ((cx0 + cx1) / 2, (cy0 + cy1) / 2)
        e = _ease(p_move)
        s = math.exp(_lerp(math.log(s0), math.log(s1), e))
        return (_lerp(start[0], end[0], e), _lerp(start[1], end[1], e)), s

    def _page_quad(self, rect, center, s, rx, ry, dy):
        x0, y0, x1, y1 = rect
        pts = [((x - center[0]) * s, (y - center[1]) * s) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
        return [(x + self.W / 2, y + self.H * 0.47 + dy) for x, y in _project(pts, rx, ry, self.W * 1.7)]

    def _marked_card(self, t: float) -> Image.Image:
        state = tuple(round(_clamp((t - at) / d), 2) for at, d in zip(self.hl_times, self.hl_dur))
        if state == self.hl_state and self.card_hl is not None:
            return self.card_hl
        mask = Image.new("L", self.card_base.size, 0)
        d = ImageDraw.Draw(mask)
        prev = None  # [x_end, y, h] of the word before: one continuous marker along a line
        for (_w, x, y, w, h), p in zip(self.hl_words, state):
            if p <= 0:
                prev = None
                continue
            left = x - h * 0.08
            if prev and abs(prev[1] - y) < h * 0.5 and 0 <= x - prev[0] < h * 1.2:
                left = prev[0] - 2
            right = x + (w + h * 0.08) * p
            if right > left + 1:
                d.rounded_rectangle([left, y + h * 0.04, right, y + h * 0.98], h * 0.18, fill=255)
            prev = [x + w, y, h] if p >= 0.999 else None
        base = self.card_base
        if self.dark_page:
            tinted = Image.blend(base, Image.new("RGB", base.size, MARK), 0.38)
        else:
            tinted = ImageChops.multiply(base, Image.new("RGB", base.size, MARK))
        out = Image.composite(tinted, base, mask).convert("RGBA")
        out.putalpha(self.card_mask)
        self.hl_state, self.card_hl = state, out
        return out

    def frame(self, t: float) -> np.ndarray:
        D = self.intro
        p_in = _clamp(t / (D * 0.4))
        p_move = _clamp((t - D * 0.22) / (D * 0.56))
        if self.page is None:
            p_move = _clamp(t / D)
        p_blur = _ease((t - D * 0.62) / (D * 0.36))
        p_lift = _clamp((t - D * 0.64) / (D * 0.36))
        fade = _ease(t / 0.35)
        if self.exit:
            fade = min(fade, _ease((self.dur - t) / EXIT))
        marks = tuple(round(_clamp((t - at) / d), 2) for at, d in zip(self.hl_times, self.hl_dur))
        key = (round(p_in, 3), round(p_move, 3), round(p_blur, 3), round(p_lift, 3), round(fade, 3), marks)
        if key == self.cache_key:
            return self.cache
        W, H = self.W, self.H
        card = self._marked_card(t)
        cw, ch = card.size
        cx, cy = self.end_center
        end_pts = [(-self.end_w / 2, -self.end_h / 2), (self.end_w / 2, -self.end_h / 2),
                   (self.end_w / 2, self.end_h / 2), (-self.end_w / 2, self.end_h / 2)]
        end_quad = [(x + cx, y + cy) for x, y in _project(end_pts, 4.0, -5.5, W * 1.7)]
        if self.page is not None:
            center, s = self._page_camera(p_move)
            e = _ease(p_move)
            rx, ry = _lerp(30, 9, e), _lerp(-20, -6, e)
            dy = (1 - _ease(p_in)) * H * 0.35
            page_key = (key[0], key[1], key[2])
            if page_key != self.page_key:
                layer = self.bg.copy()
                # only the part of the page the camera can see
                half_w, half_h = W * 1.05 / s, H * 1.25 / s
                rect = (max(0.0, center[0] - half_w), max(0.0, center[1] - half_h),
                        min(float(self.page.width), center[0] + half_w), min(float(self.page.height), center[1] + half_h))
                quad = self._page_quad(rect, center, s, rx, ry, dy)
                if p_blur < 0.999:
                    f, img = next((m for m in reversed(self.mips) if m[0] >= s * 0.9), self.mips[0])
                    x0, y0, x1, y1 = (v * f for v in rect)
                    _warp(layer, img, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], quad, _ease(p_in * 1.6))
                if p_blur > 0.001:
                    x0, y0, x1, y1 = (v * 0.5 for v in rect)
                    _warp(layer, self.blur, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], quad, p_blur, BILINEAR)
                self.page_key, self.page_layer = page_key, layer
            start_quad = self._page_quad(self.card_on_page, center, s, rx, ry, dy)
            card_alpha = _ease((t - D * 0.6) / (D * 0.14))
            lift = _back(p_lift)
        else:
            e = _ease(p_move)
            k = _lerp(0.55, 1.0, e)
            pts = [(x * k, y * k) for x, y in end_pts]
            start_quad = None
            quad = [(x + cx, y + cy + (1 - e) * H * 0.45) for x, y in _project(pts, _lerp(34, 4.0, e), _lerp(-24, -5.5, e), W * 1.7)]
            end_quad, card_alpha, lift = quad, _ease(t / (D * 0.35)), 1.0
        under_key = (key[0], key[1], key[2], key[3], round(card_alpha, 3))
        reuse = under_key == self.under_key
        canvas = self.under.copy() if reuse else (self.page_layer if self.page is not None else self.bg).copy()
        if card_alpha > 0.003:
            q = end_quad if start_quad is None else [(_lerp(a[0], b[0], lift), _lerp(a[1], b[1], lift))
                                                     for a, b in zip(start_quad, end_quad)]
            depth = _ease(p_lift) if self.page is not None else _ease(p_move)
            if depth > 0.003 and not reuse:
                # shadow: the card's outline grown by the blur margin, dropped further the higher it floats
                mx, my = self.shadow_pad
                sw, sh = self.shadow.size
                try:
                    to_q = _coeffs([(0, 0), (1, 0), (1, 1), (0, 1)], q)
                except np.linalg.LinAlgError:
                    to_q = None
                if to_q:
                    a, b, c, d_, e_, f_, g, h_ = to_q
                    drop = H * 0.045 * depth
                    sq = []
                    for u, v in ((-mx, -my), (1 + mx, -my), (1 + mx, 1 + my), (-mx, 1 + my)):
                        den = g * u + h_ * v + 1
                        sq.append(((a * u + b * v + c) / den + drop * 0.35, (d_ * u + e_ * v + f_) / den + drop))
                    _warp(canvas, self.shadow, [(0, 0), (sw, 0), (sw, sh), (0, sh)], sq, depth * card_alpha, BILINEAR)
            if not reuse:
                self.under_key, self.under = under_key, canvas.copy()
            _warp(canvas, card, [(0, 0), (cw, 0), (cw, ch), (0, ch)], q, card_alpha)
        if self.page is not None:
            a = _ease((t - 0.25) / 0.4)
            if a > 0.003:
                chip = self.chip
                if a < 0.997:
                    chip = chip.copy()
                    chip.putalpha(chip.getchannel("A").point(lambda v: int(v * a)))
                canvas.alpha_composite(chip, (int(W * 0.035), int(H * 0.05 - (1 - a) * 20)))
        arr = np.asarray(canvas).copy()
        arr[..., 3] = int(round(255 * fade))
        self.cache_key, self.cache = key, arr
        return arr


# ------------------------------------------------------------------ sync with the narration
def sync_times(words: list, narration: list, start: float) -> tuple[list, int]:
    """For every marked word: the second the narrator says it (None when he does not), looking from
    `start` on. narration = [(normalised word, seconds), ...]. -> (times, how many were found)"""
    def norm(t):
        return re.sub(r"[^a-z0-9%]+", "", str(t).lower())
    said = [(norm(w), t) for w, t in narration]
    first = next((i for i, (_w, t) in enumerate(said) if t >= start - 0.6), len(said))
    marked = [norm(w[0]) for w in words]
    small = {"the", "a", "an", "of", "to", "in", "on", "and", "or", "is", "it", "its", "was", "for", "that", "by", "at", "as"}

    def match(frm):
        out, ptr = [], frm
        for w in marked:
            reach = 3 if (len(w) < 3 or w in small) else 14
            hit = next((j for j in range(ptr, min(len(said), ptr + reach)) if w and said[j][0] == w), None)
            if hit is None:
                out.append(None)
            else:
                out.append(said[hit][1])
                ptr = hit + 1
        return out
    # begin at the narration word that matches best (the narrator may start the fact later)
    best, score = [None] * len(marked), 0
    for frm in range(first, max(first + 1, len(said))):
        got = match(frm)
        value = sum((0.2 if m in small else 1.0) for m, g in zip(marked, got) if g is not None)
        if value > score + 0.01:
            best, score = got, value
    if score < min(1.5, len(marked)):  # only stray small words: not really said
        return [None] * len(marked), 0
    return best, sum(g is not None for g in best)


def fill_times(found: list, earliest: float, latest: float) -> list[float]:
    """A time for every marked word: never before `earliest`, always in order; unsaid words fall in between."""
    n = len(found)
    if not any(t is not None for t in found):
        step = min(0.2, max(0.04, (latest - earliest - 0.4) / max(1, n)))
        return [earliest + 0.1 + i * step for i in range(n)]
    out = list(found)
    known = [i for i, t in enumerate(out) if t is not None]
    for i in range(n):
        if out[i] is not None:
            continue
        a = max((k for k in known if k < i), default=None)
        b = min((k for k in known if k > i), default=None)
        if a is None:
            out[i] = found[b] - 0.16 * (b - i)
        elif b is None:
            out[i] = found[a] + 0.2 * (i - a)
        else:
            out[i] = found[a] + (found[b] - found[a]) * (i - a) / (b - a)
    prev = earliest
    for i in range(n):
        out[i] = max(prev, out[i] - 0.05)
        prev = out[i] + 0.06
    return [min(t, max(earliest, latest - 0.2)) for t in out]
