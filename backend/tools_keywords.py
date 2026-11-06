"""Keyword Research tool: free YouTube autocomplete suggestions.

Uses the public YouTube suggest endpoint — no API key, no yt-dlp,
no credits, no license check:

    https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=<seed>

Returns the suggestion list for a seed keyword. Wiring: the parent
registers this router in backend/main.py with
``app.include_router(tools_keywords.router)``.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/keywords")

SUGGEST_URL = "https://suggestqueries.google.com/complete/search"


def _unwrap_jsonp(body: str) -> str:
    """The suggest endpoint answers JSONP (``window.google.ac.h([...])``),
    not plain JSON — strip the wrapper before parsing."""
    text = body.strip()
    if text.startswith("window.google.ac.h("):
        text = text[len("window.google.ac.h("):]
        if text.endswith(")"):
            text = text[:-1]
    return text


def _fetch_suggestions(seed: str) -> list[str]:
    params = urllib.parse.urlencode({"client": "youtube", "ds": "yt", "q": seed})
    req = urllib.request.Request(
        f"{SUGGEST_URL}?{params}",
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(
            502,
            f"Could not reach YouTube suggestions ({exc}). "
            "Check your internet connection and try again.",
        )
    try:
        data = json.loads(_unwrap_jsonp(raw))
    except json.JSONDecodeError:
        raise HTTPException(
            502, "YouTube returned an unexpected response. Try again."
        )
    # Response shape: ["seed", ["suggestion", ...], ...]
    # Items are usually plain strings; tolerate [text, ...] pairs too.
    items = data[1] if isinstance(data, list) and len(data) > 1 else []
    suggestions: list[str] = []
    for item in items:
        if isinstance(item, list) and item:
            text = item[0]
        elif isinstance(item, str):
            text = item
        else:
            continue
        if isinstance(text, str) and text and text not in suggestions:
            suggestions.append(text)
    return suggestions


@router.get("")
def keywords(q: str = "") -> dict:
    """GET /api/keywords?q=<seed> -> {"seed": ..., "suggestions": [...]}."""
    seed = (q or "").strip()
    if not seed:
        raise HTTPException(400, "Type a keyword first.")
    if len(seed) > 200:
        raise HTTPException(400, "Keyword is too long.")
    return {"seed": seed, "suggestions": _fetch_suggestions(seed)}
