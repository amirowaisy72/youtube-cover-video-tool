"""The Talking Presenter's video: the storyboard (scenes with their times), the backgrounds, the presenter on
top, the voice wave, the word-by-word subtitles, and the final render.

One scene = one piece of the voiceover. Layers, bottom to top: background (colour, your scene code, stock
clip, one image or sliding images) -> presenter (cut out) -> voice wave -> subtitles. ffmpeg decodes, scales
and encodes and draws the subtitles; the presenter and the wave are laid on with numpy.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageColor, ImageDraw, ImageFont

import presenter_face as pf
import presenter_lipsync as ls

FPS = 25
SIZES = {"long": (1280, 720), "short": (1080, 1920)}
SMALL = {"long": (640, 360), "short": (360, 640)}
TYPES = ("color", "graphic", "stock", "image", "slides")
POSITIONS = ("bottom-left", "bottom-right", "center", "hidden")
FONTS = {"Poppins": "Poppins-Bold.ttf", "DM Serif Display": "DMSerifDisplay-Regular.ttf",
         "Cormorant Garamond": "CormorantGaramond.ttf"}
FONT_DIR = Path(__file__).resolve().parent / "fonts"
PRESETS = {"long": {"position": "bottom-right", "size": 0.66}, "short": {"position": "center", "size": 0.44}}
DEFAULT_LAYOUT = {"format": "long", "position": "bottom-right", "size": 0.66, "effect": "shadow", "border_color": "#ffffff"}
DEFAULT_EXTRAS = {"wave": {"on": True, "style": "bars", "color": "#f6c445"},
                  "subs": {"on": True, "style": "pop", "font": "Poppins", "color": "#ffffff", "highlight": "#f6c445",
                           "position": "bottom", "size": 1.0}}


class Stop(BaseException):
    """Stop was pressed (not an Exception, so no fallback swallows it)."""


def _quiet() -> dict:
    import video
    return video.no_window_kwargs()


def ffmpeg(args: list[str], cwd: Path | None = None, timeout: int = 1800) -> None:
    run = subprocess.run(["ffmpeg", "-y", "-v", "error", *args], cwd=str(cwd) if cwd else None, capture_output=True,
                         timeout=timeout, **_quiet())
    if run.returncode:
        raise RuntimeError("FFmpeg failed: " + run.stderr.decode(errors="ignore")[-600:])


def close_pipe(proc: subprocess.Popen) -> None:
    proc.stdin.close()
    if proc.wait(timeout=1800):
        raise RuntimeError("FFmpeg could not write the video.")


# ------------------------------------------------------------------ words and scenes
def hear_words(voice: Path, script: str) -> list[dict]:
    """[{word, start, end}] for every word of the script, timed on the voiceover itself."""
    import autovideo2
    import tools_subtitles as subs
    sound = subs._decode_for_whisper(voice)
    found, _info = subs._get_model().transcribe(sound, beam_size=5, word_timestamps=True)
    heard = [{"word": w.word.strip(), "start": float(w.start), "end": float(w.end)} for s in found for w in (s.words or [])]
    words = script.split()
    total = len(sound) / 16000
    if heard:
        timed = autovideo2._align_to_script(heard, " ".join(words))
        if len(timed) == len(words):
            return timed
    step = total / max(1, len(words))  # the recogniser heard something else: spread the words evenly
    return [{"word": w, "start": i * step, "end": (i + 1) * step} for i, w in enumerate(words)]


def sentences(script: str) -> list[tuple[int, int]]:
    """(first word, last word + 1) of every sentence of the script."""
    out, at = [], 0
    for line in script.split("\n"):
        words = line.split()
        begin = 0
        for i, w in enumerate(words):
            if i == len(words) - 1 or re.search(r"[.!?…۔؟][\"'”’)]*$", w):
                out.append((at + begin, at + i + 1))
                begin = i + 1
        at += len(words)
    return out


def build_scenes(script: str, words: list[dict], duration: float, old: list[dict] | None = None,
                 target: float = 9.0) -> list[dict]:
    """The storyboard: a short hook, the middle in pieces of about `target` seconds, a short ending.
    The presenter is on in every scene. Settings of unchanged scenes are kept."""
    parts = sentences(script)
    if not parts:
        return []
    length = lambda a, b: words[b - 1]["end"] - words[a]["start"]  # noqa: E731

    def take(items: list, least: float = 3.0) -> int:
        n = 1
        while n < len(items) and length(items[0][0], items[n - 1][1]) < least:
            n += 1
        return n
    head = take(parts)
    tail = 0
    if len(parts) > head:
        tail = 1
        while tail < len(parts) - head and length(parts[-tail][0], parts[-1][1]) < 3.0:
            tail += 1
    groups = [(parts[0][0], parts[head - 1][1])]
    cur = None
    for a, b in parts[head:len(parts) - tail]:
        if cur and length(cur[0], b) > target * 1.25:
            groups.append(cur)
            cur = None
        cur = (cur[0], b) if cur else (a, b)
        if length(*cur) >= target:
            groups.append(cur)
            cur = None
    if cur:
        groups.append(cur)
    if tail:
        groups.append((parts[-tail][0], parts[-1][1]))
    starts = [0.0] + [max(0.0, (words[a - 1]["end"] + words[a]["start"]) / 2) for a, _b in groups[1:]]
    every = script.split()
    kept = {s["narration"]: s for s in old or []}
    scenes = []
    for i, (a, b) in enumerate(groups):
        start = round(round(starts[i] * FPS) / FPS, 3)
        end = round(round((starts[i + 1] if i + 1 < len(groups) else duration) * FPS) / FPS, 3)
        narration = " ".join(every[a:b])
        scene = {"narration": narration, "first": a, "last": b, "start": start, "end": max(end, start + 0.4),
                 "presenter": True, "position": "", "size": 0,
                 "bg": {"type": "color", "color": "#1b2433"}}
        if narration in kept:
            for key in ("presenter", "position", "size", "bg"):
                scene[key] = kept[narration][key]
        scenes.append(scene)
    return scenes


# ------------------------------------------------------------------ backgrounds
def _cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    k = max(size[0] / img.width, size[1] / img.height)
    big = img.resize((max(size[0], round(img.width * k)), max(size[1], round(img.height * k))), Image.LANCZOS)
    x, y = (big.width - size[0]) // 2, (big.height - size[1]) // 2
    return big.crop((x, y, x + size[0], y + size[1]))


def gradient(color: str, size: tuple[int, int]) -> np.ndarray:
    try:
        top = np.array(ImageColor.getrgb(color)[:3], np.float32)
    except ValueError:
        top = np.array((27, 36, 51), np.float32)
    k = np.linspace(1.18, 0.62, size[1], dtype=np.float32)[:, None, None]
    return np.clip(np.broadcast_to(top, (size[1], size[0], 3)) * k, 0, 255).astype(np.uint8)


def note_card(text: str, size: tuple[int, int]) -> np.ndarray:
    img = Image.fromarray(gradient("#33415c", size))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(FONT_DIR / "Poppins-Medium.ttf"), max(14, size[0] // 38))
    d.text((size[0] / 2, size[1] * 0.3), text, font=font, fill=(235, 240, 250), anchor="mm")
    return np.asarray(img)


def decode(path: Path, size: tuple[int, int], count: int, filters: str, loop: bool = False, channels: int = 3):
    """count frames of a video, as numpy arrays (the last one repeats if the video is shorter)."""
    pix = "rgb24" if channels == 3 else "gray"
    args = ["ffmpeg", "-v", "error", *(["-stream_loop", "-1"] if loop else []), "-i", str(path), "-vf",
            f"{filters},fps={FPS}", "-frames:v", str(count), "-f", "rawvideo", "-pix_fmt", pix, "-"]
    proc = subprocess.Popen(args, stdout=subprocess.PIPE, **_quiet())
    need = size[0] * size[1] * channels
    shape = (size[1], size[0], channels) if channels == 3 else (size[1], size[0])
    last = None
    try:
        for _ in range(count):
            data = proc.stdout.read(need)
            if len(data) == need:
                last = np.frombuffer(data, np.uint8).reshape(shape)
            if last is None:
                raise RuntimeError(f"Could not read the video {path.name}.")
            yield last
    finally:
        proc.stdout.close()
        if proc.poll() is None:
            proc.kill()
        proc.wait()


def _roomy(path: Path, size: tuple[int, int]) -> Image.Image:
    img = Image.open(path).convert("RGB")
    k = max(size[0] / img.width, size[1] / img.height) * 1.25  # room to move
    return img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)


def _ken_burns(img: Image.Image, number: int, t: float, size: tuple[int, int]) -> np.ndarray:
    """The picture number `number`, t (0..1) of the way through its slow zoom and slide."""
    base = min(img.width / size[0], img.height / size[1])
    t = max(0.0, min(1.0, t))
    t = t * t * (3 - 2 * t)
    zoom = base * (1 - 0.16 * t if number % 2 == 0 else 0.84 + 0.16 * t)  # in, then out
    w, h = size[0] * zoom, size[1] * zoom
    dx, dy = [(1, 0), (-1, 0), (0, -1), (0.7, 0.7)][number % 4]
    x = (img.width - w) / 2 * (1 + dx * (t - 0.5) * 1.6)
    y = (img.height - h) / 2 * (1 + dy * (t - 0.5) * 1.6)
    return np.asarray(img.resize(size, Image.BILINEAR, box=(x, y, x + w, y + h)))


def spread_slides(files: list[str], scenes: list[dict]) -> list[list[dict]]:
    """Many images over the whole video, in order, each for an equal share of the narration's time
    -> for every scene its pieces [{file, number, seconds, from, to, before}]."""
    total = scenes[-1]["end"]
    each = total / len(files)
    out = []
    for s in scenes:
        a, b = s["start"], s["end"]
        found = []
        for k, name in enumerate(files):
            start, end = k * each, (k + 1) * each
            shared = min(b, end) - max(a, start)
            if shared > min(0.4, (b - a) / 2, each / 2):
                found.append({"file": name, "number": k, "seconds": round(shared, 3),
                              "from": round((max(a, start) - start) / each, 4), "to": round((min(b, end) - start) / each, 4),
                              "before": files[k - 1] if k else ""})
        if not found:
            k = min(len(files) - 1, int((a + b) / 2 / each))
            found = [{"file": files[k], "number": k, "seconds": round(b - a, 3), "from": 0.0, "to": 1.0,
                      "before": files[k - 1] if k else ""}]
        out.append(found)
    return out


def timed_slides(folder: Path, parts: list[dict], size: tuple[int, int], count: int):
    """One scene's share of the images: an image that runs on into the next scene carries on where it was."""
    total = sum(p["seconds"] for p in parts) or 1.0
    done, shown = 0, 0.0
    for i, p in enumerate(parts):
        shown += p["seconds"]
        upto = count if i == len(parts) - 1 else round(count * shown / total)
        frames = upto - done
        img = _roomy(folder / p["file"], size)
        fresh = p["from"] < 0.03 and p.get("before") and (folder / p["before"]).exists()
        last = _ken_burns(_roomy(folder / p["before"], size), p["number"] - 1, 1.0, size) if fresh else None
        fade = min(12, frames // 3)
        for n in range(frames):
            t = p["from"] + (p["to"] - p["from"]) * (n / max(1, frames - 1))
            frame = _ken_burns(img, p["number"], t, size)
            if last is not None and n < fade:
                mix = (n + 1) / (fade + 1)
                frame = (last * (1 - mix) + frame * mix).astype(np.uint8)
            yield frame
        done = upto


def slides(files: list[Path], size: tuple[int, int], count: int):
    """Images one after another, each slowly zooming and sliding, with short cross-fades."""
    pictures = []
    for f in files:
        img = Image.open(f).convert("RGB")
        k = max(size[0] / img.width, size[1] / img.height) * 1.25  # room to move
        pictures.append(img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS))
    each = count / len(pictures)
    fade = min(12, int(each / 3))

    def view(i: int, t: float) -> np.ndarray:
        img = pictures[i]
        base = min(img.width / size[0], img.height / size[1])
        t = max(0.0, min(1.0, t))
        t = t * t * (3 - 2 * t)
        zoom = base * (1 - 0.16 * t if i % 2 == 0 else 0.84 + 0.16 * t)  # in, then out
        w, h = size[0] * zoom, size[1] * zoom
        dx, dy = [(1, 0), (-1, 0), (0, -1), (0.7, 0.7)][i % 4]
        x = (img.width - w) / 2 * (1 + dx * (t - 0.5) * 1.6)
        y = (img.height - h) / 2 * (1 + dy * (t - 0.5) * 1.6)
        return np.asarray(img.resize(size, Image.BILINEAR, box=(x, y, x + w, y + h)))

    for n in range(count):
        i = min(len(pictures) - 1, int(n / each))
        local = n - i * each
        frame = view(i, local / max(1.0, each))
        if i and local < fade:
            mix = (local + 1) / (fade + 1)
            frame = (view(i - 1, 1.0) * (1 - mix) + frame * mix).astype(np.uint8)
        yield frame


def background_problem(folder: Path, scene: dict) -> str:
    """Why this scene's background cannot be rendered yet ("" = it can)."""
    bg = scene["bg"]
    kind = bg.get("type", "color")
    if kind == "graphic":
        if not str(bg.get("code") or "").strip():
            return "has no scene code yet"
        if bg.get("test") and not bg["test"].get("ok"):
            return "has scene code with an error: " + str(bg["test"].get("error"))[:120]
    elif kind in ("stock", "image"):
        if not (bg.get("files") and (folder / "media" / bg["files"][0]).exists()):
            return "has no stock clip chosen" if kind == "stock" else "has no image yet"
    elif kind == "slides":
        if not [f for f in bg.get("files") or [] if (folder / "media" / f).exists()]:
            return "has no images yet"
    return ""


def graphic_scene(scenes: list[dict]) -> list[dict]:
    """The storyboard as Script mode scenes (for its prompts, tests and renderer)."""
    return [{"narration": s["narration"], "code": s["bg"].get("code") or "",
             "duration_sec": round(s["end"] - s["start"], 2), "script_test": s["bg"].get("test") or {}} for s in scenes]


def write_word_files(work: Path, scenes: list[dict], words: list[dict]) -> None:
    work.mkdir(parents=True, exist_ok=True)
    for i, s in enumerate(scenes):
        mine = [{"word": w["word"], "start": max(0.0, w["start"] - s["start"]), "end": max(0.0, w["end"] - s["start"])}
                for w in words[s["first"]:s["last"]]]
        (work / f"scene-{i:02d}.words.json").write_text(json.dumps(mine), encoding="utf-8")


def background(folder: Path, scenes: list[dict], index: int, size: tuple[int, int], count: int, layout: dict,
               preview: bool, sounds: list):
    """The frames behind the presenter for one scene."""
    scene = scenes[index]
    bg = scene["bg"]
    kind = bg.get("type", "color")
    problem = background_problem(folder, scene)
    if problem and (not preview or kind != "graphic"):
        if not preview:
            raise RuntimeError(f"Scene {index + 1} {problem}.")
        still = note_card(f"Scene {index + 1} {problem}"[:60], size)
        return (still for _ in range(count))
    fill = f"scale={size[0]}:{size[1]}:force_original_aspect_ratio=increase,crop={size[0]}:{size[1]},setsar=1"
    if kind == "stock":
        return decode(folder / "media" / bg["files"][0], size, count, fill, loop=True)
    if kind == "image":
        still = np.asarray(_cover(Image.open(folder / "media" / bg["files"][0]).convert("RGB"), size))
        return (still for _ in range(count))
    if kind == "slides":
        if bg.get("parts") and all((folder / "media" / p["file"]).exists() for p in bg["parts"]):
            return timed_slides(folder / "media", bg["parts"], size, count)
        return slides([folder / "media" / f for f in bg["files"] if (folder / "media" / f).exists()], size, count)
    if kind == "graphic":
        import tools_script as ts
        work = folder / "graphics"
        script = graphic_scene(scenes)
        if preview:
            test = bg.get("test") or {}
            clip = work / str(test.get("video") or "")
            if not (test.get("video") and clip.exists()):
                still = note_card(f"Scene {index + 1}: press Test to see the graphics" if not problem
                                  else f"Scene {index + 1} {problem}"[:60], size)
                return (still for _ in range(count))
        else:
            clip = ts.clip_for_scene(script[index], index, work, script[index]["duration_sec"], None,
                                     layout["format"] == "short")
            if clip is None:
                raise RuntimeError(f"Scene {index + 1}: the graphics could not be drawn. Test the scene to see why.")
        events = clip.with_suffix(".sfx.json")
        if events.exists():
            try:
                sounds.extend({**e, "t": float(e.get("t", 0)) + scene["start"]} for e in json.loads(events.read_text(encoding="utf-8"))
                              if float(e.get("t", 0)) < scene["end"] - scene["start"])
            except (ValueError, TypeError):
                pass
        return decode(clip, size, count, fill + ",tpad=stop_mode=clone:stop_duration=600")
    still = gradient(bg.get("color") or "#1b2433", size)
    return (still for _ in range(count))


# ------------------------------------------------------------------ the presenter layer
def placement(layout: dict, scene: dict, aspect: float, size: tuple[int, int]) -> tuple[int, int, int, int] | None:
    """(x, y, width, height) of the presenter, standing on the bottom edge; None = hidden."""
    position = scene.get("position") or layout["position"]
    if not scene.get("presenter") or position == "hidden":
        return None
    width, height = size
    h = max(0.2, min(0.98, float(scene.get("size") or layout["size"]))) * height
    w = h * aspect
    if w > width * 0.96:
        w, h = width * 0.96, width * 0.96 / aspect
    w, h = int(w) // 2 * 2, int(h) // 2 * 2
    margin = int(width * 0.025)
    x = margin if position == "bottom-left" else width - w - margin if position == "bottom-right" else (width - w) // 2
    return x, height - h, w, h


def _times(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """a * b / 255 for two uint8 pictures."""
    return ls._cv().multiply(a, b, scale=1 / 255.0)


def decorate(color: np.ndarray, alpha: np.ndarray, effect: str, border: str) -> tuple[np.ndarray, np.ndarray, int]:
    """The presenter with a soft shadow or a border -> (colour already multiplied by its solidity, solidity,
    margin added around), uint8."""
    cv2 = ls._cv()
    three = cv2.merge([alpha, alpha, alpha])
    premul = _times(np.ascontiguousarray(color), three)
    if effect not in ("shadow", "border"):
        return premul, alpha, 0
    h, w = alpha.shape
    pad = max(6, h // 28)
    big_a = cv2.copyMakeBorder(alpha, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    big_c = cv2.copyMakeBorder(premul, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    full = (big_a.shape[1], big_a.shape[0])
    small = cv2.resize(big_a, (max(1, full[0] // 3), max(1, full[1] // 3)), interpolation=cv2.INTER_LINEAR)
    if effect == "shadow":
        soft = cv2.resize(cv2.GaussianBlur(small, (0, 0), max(1.5, h / 170)), full, interpolation=cv2.INTER_LINEAR)
        shift = max(2, h // 70)
        under = np.zeros_like(big_a)
        under[shift:, shift:] = cv2.convertScaleAbs(soft[:-shift, :-shift], alpha=0.55)
    else:
        grown = cv2.resize(cv2.GaussianBlur(small, (0, 0), max(1.2, h / 420)), full, interpolation=cv2.INTER_LINEAR)
        under = cv2.convertScaleAbs(cv2.subtract(grown, 10), alpha=255 / 30)
    keep = cv2.bitwise_not(big_a)
    shown = _times(under, keep)  # what is seen of the layer underneath
    if effect == "border":
        r, g, b = ImageColor.getrgb(border)[:3]
        fill = cv2.merge([cv2.convertScaleAbs(shown, alpha=v / 255.0) for v in (r, g, b)])
        big_c = cv2.add(big_c, fill)
    return big_c, cv2.add(big_a, shown), pad


def paste(frame: np.ndarray, rgb: np.ndarray, a: np.ndarray, x: int, y: int) -> None:
    """Lay an already multiplied picture on the frame at (x, y), cut at the frame's edges."""
    cv2 = ls._cv()
    h, w = a.shape
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(frame.shape[1], x + w), min(frame.shape[0], y + h)
    if x1 <= x0 or y1 <= y0:
        return
    part = a[y0 - y:y1 - y, x0 - x:x1 - x]
    top = np.ascontiguousarray(rgb[y0 - y:y1 - y, x0 - x:x1 - x])
    keep = cv2.bitwise_not(part)
    region = np.ascontiguousarray(frame[y0:y1, x0:x1])
    frame[y0:y1, x0:x1] = cv2.add(_times(region, cv2.merge([keep, keep, keep])), top)


class Cast:
    """The presenter of one video, opened once per size and kept while rendering."""

    def __init__(self, folder: Path, job: dict):
        self.folder, self.job = folder, job
        self._samples = None
        self._open: dict = {}

    def box(self) -> tuple[int, int, int, int]:
        """The part of the photo around the person, with room for the head to move."""
        alpha = np.asarray(Image.open(self.folder / "cutout.png").split()[-1])
        return pf.bounds(alpha, pad=max(14, alpha.shape[0] // 45))

    def performance(self, size: tuple[int, int]):
        if size not in self._open:
            if self._samples is None:
                self._samples = ls.read_voice(self.folder / "voice.mp3")
            duration = len(self._samples) / 16000
            recording = (self.job.get("voice") or {}).get("provider") in ("original", "upload")
            self._open[size] = ls.engine(self.job.get("engine", "pc")).open(
                self.folder, size, self.box(), self._samples, self.job.get("words") or [], duration,
                {**(self.job.get("motion") or {}), "recording": recording})
        return self._open[size]


def presenter_frames(cast: Cast, scene: dict, layout: dict, size: tuple[int, int], first: int, count: int):
    """(x, y, frames of (rgb, solidity, margin)) of the presenter for one scene, or None when hidden."""
    if not scene.get("presenter") or (scene.get("position") or layout["position"]) == "hidden":
        return None
    if not (cast.folder / "face.npy").exists():
        raise RuntimeError("Choose a presenter photo first (step 4).")
    left, top, right, bottom = cast.box()
    x, y, w, h = placement(layout, scene, (right - left) / (bottom - top), size)

    def frames():
        show = cast.performance((w, h))
        for n in range(count):
            rgb, alpha = show.frame(first + n)
            yield decorate(rgb, alpha, layout["effect"], layout["border_color"])
    return x, y, frames()


def clear_of_face(cast: "Cast", scene: dict, extras: dict, layout: dict, size: tuple[int, int]) -> dict:
    """The extras for one scene: when the captions or the wave would cover the presenter's face (a close-up photo),
    they move into the free space beside the presenter, or else above the head."""
    subs = extras["subs"]
    if not scene.get("presenter") or (scene.get("position") or layout["position"]) == "hidden":
        return extras
    if subs["on"] and subs.get("position") != "bottom" or not (subs["on"] or extras["wave"]["on"]):
        return extras
    left, top, right, bottom = cast.box()
    x, y, w, h = placement(layout, scene, (right - left) / (bottom - top), size)
    points = np.load(cast.folder / "face.npy")[:, :2]
    points = (points - (left, top)) * (w / (right - left), h / (bottom - top)) + (x, y)
    face_left, face_right = float(points[234][0]), float(points[454][0])
    face_top, face_bottom = float(points[10][1]), float(points[152][1])
    m = subtitle_metrics(extras, layout, size)
    wave_x, wave_y, wave_w, wave_h = wave_place(extras, layout, size)
    blocks = []
    if extras["wave"]["on"]:
        blocks.append((wave_x, wave_x + wave_w, wave_y, wave_y + wave_h))
    if subs["on"]:
        reach = size[0] * 0.3
        blocks.append((size[0] / 2 - reach, size[0] / 2 + reach, size[1] - m["margin"] - m["font"] * 1.2, size[1] - m["margin"]))
    if not any(a < face_right and b > face_left and c < face_bottom and d > face_top for a, b, c, d in blocks):
        return extras
    gap = size[0] * 0.015
    left_room, right_room = face_left - gap, size[0] - face_right - gap
    if max(left_room, right_room) >= size[0] * 0.55:          # the presenter stands to one side: use the other
        area = (size[0] * 0.03, left_room) if left_room >= right_room else (face_right + gap, size[0] * 0.97)
        return {**extras, "subs": {**subs, "area": [round(area[0]), round(area[1])]}}
    head_top = max(0.0, min(float(y), face_top - (face_bottom - face_top) * 0.25))
    margin = int(min(size[1] * 0.78, size[1] - head_top + size[1] * 0.012))
    return {**extras, "subs": {**subs, "margin": margin}}


# ------------------------------------------------------------------ voice wave
def voice_levels(voice: Path, bands: int = 36) -> np.ndarray:
    """(frames, bands) between 0 and 1: how loud each pitch band is at every video frame."""
    samples = ls.read_voice(voice)
    count = max(1, math.ceil(len(samples) / 16000 * FPS))
    window = 1024
    padded = np.concatenate([np.zeros(window // 2, np.float32), samples, np.zeros(window, np.float32)])
    freqs = np.fft.rfftfreq(window, 1 / 16000)
    edges = np.geomspace(90, 5200, bands + 1)
    groups = [np.nonzero((freqs >= edges[i]) & (freqs < edges[i + 1]))[0] for i in range(bands)]
    groups = [g if len(g) else np.array([int(np.argmin(abs(freqs - edges[i])))]) for i, g in enumerate(groups)]
    hann = np.hanning(window).astype(np.float32)
    out = np.zeros((count, bands), np.float32)
    for f in range(count):
        at = int(f / FPS * 16000)
        spectrum = np.abs(np.fft.rfft(padded[at:at + window] * hann))
        out[f] = [spectrum[g].mean() for g in groups]
    top = float(np.percentile(out, 97)) or 1.0
    out = np.clip(out / top, 0, 1) ** 0.65
    for f in range(1, count):  # up at once, down gently
        out[f] = np.maximum(out[f], out[f - 1] * 0.72)
    return out


def wave_picture(levels: np.ndarray, style: str, color: str, size: tuple[int, int]) -> tuple[np.ndarray, np.ndarray]:
    """One frame of the wave -> (colour already multiplied by its solidity, solidity)."""
    w, h = size
    s = 2
    img = Image.new("L", (w * s, h * s), 0)
    d = ImageDraw.Draw(img)
    order = np.concatenate([levels[::-2], levels[::2]]) if len(levels) % 2 == 0 else levels  # loudest in the middle
    n = len(order)
    mid = h * s / 2
    step = w * s / n
    if style == "line":
        xs = np.linspace(0, w * s, n * 6)
        shape = np.interp(xs, (np.arange(n) + 0.5) * step, order)
        for layer, (gain, shade) in enumerate(((1.0, 255), (0.65, 150), (0.4, 90))):
            ys = mid - shape * gain * (h * s * 0.46) * np.sin(xs / (w * s) * math.pi * (11 + 4 * layer) + levels.sum() * 0.4)
            d.line(list(zip(xs.tolist(), ys.tolist())), fill=shade, width=max(2, 6 - 2 * layer), joint="curve")
    else:
        for i, v in enumerate(order):
            cx = (i + 0.5) * step
            half = max(step * 0.18, v * h * s * 0.48)
            r = step * 0.3
            if style == "dots":
                k = max(1, int(half / (step * 0.7)) )
                for j in range(k):
                    for sign in (-1, 1):
                        cy = mid + sign * j * step * 0.7
                        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=max(110, 255 - j * 38))
            else:
                d.rounded_rectangle((cx - r, mid - half, cx + r, mid + half), radius=r, fill=255)
    cv2 = ls._cv()
    a = cv2.convertScaleAbs(cv2.resize(np.asarray(img), (w, h), interpolation=cv2.INTER_AREA), alpha=0.95)
    r, g, b = ImageColor.getrgb(color)[:3]
    rgb = cv2.merge([cv2.convertScaleAbs(a, alpha=v / 255.0) for v in (r, g, b)])
    return rgb, a


# ------------------------------------------------------------------ word-by-word subtitles
def subtitle_metrics(extras: dict, layout: dict, size: tuple[int, int]) -> dict:
    subs = extras["subs"]
    short = layout["format"] == "short"
    height = size[1]
    font = height * (0.048 if short else 0.095) * max(0.6, min(1.8, float(subs.get("size", 1))))
    margin = int(subs.get("margin") or height * (0.12 if short else 0.055))  # "margin": moved clear of the face
    chars = 17 if short else 24
    area = subs.get("area")  # (left, right) in pixels: the free side of the picture, beside the presenter
    if area:
        chars = max(12, min(chars, int((area[1] - area[0]) / (font * 0.56))))
    return {"font": int(font), "margin": margin, "words": 3 if short else 5, "chars": chars, "area": area,
            "position": subs.get("position", "bottom")}


def wave_place(extras: dict, layout: dict, size: tuple[int, int]) -> tuple[int, int, int, int]:
    """(x, y, width, height): just above the subtitles."""
    m = subtitle_metrics(extras, layout, size)
    short = layout["format"] == "short"
    w = int(size[0] * (0.62 if short else 0.36)) // 2 * 2
    h = int(size[1] * (0.05 if short else 0.085)) // 2 * 2
    below = m["margin"] + (int(m["font"] * 1.45) if extras["subs"]["on"] and m["position"] == "bottom" else 0)
    x = (size[0] - w) // 2
    if m["area"]:
        w = min(w, int(m["area"][1] - m["area"][0])) // 2 * 2
        x = int((m["area"][0] + m["area"][1] - w) / 2)
    return x, size[1] - below - h - int(size[1] * 0.012), w, h


def _ass_color(value: str) -> str:
    try:
        r, g, b = ImageColor.getrgb(value)[:3]
    except ValueError:
        r, g, b = 255, 255, 255
    return f"&H{b:02X}{g:02X}{r:02X}&"


def _ass_time(t: float) -> str:
    cs = max(0, int(round(t * 100)))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def chunks(words: list[dict], limit: int, chars: int = 40) -> list[list[dict]]:
    """Words shown together: a few at a time, ending at punctuation or a pause."""
    out, cur = [], []
    for w in words:
        long = sum(len(c["word"]) + 1 for c in cur) + len(w["word"]) > chars
        if cur and (len(cur) >= limit or long or w["start"] - cur[-1]["end"] > 0.7):
            out.append(cur)
            cur = []
        cur.append(w)
        if re.search(r"[.!?…,;:۔؟]$", w["word"]) and len(cur) >= 2:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def subtitles(words: list[dict], start: float, end: float, extras: dict, layout: dict, size: tuple[int, int]) -> str:
    """An .ass file for one scene: one line per spoken word, the spoken word coloured."""
    subs = extras["subs"]
    m = subtitle_metrics(extras, layout, size)
    family = subs.get("font") if subs.get("font") in FONTS else "Poppins"
    base, hot = _ass_color(subs.get("color", "#ffffff")), _ass_color(subs.get("highlight", "#f6c445"))
    align = {"bottom": 2, "middle": 5, "top": 8}.get(m["position"], 2)
    style = subs.get("style", "pop")
    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {size[0]}", f"PlayResY: {size[1]}", "WrapStyle: 0",
        "ScaledBorderAndShadow: yes", "", "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, "
        "StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: W,{family},{m['font']},{base[:-1]},{base[:-1]},&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,"
        f"{max(2, m['font'] // 13)},{max(1, m['font'] // 30)},{align},{int(m['area'][0]) if m['area'] else size[0] // 16},"
        f"{int(size[0] - m['area'][1]) if m['area'] else size[0] // 16},{m['margin']},1",
        "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    clean = lambda t: t.replace("\\", "/").replace("{", "(").replace("}", ")")  # noqa: E731
    groups = chunks(words, m["words"], m["chars"])
    for g, group in enumerate(groups):
        until = groups[g + 1][0]["start"] if g + 1 < len(groups) else end
        until = min(until, group[-1]["end"] + 0.9, end)
        for i, w in enumerate(group):
            begin = max(start, w["start"]) if i or g else max(start, min(w["start"], start + 0.15))
            stop = group[i + 1]["start"] if i + 1 < len(group) else until
            if stop - begin < 0.02:
                continue
            parts = []
            for j, other in enumerate(group):
                text = clean(other["word"])
                if j == i:
                    if style == "box":
                        parts.append(f"{{\\bord{max(6, m['font'] // 5)}\\3c{hot}\\shad0}}{text}{{\\r}}")
                    elif style == "pop":
                        parts.append(f"{{\\c{hot}\\fscx124\\fscy124\\t(0,140,\\fscx108\\fscy108)}}{text}{{\\r}}")
                    else:
                        parts.append(f"{{\\c{hot}}}{text}{{\\r}}")
                elif j > i and style == "pop":
                    parts.append(f"{{\\alpha&HFF&}}{text}{{\\r}}")  # not spoken yet: keeps its place, unseen
                else:
                    parts.append(text)
            lines.append(f"Dialogue: 0,{_ass_time(begin - start)},{_ass_time(stop - start)},W,,0,0,0,,{' '.join(parts)}")
    return "\n".join(lines) + "\n"


# ------------------------------------------------------------------ one scene, and the whole video
def settings_for(job: dict, scene: dict) -> tuple[dict, dict]:
    """(layout, extras) of one scene: the whole video's, with this scene's own changes on top."""
    layout = dict(job["layout"])
    if scene.get("effect"):
        layout["effect"] = scene["effect"]
    own = scene.get("extras") or {}
    extras = {name: {**value, **(own.get(name) or {})} for name, value in job["extras"].items()}
    return layout, extras


def render_scene(folder: Path, job: dict, scenes: list[dict], index: int, out: Path, preview: bool, levels: np.ndarray | None,
                 sounds: list, progress=None, stop=None, cast: "Cast | None" = None) -> None:
    scene = scenes[index]
    layout, extras = settings_for(job, scene)
    size = (SMALL if preview else SIZES)[layout["format"]]
    cast = cast or Cast(folder, job)
    extras = clear_of_face(cast, scene, extras, layout, size)
    first = round(scene["start"] * FPS)
    count = max(1, round(scene["end"] * FPS) - first)
    work = out.parent / f"{out.stem}.work"
    shutil.rmtree(work, ignore_errors=True)
    (work / "fonts").mkdir(parents=True)
    filters = []
    if extras["subs"]["on"]:
        for name in FONTS.values():
            shutil.copy(FONT_DIR / name, work / "fonts" / name)
        (work / "subs.ass").write_text(subtitles(job["words"][scene["first"]:scene["last"]], scene["start"], scene["end"],
                                                 extras, layout, size), encoding="utf-8-sig")
        filters = ["-vf", "ass=subs.ass:fontsdir=fonts"]
    back = background(folder, scenes, index, size, count, layout, preview, sounds)
    person = presenter_frames(cast, scene, layout, size, first, count)
    wave = extras["wave"]
    place = wave_place(extras, layout, size)
    target = out.with_name(out.stem + ".part.mp4")
    enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{size[0]}x{size[1]}",
                            "-r", str(FPS), "-i", "-", *filters, "-c:v", "libx264", "-preset", "veryfast", "-crf",
                            "24" if preview else "19", "-pix_fmt", "yuv420p", "-an", str(target.resolve())],
                           stdin=subprocess.PIPE, cwd=str(work), **_quiet())
    try:
        people = person[2] if person else None
        for n, picture in enumerate(back):
            if stop is not None and n % 10 == 0 and stop():
                raise Stop()
            frame = np.array(picture)
            if people is not None:
                rgb, a, pad = next(people)
                paste(frame, rgb, a, person[0] - pad, person[1] - pad)
            if wave["on"] and levels is not None:
                rgb, a = wave_picture(levels[min(len(levels) - 1, first + n)], wave["style"], wave["color"], place[2:])
                paste(frame, rgb, a, place[0], place[1])
            enc.stdin.write(frame.tobytes())
            if progress and n % 12 == 0:
                progress(n / count)
        close_pipe(enc)
    finally:
        if enc.poll() is None:
            enc.kill()
            enc.wait()
        if people is not None:
            people.close()
        if hasattr(back, "close"):
            back.close()
    target.replace(out)
    shutil.rmtree(work, ignore_errors=True)


def scene_key(folder: Path, job: dict, scenes: list[dict], index: int) -> str:
    scene = scenes[index]
    media = [[f, (folder / "media" / f).stat().st_size] for f in scene["bg"].get("files") or [] if (folder / "media" / f).exists()]
    person = []
    if scene.get("presenter") and (folder / "cutout.png").exists():
        person = [ls.VERSION, hashlib.sha1((folder / "cutout.png").read_bytes()).hexdigest(), job.get("motion")]
    return hashlib.sha1(json.dumps([scene, media, person, job["layout"], job["extras"], job.get("voice_version"),
                                    job["words"][scene["first"]:scene["last"]]], sort_keys=True, default=str).encode()).hexdigest()[:16]


def problems(folder: Path, job: dict) -> list[str]:
    """Everything that stops the final render, in plain words."""
    scenes = job.get("storyboard") or []
    if not scenes:
        return ["Make the storyboard first (step 6)."]
    out = []
    for i, s in enumerate(scenes):
        why = background_problem(folder, s)
        if why:
            out.append(f"Scene {i + 1} {why}.")
    shown = any(s.get("presenter") and (s.get("position") or job["layout"]["position"]) != "hidden" for s in scenes)
    if shown and not (folder / "face.npy").exists():
        out.append("Choose a presenter photo (step 4), or switch the presenter off in every scene.")
    return out


def preview(folder: Path, job: dict, index: int, progress=None, stop=None) -> str:
    """A small quick video of one scene with its sound -> the file name."""
    scenes = job["storyboard"]
    scene = scenes[index]
    small = folder / "preview"
    small.mkdir(exist_ok=True)
    for old in small.glob(f"scene-{index:02d}-*.mp4"):
        old.unlink(missing_ok=True)
    silent = small / f"silent-{index:02d}.mp4"
    out = small / f"scene-{index:02d}-{scene_key(folder, job, scenes, index)}.mp4"
    levels = voice_levels(folder / "voice.mp3") if settings_for(job, scene)[1]["wave"]["on"] else None
    render_scene(folder, job, scenes, index, silent, True, levels, [], progress, stop)
    ffmpeg(["-i", str(silent), "-ss", f"{scene['start']:.3f}", "-t", f"{scene['end'] - scene['start']:.3f}", "-i",
            str(folder / "voice.mp3"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", str(out)])
    silent.unlink(missing_ok=True)
    return out.name


def whole_key(folder: Path, job: dict) -> str:
    scenes = job["storyboard"]
    return hashlib.sha1("".join(scene_key(folder, job, scenes, i) for i in range(len(scenes))).encode()).hexdigest()[:16]


def preview_whole(folder: Path, job: dict, progress=None, stop=None) -> str:
    """A small quick video of everything -> its file name (in preview/). Scenes that did not change are reused."""
    progress = progress or (lambda f, t: None)
    scenes = job["storyboard"]
    small = folder / "preview"
    parts = small / "all"
    parts.mkdir(parents=True, exist_ok=True)
    progress(0.0, "Listening to the voice for the wave…")
    levels = voice_levels(folder / "voice.mp3") if any(settings_for(job, s)[1]["wave"]["on"] for s in scenes) else None
    cast, files = Cast(folder, job), []
    total = scenes[-1]["end"]
    for i, scene in enumerate(scenes):
        if stop is not None and stop():
            raise Stop()
        out = parts / f"scene-{i:03d}-{scene_key(folder, job, scenes, i)}.mp4"
        report = lambda f, i=i, s=scene: progress(0.95 * (s["start"] + f * (s["end"] - s["start"])) / total,  # noqa: E731
                                                   f"Preview: scene {i + 1} of {len(scenes)}…")
        report(0)
        if not out.exists():
            for old in parts.glob(f"scene-{i:03d}-*"):
                if old.is_file():
                    old.unlink(missing_ok=True)
            render_scene(folder, job, scenes, i, out, True, levels, [], report, stop, cast)
        files.append(out)
    (parts / "list.txt").write_text("".join(f"file '{f.name}'\n" for f in files), encoding="utf-8")
    progress(0.97, "Joining the preview…")
    for old in small.glob("whole-*.mp4"):
        old.unlink(missing_ok=True)
    out = small / f"whole-{whole_key(folder, job)}.mp4"
    ffmpeg(["-f", "concat", "-safe", "0", "-i", "list.txt", "-i", str((folder / "voice.mp3").resolve()), "-map", "0:v", "-map",
            "1:a", "-c:v", "copy", "-c:a", "aac", "-movflags", "+faststart", str(out.resolve())], cwd=parts)
    return out.name


def render(folder: Path, job: dict, progress=None, stop=None) -> Path:
    """The finished video: final.mp4. Scenes that did not change are not drawn again."""
    progress = progress or (lambda f, t: None)
    wrong = problems(folder, job)
    if wrong:
        raise RuntimeError(" ".join(wrong[:4]))
    scenes = job["storyboard"]
    parts = folder / "scenes"
    parts.mkdir(exist_ok=True)
    progress(0.0, "Listening to the voice for the wave…")
    levels = voice_levels(folder / "voice.mp3") if any(settings_for(job, s)[1]["wave"]["on"] for s in scenes) else None
    files, sounds, cast = [], [], Cast(folder, job)
    total = scenes[-1]["end"]
    for i, scene in enumerate(scenes):
        if stop is not None and stop():
            raise Stop()
        out = parts / f"scene-{i:02d}-{scene_key(folder, job, scenes, i)}.mp4"
        report = lambda f, i=i, s=scene: progress(0.9 * (s["start"] + f * (s["end"] - s["start"])) / total,  # noqa: E731
                                                   f"Drawing scene {i + 1} of {len(scenes)}…")
        report(0)
        noted = out.with_suffix(".sounds.json")
        if out.exists() and noted.exists():
            sounds.extend(json.loads(noted.read_text(encoding="utf-8")))
        else:
            for old in parts.glob(f"scene-{i:02d}-*"):
                if old.is_file():
                    old.unlink(missing_ok=True)
            mine: list = []
            render_scene(folder, job, scenes, i, out, False, levels, mine, report, stop, cast)
            noted.write_text(json.dumps(mine), encoding="utf-8")
            sounds.extend(mine)
        files.append(out)
    progress(0.92, "Adding the sound…")
    audio = parts / "audio.mp3"
    shutil.copy(folder / "voice.mp3", audio)
    audio.with_name("audio.nosfx.mp3").unlink(missing_ok=True)
    if sounds:
        import tools_visual as tv
        tv.mix_into_voice(audio, sounds, total, seed=1)
    (parts / "list.txt").write_text("".join(f"file '{f.name}'\n" for f in files), encoding="utf-8")
    progress(0.96, "Joining the scenes…")
    final = folder / "final.mp4"
    ffmpeg(["-f", "concat", "-safe", "0", "-i", "list.txt", "-i", audio.name, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "final.part.mp4"], cwd=parts)
    (parts / "final.part.mp4").replace(final)
    return final
