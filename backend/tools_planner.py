"""Script Planner + Add-on packs (user, 2026-11-19).

"I paste my planned script; the app tells me exactly what it cannot show
yet; I get ONE prompt for ChatGPT / Gemini; it gives me a file; I upload
the file in the app; then my video is made exactly as written — without
a code update every time."

  POST /api/animator/planner/check     {script}  -> every place / tag / thing / outfit / sound, and its status
  GET  /api/animator/planner/pack                 -> what the installed add-on packs added
  POST /api/animator/planner/install   {pack}    -> save an add-on pack (actions, outfits, cast looks,
                                                      tag meanings, sounds, 3D things). Places (3D worlds)
                                                      are built in the browser from their recipe and saved
                                                      with /api/worlds/{name}.
  DELETE /api/animator/planner/pack/{kind}/{name} -> remove one thing a pack added

An add-on pack is DATA only (never code), checked here before it is saved,
so a wrong file can never break the app.
"""
from __future__ import annotations

import datetime
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/animator/planner", tags=["planner"])


def _ta():
    import tools_animator
    return tools_animator


def _pack_file() -> Path:
    return _ta().BASE_DIR / "animator_pack.json"


_EMPTY = {"outfits": {}, "cast": {}, "aliases": {}, "sounds": {}, "packs": []}


_CACHE: dict = {"mtime": None, "data": None}


def pack() -> dict:
    f = _pack_file()
    try:
        mt = f.stat().st_mtime
    except OSError:
        mt = None
    if mt is None:
        return json.loads(json.dumps(_EMPTY))
    if _CACHE["mtime"] != mt:
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            d = d if isinstance(d, dict) else {}
        except (OSError, ValueError):
            d = {}
        _CACHE.update(mtime=mt, data={**json.loads(json.dumps(_EMPTY)), **{k: v for k, v in d.items() if k in _EMPTY}})
    return json.loads(json.dumps(_CACHE["data"]))


def _save(d: dict) -> None:
    _pack_file().write_text(json.dumps(d, indent=1), encoding="utf-8")
    _CACHE["mtime"] = None


def apply_sounds() -> None:
    """New sound effects from packs become real sound names (found on Freesound with your key)."""
    ta = _ta()
    for name, query in (pack().get("sounds") or {}).items():
        if isinstance(query, str) and query.strip():
            ta.SFX_QUERIES[name] = query.strip()
            if name not in ta.SFX_NAMES:
                ta.SFX_NAMES.append(name)


def aliases() -> dict:
    return {k: v for k, v in (pack().get("aliases") or {}).items() if isinstance(v, str)}


# ---------------------------------------------------------------- outfits
TOPS = ["tshirt", "shirt", "checks", "kurta", "jacket", "police"]
BOTTOMS = ["jeans", "trousers", "shorts", "shalwar", "skirt"]
HATS = ["none", "cap", "police", "beanie", "topi"]
SHOES = ["sneakers", "shoes", "slippers"]
ACCESSORIES = ["glasses", "sunglasses", "mustache", "beard", "chain"]
HAIRS = ["none", "spiky", "short", "side", "curly", "long", "bun"]
SKINS = ["#ffffff", "#f6d7b8", "#e9b98f", "#c98c5a", "#8d5524", "#5c3a21"]
_BUILTIN_OUTFIT = re.compile(r"jacket|leather|biker|suit|tux|formal|police|cop|uniform|vice|beach|flower|hawaii|normal|default|own", re.I)
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def _look(spec: dict, cast: bool = False) -> dict:
    """An outfit / a person's look, keeping only values the 3D people really have."""
    out: dict = {}
    for key, allowed in (("top", TOPS), ("bottom", BOTTOMS), ("hat", HATS), ("shoes", SHOES)) + ((("hair", HAIRS),) if cast else ()):
        v = str(spec.get(key) or "").lower().strip()
        if v in allowed:
            out[key] = v
    for key in ("topColor", "top2Color", "bottomColor", "hatColor", "shoeColor") + (("hairColor",) if cast else ()):
        v = str(spec.get(key) or "").strip()
        if _HEX.match(v):
            out[key] = v.lower()
    if cast:
        v = str(spec.get("skin") or "").strip().lower()
        if v in SKINS:
            out["skin"] = v
        if isinstance(spec.get("female"), bool):
            out["female"] = spec["female"]
    for key in ("add", "remove"):
        vals = [str(a).lower() for a in (spec.get(key) or []) if str(a).lower() in ACCESSORIES]
        if vals:
            out[key] = vals
    return out


def _outfit_known(name: str) -> bool:
    return name.lower() in (pack().get("outfits") or {}) or bool(_BUILTIN_OUTFIT.search(name))


# ---------------------------------------------------------------- check
_CAMERA = {"closeup", "close-up", "close", "wide", "zoom-in", "zoom-out", "camera"}
_WEAR = {"wear", "dress", "put-on", "change-clothes", "outfit"}
_LINE_RE = re.compile(r"^([^:：#]{1,40})[:：]\s*(.+)$")


def _exact(verb: str) -> bool:
    ta = _ta()
    return (verb in ta.ACTIONS or verb in ta.WORLD_ACTS or verb in ta.MORPH_VERBS or bool(ta._custom_of(verb))
            or verb in ta.WORLD_ALIASES or verb.startswith("show") or verb in _CAMERA or verb in ta.TONE_TAGS
            or verb in _WEAR or bool(ta._species_word(verb)) or verb in aliases() or verb in ("become", "turn")
            or verb in ta.INSERT_TAGS)


def _shown_as(segs: list[dict]) -> str:
    for s in segs:
        if s.get("act"):
            return "{" + s["act"] + "}"
        if s.get("wact"):
            return "{" + s["wact"] + (":" + s["obj"] if s.get("obj") else "") + "}"
        if s.get("tone"):
            return f"a {s['tone']} voice"
    return ""


class CheckRequest(BaseModel):
    script: str = Field(..., min_length=5, max_length=200000)


@router.post("/check")
def check(req: CheckRequest) -> dict:
    ta = _ta()
    apply_sounds()
    names: dict[str, str] = {}
    for raw_line in req.script.splitlines():
        m = _LINE_RE.match(raw_line.replace("**", "").strip().lstrip("*>-").strip())
        if m and re.search(r"[A-Za-z]{2,}", m.group(1)) and not re.match(r"^\s*(scene|time\s*skip)", m.group(1), re.I):
            names.setdefault(m.group(1).strip().lower(), m.group(1).strip())
    chars = [{"id": k, "name": v, "voice": {}} for k, v in names.items()]
    try:
        story = ta.parse_custom_script(req.script, chars)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    tags: dict[str, dict] = {}
    things: dict[str, dict] = {}
    outfits: dict[str, dict] = {}
    speakers: dict[str, int] = {}
    screens = 0
    graphics = 0

    def note_thing(word: str, verb: str, where: dict) -> None:
        w = re.sub(r"\s+", " ", str(word or "").lower()).strip(" .,!?")
        w = re.sub(r"^(?:the|a|an|my|your|his|her|our|their)\s+", "", w)
        if not w or len(w) < 2:
            return
        t = things.setdefault(w, {"word": w, "verbs": [], "count": 0, "example": where})
        t["count"] += 1
        if verb and verb not in t["verbs"]:
            t["verbs"].append(verb)

    for si, sc in enumerate(story):
        if sc.get("holding"):
            for item in set(sc["holding"].values()):
                note_thing(item, "hold", {"scene": si, "line": 0, "text": f"(scene {si + 1} holds {item})"})
        for li, ln in enumerate(sc.get("lines") or []):
            speakers[ln["speaker"]] = speakers.get(ln["speaker"], 0) + 1
            where = {"scene": si, "line": li, "text": f"{names.get(ln['speaker'], ln['speaker'])}: {ln['text']}"[:220]}
            raw = ln.get("text") or ""
            screens += len(ta._SCREEN_RE.findall(raw))
            graphics += len(ta._INSERT_RE.findall(raw))
            for m in ta._TAG_RE.finditer(ta._INSERT_RE.sub(" ", ta._SCREEN_RE.sub(" ", raw))):
                inner = re.sub(r"\s+", " ", m.group(1).lower().replace("_", " ")).strip()
                verb, _, obj = inner.partition(":")
                verb, obj = verb.strip(), obj.strip()
                segs = ta._segments("{" + m.group(1) + "}")
                if verb in _WEAR:
                    name = obj or "vice"
                    o = outfits.setdefault(name, {"name": name, "count": 0, "example": where,
                                                  "status": "ok" if _outfit_known(name) else "near",
                                                  "shown_as": "" if _outfit_known(name) else "the loud Vice shirt look"})
                    o["count"] += 1
                    continue
                key = verb if not obj or verb in ta.ACTIONS else f"{verb}:{obj}"
                t = tags.get(key)
                if t is None:
                    if any(s.get("unknown") for s in segs):
                        status, shown = "missing", ""
                    elif _exact(verb.replace(" ", "-")) or _exact(verb.split(" ")[0]):
                        status, shown = "ok", ""
                    else:
                        status, shown = "near", _shown_as(segs)
                    t = tags[key] = {"tag": "{" + inner + "}", "verb": verb, "obj": obj, "status": status,
                                     "shown_as": shown, "count": 0, "example": where}
                t["count"] += 1
                for s in segs:
                    if s.get("wact") and s.get("obj"):
                        note_thing(s["obj"], s["wact"], where)
                    elif s.get("show"):
                        note_thing(s["show"], "show", where)
    # [..] words that mean nothing (a sound the app does not have yet…)
    sounds: dict[str, dict] = {}
    known = set(ta.EXPRESSIONS) | set(ta.POSES) | set(ta.TONES) | set(ta.SFX_NAMES) | {a for a in ta.ACTIONS if not a.startswith("w-")}
    for raw_line in req.script.splitlines():
        line = raw_line.replace("**", "").strip()
        m = _LINE_RE.match(line)
        if not m:
            continue
        tag = re.search(r"\[([^\]]*)\]\s*$", m.group(2))
        if not tag:
            continue
        for word in re.split(r"[,\s]+", tag.group(1).lower()):
            word = word.replace("sfx:", "").strip()
            if word and word not in known:
                s = sounds.setdefault(word, {"word": word, "count": 0, "example": line[:200]})
                s["count"] += 1
    scenes = [{"i": i, "location": sc.get("location") or "", "place": sc.get("place") or "", "clock": sc.get("clock") or "",
               "world": sc.get("world") or "", "world_exact": bool(sc.get("world_exact")), "lines": len(sc.get("lines") or [])}
              for i, sc in enumerate(story)]
    p = pack()
    saved: set[str] = set()
    try:  # your own characters (Character Studio) already have their look
        for f in ta.CHAR_DIR.glob("*.json"):
            try:
                saved.add(str(json.loads(f.read_text(encoding="utf-8")).get("name") or "").strip().lower())
            except (OSError, ValueError):
                continue
    except OSError:
        pass
    return {"scenes": scenes, "tags": sorted(tags.values(), key=lambda t: ({"missing": 0, "near": 1, "ok": 2}[t["status"]], -t["count"])),
            "things": sorted(things.values(), key=lambda t: -t["count"]),
            "outfits": list(outfits.values()), "sounds": list(sounds.values()),
            "speakers": [{"name": names.get(n, n), "lines": c, "look": names.get(n, n) in (p.get("cast") or {}),
                          "saved": names.get(n, n).lower() in saved, "animal": bool(ta._species_word(names.get(n, n).lower()))} for n, c in sorted(speakers.items(), key=lambda x: -x[1])],
            "screens": screens, "graphics": graphics, "lines": sum(len(sc.get("lines") or []) for sc in story)}


# ---------------------------------------------------------------- install
def _clean_action(name: str, a: dict) -> dict:
    ta = _ta()
    try:
        act = ta.CustomAction(**{k: v for k, v in a.items() if k in ta.CustomAction.model_fields}).model_dump()
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"action {name}: {str(exc)[:160]}") from exc
    act["words"] = [str(w).lower()[:30] for w in act.get("words") or []][:12]
    act["body"] = act["body"] if act["body"] in ("stand", "kneel", "crouch", "sit", "lie") else "stand"
    act["arms"] = act["arms"] if act["arms"] in ("work", "hammer", "reach", "point", "up", "wave", "drive", "none") else "work"
    act["effect"] = act["effect"] if act["effect"] in ("", "sparks", "smoke", "fire", "dust", "sparkle", "splash") else ""
    act["change"] = act["change"] if act["change"] in ("", "break", "fix", "fall", "hide", "show", "glow", "color") else ""
    if act["sound"] and act["sound"] not in ta.SFX_NAMES:
        act["sound"] = ""
    return act


def _name(n: str, size: int = 40) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 _-]+", "", str(n).lower())).strip()[:size]


class InstallRequest(BaseModel):
    pack: dict
    places_saved: list[str] = Field(default_factory=list)  # worlds the browser already built and saved


@router.post("/install")
def install(req: InstallRequest) -> dict:
    ta = _ta()
    src = req.pack
    if not isinstance(src, dict):
        raise HTTPException(400, "The file is not an add-on pack.")
    errors: list[str] = []
    added: dict[str, list[str]] = {"actions": [], "outfits": [], "cast": [], "aliases": [], "sounds": [], "things": []}
    d = pack()
    # sounds first, so actions may use them
    for n, q in (src.get("sounds") or {}).items():
        n = _name(n, 24).replace(" ", "-")
        q = str(q.get("search") if isinstance(q, dict) else q or "").strip()[:80]
        if n and q:
            d["sounds"][n] = q
            added["sounds"].append(n)
    _save(d)
    apply_sounds()
    # actions -> the same file the Action Builder uses
    acts = src.get("actions") or {}
    if acts:
        try:
            mine = json.loads(ta.ACTIONS_FILE.read_text(encoding="utf-8"))
            mine = mine if isinstance(mine, dict) else {}
        except (OSError, ValueError):
            mine = {}
        for n, a in acts.items():
            n = _name(n, 30).replace(" ", "-")
            if not n or not isinstance(a, dict):
                continue
            if n in ta.ACTIONS or n in ta.WORLD_ACTS:
                errors.append(f"action {n}: that name is already a built-in action (kept the built-in one)")
                continue
            try:
                mine[n] = _clean_action(n, a)
                added["actions"].append(n)
            except ValueError as exc:
                errors.append(str(exc))
        ta.ACTIONS_FILE.write_text(json.dumps(mine, indent=1), encoding="utf-8")
    for n, o in (src.get("outfits") or {}).items():
        n = _name(n, 30)
        if n and isinstance(o, dict):
            look = _look(o)
            if look:
                d["outfits"][n] = look
                added["outfits"].append(n)
            else:
                errors.append(f"outfit {n}: nothing usable in it")
    for n, o in (src.get("cast") or {}).items():
        n = re.sub(r"\s+", " ", str(n)).strip()[:40]
        if n and isinstance(o, dict):
            look = _look(o, cast=True)
            if look:
                d["cast"][n] = look
                added["cast"].append(n)
    for n, target in (src.get("aliases") or {}).items():
        n = _name(n, 30).replace(" ", "-")
        target = re.sub(r"[{}]", "", str(target or "")).strip().lower()[:60]
        if not n or not target:
            continue
        tv = target.partition(":")[0].strip()
        if _exact(tv) or tv in d["sounds"]:
            d["aliases"][n] = target
            added["aliases"].append(n)
        else:
            errors.append(f"tag {{{n}}}: '{target}' is not something the app knows")
    things = src.get("things") or src.get("models") or {}
    if things:
        import tools_worlds
        for n, m in things.items():
            try:
                res = tools_worlds.save_thing(n, m if isinstance(m, dict) else {})
                added["things"].append(res["name"])
            except HTTPException as exc:
                errors.append(f"thing {n}: {exc.detail}")
    d["packs"] = [p for p in d.get("packs") or [] if p.get("name") != src.get("name")] + [{
        "name": str(src.get("name") or "Add-on pack")[:60],
        "installed": datetime.datetime.now().isoformat(timespec="seconds"),
        "counts": {**{k: len(v) for k, v in added.items()}, "places": len(req.places_saved)}}]
    d["packs"] = d["packs"][-30:]
    _save(d)
    return {"added": {**added, "places": req.places_saved}, "errors": errors}


@router.get("/pack")
def get_pack() -> dict:
    ta = _ta()
    d = pack()
    mine: dict = {}
    try:
        mine = json.loads(ta.ACTIONS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass
    return {**d, "actions": sorted(mine) if isinstance(mine, dict) else []}


@router.delete("/pack/{kind}/{name}")
def remove(kind: str, name: str) -> dict:
    d = pack()
    if kind in ("outfits", "cast", "aliases", "sounds"):
        d[kind].pop(name, None)
        _save(d)
        if kind == "sounds":
            ta = _ta()
            ta.SFX_QUERIES.pop(name, None)
            if name in ta.SFX_NAMES:
                ta.SFX_NAMES.remove(name)
        return {"ok": True}
    raise HTTPException(400, "Use the Action Builder / 3D World Designer to remove actions, things and places.")


def player_pack() -> dict:
    """What the video player needs: outfits and the looks of side characters."""
    d = pack()
    return {"outfits": d.get("outfits") or {}, "cast": d.get("cast") or {}}
