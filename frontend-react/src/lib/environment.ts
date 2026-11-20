/**
 * Drawn scene environments for the Story Animator, in the same
 * flat line-art style as the stickman characters (stickman.ts), so
 * characters and places look like one cartoon — not stickmen pasted
 * on a random photo.
 *
 * The backend decides the layout (which place, where each seat
 * goes, where characters stand); this file only draws it. Seats are
 * drawn at exactly the height a sitting character's lap is drawn
 * at, so characters really sit ON the bench / sofa / chair.
 */

export type EnvKind =
  | "park" | "street" | "home" | "office" | "classroom" | "kitchen"
  | "bedroom" | "shop" | "restaurant" | "police" | "plain"
  | "jungle" | "forest" | "beach" | "desert" | "cave" | "mountain" | "snow" | "farm" | "village" | "space"
  | "underwater" | "hospital" | "library" | "stage" | "gym" | "bus" | "train" | "car" | "plane" | "custom";

export type PropType = "bench" | "sofa" | "bed" | "chair" | "table" | "desk";

export type EnvLayout = {
  kind: EnvKind;
  seed?: number; // different look per video / scene
  transparent?: boolean; // only the furniture (drawn over your own background picture)
  image?: string; // your own background from the Asset Library ("lib:<id>")
  floor?: number; // where the floor line is in that picture (0..1 of its height)
  outdoor?: boolean; // a place the tool did not know: outside or a room
  weather?: "rain" | "snow";
  night?: boolean;
  decor?: { src: string; x: number; y: number; size: number }[]; // pictures that belong to the place
  props: { type: PropType; x: number; x2?: number }[]; // x = fraction of width
  world?: string; // a world you made in the Environment Designer (3D)
  need?: { verb: string; word: string; on?: string }[];
  quiet?: boolean; // night / sneaking / hiding: no strangers about
  signs?: string[]; // texts the story shows on screens: the city's billboards light up with them // what the script uses here ({climb:tree}…) — 3D builds it
  location?: string; // the scene's own words ("river bank in the jungle")
  name?: string; // the place name the director gave
  world_exact?: boolean; // the saved world was named exactly / chosen by you (else a blueprint may win)
  blueprint?: string; // a place blueprint chosen for this scene (city, airport, classroom…) — see world/blueprints.ts
};

/** Pixel geometry from the backend (same numbers it uses to place characters). */
export type EnvGeometry = {
  width: number;
  height: number;
  floorY: number; // where shoes touch the floor
  seatY: number;  // top of a seat a character sits on
  unit: number;   // pixels per character unit (character is 400 units tall)
};

export const ENV_KINDS: { id: EnvKind; label: string }[] = [
  { id: "park", label: "Park" }, { id: "street", label: "Street" }, { id: "home", label: "Living room" },
  { id: "office", label: "Office" }, { id: "classroom", label: "Classroom" }, { id: "kitchen", label: "Kitchen" },
  { id: "bedroom", label: "Bedroom" }, { id: "shop", label: "Shop" }, { id: "restaurant", label: "Restaurant" },
  { id: "police", label: "Police station" }, { id: "plain", label: "Plain" },
  { id: "jungle", label: "Jungle" }, { id: "forest", label: "Forest" }, { id: "beach", label: "Beach" },
  { id: "desert", label: "Desert" }, { id: "cave", label: "Cave" }, { id: "mountain", label: "Mountains" },
  { id: "snow", label: "Snow" }, { id: "farm", label: "Farm" }, { id: "village", label: "Village" },
  { id: "space", label: "Space / Moon" }, { id: "underwater", label: "Under the sea" }, { id: "hospital", label: "Hospital" },
  { id: "library", label: "Library" }, { id: "stage", label: "Stage" }, { id: "gym", label: "Gym" },
  { id: "bus", label: "Inside a bus" }, { id: "train", label: "Inside a train" }, { id: "car", label: "Inside a car" },
  { id: "plane", label: "Inside a plane" },
];

const INK = "#1b1b1b";

type Ctx = EnvGeometry & { sw: number; rng: () => number; wood: string; sofaCol: string; blanket: string };

const r = (n: number) => Math.round(n * 10) / 10;
const ln = (c: Ctx, width = c.sw) => `stroke="${INK}" stroke-width="${r(width)}" stroke-linejoin="round"`;

function rect(c: Ctx, x: number, y: number, w: number, h: number, fill: string, rx = 0): string {
  return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${r(rx)}" fill="${fill}" ${ln(c)}/>`;
}

// ------------------------------------------------------------ backdrops
function sky(c: Ctx, top: string, bottom: string): string {
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/>` +
    `<stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
    `<rect width="${c.width}" height="${c.height}" fill="url(#sky)"/>`;
}

function cloud(c: Ctx, x: number, y: number, s: number): string {
  const u = c.unit * s;
  return `<path d="M${r(x)} ${r(y)} q${r(10 * u)} ${r(-28 * u)} ${r(38 * u)} ${r(-18 * u)} q${r(22 * u)} ${r(-24 * u)} ${r(50 * u)} ${r(-4 * u)} ` +
    `q${r(30 * u)} ${r(-6 * u)} ${r(34 * u)} ${r(22 * u)} z" fill="#ffffff" ${ln(c, c.sw * 0.7)}/>`;
}

function wall(c: Ctx, color: string, floor: string, boardColor = "#ffffff"): string {
  const fy = c.floorY - 70 * c.unit; // wall meets the floor a little above the feet
  let out = `<rect width="${c.width}" height="${c.height}" fill="${color}"/>`;
  out += `<rect x="0" y="${r(fy)}" width="${c.width}" height="${r(c.height - fy)}" fill="${floor}"/>`;
  out += `<rect x="0" y="${r(fy - 10 * c.unit)}" width="${c.width}" height="${r(10 * c.unit)}" fill="${boardColor}" ${ln(c)}/>`;
  return out;
}

function windowFrame(c: Ctx, x: number, y: number, w: number, h: number, curtains: string | null): string {
  let out = rect(c, x, y, w, h, "#cfe8ff");
  out += `<path d="M${r(x + w / 2)} ${r(y)} V${r(y + h)} M${r(x)} ${r(y + h / 2)} H${r(x + w)}" ${ln(c)}/>`;
  if (curtains) {
    out += `<path d="M${r(x - 8)} ${r(y - 6)} h${r(w * 0.32)} q${r(-w * 0.12)} ${r(h * 0.6)} ${r(-w * 0.04)} ${r(h + 12)} h${r(-w * 0.28)} z" fill="${curtains}" ${ln(c)}/>`;
    out += `<path d="M${r(x + w + 8)} ${r(y - 6)} h${r(-w * 0.32)} q${r(w * 0.12)} ${r(h * 0.6)} ${r(w * 0.04)} ${r(h + 12)} h${r(w * 0.28)} z" fill="${curtains}" ${ln(c)}/>`;
  }
  return out;
}

function tree(c: Ctx, x: number, s = 1, leaf = "#7cc36b"): string {
  const u = c.unit * s;
  const base = c.floorY - 40 * c.unit;
  return rect(c, x - 12 * u, base - 190 * u, 24 * u, 190 * u, "#8b5a2b") +
    `<circle cx="${r(x)}" cy="${r(base - 230 * u)}" r="${r(85 * u)}" fill="${leaf}" ${ln(c)}/>` +
    `<circle cx="${r(x - 60 * u)}" cy="${r(base - 190 * u)}" r="${r(50 * u)}" fill="${leaf}" ${ln(c)}/>` +
    `<circle cx="${r(x + 60 * u)}" cy="${r(base - 190 * u)}" r="${r(50 * u)}" fill="${leaf}" ${ln(c)}/>`;
}

function bush(c: Ctx, x: number, y: number, s = 1): string {
  const u = c.unit * s;
  return `<path d="M${r(x - 50 * u)} ${r(y)} q0 ${r(-40 * u)} ${r(30 * u)} ${r(-34 * u)} q${r(14 * u)} ${r(-30 * u)} ${r(42 * u)} ${r(-8 * u)} ` +
    `q${r(30 * u)} ${r(-6 * u)} ${r(28 * u)} ${r(42 * u)} z" fill="#6fb35e" ${ln(c)}/>`;
}

function plant(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY;
  return `<path d="M${r(x - 22 * u)} ${r(y - 50 * u)} L${r(x + 22 * u)} ${r(y - 50 * u)} L${r(x + 16 * u)} ${r(y)} L${r(x - 16 * u)} ${r(y)} Z" fill="#c8693c" ${ln(c)}/>` +
    `<path d="M${r(x)} ${r(y - 50 * u)} q${r(-40 * u)} ${r(-40 * u)} ${r(-30 * u)} ${r(-90 * u)} q${r(26 * u)} ${r(30 * u)} ${r(30 * u)} ${r(90 * u)} ` +
    `q${r(10 * u)} ${r(-70 * u)} ${r(40 * u)} ${r(-80 * u)} q${r(6 * u)} ${r(50 * u)} ${r(-40 * u)} ${r(80 * u)}" fill="#5fae55" ${ln(c)}/>`;
}

function clock(c: Ctx, x: number, y: number): string {
  const u = c.unit;
  return `<circle cx="${r(x)}" cy="${r(y)}" r="${r(26 * u)}" fill="#ffffff" ${ln(c)}/>` +
    `<path d="M${r(x)} ${r(y)} V${r(y - 16 * u)} M${r(x)} ${r(y)} H${r(x + 12 * u)}" ${ln(c)}/>`;
}

function frame(c: Ctx, x: number, y: number, w: number, h: number, inner: string): string {
  return rect(c, x, y, w, h, "#d9a066") + rect(c, x + 8 * c.unit, y + 8 * c.unit, w - 16 * c.unit, h - 16 * c.unit, inner);
}

// ---------------------------------------------------------------- props
function bench(c: Ctx, x1: number, x2: number): string {
  const u = c.unit, wood = c.wood, y = c.seatY;
  const L = x1 - 70 * u, R = x2 + 70 * u;
  let out = "";
  for (const lx of [L + 14 * u, R - 22 * u]) out += rect(c, lx, y - 92 * u, 8 * u, 92 * u, "#4b5563");
  out += rect(c, L, y - 96 * u, R - L, 22 * u, wood, 4 * u) + rect(c, L, y - 64 * u, R - L, 22 * u, wood, 4 * u);
  for (const lx of [L + 12 * u, R - 24 * u]) out += rect(c, lx, y, 12 * u, c.floorY - y, "#4b5563");
  out += rect(c, L - 6 * u, y - 6 * u, R - L + 12 * u, 16 * u, wood, 4 * u);
  return out;
}

function sofa(c: Ctx, x1: number, x2: number): string {
  const u = c.unit, col = c.sofaCol, y = c.seatY;
  const L = x1 - 80 * u, R = x2 + 80 * u;
  let out = rect(c, L + 20 * u, y - 110 * u, R - L - 40 * u, 118 * u, col, 22 * u);
  out += rect(c, L, y - 50 * u, 40 * u, c.floorY - y + 30 * u, shade(col), 16 * u);
  out += rect(c, R - 40 * u, y - 50 * u, 40 * u, c.floorY - y + 30 * u, shade(col), 16 * u);
  out += rect(c, L + 36 * u, y - 6 * u, R - L - 72 * u, 30 * u, col, 10 * u);
  out += rect(c, L + 36 * u, y + 24 * u, R - L - 72 * u, c.floorY - y - 34 * u, shade(col));
  return out;
}

function bed(c: Ctx, x1: number, x2: number): string {
  const u = c.unit, y = c.seatY;
  const L = x1 - 90 * u, R = x2 + 110 * u;
  let out = rect(c, R - 26 * u, y - 140 * u, 26 * u, c.floorY - y + 140 * u, "#a0704a", 6 * u);
  out += rect(c, L, y - 4 * u, R - L - 20 * u, 26 * u, "#ffffff", 8 * u);
  out += rect(c, L, y + 20 * u, R - L - 20 * u, c.floorY - y - 30 * u, c.blanket, 4 * u);
  out += rect(c, R - 110 * u, y - 30 * u, 80 * u, 30 * u, "#ffffff", 12 * u);
  return out;
}

function chair(c: Ctx, x: number): string {
  const u = c.unit, wood = c.wood, y = c.seatY;
  let out = rect(c, x - 52 * u, y - 120 * u, 104 * u, 26 * u, wood, 6 * u);
  out += rect(c, x - 52 * u, y - 120 * u, 12 * u, 120 * u, wood) + rect(c, x + 40 * u, y - 120 * u, 12 * u, 120 * u, wood);
  out += rect(c, x - 50 * u, y, 10 * u, c.floorY - y, wood) + rect(c, x + 40 * u, y, 10 * u, c.floorY - y, wood);
  out += rect(c, x - 58 * u, y - 6 * u, 116 * u, 14 * u, wood, 3 * u);
  return out;
}

function table(c: Ctx, x: number, laptop: boolean): string {
  const u = c.unit, top = c.floorY - 150 * u, wood = c.wood;
  let out = rect(c, x - 70 * u, top, 12 * u, c.floorY - top, wood) + rect(c, x + 58 * u, top, 12 * u, c.floorY - top, wood);
  out += rect(c, x - 90 * u, top - 12 * u, 180 * u, 14 * u, wood, 3 * u);
  if (laptop) {
    out += `<path d="M${r(x - 34 * u)} ${r(top - 12 * u)} L${r(x - 26 * u)} ${r(top - 62 * u)} L${r(x + 30 * u)} ${r(top - 62 * u)} L${r(x + 34 * u)} ${r(top - 12 * u)} Z" fill="#9ca3af" ${ln(c)}/>`;
  } else {
    out += rect(c, x - 30 * u, top - 34 * u, 22 * u, 22 * u, "#ffffff", 3 * u);
    out += `<ellipse cx="${r(x + 24 * u)}" cy="${r(top - 16 * u)}" rx="${r(26 * u)}" ry="${r(6 * u)}" fill="#ffffff" ${ln(c)}/>`;
  }
  return out;
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.round(v * 0.82));
  return `#${((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, "0")}`;
}

// ----------------------------------------------------------------- places
// -------------------------------------------------------- variety helpers
// Every video gets its own look (user, 2026-11-16: videos must not all
// look the same): colours, time of day, furniture and decorations are
// picked from a seed that the backend gives each scene.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(c: Ctx, list: readonly T[]): T => list[Math.floor(c.rng() * list.length)]!;

const SKIES = [
  { top: "#9fd4ff", bottom: "#e8f6ff", sun: "#ffd54a", night: false },   // day
  { top: "#7ec8ff", bottom: "#d9f0ff", sun: "#ffe066", night: false },   // bright day
  { top: "#ffb37a", bottom: "#ffe3b8", sun: "#ff7b3a", night: false },   // sunset
  { top: "#2b3a67", bottom: "#5a6aa0", sun: "#f8f4d7", night: true },    // night (moon)
] as const;
const WALLS = ["#f6e7d2", "#e3f0e6", "#e6eefb", "#fbe3e8", "#f3ead0", "#ece4f7", "#fff2cc", "#e0f2f1"];
const FLOORS = ["#c99a6b", "#b98b5e", "#a8744f", "#c4ab84", "#9aa7b4", "#d6c2a3"];
const ACCENTS = ["#e07a5f", "#3d84c6", "#81b29a", "#f2cc8f", "#9b8bd4", "#e76f51", "#2a9d8f", "#c0392b"];

function skyBlock(c: Ctx): { svg: string; night: boolean } {
  const s = pick(c, SKIES);
  const W = c.width, u = c.unit;
  let out = sky(c, s.top, s.bottom);
  const sx = W * (0.1 + c.rng() * 0.8);
  out += `<circle cx="${r(sx)}" cy="${r(c.height * 0.12)}" r="${r(40 * u)}" fill="${s.sun}" ${ln(c)}/>`;
  if (s.night) {
    for (let i = 0; i < 18; i++) {
      out += `<circle cx="${r(c.rng() * W)}" cy="${r(c.rng() * c.height * 0.35)}" r="${r(2.5 * u)}" fill="#ffffff"/>`;
    }
  } else {
    const n = 1 + Math.floor(c.rng() * 3);
    for (let i = 0; i < n; i++) out += cloud(c, W * c.rng(), c.height * (0.06 + c.rng() * 0.14), 0.7 + c.rng() * 0.5);
    if (c.rng() < 0.5) {
      for (let i = 0; i < 3; i++) {
        const bx = W * (0.3 + c.rng() * 0.4), by = c.height * (0.12 + c.rng() * 0.1);
        out += `<path d="M${r(bx - 10 * u)} ${r(by)} q${r(5 * u)} ${r(-6 * u)} ${r(10 * u)} 0 q${r(5 * u)} ${r(-6 * u)} ${r(10 * u)} 0" fill="none" ${ln(c, c.sw * 0.7)}/>`;
      }
    }
  }
  return { svg: out, night: s.night };
}

function flower(c: Ctx, x: number, y: number): string {
  const u = c.unit, col = pick(c, ["#ef4444", "#f59e0b", "#ec4899", "#a855f7", "#ffffff"]);
  return `<line x1="${r(x)}" y1="${r(y)}" x2="${r(x)}" y2="${r(y - 26 * u)}" stroke="#4d7c0f" stroke-width="${r(c.sw)}"/>` +
    `<circle cx="${r(x)}" cy="${r(y - 30 * u)}" r="${r(8 * u)}" fill="${col}" ${ln(c, c.sw * 0.7)}/>`;
}

function lamp(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY;
  return rect(c, x - 4 * u, y - 260 * u, 8 * u, 260 * u, "#4b5563") +
    `<path d="M${r(x - 34 * u)} ${r(y - 250 * u)} L${r(x + 34 * u)} ${r(y - 250 * u)} L${r(x + 22 * u)} ${r(y - 300 * u)} L${r(x - 22 * u)} ${r(y - 300 * u)} Z" fill="${pick(c, ["#fde68a", "#fecaca", "#bfdbfe"])}" ${ln(c)}/>`;
}

function bookshelf(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  let out = rect(c, x - 70 * u, y - 300 * u, 140 * u, 300 * u, "#a0704a", 4 * u);
  for (let row = 0; row < 3; row++) {
    const sy = y - 290 * u + row * 98 * u;
    out += rect(c, x - 62 * u, sy + 80 * u, 124 * u, 8 * u, "#7c4f2c");
    for (let bx = x - 58 * u; bx < x + 50 * u; bx += 16 * u) {
      const h = (50 + c.rng() * 26) * u;
      out += rect(c, bx, sy + 80 * u - h, 13 * u, h, pick(c, ACCENTS));
    }
  }
  return out;
}

function tv(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  return rect(c, x - 80 * u, y - 70 * u, 160 * u, 70 * u, "#8b5a2b", 4 * u) +
    rect(c, x - 90 * u, y - 200 * u, 180 * u, 115 * u, "#1f2937", 6 * u) +
    rect(c, x - 80 * u, y - 192 * u, 160 * u, 99 * u, pick(c, ["#60a5fa", "#34d399", "#fbbf24"]), 2 * u);
}

function rug(c: Ctx): string {
  const u = c.unit;
  return `<ellipse cx="${r(c.width / 2)}" cy="${r(c.floorY + 6 * u)}" rx="${r(c.width * 0.32)}" ry="${r(24 * u)}" fill="${pick(c, ACCENTS)}" opacity="0.55"/>`;
}

function poster(c: Ctx, x: number, y: number): string {
  const u = c.unit;
  return frame(c, x, y, (80 + c.rng() * 50) * u, (90 + c.rng() * 40) * u, pick(c, ACCENTS));
}

function car(c: Ctx, x: number, y: number): string {
  const u = c.unit, col = pick(c, ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#ffffff"]);
  return `<path d="M${r(x - 110 * u)} ${r(y - 20 * u)} L${r(x - 100 * u)} ${r(y - 60 * u)} L${r(x - 50 * u)} ${r(y - 64 * u)} L${r(x - 20 * u)} ${r(y - 100 * u)} L${r(x + 50 * u)} ${r(y - 100 * u)} L${r(x + 80 * u)} ${r(y - 62 * u)} L${r(x + 110 * u)} ${r(y - 56 * u)} L${r(x + 112 * u)} ${r(y - 20 * u)} Z" fill="${col}" ${ln(c)}/>` +
    `<path d="M${r(x - 12 * u)} ${r(y - 92 * u)} L${r(x + 44 * u)} ${r(y - 92 * u)} L${r(x + 66 * u)} ${r(y - 64 * u)} L${r(x - 34 * u)} ${r(y - 64 * u)} Z" fill="#cfe8ff" ${ln(c)}/>` +
    `<circle cx="${r(x - 64 * u)}" cy="${r(y - 16 * u)}" r="${r(20 * u)}" fill="#1f2937" ${ln(c)}/><circle cx="${r(x + 66 * u)}" cy="${r(y - 16 * u)}" r="${r(20 * u)}" fill="#1f2937" ${ln(c)}/>`;
}

// ----------------------------------------------------------------- places
function park(c: Ctx): string {
  const { width: W, unit: u } = c;
  const g = c.floorY - 40 * u;
  const s = skyBlock(c);
  let out = s.svg;
  const hill = s.night ? "#5b7b5a" : pick(c, ["#b8e0a0", "#a7d68f", "#c5e4a5"]);
  const grass = s.night ? "#4d6b49" : pick(c, ["#9fd07f", "#8cc66b", "#a8d88a"]);
  out += `<path d="M0 ${r(g - 60 * u)} Q${r(W * (0.15 + c.rng() * 0.2))} ${r(g - (120 + c.rng() * 60) * u)} ${r(W * 0.5)} ${r(g - 70 * u)} T${W} ${r(g - (60 + c.rng() * 60) * u)} V${c.height} H0 Z" fill="${hill}" ${ln(c)}/>`;
  out += `<rect x="0" y="${r(g)}" width="${W}" height="${r(c.height - g)}" fill="${grass}"/>`;
  out += `<line x1="0" y1="${r(g)}" x2="${W}" y2="${r(g)}" ${ln(c)}/>`;
  const leaves = ["#7cc36b", "#8bcf74", "#5fae55", "#a3d977", "#e6a23c"];
  out += tree(c, W * (0.03 + c.rng() * 0.06), 0.85 + c.rng() * 0.3, pick(c, leaves));
  out += tree(c, W * (0.91 + c.rng() * 0.06), 0.8 + c.rng() * 0.3, pick(c, leaves));
  if (c.rng() < 0.5) out += tree(c, W * (0.2 + c.rng() * 0.1), 0.6, pick(c, leaves));
  out += bush(c, W * (0.15 + c.rng() * 0.1), g, 0.7 + c.rng() * 0.3) + bush(c, W * (0.78 + c.rng() * 0.1), g, 0.7 + c.rng() * 0.3);
  if (c.rng() < 0.6) out += lamp(c, W * (0.12 + c.rng() * 0.05));
  for (let i = 0; i < 6; i++) out += flower(c, W * c.rng(), c.floorY + (10 + c.rng() * 30) * u);
  return out;
}

function street(c: Ctx): string {
  const { width: W, unit: u } = c;
  const g = c.floorY - 60 * u;
  const s = skyBlock(c);
  let out = s.svg;
  const colors = ["#f4c27a", "#e9967a", "#a8c8e8", "#c9a7e0", "#f2e394", "#9fd3b0", "#f0b6c8", "#d4a373", "#cdb4db"];
  const signs = ["CHAI", "TAILOR", "MOBILE", "BAKERY", "PHARMACY", "BOOKS", "PIZZA", "HOTEL"];
  const bw = (200 + c.rng() * 60) * u;
  let i = 0;
  for (let x = -c.rng() * 60 * u; x < W; x += bw, i++) {
    const h = (280 + c.rng() * 200) * u;
    out += rect(c, x, g - h, bw, h, pick(c, colors));
    const win = s.night ? "#fde68a" : "#dff1ff";
    for (let wy = g - h + 30 * u; wy < g - 140 * u; wy += 90 * u) {
      out += rect(c, x + 30 * u, wy, 60 * u, 50 * u, win) + rect(c, x + bw - 90 * u, wy, 60 * u, 50 * u, win);
    }
    if (c.rng() < 0.5) {
      out += rect(c, x + bw / 2 - 30 * u, g - 100 * u, 60 * u, 100 * u, "#8b5a2b");
    } else {
      out += `<path d="M${r(x + 10 * u)} ${r(g - 130 * u)} h${r(bw - 20 * u)} l${r(-16 * u)} ${r(36 * u)} h${r(-(bw - 52 * u))} z" fill="${pick(c, ["#e74c3c", "#2a9d8f", "#f59e0b", "#3b82f6"])}" ${ln(c)}/>`;
      out += rect(c, x + 24 * u, g - 175 * u, bw - 48 * u, 38 * u, "#ffffff", 4 * u);
      out += `<text x="${r(x + bw / 2)}" y="${r(g - 148 * u)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${r(26 * u)}" fill="#1f2937">${pick(c, signs)}</text>`;
    }
  }
  if (c.rng() < 0.7) {
    const px = W * (0.4 + c.rng() * 0.2);
    out += rect(c, px - 6 * u, g - 420 * u, 12 * u, 420 * u, "#6b7280");
    out += `<path d="M0 ${r(g - 380 * u)} Q${r(px / 2)} ${r(g - 340 * u)} ${r(px)} ${r(g - 400 * u)} T${W} ${r(g - 370 * u)}" fill="none" ${ln(c)}/>`;
  }
  out += `<rect x="0" y="${r(g)}" width="${W}" height="${r(c.height - g)}" fill="${pick(c, ["#d6d3d1", "#cbd5e1", "#d4c5b0"])}"/>`;
  out += `<line x1="0" y1="${r(g)}" x2="${W}" y2="${r(g)}" ${ln(c)}/>`;
  if (c.rng() < 0.5) out += car(c, W * (c.rng() < 0.5 ? 0.1 : 0.9), g + 4 * u);
  return out;
}

function home(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, WALLS), pick(c, FLOORS));
  const winX = W * (0.35 + c.rng() * 0.3);
  out += windowFrame(c, winX - 110 * u, c.floorY - 470 * u, 220 * u, 160 * u, pick(c, ACCENTS));
  const left = c.rng() < 0.5;
  out += left ? bookshelf(c, W * 0.08) : tv(c, W * 0.1);
  out += c.rng() < 0.5 ? poster(c, W * 0.78, c.floorY - 450 * u) : lamp(c, W * 0.9);
  out += plant(c, W * (left ? 0.96 : 0.03));
  if (c.rng() < 0.6) out += rug(c);
  return out;
}

function office(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#e3ebf3", "#eef2f7", "#e7efe9", "#f3f0e8"]), pick(c, ["#9aa7b4", "#a3a3a3", "#b8b2a7"]));
  const wx = c.rng() < 0.5 ? W * 0.08 : W * 0.75;
  out += windowFrame(c, wx, c.floorY - 470 * u, 200 * u, 170 * u, null);
  for (let y = c.floorY - 460 * u; y < c.floorY - 310 * u; y += 18 * u) {
    out += `<line x1="${r(wx)}" y1="${r(y)}" x2="${r(wx + 200 * u)}" y2="${r(y)}" stroke="#9fb3c8" stroke-width="${c.sw * 0.6}"/>`;
  }
  out += rect(c, W * 0.5 - 140 * u, c.floorY - 480 * u, 280 * u, 150 * u, "#ffffff", 6 * u);
  let d = `M${r(W * 0.5 - 110 * u)} ${r(c.floorY - 380 * u)}`;
  for (let i = 0; i < 4; i++) d += ` l${r(55 * u)} ${r((c.rng() - 0.6) * 70 * u)}`;
  out += `<path d="${d}" fill="none" stroke="${pick(c, ["#e74c3c", "#16a34a", "#2563eb"])}" stroke-width="${c.sw * 1.3}"/>`;
  out += clock(c, wx < W / 2 ? W * 0.86 : W * 0.14, c.floorY - 430 * u);
  out += c.rng() < 0.5 ? bookshelf(c, wx < W / 2 ? W * 0.93 : W * 0.07) : plant(c, W * 0.95);
  return out;
}

function classroom(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#f3ead0", "#e6eefb", "#e3f0e6", "#fbe3e8"]), pick(c, FLOORS));
  out += rect(c, W * 0.5 - 220 * u, c.floorY - 500 * u, 440 * u, 190 * u, pick(c, ["#2f5d50", "#1f3b2c", "#334155"]), 6 * u);
  out += `<path d="M${r(W * 0.5 - 180 * u)} ${r(c.floorY - 450 * u)} h${r((100 + c.rng() * 120) * u)} M${r(W * 0.5 - 180 * u)} ${r(c.floorY - 410 * u)} h${r((140 + c.rng() * 120) * u)} M${r(W * 0.5 - 180 * u)} ${r(c.floorY - 370 * u)} h${r((80 + c.rng() * 80) * u)}" stroke="#f5f5f5" stroke-width="${c.sw}" stroke-linecap="round"/>`;
  out += `<text x="${r(W * 0.5 + 110 * u)}" y="${r(c.floorY - 380 * u)}" font-family="Arial" font-weight="bold" font-size="${r(34 * u)}" fill="#f5f5f5">${pick(c, ["A+B", "2+2=4", "ABC", "E=mc²", "x+y", "1-10"])}</text>`;
  out += clock(c, W * (c.rng() < 0.5 ? 0.12 : 0.88), c.floorY - 440 * u);
  out += poster(c, W * (c.rng() < 0.5 ? 0.8 : 0.08), c.floorY - 470 * u);
  return out;
}

function kitchen(c: Ctx): string {
  const { width: W, unit: u } = c;
  const tile = pick(c, ["#e4f2ec", "#eef2ff", "#fff7ed", "#f0fdf4"]);
  const wood = pick(c, ["#f2c38b", "#e7b98c", "#cbd5e1", "#fca5a5", "#a7f3d0"]);
  let out = wall(c, tile, pick(c, ["#c9c2b8", "#b8b2a7", "#d6d3d1"]));
  for (let x = 0; x < W; x += 40 * u) out += `<line x1="${r(x)}" y1="0" x2="${r(x)}" y2="${r(c.floorY - 80 * u)}" stroke="#d1d5db" stroke-width="${c.sw * 0.5}"/>`;
  for (let x = 0; x < W; x += 170 * u) out += rect(c, x, c.floorY - 560 * u, 160 * u, 110 * u, wood, 6 * u);
  out += rect(c, -10, c.floorY - 220 * u, W + 20, 18 * u, "#9ca3af");
  for (let x = 0; x < W; x += 170 * u) out += rect(c, x, c.floorY - 202 * u, 160 * u, 132 * u, wood, 4 * u);
  out += rect(c, W * (c.rng() < 0.5 ? 0.92 : 0.0), c.floorY - 400 * u, 120 * u, 330 * u, "#e5e7eb", 10 * u);
  return out;
}

function bedroom(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, WALLS), pick(c, FLOORS));
  out += windowFrame(c, W * (0.35 + c.rng() * 0.25) - 100 * u, c.floorY - 470 * u, 200 * u, 150 * u, pick(c, ACCENTS));
  out += rect(c, W * 0.9, c.floorY - 420 * u, 160 * u, 350 * u, pick(c, ["#a0704a", "#8b5e3c", "#d6c2a3"]), 6 * u);
  out += poster(c, W * 0.1, c.floorY - 450 * u);
  if (c.rng() < 0.6) out += lamp(c, W * 0.06);
  if (c.rng() < 0.6) out += rug(c);
  return out;
}

function shop(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#fde7c8", "#e0f2fe", "#fef9c3", "#fce7f3"]), pick(c, FLOORS));
  const colors = ["#e74c3c", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#14b8a6"];
  for (let row = 0; row < 3; row++) {
    const y = c.floorY - 470 * u + row * 110 * u;
    out += rect(c, 0, y + 70 * u, W, 10 * u, "#a0704a");
    for (let x = 20 * u; x < W - 40 * u; x += (60 + c.rng() * 30) * u) {
      const h = (36 + c.rng() * 22) * u;
      out += rect(c, x, y + 70 * u - h, (40 + c.rng() * 14) * u, h, pick(c, colors), 4 * u);
    }
  }
  return out;
}

function restaurant(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#f7d9c4", "#fde68a", "#d1fae5", "#e0e7ff"]), pick(c, FLOORS));
  const lampCol = pick(c, ["#ffd54a", "#fca5a5", "#93c5fd"]);
  for (const x of [0.2, 0.5, 0.8]) {
    out += `<line x1="${r(W * x)}" y1="0" x2="${r(W * x)}" y2="${r(c.floorY - 520 * u)}" ${ln(c)}/>`;
    out += `<path d="M${r(W * x - 40 * u)} ${r(c.floorY - 480 * u)} Q${r(W * x)} ${r(c.floorY - 560 * u)} ${r(W * x + 40 * u)} ${r(c.floorY - 480 * u)} Z" fill="${lampCol}" ${ln(c)}/>`;
  }
  const cur = pick(c, ACCENTS);
  out += windowFrame(c, W * 0.06, c.floorY - 430 * u, 160 * u, 130 * u, cur);
  out += windowFrame(c, W * 0.94 - 160 * u, c.floorY - 430 * u, 160 * u, 130 * u, cur);
  return out;
}

function police(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#dde6ef", "#e5e7eb", "#e0f2fe"]), pick(c, ["#9aa5b1", "#a3a3a3"]));
  out += rect(c, W * 0.5 - 150 * u, c.floorY - 480 * u, 300 * u, 170 * u, "#c8a27a", 6 * u);
  for (let i = 0; i < 3; i++) {
    out += rect(c, W * 0.5 - 130 * u + i * 95 * u, c.floorY - 460 * u, 75 * u, 95 * u, "#ffffff");
    out += `<circle cx="${r(W * 0.5 - 92 * u + i * 95 * u)}" cy="${r(c.floorY - 425 * u)}" r="${r(16 * u)}" fill="#e5e7eb" ${ln(c)}/>`;
  }
  const bars = c.rng() < 0.5 ? W * 0.86 : 0;
  for (let x = bars; x < bars + W * 0.14; x += 34 * u) out += rect(c, x, c.floorY - 560 * u, 10 * u, 490 * u, "#6b7280");
  out += rect(c, bars - 10 * u, c.floorY - 560 * u, W * 0.16, 16 * u, "#6b7280");
  return out;
}

function plain(c: Ctx): string {
  return sky(c, "#f8fafc", "#e2e8f0") +
    `<line x1="0" y1="${r(c.floorY - 4 * c.unit)}" x2="${c.width}" y2="${r(c.floorY - 4 * c.unit)}" ${ln(c)}/>`;
}

// ----------------------------------------------------- more furniture
function door(c: Ctx, x: number, col?: string): string {
  const u = c.unit, y = c.floorY - 70 * u, w = 120 * u, h = 300 * u;
  const fill = col ?? pick(c, ["#a0704a", "#8b5e3c", "#5b84b1", "#b15b5b", "#ffffff", "#2a9d8f"]);
  return rect(c, x - w / 2 - 10 * u, y - h - 10 * u, w + 20 * u, h + 10 * u, "#e7d3b5") +
    rect(c, x - w / 2, y - h, w, h, fill, 3 * u) +
    rect(c, x - w / 2 + 16 * u, y - h + 20 * u, w - 32 * u, 100 * u, shade(fill), 3 * u) +
    rect(c, x - w / 2 + 16 * u, y - h + 140 * u, w - 32 * u, 130 * u, shade(fill), 3 * u) +
    `<circle cx="${r(x + w / 2 - 18 * u)}" cy="${r(y - h / 2)}" r="${r(7 * u)}" fill="#fbbf24" ${ln(c)}/>`;
}
function globe(c: Ctx, x: number, y: number): string {
  const u = c.unit;
  return rect(c, x - 30 * u, y + 46 * u, 60 * u, 10 * u, "#6b4f3a") + rect(c, x - 4 * u, y + 30 * u, 8 * u, 18 * u, "#6b4f3a") +
    `<circle cx="${r(x)}" cy="${r(y)}" r="${r(34 * u)}" fill="#7dd3fc" ${ln(c)}/>` +
    `<path d="M${r(x - 20 * u)} ${r(y - 14 * u)} q${r(14 * u)} ${r(-8 * u)} ${r(20 * u)} ${r(6 * u)} q${r(-6 * u)} ${r(18 * u)} ${r(-18 * u)} ${r(10 * u)} z M${r(x + 8 * u)} ${r(y + 8 * u)} q${r(16 * u)} 0 ${r(14 * u)} ${r(16 * u)} q${r(-12 * u)} ${r(4 * u)} ${r(-14 * u)} ${r(-16 * u)} z" fill="#86efac" ${ln(c, c.sw * 0.7)}/>`;
}
function deskRow(c: Ctx, y: number, n: number, s: number): string {
  // small desks far behind the characters (a full classroom)
  const u = c.unit * s;
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = c.width * (i + 0.5) / n;
    out += rect(c, x - 60 * u, y - 60 * u, 120 * u, 12 * u, c.wood, 2 * u) +
      rect(c, x - 52 * u, y - 48 * u, 10 * u, 48 * u, c.wood) + rect(c, x + 42 * u, y - 48 * u, 10 * u, 48 * u, c.wood) +
      rect(c, x - 20 * u, y - 82 * u, 30 * u, 22 * u, pick(c, ACCENTS), 2 * u);
  }
  return out;
}
function lockers(c: Ctx, x0: number, x1: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  const col = pick(c, ["#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a78bfa"]);
  let out = "";
  for (let x = x0; x < x1 - 60 * u; x += 66 * u) {
    out += rect(c, x, y - 300 * u, 62 * u, 300 * u, col, 2 * u);
    for (let k = 0; k < 4; k++) out += `<line x1="${r(x + 14 * u)}" y1="${r(y - 280 * u + k * 9 * u)}" x2="${r(x + 48 * u)}" y2="${r(y - 280 * u + k * 9 * u)}" ${ln(c, c.sw * 0.6)}/>`;
    out += rect(c, x + 46 * u, y - 170 * u, 8 * u, 24 * u, "#e5e7eb");
  }
  return out;
}
function fridge(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY - 70 * u, col = pick(c, ["#e5e7eb", "#fca5a5", "#bfdbfe", "#d1fae5"]);
  return rect(c, x - 70 * u, y - 380 * u, 140 * u, 380 * u, col, 14 * u) +
    `<line x1="${r(x - 70 * u)}" y1="${r(y - 250 * u)}" x2="${r(x + 70 * u)}" y2="${r(y - 250 * u)}" ${ln(c)}/>` +
    rect(c, x + 44 * u, y - 330 * u, 10 * u, 50 * u, "#9ca3af", 4 * u) + rect(c, x + 44 * u, y - 220 * u, 10 * u, 60 * u, "#9ca3af", 4 * u) +
    rect(c, x - 40 * u, y - 340 * u, 30 * u, 30 * u, pick(c, ACCENTS), 4 * u);
}
function stove(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  return rect(c, x - 90 * u, y - 160 * u, 180 * u, 160 * u, "#d1d5db", 4 * u) +
    rect(c, x - 70 * u, y - 120 * u, 140 * u, 90 * u, "#1f2937", 4 * u) +
    `<path d="M${r(x - 60 * u)} ${r(y - 160 * u)} h${r(70 * u)} v${r(-50 * u)} q${r(-35 * u)} ${r(-10 * u)} ${r(-70 * u)} 0 z" fill="#9ca3af" ${ln(c)}/>` +
    `<path d="M${r(x - 40 * u)} ${r(y - 225 * u)} q${r(-10 * u)} ${r(-20 * u)} 0 ${r(-40 * u)} M${r(x - 20 * u)} ${r(y - 225 * u)} q${r(-10 * u)} ${r(-20 * u)} 0 ${r(-40 * u)}" fill="none" stroke="#9ca3af" stroke-width="${r(c.sw)}" stroke-linecap="round"/>`;
}
function menuBoard(c: Ctx, x: number, y: number, title: string): string {
  const u = c.unit;
  let out = rect(c, x - 140 * u, y, 280 * u, 170 * u, "#1f2937", 8 * u);
  out += `<text x="${r(x)}" y="${r(y + 38 * u)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${r(28 * u)}" fill="#fde68a">${title}</text>`;
  for (let i = 0; i < 4; i++) {
    out += `<line x1="${r(x - 110 * u)}" y1="${r(y + 70 * u + i * 26 * u)}" x2="${r(x + (40 + c.rng() * 50) * u)}" y2="${r(y + 70 * u + i * 26 * u)}" stroke="#f5f5f5" stroke-width="${r(c.sw)}" stroke-linecap="round"/>`;
    out += `<circle cx="${r(x + 110 * u)}" cy="${r(y + 70 * u + i * 26 * u)}" r="${r(5 * u)}" fill="#fde68a"/>`;
  }
  return out;
}
function counter(c: Ctx, x0: number, x1: number, col: string): string {
  const u = c.unit, y = c.floorY - 70 * u;
  return rect(c, x0, y - 150 * u, x1 - x0, 150 * u, col, 4 * u) + rect(c, x0 - 10 * u, y - 165 * u, x1 - x0 + 20 * u, 18 * u, shade(col), 4 * u);
}
function crates(c: Ctx, x0: number, x1: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  let out = "";
  for (let x = x0; x < x1 - 100 * u; x += 120 * u) {
    out += rect(c, x, y - 80 * u, 110 * u, 80 * u, "#c08552", 3 * u);
    const fruit = pick(c, ["#ef4444", "#f59e0b", "#84cc16", "#fde047", "#a855f7"]);
    for (let k = 0; k < 5; k++) out += `<circle cx="${r(x + 16 * u + k * 20 * u)}" cy="${r(y - 86 * u - (k % 2) * 10 * u)}" r="${r(13 * u)}" fill="${fruit}" ${ln(c, c.sw * 0.7)}/>`;
  }
  return out;
}
function clothesRack(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  let out = rect(c, x - 110 * u, y - 330 * u, 220 * u, 10 * u, "#6b7280") + rect(c, x - 110 * u, y - 330 * u, 10 * u, 330 * u, "#6b7280") + rect(c, x + 100 * u, y - 330 * u, 10 * u, 330 * u, "#6b7280");
  for (let k = 0; k < 6; k++) {
    const sx = x - 90 * u + k * 36 * u, col = pick(c, ACCENTS);
    out += `<path d="M${r(sx)} ${r(y - 300 * u)} l${r(-18 * u)} ${r(20 * u)} v${r(120 * u)} h${r(36 * u)} v${r(-120 * u)} z" fill="${col}" ${ln(c, c.sw * 0.7)}/>`;
  }
  return out;
}
function tvWall(c: Ctx): string {
  const u = c.unit;
  let out = "";
  for (let row = 0; row < 2; row++) for (let k = 0; k < 4; k++) {
    const x = c.width * (0.14 + k * 0.24), y = c.floorY - 520 * u + row * 140 * u;
    out += rect(c, x - 90 * u, y, 180 * u, 110 * u, "#1f2937", 6 * u) + rect(c, x - 80 * u, y + 8 * u, 160 * u, 94 * u, pick(c, ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"]), 2 * u);
  }
  return out;
}
function fence(c: Ctx, y: number): string {
  const u = c.unit, col = pick(c, ["#ffffff", "#d6b98c", "#a0704a"]);
  let out = rect(c, -10, y - 70 * u, c.width + 20, 12 * u, col) + rect(c, -10, y - 36 * u, c.width + 20, 12 * u, col);
  for (let x = 10 * u; x < c.width; x += 46 * u) out += `<path d="M${r(x)} ${r(y)} V${r(y - 90 * u)} l${r(12 * u)} ${r(-14 * u)} l${r(12 * u)} ${r(14 * u)} V${r(y)} Z" fill="${col}" ${ln(c, c.sw * 0.8)}/>`;
  return out;
}
function swing(c: Ctx, x: number): string {
  const u = c.unit, g = c.floorY - 40 * u;
  return `<path d="M${r(x - 120 * u)} ${r(g)} L${r(x - 80 * u)} ${r(g - 300 * u)} L${r(x + 80 * u)} ${r(g - 300 * u)} L${r(x + 120 * u)} ${r(g)}" fill="none" stroke="#ef4444" stroke-width="${r(c.sw * 3)}" stroke-linejoin="round"/>` +
    `<path d="M${r(x - 30 * u)} ${r(g - 296 * u)} V${r(g - 90 * u)} M${r(x + 30 * u)} ${r(g - 296 * u)} V${r(g - 90 * u)}" ${ln(c)}/>` +
    rect(c, x - 40 * u, g - 92 * u, 80 * u, 12 * u, "#fbbf24", 3 * u);
}
function slide(c: Ctx, x: number): string {
  const u = c.unit, g = c.floorY - 40 * u;
  return rect(c, x - 10 * u, g - 220 * u, 12 * u, 220 * u, "#3b82f6") + rect(c, x + 50 * u, g - 220 * u, 12 * u, 220 * u, "#3b82f6") +
    `<path d="M${r(x)} ${r(g - 220 * u)} h${r(60 * u)} l${r(150 * u)} ${r(210 * u)} h${r(-40 * u)} z" fill="#f59e0b" ${ln(c)}/>`;
}
function pond(c: Ctx, x: number): string {
  const u = c.unit, g = c.floorY + 10 * u;
  return `<ellipse cx="${r(x)}" cy="${r(g)}" rx="${r(180 * u)}" ry="${r(30 * u)}" fill="#7dd3fc" ${ln(c)}/>` +
    `<path d="M${r(x - 150 * u)} ${r(g - 10 * u)} q${r(-6 * u)} ${r(-50 * u)} ${r(6 * u)} ${r(-70 * u)} M${r(x - 140 * u)} ${r(g - 6 * u)} q${r(10 * u)} ${r(-40 * u)} ${r(20 * u)} ${r(-56 * u)}" fill="none" stroke="#4d7c0f" stroke-width="${r(c.sw)}"/>`;
}
function skyline(c: Ctx, base: number, night: boolean): string {
  const u = c.unit;
  let out = "";
  for (let x = 0; x < c.width; x += (60 + c.rng() * 50) * u) {
    const h = (120 + c.rng() * 180) * u, w = (50 + c.rng() * 40) * u;
    out += `<rect x="${r(x)}" y="${r(base - h)}" width="${r(w)}" height="${r(h)}" fill="${night ? "#3b4a7a" : "#b8c7dd"}"/>`;
  }
  return out;
}
function streetLight(c: Ctx, x: number, g: number): string {
  const u = c.unit;
  return rect(c, x - 5 * u, g - 360 * u, 10 * u, 360 * u, "#4b5563") +
    `<path d="M${r(x)} ${r(g - 355 * u)} q${r(30 * u)} ${r(-20 * u)} ${r(60 * u)} 0" fill="none" ${ln(c)}/>` +
    `<path d="M${r(x + 40 * u)} ${r(g - 355 * u)} h${r(40 * u)} l${r(-8 * u)} ${r(18 * u)} h${r(-24 * u)} z" fill="#fde68a" ${ln(c)}/>`;
}
function trafficLight(c: Ctx, x: number, g: number): string {
  const u = c.unit;
  return rect(c, x - 5 * u, g - 300 * u, 10 * u, 300 * u, "#4b5563") + rect(c, x - 24 * u, g - 420 * u, 48 * u, 124 * u, "#1f2937", 8 * u) +
    `<circle cx="${r(x)}" cy="${r(g - 396 * u)}" r="${r(13 * u)}" fill="#ef4444"/><circle cx="${r(x)}" cy="${r(g - 358 * u)}" r="${r(13 * u)}" fill="#facc15"/><circle cx="${r(x)}" cy="${r(g - 320 * u)}" r="${r(13 * u)}" fill="#22c55e"/>`;
}
function house(c: Ctx, x: number, g: number, w: number): string {
  const u = c.unit, col = pick(c, ["#f4c27a", "#e9967a", "#a8c8e8", "#c9a7e0", "#9fd3b0", "#f0b6c8"]);
  const h = (200 + c.rng() * 80) * u;
  return rect(c, x, g - h, w, h, col) +
    `<path d="M${r(x - 20 * u)} ${r(g - h)} L${r(x + w / 2)} ${r(g - h - 110 * u)} L${r(x + w + 20 * u)} ${r(g - h)} Z" fill="${pick(c, ["#b45309", "#7c2d12", "#475569", "#991b1b"])}" ${ln(c)}/>` +
    rect(c, x + w / 2 - 30 * u, g - 110 * u, 60 * u, 110 * u, "#8b5a2b") +
    windowFrame(c, x + 20 * u, g - h + 30 * u, 60 * u, 50 * u, null) + windowFrame(c, x + w - 80 * u, g - h + 30 * u, 60 * u, 50 * u, null);
}
function fireplace(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  return rect(c, x - 130 * u, y - 230 * u, 260 * u, 230 * u, "#b45309", 4 * u) + rect(c, x - 150 * u, y - 250 * u, 300 * u, 24 * u, "#78350f", 4 * u) +
    rect(c, x - 80 * u, y - 150 * u, 160 * u, 150 * u, "#1f2937", 40 * u) +
    `<path d="M${r(x - 40 * u)} ${r(y)} q${r(-10 * u)} ${r(-60 * u)} ${r(20 * u)} ${r(-100 * u)} q0 ${r(50 * u)} ${r(20 * u)} ${r(40 * u)} q${r(20 * u)} ${r(30 * u)} ${r(10 * u)} ${r(60 * u)} z" fill="#f97316" ${ln(c, c.sw * 0.7)}/>`;
}
function chandelier(c: Ctx, x: number): string {
  const u = c.unit;
  return `<line x1="${r(x)}" y1="0" x2="${r(x)}" y2="${r(c.floorY - 560 * u)}" ${ln(c)}/>` +
    `<path d="M${r(x - 80 * u)} ${r(c.floorY - 540 * u)} q${r(80 * u)} ${r(40 * u)} ${r(160 * u)} 0" fill="none" ${ln(c)}/>` +
    [-80, -40, 0, 40, 80].map((d) => `<circle cx="${r(x + d * u)}" cy="${r(c.floorY - 530 * u + Math.abs(d) * -0.1 * u)}" r="${r(10 * u)}" fill="#fde68a" ${ln(c, c.sw * 0.7)}/>`).join("");
}
function cubicles(c: Ctx): string {
  const u = c.unit, y = c.floorY - 70 * u;
  let out = "";
  for (let k = 0; k < 4; k++) {
    const x = c.width * (0.12 + k * 0.26);
    out += rect(c, x - 110 * u, y - 170 * u, 220 * u, 170 * u, "#cbd5e1", 4 * u) +
      rect(c, x - 40 * u, y - 240 * u, 80 * u, 56 * u, "#1f2937", 4 * u) + rect(c, x - 34 * u, y - 234 * u, 68 * u, 44 * u, "#60a5fa");
  }
  return out;
}
function waterCooler(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  return rect(c, x - 40 * u, y - 180 * u, 80 * u, 180 * u, "#e5e7eb", 6 * u) +
    `<path d="M${r(x - 36 * u)} ${r(y - 180 * u)} q0 ${r(-90 * u)} ${r(36 * u)} ${r(-90 * u)} q${r(36 * u)} 0 ${r(36 * u)} ${r(90 * u)} z" fill="#93c5fd" ${ln(c)}/>`;
}
function stringLights(c: Ctx): string {
  const u = c.unit, y = c.floorY - 560 * u;
  let out = `<path d="M0 ${r(y)} Q${r(c.width / 4)} ${r(y + 60 * u)} ${r(c.width / 2)} ${r(y)} T${c.width} ${r(y)}" fill="none" ${ln(c, c.sw * 0.7)}/>`;
  for (let i = 1; i < 16; i++) {
    const x = (c.width * i) / 16, t = (i % 8) / 8;
    out += `<circle cx="${r(x)}" cy="${r(y + Math.sin(t * Math.PI) * 30 * u + 12 * u)}" r="${r(8 * u)}" fill="${["#fde047", "#f87171", "#60a5fa", "#4ade80"][i % 4]}" ${ln(c, c.sw * 0.5)}/>`;
  }
  return out;
}
function stars(c: Ctx, col: string): string {
  let out = "";
  for (let i = 0; i < 26; i++) {
    const x = c.rng() * c.width, y = c.rng() * (c.floorY - 120 * c.unit), s = (6 + c.rng() * 6) * c.unit;
    out += `<path d="M${r(x)} ${r(y - s)} L${r(x + s * 0.3)} ${r(y - s * 0.3)} L${r(x + s)} ${r(y)} L${r(x + s * 0.3)} ${r(y + s * 0.3)} L${r(x)} ${r(y + s)} L${r(x - s * 0.3)} ${r(y + s * 0.3)} L${r(x - s)} ${r(y)} L${r(x - s * 0.3)} ${r(y - s * 0.3)} Z" fill="${col}" opacity="0.7"/>`;
  }
  return out;
}
function sign(c: Ctx, x: number, y: number, text: string, col: string): string {
  const u = c.unit, w = (text.length * 22 + 40) * u;
  return rect(c, x - w / 2, y, w, 54 * u, col, 6 * u) +
    `<text x="${r(x)}" y="${r(y + 38 * u)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${r(30 * u)}" fill="#ffffff">${text}</text>`;
}

// --------------------------------------------- extra looks for each place
const P_LIGHT = ["#b8e0a0", "#a7d68f", "#c5e4a5"];
function parkPlayground(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg + `<rect x="0" y="${r(g)}" width="${W}" height="${r(c.height - g)}" fill="${s.night ? "#4d6b49" : pick(c, P_LIGHT)}"/><line x1="0" y1="${r(g)}" x2="${W}" y2="${r(g)}" ${ln(c)}/>`;
  out += fence(c, g - 10 * u);
  out += c.rng() < 0.5 ? swing(c, W * 0.14) + slide(c, W * 0.8) : slide(c, W * 0.06) + swing(c, W * 0.88);
  out += tree(c, W * (0.45 + c.rng() * 0.1), 0.55, "#8bcf74");
  for (let i = 0; i < 5; i++) out += flower(c, W * c.rng(), c.floorY + (10 + c.rng() * 30) * u);
  return out;
}
function parkPond(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg + `<path d="M0 ${r(g - 80 * u)} Q${r(W * 0.3)} ${r(g - 160 * u)} ${r(W * 0.6)} ${r(g - 90 * u)} T${W} ${r(g - 100 * u)} V${c.height} H0 Z" fill="${s.night ? "#5b7b5a" : "#c5e4a5"}" ${ln(c)}/>`;
  out += `<rect x="0" y="${r(g)}" width="${W}" height="${r(c.height - g)}" fill="${s.night ? "#4d6b49" : "#9fd07f"}"/><line x1="0" y1="${r(g)}" x2="${W}" y2="${r(g)}" ${ln(c)}/>`;
  out += pond(c, W * (c.rng() < 0.5 ? 0.18 : 0.82));
  out += tree(c, W * 0.5, 0.7, pick(c, ["#7cc36b", "#5fae55", "#e6a23c"])) + streetLight(c, W * 0.32, g);
  return out;
}
function parkCity(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg + skyline(c, g - 60 * u, s.night);
  out += `<rect x="0" y="${r(g - 60 * u)}" width="${W}" height="${r(c.height - g + 60 * u)}" fill="${s.night ? "#4d6b49" : "#a8d88a"}"/>`;
  out += `<path d="M0 ${r(g + 20 * u)} Q${r(W / 2)} ${r(g - 30 * u)} ${W} ${r(g + 20 * u)} V${c.height} H0 Z" fill="#e7d3b5" ${ln(c, c.sw * 0.7)}/>`;
  out += streetLight(c, W * 0.1, g) + streetLight(c, W * 0.9, g);
  out += `<ellipse cx="${r(W * 0.5)}" cy="${r(g - 60 * u)}" rx="${r(110 * u)}" ry="${r(22 * u)}" fill="#cbd5e1" ${ln(c)}/>` + rect(c, W * 0.5 - 12 * u, g - 160 * u, 24 * u, 100 * u, "#cbd5e1") +
    `<path d="M${r(W * 0.5)} ${r(g - 160 * u)} q${r(-50 * u)} ${r(-30 * u)} ${r(-80 * u)} ${r(90 * u)} M${r(W * 0.5)} ${r(g - 160 * u)} q${r(50 * u)} ${r(-30 * u)} ${r(80 * u)} ${r(90 * u)}" fill="none" stroke="#7dd3fc" stroke-width="${r(c.sw * 2)}"/>`;
  return out;
}
function streetHouses(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 60 * u, s = skyBlock(c);
  let out = s.svg;
  const w = 260 * u;
  for (let x = -c.rng() * 80 * u; x < W; x += w + 60 * u) out += house(c, x, g - 30 * u, w);
  out += fence(c, g);
  out += `<rect x="0" y="${r(g)}" width="${W}" height="${r(c.height - g)}" fill="#d6d3d1"/><line x1="0" y1="${r(g)}" x2="${W}" y2="${r(g)}" ${ln(c)}/>`;
  return out;
}
function streetMarket(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 60 * u, s = skyBlock(c);
  let out = s.svg + skyline(c, g - 120 * u, s.night);
  for (let x = 20 * u; x < W; x += 330 * u) {
    const col = pick(c, ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#ec4899"]);
    out += rect(c, x, g - 260 * u, 8 * u, 260 * u, "#6b7280") + rect(c, x + 290 * u, g - 260 * u, 8 * u, 260 * u, "#6b7280");
    let d = `M${r(x - 10 * u)} ${r(g - 260 * u)} h${r(320 * u)} v${r(30 * u)}`;
    for (let k = 0; k < 8; k++) d += ` q${r(-20 * u)} ${r(24 * u)} ${r(-40 * u)} 0`;
    out += `<path d="${d} z" fill="${col}" ${ln(c)}/>`;
    out += crates(c, x + 20 * u, x + 290 * u);
  }
  out += `<rect x="0" y="${r(g)}" width="${W}" height="${r(c.height - g)}" fill="#d4c5b0"/><line x1="0" y1="${r(g)}" x2="${W}" y2="${r(g)}" ${ln(c)}/>`;
  return out;
}
function streetCrossing(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 60 * u, s = skyBlock(c);
  let out = s.svg + skyline(c, g - 40 * u, s.night);
  out += `<rect x="0" y="${r(g - 40 * u)}" width="${W}" height="${r(40 * u)}" fill="#9ca3af"/>`;
  out += `<rect x="0" y="${r(g)}" width="${W}" height="${r(c.height - g)}" fill="#4b5563"/>`;
  for (let x = 0; x < W; x += 70 * u) out += `<rect x="${r(x)}" y="${r(g + 30 * u)}" width="${r(40 * u)}" height="${r(c.height - g - 40 * u)}" fill="#f5f5f5" opacity="0.9"/>`;
  out += `<line x1="0" y1="${r(g)}" x2="${W}" y2="${r(g)}" ${ln(c)}/>`;
  out += trafficLight(c, W * 0.08, g - 40 * u) + streetLight(c, W * 0.9, g - 40 * u);
  out += sign(c, W * 0.75, g - 330 * u, "BUS STOP", "#2563eb");
  return out;
}
function homeLiving(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, WALLS), pick(c, FLOORS));
  out += door(c, W * (c.rng() < 0.5 ? 0.08 : 0.92));
  out += windowFrame(c, W * 0.5 - 160 * u, c.floorY - 480 * u, 320 * u, 180 * u, pick(c, ACCENTS));
  for (let i = 0; i < 3; i++) out += poster(c, W * (0.22 + i * 0.07), c.floorY - 470 * u + (i % 2) * 40 * u);
  out += tv(c, W * 0.78);
  return out;
}
function homeFireplace(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#f3ead0", "#fbe3e8", "#ece4f7", "#e3f0e6"]), pick(c, FLOORS));
  out += fireplace(c, W * 0.5) + clock(c, W * 0.5, c.floorY - 440 * u);
  out += bookshelf(c, W * 0.1) + plant(c, W * 0.92) + rug(c);
  return out;
}
function homeDining(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, WALLS), pick(c, FLOORS));
  out += chandelier(c, W * 0.5) + door(c, W * 0.9);
  out += rect(c, W * 0.06, c.floorY - 400 * u, 200 * u, 330 * u, c.wood, 6 * u);
  for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) out += `<circle cx="${r(W * 0.06 + 40 * u + j * 60 * u)}" cy="${r(c.floorY - 360 * u + k * 80 * u)}" r="${r(22 * u)}" fill="#ffffff" ${ln(c, c.sw * 0.7)}/>`;
  out += windowFrame(c, W * 0.5 - 100 * u, c.floorY - 430 * u, 200 * u, 140 * u, pick(c, ACCENTS));
  return out;
}
function officeOpen(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#eef2f7", "#e7efe9", "#f3f0e8"]), pick(c, ["#9aa7b4", "#a3a3a3"]));
  for (let x = 0; x < W; x += 220 * u) out += windowFrame(c, x + 20 * u, c.floorY - 520 * u, 180 * u, 150 * u, null);
  out += cubicles(c) + waterCooler(c, W * 0.95);
  return out;
}
function officeBoss(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#e5e7eb", "#f5f5f4", "#e0f2fe"]), pick(c, ["#7c4f2c", "#8b5e3c"]));
  out += rect(c, W * 0.2, c.floorY - 540 * u, W * 0.6, 240 * u, "#bfdbfe");
  out += skyline(c, c.floorY - 300 * u, false).replace(/<rect /g, `<rect clip-path="none" `);
  out += `<rect x="${r(W * 0.2)}" y="${r(c.floorY - 540 * u)}" width="${r(W * 0.6)}" height="${r(240 * u)}" fill="none" ${ln(c, c.sw * 2)}/>`;
  out += rect(c, 0, c.floorY - 300 * u, W * 0.2, 230 * u, pick(c, WALLS)) + rect(c, W * 0.8, c.floorY - 300 * u, W * 0.2, 230 * u, pick(c, WALLS));
  out += bookshelf(c, W * 0.08) + plant(c, W * 0.94);
  out += `<path d="M${r(W * 0.9 - 20 * u)} ${r(c.floorY - 470 * u)} h${r(40 * u)} v${r(30 * u)} q0 ${r(30 * u)} ${r(-20 * u)} ${r(30 * u)} q${r(-20 * u)} 0 ${r(-20 * u)} ${r(-30 * u)} z" fill="#fbbf24" ${ln(c)}/>`;
  return out;
}
function classroomRows(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#f3ead0", "#e6eefb", "#e3f0e6", "#fff2cc"]), pick(c, FLOORS));
  const left = c.rng() < 0.5;
  out += rect(c, W * (left ? 0.05 : 0.45), c.floorY - 500 * u, 460 * u, 190 * u, pick(c, ["#2f5d50", "#1f3b2c", "#ffffff"]), 6 * u);
  out += door(c, W * (left ? 0.9 : 0.08), pick(c, ["#a0704a", "#5b84b1"]));
  out += globe(c, W * (left ? 0.72 : 0.3), c.floorY - 360 * u);
  out += deskRow(c, c.floorY - 70 * u, 6, 0.7);
  return out;
}
function classroomScience(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#e0f2fe", "#ecfccb", "#f5f5f4"]), pick(c, ["#9aa7b4", "#c4ab84"]));
  out += rect(c, W * 0.5 - 230 * u, c.floorY - 500 * u, 460 * u, 190 * u, "#ffffff", 6 * u);
  out += `<circle cx="${r(W * 0.5 - 120 * u)}" cy="${r(c.floorY - 405 * u)}" r="${r(40 * u)}" fill="none" ${ln(c)}/><circle cx="${r(W * 0.5 - 120 * u)}" cy="${r(c.floorY - 405 * u)}" r="${r(10 * u)}" fill="#ef4444"/>` +
    `<path d="M${r(W * 0.5)} ${r(c.floorY - 340 * u)} l${r(60 * u)} ${r(-120 * u)} l${r(60 * u)} ${r(120 * u)} z" fill="none" stroke="#2563eb" stroke-width="${r(c.sw)}"/>`;
  // periodic-table style poster
  let grid = "";
  for (let i = 0; i < 18; i++) for (let j = 0; j < 4; j++) grid += `<rect x="${r(W * 0.04 + i * 11 * u)}" y="${r(c.floorY - 480 * u + j * 13 * u)}" width="${r(9 * u)}" height="${r(11 * u)}" fill="${ACCENTS[(i + j) % ACCENTS.length]}"/>`;
  out += rect(c, W * 0.035, c.floorY - 490 * u, 210 * u, 70 * u, "#ffffff") + grid;
  // beakers shelf
  out += rect(c, W * 0.8, c.floorY - 330 * u, 220 * u, 10 * u, c.wood);
  for (let k = 0; k < 4; k++) out += `<path d="M${r(W * 0.8 + 20 * u + k * 50 * u)} ${r(c.floorY - 380 * u)} v${r(20 * u)} l${r(-14 * u)} ${r(30 * u)} h${r(40 * u)} l${r(-14 * u)} ${r(-30 * u)} v${r(-20 * u)} z" fill="${pick(c, ["#86efac", "#93c5fd", "#fca5a5", "#fde047"])}" ${ln(c, c.sw * 0.7)}/>`;
  return out;
}
function classroomHall(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#e5e7eb", "#f3ead0", "#e0f2fe"]), pick(c, ["#d6d3d1", "#9aa7b4"]));
  out += lockers(c, 0, W * 0.42) + door(c, W * 0.55) + lockers(c, W * 0.66, W);
  out += sign(c, W * 0.55, c.floorY - 520 * u, "CLASS 7-B", "#16a34a");
  return out;
}
function kitchenFridge(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#fff7ed", "#eef2ff", "#f0fdf4", "#fef2f2"]), pick(c, ["#c9c2b8", "#d6d3d1", "#b8b2a7"]));
  const left = c.rng() < 0.5;
  out += fridge(c, W * (left ? 0.08 : 0.92));
  out += windowFrame(c, W * 0.5 - 100 * u, c.floorY - 470 * u, 200 * u, 140 * u, pick(c, ACCENTS));
  out += counter(c, W * 0.18, W * 0.82, pick(c, ["#f2c38b", "#cbd5e1", "#a7f3d0"]));
  out += stove(c, W * (left ? 0.75 : 0.25));
  return out;
}
function kitchenIsland(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#e4f2ec", "#fff7ed", "#fef9c3"]), pick(c, FLOORS));
  for (let x = W * 0.15; x < W * 0.9; x += W * 0.18) {
    out += `<line x1="${r(x)}" y1="${r(c.floorY - 560 * u)}" x2="${r(x)}" y2="${r(c.floorY - 500 * u)}" ${ln(c)}/>`;
    out += `<path d="M${r(x - 30 * u)} ${r(c.floorY - 500 * u)} q${r(30 * u)} ${r(40 * u)} ${r(60 * u)} 0 z" fill="#9ca3af" ${ln(c)}/>`;
  }
  out += fridge(c, W * 0.06) + stove(c, W * 0.9);
  return out;
}
function bedroomKids(c: Ctx): string {
  const { width: W, unit: u } = c;
  const col = pick(c, ["#dbeafe", "#fce7f3", "#ecfccb", "#ede9fe"]);
  let out = wall(c, col, pick(c, FLOORS)) + stars(c, pick(c, ["#fbbf24", "#60a5fa", "#f472b6"]));
  out += windowFrame(c, W * 0.42, c.floorY - 470 * u, 180 * u, 140 * u, pick(c, ACCENTS));
  out += rect(c, W * 0.04, c.floorY - 420 * u, 170 * u, 350 * u, pick(c, ["#a0704a", "#60a5fa", "#f472b6"]), 6 * u);
  out += rect(c, W * 0.8, c.floorY - 350 * u, 200 * u, 10 * u, c.wood);
  out += `<circle cx="${r(W * 0.83)}" cy="${r(c.floorY - 375 * u)}" r="${r(22 * u)}" fill="#ef4444" ${ln(c)}/>` + rect(c, W * 0.86, c.floorY - 400 * u, 40 * u, 50 * u, "#22c55e", 4 * u) +
    `<path d="M${r(W * 0.92)} ${r(c.floorY - 350 * u)} l${r(20 * u)} ${r(-50 * u)} l${r(20 * u)} ${r(50 * u)} z" fill="#fbbf24" ${ln(c)}/>`;
  return out;
}
function bedroomStudy(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, WALLS), pick(c, FLOORS));
  out += door(c, W * 0.07) + table(c, W * 0.88, true) + lamp(c, W * 0.95);
  out += rect(c, W * 0.5 - 60 * u, c.floorY - 480 * u, 120 * u, 170 * u, "#cfe8ff", 60 * u) + poster(c, W * 0.25, c.floorY - 460 * u);
  return out;
}
function shopFruit(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#fef9c3", "#ecfccb", "#ffedd5"]), pick(c, FLOORS));
  out += sign(c, W * 0.5, c.floorY - 540 * u, pick(c, ["FRESH FRUIT", "SABZI MANDI", "FRUIT SHOP"]), "#16a34a");
  for (let row = 0; row < 2; row++) out += crates(c, 20 * u, W - 20 * u).replace(/(y="|cy=")(-?[\d.]+)/g, (_m, a, v) => `${a}${r(Number(v) - row * 120 * u)}`);
  out += counter(c, W * 0.72, W * 0.98, "#c08552");
  return out;
}
function shopClothes(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#fce7f3", "#f5f5f4", "#ede9fe"]), pick(c, ["#d6c2a3", "#c4ab84"]));
  out += clothesRack(c, W * 0.15) + clothesRack(c, W * 0.85);
  out += rect(c, W * 0.5 - 50 * u, c.floorY - 470 * u, 100 * u, 200 * u, "#cfe8ff", 50 * u) + sign(c, W * 0.5, c.floorY - 560 * u, "SALE 50%", "#e11d48");
  return out;
}
function shopElectronics(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#e0f2fe", "#eef2f7", "#f5f5f4"]), pick(c, ["#9aa7b4", "#a3a3a3"]));
  out += tvWall(c) + counter(c, W * 0.05, W * 0.3, "#64748b");
  return out;
}
function restaurantCafe(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#fde68a", "#e7d3b5", "#d1fae5"]), pick(c, FLOORS));
  out += menuBoard(c, W * 0.5, c.floorY - 540 * u, pick(c, ["MENU", "CAFE", "TODAY"]));
  out += counter(c, W * 0.02, W * 0.28, pick(c, ["#7c4f2c", "#475569"])) + rect(c, W * 0.08, c.floorY - 330 * u, 70 * u, 90 * u, "#9ca3af", 6 * u);
  out += windowFrame(c, W * 0.78, c.floorY - 450 * u, 200 * u, 150 * u, pick(c, ACCENTS));
  return out;
}
function restaurantDhaba(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#f59e0b", "#fbbf24", "#f97316"]), "#b45309") + stringLights(c);
  out += sign(c, W * 0.5, c.floorY - 500 * u, pick(c, ["CHAI DHABA", "DESI DHABA", "TIKKA HOUSE"]), "#7c2d12");
  out += stove(c, W * 0.1) + menuBoard(c, W * 0.85, c.floorY - 470 * u, "MENU");
  return out;
}
function policeDesk(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#dbeafe", "#e5e7eb"]), "#9aa5b1");
  out += sign(c, W * 0.5, c.floorY - 540 * u, "POLICE", "#1d4ed8");
  for (let i = 0; i < 3; i++) out += rect(c, W * (0.08 + i * 0.09), c.floorY - 470 * u, 90 * u, 120 * u, "#fef3c7") +
    `<circle cx="${r(W * (0.08 + i * 0.09) + 45 * u)}" cy="${r(c.floorY - 430 * u)}" r="${r(20 * u)}" fill="#e5e7eb" ${ln(c)}/>` +
    `<text x="${r(W * (0.08 + i * 0.09) + 45 * u)}" y="${r(c.floorY - 370 * u)}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${r(16 * u)}" fill="#991b1b">WANTED</text>`;
  out += door(c, W * 0.9, "#1e3a8a");
  return out;
}
function policeRoom(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, "#4b5563", "#374151");
  out += `<path d="M${r(W * 0.5)} 0 V${r(c.floorY - 560 * u)}" ${ln(c)}/>`;
  out += `<path d="M${r(W * 0.5 - 50 * u)} ${r(c.floorY - 560 * u)} h${r(100 * u)} l${r(20 * u)} ${r(40 * u)} h${r(-140 * u)} z" fill="#fde68a" ${ln(c)}/>`;
  out += `<path d="M${r(W * 0.5 - 70 * u)} ${r(c.floorY - 520 * u)} L${r(W * 0.15)} ${r(c.floorY)} H${r(W * 0.85)} L${r(W * 0.5 + 70 * u)} ${r(c.floorY - 520 * u)} Z" fill="#fde68a" opacity="0.18"/>`;
  out += rect(c, W * 0.06, c.floorY - 470 * u, 260 * u, 160 * u, "#1f2937", 4 * u);
  return out;
}

// ======================================================= more places
// (user, 2026-11-16: a script can go ANYWHERE — jungle, cave, beach,
// inside a bus… — and the tool must draw it.)
function groundLine(c: Ctx, g: number, fill: string): string {
  return `<rect x="0" y="${r(g)}" width="${c.width}" height="${r(c.height - g)}" fill="${fill}"/><line x1="0" y1="${r(g)}" x2="${c.width}" y2="${r(g)}" ${ln(c)}/>`;
}
function palm(c: Ctx, x: number, s = 1): string {
  const u = c.unit * s, g = c.floorY - 40 * c.unit;
  let out = `<path d="M${r(x)} ${r(g)} q${r(20 * u)} ${r(-150 * u)} ${r(-10 * u)} ${r(-300 * u)}" fill="none" stroke="#8b5a2b" stroke-width="${r(22 * u)}" stroke-linecap="round"/>`;
  out += `<path d="M${r(x)} ${r(g)} q${r(20 * u)} ${r(-150 * u)} ${r(-10 * u)} ${r(-300 * u)}" fill="none" stroke="${INK}" stroke-width="${r(c.sw)}" opacity="0.4"/>`;
  const tx = x - 10 * u, ty = g - 300 * u;
  for (const [dx, dy] of [[-130, 20], [130, 30], [-90, -50], [100, -40], [0, -70], [-150, 70], [150, 80]]) {
    out += `<path d="M${r(tx)} ${r(ty)} Q${r(tx + dx! * 0.5 * u)} ${r(ty + (dy! - 60) * u)} ${r(tx + dx! * u)} ${r(ty + dy! * u)} Q${r(tx + dx! * 0.5 * u)} ${r(ty + (dy! - 20) * u)} ${r(tx)} ${r(ty)} Z" fill="#3f9d4a" ${ln(c, c.sw * 0.8)}/>`;
  }
  return out;
}
function bigLeaf(c: Ctx, x: number, y: number, s: number, rot: number, col: string): string {
  const u = c.unit * s;
  return `<g transform="rotate(${rot} ${r(x)} ${r(y)})"><path d="M${r(x)} ${r(y)} q${r(60 * u)} ${r(-70 * u)} ${r(150 * u)} 0 q${r(-80 * u)} ${r(60 * u)} ${r(-150 * u)} 0 z" fill="${col}" ${ln(c, c.sw * 0.8)}/>` +
    `<path d="M${r(x)} ${r(y)} l${r(150 * u)} 0" stroke="${shade(col)}" stroke-width="${r(c.sw * 0.7)}"/></g>`;
}
function vines(c: Ctx): string {
  let out = "";
  for (let i = 0; i < 7; i++) {
    const x = c.width * (0.05 + c.rng() * 0.9), len = c.height * (0.2 + c.rng() * 0.3);
    out += `<path d="M${r(x)} 0 q${r(30 * c.unit)} ${r(len / 2)} 0 ${r(len)}" fill="none" stroke="#2f7d3a" stroke-width="${r(c.sw * 1.6)}"/>`;
    for (let k = 1; k < 5; k++) out += `<ellipse cx="${r(x + (k % 2 ? 12 : -12) * c.unit)}" cy="${r((len * k) / 5)}" rx="${r(12 * c.unit)}" ry="${r(6 * c.unit)}" fill="#5fae55" ${ln(c, c.sw * 0.6)}/>`;
  }
  return out;
}
function rock(c: Ctx, x: number, y: number, s: number, col = "#9ca3af"): string {
  const u = c.unit * s;
  return `<path d="M${r(x - 80 * u)} ${r(y)} q${r(-10 * u)} ${r(-60 * u)} ${r(40 * u)} ${r(-80 * u)} q${r(60 * u)} ${r(-20 * u)} ${r(100 * u)} ${r(30 * u)} q${r(30 * u)} ${r(30 * u)} ${r(20 * u)} ${r(50 * u)} z" fill="${col}" ${ln(c)}/>`;
}
function cactus(c: Ctx, x: number, s = 1): string {
  const u = c.unit * s, g = c.floorY - 40 * c.unit;
  return rect(c, x - 20 * u, g - 220 * u, 40 * u, 220 * u, "#4d9e55", 20 * u) +
    `<path d="M${r(x - 20 * u)} ${r(g - 120 * u)} h${r(-40 * u)} v${r(-60 * u)}" fill="none" stroke="#4d9e55" stroke-width="${r(26 * u)}" stroke-linecap="round"/>` +
    `<path d="M${r(x + 20 * u)} ${r(g - 150 * u)} h${r(40 * u)} v${r(-50 * u)}" fill="none" stroke="#4d9e55" stroke-width="${r(26 * u)}" stroke-linecap="round"/>`;
}
function pine(c: Ctx, x: number, s = 1, col = "#2f7d4a", snow = false): string {
  const u = c.unit * s, g = c.floorY - 40 * c.unit;
  let out = rect(c, x - 10 * u, g - 60 * u, 20 * u, 60 * u, "#7c4f2c");
  for (let k = 0; k < 3; k++) {
    const top = g - 60 * u - (k + 1) * 80 * u, w = (130 - k * 30) * u;
    out += `<path d="M${r(x - w)} ${r(top + 110 * u)} L${r(x)} ${r(top)} L${r(x + w)} ${r(top + 110 * u)} Z" fill="${col}" ${ln(c)}/>`;
    if (snow) out += `<path d="M${r(x - w * 0.4)} ${r(top + 44 * u)} L${r(x)} ${r(top)} L${r(x + w * 0.4)} ${r(top + 44 * u)} Z" fill="#ffffff"/>`;
  }
  return out;
}
function mountains(c: Ctx, base: number, col: string, snowcap: boolean): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    const x = c.width * (i / 3) + (c.rng() - 0.5) * 120 * c.unit, h = (220 + c.rng() * 200) * c.unit, w = (260 + c.rng() * 140) * c.unit;
    out += `<path d="M${r(x - w)} ${r(base)} L${r(x)} ${r(base - h)} L${r(x + w)} ${r(base)} Z" fill="${col}" ${ln(c)}/>`;
    if (snowcap) out += `<path d="M${r(x - w * 0.22)} ${r(base - h * 0.78)} L${r(x)} ${r(base - h)} L${r(x + w * 0.22)} ${r(base - h * 0.78)} q${r(-w * 0.1)} ${r(16 * c.unit)} ${r(-w * 0.22)} 0 z" fill="#ffffff" ${ln(c, c.sw * 0.7)}/>`;
  }
  return out;
}
function bed2(c: Ctx, x: number): string {
  const u = c.unit, y = c.floorY - 70 * u;
  return rect(c, x - 140 * u, y - 120 * u, 280 * u, 40 * u, "#e5e7eb", 6 * u) + rect(c, x - 140 * u, y - 80 * u, 280 * u, 20 * u, "#93c5fd") +
    rect(c, x - 130 * u, y - 60 * u, 10 * u, 60 * u, "#9ca3af") + rect(c, x + 120 * u, y - 60 * u, 10 * u, 60 * u, "#9ca3af");
}

function jungle(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg;
  const deep = s.night ? "#1f4d2c" : pick(c, ["#2f7d3a", "#3a8f45", "#2d6e3e"]);
  for (let i = 0; i < 9; i++) out += `<circle cx="${r(W * i / 8)}" cy="${r(g - (200 + c.rng() * 140) * u)}" r="${r((150 + c.rng() * 80) * u)}" fill="${deep}" ${ln(c, c.sw * 0.6)}/>`;
  out += `<rect x="0" y="${r(g - 200 * u)}" width="${W}" height="${r(200 * u)}" fill="${deep}"/>`;
  for (let i = 0; i < 5; i++) out += rect(c, W * (0.05 + i * 0.22 + c.rng() * 0.05), g - 380 * u, 34 * u, 380 * u, "#6b4423");
  out += vines(c);
  out += groundLine(c, g, s.night ? "#3b5a2e" : "#6aa84f");
  for (let i = 0; i < 10; i++) out += bigLeaf(c, W * c.rng(), g + (5 + c.rng() * 40) * u, 0.6 + c.rng() * 0.5, -20 - c.rng() * 140, pick(c, ["#4caf50", "#3f9d4a", "#66bb6a", "#2e7d32"]));
  if (c.rng() < 0.5) out += palm(c, W * (c.rng() < 0.5 ? 0.08 : 0.92), 0.9);
  for (let i = 0; i < 4; i++) out += flower(c, W * c.rng(), c.floorY + (10 + c.rng() * 30) * u);
  return out;
}
function forest(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg + mountains(c, g - 120 * u, s.night ? "#4b5a7a" : "#a5b4cb", false);
  for (let i = 0; i < 9; i++) out += pine(c, W * (i / 8) + (c.rng() - 0.5) * 60 * u, 0.7 + c.rng() * 0.6, pick(c, ["#2f7d4a", "#3a8f55", "#256b3d"]));
  out += groundLine(c, g, s.night ? "#4d6b49" : "#7cb36b");
  out += rock(c, W * (0.2 + c.rng() * 0.6), g + 30 * u, 0.6) + bush(c, W * 0.85, g + 10 * u, 0.8);
  return out;
}
function beach(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg;
  const sea = s.night ? "#1e3a8a" : pick(c, ["#38bdf8", "#0ea5e9", "#22d3ee"]);
  out += `<rect x="0" y="${r(g - 220 * u)}" width="${W}" height="${r(220 * u)}" fill="${sea}"/>`;
  for (let i = 0; i < 6; i++) out += `<path d="M${r(W * c.rng())} ${r(g - (40 + c.rng() * 160) * u)} q${r(15 * u)} ${r(-10 * u)} ${r(30 * u)} 0 q${r(15 * u)} ${r(-10 * u)} ${r(30 * u)} 0" fill="none" stroke="#ffffff" stroke-width="${r(c.sw)}"/>`;
  out += `<path d="M0 ${r(g - 10 * u)} Q${r(W / 4)} ${r(g - 40 * u)} ${r(W / 2)} ${r(g - 10 * u)} T${W} ${r(g - 10 * u)} V${c.height} H0 Z" fill="#fde68a" ${ln(c)}/>`;
  out += palm(c, W * (c.rng() < 0.5 ? 0.07 : 0.93), 1);
  const ux = W * (0.2 + c.rng() * 0.6);
  out += `<line x1="${r(ux)}" y1="${r(g + 20 * u)}" x2="${r(ux - 30 * u)}" y2="${r(g - 200 * u)}" ${ln(c)}/>` +
    `<path d="M${r(ux - 150 * u)} ${r(g - 170 * u)} Q${r(ux - 30 * u)} ${r(g - 300 * u)} ${r(ux + 90 * u)} ${r(g - 200 * u)} Z" fill="${pick(c, ["#ef4444", "#f59e0b", "#8b5cf6"])}" ${ln(c)}/>`;
  out += `<circle cx="${r(W * (0.3 + c.rng() * 0.4))}" cy="${r(g + 50 * u)}" r="${r(22 * u)}" fill="#f472b6" ${ln(c)}/>`;
  return out;
}
function desert(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg;
  out += `<path d="M0 ${r(g - 120 * u)} Q${r(W * 0.25)} ${r(g - 220 * u)} ${r(W * 0.5)} ${r(g - 120 * u)} T${W} ${r(g - 140 * u)} V${c.height} H0 Z" fill="#f4c27a" ${ln(c)}/>`;
  if (c.rng() < 0.6) out += `<path d="M${r(W * 0.6)} ${r(g - 130 * u)} L${r(W * 0.7)} ${r(g - 300 * u)} L${r(W * 0.8)} ${r(g - 130 * u)} Z" fill="#e2a65a" ${ln(c)}/>`;
  out += groundLine(c, g, "#f9d48c");
  out += cactus(c, W * (0.06 + c.rng() * 0.08), 1) + cactus(c, W * (0.86 + c.rng() * 0.08), 0.8);
  out += rock(c, W * (0.3 + c.rng() * 0.4), g + 40 * u, 0.5, "#c2a07a");
  return out;
}
function cave(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u;
  let out = `<rect width="${W}" height="${c.height}" fill="#3f3a4a"/>`;
  out += `<path d="M0 0 H${W} V${r(120 * u)} ${Array.from({ length: 12 }, (_, i) => `L${r(W - (i + 0.5) * W / 12)} ${r((160 + (i % 2) * 80 + c.rng() * 40) * u)} L${r(W - (i + 1) * W / 12)} ${r(120 * u)}`).join(" ")} Z" fill="#2a2633" ${ln(c)}/>`;
  for (let i = 0; i < 5; i++) out += rock(c, W * (0.1 + i * 0.2), g - 20 * u, 1.2 + c.rng(), pick(c, ["#4b4558", "#56506a"]));
  out += groundLine(c, g, "#2f2b38");
  for (let i = 0; i < 4; i++) {
    const x = W * c.rng(), y = g - (100 + c.rng() * 200) * u;
    out += `<path d="M${r(x)} ${r(y)} l${r(14 * u)} ${r(-40 * u)} l${r(14 * u)} ${r(40 * u)} z M${r(x + 22 * u)} ${r(y)} l${r(10 * u)} ${r(-28 * u)} l${r(10 * u)} ${r(28 * u)} z" fill="${pick(c, ["#67e8f9", "#c084fc", "#86efac"])}" ${ln(c, c.sw * 0.6)}/>`;
  }
  out += `<radialGradient id="cavelight"><stop offset="0" stop-color="#fde68a" stop-opacity="0.35"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>` +
    `<ellipse cx="${r(W / 2)}" cy="${r(g - 150 * u)}" rx="${r(W * 0.45)}" ry="${r(300 * u)}" fill="url(#cavelight)"/>`;
  return out;
}
function mountain(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg + mountains(c, g - 40 * u, s.night ? "#4b5a7a" : "#94a3b8", true);
  out += groundLine(c, g, s.night ? "#4d6b49" : "#8fbf6f");
  out += pine(c, W * 0.08, 0.8) + pine(c, W * 0.92, 0.9) + rock(c, W * 0.5, g + 30 * u, 0.7);
  return out;
}
function snow(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg + mountains(c, g - 60 * u, "#cbd5e1", true);
  out += groundLine(c, g, "#f8fafc");
  out += pine(c, W * 0.06, 0.9, "#2f6b4a", true) + pine(c, W * 0.94, 0.8, "#2f6b4a", true);
  const sx = W * (0.25 + c.rng() * 0.5);
  out += `<circle cx="${r(sx)}" cy="${r(g - 40 * u)}" r="${r(50 * u)}" fill="#ffffff" ${ln(c)}/><circle cx="${r(sx)}" cy="${r(g - 120 * u)}" r="${r(36 * u)}" fill="#ffffff" ${ln(c)}/>` +
    `<path d="M${r(sx)} ${r(g - 120 * u)} l${r(30 * u)} ${r(6 * u)} l${r(-30 * u)} ${r(6 * u)} z" fill="#f97316"/><circle cx="${r(sx - 10 * u)}" cy="${r(g - 130 * u)}" r="${r(4 * u)}" fill="#1b1b1b"/>`;
  for (let i = 0; i < 40; i++) out += `<circle cx="${r(W * c.rng())}" cy="${r(c.height * c.rng() * 0.8)}" r="${r((2 + c.rng() * 3) * u)}" fill="#ffffff" opacity="0.9"/>`;
  return out;
}
function farm(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
  let out = s.svg;
  out += `<path d="M0 ${r(g - 90 * u)} Q${r(W * 0.3)} ${r(g - 150 * u)} ${r(W * 0.6)} ${r(g - 90 * u)} T${W} ${r(g - 100 * u)} V${c.height} H0 Z" fill="#b8e0a0" ${ln(c)}/>`;
  const bx = W * (c.rng() < 0.5 ? 0.14 : 0.8);
  out += rect(c, bx - 110 * u, g - 220 * u, 220 * u, 220 * u, "#b91c1c") +
    `<path d="M${r(bx - 130 * u)} ${r(g - 220 * u)} L${r(bx)} ${r(g - 320 * u)} L${r(bx + 130 * u)} ${r(g - 220 * u)} Z" fill="#7f1d1d" ${ln(c)}/>` +
    rect(c, bx - 50 * u, g - 120 * u, 100 * u, 120 * u, "#fef3c7") + `<path d="M${r(bx - 50 * u)} ${r(g - 120 * u)} L${r(bx + 50 * u)} ${r(g)} M${r(bx + 50 * u)} ${r(g - 120 * u)} L${r(bx - 50 * u)} ${r(g)}" ${ln(c)}/>`;
  out += fence(c, g);
  out += groundLine(c, g, "#a3d977");
  for (let i = 0; i < 3; i++) out += `<ellipse cx="${r(W * (0.4 + i * 0.12))}" cy="${r(g - 120 * u)}" rx="${r(40 * u)}" ry="${r(30 * u)}" fill="#fbbf24" ${ln(c)}/>`;
  return out;
}
function village(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 50 * u, s = skyBlock(c);
  let out = s.svg + mountains(c, g - 100 * u, s.night ? "#4b5a7a" : "#b6c6a8", false);
  for (let x = -c.rng() * 60 * u; x < W; x += 300 * u) {
    const col = pick(c, ["#e7c9a0", "#d9b38c", "#f1d9b5"]), h = (150 + c.rng() * 60) * u;
    out += rect(c, x, g - h, 220 * u, h, col) + rect(c, x + 80 * u, g - 100 * u, 60 * u, 100 * u, "#7c4f2c") +
      `<path d="M${r(x - 20 * u)} ${r(g - h)} h${r(260 * u)} l${r(-30 * u)} ${r(-40 * u)} h${r(-200 * u)} z" fill="#a16207" ${ln(c)}/>`;
  }
  out += groundLine(c, g, "#c9a36b");
  out += tree(c, W * (0.1 + c.rng() * 0.8), 0.7, "#6fb35e");
  return out;
}
function space(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u;
  let out = `<rect width="${W}" height="${c.height}" fill="#0b1026"/>`;
  for (let i = 0; i < 90; i++) out += `<circle cx="${r(W * c.rng())}" cy="${r(c.height * c.rng())}" r="${r((1 + c.rng() * 2.5) * u)}" fill="#ffffff" opacity="${(0.5 + c.rng() * 0.5).toFixed(2)}"/>`;
  out += `<circle cx="${r(W * 0.8)}" cy="${r(c.height * 0.2)}" r="${r(90 * u)}" fill="${pick(c, ["#f97316", "#a78bfa", "#38bdf8"])}" ${ln(c)}/>` +
    `<ellipse cx="${r(W * 0.8)}" cy="${r(c.height * 0.2)}" rx="${r(150 * u)}" ry="${r(26 * u)}" fill="none" stroke="#fde68a" stroke-width="${r(c.sw * 2)}"/>`;
  out += `<path d="M0 ${r(g)} Q${r(W * 0.25)} ${r(g - 40 * u)} ${r(W * 0.5)} ${r(g)} T${W} ${r(g)} V${c.height} H0 Z" fill="#9ca3af" ${ln(c)}/>`;
  for (let i = 0; i < 6; i++) out += `<ellipse cx="${r(W * c.rng())}" cy="${r(g + (20 + c.rng() * 40) * u)}" rx="${r(30 * u)}" ry="${r(8 * u)}" fill="#6b7280" ${ln(c, c.sw * 0.6)}/>`;
  return out;
}
function underwater(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u;
  let out = `<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs><rect width="${W}" height="${c.height}" fill="url(#sea)"/>`;
  for (let i = 0; i < 5; i++) out += `<path d="M${r(W * c.rng())} 0 l${r(80 * u)} ${r(c.height * 0.7)} l${r(60 * u)} 0 z" fill="#ffffff" opacity="0.08"/>`;
  out += groundLine(c, g, "#fcd34d");
  for (let i = 0; i < 6; i++) {
    const x = W * c.rng();
    out += `<path d="M${r(x)} ${r(g)} q${r(-20 * u)} ${r(-60 * u)} 0 ${r(-120 * u)} q${r(20 * u)} ${r(-60 * u)} 0 ${r(-120 * u)}" fill="none" stroke="#16a34a" stroke-width="${r(c.sw * 2.5)}" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 3; i++) out += `<path d="M${r(W * (0.15 + i * 0.35))} ${r(g)} q${r(-30 * u)} ${r(-80 * u)} ${r(10 * u)} ${r(-90 * u)} q${r(10 * u)} ${r(40 * u)} ${r(30 * u)} ${r(10 * u)} q${r(30 * u)} ${r(-60 * u)} ${r(40 * u)} ${r(-20 * u)} q${r(10 * u)} ${r(60 * u)} ${r(-30 * u)} ${r(100 * u)} z" fill="${pick(c, ["#fb7185", "#f472b6", "#fb923c"])}" ${ln(c)}/>`;
  for (let i = 0; i < 12; i++) out += `<circle cx="${r(W * c.rng())}" cy="${r(c.height * c.rng() * 0.8)}" r="${r((5 + c.rng() * 8) * u)}" fill="none" stroke="#e0f2fe" stroke-width="${r(c.sw * 0.6)}"/>`;
  return out;
}
function hospital(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#e0f2fe", "#ecfdf5", "#f8fafc"]), pick(c, ["#cbd5e1", "#d1d5db"]));
  out += sign(c, W * 0.5, c.floorY - 540 * u, "HOSPITAL", "#dc2626");
  out += rect(c, W * 0.5 - 30 * u, c.floorY - 470 * u, 60 * u, 60 * u, "#ffffff") + rect(c, W * 0.5 - 8 * u, c.floorY - 462 * u, 16 * u, 44 * u, "#dc2626") + rect(c, W * 0.5 - 22 * u, c.floorY - 448 * u, 44 * u, 16 * u, "#dc2626");
  out += bed2(c, W * 0.12) + door(c, W * 0.9, "#94a3b8");
  out += rect(c, W * 0.25, c.floorY - 330 * u, 10 * u, 260 * u, "#9ca3af") + rect(c, W * 0.25 - 20 * u, c.floorY - 340 * u, 50 * u, 70 * u, "#bfdbfe", 8 * u);
  return out;
}
/** Inside a vehicle: the windows are left OPEN (transparent) — the player
    shows the world rushing past behind them. */
function vehicleInside(c: Ctx, kind: "bus" | "train" | "car" | "plane"): string {
  const { width: W, unit: u } = c;
  const body = { bus: pick(c, ["#fde68a", "#fef3c7", "#e0f2fe"]), train: pick(c, ["#e2e8f0", "#fee2e2"]),
    car: "#334155", plane: "#f1f5f9" }[kind];
  const winTop = c.floorY - (kind === "car" ? 520 : 480) * u, winH = (kind === "plane" ? 120 : 190) * u;
  const holes: string[] = [];
  const n = kind === "car" ? 2 : kind === "plane" ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const w = W / n - 40 * u, x = i * (W / n) + 20 * u;
    if (kind === "plane") {
      const cx = x + w / 2, rx = 50 * u, ry = 70 * u, cy = winTop + winH / 2;
      holes.push(`M${r(cx - rx)} ${r(cy)} a${r(rx)} ${r(ry)} 0 1 0 ${r(2 * rx)} 0 a${r(rx)} ${r(ry)} 0 1 0 ${r(-2 * rx)} 0 Z`);
    } else holes.push(`M${r(x)} ${r(winTop)} h${r(w)} v${r(winH)} h${r(-w)} Z`);
  }
  let out = `<path d="M0 0 H${W} V${c.height} H0 Z ${holes.join(" ")}" fill="${body}" fill-rule="evenodd" ${ln(c)}/>`;
  out += `<path d="M${holes.join(" ")}" fill="none" stroke="${INK}" stroke-width="${r(c.sw * 2.5)}"/>`;
  out += `<rect x="0" y="${r(c.floorY - 70 * u)}" width="${W}" height="${r(c.height)}" fill="${kind === "car" ? "#1f2937" : "#64748b"}"/>`;
  if (kind === "bus" || kind === "train") {
    out += `<line x1="0" y1="${r(winTop - 50 * u)}" x2="${W}" y2="${r(winTop - 50 * u)}" stroke="#9ca3af" stroke-width="${r(c.sw * 2)}"/>`;
    for (let x = 60 * u; x < W; x += 150 * u) out += `<path d="M${r(x)} ${r(winTop - 50 * u)} v${r(30 * u)}" ${ln(c)}/><circle cx="${r(x)}" cy="${r(winTop - 8 * u)}" r="${r(12 * u)}" fill="none" ${ln(c)}/>`;
    out += sign(c, W * 0.5, 20 * u, kind === "bus" ? pick(c, ["CITY BUS", "EXPRESS", "JUNGLE BUS"]) : "EXPRESS TRAIN", "#1f2937");
  }
  if (kind === "car") out += `<circle cx="${r(W * 0.15)}" cy="${r(c.floorY - 250 * u)}" r="${r(90 * u)}" fill="none" stroke="#111827" stroke-width="${r(18 * u)}"/>`;
  if (kind === "plane") out += sign(c, W * 0.5, 30 * u, "FASTEN SEAT BELT", "#0f172a");
  return out;
}
function library(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#f3ead0", "#ede9fe", "#fef3c7"]), pick(c, FLOORS));
  for (let i = 0; i < 4; i++) out += bookshelf(c, W * (0.08 + i * 0.28));
  out += sign(c, W * 0.5, c.floorY - 560 * u, "QUIET PLEASE", "#7c3aed");
  return out;
}
function stage(c: Ctx): string {
  const { width: W, unit: u } = c, g = c.floorY - 40 * u;
  const curtain = pick(c, ["#b91c1c", "#7c3aed", "#1d4ed8"]);
  let out = `<rect width="${W}" height="${c.height}" fill="#1f1b2e"/>`;
  out += `<path d="M${r(W * 0.5 - 70 * u)} 0 L${r(W * 0.25)} ${r(g)} H${r(W * 0.75)} L${r(W * 0.5 + 70 * u)} 0 Z" fill="#fde68a" opacity="0.18"/>`;
  for (const side of [0, 1]) {
    let d = side ? `M${W} 0 H${r(W * 0.82)}` : `M0 0 H${r(W * 0.18)}`;
    d += side ? ` Q${r(W * 0.86)} ${r(g / 2)} ${r(W * 0.8)} ${r(g)} H${W} Z` : ` Q${r(W * 0.14)} ${r(g / 2)} ${r(W * 0.2)} ${r(g)} H0 Z`;
    out += `<path d="${d}" fill="${curtain}" ${ln(c)}/>`;
  }
  let top = `M0 0 H${W} V${r(70 * u)}`;
  for (let i = 0; i < 10; i++) top += ` q${r(-W / 20)} ${r(40 * u)} ${r(-W / 10)} 0`;
  out += `<path d="${top} Z" fill="${curtain}" ${ln(c)}/>`;
  out += groundLine(c, g, "#8b5a2b");
  return out;
}
function gym(c: Ctx): string {
  const { width: W, unit: u } = c;
  let out = wall(c, pick(c, ["#e5e7eb", "#dbeafe", "#fee2e2"]), "#475569");
  out += sign(c, W * 0.5, c.floorY - 560 * u, "GYM", "#ef4444");
  for (const x of [0.12, 0.88]) {
    out += rect(c, W * x - 90 * u, c.floorY - 260 * u, 180 * u, 12 * u, "#374151") +
      rect(c, W * x - 110 * u, c.floorY - 300 * u, 24 * u, 90 * u, "#111827", 4 * u) + rect(c, W * x + 86 * u, c.floorY - 300 * u, 24 * u, 90 * u, "#111827", 4 * u);
  }
  out += rect(c, W * 0.06, c.floorY - 470 * u, 200 * u, 140 * u, "#cfe8ff");
  return out;
}
/** A place the tool has never heard of: a scene built from the place's
    words (outdoor sky + ground, or a room) — the player adds pictures of
    things that belong there. */
function custom(c: Ctx, outdoor: boolean): string {
  if (outdoor) {
    const { width: W, unit: u } = c, g = c.floorY - 40 * u, s = skyBlock(c);
    return s.svg + mountains(c, g - 80 * u, s.night ? "#4b5a7a" : pick(c, ["#a5b4cb", "#b6c6a8", "#d6c2a3"]), c.rng() < 0.3) +
      groundLine(c, g, pick(c, ["#9fd07f", "#d6c2a3", "#c9a36b", "#a8d88a"]));
  }
  const { width: W, unit: u } = c;
  return wall(c, pick(c, WALLS), pick(c, FLOORS)) + windowFrame(c, W * 0.5 - 110 * u, c.floorY - 480 * u, 220 * u, 160 * u, pick(c, ACCENTS)) +
    (c.rng() < 0.5 ? door(c, W * 0.9) : door(c, W * 0.08));
}

const NEW_PLACES: Record<string, (c: Ctx) => string> = {
  jungle, forest, beach, desert, cave, mountain, snow, farm, village, space, underwater, hospital, library, stage, gym,
  bus: (c) => vehicleInside(c, "bus"), train: (c) => vehicleInside(c, "train"),
  car: (c) => vehicleInside(c, "car"), plane: (c) => vehicleInside(c, "plane"),
};
/** Places whose windows show the world moving past. */
export const MOVING_PLACES = new Set(["bus", "train", "car", "plane"]);

/** Every place has several different looks; the video's seed picks one. */
const VARIANTS: Partial<Record<EnvKind, ((c: Ctx) => string)[]>> = {
  park: [parkPlayground, parkPond, parkCity],
  street: [streetHouses, streetMarket, streetCrossing],
  home: [homeLiving, homeFireplace, homeDining],
  office: [officeOpen, officeBoss],
  classroom: [classroomRows, classroomScience, classroomHall],
  kitchen: [kitchenFridge, kitchenIsland],
  bedroom: [bedroomKids, bedroomStudy],
  shop: [shopFruit, shopClothes, shopElectronics],
  restaurant: [restaurantCafe, restaurantDhaba],
  police: [policeDesk, policeRoom],
};

const PLACES: Partial<Record<EnvKind, (c: Ctx) => string>> = {
  park, street, home, office, classroom, kitchen, bedroom, shop, restaurant, police, plain,
};

export function environmentSvg(layout: EnvLayout, geo: EnvGeometry): string {
  const rng = mulberry32((layout.seed ?? 7) * 2654435761);
  const c: Ctx = {
    ...geo, sw: Math.max(2, 3 * geo.unit), rng,
    wood: ["#b9825a", "#a86b3c", "#8b5e3c", "#c08552", "#6b4f3a"][Math.floor(rng() * 5)]!,
    sofaCol: ["#5b84b1", "#b15b5b", "#5bb18a", "#8a5bb1", "#c49a3a", "#64748b"][Math.floor(rng() * 6)]!,
    blanket: ["#e07a8f", "#7aa6e0", "#8fd19e", "#f2cc8f", "#b39ddb"][Math.floor(rng() * 5)]!,
  };
  // Original look + the extra looks: one is picked per video (and kept for that place).
  const kind = layout.kind as string;
  const looks = NEW_PLACES[kind] ? [NEW_PLACES[kind]!]
    : kind === "custom" ? [(cc: Ctx) => custom(cc, layout.outdoor ?? true)]
    : [PLACES[layout.kind] ?? plain, ...(VARIANTS[layout.kind] ?? [])];
  const pickLook = mulberry32(((layout.seed ?? 7) ^ 0x9e3779b9) * 40503 + 12345);
  pickLook(); pickLook();
  const look = looks[Math.floor(pickLook() * looks.length)]!;
  let out = layout.transparent ? "" : look(c);
  for (const p of layout.props) {
    const x = p.x * c.width, x2 = (p.x2 ?? p.x) * c.width;
    if (p.type === "bench") out += bench(c, x, x2);
    else if (p.type === "sofa") out += sofa(c, x, x2);
    else if (p.type === "bed") out += bed(c, x, x2);
    else if (p.type === "chair") out += chair(c, x);
    else if (p.type === "table") out += table(c, x, false);
    else if (p.type === "desk") out += table(c, x, true);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.width} ${c.height}" width="${c.width}" height="${c.height}">${out}</svg>`;
}
