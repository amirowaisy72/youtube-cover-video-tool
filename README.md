# Copyright free video generator

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
   The file is saved to `jobs/<job-id>/source.mp4`. A progress bar
   shows % downloaded, MB downloaded/total, speed, and time left.
   Downloads are capped at 720p (the video only shows in a small
   green area, so 1080p/4K only wasted time) with 8 parallel fragments.
2. Upload a cover image (PNG/JPG/WebP) that has a green-screen area.
   It uploads automatically when you pick the file, and you can pick
   any already-uploaded cover from its thumbnail grid.
3. **Green area is auto-detected** from the cover itself (largest
   green area, via Pillow) — the video fills exactly that area, not a
   guessed 0,0 rectangle. If no green area is found, the manual
   rectangle from the **Admin settings tab** is used instead.
   The Admin tab is separate from the Tool tab, with a plain-language
   explanation under every setting.
4. Watch the **Live preview** below Edit: it updates in realtime as
   you download, pick a cover, flip, change speed, or zoom.
   Set Flip (left/right only), Speed (0.5x–2x), **Zoom (1.0x–2.0x)**,
   Voice change + pitch, and Compress on/off, then press
   **Process video**. Zoom scales inside the green area and crops
   back to it, so a zoomed video can never spill outside the green area.
   In the Live preview you can also control the video directly:
   click it to select it (corner handles appear), drag it to move it
   up/down/left/right after zooming, and drag a corner to zoom.
   Drag position (pan) is sent to the final encode as a crop offset,
   still clamped inside the green area. Hide/Show lets you check the
   cover alone against the video. All tool UI text is in English.
   A progress bar in the Edit section itself shows % processed,
   stage (final/preview encode), elapsed time, and estimated time left.
   Click the progress bar (or "Show processing details") for an
   installer-style live log: input files and sizes, green area used,
   settings, FFmpeg milestones, and output files. The bar now moves
   in realtime — FFmpeg progress is read char-by-char (its lines use
   carriage return, not newline) and lines without a timestamp no
   longer crash it, which was why it used to stick at 2%.
   Covers can be deleted: click × on any cover thumbnail, or
   "Delete selected cover" under the selected cover.
   Encoding uses HEVC (libx265, preset fast, CRF 22) + 96k audio,
   output up to 1920px wide: HEVC is how size goes down without
   quality going down — H.264 CRF 26 shrank but dulled, H.264
   CRF 20 kept quality but grew, while HEVC CRF 22 looks like
   H.264 CRF 20 at roughly 25-40% smaller size. If libx265 is
   missing, it falls back to H.264 CRF 20 for quality. Preview
   uses a 720px / CRF 20 H.264 encode, so the preview you judge
   by looks like the final (the old 480px / CRF 32 preview itself
   looked dull) and plays in any browser.
   Green shape, not just rectangle: the video is clipped to the
   green area's actual shape (mask built from the cover's green
   pixels, FFmpeg `alphamerge` for the final, CSS `mask-image` for
   the live preview), so a circle, rounded screen or irregular
   green area never gets a rectangular video spilling onto the
   rest of the cover. Masked encodes use `-t` = source duration,
   because a looped mask input otherwise makes alphamerge run
   forever (a 3s source became a 472s file in testing).
   **Auto mode:** press "Start Auto", give only a YouTube link,
   and the page blurs behind a popup with one overall progress
   bar and a timeline (download -> apply Admin defaults ->
   compress -> preview). At the end the popup shows a short
   summary: downloaded size, size after cover/voice/speed/shape,
   and size after compression, plus a Download button and a
   Close button to see the result and edit further.
   Zoom: 1.0x means the video fills the green area exactly
   (cover, no black area) — restored at the user's request after
   the fit change, because fit created black bars and zooming
   then zoomed only the black bars. Trade-off: a mismatched
   aspect video is cropped on the sides at 1.0x (a 16:9 video in
   a 1.3:1 green box loses ~26% of its width). Only a real zoom
   above 1.0x crops further.
   Buttons: one solid style for all buttons (primary solid blue,
   secondary solid dark navy), no garish gradients, no truncation.
   Buttons now use standard Tailwind button classes (px-6 py-3 /
   px-4 py-2.5, rounded-xl) with proper padding.
   Live preview has no control bar, so it looks like video inside
   the cover, not a separate player rectangle; the live mask is
   RGBA, because a grayscale mask was ignored by browsers.
   Manual mode is step by step: only one manual step is visible
   at a time (Download, Cover, Edit & live preview, Preview &
   download, Upload), with Next/Back buttons and a Step 1 of 5
   indicator — the whole long form is never shown at once.
   UI writing is kept short, only where necessary.
   Flip is on by default (manual, Auto, and the API default).
   Auto popup: the Download button only appears when the job is
   done (a button display rule used to beat the hidden attribute
   and show it early); `[hidden]` is now forced in CSS and the
   button is re-hidden on every poll until done.
   Cover fill, like before: the fit + black-pad change was
   reverted, because fit created black bars and zooming zoomed
   only those bars. The video now covers the green box exactly
   (live object-fit: cover, final scale=increase + crop), so
   there is no black area and no green leftover — the video
   itself fills the box, in both manual and Auto mode.
   Original metadata: when a video downloads, its original
   title, description and tags are fetched via yt-dlp (no extra
   download), stored in the job, shown under the download step,
   and prefilled into the YouTube upload form (title, description
   and a new tags field, comma separated) — edit them or leave
   them as-is before uploading.
   Generated metadata, free and copyright-safe: after the final
   video is ready, POST /api/generate-metadata builds a NEW title,
   description and tags from the original keywords — locally in
   backend/metadata.py, with NO AI API, no key, no credits and
   no limits, offline and unlimited. The original description is
   never copied, the new title is never identical, only single
   keywords are carried over, and the new description is written
   from scratch. The generated version is shown with the final
   video and prefilled into the Upload step, with Regenerate,
   "Use these for upload" and "Use original instead" buttons —
   the user double-checks and edits it before anything is
   published on YouTube.
   Admin Flip default: Admin settings now has "Flip video by
   default" (default_flip, default on). It controls manual jobs,
   Auto mode and the Process API when flip is not sent — the
   manual Flip button still toggles it per video.
   Auto "Go to Final video": when Auto finishes, the popup shows
   a "Go to Final video" button next to Download and Close. It
   closes the popup, jumps to manual Step 4 (Preview & download)
   and scrolls directly to the preview player.
   Fit modes (Live preview + Admin, both modes): Live preview has
   two mutually exclusive checkboxes — "Fit to green screen"
   (default, cover: video fills the green box exactly, no black
   area, sides cropped if aspects mismatch) and "Display full
   width / height video" (contain: whole video, no crop, leftover
   box area filled with black, never green). Live preview uses
   object-fit cover/contain exactly matching the final FFmpeg
   scale=increase+crop / scale=decrease+black-pad, so live and
   final are identical — verified with a real FFmpeg test
   (cover: box top/bottom red; full: box top/bottom black,
   centre red, cover corner blue, no green in either).
   Separate Admin defaults: Admin has "Auto mode defaults"
   (speed, voice, pitch, flip, fit) and "Manual mode defaults"
   (same controls, separate values). Auto uses Auto defaults,
   Manual Edit starts with Manual defaults. Encoder, CRF, preset,
   green rectangle and auto-detect are shared.
   YouTube channels in Admin: Admin has a "YouTube channels"
   section with step-by-step instructions (Google Cloud Console
   → YouTube Data API v3 → OAuth Desktop app → Client ID/Secret
   → Save → pip install → python scripts/youtube_connect.py →
   restart). Client ID/Secret are saved locally to
   client_secrets.json (gitignored, never pushed). Channels can
   also be added by name + Channel ID (YouTube Studio → Settings
   → Channel → Advanced settings) and will show in the Upload
   step even before Google sign-in; upload itself still needs
   the sign-in token, because YouTube uploads to the signed-in
   account's channel.
   Processing lock: when Process video is clicked, the whole page
   blurs and nothing else is clickable — only a Processing card
   shows, with the same progress bar, text and log. The lock
   closes automatically on Done or on failure, and also applies
   if the page is refreshed while a process is still running.
   This stops the user changing speed, flip, zoom, cover or any
   other setting mid-process and getting an unexpected final
   video. A second Process video button sits below the Live
   preview video, doing exactly the same action as the main one,
   so processing can start right after checking the preview.
   Editable metadata in Step 4: the generated title, tags and
   description are editable text fields, not read-only text.
   Editing them is optional — typing there updates the Upload
   form live, and "Use these for upload" sends the edited
   version, not the original generated one. Regenerate overwrites
   them with a new generated version; "Use original instead"
   fills both Step 4 and the Upload form with the original.

### Refresh safety and local storage (no disk waste)

- **Refresh-safe:** the current job, cover, flip, speed, voice, zoom
  and pan are saved to the browser's localStorage on every change.
  Refreshing the page restores them and restarts any downloading or
  processing polling — progress is not lost and work does not restart.
- **No permanent local library:** `jobs/<id>/` is a temporary working
  folder only. After you download the final video, its source and
  preview are deleted from this computer (your downloaded copy is in
  Downloads, and the final video stays here for YouTube upload).
  After a successful YouTube upload, all local files for that job are
  deleted. On server start, any job folder older than 24 hours is
  deleted. You can also delete a job's local files anytime with
  "Delete local working files for this job", or clear the current job
  with "Start over". Covers you upload are kept (they are small images
  you choose to reuse); delete any cover with its × button.
   The **Timeline** section shows how long each step actually took
   (download, final encode, preview encode) with file sizes.
   Output: `jobs/<job-id>/final.mp4` and a 720px
   `jobs/<job-id>/preview.mp4`. Encoding uses `medium` preset,
   CRF 20, and caps the cover at 1920px wide for quality.
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
