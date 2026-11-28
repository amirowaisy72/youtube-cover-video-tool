"""YT Guru — 3D Explainer shared style (user, 2026-11-28).

One look for every 3D Explainer scene, mirroring the frontend
``style.ts`` constants so the rendered frames, the live preview and
the prompts handed to an AI all describe the same picture: a deep
blue sea/space background, orange data lines, white labels and a
cyan accent. Pure data — no imports beyond the stdlib.
"""
from __future__ import annotations

STYLE = {
    "colours": {
        "background": "#04101f",        # deep blue sea / space
        "background_far": "#06182e",    # slightly lighter far field
        "data_line": "#ff8c1a",         # orange data lines / routes
        "label": "#ffffff",             # white labels
        "accent": "#35c4ff",            # cyan accent (highlights, glow)
        "card_fill": "rgba(4, 16, 31, 0.82)",
        "card_border": "#35c4ff",
        "muted": "#9db8cc",
    },
    "font_family": "'Segoe UI', 'Inter', Arial, sans-serif",
    "label": {
        "font_family": "'Segoe UI', 'Inter', Arial, sans-serif",
        "colour": "#ffffff",
        "weight": 600,
        "size_px": 34,
        "max_words": 4,
        "shadow": "0 2px 8px rgba(0,0,0,0.85)",
        "anchor_default": "top",
    },
    "card": {
        "fill": "rgba(4, 16, 31, 0.82)",
        "border": "#35c4ff",
        "border_px": 2,
        "radius_px": 14,
        "value_colour": "#ff8c1a",
        "unit_colour": "#ffffff",
        "sub_colour": "#9db8cc",
    },
    "lighting": (
        "Soft key light from upper-left, cool ambient fill from the "
        "deep-blue background, gentle rim light on the subject; no "
        "harsh shadows, no blown-out whites."
    ),
    "rules": [
        "Background is always the deep blue #04101f to #06182e gradient.",
        "Data lines, routes and arcs are orange #ff8c1a.",
        "Labels are white #ffffff, bold, with a soft dark shadow.",
        "Cyan #35c4ff is only an accent: borders, glows, highlights.",
        "On-screen text is 1-4 words, or a single number with its unit.",
    ],
}


def colour(name: str, default: str = "") -> str:
    """One colour from the shared palette by name."""
    return STYLE["colours"].get(name, default)


def style_summary() -> str:
    """Short human/AI-readable description of the house style."""
    c = STYLE["colours"]
    return (
        f"Deep blue sea/space background ({c['background']} to "
        f"{c['background_far']}), orange data lines ({c['data_line']}), "
        f"white labels ({c['label']}), cyan accent ({c['accent']}). "
        f"Font: {STYLE['font_family']}. {STYLE['lighting']}"
    )
