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
    {"template": "globe", "duration": 36, "narration": "One.",
     "visualizes": "One.",
     "camera": {"distance": "wide"}},
    {"template": "data_card", "duration": 4, "narration": "Two.",
     "visualizes": "Two.",
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

    def test_visualizes_missing_errors(self):
        _clean, errors = shots.validate_shotlist(
            [{"template": "globe", "duration": 3, "narration": "One."}])
        self.assertTrue(any("missing 'visualizes'" in e for e in errors),
                        errors)

    def test_visualizes_empty_errors(self):
        _clean, errors = shots.validate_shotlist(
            [{"template": "globe", "duration": 3, "narration": "One.",
              "visualizes": "  "}])
        self.assertTrue(any("missing 'visualizes'" in e for e in errors),
                        errors)

    def test_visualizes_present_no_such_error(self):
        clean, errors = shots.validate_shotlist(GOOD)
        self.assertFalse(any("visualizes" in e for e in errors), errors)
        self.assertEqual(clean[0]["visualizes"], "One.")
        self.assertEqual(clean[1]["visualizes"], "Two.")

    def test_every_template_example_has_visualizes(self):
        for name, spec in shots.TEMPLATES.items():
            self.assertTrue(
                str(spec["example"].get("visualizes") or "").strip(),
                f"{name} example missing visualizes")
            self.assertTrue(spec["example"].get("narration"), name)

    def test_card_cap_warning(self):
        plan = [
            {"template": "data_card", "duration": 2,
             "camera": {"distance": "wide"}},
            {"template": "globe", "duration": 20,
             "camera": {"distance": "medium"}},
            {"template": "data_card", "duration": 2,
             "camera": {"distance": "close"}},
            {"template": "map_zoom", "duration": 20,
             "camera": {"distance": "wide"}},
        ]
        warnings = shots.variety_warnings(plan)
        self.assertTrue(
            any("data_card" in w and "at most 1" in w for w in warnings),
            warnings)

    def test_card_duration_share_warning(self):
        plan = [
            {"template": "data_card", "duration": 10,
             "camera": {"distance": "close"}},
            {"template": "globe", "duration": 10,
             "camera": {"distance": "wide"}},
        ]
        warnings = shots.variety_warnings(plan)
        self.assertTrue(
            any("data_card" in w and "15%" in w for w in warnings),
            warnings)

    def test_template_total_repeat_warning(self):
        # globe 3 times in total, but never more than 2 in a row.
        plan = [
            {"template": "globe", "duration": 3,
             "camera": {"distance": "wide"}},
            {"template": "map_zoom", "duration": 3,
             "camera": {"distance": "medium"}},
            {"template": "globe", "duration": 3,
             "camera": {"distance": "close"}},
            {"template": "map_zoom", "duration": 3,
             "camera": {"distance": "wide"}},
            {"template": "globe", "duration": 3,
             "camera": {"distance": "medium"}},
        ]
        warnings = shots.variety_warnings(plan)
        self.assertTrue(
            any("globe" in w and "in total" in w for w in warnings),
            warnings)

    def test_chips_cleaned_empty_dropped_corner_defaulted(self):
        clean, errors = shots.validate_shotlist([{
            "template": "globe", "duration": 6, "narration": "One.",
            "visualizes": "One.",
            "chips": [{"text": "   "},
                      {"text": "99%", "sub": "of intercontinental data"}],
        }])
        self.assertEqual(errors, [])
        chips = clean[0]["chips"]
        self.assertEqual(len(chips), 1)  # empty-text chip dropped
        self.assertEqual(chips[0]["text"], "99%")
        self.assertEqual(chips[0]["sub"], "of intercontinental data")
        self.assertEqual(chips[0]["corner"], "top-right")  # defaulted
        self.assertEqual(chips[0]["t0"], 0.0)
        self.assertEqual(chips[0]["t1"], 6.0)  # defaults to duration

    def test_chips_corner_coerced_and_times_numeric(self):
        clean, errors = shots.validate_shotlist([{
            "template": "globe", "duration": 6, "narration": "One.",
            "visualizes": "One.",
            "chips": [{"text": "5x", "corner": "middle",
                       "t0": "2", "t1": 4},
                      {"text": "3", "corner": "top-left", "t0": 1}],
        }])
        self.assertEqual(errors, [])
        chips = clean[0]["chips"]
        self.assertEqual(chips[0]["corner"], "top-right")  # invalid coerced
        self.assertEqual(chips[0]["t0"], 2.0)
        self.assertIsInstance(chips[0]["t0"], float)
        self.assertEqual(chips[0]["t1"], 4.0)
        self.assertEqual(chips[1]["corner"], "top-left")  # valid kept

    def test_camera_path_preserved_with_coerced_values(self):
        clean, errors = shots.validate_shotlist([{
            "template": "globe", "duration": 6, "narration": "One.",
            "visualizes": "One.",
            "cameraPath": [{"at": 0, "pos": [0, 0, 10], "lookAt": [0, 0, 0]},
                           {"at": 1.5, "pos": [1, 2, 3],
                            "lookAt": [4, 5, 6]}],
        }])
        self.assertEqual(errors, [])  # cameraPath never errors
        path = clean[0]["cameraPath"]
        self.assertEqual(len(path), 2)
        self.assertEqual(path[0], {"at": 0.0, "pos": [0.0, 0.0, 10.0],
                                   "lookAt": [0.0, 0.0, 0.0]})
        self.assertEqual(path[1]["at"], 1.0)  # clamped to 0..1
        self.assertEqual(path[1]["pos"], [1.0, 2.0, 3.0])
        self.assertIsInstance(path[1]["lookAt"][0], float)

    def test_camera_path_malformed_keyframes_dropped(self):
        clean, errors = shots.validate_shotlist([{
            "template": "globe", "duration": 6, "narration": "One.",
            "visualizes": "One.",
            "cameraPath": ["junk",
                           {"at": 0.5, "pos": [1, 2]},  # pos not 3-vector
                           {"at": 0.5, "pos": [1, 2, 3]},  # no lookAt
                           {"at": 0.5, "pos": [1, "x", 3],
                            "lookAt": [0, 0, 0]},  # non-numeric pos
                           {"at": 0.25, "pos": [1, 2, 3],
                            "lookAt": [0, 0, 0]}],
        }])
        self.assertEqual(errors, [])
        path = clean[0]["cameraPath"]
        self.assertEqual(len(path), 1)
        self.assertEqual(path[0]["at"], 0.25)

    def test_cutaway_spec_has_compare_param(self):
        spec = shots.TEMPLATES["cutaway"]["params"]
        self.assertIn("compare", spec)
        self.assertEqual(spec["compare"][0], "str")
        self.assertEqual(spec["compare"][1], "")
        example = shots.TEMPLATES["cutaway"]["example"]
        self.assertEqual(example["params"]["compare"], "hair")
        self.assertEqual(example["params"]["model"], "cable")
        self.assertIn("Optical fibres", example["params"]["parts"])

    def test_macro_and_process_specs_have_travel_params(self):
        macro = shots.TEMPLATES["macro_flyover"]["params"]
        self.assertIn("travelLabel", macro)
        self.assertEqual(macro["travelLabel"][0], "str")
        self.assertIn("follow", macro)
        self.assertEqual(macro["follow"][0], "num")
        self.assertEqual(macro["follow"][1], 1)
        example = shots.TEMPLATES["macro_flyover"]["example"]
        self.assertEqual(example["params"]["travelLabel"], "To: London")
        self.assertEqual(example["params"]["follow"], 1)
        process = shots.TEMPLATES["process_flow"]["params"]
        self.assertIn("travelLabel", process)
        self.assertEqual(process["travelLabel"][0], "str")
        self.assertEqual(process["travelLabel"][1], "")

    def test_globe_routes_nested_passthrough_floats(self):
        clean, errors = shots.validate_shotlist([{
            "template": "globe", "duration": 6, "narration": "One.",
            "visualizes": "One.",
            "params": {"routes": [{
                "from": {"lat": 31, "lon": 74, "label": "Lahore"},
                "to": {"lat": 51, "lon": 0, "label": "London"}}]},
        }])
        self.assertEqual(errors, [])
        route = clean[0]["params"]["routes"][0]
        self.assertEqual(route["from"]["label"], "Lahore")
        self.assertEqual(route["to"]["label"], "London")
        self.assertIsInstance(route["from"]["lat"], float)
        self.assertIsInstance(route["from"]["lon"], float)
        self.assertEqual(route["from"]["lat"], 31.0)
        self.assertEqual(route["to"]["lon"], 0.0)

    def test_globe_routes_flat_normalized_to_nested(self):
        clean, errors = shots.validate_shotlist([{
            "template": "globe", "duration": 6, "narration": "One.",
            "visualizes": "One.",
            "params": {"routes": [{
                "fromLat": 31.5, "fromLon": 74.3,
                "toLat": 51.5, "toLon": -0.1,
                "fromLabel": "Lahore", "toLabel": "London"}]},
        }])
        self.assertEqual(errors, [])
        route = clean[0]["params"]["routes"][0]
        self.assertNotIn("fromLat", route)
        self.assertEqual(route["from"],
                         {"lat": 31.5, "lon": 74.3, "label": "Lahore"})
        self.assertEqual(route["to"],
                         {"lat": 51.5, "lon": -0.1, "label": "London"})
        self.assertIsInstance(route["from"]["lat"], float)
        self.assertIsInstance(route["to"]["lon"], float)


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

    def test_shot_prompt_requires_visualizes(self):
        text = prompts.shot_prompt("T", "Narr.", "Src")
        self.assertIn("visualizes", text)
        self.assertIn(
            '"visualizes": "<the exact narration sentence(s) '
            'this shot depicts>"', text)

    def test_shot_prompt_data_card_last_resort_at_most_one(self):
        text = prompts.shot_prompt("T", "Narr.", "Src").lower()
        self.assertIn("last resort", text)
        self.assertIn("at most one", text)
        self.assertIn("data_card", text)

    def test_shot_prompt_lists_new_visualization_templates(self):
        text = prompts.shot_prompt("T", "Narr.", "Src")
        for name in ("growth_chart_3d", "stack_growth", "process_flow",
                     "timeline", "comparison_split", "object_orbit"):
            self.assertIn(name, text)

    def test_shot_prompt_mentions_chips_camerapath_and_grammar(self):
        text = prompts.shot_prompt("T", "Narr.", "Src")
        self.assertIn("chips", text)
        self.assertIn("cameraPath", text)
        self.assertIn("camera does", text.lower())  # planning grammar
        self.assertIn("SHOWN", text)
        self.assertIn("continuous journey", text)

    def test_shot_prompt_chip_rules_normal_way(self):
        text = prompts.shot_prompt("T", "Narr.", "Src")
        self.assertIn("CHIP RULES", text)
        self.assertIn("NORMAL way to put a stat on screen", text)
        self.assertIn("explicitly asks for a title/stat card", text)

    def test_fix_prompt_mentions_chips_and_camerapath(self):
        project = {"title": "T", "narration": "N", "sources": "S",
                   "shots": GOOD}
        text = prompts.fix_shot_prompt(project, 0)
        self.assertIn("chips", text)
        self.assertIn("cameraPath", text)

    def test_fix_prompt_requires_visualizes(self):
        project = {"title": "T", "narration": "N", "sources": "S",
                   "shots": GOOD}
        text = prompts.fix_shot_prompt(project, 0)
        self.assertIn("visualizes", text)
        self.assertIn("last resort", text.lower())

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
