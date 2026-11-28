"""YT Guru — 3D Explainer copy-paste prompts (user, 2026-11-28).

Like the app's other tools, the user copies a prompt into an AI
(ChatGPT/Claude/…) and pastes the JSON answer back. Three prompts:

- ``narration_prompt`` — write the narration, WITH sources.
- ``shot_prompt`` — the full shot prompt: every template, the style
  and variety rules, numbers only from the narration/sources.
- ``fix_shot_prompt`` — repair ONE shot using ONLY the project's
  saved sources (no new research).
"""
from __future__ import annotations

import json

from .shots import TEMPLATES
from .style import style_summary

VARIETY_RULES = """VISUALIZATION-FIRST RULES (must follow):
- Every shot must VISUALIZE its narration segment: the scene must show what the words say. Before choosing a template, write the shot's "visualizes" field naming the exact narration sentence(s) the shot depicts, then pick the scene that shows that.
- Show numbers INSIDE scenes, not on standalone cards: use stack_growth steps, growth_chart_3d values, or labels/cards overlaid on a scene shot so the viewer sees the number in context.
- data_card is a LAST RESORT: at most ONE data_card per video, and never the default way to show a number. Use it only when no scene template can show the number.
- Prefer the visualization templates when the narration is about growth (growth_chart_3d, stack_growth), a process or steps (process_flow), time or a sequence of events (timeline), a comparison (comparison_split), or parts of a thing (cutaway, object_orbit).
- Never use the same template more than 2 times in a row.
- No template more than twice in total across the whole video, without a very good reason.
- Change the camera distance between shots (wide / medium / close — do not repeat the same distance 3 shots running).
- One main idea per shot.
- On-screen text (labels) is 1-4 words only, or one number with its unit (data cards)."""

VISUALIZATION_RULES = VARIETY_RULES

CHIP_RULES = """CHIP RULES (must follow):
- Facts and numbers that belong to a moment INSIDE a scene go in the shot's "chips" list: a small overlay in a top corner of the screen ({"text": "99%", "sub": "of intercontinental data", "corner": "top-right", "t0": 2, "t1": 5}) shown WHILE the scene plays — the scene keeps moving underneath.
- Chips are the NORMAL way to put a stat on screen: prefer a chip on a scene shot over stopping the video for a card.
- A data_card full-screen moment is used ONLY when the user explicitly asks for a title/stat card — never as the default way to show a number."""

ACCURACY_RULES = """ACCURACY RULES (must follow):
- Use ONLY numbers, names and facts that appear in the narration or the sources below. Never invent data, statistics, dates or places.
- If a number is not in the narration/sources, do not put it on screen.
- Every shot's narration text must be copied from (or split from) the narration — do not rewrite the facts."""


def _template_catalogue() -> str:
    lines = []
    for name, spec in TEMPLATES.items():
        params = ", ".join(
            f"{p} ({kind}, default {default!r})"
            for p, (kind, default, _h) in spec["params"].items())
        lines.append(
            f"- {name} — {spec['label']}. Params: {params or 'none'}.\n"
            f"  Example: {json.dumps(spec['example'])}")
    return "\n".join(lines)


def narration_prompt(title: str) -> str:
    """Prompt asking an AI to write the narration WITH sources."""
    return f"""Write the narration script for a YouTube explainer video titled:

"{title}"

Rules:
- Research the topic first (use web search) and base every fact on real sources.
- Write 250-450 words of spoken narration: short sentences, one idea per sentence, plain language a viewer can follow while watching visuals.
- Do NOT include stage directions, headings or timestamps — only the words the narrator will say.
- Every number, date, name and claim must come from a source you found.

Return your answer in EXACTLY this format:

NARRATION:
<the narration text>

SOURCES:
- <source title> — <url>
- <source title> — <url>
(list every source you used)"""


def shot_prompt(title: str, narration: str, sources: str = "") -> str:
    """The full "Copy the shot prompt" for a whole video."""
    return f"""You are the shot planner for a 3D explainer video.

TITLE: {title}

STYLE: {style_summary()}

NARRATION (the narrator will read exactly this):
\"\"\"
{narration}
\"\"\"

SOURCES (research these with web search before planning, and stay faithful to them):
{sources or "(none supplied — research the title topic with web search and use only facts you can source)"}

Split the narration into shots. For EVERY shot, FIRST fill in "visualizes" — the exact narration sentence(s) this shot depicts — BEFORE choosing the template or params, then choose the template and params that actually show what those sentences say. "visualizes" is a REQUIRED field on every shot.

PLAN IN THIS GRAMMAR — for each narration sentence decide: (a) what object or process is SHOWN, (b) what the camera does, (c) which label or chip appears. Every shot should be plannable in those three parts.

JOURNEY SHOTS: when consecutive narration lines describe one continuous journey (e.g. globe -> coast -> underwater), prefer ONE shot with a "cameraPath" flying between scales over several disconnected scenes.

Each shot is one JSON object with:
{{"id": "shot-1", "template": "<template name>", "duration": <seconds, number > 0>,
  "narration": "<the exact narration words spoken during this shot>",
  "visualizes": "<the exact narration sentence(s) this shot depicts>",
  "say": "<optional trigger: the word/phrase in the narration at which the key visual moment happens>",
  "params": {{...}}, "labels": [{{"text": "...", "anchor": "top|bottom|left|right|center", "t0": 0, "t1": 0}}],
  "cards": [{{"value": "...", "unit": "...", "sub": "...", "t0": 0, "t1": 0}}],
  "chips": [{{"text": "<the big value / short fact>", "sub": "<optional small line>", "corner": "top-right|top-left", "t0": 0, "t1": 0}}],
  "camera": {{"distance": "wide|medium|close", "angle": "...", "move": "..."}},
  "cameraPath": [{{"at": <0..1 fraction of the shot>, "pos": [<x>, <y>, <z>], "lookAt": [<x>, <y>, <z>]}}],
  "transition_in": "cut|fade|zoom"}}

"chips" are small stat overlays shown in a top corner WHILE the scene plays underneath (see CHIP RULES below). "cameraPath" is optional: a list of keyframes for a multi-keyframe fly-through ("journey") shot — "at" is the fraction of the shot (0..1) at which the camera reaches "pos" while looking at "lookAt".

Timing: use the "say" field for timing words — e.g. when the narrator says "doubled", the data card appears. Set label/card/chip t0/t1 in seconds inside the shot.

TEMPLATES (use only these):
{_template_catalogue()}

{VARIETY_RULES}

{CHIP_RULES}

{ACCURACY_RULES}

Output ONLY a JSON list of shot objects in the schema above. No markdown fences, no explanation, no extra text."""


def fix_shot_prompt(project: dict, shot_index: int) -> str:
    """Single-shot fix prompt — saved sources ONLY, no new research."""
    shots = project.get("shots") or []
    shot = shots[shot_index] if 0 <= shot_index < len(shots) else {}
    return f"""Fix ONE shot of a 3D explainer video. Use ONLY the project's saved sources listed below — do NOT do any new research, do NOT search the web, and do NOT use any fact that is not in the narration or the saved sources.

TITLE: {project.get('title', '')}

FULL NARRATION:
\"\"\"
{project.get('narration', '')}
\"\"\"

SAVED SOURCES (the only sources you may use):
{project.get('sources') or '(none saved)'}

STYLE: {style_summary()}

THE SHOT TO FIX (shot number {shot_index + 1}):
{json.dumps(shot, indent=2)}

The fixed shot MUST include "visualizes": "<the exact narration sentence(s) this shot depicts>" — this is a REQUIRED field. Fill in "visualizes" FIRST, before choosing the template or params, and choose a template that actually shows what those sentences say. Remember: data_card is a last resort (at most one per video) — show numbers inside a scene instead whenever a scene template can show them. Put a stat that belongs to a moment inside the scene in "chips" (a small top-corner overlay shown while the scene plays), and use "cameraPath" (optional keyframes {{"at": 0..1, "pos": [x, y, z], "lookAt": [x, y, z]}}) when the shot is a fly-through journey between scales.

TEMPLATES (use only these):
{_template_catalogue()}

{VARIETY_RULES}

{ACCURACY_RULES}

Output ONLY one JSON object for this one shot, in the same schema. No markdown fences, no explanation."""
