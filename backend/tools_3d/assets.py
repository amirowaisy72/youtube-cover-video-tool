"""YT Guru — 3D Explainer free assets (user, 2026-11-28).

Only free-to-use assets, each entry carrying its source + licence so
``assemble.py`` can write the attributions into description.txt:

- NASA Blue Marble textures — public domain.
- Natural Earth country borders — public domain.
- Poly Haven models — CC0, via its public API (searched on demand).
- Kenney packs — CC0; Kenney has no API, so these are curated
  manual-link entries (the user downloads from kenney.nl).

Downloads land in ``<repo root>/data/tools_3d`` — never inside this
package — and are recorded in ``assets_index.json`` there. All
network code fails soft: the user's PC may be offline.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "tools_3d"
INDEX_FILE = "assets_index.json"
_UA = {"User-Agent": "YT-Guru-3D-Explainer/1.0"}

CATALOGUE: list[dict] = [
    {
        "id": "nasa-blue-marble-day", "name": "NASA Blue Marble — day texture",
        "kind": "texture", "source": "NASA Earth Observatory",
        "licence": "Public Domain", "attribution_required": False,
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74167/world.200412.3x5400x2700.jpg",
    },
    {
        "id": "nasa-night-lights", "name": "NASA Earth at Night — night lights texture",
        "kind": "texture", "source": "NASA Earth Observatory",
        "licence": "Public Domain", "attribution_required": False,
        "url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.5400x2700.jpg",
    },
    {
        "id": "natural-earth-countries-110m", "name": "Natural Earth 110m countries",
        "kind": "geojson", "source": "Natural Earth",
        "licence": "Public Domain", "attribution_required": False,
        "url": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
    },
    # Kenney (CC0) — manual-link entries: no API exists, the download
    # page is the entry; download_asset() refuses these with a hint.
    {
        "id": "kenney-city-kit-commercial", "name": "Kenney City Kit (Commercial)",
        "kind": "model", "source": "Kenney (kenney.nl)", "licence": "CC0",
        "attribution_required": False, "manual": True,
        "url": "https://kenney.nl/assets/city-kit-commercial",
    },
    {
        "id": "kenney-nature-kit", "name": "Kenney Nature Kit",
        "kind": "model", "source": "Kenney (kenney.nl)", "licence": "CC0",
        "attribution_required": False, "manual": True,
        "url": "https://kenney.nl/assets/nature-kit",
    },
    {
        "id": "kenney-watercraft-kit", "name": "Kenney Watercraft Kit",
        "kind": "model", "source": "Kenney (kenney.nl)", "licence": "CC0",
        "attribution_required": False, "manual": True,
        "url": "https://kenney.nl/assets/watercraft-kit",
    },
]


def catalogue() -> list[dict]:
    """The built-in free-asset catalogue (copies, safe to mutate)."""
    return [dict(e) for e in CATALOGUE]


def _entry(entry_id: str) -> dict | None:
    return next((e for e in CATALOGUE if e["id"] == entry_id), None)


def _read_index() -> list:
    try:
        data = json.loads((DATA_DIR / INDEX_FILE).read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:  # noqa: BLE001 — missing/corrupt index = empty
        return []


def _write_index(rows: list) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / INDEX_FILE).write_text(
        json.dumps(rows, indent=2), encoding="utf-8")


def list_downloaded() -> list[dict]:
    return _read_index()


def search_polyhaven(query: str) -> dict:
    """Search Poly Haven models (CC0). Never raises: offline -> error."""
    try:
        url = "https://api.polyhaven.com/assets?t=models"
        req = urllib.request.Request(url, headers=_UA)
        with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001 — offline PC must fail soft
        return {"results": [], "error": f"Poly Haven search failed: {exc}"}
    q = (query or "").strip().lower()
    results = []
    for asset_id, info in (data or {}).items():
        name = str(info.get("name") or asset_id)
        cats = " ".join(info.get("categories") or [])
        if q and q not in name.lower() and q not in cats.lower() \
                and q not in asset_id.lower():
            continue
        results.append({
            "id": f"polyhaven-{asset_id}", "name": name, "kind": "model",
            "source": "Poly Haven", "licence": "CC0",
            "attribution_required": False,
            "url": f"https://polyhaven.com/a/{asset_id}",
            "files_url": f"https://api.polyhaven.com/files/{asset_id}",
        })
        if len(results) >= 50:
            break
    return {"results": results, "error": ""}


def _polyhaven_file_url(asset_id: str) -> str:
    """Best glTF download URL for a Poly Haven asset ('' if none)."""
    try:
        url = f"https://api.polyhaven.com/files/{asset_id}"
        req = urllib.request.Request(url, headers=_UA)
        with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310
            files = json.loads(resp.read().decode("utf-8"))
        gltf = (files.get("gltf") or {})
        for res in ("1k", "2k", "4k"):
            node = gltf.get(res, {}).get("gltf", {})
            if node.get("url"):
                return node["url"]
    except Exception:  # noqa: BLE001
        pass
    return ""


def download_asset(entry_id_or_url: str, licence_info: dict | None = None) -> dict:
    """Download one asset into the data dir + record it in the index.

    Accepts a catalogue id, a ``polyhaven-<id>`` id, or a direct URL
    (then ``licence_info`` should carry source/licence). Returns the
    index record, or ``{"error": ...}`` — never raises.
    """
    entry = _entry(entry_id_or_url)
    url, meta = "", dict(licence_info or {})
    if entry:
        if entry.get("manual"):
            return {"error": f"{entry['name']} is a manual-link entry: "
                             f"download it from {entry['url']} (licence {entry['licence']})."}
        url = entry["url"]
        meta = {**entry, **meta}
        asset_id, name = entry["id"], entry["name"]
    elif entry_id_or_url.startswith("polyhaven-"):
        asset_id = entry_id_or_url
        url = _polyhaven_file_url(entry_id_or_url[len("polyhaven-"):])
        if not url:
            return {"error": "Could not resolve a Poly Haven file URL "
                             "(offline, or no glTF for this asset)."}
        name = entry_id_or_url
        meta = {"source": "Poly Haven", "licence": "CC0",
                "attribution_required": False, **meta}
    elif entry_id_or_url.startswith(("http://", "https://")):
        url = entry_id_or_url
        asset_id = "url-" + urllib.parse.quote(
            Path(urllib.parse.urlparse(url).path).stem or "asset", safe="")[:60]
        name = Path(urllib.parse.urlparse(url).path).name or asset_id
        meta.setdefault("source", url)
        meta.setdefault("licence", "unknown — check the source page")
    else:
        return {"error": f"Unknown asset id: {entry_id_or_url}"}
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        suffix = Path(urllib.parse.urlparse(url).path).suffix or ".bin"
        dest = DATA_DIR / f"{asset_id}{suffix}"
        req = urllib.request.Request(url, headers=_UA)
        with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310
            dest.write_bytes(resp.read())
    except Exception as exc:  # noqa: BLE001
        return {"error": f"Download failed: {exc}"}
    record = {
        "id": asset_id, "name": name, "file": dest.name, "url": url,
        "source": meta.get("source", ""), "licence": meta.get("licence", ""),
        "attribution_required": bool(meta.get("attribution_required", False)),
        "downloaded": date.today().isoformat(),
    }
    rows = [r for r in _read_index() if r.get("id") != asset_id]
    rows.append(record)
    _write_index(rows)
    return record


def delete_asset(asset_id: str) -> bool:
    """Remove a downloaded asset (file + index row). True if removed."""
    rows = _read_index()
    kept, removed = [], False
    for row in rows:
        if row.get("id") == asset_id:
            removed = True
            try:
                (DATA_DIR / row.get("file", "")).unlink(missing_ok=True)
            except OSError:
                pass
        else:
            kept.append(row)
    if removed:
        _write_index(kept)
    return removed
