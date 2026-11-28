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

VARIETY_RULES = """VARIETY RULES (must follow):
- Never use the same template more than 2 times in a row.
- Change the camera distance between shots (wide / medium / close — do not repeat the same distance 3 shots running).
- One main idea per shot.
- On-screen text (labels) is 1-4 words only, or one number with its unit (data cards)."""

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

Split the narration into shots. Each shot is one JSON object with:
{{"id": "shot-1", "template": "<template name>", "duration": <seconds, number > 0>,
  "narration": "<the exact narration words spoken during this shot>",
  "say": "<optional trigger: the word/phrase in the narration at which the key visual moment happens>",
  "params": {{...}}, "labels": [{{"text": "...", "anchor": "top|bottom|left|right|center", "t0": 0, "t1": 0}}],
  "cards": [{{"value": "...", "unit": "...", "sub": "...", "t0": 0, "t1": 0}}],
  "camera": {{"distance": "wide|medium|close", "angle": "...", "move": "..."}},
  "transition_in": "cut|fade|zoom"}}

Timing: use the "say" field for timing words — e.g. when the narrator says "doubled", the data card appears. Set label/card t0/t1 in seconds inside the shot.

TEMPLATES (use only these):
{_template_catalogue()}

{VARIETY_RULES}

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

TEMPLATES (use only these):
{_template_catalogue()}

{VARIETY_RULES}

{ACCURACY_RULES}

Output ONLY one JSON object for this one shot, in the same schema. No markdown fences, no explanation."""
