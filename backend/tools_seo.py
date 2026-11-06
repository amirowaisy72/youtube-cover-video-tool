"""SEO Score Checker — pure-logic scoring, no paid APIs, no credits.

POST /api/seo {title, description, tags} -> {score, checks, suggestions}
Scores 0-100 with a pass/fail checklist. Tags are comma-separated.
The "main keyword" is the first tag (users list their main keyword first).
"""

from __future__ import annotations

import re

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/seo")

POWER_WORDS = {
    "best", "top", "ultimate", "secret", "secrets", "free", "amazing",
    "proven", "easy", "fast", "new", "shocking", "incredible", "essential",
    "complete", "guide", "tutorial", "review", "hack", "hacks", "tricks",
    "tips", "mistakes", "avoid", "never", "always", "how", "why", "what",
    "step", "steps", "beginner", "advanced", "powerful", "simple", "quick",
    "insane", "crazy", "unbelievable", "must", "everyone", "nobody",
    "truth", "exposed", "revealed", "master", "masterclass", "pro",
}

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
    "is", "are", "was", "were", "your", "you", "my", "our", "this", "that",
    "it", "its", "by", "at", "from", "as", "be", "do", "does", "did", "how",
    "why", "what", "when", "which", "who", "can", "will", "just", "get",
}


class SeoRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    tags: str = ""


class Check(BaseModel):
    label: str
    passed: bool
    hint: str
    points: int
    max_points: int


class SeoResponse(BaseModel):
    score: int
    checks: list[Check]
    suggestions: list[str]


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _parse_tags(raw: str) -> list[str]:
    tags = [t.strip().lower() for t in raw.split(",")]
    return [t for t in tags if t]


@router.post("", response_model=SeoResponse)
def seo_score(payload: SeoRequest) -> SeoResponse:
    title = payload.title.strip()
    description = payload.description or ""
    desc = description.strip()
    tags = _parse_tags(payload.tags or "")
    title_words = set(_words(title))
    checks: list[Check] = []
    suggestions: list[str] = []

    # 1. Title length 50-60 chars (ideal) — 15 pts
    n = len(title)
    if 50 <= n <= 60:
        pts, passed = 15, True
        hint = f"Title is {n} characters — ideal length."
    elif 40 <= n <= 70:
        pts, passed = 8, False
        hint = f"Title is {n} characters — aim for 50-60."
    else:
        pts, passed = 0, False
        hint = f"Title is {n} characters — aim for 50-60 (too {'short' if n < 50 else 'long'})."
    checks.append(Check(label="Title length 50-60 characters", passed=passed, hint=hint, points=pts, max_points=15))
    if not passed:
        suggestions.append("Rewrite the title to 50-60 characters so it shows fully in search results.")

    # 2. Main keyword (first tag) appears in the title — 20 pts
    main_kw = tags[0] if tags else ""
    kw_words = [w for w in _words(main_kw) if w not in STOPWORDS] if main_kw else []
    kw_in_title = bool(kw_words) and all(w in title_words for w in kw_words)
    if kw_in_title:
        checks.append(Check(label="Main keyword in title", passed=True,
                            hint=f"Your main keyword '{main_kw}' is in the title.", points=20, max_points=20))
    else:
        checks.append(Check(label="Main keyword in title", passed=False,
                            hint="Put your main keyword (first tag) in the title." if main_kw else "Add tags — your first tag is your main keyword.",
                            points=0, max_points=20))
        suggestions.append("Add your main keyword to the title — it is the strongest ranking signal.")

    # 3. Keyword in the first 100 chars of the description — 15 pts
    first100 = _words(desc[:100])
    kw_in_desc = bool(kw_words) and all(w in first100 for w in kw_words)
    if kw_in_desc:
        checks.append(Check(label="Keyword in first 100 chars of description", passed=True,
                            hint="Your main keyword appears early in the description.", points=15, max_points=15))
    else:
        checks.append(Check(label="Keyword in first 100 chars of description", passed=False,
                            hint="Start the description with a sentence containing your main keyword." if main_kw else "Add tags and mention the main keyword early in the description.",
                            points=0, max_points=15))
        suggestions.append("Mention your main keyword in the first sentence of the description.")

    # 4. Description length >= 200 chars — 15 pts
    dlen = len(desc)
    if dlen >= 200:
        checks.append(Check(label="Description at least 200 characters", passed=True,
                            hint=f"Description is {dlen} characters.", points=15, max_points=15))
    elif dlen >= 100:
        checks.append(Check(label="Description at least 200 characters", passed=False,
                            hint=f"Description is only {dlen} characters — write at least 200.", points=7, max_points=15))
        suggestions.append("Expand the description to 200+ characters with a summary, links and timestamps.")
    else:
        checks.append(Check(label="Description at least 200 characters", passed=False,
                            hint=f"Description is only {dlen} characters — write at least 200.", points=0, max_points=15))
        suggestions.append("Write a 200+ character description: what the video covers, who it is for, and links.")

    # 5. Tag count 5-15 — 10 pts
    tc = len(tags)
    if 5 <= tc <= 15:
        checks.append(Check(label="5-15 tags", passed=True, hint=f"{tc} tags — good count.", points=10, max_points=10))
    elif 3 <= tc <= 20:
        checks.append(Check(label="5-15 tags", passed=False, hint=f"{tc} tags — aim for 5-15.", points=5, max_points=10))
        suggestions.append("Use 5-15 tags: a mix of broad and specific keywords.")
    else:
        checks.append(Check(label="5-15 tags", passed=False, hint=f"{tc} tags — aim for 5-15.", points=0, max_points=10))
        suggestions.append("Use 5-15 tags: a mix of broad and specific keywords.")

    # 6. At least one tag matches a word in the title — 10 pts
    title_match = any(w in title_words for tag in tags for w in _words(tag) if w not in STOPWORDS)
    if title_match:
        checks.append(Check(label="At least one tag matches the title", passed=True,
                            hint="A tag word appears in your title.", points=10, max_points=10))
    else:
        checks.append(Check(label="At least one tag matches the title", passed=False,
                            hint="None of your tags match a word in the title." if tags else "Add tags that match words in your title.",
                            points=0, max_points=10))
        suggestions.append("Make at least one tag match a word in the title so YouTube links them.")

    # 7. No tag stuffing — 10 pts
    long_tags = [t for t in tags if len(t) > 30]
    dupes = sorted({t for t in tags if tags.count(t) > 1})
    if not long_tags and not dupes:
        checks.append(Check(label="No tag stuffing", passed=True,
                            hint="No over-long or duplicate tags.", points=10, max_points=10))
    else:
        reasons = []
        if long_tags:
            reasons.append(f"over-long tag: '{long_tags[0]}'")
        if dupes:
            reasons.append(f"duplicate tag: '{dupes[0]}'")
        checks.append(Check(label="No tag stuffing", passed=False,
                            hint="; ".join(reasons) + " — keep every tag under 30 characters and unique.",
                            points=0, max_points=10))
        suggestions.append("Remove duplicate tags and split any tag longer than 30 characters.")

    # 8. Title has a number or power word (bonus) — 5 pts
    has_number = bool(re.search(r"\d", title))
    powers = sorted(POWER_WORDS & title_words)
    if has_number or powers:
        detail = []
        if has_number:
            detail.append("a number")
        if powers:
            detail.append(f"power word '{powers[0]}'")
        checks.append(Check(label="Number or power word in title (bonus)", passed=True,
                            hint=f"Title has {' and '.join(detail)}.", points=5, max_points=5))
    else:
        checks.append(Check(label="Number or power word in title (bonus)", passed=False,
                            hint="Add a number (e.g. '10 Tips') or a power word (e.g. 'Ultimate').",
                            points=0, max_points=5))
        suggestions.append("Add a number or power word to the title to lift click-through rate.")

    score = min(100, sum(c.points for c in checks))
    if not suggestions:
        suggestions.append("Great job — every check passed. Publish it!")
    return SeoResponse(score=score, checks=checks, suggestions=suggestions)
