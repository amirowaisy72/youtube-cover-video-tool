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


def _wmic_value(section: str, key: str) -> str:
    """One value out of `wmic <section> get <key> /value`."""
    try:
        out = subprocess.run(
            ["wmic", section, "get", key, "/value"],
            capture_output=True, text=True, timeout=10).stdout
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
            capture_output=True, text=True, timeout=15).stdout
        return out.strip().splitlines()[0].strip() if out.strip() else ""
    except Exception:
        return ""


def device_fingerprint() -> dict:
    """Real per-machine fingerprint, hashed on this machine.

    MachineGuid (registry) is the primary id; CPU id + disk
    serial add stability across reinstalls. Empty values are
    fine — the server binds on whatever is present.
    """
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
    return {
        "machine_guid": _sha(machine_guid) if machine_guid else "unknown",
        "cpu_id": _sha(cpu_id) if cpu_id else "unknown",
        "disk_serial": _sha(disk_serial) if disk_serial else "unknown",
        "os": platform.system(),
    }


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
    """First run: bind key -> this device. Returns balance + costs."""
    data = _http("POST", "/v1/activate", {
        "license_key": license_key,
        "device": device_fingerprint(),
        "client_version": client_version,
    })
    save_key(license_key)
    return data


def balance() -> dict:
    """Current balance + costs, always from the server."""
    key = load_key()
    if not key:
        raise LicenseError("No license key. Activate the tool first.")
    req = urllib.request.Request(
        LICENSE_SERVER_URL + "/v1/me",
        headers={"X-License-Key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        raise LicenseError(f"License check failed ({exc.code}).")
    except Exception as exc:
        raise LicenseError(f"License server could not be reached. ({exc})")


def consume(action: str, job_ref: str, client_version: str) -> str:
    """Reserve credits for one job. Returns the single-use job_token.

    Call this BEFORE starting any FFmpeg/yt-dlp work. Raises
    LicenseError (shown to the customer) when credits are short
    or the server cannot be reached.
    """
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
    """
    payload = {"job_token": job_token, "status": status, "tool": tool,
               "title": title, "topic": topic or title,
               "minutes": minutes, "chars": chars}
    try:
        _http("POST", "/v1/report", payload)
    except LicenseError:
        _queue_outbox("/v1/report", payload)


def refund(job_token: str) -> None:
    """Give the reserved credit back (job failed before producing
    a video). Idempotent server-side — safe to call twice."""
    payload = {"job_token": job_token}
    try:
        _http("POST", "/v1/refund", payload)
    except LicenseError:
        _queue_outbox("/v1/refund", payload)
