"""Credits for the smaller tools (thumbnail, downloader, subtitles, searches…).

Same rules as the video tools: reserve before the work, give the credit back when it fails. A tool
costs nothing until the owner sets a price above 0 in the license server's dashboard; with charging
off nothing here does anything. (The video makers and the voice tools charge in their own routes.)
"""
from __future__ import annotations

import json
import re
import threading
import uuid

from starlette.concurrency import run_in_threadpool
from starlette.responses import JSONResponse

import licensing

# (method, path) -> the tool that is charged
STARTS = [(m, re.compile(p + r"/?$"), a) for m, p, a in (
    ("POST", r"/api/thumbnail", "thumbnail"),
    ("POST", r"/api/shorts/(?:upload|from-url)", "shorts"),
    ("POST", r"/api/downloader", "downloader"),
    ("POST", r"/api/trimmer", "trimmer"),
    ("POST", r"/api/subtitles(?:/burn)?", "subtitles"),
    ("POST", r"/api/audio", "audio"),
    ("POST", r"/api/titles", "titles"),
    ("POST", r"/api/script", "script"),
    ("POST", r"/api/seo", "seo"),
    ("GET", r"/api/keywords", "keywords"),
    ("POST", r"/api/inspector(?:/top)?", "inspector"),
    ("POST", r"/api/research/(?:keywords|trending|outliers|niches|names|advice)", "research"),
    ("GET", r"/api/music/search", "music"),
    ("GET", r"/api/stock/search", "stock"),
    ("POST", r"/api/channel/(?:generate|branding)", "channel_setup"),
    ("GET", r"/api/channel/inspect", "channel_inspect"),
    ("POST", r"/api/characters", "characters"),
)]
# where a background job tells how it ended
STATUS = re.compile(r"/api/(?:shorts|downloader|trimmer|subtitles(?:/burn)?|audio)/([A-Za-z0-9_-]+)/?$")
_waiting: dict[str, tuple[str, str]] = {}  # job id -> (token, tool)
_lock = threading.Lock()


def _action(method: str, path: str) -> str:
    return next((a for m, p, a in STARTS if m == method and p.match(path)), "")


def _reserve(action: str) -> str:
    """The reserved token, or "" when this tool costs nothing right now."""
    if not licensing.charging_enabled() or licensing.price_of(action) <= 0:
        return ""
    return licensing.consume(action, uuid.uuid4().hex[:12], VERSION)


def _close(token: str, action: str, ok: bool) -> None:
    if ok:
        licensing.report(token, "completed", tool=action)
    else:
        licensing.refund(token)
    licensing.report_usage(tool=action, status="completed" if ok else "failed")


VERSION = "1.0.8"


class CreditGate:
    def __init__(self, app, error_of):
        self.app, self.error_of = app, error_of

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        method, path = scope["method"], scope["path"]
        action = _action(method, path)
        job = STATUS.match(path) if method == "GET" and not action and _waiting else None
        if job and job.group(1) not in _waiting:
            job = None
        if not action and not job:
            return await self.app(scope, receive, send)
        token = ""
        if action:
            try:
                token = await run_in_threadpool(_reserve, action)
            except licensing.LicenseError as exc:
                problem = self.error_of(exc)
                return await JSONResponse({"detail": problem.detail}, status_code=problem.status_code)(scope, receive, send)
            if not token:
                return await self.app(scope, receive, send)
        seen = {"status": 500, "body": b""}

        async def watch(message):
            if message["type"] == "http.response.start":
                seen["status"] = message["status"]
            elif message["type"] == "http.response.body" and len(seen["body"]) < 200_000:
                seen["body"] += message.get("body", b"")
            await send(message)

        try:
            await self.app(scope, receive, watch)
        except BaseException:
            if token:
                await run_in_threadpool(_close, token, action, False)
            raise
        try:
            data = json.loads(seen["body"])
        except (ValueError, UnicodeDecodeError):
            data = {}
        data = data if isinstance(data, dict) else {}
        if token:
            started = data.get("job_id") or data.get("burn_id")
            if seen["status"] >= 400:
                await run_in_threadpool(_close, token, action, False)
            elif started:
                with _lock:
                    _waiting[str(started)] = (token, action)
            else:
                await run_in_threadpool(_close, token, action, True)
        elif job:
            state = str(data.get("status") or "").lower()
            if state in ("done", "completed", "finished", "ready", "failed", "error"):
                with _lock:
                    held = _waiting.pop(job.group(1), None)
                if held:
                    await run_in_threadpool(_close, held[0], held[1], state not in ("failed", "error"))
