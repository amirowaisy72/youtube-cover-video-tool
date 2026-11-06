import { useEffect, useRef } from "react";
import coverImg from "@/assets/cover-template.jpg";
import scene1 from "@/assets/scene-1.jpg";
import type { Preset } from "@/lib/app-store";

export type Rect = { x: number; y: number; w: number; h: number };
export const defaultRect: Rect = { x: 41.8, y: 16.7, w: 53, h: 61 };

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

  // playbackRate is not a React prop — set it directly.
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = fx?.speed ?? 1;
  }, [fx?.speed]);

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
            onLoadedMetadata={(e) => onCoverSize?.({ w: e.currentTarget.videoWidth || 1280, h: e.currentTarget.videoHeight || 720 })} />
        ) : (
          <img src={coverUrl} alt="Cover" className="h-full w-full object-cover"
            onLoad={(e) => onCoverSize?.({ w: e.currentTarget.naturalWidth || 1280, h: e.currentTarget.naturalHeight || 720 })} />
        )
      ) : (
        <img src={coverImg} alt="Cover" width={1280} height={720} className="h-full w-full object-cover" />
      )}
      <div className={`absolute overflow-hidden rounded-md ${highlight ? "chroma-zone" : ""}`}
        style={{
          left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%`,
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
