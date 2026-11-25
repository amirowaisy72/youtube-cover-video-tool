"""YT Guru — the extra drawn things of the Visual Explainer: 380+ flat icons kept inside the app
(backend/data/icons.json, Microsoft Fluent Emoji Flat, MIT licence — see data/ICONS-LICENSE.txt;
rebuilt with scripts/make_icon_pack.py). Used by name from scene code: thing("shopping_cart")."""
from __future__ import annotations

import json
import tempfile
from functools import lru_cache
from pathlib import Path

FILE = Path(__file__).resolve().parent / "data" / "icons.json"
_DIR = Path(tempfile.gettempdir()) / "ytg-icons"


@lru_cache(maxsize=1)
def _all() -> dict:
    try:
        return json.loads(FILE.read_text(encoding="utf-8"))["icons"]
    except (OSError, ValueError, KeyError):
        return {}


def names() -> list[str]:
    return list(_all())


def by_category() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for n, i in _all().items():
        out.setdefault(i["cat"], []).append(n)
    return out


def key_of(name: str) -> str | None:
    """The icon's name for what scene code wrote ("Shopping cart", "gold_coins"), or None."""
    k = str(name or "").strip().lower().replace("-", "_").replace(" ", "_")
    icons = _all()
    if k in icons:
        return k
    if k.endswith("s") and k[:-1] in icons:
        return k[:-1]
    return None


def svg_file(key: str) -> Path:
    i = _all()[key]
    text = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{i["w"]}" height="{i["h"]}" viewBox="0 0 {i["w"]} {i["h"]}">'
            f'{i["body"]}</svg>')
    path = _DIR / f"{key}-{len(text)}.svg"
    if not path.exists():
        _DIR.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(f".{id(text)}.tmp")
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(path)
    return path


def mob(key: str):
    """The icon as a Manim drawing."""
    from manim import SVGMobject
    m = SVGMobject(str(svg_file(key)))
    return m
