/**
 * Big-head stickman characters (YT Guru Character Studio).
 *
 * A character is only a small config object (skin, hair, clothes,
 * colours…). characterSvg() turns that config + a moment of acting
 * (expression, mouth, pose, blink, facing) into one SVG string. The
 * same function draws the designer preview now and every animation
 * frame later (Phase 2), so a character looks identical everywhere.
 *
 * Coordinate system: viewBox 0 0 200 400, head centre (100, 78).
 */

export type Skin = string;
export type HairStyle = "none" | "spiky" | "short" | "side" | "curly" | "long" | "bun";
export type HatStyle = "none" | "cap" | "police" | "beanie" | "topi";
export type TopStyle = "tshirt" | "shirt" | "checks" | "kurta" | "jacket" | "police";
export type BottomStyle = "jeans" | "trousers" | "shorts" | "shalwar" | "skirt";
export type ShoeStyle = "sneakers" | "shoes" | "slippers";
export type Accessory = "glasses" | "sunglasses" | "mustache" | "beard" | "chain";
export type Expression = "normal" | "happy" | "angry" | "sad" | "surprised" | "suspicious";
export type Mouth = "smile" | "grin" | "flat" | "frown" | "o" | "talk-half" | "talk-open";
export type Pose = "idle" | "wave" | "hips" | "point" | "think" | "shrug"
  // Acting poses used by the Story Animator (hands holding things, reactions).
  | "talk" | "read" | "page" | "phone" | "eat" | "drink" | "facepalm" | "clap" | "clap2" | "belly" | "cover";
/** Little extras drawn on the character itself. */
export type Flags = { tears?: boolean; sweat?: boolean; smell?: boolean; blanket?: boolean;
  ladder?: number; rope?: number; match?: number }; // props for climbing, skipping, lighting a fire
/** Whole-body stance (Story Animator): standing, sitting on a seat, or one of two walk frames. */
export type Stance = "stand" | "sit" | "walk-a" | "walk-b";

export type CharacterConfig = {
  skin: Skin;
  hair: HairStyle;
  hairColor: string;
  hat: HatStyle;
  hatColor: string;
  top: TopStyle;
  topColor: string;
  top2Color: string;
  bottom: BottomStyle;
  bottomColor: string;
  shoes: ShoeStyle;
  shoeColor: string;
  accessories: Accessory[];
};

export type RenderOptions = {
  expression?: Expression;
  mouth?: Mouth; // overrides the expression's default mouth (lip-sync)
  pose?: Pose;
  blink?: boolean;
  facing?: "right" | "left";
  stance?: Stance;
  look?: "left" | "right" | "center"; // where the eyes look, on screen
  flags?: Flags;
  uid?: string; // unique id prefix when several SVGs share a page
};

// ------------------------------------------------------------ choices
export const SKINS = ["#ffffff", "#f6d7b8", "#e9b98f", "#c98c5a", "#8d5524", "#5c3a21"];
export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "none", label: "Bald" }, { id: "spiky", label: "Spiky" }, { id: "short", label: "Short" },
  { id: "side", label: "Side part" }, { id: "curly", label: "Curly" }, { id: "long", label: "Long" },
  { id: "bun", label: "Bun" },
];
export const HAT_STYLES: { id: HatStyle; label: string }[] = [
  { id: "none", label: "None" }, { id: "cap", label: "Cap" }, { id: "police", label: "Police cap" },
  { id: "beanie", label: "Beanie" }, { id: "topi", label: "Topi" },
];
export const TOP_STYLES: { id: TopStyle; label: string }[] = [
  { id: "tshirt", label: "T-shirt" }, { id: "shirt", label: "Shirt" }, { id: "checks", label: "Check shirt" },
  { id: "kurta", label: "Kurta" }, { id: "jacket", label: "Jacket" }, { id: "police", label: "Police uniform" },
];
export const BOTTOM_STYLES: { id: BottomStyle; label: string }[] = [
  { id: "jeans", label: "Jeans" }, { id: "trousers", label: "Trousers" }, { id: "shorts", label: "Shorts" },
  { id: "shalwar", label: "Shalwar" }, { id: "skirt", label: "Long skirt" },
];
export const SHOE_STYLES: { id: ShoeStyle; label: string }[] = [
  { id: "sneakers", label: "Sneakers" }, { id: "shoes", label: "Shoes" }, { id: "slippers", label: "Slippers" },
];
export const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: "glasses", label: "Glasses" }, { id: "sunglasses", label: "Sunglasses" },
  { id: "mustache", label: "Mustache" }, { id: "beard", label: "Beard" }, { id: "chain", label: "Gold chain" },
];
export const EXPRESSIONS: Expression[] = ["normal", "happy", "angry", "sad", "surprised", "suspicious"];
export const POSES: Pose[] = ["idle", "wave", "hips", "point", "think", "shrug"];

export const DEFAULT_CHARACTER: CharacterConfig = {
  skin: "#ffffff",
  hair: "spiky",
  hairColor: "#1b1b1b",
  hat: "none",
  hatColor: "#222831",
  top: "tshirt",
  topColor: "#e8643c",
  top2Color: "#ffffff",
  bottom: "jeans",
  bottomColor: "#2f3640",
  shoes: "sneakers",
  shoeColor: "#ffffff",
  accessories: [],
};

// ------------------------------------------------------------ helpers
const INK = "#151515";
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Only plain #rrggbb colours reach the SVG (config may come from disk). */
function c(value: string | undefined, fallback: string): string {
  return value && HEX.test(value) ? value : fallback;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Fill in / clean a config loaded from disk or an older version. */
export function normalizeCharacter(raw: Partial<CharacterConfig> | null | undefined): CharacterConfig {
  const d = DEFAULT_CHARACTER;
  const r = raw ?? {};
  return {
    skin: c(r.skin, d.skin),
    hair: oneOf(r.hair, HAIR_STYLES.map((x) => x.id), d.hair),
    hairColor: c(r.hairColor, d.hairColor),
    hat: oneOf(r.hat, HAT_STYLES.map((x) => x.id), d.hat),
    hatColor: c(r.hatColor, d.hatColor),
    top: oneOf(r.top, TOP_STYLES.map((x) => x.id), d.top),
    topColor: c(r.topColor, d.topColor),
    top2Color: c(r.top2Color, d.top2Color),
    bottom: oneOf(r.bottom, BOTTOM_STYLES.map((x) => x.id), d.bottom),
    bottomColor: c(r.bottomColor, d.bottomColor),
    shoes: oneOf(r.shoes, SHOE_STYLES.map((x) => x.id), d.shoes),
    shoeColor: c(r.shoeColor, d.shoeColor),
    accessories: Array.isArray(r.accessories)
      ? r.accessories.filter((a): a is Accessory => ACCESSORIES.some((x) => x.id === a))
      : [],
  };
}

export function randomCharacter(): CharacterConfig {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;
  const colors = ["#e8643c", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ef4444", "#14b8a6",
    "#f97316", "#64748b", "#0ea5e9", "#84cc16", "#ec4899", "#ffffff", "#1f2937"];
  const top = pick(TOP_STYLES).id;
  return {
    skin: Math.random() < 0.6 ? "#ffffff" : pick(SKINS),
    hair: pick(HAIR_STYLES).id,
    hairColor: pick(["#1b1b1b", "#3b2414", "#6b4423", "#a0522d", "#d4a017", "#7c3aed"]),
    hat: Math.random() < 0.7 ? "none" : pick(HAT_STYLES).id,
    hatColor: pick(colors),
    top,
    topColor: top === "police" ? "#1e3a8a" : pick(colors),
    top2Color: pick(colors),
    bottom: pick(BOTTOM_STYLES).id,
    bottomColor: pick(["#2f3640", "#1e293b", "#475569", "#78716c", "#1d4ed8", "#111827", "#f5f5f4"]),
    shoes: pick(SHOE_STYLES).id,
    shoeColor: pick(["#ffffff", "#111111", "#7c2d12", "#2563eb"]),
    accessories: ACCESSORIES.filter(() => Math.random() < 0.2).map((a) => a.id),
  };
}

// ------------------------------------------------------------- parts
type Pt = [number, number];

/** Arm polylines [shoulder, elbow, hand] for the figure's left (screen-left) and right arms. */
function armPoints(pose: Pose, stance: Stance = "stand"): { left: Pt[]; right: Pt[] } {
  const L0: Pt = [70, 160], R0: Pt = [130, 160];
  if (pose === "idle" && stance === "sit") {
    // Hands resting on the lap.
    return { left: [L0, [52, 208], [72, 262]], right: [R0, [148, 208], [128, 262]] };
  }
  if (pose === "idle" && (stance === "walk-a" || stance === "walk-b")) {
    // Arms swing opposite to the legs.
    const fwd: Pt[] = [L0, [62, 210], [72, 254]], back: Pt[] = [R0, [146, 208], [158, 248]];
    const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [200 - x, y] as Pt);
    return stance === "walk-a" ? { left: fwd, right: back } : { left: mirror(back), right: mirror(fwd) };
  }
  const idleL: Pt[] = [L0, [58, 212], [54, 258]];
  const idleR: Pt[] = [R0, [142, 212], [146, 258]];
  const sitL: Pt[] = [L0, [52, 208], [72, 262]];
  const restL = stance === "sit" ? sitL : idleL;
  switch (pose) {
    case "talk": // open palm, explaining
      return { left: restL, right: [R0, [154, 206], [172, 194]] };
    case "read":
    case "page": // both hands holding a book in front of the chest
      return { left: [L0, [58, 204], [80, 216]], right: [R0, [142, 204], [120, 216]] };
    case "phone":
      return { left: restL, right: [R0, [160, 176], [150, 104]] };
    case "eat":
    case "drink":
      return { left: restL, right: [R0, [156, 186], [118, 122]] };
    case "facepalm":
      return { left: restL, right: [R0, [154, 170], [112, 70]] };
    case "cover": // both hands over the eyes (crying)
      return { left: [L0, [46, 160], [82, 80]], right: [R0, [154, 160], [118, 80]] };
    case "clap":
      return { left: [L0, [62, 204], [96, 190]], right: [R0, [138, 204], [104, 190]] };
    case "clap2":
      return { left: [L0, [58, 204], [80, 190]], right: [R0, [142, 204], [120, 190]] };
    case "belly": // laughing, hands on the belly
      return { left: [L0, [50, 204], [84, 230]], right: [R0, [150, 204], [116, 230]] };
    case "wave":
      return { left: idleL, right: [R0, [162, 140], [170, 96]] };
    case "hips":
      return { left: [L0, [40, 204], [70, 240]], right: [R0, [160, 204], [130, 240]] };
    case "point":
      return { left: idleL, right: [R0, [166, 176], [196, 166]] };
    case "think":
      return { left: [L0, [60, 214], [92, 214]], right: [R0, [152, 196], [120, 140]] };
    case "shrug":
      return { left: [L0, [40, 196], [26, 162]], right: [R0, [160, 196], [174, 162]] };
    default:
      return { left: idleL, right: idleR };
  }
}

function arms(pose: Pose, armColor: string, stance: Stance = "stand"): string {
  const { left, right } = armPoints(pose, stance);
  const line = (pts: Pt[]) =>
    `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${armColor}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
  const hand = (p: Pt) => `<circle cx="${p[0]}" cy="${p[1]}" r="8" fill="${armColor}" stroke="${INK}" stroke-width="${armColor === INK ? 0 : 2}"/>`;
  return line(left) + line(right) + hand(left[2]!) + hand(right[2]!);
}

/** Part of a polyline from its start, `fraction` of its total length long. */
function along(pts: Pt[], fraction: number): Pt[] {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  let left = seg.reduce((a, b) => a + b, 0) * fraction;
  const out: Pt[] = [pts[0]!];
  for (let i = 0; i < seg.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!, len = seg[i]!;
    if (left >= len) { out.push(b); left -= len; continue; }
    const t = left / len;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    break;
  }
  return out;
}

/** Sleeves follow the arm: short for shirts, to the elbow for a kurta, full length for a jacket. */
function sleeves(cfg: CharacterConfig, pose: Pose, uid: string, stance: Stance = "stand"): string {
  const fill = cfg.top === "checks" ? `url(#${uid}-chk)` : cfg.topColor;
  const fraction = cfg.top === "jacket" ? 0.9 : cfg.top === "kurta" ? 0.62 : 0.34;
  const { left, right } = armPoints(pose, stance);
  let out = "";
  for (const arm of [left, right]) {
    const pts = along(arm, fraction).map((p) => p.map((v) => Math.round(v * 10) / 10).join(",")).join(" ");
    out += `<polyline points="${pts}" fill="none" stroke="${INK}" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/>`;
    out += `<polyline points="${pts}" fill="none" stroke="${fill}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return out;
}

/** Legs seen from the front while sitting: lap (short thighs) + lower legs to the floor. */
function sitLegs(cfg: CharacterConfig, skinLimb: string): string {
  const b = cfg.bottomColor, dark = shade(b, -35);
  const line = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  if (cfg.bottom === "skirt") {
    return `<path d="M62 304 L138 304 L146 362 L54 362 Z" fill="${b}" ${line}/>` +
      `<path d="M84 314 L78 358 M116 314 L122 358" stroke="${dark}" stroke-width="2" fill="none"/>`;
  }
  let out = "";
  if (cfg.bottom === "shorts") {
    out += `<line x1="80" y1="336" x2="82" y2="366" stroke="${skinLimb}" stroke-width="7" stroke-linecap="round"/>`;
    out += `<line x1="120" y1="336" x2="118" y2="366" stroke="${skinLimb}" stroke-width="7" stroke-linecap="round"/>`;
  } else {
    const w = cfg.bottom === "shalwar" ? 5 : 0;
    out += `<path d="M${66 - w} 334 L94 334 L95 364 L${70 - w} 364 Z" fill="${b}" ${line}/>`;
    out += `<path d="M106 334 L${134 + w} 334 L${130 + w} 364 L105 364 Z" fill="${b}" ${line}/>`;
  }
  // Lap: thighs coming towards the viewer, knees a little apart.
  out += `<path d="M64 306 L136 306 Q150 324 144 342 L56 342 Q50 324 64 306 Z" fill="${b}" ${line}/>`;
  out += `<path d="M100 318 L100 342" stroke="${dark}" stroke-width="2"/>`;
  return out;
}

function legs(cfg: CharacterConfig, skinLimb: string, lift: "left" | "right" | null = null): string {
  const b = cfg.bottomColor, dark = shade(b, -35);
  // Walking: one foot is lifted 12 units (frame A = left, frame B = right).
  const L = lift === "left" ? 12 : 0, R = lift === "right" ? 12 : 0;
  let out = "";
  // Bare lower legs show for shorts (and a little above slippers).
  if (cfg.bottom === "shorts") {
    out += `<line x1="86" y1="300" x2="84" y2="${366 - L}" stroke="${skinLimb}" stroke-width="7" stroke-linecap="round"/>`;
    out += `<line x1="114" y1="300" x2="116" y2="${366 - R}" stroke="${skinLimb}" stroke-width="7" stroke-linecap="round"/>`;
  }
  switch (cfg.bottom) {
    case "shorts":
      out += `<path d="M70 256 L130 256 L134 304 L104 306 L100 280 L96 306 L66 304 Z" fill="${b}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      break;
    case "shalwar":
      out += `<path d="M68 256 L132 256 Q150 320 130 ${360 - R} L106 ${364 - R} L100 296 L94 ${364 - L} L70 ${360 - L} Q50 320 68 256 Z" fill="${b}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      out += `<path d="M72 ${352 - L} L94 ${356 - L} M106 ${356 - R} L128 ${352 - R}" stroke="${dark}" stroke-width="3" fill="none"/>`;
      break;
    case "skirt":
      out += `<path d="M70 256 L130 256 L146 362 L54 362 Z" fill="${b}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      out += `<path d="M84 270 L76 358 M116 270 L124 358" stroke="${dark}" stroke-width="2" fill="none"/>`;
      break;
    default: {
      out += `<path d="M70 256 L130 256 L133 ${364 - R} L106 ${364 - R} L100 296 L94 ${364 - L} L67 ${364 - L} Z" fill="${b}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      if (cfg.bottom === "jeans") {
        out += `<path d="M76 262 Q80 276 92 274 M124 262 Q120 276 108 274" stroke="${shade(b, 45)}" stroke-width="2" fill="none"/>`;
        out += `<line x1="70" y1="262" x2="130" y2="262" stroke="${dark}" stroke-width="2"/>`;
      } else {
        out += `<path d="M82 272 L80 ${360 - L} M118 272 L120 ${360 - R}" stroke="${dark}" stroke-width="2" fill="none"/>`;
      }
    }
  }
  return out;
}

function shoes(cfg: CharacterConfig, skinLimb: string, lift: "left" | "right" | null = null): string {
  // Draw each foot separately so a walking foot can be lifted.
  const one = (side: "left" | "right") => {
    const svg = shoe(cfg, skinLimb, side);
    return lift === side ? `<g transform="translate(0 -12)">${svg}</g>` : svg;
  };
  return one("left") + one("right");
}

function shoe(cfg: CharacterConfig, skinLimb: string, side: "left" | "right"): string {
  const col = cfg.shoeColor;
  const pick = (left: string, right: string) => (side === "left" ? left : right);
  if (cfg.shoes === "slippers") {
    const sole = col === "#ffffff" ? "#8b5a2b" : col;
    const cx = pick("76", "124"), fx = pick("78", "122");
    return (
      `<ellipse cx="${cx}" cy="374" rx="17" ry="4" fill="${sole}" stroke="${INK}" stroke-width="2"/>` +
      `<ellipse cx="${fx}" cy="368" rx="12" ry="5" fill="${skinLimb}" stroke="${INK}" stroke-width="2"/>` +
      `<path d="${pick("M70 368 Q78 360 86 368", "M114 368 Q122 360 130 368")}" stroke="${INK}" stroke-width="4" fill="none"/>`
    );
  }
  const sole = cfg.shoes === "sneakers"
    ? `<path d="${pick("M58 376 L98 376", "M102 376 L142 376")}" stroke="${INK}" stroke-width="3"/>` : "";
  return (
    `<path d="${pick("M60 376 Q58 360 78 360 L96 362 L98 376 Z", "M140 376 Q142 360 122 360 L104 362 L102 376 Z")}" fill="${col}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    sole
  );
}

function torso(cfg: CharacterConfig, uid: string, sitting = false): string {
  const col = cfg.topColor, dark = shade(col, -40);
  const long = cfg.top === "kurta";
  // A seated kurta stops at the lap instead of covering the legs.
  const bottomY = long ? (sitting ? 292 : 318) : 262;
  const flare = long ? 8 : 0;
  // Body with short sleeves (arms are drawn under it).
  // Body only: sleeves are drawn along the arms (see sleeves()), so
  // they follow every pose instead of staying fixed at the sides.
  const body =
    `M72 148 Q100 140 128 148 Q140 152 138 168 L${130 + flare} ${bottomY} ` +
    `L${70 - flare} ${bottomY} L62 168 Q60 152 72 148 Z`;
  let out = "";
  let fill = col;
  if (cfg.top === "checks") {
    const id = `${uid}-chk`;
    out += `<defs><pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse">` +
      `<rect width="14" height="14" fill="${col}"/>` +
      `<rect width="14" height="5" fill="${shade(col, -45)}" opacity="0.55"/>` +
      `<rect width="5" height="14" fill="${shade(col, -45)}" opacity="0.55"/>` +
      `<rect x="9" width="1.5" height="14" fill="${cfg.top2Color}" opacity="0.8"/></pattern></defs>`;
    fill = `url(#${id})`;
  }
  if (cfg.top === "jacket") {
    // Inner shirt first, then the open jacket on top.
    out += `<path d="M86 150 L114 150 L116 262 L84 262 Z" fill="${cfg.top2Color}" stroke="${INK}" stroke-width="3"/>`;
    out += `<path d="${body}" fill="${col}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    out += `<path d="M88 148 L96 262 L104 262 L112 148 Q100 156 88 148 Z" fill="${cfg.top2Color}" stroke="${INK}" stroke-width="2"/>`;
    out += `<path d="M88 148 L80 180 L94 190 M112 148 L120 180 L106 190" fill="none" stroke="${dark}" stroke-width="3"/>`;
    return out;
  }
  out += `<path d="${body}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  switch (cfg.top) {
    case "tshirt":
      out += `<path d="M88 146 Q100 158 112 146" fill="none" stroke="${dark}" stroke-width="3"/>`;
      break;
    case "shirt":
    case "checks":
    case "police": {
      out += `<path d="M86 146 L100 166 L92 172 L82 152 Z M114 146 L100 166 L108 172 L118 152 Z" fill="${cfg.top === "police" ? col : "#ffffff"}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
      out += `<line x1="100" y1="166" x2="100" y2="${bottomY}" stroke="${dark}" stroke-width="2"/>`;
      for (const y of [184, 206, 228]) out += `<circle cx="100" cy="${y}" r="2.6" fill="${INK}"/>`;
      if (cfg.top === "police") {
        out += `<path d="M116 182 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 Z" fill="#f2c94c" stroke="${INK}" stroke-width="1.5"/>`;
        out += `<rect x="70" y="246" width="60" height="10" fill="${INK}"/><rect x="95" y="246" width="10" height="10" fill="#f2c94c" stroke="${INK}" stroke-width="1.5"/>`;
        out += `<rect x="78" y="182" width="14" height="10" fill="none" stroke="${dark}" stroke-width="2"/>`;
      }
      break;
    }
    case "kurta":
      out += `<path d="M92 146 L100 160 L108 146" fill="none" stroke="${dark}" stroke-width="3"/>`;
      out += `<line x1="100" y1="160" x2="100" y2="214" stroke="${dark}" stroke-width="2"/>`;
      for (const y of [172, 186, 200]) out += `<circle cx="100" cy="${y}" r="2.4" fill="${cfg.top2Color}" stroke="${INK}" stroke-width="1"/>`;
      out += `<path d="M66 300 L134 300" stroke="${cfg.top2Color}" stroke-width="3" opacity="0.9"/>`;
      break;
  }
  return out;
}

function chain(): string {
  return `<path d="M84 150 Q100 192 116 150" fill="none" stroke="#e0a800" stroke-width="4" stroke-dasharray="4 2"/>` +
    `<circle cx="100" cy="172" r="4" fill="#f2c94c" stroke="${INK}" stroke-width="1.5"/>`;
}

// --------------------------------------------------------------- head
function hairBack(cfg: CharacterConfig): string {
  const h = cfg.hairColor;
  if (cfg.hair === "long") {
    return `<path d="M44 70 Q36 150 58 168 L74 160 Q60 120 64 80 Z M156 70 Q164 150 142 168 L126 160 Q140 120 136 80 Z" fill="${h}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  }
  if (cfg.hair === "bun") {
    return `<circle cx="100" cy="14" r="16" fill="${h}" stroke="${INK}" stroke-width="3"/>`;
  }
  return "";
}

function hairFront(cfg: CharacterConfig): string {
  const h = cfg.hairColor;
  const cap = `M42 72 Q38 16 100 16 Q162 16 158 72 Q150 42 100 38 Q50 42 42 72 Z`;
  switch (cfg.hair) {
    case "spiky":
      return `<path d="M82 22 L76 6 M92 19 L90 2 M102 18 L104 2 M112 20 L118 5 M121 25 L130 12" stroke="${h}" stroke-width="5" stroke-linecap="round"/>`;
    case "short":
    case "long":
    case "bun":
      return `<path d="${cap}" fill="${h}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    case "side":
      return `<path d="${cap}" fill="${h}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M60 44 Q96 24 150 54 Q120 34 98 40 Q74 44 60 60 Z" fill="${shade(h, 25)}" stroke="${INK}" stroke-width="2"/>`;
    case "curly": {
      let out = "";
      const pts: Pt[] = [[46, 58], [52, 38], [66, 24], [84, 16], [100, 14], [116, 16], [134, 24], [148, 38], [154, 58]];
      for (const [x, y] of pts) out += `<circle cx="${x}" cy="${y}" r="13" fill="${h}" stroke="${INK}" stroke-width="2.5"/>`;
      out += `<path d="M44 66 Q50 34 100 30 Q150 34 156 66 Q140 46 100 44 Q60 46 44 66 Z" fill="${h}"/>`;
      return out;
    }
    default:
      return "";
  }
}

function hat(cfg: CharacterConfig): string {
  const col = cfg.hatColor, dark = shade(col, -40);
  switch (cfg.hat) {
    case "cap":
      return `<path d="M40 60 Q38 8 100 8 Q160 8 158 60 Z" fill="${col}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M40 58 Q20 60 10 70 Q40 72 100 62 Z" fill="${dark}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
        `<circle cx="100" cy="10" r="4" fill="${dark}"/>`;
    case "police":
      return `<path d="M36 34 Q100 0 164 34 L150 52 L50 52 Z" fill="#1e3a8a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
        `<rect x="48" y="50" width="104" height="12" fill="#172554" stroke="${INK}" stroke-width="3"/>` +
        `<path d="M48 62 Q100 78 152 62 L146 70 Q100 82 54 70 Z" fill="${INK}"/>` +
        `<path d="M100 22 l4 7 8 1 -6 5 2 8 -8 -4 -8 4 2 -8 -6 -5 8 -1 Z" fill="#f2c94c" stroke="${INK}" stroke-width="1.5"/>`;
    case "beanie":
      return `<path d="M42 62 Q40 8 100 8 Q160 8 158 62 Z" fill="${col}" stroke="${INK}" stroke-width="3"/>` +
        `<rect x="38" y="52" width="124" height="16" rx="6" fill="${dark}" stroke="${INK}" stroke-width="3"/>` +
        `<circle cx="100" cy="6" r="9" fill="${dark}" stroke="${INK}" stroke-width="2"/>`;
    case "topi":
      return `<path d="M50 40 Q100 4 150 40 L148 50 Q100 40 52 50 Z" fill="${col === "#222831" ? "#ffffff" : col}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M60 38 Q100 18 140 38" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
    default:
      return "";
  }
}

function eyes(expr: Expression, blink: boolean, skin: string, lookDx = 0): string {
  const L = 80, R = 120, Y = 74;
  let out = "";
  if (blink) {
    return `<path d="M68 ${Y} Q80 ${Y + 6} 92 ${Y} M108 ${Y} Q120 ${Y + 6} 132 ${Y}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (expr === "happy") {
    return `<path d="M68 ${Y + 4} Q80 ${Y - 10} 92 ${Y + 4} M108 ${Y + 4} Q120 ${Y - 10} 132 ${Y + 4}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  }
  const big = expr === "surprised";
  const rx = big ? 15 : 13, ry = big ? 18 : 15;
  const pr = big ? 4 : 5.5;
  let px = 2, py = 2;
  if (expr === "sad") py = 5;
  if (expr === "suspicious") px = 6;
  px += lookDx;
  for (const x of [L, R]) {
    out += `<ellipse cx="${x}" cy="${Y}" rx="${rx}" ry="${ry}" fill="#ffffff" stroke="${INK}" stroke-width="3"/>`;
    out += `<circle cx="${x + px}" cy="${Y + py}" r="${pr}" fill="${INK}"/>`;
  }
  if (expr === "suspicious" || expr === "angry") {
    // Heavy upper lids (skin coloured) for a narrow, side-eye look.
    const lidY = expr === "angry" ? Y - 5 : Y - 1;
    for (const x of [L, R]) {
      out += `<path d="M${x - rx - 2} ${Y - ry - 2} L${x + rx + 2} ${Y - ry - 2} L${x + rx + 2} ${lidY} L${x - rx - 2} ${lidY} Z" fill="${skin}"/>`;
      out += `<line x1="${x - rx + 1}" y1="${lidY}" x2="${x + rx - 1}" y2="${lidY}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    }
  }
  return out;
}

function brows(expr: Expression): string {
  let d: string;
  switch (expr) {
    case "angry": d = "M64 50 L94 62 M136 50 L106 62"; break;
    case "sad": d = "M66 60 L92 50 M134 60 L108 50"; break;
    case "surprised": d = "M66 46 Q80 36 94 46 M106 46 Q120 36 134 46"; break;
    case "suspicious": d = "M66 58 L94 56 M106 48 Q120 42 134 50"; break;
    case "happy": d = "M68 54 Q80 46 92 54 M108 54 Q120 46 132 54"; break;
    default: d = "M68 54 L92 52 M108 52 L132 54";
  }
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
}

const EXPRESSION_MOUTH: Record<Expression, Mouth> = {
  normal: "smile", happy: "grin", angry: "frown", sad: "frown", surprised: "o", suspicious: "flat",
};

function mouth(m: Mouth, expr: Expression): string {
  const shift = expr === "suspicious" ? 8 : 0;
  const x = 100 + shift;
  switch (m) {
    case "grin":
      return `<path d="M${x - 17} 104 Q${x} 132 ${x + 17} 104 Z" fill="${INK}"/>` +
        `<path d="M${x - 13} 106 L${x + 13} 106" stroke="#ffffff" stroke-width="3"/>`;
    case "flat":
      return `<path d="M${x - 10} 114 L${x + 10} 113" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    case "frown":
      return `<path d="M${x - 14} 120 Q${x} 106 ${x + 14} 120" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    case "o":
      return `<ellipse cx="${x}" cy="116" rx="7" ry="9" fill="${INK}"/>`;
    case "talk-half":
      return `<ellipse cx="${x}" cy="113" rx="10" ry="4.5" fill="${INK}"/>`;
    case "talk-open":
      return `<ellipse cx="${x}" cy="115" rx="11" ry="9" fill="${INK}"/>` +
        `<ellipse cx="${x}" cy="120" rx="6" ry="3" fill="#c0392b"/>`;
    default:
      return `<path d="M${x - 14} 108 Q${x} 122 ${x + 14} 108" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  }
}

function faceExtras(cfg: CharacterConfig): string {
  let out = "";
  const h = cfg.hairColor;
  if (cfg.accessories.includes("beard")) {
    out += `<path d="M48 96 Q56 140 100 140 Q144 140 152 96 Q140 120 122 122 Q100 128 78 122 Q60 120 48 96 Z" fill="${h}" stroke="${INK}" stroke-width="2"/>`;
  }
  if (cfg.accessories.includes("mustache")) {
    out += `<path d="M100 100 Q90 94 80 100 Q84 108 100 104 Q116 108 120 100 Q110 94 100 100 Z" fill="${h}" stroke="${INK}" stroke-width="1.5"/>`;
  }
  return out;
}

function eyewear(cfg: CharacterConfig): string {
  if (cfg.accessories.includes("sunglasses")) {
    return `<path d="M62 66 L96 66 Q96 88 80 88 Q62 88 62 66 Z M104 66 L138 66 Q138 88 120 88 Q104 88 104 66 Z" fill="${INK}"/>` +
      `<path d="M96 70 L104 70 M62 68 L46 64 M138 68 L154 64" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M68 70 L76 70" stroke="#ffffff" stroke-width="2" opacity="0.6"/>`;
  }
  if (cfg.accessories.includes("glasses")) {
    return `<circle cx="80" cy="74" r="17" fill="none" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="120" cy="74" r="17" fill="none" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M97 72 L103 72 M63 72 L46 66 M137 72 L154 66" stroke="${INK}" stroke-width="3"/>`;
  }
  return "";
}

// -------------------------------------------------------- held items
/** Poses whose hands go in front of the face (drawn after the head). */
const OVER_HEAD: Pose[] = ["phone", "eat", "drink", "facepalm", "cover"];

function heldItem(pose: Pose): string {
  const ln = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`;
  switch (pose) {
    case "read":
    case "page": {
      let out = `<path d="M64 194 L100 201 L136 194 L136 232 L100 239 L64 232 Z" fill="#2b59c3" ${ln}/>`;
      out += `<path d="M68 196 L100 202 L100 234 L68 228 Z M100 202 L132 196 L132 228 L100 234 Z" fill="#ffffff" ${ln}/>`;
      out += `<path d="M74 206 L94 209 M74 213 L94 216 M74 220 L90 222 M106 209 L126 206 M106 216 L126 213 M106 222 L122 220" stroke="#9aa3b2" stroke-width="2"/>`;
      if (pose === "page") out += `<path d="M100 202 Q114 176 130 186 Q118 206 100 234 Z" fill="#f8fafc" ${ln}/>`;
      return out;
    }
    case "phone":
      return `<rect x="142" y="82" width="16" height="30" rx="3" fill="#1f2937" ${ln}/><rect x="145" y="86" width="10" height="20" rx="1" fill="#60a5fa"/>`;
    case "eat":
      return `<path d="M104 128 L126 102 L132 130 Z" fill="#e0a040" ${ln}/><path d="M112 122 L126 110" stroke="#b7791f" stroke-width="2"/>`;
    case "drink":
      return `<rect x="104" y="106" width="22" height="24" rx="3" fill="#ffffff" ${ln}/><path d="M126 112 q8 0 8 7 q0 7 -8 7" fill="none" ${ln}/><rect x="106" y="108" width="18" height="6" fill="#8b5a2b"/>`;
    default:
      return "";
  }
}

function flagsSvg(f: Flags, skin: string): string {
  let out = "";
  if (f.tears) {
    out += `<path d="M74 90 q-4 10 0 16 q4 -6 0 -16 Z M126 90 q-4 10 0 16 q4 -6 0 -16 Z" fill="#60a5fa" stroke="#2563eb" stroke-width="1.5"/>`;
    out += `<path d="M70 104 q-3 8 0 12 q3 -4 0 -12 Z M130 104 q-3 8 0 12 q3 -4 0 -12 Z" fill="#60a5fa" stroke="#2563eb" stroke-width="1.5"/>`;
  }
  if (f.sweat) {
    out += `<path d="M150 46 q-8 14 0 20 q8 -6 0 -20 Z" fill="#93c5fd" stroke="#2563eb" stroke-width="2"/>`;
  }
  if (f.smell) {
    out += `<path d="M30 112 q8 -8 0 -16 q-8 -8 0 -16 M44 118 q8 -8 0 -16 q-8 -8 0 -16" fill="none" stroke="#a3a3a3" stroke-width="3" stroke-linecap="round"/>`;
  }
  void skin;
  return out;
}

function blanketSvg(): string {
  return `<path d="M44 176 Q100 160 156 176 L160 384 L40 384 Z" fill="#e07a8f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M44 176 Q100 160 156 176 L156 196 Q100 182 44 196 Z" fill="#ffffff" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M60 230 L140 230 M60 290 L140 290 M60 350 L140 350" stroke="#c45b72" stroke-width="3"/>`;
}

// ------------------------------------------------------------ emotes
export type Emote = "idea" | "question" | "exclaim" | "zzz" | "love" | "dizzy" | "angry";
export const EMOTES: Emote[] = ["idea", "question", "exclaim", "zzz", "love", "dizzy", "angry"];

/** A small reaction icon shown above a character's head (frame 0/1 = little animation). */
export function emoteSvg(name: Emote, frame = 0): string {
  const ln = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const f = frame % 2;
  let out = "";
  switch (name) {
    case "idea": {
      const ray = f ? 14 : 9;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8, x = 50 + Math.cos(a) * 30, y = 40 + Math.sin(a) * 30;
        out += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + Math.cos(a) * ray).toFixed(1)}" y2="${(y + Math.sin(a) * ray).toFixed(1)}" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>`;
      }
      out += `<circle cx="50" cy="40" r="22" fill="${f ? "#fff3a3" : "#ffe066"}" ${ln}/>`;
      out += `<rect x="41" y="60" width="18" height="16" rx="3" fill="#9ca3af" ${ln}/><path d="M42 66 H58 M42 71 H58" stroke="${INK}" stroke-width="2"/>`;
      out += `<path d="M44 44 q6 -10 12 0" fill="none" stroke="#f59e0b" stroke-width="3"/>`;
      break;
    }
    case "question":
      out = `<text x="50" y="${f ? 74 : 78}" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="70" fill="#3b82f6" ${ln}>?</text>`;
      break;
    case "exclaim":
      out = `<text x="50" y="80" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="${f ? 78 : 70}" fill="#ef4444" ${ln}>!</text>`;
      break;
    case "zzz":
      out = `<text x="${f ? 34 : 30}" y="${f ? 74 : 80}" font-family="Arial" font-weight="bold" font-size="26" fill="#6366f1" ${ln}>Z</text>` +
        `<text x="${f ? 52 : 48}" y="${f ? 52 : 58}" font-family="Arial" font-weight="bold" font-size="34" fill="#6366f1" ${ln}>Z</text>` +
        `<text x="${f ? 70 : 68}" y="${f ? 26 : 32}" font-family="Arial" font-weight="bold" font-size="22" fill="#6366f1" ${ln}>z</text>`;
      break;
    case "love": {
      const heart = (x: number, y: number, s: number) =>
        `<path d="M${x} ${y + 8 * s} c${-12 * s} ${-12 * s} ${-24 * s} ${2 * s} ${-12 * s} ${14 * s} l${12 * s} ${12 * s} l${12 * s} ${-12 * s} c${12 * s} ${-12 * s} 0 ${-26 * s} ${-12 * s} ${-14 * s} Z" fill="#ef4444" ${ln}/>`;
      out = heart(36, f ? 30 : 36, 1) + heart(66, f ? 46 : 40, 0.8);
      break;
    }
    case "dizzy": {
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 * i) / 3 + (f ? 0.6 : 0), x = 50 + Math.cos(a) * 28, y = 56 + Math.sin(a) * 12;
        out += `<path d="M${x.toFixed(1)} ${(y - 10).toFixed(1)} l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 Z" fill="#facc15" ${ln}/>`;
      }
      break;
    }
    case "angry": {
      const s = f ? 1.15 : 1;
      out = `<g transform="translate(50 50) scale(${s}) translate(-50 -50)">` +
        `<path d="M30 40 q10 0 12 -12 M58 28 q2 12 12 12 M70 60 q-10 0 -12 12 M42 72 q-2 -12 -12 -12" fill="none" stroke="#dc2626" stroke-width="7" stroke-linecap="round"/></g>`;
      break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">${out}</svg>`;
}

// ------------------------------------------------------------- render
/** How far the upper body drops when sitting (viewBox units). */
export const SIT_DROP = 56;
/** Top of the seat a sitting character rests on (viewBox units, y grows down). */
export const SEAT_TOP = 334;
/** Where the shoes touch the floor (viewBox units). */
export const FLOOR_Y = 377;

export function characterSvg(raw: CharacterConfig, opts: RenderOptions = {}): string {
  const cfg = normalizeCharacter(raw);
  const expr = opts.expression ?? "normal";
  const pose = opts.pose ?? "idle";
  const uid = (opts.uid ?? "ch").replace(/[^a-zA-Z0-9_-]/g, "");
  const skin = cfg.skin;
  // Classic stickman: white head with black stick limbs. Other skin
  // tones get matching arms/hands so the character looks consistent.
  const limb = skin.toLowerCase() === "#ffffff" ? INK : skin;
  const m = opts.mouth ?? EXPRESSION_MOUTH[expr];

  const stance = opts.stance ?? "stand";
  const sitting = stance === "sit";
  const lift = stance === "walk-a" ? "left" : stance === "walk-b" ? "right" : null;

  // Lower body stays on the floor; the upper body moves down when
  // sitting (hips on the seat) and bobs up a little while walking.
  const lower = (sitting ? sitLegs(cfg, limb) : legs(cfg, limb, lift)) + shoes(cfg, limb, lift);
  let body = "";
  body += `<line x1="100" y1="132" x2="100" y2="152" stroke="${limb}" stroke-width="8" stroke-linecap="round"/>`;
  body += torso(cfg, uid, sitting);
  if (cfg.accessories.includes("chain")) body += chain();
  const overHead = OVER_HEAD.includes(pose);
  const armsSvg = arms(pose, limb, stance) + sleeves(cfg, pose, uid, stance);
  const handsOnTop = (pose === "read" || pose === "page") ? heldItem(pose) + arms(pose, limb, stance).replace(/<polyline[^>]*>/g, "") : "";
  if (!overHead) body += armsSvg + handsOnTop;

  // Eyes look towards whoever matters on screen; the drawing is
  // mirrored when facing left, so flip the direction too.
  const screenLook = opts.look === "right" ? 4 : opts.look === "left" ? -4 : 0;
  const lookDx = opts.facing === "left" ? -screenLook : screenLook;
  const flags = opts.flags ?? {};

  let head = "";
  head += hairBack(cfg);
  head += `<circle cx="100" cy="78" r="60" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
  head += faceExtras(cfg);
  head += eyes(expr, !!opts.blink, skin, lookDx);
  head += brows(expr);
  head += mouth(m, expr);
  head += eyewear(cfg);
  // Caps / police cap / beanie cover the hair (a topi sits on top of it).
  if (cfg.hat === "none" || cfg.hat === "topi") head += hairFront(cfg);
  head += hat(cfg);
  head += flagsSvg(flags, skin);
  if (overHead) head += armsSvg + heldItem(pose) + arms(pose, limb, stance).replace(/<polyline[^>]*>/g, "");
  if (flags.blanket) head = blanketSvg() + head;

  const flip = opts.facing === "left" ? ` transform="translate(200 0) scale(-1 1)"` : "";
  const shiftY = sitting ? SIT_DROP : lift ? -3 : 0;
  const upper = shiftY ? `<g transform="translate(0 ${shiftY})">${body}${head}</g>` : body + head;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -10 200 400" width="100%" height="100%"><g${flip}>${lower}${upper}</g></svg>`;
}

// ------------------------------------------------------- rig pieces
// The Story Animator draws characters with a skeleton rig (rig.ts):
// arms and legs are bent live, and these pieces — head, torso and
// held items — are drawn from the SAME code as above, so a character
// looks identical in Character Studio and in every video.

/** Head only (hair, face, hats, beard, glasses…). viewBox 0 -10 200 190;
 *  the head centre is (100, 78). `turn` (-1…1) slides the face sideways
 *  for a 3/4 look, so a character can turn its head towards someone. */
export function headSvg(raw: CharacterConfig, opts: {
  expression?: Expression; mouth?: Mouth; blink?: boolean; look?: "left" | "right" | "center";
  turn?: number; flags?: Flags; uid?: string;
} = {}): string {
  const cfg = normalizeCharacter(raw);
  const expr = opts.expression ?? "normal";
  const m = opts.mouth ?? EXPRESSION_MOUTH[expr];
  const skin = cfg.skin;
  const turn = Math.max(-1, Math.min(1, opts.turn ?? 0));
  const lookDx = opts.look === "right" ? 4 : opts.look === "left" ? -4 : 0;
  const face = faceExtras(cfg) + eyes(expr, !!opts.blink, skin, lookDx) + brows(expr) + mouth(m, expr) + eyewear(cfg);
  let out = hairBack(cfg);
  out += `<circle cx="100" cy="78" r="60" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
  out += `<g transform="translate(${(turn * 15).toFixed(1)} 0)">${face}</g>`;
  if (cfg.hat === "none" || cfg.hat === "topi") out += `<g transform="translate(${(turn * 5).toFixed(1)} 0)">${hairFront(cfg)}</g>`;
  out += `<g transform="translate(${(turn * 4).toFixed(1)} 0)">${hat(cfg)}</g>`;
  out += `<g transform="translate(${(turn * 12).toFixed(1)} 0)">${flagsSvg(opts.flags ?? {}, skin)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -10 200 190" width="100%" height="100%">${out}</svg>`;
}

/** Torso (shirt / kurta / jacket + neck + chain), standing coordinates.
 *  viewBox 0 120 200 210 (y 120…330). Arms and sleeves are drawn by the rig. */
export function torsoSvg(raw: CharacterConfig, sitting = false, uid = "t"): string {
  const cfg = normalizeCharacter(raw);
  const limb = cfg.skin.toLowerCase() === "#ffffff" ? INK : cfg.skin;
  let out = `<line x1="100" y1="128" x2="100" y2="152" stroke="${limb}" stroke-width="8" stroke-linecap="round"/>`;
  out += torso(cfg, uid.replace(/[^a-zA-Z0-9_-]/g, ""), sitting);
  if (cfg.accessories.includes("chain")) out += chain();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 120 200 210" width="100%" height="100%">${out}</svg>`;
}

/** A held item (book, open page, phone, samosa, cup) in standing coordinates, viewBox 0 60 200 200. */
export function itemSvg(pose: Pose): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 60 200 200" width="100%" height="100%">${heldItem(pose)}</svg>`;
}

/** Blanket for a sleeping character, viewBox 0 150 200 250. */
export function blanketPieceSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 150 200 250" width="100%" height="100%">${blanketSvg()}</svg>`;
}

/** Where the hands go for a pose (upper-body coordinates; elbows are solved by the rig). */
export function handTargets(pose: Pose, stance: Stance = "stand"): { left: [number, number]; right: [number, number] } {
  const { left, right } = armPoints(pose, stance);
  return { left: [left[2]![0], left[2]![1]], right: [right[2]![0], right[2]![1]] };
}

export const POSE_OVER_HEAD = OVER_HEAD;
export const HOLD_POSES: Pose[] = ["read", "page", "phone", "eat", "drink"];
export function limbColor(raw: CharacterConfig): string {
  const cfg = normalizeCharacter(raw);
  return cfg.skin.toLowerCase() === "#ffffff" ? INK : cfg.skin;
}
export function sleeveFraction(raw: CharacterConfig): number {
  const t = normalizeCharacter(raw).top;
  return t === "jacket" ? 0.9 : t === "kurta" ? 0.62 : 0.34;
}
export { INK as RIG_INK, shade as shadeColor };
