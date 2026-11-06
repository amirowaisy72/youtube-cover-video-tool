"""YouTube Data API v3 upload helper — skeleton, no hardcoded secrets.

Credentials come only from files / environment variables that the user
creates themselves (see README.md, "YouTube API setup"):
  * YOUTUBE_CLIENT_SECRETS — path to client_secrets.json (default:
    ./client_secrets.json in the project root)
  * YOUTUBE_TOKEN_FILE — path to the stored OAuth token
    (default: ./tokens/youtube_token.json)

If either is missing, or the Google client library is not installed,
upload functions raise a clear RuntimeError explaining the setup
instead of inventing credentials. No API key, token, or secret is
stored in this file or in the code.
"""

from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from video import no_window_kwargs

BASE_DIR = Path(__file__).resolve().parent.parent

# youtube.upload alone is NOT enough for channels().list():
# that call needs youtube.readonly (or youtube / force-ssl).
# Without it the auto channel list fails with a 403, which is
# why connected users saw no Google channels (user, 2026-11-02).
# NOTE: an old token granted before this change only has the
# upload scope — refreshing it does not add the new scope, so
# those users must Disconnect and Connect again once.
YOUTUBE_SCOPE = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
]

# One-click connect state (user, 2026-11-01): a normal user only
# clicks buttons — no terminal, no pip, no script, no restart.
# The OAuth flow runs in a background thread: the tool picks a free
# localhost port, opens Google sign-in in the user's browser, Google
# redirects back to that localhost port with a code, and the tool
# exchanges it for a token and saves it. All local, nothing pushed.
_connect_state = {
    "in_progress": False,
    "error": "",
    "auth_url": "",
    "started_at": 0.0,
}


def client_secrets_path() -> Path:
    return Path(os.environ.get("YOUTUBE_CLIENT_SECRETS", BASE_DIR / "client_secrets.json"))


def token_path() -> Path:
    return Path(os.environ.get("YOUTUBE_TOKEN_FILE", BASE_DIR / "tokens" / "youtube_token.json"))


# Multi-channel upload (user, 2026-11-02): the end goal is that
# the user can upload to ANY channel they want, just by picking
# it when uploading. YouTube only uploads to the channel a token
# was signed in as, and the old code kept ONE token and a manual
# channel list that never actually changed the upload destination
# — that is why the manual list was confusing and misleading.
# Now every connected channel keeps its OWN token file, plus a
# small registry (channel id + title only, no secrets) in the
# tokens folder (gitignored, never pushed). Upload picks the
# token of the channel the user chose, and never silently falls
# back to a different channel when a choice was made.
def _sanitize_channel_id(channel_id: str) -> str:
    return "".join(c for c in channel_id if c.isalnum() or c in ("-", "_")) or "channel"


def token_path_for_channel(channel_id: str) -> Path:
    return BASE_DIR / "tokens" / f"youtube_token_{_sanitize_channel_id(channel_id)}.json"


def accounts_path() -> Path:
    return BASE_DIR / "tokens" / "youtube_accounts.json"


def _load_accounts() -> list[dict]:
    try:
        data = json.loads(accounts_path().read_text(encoding="utf-8"))
        if isinstance(data, list):
            return [a for a in data if isinstance(a, dict) and a.get("id")]
    except Exception:
        pass
    return []


def _save_accounts(accounts: list[dict]) -> None:
    path = accounts_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(accounts, indent=2), encoding="utf-8")


def _register_account(channel_id: str, title: str, token_file: Path) -> None:
    accounts = [a for a in _load_accounts() if a.get("id") != channel_id]
    accounts.append({"id": channel_id, "title": title or channel_id,
                     "token_file": str(token_file)})
    _save_accounts(accounts)


def list_connected_channels() -> list[dict]:
    """Channels with a real saved token — the only true upload destinations."""
    out = []
    for acc in _load_accounts():
        token_file = Path(acc.get("token_file") or token_path_for_channel(acc["id"]))
        if token_file.exists():
            out.append({"id": acc["id"], "title": acc.get("title") or acc["id"]})
    return out


def _register_token_channel(token_file: Path) -> dict | None:
    """Ask YouTube which channel a token belongs to, and register it.

    Returns the channel dict, or None if the API call fails (e.g.
    an old token without the readonly scope). A failure here never
    breaks the token itself — upload with that token still works.
    """
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials

        creds = Credentials.from_authorized_user_file(str(token_file))
        youtube = build("youtube", "v3", credentials=creds)
        response = youtube.channels().list(part="snippet", mine=True).execute()
        items = response.get("items") or []
        if not items:
            return None
        item = items[0]
        channel = {"id": item.get("id", ""),
                   "title": item.get("snippet", {}).get("title", "")}
        if channel["id"]:
            per_channel = token_path_for_channel(channel["id"])
            if per_channel.resolve() != token_file.resolve():
                per_channel.parent.mkdir(parents=True, exist_ok=True)
                per_channel.write_text(token_file.read_text(encoding="utf-8"),
                                       encoding="utf-8")
            _register_account(channel["id"], channel["title"], per_channel)
            return channel
    except Exception:
        return None
    return None


def youtube_status() -> dict:
    """Report whether upload is configured, without exposing secrets."""
    secrets_ok = client_secrets_path().exists()
    token_ok = token_path().exists() or bool(list_connected_channels())
    try:
        import googleapiclient  # noqa: F401  (optional dependency)
        library_ok = True
    except ImportError:
        library_ok = False
    connected = secrets_ok and token_ok and library_ok
    if connected:
        message = "YouTube upload is configured."
    elif not secrets_ok:
        message = (
            "Not connected yet. Paste your Client ID and Client Secret "
            "below, save them, then press Connect YouTube account."
        )
    else:
        # No terminal steps any more (user, 2026-11-01): the Connect
        # button installs the libraries and runs the sign-in itself.
        message = (
            "Google sign-in is not connected yet. Press "
            "Connect YouTube account below and sign in with Google."
        )
    return {
        "connected": connected,
        "client_secrets_present": secrets_ok,
        "token_present": token_ok,
        "library_present": library_ok,
        "message": message,
        "channels": [],
    }


# Upload progress (user, 2026-11-02): Step 5 used to show only
# "Uploading…" with no idea how far it had got. The resumable
# upload now reports each chunk, and the frontend polls this
# store while the upload request is still running, so a real
# progress bar + MB counts show. In-memory only (local tool,
# one user, one server process) — never pushed, no secrets.
UPLOAD_PROGRESS: dict[str, dict] = {}


def _set_upload_progress(job_id: str, percent: float, uploaded: int,
                         total: int, status: str) -> None:
    if not job_id:
        return
    UPLOAD_PROGRESS[job_id] = {
        "percent": round(float(percent), 1),
        "uploaded_bytes": int(uploaded),
        "total_bytes": int(total),
        "status": status,
    }


def get_upload_progress(job_id: str) -> dict:
    entry = UPLOAD_PROGRESS.get(job_id or "")
    if not entry:
        return {"percent": 0, "uploaded_bytes": 0, "total_bytes": 0,
                "status": "unknown"}
    return dict(entry)


def upload_video(
    video_path: str | Path,
    title: str,
    description: str = "",
    tags: str = "",
    privacy_status: str = "private",
    channel_id: str = "",
    on_progress=None,
) -> dict:
    """Upload a video file. Raises RuntimeError if not configured.

    The first-time OAuth flow is the one-click Connect button in
    Admin (browser sign-in, token saved to the token file by the
    tool itself); this helper deliberately does not embed any
    credential or try to guess one. Returns the YouTube video id
    on success.

    channel_id (user, 2026-11-02): when the user picked a channel
    at upload time, ONLY that channel's token is used. If that
    channel was never connected, this raises instead of silently
    uploading to a different channel — a wrong-channel upload is
    worse than a clear error. With no channel_id, the default
    (last connected) token is used, as before.
    """
    status = youtube_status()
    if not status["connected"]:
        raise RuntimeError(status["message"])
    if channel_id:
        chosen = token_path_for_channel(channel_id)
        if not chosen.exists():
            raise RuntimeError(
                "That channel is not connected yet. Connect it in "
                "Admin → YouTube channels first, then upload again."
            )
        token_file = chosen
    else:
        token_file = token_path()

    # Imports are deferred so the rest of the app runs without them.
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2.credentials import Credentials

    creds = Credentials.from_authorized_user_file(str(token_file))
    youtube = build("youtube", "v3", credentials=creds)
    snippet = {
        "title": title or Path(video_path).stem,
        "description": description or "",
        "categoryId": "22",
    }
    tag_list = [t.strip() for t in (tags or "").split(",") if t.strip()]
    if tag_list:
        snippet["tags"] = tag_list
    body = {
        "snippet": snippet,
        "status": {"privacyStatus": privacy_status or "private"},
    }
    # Resumable upload in 2 MB chunks (user, 2026-11-02): the old
    # single-chunk execute() gave no progress at all. next_chunk()
    # reports after every chunk, so the UI bar moves steadily
    # instead of jumping from 0% to done. A 15 MB final video
    # therefore shows ~8 steps, not one long silence.
    total_bytes = 0
    try:
        total_bytes = Path(video_path).stat().st_size
    except Exception:
        total_bytes = 0
    if on_progress:
        try:
            on_progress(0.0, 0, total_bytes)
        except Exception:
            pass
    media = MediaFileUpload(str(video_path), chunksize=2 * 1024 * 1024,
                            resumable=True)
    request = youtube.videos().insert(
        part="snippet,status", body=body, media_body=media
    )
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status is not None and on_progress:
            try:
                uploaded = int(status.resumable_progress or 0)
                pct = (uploaded / total_bytes * 100) if total_bytes else 0.0
                on_progress(pct, uploaded, total_bytes)
            except Exception:
                pass
    if on_progress:
        try:
            on_progress(100.0, total_bytes, total_bytes)
        except Exception:
            pass
    video_id = response.get("id", "")
    return {
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
    }


def list_channels() -> list[dict]:
    """Channels with a real token, plus the default token's channel if known.

    The registry is the fast, reliable source. If it is empty but
    an old single token exists (connected before multi-channel),
    try once to identify that token's channel and register it.
    """
    channels = list_connected_channels()
    if channels:
        return channels
    if token_path().exists():
        found = _register_token_channel(token_path())
        if found:
            return [found]
    return []


def _free_localhost_port() -> int:
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def ensure_google_libraries() -> None:
    """Install the Google client libraries if they are missing.

    Runs pip inside the tool itself, so the user never types a pip
    command. Raises RuntimeError with a plain-language message on
    failure (e.g. offline).
    """
    try:
        import googleapiclient  # noqa: F401
        import google_auth_oauthlib  # noqa: F401
        return
    except ImportError:
        pass
    proc = subprocess.run(
        [sys.executable, "-m", "pip", "install",
         "google-api-python-client", "google-auth-oauthlib"],
        capture_output=True, text=True, timeout=180,
        **no_window_kwargs(),
    )
    if proc.returncode != 0:
        raise RuntimeError(
            "Could not install the YouTube libraries automatically. "
            "Check your internet connection and press Connect again."
        )
    try:
        import googleapiclient  # noqa: F401
        import google_auth_oauthlib  # noqa: F401
    except ImportError:
        raise RuntimeError(
            "YouTube libraries were installed but still cannot be loaded. "
            "Restart the tool (close run.bat, open it again) and press Connect again."
        )


def _wait_for_code(flow, port: int) -> None:
    """Background thread: wait for Google's redirect with the code,
    then exchange it for a token and save it. Times out after 5 minutes.
    """
    from http.server import BaseHTTPRequestHandler, HTTPServer

    captured: dict = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            query = parse_qs(urlparse(self.path).query)
            if "code" in query:
                captured["code"] = query["code"][0]
                body = ("<h2>Connected!</h2><p>You can close this tab "
                        "and return to the tool. Your channels will "
                        "appear there automatically.</p>")
            else:
                captured["error"] = query.get("error", ["Sign-in cancelled"])[0]
                body = ("<h2>Sign-in was not completed.</h2><p>Close this "
                        "tab and press Connect YouTube account again.</p>")
            data = body.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *args):  # noqa: D102
            pass

    try:
        server = HTTPServer(("127.0.0.1", port), Handler)
        server.timeout = 300
        server.handle_request()
        server.server_close()
    except Exception as exc:
        _connect_state["error"] = f"Local sign-in server failed: {exc}"
        _connect_state["in_progress"] = False
        return
    if "code" not in captured:
        _raw_error = captured.get(
            "error", "Sign-in was not completed in time. Press Connect again.")
        # Friendly explanation (user, 2026-11-02): Google's
        # "Access blocked / Error 403: access_denied" for an app in
        # Testing mode means the signing-in Gmail is not listed as
        # a test user in Cloud Console → OAuth consent screen →
        # Test users. A bare "access_denied" tells a normal user
        # nothing, so translate it into the exact fix here.
        if _raw_error == "access_denied":
            _connect_state["error"] = (
                "Google blocked sign-in: this app is still in Testing "
                "mode, and this Gmail is not added as a test user. "
                "In Google Cloud Console (with the account that created "
                "the project) go to APIs & Services → OAuth consent "
                "screen → Test users → Add users, add this Gmail, "
                "save, then press Connect again and choose that same "
                "account (not a brand account) first."
            )
        else:
            _connect_state["error"] = _raw_error
        _connect_state["in_progress"] = False
        return
    try:
        flow.fetch_token(code=captured["code"])
        token = token_path()
        token.parent.mkdir(parents=True, exist_ok=True)
        token.write_text(flow.credentials.to_json(), encoding="utf-8")
        # Register this sign-in as its own channel (multi-channel,
        # user 2026-11-02): the default token becomes the last
        # connected channel, and a per-channel copy is kept so
        # picking this channel later uploads with this token.
        # If identification fails (old scope etc.), the token
        # still works for upload — the channel just stays
        # unlisted until the user reconnects with the new scope.
        found = _register_token_channel(token)
        _connect_state["channel"] = found or {}
        _connect_state["error"] = ""
    except Exception as exc:
        _connect_state["error"] = f"Could not finish Google sign-in: {exc}"
    _connect_state["in_progress"] = False


def start_connect() -> dict:
    """Start the one-click YouTube connect flow.

    Returns the Google sign-in URL for the frontend to open in a new
    tab. The background thread finishes the token exchange by itself
    — no script, no restart. If a connect is already running, the
    same URL is returned instead of starting a second flow.
    """
    # No already-connected block any more (multi-channel, user
    # 2026-11-02): connecting again is how the user adds ANOTHER
    # channel. The button now reads "Connect another channel"
    # when at least one channel is already connected.
    if _connect_state["in_progress"] and time.time() - _connect_state["started_at"] < 300:
        return {"auth_url": _connect_state["auth_url"], "already_connected": False,
                "message": "Sign-in is already in progress — use the tab that opened."}
    if not client_secrets_path().exists():
        raise RuntimeError(
            "Save your Client ID and Client Secret first, then press "
            "Connect YouTube account."
        )
    ensure_google_libraries()
    from google_auth_oauthlib.flow import Flow

    try:
        config = json.loads(client_secrets_path().read_text(encoding="utf-8"))
    except Exception:
        raise RuntimeError(
            "client_secrets.json could not be read. Save your Client ID "
            "and Client Secret again, then press Connect."
        )
    port = _free_localhost_port()
    redirect_uri = f"http://localhost:{port}"
    flow = Flow.from_client_config(
        config, scopes=YOUTUBE_SCOPE, redirect_uri=redirect_uri)
    auth_url, _state = flow.authorization_url(
        access_type="offline", prompt="consent")
    _connect_state["in_progress"] = True
    _connect_state["error"] = ""
    _connect_state["auth_url"] = auth_url
    _connect_state["started_at"] = time.time()
    thread = threading.Thread(
        target=_wait_for_code, args=(flow, port), daemon=True)
    thread.start()
    return {"auth_url": auth_url, "already_connected": False,
            "message": "Google sign-in opened. Sign in there, then return here."}


def connect_status() -> dict:
    """Current one-click connect state, for frontend polling."""
    return {
        "in_progress": _connect_state["in_progress"],
        "error": _connect_state["error"],
        "connected": youtube_status()["connected"],
    }


def disconnect() -> dict:
    """Remove ALL saved Google sign-in tokens (secrets are kept)."""
    _connect_state["in_progress"] = False
    _connect_state["error"] = ""
    _connect_state["auth_url"] = ""
    for token_file in [token_path()] + [
        Path(a.get("token_file") or token_path_for_channel(a["id"]))
        for a in _load_accounts()
    ]:
        try:
            if token_file.exists():
                token_file.unlink()
        except Exception:
            pass
    try:
        if accounts_path().exists():
            accounts_path().unlink()
    except Exception:
        pass
    return {"disconnected": True}


def disconnect_channel(channel_id: str) -> dict:
    """Remove one connected channel's token (secrets are kept)."""
    accounts = [a for a in _load_accounts() if a.get("id") != channel_id]
    _save_accounts(accounts)
    token_file = token_path_for_channel(channel_id)
    if token_file.exists():
        token_file.unlink()
    return {"disconnected": True, "channel_id": channel_id}
