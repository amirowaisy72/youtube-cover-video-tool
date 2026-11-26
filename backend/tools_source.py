"""YT Guru — sources: where every fact of a video comes from.

1. The script prompts ask the AI for a SOURCES list after the script (URL + the exact sentence of
   that page). split_script() takes it off the narration; it is saved with the video (job["sources"])
   and added to the YouTube description.
2. The Script mode tool source(url, quote) shows the REAL web page: capture() takes a screenshot with
   a headless browser (Playwright, free: its own Chromium, else the Edge already on Windows), finds the
   quote on the page and remembers where every word of it is. source_view.py animates it.
   When the page cannot be captured or the quote is not on it, the scene shows a quote card instead.

Cache: <app>/source_cache/<page>/<quote>.json (+ .png). Delete the folder to capture again.
"""
from __future__ import annotations

import difflib
import hashlib
import os
import ipaddress
import json
import re
import socket
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit

import parts
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

HERE = Path(__file__).resolve().parent
CACHE = HERE.parent / "source_cache"
router = APIRouter(prefix="/api/sources", tags=["sources"])
_LOCK = threading.Lock()  # one browser at a time: this is a small PC
_JOB_LOCK = threading.Lock()
RETRY_AFTER = 15 * 60  # a failed page is tried again after this many seconds
VERSION = 2


# ================================================================== the SOURCES list
_HEAD = re.compile(r"^[ \t>#*_]*(?:sources?|references?)(?:[ \t]+list)?[ \t*_]*(?::|$)[ \t*_]*", re.I | re.M)
_URL = re.compile(r"https?://[^\s|<>\"“”\[\]]+", re.I)
_QUOTED = re.compile(r"[\"“«](.{8,}[^\s])[\"”»]")


def _clean_url(url: str) -> str:
    url = url.rstrip(".,;:'*_")
    while url.endswith(")") and url.count(")") > url.count("("):
        url = url[:-1].rstrip(".,;:'*_")
    return url


def parse_sources(text: str) -> list[dict]:
    """Lines like  - fact | https://page | "exact sentence"  (also spread over two or three lines)."""
    out: list[dict] = []
    cur = {"url": "", "quote": "", "fact": ""}

    def flush():
        if cur["url"]:
            out.append(dict(cur))
        cur.update(url="", quote="", fact="")

    for raw in str(text or "").replace("\r\n", "\n").split("\n"):
        line = re.sub(r"^\s*(?:[-*•]+|\[?\d{1,3}[\].)])\s+", "", raw.strip()).strip()
        if not line:
            continue
        m = _URL.search(line)
        url = _clean_url(m.group(0)) if m else ""
        rest = (line[:m.start()] + " | " + line[m.start() + len(url):]) if m else line
        q = _QUOTED.search(rest)
        quote = q.group(1).strip() if q else ""
        if q:
            rest = rest[:q.start()] + " " + rest[q.end():]
        fact = re.sub(r"(?i)\b(url|quote|sentence|fact|source)\s*:", " ", rest)
        fact = re.sub(r"\[\s*\]\(?\s*\)?|[\[\]*]", " ", fact)
        fact = re.sub(r"\s+", " ", fact).strip(" |-–—:()<>")
        if (url and cur["url"]) or (quote and cur["quote"]) or (fact and cur["url"] and cur["quote"]):
            flush()
        if url:
            cur["url"] = url[:1500]
        if quote:
            cur["quote"] = quote[:900]
        if fact:
            cur["fact"] = (cur["fact"] + " " + fact).strip()[:300]
    flush()
    seen, res = set(), []
    for s in out:
        k = (s["url"], s["quote"])
        if k not in seen:
            seen.add(k)
            res.append(s)
    return res[:60]


def split_script(text: str) -> tuple[str, list[dict]]:
    """(the script without its SOURCES list, the sources). A script without such a list is unchanged."""
    text = str(text or "").replace("\r\n", "\n")
    for m in reversed(list(_HEAD.finditer(text))):
        tail = text[m.end():]
        if _URL.search(tail):
            body = re.sub(r"[\s`\-_*]+$", "", text[:m.start()])
            return body, parse_sources(tail.replace("```", ""))
    return text, []


# ------------------------------------------------------------------ research rules of the "Copy the prompt" buttons
WEB_FIRST = "Turn on web search before answering."


def research_rules(part_two: str) -> str:
    """Added to every copied prompt that has Sources, whether or not the Sources box holds anything."""
    return ("RESEARCH THE SOURCES YOURSELF (every time, even if some sources are already listed here):\n"
            "Use web search to find 3–6 real, reliable pages (news, official reports, company pages) that support the facts "
            "and numbers in this script. Never make up a link or a quote.\n\n"
            "ANSWER IN TWO PARTS, in this order (a plan table, when one is asked for, comes before PART 1):\n"
            "PART 1 — a line with exactly\n# === SOURCES ===\nthen one source per line:\n"
            'fact | https://url | "exact sentence copied word for word from the page"\n'
            f"PART 2 — {part_two}")


_BLOCK_HEAD = re.compile(r"^[ \t]*#*[ \t]*={2,}[ \t]*SOURCES[ \t]*={2,}[ \t]*$|^[ \t]*#+[ \t]*SOURCES[ \t]*:?[ \t]*$", re.I)
_BLOCK_LINE = re.compile(r"https?://|^\s*(?:[-*•]|\d{1,2}[.)])\s|^\s*(?:url|quote|fact|sentence)\s*:|^\s*[\"“]", re.I)


def split_answer(text: str) -> tuple[str, list[dict]]:
    """A pasted AI answer -> (everything except its "# === SOURCES ===" block, the sources in that block)."""
    kept, block, inside = [], [], False
    for line in str(text or "").replace("\r\n", "\n").split("\n"):
        if _BLOCK_HEAD.match(line):
            inside = True
            continue
        if inside:
            if not line.strip() or _BLOCK_LINE.search(line):
                block.append(line)
                continue
            if re.fullmatch(r"\s*```[\w+-]*\s*", line) and not any(x.strip() for x in block):
                kept.append(line)  # the fence that opens the list: its partner closes it
                continue
            inside = False
        kept.append(line)
    return "\n".join(kept), parse_sources("\n".join(block))


def merge_found(job: dict, found: list[dict]) -> int:
    """The AI's sources join the video's list (the same page and sentence only once). -> how many are new."""
    have = {(s.get("url"), s.get("quote") or "") for s in job.get("sources") or []}
    new = [s for s in found if (s["url"], s.get("quote") or "") not in have]
    if new:
        job["sources"] = (job.get("sources") or []) + new
    return len(new)


def check_list(sources: list[dict], scenes_using: dict | None = None) -> list[dict]:
    """Opens every page and looks for its sentence -> one result per source, in the same order."""
    pairs = [(s["url"], s["quote"]) for s in sources if s.get("url") and s.get("quote")]
    res = dict(zip(pairs, capture_many(pairs)))
    out = []
    for s in sources:
        d = res.get((s.get("url"), s.get("quote")))
        quoted = bool(s.get("quote"))
        out.append({"url": s.get("url"), "quoted": quoted, "ok": bool(d and d.get("ok")),
                    "reason": "" if d and d.get("ok") else (d or {}).get("reason")
                    or "no quoted sentence to look for (a data or headline page)",
                    "scenes": (scenes_using or {}).get(s.get("url"), [])})
    return out


def to_text(sources: list[dict]) -> str:
    return "\n".join(" | ".join(x for x in (s.get("fact"), s.get("url"), f'"{s["quote"]}"' if s.get("quote") else "") if x)
                     for s in sources or [])


def description_with_sources(description: str, sources: list[dict], limit: int = 4900) -> str:
    """The YouTube description with a "Sources:" list at its end (each page once; nothing added twice)."""
    description = str(description or "").rstrip()
    lines, seen = [], set()
    for s in sources or []:
        url = str(s.get("url") or "")
        if not url or url in seen or url in description:
            continue
        seen.add(url)
        fact = re.sub(r"[<>]", "", str(s.get("fact") or "")).strip()
        if len(fact) > 90:
            fact = fact[:87].rsplit(" ", 1)[0] + "…"
        lines.append(f"• {fact} — {url}" if fact else f"• {url}")
    if not lines:
        return description
    head = "\n\nSources:\n" if description else "Sources:\n"
    if re.search(r"(?im)^sources\s*:", description):
        head = "\n"
    block = ""
    for line in lines:
        if len(description) + len(head) + len(block) + len(line) + 1 > limit:
            break
        block += ("\n" if block else "") + line
    return description + head + block if block else description


# ================================================================== finding a quote in a page
_WORD_CHARS = re.compile(r"[^\w%$€£]+", re.U)


def norm(t: str) -> str:
    return _WORD_CHARS.sub("", str(t).lower()).replace("_", "")


def find_quote(words: list, quote: str) -> list[int]:
    """Indexes of the page words (each [text, ...]) that make up the quote, or [] when it is not there.
    Compared without spaces and punctuation; "…" inside the quote may skip text."""
    stream, owner = [], []
    for i, w in enumerate(words):
        n = norm(w[0])
        stream.append(n)
        owner.extend([i] * len(n))
    page = "".join(stream)
    found: list[int] = []
    pos = 0
    parts = [p for p in (norm(x) for x in re.split(r"…|\.\.\.|\[[^\]]*\]", quote)) if len(p) >= 6]
    for part in parts:
        a = page.find(part, pos)
        b = a + len(part)
        if a < 0:
            a, b = _near(page, part, pos)
        if a < 0:
            return []
        found.extend(owner[a:b])
        pos = b
    return list(dict.fromkeys(found))


def _near(page: str, part: str, pos: int) -> tuple[int, int]:
    """A tiny difference (a footnote mark, one changed letter) is accepted — but every number must match."""
    n = len(part)
    if n < 40:
        return -1, -1
    k = 14
    for probe in (0, n // 3, 2 * n // 3, n - k):
        at = page.find(part[probe:probe + k], pos)
        tries = 0
        while at >= 0 and tries < 6:
            lo = max(0, at - probe - 8)
            window = page[lo:lo + n + 24]
            blocks = [b for b in difflib.SequenceMatcher(None, part, window, autojunk=False).get_matching_blocks() if b.size >= 3]
            if blocks:
                a, b = lo + blocks[0].b, lo + blocks[-1].b + blocks[-1].size
                span = page[a:b]
                same = sum(x.size for x in blocks)
                if same >= 0.93 * n and same >= 0.9 * len(span) and re.findall(r"\d+", span) == re.findall(r"\d+", part):
                    return a, b
            at = page.find(part[probe:probe + k], at + 1)
            tries += 1
    return -1, -1


def _card_rect(words: list, blocks: list, idx: list[int]) -> list[float]:
    """The part of the page that lifts toward the camera: the quote's paragraph, or the lines around the quote."""
    q = [words[i] for i in idx]
    ids = {w[5] for w in q}
    lh = sorted(w[4] for w in q)[len(q) // 2]
    qy0, qy1 = min(w[2] for w in q), max(w[2] + w[4] for w in q)
    para = [w for w in words if w[5] in ids]
    py0, py1 = min(w[2] for w in para), max(w[2] + w[4] for w in para)
    if py1 - py0 > max(300.0, (qy1 - qy0) + lh * 5):  # a long paragraph: the quote's lines and one around them
        keep = [w for w in para if w[2] + w[4] / 2 > qy0 - lh * 1.9 and w[2] + w[4] / 2 < qy1 + lh * 1.9]
    else:
        keep = para
    keep = keep + q
    x0, x1 = min(w[1] for w in keep), max(w[1] + w[3] for w in keep)
    y0, y1 = min(w[2] for w in keep), max(w[2] + w[4] for w in keep)
    return [x0, y0, x1 - x0, y1 - y0]


# ================================================================== the browser
def _public_host(host: str, cache: dict) -> bool:
    """Only real web sites: never this computer or the home network."""
    host = (host or "").strip("[]").lower()
    if host not in cache:
        try:
            infos = socket.getaddrinfo(host, None)
            cache[host] = bool(infos) and all(ipaddress.ip_address(i[4][0].split("%")[0]).is_global for i in infos)
        except (OSError, ValueError):
            cache[host] = False
    return cache[host]


_CLEAN_JS = r"""() => {
  const total = (document.body.innerText || '').length || 1;
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const text = el.innerText || '';
    const marked = /cookie|consent|gdpr|paywall|newsletter|subscribe-|modal|popup|overlay|onetrust|didomi/i
      .test(el.id + ' ' + (typeof el.className === 'string' ? el.className : ''));
    if (cs.position === 'fixed' && (text.length < total * 0.35 || (marked && text.length < total * 0.6)))
      el.style.setProperty('display', 'none', 'important');
    else if (cs.position === 'sticky') el.style.setProperty('position', 'static', 'important');
    else if (marked && cs.position === 'absolute' && +cs.zIndex > 100) el.style.setProperty('display', 'none', 'important');
  }
  for (const el of [document.documentElement, document.body]) {
    el.style.setProperty('overflow', 'visible', 'important');
    el.style.setProperty('scroll-behavior', 'auto', 'important');
  }
}"""

_READ_JS = r"""() => {
  const words = [], blocks = [], ids = new Map(), range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode()) && words.length < 80000) {
    const t = n.nodeValue, el = n.parentElement;
    if (!el || !t.trim() || el.closest('script,style,noscript,template,sup,select')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let b = el;
    while (b.parentElement && b !== document.body && getComputedStyle(b).display.startsWith('inline')) b = b.parentElement;
    let id = ids.get(b);
    if (id === undefined) { id = blocks.length; ids.set(b, id); blocks.push(0); }
    const re = /\S+/g; let m;
    while ((m = re.exec(t))) {
      range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
      const r = range.getClientRects()[0];
      if (!r || r.width < 1 || r.height < 4 || r.right + scrollX < 0 || r.left + scrollX > 1400) continue;
      words.push([m[0], r.left + scrollX, r.top + scrollY, r.width, r.height, id]);
    }
  }
  const meta = (s) => { const e = document.querySelector(s); return e ? (e.content || e.getAttribute('datetime') || '') : ''; };
  let date = meta('meta[property="article:published_time"]') || meta('meta[name="date"]') || meta('meta[itemprop="datePublished"]')
    || meta('meta[name="citation_publication_date"]');
  const wiki = location.hostname.endsWith('wikipedia.org');  // an encyclopedia page: when it was last updated
  const fields = wiki ? ['dateModified', 'datePublished'] : ['datePublished', 'dateModified'];
  if (!date || wiki) for (const field of fields) {
    const m = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => (s.textContent || '').match(new RegExp('"' + field + '"\\s*:\\s*"([^"]+)"'))).find(Boolean);
    if (m) { date = m[1]; break; }
  }
  if (!date) date = meta('time[datetime]');
  return { words, blocks, date, site: meta('meta[property="og:site_name"]'), title: document.title || '',
    height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) };
}"""


HEADLINE = "(headline)"  # asked for instead of a quote: photograph the page's own headline

_HEADLINE_JS = r"""() => {
  const seen = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 60 && r.height > 10 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.1; };
  const norm = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const meta = document.querySelector('meta[property="og:title"]');
  const og = meta ? (meta.content || '').trim() : '';
  const titles = [norm(og), norm(document.title)];
  // the headline is the heading that the page's own title also names (a site's banner is often an h1 too)
  const score = (h) => {
    const t = norm(h.innerText);
    return (t.length >= 12 && titles.some((x) => x && (x.includes(t) || t.includes(x))) ? 100 : 0)
      + (h.tagName === 'H1' ? 30 : h.tagName === 'H2' ? 8 : 0)
      + (h.closest('article,main,[role=main],#article,#content') ? 15 : 0)
      - (h.closest('header,nav,footer,aside,[role=banner],[role=navigation]') && !h.closest('article') ? 40 : 0)
      + Math.min(20, parseFloat(getComputedStyle(h).fontSize) / 3);
  };
  const list = [...document.querySelectorAll('h1,h2,h3')].filter((h) => {
    const t = (h.innerText || '').trim(); return seen(h) && t.length >= 4 && t.length <= 260; });
  list.sort((a, b) => score(b) - score(a));
  if (!list.length || score(list[0]) < 40)
    return { text: og || (document.title || '').split(/ [|–—-] /)[0].trim(), rect: null };
  const h = list[0];
  h.scrollIntoView({ block: 'center' });
  const range = document.createRange(); range.selectNodeContents(h);
  const rs = [...range.getClientRects()].filter((r) => r.width > 2 && r.height > 8);
  const box = rs.length ? rs.reduce((a, r) => ({ l: Math.min(a.l, r.left), t: Math.min(a.t, r.top),
    r: Math.max(a.r, r.right), b: Math.max(a.b, r.bottom) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 }) : null;
  return { text: h.innerText.trim().replace(/\s+/g, ' '),
    rect: box ? [box.l + scrollX, box.t + scrollY, box.r - box.l, box.b - box.t] : null };
}"""


def _shoot_headline(page, url: str) -> dict:
    page.evaluate(_CLEAN_JS)
    info = page.evaluate(_READ_JS)
    base = {"site": (info.get("site") or "").strip()[:60], "title": (info.get("title") or "").strip()[:200],
            "date": str(info.get("date") or "")[:40]}
    if len(info["words"]) < 30 or re.search(r"(?i)just a moment|access denied|captcha|are you a robot|attention required",
                                            base["title"]):
        return {**base, "ok": False, "reason": "the page shows no readable text (blocked, paywall or robot check)"}
    found = page.evaluate(_HEADLINE_JS)
    page.wait_for_timeout(500)
    page.evaluate(_CLEAN_JS)
    found = page.evaluate(_HEADLINE_JS)
    text = str(found.get("text") or "").strip()[:260]
    if not text:
        return {**base, "ok": False, "reason": "no headline was found on the page"}
    rect = found.get("rect")
    if not rect or rect[2] < 80 or rect[3] > 420:
        return {**base, "ok": False, "headline": text, "reason": "the headline could not be photographed"}
    _meta, image = _paths(url, HEADLINE)
    image.parent.mkdir(parents=True, exist_ok=True)
    # only what is on screen is photographed (a very long page as a whole would take too long)
    sx, sy = page.evaluate("() => [window.scrollX, window.scrollY]")
    x, y = max(0, rect[0] - sx - 12), max(0, rect[1] - sy - 10)
    if x > 1200 or y + rect[3] > 900:
        return {**base, "ok": False, "headline": text, "reason": "the headline could not be photographed"}
    page.screenshot(path=str(image), animations="disabled", timeout=45000,
                    clip={"x": x, "y": y, "width": min(1280 - x, rect[2] + 24), "height": min(900 - y, rect[3] + 20)})
    return {**base, "ok": True, "headline": text, "image": str(image), "blur": str(image)}


def headlines(urls: list[str]) -> list[dict]:
    """The headline of every page (photograph + text), from the cache or the web. Never raises."""
    return capture_many([(u, HEADLINE) for u in urls])


def add_found(job: dict, found: list[dict]) -> bool:
    """Pages used by data_chart() / headlines() join the video's Sources list (each page once)."""
    have = {s.get("url") for s in job.get("sources") or []}
    new = []
    for s in found or []:
        if s.get("url") and s["url"] not in have:
            have.add(s["url"])
            new.append({"url": s["url"], "quote": "", "fact": re.sub(r'["“”«»|]', "'", str(s.get("fact") or ""))[:200]})
    if new:
        job["sources"] = (job.get("sources") or []) + new
    return bool(new)


def system_browser() -> bool:
    """Is Microsoft Edge or Google Chrome on this PC?"""
    roots = [os.environ.get(k) for k in ("ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA")]
    return any(root and (Path(root) / sub).is_file() for root in roots
               for sub in (r"Microsoft\Edge\Application\msedge.exe", r"Google\Chrome\Application\chrome.exe"))


def need_browser() -> None:
    """Installed app on a PC without Edge or Chrome: ask for the small browser instead of failing."""
    if parts.enabled() and not system_browser():
        parts.require("browser")


def _launch(pw):
    errors = []
    for kw in ({}, {"channel": "msedge"}, {"channel": "chrome"}):  # Windows always has Edge: nothing to download
        try:
            return pw.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"], **kw)
        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc).strip().split("\n")[0][:150])
    if parts.enabled():
        parts.require("browser")
    raise RuntimeError("no browser could be started (" + errors[-1] + "). Run:  python -m playwright install chromium")


def domain_of(url: str) -> str:
    host = (urlsplit(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _paths(url: str, quote: str) -> tuple[Path, Path]:
    folder = CACHE / (re.sub(r"[^a-z0-9.-]", "", domain_of(url))[:40] + "-" + hashlib.sha1(url.encode()).hexdigest()[:12])
    name = hashlib.sha1((str(VERSION) + norm(quote) + "|" + quote).encode()).hexdigest()[:12]
    return folder / f"{name}.json", folder / f"{name}.png"


def cached(url: str, quote: str) -> dict | None:
    meta, _img = _paths(url, quote)
    try:
        d = json.loads(meta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if d.get("ok"):
        return d if Path(d["image"]).exists() and Path(d["blur"]).exists() else None
    return d if time.time() - float(d.get("at") or 0) < RETRY_AFTER else None


def _save(url: str, quote: str, data: dict) -> dict:
    meta, _img = _paths(url, quote)
    data = {**data, "url": url, "quote": quote, "domain": domain_of(url), "at": time.time()}
    meta.parent.mkdir(parents=True, exist_ok=True)
    meta.write_text(json.dumps(data), encoding="utf-8")
    return data


def _blurred(image: Path) -> Path:
    """The out-of-focus, darker copy of the page (half size: it is blurred anyway), made once."""
    from PIL import Image, ImageEnhance, ImageFilter
    out = image.with_name(image.stem + "-blur.png")
    with Image.open(image) as im:
        small = im.convert("RGB").resize((max(1, im.width // 2), max(1, im.height // 2)), Image.Resampling.BILINEAR)
    small = small.filter(ImageFilter.GaussianBlur(7))
    ImageEnhance.Brightness(ImageEnhance.Color(small).enhance(0.6)).enhance(0.34).save(out, compress_level=1)
    return out


def _capture_page(browser, url: str, quotes: list[str]) -> None:
    """Opens one page once and saves the result of every quote wanted from it."""
    hosts: dict = {}
    ua = (f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
          f"Chrome/{browser.version.split('.')[0]}.0.0.0 Safari/537.36")
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=2, locale="en-US",
                              user_agent=ua, color_scheme="light", reduced_motion="reduce", accept_downloads=False,
                              service_workers="block")
    try:
        def guard(route):
            req = route.request
            parts = urlsplit(req.url)
            if req.resource_type == "media" or (parts.scheme in ("http", "https") and not _public_host(parts.hostname or "", hosts)):
                return route.abort()
            return route.continue_()
        ctx.route("**/*", guard)
        page = ctx.new_page()
        resp = page.goto(url, wait_until="domcontentloaded", timeout=30000)
        if resp is not None and resp.status >= 400:
            raise RuntimeError(f"the site refused to show the page (HTTP {resp.status})")
        for state, ms in (("load", 12000), ("networkidle", 3000)):
            try:
                page.wait_for_load_state(state, timeout=ms)
            except Exception:  # noqa: BLE001 — busy pages never get quiet
                pass
        page.wait_for_timeout(700)
        for quote in quotes:
            try:
                _save(url, quote, _shoot_headline(page, url) if quote == HEADLINE else _shoot(page, url, quote))
            except Exception as exc:  # noqa: BLE001
                _save(url, quote, {"ok": False, "reason": str(exc).split("\n")[0][:200]})
    finally:
        ctx.close()


def _shoot(page, url: str, quote: str) -> dict:
    page.evaluate(_CLEAN_JS)
    info = page.evaluate(_READ_JS)
    base = {"site": (info.get("site") or "").strip()[:60], "title": (info.get("title") or "").strip()[:200],
            "date": str(info.get("date") or "")[:40]}
    if len(info["words"]) < 30 or re.search(r"(?i)just a moment|access denied|captcha|are you a robot|attention required",
                                            base["title"]):
        return {**base, "ok": False, "reason": "the page shows no readable text (blocked, paywall or robot check)"}
    idx = find_quote(info["words"], quote)
    if not idx:
        return {**base, "ok": False, "not_found": True, "reason": "the quote was not found on the page"}
    # go there (lazy pictures load, the layout settles), then read the final positions
    top = min(info["words"][i][2] for i in idx)
    page.evaluate("y => window.scrollTo(0, y)", max(0, top - 300))
    page.wait_for_timeout(900)
    page.evaluate(_CLEAN_JS)
    info = page.evaluate(_READ_JS)
    idx = find_quote(info["words"], quote)
    if not idx:
        return {**base, "ok": False, "not_found": True, "reason": "the quote disappeared from the page while loading"}
    words = info["words"]
    card = _card_rect(words, info["blocks"], idx)
    clip_top = max(0.0, card[1] - 900)
    clip_h = min(max(1900.0, card[3] + 1800), max(900.0, info["height"] - clip_top))
    _meta, image = _paths(url, quote)
    image.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(image), full_page=True, clip={"x": 0, "y": clip_top, "width": 1280, "height": clip_h},
                    animations="disabled", timeout=45000)
    from PIL import Image
    with Image.open(image) as im:
        iw, ih = im.size
    s = iw / 1280.0

    def px(x, y, w, h):
        return [round(x * s, 1), round((y - clip_top) * s, 1), round(w * s, 1), round(h * s, 1)]
    marks = [[words[i][0], *px(*words[i][1:5])] for i in idx]
    if any(m[2] < 0 or m[2] + m[4] > ih + 2 for m in marks):
        return {**base, "ok": False, "reason": "the quote could not be photographed on this page"}
    return {**base, "ok": True, "image": str(image), "blur": str(_blurred(image)), "words": marks, "card": px(*card)}


def capture_many(pairs: list[tuple[str, str]]) -> list[dict]:
    """The page data of every (url, quote), from the cache or the web. Never raises: a failure is
    {"ok": False, "reason": ...} and the scene shows a quote card."""
    out: dict[tuple[str, str], dict] = {}
    with _LOCK:
        todo: dict[str, list[str]] = {}
        for url, quote in pairs:
            d = cached(url, quote)
            if d:
                out[(url, quote)] = d
            elif urlsplit(url).scheme not in ("http", "https") or not _public_host(urlsplit(url).hostname or "", {}):
                out[(url, quote)] = {"ok": False, "url": url, "quote": quote, "domain": domain_of(url),
                                     "reason": "not a reachable public web page (check the link and your internet)"}
            elif quote not in todo.setdefault(url, []):
                todo[url].append(quote)
        todo = {u: q for u, q in todo.items() if q}
        if todo:
            try:
                from playwright.sync_api import sync_playwright
                with sync_playwright() as pw:
                    browser = _launch(pw)
                    try:
                        for url, quotes in todo.items():
                            try:
                                _capture_page(browser, url, quotes)
                            except Exception as exc:  # noqa: BLE001
                                for q in quotes:
                                    _save(url, q, {"ok": False, "reason": str(exc).split("\n")[0][:200]})
                    finally:
                        browser.close()
                for url, quotes in todo.items():
                    for q in quotes:
                        out[(url, q)] = cached(url, q) or {"ok": False, "url": url, "quote": q, "domain": domain_of(url),
                                                          "reason": "the page could not be captured"}
            except Exception as exc:  # noqa: BLE001 — Playwright missing or broken: cards, never a broken scene
                why = ("the screenshot tool is not installed (pip install playwright)" if isinstance(exc, ImportError)
                       else str(exc).split("\n")[0][:200])
                for url, quotes in todo.items():
                    for q in quotes:
                        out.setdefault((url, q), {"ok": False, "url": url, "quote": q, "domain": domain_of(url), "reason": why})
    return [out[(u, q)] for u, q in pairs]


# ================================================================== endpoints: the references of a video
def _job(job_id: str):
    import tools_visual as tv
    app = tv._av()
    if app is None:
        raise HTTPException(503, "The app is not ready.")
    try:
        return app, app._av_read(job_id)
    except Exception:  # noqa: BLE001
        raise HTTPException(404, "Video not found.") from None


def _view(job: dict) -> dict:
    src = job.get("sources") or []
    return {"sources": src, "text": to_text(src)}


@router.get("/{job_id}")
def get_sources(job_id: str) -> dict:
    return _view(_job(job_id)[1])


class SourcesReq(BaseModel):
    text: str = Field("", max_length=60000)


@router.post("/{job_id}")
def save_sources(job_id: str, req: SourcesReq) -> dict:
    """The user's edited list, saved with the video."""
    _head, found = split_script(req.text)
    found = found or parse_sources(req.text)
    if req.text.strip() and not found:
        raise HTTPException(400, 'No links found. One source per line:  fact | https://page | "exact sentence"')
    with _JOB_LOCK:
        app, job = _job(job_id)
        job["sources"] = found
        app._av_write(job)
    return _view(job)


@router.post("/{job_id}/check")
def check_sources(job_id: str) -> dict:
    """Opens every source page and looks for its quote (the screenshots are kept for the video)."""
    need_browser()
    _app_, job = _job(job_id)
    import tools_script as ts
    using: dict = {}
    for i, sc in enumerate(job.get("scenes") or []):
        for url, _quote in ts.source_calls(sc.get("code") or ""):
            using.setdefault(url.strip(), []).append(i + 1)
    return {"results": check_list(job.get("sources") or [], using)}
