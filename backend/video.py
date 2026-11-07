"""FFmpeg command builders for the YouTube cover video tool.

Kept separate from main.py so the video logic can be tested and reused
without starting the web server. All tools used here are free and open
source: FFmpeg (and yt-dlp, used in main.py).

The cover model: a cover is an image. One rectangular area of that image
is the "green screen" area, described by settings.green_rect {x, y, w, h}.
The downloaded source video is scaled to exactly that rectangle and
overlaid on top of the cover image at (x, y).
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path


def no_window_kwargs() -> dict:
    """kwargs that keep a child console window hidden on Windows.

    The shipped .exe is --windowed (no console of its own), so
    every console program it spawns — ffmpeg, ffprobe, yt-dlp,
    wmic, powershell — pops a visible console window without
    this. That is the PowerShell window flashing on and off
    during video processing (user, 2026-11-07): each ffmpeg /
    ffprobe / fingerprint call opened one. CREATE_NO_WINDOW
    hides it; on Linux/macOS there is nothing to hide.
    Imported by main/tts/autovideo/youtube_upload too, so the
    rule is in exactly one place (licensing.py keeps its own
    copy — it is standalone by design)."""
    if sys.platform == "win32":
        return {"creationflags": subprocess.CREATE_NO_WINDOW}
    return {}


# A cover can be a still image OR a video (user, 2026-11-07):
# the secondary (cover) video plays behind the primary video,
# looped to the primary's length. These are the video suffixes
# the cover upload accepts.
VIDEO_COVER_SUFFIXES = {".mp4", ".mov", ".webm"}


def is_video_cover(path: str | Path) -> bool:
    """True when the cover file is a video, not a still image."""
    return Path(path).suffix.lower() in VIDEO_COVER_SUFFIXES


def clean_youtube_url(url: str) -> str | None:
    """One single-video YouTube URL from any YouTube link (user, 2026-11-07).

    Watch links copied from YouTube often carry `&list=...` (a
    playlist), `&index=`, `&t=` and friends. Without cleaning,
    yt-dlp treats the link as a PLAYLIST: it fetches the whole
    playlist's info and then downloads video after video, so the
    progress bar sits at 0% for a very long time and the "video"
    is the wrong one. Returns the watch URL with only the `v`
    parameter (youtu.be / Shorts / embed links become the same
    watch URL), or the URL unchanged when it is not YouTube.
    Returns None for a playlist page (youtube.com/playlist, or a
    watch link with no video id) — there is no single video to
    download, so the caller must ask for one video's link.
    """
    from urllib.parse import parse_qs, urlparse

    try:
        u = (url or "").strip()
        p = urlparse(u)
        host = (p.netloc or "").lower().removeprefix("www.")
        if host in ("youtube.com", "m.youtube.com", "music.youtube.com"):
            if p.path == "/watch":
                v = (parse_qs(p.query).get("v") or [None])[0]
                return f"https://www.youtube.com/watch?v={v}" if v else None
            if p.path.startswith("/shorts/") or p.path.startswith("/embed/"):
                vid = p.path.split("/")[2] if len(p.path.split("/")) > 2 else ""
                return f"https://www.youtube.com/watch?v={vid}" if vid else None
            if p.path in ("/playlist", "/results"):
                return None
            return u
        if host == "youtu.be":
            vid = p.path.strip("/").split("/")[0] if p.path.strip("/") else ""
            return f"https://youtu.be/{vid}" if vid else None
        return u
    except Exception:
        return url


def cover_first_frame(cover: str | Path, dest_dir: str | Path) -> Path:
    """First frame of a cover as a still image path.

    Image covers are returned as-is. For a video cover, frame 0
    is extracted to <dest_dir>/cover_first_frame.png — the green
    rectangle and the shape mask are detected from that frame
    (the green area is assumed fixed in place across the cover
    video, which is how cover videos are made)."""
    cover = Path(cover)
    if not is_video_cover(cover):
        return cover
    dest = Path(dest_dir) / "cover_first_frame.png"
    if dest.exists():
        return dest
    ok, _ = run_command([
        "ffmpeg", "-y", "-i", str(cover),
        "-vframes", "1", "-q:v", "2", str(dest)])
    if not ok or not dest.exists():
        raise RuntimeError("Could not read the first frame of the cover video.")
    return dest


def check_ffmpeg() -> str | None:
    """Return an error string if ffmpeg is missing, else None."""
    if shutil.which("ffmpeg") is None:
        return (
            "ffmpeg was not found on PATH. Install FFmpeg first "
            "(see README.md) and re-run the server."
        )
    return None


def run_command(cmd: list[str]) -> tuple[bool, str]:
    """Run a command, returning (ok, combined output tail)."""
    proc = subprocess.run(cmd, capture_output=True, text=True,
                          **no_window_kwargs())
    output = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode != 0:
        return False, output[-4000:]
    return True, output[-2000:]


def get_media_size(path: str | Path) -> tuple[int, int] | None:
    """(width, height) of an image/video via ffprobe, or None."""
    if shutil.which("ffprobe") is None:
        return None
    try:
        proc = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "json", str(path)],
            capture_output=True, text=True, timeout=30,
            **no_window_kwargs())
        stream = json.loads(proc.stdout or "{}")["streams"][0]
        return int(stream["width"]), int(stream["height"])
    except Exception:
        return None


def snap_rect_even(rect: dict, cover_w: int | None = None,
                   cover_h: int | None = None) -> dict:
    """Snap a green rectangle to even x, y, w, h.

    BUG (user, 2026-11-02): the new "Learn With Amir" cover's green
    area is 990x661 — an ODD height. FFmpeg crops yuv420p video to
    even dimensions, so the video came out 990x660 while the PNG
    mask stayed 990x661, and alphamerge failed instantly with
    "Input frame sizes do not match (990x660 vs 990x661)". The
    Process popup therefore vanished ~1 second after starting,
    with "Processing failed: FFmpeg failed…". Snapping to even
    (w/h rounded to nearest even that still fits the cover, x/y
    rounded down) fixes it for any cover, at most 1 px of shift —
    invisible on screen, and it also keeps crop/overlay aligned
    for subsampled video. Applied in detection AND in process_job,
    so a rect already saved from an earlier detect is fixed too.
    """
    try:
        x = int(rect.get("x", 0)); y = int(rect.get("y", 0))
        w = int(rect.get("w", 0)); h = int(rect.get("h", 0))
    except Exception:
        return rect
    x -= x % 2
    y -= y % 2
    # Round w/h to nearest even; if that would run past the cover
    # edge, round down instead so the box stays inside the cover.
    for _ in range(2):
        w_even = w + (w % 2)
        h_even = h + (h % 2)
        if cover_w and x + w_even > cover_w:
            w_even -= 2
        if cover_h and y + h_even > cover_h:
            h_even -= 2
        w, h = w_even, h_even
        break
    return {"x": max(0, x), "y": max(0, y),
            "w": max(2, w), "h": max(2, h)}


def detect_green_rect(cover: str | Path) -> dict | None:
    """Auto-detect the green-screen rectangle in a cover image.

    Finds the largest connected area of green-dominant pixels
    (G clearly above R and B) and returns its bounding box in the
    cover's original pixel coordinates. Returns None if Pillow is
    missing or no green area covering at least 5% of the image is
    found — the caller then falls back to the manual rectangle.
    """
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        img = Image.open(cover).convert("RGB")
    except Exception:
        return None
    orig_w, orig_h = img.size
    # Analyse at a small size for speed; scale the box back up.
    scale_w = min(1.0, 320 / orig_w)
    small = img.resize((max(1, int(orig_w * scale_w)),
                        max(1, int(orig_h * scale_w))))
    px = small.load()
    sw, sh = small.size
    green = [[False] * sw for _ in range(sh)]
    for y in range(sh):
        for x in range(sw):
            r, g, b = px[x, y]
            # Loose enough to catch a frame's dim outer border: the
            # border is often shadowed/darker than the frame's bright
            # core, and with the old g>90 test the detected box came
            # out inset, leaving a green strip visible around the
            # video (user, 2026-11-07). Still requires green clearly
            # above red and blue, so wood/brown is never green.
            green[y][x] = g > 70 and g - r > 20 and g - b > 20
    # Largest connected component (4-direction flood fill).
    visited = [[False] * sw for _ in range(sh)]
    best = None
    for sy in range(sh):
        for sx in range(sw):
            if not green[sy][sx] or visited[sy][sx]:
                continue
            stack = [(sx, sy)]
            visited[sy][sx] = True
            minx = maxx = sx
            miny = maxy = sy
            count = 0
            while stack:
                cx, cy = stack.pop()
                count += 1
                minx, maxx = min(minx, cx), max(maxx, cx)
                miny, maxy = min(miny, cy), max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < sw and 0 <= ny < sh and green[ny][nx] and not visited[ny][nx]:
                        visited[ny][nx] = True
                        stack.append((nx, ny))
            if best is None or count > best[0]:
                best = (count, minx, miny, maxx, maxy)
    if best is None:
        return None
    count, minx, miny, maxx, maxy = best
    if count < 0.05 * sw * sh:
        return None
    # Expand the box while the next row/column is still mostly green:
    # this catches a green edge that was split off by a shadow line.
    def _row_green(y):
        return sum(green[y][minx:maxx + 1]) >= 0.3 * (maxx - minx + 1) if 0 <= y < sh else False
    def _col_green(x):
        return sum(green[y][x] for y in range(miny, maxy + 1)) >= 0.3 * (maxy - miny + 1) if 0 <= x < sw else False
    while _row_green(maxy + 1):
        maxy += 1
    while _row_green(miny - 1):
        miny -= 1
    while _col_green(maxx + 1):
        maxx += 1
    while _col_green(minx - 1):
        minx -= 1
    fx, fy = orig_w / sw, orig_h / sh
    return snap_rect_even({
        "x": int(minx * fx), "y": int(miny * fy),
        "w": int((maxx - minx + 1) * fx), "h": int((maxy - miny + 1) * fy),
    }, cover_w=orig_w, cover_h=orig_h)


def green_mask(cover: str | Path) -> "object | None":
    """Return a Pillow mask image for a cover: white where the cover
    is green, black everywhere else, at the cover's full size.

    This is the shape-accurate version of the green rectangle: the
    video must appear only inside the green area's actual shape,
    not inside its rectangular bounding box. If the green area is a
    circle, a rounded screen, an L-shape, etc., a rectangle video
    would spill onto the non-green parts of the cover. The mask
    (same green test as detect_green_rect: G>90, G-R>25, G-B>25)
    lets FFmpeg (alphamerge) and the live preview (CSS mask-image)
    clip the video to exactly the green shape. Returns None if
    Pillow is missing or the cover cannot be read.

    FRAME RULE (user, 2026-11-07): some covers have a green FRAME
    (border) around a non-green centre — e.g. a TV whose screen is
    black with a green border. The shape mask would then show the
    video only as thin strips, which reads as "wrong green detect".
    For a frame the video must fill the WHOLE screen (the frame's
    bounding box, centre included). A frame is recognised by its
    footprint: the box border is mostly green while the interior
    is mostly not green. A solid green screen (interior green) and
    a circle/rounded screen (border mostly empty) keep the shape
    mask unchanged.
    """
    try:
        from PIL import Image, ImageChops, ImageDraw
    except ImportError:
        return None
    try:
        img = Image.open(cover).convert("RGB")
    except Exception:
        return None
    r, g, b = img.split()

    def _thresh(im, t):
        return im.point(lambda v: 255 if v > t else 0)

    gr = ImageChops.subtract(g, r)
    gb = ImageChops.subtract(g, b)
    # Same loose green test as detect_green_rect, so the mask and the
    # detected rectangle agree about what counts as green (a frame's
    # dim outer border included — user, 2026-11-07).
    mask = ImageChops.logical_and(_thresh(gr, 20).convert("1"),
                                  _thresh(gb, 20).convert("1"))
    mask = ImageChops.logical_and(mask, _thresh(g, 70).convert("1"))
    mask = mask.convert("L")
    # Frame test on the LARGEST green component's box, NOT on the box
    # of ALL green pixels: a stray green object elsewhere in the
    # photo (e.g. a plant) stretches the all-green box, so the
    # frame's border no longer looks mostly green and the frame is
    # missed — the video then shows only as thin strips (user,
    # 2026-11-07). Analyse on a small copy for speed; the frame test
    # only needs border vs interior coverage, not exact pixels.
    scale = min(1.0, 320 / max(mask.size))
    small = mask.resize((max(1, int(mask.size[0] * scale)),
                         max(1, int(mask.size[1] * scale))))
    spx = small.load()
    sw, sh = small.size
    visited = [[False] * sw for _ in range(sh)]
    best = None
    for sy in range(sh):
        for sx in range(sw):
            if spx[sx, sy] <= 0 or visited[sy][sx]:
                continue
            stack = [(sx, sy)]
            visited[sy][sx] = True
            minx = maxx = sx
            miny = maxy = sy
            count = 0
            while stack:
                cx, cy = stack.pop()
                count += 1
                minx, maxx = min(minx, cx), max(maxx, cx)
                miny, maxy = min(miny, cy), max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < sw and 0 <= ny < sh and spx[nx, ny] > 0 and not visited[ny][nx]:
                        visited[ny][nx] = True
                        stack.append((nx, ny))
            if best is None or count > best[0]:
                best = (count, minx, miny, maxx, maxy)
    if best is not None:
        _, sx0, sy0, sx1, sy1 = best
        border_hit = border_n = 0
        for xx in range(sx0, sx1 + 1):
            for yy in (sy0, sy1):
                border_hit += 1 if spx[xx, yy] > 0 else 0
                border_n += 1
        for yy in range(sy0, sy1 + 1):
            for xx in (sx0, sx1):
                border_hit += 1 if spx[xx, yy] > 0 else 0
                border_n += 1
        interior_hit = interior_n = 0
        for yy in range(sy0, sy1 + 1, 2):
            for xx in range(sx0, sx1 + 1, 2):
                interior_hit += 1 if spx[xx, yy] > 0 else 0
                interior_n += 1
        border_cov = border_hit / border_n if border_n else 0
        interior_cov = interior_hit / interior_n if interior_n else 0
        if border_cov >= 0.5 and interior_cov < 0.5:
            filled = Image.new("L", mask.size, 0)
            ImageDraw.Draw(filled).rectangle(
                (int(sx0 / scale), int(sy0 / scale),
                 int((sx1 + 1) / scale), int((sy1 + 1) / scale)), fill=255)
            return filled
    return mask


def get_duration(path: str | Path) -> float | None:
    """Source duration in seconds via ffprobe, or None if unavailable."""
    if shutil.which("ffprobe") is None:
        return None
    try:
        proc = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "json", str(path)],
            capture_output=True, text=True, timeout=30,
            **no_window_kwargs())
        return float(json.loads(proc.stdout or "{}")["format"]["duration"])
    except Exception:
        return None


def _parse_ffmpeg_time(line: str) -> float | None:
    m = re.search(r"time=(\d+):(\d+):(\d+(?:\.\d+)?)", line)
    if not m:
        return None
    h, mn, s = m.groups()
    return int(h) * 3600 + int(mn) * 60 + float(s)


def run_with_progress(cmd: list[str], duration: float | None,
                      base: float, span: float,
                      on_progress=None, on_log=None) -> tuple[bool, str]:
    """Run FFmpeg, parsing its time= output into a 0-100 progress value.

    base/span map this encode onto the overall job: the final encode
    is 0-90%, the preview encode is 90-100%. When duration is unknown,
    progress stays stage-based (base + a slow climb) instead of faking
    an exact percent — the frontend shows elapsed time in that case.
    """
    start = time.time()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, errors="replace", bufsize=1,
                            **no_window_kwargs())
    tail: list[str] = []
    last_log_bucket = [-1]
    last_time_update = [0.0]
    try:
        assert proc.stdout is not None
        # BUG FIX (this was why the bar stuck at 2%): FFmpeg progress
        # lines are separated by carriage return (\r), NOT newline,
        # and the old code also crashed on the first non-progress line
        # (t=None). Reading char-by-char and splitting on \r or \n
        # gives realtime updates, and lines without time= are skipped.
        buf = ""
        while True:
            ch = proc.stdout.read(1)
            if not ch:
                break
            if ch in ("\r", "\n"):
                line = buf
                buf = ""
                if not line.strip():
                    continue
                tail.append(line)
                if len(tail) > 50:
                    tail.pop(0)
                t = _parse_ffmpeg_time(line)
                if t is None:
                    continue
                if on_progress and duration:
                    pct = base + min(span, span * t / duration)
                    elapsed = time.time() - start
                    eta = elapsed * (100 - pct) / pct if pct > 5 else None
                    # Throttle job.json writes to ~2/sec; FFmpeg emits
                    # many lines per second and each write is a disk write.
                    if elapsed - last_time_update[0] >= 0.5 or pct >= base + span - 1:
                        last_time_update[0] = elapsed
                        on_progress(round(pct, 1), elapsed, eta)
                    # Installer-style log: one line per 10% milestone.
                    bucket = int(pct // 10)
                    if on_log and bucket != last_log_bucket[0]:
                        last_log_bucket[0] = bucket
                        fps_m = re.search(r"fps=([\d.]+)", line)
                        sp_m = re.search(r"speed=([\d.]+)x", line)
                        on_log(f"Encoding {pct:.0f}% — time {t:.0f}s"
                               + (f", fps {fps_m.group(1)}" if fps_m else "")
                               + (f", speed {sp_m.group(1)}x" if sp_m else ""))
                elif on_progress:
                    # Unknown duration: climb slowly, never fake 100%.
                    elapsed = time.time() - start
                    pct = base + min(span - 5, elapsed * 2)
                    on_progress(round(pct, 1), elapsed, None)
            else:
                buf += ch
    finally:
        proc.wait()
    output = "".join(tail)
    if proc.returncode != 0:
        return False, output[-4000:]
    return True, output[-2000:]


def build_process_command(
    source: str | Path,
    cover: str | Path,
    output: str | Path,
    green_rect: dict,
    flip: bool = False,
    speed: float = 1.0,
    voice_enabled: bool = False,
    voice_pitch_factor: float = 1.0,
    crf: int = 22,
    preset: str = "medium",
    output_width: int | None = None,
    output_height: int | None = None,
    zoom: float = 1.0,
    pan_x: float = 0.0,
    pan_y: float = 0.0,
    mask_path: str | Path | None = None,
    encoder: str = "libx265",
    output_duration: float | None = None,
    fit_mode: str = "cover",
    cover_is_video: bool = False,
) -> list[str]:
    """Build the FFmpeg command that composites a video onto a cover.

    Steps, in order:
      1. Scale the source video to the green-rect size.
      2. Optionally flip it left/right (hflip only, never vertical).
      3. Change its speed with setpts (video) / atempo (audio).
      4. Optionally shift voice pitch: asetrate changes the pitch,
         then atempo restores the original duration.
      5. If a green mask is given, alphamerge it onto the video so
         the video shows only inside the green area's actual shape,
         not its rectangle — outside the shape the cover shows.
      6. Overlay the result onto the (looped) cover image at (x, y).
         When the cover is a VIDEO (cover_is_video), the cover input
         is looped with -stream_loop instead of -loop: it restarts
         from the beginning whenever it ends, and the output still
         stops at the primary video's length (overlay shortest=1
         + -shortest, or -t when a mask is used) — so the finished
         video is exactly as long as the primary video, however
         short the cover video is.
      7. Encode with the admin encoder/CRF/preset. Default is HEVC
         (libx265): at the same visible quality it makes a much
         smaller file than H.264 (libx264) — that is how size goes
         down without quality going down. H.264 cannot do both at
         once: CRF 26 shrank it but dulled it, CRF 20 kept quality
         but grew it. HEVC CRF 22 is the quality match for H.264
         CRF 20, at roughly 25-40% smaller size.
    """
    x = int(green_rect.get("x", 0))
    y = int(green_rect.get("y", 0))
    w = int(green_rect.get("w", 640))
    h = int(green_rect.get("h", 360))
    # Speed: if the cover is bigger than output_width, scale the whole
    # cover down (and the green rectangle with it) instead of encoding
    # a 2048px Gemini image at full size — that alone was a major
    # reason a 3-minute video took so long. Small covers are untouched.
    scale = 1.0
    if output_width:
        size = get_media_size(cover)
        if size and size[0] > int(output_width):
            scale = int(output_width) / size[0]
            x, y, w, h = round(x * scale), round(y * scale), round(w * scale), round(h * scale)
    speed = float(speed) if speed else 1.0
    if speed <= 0:
        speed = 1.0
    # atempo only accepts 0.5-100 in a single filter; our UI is 0.5-2.0.
    speed = max(0.5, min(2.0, speed))

    # FIT MODES (user, 2026-11-01): two checkboxes, mutually
    # exclusive, live preview and final must match EXACTLY for
    # both — no case where live shows black but final shows green.
    #   "cover" (Fit to green screen, DEFAULT): scale=increase,
    #   crop to the box. Video fills the box exactly, no black
    #   area, no green leftover. Trade-off: a mismatched aspect
    #   video is cropped on the sides at 1.0x (16:9 in a 1.3:1 box
    #   loses ~26% width). Zooming zooms the video itself.
    #   "full" (Display full width/height video): scale=decrease,
    #   pad with black to the full box. Whole video shows, no
    #   crop at all. Trade-off: leftover box area is black, never
    #   green, because the padded box covers the green box fully.
    #   The mask, when present, clips the box-sized video to the
    #   green shape in both modes, so black only shows inside the
    #   shape, never on the cover outside it.
    # Implementation: if the source size is known, compute the
    # cover size in Python (max factor, so the box is covered).
    # If the source size is unknown, fall back to FFmpeg increase
    # + crop, which gives the same cover behaviour.
    # Zoom range is 0.5x–2.0x (user, 2026-11-01): below 1.0x the
    # video shrinks inside the box, with black around it, never green.
    zoom = max(0.5, min(2.0, float(zoom) if zoom else 1.0))
    pan_px = float(pan_x or 0) / 100 * w
    pan_py = float(pan_y or 0) / 100 * h
    # Commas inside min()/max() must be quoted, otherwise FFmpeg
    # reads them as filter separators ("No such filter: '0)'").
    crop_x = f"'min(max((iw-{w})/2-{pan_px:.0f},0),iw-{w})'"
    crop_y = f"'min(max((ih-{h})/2-{pan_py:.0f},0),ih-{h})'"
    overlay_x, overlay_y = x, y
    src_size = get_media_size(source)
    fit_is_padded = False
    fit_mode = (fit_mode or "cover").lower()
    if fit_mode not in ("cover", "full"):
        fit_mode = "cover"
    if src_size:
        sw_src, sh_src = src_size
        # Unified scale -> crop-to-box-or-smaller -> pad-black-to-box.
        # This is what makes live and final match for Full-mode zoom:
        # at zoom 1, Full fits inside the box with black bars; as
        # zoom grows, the video itself grows, bars shrink, then
        # disappear when it covers the box, then it crops — the
        # bars are never zoomed as if they were video. The old code
        # tried crop=w:h even when only one dimension exceeded the
        # box (the other was smaller), which FFmpeg cannot crop.
        # Cover at zoom < 1 also lands here: it shrinks with black
        # around it, instead of revealing green.
        if fit_mode == "full":
            fit_factor = min(w * zoom / sw_src, h * zoom / sh_src)
        else:
            fit_factor = max(w * zoom / sw_src, h * zoom / sh_src)
        fit_w, fit_h = round(sw_src * fit_factor), round(sh_src * fit_factor)
        crop_w, crop_h = min(fit_w, w), min(fit_h, h)
        cx = int(max(0, min(fit_w - crop_w, (fit_w - crop_w) / 2 - pan_px))) if fit_w > crop_w else 0
        cy = int(max(0, min(fit_h - crop_h, (fit_h - crop_h) / 2 - pan_py))) if fit_h > crop_h else 0
        # FIX (user, 2026-11-02): manual zoom/drag in Full mode
        # placed the video differently in live vs final. Root
        # cause: when the video was SMALLER than the box in a
        # dimension (black bars, e.g. Full 1.2x: height 89% of
        # the box), live moved the video by pan inside the bars,
        # but final always centred it with pad and IGNORED pan
        # for that dimension — up to ~70-130px off for this
        # user's 1698x1288 box. Now pad also carries pan, clamped
        # to the bar space, so live and final place it identically.
        # (The frontend was fixed at the same time to clamp pan
        # to exactly the bar/crop space, so a clamped pad here
        # and a clamped live position always agree.)
        pad_x = int(max(0, min(w - crop_w, (w - crop_w) // 2 + pan_px)))
        pad_y = int(max(0, min(h - crop_h, (h - crop_h) // 2 + pan_py)))
        video_filters = [f"scale={fit_w}:{fit_h}"]
        if crop_w != fit_w or crop_h != fit_h:
            video_filters.append(f"crop={crop_w}:{crop_h}:{cx}:{cy}")
        if crop_w != w or crop_h != h:
            video_filters.append(f"pad={w}:{h}:{pad_x}:{pad_y}:black")
        overlay_x, overlay_y = x, y
        fit_is_padded = False
    else:
        # Unknown source size: cover uses increase+crop, full uses
        # decrease+pad, matching the live preview for each mode.
        if fit_mode == "full":
            # Same pan-in-pad fix as the known-size branch above,
            # expressed in FFmpeg's own min/max so the pad offset
            # can never leave the bar space.
            video_filters = [
                f"scale={round(w * zoom)}:{round(h * zoom)}:force_original_aspect_ratio=decrease",
                f"pad={w}:{h}:min(max((ow-iw)/2+{pan_px:.0f},0),ow-iw):min(max((oh-ih)/2+{pan_py:.0f},0),oh-ih):black",
            ]
        else:
            video_filters = [
                f"scale={round(w * zoom)}:{round(h * zoom)}:force_original_aspect_ratio=increase",
                f"crop={w}:{h}:{crop_x}:{crop_y}",
            ]
    if flip:
        video_filters.append("hflip")
    video_filters.append(f"setpts=PTS/{speed}")
    video_chain = ",".join(video_filters)

    audio_filters: list[str] = []
    if voice_enabled and voice_pitch_factor and voice_pitch_factor != 1.0:
        pitch = float(voice_pitch_factor)
        # 44100 Hz is a safe assumed base rate for the asetrate trick;
        # atempo right after it restores the duration, keeping only
        # the pitch shift. The final atempo applies the speed change.
        audio_filters.append(f"asetrate=44100*{pitch}")
        audio_filters.append(f"atempo=1/{pitch}")
    audio_filters.append(f"atempo={speed}")
    audio_chain = ",".join(audio_filters)

    if scale != 1.0:
        base_chain = f"[0:v]scale={int(output_width)}:-2[base]"
    elif output_width and output_height:
        base_chain = f"[0:v]scale={int(output_width)}:{int(output_height)}[base]"
    else:
        base_chain = "[0:v]copy[base]"

    if mask_path:
        # Mask is full-cover size: scale it with the cover, then crop
        # to the video's rectangle, then alphamerge it onto the
        # video. Without this, a non-rectangular green shape would
        # still get a rectangular video spilling onto the cover.
        # The video is always box-sized here (fit videos are padded
        # to w x h first, zoomed videos are cropped to w x h), so
        # the mask crop is always the whole box (w,h at x,y).
        mw, mh, mx, my = w, h, x, y
        if scale != 1.0:
            mask_chain = f"[2:v]scale={int(output_width)}:-2,crop={mw}:{mh}:{mx}:{my}[mask]"
        else:
            mask_chain = f"[2:v]crop={mw}:{mh}:{mx}:{my}[mask]"
        filter_complex = (
            f"{base_chain};"
            f"[1:v]{video_chain}[vid];"
            f"{mask_chain};"
            f"[vid][mask]alphamerge[va];"
            f"[base][va]overlay={overlay_x}:{overlay_y}:shortest=1[outv]"
        )
    else:
        filter_complex = (
            f"{base_chain};"
            f"[1:v]{video_chain}[vid];"
            f"[base][vid]overlay={overlay_x}:{overlay_y}:shortest=1[outv]"
        )

    # Cover input: a still image is looped as one frame; a cover
    # VIDEO is looped with -stream_loop so it restarts from the
    # beginning when it ends. Either way the output length is the
    # primary video's length (see step 6 above).
    cmd = ["ffmpeg", "-y"]
    if cover_is_video:
        cmd += ["-stream_loop", "-1"]
    else:
        cmd += ["-loop", "1"]
    cmd += [
        "-i", str(cover),
        "-i", str(source),
    ]
    if mask_path:
        cmd += ["-loop", "1", "-i", str(mask_path)]
    # -t is essential with a mask: the mask input is looped
    # (infinite), so alphamerge keeps outputting frames after the
    # source ends and neither overlay shortest=1 nor -shortest
    # stops it — that is why a masked encode hung forever (a 3s
    # source became a 472s file). -t stops at exactly the source
    # duration (already divided by speed by the caller).
    if output_duration:
        cmd += ["-t", str(output_duration)]
    cmd += [
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "1:a?",
        "-filter:a", audio_chain,
        "-c:v", encoder,
        "-crf", str(int(crf)),
        "-preset", str(preset),
        "-threads", "0",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "96k",
        "-movflags", "+faststart",
        "-shortest",
    ]
    if encoder == "libx265":
        # hvc1 tag: plays on Apple devices and YouTube; without it
        # some players refuse HEVC in MP4.
        cmd += ["-tag:v", "hvc1"]
    cmd += [str(output)]
    return cmd


def encoder_available(name: str) -> bool:
    """True if this FFmpeg build has the named encoder (e.g. libx265)."""
    if shutil.which("ffmpeg") is None:
        return False
    try:
        proc = subprocess.run(["ffmpeg", "-hide_banner", "-encoders"],
                              capture_output=True, text=True, timeout=30,
                              **no_window_kwargs())
        return name in (proc.stdout or "")
    except Exception:
        return False


def build_preview_command(
    final_video: str | Path,
    preview_path: str | Path,
) -> list[str]:
    """Build a preview encode of an already-made final video.

    Preview used to be 480px / CRF 32 / ultrafast, which is why the
    preview itself looked dull even when the final was fine — the
    user judges quality from this preview. Now it is 720px / CRF 20 /
    veryfast, close to the final's look. Preview is temporary and is
    deleted after final download, so its bigger size does not matter.
    """
    return [
        "ffmpeg",
        "-y",
        "-i", str(final_video),
        "-vf", "scale=720:-2",
        "-c:v", "libx264",
        "-crf", "20",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-movflags", "+faststart",
        str(preview_path),
    ]


def process_job(
    source: str | Path,
    cover: str | Path,
    output: str | Path,
    preview_path: str | Path,
    green_rect: dict,
    flip: bool = False,
    speed: float = 1.0,
    voice_enabled: bool = False,
    voice_pitch_factor: float = 1.0,
    compress: bool = True,
    crf: int = 22,
    preset: str = "medium",
    output_width: int | None = None,
    output_height: int | None = None,
    zoom: float = 1.0,
    pan_x: float = 0.0,
    pan_y: float = 0.0,
    encoder: str = "libx265",
    fit_mode: str = "cover",
    on_progress=None,
    on_log=None,
) -> tuple[bool, str]:
    """Run the full process + preview pipeline for one job.

    on_progress(percent, elapsed_seconds, eta_seconds_or_None) is called
    during both encodes so the UI can show a progress bar in the Edit
    section itself, with elapsed and remaining time.
    """
    missing = check_ffmpeg()
    if missing:
        return False, missing
    # Snap the green rect to even dimensions here too (not just in
    # detection): a job may already carry an odd rect saved before
    # this fix, and process_job is called by Manual, Auto and Group
    # alike, so this one place covers every path.
    _cover_size = get_media_size(cover)
    _snapped = snap_rect_even(
        green_rect,
        cover_w=_cover_size[0] if _cover_size else None,
        cover_h=_cover_size[1] if _cover_size else None)
    if _snapped != green_rect:
        if on_log:
            on_log(f"Green area snapped to even pixels for FFmpeg: "
                   f"{green_rect} -> {_snapped} (odd sizes break alphamerge).")
        green_rect = _snapped
    if not compress:
        # Without compression, use a near-lossless quality setting.
        crf = 18
        preset = "medium"
    # Quality-first rule (user, 2026-11-01): quality must never be
    # reduced to shrink the file. If HEVC is requested but this
    # FFmpeg build lacks libx265, fall back to H.264 CRF 20 (quality
    # kept, file larger) and say so in the log, instead of failing.
    if encoder == "libx265" and not encoder_available("libx265"):
        encoder = "libx264"
        crf = 20
        if on_log:
            on_log("HEVC (libx265) not in this FFmpeg build — falling back to H.264 CRF 20 for quality.")
    if on_log and encoder == "libx265":
        on_log(f"Final encoder: HEVC (libx265) CRF {crf} — smaller file at the same look as H.264.")
    # Shape-accurate mask: build it from the cover itself (white =
    # green, black = rest) and pass it to FFmpeg, so the video is
    # clipped to the green shape, not to its rectangle. The mask is
    # a job working file, deleted with the job's other temp files.
    # For a video cover the mask comes from its first frame.
    mask_path = None
    try:
        mask_source = cover_first_frame(cover, Path(output).parent)
        mask_img = green_mask(mask_source)
        if mask_img is not None:
            mask_path = Path(output).parent / "green_mask.png"
            mask_img.save(mask_path)
    except Exception:
        mask_path = None
    # Effective output duration: source duration divided by speed.
    # Computed BEFORE building the command, because the masked
    # encode needs it as -t (see build_process_command).
    duration = get_duration(source)
    if duration:
        duration = duration / max(0.5, min(2.0, float(speed) or 1.0))
    cmd = build_process_command(
        source, cover, output, green_rect,
        flip=flip, speed=speed,
        voice_enabled=voice_enabled,
        voice_pitch_factor=voice_pitch_factor,
        crf=crf, preset=preset,
        output_width=output_width, output_height=output_height,
        zoom=zoom, pan_x=pan_x, pan_y=pan_y,
        mask_path=mask_path, encoder=encoder,
        output_duration=duration, fit_mode=fit_mode,
        cover_is_video=is_video_cover(cover),
    )
    source_size = Path(source).stat().st_size if Path(source).exists() else 0
    if on_log:
        on_log(f"Input video: {Path(source).name} "
               f"({source_size / 1024 / 1024:.1f} MB)" if Path(source).exists() else f"Input video: {Path(source).name}")
        on_log(f"Input cover: {Path(cover).name} "
               f"({Path(cover).stat().st_size / 1024 / 1024:.1f} MB)" if Path(cover).exists() else f"Input cover: {Path(cover).name}")
        on_log(f"Green area: x={green_rect.get('x')}, y={green_rect.get('y')}, "
               f"w={green_rect.get('w')}, h={green_rect.get('h')}")
        on_log(f"Settings: preset={preset}, CRF={crf}, speed={speed}x, "
               f"flip={'on' if flip else 'off'}, zoom={zoom}x, pan={pan_x}%,{pan_y}%")
        on_log("Running FFmpeg: compositing video onto cover…")
    if on_progress:
        on_progress(2, 0, None)
    ok, out = run_with_progress(cmd, duration, 0, 90,
                                on_progress=on_progress, on_log=on_log)
    if not ok:
        return False, f"FFmpeg failed while building the final video:\n{out}"
    # REMOVED (user, 2026-11-01, quality must never drop): the old
    # auto re-encode that shrank a final larger than its source by
    # raising CRF. That trades quality for size, which is now
    # forbidden. A final larger than its source is kept as-is.
    if Path(output).exists() and source_size and Path(output).stat().st_size > source_size:
        if on_log:
            on_log(f"Final ({Path(output).stat().st_size / 1024 / 1024:.1f} MB) is larger than "
                   f"source ({source_size / 1024 / 1024:.1f} MB) — kept as-is for quality, not shrunk.")
    if on_log:
        on_log(f"Final video written: {Path(output).name} "
               f"({Path(output).stat().st_size / 1024 / 1024:.1f} MB)" if Path(output).exists() else "Final video written.")
        on_log("Running FFmpeg: building 720px preview…")
    if on_progress:
        on_progress(92, 0, None)
    ok, out = run_with_progress(build_preview_command(output, preview_path),
                                duration, 90, 10, on_progress=on_progress, on_log=on_log)
    if not ok:
        # A missing preview is not fatal: the final video exists.
        return True, f"Final video done, but preview failed:\n{out}"
    if on_log:
        on_log(f"Preview written: {Path(preview_path).name} "
               f"({Path(preview_path).stat().st_size / 1024 / 1024:.1f} MB)" if Path(preview_path).exists() else "Preview written.")
        on_log("Done.")
    if on_progress:
        on_progress(100, 0, None)
    return True, "ok"
