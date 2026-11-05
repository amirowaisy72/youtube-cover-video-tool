# YT Guru — Commercial Packaging (Phase 2: Vercel-ready)

**Status: design + draft scaffold, Vercel-adapted.** Nothing here
is pushed to GitHub, deployed, or a finished build. The real app
is untouched in `~/workspace/youtube-cover-video-tool`.

## What this is

Master's decisions: sell YT Guru as a Windows `.exe` installer
(Vercel/Render video hosting declined, APK impossible), with a
Master Admin Dashboard + credit system he fully controls, and
hard anti-crack requirements. Phase 2 (2026-11-06): the
lightweight license/credit server is adapted for **Vercel**
(the video backend itself can never run there), with
**Supabase free Postgres** as the database, and default credit
values set (Master changes them himself later in the dashboard).

**Default credit values** (seeded in the server, changeable via
`PUT /admin/settings`): 1 credit per cover video, 1 per
Text-to-Voice job, 1 per auto-video, 3 free trial credits per
new customer, price per credit **PKR 50**, packs **10/PKR 500,
30/PKR 1,200, 100/PKR 3,000**. Credit purchase is manual:
customer contacts Master on WhatsApp **03100668952**, pays,
Master tops up in the dashboard. No payment gateway.

## Contents

- `DESIGN.md` — the full design: .exe build route, license/credit
  server, Master Dashboard, anti-tamper layers + honest residual
  risks, Vercel architecture + Supabase setup steps + deploy
  checklist, and the decisions still needed from Master.
- `api/` — the license server: `index.py` (FastAPI app, Vercel
  entrypoint; local dev: `uvicorn api.index:app --port 9000`),
  `_store.py` (Postgres via `DATABASE_URL`, SQLite local-dev
  fallback only — the server refuses to start on Vercel without
  Postgres), `README.md` (run guide + env vars).
- `vercel.json` — rewrites `/v1/*`, `/admin/*`, `/health` to the
  function; `/` → `/admin/`; `maxDuration: 10`;
  `includeFiles: dashboard/**`.
- `requirements.txt` — pinned Vercel deps (fastapi, bcrypt,
  `psycopg[binary]`). `.vercelignore` keeps the installer,
  desktop client, workflow and docs out of the deployment.
- `dashboard/` — Master Dashboard (login, overview, customers +
  history, credit settings incl. editable packs, ledger).
  Static HTML/JS, served by the license server at `/admin/`
  (same origin, no CORS); also served statically at
  `/dashboard/` as a fallback.
- `installer/` — Inno Setup draft (`ytguru.iss`, folder picker,
  Run-Setup launcher, shortcuts, uninstaller), frozen-app launcher
  draft (`launcher.py`), `Run-Setup.bat`.
- `.github/workflows/build-windows-installer.yml` — GitHub Actions
  draft (windows-latest, PyInstaller + FFmpeg bundle + Inno Setup
  → installer artifact). Kept here, NOT in the repo, until Master
  approves.
- `client/` — `licensing.py` (credit-check client: activate /
  balance / consume / report / refund) and `hook-sketch.md`
  (exactly where the check plugs into the 5 credit-consuming
  endpoints of `backend/main.py`).

## Verified in Phase 2 (2026-11-06, local runs — see DESIGN.md §9)

- SQL translation unit tests 4/4; full customer journey
  (22 checks) passed on **both** SQLite and a real PostgreSQL,
  including a 4-thread race for 3 credits (exactly 3 succeed,
  balance never negative) and Master changing a credit value
  mid-test; data survives a server restart on Postgres; the
  Vercel guard refuses to start without `DATABASE_URL`.
- **Not yet verified:** the Vercel routing/deploy itself —
  see the deploy checklist in DESIGN.md §9. Deploy is blocked
  on: Vercel account connection (in progress), Supabase project
  (not created), and Master's explicit push approval.

## Decisions still needed from Master

See DESIGN.md §7 (offline behaviour, YouTube upload for
customers, install folder, trial double-claim, who creates the
Supabase project / sets the Vercel env vars).
