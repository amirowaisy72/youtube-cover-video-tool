/**
 * Story Animator 3D — people. Every character from Character Studio is
 * rebuilt in 3D from the same settings (skin, hair, clothes, shoes,
 * accessories): a real skeleton (hips, spine, neck, head, shoulders,
 * elbows, hands, hips, knees, feet) that walks, sits, lies down, points,
 * waves, shrugs, claps…, a face with eyes that blink and look, brows and a
 * mouth that follows the voice.
 */
import * as THREE from "three";
import type { CharacterConfig, Expression, Mouth, Pose } from "../stickman";
import { at, box, cone, cyl, INK, limbMesh, mesh, shade, sphere, toon } from "./kit";

export const CHAR_H = 1.7; // world units (≈ metres) — our people are 1.7 tall
export const HIP_H = 0.62;
export const SEAT_H = 0.47;

/** The numbers that describe a body pose (smoothed frame to frame). */
export type Joints = {
  x: number; y: number; z: number; // root position
  yaw: number; roll: number; // body turn / tip over
  spine: number; spineZ: number; // lean forward / sideways
  headX: number; headY: number; headZ: number;
  lsx: number; lsz: number; lex: number; lez: number; // left shoulder / elbow
  rsx: number; rsz: number; rex: number; rez: number; // right shoulder / elbow
  lhx: number; lk: number; rhx: number; rk: number; // hips / knees
};
export const JOINT_KEYS = ["x", "y", "z", "yaw", "roll", "spine", "spineZ", "headX", "headY", "headZ",
  "lsx", "lsz", "lex", "lez", "rsx", "rsz", "rex", "rez", "lhx", "lk", "rhx", "rk"] as const;

export type Face = {
  expr: Expression;
  mouth: Mouth | null;
  talk: number; // 0..1 how open (from the voice)
  blink: boolean;
  look: "left" | "right" | "center";
  tears: boolean;
  sweat: boolean;
  hold: "book" | "phone" | "cup" | "";
  lie: boolean;
};

// Arm poses: [shoulder fwd(-)/back, shoulder out, elbow bend(-), elbow inward] for left / right.
type Arm = [number, number, number, number];
const ARMS: Record<string, [Arm, Arm]> = {
  idle: [[0.05, 0.12, -0.15, 0], [0.05, -0.12, -0.15, 0]],
  talk: [[0.05, 0.12, -0.2, 0], [-0.55, -0.28, -0.95, 0]],
  wave: [[0.05, 0.12, -0.15, 0], [-0.15, -2.65, -0.35, 0]],
  hips: [[0.12, 0.85, -0.2, -1.9], [0.12, -0.85, -0.2, 1.9]],
  point: [[0.05, 0.12, -0.15, 0], [-1.5, -0.12, 0, 0]],
  think: [[-0.55, -0.45, -1.35, 0], [-0.95, 0.35, -2.1, 0]],
  shrug: [[-0.35, 0.6, -1.55, 0], [-0.35, -0.6, -1.55, 0]],
  read: [[-0.75, -0.18, -0.95, 0], [-0.75, 0.18, -0.95, 0]],
  page: [[-0.75, -0.18, -0.95, 0], [-0.85, 0.05, -1.2, 0]],
  phone: [[0.05, 0.12, -0.15, 0], [-0.55, -0.12, -2.45, 0]],
  eat: [[-0.45, -0.2, -1.2, 0], [-1.0, 0.25, -2.3, 0]],
  drink: [[0.05, 0.12, -0.15, 0], [-1.05, 0.25, -2.25, 0]],
  facepalm: [[0.05, 0.12, -0.15, 0], [-1.25, 0.32, -2.5, 0]],
  clap: [[-0.95, -0.08, -0.55, 0], [-0.95, 0.08, -0.55, 0]],
  clap2: [[-0.95, 0.28, -0.55, 0], [-0.95, -0.28, -0.55, 0]],
  belly: [[-0.3, -0.25, -1.35, 0], [-0.3, 0.25, -1.35, 0]],
  cover: [[-1.05, 0.2, -2.45, 0], [-1.05, -0.2, -2.45, 0]], // crying: fists rubbing the eyes, the face still seen
};

export type Human = {
  root: THREE.Group;
  apply: (j: Joints, f: Face, n: number) => void;
  headWorld: (out: THREE.Vector3) => THREE.Vector3;
  handWorld: (side: "l" | "r", out: THREE.Vector3) => THREE.Vector3;
  hand: (side: "l" | "r") => THREE.Object3D;
};

function hairColor(cfg: CharacterConfig) { return cfg.hairColor || "#1b1b1b"; }

/** Build one person from their Character Studio settings. */
export function buildHuman(cfg: CharacterConfig): Human {
  const skin = cfg.skin || "#ffffff";
  const top = cfg.topColor || "#e8643c", top2 = cfg.top2Color || "#ffffff";
  const bottom = cfg.bottomColor || "#2f3640";
  const longSleeve = ["shirt", "checks", "kurta", "jacket", "police"].includes(cfg.top);
  const topCol = cfg.top === "police" ? "#3b5b8c" : top;

  const root = new THREE.Group();
  const hips = at(new THREE.Group(), 0, HIP_H, 0);
  root.add(hips);
  // --- torso
  const spine = new THREE.Group();
  hips.add(spine);
  const torsoGeo = new THREE.CapsuleGeometry(0.16, 0.24, 6, 16);
  torsoGeo.translate(0, 0.2, 0);
  const torso = mesh(torsoGeo, topCol, 0.06);
  torso.scale.set(1.05, 1, 0.68);
  spine.add(torso);
  if (cfg.top === "jacket") {
    const inner = mesh(new THREE.BoxGeometry(0.1, 0.34, 0.05), top2, 0);
    spine.add(at(inner, 0, 0.22, 0.105));
  }
  if (cfg.top === "checks") {
    for (const y of [0.1, 0.2, 0.3]) spine.add(at(box(0.36, 0.015, 0.25, shade(topCol, -45), 0), 0, y, 0));
  }
  if (cfg.top === "kurta" || cfg.top === "police") {
    for (const y of [0.32, 0.24, 0.16]) spine.add(at(sphere(0.012, top2, 0, 6), 0, y, 0.115));
  }
  if (cfg.top === "kurta") {
    const skirt = mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.3, 16, 1, true), topCol, 0.03);
    (skirt.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
    hips.add(at(skirt, 0, -0.1, 0));
  }
  // --- neck + head
  const neck = at(new THREE.Group(), 0, 0.44, 0);
  spine.add(neck);
  neck.add(at(cyl(0.045, 0.05, 0.08, skin, 0.08), 0, 0.03, 0));
  const head = at(new THREE.Group(), 0, 0.33, 0);
  neck.add(head);
  const skull = sphere(0.3, skin, 0.035, 32);
  skull.scale.set(1, 0.98, 0.95);
  head.add(skull);
  head.add(at(sphere(0.045, shade(skin, -20), 0.08, 10), 0, -0.06, 0.285)); // nose
  for (const s of [-1, 1]) head.add(at(sphere(0.055, skin, 0.08, 10), s * 0.29, -0.02, 0)); // ears
  // eyes
  const eyes: { white: THREE.Mesh; pupil: THREE.Mesh; lid: THREE.Mesh }[] = [];
  for (const s of [-1, 1]) {
    const g = at(new THREE.Group(), s * 0.105, 0.04, 0.24);
    head.add(g);
    const white = sphere(0.075, "#ffffff", 0.08, 16);
    white.scale.set(1, 1.15, 0.55);
    g.add(white);
    const pupil = at(sphere(0.036, INK, 0, 12), 0, -0.005, 0.04);
    g.add(pupil);
    const shine = at(sphere(0.011, "#ffffff", 0, 6), 0.015, 0.02, 0.07);
    pupil.add(shine);
    const lid = at(box(0.17, 0.02, 0.06, INK, 0), 0, 0, 0.03);
    lid.visible = false;
    g.add(lid);
    eyes.push({ white, pupil, lid });
  }
  // brows
  const brows: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const b = at(box(0.12, 0.025, 0.03, hairColor(cfg) === "#ffffff" ? INK : hairColor(cfg), 0), s * 0.105, 0.155, 0.255);
    head.add(b);
    brows.push(b);
  }
  // mouth parts
  const mouthG = at(new THREE.Group(), 0, -0.15, 0.255);
  head.add(mouthG);
  const smileGeo = new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI);
  const smile = new THREE.Mesh(smileGeo, toon(INK));
  smile.rotation.z = Math.PI;
  mouthG.add(smile);
  const frown = new THREE.Mesh(smileGeo, toon(INK));
  frown.position.y = -0.04;
  mouthG.add(frown);
  const flat = box(0.1, 0.016, 0.02, INK, 0);
  mouthG.add(flat);
  const open = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), toon("#7f1d1d"));
  open.scale.set(1, 0.6, 0.35);
  mouthG.add(open);
  const tongue = at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), toon("#f87171")), 0, -0.025, 0.012);
  open.add(tongue);
  // tears / sweat
  // cartoon tears: streams of drops that run down and spray out (user: crying looked fake)
  const tearMat = toon("#38bdf8", { transparent: true, opacity: 0.9 });
  const tears = [-1, 1].flatMap((s) => [0, 1, 2, 3].map((q) => {
    const t = at(new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), tearMat), s * 0.11, -0.02, 0.27);
    t.scale.set(0.8, 1.35, 0.8);
    t.userData.side = s; t.userData.q = q;
    head.add(t);
    return t;
  }));
  const sweat = at(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), toon("#93c5fd")), 0.27, 0.13, 0.12);
  sweat.scale.set(0.8, 1.3, 0.8);
  head.add(sweat);
  // hair
  const hc = hairColor(cfg);
  const cap = (k = 1.04, len = 1.25) => {
    const g = new THREE.SphereGeometry(0.3 * k, 28, 18, 0, Math.PI * 2, 0, len);
    const m = mesh(g, hc, 0.03);
    m.rotation.x = -0.25;
    return m;
  };
  if (cfg.hair === "spiky") {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const c = cone(0.05, 0.16, hc, 0.06, 6);
      c.position.set(Math.cos(a) * 0.12, 0.29, Math.sin(a) * 0.12 - 0.02);
      c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      head.add(c);
    }
    head.add(at(cone(0.05, 0.18, hc, 0.06, 6), 0, 0.33, 0));
  } else if (cfg.hair === "short" || cfg.hair === "side") {
    head.add(cap(1.04, 1.1));
    if (cfg.hair === "side") { const s = sphere(0.1, hc, 0.06, 12); s.scale.set(1.6, 0.6, 1); head.add(at(s, -0.12, 0.25, 0.14)); }
  } else if (cfg.hair === "curly") {
    head.add(cap(1.02, 1.15));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, rr = 0.24 + (i % 2) * 0.04;
      head.add(at(sphere(0.07, hc, 0.06, 10), Math.cos(a) * rr, 0.2 + (i % 3) * 0.03, Math.sin(a) * rr - 0.03));
    }
  } else if (cfg.hair === "long" || cfg.hair === "bun") {
    head.add(cap(1.05, 1.35));
    if (cfg.hair === "long") {
      const back = mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.55, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9), hc, 0.03);
      (back.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
      back.position.set(0, -0.12, -0.02);
      head.add(back);
    } else {
      head.add(at(sphere(0.11, hc, 0.06, 14), 0, 0.26, -0.2));
    }
  }
  // hats
  const hatC = cfg.hatColor || "#222831";
  if (cfg.hat === "cap") {
    const c = cap(1.07, 1.05);
    c.material = toon(hatC);
    head.add(c);
    head.add(at(box(0.3, 0.025, 0.2, hatC), 0, 0.17, 0.3));
  } else if (cfg.hat === "police") {
    head.add(at(cyl(0.3, 0.28, 0.14, "#1e3a8a"), 0, 0.3, 0));
    head.add(at(box(0.3, 0.02, 0.16, INK), 0, 0.24, 0.27));
    head.add(at(sphere(0.035, "#fbbf24", 0.08, 8), 0, 0.31, 0.29));
  } else if (cfg.hat === "beanie") {
    const b = cap(1.09, 1.3);
    b.material = toon(hatC);
    head.add(b);
    head.add(at(sphere(0.06, shade(hatC, 40), 0.06, 10), 0, 0.36, -0.05));
  } else if (cfg.hat === "topi") {
    head.add(at(cyl(0.24, 0.26, 0.1, hatC), 0, 0.29, 0));
  }
  // accessories
  const acc = new Set(cfg.accessories ?? []);
  if (acc.has("glasses") || acc.has("sunglasses")) {
    const dark = acc.has("sunglasses");
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 18), toon(INK));
      ring.position.set(s * 0.105, 0.04, 0.29);
      head.add(ring);
      if (dark) { const lens = new THREE.Mesh(new THREE.CircleGeometry(0.075, 18), toon("#111827")); lens.position.set(s * 0.105, 0.04, 0.295); head.add(lens); }
    }
    head.add(at(box(0.06, 0.012, 0.012, INK, 0), 0, 0.05, 0.3));
  }
  if (acc.has("mustache")) { const m = sphere(0.06, hc, 0.06, 10); m.scale.set(1.6, 0.45, 0.6); head.add(at(m, 0, -0.1, 0.27)); }
  if (acc.has("beard")) {
    const b = mesh(new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), hc, 0.03);
    head.add(at(b, 0, -0.02, 0.03));
  }
  if (acc.has("chain")) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 20), toon("#fbbf24")); c.rotation.x = Math.PI / 2.4; c.position.set(0, 0.4, 0.04); spine.add(c); }

  // --- arms
  const arm = (side: 1 | -1) => {
    const shoulder = at(new THREE.Group(), side * 0.21, 0.38, 0);
    spine.add(shoulder);
    const upper = limbMesh(0.055, 0.2, topCol);
    shoulder.add(upper);
    const elbow = at(new THREE.Group(), 0, -0.23, 0);
    shoulder.add(elbow);
    elbow.add(limbMesh(0.05, 0.19, longSleeve ? topCol : skin));
    const hand = at(new THREE.Group(), 0, -0.23, 0);
    elbow.add(hand);
    hand.add(sphere(0.06, skin, 0.08, 12));
    if (longSleeve) elbow.add(at(cyl(0.062, 0.062, 0.03, cfg.top === "jacket" ? top2 : shade(topCol, -30), 0.05, 12), 0, -0.2, 0));
    return { shoulder, elbow, hand };
  };
  const L = arm(1), R = arm(-1);
  // --- legs
  const skirt = cfg.bottom === "skirt";
  const legCol = cfg.bottom === "shalwar" ? bottom : bottom;
  const leg = (side: 1 | -1) => {
    const hip = at(new THREE.Group(), side * 0.085, 0.02, 0);
    hips.add(hip);
    const thighR = cfg.bottom === "shalwar" ? 0.085 : 0.07;
    hip.add(limbMesh(thighR, 0.24, skirt ? skin : legCol));
    const knee = at(new THREE.Group(), 0, -0.3, 0);
    hip.add(knee);
    knee.add(limbMesh(cfg.bottom === "shalwar" ? 0.08 : 0.062, 0.22, cfg.bottom === "shorts" || skirt ? skin : legCol));
    const foot = at(new THREE.Group(), 0, -0.29, 0);
    knee.add(foot);
    const shoeCol = cfg.shoeColor || "#ffffff";
    const shoe = sphere(0.07, cfg.shoes === "slippers" ? "#7c4f2c" : shoeCol, 0.08, 14);
    shoe.scale.set(0.95, 0.55, 1.6);
    shoe.position.set(0, -0.015, 0.05);
    foot.add(shoe);
    if (cfg.shoes === "sneakers") foot.add(at(box(0.11, 0.02, 0.2, shade(shoeCol, -60), 0), 0, -0.045, 0.05));
    return { hip, knee, foot };
  };
  const LL = leg(1), RL = leg(-1);
  { const _o = at(sphere(0.155, skirt ? topCol : legCol, 0.05, 16), 0, 0.02, 0); _o.scale.set(1, 0.6, 0.7); hips.add(_o); }
  if (skirt) {
    const sk = mesh(new THREE.ConeGeometry(0.3, 0.55, 18, 1, true), legCol, 0.03);
    (sk.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
    hips.add(at(sk, 0, -0.2, 0));
  }
  // held things
  const book = at(new THREE.Group(), 0, -0.07, 0.04);
  book.add(box(0.2, 0.26, 0.04, "#2563eb"), at(box(0.18, 0.24, 0.045, "#ffffff", 0), 0, 0, 0.003));
  const phone = at(box(0.06, 0.12, 0.015, "#1f2937"), 0, -0.06, 0.03);
  const cup = at(cyl(0.035, 0.03, 0.08, "#f8fafc"), 0, -0.04, 0.05);
  R.hand.add(book, phone, cup);

  const tmp = new THREE.Vector3();
  const apply = (j: Joints, f: Face, n: number) => {
    root.position.set(j.x, j.y, j.z);
    root.rotation.set(0, j.yaw, j.roll);
    spine.rotation.set(j.spine, 0, j.spineZ);
    head.rotation.set(j.headX, j.headY, j.headZ);
    L.shoulder.rotation.set(j.lsx, 0, j.lsz);
    L.elbow.rotation.set(j.lex, 0, j.lez);
    R.shoulder.rotation.set(j.rsx, 0, j.rsz);
    R.elbow.rotation.set(j.rex, 0, j.rez);
    LL.hip.rotation.set(j.lhx, 0, 0.03);
    LL.knee.rotation.set(j.lk, 0, 0);
    RL.hip.rotation.set(j.rhx, 0, -0.03);
    RL.knee.rotation.set(j.rk, 0, 0);
    LL.foot.rotation.x = -(j.lhx + j.lk) * 0.5;
    RL.foot.rotation.x = -(j.rhx + j.rk) * 0.5;
    // face -------------------------------------------------------
    const e = f.expr;
    const look = f.look === "left" ? -1 : f.look === "right" ? 1 : 0;
    for (let i = 0; i < 2; i++) {
      const ey = eyes[i]!;
      const closed = f.blink || f.lie;
      ey.white.visible = !closed;
      ey.pupil.visible = !closed;
      ey.lid.visible = closed;
      const big = e === "surprised" ? 1.2 : e === "suspicious" ? 0.75 : 1;
      ey.white.scale.set(big, 1.15 * (e === "suspicious" ? 0.55 : big), 0.55);
      ey.pupil.position.set(look * 0.025, e === "sad" ? -0.02 : 0, 0.04);
      ey.pupil.scale.setScalar(e === "surprised" ? 0.75 : 1);
      const b = brows[i]!, s = i === 0 ? -1 : 1;
      const tilt = e === "angry" ? 0.45 : e === "sad" ? -0.4 : e === "suspicious" ? (i ? 0.25 : -0.1) : 0;
      b.rotation.z = -s * tilt;
      b.position.y = 0.155 + (e === "surprised" ? 0.04 : e === "angry" ? -0.02 : 0);
    }
    let m: string = f.mouth ?? (e === "happy" ? "grin" : e === "sad" ? "frown" : e === "angry" ? "frown" : e === "surprised" ? "o" : e === "suspicious" ? "flat" : "smile");
    if (f.talk > 0.05) m = "talk";
    smile.visible = m === "smile" || m === "grin";
    smile.scale.set(m === "grin" ? 1.3 : 1, m === "grin" ? 1.3 : 0.8, 1);
    frown.visible = m === "frown";
    flat.visible = m === "flat";
    open.visible = m === "talk" || m === "o" || m === "talk-open" || m === "talk-half";
    const lv = m === "talk" ? f.talk : m === "o" ? 0.8 : m === "talk-open" ? 1 : 0.5;
    open.scale.set(m === "o" ? 0.6 : 1, 0.25 + lv * 0.75, 0.35);
    // tears fall, sweat drips
    tears.forEach((t) => {
      t.visible = f.tears;
      if (!f.tears) return;
      const s = t.userData.side as number, q = t.userData.q as number;
      const k = ((n * 1.4 + q * 6) % 24) / 24; // 0 → 1: from the eye, down the cheek, off the face
      t.position.set(s * (0.11 + k * k * 0.22), -0.02 - k * 0.2 + k * k * 0.02, 0.27 + k * 0.05);
      t.scale.setScalar(0.7 + k * 0.6).multiply(new THREE.Vector3(0.8, 1.35, 0.8));
    });
    sweat.visible = f.sweat;
    sweat.position.y = 0.13 - ((n % 30) / 30) * 0.08;
    book.visible = f.hold === "book";
    phone.visible = f.hold === "phone";
    cup.visible = f.hold === "cup";
  };
  return {
    root,
    apply,
    headWorld: (out) => head.getWorldPosition(out),
    handWorld: (side, out) => (side === "l" ? L.hand : R.hand).getWorldPosition(out ?? tmp),
    hand: (side) => (side === "l" ? L.hand : R.hand),
  };
}

// ---------------------------------------------------------------- posing
export type PoseInput = {
  pose: Pose | string;
  stance: string; // stand | sit | lie | walk-a | walk-b
  expr: Expression;
  talk: number;
  energy: number; // how much the character is in the middle of speaking (smoothed)
  walkPhase: number;
  walking: boolean;
  n: number;
  seed: number;
};

/** The body angles for one frame (before smoothing). */
export function targetJoints(p: PoseInput): Omit<Joints, "x" | "y" | "z" | "yaw" | "roll"> {
  const arms = ARMS[p.pose] ?? ARMS.idle!;
  let [L, R] = [[...arms[0]] as Arm, [...arms[1]] as Arm];
  let spine = 0, spineZ = 0, headX = 0, headY = 0, headZ = 0;
  let lhx = 0, lk = 0, rhx = 0, rk = 0;
  const t = p.n;
  // breathing / alive
  spine += Math.sin(t / 22 + p.seed) * 0.015;
  headZ += Math.sin(t / 37 + p.seed) * 0.03;
  // mood in the body
  if (p.expr === "sad") { spine += 0.16; headX += 0.18; }
  if (p.expr === "angry") { spine += 0.1; headX += 0.05; }
  if (p.expr === "surprised") { spine -= 0.1; headX -= 0.08; }
  if (p.expr === "happy") headZ += Math.sin(t / 9) * 0.05;
  if (p.expr === "suspicious") { headZ += 0.12; headX += 0.05; }
  if (p.pose === "facepalm" || p.pose === "cover") headX += 0.25;
  if (p.pose === "think") { headZ += 0.15; headX -= 0.05; }
  if (p.pose === "read" || p.pose === "page") headX += 0.25;
  if (p.pose === "wave") { R[1] += Math.sin(t / 2.5) * 0.25; R[2] += Math.sin(t / 2.5) * 0.3; }
  if (p.pose === "shrug") spineZ += Math.sin(t / 6) * 0.02;
  if (p.pose === "page") R[1] += Math.sin(t / 4) * 0.3;
  // talking: head nods with the voice, hands gesture (changing every ~1.5 s)
  if (p.talk > 0) { headX += -0.05 + p.talk * 0.08; headY += Math.sin(t / 5 + p.seed) * 0.06; }
  const free = (p.pose === "idle" || p.pose === "talk") && !p.walking && p.stance !== "lie";
  if (free && p.energy > 0.25) {
    const beat = Math.floor(t / 36);
    const kind = Math.floor(Math.abs(Math.sin(beat * 12.9898 + p.seed * 78.233)) * 43758.5453) % 5;
    const w = Math.min(1, (p.energy - 0.25) * 2.5), wob = Math.sin(t / 4.2) * 0.15 * p.talk;
    const mix = (a: Arm, b: Arm) => a.map((v, i) => v + (b[i]! - v) * w) as Arm;
    if (kind === 0) R = mix(R, [-1.0 + wob, -0.55, -0.55, 0]);
    else if (kind === 1) L = mix(L, [-1.0 - wob, 0.55, -0.55, 0]);
    else if (kind === 2) { L = mix(L, [-0.75 + wob, 0.45, -1.1, 0]); R = mix(R, [-0.75 - wob, -0.45, -1.1, 0]); }
    else if (kind === 3) R = mix(R, [-0.55, 0.25, -1.9, 0]);
  }
  // legs
  if (p.stance === "sit") {
    lhx = rhx = -1.5; lk = rk = 1.5;
    spine -= 0.05;
  } else if (p.walking) {
    const ph = p.walkPhase;
    lhx = Math.sin(ph) * 0.55;
    rhx = Math.sin(ph + Math.PI) * 0.55;
    lk = Math.max(0, Math.sin(ph + 1.6)) * 0.95;
    rk = Math.max(0, Math.sin(ph + Math.PI + 1.6)) * 0.95;
    if (p.pose === "idle" || p.pose === "talk") {
      L[0] = Math.sin(ph + Math.PI) * 0.5; R[0] = Math.sin(ph) * 0.5;
      L[2] = R[2] = -0.35;
    }
    spine += 0.06;
  } else {
    const shift = Math.sin(t / 50 + p.seed) * 0.03; // weight shifting
    lhx = shift; rhx = -shift;
  }
  return { spine, spineZ, headX, headY, headZ, lsx: L[0], lsz: L[1], lex: L[2], lez: L[3], rsx: R[0], rsz: R[1], rex: R[2], rez: R[3], lhx, lk, rhx, rk };
}
