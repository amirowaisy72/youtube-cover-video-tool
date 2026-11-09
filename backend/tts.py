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


# ---------------------------------------------------------------------------
# Voice providers (user, 2026-11-09): the narration voice is no longer
# Edge-only. The user picks a provider in Step 1 (optional — no pick
# means the default Edge voice, Aria) and a variant, and can hear
# each variant before choosing. API keys are the user's own, stored
# in the browser (localStorage) like the other stock keys, never on
# the server.
#
# QUOTA CHECK — HONEST LIMIT (user, 2026-11-09): before voicing a
# script, the app must know from the PROVIDER'S OWN API whether the
# free limit can cover the whole script, so the voice never stops
# mid-way. Only ElevenLabs exposes a quota API (GET /v1/user/
# subscription -> character_count + character_limit). Google Cloud
# and Unreal Speech expose NO quota endpoint (usage is dashboard-
# only), so for them the app CANNOT check upfront — it instead
# catches their quota errors live during synthesis and falls back
# to the default voice with a clear message. The app NEVER
# estimates the limit by counting words itself.
# ---------------------------------------------------------------------------

# Google Chirp 3 HD voices (curated). Sample URLs are Google's own
# public demo files — hearing a variant costs nothing, no key.
_GOOGLE_CHIRP_VOICES = [
    ("en-US-Chirp3-HD-Achernar", "Chirp 3 HD — Female, Achernar"),
    ("en-US-Chirp3-HD-Aoede", "Chirp 3 HD — Female, Aoede"),
    ("en-US-Chirp3-HD-Autonoe", "Chirp 3 HD — Female, Autonoe"),
    ("en-US-Chirp3-HD-Callirrhoe", "Chirp 3 HD — Female, Callirrhoe"),
    ("en-US-Chirp3-HD-Despina", "Chirp 3 HD — Female, Despina"),
    ("en-US-Chirp3-HD-Leda", "Chirp 3 HD — Female, Leda"),
    ("en-US-Chirp3-HD-Achird", "Chirp 3 HD — Male, Achird"),
    ("en-US-Chirp3-HD-Algenib", "Chirp 3 HD — Male, Algenib"),
    ("en-US-Chirp3-HD-Charon", "Chirp 3 HD — Male, Charon"),
    ("en-US-Chirp3-HD-Schedar", "Chirp 3 HD — Male, Schedar"),
]

# Unreal Speech (Kokoro) voices (curated English ones).
_UNREAL_VOICES = [
    ("af_heart", "Kokoro — Female, Heart"),
    ("af_bella", "Kokoro — Female, Bella"),
    ("af_sarah", "Kokoro — Female, Sarah"),
    ("af_nicole", "Kokoro — Female, Nicole"),
    ("af_sky", "Kokoro — Female, Sky"),
    ("am_adam", "Kokoro — Male, Adam"),
    ("am_michael", "Kokoro — Male, Michael"),
    ("am_eric", "Kokoro — Male, Eric"),
    ("am_liam", "Kokoro — Male, Liam"),
    ("bf_emma", "Kokoro — Female, Emma (UK)"),
    ("bm_george", "Kokoro — Male, George (UK)"),
]

PROVIDERS = {
    "edge": {
        "label": "Default — Edge (free, no key)",
        "key_name": None,
        "key_url": None,
        "key_help": "No key needed. Free and unlimited.",
        "quota_api": False,
        "quota_note": "Edge TTS has no key and no quota — it just works.",
    },
    "google": {
        "label": "Google Cloud TTS — Chirp 3 HD",
        "key_name": "Google Cloud API key",
        "key_url": "https://console.cloud.google.com/apis/library/texttospeech.googleapis.com",
        "key_help": "Enable the Cloud Text-to-Speech API, then create an API key (Credentials). Free: 1M Chirp 3 HD chars/month.",
        "quota_api": False,
        "quota_note": "Google does not expose a quota API for an API key, so the remaining free limit cannot be checked upfront. The free tier is 1M Chirp 3 HD characters/month — far above one video.",
    },
    "unreal": {
        "label": "Unreal Speech (Kokoro)",
        "key_name": "Unreal Speech API key",
        "key_url": "https://unrealspeech.com",
        "key_help": "Sign up (no card), open the dashboard and copy your API key. Free: 250,000 chars/month.",
        "quota_api": False,
        "quota_note": "Unreal Speech does not expose a quota API — usage is dashboard-only. Free: 250,000 chars/month. Note: overage is billed automatically if a card is on file.",
    },
    "elevenlabs": {
        "label": "ElevenLabs",
        "key_name": "ElevenLabs API key",
        "key_url": "https://elevenlabs.io",
        "key_help": "Sign up, go to your Profile and copy the API key. Free: 10,000 chars/month (about 1 video).",
        "quota_api": True,
        "quota_note": "Quota is checked live from ElevenLabs' own API before voicing.",
    },
}


def google_sample_url(voice_id: str) -> str | None:
    """Public demo audio for a Chirp 3 HD voice (no key, no cost)."""
    name = voice_id.rsplit("-", 1)[-1].lower()
    if voice_id.startswith("en-US-Chirp3-HD-"):
        return (f"https://cloud.google.com/static/text-to-speech/docs/audio/"
                f"chirp3-hd-{name}.wav")
    return None


def list_provider_voices(provider: str, api_key: str | None = None) -> list[dict]:
    """Voice variants for a provider. Each item: {id, label, sample_url?}.
    ElevenLabs fetches live from its API (needs the key); the others
    are curated lists with Google's public sample files."""
    if provider == "edge":
        return [{"id": v, "label": l} for v, l in VOICES]
    if provider == "google":
        return [{"id": v, "label": l, "sample_url": google_sample_url(v)}
                for v, l in _GOOGLE_CHIRP_VOICES]
    if provider == "unreal":
        return [{"id": v, "label": l} for v, l in _UNREAL_VOICES]
    if provider == "elevenlabs":
        if not api_key:
            raise ValueError("ElevenLabs API key is needed to list voices.")
        import urllib.request
        req = urllib.request.Request(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": api_key})
        with urllib.request.urlopen(req, timeout=30) as resp:
            import json as _json
            data = _json.loads(resp.read().decode("utf-8"))
        out = []
        for v in data.get("voices", []):
            labels = v.get("labels") or {}
            gender = labels.get("gender", "")
            out.append({"id": v["voice_id"],
                        "label": f"{v.get('name', v['voice_id'])}"
                                 + (f" ({gender})" if gender else ""),
                        "sample_url": (v.get("preview_url") or None)})
        return out
    raise ValueError(f"Unknown voice provider: {provider}")


def check_quota(provider: str, api_key: str | None = None) -> dict:
    """Remaining free quota from the PROVIDER'S OWN API (user,
    2026-11-09). Returns {quota_api, remaining_chars, limit_chars,
    used_chars, note}. Only ElevenLabs exposes this; for Google
    and Unreal quota_api is False and the note explains why — the
    app never guesses the limit by counting words."""
    info = PROVIDERS.get(provider)
    if info is None:
        raise ValueError(f"Unknown voice provider: {provider}")
    if provider == "edge":
        return {"quota_api": False, "remaining_chars": None,
                "limit_chars": None, "used_chars": None,
                "note": info["quota_note"]}
    if provider == "elevenlabs":
        if not api_key:
            raise ValueError("ElevenLabs API key is needed to check quota.")
        import urllib.request
        req = urllib.request.Request(
            "https://api.elevenlabs.io/v1/user/subscription",
            headers={"xi-api-key": api_key})
        with urllib.request.urlopen(req, timeout=30) as resp:
            import json as _json
            data = _json.loads(resp.read().decode("utf-8"))
        used = int(data.get("character_count") or 0)
        limit = int(data.get("character_limit") or 0)
        return {"quota_api": True,
                "remaining_chars": max(limit - used, 0),
                "limit_chars": limit, "used_chars": used,
                "note": info["quota_note"]}
    return {"quota_api": False, "remaining_chars": None,
            "limit_chars": None, "used_chars": None,
            "note": info["quota_note"]}


def _synthesize_google(text: str, voice: str, api_key: str, dest: Path) -> None:
    """Google Cloud TTS (Chirp 3 HD). REST with an API key."""
    import json as _json
    import urllib.request
    lang = voice.split("-Chirp3-HD-")[0] if "-Chirp3-HD-" in voice else "en-US"
    body = _json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": lang, "name": voice},
        "audioConfig": {"audioEncoding": "MP3"},
    }).encode("utf-8")
    req = urllib.request.Request(
        f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}",
        data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = _json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Google Cloud TTS failed: {exc}") from exc
    import base64
    audio = data.get("audioContent")
    if not audio:
        err = data.get("error", {}).get("message", "no audio returned")
        raise RuntimeError(f"Google Cloud TTS failed: {err}")
    dest.write_bytes(base64.b64decode(audio))


def _synthesize_unreal(text: str, voice: str, api_key: str, dest: Path) -> None:
    """Unreal Speech (Kokoro) via /stream — returns the MP3 audio
    directly (up to 1,000 chars per call; scenes are chunked to
    ~900 chars, so this covers them). Two fixes (user, 2026-11-09):
    (1) the API rejected the default Python-urllib User-Agent with
    a 403 even for a valid key, so a browser User-Agent is sent;
    (2) /stream is the primary documented endpoint and needs no
    URL download step. Speed/Pitch are strings, exactly as the
    official code sample sends them."""
    import json as _json
    import urllib.request
    body = _json.dumps({
        "Text": text, "VoiceId": voice, "Bitrate": "192k",
        "Speed": "0", "Pitch": "1", "Codec": "libmp3lame",
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.v8.unrealspeech.com/stream",
        data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) "
                           "Chrome/120.0 Safari/537.36"),
        })
    try:
        with urllib.request.urlopen(req, timeout=120) as resp, dest.open("wb") as out:
            while True:
                chunk = resp.read(1024 * 256)
                if not chunk:
                    break
                out.write(chunk)
    except Exception as exc:
        raise RuntimeError(f"Unreal Speech failed: {exc}") from exc
    if dest.stat().st_size < 1000:
        raise RuntimeError("Unreal Speech returned an empty audio file.")


def _synthesize_elevenlabs(text: str, voice: str, api_key: str, dest: Path) -> None:
    """ElevenLabs TTS. Returns raw MP3 bytes."""
    import json as _json
    import urllib.request
    body = _json.dumps({
        "text": text, "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        data=body, headers={"Content-Type": "application/json",
                            "Accept": "audio/mpeg",
                            "xi-api-key": api_key})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp, dest.open("wb") as out:
            while True:
                chunk = resp.read(1024 * 256)
                if not chunk:
                    break
                out.write(chunk)
    except Exception as exc:
        raise RuntimeError(f"ElevenLabs failed: {exc}") from exc
    if dest.stat().st_size < 1000:
        raise RuntimeError("ElevenLabs returned an empty audio file.")


def synthesize_provider(text: str, provider: str, voice: str,
                        api_key: str | None, rate: str, out_dir: Path,
                        ) -> tuple[Path, str]:
    """Synthesize with the chosen provider. Returns (final MP3, engine).
    Raises RuntimeError with the provider's own error message when it
    fails (quota, bad key, network) — the caller reports it verbatim
    so the user knows exactly why, instead of a silent fallback."""
    if provider == "edge":
        return synthesize(text, voice, rate, out_dir)
    if provider in ("google", "unreal", "elevenlabs") and not api_key:
        raise ValueError(
            f"{PROVIDERS[provider]['label']} needs an API key. "
            "Add it in the Voice section (Step 1).")
    chunks = split_text(text)
    if not chunks:
        raise ValueError("Text is empty.")
    out_dir.mkdir(parents=True, exist_ok=True)
    tts_id = uuid.uuid4().hex[:12]
    work_dir = out_dir / tts_id
    work_dir.mkdir(parents=True, exist_ok=True)
    final_path = out_dir / f"{tts_id}.mp3"
    engine = {"google": "google-chirp3", "unreal": "unreal-kokoro",
              "elevenlabs": "elevenlabs"}[provider]
    try:
        parts = []
        for index, chunk in enumerate(chunks):
            part = work_dir / f"part-{index:03d}.mp3"
            if provider == "google":
                _synthesize_google(chunk, voice, api_key, part)
            elif provider == "unreal":
                _synthesize_unreal(chunk, voice, api_key, part)
            else:
                _synthesize_elevenlabs(chunk, voice, api_key, part)
            parts.append(part)
        _merge_mp3(parts, final_path)
    finally:
        for part in work_dir.iterdir():
            part.unlink(missing_ok=True)
        work_dir.rmdir()
    return final_path, engine
