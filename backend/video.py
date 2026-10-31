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

import shutil
import subprocess
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
    speed = float(speed) if speed else 1.0
    if speed <= 0:
        speed = 1.0
    # atempo only accepts 0.5-100 in a single filter; our UI is 0.5-2.0.
    speed = max(0.5, min(2.0, speed))

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

    if output_width and output_height:
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
) -> tuple[bool, str]:
    """Run the full process + preview pipeline for one job."""
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
    )
    ok, out = run_command(cmd)
    if not ok:
        return False, f"FFmpeg failed while building the final video:\n{out}"
    ok, out = run_command(build_preview_command(output, preview_path))
    if not ok:
        # A missing preview is not fatal: the final video exists.
        return True, f"Final video done, but preview failed:\n{out}"
    return True, "ok"
