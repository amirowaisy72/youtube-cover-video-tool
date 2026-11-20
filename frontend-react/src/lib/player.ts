/**
 * Story Animator player: draws the whole cartoon in the browser —
 * backgrounds, rigged characters, emotes, camera moves, time-skip
 * cards and subtitles — frame by frame on a canvas.
 *
 * The SAME drawing is used for the live preview (with the audio) and
 * for the final video (encoded in the browser with WebCodecs), so the
 * final MP4 is exactly what you saw in the preview.
 */
import type { CharacterConfig } from "./stickman";
import { environmentSvg, type EnvGeometry, type EnvLayout, MOVING_PLACES } from "./environment";
import { popIconSvg } from "./popups";
import { drawCreature, drawVehicle, madeUpSpecies, type Species, speciesFor, vehicleFor } from "./creatures";
import { type CharacterConfig as Cfg, normalizeCharacter } from "./stickman";
import {
  type CharFrame,
  drawCharacterAt,
  partKeys,
  RigAssets,
  type RigPose,
  smoothPose,
  targetPose,
} from "./rig";

export type TimelineFrame = {
  scene: number;
  chars: CharFrame[];
  cam: { z: number; x: number; y: number; sx: number; sy: number } | null;
  card?: { text: string; i: number; n: number };
};

export type Timeline = {
  fps: number;
  format: "long" | "reel";
  size: [number, number];          // character box in pixels (w, h)
  width: number; height: number;
  feetY: number;
  geometry: EnvGeometry;
  frames: TimelineFrame[];
  cues: { start: number; end: number; text: string; line?: [number, number] }[];
  layouts: EnvLayout[];            // drawn places ([] = pictures from the server)
  lie: { sitting: boolean; seat_end: number | null }[];
  subtitles: boolean;
  scenes: number;
  pops?: Pop[];
  extras?: Extra[];
  effects?: Effect[];
  /** {screen:…} — a computer / TV / phone screen fills the shot with this text (frames). */
  screens?: { start: number; end: number; text: string }[];
  /** Motion-graphic panels ({meter:…}, {map:…}, {countdown:3}…) drawn with Manim as picture frames. */
  inserts?: { start: number; end: number; dir: string; n: number; fps: number; kind: string; url?: string }[];
  /** Add-on packs (Script Planner): new outfits and the looks of side characters. */
  pack?: { outfits?: Record<string, LookSpec>; cast?: Record<string, LookSpec> };
  /** Characters the story made by itself (the Teacher, a talking Monkey…). */
  auto_chars?: { id: string; name: string; species: string; female: boolean }[];
};

/** An outfit or a person's look from an add-on pack (only the fields it sets change). */
export type LookSpec = {
  top?: string; topColor?: string; top2Color?: string; bottom?: string; bottomColor?: string;
  hat?: string; hatColor?: string; shoes?: string; shoeColor?: string; hair?: string; hairColor?: string;
  skin?: string; female?: boolean; add?: string[]; remove?: string[];
};

export function applyLook(cfg: Cfg, spec: LookSpec | undefined): Cfg {
  if (!spec) return cfg;
  const out: Record<string, unknown> = { ...cfg };
  for (const k of ["top", "topColor", "top2Color", "bottom", "bottomColor", "hat", "hatColor", "shoes", "shoeColor", "hair", "hairColor", "skin"] as const) {
    if (spec[k]) out[k] = spec[k];
  }
  const acc = new Set<string>((cfg.accessories as string[]) ?? []);
  for (const a of spec.remove ?? []) acc.delete(a);
  for (const a of spec.add ?? []) acc.add(a);
  out.accessories = [...acc];
  return normalizeCharacter(out as Partial<Cfg>);
}

/** A stickman look for a person the story created ("Mom", "Police Officer", "Old Man"…). */
export function autoHumanConfig(name: string, female: boolean): Cfg {
  let h = 7;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pick = <T,>(list: readonly T[]): T => { h = (h * 1103515245 + 12345) >>> 0; return list[(h >>> 8) % list.length]!; };
  const low = name.toLowerCase();
  const cfg: Record<string, unknown> = {
    skin: pick(["#ffffff", "#fde7d1", "#f1c9a5", "#d9a066", "#a8714a"]),
    hair: female ? pick(["long", "bun", "curly"]) : pick(["short", "side", "spiky", "curly", "none"]),
    hairColor: pick(["#1b1b1b", "#5b3a1e", "#8b5a2b", "#3f3f46"]),
    hat: "none", hatColor: "#222831",
    top: pick(["tshirt", "shirt", "checks", "kurta", "jacket"]),
    topColor: pick(["#e8643c", "#3d84c6", "#81b29a", "#9b8bd4", "#e76f51", "#2a9d8f", "#c0392b", "#f2cc8f", "#ec4899"]),
    top2Color: "#ffffff",
    bottom: female ? pick(["skirt", "shalwar", "jeans"]) : pick(["jeans", "trousers", "shorts", "shalwar"]),
    bottomColor: pick(["#2f3640", "#1e3a8a", "#57534e", "#7c2d12", "#374151"]),
    shoes: pick(["sneakers", "shoes", "slippers"]), shoeColor: pick(["#ffffff", "#1b1b1b", "#7c4f2c"]),
    accessories: [] as string[],
  };
  const acc = cfg.accessories as string[];
  if (/police|inspector|cop|officer|guard|soldier/.test(low)) Object.assign(cfg, { hat: "police", top: "police", bottom: "trousers" });
  if (/doctor|nurse|dentist|scientist/.test(low)) Object.assign(cfg, { top: "shirt", topColor: "#ffffff" }), acc.push("glasses");
  if (/teacher|sir|professor|principal|madam/.test(low)) acc.push("glasses");
  if (/grand|old|nana|dada|uncle|baba|grandpa/.test(low) && !female) Object.assign(cfg, { hair: "none", hairColor: "#d1d5db" }), acc.push("mustache");
  if (/grandma|granny|nani|dadi/.test(low)) Object.assign(cfg, { hair: "bun", hairColor: "#d1d5db" }), acc.push("glasses");
  if (/king|boss|rich|chief/.test(low)) acc.push("chain"), acc.push("sunglasses");
  if (/chef|cook/.test(low)) Object.assign(cfg, { top: "shirt", topColor: "#ffffff", hat: "beanie", hatColor: "#ffffff" });
  return normalizeCharacter(cfg as Partial<Cfg>);
}

/** A picture from the Asset Library ("om:1F408", "lib:ab12") or one of the built-in pop icons. */
const assetUrl = (src: string) => `/api/assets/file/${encodeURIComponent(src)}`;
const isLibrary = (src: string) => src.startsWith("om:") || src.startsWith("lib:");

async function bitmapFromImageUrl(url: string, w: number, h: number): Promise<ImageBitmap> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not load a picture."));
    img.src = url;
  });
  // keep the picture's shape inside a w x h box
  const r = Math.min(w / (img.naturalWidth || w), h / (img.naturalHeight || h));
  return createImageBitmap(img, { resizeWidth: Math.max(1, Math.round((img.naturalWidth || w) * r)),
    resizeHeight: Math.max(1, Math.round((img.naturalHeight || h) * r)), resizeQuality: "high" });
}

/** A word / object popping up the moment it is spoken. x, y = stage pixels near the speaker. */
/** An animal / vehicle / thing that comes into the scene when it is talked about. */
export type Extra = { scene: number; src: string; name: string; word?: string; kind?: string; enter: number; x: number; size: number;
  motion: "walk" | "drive" | "fly" | "pop"; from: "left" | "right" };

/** Fire that keeps burning, dust from running feet, a hit flash, sparkles. */
export type Effect = { type: "fire" | "dust" | "hit" | "sparkle"; scene: number; frame: number; x: number };

export type Pop = { frame: number; kind: "icon" | "text"; value: string; n: number; x: number; y: number; style: number };

const TRANS = 12; // frames of a scene-change transition
const TRANSITIONS = ["whip", "zoom", "iris", "spin", "flash", "slide"] as const;
const POP_COLORS = [["#fde047", "#ef4444"], ["#7dd3fc", "#2563eb"], ["#f9a8d4", "#a21caf"]] as const;

const SIT_DROP_UNITS = 56;

async function bitmapFromSvg(svg: string, w: number, h: number): Promise<ImageBitmap> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not draw a scene."));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  return createImageBitmap(img, { resizeWidth: w, resizeHeight: h });
}

async function bitmapFromUrl(url: string, w: number, h: number): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load a scene picture.");
  return createImageBitmap(await res.blob(), { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
}

export class StoryPlayer {
  readonly W: number;
  readonly H: number;
  private poses: Map<string, RigPose>[] = [];
  private backgrounds: ImageBitmap[] = [];
  /** Inside a bus / train / car / plane: the world rushing past the windows. */
  private scenery: (ImageBitmap | null)[] = [];
  private stage: HTMLCanvasElement;
  private prevStage: HTMLCanvasElement;
  readonly assets: RigAssets;
  protected popIcons = new Map<string, ImageBitmap>();
  private finalPrev: HTMLCanvasElement;
  private finalCur: HTMLCanvasElement;

  /** Characters who are animals (drawn by the creature rig, not the stickman rig). */
  protected creatures = new Map<string, Species>();

  constructor(public tl: Timeline, configs: Map<string, CharacterConfig>, private bgUrl: (i: number) => string) {
    this.W = tl.width;
    this.H = tl.height;
    for (const a of tl.auto_chars ?? []) {
      if (a.species) this.creatures.set(a.id, speciesFor(a.species) ?? speciesFor(a.name) ?? madeUpSpecies(a.name));
      else if (!configs.has(a.id)) {
        const look = tl.pack?.cast?.[a.name] ?? Object.entries(tl.pack?.cast ?? {}).find(([n]) => n.toLowerCase() === a.name.toLowerCase())?.[1];
        configs.set(a.id, applyLook(autoHumanConfig(a.name, look?.female ?? a.female), look));
      }
    }
    this.assets = new RigAssets(configs, tl.size[1] / 400);
    this.stage = document.createElement("canvas");
    this.stage.width = this.W; this.stage.height = this.H;
    this.prevStage = document.createElement("canvas");
    this.prevStage.width = this.W; this.prevStage.height = this.H;
    this.finalPrev = document.createElement("canvas");
    this.finalPrev.width = this.W; this.finalPrev.height = this.H;
    this.finalCur = document.createElement("canvas");
    this.finalCur.width = this.W; this.finalCur.height = this.H;
    this.computeTracks();
  }

  get frameCount() { return this.tl.frames.length; }
  get duration() { return this.tl.frames.length / this.tl.fps; }

  /** Smooth every character's joints over the whole video once (so any frame can be shown instantly). */
  private computeTracks() {
    const seeds = new Map<string, number>();
    const energy = new Map<string, number>(); // how much each one is "in" a sentence (smoothed)
    let prev = new Map<string, RigPose>();
    let prevScene = -1;
    this.tl.frames.forEach((f, n) => {
      const now = new Map<string, RigPose>();
      const snapAll = f.scene !== prevScene;
      for (const c of f.chars) {
        if (!seeds.has(c.cid)) seeds.set(c.cid, seeds.size * 1.7 + 0.4);
        const level = c.mouth === "talk-open" ? 1 : c.mouth === "talk-half" ? 0.5 : 0;
        const e = Math.max(level, (energy.get(c.cid) ?? 0) * 0.93);
        energy.set(c.cid, e);
        const target = targetPose(c, n, seeds.get(c.cid)!, level, e);
        now.set(c.cid, smoothPose(prev.get(c.cid) ?? null, target, snapAll || !prev.has(c.cid)));
      }
      this.poses.push(now);
      prev = now;
      prevScene = f.scene;
    });
  }

  /** Load every picture the video needs (scenes, heads, shirts, items, emotes). */
  async prepare(onProgress?: (msg: string) => void) {
    onProgress?.("Drawing the places…");
    const { W, H } = this;
    for (let i = 0; i < this.tl.scenes; i++) {
      const layout = this.tl.layouts[i];
      this.backgrounds[i] = layout
        ? (layout.image || layout.decor?.length ? await this.ownBackground(layout) : await bitmapFromSvg(environmentSvg(layout, this.tl.geometry), W, H))
        : await bitmapFromUrl(this.bgUrl(i), W, H);
      this.scenery[i] = null;
      if (layout && MOVING_PLACES.has(layout.kind)) {
        const views = layout.kind === "plane" ? ["mountain", "snow"] : ["village", "forest", "farm", "street", "jungle", "desert", "park"];
        const view = views[(layout.seed ?? i) % views.length]!;
        this.scenery[i] = await bitmapFromSvg(environmentSvg({ kind: view as EnvLayout["kind"], props: [], seed: (layout.seed ?? 1) + 7 }, this.tl.geometry), W, H);
      }
    }
    await this.preparePictures();
    await this.prepareInserts(onProgress);
    await this.prepareRig(onProgress);
  }

  /** The frames of every motion-graphic panel, loaded before filming. */
  protected insertFrames = new Map<string, HTMLImageElement[]>();
  protected async prepareInserts(onProgress?: (msg: string) => void) {
    const list = (this.tl.inserts ?? []).filter((x) => x.url && x.n > 0);
    let k = 0;
    for (const ins of list) {
      onProgress?.(`Loading the graphics… ${++k} of ${list.length}`);
      const imgs: HTMLImageElement[] = [];
      for (let i = 0; i < ins.n; i++) {
        const img = new Image();
        img.src = `${ins.url}${String(i).padStart(4, "0")}.png`;
        imgs.push(img);
      }
      await Promise.all(imgs.map((im) => im.decode().catch(() => undefined)));
      this.insertFrames.set(ins.dir, imgs);
    }
  }

  /** A motion-graphic panel over the film: slides in at the top corner (top middle on a Reel). */
  protected drawInserts(ctx: CanvasRenderingContext2D, n: number) {
    const ins = (this.tl.inserts ?? []).find((x) => n >= x.start && n < x.end);
    if (!ins) return;
    const imgs = this.insertFrames.get(ins.dir);
    if (!imgs?.length) return;
    const t = (n - ins.start) / this.tl.fps;
    const img = imgs[Math.min(imgs.length - 1, Math.floor(t * ins.fps))]!;
    if (!img.complete || !img.naturalWidth) return;
    const { W, H } = this;
    const tall = H > W;
    const full = ins.kind === "chapter";
    const pw = full ? W : tall ? W * 0.86 : W * 0.4, ph = (pw * 9) / 16;
    const into = Math.min(1, (n - ins.start) / 6), out = Math.min(1, (ins.end - n) / 6);
    const k = Math.min(into, out);
    const ease = 1 - (1 - k) ** 3;
    const x = full ? 0 : tall ? (W - pw) / 2 : W - pw - W * 0.03;
    const y = full ? (H - ph) / 2 : (tall ? H * 0.12 : H * 0.12) - (1 - ease) * (ph + H * 0.15); // below the subtitles
    ctx.save();
    ctx.globalAlpha = full ? ease : 1;
    if (!full) {
      ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      ctx.beginPath(); ctx.roundRect(x, y, pw, ph, 18); ctx.fillStyle = "#0b1020"; ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, pw, ph, 18); ctx.clip();
      ctx.drawImage(img, x, y, pw, ph);
      ctx.restore();
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.roundRect(x, y, pw, ph, 18); ctx.stroke();
    } else {
      ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, x, y, pw, ph);
    }
    ctx.restore();
  }

  /** Pictures for pop-ups and extras (OpenMoji / your library / built-in icons). */
  protected async preparePictures() {
    const pics = [...(this.tl.pops ?? []).filter((p) => p.kind === "icon").map((p) => p.value),
      ...(this.tl.extras ?? []).map((e) => e.src)];
    for (const src of pics) {
      if (this.popIcons.has(src)) continue;
      try {
        if (isLibrary(src)) this.popIcons.set(src, await bitmapFromImageUrl(assetUrl(src), 320, 320));
        else {
          const svg = popIconSvg(src);
          if (svg) this.popIcons.set(src, await bitmapFromSvg(svg, 256, 256));
        }
      } catch { /* a missing picture just does not show */ }
    }
  }

  private async prepareRig(onProgress?: (msg: string) => void) {
    onProgress?.("Drawing the characters…");
    const keys = new Set<string>();
    this.tl.frames.forEach((f, n) => {
      for (const c of f.chars) {
        const p = this.poses[n]!.get(c.cid);
        if (p) for (const k of partKeys(this.assets, c, p)) keys.add(k);
      }
    });
    const all = [...keys];
    for (let i = 0; i < all.length; i += 24) {
      await this.assets.need(all.slice(i, i + 24));
      onProgress?.(`Drawing the characters… ${Math.min(all.length, i + 24)} of ${all.length}`);
    }
  }

  // ------------------------------------------------------------ frame
  private drawScene(ctx: CanvasRenderingContext2D, n: number) {
    const f = this.tl.frames[n]!;
    const { W, H } = this;
    const [, sh] = this.tl.size;
    const u = sh / 400;
    const feet = this.tl.feetY;
    const geo = this.tl.geometry;
    const bg = this.backgrounds[f.scene];
    const view = this.scenery[f.scene];
    if (view) {
      // the world rushing past the windows, the vehicle gently bumping
      const off = (n * 22) % W;
      ctx.drawImage(view, -off, 0, W, H);
      ctx.drawImage(view, W - off, 0, W, H);
      if (bg) ctx.drawImage(bg, 0, Math.sin(n * 0.9) * 2 * u, W, H);
    } else if (bg) ctx.drawImage(bg, 0, 0, W, H);
    else { ctx.fillStyle = "#e2e8f0"; ctx.fillRect(0, 0, W, H); }
    const layoutNow = this.tl.layouts[f.scene];
    if (layoutNow?.night) { ctx.fillStyle = "rgba(12,20,60,0.5)"; ctx.fillRect(0, 0, W, H); }
    this.drawFires(ctx, n, f.scene, feet, u, false);
    this.drawExtras(ctx, n, f.scene, feet);
    const emotes: [ImageBitmap, number, number][] = [];
    const order = [...f.chars].sort((a, b) => (a.stance === "lie" || a.rot ? 0 : 1) - (b.stance === "lie" || b.rot ? 0 : 1));
    for (const c of order) {
      const p = this.poses[n]!.get(c.cid);
      if (!p) continue;
      let cx = c.x * W + c.dx * u;
      let cy = feet - sh / 2 + c.dy * u;
      let rot = c.rot;
      if (c.stance === "lie") {
        rot = -90;
        const info = this.tl.lie[f.scene] ?? { sitting: false, seat_end: null };
        cy = (info.sitting ? geo.seatY : geo.floorY - 4 * u) - 40 * u;
        if (info.sitting && info.seat_end !== null) cx = info.seat_end * W - 110 * u;
      } else if (rot) {
        const k = Math.min(1, Math.abs(rot) / 90);
        cy += (geo.floorY - 40 * u - cy) * k;
      }
      if (c.flags?.ladder) this.drawLadder(ctx, c.x * W + c.dx * u, feet, sh);
      const sp = (c.form ? speciesFor(c.form) ?? madeUpSpecies(c.form) : null) ?? this.creatures.get(c.cid);
      if (c.morph && c.morph.t >= c.morph.swap - 3 && c.morph.t < c.morph.swap + 20) {
        // the magic puff (2D)
        const k = (c.morph.t - c.morph.swap + 3) / 23;
        ctx.save();
        ctx.globalAlpha = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7, r = (40 + 120 * Math.sqrt(k)) * u;
          ctx.beginPath();
          ctx.arc(c.x * W + Math.cos(a) * r * 0.8, feet - sh * 0.35 + Math.sin(a) * r * 0.6, (50 + 30 * (i % 3)) * u * (0.6 + k), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (sp) {
        const talk = c.mouth === "talk-open" ? 1 : c.mouth === "talk-half" ? 0.5 : 0;
        drawCreature(ctx, sp, { n, walking: c.stance.startsWith("walk"), talk, blink: c.blink, expr: c.expr },
          c.x * W + c.dx * u, feet + c.dy * u, sp.h * sh * 0.94, c.facing === "left" ? -1 : 1);
      } else drawCharacterAt(ctx, this.assets, c, p, cx, cy, u, rot);
      if (typeof c.flags?.rope === "number") this.drawRope(ctx, cx, feet + c.dy * u, sh, c.flags.rope as number);
      if (c.flags?.match) this.drawMatch(ctx, cx + (c.facing === "left" ? -1 : 1) * 70 * u, cy + 40 * u, n, u);
      if (c.emote) {
        const img = this.assets.get(`e|${c.emote[0]}|${c.emote[1]}`);
        if (img) {
          const drop = c.stance === "sit" ? SIT_DROP_UNITS : 0;
          const a = (rot * Math.PI) / 180;
          const vy = (78 + drop + p.headY - 190) * u;
          const hx = vy * Math.sin(a), hy = vy * Math.cos(a);
          const side = c.facing === "right" ? 1 : -1;
          const [ex, ey] = Math.abs(rot) > 45 ? [cx + hx, cy + hy - 80 * u] : [cx + hx + side * 50 * u, cy + hy - 95 * u];
          emotes.push([img, ex, ey]);
        }
      }
    }
    const es = this.tl.size[0] * 0.55;
    this.drawAfterFx(ctx, n, f.scene, feet, u);
    for (const [img, ex, ey] of emotes) ctx.drawImage(img, ex - es / 2, ey - es / 2, es, es);
  }

  // ------------------------------------------------------------ effects
  private drawLadder(ctx: CanvasRenderingContext2D, x: number, ground: number, sh: number) {
    const top = ground - sh * 1.55, w = sh * 0.16;
    ctx.save();
    ctx.lineCap = "round";
    for (const [col, lw] of [["#1b1b1b", sh * 0.03], ["#b45309", sh * 0.018]] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x - w, ground); ctx.lineTo(x - w, top);
      ctx.moveTo(x + w, ground); ctx.lineTo(x + w, top);
      for (let y = ground - sh * 0.1; y > top; y -= sh * 0.13) { ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawRope(ctx: CanvasRenderingContext2D, x: number, ground: number, sh: number, phase: number) {
    // the rope swings around the body: over the head, then under the feet
    const a = phase * Math.PI * 2;
    const ry = sh * 0.55, cy = ground - sh * 0.5;
    ctx.save();
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = Math.max(3, sh * 0.012);
    ctx.beginPath();
    ctx.ellipse(x, cy + Math.cos(a) * ry * 0.05, sh * 0.32, ry, 0, Math.PI * (1 + Math.cos(a) * 0.5), Math.PI * (2 - Math.cos(a) * 0.5));
    ctx.stroke();
    ctx.restore();
  }

  private drawMatch(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, u: number) {
    ctx.save();
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 4 * u;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14 * u, y - 18 * u); ctx.stroke();
    this.flame(ctx, x + 16 * u, y - 20 * u, 12 * u, n);
    ctx.restore();
  }

  private flame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, n: number) {
    const f = 1 + Math.sin(n * 1.7) * 0.12 + Math.sin(n * 3.1) * 0.08;
    for (const [col, k] of [["#ef4444", 1], ["#f97316", 0.75], ["#fde047", 0.45]] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2.2 * k * f);
      ctx.quadraticCurveTo(x + s * k, y - s * 0.6 * k, x, y);
      ctx.quadraticCurveTo(x - s * k, y - s * 0.6 * k, x, y - s * 2.2 * k * f);
      ctx.fill();
    }
  }

  /** Campfires (with glow, logs, flames and rising smoke). front=false draws the base. */
  private drawFires(ctx: CanvasRenderingContext2D, n: number, scene: number, ground: number, u: number, front: boolean) {
    const { W } = this;
    for (const e of this.tl.effects ?? []) {
      if (e.type !== "fire" || e.scene !== scene || n < e.frame) continue;
      const x = e.x * W, t = n - e.frame, grow = Math.min(1, t / 14);
      if (!front) {
        const g = ctx.createRadialGradient(x, ground - 40 * u, 0, x, ground - 40 * u, 260 * u * grow);
        g.addColorStop(0, "rgba(253,186,116,0.45)");
        g.addColorStop(1, "rgba(253,186,116,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 300 * u, ground - 330 * u, 600 * u, 400 * u);
        ctx.save();
        ctx.lineCap = "round";
        for (const a of [-0.35, 0.35]) {
          ctx.strokeStyle = "#1b1b1b"; ctx.lineWidth = 22 * u;
          ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 50 * u, ground - 6 * u + Math.sin(a) * 10 * u); ctx.lineTo(x + Math.cos(a) * 50 * u, ground - 6 * u - Math.sin(a) * 10 * u); ctx.stroke();
          ctx.strokeStyle = "#8b5a2b"; ctx.lineWidth = 15 * u; ctx.stroke();
        }
        ctx.restore();
        for (let k = 0; k < 4; k++) this.flame(ctx, x + (k - 1.5) * 18 * u, ground - 10 * u, (20 + (k % 2) * 10) * u * grow, n + k * 7);
      } else {
        // smoke puffs drifting up and fading
        for (let k = 0; k < 8; k++) {
          const age = ((t + k * 11) % 88) / 88;
          if (t < k * 11) continue;
          ctx.fillStyle = `rgba(120,120,130,${(0.45 * (1 - age)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x + Math.sin(age * 6 + k) * 30 * u, ground - 90 * u - age * 420 * u, (14 + age * 46) * u, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  /** Dust from running feet, flashes on hits, sparkles, rain and snow. */
  private drawAfterFx(ctx: CanvasRenderingContext2D, n: number, scene: number, ground: number, u: number) {
    const { W, H } = this;
    this.drawFires(ctx, n, scene, ground, u, true);
    for (const e of this.tl.effects ?? []) {
      if (e.scene !== scene || e.type === "fire") continue;
      const t = n - e.frame;
      if (t < 0 || t > 16) continue;
      const x = e.x * W, k = t / 16;
      if (e.type === "dust") {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(160,140,110,${(0.5 * (1 - k)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x + (i - 1.5) * 16 * u * (1 + k * 2), ground - 8 * u - k * 20 * u, (8 + k * 18) * u, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (e.type === "hit" && t < 8) {
        const y = ground - this.tl.size[1] * 0.6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.2);
        ctx.fillStyle = t % 2 ? "#fde047" : "#ffffff";
        ctx.strokeStyle = "#1b1b1b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2, rr = (i % 2 ? 26 : 60) * u * (1 + t * 0.08);
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.font = `900 ${Math.round(34 * u)}px Arial Black, Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(["POW!", "BAM!", "WHACK!"][Math.round(e.x * 100 + e.frame) % 3]!, 0, 0);
        ctx.restore();
      } else if (e.type === "sparkle") {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2, d = 30 * u + k * 90 * u;
          ctx.fillStyle = i % 2 ? "#fde047" : "#f472b6";
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * d, ground - this.tl.size[1] * 0.75 + Math.sin(a) * d, 7 * u * (1 - k), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const lay = this.tl.layouts[scene];
    if (lay?.weather === "rain") {
      ctx.strokeStyle = "rgba(180,200,255,0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 140; i++) {
        const x = ((i * 97.13 + n * 6) % (W + 60)) - 30, y = ((i * 57.7 + n * 28) % (H + 40)) - 20;
        ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22);
      }
      ctx.stroke();
    } else if (lay?.weather === "snow") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 110; i++) {
        const x = ((i * 97.13 + Math.sin(n / 20 + i) * 30) % W + W) % W, y = ((i * 57.7 + n * 3) % (H + 20)) - 10;
        ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  /** Time / place cards (user, 2026-11-18: "the same clock in every video"): the card fits its words —
   *  a clock for minutes / hours, calendar pages for days / months, the sun and moon for morning /
   *  night, a map pin for "Meanwhile at…" — and its colours change from video to video. */
  protected drawCard(ctx: CanvasRenderingContext2D, card: NonNullable<TimelineFrame["card"]>) {
    const { W, H } = this;
    const low = card.text.toLowerCase();
    let hsh = 7 + this.tl.frames.length;
    for (const ch of low) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const style = /\b(meanwhile|elsewhere|back at|back in|over at|across town|on the other side)\b/.test(low) ? "place"
      : /\b(morning|evening|night|sunset|sunrise|noon|midnight|dawn|dusk|afternoon|tonight)\b/.test(low) ? "sun"
        : /\b(days?|weeks?|months?|years?|summer|winter|spring|autumn|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|tomorrow|yesterday)\b/.test(low) ? "calendar"
          : /\b(minutes?|hours?|seconds?|later|o'clock)\b/.test(low) ? "clock" : "burst";
    const PAL = [["#1e293b", "#334155"], ["#3b0764", "#6d28d9"], ["#0c4a6e", "#0369a1"], ["#7c2d12", "#ea580c"], ["#14532d", "#16a34a"], ["#831843", "#db2777"], ["#1e1b4b", "#4338ca"], ["#713f12", "#ca8a04"]];
    const [c0, c1] = PAL[hsh % PAL.length]! as [string, string];
    const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
    grad.addColorStop(0, c0); grad.addColorStop(1, c1);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // moving light rays behind
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = "#ffffff";
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + card.i * 0.01;
      ctx.beginPath(); ctx.moveTo(W / 2, H * 0.4);
      ctx.arc(W / 2, H * 0.4, Math.hypot(W, H), a, a + 0.18); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const R = Math.min(W, H) * 0.17;
    const pop = Math.min(1, card.i / 6);
    const k = 0.6 + 0.4 * (1 + 2.4 * (pop - 1) ** 3 + 1.4 * (pop - 1) ** 2);
    const cx = W / 2, cy = H * 0.4, t = card.i / Math.max(1, card.n);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineWidth = 6; ctx.strokeStyle = "#141414"; ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (style === "clock") {
      ctx.beginPath(); ctx.arc(0, 0, R + 8, 0, Math.PI * 2); ctx.fillStyle = "#f59e0b"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.stroke();
      for (let q = 0; q < 12; q++) { const a = (Math.PI * 2 * q) / 12; ctx.beginPath(); ctx.moveTo(Math.sin(a) * R * 0.82, -Math.cos(a) * R * 0.82); ctx.lineTo(Math.sin(a) * R * 0.95, -Math.cos(a) * R * 0.95); ctx.lineWidth = 5; ctx.stroke(); }
      for (const [len, ang, w] of [[0.75, t * Math.PI * 6, 6], [0.5, t * Math.PI * 0.5 + 1, 9]] as const) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ang) * R * len, -Math.cos(ang) * R * len); ctx.lineWidth = w; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = "#ef4444"; ctx.fill();
    } else if (style === "calendar") {
      // pages flip away one after another
      const pages = 4, flip = Math.min(pages - 1, Math.floor(t * pages * 1.2));
      for (let q = pages - 1; q >= flip; q--) {
        const lift = q === flip ? Math.min(1, (t * pages * 1.2) % 1) : 0;
        ctx.save(); ctx.translate(lift * R * 1.6, -lift * R * 1.2); ctx.rotate(lift * 0.9);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(-R, -R * 0.9, R * 2, R * 1.9); ctx.strokeRect(-R, -R * 0.9, R * 2, R * 1.9);
        ctx.fillStyle = "#ef4444"; ctx.fillRect(-R, -R * 0.9, R * 2, R * 0.5); ctx.strokeRect(-R, -R * 0.9, R * 2, R * 0.5);
        ctx.fillStyle = "#141414"; ctx.font = `900 ${Math.round(R * 0.9)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(((hsh >> 3) % 20) + 3 + q * 7), 0, R * 0.35);
        ctx.restore();
      }
      for (const x of [-R * 0.5, R * 0.5]) { ctx.beginPath(); ctx.arc(x, -R * 0.9, 9, 0, Math.PI * 2); ctx.fillStyle = "#94a3b8"; ctx.fill(); ctx.stroke(); }
    } else if (style === "sun") {
      // the sun goes down, the moon comes up (or the other way for "morning")
      const toNight = !/\b(morning|sunrise|dawn|noon)\b/.test(low);
      const a = (toNight ? t : 1 - t) * Math.PI;
      ctx.beginPath(); ctx.moveTo(-R * 1.8, R * 0.9); ctx.lineTo(R * 1.8, R * 0.9); ctx.lineWidth = 6; ctx.stroke();
      const sx = -Math.cos(a) * R * 1.4, sy = R * 0.9 - Math.sin(a) * R * 1.4;
      ctx.beginPath(); ctx.arc(sx, sy, R * 0.45, 0, Math.PI * 2); ctx.fillStyle = "#fbbf24"; ctx.fill(); ctx.stroke();
      const mx = Math.cos(a) * R * 1.4, my = R * 0.9 - Math.sin(Math.PI - a) * R * 1.0 * (1 - Math.abs(Math.cos(a)));
      ctx.beginPath(); ctx.arc(mx, my, R * 0.35, 0, Math.PI * 2); ctx.fillStyle = "#e2e8f0"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx + R * 0.15, my - R * 0.08, R * 0.3, 0, Math.PI * 2); ctx.fillStyle = c1; ctx.fill();
    } else if (style === "place") {
      // a map with a dotted path to a pin
      ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.moveTo(-R * 1.5, -R); ctx.lineTo(-R * 0.5, -R * 0.8); ctx.lineTo(R * 0.5, -R); ctx.lineTo(R * 1.5, -R * 0.8);
      ctx.lineTo(R * 1.5, R); ctx.lineTo(R * 0.5, R * 0.8); ctx.lineTo(-R * 0.5, R); ctx.lineTo(-R * 1.5, R * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.setLineDash([10, 12]); ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-R * 1.1, R * 0.5);
      const steps = 30, upto = Math.max(2, Math.floor(steps * Math.min(1, t * 1.4)));
      let px = 0, py = 0;
      for (let q = 0; q <= upto; q++) { const u = q / steps; px = -R * 1.1 + u * R * 2.1; py = R * 0.5 - u * R * 0.9 + Math.sin(u * 7) * R * 0.25; ctx.lineTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = "#141414"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py - R * 0.38, R * 0.24, Math.PI * 0.8, Math.PI * 2.2); ctx.closePath(); ctx.fillStyle = "#ef4444"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py - R * 0.38, R * 0.09, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
    } else {
      ctx.fillStyle = "#fde047"; this.burst(ctx, R * 1.1, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#141414"; ctx.font = `900 ${Math.round(R * 0.9)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", 0, 0);
    }
    ctx.restore();
    if (card.i > 6) {
      const shown = card.text.slice(0, Math.max(1, Math.floor(card.text.length * Math.min(1, (card.i - 4) / 10))));
      this.text(ctx, shown, W / 2, H * 0.72, Math.round(Math.min(W, H) * 0.075));
    }
  }

  private text(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
    ctx.font = `bold ${size}px Arial, "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(4, size / 6);
    ctx.strokeStyle = "#111111";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x, y);
  }

  protected subtitles(ctx: CanvasRenderingContext2D, n: number) {
    if (!this.tl.subtitles) return;
    const t = n / this.tl.fps;
    const cue = this.tl.cues.find((c) => t >= c.start && t <= c.end + 0.15);
    if (!cue) return;
    const { W, H } = this;
    const size = this.tl.format === "long" ? 44 : 50;
    ctx.font = `bold ${size}px Arial, "Segoe UI", sans-serif`;
    const words = cue.text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width > W * 0.86 && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    const top = this.tl.format === "long" ? H * 0.07 : H * 0.84;
    lines.forEach((ln, i) => this.text(ctx, ln, W / 2, top + i * size * 1.15, size));
  }

  /** Draw frame n onto ctx (the output size). */
  /** One finished picture (camera applied, pop-ups on top), no transition. */
  protected renderPlain(ctx: CanvasRenderingContext2D, n: number) {
    const f = this.tl.frames[n]!;
    const { W, H } = this;
    if (f.card) { this.drawCard(ctx, f.card); return; }
    const sctx = this.stage.getContext("2d")!;
    this.drawScene(sctx, n);
    const cam = f.cam;
    let z = cam ? Math.max(cam.z, cam.sx || cam.sy ? 1.04 : 1) : 1;
    if (z < 1.005) z = 1;
    const cw = W / z, ch = H / z;
    const x0 = cam ? Math.min(Math.max(cam.x + cam.sx - cw / 2, 0), W - cw) : 0;
    const y0 = cam ? Math.min(Math.max(cam.y + cam.sy - ch / 2, 0), H - ch) : 0;
    ctx.drawImage(this.stage, x0, y0, cw, ch, 0, 0, W, H);
    this.drawPops(ctx, n, x0, y0, z);
    this.drawScreen(ctx, n);
    this.drawInserts(ctx, n);
  }

  /** {screen:Installing GTA 6 — 47%}: the camera "cuts" to a real-looking screen —
   * a monitor (a phone on a Reel) with the text, a progress bar that fills when the
   * text has a percentage, a glowing title for "MISSION COMPLETE"-style moments. */
  protected drawScreen(ctx: CanvasRenderingContext2D, n: number) {
    const sc = (this.tl.screens ?? []).find((x) => n >= x.start && n < x.end);
    if (!sc) return;
    const { W, H } = this;
    const k = n - sc.start, left = sc.end - n;
    const a = Math.min(1, k / 6, left / 6);
    const grow = 0.92 + 0.08 * (1 - Math.pow(1 - Math.min(1, k / 10), 3)) + 0.012 * (k / 60);
    const tall = H > W;
    const text = sc.text.trim();
    const pctM = text.match(/(\d{1,3})\s*%/);
    const pct = pctM ? Math.min(100, Number(pctM[1])) : null;
    const big = /mission|complete|passed|won\b|wasted|busted|slow motion|take off|emergency|press start|launch/i.test(text) && text.length < 48;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(4,6,14,0.72)";
    ctx.fillRect(0, 0, W, H);
    const sw = (tall ? W * 0.8 : W * 0.7) * grow, sh = tall ? sw * 1.9 : sw * 0.6;
    const x = (W - sw) / 2, y = (H - sh) / 2 - (tall ? 0 : H * 0.02);
    const r = Math.min(W, H) * 0.02;
    const round = (rx: number, ry: number, rw: number, rh: number, rr: number) => {
      ctx.beginPath(); ctx.moveTo(rx + rr, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rr); ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
      ctx.arcTo(rx, ry + rh, rx, ry, rr); ctx.arcTo(rx, ry, rx + rw, ry, rr); ctx.closePath();
    };
    // the device: a dark bezel, a soft glow behind it, a stand under a monitor
    ctx.shadowColor = "rgba(56,189,248,0.45)"; ctx.shadowBlur = Math.min(W, H) * 0.06;
    ctx.fillStyle = "#0b0d12"; round(x - r, y - r, sw + 2 * r, sh + 2 * r, r * 1.6); ctx.fill();
    ctx.shadowBlur = 0;
    if (!tall) {
      ctx.fillStyle = "#14161d";
      ctx.fillRect(W / 2 - sw * 0.04, y + sh + r, sw * 0.08, H * 0.05);
      round(W / 2 - sw * 0.14, y + sh + r + H * 0.05, sw * 0.28, H * 0.018, H * 0.009); ctx.fill();
    }
    const g = ctx.createLinearGradient(x, y, x + sw, y + sh);
    g.addColorStop(0, "#0b1230"); g.addColorStop(1, big ? "#3b0764" : "#111827");
    ctx.fillStyle = g; round(x, y, sw, sh, r * 0.8); ctx.fill();
    // a top bar like a real window
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(x, y, sw, sh * 0.07);
    for (const [i, c] of ["#ef4444", "#f59e0b", "#22c55e"].entries()) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + sh * 0.05 + i * sh * 0.045, y + sh * 0.035, sh * 0.013, 0, Math.PI * 2); ctx.fill();
    }
    // the words, wrapped to fit
    const fs = Math.round((big ? 0.115 : 0.072) * (tall ? sw * 0.9 : sh));
    ctx.font = `800 ${fs}px "Poppins", "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > sw * 0.86 && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    const lh = fs * 1.18, ty = y + sh * (pct !== null ? 0.4 : 0.5) - ((lines.length - 1) * lh) / 2;
    if (big) { ctx.shadowColor = "#facc15"; ctx.shadowBlur = fs * 0.5; }
    ctx.fillStyle = big ? "#fde047" : "#f8fafc";
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, ty + i * lh));
    ctx.shadowBlur = 0;
    if (pct !== null) {
      // the bar fills up a little while it is on screen (a real download)
      const shown = Math.min(100, pct + Math.min(3, k / 20));
      const bw = sw * 0.7, bh = sh * 0.055, bx = W / 2 - bw / 2, by = y + sh * 0.68;
      ctx.fillStyle = "rgba(255,255,255,0.12)"; round(bx, by, bw, bh, bh / 2); ctx.fill();
      const fg = ctx.createLinearGradient(bx, 0, bx + bw, 0); fg.addColorStop(0, "#22d3ee"); fg.addColorStop(1, "#a855f7");
      ctx.fillStyle = fg; round(bx, by, Math.max(bh, (bw * shown) / 100), bh, bh / 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)"; const sx = bx + ((k * 9) % Math.max(1, (bw * shown) / 100)); ctx.fillRect(sx, by, bh * 0.8, bh);
    }
    ctx.restore();
  }

  /** Your own background picture, its floor line on our floor, furniture drawn on top. */
  private async ownBackground(layout: EnvLayout): Promise<ImageBitmap> {
    const { W, H } = this;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    if (!layout.image) {
      ctx.drawImage(await bitmapFromSvg(environmentSvg({ ...layout, props: [] }, this.tl.geometry), W, H), 0, 0);
      // pictures of things that belong to this place (a castle, a ghost…)
      for (const d of layout.decor ?? []) {
        try {
          const pic = await bitmapFromImageUrl(assetUrl(d.src), 512, 512);
          const size = d.size * H;
          const iw = size * (pic.width / Math.max(pic.width, pic.height)), ih = size * (pic.height / Math.max(pic.width, pic.height));
          const floor = this.tl.geometry.floorY - 40 * this.tl.geometry.unit;
          const y = d.y >= 0.75 ? floor - ih + size * 0.04 : d.y * H - ih / 2;
          ctx.drawImage(pic, d.x * W - iw / 2, y, iw, ih);
        } catch { /* skip a missing picture */ }
      }
      if (layout.props.length) ctx.drawImage(await bitmapFromSvg(environmentSvg({ ...layout, transparent: true }, this.tl.geometry), W, H), 0, 0);
      return createImageBitmap(canvas);
    }
    try {
      const img = await bitmapFromImageUrl(assetUrl(layout.image!), W * 2, H * 2);
      const floor = this.tl.geometry.floorY - 40 * this.tl.geometry.unit;
      // cover the screen, then slide so the picture's floor line sits on ours
      const sc = Math.max(W / img.width, H / img.height);
      const dw = img.width * sc, dh = img.height * sc;
      let dy = floor - (layout.floor ?? 0.82) * dh;
      dy = Math.min(0, Math.max(H - dh, dy));
      ctx.drawImage(img, (W - dw) / 2, dy, dw, dh);
    } catch {
      ctx.drawImage(await bitmapFromSvg(environmentSvg({ ...layout, image: undefined, transparent: false }, this.tl.geometry), W, H), 0, 0);
    }
    if (layout.props.length) ctx.drawImage(await bitmapFromSvg(environmentSvg(layout, this.tl.geometry), W, H), 0, 0);
    return createImageBitmap(canvas);
  }

  /** Extras: the cat walks in, the car drives in, the bird flies about. */
  private drawExtras(ctx: CanvasRenderingContext2D, n: number, scene: number, ground: number) {
    const { W, H } = this;
    for (const e of this.tl.extras ?? []) {
      if (e.scene !== scene || n < e.enter) continue;
      const t = n - e.enter;
      const word = e.word ?? e.name;
      const charH = this.tl.size[1] * 0.94;
      const sp = speciesFor(word) ?? speciesFor(e.name) ?? (e.kind === "animal" ? madeUpSpecies(word) : null);
      const veh = sp ? null : vehicleFor(word) ?? vehicleFor(e.name);
      if (sp || veh) {
        // a real moving character: walks / drives / flies in, then lives in the scene
        const target = e.x * W, fromLeft = e.from === "left";
        const len = sp ? sp.h * charH * sp.len * 0.6 : 3 * charH;
        const startX = fromLeft ? -len : W + len;
        const k = Math.min(1, t / (veh ? 36 : 40));
        const ease = 1 - (1 - k) ** 2;
        const x = startX + (target - startX) * ease;
        const arrived = k >= 1;
        const face: 1 | -1 = !arrived ? (fromLeft ? 1 : -1) : (target < W / 2 ? 1 : -1);
        if (veh) drawVehicle(ctx, veh, x, ground, charH, fromLeft ? 1 : -1, n, !arrived, ["#facc15", "#ef4444", "#3b82f6", "#10b981", "#f97316"][Math.round(e.x * 10) % 5]!);
        else {
          const wander = arrived ? Math.sin((n - e.enter) / 60) * W * 0.03 : 0;
          drawCreature(ctx, sp!, { n, walking: !arrived || Math.abs(Math.cos((n - e.enter) / 60)) > 0.6, talk: 0, blink: n % 90 < 4,
            expr: "happy", flying: e.motion === "fly" }, x + wander, ground, sp!.h * charH, face);
        }
        continue;
      }
      const img = this.popIcons.get(e.src);
      if (!img) continue;
      const size = e.size * H;
      const iw = size * (img.width / Math.max(img.width, img.height));
      const ih = size * (img.height / Math.max(img.width, img.height));
      const target = e.x * W;
      const startX = e.from === "left" ? -size : W + size;
      const ease = (k: number) => 1 - (1 - Math.min(1, k)) ** 3;
      let x = target, y = ground, rot = 0, sc = 1;
      // Pictures face left; moving right means flipping.
      let flip = e.from === "left";
      if (e.motion === "walk") {
        const k = t / 30;
        x = startX + (target - startX) * ease(k);
        if (k < 1) y -= Math.abs(Math.sin(t * 0.55)) * size * 0.12;
        else {
          const hop = (n + Math.round(e.x * 97)) % 70;
          if (hop < 8) y -= Math.sin((hop / 8) * Math.PI) * size * 0.18;
          rot = Math.sin(n / 9) * 0.05;
          sc = 1 + Math.sin(n / 7) * 0.02;
          flip = target < W / 2; // after arriving, look towards the middle
        }
      } else if (e.motion === "drive") {
        const k = t / 26;
        x = startX + (target - startX) * ease(k);
        y -= Math.abs(Math.sin(n * 1.7)) * 2;
      } else if (e.motion === "fly") {
        const k = Math.min(1, t / 30);
        x = startX + (target - startX) * ease(k) + Math.sin(n / 23) * size * 0.8 * k;
        y = ground - size * 2.6 + Math.sin(n / 6) * size * 0.25;
        rot = Math.sin(n / 5) * 0.12;
        flip = Math.cos(n / 23) > 0;
      } else {
        const k = Math.min(1, t / 8);
        sc = k < 1 ? 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2 : 1 + Math.sin(n / 8) * 0.02;
      }
      ctx.save();
      ctx.translate(x, y);
      // soft shadow on the ground
      if (e.motion !== "fly") {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.beginPath();
        ctx.ellipse(0, 0, iw * 0.4, size * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.rotate(rot);
      ctx.scale(flip ? -sc : sc, sc);
      ctx.drawImage(img, -iw / 2, -ih * 0.95, iw, ih);
      ctx.restore();
    }
  }

  /** Pop-ups: bounce in with a little overshoot, wiggle, then pop away. */
  protected drawPops(ctx: CanvasRenderingContext2D, n: number, x0: number, y0: number, z: number,
    place?: (pop: Pop) => [number, number] | null, sizeK = 0.24) {
    const { W, H } = this;
    const size = Math.min(W, H) * sizeK;
    for (const pop of this.tl.pops ?? []) {
      const t = n - pop.frame;
      if (t < 0 || t >= pop.n) continue;
      const appear = Math.min(1, t / 6);
      const back = 1 + 2.4 * (appear - 1) ** 3 + 1.4 * (appear - 1) ** 2; // ease-out-back
      const leave = t > pop.n - 6 ? (pop.n - t) / 6 : 1;
      const scale = Math.max(0, back * leave);
      const rot = Math.sin(t / 3) * 0.12 * (1 - appear * 0.5);
      const at = place ? place(pop) : [(pop.x - x0) * z, (pop.y - y0) * z] as [number, number];
      if (!at) continue; // no free spot (it would cover someone) / not the moment for it
      let [sx, sy] = at;
      sy -= t * 0.6;
      sx = Math.min(Math.max(sx, size * 0.6), W - size * 0.6);
      sy = Math.min(Math.max(sy, size * 0.6), H - size * 0.9);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot + (pop.style - 1) * 0.08);
      ctx.scale(scale, scale);
      const [fill, edge] = POP_COLORS[pop.style % POP_COLORS.length]!;
      const icon = pop.kind === "icon" ? this.popIcons.get(pop.value) : undefined;
      if (icon) {
        // a soft burst behind the object
        ctx.fillStyle = fill;
        this.burst(ctx, size * 0.62, 12);
        ctx.fill();
        ctx.lineWidth = Math.max(3, size * 0.025);
        ctx.strokeStyle = "#1a1a1a";
        ctx.stroke();
        ctx.drawImage(icon, -size * 0.45, -size * 0.45, size * 0.9, size * 0.9);
      } else {
        const fs = Math.round(size * (pop.value.length > 7 ? 0.3 : 0.4));
        ctx.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
        const tw = ctx.measureText(pop.value).width;
        ctx.fillStyle = fill;
        this.burst(ctx, Math.max(size * 0.5, tw * 0.68), 14);
        ctx.fill();
        ctx.lineWidth = Math.max(3, size * 0.025);
        ctx.strokeStyle = "#1a1a1a";
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = fs * 0.18;
        ctx.strokeStyle = "#1a1a1a";
        ctx.strokeText(pop.value, 0, 0);
        ctx.fillStyle = edge === "#ef4444" ? "#ffffff" : "#ffffff";
        ctx.fillText(pop.value, 0, 0);
        ctx.lineWidth = fs * 0.06;
        ctx.strokeStyle = edge;
        ctx.strokeText(pop.value, 0, 0);
      }
      ctx.restore();
    }
  }

  protected burst(ctx: CanvasRenderingContext2D, r: number, spikes: number) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * 0.78 : r;
      ctx.lineTo(Math.cos(a) * rr * 1.25, Math.sin(a) * rr * 0.85);
    }
    ctx.closePath();
  }

  drawFrame(ctx: CanvasRenderingContext2D, n: number) {
    const frames = this.tl.frames;
    n = Math.max(0, Math.min(frames.length - 1, n));
    const f = frames[n]!;
    const { W, H } = this;
    // Where did this shot (scene or time card) start?
    const group = (i: number) => `${frames[i]!.card ? "c" : "s"}${frames[i]!.scene}`;
    let start = n;
    while (start > 0 && group(start - 1) === group(n)) start--;
    const k = n - start;
    if (start === 0 || k >= TRANS) {
      this.renderPlain(ctx, n);
    } else {
      // Scene change: always with a transition (a different one each time).
      const pc = this.finalPrev.getContext("2d")!;
      const cc = this.finalCur.getContext("2d")!;
      this.renderPlain(pc, start - 1);
      this.renderPlain(cc, n);
      const kind = TRANSITIONS[(f.scene + (f.card ? 3 : 0)) % TRANSITIONS.length]!;
      const t = (k + 1) / TRANS;
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      if (kind === "slide" || kind === "whip") {
        const off = W * ease;
        const ghosts = kind === "whip" ? 4 : 1;
        for (let g = ghosts - 1; g >= 0; g--) {
          ctx.globalAlpha = g === 0 ? 1 : 0.25;
          const lag = g * W * 0.05 * Math.sin(Math.PI * t);
          ctx.drawImage(this.finalPrev, -off + lag, 0);
          ctx.drawImage(this.finalCur, W - off + lag, 0);
        }
      } else if (kind === "zoom") {
        const img = t < 0.5 ? this.finalPrev : this.finalCur;
        const s = t < 0.5 ? 1 + 1.6 * (t * 2) ** 2 : 1 + 0.8 * (1 - (t - 0.5) * 2) ** 2;
        ctx.translate(W / 2, H / 2);
        ctx.scale(s, s);
        ctx.drawImage(img, -W / 2, -H / 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 - Math.abs(t - 0.5) * 2;
        ctx.fillRect(0, 0, W, H);
      } else if (kind === "iris") {
        ctx.drawImage(this.finalPrev, 0, 0);
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.hypot(W, H) * 0.55 * ease, 0, Math.PI * 2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = "#1a1a1a";
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(this.finalCur, 0, 0);
      } else if (kind === "spin") {
        const img = t < 0.5 ? this.finalPrev : this.finalCur;
        const p = t < 0.5 ? t * 2 : (1 - t) * 2;
        ctx.translate(W / 2, H / 2);
        ctx.rotate((t < 0.5 ? 1 : -1) * p * Math.PI * 0.6);
        ctx.scale(1 - p * 0.85, 1 - p * 0.85);
        ctx.drawImage(img, -W / 2, -H / 2);
      } else { // flash
        ctx.drawImage(t < 0.45 ? this.finalPrev : this.finalCur, 0, 0);
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(t - 0.45) * 3);
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }
    if (!f.card) this.subtitles(ctx, n);
  }
}

/** Lets the page breathe (progress, buttons) without a timer — not slowed down in a background tab. */
function yieldNow(): Promise<void> {
  return new Promise((resolve) => { const ch = new MessageChannel(); ch.port1.onmessage = () => resolve(); ch.port2.postMessage(0); });
}

/** Until the encoder has taken a frame from its queue (its own event; a tiny fallback poll). */
function waitDequeue(encoder: VideoEncoder): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    try { encoder.addEventListener("dequeue", fin, { once: true }); } catch { /* older browser */ }
    void yieldNow().then(() => { if (encoder.encodeQueueSize <= 6) fin(); });
    setTimeout(fin, 50);
  });
}

/** Encode the whole video in the browser (H.264), returns the raw stream. */
/** Anything that can draw numbered frames (the 2D player and the 3D player). */
export type FramePlayer = {
  W: number; H: number; tl: { fps: number }; frameCount: number;
  drawFrame: (ctx: CanvasRenderingContext2D, n: number) => void;
};

export async function encodeH264(player: FramePlayer, onProgress: (done: number, total: number) => void): Promise<Blob> {
  if (typeof VideoEncoder === "undefined") {
    throw new Error("This browser cannot make videos. Please use Google Chrome or Microsoft Edge.");
  }
  const { W, H } = player;
  const fps = player.tl.fps;
  let config: VideoEncoderConfig | null = null;
  for (const codec of ["avc1.42001f", "avc1.4d401f", "avc1.640028", "avc1.42002a"]) {
    const c: VideoEncoderConfig = { codec, width: W, height: H, bitrate: 6_000_000, framerate: fps, avc: { format: "annexb" } };
    try {
      if ((await VideoEncoder.isConfigSupported(c)).supported) { config = c; break; }
    } catch { /* try the next one */ }
  }
  if (!config) throw new Error("This browser's video encoder is not available. Please update Chrome.");
  const chunks: Uint8Array[] = [];
  let failure: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk) => { const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); chunks.push(b); },
    error: (e) => { failure = e instanceof Error ? e : new Error(String(e)); },
  });
  encoder.configure(config);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const total = player.frameCount;
  for (let n = 0; n < total; n++) {
    if (failure) throw failure;
    player.drawFrame(ctx, n);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((n * 1e6) / fps), duration: Math.round(1e6 / fps) });
    encoder.encode(frame, { keyFrame: n % (fps * 2) === 0 });
    frame.close();
    if (n % 6 === 0) {
      onProgress(n, total);
      // wait for the encoder WITHOUT timers: Chrome slows timers in a tab that is not
      // in front (down to once a second / minute) — that made long renders hours longer
      while (encoder.encodeQueueSize > 6) await waitDequeue(encoder);
      await yieldNow();
    }
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  onProgress(total, total);
  return new Blob(chunks as BlobPart[], { type: "video/h264" });
}
