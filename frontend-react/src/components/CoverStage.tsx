import { useEffect, useRef, useState } from "react";
import coverImg from "@/assets/cover-template.jpg";
import scene1 from "@/assets/scene-1.jpg";
import type { Preset } from "@/lib/app-store";

export type Rect = { x: number; y: number; w: number; h: number };
export const defaultRect: Rect = { x: 41.8, y: 16.7, w: 53, h: 61 };

/**
 * Map a % rect (of the FULL cover) to % of the VISIBLE region.
 *
 * The stage is aspect-video and the cover is object-cover, so a cover
 * that is not 16:9 is centre-cropped — a 3:2 cover (e.g. 1920x1280)
 * loses its top and bottom. The rect prop is % of the full cover, so
 * rendering it as-is puts the video shifted down and too short, and
 * green strips stay visible above and below it (user, 2026-11-07 —
 * the same cover detected fine before the theme update, because the
 * old frontend did not crop the cover to 16:9). Convert to % of the
 * cropped region the user actually sees.
 */
function toVisibleRect(rect: Rect, cw: number, ch: number): Rect {
  const containerAspect = 16 / 9;
  const coverAspect = cw / ch;
  let visX = 0, visY = 0, visW = cw, visH = ch;
  if (coverAspect < containerAspect) {
    visH = cw / containerAspect;
    visY = (ch - visH) / 2;
  } else if (coverAspect > containerAspect) {
    visW = ch * containerAspect;
    visX = (cw - visW) / 2;
  }
  const px = (rect.x / 100) * cw;
  const py = (rect.y / 100) * ch;
  const pw = (rect.w / 100) * cw;
  const ph = (rect.h / 100) * ch;
  return {
    x: ((px - visX) / visW) * 100,
    y: ((py - visY) / visH) * 100,
    w: (pw / visW) * 100,
    h: (ph / visH) * 100,
  };
}

type Fx = Omit<Preset, "id" | "name">;
export type CoverSize = { w: number; h: number };

/**
 * Cover with the source video "playing" inside its green rectangle.
 * Real mode: coverUrl is the uploaded cover (image or video), videoSrc is
 * the downloaded source (/api/source/{jobId}). Without them the demo
 * images are shown, exactly like the original design.
 */
export function CoverStage({ rect, fx, highlight, showVideo = true, playing = true,
  coverUrl, coverIsVideo, coverId, maskRectPx, videoSrc, onCoverSize, onVideoError }: {
  rect: Rect; fx?: Fx; highlight?: boolean; showVideo?: boolean; playing?: boolean;
  coverUrl?: string | null; coverIsVideo?: boolean; coverId?: string | null;
  maskRectPx?: Rect | null; videoSrc?: string | null;
  onCoverSize?: (s: CoverSize) => void;
  onVideoError?: (hasError: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [coverSize, setCoverSize] = useState<CoverSize | null>(null);
  const onSize = (s: CoverSize) => { setCoverSize(s); onCoverSize?.(s); };

  // playbackRate is not a React prop — set it directly.
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = fx?.speed ?? 1;
  }, [fx?.speed]);

  // Render the rect % of the visible (cropped) region, not of the
  // full cover — see toVisibleRect above.
  const disp = coverSize ? toVisibleRect(rect, coverSize.w, coverSize.h) : rect;

  const zoom = fx?.zoom ?? 1;
  // Same clamp the backend applies: pan is forced to 0 at zoom <= 1.
  const clampPan = (v: number) => {
    if (zoom <= 1) return 0;
    const m = ((zoom - 1) / 2) * 100;
    return Math.max(-m, Math.min(m, v));
  };
  const panX = clampPan(fx?.panX ?? 0);
  const panY = clampPan(fx?.panY ?? 0);

  // Shape-accurate clip: the backend's green mask, so the live video
  // is clipped to the green area's actual shape, like the final encode.
  const maskUrl = coverId && maskRectPx
    ? `/api/green-mask/${coverId}?x=${maskRectPx.x}&y=${maskRectPx.y}&w=${maskRectPx.w}&h=${maskRectPx.h}`
    : null;

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl">
      {coverUrl ? (
        coverIsVideo ? (
          <video src={coverUrl} muted loop autoPlay playsInline
            className="h-full w-full object-cover"
            onLoadedMetadata={(e) => onSize({ w: e.currentTarget.videoWidth || 1280, h: e.currentTarget.videoHeight || 720 })} />
        ) : (
          <img src={coverUrl} alt="Cover" className="h-full w-full object-cover"
            onLoad={(e) => onSize({ w: e.currentTarget.naturalWidth || 1280, h: e.currentTarget.naturalHeight || 720 })} />
        )
      ) : (
        <img src={coverImg} alt="Cover" width={1280} height={720} className="h-full w-full object-cover" />
      )}
      <div className={`absolute overflow-hidden rounded-md ${highlight ? "chroma-zone" : ""}`}
        style={{
          left: `${disp.x}%`, top: `${disp.y}%`, width: `${disp.w}%`, height: `${disp.h}%`,
          background: "#000",
          ...(maskUrl
            ? {
                maskImage: `url(${maskUrl})`, WebkitMaskImage: `url(${maskUrl})`,
                maskSize: "100% 100%", WebkitMaskSize: "100% 100%",
                maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
                maskMode: "alpha", WebkitMaskMode: "alpha",
              }
            : {}),
        }}>
        {showVideo && fx && (
          videoSrc ? (
            <video ref={videoRef} src={videoSrc} muted loop autoPlay playsInline
              onError={() => onVideoError?.(true)}
              onLoadedData={() => onVideoError?.(false)}
              className={`h-full w-full ${fx.fit === "cover" ? "object-cover" : "object-contain bg-background"}`}
              style={{
                translate: `${panX}% ${panY}%`,
                scale: `${fx.flip ? -zoom : zoom} ${zoom}`,
              }} />
          ) : (
            <img src={scene1} alt="Video"
              className={`h-full w-full ${fx.fit === "cover" ? "object-cover" : "object-contain bg-background"} ${playing ? "animate-kenburns" : ""}`}
              style={{
                animationDuration: `${9 / fx.speed}s`,
                translate: `${panX}% ${panY}%`,
                scale: `${fx.flip ? -zoom : fx.zoom} ${fx.zoom}`,
              }} />
          )
        )}
      </div>
    </div>
  );
}
