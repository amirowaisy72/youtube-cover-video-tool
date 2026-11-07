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
import threading
import urllib.parse
import urllib.request
from pathlib import Path

import autovideo
import tts as tts_module
import video as video_module

SCENE_MIN_WORDS = 30


def _reserve_url(used_urls: set, lock, url: str) -> bool:
    """Atomically claim a Commons URL for one scene; False if
    another (parallel) scene already claimed it. The dedup rule
    (a URL is never reused across scenes) must still hold when
    scenes are built in parallel."""
    if lock is not None:
        with lock:
            if url in used_urls:
                return False
            used_urls.add(url)
            return True
    if url in used_urls:
        return False
    used_urls.add(url)
    return True


def _release_url(used_urls: set, lock, url: str) -> None:
    """Give a reservation back when its download/validation
    failed, so another scene may still try that URL."""
    if lock is not None:
        with lock:
            used_urls.discard(url)
    else:
        used_urls.discard(url)


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
                  used_urls: set | None = None,
                  lock=None,
                  pexels_key: str | None = None,
                  pixabay_key: str | None = None) -> tuple[Path, str, str]:
    """Best visual for one scene. Returns (path, kind, source).
    kind is 'clip', 'image', 'ai' or 'card'.
    DEDUP RULE: a Commons URL used in an earlier scene is never
    reused in a later scene — repetition was a real complaint
    about earlier versions, where the same picture kept coming
    back. Candidates are tried in score order, skipping used
    ones, so each scene gets a fresh visual. When scenes are
    built in parallel, `lock` makes the claim atomic: a URL is
    reserved before its download starts and released if the
    download fails, so two scenes can never end up with the
    same visual."""
    used_urls = used_urls if used_urls is not None else set()
    visual_text = scene.get("visual") or scene["narration"][:200]
    # TITLE ANCHOR: search with the title in front, and reject
    # any candidate whose file title contains NO title core
    # word. Without this, a sentence word like 'ever' matched
    # 'Franky Zapata COOLEST THING I HAVE EVER SEEN' and a
    # Great Wall scene showed an irrelevant clip.
    title_core = {autovideo._norm_word(w) for w in autovideo.core_words(title)}
    search_text = f"{title} {visual_text}"
    found = autovideo.fetch_visuals(search_text, visuals,
                                    pexels_key=pexels_key,
                                    pixabay_key=pixabay_key)

    def _on_topic(item: dict) -> bool:
        if not title_core:
            return True
        return bool(autovideo._title_words(item["title"]) & title_core)

    # Prefer a clip for motion, then an image. Candidates are
    # already scored by file-title overlap with the visual
    # description, best first.
    if visuals in ("videos", "both"):
        for item in found["videos"][:5]:
            if not _on_topic(item):
                continue
            if not _reserve_url(used_urls, lock, item["url"]):
                continue
            suffix = ".webm" if "webm" in (item.get("mime") or "") else ".mp4"
            dest = work_dir / f"scene-{index:02d}{suffix}"
            if autovideo._download(item["url"], dest):
                if autovideo._ffprobe_duration(dest):
                    return dest, "clip", item["title"]
            _release_url(used_urls, lock, item["url"])
    if visuals in ("images", "both"):
        for item in found["images"][:5]:
            if not _on_topic(item):
                continue
            if not _reserve_url(used_urls, lock, item["url"]):
                continue
            dest = work_dir / f"scene-{index:02d}.jpg"
            if autovideo._download(item["url"], dest) and autovideo._valid_image(dest):
                return dest, "image", item["title"]
            _release_url(used_urls, lock, item["url"])
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


def _srt_time(seconds: float) -> str:
    """Seconds -> SRT timestamp 'HH:MM:SS,mmm'."""
    total_ms = max(0, int(round(seconds * 1000)))
    h, rem = divmod(total_ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ---------------------------------------------------------------------------
# Mood music + transition SFX (2026-11-08, user request)
# ---------------------------------------------------------------------------
# Background music matched to the script's mood (suspense -> a tense
# track, happy -> an upbeat one...), mixed low (10-15%) under the
# voiceover, and DIFFERENT transition sounds per scene change so the
# audience never hears the same whoosh twice. Both come from Pixabay
# (Music + Sound Effects APIs, free, same key the Stock/Music tools
# already use). No key -> music/SFX are skipped, the video still
# builds. Music/SFX fetch NEVER breaks a build (all failures -> None).
_MOOD_KEYWORDS = {
    "suspense": ["suspense", "mystery", "murder", "crime", "dark", "horror",
                 "scary", "thriller", "secret", "hidden", "ghost", "haunted",
                 "fear", "danger", "killer", "detective", "unknown",
                 "paranormal", "curse", "nightmare"],
    "happy": ["happy", "joy", "fun", "celebration", "party", "laugh",
              "comedy", "funny", "cheerful", "bright", "summer", "dance",
              "birthday", "wedding", "festival"],
    "motivational": ["motivation", "success", "inspire", "dream", "goal",
                     "achieve", "win", "champion", "hustle", "grind",
                     "focus", "discipline", "mindset", "growth", "believe"],
    "sad": ["sad", "loss", "grief", "heartbreak", "lonely", "goodbye",
            "tears", "pain", "sorrow", "broken", "death", "farewell",
            "alone", "miss"],
    "epic": ["epic", "war", "battle", "hero", "legend", "warrior",
             "empire", "kingdom", "glory", "victory", "adventure",
             "quest", "myth", "dragon"],
    "calm": ["calm", "peace", "nature", "ocean", "relax", "meditation",
             "sleep", "gentle", "soft", "morning", "rain", "forest",
             "zen", "breeze"],
}
# Pixabay Music search query per mood (a mood word alone is too
# narrow; these return tracks that actually fit the mood).
_MOOD_MUSIC_QUERY = {
    "suspense": "suspenseful dark tense",
    "happy": "happy upbeat cheerful",
    "motivational": "motivational inspiring uplifting",
    "sad": "sad emotional piano",
    "epic": "epic cinematic orchestral",
    "calm": "calm relaxing ambient",
}
_MUSIC_VOLUME = 0.12  # 12% — low enough that the voice stays clear.
_SFX_VOLUME = 0.5
# Distinct Pixabay Sound Effects queries — one track per query, so
# the SFX library is genuinely different sounds, not six whooshes.
_SFX_QUERIES = ["whoosh", "swoosh", "transition", "swipe", "impact",
                "riser"]


def _detect_mood(title: str, script_text: str) -> str:
    """Keyword mood of the title+script. Falls back to 'calm'
    (a neutral ambient bed) when nothing matches."""
    text = f"{title} {script_text}".lower()
    best, best_count = "calm", 0
    for mood, keywords in _MOOD_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in text)
        if count > best_count:
            best, best_count = mood, count
    return best


def _pixabay_search(kind: str, query: str, key: str,
                    per_page: int = 10) -> list[dict]:
    """One Pixabay AUDIO search. Returns the hits list, or [] on
    any failure. Key is sent per-request and never stored.
    BUG FIX 2026-11-08 (user correction — his key IS valid): the
    old code called /api/music/ and /api/sound-effects/, which DO
    NOT exist (both return HTTP 404 — verified live). Pixabay's
    public API has ONE audio endpoint, /api/audio/, which serves
    both music and sound effects; `kind` ("music" or "sfx") only
    filters the results by duration/type, it is NOT part of the
    URL. That is why music and SFX were silently missing even
    with a valid key — every fetch 404'd and returned []."""
    try:
        params = {"key": key.strip(), "q": query.strip(),
                  "page": "1", "per_page": str(per_page)}
        url = ("https://pixabay.com/api/audio/?"
               f"{urllib.parse.urlencode(params)}")
        req = urllib.request.Request(
            url, headers={"User-Agent": "YT-Guru/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        hits = data.get("hits", [])
        return hits if isinstance(hits, list) else []
    except Exception:
        return []


def _is_music_hit(hit: dict) -> bool:
    """True if an audio hit is a music track (not a sound
    effect). The audio endpoint serves both; music tracks are
    long (tens of seconds to minutes), SFX are a few seconds.
    A `type` field, when present, wins over duration."""
    t = str(hit.get("type") or "").lower()
    if t:
        return "music" in t or "song" in t
    return (hit.get("duration") or 0) >= 20


def _is_sfx_hit(hit: dict) -> bool:
    """True if an audio hit is a sound effect (not a music
    track). Short clips; a `type` field, when present, wins."""
    t = str(hit.get("type") or "").lower()
    if t:
        return "effect" in t or "sfx" in t or "sound" in t
    return 0 < (hit.get("duration") or 0) <= 10


def _fetch_mood_music(mood: str, pixabay_key: str | None,
                      work_dir: Path) -> tuple[Path | None, str]:
    """Download a royalty-free background track matching the mood
    from Pixabay Music. Returns (mp3 path or None, status) where
    status is "ok" | "no_key" | "key_rejected" | "no_results".
    The status is reported in the job result so a missing track
    is never silent (the user asked "how would I know if the key
    is wrong" — the same applies here). Never raises."""
    if not pixabay_key or not pixabay_key.strip():
        return None, "no_key"
    query = _MOOD_MUSIC_QUERY.get(mood, "calm relaxing ambient")
    hits = _pixabay_search("music", query, pixabay_key)
    if not hits:
        # Distinguish a rejected key from "no results": a tiny
        # search with an empty query still returns hits for a
        # valid key, and 400/401/403 for a bad one.
        probe = _pixabay_search("music", "a", pixabay_key, per_page=1)
        return None, "no_results" if probe else "key_rejected"
    for hit in hits:
        if not _is_music_hit(hit):
            continue
        audio_url = hit.get("audio")
        if not audio_url:
            continue
        dest = work_dir / "mood-music.mp3"
        try:
            if autovideo._download(audio_url, dest):
                return dest, "ok"
        except Exception:
            continue
    return None, "no_results"


def _fetch_transition_sfx(pixabay_key: str | None, work_dir: Path,
                          count: int = 6) -> tuple[list[Path], str]:
    """Download DISTINCT royalty-free transition sounds from
    Pixabay Sound Effects — one per query, so the library is
    genuinely different sounds. Returns (mp3 paths, status)
    where status is "ok" | "no_key" | "key_rejected" |
    "no_results" (same visibility rule as the music fetch).
    Never raises."""
    if not pixabay_key or not pixabay_key.strip():
        return [], "no_key"
    sfx: list[Path] = []
    seen_urls: set[str] = set()
    any_hit = False
    for query in _SFX_QUERIES:
        if len(sfx) >= count:
            break
        hits = _pixabay_search("sfx", query, pixabay_key,
                               per_page=5)
        if hits:
            any_hit = True
        # Short sounds first (a transition sound is ~0.5-1s).
        hits.sort(key=lambda h: (h.get("duration") or 99))
        for hit in hits:
            if not _is_sfx_hit(hit):
                continue
            audio_url = hit.get("audio")
            if not audio_url or audio_url in seen_urls:
                continue
            if (hit.get("duration") or 0) > 3:
                continue
            dest = work_dir / f"sfx-{len(sfx)}.mp3"
            try:
                if autovideo._download(audio_url, dest):
                    sfx.append(dest)
                    seen_urls.add(audio_url)
                    break  # one track per query -> distinct sounds
            except Exception:
                continue
    if sfx:
        return sfx, "ok"
    if not any_hit:
        probe = _pixabay_search("sfx", "a", pixabay_key,
                                per_page=1)
        return [], "no_results" if probe else "key_rejected"
    return [], "no_results"


# Visual transitions (xfade, 2026-11-08): a different transition
# style at every scene boundary, rotating so no two consecutive
# boundaries look the same. These are FFmpeg xfade transition
# names. The join re-encodes (stream copy cannot crossfade); if
# the xfade join fails, run_master falls back to the stream-copy
# concat (segments keep their first/last fade, middle boundaries
# become hard cuts — the video still builds).
_TRANSITION_SEC = 0.5
_TRANSITION_TYPES = ["fade", "wipeleft", "wiperight", "slideleft",
                     "slideright", "circleopen", "fadeblack",
                     "fadewhite", "dissolve", "pixelize"]


def _words_to_srt(words: list[dict]) -> str:
    """Word-level timestamps -> SRT cues, YouTube-caption style:
    short phrases (up to 5 words, ~2 seconds each) that change
    as the voice speaks. A single word per cue would flash too
    fast to read; a whole sentence per cue would lag behind the
    voice. Breaks at sentence punctuation when one is near."""
    cues: list[tuple[float, float, str]] = []
    current: list[dict] = []
    for w in words:
        current.append(w)
        text = " ".join(x["word"] for x in current)
        span = w["end"] - current[0]["start"]
        ends_sentence = w["word"].rstrip().endswith((".", "!", "?"))
        if (len(current) >= 5 or span >= 2.0 or ends_sentence) and len(current) >= 2:
            cues.append((current[0]["start"], current[-1]["end"], text))
            current = []
        elif ends_sentence and len(current) == 1:
            cues.append((current[0]["start"], current[-1]["end"], text))
            current = []
    if current:
        cues.append((current[0]["start"], current[-1]["end"],
                      " ".join(x["word"] for x in current)))
    lines: list[str] = []
    for i, (start, end, text) in enumerate(cues, 1):
        lines.append(str(i))
        lines.append(f"{_srt_time(start)} --> {_srt_time(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


_WHISPER_MODEL = None
_WHISPER_LOCK = threading.Lock()


def _get_whisper_model():
    """Lazy-load the tiny speech model once per process (same
    model as the Subtitles tool: ~75 MB, downloaded from
    Hugging Face on first use only, then cached). Thread-safe:
    scenes are built in parallel, so only one worker may load
    it."""
    global _WHISPER_MODEL
    if _WHISPER_MODEL is not None:
        return _WHISPER_MODEL
    with _WHISPER_LOCK:
        if _WHISPER_MODEL is not None:
            return _WHISPER_MODEL
        from faster_whisper import WhisperModel
        _WHISPER_MODEL = WhisperModel("tiny", device="cpu", compute_type="int8")
        return _WHISPER_MODEL


def _transcribe_scene_voice(voice_path: Path, work_dir: Path, index: int) -> Path | None:
    """Transcribe ONE scene's voiceover with word timestamps and
    write a per-scene SRT (times relative to the scene start,
    0.0s — the scene's voice starts at 0.0s inside its segment,
    so the SRT aligns automatically). Returns the SRT path, or
    None on ANY failure: a subtitle failure must never break a
    scene — the segment is then built with its static caption
    instead."""
    try:
        model = _get_whisper_model()
        # Decode with FFmpeg to a numpy array (video.decode_audio_16k)
        # instead of passing the file path: faster-whisper's own
        # av-based decoder is broken with the av version pip
        # installs (av 19 removed the metadata_errors kwarg
        # faster-whisper 1.2.1 passes). A numpy array skips that
        # decoder entirely.
        audio = video_module.decode_audio_16k(voice_path)
        if audio is None:
            return None
        segments_iter, _info = model.transcribe(
            audio, language="en", beam_size=5, word_timestamps=True)
        words: list[dict] = []
        for seg in segments_iter:
            for w in (seg.words or []):
                text = (w.word or "").strip()
                if text:
                    words.append({
                        "start": float(w.start), "end": float(w.end),
                        "word": text})
        if not words:
            return None
        srt_path = work_dir / f"scene-{index:02d}.srt"
        srt_path.write_text(_words_to_srt(words), encoding="utf-8")
        return srt_path
    except Exception:
        return None


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


# Live-caption style for the burned-in word-by-word subtitles
# (YouTube style: white text, black outline, bottom centre).
# The subtitles filter burns the per-scene SRT into the segment
# during its encode — no extra re-encode pass.
_SUBTITLE_STYLE = (
    "FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,"
    "OutlineColour=&H000000,BorderStyle=1,Outline=2,Shadow=0,"
    "Alignment=2,MarginV=25"
)


def _segment_scene_image(image_path: Path, caption: str, duration: float,
                         dest: Path, pan_right: bool,
                         subtitles_srt: Path | None = None,
                         fade_in: bool = True,
                         fade_out: bool = True) -> bool:
    """Still image -> moving segment: slow horizontal pan
    (so a photo feels like video) + fade in/out + caption.
    When subtitles_srt is given, the live word-by-word captions
    replace the static caption (the two bottom texts must never
    overlap): the Pillow caption is skipped and the SRT is burned
    in with the subtitles filter. The SRT filename is passed
    bare and FFmpeg runs with cwd=work_dir, so no path escaping
    is needed (Windows drive letters contain ':' which the
    filter graph would misread)."""
    if subtitles_srt is not None:
        shown = image_path
    else:
        captioned = dest.with_suffix(".cap.jpg")
        shown = _burn_caption(image_path, caption, captioned)
    # Pan: scale up, then crop a 1280x720 window sliding
    # across. x goes 0 -> (in_w - out_w) or the reverse.
    # FFmpeg's crop filter has NO `duration` variable — the scene
    # length must be substituted as a number, or the filter fails
    # ("Undefined constant ... 'duration'") and the scene falls
    # back to a plain still. (That was a real bug: the pan never
    # worked, so image scenes lost their motion + caption.)
    direction = "t" if pan_right else f"({duration}-t)"
    vf = (
        "scale=1920:1080:force_original_aspect_ratio=increase,"
        "crop=1280:720:"
        f"x='(in_w-out_w)*({direction}/{duration})':y='(in_h-out_h)/2',"
        "format=yuv420p,"
    )
    if subtitles_srt is not None:
        vf += (
            f"subtitles='{subtitles_srt.name}':"
            f"force_style='{_SUBTITLE_STYLE}',"
        )
    # Fades: with xfade transitions the join IS the transition,
    # so middle scenes have no fade (first scene fades in, last
    # fades out). When fade_in/out are off, the segment is a hard
    # cut at that end — the xfade still blends it in the join.
    fade_parts = []
    if fade_in:
        fade_parts.append("fade=t=in:st=0:d=0.5")
    if fade_out:
        fade_parts.append(
            f"fade=t=out:st={max(duration - 0.5, 0)}:d=0.5")
    if fade_parts:
        vf += ",".join(fade_parts)
    else:
        vf = vf.rstrip(",")
    cmd = ["ffmpeg", "-y", "-loop", "1", "-i", str(shown),
           "-vf", vf, "-r", "30", "-t", str(duration),
           "-c:v", "libx264", "-preset", "veryfast",
           "-pix_fmt", "yuv420p", str(dest)]
    run_kwargs = dict(video_module.no_window_kwargs())
    if subtitles_srt is not None:
        run_kwargs["cwd"] = str(dest.parent)
    ok = subprocess.run(cmd, capture_output=True, text=True, **run_kwargs).returncode == 0
    if subtitles_srt is None:
        captioned = dest.with_suffix(".cap.jpg")
        if captioned.exists():
            captioned.unlink(missing_ok=True)
    return ok


def _segment_scene_clip(clip_path: Path, caption: str, duration: float,
                        dest: Path, subtitles_srt: Path | None = None,
                        fade_in: bool = True,
                        fade_out: bool = True) -> bool:
    """Clip -> scene segment, with the scene's caption burned
    in as a bottom bar (same first-sentence caption as image
    scenes, via drawtext + a text file so punctuation in the
    sentence cannot break the filter graph).
    When subtitles_srt is given, the live word-by-word captions
    replace the static caption (the two bottom texts must never
    overlap): the drawtext caption is skipped and the SRT is
    burned in with the subtitles filter.
    CRITICAL: if the source clip is shorter than the scene
    (e.g. a 14.7s clip for a 20.6s scene), loop it — otherwise
    the segment comes out short, the whole video comes out
    short, and -shortest cuts the last seconds of narration
    off. That exact bug cut 6 seconds off the first passing
    master test.
    A caption/subtitle failure must never break the scene: if
    the captioned/subtitled encode fails, the plain
    (uncaptioned) segment is built instead."""
    base_vf = (
        "scale=1280:720:force_original_aspect_ratio=decrease,"
        "pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p"
    )
    clip_dur = autovideo._ffprobe_duration(clip_path) or duration
    loop_args: list[str] = []
    if clip_dur < duration:
        loop_args = ["-stream_loop", str(math.ceil(duration / clip_dur))]

    def _encode(vf: str) -> bool:
        cmd = ["ffmpeg", "-y"] + loop_args + ["-i", str(clip_path),
               "-vf", vf, "-r", "30", "-t", str(duration), "-an",
               "-c:v", "libx264", "-preset", "veryfast",
               "-pix_fmt", "yuv420p", str(dest)]
        run_kwargs = dict(video_module.no_window_kwargs())
        if subtitles_srt is not None:
            run_kwargs["cwd"] = str(dest.parent)
        return subprocess.run(cmd, capture_output=True, text=True, **run_kwargs).returncode == 0

    # Fades: with xfade transitions the join IS the transition,
    # so middle scenes have no fade (first scene fades in, last
    # fades out). `fade` is empty when both are off; `fade_sfx`
    # is the ",fade..." suffix used to append it to a vf chain.
    fade_parts = []
    if fade_in:
        fade_parts.append("fade=t=in:st=0:d=0.5")
    if fade_out:
        fade_parts.append(
            f"fade=t=out:st={max(duration - 0.5, 0)}:d=0.5")
    fade = ",".join(fade_parts)
    fade_sfx = f",{fade}" if fade else ""
    if subtitles_srt is not None:
        subtitled_vf = (
            f"{base_vf},"
            f"subtitles='{subtitles_srt.name}':"
            f"force_style='{_SUBTITLE_STYLE}'"
            f"{fade_sfx}"
        )
        if _encode(subtitled_vf):
            return True
        # Subtitled encode failed: fall through to the plain
        # segment below rather than losing the scene.
        return _encode(f"{base_vf}{fade_sfx}")
    caption_file = None
    font = _find_font()
    if caption and font:
        import textwrap
        lines = textwrap.wrap(caption, width=52)[:2]
        if lines:
            caption_file = dest.with_suffix(".cap.txt")
            caption_file.write_text("\n".join(lines), encoding="utf-8")
            captioned_vf = (
                f"{base_vf},"
                f"drawtext=fontfile={font}:textfile={caption_file}:"
                "fontsize=28:fontcolor=white:box=1:boxcolor=black@0.75:"
                "boxborderw=18:x=(w-text_w)/2:y=h-90"
                f"{fade_sfx}"
            )
            if _encode(captioned_vf):
                caption_file.unlink(missing_ok=True)
                return True
            # Captioned encode failed: fall through to the
            # plain segment below rather than losing the scene.
    if caption_file is not None:
        caption_file.unlink(missing_ok=True)
    return _encode(f"{base_vf}{fade_sfx}")


def _build_scene(index: int, scene: dict, title: str, visuals: str,
                 voice: str, work_dir: Path, used_urls: set, lock,
                 expressive: bool = True, subtitles: bool = True,
                 pexels_key: str | None = None,
                 pixabay_key: str | None = None,
                 total_scenes: int = 1,
                 transition_sec: float = _TRANSITION_SEC) -> dict | None:
    """Build ONE scene: its voiceover, its visual, its encoded
    segment. Scenes are independent until the final join, so
    this runs in a worker thread. Returns the scene's report +
    segment/voice paths, or None if the scene could not be
    built (it is skipped, never a failed job).
    When subtitles is on, the scene's voiceover is transcribed
    with faster-whisper (word timestamps) and the live captions
    are burned into the segment; they replace the static
    caption. A subtitle failure never breaks the scene — it
    falls back to the static caption."""
    # Voice for this scene only, so its length is known before
    # its visual segment is built.
    voice_path, engine = tts_module.synthesize(
        scene["narration"], voice, "+0%", work_dir,
        expressive=False)  # plain voice: SSML is banned
    duration = video_module.get_duration(voice_path)
    if not duration or duration <= 0:
        # Retry once with the fallback engine path inside
        # synthesize (it already falls back to gTTS); if still
        # unmeasurable, skip this scene's voice rather than
        # shipping a silent scene.
        return None
    visual_path, kind, visual_source = _scene_visual(
        title, scene, visuals, work_dir, index, used_urls, lock,
        pexels_key=pexels_key, pixabay_key=pixabay_key)
    caption = _caption_text(scene)
    subtitles_srt: Path | None = None
    if subtitles:
        subtitles_srt = _transcribe_scene_voice(voice_path, work_dir, index)
    dest = work_dir / f"master-seg-{index:02d}.mp4"
    # Visual transitions (xfade, 2026-11-08): every segment except
    # the last is `transition_sec` LONGER than its voice, so the
    # xfade overlap eats exactly that extra time and the joined
    # video lands on exactly the voiceover length. The join IS the
    # transition, so middle scenes have no fade (first fades in,
    # last fades out); the xfade chain blends the boundaries.
    is_last = index >= total_scenes - 1
    seg_duration = duration if is_last else duration + transition_sec
    fade_in = index == 0
    fade_out = is_last
    if kind == "clip":
        ok = _segment_scene_clip(visual_path, caption, seg_duration,
                                 dest, subtitles_srt=subtitles_srt,
                                 fade_in=fade_in, fade_out=fade_out)
    else:
        ok = _segment_scene_image(visual_path, caption, seg_duration,
                                  dest, pan_right=(index % 2 == 0),
                                  subtitles_srt=subtitles_srt,
                                  fade_in=fade_in, fade_out=fade_out)
    if not ok:
        # Segment encode failed: fall back to the old plain
        # segment builders for this scene.
        if kind == "clip":
            ok = autovideo._segment_clip(visual_path, dest, seg_duration)
        else:
            ok = autovideo._segment_image(visual_path, dest, seg_duration)
    if not ok:
        return None
    return {
        "index": index,
        "narration": scene["narration"],
        "visual": scene["visual"],
        "caption": caption,
        "kind": kind,
        "visual_source": visual_source,
        "duration_sec": round(duration, 1),
        "segment": dest,
        "voice_path": voice_path,
        "duration": duration,
        "engine": engine,
    }


def run_master(title: str, minutes: int, visuals: str, voice: str,
               work_dir: Path, expressive: bool = True,
               progress_cb=None, subtitles: bool = True,
               pexels_key: str | None = None,
               pixabay_key: str | None = None,
               music: bool = True,
               transitions: bool = True) -> dict:
    """Build a scene-based video. Returns a report dict with
    final_path, script, scenes, durations and counts. Every
    failure inside a scene falls back to the next option;
    only a total FFmpeg failure raises, and the caller then
    falls back to the old pipeline.

    SPEED (2026-11-07): scenes are built in PARALLEL (up to 4
    workers) instead of one after another — a scene's voiceover
    (network), visual search (network) and segment encode (CPU)
    are independent of the other scenes, so wall time drops
    roughly by the worker count. The final join is a stream
    COPY (segments are already 1280x720 yuv420p), not a second
    full re-encode. progress_cb(done, total, stage) reports
    real per-scene progress, so the bar no longer sits at 10%
    for the whole build.

    TRANSITIONS + MOOD MUSIC (2026-11-08): when `transitions`
    is on, the join is an xfade chain (a different transition
    style at every boundary, rotating) instead of a stream copy
    — the segments are built voice+0.5s so the overlap lands on
    exactly the voiceover length. When `music` is on and the
    user has a Pixabay key, a mood-matched royalty-free track
    plays low under the voiceover, and a different Pixabay
    sound effect plays at each scene change. Music/SFX fetch
    never breaks a build (no key / no result -> skipped)."""
    import os
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    work_dir.mkdir(parents=True, exist_ok=True)
    scenes, source = generate_scenes(title, minutes)
    if not scenes:
        raise RuntimeError("Could not build a scene script.")
    if progress_cb:
        progress_cb(0, len(scenes), "Script ready — building scenes…")
    workers = max(2, min(4, os.cpu_count() or 4))
    used_urls: set = set()
    lock = threading.Lock()
    kinds = {"clip": 0, "image": 0, "ai": 0, "card": 0}
    total_voice = 0.0
    results: dict[int, dict] = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(_build_scene, index, scene, title, visuals,
                        voice, work_dir, used_urls, lock, expressive,
                        subtitles, pexels_key, pixabay_key,
                        len(scenes), _TRANSITION_SEC): index
            for index, scene in enumerate(scenes)
        }
        done = 0
        for future in as_completed(futures):
            done += 1
            result = future.result()
            if result is not None:
                results[result["index"]] = result
                kinds[result["kind"]] += 1
                total_voice += result["duration"]
            if progress_cb:
                progress_cb(done, len(scenes),
                            f"Building scene {done} of {len(scenes)}…")
    ordered = [results[i] for i in sorted(results)]
    if not ordered:
        raise RuntimeError("Master pipeline produced no usable scenes.")
    segments = [item["segment"] for item in ordered]
    voice_files = [item["voice_path"] for item in ordered]
    scene_reports = [{
        "narration": item["narration"],
        "visual": item["visual"],
        "caption": item["caption"],
        "kind": item["kind"],
        "visual_source": item["visual_source"],
        "duration_sec": item["duration_sec"],
    } for item in ordered]
    engine = ordered[0]["engine"]
    # Mood music + transition SFX (2026-11-08): detect the mood
    # from the title + script, fetch a matching Pixabay music
    # track and several distinct Pixabay sound effects (user's
    # Pixabay key). No key / no result / any failure -> music
    # and SFX are skipped, the video still builds. Fetching
    # happens here (after the scenes) so it never slows the
    # parallel scene build.
    script_text = "\n\n".join(s["narration"] for s in scenes)
    mood = _detect_mood(title, script_text)
    music_path: Path | None = None
    music_status = "off"
    sfx_paths: list[Path] = []
    sfx_status = "off"
    if music:
        music_path, music_status = _fetch_mood_music(
            mood, pixabay_key, work_dir)
    if transitions:
        sfx_paths, sfx_status = _fetch_transition_sfx(
            pixabay_key, work_dir)
    # Join scene segments, then mux the joined voiceover.
    video_only = work_dir / "master-video-only.mp4"
    joined_ok = False
    join_method = "copy"
    if transitions and len(segments) > 1:
        # Xfade join: a DIFFERENT transition style at every
        # boundary, rotating through _TRANSITION_TYPES. Each
        # segment is voice+0.5s (except the last), so the 0.5s
        # overlap lands the joined video on exactly the
        # voiceover length. The xfade offset for boundary k is
        # the cumulative voice duration up to scene k.
        # (Segments are 1280x720 yuv420p libx264 at 30fps, so
        # the xfade re-encode is one pass, preset veryfast.)
        voice_durs = [item["duration"] for item in ordered]
        chain: list[str] = []
        prev = "[0:v]"
        offset = 0.0
        for k in range(len(segments) - 1):
            ttype = _TRANSITION_TYPES[k % len(_TRANSITION_TYPES)]
            offset += voice_durs[k]
            out = f"[x{k}]" if k < len(segments) - 2 else "[vout]"
            chain.append(
                f"{prev}[{k + 1}:v]xfade=transition={ttype}:"
                f"duration={_TRANSITION_SEC}:offset={offset:.3f}{out}")
            prev = out
        filter_graph = ";".join(chain)
        cmd = ["ffmpeg", "-y"]
        for seg in segments:
            cmd += ["-i", str(seg)]
        cmd += ["-filter_complex", filter_graph,
                "-map", "[vout]", "-r", "30",
                "-c:v", "libx264", "-preset", "veryfast",
                "-pix_fmt", "yuv420p", str(video_only)]
        proc = subprocess.run(cmd, capture_output=True, text=True,
                              **video_module.no_window_kwargs())
        if proc.returncode == 0 and video_only.exists():
            joined_dur = video_module.get_duration(video_only) or 0
            if joined_dur >= total_voice * 0.9:
                joined_ok = True
                join_method = "xfade"
    if not joined_ok:
        # Stream-copy fallback: no crossfades, but the video
        # still builds (first scene fades in, last fades out,
        # middle boundaries are hard cuts). Segments are already
        # 1280x720 yuv420p libx264 at 30fps, so a stream copy
        # joins them with NO re-encode.
        if video_only.exists():
            video_only.unlink(missing_ok=True)
        list_file = work_dir / "master-concat.txt"
        list_file.write_text(
            "".join(f"file '{seg.resolve()}'\n" for seg in segments),
            encoding="utf-8")
        proc = subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", str(list_file), "-c:v", "copy", str(video_only)],
            capture_output=True, text=True,
            **video_module.no_window_kwargs())
        if proc.returncode == 0 and video_only.exists():
            joined_dur = video_module.get_duration(video_only) or 0
            if joined_dur >= total_voice * 0.9:
                joined_ok = True
    if not joined_ok:
        if video_only.exists():
            video_only.unlink(missing_ok=True)
        proc = subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", str(list_file),
             "-vf", "scale=1280:720,format=yuv420p", "-r", "30",
             "-c:v", "libx264", "-preset", "veryfast",
             "-pix_fmt", "yuv420p", str(video_only)],
            capture_output=True, text=True,
            **video_module.no_window_kwargs())
        if proc.returncode != 0 or not video_only.exists():
            raise RuntimeError(
                f"Master video assembly failed: {proc.stderr[-1000:]}")
    if progress_cb:
        progress_cb(len(scenes), len(scenes), "Joining scenes…")
    audio_list = work_dir / "master-audio.txt"
    audio_list.write_text(
        "".join(f"file '{path.resolve()}'\n" for path in voice_files),
        encoding="utf-8")
    voice_joined = work_dir / "master-voice.mp3"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(audio_list),
         "-c:a", "libmp3lame", str(voice_joined)],
        capture_output=True, text=True, **video_module.no_window_kwargs())
    if proc.returncode != 0 or not voice_joined.exists():
        raise RuntimeError(f"Master audio assembly failed: {proc.stderr[-1000:]}")
    # Transition SFX track: one (different) sound at each scene
    # boundary, placed at the cumulative voice time. Built as a
    # single track first so the final mux stays simple (voice +
    # music + one SFX track). No SFX -> no track, no change.
    sfx_track: Path | None = None
    if sfx_paths and len(ordered) > 1:
        boundary_times: list[float] = []
        cum = 0.0
        for item in ordered[:-1]:
            cum += item["duration"]
            boundary_times.append(cum)
        sfx_track = work_dir / "sfx-track.m4a"
        sfx_cmd = ["ffmpeg", "-y"]
        for p in sfx_paths:
            sfx_cmd += ["-i", str(p)]
        # Round-robin the SFX so no two consecutive boundaries
        # play the same sound (variety, per the user's ask).
        parts: list[str] = []
        labels: list[str] = []
        for i, bt in enumerate(boundary_times):
            src = i % len(sfx_paths)
            ms = int(bt * 1000)
            parts.append(
                f"[{src}:a]adelay={ms}|{ms},volume={_SFX_VOLUME}[s{i}]")
            labels.append(f"[s{i}]")
        n_inputs = len(boundary_times) + 1
        sfx_cmd += ["-filter_complex",
                    ";".join(parts) + ";" +
                    "".join(labels) +
                    f"amix=inputs={len(boundary_times)}:"
                    f"duration=longest:dropout_transition=0[sfx]",
                    "-map", "[sfx]", "-t", str(total_voice),
                    "-c:a", "aac", str(sfx_track)]
        proc = subprocess.run(sfx_cmd, capture_output=True, text=True,
                              **video_module.no_window_kwargs())
        if proc.returncode != 0 or not sfx_track.exists():
            sfx_track = None  # SFX failed -> skip, video still builds
    final_path = work_dir / "final.mp4"
    if music_path is not None or sfx_track is not None:
        # Mixed final audio: voice (full) + mood music (looped,
        # 12%, under the voice) + SFX track (at the boundaries).
        # Video is copied, audio re-encoded to AAC.
        mix_cmd = ["ffmpeg", "-y", "-i", str(video_only),
                   "-i", str(voice_joined)]
        fc_parts: list[str] = []
        mix_labels: list[str] = ["[1:a]"]
        input_idx = 2
        if music_path is not None:
            mix_cmd += ["-i", str(music_path)]
            fc_parts.append(
                f"[{input_idx}:a]aloop=loop=-1:size=2e+09,"
                f"volume={_MUSIC_VOLUME},atrim=0:{total_voice:.3f}"
                f"[music]")
            mix_labels.append("[music]")
            input_idx += 1
        if sfx_track is not None:
            mix_cmd += ["-i", str(sfx_track)]
            mix_labels.append(f"[{input_idx}:a]")
            input_idx += 1
        n_mix = len(mix_labels)
        fc = ";".join(fc_parts)
        if fc:
            fc += ";"
        fc += "".join(mix_labels) + (
            f"amix=inputs={n_mix}:duration=first:"
            f"dropout_transition=0[aout]")
        mix_cmd += ["-filter_complex", fc,
                    "-map", "0:v", "-map", "[aout]",
                    "-t", str(total_voice), "-c:v", "copy",
                    "-c:a", "aac", "-shortest", str(final_path)]
        proc = subprocess.run(mix_cmd, capture_output=True, text=True,
                              **video_module.no_window_kwargs())
        if proc.returncode != 0 or not final_path.exists():
            # Mixed mux failed -> fall back to the plain mux
            # (voice only); the video is not lost.
            proc = subprocess.run(
                ["ffmpeg", "-y", "-i", str(video_only),
                 "-i", str(voice_joined),
                 "-t", str(total_voice), "-c:v", "copy", "-c:a", "aac",
                 "-shortest", str(final_path)],
                capture_output=True, text=True,
                **video_module.no_window_kwargs())
    else:
        proc = subprocess.run(
            ["ffmpeg", "-y", "-i", str(video_only), "-i", str(voice_joined),
             "-t", str(total_voice), "-c:v", "copy", "-c:a", "aac",
             "-shortest", str(final_path)],
            capture_output=True, text=True, **video_module.no_window_kwargs())
    if proc.returncode != 0 or not final_path.exists():
        raise RuntimeError(f"Master audio mux failed: {proc.stderr[-1000:]}")
    # Final quality gate: duration and size must be sane.
    final_duration = video_module.get_duration(final_path) or 0
    if final_duration <= 0 or final_path.stat().st_size < 100_000:
        raise RuntimeError("Master final video failed its quality gate.")
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
        "mood": mood,
        "music": music_path.name if music_path is not None else None,
        "music_status": music_status,
        "transition_sfx": len(sfx_paths),
        "sfx_status": sfx_status,
        "transitions": transitions,
        "join": join_method,
    }

