"""First-time YouTube sign-in: creates tokens/youtube_token.json.

Run AFTER you have saved client_secrets.json (via Admin settings,
or by downloading it from Google Cloud Console into the project root)
and installed the libraries:
    pip install google-api-python-client google-auth-oauthlib

Then:
    python scripts/youtube_connect.py

A browser window will open for Google sign-in. Choose the Google
account that owns your YouTube channel, allow YouTube upload access,
and the token will be saved locally (tokens/ is gitignored).
Restart run.bat afterwards — the Upload section will then list
your channels.
"""
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

import youtube_upload  # noqa: E402


def main() -> None:
    secrets = youtube_upload.client_secrets_path()
    if not secrets.exists():
        print(f"client_secrets.json not found at {secrets}")
        print("Save it from Admin settings first, or download it from Google Cloud Console.")
        raise SystemExit(1)
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("Run first: pip install google-api-python-client google-auth-oauthlib")
        raise SystemExit(1)
    flow = InstalledAppFlow.from_client_secrets_file(
        str(secrets), ["https://www.googleapis.com/auth/youtube.upload"])
    creds = flow.run_local_server(port=0)
    token = youtube_upload.token_path()
    token.parent.mkdir(parents=True, exist_ok=True)
    token.write_text(creds.to_json(), encoding="utf-8")
    print(f"Saved token to {token}. Restart run.bat to use YouTube upload.")


if __name__ == "__main__":
    main()
