/**
 * Story Animator 3D — animals and vehicles as real 3D characters. Built
 * from the same species list as the 2D tool (lib/creatures.ts): legs that
 * walk, tails that wag, heads that bob, jaws / beaks that open when they
 * talk, eyes that blink. Vehicles have spinning wheels and real sizes.
 * Everything is built facing +x (side view) and turned by the player.
 */
import * as THREE from "three";
import { type Species, VEHICLE_SIZE, type VehicleKind } from "../creatures";
import { at, box, cone, cyl, INK, limbMesh, mesh, shade, sphere, toon } from "./kit";
import { CHAR_H } from "./human";

export type AnimalState = { n: number; walking: boolean; talk: number; blink: boolean; expr: string; flying?: boolean };
export type Creature3D = { root: THREE.Group; animate: (s: AnimalState) => void; height: number };

function ellipsoid(rx: number, ry: number, rz: number, color: string | number, outline = 0.05): THREE.Mesh {
  const m = sphere(1, color, outline, 24);
  m.scale.set(rx, ry, rz);
  return m;
}

/** Eyes + brows + a mouth on a head (head faces +x). */
function face(head: THREE.Group, r: number, ex: number, ey: number) {
  const parts: { white: THREE.Mesh; pupil: THREE.Mesh; lid: THREE.Mesh; brow: THREE.Mesh }[] = [];
  for (const s of [-1, 1]) {
    const g = at(new THREE.Group(), ex, ey, s * r * 0.42);
    head.add(g);
    const white = sphere(r * 0.3, "#ffffff", 0.08, 14);
    white.scale.set(0.6, 1.1, 1);
    g.add(white);
    const pupil = at(sphere(r * 0.15, INK, 0, 10), r * 0.14, 0, s * r * 0.08);
    g.add(pupil);
    const lid = at(box(r * 0.08, r * 0.06, r * 0.55, INK, 0), r * 0.12, 0, 0);
    lid.visible = false;
    g.add(lid);
    const brow = at(box(r * 0.08, r * 0.07, r * 0.45, INK, 0), r * 0.1, r * 0.38, 0);
    g.add(brow);
    parts.push({ white, pupil, lid, brow });
  }
  return (st: AnimalState) => {
    for (const p of parts) {
      p.white.visible = p.pupil.visible = !st.blink;
      p.lid.visible = st.blink;
      p.white.scale.y = st.expr === "surprised" ? 1.35 : 1.1;
      p.brow.visible = st.expr === "angry" || st.expr === "sad" || st.expr === "suspicious";
      p.brow.rotation.x = st.expr === "angry" ? 0.5 : st.expr === "sad" ? -0.5 : 0;
    }
  };
}

/** Build one animal from its species. */
export function buildAnimal(sp: Species): Creature3D {
  const S = sp.h * CHAR_H;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const col = sp.color, dark = shade(sp.color, -35), belly = sp.belly ?? shade(sp.color, 40);
  const legs: { pivot: THREE.Group; phase: number }[] = [];
  const tail: THREE.Group[] = [];
  let headG = new THREE.Group();
  let jaw: THREE.Object3D | null = null, mouthM: THREE.Mesh | null = null;
  let faceUpdate: (s: AnimalState) => void = () => {};
  const wings: THREE.Object3D[] = [];
  let snakeSegs: THREE.Mesh[] = [];
  let trunk: THREE.Group[] = [];

  const addTail = (x: number, y: number, len: number, thick: number, kind: string) => {
    // a chain of pieces going back (and up, except long reptile tails)
    let parent: THREE.Object3D = body;
    const segs = kind === "long" ? 4 : 3, segLen = len / segs;
    for (let i = 0; i < segs; i++) {
      const g = new THREE.Group();
      if (i === 0) {
        g.position.set(x, y, 0);
        g.rotation.z = kind === "long" ? -Math.PI / 2 + 0.12 : -Math.PI / 2 - 0.65;
      } else {
        g.position.set(0, -segLen, 0);
        g.rotation.z = kind === "curly" ? -0.7 : kind === "long" ? 0.05 : -0.25;
      }
      g.add(limbMesh(Math.max(0.012, thick * (1 - i * 0.2)), segLen * 0.9, col));
      parent.add(g);
      tail.push(g);
      parent = g;
    }
    if (kind === "fluffy") parent.add(at(sphere(thick * 2.4, sp.ears === "mane" ? "#b45309" : shade(col, 25), 0.06, 12), 0, -segLen, 0));
  };

  if (sp.form === "quad") {
    const legLen = sp.legs * S, bodyH = S * (sp.name === "giraffe" ? 0.2 : 0.34), bodyL = sp.len * S * 0.55;
    const by = legLen + bodyH / 2;
    const torso = ellipsoid(bodyL / 2, bodyH / 2, bodyH * 0.45, col);
    torso.position.y = by;
    body.add(torso);
    if (sp.belly) { const b = ellipsoid(bodyL * 0.38, bodyH * 0.25, bodyH * 0.4, belly, 0); b.position.set(0, by - bodyH * 0.2, 0); body.add(b); }
    if (sp.pattern === "stripes") {
      for (let i = -3; i <= 3; i++) {
        const st = box(bodyL * 0.035, bodyH * 0.9, bodyH * 0.92, sp.patternColor ?? INK, 0);
        st.position.set(i * bodyL * 0.12, by + bodyH * 0.05, 0);
        st.scale.y = Math.cos((i / 4) * 1.2) * 0.9;
        body.add(st);
      }
    } else if (sp.pattern === "spots") {
      for (let i = 0; i < 10; i++) {
        const a = i * 2.4, sx = Math.sin(a * 1.7) * bodyL * 0.38, sz = Math.cos(a) > 0 ? 1 : -1;
        const sp2 = ellipsoid(bodyH * 0.12, bodyH * 0.1, bodyH * 0.03, sp.patternColor ?? INK, 0);
        sp2.position.set(sx, by + Math.sin(a) * bodyH * 0.2, sz * bodyH * 0.43);
        body.add(sp2);
      }
    }
    for (const [hx, hz, ph] of [[bodyL * 0.32, 1, 0], [bodyL * 0.32, -1, Math.PI], [-bodyL * 0.32, 1, Math.PI], [-bodyL * 0.32, -1, 0]] as const) {
      const pivot = at(new THREE.Group(), hx, by - bodyH * 0.1, hz * bodyH * 0.26);
      body.add(pivot);
      pivot.add(limbMesh(Math.max(0.02, S * 0.045), legLen - bodyH * 0.2, hz > 0 ? col : dark));
      pivot.add(at(ellipsoid(S * 0.055, S * 0.03, S * 0.045, shade(col, -15), 0.08), S * 0.01, -(legLen - bodyH * 0.1), 0));
      legs.push({ pivot, phase: ph });
    }
    const r = sp.head * S;
    const hx = bodyL * 0.5 + sp.neck * S * 0.35 + (sp.snout === "croc" ? -r * 0.1 : r * 0.25);
    const hy = by + bodyH * 0.25 + sp.neck * S + (sp.snout === "croc" ? -bodyH * 0.2 : 0);
    if (sp.neck > 0.02) {
      const nx = bodyL * 0.36, ny = by + bodyH * 0.1;
      const neck = at(new THREE.Group(), nx, ny, 0);
      const dx = hx - nx, dy = hy - ny;
      neck.rotation.z = Math.atan2(dx, -dy);
      neck.add(limbMesh(Math.max(S * 0.06, r * 0.5), Math.hypot(dx, dy), col));
      body.add(neck);
    }
    headG = at(new THREE.Group(), hx, hy, 0);
    body.add(headG);
    addTail(-bodyL * 0.48, by + bodyH * 0.1, sp.tail === "long" ? (sp.snout === "croc" ? S * 1.4 : S * 0.6) : S * 0.38,
      sp.tail === "long" ? (sp.snout === "croc" ? S * 0.12 : S * 0.04) : S * (sp.tail === "fluffy" ? 0.035 : 0.025), sp.tail);
  } else if (sp.form === "biped") {
    const legLen = sp.legs * S, bodyH = S * 0.45, bodyW = S * 0.3, by = legLen + bodyH / 2;
    body.add(at(ellipsoid(bodyW * 0.55, bodyH / 2, bodyW * 0.5, col), 0, by, 0));
    if (sp.belly) body.add(at(ellipsoid(bodyW * 0.4, bodyH * 0.34, bodyW * 0.3, belly, 0), bodyW * 0.22, by, 0));
    if (sp.name === "panda") for (const s of [-1, 1]) body.add(at(ellipsoid(bodyW * 0.18, bodyH * 0.3, bodyW * 0.2, INK, 0.03), 0, by + bodyH * 0.05, s * bodyW * 0.42));
    for (const [z, ph] of [[1, 0], [-1, Math.PI]] as const) {
      const pivot = at(new THREE.Group(), 0, legLen + bodyH * 0.08, z * bodyW * 0.22);
      body.add(pivot);
      pivot.add(limbMesh(S * 0.055, legLen * 0.9, z > 0 ? col : dark));
      pivot.add(at(ellipsoid(S * 0.07, S * 0.035, S * 0.05, shade(col, -20), 0.08), S * 0.03, -legLen, 0));
      legs.push({ pivot, phase: ph });
      const arm = at(new THREE.Group(), 0, by + bodyH * 0.3, z * bodyW * 0.52);
      body.add(arm);
      arm.add(limbMesh(S * 0.045, S * (sp.name === "penguin" ? 0.16 : 0.3), sp.name === "panda" ? INK : col));
      arm.userData.arm = ph;
      wings.push(arm);
    }
    const r = sp.head * S;
    headG = at(new THREE.Group(), bodyW * 0.1, by + bodyH / 2 + r * 0.7, 0);
    body.add(headG);
    if (sp.tail !== "none") addTail(-bodyW * 0.5, legLen + bodyH * 0.2, S * 0.45, S * 0.03, sp.tail);
  } else if (sp.form === "bird") {
    const legLen = sp.legs * S, r0 = S * 0.32, by = legLen + r0;
    body.add(at(ellipsoid(r0 * 1.05, r0, r0 * 0.85, col), 0, by, 0));
    if (sp.belly) body.add(at(ellipsoid(r0 * 0.6, r0 * 0.65, r0 * 0.6, belly, 0), r0 * 0.3, by - r0 * 0.15, 0));
    for (const z of [-1, 1]) {
      const w = at(new THREE.Group(), -r0 * 0.1, by + r0 * 0.2, z * r0 * 0.75);
      body.add(w);
      const wm = ellipsoid(r0 * 0.65, r0 * 0.12, r0 * 0.35, shade(col, -30));
      wm.position.set(-r0 * 0.2, 0, z * r0 * 0.25);
      w.add(wm);
      w.userData.side = z;
      wings.push(w);
      const leg = at(new THREE.Group(), 0, legLen + r0 * 0.1, z * r0 * 0.25);
      body.add(leg);
      leg.add(limbMesh(S * 0.015, legLen, sp.beak ?? "#f59e0b", 0.01));
      legs.push({ pivot: leg, phase: z > 0 ? 0 : Math.PI });
    }
    body.add(at(ellipsoid(r0 * 0.5, r0 * 0.12, r0 * 0.35, shade(col, -25)), -r0 * 1.1, by + r0 * 0.1, 0));
    headG = at(new THREE.Group(), r0 * 0.6, by + r0 * 0.95, 0);
    body.add(headG);
  } else if (sp.form === "snake") {
    snakeSegs = [];
    for (let i = 0; i < 16; i++) {
      const s = sphere(S * 0.22 * (1 - i * 0.03), i % 3 === 0 && sp.patternColor ? sp.patternColor : col, 0.06, 12);
      body.add(s);
      snakeSegs.push(s);
    }
    headG = new THREE.Group();
    body.add(headG);
  } else {
    // fish / shark / dolphin
    const L = sp.len * S * 0.5;
    body.add(at(ellipsoid(L, S * 0.45, S * 0.32, col), 0, S * 1.5, 0));
    if (sp.belly) body.add(at(ellipsoid(L * 0.7, S * 0.2, S * 0.3, belly, 0), 0, S * 1.35, 0));
    const tg = at(new THREE.Group(), -L * 0.9, S * 1.5, 0);
    body.add(tg);
    const fin = cone(S * 0.45, L * 0.6, shade(col, -20), 0.05, 4);
    fin.rotation.z = Math.PI / 2;
    fin.scale.set(1, 1, 0.25);
    fin.position.x = -L * 0.25;
    tg.add(fin);
    tail.push(tg);
    if (sp.name !== "fish") { const d = cone(S * 0.25, S * 0.5, col, 0.05, 4); d.scale.z = 0.3; d.position.set(-L * 0.1, S * 1.95, 0); body.add(d); }
    headG = at(new THREE.Group(), L * 0.55, S * 1.5, 0);
    body.add(headG);
  }

  // ---- head
  const r = sp.form === "snake" ? S * 0.32 : sp.form === "fish" ? S * 0.4 : sp.head * S;
  if (sp.form !== "fish") {
    if (sp.ears === "mane") headG.add(at(ellipsoid(r * 1.55, r * 1.55, r * 1.2, "#b45309"), -r * 0.2, 0, 0));
    headG.add(ellipsoid(r, r * 0.95, r * 0.9, col));
  }
  const muzzle = belly;
  if (sp.snout === "short" || sp.snout === "pig") {
    const m = ellipsoid(r * 0.35, r * 0.28, r * 0.42, sp.snout === "pig" ? shade(col, -20) : muzzle);
    m.position.set(r * 0.85, -r * 0.25, 0);
    headG.add(m);
    headG.add(at(ellipsoid(r * 0.08, r * 0.07, r * 0.12, INK, 0), r * 1.18, -r * 0.18, 0));
    mouthM = at(ellipsoid(r * 0.1, r * 0.12, r * 0.22, "#7f1d1d", 0), r * 1.05, -r * 0.48, 0);
  } else if (sp.snout === "long") {
    const m = ellipsoid(r * 0.6, r * 0.3, r * 0.38, muzzle);
    m.position.set(r * 1.1, -r * 0.25, 0);
    headG.add(m);
    headG.add(at(ellipsoid(r * 0.1, r * 0.09, r * 0.12, INK, 0), r * 1.7, -r * 0.12, 0));
    mouthM = at(ellipsoid(r * 0.25, r * 0.1, r * 0.22, "#7f1d1d", 0), r * 1.3, -r * 0.5, 0);
  } else if (sp.snout === "trunk") {
    let parent: THREE.Object3D = headG;
    let y = -r * 0.1, x = r * 0.75;
    trunk = [];
    for (let i = 0; i < 4; i++) {
      const g = at(new THREE.Group(), x, y, 0);
      parent.add(g);
      g.add(limbMesh(r * (0.26 - i * 0.04), r * 0.38, col));
      trunk.push(g);
      parent = g;
      x = 0; y = -r * 0.4;
    }
    mouthM = at(ellipsoid(r * 0.12, r * 0.12, r * 0.25, "#7f1d1d", 0), r * 0.55, -r * 0.6, 0);
  } else if (sp.snout === "beak" || sp.snout === "duck") {
    const upper = cone(r * 0.32, r * (sp.snout === "duck" ? 1.0 : 0.75), sp.beak ?? "#f59e0b", 0.06, 10);
    upper.rotation.z = -Math.PI / 2;
    upper.scale.z = sp.snout === "duck" ? 0.55 : 1;
    upper.position.set(r * 1.15, 0, 0);
    headG.add(upper);
    const j = new THREE.Group();
    j.position.set(r * 0.8, -r * 0.12, 0);
    const lower = cone(r * 0.22, r * 0.6, shade(sp.beak ?? "#f59e0b", -20), 0.06, 10);
    lower.rotation.z = -Math.PI / 2;
    lower.position.x = r * 0.3;
    j.add(lower);
    headG.add(j);
    jaw = j;
  } else if (sp.snout === "croc") {
    const upper = box(r * 2.2, r * 0.45, r * 0.9, col, 0.03);
    upper.position.set(r * 1.3, r * 0.05, 0);
    headG.add(upper);
    for (let i = 0; i < 6; i++) { const _o = at(cone(r * 0.06, r * 0.16, "#ffffff", 0, 4), r * (0.5 + i * 0.32), -r * 0.24, r * 0.4); _o.rotation.x = Math.PI; headG.add(_o); }
    const j = new THREE.Group();
    j.position.set(r * 0.25, -r * 0.2, 0);
    const lower = box(r * 2.1, r * 0.3, r * 0.85, belly, 0.03);
    lower.position.set(r * 1.05, -r * 0.1, 0);
    j.add(lower);
    headG.add(j);
    jaw = j;
  } else {
    mouthM = at(ellipsoid(r * 0.12, r * 0.12, r * 0.3, "#7f1d1d", 0), r * 0.85, -r * 0.4, 0);
  }
  if (mouthM) { headG.add(mouthM); mouthM.userData.base = mouthM.scale.y; }
  // ears
  const earCol = shade(col, -25);
  for (const z of [-1, 1]) {
    if (sp.ears === "pointy") { const e = cone(r * 0.25, r * 0.55, col, 0.06, 4); e.position.set(-r * 0.05, r * 0.85, z * r * 0.5); e.rotation.x = z * 0.25; headG.add(e); }
    else if (sp.ears === "round") headG.add(at(ellipsoid(r * 0.12, r * 0.3, r * 0.3, earCol), -r * 0.1, r * 0.75, z * r * 0.6));
    else if (sp.ears === "long") { const e = ellipsoid(r * 0.15, r * 0.65, r * 0.2, col); e.position.set(-r * 0.15, r * 1.35, z * r * 0.35); e.rotation.x = z * 0.2; headG.add(e); }
    else if (sp.ears === "floppy") {
      const big = sp.snout === "trunk" ? 1.8 : 0.9;
      const e = ellipsoid(r * 0.12 * big, r * 0.55 * big, r * 0.4 * big, earCol);
      e.position.set(-r * 0.15, -r * 0.05, z * r * (0.85 + big * 0.1));
      headG.add(e);
    } else if (sp.ears === "horns" || sp.ears === "antlers") {
      const h = cone(r * 0.1, r * (sp.ears === "antlers" ? 1 : 0.55), "#f5f5f4", 0.08, 8);
      h.position.set(-r * 0.1, r * 1.05, z * r * 0.35);
      h.rotation.x = z * 0.4;
      headG.add(h);
      if (sp.ears === "antlers") { const b = cone(r * 0.07, r * 0.5, "#f5f5f4", 0.08, 8); b.position.set(r * 0.15, r * 1.25, z * r * 0.55); b.rotation.set(z * 0.5, 0, -0.6); headG.add(b); }
    }
  }
  if (sp.form !== "fish") faceUpdate = face(headG, r, r * 0.55, r * 0.25);
  else faceUpdate = face(headG, r, r * 0.4, r * 0.1);

  const height = sp.form === "fish" ? S * 2 : S;
  const animate = (st: AnimalState) => {
    const ph = st.walking ? st.n * 0.42 : 0;
    for (const l of legs) l.pivot.rotation.z = Math.sin(ph + l.phase) * (st.walking ? 0.5 : 0);
    tail.forEach((t, i) => { t.rotation.y = Math.sin(st.n / 5 - i * 0.6) * (sp.form === "fish" ? 0.5 : 0.35); });
    headG.rotation.z = Math.sin(st.n / 10) * 0.05 + st.talk * 0.15;
    body.position.y = st.walking ? Math.abs(Math.sin(ph)) * S * 0.03 : Math.sin(st.n / 18) * S * 0.01;
    if (jaw) jaw.rotation.z = -Math.max(st.talk, st.expr === "angry" ? 0.3 : 0) * 0.6;
    if (mouthM) mouthM.scale.y = (mouthM.userData.base as number) * (0.4 + st.talk * 2.2);
    trunk.forEach((g, i) => { g.rotation.z = Math.sin(st.n / 11 + i * 0.5) * 0.25 + st.talk * 0.3 * (i ? 0.5 : 1); });
    for (const w of wings) {
      if (w.userData.side) w.rotation.x = (w.userData.side as number) * (st.flying ? Math.sin(st.n * 0.9) * 0.9 : st.talk * 0.4 + Math.sin(st.n / 12) * 0.05);
      else w.rotation.z = st.walking ? Math.sin(ph + (w.userData.arm as number)) * 0.6 : Math.sin(st.n / 14) * 0.1 + st.talk * 0.5;
    }
    if (sp.form === "bird") body.position.y += st.flying ? S * 1.6 + Math.sin(st.n / 5) * S * 0.2 : 0;
    if (snakeSegs.length) {
      const L = sp.len * S;
      snakeSegs.forEach((s, i) => {
        const t = i / snakeSegs.length;
        s.position.set(-L / 2 + t * L * 0.85, S * 0.25, Math.sin(t * 9 - st.n * 0.25) * S * 0.6 * (1 - t * 0.4));
      });
      const last = snakeSegs[snakeSegs.length - 1]!.position;
      headG.position.set(last.x + S * 0.35, S * 0.9 + Math.sin(st.n / 8) * S * 0.1, last.z);
    }
    faceUpdate(st);
  };
  animate({ n: 0, walking: false, talk: 0, blink: false, expr: "normal" });
  return { root, animate, height };
}

// ---------------------------------------------------------------- vehicles
export type Vehicle3D = { root: THREE.Group; animate: (n: number, moving: boolean) => void; length: number };

export function buildVehicle(kind: VehicleKind, color: string): Vehicle3D {
  const [lenU, hU] = VEHICLE_SIZE[kind];
  const L = lenU * CHAR_H, H = hU * CHAR_H, Wd = Math.min(H * 0.85, CHAR_H * 1.2);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const wheels: THREE.Object3D[] = [];
  const wheel = (x: number, r: number, z: number) => {
    const g = at(new THREE.Group(), x, r, z);
    const t = cyl(r, r, r * 0.5, "#1f2937", 0.04, 20);
    t.rotation.x = Math.PI / 2;
    g.add(t);
    const hub = cyl(r * 0.5, r * 0.5, r * 0.52, "#d1d5db", 0.04, 12);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    const spoke = box(r * 0.9, r * 0.12, r * 0.55, "#6b7280", 0);
    g.add(spoke);
    root.add(g);
    wheels.push(g);
  };
  const glass = "#bfe3ff";
  if (kind === "bike") {
    const r = H * 0.42;
    for (const x of [-L * 0.32, L * 0.32]) {
      const g = at(new THREE.Group(), x, r, 0);
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 8, 24), toon("#1f2937"));
      g.add(t, box(r * 1.8, r * 0.05, r * 0.05, "#9ca3af", 0));
      root.add(g);
      wheels.push(g);
    }
    const frame = (x1: number, y1: number, x2: number, y2: number) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const m = cyl(r * 0.07, r * 0.07, len, color, 0.08, 8);
      m.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      m.rotation.z = Math.atan2(x1 - x2, y2 - y1);
      body.add(m);
    };
    frame(-L * 0.32, r, 0, r * 1.9);
    frame(0, r * 1.9, L * 0.28, r * 1.9);
    frame(L * 0.32, r, L * 0.25, r * 2.3);
    frame(0, r, 0, r * 1.9);
    frame(-L * 0.32, r, 0, r);
    body.add(at(box(r * 0.5, r * 0.12, r * 0.3, INK), -L * 0.02, r * 2.0, 0));
  } else {
    const wr = H * 0.17;
    const bodyCol = kind === "taxi" ? "#facc15" : color;
    if (kind === "car" || kind === "taxi" || kind === "jeep") {
      body.add(at(box(L, H * 0.42, Wd, bodyCol), 0, wr + H * 0.25, 0));
      body.add(at(box(L * 0.55, H * 0.4, Wd * 0.9, bodyCol), -L * 0.05, wr + H * 0.62, 0));
      for (const z of [-1, 1]) body.add(at(box(L * 0.48, H * 0.28, 0.02, glass, 0), -L * 0.05, wr + H * 0.62, z * Wd * 0.46));
      body.add(at(box(0.02, H * 0.3, Wd * 0.8, glass, 0), L * 0.225, wr + H * 0.62, 0));
      if (kind === "taxi") body.add(at(box(L * 0.15, H * 0.1, Wd * 0.3, INK), -L * 0.05, wr + H * 0.86, 0));
    } else if (kind === "boat") {
      const hull = box(L, H * 0.45, Wd, bodyCol);
      hull.position.y = H * 0.22;
      body.add(hull);
      body.add(at(box(L * 0.3, H * 0.5, Wd * 0.7, "#ffffff"), -L * 0.1, H * 0.7, 0));
    } else {
      // bus, train, truck, tractor, rickshaw: one big box + windows
      const main = box(kind === "truck" ? L * 0.68 : L, H - wr, Wd, bodyCol);
      main.position.set(kind === "truck" ? -L * 0.16 : 0, wr + (H - wr) / 2, 0);
      body.add(main);
      if (kind === "truck") body.add(at(box(L * 0.3, H * 0.65, Wd, shade(bodyCol, -30)), L * 0.35, wr + H * 0.3, 0));
      const nW = kind === "bus" ? 5 : kind === "train" ? 7 : kind === "rickshaw" ? 1 : 0;
      for (let i = 0; i < nW; i++) for (const z of [-1, 1]) {
        body.add(at(box(L * 0.8 / nW - 0.08, H * 0.32, 0.03, glass, 0), -L * 0.42 + (i + 0.5) * (L * 0.8 / nW), wr + H * 0.62, z * (Wd / 2 + 0.01)));
      }
      if (kind === "bus" || kind === "train") {
        body.add(at(box(0.03, H * 0.4, Wd * 0.85, glass, 0), L / 2 + 0.01, wr + H * 0.6, 0));
        for (const z of [-1, 1]) body.add(at(box(L, H * 0.06, 0.03, shade(bodyCol, -45), 0), 0, wr + H * 0.38, z * (Wd / 2 + 0.01)));
      }
    }
    for (const z of [-1, 1]) body.add(at(sphere(H * 0.05, "#fde047", 0.08, 8), L / 2, wr + H * 0.25, z * Wd * 0.35));
    const xs = kind === "train" ? [-0.38, -0.2, 0.2, 0.38] : kind === "boat" ? [] : [-0.32, 0.3];
    for (const k of xs) for (const z of [-1, 1]) wheel(L * k, wr, z * Wd * 0.5);
  }
  const animate = (n: number, moving: boolean) => {
    for (const w of wheels) w.rotation.z = moving ? -n * 0.45 : 0;
    body.position.y = moving ? Math.abs(Math.sin(n * 0.7)) * 0.015 : 0;
  };
  return { root, animate, length: L };
}
