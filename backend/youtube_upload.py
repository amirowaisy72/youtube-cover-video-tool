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

BASE_DIR = Path(__file__).resolve().parent.parent

YOUTUBE_SCOPE = ["https://www.googleapis.com/auth/youtube.upload"]

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


def youtube_status() -> dict:
    """Report whether upload is configured, without exposing secrets."""
    secrets_ok = client_secrets_path().exists()
    token_ok = token_path().exists()
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


def upload_video(
    video_path: str | Path,
    title: str,
    description: str = "",
    tags: str = "",
    privacy_status: str = "private",
) -> dict:
    """Upload a video file. Raises RuntimeError if not configured.

    The first-time OAuth flow is the one-click Connect button in
    Admin (browser sign-in, token saved to the token file by the
    tool itself); this helper deliberately does not embed any
    credential or try to guess one. Returns the YouTube video id
    on success.
    """
    status = youtube_status()
    if not status["connected"]:
        raise RuntimeError(status["message"])

    # Imports are deferred so the rest of the app runs without them.
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    from google.oauth2.credentials import Credentials

    creds = Credentials.from_authorized_user_file(str(token_path()))
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
    media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True)
    request = youtube.videos().insert(
        part="snippet,status", body=body, media_body=media
    )
    response = request.execute()
    video_id = response.get("id", "")
    return {
        "video_id": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
    }


def list_channels() -> list[dict]:
    """List channels the stored token can manage, or [] if unconfigured."""
    if not youtube_status()["connected"]:
        return []
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials

    creds = Credentials.from_authorized_user_file(str(token_path()))
    youtube = build("youtube", "v3", credentials=creds)
    response = youtube.channels().list(part="snippet", mine=True).execute()
    channels = []
    for item in response.get("items", []):
        channels.append({
            "id": item.get("id", ""),
            "title": item.get("snippet", {}).get("title", ""),
        })
    return channels


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
        _connect_state["error"] = captured.get(
            "error", "Sign-in was not completed in time. Press Connect again.")
        _connect_state["in_progress"] = False
        return
    try:
        flow.fetch_token(code=captured["code"])
        token = token_path()
        token.parent.mkdir(parents=True, exist_ok=True)
        token.write_text(flow.credentials.to_json(), encoding="utf-8")
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
    if youtube_status()["connected"]:
        return {"auth_url": "", "already_connected": True,
                "message": "YouTube is already connected."}
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
    """Remove the saved Google sign-in token (secrets are kept)."""
    _connect_state["in_progress"] = False
    _connect_state["error"] = ""
    _connect_state["auth_url"] = ""
    token = token_path()
    if token.exists():
        token.unlink()
    return {"disconnected": True}
