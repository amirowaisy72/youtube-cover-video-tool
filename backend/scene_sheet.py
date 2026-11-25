"""YT Guru — contact sheet of a scene: the AI that wrote the code can SEE what it made.

One picture with 4-6 frames of the scene's preview, each with its time and the words spoken up to it
(the word being said at that moment is highlighted), under the scene's VISUAL IDEA and narration.
The user attaches it to the AI together with the fix prompt, or Gemini reviews it (tools_review.py).
"""
from __future__ import annotations

import subprocess
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONTS = Path(__file__).resolve().parent / "fonts"
BG, PANEL, INK, DIM, GOLD, RED = (18, 22, 30), (30, 36, 48), (236, 238, 242), (150, 158, 172), (242, 184, 59), (235, 90, 70)


def _font(bold: bool, size: int):
    try:
        return ImageFont.truetype(str(FONTS / ("Poppins-Bold.ttf" if bold else "Poppins-Medium.ttf")), size)
    except OSError:
        return ImageFont.load_default()


def frame_times(duration: float, mark: float | None = None) -> list[float]:
    """4-6 moments spread over the scene: near the end of each equal part (when its action has happened),
    the first one early (is something visible at once?). `mark` (a paused moment) is always included."""
    d = max(0.5, float(duration))
    n = max(4, min(6, round(d / 1.8)))
    times = [d * (k + 0.8) / n for k in range(n)]
    times[0] = min(times[0], 1.0)
    times[-1] = d - 0.15
    if mark is not None:
        m = max(0.05, min(d - 0.1, float(mark)))
        k = min(range(n), key=lambda i: abs(times[i] - m))
        times[k] = m
    return [round(max(0.05, min(d - 0.05, t)), 2) for t in sorted(times)]


def spoken(words: list, times: list[float]) -> list[dict]:
    """For every frame: the words said since the frame before it. words = [[word, start seconds], ...]."""
    out, prev = [], -1.0
    for k, t in enumerate(times):
        end = t if k + 1 < len(times) else 1e9  # the last frame also lists whatever is left
        said = [str(w) for w, at in words if prev < float(at) <= end]
        now = [str(w) for w, at in words if float(at) <= t]
        out.append({"t": t, "said": " ".join(said), "now": now[-1] if now else ""})
        prev = end
    return out


def _grab(video: Path, t: float) -> Image.Image | None:
    try:
        import video as video_module
        quiet = video_module.no_window_kwargs()
    except Exception:  # noqa: BLE001
        quiet = {}
    for at in (t, max(0.0, t - 0.4)):  # the very end of a clip may have no frame
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{at:.2f}", "-i", str(video), "-frames:v", "1", "-f", "image2pipe",
                            "-vcodec", "png", "-"], capture_output=True, timeout=60, **quiet)
        if r.stdout:
            return Image.open(BytesIO(r.stdout)).convert("RGB")
    return None


def _wrap(text: str, font, width: float, limit: int) -> list[str]:
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
    if len(lines) > limit:
        lines = lines[:limit]
        lines[-1] = lines[-1][:-1] + "…"
    return lines


def make(video: Path, out: Path, words: list, duration: float, number: int, idea: str = "", narration: str = "",
         mark: float | None = None) -> list[dict]:
    """Writes the sheet (PNG) -> the frames shown on it: [{"t": seconds, "said": words, "paused": bool}]."""
    times = frame_times(duration, mark)
    info = spoken(words, times)
    shots = [_grab(Path(video), t) for t in times]
    first = next((s for s in shots if s is not None), None)
    if first is None:
        raise RuntimeError("No frame could be read from the scene preview.")
    vertical = first.height > first.width
    cw = 360 if vertical else 640
    ch = round(cw * first.height / first.width)
    cols = 3 if vertical else 2
    rows = (len(times) + cols - 1) // cols
    cap_f, cap_b = _font(False, 17), _font(True, 19)
    said = [_wrap(("said: " + i["said"]) if i["said"] else "(no new words)", cap_f, cw - 20, 3) for i in info]
    gap, cap = 12, 40 + 22 * max(len(x) for x in said)  # the caption strip is as tall as the longest one needs
    width = cols * cw + (cols + 1) * gap
    title_f, text_f = _font(True, 26), _font(False, 20)
    head = [("t", f"SCENE {number}  ·  {duration:.1f} seconds  ·  {len(times)} frames in time order", title_f, GOLD)]
    for line in _wrap("VISUAL IDEA: " + (idea or "(none written)"), text_f, width - 2 * gap, 3):
        head.append(("i", line, text_f, INK))
    for line in _wrap("NARRATION: " + narration, text_f, width - 2 * gap, 5):
        head.append(("n", line, text_f, DIM))
    head_h = 20 + sum(38 if kind == "t" else 30 for kind, *_ in head)
    sheet = Image.new("RGB", (width, head_h + rows * (ch + cap + gap) + gap), BG)
    d = ImageDraw.Draw(sheet)
    y = 12
    for kind, line, font, colour in head:
        d.text((gap, y), line, font=font, fill=colour)
        y += 38 if kind == "t" else 30
    frames = []
    for k, (shot, i) in enumerate(zip(shots, info)):
        x = gap + (k % cols) * (cw + gap)
        top = head_h + (k // cols) * (ch + cap + gap)
        paused = mark is not None and abs(i["t"] - max(0.05, min(duration - 0.1, mark))) < 0.06
        d.rectangle([x, top, x + cw - 1, top + cap - 1], fill=PANEL)
        d.text((x + 10, top + 6), f"FRAME {k + 1}  ·  {i['t']:.1f} s" + ("  ·  PAUSED HERE" if paused else ""),
               font=cap_b, fill=RED if paused else GOLD)
        # the words, the last one highlighted (it is being said in this frame)
        lines = said[k]
        for j, line in enumerate(lines):
            ly = top + 33 + j * 22
            at = line.rfind(i["now"]) if i["now"] and j == len(lines) - 1 else -1
            if at >= 0 and i["said"]:
                a = x + 10 + cap_f.getlength(line[:at])
                d.rectangle([a - 2, ly, a + cap_f.getlength(i["now"]) + 2, ly + 21], fill=(120, 90, 20))
            d.text((x + 10, ly), line, font=cap_f, fill=INK)
        if shot is not None:
            sheet.paste(shot.resize((cw, ch), Image.Resampling.LANCZOS), (x, top + cap))
        if paused:
            d.rectangle([x - 3, top - 3, x + cw + 2, top + cap + ch + 2], outline=RED, width=3)
        frames.append({"t": i["t"], "said": i["said"], "paused": paused})
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "PNG", optimize=True)
    return frames
