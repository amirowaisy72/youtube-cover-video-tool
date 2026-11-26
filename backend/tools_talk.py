"""YT Guru — Talking Presenter, steps 1–3: video link -> transcript -> your own script -> voiceover.

  GET    /api/presenter/jobs                    the recent ones
  POST   /api/presenter/jobs          {url}     new: download only the audio and transcribe it
  GET    /api/presenter/jobs/{id}
  POST   /api/presenter/jobs/{id}/link   {url}  step 1 again (also after a failure)
  POST   /api/presenter/source/file     file[, job, url]     step 1 from a video/audio file of your own
  POST   /api/presenter/source/text     {text, job, url, title}  step 1 from a pasted transcript
  POST   /api/presenter/jobs/{id}/stop          stop the step that is running
  GET    /api/presenter/jobs/{id}/prompt        the "rewrite in my own words" prompt for any AI
  POST   /api/presenter/jobs/{id}/script {text, mode}
  POST   /api/presenter/jobs/{id}/voice  {provider, voice, key, again}
  POST   /api/presenter/jobs/{id}/voice-original        the video's own sound is the voice
  POST   /api/presenter/jobs/{id}/voice-file   file     your own recording is the voice
  POST   /api/presenter/jobs/{id}/fetch-audio           get the original sound again (older videos)
  GET    /api/presenter/jobs/{id}/audio         the finished voiceover
  DELETE /api/presenter/jobs/{id}

Every step is kept (the transcript, each voiced part), so redoing one never repeats the others, and a
stopped or interrupted voiceover carries on from the parts already made. The original video's link is
kept in the job's Sources. The transcript is source material: the page asks for a rewrite.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import threading
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/presenter", tags=["talking-presenter"])

PART_CHARS = 600          # one voiced part: small enough to resume, long enough to flow
GAP_SECONDS = 0.35        # the breath between two parts
AUDIO_VOICES = ("original", "upload")  # the voice is a recording, not one made from the script
_lock = threading.Lock()
_running: dict[str, threading.Event] = {}   # job id -> its stop flag
PUBLIC_EXTRAS: list = []                    # steps 4-9 add what the page needs (presenter_routes.py)


class Stop(BaseException):
    """The user pressed Stop (not an Exception, so no fallback swallows it)."""


def _root() -> Path:
    import tools_animator as ta
    path = ta.BASE_DIR / "presenter"
    path.mkdir(parents=True, exist_ok=True)
    return path


def audio_dir() -> Path:
    """Where the original sound of the videos is kept: beside the presenter's model files (not on the system drive)."""
    import presenter_models
    path = presenter_models.folder().parent / "audio"
    path.mkdir(parents=True, exist_ok=True)
    return path


def original_audio(job_id: str) -> Path | None:
    _dir(job_id)  # the id is checked
    f = audio_dir() / f"{job_id}.mp3"
    return f if f.exists() else None


def remove_audio(job_id: str) -> None:
    f = original_audio(job_id)
    if f:
        f.unlink(missing_ok=True)


def keep_audio(job_id: str, source: Path) -> bool:
    """Save the sound of a downloaded or uploaded file (the picture, if any, is dropped)."""
    import tools_animator as ta
    target = audio_dir() / f"{job_id}.mp3"
    part = target.with_name(f"{job_id}.part.mp3")
    try:
        ta._run_ffmpeg(["-i", str(source), "-vn", "-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", str(part)],
                       timeout=1800)
        part.replace(target)
        return True
    except Exception as exc:  # noqa: BLE001 — the words are still usable without it
        print("original audio not kept:", str(exc)[-300:])
        part.unlink(missing_ok=True)
        return False


def _dir(job_id: str) -> Path:
    if not re.fullmatch(r"[a-f0-9]{12}", job_id or ""):
        raise HTTPException(404, "That presenter video does not exist.")
    return _root() / job_id


def read(job_id: str) -> dict:
    try:
        return json.loads((_dir(job_id) / "job.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise HTTPException(404, "That presenter video does not exist.") from None


def write(job: dict) -> None:
    path = _dir(job["id"])
    path.mkdir(parents=True, exist_ok=True)
    tmp = path / "job.json.tmp"
    tmp.write_text(json.dumps(job, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(path / "job.json")


def update(job_id: str, **changes) -> dict:
    with _lock:
        job = read(job_id)
        job.update(changes)
        write(job)
        return job


def public(job: dict) -> dict:
    busy = job["id"] in _running
    if job.get("status") == "working" and not busy:  # the app was closed in the middle
        job = {**job, "status": "stopped", "stage": "The app was closed during this step. Start it again: finished parts are kept."}
    fresh = job.get("voice_for") == voice_stamp(job.get("script", ""), job.get("voice") or {})
    try:
        kept = original_audio(job["id"]) is not None
    except (OSError, HTTPException):
        kept = False
    out = {**job, "voice_ready": bool(job.get("voice_file")) and fresh,
           "voice_outdated": bool(job.get("voice_file")) and not fresh, "has_original": kept}
    out.pop("words", None)  # word timings stay on this side: the page does not need them
    for more in PUBLIC_EXTRAS:
        try:
            out.update(more(job))
        except Exception as exc:  # noqa: BLE001 — the first three steps must keep working
            out["setup_error"] = str(exc)[:200]
    return out


def start(job_id: str, step: str, work) -> None:
    """Run one long step in the background, with a Stop flag."""
    with _lock:
        if job_id in _running:
            raise HTTPException(409, "A step is still running. Wait for it, or press Stop.")
        flag = _running[job_id] = threading.Event()
    update(job_id, status="working", step_working=step, progress=0, stage="Starting…", error="", notice="")

    def run():
        import colab_link
        import presenter_video
        colab_link.set_stop_check(flag.is_set)
        try:
            work(flag)
            update(job_id, status="idle", step_working="", progress=100, stage="")
        except (Stop, colab_link.Stopped, presenter_video.Stop):
            update(job_id, status="stopped", stage="Stopped. Finished parts are kept.")
        except HTTPException:
            pass  # deleted while running
        except Exception as exc:  # noqa: BLE001 — shown on the page, never silent
            try:
                update(job_id, status="failed", stage="This step failed.", error=str(exc)[-600:])
            except HTTPException:
                pass
        finally:
            colab_link.set_stop_check(None)
            _running.pop(job_id, None)

    threading.Thread(target=run, daemon=True, name=f"presenter-{job_id}").start()


# ------------------------------------------------------------------ step 1: link -> transcript
def check_url(url: str) -> str:
    url = str(url or "").strip()
    if not re.match(r"(?i)^https?://[^\s/]+\.[^\s]+$", url):
        raise HTTPException(400, "Paste a full video link that starts with https://")
    return url


def download_audio(url: str, folder: Path, flag: threading.Event, progress, note=None) -> tuple[Path, dict]:
    """Only the sound of the video (never the picture) -> (file, what the site says about it)."""
    import ytdl

    def hook(d: dict) -> None:
        if flag.is_set():
            raise Stop()
        total = d.get("total_bytes") or d.get("total_bytes_estimate")
        if total:
            progress(min(1.0, (d.get("downloaded_bytes") or 0) / total))

    for old in folder.glob("source.*"):
        old.unlink(missing_ok=True)
    opts = {"format": "bestaudio[ext=m4a]/bestaudio/best", "outtmpl": str(folder / "source.%(ext)s"),
            "progress_hooks": [hook]}
    info = ytdl.run(url, opts, note=note) or {}
    files = [p for p in folder.glob("source.*") if p.suffix.lower() not in (".part", ".ytdl")]
    if not files:
        raise RuntimeError("No sound could be downloaded from this link.")
    return files[0], {"title": str(info.get("title") or "")[:200], "channel": str(info.get("uploader") or info.get("channel") or "")[:100],
                      "duration": float(info.get("duration") or 0), "page": str(info.get("webpage_url") or url)}


def transcribe(audio: Path, flag: threading.Event, progress) -> tuple[list[dict], str]:
    """The Subtitles tool's own speech recogniser (free, on this computer) -> ([{start, end, text}], language)."""
    import tools_subtitles as subs
    model = subs._get_model()
    sound = subs._decode_for_whisper(audio)
    total = len(sound) / 16000 or 1.0
    found, info = model.transcribe(sound, beam_size=5)
    out = []
    for seg in found:
        if flag.is_set():
            raise Stop()
        out.append({"start": round(float(seg.start), 2), "end": round(float(seg.end), 2), "text": seg.text.strip()})
        progress(min(1.0, seg.end / total))
    return out, str(info.language)


def paragraphs(segments: list[dict]) -> str:
    """The recognised pieces as readable paragraphs (a new one after a pause, or after a few sentences)."""
    out, cur, last_end = [], [], 0.0
    for s in segments:
        text = s["text"].strip()
        if not text:
            continue
        length = sum(len(t) for t in cur)
        if cur and (s["start"] - last_end > 1.6 and length > 120 or length > 420 and cur[-1].endswith((".", "?", "!"))
                    or length > 800):
            out.append(" ".join(cur))
            cur = []
        cur.append(text)
        last_end = s["end"]
    if cur:
        out.append(" ".join(cur))
    return "\n\n".join(out)


def _transcript_step(job_id: str, url: str):
    def work(flag):
        folder = _dir(job_id)
        update(job_id, stage="Downloading the sound of the video…")
        shown = [0.0]

        def part(base, share, label):
            def report(f):
                if time.time() - shown[0] > 0.7 or f >= 1:
                    shown[0] = time.time()
                    update(job_id, progress=round(base + share * f, 1), stage=label)
            return report

        audio, info = download_audio(url, folder, flag, part(0, 20, "Downloading the sound of the video…"),
                                     note=lambda text: update(job_id, stage=text))
        minutes = info["duration"] / 60
        update(job_id, **{k: info[k] for k in ("title", "channel", "duration")}, url=info["page"],
               stage="Loading the speech recogniser (about 75 MB, downloaded once)…")
        label = "Writing down the words" + (f" (a {minutes:.0f} minute video)" if minutes >= 2 else "") + "…"
        segments, language = transcribe(audio, flag, part(20, 80, label))
        remove_audio(job_id)
        keep_audio(job_id, audio)
        audio.unlink(missing_ok=True)
        if not segments:
            raise RuntimeError("No speech was found in this video.")
        keep_transcript(job_id, segments, language, paragraphs(segments), info["page"], info["title"], info["channel"])
    return work


def keep_transcript(job_id: str, segments: list[dict], language: str, text: str, page: str = "", title: str = "",
                    channel: str = "") -> None:
    """Save step 1's result; the original video's address (when known) goes into Sources."""
    job = read(job_id)
    others = [s for s in job.get("sources") or [] if s.get("url") not in (page, job.get("source_url"))]
    if page:
        fact = re.sub(r'["“”«»|]', "'", f"Original video: {title or 'untitled'}" + (f" ({channel})" if channel else ""))[:200]
        others = [{"url": page, "quote": "", "fact": fact}, *others]
    update(job_id, segments=segments, language=language, transcript=text, sources=others, source_url=page,
           script="", script_mode="", voice_for="", voice_file="")


def _file_step(job_id: str, name: str, page: str):
    def work(flag):
        folder = _dir(job_id)
        media = folder / name
        update(job_id, stage="Loading the speech recogniser (about 75 MB, downloaded once)…")
        shown = [0.0]

        def report(f):
            if time.time() - shown[0] > 0.7 or f >= 1:
                shown[0] = time.time()
                update(job_id, progress=round(100 * f, 1), stage="Writing down the words of your file…")
        try:
            try:
                segments, language = transcribe(media, flag, report)
            except Stop:
                raise
            except Exception as exc:  # noqa: BLE001
                raise RuntimeError("The sound of this file could not be read. Use a video or audio file that plays on "
                                   f"your computer (MP4, MP3, M4A, WAV…). ({str(exc)[-150:]})") from None
            remove_audio(job_id)
            keep_audio(job_id, media)
        finally:
            media.unlink(missing_ok=True)
        if not segments:
            raise RuntimeError("No speech was found in this file.")
        job = read(job_id)
        keep_transcript(job_id, segments, language, paragraphs(segments), page, job.get("title", ""))
        update(job_id, duration=segments[-1]["end"])
    return work


_STAMP = re.compile(r"^\s*[\[(]?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,]\d+)?[\])]?(?:\s*-->.*)?\s*[-–—]?\s*")


def read_pasted(text: str) -> tuple[list[dict], str]:
    """A pasted transcript (with or without times, e.g. from YouTube's "Show transcript" or an .srt file)
    -> (pieces, readable text). A piece without a time has start -1."""
    pieces: list[dict] = []
    pending = -1.0
    for line in str(text or "").replace("\r\n", "\n").split("\n"):
        line = line.strip()
        if not line or line.isdigit() or line.upper() == "WEBVTT":
            continue
        found = _STAMP.match(line)
        if found:
            h, m, s = (int(x or 0) for x in found.groups())
            pending = h * 3600 + m * 60 + s
            line = line[found.end():].strip()
            if not line:
                continue
        line = re.sub(r"<[^>]{0,60}>", "", line).strip()
        if line:
            pieces.append({"start": float(pending), "end": float(pending), "text": line})
            pending = -1.0
    if any(p["start"] >= 0 for p in pieces):  # captions: short lines are joined into paragraphs
        last, timed = 0.0, []
        for p in pieces:
            last = p["start"] if p["start"] >= 0 else last
            timed.append({**p, "start": last, "end": last})
        return timed, paragraphs(timed)
    return pieces, "\n\n".join(p["text"] for p in pieces)


def _new_job(url: str = "", title: str = "") -> str:
    job_id = uuid.uuid4().hex[:12]
    write({"id": job_id, "url": url, "title": title, "created": time.time(), "status": "idle", "sources": [], "transcript": "",
           "script": "", "script_mode": "", "voice": None, "voice_file": ""})
    return job_id


# ------------------------------------------------------------------ step 2: your own script
def rewrite_prompt(job: dict) -> str:
    words = len(job.get("transcript", "").split())
    language = job.get("language") or "the same language as the transcript"
    return f'''You are writing the narration for MY OWN YouTube video. Below is a transcript of someone else's video.
It is only research material: do not copy it.

WRITE A NEW SCRIPT IN MY OWN WORDS:
- Keep the facts and numbers that matter. Do not add facts that are not in the transcript. If something sounds wrong
  or unsure, say it carefully or leave it out.
- New opening (a strong hook in the first sentence), my own order, my own examples, a clear ending.
- Never reuse a sentence or a phrase of more than five words from the transcript.
- Do not pretend to be the original speaker, and remove their greetings, sponsor messages and "subscribe" requests.
- Plain spoken language for a voiceover: short sentences, numbers written as people say them.
- Length: about {max(80, words)} words. Language code: {language}.
- ANSWER WITH THE NARRATION ONLY, in short paragraphs. No title, no headings, no scene notes, no lists, no markdown.

ORIGINAL VIDEO (for your information): {job.get("title", "")}

TRANSCRIPT:
{job.get("transcript", "")}
'''


def clean_script(text: str) -> str:
    """An AI's answer (or typed text) as plain narration."""
    t = str(text or "").replace("\r\n", "\n").strip()
    block = re.search(r"```[a-zA-Z]*\n(.*?)```", t, re.S)
    if block and len(block.group(1).strip()) > 0.5 * len(t.replace("`", "")):
        t = block.group(1)
    out = []
    for line in t.split("\n"):
        s = line.strip().strip("`")
        if re.match(r"^(#{1,6}\s|---+$|===+$|\*\*\*+$)", s) or re.fullmatch(r"\*\*[^*]{1,80}\*\*:?", s):
            continue  # headings and dividers are not spoken
        if re.match(r"(?i)^(sure|certainly|here(’|'| i)s|here is|okay|absolutely)\b.{0,120}:$", s):
            continue
        s = re.sub(r"(?i)^\**(narrator|narration|voice ?over|host|script)\**\s*:\s*\**", "", s)
        s = re.sub(r"\[[^\]\n]{0,120}\]", "", s)  # [stage directions]
        s = re.sub(r"[*_`#]+", "", s)
        out.append(re.sub(r"[ \t]+", " ", s).strip())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def copied_share(script: str, transcript: str, run: int = 6) -> int:
    """Percent of the script that is still word for word from the transcript (runs of `run` words)."""
    a = re.findall(r"[\w']+", script.lower())
    b = re.findall(r"[\w']+", transcript.lower())
    if len(a) < run or len(b) < run:
        return 100 if a and " ".join(a) in " ".join(b) else 0
    seen = {tuple(b[i:i + run]) for i in range(len(b) - run + 1)}
    hit = [False] * len(a)
    for i in range(len(a) - run + 1):
        if tuple(a[i:i + run]) in seen:
            hit[i:i + run] = [True] * run
    return round(100 * sum(hit) / len(a))


# ------------------------------------------------------------------ step 3: voiceover
def split_parts(script: str, limit: int = PART_CHARS) -> list[str]:
    out: list[str] = []
    for para in re.split(r"\n\s*\n|\n", script):
        cur = ""
        for sentence in re.split(r"(?<=[.!?…۔؟])\s+", para.strip()):
            while len(sentence) > limit:  # a sentence with no end: cut at a space
                cut = sentence.rfind(" ", 0, limit)
                cut = cut if cut > limit // 2 else limit
                if cur:
                    out.append(cur)
                    cur = ""
                out.append(sentence[:cut].strip())
                sentence = sentence[cut:].strip()
            if cur and len(cur) + len(sentence) + 1 > limit:
                out.append(cur)
                cur = ""
            cur = f"{cur} {sentence}".strip()
        if cur:
            out.append(cur)
    return out


def voice_stamp(script: str, voice: dict) -> str:
    if voice.get("provider") in AUDIO_VOICES:
        script = ""  # a recording stays the same when the written words are corrected
    return hashlib.sha1(json.dumps([script, voice.get("provider"), voice.get("voice")]).encode()).hexdigest()


def board_stamp(job: dict) -> str:
    """What the storyboard was made from: it is made again when the voice or the words change."""
    stamp = job.get("voice_for") or ""
    if (job.get("voice") or {}).get("provider") in AUDIO_VOICES:
        stamp += ":" + hashlib.sha1(str(job.get("script", "")).encode()).hexdigest()[:12]
    return stamp


def same_words(a: str, b: str) -> float:
    """How alike two texts are, word for word (0..1)."""
    import difflib
    wa, wb = re.findall(r"[\w']+", a.lower()), re.findall(r"[\w']+", b.lower())
    return difflib.SequenceMatcher(None, wa, wb, autojunk=False).ratio() if wa and wb else 0.0


def _use_audio(job_id: str, source: Path, provider: str, flag, heard: str = "") -> None:
    """Make a recording the voiceover. heard = what is said in it (the script follows the recording)."""
    import tools_animator as ta
    import video
    folder = _dir(job_id)
    part = folder / "voice.part.mp3"
    ta._run_ffmpeg(["-i", str(source), "-vn", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", str(part)],
                   timeout=1800)
    if flag.is_set():
        part.unlink(missing_ok=True)
        raise Stop()
    part.replace(folder / "voice.mp3")
    job = read(job_id)
    script, mode = job.get("script", ""), job.get("script_mode", "")
    if provider == "original":
        script, mode = clean_script(job.get("transcript", "")) or heard, "asis"
    elif not script or same_words(script, heard) < 0.6:
        script, mode = heard, "edited"
    stat = (folder / "voice.mp3").stat()
    voice = {"provider": provider, "voice": f"{stat.st_size}-{int(stat.st_mtime)}"}
    update(job_id, script=script, script_mode=mode, voice=voice, voice_file="voice.mp3", voice_warnings=[],
           voice_duration=round(float(video.get_duration(folder / "voice.mp3") or 0), 1),
           voice_for=voice_stamp(script, voice), voice_version=int(time.time()),
           copied=copied_share(script, job.get("transcript", "")))


def part_name(text: str, voice: dict, first: bool, last: bool) -> str:
    return hashlib.sha1(json.dumps([text, voice.get("provider"), voice.get("voice"), first, last]).encode()).hexdigest()[:16]


def _voice_step(job_id: str, key: str, again: bool):
    def work(flag):
        import autovideo2
        import tools_animator as ta
        import video
        job = read(job_id)
        voice, script = job["voice"], job["script"]
        folder = _dir(job_id) / "voice"
        if again:
            shutil.rmtree(folder, ignore_errors=True)
        folder.mkdir(parents=True, exist_ok=True)
        texts = split_parts(script)
        files, warnings = [], []
        for i, text in enumerate(texts):
            if flag.is_set():
                raise Stop()
            first, last = i == 0, i == len(texts) - 1
            kept = folder / f"{part_name(text, voice, first, last)}.mp3"
            if not (kept.exists() and kept.stat().st_size > 500):
                update(job_id, progress=round(95 * i / len(texts), 1), stage=f"Speaking part {i + 1} of {len(texts)}…")
                made, engine, _dur, fell_back, why = autovideo2._voice_scene_with_fallback(
                    i, text, voice["voice"], folder / "work", voice["provider"], key or None, first_scene=first, last_scene=last)
                if not made:
                    raise RuntimeError(f"Part {i + 1} came out empty. Try again, or pick another voice.")
                clone_lost = voice["voice"].startswith("clone:") and not engine.startswith("clone")
                if fell_back or clone_lost or "studio presenter failed" in engine:
                    # kept under another name, so "Make the voice" tries the chosen voice again
                    kept = kept.with_name(kept.stem + "-other.mp3")
                    warnings.append(f"Part {i + 1} was NOT spoken in your chosen voice "
                                    f"({why[:160] or ('the cloned voice could not run' if clone_lost else engine[:160])}). "
                                    "A free voice was used. Press “Make the voice” to try those parts again.")
                shutil.move(str(made), str(kept))
            files.append(kept)
            if flag.is_set():
                raise Stop()
        update(job_id, progress=96, stage="Joining the parts…")
        out = _dir(job_id) / "voice.mp3"
        work_dir = folder / "work"
        work_dir.mkdir(exist_ok=True)
        listing = []
        for k, f in enumerate(files):  # each part as plain sound with its breath, then joined from a list
            wav = work_dir / f"join-{k:04d}.wav"
            pad = GAP_SECONDS if k < len(files) - 1 else 0.2
            ta._run_ffmpeg(["-i", str(f), "-af", f"apad=pad_dur={pad}", "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", str(wav)])
            listing.append(f"file '{wav.name}'")
        (work_dir / "join.txt").write_text("\n".join(listing) + "\n", encoding="utf-8")
        ta._run_ffmpeg(["-f", "concat", "-safe", "0", "-i", "join.txt", "-c:a", "libmp3lame", "-b:a", "160k", str(out.resolve())],
                       cwd=work_dir)
        shutil.rmtree(folder / "work", ignore_errors=True)
        update(job_id, voice_file="voice.mp3", voice_duration=round(float(video.get_duration(out) or 0), 1),
               voice_for=voice_stamp(script, voice), voice_version=int(time.time()), voice_warnings=warnings[:6])
    return work


# ------------------------------------------------------------------ routes
class LinkReq(BaseModel):
    url: str = Field(..., min_length=8, max_length=800)


@router.get("/jobs")
def jobs() -> dict:
    found = []
    for meta in _root().glob("*/job.json"):
        try:
            j = json.loads(meta.read_text(encoding="utf-8"))
            found.append({"id": j["id"], "title": j.get("title") or j.get("url", ""), "created": j.get("created", 0)})
        except (OSError, ValueError, KeyError):
            continue
    return {"jobs": sorted(found, key=lambda j: -j["created"])[:20]}


@router.post("/jobs")
def create(req: LinkReq) -> dict:
    url = check_url(req.url)
    job_id = _new_job(url)
    start(job_id, "transcript", _transcript_step(job_id, url))
    return public(read(job_id))


MAX_SOURCE = 2 * 2**30


def _receive(file: UploadFile, target: Path) -> None:
    size = 0
    try:
        with open(target, "wb") as out:
            while block := file.file.read(1 << 20):
                size += len(block)
                if size > MAX_SOURCE:
                    raise HTTPException(400, "The file is too large (2 GB at most).")
                out.write(block)
        if size < 1000:
            raise HTTPException(400, "The file is empty.")
    except HTTPException:
        target.unlink(missing_ok=True)
        raise


@router.post("/source/file")
def from_file(file: UploadFile = File(...), job: str = Form(""), url: str = Form("")) -> dict:
    """Step 1 from your own copy of the video or its sound (never kept after the words are written down)."""
    page = check_url(url) if url.strip() else ""
    if job:
        read(job)
        if job in _running:
            raise HTTPException(409, "A step is still running. Wait for it, or press Stop.")
    suffix = Path(file.filename or "").suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{2,5}", suffix):
        suffix = ".bin"
    title = Path(file.filename or "My file").stem[:150]
    job_id = job or _new_job(page, title)
    folder = _dir(job_id)
    name = "upload" + suffix
    try:
        _receive(file, folder / name)
    except HTTPException:
        if not job:
            shutil.rmtree(folder, ignore_errors=True)
        raise
    update(job_id, url=page, title=title, transcript="", segments=[], script="", script_mode="")
    start(job_id, "transcript", _file_step(job_id, name, page))
    return public(read(job_id))


class PasteReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=200_000)
    job: str = Field("", max_length=20)
    url: str = Field("", max_length=800)
    title: str = Field("", max_length=200)


@router.post("/source/text")
def from_text(req: PasteReq) -> dict:
    """Step 1 from a transcript you paste: no download and no speech recognition."""
    page = check_url(req.url) if req.url.strip() else ""
    if req.job:
        read(req.job)
        if req.job in _running:
            raise HTTPException(409, "A step is still running. Wait for it, or press Stop.")
    segments, text = read_pasted(req.text)
    if len(text.split()) < 3:
        raise HTTPException(400, "Paste the transcript's text (at least a few words).")
    title = req.title.strip() or " ".join(text.split()[:7])
    job_id = req.job or _new_job(page, title)
    letters = re.findall(r"[^\W\d_]", text)
    language = "en" if letters and sum(c.isascii() for c in letters) / len(letters) > 0.9 else ""
    keep_transcript(job_id, segments, language, text, page, title)
    return public(update(job_id, url=page, title=title, status="idle", error="", stage="", duration=0))


@router.get("/jobs/{job_id}")
def get(job_id: str) -> dict:
    return public(read(job_id))


@router.post("/jobs/{job_id}/link")
def relink(job_id: str, req: LinkReq) -> dict:
    url = check_url(req.url)
    read(job_id)
    start(job_id, "transcript", _transcript_step(job_id, url))
    return public(update(job_id, url=url, transcript="", segments=[], script="", script_mode=""))


@router.post("/jobs/{job_id}/stop")
def stop(job_id: str) -> dict:
    flag = _running.get(job_id)
    if flag:
        flag.set()
        return public(update(job_id, stage="Stopping after the current piece…"))
    return public(read(job_id))


@router.get("/jobs/{job_id}/prompt")
def prompt(job_id: str) -> dict:
    job = read(job_id)
    if not job.get("transcript"):
        raise HTTPException(400, "There is no transcript yet.")
    return {"prompt": rewrite_prompt(job)}


class ScriptReq(BaseModel):
    text: str = Field(..., min_length=1, max_length=60_000)
    mode: str = Field("edited", pattern="^(asis|own|edited)$")


@router.post("/jobs/{job_id}/script")
def save_script(job_id: str, req: ScriptReq) -> dict:
    job = read(job_id)
    if job_id in _running:
        raise HTTPException(409, "A step is still running. Wait for it, or press Stop.")
    text = clean_script(req.text)
    if len(text.split()) < 3:
        raise HTTPException(400, "The script is empty. Paste the narration text.")
    return public(update(job_id, script=text, script_mode=req.mode,
                         copied=copied_share(text, job.get("transcript", ""))))


class VoiceReq(BaseModel):
    provider: str = Field("edge", pattern="^[a-z]{2,20}$")
    voice: str = Field(..., min_length=2, max_length=200)
    key: str = Field("", max_length=300)  # used for this run only, never saved
    again: bool = False


@router.post("/jobs/{job_id}/voice")
def make_voice(job_id: str, req: VoiceReq) -> dict:
    job = read(job_id)
    if not job.get("script"):
        raise HTTPException(400, "Save your script first (step 2).")
    if req.provider != "edge" and not req.voice.startswith("clone:") and not req.key.strip():
        raise HTTPException(400, "This voice needs your API key. Add it in the Dashboard.")
    if job_id in _running:
        raise HTTPException(409, "A step is still running. Wait for it, or press Stop.")
    update(job_id, voice={"provider": req.provider, "voice": req.voice}, voice_warnings=[])
    start(job_id, "voice", _voice_step(job_id, req.key.strip(), req.again))
    return public(read(job_id))


@router.post("/jobs/{job_id}/voice-original")
def voice_original(job_id: str) -> dict:
    job = read(job_id)
    source = original_audio(job_id)
    if not source:
        raise HTTPException(400, "The original sound is not saved for this video. Press “Get the original audio”, or "
                                 "upload the video/audio file in step 1.")
    if len(job.get("transcript", "").split()) < 3:
        raise HTTPException(400, "There is no transcript yet (step 1).")

    def work(flag):
        update(job_id, stage="Saving the original audio as the voice…")
        _use_audio(job_id, source, "original", flag)

    start(job_id, "voice", work)
    return public(read(job_id))


@router.post("/jobs/{job_id}/voice-file")
def voice_file(job_id: str, file: UploadFile = File(...)) -> dict:
    read(job_id)
    if job_id in _running:
        raise HTTPException(409, "A step is still running. Wait for it, or press Stop.")
    suffix = Path(file.filename or "").suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{2,5}", suffix):
        suffix = ".bin"
    folder = _dir(job_id)
    upload = folder / ("voice-upload" + suffix)
    _receive(file, upload)

    def work(flag):
        try:
            update(job_id, stage="Writing down the words of your recording…")
            try:
                segments, _language = transcribe(upload, flag, lambda f: update(job_id, progress=round(90 * f)))
            except Stop:
                raise
            except Exception as exc:  # noqa: BLE001
                raise RuntimeError("The sound of this file could not be read. Use a file that plays on your computer "
                                   f"(MP3, M4A, WAV, MP4…). ({str(exc)[-150:]})") from None
            if not segments:
                raise RuntimeError("No speech was found in this recording.")
            _use_audio(job_id, upload, "upload", flag, paragraphs(segments))
        finally:
            upload.unlink(missing_ok=True)

    start(job_id, "voice", work)
    return public(read(job_id))


@router.post("/jobs/{job_id}/fetch-audio")
def fetch_audio(job_id: str) -> dict:
    job = read(job_id)
    url = check_url(job.get("source_url") or job.get("url") or "")

    def work(flag):
        folder = _dir(job_id)
        update(job_id, stage="Downloading the sound of the video…")
        audio, _info = download_audio(url, folder, flag, lambda f: update(job_id, progress=round(90 * f)),
                                      note=lambda text: update(job_id, stage=text))
        try:
            if not keep_audio(job_id, audio):
                raise RuntimeError("The sound could not be saved.")
        finally:
            audio.unlink(missing_ok=True)

    start(job_id, "audio", work)
    return public(read(job_id))


@router.get("/jobs/{job_id}/original")
def original(job_id: str) -> FileResponse:
    read(job_id)
    f = original_audio(job_id)
    if not f:
        raise HTTPException(404, "No original audio.")
    return FileResponse(f, media_type="audio/mpeg", filename=f"original-{job_id}.mp3")


@router.get("/jobs/{job_id}/audio")
def audio(job_id: str) -> FileResponse:
    f = _dir(job_id) / "voice.mp3"
    if not f.exists():
        raise HTTPException(404, "No voiceover yet.")
    return FileResponse(f, media_type="audio/mpeg", filename=f"voiceover-{job_id}.mp3")


@router.delete("/jobs/{job_id}")
def delete(job_id: str) -> dict:
    read(job_id)
    flag = _running.get(job_id)
    if flag:
        flag.set()
        for _ in range(100):
            if job_id not in _running:
                break
            time.sleep(0.1)
    shutil.rmtree(_dir(job_id), ignore_errors=True)
    remove_audio(job_id)
    return {"deleted": True}
