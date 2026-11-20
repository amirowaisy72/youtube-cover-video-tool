"""Tests for backend/tools_downloads.py (lazy big-model downloads).

The router is tested standalone on a bare FastAPI app — it does not
touch licensing or the rest of backend.main, so no licensing patching
is needed. Run from the repo root with the ytguru test venv:

    ~/workspace/ytguru-test-venv/bin/python -m pytest tests/test_downloads.py -v
"""

import importlib.util
import os
import sys
import time
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import backend.tools_downloads as dl  # noqa: E402


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Point the HF cache at an empty temp dir: nothing is "downloaded".
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path / "hf-cache"))
    monkeypatch.setattr(dl, "_states", {})
    app = FastAPI()
    app.include_router(dl.router)
    return TestClient(app)


def test_import_does_not_pull_huggingface_hub():
    # Startup must stay light: no heavy hub import at module load.
    assert "huggingface_hub" not in sys.modules


def test_status_lists_both_downloads(client):
    resp = client.get("/api/downloads/status")
    assert resp.status_code == 200
    items = {d["id"]: d for d in resp.json()["downloads"]}
    assert set(items) == {"whisper-tiny", "chatterbox-model"}
    assert items["whisper-tiny"]["total_bytes"] == 78_207_087
    assert items["whisper-tiny"]["size_label"] == "~75 MB"
    assert items["whisper-tiny"]["status"] == "missing"
    assert items["chatterbox-model"]["total_bytes"] == int(3.21 * 1024**3)
    assert items["chatterbox-model"]["size_label"] == "~3.2 GB"
    assert items["chatterbox-model"]["status"] == "missing"
    assert items["chatterbox-model"]["engine_install_url"] == "/api/voiceclone/install"
    assert items["whisper-tiny"]["progress"] == 0


def test_start_unknown_id_404(client):
    assert client.post("/api/downloads/nope/start").status_code == 404


def test_start_without_hub_sets_clean_error(client):
    # huggingface_hub is NOT in the test venv: the background worker
    # must fail into a readable "error" state, not hang or crash.
    if importlib.util.find_spec("huggingface_hub") is not None:
        pytest.skip("huggingface_hub is installed here")
    resp = client.post("/api/downloads/whisper-tiny/start")
    assert resp.status_code == 200
    assert resp.json()["started"] is True
    # The worker fails fast (missing import), so the immediate reply
    # may already say "error" instead of "downloading" — either is fine.
    assert resp.json()["status"] in ("downloading", "error")
    deadline = time.time() + 15
    state = {}
    while time.time() < deadline:
        state = {d["id"]: d for d in client.get("/api/downloads/status").json()["downloads"]}[
            "whisper-tiny"
        ]
        if state["status"] == "error":
            break
        time.sleep(0.25)
    assert state["status"] == "error", state
    assert "huggingface_hub" in state["error"]


def test_fake_cache_counts_as_downloaded(client, tmp_path, monkeypatch):
    # A cache dir holding >= 90% of the expected bytes, no partial
    # blob, is reported as downloaded.
    cache = tmp_path / "hf-cache" / "models--Systran--faster-whisper-tiny" / "blobs"
    cache.mkdir(parents=True)
    (cache / "abc123").write_bytes(b"x" * 75_000_000)
    monkeypatch.setattr(dl, "_states", {})
    items = {d["id"]: d for d in client.get("/api/downloads/status").json()["downloads"]}
    assert items["whisper-tiny"]["status"] == "downloaded"
    assert items["whisper-tiny"]["progress"] == 100
    # Starting an already-downloaded model is a no-op, not a re-download.
    resp = client.post("/api/downloads/whisper-tiny/start")
    assert resp.json()["started"] is False
    assert resp.json()["status"] == "downloaded"


def test_partial_blob_is_not_downloaded(client, tmp_path, monkeypatch):
    cache = tmp_path / "hf-cache" / "models--Systran--faster-whisper-tiny" / "blobs"
    cache.mkdir(parents=True)
    (cache / "abc123.incomplete").write_bytes(b"x" * 75_000_000)
    monkeypatch.setattr(dl, "_states", {})
    items = {d["id"]: d for d in client.get("/api/downloads/status").json()["downloads"]}
    assert items["whisper-tiny"]["status"] == "missing"
