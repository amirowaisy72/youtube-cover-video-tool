"""The shared downloader: plain-words errors, the browser sign-in retry, and step 1 without a download (no internet)."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException  # noqa: E402

import tools_animator as ta  # noqa: E402
import tools_talk as t  # noqa: E402
import ytdl  # noqa: E402

URL = "https://www.youtube.com/watch?v=abc123"
BOT = ("\x1b[0;31mERROR:\x1b[0m [youtube] abc123: Sign in to confirm you’re not a bot. Use --cookies-from-browser or "
       "--cookies for the authentication.")


class FakeError(Exception):
    pass


class MessageTest(unittest.TestCase):
    def test_no_colour_codes_or_labels(self):
        for raw in (BOT, "[0;31mERROR:[0m [youtube] abc123: Video unavailable"):
            text = ytdl.clean(raw)
            self.assertFalse("[0;31m" in text or "\x1b" in text or "ERROR" in text or "[youtube]" in text, text)

    def test_plain_words(self):
        for raw, word, retry in (("Private video. Sign in if you've been granted access", "private", False),
                                 ("Video unavailable", "not available", False),
                                 ("<urlopen error [Errno 11001] getaddrinfo failed>", "internet", True),
                                 ("HTTP Error 429: Too Many Requests", "too many requests", False),
                                 ("something strange\nsecond line", "something strange", True)):
            problem = ytdl.explain(FakeError(raw))
            self.assertIn(word, str(problem))
            self.assertEqual(problem.retry, retry, raw)
        self.assertNotIn("second line", str(ytdl.explain(FakeError("a\nsecond line"))))


class RetryTest(unittest.TestCase):
    def setUp(self):
        ytdl._good.clear()
        env = mock.patch.dict("os.environ", {}, clear=False)
        env.start()
        self.addCleanup(env.stop)
        import os
        os.environ.pop("YTG_NO_BROWSER_COOKIES", None)
        self.used: list = []

    def fake(self, works_with=None, error=BOT, reasons=None):
        def once(url, opts, call):
            browser = (opts.get("cookiesfrombrowser") or (None,))[0]
            self.used.append(browser)
            self.assertIn("node", opts["js_runtimes"])
            if browser is not None and browser == works_with:
                return {"title": "ok"}
            raise FakeError((reasons or {}).get(browser, error))
        return mock.patch.object(ytdl, "_once", once)

    def test_no_cookies_unless_youtube_asks(self):
        with mock.patch.object(ytdl, "_once", lambda u, o, c: self.assertNotIn("cookiesfrombrowser", o) or {"a": 1}):
            self.assertEqual(ytdl.run(URL), {"a": 1})
        with self.fake(error="Video unavailable"), self.assertRaises(ytdl.DownloadProblem):
            ytdl.run(URL)
        self.assertEqual(self.used, [None])

    def test_firefox_edge_chrome_in_order_then_the_working_one_first(self):
        notes: list = []
        with self.fake(works_with="chrome"):
            self.assertEqual(ytdl.run(URL, note=notes.append), {"title": "ok"})
        self.assertEqual(self.used, [None, "firefox", "edge", "chrome"])
        self.assertIn("Firefox", notes[0])
        self.used.clear()
        with self.fake(works_with="chrome"):
            ytdl.run(URL)
        self.assertEqual(self.used, [None, "chrome"])

    def test_it_says_what_to_do_for_each_browser(self):
        reasons = {"firefox": "could not find firefox cookies database in C:/x", "edge": "Could not copy Chrome cookie database",
                   "chrome": "Failed to decrypt with DPAPI"}
        with self.fake(reasons=reasons), self.assertRaises(ytdl.DownloadProblem) as caught:
            ytdl.run(URL)
        text = str(caught.exception)
        for part in ("not a robot", "Firefox: not installed", "Close Microsoft Edge", "Windows does not let", "upload", "spare"):
            self.assertIn(part, text)
        self.assertTrue(caught.exception.sign_in and not caught.exception.retry)

    def test_cookies_are_never_used_for_other_sites_or_when_switched_off(self):
        with self.fake(), self.assertRaises(ytdl.DownloadProblem):
            ytdl.run("https://youtube.com.evil.example/watch?v=1")
        self.assertEqual(self.used, [None])
        self.used.clear()
        with mock.patch.dict("os.environ", {"YTG_NO_BROWSER_COOKIES": "1"}), self.fake(), self.assertRaises(ytdl.DownloadProblem):
            ytdl.run(URL)
        self.assertEqual(self.used, [None])
        self.assertTrue(ytdl.is_youtube("https://youtu.be/x") and ytdl.is_youtube("https://m.youtube.com/watch?v=x"))


class BackupTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        for patch in (mock.patch.object(ta, "BASE_DIR", Path(self.tmp.name)),
                      mock.patch.object(t, "audio_dir", lambda: Path(self.tmp.name))):
            patch.start()
            self.addCleanup(patch.stop)
        self.addCleanup(self.tmp.cleanup)

    def test_pasted_transcript_with_and_without_times(self):
        youtube = "0:00\nhello everyone and welcome\n0:04\nto the show about money\n1:02:03 the end"
        pieces, text = t.read_pasted(youtube)
        self.assertEqual([p["start"] for p in pieces], [0, 4, 3723])
        self.assertNotIn("0:04", text)
        pieces, text = t.read_pasted("1\n00:00:01,000 --> 00:00:03,000\nFirst line.\n\n2\n00:00:03,500 --> 00:00:05,000\nSecond line.")
        self.assertEqual((len(pieces), "-->" in text), (2, False))
        pieces, text = t.read_pasted("Just text.\nIn 2020, prices rose.")
        self.assertEqual((pieces[0]["start"], text.count("\n\n")), (-1, 1))

    def test_paste_makes_a_job_and_keeps_the_link(self):
        job = t.from_text(t.PasteReq(text="These are the words of the video I found.", url=URL))
        self.assertEqual((job["status"], job["sources"][0]["url"]), ("idle", URL))
        again = t.from_text(t.PasteReq(text="Other words, no link this time at all.", job=job["id"]))
        self.assertEqual((again["id"], again["sources"]), (job["id"], []))
        with self.assertRaises(HTTPException):
            t.from_text(t.PasteReq(text="too short"))
        with self.assertRaises(HTTPException):
            t.from_text(t.PasteReq(text="some words are here", url="not a link"))

    def test_own_file_is_transcribed_and_removed(self):
        import io
        import time

        class Up:
            filename = "My Clip.mp4"
            file = io.BytesIO(b"0" * 5000)
        with mock.patch.object(t, "transcribe", lambda a, f, p: ([{"start": 0.0, "end": 2.0, "text": "From my file."}], "en")):
            job = t.from_file(Up(), job="", url="")
            for _ in range(200):
                if job["id"] not in t._running:
                    break
                time.sleep(0.05)
        done = t.read(job["id"])
        self.assertEqual((done["status"], done["transcript"], done["title"], done["sources"]), ("idle", "From my file.", "My Clip", []))
        self.assertEqual(list(t._dir(job["id"]).glob("upload*")), [])


if __name__ == "__main__":
    unittest.main()
