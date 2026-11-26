"""The one Google Colab connection, shared by every tool that needs the GPU.

  GET    /api/colab/status         connected / not connected / disconnected, why, and whether work is paused
  POST   /api/colab/connect        {line} -> save the link the notebook printed and test it straight away
  DELETE /api/colab/connect        forget the link (this computer does the work)
  POST   /api/colab/continue-here  stop waiting for Colab: this computer carries on
  POST   /api/colab/settings       {pause} -> when Colab stops in the middle: wait for it, or carry on here
  GET    /api/colab/estimate       ?chars=N -> roughly how long N characters of cloned voice take
  GET    /api/colab/notebook       the notebook file (to upload to Colab by hand)

The link is kept in colab_voice.txt ("<url> <code>"), the same file older versions used.
When a job loses Colab in the middle, its worker waits here (wait()) until the link works again
or the user chooses to continue on this computer, then carries on from the same line.
"""
from __future__ import annotations

import json
import re
import socket
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/colab", tags=["colab"])

REPO = "amirowaisy72/youtube-cover-video-tool"
BRANCH = "fix-script-render-keys-sources"  # the branch the one-click link opens
NOTEBOOK = Path(__file__).resolve().parent / "colab" / "YTGuru_Colab.ipynb"
NOTEBOOK_URL = f"https://colab.research.google.com/github/{REPO}/blob/{BRANCH}/backend/colab/YTGuru_Colab.ipynb"

CHECK_EVERY = 60.0   # a saved link is tested again this long after the last test
WAIT_CHECK = 10.0    # while paused, the saved link is tried this often

_lock = threading.Lock()
_last: dict = {"at": 0.0, "line": "", "result": None, "busy": False}
_worked = False      # Colab answered since the app started: losing it now is worth pausing for
_pause: dict = {"waiting": 0, "since": 0.0, "reason": ""}
_check_now = threading.Event()


def _ta():
    import tools_animator
    return tools_animator


def _link_file() -> Path:
    return _ta().BASE_DIR / "colab_voice.txt"


def _settings_file() -> Path:
    return _ta().BASE_DIR / "colab_settings.json"


def saved() -> tuple[str, str] | None:
    try:
        parts = _link_file().read_text(encoding="utf-8", errors="ignore").split()
    except OSError:
        return None
    return (parts[0].rstrip("/"), parts[1]) if len(parts) >= 2 and parts[0].startswith("http") else None


def pause_wanted() -> bool:
    try:
        return bool(json.loads(_settings_file().read_text(encoding="utf-8")).get("pause", True))
    except (OSError, ValueError, AttributeError):
        return True


# ------------------------------------------------------------------ the pasted line and errors
def parse_line(text: str) -> tuple[str, str, str]:
    """(url, code, "") from whatever was pasted, else ("", "", what is wrong in plain words)."""
    t = str(text or "").strip()
    found = re.search(r"https://[A-Za-z0-9.\-]+(?::\d+)?(?:/[^\s\"']*)?", t)
    if not found:
        if "colab.research.google.com" in t or t.startswith("http://"):
            return "", "", "That is not the link the notebook prints. Copy the line that starts with https:// at the bottom of the notebook."
        return "", "", "There is no https:// link in what you pasted. Copy the whole line from the bottom of the notebook."
    url = found.group(0).rstrip("/.,")
    if "colab.research.google.com" in url or "github.com" in url:
        return "", "", ("That is the address of the notebook page. Copy the line the notebook prints at the bottom "
                        "(it contains trycloudflare.com).")
    rest = t[found.end():].split()
    code = next((w.strip("\"'.,") for w in rest if re.fullmatch(r"[\"']?[A-Za-z0-9_\-]{8,}[\"'.,]?", w)), "")
    if not code:
        return "", "", "The code after the link is missing. Copy the WHOLE line: the link, a space, and the code."
    return url, code, ""


def explain(exc: Exception) -> str:
    """Why Colab did not answer, and what to do, in plain words."""
    if isinstance(exc, urllib.error.HTTPError):
        if exc.code == 403:
            return "Wrong code. Copy the WHOLE line from the notebook again."
        if exc.code in (404, 502, 503, 504, 521, 522, 523, 524, 530):
            return "Colab stopped: press Run all again in the notebook, then paste the new line."
        if exc.code >= 500:
            return "The program on Colab had an error. In the notebook press Runtime → Restart session and run all."
        return f"Colab answered with error {exc.code}. Press Run all again, then paste the new line."
    low = str(exc).lower()
    if isinstance(exc, (TimeoutError, socket.timeout)) or "timed out" in low:
        return "Colab did not answer in time. Look at the Colab tab: if it says Disconnected, press Run all again."
    if any(x in low for x in ("getaddrinfo", "name or service", "refused", "reset", "eof", "unreachable", "11001", "10054",
                              "10061", "remote end closed")):
        return ("Colab stopped: press Run all again in the notebook, then paste the new line. "
                "(If it is running, check your internet connection.)")
    if isinstance(exc, ValueError):
        return "The link answered, but it is not the YT Guru notebook. Copy the line the notebook prints."
    return f"Colab did not answer ({str(exc)[:90]}). Press Run all again, then paste the new line."


def health(url: str, token: str, timeout: float = 25) -> dict:
    req = urllib.request.Request(url.rstrip("/") + "/health", headers={"X-Token": token, "User-Agent": "YTGuru"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode())
        if not isinstance(data, dict) or not data.get("ok"):
            raise ValueError("not the notebook")
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "gpu": False, "gpu_name": "", "version": 0, "error": explain(exc)}
    gpu = bool(data.get("gpu"))
    return {"ok": True, "gpu": gpu, "gpu_name": str(data.get("gpu_name") or ""), "version": int(data.get("version") or 1),
            "error": "" if gpu else "Colab has no GPU. In the notebook: Runtime → Change runtime type → T4 GPU → Save, "
                                    "then Run all again."}


def _remember(line: str, result: dict) -> None:
    global _worked
    with _lock:
        _last.update(at=time.time(), line=line, result=result, busy=False)
    if result.get("ok"):
        _worked = True
        _ta()._COLAB_STATE["dead_until"] = 0.0


def check() -> dict | None:
    """Test the saved link now."""
    link = saved()
    if not link:
        return None
    result = health(*link)
    _remember(" ".join(link), result)
    return result


def note_success() -> None:
    """A piece of work came back from Colab."""
    global _worked
    _worked = True
    link = saved()
    if link:
        with _lock:
            old = _last.get("result") or {}
            _last.update(at=time.time(), line=" ".join(link),
                         result={"gpu": True, "gpu_name": "", "version": 1, **old, "ok": True, "error": ""})


def note_failure(reason: str) -> None:
    link = saved()
    if link:
        with _lock:
            _last.update(at=time.time(), line=" ".join(link),
                         result={"ok": False, "gpu": False, "gpu_name": "", "version": 0, "error": reason})


# ------------------------------------------------------------------ pausing a job
def should_pause() -> bool:
    return _worked and pause_wanted() and saved() is not None


class Stopped(BaseException):
    """The user stopped the job while it was waiting (not an Exception, so no fallback swallows it)."""


_job = threading.local()


def set_stop_check(check_) -> None:
    """A job with a Stop button tells this thread how to know it was pressed."""
    _job.stop = check_


def wait(reason: str) -> tuple[str, str] | None:
    """Hold this job until Colab answers again -> its (url, code); None = carry on on this computer."""
    with _lock:
        if not _pause["waiting"]:
            _pause.update(since=time.time(), reason=reason)
        _pause["waiting"] += 1
    tried_at, tried = 0.0, None
    try:
        while should_pause():
            stopped = getattr(_job, "stop", None)
            if stopped and stopped():
                raise Stopped()
            link = saved()
            if link and (link != tried or time.time() - tried_at >= WAIT_CHECK or _check_now.is_set()):
                _check_now.clear()
                tried, result = link, health(*link)
                tried_at = time.time()
                _remember(" ".join(link), result)
                if result["ok"] and result["gpu"]:
                    state = _ta()._COLAB_STATE
                    state["sent"].clear()
                    state.pop("no_best", None)
                    return link
                with _lock:
                    _pause["reason"] = result["error"] or reason
            _check_now.wait(1.0)
        return None
    finally:
        with _lock:
            _pause["waiting"] = max(0, _pause["waiting"] - 1)


def target() -> tuple[str, str] | None:
    """The link a new piece of work should use. Waits first when Colab was lost in the middle."""
    now_ = _ta()._colab_target()
    if now_ is None and should_pause():
        result = _last.get("result") or {}
        return wait(result.get("error") or "Colab stopped answering.")
    return now_


def after_failure(reason: str) -> tuple[str, str] | None:
    """Colab failed several times in a row: wait for it (when wanted), else None."""
    note_failure(reason)
    return wait(reason) if should_pause() else None


# ------------------------------------------------------------------ how long it takes
def _rate_from_log() -> float:
    """Seconds per character of the last voices made on Colab (0 = none yet)."""
    try:
        text = (_ta().BASE_DIR / "colab_voice.log").read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return 0.0
    rows = [(float(a), int(b)) for a, b in re.findall(r" ok ([\d.]+)s.*?(\d+) chars", text)][-80:]
    chars = sum(c for _s, c in rows)
    return sum(s for s, _c in rows) / chars if chars >= 100 else 0.0


def estimate(chars: int) -> dict:
    measured = _rate_from_log()
    rate = measured or 0.2  # a typical free T4 session, until this computer has measured its own
    secs = max(20, chars * rate)
    cpu_ratio = 4.0  # this computer is about four times slower than the free GPU
    engine = _ta()._ENGINE
    if engine["avg"].get("colab") and engine["avg"].get("cpu"):
        cpu_ratio = max(1.5, min(30.0, engine["avg"]["cpu"] / engine["avg"]["colab"]))
    return {"chars": chars, "colab_secs": round(secs), "cpu_secs": round(secs * cpu_ratio), "measured": bool(measured)}


# ------------------------------------------------------------------ routes
def status_now(fresh: bool = False) -> dict:
    link = saved()
    if link:
        line = " ".join(link)
        known = _last["line"] == line and _last["result"] is not None
        if fresh or not known:
            check()
        elif time.time() - _last["at"] > CHECK_EVERY and not _last["busy"]:
            _last["busy"] = True  # tested in the background: the page is never kept waiting
            threading.Thread(target=check, daemon=True).start()
    result = (_last["result"] if link else None) or {}
    state = "not_connected" if not link else "connected" if result.get("ok") else "disconnected"
    with _lock:
        paused = ({"since": _pause["since"], "reason": _pause["reason"],
                   "minutes": round((time.time() - _pause["since"]) / 60)} if _pause["waiting"] else None)
    return {"state": state, "url": link[0] if link else "", "gpu": bool(result.get("gpu")),
            "gpu_name": result.get("gpu_name", ""), "old_notebook": bool(result.get("ok")) and result.get("version", 1) < 2,
            "error": result.get("error", ""), "paused": paused, "pause_wanted": pause_wanted(),
            "notebook_url": NOTEBOOK_URL}


@router.get("/status")
def status(fresh: bool = False) -> dict:
    return status_now(fresh)


class Line(BaseModel):
    line: str = Field(..., min_length=1, max_length=600)


@router.post("/connect")
def connect(body: Line) -> dict:
    url, code, wrong = parse_line(body.line)
    if wrong:
        raise HTTPException(400, wrong)
    _link_file().write_text(f"{url} {code}\n", encoding="utf-8")
    state = _ta()._COLAB_STATE
    state["dead_until"] = 0.0
    state["sent"].clear()
    state.pop("no_best", None)
    _remember(f"{url} {code}", health(url, code))
    _check_now.set()  # a paused job looks at the new link at once
    return status_now()


@router.delete("/connect")
def disconnect() -> dict:
    global _worked
    _link_file().unlink(missing_ok=True)
    _worked = False
    _check_now.set()
    return status_now()


@router.post("/continue-here")
def continue_here() -> dict:
    global _worked
    _worked = False  # no more waiting until Colab is connected again
    _check_now.set()
    return status_now()


class Settings(BaseModel):
    pause: bool = True


@router.post("/settings")
def settings(body: Settings) -> dict:
    _settings_file().write_text(json.dumps({"pause": body.pause}), encoding="utf-8")
    _check_now.set()
    return status_now()


@router.get("/estimate")
def estimate_route(chars: int = 0) -> dict:
    return estimate(max(0, min(chars, 500_000)))


@router.get("/notebook")
def notebook() -> FileResponse:
    if not NOTEBOOK.exists():
        raise HTTPException(404, "The notebook file is missing.")
    return FileResponse(NOTEBOOK, media_type="application/x-ipynb+json", filename=NOTEBOOK.name)
