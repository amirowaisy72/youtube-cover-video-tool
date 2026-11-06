"""Free Text to Voice for YT Guru (Tool 2).

Totally free, nothing to buy, no API key, no signup.

Primary engine: Microsoft Edge's free voices through the
open-source `edge-tts` package (pip install edge-tts). Voices
are curated, not the full Edge list, so the user picks from
voices that are actually good for YouTube voiceovers:
English (US/UK, male/female) and Urdu (Pakistan, male/female).

Automatic fallback: if Edge's service cannot be reached
(network block, service down — verified in testing: the VM
cannot reach speech.platform.bing.com at all), the same text
is generated with Google's free `gtts` package instead, in
the same language. The fallback voice is Google's default
for that language, not the chosen male/female voice — the
API reports which engine was used, and the UI says so, so
the user is never misled about which voice they got.

Long scripts are split into sentence chunks (max ~900 chars
each) and merged with FFmpeg, which the tool already requires,
so a long voiceover does not fail on one huge request.
"""

from __future__ import annotations

import asyncio
import re
import subprocess
import uuid
from pathlib import Path

from video import no_window_kwargs

# (voice id, label) — label is what the user sees.
VOICES = [
    ("en-US-ChristopherNeural", "English (US) — Male, Christopher"),
    ("en-US-GuyNeural", "English (US) — Male, Guy"),
    ("en-US-AriaNeural", "English (US) — Female, Aria"),
    ("en-GB-RyanNeural", "English (UK) — Male, Ryan"),
    ("en-GB-SoniaNeural", "English (UK) — Female, Sonia"),
    ("ur-PK-AsadNeural", "Urdu (Pakistan) — Male, Asad"),
    ("ur-PK-AyeshaNeural", "Urdu (Pakistan) — Female, Ayesha"),
]

VOICE_IDS = {voice for voice, _ in VOICES}
MAX_TEXT_CHARS = 10000
MAX_CHUNK_CHARS = 900


def voice_label(voice_id: str) -> str:
    for voice, label in VOICES:
        if voice == voice_id:
            return label
    return voice_id


def split_text(text: str) -> list[str]:
    """Split into sentence chunks, each under MAX_CHUNK_CHARS.

    Sentences are kept whole where possible; a single very long
    sentence is hard-split so no chunk ever exceeds the limit.
    """
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= MAX_CHUNK_CHARS:
            current = f"{current} {sentence}".strip()
            continue
        if current:
            chunks.append(current)
        if len(sentence) <= MAX_CHUNK_CHARS:
            current = sentence
        else:
            for i in range(0, len(sentence), MAX_CHUNK_CHARS):
                chunks.append(sentence[i : i + MAX_CHUNK_CHARS])
            current = ""
    if current:
        chunks.append(current)
    return chunks


def _escape_xml(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _expressive_ssml(text: str, voice: str) -> str | None:
    """DISABLED 2026-11-03: SSML narration-professional made Aria
    3x slower (52 words: 51 sec SSML vs 16 sec plain) — that was
    the dragging, unnatural voice in the Great Wall test, and it
    also broke the minutes target (193 sec voiceover for a
    1-minute video). Plain voices are natural at normal speed;
    expressiveness now comes from the script's punctuation and
    varied sentences, not SSML. Kept as a no-op so callers do
    not need to change, and so this lesson is not reintroduced."""
    return None


async def _save_chunk(text: str, voice: str, rate: str, dest: Path,
                      expressive: bool = False) -> None:
    import edge_tts

    spoken = text
    if expressive:
        spoken = _expressive_ssml(text, voice) or text
    communicate = edge_tts.Communicate(spoken, voice, rate=rate)
    await communicate.save(str(dest))


async def _synthesize_all(chunks: list[str], voice: str, rate: str, out_dir: Path,
                          expressive: bool = False) -> list[Path]:
    parts = []
    for index, chunk in enumerate(chunks):
        part = out_dir / f"part-{index:03d}.mp3"
        await _save_chunk(chunk, voice, rate, part, expressive=expressive)
        parts.append(part)
    return parts


def _merge_mp3(parts: list[Path], final_path: Path) -> None:
    if len(parts) == 1:
        parts[0].rename(final_path)
        return
    # Absolute paths: the concat list lives in the parent dir while
    # the parts live in a work subdir, so bare filenames would not
    # resolve (this broke multi-chunk voiceovers — a short test
    # with one chunk never hit the merge path).
    list_file = final_path.parent / "concat.txt"
    list_file.write_text(
        "".join(f"file '{part.resolve()}'\n" for part in parts), encoding="utf-8"
    )
    proc = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", str(list_file), "-c", "copy", str(final_path)],
        capture_output=True, text=True, **no_window_kwargs(),
    )
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg merge failed: {proc.stderr[-1000:]}")


def _synthesize_gtts(chunks: list[str], voice: str, work_dir: Path) -> list[Path]:
    from gtts import gTTS

    lang = "ur" if voice.startswith("ur-") else "en"
    parts = []
    for index, chunk in enumerate(chunks):
        part = work_dir / f"gtts-{index:03d}.mp3"
        gTTS(chunk, lang=lang).save(str(part))
        parts.append(part)
    return parts


def _ffprobe_duration(path: Path) -> float | None:
    try:
        import json as _json
        proc = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "json", str(path)],
            capture_output=True, text=True, timeout=30,
            **no_window_kwargs())
        return float(_json.loads(proc.stdout or "{}")["format"]["duration"])
    except Exception:
        return None


def synthesize_paragraphs(paragraphs: list[str], voice: str, rate: str,
                          out_dir: Path, expressive: bool = False
                          ) -> tuple[Path, str, list[float], bool]:
    """One MP3 per paragraph, then merged, with each paragraph's
    duration. Paragraph MP3s are what let Tool 3 match visuals
    to the paragraph being spoken, instead of random visuals.
    Returns (final MP3, engine, durations, fallback_used)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    para_paths: list[Path] = []
    fallback_used = False
    engine = "edge-tts"
    for paragraph in paragraphs:
        if not paragraph.strip():
            continue
        para_path, para_engine = synthesize(
            paragraph, voice, rate, out_dir, expressive=expressive)
        para_paths.append(para_path)
        if para_engine != "edge-tts":
            fallback_used = True
            engine = para_engine
    if not para_paths:
        raise ValueError("No paragraphs to voice.")
    durations = [_ffprobe_duration(path) or 0.0 for path in para_paths]
    final_path = out_dir / f"{uuid.uuid4().hex[:12]}-full.mp3"
    _merge_mp3(para_paths, final_path)
    for path in para_paths:
        path.unlink(missing_ok=True)
    return final_path, engine, durations, fallback_used


def synthesize(text: str, voice: str, rate: str, out_dir: Path,
               expressive: bool = False) -> tuple[Path, str]:
    """Generate one MP3 from text. Returns (final MP3 path, engine).

    Engine is "edge-tts" normally, or "gtts-fallback" when Edge
    could not be reached and gTTS was used instead. Raises
    ImportError with a clear message when neither package is
    installed, and RuntimeError when both engines fail.
    """
    if voice not in VOICE_IDS:
        raise ValueError("Unknown voice. Pick one from the voice list.")
    chunks = split_text(text)
    if not chunks:
        raise ValueError("Text is empty.")
    out_dir.mkdir(parents=True, exist_ok=True)
    tts_id = uuid.uuid4().hex[:12]
    work_dir = out_dir / tts_id
    work_dir.mkdir(parents=True, exist_ok=True)
    final_path = out_dir / f"{tts_id}.mp3"
    edge_error: Exception | None = None
    try:
        try:
            import edge_tts  # noqa: F401
        except ImportError as exc:
            raise ImportError(
                "edge-tts is not installed. Install it with "
                "'pip install edge-tts' and try again."
            ) from exc
        parts = asyncio.run(_synthesize_all(chunks, voice, rate, work_dir,
                                            expressive=expressive))
        _merge_mp3(parts, final_path)
        engine = "edge-tts"
    except Exception as exc:  # noqa: BLE001
        edge_error = exc
        # Fallback: free Google TTS, same language. Rate is an
        # Edge-only setting, so it is ignored here.
        try:
            parts = _synthesize_gtts(chunks, voice, work_dir)
            _merge_mp3(parts, final_path)
            engine = "gtts-fallback"
        except Exception as gtts_exc:  # noqa: BLE001
            raise RuntimeError(
                f"Edge TTS failed ({str(edge_error)[-300:]}), and the "
                f"Google TTS fallback also failed ({str(gtts_exc)[-300:]}). "
                "Check your internet connection and try again."
            ) from gtts_exc
    finally:
        for part in work_dir.iterdir():
            part.unlink(missing_ok=True)
        work_dir.rmdir()
    return final_path, engine
