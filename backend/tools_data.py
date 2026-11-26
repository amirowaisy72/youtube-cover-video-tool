"""YT Guru — real data for charts, from two free sources with no key: FRED and the World Bank.

    data_chart("fred:CPIAUCNS", from_year=2000)            St. Louis Fed (mostly US series)
    data_chart("worldbank:FP.CPI.TOTL.ZG", country="PK")   World Bank (every country, yearly)

The numbers are downloaded by the app (never typed by an AI) and kept in <app>/data_cache, so a series
is downloaded once a day at most; when a download fails the last saved copy is used, and when there is
none the scene reports it — no number is ever invented.
"""
from __future__ import annotations

import datetime as dt
import html
import json
import re
import threading
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE.parent / "data_cache"
FRESH = 24 * 3600
_LOCK = threading.Lock()
PROVIDERS = {"fred": "FRED", "worldbank": "World Bank"}


def parse_series(series: str, country: str = "") -> tuple[str, str, str]:
    """ "fred:ID" or "worldbank:ID" (country="PK", or "worldbank:PK/ID") -> (provider, id, country)."""
    text = str(series or "").strip()
    provider, sep, rest = text.partition(":")
    provider = provider.strip().lower().replace("_", "").replace(" ", "")
    provider = {"wb": "worldbank", "worldbank": "worldbank", "fred": "fred"}.get(provider, "")
    if not sep or not provider:
        raise ValueError(f'"{text}": write the series as "fred:SERIES_ID" or "worldbank:INDICATOR.ID"')
    rest = rest.strip()
    if provider == "worldbank":
        if "/" in rest:
            country, rest = rest.split("/", 1)
        country = (country or "US").strip().upper()
        if not re.fullmatch(r"[A-Z]{2,3}", country):
            raise ValueError(f'country "{country}": use a 2 or 3 letter code such as "US", "PK" or "WLD"')
    else:
        country = ""
    rest = rest.strip().upper()
    if not re.fullmatch(r"[A-Z0-9._]{1,60}", rest):
        raise ValueError(f'"{rest}" is not a series id')
    return provider, rest, country


def page_url(provider: str, sid: str, country: str = "") -> str:
    if provider == "fred":
        return f"https://fred.stlouisfed.org/series/{sid}"
    return f"https://data.worldbank.org/indicator/{sid}?locations={country}"


def _get(url: str, timeout: int = 40) -> str:
    # Python's own plain identification: FRED resets requests that pretend to be a browser
    with urllib.request.urlopen(url, timeout=timeout) as res:
        return res.read(8_000_000).decode("utf-8", "replace")


def parse_fred_csv(text: str) -> list[list]:
    lines = text.strip().split("\n")
    if not lines or "date" not in lines[0].lower():
        raise ValueError("FRED did not send data for this series (check the id)")
    out = []
    for line in lines[1:]:
        parts = line.strip().split(",")
        if len(parts) >= 2 and re.fullmatch(r"\d{4}-\d{2}-\d{2}", parts[0]):
            try:
                out.append([parts[0], float(parts[1])])
            except ValueError:
                continue  # "." marks a missing value
    return out


def parse_fred_page(page: str, sid: str) -> dict:
    """The series' name, units and whether its owner restricts re-use, read from its FRED page."""
    title = ""
    m = re.search(r"<title>(.*?)</title>", page, re.S)
    if m:
        title = html.unescape(m.group(1)).split("|")[0].strip()
        title = re.sub(r"\s*\(%s\)\s*$" % re.escape(sid), "", title)
    units = re.search(r"series-meta-value-units[^>]*>(.*?)<", page)
    restricted = bool(re.search(r"(?i)copyrighted:?\s*pre-?approval|reproduction of .{0,80}prohibited|©\s*S&amp;P Dow Jones|S&amp;P Dow Jones Indices LLC", page))
    return {"title": title, "units": html.unescape(units.group(1)).strip() if units else "", "restricted": restricted}


def parse_worldbank(payload) -> tuple[list[list], str]:
    if not isinstance(payload, list) or len(payload) < 2 or not payload[1]:
        raise ValueError("the World Bank has no data for this indicator and country (check both)")
    rows = [r for r in payload[1] if r.get("value") is not None]
    if not rows:
        raise ValueError("the World Bank has no values for this indicator and country")
    name = f"{rows[0]['indicator']['value']} — {rows[0]['country']['value']}"
    return sorted([[str(r["date"]), float(r["value"])] for r in rows]), name


def _download(provider: str, sid: str, country: str) -> dict:
    if provider == "fred":
        points = parse_fred_csv(_get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}"))
        try:
            info = parse_fred_page(_get(page_url(provider, sid), 30), sid)
        except Exception:  # noqa: BLE001 — the numbers matter; the name can be missing
            info = {"title": "", "units": "", "restricted": False}
    else:
        raw = _get(f"https://api.worldbank.org/v2/country/{country}/indicator/{sid}?format=json&per_page=2000")
        points, name = parse_worldbank(json.loads(raw))
        info = {"title": name, "units": name, "restricted": False}
    if len(points) < 2:
        raise ValueError("fewer than 2 values were returned")
    return {"ok": True, "points": points, "title": info["title"] or sid, "units": info["units"],
            "restricted": info["restricted"], "source": PROVIDERS[provider], "url": page_url(provider, sid, country),
            "fetched": dt.date.today().isoformat(), "at": time.time()}


def fetch(series: str, country: str = "") -> dict:
    """The series' data -> {"ok": True, "points": [[date, value]], ...} or {"ok": False, "reason": ...}. Never raises."""
    try:
        provider, sid, country = parse_series(series, country)
    except ValueError as exc:
        return {"ok": False, "reason": str(exc)}
    file = CACHE / f"{provider}-{sid}{'-' + country if country else ''}.json"
    with _LOCK:
        old = None
        try:
            old = json.loads(file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
        if old and time.time() - float(old.get("at") or 0) < FRESH:
            return old
        error = ""
        for attempt in range(2):
            try:
                data = _download(provider, sid, country)
                CACHE.mkdir(parents=True, exist_ok=True)
                file.write_text(json.dumps(data), encoding="utf-8")
                return data
            except ValueError as exc:
                error = str(exc)
                break
            except Exception as exc:  # noqa: BLE001
                error = f"{PROVIDERS[provider]} could not be reached ({str(exc)[:120]})"
                time.sleep(1.5 * attempt)
        if old:
            return {**old, "stale": True}
        return {"ok": False, "reason": error, "source": PROVIDERS[provider], "url": page_url(provider, sid, country)}


# ------------------------------------------------------------------ choosing what the chart shows
def _date(text: str) -> dt.date:
    parts = [int(x) for x in str(text).split("-")]
    return dt.date(parts[0], parts[1] if len(parts) > 1 else 1, parts[2] if len(parts) > 2 else 1)


def frequency(points: list) -> str:
    gaps = sorted((_date(b[0]) - _date(a[0])).days for a, b in zip(points, points[1:]))
    gap = gaps[len(gaps) // 2] if gaps else 365
    return "year" if gap > 300 else "quarter" if gap > 80 else "month" if gap > 27 else "day"


def date_label(text: str, freq: str) -> str:
    d = _date(text)
    months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
    if freq == "year":
        return str(d.year)
    if freq == "quarter":
        return f"Q{(d.month - 1) // 3 + 1} {d.year}"
    if freq == "month":
        return f"{months[d.month - 1]} {d.year}"
    return f"{d.day} {months[d.month - 1]} {d.year}"


def yearly_change(points: list) -> list:
    """Each value as the percentage change from the value one year earlier."""
    freq = frequency(points)
    limit = {"year": 40, "quarter": 20, "month": 6, "day": 5}[freq]
    dates = [_date(p[0]) for p in points]
    out, j = [], 0
    for i, (d, p) in enumerate(zip(dates, points)):
        try:
            want = d.replace(year=d.year - 1)
        except ValueError:  # 29 February
            want = d.replace(year=d.year - 1, day=28)
        while j + 1 < i and abs((dates[j + 1] - want).days) <= abs((dates[j] - want).days):
            j += 1
        if i and abs((dates[j] - want).days) <= limit and points[j][1]:
            out.append([p[0], (p[1] / points[j][1] - 1) * 100])
    return out


def select(points: list, from_year=None, to_year=None, change: str = "") -> list:
    if change:
        points = yearly_change(points)
    lo = int(from_year) if from_year else 0
    hi = int(to_year) if to_year else 9999
    return [p for p in points if lo <= int(str(p[0])[:4]) <= hi]


def find_highlight(points: list, want) -> int | None:
    """ "max", "min", "latest", "first", a year (its highest value) or "2022-06"."""
    if want in (None, "", False):
        return None
    w = str(want).strip().lower()
    values = [p[1] for p in points]
    if w in ("max", "peak", "highest"):
        return values.index(max(values))
    if w in ("min", "lowest"):
        return values.index(min(values))
    if w in ("latest", "last", "now"):
        return len(points) - 1
    if w == "first":
        return 0
    hits = [i for i, p in enumerate(points) if str(p[0]).startswith(w)]
    if hits:
        return max(hits, key=lambda i: values[i])
    return None


def thin(points: list, keep: set[int], most: int = 220) -> list[int]:
    """The indexes to draw: evenly spread, always with the ends, the extremes and `keep`."""
    n = len(points)
    if n <= most:
        return list(range(n))
    values = [p[1] for p in points]
    chosen = {round(i * (n - 1) / (most - 1)) for i in range(most)}
    chosen |= {0, n - 1, values.index(max(values)), values.index(min(values))} | set(keep)
    return sorted(chosen)


def units_of(data: dict, change: str = "") -> tuple[float, str, str]:
    """(multiply by, prefix, suffix) read from the series' own units."""
    if change:
        return 1.0, "", "%"
    u = str(data.get("units") or "").lower()
    if "percent" in u or "%" in u:
        return 1.0, "", "%"
    scale = 1e12 if "trillions of" in u else 1e9 if "billions of" in u else 1e6 if "millions of" in u else 1.0
    if "dollar" in u or "us$" in u:
        return scale, "$", ""
    if "thousands of" in u:
        return 1e3, "", ""
    return scale, "", ""
