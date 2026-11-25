"""YT Guru — scene-to-scene transitions for Script mode: transition("whip" | "zoom" | "slide", "in" | "out").

Applied to the finished scene clip with FFmpeg (fast, whatever the scene's code does) in the first or last
0.28 s, so the scene's length and the voice timing never change. The sound is added by vis_script.py.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

KINDS = ("whip", "zoom", "slide")
LENGTH = 0.28
ALIASES = {"whip_pan": "whip", "whippan": "whip", "pan": "whip", "zoom_through": "zoom", "zoomthrough": "zoom", "push": "slide",
           "slide_up": "slide"}


def kind_name(name) -> str | None:
    n = str(name or "").strip().lower().replace(" ", "_").replace("-", "_")
    n = ALIASES.get(n, n)
    return n if n in KINDS else None


def filters(kinds: dict, width: int, height: int, fps: int, duration: float, colour: str) -> str:
    """The FFmpeg filter graph for {"in": kind, "out": kind} -> output pad [v]."""
    d, end = LENGTH, max(LENGTH, duration)
    steps, label = [], "0:v"

    def add(chain: str, inputs: str) -> None:
        nonlocal label
        new = f"s{len(steps)}"
        steps.append(f"{inputs}{chain}[{new}]")
        label = new

    for side in ("in", "out"):
        kind = kinds.get(side)
        if not kind:
            continue
        p = f"max(0\\,1-t/{d})" if side == "in" else f"max(0\\,(t-{end - d:.3f})/{d})"
        if kind in ("whip", "slide"):
            sign = "" if side == "in" else "-"
            x = f"{sign}W*pow({p}\\,3)" if kind == "whip" else "0"
            y = f"{sign}H*pow({p}\\,3)" if kind == "slide" else "0"
            bg = f"bg{len(steps)}"
            steps.append(f"color=c=0x{colour.lstrip('#')}:s={width}x{height}:r={fps}:d={end + 1:.3f}[{bg}]")
            add(f"overlay=x='{x}':y='{y}':shortest=1", f"[{bg}][{label}]")
            if kind == "whip":  # motion blur while it moves fast
                for share, size in ((0.4, width // 18), (0.7, width // 60)):
                    when = f"lt(t\\,{d * share:.3f})" if side == "in" else f"gt(t\\,{end - d * share:.3f})"
                    add(f"avgblur=sizeX={max(2, size)}:sizeY=1:enable='{when}'", f"[{label}]")
        else:  # zoom through
            t = f"(on/{fps})"
            q = f"max(0\\,1-{t}/{d})" if side == "in" else f"max(0\\,({t}-{end - d:.3f})/{d})"
            grow = 0.45 if side == "in" else 0.8
            add(f"zoompan=z='1+{grow}*pow({q}\\,2)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={width}x{height}:fps={fps}",
                f"[{label}]")
            when = f"t=in:st=0:d={d * 0.75:.3f}" if side == "in" else f"t=out:st={end - d * 0.75:.3f}:d={d * 0.75:.3f}"
            add(f"fade={when}:color=0x{colour.lstrip('#')}", f"[{label}]")
    steps.append(f"[{label}]format=yuv420p[v]")
    return ";".join(steps)


def apply(video: Path, kinds: dict, width: int, height: int, fps: int, duration: float, colour: str = "#1b2433",
          **popen) -> bool:
    """Rewrites the clip with its transitions; on any problem the clip stays as it was."""
    tmp = video.with_name(video.stem + ".tr.mp4")
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(video), "-filter_complex",
           filters(kinds, width, height, fps, duration, colour), "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "veryfast",
           "-crf", "17", "-r", str(fps), str(tmp)]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600, **popen)
        if r.returncode == 0 and tmp.exists() and tmp.stat().st_size > 1000:
            os.replace(tmp, video)
            return True
        print("scene transition failed:", (r.stderr or "")[-400:])
    except Exception as exc:  # noqa: BLE001
        print("scene transition failed:", exc)
    tmp.unlink(missing_ok=True)
    return False
