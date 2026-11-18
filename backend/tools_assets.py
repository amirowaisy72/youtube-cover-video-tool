"""Asset Library (YT Guru) — objects, animals and places for the Story Animator.

Two sources, so videos never run out of fresh things to show:

* **Your library** (``BASE_DIR/assets/library``): SVG/PNG files you add on
  the Asset Library page (or that you get an AI to draw), each with a name,
  tags and a kind — object, animal, vehicle, food or place (a whole
  background for one of the place types, used as one more look for it).
* **OpenMoji** (https://openmoji.org, CC BY-SA 4.0): about 4,000 free
  line-art drawings. Looked up by word the first time a video needs one,
  downloaded once and kept in ``BASE_DIR/assets/openmoji`` for later videos.

``find_asset("cat")`` answers which picture to use for a word.
"""
from __future__ import annotations

import json
import re
import sys
import threading
import time
import urllib.request
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response

sys.path.insert(0, str(Path(__file__).resolve().parent))

BASE_DIR = Path(__file__).resolve().parent.parent
ASSET_DIR = BASE_DIR / "assets"
LIB_DIR = ASSET_DIR / "library"
OM_DIR = ASSET_DIR / "openmoji"
LIB_FILE = ASSET_DIR / "library.json"

KINDS = ["object", "animal", "vehicle", "food", "person", "place"]
PLACE_KINDS = ["park", "street", "home", "office", "classroom", "kitchen", "bedroom", "shop", "jungle", "forest",
               "beach", "desert", "cave", "mountain", "snow", "farm", "village", "space", "underwater", "hospital",
               "library", "stage", "gym", "bus", "train", "car", "plane",
               "restaurant", "police", "plain"]
OPENMOJI_CREDIT = "Some drawings: OpenMoji (openmoji.org), CC BY-SA 4.0"
_OM_DATA_URLS = [
    "https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@latest/data/openmoji.json",
    "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/data/openmoji.json",
]
_OM_SVG_URLS = [
    "https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@latest/color/svg/{hex}.svg",
    "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/{hex}.svg",
]

router = APIRouter(prefix="/api/assets", tags=["assets"])
_lock = threading.Lock()

# Everyday words that must never become a picture.
STOPWORDS = set("""
a an the and or but if so of to in on at by for with from up down out over under again then than too very
just only also not no yes ok okay oh hey hi hello bye please thanks thank sorry wait look see come go went gone
get got give gave take took make made do did does done have has had be is am are was were been being will would
can could should shall may might must let lets i me my mine you your yours he him his she her hers it its we us
our they them their this that these those what which who whom whose why how when where here there all any some
every each both few more most other such own same into about above below after before during through while once
now today tonight tomorrow yesterday always never ever maybe really still even back off new old good bad big
small little long short high low first last next one two three four five six seven eight nine ten hundred
thousand zero time day night week year minute minutes hour hours second thing things way something nothing
anything everything someone anyone everyone nobody people man men woman women boy girl guy guys kid kids friend
friends mom dad mother father brother sister sir madam master teacher know think say said tell told want need
like love hate feel felt try tried help keep kept put call called ask asked work play run walk talk eat drink
sleep read write open close start stop find found bring brought buy bought pay paid win lost lose show showed
right left yeah nah wow uff hmm haan oops yay ohoo aah okay sure well done great nice cute cool funny smart
genius plan idea problem question answer page pages chapter exam test study home house room place
""".split())


# ----------------------------------------------------------------- helpers
def _read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return default


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(path)


def _get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "YT-Guru/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _singular(w: str) -> str:
    if len(w) > 4 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 4 and w.endswith(("ches", "shes", "xes", "sses")):
        return w[:-2]
    if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
        return w[:-1]
    return w


def library() -> list[dict]:
    return _read_json(LIB_FILE, [])


# ----------------------------------------------------------------- OpenMoji
_om_index: dict[str, list[tuple[int, str, str, str]]] | None = None
_om_failed_at = 0.0


def _om_kind(subgroup: str, group: str) -> str:
    if subgroup.startswith("animal-"):
        return "animal"
    if subgroup.startswith("transport-"):
        return "vehicle"
    if group == "food-drink":
        return "food"
    if group == "people-body":
        return "person"
    return "object"


def _openmoji() -> dict[str, list[tuple[int, str, str, str]]]:
    """word -> [(score, hexcode, annotation, kind)], best first. Built once."""
    global _om_index, _om_failed_at
    if _om_index is not None:
        return _om_index
    if time.time() - _om_failed_at < 300:
        return {}
    path = ASSET_DIR / "openmoji.json"
    data = _read_json(path, None)
    if not data:
        for url in _OM_DATA_URLS:
            try:
                raw = _get(url, timeout=60)
                data = json.loads(raw)
                ASSET_DIR.mkdir(parents=True, exist_ok=True)
                path.write_bytes(raw)
                break
            except Exception:  # noqa: BLE001
                continue
    if not data:
        _om_failed_at = time.time()
        return {}
    index: dict[str, list[tuple[int, str, str, str]]] = {}
    for e in data:
        group = e.get("group", "")
        if e.get("skintone") or group in ("flags", "component", "extras-unicode", "extras-openmoji"):
            continue
        sub = e.get("subgroups", "")
        if sub in ("keycap", "alphanum", "geometric", "av-symbol", "other-symbol", "arrow", "math",
                   "punctuation", "currency", "zodiac", "religion", "warning", "transport-sign"):
            continue
        ann = str(e.get("annotation", "")).lower()
        words = re.findall(r"[a-z]+", ann)
        if not words:
            continue
        kind = _om_kind(sub, group)
        face_penalty = 25 if "face" in words and kind == "animal" else 0
        entry = (e["hexcode"], ann, kind)
        # exact name
        index.setdefault(ann, []).append((100 - face_penalty, *entry))
        # the main noun of a 2-word name ("hot pepper" -> pepper, "pouting cat" -> cat)
        if len(words) <= 2:
            index.setdefault(words[-1], []).append((70 - face_penalty - 5 * len(words), *entry))
        for t in re.split(r"\s*,\s*", str(e.get("tags", "")).lower()):
            if t and t not in STOPWORDS:
                index.setdefault(t, []).append((30 - face_penalty - len(words), *entry))
    for k in index:
        index[k].sort(key=lambda x: -x[0])
    _om_index = index
    return index


def _om_svg_path(hexcode: str) -> Path | None:
    if not re.fullmatch(r"[0-9A-F-]{2,40}", hexcode):
        return None
    path = OM_DIR / f"{hexcode}.svg"
    if path.exists():
        return path
    OM_DIR.mkdir(parents=True, exist_ok=True)
    for url in _OM_SVG_URLS:
        try:
            svg = _get(url.format(hex=hexcode))
            if b"<svg" in svg[:500]:
                path.write_bytes(svg)
                return path
        except Exception:  # noqa: BLE001
            continue
    return None


# ------------------------------------------------------------------ lookup
# Everyday words whose picture has another name in OpenMoji.
SYNONYMS = {
    "car": "automobile", "piano": "musical keyboard", "money": "money bag", "wallet": "purse",
    "plate": "fork and knife with plate", "mobile": "mobile phone", "cellphone": "mobile phone",
    "tv": "television", "computer": "laptop", "football": "soccer ball", "ball": "soccer ball",
    "cricket": "cricket game", "tea": "teacup without handle", "chai": "teacup without handle",
    "coffee": "hot beverage", "bike": "bicycle", "cycle": "bicycle", "doctor": "health worker",
    "police": "police officer", "chicken": "chicken", "puppy": "dog", "kitten": "cat", "kitty": "cat",
    "biryani": "curry rice", "rice": "cooked rice", "bread": "bread", "roti": "flatbread",
    "icecream": "soft ice cream", "ice-cream": "soft ice cream", "medicine": "pill", "letter": "envelope",
    "homework": "notebook", "bag": "backpack", "shoes": "running shoe", "shoe": "running shoe",
    "glasses": "glasses", "gift": "wrapped gift", "present": "wrapped gift", "fire": "fire",
    "mango": "mango", "cake": "birthday cake", "plane": "airplane", "aeroplane": "airplane",
    "train": "locomotive", "lion": "lion", "snake": "snake", "monkey": "monkey", "goat": "goat",
}


def find_asset(word: str, strong: bool = True, kinds: set[str] | None = None) -> dict | None:
    """Best picture for a word: {"src": "lib:<id>" | "om:<hex>", "kind", "name"}.
    strong=True only accepts a clear match (the word IS the thing), so
    random words in a sentence do not pop up odd pictures."""
    w = re.sub(r"[^a-z\- ]", "", word.lower()).strip()
    if not w or w in STOPWORDS or len(w) < 3:
        return None
    candidates = {w, _singular(w)}
    for item in library():
        if item.get("kind") == "place":
            continue
        names = {str(item.get("name", "")).lower()} | {str(t).lower() for t in item.get("tags", [])}
        if candidates & names and (not kinds or item.get("kind") in kinds):
            return {"src": f"lib:{item['id']}", "kind": item.get("kind", "object"), "name": item.get("name", w)}
    index = _openmoji()
    best = None
    syn = SYNONYMS.get(w) or SYNONYMS.get(_singular(w))
    if syn and syn in index:
        candidates = [syn]  # exact names always win
    for c in candidates:
        for score, hexcode, ann, kind in index.get(c, []):
            if strong and score < 55:
                break
            if kinds and kind not in kinds:
                continue
            if best is None or score > best[0]:
                best = (score, hexcode, ann, kind)
            break
    if not best:
        return None
    return {"src": f"om:{best[1]}", "kind": best[3], "name": best[2]}


def asset_file(src: str) -> Path | None:
    """The file behind "lib:<id>" / "om:<hex>" (downloads OpenMoji once)."""
    if src.startswith("om:"):
        return _om_svg_path(src[3:])
    if src.startswith("lib:"):
        item = next((i for i in library() if i["id"] == src[4:]), None)
        if item:
            path = LIB_DIR / item["file"]
            return path if path.exists() else None
    return None


def place_images(kind: str) -> list[dict]:
    """Your own backgrounds for a place type (extra looks for it)."""
    return [i for i in library() if i.get("kind") == "place" and i.get("place") == kind
            and (LIB_DIR / i["file"]).exists()]


# --------------------------------------------------------------- endpoints
@router.get("")
def list_assets() -> dict:
    return {"assets": library(), "kinds": KINDS, "places": PLACE_KINDS}


@router.get("/search")
def search(q: str = "", limit: int = 60) -> dict:
    """Your assets + OpenMoji pictures for a word (for the library page)."""
    q = q.lower().strip()
    mine = [i for i in library() if not q or q in str(i.get("name", "")).lower()
            or any(q in str(t).lower() for t in i.get("tags", []))]
    found: list[dict] = []
    if q:
        seen: set[str] = set()
        index = _openmoji()
        for key in [q, _singular(q)] + [k for k in index if k.startswith(q)][:30]:
            for score, hexcode, ann, kind in index.get(key, []):
                if hexcode in seen:
                    continue
                seen.add(hexcode)
                found.append({"src": f"om:{hexcode}", "name": ann, "kind": kind, "score": score})
        found.sort(key=lambda x: -x["score"])
    return {"mine": mine, "openmoji": found[:limit], "credit": OPENMOJI_CREDIT}


@router.get("/file/{src}")
def get_file(src: str):
    path = asset_file(src)
    if not path:
        raise HTTPException(404, "Picture not found.")
    if path.suffix == ".svg":
        svg = path.read_text(encoding="utf-8", errors="ignore")
        # A fixed size so browsers can draw it into a canvas.
        if not re.search(r"<svg[^>]*\swidth=", svg[:400]):
            svg = svg.replace("<svg", '<svg width="512" height="512"', 1)
        return Response(svg, media_type="image/svg+xml", headers={"Cache-Control": "max-age=86400"})
    return FileResponse(path, headers={"Cache-Control": "max-age=86400"})


@router.post("")
async def add_asset(file: UploadFile = File(...), name: str = Form(...), tags: str = Form(""),
                    kind: str = Form("object"), place: str = Form(""), floor: float = Form(0.82)) -> dict:
    """Add your own picture (SVG / PNG / JPG / WEBP)."""
    if kind not in KINDS:
        raise HTTPException(400, "Unknown kind.")
    if kind == "place" and place not in PLACE_KINDS:
        raise HTTPException(400, "Choose which place this background is.")
    ext = Path(file.filename or "").suffix.lower()
    if ext not in (".svg", ".png", ".jpg", ".jpeg", ".webp"):
        raise HTTPException(400, "Use an SVG, PNG, JPG or WEBP picture.")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "Picture is too big (max 15 MB).")
    LIB_DIR.mkdir(parents=True, exist_ok=True)
    aid = uuid.uuid4().hex[:10]
    (LIB_DIR / f"{aid}{ext}").write_bytes(data)
    item = {"id": aid, "name": name.strip()[:60] or "picture", "kind": kind,
            "tags": [t.strip().lower() for t in tags.split(",") if t.strip()][:20],
            "file": f"{aid}{ext}", "place": place if kind == "place" else "",
            "floor": max(0.5, min(0.98, floor)), "added": time.strftime("%Y-%m-%d %H:%M")}
    with _lock:
        items = library()
        items.insert(0, item)
        _write_json(LIB_FILE, items)
    return item


@router.post("/svg")
def add_svg(body: dict) -> dict:
    """Add a picture from pasted SVG code (e.g. drawn by ChatGPT / Claude)."""
    svg = str(body.get("svg", "")).strip()
    m = re.search(r"<svg[\s\S]*</svg>", svg)
    if not m:
        raise HTTPException(400, "That is not SVG code (it must contain <svg …> … </svg>).")
    svg = re.sub(r"<script[\s\S]*?</script>", "", m.group(0), flags=re.I)
    kind = str(body.get("kind", "object"))
    place = str(body.get("place", ""))
    if kind not in KINDS or (kind == "place" and place not in PLACE_KINDS):
        raise HTTPException(400, "Choose a kind (and the place for a background).")
    LIB_DIR.mkdir(parents=True, exist_ok=True)
    aid = uuid.uuid4().hex[:10]
    (LIB_DIR / f"{aid}.svg").write_text(svg, encoding="utf-8")
    item = {"id": aid, "name": str(body.get("name", "picture")).strip()[:60] or "picture", "kind": kind,
            "tags": [t.strip().lower() for t in str(body.get("tags", "")).split(",") if t.strip()][:20],
            "file": f"{aid}.svg", "place": place if kind == "place" else "",
            "floor": max(0.5, min(0.98, float(body.get("floor", 0.82)))), "added": time.strftime("%Y-%m-%d %H:%M")}
    with _lock:
        items = library()
        items.insert(0, item)
        _write_json(LIB_FILE, items)
    return item


@router.post("/save/{src}")
def save_openmoji(src: str, body: dict) -> dict:
    """Keep an OpenMoji picture in your library under your own name/tags."""
    path = asset_file(src)
    if not path or not src.startswith("om:"):
        raise HTTPException(404, "Picture not found.")
    LIB_DIR.mkdir(parents=True, exist_ok=True)
    aid = uuid.uuid4().hex[:10]
    (LIB_DIR / f"{aid}.svg").write_bytes(path.read_bytes())
    kind = str(body.get("kind", "object"))
    item = {"id": aid, "name": str(body.get("name", "picture"))[:60], "kind": kind if kind in KINDS else "object",
            "tags": [t.strip().lower() for t in str(body.get("tags", "")).split(",") if t.strip()][:20],
            "file": f"{aid}.svg", "place": "", "floor": 0.82, "added": time.strftime("%Y-%m-%d %H:%M"),
            "credit": OPENMOJI_CREDIT}
    with _lock:
        items = library()
        items.insert(0, item)
        _write_json(LIB_FILE, items)
    return item


@router.delete("/{aid}")
def delete_asset(aid: str) -> dict:
    with _lock:
        items = library()
        item = next((i for i in items if i["id"] == aid), None)
        if not item:
            raise HTTPException(404, "Not found.")
        items.remove(item)
        _write_json(LIB_FILE, items)
    (LIB_DIR / item["file"]).unlink(missing_ok=True)
    return {"ok": True}
