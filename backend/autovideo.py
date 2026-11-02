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
import re
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

WORDS_PER_MINUTE = 150
IMAGE_SEGMENT_SEC = 6.0
CLIP_SEGMENT_SEC = 15.0
MAX_VIDEO_BYTES = 80 * 1024 * 1024

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
    "how", "why", "what", "is", "are", "was", "were", "be", "by", "at",
    "from", "into", "about", "best", "top", "new", "amazing", "secret",
    "secrets", "guide", "explained", "everything", "you", "need", "know",
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


def target_words(minutes: int) -> int:
    return max(150, minutes * WORDS_PER_MINUTE)


def _clean_script(text: str) -> str:
    text = re.sub(r"#{1,6}\s*", "", text or "")
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def generate_script(title: str, minutes: int) -> tuple[str, str]:
    """Return (script, source). Source is pollinations, wikipedia,
    or template — recorded so the UI can say honestly where the
    script came from."""
    words = target_words(minutes)
    prompt = (
        f"Write a YouTube video script in English, in a natural spoken "
        f"style, about: {title}. Length: about {words} words. "
        f"Start with an engaging hook, then explain the topic in clear "
        f"sections, and end with a short conclusion. Write only the "
        f"spoken script, in paragraphs. Do not include stage directions, "
        f"timestamps, headings, or bracketed notes."
    )
    try:
        url = "https://text.pollinations.ai/" + urllib.parse.quote(prompt)
        raw = _http_get(url, timeout=180).decode("utf-8", "ignore")
        script = _clean_script(raw)
        if len(script.split()) >= words * 0.4:
            return script, "pollinations"
    except Exception:
        pass
    # Fallback 1: Wikipedia — factual, free, no key.
    try:
        search = _http_json(
            "https://en.wikipedia.org/w/api.php?action=query&format=json"
            "&list=search&srsearch=" + urllib.parse.quote(title) + "&srlimit=1",
            timeout=30,
        )
        results = (search.get("query") or {}).get("search") or []
        if results:
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
                return _clean_script(intro + extract + outro), "wikipedia"
    except Exception:
        pass
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
        })
    return items


def fetch_visuals(title: str, visuals: str) -> dict:
    """Search Commons for images and/or videos. Returns
    {"images": [...], "videos": [...]} with duplicates removed."""
    queries = [title] + keywords(title)
    images: list[dict] = []
    videos: list[dict] = []
    seen_urls: set[str] = set()

    def _add(target: list[dict], candidates: list[dict], cap: int) -> None:
        for item in candidates:
            if len(target) >= cap:
                return
            if item["url"] in seen_urls:
                continue
            seen_urls.add(item["url"])
            target.append(item)

    for query in queries:
        if visuals in ("images", "both") and len(images) < 20:
            try:
                _add(images, _commons_search(query, "bitmap", 20), 20)
            except Exception:
                pass
        if visuals in ("videos", "both") and len(videos) < 10:
            try:
                _add(videos, _commons_search(query, "video", 20), 10)
            except Exception:
                pass
        if len(images) >= 12 and len(videos) >= 5:
            break
    return {"images": images, "videos": videos}


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
            capture_output=True, text=True, timeout=30)
        return float(json.loads(proc.stdout or "{}")["format"]["duration"])
    except Exception:
        return None


def _segment_image(image: Path, dest: Path, duration: float) -> bool:
    cmd = ["ffmpeg", "-y", "-loop", "1", "-i", str(image),
           "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,"
                  "pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
           "-r", "30", "-t", str(duration), "-c:v", "libx264",
           "-pix_fmt", "yuv420p", str(dest)]
    return subprocess.run(cmd, capture_output=True, text=True).returncode == 0


def _segment_clip(clip: Path, dest: Path, duration: float) -> bool:
    cmd = ["ffmpeg", "-y", "-i", str(clip),
           "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,"
                  "pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
           "-r", "30", "-t", str(duration), "-an", "-c:v", "libx264",
           "-pix_fmt", "yuv420p", str(dest)]
    return subprocess.run(cmd, capture_output=True, text=True).returncode == 0


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
        if subprocess.run(cmd, capture_output=True, text=True).returncode == 0:
            segments.append(bg)
        else:
            raise RuntimeError("Could not build even a background video.")
    list_file = work_dir / "concat.txt"
    list_file.write_text(
        "".join(f"file '{seg.resolve()}'\n" for seg in segments), encoding="utf-8")
    video_only = work_dir / "video_only.mp4"
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
           "-vf", "scale=1280:720,format=yuv420p", "-r", "30",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", str(video_only)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not video_only.exists():
        raise RuntimeError(f"Video assembly failed: {proc.stderr[-1000:]}")
    final_path = work_dir / "final.mp4"
    cmd = ["ffmpeg", "-y", "-i", str(video_only), "-i", str(voice_path),
           "-t", str(voice_duration), "-c:v", "copy", "-c:a", "aac",
           "-shortest", str(final_path)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not final_path.exists():
        raise RuntimeError(f"Audio mux failed: {proc.stderr[-1000:]}")
    return final_path
