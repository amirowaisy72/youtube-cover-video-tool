"""YT Guru license / credit server (Phase 2 — Vercel-ready).

Lightweight FastAPI service: credits + history only. It never sees a
video file and never runs FFmpeg.

Local dev (from the ytguru-commercial/ folder):

    uvicorn api.index:app --port 9000

This file IS the Vercel entrypoint (``api/index.py`` — Vercel's
Python runtime serves the ASGI ``app`` exported here). Public
routes (/v1/*, /admin/*, /health) are rewritten to this function
in ../vercel.json, and the function sees the ORIGINAL request
path, so the FastAPI routes below match unchanged. The server
MUST use Postgres via ``DATABASE_URL`` on Vercel — the server refuses to start
on Vercel without it, because a SQLite file would be wiped on every
serverless recycle and all customers/credits would be lost. Local
dev without DATABASE_URL falls back to SQLite (``license.db`` here)
for testing only. See ``_store.py``.

Env vars (production — set in Vercel, never in this file):
- ``DATABASE_URL`` — Postgres (Supabase free tier, pooler port
  6543 recommended). REQUIRED on Vercel.
- ``JOB_TOKEN_SECRET`` — long random secret for signing job tokens.
- ``ADMIN_PASSWORD_HASH`` — bcrypt hash of the Master password.
- ``JOB_TOKEN_TTL_SEC`` — job-token lifetime (default 600 s).
- ``MIN_CLIENT_VERSION`` — minimum allowed customer-tool version.

The customer tool must call /v1/consume BEFORE starting any
FFmpeg/yt-dlp work, and /v1/report when the job finishes (see
../client/licensing.py and ../client/hook-sketch.md).

Layout note: the DB layer lives in ``api/_store.py`` (underscore
prefix = Vercel does not turn it into a function; it is bundled
with this one). The sys.path bootstrap below makes the import
work both on Vercel and for local ``uvicorn api.index:app``.
"""

from __future__ import annotations

import hashlib
import hmac as hmac_mod
import json
import os
import secrets
import sys
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException

# This file runs as top-level module ``index`` on Vercel and as
# ``api.index`` locally — either way, put this folder on the
# path so the ``_store`` sibling module imports.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from _store import IS_POSTGRES, begin_consume_txn  # noqa: E402
from _store import connect as _db_connect  # noqa: E402
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DASHBOARD_DIR = BASE_DIR.parent / "dashboard"

# Env vars (production). The JOB_TOKEN_SECRET default is a
# scaffold placeholder only and must never be used for real
# customers — set a long random secret in Vercel.
JOB_TOKEN_SECRET = os.environ.get("JOB_TOKEN_SECRET", "CHANGE-ME-scaffold-only")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH", "")  # bcrypt hash
JOB_TOKEN_TTL_SEC = int(os.environ.get("JOB_TOKEN_TTL_SEC", "600"))  # 10 min
MIN_CLIENT_VERSION = os.environ.get("MIN_CLIENT_VERSION", "1.0.0")

# Default credit values — Master overrides ALL of these from the
# dashboard (PUT /admin/settings). Nothing in the customer tool
# hardcodes a price.
DEFAULT_SETTINGS = {
    "credits_per_cover_video": 1,
    "credits_per_tts": 1,
    "credits_per_autovideo": 1,
    # New tools (1.0.5): same consume/report gate as the first
    # three — 1 credit each when charging is on, free otherwise.
    "credits_per_animator": 1,
    "credits_per_visual": 1,
    "credits_per_voiceclone": 1,
    # Free mode (user, 2026-11-21): charging OFF by default. The
    # desktop tool reads this via GET /v1/charging (cached a few
    # minutes); Master flips it in the admin dashboard and every
    # already-installed tool starts/stops asking for credits with
    # no reinstall. Stored as a setting so it survives restarts.
    "charging_enabled": False,
    "trial_credits": 3,
    "price_per_credit_pkr": 50,
    "packs": [
        {"credits": 10, "price_pkr": 500},
        {"credits": 30, "price_pkr": 1200},
        {"credits": 100, "price_pkr": 3000},
    ],
    "max_devices_per_key": 2,
    "offline_grace_jobs": 0,  # 0 = strict: no internet, no new jobs
}

app = FastAPI(title="YT Guru License Server")


# ------------------------------------------------------------------ db
def _db():
    """One short-lived connection (Postgres in production, SQLite
    for local dev only). See store.py — the connection commits on
    clean exit from the ``with`` block and rolls back on error."""
    return _db_connect()


def _init_db() -> None:
    with _db() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY, name TEXT, email TEXT,
                created_at REAL NOT NULL, notes TEXT DEFAULT '');
            CREATE TABLE IF NOT EXISTS license_keys (
                key_hash TEXT PRIMARY KEY, customer_id TEXT NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                devices TEXT NOT NULL DEFAULT '[]',
                created_at REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS credit_ledger (
                id TEXT PRIMARY KEY, customer_id TEXT NOT NULL,
                delta INTEGER NOT NULL, reason TEXT NOT NULL,
                job_token TEXT, created_at REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS jobs (
                job_token TEXT PRIMARY KEY, customer_id TEXT NOT NULL,
                tool TEXT NOT NULL, title TEXT DEFAULT '',
                topic TEXT DEFAULT '', minutes REAL,
                chars INTEGER, credits INTEGER NOT NULL,
                status TEXT NOT NULL, created_at REAL NOT NULL,
                finished_at REAL);
            CREATE TABLE IF NOT EXISTS usage (
                id TEXT PRIMARY KEY, customer_id TEXT,
                device_fp TEXT NOT NULL DEFAULT '',
                tool TEXT NOT NULL, title TEXT DEFAULT '',
                topic TEXT DEFAULT '', status TEXT NOT NULL,
                minutes REAL, chars INTEGER,
                credits INTEGER NOT NULL DEFAULT 0,
                client_version TEXT DEFAULT '',
                created_at REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS admin_sessions (
                token TEXT PRIMARY KEY, created_at REAL NOT NULL);
            """
        )
        for key, value in DEFAULT_SETTINGS.items():
            con.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (key, json.dumps(value)),
            )


_init_db()


def _get_settings() -> dict:
    with _db() as con:
        rows = con.execute("SELECT key, value FROM settings").fetchall()
    out = dict(DEFAULT_SETTINGS)
    for row in rows:
        try:
            out[row["key"]] = json.loads(row["value"])
        except ValueError:
            pass
    return out


def _balance(customer_id: str) -> int:
    with _db() as con:
        row = con.execute(
            "SELECT COALESCE(SUM(delta), 0) AS b FROM credit_ledger "
            "WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()
    return int(row["b"])


def _key_hash(license_key: str) -> str:
    # Raw keys are never stored — only the SHA-256 hash.
    return hashlib.sha256(license_key.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- tokens
def _sign_job_token(payload: dict) -> str:
    """Single-use, short-lived, HMAC-signed job token.

    Format: base64url(json).hex-hmac. The desktop app cannot mint
    one — only this server holds JOB_TOKEN_SECRET.
    """
    import base64

    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    sig = hmac_mod.new(JOB_TOKEN_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(raw).decode() + "." + sig


def _verify_job_token(token: str) -> dict:
    import base64

    try:
        raw_b64, sig = token.rsplit(".", 1)
        raw = base64.urlsafe_b64decode(raw_b64.encode())
        expect = hmac_mod.new(JOB_TOKEN_SECRET.encode(), raw, hashlib.sha256).hexdigest()
        if not hmac_mod.compare_digest(sig, expect):
            raise ValueError("bad signature")
        payload = json.loads(raw.decode())
    except Exception:
        raise HTTPException(401, "Invalid job token.")
    if payload.get("exp", 0) < time.time():
        raise HTTPException(401, "Job token expired.")
    return payload


def _device_fingerprint(data: dict) -> str:
    # Customer PC fingerprint: machine GUID + CPU + disk serial,
    # hashed. No personal data leaves the machine.
    blob = "|".join(str(data.get(k, "")) for k in
                    ("machine_guid", "cpu_id", "disk_serial", "os"))
    return hashlib.sha256(blob.encode()).hexdigest()[:32]


# ---------------------------------------------------------------- models
class ActivateRequest(BaseModel):
    license_key: str
    device: dict = Field(default_factory=dict)  # machine_guid, cpu_id, ...
    client_version: str = "0.0.0"


class ConsumeRequest(BaseModel):
    license_key: str
    action: str  # cover_video | tts | autovideo | animator | visual | voiceclone
    job_ref: str  # client-generated job id (12 hex chars)
    client_version: str = "0.0.0"


class ReportRequest(BaseModel):
    job_token: str
    status: str  # completed | failed
    tool: str = ""
    title: str = ""
    topic: str = ""
    minutes: float | None = None
    chars: int | None = None


class RefundRequest(BaseModel):
    job_token: str


class UsageRequest(BaseModel):
    """Best-effort usage ping (client licensing.report_usage).

    Separate from credits: it fires in free mode too, so Master
    can see demand while everything is free. license_key is
    optional — free-mode machines have no key, so the row is
    attributed to the device fingerprint instead (customer_id
    stays NULL). The endpoint never 401s: a bad/missing key still
    records the row anonymously, because a usage ping must never
    break a customer's job.
    """
    license_key: str = ""
    device: dict = Field(default_factory=dict)
    tool: str = ""
    title: str = ""
    topic: str = ""
    status: str = "completed"  # completed | failed
    minutes: float | None = None
    chars: int | None = None
    client_version: str = ""


class ChargingUpdate(BaseModel):
    charging_enabled: bool


class AdminLogin(BaseModel):
    username: str
    password: str


class CustomerCreate(BaseModel):
    name: str
    email: str = ""
    notes: str = ""


class CreditChange(BaseModel):
    delta: int  # +N to add, -N to remove
    reason: str = ""


class SettingsUpdate(BaseModel):
    settings: dict


def _require_admin(authorization: str | None) -> None:
    """Session token issued by POST /admin/login. Tokens live in the
    database (admin_sessions) and are checked on every admin call."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Admin login required.")
    token = authorization.split(" ", 1)[1]
    with _db() as con:
        row = con.execute(
            "SELECT 1 FROM admin_sessions WHERE token = ?", (token,)
        ).fetchone()
    if not row:
        raise HTTPException(401, "Admin login required.")


def _lookup_key(license_key: str) -> dict:
    with _db() as con:
        row = con.execute(
            "SELECT * FROM license_keys WHERE key_hash = ?",
            (_key_hash(license_key),),
        ).fetchone()
    if not row or row["revoked"]:
        raise HTTPException(401, "License key invalid or revoked.")
    return row


# ---------------------------------------------------------------- customer
@app.post("/v1/activate")
def activate(payload: ActivateRequest) -> dict:
    """First run on a customer PC: bind key -> device fingerprint."""
    row = _lookup_key(payload.license_key)
    settings = _get_settings()
    fp = _device_fingerprint(payload.device)
    devices = json.loads(row["devices"])
    if fp not in devices:
        if len(devices) >= int(settings.get("max_devices_per_key", 2)):
            raise HTTPException(
                403,
                "This license key is already used on the maximum number "
                "of devices. Ask Master to reset devices.",
            )
        devices.append(fp)
        with _db() as con:
            con.execute(
                "UPDATE license_keys SET devices = ? WHERE key_hash = ?",
                (json.dumps(devices), row["key_hash"]),
            )
    return {
        "customer_id": row["customer_id"],
        "balance": _balance(row["customer_id"]),
        "costs": {
            "cover_video": settings["credits_per_cover_video"],
            "tts": settings["credits_per_tts"],
            "autovideo": settings["credits_per_autovideo"],
            "animator": settings["credits_per_animator"],
            "visual": settings["credits_per_visual"],
            "voiceclone": settings["credits_per_voiceclone"],
        },
        "trial_credits": settings["trial_credits"],
        "price_per_credit_pkr": settings["price_per_credit_pkr"],
        "min_client_version": MIN_CLIENT_VERSION,
    }


@app.get("/v1/me")
def me(license_key: str = Header(..., alias="X-License-Key")) -> dict:
    row = _lookup_key(license_key)
    settings = _get_settings()
    return {
        "customer_id": row["customer_id"],
        "balance": _balance(row["customer_id"]),
        "costs": {
            "cover_video": settings["credits_per_cover_video"],
            "tts": settings["credits_per_tts"],
            "autovideo": settings["credits_per_autovideo"],
            "animator": settings["credits_per_animator"],
            "visual": settings["credits_per_visual"],
            "voiceclone": settings["credits_per_voiceclone"],
        },
    }


@app.get("/v1/charging")
def charging() -> dict:
    """Free-mode flag, read by the desktop tool (cached a few
    minutes per process). Public — no key: a machine with no
    license must still learn that everything is free. Default
    off; Master flips it in the admin dashboard."""
    settings = _get_settings()
    return {"charging_enabled": bool(settings.get("charging_enabled", False))}


@app.post("/v1/usage")
def usage(payload: UsageRequest) -> dict:
    """Record one finished job for the per-user usage view.

    Best-effort analytics, never a gate: no auth, no 401 — a
    missing/invalid key just leaves customer_id NULL and the row
    is grouped by device fingerprint on the dashboard."""
    customer_id = None
    if payload.license_key:
        try:
            customer_id = _lookup_key(payload.license_key)["customer_id"]
        except HTTPException:
            customer_id = None
    device_fp = ""
    if payload.device:
        device_fp = _device_fingerprint(payload.device)
    with _db() as con:
        con.execute(
            "INSERT INTO usage (id, customer_id, device_fp, tool, "
            "title, topic, status, minutes, chars, credits, "
            "client_version, created_at) VALUES "
            "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), customer_id, device_fp,
             (payload.tool or "")[:64],
             (payload.title or "")[:200], (payload.topic or "")[:200],
             payload.status if payload.status in ("completed", "failed")
             else "completed",
             payload.minutes, payload.chars, 0,
             (payload.client_version or "")[:32], time.time()),
        )
        con.commit()
    return {"ok": True}


@app.post("/v1/consume")
def consume(payload: ConsumeRequest) -> dict:
    """Reserve credits and mint a single-use job token.

    Atomic: balance check + decrement + ledger row happen in ONE
    transaction, so two simultaneous jobs cannot spend the same
    credit. Returns 402 when the balance is too low.
    """
    row = _lookup_key(payload.license_key)
    settings = _get_settings()
    cost_map = {
        "cover_video": int(settings["credits_per_cover_video"]),
        "tts": int(settings["credits_per_tts"]),
        "autovideo": int(settings["credits_per_autovideo"]),
        "animator": int(settings["credits_per_animator"]),
        "visual": int(settings["credits_per_visual"]),
        "voiceclone": int(settings["credits_per_voiceclone"]),
    }
    if payload.action not in cost_map:
        raise HTTPException(400, "Unknown action.")
    cost = cost_map[payload.action]
    customer_id = row["customer_id"]
    with _db() as con:
        begin_consume_txn(con, customer_id)
        bal = con.execute(
            "SELECT COALESCE(SUM(delta), 0) AS b FROM credit_ledger "
            "WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()["b"]
        if bal < cost:
            raise HTTPException(
                402,
                f"Not enough credits. This needs {cost} credit(s), "
                f"you have {bal}.",
            )
        job_token = _sign_job_token({
            "customer_id": customer_id,
            "action": payload.action,
            "job_ref": payload.job_ref,
            "credits": cost,
            "exp": time.time() + JOB_TOKEN_TTL_SEC,
            "nonce": secrets.token_hex(8),
        })
        con.execute(
            "INSERT INTO credit_ledger (id, customer_id, delta, reason, "
            "job_token, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), customer_id, -cost,
             f"consume:{payload.action}", job_token, time.time()),
        )
        con.execute(
            "INSERT INTO jobs (job_token, customer_id, tool, credits, "
            "status, created_at) VALUES (?, ?, ?, ?, 'reserved', ?)",
            (job_token, customer_id, payload.action, cost, time.time()),
        )
        con.commit()
    return {"job_token": job_token, "credits_charged": cost,
            "balance_after": _balance(customer_id)}


@app.post("/v1/report")
def report(payload: ReportRequest) -> dict:
    """Close a job token as completed/failed and store history."""
    data = _verify_job_token(payload.job_token)
    with _db() as con:
        row = con.execute(
            "SELECT status FROM jobs WHERE job_token = ?",
            (payload.job_token,),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Unknown job token.")
        if row["status"] in ("completed", "failed", "refunded"):
            return {"ok": True, "already_closed": True}
        con.execute(
            "UPDATE jobs SET status = ?, tool = ?, title = ?, topic = ?, "
            "minutes = ?, chars = ?, finished_at = ? WHERE job_token = ?",
            (payload.status, payload.tool or data.get("action", ""),
             payload.title, payload.topic or payload.title,
             payload.minutes, payload.chars, time.time(),
             payload.job_token),
        )
        con.commit()
    return {"ok": True}


@app.post("/v1/refund")
def refund(payload: RefundRequest) -> dict:
    """Refund a reserved credit exactly once (idempotent).

    Called by the desktop app when a job failed before producing
    a video. A token already refunded/completed cannot refund again.
    """
    data = _verify_job_token(payload.job_token)
    with _db() as con:
        row = con.execute(
            "SELECT status, credits, customer_id FROM jobs "
            "WHERE job_token = ?",
            (payload.job_token,),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Unknown job token.")
        if row["status"] in ("refunded", "completed"):
            return {"ok": True, "already_closed": True}
        con.execute(
            "UPDATE jobs SET status = 'refunded', finished_at = ? "
            "WHERE job_token = ?",
            (time.time(), payload.job_token),
        )
        con.execute(
            "INSERT INTO credit_ledger (id, customer_id, delta, reason, "
            "job_token, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), row["customer_id"], int(row["credits"]),
             "refund:job-failed", payload.job_token, time.time()),
        )
        con.commit()
    return {"ok": True, "refunded": int(row["credits"])}


# ---------------------------------------------------------------- admin
@app.post("/admin/login")
def admin_login(payload: AdminLogin) -> dict:
    """Verify the password against ADMIN_PASSWORD_HASH (bcrypt).
    Refuses login until the env hash is set, so no default
    password ever works."""
    import bcrypt

    if not ADMIN_PASSWORD_HASH:
        raise HTTPException(500, "Admin password not configured on server.")
    if payload.username != "master" or not bcrypt.checkpw(
            payload.password.encode(), ADMIN_PASSWORD_HASH.encode()):
        raise HTTPException(401, "Wrong username or password.")
    token = secrets.token_hex(32)
    with _db() as con:
        con.execute(
            "INSERT INTO admin_sessions (token, created_at) VALUES (?, ?)",
            (token, time.time()),
        )
        con.commit()
    return {"token": token}


@app.get("/admin/overview")
def admin_overview(authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    with _db() as con:
        customers = con.execute("SELECT COUNT(*) c FROM customers").fetchone()["c"]
        issued = con.execute(
            "SELECT COALESCE(SUM(delta),0) s FROM credit_ledger WHERE delta > 0"
        ).fetchone()["s"]
        spent = con.execute(
            "SELECT COALESCE(SUM(-delta),0) s FROM credit_ledger WHERE delta < 0"
        ).fetchone()["s"]
        videos = con.execute(
            "SELECT COUNT(*) c FROM jobs WHERE status = 'completed'"
        ).fetchone()["c"]
        by_tool = con.execute(
            "SELECT tool, COUNT(*) c FROM jobs WHERE status='completed' "
            "GROUP BY tool"
        ).fetchall()
        recent = con.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 20"
        ).fetchall()
    return {
        "total_customers": customers,
        "credits_issued": issued,
        "credits_spent": spent,
        "credits_outstanding": issued - spent,
        "videos_completed": videos,
        "videos_by_tool": {r["tool"]: r["c"] for r in by_tool},
        "recent_jobs": [dict(r) for r in recent],
    }


@app.post("/admin/charging")
def admin_set_charging(payload: ChargingUpdate,
                       authorization: str | None = Header(None)) -> dict:
    """Flip free mode on/off. Stored as a setting, so it survives
    restarts. Every already-installed tool reads the flag on its
    next license check (cached a few minutes) and starts/stops
    asking for credits — no reinstall, no new .exe. Turning it ON
    is what makes the gated tools require a subscription."""
    _require_admin(authorization)
    with _db() as con:
        con.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            ("charging_enabled", json.dumps(bool(payload.charging_enabled))),
        )
        con.commit()
    return {"charging_enabled": bool(payload.charging_enabled)}


@app.get("/admin/usage")
def admin_usage(customer_id: str | None = None,
                authorization: str | None = Header(None)) -> dict:
    """Per-user usage view (user, 2026-11-21): how much each
    customer uses each tool, when they were last active, and what
    unregistered (free-mode, no-key) devices used. Reads the
    usage table written by POST /v1/usage — the same rows the
    client pings in free mode, so demand is visible even while
    everything is free."""
    _require_admin(authorization)
    with _db() as con:
        customers = {
            r["id"]: dict(r) for r in con.execute(
                "SELECT id, name, email FROM customers").fetchall()
        }
        if customer_id:
            rows = con.execute(
                "SELECT * FROM usage WHERE customer_id = ? "
                "ORDER BY created_at DESC LIMIT 200",
                (customer_id,),
            ).fetchall()
        else:
            rows = con.execute(
                "SELECT * FROM usage ORDER BY created_at DESC LIMIT 500"
            ).fetchall()
        by_customer: dict[str, dict] = {}
        unregistered: dict[str, dict] = {}
        recent = []
        for r in rows:
            d = dict(r)
            name = customers.get(d["customer_id"] or "", {}).get("name", "")
            d["customer_name"] = name
            recent.append(d)
            if d["customer_id"]:
                agg = by_customer.setdefault(d["customer_id"], {
                    "customer_id": d["customer_id"],
                    "name": name,
                    "email": customers.get(d["customer_id"] or "", {}).get("email", ""),
                    "total": 0, "by_tool": {}, "last_active": 0,
                    "credits_spent": 0,
                })
            else:
                key = (d["device_fp"] or "unknown")[:12]
                agg = unregistered.setdefault(key, {
                    "device_fp": key, "total": 0, "by_tool": {},
                    "last_active": 0,
                })
            agg["total"] += 1
            agg["by_tool"][d["tool"]] = agg["by_tool"].get(d["tool"], 0) + 1
            agg["last_active"] = max(agg["last_active"], d["created_at"])
        for agg in by_customer.values():
            spent = con.execute(
                "SELECT COALESCE(SUM(-delta),0) s FROM credit_ledger "
                "WHERE customer_id = ? AND delta < 0",
                (agg["customer_id"],),
            ).fetchone()["s"]
            agg["credits_spent"] = int(spent)
    return {
        "by_customer": sorted(by_customer.values(),
                              key=lambda a: a["last_active"], reverse=True),
        "unregistered": sorted(unregistered.values(),
                               key=lambda a: a["last_active"], reverse=True),
        "recent": recent[:50],
    }


@app.get("/admin/customers")
def admin_customers(authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    with _db() as con:
        rows = con.execute("SELECT * FROM customers ORDER BY created_at DESC").fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["balance"] = _balance(r["id"])
            d["videos"] = con.execute(
                "SELECT COUNT(*) c FROM jobs WHERE customer_id = ? "
                "AND status = 'completed'",
                (r["id"],),
            ).fetchone()["c"]
            out.append(d)
    return {"customers": out}


@app.get("/admin/customers/{customer_id}")
def admin_customer_detail(customer_id: str,
                          authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    with _db() as con:
        cust = con.execute(
            "SELECT * FROM customers WHERE id = ?", (customer_id,)
        ).fetchone()
        if not cust:
            raise HTTPException(404, "Customer not found.")
        jobs = con.execute(
            "SELECT * FROM jobs WHERE customer_id = ? ORDER BY created_at DESC",
            (customer_id,),
        ).fetchall()
        usage_rows = con.execute(
            "SELECT * FROM usage WHERE customer_id = ? "
            "ORDER BY created_at DESC LIMIT 100",
            (customer_id,),
        ).fetchall()
        ledger = con.execute(
            "SELECT * FROM credit_ledger WHERE customer_id = ? "
            "ORDER BY created_at DESC",
            (customer_id,),
        ).fetchall()
        keys = con.execute(
            "SELECT customer_id, devices, revoked, created_at FROM license_keys "
            "WHERE customer_id = ?",
            (customer_id,),
        ).fetchall()
    d = dict(cust)
    d["balance"] = _balance(customer_id)
    d["history"] = [dict(r) for r in jobs]
    d["usage"] = [dict(r) for r in usage_rows]
    d["usage_by_tool"] = {}
    for r in usage_rows:
        d["usage_by_tool"][r["tool"]] = \
            d["usage_by_tool"].get(r["tool"], 0) + 1
    d["ledger"] = [dict(r) for r in ledger]
    d["keys"] = [dict(r) for r in keys]
    return d


@app.post("/admin/customers")
def admin_create_customer(payload: CustomerCreate,
                          authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    settings = _get_settings()
    customer_id = uuid.uuid4().hex[:12]
    raw_key = "YTG-" + "-".join(secrets.token_hex(2).upper() for _ in range(4))
    with _db() as con:
        con.execute(
            "INSERT INTO customers (id, name, email, created_at, notes) "
            "VALUES (?, ?, ?, ?, ?)",
            (customer_id, payload.name, payload.email, time.time(), payload.notes),
        )
        con.execute(
            "INSERT INTO license_keys (key_hash, customer_id, created_at) "
            "VALUES (?, ?, ?)",
            (_key_hash(raw_key), customer_id, time.time()),
        )
        trial = int(settings.get("trial_credits", 3))
        if trial > 0:
            con.execute(
                "INSERT INTO credit_ledger (id, customer_id, delta, reason, "
                "created_at) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), customer_id, trial, "trial credits",
                 time.time()),
            )
        con.commit()
    # The raw key is shown ONCE here — Master copies it to the
    # customer. Only the hash is stored.
    return {"customer_id": customer_id, "license_key": raw_key,
            "trial_credits": trial}


@app.post("/admin/customers/{customer_id}/credits")
def admin_change_credits(customer_id: str, payload: CreditChange,
                         authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    if payload.delta == 0:
        raise HTTPException(400, "Delta cannot be zero.")
    with _db() as con:
        if not con.execute(
                "SELECT 1 FROM customers WHERE id = ?", (customer_id,)
        ).fetchone():
            raise HTTPException(404, "Customer not found.")
        con.execute(
            "INSERT INTO credit_ledger (id, customer_id, delta, reason, "
            "created_at) VALUES (?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), customer_id, payload.delta,
             payload.reason or "manual adjustment", time.time()),
        )
        con.commit()
    return {"customer_id": customer_id, "balance": _balance(customer_id)}


@app.post("/admin/customers/{customer_id}/revoke")
def admin_revoke(customer_id: str,
                 authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    with _db() as con:
        con.execute(
            "UPDATE license_keys SET revoked = 1 WHERE customer_id = ?",
            (customer_id,),
        )
        con.commit()
    return {"customer_id": customer_id, "revoked": True}


@app.post("/admin/customers/{customer_id}/reset-devices")
def admin_reset_devices(customer_id: str,
                        authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    with _db() as con:
        con.execute(
            "UPDATE license_keys SET devices = '[]' WHERE customer_id = ?",
            (customer_id,),
        )
        con.commit()
    return {"customer_id": customer_id, "devices_reset": True}


@app.get("/admin/settings")
def admin_get_settings(authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    return _get_settings()


@app.put("/admin/settings")
def admin_put_settings(payload: SettingsUpdate,
                       authorization: str | None = Header(None)) -> dict:
    """Master sets every credit value here. The customer tool fetches
    these on activate/me — no reinstall, no hardcoded prices."""
    _require_admin(authorization)
    allowed = set(DEFAULT_SETTINGS)
    with _db() as con:
        for key, value in payload.settings.items():
            if key in allowed:
                con.execute(
                    "INSERT INTO settings (key, value) VALUES (?, ?) "
                    "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    (key, json.dumps(value)),
                )
        con.commit()
    return _get_settings()


@app.get("/admin/ledger")
def admin_ledger(authorization: str | None = Header(None)) -> dict:
    _require_admin(authorization)
    with _db() as con:
        rows = con.execute(
            "SELECT * FROM credit_ledger ORDER BY created_at DESC LIMIT 200"
        ).fetchall()
    return {"ledger": [dict(r) for r in rows]}


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "yt-guru-license-server",
            "db": "postgres" if IS_POSTGRES else "sqlite-dev-only"}


# Master Dashboard (static) served last, like the tool serves its own
# frontend. On Vercel the dashboard/ files are bundled into the
# function via vercel.json includeFiles; as a fallback the same
# files are also served statically at /dashboard/ (see vercel.json).
if DASHBOARD_DIR.exists():
    app.mount("/admin", StaticFiles(directory=DASHBOARD_DIR, html=True),
              name="dashboard")
