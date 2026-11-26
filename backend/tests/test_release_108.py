"""1.0.8: credits for every tool, the copied prompts' research rules, and the resumable download of the
installed app (no internet; the licence server is never contacted)."""
import hashlib
import http.server
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import credit_gate  # noqa: E402
import licensing  # noqa: E402
import parts  # noqa: E402
import parts_download  # noqa: E402
import tools_script as ts  # noqa: E402
import tools_source as src  # noqa: E402

SCENES = [{"narration": "A loaf of bread cost 2 dollars in 2015."}, {"narration": "Now it costs 4."}]
LIST = ('# === SOURCES ===\nBread doubled | https://example.org/bread | "The price of a loaf doubled in ten years."\n'
        '- Wages | https://example.org/pay | "Pay rose by twenty percent over the same time."')
CODE = '# === SCENE 1 ===\n# VISUAL IDEA: a = b\nm = text("$2")\nenter(m)\n# === SCENE 2 ===\nm = text("$4")\nenter(m)'


class PromptTest(unittest.TestCase):
    def test_every_copied_prompt_asks_for_research_even_without_sources(self):
        import tools_avscript
        import tools_hooks
        import tools_talk
        job = {"title": "T", "scenes": [dict(s) for s in SCENES], "sources": [], "transcript": "words " * 50}
        for prompt in (ts.build_prompt("T", SCENES, []), tools_avscript.build_prompt("T", SCENES),
                       tools_talk.rewrite_prompt(job)):
            self.assertTrue(prompt.startswith("Turn on web search before answering."), prompt[:80])
            for words in ("Use web search to find 3–6 real, reliable pages (news, official reports, company pages) that "
                          "support the facts and numbers in this script. Never make up a link or a quote.",
                          "# === SOURCES ===", 'fact | https://url | "exact sentence copied word for word from the page"'):
                self.assertIn(words, prompt)
            self.assertNotIn("do not use source()", prompt)

    def test_the_pasted_answer_is_split(self):
        for answer in (LIST + "\n\n```python\n" + CODE + "\n```",
                       "```\n" + LIST + "\n```\nHere is the code:\n```python\n" + CODE + "\n```",
                       "```python\n" + CODE + "\n\n" + LIST + "\n```",
                       LIST + "\n" + CODE):
            code, found = src.split_answer(answer)
            self.assertEqual([s["url"] for s in found], ["https://example.org/bread", "https://example.org/pay"], answer)
            self.assertEqual(found[0]["quote"], "The price of a loaf doubled in ten years.")
            got = ts.parse(code)
            self.assertEqual(sorted(got), [1, 2], code)
            self.assertFalse(any("example.org" in c or "SOURCES" in c for c in got.values()), got)
        script = LIST + "\n# === SCRIPT ===\nBread got dear. It | really did.\n\nThe end of it."
        text, found = src.split_answer(script)
        self.assertIn("Bread got dear.", text)
        self.assertEqual(len(found), 2)
        self.assertEqual(src.split_answer(CODE), (CODE, []))

    def test_new_sources_join_once(self):
        job = {"sources": [{"url": "https://example.org/bread", "quote": "The price of a loaf doubled in ten years.", "fact": ""}]}
        self.assertEqual(src.merge_found(job, src.split_answer(LIST)[1]), 1)
        self.assertEqual(src.merge_found(job, src.split_answer(LIST)[1]), 0)

    def test_check_names_the_failed_source_and_its_scene(self):
        found = src.split_answer(LIST)[1]
        answers = [{"ok": True}, {"ok": False, "reason": "the quote was not found on the page"}]
        with mock.patch.object(src, "capture_many", lambda pairs: answers):
            out = src.check_list(found, {"https://example.org/pay": [2]})
        self.assertEqual([r["ok"] for r in out], [True, False])
        self.assertEqual((out[1]["reason"], out[1]["scenes"]), ("the quote was not found on the page", [2]))


class ScriptPromptTest(unittest.TestCase):
    CODED = [{**SCENES[0], "code": '# VISUAL IDEA: x\nm = thing("coin")\nenter(m)'}, dict(SCENES[1])]

    def test_the_plan_table_is_step_3_right_after_step_2(self):
        prompt = ts.build_prompt("T", SCENES)
        order = [prompt.index(w) for w in ("STEP 2 — MAKE IT READABLE", "STEP 3 — PLAN THE WHOLE VIDEO", "THE STAGE (16:9)")]
        self.assertEqual(order, sorted(order))
        self.assertEqual(prompt.count("VARIETY rules"), 1)
        self.assertNotIn("VARIETY (the test warns about this)", prompt)

    def test_used_things_only_in_the_fix_prompt_of_one_scene(self):
        whole = ts.build_prompt("T", self.CODED)
        self.assertNotIn("ALREADY USED", whole.upper())
        self.assertIn("THINGS ALREADY USED", ts.fix_prompt("T", self.CODED, 1, "boom", []))
        self.assertNotIn("THINGS ALREADY USED", ts.fix_prompt("T", self.CODED, 0, "boom", []))  # itself excluded

    def test_hooks_and_single_scene_prompts_use_saved_sources_and_ask_for_code_only(self):
        import tools_hooks
        import tools_review
        saved = src.split_answer(LIST)[1]
        for sources in ([], saved):
            job = {"title": "T", "scenes": [dict(s) for s in self.CODED], "sources": sources}
            prompts = [tools_hooks.build_prompt(job, "visuals"), tools_hooks.build_prompt(job, "words"),
                       ts.fix_prompt("T", self.CODED, 0, "boom", [], sources),
                       tools_review.review_prompt("T", self.CODED, 0, sources)]
            for prompt in prompts:
                for banned in ("RESEARCH THE SOURCES YOURSELF", "Turn on web search", "ANSWER IN TWO PARTS", "part 1 of your answer"):
                    self.assertNotIn(banned, prompt)
                self.assertIn("https://example.org/bread" if sources else "SOURCES saved with this video: none", prompt)
            for prompt in prompts[:3]:
                self.assertIn("ANSWER WITH THE CODE BLOCK ONLY", prompt)
        self.assertIn("part 1 of your answer", ts.build_prompt("T", self.CODED))

    def test_a_plan_table_never_becomes_a_source(self):
        table = "scene | main thing | setting\n| 1 | coin | shop |\n2 | pie | office"
        for answer in (table + "\n" + LIST + "\n" + CODE, LIST + "\n\n" + table + "\n\n" + CODE):
            code, found = src.split_answer(answer)
            self.assertEqual([s["fact"] for s in found], ["Bread doubled", "Wages"])
            self.assertEqual(sorted(ts.parse(code)), [1, 2])


class Charging(unittest.TestCase):
    def charging(self, on: bool, costs: dict):
        def fetch():
            licensing._CHARGING_CACHE["costs"] = costs
            return on
        licensing._reset_charging_cache()
        self.addCleanup(licensing._reset_charging_cache)
        self.calls: list = []

        def http(method, path, payload=None, timeout=60):
            self.calls.append((path, payload))
            return {"job_token": "token-1"}
        for patch in (mock.patch.object(licensing, "_fetch_charging_from_server", fetch),
                      mock.patch.object(licensing, "_http", http),
                      mock.patch.object(licensing, "report_usage", lambda *a, **k: None),
                      mock.patch.object(licensing, "load_key", lambda: self.key)):
            patch.start()
            self.addCleanup(patch.stop)
        self.key = "YTG-TEST"

    def app(self) -> TestClient:
        app = FastAPI()

        @app.post("/api/seo")
        def seo(fail: bool = False):
            if fail:
                raise HTTPException(400, "bad")
            return {"score": 1}

        @app.post("/api/downloader")
        def start():
            return {"job_id": "abc"}

        @app.get("/api/downloader/{job_id}")
        def state(job_id: str):
            return {"status": self.state}

        def error_of(exc):
            return HTTPException(402, str(exc))
        app.add_middleware(credit_gate.CreditGate, error_of=error_of)
        return TestClient(app)

    def paths(self):
        return [p for p, _ in self.calls]

    def test_off_means_free(self):
        self.charging(False, {"seo": 5})
        self.assertEqual(self.app().post("/api/seo").status_code, 200)
        self.assertEqual(licensing.consume("presenter", "j", "1"), licensing.FREE_MODE_TOKEN)
        self.assertEqual(self.calls, [])

    def test_no_price_means_free_for_new_tools_only(self):
        self.charging(True, {"seo": 0})
        self.assertEqual(self.app().post("/api/seo").status_code, 200)
        self.assertEqual(licensing.consume("presenter", "j", "1"), licensing.FREE_MODE_TOKEN)  # an older server
        self.assertEqual(self.calls, [])
        self.assertEqual(licensing.consume("autovideo", "j", "1"), "token-1")  # unchanged

    def test_priced_tool_needs_a_key_then_reports_or_refunds(self):
        self.charging(True, {"seo": 1, "downloader": 2, "presenter": 1})
        client = self.app()
        self.key = None
        refused = client.post("/api/seo")
        self.assertEqual(refused.status_code, 402)
        self.assertIn("No license key", refused.json()["detail"])
        self.key = "YTG-TEST"
        self.assertEqual(client.post("/api/seo").status_code, 200)
        self.assertEqual(self.paths(), ["/v1/consume", "/v1/report"])
        self.calls.clear()
        self.assertEqual(client.post("/api/seo?fail=true").status_code, 400)
        self.assertEqual(self.paths(), ["/v1/consume", "/v1/refund"])
        for state, end in (("done", "/v1/report"), ("failed", "/v1/refund")):
            self.calls.clear()
            self.state = "downloading"
            client.post("/api/downloader")
            client.get("/api/downloader/abc")
            self.assertEqual(self.paths(), ["/v1/consume"])
            self.state = state
            client.get("/api/downloader/abc")
            client.get("/api/downloader/abc")
            self.assertEqual(self.paths(), ["/v1/consume", end])


class PartsTest(unittest.TestCase):
    def test_source_runs_need_nothing(self):
        with mock.patch.object(parts, "installed_info", lambda: None):
            parts.require("graphics", "voice")

    def test_installed_app_asks_before_anything(self):
        with tempfile.TemporaryDirectory() as tmp, \
                mock.patch.object(parts, "installed_info", lambda: {"data": tmp}), \
                mock.patch.object(parts, "lock", lambda: {"parts": {"graphics": {"wheels": [
                    {"name": "m.whl", "url": "http://x/m.whl", "size": 80_000_000}]}}}):
            with self.assertRaises(parts.PartNeeded) as need:
                parts.require("graphics")
            self.assertIn("80 MB", str(need.exception))
            self.assertEqual(list(Path(tmp).iterdir()), [])  # nothing was downloaded


class Flaky(http.server.BaseHTTPRequestHandler):
    data = bytes(range(256)) * 4000
    asked: list = []

    def do_GET(self):  # noqa: N802
        start = int((self.headers.get("Range") or "bytes=0-").split("=")[1].rstrip("-"))
        Flaky.asked.append(start)
        body = self.data[start:]
        self.send_response(206 if start else 200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body[:400_000])  # the connection "drops" after 400 000 bytes
        self.close_connection = True

    def log_message(self, *args):
        pass


class DownloadTest(unittest.TestCase):
    def test_resumes_after_drops_and_checks_the_file(self):
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Flaky)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.shutdown)
        url = f"http://127.0.0.1:{server.server_port}/f.bin"
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(threading.Event, "wait", lambda *a: False):
            target = Path(tmp) / "f.bin"
            seen: list = []
            parts_download.fetch(url, target, len(Flaky.data), hashlib.sha256(Flaky.data).hexdigest(), seen.append)
            self.assertEqual(target.read_bytes(), Flaky.data)
            self.assertEqual(Flaky.asked[:3], [0, 400_000, 800_000])
            self.assertEqual(seen[-1], len(Flaky.data))
            with self.assertRaises(parts_download.DownloadError) as bad:
                parts_download.fetch(url, Path(tmp) / "g.bin", len(Flaky.data), "0" * 64)
            self.assertIn("damaged", str(bad.exception))


if __name__ == "__main__":
    unittest.main()
