"""Whole-video settings with per-scene overrides, and a recording as the voice (no internet, no model files)."""
import io
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException  # noqa: E402

import presenter_routes as pr  # noqa: E402
import presenter_video as pv  # noqa: E402
import tools_animator as ta  # noqa: E402
import tools_library  # noqa: E402
import tools_talk as t  # noqa: E402
import video  # noqa: E402

SCRIPT = ("Hello and welcome to the show.\n\nThe film cost two hundred million dollars to make.\n\n"
          "Then people went home and talked about the story for weeks afterwards.\n\n"
          "Some of them even wrote long letters about how it ended.\n\n"
          "The studio smiled and quietly began to plan the next part.\n\nThanks for watching, see you soon.")


def timed(script: str, per: float = 0.45) -> list[dict]:
    return [{"word": w, "start": i * per, "end": i * per + per * 0.9} for i, w in enumerate(script.split())]


class Up:
    def __init__(self, data: bytes, name: str):
        self.file, self.filename = io.BytesIO(data), name


def picture(color: str) -> Up:
    buf = io.BytesIO()
    Image.new("RGB", (320, 200), color).save(buf, "JPEG")
    return Up(buf.getvalue(), f"{color}.jpg")


def wait(job_id: str) -> dict:
    for _ in range(1200):
        if job_id not in t._running:
            break
        time.sleep(0.05)
    return t.public(t.read(job_id))


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "audio").mkdir()
        for p in (mock.patch.object(ta, "BASE_DIR", self.root), mock.patch.object(t, "audio_dir", lambda: self.root / "audio")):
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(self.tmp.cleanup)
        self.id = "abcdefabcdef"

    def make_job(self, **extra) -> dict:
        words = timed(SCRIPT)
        voice = {"provider": "edge", "voice": "v"}
        stamp = t.voice_stamp(SCRIPT, voice)
        job = {"id": self.id, "title": "T", "status": "idle", "script": SCRIPT, "transcript": SCRIPT, "voice": voice,
               "voice_file": "voice.mp3", "voice_for": stamp, "storyboard_for": stamp, "words": words, "sources": [],
               "storyboard": pv.build_scenes(SCRIPT, words, words[-1]["end"] + 0.4, target=3.0), **extra}
        t.write(job)
        return job


class WholeVideoTest(Base):
    def test_use_for_all_scenes_copies_image_presenter_and_position(self):
        self.make_job()
        pr.edit_scene(self.id, 0, pr.SceneReq(type="image"))
        pr.scene_files(self.id, 0, [picture("red")])
        pr.edit_scene(self.id, 0, pr.SceneReq(presenter=False, position="bottom-left"))
        got = pr.edit_scene(self.id, 0, pr.SceneReq(apply_all=True))
        first = got["storyboard"][0]["bg"]["files"]
        for s in got["storyboard"]:
            self.assertEqual((s["bg"]["type"], s["bg"]["files"], s["presenter"], s["position"]), ("image", first, False, "bottom-left"))
        self.assertFalse(any("no image" in p for p in got["problems"]))
        self.assertEqual(got["video_bg"]["type"], "image")

    def test_one_image_for_the_whole_video_and_single_scene_changes_stay(self):
        self.make_job()
        pr.edit_scene(self.id, 1, pr.SceneReq(type="color", color="#aa0000"))
        pr.video_background(self.id, pr.VideoBg(type="image"))
        got = pr.video_background_files(self.id, [picture("blue"), picture("red")])
        scenes = got["storyboard"]
        self.assertEqual(len(got["video_bg"]["files"]), 1)
        self.assertEqual(scenes[1]["bg"]["color"], "#aa0000")
        self.assertTrue(all(s["bg"]["files"] == got["video_bg"]["files"] for i, s in enumerate(scenes) if i != 1))
        back = pr.reset(self.id, pr.Reset(part="bg", scene=1))
        self.assertEqual(back["storyboard"][1]["bg"]["files"], got["video_bg"]["files"])
        pr.edit_scene(self.id, 2, pr.SceneReq(type="color"))
        everything = pr.video_background(self.id, pr.VideoBg(include_own=True))
        self.assertEqual({s["bg"]["type"] for s in everything["storyboard"]}, {"image"})

    def test_many_images_are_spread_in_order_over_the_narration(self):
        job = self.make_job()
        pr.video_background(self.id, pr.VideoBg(type="slides"))
        got = pr.video_background_files(self.id, [picture(c) for c in ("red", "green", "blue", "yellow", "purple", "white", "black")])
        numbers = [p["number"] for s in got["storyboard"] for p in s["bg"]["parts"]]
        self.assertEqual(sorted(set(numbers)), list(range(7)))     # every image is used
        self.assertEqual(numbers, sorted(numbers))                 # in the order given
        for s in got["storyboard"]:
            self.assertAlmostEqual(sum(p["seconds"] for p in s["bg"]["parts"]), s["end"] - s["start"], delta=0.9)
        frames = list(pv.timed_slides(t._dir(self.id) / "media", got["storyboard"][0]["bg"]["parts"], (160, 90), 30))
        self.assertEqual((len(frames), frames[0].shape), (30, (90, 160, 3)))
        one = pv.spread_slides(["a.jpg"], job["storyboard"])
        self.assertTrue(all(len(p) == 1 and p[0]["file"] == "a.jpg" for p in one))
        self.assertAlmostEqual(one[-1][0]["to"], 1.0, delta=0.01)

    def test_mix_chooses_graphics_for_numbers_and_comparisons(self):
        for text in ("It cost two hundred million.", "Sales rose 7%.", "This one is bigger than that.", "$5 each"):
            self.assertEqual(pr.mix_choice(text), "graphic", text)
        for text in ("People went home happy.", "One day the studio changed its mind."):
            self.assertEqual(pr.mix_choice(text), "stock", text)
        self.make_job()
        got = pr.video_background(self.id, pr.VideoBg(type="mix"))
        kinds = [s["bg"]["type"] for s in got["storyboard"]]
        self.assertTrue("graphic" in kinds and "stock" in kinds)
        prompt = pr.graphics_prompt(self.id)["prompt"]
        for i, kind in enumerate(kinds):
            self.assertEqual(f"# === SCENE {i + 1} ===" in prompt.split("Write code only")[1], kind == "graphic")

    def test_layout_and_extras_apply_to_all_with_overrides(self):
        job = self.make_job()
        pr.settings(self.id, pr.SettingsReq(layout={"position": "center", "effect": "border"}, extras={"wave": {"style": "dots"}}))
        pr.edit_scene(self.id, 1, pr.SceneReq(effect="none", position="hidden", wave="off", subs_position="top"))
        full = {**t.read(self.id), **pr._settings(t.read(self.id))}
        layout, extras = pv.settings_for(full, full["storyboard"][0])
        self.assertEqual((layout["effect"], extras["wave"]["on"], extras["wave"]["style"]), ("border", True, "dots"))
        layout, extras = pv.settings_for(full, full["storyboard"][1])
        self.assertEqual((layout["effect"], extras["wave"]["on"], extras["wave"]["style"], extras["subs"]["position"]),
                         ("none", False, "dots", "top"))
        pr.edit_scene(self.id, 1, pr.SceneReq(wave=""))
        self.assertTrue(pv.settings_for({**t.read(self.id), **pr._settings(t.read(self.id))}, t.read(self.id)["storyboard"][1])[1]["wave"]["on"])
        back = pr.reset(self.id, pr.Reset(part="extras"))
        self.assertFalse(any(s.get("extras") for s in back["storyboard"]))
        back = pr.reset(self.id, pr.Reset(part="layout"))
        self.assertTrue(all(s["presenter"] and not s["position"] and not s["effect"] for s in back["storyboard"]))
        self.assertEqual(len(job["storyboard"]), len(back["storyboard"]))

    def test_preview_the_whole_video(self):
        job = self.make_job()
        for i in range(len(job["storyboard"])):
            pr.edit_scene(self.id, i, pr.SceneReq(presenter=False))
        total = job["storyboard"][-1]["end"]
        ta._run_ffmpeg(["-f", "lavfi", "-i", f"sine=frequency=300:duration={total}", str(t._dir(self.id) / "voice.mp3")])
        pr.preview_all(self.id)
        done = wait(self.id)
        self.assertEqual(done["status"], "idle", done.get("error"))
        file = t._dir(self.id) / "preview" / done["whole_preview"]
        self.assertAlmostEqual(video.get_duration(file), total, delta=0.3)
        changed = pr.edit_scene(self.id, 0, pr.SceneReq(color="#123456"))
        self.assertEqual(changed["whole_preview"], "")  # out of date once something changes


class RecordingTest(Base):
    def tone(self, path: Path, seconds: float = 3.0) -> Path:
        ta._run_ffmpeg(["-f", "lavfi", "-i", f"sine=frequency=250:duration={seconds}", str(path)])
        return path

    def test_original_audio_is_kept_and_becomes_the_voice(self):
        def download(url, folder, flag, progress, note=None):
            return self.tone(folder / "source.m4a"), {"title": "V", "channel": "", "duration": 3.0, "page": url}
        with mock.patch.object(t, "download_audio", download), \
                mock.patch.object(t, "transcribe", lambda a, f, p: ([{"start": 0.0, "end": 3.0, "text": "The words of my video."}], "en")):
            job = t.create(t.LinkReq(url="https://www.youtube.com/watch?v=abc"))
            job = wait(job["id"])
        self.assertTrue(job["has_original"] and (self.root / "audio" / f"{job['id']}.mp3").exists())
        self.assertEqual(list(t._dir(job["id"]).glob("source*")), [])
        t.voice_original(job["id"])
        done = wait(job["id"])
        self.assertEqual((done["status"], done["voice_ready"], done["script"], done["voice"]["provider"]),
                         ("idle", True, "The words of my video.", "original"))
        self.assertAlmostEqual(done["voice_duration"], 3.0, delta=0.2)
        before = t.board_stamp(t.read(job["id"]))
        fixed = t.save_script(job["id"], t.ScriptReq(text="The words of my own video.", mode="edited"))
        self.assertTrue(fixed["voice_ready"])                       # the recording is still the voice
        self.assertNotEqual(t.board_stamp(t.read(job["id"])), before)  # the storyboard is made again for new words
        tools_library.BASE_DIR, old = self.root, tools_library.BASE_DIR
        self.addCleanup(setattr, tools_library, "BASE_DIR", old)
        tools_library.delete("presenter", job["id"])
        self.assertFalse((self.root / "audio" / f"{job['id']}.mp3").exists())

    def test_no_saved_audio_is_explained(self):
        self.make_job()
        with self.assertRaises(HTTPException) as wrong:
            t.voice_original(self.id)
        self.assertIn("not saved", wrong.exception.detail)

    def test_my_own_recording_keeps_my_spelling_only_when_it_matches(self):
        self.make_job()
        data = self.tone(self.root / "own.wav").read_bytes()
        said = [{"start": 0.0, "end": 3.0, "text": SCRIPT.replace("\n\n", " ").replace("hundred", "hundredd")}]
        with mock.patch.object(t, "transcribe", lambda a, f, p: (said, "en")):
            t.voice_file(self.id, Up(data, "me.wav"))
            done = wait(self.id)
        self.assertEqual((done["voice"]["provider"], done["script"]), ("upload", SCRIPT))
        with mock.patch.object(t, "transcribe", lambda a, f, p: ([{"start": 0, "end": 3, "text": "Something else entirely."}], "en")):
            t.voice_file(self.id, Up(data, "other.wav"))
            done = wait(self.id)
        self.assertEqual(done["script"], "Something else entirely.")
        self.assertEqual(list(t._dir(self.id).glob("voice-upload*")), [])


if __name__ == "__main__":
    unittest.main()
