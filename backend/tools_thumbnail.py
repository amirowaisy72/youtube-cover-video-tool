"""Thumbnail Maker — Canva-style 1280x720 YouTube thumbnails.

Free tool: no credits, no license check, no paid APIs. The user uploads
a background image, picks one of 5 templates, and the finished JPG is
rendered with Pillow (DejaVuSans-Bold) and served back for download.

Wiring (done by the parent in backend/main.py):
    from backend.tools_thumbnail import router as thumbnail_router
    app.include_router(thumbnail_router)
"""

from __future__ import annotations

import re
import secrets
import time
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageDraw, ImageFont, ImageOps

BASE_DIR = Path(__file__).resolve().parent.parent
THUMB_DIR = BASE_DIR / "thumbnails"

router = APIRouter(prefix="/api/thumbnail")

W, H = 1280, 720
MAX_IMAGE_MB = 20
MAX_HEADLINE_CHARS = 120
MAX_SUBTEXT_CHARS = 200
NAME_RE = re.compile(r"^[a-f0-9]{16}\.jpg$")

TEMPLATES = ("big-center", "text-left", "top-banner", "bottom-banner", "split")

COLORS: dict[str, tuple[int, int, int]] = {
    "white": (255, 255, 255),
    "yellow": (255, 210, 0),
    "amber": (255, 170, 0),
    "red": (255, 70, 60),
    "cyan": (0, 210, 255),
    "green": (60, 220, 120),
}

_FONT_PATHS = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\arial.ttf",
)


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in _FONT_PATHS:
        try:
            if Path(path).is_file():
                return ImageFont.truetype(str(path), size)
        except Exception:
            continue
    return ImageFont.load_default()


def _lanczos() -> int:
    return getattr(Image, "Resampling", Image).LANCZOS


def _parse_bool(value: str) -> bool:
    return value.strip().lower() in ("1", "true", "yes", "on")


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


def _fit_font(
    draw: ImageDraw.ImageDraw, text: str, start_size: int,
    max_width: int, max_height: int, min_size: int = 28,
):
    """Largest font size (<= start_size) whose wrapped text fits the box."""
    size = start_size
    while size > min_size:
        font = _load_font(size)
        lines = _wrap(draw, text, font, max_width)
        if len(lines) * int(size * 1.18) <= max_height:
            return font, lines
        size -= 6
    font = _load_font(min_size)
    return font, _wrap(draw, text, font, max_width)


def _font_size(font, fallback: int) -> int:
    try:
        return int(font.size)
    except Exception:
        return fallback


def _stroke(font) -> int:
    return max(2, _font_size(font, 32) // 16)


def _draw_line(draw, x: float, y: float, line: str, font, fill, outline: bool) -> None:
    sw = _stroke(font) if outline else 0
    # Soft drop shadow first, then the main text.
    draw.text((x + 4, y + 4), line, font=font, fill=(0, 0, 0),
              stroke_width=sw, stroke_fill=(0, 0, 0))
    draw.text((x, y), line, font=font, fill=fill,
              stroke_width=sw, stroke_fill=(0, 0, 0))


def _draw_centered(draw, lines, font, cx: float, top: float, fill, outline: bool) -> None:
    lh = int(_font_size(font, 96) * 1.18)
    for i, line in enumerate(lines):
        w = draw.textlength(line, font=font)
        _draw_line(draw, cx - w / 2, top + i * lh, line, font, fill, outline)


def _draw_left(draw, lines, font, x: float, top: float, fill, outline: bool) -> None:
    lh = int(_font_size(font, 96) * 1.18)
    for i, line in enumerate(lines):
        _draw_line(draw, x, top + i * lh, line, font, fill, outline)


def _block_height(lines, font) -> int:
    return len(lines) * int(_font_size(font, 96) * 1.18)


def _darken(base: Image.Image, alpha: int) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, alpha))
    base.alpha_composite(overlay)


def _left_scrim(base: Image.Image, width: int = 780, max_alpha: int = 150) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for x in range(width):
        a = int(max_alpha * (1 - x / width))
        od.line([(x, 0), (x, base.height)], fill=(0, 0, 0, a))
    base.alpha_composite(overlay)


def _cleanup_old(max_age_sec: int = 24 * 3600) -> None:
    try:
        now = time.time()
        for path in THUMB_DIR.glob("*.jpg"):
            if now - path.stat().st_mtime > max_age_sec:
                path.unlink(missing_ok=True)
    except Exception:
        pass


def _render(
    img: Image.Image, template: str, headline: str, subtext: str,
    font_size: int, color: tuple[int, int, int], outline: bool,
) -> Image.Image:
    base = ImageOps.fit(img.convert("RGB"), (W, H), method=_lanczos()).convert("RGBA")
    draw = ImageDraw.Draw(base)
    dark = (16, 16, 24, 255)
    white = (255, 255, 255)

    if template == "big-center":
        _darken(base, 70)
        draw = ImageDraw.Draw(base)
        font, lines = _fit_font(draw, headline, font_size, 1080, 460)
        sub_font, sub_lines = (None, [])
        if subtext:
            sub_font, sub_lines = _fit_font(draw, subtext, max(28, int(_font_size(font, 96) * 0.42)), 900, 120)
        total = _block_height(lines, font) + (20 + _block_height(sub_lines, sub_font) if sub_lines else 0)
        top = (H - total) / 2
        # Rounded scrim behind the text block so it pops on any image.
        block_w = max((draw.textlength(l, font=font) for l in lines), default=0)
        draw.rounded_rectangle(
            [640 - block_w / 2 - 44, top - 30, 640 + block_w / 2 + 44,
             top + total + 30],
            radius=28, fill=(0, 0, 0, 110),
        )
        _draw_centered(draw, lines, font, 640, top, color, outline)
        if sub_lines and sub_font:
            _draw_centered(draw, sub_lines, sub_font, 640,
                           top + _block_height(lines, font) + 20, white, outline)

    elif template == "text-left":
        _left_scrim(base)
        draw = ImageDraw.Draw(base)
        font, lines = _fit_font(draw, headline, font_size, 640, 460)
        sub_font, sub_lines = (None, [])
        if subtext:
            sub_font, sub_lines = _fit_font(draw, subtext, max(28, int(_font_size(font, 96) * 0.42)), 600, 120)
        total = _block_height(lines, font) + (20 + _block_height(sub_lines, sub_font) if sub_lines else 0)
        top = (H - total) / 2
        _draw_left(draw, lines, font, 70, top, color, outline)
        if sub_lines and sub_font:
            _draw_left(draw, sub_lines, sub_font, 70,
                       top + _block_height(lines, font) + 20, white, outline)

    elif template in ("top-banner", "bottom-banner"):
        top_band = template == "top-banner"
        band_h = 190
        y0 = 0 if top_band else H - band_h
        draw.rectangle([0, y0, W, y0 + band_h], fill=dark)
        accent_y = y0 + band_h - 8 if top_band else y0
        draw.rectangle([0, accent_y, W, accent_y + 8], fill=color + (255,))
        head_size = min(font_size, 84)
        font, lines = _fit_font(draw, headline, head_size, 1120, 110, min_size=24)
        head_top = y0 + (band_h - _block_height(lines, font)) / 2 - (30 if subtext else 0)
        _draw_centered(draw, lines, font, 640, head_top, color, outline)
        if subtext:
            sub_font, sub_lines = _fit_font(draw, subtext, 34, 1000, 60, min_size=20)
            _draw_centered(draw, sub_lines, sub_font, 640,
                           head_top + _block_height(lines, font) + 8, white, outline)

    elif template == "split":
        draw.rectangle([700, 0, W, H], fill=dark)
        draw.rectangle([700, 0, 708, H], fill=color + (255,))
        font, lines = _fit_font(draw, headline, font_size, 500, 420)
        sub_font, sub_lines = (None, [])
        if subtext:
            sub_font, sub_lines = _fit_font(draw, subtext, max(26, int(_font_size(font, 96) * 0.42)), 480, 140)
        total = _block_height(lines, font) + (20 + _block_height(sub_lines, sub_font) if sub_lines else 0)
        top = (H - total) / 2
        _draw_left(draw, lines, font, 744, top, color, outline)
        if sub_lines and sub_font:
            _draw_left(draw, sub_lines, sub_font, 744,
                       top + _block_height(lines, font) + 20, white, outline)

    return base.convert("RGB")


@router.post("")
async def make_thumbnail(
    image: UploadFile = File(...),
    template: str = Form("big-center"),
    headline: str = Form(""),
    subtext: str = Form(""),
    font_size: str = Form("96"),
    color: str = Form("white"),
    outline: str = Form("true"),
) -> dict:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "Upload an image file (JPG, PNG, WebP).")
    data = await image.read()
    if len(data) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image is too large (max {MAX_IMAGE_MB} MB).")
    if not data:
        raise HTTPException(400, "Uploaded image is empty.")

    template = template.strip().lower()
    if template not in TEMPLATES:
        raise HTTPException(400, f"Unknown template. Choose one of: {', '.join(TEMPLATES)}.")
    headline = " ".join(headline.split())
    if not headline:
        raise HTTPException(400, "Type a headline first.")
    if len(headline) > MAX_HEADLINE_CHARS:
        raise HTTPException(400, f"Headline is too long (max {MAX_HEADLINE_CHARS} characters).")
    subtext = " ".join(subtext.split())
    if len(subtext) > MAX_SUBTEXT_CHARS:
        raise HTTPException(400, f"Subtext is too long (max {MAX_SUBTEXT_CHARS} characters).")
    try:
        size = int(font_size)
    except ValueError:
        raise HTTPException(400, "Font size must be a number.")
    if not 24 <= size <= 200:
        raise HTTPException(400, "Font size must be between 24 and 200.")
    color_key = color.strip().lower()
    if color_key not in COLORS:
        raise HTTPException(400, f"Unknown color. Choose one of: {', '.join(COLORS)}.")

    try:
        img = Image.open(BytesIO(data))
        img.load()
    except Exception:
        raise HTTPException(400, "Could not read that image file. Try a JPG or PNG.")

    out = _render(img, template, headline, subtext, size, COLORS[color_key], _parse_bool(outline))

    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    _cleanup_old()
    name = f"{secrets.token_hex(8)}.jpg"
    out.save(THUMB_DIR / name, "JPEG", quality=92)
    return {
        "ok": True,
        "filename": name,
        "download_url": f"/api/thumbnail/file/{name}",
        "width": W,
        "height": H,
        "template": template,
    }


@router.get("/file/{name}")
def get_thumbnail(name: str):
    if not NAME_RE.match(name):
        raise HTTPException(404, "Thumbnail not found.")
    path = THUMB_DIR / name
    if not path.is_file():
        raise HTTPException(404, "Thumbnail not found.")
    return FileResponse(path, media_type="image/jpeg", filename=name)
