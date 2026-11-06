"""Title + Description + Tags Generator (YT Guru tool, FREE).

Pure template logic — no paid APIs, no AI calls, no license credits.
The user enters a video topic (and optional keywords); this module
builds 10 clickable title options from proven patterns, a
ready-to-paste description draft, and a set of tags.

Mounted by backend/main.py with:
    import tools_titles
    app.include_router(tools_titles.router)
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/titles")

_SMALL_WORDS = {"a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "vs"}


class TitlesRequest(BaseModel):
    topic: str
    keywords: str | None = None


class TitlesResponse(BaseModel):
    titles: list[str]
    description: str
    tags: list[str]


def _title_case(text: str) -> str:
    """Title Case, keeping small words lowercase unless first."""
    words = text.strip().split()
    out = []
    for i, w in enumerate(words):
        low = w.lower()
        if i > 0 and low in _SMALL_WORDS:
            out.append(low)
        else:
            out.append(low[:1].upper() + low[1:])
    return " ".join(out)


def _split_keywords(raw: str | None) -> list[str]:
    if not raw:
        return []
    seen: list[str] = []
    for part in raw.split(","):
        kw = " ".join(part.strip().split())
        if kw and kw.lower() not in [s.lower() for s in seen]:
            seen.append(kw)
    return seen


def _build_titles(topic: str, keywords: list[str]) -> list[str]:
    year = datetime.now().year
    t = _title_case(topic)
    kw_t = _title_case(keywords[0]) if keywords else ""
    comparison = (
        f"{t} vs {kw_t}: Which One Is Better?"
        if kw_t
        else f"{t} Explained: The Pros, the Cons, and the Truth"
    )
    return [
        f"10 {t} Tips You Need to Know in {year}",
        f"How to {t} — Step-by-Step Guide for Beginners",
        f"What Is {t}? Everything You Need to Know",
        f"7 Secrets About {t} Nobody Tells You",
        f"5 {t} Mistakes You Must Avoid",
        f"You Won't Believe These {t} Facts!",
        comparison,
        f"{t} for Beginners: Start Here",
        f"Best {t} Strategies That Actually Work in {year}",
        f"The Shocking Truth About {t}",
    ]


def _build_description(topic: str, keywords: list[str]) -> str:
    year = datetime.now().year
    lines = [
        f"In this video, we break down {topic} in the simplest way possible — "
        "no fluff, just what actually works.",
        "",
        "In this video, you'll learn:",
        f"- What {topic} really means (in plain English)",
        f"- The easiest way to get started with {topic}",
        f"- Common mistakes people make with {topic} — and how to avoid them",
        f"- My best tips for {topic} in {year}",
    ]
    if keywords:
        lines.append(f"- Covered in this video: {', '.join(keywords)}")
    lines += [
        "",
        "If you found this video helpful, please like, subscribe, and hit the "
        "bell icon so you never miss a new video!",
        "",
        " ".join("#" + tag.replace(" ", "") for tag in _build_tags(topic, keywords)[:5]),
    ]
    return "\n".join(lines)


def _build_tags(topic: str, keywords: list[str]) -> list[str]:
    year = datetime.now().year
    base = _title_case(topic)
    candidates = [
        topic.lower(),
        f"{topic.lower()} tips",
        f"{topic.lower()} guide",
        f"{topic.lower()} tutorial",
        f"{topic.lower()} for beginners",
        f"{topic.lower()} {year}",
        base,
    ]
    candidates += [kw.lower() for kw in keywords]
    candidates += [
        "how to",
        "tutorial",
        "tips and tricks",
        "youtube",
        "viral video",
        "trending",
    ]
    seen: list[str] = []
    for tag in candidates:
        tag = " ".join(tag.split())
        if tag and tag.lower() not in [s.lower() for s in seen]:
            seen.append(tag)
    return seen[:15]


@router.post("")
def generate_titles(payload: TitlesRequest) -> TitlesResponse:
    topic = " ".join((payload.topic or "").split())
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required.")
    keywords = _split_keywords(payload.keywords)
    return TitlesResponse(
        titles=_build_titles(topic, keywords),
        description=_build_description(topic, keywords),
        tags=_build_tags(topic, keywords),
    )
