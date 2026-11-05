# YT Guru — Commercial Packaging: Design (Phase 1)

Status: **DESIGN + SCAFFOLD ONLY** (2026-11-05). Phase 2 (2026-11-06)
adapted the license server for Vercel + set default credit values —
see §9. Nothing here is pushed, deployed, or a finished build. All
code under `ytguru-commercial/` is draft scaffold with `TODO`
markers. The real app is untouched in
`~/workspace/youtube-cover-video-tool` (repo `amirowaisy72/youtube-cover-video-tool`).

## 0. What Master decided (2026-11-05, confirmed)

- Distribution: **Windows `.exe` installer** (Vercel deploy declined,
  Render video backend declined, APK impossible — Python + FFmpeg do not
  run as an Android APK).
- Installer: opens as a setup wizard on the customer's Windows PC,
  auto-installs everything the tool needs, lets the customer pick the
  install folder, installs the project there, and includes a file named
  **Run-Setup** that opens the tool when clicked.
- **Master Admin Dashboard** (only Master controls): total customers +
  each customer's history (what videos they made, which topics).
- **Credit system**: ALL values are set by Master in the dashboard
  (credits per video, price per credit, trial credits, packs) and apply
  everywhere. No credit value is hardcoded in the customer tool.
- **Anti-crack is a HARD requirement**: customers must not be able to
  bypass/crack the credit check and use the tool free.
- Credit checks need a small online server (credits/history only —
  video processing stays on the customer's own PC).

## 0.1 Phase 2 decisions (2026-11-06, confirmed)

- **Hosting: Vercel for the license/credit server** (the video
  backend itself can never run on Vercel — FFmpeg + minutes-long
  jobs vs the 10 s serverless timeout — only this lightweight
  license server moves to Vercel). Master Dashboard is served by
  the same Vercel project (same origin, no CORS).
- **Default credit values** (set in the server now; Master changes
  them himself later in the dashboard, no reinstall):
  1 credit per cover video, 1 credit per Text-to-Voice job,
  1 credit per auto-video, 3 free trial credits per new customer,
  price per credit **PKR 50**, packs **10/PKR 500, 30/PKR 1,200,
  100/PKR 3,000**.
- **Credit purchase is manual**: to buy credits the customer
  contacts Master on WhatsApp **03100668952**, pays
  (JazzCash/bank/etc.), Master tops up credits in the dashboard.
  No payment gateway.
- Database: **Supabase free Postgres** (see §4.4). Do NOT create
  any account yet — setup steps are in §4.4, deployment itself is
  still blocked on the Vercel connection + the Supabase project.

## 1. What the app actually is (verified in code, not from memory)

- Stack: Python FastAPI backend + plain HTML/JS/CSS frontend served **by
  the backend itself** (`app.mount("/", StaticFiles(...))` at the end of
  `backend/main.py`). The frontend calls relative `/api/...` URLs, so
  there is no separate frontend deployment — it is one app.
- Entry: `start.py` checks Python 3.10+, FFmpeg on PATH, installs
  `requirements.txt` if needed, starts uvicorn on `127.0.0.1:8000`,
  opens the browser. `run.bat` just runs `start.py`.
- Requirements: fastapi, uvicorn, yt-dlp, python-multipart, Pillow,
  google-api-python-client, google-auth-oauthlib, edge-tts, gtts.
- Heavy work is all local subprocesses: FFmpeg encode/compress/preview,
  yt-dlp download (up to 720p, retry ladder), background threads,
  local JSON files (`jobs/<id>/job.json`, `groups/*.json`,
  `records.json`, `backend/settings.json`), per-channel YouTube OAuth
  tokens in `tokens/` (gitignored).
- YouTube Connect (`POST /api/youtube/connect-start`) runs a Google
  OAuth flow whose redirect goes to **localhost** — this still works
  in an installed `.exe` because the local server is still on
  localhost:8000. See §6 for the commercial problem with this.
- Three tools (home chooser in `frontend/index.html`):
  1. Copyright Free Video Generator (cover video from a YouTube link)
  2. Text to Voice (edge-tts + gTTS fallback, max 10,000 chars)
  3. Auto Video from Title (scene pipeline: script → voiceover →
     Commons visuals / AI images → FFmpeg assemble)

## 2. Credit-consuming actions (verified endpoint inventory)

Every endpoint below is in `backend/main.py` (line numbers from the
2026-11-05 read). A credit is consumed **per finished video** (or per
TTS generation), never for browsing, previewing, or downloading an
already-made file.

| # | Endpoint | Tool | Credit event | Notes |
|---|----------|------|--------------|-------|
| 1 | `POST /api/auto` (L788) → `_run_auto` | 1 | 1 video (cost = `credits_per_cover_video`) | Download + FFmpeg apply + compress + preview, background thread |
| 2 | `POST /api/process` (L1461) → `_run_process` | 1 | 1 video (cost = `credits_per_cover_video`) | Manual encode of an already-downloaded source |
| 3 | `POST /api/groups` (L1026) → `_run_group` | 1 | **N videos** — 1 per item | Group runs `_run_auto` per item, sequentially. Retry (`POST /api/groups/{id}/retry`, L1048) only re-runs **failed** items — completed items must NOT be charged again |
| 4 | `POST /api/tts` (L1755) | 2 | 1 generation (cost = `credits_per_tts`) | edge-tts chunked + FFmpeg merge; max 10,000 chars. Cheaper than video — Master may price it lower (e.g. 1 credit per generation, or per 5,000 chars — his call) |
| 5 | `POST /api/autovideo` (L1968) → `_run_autovideo` | 3 | 1 video (cost = `credits_per_autovideo`) | Script + TTS + visuals + FFmpeg assemble, background thread |

**NOT charged:** cover upload/list/delete, settings read/write,
`/api/video-info`, `/api/generate-metadata` (local, no AI API),
preview/source/download of finished files, job/group/record reads,
YouTube upload (`POST /api/upload-youtube`, `/api/records/upload`) —
the video was already charged when it was generated; upload uses the
customer's own YouTube channel. Green detection/mask endpoints.

**Charge timing (design decision, see §4):** reserve-then-commit.
At job start the client asks the license server to **reserve** the
cost; the server atomically decrements the balance and returns a
single-use job token. The client starts FFmpeg only with a valid
token. On success the client reports history (token closed as
`completed`). On failure the client calls refund with the same token
(server refunds exactly once — idempotent). This way a failed video
never costs the customer a credit, and a customer cannot start a
job without the server's say-so.

**History reporting (what the dashboard shows):** the client already
records everything locally — `job.json` has `url`, `original_title`,
`original_description`, `original_tags`, `auto_summary`; group files
have per-item URL + status; autovideo jobs have `title`, `minutes`,
`voice`. On completion the client POSTs to the license server:
`{tool, title/topic, minutes, chars (TTS), status, started_at,
finished_at, job_token}`. Topic = the video title (Tool 3) or the
source video's original title (Tool 1).

## 3. The Windows .exe installer

### 3.1 The one hard constraint

**PyInstaller on Linux CANNOT build a Windows `.exe`.** The build
must run on Windows. The realistic free route is a **GitHub Actions
`windows-latest` runner** (free for public repos; private repos get
2,000 free Actions minutes/month, Windows runners consume 2× minutes
— a ~10 min build costs ~20 min). The workflow builds the installer
and uploads it as a build artifact / GitHub Release asset. No paid
tool is needed at any step.

### 3.2 Why PyInstaller (not "install Python on the customer PC")

PyInstaller bundles a Python interpreter + all pip packages into the
app folder, so the customer needs **no Python, no pip, no terminal**.
The installer only copies files and creates shortcuts. This is the
only approach that matches "double-click Run-Setup and the tool
opens" for a non-technical customer. (The alternative — shipping
embeddable Python + running pip at install time — is slower, needs
internet at install, and fails more often.)

### 3.3 Build pipeline (draft: `.github/workflows/build-windows-installer.yml`)

1. `windows-latest` runner, checkout repo, `actions/setup-python`
   (Python 3.12 — matches the dev environment).
2. `pip install -r requirements.txt` + `pip install pyinstaller`.
3. Download **FFmpeg + FFprobe static Windows builds** (Gyan.dev
   essentials zip, free) and unpack `ffmpeg.exe` / `ffprobe.exe`
   into the bundle — the tool shells out to `ffmpeg` everywhere
   (`video.py`, `tts.py`, `autovideo*.py`), so the binaries must
   sit next to the frozen app and be put on PATH by the launcher.
   yt-dlp ships as a pip module (already in requirements) — no
   separate binary needed, but it goes stale: the launcher checks
   for a yt-dlp update at startup when online and upgrades it in
   the background (best-effort, never blocks the tool).
4. `pyinstaller --onedir` on `installer/launcher.py` (see §3.4).
   **One-dir, not one-file**: faster startup, fewer antivirus false
   positives, and the app's data files (`frontend/`, `backend/*.py`
   as data where needed) ride along. Data files are collected with
   `--add-data`.
5. Install **Inno Setup** (free, `choco install innosetup`) and
   compile `installer/ytguru.iss` → `YT-Guru-Setup-<version>.exe`.
6. Upload the installer as a workflow artifact (and, on a tag, as a
   GitHub Release asset).

### 3.4 Inno Setup script (draft: `installer/ytguru.iss`)

- `DefaultDirName={autopf}\YT Guru` — the customer picks the folder
  in the wizard (directory page enabled, not skipped).
- Copies the PyInstaller `dist/` output, the bundled
  `ffmpeg.exe`/`ffprobe.exe`, and the `Run-Setup` launcher.
- **Run-Setup**: a shortcut + a `Run-Setup.bat` in the install
  folder. Clicking it runs `YT-Guru.exe` (the frozen launcher),
  which starts the local server and opens the browser. The `.bat`
  exists because Master explicitly asked for a file named Run-Setup;
  the Start Menu / Desktop shortcuts point at the same launcher.
- Creates Start Menu + optional Desktop icons, and a standard
  uninstaller (removes program files; leaves the customer's
  videos/jobs unless they choose to delete them).
- No admin rights required if installed per-user (TODO in the
  script: decide `PrivilegesRequired=lowest` vs admin; lowest is
  friendlier and sufficient — the app only binds localhost).

### 3.5 Frozen launcher (draft: `installer/launcher.py`)

Replaces `start.py` for the installed build:

- Detects frozen mode (`sys.frozen`), prepends the bundle dir to
  PATH so the bundled `ffmpeg.exe`/`ffprobe.exe` are found.
- Sets the app root to the install folder; data dirs
  (`jobs/`, `covers/`, `groups/`, `tts/`, `autovideos/`,
  `tokens/`) live under the install folder (or `%APPDATA%` —
  TODO: decide; install-folder is simpler and survives the
  customer's expectation that "the project is installed there").
- Starts uvicorn on `127.0.0.1:8000` exactly like `start.py`,
  waits for `/api/health`, opens the browser.
- Before the first job (and on every start), runs the license
  check (`client/licensing.py`): if no license key is stored,
  the home page shows an activation box (enter key → activate).
  The server itself refuses credit-consuming endpoints without a
  valid job token (see §4), so the UI is not the enforcement
  point — the backend is.
- No console window for the customer: PyInstaller `--windowed`
  with errors written to a `launcher-error.log` next to the exe
  (TODO: confirm log location in testing).

### 3.6 Installer open questions (for Master, see §7)

- Install folder default (Program Files vs `%LOCALAPPDATA%`).
- Auto-update of the tool itself (later phase; Phase 1 ships a
  fixed version, update = download a new installer).
- Code signing certificate: unsigned installers trigger Windows
  SmartScreen warnings. A certificate costs money — Phase 1
  ships unsigned with a "click More info → Run anyway" note.
  (Flagged honestly: no free way around SmartScreen for a new
  publisher.)

## 4. License / credit server

### 4.1 Shape

A **separate, tiny FastAPI service** — credits and history only.
It never sees a video file and never runs FFmpeg. That is why it
is genuinely lightweight: a few JSON requests per job, a small
database, and a static dashboard page.

Draft: `api/index.py` (FastAPI app) + `api/_store.py` (Postgres
via `DATABASE_URL`, SQLite local-dev fallback only — see §4.4).

### 4.2 Endpoints (see `api/index.py` for the full list)

Customer-facing (called by the installed tool, key in header):

| Endpoint | Purpose |
|---|---|
| `POST /v1/activate` | `{license_key, device_fingerprint}` → `{customer, balance, costs, trial_left}`. Binds the key to the device fingerprint (first activation; Master can reset devices). |
| `GET /v1/me` | Balance + current cost config + trial status (values always from server). |
| `POST /v1/consume` | `{license_key, action, job_ref}` → reserves cost, returns single-use `job_token` (signed, TTL ~10 min, bound to action + job_ref), or `402` insufficient credits. Atomic decrement — no race double-spend. |
| `POST /v1/report` | `{job_token, status, tool, title, topic, minutes, chars}` → closes the token as completed/failed; stores the history row Master sees. |
| `POST /v1/refund` | `{job_token}` → refunds a reserved credit exactly once (idempotent) when the job failed before producing a video. |
| `POST /v1/heartbeat` | (Optional) periodic alive ping so Master sees "last seen" per customer/device. |

Admin-facing (Master only, session login, ` /admin/*`):

| Endpoint | Purpose |
|---|---|
| `POST /admin/login` | Master username + password (bcrypt hash from env, never hardcoded). |
| `GET /admin/overview` | Total customers, total credits sold/used, videos made (by tool/topic), recent activity. |
| `GET /admin/customers` (+ `/{id}`) | List + per-customer detail: balance, devices, full history (video title/topic, tool, date, credits spent). |
| `POST /admin/customers` | Create customer + issue license key (trial credits applied automatically from settings). |
| `POST /admin/customers/{id}/credits` | Add/remove credits (with a reason/note — e.g. payment received). Every change is a ledger row, never an silent edit. |
| `POST /admin/customers/{id}/revoke` / `/reset-devices` | Kill a key / unbind devices (theft, refund, abuse). |
| `GET/PUT /admin/settings` | **The single source of truth for every credit value**: `credits_per_cover_video`, `credits_per_tts`, `credits_per_autovideo`, `trial_credits`, `price_per_credit_pkr`, pack definitions. The client fetches these from the server — nothing is hardcoded in the tool. |
| `GET /admin/ledger` | Full credit ledger (who spent/got what, when, why). |

### 4.3 Data model

`customers` (id, name, email, created_at, notes),
`license_keys` (key hash — never store the raw key — customer_id,
devices JSON, revoked flag),
`credit_ledger` (id, customer_id, delta, reason, job_token, created_at),
`jobs` (job_token, customer_id, tool, title/topic, minutes, chars,
status, credits, created_at, finished_at),
`settings` (key/value — the Master-set credit values),
`admin_users` (username, bcrypt password hash).

### 4.4 Hosting — Vercel + Supabase Postgres (Phase 2, decided)

**Vercel (Master's decision, 2026-11-06).** One Vercel project,
Root Directory = this folder (`ytguru-commercial/`). Layout:

- `api/index.py` — the FastAPI app. Vercel's Python runtime
  serves the ASGI `app` exported there. `api/_store.py` is the
  DB layer (underscore prefix = Vercel does not turn it into a
  function; it is bundled with `index.py`).
- `vercel.json` — rewrites `/v1/*`, `/admin/*` and `/health` to
  the function (the function sees the ORIGINAL request path, so
  the FastAPI routes match unchanged), a redirect from `/` to
  `/admin/`, `maxDuration: 10` (Hobby limit), and
  `includeFiles: dashboard/**` so the dashboard files ride along
  in the function bundle.
- The Master Dashboard is served by the SAME function at
  `/admin/` (StaticFiles mount, same origin as the API — no
  CORS, one URL, one deploy). The same files are also served
  statically at `/dashboard/` as a fallback if the function
  bundle ever lacks them.
- `requirements.txt` (project root, pinned) is what Vercel
  installs: `fastapi`, `bcrypt`, `psycopg[binary]`.
- **Why Vercel fits:** every endpoint is one or two database
  rows — no video work, no FFmpeg — so the 10 s Hobby function
  timeout is plenty, and the free tier ($0) is enough. Cold
  starts are a few seconds (not Render free's ~60 s).
- **Why the code lives in `api/` and not in a `server/` folder:**
  Vercel serves files in the project root as static assets
  (confirmed in Vercel community reports) — a `server/*.py`
  folder at the root could be downloaded by anyone. Everything
  under `api/` is function code and is never served statically.
  `.vercelignore` additionally keeps the installer, desktop
  client, workflow and docs out of the deployment.

**Database: Supabase free Postgres (500 MB, no expiry).** This
is REQUIRED, not optional:

1. **Vercel's filesystem is ephemeral — SQLite would be a
   critical data-loss bug.** A SQLite file written by a
   serverless function is wiped when the instance is recycled
   (minutes to hours). Every customer, license key and credit
   balance would silently vanish. The server therefore
   **refuses to start on Vercel without `DATABASE_URL`**
   (loud `RuntimeError` at import, verified in testing) instead
   of silently running on a throwaway database.
2. **Supabase setup (do once, ~10 min, free):**
   a. supabase.com → New project (free tier) → pick a region
      close to Pakistan (e.g. Singapore / Mumbai) → set a
      database password, save it somewhere safe (NOT in any file
      in this repo).
   b. Project Settings → Database → Connection string → use the
      **Transaction pooler** URI (port **6543**, not 5432) —
      the free tier allows few direct connections and
      serverless bursts exhaust them; the pooler absorbs that.
      It looks like:
      `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`
   c. In Vercel: Project → Settings → Environment Variables,
      add `DATABASE_URL` = that URI (all environments).
   d. The server creates its own tables on first start
      (`CREATE TABLE IF NOT EXISTS`) and seeds the default
      credit values — no manual SQL needed.
   e. Supabase free tier: 500 MB database, 50,000 monthly
      active users on Auth (not used here), 2 GB bandwidth —
      far above what a license server needs (a few rows per job).
3. **Storage layer (`api/_store.py`):** one SQL surface for
   both backends. All SQL is written SQLite-style (`?`
   placeholders); the Postgres path translates `?` → `%s`,
   `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`, and
   serialises consumes per customer with a Postgres advisory
   lock (`pg_advisory_xact_lock`, transaction-scoped — safe
   with the pooler in transaction mode) instead of SQLite's
   `BEGIN IMMEDIATE`. Rows are always plain dicts either way.
   Local dev without `DATABASE_URL` falls back to SQLite
   (`api/license.db`) for testing only.
4. **Do NOT create the Supabase account yet** unless Master
   says so — the steps above are written so either he or the
   agent can do them in one pass once he approves.

### 4.5 What the customer pays for vs what Master pays

- Master pays: license-server hosting ($0 Vercel free tier) +
  database ($0 Supabase free tier). No per-video cost exists on
  Master's side — video processing runs on the customer's own PC.
- Customer pays: credit packs (prices set by Master, defaults
  §0.1). Payment collection is **manual**: to buy credits the
  customer contacts Master on WhatsApp **03100668952**, pays
  (JazzCash/bank/etc.), Master tops up credits in the dashboard.
  No payment gateway is built — that is a later decision
  (gateway fees, verification, and fraud handling are out of
  scope here).

## 5. Master Dashboard (draft: `dashboard/`)

Static HTML/JS served by the license server itself (same pattern
as the tool: backend serves its own frontend — no separate deploy).

- **Login** — Master only. One admin account, bcrypt password
  from an environment variable. No sign-up page exists.
- **Overview** — total customers, active (seen in last 30 days),
  total credits issued / spent / outstanding, videos made total
  and by tool, top topics (from video titles), recent activity.
- **Customers** — table (name, email, balance, videos made, last
  seen, devices). Click a customer → detail page: full history
  (every video: title/topic, tool, date, credits spent), devices
  bound to the key, ledger of credit adds/removes, buttons:
  Add credits / Remove credits / Revoke key / Reset devices.
- **Credit settings** — the Master control panel: credits per
  cover video, per TTS generation, per autovideo; trial credits
  for new customers; price per credit (PKR); pack definitions
  (editable list, one `credits, price` line per pack). Saving here changes the
  values the customer tool fetches — effective everywhere on the
  next license check, with no reinstall.
- **Ledger** — every credit movement, with reason and timestamp,
  so Master can always answer "where did my credits go?".

## 6. Anti-tamper / anti-crack design (read this fully)

### 6.1 The honest baseline

**No client-side protection is uncrackable.** The installed tool
is a PyInstaller bundle of Python bytecode: a determined attacker
can extract it, read the logic, and patch it. Anyone who claims
"100% uncrackable" for a desktop app is selling something. The
design goal is therefore: **make bypassing cost more effort than
buying credits, and make abuse visible to Master immediately.**
Everything below is layered so that no single bypass defeats the
system.

### 6.2 Layers (strongest first)

1. **Server-side authorization before any job starts (the core).**
   The desktop backend must hold a valid single-use `job_token`
   from the license server before it starts FFmpeg/yt-dlp. The
   token is HMAC-signed by the server (secret never leaves the
   server), bound to one action + one job id, TTL ~10 minutes,
   single-use. The check lives in `backend/main.py` at the five
   endpoints in §2 — before the background thread is spawned.
   There is no "offline mode" that skips this (see §6.3).
2. **Balance is never trusted from the client.** The installed
   tool never decides "I have N credits" on its own. It asks the
   server; the server decrements atomically in one database
   transaction. Two simultaneous jobs cannot both spend the same
   credit.
3. **License key + device fingerprint binding.** Activation binds
   the key to a fingerprint (machine GUID + CPU + disk serial
   hash — no personal data). A key copied to another PC fails
   activation until Master resets devices. Master sees device
   count per customer in the dashboard.
4. **History as an audit trail.** Every completed/failed job is
   reported with its token. Master can see impossible patterns
   (e.g. 50 videos in an hour from a 10-credit customer) and
   revoke the key. The client cannot forge a history row without
   a valid token.
5. **Signed server responses + TLS.** All license traffic is
   HTTPS to a pinned hostname (the license server URL is baked
   into the build, not user-editable in the UI). Responses are
   HMAC-signed so a local fake server cannot mint tokens without
   the server secret. (Residual risk: an attacker who patches the
   binary can also remove the pinning — see §6.4.)
6. **Version gating.** The server knows the minimum allowed
   client version; old/cracked versions are refused at
   activation and at consume-time. Every new installer release
   can invalidate older builds.
7. **Obfuscation (weak layer, stated as such).** PyInstaller
   bytecode can be obfuscated, but this only slows a skilled
   attacker by hours, not weeks. Do not rely on it; it is a
   speed bump, not a wall. (PyArmor's free tier is limited and
   its paid version is not "totally free", so it is not assumed.)
8. **Rate limits + anomaly flags on the server.** Per-key
   consume rate limits, impossible-balance alerts, and a Master
   dashboard banner for suspicious accounts.

### 6.3 Offline behaviour (decision needed from Master)

The tool cannot verify credits without internet. Options:

- **(A) Strict (recommended): no internet → no new jobs.**
  Already-made files can still be previewed/downloaded/uploaded;
  new generations are blocked with "internet required to check
  credits". Simplest, strongest, and honest.
- **(B) Grace quota:** allow N (Master-set, e.g. 2) offline
  jobs, recorded in a local tamper-evident counter, which must
  sync within X hours or the tool locks until it can reach the
  server. Weaker (the counter lives on the attacker's machine)
  but friendlier. Only if Master explicitly chooses it.

Default in the scaffold: **(A) strict**. Master decides.

### 6.4 Residual risks (stated honestly, not hidden)

- A skilled attacker can patch the frozen binary to skip the
  license call entirely. Mitigation is detection, not
  prevention: such a patched client never reports history, so
  the dashboard shows a customer who "never makes videos" while
  their YouTube channel grows — and a new version can change
  the protocol. There is no free technical fix for this on a
  desktop app; the business answer is price credits low enough
  that cracking is not worth the effort.
- A customer can share their license key; device binding (§6.2.3)
  limits this to N devices, and Master can revoke.
- The Google OAuth client secret shipped for YouTube upload is
  extractable from any desktop app. See §6.5.
- The license server itself must be kept up: if it is down, no
  customer can start a job (strict mode). Uptime is Master's
  responsibility; Vercel + Supabase free tiers are the main
  dependency (both have free-tier limits, neither charges
  anything at this scale).

### 6.5 The YouTube-upload problem (flagged, not solved in Phase 1)

Today the tool expects each install to have its **own** Google
Cloud OAuth Client ID/Secret pasted in Admin (`POST
/api/youtube/credentials` → `client_secrets.json`), and the
OAuth app is in **Testing mode** — only developer-approved test
users can connect. For paying customers this breaks three ways:

1. Customers cannot be expected to create Google Cloud projects.
2. If Master ships his own Client ID/Secret in the installer, it
   is extractable and abusable, and Google may throttle/ban it.
3. Testing-mode test users are capped (~100) and each customer
   would need adding.

Real fixes (need Master's decision, Phase 2): publish/verify the
OAuth app for production (Google verification for the sensitive
`youtube.upload` scope — long process, not recommended lightly),
or move upload through a server-side flow, or ship upload as a
"bring your own credentials" advanced feature and sell the tool
for generation only. **Phase 1 does not pretend this is solved.**

## 7. Decisions still needed from Master (not asked yet — for the parent agent)

Decided in Phase 2 — no longer open: hosting = **Vercel**
(§4.4); default credit values set (§0.1); payment = **manual
via WhatsApp 03100668952** (§4.5).

Still open:

1. **Offline behaviour:** strict (no internet = no new jobs) or
   grace quota (how many offline jobs, sync within how long)?
   Default in the scaffold: strict.
2. **YouTube upload for customers:** bring-your-own Google
   credentials, ship Master's credentials, publish/verify the
   OAuth app, or generation-only (no upload) for customers?
3. **Install folder default** (Program Files vs per-user
   `%LOCALAPPDATA%`) and whether a Desktop shortcut is created.
4. **Trial:** how many free trial credits per new customer
   (default is 3), and can one person claim trial twice
   (email/device check)?
5. **Supabase account + Vercel env vars:** who creates the
   Supabase project and sets `DATABASE_URL`,
   `JOB_TOKEN_SECRET`, `ADMIN_PASSWORD_HASH` in Vercel (steps
   in §4.4 / §9)?

## 8. Phase 2 file map (this folder)

- `DESIGN.md` — this file.
- `vercel.json` — Vercel routing: `/v1/*`, `/admin/*`, `/health`
  → `api/index.py`; `/` → `/admin/`; `maxDuration: 10`;
  `includeFiles: dashboard/**`.
- `requirements.txt` — pinned Vercel deps (fastapi, bcrypt,
  `psycopg[binary]`).
- `.vercelignore` — keeps installer/client/workflow/docs out of
  the deployment.
- `api/index.py` — FastAPI license server (Vercel entrypoint;
  local dev: `uvicorn api.index:app --port 9000`).
- `api/_store.py` — Postgres/SQLite storage layer (one SQL
  surface, advisory-lock atomic consume, Vercel guard).
- `api/README.md` — run guide + env vars + deploy target.
- `dashboard/index.html` + `dashboard/app.js` — Master Dashboard
  (login, overview, customers, history, credit settings incl.
  editable packs, ledger). Calls `/admin/*` endpoints; shows
  "No data yet" until the real server answers.
- `installer/ytguru.iss` — Inno Setup draft (folder picker,
  Run-Setup, shortcuts, uninstaller).
- `installer/launcher.py` — frozen-app launcher draft (bundled
  FFmpeg on PATH, starts uvicorn, opens browser, license hook).
- `installer/build-windows-installer.yml` — GitHub Actions draft
  (windows-latest, PyInstaller + Inno Setup → installer artifact).
- `client/licensing.py` — credit-check client used by the desktop
  app (activate, balance, consume, report, refund, device
  fingerprint).
- `client/hook-sketch.md` — exactly where the check plugs into
  `backend/main.py` (5 endpoints), with a code sketch. The real
  `main.py` is NOT modified in Phase 2.

## 9. Phase 2 — Vercel adaptation: what was done + verified (2026-11-06)

**Done:** license server moved to `api/index.py` + `api/_store.py`
(the old `license-server/` folder is gone); Postgres storage via
`DATABASE_URL` with SQLite local-dev fallback; loud startup
refusal on Vercel without `DATABASE_URL`; `vercel.json`,
pinned root `requirements.txt`, `.vercelignore`; dashboard packs
now editable in the UI; default credit values seeded (§0.1);
docs updated. Nothing pushed to GitHub, nothing deployed.

**Verified by running it (throwaway venv + local servers,
2026-11-06 ~00:10–00:20 PKT):**

- SQL translation unit tests: 4/4 passed (`?` → `%s`,
  `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`, upsert
  unchanged).
- SQLite flow (real uvicorn, `api.index:app`): **22/22 checks
  passed** — health, login wrong/right, default credit values,
  create customer + 3 trial credits, activate, consume TTS
  (balance 3→2), report completed, Master changes TTS cost
  1→2 (next consume charged 2), 402 on empty balance, refund
  + idempotent double-refund, overview, customer history,
  dashboard HTML at `/admin/`, bad key → 401, and a 4-thread
  race for 3 credits → exactly 3×200 + 1×402, balance 0
  (never negative).
- Postgres flow (same 22 checks against a real embedded
  PostgreSQL): **22/22 passed**, including the race test
  (advisory-lock path) and the settings change.
- Persistence: server restarted against the same Postgres —
  overview still showed 2 customers / 1 video / 8 credits
  issued. Packs update via `PUT /admin/settings` verified.
- Vercel guard: `VERCEL=1` without `DATABASE_URL` → import
  raises `RuntimeError` ("DATABASE_URL is not set..."); with
  `DATABASE_URL` set → imports fine.
- Test servers stopped afterwards; test databases deleted
  (`api/license.db` removed). The real repo copy is untouched.

**NOT yet verified (cannot be verified without deploying):**
the Vercel routing itself (rewrites preserve the original
path — the standard FastAPI-on-Vercel pattern, per Vercel's
own routing docs — but unproven for this project until the
first real deploy), `includeFiles` bundling of `dashboard/`,
and the Supabase pooler connection from Vercel's network.
Verify all three on the first deploy (checklist below).

**Deploy steps (run once Vercel is connected + Master approves):**

1. Supabase: create the free project, copy the **pooler**
   (port 6543) connection string (§4.4 step 2).
2. Push this folder to GitHub (needs Master's explicit push
   approval — the YT Guru rule is hold-locally, push in one
   batch only when he says so), OR deploy from this folder
   with the Vercel CLI (`vercel` → link project, `vercel --prod`).
   If importing the repo in Vercel, set **Root Directory =
   `ytguru-commercial`**.
3. Vercel → Settings → Environment Variables (all envs):
   `DATABASE_URL` (pooler URI), `JOB_TOKEN_SECRET` (long random,
   `python -c "import secrets; print(secrets.token_hex(32))"`),
   `ADMIN_PASSWORD_HASH` (bcrypt hash of Master's password —
   generate with `python -c "import bcrypt;
   print(bcrypt.hashpw(b'YOUR-PASSWORD', bcrypt.gensalt()).decode())"`,
   never the password itself).
4. Deploy. Then verify, in order:
   a. `GET https://<project>.vercel.app/health` →
      `{"ok": true, "db": "postgres"}`. If `db` says
      `sqlite-dev-only`, the env var is missing — STOP, do not
      create customers.
   b. `GET https://<project>.vercel.app/admin/` → dashboard
      login page. If it 404s, use the fallback
      `/dashboard/` (static) and fix `includeFiles`.
   c. Log in as `master`, check `GET /admin/settings` shows
      the defaults (§0.1), create a test customer, run
      activate → consume → report from a test client, confirm
      the balance moves and the history row appears.
   d. `GET https://<project>.vercel.app/server/app.py` and
      `/api/_store.py` must 404 (source must not be served
      statically).
5. Give the deployed URL to the desktop-client build
   (`client/licensing.py` `LICENSE_SERVER_URL` build-time
   constant) — that wiring happens in the installer phase.

**Still blocked:** Vercel account connection (Master is doing
it now); Supabase project (not created — no account touched);
GitHub push of this folder (needs Master's explicit approval);
the 4 open decisions in §7 (offline behaviour, YouTube upload,
install folder, trial double-claim).
