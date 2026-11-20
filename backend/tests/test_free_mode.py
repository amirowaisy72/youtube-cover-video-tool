"""Free-mode tests for backend/licensing.py (user, 2026-11-21).

Charging OFF (default) must mean: no license key, no credits, no
lock — consume() returns a local free token, balance()/activate()
report activated with zero costs, report()/refund() are no-ops.
Charging ON must mean: the old paid paths run exactly as before.

Run:  ~/workspace/ytguru-test-venv/bin/python -m pytest backend/tests/test_free_mode.py
(or: python -m unittest backend.tests.test_free_mode)

These tests never touch the real license.json / outbox: KEY_FILE
and OUTBOX_FILE are pointed at a tmp dir, and no real HTTP call
is ever made — _fetch_charging_from_server and _http are patched.
"""

import json
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import licensing  # noqa: E402


class FreeModeTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(__file__).resolve().parent / ".tmp-test"
        self.tmp.mkdir(exist_ok=True)
        self._orig_key = licensing.KEY_FILE
        self._orig_outbox = licensing.OUTBOX_FILE
        licensing.KEY_FILE = self.tmp / "license.json"
        licensing.OUTBOX_FILE = self.tmp / "license-outbox.jsonl"
        licensing._reset_charging_cache()

    def tearDown(self):
        licensing.KEY_FILE = self._orig_key
        licensing.OUTBOX_FILE = self._orig_outbox
        licensing._reset_charging_cache()
        for p in self.tmp.iterdir():
            p.unlink()
        self.tmp.rmdir()

    # -- helpers ---------------------------------------------------
    def _charging(self, value):
        """Patch the server ask to return `value` (or raise it)."""
        if isinstance(value, Exception):
            patcher = mock.patch.object(
                licensing, "_fetch_charging_from_server", side_effect=value)
        else:
            patcher = mock.patch.object(
                licensing, "_fetch_charging_from_server", return_value=value)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _http_spy(self, canned=None):
        """Patch _http: record calls, return `canned` (default {})."""
        calls = []
        canned = canned if canned is not None else {}

        def fake(method, path, payload=None, timeout=60):
            calls.append((method, path, payload))
            return dict(canned)

        patcher = mock.patch.object(licensing, "_http", side_effect=fake)
        patcher.start()
        self.addCleanup(patcher.stop)
        return calls

    # -- free by default: server unreachable (fail-open) -----------
    def test_fail_open_when_server_unreachable(self):
        self._charging(urllib.error.URLError("no network"))
        self.assertFalse(licensing.charging_enabled())
        # No key file exists at all — consume must still succeed.
        self.assertFalse(licensing.KEY_FILE.exists())
        self.assertEqual(
            licensing.consume("cover_video", "job1", "1.0.4"),
            licensing.FREE_MODE_TOKEN)

    def test_free_mode_needs_no_key_no_server_call(self):
        self._charging(False)
        calls = self._http_spy()
        token = licensing.consume("tts", "job2", "1.0.4")
        self.assertEqual(token, licensing.FREE_MODE_TOKEN)
        self.assertEqual(calls, [], "free consume must not call the server")

    def test_free_mode_balance_reports_activated_zero_costs(self):
        self._charging(False)
        data = licensing.balance()
        self.assertTrue(data["activated"])
        self.assertIsNone(data["balance"])
        self.assertEqual(
            data["costs"], {"cover_video": 0, "tts": 0, "autovideo": 0})
        self.assertTrue(data["free_mode"])
        self.assertFalse(data["charging_enabled"])

    def test_free_mode_activate_is_noop(self):
        self._charging(False)
        calls = self._http_spy()
        data = licensing.activate("ANY-KEY", "1.0.4")
        self.assertTrue(data["activated"])
        self.assertEqual(calls, [], "free activate must not call the server")
        self.assertFalse(licensing.KEY_FILE.exists(),
                         "free activate must not save a key")

    def test_free_mode_report_refund_are_noops(self):
        self._charging(False)
        calls = self._http_spy()
        licensing.report(licensing.FREE_MODE_TOKEN, "completed",
                         tool="cover_video", title="x")
        licensing.refund(licensing.FREE_MODE_TOKEN)
        self.assertEqual(calls, [])
        self.assertFalse(licensing.OUTBOX_FILE.exists(),
                         "free report/refund must not queue an outbox entry")

    # -- paid mode: old paths enforced again -----------------------
    def test_paid_mode_no_key_blocks_consume_and_balance(self):
        self._charging(True)
        with self.assertRaises(licensing.LicenseError) as cm:
            licensing.consume("cover_video", "job3", "1.0.4")
        self.assertIn("No license key", str(cm.exception))
        with self.assertRaises(licensing.LicenseError):
            licensing.balance()

    def test_paid_mode_consume_report_refund_use_server(self):
        self._charging(True)
        licensing.KEY_FILE.write_text(json.dumps({"key": "YTG-TEST-KEY"}),
                                      encoding="utf-8")
        calls = self._http_spy({"job_token": "tok-1"})
        token = licensing.consume("cover_video", "job4", "1.0.4")
        self.assertEqual(token, "tok-1")
        self.assertEqual(calls[0][1], "/v1/consume")
        licensing.report("tok-1", "completed", tool="cover_video", title="x")
        licensing.refund("tok-1")
        paths = [c[1] for c in calls]
        self.assertIn("/v1/report", paths)
        self.assertIn("/v1/refund", paths)

    def test_paid_mode_balance_returns_server_data_plus_flags(self):
        self._charging(True)
        licensing.KEY_FILE.write_text(json.dumps({"key": "YTG-TEST-KEY"}),
                                      encoding="utf-8")
        body = json.dumps({"balance": 5, "costs": {"cover_video": 1}}).encode()
        resp = mock.MagicMock()
        resp.read.return_value = body
        resp.__enter__.return_value = resp
        with mock.patch("urllib.request.urlopen", return_value=resp):
            data = licensing.balance()
        self.assertEqual(data["balance"], 5)
        self.assertFalse(data["free_mode"])
        self.assertTrue(data["charging_enabled"])

    # -- caching ----------------------------------------------------
    def test_charging_flag_cached_then_refreshed(self):
        fetch = mock.Mock(return_value=False)
        with mock.patch.object(licensing, "_fetch_charging_from_server",
                               side_effect=fetch):
            self.assertFalse(licensing.charging_enabled())
            self.assertFalse(licensing.charging_enabled())
            self.assertEqual(fetch.call_count, 1, "second call must use cache")
            licensing._reset_charging_cache()
            fetch.return_value = True
            self.assertTrue(licensing.charging_enabled())
            self.assertEqual(fetch.call_count, 2)


if __name__ == "__main__":
    unittest.main()
