#!/bin/sh
# YouTube Cover Video Tool — Linux/Mac launcher.
# No command is needed from you after the first chmod:
#   chmod +x run.sh
# then double-click it (or run ./run.sh). It runs start.py, which
# checks FFmpeg/yt-dlp, installs Python packages if needed, starts
# the local server on localhost:8000, and opens it in your browser.
# Nothing is hosted live — the server runs only on this computer.
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
    python3 start.py
else
    python start.py
fi
