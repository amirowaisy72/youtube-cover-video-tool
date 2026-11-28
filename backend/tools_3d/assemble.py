"""YT Guru — 3D Explainer assembly (user, 2026-11-28).

Joins the per-shot mp4s into ``final.mp4`` in the project folder,
adds the voice track (made by the app's existing /api/tts pipeline
and saved in the project folder as voice.mp3/wav) when present,
optional low-volume music, and captions built from the shots'
narration. Captions are burned in when ffmpeg has the subtitles
filter, otherwise muxed as soft mov_text subtitles. Also writes
``description.txt`` (title + sources + asset attributions) and sets
job.json to done/final.mp4 so the My Videos library — which scans
``autovideos/`` — picks the video up.

``build_srt`` is a pure function so caption timing is unit-testable
without ffmpeg.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROJECTS_DIR = REPO_ROOT / "autovideos"


def _srt_time(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    ms = int(round((seconds - int(seconds)) * 1000))
    total = int(seconds)
    if ms == 1000:
        total, ms = total + 1, 0
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_srt(shots: list) -> str:
    """SRT text from shots' narration + cumulative durations (pure)."""
    blocks, at = [], 0.0
    for shot in shots or []:
        duration = float(shot.get("duration") or 0)
        text = str(shot.get("narration") or "").strip()
        if text and duration > 0:
            blocks.append(
                f"{len(blocks) + 1}\n{_srt_time(at)} --> "
                f"{_srt_time(at + duration)}\n{text}\n")
        at += duration
    return "\n".join(blocks)


def _read_json(path: Path, default):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, type(default)) else default
    except Exception:  # noqa: BLE001
        return default


def _ffmpeg_has_filter(name: str) -> bool:
    if not shutil.which("ffmpeg"):
        return False
    try:
        out = subprocess.run(["ffmpeg", "-hide_banner", "-filters"],
                             capture_output=True, text=True, timeout=30)
        return name in (out.stdout or "")
    except Exception:  # noqa: BLE001
        return False


def _run(cmd: list) -> bool:
    try:
        return subprocess.run(cmd, capture_output=True,
                              timeout=7200).returncode == 0
    except Exception:  # noqa: BLE001
        return False


def _shot_mp4s(folder: Path, count: int) -> list[Path]:
    files = []
    for i in range(count):
        f = folder / "frames" / f"shot-{i + 1:02d}" / "shot.mp4"
        if f.is_file():
            files.append(f)
    if not files:  # fallback: any shot mp4 under frames/
        files = sorted((folder / "frames").glob("shot-*/shot.mp4"))
    return files


def _write_description(folder: Path, project: dict, used_assets: list) -> Path:
    lines = [str(project.get("title") or "3D Explainer"), ""]
    if project.get("narration"):
        lines += ["Narration:", str(project["narration"]), ""]
    if project.get("sources"):
        lines += ["Sources:", str(project["sources"]), ""]
    if used_assets:
        lines.append("Assets:")
        for a in used_assets:
            credit = (f"- {a.get('name') or a.get('id')} — {a.get('source', '')} "
                      f"({a.get('licence', '')})")
            if a.get("attribution_required"):
                credit += " — attribution required"
            lines.append(credit)
        lines.append("")
    lines.append("Made with YT Guru — 3D Explainer "
                 "(templates: globe, map, cutaway, data cards).")
    path = folder / "description.txt"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def assemble(project_id: str, voice_file: str | None = None,
             music_file: str | None = None) -> dict:
    """Build final.mp4 for a project. Returns the updated job dict."""
    folder = PROJECTS_DIR / project_id
    project = _read_json(folder / "project.json", {})
    job_path = folder / "job.json"
    job = _read_json(job_path, {})

    def fail(message: str) -> dict:
        job.update({"id": project_id, "status": "error", "message": message})
        job_path.write_text(json.dumps(job, indent=2), encoding="utf-8")
        return job

    if not shutil.which("ffmpeg"):
        return fail("ffmpeg is not installed, so the shots cannot be joined.")
    shots = project.get("shots") or []
    files = _shot_mp4s(folder, len(shots))
    if not files:
        return fail("No rendered shot videos found — render the project first.")

    # 1) Join the shots. Try xfade transitions where durations allow;
    #    any failure falls back to a plain concat (robust first).
    joined = folder / "joined.mp4"
    ok = False
    transitions = [str(s.get("transition_in") or "cut") for s in shots]
    if len(files) > 1 and any(t in ("fade", "zoom") for t in transitions[1:]):
        inputs, filt, prev, offset = [], [], "[0:v]", 0.0
        for f in files:
            inputs += ["-i", str(f)]
        # cumulative offsets need durations; probe via shot durations
        durations = [float(s.get("duration") or 0) for s in shots]
        for i in range(1, len(files)):
            kind = "fade" if transitions[i] != "zoom" else "fade"
            offset += max(durations[i - 1] - 0.5, 0.1) if i - 1 < len(durations) else 0.0
            out_label = f"[x{i}]"
            filt.append(f"{prev}[{i}:v]xfade=transition={kind}:duration=0.5:"
                        f"offset={offset:.2f}{out_label}")
            prev = out_label
        if filt:
            ok = _run(["ffmpeg", "-y", *inputs, "-filter_complex",
                       ";".join(filt), "-map", prev, "-c:v", "libx264",
                       "-pix_fmt", "yuv420p", str(joined)])
    if not ok:
        list_file = folder / "concat.txt"
        list_file.write_text(
            "".join(f"file '{f.as_posix()}'\n" for f in files), encoding="utf-8")
        ok = _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i",
                   str(list_file), "-c", "copy", str(joined)])
        if not ok:  # stream-copy concat can fail on mixed params: re-encode
            ok = _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i",
                       str(list_file), "-c:v", "libx264", "-pix_fmt",
                       "yuv420p", str(joined)])
    if not ok:
        return fail("ffmpeg could not join the shot videos.")

    # 2) Captions.
    srt_text = build_srt(shots)
    srt_path = folder / "captions.srt"
    if srt_text:
        srt_path.write_text(srt_text, encoding="utf-8")

    # 3) Audio: explicit arg, else voice.mp3 / voice.wav in the folder.
    voice = None
    for candidate in ([voice_file] if voice_file else []) + ["voice.mp3", "voice.wav"]:
        if candidate:
            p = folder / Path(candidate).name
            if p.is_file():
                voice = p
                break
    music = None
    for candidate in ([music_file] if music_file else []) + ["music.mp3"]:
        if candidate:
            p = folder / Path(candidate).name
            if p.is_file():
                music = p
                break

    final = folder / "final.mp4"
    burn = bool(srt_text) and _ffmpeg_has_filter("subtitles")
    # -vf for the caption burn, -filter_complex only for the audio mix.
    cmd = ["ffmpeg", "-y", "-i", str(joined)]
    if voice:
        cmd += ["-i", str(voice)]
    if music:
        cmd += ["-i", str(music)]
    if burn:
        esc = str(srt_path).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
        cmd += ["-vf", f"subtitles='{esc}'"]
    if voice and music:
        cmd += ["-filter_complex",
                "[2:a]volume=0.15[mus];[1:a][mus]amix=inputs=2:duration=first[aout]",
                "-map", "0:v", "-map", "[aout]"]
    elif voice:
        cmd += ["-map", "0:v", "-map", "1:a"]
    elif music:
        cmd += ["-map", "0:v", "-map", "1:a"]
    soft_srt = bool(srt_text) and not burn
    if soft_srt:
        cmd += ["-i", str(srt_path)]
        srt_idx = (1 + (1 if voice else 0) + (1 if music else 0))
        cmd += ["-map", f"{srt_idx}:0", "-c:s", "mov_text"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
    if voice or music:
        cmd += ["-c:a", "aac", "-shortest"]
    cmd += [str(final)]
    if not _run(cmd):
        return fail("ffmpeg failed while adding audio/captions.")

    # 4) Description + job done (My Videos scans autovideos/).
    used_assets = []
    try:
        from . import assets as _assets
        wanted = {str((s.get("params") or {}).get("asset") or "")
                  for s in shots}
        used_assets = [r for r in _assets.list_downloaded()
                       if r.get("id") in wanted or r.get("name") in wanted]
    except Exception:  # noqa: BLE001
        used_assets = []
    _write_description(folder, project, used_assets)
    job.update({"id": project_id, "status": "done",
                "final_file": "final.mp4",
                "title": project.get("title", ""),
                "message": "Final video assembled."})
    job_path.write_text(json.dumps(job, indent=2), encoding="utf-8")
    return job
