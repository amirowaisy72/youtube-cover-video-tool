@echo off
REM YouTube Cover Video Tool — Windows double-click launcher.
REM No command is needed from you: this runs start.py, which checks
REM FFmpeg/yt-dlp, installs Python packages if needed, builds the
REM new interface (frontend-react, needs Node.js or Bun) if its
REM sources changed, starts the local server on localhost:8000,
REM and opens it in your browser.
REM Nothing is hosted live — the server runs only on this computer.
cd /d "%~dp0"
python start.py
if errorlevel 1 (
    echo.
    echo The tool stopped with an error (see the message above).
    pause
)
