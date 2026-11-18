/**
 * 3D World — every object as a "living" 3D model. A builder returns the
 * model plus what the world needs to bring it alive: the parts that sway
 * in the wind, the branches (which can be cut off), the fruits / stones /
 * balls (things characters pick, eat, throw…), where to climb, where to
 * sit, the door, the fire, the water…
 *
 * Local convention: the FRONT of every object is local +z (the side a
 * character walks up to; the world turns objects to face the camera).
 */
import { kitInfo, kitInstance } from "./kits";
import * as THREE from "three";
import { at, box, cone, cyl, drawnTexture, mesh, pickOf, rng, shade, sphere, textTexture, toon } from "../three3d/kit";
import { buildAnimal, type Creature3D } from "../three3d/animal";
import { madeUpSpecies, speciesFor } from "../creatures";
import { buildHuman, type Human } from "../three3d/human";
import { autoHumanConfig } from "../player";
import { starterFor } from "./starter";
import { FRUIT_OF, hasTrait, type ModelDef, type ModelPart, optOf, optStr, type Vec2, type WorldObj } from "./types";

export type ThingSpec = {
  obj: THREE.Object3D; kind: string; words: string[]; size: number;
  floats: boolean; edible: boolean; big?: boolean; reach?: "low" | "high" | "ground";
};
export type SwayPart = { o: THREE.Object3D; amp: number; ph: number; bx: number; bz: number };
export type Built = {
  root: THREE.Group;
  pivot: THREE.Group; // the part that falls when chopped / wobbles when shaken
  sway: SwayPart[];
  things: ThingSpec[];
  branches: { group: THREE.Group; low: boolean; leaves: THREE.Object3D }[];
  radius: number; height: number; solid: boolean;
  vr?: number; // how wide it LOOKS (leaves…) — the camera hides it if it is in the way
  climb?: { top: number; perch?: THREE.Vector3; trunkR: number; ladder?: boolean };
  seatH?: number;
  door?: { pivot: THREE.Object3D; front: THREE.Vector3; inside: THREE.Vector3 };
  flap?: boolean; // tent: no door, just walk in
  fire?: { group: THREE.Group; flames: THREE.Mesh[]; light: THREE.PointLight };
  water?: { kind: "river" | "pond" | "path"; pts?: Vec2[]; width?: number; radius?: number };
  hill?: { r: number; h: number };
  bridge?: { len: number; width: number };
  boat?: boolean;
  creature?: Creature3D; // animals: the world moves them (walk, swim, play…)
  person?: { h: Human; ph: number }; // people: the world moves them
  rower?: (n: number, k: number) => void; // a boatman rowing (k = how hard)
  wheels?: { o: THREE.Object3D; q: THREE.Quaternion; r: number }[]; // turn when it moves
  smokes?: THREE.Object3D[]; // smoke comes out here
  floorTop?: { w: number; d: number; h: number; cx: number; cz: number }; // you can stand on top of it
  length?: number; // along x (designed things)
  abilities?: string[]; // designed things: what it can do (from its design)
  update?: (n: number, wind: number) => void;
};

const BARK = ["#8b5a2b", "#7a4b24", "#946236", "#6f4423"];
const LEAF = ["#4caf50", "#5fae55", "#3f9d4a", "#6fbf5a", "#2e8b57", "#57a845"];
const LEAF_JUNGLE = ["#2f7d3a", "#2d6e3e", "#3a8f45", "#24703a"];

function newBuilt(radius: number, height: number, solid: boolean): Built {
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);
  return { root, pivot, sway: [], things: [], branches: [], radius, height, solid };
}
function sway(b: Built, o: THREE.Object3D, amp: number, ph: number) {
  b.sway.push({ o, amp, ph, bx: o.rotation.x, bz: o.rotation.z });
}

/** A fruit hanging by a little stem (its own object, so it can fall / be picked). */
function fruit(kind: string, color: string, r: number, long = 1): THREE.Group {
  const g = new THREE.Group();
  const body = sphere(r, color, 0.08, 12);
  body.scale.set(1, long, 1);
  body.position.y = -r * long;
  g.add(body);
  g.add(at(cyl(0.008, 0.008, 0.06, "#5b3a1a", 0, 5), 0, 0.01, 0));
  if (kind === "mango" || kind === "apple" || kind === "orange") {
    const leaf = mesh(new THREE.SphereGeometry(0.035, 6, 4), "#3f9d4a", 0);
    leaf.scale.set(1.6, 0.3, 0.7);
    leaf.position.set(0.03, 0.02, 0);
    g.add(leaf);
  }
  if (kind === "banana") {
    g.clear();
    for (let i = 0; i < 6; i++) {
      const b = cyl(0.025, 0.02, 0.2, color, 0.08, 6);
      b.position.set(Math.cos(i) * 0.06, -0.12 - (i % 3) * 0.05, Math.sin(i) * 0.06);
      b.rotation.set(Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5);
      g.add(b);
    }
  }
  g.userData.fruit = kind;
  return g;
}

// ------------------------------------------------------------------ trees
function fruitTree(o: WorldObj, r: () => number, jungle: boolean): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.45 * s, 4.6 * s, hasTrait(o, "solid"));
  b.vr = 1.5 * s * (o.type === "big_tree" ? 1.25 : 1);
  const H = 3.0 * s, tr = 0.22 * s;
  const bark = pickOf(r, BARK);
  const leafC = o.type === "big_tree" ? pickOf(r, jungle ? LEAF_JUNGLE : LEAF) : pickOf(r, jungle ? LEAF_JUNGLE : LEAF);
  const p = b.pivot;
  p.add(at(cyl(tr * 0.8, tr * 1.15, H, bark, 0.06, 12), 0, H / 2, 0));
  for (let i = 0; i < 4; i++) { // roots
    const rt = cyl(0.04 * s, 0.09 * s, 0.6 * s, bark, 0.08, 6);
    const a = (i / 4) * Math.PI * 2 + 0.4;
    rt.position.set(Math.cos(a) * tr * 1.2, 0.12, Math.sin(a) * tr * 1.2);
    rt.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    p.add(rt);
  }
  // the crown: clusters of leaves high up (characters on the perch stay visible)
  const crown = at(new THREE.Group(), 0, H + 0.75 * s, 0);
  p.add(crown);
  const big = o.type === "big_tree" ? 1.25 : 1;
  crown.add(at(sphere(1.05 * s * big, leafC, 0.035, 16), 0, 0.2 * s, 0));
  crown.add(at(sphere(0.8 * s * big, shade(leafC, 18), 0.04, 14), 0.75 * s * big, -0.15 * s, 0.2 * s));
  crown.add(at(sphere(0.8 * s * big, shade(leafC, -18), 0.04, 14), -0.8 * s * big, -0.05 * s, -0.25 * s));
  crown.add(at(sphere(0.7 * s * big, shade(leafC, 8), 0.04, 14), 0.1 * s, 0.55 * s, -0.5 * s));
  sway(b, crown, 0.035, r() * 6);
  const fruitInfo = FRUIT_OF[o.type];
  const nFruit = hasTrait(o, "fruits") && fruitInfo ? Math.round(optOf(o, "fruits", 8)) : 0;
  // branches: one low branch to the front (fruits you can reach), one to
  // the side to sit on (the perch), two more up high
  const specs = [
    { a: -0.8, h: 1.5, tilt: 1.15, len: 1.15, low: true }, // front-left: fruit you can reach
    { a: Math.PI / 2, h: 1.85, tilt: 1.42, len: 1.35, low: false, perch: true }, // right: to sit on
    { a: Math.PI * 1.1, h: 2.1, tilt: 0.95, len: 1.1, low: false },
    { a: -Math.PI * 0.6, h: 2.3, tilt: 0.85, len: 1.0, low: false },
  ];
  let fruitLeft = nFruit;
  specs.forEach((sp, i) => {
    const g = at(new THREE.Group(), 0, sp.h * s, 0);
    g.rotation.y = sp.a - Math.PI / 2; // local +x of the group points outwards (a = 0 → front)
    const arm = new THREE.Group();
    arm.rotation.z = Math.PI / 2 - sp.tilt; // tilt up from horizontal
    g.add(arm);
    const L = sp.len * s;
    const stick = cyl(0.045 * s, (sp.perch ? 0.1 : 0.075) * s, L, bark, 0.07, 8);
    stick.rotation.z = -Math.PI / 2;
    stick.position.x = L / 2;
    arm.add(stick);
    const leaves = at(new THREE.Group(), L, 0.1 * s, 0);
    arm.add(leaves);
    leaves.add(sphere((sp.perch || sp.low ? 0.45 : 0.6) * s, shade(leafC, (i % 2 ? 10 : -10)), 0.045, 12));
    leaves.rotation.z = -(Math.PI / 2 - sp.tilt); // leaves stay upright
    // fruits under this branch's leaves
    const here = sp.low ? Math.ceil(nFruit * 0.5) : i === 2 ? Math.ceil(fruitLeft / 2) : fruitLeft;
    for (let k = 0; k < Math.min(here, fruitLeft) && fruitInfo; k++) {
      const f = fruit(fruitInfo.kind, fruitInfo.color, fruitInfo.r * s, fruitInfo.long ?? 1);
      const a = (k / Math.max(1, here)) * Math.PI * 2 + r();
      f.position.set(Math.cos(a) * 0.3 * s, (sp.low ? -0.34 : -0.42) * s - r() * 0.1 * s, Math.sin(a) * 0.3 * s);
      leaves.add(f);
      b.things.push({ obj: f, kind: fruitInfo.kind, words: [fruitInfo.kind, fruitInfo.kind + "s", "fruit"], size: fruitInfo.r * s, floats: true, edible: true, reach: sp.low ? "low" : "high" });
    }
    fruitLeft -= Math.min(here, fruitLeft);
    p.add(g);
    sway(b, g, 0.05 + r() * 0.03, r() * 6);
    sway(b, leaves, 0.06, r() * 6);
    b.branches.push({ group: g, low: sp.low, leaves });
    if (sp.perch) {
      // perch point (local): along the branch, on top of it
      const d = 0.55 * s;
      const px = Math.cos(Math.PI / 2 - sp.tilt) * d, py = sp.h * s + Math.sin(Math.PI / 2 - sp.tilt) * d + 0.1 * s;
      b.climb = { top: (sp.h - 0.95) * s, perch: new THREE.Vector3(px, py, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y), trunkR: tr };
    }
  });
  if (!hasTrait(o, "climbable")) b.climb = undefined;
  return b;
}

function pineTree(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.4 * s, 4.5 * s, hasTrait(o, "solid"));
  b.vr = 1.4 * s;
  const snowy = o.opts?.snow === true;
  b.pivot.add(at(cyl(0.16 * s, 0.24 * s, 1.6 * s, "#6f4423", 0.06, 10), 0, 0.8 * s, 0));
  for (let k = 0; k < 4; k++) {
    const layer = at(new THREE.Group(), 0, (1.5 + k * 0.75) * s, 0);
    layer.add(cone((1.35 - k * 0.27) * s, 1.4 * s, pickOf(r, ["#2f7d4a", "#2a6e42", "#347f4f"]), 0.03, 12));
    if (snowy) layer.add(at(cone((0.6 - k * 0.1) * s, 0.55 * s, "#ffffff", 0, 12), 0, 0.45 * s, 0));
    b.pivot.add(layer);
    sway(b, layer, 0.03 + k * 0.012, r() * 6 + k * 0.4);
  }
  if (hasTrait(o, "climbable")) b.climb = { top: 1.4 * s, trunkR: 0.2 * s };
  return b;
}

function palmTree(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.35 * s, 5 * s, hasTrait(o, "solid"));
  b.vr = 2.0 * s;
  let y = 0, px = 0;
  const bend = 0.05 + r() * 0.05;
  for (let k = 0; k < 8; k++) {
    const seg = at(cyl(0.15 * s, 0.19 * s, 0.56 * s, k % 2 ? "#a0704a" : "#8f6240", 0.06, 10), px, y + 0.28 * s, 0);
    seg.rotation.z = -bend * k * 0.3;
    b.pivot.add(seg);
    y += 0.53 * s; px += bend * k * 0.09 * s;
  }
  const top = at(new THREE.Group(), px, y, 0);
  b.pivot.add(top);
  for (let k = 0; k < 8; k++) {
    const leafG = new THREE.Group();
    leafG.rotation.y = (k / 8) * Math.PI * 2;
    const leaf = mesh(new THREE.SphereGeometry(1, 12, 6), k % 2 ? "#3f9d4a" : "#4caf50", 0.04);
    leaf.scale.set(1.5 * s, 0.1 * s, 0.38 * s);
    leaf.position.set(1.15 * s, -0.25 * s, 0);
    leaf.rotation.z = -0.45;
    leafG.add(leaf);
    top.add(leafG);
    sway(b, leafG, 0.08, r() * 6);
  }
  sway(b, top, 0.04, r() * 6);
  const info = FRUIT_OF.palm_tree!;
  const n = hasTrait(o, "fruits") ? Math.round(optOf(o, "fruits", 4)) : 0;
  for (let k = 0; k < n; k++) {
    const f = fruit(info.kind, info.color, info.r * s);
    const a = (k / n) * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.17 * s, -0.08 * s, Math.sin(a) * 0.17 * s);
    top.add(f);
    b.things.push({ obj: f, kind: "coconut", words: ["coconut", "coconuts", "fruit"], size: info.r * s, floats: true, edible: true, reach: "high" });
  }
  if (hasTrait(o, "climbable")) b.climb = { top: 2.9 * s, trunkR: 0.18 * s };
  return b;
}

function bananaPlant(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.3 * s, 3 * s, false);
  b.vr = 1.8 * s;
  b.pivot.add(at(cyl(0.11 * s, 0.15 * s, 1.9 * s, "#7fa650", 0.06, 10), 0, 0.95 * s, 0));
  for (let k = 0; k < 6; k++) {
    const g = at(new THREE.Group(), 0, 1.85 * s, 0);
    g.rotation.y = (k / 6) * Math.PI * 2 + r();
    const leaf = mesh(new THREE.SphereGeometry(1, 12, 6), k % 2 ? "#5fae55" : "#4caf50", 0.04);
    leaf.scale.set(1.0 * s, 0.06 * s, 0.32 * s);
    leaf.position.set(0.85 * s, 0.25 * s, 0);
    leaf.rotation.z = 0.35;
    g.add(leaf);
    b.pivot.add(g);
    sway(b, g, 0.09, r() * 6);
  }
  if (hasTrait(o, "fruits")) {
    const bunch = fruit("banana", "#facc15", 0.07 * s, 2.2);
    bunch.position.set(0, 1.62 * s, 0.22 * s);
    bunch.scale.setScalar(1.4 * s);
    b.pivot.add(bunch);
    b.things.push({ obj: bunch, kind: "banana", words: ["banana", "bananas", "fruit"], size: 0.15, floats: true, edible: true, reach: "low" });
  }
  return b;
}

function bush(o: WorldObj, r: () => number, berries: boolean): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.75 * s, 1.1 * s, false);
  const c = pickOf(r, LEAF);
  const g = new THREE.Group();
  b.pivot.add(g);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    g.add(at(sphere((0.42 + r() * 0.15) * s, shade(c, (k % 3 - 1) * 14), 0.05, 12), Math.cos(a) * 0.35 * s, (0.4 + r() * 0.2) * s, Math.sin(a) * 0.3 * s));
  }
  g.add(at(sphere(0.5 * s, c, 0.05, 12), 0, 0.65 * s, 0));
  sway(b, g, 0.035, r() * 6);
  if (berries && hasTrait(o, "fruits")) {
    const n = Math.round(optOf(o, "fruits", 8));
    for (let k = 0; k < n; k++) {
      const f = fruit("berry", "#7c3aed", 0.04 * s);
      const a = (k / n) * Math.PI * 2 + r() * 0.4;
      f.position.set(Math.cos(a) * 0.62 * s, (0.45 + r() * 0.45) * s, Math.sin(a) * 0.55 * s + 0.1 * s);
      g.add(f);
      b.things.push({ obj: f, kind: "berry", words: ["berry", "berries", "fruit"], size: 0.04, floats: true, edible: true, reach: "low" });
    }
  }
  return b;
}

function flowers(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0, 0.5, false);
  const n = Math.round(optOf(o, "count", 14)), R = optOf(o, "radius", 1.4);
  const cols = ["#f43f5e", "#facc15", "#ffffff", "#a855f7", "#fb923c", "#38bdf8"];
  for (let k = 0; k < n; k++) {
    const f = new THREE.Group();
    const h = 0.25 + r() * 0.2;
    f.add(at(cyl(0.008, 0.01, h, "#3f9d4a", 0, 4), 0, h / 2, 0));
    const head = at(new THREE.Group(), 0, h, 0);
    const col = pickOf(r, cols);
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      const petal = sphere(0.035, col, 0.1, 6);
      petal.scale.set(1, 0.4, 1);
      head.add(at(petal, Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04));
    }
    head.add(sphere(0.022, "#fde047", 0.1, 6));
    f.add(head);
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
    f.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    b.pivot.add(f);
    sway(b, f, 0.12, r() * 6);
    if (hasTrait(o, "pickable")) b.things.push({ obj: f, kind: "flower", words: ["flower", "flowers", "rose"], size: 0.06, floats: true, edible: false, reach: "ground" });
  }
  return b;
}

function tallGrass(o: WorldObj, r: () => number): Built {
  const b = newBuilt(optOf(o, "radius", 1.6), 1.1, false);
  const R = optOf(o, "radius", 1.6);
  const n = Math.round(R * R * 22);
  const geo = new THREE.ConeGeometry(0.035, 1, 3);
  geo.translate(0, 0.5, 0);
  for (let k = 0; k < n; k++) {
    const blade = new THREE.Mesh(geo, toon(pickOf(r, ["#9ab65a", "#b5c96b", "#86a84a", "#c9b458"])));
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
    blade.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    blade.scale.set(1, 0.7 + r() * 0.6, 1);
    blade.rotation.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3);
    b.pivot.add(blade);
    if (k % 3 === 0) sway(b, blade, 0.14, blade.position.x * 0.8);
  }
  return b;
}

function mushrooms(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0.3, 0.3, false);
  for (let k = 0; k < 3; k++) {
    const m = new THREE.Group();
    const h = 0.1 + r() * 0.08;
    m.add(at(cyl(0.025, 0.03, h, "#fef3c7", 0.08, 8), 0, h / 2, 0));
    const cap = mesh(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#dc2626", 0.08);
    cap.position.y = h;
    m.add(cap);
    for (let d = 0; d < 4; d++) m.add(at(sphere(0.012, "#ffffff", 0, 5), Math.cos(d * 1.7) * 0.045, h + 0.055, Math.sin(d * 1.7) * 0.045));
    m.position.set((k - 1) * 0.16, 0, (r() - 0.5) * 0.15);
    b.pivot.add(m);
    if (hasTrait(o, "pickable")) b.things.push({ obj: m, kind: "mushroom", words: ["mushroom", "mushrooms"], size: 0.08, floats: true, edible: hasTrait(o, "eatable"), reach: "ground" });
  }
  return b;
}

// --------------------------------------------------------- ground things
function rock(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.75 * s, 0.75 * s, hasTrait(o, "solid"));
  const m = mesh(new THREE.DodecahedronGeometry(0.7 * s, 1), pickOf(r, ["#9ca3af", "#a8a29e", "#8b8f97"]), 0.035);
  m.scale.set(1.15, 0.62, 0.95);
  m.position.y = 0.3 * s;
  m.rotation.y = r() * 6;
  b.pivot.add(m);
  b.pivot.add(at(sphere(0.18 * s, "#6b8f4e", 0.06, 8), 0.4 * s, 0.62 * s, -0.2 * s)); // moss
  b.seatH = 0.68 * s;
  if (hasTrait(o, "pushable")) b.things.push({ obj: b.pivot, kind: "rock", words: ["rock", "boulder"], size: 0.7 * s, floats: false, edible: false, big: true });
  return b;
}
function stones(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0, 0.1, false);
  const n = Math.round(optOf(o, "count", 5));
  for (let k = 0; k < n; k++) {
    const st = mesh(new THREE.IcosahedronGeometry(0.06 + r() * 0.04, 0), pickOf(r, ["#9ca3af", "#78716c", "#a8a29e"]), 0.08);
    const a = r() * Math.PI * 2, d = 0.2 + r() * 0.9;
    st.position.set(Math.cos(a) * d, 0.05, Math.sin(a) * d);
    b.pivot.add(st);
    b.things.push({ obj: st, kind: "stone", words: ["stone", "stones", "pebble", "rock"], size: 0.08, floats: false, edible: false, reach: "ground" });
  }
  return b;
}
function log(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const len = optOf(o, "len", 1.7) * s;
  const b = newBuilt(len / 2, 0.45 * s, hasTrait(o, "solid"));
  const g = new THREE.Group();
  const body = cyl(0.22 * s, 0.22 * s, len, pickOf(r, BARK), 0.05, 14);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.CircleGeometry(0.2 * s, 14), toon("#d6a96b"));
    ring.position.x = sx * (len / 2 + 0.001);
    ring.rotation.y = sx * Math.PI / 2;
    g.add(ring);
  }
  g.position.y = 0.22 * s;
  b.pivot.add(g);
  b.seatH = 0.44 * s;
  b.things.push({ obj: b.pivot, kind: "log", words: ["log", "wood"], size: 0.4 * s, floats: true, edible: false, big: true });
  return b;
}
function stump(o: WorldObj): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.35 * s, 0.42 * s, true);
  b.pivot.add(at(cyl(0.3 * s, 0.36 * s, 0.42 * s, "#7a4b24", 0.05, 14), 0, 0.21 * s, 0));
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.29 * s, 14), toon("#d6a96b"));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.421 * s;
  b.pivot.add(top);
  b.seatH = 0.44 * s;
  return b;
}
function hill(o: WorldObj): Built {
  const b = newBuilt(0, optOf(o, "height", 1.6), false);
  b.hill = { r: optOf(o, "radius", 6) * (o.scale ?? 1), h: optOf(o, "height", 1.6) * (o.scale ?? 1) };
  return b; // the ground itself is raised (world.ts)
}

// -------------------------------------------------------------- buildings
function doorAt(b: Built, w: number, h: number, z: number, col: string) {
  const hinge = at(new THREE.Group(), -w / 2, 0, z + 0.02);
  const d = box(w, h, 0.06, col, 0.02);
  d.position.set(w / 2, h / 2, 0);
  hinge.add(d);
  hinge.add(at(sphere(0.035, "#fbbf24", 0.1, 8), w - 0.12, h * 0.5, 0.05));
  b.pivot.add(hinge);
  b.door = { pivot: hinge, front: new THREE.Vector3(0, 0, z + 0.85), inside: new THREE.Vector3(0, 0, z - 1.0) };
}
function hut(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(1.9 * s, 3.4 * s, hasTrait(o, "solid"));
  const W = 3.0 * s, D = 2.6 * s, H = 2.2 * s;
  const wall = pickOf(r, ["#c08552", "#d4a373", "#b5835a", "#e0b48a"]);
  // walls with a door hole: back, sides, and two front pieces
  b.pivot.add(at(box(W, H, 0.12, wall), 0, H / 2, -D / 2));
  b.pivot.add(at(box(0.12, H, D, wall), -W / 2, H / 2, 0), at(box(0.12, H, D, wall), W / 2, H / 2, 0));
  const dw = 0.9 * s, dh = 1.75 * s;
  b.pivot.add(at(box((W - dw) / 2, H, 0.12, wall), -(W + dw) / 4, H / 2, D / 2), at(box((W - dw) / 2, H, 0.12, wall), (W + dw) / 4, H / 2, D / 2));
  b.pivot.add(at(box(dw, H - dh, 0.12, wall), 0, dh + (H - dh) / 2, D / 2));
  // dark inside
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, H), new THREE.MeshBasicMaterial({ color: 0x2b1d14 }));
  inside.position.set(0, H / 2, -D / 2 + 0.07);
  b.pivot.add(inside);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon("#5b4030"));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01;
  b.pivot.add(floor);
  // thatched roof
  const roof = mesh(new THREE.ConeGeometry(Math.max(W, D) * 0.86, 1.5 * s, 4), pickOf(r, ["#d9b26f", "#c9a25e", "#b8904e"]), 0.03);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, D / W + 0.1);
  roof.position.y = H + 0.72 * s;
  b.pivot.add(roof);
  // a window
  b.pivot.add(at(box(0.6 * s, 0.5 * s, 0.05, "#3b2a1e"), W / 2 + 0.07, 1.35 * s, 0.2));
  doorAt(b, dw, dh, D / 2, pickOf(r, ["#7c4a21", "#8b5a2b", "#5b3a1a"]));
  return b;
}
function house(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(2.4 * s, 4.6 * s, hasTrait(o, "solid"));
  const W = 4.2 * s, D = 3.2 * s, H = 2.8 * s;
  const wall = pickOf(r, ["#fde68a", "#fecaca", "#bfdbfe", "#d9f99d", "#fbcfe8", "#f5f5f4"]);
  const dw = 1.0 * s, dh = 2.0 * s;
  b.pivot.add(at(box(W, H, 0.15, wall), 0, H / 2, -D / 2));
  b.pivot.add(at(box(0.15, H, D, wall), -W / 2, H / 2, 0), at(box(0.15, H, D, wall), W / 2, H / 2, 0));
  b.pivot.add(at(box((W - dw) / 2, H, 0.15, wall), -(W + dw) / 4, H / 2, D / 2), at(box((W - dw) / 2, H, 0.15, wall), (W + dw) / 4, H / 2, D / 2));
  b.pivot.add(at(box(dw, H - dh, 0.15, wall), 0, dh + (H - dh) / 2, D / 2));
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.3, H), new THREE.MeshBasicMaterial({ color: 0x3a2f2a }));
  inside.position.set(0, H / 2, -D / 2 + 0.09);
  b.pivot.add(inside);
  const roofC = pickOf(r, ["#b91c1c", "#9a3412", "#475569", "#7c2d12"]);
  for (const sx of [-1, 1]) {
    const pl = box(W / 2 + 0.5, 0.12, D + 0.6, roofC, 0.02);
    pl.position.set(sx * W / 4.2, H + 0.75 * s, 0);
    pl.rotation.z = -sx * 0.62;
    b.pivot.add(pl);
  }
  const gable = mesh(new THREE.CylinderGeometry(0.01, W / 2, 1.3 * s, 3), wall, 0.02);
  gable.rotation.set(Math.PI / 2, 0, 0); gable.scale.set(1, D / (1.3 * s), 1);
  b.pivot.add(at(box(0.5 * s, 1.0 * s, 0.5 * s, "#78716c"), W / 4, H + 1.2 * s, -D / 5));
  for (const sx of [-1, 1]) {
    const win = at(new THREE.Group(), sx * W * 0.3, 1.55 * s, D / 2 + 0.09);
    win.add(box(0.75 * s, 0.65 * s, 0.04, "#ffffff"), at(box(0.65 * s, 0.55 * s, 0.05, "#7dd3fc", 0), 0, 0, 0.01));
    b.pivot.add(win);
  }
  doorAt(b, dw, dh, D / 2, pickOf(r, ["#7c2d12", "#1e3a8a", "#14532d", "#6b21a8"]));
  b.door!.front.z += 0.1;
  return b;
}
function tent(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(1.4 * s, 1.8 * s, hasTrait(o, "solid"));
  const col = pickOf(r, ["#f97316", "#16a34a", "#2563eb", "#dc2626", "#eab308"]);
  // a ridge tent: a triangular prism, door at the front (+z)
  const R = 1.05 * s, L = 2.3 * s;
  const t = mesh(new THREE.CylinderGeometry(R, R, L, 3, 1, false), col, 0.03);
  t.rotation.x = -Math.PI / 2; // ridge on top
  t.position.y = R * 0.5;
  b.pivot.add(t);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(R * 0.55, 3), new THREE.MeshBasicMaterial({ color: 0x1f1a17 }));
  hole.rotation.z = Math.PI / 2;
  hole.position.set(0, R * 0.3, L / 2 + 0.01);
  b.pivot.add(hole);
  b.pivot.add(at(cyl(0.025, 0.025, R * 1.7, "#78350f", 0.08, 6), 0, R * 0.75, L / 2 + 0.05));
  b.flap = true;
  b.door = { pivot: new THREE.Group(), front: new THREE.Vector3(0, 0, L / 2 + 0.8), inside: new THREE.Vector3(0, 0, 0) };
  return b;
}
function fence(o: WorldObj, r: () => number): Built {
  const len = optOf(o, "len", 6) * (o.scale ?? 1);
  const b = newBuilt(len / 2, 1.1, hasTrait(o, "solid"));
  const col = pickOf(r, ["#f5f5f4", "#a16207", "#92400e"]);
  for (let x = -len / 2; x <= len / 2 + 0.01; x += 1) b.pivot.add(at(box(0.1, 1.05, 0.1, col), x, 0.52, 0));
  for (const y of [0.4, 0.82]) b.pivot.add(at(box(len, 0.09, 0.05, col), 0, y, 0.05));
  return b;
}
/** A waterfall: a rocky cliff, water pouring down it (moving), foam and
 * spray at the bottom, bushes and trees on top. Put a pond in front of it. */
function waterfall(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const H = optOf(o, "height", 5.5) * s;
  const b = newBuilt(4.2 * s, H + 1, hasTrait(o, "solid"));
  b.vr = 1;
  const rockC = pickOf(r, ["#8b8f97", "#9c8f80", "#7d7f86"]);
  // the cliff: big rounded rocks stacked into a wall, a gap in the middle for the water
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (1.5 + r() * 3.2) * s, y = r() * H, z = -0.6 - r() * 1.4;
    const rk = mesh(new THREE.DodecahedronGeometry((1.0 + r() * 0.8) * s, 0), shade(rockC, Math.round((r() - 0.5) * 30)), 0.03);
    rk.position.set(x, y, z);
    rk.rotation.set(r() * 3, r() * 3, r() * 3);
    rk.scale.y = 1.2;
    b.pivot.add(rk);
  }
  b.pivot.add(at(box(2.6 * s, H, 2.2 * s, shade(rockC, -25), 0.02), 0, H / 2, -1.6 * s)); // behind the water
  for (const side of [-1, 1]) {
    const top = sphere(1.3 * s, "#5fae55", 0.04, 12);
    top.scale.y = 0.55;
    top.position.set(side * 3.2 * s, H + 0.35 * s, -1.0 * s);
    b.pivot.add(top);
    sway(b, top, 0.02, r() * 6);
  }
  // falling water (its picture slides down every frame)
  const tex = drawnTexture(128, 256, (x) => {
    x.fillStyle = "#4fb3e8"; x.fillRect(0, 0, 128, 256);
    const rr = rng(11);
    for (let i = 0; i < 40; i++) {
      x.strokeStyle = rr() < 0.5 ? "rgba(255,255,255,0.75)" : "rgba(190,230,255,0.9)";
      x.lineWidth = 2 + rr() * 4;
      const xx = rr() * 128, y0 = rr() * 256;
      x.beginPath(); x.moveTo(xx, y0); x.lineTo(xx + (rr() - 0.5) * 4, y0 + 30 + rr() * 60); x.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, H / 3);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.3 * s, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.93 }));
  sheet.position.set(0, H / 2, -0.35 * s);
  b.pivot.add(sheet);
  const lip = new THREE.Mesh(new THREE.PlaneGeometry(2.3 * s, 1.6 * s), new THREE.MeshBasicMaterial({ map: tex }));
  lip.rotation.x = -Math.PI / 2; lip.position.set(0, H + 0.02, -1.15 * s);
  b.pivot.add(lip);
  // foam and spray at the bottom
  const foam: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry((0.35 + r() * 0.25) * s, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
    f.position.set((i / 8 - 0.5) * 2.4 * s, 0.1, (r() - 0.3) * 0.6 * s);
    f.scale.y = 0.6;
    b.pivot.add(f);
    foam.push(f);
  }
  b.update = (n) => {
    tex.offset.y = (n * 0.045) % 1;
    foam.forEach((f, i) => { const k = 0.8 + 0.3 * Math.sin(n * 0.35 + i * 1.7); f.scale.set(k, 0.6 * k, k); });
  };
  return b;
}

function well(o: WorldObj): Built {
  const b = newBuilt(0.75, 2.2, true);
  b.pivot.add(at(cyl(0.65, 0.7, 0.75, "#9ca3af", 0.04, 16), 0, 0.37, 0));
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), toon("#1d4ed8"));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.6;
  b.pivot.add(water);
  for (const sx of [-1, 1]) b.pivot.add(at(cyl(0.05, 0.05, 1.5, "#7c4a21"), sx * 0.62, 1.4, 0));
  const roof = mesh(new THREE.ConeGeometry(0.95, 0.6, 4), "#b91c1c", 0.03);
  roof.rotation.y = Math.PI / 4; roof.position.y = 2.35;
  b.pivot.add(roof);
  { const _o = at(cyl(0.04, 0.04, 1.3, "#7c4a21"), 0, 1.9, 0); _o.rotation.z = Math.PI / 2; b.pivot.add(_o); }
  b.pivot.add(at(cyl(0.006, 0.006, 0.6, "#d6d3d1", 0, 4), 0, 1.6, 0), at(cyl(0.13, 0.1, 0.18, "#78716c"), 0, 1.25, 0));
  return b;
}
function bench(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0.9, 0.9, hasTrait(o, "solid"));
  const col = pickOf(r, ["#a16207", "#92400e", "#7c4a21"]);
  b.pivot.add(at(box(1.8, 0.07, 0.45, col), 0, 0.45, 0), at(box(1.8, 0.35, 0.06, col), 0, 0.7, -0.22));
  for (const sx of [-0.8, 0.8]) b.pivot.add(at(box(0.07, 0.45, 0.4, "#374151"), sx, 0.22, 0));
  b.seatH = 0.48;
  return b;
}
function campfire(o: WorldObj): Built {
  const b = newBuilt(0.6, 0.8, hasTrait(o, "solid"));
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    b.pivot.add(at(sphere(0.1, k % 2 ? "#9ca3af" : "#78716c", 0.08, 8), Math.cos(a) * 0.48, 0.06, Math.sin(a) * 0.48));
  }
  for (const a of [0.3, 1.4, 2.5]) {
    const lg = cyl(0.06, 0.06, 0.75, "#7c4a21", 0.06, 8);
    lg.rotation.set(Math.PI / 2 - 0.35, a, 0);
    lg.position.y = 0.15;
    b.pivot.add(lg);
  }
  const group = new THREE.Group();
  const flames: THREE.Mesh[] = [];
  for (let k = 0; k < 4; k++) {
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.28 - k * 0.05, 0.95 - k * 0.16, 10), new THREE.MeshBasicMaterial({ color: ["#ef4444", "#f97316", "#fb923c", "#fde047"][k], transparent: true, opacity: 0.92 }));
    fl.position.set((k % 2 ? 0.06 : -0.06) * (k ? 1 : 0), 0.5 - k * 0.06, 0);
    group.add(fl);
    flames.push(fl);
  }
  const light = new THREE.PointLight(0xffa040, 10, 8, 1.4);
  light.position.y = 0.7;
  group.add(light);
  b.pivot.add(group);
  b.fire = { group, flames, light };
  return b;
}
function ladder(o: WorldObj): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.45, 2.3 * s, false);
  const H = 2.3 * s;
  // a step ladder (stands by itself): front legs with steps, back legs
  const front = new THREE.Group();
  front.rotation.x = -0.18;
  for (const sx of [-1, 1]) front.add(at(box(0.06, H, 0.06, "#b45309", 0.04), sx * 0.27, H / 2, 0));
  for (let y = 0.35; y < H - 0.1; y += 0.36) front.add(at(box(0.56, 0.05, 0.12, "#d97706", 0.04), 0, y, 0));
  front.position.z = 0.2;
  const backL = new THREE.Group();
  backL.rotation.x = 0.2;
  for (const sx of [-1, 1]) backL.add(at(box(0.05, H, 0.05, "#92400e", 0.04), sx * 0.25, H / 2, 0));
  backL.position.z = -0.25;
  b.pivot.add(front, backL);
  b.climb = { top: H - 0.75, trunkR: 0.12, ladder: true };
  return b;
}
function signpost(o: WorldObj): Built {
  const b = newBuilt(0.2, 2, false);
  b.pivot.add(at(cyl(0.05, 0.05, 1.8, "#7c4a21"), 0, 0.9, 0));
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.05), [
    toon("#a16207"), toon("#a16207"), toon("#a16207"), toon("#a16207"),
    new THREE.MeshBasicMaterial({ map: textTexture(optStr(o, "text", "JUNGLE").toUpperCase(), "#d6a96b", "#3b2a1e", 512, 176, "bold 92px Arial") }), toon("#a16207"),
  ]);
  board.position.set(0, 1.55, 0.03);
  b.pivot.add(board);
  return b;
}

// ------------------------------------------------------------------ things
function ball(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0.15, 0.3, false);
  const g = new THREE.Group();
  g.add(sphere(0.13, pickOf(r, ["#ffffff", "#ef4444", "#3b82f6", "#facc15"]), 0.08, 16));
  for (let k = 0; k < 3; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.131, 0.012, 6, 24), toon("#1f2937")); band.rotation.set(k * 1.05, k * 0.7, 0); g.add(band); }
  g.position.y = 0.13;
  b.pivot.add(g);
  b.things.push({ obj: g, kind: "ball", words: ["ball", "football"], size: 0.13, floats: true, edible: false, reach: "ground" });
  return b;
}
function basket(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0.3, 0.4, false);
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.28, 14, 1, true), "#b45309", 0.04);
  (body.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
  body.position.y = 0.14;
  g.add(body);
  for (let k = 0; k < 6; k++) g.add(at(sphere(0.07, pickOf(r, ["#dc2626", "#f59e0b", "#f97316", "#84cc16"]), 0.08, 10), Math.cos(k) * 0.12, 0.26 + (k % 2) * 0.05, Math.sin(k) * 0.12));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 20, Math.PI), toon("#92400e"));
  handle.position.y = 0.28;
  g.add(handle);
  b.pivot.add(g);
  b.things.push({ obj: g, kind: "basket", words: ["basket"], size: 0.25, floats: true, edible: false, reach: "ground" });
  return b;
}
function crate(o: WorldObj): Built {
  const b = newBuilt(0.45, 0.7, hasTrait(o, "solid"));
  const g = new THREE.Group();
  g.add(at(box(0.7, 0.7, 0.7, "#c08552", 0.03), 0, 0.35, 0));
  for (const y of [0.1, 0.6]) g.add(at(box(0.72, 0.08, 0.72, "#92400e", 0.02), 0, y, 0));
  b.pivot.add(g);
  b.seatH = 0.72;
  b.things.push({ obj: b.pivot, kind: "box", words: ["box", "crate", "chest"], size: 0.4, floats: true, edible: false, big: true });
  return b;
}
export function axeMesh(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cyl(0.022, 0.025, 0.75, "#a16207", 0.08, 6), 0, 0.37, 0));
  const head = box(0.2, 0.12, 0.035, "#9ca3af", 0.06);
  head.position.set(0.07, 0.68, 0);
  g.add(head);
  return g;
}
export function rodMesh(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cyl(0.012, 0.022, 1.7, "#78350f", 0.08, 6), 0, 0.85, 0));
  g.add(at(cyl(0.035, 0.035, 0.04, "#374151", 0.08, 8), 0, 0.25, 0.03));
  return g;
}
function axe(o: WorldObj): Built {
  const b = newBuilt(0.2, 0.8, false);
  const g = axeMesh();
  g.rotation.z = 0.35;
  b.pivot.add(g);
  b.things.push({ obj: g, kind: "axe", words: ["axe", "hatchet"], size: 0.3, floats: true, edible: false, reach: "ground" });
  return b;
}
function boat(o: WorldObj, r: () => number): Built {
  const b = newBuilt(1.1, 0.6, false);
  const col = pickOf(r, ["#b45309", "#dc2626", "#2563eb", "#f5f5f4"]);
  const hull = mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 16, 1, true, Math.PI / 2, Math.PI), col, 0.03);
  (hull.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
  hull.rotation.set(0, 0, Math.PI / 2);
  hull.scale.set(1, 1, 0.75);
  hull.position.y = 0.35;
  b.pivot.add(hull);
  b.pivot.add(at(box(0.08, 0.06, 0.75, "#78350f"), 0.4, 0.28, 0), at(box(0.08, 0.06, 0.75, "#78350f"), -0.4, 0.28, 0));
  b.seatH = 0.3;
  b.boat = true;
  if (o.opts?.rower) {
    const who = optStr(o, "who", "boatman");
    const h = buildHuman(autoHumanConfig(who, false));
    h.root.position.set(0, 0.3 + 0.04 - 0.62, 0);
    h.root.rotation.y = Math.PI / 2; // looks along the boat
    b.pivot.add(h.root);
    const oars = [-1, 1].map((sd) => {
      const g = new THREE.Group();
      g.position.set(0.05, 0.55, sd * 0.45);
      const shaft = cyl(0.02, 0.02, 1.6, "#78350f", 0.08, 6);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = sd * 0.6;
      const blade = box(0.12, 0.02, 0.35, "#a16207", 0.06);
      blade.position.z = sd * 1.35;
      g.add(shaft, blade);
      b.pivot.add(g);
      return { g, sd };
    });
    const face = { expr: "happy" as const, mouth: null, talk: 0, blink: false, look: "center" as const, tears: false, sweat: false, hold: "" as const, lie: false };
    b.rower = (n, k) => {
      const ph = n * 0.16;
      const pull = Math.sin(ph) * k;
      const j = { x: 0, y: 0.3 + 0.04 - 0.62, z: 0, yaw: Math.PI / 2, roll: 0, spine: 0.15 + pull * 0.25, spineZ: 0, headX: 0, headY: 0, headZ: 0,
        lsx: -1.3 - pull * 0.5, lsz: 0.45, lex: -0.5 - pull * 0.4, lez: 0, rsx: -1.3 - pull * 0.5, rsz: -0.45, rex: -0.5 - pull * 0.4, rez: 0,
        lhx: -1.5, lk: 1.4, rhx: -1.5, rk: 1.4 };
      h.apply(j, { ...face, blink: n % 97 < 4 }, n);
      for (const oar of oars) { oar.g.rotation.set(-oar.sd * (0.25 + Math.cos(ph) * 0.25 * k), Math.sin(ph) * 0.6 * k * oar.sd, 0); }
    };
    b.rower(0, 1);
  }
  return b;
}

/** A leafless winter tree (branches you can cut, a trunk you can climb). */
function bareTree(o: WorldObj, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.4 * s, 4.2 * s, hasTrait(o, "solid"));
  b.vr = 1.3 * s;
  const bark = pickOf(r, ["#5b4636", "#6b5444", "#4a3b30"]);
  const snowy = o.opts?.snow === true;
  b.pivot.add(at(cyl(0.16 * s, 0.24 * s, 2.8 * s, bark, 0.06, 10), 0, 1.4 * s, 0));
  const twig = (parent: THREE.Object3D, len: number, rad: number, depth: number) => {
    const n = depth > 1 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      g.position.y = len * (0.55 + i * 0.18);
      g.rotation.set((r() - 0.5) * 1.4, r() * 6, 0.5 + r() * 0.5);
      const st = cyl(rad * 0.6, rad, len * 0.7, bark, 0.08, 6);
      st.position.y = len * 0.35;
      g.add(st);
      if (snowy) { const sn = box(rad * 2.2, 0.03, rad * 2.2, "#ffffff", 0); sn.position.y = len * 0.5; g.add(sn); }
      parent.add(g);
      if (depth > 0) twig(g, len * 0.7, rad * 0.6, depth - 1);
    }
  };
  const top = at(new THREE.Group(), 0, 1.6 * s, 0);
  b.pivot.add(top);
  for (let k = 0; k < 4; k++) {
    const g = at(new THREE.Group(), 0, (k * 0.35) * s, 0);
    g.rotation.y = k * 1.7 + r();
    const arm = new THREE.Group();
    arm.rotation.z = 0.7 + r() * 0.3;
    g.add(arm);
    const st = cyl(0.05 * s, 0.09 * s, 1.2 * s, bark, 0.07, 7);
    st.position.y = 0.6 * s;
    arm.add(st);
    twig(arm, 1.1 * s, 0.05 * s, 1);
    top.add(g);
    sway(b, g, 0.03, r() * 6);
    b.branches.push({ group: g, low: k === 0, leaves: arm });
  }
  if (hasTrait(o, "climbable")) b.climb = { top: 1.2 * s, trunkR: 0.2 * s };
  return b;
}

/** Someone who lives in this world (a farmer, a boatman, a villager…). */
function person(o: WorldObj, r: () => number): Built {
  const who = optStr(o, "who", "villager");
  const h = buildHuman(autoHumanConfig(who, o.opts?.female === true));
  h.root.traverse((x) => { x.castShadow = !x.userData.outline; });
  const b = newBuilt(0.3, 1.7, false);
  b.pivot.add(h.root);
  b.person = { h, ph: r() * 6 };
  return b;
}
function bridge(o: WorldObj): Built {
  const len = optOf(o, "len", 5) * (o.scale ?? 1);
  const b = newBuilt(len / 2, 1.2, false);
  const W = 1.4;
  for (let x = -len / 2; x <= len / 2; x += 0.3) {
    const y = 0.32 * (1 - (2 * x / len) ** 2) + 0.06;
    b.pivot.add(at(box(0.26, 0.06, W, "#a16207", 0.04), x, y, 0));
  }
  for (const sz of [-1, 1]) {
    for (let x = -len / 2; x <= len / 2 + 0.01; x += len / 4) {
      const y = 0.32 * (1 - (2 * x / len) ** 2);
      b.pivot.add(at(box(0.07, 0.9, 0.07, "#78350f", 0.04), x, y + 0.45, sz * W / 2));
    }
    for (let k = 0; k < 12; k++) {
      const x0 = -len / 2 + (k / 12) * len, x1 = x0 + len / 12;
      const y0 = 0.32 * (1 - (2 * x0 / len) ** 2) + 0.85, y1 = 0.32 * (1 - (2 * x1 / len) ** 2) + 0.85;
      const rail = box(Math.hypot(x1 - x0, y1 - y0) + 0.02, 0.05, 0.05, "#92400e", 0.04);
      rail.position.set((x0 + x1) / 2, (y0 + y1) / 2, sz * W / 2);
      rail.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      b.pivot.add(rail);
    }
  }
  b.bridge = { len, width: W };
  return b;
}

/** A few fruits lying ready (a mango to eat on the platform…). */
function fruits(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0.3, 0.2, false);
  const kind = optStr(o, "kind", "mango").toLowerCase();
  const info = Object.values(FRUIT_OF).find((f) => f.kind === kind) ?? { kind, color: pickOf(r, ["#f59e0b", "#dc2626", "#84cc16"]), r: 0.08 };
  const n = Math.max(1, Math.min(8, Math.round(optOf(o, "count", 3))));
  for (let k = 0; k < n; k++) {
    const f = fruit(info.kind, info.color, info.r, (info as { long?: number }).long ?? 1);
    f.rotation.z = Math.PI / 2;
    f.position.set((k - (n - 1) / 2) * info.r * 2.4, info.r, (r() - 0.5) * 0.1);
    b.pivot.add(f);
    b.things.push({ obj: f, kind: info.kind, words: [info.kind, info.kind + "s", "fruit"], size: info.r, floats: true, edible: true, reach: "ground" });
  }
  return b;
}

/** Any other thing a script talks about (a phone, a treasure, a gift…):
 * shown with its picture from the Asset Library (filled in by the player). */
function item(o: WorldObj): Built {
  const size = optOf(o, "size", 0.42) * (o.scale ?? 1);
  const b = newBuilt(Math.max(0.2, size * 0.4), size, size > 1.2 && hasTrait(o, "solid"));
  const word = optStr(o, "word", "gift").toLowerCase();
  const g = new THREE.Group();
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, color: 0xffffff }));
  sp.visible = false; // until its picture arrives (no white squares)
  sp.center.set(0.5, 0.1);
  sp.scale.set(size, size, 1);
  sp.userData.iconWord = word;
  g.add(sp);
  b.pivot.add(g);
  if (size <= 1.2 && hasTrait(o, "pickable")) b.things.push({ obj: g, kind: word, words: [word, word + "s"], size: size * 0.43, floats: true, edible: o.opts?.edible === true, reach: "ground" });
  return b;
}

// -------------------------------------------------------------------- life
function birds(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0, 8, false);
  const n = Math.round(optOf(o, "count", 5));
  const list: { g: THREE.Group; wl: THREE.Object3D; wr: THREE.Object3D; ph: number; rad: number; h: number; sp: number }[] = [];
  for (let k = 0; k < n; k++) {
    const g = new THREE.Group();
    const col = pickOf(r, ["#1f2937", "#f8fafc", "#3b82f6", "#ef4444"]);
    const body = sphere(0.09, col, 0.08, 8);
    body.scale.set(0.8, 0.8, 1.6);
    g.add(body);
    const wl = new THREE.Group(), wr = new THREE.Group();
    for (const [w, sx] of [[wl, 1], [wr, -1]] as const) {
      const wing = box(0.26, 0.015, 0.12, col, 0.06);
      wing.position.x = sx * 0.13;
      w.add(wing);
      g.add(w);
    }
    list.push({ g, wl, wr, ph: r() * 6, rad: 4 + r() * 6, h: 5 + r() * 4, sp: 0.006 + r() * 0.006 });
    b.pivot.add(g);
  }
  b.update = (t) => {
    for (const x of list) {
      const a = x.ph + t * x.sp;
      x.g.position.set(Math.cos(a) * x.rad, x.h + Math.sin(t / 30 + x.ph) * 0.4, Math.sin(a) * x.rad * 0.6);
      x.g.rotation.y = -a;
      const f = Math.sin(t * 0.9 + x.ph) * 0.7;
      x.wl.rotation.z = f; x.wr.rotation.z = -f;
    }
  };
  return b;
}
function butterflies(o: WorldObj, r: () => number): Built {
  const b = newBuilt(0, 1.5, false);
  const n = Math.round(optOf(o, "count", 4));
  const list: { g: THREE.Group; wl: THREE.Object3D; wr: THREE.Object3D; ph: number }[] = [];
  for (let k = 0; k < n; k++) {
    const g = new THREE.Group();
    const col = pickOf(r, ["#f472b6", "#facc15", "#60a5fa", "#fb923c", "#a78bfa"]);
    const wl = new THREE.Group(), wr = new THREE.Group();
    for (const [w, sx] of [[wl, 1], [wr, -1]] as const) {
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      wing.position.x = sx * 0.06;
      wing.rotation.x = -Math.PI / 2;
      w.add(wing);
      g.add(w);
    }
    g.add(cyl(0.008, 0.008, 0.08, "#1f2937", 0, 4));
    g.children[g.children.length - 1]!.rotation.x = Math.PI / 2;
    list.push({ g, wl, wr, ph: r() * 6 });
    b.pivot.add(g);
  }
  b.update = (t) => {
    for (const x of list) {
      const a = t / 70 + x.ph;
      x.g.position.set(Math.sin(a * 1.3) * 1.6 + Math.sin(a * 3.1) * 0.3, 0.7 + Math.sin(a * 2.3) * 0.4, Math.cos(a) * 1.2);
      x.g.rotation.y = a * 2;
      const f = Math.sin(t * 1.4 + x.ph) * 1.1;
      x.wl.rotation.z = f; x.wr.rotation.z = -f;
    }
  };
  return b;
}
function animal(o: WorldObj, r: () => number): Built {
  const name = optStr(o, "species", "cow");
  const sp = speciesFor(name) ?? madeUpSpecies(name);
  const a: Creature3D = buildAnimal(sp);
  const b = newBuilt(0.6, a.height, false);
  b.pivot.add(a.root);
  b.creature = a;
  const ph = r() * 6, rad = optOf(o, "radius", 2.5);
  const wander = hasTrait(o, "wander");
  b.update = (t) => {
    // walk a while, stop a while (eating grass), walk again
    const cyc = (t + ph * 100) % 400;
    const walking = wander && cyc < 220;
    const k = wander ? (Math.floor((t + ph * 100) / 400) * 220 + Math.min(cyc, 220)) / 260 : 0;
    const x = Math.sin(k + ph) * rad, z = Math.sin(k * 1.7 + ph) * rad * 0.5;
    const dx = Math.cos(k + ph) * rad, dz = Math.cos(k * 1.7 + ph) * rad * 0.85;
    a.root.position.set(x, 0, z);
    if (walking) a.root.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    a.animate({ n: t, walking, talk: 0, blink: t % 97 < 4, expr: "happy" });
  };
  return b;
}

// ------------------------------------------------------------------- water
function water(o: WorldObj): Built {
  const b = newBuilt(0, 0, false);
  if (o.type === "river" || o.type === "path") b.water = { kind: o.type, pts: o.points ?? [[-30, -6], [30, -6]], width: optOf(o, "width", o.type === "path" ? 1.6 : 3.2) };
  else b.water = { kind: "pond", radius: optOf(o, "radius", 3.2) * (o.scale ?? 1) };
  return b;
}

// ------------------------------------------------------- designed things
const deg = (v: number | undefined) => ((v ?? 0) * Math.PI) / 180;
const nums = (a: unknown, n: number, d: number[]): number[] => {
  const out = Array.isArray(a) ? a.slice(0, n).map((x) => (typeof x === "number" && Number.isFinite(x) ? x : 0)) : [];
  while (out.length < n) out.push(d[out.length] ?? 0);
  return out;
};
const lim = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function colorOf(c: unknown, d: string): string { return typeof c === "string" && /^#?[0-9a-fA-F]{3,8}$|^[a-z]+$/.test(c) ? (c.startsWith("#") || /^[a-z]+$/.test(c) ? c : "#" + c) : d; }

/** Build any object the AI designed from simple shapes. */
export function buildModel(o: WorldObj, def: ModelDef | undefined, r: () => number): Built {
  const s = o.scale ?? 1;
  const b = newBuilt(0.5, 1, false);
  if (!def || !Array.isArray(def.parts) || !def.parts.length) {
    b.pivot.add(at(box(0.6, 0.6, 0.6, "#a3a3a3"), 0, 0.3, 0));
    return b;
  }
  const g = new THREE.Group();
  g.scale.setScalar(s);
  b.pivot.add(g);
  const has = (t: string) => (o.traits && t in o.traits && o.traits[t] === false ? false : !!def.abilities?.includes(t) || !!o.traits?.[t]);
  b.abilities = [...(def.abilities ?? [])];
  b.wheels = []; b.smokes = [];
  for (const p of def.parts.slice(0, 160) as ModelPart[]) {
    const col = colorOf(p.color, "#9ca3af");
    let m: THREE.Object3D;
    const out = p.glass || p.glow || p.shape === "plane" || p.shape === "text" ? 0 : 0.03;
    if (p.shape === "box") { const [w, h, d] = nums(p.size, 3, [1, 1, 1]); m = box(lim(w!, 0.01, 200), lim(h!, 0.01, 60), lim(d!, 0.01, 200), col, out); }
    else if (p.shape === "cylinder") m = cyl(lim(p.radiusTop ?? p.radius ?? 0.3, 0.005, 40), lim(p.radius ?? 0.3, 0.005, 40), lim(p.height ?? 1, 0.01, 80), col, out, 18);
    else if (p.shape === "sphere") m = sphere(lim(p.radius ?? 0.4, 0.01, 40), col, out, 16);
    else if (p.shape === "cone") m = cone(lim(p.radius ?? 0.5, 0.01, 40), lim(p.height ?? 1, 0.01, 80), col, out, 16);
    else if (p.shape === "torus") m = mesh(new THREE.TorusGeometry(lim(p.radius ?? 0.5, 0.02, 40), lim(p.tube ?? 0.08, 0.005, 10), 10, 28), col, out);
    else if (p.shape === "text") {
      const [w, h] = nums(p.size, 2, [2, 0.6]);
      const t = String(p.text ?? "").slice(0, 40) || " ";
      m = new THREE.Mesh(new THREE.PlaneGeometry(lim(w!, 0.1, 60), lim(h!, 0.05, 20)),
        new THREE.MeshBasicMaterial({ map: textTexture(t, colorOf(p.color, "#ffffff"), colorOf(p.textColor, "#111827"), 1024, Math.max(64, Math.round(1024 * h! / w!)), `bold ${Math.round(Math.min(220, 1024 * h! / w! * 0.62))}px Arial`), side: THREE.DoubleSide }));
    } else { const [w, h] = nums(p.size, 2, [1, 1]); m = new THREE.Mesh(new THREE.PlaneGeometry(lim(w!, 0.01, 200), lim(h!, 0.01, 200)), toon(col)); ((m as THREE.Mesh).material as THREE.Material).side = THREE.DoubleSide; }
    if (p.glass) { const mm = (m as THREE.Mesh).material as THREE.MeshToonMaterial; (m as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: mm.color ?? col, transparent: true, opacity: 0.45, depthWrite: false }); }
    if (p.glow) (m as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: col });
    const [x, y, z] = nums(p.pos, 3, [0, 0.5, 0]);
    let [rx, ry, rz] = nums(p.rot, 3, [0, 0, 0]);
    // a wheel the AI forgot to stand up (a cylinder lies flat by default): stand it up, facing sideways
    if (p.wheel && p.shape === "cylinder" && !rx && !rz) rx = 90;
    if (p.door) {
      // hinge on the door's left edge, so it swings
      const w = (nums(p.size, 3, [0.9, 2, 0.06])[0] ?? 0.9);
      const hinge = new THREE.Group();
      hinge.position.set(x! - w / 2, y!, z!);
      hinge.rotation.set(deg(rx), deg(ry), deg(rz));
      m.position.set(w / 2, 0, 0);
      hinge.add(m);
      g.add(hinge);
      const front = new THREE.Vector3(x!, 0, z! + 0.85);
      b.door = { pivot: hinge, front: front.multiplyScalar(s), inside: new THREE.Vector3(x! * s, 0, (z! - 1.2) * s) };
      continue;
    }
    m.position.set(x!, y!, z!);
    m.rotation.set(deg(rx), deg(ry), deg(rz));
    g.add(m);
    if (p.wheel) b.wheels.push({ o: m, q: m.quaternion.clone(), r: Math.max(0.05, (p.radius ?? 0.4) * s) });
    if (p.smoke) b.smokes.push(m);
    if (p.sway) sway(b, m, 0.12, r() * 6);
    if (p.spin) { const sp = p.spin, q0 = m.quaternion.clone(); b.update = ((prev) => (n: number, w: number) => { prev?.(n, w); m.quaternion.copy(q0).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (n / 24) * sp * Math.PI * 2)); })(b.update); }
  }
  // people behind the windows (a train / bus full of passengers)
  if (o.opts?.passengers) {
    const SK = ["#f1c9a5", "#d9a066", "#a8714a", "#fde7d1", "#8d5a3b"], HAIR = ["#1b1b1b", "#5b3a1e", "#3f3f46", "#8b5a2b"];
    let k = 0;
    for (const p of def.parts as ModelPart[]) {
      if (!p.glass || !Array.isArray(p.pos) || (p.pos[2] ?? 0) <= 0.3 || (p.size?.[1] ?? 1) < 0.4) continue;
      const [px, py, pz] = p.pos as number[];
      const head = sphere(0.17, SK[k % SK.length]!, 0.05, 12);
      head.position.set(px!, py! - 0.12, pz! - 0.45);
      const hair = sphere(0.18, HAIR[k % HAIR.length]!, 0.04, 12);
      hair.scale.set(1, 0.55, 1); hair.position.set(px!, py! - 0.02, pz! - 0.47);
      const body = box(0.42, 0.4, 0.3, ["#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#7c3aed"][k % 5]!, 0.02);
      body.position.set(px!, py! - 0.48, pz! - 0.45);
      g.add(head, hair, body);
      k++;
    }
  }
  // centre it on its own base: the AI sometimes writes world positions
  // (z = -7.5…) inside the model — the world decides where it stands
  g.updateMatrixWorld(true);
  const raw = new THREE.Box3().setFromObject(g);
  const rc = raw.getCenter(new THREE.Vector3());
  g.position.set(-rc.x, -raw.min.y, -rc.z);
  if (b.door) { b.door.front.x -= rc.x; b.door.front.z -= rc.z; b.door.inside.x -= rc.x; b.door.inside.z -= rc.z; }
  // size, seat, climb, floor
  g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(g);
  const sz = bb.getSize(new THREE.Vector3());
  b.height = Math.max(0.2, bb.max.y);
  b.radius = Math.max(0.3, Math.min(Math.max(sz.x, sz.z) / 2, 3));
  b.vr = b.height > 1.3 ? Math.min(Math.max(sz.x, sz.z) / 2, 4) : 0.01;
  b.length = sz.x;
  b.solid = has("solid") && Math.max(sz.x, sz.z) < 7;
  if (has("sittable")) b.seatH = def.seat_height ?? Math.min(1.2, b.height);
  if (has("climbable")) b.climb = { top: Math.max(0.5, (def.climb_height ?? b.height) - 1.0), trunkR: Math.min(0.6, sz.z / 2), ladder: true };
  if (def.floor && (b.height < 1.6 || def.label === "ground")) { const c = bb.getCenter(new THREE.Vector3()); b.floorTop = { w: sz.x, d: sz.z, h: bb.max.y, cx: c.x, cz: c.z }; }
  if (has("enterable") && !b.door) { b.flap = true; b.door = { pivot: new THREE.Group(), front: new THREE.Vector3(0, 0, bb.max.z + 0.8), inside: new THREE.Vector3(0, 0, (bb.min.z + bb.max.z) / 2) }; }
  if (has("pickable") && b.height < 1.2 && Math.max(sz.x, sz.z) < 1.5) {
    b.things.push({ obj: b.pivot, kind: o.opts?.model as string ?? "thing", words: [String(o.opts?.model ?? "thing"), String(def.label ?? "")].filter(Boolean), size: Math.max(sz.x, sz.y, sz.z) / 2, floats: true, edible: has("eatable"), big: b.height > 0.6, reach: "ground" });
  }
  return b;
}

const BUILDERS: Record<string, (o: WorldObj, r: () => number, jungle: boolean) => Built> = {
  mango_tree: fruitTree, apple_tree: fruitTree, orange_tree: fruitTree, big_tree: fruitTree,
  pine_tree: pineTree, palm_tree: palmTree, banana_plant: bananaPlant,
  bush: (o, r) => bush(o, r, false), berry_bush: (o, r) => bush(o, r, true),
  flowers, tall_grass: tallGrass, mushroom: mushrooms,
  rock, stones, log, stump: (o) => stump(o), hill: (o) => hill(o),
  hut, house, tent, fence, well: (o) => well(o), waterfall, bench, campfire: (o) => campfire(o), ladder: (o) => ladder(o), signpost: (o) => signpost(o),
  ball, basket, fruit: fruits, crate: (o) => crate(o), axe: (o) => axe(o), boat, item: (o) => item(o),
  bridge: (o) => bridge(o), birds, butterflies, animal, bare_tree: bareTree, person,
  river: (o) => water(o), pond: (o) => water(o), path: (o) => water(o),
};

/** Build one world object (or null for an unknown type). */
/** Kenney vehicles are long along z; ours lead along +x. */
const KIT_FRONT = Math.PI / 2;
/** A ready-made model (Kenney kit): real size, our cartoon look. */
function kitObj(o: WorldObj): Built {
  const id = String(o.opts?.kit ?? "");
  const info = kitInfo(id);
  const k = (o.scale ?? 1) * optOf(o, "size", 1);
  const cat = info?.cat ?? "prop";
  const veh = cat === "vehicle";
  const w = ((veh ? info?.d : info?.w) ?? 1) * k, h = (info?.h ?? 1) * k, d = ((veh ? info?.w : info?.d) ?? 1) * k;
  const big = cat === "building" || cat === "vehicle" || (cat === "rock" && h > 1.2) || (cat === "furniture" && h > 1.4);
  const b = newBuilt(Math.max(0.15, Math.min(w, d) / 2), Math.max(0.05, h), (hasTrait(o, "solid") || big) && cat !== "road");
  const inst = kitInstance(id, optStr(o, "tint", "") || undefined);
  if (inst) {
    inst.scale.multiplyScalar(k);
    if (cat === "vehicle") inst.rotation.y = KIT_FRONT; // like our own vehicles: the front leads along +x
    b.pivot.add(inst);
  } else {
    // not loaded (offline): a plain block of the same size keeps the layout
    const m = box(w, h, d, cat === "tree" || cat === "plant" ? "#5fae55" : cat === "road" ? "#555b66" : "#cfc8bd", 0.02);
    m.position.y = h / 2;
    b.pivot.add(m);
  }
  b.radius = cat === "tree" ? Math.max(0.2, Math.min(w, d) * 0.12) : Math.max(0.15, Math.min(Math.min(w, d) / 2, 4));
  b.vr = h > 1.3 ? Math.min(Math.max(w, d) / 2, 6) : 0.01;
  b.length = w;
  b.abilities = [];
  if (cat === "furniture" && /chair|sofa|bench|stool|seat|couch/.test(info?.words ?? "")) { b.seatH = Math.min(0.55, h * 0.5); b.abilities.push("sittable"); }
  if (cat === "road" || (cat === "furniture" && /rug|floor/.test(id))) b.solid = false;
  if ((cat === "food" || (cat === "prop" && h < 0.8 && w < 1 && d < 1)) && o.traits?.pickable !== false) {
    b.things.push({ obj: b.pivot, kind: id.split("/")[1]!, words: (info?.words ?? id).split(" "), size: Math.max(w, h, d) / 2, floats: true, edible: cat === "food", reach: "ground" });
    b.abilities.push("pickable");
    if (cat === "food") b.abilities.push("eatable");
  }
  if (cat === "building" && o.opts?.door !== false) {
    b.abilities.push("enterable");
    b.flap = true;
    b.door = { pivot: new THREE.Group(), front: new THREE.Vector3(0, 0, d / 2 + 0.8), inside: new THREE.Vector3(0, 0, 0) };
  }
  if (cat === "tree") b.abilities.push("hide_behind");
  b.abilities.push(cat);
  return b;
}

export function buildObject(o: WorldObj, r: () => number, jungle = false, models?: Record<string, ModelDef>): Built | null {
  if (o.type === "kit") {
    const b = kitObj(o);
    b.root.userData.objId = o.id;
    return b;
  }
  if (o.type === "model") {
    const nm = String(o.opts?.model ?? "");
    let def = models?.[nm];
    // a ready-made thing of the same name knows more (a train you can get into)
    const st = starterFor(nm, true);
    if (def && st && st.abilities) def = { ...def, abilities: [...new Set([...(def.abilities ?? []), ...st.abilities])] };
    const b = buildModel(o, def ?? st ?? undefined, r);
    b.root.userData.objId = o.id;
    return b;
  }
  const f = BUILDERS[o.type];
  if (!f) return null;
  const b = f(o, r, jungle);
  b.root.userData.objId = o.id;
  return b;
}
