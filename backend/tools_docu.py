"""Documentary Explainer (user, 2026-11-19).

The Auto Video engine with the calm research-documentary look the user showed:
  * graphics drawn by docu_scene.py (paper cards with serif numbers, real world maps,
    years, icon rows, people grids, bar charts, news clippings, chapter titles);
  * footage scenes get a small number tag in the corner when a number is spoken
    ("850,000 tons"), like the reference;
  * news clippings ONLY from pages the user linked: the headline, outlet and date are
    read from the real page, and a highlighted line is shown only if it is really on
    that page — nothing is invented.
"""
from __future__ import annotations

import html
import json
import re
import subprocess
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCENE = HERE / "docu_scene.py"
TYPES = {"chapter", "stat", "years", "icons_row", "people", "split", "bars", "list", "map", "source"}


def _s(v, n: int) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()[:n]


def _n(v, d=0.0) -> float:
    try:
        return float(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return d


# ------------------------------------------------------------------ sources (user's links)
_SRC_CACHE: dict[str, dict] = {}


def fetch_source(url: str) -> dict | None:
    """Headline, outlet, date and the sentences with numbers of one real web page."""
    url = url.strip()
    if not re.match(r"^https?://", url):
        return None
    if url in _SRC_CACHE:
        return _SRC_CACHE[url]
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                                                 "(KHTML, like Gecko) Chrome/124 Safari/537.36"})
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read(3_000_000).decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        return None

    def meta(*names):
        for nm in names:
            m = re.search(r'<meta[^>]+(?:property|name)=["\']%s["\'][^>]*content=["\']([^"\']+)' % re.escape(nm), raw, re.I) \
                or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']%s["\']' % re.escape(nm), raw, re.I)
            if m:
                return html.unescape(m.group(1)).strip()
        return ""
    title = meta("og:title", "twitter:title") or html.unescape((re.search(r"<title[^>]*>(.*?)</title>", raw, re.I | re.S) or [None, ""])[1]).strip()
    site = meta("og:site_name", "application-name") or re.sub(r"^www\.", "", url.split("/")[2])
    date = meta("article:published_time", "datePublished", "pubdate", "date", "dc.date", "article:modified_time")
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", date or "")
    if m:
        months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
        date = f"{int(m.group(3))} {months[int(m.group(2)) - 1]} {m.group(1)}"
    body = re.sub(r"(?is)<(script|style|noscript|header|footer|nav)[^>]*>.*?</\1>", " ", raw)
    paras = [html.unescape(re.sub(r"<[^>]+>", " ", p)) for p in re.findall(r"(?is)<p[^>]*>(.*?)</p>", body)]
    text = re.sub(r"\s+", " ", " ".join(paras)).strip()
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if 30 <= len(s.strip()) <= 220]
    key = [s for s in sents if re.search(r"\d", s)][:14] or sents[:8]
    out = {"url": url, "outlet": _s(site, 50), "headline": _s(re.sub(r"\s*[|\-–]\s*[^|\-–]{2,40}$", "", title), 140),
           "date": _s(date, 20), "text": text[:60000], "key": key}
    if not out["headline"]:
        return None
    _SRC_CACHE[url] = out
    return out


def fetch_sources(urls: list[str]) -> list[dict]:
    out = []
    for u in urls[:8]:
        s = fetch_source(u)
        if s:
            out.append(s)
    return out


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9%$.]+", " ", str(s).lower()).strip()


# ------------------------------------------------------------------ specs
def clean_docu(spec, sources: list[dict] | None = None) -> dict | None:
    """Only known blocks and sane values; source clippings only from real fetched pages."""
    if not isinstance(spec, dict):
        return None
    sources = sources or []
    out = []
    for b in (spec.get("blocks") if isinstance(spec.get("blocks"), list) else [])[:3]:
        if not isinstance(b, dict) or b.get("type") not in TYPES:
            continue
        t = b["type"]
        c: dict = {"type": t, "say": _s(b.get("say"), 80)}
        if t == "chapter":
            c.update(text=_s(b.get("text"), 40), kicker=_s(b.get("kicker"), 30))
            if not c["text"]:
                continue
        elif t == "stat":
            c.update(big=_s(b.get("big"), 22), label=_s(b.get("label"), 48), note=_s(b.get("note"), 70), source=_s(b.get("source"), 50))
            if not c["big"]:
                continue
        elif t == "years":
            c["items"] = [_s(x.get("text") if isinstance(x, dict) else x, 10) for x in (b.get("items") or [])][:5]
            c["label"] = _s(b.get("label"), 48)
            if len([x for x in c["items"] if x]) < 2:
                continue
        elif t == "icons_row":
            c.update(icon=_s(b.get("icon"), 24) or "box", count=int(max(2, min(30, _n(b.get("count"), 12)))), big=_s(b.get("big"), 24),
                     left=_s(b.get("left"), 20), right=_s(b.get("right"), 20), note=_s(b.get("note"), 70))
        elif t == "people":
            total = int(max(4, min(40, _n(b.get("total"), 20))))
            c.update(total=total, highlight=int(max(0, min(total, _n(b.get("highlight"), total // 3)))), big=_s(b.get("big"), 20),
                     label=_s(b.get("label"), 48))
        elif t == "split":
            c.update(title=_s(b.get("title"), 40), source=_s(b.get("source"), 50))
            for side in ("left", "right"):
                x = b.get(side) if isinstance(b.get(side), dict) else {}
                c[side] = {"label": _s(x.get("label"), 20), "count": int(max(1, min(8, _n(x.get("count"), 3)))), "icon": _s(x.get("icon"), 24) or "box"}
        elif t == "bars":
            items = [{"label": _s(x.get("label"), 22), "value": _n(x.get("value"))} for x in (b.get("items") or []) if isinstance(x, dict)][:6]
            items = [x for x in items if x["label"] and x["value"] > 0]
            if len(items) < 2:
                continue
            c.update(title=_s(b.get("title"), 44), items=items, unit=_s(b.get("unit"), 6), source=_s(b.get("source"), 50))
        elif t == "list":
            items = [{"text": _s(x.get("text") if isinstance(x, dict) else x, 40), "say": _s(x.get("say"), 80) if isinstance(x, dict) else ""}
                     for x in (b.get("items") or [])][:5]
            items = [x for x in items if x["text"]]
            if len(items) < 2:
                continue
            c.update(title=_s(b.get("title"), 40), items=items)
        elif t == "map":
            pts = []
            for p in (b.get("points") or [])[:10]:
                if isinstance(p, dict) and _s(p.get("name"), 30):
                    q = {"name": _s(p.get("name"), 30)}
                    if p.get("lat") is not None and p.get("lon") is not None and -90 <= _n(p.get("lat"), 999) <= 90 and -180 <= _n(p.get("lon"), 999) <= 180:
                        q.update(lat=_n(p["lat"]), lon=_n(p["lon"]))
                    pts.append(q)
                elif isinstance(p, str) and p.strip():
                    pts.append({"name": _s(p, 30)})
            routes = [{"from": _s(r.get("from"), 30), "to": _s(r.get("to"), 30)} for r in (b.get("routes") or [])[:5]
                      if isinstance(r, dict) and r.get("from") and r.get("to")]
            hi = [_s(x, 40) for x in (b.get("highlight") or []) if _s(x, 40)][:25]
            focus = b.get("focus")
            focus = "world" if focus == "world" else [_s(x, 40) for x in focus][:6] if isinstance(focus, list) else None
            if not (pts or routes or hi or focus):
                continue
            c.update(title=_s(b.get("title"), 50), sub=_s(b.get("sub"), 90), date=_s(b.get("date"), 20), points=pts, routes=routes,
                     highlight=hi, focus=focus)
            box = b.get("box") if isinstance(b.get("box"), dict) else None
            if box:
                c["box"] = {"title": _s(box.get("title"), 24), "items": [_s(x, 24) for x in (box.get("items") or [])][:7]}
        elif t == "source":
            k = int(_n(b.get("src"), 0)) - 1
            if not 0 <= k < len(sources):
                continue  # never a clipping of a page that was not read
            s = sources[k]
            c.update(outlet=s["outlet"], headline=s["headline"], date=s["date"])
            q = _s(b.get("quote"), 200)
            if q and _norm(q) in _norm(s["text"]):
                c["quote"] = q if len(q) <= 110 else q[:107].rsplit(" ", 1)[0] + "…"
        out.append(c)
    if not out:
        return None
    return {"theme": "docu", "blocks": out}


BLOCK_HELP = (
    'BLOCKS (1-2 per graphic, max 3; "say" = the EXACT words of the scene when it appears):\n'
    '- stat: {"type":"stat","big":"Over 100 million","label":"people pushed into poverty","note":"The 2008 food crisis","say":"100 million"}  one big number\n'
    '- years: {"type":"years","items":["1977","2008","2011"],"label":"three food crises","say":"..."}\n'
    '- icons_row: {"type":"icons_row","icon":"truck","count":20,"big":"440 miles","left":"Boston","right":"Washington","note":"34 convoys x 12.8 miles","say":"..."}  '
    "a size made visible by repeating one icon\n"
    '- people: {"type":"people","total":30,"highlight":10,"big":"1 in 3","label":"families skip a meal","say":"..."}  a share of people\n'
    '- split: {"type":"split","title":"One shock, two outcomes","left":{"label":"Bangladesh","count":4,"icon":"factory"},'
    '"right":{"label":"India","count":2,"icon":"sack"},"say":"..."}\n'
    '- bars: {"type":"bars","title":"Share of budget spent on food","items":[{"label":"Nigeria","value":59},{"label":"USA","value":7}],"unit":"%","say":"..."}\n'
    '- list: {"type":"list","title":"What changes","items":[{"text":"Bread gets dearer","say":"..."}],"say":"..."}\n'
    '- map: {"type":"map","title":"Two imports / one bill","date":"March 2026","highlight":["Iran","Qatar"],'
    '"points":[{"name":"Strait of Hormuz","lat":26.6,"lon":56.3}],"routes":[{"from":"Strait of Hormuz","to":"Rotterdam"}],'
    '"box":{"title":"Highest concern","items":["Sudan","Yemen"]},"focus":"world" or ["Iran"],"say":"..."}  '
    "a real world map: countries by English name, places with correct lat/lon, routes between named points\n"
    '- chapter: {"type":"chapter","kicker":"Part two","text":"The squeeze","say":"..."}  ONLY when the story clearly starts a new part\n'
)


def docu_prompt(title: str, part: list[tuple[int, str]], want: str, sources: list[dict]) -> str:
    lines = "\n".join(f"{n}. {t[:700]}" for n, t in part)
    src = ""
    if sources:
        src = ("\nSOURCES the user gave (the only ones you may show):\n" + "\n".join(
            f'[{k + 1}] {s["outlet"]} — "{s["headline"]}" ({s["date"] or "no date"}). Lines: ' + " | ".join(s["key"][:6])
            for k, s in enumerate(sources)) +
            '\n- source: {"type":"source","src":1,"quote":"a line copied EXACTLY from that source\'s lines","say":"..."}  '
            "a news clipping — use it where the scene states that source's fact\n")
    return (
        f'You design the visuals of a calm, serious RESEARCH DOCUMENTARY on YouTube titled "{title}" (style: cream paper cards '
        "with elegant serif numbers, minimal beige world maps with orange routes, news clippings; never cartoonish). For EACH "
        "numbered scene choose EITHER a graphic OR stock footage. " + want +
        "Maps whenever the scene names countries, seas, routes or places; stat/people/bars/icons_row/years when it has numbers; "
        "split for one cause with two outcomes; list for 3-5 points. For EVERY footage scene that speaks a number, add a tag: "
        'a 1-4 word label copied from the scene (e.g. "850,000 tons", "34 convoys", "March 2026") with "say".\n'
        + BLOCK_HELP + src +
        'Reply ONLY JSON: {"scenes":[{"n":1,"graphic":{"blocks":[...]} or null,"tag":{"text":"...","say":"..."} or null}]}. '
        "Use ONLY the scene's own numbers, names and facts — never invent numbers or sources.\nScenes:\n" + lines)


def basic_docu(text: str, plan: dict) -> dict | None:
    """Without a good AI answer: the scene's number as a stat card, or its points as a list."""
    m = re.search(r"([$€£]?\d[\d,]*(?:\.\d+)?\s?(?:%|percent|million|billion|thousand|tons|miles|km|years|days|people)?)", text, re.I)
    sents = [x.strip() for x in re.split(r"(?<=[.!?])\s+", text.strip()) if len(x.split()) >= 3]
    if m and _n(re.sub(r"[^\d.]", "", m.group(1))) >= 10:
        big = m.group(1).strip()
        sent = next((x for x in sents if m.group(1) in x), text)
        rest = re.sub(r"\s+", " ", sent.replace(m.group(1), " ")).strip(" ,.;:")
        words = [w for w in rest.split() if len(w) > 3][:5]
        return {"theme": "docu", "blocks": [{"type": "stat", "big": big[:22], "label": " ".join(words)[:48], "say": big}]}
    if len(sents) >= 3:
        items = [{"text": " ".join(x.split()[:6]).rstrip(",.;:")[:40], "say": " ".join(x.split()[:3])} for x in sents[:4]]
        return {"theme": "docu", "blocks": [{"type": "list", "title": str((plan or {}).get("key") or "")[:40], "items": items,
                                             "say": items[0]["say"]}]}
    return None


def rules_tag(text: str) -> dict | None:
    m = re.search(r"([$€£]?\d[\d,]*(?:\.\d+)?\s?(?:%|percent|million|billion|thousand|tons|tonnes|miles|km|barrels|ships|trucks|people|years|days)?)", text, re.I)
    if m and _n(re.sub(r"[^\d.]", "", m.group(1))) >= 10:
        return {"text": m.group(1).strip()[:24], "say": m.group(1).strip()}
    return None


def plan(title: str, scenes: list[dict], amount: str, sources: list[dict]) -> list[int]:
    """Which scenes become documentary graphics (scene["graphic"]) and which footage
    scenes get a number tag (scene["tags"])."""
    try:
        import tools_animator as ta
    except Exception:  # noqa: BLE001
        ta = None
    import autovideo_smart
    import tools_graphics as tg
    share = tg.AMOUNTS.get(amount, 0.55)
    n = len(scenes)
    found: dict[int, dict] = {}
    tags: dict[int, dict] = {}
    if ta is not None:
        for start in range(0, n, 8):
            part = [(start + k + 1, scenes[start + k]["narration"]) for k in range(min(8, n - start))]
            want = tg._want_text(amount, len(part))
            try:
                data = ta._json_in(ta._ask_ai(docu_prompt(title, part, want, sources), timeout=150, attempts=2))
            except Exception:  # noqa: BLE001
                continue
            for item in autovideo_smart.ai_scene_items(data):
                try:
                    i = int(item.get("n")) - 1
                except (TypeError, ValueError):
                    continue
                if not 0 <= i < n:
                    continue
                spec = clean_docu(item.get("graphic"), sources) if isinstance(item.get("graphic"), dict) else None
                if spec:
                    found[i] = spec
                tg_ = item.get("tag") if isinstance(item.get("tag"), dict) else None
                if tg_ and _s(tg_.get("text"), 24):
                    tags[i] = {"text": _s(tg_.get("text"), 24), "say": _s(tg_.get("say") or tg_.get("text"), 60)}
    hi = max(1, round(n * share)) if n >= 3 else (n if share >= 1 else (1 if found else 0))
    basic: set[int] = set()
    if len(found) < hi:
        for i in range(n):
            if len(found) >= hi:
                break
            if i not in found:
                spec = basic_docu(scenes[i]["narration"], scenes[i].get("plan") or {})
                if spec:
                    found[i] = spec
                    basic.add(i)
    chosen = sorted(found, key=lambda k: (k in basic, k))[:hi]
    for i in chosen:
        scenes[i]["graphic"] = found[i]
    for i, sc in enumerate(scenes):
        if i in chosen:
            continue
        t = tags.get(i) or rules_tag(sc["narration"])
        if t:
            sc["tags"] = [t]
    return sorted(chosen)


# ------------------------------------------------------------------ number tags on footage
def _font(size: int):
    from PIL import ImageFont
    for f in ("DMSerifDisplay-Regular.ttf", "CormorantGaramond.ttf", "Poppins-Medium.ttf"):
        p = HERE / "fonts" / f
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except Exception:  # noqa: BLE001
                pass
    return ImageFont.load_default()


def tag_png(text: str, out: Path, scale: float = 1.0) -> Path:
    """'850,000 tons' in a dark box with an orange edge (top-left label of the reference)."""
    from PIL import Image, ImageDraw
    f = _font(int(44 * scale))
    pad_x, pad_y, edge = int(18 * scale), int(10 * scale), max(3, int(5 * scale))
    tmp = Image.new("RGBA", (10, 10))
    box = ImageDraw.Draw(tmp).textbbox((0, 0), text, font=f)
    w, h = box[2] - box[0] + pad_x * 2 + edge, box[3] - box[1] + pad_y * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, h], fill=(31, 42, 56, 215))
    d.rectangle([0, 0, edge, h], fill=(212, 98, 42, 255))
    d.text((edge + pad_x - box[0], pad_y - box[1]), text, font=f, fill=(241, 236, 225, 255))
    img.save(out)
    return out


def apply_tags(scene: dict, visual: Path, duration: float, srt_path: Path | None, work_dir: Path, index: int,
               vertical: bool) -> Path | None:
    """The scene's footage with its number tag appearing when the number is spoken."""
    tags = [t for t in scene.get("tags") or [] if isinstance(t, dict) and t.get("text")][:2]
    if not tags or not visual.exists():
        return None
    import tools_graphics as tg
    cues = None
    if srt_path and srt_path.exists():
        try:
            import autovideo2 as av2
            cues = av2._parse_srt_cues(srt_path) or None
        except Exception:  # noqa: BLE001
            cues = None
    text = scene.get("narration") or ""
    clock = tg._Clock(text, duration, cues)
    low = text.lower()
    w, h = (1080, 1920) if vertical else (1280, 720)
    inputs, chain, last = [], [], "v"
    filt = [f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps=30[v]"]
    for k, t in enumerate(tags):
        p = low.find(str(t.get("say") or t["text"]).lower())
        at = clock.at_word(clock.word_index(p, text)) - 0.1 if p >= 0 else min(1.0, duration * 0.2)
        at = max(0.2, min(duration - 1.0, at))
        png = tag_png(t["text"], work_dir / f"scene-{index:02d}-tag{k}.png", 1.3 if vertical else 1.0)
        inputs += ["-loop", "1", "-t", f"{duration:.2f}", "-i", str(png)]
        x, y = (60, 140 + k * 90) if vertical else (40, 36 + k * 70)
        filt.append(f"[{k + 1}:v]format=rgba,fade=in:st={at:.2f}:d=0.45:alpha=1[t{k}]")
        filt.append(f"[{last}][t{k}]overlay={x}:{y}:enable='gte(t,{at:.2f})'[o{k}]")
        last = f"o{k}"
    out = work_dir / f"scene-{index:02d}-tagged.mp4"
    cmd = ["ffmpeg", "-y", "-v", "error", "-stream_loop", "-1", "-i", str(visual), *inputs, "-filter_complex", ";".join(filt),
           "-map", f"[{last}]", "-t", f"{duration:.2f}", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
           "-pix_fmt", "yuv420p", str(out)]
    try:
        kw = {}
        try:
            import video
            kw = video.no_window_kwargs()
        except Exception:  # noqa: BLE001
            pass
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300, **kw)
        if r.returncode == 0 and out.exists() and out.stat().st_size > 1000:
            return out
    except Exception:  # noqa: BLE001
        pass
    return None
