import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { CoverStage, defaultRect, type CoverSize, type Rect } from "@/components/CoverStage";
import { FxControls, fxSummary } from "@/components/FxControls";
import { defaultPreset, profileFromPreset, useApp } from "@/lib/app-store";
import {
  ApiError,
  autoVideo,
  clampPanForBackend,
  connectYoutubeFlow,
  createGroup,
  deleteCover,
  detectGreen,
  downloadVideo,
  generateMetadata,
  getGroup,
  getJob,
  listCovers,
  listGroups,
  pitchToFactor,
  processVideo,
  putSettings,
  rectPctToPx,
  rectPxToPct,
  retryGroup,
  uploadProgress,
  uploadYoutube,
  uploadCover,
  videoInfo,
  youtubeStatus,
  type Cover,
  type Group,
  type GroupListItem,
  type Job,
} from "@/lib/api";

export const Route = createFileRoute("/cover")({
  component: Cover,
});

type Fx = typeof defaultPreset;
const STEPS = ["Download", "Cover", "Live edit", "Download final"];
const AUTO_STAGES: Record<string, string> = {
  downloading: "Downloading video from YouTube…",
  applying: "Applying cover, green shape, speed and voice…",
  compressing: "Compressing the finished video (smaller file, same look)…",
  preview: "Building the preview…",
  done: "Done — your finished video is ready.",
  failed: "Auto failed.",
};

function fmtDur(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return "";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function Cover() {
  const { presets, activePresetId, settings, refreshSettings, jobs, registerJob, updateJob, removeJob, activeChannelId } = useApp();
  const [mode, setMode] = useState<"wizard" | "auto" | "group">("wizard");
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [dl, setDl] = useState<number | null>(null);
  const [dlStage, setDlStage] = useState("");
  const [dlError, setDlError] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [video, setVideo] = useState<null | { title: string; dur: string; size: string; thumb?: string }>(null);
  const [covers, setCovers] = useState<Cover[]>([]);
  const [coversError, setCoversError] = useState("");
  const [coverObj, setCoverObj] = useState<Cover | null>(null);
  const [coverNatural, setCoverNatural] = useState<CoverSize | null>(null);
  const [rectPx, setRectPx] = useState<Rect | null>(null);
  const [detected, setDetected] = useState(false);
  // True only when the green area was actually auto-detected.
  // `detected` is also true for the manual fallback rectangle
  // (so the user can still proceed to Live edit), but the
  // "Green area found" badge must not claim a detection that
  // failed (2026-11-08: the badge showed ✓ even when the
  // message said "No green area found").
  const [greenFound, setGreenFound] = useState(false);
  const [detectMsg, setDetectMsg] = useState("");
  const [rect, setRect] = useState<Rect>(defaultRect);
  const [fx, setFx] = useState<Fx>(defaultPreset);
  const [renderFx, setRenderFx] = useState<Fx | null>(null);
  const [render, setRender] = useState<number | null>(null);
  const [renderError, setRenderError] = useState("");
  const [finalJob, setFinalJob] = useState<Job | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [saved, setSaved] = useState(false);
  const [presetMsg, setPresetMsg] = useState("");
  const [videoError, setVideoError] = useState(false);
  // Auto mode
  const [autoProgress, setAutoProgress] = useState<number | null>(null);
  const [autoStage, setAutoStage] = useState("");
  const [autoError, setAutoError] = useState("");
  const [autoSummary, setAutoSummary] = useState<Job["auto_summary"] | null>(null);
  const [autoTimeline, setAutoTimeline] = useState<Job["timeline"]>([]);
  // Group mode (back after the theme merge dropped it — user,
  // 2026-11-07): many links, one preset + upload choice each,
  // processed one after another by /api/groups.
  type GroupRow = { url: string; title: string; preset_name: string | null; upload: string };
  const [groupUrls, setGroupUrls] = useState("");
  const [groupRows, setGroupRows] = useState<GroupRow[]>([]);
  const [groupName, setGroupName] = useState("Group 1");
  const [group, setGroup] = useState<Group | null>(null);
  const [groupError, setGroupError] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupMsg, setGroupMsg] = useState("");
  const [ytConnected, setYtConnected] = useState<boolean | null>(null);
  const [pastGroups, setPastGroups] = useState<GroupListItem[]>([]);
  // Upload to YouTube (user, 2026-11-07): Tool 1 had no step after
  // Download Final to publish the video. This fills the upload
  // form from generated metadata and posts to /api/upload-youtube.
  const [ytTitle, setYtTitle] = useState("");
  const [ytDesc, setYtDesc] = useState("");
  const [ytTags, setYtTags] = useState("");
  const [ytPrivacy, setYtPrivacy] = useState("private");
  const [ytChannelId, setYtChannelId] = useState("");
  const [ytChannels, setYtChannels] = useState<{ id: string; title: string }[]>([]);
  const [ytMetaLoaded, setYtMetaLoaded] = useState(false);
  const [upProgress, setUpProgress] = useState<number | null>(null);
  const [upError, setUpError] = useState("");
  const [upResult, setUpResult] = useState<{ video_id?: string; url?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dlTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const procTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const groupTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (dlTimer.current) clearInterval(dlTimer.current);
    if (procTimer.current) clearInterval(procTimer.current);
    if (autoTimer.current) clearInterval(autoTimer.current);
    if (groupTimer.current) clearInterval(groupTimer.current);
    if (uploadTimer.current) clearInterval(uploadTimer.current);
  }, []);

  // Group mode: check YouTube + past batches when it is opened.
  useEffect(() => {
    if (mode !== "group") return;
    youtubeStatus().then((s) => { setYtConnected(s.connected); setYtChannels(s.channels ?? []); }).catch(() => setYtConnected(false));
    listGroups().then(setPastGroups).catch(() => setPastGroups([]));
  }, [mode]);

  // Upload form: once the final video is ready (Step 3), fill the
  // title/description/tags from generated metadata and fetch the
  // connected YouTube channels, so Upload is one click away.
  useEffect(() => {
    if (step !== 3 || !jobId || ytMetaLoaded) return;
    setYtMetaLoaded(true);
    generateMetadata(jobId, 0)
      .then((gen) => {
        setYtTitle(gen.generated_title || "");
        setYtDesc(gen.generated_description || "");
        setYtTags((gen.generated_tags || []).join(", "));
      })
      .catch(() => {
        setYtTitle(finalJob?.original_title || "");
        setYtDesc(finalJob?.original_description || "");
        setYtTags((finalJob?.original_tags || []).join(", "));
      });
    youtubeStatus().then((s) => { setYtConnected(s.connected); setYtChannels(s.channels ?? []); }).catch(() => setYtConnected(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, jobId]);

  // Upload targets the channel picked in the TopBar switcher. When the
  // channels load (or the picked channel changes), default the upload
  // dropdown to it; the user can still pick another channel here.
  useEffect(() => {
    if (activeChannelId && ytChannels.some((c) => c.id === activeChannelId)) {
      setYtChannelId(activeChannelId);
    }
  }, [ytChannels, activeChannelId]);

  // Load the real cover library once.
  useEffect(() => {
    listCovers()
      .then((list) => {
        setCovers(list);
        if (list.length) selectCover(list[0]!);
      })
      .catch((e) => setCoversError(e instanceof Error ? e.message : "Could not load covers."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pixel rect -> % rect once the cover's natural size is known.
  useEffect(() => {
    if (rectPx && coverNatural) setRect(rectPxToPct(rectPx, coverNatural.w, coverNatural.h));
  }, [rectPx, coverNatural]);

  // Green mask + process both need the pixel rect of the CURRENT % rect.
  const maskRectPx: Rect | null = coverNatural
    ? rectPctToPx(rect, coverNatural.w, coverNatural.h)
    : rectPx;

  const selectCover = async (cover: Cover | null) => {
    setCoverObj(cover);
    setCoverNatural(null);
    setRectPx(null);
    setDetected(false);
    setGreenFound(false);
    setDetectMsg("");
    if (!cover) return;
    try {
      const px = await detectGreen(cover.id);
      setRectPx(px);
      setDetected(true);
      setGreenFound(true);
      setDetectMsg(`Green area auto-detected: ${px.x},${px.y} ${px.w}x${px.h} — video will fill exactly this area.`);
    } catch (e) {
      // No green area: fall back to the manual rectangle and let the
      // user adjust it in Live edit, instead of blocking the flow.
      setRectPx({ x: 0, y: 0, w: 640, h: 360 });
      setDetected(true);
      setGreenFound(false);
      setDetectMsg("No green area found in this cover — using the manual rectangle. Adjust it in Live edit.");
    }
  };

  const refreshCovers = async (selectId?: string) => {
    try {
      const list = await listCovers();
      setCovers(list);
      const pick = list.find((c) => c.id === selectId) ?? coverObj ?? list[0] ?? null;
      if (pick && (!coverObj || pick.id !== coverObj.id)) await selectCover(pick);
    } catch (e) {
      setCoversError(e instanceof Error ? e.message : "Could not load covers.");
    }
  };

  const onUploadFile = async (file: File | undefined) => {
    if (!file) return;
    setCoversError("");
    try {
      const created = await uploadCover(file);
      await refreshCovers(created.id);
    } catch (e) {
      setCoversError(e instanceof Error ? e.message : "Cover upload failed.");
    }
  };

  const onDeleteCover = async (id: string) => {
    try {
      await deleteCover(id);
      if (coverObj?.id === id) setCoverObj(null);
      await refreshCovers();
    } catch (e) {
      setCoversError(e instanceof Error ? e.message : "Cover delete failed.");
    }
  };

  const loadVideoMeta = (id: string) => {
    fetch(`/api/source/${id}`, { method: "HEAD" })
      .then((r) => {
        const len = Number(r.headers.get("content-length") || 0);
        if (len) setVideo((v) => (v ? { ...v, size: `${(len / 1048576).toFixed(1)} MB` } : v));
      })
      .catch(() => {});
    const el = document.createElement("video");
    el.preload = "metadata";
    el.src = `/api/source/${id}`;
    el.onloadedmetadata = () => setVideo((v) => (v ? { ...v, dur: fmtDur(el.duration) } : v));
  };

  const startDownload = async () => {
    if (!url.trim()) { setDlError("Paste a YouTube link first."); return; }
    setDlError("");
    setDl(0);
    setDlStage("info");
    setVideo(null);
    try {
      const data = await downloadVideo(url.trim());
      setJobId(data.job_id);
      if (dlTimer.current) clearInterval(dlTimer.current);
      dlTimer.current = setInterval(async () => {
        try {
          const job = await getJob(data.job_id);
          setDl(job.progress ?? 0);
          if (job.stage) setDlStage(job.stage);
          if (job.status === "downloaded") {
            if (dlTimer.current) clearInterval(dlTimer.current);
            setDl(null);
            setVideo({ title: job.original_title || "Downloaded video", dur: "", size: "", thumb: job.original_thumbnail || "" });
            loadVideoMeta(data.job_id);
          } else if (job.status === "failed") {
            if (dlTimer.current) clearInterval(dlTimer.current);
            setDl(null);
            setDlError("Download failed: " + (job.error || "unknown error"));
          }
        } catch (e) {
          if (dlTimer.current) clearInterval(dlTimer.current);
          setDl(null);
          setDlError("Download progress check failed: " + (e instanceof Error ? e.message : "unknown error"));
        }
      }, 1000);
    } catch (e) {
      setDl(null);
      setDlError("Download failed: " + (e instanceof Error ? e.message : "unknown error"));
    }
  };

  const doRender = async (useFx: Fx, then?: () => void) => {
    if (!jobId) { setRenderError("Download a video first."); return; }
    if (!coverObj) { setRenderError("Choose a cover first."); return; }
    setRenderError("");
    setRender(0);
    const { panX, panY } = clampPanForBackend(useFx.panX, useFx.panY, useFx.zoom);
    const greenRect = maskRectPx ?? { x: 0, y: 0, w: 640, h: 360 };
    try {
      const data = await processVideo({
        job_id: jobId,
        cover_id: coverObj.id,
        flip: useFx.flip,
        speed: useFx.speed,
        voice_pitch: pitchToFactor(useFx.pitch),
        compress: true,
        zoom: useFx.zoom,
        pan_x: panX,
        pan_y: panY,
        green_rect: greenRect,
        fit_mode: useFx.fit,
      });
      if (procTimer.current) clearInterval(procTimer.current);
      procTimer.current = setInterval(async () => {
        try {
          const job = await getJob(jobId);
          setRender(job.process_progress ?? 0);
          setFinalJob(job);
          if (job.status === "processed") {
            if (procTimer.current) clearInterval(procTimer.current);
            setRenderFx(useFx);
            setRender(null);
            setPreviewUrl(data.preview_url + "?t=" + Date.now());
            setFinalUrl(data.download_url);
            then?.();
          } else if (job.status === "failed") {
            if (procTimer.current) clearInterval(procTimer.current);
            setRender(null);
            setRenderError("Processing failed: " + (job.error || "unknown error"));
          }
        } catch (e) {
          if (procTimer.current) clearInterval(procTimer.current);
          setRender(null);
          setRenderError("Processing progress check failed: " + (e instanceof Error ? e.message : "unknown error"));
        }
      }, 1000);
    } catch (e) {
      setRender(null);
      setRenderError(
        e instanceof ApiError && e.status === 402
          ? "Not enough credits — activate a license key or top up."
          : "Processing failed: " + (e instanceof Error ? e.message : "unknown error"),
      );
    }
  };

  const stale = renderFx && JSON.stringify(renderFx) !== JSON.stringify(fx);

  // Auto-mode poller, shared by a fresh run and by restoring a
  // background job (user left the page and came back via the
  // top progress bar). `pfx` is the preset used for the run;
  // on restore it is the current preset, which only affects
  // the final preview's FX summary, not the finished video.
  const coverJobKey = useRef<string | null>(null);
  const pollAuto = (jobId: string, pfx: Fx) => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    autoTimer.current = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        setAutoProgress(job.auto_progress ?? 0);
        setAutoStage(AUTO_STAGES[job.auto_stage ?? ""] || job.auto_stage || "Working…");
        setAutoTimeline(job.timeline || []);
        setFinalJob(job);
        if (coverJobKey.current) {
          updateJob(coverJobKey.current, {
            progress: job.auto_progress ?? job.progress ?? 0,
            stage: AUTO_STAGES[job.auto_stage ?? ""] || job.auto_stage || job.stage || "",
            status: job.status === "processed" ? "done" : job.status === "failed" ? "failed" : "running",
          });
        }
        if (job.status === "processed" && job.auto_summary) {
          if (autoTimer.current) clearInterval(autoTimer.current);
          setAutoSummary(job.auto_summary);
          setAutoProgress(null);
          setRenderFx(pfx);
          setPreviewUrl(`/api/preview/${jobId}?t=${Date.now()}`);
          setFinalUrl(`/api/download/${jobId}`);
          setStep(3);
          setMode("wizard");
        } else if (job.status === "failed") {
          if (autoTimer.current) clearInterval(autoTimer.current);
          setAutoProgress(null);
          setAutoError("Auto failed: " + (job.error || "unknown error"));
        }
      } catch (e) {
        if (autoTimer.current) clearInterval(autoTimer.current);
        setAutoProgress(null);
        setAutoError("Auto progress check failed: " + (e instanceof Error ? e.message : "unknown error"));
      }
    }, 1000);
  };

  // Restore a cover auto job that is still running in the
  // background (see ActiveJob in app-store). The backend job
  // kept running while the user was away.
  useEffect(() => {
    const active = jobs.find((j) => j.tool === "cover" && j.status === "running");
    if (!active) return;
    coverJobKey.current = active.key;
    setJobId(active.jobId);
    setMode("auto");
    setAutoProgress(active.progress ?? 0);
    setAutoStage(active.stage || "Working…");
    const p = presets.find((x) => x.id === activePresetId);
    const pfx: Fx = p
      ? { flip: p.flip, speed: p.speed, zoom: p.zoom, panX: p.panX, panY: p.panY, fit: p.fit, voice: p.voice, pitch: p.pitch }
      : defaultPreset;
    pollAuto(active.jobId, pfx);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAuto = async () => {
    if (!url.trim()) { setAutoError("Paste a YouTube link for Auto mode first."); return; }
    setAutoError("");
    setAutoSummary(null);
    setAutoTimeline([]);
    const p = presets.find((x) => x.id === activePresetId);
    const pfx: Fx = p
      ? { flip: p.flip, speed: p.speed, zoom: p.zoom, panX: p.panX, panY: p.panY, fit: p.fit, voice: p.voice, pitch: p.pitch }
      : defaultPreset;
    setFx(pfx);
    if (!coverObj && covers.length) setCoverObj(covers[0]!);
    setAutoProgress(0);
    setAutoStage("Starting…");
    try {
      const data = await autoVideo(url.trim(), coverObj?.id ?? covers[0]?.id ?? null);
      setJobId(data.job_id);
      // Background job: the build keeps running if the user
      // leaves this page, and the top bar shows its progress.
      const key = `cover:${data.job_id}`;
      coverJobKey.current = key;
      registerJob({ key, tool: "cover", title: url.trim(), route: "/cover", jobId: data.job_id });
      pollAuto(data.job_id, pfx);
    } catch (e) {
      setAutoProgress(null);
      setAutoError(
        e instanceof ApiError && e.status === 402
          ? "Not enough credits — activate a license key or top up."
          : "Auto failed to start: " + (e instanceof Error ? e.message : "unknown error"),
      );
    }
  };

  const pollGroup = (groupId: string) => {
    if (groupTimer.current) clearInterval(groupTimer.current);
    groupTimer.current = setInterval(async () => {
      try {
        const g = await getGroup(groupId);
        setGroup(g);
        if (g.status !== "running") {
          if (groupTimer.current) clearInterval(groupTimer.current);
          const done = g.items.filter((it) => it.status === "done_local" || it.status === "uploaded").length;
          const failed = g.items.filter((it) => it.status === "failed" || it.status === "failed_upload").length;
          setGroupMsg(`Group "${g.name}" done — ${done} ready, ${failed} failed.`);
          listGroups().then(setPastGroups).catch(() => undefined);
        }
      } catch (e) {
        if (groupTimer.current) clearInterval(groupTimer.current);
        setGroupError("Group progress check failed: " + (e instanceof Error ? e.message : "unknown error"));
      }
    }, 2000);
  };

  const buildGroupList = async () => {
    const urls = groupUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) { setGroupError("Paste at least one link first."); return; }
    setGroupError("");
    setGroupMsg("");
    setGroup(null);
    const rows: GroupRow[] = urls.map((u) => ({ url: u, title: "", preset_name: null, upload: "skip" }));
    setGroupRows(rows);
    // Titles load in the background, one per link, so Build list
    // never waits; if a title cannot be fetched, the URL is shown.
    urls.forEach((u, i) => {
      videoInfo(u)
        .then((info) => {
          const t = (info.title || "").trim();
          setGroupRows((prev) => prev.map((r, j) => (j === i ? { ...r, title: t || u } : r)));
        })
        .catch(() => {
          setGroupRows((prev) => prev.map((r, j) => (j === i ? { ...r, title: u } : r)));
        });
    });
    setGroupMsg(`${urls.length} video(s) ready. Choose a preset and upload choice for each, then start.`);
  };

  const runGroup = async () => {
    if (!groupRows.length) { setGroupError("Build the list first."); return; }
    setGroupError("");
    setGroupMsg("");
    setGroupBusy(true);
    try {
      const coverId = coverObj?.id ?? covers[0]?.id ?? null;
      const g = await createGroup(groupName.trim() || "Group 1", groupRows.map((r) => ({
        url: r.url,
        preset_name: r.preset_name,
        cover_id: coverId,
        upload: r.upload,
      })));
      setGroup(g);
      setGroupMsg(`Group "${g.name}" started. It will work through all videos by itself.` + (ytConnected ? "" : " YouTube is not connected, so videos will be saved locally only."));
      pollGroup(g.id);
    } catch (e) {
      setGroupError(
        e instanceof ApiError && e.status === 402
          ? "Not enough credits — activate a license key or top up."
          : "Group failed to start: " + (e instanceof Error ? e.message : "unknown error"),
      );
    } finally {
      setGroupBusy(false);
    }
  };

  const retryGroupRun = async () => {
    if (!group) return;
    setGroupError("");
    setGroupMsg("");
    try {
      const g = await retryGroup(group.id);
      setGroup(g);
      setGroupMsg(g.message || `Retrying failed videos in group "${g.name}".`);
      if (g.status === "running") pollGroup(g.id);
    } catch (e) {
      setGroupError("Retry failed: " + (e instanceof Error ? e.message : "unknown error"));
    }
  };

  const openGroup = async (groupId: string) => {
    setGroupError("");
    setGroupMsg("");
    try {
      const g = await getGroup(groupId);
      setGroup(g);
      setGroupRows([]);
      if (g.status === "running") pollGroup(g.id);
    } catch (e) {
      setGroupError("Could not open that group: " + (e instanceof Error ? e.message : "unknown error"));
    }
  };

  const connectYtHere = async () => {
    setUpError("");
    try {
      const ok = await connectYoutubeFlow();
      if (ok) {
        const s = await youtubeStatus();
        setYtConnected(s.connected);
        setYtChannels(s.channels ?? []);
      } else {
        setUpError("Sign-in did not finish. Try again.");
      }
    } catch (e) {
      setUpError(e instanceof Error ? e.message : "Could not start the YouTube sign-in.");
    }
  };

  const doUpload = async () => {
    if (!jobId) { setUpError("Process a video first."); return; }
    if (!ytTitle.trim()) { setUpError("Enter a video title first."); return; }
    setUpError("");
    setUpResult(null);
    setUpProgress(0);
    if (uploadTimer.current) clearInterval(uploadTimer.current);
    uploadTimer.current = setInterval(async () => {
      try {
        const p = await uploadProgress(jobId);
        if (typeof p.percent === "number") setUpProgress(p.percent);
      } catch {
        // Keep the upload itself running; the bar just stalls.
      }
    }, 1000);
    try {
      const data = await uploadYoutube({
        job_id: jobId,
        title: ytTitle.trim(),
        description: ytDesc,
        tags: ytTags,
        privacy_status: ytPrivacy,
        channel_id: ytChannelId,
      });
      if (uploadTimer.current) clearInterval(uploadTimer.current);
      setUpProgress(100);
      setUpResult({
        ...(data.video_id ? { video_id: data.video_id } : {}),
        ...(data.url ? { url: data.url } : {}),
      });
    } catch (e) {
      if (uploadTimer.current) clearInterval(uploadTimer.current);
      setUpProgress(null);
      setUpError("YouTube upload failed: " + (e instanceof Error ? e.message : "unknown error"));
    }
  };

  const saveJobPreset = async () => {
    const name = presetName.trim();
    if (!name || !renderFx) return;
    setPresetMsg("");
    try {
      const base = ((settings?.profiles || {})[name] || {}) as Record<string, unknown>;
      const profile = {
        ...profileFromPreset({ id: name, name, ...renderFx }, base),
        // The saved green area is used as-is: auto-detect off, or the
        // next video would re-detect and ignore this rectangle.
        green_rect: maskRectPx ?? base["green_rect"] ?? { x: 0, y: 0, w: 640, h: 360 },
        auto_detect_green: false,
        encoder: settings?.encoder ?? base["encoder"] ?? "libx265",
        crf: settings?.crf ?? base["crf"] ?? 22,
        preset: settings?.preset ?? base["preset"] ?? "fast",
      };
      const profiles = { ...((settings?.profiles || {}) as Record<string, Record<string, unknown>>), [name]: profile };
      await putSettings({ profiles });
      await refreshSettings();
      setSaved(true);
      setPresetMsg(`Preset "${name}" saved — open it in Presets to set it as Active.`);
      setPresetName("");
    } catch (e) {
      setPresetMsg("Save failed: " + (e instanceof Error ? e.message : "unknown error"));
    }
  };

  return (
    <div>
      <PageHeader icon="🖼️" title="Cover Video Generator" sub="Your video, inside your cover. Four simple steps." />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="seg">
          <button data-on={mode === "wizard"} onClick={() => setMode("wizard")}>Step by step</button>
          <button data-on={mode === "auto"} onClick={() => setMode("auto")}>⚡ Auto mode</button>
          <button data-on={mode === "group"} onClick={() => setMode("group")}>👥 Group mode</button>
        </div>
        <Link to="/presets" className="btn btn-ghost btn-sm ml-auto">⚙ Manage presets</Link>
      </div>

      {mode === "auto" ? (
        <div className="glass mx-auto max-w-2xl space-y-5 p-8">
          <h2 className="text-2xl font-bold">One click: link + cover = done</h2>
          <input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube link" />
          <div className="grid grid-cols-3 gap-3">
            {covers.map((c) => (
              <button key={c.id} onClick={() => setCoverObj(c)} className={`overflow-hidden rounded-xl border-2 ${coverObj?.id === c.id ? "border-primary" : "border-transparent"}`}>
                {c.is_video ? (
                  <video src={c.path} muted preload="metadata" playsInline className="aspect-video w-full object-cover" />
                ) : (
                  <img src={c.path} alt={c.display_name} className="aspect-video w-full object-cover" />
                )}
                <div className="p-2 text-left text-sm">{c.display_name}{c.is_video ? " (video)" : ""}</div>
              </button>
            ))}
          </div>
          {covers.length === 0 && <p className="text-sm text-muted-foreground">No covers yet — upload one in Step by step mode first, or Auto will use the newest cover once one exists.</p>}
          <p className="text-sm text-muted-foreground">Uses active preset: <b className="text-foreground">{presets.find((p) => p.id === activePresetId)?.name ?? "Default"}</b></p>
          <button className="btn btn-amber w-full py-4 text-lg" disabled={autoProgress !== null || !url.trim()} onClick={runAuto}>
            {autoProgress !== null ? `${autoStage} ${Math.round(autoProgress)}%` : "⚡ Make it now"}
          </button>
          {autoProgress !== null && <div className="bar"><div style={{ width: `${autoProgress}%` }} /></div>}
          {(autoTimeline ?? []).length > 0 && (
            <div className="space-y-1 text-sm">
              {(autoTimeline ?? []).map((t, i) => (
                <div key={i}>✓ {t.step} — {t.duration_sec}s{t.detail ? ` — ${t.detail}` : ""}</div>
              ))}
            </div>
          )}
          {autoSummary && (
            <div className="rounded-xl border border-border p-4 text-sm">
              <b>Summary</b><br />
              Downloaded video: <b>{autoSummary.downloaded_mb} MB</b><br />
              After cover, voice, speed and shape: <b>{autoSummary.applied_mb} MB</b><br />
              After compression ({autoSummary.encoder}, CRF {autoSummary.crf}): <b>{autoSummary.final_mb} MB</b><br />
              Saved by compression: <b>{autoSummary.saved_mb} MB ({autoSummary.saved_pct}%)</b>
              <div className="mt-3 flex gap-3">
                {finalUrl && <a className="btn btn-amber flex-1" href={finalUrl} download>⬇ Download video</a>}
                <button className="btn btn-ghost" onClick={() => { setMode("wizard"); setStep(3); }}>See final →</button>
              </div>
            </div>
          )}
          {autoError && <p className="text-sm text-destructive">{autoError}</p>}
        </div>
      ) : mode === "group" ? (
        <div className="glass mx-auto max-w-2xl space-y-5 p-8">
          <h2 className="text-2xl font-bold">Group mode: many links, one go</h2>
          <p className="text-sm text-muted-foreground">Paste YouTube links, one per line. Every video gets the cover below and its own preset + upload choice, then they are made one after another by themselves.</p>
          <div className="grid grid-cols-3 gap-3">
            {covers.map((c) => (
              <button key={c.id} onClick={() => setCoverObj(c)} className={`overflow-hidden rounded-xl border-2 ${coverObj?.id === c.id ? "border-primary" : "border-transparent"}`}>
                {c.is_video ? (
                  <video src={c.path} muted preload="metadata" playsInline className="aspect-video w-full object-cover" />
                ) : (
                  <img src={c.path} alt={c.display_name} className="aspect-video w-full object-cover" />
                )}
                <div className="p-2 text-left text-sm">{c.display_name}{c.is_video ? " (video)" : ""}</div>
              </button>
            ))}
          </div>
          {covers.length === 0 && <p className="text-sm text-muted-foreground">No covers yet — upload one in Step by step mode first, or the group will use the default cover.</p>}
          <input className="field" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" />
          <textarea className="field min-h-32" value={groupUrls} onChange={(e) => setGroupUrls(e.target.value)} placeholder={"Paste YouTube links, one per line\nhttps://youtube.com/watch?v=…\nhttps://youtube.com/watch?v=…"} />
          <button className="btn btn-primary w-full py-3" onClick={() => void buildGroupList()}>📋 Build list</button>
          {groupRows.length > 0 && (
            <div className="space-y-3">
              {groupRows.map((r, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="truncate text-sm font-semibold" title={r.url}>Video {i + 1}: {r.title || "Loading title…"}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select className="field flex-1" value={r.preset_name ?? ""} onChange={(e) => setGroupRows((prev) => prev.map((x, j) => (j === i ? { ...x, preset_name: e.target.value || null } : x)))}>
                      <option value="">Active preset{activePresetId ? ` (${activePresetId})` : ""}</option>
                      {presets.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                    <select className="field flex-1" value={r.upload} onChange={(e) => setGroupRows((prev) => prev.map((x, j) => (j === i ? { ...x, upload: e.target.value } : x)))}>
                      <option value="skip">Do not upload — save locally</option>
                      {ytConnected && (
                        <>
                          <option value="public">Upload — Public</option>
                          <option value="private">Upload — Private</option>
                          <option value="unlisted">Upload — Unlisted (link only)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
          {ytConnected === false && <p className="text-sm text-muted-foreground">YouTube is not connected, so videos will be saved locally only. Connect it in Home → Channel Setup Wizard → Step 4.</p>}
          {groupRows.length > 0 && (
            <button className="btn btn-amber w-full py-4 text-lg" disabled={groupBusy || group?.status === "running"} onClick={() => void runGroup()}>
              {group?.status === "running" ? "Working through the group…" : `⚡ Make all ${groupRows.length} video(s)`}
            </button>
          )}
          {groupMsg && <p className="text-sm text-muted-foreground">{groupMsg}</p>}
          {groupError && <p className="text-sm text-destructive">{groupError}</p>}
          {group && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <b>{group.name}</b>
                <span className="text-muted-foreground">{group.items.filter((it) => it.status === "done_local" || it.status === "uploaded").length} / {group.items.length} done{group.eta_sec ? ` — about ${Math.round(group.eta_sec / 60)} min left` : ""}</span>
              </div>
              {group.items.map((it, i) => (
                <div key={i} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-semibold" title={it.url}>{it.title || it.url}</span>
                    <span className="shrink-0 text-muted-foreground">{it.status === "done_local" ? "✓ Saved locally" : it.status === "uploaded" ? "✓ Uploaded" : it.status === "processing" ? "Working…" : it.status === "waiting" ? "Waiting" : "✗ Failed"}</span>
                  </div>
                  {it.status === "processing" && typeof it.progress === "number" && (
                    <div className="bar mt-2"><div style={{ width: `${it.progress}%` }} /></div>
                  )}
                  {it.stage && it.status === "processing" && <div className="mt-1 text-xs text-muted-foreground">{it.stage}</div>}
                  {it.error && <div className="mt-1 text-xs text-destructive">{it.error}</div>}
                  {(it.download_url || it.youtube_url) && (
                    <div className="mt-2 flex gap-3">
                      {it.download_url && <a className="btn btn-ghost btn-sm" href={it.download_url} download>⬇ Download video</a>}
                      {it.youtube_url && <a className="btn btn-ghost btn-sm" href={it.youtube_url} target="_blank" rel="noreferrer">▶ Watch on YouTube</a>}
                    </div>
                  )}
                </div>
              ))}
              {group.items.some((it) => it.status === "failed" || it.status === "failed_upload") && group.status !== "running" && (
                <button className="btn btn-primary w-full" onClick={() => void retryGroupRun()}>↻ Retry failed videos</button>
              )}
            </div>
          )}
          {pastGroups.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Past groups</h3>
              {pastGroups.map((g) => (
                <button key={g.id} className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left text-sm hover:border-primary" onClick={() => void openGroup(g.id)}>
                  <span>{g.name}</span>
                  <span className="text-muted-foreground">{g.done} / {g.total} done — {g.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <ol className="mb-8 grid grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${i < step ? "btn-amber p-0" : i === step ? "btn-primary p-0" : "bg-secondary text-muted-foreground"}`}>{i < step ? "✓" : i + 1}</span>
                <span className={`hidden font-semibold md:block ${i === step ? "" : "text-muted-foreground"}`}>{s}</span>
                {i < 3 && <span className="hidden h-px flex-1 bg-border md:block" />}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <div className="glass mx-auto max-w-2xl space-y-5 p-8">
              <h2 className="text-2xl font-bold">Paste a YouTube link</h2>
              <input className="field text-lg" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
              {!video && (
                <button className="btn btn-primary w-full py-4 text-lg" disabled={!url.trim() || dl !== null} onClick={startDownload}>
                  {dl !== null ? (dlStage === "info" ? "Getting video info…" : `Downloading… ${Math.round(dl)}%`) : "⬇ Download video"}
                </button>
              )}
              {dl !== null && <div className="bar"><div style={{ width: `${dl}%` }} /></div>}
              {dlError && <p className="text-sm text-destructive">{dlError}</p>}
              {video && (
                <>
                  <div className="flex gap-4 rounded-xl border border-border p-4">
                    {video.thumb ? (
                      <img src={video.thumb} alt="" className="h-20 w-36 rounded-lg object-cover" />
                    ) : null}
                    <div>
                      <div className="font-semibold">{video.title}</div>
                      <div className="mt-2 flex gap-2">
                        {video.dur && <span className="chip">⏱ {video.dur}</span>}
                        {video.size && <span className="chip">💾 {video.size}</span>}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-primary w-full py-4 text-lg" onClick={() => setStep(1)}>Next: choose cover →</button>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="glass p-6">
                {coverObj ? (
                  <CoverStage rect={rect} highlight={detected} showVideo={false}
                    coverUrl={coverObj.path} coverIsVideo={coverObj.is_video} coverId={coverObj.id}
                    maskRectPx={maskRectPx} onCoverSize={setCoverNatural} />
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="grid aspect-video w-full place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary">
                    <div className="text-center"><div className="text-4xl">⬆</div>Upload a cover image or video (MP4 / WebM)</div>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/mov" hidden
                  onChange={(e) => { void onUploadFile(e.target.files?.[0]); e.target.value = ""; }} />
                <div className="mt-5 flex flex-wrap gap-3">
                  <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>⬆ Upload cover</button>
                  <button className="btn btn-amber" disabled={!coverObj} onClick={() => { if (coverObj) void selectCover(coverObj); }}>🟩 Detect green area</button>
                  {greenFound && <span className="chip self-center text-success">✓ Green area found</span>}
                  {detected && !greenFound && <span className="chip self-center text-warning">Manual rectangle — adjust in Live edit</span>}
                </div>
                {detectMsg && <p className="mt-3 text-sm text-muted-foreground">{detectMsg}</p>}
                {coversError && <p className="mt-3 text-sm text-destructive">{coversError}</p>}
              </div>
              <div className="glass flex flex-col p-6">
                <h3 className="mb-3 font-semibold">Saved covers</h3>
                {covers.length === 0 && <p className="text-sm text-muted-foreground">No covers yet — upload one.</p>}
                <div className="grid grid-cols-2 gap-3">
                  {covers.map((c) => (
                    <div key={c.id} className={`relative overflow-hidden rounded-xl border-2 ${coverObj?.id === c.id ? "border-primary" : "border-transparent"}`}>
                      <button onClick={() => void selectCover(c)} className="block w-full text-left">
                        {c.is_video ? (
                          <video src={c.path} muted preload="metadata" playsInline className="aspect-video w-full object-cover" />
                        ) : (
                          <img src={c.path} alt={c.display_name} className="aspect-video w-full object-cover" />
                        )}
                        <div className="p-2 text-sm">{c.display_name}{c.is_video ? " (video)" : ""}</div>
                      </button>
                      <button className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-sm" title="Delete cover"
                        onClick={() => void onDeleteCover(c.id)}>×</button>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex gap-3 pt-6">
                  <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
                  <button className="btn btn-primary flex-1" disabled={!detected} onClick={() => setStep(2)}>Next: live edit →</button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-4">
                <div className="glass p-4">
                  <CoverStage rect={rect} fx={fx} highlight={detected}
                    coverUrl={coverObj?.path ?? null} coverIsVideo={coverObj?.is_video ?? false} coverId={coverObj?.id ?? null}
                    maskRectPx={maskRectPx} videoSrc={jobId ? `/api/source/${jobId}` : null}
                    onCoverSize={setCoverNatural} onVideoError={setVideoError} />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {videoError
                      ? "Video file could not be loaded — try downloading the video again in Step 1."
                      : !jobId
                        ? "No video downloaded yet — download a video in Step 1 first."
                        : !coverObj
                          ? "Video downloaded, but no cover selected — choose a cover in Step 2."
                          : `Video should appear inside the green area (${maskRectPx?.x ?? 0},${maskRectPx?.y ?? 0} ${maskRectPx?.w ?? 0}x${maskRectPx?.h ?? 0}).`}
                  </p>
                </div>
                <div className="glass p-4 text-sm"><span className="chip mr-2">Live</span>{fxSummary(fx)}</div>
                {stale && <div className="rounded-xl border border-amber/50 bg-amber/10 p-4 text-sm text-amber">⚠ Your last final video was made with older settings. Render again to apply these changes.</div>}
              </div>
              <div className="glass flex flex-col p-6">
                <FxControls fx={fx} setFx={setFx} rect={rect} setRect={setRect} />
                <div className="mt-6 flex gap-3">
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary flex-1" disabled={render !== null} onClick={() => void doRender(fx, () => setStep(3))}>
                    {render !== null ? `Rendering… ${Math.round(render)}%` : "🎬 Make final video"}
                  </button>
                </div>
                {render !== null && <div className="bar mt-3"><div style={{ width: `${render}%` }} /></div>}
                {renderError && <p className="mt-3 text-sm text-destructive">{renderError}</p>}
              </div>
            </div>
          )}

          {step === 3 && renderFx && (
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="glass p-6">
                <span className="chip mb-3 text-success">✓ Final video ready</span>
                {previewUrl && (
                  <video src={previewUrl} controls preload="metadata" className="mt-3 aspect-video w-full rounded-xl bg-black" />
                )}
                <div className="mt-4 text-sm text-muted-foreground"><b className="text-foreground">Settings used:</b> {fxSummary(renderFx)}</div>
                <div className="mt-5 flex gap-3">
                  {upResult ? (
                    <span className="chip flex-1 self-center text-success">✓ Uploaded — local copy deleted to save space</span>
                  ) : finalUrl ? (
                    <a className="btn btn-amber flex-1 py-4 text-lg" href={finalUrl} download={`covered-${jobId ?? "video"}.mp4`}>⬇ Download video</a>
                  ) : null}
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>✎ Edit again</button>
                </div>
                <div className="mt-6 rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Upload to YouTube</h3>
                  {ytConnected === false ? (
                    <>
                      <p className="mt-2 text-sm text-muted-foreground">YouTube is not connected yet — connect it once, then upload from here.</p>
                      <button className="btn btn-primary mt-3" onClick={() => void connectYtHere()}>🔗 Connect YouTube account</button>
                    </>
                  ) : (
                    <>
                      <input className="field mt-3" placeholder="Video title" value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} />
                      <textarea className="field mt-2" rows={3} placeholder="Description" value={ytDesc} onChange={(e) => setYtDesc(e.target.value)} />
                      <input className="field mt-2" placeholder="Tags, comma separated" value={ytTags} onChange={(e) => setYtTags(e.target.value)} />
                      <div className="mt-2 flex gap-2">
                        <select className="field flex-1" value={ytPrivacy} onChange={(e) => setYtPrivacy(e.target.value)}>
                          <option value="private">Private</option>
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted (link only)</option>
                        </select>
                        <select className="field flex-1" value={ytChannelId} onChange={(e) => setYtChannelId(e.target.value)}>
                          <option value="">Default channel</option>
                          {ytChannels.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
                        </select>
                      </div>
                      <button className="btn btn-amber mt-3 w-full py-3" disabled={upProgress !== null || !ytTitle.trim()} onClick={() => void doUpload()}>
                        {upProgress !== null ? `Uploading… ${Math.round(upProgress)}%` : "▶ Upload to YouTube"}
                      </button>
                      {upProgress !== null && <div className="bar mt-2"><div style={{ width: `${upProgress}%` }} /></div>}
                      {upResult && (
                        <p className="mt-2 text-sm text-success">✓ Uploaded{upResult.url ? (<>: <a href={upResult.url} target="_blank" rel="noreferrer" className="underline">Watch on YouTube</a></>) : "."}</p>
                      )}
                    </>
                  )}
                  {upError && <p className="mt-2 text-sm text-destructive">{upError}</p>}
                </div>
              </div>
              <div className="space-y-6">
                <div className="glass p-6">
                  <h3 className="mb-3 font-semibold">Save these effects as preset</h3>
                  <div className="flex gap-2">
                    <input className="field" placeholder="e.g. My channel look" value={presetName} onChange={(e) => { setPresetName(e.target.value); setSaved(false); setPresetMsg(""); }} />
                    <button className="btn btn-primary" disabled={!presetName.trim()} onClick={() => void saveJobPreset()}>Save</button>
                  </div>
                  {(saved || presetMsg) && <p className="mt-2 text-sm text-success">{presetMsg || "✓ Preset saved"}</p>}
                </div>
                <div className="glass p-6">
                  <h3 className="mb-4 font-semibold">Timeline</h3>
                  <Timeline job={finalJob} />
                </div>
                <button className="btn btn-ghost w-full" onClick={() => { if (coverJobKey.current) removeJob(coverJobKey.current); coverJobKey.current = null; setStep(0); setVideo(null); setRenderFx(null); setFinalJob(null); setPreviewUrl(null); setFinalUrl(null); }}>Start a new one</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Timeline({ job }: { job: Job | null }) {
  const steps = job?.timeline ?? [];
  if (!steps.length) return <p className="text-sm text-muted-foreground">No timing yet — render a video first.</p>;
  const max = Math.max(...steps.map((s) => s.duration_sec || 0), 1);
  const total = steps.reduce((a, s) => a + (s.duration_sec || 0), 0);
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i}>
          <div className="mb-1 flex justify-between text-sm"><span>{s.step}</span><span className="text-muted-foreground">{(s.duration_sec || 0).toFixed(1)}s</span></div>
          <div className="bar"><div style={{ width: `${((s.duration_sec || 0) / max) * 100}%` }} /></div>
          {s.detail && <div className="mt-1 text-xs text-muted-foreground">{s.detail}</div>}
        </div>
      ))}
      <div className="pt-1 text-right text-sm font-semibold">Total {total.toFixed(1)}s</div>
    </div>
  );
}
