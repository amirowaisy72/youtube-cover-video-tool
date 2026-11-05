# License server — Vercel-ready (Phase 2)

The server lives in `../api/` (`index.py` = FastAPI app,
`_store.py` = Postgres/SQLite storage layer). This file is only
the run guide.

## Run locally

From the `ytguru-commercial/` folder:

```bash
pip install -r requirements.txt   # fastapi, bcrypt, psycopg[binary]
pip install uvicorn               # local dev server only
uvicorn api.index:app --port 9000
```

Then `http://127.0.0.1:9000/health` and
`http://127.0.0.1:9000/admin/` (Master Dashboard).

Without `DATABASE_URL` it uses a local SQLite file
(`api/license.db`) — **local testing only**. Set `DATABASE_URL`
to a Postgres URL to test the production path (see below).

## Env vars (production — set in Vercel, never in any file)

- `DATABASE_URL` — Postgres connection string. **REQUIRED on
  Vercel.** Use the Supabase **pooler** URL (port 6543,
  transaction mode) — the free tier allows few direct
  connections and serverless bursts exhaust them. If it is
  missing on Vercel, the server refuses to start (loud failure
  is deliberate: a SQLite file would be wiped on the next
  serverless recycle and all customers/credits lost).
- `JOB_TOKEN_SECRET` — long random secret for signing job
  tokens. Generate with:
  `python -c "import secrets; print(secrets.token_hex(32))"`
- `ADMIN_PASSWORD_HASH` — bcrypt hash of the Master password.
  Generate with:
  `python -c "import bcrypt; print(bcrypt.hashpw(b'YOUR-PASSWORD', bcrypt.gensalt()).decode())"`
  Never put the password itself in any file. Username is `master`.
- `JOB_TOKEN_TTL_SEC` — job-token lifetime, default 600 s.
- `MIN_CLIENT_VERSION` — minimum allowed customer-tool version.

## Deploy target: Vercel (Master's decision, 2026-11-06)

- One Vercel project, Root Directory = this folder
  (`ytguru-commercial/`). The function is `api/index.py`;
  `vercel.json` rewrites `/v1/*`, `/admin/*` and `/health`
  to it, and the dashboard is served by the same function at
  `/admin/` (files bundled via `includeFiles`) — same origin,
  no CORS. `/dashboard/` also serves the dashboard as plain
  static files as a fallback.
- Vercel Hobby functions time out after 10 s (`maxDuration`
  in `vercel.json`) — fine for this server: every endpoint is
  one or two database rows, no video work.
- Database: Supabase free Postgres (500 MB, no expiry) — see
  DESIGN.md §4.4 for the exact setup steps.
- No video processing runs here, so the server is genuinely
  lightweight: it fits the Vercel free tier.
