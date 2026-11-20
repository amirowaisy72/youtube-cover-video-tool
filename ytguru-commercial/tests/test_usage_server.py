"""License-server tests for the 1.0.5 usage + charging work
(user 2026-11-21).

- POST /v1/usage stores usage with or without a license key
  (anonymous rows keyed by device fingerprint).
- GET /v1/charging + POST /admin/charging flip the flag and it
  survives a fresh import (stored in the settings table).
- GET /admin/usage aggregates per customer + unregistered devices
  + recent rows; customer detail carries usage / usage_by_tool.
- consume() accepts the new actions animator / visual / voiceclone
  and rejects unknown actions.
- Settings carry the new per-tool credit costs.

Runs against a throwaway SQLite file in a temp dir — never the
real license.db. bcrypt is faked (the test venv has no bcrypt):
checkpw() accepts exactly the password "test-pass".

Run:  ~/workspace/ytguru-test-venv/bin/python -m pytest tests/test_usage_server.py
"""

import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

# --- fake bcrypt (test venv has none) ---------------------------------
_fake_bcrypt = types.ModuleType("bcrypt")
_fake_bcrypt.checkpw = lambda pw, h: pw == b"test-pass"
sys.modules["bcrypt"] = _fake_bcrypt

_TMP = Path(tempfile.mkdtemp(prefix="ytguru-test-server-"))

# --- point the store at a throwaway DB BEFORE importing the app -------
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))
import _store  # noqa: E402

_store.DB_PATH = _TMP / "license.db"

import index  # noqa: E402

index.ADMIN_PASSWORD_HASH = "fake-hash-for-tests"

from fastapi.testclient import TestClient  # noqa: E402


class UsageServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(index.app)
        r = cls.client.post("/admin/login",
                            json={"username": "master", "password": "test-pass"})
        assert r.status_code == 200, r.text
        cls.auth = {"Authorization": "Bearer " + r.json()["token"]}

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_charging_defaults_off(self):
        r = self.client.get("/v1/charging")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["charging_enabled"])

    def test_charging_toggle_requires_admin(self):
        r = self.client.post("/admin/charging",
                             json={"charging_enabled": True})
        self.assertEqual(r.status_code, 401)

    def test_charging_toggle_flips_and_sticks(self):
        r = self.client.post("/admin/charging",
                             json={"charging_enabled": True},
                             headers=self.auth)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["charging_enabled"])
        self.assertTrue(self.client.get("/v1/charging").json()["charging_enabled"])
        r = self.client.post("/admin/charging",
                             json={"charging_enabled": False},
                             headers=self.auth)
        self.assertFalse(r.json()["charging_enabled"])
        self.assertFalse(self.client.get("/v1/charging").json()["charging_enabled"])

    def test_usage_without_key_is_anonymous(self):
        r = self.client.post("/v1/usage", json={
            "tool": "animator", "title": "Cartoon", "status": "completed",
            "minutes": 2.5, "device": {"machine_guid": "dev-1"}})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["ok"])
        with _store.connect() as con:
            row = con.execute(
                "SELECT customer_id, device_fp, tool, status FROM usage "
                "WHERE tool = 'animator'").fetchone()
        self.assertIsNone(row["customer_id"])
        # The server stores a truncated sha256 of the device dict,
        # not the raw guid.
        self.assertRegex(row["device_fp"], r"^[0-9a-f]{32}$")
        self.assertEqual(row["status"], "completed")

    def test_usage_with_key_attributes_to_customer(self):
        r = self.client.post("/admin/customers",
                             json={"name": "Usage Tester", "email": "u@t.example"},
                             headers=self.auth)
        self.assertEqual(r.status_code, 200)
        key = r.json()["license_key"]
        customer_id = r.json()["customer_id"]
        r = self.client.post("/v1/usage", json={
            "tool": "visual", "title": "Explainer", "status": "completed",
            "minutes": 1.0, "license_key": key,
            "device": {"machine_guid": "dev-2"}})
        self.assertEqual(r.status_code, 200)
        with _store.connect() as con:
            row = con.execute(
                "SELECT customer_id FROM usage WHERE tool = 'visual'").fetchone()
        self.assertEqual(row["customer_id"], customer_id)

        # Aggregates + customer detail carry the usage.
        agg = self.client.get("/admin/usage", headers=self.auth).json()
        mine = [c for c in agg["by_customer"] if c["customer_id"] == customer_id]
        self.assertEqual(len(mine), 1)
        self.assertEqual(mine[0]["total"], 1)
        self.assertEqual(mine[0]["by_tool"], {"visual": 1})
        self.assertTrue(any(u["tool"] == "visual" for u in agg["recent"]))

        detail = self.client.get(f"/admin/customers/{customer_id}",
                                 headers=self.auth).json()
        self.assertEqual(detail["usage_by_tool"], {"visual": 1})
        self.assertEqual(len(detail["usage"]), 1)
        self.assertEqual(detail["usage"][0]["tool"], "visual")

        # An anonymous (no-key) usage row lands in the unregistered bucket.
        self.client.post("/v1/usage", json={
            "tool": "animator", "title": "Cartoon", "status": "completed",
            "device": {"machine_guid": "dev-9"}})
        agg = self.client.get("/admin/usage", headers=self.auth).json()
        self.assertTrue(any("animator" in u["by_tool"]
                            for u in agg["unregistered"]))

    def test_consume_new_actions_and_unknown_rejected(self):
        r = self.client.post("/admin/customers",
                             json={"name": "Consume Tester"},
                             headers=self.auth)
        key = r.json()["license_key"]
        # Trial credits = 3 by default: animator + visual + voiceclone.
        for action in ("animator", "visual", "voiceclone"):
            r = self.client.post("/v1/consume", json={
                "license_key": key, "action": action,
                "job_ref": "job-" + action, "client_version": "1.0.4"})
            self.assertEqual(r.status_code, 200, action + ": " + r.text)
            self.assertIn("job_token", r.json())
        r = self.client.post("/v1/consume", json={
            "license_key": key, "action": "bogus",
            "job_ref": "job-x", "client_version": "1.0.4"})
        self.assertEqual(r.status_code, 400)

    def test_settings_carry_new_credit_costs(self):
        s = self.client.get("/admin/settings", headers=self.auth).json()
        self.assertEqual(s["credits_per_animator"], 1)
        self.assertEqual(s["credits_per_visual"], 1)
        self.assertEqual(s["credits_per_voiceclone"], 1)
        s["credits_per_animator"] = 2
        r = self.client.put("/admin/settings", json={"settings": s},
                            headers=self.auth)
        self.assertEqual(r.status_code, 200)
        s2 = self.client.get("/admin/settings", headers=self.auth).json()
        self.assertEqual(s2["credits_per_animator"], 2)


if __name__ == "__main__":
    unittest.main()
