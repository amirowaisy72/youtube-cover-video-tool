"""The Google Colab connection: the pasted line, plain-words errors, pause and continue, and the notebook."""
import io
import json
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(BACKEND.parent / "scripts"))

import colab_link as cl  # noqa: E402
import make_colab_notebook  # noqa: E402
import tools_animator as ta  # noqa: E402

URL = "https://calm-blue-river.trycloudflare.com"
CODE = "3f9c1a7b2e44d0a1"
GOOD = {"ok": True, "gpu": True, "gpu_name": "Tesla T4", "version": 2, "error": ""}
BAD = {"ok": False, "gpu": False, "gpu_name": "", "version": 0, "error": "Colab stopped"}


def http(code):
    return urllib.error.HTTPError(URL, code, "x", {}, io.BytesIO(b""))


class LineTest(unittest.TestCase):
    def test_the_line_is_found_in_what_was_pasted(self):
        for text in (f"{URL} {CODE}", f"  COPY THIS: {URL}   {CODE} \n", f"{URL}/ {CODE}."):
            self.assertEqual(cl.parse_line(text), (URL, CODE, ""), text)

    def test_wrong_pastes_get_plain_reasons(self):
        for text, word in ((URL, "code after the link is missing"), ("hello", "no https://"),
                           ("https://colab.research.google.com/drive/abc xxxxxxxxxx", "notebook page"),
                           (CODE, "no https://")):
            url, code, wrong = cl.parse_line(text)
            self.assertEqual((url, code), ("", ""), text)
            self.assertIn(word, wrong)

    def test_errors_say_what_to_do(self):
        self.assertIn("Wrong code", cl.explain(http(403)))
        for exc in (http(530), http(502), OSError("[Errno 11001] getaddrinfo failed"), ConnectionRefusedError("refused")):
            self.assertIn("Run all", cl.explain(exc))
        self.assertIn("in time", cl.explain(TimeoutError("timed out")))
        self.assertIn("error", cl.explain(http(500)))


class ConnectionTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.patch = mock.patch.object(ta, "BASE_DIR", Path(self.tmp.name))
        self.patch.start()
        cl._worked = False
        cl._last.update(at=0.0, line="", result=None, busy=False)
        cl._pause.update(waiting=0, since=0.0, reason="")
        ta._COLAB_STATE.update(dead_until=0.0, sent=set())

    def tearDown(self):
        cl._worked = False
        self.patch.stop()
        self.tmp.cleanup()

    def connect(self, result=GOOD, code=CODE):
        with mock.patch.object(cl, "health", return_value=result):
            return cl.connect(cl.Line(line=f"{URL} {code}"))

    def test_the_three_lights(self):
        self.assertEqual(cl.status_now()["state"], "not_connected")
        st = self.connect()
        self.assertEqual((st["state"], st["gpu_name"], st["old_notebook"]), ("connected", "Tesla T4", False))
        self.assertEqual(self.connect(BAD)["state"], "disconnected")
        self.assertEqual(cl.disconnect()["state"], "not_connected")

    def test_a_link_that_never_worked_does_not_pause(self):
        self.connect(BAD)
        self.assertFalse(cl.should_pause())
        self.assertIsNone(cl.after_failure("gone"))

    def test_losing_colab_pauses_until_a_new_line_works(self):
        self.connect()
        got = []
        new_code = "newcode123456"
        with mock.patch.object(cl, "health", side_effect=lambda url, code, timeout=25: GOOD if code == new_code else BAD):
            worker = threading.Thread(target=lambda: got.append(cl.after_failure("Colab stopped")))
            worker.start()
            for _ in range(100):
                if cl.status_now()["paused"]:
                    break
                time.sleep(0.05)
            self.assertIn("Colab stopped", cl.status_now()["paused"]["reason"])
            self.assertEqual(got, [])  # still waiting
            cl.connect(cl.Line(line=f"{URL} {new_code}"))
            worker.join(15)
        self.assertEqual(got, [(URL, new_code)])
        self.assertIsNone(cl.status_now()["paused"])

    def test_continue_on_this_computer(self):
        self.connect()
        got = []
        with mock.patch.object(cl, "health", return_value=BAD):
            worker = threading.Thread(target=lambda: got.append(cl.after_failure("gone")))
            worker.start()
            time.sleep(0.3)
            cl.continue_here()
            worker.join(15)
        self.assertEqual(got, [None])
        self.assertFalse(cl.should_pause())

    def test_pausing_can_be_switched_off(self):
        self.connect()
        cl.settings(cl.Settings(pause=False))
        self.assertIsNone(cl.after_failure("gone"))
        self.assertFalse(cl.status_now()["pause_wanted"])

    def test_estimate_learns_from_earlier_voices(self):
        self.assertFalse(cl.estimate(1000)["measured"])
        Path(self.tmp.name, "colab_voice.log").write_text(
            "10:00:00 ok 20.0s (gpu 15.0s, 1 take(s), link 5.0s) 100 chars\n", encoding="utf-8")
        got = cl.estimate(1000)
        self.assertEqual((got["colab_secs"], got["measured"]), (200, True))
        self.assertGreater(got["cpu_secs"], got["colab_secs"])


class NotebookTest(unittest.TestCase):
    def test_the_notebook_matches_the_server_file(self):
        saved = json.loads(cl.NOTEBOOK.read_text(encoding="utf-8"))
        built = make_colab_notebook.build()
        self.assertEqual(["".join(c["source"]) for c in saved["cells"]], ["".join(c["source"]) for c in built["cells"]])

    def test_every_python_cell_is_valid(self):
        for c in make_colab_notebook.build()["cells"]:
            if c["cell_type"] != "code":
                continue
            text = "".join(c["source"])
            if text.startswith("%%writefile"):
                text = text.split("\n", 1)[1]
            compile("\n".join("pass" if ln.startswith("!") else ln for ln in text.split("\n")), "cell", "exec")


if __name__ == "__main__":
    unittest.main()
