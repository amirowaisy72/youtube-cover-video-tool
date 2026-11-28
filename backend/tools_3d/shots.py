"""YT Guru — 3D Explainer shot list: schema, defaults, validation (user, 2026-11-28).

A shot list is a plain JSON list of shots. Each shot::

    {id, template, duration, narration, visualizes, params{}, say?,
     labels[{text, anchor, t0, t1}],
     cards[{value, unit, sub, t0, t1}],
     chips[{text, sub, corner: top-right|top-left, t0, t1}],
     camera{}, cameraPath[{at, pos[x, y, z], lookAt[x, y, z]}],
     transition_in: cut|fade|zoom}

``validate_shotlist`` never raises on bad user/AI input: it returns
``(clean_shots, errors)`` where clean shots have defaults filled in
and errors are human-readable strings (one per problem). Pure
python, no third-party deps, so it is unit-testable anywhere.
"""
from __future__ import annotations

import copy

TRANSITIONS = ("cut", "fade", "zoom")
ANCHORS = ("top", "bottom", "left", "right", "center")
CHIP_CORNERS = ("top-right", "top-left")

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
                    "visualizes": "Trade routes circle the whole planet.",
                    "params": {"lat": 25, "lon": 55, "zoom": 1.8,
                               "routes": [{"from": {"lat": 31.5, "lon": 74.3, "label": "Lahore"},
                                           "to": {"lat": 51.5, "lon": -0.1, "label": "London"}}]},
                    "chips": [{"text": "99%", "sub": "of intercontinental data",
                               "corner": "top-right", "t0": 2}]},
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
                    "visualizes": "Zoom in on the port city.",
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
                    "visualizes": "This is the machine at the centre of it.",
                    "params": {"model": "phone", "orbit": 0.6},
                    "labels": [{"text": "Your phone", "anchor": "center"}]},
    },
    "cutaway": {
        "label": "Cutaway / exploded view",
        "params": {
            "model": ("str", "cable", "Model to open: cable|phone|ship|chip|server"),
            "parts": ("str", "", "Part names, comma separated (labels)"),
            "explode": ("num", 1.0, "Explode amount 0..1"),
            "compare": ("str", "", "Comparison object next to the model, e.g. 'hair' for a human hair beside a cable"),
        },
        "example": {"template": "cutaway", "duration": 6,
                    "narration": "Layer by layer, the cable is built to protect the glass fibres inside.",
                    "visualizes": "Layer by layer, the cable is built to protect the glass fibres inside.",
                    "params": {"model": "cable",
                               "parts": "Jacket, Copper tube, Steel wires, Gel, Optical fibres",
                               "explode": 1, "compare": "hair"}},
    },
    "macro_flyover": {
        "label": "Macro flyover",
        "params": {
            "boardColor": ("str", "#0b3d2e", "Circuit board colour"),
            "speed": ("num", 1.0, "Flight / packet speed multiplier"),
            "travelLabel": ("str", "", "Text carried on the travelling packet"),
            "follow": ("num", 1, "Camera follows the packet 0/1"),
        },
        "example": {"template": "macro_flyover", "duration": 6,
                    "narration": "Across the board, a packet of light races on.",
                    "visualizes": "Across the board, a packet of light races on.",
                    "params": {"speed": 1.0, "travelLabel": "To: London", "follow": 1}},
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
                    "visualizes": "On the sea floor, the cable runs for thousands of miles.",
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
                    "visualizes": "From above, the city's grid lights up.",
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
                    "visualizes": "Output doubled in a single year.",
                    "params": {"value": "2x", "unit": "in one year"},
                    "cards": [{"value": "2x", "unit": "", "sub": "in one year",
                               "t0": 0.5, "t1": 3.5}]},
    },
    "growth_chart_3d": {
        "label": "3D growth chart",
        "params": {
            "values": ("str", "10,25,67,174", "comma-separated numbers"),
            "pointLabels": ("str", "", "comma-separated label per value"),
            "unit": ("str", "", "Unit shown with the values"),
            "mode": ("str", "bars", "one of bars|line|both"),
        },
        "example": {"template": "growth_chart_3d", "duration": 6,
                    "narration": "In forty years, Rs 10,000 grows to more than Rs 174,000.",
                    "visualizes": "In forty years, Rs 10,000 grows to more than Rs 174,000.",
                    "params": {"values": "10,25,67,174",
                               "pointLabels": "Start,Year 10,Year 25,Year 40",
                               "unit": "thousand Rs", "mode": "bars"}},
    },
    "stack_growth": {
        "label": "Growing stacks",
        "params": {
            "steps": ("str", "10000,25937,67275,174494", "comma-separated amounts, one stack per amount"),
            "stepLabels": ("str", "", "comma-separated label per step"),
            "item": ("str", "coin", "one of coin|block|bar"),
            "unit": ("str", "", "Unit shown with the amounts"),
        },
        "example": {"template": "stack_growth", "duration": 6,
                    "narration": "The pile itself keeps growing: Rs 10,000 becomes Rs 25,937, then Rs 67,275, then Rs 174,494.",
                    "visualizes": "The pile itself keeps growing: Rs 10,000 becomes Rs 25,937, then Rs 67,275, then Rs 174,494.",
                    "params": {"steps": "10000,25937,67275,174494",
                               "stepLabels": "Year 0,Year 10,Year 25,Year 40",
                               "item": "coin", "unit": "Rs"}},
    },
    "process_flow": {
        "label": "Process flow",
        "params": {
            "steps": ("str", "", "comma-separated step names, 3-5 steps, a glowing pulse travels through them"),
            "travelLabel": ("str", "", "Text carried by the travelling object/pulse"),
        },
        "example": {"template": "process_flow", "duration": 6,
                    "narration": "First you deposit, then interest is added, then that interest starts earning interest too.",
                    "visualizes": "First you deposit, then interest is added, then that interest starts earning interest too.",
                    "params": {"steps": "Deposit, Interest added, Interest earns interest"}},
    },
    "timeline": {
        "label": "Timeline",
        "params": {
            "events": ("str", "", "entries separated by ';', each entry 'Label|Detail', markers light up in sequence"),
        },
        "example": {"template": "timeline", "duration": 6,
                    "narration": "In year one it is Rs 11,000, by year ten Rs 25,937, and by year forty Rs 174,494.",
                    "visualizes": "In year one it is Rs 11,000, by year ten Rs 25,937, and by year forty Rs 174,494.",
                    "params": {"events": "Year 1|Rs 11,000; Year 10|Rs 25,937; Year 40|Rs 174,494"}},
    },
    "comparison_split": {
        "label": "Comparison split",
        "params": {
            "leftLabel": ("str", "Before", "Label for the left side"),
            "leftValue": ("num", 10, "Value for the left side"),
            "rightLabel": ("str", "After", "Label for the right side"),
            "rightValue": ("num", 90, "Value for the right side"),
            "unit": ("str", "", "Unit shown with the values"),
            "item": ("str", "block", "one of coin|block|bar"),
        },
        "example": {"template": "comparison_split", "duration": 5,
                    "narration": "Without compounding you would have Rs 50,000; with compounding, Rs 174,494.",
                    "visualizes": "Without compounding you would have Rs 50,000; with compounding, Rs 174,494.",
                    "params": {"leftLabel": "Without compounding", "leftValue": 50000,
                               "rightLabel": "With compounding", "rightValue": 174494,
                               "unit": "Rs", "item": "coin"}},
    },
    "object_orbit": {
        "label": "Object orbit",
        "params": {
            "model": ("str", "bank", "one of bank|calendar|clock|scale|plant|coin|phone|chip|ship|box|cable|server"),
            "color": ("str", "#35c4ff", "Body colour"),
            "orbit": ("num", 0.6, "Orbit amount 0..1"),
        },
        "example": {"template": "object_orbit", "duration": 5,
                    "narration": "The bank holds your deposit while time does the work.",
                    "visualizes": "The bank holds your deposit while time does the work.",
                    "params": {"model": "bank", "color": "#35c4ff", "orbit": 0.6}},
    },

}

CAMERA_DEFAULTS = {"distance": "medium", "angle": "eye", "move": "slow_push"}
CAMERA_DISTANCES = ("wide", "medium", "close")


def _num(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_globe_routes(routes) -> list:
    """Normalise globe routes to the canonical NESTED form.

    Canonical: ``[{from:{lat,lon,label}, to:{lat,lon,label}}]`` with
    lat/lon as floats. Legacy FLAT entries
    (``{fromLat, fromLon, toLat, toLon, ...}``) are converted.
    """
    normalised = []
    for entry in routes or []:
        if not isinstance(entry, dict):
            continue
        if isinstance(entry.get("from"), dict) and isinstance(entry.get("to"), dict):
            src, dst = entry["from"], entry["to"]
            normalised.append({
                "from": {"lat": _num(src.get("lat"), 0.0),
                         "lon": _num(src.get("lon"), 0.0),
                         "label": str(src.get("label") or "")},
                "to": {"lat": _num(dst.get("lat"), 0.0),
                       "lon": _num(dst.get("lon"), 0.0),
                       "label": str(dst.get("label") or "")},
            })
        elif any(k in entry for k in ("fromLat", "fromLon", "toLat", "toLon")):
            normalised.append({
                "from": {"lat": _num(entry.get("fromLat"), 0.0),
                         "lon": _num(entry.get("fromLon"), 0.0),
                         "label": str(entry.get("fromLabel") or entry.get("from_label") or "")},
                "to": {"lat": _num(entry.get("toLat"), 0.0),
                       "lon": _num(entry.get("toLon"), 0.0),
                       "label": str(entry.get("toLabel") or entry.get("to_label") or "")},
            })
    return normalised


def apply_defaults(shot: dict, index: int = 0) -> dict:
    """Return a copy of ``shot`` with every default filled in."""
    out = copy.deepcopy(shot) if isinstance(shot, dict) else {}
    out.setdefault("id", f"shot-{index + 1}")
    out["template"] = str(out.get("template") or "")
    out["duration"] = _num(out.get("duration"), 0)
    out["narration"] = str(out.get("narration") or "")
    out["visualizes"] = str(out.get("visualizes") or "")
    params = dict(out.get("params") or {}) if isinstance(out.get("params"), dict) else {}
    spec = TEMPLATES.get(out["template"], {}).get("params", {})
    for name, (_kind, default, _help) in spec.items():
        params.setdefault(name, default)
    if out["template"] == "globe":
        params["routes"] = _normalize_globe_routes(params.get("routes"))
    out["params"] = params
    camera = dict(CAMERA_DEFAULTS)
    if isinstance(out.get("camera"), dict):
        camera.update({k: v for k, v in out["camera"].items() if v not in (None, "")})
    out["camera"] = camera
    out["transition_in"] = out.get("transition_in") or ("cut" if index == 0 else "fade")
    out["labels"] = _clean_labels(out.get("labels"))
    out["cards"] = _clean_cards(out.get("cards"), out["duration"])
    out["chips"] = _clean_chips(out.get("chips"), out["duration"])
    out["cameraPath"] = _clean_camera_path(out.get("cameraPath"))
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


def _clean_chips(raw, duration: float) -> list:
    """Small stat overlays shown WHILE a scene plays (top corner)."""
    chips = []
    for item in raw or []:
        if not isinstance(item, dict) or not str(item.get("text") or "").strip():
            continue
        chips.append({
            "text": str(item["text"]).strip(),
            "sub": str(item.get("sub") or ""),
            "corner": item.get("corner") if item.get("corner") in CHIP_CORNERS
                      else "top-right",
            "t0": _num(item.get("t0"), 0.0),
            "t1": _num(item.get("t1"), duration or 0.0),
        })
    return chips


def _vec3(value):
    """Coerce to a 3-float list, or None when malformed."""
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        return None
    try:
        return [float(v) for v in value]
    except (TypeError, ValueError):
        return None


def _clean_camera_path(raw) -> list:
    """Multi-keyframe camera path for fly-through ("journey") shots.

    Optional and forgiving: malformed keyframes are silently dropped,
    ``at`` is coerced to a float clamped to 0..1 and ``pos``/``lookAt``
    to 3-float lists. Never a validation error.
    """
    path = []
    for item in raw or []:
        if not isinstance(item, dict):
            continue
        pos = _vec3(item.get("pos"))
        look_at = _vec3(item.get("lookAt"))
        if pos is None or look_at is None:
            continue
        at = min(1.0, max(0.0, _num(item.get("at"), 0.0)))
        path.append({"at": at, "pos": pos, "lookAt": look_at})
    return path


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
        if not str(shot.get("visualizes") or "").strip():
            errors.append(
                f"{where}: missing 'visualizes' — name the narration "
                "sentence(s) this shot depicts.")
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
    - the camera distance never changing between neighbouring shots;
    - more than 1 data_card shot in the plan (card cap);
    - data_card shots taking more than 15% of the total duration;
    - any single template used more than twice in total.
    """
    warnings: list[str] = []
    shots = list(shots or [])
    # Card cap + duration share.
    card_shots = [s for s in shots if s.get("template") == "data_card"]
    if len(card_shots) > 1:
        warnings.append(
            f"data_card used {len(card_shots)} times — at most 1 data_card "
            "per video; show numbers inside scene shots instead.")
    total_duration = sum(_num(s.get("duration"), 0) for s in shots)
    card_duration = sum(_num(s.get("duration"), 0) for s in card_shots)
    if total_duration > 0 and card_duration / total_duration > 0.15:
        warnings.append(
            f"data_card shots take {card_duration / total_duration:.0%} of "
            "the total duration — keep data_card under 15% of the video.")
    # Any single template used more than twice in total.
    counts: dict[str, int] = {}
    for s in shots:
        if s.get("template"):
            counts[s["template"]] = counts.get(s["template"], 0) + 1
    for template, count in counts.items():
        if count > 2:
            warnings.append(
                f"Template {template!r} used {count} times in total — "
                "no template should be used more than twice in a video.")
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
