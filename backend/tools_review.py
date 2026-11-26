"""YT Guru — "Review all scenes": Gemini (free key, vision) looks at each scene's contact sheet.

For every scene with code it gets the sheet, the narration, the VISUAL IDEA and the code, says what a
viewer understands, lists the problems and may return corrected code. NOTHING is applied here: the
result is stored beside the scene (script_review) and the user decides in Script mode.
The key comes with the request, is used by that run only and is never saved.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import tools_script as ts

router = APIRouter(prefix="/api/visual/script", tags=["visual-script"])
_STATE: dict[str, dict] = {}
_START = threading.Lock()
GAP = 6.0  # seconds between two questions (the free plan allows few per minute)


def code_key(code: str) -> str:
    return hashlib.sha1(str(code or "").encode("utf-8")).hexdigest()[:12]


def review_prompt(title: str, scenes: list[dict], index: int, sources: list[dict] | None = None) -> str:
    sc = scenes[index]
    test = sc.get("script_test") or {}
    nar = str(sc.get("narration") or "").strip()
    problems = (f"The code stopped with this ERROR: {test['error']}\n" if test.get("error") else "") + "".join(
        f"The test warned: {w}\n" for w in test.get("warnings") or [])
    return (ts.GUIDE.replace("{library}", ts._library())
            + "\n\n=== YOUR TASK NOW: REVIEW ONE SCENE ===\n"
            + f'VIDEO TITLE: "{title}"\n\n' + ts.other_ideas(scenes, index)
            + f"SCENE {index + 1}: {nar}\nVISUAL IDEA: {ts.idea_of(sc.get('code')) or '(none written)'}\n\n"
            + f"The attached image is the contact sheet of this scene as it is drawn now.\n{ts.frame_list(test.get('frames') or [])}\n\n"
            + f"CODE:\n# === SCENE {index + 1} ===\n{sc.get('code') or ''}\n{problems}\n"
            + ts.saved_sources(scenes, sources, index) + "\n"
            + "First LOOK at the frames alone and say what a viewer understands from them. Then judge them honestly:\n"
            + ts.REVIEW_CHECKS
            + "\nReport only problems you can really see in the frames or that the test reported. If the scene is already "
            "clear, say it is good and return no code. Otherwise return the whole corrected code of this scene (with its "
            "# VISUAL IDEA line), following every rule above.\n\nReply ONLY JSON (this replaces the ANSWER FORMAT above):\n"
            '{"seen": "one sentence: what the frames communicate", "verdict": "good" or "fix", '
            '"problems": ["short, concrete problem", ...], "code": "the corrected code, or empty when good"}')


def parse_answer(text: str, code: str, index: int) -> dict:
    """Gemini's reply -> {"verdict", "seen", "problems", "code", "code_error"}; raises ValueError when unreadable."""
    t = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", str(text).strip())
    a, b = t.find("{"), t.rfind("}")
    data = json.loads(t[a:b + 1]) if a >= 0 and b > a else None
    if not isinstance(data, dict):
        raise ValueError("the answer was not readable")
    new = str(data.get("code") or "").strip()
    if new:
        new = ts.parse(new).get(index + 1) or ts.single_block(re.sub(r"(?m)^\s*#+\s*=+\s*SCENE\s+\d+.*$", "", new))
    problems = [str(p).strip()[:300] for p in data.get("problems") or [] if str(p).strip()][:8]
    verdict = "fix" if str(data.get("verdict") or "").lower().startswith("fix") else "good"
    if new.strip() == str(code or "").strip():
        new = ""
    return {"verdict": verdict, "seen": str(data.get("seen") or "").strip()[:400], "problems": problems,
            "code": new if verdict == "fix" else "", "code_error": ts.check(new)[0] if new and verdict == "fix" else ""}


class KeyError_(RuntimeError):
    """The review cannot go on at all (bad key, daily limit)."""


def _post(model: str, key: str, body: bytes) -> str:
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                 data=body, headers={"Content-Type": "application/json", "x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=180) as res:
        data = json.loads(res.read().decode("utf-8", "ignore"))
    return "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"] if not p.get("thought"))


def ask_gemini(prompt: str, image: bytes, key: str, st: dict) -> tuple[str, str]:
    """-> (answer, model). Waits and tries again when the free plan is busy."""
    import tools_animator as ta
    body = json.dumps({"contents": [{"parts": [{"text": prompt}, {"inline_data": {
        "mime_type": "image/png", "data": base64.b64encode(image).decode("ascii")}}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}}).encode("utf-8")
    chosen = str(ta._AI.get("gemini_model") or "").strip()
    models = ([chosen] if chosen else []) + [m for m in ta.GEMINI_MODELS if m != chosen]
    last = ""
    for attempt in range(4):
        errors = []
        for model in models:
            if st.get("stop"):
                raise KeyError_("Stopped.")
            try:
                out = _post(model, key, body)
                if out.strip():
                    return out, model
                errors.append(f"{model}: empty answer")
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", "ignore")[:600]
                errors.append(f"{model}: HTTP {exc.code} {detail}")
                if exc.code == 403 or "api key not valid" in detail.lower() or "api_key_invalid" in detail.lower():
                    raise KeyError_("Your Gemini key is not valid (check it in the Dashboard).") from None
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{model}: {type(exc).__name__} {str(exc)[:150]}")
        last = " | ".join(errors)
        busy = re.search(r"HTTP (429|500|503)|timed out|overloaded", last, re.I)
        if not busy or attempt == 3:
            break
        wait = 20 * (attempt + 1)
        st["stage"] = f"Gemini is busy — waiting {wait} seconds, then trying again…"
        for _ in range(wait * 2):
            if st.get("stop"):
                raise KeyError_("Stopped.")
            time.sleep(0.5)
    if "perday" in last.lower().replace(" ", "").replace("_", ""):
        raise KeyError_("Gemini's free daily limit is used up — it resets tomorrow.")
    reason = ta._gemini_reason(last)[0]
    raise RuntimeError(reason)


def _store(app, job_id: str, index: int, code: str, fields: dict) -> bool:
    """Writes into one scene, only while its code is still the one that was looked at."""
    with ts._LOCK:
        fresh = app._av_read(job_id)
        sc = fresh["scenes"][index]
        if sc.get("code") != code:
            return False
        sc.update(fields)
        app._av_write(fresh)
    return True


def review_scene(app, job_id: str, index: int, key: str, st: dict) -> None:
    job = app._av_read(job_id)
    sc = job["scenes"][index]
    code = sc.get("code") or ""
    if not code:
        return
    work_dir = app._av_job_dir(job_id)
    test = sc.get("script_test") or {}
    if not test.get("sheet") or not (work_dir / Path(test["sheet"]).name).exists():
        st["stage"] = f"Scene {index + 1}: testing it first (its frames are needed)…"
        ts.test_scene(job, index, work_dir)
        keys = ("script_test", "kind", "visual_file", "graphic_file", "visual_source")
        if not _store(app, job_id, index, code, {k: sc.get(k) for k in keys if k in sc}):
            return
        test = sc.get("script_test") or {}
    try:
        if not test.get("sheet"):
            raise RuntimeError("The scene gives no picture to look at: " + (test.get("error") or "test failed"))
        st["stage"] = f"Scene {index + 1}: Gemini is looking at the frames…"
        text, model = ask_gemini(review_prompt(job.get("title") or "", job["scenes"], index, job.get("sources")),
                                 (work_dir / Path(test["sheet"]).name).read_bytes(), key, st)
        result = parse_answer(text, code, index)
        result["model"] = model
    except KeyError_:
        raise
    except Exception as exc:  # noqa: BLE001 — this scene failed, the others go on
        result = {"verdict": "error", "error": str(exc)[:300], "problems": [], "seen": "", "code": "", "code_error": ""}
    _store(app, job_id, index, code, {"script_review": {**result, "for": code_key(code), "at": time.time()}})
    if sc.get("auto_sources"):  # pages used by a scene that was tested for this review
        import tools_source
        with ts._LOCK:
            fresh = app._av_read(job_id)
            if tools_source.add_found(fresh, sc["auto_sources"]):
                app._av_write(fresh)


def _worker(app, job_id: str, indexes: list[int], key: str) -> None:
    st = _STATE[job_id]
    try:
        for k, i in enumerate(indexes):
            if st.get("stop"):
                break
            if k:
                time.sleep(GAP)
            review_scene(app, job_id, i, key, st)
            st["done"] = k + 1
        st["stage"] = "Stopped." if st.get("stop") else "Review finished."
    except KeyError_ as exc:
        st["error"] = "" if st.get("stop") else str(exc)
        st["stage"] = str(exc)
    except Exception as exc:  # noqa: BLE001
        st["error"] = f"The review stopped: {str(exc)[:300]}"
    finally:
        st["running"] = False


class ReviewReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    gemini_key: str = Field("", max_length=200)
    indexes: list[int] | None = Field(None, max_length=500)


def _status(job: dict, job_id: str) -> dict:
    st = _STATE.get(job_id) or {}
    reviews = []
    for i, sc in enumerate(job.get("scenes") or []):
        r = sc.get("script_review")
        if r and r.get("for") == code_key(sc.get("code") or ""):  # a review of older code is not shown
            reviews.append({"index": i, **r})
    return {"running": bool(st.get("running")), "done": st.get("done", 0), "total": st.get("total", 0),
            "stage": st.get("stage", ""), "error": st.get("error", ""), "reviews": reviews}


@router.post("/review")
def start(req: ReviewReq) -> dict:
    app, job = ts._job(req.job_id)
    key = req.gemini_key.strip()
    if not key:
        raise HTTPException(400, "The automatic review needs your free Gemini key (add it in the Dashboard).")
    scenes = job["scenes"]
    wanted = req.indexes if req.indexes is not None else range(len(scenes))
    indexes = [i for i in wanted if 0 <= i < len(scenes) and scenes[i].get("code")]
    if not indexes:
        raise HTTPException(400, "Save scene code first — there is nothing to review.")
    with _START:
        if not (_STATE.get(req.job_id) or {}).get("running"):
            _STATE[req.job_id] = {"running": True, "done": 0, "total": len(indexes), "stage": "Starting…", "error": "", "stop": False}
            threading.Thread(target=_worker, args=(app, req.job_id, indexes, key), daemon=True).start()
    return _status(job, req.job_id)


@router.get("/review/{job_id}")
def status(job_id: str) -> dict:
    _app, job = ts._job(job_id)
    return _status(job, job_id)


class JobReq(BaseModel):
    job_id: str = Field(..., max_length=40)


@router.post("/review/stop")
def stop(req: JobReq) -> dict:
    st = _STATE.get(req.job_id)
    if st:
        st["stop"] = True
    return {"ok": True}
