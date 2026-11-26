"""The channel mascot: its reactions, pointing and the prompt (no rendering)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np  # noqa: E402

import tools_script as ts  # noqa: E402
import vis_mascot as vm  # noqa: E402


class MascotTest(unittest.TestCase):
    def test_reaction_names(self):
        self.assertEqual(vm.pose_name("Surprised"), "surprised")
        self.assertEqual(vm.pose_name("neutral"), "calm")
        self.assertIsNone(vm.pose_name("dancing"))
        self.assertEqual(set(vm.SOUNDS), set(vm.POSES))

    def test_every_reaction_draws_and_moves_smoothly(self):
        for name, pose in vm.POSES.items():
            self.assertTrue(len(vm.draw(pose).family_members_with_points()) > 40, name)
            half = vm.between(vm.POSES["calm"], pose, 0.5)
            self.assertEqual(len(half["al"]), 3)
            vm.draw(half, blink=True)

    def test_it_points_to_the_side_of_the_thing(self):
        left = vm.pointing_at(np.float64(-3.0), np.float64(0.5))
        right = vm.pointing_at(np.float64(3.0), np.float64(0.5))
        self.assertIs(left["point_left"], True)
        self.assertLess(left["al"][-1][0], -1.4)
        self.assertGreater(right["ar"][-1][0], 1.4)
        self.assertLess(vm.pointing_at(0.1, -9)["ar"][-1][1], 0)  # clamped: never through its own body

    def test_it_keeps_its_place_and_size(self):
        m = vm.Mascot("calm", 2.6)
        m.shift([2.0, -2.0, 0]).scale(0.5)
        before = m.centre().copy()
        m.show(vm.POSES["celebrating"])
        self.assertTrue(np.allclose(m.centre(), before))

    def test_the_prompt_explains_it(self):
        prompt = ts.build_prompt("T", [{"narration": "A."}])
        for word in ("mascot(", "react(", "point_at(", "flip_coin("):
            self.assertIn(word, prompt)
        code = "\n".join(["m = mascot()", "enter(m)", "flip_coin(m)"])
        self.assertEqual(ts.check(code)[0], "")


if __name__ == "__main__":
    unittest.main()
