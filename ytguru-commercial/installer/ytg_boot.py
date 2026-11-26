"""Runs at the start of EVERY Python process of the installed app (through ytg_boot.pth), also the
ones that draw a Manim scene: where the programs, models and optional parts are.
Lives in <app>/python/Lib/site-packages. Standard library only; never raises."""
import json
import os
import sys


def _setup() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    app = os.path.dirname(os.path.dirname(os.path.dirname(here)))  # <app>/python/Lib/site-packages
    try:
        with open(os.path.join(app, "installed.json"), encoding="utf-8-sig") as f:
            data = json.load(f)["data"]
    except (OSError, ValueError, KeyError):
        return
    models, cache = os.path.join(data, "models"), os.path.join(data, "cache")
    bin_dir = os.path.join(app, "bin")
    if bin_dir not in os.environ.get("PATH", "").split(os.pathsep):
        os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
    os.environ.update({
        "HF_HOME": os.path.join(models, "huggingface"),
        "HF_HUB_CACHE": os.path.join(models, "huggingface", "hub"),
        "HF_HUB_OFFLINE": "1",  # a model is never downloaded behind the user's back: only Downloads does it
        "HF_HUB_DISABLE_TELEMETRY": "1",
        "TORCH_HOME": os.path.join(models, "torch"),
        "PLAYWRIGHT_BROWSERS_PATH": os.path.join(data, "parts", "browser", "ms-playwright"),
        "NUMBA_CACHE_DIR": os.path.join(cache, "numba"),
        "MPLCONFIGDIR": os.path.join(cache, "matplotlib"),
        "XDG_CACHE_HOME": cache,
    })
    certificates = os.path.join(here, "certifi", "cacert.pem")
    if os.path.isfile(certificates):  # added to Windows' own list (a new PC has not fetched every root yet)
        os.environ.setdefault("SSL_CERT_FILE", certificates)
    import site
    parts = os.path.join(data, "parts")
    try:
        names = sorted(os.listdir(parts))
    except OSError:
        names = []
    for name in names:
        folder = os.path.join(parts, name, "site")
        if os.path.isfile(os.path.join(parts, name, "ok.json")) and os.path.isdir(folder):
            site.addsitedir(folder)
    # the embeddable Python ignores PYTHONIOENCODING by itself
    if os.environ.get("PYTHONIOENCODING"):
        for stream in (sys.stdout, sys.stderr):
            if stream is not None and hasattr(stream, "reconfigure"):
                stream.reconfigure(encoding="utf-8", errors="replace")


try:
    _setup()
except Exception:  # noqa: BLE001 — Python must still start
    pass
