"""YT Guru — quick numbers for scenes that count.

On Windows each new Manim Text takes about 0.1 s, so a counting number (new text many times a second) was
most of a scene's render time. Here every character is drawn by Pango once, with its own spacing, and
numbers are then put together from those characters — the same font and look, in a moment.
"""
from __future__ import annotations

import re

SIZE = 96  # characters are drawn at this font size, then scaled
FAST = re.compile(r"[0-9A-Za-z$€£¥.,%+\-–×÷:/()' ]{1,28}")
_GLYPHS: dict[tuple, dict] = {}


def can(s: str) -> bool:
    return bool(FAST.fullmatch(s)) and any(c.isdigit() for c in s)


def _line(text: str, font: str, weight: str):
    from manim import Text
    return Text(text, font=font, weight=weight, font_size=SIZE, disable_ligatures=True)


def _measure(chars: list[str], font: str, weight: str, table: dict) -> bool:
    """For every character: its drawing (placed relative to the writing line) and how far the pen moves."""
    for k in range(0, len(chars), 8):  # short lines: a long one could wrap
        part = chars[k:k + 8]
        line = _line("".join("0" + c + c for c in part), font, weight)
        if len(line) != 3 * len(part):
            return False
        for i, c in enumerate(part):
            zero, first, second = line[3 * i], line[3 * i + 1], line[3 * i + 2]
            table[c] = {"glyph": first.copy(), "advance": float(second.get_left()[0] - first.get_left()[0]),
                        "dx": float(first.get_left()[0] - zero.get_left()[0]),
                        "dy": float(first.get_bottom()[1] - zero.get_bottom()[1])}
    return True


def number(s: str, font: str, weight: str, font_size: int, color):
    """The text as a drawing, or None when it cannot be put together (then use Text)."""
    from manim import VGroup
    table = _GLYPHS.setdefault((font, weight), {})
    need = [c for c in dict.fromkeys("0 " + s) if c != " " and c not in table]
    if need and not _measure(need, font, weight, table):
        return None
    if "space" not in table:
        gap = _line("0 0", font, weight)  # a Text keeps a placeholder for the space
        if len(gap) != 3:
            return None
        table["space"] = float(gap[2].get_left()[0] - gap[0].get_left()[0]) - table["0"]["advance"]
    zero = table["0"]
    pen, parts = 0.0, VGroup()
    for c in s:
        if c == " ":
            pen += table["space"]
            continue
        g = table[c]
        m = g["glyph"].copy()
        # dx was measured after a "0": minus that zero's step gives the character's own side space
        left = pen + g["dx"] - zero["advance"]
        m.shift([left - m.get_left()[0], g["dy"] - m.get_bottom()[1], 0])
        parts.add(m)
        pen += g["advance"]
    if not len(parts):
        return None
    parts.scale(font_size / SIZE).move_to([0, 0, 0]).set_color(color)
    return parts
