"""Usage reporting + new-tool gating tests (1.0.5, user 2026-11-21).

Covers:
- licensing.report_usage(): fires POST /v1/usage in free mode too,
  attributes to the saved key (or the device fingerprint when there
  is no key), never raises, and queues to the outbox when the
  server cannot be reached.
- main._close_job_token(): pings usage on completed AND failed jobs.
- Story Animator + Voice Cloner: consume() gate at job start
  (402 once charging is on, free token while charging is off),
  report/refund + usage ping at job end, and no job_token leak
  through the public job view.

Run:  ~/workspace/ytguru-test-venv/bin/python -m pytest backend/tests/test_usage_reporting.py
"""

import json
import sys
import time
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import licensing  # noqa: E402

# Patch the paid paths BEFORE main is imported, so no test can
# ever spend a real credit or phone the real server.
_orig_consume = licensing.consume
_orig_report = licensing.report
_orig_refund = licensing.refund
_orig_report_usage = licensing.report_usage
licensing.consume = mock.Mock(return_value="test-token")
licensing.report = mock.Mock()
licensing.refund = mock.Mock()
licensing.report_usage = mock.Mock()

import main  # noqa: E402
import tools_animator  # noqa: E402
import tools_voiceclone  # noqa: E402

licensing.consume = _orig_consume
licensing.report = _orig_report
licensing.refund = _orig_refund
licensing.report_usage = _orig_report_usage

from fastapi.testclient import TestClient  # noqa: E402


class ReportUsageTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).resolve().parent / ".tmp-usage-test"
        self.tmp.mkdir(exist_ok=True)
        self._orig_key_file = licensing.KEY_FILE
        self._orig_outbox = licensing.OUTBOX_FILE
        licensing.KEY_FILE = self.tmp / "license.json"
        licensing.OUTBOX_FILE = self.tmp / "license-outbox.jsonl"
        licensing._reset_charging_cache()

    def tearDown(self):
        licensing.KEY_FILE = self._orig_key_file
        licensing.OUTBOX_FILE = self._orig_outbox
        licensing._reset_charging_cache()
        for f in self.tmp.iterdir():
            f.unlink()
        self.tmp.rmdir()

    def test_posts_usage_with_key_and_fingerprint(self):
        licensing.save_key("YTG-TEST-KEY")
        seen = {}

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return b'{"ok": true}'

        def fake_urlopen(req, timeout=None):
            seen["url"] = req.full_url
            seen["method"] = req.get_method()
            seen["body"] = json.loads(req.data.decode())
            return FakeResp()

        with mock.patch.object(licensing.urllib.request, "urlopen", fake_urlopen):
            licensing.report_usage(tool="animator", title="My cartoon",
                                   topic="My cartoon", status="completed",
                                   minutes=2.5)
        self.assertTrue(seen["url"].endswith("/v1/usage"))
        self.assertEqual(seen["method"], "POST")
        self.assertEqual(seen["body"]["tool"], "animator")
        self.assertEqual(seen["body"]["license_key"], "YTG-TEST-KEY")
        self.assertEqual(seen["body"]["status"], "completed")
        self.assertEqual(seen["body"]["minutes"], 2.5)
        self.assertIn("machine_guid", seen["body"]["device"])

    def test_fires_without_a_key_in_free_mode(self):
        seen = {}

        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return b'{"ok": true}'

        def fake_urlopen(req, timeout=None):
            seen["body"] = json.loads(req.data.decode())
            return FakeResp()

        with mock.patch.object(licensing.urllib.request, "urlopen", fake_urlopen):
            licensing.report_usage(tool="voiceclone", status="completed")
        self.assertEqual(seen["body"]["license_key"], "")
        self.assertEqual(seen["body"]["tool"], "voiceclone")

    def test_never_raises_and_queues_outbox_when_server_down(self):
        def boom(req, timeout=None):
            raise urllib.error.URLError("offline")

        with mock.patch.object(licensing.urllib.request, "urlopen", boom):
            # Must not raise, even with no key file and no server.
            licensing.report_usage(tool="cover_video", status="failed")
        lines = licensing.OUTBOX_FILE.read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(lines), 1)
        entry = json.loads(lines[0])
        self.assertEqual(entry["endpoint"], "/v1/usage")
        self.assertEqual(entry["payload"]["tool"], "cover_video")
        self.assertEqual(entry["payload"]["status"], "failed")

    def test_outbox_usage_entry_flushes(self):
        licensing._queue_outbox("/v1/usage", {"tool": "visual", "status": "completed"})
        posted = []

        def fake_http(method, path, payload=None, timeout=60):
            posted.append((method, path, payload))
            return {"ok": True}

        with mock.patch.object(licensing, "_http", fake_http):
            licensing.flush_outbox()
        self.assertEqual(posted, [("POST", "/v1/usage",
                                   {"tool": "visual", "status": "completed"})])
        self.assertFalse(licensing.OUTBOX_FILE.exists())


class CloseJobTokenUsageTest(unittest.TestCase):
    def test_completed_pings_usage(self):
        with mock.patch.object(licensing, "report") as rep, \
                mock.patch.object(licensing, "refund") as ref, \
                mock.patch.object(licensing, "report_usage") as usage:
            main._close_job_token(
                "tok1",
                {"status": "processed", "original_title": "T", "final_minutes": 1.5},
                "cover_video")
        rep.assert_called_once()
        ref.assert_not_called()
        usage.assert_called_once()
        kwargs = usage.call_args.kwargs
        self.assertEqual(kwargs["tool"], "cover_video")
        self.assertEqual(kwargs["status"], "completed")
        self.assertEqual(kwargs["minutes"], 1.5)

    def test_failed_refunds_and_pings_usage_failed(self):
        with mock.patch.object(licensing, "report") as rep, \
                mock.patch.object(licensing, "refund") as ref, \
                mock.patch.object(licensing, "report_usage") as usage:
            main._close_job_token(
                "tok1", {"status": "failed", "original_title": "T"}, "cover_video")
        rep.assert_not_called()
        ref.assert_called_once_with("tok1")
        kwargs = usage.call_args.kwargs
        self.assertEqual(kwargs["status"], "failed")


class AnimatorGateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def setUp(self):
        licensing._reset_charging_cache()
        self.tmp = Path(__file__).resolve().parent / ".tmp-anim-test"
        self.tmp.mkdir(exist_ok=True)
        self._orig_anim_dir = tools_animator.ANIM_DIR
        tools_animator.ANIM_DIR = self.tmp

    def tearDown(self):
        licensing._reset_charging_cache()
        tools_animator.ANIM_DIR = self._orig_anim_dir
        for f in self.tmp.rglob("*"):
            if f.is_file():
                f.unlink()
        for d in sorted(self.tmp.rglob("*"), reverse=True):
            if d.is_dir():
                d.rmdir()
        self.tmp.rmdir()

    def _start_body(self):
        return {"title": "Test cartoon", "minutes": 1, "format": "long",
                "language": "en", "character_ids": ["c1"], "review": False,
                "subtitles": True, "custom_script": "", "backgrounds": "drawn",
                "pixabay_key": "", "music": "auto", "sfx": True,
                "freesound_key": "", "tts_keys": {}, "acting": True,
                "idea": "", "gemini_key": "", "mode": "2d"}

    def test_start_402_when_consume_refuses(self):
        with mock.patch.object(tools_animator, "_load_characters",
                               return_value=[{"id": "c1", "name": "A"}]), \
                mock.patch.object(
                    licensing, "consume",
                    side_effect=licensing.LicenseError(
                        "402: Not enough credits.")):
            r = self.client.post("/api/animator/start", json=self._start_body())
        self.assertEqual(r.status_code, 402)

    def test_start_free_mode_stores_free_token(self):
        with mock.patch.object(tools_animator, "_load_characters",
                               return_value=[{"id": "c1", "name": "A"}]), \
                mock.patch.object(licensing, "consume",
                                  return_value=licensing.FREE_MODE_TOKEN), \
                mock.patch.object(tools_animator, "_start_thread"):
            r = self.client.post("/api/animator/start", json=self._start_body())
        self.assertEqual(r.status_code, 200)
        job_id = r.json()["job_id"]
        job = json.loads((self.tmp / job_id / "job.json").read_text())
        self.assertEqual(job["job_token"], licensing.FREE_MODE_TOKEN)

    def test_close_reports_and_pings_usage(self):
        job_id = "abc123def456"
        (self.tmp / job_id).mkdir()
        (self.tmp / job_id / "job.json").write_text(json.dumps({
            "id": job_id, "title": "T", "minutes": 2, "job_token": "tok9",
        }), encoding="utf-8")
        with mock.patch.object(licensing, "report") as rep, \
                mock.patch.object(licensing, "refund") as ref, \
                mock.patch.object(licensing, "report_usage") as usage:
            tools_animator._close_animator_job(job_id)
        rep.assert_called_once()
        self.assertEqual(rep.call_args.kwargs["tool"], "animator")
        ref.assert_not_called()
        self.assertEqual(usage.call_args.kwargs["status"], "completed")

    def test_close_failed_refunds_and_pings_usage_failed(self):
        job_id = "abc123def456"
        (self.tmp / job_id).mkdir()
        (self.tmp / job_id / "job.json").write_text(json.dumps({
            "id": job_id, "title": "T", "minutes": 2, "job_token": "tok9",
        }), encoding="utf-8")
        with mock.patch.object(licensing, "report") as rep, \
                mock.patch.object(licensing, "refund") as ref, \
                mock.patch.object(licensing, "report_usage") as usage:
            tools_animator._close_animator_job(job_id, failed=True)
        rep.assert_not_called()
        ref.assert_called_once_with("tok9")
        self.assertEqual(usage.call_args.kwargs["status"], "failed")

    def test_close_legacy_job_without_token_only_pings_usage(self):
        job_id = "abc123def456"
        (self.tmp / job_id).mkdir()
        (self.tmp / job_id / "job.json").write_text(json.dumps({
            "id": job_id, "title": "T", "minutes": 2,
        }), encoding="utf-8")
        with mock.patch.object(licensing, "report") as rep, \
                mock.patch.object(licensing, "refund") as ref, \
                mock.patch.object(licensing, "report_usage") as usage:
            tools_animator._close_animator_job(job_id)
        rep.assert_not_called()
        ref.assert_not_called()
        usage.assert_called_once()

    def test_job_token_never_leaks_through_public_view(self):
        job_id = "abc123def456"
        (self.tmp / job_id).mkdir()
        (self.tmp / job_id / "job.json").write_text(json.dumps({
            "id": job_id, "title": "T", "job_token": "secret-tok",
            "pixabay_key": "secret-key",
        }), encoding="utf-8")
        out = tools_animator._public(json.loads(
            (self.tmp / job_id / "job.json").read_text()))
        self.assertNotIn("job_token", out)
        self.assertNotIn("pixabay_key", out)
        self.assertEqual(out["title"], "T")


class VoiceCloneGateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def setUp(self):
        licensing._reset_charging_cache()
        self.tmp = Path(__file__).resolve().parent / ".tmp-vc-test"
        self.tmp.mkdir(exist_ok=True)
        self._orig_out = tools_voiceclone.OUT_DIR
        tools_voiceclone.OUT_DIR = self.tmp

    def tearDown(self):
        licensing._reset_charging_cache()
        tools_voiceclone.OUT_DIR = self._orig_out
        for f in self.tmp.iterdir():
            f.unlink()
        self.tmp.rmdir()

    def test_generate_402_when_consume_refuses(self):
        with mock.patch.object(tools_voiceclone, "_engine_installed",
                               return_value=True), \
                mock.patch.object(tools_voiceclone, "_read_voice",
                                  return_value={"name": "V"}), \
                mock.patch.object(
                    licensing, "consume",
                    side_effect=licensing.LicenseError(
                        "402: Not enough credits.")):
            r = self.client.post("/api/voiceclone/generate", json={
                "voice_id": "abcdef123456", "text": "Hello world", "language": "en",
                "exaggeration": 0.5})
        self.assertEqual(r.status_code, 402)

    def test_generate_free_mode_queues_with_free_token(self):
        with mock.patch.object(tools_voiceclone, "_engine_installed",
                               return_value=True), \
                mock.patch.object(tools_voiceclone, "_read_voice",
                                  return_value={"name": "V"}), \
                mock.patch.object(licensing, "consume",
                                  return_value=licensing.FREE_MODE_TOKEN), \
                mock.patch.object(tools_voiceclone, "_run_generate") as run:
            r = self.client.post("/api/voiceclone/generate", json={
                "voice_id": "abcdef123456", "text": "Hello world", "language": "en",
                "exaggeration": 0.5})
        self.assertEqual(r.status_code, 200)
        job_id = r.json()["job_id"]
        for _ in range(50):
            if run.call_count:
                break
            time.sleep(0.1)
        run.assert_called_once()
        self.assertEqual(run.call_args.args[5], licensing.FREE_MODE_TOKEN)
        job = json.loads((self.tmp / f"{job_id}.json").read_text())
        self.assertEqual(job["status"], "queued")

    def test_worker_failure_refunds_and_pings_usage_failed(self):
        job_id = "abc123def456"
        tools_voiceclone._write_job({
            "id": job_id, "status": "queued", "progress": 0,
            "message": "Waiting…", "voice_id": "v1", "voice_name": "V",
            "language": "en", "chars": 5, "created_at": "x",
        })
        with mock.patch.object(tools_voiceclone, "_get_model",
                               side_effect=RuntimeError("no model")), \
                mock.patch.object(licensing, "refund") as ref, \
                mock.patch.object(licensing, "report") as rep, \
                mock.patch.object(licensing, "report_usage") as usage:
            tools_voiceclone._run_generate(
                job_id, "v1", "Hello", "en", 0.5, job_token="tok7")
        ref.assert_called_once_with("tok7")
        rep.assert_not_called()
        self.assertEqual(usage.call_args.kwargs["status"], "failed")
        self.assertEqual(usage.call_args.kwargs["tool"], "voiceclone")
        job = tools_voiceclone._read_job(job_id)
        self.assertEqual(job["status"], "error")


class AutovideoThemeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def setUp(self):
        licensing._reset_charging_cache()

    def tearDown(self):
        licensing._reset_charging_cache()

    def test_plan_stores_visual_theme(self):
        # The plan worker is not started: the test only proves the
        # theme lands in the job dict for the render worker.
        class NoThread:
            def __init__(self, *a, **k):
                pass

            def start(self):
                pass

        with mock.patch.object(licensing, "consume", return_value="tok"), \
                mock.patch.object(main.threading, "Thread", NoThread):
            r = self.client.post("/api/autovideo/plan", json={
                "title": "How markets work", "minutes": 2,
                "video_type": "long", "visuals": "both",
                "voice": "en-US-AriaNeural", "tts_provider": "edge",
                "theme": "visual"})
        self.assertEqual(r.status_code, 200)
        job_id = r.json()["job_id"]
        job = main._av_read(job_id)
        self.assertEqual(job.get("theme"), "visual")
        self.assertEqual(job.get("job_token"), "tok")


if __name__ == "__main__":
    unittest.main()
