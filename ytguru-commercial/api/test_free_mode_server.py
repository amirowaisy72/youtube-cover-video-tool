"""Free-mode tests for the license server (ytguru-commercial/api/index.py).

Covers: GET /v1/charging defaults to free, POST /admin/charging
flips and persists it, the flag round-trips through PUT
/admin/settings, and the paid paths (customer + consume) still
work unchanged when charging is on.

Run from the repo root:
  ~/workspace/ytguru-test-venv/bin/python -m pytest ytguru-commercial/api/test_free_mode_server.py

Uses the SQLite dev backend (no DATABASE_URL). The test DB file
(ytguru-commercial/api/license.db) is removed before and after the
run so no dev artifact is left behind. Admin auth is done by
inserting a session token directly — no password hash needed.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient  # noqa: E402

DB_PATH = Path(__file__).resolve().parent / "license.db"
if DB_PATH.exists():
    DB_PATH.unlink()

import index as server  # noqa: E402

ADMIN_TOKEN = "test-admin-token-for-free-mode-tests"


class ServerFreeModeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(server.app)
        with server._db() as con:
            con.execute(
                "INSERT OR IGNORE INTO admin_sessions (token, created_at) "
                "VALUES (?, ?)",
                (ADMIN_TOKEN, 0),
            )
            con.commit()

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        if DB_PATH.exists():
            DB_PATH.unlink()

    def setUp(self):
        # Every test starts from free mode.
        self.client.post(
            "/admin/charging", json={"charging_enabled": False},
            headers={"Authorization": "Bearer " + ADMIN_TOKEN})

    def _auth(self):
        return {"Authorization": "Bearer " + ADMIN_TOKEN}

    # -- the flag ----------------------------------------------------
    def test_charging_defaults_to_free(self):
        # Fresh default (no row ever written) is False; setUp also
        # wrote False explicitly, so assert the public read agrees.
        r = self.client.get("/v1/charging")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["charging_enabled"])

    def test_admin_flip_persists(self):
        r = self.client.post(
            "/admin/charging", json={"charging_enabled": True},
            headers=self._auth())
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["charging_enabled"])
        # A fresh read (new request, same server) sees the flip.
        self.assertTrue(self.client.get("/v1/charging").json()["charging_enabled"])
        # And flipping back works the same way.
        r = self.client.post(
            "/admin/charging", json={"charging_enabled": False},
            headers=self._auth())
        self.assertFalse(r.json()["charging_enabled"])
        self.assertFalse(self.client.get("/v1/charging").json()["charging_enabled"])

    def test_charging_flip_requires_admin(self):
        r = self.client.post("/admin/charging", json={"charging_enabled": True})
        self.assertEqual(r.status_code, 401)
        r = self.client.post(
            "/admin/charging", json={"charging_enabled": True},
            headers={"Authorization": "Bearer wrong-token"})
        self.assertEqual(r.status_code, 401)

    def test_flag_round_trips_through_settings(self):
        r = self.client.get("/admin/settings", headers=self._auth())
        self.assertIn("charging_enabled", r.json())
        self.assertFalse(r.json()["charging_enabled"])
        r = self.client.put(
            "/admin/settings", json={"settings": {"charging_enabled": True}},
            headers=self._auth())
        self.assertTrue(r.json()["charging_enabled"])
        self.assertTrue(self.client.get("/v1/charging").json()["charging_enabled"])

    # -- paid paths still intact --------------------------------------
    def test_paid_consume_still_works_when_charging_on(self):
        self.client.post(
            "/admin/charging", json={"charging_enabled": True},
            headers=self._auth())
        r = self.client.post(
            "/admin/customers",
            json={"name": "FreeMode Test", "email": "", "notes": ""},
            headers=self._auth())
        self.assertEqual(r.status_code, 200)
        key = r.json()["license_key"]
        trial = r.json()["trial_credits"]
        self.assertGreater(trial, 0)
        r = self.client.post("/v1/consume", json={
            "license_key": key, "action": "cover_video",
            "job_ref": "testjob123", "client_version": "1.0.4"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("job_token", r.json())
        self.assertEqual(r.json()["balance_after"], trial - 1)

    def test_paid_consume_blocks_without_credits(self):
        r = self.client.post(
            "/admin/customers",
            json={"name": "Broke Test", "email": "", "notes": ""},
            headers=self._auth())
        key = r.json()["license_key"]
        # Drain the trial credits, then one more consume must 402.
        for _ in range(r.json()["trial_credits"]):
            ok = self.client.post("/v1/consume", json={
                "license_key": key, "action": "cover_video",
                "job_ref": "drain1", "client_version": "1.0.4"})
            self.assertEqual(ok.status_code, 200)
        r = self.client.post("/v1/consume", json={
            "license_key": key, "action": "cover_video",
            "job_ref": "drain2", "client_version": "1.0.4"})
        self.assertEqual(r.status_code, 402)


if __name__ == "__main__":
    unittest.main()
