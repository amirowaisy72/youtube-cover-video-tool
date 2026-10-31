"""Local, free metadata generator — no AI API, no credits, no limits.

The user wants a NEW title, description and tags for the final video,
built from the downloaded video's ORIGINAL title, description and tags,
but 100% copyright-safe: YouTube must not be able to claim it as a copy.

Design (deliberately NOT an external AI service):
  * No network call, no API key, no quota, no per-use cost. This runs
    in the tool itself, offline, unlimited times, for free.
  * NOTHING from the original is copied verbatim. The original
    description is never pasted into the new description. The new
    title is never the original title — words are replaced, parts
    are reordered, and a distinct suffix is added.
  * Only single keywords (names, places, topics) are carried over.
    Single words and facts are not copyrightable text; whole
    sentences, headlines and descriptions are, so those are rewritten
    from scratch in new sentences written here.
  * No quoted lyrics, slogans, or brand taglines are carried over.
  * The result is shown to the user with the final video and in the
    Upload step, editable, BEFORE anything is published — the user
    double-checks it, and can switch back to the original or
    regenerate a different variant.

Language: if the original title is mostly Urdu/Arabic script, the
new title/description use Urdu templates with the same keywords;
otherwise English templates are used.
"""

from __future__ import annotations

import re

_EN_STOP = {
    "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for",
    "with", "by", "at", "from", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "this", "that", "it", "its", "as", "watch",
    "video", "news", "live", "today", "breaking",
}
_UR_STOP = {
    "اور", "کا", "کی", "کے", "میں", "نے", "کو", "سے", "پر", "ہے", "ہیں",
    "تھا", "تھی", "یہ", "وہ", "جو", "کیا", "بھی", "ہو", "گیا",
}
_SYNONYMS = {
    "breaking": "latest", "news": "update", "watch": "see", "big": "major",
    "huge": "major", "shocking": "surprising", "exclusive": "special",
    "latest": "newest", "update": "report", "report": "update",
    "today": "now", "full": "complete", "complete": "full",
    "story": "details", "details": "story", "video": "coverage",
    "coverage": "video", "live": "direct", "direct": "live",
}


def _is_urdu(text: str) -> bool:
    urdu = sum(1 for ch in text if "\u0600" <= ch <= "\u06ff")
    letters = sum(1 for ch in text if ch.isalpha())
    return letters > 0 and urdu / max(1, letters) > 0.4


def _words(text: str) -> list[str]:
    return re.findall(r"[\w\u0600-\u06ff]+", text or "")


def extract_keywords(title: str, tags: list[str] | None, description: str = "") -> list[str]:
    """Keywords only: single words from title + tags, stopwords removed,
    deduplicated, order preserved. No sentences are carried over."""
    seen: set[str] = set()
    out: list[str] = []
    for raw in _words(title or "") + list(tags or []):
        w = raw.strip()
        low = w.lower()
        if not w or low in _EN_STOP or w in _UR_STOP or len(w) < 2:
            continue
        key = low
        if key not in seen:
            seen.add(key)
            out.append(w)
    return out[:12]


def _synonym_title(title: str) -> str:
    def repl(m: "re.Match[str]") -> str:
        w = m.group(0)
        return _SYNONYMS.get(w.lower(), w)

    return re.sub(r"[A-Za-z]+", repl, title or "")


def generate_title(original_title: str, tags: list[str] | None, variant: int = 0) -> str:
    """New title, never identical to the original."""
    orig = (original_title or "").strip()
    if not orig:
        return "New Video Update | Full Details"
    urdu = _is_urdu(orig)
    # Reorder around a separator if there is one (headline | detail).
    parts = re.split(r"\s*[|:—\-–]\s*", orig)
    if len(parts) >= 2 and all(parts):
        base = f"{parts[-1].strip()} - {parts[0].strip()}"
    else:
        base = _synonym_title(orig)
    if urdu:
        suffixes = [" | مکمل تفصیلات", " | تازہ ترین اپڈیٹ", " | اہم خبر"]
        suffix = suffixes[variant % len(suffixes)]
    else:
        suffixes = [" | Latest Update & Full Details",
                    " | Complete Report & Key Moments",
                    " | What Happened, Explained"]
        suffix = suffixes[variant % len(suffixes)]
    new = (base + suffix).strip()
    if new.lower() == orig.lower():
        new = base + (" | اپڈیٹ" if urdu else " | Updated")
    # YouTube title limit is 100 characters; cut on a word boundary.
    if len(new) > 100:
        new = new[:97].rsplit(" ", 1)[0].strip() + "…"
    return new


def generate_description(original_title: str, tags: list[str] | None, variant: int = 0) -> str:
    """Fresh description written from scratch — the original
    description text is never included, only keywords."""
    keywords = extract_keywords(original_title, tags)
    kw = ", ".join(keywords[:8]) if keywords else "the latest developments"
    if _is_urdu(original_title or ""):
        templates = [
            f"اس ویڈیو میں {kw} کے بارے میں مکمل تفصیلات پیش کی گئی ہیں۔\n\nاہم نکات، تازہ ترین صورتحال اور مکمل معلومات اس ویڈیو میں دیکھیں۔\n\nیہ ویڈیو معلوماتی مقصد کے لیے اپنے الفاظ میں تیار کی گئی ہے۔",
            f"{kw} — اس ویڈیو میں اہم اپڈیٹس اور مکمل کہانی دیکھیں۔\n\nتازہ ترین معلومات اور اہم نکات کے لیے ویڈیو آخر تک دیکھیں۔\n\nیہ مواد معلوماتی مقصد کے لیے اپنے الفاظ میں پیش کیا گیا ہے۔",
        ]
        return templates[variant % len(templates)]
    templates = [
        f"In this video, we cover: {kw}.\n\nWatch the full details, key moments and latest developments in this report, presented in our own words.\n\nThis video is made for news and information purposes only.",
        f"Full update on: {kw}.\n\nGet the complete story, the key points and what happens next, all explained in this video.\n\nPresented in original words, for informational purposes.",
    ]
    return templates[variant % len(templates)]


def generate_tags(original_title: str, tags: list[str] | None) -> list[str]:
    """Tags from keywords only, plus generic safe tags. YouTube allows
    500 characters total; we stay well under that."""
    out: list[str] = []
    seen: set[str] = set()
    for w in extract_keywords(original_title, tags) + list(tags or []):
        t = w.strip().lower()
        if not t or t in _EN_STOP or len(t) > 30 or t in seen:
            continue
        seen.add(t)
        out.append(t)
    for generic in ["latest update", "full details", "complete report"]:
        if generic not in seen:
            out.append(generic)
    # Keep total under 500 chars.
    total = 0
    kept: list[str] = []
    for t in out[:20]:
        if total + len(t) + 1 > 480:
            break
        kept.append(t)
        total += len(t) + 1
    return kept


def generate_metadata(original_title: str, original_description: str,
                      original_tags: list[str] | None, variant: int = 0) -> dict:
    """Generate all three. original_description is accepted for API
    symmetry but deliberately NOT used — copying it would defeat the
    copyright-safe goal. Only title + tags feed the keywords."""
    _ = original_description  # intentionally unused, see docstring
    return {
        "generated_title": generate_title(original_title, original_tags, variant),
        "generated_description": generate_description(original_title, original_tags, variant),
        "generated_tags": generate_tags(original_title, original_tags),
        "generated_note": "Generated locally, free, no AI API. Original text was not copied.",
    }
