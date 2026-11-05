"""Credit-check client for the installed YT Guru (desktop side).

SCAFFOLD (Phase 1) — not wired into backend/main.py yet. See
hook-sketch.md for exactly where each function is called.

Design rules this module enforces:
  * The desktop app NEVER decides its own balance. Every job asks
    the license server first (consume -> job_token) and reports
    when done (report / refund).
  * No credit value is hardcoded here: costs come from the server
    (GET /v1/me, POST /v1/activate).
  * The license-server URL is a build-time constant, not a user
    setting (a customer who can point the tool at their own fake
    server can mint their own credits — see DESIGN.md section 6).
  * Offline = no new jobs (strict mode, the default). Already-made
    files can still be previewed / downloaded / uploaded.

TODO (Phase 2):
  * Real device fingerprint: machine GUID (Windows registry
    HKLM\\SOFTWARE\\Microsoft\\Cryptography\\MachineGuid), CPU id,
    disk serial — hashed, no personal data.
  * Store the license key with DPAPI (Windows Credential Manager
    via keyring) instead of a plain JSON file.
  * TLS: verify the server certificate; consider pinning the
    license-server hostname.
  * Retry with backoff on consume() for a Vercel cold start
    (a few seconds) instead of failing instantly.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import urllib.error
import urllib.request
from pathlib import Path

# Set at build time from the deployed license-server URL.
# Example after deploy: "https://<your-project>.vercel.app"
# (the license server runs on Vercel — see DESIGN.md §4.4).
LICENSE_SERVER_URL = os.environ.get(
    "YTGURU_LICENSE_URL", "http://127.0.0.1:9000")

# Local key storage. TODO: move to Windows Credential Manager
# (keyring + DPAPI) in Phase 2 — a plain file is only scaffold.
KEY_FILE = Path(__file__).resolve().parent.parent / "license.json"


class LicenseError(Exception):
    """Raised when a job must not start (no credits, no server,
    revoked key, ...). The message is shown to the customer."""


def _http(method: str, path: str, payload: dict | None = None,
          timeout: int = 75) -> dict:
    """JSON call to the license server. 75 s timeout covers a
    Vercel cold start + Postgres connect; TODO: retry with backoff."""
    req = urllib.request.Request(
        LICENSE_SERVER_URL + path,
        method=method,
        data=json.dumps(payload or {}).encode() if payload is not None else None,
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
        raise LicenseError(
            "License server could not be reached. Connect to the "
            f"internet and try again. ({exc})")


def device_fingerprint() -> dict:
    """TODO: real Windows fingerprint (MachineGuid + CPU + disk).
    Scaffold returns a stable-per-machine placeholder derived from
    the hostname — DO NOT ship this; it is trivially spoofable
    and, worse, identical on cloned machines."""
    node = platform.node() or "unknown-pc"
    return {
        "machine_guid": hashlib.sha256(node.encode()).hexdigest()[:32],
        "cpu_id": "scaffold",
        "disk_serial": "scaffold",
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
        with urllib.request.urlopen(req, timeout=75) as resp:
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


def report(job_token: str, status: str, tool: str, title: str = "",
           topic: str = "", minutes: float | None = None,
           chars: int | None = None) -> None:
    """Close the job: completed (video made) or failed. Best-effort:
    a failed report must never break the customer's download, but
    a missing report means Master never sees the video in history
    — TODO: retry queue for failed reports in Phase 2."""
    try:
        _http("POST", "/v1/report", {
            "job_token": job_token, "status": status, "tool": tool,
            "title": title, "topic": topic or title,
            "minutes": minutes, "chars": chars,
        })
    except LicenseError:
        pass  # TODO: persist to a local outbox and retry later


def refund(job_token: str) -> None:
    """Give the reserved credit back (job failed before producing
    a video). Idempotent server-side — safe to call twice."""
    try:
        _http("POST", "/v1/refund", {"job_token": job_token})
    except LicenseError:
        pass  # TODO: persist to a local outbox and retry later
