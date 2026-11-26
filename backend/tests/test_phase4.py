"""Script mode Phase 4: real-data charts, headlines, the hook builder and the world map (no internet needed)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import headline_view  # noqa: E402
import tools_data as td  # noqa: E402
import tools_hooks as th  # noqa: E402
import tools_script as ts  # noqa: E402
import tools_source as src  # noqa: E402
import vis_data  # noqa: E402
import vis_map  # noqa: E402

CSV = "observation_date,X\n2020-01-01,100\n2020-02-01,.\n2020-03-01,101\n2021-01-01,110\n2021-03-01,99.99\n"


class DataTest(unittest.TestCase):
    def test_series_names(self):
        self.assertEqual(td.parse_series("fred:cpiaucns"), ("fred", "CPIAUCNS", ""))
        self.assertEqual(td.parse_series("worldbank:FP.CPI.TOTL.ZG", "pk"), ("worldbank", "FP.CPI.TOTL.ZG", "PK"))
        self.assertEqual(td.parse_series("wb:IN/NY.GDP.MKTP.CD")[2], "IN")
        for bad in ("yahoo:AAPL", "CPIAUCNS", "fred:../x", "fred:a b", "worldbank:X?y=1"):
            with self.assertRaises(ValueError, msg=bad):
                td.parse_series(bad)
        self.assertFalse(td.fetch("yahoo:AAPL")["ok"])  # refused without touching the network

    def test_reading_the_answers(self):
        points = td.parse_fred_csv(CSV)
        self.assertEqual(len(points), 4)  # the missing value is skipped, not made up
        with self.assertRaises(ValueError):
            td.parse_fred_csv("<html>not data</html>")
        rows, name = td.parse_worldbank([{}, [
            {"date": "2021", "value": 5.0, "indicator": {"value": "Inflation"}, "country": {"value": "Pakistan"}},
            {"date": "2020", "value": None, "indicator": {"value": "Inflation"}, "country": {"value": "Pakistan"}}]])
        self.assertEqual((rows, name), ([["2021", 5.0]], "Inflation — Pakistan"))
        with self.assertRaises(ValueError):
            td.parse_worldbank([{"message": "no"}])

    def test_change_in_a_year_and_choosing(self):
        points = td.parse_fred_csv(CSV)
        change = td.yearly_change(points)
        self.assertEqual([p[0] for p in change], ["2021-01-01", "2021-03-01"])
        self.assertAlmostEqual(change[0][1], 10.0)
        self.assertAlmostEqual(change[1][1], -1.0, places=1)
        self.assertEqual(td.select(points, 2021)[0][0], "2021-01-01")
        self.assertEqual(td.find_highlight(points, "max"), 2)
        self.assertEqual(td.find_highlight(points, "2020"), 1)
        self.assertEqual(td.find_highlight(points, "2021-03"), 3)
        self.assertIsNone(td.find_highlight(points, "1999"))
        long = [[f"{2000 + i // 12}-{i % 12 + 1:02d}-01", float(i % 50)] for i in range(900)]
        kept = td.thin(long, {123})
        self.assertTrue(len(kept) < 240 and {0, 899, 123, 49} <= set(kept))

    def test_units_axis_and_numbers(self):
        self.assertEqual(td.units_of({"units": "Billions of Dollars"}), (1e9, "$", ""))
        self.assertEqual(td.units_of({"units": "Percent"}), (1.0, "", "%"))
        self.assertEqual(td.units_of({"units": "anything"}, "yoy"), (1.0, "", "%"))
        self.assertEqual(vis_data.ticks(-3.4, 10.4), [-5.0, 0.0, 5.0, 10.0, 15.0])
        self.assertTrue(vis_data.axis_range([1, 10])[2])
        self.assertFalse(vis_data.axis_range([100, 110])[2])  # said on screen: the axis does not start at zero
        self.assertEqual(vis_data.number(9.0597, suffix="%"), "9.06%")
        self.assertEqual(vis_data.number(3.07e13, prefix="$"), "$30.7T")


class SceneCodeTest(unittest.TestCase):
    def test_calls_must_be_plain_text(self):
        self.assertEqual(ts.check('data_chart("fred:GDP")\nheadlines(["https://a.com/x", ("https://b.com", "words")])\n')[0], "")
        self.assertIn("plain text", ts.check('s = "fred:GDP"\ndata_chart(s)\n')[0])
        self.assertIn("plain text", ts.check('headlines(["not a link"])\n')[0])
        self.assertEqual(ts.data_calls('data_chart("worldbank:X.Y", country="PK")'), [("worldbank:X.Y", "PK")])
        self.assertEqual(ts.headline_calls('headlines(["https://a.com", ("https://b.com", "t")])'),
                         [("https://a.com", ""), ("https://b.com", "t")])

    def test_pages_used_join_the_sources_once(self):
        job = {"sources": [{"url": "https://a.com", "quote": "q", "fact": "f"}]}
        used = ts.auto_sources({"data": [{"ok": True, "url": "https://fred/x", "title": 'The "CPI"', "source": "FRED"}],
                                "headlines": [{"url": "https://a.com", "headline": "H"}, {"url": "https://b.com"}]})
        self.assertTrue(src.add_found(job, used))
        self.assertFalse(src.add_found(job, used))
        self.assertEqual([s["url"] for s in job["sources"]], ["https://a.com", "https://fred/x"])
        again = src.parse_sources(src.to_text(job["sources"]))  # survives the Sources box
        self.assertEqual([s["url"] for s in again], ["https://a.com", "https://fred/x"])
        self.assertIn("fred/x", src.description_with_sources("d", job["sources"]))

    def test_the_prompt_explains_the_new_tools(self):
        prompt = ts.build_prompt("T", [{"narration": "A."}])
        for word in ("data_chart(", "headlines([", "world_map()", "fly_to(", 'country="PK"'):
            self.assertIn(word, prompt)

    def test_headline_cards_stay_clear_of_the_captions(self):
        for tall in (False, True):
            for count in (1, 2, 3, 4):
                places = headline_view.layout(count, tall)
                self.assertEqual(len(places), count)
                self.assertTrue(all(cy + h / 2 <= 0.86 and cy - h / 2 >= 0 for _x, cy, _w, h, _t in places), (tall, count))


class HookTest(unittest.TestCase):
    ANSWER = ('Sure!\n```python\n# === HOOK 1: question ===\n# NEW WORDS: "Where does it go?"\n# VISUAL IDEA: a\nwait(1)\n'
              '# === HOOK 2: number ===\n**NEW WORDS:** Half is gone\n# VISUAL IDEA: b\nwait(2)\n'
              '# === HOOK 3 ===\nVISUAL IDEA = c\nwait(3)\n```\nEnjoy.')

    def test_reading_the_answer(self):
        got = th.parse_hooks(self.ANSWER)
        self.assertEqual([(h["n"], h["kind"], h["words"]) for h in got],
                         [(1, "question", "Where does it go?"), (2, "number", "Half is gone"), (3, "proof", "")])
        self.assertTrue(all(ts.check(h["code"])[0] == "" and ts.idea_of(h["code"]) for h in got))
        self.assertNotIn("Enjoy", got[2]["code"])
        self.assertEqual(th.parse_hooks("nothing here"), [])

    def test_only_the_first_sentence_is_replaced(self):
        old = "Most people lose money. At seven percent, it halves. Watch."
        self.assertEqual(th.new_narration(old, "Where does it go"),
                         "Where does it go. At seven percent, it halves. Watch.")
        self.assertEqual(th.new_narration("One sentence only", "New!"), "New!")
        self.assertEqual(th.new_narration(old, ""), old)
        self.assertEqual(th.split_first_sentence("It cost $3.5 million. Then more.")[0], "It cost $3.5 million.")

    def test_prompts_for_both_modes(self):
        job = {"title": "T", "scenes": [{"narration": "First. Second."}],
               "sources": [{"url": "https://a.com", "quote": "q", "fact": "f"}]}
        words, visuals = th.build_prompt(job, "words"), th.build_prompt(job, "visuals")
        self.assertIn('REPLACE the first sentence ("First.")', words)
        self.assertNotIn("# NEW WORDS", visuals)
        for p in (words, visuals):
            self.assertIn("HOOK 3: proof", p)
            self.assertIn("https://a.com", p)


class MapTest(unittest.TestCase):
    def test_places(self):
        self.assertEqual(vis_map.country("usa")["name"], "United States of America")
        self.assertEqual(vis_map.country("PK")["name"], "Pakistan")
        self.assertIsNone(vis_map.country("Atlantis"))
        lon, lat = vis_map.lonlat("Karachi")
        self.assertTrue(66 < lon < 68 and 24 < lat < 26)
        self.assertIsNotNone(vis_map.lonlat("London"))
        self.assertEqual(vis_map.lonlat((10, 20)), (10.0, 20.0))
        self.assertIsNone(vis_map.lonlat((999, 0)))
        x0, _y0, x1, _y1 = vis_map.main_box(vis_map.country("France"))
        self.assertTrue(-6 < x0 < 0 and 5 < x1 < 11)  # mainland France, not its far islands

    def test_long_flights_rise_higher(self):
        near = vis_map.flight(2.0, 2.0, 0.5, 0.5)
        far = vis_map.flight(2.0, 2.0, 6.0, 0.5)
        self.assertAlmostEqual(near, 2.0)
        self.assertGreater(far, 4.0)
        self.assertAlmostEqual(vis_map.flight(14.0, 2.0, 5.0, 1.0), 2.0)

    def test_map_code_is_accepted(self):
        code = 'world_map()\nfly_to("Japan")\nlight(["China", "Japan"], "red")\npin("Tokyo", "x")\nroute("Tokyo", (0, 51))\n'
        self.assertEqual(ts.check(code)[0], "")


if __name__ == "__main__":
    unittest.main()
