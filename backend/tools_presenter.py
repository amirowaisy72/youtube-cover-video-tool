"""Studio presenter voice for Auto Video (user, 2026-11-18).

"The voice is flat. Add expressions and emotions, the way a person
sitting in a studio explains something." Every sentence of a scene
gets a presenter mood from its words and punctuation — a hook is
punchy, a question is curious, a big figure is stressed, sad / danger
news is serious, the closing line is warm — and is spoken with the
same voice engines as the Animator (cloned voice with mood, Gemini /
ElevenLabs with emotion, Edge with rate / pitch / volume). Sentences
are joined with natural breathing pauses and the whole take gets a
light studio polish (clean low end, gentle compression, presence, even
loudness).

Voice ids:
  "en-US-AriaNeural"            an Edge voice (provider "edge")
  "clone:<voice id>"            a voice from the Voice Cloner
  any other id + a provider     Google / Unreal / ElevenLabs / Gemini
"""

from __future__ import annotations

import re
import wave
from array import array
from pathlib import Path

#                rate  pitch(Hz) volume  clone exaggeration   animator mood (cloned / Gemini / ElevenLabs)
_MOODS = {
    "normal":   (2,    0,        0,      0.5,                 "normal"),
    "warm":     (-2,   2,        0,      0.55,                "happy"),
    "excited":  (9,    10,       12,     0.85,                "excited"),
    "curious":  (0,    8,        0,      0.6,                 "surprised"),
    "serious":  (-8,   -6,       -2,     0.45,                "calm"),
    "emphatic": (4,    4,        14,     0.8,                 "happy"),
}
_SERIOUS = re.compile(r"\b(died|dies|death|dead|war|wars|danger|dangerous|deadly|disaster|tragic|tragedy|killed|kill|"
                      r"sad|lost|loss|crisis|warning|poison|toxic|fear|scary|terrible|collapse|crash|debt|broke)\b", re.I)
_BIG = re.compile(r"\d|\b(million|billion|trillion|never|only|most|biggest|largest|smallest|fastest|first|secret|"
                  r"incredible|amazing|shocking|imagine|unbelievable|insane|huge|massive|every single|exactly)\b", re.I)


def sentence_mood(sentence: str, index: int, count: int, first_scene: bool, last_scene: bool) -> str:
    s = sentence.strip()
    if first_scene and index == 0:
        return "excited" if s.endswith(("!", "?")) else "emphatic"  # the hook
    if s.endswith("?"):
        return "curious"
    if _SERIOUS.search(s):
        return "serious"
    if "!" in s:
        return "excited"
    if _BIG.search(s):
        return "emphatic"
    if last_scene and index == count - 1:
        return "warm"
    return "normal"


def _prosody(mood: str) -> dict:
    rate, pitch, volume, exag, label = _MOODS.get(mood, _MOODS["normal"])
    return {"rate": f"{rate:+d}%", "pitch": f"{pitch:+d}Hz", "volume": f"{volume:+d}%",
            "exaggeration": exag, "fx": "", "label": label}


def _sentences(text: str) -> list[str]:
    parts = [p.strip() for p in re.split(r"(?<=[.!?…])\s+", " ".join((text or "").split())) if p.strip()]
    return parts or ([text.strip()] if text and text.strip() else [])


def _char_for(voice: str, provider: str) -> dict:
    if voice.startswith("clone:"):
        return {"name": "Presenter", "voice": {"type": "clone", "id": voice.split(":", 1)[1]}}
    if provider and provider != "edge":
        return {"name": "Presenter", "voice": {"type": "provider", "provider": provider, "id": voice}}
    label = "female" if re.search(r"(Aria|Jenny|Sara|Ava|Emma|Michelle|Sonia|Libby|Natasha|Neerja|Uzma|Gul|Swara)", voice) else "male"
    return {"name": "Presenter", "voice": {"type": "edge", "id": voice, "label": label}}


def presenter_voice(index: int, narration: str, voice: str, work_dir: Path, provider: str = "edge",
                    key: str | None = None, first_scene: bool = False, last_scene: bool = False) -> tuple[Path, str]:
    """Speak one scene like a studio presenter. Returns (mp3 path, engine)."""
    import tools_animator as ta
    work_dir.mkdir(parents=True, exist_ok=True)
    tmp = work_dir / f"presenter-{index:02d}"
    tmp.mkdir(exist_ok=True)
    char = _char_for(voice, provider)
    language = "ur" if voice.startswith("ur-") else "en"
    keys = {provider: key} if key and provider else {}
    sents = _sentences(narration)
    # neighbouring sentences with the same mood are spoken together (a natural flow)
    runs: list[tuple[str, str]] = []
    for i, s in enumerate(sents):
        mood = sentence_mood(s, i, len(sents), first_scene, last_scene)
        if runs and runs[-1][0] == mood and len(runs[-1][1]) + len(s) < 260:
            runs[-1] = (mood, runs[-1][1] + " " + s)
        else:
            runs.append((mood, s))
    rate = ta.SAMPLE_RATE
    out = array("h")
    engines: list[str] = []
    timing: list[dict] = []  # when each mood is spoken (the studio presenter acts it)
    for k, (mood, text) in enumerate(runs):
        wav = tmp / f"run-{k:02d}.wav"
        engine = ta._voice_line(text, char, language, index * 100 + k, wav, tmp, keys, _prosody(mood),
                                acting=char["voice"]["type"] == "clone")
        engines.append(engine)
        pcm = ta._read_pcm(wav)
        # trim the engine's own silence at both ends, then add a presenter's breath
        lo, hi = 0, len(pcm)
        while lo < hi and abs(pcm[lo]) < 300:
            lo += 1
        while hi > lo and abs(pcm[hi - 1]) < 300:
            hi -= 1
        lo, hi = max(0, lo - int(rate * 0.03)), min(len(pcm), hi + int(rate * 0.06))
        t0 = len(out) / rate
        out.extend(pcm[lo:hi])
        timing.append({"start": round(t0, 2), "end": round(len(out) / rate, 2), "mood": mood, "text": text[:200]})
        pause = 0.42 if text.rstrip().endswith("?") else 0.34 if mood != (runs[k + 1][0] if k + 1 < len(runs) else mood) else 0.24
        if k + 1 < len(runs):
            out.extend(array("h", [0]) * int(rate * pause))
    out.extend(array("h", [0]) * int(rate * 0.15))
    raw = tmp / "take.wav"
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(out.tobytes())
    mp3 = work_dir / f"scene-{index:02d}-presenter.mp3"
    # studio polish: clean low end, gentle compression, a touch of presence, even loudness
    ta._run_ffmpeg(["-i", str(raw), "-af",
                    "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=8:release=120,"
                    "equalizer=f=3200:t=q:w=1.2:g=2,loudnorm=I=-16:TP=-1.5:LRA=9",
                    "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "160k", str(mp3)])
    import json
    mp3.with_suffix(".json").write_text(json.dumps(timing), encoding="utf-8")
    for f in tmp.glob("*"):
        f.unlink(missing_ok=True)
    tmp.rmdir()
    engine = max(set(engines), key=engines.count) if engines else "edge-tts"
    return mp3, f"{engine} (studio presenter)"
