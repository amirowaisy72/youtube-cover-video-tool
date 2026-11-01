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
   no limits, offline and unlimited. Keywords are mined by score
   from title + original tags + original description (words and
   short phrases only — no original sentence is ever copied), the
   new title is built from the top keywords with 8 different
   formulas (never the original, never profanity, never a
   4-word chunk of the original), the description is structured
   like a real YouTube description (hook, "In this video" key
   points, why it matters, hashtags, original-words disclaimer),
   and tags are tiered for SEO (core phrases, long-tail phrases,
   related terms, broad terms, junk words filtered, 500-char
   limit respected). The generated version is shown with the
   final video and prefilled into the Upload step, with
   Regenerate, "Use these for upload" and "Use original
   instead" buttons — the user double-checks and edits it
   before anything is published on YouTube.
   Upload progress: when Upload to selected channel is clicked,
   Step 5 shows a progress bar with % and MB counts. The backend
   uploads in 2 MB resumable chunks (next_chunk) and the
   frontend polls GET /api/upload-progress/{job_id} every second
   while the upload request runs, so the bar moves steadily
   instead of a silent "Uploading…" wait.
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
   Manual zoom/drag fix (2026-11-02): in Full mode with black
   bars, live used to move the video by pan inside the bars
   while the final always centred it with pad and ignored pan
   for that dimension (up to ~130 px off), and live also let
   pan go further than the final could follow. Now the final
   pad carries pan (clamped to the bar), and live clamps pan
   per-dimension to the exact room in that dimension, so
   manual zoom/drag matches exactly. Verified with a real
   encode (Full 1.2x, pan 5.5%: pad 0:141 as calculated).
   Separate Admin defaults: Admin has "Auto mode defaults"
   (speed, voice, pitch, flip, fit) and "Manual mode defaults"
   (same controls, separate values). Auto uses Auto defaults,
   Manual Edit starts with Manual defaults. Encoder, CRF, preset,
   green rectangle and auto-detect are shared.
   YouTube channels in Admin: Admin has a "YouTube channels"
   section with button-only setup (Google Cloud Console
   → YouTube Data API v3 → OAuth Desktop app → Client ID/Secret
   → Save → Connect YouTube account, then sign in with Google).
   The tool installs the Google libraries itself, runs the
   sign-in in the background, and saves the token — no terminal,
   no pip command, no script, no restart. Client ID/Secret are
   saved locally to client_secrets.json (gitignored, never pushed).
   Channels can also be added by name + Channel ID (YouTube Studio
   → Settings → Channel → Advanced settings) and will show in
   the Upload step even before Google sign-in; upload itself
   still needs the sign-in token, because YouTube uploads to the
   signed-in account's channel.
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
   Admin tabs + Presets: Admin no longer shows Manual and Auto
   settings scattered together. Two buttons at the top — Manual
   and Auto — open only that mode's settings; shared settings
   (encoder, CRF, preset, green rectangle, auto-detect) stay
   below both. A Preset is a named snapshot of Manual + Auto +
   shared settings, saved locally in settings.json (gitignored,
   never pushed). Give it a name and press Save preset; Load
   preset applies it at once; to edit it, load it, change any
   setting, then Save preset again with the same name to
   overwrite it. Rename and Delete are also in the Presets box.
   Zoom fix (2026-11-01): in Full mode, corner-drag zoom used to
   zoom the black bars, not the video, because the bars were
   inside the zoom-sized video element (object-fit: contain).
   Now the live element is sized to the video's contain-fit size
   x zoom, with no bars inside it — bars are empty black box
   background outside it, so zooming grows the video, shrinks
   the bars, then removes them. Final FFmpeg uses the same
   scale -> crop-to-box-or-smaller -> pad-black-to-box, fixing
   the old crop that failed when only one dimension exceeded
   the box. Zoom range is now 0.5x–2.0x in live and final:
   below 1.0x the video shrinks inside the box with black
   around it, never green. Verified by real encode: Full 1.0
   bars black, Full 1.5 bars gone (top/bottom red), Full 0.7
   and Cover 0.5 smaller with black bars, no green anywhere.
   Simple mode picker (2026-11-01, held for push): Tool page
   used to show Auto, Group Auto and Manual all at once. Now
   one "Choose mode" dropdown shows only the chosen mode
   (Auto / Group Auto / Manual); the choice is remembered
   across refreshes, a restored manual job opens in Manual,
   and Auto's "Go to Final video" switches to Manual first.
   Group Auto links box is also full width now (textarea had
   no CSS rule, so it fell back to a narrow default box).
   Same full-width fix covers the Step 4 Description box,
   now with 6 rows instead of 4. Time is never seconds-only
   anywhere now — Timeline, Auto timeline, download ETA,
   process elapsed/ETA and the download detail read "1 minute
   13 seconds" style. Step 3 has only one Process video
   button, the one below Live preview (upper Edit button
   removed).
   Group Auto: in the Tool tab, "Group Auto — many videos, one
   task" takes one YouTube link per line, then Build list gives
   each video its own Preset dropdown (or Admin defaults) and its
   own upload choice: Do not upload — save locally, or Upload —
   Public / Private / Unlisted (unlisted = only people with the
   link can watch, not in search). Create group task & start
   then works through the videos one by one by itself: download,
   apply that video's preset, compress, preview, generate
   metadata, then either keep the final file locally for later
   download (skip), or upload it to YouTube with that privacy.
   A failed video does not stop the rest. Uploaded videos have
   their working files deleted; skipped or failed-upload videos
   keep their final file and a download link in the group list.
   Upload still needs Google sign-in (see YouTube channels in
   Admin); without it, upload items fail but stay downloadable.

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
No terminal work is needed — just clicks in Admin → YouTube channels,
where an Easy setup guide (5 steps, each with a button that opens
the exact Google page, plus tick boxes that remember your progress)
walks a normal user through it.

1. Open Google Cloud Console, create a project.
2. Open the YouTube Data API v3 page and press **Enable**.
3. Open Credentials, create OAuth 2.0 credentials (Desktop app),
   and copy the Client ID and Client Secret.
4. Open Audience (Test users) and add the Gmail you will sign in
   with — while the app is in Testing mode, Google blocks any
   Gmail not listed there ("Access blocked / Error 403"). On the
   "Google hasn't verified this app" warning that follows, press
   **Continue** (you are the developer of your own app), then
   allow the YouTube upload permission.
5. In the tool, Admin → YouTube channels: paste the Client ID and
   Client Secret, press **Save YouTube credentials**, then press
   **Connect YouTube account** and sign in with that same Gmail
   (not a brand account, first time). The tool installs the Google
   libraries itself (they are also in requirements.txt), runs the
   sign-in in the background, and saves the token to
   `tokens/youtube_token.json` on this computer only. No pip
   command, no script, no restart. The app reads the token from
   `YOUTUBE_TOKEN_FILE` if that environment variable is set,
   otherwise from `tokens/youtube_token.json`.
6. The Upload section will then show “connected” and list your
   connected channels. To upload to another channel, connect
   it the same way (Connect another channel, choose it in
   Google sign-in), then pick it in the Upload step — the
   video goes to the channel you picked. If anything is
   missing, it shows a clear message instead of failing
   silently, and `/api/upload-youtube` returns HTTP 400
   explaining the missing step.

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

## Batch 11 — simplicity, UI, Groups and Records (2026-11-01)

- Tool mode picker: one dropdown (Auto / Group Auto / Manual) shows
  only the chosen mode; the choice is remembered. A restored manual
  job opens in Manual mode.
- All textareas are full card width (Group links and Step 4
  Description), Step 4 Description is 6 rows tall.
- Only one Process button remains, below Live preview.
- Times are never seconds-only: "1 minute 13 seconds", not "73 seconds".
- Stale-final warning: if live settings change after processing,
  Live preview warns that the final preview is outdated until you
  process again.
- Regenerate metadata now changes tags too (title, description and
  tags all cycle by variant).
- No native browser confirm dialogs: all deletes use a themed modal.
- Start over returns to Step 1 and clears progress, metadata,
  upload fields and timeline (cover selection is kept for reuse).
- UI refresh: Inter font (Tailwind), deeper cards, segmented tabs,
  roomier inputs, button lift/press, framed live preview, and Group
  rows as a clean grid (URL truncated, dropdowns aligned).
- Group rows show the video title: "Video 1: <title>", fetched in
  the background from `POST /api/video-info`, falling back to URL.
- Group YouTube gating: upload choices appear only when YouTube is
  really ready (Client ID/Secret + token + library + a channel).
  Otherwise a clear OFF warning shows and only "save locally" is offered.
- Group running overlay: while a group runs, the background blurs
  and only the group activity shows; Close appears when it is done.
- Records (📁 Records button, only on click): paginated batch history
  (10 per page, newest first) with per-video saved title, description
  and tags, and how many videos are uploaded vs still saved locally.
  Locally saved videos are protected from the 24h job cleanup.
  Uploaded videos keep only the history entry + YouTube link — their
  local file is deleted at upload time, so they use no local space.
- Group lists show no download link: a done video is just saved
  locally. In Records, select locally saved videos (checkbox) and
  upload them straight from the Records upload step
  (`POST /api/records/upload`, privacy: Private / Unlisted / Public).
- Preset editing: choosing a preset shows its full details, Edit
  preset loads it into the form, Update preset saves changes back
  over it. Save preset no longer fails when the name box is empty
  but a preset is selected.
- Presets-only settings (2026-11-01): there is no "Save admin
  settings" button any more. Admin shows only preset names — click
  one to open its details, edit it, delete it, or set it as Active.
  The Active preset (or the first preset, if none is Active) is
  used for Auto, Manual and Group videos. The Tool tab shows a
  3-step How to use card and the current Active preset.
- Full-page workspace: the page is no longer a narrow centre
  column — it uses the full page width (up to 1440px), with preset
  and cover grids spreading out on wide screens.
- No mode by default: the mode dropdown starts on "Choose a
  mode" and no mode card is shown until you pick one (except a
  restored in-progress manual job, which still opens in Manual).
- Live video fix (2026-11-01): a downloaded video could be
  completely invisible in Live preview when the green rectangle
  did not match the cover (stale/default 0,0 640x360), because
  the mask over that rectangle is mostly black — with no message
  saying why. Fixed: green area is now always auto-detected on
  cover select, Live preview shows a clear status line (no video
  / no cover / video failed / default green area warning), a
  "Detect green area" button re-detects for the selected cover,
  "Show green area outline" draws an unmasked dashed outline
  around the green box so you can see where it is even when the
  video is hidden, and the live mask falls back to a white
  rectangle when the cropped mask is under 5% white, so the video
  shows as a rectangle instead of vanishing. To test: download a
  video, choose a cover, go to Step 3, tick the outline, press
  Detect green area — the video should appear inside the green area.
- One-click YouTube connect (2026-11-01): a normal user only
  clicks buttons — no terminal, no pip, no script, no restart.
  Admin → YouTube channels now has a Connect YouTube account
  button (plus Disconnect). The tool installs the Google
  libraries itself if needed, opens Google sign-in in a new tab,
  and saves the token in the background on a free localhost port.
  The old pip/script/restart steps are gone from the UI and README.
- Live vs final diagnosis + upload gating + clean logs
  (2026-11-02, held locally, not pushed yet): Step 4 now shows
  exactly which settings the final was processed with, plus the
  same stale-final warning as Step 3, and a note that the final
  player starts at 0:00 while Live preview loops — so a different
  frame of a moving video is not mistaken for a framing bug.
  Backend zoom clamp fixed to 0.5x–2.0x (it used to force 1.0x
  minimum, so a 0.7x live preview came out as 1.0x final). Step 5
  Upload is now disabled until Google sign-in is actually
  connected (a channel name alone does not enable upload), with
  a button that jumps to Admin → YouTube channels to connect.
  Logs are cleaner: /favicon.ico now answers 204 instead of 404,
  and the harmless Windows ConnectionResetError from a browser
  closing a video stream early is swallowed (206 Partial Content
  for video chunks is normal, not an error).
- Connect popup fix (2026-11-02, held locally, not pushed yet):
  Connect used to claim "Google sign-in opened in a new tab"
  when nothing opened, because window.open() ran after awaiting
  the API and the browser's popup blocker silently blocked it.
  Now the tab opens synchronously inside the click, its address
  is set when the sign-in URL arrives, and a clickable "Click
  here to sign in with Google" link is always shown as a fallback.
- Multi-channel upload (2026-11-02, held locally, not pushed yet):
  End goal (user, 2026-11-02): when uploading, the user can
  upload to ANY channel they want, easily. How it works now:
  connect each channel once in Admin → YouTube channels (the
  Connect button becomes "Connect another channel" after the
  first connect — no Disconnect needed to add one), each channel
  keeps its own token file plus a small registry in tokens/
  (gitignored), and the Upload step dropdown lists only those
  real connected channels. Picking one really uploads to it:
  the chosen channel's token is used, and picking a channel
  that was never connected fails with a clear error instead
  of silently uploading to a different channel. The old manual
  channel list is REMOVED (it never changed the upload
  destination — upload always went to the signed-in channel —
  so it only confused people), and the Upload dropdown, which
  used to be filled but never read, is now actually sent with
  every upload. Group/Records uploads still use the last
  connected (default) channel. NOTE: users connected before
  this change must Disconnect and Connect again once, so each
  channel gets its own token with the new scope.
- Channel auto-list fix (2026-11-02, held locally, not pushed yet):
  Connected users saw no Google channels in Admin because (1)
  the Admin list only showed manually added channels, (2) the
  OAuth scope was youtube.upload only, which does not allow
  channels().list (that needs youtube.readonly), and (3) a failed
  channel list was hidden from the Admin card. Now the scope
  includes youtube.readonly, Admin shows a separate "Channels
  from Google sign-in" list plus the failure reason in plain
  words, and the misleading "your channels appear automatically"
  text is corrected: only the signed-in channel auto-appears;
  other brand channels need manual add or sign-in as that
  channel. NOTE: users connected before this change must
  Disconnect and Connect again, because refreshing an old token
  does not add the new scope.
- Easy setup guide (2026-11-02, held locally, not pushed yet):
  Admin → YouTube channels now has a 5-step click-only guide
  instead of a long technical list: each of Steps 1–4 has a button
  that opens the exact Google page (Console, YouTube API Enable,
  Credentials, Audience/Test users), tick boxes remember progress
  on this computer, Step 5 ticks itself when connected, and a
  "Stuck? Quick fixes" box covers the 403 test-user block, the
  popup block, and the disabled-Upload case in one line each.
