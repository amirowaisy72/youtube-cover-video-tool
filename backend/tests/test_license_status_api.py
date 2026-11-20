"""End-to-end check of GET /api/license/status through backend/main.py.

Proves the free-mode flag flows all the way to the frontend's
unlock decision: free mode -> activated=True (so
`unlocked = installed && licensed` opens the tools with no key);
paid mode with no key -> activated=False (the old lock screen).

Per the job spec, licensing.consume/report/refund are patched
BEFORE main is imported, so no test can ever spend a real credit
or phone the real server; the charging flag itself is patched at
licensing._fetch_charging_from_server.

Run:  ~/workspace/ytguru-test-venv/bin/python -m pytest backend/tests/test_license_status_api.py
"""

import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import licensing  # noqa: E402

# Patch the old paid paths BEFORE main is imported (job spec).
_orig_consume = licensing.consume
_orig_report = licensing.report
_orig_refund = licensing.refund
licensing.consume = mock.Mock(return_value="test-token")
licensing.report = mock.Mock()
licensing.refund = mock.Mock()

import main  # noqa: E402

# Restore immediately: main looks up licensing.consume at call time
# and these status tests never call it — restoring keeps the patch
# from leaking into other test files in the same pytest process.
licensing.consume = _orig_consume
licensing.report = _orig_report
licensing.refund = _orig_refund
from fastapi.testclient import TestClient  # noqa: E402


class LicenseStatusApiTest(unittest.TestCase):
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

    def test_free_mode_status_is_activated_without_a_key(self):
        with mock.patch.object(
                licensing, "_fetch_charging_from_server", return_value=False):
            r = self.client.get("/api/license/status")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["activated"],
                        "free mode must unlock with no license key")
        self.assertTrue(data["free_mode"])
        self.assertFalse(data["charging_enabled"])
        self.assertIsNone(data["balance"])

    def test_paid_mode_status_is_not_activated_without_a_key(self):
        with mock.patch.object(
                licensing, "_fetch_charging_from_server", return_value=True), \
                mock.patch.object(licensing, "load_key", return_value=None):
            r = self.client.get("/api/license/status")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertFalse(data["activated"],
                         "paid mode with no key must stay locked")
        self.assertIsNone(data["balance"])

    def test_server_unreachable_fails_open_to_free(self):
        import urllib.error
        with mock.patch.object(
                licensing, "_fetch_charging_from_server",
                side_effect=urllib.error.URLError("offline")):
            r = self.client.get("/api/license/status")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["activated"],
                        "unreachable server must fail open to free, never lock")


if __name__ == "__main__":
    unittest.main()
