"""Builds YTGuru-Setup-<version>.exe on a Windows PC.

    python ytguru-commercial/installer/build.py [--work F:/YTGuru-AI/build] [--iscc <ISCC.exe>] [--skip-frontend]

Needs: backend/parts_lock.json (make_lock.py), the files it downloaded under <work>, the embeddable
Python zip and pip.pyz under <work>/dl, Node or Bun for the page, and Inno Setup 6.

Only the files listed here go into the setup (an allow-list), and the staged folder is then checked:
the build stops if anything personal — keys, tokens, settings, license files, videos — is in it.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent

BACKEND = ["*.py", "data/*.json", "data/*.md", "data/*.txt", "fonts/*", "music_pack/*", "colab/*.ipynb",
           "models_index.json", "parts_lock.json"]
INSTALLER = ["launcher.py", "setup_essentials.py", "uninstall_cleanup.py", "Run-Setup.bat"]

# never in a setup file, wherever it would be
FORBIDDEN = re.compile(r"(?i)^(client_secrets.*\.json|settings\.json|license\.json|license-outbox\.jsonl|my_shapes\.json|"
                       r"av_style\.json|footage_memory\.json|colab_voice\.(txt|log)|colab_settings\.json|records\.json|"
                       r"research_(cache|quota)\.json|animator_(actions|pack)\.json|doctor_ctr\.json|presenter_settings\.json|"
                       r"presenter_speed\.json|youtube_(token|accounts).*\.json|installed\.json|\.env|\.dev-unlock|"
                       r".*cookies.*\.(txt|sqlite)|.*\.(log|pem\.key|sqlite3?|db))$")
FORBIDDEN_DIRS = {"tokens", "autovideos", "animations", "jobs", "covers", "groups", "tts", "presenter", "presenter_people",
                  "presenter_models", "voice_clones", "voicebank", "thumbnails", "channel_branding", "characters", "worlds",
                  "assets_user", "source_cache", "text_cache", "data_cache", "sfx_cache", "av_audio_cache", "models_cache",
                  "tests", "__pycache__", ".git", "media"}
MEDIA = {".mp4", ".mov", ".mkv", ".webm", ".wav", ".m4a", ".mp3", ".jpg", ".jpeg", ".png", ".webp", ".onnx", ".task"}
MEDIA_ALLOWED = ("backend/music_pack/", "frontend-react/dist/", "backend/data/", "backend/fonts/")
PICTURE = re.compile(r"data:[\w/+.\-]+;base64,[A-Za-z0-9+/=]+")
SECRETS = {
    "Google API key": re.compile(r"AIza[0-9A-Za-z_\-]{35}"),
    "OAuth client secret": re.compile(r"GOCSPX-[0-9A-Za-z_\-]{10,}|\"client_secret\"\s*:\s*\"[^\"]{8,}\""),
    "refresh token": re.compile(r"\"refresh_token\"\s*:\s*\"[^\"]{10,}\"|1//0[0-9A-Za-z_\-]{30,}"),
    "API key": re.compile(r"(?<![A-Za-z0-9_-])(sk-(proj-|ant-)?[A-Za-z0-9_\-]{32,}|gsk_[A-Za-z0-9]{30,}|hf_[A-Za-z0-9]{30,})"),
    "license key": re.compile(r"YTG-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}"),
}


def personal_strings() -> list[str]:
    """Things that identify this PC or its owner: read here, never written into the repository."""
    out = [str(Path.home()), Path.home().name, str(ROOT)]
    for args in (["git", "config", "user.email"],):
        got = subprocess.run(args, cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if got:
            out.append(got)
    for name, keys in (("license.json", ["key"]), ("client_secrets.json", ["client_id", "client_secret", "project_id"])):
        try:
            data = json.loads((ROOT / name).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        data = data.get("installed") or data.get("web") or data
        out += [str(data[k]) for k in keys if data.get(k)]
    colab = ROOT / "colab_voice.txt"
    if colab.exists():
        out += [line.strip() for line in colab.read_text(encoding="utf-8", errors="ignore").splitlines() if len(line.strip()) > 12]
    return [s for s in out if len(s) >= 6]


def check_stage(stage: Path) -> list[str]:
    problems, mine = [], [s.lower().encode() for s in personal_strings()]
    for f in stage.rglob("*"):
        rel = f.relative_to(stage).as_posix()
        inside_python = rel.startswith("python/")
        if f.is_dir():
            if f.name.lower() in FORBIDDEN_DIRS and not inside_python:
                problems.append(f"folder that must not be shipped: {rel}")
            continue
        if not inside_python:
            if FORBIDDEN.match(f.name):
                problems.append(f"personal file: {rel}")
            if f.suffix.lower() in MEDIA and not rel.startswith(MEDIA_ALLOWED):
                problems.append(f"media file outside the allowed folders: {rel}")
        if f.stat().st_size < 30e6 and not (inside_python and f.suffix.lower() in (".dll", ".pyd", ".exe", ".zip", ".pyz")):
            raw = f.read_bytes()
            low = raw.lower()
            for s in mine:
                if s in low:
                    problems.append(f"a personal detail of this PC is inside {rel}")
                    break
            if not inside_python:
                # pictures built into the page are long random text: they are not searched
                text = PICTURE.sub("", raw.decode("utf-8", "ignore"))
                for what, pattern in SECRETS.items():
                    if pattern.search(text):
                        problems.append(f"looks like a {what} inside {rel}")
    return problems


def icon(target: Path) -> None:
    from PIL import Image, ImageDraw

    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((8, 8, size - 8, size - 8), radius=56, fill=(27, 36, 51))
    d.polygon([(92, 66), (92, 190), (200, 128)], fill=(246, 196, 69))
    img.save(target, sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


def build_frontend(target: Path) -> None:
    """The page, built outside the repository (its dist folders stay as they are)."""
    npm = shutil.which("npm") or shutil.which("bun")
    if not npm:
        raise SystemExit("Node (npm) or Bun is needed to build the page.")
    subprocess.run([npm, "run", "build", "--", "--outDir", str(target), "--emptyOutDir"], cwd=ROOT / "frontend-react",
                   check=True)


def stage_files(work: Path, stage: Path, version: str) -> dict:
    lock = json.loads((ROOT / "backend" / "parts_lock.json").read_text(encoding="utf-8"))
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True)
    # embeddable Python
    python = stage / "python"
    embed = next((work / "dl").glob("python-3.12*-embed-amd64.zip"))
    with zipfile.ZipFile(embed) as z:
        z.extractall(python)
    (python / "python312._pth").write_text(
        "python312.zip\n.\nLib\\site-packages\n..\\backend\n..\nimport site\n", encoding="ascii")
    shutil.copy(work / "dl" / "pip.pyz", python / "pip.pyz")
    with zipfile.ZipFile(work / "dl" / "pip.pyz") as z:
        (python / "cacert.pem").write_bytes(z.read("pip/_vendor/certifi/cacert.pem"))
    site = python / "Lib" / "site-packages"
    site.mkdir(parents=True)
    shutil.copy(HERE / "ytg_boot.py", site / "ytg_boot.py")
    (site / "ytg_boot.pth").write_text("import ytg_boot\n", encoding="ascii")
    # the app
    for pattern in BACKEND:
        for f in (ROOT / "backend").glob(pattern):
            if f.is_file():
                target = stage / "backend" / f.relative_to(ROOT / "backend")
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(f, target)
    dist = work / "page"
    if not (dist / "index.html").exists():
        raise SystemExit(f"{dist} is missing: build without --skip-frontend first.")
    shutil.copytree(dist, stage / "frontend-react" / "dist")
    for name in INSTALLER:
        shutil.copy(HERE / name, stage / name)
    # packages that exist only as source: built by make_lock.py, shipped inside the setup
    local = [w["name"] for group in [lock["essentials"], *lock["parts"].values()] for w in group.get("wheels", []) if not w.get("url")]
    for name in sorted(set(local)):
        (stage / "wheels").mkdir(exist_ok=True)
        source = work / "local-wheels" / name
        entry = next(w for g in [lock["essentials"], *lock["parts"].values()] for w in g.get("wheels", []) if w["name"] == name)
        if hashlib.sha256(source.read_bytes()).hexdigest() != entry["sha256"]:
            raise SystemExit(f"{name} differs from the lock file: run make_lock.py again.")
        shutil.copy(source, stage / "wheels" / name)
    icon(stage / "ytguru.ico")
    return lock


def find_iscc(given: str, work: Path) -> str:
    candidates = [given, shutil.which("iscc"), r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
                  str(work.parent / "tools" / "inno" / "ISCC.exe"), *map(str, (work / "tools").rglob("ISCC.exe"))]
    for c in candidates:
        if c and Path(c).is_file():
            return c
    raise SystemExit("Inno Setup (ISCC.exe) was not found. Pass --iscc.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default="F:/YTGuru-AI/build")
    ap.add_argument("--iscc", default="")
    ap.add_argument("--version", default="")
    ap.add_argument("--skip-frontend", action="store_true")
    ap.add_argument("--stage-only", action="store_true")
    ap.add_argument("--test", action="store_true", help="a setup named \"YT Guru Test\" that leaves a real installation alone")
    args = ap.parse_args()
    version = args.version or re.search(r'CLIENT_VERSION = "([\d.]+)"',
                                        (ROOT / "backend" / "main.py").read_text(encoding="utf-8")).group(1)
    work = Path(args.work)
    if not args.skip_frontend:
        build_frontend(work / "page")
    stage = work / "stage"
    lock = stage_files(work, stage, version)
    problems = check_stage(stage)
    if problems:
        print("\n".join(problems))
        raise SystemExit(f"STOPPED: {len(problems)} problem(s) in the files to be shipped.")
    files = [f for f in stage.rglob("*") if f.is_file()]
    print(f"Checked {len(files)} files ({sum(f.stat().st_size for f in files) / 1e6:.0f} MB): nothing personal found.")
    if args.stage_only:
        return 0
    essentials = lock["essentials"]
    megabytes = round(sum(f["size"] for f in essentials["wheels"] + essentials["programs"] if f.get("url")) / 1e6)
    name = "YTGuru-Test-Setup" if args.test else "YTGuru-Setup"
    extra = ["/DMyAppName=YT Guru Test", "/DMyAppId={9D4E2C10-5B6A-4F7E-8A11-2C3D4E5F6A7B}", f"/DOutputName={name}"] if args.test else []
    subprocess.run([find_iscc(args.iscc, work), "/Q", f"/DMyAppVersion={version}", f"/DStage={stage}",
                    f"/DEssentialsMB={megabytes}", *extra, str(HERE / "ytguru.iss")], check=True)
    out = HERE / "installer-output" / f"{name}-{version}.exe"
    print(f"{out}\n{out.stat().st_size / 1e6:.1f} MB · SHA-256 {hashlib.sha256(out.read_bytes()).hexdigest()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
