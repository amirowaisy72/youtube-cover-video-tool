/**
 * Creatures & vehicles (Story Animator) — animals are CHARACTERS, not
 * stickers (user, 2026-11-16): legs walk, tails wag, heads bob, mouths
 * open when they talk, eyes blink. Same thick-outline style as the people.
 * Vehicles have turning wheels and real sizes (a bus is much bigger than
 * a person).
 *
 * Everything is drawn straight onto a canvas, every frame. Sizes are in
 * "character heights" (1 = one of our people).
 */
const INK = "#1b1b1b";

type Form = "quad" | "biped" | "bird" | "snake" | "fish";
type Ears = "pointy" | "round" | "floppy" | "mane" | "long" | "horns" | "antlers" | "none";
type Snout = "none" | "short" | "long" | "trunk" | "beak" | "croc" | "pig" | "duck";
type Tail = "thin" | "fluffy" | "long" | "curly" | "stub" | "none" | "feather";

export type Species = {
  name: string;
  form: Form;
  h: number; // height in character heights
  len: number; // body length relative to its height
  color: string;
  belly?: string;
  legs: number; // leg length relative to height
  neck: number; // neck length relative to height
  head: number; // head radius relative to height
  ears: Ears;
  snout: Snout;
  tail: Tail;
  pattern?: "stripes" | "spots";
  patternColor?: string;
  beak?: string;
};

const S = (name: string, form: Form, h: number, len: number, color: string, o: Partial<Species> = {}): Species => ({
  name, form, h, len, color, legs: 0.38, neck: 0.08, head: 0.2, ears: "round", snout: "short", tail: "thin", ...o,
});

/** The animals the tool knows by heart; any other animal gets a made-up look. */
export const SPECIES: Record<string, Species> = {
  cat: S("cat", "quad", 0.34, 1.5, "#f59e0b", { belly: "#fde68a", ears: "pointy", tail: "thin", head: 0.26, legs: 0.36, pattern: "stripes", patternColor: "#d97706" }),
  dog: S("dog", "quad", 0.48, 1.4, "#c08552", { belly: "#f1d9b5", ears: "floppy", snout: "long", tail: "thin", head: 0.24, legs: 0.4 }),
  lion: S("lion", "quad", 0.8, 1.6, "#f2b33d", { belly: "#fde68a", ears: "mane", snout: "short", tail: "fluffy", head: 0.2, legs: 0.42 }),
  tiger: S("tiger", "quad", 0.78, 1.7, "#f97316", { belly: "#ffedd5", ears: "round", tail: "thin", head: 0.19, pattern: "stripes", patternColor: "#1b1b1b" }),
  elephant: S("elephant", "quad", 1.45, 1.3, "#9ca3af", { ears: "floppy", snout: "trunk", tail: "thin", head: 0.22, legs: 0.42 }),
  monkey: S("monkey", "biped", 0.6, 1, "#8b5a2b", { belly: "#e7c9a0", ears: "round", snout: "short", tail: "curly", head: 0.26, legs: 0.3 }),
  gorilla: S("gorilla", "biped", 1.15, 1, "#374151", { belly: "#6b7280", ears: "round", snout: "short", tail: "none", head: 0.2, legs: 0.28 }),
  bear: S("bear", "biped", 1.15, 1, "#7c4a24", { belly: "#c08552", ears: "round", snout: "short", tail: "stub", head: 0.22, legs: 0.28 }),
  panda: S("panda", "biped", 1, 1, "#ffffff", { belly: "#ffffff", ears: "round", snout: "short", tail: "stub", head: 0.24, legs: 0.28, pattern: "spots", patternColor: "#1b1b1b" }),
  penguin: S("penguin", "biped", 0.55, 1, "#1f2937", { belly: "#ffffff", ears: "none", snout: "beak", tail: "none", head: 0.24, legs: 0.12, beak: "#f59e0b" }),
  crocodile: S("crocodile", "quad", 0.32, 4.4, "#4d8b3a", { belly: "#c5e4a5", ears: "none", snout: "croc", tail: "long", head: 0.32, legs: 0.18, neck: 0 }),
  snake: S("snake", "snake", 0.2, 6, "#65a30d", { belly: "#d9f99d", ears: "none", snout: "none", tail: "none", head: 0.6, pattern: "spots", patternColor: "#365314" }),
  parrot: S("parrot", "bird", 0.38, 1, "#22c55e", { belly: "#facc15", ears: "none", snout: "beak", tail: "feather", head: 0.3, legs: 0.16, beak: "#f97316" }),
  bird: S("bird", "bird", 0.24, 1, "#60a5fa", { belly: "#e0f2fe", ears: "none", snout: "beak", tail: "feather", head: 0.32, legs: 0.16, beak: "#f59e0b" }),
  owl: S("owl", "bird", 0.42, 1, "#a16207", { belly: "#fde68a", ears: "pointy", snout: "beak", tail: "stub", head: 0.36, legs: 0.1, beak: "#f59e0b" }),
  duck: S("duck", "bird", 0.38, 1, "#fde047", { belly: "#fef9c3", ears: "none", snout: "duck", tail: "feather", head: 0.3, legs: 0.14, beak: "#f97316" }),
  chicken: S("chicken", "bird", 0.42, 1, "#ffffff", { belly: "#fef2f2", ears: "none", snout: "beak", tail: "feather", head: 0.28, legs: 0.18, beak: "#f59e0b" }),
  horse: S("horse", "quad", 1.25, 1.4, "#a0522d", { belly: "#c08552", ears: "pointy", snout: "long", tail: "fluffy", head: 0.16, legs: 0.5, neck: 0.22 }),
  donkey: S("donkey", "quad", 1, 1.35, "#9ca3af", { belly: "#e5e7eb", ears: "long", snout: "long", tail: "thin", head: 0.17, legs: 0.48, neck: 0.16 }),
  zebra: S("zebra", "quad", 1.15, 1.4, "#ffffff", { ears: "pointy", snout: "long", tail: "thin", head: 0.16, legs: 0.5, neck: 0.2, pattern: "stripes", patternColor: "#1b1b1b" }),
  cow: S("cow", "quad", 1.1, 1.5, "#ffffff", { belly: "#fbcfe8", ears: "horns", snout: "pig", tail: "thin", head: 0.18, legs: 0.42, neck: 0.08, pattern: "spots", patternColor: "#1b1b1b" }),
  buffalo: S("buffalo", "quad", 1.1, 1.5, "#374151", { ears: "horns", snout: "pig", tail: "thin", head: 0.18, legs: 0.4 }),
  goat: S("goat", "quad", 0.7, 1.3, "#e5e7eb", { ears: "horns", snout: "long", tail: "stub", head: 0.18, legs: 0.46, neck: 0.12 }),
  sheep: S("sheep", "quad", 0.65, 1.3, "#f8fafc", { ears: "floppy", snout: "short", tail: "stub", head: 0.18, legs: 0.4 }),
  pig: S("pig", "quad", 0.55, 1.4, "#f9a8d4", { belly: "#fbcfe8", ears: "pointy", snout: "pig", tail: "curly", head: 0.24, legs: 0.3 }),
  rabbit: S("rabbit", "quad", 0.34, 1.2, "#f5f5f4", { belly: "#ffffff", ears: "long", snout: "short", tail: "stub", head: 0.3, legs: 0.3 }),
  mouse: S("mouse", "quad", 0.16, 1.6, "#9ca3af", { belly: "#e5e7eb", ears: "round", snout: "long", tail: "long", head: 0.3, legs: 0.25 }),
  fox: S("fox", "quad", 0.5, 1.6, "#ea580c", { belly: "#ffffff", ears: "pointy", snout: "long", tail: "fluffy", head: 0.22, legs: 0.38 }),
  wolf: S("wolf", "quad", 0.72, 1.6, "#6b7280", { belly: "#d1d5db", ears: "pointy", snout: "long", tail: "fluffy", head: 0.2, legs: 0.42 }),
  deer: S("deer", "quad", 1.05, 1.3, "#b45309", { belly: "#fde68a", ears: "antlers", snout: "long", tail: "stub", head: 0.15, legs: 0.55, neck: 0.2, pattern: "spots", patternColor: "#fef3c7" }),
  giraffe: S("giraffe", "quad", 2.1, 0.85, "#fbbf24", { ears: "horns", snout: "long", tail: "thin", head: 0.09, legs: 0.42, neck: 0.42, pattern: "spots", patternColor: "#b45309" }),
  camel: S("camel", "quad", 1.5, 1.2, "#d4a373", { ears: "round", snout: "long", tail: "thin", head: 0.12, legs: 0.5, neck: 0.25 }),
  kangaroo: S("kangaroo", "biped", 1, 1, "#c08552", { belly: "#f1d9b5", ears: "long", snout: "long", tail: "thin", head: 0.18, legs: 0.34 }),
  squirrel: S("squirrel", "quad", 0.24, 1.3, "#b45309", { belly: "#fde68a", ears: "pointy", snout: "short", tail: "fluffy", head: 0.3, legs: 0.28 }),
  frog: S("frog", "quad", 0.2, 1.4, "#4ade80", { belly: "#bbf7d0", ears: "none", snout: "none", tail: "none", head: 0.5, legs: 0.2 }),
  turtle: S("turtle", "quad", 0.3, 1.8, "#16a34a", { belly: "#a3e635", ears: "none", snout: "short", tail: "stub", head: 0.25, legs: 0.15, pattern: "spots", patternColor: "#166534" }),
  dinosaur: S("dinosaur", "quad", 1.8, 1.3, "#4d8b3a", { belly: "#c5e4a5", ears: "none", snout: "long", tail: "long", head: 0.15, legs: 0.42, neck: 0.3 }),
  fish: S("fish", "fish", 0.25, 1.6, "#fb923c", { ears: "none", snout: "none", tail: "feather", head: 0.4 }),
  shark: S("shark", "fish", 0.6, 3, "#64748b", { belly: "#e2e8f0", ears: "none", snout: "none", tail: "feather", head: 0.4 }),
  dolphin: S("dolphin", "fish", 0.5, 2.6, "#60a5fa", { belly: "#e0f2fe", ears: "none", snout: "none", tail: "feather", head: 0.4 }),
};

const ALIASES: Record<string, string> = {
  kitty: "cat", kitten: "cat", billi: "cat", puppy: "dog", doggy: "dog", kutta: "dog", sher: "lion", haathi: "elephant",
  bandar: "monkey", chimp: "monkey", ape: "gorilla", croc: "crocodile", alligator: "crocodile", magarmach: "crocodile",
  cobra: "snake", python: "snake", tota: "parrot", sparrow: "bird", crow: "bird", pigeon: "bird", eagle: "bird",
  hen: "chicken", rooster: "chicken", chick: "chicken", murgi: "chicken", bull: "cow", ox: "cow", calf: "cow",
  lamb: "sheep", bunny: "rabbit", rat: "mouse", leopard: "tiger", cheetah: "tiger", puma: "lion", t_rex: "dinosaur",
  "t-rex": "dinosaur", dino: "dinosaur", tortoise: "turtle", whale: "dolphin", toad: "frog", donkeys: "donkey",
  pony: "horse", reindeer: "deer", moose: "deer", hippo: "buffalo", hippopotamus: "buffalo", rhino: "buffalo",
  rhinoceros: "buffalo", koala: "bear", "polar bear": "bear", teddy: "bear", gadha: "donkey", oont: "camel",
};

/** The species for a name ("Mr. Crocodile", "the cats", "lion king"), or null. */
export function speciesFor(name: string): Species | null {
  const low = name.toLowerCase();
  const words = low.match(/[a-z][a-z-]*/g) ?? [];
  for (const w0 of words) {
    const w = w0.endsWith("s") && SPECIES[w0.slice(0, -1)] ? w0.slice(0, -1) : w0;
    if (SPECIES[w]) return SPECIES[w]!;
    if (ALIASES[w]) return SPECIES[ALIASES[w]!]!;
  }
  for (const [k, v] of Object.entries(ALIASES)) if (k.includes(" ") && low.includes(k)) return SPECIES[v]!;
  return null;
}

/** An animal the tool has never heard of still gets a body: colours and shape from its name. */
export function madeUpSpecies(name: string): Species {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const colors = ["#f59e0b", "#a78bfa", "#34d399", "#f472b6", "#60a5fa", "#c08552", "#9ca3af", "#fb7185"];
  const ears: Ears[] = ["pointy", "round", "floppy", "long"];
  return S(name, "quad", 0.45 + (h % 5) * 0.12, 1.3 + (h % 3) * 0.2, colors[h % colors.length]!, {
    ears: ears[h % ears.length]!, snout: h % 2 ? "long" : "short", tail: h % 3 ? "fluffy" : "thin", head: 0.22,
  });
}

// --------------------------------------------------------------- drawing
export type CreatureState = {
  n: number; // frame number
  walking: boolean;
  talk: number; // 0..1 mouth open
  blink: boolean;
  expr: string; // normal | happy | angry | sad | surprised | suspicious
  flying?: boolean;
};

function shade(hex: string, amt: number): string {
  const v = parseInt(hex.slice(1), 16);
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x + amt)));
  return `#${((c((v >> 16) & 255) << 16) | (c((v >> 8) & 255) << 8) | c(v & 255)).toString(16).padStart(6, "0")}`;
}

/** A thick limb: dark outline line under a coloured line (our people's style). */
function limb(ctx: CanvasRenderingContext2D, pts: [number, number][], w: number, col: string) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + Math.max(3, w * 0.28);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string, lw: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), rot, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function eyes(ctx: CanvasRenderingContext2D, hx: number, hy: number, r: number, st: CreatureState, lw: number, side = false) {
  const er = r * 0.3;
  const spots: [number, number, number][] = side
    ? [[hx + r * 0.35, hy - r * 0.2, 1]]
    : [[hx + r * 0.05, hy - r * 0.25, 0.85], [hx + r * 0.5, hy - r * 0.25, 1]];
  for (const [x, y, s] of spots) {
    if (st.blink) {
      ctx.beginPath();
      ctx.moveTo(x - er * s, y);
      ctx.lineTo(x + er * s, y);
      ctx.lineWidth = lw;
      ctx.strokeStyle = INK;
      ctx.stroke();
      continue;
    }
    blob(ctx, x, y, er * s, er * s * (st.expr === "surprised" ? 1.15 : 1), "#ffffff", lw * 0.8);
    const pr = er * s * (st.expr === "surprised" ? 0.35 : 0.5);
    ctx.beginPath();
    ctx.arc(x + er * 0.3, y + (st.expr === "sad" ? er * 0.2 : 0), pr, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + er * 0.45, y - er * 0.2, pr * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    // brows show the mood
    if (st.expr === "angry" || st.expr === "sad" || st.expr === "suspicious") {
      ctx.beginPath();
      const tilt = st.expr === "angry" ? 1 : st.expr === "sad" ? -1 : 0;
      ctx.moveTo(x - er * s, y - er * 1.5 - tilt * er * 0.4);
      ctx.lineTo(x + er * s, y - er * 1.5 + tilt * er * 0.4);
      ctx.lineWidth = lw * 1.2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  }
}

function mouth(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, st: CreatureState, lw: number) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  if (st.talk > 0.05 || st.expr === "surprised") {
    const open = st.talk > 0.05 ? st.talk : 0.6;
    blob(ctx, x, y + w * 0.15, w * 0.45, w * 0.45 * open + 1, "#7f1d1d", lw * 0.8);
    return;
  }
  ctx.beginPath();
  if (st.expr === "sad" || st.expr === "angry") ctx.arc(x, y + w * 0.4, w * 0.4, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, y - w * 0.05, w * 0.4, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

function ears(ctx: CanvasRenderingContext2D, sp: Species, hx: number, hy: number, r: number, lw: number, n: number, front: boolean) {
  const col = sp.color, inner = shade(col, -30);
  if (sp.ears === "mane" && !front) {
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2, rr = r * (i % 2 ? 1.45 : 1.75);
      ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = "#b45309";
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  if (front !== (sp.ears === "floppy")) return;
  const wig = Math.sin(n / 9) * 0.08;
  if (sp.ears === "pointy") {
    for (const dx of [-0.45, 0.35]) {
      ctx.beginPath();
      ctx.moveTo(hx + (dx - 0.25) * r, hy - r * 0.6);
      ctx.lineTo(hx + (dx + wig) * r, hy - r * 1.45);
      ctx.lineTo(hx + (dx + 0.3) * r, hy - r * 0.7);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = lw;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  } else if (sp.ears === "round") {
    for (const dx of [-0.6, 0.5]) blob(ctx, hx + dx * r, hy - r * 0.75, r * 0.32, r * 0.32, inner, lw);
  } else if (sp.ears === "long") {
    for (const dx of [-0.3, 0.25]) blob(ctx, hx + dx * r, hy - r * 1.35, r * 0.2, r * 0.7, col, lw, wig + dx * 0.3);
  } else if (sp.ears === "floppy") {
    const big = sp.snout === "trunk" ? 1.5 : 0.75;
    blob(ctx, hx - r * 0.55, hy + r * 0.05, r * 0.32 * big, r * 0.6 * big, shade(col, -20), lw, 0.3 + wig);
  } else if (sp.ears === "horns" || sp.ears === "antlers") {
    for (const dx of [-0.35, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(hx + dx * r, hy - r * 0.8);
      ctx.quadraticCurveTo(hx + (dx - 0.3) * r, hy - r * 1.5, hx + (dx + 0.1) * r, hy - r * (sp.ears === "antlers" ? 2 : 1.4));
      if (sp.ears === "antlers") {
        ctx.moveTo(hx + (dx - 0.05) * r, hy - r * 1.35);
        ctx.lineTo(hx + (dx + 0.4) * r, hy - r * 1.6);
      }
      ctx.lineWidth = lw * 2.4;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = lw * 1.2;
      ctx.strokeStyle = "#f5f5f4";
      ctx.stroke();
    }
  }
}

/** Head with snout, eyes and mouth, facing +x. */
function head(ctx: CanvasRenderingContext2D, sp: Species, hx: number, hy: number, r: number, st: CreatureState, lw: number) {
  ears(ctx, sp, hx, hy, r, lw, st.n, false);
  if (sp.snout === "croc") {
    // long flat jaws that open when it talks / snaps
    const open = Math.max(st.talk, st.expr === "angry" ? 0.4 : 0) * r * 0.8;
    blob(ctx, hx, hy, r * 0.7, r * 0.55, sp.color, lw);
    ctx.fillStyle = sp.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.roundRect(hx, hy - r * 0.35 - open * 0.5, r * 2.1, r * 0.5, r * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(hx, hy + r * 0.05 + open * 0.5, r * 2, r * 0.4, r * 0.18);
    ctx.fillStyle = sp.belly ?? shade(sp.color, 40);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const tx = hx + r * (0.3 + i * 0.28);
      ctx.beginPath();
      ctx.moveTo(tx, hy + r * 0.15 - open * 0.5);
      ctx.lineTo(tx + r * 0.1, hy + r * 0.32 - open * 0.3);
      ctx.lineTo(tx + r * 0.2, hy + r * 0.15 - open * 0.5);
      ctx.fill();
    }
    eyes(ctx, hx - r * 0.05, hy - r * 0.35, r * 0.7, st, lw, false);
    return;
  }
  blob(ctx, hx, hy, r, r * 0.95, sp.color, lw);
  if (sp.ears === "mane") blob(ctx, hx, hy, r, r * 0.95, sp.color, lw);
  const muzzle = sp.belly ?? shade(sp.color, 45);
  const mx = hx + r * 0.55, my = hy + r * 0.3;
  if (sp.snout === "short" || sp.snout === "pig") {
    blob(ctx, mx, my, r * 0.42, r * 0.3, sp.snout === "pig" ? shade(sp.color, -25) : muzzle, lw);
    if (sp.snout === "pig") {
      blob(ctx, mx - r * 0.12, my, r * 0.06, r * 0.1, INK, 1);
      blob(ctx, mx + r * 0.12, my, r * 0.06, r * 0.1, INK, 1);
    } else blob(ctx, mx + r * 0.15, my - r * 0.12, r * 0.1, r * 0.07, INK, 1);
    mouth(ctx, mx, my + r * 0.22, r * 0.5, st, lw * 0.8);
  } else if (sp.snout === "long") {
    blob(ctx, hx + r * 0.85, hy + r * 0.25, r * 0.6, r * 0.32, muzzle, lw);
    blob(ctx, hx + r * 1.4, hy + r * 0.12, r * 0.12, r * 0.1, INK, 1);
    mouth(ctx, hx + r * 1.05, hy + r * 0.48, r * 0.5, st, lw * 0.8);
  } else if (sp.snout === "trunk") {
    const sway = Math.sin(st.n / 11) * 0.5 + st.talk * 0.6;
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.6, hy + r * 0.2);
    ctx.quadraticCurveTo(hx + r * (1.4 + sway * 0.3), hy + r * 0.6, hx + r * (1.1 + sway), hy + r * (1.5 - sway * 0.5));
    limb(ctx, [[hx + r * 0.6, hy + r * 0.2], [hx + r * (1.25 + sway * 0.2), hy + r * 0.7], [hx + r * (1.1 + sway), hy + r * (1.5 - sway * 0.5)]], r * 0.32, sp.color);
    mouth(ctx, hx + r * 0.45, hy + r * 0.62, r * 0.45, st, lw * 0.8);
  } else if (sp.snout === "beak" || sp.snout === "duck") {
    const open = st.talk * r * 0.35;
    ctx.fillStyle = sp.beak ?? "#f59e0b";
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    const len = sp.snout === "duck" ? 1.6 : 1.3;
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.75, hy - r * 0.05);
    ctx.lineTo(hx + r * len, hy + r * 0.15 - open * 0.3);
    ctx.lineTo(hx + r * 0.75, hy + r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.75, hy + r * 0.3);
    ctx.lineTo(hx + r * (len - 0.15), hy + r * 0.3 + open);
    ctx.lineTo(hx + r * 0.75, hy + r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    mouth(ctx, hx + r * 0.45, hy + r * 0.45, r * 0.6, st, lw * 0.8);
  }
  eyes(ctx, hx, hy, r, st, lw, false);
  ears(ctx, sp, hx, hy, r, lw, st.n, true);
}

function pattern(ctx: CanvasRenderingContext2D, sp: Species, x: number, y: number, rx: number, ry: number) {
  if (!sp.pattern) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sp.patternColor ?? INK;
  ctx.strokeStyle = sp.patternColor ?? INK;
  if (sp.pattern === "stripes") {
    ctx.lineWidth = rx * 0.09;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * rx * 0.28, y - ry);
      ctx.quadraticCurveTo(x + i * rx * 0.28 + rx * 0.08, y, x + i * rx * 0.28 - rx * 0.05, y + ry * 0.2);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const sx = x + Math.sin(i * 7.3) * rx * 0.7, sy = y + Math.cos(i * 3.1) * ry * 0.5;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx * 0.12, ry * 0.15, i, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function tail(ctx: CanvasRenderingContext2D, sp: Species, x: number, y: number, size: number, n: number, lw: number) {
  const wag = Math.sin(n / 5) * 0.5;
  const col = sp.color;
  if (sp.tail === "thin" || sp.tail === "fluffy") {
    const tx = x - size * 0.35, ty = y - size * (0.35 + wag * 0.2);
    limb(ctx, [[x, y], [x - size * 0.2, y - size * 0.05], [tx, ty]], size * (sp.tail === "fluffy" ? 0.08 : 0.05), col);
    if (sp.tail === "fluffy") blob(ctx, tx, ty, size * 0.08, size * 0.11, sp.ears === "mane" ? "#b45309" : shade(col, 30), lw);
  } else if (sp.tail === "long") {
    const t = sp.snout === "croc" ? 0.12 : 0.05, reach = sp.snout === "croc" ? 1.1 : 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y - size * t);
    ctx.quadraticCurveTo(x - size * reach * 0.45, y - size * (0.05 + wag * 0.1), x - size * reach, y + size * 0.05);
    ctx.lineTo(x, y + size * t);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  } else if (sp.tail === "curly") {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - size * 0.4, y - size * 0.1, x - size * 0.5, y - size * (0.6 + wag * 0.2), x - size * 0.25, y - size * 0.55);
    ctx.lineWidth = size * 0.05 + 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = size * 0.05;
    ctx.strokeStyle = col;
    ctx.stroke();
  } else if (sp.tail === "stub") {
    blob(ctx, x - size * 0.02, y - size * 0.05, size * 0.07, size * 0.06, shade(col, 25), lw);
  } else if (sp.tail === "feather") {
    for (const a of [-0.4, 0, 0.4]) blob(ctx, x - size * 0.15, y - size * 0.05, size * 0.18, size * 0.06, shade(col, -25), lw, a + wag * 0.3);
  }
}

/**
 * Draw one creature, standing on (x, groundY), facing right when face=1.
 * size = its height in pixels.
 */
export function drawCreature(ctx: CanvasRenderingContext2D, sp: Species, st: CreatureState, x: number, groundY: number,
  size: number, face: 1 | -1) {
  const lw = Math.max(2, size * 0.018 + 1.5);
  const p = st.walking ? st.n * 0.42 : 0;
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(face, 1);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.13)";
  ctx.beginPath();
  ctx.ellipse(0, 0, size * sp.len * 0.35 + size * 0.1, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  const bob = st.walking ? Math.abs(Math.sin(p)) * size * 0.03 : Math.sin(st.n / 18) * size * 0.008;
  ctx.translate(0, -bob);

  if (sp.form === "quad") {
    const legLen = sp.legs * size, bodyH = size * (sp.name === "giraffe" ? 0.18 : 0.34), bodyL = sp.len * size * 0.55;
    const by = -(legLen + bodyH / 2), dark = shade(sp.color, -35);
    const hips: [number, number][] = [[bodyL * 0.32, 0], [-bodyL * 0.32, Math.PI]];
    // far legs (darker), body, near legs
    for (const [hx, ph] of hips) {
      const a = Math.sin(p + ph + 1.6) * 0.45;
      limb(ctx, [[hx + bodyL * 0.05, by + bodyH * 0.2], [hx + bodyL * 0.05 + Math.sin(a) * legLen, -Math.cos(a) * 2]], size * 0.07, dark);
    }
    tail(ctx, sp, -bodyL * 0.45, by - bodyH * 0.1, size, st.n, lw);
    blob(ctx, 0, by, bodyL / 2, bodyH / 2, sp.color, lw);
    if (sp.belly) blob(ctx, 0, by + bodyH * 0.2, bodyL * 0.35, bodyH * 0.22, sp.belly, 0.01);
    pattern(ctx, sp, 0, by, bodyL / 2, bodyH / 2);
    for (const [hx, ph] of hips) {
      const a = Math.sin(p + ph) * 0.45;
      const fx = hx + Math.sin(a) * legLen, fy = -Math.cos(a) * 2;
      limb(ctx, [[hx, by + bodyH * 0.2], [hx + Math.sin(a) * legLen * 0.5 + 2, by + bodyH * 0.2 + legLen * 0.55], [fx, fy]], size * 0.08, sp.color);
      blob(ctx, fx + size * 0.02, fy - size * 0.01, size * 0.055, size * 0.035, shade(sp.color, -15), lw * 0.8);
    }
    // neck + head
    const r = sp.head * size;
    const nod = Math.sin(st.n / 10) * size * 0.01 + st.talk * size * 0.02;
    const hx = bodyL * 0.5 + sp.neck * size * 0.35 + (sp.snout === "croc" ? -r * 0.2 : r * 0.2);
    const hy = by - bodyH * 0.25 - sp.neck * size + (sp.snout === "croc" ? bodyH * 0.25 : 0) + nod;
    if (sp.neck > 0.02) limb(ctx, [[bodyL * 0.38, by - bodyH * 0.15], [hx - r * 0.2, hy + r * 0.3]], Math.max(size * 0.09, r * 0.8), sp.color);
    head(ctx, sp, hx, hy, r, st, lw);
  } else if (sp.form === "biped") {
    const legLen = sp.legs * size, bodyH = size * 0.45, bodyW = size * 0.3, by = -(legLen + bodyH / 2);
    for (const ph of [0, Math.PI]) {
      const a = Math.sin(p + ph) * 0.4;
      limb(ctx, [[ph ? -bodyW * 0.2 : bodyW * 0.2, by + bodyH * 0.35], [(ph ? -bodyW * 0.2 : bodyW * 0.2) + Math.sin(a) * legLen, -2]], size * 0.09, shade(sp.color, ph ? -30 : 0));
    }
    tail(ctx, sp, -bodyW * 0.45, by + bodyH * 0.3, size, st.n, lw);
    blob(ctx, 0, by, bodyW / 2, bodyH / 2, sp.color, lw);
    if (sp.belly) blob(ctx, bodyW * 0.08, by + bodyH * 0.06, bodyW * 0.32, bodyH * 0.34, sp.belly, 0.01);
    if (sp.name === "panda") for (const d of [-1, 1]) blob(ctx, d * bodyW * 0.42, by - bodyH * 0.05, bodyW * 0.12, bodyH * 0.3, INK, 0.01);
    const swing = st.walking ? Math.sin(p) * 0.6 : Math.sin(st.n / 14) * 0.1 + st.talk * 0.4;
    const armL = size * (sp.name === "penguin" ? 0.18 : 0.32);
    limb(ctx, [[bodyW * 0.35, by - bodyH * 0.25], [bodyW * 0.35 + Math.sin(swing + 0.3) * armL, by - bodyH * 0.25 + Math.cos(swing + 0.3) * armL]], size * 0.07, sp.name === "panda" ? INK : sp.color);
    const r = sp.head * size;
    head(ctx, sp, bodyW * 0.1, by - bodyH / 2 - r * 0.75 + Math.sin(st.n / 10) * size * 0.01, r, st, lw);
  } else if (sp.form === "bird") {
    const legLen = st.flying ? 0 : sp.legs * size, bodyR = size * 0.32, by = -(legLen + bodyR) - (st.flying ? size * 1.6 + Math.sin(st.n / 5) * size * 0.2 : 0);
    if (!st.flying) for (const d of [-1, 1]) limb(ctx, [[d * bodyR * 0.25, by + bodyR * 0.8], [d * bodyR * 0.25 + (st.walking ? Math.sin(p + (d > 0 ? 0 : Math.PI)) * bodyR * 0.4 : 0), -1]], size * 0.03, sp.beak ?? "#f59e0b");
    tail(ctx, sp, -bodyR * 0.9, by + bodyR * 0.2, size, st.n, lw);
    blob(ctx, 0, by, bodyR * 1.05, bodyR, sp.color, lw);
    if (sp.belly) blob(ctx, bodyR * 0.25, by + bodyR * 0.25, bodyR * 0.55, bodyR * 0.6, sp.belly, 0.01);
    const flap = st.flying ? Math.sin(st.n * 0.9) * 0.9 : st.talk * 0.4 + Math.sin(st.n / 12) * 0.05;
    blob(ctx, -bodyR * 0.15, by - bodyR * 0.1, bodyR * 0.6, bodyR * 0.3, shade(sp.color, -30), lw, -0.4 - flap);
    head(ctx, sp, bodyR * 0.55, by - bodyR * 0.95, sp.head * size, st, lw);
  } else if (sp.form === "snake") {
    const L = sp.len * size, segs = 26, th = size * 0.45;
    const pts: [number, number][] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, sx = -L / 2 + t * L;
      pts.push([sx, -th * 0.5 + Math.sin(t * 9 - st.n * 0.25) * th * 0.35 * (1 - t * 0.5)]);
    }
    const headX = L / 2 + size * 0.1, headY = -size * 1.2 + Math.sin(st.n / 8) * size * 0.1;
    pts.push([L / 2, -size * 0.6], [headX - size * 0.1, headY + size * 0.2]);
    limb(ctx, pts, th, sp.color);
    if (st.n % 30 < 6 || st.talk > 0.2) {
      ctx.beginPath();
      ctx.moveTo(headX + size * 0.3, headY + size * 0.08);
      ctx.lineTo(headX + size * 0.55, headY + size * 0.05);
      ctx.moveTo(headX + size * 0.48, headY + size * 0.06);
      ctx.lineTo(headX + size * 0.6, headY - size * 0.02);
      ctx.moveTo(headX + size * 0.48, headY + size * 0.06);
      ctx.lineTo(headX + size * 0.6, headY + size * 0.14);
      ctx.lineWidth = lw;
      ctx.strokeStyle = "#dc2626";
      ctx.stroke();
    }
    blob(ctx, headX, headY, size * 0.38, size * 0.28, sp.color, lw);
    eyes(ctx, headX - size * 0.08, headY - size * 0.05, size * 0.3, st, lw, false);
    mouth(ctx, headX + size * 0.18, headY + size * 0.12, size * 0.2, st, lw * 0.8);
  } else {
    // fish / shark / dolphin: swim in the water
    const L = sp.len * size * 0.5, by = -size * 1.5 + Math.sin(st.n / 9) * size * 0.2;
    const wag = Math.sin(st.n / 3) * 0.4;
    ctx.save();
    ctx.translate(-L * 0.9, by);
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-L * 0.6, -size * 0.45);
    ctx.lineTo(-L * 0.6, size * 0.45);
    ctx.closePath();
    ctx.fillStyle = shade(sp.color, -20);
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    blob(ctx, 0, by, L, size * 0.45, sp.color, lw);
    if (sp.belly) blob(ctx, 0, by + size * 0.18, L * 0.7, size * 0.18, sp.belly, 0.01);
    if (sp.name !== "fish") {
      ctx.beginPath();
      ctx.moveTo(-L * 0.1, by - size * 0.4);
      ctx.lineTo(-L * 0.35, by - size * 0.95);
      ctx.lineTo(L * 0.2, by - size * 0.4);
      ctx.fillStyle = sp.color;
      ctx.fill();
      ctx.stroke();
    }
    eyes(ctx, L * 0.55, by - size * 0.1, size * 0.35, st, lw, false);
    mouth(ctx, L * 0.8, by + size * 0.12, size * 0.25, st, lw * 0.8);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- vehicles
export type VehicleKind = "bus" | "car" | "truck" | "bike" | "train" | "tractor" | "boat" | "taxi" | "jeep" | "rickshaw";
export const VEHICLE_SIZE: Record<VehicleKind, [number, number]> = {
  // [length, height] in character heights — a bus is BIG
  bus: [3.4, 1.55], car: [2, 0.8], taxi: [2, 0.8], jeep: [2, 0.95], truck: [3.2, 1.5], bike: [0.95, 0.55],
  train: [4.6, 1.55], tractor: [1.8, 1.1], boat: [2.6, 0.9], rickshaw: [1.5, 1],
};
const VEHICLE_WORDS: Record<string, VehicleKind> = {
  bus: "bus", coach: "bus", car: "car", automobile: "car", taxi: "taxi", cab: "taxi", jeep: "jeep", truck: "truck",
  lorry: "truck", bike: "bike", bicycle: "bike", cycle: "bike", train: "train", locomotive: "train", tractor: "tractor",
  boat: "boat", ship: "boat", rickshaw: "rickshaw", tuk: "rickshaw",
};

export function vehicleFor(name: string): VehicleKind | null {
  for (const w of name.toLowerCase().match(/[a-z]+/g) ?? []) if (VEHICLE_WORDS[w]) return VEHICLE_WORDS[w]!;
  return null;
}

function wheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, moving: boolean, lw: number) {
  blob(ctx, x, y, r, r, "#1f2937", lw);
  blob(ctx, x, y, r * 0.5, r * 0.5, "#d1d5db", lw * 0.8);
  const a = moving ? n * 0.5 : 0;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a + k * 2.09) * r * 0.48, y + Math.sin(a + k * 2.09) * r * 0.48);
    ctx.lineTo(x - Math.cos(a + k * 2.09) * r * 0.48, y - Math.sin(a + k * 2.09) * r * 0.48);
    ctx.stroke();
  }
}

/** Draw a vehicle on (x, groundY) facing right (face=1). charH = one character's height in px. */
export function drawVehicle(ctx: CanvasRenderingContext2D, kind: VehicleKind, x: number, groundY: number, charH: number,
  face: 1 | -1, n: number, moving: boolean, color: string) {
  const [lenU, hU] = VEHICLE_SIZE[kind];
  const L = lenU * charH, H = hU * charH, lw = Math.max(3, charH * 0.012);
  ctx.save();
  ctx.translate(x, groundY - (moving ? Math.abs(Math.sin(n * 0.7)) * charH * 0.008 : 0));
  ctx.scale(face, 1);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.5, charH * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  const wr = kind === "bike" ? H * 0.42 : H * 0.17;
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  if (kind === "bike") {
    wheel(ctx, -L * 0.32, -wr, wr, n, moving, lw);
    wheel(ctx, L * 0.32, -wr, wr, n, moving, lw);
    ctx.beginPath();
    ctx.moveTo(-L * 0.32, -wr);
    ctx.lineTo(-L * 0.05, -wr * 2);
    ctx.lineTo(L * 0.25, -wr * 2);
    ctx.lineTo(L * 0.32, -wr);
    ctx.moveTo(-L * 0.05, -wr * 2);
    ctx.lineTo(0, -wr);
    ctx.lineTo(-L * 0.32, -wr);
    ctx.moveTo(L * 0.25, -wr * 2);
    ctx.lineTo(L * 0.22, -wr * 2.4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 2.4;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw * 1.2;
    ctx.stroke();
    ctx.restore();
    return;
  }
  const bodyY = -wr * 1.1, top = -H;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (kind === "car" || kind === "taxi" || kind === "jeep") {
    ctx.moveTo(-L / 2, bodyY);
    ctx.lineTo(-L / 2, top + H * 0.45);
    ctx.lineTo(-L * 0.28, top + H * 0.42);
    ctx.lineTo(-L * 0.15, top);
    ctx.lineTo(L * 0.18, top);
    ctx.lineTo(L * 0.32, top + H * 0.42);
    ctx.lineTo(L / 2, top + H * 0.5);
    ctx.lineTo(L / 2, bodyY);
  } else if (kind === "boat") {
    ctx.moveTo(-L / 2, top + H * 0.4);
    ctx.lineTo(L / 2, top + H * 0.4);
    ctx.lineTo(L * 0.35, 0);
    ctx.lineTo(-L * 0.4, 0);
  } else {
    ctx.roundRect(-L / 2, top, L, H + bodyY, H * 0.1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // windows
  ctx.fillStyle = "#cfe8ff";
  if (kind === "bus" || kind === "train") {
    const n2 = kind === "bus" ? 5 : 7;
    for (let i = 0; i < n2; i++) {
      ctx.beginPath();
      ctx.roundRect(-L / 2 + L * 0.05 + i * (L * 0.82 / n2), top + H * 0.12, L * 0.82 / n2 - L * 0.02, H * 0.32, H * 0.04);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = shade(color, -40);
    ctx.fillRect(-L / 2, top + H * 0.55, L, H * 0.06);
    ctx.fillStyle = "#cfe8ff";
    ctx.beginPath();
    ctx.roundRect(L / 2 - L * 0.11, top + H * 0.12, L * 0.09, H * 0.6, H * 0.03);
    ctx.fill();
    ctx.stroke();
    if (kind === "bus") {
      ctx.fillStyle = INK;
      ctx.font = `bold ${Math.round(H * 0.11)}px Arial`;
      ctx.fillText("CITY BUS", -L * 0.42, top + H * 0.53);
    }
  } else if (kind === "car" || kind === "taxi" || kind === "jeep") {
    ctx.beginPath();
    ctx.moveTo(-L * 0.12, top + H * 0.08);
    ctx.lineTo(L * 0.15, top + H * 0.08);
    ctx.lineTo(L * 0.26, top + H * 0.4);
    ctx.lineTo(-L * 0.22, top + H * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (kind === "taxi") {
      ctx.fillStyle = INK;
      ctx.fillRect(-L * 0.08, top - H * 0.1, L * 0.16, H * 0.1);
    }
  } else if (kind === "truck" || kind === "tractor" || kind === "rickshaw") {
    ctx.beginPath();
    ctx.roundRect(L * 0.18, top + H * 0.1, L * 0.24, H * 0.3, H * 0.04);
    ctx.fill();
    ctx.stroke();
  }
  // lights
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(L / 2 - L * 0.01, bodyY - H * 0.15, H * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (kind !== "boat") {
    const wx = kind === "train" ? [-0.38, -0.2, 0.2, 0.38] : kind === "bus" || kind === "truck" ? [-0.33, 0.3] : [-0.3, 0.3];
    for (const k of wx) wheel(ctx, L * k, -wr, kind === "tractor" && k < 0 ? wr * 1.6 : wr, n, moving, lw);
  } else {
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = lw * 1.5;
    ctx.beginPath();
    for (let k = -3; k <= 3; k++) ctx.arc(k * L * 0.12 + (n % 20), 2, L * 0.05, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}
