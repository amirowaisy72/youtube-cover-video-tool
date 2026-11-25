"""Script mode Phase 2: characters, the icon set, settings, transitions and the variety rules."""
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import icon_pack  # noqa: E402
import tools_script as ts  # noqa: E402
import vis_transitions  # noqa: E402


class IconTest(unittest.TestCase):
    def test_pack_is_complete_and_named_simply(self):
        names = icon_pack.names()
        self.assertGreater(len(names), 300)
        self.assertTrue(all(n == n.lower() and " " not in n and "-" not in n for n in names))
        self.assertEqual(icon_pack.key_of("Shopping carts"), "shopping_cart")
        self.assertIsNone(icon_pack.key_of("no such thing"))
        self.assertIn("<svg", icon_pack.svg_file("shopping_cart").read_text(encoding="utf-8"))

    def test_no_icon_hides_a_drawn_object(self):
        import tools_visual as tv
        K = tv._vk()
        clash = [n for n in icon_pack.names() if n in K.BUILDERS or n.replace("_", " ") in K.ALIASES]
        self.assertEqual(clash, [])

    def test_icons_need_no_download(self):
        import tools_visual as tv
        spec = {"objects": [{"id": "a", "obj": "shopping cart"}]}
        self.assertEqual(tv.resolve_objects(spec), [])
        self.assertEqual(spec["objects"][0]["obj"], "shopping_cart")


class PeopleTest(unittest.TestCase):
    def test_every_asked_pose_exists_and_draws(self):
        import vis_people as P
        for name in ("happy", "worried", "thinking", "running", "pointing", "celebrating", "holding money", "holding_phone"):
            self.assertIsNotNone(P.pose_name(name), name)
        for name in P.POSES:
            self.assertLess(P.Person("maya", name, height=3.0).height, 3.9, name)

    def test_new_pose_stays_in_place(self):
        import vis_people as P
        p = P.Person("sam", "standing", height=3.0)
        p.shift([2, -1, 0]).scale(0.5)
        feet, size = p.submobjects[0].get_center().copy(), float(p.submobjects[0].width)
        p.show(P.POSES["celebrating"])
        self.assertAlmostEqual(float(p.submobjects[0].width), size)
        self.assertTrue((abs(p.submobjects[0].get_center() - feet) < 1e-6).all())


def scene(*things, extra=""):
    return {"narration": "x", "code": "".join(f'a = thing("{t}")\n' for t in things) + extra}


class VarietyTest(unittest.TestCase):
    def test_things_are_counted_by_what_is_drawn(self):
        code = 'thing("money")\nflow(a, b)\npile("coins")\nperson("happy")\ntext("hi")\nswap(a, name="trophy")\n'
        self.assertEqual(ts.things_of(code), ["cash", "coin", "trophy"])

    def test_repeating_the_previous_scene_warns(self):
        warns = ts.variety_warnings([scene("coin", "bank"), scene("coin", "bank")], 1)
        self.assertIn("previous scene", warns[0])
        self.assertEqual(ts.variety_warnings([scene("coin"), scene("umbrella", "receipt")], 1), [])

    def test_too_often(self):
        scenes = [scene("coin") if i % 2 == 0 else scene("gem") for i in range(7)]
        self.assertTrue(any("'coin' is now in 4 scenes" in w for w in ts.variety_warnings(scenes, 6)))

    def test_same_background_three_times(self):
        s = {"narration": "x", "code": 'setting("city")\n'}
        self.assertIn("third scene in a row", ts.variety_warnings([s, s, s], 2)[0])

    def test_fix_prompt_lists_what_is_used(self):
        p = ts.fix_prompt("T", [scene("coin"), scene("coin"), scene("coin"), scene("receipt")], 3, "", [])
        self.assertIn("coin: scenes 1, 2, 3  <- limit reached", p)
        for word in ("person(pose=", 'setting("street")', "transition(", "shopping_cart"):
            self.assertIn(word, p)


class TransitionTest(unittest.TestCase):
    def test_read_from_the_code(self):
        code = 'transition("whip", "in")\nsetting("bank")\ntransition("zoom-through", when="out")\n'
        self.assertEqual(ts.transitions_of(code), {"in": "whip", "out": "zoom"})
        self.assertIn("plain text", ts.check('k = "whip"\ntransition(k)\n')[0])

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "needs ffmpeg")
    def test_length_stays_the_same(self):
        def frames(p):
            return int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v", "-show_entries",
                                       "stream=nb_read_frames", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)
        with tempfile.TemporaryDirectory() as d:
            for kind in vis_transitions.KINDS:
                v = Path(d) / f"{kind}.mp4"
                subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=s=640x360:d=2:r=15", "-pix_fmt", "yuv420p",
                                str(v)], check=True)
                before = v.read_bytes()
                self.assertTrue(vis_transitions.apply(v, {"in": kind, "out": kind}, 640, 360, 15, 2.0), kind)
                self.assertNotEqual(v.read_bytes(), before)
                self.assertEqual(frames(v), 30, kind)


if __name__ == "__main__":
    unittest.main()
