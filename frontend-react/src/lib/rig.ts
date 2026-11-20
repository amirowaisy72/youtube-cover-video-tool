/**
 * Skeleton rig for the Story Animator characters.
 *
 * A character is no longer a fixed picture per pose. Every frame it
 * has joints — pelvis, torso (lean / bow), neck (tilt), head (turn),
 * shoulders, elbows, hands, hips, knees and feet — and every joint
 * moves SMOOTHLY towards where the director wants it (tweening), with
 * small automatic motions on top: breathing, swaying, head bobbing
 * while talking, turning the head towards whoever matters, walking
 * with bending knees, crouching before a jump…
 *
 * Elbows and knees are solved with 2-bone IK, so a hand that goes to
 * the face bends the elbow naturally. Clothes follow the limbs:
 * sleeves and trousers are drawn along the bones.
 *
 * The detailed parts (head + face, shirt, held items) come from
 * stickman.ts, so characters look exactly like in Character Studio.
 *
 * Units: one character is 400 units tall (viewBox 0 -10 200 400);
 * the canvas is scaled so 1 unit = `scale` pixels.
 */
import {
  blanketPieceSvg,
  type CharacterConfig,
  emoteSvg,
  type Emote,
  type Expression,
  type Flags,
  handTargets,
  headSvg,
  HOLD_POSES,
  itemSvg,
  limbColor,
  type Mouth,
  normalizeCharacter,
  type Pose,
  POSE_OVER_HEAD,
  RIG_INK as INK,
  shadeColor,
  SIT_DROP,
  sleeveFraction,
  torsoSvg,
} from "./stickman";

type V = [number, number];

/** What the director (backend) wants one character to do on one frame. */
export type CharFrame = {
  cid: string;
  x: number;            // 0…1 across the screen
  dx: number; dy: number; rot: number; // body offsets (units) and rotation (degrees)
  facing: "left" | "right";
  stance: string;       // stand | sit | lie | walk-a | walk-b
  pose: Pose;
  expr: Expression;
  mouth: Mouth | null;
  blink: boolean;
  look: "left" | "right" | "center";
  flags: Flags;
  emote: [Emote, number] | null;
  act?: string | null; // the action running now (fight, chase…) — 3D world brain
  wact?: { v: string; o: string; t: number; n: number; id: string } | null; // {climb:tree} etc. (3D world)
  hand?: string | null; // still in the hand from an earlier scene (the cookie jar…)
  outfit?: string | null; // {wear:vice} / {wear:jacket}: clothes changed in the story
  form?: string | null; // turned into a frog (…) by magic: drawn as that, until turned back
  morph?: { t: number; n: number; to: string; was: string; swap: number } | null; // the transformation happening now
};

/** The smoothed joint targets actually drawn. */
export type RigPose = {
  lh: V; rh: V;         // hands (upper-body coordinates)
  lf: V; rf: V;         // ankles (ground coordinates)
  px: number; py: number; // pelvis offset from standing
  sit: number;          // 0 = standing legs, 1 = seated legs
  lean: number;         // degrees, + leans to screen-right in local drawing
  bow: number;          // 0…1 bending forward
  neck: number;         // head tilt, degrees
  headY: number;        // head up/down (units)
  turn: number;         // -1…1 head turn (local)
};

const SHOULDER_L: V = [70, 160];
const SHOULDER_R: V = [130, 160];
const PELVIS: V = [100, 256];
const HIP_L: V = [84, 256];
const HIP_R: V = [116, 256];
const ANKLE_L: V = [80, 364];
const ANKLE_R: V = [120, 364];
const UPPER_ARM = 52, FOREARM = 50, THIGH = 54.5, SHIN = 54.5;

// ---------------------------------------------------------------- math
function ik(a: V, target: V, l1: number, l2: number, outward: number): [V, V] {
  let dx = target[0] - a[0], dy = target[1] - a[1];
  let d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.999, min = Math.abs(l1 - l2) + 0.5;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < min) { const k = min / Math.max(d, 0.001); dx *= k; dy *= k; d = min; }
  const end: V = [a[0] + dx, a[1] + dy];
  const base = Math.atan2(dy, dx);
  const ang = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const e1: V = [a[0] + Math.cos(base + ang) * l1, a[1] + Math.sin(base + ang) * l1];
  const e2: V = [a[0] + Math.cos(base - ang) * l1, a[1] + Math.sin(base - ang) * l1];
  const mid = (a[0] + end[0]) / 2;
  const joint = (e1[0] - mid) * outward >= (e2[0] - mid) * outward ? e1 : e2;
  return [joint, end];
}

function along(pts: V[], fraction: number): V[] {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  let left = seg.reduce((s, v) => s + v, 0) * fraction;
  const out: V[] = [pts[0]!];
  for (let i = 0; i < seg.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!, len = seg[i]!;
    if (left >= len) { out.push(b); left -= len; continue; }
    const t = left / Math.max(len, 0.0001);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    break;
  }
  return out;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpV = (a: V, b: V, k: number): V => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// --------------------------------------------------------- pose targets
/** Joint targets for a director frame (before smoothing). `n` = frame number. */
export function targetPose(f: CharFrame, n: number, seed: number, level: number, energy = 0): RigPose {
  const sitting = f.stance === "sit";
  const walking = f.stance.startsWith("walk");
  const armStance = sitting ? "sit" : "stand";
  const hands = handTargets(f.pose, armStance);
  let lh: V = [...hands.left], rh: V = [...hands.right];
  let lf: V = [...ANKLE_L], rf: V = [...ANKLE_R];
  let px = 0, py = sitting ? SIT_DROP : 0;
  let lean = 0, bow = 0, neck = 0, headY = 0;
  // Head turn: towards where the eyes look (screen), converted to the
  // character's own (possibly mirrored) drawing.
  const screenTurn = f.look === "right" ? 0.75 : f.look === "left" ? -0.75 : 0;
  const turn = f.facing === "left" ? -screenTurn : screenTurn;
  if (walking) {
    // Walk cycle: 16 frames per stride. Feet lift in turn (knees bend),
    // the pelvis dips, the arms swing.
    const ph = (n / 16) * Math.PI * 2;
    const s = Math.sin(ph);
    lf = [ANKLE_L[0] + 3 * Math.cos(ph), ANKLE_L[1] - 15 * Math.max(0, s)];
    rf = [ANKLE_R[0] - 3 * Math.cos(ph), ANKLE_R[1] - 15 * Math.max(0, -s)];
    py = 3 * Math.abs(s) - 2;
    if (f.pose === "idle") {
      lh = [56 + 6 * s, 252 - 6 * Math.abs(s)];
      rh = [144 + 6 * s, 252 - 6 * Math.abs(s)];
    }
    lean = 2 * s;
  }
  // Body language per pose / expression.
  switch (f.pose) {
    case "belly": bow = 0.35; neck = 4; break;           // laughing, bent over
    case "cover": bow = 0.25; headY = 4; break;          // crying
    case "facepalm": neck = -8; headY = 3; break;
    case "think": neck = 9; break;
    case "shrug": headY = -2; neck = -4; break;
    case "point": lean = 4; break;
    case "hips": lean = -2; break;
    case "read": case "page": headY = 6; neck = 2; break; // looking down at the book
    case "phone": neck = 8; break;
    case "eat": case "drink": neck = -3; break;
  }
  if (f.expr === "sad") { headY += 4; bow = Math.max(bow, 0.12); }
  if (f.expr === "surprised") headY -= 5;
  if (f.expr === "angry") { bow = Math.max(bow, 0.1); lean += 2; }
  if (f.expr === "suspicious") neck += 6;
  // Living body: breathing, a slow sway, weight shifting.
  const t = n / 24;
  headY += Math.sin(t * 2.2 + seed) * 0.8;
  if (!walking && f.stance !== "lie") {
    px += Math.sin(t * 0.9 + seed * 2) * 1.6;
    lean += Math.sin(t * 0.7 + seed) * 1.2;
    neck += Math.sin(t * 0.5 + seed * 3) * 1.5;
  }
  // Talking hands (user's example video): while in a sentence the
  // speaker gestures — an open hand towards the listener, both hands
  // "explaining", a hand on the chest — changing every ~1.5 s.
  const free = (f.pose === "idle" || f.pose === "talk") && !walking && f.stance !== "lie";
  if (free && energy > 0.25) {
    const beat = Math.floor(n / 36);
    const kind = Math.floor(Math.abs(Math.sin(beat * 12.9898 + seed * 78.233)) * 43758.5453) % 5;
    const w = Math.min(1, (energy - 0.25) * 2.5);
    const wob = Math.sin(n / 4.2 + seed) * 6 * level;
    const toward = turn >= 0 ? 1 : -1; // listener's side in the character's own drawing
    const near: V = toward > 0 ? rh : lh;
    const mix = (from: V, to: V): V => [from[0] + (to[0] - from[0]) * w, from[1] + (to[1] - from[1]) * w];
    if (kind === 0 || kind === 1) { // open palm towards the listener
      const tgt: V = [100 + toward * 78, near[1] - 48 + wob];
      if (toward > 0) rh = mix(rh, tgt); else lh = mix(lh, tgt);
      lean += toward * 2 * w;
    } else if (kind === 2) { // both hands explaining
      lh = mix(lh, [40, lh[1] - 42 + wob]);
      rh = mix(rh, [160, rh[1] - 42 - wob]);
    } else if (kind === 3) { // hand on own chest ("me?!")
      const tgt: V = [104 - toward * 6, 196 + (sitting ? SIT_DROP : 0) + wob * 0.4];
      if (toward > 0) lh = mix(lh, tgt); else rh = mix(rh, tgt);
    } // kind 4: hands rest — not every sentence needs a gesture
  }
  // Listening: lean a little towards the speaker.
  if (level === 0 && energy < 0.1 && screenTurn !== 0 && !walking) {
    lean += (screenTurn > 0 ? 1 : -1) * 1.5;
    neck += (screenTurn > 0 ? 1 : -1) * 3;
  }
  // Talking: the head bobs and nods with the voice.
  if (level > 0) {
    headY -= level * 2.5;
    neck += Math.sin(n / 3.1 + seed) * 3 * level;
    lean += (screenTurn >= 0 ? 1 : -1) * 2 * level;
  }
  return { lh, rh, lf, rf, px, py, sit: sitting ? 1 : 0, lean, bow, neck, headY, turn };
}

/** Smooth every joint over time (tweening): nothing snaps from one pose to another. */
export function smoothPose(prev: RigPose | null, target: RigPose, snap: boolean): RigPose {
  if (!prev || snap) return target;
  const k = 0.32, kSlow = 0.16;
  return {
    lh: lerpV(prev.lh, target.lh, k), rh: lerpV(prev.rh, target.rh, k),
    lf: lerpV(prev.lf, target.lf, 0.55), rf: lerpV(prev.rf, target.rf, 0.55),
    px: lerp(prev.px, target.px, k), py: lerp(prev.py, target.py, 0.3),
    sit: lerp(prev.sit, target.sit, 0.3),
    lean: lerp(prev.lean, target.lean, kSlow), bow: lerp(prev.bow, target.bow, 0.2),
    neck: lerp(prev.neck, target.neck, 0.22), headY: lerp(prev.headY, target.headY, 0.3),
    turn: lerp(prev.turn, target.turn, 0.14),
  };
}

// ---------------------------------------------------------------- assets
async function rasterize(svg: string, w: number, h: number): Promise<ImageBitmap> {
  const sized = svg.replace('width="100%" height="100%"', `width="${Math.round(w)}" height="${Math.round(h)}"`);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not draw a character part."));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sized);
  });
  return createImageBitmap(img);
}

export const turnBucket = (turn: number) => Math.round(turn * 2) / 2;

/** Pre-drawn parts (heads, torsos, items, emotes) as bitmaps, cached. */
export class RigAssets {
  private cache = new Map<string, ImageBitmap>();
  private pending = new Map<string, Promise<ImageBitmap>>();
  constructor(public configs: Map<string, CharacterConfig>, public scale: number) {}

  private load(key: string, make: () => [string, number, number]): Promise<ImageBitmap> {
    const hit = this.cache.get(key);
    if (hit) return Promise.resolve(hit);
    let p = this.pending.get(key);
    if (!p) {
      const [svg, w, h] = make();
      p = rasterize(svg, w, h).then((bmp) => { this.cache.set(key, bmp); this.pending.delete(key); return bmp; });
      this.pending.set(key, p);
    }
    return p;
  }

  // Parts are drawn at 1.6x so a camera zoom stays sharp.
  private px(units: number) { return units * this.scale * 1.6; }

  headKey(cid: string, f: CharFrame, turn: number): string {
    const fl = f.flags ?? {};
    const local = f.facing === "left" ? (f.look === "left" ? "right" : f.look === "right" ? "left" : "center") : f.look;
    return `h|${cid}|${f.expr}|${f.mouth ?? ""}|${f.blink ? 1 : 0}|${local}|${turnBucket(turn)}|${fl.tears ? 1 : 0}${fl.sweat ? 1 : 0}${fl.smell ? 1 : 0}`;
  }

  async need(keys: Iterable<string>): Promise<void> {
    const jobs: Promise<unknown>[] = [];
    for (const key of keys) {
      const parts = key.split("|");
      const kind = parts[0];
      if (kind === "h") {
        const [, cid, expr, mouth, blink, look, turn, fl] = parts as [string, string, string, string, string, string, string, string];
        const cfg = this.configs.get(cid);
        if (!cfg) continue;
        jobs.push(this.load(key, () => [headSvg(cfg, {
          expression: expr as Expression, mouth: (mouth || undefined) as Mouth | undefined, blink: blink === "1",
          look: look as "left" | "right" | "center", turn: Number(turn),
          flags: { tears: fl[0] === "1", sweat: fl[1] === "1", smell: fl[2] === "1" },
        }), this.px(200), this.px(190)]));
      } else if (kind === "t") {
        const cfg = this.configs.get(parts[1]!);
        if (cfg) jobs.push(this.load(key, () => [torsoSvg(cfg, parts[2] === "1", `t${parts[1]}`), this.px(200), this.px(210)]));
      } else if (kind === "i") {
        jobs.push(this.load(key, () => [itemSvg(parts[1] as Pose), this.px(200), this.px(200)]));
      } else if (kind === "e") {
        jobs.push(this.load(key, () => [emoteSvg(parts[1] as Emote, Number(parts[2])), this.px(110), this.px(110)]));
      } else if (kind === "b") {
        jobs.push(this.load(key, () => [blanketPieceSvg(), this.px(200), this.px(250)]));
      }
    }
    await Promise.all(jobs);
  }

  get(key: string): ImageBitmap | undefined { return this.cache.get(key); }
}

/** Every bitmap a character needs for this frame (to load before drawing). */
export function partKeys(assets: RigAssets, f: CharFrame, pose: RigPose): string[] {
  const keys = [assets.headKey(f.cid, f, pose.turn), `t|${f.cid}|${pose.sit > 0.5 ? 1 : 0}`];
  if (HOLD_POSES.includes(f.pose)) keys.push(`i|${f.pose}`);
  if (f.emote) keys.push(`e|${f.emote[0]}|${f.emote[1]}`);
  if (f.flags?.blanket) keys.push("b");
  return keys;
}

// --------------------------------------------------------------- drawing
function stroke(ctx: CanvasRenderingContext2D, pts: V[], color: string, width: number, cap: CanvasLineCap = "round") {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function shape(ctx: CanvasRenderingContext2D, d: string, fill: string, lineWidth = 3, strokeColor = INK) {
  const p = new Path2D(d);
  ctx.fillStyle = fill;
  ctx.fill(p);
  if (lineWidth) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.stroke(p);
  }
}

function drawShoe(ctx: CanvasRenderingContext2D, cfg: CharacterConfig, side: "left" | "right", ankle: V, limb: string) {
  const base = side === "left" ? ANKLE_L : ANKLE_R;
  ctx.save();
  ctx.translate(ankle[0] - base[0], ankle[1] - base[1]);
  const col = cfg.shoeColor;
  if (cfg.shoes === "slippers") {
    const sole = col === "#ffffff" ? "#8b5a2b" : col;
    const cx = side === "left" ? 76 : 124, fx = side === "left" ? 78 : 122;
    shape(ctx, `M${cx - 17} 374 a17 4 0 1 0 34 0 a17 4 0 1 0 -34 0`, sole, 2);
    shape(ctx, `M${fx - 12} 368 a12 5 0 1 0 24 0 a12 5 0 1 0 -24 0`, limb, 2);
    stroke(ctx, side === "left" ? [[70, 368], [78, 362], [86, 368]] : [[114, 368], [122, 362], [130, 368]], INK, 4);
  } else {
    shape(ctx, side === "left" ? "M60 376 Q58 360 78 360 L96 362 L98 376 Z" : "M140 376 Q142 360 122 360 L104 362 L102 376 Z", col, 3);
    if (cfg.shoes === "sneakers") stroke(ctx, side === "left" ? [[58, 376], [98, 376]] : [[102, 376], [142, 376]], INK, 3, "butt");
  }
  ctx.restore();
}

function drawStandingLegs(ctx: CanvasRenderingContext2D, cfg: CharacterConfig, p: RigPose, limb: string) {
  const hipL: V = [HIP_L[0] + p.px, HIP_L[1] + p.py], hipR: V = [HIP_R[0] + p.px, HIP_R[1] + p.py];
  const [kneeL, ankleL] = ik(hipL, p.lf, THIGH, SHIN, -1);
  const [kneeR, ankleR] = ik(hipR, p.rf, THIGH, SHIN, 1);
  const legL: V[] = [hipL, kneeL, ankleL], legR: V[] = [hipR, kneeR, ankleR];
  const b = cfg.bottomColor, dark = shadeColor(b, -35);
  if (cfg.bottom === "skirt") {
    const lo = Math.min(ankleL[0], ankleR[0]) - 30, hi = Math.max(ankleL[0], ankleR[0]) + 30;
    stroke(ctx, [kneeL, ankleL], limb, 7); stroke(ctx, [kneeR, ankleR], limb, 7);
    drawShoe(ctx, cfg, "left", ankleL, limb); drawShoe(ctx, cfg, "right", ankleR, limb);
    shape(ctx, `M${70 + p.px} ${256 + p.py} L${130 + p.px} ${256 + p.py} L${hi} 356 L${lo} 356 Z`, b, 3);
    stroke(ctx, [[84 + p.px, 270 + p.py], [lo + 20, 352]], dark, 2); stroke(ctx, [[116 + p.px, 270 + p.py], [hi - 20, 352]], dark, 2);
    return;
  }
  if (cfg.bottom === "shorts") {
    stroke(ctx, legL, limb, 7); stroke(ctx, legR, limb, 7);
  }
  drawShoe(ctx, cfg, "left", ankleL, limb); drawShoe(ctx, cfg, "right", ankleR, limb);
  const wide = cfg.bottom === "shalwar" ? 9 : 0;
  const frac = cfg.bottom === "shorts" ? 0.42 : 1;
  for (const leg of [legL, legR]) {
    const pts = along(leg, frac);
    stroke(ctx, pts, INK, 31 + wide, frac < 1 ? "butt" : "round");
    stroke(ctx, pts, b, 25 + wide, frac < 1 ? "butt" : "round");
    if (cfg.bottom !== "shorts") stroke(ctx, along(leg, 0.97).slice(1), dark, 2);
  }
  // Pelvis / waist block over the top of both legs.
  shape(ctx, `M${68 + p.px} ${250 + p.py} H${132 + p.px} L${134 + p.px} ${282 + p.py} Q${100 + p.px} ${292 + p.py} ${66 + p.px} ${282 + p.py} Z`, b, 3);
  stroke(ctx, [[68 + p.px, 262 + p.py], [132 + p.px, 262 + p.py]], dark, 2);
  if (cfg.bottom === "jeans") {
    stroke(ctx, [[76 + p.px, 264 + p.py], [80 + p.px, 276 + p.py], [92 + p.px, 274 + p.py]], shadeColor(b, 45), 2);
    stroke(ctx, [[124 + p.px, 264 + p.py], [120 + p.px, 276 + p.py], [108 + p.px, 274 + p.py]], shadeColor(b, 45), 2);
  }
}

function drawSeatedLegs(ctx: CanvasRenderingContext2D, cfg: CharacterConfig, limb: string) {
  const b = cfg.bottomColor, dark = shadeColor(b, -35);
  drawShoe(ctx, cfg, "left", ANKLE_L, limb); drawShoe(ctx, cfg, "right", ANKLE_R, limb);
  if (cfg.bottom === "skirt") {
    shape(ctx, "M62 304 L138 304 L146 362 L54 362 Z", b, 3);
    return;
  }
  if (cfg.bottom === "shorts") {
    stroke(ctx, [[80, 336], [82, 366]], limb, 7); stroke(ctx, [[120, 336], [118, 366]], limb, 7);
  } else {
    const w = cfg.bottom === "shalwar" ? 5 : 0;
    shape(ctx, `M${66 - w} 334 L94 334 L95 364 L${70 - w} 364 Z`, b, 3);
    shape(ctx, `M106 334 L${134 + w} 334 L${130 + w} 364 L105 364 Z`, b, 3);
  }
  shape(ctx, "M64 306 L136 306 Q150 324 144 342 L56 342 Q50 324 64 306 Z", b, 3);
  stroke(ctx, [[100, 318], [100, 342]], dark, 2);
}

function drawArm(ctx: CanvasRenderingContext2D, cfg: CharacterConfig, shoulder: V, hand: V, outward: number, limb: string) {
  const [elbow, end] = ik(shoulder, hand, UPPER_ARM, FOREARM, outward);
  const pts: V[] = [shoulder, elbow, end];
  stroke(ctx, pts, limb, 7);
  const sleeve = along(pts, sleeveFraction(cfg));
  stroke(ctx, sleeve, INK, 23);
  stroke(ctx, sleeve, cfg.topColor, 17);
  return end;
}

function drawHand(ctx: CanvasRenderingContext2D, at: V, limb: string) {
  ctx.beginPath();
  ctx.arc(at[0], at[1], 8, 0, Math.PI * 2);
  ctx.fillStyle = limb;
  ctx.fill();
  if (limb !== INK) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
}

/**
 * Draw one character. The canvas must already be set up so that one
 * character unit = 1 (see drawCharacterAt). Order: legs, torso, arms,
 * head, then hands that go in front of the face.
 */
export function drawCharacterUnits(ctx: CanvasRenderingContext2D, assets: RigAssets, f: CharFrame, p: RigPose) {
  const raw = assets.configs.get(f.cid);
  if (!raw) return;
  const cfg = normalizeCharacter(raw);
  const limb = limbColor(cfg);
  if (f.facing === "left") { ctx.translate(200, 0); ctx.scale(-1, 1); }
  const seated = p.sit > 0.5;
  if (seated) drawSeatedLegs(ctx, cfg, limb);
  else drawStandingLegs(ctx, cfg, p, limb);
  // ---- upper body: moves with the pelvis, leans and bows around it
  ctx.save();
  const pelvis: V = [PELVIS[0] + p.px, PELVIS[1] + p.py];
  ctx.translate(pelvis[0], pelvis[1]);
  ctx.rotate((p.lean * Math.PI) / 180);
  ctx.scale(1, 1 - 0.16 * p.bow);
  ctx.translate(-PELVIS[0], -PELVIS[1]);
  const torso = assets.get(`t|${f.cid}|${seated ? 1 : 0}`);
  if (torso) ctx.drawImage(torso, 0, 120, 200, 210);
  const overHead = POSE_OVER_HEAD.includes(f.pose);
  const item = HOLD_POSES.includes(f.pose) ? assets.get(`i|${f.pose}`) : undefined;
  const drawArms = () => {
    const hl = drawArm(ctx, cfg, SHOULDER_L, p.lh, -1, limb);
    const hr = drawArm(ctx, cfg, SHOULDER_R, p.rh, 1, limb);
    if (item) ctx.drawImage(item, 0, 60, 200, 200);
    drawHand(ctx, hl, limb);
    drawHand(ctx, hr, limb);
  };
  if (!overHead) drawArms();
  if (f.flags?.blanket) {
    const bl = assets.get("b");
    if (bl) ctx.drawImage(bl, 0, 150, 200, 250);
  }
  // ---- head on the neck: tilts, nods, turns
  const head = assets.get(assets.headKey(f.cid, f, p.turn));
  if (head) {
    ctx.save();
    ctx.translate(100, 140 + p.headY + 12 * p.bow);
    ctx.rotate((p.neck * Math.PI) / 180);
    ctx.translate(-100, -140);
    ctx.drawImage(head, 0, -10, 200, 190);
    ctx.restore();
  }
  if (overHead) drawArms();
  ctx.restore();
}

/**
 * Place a character on the frame: `cx, cy` = pixel centre of the
 * character box (unit point 100,190), `scale` = pixels per unit,
 * `rot` = degrees (counter-clockwise, like the director's).
 */
export function drawCharacterAt(ctx: CanvasRenderingContext2D, assets: RigAssets, f: CharFrame, p: RigPose,
                                cx: number, cy: number, scale: number, rot: number) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rot) ctx.rotate((-rot * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-100, -190);
  drawCharacterUnits(ctx, assets, f, p);
  ctx.restore();
}
