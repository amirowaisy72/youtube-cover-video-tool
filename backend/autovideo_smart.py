"""Smart scenes for Auto Video (user, 2026-11-18).

"The scene talks about money and a wallet, but the system put a bird on a
post." An AI now reads every scene (and the title) and plans it:
  - queries   3 stock-footage searches that SHOW the scene's meaning
  - avoid     things that must not be shown (animals in a money scene…)
  - key       the key words to pop up on screen
  - list      things being counted out ("money, health, wife…") → stacked pop-ups
  - presenter whether a presenter saying it to camera beats footage
Without an AI answer, a careful rule-based plan is made instead.

"The system always uses the same footage": footage is chosen at random
among the best matches (not always #1), from different result pages, and
clips used in earlier videos are remembered and avoided.
"""

from __future__ import annotations

import json
import random
import re
import threading
import time
from pathlib import Path

import autovideo

_PLAN_CHUNK = 8

_STOP = set("the a an and or but if of to in on at for with from by as is are was were be been being it its this that these "
            "those you your yours we our they their he she his her i me my not no so than then too very just can will would "
            "should could do does did have has had about into over under more most less some any all each every what which who "
            "how why when where there here also only even still like one two it's that's you're don't let get got make".split())
_FIN_WORDS = {"money", "salary", "paycheck", "budget", "savings", "save", "invest", "investing", "debt", "loan", "interest",
              "income", "spending", "bills", "rent", "wallet", "cash", "bank", "credit", "card", "tax", "taxes", "retirement",
              "emergency", "fund", "stocks", "wealth", "rich", "broke", "habit", "habits", "subscriptions", "inflation",
              "health", "family", "time", "freedom", "goal", "goals", "mindset", "success", "secret", "mistake", "mistakes"}


def _beats(text: str) -> int:
    """How many footage changes a scene gets: one about every 9 spoken words (~3.5 s),
    so a wrong clip never stays on screen long (user, 2026-11-19)."""
    return max(0, min(4, round(len(text.split()) / 11) - 1))  # at most 4 cuts: a faster footage step (user, 2026-11-19)


def _brief_prompt(title: str, script: str) -> str:
    return (
        f'A YouTube video is titled "{title}". Its script starts:\n{script[:2500]}\n\n'
        "Before footage is chosen, explain the topic so stock footage stays RELEVANT. Reply ONLY JSON: "
        '{"about":"one sentence: what the subject is (e.g. GTA 6 is a video game by Rockstar Games)",'
        '"important":["10-20 important words/names of THIS topic exactly as they appear in the script"],'
        '"world":["8 short (2-4 words) stock VIDEO searches that always fit this topic, e.g. for a video game: '
        'gamer holding controller, gaming pc rgb, neon city night, sports car night drive"],'
        '"avoid":["words for footage that would look wrong in this video"]}')


def ai_scene_items(data) -> list[dict]:
    """The per-scene answers of an AI reply, whatever shape it came in: a list of objects,
    an object keyed by scene number, or a bare list. Anything that is not an object is
    dropped, so an odd AI answer can never stop the video (user, 2026-11-19)."""
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        rows = data.get("scenes")
        if rows is None:
            rows = [v for k, v in data.items() if str(k).isdigit()]
            for k, v in data.items():
                if str(k).isdigit() and isinstance(v, dict):
                    v.setdefault("n", int(k))
        elif isinstance(rows, dict):
            fixed = []
            for k, v in rows.items():
                if isinstance(v, dict):
                    v = dict(v)
                    if str(k).isdigit():
                        v.setdefault("n", int(k))
                    fixed.append(v)
            rows = fixed
    else:
        rows = []
    out = []
    for k, v in enumerate(rows if isinstance(rows, list) else []):
        if isinstance(v, dict):
            v.setdefault("n", k + 1)
            out.append(v)
    return out


def _as_list(v) -> list:
    if isinstance(v, list):
        return v
    if isinstance(v, str) and v.strip():
        return [x.strip() for x in v.split(",") if x.strip()]
    return []


def topic_brief(title: str, scenes: list[dict]) -> dict:
    """One look at the whole video: what it is about, its important words, safe searches."""
    script = "\n".join(s["narration"] for s in scenes)
    out = {"about": "", "important": [], "world": [], "avoid": []}
    try:
        import tools_animator as ta
        data = ta._json_in(ta._ask_ai(_brief_prompt(title, script), timeout=90, attempts=2))
    except Exception:  # noqa: BLE001
        data = None
    if isinstance(data, dict):
        out["about"] = str(data.get("about") or "")[:200]
        for k, n in (("important", 20), ("world", 8), ("avoid", 10)):
            out[k] = [str(x).strip()[:40] for x in _as_list(data.get(k)) if str(x).strip()][:n]
    if not out["world"]:
        tw = autovideo.core_words(title)[:3]
        out["world"] = [" ".join(tw[:2])] if tw else []
    return out


def _plan_prompt(title: str, part: list[tuple[int, str]], brief: dict | None = None) -> str:
    lines = "\n".join(f"{n}. [{_beats(text)} shots] {text[:900]}" for n, text in part)
    b = brief or {}
    ctx = ""
    try:
        import tools_graphics
        if tools_graphics.style()["theme"] == "docu":
            ctx += ("STYLE: a calm research documentary — queries for cinematic, wide, aerial or slow shots of real places, "
                    "ships, ports, trucks, factories, fields, warehouses, cities and markets; no people talking to camera, no "
                    "cartoons, no flashy stock clichés.\n")
    except Exception:  # noqa: BLE001
        pass
    if b.get("about") or b.get("important"):
        ctx = (f"TOPIC: {b.get('about', '')} Important words of this topic: {', '.join(b.get('important') or [])}. "
               f"Footage that always fits: {', '.join(b.get('world') or [])}.\n")
    return (
        f'You plan the visuals of a YouTube video titled "{title}". ' + ctx + 'For EACH numbered scene below, '
        'reply with ONLY JSON: {"scenes":[{"n":1,"queries":["...","...","..."],"avoid":["..."],'
        '"key":"...","list":[],"presenter":false,"shots":[{"words":"...","query":"..."}]}]}\n'
        "queries: 3 different short (2-4 words) Pexels/Pixabay stock VIDEO searches that SHOW what the scene "
        'means - concrete people, objects and actions (e.g. "man checking empty wallet", "paying bills laptop"), '
        "never abstract words, never a word that is only a figure of speech.\n"
        "avoid: words for footage that would be WRONG here (e.g. bird, animal, nature, snow when the scene is about money).\n"
        'key: the 1-3 most important words of the scene, copied EXACTLY from its text, to pop up on screen; "" if none.\n'
        "list: if the scene names 3 or more things one after another, those items exactly as written; else [].\n"
        "presenter: true if this scene is stronger said to camera by a presenter (the hook, a direct question to the "
        "viewer, a strong opinion, the 'here is the fix' moment, the call to subscribe); false if footage shows it better.\n"
        "shots: the footage CHANGES inside the scene - give EXACTLY the number written as [N shots] before the scene. "
        "Each change starts where an IMPORTANT word is spoken (a name, thing, place, number, action of THIS topic), spread "
        "evenly through the scene (never two within 6 words, none in the first 5 words). words: 1-4 words copied EXACTLY "
        "from the scene, in the order they appear; query: a 2-4 word stock VIDEO search that SHOWS that word IN THIS "
        "VIDEO'S TOPIC (for a video game: 'PC' -> 'gaming pc rgb', 'release' -> 'calendar date circled', 'Vice City' -> "
        "'miami skyline night'); never a literal meaning that does not fit the topic.\n"
        "Scenes:\n" + lines)


def list_items(text: str) -> list[str]:
    """'money, health, wife, mom and father' → the items (3+ short ones)."""
    for chunk in re.split(r"[.!?;:]", text):
        if chunk.count(",") < 2:
            continue
        parts = [p.strip(" '\"") for p in re.split(r",|\band\b|\bor\b", chunk) if p.strip()]
        run: list[str] = []
        for k, p in enumerate(parts):
            words = p.split()
            if len(words) > 3 and not run and k + 1 < len(parts):
                p, words = words[-1], words[-1:]  # "Write down your rent, food…" → "rent"
            elif len(words) > 3 and len(run) >= 2:
                p, words = words[0], words[:1]  # "…mom and father are all blessings" → "father"
            if 1 <= len(words) <= 3 and not {w.lower() for w in words} <= _STOP:
                run.append(p)
            elif len(run) >= 3:
                break
            else:
                run = []
        if len(run) >= 3:
            return run[:6]
    return []


def key_words(text: str, title: str) -> str:
    title_w = {w.lower() for w in re.findall(r"[A-Za-z']+", title)}
    best, score = "", 0.0
    for w in re.findall(r"[A-Za-z][A-Za-z'-]+", text):
        lw = w.lower().strip("'")
        if lw in _STOP or len(lw) < 4:
            continue
        sc = len(lw) * 0.15 + (2.5 if lw in _FIN_WORDS else 0) + (1.5 if lw in title_w else 0) + (1 if w[0].isupper() else 0)
        if sc > score:
            best, score = w, sc
    return best if score >= 1.6 else ""


def _rules_plan(title: str, text: str, index: int, count: int) -> dict:
    core = autovideo.core_words(text)[:6]
    tcore = autovideo.core_words(title)[:2]
    queries: list[str] = []
    for a in range(0, 5, 2):
        q = " ".join(core[a:a + 2])
        if q and q not in queries:
            queries.append(q)
    if tcore and len(queries) < 3:
        queries.append(" ".join(tcore))
    low = text.lower()
    presenter = (index == 0 or index == count - 1 or "?" in text or
                 bool(re.search(r"\b(here'?s (the|how|what)|let me|you need to|try this|subscribe|my advice|the truth)\b", low)))
    items = list_items(text)
    shots = [{"words": it, "query": it} for it in items[:3] if len(it) > 2]
    if len(shots) < _beats(text):  # a change about every 9 words, on the strongest word of each part
        toks = text.split()
        tw = {w.lower() for w in re.findall(r"[A-Za-z']+", title)}
        have = {sh["words"].lower() for sh in shots}
        for a in range(9, len(toks) - 4, 9):
            part = toks[a:a + 9]
            best, sc = "", 0.0
            for w in part:
                lw = re.sub(r"[^a-z0-9'-]", "", w.lower())
                if len(lw) < 3 or lw in _STOP:
                    continue
                v = len(lw) * 0.2 + (2 if lw in tw else 0) + (1 if w[:1].isupper() else 0) + (1.5 if any(c.isdigit() for c in lw) else 0)
                if v > sc:
                    best, sc = re.sub(r"[^A-Za-z0-9'-]", "", w), v
            if best and best.lower() not in have:
                core = [c for c in autovideo.core_words(" ".join(part)) if c.lower() != best.lower()][:1]
                shots.append({"words": best, "query": " ".join([best.lower()] + core)})
                have.add(best.lower())
        shots.sort(key=lambda sh: text.lower().find(sh["words"].lower()))
    return {"queries": queries[:3], "avoid": [], "key": key_words(text, title), "list": items,
            "presenter": presenter, "shots": shots, "by": "rules"}


def attach_scene_plans(title: str, scenes: list[dict]) -> None:
    """scene["plan"] for every scene (AI first, rules where it cannot answer)."""
    n = len(scenes)
    for i, sc in enumerate(scenes):
        sc["plan"] = _rules_plan(title, sc["narration"], i, n)
    try:
        import tools_animator as ta
    except Exception:  # noqa: BLE001
        return
    brief = topic_brief(title, scenes)
    for sc in scenes:
        sc["topic"] = brief
    for start in range(0, n, _PLAN_CHUNK):
        part = [(i + 1, scenes[i]["narration"]) for i in range(start, min(n, start + _PLAN_CHUNK))]
        try:
            data = ta._json_in(ta._ask_ai(_plan_prompt(title, part, brief), timeout=120, attempts=2))
        except Exception:  # noqa: BLE001 — the rules plan stays
            continue
        for item in ai_scene_items(data):
            try:
                i = int(item.get("n")) - 1
            except (TypeError, ValueError):
                continue
            if not 0 <= i < n:
                continue
            try:
                _apply_plan(scenes[i], item, brief)
            except Exception:  # noqa: BLE001 — this scene keeps its rules plan
                continue


def _apply_plan(scene: dict, item: dict, brief: dict) -> None:
    """Copy one AI scene answer into the scene's plan (only valid values)."""
    low = scene["narration"].lower()
    plan = scene["plan"]
    queries = [str(q).strip()[:40] for q in _as_list(item.get("queries")) if str(q).strip()][:3]
    if queries:
        plan["queries"] = queries
    plan["avoid"] = ([str(a).strip().lower()[:20] for a in _as_list(item.get("avoid")) if str(a).strip()][:8]
                     + [str(a).lower() for a in brief.get("avoid") or []][:6])
    key = str(item.get("key") or "").strip()
    if key and key.lower() in low:
        plan["key"] = key
    items = [str(x).strip() for x in _as_list(item.get("list")) if str(x).strip() and str(x).strip().lower() in low]
    if len(items) >= 3:
        plan["list"] = items[:6]
    if isinstance(item.get("presenter"), bool):
        plan["presenter"] = item["presenter"]
    shots, last = [], 15
    for sh in (item.get("shots") if isinstance(item.get("shots"), list) else []):
        if not isinstance(sh, dict):
            continue
        w, q = str(sh.get("words") or "").strip(), str(sh.get("query") or "").strip()
        p = low.find(w.lower(), last) if w else -1
        if q and p >= last:  # in order, and not crowded together
            shots.append({"words": w[:80], "query": q[:40], "at": p})
            last = p + 25
    if shots:
        plan["shots"] = shots[:4]
    plan["by"] = "ai"


def pick_studio_scenes(scenes: list[dict]) -> list[int]:
    """Which scenes the presenter says to camera: the plan's choice, kept
    balanced — about a third of the video, never all, never none, and not
    many in a row."""
    n = len(scenes)
    if n == 0:
        return []
    want = [i for i, s in enumerate(scenes) if (s.get("plan") or {}).get("presenter")]
    lo, hi = max(1, round(n * 0.2)), max(1, round(n * 0.45))
    chosen: list[int] = []
    for i in want:
        if len(chosen) >= hi:
            break
        if len(chosen) >= 2 and chosen[-1] == i - 1 and chosen[-2] == i - 2:
            continue  # three studio scenes in a row: let footage breathe
        chosen.append(i)
    graphic = {i for i, s in enumerate(scenes) if s.get("graphic") and s.get("visual_file") == s.get("graphic_file")}
    chosen = [i for i in chosen if i not in graphic]  # a motion graphic scene stays a graphic
    for i in [0, n - 1] + list(range(2, n, 3)):  # too few: the opening, the end, then a steady spread
        if len(chosen) >= lo:
            break
        if i not in chosen and i not in graphic:
            chosen.append(i)
    if n > 2 and len(chosen) >= n:
        chosen = chosen[: n - 1]
    return sorted(set(chosen))


# ------------------------------------------------------------ footage
_MEMORY_FILE = Path(__file__).resolve().parent / "footage_memory.json"
_MEMORY_LOCK = threading.Lock()


def footage_memory() -> dict:
    try:
        return json.loads(_MEMORY_FILE.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}


def remember_footage(url: str) -> None:
    """Footage used in a video is remembered, so the next videos pick other clips."""
    with _MEMORY_LOCK:
        mem = footage_memory()
        mem[url] = time.time()
        if len(mem) > 6000:
            mem = dict(sorted(mem.items(), key=lambda kv: kv[1])[-5000:])
        try:
            _MEMORY_FILE.write_text(json.dumps(mem), encoding="utf-8")
        except OSError:
            pass


def vary(items: list[dict], top: int = 6) -> list[dict]:
    """The best few in a random order (not always #1); recently used ones last."""
    mem = footage_memory()
    fresh = [it for it in items if it.get("url") not in mem]
    old = sorted((it for it in items if it.get("url") in mem), key=lambda it: mem.get(it["url"], 0))
    head = fresh[:top]
    random.shuffle(head)
    return head + fresh[top:] + old


def smart_candidates(title: str, scene: dict, visuals: str, pexels_key, pixabay_key, vertical: bool) -> dict:
    """Candidates from the scene plan's searches, wrong things filtered out,
    scored by how well they match, then varied."""
    plan = scene.get("plan") or {}
    queries = [q for q in plan.get("queries") or [] if q][:3]
    out: dict = {"videos": [], "images": []}
    if not queries:
        return out
    avoid = {a for a in plan.get("avoid") or [] if a}
    seen: set = set()
    scored: dict = {"videos": [], "images": []}
    try:
        import tools_stock
    except Exception:  # noqa: BLE001
        tools_stock = None

    def add(kind: str, url, tags: str, query: str, extra: dict) -> None:
        if not url or url in seen:
            return
        words = set(re.findall(r"[a-z]+", (tags or "").lower()))
        if words & avoid:
            return  # a bird in a money scene: never
        qw = set(re.findall(r"[a-z]+", query.lower())) - _STOP
        # (2026-11-22 — Option 2 fix) a candidate whose tags share
        # NO word with the query is never a match — the old score
        # (2.0 base + overlap) let zero-overlap results in, and
        # the random page + shuffle then picked them. A query that
        # is all stop words has no qw: those pass (nothing to
        # check against). The seen-set is marked only after the
        # gates, so a candidate rejected under one query can still
        # be accepted under another.
        if qw and not (words & qw):
            return
        seen.add(url)
        score = 2.0 + len(words & qw) * 1.5
        if vertical and (extra.get("height") or 0) > (extra.get("width") or 0):
            score += 2
        scored[kind].append((score + random.random(), {"url": url, "title": tags or query, **extra}))

    for q in queries:
        page = random.choice([1, 1, 2, 3])  # not always the same first results
        if tools_stock and visuals in ("videos", "both"):
            if pexels_key:
                try:
                    res = tools_stock._search_pexels(q, page, pexels_key, orientation="portrait" if vertical else None)
                    for r in (res.get("results") or [])[:15]:
                        add("videos", r.get("video_url"), r.get("tags") or "", q, {"mime": "video/mp4", "source": "pexels"})
                except Exception:  # noqa: BLE001
                    pass
            if pixabay_key:
                try:
                    res = tools_stock._search_pixabay(q, page, pixabay_key, orientation="vertical" if vertical else None)
                    for r in (res.get("results") or [])[:15]:
                        add("videos", r.get("video_url"), r.get("tags") or "", q, {"mime": "video/mp4", "source": "pixabay"})
                except Exception:  # noqa: BLE001
                    pass
        if tools_stock and visuals in ("images", "both"):
            for fn, key in (("_search_pexels_images", pexels_key), ("_search_pixabay_images", pixabay_key)):
                if not key or not hasattr(tools_stock, fn):
                    continue
                try:
                    for r in (getattr(tools_stock, fn)(q, page, key).get("results") or [])[:10]:
                        add("images", r.get("image_url"), r.get("tags") or "", q,
                            {"mime": "image/jpeg", "thumb": r.get("thumb_url") or r.get("image_url")})
                except Exception:  # noqa: BLE001
                    pass
        if not (pexels_key or pixabay_key):
            # no stock keys: Wikimedia Commons, with the same meaning-based searches
            for ftype, kind in (("video", "videos"), ("bitmap", "images")):
                if visuals not in (kind, "both"):
                    continue
                try:
                    for it in autovideo._commons_search(q, ftype, 15, 0):
                        add(kind, it.get("url"), it.get("title") or "", q,
                            {k: v for k, v in it.items() if k not in ("url", "title")})
                except Exception:  # noqa: BLE001
                    pass
    for kind in ("videos", "images"):
        out[kind] = vary([it for _, it in sorted(scored[kind], key=lambda p: -p[0])])
    return out


# ------------------------------------------------------------ visual verification
_AI_VERIFY_COOLDOWN_SEC = 300.0  # after one AI failure, stop asking for 5 minutes
_ai_verify_disabled_until = 0.0


def ai_verify_enabled() -> bool:
    """True when the AI verification path may be tried (not in
    its cooldown after a failure)."""
    import time as _time
    return _time.time() >= _ai_verify_disabled_until


def verify_clip_fits(narration: str, clip_title: str) -> bool | None:
    """Per-scene visual verification (user, 2026-11-22 — Option
    2 fix): ask the app's AI whether a stock clip actually SHOWS
    what the scene's narration is talking about, from the clip's
    title/tags alone — BEFORE the clip is downloaded. Returns
    True (fits), False (does not fit — re-pick) or None (could
    not check: no AI answer, unparseable answer, or cooldown —
    the deterministic gates decide, the scene never blocks).
    One AI failure puts verification on a 5-minute cooldown so
    a dead AI (e.g. free-limit 402) never slows a whole job."""
    import time as _time
    global _ai_verify_disabled_until
    if _time.time() < _ai_verify_disabled_until:
        return None
    narration = (narration or "").strip()
    clip_title = (clip_title or "").strip()
    if not narration or not clip_title:
        return None
    prompt = (
        "A YouTube scene is narrated as follows:\n"
        f"\"{narration[:400]}\"\n"
        "A stock video clip is titled:\n"
        f"\"{clip_title[:160]}\"\n"
        "Does this clip SHOW what the narration is talking about? "
        "Reply with exactly one word: YES or NO."
    )
    try:
        import tools_animator as ta
        answer = ta._ask_ai(prompt, timeout=60, attempts=1)
    except Exception:  # noqa: BLE001 — AI down: cool down, never block the scene
        _ai_verify_disabled_until = _time.time() + _AI_VERIFY_COOLDOWN_SEC
        return None
    first = (answer or "").strip().split()
    if not first:
        return None
    word = first[0].strip(".,!\"'").upper()
    if word == "YES":
        return True
    if word == "NO":
        return False
    return None


# ------------------------------------------------------------ pop-ups
# (user, 2026-11-18) "The pick-the-words strategy was wrong": the system
# chooses what pops up — the key words, the figures, and lists counted
# out one by one (stacked) — and paces them so they never rush in together.
_AMOUNT = {"fewer": 1, "normal": 2, "more": 3}
_GAP = 2.0  # seconds between two pop-ups starting


def _norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


class _Clock:
    """When each word of a scene's narration is spoken: from Whisper's
    subtitle cues (render), the presenter's sentence timings (studio
    filming), or evenly spread over the scene."""

    def __init__(self, narration: str, duration: float, cues: list[dict] | None = None, runs: list[dict] | None = None):
        self.words = narration.split()
        self.dur = max(0.1, duration)
        self.times: list[tuple[str, float]] = []
        spans = cues or runs or []
        for sp in spans:
            ws = str(sp.get("text") or "").split()
            a, b = float(sp.get("start", 0)), float(sp.get("end", 0))
            for k, w in enumerate(ws):
                self.times.append((_norm(w), a + (k + 0.5) / max(1, len(ws)) * (b - a)))

    def at_word(self, wi: int) -> float:
        n = max(1, len(self.words))
        if not self.times:
            return wi / n * self.dur
        guess = round(wi / n * len(self.times))
        target = _norm(self.words[wi]) if wi < len(self.words) else ""
        best = min(range(max(0, guess - 8), min(len(self.times), guess + 9)),
                   key=lambda j: (self.times[j][0] != target, abs(j - guess)), default=None)
        return self.times[best][1] if best is not None else wi / n * self.dur

    def word_index(self, char_pos: int, text: str) -> int:
        return len(text[:char_pos].split())


def plan_auto_popups(scenes: list[dict], work_dir: Path, amount: str = "normal",
                     runs_by_scene: dict | None = None, only_scene: int | None = None) -> list[dict]:
    """[{text, label, kind, start, end, scene, studio, side, group, row}] in video time."""
    import autovideo2 as av2
    per_scene = _AMOUNT.get(amount, 2)
    items: list[dict] = []
    offset = 0.0
    side_turn = 0
    for i, sc in enumerate(scenes):
        dur = float(sc.get("duration_sec") or 0)
        text = str(sc.get("narration") or "")
        if dur <= 0 or not text:
            offset += dur
            continue
        if only_scene is not None and i != only_scene:
            offset += dur
            continue
        if sc.get("graphic") and sc.get("visual_file") == sc.get("graphic_file"):
            offset += dur  # a motion graphic shows its own words and numbers
            continue
        cues = av2._parse_srt_cues(work_dir / f"scene-{i:02d}.srt")
        clock = _Clock(text, dur, cues=cues or None, runs=(runs_by_scene or {}).get(i))
        plan = sc.get("plan") or {}
        cands: list[dict] = []
        low = text.lower()
        # a list being counted out → stacked, one row per item as it is said
        lst = plan.get("list") or list_items(text)
        if len(lst) >= 3:
            pos, rows = 0, []
            for it in lst[:6]:
                p = low.find(it.lower(), pos)
                if p < 0:
                    continue
                pos = p + len(it)
                rows.append((it.strip().capitalize() if it.islower() else it.strip(), clock.at_word(clock.word_index(p, text))))
            if len(rows) >= 3:
                cands.append({"kind": "stack", "rows": rows, "prio": 3, "t": rows[0][1]})
        # figures: "$1,200", "10%", "3 million"
        for m in av2._NUMBER_RE.finditer(text):
            raw = m.group(0).strip()
            digits = re.sub(r"[^0-9]", "", raw)
            if not digits or (len(digits) == 1 and not re.search(r"[%$]|million|billion|thousand", raw, re.I)):
                continue
            cands.append({"kind": "stat", "text": av2._popup_display(raw).strip(), "label": av2._stat_label(text, m),
                          "prio": 2, "t": clock.at_word(clock.word_index(m.start(), text))})
        # the scene's key words
        key = str(plan.get("key") or "") or key_words(text, "")
        if key:
            p = low.find(key.lower())
            if p >= 0:
                cands.append({"kind": "word", "text": key[:1].upper() + key[1:], "prio": 1,
                              "t": clock.at_word(clock.word_index(p, text))})
        cands.sort(key=lambda c: (-c["prio"], c["t"]))
        studio = bool(sc.get("studio"))
        side_turn = 0  # each studio scene starts on the presenter's right, then alternates
        for c in sorted(cands[:per_scene], key=lambda c: c["t"]):
            side = ("right", "left")[side_turn % 2] if studio else ""
            side_turn += 1 if studio else 0
            base = {"scene": i, "studio": studio, "side": side, "prio": c["prio"]}
            if c["kind"] == "stack":
                gid = f"s{i}-{len(items)}"
                last = c["rows"][-1][1]
                for r, (t_txt, t) in enumerate(c["rows"]):
                    items.append({**base, "kind": "stack", "group": gid, "row": r, "text": t_txt, "label": "",
                                  "start": round(max(0.0, offset + t - 0.25), 2), "end": round(offset + last + 1.8, 2)})
            else:
                show = 2.4 if c["kind"] == "stat" else 1.8
                st = max(0.0, offset + c["t"] - 0.3)
                items.append({**base, "kind": c["kind"], "text": c["text"], "label": c.get("label", ""),
                              "start": round(st, 2), "end": round(st + show, 2)})
        offset += dur
    return _pace(items)


def _pace(items: list[dict]) -> list[dict]:
    """No rush: one idea at a time, a breath between them; a stacked list
    is one block. When two collide, the more important one stays."""
    blocks: dict[str, list[dict]] = {}
    for it in items:
        blocks.setdefault(it.get("group") or f"single-{id(it)}", []).append(it)
    order = sorted(blocks.values(), key=lambda b: (min(x["start"] for x in b)))
    kept: list[list[dict]] = []
    for b in order:
        start, end = min(x["start"] for x in b), max(x["end"] for x in b)
        if kept:
            pstart, pend = min(x["start"] for x in kept[-1]), max(x["end"] for x in kept[-1])
            if start < pend + 0.4 or start - pstart < _GAP:
                prev_prio, prio = kept[-1][0].get("prio", 1), b[0].get("prio", 1)
                if prio > prev_prio:
                    kept[-1] = b  # the more important one stays (a list > a figure > a word)
                continue
        kept.append(b)
    return [x for b in kept for x in b]



# ------------------------------------------------------------ rich footage
# (user, 2026-11-18) "A better phone, a nicer apartment, more takeaway
# dinners — the footage should change for each of them." A scene gets
# extra shots at the moments the narration moves to a new concrete thing,
# each with its own clip; at render they are cut in with smooth effects
# exactly when those words are spoken.
SHOT_TRANSITIONS = ["smoothleft", "zoomin", "smoothup", "hblur", "smoothright", "slideup"]
SCENE_TRANSITIONS = ["zoomin", "smoothleft", "hblur", "circleopen", "smoothup", "radial", "smoothright", "slideleft"]
SAFE_TRANSITIONS = ["fade", "smoothleft", "circleopen", "slideleft", "dissolve", "smoothup"]


def collect_shots(title: str, scene: dict, index: int, work_dir: Path, visuals: str, pexels_key, pixabay_key,
                  vertical: bool, used: set, lock) -> list[dict]:
    """Download one clip for each planned shot (videos only), a few at once.
    (2026-11-22 — Option 2 fix) a shot is tried ONLY on its own query:
    the old fallback to random "world" topic searches filled scenes
    with clips about something else entirely (a shot about the moon
    could end up showing a random world landmark). A shot that finds
    nothing on its own query simply has no extra shot — the main
    clip carries the scene."""
    if visuals == "images":
        return []
    from concurrent.futures import ThreadPoolExecutor
    plan = scene.get("plan") or {}
    avoid = plan.get("avoid") or []

    def one(k: int, sh: dict) -> dict | None:
        tries = [sh["query"]]
        for q in tries:
            fake = {"plan": {"queries": [q], "avoid": avoid}}
            try:
                cands = smart_candidates(title, fake, "videos", pexels_key, pixabay_key, vertical)["videos"]
            except Exception:  # noqa: BLE001
                cands = []
            for item in cands[:6]:
                with lock:
                    if item["url"] in used:
                        continue
                    used.add(item["url"])
                dest = work_dir / f"scene-{index:02d}-shot{k + 1}.mp4"
                try:
                    if autovideo._download(item["url"], dest, total_timeout=60) and autovideo._ffprobe_duration(dest):
                        remember_footage(item["url"])
                        return {"file": dest.name, "words": sh["words"], "query": q, **({"at": sh["at"]} if "at" in sh else {})}
                except Exception:  # noqa: BLE001
                    pass
                with lock:
                    used.discard(item["url"])
        return None

    shots = list(plan.get("shots") or [])
    with ThreadPoolExecutor(max_workers=3) as pool:
        got = list(pool.map(lambda kv: one(*kv), enumerate(shots)))
    return [g for g in got if g]


def compose_shots(work_dir: Path, index: int, main_clip: Path, scene: dict, duration: float,
                  srt_path: Path | None, voice_path: Path | None, vertical: bool) -> Path | None:
    """The scene's main clip + its extra shots, each starting when its words
    are spoken, joined with smooth transitions → one clip of the scene's length."""
    import subprocess
    import video as video_module
    shots = [sh for sh in scene.get("shots") or [] if (work_dir / sh["file"]).exists()]
    if not shots or duration < 4:
        return None
    text = str(scene.get("narration") or "")
    low = text.lower()
    cues = None
    if srt_path and srt_path.exists():
        import autovideo2 as av2
        cues = av2._parse_srt_cues(srt_path) or None
    runs = None
    if voice_path is not None:
        try:
            runs = json.loads(voice_path.with_suffix(".json").read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            runs = None
    clock = _Clock(text, duration, cues=cues, runs=runs)
    cuts: list[tuple[float, Path]] = [(0.0, main_clip)]
    last = 0
    for sh in sorted(shots, key=lambda x: x.get("at", low.find(x["words"].lower()))):
        p = sh["at"] if isinstance(sh.get("at"), int) and low[sh["at"]:].startswith(sh["words"].lower()) else low.find(sh["words"].lower(), last)
        if p < 0:
            continue
        last = p + 1
        t = clock.at_word(clock.word_index(p, text)) - 0.15
        if t - cuts[-1][0] >= 1.4 and duration - t >= 1.2:  # a new picture on each important word, never a flash
            cuts.append((t, work_dir / sh["file"]))
    if len(cuts) < 2:
        return None
    T = 0.45
    W, H = (1080, 1920) if vertical else (1280, 720)
    pieces: list[Path] = []
    lens: list[float] = []
    for k, (t, clip) in enumerate(cuts):
        end = cuts[k + 1][0] if k + 1 < len(cuts) else duration
        d = end - t
        L = d + (T if k + 1 < len(cuts) else 0)
        piece = work_dir / f"scene-{index:02d}-piece{k}.mp4"
        src_d = autovideo._ffprobe_duration(clip) or L
        loop = ["-stream_loop", str(int(L // max(0.5, src_d)) + 1)] if src_d < L else []
        seek = ["-ss", f"{min(1.0, max(0.0, (src_d - L) / 2)):.2f}"] if src_d > L + 1.5 else []
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps=30,format=yuv420p")
        r = subprocess.run(["ffmpeg", "-y"] + loop + seek + ["-i", str(clip), "-map", "0:v:0", "-vf", vf, "-t", f"{L:.3f}",
                            "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(piece)],
                           capture_output=True, text=True, **video_module.no_window_kwargs())
        if r.returncode != 0:
            return None
        pieces.append(piece)
        lens.append(d)
    out = work_dir / f"scene-{index:02d}-multi.mp4"
    for names in (SHOT_TRANSITIONS, SAFE_TRANSITIONS):
        chain, prev, off = [], "[0:v]", 0.0
        for k in range(len(pieces) - 1):
            off += lens[k]
            lab = f"[m{k}]" if k < len(pieces) - 2 else "[mout]"
            chain.append(f"{prev}[{k + 1}:v]xfade=transition={names[(index + k) % len(names)]}:duration={T}:offset={off:.3f}{lab}")
            prev = lab
        cmd = ["ffmpeg", "-y"]
        for pc in pieces:
            cmd += ["-i", str(pc)]
        cmd += ["-filter_complex", ";".join(chain), "-map", "[mout]", "-c:v", "libx264", "-preset", "veryfast",
                "-crf", "20", "-pix_fmt", "yuv420p", str(out)]
        r = subprocess.run(cmd, capture_output=True, text=True, **video_module.no_window_kwargs())
        if r.returncode == 0 and out.exists():
            break
    else:
        return None
    for pc in pieces:
        pc.unlink(missing_ok=True)
    return out


# ------------------------------------------------------------ music + sounds, fast
# (user, 2026-11-18) "Fetching background music hangs for a long time."
# Everything is fetched at the same time with a short deadline, finished
# tracks / sounds are kept on disk and reused, and the app's own music pack
# fills in at once when Freesound is slow or there is no key.
_CACHE = Path(__file__).resolve().parent / "av_audio_cache"
_PACK = Path(__file__).resolve().parent / "music_pack"
_MOOD_PACK = {"calm": ["carefree", "relax", "calm", "dreamy"], "happy": ["happy", "carefree", "sunny", "upbeat"],
              "epic": ["epic", "heroic", "action"], "dramatic": ["dramatic", "dark", "tense"],
              "sad": ["sad", "emotional", "melancholy"], "mysterious": ["mystery", "mysterious", "dark"],
              "upbeat": ["upbeat", "happy", "energetic", "funk"]}


def _pack_track(mood: str, work_dir: Path) -> Path | None:
    try:
        tracks = json.loads((_PACK / "pack.json").read_text(encoding="utf-8")).get("tracks") or []
    except Exception:  # noqa: BLE001
        return None
    words = _MOOD_PACK.get(mood, [mood])
    good = [t for t in tracks if any(w in (str(t.get("name", "")) + str(t.get("file", ""))).lower() for w in words)] or tracks
    random.shuffle(good)
    for t in good:
        src = _PACK / str(t.get("file") or "")
        if src.exists():
            dest = work_dir / "mood-music.mp3"
            dest.write_bytes(src.read_bytes())
            return dest
    return None


def fast_music_and_sfx(av2, mood: str, freesound_key, work_dir: Path, music: bool, progress_cb=None, n_scenes: int = 0):
    """(music_path, music_status, options, options_status, sfx_paths, sfx_status) — in ≤ ~45 s."""
    import shutil
    from concurrent.futures import ThreadPoolExecutor
    _CACHE.mkdir(exist_ok=True)
    deadline = time.time() + 40
    mood_cache = sorted(_CACHE.glob(f"music-{mood}-*.mp3"))
    sfx_cache = sorted(_CACHE.glob("sfx-*.mp3")) + sorted(_CACHE.glob("sfx-*.wav"))
    music_path = options = None
    music_status = options_status = ("no_key" if music else "off")
    sfx_paths: list[Path] = []
    sfx_status = "no_key"
    with ThreadPoolExecutor(max_workers=3) as pool:
        f_music = f_opts = f_sfx = None
        if music and freesound_key and len(mood_cache) < 4:
            f_music = pool.submit(av2._fetch_mood_music, mood, freesound_key, work_dir, deadline)
        if music:
            f_opts = pool.submit(av2.list_mood_music, mood, freesound_key, deadline)
        if freesound_key and len(sfx_cache) < 4:
            f_sfx = pool.submit(av2._fetch_transition_sfx, freesound_key, work_dir, 6, deadline)
        if f_music is not None:
            try:
                music_path, music_status = f_music.result(timeout=50)
            except Exception:  # noqa: BLE001
                music_path, music_status = None, "no_results"
            if music_path is not None:
                try:
                    shutil.copyfile(music_path, _CACHE / f"music-{mood}-{int(time.time())}.mp3")
                except OSError:
                    pass
        if f_opts is not None:
            try:
                options, options_status = f_opts.result(timeout=50)
            except Exception:  # noqa: BLE001
                options, options_status = [], "no_results"
        if f_sfx is not None:
            try:
                sfx_paths, sfx_status = f_sfx.result(timeout=50)
            except Exception:  # noqa: BLE001
                sfx_paths, sfx_status = [], "no_results"
            for k, pth in enumerate(sfx_paths):
                try:
                    shutil.copyfile(pth, _CACHE / f"sfx-{int(time.time())}-{k}{pth.suffix}")
                except OSError:
                    pass
    if music and music_path is None and mood_cache:
        src = random.choice(mood_cache)  # a track from earlier videos (a different one each time)
        music_path = work_dir / "mood-music.mp3"
        music_path.write_bytes(src.read_bytes())
        music_status = "ok"
    if music and music_path is None:
        music_path = _pack_track(mood, work_dir)
        music_status = "ok" if music_path else music_status
    if not sfx_paths and sfx_cache:
        picks = random.sample(sfx_cache, min(6, len(sfx_cache)))
        for k, src in enumerate(picks):
            dest = work_dir / f"sfx-{k}{src.suffix}"
            dest.write_bytes(src.read_bytes())
            sfx_paths.append(dest)
        sfx_status = "ok"
    return music_path, music_status, options or [], options_status, sfx_paths, sfx_status
