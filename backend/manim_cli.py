"""YT Guru — running Manim as a separate process, in the source app AND in the installed .exe.

From source, a scene is drawn with `python -m manim render ...`. In the installed app
`sys.executable` is YT-Guru.exe, which is NOT Python: `YT-Guru.exe -m manim ...` used to start a
SECOND copy of the whole app (it failed with "port 8000 already in use", wrote that into
launcher-error.log and left the caller with empty output — every scene "could not run:").
`run_worker()` makes the .exe behave like `python -m manim` when it is called that way.

Also here: clean environment for the child and a readable summary of its error output.
Standard library only (the launcher imports this before anything heavy).
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import traceback
from pathlib import Path

LOG_ENV = "YTG_LOG"
_PROXY_KEYS = ("http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "no_proxy", "NO_PROXY")


def run_worker() -> None:
    """In the installed app only: when started as `YT-Guru.exe -m <module> ...`, do that job and exit.
    Returns immediately in every other case."""
    if not getattr(sys, "frozen", False) or len(sys.argv) < 3 or sys.argv[1] != "-m":
        return
    code = 1
    stream = None
    try:
        # An older .exe (whose launcher does not know this) has already started its "open the browser"
        # thread by the time this runs: it must not open a tab.
        import webbrowser
        webbrowser.open = lambda *a, **k: False
        for k in _PROXY_KEYS:  # the parent's dead proxy (see run()) is only for that thread
            os.environ.pop(k, None)
        log = os.environ.get(LOG_ENV)
        stream = open(log or os.devnull, "a", encoding="utf-8", errors="replace")  # noqa: SIM115
        sys.stdout = sys.stderr = stream
        module = sys.argv[2]
        if module != "manim":
            print(f"Error: '-m {module}' is not available in the installed app (everything it needs is built in).")
        else:
            sys.argv = ["manim", *sys.argv[3:]]
            from manim.__main__ import main
            main()
            code = 0
    except SystemExit as exc:
        code = exc.code if isinstance(exc.code, int) else (0 if exc.code is None else 1)
    except BaseException:  # noqa: BLE001 — the parent reads this from the log
        traceback.print_exc()
    finally:
        try:
            if stream:
                stream.flush()
        finally:
            os._exit(code)


def run(args: list[str], cwd: Path, env: dict, timeout: int, **kwargs) -> tuple[int, str]:
    """`manim <args>` in its own process -> (return code, everything it printed)."""
    log = Path(cwd) / "manim.log"
    env = {**env, "PYTHONIOENCODING": "utf-8", "TERM": "dumb", "NO_COLOR": "1", "COLUMNS": "160", LOG_ENV: str(log)}
    if getattr(sys, "frozen", False):
        # see run_worker(): an older launcher polls its health URL before opening a tab — a dead proxy stops that
        env.update(http_proxy="http://127.0.0.1:9", HTTP_PROXY="http://127.0.0.1:9", no_proxy="", NO_PROXY="")
    r = subprocess.run([sys.executable, "-m", "manim", *args], cwd=str(cwd), env=env, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout, **kwargs)
    try:
        extra = log.read_text(encoding="utf-8", errors="replace")
    except OSError:
        extra = ""
    return r.returncode, "\n".join(x for x in (r.stdout, extra, r.stderr) if x)


_ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
_BOX = re.compile(r"[─-╿▀-▟]+")
_PROGRESS = re.compile(r"\d+%\|")
_IMPORTANT = re.compile(r"(Error|Exception|Traceback|error:|\bline \d+)", re.I)


def clean_lines(output: str) -> list[str]:
    """The output without colours, box drawings, progress bars and padding."""
    out = []
    for raw in str(output or "").replace("\r", "\n").split("\n"):
        line = _BOX.sub(" ", _ANSI.sub("", raw))
        line = re.sub(r"\s+", " ", line).strip(" |>")
        if line and not _PROGRESS.search(line) and any(c.isalnum() for c in line):
            out.append(line)
    return out


def error_summary(output: str, code: int = 1, limit: int = 700) -> str:
    """The meaningful lines of a failed run (the last error first matters most: they are kept)."""
    lines = clean_lines(output)
    if not lines:
        return f"it stopped without any message (exit code {code})."
    picked = [x for x in lines if _IMPORTANT.search(x)]
    last = lines[-1]
    picked = picked[-7:] if picked else lines[-6:]
    if last not in picked and _IMPORTANT.search(last):
        picked.append(last)
    text = ""
    for line in reversed(picked):  # fill from the end: the final error line is never cut off
        line = line[:240]
        if len(text) + len(line) + 1 > limit:
            break
        text = line + ("\n" + text if text else "")
    return text or last[:limit]
