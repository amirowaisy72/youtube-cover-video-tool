"""Script mode: the VISUAL IDEA line, the contact sheet and the Gemini review (Gemini is faked)."""
import copy
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import scene_sheet  # noqa: E402
import tools_review as tr  # noqa: E402
import tools_script as ts  # noqa: E402

CODE = '# VISUAL IDEA: money shrinks = a coin gets smaller\nc = thing("coin")\nenter(c)\n'


class IdeaTest(unittest.TestCase):
    def test_idea_read_with_continuation(self):
        self.assertEqual(ts.idea_of(CODE), "money shrinks = a coin gets smaller")
        self.assertEqual(ts.idea_of("# VISUAL IDEA: a\n#    longer idea\n# a code note\nx = 1\n"), "a longer idea")
        self.assertEqual(ts.idea_of("x = 1\n"), "")

    def test_ai_habits_become_comments(self):
        for line in ('VISUAL IDEA = "debt grows"', "**VISUAL IDEA:** debt grows", "# VISUAL IDEA — debt grows"):
            parts = ts.parse(f"# === SCENE 1 ===\n{line}\nwait(1)\n")
            self.assertEqual(ts.idea_of(parts[1]), "debt grows", line)
            self.assertEqual(ts.check(parts[1])[0], "")

    def test_idea_above_the_marker_belongs_to_that_scene(self):
        parts = ts.parse("# VISUAL IDEA: one\n# === SCENE 1 ===\nwait(1)\n\n# VISUAL IDEA: two\n# === SCENE 2 ===\nwait(2)\n")
        self.assertEqual([ts.idea_of(parts[1]), ts.idea_of(parts[2])], ["one", "two"])
        self.assertNotIn("two", parts[1])

    def test_review_text_around_the_code_block_is_ignored(self):
        answer = f"REVIEW: too small.\n```python\n# === SCENE 3 ===\n{CODE}```\nHope this helps!"
        self.assertEqual(ts.parse(answer), {3: CODE})
        self.assertEqual(ts.single_block(f"Review.\n```python\n{CODE}```\nDone."), CODE)

    def test_plain_paste_still_works(self):
        self.assertEqual(ts.parse("# === SCENE 1 ===\nwait(1)\n# === SCENE 2 ===\nwait(2)\n"), {1: "wait(1)\n", 2: "wait(2)\n"})

    def test_prompts(self):
        scenes = [{"narration": "A.", "code": CODE}, {"narration": "B.", "code": CODE,
                  "script_test": {"frames": [{"t": 1.0, "said": "B."}]}}]
        p = ts.fix_prompt("T", scenes, 1, "", [])
        self.assertIn("contact sheet", p)
        self.assertIn("Scene 1: money shrinks", p)
        self.assertIn("VISUAL IDEA of this scene: money shrinks", p)
        self.assertIn("IDEA FIRST", ts.build_prompt("T", scenes))


class SheetTest(unittest.TestCase):
    def test_frame_times(self):
        for d in (2.0, 6.0, 12.0, 40.0):
            t = scene_sheet.frame_times(d)
            self.assertTrue(4 <= len(t) <= 6 and t == sorted(t) and 0 < t[0] <= 1.0 and t[-1] < d)
        self.assertIn(7.3, scene_sheet.frame_times(12.0, 7.3))

    def test_every_word_is_listed_once(self):
        words = [[f"w{i}", i * 0.5] for i in range(20)]
        said = " ".join(f["said"] for f in scene_sheet.spoken(words, scene_sheet.frame_times(9.0)))
        self.assertEqual(said.split(), [w for w, _ in words])

    @unittest.skipUnless(shutil.which("ffmpeg"), "needs ffmpeg")
    def test_sheet_picture(self):
        with tempfile.TemporaryDirectory() as d:
            video = Path(d) / "v.mp4"
            subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=s=360x640:d=6:r=15", str(video)], check=True)
            frames = scene_sheet.make(video, Path(d) / "s.png", [["Hi", 0.2]], 6.0, 1, "idea", "Hi", mark=3.0)
            self.assertTrue((Path(d) / "s.png").stat().st_size > 5000)
            self.assertEqual(sum(f["paused"] for f in frames), 1)


class FakeApp:
    def __init__(self, job, folder):
        self.job, self.folder = job, folder

    def _av_read(self, _i):
        return copy.deepcopy(self.job)

    def _av_write(self, job):
        self.job = copy.deepcopy(job)

    def _av_job_dir(self, _i):
        return self.folder


class ReviewTest(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        (self.dir / "sheet.png").write_bytes(b"png")
        scene = {"narration": "Money shrinks.", "code": CODE,
                 "script_test": {"ok": True, "sheet": "sheet.png", "frames": [], "warnings": []}}
        self.app = FakeApp({"title": "T", "scenes": [scene]}, self.dir)
        self.post, tr.GAP = tr._post, 0
        tr._STATE["j"] = {"running": True, "done": 0, "total": 1, "stage": "", "error": "", "stop": False}

    def tearDown(self):
        tr._post = self.post
        shutil.rmtree(self.dir, ignore_errors=True)

    def run_with(self, answer):
        tr._post = lambda *a: answer
        tr._worker(self.app, "j", [0], "KEY")
        return self.app.job["scenes"][0]

    def test_a_fix_is_offered_but_not_applied(self):
        sc = self.run_with(json.dumps({"seen": "a coin", "verdict": "fix", "problems": ["too small"],
                                       "code": "# VISUAL IDEA: x\nwait(1)"}))
        self.assertEqual(sc["code"], CODE)
        self.assertEqual(sc["script_review"]["code"], "# VISUAL IDEA: x\nwait(1)\n")
        self.assertEqual(sc["script_review"]["problems"], ["too small"])

    def test_unsafe_code_is_flagged(self):
        sc = self.run_with(json.dumps({"verdict": "fix", "problems": [], "code": "import os"}))
        self.assertIn("imports are not allowed", sc["script_review"]["code_error"])

    def test_unreadable_answer(self):
        sc = self.run_with("I cannot do that")
        self.assertEqual(sc["script_review"]["verdict"], "error")

    def test_bad_key_stops_the_run(self):
        def refuse(*_a):
            raise tr.urllib.error.HTTPError("u", 403, "no", {}, __import__("io").BytesIO(b"API key not valid"))
        tr._post = refuse
        tr._worker(self.app, "j", [0], "KEY")
        self.assertIn("not valid", tr._STATE["j"]["error"])
        self.assertNotIn("script_review", self.app.job["scenes"][0])

    def test_review_of_changed_code_is_hidden(self):
        sc = self.run_with(json.dumps({"verdict": "good"}))
        self.assertEqual(len(tr._status(self.app.job, "j")["reviews"]), 1)
        sc["code"] = CODE + "wait(2)\n"
        self.assertEqual(tr._status({"scenes": [sc]}, "j")["reviews"], [])


if __name__ == "__main__":
    unittest.main()
