// The ONE shared visual style for every 3D Explainer scene.
// Every template in scene.ts reads its colours/fonts from here so
// all shots in a video look like one film, whatever the template.

export const STYLE3D = {
  bg: "#04101f", // full-frame background (near-black navy)
  deep: "#06182e", // deeper surface: oceans, stage floors, map land-sea
  data: "#ff8c1a", // orange: data lines, arcs, packets, pins, card values
  accent: "#35c4ff", // sky blue: highlights, country outlines, secondary glow
  label: "#ffffff", // label text
  labelBg: "rgba(4,16,31,0.72)", // label pill background (bg at 72%)
  font: "Inter, system-ui, sans-serif",
  cardBg: "#0a2438", // data-card plane background
  cardText: "#ffffff",
  muted: "#9db8cc", // secondary text on cards / sub-lines
  stage: "#0d2c47", // hero stage disc
  sand: "#c2a878", // underwater floor
  land: "#1d5c46", // procedural-earth continents
  landAlt: "#8a7a4a", // procedural-earth dry land
  grid: "rgba(53,196,255,0.16)", // faint guide lines
} as const;

export type QualityName = "low" | "medium" | "high";
export type Orientation = "landscape" | "shorts";

export const QUALITY: Record<
  QualityName,
  { w: number; h: number; fps: number; pixelRatio: number }
> = {
  low: { w: 854, h: 480, fps: 24, pixelRatio: 1 },
  medium: { w: 1280, h: 720, fps: 30, pixelRatio: 1.5 },
  high: { w: 1920, h: 1080, fps: 30, pixelRatio: 2 },
};

/** Frame size for a quality + orientation. "shorts" swaps w/h (9:16). */
export function dimsFor(
  quality: QualityName,
  orientation: Orientation = "landscape",
): { w: number; h: number; fps: number } {
  const q = QUALITY[quality] ?? QUALITY.medium;
  if (orientation === "shorts") return { w: q.h, h: q.w, fps: q.fps };
  return { w: q.w, h: q.h, fps: q.fps };
}
