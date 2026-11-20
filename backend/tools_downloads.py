"""Lazy big-model downloads — nothing big downloads at install time.

Every large model YT Guru needs is fetched on FIRST USE only, with
visible progress, through this module:

  GET  /api/downloads/status            -> every lazy download + progress
  POST /api/downloads/{download_id}/start -> start one in the background

Registry (sizes verified against the Hugging Face API, 2026-11-21):
  whisper-tiny     ~74.6 MB  Systran/faster-whisper-tiny — the speech
                              model for Subtitles + Auto Video word timing.
                              Triggered today inside the first transcribe
                              (tools_subtitles._get_model /
                              autovideo2._get_whisper_model) with no
                              progress bar; this endpoint downloads it
                              up front instead, with a bar.
  chatterbox-model ~3.21 GB  ResembleAI/chatterbox — the Voice Clone
                              model. Triggered today inside the first
                              voiceover (tools_voiceclone._get_model);
                              this endpoint downloads the same files up
                              front instead, with a bar. The voice engine
                              itself (chatterbox-tts pip package) is a
                              separate step: POST /api/voiceclone/install.

What stays in the installer (small, required): Python + pip packages
from requirements.txt, the frozen app, the React build, FFmpeg
(~114 MB zip at build time, bundled). No model weights are bundled
and no model downloads at install time — the installer only extracts
files. Downloads here go to the normal Hugging Face cache, so the
existing lazy loaders find them already cached and skip the network,
and interrupted downloads resume (Hugging Face keeps partial blobs).

Wire-up (in backend/main.py — NOT done here, another agent owns it):
    import tools_downloads  # noqa: E402
    app.include_router(tools_downloads.router)
"""

from __future__ import annotations

import importlib.util
import os
import threading
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/downloads", tags=["downloads"])

# Sizes are the exact repo totals from the Hugging Face API, except
# chatterbox: the repo holds 12.9 GB of variants (.pt + .safetensors,
# v2 + v3), but from_pretrained(t3_model="v3") fetches only ~3.21 GB,
# so the total below matches tools_voiceclone.MODEL_TOTAL_BYTES.
DOWNLOADS = {
    "whisper-tiny": {
        "id": "whisper-tiny",
        "name": "Whisper tiny speech model",
        "description": "Speech recognition for Subtitles and Auto Video word timing.",
        "repo": "Systran/faster-whisper-tiny",
        "total_bytes": 78_207_087,
        "size_label": "~75 MB",
        "used_by": "Subtitles, Auto Video",
    },
    "chatterbox-model": {
        "id": "chatterbox-model",
        "name": "Voice Clone model (Chatterbox)",
        "description": "Voice cloning and voiceovers. First voiceover only.",
        "repo": "ResembleAI/chatterbox",
        "total_bytes": int(3.21 * 1024**3),
        "size_label": "~3.2 GB",
        "used_by": "Voice Clone",
    },
}

# A download counts as cached once >= 90% of the expected bytes are
# on disk with no partial blob left (same rule as tools_voiceclone).
COMPLETE_FRACTION = 0.9


def _hf_cache_root() -> Path:
    """Hugging Face cache dir. huggingface_hub is imported lazily
    (only inside the download worker) so importing this module —
    including at app startup — never pulls the heavy hub stack."""
    try:
        from huggingface_hub import constants

        return Path(constants.HF_HUB_CACHE)
    except Exception:  # noqa: BLE001
        if os.environ.get("HF_HUB_CACHE"):
            return Path(os.environ["HF_HUB_CACHE"])
        hf_home = os.environ.get("HF_HOME")
        if hf_home:
            return Path(hf_home) / "hub"
        return Path.home() / ".cache" / "huggingface" / "hub"


def _repo_dir(repo: str) -> Path:
    return _hf_cache_root() / ("models--" + repo.replace("/", "--"))


def _cache_bytes(repo_dir: Path) -> tuple[int, bool]:
    """(bytes of the model on disk, a download still in progress?)"""
    blobs = repo_dir / "blobs"
    if not blobs.is_dir():
        return 0, False
    total, partial = 0, False
    for blob in blobs.iterdir():
        try:
            total += blob.stat().st_size
        except OSError:
            continue
        if blob.name.endswith(".incomplete"):
            partial = True
    return total, partial


def _is_cached(entry: dict) -> bool:
    size, partial = _cache_bytes(_repo_dir(entry["repo"]))
    return not partial and size >= entry["total_bytes"] * COMPLETE_FRACTION


def _engine_installed() -> bool:
    return importlib.util.find_spec("chatterbox") is not None


# ------------------------------------------------------------ state
_states: dict[str, dict] = {}
_locks: dict[str, threading.Lock] = {}


def _fresh_state(entry: dict) -> dict:
    size, _partial = _cache_bytes(_repo_dir(entry["repo"]))
    downloaded = _is_cached(entry)
    state: dict = {
        "id": entry["id"],
        "name": entry["name"],
        "description": entry["description"],
        "size_label": entry["size_label"],
        "used_by": entry["used_by"],
        "repo": entry["repo"],
        "status": "downloaded" if downloaded else "missing",
        "progress": 100 if downloaded else 0,
        "downloaded_bytes": size,
        "total_bytes": entry["total_bytes"],
        "speed_bps": 0,
        "error": "",
    }
    if entry["id"] == "chatterbox-model":
        state["engine_installed"] = _engine_installed()
        state["engine_install_url"] = "/api/voiceclone/install"
    return state


def _get_state(entry: dict) -> dict:
    """Current state. A live download keeps the worker's numbers;
    a stored "downloaded"/"error" is returned as-is; "missing" is
    re-read from disk, so a model fetched by another tool (e.g. a
    transcribe that ran first) shows up as downloaded."""
    state = _states.get(entry["id"])
    if state is None:
        state = _fresh_state(entry)
        _states[entry["id"]] = state
        return dict(state)
    if state.get("status") == "missing":
        fresh = _fresh_state(entry)
        state.update(fresh)
    return dict(state)


def _watch_progress(entry: dict, done: threading.Event) -> None:
    """Poll the cache dir while the worker downloads, so the UI
    shows real GB done + speed (same pattern as tools_voiceclone)."""
    state = _states[entry["id"]]
    last_time, last_size = time.time(), state.get("downloaded_bytes", 0)
    while not done.wait(1.0):
        size, _partial = _cache_bytes(_repo_dir(entry["repo"]))
        now = time.time()
        speed = max(0.0, (size - last_size) / max(now - last_time, 0.001))
        last_time, last_size = now, size
        state["downloaded_bytes"] = size
        state["speed_bps"] = speed
        state["progress"] = min(
            99, int(size / entry["total_bytes"] * 100)
        )


def _run_download(entry: dict, done: threading.Event) -> None:
    state = _states[entry["id"]]
    try:
        from huggingface_hub import snapshot_download

        snapshot_download(repo_id=entry["repo"])
    except ImportError:
        state.update(
            status="error",
            error=(
                "huggingface_hub is not installed, so the model cannot be "
                "downloaded. Run 'pip install huggingface_hub' and retry."
            ),
        )
    except Exception as exc:  # noqa: BLE001
        state.update(status="error", error=f"Download failed: {str(exc)[-500:]}")
    else:
        if _is_cached(entry):
            size, _ = _cache_bytes(_repo_dir(entry["repo"]))
            state.update(
                status="downloaded",
                progress=100,
                downloaded_bytes=size,
                speed_bps=0,
                error="",
            )
        else:
            state.update(
                status="error",
                error=(
                    "Download finished but the model files look incomplete. "
                    "Check the internet connection and try again."
                ),
            )
    finally:
        done.set()


# ------------------------------------------------------------ routes
@router.get("/status")
def status() -> dict:
    return {"downloads": [_get_state(entry) for entry in DOWNLOADS.values()]}


@router.post("/{download_id}/start")
def start(download_id: str) -> dict:
    entry = DOWNLOADS.get(download_id)
    if entry is None:
        raise HTTPException(404, "Unknown download.")
    lock = _locks.setdefault(download_id, threading.Lock())
    with lock:
        state = _get_state(entry)
        if state["status"] == "downloading":
            return {"started": False, **state}
        if state["status"] == "downloaded":
            return {"started": False, **state}
        state = _fresh_state(entry)
        state.update(status="downloading", progress=0, speed_bps=0, error="")
        _states[download_id] = state
        done = threading.Event()
        threading.Thread(
            target=_run_download, args=(entry, done), daemon=True
        ).start()
        threading.Thread(
            target=_watch_progress, args=(entry, done), daemon=True
        ).start()
        return {"started": True, **dict(state)}
