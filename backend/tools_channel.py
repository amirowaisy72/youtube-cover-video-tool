"""Channel Setup Wizard — prepare + brand + apply a new YouTube channel.

HONEST SCOPE (do not over-promise — this is shown in the UI too):
  * YouTube Data API v3 does NOT allow creating a channel
    programmatically, and it can NOT set a channel's name or
    profile photo. There is no endpoint for either.
  * What this tool DOES:
      1. Generate SEO channel-name options, an About description
         and tags from a niche (template logic, no AI, no key).
      2. Render a channel banner (2560x1440) and a square logo
         (800x800) with Pillow for the user to download.
      3. Send the user to youtube.com/create_channel to create
         the channel themselves (one click, on YouTube).
      4. Apply what the API DOES allow to an already-connected
         channel: channels.update (About description + keywords)
         and channelBanners.insert (banner upload). The logo must
         be uploaded manually on YouTube — the API cannot set it.
  * SCOPE LIMIT on step 4: the app's stored sign-in only has the
    `youtube.upload` + `youtube.readonly` scopes (see
    youtube_upload.YOUTUBE_SCOPE). channels.update and
    channelBanners.insert need the `youtube` (or
    `youtube.force-ssl`) scope, so with the current sign-in they
    return 403 insufficientPermissions. The apply endpoint attempts
    the calls and reports per-field success honestly; a 403 is
    explained in the response (fix: widen YOUTUBE_SCOPE and
    Disconnect + Connect again — a change to youtube_upload.py,
    which this tool deliberately does not make).

No credits, no license check, no paid APIs. Free tool.
"""

from __future__ import annotations

import json
import re
import secrets
import sys
from pathlib import Path

# Same import rule as backend/main.py / tools_audio.py: allow
# `import youtube_upload` when run as `python -m uvicorn
# backend.main:app` from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
BRAND_DIR = BASE_DIR / "channel_branding"

router = APIRouter(prefix="/api/channel")

NAME_RE = re.compile(r"^[a-f0-9]{16}-(banner|logo)\.png$")

_FONT_PATHS = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\arial.ttf",
)

# (top colour, bottom colour, accent colour) per style.
STYLES: dict[str, tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]] = {
    "violet": ((26, 16, 48), (88, 28, 135), (255, 170, 0)),
    "ocean": ((8, 32, 64), (8, 120, 130), (0, 210, 255)),
    "sunset": ((64, 12, 20), (190, 60, 20), (255, 210, 0)),
}


def _load_font(size: int):
    for path in _FONT_PATHS:
        try:
            if Path(path).is_file():
                return ImageFont.truetype(str(path), size)
        except Exception:
            continue
    return ImageFont.load_default()


def _fit_font(draw: ImageDraw.ImageDraw, text: str, start: int, max_width: int):
    """Largest font size (down to 24) whose text fits max_width."""
    size = start
    while size > 24:
        font = _load_font(size)
        if draw.textlength(text, font=font) <= max_width:
            return font
        size -= 4
    return _load_font(24)


def _gradient(size: tuple[int, int], top, bottom) -> Image.Image:
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    w, h = size
    for y in range(h):
        t = y / max(h - 1, 1)
        colour = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (w, y)], fill=colour)
    return img


def _soft_circle(img: Image.Image, cx: int, cy: int, r: int, colour, alpha: int = 28):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*colour, alpha))
    base = img.convert("RGBA")
    base.alpha_composite(overlay)
    img.paste(base.convert("RGB"))


def _render_banner(name: str, tagline: str, style: str) -> Image.Image:
    top, bottom, accent = STYLES[style]
    img = _gradient((2560, 1440), top, bottom)
    _soft_circle(img, 2100, 260, 420, accent)
    _soft_circle(img, 320, 1180, 520, (255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Channel name, centred, shrinking to fit the safe width.
    font = _fit_font(draw, name, 220, 2100)
    bbox = draw.textbbox((0, 0), name, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((2560 - tw) / 2, 560 - th / 2), name, font=font, fill=(255, 255, 255))
    # Accent rule under the name.
    draw.rectangle([1280 - 180, 560 + th / 2 + 60, 1280 + 180, 560 + th / 2 + 72], fill=accent)
    if tagline:
        tfont = _fit_font(draw, tagline, 84, 1900)
        tb = draw.textbbox((0, 0), tagline, font=tfont)
        tw2, th2 = tb[2] - tb[0], tb[3] - tb[1]
        draw.text(((2560 - tw2) / 2, 560 + th / 2 + 120), tagline, font=tfont,
                  fill=(235, 235, 235))
    return img


def _render_logo(name: str, style: str) -> Image.Image:
    top, bottom, accent = STYLES[style]
    img = _gradient((800, 800), top, bottom)
    _soft_circle(img, 620, 180, 260, accent)
    draw = ImageDraw.Draw(img)
    words = [w for w in name.split() if w]
    initials = "".join(w[0] for w in words[:2]).upper() or "Y"
    font = _fit_font(draw, initials, 340, 560)
    bbox = draw.textbbox((0, 0), initials, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((800 - tw) / 2, (800 - th) / 2 - 10), initials, font=font,
              fill=(255, 255, 255))
    return img


def _clean_words(text: str) -> list[str]:
    return [w for w in re.split(r"[^A-Za-z0-9]+", text or "") if w]


def _title_case(words: list[str]) -> str:
    return " ".join(w[:1].upper() + w[1:].lower() for w in words)


class GenerateRequest(BaseModel):
    niche: str = Field(min_length=1, max_length=200)
    keywords: str = ""


class BrandingRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    tagline: str = ""
    style: str = "violet"


class ApplyRequest(BaseModel):
    description: str = Field(min_length=1, max_length=5000)
    tags: str = ""
    banner_file: str = ""
    channel_id: str = ""


@router.post("/generate")
def generate_channel(payload: GenerateRequest) -> dict:
    """Template-based channel names + About description + tags."""
    niche = payload.niche.strip()
    base = _title_case(_clean_words(niche))
    if not base:
        raise HTTPException(status_code=400, detail="Type a niche first.")
    kw_list = [k.strip() for k in (payload.keywords or "").split(",") if k.strip()]
    kw_title = [_title_case(_clean_words(k)) for k in kw_list if _clean_words(k)]

    names: list[str] = []
    for candidate in (
        f"{base} Hub",
        f"The {base} Show",
        f"{base} Daily",
        f"{base} Academy",
        f"{kw_title[0]} {base}" if kw_title else f"{base} TV",
    ):
        if candidate not in names and len(candidate) <= 45:
            names.append(candidate)
    names = names[:4]

    niche_lower = base.lower()
    topics = ", ".join(kw_title[:4]) if kw_title else niche_lower
    description = (
        f"Welcome to {names[0]}!\n\n"
        f"Your home for everything about {niche_lower} — {topics}. "
        f"Here you will find simple, practical videos that help you learn "
        f"{niche_lower} step by step, with new videos every week.\n\n"
        f"Topics we cover: {topics}.\n\n"
        f"Subscribe and turn on the bell so you never miss a new video!"
    )

    tags: list[str] = []
    for tag in [niche_lower, f"{niche_lower} channel", f"how to {niche_lower}",
                f"{niche_lower} tips", f"learn {niche_lower}",
                f"best {niche_lower}", *[k.lower() for k in kw_list[:4]],
                "youtube", "subscribe"]:
        if tag and tag not in tags:
            tags.append(tag)
    return {"names": names, "description": description, "tags": tags[:10]}


@router.post("/branding")
def generate_branding(payload: BrandingRequest) -> dict:
    """Render banner (2560x1440) + logo (800x800) PNGs with Pillow."""
    style = (payload.style or "violet").strip().lower()
    if style not in STYLES:
        raise HTTPException(
            status_code=400,
            detail=f"Style must be one of: {', '.join(STYLES)}.",
        )
    name = payload.name.strip()
    tagline = (payload.tagline or "").strip()[:120]
    BRAND_DIR.mkdir(parents=True, exist_ok=True)
    token = secrets.token_hex(8)
    banner_file = f"{token}-banner.png"
    logo_file = f"{token}-logo.png"
    _render_banner(name, tagline, style).save(BRAND_DIR / banner_file, "PNG")
    _render_logo(name, style).save(BRAND_DIR / logo_file, "PNG")
    return {
        "banner_file": banner_file,
        "logo_file": logo_file,
        "banner_url": f"/api/channel/branding/file/{banner_file}",
        "logo_url": f"/api/channel/branding/file/{logo_file}",
    }


@router.get("/branding/file/{name}")
def branding_file(name: str):
    if not NAME_RE.match(name or ""):
        raise HTTPException(status_code=404, detail="File not found.")
    path = BRAND_DIR / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(path, media_type="image/png", filename=name)


def _youtube_helpers():
    """Import the app's existing YouTube helpers (shared, not copied)."""
    try:
        import youtube_upload
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="YouTube connection helpers unavailable.",
        )
    return youtube_upload


@router.get("/status")
def channel_status() -> dict:
    """Is a YouTube account connected, and which channels?"""
    youtube_upload = _youtube_helpers()
    status = youtube_upload.youtube_status()
    channels = youtube_upload.list_channels() if status.get("connected") else []
    return {
        "connected": bool(status.get("connected")),
        "channels": channels,
        "message": status.get("message", ""),
    }


def _scope_error_text() -> str:
    return (
        "Your saved YouTube sign-in does not include the permission to "
        "edit channel settings (the 'youtube' scope). The app now asks "
        "for it, but a saved sign-in keeps its old permissions — "
        "Disconnect and Connect again once (the Connect button is in "
        "Step 4 of this wizard), then try Apply again. Your channel "
        "name, description and banner can still be set by hand on "
        "YouTube in the meantime."
    )


@router.post("/apply")
def apply_to_channel(payload: ApplyRequest) -> dict:
    """Apply description + keywords + banner to a connected channel.

    Uses the STORED credentials (never asks for new ones). Attempts
    each update separately and reports per-field success honestly —
    a failed field is reported, never silently claimed as done.
    """
    youtube_upload = _youtube_helpers()
    status = youtube_upload.youtube_status()
    if not status.get("connected"):
        raise HTTPException(
            status_code=400,
            detail=(
                "No YouTube account is connected yet. Connect YouTube "
                "first: press 'Connect YouTube account' in Step 4 of this "
                "wizard and sign in with Google, then come back here."
            ),
        )
    channels = youtube_upload.list_channels()
    channel_id = (payload.channel_id or "").strip()
    token_file = None
    if channel_id:
        if not any(c.get("id") == channel_id for c in channels):
            raise HTTPException(
                status_code=400,
                detail="That channel is not connected yet.",
            )
        token_file = youtube_upload.token_path_for_channel(channel_id)
    else:
        if channels:
            channel_id = channels[0].get("id", "")
            token_file = youtube_upload.token_path_for_channel(channel_id)
        else:
            token_file = youtube_upload.token_path()
    if not token_file or not token_file.exists():
        raise HTTPException(
            status_code=400,
            detail="No saved YouTube sign-in found for that channel.",
        )

    try:
        youtube_upload.ensure_google_libraries()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload

    try:
        creds = Credentials.from_authorized_user_file(str(token_file))
        youtube = build("youtube", "v3", credentials=creds)
    except Exception as exc:
        raise HTTPException(
            status_code=503, detail=f"Could not load the saved YouTube sign-in: {exc}")

    if not channel_id:
        try:
            mine = youtube.channels().list(part="id", mine=True).execute()
            items = mine.get("items") or []
            channel_id = items[0].get("id", "") if items else ""
        except Exception:
            channel_id = ""
    if not channel_id:
        raise HTTPException(
            status_code=400,
            detail="Could not identify the connected channel.",
        )

    updated = {"description": False, "keywords": False, "banner": False}
    errors: list[str] = []
    scope_note = ""

    tags = [t.strip() for t in (payload.tags or "").split(",") if t.strip()]
    # channels.update: description + keywords live in brandingSettings.
    # The channel NAME cannot be changed through the API at all.
    try:
        youtube.channels().update(
            part="brandingSettings",
            body={
                "id": channel_id,
                "brandingSettings": {
                    "channel": {
                        "description": payload.description,
                        "keywords": " ".join(tags),
                    }
                },
            },
        ).execute()
        updated["description"] = True
        updated["keywords"] = True
    except HttpError as exc:
        reason = ""
        try:
            reason = json.loads(exc.content.decode("utf-8", "ignore")) \
                .get("error", {}).get("message", "")
        except Exception:
            reason = str(exc)
        if getattr(exc, "resp", None) is not None and exc.resp.status == 403:
            scope_note = _scope_error_text()
            errors.append(f"Description + keywords not updated (YouTube said: {reason or 'forbidden'}).")
        else:
            errors.append(f"Description + keywords not updated (YouTube said: {reason or exc}).")
    except Exception as exc:
        errors.append(f"Description + keywords not updated ({exc}).")

    banner_file = (payload.banner_file or "").strip()
    if banner_file:
        if not NAME_RE.match(banner_file) or not (BRAND_DIR / banner_file).is_file():
            errors.append("Banner file not found — banner was not updated.")
        else:
            try:
                resp = youtube.channelBanners().insert(
                    channelId=channel_id,
                    media_body=MediaFileUpload(
                        str(BRAND_DIR / banner_file), mimetype="image/png",
                        resumable=True),
                ).execute()
                url = resp.get("url") if isinstance(resp, dict) else ""
                if not url:
                    errors.append("Banner upload finished but YouTube gave no banner URL.")
                else:
                    # Step 3 of the banner flow (YouTube docs): the
                    # upload alone does NOT show the banner — it must
                    # be bound to the channel via channels.update with
                    # brandingSettings.image.bannerExternalUrl.
                    youtube.channels().update(
                        part="brandingSettings",
                        body={
                            "id": channel_id,
                            "brandingSettings": {
                                "image": {"bannerExternalUrl": url}
                            },
                        },
                    ).execute()
                    updated["banner"] = True
            except HttpError as exc:
                reason = ""
                try:
                    reason = json.loads(exc.content.decode("utf-8", "ignore")) \
                        .get("error", {}).get("message", "")
                except Exception:
                    reason = str(exc)
                if getattr(exc, "resp", None) is not None and exc.resp.status == 403:
                    scope_note = _scope_error_text()
                    errors.append(f"Banner not updated (YouTube said: {reason or 'forbidden'}).")
                else:
                    errors.append(f"Banner not updated (YouTube said: {reason or exc}).")
            except Exception as exc:
                errors.append(f"Banner not updated ({exc}).")

    channel_title = ""
    for c in channels:
        if c.get("id") == channel_id:
            channel_title = c.get("title", "")
            break
    return {
        "updated": updated,
        "channel": {"id": channel_id, "title": channel_title},
        "errors": errors,
        "scope_note": scope_note,
    }
