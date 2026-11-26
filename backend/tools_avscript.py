"""YT Guru — Auto Video Script mode (user, 2026-11-20).

Any AI (Claude, ChatGPT, Gemini) plans every scene of a stock-footage video: the search words of the opening clip,
what the footage must not show, and the new clip that starts at chosen words — or a drawn animation (the Visual
Explainer's scene code) where footage cannot show the idea (numbers, charts, lists). The user pastes the answer;
the app downloads exactly that footage, and the preview's "fix this part" uses the same format.
"""
from __future__ import annotations

import re
import threading
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/avscript", tags=["autovideo-script"])
_STATE: dict[str, dict] = {}
_LOCK = threading.Lock()

GUIDE = """You are the video editor of a YouTube video made from free stock footage (Pexels / Pixabay) with a voiceover.
For EVERY scene below, plan exactly what is shown while it is spoken. Each scene is either FOOTAGE or ANIMATION.

FOOTAGE — write for the scene:
# === SCENE 3 ===
main: <search words for the clip that opens the scene> | <second choice> | <third choice>
avoid: <things the footage must NOT show>, <...>
shot: "<words copied EXACTLY from this scene's narration>" -> <search words for the clip that starts at those words>
shot: "<later words>" -> <search words>

- 1-4 shot lines per scene, in the order spoken, at least 6 words apart: a new picture every 3-5 seconds, each one
  showing what is being said at that moment.
- Search words: 2-5 concrete, VISIBLE words that stock sites really have, e.g. "man counting cash close up",
  "city traffic at night aerial", "teenager playing video game controller", "stock market chart screen".
  Never brand names, logos, game footage, celebrities or text — stock sites do not have them.
- avoid: what would look wrong for this video (e.g. "cartoon, kids, wedding").

ANIMATION — for a scene that footage cannot show well (a big number counting up, a comparison, a chart, steps, a list),
use a drawn animation instead. At most about 1 scene in 4. Write:
# === SCENE 5 ===
animation:
<Python code with the animation tools below>

ANSWER FORMAT of the plan — ONE code block with every scene, each starting with its marker line.

========== ANIMATION TOOLS (only for animation scenes) ==========
"""


def _anim_guide() -> str:
    import tools_script as ts
    g = ts.GUIDE.replace("{library}", ts._library())
    a = g.find("THE STAGE")
    b = g.find("ANSWER FORMAT")
    c = g.find("EXAMPLE (")
    return (g[a:b] + g[c:]) if a >= 0 and b > a and c > b else g


def build_prompt(title: str, scenes: list[dict]) -> str:
    import tools_script as ts
    lines = []
    for i, sc in enumerate(scenes):
        nar = str(sc.get("narration") or "").strip()
        d = float(sc.get("duration_sec") or 0) or ts.est_duration(nar)
        lines.append(f"SCENE {i + 1} (about {d:.0f} seconds): {nar}")
    import tools_source
    return (tools_source.WEB_FIRST + "\n\n" + GUIDE + _anim_guide() + f'\n\nVIDEO TITLE: "{title}"\n\nTHE SCENES:\n'
            + "\n\n".join(lines)
            + "\n\nWrite the plan for ALL scenes now (footage for most scenes, animation only where it explains better).\n\n"
            + tools_source.research_rules("the scene plan, in the ANSWER FORMAT above. In animation scenes call "
                                          'source("https://url", "the exact sentence") where a source fits.'))


# ------------------------------------------------------------------ parsing
_SHOT = re.compile(r'^\s*shot\s*:\s*["“”\']?(.+?)["“”\']?\s*(?:->|→|=>|—>|-->)\s*(.+?)\s*$', re.I)


def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9%$]+", " ", str(t).lower()).strip()


def parse_block(code: str, narration: str) -> dict:
    """One scene's block -> {"kind": "animation", "code"} or {"kind": "footage", "main", "avoid", "shots"};
    raises ValueError with the reason when it cannot be used."""
    lines = code.replace("\r\n", "\n").split("\n")
    for k, ln in enumerate(lines):
        if ln.strip().lower().rstrip(":") == "animation":
            body = "\n".join(lines[k + 1:]).strip("\n") + "\n"
            import tools_script as ts
            err, _ = ts.check(body)
            if err:
                raise ValueError(f"animation code: {err}")
            return {"kind": "animation", "code": body}
    main, avoid, shots = [], [], []
    low = _norm(narration)
    last = -1
    bad = []
    for ln in lines:
        s = ln.strip()
        if not s or s.startswith("#"):
            continue
        m = re.match(r"^(main|search|clip)\s*:\s*(.+)$", s, re.I)
        if m:
            main = [q.strip().strip('"')[:60] for q in m.group(2).split("|") if q.strip()][:3]
            continue
        m = re.match(r"^avoid\s*:\s*(.+)$", s, re.I)
        if m:
            avoid = [a.strip().lower()[:24] for a in re.split(r"[,|]", m.group(1)) if a.strip()][:8]
            continue
        m = _SHOT.match(s)
        if m:
            words, query = m.group(1).strip().strip('"“”'), m.group(2).strip().strip('"')[:60]
            p = low.find(_norm(words), last + 1) if _norm(words) else -1
            if p < 0:
                bad.append(words)
                continue
            shots.append({"words": words[:80], "query": query, "at_norm": p})
            last = p
    if not main and not shots:
        raise ValueError("no 'main:' or 'shot:' lines (and no 'animation:')")
    if bad and not shots:
        raise ValueError("the shot words are not in this scene's narration: " + "; ".join(bad[:3]))
    return {"kind": "footage", "main": main, "avoid": avoid, "shots": shots[:4], "bad": bad[:4]}


def _shot_positions(narration: str, shots: list[dict]) -> list[dict]:
    """The words' character positions in the real narration (compose_shots cuts there)."""
    low = narration.lower()
    out, last = [], 15
    for sh in shots:
        w = sh["words"].lower()
        p = low.find(w, last)
        if p < 0:  # punctuation differs: find the first word after the last cut
            first = w.split()[0] if w.split() else ""
            p = low.find(first, last) if first else -1
        if p >= last:
            out.append({"words": narration[p:p + len(sh["words"])], "query": sh["query"], "at": p})
            last = p + 25
    return out


# ------------------------------------------------------------------ applying one scene
def apply_scene(job: dict, i: int, work_dir: Path, keys: dict, used: set, lock) -> dict:
    """Downloads the footage the block asks for (or prepares its animation) — returns the scene's new fields."""
    import autovideo2 as av2
    import autovideo_smart as sm
    sc = job["scenes"][i]
    block = parse_block(sc.get("av_script") or "", sc.get("narration") or "")
    vertical = (job.get("video_type") or "long") == "short"
    if block["kind"] == "animation":
        import tools_script as ts
        sc["code"] = block["code"]
        sc["graphic"] = {"theme": "visual", "script": True, "objects": [], "beats": []}
        sc.pop("script_test", None)
        res = ts.test_scene(job, i, work_dir)
        return {k: sc.get(k) for k in ("code", "graphic", "kind", "visual_file", "graphic_file", "visual_source", "script_test")} | {
            "shots": [], "av_error": "" if res.get("ok") else (res.get("error") or "animation problem")}
    old_plan = sc.get("plan") or {}
    plan = {**old_plan, "queries": block["main"] or old_plan.get("queries") or [], "by": "script",
            "avoid": block["avoid"] or old_plan.get("avoid") or [],
            "shots": _shot_positions(sc.get("narration") or "", block["shots"])}
    scene_obj = {"narration": sc.get("narration") or "", "visual": sc.get("visual") or sc.get("narration") or "",
                 "plan": plan, "topic": sc.get("topic") or {}}
    visuals = job.get("visuals") if job.get("visuals") in ("videos", "images", "both") else "videos"
    vp, kind, src = av2._scene_visual(job.get("title") or "", scene_obj, visuals, work_dir, i, used, lock,
                                      pexels_key=keys.get("pexels") or None, pixabay_key=keys.get("pixabay") or None,
                                      vertical=vertical)
    shots = []
    if kind == "clip" and plan["shots"]:
        for old in work_dir.glob(f"scene-{i:02d}-shot*.mp4"):
            old.unlink(missing_ok=True)
        shots = sm.collect_shots(job.get("title") or "", scene_obj, i, work_dir, "videos", keys.get("pexels") or None,
                                 keys.get("pixabay") or None, vertical, used, lock)
    note = f"Your plan — {len(shots)} extra shot{'s' if len(shots) != 1 else ''}"
    if block.get("bad"):
        note += f" (skipped: words not in the narration: {', '.join(block['bad'][:2])})"
    return {"plan": plan, "kind": kind, "visual_file": vp.name, "visual_source": f"{note} · {src}"[:300],
            "visual_url": src if str(src).startswith("http") else "", "shots": shots, "graphic": None, "code": None,
            "graphic_file": None, "script_test": None, "av_error": ""}


def _write_scene(job_id: str, i: int, fields: dict) -> None:
    import tools_visual as tv
    app = tv._av()
    with _LOCK:
        job = app._av_read(job_id)
        sc = job["scenes"][i]
        for k, v in fields.items():
            if v is None:
                sc.pop(k, None)
            else:
                sc[k] = v
        app._av_write(job)


def run_apply(job_id: str, indexes: list[int], keys: dict, st: dict | None = None) -> None:
    """Applies the blocks of these scenes, three at a time (downloads are the slow part).

    SPEED FIX (user, 2026-11-22): scenes ran one after another, ~1 minute
    each, so 36 scenes took ~35 minutes. Three workers share the same
    `used` set + `lock` (the dedup in _scene_visual was already built for
    parallel scenes), and _write_scene serialises the job-file writes.
    """
    import tools_visual as tv
    from concurrent.futures import ThreadPoolExecutor
    app = tv._av()
    st = st if st is not None else {}
    used: set = set()
    lock = threading.Lock()
    job = app._av_read(job_id)
    for sc in job.get("scenes") or []:  # footage other scenes use is not taken again
        if sc.get("visual_url"):
            used.add(sc["visual_url"])
    work_dir = app._av_job_dir(job_id)

    def one(k: int, i: int) -> None:
        st["stage"] = f"Getting your footage — scene {i + 1} ({k + 1} of {len(indexes)})…"
        try:
            job = app._av_read(job_id)
            fields = apply_scene(job, i, work_dir, keys, used, lock)
            _write_scene(job_id, i, {**fields, "av_pending": None})
        except Exception as exc:  # noqa: BLE001 — one scene never stops the others
            _write_scene(job_id, i, {"av_error": str(exc)[-300:]})
        with lock:
            st["done"] = st.get("done", 0) + 1

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(one, range(len(indexes)), indexes))


# ------------------------------------------------------------------ endpoints
def _job(job_id: str):
    import tools_visual as tv
    app = tv._av()
    if app is None:
        raise HTTPException(503, "The app is not ready.")
    try:
        job = app._av_read(job_id)
    except Exception:  # noqa: BLE001
        raise HTTPException(404, "Video not found.") from None
    if not job.get("scenes"):
        raise HTTPException(400, "Make step 2 first — the scenes are needed for the prompt.")
    return app, job


def _status(job_id: str, job: dict) -> dict:
    st = _STATE.get(job_id) or {}
    return {"running": bool(st.get("running")), "stage": st.get("stage", ""), "done": st.get("done", 0),
            "total": st.get("total", 0), "error": st.get("error", ""), "code": job.get("av_script_all") or "",
            "scenes": [{"index": i, "has_script": bool(sc.get("av_script")), "pending": bool(sc.get("av_pending")),
                        "error": sc.get("av_error") or "", "kind": sc.get("kind"), "visual_file": sc.get("visual_file"),
                        "visual_source": sc.get("visual_source"), "shots": len(sc.get("shots") or []),
                        "animation": bool(sc.get("code"))} for i, sc in enumerate(job.get("scenes") or [])]}


@router.get("/{job_id}")
def status(job_id: str) -> dict:
    _app, job = _job(job_id)
    return _status(job_id, job)


@router.get("/{job_id}/prompt")
def prompt(job_id: str) -> dict:
    _app, job = _job(job_id)
    return {"prompt": build_prompt(job.get("title") or "", job["scenes"])}


class SaveReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    code: str = Field(..., max_length=400000)
    pexels_key: str = Field("", max_length=200)
    pixabay_key: str = Field("", max_length=200)


@router.post("/save")
def save(req: SaveReq) -> dict:
    """Saves the pasted plan; scenes with a usable block get their footage now (in the background)."""
    import tools_script as ts
    app, job = _job(req.job_id)
    import tools_source
    code_text, found = tools_source.split_answer(req.code)
    parts = ts.parse(code_text)
    if not parts:
        raise HTTPException(400, "No scene plan found. Every scene must start with a line like  # === SCENE 1 ===")
    st = _STATE.get(req.job_id)
    if st and st.get("running"):
        raise HTTPException(409, "Your footage is still being collected — wait a moment.")
    problems, todo = [], []
    with _LOCK:
        job = app._av_read(req.job_id)
        tools_source.merge_found(job, found)
        for n, block in sorted(parts.items()):
            i = n - 1
            if not 0 <= i < len(job["scenes"]):
                continue
            sc = job["scenes"][i]
            try:
                parse_block(block, sc.get("narration") or "")
            except ValueError as exc:
                problems.append(f"Scene {n}: {exc}")
                sc["av_error"] = str(exc)
                continue
            # RESUME (user, 2026-11-22): re-saving the same plan must not
            # re-download footage a scene already has — skip it when its
            # stored plan is unchanged and its clip is already saved.
            # A "-wait.png" is only a placeholder, never saved footage.
            if (sc.get("visual_file") and not str(sc["visual_file"]).endswith("-wait.png")
                    and (sc.get("av_script") or "") == block):
                sc["av_error"] = ""
                continue
            sc["av_script"] = block
            sc["av_error"] = ""
            todo.append(i)
        job["av_script_all"] = req.code
        app._av_write(job)
    if todo:
        _STATE[req.job_id] = {"running": True, "stage": "Starting…", "done": 0, "total": len(todo), "error": ""}

        def work():
            try:
                run_apply(req.job_id, todo, {"pexels": req.pexels_key, "pixabay": req.pixabay_key}, _STATE[req.job_id])
            finally:
                _STATE[req.job_id].update(running=False, stage="Done.")
        threading.Thread(target=work, daemon=True).start()
    out = _status(req.job_id, app._av_read(req.job_id))
    return {**out, "problems": problems, "applying": len(todo), "found": len(parts)}


class AutoReq(BaseModel):
    job_id: str = Field(..., max_length=40)
    pexels_key: str = Field("", max_length=200)
    pixabay_key: str = Field("", max_length=200)


@router.post("/auto-rest")
def auto_rest(req: AutoReq) -> dict:
    """The scenes still waiting for a plan get footage found by the app itself (from their own words)."""
    import autovideo
    app, job = _job(req.job_id)
    st = _STATE.get(req.job_id)
    if st and st.get("running"):
        raise HTTPException(409, "Your footage is still being collected — wait a moment.")
    todo = []
    with _LOCK:
        job = app._av_read(req.job_id)
        for i, sc in enumerate(job["scenes"]):
            if str(sc.get("visual_file") or "").endswith("-wait.png"):
                q = autovideo.short_query(job.get("title") or "", sc.get("narration") or "")
                sc["av_script"] = f"main: {q}\n"
                todo.append(i)
        app._av_write(job)
    if not todo:
        raise HTTPException(400, "Every scene already has its footage.")
    _STATE[req.job_id] = {"running": True, "stage": "Starting…", "done": 0, "total": len(todo), "error": ""}

    def work():
        try:
            run_apply(req.job_id, todo, {"pexels": req.pexels_key, "pixabay": req.pixabay_key}, _STATE[req.job_id])
        finally:
            _STATE[req.job_id].update(running=False, stage="Done.")
    threading.Thread(target=work, daemon=True).start()
    return {**_status(req.job_id, app._av_read(req.job_id)), "applying": len(todo)}
