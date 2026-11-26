"""Talking Presenter, steps 1–3: script handling, voice parts, resume, stop and the routes (no internet)."""
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException  # noqa: E402

import autovideo2  # noqa: E402
import colab_link  # noqa: E402
import tools_animator as ta  # noqa: E402
import tools_source  # noqa: E402
import tools_talk as t  # noqa: E402
import video  # noqa: E402


def tone(path: Path, seconds: float = 0.6) -> None:
    ta._run_ffmpeg(["-f", "lavfi", "-i", f"sine=frequency=300:duration={seconds}", "-c:a", "libmp3lame", "-b:a", "160k", str(path)])


def wait_done(job_id: str, seconds: float = 60) -> dict:
    end = time.time() + seconds
    while job_id in t._running and time.time() < end:
        time.sleep(0.05)
    return t.public(t.read(job_id))


class TextTest(unittest.TestCase):
    def test_an_ai_answer_becomes_plain_narration(self):
        answer = "Sure! Here is the script:\n```\n## Hook\n**Narrator:** Prices rose [music] again.\n\n**Part two**\nIt cost *more*.\n```"
        self.assertEqual(t.clean_script(answer), "Prices rose again.\n\nIt cost more.")
        self.assertEqual(t.clean_script("Just my own words."), "Just my own words.")

    def test_copied_words_are_measured(self):
        source = "the movie made forty eight billion dollars in its very first week of release"
        self.assertEqual(t.copied_share(source, source), 100)
        self.assertEqual(t.copied_share("a completely different sentence about something else entirely today", source), 0)
        half = "the movie made forty eight billion dollars and I think that is wonderful news for everyone"
        self.assertTrue(25 < t.copied_share(half, source) < 75)

    def test_parts_are_small_and_lose_nothing(self):
        script = "\n\n".join(" ".join(f"Sentence number {i} is here." for i in range(40)) for _ in range(2)) + "\n\n" + "word " * 400
        parts = t.split_parts(script)
        self.assertTrue(all(0 < len(p) <= t.PART_CHARS for p in parts))
        self.assertEqual(" ".join(parts).split(), script.split())

    def test_paragraphs_and_links(self):
        segs = [{"start": 0, "end": 2, "text": "A" * 130}, {"start": 6, "end": 8, "text": "After a pause."}]
        self.assertEqual(t.paragraphs(segs).count("\n\n"), 1)
        for bad in ("", "youtube.com/x", "file:///c:/x", "https://nodot"):
            with self.assertRaises(HTTPException, msg=bad):
                t.check_url(bad)
        self.assertIn("MY OWN", t.rewrite_prompt({"transcript": "words " * 100, "language": "en"}))


class FlowTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        patches = [mock.patch.object(ta, "BASE_DIR", Path(self.tmp.name)),
                   mock.patch.object(t, "download_audio", self.fake_download),
                   mock.patch.object(t, "transcribe", lambda a, f, p: ([{"start": 0.0, "end": 3.0, "text": "Original words here."}], "en"))]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(self.tmp.cleanup)
        self.spoken: list[str] = []

    def fake_download(self, url, folder, flag, progress):
        f = folder / "source.m4a"
        f.write_bytes(b"x")
        return f, {"title": 'A "great" video', "channel": "Someone", "duration": 65.0, "page": url}

    def speak(self, index, text, voice, folder, provider, key, first_scene=False, last_scene=False):
        folder.mkdir(parents=True, exist_ok=True)
        out = folder / f"scene-{index:02d}.mp3"
        tone(out)
        self.spoken.append(text)
        engine = "edge-tts (studio presenter)"
        return out, engine, 0.6, False, ""

    def new_job(self):
        job = t.create(t.LinkReq(url="https://www.youtube.com/watch?v=abc123"))
        return wait_done(job["id"])

    def test_link_script_voice(self):
        job = self.new_job()
        self.assertEqual((job["status"], job["transcript"]), ("idle", "Original words here."))
        self.assertIn("Original video: A 'great' video (Someone)", job["sources"][0]["fact"])
        self.assertIn("watch?v=abc123", tools_source.description_with_sources("d", job["sources"]))
        long = "\n\n".join(f"Paragraph {i}. " + "More words follow here. " * 20 for i in range(3))
        job = t.save_script(job["id"], t.ScriptReq(text=long, mode="own"))
        self.assertEqual(job["copied"], 0)
        with mock.patch.object(autovideo2, "_voice_scene_with_fallback", self.speak):
            t.make_voice(job["id"], t.VoiceReq(voice="en-US-AriaNeural"))
            done = wait_done(job["id"])
            self.assertEqual((done["status"], done["voice_ready"], done["voice_warnings"]), ("idle", True, []))
            first_run = len(self.spoken)
            self.assertEqual(first_run, len(t.split_parts(done["script"])))
            self.assertAlmostEqual(video.get_duration(t._dir(job["id"]) / "voice.mp3"), done["voice_duration"], delta=0.2)
            self.assertGreater(done["voice_duration"], 0.6 * first_run)
            t.make_voice(job["id"], t.VoiceReq(voice="en-US-AriaNeural"))
            wait_done(job["id"])
            self.assertEqual(len(self.spoken), first_run)  # nothing spoken twice
        changed = t.save_script(job["id"], t.ScriptReq(text="A new short script now.", mode="edited"))
        self.assertTrue(changed["voice_outdated"])

    def test_a_lost_cloned_voice_is_said_out_loud_and_tried_again(self):
        job = self.new_job()
        t.save_script(job["id"], t.ScriptReq(text="Say these few words.", mode="own"))
        with mock.patch.object(autovideo2, "_voice_scene_with_fallback", self.speak):
            for _ in range(2):
                t.make_voice(job["id"], t.VoiceReq(voice="clone:abc123"))
                done = wait_done(job["id"])
                self.assertIn("NOT spoken in your chosen voice", done["voice_warnings"][0])
        self.assertEqual(len(self.spoken), 2)

    def test_stop_keeps_the_finished_parts(self):
        job = self.new_job()
        t.save_script(job["id"], t.ScriptReq(text="\n\n".join(f"Part number {i} of the talk." for i in range(4)), mode="own"))
        gate = threading.Event()

        def slow(index, *a, **k):
            if index == 1:
                t.stop(job["id"])
                gate.set()
            return self.speak(index, *a, **k)
        with mock.patch.object(autovideo2, "_voice_scene_with_fallback", slow):
            t.make_voice(job["id"], t.VoiceReq(voice="en-US-AriaNeural"))
            done = wait_done(job["id"])
            self.assertTrue(gate.is_set())
            self.assertEqual((done["status"], done["voice_ready"], len(self.spoken)), ("stopped", False, 2))
        with mock.patch.object(autovideo2, "_voice_scene_with_fallback", self.speak):
            t.make_voice(job["id"], t.VoiceReq(voice="en-US-AriaNeural"))
            self.assertTrue(wait_done(job["id"])["voice_ready"])
        self.assertEqual(len(self.spoken), 4)

    def test_stop_while_waiting_for_colab(self):
        colab_link._worked = True
        self.addCleanup(setattr, colab_link, "_worked", False)
        Path(self.tmp.name, "colab_voice.txt").write_text("https://a.trycloudflare.com abcdefgh1234\n")
        colab_link.set_stop_check(lambda: True)
        self.addCleanup(colab_link.set_stop_check, None)
        with self.assertRaises(colab_link.Stopped):
            colab_link.wait("gone")

    def test_failures_are_shown(self):
        with mock.patch.object(t, "download_audio", mock.Mock(side_effect=RuntimeError("Video unavailable"))):
            job = self.new_job()
        self.assertEqual(job["status"], "failed")
        self.assertIn("Video unavailable", job["error"])
        with self.assertRaises(HTTPException):
            t.make_voice(job["id"], t.VoiceReq(voice="en-US-AriaNeural"))
        t.delete(job["id"])
        with self.assertRaises(HTTPException):
            t.read(job["id"])
        with self.assertRaises(HTTPException):
            t.read("../../etc")


if __name__ == "__main__":
    unittest.main()
