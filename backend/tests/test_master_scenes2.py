"""Script mode Phase 3, second set of master scenes: their maths and what the AI is told."""
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import tools_script as ts  # noqa: E402
import vis_master as vm  # noqa: E402
import vis_master2 as vm2  # noqa: E402


class DebtTest(unittest.TestCase):
    def test_payoff(self):
        run = vm2.debt_run(5000, 0.24, 125)
        self.assertEqual(run["months"], 82)
        self.assertAlmostEqual(run["interest"], 5159, delta=1)
        self.assertEqual(run["balances"][-1], 0)

    def test_payment_below_interest_never_pays_off(self):
        run = vm2.debt_run(5000, 0.24, 90)
        self.assertIsNone(run["months"])
        self.assertGreater(run["balances"][-1], 5000)

    def test_no_interest(self):
        self.assertEqual(vm2.debt_run(1000, 0, 100)["months"], 10)

    def test_snowball_and_avalanche(self):
        debts = [("Card", 4000, 0.24, 100), ("Car", 7000, 0.07, 160), ("Loan", 1500, 0.12, 50)]
        snow, ava = (vm2.payoff_race(debts, 200, o) for o in ("snowball", "avalanche"))
        self.assertEqual(snow["order"][0], 2)  # the smallest debt first
        self.assertEqual(ava["order"][0], 0)   # the highest rate first
        self.assertLess(ava["interest"], snow["interest"])
        self.assertTrue(all(b == 0 for b in ava["history"][-1]))
        # without interest both take total / monthly money
        flat = [("A", 600, 0, 50), ("B", 400, 0, 50)]
        self.assertEqual(vm2.payoff_race(flat, 0, "snowball")["months"], 10)
        self.assertIsNone(vm2.payoff_race([("A", 1000, 0.5, 5), ("B", 1000, 0.5, 5)], 0, "avalanche")["months"])

    def test_words(self):
        self.assertEqual(vm2.duration_words(82), "6 years 10 months")
        self.assertEqual(vm2.duration_words(12), "1 year")
        self.assertEqual(vm2.duration_words(1), "1 month")


class OtherMathTest(unittest.TestCase):
    def test_tax_is_only_charged_inside_each_bracket(self):
        rows = vm2.bracket_tax(60000, vm2.EXAMPLE_BRACKETS)
        self.assertEqual([round(r["tax"]) for r in rows], [1000, 3600, 4400, 0])
        self.assertEqual(sum(r["taxed"] for r in rows), 60000)

    def test_buying_at_changing_prices(self):
        got = vm2.buy_over_time(100, vm2.EXAMPLE_PRICES)
        self.assertAlmostEqual(got["total"], 65)
        self.assertAlmostEqual(got["avg_cost"], 7.692, places=3)
        self.assertAlmostEqual(got["avg_price"], 8.2)

    def test_fees(self):
        low, high = vm2.fee_values(10000, 0.07, 30, 0.001), vm2.fee_values(10000, 0.07, 30, 0.01)
        self.assertAlmostEqual(low, 74017, delta=1)
        self.assertAlmostEqual(high, 57435, delta=1)


class CatalogueTest(unittest.TestCase):
    def test_all_21_are_listed_once_and_explained(self):
        self.assertEqual(len(vm.NAMES), 21)
        self.assertEqual(len(set(vm.NAMES)), 21)
        prompt = ts.build_prompt("T", [{"narration": "A."}])
        for name in vm.NAMES:
            self.assertIn(f"  {name}(", prompt)

    def test_every_example_in_the_catalogue_is_code_the_app_accepts(self):
        examples = re.findall(r"(?ms)^  ((?:%s)\(.*?\))(?:\s{3,}steps|\s*$)" % "|".join(vm.NAMES), vm.GUIDE)
        self.assertGreaterEqual(len(examples), 18)
        for code in examples:
            self.assertEqual(ts.check(" ".join(line.strip() for line in code.split("\n")) + "\n")[0], "", code)

    def test_variety_knows_them(self):
        s = {"narration": "x", "code": 'net_worth([("A", 1)])\n'}
        self.assertIn("twice in a row", " ".join(ts.variety_warnings([s, s], 1)))


if __name__ == "__main__":
    unittest.main()
