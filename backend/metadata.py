"""Local, free, sophisticated metadata generator — no AI API, no cost.

The user wants a NEW title, description and tags for the final video
that feel like a complete, self-written, SEO-friendly write-up — not
the old fixed templates ("In this video, we cover: kw, kw...") that
looked the same for every video. At the same time it must stay
100% free and offline: no network call, no API key, no quota.

How the new version works (still no external AI):
  * Keywords are MINED, not copied. Title (weight 3), original tags
    (weight 2) and original description (weight 1, words only) are
    scored by frequency + capitalisation (names/places score higher).
    Only single words and short phrases are carried over — never a
    whole sentence, headline or description from the original.
  * Titles are BUILT from the top keywords with 8 different formulas
    (hook + topic + angle), not by reordering the original headline
    and adding 1 of 3 suffixes. Every Regenerate therefore gives a
    genuinely different title, never the original, never profanity.
  * Descriptions are STRUCTURED like a real YouTube description:
    hook paragraph, "In this video" key points, why it matters,
    natural keyword sentences (not a keyword list), hashtags, and
    an original-words disclaimer. No copied sentences, ever.
  * Tags are TIERED for SEO: core phrases first, then long-tail
    phrases (3-4 words, the ones people actually search), then
    related terms from a small offline map, then broad terms.
    Junk single words ("up", "your", "fat") and profanity are
    filtered out. YouTube's 500-character tag limit is respected.
  * Everything is deterministic by variant: same variant = same
    output, Regenerate = a different formula/hook/order, so the
    user can pick the version they like best, then edit it in
    Step 4 before publishing — the tool never publishes unseen.

Language: if the original title is mostly Urdu/Arabic script, Urdu
templates with the same keywords are used; otherwise English.
"""

from __future__ import annotations

import re

_EN_STOP = {
    # Articles, pronouns, prepositions, conjunctions
    "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for",
    "with", "by", "at", "from", "is", "are", "was", "were", "be", "been",
    "has", "have", "had", "this", "that", "it", "its", "as", "i", "you",
    "he", "she", "we", "they", "his", "her", "their", "our", "your",
    "my", "me", "him", "them", "us", "who", "whom", "which", "what",
    "when", "where", "why", "how", "all", "any", "some", "no", "not",
    "so", "too", "very", "just", "also", "than", "then", "there",
    "here", "into", "over", "under", "up", "down", "out", "off",
    # Common verbs / filler that make weak tags
    "watch", "see", "get", "got", "make", "made", "take", "takes",
    "go", "goes", "come", "came", "say", "says", "said", "tell",
    "video", "clip", "footage", "moment", "moments",
}
_UR_STOP = {
    "اور", "کا", "کی", "کے", "میں", "نے", "کو", "سے", "پر", "ہے", "ہیں",
    "تھا", "تھی", "یہ", "وہ", "جو", "کیا", "بھی", "ہو", "گیا",
}
# Words that must never appear in generated output. Masked forms
# (a**, f***) are caught by the "*" check in _clean_token.
_PROFANITY = {
    "fuck", "shit", "bitch", "bastard", "damn", "hell", "ass",
    "crap", "dick", "pussy", "whore", "slut",
}
# Small offline related-terms map (generic, no factual claims about
# any specific video — only the search terms people pair with a topic).
_RELATED = {
    "trump": ["donald trump", "us politics"],
    "biden": ["us politics"],
    "news": ["breaking news", "latest news update"],
    "reaction": ["viral reaction", "public reaction"],
    "speech": ["public speech", "key speech moments"],
    "election": ["us election", "election update"],
    "cricket": ["cricket news", "cricket highlights"],
    "football": ["football news", "football highlights"],
    "pakistan": ["pakistan news"],
    "india": ["india news"],
    "america": ["us news"],
}


def _is_urdu(text: str) -> bool:
    urdu = sum(1 for ch in text if "\u0600" <= ch <= "\u06ff")
    letters = sum(1 for ch in text if ch.isalpha())
    return letters > 0 and urdu / max(1, letters) > 0.4


def _tokens(text: str) -> list[str]:
    return re.findall(r"[\w\u0600-\u06ff]+", text or "")


def _clean_token(raw: str) -> str | None:
    """A usable keyword token, or None for junk/profanity/stopwords."""
    w = (raw or "").strip()
    if not w or "*" in w or len(w) < 2:
        return None
    low = w.lower()
    if low in _EN_STOP or w in _UR_STOP or low in _PROFANITY:
        return None
    if low.isdigit():
        return None
    return w


def _ranked_keywords(title: str, tags: list[str] | None,
                      description: str = "") -> tuple[list[str], list[str]]:
    """Return (single keywords, phrases) ranked by mined score.

    Title counts most, tags next, description least — and a word
    written with a capital in the title/tags (a name or place)
    scores extra, because names are the strongest SEO keywords.
    Order is score first, then first appearance, so output is
    deterministic and stable across runs.
    """
    scores: dict[str, float] = {}
    display: dict[str, str] = {}
    first_seen: dict[str, int] = {}
    order = [0]

    def add(word: str, weight: float, capitalised: bool) -> None:
        clean = _clean_token(word)
        if not clean:
            return
        low = clean.lower()
        if low not in first_seen:
            first_seen[low] = order[0]
            display[low] = clean
        order[0] += 1
        scores[low] = scores.get(low, 0) + weight + (1.0 if capitalised else 0)

    title_words = _tokens(title or "")
    for i, w in enumerate(title_words):
        add(w, 3.0, w[:1].isupper() and i > 0)
    for tag in tags or []:
        tag_words = _tokens(tag)
        for w in tag_words:
            add(w, 2.0, w[:1].isupper())
    for w in _tokens((description or "")[:2000]):
        add(w, 1.0, False)

    ranked = sorted(scores, key=lambda k: (-scores[k], first_seen[k]))
    keywords = [display[k] for k in ranked]

    # Phrases: whole original tags (2-3 words) first, then title
    # bigrams of two kept keywords — these are the strong SEO tags.
    phrases: list[str] = []
    seen_ph: set[str] = set()

    def add_phrase(phrase: str) -> None:
        p = " ".join(_tokens(phrase)).strip().lower()
        if not p or p in seen_ph:
            return
        words = p.split()
        if len(words) < 2 or len(words) > 3 or len(p) > 32:
            return
        if any(_clean_token(w) is None for w in words):
            return
        if any(w in {"fat", "shove"} for w in words):
            return
        seen_ph.add(p)
        phrases.append(p)

    for tag in tags or []:
        add_phrase(tag)
    kept = [w.lower() for w in title_words if _clean_token(w)]
    for a, b in zip(kept, kept[1:]):
        add_phrase(f"{a} {b}")
    return keywords[:20], phrases[:20]


def extract_keywords(title: str, tags: list[str] | None, description: str = "") -> list[str]:
    """Backwards-compatible helper: ranked single keywords only."""
    keywords, _ = _ranked_keywords(title, tags, description)
    return keywords[:12]


def _title_case(phrase: str) -> str:
    return " ".join(w.capitalize() for w in phrase.split())


# Words that make a bad TOPIC (they are fine as tags, but a title
# built from them reads wrong, e.g. "Ballroom Trump Priceless").
_TOPIC_SKIP = {
    "priceless", "surprising", "shocking", "major", "big", "huge",
    "latest", "breaking", "new", "full", "complete", "special",
    "moment", "moments", "video", "clip", "story", "details",
    "fat", "shove", "build",
}
# Small offline name list: if one of these is a top keyword, it
# leads the topic ("Trump Ballroom Reaction", not "Ballroom Trump
# Priceless"). This is a name bonus, not a fact claim — the name
# must already be a mined keyword from the original.
_KNOWN_NAMES = {
    "trump", "biden", "obama", "khan", "sharif", "modi", "putin",
    "zelensky", "musk", "messi", "ronaldo", "kohli", "babar",
    "shahbaz", "nawaz", "imran",
}


def _topic(keywords: list[str], n: int = 3) -> str:
    """Topic phrase: a known name first (if present), then the top
    noun keywords, skipping adjectives/verbs that read wrong as a
    topic. Falls back to the top keywords if nothing else fits."""
    lowered = [k.lower() for k in keywords]
    name = next((k for k in lowered if k in _KNOWN_NAMES), None)
    rest = [k for k in lowered if k != name and k not in _TOPIC_SKIP]
    ordered = ([name] if name else []) + rest
    if not ordered:
        ordered = lowered
    return _title_case(" ".join(ordered[:n]))


def _person(keywords: list[str], title: str) -> str:
    """Deprecated person guess — kept for API symmetry only. The
    old version returned the first capitalised word, which for a
    headline starting with a verb gave nonsense like "Shove
    Reacts". Titles no longer use it; they are topic-built."""
    return keywords[0] if keywords else "This Story"


def _trim_title(text: str, limit: int = 100) -> str:
    text = " ".join(text.split()).strip()
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0].strip()
    return cut + "…"


def generate_title(original_title: str, tags: list[str] | None, variant: int = 0, description: str = "") -> str:
    """Built title, never the original, never profanity."""
    orig = (original_title or "").strip()
    if not orig:
        return "New Video Update | Full Details, Explained"
    if _is_urdu(orig):
        keywords, _ = _ranked_keywords(orig, tags, description)
        topic = " ".join(keywords[:3]) if keywords else "تازہ ترین خبر"
        formulas = [
            f"{topic} | مکمل تفصیلات اور اہم نکات",
            f"{topic} — کیا ہوا، کیوں ہوا، آگے کیا ہوگا",
            f"تازہ ترین اپڈیٹ: {topic} کی مکمل کہانی",
            f"{topic} | وہ لمحہ جس پر سب بات کر رہے ہیں",
        ]
        return _trim_title(formulas[variant % len(formulas)])
    keywords, phrases = _ranked_keywords(orig, tags, description)
    if not keywords:
        return "New Video Update | Full Details, Explained"
    topic = _topic(keywords, 3)
    second = phrases[0] if phrases else keywords[1] if len(keywords) > 1 else topic
    second_tc = _title_case(second)
    hooks = [
        "A Moment Caught on Camera",
        "What Led Up to It — and Why It Matters",
        "The Clip Everyone Is Talking About",
        "Context, Reaction & What's Next",
    ]
    hook = hooks[(variant // 8) % len(hooks)]
    formulas = [
        f"{topic}: {hook} | Full Breakdown",
        f"{topic} Explained: {second_tc} in Detail",
        f"Why {topic} Is Everywhere Right Now | Key Moments",
        f"{topic} — What Really Happened, Step by Step",
        f"The {topic} Moment Everyone Is Talking About",
        f"{topic} Update: What You Need to Know",
        f"Breaking Down {topic} | Reaction, Context & What's Next",
        f"{topic} in Focus: {second_tc} | Complete Story",
    ]
    new = formulas[variant % len(formulas)]
    # Safety: never repeat a 4-word chunk of the original headline.
    orig_low = " ".join(orig.lower().split())
    new_words = new.lower().split()
    for i in range(len(new_words) - 3):
        chunk = " ".join(new_words[i: i + 4])
        if chunk in orig_low:
            new = f"{topic}: {hook} | Full Breakdown"
            break
    if new.lower().strip() == orig.lower().strip():
        new = f"{topic}: {hook} | Full Breakdown"
    return _trim_title(new)


def generate_description(original_title: str, tags: list[str] | None, variant: int = 0, description: str = "") -> str:
    """Structured, self-written description — hook, key points,
    why it matters, hashtags. Original sentences are never copied;
    only mined keywords fill the fresh sentences written here."""
    keywords, phrases = _ranked_keywords(original_title, tags, description)
    if _is_urdu(original_title or ""):
        topic = " ".join(keywords[:3]) if keywords else "اس خبر"
        hooks = [
            f"اس ویڈیو میں {topic} کی مکمل کہانی اپنے الفاظ میں پیش کی گئی ہے — وہ لمحہ، اس کا پس منظر، اور اس پر لوگوں کا ردعمل۔",
            f"{topic} کے بارے میں جاننے والی ہر اہم بات، ایک جگہ — بغیر کسی نقل کے، صرف اصل خلاصہ۔",
        ]
        points = [
            "اہم لمحہ — کیا ہوا اور کون شامل تھا",
            "ردعمل — لوگوں نے اس پر کیا کہا",
            "پس منظر — یہ معاملہ کیوں اہم ہے",
            "آگے کیا — اس کے بعد کیا ہو سکتا ہے",
        ]
        body = hooks[variant % len(hooks)] + "\n\nاس ویڈیو میں:\n" + "\n".join(f"• {p}" for p in points)
        body += "\n\nیہ خلاصہ معلوماتی مقصد کے لیے اپنے الفاظ میں تیار کیا گیا ہے۔ ویڈیو آخر تک دیکھیں تاکہ مکمل تصویر سامنے آ سکے۔"
        return body
    if not keywords:
        return ("In this video, we break down the full story in our own "
                "words — the key moment, the reaction, and what happens "
                "next.\n\nWatch till the end for the complete picture.\n\n"
                "Presented in original words, for informational purposes only.")
    topic = _topic(keywords, 3)
    topic_low = topic.lower()
    hooks = [
        f"Something happened that got everyone talking — and this video breaks down {topic_low} in plain words, from the moment itself to why it matters.",
        f"If you missed {topic_low}, this is the complete catch-up: what happened, how people reacted, and what to watch for next.",
        f"This is {topic_low}, explained properly — no noise, no copied headlines, just the story, the context, and the key moments.",
    ]
    hook = hooks[variant % len(hooks)]
    # Key points: fresh sentences around the top keywords, in a
    # rotating order so Regenerate changes the description, not
    # just one word in it.
    point_templates = [
        f"The key moment — how {topic_low} unfolded and who was at the centre of it.",
        f"The reaction — why this moment stood out and what people took from it.",
        f"The context — the background you need to understand what really happened.",
        f"What happens next — and why this story is still being talked about.",
    ]
    if variant:
        shift = variant % len(point_templates)
        point_templates = point_templates[shift:] + point_templates[:shift]
    secondary = ", ".join(k.lower() for k in keywords[3:6]) if len(keywords) > 3 else "the wider conversation"
    hashtags = []
    for k in keywords[:8]:
        tag = "#" + re.sub(r"[^A-Za-z0-9]", "", k)
        if len(tag) > 2 and tag not in hashtags:
            hashtags.append(tag)
    for extra in ["#LatestNews", "#Explained", "#FullBreakdown"]:
        if extra not in hashtags:
            hashtags.append(extra)
    desc = (
        f"{hook}\n\n"
        f"In this video:\n" + "\n".join(f"• {p}" for p in point_templates) + "\n\n"
        f"This breakdown also covers {secondary}, so you get the full "
        f"picture — not just one clip out of context.\n\n"
        f"Watch till the end for the complete story.\n\n"
        f"{' '.join(hashtags[:12])}\n\n"
        f"Presented in our own words for news and information purposes "
        f"only. This is an original summary, not a re-upload of "
        f"another creator's work."
    )
    return desc[:4800]


def generate_tags(original_title: str, tags: list[str] | None, variant: int = 0, description: str = "") -> list[str]:
    """Tiered SEO tags: core phrases, long-tail phrases, related
    terms, broad terms — core tags stay, the rest rotate by variant
    so Regenerate visibly changes the tag set without losing topic."""
    keywords, phrases = _ranked_keywords(original_title, tags, description)
    if not keywords:
        return ["latest update", "full details", "explained"]
    out: list[str] = []
    seen: set[str] = set()

    def add(tag: str) -> None:
        t = " ".join(tag.strip().lower().split())
        if not t or t in seen or len(t) > 32 or len(t) < 2:
            return
        if any(_clean_token(w) is None for w in t.split()):
            return
        seen.add(t)
        out.append(t)

    # Tier 1 — core: top phrases + top single names.
    for p in phrases[:6]:
        add(p)
    for k in keywords[:5]:
        add(k)
    # Tier 2 — long-tail: the phrases people actually search.
    topic = _topic(keywords, 3).lower()
    # "{first-topic-word} reaction" only when the video is actually
    # about a reaction — otherwise a tutorial gives "react reaction".
    if "reaction" in [k.lower() for k in keywords]:
        add(f"{topic.split()[0]} reaction")
    add(f"{topic} explained")
    add(f"{topic} full details")
    add(f"latest {topic}")
    # Tier 3 — related, from the offline map (generic pairings only).
    for k in keywords[:6]:
        for rel in _RELATED.get(k.lower(), []):
            add(rel)
    # Tier 4 — broad, rotated by variant.
    broad_sets = [
        ["latest update", "full breakdown", "key moments"],
        ["complete report", "what happened", "must watch"],
        ["full coverage", "breaking update", "explained"],
    ]
    core = out[:6]
    rest = out[6:]
    if rest and variant:
        shift = variant % len(rest)
        rest = rest[shift:] + rest[:shift]
    out = core + rest
    for b in broad_sets[variant % len(broad_sets)]:
        add(b)
        out.append(b) if b not in out else None
    # Deduplicate preserving order (add() already guards, but the
    # broad step above can re-add — normalise here), then enforce
    # YouTube's 500-character total, max 30 tags.
    final: list[str] = []
    seen = set()
    total = 0
    for t in out:
        if t in seen:
            continue
        if total + len(t) + 1 > 480 or len(final) >= 30:
            break
        seen.add(t)
        final.append(t)
        total += len(t) + 1
    return final


def generate_metadata(original_title: str, original_description: str,
                      original_tags: list[str] | None, variant: int = 0) -> dict:
    """Generate all three. Original description is now MINED for
    keywords (words/phrases only, weight 1) — its sentences are
    still never copied into the new description."""
    return {
        "generated_title": generate_title(original_title, original_tags, variant, original_description),
        "generated_description": generate_description(original_title, original_tags, variant, original_description),
        "generated_tags": generate_tags(original_title, original_tags, variant, original_description),
        "generated_note": "Generated locally, free, no AI API. Keywords mined from title/tags/description; no original sentences copied.",
    }
