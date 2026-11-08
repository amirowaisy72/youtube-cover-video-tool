import { createFileRoute } from "@tanstack/react-router";
// Note (2026-11-07): this route's chunk hash is content-based;
// a comment-only edit does not change the built bundle.
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { useApp } from "@/lib/app-store";
import { ApiError, api, autovideoCreate, autovideoJob, autovideoMusicOptions, autovideoRemixMusic, autovideoRemixVolume, autovideoSceneAlternatives, autovideoSceneUpload, autovideoSceneVisual, autovideoTrim, autovideoUpload, ttsVoices, type AvJob, type AvMusicOptions, type AvScene, type AvSceneAlternatives, type AvUploadResult, type TtsVoice, validateStockKey, youtubeStatus } from "@/lib/api";
import { getChannelNiche, getFreesoundKey, getPexelsKey, getPixabayKey, setChannelNiche, setFreesoundKey, setPexelsKey, setPixabayKey } from "@/lib/keys";
import s1 from "@/assets/scene-1.jpg";
import s2 from "@/assets/scene-2.jpg";
import s3 from "@/assets/scene-3.jpg";

export const Route = createFileRoute("/auto-video")({
  component: AutoVideo,
});

const STAGES = ["Script", "Voiceover", "Video clip", "Captions"] as const;
const imgs = [s1, s2, s3];
const lines = [
  "Did you know the universe is still expanding right now?",
  "Cities of the future may glow brighter than the stars.",
  "Ancient builders aligned their monuments with the sky.",
  "Some mountains are still growing every single year.",
  "Light from distant stars is older than our planet.",
  "Rain in neon cities paints the streets with color.",
  "Deserts hide secrets that are thousands of years old.",
  "Nature's golden hour lasts only a few minutes.",
];

/** Backend stage text -> which of the 4 build stages is current.
    The master pipeline reports per-scene progress ("Building
    scene X of Y…"), which is the video-clip stage, and "Joining
    scenes…" is the final assembly. */
function stageIndex(job: AvJob | null): number {
  const s = (job?.stage || "").toLowerCase();
  if (s.includes("building scene")) return 2;
  if (s.includes("joining")) return 3;
  if (s.includes("script")) return 0;
  if (s.includes("voiceover")) return 1;
  if (s.includes("visual")) return 2;
  if (s.includes("assembl")) return 3;
  if (job?.status === "done") return 4;
  const p = job?.progress ?? 0;
  return p < 25 ? 0 : p < 50 ? 1 : p < 75 ? 2 : 3;
}

function AutoVideo() {
  const { jobs, registerJob, updateJob, removeJob, activeChannelId } = useApp();
  const [title, setTitle] = useState("10 Mind-Blowing Facts About Our World");
  // Prompt for AI (user, 2026-11-09): a button next to the title
  // that copies a prompt for Gemini/AI to suggest video title ideas
  // matching the channel selected in the TopBar. The channel's
  // topic comes from the Setup Wizard when it was created, or the
  // user types it once here and it is remembered per channel.
  const [activeChannelTitle, setActiveChannelTitle] = useState("");
  const [niche, setNiche] = useState("");
  // The channel's live description + keywords (user, 2026-11-09):
  // the Prompt for AI must tell Gemini the channel's category, not
  // just its name — so the prompt carries the real About text and
  // keywords from YouTube, even when the niche box is empty.
  const [channelDesc, setChannelDesc] = useState("");
  const [channelKeywords, setChannelKeywords] = useState("");
  const [copied, setCopied] = useState(false);
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };
  useEffect(() => {
    youtubeStatus()
      .then((s) => {
        const chans = s.channels ?? [];
        const active = activeChannelId ? chans.find((c) => c.id === activeChannelId) : undefined;
        setActiveChannelTitle((active ?? chans[0])?.title ?? "");
      })
      .catch(() => undefined);
    if (activeChannelId) {
      setNiche(getChannelNiche(activeChannelId));
      // Read the channel's live About + keywords so the prompt
      // knows its category. A failure just leaves them blank.
      api<{ description: string; keywords: string }>(
        `/api/channel/inspect?channel_id=${encodeURIComponent(activeChannelId)}`,
      )
        .then((d) => {
          setChannelDesc((d.description || "").trim());
          setChannelKeywords((d.keywords || "").trim());
          // Auto-fetch the niche (user, 2026-11-09): when no niche
          // was saved for this channel — e.g. it was connected
          // directly, not through the wizard's Step 4 — derive it
          // from the channel's live keywords, so the field fills
          // itself from the selected channel. The functional
          // setNiche keeps anything the user typed meanwhile.
          const kws = (d.keywords || "").trim();
          if (!getChannelNiche(activeChannelId) && kws) {
            const derived = kws
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
              .slice(0, 3)
              .join(", ");
            if (derived) {
              setNiche((prev) => {
                if (prev.trim()) return prev;
                setChannelNiche(activeChannelId, derived);
                return derived;
              });
            }
          }
        })
        .catch(() => undefined);
    }
  }, [activeChannelId]);
  const descSnippet = channelDesc.length > 400 ? `${channelDesc.slice(0, 400)}…` : channelDesc;
  const titleIdeasPrompt = `Suggest 10 catchy, clickable YouTube video title ideas for a YouTube channel called "${activeChannelTitle || "my channel"}"${niche.trim() ? ` about ${niche.trim()}` : ""}.${descSnippet ? `\nChannel description: "${descSnippet}"` : ""}${channelKeywords ? `\nChannel keywords: ${channelKeywords}` : ""}\nThe titles should be short (under 60 characters), create curiosity, and match what viewers search for in this niche. Return only the titles, one per line, no extra text.`;
  const [dur, setDur] = useState(2);
  const [durInput, setDurInput] = useState("2");
  // Voice (user, 2026-11-09): the narration voice. Was hardcoded
  // to Aria — now the user picks. Aria is the default (what all
  // earlier videos used). Each voice has its own natural tone;
  // preview any of them in the Text to Voice tool first.
  const [voiceList, setVoiceList] = useState<TtsVoice[]>([]);
  const [voice, setVoice] = useState("en-US-AriaNeural");
  useEffect(() => {
    ttsVoices()
      .then((d) => setVoiceList(d.voices || []))
      .catch(() => undefined);
  }, []);
  // Custom script (user, 2026-11-09): the user can paste a script
  // written by another AI (e.g. Gemini) and the video is built
  // from it. Empty = the tool writes the script itself.
  const [customScript, setCustomScript] = useState("");
  const scriptPrompt = `Write a YouTube video script for a video titled "${title.trim() || "my video"}"${activeChannelTitle ? ` for the channel "${activeChannelTitle}"` : ""}${niche.trim() ? ` about ${niche.trim()}` : ""}. The video should be about ${dur} minute(s) long (roughly ${dur * 150} words). Start with a strong hook in the first 15 seconds, then explain the topic in simple, clear language with interesting examples. Write it as plain spoken narration only — no scene directions, no headings, no bullet points. Separate paragraphs with a blank line, one idea per paragraph.`;
  const [subtitles, setSubtitles] = useState(true);
  // Mood music + transitions (2026-11-08): a mood-matched
  // background track (needs the Freesound key below) and a
  // different transition style + sound at every scene change.
  const [music, setMusic] = useState(true);
  const [transitions, setTransitions] = useState(true);
  // Stock-media keys (Pexels / Pixabay, free): shared with the
  // Stock and Music tools via localStorage — entering one here
  // connects it everywhere, and vice versa. Empty = Commons only.
  const [pexelsKey, setPexelsKeyState] = useState("");
  const [pixabayKey, setPixabayKeyState] = useState("");
  const [freesoundKey, setFreesoundKeyState] = useState("");
  // Key validation (user, 2026-11-08): a wrong key must be
  // caught here, not weeks later when videos silently miss
  // the stock footage and fall back to Commons.
  const [keyTest, setKeyTest] = useState<string | null>(null);
  const [keyTesting, setKeyTesting] = useState(false);

  const testKeys = async () => {
    setKeyTesting(true);
    setKeyTest(null);
    const parts: string[] = [];
    for (const [label, source, key] of [["Pexels", "pexels", pexelsKey], ["Pixabay", "pixabay", pixabayKey], ["Freesound", "freesound", freesoundKey]] as const) {
      if (!key.trim()) { parts.push(`${label}: — (no key)`); continue; }
      try {
        const res = await validateStockKey(source, key.trim());
        if (res.valid) parts.push(`${label}: ✓ valid`);
        else if (res.reason === "invalid") parts.push(`${label}: ✗ invalid — wrong or revoked key`);
        else parts.push(`${label}: ⚠ could not verify right now`);
      } catch {
        parts.push(`${label}: ⚠ could not verify right now`);
      }
    }
    setKeyTest(parts.join(" · "));
    setKeyTesting(false);
  };
  const [phase, setPhase] = useState<"form" | "build" | "done">("form");
  const [job, setJob] = useState<AvJob | null>(null);
  // Trim the start (user, 2026-11-09): cut the first seconds off
  // the finished video (often an unwanted "Hook").
  const [trimSeconds, setTrimSeconds] = useState("5");
  const [trimLoading, setTrimLoading] = useState(false);
  const [trimError, setTrimError] = useState("");
  const [trimmedUrl, setTrimmedUrl] = useState("");
  // Upload to YouTube (user, 2026-11-09): title, description,
  // tags, privacy and thumbnail, to the selected channel.
  const [upTitle, setUpTitle] = useState("");
  const [upDesc, setUpDesc] = useState("");
  const [upTags, setUpTags] = useState("");
  const [upPrivacy, setUpPrivacy] = useState("private");
  const [upThumb, setUpThumb] = useState<File | null>(null);
  const [upLoading, setUpLoading] = useState(false);
  const [upError, setUpError] = useState("");
  const [upResult, setUpResult] = useState<AvUploadResult | null>(null);
  // Scene sync (user, 2026-11-09): when the video plays or the
  // user seeks/clicks, the Scenes panel on the right follows —
  // the scene playing at that timestamp is highlighted and
  // scrolled into view.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeScene, setActiveScene] = useState(-1);
  const syncSceneFromVideo = () => {
    const v = videoRef.current;
    if (!v || !job?.scenes?.length) return;
    const t = v.currentTime || 0;
    let acc = 0;
    let idx = job.scenes.length - 1;
    for (let i = 0; i < job.scenes.length; i++) {
      const d = job.scenes[i]?.duration_sec || 0;
      if (t < acc + d) { idx = i; break; }
      acc += d;
    }
    setActiveScene((prev) => (prev === idx ? prev : idx));
  };
  // QUICK FOOTAGE BROWSER (user, 2026-11-09 — his idea): one
  // scene at a time, flip with ◀ ▶ arrows (or keyboard
  // Left/Right), see that scene's footage + narration, and
  // change it right there. Fast enough to fix even a long
  // video scene by scene. The "Change" button on any scene
  // row opens the browser at that scene.
  const [browserIdx, setBrowserIdx] = useState<number | null>(null);
  const [browserAlts, setBrowserAlts] = useState<AvSceneAlternatives | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserError, setBrowserError] = useState("");
  const [browserApplying, setBrowserApplying] = useState(false);
  const [browserQuery, setBrowserQuery] = useState("");
  const [browserCopied, setBrowserCopied] = useState("");
  const [browserUploadFile, setBrowserUploadFile] = useState<File | null>(null);
  const browserVideoRef = useRef<HTMLVideoElement | null>(null);
  const browserTotal = job?.scenes?.length || 0;
  // Start time of a scene in the finished video (cumulative
  // durations) — the browser preview seeks the full video here.
  const sceneStart = (idx: number) => {
    let acc = 0;
    for (let i = 0; i < idx && job?.scenes?.[i]; i++) acc += job.scenes[i]?.duration_sec || 0;
    return acc;
  };
  const loadBrowserAlts = async (idx: number, query = "") => {
    if (!job) return;
    setBrowserAlts(null);
    setBrowserError("");
    setBrowserCopied("");
    setBrowserUploadFile(null);
    setBrowserLoading(true);
    try {
      const alts = await autovideoSceneAlternatives(job.id, idx, pexelsKey, pixabayKey, query);
      setBrowserAlts(alts);
      setBrowserQuery(alts.query || "");
    } catch (e) {
      setBrowserError(e instanceof ApiError ? e.message : "Could not load alternatives.");
    } finally {
      setBrowserLoading(false);
    }
  };
  const openBrowser = (idx: number) => {
    setBrowserIdx(idx);
    void loadBrowserAlts(idx);
  };
  const browserNav = (delta: number) => {
    if (browserIdx === null || browserTotal === 0) return;
    const next = Math.min(Math.max(browserIdx + delta, 0), browserTotal - 1);
    if (next === browserIdx) return;
    setBrowserIdx(next);
    void loadBrowserAlts(next);
  };
  // Seek the browser preview to the current scene when the
  // scene changes.
  useEffect(() => {
    const v = browserVideoRef.current;
    if (v && browserIdx !== null) {
      const t = sceneStart(browserIdx);
      if (Math.abs(v.currentTime - t) > 0.5) v.currentTime = t;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserIdx]);
  // Keyboard: ◀ ▶ flip scenes, Escape closes (user, 2026-11-09).
  useEffect(() => {
    if (browserIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setBrowserIdx(null); setBrowserAlts(null); setBrowserError(""); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); browserNav(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); browserNav(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserIdx, browserTotal]);
  // Prompt for AI (user, 2026-11-09): copy a prompt to generate
  // this scene's footage himself with an AI tool, then upload it.
  const copyBrowserPrompt = async () => {
    if (!job || browserIdx === null) return;
    const scene = job.scenes?.[browserIdx];
    const desc = scene?.visual || scene?.narration || "";
    const prompt = `Generate a cinematic 16:9 video clip (or a still image) for a YouTube video scene. Video title: "${job.title}". Scene ${browserIdx + 1} narration: "${desc}". Style: realistic, high quality, natural lighting, no text, no watermark, no people facing the camera unless the narration needs it. Duration about ${Math.round(scene?.duration_sec || 10)} seconds if video.`;
    try {
      await navigator.clipboard.writeText(prompt);
      setBrowserCopied("✓ Prompt copied — paste it into your AI tool, generate the footage, then upload it below.");
    } catch {
      setBrowserCopied("Copy failed — select and copy the prompt manually.");
    }
  };
  const uploadBrowserVisual = async () => {
    if (!job || browserIdx === null || !browserUploadFile || browserApplying) return;
    setBrowserApplying(true);
    setBrowserError("");
    try {
      await autovideoSceneUpload(job.id, browserIdx, browserUploadFile);
      const j = await autovideoJob(job.id);
      setJob(j);
      setBrowserUploadFile(null);
      // The browser video remounts via its key (scene + version)
      // with a cache-busted URL, so it loads the re-rendered
      // file fresh and seeks to this scene — no manual load().
      setVideoVersion((v) => v + 1);
    } catch (e) {
      setBrowserError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setBrowserApplying(false);
    }
  };
  const applyBrowserVisual = async (url: string, kind: "clip" | "image") => {
    if (!job || browserIdx === null || browserApplying) return;
    setBrowserApplying(true);
    setBrowserError("");
    try {
      await autovideoSceneVisual(job.id, browserIdx, url, kind);
      // Refresh the job (new scene kind/source) and stay in the
      // browser on the same scene to see the result. The video
      // remounts via its key with a fresh URL (see above).
      const j = await autovideoJob(job.id);
      setJob(j);
      setVideoVersion((v) => v + 1);
    } catch (e) {
      setBrowserError(e instanceof ApiError ? e.message : "Scene change failed.");
    } finally {
      setBrowserApplying(false);
    }
  };
  // Music change (user, 2026-11-09): swap the background music
  // after the build, with a volume slider.
  const [musicMood, setMusicMood] = useState("");
  const [musicOpts, setMusicOpts] = useState<AvMusicOptions | null>(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicError, setMusicError] = useState("");
  const [musicVolume, setMusicVolume] = useState(20);
  const [musicApplying, setMusicApplying] = useState(false);
  // Which track is being applied (user, 2026-11-09): only THAT
  // track's button may say "Applying…" — the old shared boolean
  // made EVERY track's button say it at once.
  const [applyingMusicId, setApplyingMusicId] = useState<string | null>(null);
  const [musicApplied, setMusicApplied] = useState("");
  // Video reload key (user, 2026-11-09): after a music change
  // the video would not load at all — the <video> kept the same
  // src so it never refetched the rewritten final.mp4. Bumping
  // this remounts the player with a cache-busted URL.
  const [videoVersion, setVideoVersion] = useState(0);
  const loadMusic = async () => {
    if (!job) return;
    setMusicLoading(true);
    setMusicError("");
    setMusicOpts(null);
    try {
      const opts = await autovideoMusicOptions(job.id, musicMood, freesoundKey);
      setMusicOpts(opts);
      if (!musicMood) setMusicMood(opts.mood);
    } catch (e) {
      setMusicError(e instanceof ApiError ? e.message : "Could not load music.");
    } finally {
      setMusicLoading(false);
    }
  };
  const applyMusic = async (previewUrl: string, name: string) => {
    if (!job || musicApplying) return;
    setMusicApplying(true);
    setApplyingMusicId(previewUrl);
    setMusicError("");
    setMusicApplied("");
    try {
      const res = await autovideoRemixMusic(job.id, previewUrl, name, musicVolume / 100);
      setMusicApplied(`✓ Music changed to "${res.music}" at ${Math.round(res.volume * 100)}% volume.`);
      const j = await autovideoJob(job.id);
      setJob(j);
      // Reload the player with the re-mixed video (see
      // videoVersion above — without this the player keeps the
      // stale file and shows a blank 0:00).
      setVideoVersion((v) => v + 1);
    } catch (e) {
      setMusicError(e instanceof ApiError ? e.message : "Music change failed.");
    } finally {
      setMusicApplying(false);
      setApplyingMusicId(null);
    }
  };
  // Volume only (user, 2026-11-09): the slider alone did
  // nothing — the volume only took effect when picking a NEW
  // track. This applies the slider's value to the CURRENT music.
  const applyVolume = async () => {
    if (!job || musicApplying) return;
    setMusicApplying(true);
    setApplyingMusicId("volume");
    setMusicError("");
    setMusicApplied("");
    try {
      const res = await autovideoRemixVolume(job.id, musicVolume / 100);
      setMusicApplied(`✓ Volume set to ${Math.round(res.volume * 100)}% on the current music.`);
      const j = await autovideoJob(job.id);
      setJob(j);
      setVideoVersion((v) => v + 1);
    } catch (e) {
      setMusicError(e instanceof ApiError ? e.message : "Volume change failed.");
    } finally {
      setMusicApplying(false);
      setApplyingMusicId(null);
    }
  };
  const descPrompt = `Write a YouTube video description for a video titled "${(upTitle || title).trim() || "my video"}"${activeChannelTitle ? ` on the channel "${activeChannelTitle}"` : ""}${niche.trim() ? ` about ${niche.trim()}` : ""}. 2-3 short paragraphs: what the video covers, why it matters, and a call to subscribe. Friendly, clear tone. End with 3-5 relevant hashtags on their own line.`;
  const tagsPrompt = `Suggest 15 YouTube video tags for a video titled "${(upTitle || title).trim() || "my video"}"${niche.trim() ? ` about ${niche.trim()}` : ""}. Cover the topic, related searches, and audience intent. Return them as a comma-separated list only, no numbering, no extra text.`;
  const thumbPrompt = `Create a YouTube thumbnail image, 1280x720, for a video titled "${(upTitle || title).trim() || "my video"}"${activeChannelTitle ? ` on the channel "${activeChannelTitle}"` : ""}${niche.trim() ? ` about ${niche.trim()}` : ""}. Bold, high-contrast design that stands out in the feed: one clear focal image, at most 3-4 large readable words of text, strong colours, no clutter, no small text.`;
  const doUpload = async () => {
    if (!job || upLoading) return;
    const t = (upTitle || job.title || title).trim();
    if (!t) {
      setUpError("Enter a video title first.");
      return;
    }
    setUpLoading(true);
    setUpError("");
    setUpResult(null);
    try {
      const res = await autovideoUpload(
        job.id,
        { title: t, description: upDesc, tags: upTags, privacy: upPrivacy, channelId: activeChannelId || "" },
        upThumb,
      );
      setUpResult(res);
    } catch (e) {
      setUpError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
    } finally {
      setUpLoading(false);
    }
  };
  const doTrim = async () => {
    if (!job || trimLoading) return;
    const secs = Number(trimSeconds);
    if (!Number.isFinite(secs) || secs <= 0) {
      setTrimError("Enter how many seconds to cut from the start (more than 0).");
      return;
    }
    setTrimLoading(true);
    setTrimError("");
    try {
      const res = await autovideoTrim(job.id, secs);
      setTrimmedUrl(res.trimmed_url);
    } catch (e) {
      setTrimError(e instanceof ApiError ? e.message : "Trim failed. Please try again.");
    } finally {
      setTrimLoading(false);
    }
  };
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobKey = useRef<string | null>(null);

  const poll = (id: string) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const j = await autovideoJob(id);
        setJob(j);
        if (jobKey.current) {
          updateJob(jobKey.current, {
            progress: j.progress ?? 0,
            stage: j.stage || "",
            status: j.status === "done" ? "done" : j.status === "failed" ? "failed" : "running",
          });
        }
        if (j.status === "done") {
          if (timer.current) clearInterval(timer.current);
          setPhase("done");
        } else if (j.status === "failed") {
          if (timer.current) clearInterval(timer.current);
          setPhase("form");
          setError("Failed: " + (j.error || "Unknown error."));
        }
      } catch {
        /* Keep polling on a transient error. */
      }
    }, 3000);
  };

  // Load the shared stock-media keys (entered here, in the
  // Stock tool or in the Music tool — one key works everywhere).
  useEffect(() => {
    setPexelsKeyState(getPexelsKey());
    setPixabayKeyState(getPixabayKey());
    setFreesoundKeyState(getFreesoundKey());
  }, []);

  // Restore a job that was started earlier and is still in the
  // background store (user left the page and came back via the
  // top progress bar, or refreshed). The backend job kept
  // running the whole time.
  useEffect(() => {
    const active = jobs.find((j) => j.tool === "auto-video" && j.status === "running");
    const finished = jobs.find((j) => j.tool === "auto-video" && j.status === "done");
    const found = active ?? finished;
    if (!found || jobId) return;
    jobKey.current = found.key;
    setJobId(found.jobId);
    void autovideoJob(found.jobId).then((j) => {
      setJob(j);
      // The job carries the title it was built with — restore it,
      // or the page shows the default title ("10 Mind-Blowing
      // Facts…") for a video built with a different title.
      if (j.title) setTitle(j.title);
      if (j.status === "done") setPhase("done");
      else if (j.status === "failed") { setPhase("form"); setError("Failed: " + (j.error || "Unknown error.")); }
      else { setPhase("build"); poll(found.jobId); }
    }).catch(() => { /* Job gone (server restarted): stay on the form. */ });
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const sceneCount = job?.scene_total || job?.scenes?.length || dur * 3;
  const pct = job?.progress ?? 0;
  const current = Math.min(sceneCount - 1, Math.floor((pct / 100) * sceneCount));
  const stageIdx = stageIndex(job);
  const caption = job?.scenes?.[current]?.caption || job?.scenes?.[current]?.narration || lines[current % lines.length];

  const start = async () => {
    if (!title.trim()) return;
    setError("");
    setJob(null);
    setPhase("build");
    try {
      const data = await autovideoCreate(title.trim(), dur, voice, subtitles, pexelsKey, pixabayKey, freesoundKey, music, transitions, customScript);
      setJobId(data.job_id);
      // Background job: the build keeps running if the user
      // leaves this page, and the top bar shows its progress.
      const key = `autovideo:${data.job_id}`;
      jobKey.current = key;
      registerJob({ key, tool: "auto-video", title: title.trim(), route: "/auto-video", jobId: data.job_id });
      poll(data.job_id);
    } catch (e) {
      setPhase("form");
      setError(
        e instanceof ApiError && e.status === 402
          ? "Not enough credits — activate a license key or top up."
          : "Failed: " + (e instanceof Error ? e.message : "Could not start the video."),
      );
    }
  };

  return (
    <div data-tool="auto-video">
      <PageHeader icon="🎬" title="Auto Video from Title" sub="One title in, one finished video out." />

      {phase === "form" && (
        <div className="glass mx-auto max-w-2xl space-y-6 p-8">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-semibold">Video title</label>
              <button
                className="btn btn-ghost btn-sm"
                title="Prompt for AI — copy a prompt for Gemini or any AI to get video title ideas for the selected channel"
                onClick={() => void copyText(titleIdeasPrompt)}
              >
                {copied ? "✓ Copied" : "✨ Prompt for AI"}
              </button>
            </div>
            <input className="field text-lg" value={title} autoComplete="off" onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 5 Secrets of the Ocean" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Channel topic / niche <span className="text-muted-foreground">(auto-filled from the selected channel — edit if needed)</span></label>
            <input
              className="field"
              value={niche}
              autoComplete="off"
              onChange={(e) => {
                setNiche(e.target.value);
                if (activeChannelId) setChannelNiche(activeChannelId, e.target.value);
              }}
              placeholder="e.g. personal finance, amazing facts"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-semibold">Script <span className="text-muted-foreground">(optional — leave empty to auto-write it)</span></label>
              <button
                className="btn btn-ghost btn-sm"
                title="Prompt for AI — copy a prompt for Gemini or any AI to write this video's script"
                onClick={() => void copyText(scriptPrompt)}
              >
                {copied ? "✓ Copied" : "✨ Prompt for AI"}
              </button>
            </div>
            <textarea
              className="field w-full text-sm leading-relaxed"
              rows={6}
              value={customScript}
              autoComplete="off"
              onChange={(e) => setCustomScript(e.target.value)}
              placeholder="Paste a script here (e.g. written by Gemini) — the video will be built from your words. Leave empty and the tool writes the script itself."
            />
          </div>
          <div>
            <label className="mb-2 block font-semibold">Length</label>
            <div className="seg">
              {[1, 2, 3, 5].map((d) => <button key={d} data-on={dur === d} onClick={() => { setDur(d); setDurInput(String(d)); }}>{d} min</button>)}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-muted-foreground" htmlFor="av-custom-min">Custom:</label>
              <input
                id="av-custom-min"
                className="field w-20 text-center"
                type="number" min={1} max={30} step={1}
                value={durInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setDurInput(v);
                  const n = parseInt(v, 10);
                  if (Number.isFinite(n)) setDur(Math.min(30, Math.max(1, n)));
                }}
                onBlur={() => setDurInput(String(dur))}
                aria-label="Custom length in minutes"
              />
              <span className="text-sm text-muted-foreground">minutes (1–30)</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">About {dur * 3} scenes · 1 credit · longer videos take longer to build, scene by scene</p>
          </div>
          <div>
            <label className="mb-2 block font-semibold">Narration voice <span className="text-sm font-normal text-muted-foreground">(who reads the script — each voice has its own tone; preview them in Text to Voice)</span></label>
            <select className="field" value={voice} onChange={(e) => setVoice(e.target.value)}>
              {voiceList.length > 0 ? (
                voiceList.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))
              ) : (
                <option value="en-US-AriaNeural">English (US) — Female, Aria</option>
              )}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} />
            <span>
              <span className="block font-semibold">💬 Live captions (subtitles)</span>
              <span className="block text-sm text-muted-foreground">Words appear at the bottom as the voice speaks them, YouTube-caption style. Off shows one caption per scene instead.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={music} onChange={(e) => setMusic(e.target.checked)} />
            <span>
              <span className="block font-semibold">🎵 Background music by mood</span>
              <span className="block text-sm text-muted-foreground">A royalty-free track that fits the script's mood (suspense, happy, motivational…) plays softly under the voice. Needs your Freesound key below — without it, the video has no music.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={transitions} onChange={(e) => setTransitions(e.target.checked)} />
            <span>
              <span className="block font-semibold">✨ Transitions + sounds</span>
              <span className="block text-sm text-muted-foreground">A different transition style (fade, wipe, slide, circle…) and a different sound effect at every scene change, so the video never repeats the same look or sound. Sounds need your Freesound key below.</span>
            </span>
          </label>
          <div className="rounded-xl border border-border px-4 py-3">
            <div className="font-semibold">🎞️ Richer stock footage (optional)</div>
            <p className="mt-1 text-sm text-muted-foreground">Add your free Pexels / Pixabay API keys and the video uses their professional clips first (Commons is the fallback). The Freesound key is for the background music and transition sounds — Pixabay's API has no audio, so music and sounds come from Freesound. A key entered here works in the Stock and Music tools too — never enter it twice.</p>
            <div className="mt-3 space-y-2">
              <input
                className="field"
                type="password"
                autoComplete="off"
                placeholder="Pexels API key (optional)"
                value={pexelsKey}
                onChange={(e) => { setPexelsKeyState(e.target.value); setPexelsKey(e.target.value); }}
              />
              <input
                className="field"
                type="password"
                autoComplete="off"
                placeholder="Pixabay API key (optional)"
                value={pixabayKey}
                onChange={(e) => { setPixabayKeyState(e.target.value); setPixabayKey(e.target.value); }}
              />
              <input
                className="field"
                type="password"
                autoComplete="off"
                placeholder="Freesound API key — for music + sounds (optional)"
                value={freesoundKey}
                onChange={(e) => { setFreesoundKeyState(e.target.value); setFreesoundKey(e.target.value); }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Free keys: pexels.com/api · pixabay.com/api/docs · freesound.org/apiv2/apply — stored only in this browser.</p>
            <div className="mt-3 flex items-center gap-3">
              <button type="button" className="btn btn-ghost btn-sm" disabled={keyTesting || (!pexelsKey.trim() && !pixabayKey.trim() && !freesoundKey.trim())} onClick={() => void testKeys()}>
                {keyTesting ? "Testing…" : "🔑 Test my keys"}
              </button>
              {keyTest && <span className="text-sm text-muted-foreground">{keyTest}</span>}
            </div>
          </div>
          <button className="btn btn-primary w-full py-4 text-lg" disabled={!title.trim()} onClick={() => void start()}>🚀 Build my video</button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {phase === "build" && (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="glass min-w-0 p-6">
            {/* Video title (user, 2026-11-09): show which video is
                being built, not just the scene count. */}
            <h3 className="mb-1 text-lg font-bold">{title}</h3>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-bold">Building scene {current + 1} of {sceneCount}</h3>
              <span className="font-display text-3xl font-bold text-gradient">{Math.round(pct)}%</span>
            </div>
            <div className="bar mb-5"><div style={{ width: `${pct}%` }} /></div>
            <p className="mb-4 text-sm text-muted-foreground">{job?.stage || "Starting…"}</p>
            {/* Progress timeline (user, 2026-11-09): click to expand
                and see everything that has happened so far and what
                is running now, with the stock-footage source per
                scene. */}
            {job?.timeline && job.timeline.length > 0 && (
              <details className="mb-4 rounded-xl border border-border p-3">
                <summary className="cursor-pointer text-sm font-semibold">Progress details — {job.timeline.length} step(s)</summary>
                <div className="mt-3 max-h-56 space-y-1.5 overflow-auto text-sm">
                  {job.timeline.map((ev, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="shrink-0 text-muted-foreground">{Math.floor(ev.t / 60)}:{String(ev.t % 60).padStart(2, "0")}</span>
                      <span className="text-muted-foreground">{ev.text}</span>
                    </div>
                  ))}
                </div>
                {job.scenes && job.scenes.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3 text-sm">
                    <p className="font-semibold">Stock footage so far</p>
                    <p className="text-muted-foreground">
                      {(() => {
                        const bySource: Record<string, number> = {};
                        for (const s of job.scenes) {
                          const key = `${s.kind || "?"} from ${s.visual_source || "?"}`;
                          bySource[key] = (bySource[key] || 0) + 1;
                        }
                        return Object.entries(bySource).map(([k, v]) => `${v}× ${k}`).join(" · ");
                      })()}
                    </p>
                  </div>
                )}
              </details>
            )}
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <img src={imgs[current % 3]} alt="" className="h-full w-full object-cover animate-kenburns" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background p-5">
                <p className="text-lg font-semibold">{stageIdx >= 3 ? caption : "…"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {STAGES.map((s, i) => {
                const state = i < stageIdx ? "done" : i === stageIdx ? "now" : "wait";
                return (
                  <div key={s} className={`rounded-xl border p-3 text-center text-sm ${state === "now" ? "border-primary bg-accent" : "border-border"}`}>
                    <div className={state === "now" ? "animate-pulseglow" : ""}>{state === "done" ? "✓" : state === "now" ? "●" : "○"}</div>
                    {s}
                  </div>
                );
              })}
            </div>
          </div>
          <SceneList count={sceneCount} current={current} scenes={job?.scenes} done={false} />
        </div>
      )}

      {phase === "done" && job && (
        <>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="glass min-w-0 p-6">
            <span className="chip mb-3 text-success">✓ Your video is ready</span>
            <h3 className="mb-4 text-2xl font-bold">{job.title || title}</h3>
            {job.download_url ? (
              <video key={videoVersion} ref={videoRef} src={`${job.download_url}${job.download_url.includes("?") ? "&" : "?"}v=${videoVersion}`} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black" onTimeUpdate={syncSceneFromVideo} onSeeked={syncSceneFromVideo} onLoadedMetadata={syncSceneFromVideo} />
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-xl">
                <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Finished in about {job.final_minutes ?? dur} minutes · Script: {job.script_words ?? "?"} words ({job.script_source ?? ""}) · Images used: {job.images_used ?? "?"}, Clips used: {job.clips_used ?? "?"} (found: {job.images_found ?? "?"} images, {job.clips_found ?? "?"} clips)
              {job.ai_images ? ` · AI images: ${job.ai_images}` : ""}{job.title_cards ? ` · Title cards: ${job.title_cards}` : ""} · Voice: {job.voice_engine || ""}
              {job.visual_warning ? ` · ${job.visual_warning}` : ""}
            </p>
            {/* Browse ALL footage (user, 2026-11-09): not just
                one scene — flip through EVERY scene's footage
                from scene 1 and fix any scene right there. */}
            <button className="btn btn-primary mt-4" onClick={() => openBrowser(0)}>
              🎬 Browse all footage — flip through every scene & fix any
            </button>
            {/* Change background music (user, 2026-11-09): it
                used to sit at the very bottom, below Upload —
                moved up here, right under the video, where it
                belongs. Load tracks by mood, listen, pick one,
                set its volume. */}
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="font-semibold">🎵 Change background music</p>
              <p className="mb-3 text-sm text-muted-foreground">Current music: {job.music || "none"}{job.music_volume !== undefined ? ` · volume ${Math.round((job.music_volume as number) * 100)}%` : ""}. Pick a mood, load tracks, listen, and apply one at the volume you want.</p>
              <div className="flex flex-wrap items-center gap-3">
                <select className="field w-auto" value={musicMood || job.mood || "calm"} onChange={(e) => setMusicMood(e.target.value)}>
                  {(musicOpts?.moods || ["suspense", "wonder", "happy", "motivational", "sad", "epic", "calm"]).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <button className="btn btn-ghost" disabled={musicLoading} onClick={() => void loadMusic()}>
                  {musicLoading ? "Loading…" : "Load music"}
                </button>
                <label className="flex items-center gap-2 text-sm">
                  Volume
                  <input type="range" min={0} max={100} value={musicVolume} onChange={(e) => setMusicVolume(parseInt(e.target.value, 10))} className="w-32 accent-primary" />
                  <span className="w-10 text-right font-semibold">{musicVolume}%</span>
                </label>
                <button className="btn btn-primary btn-sm" disabled={musicApplying} onClick={() => void applyVolume()}>
                  {applyingMusicId === "volume" ? "Applying…" : "Apply volume"}
                </button>
              </div>
              {/* Progress bar while a music re-mix runs (user,
                  2026-11-09): the remix takes a few seconds with
                  no percentage from the backend, so an animated
                  indeterminate bar shows it is working. */}
              {musicApplying && (
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/3 rounded-full bg-primary" style={{ animation: "music-progress 1.2s ease-in-out infinite" }} />
                  <style>{`@keyframes music-progress { 0% { margin-left: 0; } 50% { margin-left: 66%; } 100% { margin-left: 0; } }`}</style>
                </div>
              )}
              {musicError && <p className="mt-3 text-sm text-destructive">{musicError}</p>}
              {musicApplied && <p className="mt-3 text-sm text-success">{musicApplied}</p>}
              {musicOpts && musicOpts.options.length > 0 && (
                <div className="mt-4 space-y-2">
                  {musicOpts.options.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(o.duration_sec)}s · {o.license || "royalty-free"}</p>
                      </div>
                      <audio src={o.preview_url} controls preload="none" className="h-8 w-56 max-w-full" />
                      <button className="btn btn-primary btn-sm" disabled={musicApplying} onClick={() => void applyMusic(o.preview_url, o.name)}>
                        {applyingMusicId === o.preview_url ? "Applying…" : "Use this"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {musicOpts && musicOpts.options.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {musicOpts.status === "no_key"
                    ? "No Freesound key — add your free Freesound key in the form above (or the Stock tool) to load music."
                    : musicOpts.status === "key_rejected"
                      ? "Freesound rejected the key — check it and try again."
                      : "No tracks found for this mood — try another mood."}
                </p>
              )}
            </div>
            {/* Trim the start (user, 2026-11-09): cut the first
                seconds off the finished video — the opening "Hook"
                is often unwanted. The original is kept. */}
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="font-semibold">Trim the start</p>
              <p className="mb-3 text-sm text-muted-foreground">Cut the first seconds off this video (the opening Hook is usually 3–5 seconds). The original stays as it is.</p>
              <div className="flex items-center gap-2">
                <input
                  className="field w-24 text-center"
                  type="number" min={1} max={600} step={1}
                  value={trimSeconds}
                  autoComplete="off"
                  onChange={(e) => setTrimSeconds(e.target.value)}
                  aria-label="Seconds to cut from the start"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
                <button className="btn btn-primary" disabled={trimLoading} onClick={() => void doTrim()}>
                  {trimLoading ? "Trimming…" : "✂️ Trim"}
                </button>
              </div>
              {trimError && <p className="mt-2 text-sm text-destructive">{trimError}</p>}
              {(trimmedUrl || job.trimmed_url) && (
                <div className="mt-3">
                  <p className="text-sm text-success">✓ Trimmed — first {job.trimmed_start_seconds ?? trimSeconds}s cut{job.trimmed_duration_sec ? `, new length ${Math.round(job.trimmed_duration_sec)}s` : ""}.</p>
                  <video src={trimmedUrl || job.trimmed_url} controls preload="metadata" className="mt-2 aspect-video w-full rounded-xl bg-black" />
                  <a className="btn btn-ghost mt-2" href={trimmedUrl || job.trimmed_url} download>⬇ Download trimmed video</a>
                </div>
              )}
            </div>
            {/* Upload to YouTube (user, 2026-11-09): title,
                description, tags, privacy and thumbnail, to the
                selected channel. The trimmed video is uploaded
                when one exists, else the final video. */}
            <div className="mt-4 space-y-4 rounded-xl border border-border p-4">
              <p className="font-semibold">Upload to YouTube</p>
              <div>
                <label className="mb-2 block text-sm font-semibold">Title</label>
                <input
                  className="field"
                  value={upTitle || job.title || title}
                  autoComplete="off"
                  onChange={(e) => setUpTitle(e.target.value)}
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold">Description</label>
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Prompt for AI — copy a prompt for Gemini or any AI to write this video's description"
                    onClick={() => void copyText(descPrompt)}
                  >
                    {copied ? "✓ Copied" : "✨ Prompt for AI"}
                  </button>
                </div>
                <textarea
                  className="field w-full text-sm leading-relaxed"
                  rows={4}
                  value={upDesc}
                  autoComplete="off"
                  onChange={(e) => setUpDesc(e.target.value)}
                  placeholder="Write the description, or copy the Prompt for AI into Gemini and paste the result here."
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold">Tags <span className="text-muted-foreground">(comma separated)</span></label>
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Prompt for AI — copy a prompt for Gemini or any AI to suggest tags for this video"
                    onClick={() => void copyText(tagsPrompt)}
                  >
                    {copied ? "✓ Copied" : "✨ Prompt for AI"}
                  </button>
                </div>
                <input
                  className="field"
                  value={upTags}
                  autoComplete="off"
                  onChange={(e) => setUpTags(e.target.value)}
                  placeholder="tag one, tag two, tag three"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-semibold">Privacy</label>
                  <select className="field" value={upPrivacy} onChange={(e) => setUpPrivacy(e.target.value)}>
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-semibold">Channel</label>
                  <input className="field" value={activeChannelTitle || "Default channel"} disabled />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold">Thumbnail <span className="text-muted-foreground">(optional — JPG/PNG)</span></label>
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Prompt for AI — copy a prompt for Gemini or any AI image tool to generate a thumbnail for this video"
                    onClick={() => void copyText(thumbPrompt)}
                  >
                    {copied ? "✓ Copied" : "✨ Prompt for AI"}
                  </button>
                </div>
                <input
                  className="field"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => setUpThumb(e.target.files?.[0] ?? null)}
                />
                {upThumb && <p className="mt-1 text-xs text-muted-foreground">{upThumb.name}</p>}
              </div>
              {upError && <p className="text-sm text-destructive">{upError}</p>}
              <button className="btn btn-primary w-full py-3" disabled={upLoading} onClick={() => void doUpload()}>
                {upLoading ? "Uploading to YouTube…" : "⬆ Upload to YouTube"}
              </button>
              {upResult && (
                <div className="rounded-xl border border-border p-3 text-sm">
                  <p className="text-success">✓ Uploaded ({upResult.privacy_status}).</p>
                  {upResult.url && (
                    <a className="text-primary underline" href={upResult.url} target="_blank" rel="noreferrer">
                      Watch on YouTube
                    </a>
                  )}
                  {upResult.thumbnail_set && <p className="text-success">✓ Thumbnail set.</p>}
                  {upResult.thumbnail_error && <p className="text-destructive">{upResult.thumbnail_error}</p>}
                </div>
              )}
              {job.uploaded_url && !upResult && (
                <p className="text-sm text-muted-foreground">
                  Already uploaded ({job.uploaded_privacy || ""}):{" "}
                  <a className="text-primary underline" href={job.uploaded_url} target="_blank" rel="noreferrer">Watch on YouTube</a>
                </p>
              )}
            </div>
            {/* Mood music + transitions status (2026-11-08): what
                actually got added, so a missing track is never
                silent. "Key rejected" means the Freesound key is
                wrong — press "Test my keys" below to check it. */}
            {(job.mood || job.music_status || job.sfx_status || job.join) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {job.mood ? `Mood: ${job.mood} · ` : ""}
                Music: {job.music_status === "ok" ? "✓ added" : job.music_status === "no_key" ? "✗ no Freesound key" : job.music_status === "key_rejected" ? "✗ Freesound key rejected — press “Test my keys” below" : job.music_status === "no_results" ? "✗ no matching track found" : job.music_status === "unreachable" ? "✗ could not reach Freesound — check connection and try again" : "off"}
                {" · "}Sounds: {job.sfx_status === "ok" ? `✓ ${job.transition_sfx ?? 0} different sounds` : job.sfx_status === "no_key" ? "✗ no Freesound key" : job.sfx_status === "key_rejected" ? "✗ Freesound key rejected — press “Test my keys” below" : job.sfx_status === "no_results" ? "✗ no sounds found" : job.sfx_status === "unreachable" ? "✗ could not reach Freesound — check connection and try again" : "off"}
                {" · "}Transitions: {job.join === "xfade" ? "✓ applied (different style each scene)" : "✗ not applied (fell back to plain join)"}
              </p>
            )}
            {job.script && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Script</summary>
                <p className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">{job.script}</p>
              </details>
            )}
            {/* Collected footage — media bin (user, 2026-11-09):
                like a video editor's media pool: every visual the
                build collected for this video, what kind it is,
                where it came from, and how long it runs. */}
            {job.scenes && job.scenes.length > 0 && (
              <details className="mt-4" open>
                <summary className="cursor-pointer font-semibold">
                  Collected footage — {job.scenes.length} scene(s)
                </summary>
                <div className="mt-2 text-sm text-muted-foreground">
                  {(() => {
                    const bySource: Record<string, number> = {};
                    for (const s of job.scenes) {
                      const key = `${s.kind || "?"} from ${s.visual_source || "?"}`;
                      bySource[key] = (bySource[key] || 0) + 1;
                    }
                    return (
                      <p className="mb-3">
                        {Object.entries(bySource).map(([k, v]) => `${v}× ${k}`).join(" · ")}
                      </p>
                    );
                  })()}
                </div>
                <div className="mt-2 max-h-72 space-y-2 overflow-auto">
                  {job.scenes.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-2">
                      <span className="shrink-0 rounded-lg bg-accent px-2 py-1 text-xs font-semibold">Scene {i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {s.kind === "clip" ? "🎬 Video clip" : s.kind === "image" ? "🖼️ Image" : s.kind === "ai" ? "🤖 AI image" : s.kind === "card" ? "🪧 Title card" : s.kind || "Visual"}
                          {s.visual_source ? ` · ${s.visual_source}` : ""}
                          {s.duration_sec ? ` · ${s.duration_sec}s` : ""}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{s.visual || s.narration || ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <div className="mt-5 flex gap-3">
              {job.download_url && (
                <a className="btn btn-amber flex-1" href={job.download_url} download={`autovideo-${jobId ?? "video"}.mp4`}>⬇ Download MP4</a>
              )}
              <button className="btn btn-ghost" onClick={() => { if (jobKey.current) removeJob(jobKey.current); jobKey.current = null; setJobId(null); setPhase("form"); setJob(null); }}>Make another</button>
            </div>
          </div>
          <SceneList count={sceneCount} current={-1} scenes={job.scenes} done onChange={(i) => openBrowser(i)} activeScene={activeScene} onBrowseAll={() => openBrowser(0)} />
        </div>
        {/* QUICK FOOTAGE BROWSER (user, 2026-11-09): one scene
            at a time — ◀ ▶ arrows (or keyboard Left/Right) flip
            scenes, the preview seeks to that scene, and the
            alternatives below are for THIS scene. Change it
            right here, then flip to the next. */}
        {browserIdx !== null && job?.scenes?.[browserIdx] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setBrowserIdx(null); setBrowserAlts(null); setBrowserError(""); }}>
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">Scene {browserIdx + 1} of {browserTotal}</p>
                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost btn-sm" disabled={browserIdx <= 0} onClick={() => browserNav(-1)}>◀ Prev</button>
                  <button className="btn btn-ghost btn-sm" disabled={browserIdx >= browserTotal - 1} onClick={() => browserNav(1)}>Next ▶</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setBrowserIdx(null); setBrowserAlts(null); setBrowserError(""); }}>✕ Close</button>
                </div>
              </div>
              {/* Current footage: the finished video, seeked to
                  this scene's start. */}
              {job.download_url ? (
                <video key={`${browserIdx}-${videoVersion}`} ref={browserVideoRef} src={`${job.download_url}${job.download_url.includes("?") ? "&" : "?"}v=${videoVersion}`} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black" onLoadedMetadata={() => { const v = browserVideoRef.current; if (v) v.currentTime = sceneStart(browserIdx); }} />
              ) : (
                <div className="aspect-video w-full rounded-xl bg-black" />
              )}
              <p className="mt-3 text-sm">{job.scenes[browserIdx].caption || job.scenes[browserIdx].narration || ""}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {job.scenes[browserIdx].kind || "?"} · {job.scenes[browserIdx].visual_source || "?"} · {job.scenes[browserIdx].duration_sec || "?"}s · starts at {Math.round(sceneStart(browserIdx))}s
              </p>
              {/* Duplicate footage (user, 2026-11-09): scenes
                  sharing the same visual_source (same file,
                  same AI prompt, or same title card) are the
                  "same footage". Show how many, and let him
                  jump to each one to fix them quickly. */}
              {(() => {
                const key = (job.scenes[browserIdx].visual_source || "").trim();
                if (!key) return null;
                const same = (job.scenes || [])
                  .map((s, i) => ({ s, i }))
                  .filter(({ s }) => (s.visual_source || "").trim() === key)
                  .map(({ i }) => i);
                if (same.length < 2) return null;
                return (
                  <p className="mt-2 text-sm text-amber-400">
                    ⚠️ Same footage in {same.length} scenes:{" "}
                    {same.map((i) => (
                      <button key={i} className={`mx-0.5 rounded px-1.5 py-0.5 text-xs font-semibold ${i === browserIdx ? "bg-amber-400 text-black" : "bg-amber-400/20 text-amber-300 hover:bg-amber-400/40"}`} onClick={() => { setBrowserIdx(i); void loadBrowserAlts(i); }}>
                        #{i + 1}
                      </button>
                    ))}
                  </p>
                );
              })()}
              {browserLoading && <p className="mt-3 text-sm text-muted-foreground">Loading alternatives…</p>}
              {browserError && <p className="mt-3 text-sm text-destructive">{browserError}</p>}
              {browserApplying && <p className="mt-3 text-sm text-muted-foreground">Re-rendering the video with the new visual…</p>}
              <div className="mb-3 mt-4 flex flex-wrap items-center gap-2">
                <input className="field min-w-0 flex-1" value={browserQuery} onChange={(e) => setBrowserQuery(e.target.value)} placeholder="Search query for this scene…" />
                <button className="btn btn-primary btn-sm" disabled={browserLoading || !browserQuery.trim()} onClick={() => void loadBrowserAlts(browserIdx, browserQuery)}>🔍 Search</button>
                <button className="btn btn-ghost btn-sm" title="Copy a prompt to generate this scene's footage with an AI tool, then upload it below" onClick={() => void copyBrowserPrompt()}>✨ Prompt for AI</button>
              </div>
              {browserCopied && <p className="mb-3 text-sm text-emerald-400">{browserCopied}</p>}
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">Or upload your own:</p>
                <input type="file" accept="video/*,image/*" className="text-sm" onChange={(e) => setBrowserUploadFile(e.target.files?.[0] || null)} />
                <button className="btn btn-primary btn-sm" disabled={browserApplying || !browserUploadFile} onClick={() => void uploadBrowserVisual()}>
                  {browserApplying ? "Applying…" : "Upload & use"}
                </button>
                {browserUploadFile && <span className="text-xs text-muted-foreground">{browserUploadFile.name}</span>}
              </div>
              {browserAlts && (
                <>
                  {browserAlts.clips.length > 0 && (
                    <>
                      <p className="mb-2 text-sm font-semibold">🎬 Video clips</p>
                      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {browserAlts.clips.map((c, i) => (
                          <button key={`c${i}`} className="overflow-hidden rounded-xl border border-border text-left hover:border-primary" disabled={browserApplying} onClick={() => void applyBrowserVisual(c.url, "clip")}>
                            {c.thumb ? (
                              <img src={c.thumb} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                            ) : (
                              <video src={c.url} muted preload="metadata" className="aspect-video w-full object-cover" />
                            )}
                            <p className="truncate px-2 py-1 text-xs text-muted-foreground">{c.title || c.source}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {browserAlts.images.length > 0 && (
                    <>
                      <p className="mb-2 text-sm font-semibold">🖼️ Images</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {browserAlts.images.map((im, i) => (
                          <button key={`i${i}`} className="overflow-hidden rounded-xl border border-border text-left hover:border-primary" disabled={browserApplying} onClick={() => void applyBrowserVisual(im.url, "image")}>
                            <img src={im.thumb || im.url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                            <p className="truncate px-2 py-1 text-xs text-muted-foreground">{im.title || im.source}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {browserAlts.clips.length === 0 && browserAlts.images.length === 0 && (
                    <p className="text-sm text-muted-foreground">No alternatives found for this scene. Try a different search above, or generate the footage with AI (✨ Prompt for AI) and upload it.</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

function SceneList({ count, current, scenes, done, onChange, activeScene, onBrowseAll }: { count: number; current: number; scenes?: AvScene[] | undefined; done: boolean; onChange?: (idx: number) => void; activeScene?: number; onBrowseAll?: () => void }) {
  const listRef = useRef<HTMLDivElement | null>(null);
  // Scene sync (user, 2026-11-09): when the video reaches a
  // scene, scroll that row into view in the panel.
  useEffect(() => {
    if (activeScene === undefined || activeScene < 0) return;
    const el = listRef.current?.querySelector(`[data-scene-row="${activeScene}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeScene]);
  return (
    <div ref={listRef} className="glass max-h-[640px] min-w-0 overflow-auto p-4">
      <div className="mb-3 flex items-center justify-between px-2">
        <h3 className="font-semibold">Scenes</h3>
        {done && onBrowseAll && (
          <button className="btn btn-primary btn-sm" title="Flip through every scene's footage and fix any scene" onClick={onBrowseAll}>
            🎬 Browse all
          </button>
        )}
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => {
          const s = scenes?.[i];
          const isDone = done || i < current;
          const active = !done && i === current;
          const playing = done && activeScene === i;
          const line = s?.caption || s?.narration || lines[i % lines.length];
          // Duplicate footage badge (user, 2026-11-09): how many
          // scenes share this scene's footage.
          const dupCount = s?.visual_source
            ? (scenes || []).filter((o) => (o.visual_source || "").trim() === (s.visual_source || "").trim()).length
            : 0;
          return (
            <div key={i} data-scene-row={i} className={`flex items-center gap-3 rounded-xl p-2 ${playing ? "bg-primary/20 ring-1 ring-primary" : active ? "bg-accent" : ""}`}>
              <img src={imgs[i % 3]} alt="" className={`h-12 w-20 rounded-lg object-cover ${isDone || active ? "" : "opacity-30 grayscale"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Scene {i + 1}{s?.kind ? ` · ${s.kind}` : ""}{s?.visual_source ? ` · ${s.visual_source}` : ""}{s?.duration_sec ? ` · ${s.duration_sec}s` : ""}{dupCount > 1 ? ` · ⚠️ ×${dupCount} same` : ""}</div>
                <div className="truncate text-xs text-muted-foreground">{line}</div>
              </div>
              {done && onChange && (
                <button className="btn btn-ghost btn-sm shrink-0" title="Change this scene's clip or image" onClick={() => onChange(i)}>
                  🔄 Change
                </button>
              )}
              <span className="text-sm">{playing ? "▶" : isDone ? "✓" : active ? "⏳" : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
