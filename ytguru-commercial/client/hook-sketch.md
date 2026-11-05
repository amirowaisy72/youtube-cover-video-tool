# Credit-check hook — where it plugs into backend/main.py (SKETCH)

Status: **sketch only**. The real `backend/main.py` is NOT modified
in Phase 1. This shows exactly where the calls go, so Phase 2 is a
mechanical edit, not a redesign.

## Rule

A credit-consuming endpoint must hold a valid single-use `job_token`
from the license server **before** it spawns its background thread.
No token → no FFmpeg, no yt-dlp, no job. The token is minted by
`POST /v1/consume` (server atomically decrements the balance) and
closed by `/v1/report` (completed/failed) or `/v1/refund`.

## Hook points (verified line numbers, 2026-11-05 read)

### 1. `POST /api/auto` (main.py L788) — Tool 1, Auto

```python
from licensing import consume, report, refund, LicenseError  # client/licensing.py

@app.post("/api/auto")
def auto_video(payload: AutoRequest) -> dict:
    ...
    job_id = uuid.uuid4().hex[:12]
    try:
        token = consume("cover_video", job_id, CLIENT_VERSION)
    except LicenseError as exc:
        raise HTTPException(402, str(exc))
    # _run_auto must call report(token, "completed"/"failed", ...)
    # at its end, and refund(token) if it fails before producing
    # final.mp4. Store the token in job.json (never trust the
    # frontend to hold it).
    threading.Thread(target=_run_auto, args=(job_id, payload.url,
                     payload.cover_id), daemon=True).start()
    return {"job_id": job_id, "status": "downloading", "auto": True}
```

Title/topic for history: `_run_auto` already stores
`original_title` in job.json — report it as the topic.

### 2. `POST /api/process` (main.py L1461) — Tool 1, Manual

Same pattern with action `"cover_video"`. Charge once per
`/api/process` call (one finished video). Note: a job whose
source was already downloaded still costs a credit at process
time — that is the chargeable event (the FFmpeg encode), and
re-processing the same source twice costs twice (Master may
decide otherwise; the hook is one line to change).

### 3. `POST /api/groups` (main.py L1026) — Tool 1, Group (N videos)

Charge **per item, up front, in one call**: the group has N items,
so reserve N × `credits_per_cover_video` before starting.
Implementation: loop over items, `consume("cover_video", ...)`
once per item, and store the list of tokens in the group JSON.
`_run_group` reports each token as its item finishes and refunds
tokens of items that fail. **Retry** (`POST /api/groups/{id}/retry`,
L1048) only re-runs failed items — it must consume only for the
failed items being retried, never for already-done ones.

### 4. `POST /api/tts` (main.py L1755) — Tool 2

Synchronous endpoint (no background thread). Pattern:

```python
token = consume("tts", tts_id, CLIENT_VERSION)  # before synthesize()
try:
    final_path, engine = tts_module.synthesize(...)
except Exception:
    refund(token)
    raise
report(token, "completed", tool="tts", chars=len(text))
```

### 5. `POST /api/autovideo` (main.py L1968) — Tool 3

Same as `/api/auto` with action `"autovideo"`. Topic for
history = `payload.title` (the title the customer typed).
`_run_autovideo` already writes `title`/`minutes` into the job
record — report those.

## What is NOT hooked (deliberately)

- Cover upload/list/delete, settings, `/api/video-info`,
  `/api/generate-metadata`, preview/source/download of finished
  files, job/group/record reads, YouTube upload
  (`/api/upload-youtube`, `/api/records/upload`) — the video was
  already charged at generation; upload uses the customer's own
  channel and costs Master nothing.
- `/api/health`, `/favicon.ico`.

## Failure semantics

| Situation | Behaviour |
|---|---|
| No license key stored | 402 "Activate the tool first" (home page shows activation box) |
| Balance too low | 402 with the cost + balance; frontend shows balance + "buy credits" note |
| License server unreachable | 402 "Connect to the internet…" — strict mode (no offline jobs). See DESIGN.md §6.3 for the grace-quota alternative Master may choose |
| Job fails (download error, FFmpeg error) | `refund(token)` — customer is never charged for a failed video |
| Job succeeds | `report(token, "completed", ...)` — Master sees it in history |
| Report/refund call itself fails | TODO: local outbox file, retried on next startup (Phase 2) |

## Shared code to add in Phase 2

- `backend/licensing.py` — the client module above, vendored into
  the app (it is written with only the standard library so it
  needs no new pip dependency).
- `CLIENT_VERSION` — a constant in `backend/main.py` (from the
  installer version) sent with every license call, so the server
  can refuse old builds.
- `LICENSE_SERVER_URL` — a build-time constant (baked into the
  PyInstaller build), never a user-editable setting.
