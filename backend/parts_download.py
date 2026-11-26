"""One resumable, checked download — used by the installer's essentials step and by the app's
optional parts. Standard library only (it runs before any package is installed)."""
from __future__ import annotations

import errno
import hashlib
import os
import socket
import ssl
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

CHUNK = 1 << 18
_context: ssl.SSLContext | None = None


class DownloadError(Exception):
    """What went wrong, in words for the user."""


class Stopped(Exception):
    pass


def context() -> ssl.SSLContext:
    """Windows' own certificates plus the bundled list: a brand-new PC has not fetched every root yet."""
    global _context
    if _context is None:
        _context = ssl.create_default_context()
        here = Path(__file__).resolve().parent.parent
        for pem in (os.environ.get("YTG_CA_FILE"), here / "python" / "cacert.pem"):
            if pem and Path(pem).is_file():
                _context.load_verify_locations(cafile=str(pem))
                break
    return _context


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(1 << 20):
            h.update(block)
    return h.hexdigest()


def explain(exc: BaseException) -> str:
    """The reason in plain words."""
    if isinstance(exc, urllib.error.HTTPError):
        if exc.code in (404, 410):
            return "the file is no longer at its address. Install the newest YT Guru."
        return f"the download server answered with error {exc.code}. Try again in a few minutes."
    reason = getattr(exc, "reason", exc)
    if isinstance(reason, ssl.SSLCertVerificationError):
        return "the secure connection could not be checked. Make sure the PC's date and time are correct."
    if isinstance(reason, OSError):
        if reason.errno == errno.ENOSPC or getattr(reason, "winerror", None) in (39, 112):
            return "the disk is full. Free some space, then press Retry."
        if isinstance(reason, PermissionError):
            return "Windows did not allow writing the file. Close YT Guru and your antivirus scan, then press Retry."
        if isinstance(reason, (socket.gaierror, ConnectionError, TimeoutError, socket.timeout)) or isinstance(exc, urllib.error.URLError):
            return "there is no internet connection, or it dropped. Check it, then press Retry — it continues where it stopped."
    return str(exc)[:200]


def fetch(url: str, target: Path, size: int = 0, sha256_hex: str = "", progress=None,
          stop: threading.Event | None = None, tries: int = 30, sha256: str = "") -> None:
    """Download url -> target, continuing a half-finished file (target.part) after any break.
    progress(bytes_of_this_file_on_disk) is called as it grows."""
    wanted = (sha256 or sha256_hex).lower()
    target = Path(target)
    part = target.with_name(target.name + ".part")
    target.parent.mkdir(parents=True, exist_ok=True)
    stop = stop or threading.Event()
    failures, bad_sum, last = 0, 0, ""
    while failures < tries:
        have = part.stat().st_size if part.exists() else 0
        if stop.is_set():
            raise Stopped()
        try:
            if not (size and have == size):
                headers = {"User-Agent": "YTGuru"}
                if have:
                    headers["Range"] = f"bytes={have}-"
                with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=45, context=context()) as r:
                    resumed = r.status == 206
                    done = have if resumed else 0
                    length = int(r.headers.get("Content-Length") or 0)
                    with open(part, "ab" if resumed else "wb") as out:
                        while True:
                            if stop.is_set():
                                raise Stopped()
                            block = r.read(CHUNK)
                            if not block:
                                break
                            out.write(block)
                            done += len(block)
                            failures = 0  # it is moving again
                            if progress:
                                progress(done)
                    got = part.stat().st_size
                    if length and got < (have if resumed else 0) + length:
                        raise ConnectionError("the connection closed early")
            got = part.stat().st_size
            if size and got < size:
                raise ConnectionError("the connection closed early")
            if (size and got != size) or (wanted and _digest(part) != wanted):
                part.unlink()
                bad_sum += 1
                if bad_sum >= 3:
                    raise DownloadError(f"Could not download {target.name}: the file arrives damaged. "
                                        "An antivirus or network filter may be changing it.")
                continue
            os.replace(part, target)
            if progress:
                progress(got)
            return
        except (Stopped, DownloadError):
            raise
        except urllib.error.HTTPError as exc:
            if exc.code == 416:  # the part is longer than the file: start again
                part.unlink(missing_ok=True)
            elif exc.code in (400, 401, 403, 404, 410):
                raise DownloadError(f"Could not download {target.name}: {explain(exc)}") from exc
            last = explain(exc)
        except Exception as exc:  # noqa: BLE001
            reason = getattr(exc, "reason", exc)
            last = explain(exc)
            if isinstance(reason, ssl.SSLCertVerificationError) or \
                    (isinstance(reason, OSError) and (reason.errno == errno.ENOSPC or isinstance(reason, PermissionError))):
                raise DownloadError(f"Could not download {target.name}: {last}") from exc
        failures += 1
        if stop.wait(min(10, failures)):
            raise Stopped()
    raise DownloadError(f"Could not download {target.name}: {last}")


_digest = sha256


def entry_files(group: dict) -> list[dict]:
    """Every downloadable file of one lock group (those with an address)."""
    out = [w for w in group.get("wheels", []) if w.get("url")]
    out += group.get("programs", []) + group.get("files", []) + (group.get("hf") or {}).get("files", [])
    if "archive" in group:
        out.append(group["archive"])
    return out
