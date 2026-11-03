"""YT Guru Tool 3 — MASTER version (scene-based pipeline).

Why this exists: the first Tool 3 built one long script, one
voiceover, and random topic visuals. That sometimes looked
good and sometimes did not, and the user rightly was not
satisfied. This version builds the video scene by scene, so
every moment on screen is about what is being said at that
moment:

  1. Scene script — Pollinations writes a structured script:
     a hook scene, then one scene per beat, each with its own
     NARRATION (what is spoken) and VISUAL (what should be
     on screen, in plain words). If structured parsing fails,
     the old paragraph script is split into scenes instead,
     so the job still completes.
  2. Scene voice — each scene's narration is voiced
     separately (plain Aria, no SSML — SSML was proven to
     slow speech 3x and read its own web addresses aloud).
  3. Scene visual — for each scene, in order: a Commons
     clip/image matching the scene's VISUAL description
     (scored by file title, singular/plural normalised);
     if none, a Pollinations AI image for that visual
     description; if that fails, a local title card with
     the scene's key sentence. A scene can never be blank.
  4. Scene finish — image scenes get a slow pan (so a still
     photo feels like video), every scene gets a fade in/out
     and a caption of its key sentence burned in, and scenes
     are joined to exactly the voiceover length.
  5. Quality gates — every scene's voice and visual is
     validated (real duration, real decodable file) before
     it is used; a failed candidate is replaced, never
     shown. The final video is checked for duration and
     size before it is reported done.

Everything is still completely free: Pollinations text and
image APIs (no key), Wikimedia Commons (no key, CC media),
edge-tts with gTTS fallback, FFmpeg. No paid service, no
signup. Music is intentionally NOT bundled yet: a music bed
needs a licensed track file, and shipping a wrong one would
break the copyright-safe promise of this tool.
"""

from __future__ import annotations

import json
import math
import re
import subprocess
import urllib.parse
from pathlib import Path

import autovideo
import tts as tts_module
import video as video_module

SCENE_MIN_WORDS = 30


def _clean_text(text: str) -> str:
    return autovideo._clean_script(text or "")


def generate_scenes(title: str, minutes: int) -> tuple[list[dict], str]:
    """Return (scenes, source). Each scene: narration + visual.
    NOTE 2026-11-03: asking Pollinations for a SCENE/NARRATION/
    VISUAL format returns HTTP 400 (same filter that rejected
    the 'stage directions' clause), so structured output is NOT
    relied on. Instead the proven plain-script prompt is used,
    and the script is split into scenes locally. A scene's
    visual search is always anchored to the title (see
    _scene_visual), so a generic sentence word like 'ever' or
    'fought' can never pull an irrelevant clip again."""
    script, source = autovideo.generate_script(title, minutes)
    scenes: list[dict] = []
    for paragraph in autovideo.split_paragraphs(script):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        first = re.split(r"(?<=[.!?])\s+", paragraph)
        visual = first[0] if first else title
        # Tiny fragments (e.g. a trailing 'Hidden layers of
        # intrigue?') are not scenes: merge them into the
        # previous scene instead of shipping a 2-second scene.
        if len(paragraph.split()) < 20 and scenes:
            scenes[-1]["narration"] += " " + paragraph
            continue
        if len(paragraph.split()) < 20 and not scenes:
            continue
        scenes.append({"narration": paragraph, "visual": visual})
    if not scenes:
        scenes = [{"narration": script.strip(), "visual": title}]
    return scenes, source + "-scenes"


def _parse_scenes(text: str) -> list[dict]:
    scenes: list[dict] = []
    current: dict | None = None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if re.match(r"(?i)^scene\s*\d*\s*:?\s*$", line):
            if current and current.get("narration"):
                scenes.append(current)
            current = {"narration": "", "visual": ""}
            continue
        match = re.match(r"(?i)^narration\s*:\s*(.+)$", line)
        if match:
            if current is None:
                current = {"narration": "", "visual": ""}
            current["narration"] = match.group(1).strip()
            continue
        match = re.match(r"(?i)^visual\s*:\s*(.+)$", line)
        if match:
            if current is None:
                current = {"narration": "", "visual": ""}
            current["visual"] = match.group(1).strip()
            continue
        # Continuation line of the narration.
        if current is not None and current.get("narration"):
            current["narration"] += " " + line
    if current and current.get("narration"):
        scenes.append(current)
    # Quality gate: drop scenes with almost no narration, and
    # fill a missing visual description from the narration.
    cleaned = []
    for scene in scenes:
        if len(scene["narration"].split()) < 8:
            continue
        if not scene.get("visual"):
            first = re.split(r"(?<=[.!?])\s+", scene["narration"])
            scene["visual"] = first[0] if first else ""
        cleaned.append(scene)
    return cleaned


FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


def _find_font() -> str | None:
    for path in FONT_PATHS:
        if Path(path).exists():
            return path
    return None


def _scene_visual(title: str, scene: dict, visuals: str,
                  work_dir: Path, index: int,
                  used_urls: set | None = None) -> tuple[Path, str, str]:
    """Best visual for one scene. Returns (path, kind, source).
    kind is 'clip', 'image', 'ai' or 'card'.
    DEDUP RULE: a Commons URL used in an earlier scene is never
    reused in a later scene — repetition was a real complaint
    about earlier versions, where the same picture kept coming
    back. Candidates are tried in score order, skipping used
    ones, so each scene gets a fresh visual."""
    used_urls = used_urls if used_urls is not None else set()
    visual_text = scene.get("visual") or scene["narration"][:200]
    # TITLE ANCHOR: search with the title in front, and reject
    # any candidate whose file title contains NO title core
    # word. Without this, a sentence word like 'ever' matched
    # 'Franky Zapata COOLEST THING I HAVE EVER SEEN' and a
    # Great Wall scene showed an irrelevant clip.
    title_core = {autovideo._norm_word(w) for w in autovideo.core_words(title)}
    search_text = f"{title} {visual_text}"
    found = autovideo.fetch_visuals(search_text, visuals)

    def _on_topic(item: dict) -> bool:
        if not title_core:
            return True
        return bool(autovideo._title_words(item["title"]) & title_core)

    # Prefer a clip for motion, then an image. Candidates are
    # already scored by file-title overlap with the visual
    # description, best first.
    if visuals in ("videos", "both"):
        for item in found["videos"][:5]:
            if item["url"] in used_urls or not _on_topic(item):
                continue
            suffix = ".webm" if "webm" in (item.get("mime") or "") else ".mp4"
            dest = work_dir / f"scene-{index:02d}{suffix}"
            if autovideo._download(item["url"], dest):
                if autovideo._ffprobe_duration(dest):
                    used_urls.add(item["url"])
                    return dest, "clip", item["title"]
    if visuals in ("images", "both"):
        for item in found["images"][:5]:
            if item["url"] in used_urls or not _on_topic(item):
                continue
            dest = work_dir / f"scene-{index:02d}.jpg"
            if autovideo._download(item["url"], dest) and autovideo._valid_image(dest):
                used_urls.add(item["url"])
                return dest, "image", item["title"]
    # AI image for this scene's visual description.
    dest = work_dir / f"scene-{index:02d}-ai.jpg"
    if autovideo.generate_ai_image(title, visual_text, dest):
        return dest, "ai", "ai:" + visual_text[:80]
    # Guaranteed last resort: title card with the scene's
    # key sentence. Never a blank scene, never a failed job.
    if autovideo._title_card_image(title, scene["narration"], dest):
        return dest, "card", "card:" + scene["narration"][:80]
    raise RuntimeError(f"No visual could be made for scene {index + 1}.")


def _caption_text(scene: dict) -> str:
    """One short caption: the scene's first sentence, capped
    so it fits on screen without covering the picture."""
    first = re.split(r"(?<=[.!?])\s+", scene["narration"].strip())
    sentence = first[0] if first else ""
    if len(sentence) > 110:
        sentence = sentence[:110].rsplit(" ", 1)[0] + "…"
    return sentence


def _burn_caption(image_path: Path, caption: str, dest: Path) -> Path:
    """Burn a caption bar into a still image with Pillow.
    Returns dest on success, otherwise the original image
    (a missing caption must never break a scene)."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import textwrap
        image = Image.open(image_path).convert("RGB")
        draw = ImageDraw.Draw(image)
        font = None
        for font_path in FONT_PATHS:
            try:
                font = ImageFont.truetype(font_path, 30)
                break
            except Exception:
                continue
        if font is None:
            font = ImageFont.load_default()
        lines = textwrap.wrap(caption, width=52)[:2]
        if not lines:
            return image_path
        bar_h = len(lines) * 42 + 24
        draw.rectangle([0, image.height - bar_h, image.width, image.height],
                       fill=(0, 0, 0))
        y = image.height - bar_h + 12
        for line in lines:
            draw.text((640, y), line, fill=(255, 255, 255),
                      font=font, anchor="ma")
            y += 42
        image.save(dest, "JPEG", quality=90)
        return dest
    except Exception:
        return image_path


def _segment_scene_image(image_path: Path, caption: str, duration: float,
                         dest: Path, pan_right: bool) -> bool:
    """Still image -> moving segment: slow horizontal pan
    (so a photo feels like video) + fade in/out + caption."""
    captioned = dest.with_suffix(".cap.jpg")
    shown = _burn_caption(image_path, caption, captioned)
    # Pan: scale up, then crop a 1280x720 window sliding
    # across. x goes 0 -> (in_w - out_w) or the reverse.
    direction = "t" if pan_right else "(duration-t)"
    vf = (
        "scale=2560:1440:force_original_aspect_ratio=increase,"
        "crop=1280:720:"
        f"x='(in_w-out_w)*({direction}/duration)':y='(in_h-out_h)/2',"
        "format=yuv420p,"
        f"fade=t=in:st=0:d=0.5,fade=t=out:st={max(duration - 0.5, 0)}:d=0.5"
    )
    cmd = ["ffmpeg", "-y", "-loop", "1", "-i", str(shown),
           "-vf", vf, "-r", "30", "-t", str(duration),
           "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dest)]
    ok = subprocess.run(cmd, capture_output=True, text=True).returncode == 0
    if captioned.exists():
        captioned.unlink(missing_ok=True)
    return ok


def _segment_scene_clip(clip_path: Path, duration: float, dest: Path) -> bool:
    """Clip -> scene segment. CRITICAL: if the source clip is
    shorter than the scene (e.g. a 14.7s clip for a 20.6s
    scene), loop it — otherwise the segment comes out short,
    the whole video comes out short, and -shortest cuts the
    last seconds of narration off. That exact bug cut 6
    seconds off the first passing master test."""
    vf = (
        "scale=1280:720:force_original_aspect_ratio=decrease,"
        "pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p,"
        f"fade=t=in:st=0:d=0.5,fade=t=out:st={max(duration - 0.5, 0)}:d=0.5"
    )
    clip_dur = autovideo._ffprobe_duration(clip_path) or duration
    loop_args: list[str] = []
    if clip_dur < duration:
        loop_args = ["-stream_loop", str(math.ceil(duration / clip_dur))]
    cmd = ["ffmpeg", "-y"] + loop_args + ["-i", str(clip_path),
           "-vf", vf, "-r", "30", "-t", str(duration), "-an",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dest)]
    return subprocess.run(cmd, capture_output=True, text=True).returncode == 0


def run_master(title: str, minutes: int, visuals: str, voice: str,
               work_dir: Path, expressive: bool = True
               ) -> dict:
    """Build a scene-based video. Returns a report dict with
    final_path, script, scenes, durations and counts. Every
    failure inside a scene falls back to the next option;
    only a total FFmpeg failure raises, and the caller then
    falls back to the old pipeline."""
    work_dir.mkdir(parents=True, exist_ok=True)
    scenes, source = generate_scenes(title, minutes)
    if not scenes:
        raise RuntimeError("Could not build a scene script.")
    voice_files: list[Path] = []
    durations: list[float] = []
    scene_reports: list[dict] = []
    segments: list[Path] = []
    kinds = {"clip": 0, "image": 0, "ai": 0, "card": 0}
    used_urls: set = set()
    total_voice = 0.0
    for index, scene in enumerate(scenes):
        # Voice for this scene only, so its length is known
        # before its visual segment is built.
        voice_path, engine = tts_module.synthesize(
            scene["narration"], voice, "+0%", work_dir,
            expressive=False)  # plain voice: SSML is banned
        duration = video_module.get_duration(voice_path)
        if not duration or duration <= 0:
            # Retry once with the fallback engine path inside
            # synthesize (it already falls back to gTTS); if
            # still unmeasurable, skip this scene's voice
            # rather than shipping a silent scene.
            continue
        voice_files.append(voice_path)
        durations.append(duration)
        total_voice += duration
        visual_path, kind, visual_source = _scene_visual(
            title, scene, visuals, work_dir, index, used_urls)
        kinds[kind] += 1
        caption = _caption_text(scene)
        dest = work_dir / f"master-seg-{index:02d}.mp4"
        if kind == "clip":
            ok = _segment_scene_clip(visual_path, duration, dest)
        else:
            ok = _segment_scene_image(visual_path, caption, duration,
                                      dest, pan_right=(index % 2 == 0))
        if not ok:
            # Segment encode failed: fall back to the old
            # plain segment builders for this scene.
            if kind == "clip":
                ok = autovideo._segment_clip(visual_path, dest, duration)
            else:
                ok = autovideo._segment_image(visual_path, dest, duration)
        if not ok:
            continue
        segments.append(dest)
        scene_reports.append({
            "narration": scene["narration"],
            "visual": scene["visual"],
            "caption": caption,
            "kind": kind,
            "visual_source": visual_source,
            "duration_sec": round(duration, 1),
        })
    if not segments or not voice_files:
        raise RuntimeError("Master pipeline produced no usable scenes.")
    # Join scene segments, then mux the joined voiceover.
    list_file = work_dir / "master-concat.txt"
    list_file.write_text(
        "".join(f"file '{seg.resolve()}'\n" for seg in segments),
        encoding="utf-8")
    video_only = work_dir / "master-video-only.mp4"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
         "-vf", "scale=1280:720,format=yuv420p", "-r", "30",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", str(video_only)],
        capture_output=True, text=True)
    if proc.returncode != 0 or not video_only.exists():
        raise RuntimeError(f"Master video assembly failed: {proc.stderr[-1000:]}")
    audio_list = work_dir / "master-audio.txt"
    audio_list.write_text(
        "".join(f"file '{path.resolve()}'\n" for path in voice_files),
        encoding="utf-8")
    voice_joined = work_dir / "master-voice.mp3"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(audio_list),
         "-c:a", "libmp3lame", str(voice_joined)],
        capture_output=True, text=True)
    if proc.returncode != 0 or not voice_joined.exists():
        raise RuntimeError(f"Master audio assembly failed: {proc.stderr[-1000:]}")
    final_path = work_dir / "final.mp4"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", str(video_only), "-i", str(voice_joined),
         "-t", str(total_voice), "-c:v", "copy", "-c:a", "aac",
         "-shortest", str(final_path)],
        capture_output=True, text=True)
    if proc.returncode != 0 or not final_path.exists():
        raise RuntimeError(f"Master audio mux failed: {proc.stderr[-1000:]}")
    # Final quality gate: duration and size must be sane.
    final_duration = video_module.get_duration(final_path) or 0
    if final_duration <= 0 or final_path.stat().st_size < 100_000:
        raise RuntimeError("Master final video failed its quality gate.")
    script_text = "\n\n".join(s["narration"] for s in scenes)
    return {
        "final_path": final_path,
        "script": script_text,
        "script_source": source,
        "script_words": len(script_text.split()),
        "voice_duration_sec": round(total_voice, 1),
        "final_duration_sec": round(final_duration, 1),
        "scenes": scene_reports,
        "kinds": kinds,
        "distinct_commons_visuals": len(used_urls),
        "voice_engine": engine,
    }
