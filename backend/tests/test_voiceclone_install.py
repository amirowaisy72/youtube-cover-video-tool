"""Tests for the voice-clone /install logic (user, 2026-11-21).

The frozen .exe (1.0.5+) bundles the engine (CPU torch +
chatterbox-tts), so /install must report installed there — the
400 fires only when the engine is genuinely missing. On a
non-frozen machine without the engine, /install starts the pip
install instead.

Run:  ~/workspace/ytguru-test-venv/bin/python -m pytest backend/tests/test_voiceclone_install.py
(or: python -m unittest backend.tests.test_voiceclone_install)

The engine is stubbed with fake modules in sys.modules for the
"present" case (torch/chatterbox are NOT installed in the test
venv, so the "missing" case is real). _run_install is stubbed
so no test ever runs pip.
"""

import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import tools_voiceclone as vc  # noqa: E402
from fastapi import HTTPException  # noqa: E402


def _stub_engine():
    """Fake engine modules, as if the frozen bundle imported them."""
    stubs = {}
    for name in ("chatterbox", "chatterbox.mtl_tts", "torch", "perth"):
        stubs[name] = types.ModuleType(name)
    stubs["chatterbox"].__path__ = []
    stubs["chatterbox"].mtl_tts = stubs["chatterbox.mtl_tts"]
    return stubs


class InstallLogicTest(unittest.TestCase):
    def setUp(self):
        self._orig_install = dict(vc._install)
        vc._install.update(running=False, error="", done=False, log=[], started_at=0.0)
        self._had_frozen = hasattr(sys, "frozen")
        self._orig_frozen = getattr(sys, "frozen", None)

    def tearDown(self):
        vc._install.clear()
        vc._install.update(self._orig_install)
        if self._had_frozen:
            sys.frozen = self._orig_frozen
        elif hasattr(sys, "frozen"):
            delattr(sys, "frozen")

    def test_engine_present_and_frozen_reports_installed(self):
        with mock.patch.dict(sys.modules, _stub_engine()):
            sys.frozen = True
            self.assertTrue(vc._engine_installed())
            self.assertEqual(
                vc.install_engine(), {"started": False, "installed": True}
            )

    def test_engine_missing_and_frozen_raises_400(self):
        # torch/chatterbox/perth are NOT installed in the test venv,
        # so this is a real missing-engine check, not a stub.
        for name in ("chatterbox", "torch", "perth"):
            self.assertIsNone(importlib.util.find_spec(name))
        sys.frozen = True
        self.assertFalse(vc._engine_installed())
        with self.assertRaises(HTTPException) as ctx:
            vc.install_engine()
        self.assertEqual(ctx.exception.status_code, 400)

    def test_engine_missing_not_frozen_starts_install(self):
        if hasattr(sys, "frozen"):
            delattr(sys, "frozen")
        with mock.patch.object(vc, "_run_install", lambda: None):
            result = vc.install_engine()
        self.assertEqual(result, {"started": True, "installed": False})
        self.assertTrue(vc._install["running"])


if __name__ == "__main__":
    unittest.main()
