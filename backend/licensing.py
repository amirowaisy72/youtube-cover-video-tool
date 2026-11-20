"""Credit-check client for the installed YT Guru (desktop side).

Wired into backend/main.py (see hook-sketch.md in ytguru-commercial/).

Design rules this module enforces:
  * The desktop app NEVER decides its own balance. Every job asks
    the license server first (consume -> job_token) and reports
    when done (report / refund).
  * No credit value is hardcoded here: costs come from the server
    (GET /v1/me, POST /v1/activate).
  * The license-server URL is a BUILD-TIME CONSTANT, never a user
    setting (a customer who can point the tool at their own fake
    server can mint their own credits — see DESIGN.md section 6).
  * Offline = no new jobs (strict mode, the default). Already-made
    files can still be previewed / downloaded / uploaded.

FREE mode (user, 2026-11-21): charging is OFF by default. The
server holds one flag (GET /v1/charging, flipped by Master in
the admin dashboard); while it is off, consume() returns a local
free token, balance()/activate() report "activated, no charge",
and report()/refund() are no-ops — no key, no credits, no lock
screens. report_usage() is the exception: it still pings the
server in free mode, so Master can see per-tool demand on the
admin panel even while everything is free. The paid code paths
below are NOT deleted, only gated:
when Master flips charging ON, every call enforces license/credits
again exactly as before. FAIL-OPEN: if the server cannot be
reached at all, charging_enabled() returns False — a network blip
must never lock a user out of a tool they already installed.
The flag is cached per process for a few minutes so a job start
does not wait on a cold Render instance each time.

Device fingerprint: real Windows values — MachineGuid from the
registry plus CPU id and disk serial (WMIC, PowerShell fallback),
each SHA-256 hashed before it leaves the machine. No personal
data is sent. On non-Windows (dev only) it falls back to the
machine's MAC address; the shipped .exe is Windows-only.

Reports/refunds that fail (offline at job end) are queued in a
local outbox file and retried on the next startup (flush_outbox).
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

# Build-time constant: the live license server (Render).
# NEVER user-editable, NEVER read from the environment — an env
# override would let a customer point the tool at their own fake
# server and mint credits.
LICENSE_SERVER_URL = "https://ytguru-license-server.onrender.com"

# Free-mode job token: returned by consume() while charging is
# off. It is NOT a server token — report()/refund() recognise it
# and skip the server call entirely (nothing was reserved).
FREE_MODE_TOKEN = "free-mode-no-charge"

# How long one process trusts its cached charging flag. Master
# flipping the switch in the dashboard reaches a running app
# within this window (or on its next license-status check, which
# also uses the cache). Short enough to react, long enough that
# a job start never waits on a cold Render instance.
CHARGING_CACHE_TTL_SEC = 300

_CHARGING_CACHE: dict = {"value": None, "at": 0.0}


def _fetch_charging_from_server() -> bool:
    """One unauthenticated GET /v1/charging. Single attempt, short
    timeout, no retries — any failure is the caller's problem
    (charging_enabled() fails open to free). A Render cold start
    can exceed this timeout; that only means free mode until the
    next check, never a lock-out."""
    req = urllib.request.Request(LICENSE_SERVER_URL + "/v1/charging")
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode() or "{}")
    return bool(data.get("charging_enabled", False))


def charging_enabled(refresh: bool = False) -> bool:
    """Is charging on? Asks the server (cached per process).

    FAIL-OPEN by design: any error — offline, timeout, cold
    start, bad response — returns False (free mode). A network
    blip must never lock a user out of a tool they installed.
    """
    now = time.monotonic()
    if (not refresh and _CHARGING_CACHE["value"] is not None
            and now - _CHARGING_CACHE["at"] < CHARGING_CACHE_TTL_SEC):
        return _CHARGING_CACHE["value"]
    try:
        value = _fetch_charging_from_server()
    except Exception:
        value = False
    _CHARGING_CACHE["value"] = value
    _CHARGING_CACHE["at"] = now
    return value


def _reset_charging_cache() -> None:
    """Forget the cached flag (tests; also lets a caller force a
    fresh ask on the next check)."""
    _CHARGING_CACHE["value"] = None
    _CHARGING_CACHE["at"] = 0.0


def _free_mode_payload() -> dict:
    """What balance()/activate() return while charging is off:
    activated, zero costs, no balance — the shape the frontend
    and backend already expect, so no caller needs a new branch.
    The extra flags let the UI tell free mode apart from a paid
    activation if it ever wants to."""
    return {
        "activated": True,
        "balance": None,
        "costs": {"cover_video": 0, "tts": 0, "autovideo": 0},
        "trial_credits": 0,
        "price_per_credit_pkr": 0,
        "min_client_version": "",
        "free_mode": True,
        "charging_enabled": False,
    }


def _data_dir() -> Path:
    """Where the key + outbox live: next to the installed .exe
    when frozen, the project root when running from source."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


KEY_FILE = _data_dir() / "license.json"
OUTBOX_FILE = _data_dir() / "license-outbox.jsonl"


class LicenseError(Exception):
    """Raised when a job must not start (no credits, no server,
    revoked key, ...). The message is shown to the customer."""


def _http(method: str, path: str, payload: dict | None = None,
          timeout: int = 60) -> dict:
    """JSON call to the license server.

    Retries connection errors/timeouts (Render free tier spins
    down after idle, so the first call can take 30-60 s to wake)
    but never retries an HTTP answer (401/402/403 are final).
    """
    body = json.dumps(payload or {}).encode() if payload is not None else None
    last_exc: Exception | None = None
    for attempt in range(3):
        req = urllib.request.Request(
            LICENSE_SERVER_URL + path,
            method=method,
            data=body,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode() or "{}")
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode() or "{}").get("detail", "")
            except Exception:
                detail = ""
            raise LicenseError(f"{exc.code}: {detail or exc.reason}")
        except Exception as exc:  # offline / server down / cold start
            last_exc = exc
            if attempt < 2:
                time.sleep(3 if attempt == 0 else 8)
    raise LicenseError(
        "License server could not be reached. Connect to the "
        f"internet and try again. ({last_exc})")


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", "ignore")).hexdigest()[:32]


def _no_window_kwargs() -> dict:
    """kwargs that keep a child console window hidden on Windows.

    Same rule as video.no_window_kwargs (this module stays
    standalone, so it keeps its own copy): the shipped .exe is
    --windowed, so a spawned wmic/powershell console flashes
    on screen without CREATE_NO_WINDOW (user, 2026-11-07)."""
    if sys.platform == "win32":
        return {"creationflags": subprocess.CREATE_NO_WINDOW}
    return {}


def _wmic_value(section: str, key: str) -> str:
    """One value out of `wmic <section> get <key> /value`."""
    try:
        out = subprocess.run(
            ["wmic", section, "get", key, "/value"],
            capture_output=True, text=True, timeout=10,
            **_no_window_kwargs()).stdout
        for line in out.splitlines():
            if line.strip().lower().startswith(key.lower() + "="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""


def _powershell_value(query: str) -> str:
    """Fallback when wmic is unavailable (newer Windows)."""
    try:
        out = subprocess.run(
            ["powershell", "-NoProfile", "-Command", query],
            capture_output=True, text=True, timeout=15,
            **_no_window_kwargs()).stdout
        return out.strip().splitlines()[0].strip() if out.strip() else ""
    except Exception:
        return ""


_FINGERPRINT_CACHE: dict | None = None


def device_fingerprint() -> dict:
    """Real per-machine fingerprint, hashed on this machine.

    Computed once per process and cached: the wmic/powershell
    calls behind it each open a console window on Windows, so
    they must never run more than once per app start.

    MachineGuid (registry) is the primary id; CPU id + disk
    serial add stability across reinstalls. Empty values are
    fine — the server binds on whatever is present.
    """
    global _FINGERPRINT_CACHE
    if _FINGERPRINT_CACHE is not None:
        return _FINGERPRINT_CACHE
    machine_guid = ""
    cpu_id = ""
    disk_serial = ""
    if sys.platform == "win32":
        try:
            import winreg
            with winreg.OpenKey(
                    winreg.HKEY_LOCAL_MACHINE,
                    r"SOFTWARE\Microsoft\Cryptography") as k:
                machine_guid, _ = winreg.QueryValueEx(k, "MachineGuid")
        except Exception:
            pass
        cpu_id = _wmic_value("cpu", "ProcessorId") or _powershell_value(
            "(Get-CimInstance Win32_Processor | Select-Object -First 1 "
            "-ExpandProperty ProcessorId)")
        disk_serial = _wmic_value("diskdrive", "SerialNumber") or _powershell_value(
            "(Get-CimInstance Win32_DiskDrive | Select-Object -First 1 "
            "-ExpandProperty SerialNumber)")
    else:  # dev only — the shipped .exe is Windows-only
        machine_guid = format(uuid.getnode(), "012x")
    _FINGERPRINT_CACHE = {
        "machine_guid": _sha(machine_guid) if machine_guid else "unknown",
        "cpu_id": _sha(cpu_id) if cpu_id else "unknown",
        "disk_serial": _sha(disk_serial) if disk_serial else "unknown",
        "os": platform.system(),
    }
    return _FINGERPRINT_CACHE


def load_key() -> str | None:
    if KEY_FILE.exists():
        try:
            return json.loads(KEY_FILE.read_text(encoding="utf-8")).get("key")
        except ValueError:
            return None
    return None


def save_key(key: str) -> None:
    KEY_FILE.write_text(json.dumps({"key": key}), encoding="utf-8")


def activate(license_key: str, client_version: str) -> dict:
    """First run: bind key -> this device. Returns balance + costs.

    Free mode: activation is skipped entirely — there is no key
    to bind and nothing to charge. Returns the free-mode payload
    so the caller still gets the shape it expects.
    """
    if not charging_enabled():
        return _free_mode_payload()
    data = _http("POST", "/v1/activate", {
        "license_key": license_key,
        "device": device_fingerprint(),
        "client_version": client_version,
    })
    save_key(license_key)
    return data


def balance() -> dict:
    """Current balance + costs, always from the server.

    Free mode: no key is needed and no server balance exists —
    returns the free-mode payload (activated, zero costs). The
    paid path below is unchanged: with charging on, a missing key
    still raises, exactly as before.
    """
    if not charging_enabled():
        return _free_mode_payload()
    key = load_key()
    if not key:
        raise LicenseError("No license key. Activate the tool first.")
    req = urllib.request.Request(
        LICENSE_SERVER_URL + "/v1/me",
        headers={"X-License-Key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        raise LicenseError(f"License check failed ({exc.code}).")
    except Exception as exc:
        raise LicenseError(f"License server could not be reached. ({exc})")
    data["free_mode"] = False
    data["charging_enabled"] = True
    return data


def consume(action: str, job_ref: str, client_version: str) -> str:
    """Reserve credits for one job. Returns the single-use job_token.

    Call this BEFORE starting any FFmpeg/yt-dlp work. Raises
    LicenseError (shown to the customer) when credits are short
    or the server cannot be reached.

    Free mode: no key, no reservation — returns FREE_MODE_TOKEN.
    report()/refund() recognise it and skip the server.
    """
    if not charging_enabled():
        return FREE_MODE_TOKEN
    key = load_key()
    if not key:
        raise LicenseError("No license key. Activate the tool first.")
    data = _http("POST", "/v1/consume", {
        "license_key": key,
        "action": action,  # cover_video | tts | autovideo
        "job_ref": job_ref,
        "client_version": client_version,
    })
    return data["job_token"]


def _queue_outbox(endpoint: str, payload: dict) -> None:
    """Persist a failed report/refund for retry on next startup."""
    try:
        with open(OUTBOX_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps({"endpoint": endpoint,
                                "payload": payload}) + "\n")
    except OSError:
        pass


def flush_outbox() -> None:
    """Retry queued reports/refunds. Best-effort, never raises."""
    if not OUTBOX_FILE.exists():
        return
    try:
        lines = OUTBOX_FILE.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    remaining: list[str] = []
    for line in lines:
        try:
            entry = json.loads(line)
            _http("POST", entry["endpoint"], entry["payload"], timeout=30)
        except Exception:
            remaining.append(line)
    try:
        if remaining:
            OUTBOX_FILE.write_text("\n".join(remaining) + "\n", encoding="utf-8")
        else:
            OUTBOX_FILE.unlink()
    except OSError:
        pass


def report(job_token: str, status: str, tool: str, title: str = "",
           topic: str = "", minutes: float | None = None,
           chars: int | None = None) -> None:
    """Close the job: completed (video made) or failed.

    A failed report is queued in the outbox (Master still sees
    the video in history on the next run) — it never breaks the
    customer's download.

    Free mode: the token is FREE_MODE_TOKEN, nothing was reserved,
    so there is nothing to close — returns immediately.
    """
    if job_token == FREE_MODE_TOKEN:
        return
    payload = {"job_token": job_token, "status": status, "tool": tool,
               "title": title, "topic": topic or title,
               "minutes": minutes, "chars": chars}
    try:
        _http("POST", "/v1/report", payload)
    except LicenseError:
        _queue_outbox("/v1/report", payload)


def refund(job_token: str) -> None:
    """Give the reserved credit back (job failed before producing
    a video). Idempotent server-side — safe to call twice.

    Free mode: the token is FREE_MODE_TOKEN, nothing was reserved,
    so there is nothing to refund — returns immediately.
    """
    if job_token == FREE_MODE_TOKEN:
        return
    payload = {"job_token": job_token}
    try:
        _http("POST", "/v1/refund", payload)
    except LicenseError:
        _queue_outbox("/v1/refund", payload)


def report_usage(tool: str, title: str = "", topic: str = "",
                 status: str = "completed", minutes: float | None = None,
                 chars: int | None = None) -> None:
    """Usage ping, separate from credits: how much each tool is
    used, even while charging is OFF (free mode).

    Unlike report(), this fires in free mode too — report() is a
    no-op on FREE_MODE_TOKEN, so free-mode jobs would otherwise
    leave no trace on the server and Master could never see
    demand on the admin panel. The server attributes the row to
    the saved license key when one exists, else to this machine's
    device fingerprint (hashed on this machine, no personal data).

    Best-effort by design: one short attempt, never raises, never
    delays or breaks the customer's job/download. A failed ping is
    queued in the outbox and retried on the next startup, exactly
    like a failed report().
    """
    try:
        payload = {
            "license_key": load_key() or "",
            "device": device_fingerprint(),
            "tool": tool,
            "title": title,
            "topic": topic or title,
            "status": status,
            "minutes": minutes,
            "chars": chars,
        }
    except Exception:
        return
    try:
        req = urllib.request.Request(
            LICENSE_SERVER_URL + "/v1/usage",
            method="POST",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()
    except Exception:
        _queue_outbox("/v1/usage", payload)
