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
            # Slightly looser than before: shadowed/darker green at
            # the bottom of a green screen was previously missed,
            # leaving a green strip visible under the video.
            green[y][x] = g > 90 and g - r > 25 and g - b > 25
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
                      on_progress=None, on_log=None) -> tuple[bool, str]:
    """Run FFmpeg, parsing its time= output into a 0-100 progress value.

    base/span map this encode onto the overall job: the final encode
    is 0-90%, the preview encode is 90-100%. When duration is unknown,
    progress stays stage-based (base + a slow climb) instead of faking
    an exact percent — the frontend shows elapsed time in that case.
    """
    start = time.time()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, errors="replace", bufsize=1)
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
    # Equal (uniform) zoom, never stretch: scale with
    # force_original_aspect_ratio=increase so the video is scaled
    # equally in both directions until it covers the green box,
    # then crop to exactly the box. Pan moves the crop window the
    # opposite way, clamped so the crop never leaves the scaled
    # video — i.e. the video never leaves the green box either.
    # Crop x/y use iw/ih expressions, so they stay correct whatever
    # the source video's own aspect ratio is.
    pan_px = float(pan_x or 0) / 100 * w
    pan_py = float(pan_y or 0) / 100 * h
    # Commas inside min()/max() must be quoted, otherwise FFmpeg
    # reads them as filter separators ("No such filter: '0)'").
    crop_x = f"'min(max((iw-{w})/2-{pan_px:.0f},0),iw-{w})'"
    crop_y = f"'min(max((ih-{h})/2-{pan_py:.0f},0),ih-{h})'"
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
        "-threads", "0",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "96k",
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
        "-vf", "scale=480:-2",
        "-c:v", "libx264",
        "-crf", "32",
        "-preset", "ultrafast",
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
        zoom=zoom, pan_x=pan_x, pan_y=pan_y,
    )
    # Effective output duration: source duration divided by speed.
    duration = get_duration(source)
    if duration:
        duration = duration / max(0.5, min(2.0, float(speed) or 1.0))
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
    # Compression guarantee: if Compress is on and the final file is
    # LARGER than the source (as happened: 28.9 MB source -> 124.7 MB
    # final with ultrafast CRF 22), re-encode once with a higher CRF
    # and medium preset. Ultrafast is fast but very inefficient —
    # it disables the compression tools that make a file small.
    # This second pass costs extra time, but only runs when needed.
    if compress and Path(output).exists() and source_size and Path(output).stat().st_size > source_size:
        if on_log:
            on_log(f"Final ({Path(output).stat().st_size / 1024 / 1024:.1f} MB) is larger than "
                   f"source ({source_size / 1024 / 1024:.1f} MB) — re-encoding smaller (CRF {min(32, crf + 6)}, medium preset)…")
        retry_crf = min(32, int(crf) + 6)
        retry_cmd = build_process_command(
            source, cover, output, green_rect,
            flip=flip, speed=speed,
            voice_enabled=voice_enabled,
            voice_pitch_factor=voice_pitch_factor,
            crf=retry_crf, preset="medium",
            output_width=output_width, output_height=output_height,
            zoom=zoom, pan_x=pan_x, pan_y=pan_y,
        )
        ok2, out2 = run_with_progress(retry_cmd, duration, 0, 90,
                                      on_progress=on_progress, on_log=on_log)
        if ok2 and Path(output).exists():
            if on_log:
                on_log(f"Re-encoded final: {Path(output).stat().st_size / 1024 / 1024:.1f} MB")
        else:
            if on_log:
                on_log("Smaller re-encode failed, keeping the first final video.")
    if on_log:
        on_log(f"Final video written: {Path(output).name} "
               f"({Path(output).stat().st_size / 1024 / 1024:.1f} MB)" if Path(output).exists() else "Final video written.")
        on_log("Running FFmpeg: building 640px preview…")
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
