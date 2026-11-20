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
import os
import sys
import math
import re
import subprocess
import threading
import time
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


def generate_scenes(title: str, minutes: int, script: str | None = None,
                    words_target: int | None = None,
                    is_short: bool = False) -> tuple[list[dict], str]:
    """Return (scenes, source). Each scene: narration + visual.
    NOTE 2026-11-03: asking Pollinations for a SCENE/NARRATION/
    VISUAL format returns HTTP 400 (same filter that rejected
    the 'stage directions' clause), so structured output is NOT
    relied on. Instead the proven plain-script prompt is used,
    and the script is split into scenes locally. A scene's
    visual search is always anchored to the title (see
    _scene_visual), so a generic sentence word like 'ever' or
    'fought' can never pull an irrelevant clip again.
    CUSTOM SCRIPT (user, 2026-11-09): when the user pastes a
    script they wrote (e.g. from Gemini), use it as-is instead
    of generating one — the same paragraph split turns it into
    scenes, so the video is built from their words.
    SHORTS (user, 2026-11-09): words_target overrides the
    minutes x 150 target for a Short (seconds, not minutes).
    A Short also splits FINER — 2 sentences per group (not 3)
    and a 10-word minimum scene (not 20) — so a single-paragraph
    Short script still cuts to a new visual every couple of
    sentences instead of one clip for the whole Short."""
    custom = bool(script and script.strip())
    if custom:
        # YOUR script is spoken word for word (user, 2026-11-18: "it
        # cuts my script on its own"): only markdown, links and clear
        # labels ("Hook:", "Scene 2", "[music]") are removed — a short
        # spoken line without a full stop is NOT a heading.
        script = _clean_custom(script.strip())
        source = "custom"
    else:
        script, source = autovideo.generate_script(title, minutes,
                                                   words_target=words_target)
    group_size = 2 if is_short else 3
    min_scene_words = 10 if is_short else 20
    scenes: list[dict] = []
    parts = _split_custom(script, group_size) if custom else autovideo.split_paragraphs(script, group_size=group_size)
    carry = ""  # a short opening line (the hook!) is never dropped: it joins the next scene
    for paragraph in parts:
        first = re.split(r"(?<=[.!?])\s+", paragraph.strip())
        visual = first[0] if first and first[0] else title  # the scene's OWN first sentence finds its footage
        paragraph = (carry + " " + paragraph.strip()).strip() if carry else paragraph.strip()
        carry = ""
        if not paragraph:
            continue
        # Tiny fragments (e.g. a trailing 'Hidden layers of
        # intrigue?') are not scenes: merge them into the
        # previous scene instead of shipping a 2-second scene.
        if len(paragraph.split()) < min_scene_words and scenes:
            scenes[-1]["narration"] += " " + paragraph
            continue
        if len(paragraph.split()) < min_scene_words and not scenes:
            carry = paragraph
            continue
        scenes.append({"narration": paragraph, "visual": visual})
    if carry:
        scenes.append({"narration": carry, "visual": title})
    if not scenes:
        scenes = [{"narration": script.strip(), "visual": title}]
    return scenes, source + "-scenes"


_LABEL_RE = re.compile(r"(?i)^\s*(?:hook|intro(?:duction)?|outro|conclusion|ending|summary|recap|cta|call to action|"
                       r"scene|section|chapter|part|segment|step|point|title|narrator|voice ?over|vo|host|speaker)"
                       r"(?:\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|[ivx]+))?\s*[:.\-–—]?\s*$")
_LABEL_PREFIX_RE = re.compile(r"(?i)^\s*(?:narrator|voice ?over|vo|host|speaker|hook|intro(?:duction)?|outro|conclusion)\s*:\s*")
_STAGE_RE = re.compile(r"^\s*[\[(][^\])]{0,80}[\])]\s*$")


def _clean_custom(text: str) -> str:
    """Your own script: keep every spoken word. Removed: markdown
    marks, links, '[music]' / '(pause)' lines, bare labels like
    'Hook:' or 'Scene 3', and a 'Narrator:' prefix."""
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text or "")
    text = re.sub(r"(?<!\w)\*([^*\n]+)\*(?!\w)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    out = []
    for line in text.splitlines():
        raw = line.strip()
        core = re.sub(r"^[#>\-*•\s]+", "", raw).strip()
        if not core:
            out.append("")
            continue
        if _LABEL_RE.match(core) or _STAGE_RE.match(core) or re.fullmatch(r"[-=_*~]{3,}", core):
            continue
        core = _LABEL_PREFIX_RE.sub("", core)
        core = re.sub(r"\s*[\[(](?:music|sfx|pause|beat|b-roll|broll|cut to|visual|on screen|graphic)[^\])]*[\])]\s*", " ", core, flags=re.I).strip()
        if core:
            out.append(core)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def _split_custom(script: str, group_size: int) -> list[str]:
    """Your script → scenes: your paragraphs; one long paragraph (or
    single lines) → a few sentences per scene. Nothing is dropped."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", script) if p.strip()]
    if len(paras) == 1 or all(len(p.split()) < 12 for p in paras):
        text = " ".join(" ".join(p.split()) for p in paras)
        sentences = [x for x in re.split(r"(?<=[.!?…])\s+", text) if x.strip()]
        return [" ".join(sentences[i:i + group_size]) for i in range(0, len(sentences), group_size)]
    return [" ".join(p.split()) for p in paras]


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
                  pixabay_key: str | None = None,
                  vertical: bool = False) -> tuple[Path, str, str]:
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
    # SHORT QUERY (user, 2026-11-09): the old search_text was
    # the full title + the full first sentence — a 25-word phrase
    # that Commons answered with carbon-budget videos for a
    # banking video. short_query keeps at most 5 topical words.
    search_text = autovideo.short_query(title, visual_text)

    def _on_topic(item: dict) -> bool:
        if not title_core:
            return True
        return bool(autovideo._title_words(item["title"]) & title_core)

    # Prefer a clip for motion, then an image. Candidates are
    # already scored by file-title overlap with the visual
    # description, best first.
    # CLIP-FIRST FIX (user, 2026-11-09): a 30-minute video came
    # out with ONLY images and ZERO clips. The on-topic filter
    # below rejected nearly every Commons video (their file
    # titles rarely contain the title's core words), so scenes
    # fell through to images even when clips were available.
    # Now two passes: on-topic clips first, then ANY clip from
    # the found list — a moving clip, even loosely related, keeps
    # viewers watching far better than a static image.
    # LONG-VIDEO FIX (user, 2026-11-09): short videos looked
    # great but long videos were mostly AI images. Root cause:
    # only the FIRST 5 clips / FIRST 5 images were ever tried,
    # and images had NO "any image" second pass — so once the
    # first few scenes used up the top 5, every later scene
    # fell straight to AI. Now ALL found candidates are tried
    # (on-topic first, then any), so a long video uses the
    # whole pool before ever touching AI.
    # SPEED FIX (user, 2026-11-09): each footage took ~1 minute
    # even though the clip is only 5-8 seconds — because the
    # download time depends on FILE SIZE, not length, and the app
    # downloaded the full original (up to 50MB). Now small files
    # are tried first (<=15MB, typically 720p or lower), so a
    # clip downloads 2-3x faster; big files are only a fallback.
    # Relevance still comes first (on-topic before any), size
    # second — a small on-topic clip beats a big on-topic one.
    _FAST_VIDEO_BYTES = 15 * 1024 * 1024
    def _try_clips(candidates):
        for item in candidates:
            if not _reserve_url(used_urls, lock, item["url"]):
                continue
            suffix = ".webm" if "webm" in (item.get("mime") or "") else ".mp4"
            dest = work_dir / f"scene-{index:02d}{suffix}"
            if autovideo._download(item["url"], dest):
                if autovideo._ffprobe_duration(dest):
                    autovideo_smart.remember_footage(item["url"])
                    return dest, "clip", item["title"]
            _release_url(used_urls, lock, item["url"])
        return None
    # SMART + VARIED (user, 2026-11-18): footage found from what the scene
    # MEANS (the AI's searches, wrong things filtered out), picked at random
    # among the best matches, and not what recent videos already used.
    import autovideo_smart
    smart = autovideo_smart.smart_candidates(title, scene, visuals, pexels_key, pixabay_key, vertical)
    if visuals in ("videos", "both") and smart["videos"]:
        got = _try_clips(smart["videos"])
        if got:
            return got
    if visuals in ("images", "both"):
        for item in smart["images"]:
            if not _reserve_url(used_urls, lock, item["url"]):
                continue
            dest = work_dir / f"scene-{index:02d}.jpg"
            if autovideo._download(item["url"], dest) and autovideo._valid_image(dest):
                autovideo_smart.remember_footage(item["url"])
                return dest, "image", item["title"]
            _release_url(used_urls, lock, item["url"])
    # the older word-based search, when the plan found nothing usable
    found = autovideo.fetch_visuals(search_text, visuals,
                                    pexels_key=pexels_key,
                                    pixabay_key=pixabay_key,
                                    vertical=vertical)
    if visuals in ("videos", "both"):
        on_topic = autovideo_smart.vary([it for it in found["videos"] if _on_topic(it)])
        any_clip = autovideo_smart.vary(list(found["videos"]))
        for pool in (
            [it for it in on_topic if (it.get("size") or 0) <= _FAST_VIDEO_BYTES],
            on_topic,
            [it for it in any_clip if (it.get("size") or 0) <= _FAST_VIDEO_BYTES],
            any_clip,
        ):
            got = _try_clips(pool)
            if got:
                return got
    if visuals in ("images", "both"):
        for item in found["images"]:
            if not _on_topic(item):
                continue
            if not _reserve_url(used_urls, lock, item["url"]):
                continue
            dest = work_dir / f"scene-{index:02d}.jpg"
            if autovideo._download(item["url"], dest) and autovideo._valid_image(dest):
                return dest, "image", item["title"]
            _release_url(used_urls, lock, item["url"])
        for item in found["images"]:
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
    return _tidy_caption(sentence)


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
    "wonder": ["wonder", "amazing", "incredible", "mind-blowing",
               "mindblowing", "fascinating", "curious", "curiosity",
               "discovery", "discover", "explore", "unbelievable",
               "surprising", "surprise", "awesome", "facts",
               "did you know", "wow", "strange", "bizarre",
               "astonishing", "remarkable", "jaw-dropping"],
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
# Freesound search query per mood (a mood word alone is too
# narrow; these return tracks that actually fit the mood).
_MOOD_MUSIC_QUERY = {
    "suspense": "suspenseful dark tense",
    "wonder": "wonder magical",
    "happy": "happy upbeat cheerful",
    "motivational": "motivational inspiring uplifting",
    "sad": "sad emotional piano",
    "epic": "epic cinematic orchestral",
    "calm": "calm relaxing ambient",
}
_MUSIC_VOLUME = 0.20  # 20% — background music, clearly there but never over the voice (user, 2026-11-09)
# under the voice. Was 0.12 (12%): the user reported "Music: ✓
# added" but could NOT hear it — 12% of a quiet Freesound track
# is inaudible under the voiceover. 30% is a standard narration
# bed level: the voice (100%) still dominates, but the music is
# unmistakably there. (2026-11-08, user report: SFX audible,
# music not heard despite "✓ added".)
_SFX_VOLUME = 0.8  # Was 0.5: the user heard only ONE transition
# sound in a video with 4 SFX — Freesound preview levels vary
# wildly, so quiet tracks were inaudible. 0.8 plus loudnorm
# (below) makes every transition sound clearly audible.
# Distinct Freesound queries — one track per query, so
# the SFX library is genuinely different sounds, not six whooshes.
_SFX_QUERIES = ["whoosh", "swoosh", "transition", "swipe", "impact",
                "riser"]


def _detect_mood(title: str, script_text: str) -> str:
    """Keyword mood of the title+script. Falls back to 'calm'
    (a neutral ambient bed) when nothing matches.
    WORD BOUNDARIES (2026-11-08): keywords match whole words
    only (regex \\b), not substrings — a plain `kw in text`
    check matched "win" inside "blo**win**g", so "10
    Mind-Blowing Facts About Our World" was misread as
    "motivational". It also let a "fun facts" script read as
    "happy" instead of "wonder"."""
    text = f"{title} {script_text}".lower()
    best, best_count = "calm", 0
    for mood, keywords in _MOOD_KEYWORDS.items():
        count = sum(
            1 for kw in keywords
            if re.search(r"\b" + re.escape(kw) + r"\b", text))
        if count > best_count:
            best, best_count = mood, count
    return best


def _freesound_search(query: str, key: str,
                       per_page: int = 10) -> tuple[list[dict], str]:
    """One Freesound search. Returns (hits, status) where status
    is "ok" | "auth" | "error". Key is sent per-request and
    never stored. Each hit carries `duration` (seconds) and
    `previews` {"preview-hq-mp3", "preview-lq-mp3"} (direct MP3
    URLs — previews need only the API key, no OAuth).
    WHY FREESOUND (2026-11-08): Pixabay's public API does NOT
    expose audio to standard keys — verified live by two
    independent projects (sfxdock, x-post-scheduler) and by this
    user's own valid key: /api/audio/ returns 403 Access denied
    for a key that is valid for images/videos. Gemini was right;
    the earlier /api/audio/ "fix" only changed which dead end
    the code hit. Freesound is a real audio API (free key at
    freesound.org/apiv2/apply) serving both music and SFX."""
    try:
        params = {"query": query.strip(), "token": key.strip(),
                  "page_size": str(per_page),
                  "fields": "id,name,duration,previews,license"}
        url = ("https://freesound.org/apiv2/search/text/?"
               f"{urllib.parse.urlencode(params)}")
        req = urllib.request.Request(
            url, headers={"User-Agent": "YT-Guru/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        hits = data.get("results", [])
        return (hits if isinstance(hits, list) else []), "ok"
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return [], "auth"
        return [], "error"
    except Exception:
        return [], "error"


def _freesound_preview_url(hit: dict) -> str | None:
    """Best downloadable MP3 preview URL for a Freesound hit."""
    previews = hit.get("previews") or {}
    return (previews.get("preview-hq-mp3")
            or previews.get("preview-lq-mp3") or None)


def _is_music_hit(hit: dict) -> bool:
    """True if a Freesound hit is a music track (not a sound
    effect): long (tens of seconds to minutes) with a playable
    preview. SFX are a few seconds."""
    if not _freesound_preview_url(hit):
        return False
    return (hit.get("duration") or 0) >= 20


def _is_sfx_hit(hit: dict) -> bool:
    """True if a Freesound hit is a sound effect (not a music
    track): a short clip with a playable preview."""
    if not _freesound_preview_url(hit):
        return False
    return 0 < (hit.get("duration") or 0) <= 10


def _fetch_mood_music(mood: str, freesound_key: str | None,
                      work_dir: Path, deadline: float | None = None) -> tuple[Path | None, str]:
    """Download a royalty-free background track matching the mood
    from Freesound. Returns (mp3 path or None, status) where
    status is "ok" | "no_key" | "key_rejected" | "no_results".
    The status is reported in the job result so a missing track
    is never silent (the user asked "how would I know if the key
    is wrong" — the same applies here). Never raises.
    DEADLINE (user, 2026-11-09): the audio step once sat at 90%
    for 10 minutes on slow Freesound fetches — a deadline (epoch
    seconds) stops trying new queries/downloads once passed, so
    the step finishes instead of hanging."""
    if not freesound_key or not freesound_key.strip():
        return None, "no_key"
    # Try the mood query first, then broader fallbacks — a
    # 4-word mood query can return nothing on Freesound even
    # though matching tracks exist (2026-11-08: "wonder curious
    # magical discovery" found nothing, so the video had no
    # music at all). The fallbacks are generic enough to almost
    # always return a long track.
    queries = [_MOOD_MUSIC_QUERY.get(mood, "calm relaxing ambient"),
               "ambient cinematic", "cinematic"]
    for query in queries:
        if deadline is not None and time.time() > deadline:
            return None, "no_results"
        hits, status = _freesound_search(query, freesound_key)
        if status == "auth":
            return None, "key_rejected"
        if status == "error":
            continue
        if not hits:
            continue
        for hit in hits:
            if deadline is not None and time.time() > deadline:
                return None, "no_results"
            if not _is_music_hit(hit):
                continue
            audio_url = _freesound_preview_url(hit)
            if not audio_url:
                continue
            dest = work_dir / "mood-music.mp3"
            try:
                # total_timeout=45 (user, 2026-11-09): a slow
                # Freesound preview must fail fast, never trickle
                # for minutes and hang the audio step.
                if autovideo._download(audio_url, dest, total_timeout=45):
                    return dest, "ok"
            except Exception:
                continue
    return None, "no_results"


def _fetch_transition_sfx(freesound_key: str | None, work_dir: Path,
                          count: int = 6, deadline: float | None = None) -> tuple[list[Path], str]:
    """Download DISTINCT royalty-free transition sounds from
    Freesound — one per query, so the library is genuinely
    different sounds. Returns (mp3 paths, status) where status
    is "ok" | "no_key" | "key_rejected" | "no_results" (same
    visibility rule as the music fetch). Never raises.
    DEADLINE (user, 2026-11-09): see _fetch_mood_music — stops
    trying new queries once passed, so the audio step finishes
    instead of hanging on slow Freesound fetches."""
    if not freesound_key or not freesound_key.strip():
        return [], "no_key"
    sfx: list[Path] = []
    seen_urls: set[str] = set()
    any_hit = False
    for query in _SFX_QUERIES:
        if len(sfx) >= count:
            break
        if deadline is not None and time.time() > deadline:
            break
        hits, status = _freesound_search(query, freesound_key,
                                         per_page=5)
        if status == "auth":
            return [], "key_rejected"
        if status == "error":
            continue
        if hits:
            any_hit = True
        # Short sounds first (a transition sound is ~0.5-1s).
        hits.sort(key=lambda h: (h.get("duration") or 99))
        for hit in hits:
            if deadline is not None and time.time() > deadline:
                break
            if not _is_sfx_hit(hit):
                continue
            audio_url = _freesound_preview_url(hit)
            if not audio_url or audio_url in seen_urls:
                continue
            if (hit.get("duration") or 0) > 3:
                continue
            dest = work_dir / f"sfx-{len(sfx)}.mp3"
            try:
                # total_timeout=45 (user, 2026-11-09): see
                # _fetch_mood_music — a slow preview fails fast.
                if autovideo._download(audio_url, dest, total_timeout=45):
                    sfx.append(dest)
                    seen_urls.add(audio_url)
                    break  # one track per query -> distinct sounds
            except Exception:
                continue
    if sfx:
        return sfx, "ok"
    return [], "no_results" if any_hit else "unreachable"


# Visual transitions (xfade, 2026-11-08): a different transition
# style at every scene boundary, rotating so no two consecutive
# boundaries look the same. These are FFmpeg xfade transition
# names. The join re-encodes (stream copy cannot crossfade); if
# the xfade join fails, run_master falls back to the stream-copy
# concat (segments keep their first/last fade, middle boundaries
# become hard cuts — the video still builds).
# TRANSITION_SEC is 1.0s (raised from 0.5s, 2026-11-08): the user
# reported "no transition effect" twice even though the result
# said "applied" — a 0.5s crossfade is too subtle to notice, so
# the transitions are now a full second, unmistakable.
_TRANSITION_SEC = 1.0
_TRANSITION_TYPES = ["fade", "wipeleft", "wiperight", "slideleft",
                     "slideright", "circleopen", "fadeblack",
                     "fadewhite", "dissolve", "pixelize"]


def _tidy_caption(t: str) -> str:
    """Caption spacing as people write it (user, 2026-11-20): Whisper splits "100,000" into
    "100 ,000" and "3%" into "3 %" — the pieces are joined back."""
    t = re.sub(r"\s+([,.%!?:;)])", r"\1", t)
    t = re.sub(r"(\d)[,.]\s+(\d{3})\b", lambda m: m.group(0).replace(" ", ""), t)
    t = re.sub(r"([$€£(])\s+", r"\1", t)
    return re.sub(r"\s{2,}", " ", t).strip()


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
        lines.append(_tidy_caption(text))
        lines.append("")
    return "\n".join(lines)


# ------------------------------------------------------- number pop-ups
# (user, 2026-11-09): when the voiceover says a figure (like
# $100 or 50%), it pops up big on screen at that exact moment,
# flying in from a random corner to a random point — it makes
# the video feel alive, the way finance YouTubers do it. This
# is a POST-PROCESSING step on the finished video, so it works
# on an already-rendered video too (no re-render from scratch).

_NUMBER_RE = re.compile(
    r"\$?\d[\d,]*(?:\.\d+)?\s*(?:million|billion|thousand|%)?",
    re.IGNORECASE)
_POPUP_SHOW_SEC = 1.2   # how long the number stays on screen
_POPUP_FLY_SEC = 0.3    # (old) fly-in duration from the corner
_POPUP_POP_SEC = 0.2    # scale-pop duration (40% -> 110% -> 100%)
# Pop-up lead (user, 2026-11-09): the word must pop up AS it is
# spoken (or just before), never after — the old timing put the
# pop-up at the spoken instant, but the 0.3s fly-in meant it only
# arrived after the word was already said. Start 0.4s early so
# the pop completes right as the word is spoken.
_POPUP_LEAD_SEC = 0.4
_POPUP_MAX_PER_SCENE = 2


_STAT_SHOW_SEC = 2.4   # a figure card stays long enough to read its label
_WORD_SHOW_SEC = 1.7
_LABEL_SKIP = {"the", "a", "an", "of", "and", "or", "to", "in", "on", "at", "for", "with", "that", "this", "is",
               "are", "was", "were", "it", "its", "by", "from", "as", "than", "be", "been", "has", "have", "had"}


def _stat_label(narration: str, m) -> str:
    """The words that say WHAT the figure is: '11 kilometres deep' →
    'KILOMETRES DEEP', '3000 year old honey' → 'YEAR OLD HONEY'."""
    after = re.split(r"[.,;:!?()\n]", narration[m.end():], maxsplit=1)[0].split()
    out = []
    for w in after[:5]:
        core = re.sub(r"[^A-Za-z'-]", "", w)
        if not core:
            break
        out.append(core)
        if len(out) == 3:
            break
    while out and out[-1].lower() in _LABEL_SKIP:
        out.pop()
    while out and out[0].lower() in _LABEL_SKIP and len(out) > 1:
        out.pop(0)
    return " ".join(out).upper()[:28]


def _popup_display(matched: str) -> str:
    """Short punchy text for a pop-up: '$100' stays '$100',
    '200 million' becomes '200M', '5 billion' becomes '5B',
    '50%' stays '50%'."""
    text = matched.strip()
    low = text.lower()
    digits = re.sub(r"[^0-9.]", "", text)
    if not digits:
        return text
    if "billion" in low:
        return digits.rstrip(".") + "B"
    if "million" in low:
        return digits.rstrip(".") + "M"
    if "thousand" in low:
        return digits.rstrip(".") + "K"
    return text


def _parse_srt_cues(srt_path: Path) -> list[dict]:
    """Parse an SRT file into [{start, end, text}]."""
    try:
        raw = srt_path.read_text(encoding="utf-8")
    except OSError:
        return []
    cues: list[dict] = []
    for block in raw.split("\n\n"):
        lines = [ln.strip() for ln in block.strip().splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        m = re.match(r"(\d+):(\d+):([\d.,]+)\s*-->\s*(\d+):(\d+):([\d.,]+)",
                     lines[1] if len(lines) > 1 and "-->" in lines[1] else lines[0])
        if not m:
            continue
        def _t(h, mi, s):
            return int(h) * 3600 + int(mi) * 60 + float(s.replace(",", "."))
        text = " ".join(lines[2:] if "-->" in lines[1] else lines[1:])
        cues.append({"start": _t(m.group(1), m.group(2), m.group(3)),
                     "end": _t(m.group(4), m.group(5), m.group(6)),
                     "text": text})
    return cues


def find_number_popups(scenes: list[dict], work_dir: Path) -> list[dict]:
    """Find every figure in the narration and WHEN it is spoken.
    Returns [{text, start, end}] with ABSOLUTE times in the
    finished video (scene offset + in-scene time). Timing comes
    from the scene's Whisper SRT cue that contains the number
    (interpolated by word position inside the cue); when the
    SRT has no match (Whisper heard 'one hundred' instead of
    '100'), it falls back to the number's position in the
    narration, scaled to the scene length. Max 2 pop-ups per
    scene, so a figure-heavy scene never turns into clutter."""
    popups: list[dict] = []
    offset = 0.0
    for i, scene in enumerate(scenes):
        duration = float(scene.get("duration_sec") or 0)
        narration = scene.get("narration") or ""
        if duration <= 0 or not narration:
            offset += duration
            continue
        matches = list(_NUMBER_RE.finditer(narration))
        if not matches:
            offset += duration
            continue
        cues = _parse_srt_cues(work_dir / f"scene-{i:02d}.srt")
        words = narration.split()
        taken = 0
        for m in matches:
            if taken >= _POPUP_MAX_PER_SCENE:
                break
            display = _popup_display(m.group(0))
            digits = re.sub(r"[^0-9]", "", m.group(0))
            when: float | None = None
            if digits and cues:
                for cue in cues:
                    cue_words = cue["text"].split()
                    for wi, w in enumerate(cue_words):
                        if digits and digits in re.sub(r"[^0-9]", "", w):
                            frac = (wi + 0.5) / max(len(cue_words), 1)
                            when = cue["start"] + frac * (cue["end"] - cue["start"])
                            break
                    if when is not None:
                        break
            if when is None:
                # Fallback: the number's word position in the
                # narration, scaled to the scene length.
                before = narration[:m.start()].split()
                frac = len(before) / max(len(words), 1)
                when = frac * duration
            when = max(0.0, min(when, max(duration - 0.5, 0.0)))
            # Lead: show 0.4s BEFORE the figure is spoken (user,
            # 2026-11-09) so the pop lands as the word is said.
            start = max(0.0, offset + when - _POPUP_LEAD_SEC)
            popups.append({"text": display, "start": round(start, 2),
                           "end": round(start + _STAT_SHOW_SEC, 2),
                           "scene": i, "label": _stat_label(narration, m),
                           "kind": "stat"})
            taken += 1
        offset += duration
    return popups


# Stopwords for the Realistic step's word suggestions (user,
# 2026-11-09): the filler words that must never be suggested
# as pop-up words — only content words carry meaning.
_STOPWORDS = set(
    """a an the and or but if then else when while of at by for with
    about into through after over between out against during without
    before under around among to from in on of is am are was were be
    been being have has had having do does did doing would should
    could ought i you he she it we they me him her us them my your
    his its our their this that these those there here what which
    who whom whose why how all any both each few more most other
    some such no nor not only own same so than too very can will
    just don should now""".split())


def suggest_words(scenes: list[dict], limit: int = 30) -> list[dict]:
    """Suggest the narration's important words for the Realistic
    step (user, 2026-11-09): the user picks from these, and
    every chosen word pops up wherever it is spoken. Ranked by
    how often the word appears (a repeated word is a key topic),
    then by length (longer words carry more meaning). Numbers
    are always suggested first — a figure is always important.
    Returns [{word, count}] (word in its spoken form)."""
    from collections import Counter
    counts: Counter = Counter()
    numbers: Counter = Counter()
    for scene in scenes:
        narration = scene.get("narration") or ""
        for m in _NUMBER_RE.finditer(narration):
            display = _popup_display(m.group(0))
            numbers[display] += 1
        for w in re.findall(r"[a-zA-Z][a-zA-Z\-']*", narration):
            low = w.lower().strip("-'")
            if len(low) < 3 or low in _STOPWORDS:
                continue
            counts[low] += 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], -len(kv[0]), kv[0]))
    out = [{"word": w, "count": c} for w, c in numbers.most_common()]
    out += [{"word": w, "count": c} for w, c in ranked[:limit]]
    return out


def find_word_popups(scenes: list[dict], work_dir: Path,
                     words: list[str]) -> list[dict]:
    """Find EVERY occurrence of the user's chosen words and WHEN
    each is spoken (user, 2026-11-09, Realistic step). Same
    timing as find_number_popups (Whisper SRT cue, interpolated
    by word position; narration-position fallback). A word that
    is spoken 5 times gets 5 pop-ups, one per occurrence. Each
    pop-up carries the word in its spoken form."""
    # AUTO (user, 2026-11-18: "the pick-the-words strategy was wrong"):
    # "__auto__" / "__auto__:fewer|more" = the app chooses the key words,
    # figures and lists itself, paced so they never rush in together.
    auto = next((w for w in words if str(w).startswith("__auto__")), None)
    if auto is not None:
        import autovideo_smart
        return autovideo_smart.plan_auto_popups(scenes, work_dir, (auto.split(":", 1) + ["normal"])[1] or "normal")
    wanted = {w.lower().strip() for w in words if w and w.strip()}
    if not wanted:
        return []
    popups: list[dict] = []
    offset = 0.0
    for i, scene in enumerate(scenes):
        duration = float(scene.get("duration_sec") or 0)
        narration = scene.get("narration") or ""
        if duration <= 0 or not narration:
            offset += duration
            continue
        cues = _parse_srt_cues(work_dir / f"scene-{i:02d}.srt")
        narr_words = narration.split()
        # Every occurrence of every wanted word in this scene.
        for wi, raw in enumerate(narr_words):
            low = re.sub(r"[^a-z0-9]", "", raw.lower())
            if low not in wanted:
                continue
            display = raw.strip(".,!?;:\"'()[]{}")
            when: float | None = None
            if cues:
                for cue in cues:
                    cue_words = cue["text"].split()
                    for ci, cw in enumerate(cue_words):
                        if re.sub(r"[^a-z0-9]", "", cw.lower()) == low:
                            frac = (ci + 0.5) / max(len(cue_words), 1)
                            when = cue["start"] + frac * (cue["end"] - cue["start"])
                            break
                    if when is not None:
                        break
            if when is None:
                when = (wi / max(len(narr_words), 1)) * duration
            when = max(0.0, min(when, max(duration - 0.5, 0.0)))
            # Lead + capital (user, 2026-11-09): show 0.4s BEFORE
            # the word is spoken, and capitalise the first letter
            # so the pop-up reads like a title, not a fragment.
            start = max(0.0, offset + when - _POPUP_LEAD_SEC)
            display = display[:1].upper() + display[1:] if display else display
            popups.append({"text": display, "start": round(start, 2),
                           "end": round(start + _WORD_SHOW_SEC, 2),
                           "scene": i, "kind": "word"})
        offset += duration
    return popups


def _filter_font_path(work_dir: Path) -> str | None:
    """A fontfile value that is safe inside an FFmpeg filter
    graph (no drive-letter colon, no backslashes). Copies the
    font into the job dir and returns its path relative to the
    server's working directory (the project root, where run.bat
    starts it). Falls back to the absolute path with the colon
    escaped if the relative path is not clean."""
    import os
    import shutil
    src = _find_font()
    if not src:
        return None
    dst = work_dir / "popup-font.ttf"
    try:
        if not dst.exists():
            shutil.copyfile(src, dst)
    except OSError:
        return None
    rel = os.path.relpath(dst, os.getcwd()).replace(os.sep, "/")
    if rel.startswith("..") or ":" in rel:
        return src.replace("\\", "\\\\").replace(":", "\\:")
    return rel


# Pop-up styles (user, 2026-11-09, Realistic step): EVERY
# occurrence gets a DIFFERENT style — a random colour, size
# and box, flying in from a random corner to a random point —
# so no two pop-ups in the video look the same.
_POPUP_COLORS = ["#FFD60A", "#00E5FF", "#FF6B9D", "#7CFC00",
                 "#FF9F1C", "#FFFFFF", "#C084FC"]


def apply_popups(final_path: Path, popups: list[dict],
                 work_dir: Path, duration: float | None,
                 progress_cb=None) -> Path:
    """Burn the pop-ups into a finished video — STUDIO style (user,
    2026-11-18: "make the pop-up text most professional"). Every pop-up
    is a clean broadcast card drawn as a picture (Pillow): a dark glass
    panel, one accent colour bar for the whole video, a bold white word
    or figure and, for a figure, a small caption saying what it is
    ("11" / "KILOMETRES DEEP"). Cards slide in softly with a fade, sit
    in the upper corners (never over the subtitles or the middle of the
    picture), take turns left / right, and never pile on each other.
    Returns final-popups.mp4; raises on failure (the caller keeps the
    original video)."""
    import subprocess
    width, height = 1280, 720
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0",
         str(final_path)], capture_output=True, text=True,
        **video_module.no_window_kwargs())
    if probe.returncode == 0 and probe.stdout.strip():
        try:
            w, h = probe.stdout.strip().split(",")[:2]
            width, height = int(w), int(h)
        except ValueError:
            pass
    cards = _layout_cards(sorted(popups, key=lambda p: p["start"]), width, height, work_dir)
    if not cards:
        raise RuntimeError("No pop-ups to add.")
    out_path = work_dir / "final-popups.mp4"
    inputs: list[str] = ["-i", str(final_path)]
    chains: list[str] = []
    last = "[0:v]"
    slide = max(24, width // 40)
    for k, c in enumerate(cards):
        dur = c["end"] - c["start"]
        inputs += ["-loop", "1", "-framerate", "30", "-t", f"{dur:.2f}", "-i", str(c["png"])]
        t0 = c["start"]
        chains.append(f"[{k + 1}:v]format=rgba,fade=t=in:st=0:d=0.22:alpha=1,"
                      f"fade=t=out:st={max(0.0, dur - 0.3):.2f}:d=0.3:alpha=1,setpts=PTS-STARTPTS+{t0:.2f}/TB[c{k}]")
        sign = -1 if c["side"] == "left" else 1
        # slide 'slide' px in from the screen edge with an ease-out
        x = f"{c['x']}+{sign}*{slide}*pow(max(0,1-(t-{t0:.2f})/0.28),2)"
        chains.append(f"{last}[c{k}]overlay=x='{x}':y={c['y']}:eof_action=pass:"
                      f"enable='between(t,{t0:.2f},{c['end']:.2f})'[v{k}]")
        last = f"[v{k}]"
    graph = ";".join(chains)

    def _run(g: str):
        # the graph goes on the command line (newer FFmpeg dropped -filter_complex_script);
        # a very long graph goes through a file with the new "-/filter_complex" form
        if len(g) < 24000:
            fc = ["-filter_complex", g]
        else:
            script = work_dir / "popups.filter"
            script.write_text(g, encoding="utf-8")
            fc = ["-/filter_complex", str(script)]
        cmd = ["ffmpeg", "-y"] + inputs + fc + [
            "-map", last, "-map", "0:a?",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-pix_fmt", "yuv420p", "-c:a", "copy",
            "-movflags", "+faststart", str(out_path)]
        return video_module.run_with_progress(
            cmd, duration, 0, 100,
            on_progress=(lambda pct, el, eta: progress_cb(pct) if progress_cb else None))
    ok, out = _run(graph)
    if not ok or not out_path.exists():
        # plain version: no slide, just the cards fading in and out
        plain = re.sub(r"overlay=x='[^']*'", lambda m: "overlay=x='" + m.group(0).split("'")[1].split("+")[0] + "'", graph)
        ok, out = _run(plain)
    if not ok or not out_path.exists():
        raise RuntimeError(f"Pop-ups failed: {out[-500:]}")
    return out_path


_ACCENTS = ["#FFC300", "#00D1FF", "#FF4D6D", "#7CFF6B", "#B388FF", "#FF8A00"]


def _card_fonts() -> tuple[str | None, str | None]:
    """Bold + medium fonts for the cards (Poppins ships with the app;
    Windows / Linux system fonts as a fallback)."""
    here = Path(__file__).resolve().parent / "fonts"
    bold = [here / "Poppins-Bold.ttf", Path(r"C:\Windows\Fonts\seguibl.ttf"), Path(r"C:\Windows\Fonts\segoeuib.ttf"),
            Path(r"C:\Windows\Fonts\arialbd.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")]
    med = [here / "Poppins-Medium.ttf", Path(r"C:\Windows\Fonts\seguisb.ttf"), Path(r"C:\Windows\Fonts\segoeui.ttf"),
           Path(r"C:\Windows\Fonts\arial.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")]
    pick = lambda xs: next((str(p) for p in xs if p.exists()), None)  # noqa: E731
    return pick(bold), pick(med) or pick(bold)


def _draw_card(text: str, label: str, accent: str, height: int, dest: Path, max_w: int = 0,
               scale: float = 1.0) -> tuple[int, int]:
    """One broadcast-style card as a transparent PNG. Returns its size.
    max_w: the card shrinks its text until it fits (a narrow Reel screen)."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    bold, med = _card_fonts()
    text = text.strip()
    if len(text) > 26:
        text = text[:25] + "…"
    big = int(height * (0.088 if label else 0.066) * scale)
    small = int(height * 0.034 * scale)
    while True:
        fb = ImageFont.truetype(bold, big) if bold else ImageFont.load_default()
        fm = ImageFont.truetype(med, small) if med else ImageFont.load_default()
        need = int(height * 0.09) + max(int(fb.getlength(text)), int(fm.getlength(label) * 1.2) if label else 0)
        if not max_w or need <= max_w or big <= 18:
            break
        big, small = int(big * 0.9), max(12, int(small * 0.92))
    track = max(1, small // 6)  # letter spacing for the caption

    def wide(s: str, f, sp: int = 0) -> int:
        return int(sum(f.getlength(ch) + sp for ch in s)) if s else 0
    tw = int(fb.getlength(text))
    asc, desc = fb.getmetrics()
    lw = wide(label, fm, track)
    pad_x, pad_y = int(height * 0.03 * scale), int(height * 0.022 * scale)
    bar = max(5, int(height * 0.009 * scale))
    inner_w = max(tw, lw)
    w = pad_x * 2 + bar + int(height * 0.012) + inner_w
    h = pad_y * 2 + (asc + desc) + (int(small * 1.5) if label else 0)
    sh = int(height * 0.018)  # room for the shadow
    img = Image.new("RGBA", (w + sh * 2, h + sh * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((sh, sh + sh // 3, sh + w, sh + h + sh // 3), radius=int(height * 0.016), fill=(0, 0, 0, 150))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(sh * 0.6)))
    d = ImageDraw.Draw(img)
    r = int(height * 0.016)
    d.rounded_rectangle((sh, sh, sh + w, sh + h), radius=r, fill=(13, 17, 30, 228))
    d.rounded_rectangle((sh, sh, sh + w, sh + h), radius=r, outline=(255, 255, 255, 38), width=max(1, height // 540))
    ac = tuple(int(accent[i:i + 2], 16) for i in (1, 3, 5))
    d.rounded_rectangle((sh + pad_x // 2, sh + pad_y, sh + pad_x // 2 + bar, sh + h - pad_y), radius=bar // 2, fill=ac + (255,))
    x0 = sh + pad_x // 2 + bar + int(height * 0.018)
    d.text((x0, sh + pad_y - int(big * 0.06)), text, font=fb, fill=(255, 255, 255, 255))
    if label:
        ly = sh + pad_y + asc + desc - int(small * 0.1)
        x = x0
        for ch in label:
            d.text((x, ly), ch, font=fm, fill=ac + (255,))
            x += int(fm.getlength(ch)) + track
    img.save(dest)
    return img.size


def _layout_cards(popups: list[dict], width: int, height: int, work_dir: Path) -> list[dict]:
    """Where and when each card shows.
    - Footage: upper-left / upper-right in turn (top-centre on a Reel),
      never two on the same spot at once.
    - A list ("stack"): one card per item, each under the one before,
      all leaving together.
    - A studio scene: beside the presenter (left or right of him — he looks
      that way).
    - Reels: every card is sized to fit inside the narrow screen."""
    import hashlib
    accent = _ACCENTS[int(hashlib.md5(str(work_dir).encode()).hexdigest(), 16) % len(_ACCENTS)]
    vertical = height > width
    ref_h = int(width * 0.85) if vertical else height  # a Reel: big enough to read on a phone, still inside the width
    margin_x = int(width * (0.06 if vertical else 0.045))
    top = int(height * (0.14 if vertical else 0.075))
    max_w = width - 2 * margin_x
    busy: dict[str, float] = {"left": -1.0, "right": -1.0, "top": -1.0, "top2": -1.0}
    side_turn = 0
    stacks: dict[str, dict] = {}
    out = []
    for i, p in enumerate(popups):
        text = " ".join(str(p.get("text") or "").split())
        if not text:
            continue
        label = str(p.get("label") or "")
        png = work_dir / f"popup-card-{i:03d}.png"
        start, end = float(p["start"]), float(p["end"])
        if p.get("kind") == "stack":
            st = stacks.get(p["group"])
            if st is None:
                side = p.get("side") or ("left" if not vertical else "top")
                st = stacks[p["group"]] = {"y": top, "side": side}
            cw, ch = _draw_card(text, "", accent, ref_h, png, max_w=int(max_w * (0.48 if p.get("studio") and not vertical else 1)),
                                scale=0.82)
            if p.get("studio") and not vertical:
                x = int(width * 0.6) if st["side"] == "right" else int(width * 0.4) - cw
            elif vertical:
                x = (width - cw) // 2
            else:
                x = margin_x - int(ref_h * 0.018)
            out.append({"png": png, "x": max(0, min(x, width - cw)), "y": st["y"], "start": round(start, 2), "end": round(end, 2),
                        "side": "left" if st["side"] in ("left", "top") else "right"})
            st["y"] += int(ch * 0.86)
            continue
        if p.get("studio"):
            # beside the presenter, at chest height; he looks this way
            side = p.get("side") or "right"
            half = int(width * (0.44 if vertical else 0.36))
            cw, ch = _draw_card(text, label, accent, ref_h, png, max_w=half)
            x = int(width * 0.56) if side == "right" else int(width * 0.44) - cw
            y = int(height * (0.3 if vertical else 0.34))
            out.append({"png": png, "x": max(0, min(x, width - cw)), "y": y, "start": round(start, 2),
                        "end": round(end, 2), "side": side})
            continue
        cw, ch = _draw_card(text, label, accent, ref_h, png, max_w=max_w)
        slots = ["top", "top2"] if vertical else (["left", "right"] if side_turn % 2 == 0 else ["right", "left"])
        slot = next((s_ for s_ in slots if busy[s_] + 0.25 <= start), None)
        if slot is None:  # both busy: wait for the first one to clear (still while the word is fresh)
            slot = min(slots, key=lambda s_: busy[s_])
            shift = busy[slot] + 0.25 - start
            if shift > 1.0:
                continue
            start, end = start + shift, end + shift
        busy[slot] = end
        side_turn += 1
        if vertical:
            x = (width - cw) // 2
            y = top + (0 if slot == "top" else int(ch * 1.05))
        else:
            x = margin_x - int(ref_h * 0.018) if slot == "left" else width - margin_x - cw + int(ref_h * 0.018)
            y = top
        out.append({"png": png, "x": max(0, min(x, width - cw)), "y": max(0, y), "start": round(start, 2), "end": round(end, 2),
                    "side": "left" if slot in ("left", "top") else "right"})
    return out


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


def _align_to_script(words: list[dict], narration: str) -> list[dict]:
    """The script's own words with the voice's timing (user, 2026-11-20): the speech recogniser
    mishears names ("take to interactive") and splits numbers ("100" + ",000"); the captions now show
    exactly what was written, each word at the moment it is spoken."""
    import difflib
    script = narration.split()
    if not script or not words:
        return words

    def norm(w):
        return re.sub(r"[^a-z0-9]+", "", w.lower())
    a = [norm(w) for w in script]
    b = [norm(w["word"]) for w in words]
    times: list[tuple[float, float] | None] = [None] * len(script)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            w = words[blk.b + k]
            times[blk.a + k] = (w["start"], w["end"])
    known = [i for i, t in enumerate(times) if t]
    if len(known) < max(2, len(script) // 4):  # too different: keep what was heard
        return words
    end = words[-1]["end"]
    out = []
    for i, w in enumerate(script):
        if times[i] is None:  # between the nearest known words, spread evenly
            prev = max((k for k in known if k < i), default=None)
            nxt = min((k for k in known if k > i), default=None)
            t0 = times[prev][1] if prev is not None else words[0]["start"]
            t1 = times[nxt][0] if nxt is not None else end
            lo = prev if prev is not None else -1
            hi = nxt if nxt is not None else len(script)
            step = (t1 - t0) / max(1, hi - lo - 1)
            st = t0 + step * (i - lo - 1)
            times[i] = (st, st + step)
        out.append({"start": float(times[i][0]), "end": float(max(times[i][1], times[i][0] + 0.05)), "word": w})
    return out


def _scene_narration(work_dir: Path, index: int) -> str:
    try:
        return (work_dir / f"scene-{index:02d}.narration.txt").read_text(encoding="utf-8")
    except OSError:
        return ""


def _remember_narrations(work_dir: Path, scenes: list[dict]) -> None:
    """Each scene's written words beside its voice, so its captions can use them."""
    for i, sc in enumerate(scenes):
        try:
            p = work_dir / f"scene-{i:02d}.narration.txt"
            t = str(sc.get("narration") or "")
            if t and (not p.exists() or p.read_text(encoding="utf-8") != t):
                p.write_text(t, encoding="utf-8")
        except OSError:
            pass


def _transcribe_scene_voice(voice_path: Path, work_dir: Path, index: int) -> Path | None:
    """Transcribe ONE scene's voiceover with word timestamps and
    write a per-scene SRT (times relative to the scene start,
    0.0s — the scene's voice starts at 0.0s inside its segment,
    so the SRT aligns automatically). Returns the SRT path, or
    None on ANY failure: a subtitle failure must never break a
    scene — the segment is then built with its static caption
    instead."""
    srt_cached = work_dir / f"scene-{index:02d}.srt"
    try:
        narration = _scene_narration(work_dir, index)
        words_file = work_dir / f"scene-{index:02d}.words.json"
        if (srt_cached.exists() and srt_cached.stat().st_mtime >= voice_path.stat().st_mtime
                and narration and words_file.exists() and words_file.stat().st_mtime >= voice_path.stat().st_mtime):
            words = json.loads(words_file.read_text(encoding="utf-8"))
            fresh = _words_to_srt(_align_to_script(words, narration))
            if srt_cached.read_text(encoding="utf-8") != fresh:  # the script changed its spelling: same timing
                st = srt_cached.stat()
                srt_cached.write_text(fresh, encoding="utf-8")
                os.utime(srt_cached, (st.st_atime, st.st_mtime))
            return srt_cached
        if srt_cached.exists() and srt_cached.stat().st_mtime >= voice_path.stat().st_mtime and not narration:
            old = srt_cached.read_text(encoding="utf-8")
            fixed = "\n".join(ln if ("-->" in ln or ln.strip().isdigit()) else _tidy_caption(ln) for ln in old.split("\n"))
            if fixed != old:  # an older caption file: its spacing fixed, its time kept (the cache stays valid)
                st = srt_cached.stat()
                srt_cached.write_text(fixed, encoding="utf-8")
                os.utime(srt_cached, (st.st_atime, st.st_mtime))
            return srt_cached  # already transcribed (rich-footage timing used it)
    except OSError:
        pass
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
            audio, language="en", beam_size=5, word_timestamps=True,
            initial_prompt=(_scene_narration(work_dir, index)[:600] or None))
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
        narration = _scene_narration(work_dir, index)
        try:
            (work_dir / f"scene-{index:02d}.words.json").write_text(json.dumps(words), encoding="utf-8")
        except OSError:
            pass
        if narration:
            words = _align_to_script(words, narration)
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
# SHORTS (user, 2026-11-09): subtitles for a 9:16 vertical
# frame. The old flow burned captions into a 1280x720 segment
# and THEN scaled the whole video 2.67x to vertical — so the
# captions came out 64px and cut off at both edges. Shorts now
# render directly in 1080x1920, so the caption font is sized
# for that width (32px fits a 5-word cue on one line).
_SUBTITLE_STYLE_VERTICAL = (
    "FontName=Arial,FontSize=32,PrimaryColour=&HFFFFFF,"
    "OutlineColour=&H000000,BorderStyle=1,Outline=2,Shadow=0,"
    "Alignment=2,MarginV=40"
)


def _segment_scene_image(image_path: Path, caption: str, duration: float,
                         dest: Path, pan_right: bool,
                         subtitles_srt: Path | None = None,
                         fade_in: bool = True,
                         fade_out: bool = True,
                         vertical: bool = False) -> bool:
    """Still image -> moving segment: slow horizontal pan
    (so a photo feels like video) + fade in/out + caption.
    When subtitles_srt is given, the live word-by-word captions
    replace the static caption (the two bottom texts must never
    overlap): the Pillow caption is skipped and the SRT is burned
    in with the subtitles filter. The SRT filename is passed
    bare and FFmpeg runs with cwd=work_dir, so no path escaping
    is needed (Windows drive letters contain ':' which the
    filter graph would misread).
    SHORTS (user, 2026-11-09): vertical=True renders the segment
    directly in 1080x1920 (slow VERTICAL pan + vertical caption
    style) instead of a 1280x720 segment that gets scaled 2.67x
    and cropped — that magnification is what cut the captions
    off at both edges."""
    if subtitles_srt is not None:
        shown = image_path
    else:
        captioned = dest.with_suffix(".cap.jpg")
        shown = _burn_caption(image_path, caption, captioned)
    # Pan: scale up, then crop a window sliding across. x goes
    # 0 -> (in_w - out_w) or the reverse (landscape); for a
    # vertical Short the pan is vertical instead (y slides).
    # FFmpeg's crop filter has NO `duration` variable — the scene
    # length must be substituted as a number, or the filter fails
    # ("Undefined constant ... 'duration'") and the scene falls
    # back to a plain still. (That was a real bug: the pan never
    # worked, so image scenes lost their motion + caption.)
    direction = "t" if pan_right else f"({duration}-t)"
    if vertical:
        vf = (
            "scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920:"
            f"x='(in_w-out_w)/2':y='(in_h-out_h)*({direction}/{duration})',"
            "format=yuv420p,"
        )
    else:
        vf = (
            "scale=1920:1080:force_original_aspect_ratio=increase,"
            "crop=1280:720:"
            f"x='(in_w-out_w)*({direction}/{duration})':y='(in_h-out_h)/2',"
            "format=yuv420p,"
        )
    style = _SUBTITLE_STYLE_VERTICAL if vertical else _SUBTITLE_STYLE
    if subtitles_srt is not None:
        vf += (
            f"subtitles='{subtitles_srt.name}':"
            f"force_style='{style}',"
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
                        fade_out: bool = True,
                        vertical: bool = False) -> bool:
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
    (uncaptioned) segment is built instead.
    SHORTS (user, 2026-11-09): vertical=True renders the segment
    directly in 1080x1920. A landscape clip is NOT centre-cropped
    (that threw away 70% of the picture) — it is shown whole,
    fitted to the 1080 width, over a blurred + darkened copy of
    itself filling the frame (the standard Shorts look). A true
    vertical clip fills the frame, so its background is hidden.
    Captions use the vertical subtitle style."""
    if vertical:
        # Blurred-background fill: split the clip, blur+darken one
        # copy to fill 1080x1920, fit the other to the 1080 width
        # and centre it. format after the overlay keeps the chain
        # in yuv420p for the encoder.
        base_vf = (
            "split[a][b];"
            "[a]scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,gblur=sigma=30,eq=brightness=-0.3[bg];"
            "[b]scale=1080:-1[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p"
        )
    else:
        # (user, 2026-11-18: stock scenes looked wrong) A clip close to
        # 16:9 FILLS the frame (no black bars); a tall / square / very
        # wide clip is shown whole over a soft blurred copy of itself.
        ar = _clip_aspect(clip_path)
        if 1.45 <= ar <= 2.1:
            base_vf = ("scale=1280:720:force_original_aspect_ratio=increase,"
                       "crop=1280:720,setsar=1,format=yuv420p")
        else:
            base_vf = (
                "split[a][b];"
                "[a]scale=1280:720:force_original_aspect_ratio=increase,"
                "crop=1280:720,gblur=sigma=26,eq=brightness=-0.22:saturation=0.85[bg];"
                "[b]scale=1280:720:force_original_aspect_ratio=decrease[fg];"
                "[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p"
            )
    clip_dur = autovideo._ffprobe_duration(clip_path) or duration
    loop_args: list[str] = []
    seek_args: list[str] = []
    if clip_dur < duration:
        loop_args = ["-stream_loop", str(math.ceil(duration / clip_dur))]
    elif clip_dur > duration + 2.5:
        # skip the clip's own first second (fades from black, logos)
        seek_args = ["-ss", f"{min(1.5, (clip_dur - duration) / 2):.2f}"]

    def _encode(vf: str) -> bool:
        cmd = ["ffmpeg", "-y", "-fflags", "+genpts"] + loop_args + seek_args + ["-i", str(clip_path),
               "-map", "0:v:0", "-vf", vf, "-r", "30", "-t", str(duration), "-an", "-sn", "-dn",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
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
    style = _SUBTITLE_STYLE_VERTICAL if vertical else _SUBTITLE_STYLE
    if subtitles_srt is not None:
        subtitled_vf = (
            f"{base_vf},"
            f"subtitles='{subtitles_srt.name}':"
            f"force_style='{style}'"
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


def _clip_aspect(path: Path) -> float:
    """Width / height of a clip as it is SHOWN (phone videos carry a
    rotation flag: a 1920x1080 file can really be portrait)."""
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=width,height:stream_side_data=rotation:stream_tags=rotate",
                            "-of", "json", str(path)], capture_output=True, text=True,
                           **video_module.no_window_kwargs())
        st = json.loads(r.stdout or "{}").get("streams", [{}])[0]
        w, h = float(st.get("width") or 16), float(st.get("height") or 9)
        rot = str((st.get("tags") or {}).get("rotate") or "")
        for sd in st.get("side_data_list") or []:
            rot = str(sd.get("rotation", rot))
        if rot.strip("-") in ("90", "270"):
            w, h = h, w
        return w / max(1.0, h)
    except Exception:  # noqa: BLE001
        return 16 / 9


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


def list_mood_music(mood: str, freesound_key: str | None,
                    deadline: float | None = None) -> tuple[list[dict], str]:
    """Music-track options for a mood (user, 2026-11-09 — change
    the background music AFTER the video is built). Returns a
    list of {id, name, duration_sec, preview_url, license} the
    user can listen to and pick from, plus a status ("ok" |
    "no_key" | "key_rejected" | "no_results"). Only real music
    tracks (>= 20s, playable preview) — never SFX. Tries the
    mood query first, then the generic fallbacks.
    DEADLINE (user, 2026-11-09): see _fetch_mood_music."""
    if not freesound_key or not freesound_key.strip():
        return [], "no_key"
    queries = [_MOOD_MUSIC_QUERY.get(mood, "calm relaxing ambient"),
               "ambient cinematic", "cinematic"]
    seen: set[int] = set()
    options: list[dict] = []
    for query in queries:
        if deadline is not None and time.time() > deadline:
            break
        hits, status = _freesound_search(query, freesound_key, per_page=10)
        if status == "auth":
            return [], "key_rejected"
        if status == "error" or not hits:
            continue
        for hit in hits:
            if not _is_music_hit(hit):
                continue
            hid = hit.get("id")
            if hid in seen:
                continue
            seen.add(hid)
            preview = _freesound_preview_url(hit)
            if not preview:
                continue
            options.append({
                "id": hid,
                "name": hit.get("name") or "Untitled track",
                "duration_sec": round(float(hit.get("duration") or 0), 1),
                "preview_url": preview,
                "license": hit.get("license") or "",
            })
            if len(options) >= 8:
                return options, "ok"
    if not options:
        return [], "no_results"
    return options, "ok"


def remix_music(work_dir: Path, music_path: Path, volume: float,
                total_voice: float) -> dict:
    """Re-mix a finished video with a DIFFERENT background music
    track at a chosen volume (user, 2026-11-09). The video and
    voiceover are untouched — only the music bed changes. Takes
    the video-only stream (master-video-only.mp4), the unchanged
    voiceover (master-voice.mp3), the new track (looped, at the
    given volume) and the existing SFX track (if any), and muxes
    a new final.mp4. The new track is also saved as
    mood-music.mp3 so a later scene change keeps it. Returns
    {final_path, final_duration_sec}."""
    video_only = work_dir / "master-video-only.mp4"
    voice_joined = work_dir / "master-voice.mp3"
    sfx_track = work_dir / "sfx-track.m4a"
    if not video_only.exists():
        raise RuntimeError("Video-only file missing — cannot re-mix.")
    if not voice_joined.exists():
        raise RuntimeError("Voiceover file missing — cannot re-mix.")
    if not music_path.exists():
        raise RuntimeError("Music track missing — cannot re-mix.")
    volume = max(0.0, min(1.0, float(volume)))
    final_path = work_dir / "final.mp4"
    mix_cmd = ["ffmpeg", "-y", "-i", str(video_only),
               "-i", str(voice_joined)]
    fc_parts: list[str] = []
    mix_labels: list[str] = ["[1:a]"]
    input_idx = 2
    mix_cmd += ["-i", str(music_path)]
    fc_parts.append(
        f"[{input_idx}:a]aloop=loop=-1:size=2e+09,"
        f"volume={volume},atrim=0:{total_voice:.3f}"
        f"[music]")
    mix_labels.append("[music]")
    input_idx += 1
    if sfx_track.exists():
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
        raise RuntimeError(
            f"Music re-mix failed: {proc.stderr[-1000:]}")
    final_duration = video_module.get_duration(final_path) or 0
    return {
        "final_path": final_path,
        "final_duration_sec": round(final_duration, 1),
    }


def rebuild_video_after_scene_change(work_dir: Path, scenes: list[dict],
                                     transitions: bool = True,
                                     vertical: bool = False) -> dict:
    """Re-join + re-mux a finished Auto Video after ONE scene's
    visual changed (user, 2026-11-09 — scene change is his most
    important feature: he changes MANY scenes). Only the VIDEO
    is rebuilt: the voiceover (master-voice.mp3), mood music
    (mood-music.mp3) and SFX track (sfx-track.m4a) are untouched,
    because a visual change never changes the narration. The
    segments are the on-disk master-seg-XX.mp4 files; the caller
    rebuilt the changed one first. The join is the same xfade
    chain run_master uses (same transition rotation, same
    offsets from the voice durations), with the same stream-copy
    fallbacks. Returns {final_path, final_duration_sec, join}.
    SHORTS (user, 2026-11-09): vertical=True makes the last-resort
    re-encode fallback 1080x1920 (the xfade/copy paths keep the
    segments' vertical resolution)."""
    segments = [work_dir / f"master-seg-{i:02d}.mp4" for i in range(len(scenes))]
    for seg in segments:
        if not seg.exists():
            raise RuntimeError(f"Scene segment missing: {seg.name}")
    voice_durs = [float(s.get("duration_sec") or 0) for s in scenes]
    total_voice = sum(voice_durs)
    if total_voice <= 0:
        raise RuntimeError("No scene durations — cannot re-join.")
    voice_joined = work_dir / "master-voice.mp3"
    if not voice_joined.exists():
        raise RuntimeError("Voiceover file missing — cannot re-mux.")
    video_only = work_dir / "master-video-only.mp4"
    joined_ok = False
    join_method = "copy"
    import autovideo_smart
    for names in ((autovideo_smart.SCENE_TRANSITIONS, autovideo_smart.SAFE_TRANSITIONS, _TRANSITION_TYPES)
                  if transitions and len(segments) > 1 else ()):
        if joined_ok:
            break
        chain: list[str] = []
        prev = "[0:v]"
        offset = 0.0
        for k in range(len(segments) - 1):
            ttype = names[k % len(names)]
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
        fallback_scale = "1080:1920" if vertical else "1280:720"
        proc = subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", str(list_file),
             "-vf", f"scale={fallback_scale},format=yuv420p", "-r", "30",
             "-c:v", "libx264", "-preset", "veryfast",
             "-pix_fmt", "yuv420p", str(video_only)],
            capture_output=True, text=True,
            **video_module.no_window_kwargs())
        if proc.returncode != 0 or not video_only.exists():
            raise RuntimeError(
                f"Scene-change re-join failed: {proc.stderr[-1000:]}")
    # Re-mux: video + the UNCHANGED voiceover + mood music +
    # SFX track (both only if they exist from the original build).
    music_path = work_dir / "mood-music.mp3"
    sfx_track = work_dir / "sfx-track.m4a"
    final_path = work_dir / "final.mp4"
    mix_cmd = ["ffmpeg", "-y", "-i", str(video_only),
               "-i", str(voice_joined)]
    fc_parts: list[str] = []
    mix_labels: list[str] = ["[1:a]"]
    input_idx = 2
    if music_path.exists():
        mix_cmd += ["-i", str(music_path)]
        fc_parts.append(
            f"[{input_idx}:a]aloop=loop=-1:size=2e+09,"
            f"volume={_MUSIC_VOLUME},atrim=0:{total_voice:.3f}"
            f"[music]")
        mix_labels.append("[music]")
        input_idx += 1
    if sfx_track.exists():
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
        proc = subprocess.run(
            ["ffmpeg", "-y", "-i", str(video_only),
             "-i", str(voice_joined),
             "-t", str(total_voice), "-c:v", "copy", "-c:a", "aac",
             "-shortest", str(final_path)],
            capture_output=True, text=True,
            **video_module.no_window_kwargs())
    if proc.returncode != 0 or not final_path.exists():
        raise RuntimeError(
            f"Scene-change re-mux failed: {proc.stderr[-1000:]}")
    final_duration = video_module.get_duration(final_path) or 0
    return {
        "final_path": final_path,
        "final_duration_sec": round(final_duration, 1),
        "join": join_method,
    }


def rebuild_scene_segment(work_dir: Path, index: int, scene: dict,
                          visual_path: Path, kind: str,
                          total_scenes: int,
                          vertical: bool = False) -> dict:
    """Rebuild ONE scene's segment with a new visual (user,
    2026-11-09 — scene change). The narration, voiceover and
    captions are unchanged, so no TTS and no Whisper run: the
    existing per-scene SRT (scene-XX.srt) is reused when it
    exists, else the static caption is used. The segment is
    voice+transition_sec long (except the last scene), exactly
    as the original build made it, so the re-join lands on the
    same total duration. Returns the updated scene report
    fields (kind, visual_source, duration_sec).
    SHORTS (user, 2026-11-09): vertical=True rebuilds the segment
    in 1080x1920 so a changed scene stays vertical."""
    duration = float(scene.get("duration_sec") or 0)
    if duration <= 0:
        raise RuntimeError("Scene has no duration — cannot rebuild.")
    is_last = index >= total_scenes - 1
    seg_duration = duration if is_last else duration + _TRANSITION_SEC
    caption = scene.get("caption") or _caption_text(scene)
    srt_path = work_dir / f"scene-{index:02d}.srt"
    subtitles_srt = srt_path if srt_path.exists() else None
    dest = work_dir / f"master-seg-{index:02d}.mp4"
    fade_in = index == 0
    fade_out = is_last
    if kind == "clip":
        ok = _segment_scene_clip(visual_path, caption, seg_duration,
                                 dest, subtitles_srt=subtitles_srt,
                                 fade_in=fade_in, fade_out=fade_out,
                                 vertical=vertical)
        if not ok:
            ok = autovideo._segment_clip(visual_path, dest, seg_duration)
    else:
        ok = _segment_scene_image(visual_path, caption, seg_duration,
                                  dest, pan_right=(index % 2 == 0),
                                  subtitles_srt=subtitles_srt,
                                  fade_in=fade_in, fade_out=fade_out,
                                  vertical=vertical)
        if not ok:
            ok = autovideo._segment_image(visual_path, dest, seg_duration)
    if not ok:
        raise RuntimeError("Could not build the new scene segment.")
    return {"kind": kind, "duration_sec": round(duration, 1)}


# ---------------------------------------------------------------------------
# STEP-BY-STEP PIPELINE (user, 2026-11-09)
# ---------------------------------------------------------------------------
# The old one-click flow built everything at once (script + voice +
# footage + render) and only then let the user edit — every edit
# re-rendered. The user asked for a simpler step flow instead, where
# the DECISIONS happen before any rendering:
#   Step 1 — Setup: title, length, niche, voice, script.
#   Step 2 — Footage: script + scenes, footage collected scene by
#     scene and shown in sequence; any scene's footage is changed
#     right there (no rendering yet, so changes are instant).
#   Step 3 — Audio: voiceover + background music + SFX gathered;
#     the music is changeable before the render.
#   Step 4 — Render: the video is edited from the chosen footage
#     + audio, reviewed, and still modifiable (scene/music change
#     still work on the finished video, as before).
# The three phase functions below are the steps; run_master (the
# old one-click path) is kept working and now calls join_and_mux
# so the join/mux code has a single home.
def _voice_scene_with_fallback(index: int, narration: str, voice: str,
                               work_dir: Path, tts_provider: str = "edge",
                               tts_key: str | None = None, first_scene: bool = False,
                               last_scene: bool = False
                               ) -> tuple[Path | None, str, float, bool, str]:
    """Voice ONE scene with the chosen provider; if that provider
    fails (bad key, free limit finished, network), fall back to
    the default Edge voice (Aria) so the video never gets stuck
    mid-way (user, 2026-11-09). Returns (path, engine, duration,
    fell_back, error). The fallback is reported, never silent —
    the job records it so the user knows his chosen voice was
    not the one used."""
    try:
        path, engine, duration = synthesize_scene_voice(
            index, narration, voice, work_dir, tts_provider, tts_key,
            first_scene=first_scene, last_scene=last_scene)
        return path, engine, duration, False, ""
    except Exception as exc:  # noqa: BLE001
        if not tts_provider or tts_provider == "edge":
            raise
        path, engine, duration = synthesize_scene_voice(
            index, narration, "en-US-AriaNeural", work_dir, "edge", None)
        return path, engine, duration, True, str(exc)[-200:]


def synthesize_scene_voice(index: int, narration: str, voice: str,
                           work_dir: Path, tts_provider: str = "edge",
                           tts_key: str | None = None, first_scene: bool = False,
                           last_scene: bool = False
                           ) -> tuple[Path | None, str, float]:
    """TTS for ONE scene (plain voice — SSML is banned: it slowed
    speech 3x). Returns (voice_path, engine, duration_sec); the
    path is None when the voice could not be measured. The provider
    (edge/google/unreal/elevenlabs) is the one the user picked in
    Step 1; the key is theirs, passed through, never stored here."""
    # STUDIO PRESENTER (user, 2026-11-18: "the voice is flat"): every
    # sentence spoken with a presenter's emotion, for every voice type —
    # Edge, your own key's provider, or a cloned voice ("clone:<id>").
    voice_path = None
    try:
        import tools_presenter
        voice_path, engine = tools_presenter.presenter_voice(
            index, narration, voice, work_dir, tts_provider, tts_key,
            first_scene=first_scene, last_scene=last_scene)
    except Exception as exc:  # noqa: BLE001 — the plain voice below, never a stuck video
        voice_path = None
        presenter_error = str(exc)[:120]
    else:
        presenter_error = ""
    if voice_path is None and voice.startswith("clone:"):
        voice, tts_provider = "en-US-AriaNeural", "edge"
    if voice_path is None and tts_provider and tts_provider != "edge":
        voice_path, engine = tts_module.synthesize_provider(
            narration, tts_provider, voice, tts_key, "+0%", work_dir)
    elif voice_path is None:
        voice_path, engine = tts_module.synthesize(
            narration, voice, "+0%", work_dir, expressive=False)
    if presenter_error:
        # never silent (user, 2026-11-18): the Audio step shows the voice was flat, and why
        engine = f"{engine} — flat voice, studio presenter failed: {presenter_error}"
    duration = video_module.get_duration(voice_path) or 0
    if not duration or duration <= 0:
        return None, engine, 0.0
    return voice_path, engine, duration


def encode_scene_segment(index: int, visual_path: Path, kind: str,
                         caption: str, voice_duration: float,
                         work_dir: Path, voice_path: Path,
                         subtitles: bool = True, total_scenes: int = 1,
                         transition_sec: float = _TRANSITION_SEC,
                         vertical: bool = False
                         ) -> Path | None:
    """Encode ONE scene's segment from its chosen visual + voice
    length. Word-by-word Whisper subtitles are burned in when
    they transcribe; a subtitle failure falls back to the static
    caption. Returns the segment path, or None on failure.
    SHORTS (user, 2026-11-09): vertical=True renders the segment
    directly in 1080x1920 (see _segment_scene_clip/image)."""
    subtitles_srt: Path | None = None
    if subtitles:
        subtitles_srt = _transcribe_scene_voice(voice_path, work_dir, index)
    dest = work_dir / f"master-seg-{index:02d}.mp4"
    is_last = index >= total_scenes - 1
    seg_duration = voice_duration if is_last else voice_duration + transition_sec
    fade_in = index == 0
    fade_out = is_last
    if kind == "clip":
        ok = _segment_scene_clip(visual_path, caption, seg_duration,
                                 dest, subtitles_srt=subtitles_srt,
                                 fade_in=fade_in, fade_out=fade_out,
                                 vertical=vertical)
    else:
        ok = _segment_scene_image(visual_path, caption, seg_duration,
                                  dest, pan_right=(index % 2 == 0),
                                  subtitles_srt=subtitles_srt,
                                  fade_in=fade_in, fade_out=fade_out,
                                  vertical=vertical)
    if not ok:
        # Segment encode failed: fall back to the old plain
        # segment builders for this scene.
        if kind == "clip":
            ok = autovideo._segment_clip(visual_path, dest, seg_duration)
        else:
            ok = autovideo._segment_image(visual_path, dest, seg_duration)
    return dest if ok else None


def join_and_mux(work_dir: Path, segments: list[Path],
                 voice_files: list[Path], durations: list[float],
                 total_voice: float, music_path: Path | None,
                 music_volume: float, sfx_paths: list[Path],
                 transitions: bool, total_scenes: int,
                 progress_cb=None, vertical: bool = False) -> tuple[Path, float, str]:
    """Join scene segments (xfade chain when transitions are on,
    stream-copy fallback, re-encode last resort), join the
    voiceover, build the SFX track at the scene boundaries, and
    mux voice + music + SFX into final.mp4. The music volume is
    a parameter (the step flow lets the user pick it; the old
    flow passes _MUSIC_VOLUME). Returns (final_path,
    final_duration_sec, join_method). Raises on failure.
    SHORTS (user, 2026-11-09): vertical=True makes the last-resort
    re-encode fallback 1080x1920 instead of 1280x720 (the xfade
    and stream-copy paths already keep the segments' resolution)."""
    video_only = work_dir / "master-video-only.mp4"
    joined_ok = False
    join_method = "copy"
    import autovideo_smart
    for names in ((autovideo_smart.SCENE_TRANSITIONS, autovideo_smart.SAFE_TRANSITIONS, _TRANSITION_TYPES)
                  if transitions and len(segments) > 1 else ()):
        if joined_ok:
            break
        chain: list[str] = []
        prev = "[0:v]"
        offset = 0.0
        for k in range(len(segments) - 1):
            ttype = names[k % len(names)]
            offset += durations[k]
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
    list_file = work_dir / "master-concat.txt"
    if not joined_ok:
        if video_only.exists():
            video_only.unlink(missing_ok=True)
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
        fallback_scale = "1080:1920" if vertical else "1280:720"
        proc = subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", str(list_file),
             "-vf", f"scale={fallback_scale},format=yuv420p", "-r", "30",
             "-c:v", "libx264", "-preset", "veryfast",
             "-pix_fmt", "yuv420p", str(video_only)],
            capture_output=True, text=True,
            **video_module.no_window_kwargs())
        if proc.returncode != 0 or not video_only.exists():
            raise RuntimeError(
                f"Master video assembly failed: {proc.stderr[-1000:]}")
    if progress_cb:
        progress_cb(total_scenes, total_scenes, "Joining scenes…")
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
    # boundary, placed at the cumulative voice time.
    sfx_track: Path | None = None
    if sfx_paths and len(durations) > 1:
        boundary_times: list[float] = []
        cum = 0.0
        for d in durations[:-1]:
            cum += d
            boundary_times.append(cum)
        sfx_track = work_dir / "sfx-track.m4a"
        sfx_cmd = ["ffmpeg", "-y"]
        for p in sfx_paths:
            sfx_cmd += ["-i", str(p)]
        parts: list[str] = []
        labels: list[str] = []
        for i, bt in enumerate(boundary_times):
            src = i % len(sfx_paths)
            ms = int(bt * 1000)
            parts.append(
                f"[{src}:a]loudnorm=I=-16:TP=-1.5:LRA=11,volume={_SFX_VOLUME},adelay={ms}|{ms}[s{i}]")
            labels.append(f"[s{i}]")
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
        mix_cmd = ["ffmpeg", "-y", "-i", str(video_only),
                   "-i", str(voice_joined)]
        fc_parts: list[str] = []
        mix_labels: list[str] = ["[1:a]"]
        input_idx = 2
        if music_path is not None:
            mix_cmd += ["-i", str(music_path)]
            fc_parts.append(
                f"[{input_idx}:a]aloop=loop=-1:size=2e+09,"
                f"volume={music_volume},atrim=0:{total_voice:.3f}"
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
    final_duration = video_module.get_duration(final_path) or 0
    if final_duration <= 0 or final_path.stat().st_size < 100_000:
        raise RuntimeError("Master final video failed its quality gate.")
    return final_path, round(final_duration, 1), join_method


def _av_app():
    import sys
    for mod in list(sys.modules.values()):
        if mod is not None and hasattr(mod, "_av_read") and hasattr(mod, "_av_write"):
            return mod
    return None


def _job_scenes_live(work_dir: Path, scenes: list[dict]) -> None:
    """Put the real scenes into the job while the footage is still being collected."""
    app = _av_app()
    if app is None:
        return
    try:
        job = app._av_read(work_dir.name)
        if job.get("status") in (None, "unknown"):
            return
        job["scenes"] = [{**s_, "index": i, "kind": "", "visual_file": "", "visual_source": "", "duration_sec": 0}
                         for i, s_ in enumerate(scenes)]
        app._av_write(job)
    except Exception:  # noqa: BLE001
        pass


def _job_scene_done(work_dir: Path, result: dict) -> None:
    """One scene's footage is ready: show it on the page now."""
    app = _av_app()
    if app is None:
        return
    try:
        job = app._av_read(work_dir.name)
        sc = job.get("scenes") or []
        i = int(result["index"])
        if 0 <= i < len(sc):
            sc[i] = {**sc[i], **{k: result[k] for k in ("kind", "visual_file", "visual_source", "visual_url") if k in result}}
            app._av_write(job)
    except Exception:  # noqa: BLE001
        pass


def _log_errors(fn):
    """Print the full error in the console (the job only shows one line), then fail as before."""
    import functools

    @functools.wraps(fn)
    def run(*a, **k):
        try:
            return fn(*a, **k)
        except Exception:
            import traceback
            print("---- Auto Video error (please send this to support) ----")
            traceback.print_exc()
            raise
    return run


@_log_errors
def plan_footage(title: str, minutes: int, script: str | None,
                 visuals: str, work_dir: Path,
                 pexels_key: str | None = None,
                 pixabay_key: str | None = None,
                 progress_cb=None,
                 video_type: str = "long",
                 short_seconds: int = 60) -> dict:
    """STEP 2 — Footage collection. Generates the scene script,
    then collects one visual per scene (clip/image/AI/card,
    same picking + dedup as _scene_visual) and downloads it
    into work_dir as scene-XX.<ext>. NO voiceover, NO rendering
    — so a scene's footage can be changed instantly afterwards.
    Returns {scenes, script, script_source, script_words} where
    each scene carries narration, visual, caption, kind,
    visual_source, visual_file (local name) and visual_url.
    SHORTS (user, 2026-11-09): video_type "short" builds a
    9:16 Short of short_seconds (15/30/45/60) — the script
    target is seconds x 2.5 words (~150 for 60s) and footage
    prefers vertical files; landscape files are centre-cropped
    to 9:16 at render time."""
    import os
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    work_dir.mkdir(parents=True, exist_ok=True)
    is_short = video_type == "short"
    words_target = None
    if is_short:
        # ~150 words/minute of speech → seconds x 2.5 words.
        words_target = max(30, round(short_seconds * 150 / 60))
    scenes, source = generate_scenes(title, minutes, script=script,
                                     words_target=words_target,
                                     is_short=is_short)
    if not scenes:
        raise RuntimeError("Could not build a scene script.")
    try:
        import tools_graphics as _tgv
        _visual = _tgv.style()["theme"] == "visual"
    except Exception:  # noqa: BLE001
        _visual = False
    import autovideo_smart
    try:
        _av_design = _tgv.style().get("av_design", "auto")
    except Exception:  # noqa: BLE001
        _av_design = "auto"
    if not _visual and _av_design == "script":
        # AUTO VIDEO SCRIPT MODE (user, 2026-11-20): no footage is searched yet — the user's AI plans every scene
        # (Script mode box on the next screen) and exactly that footage is downloaded then.
        import tools_script
        w_, h_ = (540, 960) if is_short else (960, 540)
        ordered = []
        for i, s_ in enumerate(scenes):
            still = work_dir / f"scene-{i:02d}-wait.png"
            tools_script.placeholder(still, i + 1, w_, h_, "waiting for your footage plan")
            sc_ = {"index": i, "narration": s_["narration"], "visual": s_["visual"], "caption": _caption_text(s_),
                   "kind": "image", "visual_source": "Script mode — paste your AI's footage plan (Script mode box)",
                   "visual_file": still.name, "visual_url": "", "duration_sec": 0,
                   "keywords": autovideo.core_words(s_["narration"])[:8], "plan": {"queries": [], "avoid": []}, "shots": []}
            ordered.append(sc_)
            _job_scene_done(work_dir, sc_)
        script_text = "\n\n".join(s["narration"] for s in scenes)
        return {"scenes": ordered, "script": script_text, "script_source": source, "script_words": len(script_text.split())}
    if _visual:  # Visual Explainer: no footage planning at all (it only cost time and Gemini quota)
        for s_ in scenes:
            s_.setdefault("plan", {})
    else:
        if progress_cb:
            progress_cb(0, len(scenes), "Reading every scene to plan its footage…")
        autovideo_smart.attach_scene_plans(title, scenes)
    script_text = "\n\n".join(s["narration"] for s in scenes)
    # (user, 2026-11-18) while footage is collected, the page shows HIS real
    # scenes (never example lines): they go into the job right away.
    _job_scenes_live(work_dir, [{"narration": s_["narration"], "caption": _caption_text(s_), "visual": s_["visual"]}
                                for s_ in scenes])
    used_urls: set = set()
    lock = threading.Lock()
    results: dict[int, dict] = {}
    try:  # graphics intensity, chosen on the Setup step (user, 2026-11-19)
        import tools_graphics as _tg
        gfx_amount = _tg.style()["graphics"] if _tg.available() else "none"
        theme = _tg.style()["theme"]
    except Exception:  # noqa: BLE001
        gfx_amount, theme = "none", "classic"
    if theme == "visual":
        # VISUAL EXPLAINER (user, 2026-11-19): pure motion graphics — no stock footage is searched or
        # downloaded at all; every scene gets an animation plan and a storyboard picture instead.
        import tools_graphics as _tg2
        if not _tg2.available():
            raise RuntimeError("Motion graphics are not installed yet — open the Dashboard and press Install on the Motion graphics row.")
        import tools_visual
        ordered = []
        for i, s_ in enumerate(scenes):
            ordered.append({"index": i, "narration": s_["narration"], "visual": s_["visual"], "caption": _caption_text(s_),
                            "kind": "image", "visual_source": "Visual explainer", "visual_file": "", "visual_url": "",
                            "duration_sec": 0, "keywords": autovideo.core_words(s_["narration"])[:8],
                            "plan": {**(s_.get("plan") or {}), "presenter": False}, "shots": []})
        info = tools_visual.add_to_footage(title, ordered, work_dir, is_short, progress_cb)
        for sc in ordered:
            _job_scene_done(work_dir, sc)
        return {"scenes": ordered, "script": script_text, "script_source": source,
                "script_words": len(script_text.split()), "visual_basic": info.get("basic", 0)}

    if gfx_amount != "none":  # (user, 2026-11-19) graphic scenes first, so they download no extra clips
        try:
            import tools_graphics as _tg3
            _tg3.plan_graphics(title, scenes, amount=gfx_amount)
        except Exception:  # noqa: BLE001
            pass

    def _collect(index: int, scene: dict) -> dict:
        visual_path, kind, visual_source = _scene_visual(
            title, scene, visuals, work_dir, index, used_urls, lock,
            pexels_key=pexels_key, pixabay_key=pixabay_key,
            vertical=is_short)
        try:  # rich footage: a clip for each new thing the scene talks about
            shots = autovideo_smart.collect_shots(title, scene, index, work_dir, visuals, pexels_key, pixabay_key,
                                                  is_short, used_urls, lock) if kind == "clip" and gfx_amount != "all" and not scene.get("graphic") else []
        except Exception:  # noqa: BLE001
            shots = []
        return {
            "index": index,
            "narration": scene["narration"],
            "visual": scene["visual"],
            "caption": _caption_text(scene),
            "kind": kind,
            "visual_source": visual_source,
            "visual_file": visual_path.name,
            "visual_url": visual_source if visual_source.startswith("http") else "",
            "duration_sec": 0,
            # Word suggestions (user, 2026-11-09): the scene's
            # main words, one by one, as clickable search chips
            # in the footage browser — each word searched on its
            # own gives the most results.
            "keywords": (list((scene.get("plan") or {}).get("queries") or [])
                         + autovideo.core_words(scene["narration"]))[:8],
            "plan": scene.get("plan") or {},
            "shots": shots,
            **({"graphic": scene["graphic"]} if scene.get("graphic") else {}),
            **({"tags": scene["tags"]} if scene.get("tags") else {}),
        }

    workers = max(2, min(4, os.cpu_count() or 4))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_collect, i, s): i
                   for i, s in enumerate(scenes)}
        done = 0
        for future in as_completed(futures):
            result = future.result()
            results[result["index"]] = result
            done += 1
            _job_scene_done(work_dir, result)
            if progress_cb:
                progress_cb(done, len(scenes),
                            f"Collecting footage — scene {done} of {len(scenes)}…")
    ordered = [results[i] for i in sorted(results)]
    if not ordered:
        raise RuntimeError("Footage collection produced no scenes.")
    try:  # motion graphics (Manim + Pymunk) for the scenes they explain best (2026-11-19)
        import tools_graphics
        if gfx_amount != "none" and tools_graphics.add_to_footage(title, ordered, work_dir, is_short, progress_cb, amount=gfx_amount):
            for sc in ordered:
                if sc.get("graphic"):
                    sc.setdefault("plan", {})["presenter"] = False
                    _job_scene_done(work_dir, sc)
    except Exception:  # noqa: BLE001 — footage only, as before
        pass
    return {
        "scenes": ordered,
        "script": script_text,
        "script_source": source,
        "script_words": len(script_text.split()),
    }


def prepare_audio(title: str, scenes: list[dict], voice: str,
                  work_dir: Path, freesound_key: str | None = None,
                  music: bool = True,
                  progress_cb=None, tts_provider: str = "edge",
                  tts_key: str | None = None) -> dict:
    """STEP 3 — Audio. Voices every scene (parallel), joins the
    voiceover into master-voice.mp3, detects the mood and lists
    the matching Freesound tracks, and fetches transition SFX.
    The DEFAULT mood track is also downloaded as mood-music.mp3
    so the render has music even if the user picks nothing.
    Returns {durations, voice_files, voice_engine, total_voice,
    mood, music, music_status, music_options, music_options_status,
    transition_sfx, sfx_status}."""
    # QUOTA PRE-CHECK (user, 2026-11-09): before voicing ANY
    # scene, ask the PROVIDER'S OWN API whether its free limit
    # covers the whole script — so the voice never stops mid-way.
    # Only providers with a quota API are checked (ElevenLabs);
    # for the others the check is skipped, not faked by counting.
    if tts_provider and tts_provider != "edge":
        quota = tts_module.check_quota(tts_provider, tts_key)
        if quota.get("quota_api") and quota.get("remaining_chars") is not None:
            script_chars = sum(len(s.get("narration", "")) for s in scenes)
            if quota["remaining_chars"] < script_chars:
                raise RuntimeError(
                    f"{tts_module.PROVIDERS[tts_provider]['label']} free limit is "
                    f"finished — {quota['remaining_chars']:,} characters left, but the "
                    f"script needs {script_chars:,}. The voice would stop mid-way. "
                    "Pick another voice or use the default.")
    import os
    from concurrent.futures import ThreadPoolExecutor, as_completed

    workers = max(2, min(4, os.cpu_count() or 4))
    results: dict[int, dict] = {}
    fallback_note = ""

    def _voice_keep(i, narration, *rest):
        """(user, 2026-11-20) an audio step that was stopped half-way (the app was closed) keeps the
        scenes it had already voiced: a retry voices only the missing ones. The notes are removed when
        the step finishes, so a later re-voice always makes new voices."""
        import hashlib
        note = work_dir / f"scene-{i:02d}.voice-done.json"
        key = hashlib.sha1(json.dumps([narration, voice, tts_provider or ""]).encode("utf-8")).hexdigest()
        try:
            d = json.loads(note.read_text(encoding="utf-8"))
            p = work_dir / d["file"]
            if d.get("key") == key and p.exists() and float(d.get("duration") or 0) > 0:
                return p, d.get("engine") or "kept", float(d["duration"]), False, ""
        except Exception:  # noqa: BLE001 — no note: voice it
            pass
        res = _voice_scene_with_fallback(i, narration, *rest)
        if res[0] is not None and res[2] > 0 and Path(res[0]).parent.resolve() == work_dir.resolve():
            try:
                note.write_text(json.dumps({"key": key, "file": Path(res[0]).name, "engine": res[1], "duration": res[2]}),
                                encoding="utf-8")
            except OSError:
                pass
        return res
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(_voice_keep, i,
                        s["narration"], voice, work_dir,
                        tts_provider, tts_key, i == 0, i == len(scenes) - 1): i
            for i, s in enumerate(scenes)
        }
        done = 0
        for future in as_completed(futures):
            voice_path, engine, duration, fell_back, err = future.result()
            idx = futures[future]
            results[idx] = {"voice_path": voice_path, "engine": engine,
                            "duration": duration}
            if fell_back and not fallback_note:
                fallback_note = (
                    f"{tts_module.PROVIDERS[tts_provider]['label']} failed "
                    f"({err}) — the default Edge voice (Aria) was used "
                    "instead, so the video still completed.")
            done += 1
            if progress_cb:
                progress_cb(done, len(scenes),
                            f"Voicing scene {done} of {len(scenes)}…")
    ordered = [results[i] for i in sorted(results)]
    if not ordered or any(r["voice_path"] is None for r in ordered):
        raise RuntimeError("Voiceover failed for a scene.")
    for note in work_dir.glob("scene-*.voice-done.json"):  # the step finished: no voice is kept for later
        note.unlink(missing_ok=True)
    voice_files = [r["voice_path"] for r in ordered]
    durations = [r["duration"] for r in ordered]
    total_voice = sum(durations)
    engine = ordered[0]["engine"]
    # Join the voiceover now (also gives the render its file).
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
        raise RuntimeError(f"Voiceover assembly failed: {proc.stderr[-1000:]}")
    script_text = "\n\n".join(s["narration"] for s in scenes)
    mood = _detect_mood(title, script_text)
    # Music + SFX fetch (user, 2026-11-09): this phase had NO
    # progress updates, so the UI sat at 90% with a stale
    # "Voicing scene X of Y…" while Freesound was slow — the
    # user waited 10 minutes thinking it was frozen. Report
    # each sub-step, and cap the whole phase at 150s so it can
    # never hang for 10 minutes again (a missing track is fine;
    # the video still renders).
    # FAST (user, 2026-11-18: "fetching background music hangs"): music,
    # music options and transition sounds are fetched at the same time with a
    # 40 s limit; earlier tracks / sounds are reused from disk and the app's
    # own music pack fills in at once.
    if progress_cb:
        progress_cb(len(scenes), len(scenes), "Fetching background music and sounds…")
    import autovideo_smart
    music_path, music_status, options, options_status, sfx_paths, sfx_status = autovideo_smart.fast_music_and_sfx(
        sys.modules[__name__], mood, freesound_key, work_dir, music, progress_cb, len(scenes))
    if not music:
        music_path, music_status, options, options_status = None, "off", [], "off"
    return {
        "durations": [round(d, 1) for d in durations],
        "voice_files": [p.name for p in voice_files],
        "voice_engine": engine,
        "voice_fallback": bool(fallback_note),
        "voice_fallback_note": fallback_note,
        "total_voice": round(total_voice, 1),
        "mood": mood,
        "music": music_path.name if music_path is not None else None,
        "music_status": music_status,
        "music_options": options,
        "music_options_status": options_status,
        "transition_sfx": len(sfx_paths),
        "sfx_status": sfx_status,
    }


def _to_vertical(final_path: Path, work_dir: Path) -> Path:
    """SHORTS (user, 2026-11-09): convert a finished 16:9
    final.mp4 to 9:16 (1080x1920) for a YouTube Short. The
    scale covers the frame and the crop takes the centre, so
    a landscape clip becomes a vertical one (sides cut) and a
    true vertical clip passes through untouched. The original
    is kept as final-landscape.mp4; the vertical file replaces
    final.mp4 so the download + upload serve the Short."""
    landscape = work_dir / "final-landscape.mp4"
    if landscape.exists():
        landscape.unlink()
    final_path.rename(landscape)
    cmd = ["ffmpeg", "-y", "-i", str(landscape),
           "-vf", ("scale=1080:1920:force_original_aspect_ratio=increase,"
                   "crop=1080:1920,format=yuv420p"),
           "-r", "30", "-c:v", "libx264", "-preset", "veryfast",
           "-c:a", "copy", str(final_path)]
    proc = subprocess.run(cmd, capture_output=True, text=True,
                          **video_module.no_window_kwargs())
    if proc.returncode != 0 or not final_path.exists():
        # Never lose the video over the conversion: restore it.
        landscape.rename(final_path)
        raise RuntimeError(
            f"Vertical conversion failed: {proc.stderr[-500:]}")
    return final_path


def _prerender_graphics(work_dir: Path, scenes: list[dict], durations: list[float], voice_files: list[Path],
                        vertical: bool, progress_cb=None) -> None:
    """Visual Explainer speed (user, 2026-11-19): the scene animations are drawn a few at a
    time BEFORE the scenes are joined (each one is reused by the render loop below)."""
    todo = [i for i, sc in enumerate(scenes) if sc.get("graphic") and (sc["graphic"] or {}).get("theme") == "visual"
            and sc.get("visual_file") == sc.get("graphic_file")]
    if len(todo) < 2:
        return
    import os
    from concurrent.futures import ThreadPoolExecutor
    import tools_graphics
    srts = {}
    for i in todo:  # word timings first (one at a time — speech recognition is heavy)
        try:
            srts[i] = _transcribe_scene_voice(voice_files[i], work_dir, i)
        except Exception:  # noqa: BLE001
            srts[i] = None
    done = [0]

    def one(i):
        last = i >= len(scenes) - 1
        try:
            tools_graphics.clip_for_scene(scenes[i], i, work_dir, durations[i] + (0 if last else _TRANSITION_SEC), srts.get(i), vertical)
        except Exception as exc:  # noqa: BLE001 — the render loop tries again
            print("animation failed for scene", i + 1, exc)
        done[0] += 1
        if progress_cb:
            progress_cb(done[0], len(todo), f"Animating scene {done[0]} of {len(todo)}…")
    with ThreadPoolExecutor(max_workers=max(1, min(3, (os.cpu_count() or 2) // 2))) as pool:
        list(pool.map(one, todo))


def render_video(work_dir: Path, scenes: list[dict],
                 durations: list[float], voice_files: list[Path],
                 music_path: Path | None, music_volume: float,
                 sfx_paths: list[Path], transitions: bool = True,
                 subtitles: bool = True,
                 progress_cb=None,
                 video_type: str = "long") -> dict:
    """STEP 4 — Render. Encodes every scene's segment from its
    chosen visual + voice length, then joins + muxes via
    join_and_mux. Returns {final_path, final_duration_sec,
    join, kinds}. SHORTS (user, 2026-11-09): video_type "short"
    renders every segment DIRECTLY in 1080x1920 (vertical
    subtitles, blurred-background footage) — the old flow rendered
    1280x720 and then scaled the whole video 2.67x to vertical,
    which magnified the captions to 64px and cut them off at
    both edges, and centre-cropped the footage. _to_vertical is
    no longer called."""
    total_voice = sum(durations)
    vertical = video_type == "short"
    segments: list[Path] = []
    kinds = {"clip": 0, "image": 0, "ai": 0, "card": 0}
    voice_files = list(voice_files)
    _remember_narrations(work_dir, scenes)
    _prerender_graphics(work_dir, scenes, durations, voice_files, vertical, progress_cb)
    for i, scene in enumerate(scenes):
        visual_path = work_dir / scene["visual_file"]
        if not visual_path.exists():
            raise RuntimeError(
                f"Scene {i + 1} footage missing: {scene['visual_file']}")
        voice_path = voice_files[i]
        caption = scene.get("caption") or _caption_text(scene)
        gfx_kind = None
        if scene.get("graphic") and scene.get("visual_file") == scene.get("graphic_file"):
            # a motion graphic: animated now, every element when its words are spoken
            try:
                import tools_graphics
                srt = _transcribe_scene_voice(voice_path, work_dir, i)
                last = i >= len(scenes) - 1
                g = tools_graphics.clip_for_scene(scene, i, work_dir, durations[i] + (0 if last else _TRANSITION_SEC), srt, vertical)
                if g is not None and g.exists():
                    visual_path, gfx_kind = g, "clip"
                    sfx = g.with_suffix(".sfx.json")
                    if sfx.exists():  # Visual Explainer: every motion's sound effect under this scene's voice
                        import tools_visual
                        tools_visual.mix_into_voice(voice_path, json.loads(sfx.read_text(encoding="utf-8")), durations[i], seed=i)
            except Exception:  # noqa: BLE001 — the still picture, as in the review
                pass
        if scene.get("shots") and scene.get("kind") == "clip" and not scene.get("studio") and not gfx_kind:
            # rich footage: the extra shots cut in, with smooth effects, when their words are spoken
            try:
                import autovideo_smart
                srt = _transcribe_scene_voice(voice_path, work_dir, i) if subtitles else None
                last = i >= len(scenes) - 1
                multi = autovideo_smart.compose_shots(work_dir, i, visual_path, scene,
                                                      durations[i] + (0 if last else _TRANSITION_SEC), srt, voice_path, vertical)
                if multi is not None:
                    visual_path = multi
            except Exception:  # noqa: BLE001 — the scene's one clip, as before
                pass
        if scene.get("tags") and not gfx_kind and scene.get("kind") == "clip" and not scene.get("studio"):
            # Documentary Explainer: the spoken number appears as a tag on the footage
            try:
                import tools_docu
                srt = _transcribe_scene_voice(voice_path, work_dir, i) if subtitles else None
                last = i >= len(scenes) - 1
                tagged = tools_docu.apply_tags(scene, visual_path, durations[i] + (0 if last else _TRANSITION_SEC), srt, work_dir, i, vertical)
                if tagged is not None:
                    visual_path = tagged
            except Exception:  # noqa: BLE001 — the footage without the tag
                pass
        dest = encode_scene_segment(
            i, visual_path, gfx_kind or scene["kind"], caption, durations[i],
            work_dir, voice_path, subtitles=subtitles,
            total_scenes=len(scenes), vertical=vertical)
        if dest is None:
            raise RuntimeError(f"Scene {i + 1} segment failed to encode.")
        segments.append(dest)
        kinds[gfx_kind or scene["kind"]] = kinds.get(gfx_kind or scene["kind"], 0) + 1
        if progress_cb:
            progress_cb(i + 1, len(scenes),
                        f"Rendering scene {i + 1} of {len(scenes)}…")
    final_path, final_duration, join_method = join_and_mux(
        work_dir, segments, voice_files, durations, total_voice,
        music_path, music_volume, sfx_paths, transitions,
        len(scenes), progress_cb=progress_cb, vertical=vertical)
    return {
        "final_path": final_path,
        "final_duration_sec": final_duration,
        "join": join_method,
        "kinds": kinds,
    }


def run_master(title: str, minutes: int, visuals: str, voice: str,
               work_dir: Path, expressive: bool = True,
               progress_cb=None, subtitles: bool = True,
               pexels_key: str | None = None,
               pixabay_key: str | None = None,
               freesound_key: str | None = None,
               music: bool = True,
               transitions: bool = True,
               script: str | None = None) -> dict:
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
    user has a Freesound key, a mood-matched royalty-free track
    plays low under the voiceover, and a different Freesound
    sound effect plays at each scene change. Music/SFX fetch
    never breaks a build (no key / no result -> skipped)."""
    import os
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    work_dir.mkdir(parents=True, exist_ok=True)
    scenes, source = generate_scenes(title, minutes, script=script)
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
                # Include which visual this scene got and from where,
                # so the progress timeline shows the stock-footage
                # source per scene (e.g. "clip from Pexels").
                src = ""
                if result is not None:
                    src = f" — scene {result['index'] + 1}: {result['kind']} from {result.get('visual_source', '?')}"
                progress_cb(done, len(scenes),
                            f"Building scene {done} of {len(scenes)}…{src}")
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
    # from the title + script, fetch a matching Freesound music
    # track and several distinct Freesound sound effects (user's
    # Freesound key — Pixabay's API has no audio endpoint).
    # No key / no result / any failure -> music and SFX are
    # skipped, the video still builds. Fetching happens here
    # (after the scenes) so it never slows the parallel scene
    # build.
    script_text = "\n\n".join(s["narration"] for s in scenes)
    mood = _detect_mood(title, script_text)
    music_path: Path | None = None
    music_status = "off"
    sfx_paths: list[Path] = []
    sfx_status = "off"
    if music:
        music_path, music_status = _fetch_mood_music(
            mood, freesound_key, work_dir)
    if transitions:
        sfx_paths, sfx_status = _fetch_transition_sfx(
            freesound_key, work_dir)
    # Join scene segments, then mux the joined voiceover
    # (shared join_and_mux — the step flow's render uses it too).
    voice_durs = [item["duration"] for item in ordered]
    final_path, final_duration, join_method = join_and_mux(
        work_dir, segments, voice_files, voice_durs, total_voice,
        music_path, _MUSIC_VOLUME, sfx_paths, transitions,
        len(scenes), progress_cb=progress_cb)
    return {
        "final_path": final_path,
        "script": script_text,
        "script_source": source,
        "script_words": len(script_text.split()),
        "voice_duration_sec": round(total_voice, 1),
        "final_duration_sec": final_duration,
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
