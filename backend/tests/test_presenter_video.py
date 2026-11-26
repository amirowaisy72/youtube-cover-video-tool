"""Talking Presenter, steps 4-9: mouth timing, storyboard, subtitles, layout, backgrounds and the routes' rules
(no internet and no model files needed; the animation tests need OpenCV)."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException  # noqa: E402

import presenter_lipsync as ls  # noqa: E402
import presenter_models as pm  # noqa: E402
import presenter_routes as pr  # noqa: E402
import presenter_video as pv  # noqa: E402
import tools_animator as ta  # noqa: E402
import tools_talk as t  # noqa: E402

HAVE_CV = pm.add_libraries()
SCRIPT = ("Most films lose money. Here is why.\n\n" + " ".join(f"Sentence number {i} explains one more thing about it." for i in range(8))
          + "\n\nNow you know. Follow for more.")


def timed(script: str, per: float = 0.4) -> list[dict]:
    return [{"word": w, "start": i * per, "end": i * per + per * 0.9} for i, w in enumerate(script.split())]


class MouthTest(unittest.TestCase):
    def test_sounds_make_the_right_shapes(self):
        self.assertEqual(ls.sounds_of("mama")[0], "closed")
        self.assertIn("round", ls.sounds_of("moon"))
        self.assertIn("wide", ls.sounds_of("see"))
        self.assertIn("open", ls.sounds_of("car") + ls.sounds_of("hat"))
        self.assertTrue(len(ls.sounds_of("2026")) >= 3)
        self.assertTrue(ls.sounds_of("..."))

    def test_the_mouth_follows_the_voice(self):
        tone = 0.5 * np.sin(np.arange(16000, dtype=np.float32) / 3)
        samples = np.concatenate([np.zeros(16000, np.float32), tone, np.zeros(16000, np.float32)]).astype(np.float32)
        words = [{"word": "aaa", "start": 1.0, "end": 1.5}, {"word": "mmm", "start": 1.5, "end": 1.7}, {"word": "ooo", "start": 1.7, "end": 2.0}]
        opening, wide = ls.timeline(samples, words, 3.0)
        self.assertEqual(len(opening), 75)
        self.assertLess(opening[:20].max(), 0.05)      # silence: shut
        self.assertGreater(opening[28:36].max(), 0.5)  # "a": open
        self.assertLess(opening[38:43].min(), 0.12)    # "m": lips together (the mouth follows one frame late)
        self.assertLess(wide[45:50].min(), -0.5)       # "o": round
        self.assertLess(opening[56:].max(), 0.05)
        self.assertLessEqual(float(np.diff(opening).max()), 0.21)  # eased in: never a jump

    def test_blinks_and_head_are_small_and_repeatable(self):
        shut = ls.blinks(25 * 60)
        starts = int(((shut[1:] > 0) & (shut[:-1] == 0)).sum())
        self.assertTrue(8 <= starts <= 30)
        self.assertTrue(np.array_equal(shut, ls.blinks(25 * 60)))
        move = ls.head_motion(500, np.zeros(500, np.float32))
        self.assertLess(np.abs(move[:, 0]).max(), 1.4)
        self.assertLess(np.abs(move[:, 1:]).max(), 0.04)

    @unittest.skipUnless(HAVE_CV, "OpenCV is not installed")
    def test_glasses_are_seen_from_their_frame(self):
        import cv2
        points = np.zeros((478, 2))
        for (a, b), upper, lower in ls.EYES:
            left = 100 if a == 33 else 236
            for ids, y in ((upper, 190), (lower, 214)):
                for k, i in enumerate(ids):
                    points[i] = (left + k * 64 / (len(ids) - 1), y if 0 < k < len(ids) - 1 else 202)
            points[a], points[b] = (left, 202), (left + 64, 202)
        points[133], points[362] = (164, 202), (236, 202)
        points[1] = (200, 260)
        bare = np.full((400, 400, 3), 170, np.uint8)
        self.assertEqual(ls.eye_check(bare, points), {**ls.eye_check(bare, points), "glasses": False, "blink": 1.0})
        framed = bare.copy()
        for x in (132, 268):
            cv2.ellipse(framed, (x, 212), (58, 46), 0, 0, 360, (30, 25, 20), 4)
        cv2.line(framed, (185, 198), (215, 198), (30, 25, 20), 4)
        self.assertTrue(ls.eye_check(framed, points)["glasses"])

    @unittest.skipUnless(HAVE_CV, "OpenCV is not installed")
    def test_the_puppet_changes_only_the_face(self):
        h, w = 400, 300
        photo = np.random.default_rng(1).integers(60, 200, (h, w, 3)).astype(np.uint8)
        points = np.zeros((478, 2))
        points[:] = (150, 150)
        points[10], points[152], points[234], points[454] = (150, 90), (150, 210), (95, 150), (205, 150)
        points[61], points[291] = (128, 180), (172, 180)
        for k, (u, low) in enumerate(zip(ls.LIP_UP, ls.LIP_LOW)):
            x = 130 + k * 4
            points[u], points[low] = (x, 180), (x, 181)
        for (a, b), upper, lower in ls.EYES:
            left = 115 if a == 33 else 160
            for ids, y in ((upper, 128), (lower, 136)):
                for k, i in enumerate(ids):
                    points[i] = (left + k * 25 / (len(ids) - 1), y if 0 < k < len(ids) - 1 else 132)
            points[a], points[b] = (left, 132), (left + 25, 132)
        puppet = ls.Puppet(photo, np.full((h, w), 255, np.uint8), points)
        still, alpha = puppet.frame()
        self.assertTrue(np.array_equal(still, photo) and alpha.min() == 255)
        talking, _ = puppet.frame(opening=1.0)
        self.assertGreater(np.abs(talking[175:200, 135:165].astype(int) - photo[175:200, 135:165]).mean(), 8)
        self.assertTrue(np.array_equal(talking[:150], photo[:150]) and np.array_equal(talking[330:], photo[330:]))
        self.assertGreater(float(puppet.follow.max()), 0.8)    # the jaw moves, not only the lips
        blinking, _ = puppet.frame(shut=1.0)
        changed = np.nonzero((blinking != photo).any(axis=2))
        self.assertTrue(len(changed[0]) > 50)
        self.assertTrue(changed[0].min() >= 122 and changed[0].max() <= 144, "only the eyes: no eyebrows, nothing below")
        self.assertTrue(changed[1].min() >= 108 and changed[1].max() <= 192)
        none = ls.Puppet(photo, np.full((h, w), 255, np.uint8), points, blink_limit=0.0)
        self.assertTrue(np.array_equal(none.frame(shut=1.0)[0], photo))
        moved, _ = puppet.frame(head=(2.0, 0.03, 0.02))
        self.assertTrue(np.array_equal(moved[puppet.head_rows:], photo[puppet.head_rows:]))


class StoryboardTest(unittest.TestCase):
    def test_scenes_cover_the_voice_and_keep_your_choices(self):
        words = timed(SCRIPT)
        total = words[-1]["end"] + 0.5
        scenes = pv.build_scenes(SCRIPT, words, total)
        self.assertEqual(" ".join(s["narration"] for s in scenes), " ".join(SCRIPT.split()))
        self.assertEqual(scenes[0]["start"], 0.0)
        self.assertAlmostEqual(scenes[-1]["end"], total, delta=0.05)
        self.assertTrue(all(a["end"] == b["start"] for a, b in zip(scenes, scenes[1:])))
        self.assertTrue(all(s["presenter"] for s in scenes))  # the presenter is in the whole video
        self.assertTrue(len(scenes) >= 4 and scenes[0]["end"] < 8)
        scenes[1]["bg"] = {"type": "graphic", "code": "wait(1)"}
        scenes[1]["presenter"] = False
        again = pv.build_scenes(SCRIPT, words, total, scenes)
        self.assertEqual((again[1]["bg"]["type"], again[1]["presenter"]), ("graphic", False))

    def test_subtitles_show_words_one_by_one(self):
        words = timed("One two three four five six.")
        extras = pv.DEFAULT_EXTRAS
        ass = pv.subtitles(words, 0.0, 3.0, extras, pv.DEFAULT_LAYOUT, (1280, 720))
        events = [line for line in ass.splitlines() if line.startswith("Dialogue")]
        self.assertEqual(len(events), 6)
        self.assertIn("\\alpha&HFF&", events[0])      # the later words are not shown yet
        self.assertIn("&H45C4F6&", events[0])          # the spoken word in the highlight colour
        evil = pv.subtitles([{"word": "{\\b1}x", "start": 0, "end": 1}], 0, 1, extras, pv.DEFAULT_LAYOUT, (1280, 720))
        self.assertNotIn("{\\b1}", evil)
        self.assertTrue(all(len(g) <= 5 for g in pv.chunks(timed("a " * 30), 5, 24)))

    def test_placement_and_wave_stay_inside(self):
        for fmt, size in pv.SIZES.items():
            layout = {**pv.DEFAULT_LAYOUT, "format": fmt, **pv.PRESETS[fmt]}
            for position in ("bottom-left", "bottom-right", "center"):
                x, y, w, h = pv.placement(layout, {"presenter": True, "position": position}, 0.7, size)
                self.assertTrue(x >= 0 and y >= 0 and x + w <= size[0] and y + h == size[1])
            self.assertIsNone(pv.placement(layout, {"presenter": True, "position": "hidden"}, 0.7, size))
            self.assertIsNone(pv.placement(layout, {"presenter": False}, 0.7, size))
            x, y, w, h = pv.wave_place(pv.DEFAULT_EXTRAS, layout, size)
            self.assertTrue(x >= 0 and y > 0 and x + w <= size[0] and y + h < size[1] - pv.subtitle_metrics(
                pv.DEFAULT_EXTRAS, layout, size)["margin"])

    def test_captions_never_cover_a_close_up_face(self):
        with tempfile.TemporaryDirectory() as tmp:
            points = np.zeros((478, 2))
            points[10], points[152], points[234], points[454] = (200, 90), (200, 300), (110, 200), (290, 200)
            np.save(Path(tmp) / "face.npy", points)
            cast = mock.Mock(folder=Path(tmp))
            cast.box.return_value = (0, 0, 400, 400)  # a head-and-shoulders photo
            scene = {"presenter": True, "position": ""}
            for fmt in ("long", "short"):
                layout = {**pv.DEFAULT_LAYOUT, "format": fmt, **pv.PRESETS[fmt]}
                size = pv.SIZES[fmt]
                got = pv.clear_of_face(cast, scene, pv.DEFAULT_EXTRAS, layout, size)
                x, y, w, h = pv.placement(layout, scene, 1.0, size)
                face = (x + w * 110 / 400, x + w * 290 / 400, y + h * 90 / 400, y + h * 300 / 400)
                m = pv.subtitle_metrics(got, layout, size)
                wx, wy, ww, wh = pv.wave_place(got, layout, size)
                if fmt == "long":  # beside the presenter
                    self.assertTrue(wx + ww <= face[0] and m["area"][1] <= face[0])
                else:              # above the head
                    self.assertLess(size[1] - m["margin"], face[2])
                    self.assertTrue(0 < wy < wy + wh < face[2])
            self.assertIs(pv.clear_of_face(cast, {"presenter": False}, pv.DEFAULT_EXTRAS, layout, size), pv.DEFAULT_EXTRAS)

    def test_slides_and_missing_backgrounds(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / "media").mkdir()
            for k, c in enumerate(("red", "blue")):
                Image.new("RGB", (400, 300), c).save(folder / "media" / f"{k}.jpg")
            frames = list(pv.slides([folder / "media" / "0.jpg", folder / "media" / "1.jpg"], (160, 90), 40))
            self.assertEqual((len(frames), frames[0].shape), (40, (90, 160, 3)))
            self.assertGreater(frames[0][..., 0].mean(), 200)
            self.assertGreater(frames[-1][..., 2].mean(), 200)
            for kind, word in (("graphic", "no scene code"), ("stock", "no stock clip"), ("image", "no image"), ("slides", "no images")):
                self.assertIn(word, pv.background_problem(folder, {"bg": {"type": kind}}))
            self.assertEqual(pv.background_problem(folder, {"bg": {"type": "slides", "files": ["0.jpg"]}}), "")


class RouteTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        for patch in (mock.patch.object(ta, "BASE_DIR", Path(self.tmp.name)),
                      mock.patch.object(t, "audio_dir", lambda: Path(self.tmp.name))):
            patch.start()
            self.addCleanup(patch.stop)
        self.addCleanup(self.tmp.cleanup)
        words = timed(SCRIPT)
        self.id = "abcdefabcdef"
        stamp = t.voice_stamp(SCRIPT, {"provider": "edge", "voice": "v"})
        t.write({"id": self.id, "title": "T", "status": "idle", "script": SCRIPT, "voice": {"provider": "edge", "voice": "v"},
                 "voice_file": "voice.mp3", "voice_for": stamp, "storyboard_for": stamp, "words": words, "sources": [],
                 "storyboard": pv.build_scenes(SCRIPT, words, words[-1]["end"] + 0.5)})

    def test_changing_backgrounds_keeps_what_each_had(self):
        pr.edit_scene(self.id, 1, pr.SceneReq(type="graphic"))
        job = t.read(self.id)
        job["storyboard"][1]["bg"]["code"] = "wait(1)"
        t.write(job)
        pr.edit_scene(self.id, 1, pr.SceneReq(type="color", color="#112233"))
        back = pr.edit_scene(self.id, 1, pr.SceneReq(type="graphic"))
        self.assertEqual(back["storyboard"][1]["bg"]["code"], "wait(1)")
        everywhere = pr.edit_scene(self.id, 0, pr.SceneReq(type="slides", apply_all=True))
        self.assertTrue(all(s["bg"]["type"] == "slides" for s in everywhere["storyboard"]))
        self.assertIn("has no images yet", " ".join(everywhere["problems"]))
        self.assertNotIn("words", everywhere)

    def test_settings_are_checked(self):
        got = pr.settings(self.id, pr.SettingsReq(layout={"format": "short"}, motion={"mouth": 99, "blink": False},
                                                  extras={"wave": {"style": "evil", "color": "red; x"}, "subs": {"style": "box"}}))
        self.assertEqual((got["layout"]["format"], got["layout"]["position"], got["motion"]["mouth"], got["motion"]["blink"]),
                         ("short", "center", 1.6, False))
        self.assertEqual((got["extras"]["wave"]["style"], got["extras"]["wave"]["color"], got["extras"]["subs"]["style"]),
                         ("bars", "#f6c445", "box"))

    def test_graphics_prompt_keeps_scene_numbers(self):
        pr.edit_scene(self.id, 2, pr.SceneReq(type="graphic"))
        prompt = pr.graphics_prompt(self.id)["prompt"]
        tail = prompt.split("\nTHE SCENES:\n")[1]
        self.assertIn("SCENE 3 (about", tail)
        self.assertNotIn("SCENE 1 (about", tail)
        self.assertIn("Scene 3: keep the right third", prompt)
        with self.assertRaises(HTTPException):
            pr.graphics_save(self.id, pr.Code(text="# === SCENE 1 ===\nwait(1)"))  # scene 1 is not a graphics scene

    def test_stock_only_from_the_stock_sites(self):
        for url in ("http://videos.pexels.com/x.mp4", "https://evil.example.com/x.mp4", "https://pexels.com.evil.io/x.mp4",
                    "file:///c:/windows/x.mp4"):
            with self.assertRaises(RuntimeError, msg=url):
                pr.download_stock(url, Path(self.tmp.name))
        self.assertEqual(pr.search_words("Cinemas keep about half of every ticket"), "Cinemas ticket")

    def test_render_says_what_is_missing(self):
        with self.assertRaises(HTTPException) as wrong:
            pr.render(self.id)
        self.assertIn("Choose a presenter photo", wrong.exception.detail)
        for bad in ("../../x", "job.json"):
            with self.assertRaises(HTTPException):
                pr.job_file(self.id, "media", bad)


class SetupTest(unittest.TestCase):
    def test_nothing_goes_on_the_system_drive_when_there_is_another(self):
        self.assertIn(pm.library_folder().name, ("pylib",))
        status = pm.status()
        self.assertEqual(set(pm.FILES), {"face_landmarker.task", "rvm.onnx", "yunet.onnx"})
        self.assertTrue({"ready", "folder", "download"} <= set(status))


if __name__ == "__main__":
    unittest.main()
