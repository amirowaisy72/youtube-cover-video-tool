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
import time
from pathlib import Path


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
    proc = subprocess.run(cmd, capture_output=True, text=True)
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
            capture_output=True, text=True, timeout=30)
        stream = json.loads(proc.stdout or "{}")["streams"][0]
        return int(stream["width"]), int(stream["height"])
    except Exception:
        return None


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
            green[y][x] = g > 110 and g - r > 35 and g - b > 35
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
    fx, fy = orig_w / sw, orig_h / sh
    return {
        "x": int(minx * fx), "y": int(miny * fy),
        "w": int((maxx - minx + 1) * fx), "h": int((maxy - miny + 1) * fy),
    }


def get_duration(path: str | Path) -> float | None:
    """Source duration in seconds via ffprobe, or None if unavailable."""
    if shutil.which("ffprobe") is None:
        return None
    try:
        proc = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "json", str(path)],
            capture_output=True, text=True, timeout=30)
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
                      on_progress=None) -> tuple[bool, str]:
    """Run FFmpeg, parsing its time= output into a 0-100 progress value.

    base/span map this encode onto the overall job: the final encode
    is 0-90%, the preview encode is 90-100%. When duration is unknown,
    progress stays stage-based (base + a slow climb) instead of faking
    an exact percent — the frontend shows elapsed time in that case.
    """
    start = time.time()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, errors="replace")
    tail: list[str] = []
    try:
        assert proc.stdout is not None
        for line in proc.stdout:
            tail.append(line)
            if len(tail) > 50:
                tail.pop(0)
            t = _parse_ffmpeg_time(line)
            if on_progress and duration:
                pct = base + min(span, span * t / duration)
                elapsed = time.time() - start
                eta = elapsed * (100 - pct) / pct if pct > 5 else None
                on_progress(round(pct, 1), elapsed, eta)
            elif on_progress:
                # Unknown duration: climb slowly to base+span-5, never fake 100%.
                elapsed = time.time() - start
                pct = base + min(span - 5, elapsed * 2)
                on_progress(round(pct, 1), elapsed, None)
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
) -> list[str]:
    """Build the FFmpeg command that composites a video onto a cover.

    Steps, in order:
      1. Scale the source video to the green-rect size.
      2. Optionally flip it left/right (hflip only, never vertical).
      3. Change its speed with setpts (video) / atempo (audio).
      4. Optionally shift voice pitch: asetrate changes the pitch,
         then atempo restores the original duration.
      5. Overlay the result onto the (looped) cover image at (x, y).
      6. Encode libx264 with the admin CRF/preset. A higher CRF means
         a smaller file; CRF 20-23 is a good "same look, smaller size"
         range, which is the HandBrake-style compression behaviour.
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

    # Zoom: scale up inside the green rectangle, then crop back to
    # exactly that rectangle — so a zoomed video can never spill
    # outside the green area, it just shows less of the video, bigger.
    zoom = max(1.0, min(2.0, float(zoom) if zoom else 1.0))
    if zoom > 1.0:
        video_filters = [f"scale={round(w * zoom)}:{round(h * zoom)}",
                         f"crop={w}:{h}"]
    else:
        video_filters = [f"scale={w}:{h}"]
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

    filter_complex = (
        f"{base_chain};"
        f"[1:v]{video_chain}[vid];"
        f"[base][vid]overlay={x}:{y}:shortest=1[outv]"
    )

    cmd = [
        "ffmpeg",
        "-y",
        "-loop", "1",
        "-i", str(cover),
        "-i", str(source),
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "1:a?",
        "-filter:a", audio_chain,
        "-c:v", "libx264",
        "-crf", str(int(crf)),
        "-preset", str(preset),
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-movflags", "+faststart",
        str(output),
    ]
    return cmd


def build_preview_command(
    final_video: str | Path,
    preview_path: str | Path,
) -> list[str]:
    """Build a small, fast preview encode of an already-made final video."""
    return [
        "ffmpeg",
        "-y",
        "-i", str(final_video),
        "-vf", "scale=640:-2",
        "-c:v", "libx264",
        "-crf", "28",
        "-preset", "fast",
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
    on_progress=None,
) -> tuple[bool, str]:
    """Run the full process + preview pipeline for one job.

    on_progress(percent, elapsed_seconds, eta_seconds_or_None) is called
    during both encodes so the UI can show a progress bar in the Edit
    section itself, with elapsed and remaining time.
    """
    missing = check_ffmpeg()
    if missing:
        return False, missing
    if not compress:
        # Without compression, use a near-lossless quality setting.
        crf = 18
        preset = "medium"
    cmd = build_process_command(
        source, cover, output, green_rect,
        flip=flip, speed=speed,
        voice_enabled=voice_enabled,
        voice_pitch_factor=voice_pitch_factor,
        crf=crf, preset=preset,
        output_width=output_width, output_height=output_height,
        zoom=zoom,
    )
    # Effective output duration: source duration divided by speed.
    duration = get_duration(source)
    if duration:
        duration = duration / max(0.5, min(2.0, float(speed) or 1.0))
    if on_progress:
        on_progress(2, 0, None)
    ok, out = run_with_progress(cmd, duration, 0, 90,
                                on_progress=on_progress)
    if not ok:
        return False, f"FFmpeg failed while building the final video:\n{out}"
    if on_progress:
        on_progress(92, 0, None)
    ok, out = run_with_progress(build_preview_command(output, preview_path),
                                duration, 90, 10, on_progress=on_progress)
    if not ok:
        # A missing preview is not fatal: the final video exists.
        return True, f"Final video done, but preview failed:\n{out}"
    if on_progress:
        on_progress(100, 0, None)
    return True, "ok"
