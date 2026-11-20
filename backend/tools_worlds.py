"""3D World — your own worlds from the Environment Designer.

A world is one JSON file (backend/../worlds/<name>.json): the ground, the
time of day, the wind, and every object with its abilities ("traits":
climbable, has fruits, door opens, has fish…). The Story Animator uses a
world when a scene's place says its name ("Scene: Mera Jungle — by the
river"), and the AI prompt lists your worlds so scripts can use them.

Totally free: just files on your computer.
"""
from __future__ import annotations

import datetime
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/worlds")

BASE_DIR = Path(__file__).resolve().parent.parent
WORLDS_DIR = BASE_DIR / "worlds"
MAX_OBJECTS = 800

LABELS = {
    "mango_tree": "mango trees", "apple_tree": "apple trees", "orange_tree": "orange trees", "big_tree": "big trees",
    "pine_tree": "pine trees", "palm_tree": "coconut palms", "banana_plant": "banana plants", "bush": "bushes",
    "berry_bush": "berry bushes", "flowers": "flowers", "tall_grass": "tall grass", "mushroom": "mushrooms",
    "river": "a river", "pond": "a pond", "waterfall": "a waterfall", "bare_tree": "bare trees", "person": "people", "bridge": "a bridge", "boat": "a boat", "rock": "rocks", "stones": "stones",
    "log": "logs", "stump": "stumps", "hill": "hills", "path": "a path", "hut": "a hut", "house": "a house",
    "tent": "a tent", "fence": "a fence", "well": "a well", "bench": "a bench", "campfire": "a campfire",
    "ladder": "a ladder", "signpost": "a sign", "ball": "a ball", "basket": "a basket", "crate": "a box",
    "axe": "an axe", "birds": "birds", "butterflies": "butterflies", "animal": "animals", "item": "things",
}


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-")[:60]
    return s or "world"


def _path(name: str) -> Path:
    return WORLDS_DIR / f"{_slug(name)}.json"


def _read(p: Path) -> dict | None:
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else None
    except (OSError, ValueError):
        return None


def all_worlds() -> list[dict]:
    if not WORLDS_DIR.is_dir():
        return []
    out = []
    for p in sorted(WORLDS_DIR.glob("*.json")):
        if p.name.startswith("_"):
            continue
        d = _read(p)
        if d and d.get("name"):
            out.append(d)
    return out


def summary(doc: dict) -> str:
    """'mango trees, a river, a hut' — what is in a world (for the AI prompt)."""
    seen: list[str] = []
    for o in doc.get("objects") or []:
        t = str(o.get("type", ""))
        label = str(o.get("name") or "") or LABELS.get(t, "")
        if t == "animal":
            label = str((o.get("opts") or {}).get("species") or "animals")
        if t == "item":
            label = str((o.get("opts") or {}).get("word") or "things")
        if t == "model":
            label = str((o.get("opts") or {}).get("model") or "")
            if label.startswith("slab_"):
                label = ""  # pavement / tarmac
        if t == "kit":  # a ready-made model: "city-kit-commercial/building-a" -> "building"
            kid = str((o.get("opts") or {}).get("kit") or "").split("/")[-1]
            label = re.sub(r"[-_]([a-z]|\d+)$", "", kid).replace("-", " ").strip()
            label = {"sedan": "cars", "suv": "cars", "taxi": "taxis", "building": "buildings", "building skyscraper": "tall buildings",
                     "building type": "houses", "light square": "street lights", "light curved": "street lights"}.get(label, label)
        if label and label not in seen:
            seen.append(label)
    return ", ".join(seen[:14])


# words that mean the same place (Urdu / English / different ways to say it)
_SAME = [
    {"rail", "railway", "railways", "train", "trains", "locomotive"},
    {"village", "villages", "gaon", "gaun", "pind", "countryside"},
    {"river", "rivers", "nadi", "stream", "riverside", "riverbank", "bank"},
    {"jungle", "forest", "woods", "jangal", "rainforest"},
    {"mountain", "mountains", "hill", "hills", "pahar", "pahari", "valley"},
    {"lake", "pond", "talab", "jheel"},
    {"waterfall", "falls", "cascade"},
    {"market", "bazaar", "bazar", "shops", "shop", "stall"},
    {"farm", "fields", "field", "khet", "khait"},
    {"beach", "sea", "ocean", "coast", "shore"},
    {"desert", "sand", "dunes", "registan"},
    {"snow", "snowy", "winter", "ice"},
    {"camp", "campsite", "campfire", "tent"},
    {"park", "garden", "playground"},
    {"school", "classroom"},
    {"road", "street", "highway", "sarak"},
]
_WEAK = {"station", "bank", "field", "fields", "road", "street", "shop", "shops", "engine", "track", "ice", "sand"}
_STOP = {"the", "a", "an", "of", "in", "at", "on", "near", "by", "with", "and", "to", "my", "our", "old", "new", "big",
         "small", "purana", "pakistani", "ka", "ki", "ke", "mein", "par", "some", "inside", "outside", "front", "behind"}


def _canon(w: str) -> str:
    for i, g in enumerate(_SAME):
        if w in g:
            return f"#{i}"
    return w[:-1] if len(w) > 4 and w.endswith("s") else w


def _tokens(text: str) -> set[str]:
    return {_canon(w) for w in re.findall(r"[a-z]+", str(text or "").lower()) if len(w) > 2 and w not in _STOP}


def _world_words(d: dict) -> tuple[set[str], set[str]]:
    name = _tokens(d.get("name", ""))
    rest = _tokens(" ".join([summary(d), str(d.get("kind") or ""), str((d.get("recipe") or {}).get("name") or ""),
                             " ".join((d.get("models") or {}).keys()),
                             " ".join(str(m.get("label") or "") for m in (d.get("models") or {}).values() if isinstance(m, dict))]))
    return name, rest - name


def world_score(text: str, d: dict) -> float:
    """How well a place description fits a saved world (0 = not at all)."""
    low = f" {str(text or '').lower()} "
    nm = str(d.get("name", "")).strip().lower()
    if d.get("exact_place"):
        # a place made for ONE script's scene (Script Planner): only that exact place text
        # ("river" never takes over "jungle by the river")
        t = re.sub(r"\s+", " ", low).strip()
        if t == nm or (t.endswith(" " + nm) and " " not in t[: -len(nm) - 1].strip()):
            return 100 + len(nm)
        return 0
    if len(nm) >= 3 and re.search(r"(?<![a-z0-9])" + re.escape(nm) + r"(?![a-z0-9])", low):
        return 100 + len(nm)  # its exact name
    t = _tokens(text)
    name, rest = _world_words(d)
    if not t or not name:
        return 0
    hit_name = t & name
    hit_rest = t & rest
    strong = {w for w in hit_name | hit_rest if not any(w == _canon(x) for x in _WEAK) or w.startswith("#")}
    if name <= t:  # every word of its name is meant ("village", "the railway station")
        return 10 + len(hit_rest)
    strong_name = {w for w in hit_name if w in strong}
    if strong_name:  # "train" fits the "Railway Station"
        return 5 + len(hit_name) * 2 + len(hit_rest)
    if len(hit_name) >= 2:
        return 6
    if len({w for w in hit_rest if w in strong}) >= 2:  # "boat on the nadi" fits a village with a river and a boat
        return 5
    return 0


# what can be done with each kind of thing (the AI writes the story around it)
_USES = {
    "mango_tree": "{climb:mango tree}, {shake:tree} (mangoes fall), {pick:mango}, {eat:mango}, {chop:tree}",
    "apple_tree": "{climb:apple tree}, {shake:tree} (apples fall), {pick:apple}, {eat:apple}",
    "orange_tree": "{climb:orange tree}, {shake:tree}, {pick:orange}, {eat:orange}",
    "big_tree": "{climb:tree}, {shake:tree}, {cut:branch}, {chop:tree}, {hide:tree}",
    "pine_tree": "{climb:pine tree}, {chop:tree}", "bare_tree": "{climb:tree}, {cut:branch}",
    "palm_tree": "{climb:palm tree}, {shake:palm} (coconuts fall), {pick:coconut}",
    "banana_plant": "{pick:banana}, {eat:banana}", "bush": "{hide:bush}", "berry_bush": "{pick:berry}, {eat:berry}",
    "flowers": "{pick:flower}", "mushroom": "{pick:mushroom}", "river": "{swim:river}, {fish:river}, {drink:river}, {throw:stone} into it",
    "pond": "{swim:pond}, {fish:pond}, {drink:pond}", "waterfall": "{look:waterfall}", "bridge": "{cross:bridge}",
    "boat": "{sit:boat}", "rock": "{sit:rock}, {hide:rock}, {push:rock}", "stones": "{pick:stone}, {throw:stone}",
    "log": "{sit:log}, {push:log}", "stump": "{sit:stump}", "hut": "{open:door}, {enter:hut}, {exit}",
    "house": "{open:door}, {enter:house}, {exit}", "tent": "{enter:tent}, {exit}", "well": "{drink:well}",
    "bench": "{sit:bench}", "campfire": "{light:campfire}", "ladder": "{climb:ladder}", "ball": "{kick:ball}, {throw:ball}",
    "basket": "{pick:basket}, {carry:basket}", "crate": "{sit:box}, {push:box}, {hide:box}", "axe": "{pick:axe}",
    "fruit": "{pick:mango}, {eat:mango}, {give:mango}",
}
_VERB = {"sittable": "sit", "enterable": "enter", "climbable": "climb", "pickable": "pick", "hide_behind": "hide", "openable": "open", "pushable": "push"}
_STARTER_ABIL = {"train": ["solid", "enterable"], "station_building": ["solid", "enterable", "hide_behind"], "water_tank": ["solid", "climbable"],
                 "bus": ["solid", "enterable"], "car": ["solid"], "stall": ["solid", "hide_behind"], "chair": ["sittable"],
                 "table": ["solid", "hide_behind"], "sofa": ["sittable", "hide_behind"], "bed": ["sittable"],
                 "cupboard": ["solid", "hide_behind", "openable"], "train_seat": ["sittable"], "school_desk": ["sittable"]}


def uses(doc: dict) -> str:
    """'train (comes in, waits, leaves at the end; {enter:train} to get in…), bench ({sit:bench})…'"""
    out: list[str] = []
    seen: set[str] = set()
    models = doc.get("models") or {}
    for o in doc.get("objects") or []:
        t = str(o.get("type", ""))
        opts = o.get("opts") or {}
        if t == "model":
            nm = str(opts.get("model") or "")
            if not nm or nm in seen:
                continue
            seen.add(nm)
            word = nm.replace("_", " ")
            m = models.get(nm) or {}
            abil = list(dict.fromkeys(list(m.get("abilities") or []) + _STARTER_ABIL.get(nm, [])))
            abil += [k for k, v in (o.get("traits") or {}).items() if v and k not in abil]
            verbs = [f"{{{_VERB[a]}:{word}}}" for a in abil if a in _VERB]
            if "enterable" in abil:
                verbs.append("{exit}")
            if opts.get("moves") == "arrive":
                verbs.insert(0, "it comes in at the start of the scene, waits, and leaves at the end")
                if "enterable" in abil:
                    verbs.append(f"after {{enter:{word}}} the NEXT scene can be \"# Scene: inside the {word} (sitting)\" to ride in it")
            if not verbs:
                verbs = [f"{{look:{word}}}"]
            out.append(f"{word} ({', '.join(verbs)})")
        elif t in _USES and t not in seen:
            seen.add(t)
            out.append(f"{LABELS.get(t, t).replace('a ', '', 1)} ({_USES[t]})")
        elif t == "animal":
            sp = str(opts.get("species") or "")
            if sp and sp not in seen:
                seen.add(sp)
                out.append(f"{sp}s ({{look:{sp}}})")
    if isinstance(doc.get("room"), dict):
        r = doc["room"]
        out.insert(0, "an INSIDE place" + (" that is moving (the world passes by outside the windows)" if r.get("moving") else ""))
    return "; ".join(out[:24])


def find_world(text: str) -> dict | None:
    """The saved world a scene's place means — by its exact name, or by meaning
    ("train station platform" → your "Railway Station")."""
    # "inside the train" means an INSIDE world (a room), never the station outside
    inside = bool(re.search(r"\b(inside|interior|room|kamra|kitchen|bedroom|classroom|ward|cabin|compartment)\b"
                            r"|\bin (?:the|a) (?:train|bus|car|plane|boat|coach|jeep|van|taxi)\b", str(text or "").lower()))
    best, best_s = None, 0.0
    for d in all_worlds():
        sc = world_score(text, d)
        if sc < 100 and inside != bool(d.get("room")):
            continue  # an outside world for an inside scene (or the other way round) only by its exact name
        if sc > best_s:
            best, best_s = d, sc
    return best if best_s >= 5 else None


def worlds_for_story(text: str) -> list[dict]:
    """Saved worlds that fit a story title / idea, best first."""
    out = [(world_score(text, d), d) for d in all_worlds()]
    return [d for s, d in sorted(out, key=lambda x: -x[0]) if s >= 5]


def prompt_lines(story: str = "") -> str:
    ws = all_worlds()
    if not ws:
        return ""
    text = ("Your own 3D worlds (write the world's EXACT name as a scene's place to use it, e.g. "
            f"\"Scene: {ws[0]['name']}\"): "
            + "; ".join(f"{d['name']} ({summary(d)})" for d in ws[:12]) + ". ")
    fit = worlds_for_story(story) if story else []
    if fit:
        text += (f"This story fits the world \"{fit[0]['name']}\": set most scenes there (place = \"{fit[0]['name']}\"). "
                 f"What is really there and what the characters can do with it: {uses(fit[0])}. Build the story AROUND these "
                 "things and use them often; do not talk about things that are not there (or bring them with {show:thing}). ")
    return text


def _clean(doc: dict, name: str) -> dict:
    objs = doc.get("objects")
    if not isinstance(objs, list):
        raise HTTPException(400, "A world needs a list of objects.")
    if len(objs) > MAX_OBJECTS:
        raise HTTPException(400, f"Too many objects (max {MAX_OBJECTS}).")
    clean = []
    for o in objs:
        if not isinstance(o, dict) or not re.match(r"^[a-z_]{2,30}$", str(o.get("type", ""))):
            continue
        item = {"id": str(o.get("id") or len(clean))[:40], "type": o["type"],
                "x": float(o.get("x") or 0), "z": float(o.get("z") or 0),
                "rot": float(o.get("rot") or 0), "scale": max(0.2, min(5.0, float(o.get("scale") or 1)))}
        if o.get("name"):
            item["name"] = str(o["name"])[:60]
        if isinstance(o.get("traits"), dict):
            item["traits"] = {str(k)[:30]: bool(v) for k, v in list(o["traits"].items())[:40]}
        if isinstance(o.get("opts"), dict):
            item["opts"] = {str(k)[:30]: (v if isinstance(v, (int, float, bool)) else str(v)[:60])
                            for k, v in list(o["opts"].items())[:20]}
        if isinstance(o.get("points"), list):
            item["points"] = [[float(p[0]), float(p[1])] for p in o["points"][:200]
                              if isinstance(p, (list, tuple)) and len(p) >= 2]
        clean.append(item)
    st = doc.get("stage") if isinstance(doc.get("stage"), dict) else {}
    extra = {}
    if doc.get("season") in ("spring", "summer", "autumn", "winter"):
        extra["season"] = doc["season"]
    if isinstance(doc.get("fog"), (int, float)):
        extra["fog"] = max(0.0, min(1.0, float(doc["fog"])))
    if isinstance(doc.get("models"), dict) and len(json.dumps(doc["models"])) < 600000:
        extra["models"] = {str(k)[:40]: v for k, v in list(doc["models"].items())[:60] if isinstance(v, dict)}
    if isinstance(doc.get("room"), dict):
        extra["room"] = {k: v for k, v in doc["room"].items() if isinstance(v, (int, float, bool, str))}
    if doc.get("fresh") is True:
        extra["fresh"] = True
    if doc.get("exact_place") is True:
        extra["exact_place"] = True
    if isinstance(doc.get("recipe"), dict) and len(json.dumps(doc["recipe"])) < 60000:
        extra["recipe"] = doc["recipe"]
    return {
        **extra,
        "version": 1, "name": name, "kind": str(doc.get("kind") or "plain")[:20],
        "ground": str(doc.get("ground") or "grass")[:12], "time": str(doc.get("time") or "day")[:10],
        "wind": max(0.0, min(1.0, float(doc.get("wind") if doc.get("wind") is not None else 0.5))),
        "weather": str(doc.get("weather") or "")[:8], "grass": max(0.0, min(1.0, float(doc.get("grass") if doc.get("grass") is not None else 1))),
        "objects": clean,
        "stage": {"x": float(st.get("x") or 0), "z": float(st.get("z") or 0), "rot": float(st.get("rot") or 0)},
        "updated": datetime.datetime.now().isoformat(timespec="seconds"),
    }


class AiRequest(BaseModel):
    prompt: str = Field(..., min_length=20, max_length=30000)


def _free_ai(prompt: str) -> str:
    """The free AI (Pollinations, no key) — the same one that writes stories."""
    import urllib.request
    body = json.dumps({"model": "openai", "messages": [{"role": "user", "content": prompt}],
                       "private": True}).encode("utf-8")
    req = urllib.request.Request("https://text.pollinations.ai/openai", data=body,
                                 headers={"Content-Type": "application/json", "User-Agent": "YTGuru/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            data = json.loads(res.read().decode("utf-8", "ignore"))
        return str(data["choices"][0]["message"]["content"])
    except Exception:  # noqa: BLE001 — try the simple way
        import tools_animator
        return tools_animator._ask_ai(prompt[:6000])


@router.post("/ai")
def describe_with_ai(payload: AiRequest) -> dict:
    """Your description → a world recipe (JSON), written by the free AI."""
    try:
        return {"text": _free_ai(payload.prompt)}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"The free AI is busy or not reachable ({str(exc)[:120]}). "
                                 "Use 'Copy prompt for ChatGPT' instead.") from exc


# ---- "My things": objects designed from shapes, kept for every world
MODELS_FILE = WORLDS_DIR / "_my_things.json"


def _models() -> dict:
    try:
        d = json.loads(MODELS_FILE.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


@router.get("/_things")
def list_things() -> dict:
    return {"models": _models()}


@router.put("/_things/{name}")
def save_thing(name: str, model: dict) -> dict:
    name = re.sub(r"[^a-z0-9_ -]+", "", str(name).lower()).strip()[:40]
    if not name or not isinstance(model.get("parts"), list) or not model["parts"]:
        raise HTTPException(400, "A thing needs a name and parts.")
    if len(json.dumps(model)) > 200000:
        raise HTTPException(400, "Too big.")
    d = _models()
    d[name] = model
    WORLDS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_FILE.write_text(json.dumps(d), encoding="utf-8")
    return {"ok": True, "name": name}


@router.delete("/_things/{name}")
def delete_thing(name: str) -> dict:
    d = _models()
    d.pop(name, None)
    if WORLDS_DIR.is_dir():
        MODELS_FILE.write_text(json.dumps(d), encoding="utf-8")
    return {"ok": True}


@router.get("")
def list_worlds(story: str = "") -> dict:
    fit = {d["name"] for d in worlds_for_story(story)} if story else set()
    return {"worlds": [{"name": d["name"], "kind": d.get("kind", ""), "objects": len(d.get("objects") or []),
                        "summary": summary(d), "uses": uses(d), "updated": d.get("updated", ""), "fits": d["name"] in fit}
                       for d in all_worlds()]}


@router.get("/{name}")
def get_world(name: str) -> dict:
    d = _read(_path(name))
    if not d:
        raise HTTPException(404, "World not found.")
    return d


@router.put("/{name}")
def save_world(name: str, doc: dict) -> dict:
    name = re.sub(r"\s+", " ", str(name)).strip()[:60]
    if len(name) < 2:
        raise HTTPException(400, "Give the world a name (2+ letters).")
    data = _clean(doc, name)
    WORLDS_DIR.mkdir(parents=True, exist_ok=True)
    _path(name).write_text(json.dumps(data, indent=1), encoding="utf-8")
    return {"ok": True, "name": name, "objects": len(data["objects"])}


@router.delete("/{name}")
def delete_world(name: str) -> dict:
    p = _path(name)
    if p.exists():
        p.unlink()
    return {"ok": True}


# ---- a reference PICTURE -> a world (user, 2026-11-18: "I give a picture, it
# builds that kind of place"). A free vision AI reads the picture into a
# short plan; the browser builds it from the detailed place blueprints.
class ImageRequest(BaseModel):
    image: str = Field(..., min_length=100, max_length=8_000_000)  # data:image/…;base64,…
    places: list[dict] = Field(default_factory=list)  # [{id, label}] the blueprints the browser has
    gemini_key: str = Field("", max_length=100)
    note: str = Field("", max_length=500)


def image_prompt(places: list[dict], note: str = "") -> str:
    ids = "; ".join(f'{p.get("id")} = {p.get("label")}' for p in places[:60])
    return (
        "Look at this picture of a place. I will build a 3D cartoon environment that looks like it. "
        f"Pick the closest place type from this list (use its id): {ids}. "
        + (f"The user says: {note}. " if note else "")
        + 'Reply with ONLY JSON, no other text: {"blueprint":"<id>","name":"short name for this place",'
        '"time":"day|sunset|night","palette":["#hex colours of the main buildings / walls / things, 4 to 8"],'
        '"density":0.6 to 1.6 (how full / crowded it is),"extra":["up to 8 simple English names of things clearly in the picture '
        '(lamp post, bench, tree, car, bus, fountain, umbrella, flower pot, sign, bicycle …)"],'
        '"description":"one sentence"}'
    )


def _vision(prompt: str, image: str, gemini_key: str) -> str:
    """Ask a picture-reading AI. Tries several free ones; the errors are told plainly."""
    import urllib.error
    import urllib.request
    m = re.match(r"data:(image/[a-z+]+);base64,(.+)$", image, re.S)
    if not m:
        raise HTTPException(400, "That is not a picture.")
    mime, b64 = m.group(1), m.group(2)
    errors: list[str] = []

    def post(url: str, body: dict, headers: dict | None = None) -> dict:
        req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                     headers={"Content-Type": "application/json", "User-Agent": "YTGuru/1.0", **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                return json.loads(res.read().decode("utf-8", "ignore"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")[:200]
            raise RuntimeError(f"{exc.code} {detail}") from exc

    # 1) Gemini (your free key from aistudio.google.com) — the newest model names first
    if gemini_key.strip():
        for model in ("gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash-lite"):
            try:
                data = post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key="
                            + urllib.request.quote(gemini_key.strip()),
                            {"contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": mime, "data": b64}}]}],
                             "generationConfig": {"temperature": 0.4}})
                text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
                if text.strip():
                    return text
            except Exception as exc:  # noqa: BLE001
                errors.append(f"Gemini {model}: {str(exc)[:120]}")
    else:
        errors.append("no Gemini key (Animator → Gemini API key)")
    # 2) Pollinations (no key)
    for model in ("openai", "openai-fast", "openai-large", "gemini"):
        try:
            data = post("https://text.pollinations.ai/openai", {"model": model, "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": image}}]}]})
            text = str(data["choices"][0]["message"]["content"])
            if text.strip():
                return text
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Pollinations {model}: {str(exc)[:120]}")
    raise RuntimeError(" | ".join(errors)[:600])


@router.post("/from_image")
def from_image(payload: ImageRequest) -> dict:
    try:
        text = _vision(image_prompt(payload.places, payload.note), payload.image, payload.gemini_key)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"No picture AI answered ({str(exc)[:500]}).") from exc
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise HTTPException(502, "The AI did not describe the picture. Try again or use ChatGPT.")
    try:
        plan = json.loads(m.group(0))
    except ValueError as exc:
        raise HTTPException(502, "The AI answer was broken. Try again.") from exc
    return {"plan": plan, "text": text}


@router.post("/image_prompt")
def get_image_prompt(payload: dict) -> dict:
    return {"prompt": image_prompt(payload.get("places") or [], str(payload.get("note") or ""))}
