"""Dashboard settings that live on this computer (user, 2026-11-19:
"one page where I can see what is configured and what is left").

Most API keys are kept in the browser (the same shared keys every tool
already reads). The few settings the BACKEND itself needs are kept
here:

  GET    /api/animator/config/colab      -> is the Colab GPU voice link set, and does it answer?
  POST   /api/animator/config/colab      {line: "<url> <token>"} -> save + test
  DELETE /api/animator/config/colab      -> back to this computer only
  GET/POST /api/animator/config/av-style {graphics: few|medium|many|all} -> Auto Video graphics amount
  POST   /api/animator/config/test-key   {kind: "gemini", key} -> is the key accepted?
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/animator/config", tags=["config"])


def _ta():
    import tools_animator
    return tools_animator


def _colab_file():
    return _ta().BASE_DIR / "colab_voice.txt"


def _colab_health(url: str, token: str) -> dict:
    req = urllib.request.Request(url.rstrip("/") + "/health",
                                 headers={"X-Token": token, "User-Agent": "YTGuru"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode())
        return {"ok": True, "gpu": bool(data.get("gpu")), "error": ""}
    except urllib.error.HTTPError as exc:
        why = "wrong code (copy the WHOLE line again)" if exc.code == 403 else f"error {exc.code}"
        return {"ok": False, "gpu": False, "error": why}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "gpu": False,
                "error": f"not reachable — is the Colab tab still running? ({str(exc)[:80]})"}


@router.get("/colab")
def colab_status() -> dict:
    f = _colab_file()
    parts = f.read_text(encoding="utf-8", errors="ignore").split() if f.exists() else []
    if len(parts) < 2 or not parts[0].startswith("http"):
        return {"set": False, "url": "", "ok": False, "gpu": False, "error": ""}
    return {"set": True, "url": parts[0], **_colab_health(parts[0], parts[1])}


class ColabLine(BaseModel):
    line: str = Field(..., min_length=10, max_length=400)


@router.post("/colab")
def colab_save(body: ColabLine) -> dict:
    parts = body.line.strip().split()
    if len(parts) < 2 or not parts[0].startswith("https://"):
        raise HTTPException(400, "Paste the whole line the Colab notebook printed: the https://… link, a space, then the code.")
    url, token = parts[0].rstrip("/"), parts[1]
    _colab_file().write_text(f"{url} {token}\n", encoding="utf-8")
    ta = _ta()
    ta._COLAB_STATE["dead_until"] = 0.0  # use it right away
    ta._COLAB_STATE["sent"].clear()
    ta._COLAB_STATE.pop("no_best", None)
    return {"set": True, "url": url, **_colab_health(url, token)}


@router.delete("/colab")
def colab_remove() -> dict:
    _colab_file().unlink(missing_ok=True)
    return {"set": False, "url": "", "ok": False, "gpu": False, "error": ""}


class KeyTest(BaseModel):
    kind: str = Field(..., max_length=20)
    key: str = Field(..., min_length=5, max_length=200)


class StyleReq(BaseModel):
    graphics: str = Field("medium", pattern="^(few|medium|many|all)$")
    theme: str | None = Field(None, pattern="^(classic|docu|visual)$")
    gemini_key: str | None = Field(None, max_length=200)
    sources: list[str] | None = Field(None, max_length=8)
    design: str | None = Field(None, pattern="^(gemini|script)$")  # Visual Explainer: Gemini designs, or the user's scene code
    av_design: str | None = Field(None, pattern="^(auto|script)$")  # Auto Video: the app finds the footage, or the user's AI plans it


@router.get("/av-style")
def av_style() -> dict:
    """Auto Video look: how many scenes become motion graphics."""
    import tools_graphics
    return {**tools_graphics.style(), "installed": tools_graphics.available()}


@router.post("/av-style")
def set_av_style(req: StyleReq) -> dict:
    import tools_graphics
    if req.gemini_key is not None:  # Auto Video / Visual Explainer use your Gemini key too (it was Story-Animator-only)
        _set_ai_key(req.gemini_key)
    return {**tools_graphics.save_style(req.graphics, req.theme, [u[:500] for u in req.sources] if req.sources is not None else None,
                                        req.design, req.av_design),
            "installed": tools_graphics.available()}


def _set_ai_key(key: str) -> None:
    try:
        import tools_animator as ta
        ta._AI["gemini_key"] = (key or "").strip()
    except Exception:  # noqa: BLE001
        pass


class AiKeyReq(BaseModel):
    gemini_key: str = Field("", max_length=200)


@router.get("/ai-status")
def ai_status() -> dict:
    """Which AI writes right now (your Gemini key or the free Pollinations AI), why, and when Gemini is tried again."""
    import tools_animator as ta
    return ta.ai_status()


@router.post("/ai-status/retry")
def ai_retry() -> dict:
    import tools_animator as ta
    return ta.ai_retry_now()


class AiSettings(BaseModel):
    model: str = Field("", max_length=60)
    gemini_only: bool = False
    gemini_key: str | None = Field(None, max_length=200)


@router.post("/ai-settings")
def ai_settings(req: AiSettings) -> dict:
    """Which Gemini model to use ("" = best available, tried in order) and whether to use ONLY Gemini (never the free AI)."""
    import tools_animator as ta
    if req.gemini_key is not None:
        _set_ai_key(req.gemini_key)
    ta._AI["gemini_model"] = req.model.strip() if req.model.strip().startswith("gemini") else ""
    ta._AI["gemini_only"] = bool(req.gemini_only)
    return ta.ai_status()


@router.get("/ai-models")
def ai_models() -> dict:
    import tools_animator as ta
    key = str(ta._AI.get("gemini_key") or "")
    if not key:
        raise HTTPException(400, "Add your Gemini key first.")
    try:
        return {"models": ta.gemini_models(key), "default_order": ta.GEMINI_MODELS}
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from None


class ModelTest(BaseModel):
    model: str = Field(..., max_length=60)


@router.post("/ai-models/test")
def ai_model_test(req: ModelTest) -> dict:
    import tools_animator as ta
    key = str(ta._AI.get("gemini_key") or "")
    if not key:
        raise HTTPException(400, "Add your Gemini key first.")
    return ta.gemini_test(key, req.model)


@router.post("/ai-key")
def ai_key(req: AiKeyReq) -> dict:
    _set_ai_key(req.gemini_key)
    import tools_animator as ta
    return ta.ai_status()


@router.post("/test-key")
def test_key(body: KeyTest) -> dict:
    """Checks a key without spending its quota (a model list call)."""
    if body.kind not in ("gemini", "youtube"):
        raise HTTPException(400, "unknown key kind")
    url = ("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=" if body.kind == "gemini"
           else "https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=") + body.key.strip()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "YTGuru"}), timeout=15):
            return {"valid": True, "reason": ""}
    except urllib.error.HTTPError as exc:
        if exc.code in (400, 401, 403):
            return {"valid": False, "reason": "invalid"}
        return {"valid": False, "reason": f"unverified ({exc.code})"}
    except Exception:  # noqa: BLE001
        return {"valid": False, "reason": "unverified"}
