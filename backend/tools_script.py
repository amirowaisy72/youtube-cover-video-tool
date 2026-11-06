"""Script Generator (YT Guru tool, FREE).

Pure template logic — no paid APIs, no AI calls, no license credits.
The user enters a video topic (and optional keywords) and a target
length; this module builds a complete ready-to-record script: a
strong opening hook, intro, 3-5 main points with talking bullets,
a call to action, and an outro, plus a ready-to-paste description.

This is a structured template generator, NOT a live LLM — the
script is assembled from proven YouTube script patterns and the
user's own topic/keywords, so it always stays on-topic.

Mounted by backend/main.py with:
    import tools_script
    app.include_router(tools_script.router)
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/script")

_LENGTHS = {
    "short": {"label": "Short", "minutes": 2, "points": 3, "bullets": 2},
    "medium": {"label": "Medium", "minutes": 5, "points": 4, "bullets": 3},
    "long": {"label": "Long", "minutes": 10, "points": 5, "bullets": 3},
}

_HOOKS = [
    "What if I told you that {t} is much simpler than everyone makes it look?",
    "Most people fail at {t} — not because it's hard, but because they start in the wrong place.",
    "In this video, I'll show you exactly how {t} works — step by step, even if you're a complete beginner.",
    "When I first tried {t}, I made every mistake in the book — and that's exactly why I can show you the shortcut today.",
    "If you're doing {t} this way, stop — it's the one mistake that kills your results before you even start.",
]


class ScriptRequest(BaseModel):
    topic: str
    keywords: str | None = None
    length: Literal["short", "medium", "long"] = "medium"


class ScriptSection(BaseModel):
    heading: str
    text: str
    bullets: list[str] = []


class ScriptResponse(BaseModel):
    hook: str
    script: list[ScriptSection]
    description: str
    estimated_words: int


def _split_keywords(raw: str | None) -> list[str]:
    if not raw:
        return []
    seen: list[str] = []
    for part in raw.split(","):
        kw = " ".join(part.strip().split())
        if kw and kw.lower() not in [s.lower() for s in seen]:
            seen.append(kw)
    return seen


def _pick_hook(topic: str) -> str:
    """Deterministic hook: same topic always gets the same hook."""
    idx = hashlib.md5(topic.lower().encode()).digest()[0] % len(_HOOKS)
    return _HOOKS[idx].format(t=topic)


def _point_defs(topic: str, keywords: list[str], year: int) -> list[ScriptSection]:
    """The 5 main-point templates, in order. Length picks the first N."""
    kw1 = keywords[0] if keywords else ""
    kw_line = f" Mention {kw1} here and show how it connects to {topic}." if kw1 else ""
    return [
        ScriptSection(
            heading=f"Point 1: What {topic} Really Is",
            text=(
                f"First, let's get clear on what {topic} actually means — in plain words, "
                f"no jargon. Once you understand this, everything else in this video will click."
            ),
            bullets=[
                f"Explain {topic} in one simple sentence.",
                f"Show a quick real-life example of {topic} in action.",
                f"Clear up the biggest misunderstanding people have about {topic}." if not kw1 else f"Explain how {kw1} fits into {topic}.",
            ],
        ),
        ScriptSection(
            heading=f"Point 2: Why {topic} Matters Now",
            text=(
                f"So why does {topic} matter right now, in {year}? Because the people who "
                f"get this right are pulling ahead — and the ones who ignore it are falling behind."
            ),
            bullets=[
                f"The number one reason {topic} matters right now.",
                f"What it costs you if you keep ignoring {topic}.",
                f"Who benefits most from {topic} — and why that's you.",
            ],
        ),
        ScriptSection(
            heading=f"Point 3: How to Start with {topic}",
            text=(
                f"Now the practical part — how do you actually start with {topic}? "
                f"Here is the simplest path, step by step.{kw_line}"
            ),
            bullets=[
                f"Step 1: the simplest first move for {topic}.",
                f"Step 2: the free tool or resource you need — no cost.",
                f"Step 3: how to tell it's working — the first sign of progress.",
            ],
        ),
        ScriptSection(
            heading=f"Point 4: Common {topic} Mistakes to Avoid",
            text=(
                f"Before you start, let me save you some pain. These are the mistakes "
                f"almost everyone makes with {topic} — including me, when I started."
            ),
            bullets=[
                f"Mistake 1: rushing into {topic} without a plan.",
                f"Mistake 2: copying others instead of finding your own angle on {topic}.",
                f"Mistake 3: quitting too early — right before the results start showing.",
            ],
        ),
        ScriptSection(
            heading=f"Point 5: Pro Tips for {topic} in {year}",
            text=(
                f"Finally, the tips that separate beginners from people who actually get "
                f"results with {topic}. These are small things, but they make a big difference."
            ),
            bullets=[
                f"Tip: use {kw1} to make your {topic} stand out." if kw1 else f"Tip: focus on one small part of {topic} and master it first.",
                f"The 80/20 rule for {topic} — the 20% that gives 80% of the results.",
                f"How to keep improving at {topic} after this video ends.",
            ],
        ),
    ]


def _build_script(topic: str, keywords: list[str], length: str) -> tuple[str, list[ScriptSection]]:
    year = datetime.now().year
    cfg = _LENGTHS[length]
    hook = _pick_hook(topic)
    points = _point_defs(topic, keywords, year)[: cfg["points"]]
    for p in points:
        p.bullets = p.bullets[: cfg["bullets"]]

    kw_mention = (
        f" We'll also cover {', '.join(keywords)} along the way."
        if keywords
        else ""
    )
    sections: list[ScriptSection] = [
        ScriptSection(heading="Hook", text=hook),
        ScriptSection(
            heading="Intro",
            text=(
                f"Hey everyone, welcome back to the channel. Today we're talking about "
                f"{topic} — what it is, why it matters, and exactly how you can get started. "
                f"Stay till the end, because the last tip is the one most people miss.{kw_mention}"
            ),
        ),
        *points,
        ScriptSection(
            heading="Call to Action",
            text=(
                f"If this video helped you understand {topic}, hit the like button and "
                f"subscribe — it really helps the channel. And tell me in the comments: "
                f"what's the one thing about {topic} you want me to cover next?"
            ),
        ),
        ScriptSection(
            heading="Outro",
            text=(
                f"So that's {topic} — what it is, why it matters, and how to start. "
                f"If you missed any part, rewind and watch it again. Thanks for watching, "
                f"and I'll see you in the next video."
            ),
        ),
    ]
    return hook, sections


def _build_description(topic: str, keywords: list[str], hook: str, sections: list[ScriptSection]) -> str:
    year = datetime.now().year
    point_titles = [s.heading.split(": ", 1)[1] for s in sections if s.heading.startswith("Point")]
    lines = [
        hook,
        "",
        f"In this video, we break down {topic} — in the simplest way possible.",
        "",
        "What we cover:",
        *[f"- {t}" for t in point_titles],
    ]
    if keywords:
        lines += ["", f"Topics: {', '.join(keywords)}"]
    lines += [
        "",
        "If this video helped you, please like, subscribe, and hit the bell icon!",
        "",
        " ".join("#" + kw.replace(" ", "") for kw in [topic, *keywords][:5]),
        f"#{topic.replace(' ', '')}{year}",
    ]
    return "\n".join(lines)


def _word_count(hook: str, sections: list[ScriptSection]) -> int:
    words = len(hook.split())
    for s in sections:
        words += len(s.text.split())
        for b in s.bullets:
            words += len(b.split())
    return words


@router.post("")
def generate_script(payload: ScriptRequest) -> ScriptResponse:
    topic = " ".join((payload.topic or "").split())
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required.")
    if len(topic) > 200:
        raise HTTPException(status_code=400, detail="Topic is too long (max 200 characters).")
    keywords = _split_keywords(payload.keywords)
    hook, sections = _build_script(topic, keywords, payload.length)
    return ScriptResponse(
        hook=hook,
        script=sections,
        description=_build_description(topic, keywords, hook, sections),
        estimated_words=_word_count(hook, sections),
    )
