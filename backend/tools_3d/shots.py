"""YT Guru — 3D Explainer shot list: schema, defaults, validation (user, 2026-11-28).

A shot list is a plain JSON list of shots. Each shot::

    {id, template, duration, narration, params{}, say?,
     labels[{text, anchor, t0, t1}],
     cards[{value, unit, sub, t0, t1}],
     camera{}, transition_in: cut|fade|zoom}

``validate_shotlist`` never raises on bad user/AI input: it returns
``(clean_shots, errors)`` where clean shots have defaults filled in
and errors are human-readable strings (one per problem). Pure
python, no third-party deps, so it is unit-testable anywhere.
"""
from __future__ import annotations

import copy

TRANSITIONS = ("cut", "fade", "zoom")
ANCHORS = ("top", "bottom", "left", "right", "center")

# Per-template parameter specs: name -> (type, default, help).
# Types: "str", "num", "bool", "list".
TEMPLATES: dict[str, dict] = {
    "globe": {
        "label": "Spinning globe",
        "params": {
            "lat": ("num", 20.0, "Fly-to latitude"),
            "lon": ("num", 30.0, "Fly-to longitude"),
            "zoom": ("num", 1.6, "Fly-to zoom (1 = whole earth)"),
            "spinSpeed": ("num", 0.05, "Spin speed"),
            "textureUrl": ("str", "", "Day texture URL (optional, NASA Blue Marble)"),
            "textureUrlNight": ("str", "", "Night-lights texture URL (optional)"),
            "countriesUrl": ("str", "", "Countries GeoJSON URL (optional, Natural Earth)"),
            "highlightCountries": ("str", "", "Countries to highlight (comma names)"),
            "routes": ("list", [], "Glowing routes: [{from:{lat,lon,label}, to:{lat,lon,label}}]"),
        },
        "example": {"template": "globe", "duration": 6,
                    "narration": "Trade routes circle the whole planet.",
                    "params": {"lat": 25, "lon": 55, "zoom": 1.8,
                               "routes": [{"from": {"lat": 31.5, "lon": 74.3, "label": "Lahore"},
                                           "to": {"lat": 51.5, "lon": -0.1, "label": "London"}}]}},
    },
    "map_zoom": {
        "label": "Map zoom",
        "params": {
            "lat": ("num", 31.5, "Target latitude"),
            "lon": ("num", 74.3, "Target longitude"),
            "place": ("str", "", "Place name shown at the target"),
            "textureUrl": ("str", "", "Map texture URL (optional)"),
        },
        "example": {"template": "map_zoom", "duration": 5,
                    "narration": "Zoom in on the port city.",
                    "params": {"lat": 24.8, "lon": 67.0, "place": "Karachi"}},
    },
    "hero_object": {
        "label": "Hero object",
        "params": {
            "model": ("str", "phone", "Procedural model: phone|chip|ship|box|cable|server"),
            "modelUrl": ("str", "", "glTF/GLB model URL (optional, CC0 assets)"),
            "color": ("str", "#35c4ff", "Body colour"),
            "orbit": ("num", 0.6, "Orbit amount 0..1"),
        },
        "example": {"template": "hero_object", "duration": 5,
                    "narration": "This is the machine at the centre of it.",
                    "params": {"model": "phone", "orbit": 0.6},
                    "labels": [{"text": "Your phone", "anchor": "center"}]},
    },
    "cutaway": {
        "label": "Cutaway / exploded view",
        "params": {
            "model": ("str", "cable", "Model to open: cable|phone|ship|chip|server"),
            "parts": ("str", "", "Part names, comma separated (labels)"),
            "explode": ("num", 1.0, "Explode amount 0..1"),
        },
        "example": {"template": "cutaway", "duration": 6,
                    "narration": "Inside the cable, glass fibres carry the light.",
                    "params": {"model": "cable", "parts": "Jacket, Armour, Glass fibres", "explode": 1}},
    },
    "macro_flyover": {
        "label": "Macro flyover",
        "params": {
            "boardColor": ("str", "#0b3d2e", "Circuit board colour"),
            "speed": ("num", 1.0, "Flight / packet speed multiplier"),
        },
        "example": {"template": "macro_flyover", "duration": 6,
                    "narration": "Across the board, a packet of light races on.",
                    "params": {"speed": 1.0}},
    },
    "underwater": {
        "label": "Underwater scene",
        "params": {
            "depth": ("num", 0.6, "Depth feel (fog) 0..1"),
            "fish": ("num", 7, "Fish count"),
            "repeaters": ("num", 4, "Repeater boxes on the cable"),
        },
        "example": {"template": "underwater", "duration": 6,
                    "narration": "On the sea floor, the cable runs for thousands of miles.",
                    "params": {"depth": 0.6, "fish": 7, "repeaters": 4}},
    },
    "city_aerial": {
        "label": "City aerial",
        "params": {
            "blocks": ("num", 9, "City blocks across"),
            "night": ("num", 1, "Night look 0/1"),
        },
        "example": {"template": "city_aerial", "duration": 6,
                    "narration": "From above, the city's grid lights up.",
                    "params": {"blocks": 9, "night": 1}},
    },
    "data_card": {
        "label": "Data card",
        "params": {
            "title": ("str", "", "Title card text (optional, 1-4 words)"),
            "value": ("str", "", "The one big number"),
            "unit": ("str", "", "Unit / line under the number"),
            "sub": ("str", "", "Small print (optional)"),
        },
        "example": {"template": "data_card", "duration": 4,
                    "narration": "Output doubled in a single year.",
                    "params": {"value": "2x", "unit": "in one year"},
                    "cards": [{"value": "2x", "unit": "", "sub": "in one year",
                               "t0": 0.5, "t1": 3.5}]},
    },

}

CAMERA_DEFAULTS = {"distance": "medium", "angle": "eye", "move": "slow_push"}
CAMERA_DISTANCES = ("wide", "medium", "close")


def _num(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def apply_defaults(shot: dict, index: int = 0) -> dict:
    """Return a copy of ``shot`` with every default filled in."""
    out = copy.deepcopy(shot) if isinstance(shot, dict) else {}
    out.setdefault("id", f"shot-{index + 1}")
    out["template"] = str(out.get("template") or "")
    out["duration"] = _num(out.get("duration"), 0)
    out["narration"] = str(out.get("narration") or "")
    params = dict(out.get("params") or {}) if isinstance(out.get("params"), dict) else {}
    spec = TEMPLATES.get(out["template"], {}).get("params", {})
    for name, (_kind, default, _help) in spec.items():
        params.setdefault(name, default)
    out["params"] = params
    camera = dict(CAMERA_DEFAULTS)
    if isinstance(out.get("camera"), dict):
        camera.update({k: v for k, v in out["camera"].items() if v not in (None, "")})
    out["camera"] = camera
    out["transition_in"] = out.get("transition_in") or ("cut" if index == 0 else "fade")
    out["labels"] = _clean_labels(out.get("labels"))
    out["cards"] = _clean_cards(out.get("cards"), out["duration"])
    if out.get("say"):
        out["say"] = str(out["say"])
    return out


def _clean_labels(raw) -> list:
    labels = []
    for item in raw or []:
        if not isinstance(item, dict) or not str(item.get("text") or "").strip():
            continue
        labels.append({
            "text": str(item["text"]).strip(),
            "anchor": item.get("anchor") if item.get("anchor") in ANCHORS else "top",
            "t0": _num(item.get("t0"), 0.0),
            "t1": _num(item.get("t1"), 0.0),
        })
    return labels


def _clean_cards(raw, duration: float) -> list:
    cards = []
    for item in raw or []:
        if not isinstance(item, dict) or str(item.get("value") or "") == "":
            continue
        cards.append({
            "value": str(item["value"]),
            "unit": str(item.get("unit") or ""),
            "sub": str(item.get("sub") or ""),
            "t0": _num(item.get("t0"), 0.0),
            "t1": _num(item.get("t1"), duration or 0.0),
        })
    return cards


def validate_shotlist(data) -> tuple[list, list]:
    """Validate + normalise a shot list. Returns (clean_shots, errors)."""
    errors: list[str] = []
    if isinstance(data, dict) and isinstance(data.get("shots"), list):
        data = data["shots"]
    if not isinstance(data, list):
        return [], ["Shot list must be a JSON list of shots."]
    if not data:
        return [], ["Shot list is empty."]
    clean = []
    for i, raw in enumerate(data):
        where = f"Shot {i + 1}"
        if not isinstance(raw, dict):
            errors.append(f"{where}: not an object.")
            continue
        shot = apply_defaults(raw, i)
        template = shot["template"]
        if template not in TEMPLATES:
            errors.append(
                f"{where}: unknown template {template!r} "
                f"(choose one of: {', '.join(TEMPLATES)}).")
        if shot["duration"] <= 0:
            errors.append(f"{where}: duration must be greater than 0.")
        if shot["transition_in"] not in TRANSITIONS:
            errors.append(
                f"{where}: transition_in must be one of {', '.join(TRANSITIONS)}.")
        spec = TEMPLATES.get(template, {}).get("params", {})
        for name, value in shot["params"].items():
            if name in spec and spec[name][0] == "num" and not isinstance(
                    value, (int, float)):
                shot["params"][name] = _num(value, spec[name][1])
        for lab in shot["labels"]:
            if lab["t1"] and lab["t1"] < lab["t0"]:
                errors.append(f"{where}: label {lab['text']!r} ends before it starts.")
        clean.append(shot)
    return clean, errors


def variety_warnings(shots: list) -> list[str]:
    """Soft warnings only (user, 2026-11-28): variety keeps viewers watching.

    - the same template more than 2 shots in a row;
    - the camera distance never changing between neighbouring shots.
    """
    warnings: list[str] = []
    run_template, run_len = None, 0
    prev_distance = None
    same_distance_run = 0
    for i, shot in enumerate(shots or []):
        template = shot.get("template")
        if template == run_template:
            run_len += 1
        else:
            run_template, run_len = template, 1
        if run_len == 3:
            warnings.append(
                f"Shots {i - 1}–{i + 1}: template {template!r} used more than "
                "2 times in a row — vary the visuals.")
        distance = (shot.get("camera") or {}).get("distance")
        if distance == prev_distance:
            same_distance_run += 1
        else:
            prev_distance, same_distance_run = distance, 1
        if same_distance_run == 3:
            warnings.append(
                f"Shots {i - 1}–{i + 1}: camera distance stays {distance!r} — "
                "change the camera distance between shots.")
    return warnings
