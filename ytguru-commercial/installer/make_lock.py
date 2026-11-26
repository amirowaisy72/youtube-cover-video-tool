"""Writes backend/parts_lock.json: every file the installer and the app may download, with its
address, size and SHA-256. Nothing outside this list is ever downloaded as a program or a model.

Run on the build PC only, with a FULL Python 3.12 (not the embeddable one — a few packages are
source-only and must be built into wheels, which the embeddable Python cannot do):

    <python312>/python.exe make_lock.py --work F:/YTGuru-AI/build

It resolves ONE consistent set of versions for the app and all optional parts, then splits it:
"essentials" = what the installer downloads, each part = what that part adds on top.
Source-only packages are built here into wheels and travel inside the setup file (they are tiny).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TORCH_INDEX = "https://download.pytorch.org/whl/cpu"
UA = {"User-Agent": "YTGuru-build"}

ESSENTIALS = ["fastapi", "uvicorn", "yt-dlp[default]", "python-multipart", "Pillow", "google-api-python-client",
              "google-auth-oauthlib", "edge-tts", "gTTS", "playwright", "numpy<2"]
PARTS = {
    "whisper": ["faster-whisper"],
    "presenter": ["mediapipe==1.2.3", "opencv-contrib-python<4.12", "sounddevice"],
    "graphics": ["manim", "pymunk"],
    "voice": ["torch==2.6.0+cpu", "torchaudio==2.6.0+cpu", "chatterbox-tts==0.1.7"],
}

FFMPEG = ("https://github.com/GyanD/codexffmpeg/releases/download/{v}/ffmpeg-{v}-essentials_build.zip")
# exactly what chatterbox-tts 0.1.7 asks for in ChatterboxMultilingualTTS.from_pretrained
VOICE_FILES = "ve.pt,t3_mtl23ls_v2.safetensors,s3gen.pt,grapheme_mtl_merged_expanded_v1.json,conds.pt,Cangjie5_TC.json"


def get_json(url: str):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.loads(r.read())


def norm(name: str) -> str:
    return name.lower().replace("_", "-").replace(".", "-")


def resolve(py: str, work: Path, reqs: list[str], constraints: Path | None, tag: str) -> list[dict]:
    report = work / "dl" / f"report-{tag}.json"
    cmd = [py, "-m", "pip", "install", "--dry-run", "--ignore-installed", "--quiet", "--report", str(report),
           "--extra-index-url", TORCH_INDEX, *reqs]
    if constraints:
        cmd += ["-c", str(constraints)]
    subprocess.run(cmd, check=True)
    return json.loads(report.read_text(encoding="utf-8"))["install"]


def download(url: str, target: Path, sha: str = "") -> Path:
    if target.exists() and (not sha or digest(target) == sha):
        return target
    print("  downloading", target.name, flush=True)
    sys.path.insert(0, str(ROOT / "backend"))
    import parts_download
    parts_download.fetch(url, target, sha256=sha)
    return target


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(1 << 20):
            h.update(block)
    return h.hexdigest()


def unpacked_size(path: Path) -> int:
    with zipfile.ZipFile(path) as z:
        return sum(i.file_size for i in z.infolist())


def wheel_entry(py: str, work: Path, item: dict) -> dict:
    """One package of the resolution as a lock entry (downloaded here once, to measure it)."""
    info = item["download_info"]
    url = info["url"].split("#")[0]
    name = urllib.request.url2pathname(url.rsplit("/", 1)[-1]).replace("%2B", "+")
    sha = (info.get("archive_info") or {}).get("hashes", {}).get("sha256", "")
    wheels = work / "wheels"
    wheels.mkdir(exist_ok=True)
    if name.endswith(".whl"):
        path = download(url, wheels / name, sha)
        return {"name": name, "url": url, "size": path.stat().st_size, "sha256": digest(path), "installed": unpacked_size(path)}
    # source only: build a wheel now; it is shipped inside the setup file
    local = work / "local-wheels"
    local.mkdir(exist_ok=True)
    project = norm(item["metadata"]["name"])
    found = [p for p in local.glob("*.whl") if norm(p.name.split("-")[0]) == project]
    if not found:
        subprocess.run([py, "-m", "pip", "wheel", "--no-deps", "--quiet", "-w", str(local), url], check=True)
        found = [p for p in local.glob("*.whl") if norm(p.name.split("-")[0]) == project]
    path = found[0]
    return {"name": path.name, "url": "", "size": path.stat().st_size, "sha256": digest(path), "installed": unpacked_size(path)}


def file_entry(work: Path, url: str, name: str, **extra) -> dict:
    path = download(url, work / "files" / name)
    return {"name": name, "url": url, "size": path.stat().st_size, "sha256": digest(path), **extra}


def hf_files(repo: str, revision: str, wanted) -> tuple[str, list[dict]]:
    commit = get_json(f"https://huggingface.co/api/models/{repo}/revision/{revision}")["sha"]
    tree = get_json(f"https://huggingface.co/api/models/{repo}/tree/{commit}?recursive=true")
    out = []
    for f in tree:
        if f["type"] != "file" or (wanted and f["path"] not in wanted):
            continue
        lfs = f.get("lfs") or {}
        out.append({"name": f["path"], "url": f"https://huggingface.co/{repo}/resolve/{commit}/{f['path']}",
                    "size": int(lfs.get("size") or f["size"]), "sha256": lfs.get("oid", "")})
    return commit, out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default="F:/YTGuru-AI/build")
    ap.add_argument("--ffmpeg", default="8.0")
    ap.add_argument("--voice-files", default=VOICE_FILES, help="comma separated file names of the voice model")
    args = ap.parse_args()
    if sys.version_info[:2] != (3, 12):
        raise SystemExit("Run this with Python 3.12.")
    work = Path(args.work)
    (work / "dl").mkdir(parents=True, exist_ok=True)
    py = sys.executable

    everything = resolve(py, work, ESSENTIALS + [r for reqs in PARTS.values() for r in reqs], None, "all")
    constraints = work / "dl" / "constraints.txt"
    constraints.write_text("".join(f"{i['metadata']['name']}=={i['metadata']['version']}\n" for i in everything), encoding="utf-8")
    base = resolve(py, work, ESSENTIALS, constraints, "essentials")
    base_names = {norm(i["metadata"]["name"]) for i in base}
    lock: dict = {"python": "3.12", "essentials": {"wheels": [wheel_entry(py, work, i) for i in base]}, "parts": {}}
    for part, reqs in PARTS.items():
        got = resolve(py, work, reqs, constraints, part)
        lock["parts"][part] = {"wheels": [wheel_entry(py, work, i) for i in got if norm(i["metadata"]["name"]) not in base_names]}

    # programs the installer downloads
    ffmpeg = file_entry(work, FFMPEG.format(v=args.ffmpeg), f"ffmpeg-{args.ffmpeg}.zip",
                        take=["ffmpeg.exe", "ffprobe.exe"])
    deno_version = get_json("https://api.github.com/repos/denoland/deno/releases/latest")["tag_name"]
    deno = file_entry(work, f"https://github.com/denoland/deno/releases/download/{deno_version}/deno-x86_64-pc-windows-msvc.zip",
                      f"deno-{deno_version}.zip", take=["deno.exe"])
    for entry in (ffmpeg, deno):
        with zipfile.ZipFile(work / "files" / entry["name"]) as z:
            entry["installed"] = sum(i.file_size for i in z.infolist() if i.filename.rsplit("/", 1)[-1] in entry["take"])
    lock["essentials"]["programs"] = [ffmpeg, deno]

    # models
    whisper_commit, whisper = hf_files("Systran/faster-whisper-tiny", "main",
                                       {"config.json", "model.bin", "tokenizer.json", "vocabulary.txt"})
    lock["parts"]["whisper"]["hf"] = {"repo": "Systran/faster-whisper-tiny", "commit": whisper_commit, "files": whisper}
    wanted = set(args.voice_files.split(","))
    commit, voice = hf_files("ResembleAI/chatterbox", "main", wanted)
    lock["parts"]["voice"]["hf"] = {"repo": "ResembleAI/chatterbox", "commit": commit, "files": voice}

    sys.path.insert(0, str(ROOT / "backend"))
    import presenter_models
    lock["parts"]["presenter"]["files"] = [{"name": n, "url": url, "size": size, "sha256": ""}
                                           for n, (url, size, _what) in presenter_models.FILES.items()]

    # the small browser, only for PCs where Edge and Chrome cannot be used
    for entry in base:
        if norm(entry["metadata"]["name"]) == "playwright":
            wheel = work / "wheels" / entry["download_info"]["url"].split("#")[0].rsplit("/", 1)[-1]
    with zipfile.ZipFile(wheel) as z:
        browsers = json.loads(z.read("playwright/driver/package/browsers.json"))["browsers"]
    shell = next(b for b in browsers if b["name"] == "chromium-headless-shell")
    version, revision = shell.get("browserVersion", ""), shell["revision"]
    url = f"https://cdn.playwright.dev/builds/cft/{version}/win64/chrome-headless-shell-win64.zip"
    browser = file_entry(work, url, f"chrome-headless-shell-{version}.zip", folder=f"chromium_headless_shell-{revision}")
    browser["installed"] = unpacked_size(work / "files" / browser["name"])
    lock["parts"]["browser"] = {"wheels": [], "archive": browser}

    out = ROOT / "backend" / "parts_lock.json"
    out.write_text(json.dumps(lock, indent=1), encoding="utf-8")
    for name, group in [("essentials", lock["essentials"]), *lock["parts"].items()]:
        files = group.get("wheels", []) + group.get("programs", []) + group.get("files", []) \
            + (group.get("hf") or {}).get("files", []) + ([group["archive"]] if "archive" in group else [])
        print(f"{name:12} {len(files):4} files  download {sum(f['size'] for f in files) / 1e6:8.1f} MB")


if __name__ == "__main__":
    main()
