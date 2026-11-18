/**
 * 3D World — ready-made designed things ("starter" models). Any recipe can
 * use them by name (model:train, model:rail_track…) without designing them,
 * and when the AI designs one too plainly (a few boxes) the good one is
 * used instead. Same format as the AI's own models (see ModelDef).
 */
import type { ModelDef, ModelPart } from "./types";

const B = (size: number[], pos: number[], color: string, extra: Partial<ModelPart> = {}): ModelPart => ({ shape: "box", size, pos, color, ...extra });
const C = (radius: number, height: number, pos: number[], color: string, extra: Partial<ModelPart> = {}): ModelPart => ({ shape: "cylinder", radius, height, pos, color, ...extra });
const wheel = (x: number, z: number, r: number, y = r): ModelPart => C(r, 0.2, [x, y, z], "#111827", { rot: [90, 0, 0], wheel: true });
const win = (x: number, y: number, z: number, w = 1, h = 0.8): ModelPart => B([w, h, 0.05], [x, y, z], "#bae6fd", { glass: true });

export const STARTER: Record<string, ModelDef & { aliases: string[] }> = {
  motorcycle: {
    label: "motorcycle", aliases: ["motorcycle", "motorbike", "bike", "scooter", "moped", "honda"],
    abilities: ["solid", "sittable"], seat_height: 0.8,
    parts: [
      wheel(0.75, 0, 0.32), wheel(-0.75, 0, 0.32),
      B([1.1, 0.28, 0.32], [0, 0.62, 0], "#dc2626"), B([0.6, 0.22, 0.34], [-0.2, 0.82, 0], "#111827"),
      B([0.36, 0.3, 0.3], [0.05, 0.45, 0], "#6b7280"), C(0.05, 0.75, [0.62, 0.68, 0], "#9ca3af", { rot: [0, 0, -25] }),
      B([0.06, 0.06, 0.62], [0.78, 1.02, 0], "#111827"), { shape: "sphere", radius: 0.09, pos: [0.88, 0.86, 0], color: "#fde68a", glow: true },
      C(0.05, 0.6, [-0.55, 0.38, 0.16], "#9ca3af", { rot: [0, 0, 80] }), B([0.3, 0.08, 0.3], [-0.72, 0.62, 0], "#dc2626"),
    ],
  },
  bicycle: {
    label: "bicycle", aliases: ["bicycle", "cycle", "push bike"], abilities: ["sittable"], seat_height: 0.85,
    parts: [
      { shape: "torus", radius: 0.34, tube: 0.03, pos: [0.55, 0.34, 0], rot: [0, 0, 0], color: "#111827", wheel: true }, { shape: "torus", radius: 0.34, tube: 0.03, pos: [-0.55, 0.34, 0], rot: [0, 0, 0], color: "#111827", wheel: true },
      C(0.025, 0.85, [0, 0.55, 0], "#2563eb", { rot: [0, 0, 70] }), C(0.025, 0.6, [-0.25, 0.6, 0], "#2563eb", { rot: [0, 0, -20] }),
      C(0.025, 0.55, [0.45, 0.62, 0], "#2563eb", { rot: [0, 0, -20] }), B([0.22, 0.05, 0.1], [-0.33, 0.9, 0], "#111827"),
      B([0.05, 0.05, 0.5], [0.52, 0.92, 0], "#111827"),
    ],
  },
  airplane: {
    label: "passenger airplane", aliases: ["airplane", "aeroplane", "plane", "jet", "aircraft", "airliner", "jahaz", "hawai jahaz"],
    abilities: ["solid", "enterable"],
    parts: [
      C(1.9, 22, [0, 3.4, 0], "#f8fafc", { rot: [0, 0, 90] }),
      { shape: "cone", radius: 1.9, height: 3.2, pos: [12.6, 3.4, 0], rot: [0, 0, -90], color: "#f8fafc" },
      { shape: "cone", radius: 1.9, height: 4.5, pos: [-13.2, 3.9, 0], rot: [0, 0, 90], color: "#f8fafc" },
      B([22, 0.45, 3.86], [0, 2.9, 0], "#1d4ed8"),
      B([0.7, 0.55, 2.4], [12.3, 4.3, 0], "#0f172a", { glass: true }),
      ...[-8, -6.6, -5.2, -3.8, -2.4, -1, 0.4, 1.8, 3.2, 4.6, 6, 7.4, 8.8].flatMap((x) => [
        B([0.45, 0.55, 0.05], [x, 3.95, 1.9], "#0f172a", { glass: true }), B([0.45, 0.55, 0.05], [x, 3.95, -1.9], "#0f172a", { glass: true })]),
      B([0.9, 1.9, 0.06], [10.3, 3.4, 1.9], "#cbd5e1", { door: true }),
      B([4.2, 0.35, 11], [0.6, 2.5, 6.6], "#e2e8f0", { rot: [0, 22, 0] }), B([4.2, 0.35, 11], [0.6, 2.5, -6.6], "#e2e8f0", { rot: [0, -22, 0] }),
      C(0.85, 2.8, [2.6, 1.7, 5.2], "#cbd5e1", { rot: [0, 0, 90] }), C(0.85, 2.8, [2.6, 1.7, -5.2], "#cbd5e1", { rot: [0, 0, 90] }),
      C(0.6, 0.1, [4.05, 1.7, 5.2], "#1f2937", { rot: [0, 0, 90] }), C(0.6, 0.1, [4.05, 1.7, -5.2], "#1f2937", { rot: [0, 0, 90] }),
      B([3.6, 5, 0.35], [-12.2, 7.2, 0], "#1d4ed8", { rot: [0, 0, -28] }),
      B([2.6, 0.25, 8], [-12.6, 4.6, 0], "#e2e8f0"),
      { shape: "text", text: "SKY AIR", size: [5, 0.9], color: "#f8fafc", textColor: "#1d4ed8", pos: [2, 4.3, 1.93] },
      wheel(9.5, 0.4, 0.55), wheel(9.5, -0.4, 0.55), wheel(0.5, 1.6, 0.6), wheel(0.5, -1.6, 0.6),
      C(0.12, 1.2, [9.5, 1.2, 0], "#6b7280"), C(0.15, 1.2, [0.5, 1.2, 1.6], "#6b7280"), C(0.15, 1.2, [0.5, 1.2, -1.6], "#6b7280"),
    ],
  },
  terminal: {
    label: "airport terminal building", aliases: ["terminal", "airport building", "airport terminal"],
    abilities: ["solid", "enterable", "hide_behind"],
    parts: [
      B([56, 0.4, 18], [0, 0.2, 0], "#cbd5e1"), B([54, 9, 16], [0, 4.7, 0], "#e5e7eb"),
      B([52, 6.6, 0.1], [0, 4.1, 8.05], "#7dd3fc", { glass: true }),
      ...[-24, -18, -12, -6, 0, 6, 12, 18, 24].map((x) => B([0.35, 7.4, 0.25], [x, 4.1, 8.12], "#64748b")),
      B([54, 0.35, 0.3], [0, 7.5, 8.12], "#64748b"),
      B([60, 0.9, 22], [0, 9.6, 1.5], "#94a3b8"), B([60, 0.4, 0.4], [0, 9.1, 12.3], "#475569"),
      ...[-26, -13, 0, 13, 26].map((x) => C(0.35, 9, [x, 4.6, 12], "#94a3b8")),
      B([3, 3, 0.12], [0, 1.5, 8.2], "#334155", { door: true }),
      { shape: "text", text: "INTERNATIONAL AIRPORT", size: [16, 1.6], color: "#1e3a8a", textColor: "#ffffff", pos: [0, 8.4, 8.25] },
      B([6, 1.2, 0.2], [-14, 6.4, 8.2], "#0f172a"), { shape: "text", text: "DEPARTURES", size: [5.6, 1.0], color: "#0f172a", textColor: "#facc15", pos: [-14, 6.4, 8.32] },
      B([6, 1.2, 0.2], [14, 6.4, 8.2], "#0f172a"), { shape: "text", text: "ARRIVALS", size: [5.6, 1.0], color: "#0f172a", textColor: "#facc15", pos: [14, 6.4, 8.32] },
    ],
  },
  control_tower: {
    label: "airport control tower", aliases: ["control tower", "tower", "atc"],
    abilities: ["solid"],
    parts: [
      B([6, 3, 6], [0, 1.5, 0], "#cbd5e1"), C(1.7, 20, [0, 13, 0], "#e5e7eb"), C(2.2, 1, [0, 23.4, 0], "#94a3b8"),
      C(3.4, 3.2, [0, 25.5, 0], "#7dd3fc", { radiusTop: 3.8, glass: true }), C(4.1, 0.7, [0, 27.5, 0], "#475569"),
      C(0.12, 3, [0, 29.3, 0], "#6b7280"), { shape: "sphere", radius: 0.3, pos: [0, 30.9, 0], color: "#ef4444", glow: true },
    ],
  },
  jet_bridge: {
    label: "jet bridge (boarding tunnel)", aliases: ["jet bridge", "boarding bridge", "air bridge", "gate"],
    abilities: ["solid"],
    parts: [B([13, 2.8, 2.6], [6.5, 4.2, 0], "#cbd5e1"), B([13, 0.3, 2.7], [6.5, 5.7, 0], "#94a3b8"),
      B([2.6, 3.2, 3.2], [13.3, 4.2, 0], "#64748b"), C(0.35, 2.8, [10, 1.4, 0], "#475569"), B([1.6, 0.5, 1], [10, 0.25, 0], "#1f2937"),
      ...[1.5, 4, 6.5, 9].map((x) => B([1.2, 0.8, 0.05], [x, 4.5, 1.31], "#7dd3fc", { glass: true }))],
  },
  departures_board: {
    label: "flight departures board", aliases: ["departures board", "flight board", "board", "screen"],
    parts: [C(0.12, 2.2, [0, 1.1, 0], "#475569"), B([3.4, 1.8, 0.2], [0, 3, 0], "#0f172a"),
      { shape: "text", text: "FLIGHT  TIME  GATE", size: [3.2, 0.35], color: "#0f172a", textColor: "#facc15", pos: [0, 3.65, 0.11] },
      { shape: "text", text: "PK301  10:30  A2", size: [3.2, 0.32], color: "#0f172a", textColor: "#ffffff", pos: [0, 3.2, 0.11] },
      { shape: "text", text: "EK612  11:05  B4", size: [3.2, 0.32], color: "#0f172a", textColor: "#ffffff", pos: [0, 2.8, 0.11] },
      { shape: "text", text: "QR207  11:40  C1", size: [3.2, 0.32], color: "#0f172a", textColor: "#4ade80", pos: [0, 2.4, 0.11] }],
  },
  check_in_counter: {
    label: "check-in counter", aliases: ["check-in", "check in", "counter", "desk", "reception"],
    abilities: ["solid"],
    parts: [B([3.2, 1.1, 0.9], [0, 0.55, 0], "#e2e8f0"), B([3.3, 0.08, 1.0], [0, 1.12, 0], "#475569"),
      B([0.5, 0.35, 0.05], [-0.8, 1.35, -0.2], "#0f172a"), B([2.6, 0.6, 0.12], [0, 2.4, -0.4], "#1d4ed8"),
      { shape: "text", text: "CHECK-IN", size: [2.4, 0.45], color: "#1d4ed8", textColor: "#ffffff", pos: [0, 2.4, -0.33] },
      B([1.0, 0.15, 0.7], [1.9, 0.35, 0], "#334155")],
  },
  barn: {
    label: "red farm barn", aliases: ["barn", "stable", "cowshed", "farm house"],
    abilities: ["solid", "enterable", "hide_behind"],
    parts: [B([8, 4.5, 6], [0, 2.25, 0], "#b91c1c"), { shape: "cone", radius: 5.4, height: 2.6, pos: [0, 5.8, 0], rot: [0, 45, 0], color: "#7f1d1d" },
      B([2.6, 3.2, 0.12], [0, 1.6, 3.03], "#fef3c7", { door: true }), B([2.2, 0.15, 0.13], [0, 1.6, 3.1], "#fef3c7", { rot: [0, 0, 50] }),
      B([2.2, 0.15, 0.13], [0, 1.6, 3.1], "#fef3c7", { rot: [0, 0, -50] }), B([1, 1, 0.1], [0, 4.6, 3.03], "#fef3c7")],
  },
  rail_track: {
    label: "railway track", aliases: ["track", "rail", "railway", "line", "patri"],
    parts: [B([2, 0.04, 3.2], [0, 0.02, 0], "#9ca3af"), B([0.25, 0.1, 2.6], [-0.5, 0.07, 0], "#6b4f3a"), B([0.25, 0.1, 2.6], [0.5, 0.07, 0], "#6b4f3a"),
      B([2, 0.12, 0.1], [0, 0.18, -0.72], "#6b7280"), B([2, 0.12, 0.1], [0, 0.18, 0.72], "#6b7280")],
  },
  train: {
    label: "steam train with coaches", aliases: ["train", "engine", "locomotive", "rail gari", "railgari", "coach"],
    abilities: ["solid", "enterable"],
    parts: [
      B([6, 1.6, 2.6], [0.5, 1.5, 0], "#166534"), C(1.0, 4, [1.5, 2.2, 0], "#15803d", { rot: [0, 0, 90] }),
      B([2.2, 2.6, 2.8], [-1.9, 2.3, 0], "#14532d"), B([2.6, 0.25, 3.1], [-1.9, 3.7, 0], "#7f1d1d"),
      win(-1.9, 2.8, 1.42, 0.9, 0.8), win(-1.9, 2.8, -1.42, 0.9, 0.8),
      C(0.45, 1.2, [2.9, 3.4, 0], "#1f2937", { radiusTop: 0.45, smoke: true }), { shape: "sphere", radius: 0.25, pos: [3.6, 2.3, 0], color: "#fde68a", glow: true },
      B([0.3, 0.6, 2.8], [3.6, 0.8, 0], "#b91c1c"), { shape: "cone", radius: 0.6, height: 0.5, pos: [3.7, 0.5, 0], rot: [0, 0, -90], color: "#374151" },
      wheel(2.2, 1.35, 0.55), wheel(0.6, 1.35, 0.55), wheel(-1.0, 1.35, 0.55), wheel(2.2, -1.35, 0.55), wheel(0.6, -1.35, 0.55), wheel(-1.0, -1.35, 0.55),
      B([11, 2.6, 2.8], [-9.3, 2.0, 0], "#b91c1c"), B([11.4, 0.25, 3.1], [-9.3, 3.4, 0], "#7f1d1d"),
      win(-5.6, 2.4, 1.42), win(-7.6, 2.4, 1.42), win(-9.6, 2.4, 1.42), win(-11.6, 2.4, 1.42),
      B([0.9, 1.9, 0.05], [-13.8, 1.7, 1.42], "#7f1d1d"),
      { shape: "text", text: "PAKISTAN RAILWAYS", size: [5, 0.45], color: "#b91c1c", textColor: "#fde047", pos: [-9.3, 1.25, 1.43] },
      wheel(-5.5, 1.35, 0.45), wheel(-13, 1.35, 0.45), wheel(-5.5, -1.35, 0.45), wheel(-13, -1.35, 0.45),
      B([0.6, 0.3, 0.3], [-3.6, 0.9, 0], "#374151"),
      B([11, 2.6, 2.8], [-21.0, 2.0, 0], "#1d4ed8"), B([11.4, 0.25, 3.1], [-21.0, 3.4, 0], "#1e3a8a"),
      win(-17.3, 2.4, 1.42), win(-19.3, 2.4, 1.42), win(-21.3, 2.4, 1.42), win(-23.3, 2.4, 1.42),
      wheel(-17.2, 1.35, 0.45), wheel(-24.7, 1.35, 0.45), wheel(-17.2, -1.35, 0.45), wheel(-24.7, -1.35, 0.45),
      B([0.6, 0.3, 0.3], [-15.3, 0.9, 0], "#374151"),
    ],
  },
  platform: {
    label: "railway platform", aliases: ["platform", "station platform"], floor: true,
    parts: [B([30, 0.55, 3.6], [0, 0.275, 0], "#cbbba0"), B([30, 0.06, 0.3], [0, 0.56, -1.65], "#facc15"), B([30, 0.5, 0.12], [0, 0.25, 1.82], "#a8a29e")],
  },
  station_building: {
    label: "railway station building", aliases: ["station", "station building", "station house", "booking office", "ticket office"],
    abilities: ["solid", "enterable", "hide_behind"],
    parts: [
      B([8.4, 0.3, 4.4], [0, 0.15, 0], "#9ca3af"), B([8, 3.2, 4], [0, 1.6, 0], "#f3e3c3"),
      B([8.8, 0.3, 5.4], [0, 3.35, 0.5], "#9a3412"),
      C(0.1, 3.1, [-3.6, 1.55, 2.7], "#7c2d12"), C(0.1, 3.1, [-1.2, 1.55, 2.7], "#7c2d12"), C(0.1, 3.1, [1.2, 1.55, 2.7], "#7c2d12"), C(0.1, 3.1, [3.6, 1.55, 2.7], "#7c2d12"),
      B([1.1, 2.2, 0.08], [0, 1.1, 2.02], "#7c2d12", { door: true }),
      B([1.35, 1.15, 0.04], [-2.6, 1.9, 2.01], "#ffffff"), win(-2.6, 1.9, 2.04, 1.2, 1.0),
      B([1.35, 1.15, 0.04], [2.6, 1.9, 2.01], "#ffffff"), win(2.6, 1.9, 2.04, 1.2, 1.0),
      { shape: "text", text: "TICKETS", size: [1.3, 0.3], color: "#166534", textColor: "#ffffff", pos: [-2.6, 2.7, 2.06] },
      { shape: "text", text: "RAILWAY STATION", size: [5, 0.6], color: "#ffffff", textColor: "#166534", pos: [0, 2.95, 2.07] },
      B([1.6, 1.5, 1.2], [0, 4.2, 1.0], "#f3e3c3"), { shape: "cone", radius: 1.2, height: 0.9, pos: [0, 5.4, 1.0], color: "#9a3412" },
      C(0.5, 0.08, [0, 4.25, 1.62], "#ffffff", { rot: [90, 0, 0] }), B([0.05, 0.4, 0.03], [0, 4.4, 1.68], "#111827"), B([0.3, 0.05, 0.03], [0.13, 4.25, 1.68], "#111827"),
    ],
  },
  water_tank: {
    label: "water tank on legs", aliases: ["water tank", "tank", "tanki", "water tower"], abilities: ["solid", "climbable"], climb_height: 4,
    parts: [
      C(0.09, 4, [0.9, 2, 0.9], "#4b5563"), C(0.09, 4, [-0.9, 2, 0.9], "#4b5563"), C(0.09, 4, [0.9, 2, -0.9], "#4b5563"), C(0.09, 4, [-0.9, 2, -0.9], "#4b5563"),
      B([1.9, 0.08, 0.08], [0, 2, 0.9], "#4b5563"), B([1.9, 0.08, 0.08], [0, 2, -0.9], "#4b5563"),
      C(1.35, 1.8, [0, 4.9, 0], "#64748b"), { shape: "cone", radius: 1.5, height: 0.6, pos: [0, 6.1, 0], color: "#334155" },
      B([0.15, 0.15, 1.4], [1.3, 4.1, 0.5], "#334155", { rot: [0, 45, 0] }),
      B([0.06, 4, 0.06], [-0.25, 2, 1.2], "#78350f"), B([0.06, 4, 0.06], [0.25, 2, 1.2], "#78350f"),
      ...[0.5, 1.1, 1.7, 2.3, 2.9, 3.5].map((y) => B([0.5, 0.05, 0.05], [0, y, 1.2], "#78350f")),
    ],
  },
  lamp_post: {
    label: "lamp post", aliases: ["lamp", "street light", "light pole", "lamp post"],
    parts: [C(0.15, 0.3, [0, 0.15, 0], "#1f2937"), C(0.06, 3.2, [0, 1.6, 0], "#374151"), B([0.6, 0.06, 0.06], [0.25, 3.2, 0], "#374151"),
      { shape: "sphere", radius: 0.2, pos: [0.5, 3.05, 0], color: "#fef9c3", glow: true }],
  },
  clock: {
    label: "station clock on a pole", aliases: ["clock", "ghanta", "ghari", "watch tower"],
    parts: [C(0.08, 3, [0, 1.5, 0], "#374151"), C(0.45, 0.12, [0, 3.2, 0], "#ffffff", { rot: [90, 0, 0] }), { shape: "torus", radius: 0.45, tube: 0.05, pos: [0, 3.2, 0], color: "#1f2937" },
      B([0.05, 0.35, 0.03], [0, 3.33, 0.08], "#111827"), B([0.28, 0.05, 0.03], [0.12, 3.2, 0.08], "#111827")],
  },
  road: {
    label: "road piece", aliases: ["road", "street", "sarak", "highway"],
    parts: [B([4, 0.03, 6], [0, 0.015, 0], "#4b5563"), B([1.8, 0.035, 0.15], [0, 0.03, 0], "#f8fafc"), B([4, 0.04, 0.2], [0, 0.02, 2.9], "#d1d5db"), B([4, 0.04, 0.2], [0, 0.02, -2.9], "#d1d5db")],
  },
  car: {
    label: "car", aliases: ["car", "gari", "taxi", "jeep"], abilities: ["solid"],
    parts: [B([4, 0.9, 1.8], [0, 0.75, 0], "#dc2626"), B([2.2, 0.8, 1.6], [-0.3, 1.55, 0], "#b91c1c"),
      win(-0.3, 1.55, 0.81, 1.9, 0.6), win(-0.3, 1.55, -0.81, 1.9, 0.6), B([0.05, 0.6, 1.4], [0.82, 1.55, 0], "#bae6fd", { glass: true }),
      { shape: "sphere", radius: 0.12, pos: [2.0, 0.85, 0.6], color: "#fef9c3", glow: true }, { shape: "sphere", radius: 0.12, pos: [2.0, 0.85, -0.6], color: "#fef9c3", glow: true },
      wheel(1.3, 0.9, 0.38), wheel(-1.3, 0.9, 0.38), wheel(1.3, -0.9, 0.38), wheel(-1.3, -0.9, 0.38)],
  },
  bus: {
    label: "bus", aliases: ["bus", "coach bus", "van"], abilities: ["solid", "enterable"],
    parts: [B([9, 2.6, 2.5], [0, 1.7, 0], "#f59e0b"), B([9.1, 0.2, 2.6], [0, 3.05, 0], "#ffffff"),
      ...[3.2, 1.6, 0, -1.6, -3.2].map((x) => win(x, 2.1, 1.26, 1.3, 0.8)), B([0.05, 1.2, 2.1], [4.52, 2.1, 0], "#bae6fd", { glass: true }),
      B([0.9, 2.0, 0.05], [3.6, 1.4, 1.27], "#92400e", { door: true }),
      wheel(3, 1.25, 0.5), wheel(-3, 1.25, 0.5), wheel(3, -1.25, 0.5), wheel(-3, -1.25, 0.5),
      { shape: "sphere", radius: 0.15, pos: [4.55, 1.0, 0.9], color: "#fef9c3", glow: true }, { shape: "sphere", radius: 0.15, pos: [4.55, 1.0, -0.9], color: "#fef9c3", glow: true }],
  },
  stall: {
    label: "tea stall (khokha)", aliases: ["stall", "khokha", "tea stall", "chai stall", "shop", "dukan", "kiosk"], abilities: ["solid", "hide_behind"],
    parts: [B([2.6, 1.0, 1.2], [0, 0.5, 0.3], "#a16207"), B([2.8, 0.08, 1.4], [0, 1.04, 0.3], "#d6a96b"),
      B([2.6, 2.4, 0.1], [0, 1.2, -0.3], "#92400e"), C(0.05, 2.5, [-1.25, 1.25, 0.9], "#78350f"), C(0.05, 2.5, [1.25, 1.25, 0.9], "#78350f"),
      B([3.0, 0.1, 1.8], [0, 2.5, 0.3], "#dc2626", { rot: [-8, 0, 0] }),
      { shape: "text", text: "CHAI", size: [1.2, 0.4], color: "#fde047", textColor: "#7c2d12", pos: [0, 2.2, 0.95] },
      C(0.15, 0.25, [-0.6, 1.2, 0.3], "#e5e7eb"), C(0.12, 0.3, [0.5, 1.2, 0.3], "#9ca3af")],
  },
  // ---- inside things
  chair: {
    label: "chair", aliases: ["chair", "kursi", "stool"], abilities: ["sittable"], seat_height: 0.48,
    parts: [B([0.5, 0.06, 0.5], [0, 0.46, 0], "#a16207"), B([0.5, 0.55, 0.06], [0, 0.76, -0.22], "#a16207"),
      ...[[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]].map(([x, z]) => B([0.05, 0.46, 0.05], [x!, 0.23, z!], "#78350f"))],
  },
  table: {
    label: "table", aliases: ["table", "mez", "dining table"], abilities: ["solid", "hide_behind"],
    parts: [B([1.6, 0.08, 0.9], [0, 0.76, 0], "#92400e"), ...[[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].map(([x, z]) => B([0.07, 0.76, 0.07], [x!, 0.38, z!], "#78350f"))],
  },
  sofa: {
    label: "sofa", aliases: ["sofa", "couch", "settee"], abilities: ["sittable", "hide_behind"], seat_height: 0.48,
    parts: [B([2.2, 0.42, 0.85], [0, 0.25, 0], "#2563eb"), B([2.2, 0.55, 0.22], [0, 0.72, -0.34], "#1d4ed8"),
      B([0.22, 0.6, 0.85], [-1.0, 0.45, 0], "#1d4ed8"), B([0.22, 0.6, 0.85], [1.0, 0.45, 0], "#1d4ed8"),
      B([0.85, 0.1, 0.6], [-0.45, 0.5, 0.05], "#3b82f6"), B([0.85, 0.1, 0.6], [0.45, 0.5, 0.05], "#3b82f6")],
  },
  bed: {
    label: "bed", aliases: ["bed", "charpai", "palang"], abilities: ["sittable"], seat_height: 0.55,
    parts: [B([1.6, 0.35, 2.1], [0, 0.2, 0], "#92400e"), B([1.5, 0.18, 2.0], [0, 0.46, 0], "#f8fafc"), B([1.6, 0.9, 0.08], [0, 0.6, -1.05], "#78350f"),
      B([0.6, 0.12, 0.35], [-0.35, 0.6, -0.75], "#ffffff"), B([0.6, 0.12, 0.35], [0.35, 0.6, -0.75], "#ffffff"), B([1.52, 0.06, 1.2], [0, 0.57, 0.35], "#f472b6")],
  },
  cupboard: {
    label: "cupboard", aliases: ["cupboard", "almari", "wardrobe", "cabinet", "fridge"], abilities: ["solid", "hide_behind", "openable"],
    parts: [B([1.2, 2.0, 0.6], [0, 1.0, 0], "#a16207"), B([0.58, 1.9, 0.04], [-0.3, 1.0, 0.31], "#b45309", { door: true }), B([0.58, 1.9, 0.04], [0.3, 1.0, 0.31], "#b45309"),
      { shape: "sphere", radius: 0.04, pos: [0.06, 1.0, 0.35], color: "#fbbf24" }],
  },
  tv: {
    label: "TV on a stand", aliases: ["tv", "television", "screen"],
    parts: [B([1.4, 0.5, 0.45], [0, 0.25, 0], "#57534e"), B([1.3, 0.75, 0.06], [0, 0.95, 0], "#111827"), B([1.2, 0.65, 0.02], [0, 0.95, 0.035], "#38bdf8", { glow: true })],
  },
  train_seat: {
    label: "train seat for two", aliases: ["train seat", "bus seat", "seat", "berth"], abilities: ["sittable"], seat_height: 0.48,
    parts: [B([1.1, 0.12, 0.55], [0, 0.45, 0], "#1d4ed8"), B([1.1, 0.75, 0.12], [0, 0.85, -0.25], "#1e40af"), B([0.08, 0.45, 0.5], [-0.5, 0.22, 0], "#374151"), B([0.08, 0.45, 0.5], [0.5, 0.22, 0], "#374151")],
  },
  school_desk: {
    label: "school desk with bench", aliases: ["desk", "school desk", "bench desk"], abilities: ["sittable"], seat_height: 0.45,
    parts: [B([1.2, 0.05, 0.5], [0, 0.75, 0.15], "#b45309"), B([1.2, 0.05, 0.35], [0, 0.45, -0.35], "#92400e"),
      ...[-0.55, 0.55].map((x) => B([0.05, 0.75, 0.05], [x, 0.37, 0.3], "#374151")), ...[-0.55, 0.55].map((x) => B([0.05, 0.45, 0.05], [x, 0.22, -0.35], "#374151"))],
  },
  blackboard: {
    label: "blackboard", aliases: ["blackboard", "board", "chalkboard", "whiteboard"],
    parts: [B([3, 1.4, 0.08], [0, 1.6, 0], "#14532d"), B([3.2, 1.6, 0.05], [0, 1.6, -0.03], "#92400e"), B([3, 0.06, 0.12], [0, 0.88, 0.06], "#92400e")],
  },
};

/** The ready-made thing a name means (model:train_engine → train).
 * strict: only an (almost) exact name — used to replace a too-plain design. */
export function starterFor(name: string, strict = false): ModelDef | null {
  const n = name.toLowerCase().replace(/[_-]+/g, " ").trim();
  const tok = n.split(" ").filter(Boolean);
  let best: ModelDef | null = null, bestLen = 0;
  for (const [k, def] of Object.entries(STARTER)) {
    for (const a of [k.replace(/_/g, " "), ...def.aliases]) {
      const at = a.split(" ");
      const ok = n === a || (strict
        ? tok.length <= at.length + 1 && at.every((x) => tok.includes(x)) && tok.every((x) => at.includes(x) || ["engine", "big", "old", "small", "main", "steam", "pakistani"].includes(x))
        : at.every((x) => tok.includes(x)));
      if (ok && a.length > bestLen) { best = def; bestLen = a.length; }
    }
  }
  return best;
}
