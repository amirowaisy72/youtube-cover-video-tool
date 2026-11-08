"""YT Guru Tool 3 — Auto Video from Title (completely free).

User gives only: a title + how many minutes they want.
The tool then does everything, with no payment, no API key,
no signup anywhere:

  1. Script — a unique spoken script about the title, sized
     to the requested minutes (~150 spoken words per minute).
     Primary: Pollinations' free text API (no key). Fallback:
     Wikipedia's free API for the topic, then a plain
     template script if both fail, so the job still completes.
  2. Voiceover — the existing free Text to Voice engine
     (edge-tts, with gTTS fallback).
  3. Visuals — Wikimedia Commons (free, no key, Creative
     Commons images and videos), searched by the title's
     keywords. User chooses images only, video clips only,
     or both. If nothing is found, a plain background is
     used so the video still completes with its voiceover.
  4. Assembly — FFmpeg stitches the visuals to exactly the
     voiceover's length, so the finished video is about the
     requested minutes (exact to the voiceover, which is
     why it is "about", not "exactly", that many minutes).

Everything is local except the free script/visuals services,
which need internet — the tool already needs internet for
YouTube downloads, so this adds no new requirement.
"""

from __future__ import annotations

import json
import math
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path
from video import no_window_kwargs

WORDS_PER_MINUTE = 150
IMAGE_SEGMENT_SEC = 6.0
CLIP_SEGMENT_SEC = 15.0
MAX_VIDEO_BYTES = 50 * 1024 * 1024

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
    "how", "why", "what", "is", "are", "was", "were", "be", "by", "at",
    "from", "into", "about", "best", "top", "new", "amazing", "secret",
    "secrets", "guide", "explained", "everything", "you", "need", "know",
}

# Filler words that say nothing about the topic itself. Removing
# them leaves the core phrase ("The Hidden History of the Great
# Wall of China" -> "Great Wall China"). Searching single filler
# words used to be the bug: "hidden" or "great" alone returns
# random patterns and walls of every kind, not the Great Wall.
FILLER_WORDS = {
    "hidden", "secret", "secrets", "amazing", "incredible", "shocking",
    "ultimate", "complete", "full", "explained", "guide", "story",
    "history", "mysterious", "untold", "real", "true", "surprising",
    "fascinating", "mind", "blowing", "things", "facts", "reasons",
}

HEADERS = {"User-Agent": "YT-Guru/1.0 (free local tool)"}


def _http_get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _http_json(url: str, timeout: int = 60) -> dict:
    try:
        return json.loads(_http_get(url, timeout=timeout) or b"{}")
    except Exception:
        return {}


def keywords(title: str) -> list[str]:
    words = re.findall(r"[A-Za-z0-9]+", title.lower())
    seen: list[str] = []
    for word in words:
        if word not in STOPWORDS and len(word) > 2 and word not in seen:
            seen.append(word)
    return seen[:4]


def core_words(title: str) -> list[str]:
    """Topic words only, in order, no filler. These are what
    visuals are searched and scored against — never single
    generic words on their own."""
    words = re.findall(r"[A-Za-z0-9]+", title.lower())
    seen: list[str] = []
    for word in words:
        if (word not in STOPWORDS and word not in FILLER_WORDS
                and len(word) > 2 and word not in seen):
            seen.append(word)
    return seen


def _norm_word(word: str) -> str:
    """Singularise for matching: 'pyramids' must match a file
    titled 'Pyramid of Giza'. Without this, exact-word scoring
    dropped every Pyramids clip (titles use the singular)."""
    word = word.lower()
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("s") and len(word) > 3 and not word.endswith("ss"):
        return word[:-1]
    return word


def _title_words(text: str) -> set[str]:
    return {_norm_word(w) for w in re.findall(r"[a-z0-9]+", (text or "").lower())}


def target_words(minutes: int) -> int:
    return max(150, minutes * WORDS_PER_MINUTE)


# Known section-heading starter words. Used by _is_heading_line
# and by the "Heading. Rest" strip in _strip_inline_heading
# (the "Opening hook." case) — a period prefix is only stripped
# when it starts with one of these, so "Dr. Smith..." is safe.
_HEADING_STARTERS = {
    "hook", "introduction", "intro", "conclusion", "outro",
    "section", "chapter", "part", "prologue", "epilogue",
    "beginning", "ending", "overview", "summary", "finale",
    "closing", "opening",
}


def _is_heading_line(line: str) -> bool:
    """True for a section-heading line. Pollinations writes
    headings in many shapes, and the voiceover must never read
    any of them aloud (the user heard "Hook, a searing dream in
    red" spoken in an Auto Video):
      - bare label: "Hook", "Old Beginnings", "The Evolution of Earth"
      - label with subtitle: "Hook, a searing dream in red"
      - "Section One – Where Life Could Spark" / "Chapter 2: ..."
      - label with a trailing period/colon: "Hook.", "Introduction:"
    A heading is a short line (1-10 words) with no sentence-
    ending punctuation (! or ?), that either is Title Case, or
    starts with a known heading word (Hook, Introduction,
    Section, ...), or matches the Section/Chapter/Part label
    pattern. Real narration sentences end with . ! ? or are
    longer or have lowercase words, so they are never flagged."""
    words = line.split()
    if not (1 <= len(words) <= 10):
        return False
    stripped = line.strip()
    if stripped.endswith(("!", "?")):
        return False
    # "Section One – Title" / "Chapter 2: Title" / "Part 3 - ..."
    if re.match(r"(?i)^(section|chapter|part)\s+\S+\s*[–—:\-]\s*.+$", stripped):
        return True
    # A trailing period is a label ("Hook.", "Introduction.")
    # only for very short lines; a real sentence that short is
    # almost never Title Case narration.
    if stripped.endswith(".") and len(words) > 3:
        return False
    if stripped.endswith(":"):
        return True
    small = {"a", "an", "the", "of", "in", "on", "and", "or", "to",
             "for", "with", "from", "by", "at"}
    heading_starters = _HEADING_STARTERS
    first = words[0].strip(".,;:!?\"'’()").lower()
    if first in heading_starters and not stripped.endswith("."):
        return True
    if first in heading_starters and len(words) <= 3:
        return True
    # Title Case: every word starts uppercase (small words and
    # digits may be lowercase). "Hook, a searing dream in red"
    # is NOT Title Case, so it is caught by the starter rule
    # above ("Hook"); this rule catches "Old Beginnings" etc.
    for word in words:
        core = word.strip(".,;:!?\"'’()")
        if not core or core[0].isdigit():
            continue
        if core.lower() in small:
            continue
        if not core[0].isupper():
            return False
    return True


def _strip_inline_heading(line: str) -> str:
    """Strip a leading "Heading: rest" / "Heading – rest" /
    "Heading — rest" / "Heading. rest" prefix, e.g. "Hook: Picture
    the Earth..." -> "Picture the Earth...". Only when the prefix
    is short and Title Case (or a known heading word), so a normal
    sentence that happens to contain a colon or dash is left
    alone. Also drops a trailing "Section N – Title" label
    that Pollinations appends to the end of a narration line.
    NOTE 2026-11-08: the ". " form matters — Pollinations often
    writes the hook as "Opening hook. Did you know..." (a period,
    not a colon), and the old colon/dash-only strip let the voice
    read "Opening hook" aloud. A period prefix is only stripped
    when it is a KNOWN heading word (Hook/Opening/Introduction/
    ...), so a real first sentence is never eaten."""
    # Trailing label: "...begins? Section One – Where Life Could Spark"
    line = re.sub(
        r"\s+(?i:section|chapter|part)\s+\S+\s*[–—:\-]\s*[^.!?\n]{1,80}$",
        "", line)
    match = re.match(r"^([^:–—\-]{1,60})\s*[:–—\-]\s+(.+)$", line)
    if match:
        prefix, rest = match.group(1).strip(), match.group(2).strip()
        if rest and rest[0].isupper() and _is_heading_line(prefix):
            return rest
        return line
    # "Heading. Rest" — period separator (the "Opening hook."
    # case). Only when the prefix STARTS with a KNOWN heading
    # word (Hook/Opening/Introduction/...), and only when the
    # rest is a real sentence (starts uppercase). A bare Title
    # Case check would eat "Dr. Smith..." ("Dr" is Title Case),
    # so the starter-word requirement is what keeps real
    # sentences safe.
    match = re.match(r"^([A-Z][A-Za-z'’\- ]{0,40})\.\s+(.+)$", line)
    if match:
        prefix, rest = match.group(1).strip(), match.group(2).strip()
        first_word = prefix.split()[0].strip(".,;:!?\"'’()").lower() \
            if prefix.split() else ""
        if rest and rest[0].isupper() and first_word in _HEADING_STARTERS:
            return rest
    return line


def _clean_script(text: str) -> str:
    text = re.sub(r"#{1,6}\s*", "", text or "")
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)
    # NEVER read links aloud: a script that contains a URL makes
    # the voice read "h t t p s colon slash slash..." — exactly
    # the complaint on the Great Wall test video. Strip every
    # URL, email, and citation marker before voiceover, and drop
    # whole Source/References lines, which are not spoken script.
    text = re.sub(r"https?://\S+|www\.\S+|\S+@\S+", "", text)
    text = re.sub(r"\[[0-9]+\]|\[citation needed\]", "", text, flags=re.IGNORECASE)
    lines = [line for line in text.splitlines()
             if not re.match(r"\s*(sources?|references?)\s*:", line, re.IGNORECASE)]
    text = "\n".join(lines)
    text = re.sub(r"\s*(Sources?|References?)\s*:.*$", "", text)
    # Section headings ("Hook", "Old Beginnings", "The Evolution
    # of Earth") are not spoken script — drop the bare line, or
    # the "Heading: " prefix when it leads a sentence, so the
    # voiceover never reads a heading aloud.
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped and _is_heading_line(stripped):
            continue
        lines.append(_strip_inline_heading(line) if stripped else line)
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def _generate_script_single(title: str, words: int) -> str:
    """One Pollinations call for the whole script. Returns the
    cleaned script, or "" on failure / too short. Prompt wording
    matters: the clause "Do not include stage directions..."
    makes Pollinations return HTTP 400 for this title
    (bisect-tested 2026-11-03: that clause alone fails, while
    the other clauses pass). So it is deliberately left out;
    the script is cleaned of headings/markdown in code instead
    (_clean_script)."""
    prompt = (
        f"Write a YouTube video script in English, in a warm, expressive, "
        f"storytelling spoken style, like a passionate narrator, about: "
        f"{title}. Length: about {words} words. Vary your sentence "
        f"lengths, use rhetorical questions and exclamations where "
        f"natural, and let the emotion of the story come through in "
        f"the words. Start with an engaging hook, then explain the "
        f"topic in clear sections, and end with a short conclusion. "
        f"Write only the spoken script, in paragraphs."
    )
    try:
        url = "https://text.pollinations.ai/" + urllib.parse.quote(prompt)
        raw = _http_get(url, timeout=180).decode("utf-8", "ignore")
        return _clean_script(raw)
    except Exception:
        return ""


def _trim_script(script: str, words: int) -> str:
    """Trim an overshooting script to the last sentence boundary
    at or below 115% of target, so the voiceover stays about
    the requested minutes. Pollinations often overshoots (269
    words for a 150-word request), which would make a 1-minute
    video nearly 2 minutes."""
    if len(script.split()) <= words * 1.15:
        return script
    sentences = re.split(r"(?<=[.!?])\s+", script)
    trimmed, count = [], 0
    for sentence in sentences:
        sentence_words = len(sentence.split())
        if count + sentence_words > words * 1.15 and trimmed:
            break
        trimmed.append(sentence)
        count += sentence_words
    return " ".join(trimmed) if trimmed else script


def _section_focuses(title: str, count: int) -> list[str]:
    """Section focuses for a long script. First try a short
    outline call (one LLM call, ~seconds); if it fails, fall
    back to generic focuses built from the title's core words.
    Always returns exactly `count` focuses — if the outline
    comes back short, it is padded with generic focuses, so a
    top-up round never runs out of focuses (an IndexError here
    used to crash the whole script build). The focuses only
    steer each section — the LLM still writes real, specific
    content for each one, so the result is never the generic
    template."""
    topic = " ".join(core_words(title)) or title
    base = [
        f"Introduction to {topic}",
        f"The story of {topic}",
        f"Key facts about {topic}",
        f"Why {topic} matters",
        f"Surprising details about {topic}",
        f"The future of {topic}",
    ]
    try:
        prompt = (
            f"List {count} short section headings for a YouTube video "
            f"script about: {title}. One heading per line, no numbers, "
            f"no extra text."
        )
        url = "https://text.pollinations.ai/" + urllib.parse.quote(prompt)
        raw = _http_get(url, timeout=60).decode("utf-8", "ignore")
        lines = []
        for ln in raw.splitlines():
            ln = re.sub(r"^\s*[\d\.\-\*\)]+\s*", "", ln).strip()
            ln = ln.strip("*# ").strip()
            if 2 <= len(ln) <= 80 and not ln.lower().startswith(
                    ("here", "sure", "note", "of course")):
                lines.append(ln)
        if len(lines) >= 3:
            # Pad with generic focuses if the outline came back
            # short of `count`.
            for b in base:
                if len(lines) >= count:
                    break
                if b not in lines:
                    lines.append(b)
            i = 0
            while len(lines) < count:
                lines.append(base[i % len(base)])
                i += 1
            return lines[:count]
    except Exception:
        pass
    focuses: list[str] = []
    while len(focuses) < count:
        focuses.extend(base)
    return focuses[:count]


def _generate_section(title: str, focus: str, words: int) -> str:
    """One section of the script (~words words). Three attempts:
    a section that comes back empty or tiny is retried, because
    one failed section must not shrink the whole video. A section
    under 150 words is treated as a failure (a real section is
    ~350 words) and retried. Returns the cleaned section, or ""
    if all attempts failed. A short pause between attempts keeps
    the free API from rate-limiting rapid retries."""
    prompt = (
        f"Write one section of a YouTube video script in English, in a warm, "
        f"expressive, storytelling spoken style, like a passionate narrator, "
        f"about: {title}. This section is about: {focus}. Length: about "
        f"{words} words. Write only the spoken narration for this section, "
        f"in paragraphs. Do not include any section heading, title, or "
        f"label — only the spoken words."
    )
    for attempt in range(3):
        try:
            url = "https://text.pollinations.ai/" + urllib.parse.quote(prompt)
            raw = _http_get(url, timeout=120).decode("utf-8", "ignore")
            script = _clean_script(raw)
            if len(script.split()) >= 150:
                return script
        except Exception:
            pass
        if attempt < 2:
            time.sleep(3)
    return ""


def _generate_script_sections(title: str, words: int) -> str:
    """Build a long script section by section. Pollinations caps
    one response at ~650 words (measured 2026-11-07: a 4500-word
    request returned 656), so a 30-minute (4500-word) script can
    never come from one call — and the old code then threw the
    good 656 words away (40% threshold) and fell back to the
    150-word generic template, which is why the user's 30-minute
    "Facts about Life at Mars" video got that template script.
    Sections are generated in parallel (4 workers) and joined,
    so the total reaches the target and the video is really the
    requested length. TOP-UP: Pollinations sometimes returns a
    short section or fails one, so after the first batch the
    word count is checked, and if it is under 70% of target,
    extra sections are generated in one more parallel batch —
    the video must not come out short just because a few calls
    were weak."""
    from concurrent.futures import ThreadPoolExecutor
    # Each Pollinations call returns ~400-500 words for a 500-word
    # ask (it caps one response at ~650). Fewer, longer sections
    # mean fewer slow network calls: a 30-minute script needs ~9
    # sections, not 13. One top-up round only — a second round
    # would make script generation alone take 4+ minutes.
    per_section = 500
    count = max(3, math.ceil(words / per_section))
    count = min(count, 12)
    section_words = max(250, math.ceil(words / count))
    # Get a few extra focuses up front, so a top-up round never
    # needs another outline call.
    focuses = _section_focuses(title, count + 6)

    def _batch(idxs: list[int]) -> list[str]:
        with ThreadPoolExecutor(max_workers=4) as pool:
            return list(pool.map(
                lambda i: _generate_section(title, focuses[i], section_words),
                idxs))

    kept = [s for s in _batch(list(range(count))) if s]
    total = sum(len(s.split()) for s in kept)
    # Top-up rounds (user, 2026-11-09 — CRITICAL): a long video
    # must come out the requested length, even if it takes longer.
    # The old code did ONE top-up round and then gave up, so a
    # 30-minute request fell back to the 153-word generic template
    # whenever several Pollinations calls failed. Now up to 3
    # top-up rounds keep adding sections until the script reaches
    # 75% of target (or the focuses run out). The user would
    # rather wait than get a 52-second video for a 30-minute ask.
    for _round in range(3):
        total = sum(len(s.split()) for s in kept)
        if total >= words * 0.75 or len(focuses) <= count:
            break
        extra_n = min(6, math.ceil((words - total) / per_section))
        extra_n = min(extra_n, len(focuses) - count)
        if extra_n <= 0:
            break
        extra = [s for s in _batch(
            list(range(count, count + extra_n))) if s]
        kept.extend(extra)
        count += extra_n
        time.sleep(2)
    return "\n\n".join(kept)


def _wikipedia_script(title: str) -> str:
    """Factual script from Wikipedia (free, no key). Tries the
    full title first, then the core phrase ("Facts about Life at
    Mars" -> "life mars" -> the "Life on Mars" article), because
    a clickbait title is rarely an article title. Returns "" if
    no usable extract was found."""
    queries = [title]
    core_phrase = " ".join(core_words(title))
    if core_phrase and core_phrase.lower() not in title.lower():
        queries.append(core_phrase)
    for query in queries:
        try:
            search = _http_json(
                "https://en.wikipedia.org/w/api.php?action=query&format=json"
                "&list=search&srsearch=" + urllib.parse.quote(query) + "&srlimit=1",
                timeout=30,
            )
            results = (search.get("query") or {}).get("search") or []
            if not results:
                continue
            page_title = results[0]["title"]
            summary = _http_json(
                "https://en.wikipedia.org/api/rest_v1/page/summary/"
                + urllib.parse.quote(page_title),
                timeout=30,
            )
            extract = (summary.get("extract") or "").strip()
            if len(extract.split()) >= 80:
                intro = (
                    f"Welcome back to the channel. In this video, we are "
                    f"going to talk about {title}. "
                )
                outro = (
                    f" So that is {title}, in a nutshell. If you found "
                    f"this helpful, like and subscribe for more videos "
                    f"like this one, and I will see you in the next one."
                )
                return _clean_script(intro + extract + outro)
        except Exception:
            continue
    return ""


def generate_script(title: str, minutes: int) -> tuple[str, str]:
    """Return (script, source). Source is pollinations,
    pollinations-sections, wikipedia, or template — recorded so
    the UI can say honestly where the script came from.

    Word-count manager (the efficiency rule): human speech is
    ~150 words/minute, so the target is minutes x 150. Short
    videos (<= 4 min, <= 600 words) come from one Pollinations
    call, which can fulfil that length. Long videos are built
    section by section (see _generate_script_sections), because
    one call caps at ~650 words and can never fill 30 minutes.
    The generic template is the last resort only, and only when
    every free source failed — it must never replace a real
    script just because one call came back short."""
    words = target_words(minutes)
    if words <= 600:
        script = _generate_script_single(title, words)
        if script and len(script.split()) >= max(120, words * 0.4):
            return _trim_script(script, words), "pollinations"
        # One call too short: top it up with sections, and keep
        # whichever is longer — never throw a real script away.
        sections = _generate_script_sections(title, words)
        if sections and len(sections.split()) > len(script.split()):
            return _trim_script(sections, words), "pollinations-sections"
        if script:
            return _trim_script(script, words), "pollinations"
    else:
        script = _generate_script_sections(title, words)
        if script and len(script.split()) >= words * 0.4:
            return _trim_script(script, words), "pollinations-sections"
        # Sections fell short: try one call as a base, keep the longer.
        single = _generate_script_single(title, words)
        if single and len(single.split()) > len(script.split()):
            return _trim_script(single, words), "pollinations"
        if script:
            return _trim_script(script, words), "pollinations-sections"
    # Fallback 1: Wikipedia — factual, free, no key.
    wiki = _wikipedia_script(title)
    if wiki:
        return wiki, "wikipedia"
    # Fallback 2: template — always works, but generic. Honest
    # labelling matters more than pretending this is unique.
    script = (
        f"Welcome back to the channel. In this video, we are going to "
        f"talk about {title}, and by the end of it, you will have a "
        f"clear, simple understanding of what it is, why it matters, "
        f"and what you should know about it. "
        f"Let us start with the basics. {title} is a topic that many "
        f"people hear about, but not everyone really understands. "
        f"The important thing is to look at it step by step, instead "
        f"of getting lost in the details. First, think about what it "
        f"means in everyday life. Then, think about how it works, and "
        f"why people care about it. And finally, think about what you "
        f"can take away from it. "
        f"That is the simple way to understand {title}. If you found "
        f"this video helpful, like and subscribe, and I will see you "
        f"in the next one."
    )
    return script, "template"


def _commons_search(query: str, filetype: str, limit: int = 20) -> list[dict]:
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"{query} filetype:{filetype}",
        "gsrnamespace": 6, "gsrlimit": limit,
        "prop": "imageinfo", "iiprop": "url|mime|size",
        "iiurlwidth": 1280,
    }
    data = _http_json(
        "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params),
        timeout=30,
    )
    items = []
    for page in (data.get("query", {}).get("pages", {}) or {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        # CRITICAL: for videos, thumburl is a JPG poster thumbnail,
        # not the video — using it downloaded posters as "clips"
        # (1-frame segments). Videos must use the original url;
        # images use the 1280px thumburl. Only webm/mp4 videos.
        if filetype == "video":
            if (info.get("mime") or "") not in ("video/webm", "video/mp4"):
                continue
            url = info.get("url")
        else:
            url = info.get("thumburl") or info.get("url")
        if not url:
            continue
        size = info.get("size") or 0
        if filetype == "video" and size > MAX_VIDEO_BYTES:
            continue
        items.append({
            "title": page.get("title", ""),
            "url": url,
            "mime": info.get("mime", ""),
            "size": size,
            # Poster thumbnail for videos (a JPG, not the video):
            # the scene-change picker shows this so it never has
            # to stream full clips just to preview them.
            "thumb": info.get("thumburl") or "",
        })
    return items


def _search_stock_videos(query: str, pexels_key: str | None,
                         pixabay_key: str | None) -> list[dict]:
    """Search Pexels and Pixabay for stock video clips (user's
    own free API keys — the Stock tool already uses them, and
    the keys are shared via localStorage so entering one in any
    tool connects it everywhere). Returns items in the same
    shape as Commons results (url/title/mime), so the scene
    picker can try them first. A bad key, a rate limit or a
    network error just returns fewer (or no) results — the
    caller falls back to Commons, never a failed job."""
    items: list[dict] = []
    if not query:
        return items
    try:
        import tools_stock
    except Exception:
        return items
    if pexels_key:
        try:
            data = tools_stock._search_pexels(query, 1, pexels_key)
            for r in (data.get("results") or [])[:5]:
                if r.get("video_url"):
                    # Pexels returns no descriptive title, so the
                    # query itself is the title: the clip was
                    # returned for this query, so it is on-topic
                    # by construction (and the scene picker's
                    # on-topic check passes).
                    items.append({
                        "url": r["video_url"], "title": query,
                        "mime": "video/mp4", "source": "pexels"})
        except Exception:
            pass
    if pixabay_key:
        try:
            data = tools_stock._search_pixabay(query, 1, pixabay_key)
            for r in (data.get("results") or [])[:5]:
                if r.get("video_url"):
                    items.append({
                        "url": r["video_url"],
                        "title": r.get("tags") or query,
                        "mime": "video/mp4", "source": "pixabay"})
        except Exception:
            pass
    return items


def fetch_visuals(title: str, visuals: str,
                  pexels_key: str | None = None,
                  pixabay_key: str | None = None) -> dict:
    """Search Commons for images and/or videos, phrase-first.

    Queries are ONLY phrases: the full title, then the core
    phrase ("Great Wall China"), then 2-3 word core combos.
    Single generic words are never searched — that was the
    bug that returned pattern images for "hidden" and "great".
    Every candidate is then scored by how many core words
    appear in its FILE TITLE, and only scored candidates are
    kept, best first. A file whose title says nothing about
    the topic cannot rank, however well its description matches.
    Returns {"images": [...], "videos": [...]}."""
    core = core_words(title)
    core_phrase = " ".join(core)
    queries: list[str] = []
    for query in [title, core_phrase]:
        if query and query not in queries:
            queries.append(query)
    if len(core) >= 3:
        for combo in (core[:3], core[-3:], core[:2]):
            query = " ".join(combo)
            if query not in queries:
                queries.append(query)
    if len(core) == 1:
        queries.append(core[0])
    images: list[dict] = []
    videos: list[dict] = []
    seen_urls: set[str] = set()

    # Stock footage first (when the user connected a Pexels /
    # Pixabay key): their clips are professional, cinematic and
    # higher quality than Commons, so they are tried before
    # Commons. One search per platform with the core phrase
    # (not per query — that would burn the free rate limit).
    # A bad key or a failed search just means no stock clips;
    # Commons below still fills the video.
    if visuals in ("videos", "both") and (pexels_key or pixabay_key):
        for item in _search_stock_videos(core_phrase, pexels_key, pixabay_key):
            if item["url"] in seen_urls:
                continue
            seen_urls.add(item["url"])
            videos.append(item)

    def _add(target: list[dict], candidates: list[dict], cap: int) -> None:
        scored = []
        norm_core = [_norm_word(w) for w in core]
        for item in candidates:
            title_words = _title_words(item["title"])
            score = sum(1 for word in norm_core if word in title_words)
            if core_phrase and core_phrase in item["title"].lower():
                score += 2
            if score < 1:
                continue
            scored.append((score, item))
        scored.sort(key=lambda pair: -pair[0])
        for _, item in scored:
            if len(target) >= cap:
                return
            if item["url"] in seen_urls:
                continue
            seen_urls.add(item["url"])
            target.append(item)

    for query in queries:
        if visuals in ("images", "both") and len(images) < 20:
            try:
                _add(images, _commons_search(query, "bitmap", 30), 20)
            except Exception:
                pass
        if visuals in ("videos", "both") and len(videos) < 20:
            try:
                _add(videos, _commons_search(query, "video", 30), 20)
            except Exception:
                pass
        if len(images) >= 12 and len(videos) >= 10:
            break
    # Fallback: if phrase searches still left us short, try single
    # core words ("pyramids" alone). Single words are banned as
    # the FIRST search because they return irrelevant results,
    # but as a fallback they beat a black video — and scoring
    # still ranks the best-matching files first.
    if len(images) < 12 or (visuals in ("videos", "both") and len(videos) < 5):
        for word in core:
            if visuals in ("images", "both") and len(images) < 20:
                try:
                    _add(images, _commons_search(word, "bitmap", 30), 20)
                except Exception:
                    pass
            if visuals in ("videos", "both") and len(videos) < 20:
                try:
                    _add(videos, _commons_search(word, "video", 30), 20)
                except Exception:
                    pass
            if len(images) >= 12 and len(videos) >= 10:
                break
    return {"images": images, "videos": videos}


def _valid_image(path: Path) -> bool:
    """True only for a complete, decodable image. Pollinations
    sometimes closes a connection early (urllib IncompleteRead),
    leaving a truncated file — that must be retried, never used,
    or the video would show a broken frame."""
    try:
        if not path.exists() or path.stat().st_size < 1000:
            return False
        from PIL import Image
        with Image.open(path) as image:
            image.load()
            return image.size[0] > 0 and image.size[1] > 0
    except Exception:
        return False


def _prompt_for_paragraph(title: str, paragraph: str) -> str:
    """The visual prompt is the paragraph's first sentence plus
    the title — not the whole paragraph. A long prompt gets
    truncated by the image model and drifts off-topic; one
    sentence keeps the picture about what is being said."""
    first = re.split(r"(?<=[.!?])\s+", (paragraph or "").strip())
    sentence = first[0] if first else ""
    if len(sentence) > 200:
        sentence = sentence[:200].rsplit(" ", 1)[0]
    return (f"Cinematic documentary photograph, {title}: {sentence}, "
            f"photorealistic real photograph, realistic lighting, "
            f"clear and easily understandable subject, detailed, "
            f"no text, no watermark, no abstract patterns")


def generate_ai_image(title: str, paragraph: str, dest: Path) -> bool:
    """Generate one topic image with Pollinations' free image
    API (no key). Tries 3 seeds: curl first (urllib truncated
    Pollinations responses in testing, curl completed them),
    then urllib as a fallback. Returns False only if every
    attempt produced an invalid image — the caller then uses
    a local title card, so the job never fails for visuals."""
    prompt = _prompt_for_paragraph(title, paragraph)
    for seed in (42, 7, 123):
        url = ("https://image.pollinations.ai/prompt/"
               + urllib.parse.quote(prompt)
               + f"?width=1280&height=720&model=flux&nologo=true&seed={seed}")
        try:
            proc = subprocess.run(
                ["curl", "-sL", "--max-time", "120", "-A", "YT-Guru/1.0",
                 url, "-o", str(dest)],
                capture_output=True, text=True, timeout=150, **no_window_kwargs())
            if proc.returncode == 0 and _valid_image(dest):
                return True
        except Exception:
            pass
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=120) as resp:
                dest.write_bytes(resp.read())
            if _valid_image(dest):
                return True
        except Exception:
            pass
        if dest.exists():
            dest.unlink(missing_ok=True)
    return False


def _title_card_image(title: str, paragraph: str, dest: Path) -> bool:
    """Guaranteed local visual: a dark card with the title and
    the paragraph's first sentence. No network, no model, so
    it can never fail — it is the last resort that guarantees
    every video completes with readable, on-topic visuals
    instead of a black screen."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import textwrap
        image = Image.new("RGB", (1280, 720), (14, 26, 46))
        draw = ImageDraw.Draw(image)
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            r"C:\Windows\Fonts\arialbd.ttf",
            r"C:\Windows\Fonts\arial.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        title_font = None
        body_font = None
        for font_path in font_paths:
            try:
                title_font = ImageFont.truetype(font_path, 64)
                body_font = ImageFont.truetype(font_path, 32)
                break
            except Exception:
                continue
        if title_font is None:
            title_font = ImageFont.load_default()
            body_font = ImageFont.load_default()
        y = 220
        for line in textwrap.wrap(title, width=28)[:3]:
            draw.text((640, y), line, fill=(255, 255, 255),
                      font=title_font, anchor="ma")
            y += 80
        first = re.split(r"(?<=[.!?])\s+", (paragraph or "").strip())
        sentence = first[0] if first else ""
        y += 30
        for line in textwrap.wrap(sentence, width=55)[:4]:
            draw.text((640, y), line, fill=(163, 214, 92),
                      font=body_font, anchor="ma")
            y += 42
        image.save(dest, "JPEG", quality=90)
        return _valid_image(dest)
    except Exception:
        return False


def generate_fallback_visuals(title: str, paragraphs: list[str],
                              work_dir: Path, count: int
                              ) -> list[tuple[Path, str]]:
    """One generated visual per paragraph, up to `count`. AI
    image first (topic-relevant photograph); title card if
    generation fails. The returned title for each visual IS
    its paragraph, so paragraph-matched assembly scores it
    as a perfect match for the moment it is spoken — the
    picture on screen is always about what is being said.
    Returns (path, paragraph, is_ai_image) triples."""
    visuals: list[tuple[Path, str, bool]] = []
    for index, paragraph in enumerate(paragraphs[:count]):
        if not paragraph.strip():
            continue
        dest = work_dir / f"ai-{index:02d}.jpg"
        if generate_ai_image(title, paragraph, dest):
            visuals.append((dest, paragraph, True))
        elif _title_card_image(title, paragraph, dest):
            visuals.append((dest, paragraph, False))
    return visuals


def split_paragraphs(script: str) -> list[str]:
    """Paragraphs from the script; if it is one long paragraph,
    group its sentences three at a time so visuals can still
    change with the narration. Safety net: any heading line
    that survived _clean_script is dropped here, and a paragraph
    that is only a heading is dropped entirely — it must never
    become a scene, or the voiceover would read it aloud."""
    paragraphs = [para.strip() for para in re.split(r"\n\s*\n", script) if para.strip()]
    cleaned: list[str] = []
    for para in paragraphs:
        lines = [ln for ln in para.splitlines()
                 if not (ln.strip() and _is_heading_line(ln.strip()))]
        text = "\n".join(lines).strip()
        if text:
            cleaned.append(text)
    paragraphs = cleaned
    if len(paragraphs) > 1:
        return paragraphs
    # One long paragraph: group its sentences three at a time.
    # Use the cleaned text (headings already dropped), not the
    # raw script, or a surviving heading would be spoken.
    text = " ".join(paragraphs)
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    grouped: list[str] = []
    for i in range(0, len(sentences), 3):
        grouped.append(" ".join(sentences[i:i + 3]).strip())
    return [group for group in grouped if group]


def _download(url: str, dest: Path, timeout: int = 120) -> bool:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp, dest.open("wb") as out:
            while True:
                chunk = resp.read(1024 * 256)
                if not chunk:
                    break
                out.write(chunk)
        return dest.stat().st_size > 1000
    except Exception:
        return False


def _ffprobe_duration(path: Path) -> float | None:
    try:
        proc = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "json", str(path)],
            capture_output=True, text=True, timeout=30, **no_window_kwargs())
        return float(json.loads(proc.stdout or "{}")["format"]["duration"])
    except Exception:
        return None


def _segment_image(image: Path, dest: Path, duration: float) -> bool:
    cmd = ["ffmpeg", "-y", "-loop", "1", "-i", str(image),
           "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,"
                  "pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
           "-r", "30", "-t", str(duration), "-c:v", "libx264",
           "-preset", "veryfast",
           "-pix_fmt", "yuv420p", str(dest)]
    return subprocess.run(cmd, capture_output=True, text=True, **no_window_kwargs()).returncode == 0


def _segment_clip(clip: Path, dest: Path, duration: float) -> bool:
    cmd = ["ffmpeg", "-y", "-i", str(clip),
           "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,"
                  "pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
           "-r", "30", "-t", str(duration), "-an", "-c:v", "libx264",
           "-preset", "veryfast",
           "-pix_fmt", "yuv420p", str(dest)]
    return subprocess.run(cmd, capture_output=True, text=True, **no_window_kwargs()).returncode == 0


def assemble(voice_path: Path, images: list[Path], clips: list[Path],
             work_dir: Path, voice_duration: float) -> Path:
    """Build the final video, about as long as the voiceover."""
    segments: list[Path] = []
    image_idx = 0
    clip_idx = 0
    total = 0.0
    seg_no = 0
    # Sequence: alternate clip / image when both exist, so the
    # video never sits on one still image for too long.
    while total < voice_duration:
        made = False
        if clips and (not images or seg_no % 2 == 0):
            clip = clips[clip_idx % len(clips)]
            clip_idx += 1
            clip_dur = _ffprobe_duration(clip) or CLIP_SEGMENT_SEC
            seg_dur = min(CLIP_SEGMENT_SEC, clip_dur)
            dest = work_dir / f"seg-{seg_no:03d}.mp4"
            if _segment_clip(clip, dest, seg_dur):
                segments.append(dest)
                total += seg_dur
                made = True
        if not made and images:
            image = images[image_idx % len(images)]
            image_idx += 1
            dest = work_dir / f"seg-{seg_no:03d}.mp4"
            if _segment_image(image, dest, IMAGE_SEGMENT_SEC):
                segments.append(dest)
                total += IMAGE_SEGMENT_SEC
                made = True
        seg_no += 1
        if not made:
            break
        if seg_no > 400:  # safety: ~40 minutes of segments max
            break
    if not segments:
        # No usable visuals at all: plain background, voiceover only.
        bg = work_dir / "seg-000.mp4"
        cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i",
               f"color=c=0x0e1a2e:s=1280x720:r=30:d={voice_duration}",
               "-c:v", "libx264", "-pix_fmt", "yuv420p", str(bg)]
        if subprocess.run(cmd, capture_output=True, text=True, **no_window_kwargs()).returncode == 0:
            segments.append(bg)
        else:
            raise RuntimeError("Could not build even a background video.")
    list_file = work_dir / "concat.txt"
    list_file.write_text(
        "".join(f"file '{seg.resolve()}'\n" for seg in segments), encoding="utf-8")
    video_only = work_dir / "video_only.mp4"
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
           "-vf", "scale=1280:720,format=yuv420p", "-r", "30",
           "-c:v", "libx264", "-preset", "veryfast",
           "-pix_fmt", "yuv420p", str(video_only)]
    proc = subprocess.run(cmd, capture_output=True, text=True, **no_window_kwargs())
    if proc.returncode != 0 or not video_only.exists():
        raise RuntimeError(f"Video assembly failed: {proc.stderr[-1000:]}")
    final_path = work_dir / "final.mp4"
    cmd = ["ffmpeg", "-y", "-i", str(video_only), "-i", str(voice_path),
           "-t", str(voice_duration), "-c:v", "copy", "-c:a", "aac",
           "-shortest", str(final_path)]
    proc = subprocess.run(cmd, capture_output=True, text=True, **no_window_kwargs())
    if proc.returncode != 0 or not final_path.exists():
        raise RuntimeError(f"Audio mux failed: {proc.stderr[-1000:]}")
    return final_path


def _score_visual(title: str, paragraph: str) -> int:
    """How well a visual's file title matches a paragraph:
    shared words, weighted toward the paragraph's own words."""
    title_words = _title_words(title)
    para_words = [_norm_word(w) for w in re.findall(r"[a-z0-9]+", paragraph.lower())
                  if w not in STOPWORDS and len(w) > 2]
    return sum(1 for word in set(para_words) if word in title_words)


def assemble_by_paragraphs(voice_path: Path,
                           paragraphs: list[tuple[str, float]],
                           images: list[tuple[Path, str]],
                           clips: list[tuple[Path, str]],
                           work_dir: Path, voice_duration: float
                           ) -> tuple[Path, int, int]:
    """Assemble with visuals matched to the paragraph being spoken.

    For each paragraph, visuals are picked by file-title overlap
    with that paragraph's words, so the picture on screen is
    about what is being said at that moment — not a random
    image from the whole topic. If visuals=both and any clip
    was downloaded, the first paragraph uses a clip, so "both"
    can never silently become images-only. Returns
    (final_path, distinct_images_used, distinct_clips_used)."""
    segments: list[Path] = []
    used_images: set[str] = set()
    used_clips: set[str] = set()
    seg_no = 0
    image_used_order: list[int] = []
    clip_used_order: list[int] = []

    def _best(pool: list[tuple[Path, str]], paragraph: str,
              used_order: list[int]) -> int | None:
        if not pool:
            return None
        best_idx, best_score = None, -1
        for idx, (_, title) in enumerate(pool):
            if idx in used_order:
                continue
            score = _score_visual(title, paragraph)
            if score > best_score:
                best_idx, best_score = idx, score
        if best_idx is None:
            # All used once: reuse the best match.
            used_order.clear()
            return _best(pool, paragraph, used_order)
        return best_idx

    for para_idx, (paragraph, para_duration) in enumerate(paragraphs):
        if para_duration <= 0:
            continue
        remaining = para_duration
        # First paragraph: force a clip when clips exist and the
        # user asked for both/video, so "both" is visible.
        force_clip = para_idx == 0 and bool(clips)
        while remaining > 0.5:
            if (force_clip or remaining >= CLIP_SEGMENT_SEC) and clips:
                idx = _best(clips, paragraph, clip_used_order)
                if idx is not None:
                    clip_path, clip_title = clips[idx]
                    clip_dur = _ffprobe_duration(clip_path) or CLIP_SEGMENT_SEC
                    seg_dur = min(CLIP_SEGMENT_SEC, clip_dur, remaining)
                    dest = work_dir / f"pseg-{seg_no:03d}.mp4"
                    if _segment_clip(clip_path, dest, seg_dur):
                        segments.append(dest)
                        used_clips.add(str(clip_path))
                        clip_used_order.append(idx)
                        remaining -= seg_dur
                        seg_no += 1
                        force_clip = False
                        continue
                    # This clip failed to encode: drop it and try
                    # the next clip, instead of silently falling
                    # back to images for the whole video.
                    clips.pop(idx)
                    continue
            if images:
                idx = _best(images, paragraph, image_used_order)
                if idx is not None:
                    image_path, _ = images[idx]
                    seg_dur = min(IMAGE_SEGMENT_SEC, remaining)
                    dest = work_dir / f"pseg-{seg_no:03d}.mp4"
                    if _segment_image(image_path, dest, seg_dur):
                        segments.append(dest)
                        used_images.add(str(image_path))
                        image_used_order.append(idx)
                        remaining -= seg_dur
                        seg_no += 1
                        force_clip = False
                        continue
            break
        if seg_no > 600:
            break
    if not segments:
        return assemble(voice_path, [p for p, _ in images],
                        [p for p, _ in clips], work_dir, voice_duration), 0, 0
    list_file = work_dir / "pconcat.txt"
    list_file.write_text(
        "".join(f"file '{seg.resolve()}'\n" for seg in segments), encoding="utf-8")
    video_only = work_dir / "pvideo_only.mp4"
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
           "-vf", "scale=1280:720,format=yuv420p", "-r", "30",
           "-c:v", "libx264", "-preset", "veryfast",
           "-pix_fmt", "yuv420p", str(video_only)]
    proc = subprocess.run(cmd, capture_output=True, text=True, **no_window_kwargs())
    if proc.returncode != 0 or not video_only.exists():
        raise RuntimeError(f"Video assembly failed: {proc.stderr[-1000:]}")
    final_path = work_dir / "pfinal.mp4"
    cmd = ["ffmpeg", "-y", "-i", str(video_only), "-i", str(voice_path),
           "-t", str(voice_duration), "-c:v", "copy", "-c:a", "aac",
           "-shortest", str(final_path)]
    proc = subprocess.run(cmd, capture_output=True, text=True, **no_window_kwargs())
    if proc.returncode != 0 or not final_path.exists():
        raise RuntimeError(f"Audio mux failed: {proc.stderr[-1000:]}")
    return final_path, len(used_images), len(used_clips)
