"""Free 3D model library for the Story Animator (user, 2026-11-18:
"environments must look real, not rough boxes").

1,100+ ready-made low-poly models by Kenney (www.kenney.nl), CC0 1.0 =
public domain: free for any use, no credit needed. The app ships only the
small index (models_index.json: name, words, real size in metres); each
model file is downloaded from GitHub the first time a world needs it and
kept in backend/models_cache/ (works offline after that).
"""
from __future__ import annotations

import json
import re
import threading
import urllib.request
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(prefix="/api/models", tags=["models"])
HERE = Path(__file__).resolve().parent
INDEX_FILE = HERE / "models_index.json"
CACHE = HERE / "models_cache"
_lock = threading.Lock()
_index: dict | None = None


def index() -> dict:
    global _index
    if _index is None:
        _index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    return _index


def _ids() -> set[str]:
    return {m["id"] for m in index()["models"]}


@router.get("/index")
def get_index():
    return JSONResponse(index(), headers={"Cache-Control": "max-age=86400"})


def fetch(model_id: str) -> Path:
    """The model file on disk — downloaded once from GitHub if needed."""
    if model_id not in _ids() or not re.fullmatch(r"[a-z0-9\-]+/[a-z0-9\-]+", model_id):
        raise HTTPException(404, "Unknown model")
    pack, name = model_id.split("/")
    out = CACHE / pack / f"{name}.glb"
    if out.exists() and out.stat().st_size > 100:
        return out
    with _lock:
        if out.exists() and out.stat().st_size > 100:
            return out
        out.parent.mkdir(parents=True, exist_ok=True)
        url = index()["base"] + f"{pack}/{name}.glb"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "YT-Guru-Animator"})
            with urllib.request.urlopen(req, timeout=40) as resp:
                data = resp.read()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(502, f"Could not download the model ({exc}). Check the internet once.") from exc
        if not data.startswith(b"glTF"):
            raise HTTPException(502, "The download was not a 3D model.")
        tmp = out.with_suffix(".part")
        tmp.write_bytes(data)
        tmp.replace(out)
    return out


@router.get("/file/{pack}/{name}")
def get_file(pack: str, name: str):
    name = name.removesuffix(".glb")
    path = fetch(f"{pack}/{name}")
    return FileResponse(path, media_type="model/gltf-binary", headers={"Cache-Control": "max-age=31536000"})


@router.post("/prefetch")
def prefetch(body: dict):
    """Download a list of models now (the video maker calls this before building)."""
    done, failed = [], []
    for mid in (body.get("ids") or [])[:400]:
        try:
            fetch(str(mid))
            done.append(mid)
        except HTTPException:
            failed.append(mid)
    return {"done": len(done), "failed": failed}
