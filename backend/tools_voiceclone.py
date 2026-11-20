"""Voice Cloner — clone any voice from a 15-20 second sample,
then voice any script in that cloned voice.

Free tool: no license/credit calls, no API key. Engine:
Chatterbox Multilingual (Resemble AI, MIT license), which runs
locally on this computer. The first voiceover downloads the
model once (~3 GB, from Hugging Face); after that it works
offline. An NVIDIA GPU (CUDA) is used when present, otherwise
the CPU (works, but slower — roughly real-time or a bit slower).

Every Chatterbox output carries Resemble AI's inaudible Perth
watermark, so cloned audio stays identifiable as AI-made.

Endpoints (all under /api/voiceclone):
  GET    /status              -> engine installed? installing? device, languages
  POST   /install             -> pip install chatterbox-tts (background)
  GET    /voices              -> {voices: [{id, name, seconds, created_at}]}
  POST   /voices              multipart: file, name, consent -> saved voice
  GET    /voices/{id}/sample  -> the cleaned reference clip (WAV)
  DELETE /voices/{id}
  POST   /generate            {voice_id, text, language, exaggeration} -> {job_id}
  GET    /jobs/{job_id}       -> {status, progress, message, download_url}
  GET    /download/{job_id}   -> final MP3

Wire-up (in backend/main.py):
    import tools_voiceclone  # noqa: E402
    app.include_router(tools_voiceclone.router)
"""

from __future__ import annotations

import datetime
import importlib
import importlib.util
import json
import re
import subprocess
import sys
import os
import threading
import time
import uuid
import wave
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Same import rule as backend/main.py: allow `import video` when run
# as `python -m uvicorn backend.main:app` from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from video import no_window_kwargs  # noqa: E402

import licensing  # noqa: E402

# Client version sent with license calls. The server only uses it
# informationally (MIN_CLIENT_VERSION is not enforced) — keep in
# sync with main.py CLIENT_VERSION; the release workflow bumps
# both. A local copy is needed because main.py imports this
# module (importing main back would be circular).
_CLIENT_VERSION = "1.0.4"


def _license_error_to_http(exc: licensing.LicenseError) -> HTTPException:
    """Map a license error to the HTTP status the server reported
    (401 bad key, 402 no credits / not activated, 403 device limit)."""
    msg = str(exc)
    code = 402
    for prefix, status in (("401:", 401), ("402:", 402), ("403:", 403)):
        if msg.startswith(prefix):
            code = status
            msg = msg[len(prefix):].strip()
            break
    return HTTPException(code, msg or "License check failed.")

router = APIRouter(prefix="/api/voiceclone")

BASE_DIR = Path(__file__).resolve().parent.parent
VOICES_DIR = BASE_DIR / "voice_clones"
OUT_DIR = VOICES_DIR / "outputs"
VOICES_DIR.mkdir(exist_ok=True)
OUT_DIR.mkdir(exist_ok=True)

MIN_SECONDS = 5.0  # shorter than this cannot be cloned well
MAX_SECONDS = 30.0  # longer uploads are trimmed to 30 sec
MAX_TEXT_CHARS = 10000
MAX_CHUNK_CHARS = 250  # Chatterbox is most stable on short chunks
MAX_NAME_CHARS = 40

LANGUAGES = [
    ("en", "English"),
    ("hi", "Hindi"),
    ("ar", "Arabic"),
    ("tr", "Turkish"),
    ("fr", "French"),
    ("de", "German"),
    ("es", "Spanish"),
    ("it", "Italian"),
    ("pt", "Portuguese"),
    ("ru", "Russian"),
    ("zh", "Chinese"),
    ("ja", "Japanese"),
    ("ko", "Korean"),
    ("ms", "Malay"),
    ("nl", "Dutch"),
    ("pl", "Polish"),
    ("sv", "Swedish"),
    ("no", "Norwegian"),
    ("da", "Danish"),
    ("fi", "Finnish"),
    ("el", "Greek"),
    ("he", "Hebrew"),
    ("sw", "Swahili"),
]
LANGUAGE_IDS = {code for code, _ in LANGUAGES}

_ID_RE = re.compile(r"^[0-9a-f]{12}$")

_model = None
_model_lock = threading.Lock()
_gen_lock = threading.Lock()  # one voiceover at a time (RAM/GPU)
_install = {"running": False, "error": "", "done": False, "log": [], "started_at": 0.0}


# ------------------------------------------------------------ helpers
def _check_id(value: str, what: str = "Item") -> str:
    if not _ID_RE.match(value or ""):
        raise HTTPException(404, f"{what} not found.")
    return value


def _now() -> str:
    return datetime.datetime.now().isoformat(timespec="seconds")


def _engine_installed() -> bool:
    """True when the voice engine really imports — not just present
    on disk. In the frozen .exe (1.0.5+) the engine is bundled, so
    this is True there; on an older .exe, or a machine where the
    pip install never ran, it is False. A bare find_spec is not
    enough: the package can exist while torch (its core) is
    missing, and /install must not report installed then."""
    importlib.invalidate_caches()
    try:
        import chatterbox.mtl_tts  # noqa: F401
        import torch  # noqa: F401
        import perth  # noqa: F401
    except Exception:  # noqa: BLE001
        return False
    return True


def _device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
    except Exception:  # noqa: BLE001
        pass
    return "cpu"


def _wav_seconds(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as w:
            return w.getnframes() / float(w.getframerate() or 1)
    except Exception:  # noqa: BLE001
        return 0.0


def _voice_meta_path(voice_id: str) -> Path:
    return VOICES_DIR / f"{voice_id}.json"


def _voice_wav_path(voice_id: str) -> Path:
    return VOICES_DIR / f"{voice_id}.wav"


def _read_voice(voice_id: str) -> dict | None:
    meta = _voice_meta_path(voice_id)
    if not meta.exists() or not _voice_wav_path(voice_id).exists():
        return None
    try:
        return json.loads(meta.read_text(encoding="utf-8"))
    except ValueError:
        return None


def _job_path(job_id: str) -> Path:
    return OUT_DIR / f"{job_id}.json"


def _read_job(job_id: str) -> dict:
    # Retry: a poll can land while the worker is rewriting the file.
    for _ in range(5):
        job = _read_job_once(job_id)
        if job.get("status") != "unknown":
            return job
        time.sleep(0.1)
    return job


def _read_job_once(job_id: str) -> dict:
    path = _job_path(job_id)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            pass
    return {"id": job_id, "status": "unknown"}


def _write_job(job: dict) -> None:
    # Atomic write (temp file + replace): progress is now written every
    # second, and a poll reading a half-written file got "Job not found".
    path = _job_path(job["id"])
    tmp = path.with_name(f"{job['id']}.{threading.get_ident()}.tmp")
    tmp.write_text(json.dumps(job, indent=2), encoding="utf-8")
    for _ in range(20):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:  # Windows: file briefly open by a reader
            time.sleep(0.05)
    tmp.unlink(missing_ok=True)


def _split_text(text: str) -> list[str]:
    """Sentence chunks under MAX_CHUNK_CHARS. Also splits on the
    Urdu/Hindi full stops (۔ and ।). A very long sentence is split
    at commas, then at word boundaries, never mid-word."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?۔।؟])\s+", text)
    pieces: list[str] = []
    for sentence in sentences:
        if len(sentence) <= MAX_CHUNK_CHARS:
            pieces.append(sentence)
            continue
        current = ""
        for word in re.split(r"(?<=,)\s+|\s+", sentence):
            if len(current) + len(word) + 1 > MAX_CHUNK_CHARS and current:
                pieces.append(current)
                current = word
            else:
                current = f"{current} {word}".strip()
        if current:
            pieces.append(current)
    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if len(current) + len(piece) + 1 <= MAX_CHUNK_CHARS:
            current = f"{current} {piece}".strip()
        else:
            if current:
                chunks.append(current)
            current = piece
    if current:
        chunks.append(current)
    return chunks


# Model download / cache helpers (user, 2026-11-16): the first
# voiceover downloads ~3.2 GB and the progress only showed in the
# terminal. The page now shows GB done + speed (read from the
# Hugging Face cache folder while it fills), and the "downloads
# 3 GB" note only appears when the model is NOT downloaded yet.
HF_REPO_DIR_NAME = "models--ResembleAI--chatterbox"
MODEL_TOTAL_BYTES = int(3.21 * 1024**3)  # size of the first download


def _hf_repo_dir() -> Path | None:
    try:
        from huggingface_hub import constants

        return Path(constants.HF_HUB_CACHE) / HF_REPO_DIR_NAME
    except Exception:  # noqa: BLE001
        return None


def _cache_bytes() -> tuple[int, bool]:
    """(bytes of the model on disk, a download still in progress?)"""
    repo = _hf_repo_dir()
    if repo is None or not (repo / "blobs").is_dir():
        return 0, False
    total, partial = 0, False
    for blob in (repo / "blobs").iterdir():
        try:
            total += blob.stat().st_size
        except OSError:
            continue
        if blob.name.endswith(".incomplete"):
            partial = True
    return total, partial


def _model_cached() -> bool:
    size, partial = _cache_bytes()
    return not partial and size >= MODEL_TOTAL_BYTES * 0.9


def _fmt_secs(seconds: float) -> str:
    seconds = max(0, int(seconds))
    return f"{seconds // 60}:{seconds % 60:02d}"


# Live sampling progress (user, 2026-11-16): the bar used to move
# only per script part, so a 1-part script sat at 5% for minutes.
# Chatterbox samples with `for i in tqdm(range(N), desc="Sampling")`;
# that tqdm is wrapped so every step calls _step_cb. Best-effort:
# if a future chatterbox changes this, progress falls back to parts.
_step_cb = None


def _patch_sampling_progress() -> None:
    try:
        import chatterbox.models.t3.t3 as t3_module
    except Exception:  # noqa: BLE001
        return
    original = getattr(t3_module, "tqdm", None)
    if original is None or getattr(original, "_ytguru_wrapped", False):
        return

    def tracked(*args, **kwargs):
        for step, item in enumerate(original(*args, **kwargs)):
            callback = _step_cb
            if callback is not None:
                try:
                    callback(step)
                except Exception:  # noqa: BLE001
                    pass
            yield item

    tracked._ytguru_wrapped = True
    t3_module.tqdm = tracked


def _get_model():
    """Load Chatterbox Multilingual once and keep it in memory.
    The first call downloads the model from Hugging Face."""
    global _model
    with _model_lock:
        if _model is None:
            # Chatterbox watermarks every output with Resemble's Perth
            # watermarker. On some setups (e.g. newer Python) perth's
            # implicit watermarker fails to import and is None, so the
            # model crashes with "'NoneType' object is not callable".
            # Fall back to perth's no-op watermarker so voiceovers work.
            import perth

            if getattr(perth, "PerthImplicitWatermarker", None) is None:

                class _NoWatermark:
                    def __init__(self, *args, **kwargs):
                        pass

                    def apply_watermark(self, wav, *args, **kwargs):
                        return wav

                    def get_watermark(self, *args, **kwargs):
                        return 0.0

                perth.PerthImplicitWatermarker = (
                    getattr(perth, "DummyWatermarker", None) or _NoWatermark
                )
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS

            device = _device()
            try:
                _model = ChatterboxMultilingualTTS.from_pretrained(
                    device=device, t3_model="v3"
                )
            except TypeError:
                # Older chatterbox-tts without the v3 checkpoint option.
                _model = ChatterboxMultilingualTTS.from_pretrained(device=device)
        return _model


def _write_wav(path: Path, samples, sample_rate: int) -> None:
    import numpy as np

    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(sample_rate))
        w.writeframes(pcm.tobytes())


# ------------------------------------------------------------- status
@router.get("/status")
def status() -> dict:
    installed = _engine_installed()
    return {
        "installed": installed,
        "installing": _install["running"],
        "install_error": _install["error"],
        "install_log": _install["log"][-6:],
        "install_elapsed": (
            int(time.time() - _install["started_at"]) if _install["running"] else 0
        ),
        "frozen": bool(getattr(sys, "frozen", False)),
        "device": _device() if installed else None,
        "model_loaded": _model is not None,
        "model_cached": _model_cached() if installed else False,
        "languages": [{"id": c, "label": l} for c, l in LANGUAGES],
        "min_seconds": MIN_SECONDS,
        "max_seconds": MAX_SECONDS,
        "max_text_chars": MAX_TEXT_CHARS,
    }


def _run_install() -> None:
    """pip install with live output: every pip line goes into
    _install["log"], so the page shows what is happening (which
    package is downloading, its size) instead of a silent wait."""
    try:
        proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--progress-bar",
                "off",
                "chatterbox-tts",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            env={**os.environ, "PYTHONUNBUFFERED": "1"},
            **no_window_kwargs(),
        )
        for line in proc.stdout:
            line = line.strip()
            if line:
                _install["log"].append(line[-200:])
                del _install["log"][:-50]
        if proc.wait() != 0:
            _install["error"] = (
                "Could not install the voice engine automatically. "
                "Check your internet connection (Python 3.10-3.12 is needed). "
                f"Details: {' | '.join(_install['log'][-4:])[-600:]}"
            )
        else:
            _install["done"] = True
    except Exception as exc:  # noqa: BLE001
        _install["error"] = f"Install failed: {str(exc)[-600:]}"
    finally:
        _install["running"] = False


@router.post("/install")
def install_engine() -> dict:
    if _engine_installed():
        return {"started": False, "installed": True}
    if getattr(sys, "frozen", False):
        raise HTTPException(
            400,
            "The voice engine is not included in this installed version yet. "
            "Please update YT Guru to a version that includes Voice Cloner.",
        )
    if not _install["running"]:
        _install.update(
            running=True, error="", done=False, log=[], started_at=time.time()
        )
        threading.Thread(target=_run_install, daemon=True).start()
    return {"started": True, "installed": False}


# ------------------------------------------------------------- voices
@router.get("/voices")
def list_voices() -> dict:
    voices = []
    for meta in VOICES_DIR.glob("*.json"):
        voice = _read_voice(meta.stem)
        if voice:
            voices.append(voice)
    voices.sort(key=lambda v: v.get("created_at", ""), reverse=True)
    return {"voices": voices}


@router.post("/voices")
async def create_voice(
    file: UploadFile = File(...),
    name: str = Form(...),
    consent: str = Form(""),
) -> dict:
    if consent.strip().lower() not in {"true", "1", "yes", "on"}:
        raise HTTPException(
            400, "Please confirm you have permission to clone this voice."
        )
    clean_name = re.sub(r"\s+", " ", name).strip()[:MAX_NAME_CHARS]
    if not clean_name:
        raise HTTPException(400, "Give this voice a name.")
    voice_id = uuid.uuid4().hex[:12]
    suffix = Path(file.filename or "").suffix.lower()[:8] or ".bin"
    raw_path = VOICES_DIR / f"{voice_id}-upload{suffix}"
    wav_path = _voice_wav_path(voice_id)
    try:
        with raw_path.open("wb") as out:
            while True:
                block = await file.read(1024 * 1024)
                if not block:
                    break
                out.write(block)
                if out.tell() > 100 * 1024 * 1024:
                    raise HTTPException(400, "File is too big (max 100 MB).")
        # Clean reference clip: mono 24 kHz WAV, leading silence
        # removed, loudness normalised, max 30 sec. Works for any
        # audio or video file FFmpeg can read (mp3, m4a, wav, mp4…).
        proc = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(raw_path),
                "-vn",
                "-af",
                "silenceremove=start_periods=1:start_threshold=-45dB,"
                "loudnorm=I=-18:TP=-2",
                "-t",
                str(int(MAX_SECONDS)),
                "-ac",
                "1",
                "-ar",
                "24000",
                "-c:a",
                "pcm_s16le",
                str(wav_path),
            ],
            capture_output=True,
            text=True,
            timeout=180,
            **no_window_kwargs(),
        )
        if proc.returncode != 0 or not wav_path.exists():
            raise HTTPException(
                400,
                "Could not read this file. Upload an audio file "
                "(MP3, WAV, M4A…) or a video with clear speech.",
            )
        seconds = _wav_seconds(wav_path)
        if seconds < MIN_SECONDS:
            wav_path.unlink(missing_ok=True)
            raise HTTPException(
                400,
                f"Sample is too short ({seconds:.1f} sec). "
                "Upload 15-20 seconds of clear speech.",
            )
    finally:
        raw_path.unlink(missing_ok=True)
    voice = {
        "id": voice_id,
        "name": clean_name,
        "seconds": round(seconds, 1),
        "created_at": _now(),
    }
    _voice_meta_path(voice_id).write_text(json.dumps(voice, indent=2), encoding="utf-8")
    return voice


@router.get("/voices/{voice_id}/sample")
def voice_sample(voice_id: str) -> FileResponse:
    _check_id(voice_id, "Voice")
    if not _read_voice(voice_id):
        raise HTTPException(404, "Voice not found.")
    return FileResponse(
        _voice_wav_path(voice_id),
        media_type="audio/wav",
        filename=f"voice-{voice_id}.wav",
    )


@router.delete("/voices/{voice_id}")
def delete_voice(voice_id: str) -> dict:
    _check_id(voice_id, "Voice")
    _voice_wav_path(voice_id).unlink(missing_ok=True)
    _voice_meta_path(voice_id).unlink(missing_ok=True)
    return {"deleted": voice_id}


# ----------------------------------------------------------- generate
class GenerateRequest(BaseModel):
    voice_id: str
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_CHARS)
    language: str = "en"
    exaggeration: float = Field(0.5, ge=0.25, le=1.5)


def _run_generate(
    job_id: str, voice_id: str, text: str, language: str, exaggeration: float,
    job_token: str | None = None,
) -> None:
    job = _read_job(job_id)
    voice_name = (_read_voice(voice_id) or {}).get("name", voice_id)
    wav_out = OUT_DIR / f"{job_id}.wav"
    mp3_out = OUT_DIR / f"{job_id}.mp3"
    try:
        import numpy as np

        chunks = _split_text(text)
        if not chunks:
            raise ValueError("Script is empty.")
        watch_stop = threading.Event()
        if _model is None:
            cached = _model_cached()
            job.update(
                status="loading",
                progress=0,
                message=(
                    "Loading the voice model… (about a minute)"
                    if cached
                    else "Downloading the voice model (~3.2 GB, first time "
                    "only) — please keep the tool open."
                ),
            )
            _write_job(job)
            if not cached:

                def watch_download() -> None:
                    last_time, last_size = time.time(), _cache_bytes()[0]
                    while not watch_stop.wait(1.5):
                        size, partial = _cache_bytes()
                        now = time.time()
                        speed = max(
                            0.0, (size - last_size) / max(now - last_time, 0.001)
                        )
                        last_time, last_size = now, size
                        if partial or size < MODEL_TOTAL_BYTES * 0.9:
                            job.update(
                                progress=min(99, int(size / MODEL_TOTAL_BYTES * 100)),
                                message=(
                                    f"Downloading the voice model… "
                                    f"{size / 1024 ** 3:.2f} GB of "
                                    f"{MODEL_TOTAL_BYTES / 1024 ** 3:.2f} GB · "
                                    f"{speed / 1024 / 1024:.1f} MB/s"
                                ),
                            )
                        else:
                            job.update(
                                progress=100,
                                message="Download complete — loading the voice model…",
                            )
                        _write_job(job)

                threading.Thread(target=watch_download, daemon=True).start()
        try:
            model = _get_model()
        finally:
            watch_stop.set()
        _patch_sampling_progress()
        ref = str(_voice_wav_path(voice_id))
        sample_rate = model.sr
        gap = np.zeros(int(sample_rate * 0.25), dtype=np.float32)
        pieces = []
        gen_started = time.time()
        with _gen_lock:
            for index, chunk in enumerate(chunks):
                job.update(
                    status="running",
                    progress=int(index / len(chunks) * 100),
                    message=f"Speaking part {index + 1} of {len(chunks)}…",
                )
                _write_job(job)
                # ~25 speech tokens per second of audio, ~14 characters
                # per second of speech -> about 1.8 sampling steps per
                # character. Only an estimate: the bar is capped at 97%
                # of the part until the part really finishes.
                expected_steps = max(40, int(len(chunk) * 1.8))
                last_write = [0.0]

                def on_step(
                    step: int, index: int = index, expected: int = expected_steps
                ) -> None:
                    now = time.time()
                    if now - last_write[0] < 1.0:
                        return
                    last_write[0] = now
                    overall = (index + min(step / expected, 0.97)) / len(chunks)
                    elapsed = now - gen_started
                    message = (
                        f"Speaking part {index + 1} of {len(chunks)} · "
                        f"{int(overall * 100)}% · {_fmt_secs(elapsed)} elapsed"
                    )
                    if overall > 0.03:
                        message += f" · ~{_fmt_secs(elapsed / overall - elapsed)} left"
                    job.update(progress=int(overall * 100), message=message)
                    _write_job(job)

                global _step_cb
                _step_cb = on_step
                try:
                    wav = model.generate(
                        chunk,
                        language_id=language,
                        audio_prompt_path=ref,
                        exaggeration=exaggeration,
                        cfg_weight=0.5,
                    )
                finally:
                    _step_cb = None

                pieces.append(wav.squeeze().detach().cpu().numpy().astype(np.float32))
                pieces.append(gap)
        audio = np.concatenate(pieces[:-1])
        _write_wav(wav_out, audio, sample_rate)
        proc = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(wav_out),
                "-codec:a",
                "libmp3lame",
                "-b:a",
                "192k",
                str(mp3_out),
            ],
            capture_output=True,
            text=True,
            timeout=600,
            **no_window_kwargs(),
        )
        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg MP3 export failed: {proc.stderr[-500:]}")
        job.update(
            status="done",
            progress=100,
            message="Done",
            seconds=round(len(audio) / sample_rate, 1),
            download_url=f"/api/voiceclone/download/{job_id}",
            finished_at=_now(),
        )
        # License accounting (1.0.5): completed voiceover is
        # reported, usage is pinged either way — in free mode the
        # credit calls are no-ops and only the usage ping fires.
        if job_token:
            licensing.report(job_token, "completed", tool="voiceclone",
                             title=voice_name, topic=text[:80],
                             minutes=round(len(audio) / sample_rate / 60, 2),
                             chars=len(text))
        licensing.report_usage(tool="voiceclone", title=voice_name,
                               topic=text[:80], status="completed",
                               minutes=round(len(audio) / sample_rate / 60, 2),
                               chars=len(text))
    except Exception as exc:  # noqa: BLE001
        job.update(status="error", message=f"Voiceover failed: {str(exc)[-800:]}")
        if job_token:
            licensing.refund(job_token)
        licensing.report_usage(tool="voiceclone", status="failed",
                               chars=len(text))
    finally:
        wav_out.unlink(missing_ok=True)
    _write_job(job)


@router.post("/generate")
def generate(payload: GenerateRequest) -> dict:
    if not _engine_installed():
        raise HTTPException(400, "Install the voice engine first (button at the top).")
    _check_id(payload.voice_id, "Voice")
    voice = _read_voice(payload.voice_id)
    if not voice:
        raise HTTPException(404, "Voice not found. Clone a voice first.")
    if payload.language not in LANGUAGE_IDS:
        raise HTTPException(400, "Unknown language.")
    text = payload.text.strip()
    if not text:
        raise HTTPException(400, "Script is empty.")
    job_id = uuid.uuid4().hex[:12]
    # Credit check (1.0.5): reserve 1 credit BEFORE any work.
    # Raises 402 when the job must not start (no key / no credits
    # once charging is on). In free mode this returns a local free
    # token and the tool stays free exactly as today.
    try:
        token = licensing.consume("voiceclone", job_id, _CLIENT_VERSION)
    except licensing.LicenseError as exc:
        raise _license_error_to_http(exc) from exc
    job = {
        "id": job_id,
        "status": "queued",
        "progress": 0,
        "message": "Waiting to start…",
        "voice_id": payload.voice_id,
        "voice_name": voice["name"],
        "language": payload.language,
        "chars": len(text),
        "created_at": _now(),
    }
    _write_job(job)
    threading.Thread(
        target=_run_generate,
        args=(job_id, payload.voice_id, text, payload.language, payload.exaggeration, token),
        daemon=True,
    ).start()
    return {"job_id": job_id, "status": "queued"}


@router.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    _check_id(job_id, "Job")
    job = _read_job(job_id)
    if job.get("status") == "unknown":
        raise HTTPException(404, "Job not found.")
    return job


@router.get("/download/{job_id}")
def download(job_id: str) -> FileResponse:
    _check_id(job_id, "Voiceover")
    path = OUT_DIR / f"{job_id}.mp3"
    if not path.exists():
        raise HTTPException(404, "Voiceover not found.")
    return FileResponse(
        path, media_type="audio/mpeg", filename=f"cloned-voiceover-{job_id}.mp3"
    )
