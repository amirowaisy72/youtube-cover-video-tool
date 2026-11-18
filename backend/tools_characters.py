"""Character Studio — save your own cartoon characters (Phase 1 of
the Stickman Story Animator).

Free tool: no license/credit calls, no API key. A character is a
name + a voice + a small "config" (skin, hair, clothes, colours).
The drawing itself is done in the browser from that config
(frontend-react/src/lib/stickman.ts), so a saved character looks
exactly the same in the designer and, later, in every video.

Stored as one JSON file per character in <project>/characters/.

Endpoints (all under /api/characters):
  GET    /             -> {characters: [...]}  (newest first)
  POST   /             {name, voice, config} -> character
  PUT    /{id}         {name, voice, config} -> character
  DELETE /{id}

Wire-up (in backend/main.py):
    import tools_characters  # noqa: E402
    app.include_router(tools_characters.router)
"""

from __future__ import annotations

import datetime
import json
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/characters")

BASE_DIR = Path(__file__).resolve().parent.parent
CHAR_DIR = BASE_DIR / "characters"
CHAR_DIR.mkdir(exist_ok=True)

_ID_RE = re.compile(r"^[0-9a-f]{12}$")
MAX_CONFIG_BYTES = 8000


class CharacterVoice(BaseModel):
    # "edge" = a Text to Voice voice, "clone" = a Voice Cloner voice.
    # "provider" = Unreal Speech / ElevenLabs / Google (the user's own key).
    type: str = Field("edge", pattern="^(edge|clone|provider)$")
    id: str = Field("", max_length=80)
    label: str = Field("", max_length=120)
    provider: str = Field("", pattern="^(|unreal|elevenlabs|google|gemini)$")


class CharacterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)
    voice: CharacterVoice = CharacterVoice()
    config: dict


def _now() -> str:
    return datetime.datetime.now().isoformat(timespec="seconds")


def _path(char_id: str) -> Path:
    if not _ID_RE.match(char_id or ""):
        raise HTTPException(404, "Character not found.")
    return CHAR_DIR / f"{char_id}.json"


def _read(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _clean(payload: CharacterRequest) -> dict:
    name = re.sub(r"\s+", " ", payload.name).strip()
    if not name:
        raise HTTPException(400, "Give the character a name.")
    if len(json.dumps(payload.config)) > MAX_CONFIG_BYTES:
        raise HTTPException(400, "Character design is too large.")
    return {"name": name, "voice": payload.voice.model_dump(), "config": payload.config}


def _name_taken(name: str, except_id: str = "") -> bool:
    for path in CHAR_DIR.glob("*.json"):
        data = _read(path)
        if data and data.get("id") != except_id and \
                str(data.get("name", "")).lower() == name.lower():
            return True
    return False


@router.get("")
def list_characters() -> dict:
    items = [d for d in (_read(p) for p in CHAR_DIR.glob("*.json")) if d]
    items.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return {"characters": items}


@router.post("")
def create_character(payload: CharacterRequest) -> dict:
    data = _clean(payload)
    if _name_taken(data["name"]):
        raise HTTPException(400, f'A character named "{data["name"]}" already exists.')
    char_id = uuid.uuid4().hex[:12]
    character = {"id": char_id, **data, "created_at": _now(), "updated_at": _now()}
    _path(char_id).write_text(json.dumps(character, indent=2), encoding="utf-8")
    return character


@router.put("/{char_id}")
def update_character(char_id: str, payload: CharacterRequest) -> dict:
    path = _path(char_id)
    old = _read(path)
    if not old:
        raise HTTPException(404, "Character not found.")
    data = _clean(payload)
    if _name_taken(data["name"], except_id=char_id):
        raise HTTPException(400, f'A character named "{data["name"]}" already exists.')
    character = {**old, **data, "updated_at": _now()}
    path.write_text(json.dumps(character, indent=2), encoding="utf-8")
    return character


@router.delete("/{char_id}")
def delete_character(char_id: str) -> dict:
    _path(char_id).unlink(missing_ok=True)
    return {"deleted": char_id}
