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


async def _save_chunk(text: str, voice: str, rate: str, dest: Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(str(dest))


async def _synthesize_all(chunks: list[str], voice: str, rate: str, out_dir: Path) -> list[Path]:
    parts = []
    for index, chunk in enumerate(chunks):
        part = out_dir / f"part-{index:03d}.mp3"
        await _save_chunk(chunk, voice, rate, part)
        parts.append(part)
    return parts


def _merge_mp3(parts: list[Path], final_path: Path) -> None:
    if len(parts) == 1:
        parts[0].rename(final_path)
        return
    list_file = final_path.parent / "concat.txt"
    list_file.write_text(
        "".join(f"file '{part.name}'\n" for part in parts), encoding="utf-8"
    )
    proc = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", str(list_file), "-c", "copy", str(final_path)],
        capture_output=True, text=True,
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


def synthesize(text: str, voice: str, rate: str, out_dir: Path) -> tuple[Path, str]:
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
        parts = asyncio.run(_synthesize_all(chunks, voice, rate, work_dir))
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
