"""YT Guru's program for Google Colab: one server for every tool that needs the GPU.
Today: cloned and acting voices.

The SAME Chatterbox Multilingual model the app uses on your computer —
the app sends the text, the voice sample and the exact settings; this
only does the heavy part (the AI) on the GPU and sends the sound back."""
import base64, os, threading, time
from pathlib import Path
import numpy as np
import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

TOKEN = os.environ.get("YTGURU_TOKEN", "")
REFS = Path(os.environ.get("YTGURU_REFS", "/content/ytguru_refs")); REFS.mkdir(parents=True, exist_ok=True)
app = FastAPI()
VERSION = 2
TOOLS = ["voices"]
_lock = threading.Lock()
_model = None
_conds: dict = {}
_cap = {"n": 0}


def model():
    global _model
    if _model is None:
        import perth
        if getattr(perth, "PerthImplicitWatermarker", None) is None:
            class _No:
                def __init__(self, *a, **k): pass
                def apply_watermark(self, wav, *a, **k): return wav
            perth.PerthImplicitWatermarker = getattr(perth, "DummyWatermarker", None) or _No
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        dev = "cuda" if torch.cuda.is_available() else "cpu"
        try:
            _model = ChatterboxMultilingualTTS.from_pretrained(device=dev, t3_model="v3")
        except TypeError:
            _model = ChatterboxMultilingualTTS.from_pretrained(device=dev)
        orig = _model.t3.inference
        def inference(*a, **k):
            if _cap["n"] and k.get("max_new_tokens"):
                k["max_new_tokens"] = min(int(k["max_new_tokens"]), _cap["n"])
            return orig(*a, **k)
        _model.t3.inference = inference
    return _model


def check(tok):
    if TOKEN and tok != TOKEN:
        raise HTTPException(403, "wrong token")


class Ref(BaseModel):
    sha: str
    wav_b64: str


class Gen(BaseModel):
    text: str
    sha: str
    language_id: str = "en"
    exaggeration: float = 0.5
    cfg_weight: float = 0.5
    temperature: float = 0.8
    repetition_penalty: float = 2.0
    max_new_tokens: int = 1000


@app.get("/health")
def health(x_token: str = Header("")):
    check(x_token)
    m = model()
    gpu = torch.cuda.is_available()
    return {"ok": True, "gpu": gpu, "gpu_name": torch.cuda.get_device_name(0) if gpu else "", "sr": m.sr,
            "version": VERSION, "tools": TOOLS}


@app.post("/ref")
def ref(r: Ref, x_token: str = Header("")):
    check(x_token)
    (REFS / f"{r.sha[:40]}.wav").write_bytes(base64.b64decode(r.wav_b64))
    return {"ok": True}


@app.post("/gen")
def gen(g: Gen, x_token: str = Header("")):
    check(x_token)
    f = REFS / f"{g.sha[:40]}.wav"
    if not f.exists():
        raise HTTPException(404, "send the voice sample first")
    m = model()
    with _lock:
        if g.sha not in _conds:
            m.prepare_conditionals(str(f), exaggeration=g.exaggeration)
            _conds[g.sha] = m.conds
        m.conds = _conds[g.sha]
        _cap["n"] = int(g.max_new_tokens)
        try:
            try:
                wav = m.generate(g.text, language_id=g.language_id, exaggeration=g.exaggeration,
                                 cfg_weight=g.cfg_weight, temperature=g.temperature,
                                 repetition_penalty=g.repetition_penalty)
            except TypeError:
                wav = m.generate(g.text, language_id=g.language_id, exaggeration=g.exaggeration,
                                 cfg_weight=g.cfg_weight)
        finally:
            _cap["n"] = 0
    sig = wav.squeeze().detach().cpu().numpy().astype("<f4")
    return {"sr": int(m.sr), "wav_b64": base64.b64encode(sig.tobytes()).decode()}


# ---- the whole line in ONE call (2026-11-19): the same up-to-3 takes, the same
# "clean take" check and tail cut the app does — but here, so the free link is
# crossed once per line instead of once per take. Same quality, less waiting.
SR_OUT = 24000


def _cut_tail(sig, expected):
    hop = SR_OUT // 50
    if len(sig) < hop * 10:
        return sig
    frames = len(sig) // hop
    rms = np.sqrt(np.mean(sig[: frames * hop].reshape(frames, hop) ** 2, axis=1))
    loud = rms > max(0.01, float(np.max(rms)) * 0.06)
    start_check = int(expected * 0.7 * 50)
    quiet_run = 0
    for i in range(min(start_check, frames), frames):
        quiet_run = quiet_run + 1 if not loud[i] else 0
        if quiet_run >= 18:
            return sig[: (i - quiet_run + 6) * hop]
    limit = int((expected * 2.0 + 0.6) * SR_OUT)
    if len(sig) > limit:
        sig = sig[:limit].copy()
        fade = min(len(sig), SR_OUT // 10)
        sig[-fade:] *= np.linspace(1, 0, fade)
    return sig


class Best(BaseModel):
    text: str
    sha: str
    language_id: str = "en"
    exag: float = 0.45
    expected: float = 2.0
    max_new_tokens: int = 1000


@app.post("/best")
def best(g: Best, x_token: str = Header("")):
    check(x_token)
    f = REFS / f"{g.sha[:40]}.wav"
    if not f.exists():
        raise HTTPException(404, "send the voice sample first")
    m = model()
    t0 = time.time()
    best_take = None
    takes = 0
    with _lock:
        for attempt in range(3):
            ex = max(0.3, g.exag - 0.12 * attempt)
            cfg = 0.4 if g.exag >= 0.7 else 0.5
            if g.sha not in _conds:
                m.prepare_conditionals(str(f), exaggeration=ex)
                _conds[g.sha] = m.conds
            m.conds = _conds[g.sha]
            _cap["n"] = int(g.max_new_tokens)
            try:
                try:
                    wav = m.generate(g.text, language_id=g.language_id, exaggeration=ex, cfg_weight=cfg,
                                     temperature=0.65 - 0.1 * attempt, repetition_penalty=1.6)
                except TypeError:
                    wav = m.generate(g.text, language_id=g.language_id, exaggeration=ex, cfg_weight=cfg)
            finally:
                _cap["n"] = 0
            takes += 1
            sig = wav.squeeze().detach().cpu().numpy().astype(np.float32)
            if m.sr != SR_OUT:
                idx = np.linspace(0, len(sig) - 1, int(len(sig) * SR_OUT / m.sr))
                sig = np.interp(idx, np.arange(len(sig)), sig).astype(np.float32)
            sig = _cut_tail(sig, g.expected)
            dur = len(sig) / SR_OUT
            score = abs(dur - g.expected) / g.expected
            if best_take is None or score < best_take[0]:
                best_take = (score, sig)
            if dur <= g.expected * 1.7 + 0.5:
                break
    sig = best_take[1].astype("<f4")
    return {"sr": SR_OUT, "wav_b64": base64.b64encode(sig.tobytes()).decode(), "gpu_secs": round(time.time() - t0, 2), "takes": takes}
