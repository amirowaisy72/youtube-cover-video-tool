"""Script mode Phase 3: the master scenes' maths, their inputs, timing, variety and what the AI is told."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import tools_script as ts  # noqa: E402
import vis_master as vm  # noqa: E402


class MathTest(unittest.TestCase):
    def test_compound(self):
        self.assertAlmostEqual(vm.compound_value(1000, 0.08, 30), 10062.66, places=1)
        # 200 a month, 7% for 25 years, monthly compounding
        self.assertAlmostEqual(vm.compound_value(0, 0.07, 25, 200), 162014.34, places=0)
        self.assertEqual(vm.compound_value(100, 0, 10, 10), 1300)

    def test_inflation(self):
        self.assertAlmostEqual(vm.buying_power(100, 0.07, 10), 50.83, places=2)

    def test_rates_in_both_forms(self):
        self.assertEqual(vm.as_rate(8), 0.08)
        self.assertEqual(vm.as_rate(0.08), 0.08)

    def test_money(self):
        for value, text in ((950, "$950"), (10062.66, "$10,063"), (1.5e6, "$1.5M"), (6e8, "$600M"), (1.2e9, "$1.2B"),
                            (2.5, "$2.50"), (-40, "-$40")):
            self.assertEqual(vm.money(value), text)
        self.assertEqual(vm.money(5e8, "€", like=1.2e9), "€0.50B")  # a counter keeps one unit
        self.assertEqual(vm.percent(0.125), "12.5%")


class InputTest(unittest.TestCase):
    def test_parts_as_shares_amounts_or_percent(self):
        for parts in ([("A", 0.5), ("B", 0.4)], [("A", 500e6), ("B", 400e6)], [("A", 50), ("B", 40)]):
            got, warn = vm.split_parts(1e9, parts)
            self.assertEqual([p["name"] for p in got], ["A", "B", "Other"])
            self.assertAlmostEqual(got[0]["value"], 5e8)
            self.assertAlmostEqual(got[2]["share"], 0.1)
            self.assertEqual(warn, "")

    def test_parts_that_do_not_fit_warn(self):
        self.assertIn("add up to", vm.split_parts(100, [("A", 80), ("B", 60)])[1])
        self.assertEqual(vm.split_parts(100, [("A", "lots")])[0], [])

    def test_items_with_colour_or_icon(self):
        got = vm.read_items([("Cost", 5, "red"), {"name": "Studio", "value": 2, "icon": "clapper"}, ("bad", -1)])
        self.assertEqual([(p["name"], p["color"], p["icon"]) for p in got], [("Cost", "red", None), ("Studio", None, "clapper")])

    def test_steps_follow_the_words_and_stay_in_order(self):
        self.assertEqual(vm.beat_times([1.0, 3.0, 5.0], 0.1, 8.0), [1.0, 3.0, 5.0])
        for found in ([None, None, None], [None, 4.0, None], [6.0, 2.0, None], [7.9, 7.95, 7.99]):
            t = vm.beat_times(found, 0.1, 8.0)
            self.assertEqual(t, sorted(t))
            self.assertTrue(0.1 <= t[0] and t[-1] <= 7.3, t)


class PromptTest(unittest.TestCase):
    def test_every_master_scene_is_explained_and_its_example_is_safe(self):
        prompt = ts.build_prompt("T", [{"narration": "A."}])
        for name in vm.NAMES:
            self.assertIn(f"  {name}(", prompt)
        code = ('compound(start=1000, rate=0.08, years=30, when_words={"start": "a", "result": "b"})\n'
                'revenue_split(1e9, [("Theaters", 0.5)], highlight="Theaters")\n')
        self.assertEqual(ts.check(code)[0], "")

    def test_repeating_a_master_scene_warns(self):
        s = {"narration": "x", "code": 'big_number_compare([("A", 1), ("B", 2)])\n'}
        other = {"narration": "x", "code": 'thing("gem")\n'}
        self.assertIn("twice in a row", " ".join(ts.variety_warnings([s, s], 1)))
        self.assertIn("at most 2 times", " ".join(ts.variety_warnings([s, other, s, other, s], 4)))
        both = {"narration": "x", "code": "compound()\ninflation()\n"}
        self.assertIn("only one", " ".join(ts.variety_warnings([both], 0)))
        self.assertIn("big_number_compare() in scene 1", ts.fix_prompt("T", [s, other], 1, "", []))


if __name__ == "__main__":
    unittest.main()
