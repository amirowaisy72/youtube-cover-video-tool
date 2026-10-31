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
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


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
    elif not library_ok:
        message = (
            "Google API client library is not installed. Run: "
            "pip install google-api-python-client google-auth-oauthlib"
        )
    elif not secrets_ok:
        message = (
            "client_secrets.json not found. Follow README.md "
            "'YouTube API setup' to create it in the project root."
        )
    else:
        message = (
            "OAuth token not found. Run the first-time sign-in flow "
            "described in README.md to create tokens/youtube_token.json."
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
    privacy_status: str = "private",
) -> dict:
    """Upload a video file. Raises RuntimeError if not configured.

    The first-time OAuth flow (browser sign-in, token saved to the
    token file) is a manual step for the user, documented in README.md;
    this helper deliberately does not embed any credential or try to
    guess one. Returns the YouTube video id on success.
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
    body = {
        "snippet": {
            "title": title or Path(video_path).stem,
            "description": description or "",
            "categoryId": "22",
        },
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
