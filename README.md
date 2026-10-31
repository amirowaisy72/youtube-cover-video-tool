# YouTube Cover Video Tool

A totally free, local tool that takes a YouTube link, downloads the video,
places it into the green-screen area of a cover image, optionally flips it
left/right, changes its speed and voice slightly, compresses it to a smaller
size without a visible quality loss, lets you preview it, download it, and
upload it to a YouTube channel you choose.

Stack: **Python + FastAPI** backend, **plain HTML/JS/CSS** frontend served by
the backend (no Node build step), **FFmpeg** for all video work, **yt-dlp**
for downloads, **JSON files** for settings/jobs, **YouTube Data API v3** for
upload. Every dependency is free and open source.

## Legal note

Use only videos you own or have rights / licence for. Downloading and
re-uploading someone else's video — even with speed, voice, or cover changes
— can lead to a YouTube copyright claim or strike.

## Run it with one double-click (recommended — no server command)

**You do NOT have to run uvicorn, `python -m`, or any server command,
and you do NOT have to host anything live.**

1. Install the prerequisites below (Python 3.10+ and FFmpeg — one time).
2. **Windows: double-click `run.bat`.**
   **Linux/Mac: first run `chmod +x run.sh` once, then double-click
   `run.sh`** (or run `./run.sh`).
3. `start.py` then does everything automatically: it checks
   Python/FFmpeg/yt-dlp, installs `requirements.txt` if fastapi/uvicorn
   are missing (internet needed the first time only), starts the
   FastAPI server in the background on `localhost:8000`, and opens
   http://localhost:8000 in your default browser.

**The browser page that opens IS the program.** The local server runs
automatically in the background on your own computer only — nothing is
put on the internet, and no live hosting is involved. Keep the black
launcher window open while you use the tool; closing it (or pressing
Ctrl+C in it) stops the server. If something goes wrong, `run.bat`
pauses on error so you can read the message.

## Prerequisites

- Python 3.10+
- FFmpeg on your PATH (`ffmpeg -version` should work)
  - Windows: download from https://ffmpeg.org/download.html and add it to PATH
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
- yt-dlp, installed automatically by `start.py` on first run
  (or via pip below)

## Run it manually (alternative only — not needed if you double-click)

From the project root:

```bash
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

Then open http://127.0.0.1:8000 in your browser.

Check the server is healthy at http://127.0.0.1:8000/api/health
(it reports whether ffmpeg and yt-dlp were found).

## How to use it

1. Paste a YouTube link and press **Download video**.
   The file is saved to `jobs/<job-id>/source.mp4`.
2. Upload a cover image (PNG/JPG/WebP) that has a green-screen area,
   then choose it in the cover list.
3. In **Admin settings**, set the green rectangle (`x`, `y`, `w`, `h`) —
   that is the area of the cover where the video will be placed.
   Measure it once from your cover image (for example, in any image
   editor that shows pixel coordinates). The defaults are
   x=0, y=0, w=640, h=360.
4. Set Flip (left/right only), Speed (0.5x–2x), Voice change + pitch,
   and Compress on/off, then press **Process video**.
   Output: `jobs/<job-id>/final.mp4` and a low-res
   `jobs/<job-id>/preview.mp4`.
5. Watch the **Preview** player. If it looks right, press
   **Download final video**.
6. For YouTube upload, see below, then choose a channel and upload.

### What each edit does (FFmpeg)

- Flip: `hflip` only.
- Speed: video `setpts=PTS/speed`, audio `atempo=speed`.
- Voice: `asetrate` + `atempo` pitch shift (duration unchanged),
  controlled by the admin `voice_pitch_factor` (for example 1.05).
- Compression (HandBrake-style): `libx264` with admin `crf` and
  `preset`. CRF 20–23 is the recommended range: much smaller file,
  no visible quality loss. Turning Compress off uses CRF 18.

## YouTube API setup (upload only — optional)

Upload needs no paid service, but it does need a Google Cloud project
you create yourself. No credentials are included in this project.

1. Go to Google Cloud Console, create a project, and enable the
   **YouTube Data API v3**.
2. Create OAuth 2.0 credentials (Desktop app) and download
   `client_secrets.json` into the project root.
3. Install the optional upload libraries:
   ```bash
   pip install google-api-python-client google-auth-oauthlib
   ```
4. Run a first-time OAuth sign-in (any small script using
   `google_auth_oauthlib.flow.InstalledAppFlow` with the
   `https://www.googleapis.com/auth/youtube.upload` scope, or the
   Google API Python client quickstart) and save the token to
   `tokens/youtube_token.json`.
   The app reads it from `YOUTUBE_TOKEN_FILE` if that environment
   variable is set, otherwise from `tokens/youtube_token.json`.
5. Restart the server. The upload section will show “connected” and
   list your channels. If anything is missing, it shows a clear
   message instead of failing silently, and `/api/upload-youtube`
   returns HTTP 400 explaining the missing step.

Free quota note: the YouTube Data API free quota allows roughly
6 video uploads per day (each upload costs about 1,600 quota units
of the 10,000 daily units). More uploads need a quota-increase request.

## Project layout

```
start.py                  Single-click launcher (checks, installs, serves, opens browser)
run.bat                   Windows double-click launcher (runs start.py, pauses on error)
run.sh                    Linux/Mac launcher (chmod +x run.sh once, then double-click)
backend/main.py           FastAPI app: API + frontend serving
backend/video.py          FFmpeg command builders / processing
backend/youtube_upload.py YouTube upload helper (env/token files only)
frontend/index.html       Single-page UI
frontend/app.js           Plain JS, no build step
frontend/style.css        Styles
jobs/                     Per-job downloads/outputs (git-ignored)
covers/                   Uploaded cover images
requirements.txt          fastapi, uvicorn, yt-dlp, python-multipart
```

## Troubleshooting

- “ffmpeg was not found”: install FFmpeg and restart the terminal/server.
- “yt-dlp was not found”: run `pip install yt-dlp` and retry.
- “Cover not found”: upload a cover first, then refresh the cover list.
- YouTube upload returns 400: read its message — it names the exact
  missing file or library from the setup steps above.
- Green area wrong: adjust the admin green rectangle and re-process;
  no re-download is needed.
