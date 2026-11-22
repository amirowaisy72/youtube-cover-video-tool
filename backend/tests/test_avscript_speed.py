"""Mocked speed-fix tests for the Auto Video footage path (user, 2026-11-22).

(a) run_apply runs scenes concurrently (3 workers);
(b) save() skips scenes whose plan is unchanged and footage is already saved;
(c) a stalled footage download fails fast via total_timeout=60.

No real network is used anywhere. Run:
    ~/workspace/ytguru-test-venv/bin/python -m pytest backend/tests/test_avscript_speed.py
"""

import copy
import inspect
import sys
import tempfile
import threading
import time
import types
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import autovideo  # noqa: E402
import autovideo2  # noqa: E402
import autovideo_smart  # noqa: E402
import tools_avscript  # noqa: E402


class FakeApp:
    """Stand-in for the autovideo app: in-memory job, deepcopy on read/write like disk."""

    def __init__(self, job, work_dir):
        self._job = copy.deepcopy(job)
        self._work_dir = Path(work_dir)

    def _av_read(self, job_id):
        return copy.deepcopy(self._job)

    def _av_write(self, job):
        self._job = copy.deepcopy(job)

    def _av_job_dir(self, job_id):
        return self._work_dir


class ParallelTest(unittest.TestCase):
    def test_scenes_run_concurrently_and_one_failure_stops_nothing(self):
        work_dir = Path(tempfile.mkdtemp())
        job = {"title": "Test video", "video_type": "long",
               "scenes": [{"narration": f"scene {i} words here"} for i in range(6)]}
        app = FakeApp(job, work_dir)
        mod = types.ModuleType("tools_visual")
        mod._av = lambda: app

        state = {"active": 0, "max_active": 0}
        seen = {"used": set(), "locks": set()}
        state_lock = threading.Lock()
        writes = []
        writes_lock = threading.Lock()

        def fake_apply(job, i, work_dir, keys, used, lock):
            with state_lock:
                state["active"] += 1
                state["max_active"] = max(state["max_active"], state["active"])
            seen["used"].add(id(used))
            seen["locks"].add(id(lock))
            try:
                time.sleep(0.3)
                if i == 2:
                    raise RuntimeError("boom")
                return {"visual_file": f"scene-{i:02d}.mp4", "kind": "clip", "av_error": ""}
            finally:
                with state_lock:
                    state["active"] -= 1

        def fake_write(job_id, i, fields):
            with writes_lock:
                writes.append((i, dict(fields)))
                sc = app._job["scenes"][i]
                for k, v in fields.items():
                    if v is None:
                        sc.pop(k, None)
                    else:
                        sc[k] = v

        st = {}
        t0 = time.monotonic()
        with mock.patch.dict(sys.modules, {"tools_visual": mod}), \
                mock.patch.object(tools_avscript, "apply_scene", fake_apply), \
                mock.patch.object(tools_avscript, "_write_scene", fake_write):
            tools_avscript.run_apply("j1", list(range(6)), {}, st)
        elapsed = time.monotonic() - t0
        # 6 x 0.3s = 1.8s sequential; 3 workers should take ~0.6s.
        self.assertLess(elapsed, 1.5, f"6 scenes took {elapsed:.2f}s — not parallel")
        self.assertGreaterEqual(state["max_active"], 2, "scenes never overlapped")
        self.assertEqual(st["done"], 6)
        self.assertEqual(len(seen["used"]), 1, "workers must share one `used` set")
        self.assertEqual(len(seen["locks"]), 1, "workers must share one lock")
        by_index = {i: f for i, f in writes}
        self.assertEqual(by_index[2].get("av_error"), "boom")
        for i in (0, 1, 3, 4, 5):
            self.assertEqual(by_index[i].get("visual_file"), f"scene-{i:02d}.mp4")


class ResumeTest(unittest.TestCase):
    def test_resave_skips_unchanged_scenes_with_footage(self):
        work_dir = Path(tempfile.mkdtemp())
        b0 = "main: vintage sailing ship ocean waves\n"
        b1_old = "main: old query words here\n"
        b1_new = "main: typing laptop screen desk\n"
        b2 = "main: person looking out window\n"
        b3 = "main: wooden desk coffee mug\n"
        job = {"title": "Test video", "video_type": "long", "scenes": [
            {"narration": "first scene words here", "visual_file": "scene-00.mp4", "av_script": b0},
            {"narration": "second scene words here", "visual_file": "scene-01.mp4", "av_script": b1_old},
            {"narration": "third scene words here", "visual_file": "", "av_script": ""},
            {"narration": "fourth scene words here", "visual_file": "scene-03-wait.png", "av_script": b3},
        ]}
        app = FakeApp(job, work_dir)
        code = ("# === SCENE 1 ===\n" + b0 + "# === SCENE 2 ===\n" + b1_new
                + "# === SCENE 3 ===\n" + b2 + "# === SCENE 4 ===\n" + b3)
        called = {}

        def recorder(job_id, indexes, keys, st=None):
            called["indexes"] = list(indexes)

        class SyncThread:
            def __init__(self, target=None, daemon=None, **kw):
                self._target = target

            def start(self):
                self._target()

        with mock.patch.object(tools_avscript, "_job", return_value=(app, app._av_read("j1"))), \
                mock.patch.object(tools_avscript, "run_apply", recorder), \
                mock.patch.object(threading, "Thread", SyncThread):
            out = tools_avscript.save(tools_avscript.SaveReq(job_id="j1", code=code))

        # 0: same plan + footage -> skipped; 1: plan changed -> re-applied;
        # 2: no footage -> applied; 3: only a "-wait.png" placeholder -> applied.
        self.assertEqual(called.get("indexes"), [1, 2, 3])
        self.assertEqual(out["applying"], 3)
        final = app._job
        self.assertEqual(final["scenes"][0]["av_script"], b0)
        self.assertEqual(final["scenes"][0]["visual_file"], "scene-00.mp4")
        self.assertEqual(final["scenes"][1]["av_script"], b1_new)
        self.assertEqual(final["scenes"][2]["av_script"], b2)
        self.assertEqual(final["scenes"][3]["av_script"], b3)


class StallTimeoutTest(unittest.TestCase):
    def test_trickling_download_fails_fast(self):
        tmp = Path(tempfile.mkdtemp())
        dest = tmp / "clip.mp4"

        class TrickleResp:
            """A server that sends data forever and never finishes."""

            def __init__(self):
                self.reads = 0

            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

            def read(self, n=-1):
                self.reads += 1
                return b"x" * 8192

        resp = TrickleResp()
        clock = {"t": 1000.0}

        def fake_time():
            clock["t"] += 30.0
            return clock["t"]

        real_time = time.time
        with mock.patch("urllib.request.urlopen", return_value=resp), \
                mock.patch("time.time", fake_time):
            t0 = real_time()
            ok = autovideo._download("http://example.invalid/clip.mp4", dest, total_timeout=60)
            wall = real_time() - t0
        self.assertFalse(ok, "a download that never finishes must fail once the cap trips")
        self.assertLess(wall, 5.0, f"fail-fast took {wall:.2f}s of real time")
        self.assertGreaterEqual(resp.reads, 1, "it was still receiving data when the cap tripped")
        self.assertGreater(dest.stat().st_size, 0, "partial data was written before the cap tripped")

    def test_scene_visual_passes_timeout_to_downloads(self):
        tmp = Path(tempfile.mkdtemp())
        calls = []

        def recorder(url, dest, **kw):
            calls.append(kw)
            return False

        def fake_candidates(title, scene, visuals, pexels_key, pixabay_key, vertical):
            return {"videos": [{"url": "http://example.invalid/c.mp4", "title": "clip",
                                "mime": "video/mp4"}],
                    "images": []}

        with mock.patch.object(autovideo, "_download", recorder), \
                mock.patch.object(autovideo_smart, "smart_candidates", fake_candidates), \
                mock.patch.object(autovideo, "fetch_visuals",
                                  return_value={"videos": [], "images": []}), \
                mock.patch.object(autovideo, "generate_ai_image", return_value=False), \
                mock.patch.object(autovideo, "_title_card_image", return_value=False):
            with self.assertRaises(RuntimeError):
                autovideo2._scene_visual(
                    "Test title",
                    {"narration": "a man counts cash at his desk", "visual": "man counting cash"},
                    "videos", tmp, 0, used_urls=set(), lock=threading.Lock())
        self.assertGreaterEqual(len(calls), 1, "no download was even attempted")
        self.assertTrue(all(c.get("total_timeout") == 60 for c in calls),
                        f"download calls without total_timeout=60: {calls}")

    def test_all_scene_visual_downloads_carry_timeout(self):
        src = inspect.getsource(autovideo2._scene_visual)
        lines = [ln for ln in src.splitlines() if "_download(" in ln]
        # 3 download sites (2026-11-22 — Option 2 fix removed the
        # 4th, the "any image" second pass, so no uncapped or
        # off-topic image download remains).
        self.assertGreaterEqual(len(lines), 3, f"expected 3 download calls, found: {lines}")
        for ln in lines:
            self.assertIn("total_timeout=60", ln, f"download without a cap: {ln.strip()}")


if __name__ == "__main__":
    unittest.main()
