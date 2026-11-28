"""Tests for backend/tools_3d — the 3D Explainer backend (user, 2026-11-28).

Pure-logic only: no network, no playwright, no ffmpeg. Router tests
are skipped automatically when fastapi is not installed.

Run:  python3 -m pytest backend/tests/test_tools_3d.py -q
(or:  python3 -m unittest backend.tests.test_tools_3d)
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools_3d import assets, prompts, render, shots, style  # noqa: E402
from tools_3d.assemble import build_srt  # noqa: E402

GOOD = [
    {"template": "globe", "duration": 6, "narration": "One.",
     "camera": {"distance": "wide"}},
    {"template": "data_card", "duration": 4, "narration": "Two.",
     "camera": {"distance": "close"}},
]


class ShotsTest(unittest.TestCase):
    def test_good_list_passes_and_defaults_filled(self):
        clean, errors = shots.validate_shotlist(GOOD)
        self.assertEqual(errors, [])
        self.assertEqual(len(clean), 2)
        self.assertEqual(clean[0]["id"], "shot-1")
        self.assertEqual(clean[0]["transition_in"], "cut")
        self.assertIn("lat", clean[0]["params"])  # globe defaults
        self.assertEqual(clean[1]["camera"]["distance"], "close")

    def test_bad_template_errors(self):
        _clean, errors = shots.validate_shotlist(
            [{"template": "nope", "duration": 3}])
        self.assertTrue(any("unknown template" in e for e in errors))

    def test_nonpositive_duration_errors(self):
        _clean, errors = shots.validate_shotlist(
            [{"template": "globe", "duration": 0}])
        self.assertTrue(any("duration" in e for e in errors))

    def test_variety_same_template_run_warns(self):
        same = [{"template": "globe", "duration": 3,
                 "camera": {"distance": "wide"}} for _ in range(3)]
        warnings = shots.variety_warnings(same)
        self.assertTrue(any("globe" in w for w in warnings))

    def test_variety_ok_list_no_warnings(self):
        clean, _ = shots.validate_shotlist(GOOD)
        self.assertEqual(shots.variety_warnings(clean), [])


class PromptsTest(unittest.TestCase):
    def test_shot_prompt_lists_every_template(self):
        text = prompts.shot_prompt("T", "Narr.", "Src")
        for name in shots.TEMPLATES:
            self.assertIn(name, text)

    def test_shot_prompt_has_variety_and_accuracy_rules(self):
        text = prompts.shot_prompt("T", "Narr.", "Src")
        self.assertIn("more than 2 times in a row", text)
        self.assertIn("camera distance", text)
        self.assertIn("Never invent data", text)
        self.assertIn("ONLY", text)

    def test_narration_prompt_asks_for_sources(self):
        text = prompts.narration_prompt("Ocean trade")
        self.assertIn("Ocean trade", text)
        self.assertIn("SOURCES:", text)

    def test_fix_prompt_saved_sources_only(self):
        project = {"title": "T", "narration": "N", "sources": "S",
                   "shots": GOOD}
        text = prompts.fix_shot_prompt(project, 0)
        self.assertIn("saved sources", text.lower())
        self.assertIn("do NOT do any new research", text)
        self.assertIn("one JSON object", text)


class StyleTest(unittest.TestCase):
    def test_style_colours(self):
        c = style.STYLE["colours"]
        self.assertEqual(c["background"], "#04101f")
        self.assertEqual(c["background_far"], "#06182e")
        self.assertEqual(c["data_line"], "#ff8c1a")
        self.assertEqual(c["label"], "#ffffff")
        self.assertEqual(c["accent"], "#35c4ff")


class AssetsTest(unittest.TestCase):
    def test_catalogue_licences(self):
        for entry in assets.catalogue():
            self.assertTrue(entry["source"], entry["id"])
            self.assertTrue(entry["licence"], entry["id"])
            self.assertTrue(entry["url"], entry["id"])

    def test_public_domain_and_cc0(self):
        by_id = {e["id"]: e for e in assets.catalogue()}
        self.assertEqual(by_id["nasa-blue-marble-day"]["licence"],
                         "Public Domain")
        self.assertEqual(by_id["natural-earth-countries-110m"]["licence"],
                         "Public Domain")
        kenney = [e for e in assets.catalogue() if "kenney" in e["id"]]
        self.assertTrue(kenney)
        self.assertTrue(all(e["licence"] == "CC0" for e in kenney))


class RenderEstimateTest(unittest.TestCase):
    def test_estimate_monotonic(self):
        short = {"shots": [{"duration": 5}]}
        long = {"shots": [{"duration": 20}]}
        self.assertLess(render.estimate_seconds(short, {}),
                        render.estimate_seconds(long, {}))
        self.assertLess(
            render.estimate_seconds(long, {"quality": "low"}, measured_fps=4),
            render.estimate_seconds(long, {"quality": "low"}, measured_fps=2))


class AssembleSrtTest(unittest.TestCase):
    def test_srt_timing(self):
        srt = build_srt([{"narration": "First.", "duration": 2.5},
                         {"narration": "Second.", "duration": 1.5}])
        self.assertIn("00:00:00,000 --> 00:00:02,500", srt)
        self.assertIn("00:00:02,500 --> 00:00:04,000", srt)
        self.assertIn("First.", srt)


class RouterFreePathTest(unittest.TestCase):
    def test_status_cost_zero_without_licensing(self):
        try:
            import importlib
            router_mod = importlib.import_module("tools_3d.router")
        except Exception:  # noqa: BLE001 — fastapi missing in this VM
            self.skipTest("fastapi not installed")
        if router_mod is None or not hasattr(router_mod, "get_status"):
            self.skipTest("router unavailable")
        result = router_mod.get_status()
        self.assertTrue(result["ok"])
        self.assertEqual(result["action"], "explainer3d")
        self.assertEqual(result["cost"], 0)


if __name__ == "__main__":
    unittest.main()
