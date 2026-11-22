"""Mocked Option 2 fix tests (user, 2026-11-22): subtitle drift +
visual mismatch + Visual Explainer reel subtitles.

(a) narration edit after Audio forces a re-voice on next run;
(b) render uses ffprobe-measured durations, not recorded ones;
(c) SRT rebuilds when the voice content changes (and falls back
    to script-derived cues when Whisper fails twice);
(d) visual verification rejects a deliberately mismatched clip
    and re-picks;
(e) the "any clip" fallback no longer returns an irrelevant clip;
(f) 9:16 subtitle style carries PlayRes for the real frame size
    (the libass default 384x288 scaled 32px to ~213px per line).

No real network is used anywhere. The only real external calls
are local ffmpeg/ffprobe (for real mp3 durations). Run:
    ~/workspace/ytguru-test-venv/bin/python -m pytest backend/tests/test_autovideo_fix_option2.py
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import autovideo  # noqa: E402
import autovideo2  # noqa: E402
import autovideo_smart  # noqa: E402


def _make_mp3(path: Path, seconds: float) -> Path:
    """A real mp3 of `seconds` (sine tone) via local ffmpeg."""
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"sine=frequency=440:duration={seconds}",
         "-c:a", "libmp3lame", str(path)],
        check=True)
    return path


def _fake_whisper_model(calls: dict, words=("the", "moon", "rises", "over", "the", "sea")):
    """A fake faster-whisper model: transcribe returns word
    timestamps for the given words, 0.3s apart."""

    class _Word:
        def __init__(self, word, start, end):
            self.word, self.start, self.end = word, start, end

    class _Seg:
        def __init__(self, ws):
            self.words = ws

    class _Model:
        def transcribe(self, audio, **kwargs):
            calls["n"] = calls.get("n", 0) + 1
            ws = [_Word(w, 0.3 * i, 0.3 * i + 0.25) for i, w in enumerate(words)]
            return iter([_Seg(ws)]), None

    return _Model()


class VoiceHashTest(unittest.TestCase):
    def test_hash_changes_with_narration_voice_provider(self):
        h = autovideo2._voice_hash
        base = h("hello world", "Aria", "edge")
        self.assertEqual(base, h("hello world", "Aria", "edge"))
        self.assertNotEqual(base, h("hello WORLD", "Aria", "edge"))
        self.assertNotEqual(base, h("hello world", "Jenny", "edge"))
        self.assertNotEqual(base, h("hello world", "Aria", "elevenlabs"))

    def test_remeasure_uses_real_duration_not_recorded(self):
        work_dir = Path(tempfile.mkdtemp())
        voice = _make_mp3(work_dir / "scene-00.mp3", 2.0)
        got = autovideo2._remeasure_voice_durations([voice], [10.0])
        self.assertEqual(len(got), 1)
        self.assertAlmostEqual(got[0], 2.0, delta=0.3)
        self.assertNotEqual(got[0], 10.0)

    def test_remeasure_keeps_recorded_when_file_unmeasurable(self):
        work_dir = Path(tempfile.mkdtemp())
        missing = work_dir / "no-such-file.mp3"
        got = autovideo2._remeasure_voice_durations([missing], [7.5])
        self.assertEqual(got, [7.5])


class PrepareAudioTest(unittest.TestCase):
    def _run_prepare(self, work_dir, scenes, existing_voices, fake_voice_fn):
        with mock.patch.object(autovideo2, "_voice_scene_with_fallback",
                               side_effect=fake_voice_fn) as voice_mock, \
             mock.patch.object(autovideo_smart, "fast_music_and_sfx",
                               return_value=(None, "off", [], "off", [], "off")):
            result = autovideo2.prepare_audio(
                "Test title", scenes, "Aria", work_dir,
                music=False, tts_provider="edge",
                existing_voices=existing_voices)
        return result, voice_mock

    def test_narration_edit_forces_revoice(self):
        """(a) The checkpoint carries the OLD narration's hash;
        the scene's narration has since changed -> re-voice."""
        work_dir = Path(tempfile.mkdtemp())
        old_voice = _make_mp3(work_dir / "scene-00.mp3", 2.0)
        new_voice = _make_mp3(work_dir / "scene-00-new.mp3", 3.0)
        scenes = [{"narration": "new words about honey and bees"}]
        existing = {0: {"voice_path": "scene-00.mp3", "engine": "edge",
                        "duration": 2.0,
                        "voice_hash": autovideo2._voice_hash(
                            "OLD different narration", "Aria", "edge")}}
        calls = []

        def fake_voice(i, narration, *rest):
            calls.append((i, narration))
            return new_voice, "edge", 3.0, False, ""

        result, voice_mock = self._run_prepare(work_dir, scenes, existing, fake_voice)
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][1], "new words about honey and bees")
        self.assertEqual(result["durations"], [3.0])
        self.assertEqual(result["voice_files"], ["scene-00-new.mp3"])

    def test_missing_hash_revoices_once(self):
        """(a) Old checkpoints have no hash at all -> re-voice
        once, never crash."""
        work_dir = Path(tempfile.mkdtemp())
        _make_mp3(work_dir / "scene-00.mp3", 2.0)
        new_voice = _make_mp3(work_dir / "scene-00-new.mp3", 3.0)
        scenes = [{"narration": "new words about honey and bees"}]
        existing = {0: {"voice_path": "scene-00.mp3", "engine": "edge",
                        "duration": 2.0}}  # no voice_hash key
        calls = []

        def fake_voice(i, narration, *rest):
            calls.append(i)
            return new_voice, "edge", 3.0, False, ""

        result, _ = self._run_prepare(work_dir, scenes, existing, fake_voice)
        self.assertEqual(len(calls), 1)
        self.assertEqual(result["durations"], [3.0])

    def test_matching_hash_reuses_but_measures_duration(self):
        """(b/g) Matching hash -> reuse the file, but the duration
        comes from ffprobe (2s), NOT the stored 10s."""
        work_dir = Path(tempfile.mkdtemp())
        _make_mp3(work_dir / "scene-00.mp3", 2.0)
        scenes = [{"narration": "new words about honey and bees"}]
        existing = {0: {"voice_path": "scene-00.mp3", "engine": "edge",
                        "duration": 10.0,
                        "voice_hash": autovideo2._voice_hash(
                            "new words about honey and bees", "Aria", "edge")}}

        def fake_voice(i, narration, *rest):
            raise AssertionError("must not re-voice a matching checkpoint")

        result, _ = self._run_prepare(work_dir, scenes, existing, fake_voice)
        self.assertAlmostEqual(result["durations"][0], 2.0, delta=0.3)
        self.assertNotEqual(result["durations"][0], 10.0)


class SrtTest(unittest.TestCase):
    def test_srt_rebuilds_when_voice_content_changes(self):
        """(c) Same narration, NEW voice bytes -> re-transcribe
        (the old mtime cache would have kept the old timings)."""
        work_dir = Path(tempfile.mkdtemp())
        voice = _make_mp3(work_dir / "scene-00.mp3", 2.0)
        (work_dir / "scene-00.narration.txt").write_text(
            "the moon rises over the sea", encoding="utf-8")
        calls: dict = {}
        model = _fake_whisper_model(calls)
        with mock.patch.object(autovideo2, "_get_whisper_model", return_value=model), \
             mock.patch("video.decode_audio_16k", return_value=__import__("numpy").zeros(16000)):
            srt1 = autovideo2._transcribe_scene_voice(voice, work_dir, 0)
            self.assertIsNotNone(srt1)
            self.assertIn("moon", srt1.read_text(encoding="utf-8"))
            self.assertEqual(calls["n"], 1)
            # Unchanged voice -> cache hit, no second transcription.
            srt2 = autovideo2._transcribe_scene_voice(voice, work_dir, 0)
            self.assertEqual(srt2, srt1)
            self.assertEqual(calls["n"], 1)
            # New voice bytes (different duration) -> re-transcribe.
            _make_mp3(work_dir / "scene-00.mp3", 3.0)
            srt3 = autovideo2._transcribe_scene_voice(voice, work_dir, 0)
            self.assertIsNotNone(srt3)
            self.assertEqual(calls["n"], 2)
            self.assertIn("moon", srt3.read_text(encoding="utf-8"))

    def test_script_fallback_when_whisper_fails(self):
        """(c) Whisper fails twice -> script-derived SRT, never
        None and never an empty scene."""
        work_dir = Path(tempfile.mkdtemp())
        voice = _make_mp3(work_dir / "scene-00.mp3", 2.0)
        (work_dir / "scene-00.narration.txt").write_text(
            "the moon rises over the sea tonight", encoding="utf-8")
        with mock.patch.object(autovideo2, "_get_whisper_model",
                               side_effect=RuntimeError("no model")), \
             mock.patch("video.decode_audio_16k", return_value=__import__("numpy").zeros(16000)):
            srt = autovideo2._transcribe_scene_voice(voice, work_dir, 0)
        self.assertIsNotNone(srt)
        text = srt.read_text(encoding="utf-8")
        for word in ("moon", "rises", "sea", "tonight"):
            self.assertIn(word, text)
        # Cues spread over the ~2s voice, not all at 0.
        cues = autovideo2._parse_srt_cues(srt)
        self.assertTrue(cues)
        self.assertGreater(cues[-1]["end"], 1.0)


class VisualVerificationTest(unittest.TestCase):
    def _patch_visuals(self, smart_videos, fetch_videos, fetch_images=None):
        patches = [
            mock.patch.object(autovideo_smart, "smart_candidates",
                              return_value={"videos": smart_videos, "images": []}),
            mock.patch.object(autovideo, "fetch_visuals",
                              return_value={"videos": fetch_videos,
                                            "images": fetch_images or []}),
            mock.patch.object(autovideo_smart, "remember_footage", return_value=None),
        ]
        for p in patches:
            p.start()
        self.addCleanup(lambda: [p.stop() for p in patches])

    def test_verification_rejects_mismatch_and_repicks(self):
        """(d) The first candidate is about car racing, the scene
        is about honey: the AI vetoes it, the honey clip is
        picked — and the rejected clip is never downloaded."""
        work_dir = Path(tempfile.mkdtemp())
        bad = {"url": "http://x/bad-car.mp4", "title": "car racing fast", "mime": "video/mp4"}
        good = {"url": "http://x/good-honey.mp4", "title": "honey bees on flowers", "mime": "video/mp4"}
        self._patch_visuals([bad, good], [])
        downloaded = []

        def fake_download(url, dest, **kwargs):
            downloaded.append(url)
            dest.write_bytes(b"fake")
            return True

        def fake_verify(narration, clip_title):
            return "car" not in clip_title.lower()

        with mock.patch.object(autovideo, "_download", side_effect=fake_download), \
             mock.patch.object(autovideo, "_ffprobe_duration", return_value=5.0), \
             mock.patch.object(autovideo_smart, "verify_clip_fits", side_effect=fake_verify):
            path, kind, source = autovideo2._scene_visual(
                "Why Honey Never Expires",
                {"narration": "Honey never expires because bees make it last forever."},
                "both", work_dir, 0)
        self.assertEqual(kind, "clip")
        self.assertEqual(source, "honey bees on flowers")
        self.assertEqual(downloaded, ["http://x/good-honey.mp4"])

    def test_any_clip_fallback_is_gone(self):
        """(e) The only found clips share NO title-core word with
        the video: no clip is picked at all (the old 'any clip'
        pass would have returned the car-racing clip)."""
        work_dir = Path(tempfile.mkdtemp())
        off_topic = [
            {"url": "http://x/car.mp4", "title": "car racing championship", "size": 1000},
            {"url": "http://x/ocean.mp4", "title": "ocean waves storm", "size": 1000},
        ]
        self._patch_visuals([], off_topic)
        downloaded = []

        def fake_download(url, dest, **kwargs):
            downloaded.append(url)
            dest.write_bytes(b"fake")
            return True

        def fake_ai_image(title, visual_text, dest):
            dest.write_bytes(b"fake-image")
            return True

        with mock.patch.object(autovideo, "_download", side_effect=fake_download), \
             mock.patch.object(autovideo, "_ffprobe_duration", return_value=5.0), \
             mock.patch.object(autovideo, "generate_ai_image", side_effect=fake_ai_image):
            path, kind, source = autovideo2._scene_visual(
                "Why Honey Never Expires",
                {"narration": "Honey never expires because bees make it last forever."},
                "both", work_dir, 0)
        self.assertEqual(kind, "ai")
        self.assertEqual(downloaded, [])  # no clip was even tried

    def test_overlap_gate_drops_zero_overlap_candidates(self):
        """(e) smart_candidates never returns a candidate whose
        tags share no word with the query."""
        import autovideo_smart as sm
        # Direct unit check of the gate via a fake stock search:
        fake_hits = [
            {"url": "http://x/a", "title": "honey bees flowers"},
            {"url": "http://x/b", "title": "car racing championship"},
        ]
        with mock.patch.object(sm, "_STOP", set()), \
             mock.patch("autovideo._commons_search",
                        side_effect=lambda q, ftype, n, page=0: list(fake_hits) if ftype == "video" else []):
            out = sm.smart_candidates(
                "Why Honey Never Expires",
                {"plan": {"queries": ["honey bees"], "avoid": []}},
                "videos", None, None, False)
        urls = [it["url"] for it in out["videos"]]
        self.assertIn("http://x/a", urls)
        self.assertNotIn("http://x/b", urls)


class SubtitleStyleTest(unittest.TestCase):
    def test_vertical_style_has_playres_for_real_frame(self):
        """(f) The 9:16 style must pin libass to the real frame
        (1080x1920), or FontSize 32 renders at ~213px."""
        style = autovideo2._SUBTITLE_STYLE_VERTICAL
        self.assertIn("PlayResX=1080", style)
        self.assertIn("PlayResY=1920", style)
        self.assertIn("FontSize=32", style)

    def test_landscape_style_has_playres_for_real_frame(self):
        style = autovideo2._SUBTITLE_STYLE
        self.assertIn("PlayResX=1280", style)
        self.assertIn("PlayResY=720", style)
        self.assertIn("FontSize=24", style)

    def test_words_to_srt_caps_each_cue_at_five_words(self):
        """(f) One cue is at most 5 words, so a subtitle line can
        never grow into a wall of text."""
        words = [{"start": 0.4 * i, "end": 0.4 * i + 0.35, "word": f"word{i}"}
                 for i in range(12)]
        srt = autovideo2._words_to_srt(words)
        # Parse the SRT text directly (no file needed).
        blocks = [b for b in srt.strip().split("\n\n") if b.strip()]
        self.assertTrue(blocks)
        for block in blocks:
            lines = block.strip().split("\n")
            text = " ".join(lines[2:])
            self.assertLessEqual(len(text.split()), 5)


if __name__ == "__main__":
    unittest.main()
