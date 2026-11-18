/**
 * Story Animator 3D — every place as a real 3D set: sky, ground, light,
 * buildings, trees, rooms with walls, windows, doors and furniture. The
 * same place names as the 2D tool (park, classroom, jungle, cave, inside a
 * bus…); each video picks its own colours / time of day / layout from the
 * scene's seed, so no two videos look the same.
 *
 * Characters stand on the line z = 0, x from -span/2 to +span/2; the camera
 * looks from +z. Sets are built behind (z < 0) and around that line.
 */
import * as THREE from "three";
import type { EnvLayout } from "../environment";
import { at, box, cone, cyl, drawnTexture, INK, mesh, pickOf, rng, shade, sphere, textTexture, toon } from "./kit";
import { SEAT_H } from "./human";

export type PlaceLight = {
  skyTop: string; skyBottom: string; fog: string; fogNear: number; fogFar: number;
  hemiSky: string; hemiGround: string; hemi: number;
  sun: string; sunI: number; sunPos: [number, number, number]; night: boolean; indoor: boolean;
};
export type Place = {
  group: THREE.Group;
  light: PlaceLight;
  update: (n: number) => void;
  /** Where people sit / lie (world y of the seat top, bed top). */
  seatY: number;
  bedY: number;
};

const WALLS = ["#f6e7d2", "#e3f0e6", "#e6eefb", "#fbe3e8", "#f3ead0", "#ece4f7", "#fff2cc", "#e0f2f1"];
const FLOORS = ["#c99a6b", "#b98b5e", "#a8744f", "#c4ab84", "#9aa7b4", "#d6c2a3"];
const ACCENTS = ["#e07a5f", "#3d84c6", "#81b29a", "#f2cc8f", "#9b8bd4", "#e76f51", "#2a9d8f", "#c0392b"];
const LEAVES = ["#6fbf5a", "#5fae55", "#7cc36b", "#4caf50", "#8bcf74"];

export type Ctx = { g: THREE.Group; r: () => number; span: number; seed: number; updates: ((n: number) => void)[] };

// ------------------------------------------------------------- outdoors
export function ground(c: Ctx, color: string, size = 120) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), toon(color));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  c.g.add(m);
  return m;
}
export function skyDome(c: Ctx, top: string, bottom: string) {
  const geo = new THREE.SphereGeometry(140, 32, 16);
  const colors: number[] = [];
  const t = new THREE.Color(top), b = new THREE.Color(bottom), tmp = new THREE.Color();
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(0, Math.min(1, pos.getY(i) / 80));
    tmp.copy(b).lerp(t, k);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  c.g.add(m);
}
export function sunMoon(c: Ctx, color: string, night: boolean) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(night ? 4 : 6, 20, 16), new THREE.MeshBasicMaterial({ color, fog: false }));
  m.position.set((c.r() - 0.5) * 80, 45, -110);
  c.g.add(m);
  if (night) {
    const pts: number[] = [];
    for (let i = 0; i < 400; i++) {
      const a = c.r() * Math.PI * 2, e = 0.15 + c.r() * 1.2;
      pts.push(Math.cos(a) * Math.cos(e) * 130, Math.sin(e) * 130, Math.sin(a) * Math.cos(e) * 130);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    c.g.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, fog: false })));
  }
}
export function clouds(c: Ctx, n: number) {
  for (let i = 0; i < n; i++) {
    const cl = new THREE.Group();
    for (let k = 0; k < 5; k++) cl.add(at(sphere(1.6 + c.r() * 1.4, "#ffffff", 0, 12), k * 1.8 - 3.6, Math.sin(k) * 0.8, c.r()));
    cl.position.set((c.r() - 0.5) * 120, 22 + c.r() * 14, -60 - c.r() * 40);
    c.g.add(cl);
    const speed = 0.01 + c.r() * 0.02;
    const x0 = cl.position.x;
    c.updates.push((n2) => { cl.position.x = ((x0 + n2 * speed + 70) % 140) - 70; });
  }
}
export function tree(c: Ctx, x: number, z: number, s = 1, leaf?: string) {
  const t = new THREE.Group();
  t.add(at(cyl(0.18 * s, 0.26 * s, 2.2 * s, "#8b5a2b"), 0, 1.1 * s, 0));
  const lc = leaf ?? pickOf(c.r, LEAVES);
  t.add(at(sphere(1.25 * s, lc, 0.04, 14), 0, 2.9 * s, 0));
  t.add(at(sphere(0.9 * s, shade(lc, 15), 0.05, 12), 0.8 * s, 2.4 * s, 0.2));
  t.add(at(sphere(0.9 * s, shade(lc, -15), 0.05, 12), -0.8 * s, 2.5 * s, -0.2));
  t.position.set(x, 0, z);
  t.rotation.y = c.r() * 6;
  c.g.add(t);
  return t;
}
export function pine(c: Ctx, x: number, z: number, s = 1, snowy = false) {
  const t = new THREE.Group();
  t.add(at(cyl(0.15 * s, 0.2 * s, 0.8 * s, "#7c4f2c"), 0, 0.4 * s, 0));
  for (let k = 0; k < 3; k++) {
    t.add(at(cone((1.3 - k * 0.3) * s, 1.5 * s, "#2f7d4a", 0.03, 10), 0, (1.3 + k * 0.85) * s, 0));
    if (snowy) t.add(at(cone((0.55 - k * 0.12) * s, 0.6 * s, "#ffffff", 0, 10), 0, (1.8 + k * 0.85) * s, 0));
  }
  t.position.set(x, 0, z);
  c.g.add(t);
}
export function palm(c: Ctx, x: number, z: number, s = 1) {
  const t = new THREE.Group();
  let y = 0, px = 0;
  for (let k = 0; k < 6; k++) { t.add(at(cyl(0.16 * s, 0.2 * s, 0.6 * s, "#a0704a"), px, y + 0.3 * s, 0)); y += 0.55 * s; px += 0.06 * s; }
  for (let k = 0; k < 7; k++) {
    const leaf = mesh(new THREE.SphereGeometry(1, 12, 8), "#3f9d4a", 0.04);
    leaf.scale.set(1.5 * s, 0.12 * s, 0.4 * s);
    const a = (k / 7) * Math.PI * 2;
    leaf.position.set(px + Math.cos(a) * 1.1 * s, y + 0.1 * s - 0.2 * s, Math.sin(a) * 1.1 * s);
    leaf.rotation.set(0, -a, -0.35);
    t.add(leaf);
  }
  t.add(at(sphere(0.18 * s, "#7c4f2c", 0.06, 8), px + 0.15 * s, y - 0.15 * s, 0.1));
  t.position.set(x, 0, z);
  c.g.add(t);
}
export function bush(c: Ctx, x: number, z: number, s = 1) {
  const lc = pickOf(c.r, LEAVES);
  for (let k = 0; k < 3; k++) c.g.add(at(sphere((0.45 + c.r() * 0.2) * s, lc, 0.05, 12), x + (k - 1) * 0.45 * s, 0.35 * s, z + c.r() * 0.2));
}
export function rock(c: Ctx, x: number, z: number, s = 1, col = "#9ca3af") {
  const m = mesh(new THREE.DodecahedronGeometry(0.6 * s, 0), col, 0.04);
  m.scale.set(1.3, 0.7, 1);
  m.position.set(x, 0.3 * s, z);
  m.rotation.y = c.r() * 6;
  c.g.add(m);
}
export function flowers(c: Ctx, n: number, zMin: number, zMax: number) {
  for (let i = 0; i < n; i++) {
    const x = (c.r() - 0.5) * c.span * 2, z = zMin + c.r() * (zMax - zMin);
    c.g.add(at(cyl(0.015, 0.015, 0.3, "#4d7c0f", 0), x, 0.15, z));
    c.g.add(at(sphere(0.07, pickOf(c.r, ["#ef4444", "#f59e0b", "#ec4899", "#a855f7", "#ffffff"]), 0.1, 8), x, 0.32, z));
  }
}
function lampPost(c: Ctx, x: number, z: number) {
  c.g.add(at(cyl(0.06, 0.08, 3.6, "#374151"), x, 1.8, z));
  c.g.add(at(sphere(0.25, "#fde68a", 0.06, 12), x, 3.7, z));
}
function building(c: Ctx, x: number, z: number, w: number, h: number, color: string, signText?: string) {
  const b = new THREE.Group();
  b.add(at(box(w, h, 3, color), 0, h / 2, 0));
  const lit = c.r() < 0.5;
  for (let y = 1.6; y < h - 0.8; y += 1.4) for (const dx of [-w * 0.28, w * 0.28]) b.add(at(box(0.8, 0.8, 0.05, lit ? "#fde68a" : "#cfe8ff", 0.02), dx, y + 0.6, 1.52));
  b.add(at(box(0.9, 1.6, 0.05, "#8b5a2b"), 0, 0.8, 1.52));
  if (signText) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 0.5), new THREE.MeshBasicMaterial({ map: textTexture(signText, "#ffffff", "#1f2937") }));
    s.position.set(0, 2.05, 1.6);
    b.add(s);
    const aw = box(w * 0.9, 0.12, 0.8, pickOf(c.r, ["#e74c3c", "#2a9d8f", "#f59e0b", "#3b82f6"]));
    aw.position.set(0, 1.75, 1.9);
    aw.rotation.x = 0.35;
    b.add(aw);
  }
  b.position.set(x, 0, z);
  c.g.add(b);
}
export function house(c: Ctx, x: number, z: number) {
  const w = 3 + c.r(), h = 2.4 + c.r() * 0.8, col = pickOf(c.r, ["#f4c27a", "#e9967a", "#a8c8e8", "#c9a7e0", "#9fd3b0", "#f0b6c8"]);
  const g = new THREE.Group();
  g.add(at(box(w, h, 3, col), 0, h / 2, 0));
  const roof = mesh(new THREE.ConeGeometry(w * 0.78, 1.4, 4), pickOf(c.r, ["#b45309", "#7c2d12", "#475569", "#991b1b"]), 0.03);
  roof.position.y = h + 0.7;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.75;
  g.add(roof);
  g.add(at(box(0.8, 1.4, 0.05, "#8b5a2b"), 0, 0.7, 1.52));
  for (const dx of [-w * 0.3, w * 0.3]) g.add(at(box(0.7, 0.6, 0.05, "#cfe8ff"), dx, h * 0.62, 1.52));
  g.position.set(x, 0, z);
  c.g.add(g);
}
function fence(c: Ctx, z: number, col = "#f5f5f4") {
  for (let x = -c.span * 1.5; x < c.span * 1.5; x += 0.45) c.g.add(at(box(0.12, 0.9, 0.06, col, 0.04), x, 0.45, z));
  for (const y of [0.35, 0.7]) c.g.add(at(box(c.span * 3, 0.1, 0.05, col, 0.02), 0, y, z + 0.05));
}
export function mountains(c: Ctx, col: string, snow: boolean) {
  for (let i = 0; i < 7; i++) {
    const h = 14 + c.r() * 14, r = 12 + c.r() * 8, x = (i - 3) * 16 + (c.r() - 0.5) * 8;
    c.g.add(at(cone(r, h, col, 0, 7), x, h / 2, -60 - c.r() * 15));
    if (snow) c.g.add(at(cone(r * 0.32, h * 0.32, "#ffffff", 0, 7), x, h * 0.84 + 0.1, -60 + 0.1));
  }
}
function waterPlane(c: Ctx, z: number, color: string) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(200, 60, 40, 10), toon(color));
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, 0.05, z - 30);
  c.g.add(m);
  const pos = m.geometry.getAttribute("position");
  c.updates.push((n) => {
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 0.4 + n * 0.08) * 0.12 + Math.cos(pos.getY(i) * 0.5 + n * 0.05) * 0.1);
    pos.needsUpdate = true;
  });
}
function cactus(c: Ctx, x: number, z: number, s = 1) {
  const g = new THREE.Group();
  g.add(at(cyl(0.25 * s, 0.28 * s, 2.4 * s, "#4d9e55"), 0, 1.2 * s, 0));
  const arm = (side: number, y: number) => {
    { const _o = at(cyl(0.16 * s, 0.16 * s, 0.6 * s, "#4d9e55"), side * 0.45 * s, y, 0); _o.rotation.z = Math.PI / 2; g.add(_o); }
    g.add(at(cyl(0.16 * s, 0.16 * s, 0.8 * s, "#4d9e55"), side * 0.7 * s, y + 0.35 * s, 0));
  };
  arm(1, 1.1 * s);
  arm(-1, 1.5 * s);
  g.position.set(x, 0, z);
  c.g.add(g);
}

// --------------------------------------------------------------- indoors
function room(c: Ctx, wall: string, floor: string, opts: { depth?: number; height?: number } = {}) {
  const w = c.span * 2.6, d = opts.depth ?? 7, h = opts.height ?? 9;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d + 6), toon(floor));
  fl.rotation.x = -Math.PI / 2;
  fl.position.z = -d / 2 + 3;
  fl.receiveShadow = true;
  c.g.add(fl);
  // floor boards
  for (let z = -d + 0.5; z < 5; z += 0.8) c.g.add(at(box(w, 0.005, 0.02, shade(floor, -18), 0), 0, 0.003, z));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon(wall));
  back.position.set(0, h / 2, -d / 2 - 0.5);
  back.receiveShadow = true;
  c.g.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(d + 4, h), toon(shade(wall, -12)));
    side.position.set(s * w / 2, h / 2, -0.5);
    side.rotation.y = -s * Math.PI / 2;
    c.g.add(side);
  }
  c.g.add(at(box(w, 0.18, 0.06, "#ffffff", 0.02), 0, 0.09, -d / 2 - 0.47));
  return { backZ: -d / 2 - 0.5, h };
}
function windowOn(c: Ctx, x: number, y: number, z: number, w = 1.6, h = 1.2, curtains = true) {
  c.g.add(at(box(w + 0.16, h + 0.16, 0.06, "#ffffff"), x, y, z + 0.02));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: "#cfe8ff" }));
  glass.position.set(x, y, z + 0.06);
  c.g.add(glass);
  c.g.add(at(box(0.05, h, 0.04, "#ffffff", 0), x, y, z + 0.08), at(box(w, 0.05, 0.04, "#ffffff", 0), x, y, z + 0.08));
  if (curtains) {
    const cc = pickOf(c.r, ACCENTS);
    for (const s of [-1, 1]) c.g.add(at(box(0.45, h + 0.5, 0.08, cc, 0.03), x + s * (w / 2 + 0.1), y - 0.1, z + 0.12));
  }
}
function door(c: Ctx, x: number, z: number, col?: string) {
  const dc = col ?? pickOf(c.r, ["#a0704a", "#8b5e3c", "#5b84b1", "#b15b5b", "#2a9d8f"]);
  c.g.add(at(box(1.2, 2.3, 0.08, "#e7d3b5"), x, 1.15, z + 0.02));
  c.g.add(at(box(1.0, 2.15, 0.1, dc), x, 1.08, z + 0.06));
  c.g.add(at(sphere(0.06, "#fbbf24", 0.1, 8), x + 0.38, 1.05, z + 0.14));
}
function poster(c: Ctx, x: number, y: number, z: number) {
  const w = 0.7 + c.r() * 0.4, h = 0.9 + c.r() * 0.3;
  c.g.add(at(box(w + 0.1, h + 0.1, 0.04, "#d9a066"), x, y, z + 0.02));
  const col = pickOf(c.r, ACCENTS);
  const t = drawnTexture(128, 160, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, 128, 160);
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(64, 60, 30, 0, Math.PI * 2); g.fill();
    g.fillRect(24, 110, 80, 10); g.fillRect(34, 128, 60, 8);
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  p.position.set(x, y, z + 0.05);
  c.g.add(p);
}
function wallClock(c: Ctx, x: number, y: number, z: number) {
  const cl = cyl(0.3, 0.3, 0.06, "#ffffff", 0.06, 24);
  cl.rotation.x = Math.PI / 2;
  cl.position.set(x, y, z + 0.04);
  c.g.add(cl);
  const hand = box(0.03, 0.22, 0.02, INK, 0);
  hand.geometry.translate(0, 0.11, 0);
  hand.position.set(x, y, z + 0.09);
  c.g.add(hand);
  c.updates.push((n) => { hand.rotation.z = -n * 0.02; });
}
function bookshelf(c: Ctx, x: number, z: number) {
  const g = new THREE.Group();
  g.add(at(box(1.4, 2.4, 0.45, "#a0704a"), 0, 1.2, 0));
  for (let row = 0; row < 4; row++) {
    const y = 0.35 + row * 0.55;
    g.add(at(box(1.3, 0.05, 0.42, "#7c4f2c", 0), 0, y - 0.05, 0.03));
    for (let bx = -0.58; bx < 0.55; bx += 0.12) {
      const h = 0.3 + c.r() * 0.15;
      g.add(at(box(0.1, h, 0.3, pickOf(c.r, ACCENTS), 0.03), bx, y + h / 2, 0.06));
    }
  }
  g.position.set(x, 0, z);
  c.g.add(g);
}
function plantPot(c: Ctx, x: number, z: number) {
  c.g.add(at(cyl(0.22, 0.17, 0.4, "#c8693c"), x, 0.2, z));
  for (let k = 0; k < 6; k++) {
    const l = cone(0.08, 0.7, "#5fae55", 0.06, 6);
    l.position.set(x + Math.cos(k) * 0.1, 0.7, z + Math.sin(k) * 0.1);
    l.rotation.set(Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5);
    c.g.add(l);
  }
}
function rug(c: Ctx, z = 0.3) {
  const r = cyl(c.span * 0.55, c.span * 0.55, 0.02, pickOf(c.r, ACCENTS), 0, 32);
  r.scale.z = 0.35;
  r.position.set(0, 0.01, z);
  c.g.add(r);
}
function tvSet(c: Ctx, x: number, z: number) {
  c.g.add(at(box(1.6, 0.6, 0.5, "#8b5a2b"), x, 0.3, z));
  c.g.add(at(box(1.5, 0.9, 0.08, "#111827"), x, 1.2, z));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.75), new THREE.MeshBasicMaterial({ color: pickOf(c.r, ["#60a5fa", "#34d399", "#fbbf24"]) }));
  scr.position.set(x, 1.2, z + 0.05);
  c.g.add(scr);
  c.updates.push((n) => { (scr.material as THREE.MeshBasicMaterial).color.setHSL(((n / 90) % 1), 0.6, 0.6); });
}
function lamp(c: Ctx, x: number, z: number) {
  c.g.add(at(cyl(0.04, 0.04, 1.9, "#4b5563"), x, 0.95, z));
  c.g.add(at(cyl(0.18, 0.32, 0.4, pickOf(c.r, ["#fde68a", "#fecaca", "#bfdbfe"])), x, 2.0, z));
  const l = new THREE.PointLight(0xffe2a8, 4, 6, 1.5);
  l.position.set(x, 1.8, z + 0.2);
  c.g.add(l);
}
function board(c: Ctx, x: number, y: number, z: number, w: number, h: number, color: string, text: string, ink: string) {
  c.g.add(at(box(w + 0.15, h + 0.15, 0.06, "#8b5a2b"), x, y, z + 0.02));
  const t = drawnTexture(512, Math.round((512 * h) / w), (g) => {
    g.fillStyle = color; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 6; g.lineCap = "round";
    g.font = "bold 54px Arial";
    g.fillText(text, 40, 80);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(40, 130 + i * 50); g.lineTo(180 + Math.random() * 250, 130 + i * 50); g.stroke(); }
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  p.position.set(x, y, z + 0.06);
  c.g.add(p);
}
function sign(c: Ctx, x: number, y: number, z: number, text: string, bg: string) {
  const w = 0.35 * text.length + 0.6;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.6), new THREE.MeshBasicMaterial({ map: textTexture(text, bg, "#ffffff", 512, 96, "bold 60px Arial") }));
  p.position.set(x, y, z + 0.06);
  c.g.add(p, at(box(w + 0.08, 0.68, 0.04, INK, 0), x, y, z + 0.02));
}
function counter(c: Ctx, x0: number, x1: number, z: number, col: string) {
  c.g.add(at(box(x1 - x0, 1.0, 0.7, col), (x0 + x1) / 2, 0.5, z));
  c.g.add(at(box(x1 - x0 + 0.1, 0.08, 0.8, shade(col, -30)), (x0 + x1) / 2, 1.04, z));
}
function fridge(c: Ctx, x: number, z: number) {
  const col = pickOf(c.r, ["#e5e7eb", "#fca5a5", "#bfdbfe", "#d1fae5"]);
  c.g.add(at(box(0.9, 2.2, 0.7, col), x, 1.1, z));
  c.g.add(at(box(0.92, 0.02, 0.72, INK, 0), x, 1.45, z));
  c.g.add(at(box(0.05, 0.4, 0.05, "#9ca3af", 0), x + 0.32, 1.75, z + 0.37), at(box(0.05, 0.4, 0.05, "#9ca3af", 0), x + 0.32, 1.1, z + 0.37));
}
function stove(c: Ctx, x: number, z: number) {
  c.g.add(at(box(1.0, 1.0, 0.7, "#d1d5db"), x, 0.5, z));
  c.g.add(at(box(0.8, 0.5, 0.02, "#1f2937", 0), x, 0.45, z + 0.36));
  c.g.add(at(cyl(0.25, 0.22, 0.3, "#9ca3af"), x - 0.2, 1.15, z));
  const steam: THREE.Mesh[] = [];
  for (let k = 0; k < 3; k++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon("#ffffff", { transparent: true, opacity: 0.5 }));
    c.g.add(s);
    steam.push(s);
  }
  c.updates.push((n) => steam.forEach((s, k) => { const t = ((n + k * 20) % 60) / 60; s.position.set(x - 0.2 + Math.sin(t * 6) * 0.05, 1.35 + t * 0.8, z); s.scale.setScalar(0.6 + t * 1.5); }));
}
function lockers(c: Ctx, x0: number, x1: number, z: number) {
  const col = pickOf(c.r, ["#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a78bfa"]);
  for (let x = x0; x < x1; x += 0.62) {
    c.g.add(at(box(0.58, 2.1, 0.5, col), x, 1.05, z));
    for (let k = 0; k < 3; k++) c.g.add(at(box(0.3, 0.025, 0.02, INK, 0), x, 1.8 - k * 0.07, z + 0.26));
  }
}
function shelvesWithGoods(c: Ctx, x0: number, x1: number, z: number) {
  for (let row = 0; row < 3; row++) {
    const y = 0.5 + row * 0.7;
    c.g.add(at(box(x1 - x0, 0.06, 0.5, "#a0704a"), (x0 + x1) / 2, y, z));
    for (let x = x0 + 0.2; x < x1 - 0.2; x += 0.3 + c.r() * 0.15) {
      const h = 0.25 + c.r() * 0.2;
      c.g.add(at(box(0.22, h, 0.25, pickOf(c.r, ["#e74c3c", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316"]), 0.04), x, y + h / 2 + 0.03, z));
    }
  }
}
function deskRow(c: Ctx, z: number) {
  for (let i = -3; i <= 3; i++) {
    const x = i * c.span * 0.32;
    c.g.add(at(box(1.0, 0.06, 0.6, "#c08552"), x, 0.75, z));
    for (const dx of [-0.42, 0.42]) c.g.add(at(box(0.06, 0.75, 0.06, "#7c4f2c", 0), x + dx, 0.37, z));
    c.g.add(at(box(0.3, 0.2, 0.22, pickOf(c.r, ACCENTS)), x - 0.2, 0.88, z));
  }
}
function globe(c: Ctx, x: number, z: number) {
  c.g.add(at(cyl(0.2, 0.25, 0.1, "#6b4f3a"), x, 1.05, z));
  const g = sphere(0.32, "#7dd3fc", 0.05, 16);
  g.position.set(x, 1.5, z);
  c.g.add(g);
  c.updates.push((n) => { g.rotation.y = n * 0.02; });
}

// ---------------------------------------------------------------- props
function bench(c: Ctx, x1: number, x2: number, z: number) {
  const L = x2 - x1 + 1.4, cx = (x1 + x2) / 2, wood = pickOf(c.r, ["#b9825a", "#a86b3c", "#8b5e3c"]);
  c.g.add(at(box(L, 0.08, 0.55, wood), cx, SEAT_H, z));
  c.g.add(at(box(L, 0.45, 0.07, wood), cx, SEAT_H + 0.35, z - 0.27));
  for (const dx of [-L / 2 + 0.15, L / 2 - 0.15]) c.g.add(at(box(0.08, SEAT_H, 0.5, "#4b5563"), cx + dx, SEAT_H / 2, z));
}
function sofa(c: Ctx, x1: number, x2: number, z: number) {
  const L = x2 - x1 + 1.6, cx = (x1 + x2) / 2, col = pickOf(c.r, ["#5b84b1", "#b15b5b", "#5bb18a", "#8a5bb1", "#c49a3a", "#64748b"]);
  c.g.add(at(box(L, SEAT_H, 0.8, shade(col, -15)), cx, SEAT_H / 2, z - 0.05));
  c.g.add(at(box(L, 0.9, 0.25, col), cx, SEAT_H + 0.35, z - 0.45));
  for (const s of [-1, 1]) c.g.add(at(box(0.25, 0.75, 0.85, col), cx + s * L / 2, 0.38, z - 0.05));
}
function bed(c: Ctx, x1: number, x2: number, z: number) {
  const L = x2 - x1 + 2.0, cx = (x1 + x2) / 2 + 0.2;
  c.g.add(at(box(L, 0.4, 1.3, "#a0704a"), cx, 0.2, z - 0.2));
  c.g.add(at(box(L - 0.1, 0.2, 1.2, "#ffffff"), cx, 0.5, z - 0.2));
  c.g.add(at(box(0.12, 1.2, 1.35, "#7c4f2c"), cx + L / 2, 0.6, z - 0.2));
  c.g.add(at(box(0.6, 0.18, 0.8, "#ffffff"), cx + L / 2 - 0.45, 0.68, z - 0.2));
}
function chair(c: Ctx, x: number, z: number) {
  const wood = pickOf(c.r, ["#b9825a", "#a86b3c", "#8b5e3c"]);
  c.g.add(at(box(0.6, 0.06, 0.55, wood), x, SEAT_H, z));
  c.g.add(at(box(0.6, 0.6, 0.06, wood), x, SEAT_H + 0.33, z - 0.27));
  for (const dx of [-0.25, 0.25]) for (const dz of [-0.22, 0.22]) c.g.add(at(box(0.05, SEAT_H, 0.05, wood, 0), x + dx, SEAT_H / 2, z + dz));
}
function table(c: Ctx, x: number, z: number, laptop: boolean) {
  c.g.add(at(box(1.4, 0.07, 0.7, "#c08552"), x, 0.78, z));
  for (const dx of [-0.6, 0.6]) c.g.add(at(box(0.07, 0.78, 0.6, "#7c4f2c", 0), x + dx, 0.39, z));
  if (laptop) {
    c.g.add(at(box(0.5, 0.03, 0.35, "#9ca3af"), x, 0.83, z));
    const s = box(0.5, 0.33, 0.02, "#374151");
    s.position.set(x, 1.0, z - 0.17);
    s.rotation.x = -0.25;
    c.g.add(s);
  } else {
    c.g.add(at(cyl(0.05, 0.04, 0.12, "#ffffff"), x - 0.25, 0.88, z), at(cyl(0.18, 0.18, 0.02, "#ffffff"), x + 0.2, 0.83, z));
  }
}

// ---------------------------------------------------------------- places
function outdoorSky(c: Ctx, layout: EnvLayout): PlaceLight {
  const t = layout.night ? 3 : Math.floor(c.r() * 10);
  const kind = t === 3 || t === 9 ? "night" : t === 2 || t === 8 ? "sunset" : "day";
  const p = {
    day: { top: "#5aaeff", bottom: "#d9f0ff", sun: "#fff3c4", sunI: 2.6, hemi: 1.5, fog: "#cfe9ff" },
    sunset: { top: "#ff8a4c", bottom: "#ffe3b8", sun: "#ffb27a", sunI: 2.0, hemi: 1.2, fog: "#ffd9b0" },
    night: { top: "#0b1640", bottom: "#2b3a67", sun: "#a5b4fc", sunI: 0.7, hemi: 0.45, fog: "#1e2a50" },
  }[kind];
  skyDome(c, p.top, p.bottom);
  sunMoon(c, kind === "night" ? "#f8f4d7" : kind === "sunset" ? "#ff7b3a" : "#ffe066", kind === "night");
  if (kind !== "night") clouds(c, 7);
  return { skyTop: p.top, skyBottom: p.bottom, fog: p.fog, fogNear: 30, fogFar: 130, hemiSky: p.top, hemiGround: "#556b3a",
    hemi: p.hemi, sun: p.sun, sunI: p.sunI, sunPos: [8, 14, 10], night: kind === "night", indoor: false };
}
const INDOOR: PlaceLight = { skyTop: "#000000", skyBottom: "#000000", fog: "#000000", fogNear: 60, fogFar: 200, hemiSky: "#ffffff",
  hemiGround: "#b9a58a", hemi: 1.5, sun: "#fff6e0", sunI: 1.8, sunPos: [3, 8, 9], night: false, indoor: true };

/** Build the 3D set for one scene. */
export function buildPlace(layout: EnvLayout, span: number): Place {
  const seed = layout.seed ?? 7;
  const c: Ctx = { g: new THREE.Group(), r: rng(seed * 2654435761), span, seed, updates: [] };
  const r = c.r;
  let light: PlaceLight = INDOOR;
  const kind = layout.kind as string;
  const back = -4; // a typical "behind the characters" depth
  const indoorLight = (l: Partial<PlaceLight> = {}) => { light = { ...INDOOR, ...l }; };

  switch (kind) {
    case "park": {
      light = outdoorSky(c, layout);
      ground(c, light.night ? "#3b5a2e" : pickOf(r, ["#8cc66b", "#9fd07f", "#a8d88a"]));
      mountains(c, light.night ? "#3b4a6b" : "#a5b4cb", false);
      for (let i = 0; i < 9; i++) tree(c, (i - 4) * 4 + (r() - 0.5) * 2, -8 - r() * 10, 0.9 + r() * 0.5);
      tree(c, -span * 0.75, -2.5, 1.1); tree(c, span * 0.8, -3, 1.0);
      bush(c, -span * 0.4, -2.2); bush(c, span * 0.35, -2.4);
      lampPost(c, span * 0.55, -1.8);
      const path = new THREE.Mesh(new THREE.PlaneGeometry(200, 1.6), toon("#e7d3b5"));
      path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, -0.8); c.g.add(path);
      flowers(c, 30, -6, 4);
      if (r() < 0.5) { c.g.add(at(cyl(0.9, 1.0, 0.5, "#cbd5e1"), -span * 0.2, 0.25, -5)); c.g.add(at(cyl(0.12, 0.12, 1.4, "#cbd5e1"), -span * 0.2, 0.9, -5)); }
      break;
    }
    case "street": {
      light = outdoorSky(c, layout);
      ground(c, "#9ca3af");
      const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 4), toon("#4b5563"));
      road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 4); c.g.add(road);
      for (let x = -40; x < 40; x += 3) c.g.add(at(box(1.4, 0.01, 0.15, "#f5f5f4", 0), x, 0.02, 4));
      c.g.add(at(box(200, 0.15, 0.3, "#d1d5db", 0.01), 0, 0.07, 1.9));
      const signs = ["CHAI", "TAILOR", "MOBILE", "BAKERY", "PHARMACY", "BOOKS", "PIZZA", "HOTEL"];
      for (let x = -span * 1.6; x < span * 1.6; x += 4.2) {
        building(c, x, back - 1.5, 4, 4 + r() * 4, pickOf(r, ["#f4c27a", "#e9967a", "#a8c8e8", "#c9a7e0", "#f2e394", "#9fd3b0", "#f0b6c8"]), r() < 0.6 ? pickOf(r, signs) : undefined);
      }
      lampPost(c, -span * 0.6, 1.5); lampPost(c, span * 0.6, 1.5);
      if (r() < 0.6) tree(c, span * 0.2, -1.5, 0.7);
      break;
    }
    case "plain": {
      light = outdoorSky(c, layout);
      ground(c, "#e5e7eb");
      break;
    }
    case "jungle": case "forest": {
      light = outdoorSky(c, layout);
      if (kind === "jungle") light = { ...light, fog: light.night ? "#14301c" : "#a9d8a0", fogNear: 12, fogFar: 60 };
      ground(c, light.night ? "#2f4a26" : kind === "jungle" ? "#5e9e45" : "#7cb36b");
      if (kind === "forest") mountains(c, "#8796ad", false);
      for (let i = 0; i < 40; i++) {
        const x = (r() - 0.5) * 50, z = -3 - r() * 30;
        if (kind === "forest") pine(c, x, z, 0.9 + r() * 0.8);
        else if (r() < 0.3) palm(c, x, z, 1 + r() * 0.5);
        else tree(c, x, z, 1 + r() * 0.7, pickOf(r, ["#2f7d3a", "#3a8f45", "#2d6e3e", "#4caf50"]));
      }
      if (kind === "jungle") {
        for (let i = 0; i < 18; i++) {
          const x = (r() - 0.5) * span * 2.4, z = -1.5 - r() * 4;
          const vine = cyl(0.03, 0.03, 4 + r() * 2, "#2f7d3a", 0.1, 6);
          vine.position.set(x, 6, z); c.g.add(vine);
        }
        for (let i = 0; i < 26; i++) {
          const leaf = mesh(new THREE.SphereGeometry(1, 10, 6), pickOf(r, ["#4caf50", "#3f9d4a", "#66bb6a", "#2e7d32"]), 0.04);
          leaf.scale.set(0.9, 0.08, 0.35);
          leaf.position.set((r() - 0.5) * span * 2.4, 0.3, -1 - r() * 3 + (r() < 0.3 ? 4 : 0));
          leaf.rotation.set(0, r() * 6, 0.5);
          c.g.add(leaf);
        }
        bush(c, -span * 0.7, -1.5, 1.4); bush(c, span * 0.65, -1.8, 1.3);
        flowers(c, 20, -5, 3);
      } else { rock(c, span * 0.3, -2, 1.2); bush(c, -span * 0.5, -2); }
      break;
    }
    case "beach": {
      light = outdoorSky(c, layout);
      ground(c, "#fde68a");
      waterPlane(c, -4, light.night ? "#1e3a8a" : pickOf(r, ["#38bdf8", "#0ea5e9", "#22d3ee"]));
      palm(c, -span * 0.7, -2.5, 1.2); palm(c, span * 0.75, -3, 1.0);
      const ux = (r() - 0.5) * span;
      c.g.add(at(cyl(0.04, 0.04, 2.4, "#ffffff"), ux, 1.2, -1.5));
      const um = mesh(new THREE.ConeGeometry(1.4, 0.6, 12, 1, true), pickOf(r, ["#ef4444", "#f59e0b", "#8b5cf6"]), 0.03);
      um.position.set(ux, 2.5, -1.5); c.g.add(um);
      c.g.add(at(sphere(0.3, "#f472b6", 0.06, 14), (r() - 0.5) * span, 0.3, 1.2));
      for (let i = 0; i < 6; i++) c.g.add(at(sphere(0.12, "#fbcfe8", 0.1, 8), (r() - 0.5) * span * 2, 0.06, r() * 3 - 1));
      break;
    }
    case "desert": {
      light = outdoorSky(c, layout);
      ground(c, "#f9d48c");
      for (let i = 0; i < 8; i++) { const d = sphere(8 + r() * 6, "#f4c27a", 0, 16); d.scale.y = 0.25; d.position.set((i - 4) * 14, 0, -25 - r() * 15); c.g.add(d); }
      const py = cone(9, 10, "#e2a65a", 0.01, 4); py.position.set(18, 5, -45); py.rotation.y = 0.6; c.g.add(py);
      cactus(c, -span * 0.65, -2, 1); cactus(c, span * 0.7, -3, 0.8); rock(c, span * 0.2, -1.5, 0.8, "#c2a07a");
      break;
    }
    case "cave": {
      light = { ...INDOOR, hemi: 0.35, hemiSky: "#7c6aa8", hemiGround: "#2a2633", sun: "#ffd28a", sunI: 0.6, night: true, indoor: true };
      ground(c, "#3a3445");
      const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), toon("#4b4558"));
      (dome.material as THREE.MeshToonMaterial).side = THREE.BackSide;
      dome.scale.set(1.4, 0.5, 0.7); dome.position.z = -4; c.g.add(dome);
      for (let i = 0; i < 26; i++) { const st = cone(0.25 + r() * 0.3, 1 + r() * 1.5, "#56506a", 0.04, 7); st.rotation.x = Math.PI; st.position.set((r() - 0.5) * 30, 7 - r() * 1.5, -2 - r() * 10); c.g.add(st); }
      for (let i = 0; i < 12; i++) rock(c, (r() - 0.5) * 30, -4 - r() * 8, 1.5 + r() * 2, pickOf(r, ["#4b4558", "#56506a"]));
      for (let i = 0; i < 8; i++) {
        const cr = cone(0.15, 0.6, pickOf(r, ["#67e8f9", "#c084fc", "#86efac"]), 0.06, 5);
        cr.material = toon(pickOf(r, ["#67e8f9", "#c084fc", "#86efac"]), { emissive: 0x334455 });
        cr.position.set((r() - 0.5) * span * 2, 0.3, -2 - r() * 4); c.g.add(cr);
      }
      const glow = new THREE.PointLight(0xffc27a, 10, 14, 1.4); glow.position.set(0, 3, 2); c.g.add(glow);
      break;
    }
    case "mountain": case "snow": {
      light = outdoorSky(c, layout);
      const snowy = kind === "snow";
      ground(c, snowy ? "#f8fafc" : light.night ? "#3b5a2e" : "#8fbf6f");
      mountains(c, snowy ? "#cbd5e1" : "#94a3b8", true);
      for (let i = 0; i < 16; i++) pine(c, (r() - 0.5) * 40, -4 - r() * 18, 0.8 + r() * 0.7, snowy);
      rock(c, span * 0.4, -1.8, 1);
      if (snowy) {
        const sx = (r() - 0.5) * span;
        c.g.add(at(sphere(0.55, "#ffffff", 0.05, 16), sx, 0.5, -1.8), at(sphere(0.38, "#ffffff", 0.06, 14), sx, 1.25, -1.8), at(sphere(0.27, "#ffffff", 0.06, 14), sx, 1.8, -1.8));
        const nose = cone(0.05, 0.3, "#f97316", 0, 8); nose.rotation.x = Math.PI / 2; nose.position.set(sx, 1.8, -1.5); c.g.add(nose);
      }
      break;
    }
    case "farm": case "village": {
      light = outdoorSky(c, layout);
      ground(c, kind === "farm" ? "#a3d977" : "#c9a36b");
      mountains(c, "#b6c6a8", false);
      if (kind === "farm") {
        const bx = r() < 0.5 ? -span * 0.6 : span * 0.6;
        c.g.add(at(box(4, 3.2, 3.5, "#b91c1c"), bx, 1.6, back - 2));
        const rf = mesh(new THREE.ConeGeometry(3.2, 1.8, 4), "#7f1d1d", 0.03); rf.position.set(bx, 4.1, back - 2); rf.rotation.y = Math.PI / 4; rf.scale.z = 0.8; c.g.add(rf);
        c.g.add(at(box(1.4, 1.9, 0.06, "#fef3c7"), bx, 0.95, back - 0.24));
        fence(c, -1.6, "#d6b98c");
        for (let i = 0; i < 4; i++) { const h = cyl(0.5, 0.5, 0.9, "#fbbf24", 0.04, 16); h.rotation.z = Math.PI / 2; h.position.set(-span * 0.2 + i * 1.3, 0.5, back - 3); c.g.add(h); }
        for (let z = -8; z > -22; z -= 1.2) c.g.add(at(box(40, 0.25, 0.4, "#65a30d", 0.02), 0, 0.12, z));
      } else {
        for (let x = -span * 1.5; x < span * 1.5; x += 5) house(c, x + (r() - 0.5), back - 2 - r() * 2);
        tree(c, span * 0.3, -2.4, 0.8);
        c.g.add(at(cyl(0.6, 0.6, 0.8, "#9ca3af"), -span * 0.35, 0.4, -2));
      }
      break;
    }
    case "space": {
      light = { skyTop: "#000000", skyBottom: "#0b1026", fog: "#000000", fogNear: 200, fogFar: 300, hemiSky: "#9ca3af", hemiGround: "#111827", hemi: 0.9, sun: "#ffffff", sunI: 2.4, sunPos: [10, 8, 6], night: true, indoor: false };
      skyDome(c, "#000000", "#0b1026");
      sunMoon(c, "#ffffff", true);
      ground(c, "#9ca3af");
      for (let i = 0; i < 14; i++) { const cr = cyl(0.6 + r(), 0.8 + r(), 0.12, "#6b7280", 0.04, 16); cr.position.set((r() - 0.5) * 30, 0.02, -2 - r() * 14); c.g.add(cr); }
      const pl = sphere(9, pickOf(r, ["#f97316", "#a78bfa", "#38bdf8"]), 0, 32); pl.position.set(25, 18, -70); c.g.add(pl);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(14, 0.6, 8, 48), toon("#fde68a")); ring.position.copy(pl.position); ring.rotation.x = 1.2; c.g.add(ring);
      break;
    }
    case "underwater": {
      light = { skyTop: "#0e7490", skyBottom: "#22d3ee", fog: "#0e7490", fogNear: 6, fogFar: 40, hemiSky: "#a5f3fc", hemiGround: "#1e3a8a", hemi: 1.3, sun: "#e0f2fe", sunI: 1.4, sunPos: [2, 15, 4], night: false, indoor: false };
      skyDome(c, "#0e7490", "#22d3ee");
      ground(c, "#fcd34d");
      const weeds: THREE.Mesh[] = [];
      for (let i = 0; i < 30; i++) { const w = cone(0.12, 2 + r() * 2, "#16a34a", 0.05, 6); w.position.set((r() - 0.5) * 30, 1.2, -1.5 - r() * 10); c.g.add(w); weeds.push(w); }
      for (let i = 0; i < 10; i++) c.g.add(at(sphere(0.4 + r() * 0.3, pickOf(r, ["#fb7185", "#f472b6", "#fb923c"]), 0.05, 10), (r() - 0.5) * 20, 0.3, -1.5 - r() * 6));
      const bubbles: THREE.Mesh[] = [];
      for (let i = 0; i < 20; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + r() * 0.08, 8, 6), toon("#e0f2fe", { transparent: true, opacity: 0.6 })); c.g.add(b); bubbles.push(b); }
      c.updates.push((n) => {
        weeds.forEach((w, i) => { w.rotation.z = Math.sin(n / 20 + i) * 0.15; });
        bubbles.forEach((b, i) => { b.position.set(((i * 7.3) % 20) - 10, ((n * 0.03 + i * 0.7) % 8), -1 - (i % 5)); });
      });
      break;
    }
    case "bus": case "train": case "car": case "plane": {
      // inside a vehicle: seats, poles, and the world rushing past the windows
      indoorLight({ sunPos: [2, 6, 8] });
      const body = new THREE.Group();
      c.g.add(body);
      const w = span * 2.6, wallZ = -2.2, winY = kind === "car" ? 1.7 : 1.9, winH = kind === "plane" ? 0.7 : 1.1;
      const bodyCol = kind === "bus" ? pickOf(r, ["#fde68a", "#fef3c7", "#e0f2fe"]) : kind === "car" ? "#334155" : "#e2e8f0";
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, 12), toon("#64748b")); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.01, 2.8); body.add(fl);
      const n = kind === "car" ? 2 : kind === "plane" ? 6 : 4, ww = w / n;
      body.add(at(box(w, winY - winH / 2, 0.15, bodyCol, 0.01), 0, (winY - winH / 2) / 2, wallZ));
      body.add(at(box(w, 4 - (winY + winH / 2), 0.15, bodyCol, 0.01), 0, (winY + winH / 2 + 4) / 2, wallZ));
      for (let i = 0; i <= n; i++) body.add(at(box(kind === "plane" ? ww - 1.0 : 0.35, winH, 0.15, bodyCol, 0.01), -w / 2 + i * ww, winY, wallZ));
      if (kind === "bus" || kind === "train") {
        { const _o = at(cyl(0.035, 0.035, w, "#9ca3af", 0.1, 8), 0, 3.2, -0.6); _o.rotation.z = Math.PI / 2; body.add(_o); }
        for (let x = -w / 2 + 0.5; x < w / 2; x += 1.3) body.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12), toon("#9ca3af")), x, 2.95, -0.6));
        for (let x = -w / 2 + 1; x < w / 2; x += 1.6) { body.add(at(box(1.3, 0.12, 0.6, "#2563eb"), x, SEAT_H, -1.6)); body.add(at(box(1.3, 0.7, 0.12, "#1d4ed8"), x, SEAT_H + 0.4, -1.9)); }
        sign(c, 0, 3.6, wallZ + 0.08, kind === "bus" ? pickOf(r, ["CITY BUS", "EXPRESS", "JUNGLE BUS"]) : "EXPRESS TRAIN", "#1f2937");
      }
      if (kind === "plane") sign(c, 0, 3.3, wallZ + 0.08, "FASTEN SEAT BELT", "#0f172a");
      // the view outside (scrolls past)
      const view = new THREE.Group();
      c.g.add(view);
      const vc: Ctx = { g: view, r: rng(seed + 99), span, seed, updates: [] };
      const viewGround = new THREE.Mesh(new THREE.PlaneGeometry(400, 40), toon(kind === "plane" ? "#cfe8ff" : "#8cc66b")); viewGround.rotation.x = -Math.PI / 2; viewGround.position.set(0, kind === "plane" ? -6 : -0.4, -24); view.add(viewGround);
      const strip = new THREE.Group();
      view.add(strip);
      const sc: Ctx = { g: strip, r: rng(seed + 7), span, seed, updates: [] };
      for (let x = -60; x < 60; x += 4 + sc.r() * 3) {
        const k = sc.r();
        if (kind === "plane") strip.add(at(sphere(1.5 + sc.r() * 2, "#ffffff", 0, 12), x, -1 + sc.r() * 3, -12 - sc.r() * 8));
        else if (k < 0.45) tree(sc, x, -6 - sc.r() * 6, 0.8 + sc.r() * 0.6);
        else if (k < 0.75) house(sc, x, -10 - sc.r() * 4);
        else strip.add(at(cyl(0.08, 0.08, 4, "#6b7280"), x, 2, -4.5));
      }
      const vsky = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), new THREE.MeshBasicMaterial({ color: "#9fd4ff", fog: false }));
      vsky.position.set(0, 20, -30); view.add(vsky);
      void vc;
      c.updates.push((n2) => {
        strip.position.x = -((n2 * 0.18) % 60);
        body.position.y = Math.sin(n2 * 0.9) * 0.012;
        body.rotation.z = Math.sin(n2 * 0.13) * 0.004;
      });
      break;
    }
    default: {
      // rooms
      const indoor = !["custom"].includes(kind) || !(layout.outdoor ?? true);
      if (!indoor) {
        light = outdoorSky(c, layout);
        ground(c, pickOf(r, ["#9fd07f", "#d6c2a3", "#c9a36b", "#a8d88a"]));
        mountains(c, pickOf(r, ["#a5b4cb", "#b6c6a8", "#d6c2a3"]), r() < 0.3);
        tree(c, -span * 0.8, -4, 1); tree(c, span * 0.85, -5, 1.1);
        break;
      }
      indoorLight();
      const wallCol = kind === "hospital" ? pickOf(r, ["#e0f2fe", "#ecfdf5", "#f8fafc"]) : kind === "police" ? pickOf(r, ["#dbeafe", "#e5e7eb"])
        : kind === "office" ? pickOf(r, ["#eef2f7", "#e7efe9", "#f3f0e8"]) : kind === "stage" ? "#1f1b2e" : pickOf(r, WALLS);
      const floorCol = kind === "office" || kind === "police" || kind === "hospital" ? pickOf(r, ["#9aa7b4", "#cbd5e1"]) : kind === "stage" ? "#8b5a2b" : pickOf(r, FLOORS);
      const { backZ } = room(c, wallCol, floorCol);
      const bz = backZ + 0.05;
      const L = -span * 0.95, R = span * 0.95;
      if (kind === "stage") {
        light = { ...INDOOR, hemi: 0.5 };
        const cur = pickOf(r, ["#b91c1c", "#7c3aed", "#1d4ed8"]);
        for (const s of [-1, 1]) for (let k = 0; k < 6; k++) c.g.add(at(cyl(0.25, 0.25, 4.4, cur, 0.03, 10), s * (span * 0.9 + k * 0.35), 2.2, -1.5 - k * 0.2));
        c.g.add(at(box(span * 2.8, 0.8, 0.3, cur), 0, 4.0, -1.2));
        const spot = new THREE.SpotLight(0xfff1c1, 60, 20, 0.45, 0.5, 1); spot.position.set(0, 7, 4); spot.target.position.set(0, 0, 0); c.g.add(spot, spot.target);
        break;
      }
      // the window never sits on top of the board
      const winX = kind === "classroom" ? (r() < 0.5 ? -1 : 1) * span * 0.78 : (r() - 0.5) * span * 0.6;
      if (kind !== "police" && kind !== "library") windowOn(c, winX, 2.3, bz, 1.8, 1.3, kind !== "office");
      if (kind === "home") {
        r() < 0.5 ? bookshelf(c, L, bz + 0.3) : tvSet(c, L, bz + 0.4);
        r() < 0.5 ? lamp(c, R, bz + 0.6) : plantPot(c, R, bz + 0.5);
        door(c, r() < 0.5 ? winX - 3 : winX + 3, bz);
        poster(c, winX + (winX > 0 ? -2.2 : 2.2), 2.5, bz);
        rug(c);
        wallClock(c, winX, 3.5, bz);
      } else if (kind === "office") {
        board(c, winX + (winX > 0 ? -2.6 : 2.6), 2.4, bz, 2, 1.1, "#ffffff", "SALES ↗", "#16a34a");
        deskRow(c, bz + 1.4);
        plantPot(c, R, bz + 0.4);
        wallClock(c, L * 0.6, 3.4, bz);
        c.g.add(at(box(0.5, 1.2, 0.5, "#e5e7eb"), L, 0.6, bz + 0.4), at(cyl(0.22, 0.22, 0.6, "#93c5fd"), L, 1.5, bz + 0.4));
      } else if (kind === "classroom") {
        board(c, 0, 2.4, bz, 3.6, 1.4, pickOf(r, ["#2f5d50", "#1f3b2c", "#334155"]), pickOf(r, ["A+B=C", "2+2=4", "ABC", "E=mc²", "x+y=?"]), "#f5f5f4");
        deskRow(c, bz + 1.6);
        globe(c, L * 0.8, bz + 0.9);
        c.g.add(at(box(0.8, 1.0, 0.5, "#c08552"), L * 0.8, 0.5, bz + 0.9));
        wallClock(c, R * 0.7, 3.3, bz);
        poster(c, L * 0.6, 2.4, bz);
        door(c, R, bz);
        if (r() < 0.5) lockers(c, R - 0.4, R + 1.5, bz + 0.3);
      } else if (kind === "kitchen") {
        counter(c, L - 1, R + 1, bz + 0.4, pickOf(r, ["#f2c38b", "#cbd5e1", "#fca5a5", "#a7f3d0"]));
        fridge(c, L * 0.95, bz + 1.0);
        stove(c, R * 0.6, bz + 1.0);
        for (let x = L; x < R; x += 1.3) c.g.add(at(box(1.2, 0.8, 0.4, pickOf(r, ["#f2c38b", "#e7b98c"])), x, 3.3, bz + 0.2));
      } else if (kind === "bedroom") {
        c.g.add(at(box(1.2, 2.4, 0.6, pickOf(r, ["#a0704a", "#8b5e3c", "#d6c2a3"])), R, 1.2, bz + 0.35));
        poster(c, L * 0.7, 2.5, bz);
        lamp(c, L, bz + 0.5);
        rug(c);
      } else if (kind === "shop") {
        shelvesWithGoods(c, L - 1, R + 1, bz + 0.3);
        counter(c, R * 0.55, R * 1.15, 0.9, "#c08552");
        sign(c, 0, 3.6, bz, pickOf(r, ["SUPER STORE", "GENERAL STORE", "SALE 50%"]), "#16a34a");
      } else if (kind === "restaurant") {
        for (const x of [L * 0.6, 0, R * 0.6]) {
          c.g.add(at(cyl(0.01, 0.01, 1.2, INK, 0), x, 3.6, 0));
          const lp = mesh(new THREE.ConeGeometry(0.35, 0.3, 14, 1, true), pickOf(r, ["#ffd54a", "#fca5a5", "#93c5fd"]), 0.04); lp.position.set(x, 2.95, 0); c.g.add(lp);
          const pl = new THREE.PointLight(0xffe2a8, 3, 5, 1.6); pl.position.set(x, 2.7, 0); c.g.add(pl);
        }
        board(c, L * 0.8, 2.5, bz, 1.6, 1.1, "#1f2937", "MENU", "#fde68a");
        for (const x of [L * 0.9, R * 0.9]) { table(c, x, -1.2, false); chair(c, x - 0.8, -1.2); }
      } else if (kind === "police") {
        sign(c, 0, 3.6, bz, "POLICE", "#1d4ed8");
        for (let i = 0; i < 3; i++) poster(c, L * 0.8 + i * 1.1, 2.4, bz);
        for (let x = R * 0.6; x < R + 1.5; x += 0.3) c.g.add(at(cyl(0.04, 0.04, 3.2, "#6b7280", 0.1, 8), x, 1.6, bz + 0.6));
        door(c, 0.5, bz, "#1e3a8a");
      } else if (kind === "hospital") {
        sign(c, 0, 3.6, bz, "HOSPITAL", "#dc2626");
        c.g.add(at(box(2, 0.5, 1, "#e5e7eb"), L * 0.8, 0.55, bz + 0.8), at(box(2, 0.2, 1, "#93c5fd"), L * 0.8, 0.85, bz + 0.8));
        c.g.add(at(cyl(0.03, 0.03, 1.8, "#9ca3af"), L * 0.3, 0.9, bz + 0.6), at(box(0.25, 0.35, 0.1, "#bfdbfe"), L * 0.3, 1.8, bz + 0.6));
        door(c, R * 0.8, bz, "#94a3b8");
      } else if (kind === "library") {
        for (let x = L - 0.6; x < R + 1; x += 1.5) bookshelf(c, x, bz + 0.3);
        sign(c, 0, 3.6, bz, "QUIET PLEASE", "#7c3aed");
      } else if (kind === "gym") {
        sign(c, 0, 3.6, bz, "GYM", "#ef4444");
        for (const x of [L * 0.8, R * 0.8]) {
          { const _o = at(cyl(0.04, 0.04, 1.4, "#374151"), x, 0.2, bz + 1); _o.rotation.z = Math.PI / 2; c.g.add(_o); }
          for (const d of [-0.6, 0.6]) { const _o = at(cyl(0.22, 0.22, 0.15, "#111827"), x + d, 0.22, bz + 1); _o.rotation.z = Math.PI / 2; c.g.add(_o); }
        }
      } else {
        // custom room
        door(c, R * 0.8, bz);
        poster(c, L * 0.6, 2.4, bz);
        plantPot(c, L, bz + 0.4);
      }
    }
  }

  // furniture the scene needs (benches / sofas / beds / chairs / tables)
  let bedY = 0.62;
  for (const p of layout.props ?? []) {
    const x = (p.x - 0.5) * span, x2 = ((p.x2 ?? p.x) - 0.5) * span;
    if (p.type === "bench") bench(c, x, x2, -0.12);
    else if (p.type === "sofa") sofa(c, x, x2, -0.1);
    else if (p.type === "bed") { bed(c, x, x2, 0); bedY = 0.62; }
    else if (p.type === "chair") chair(c, x, -0.12);
    else if (p.type === "table") table(c, x, 0.6, false);
    else if (p.type === "desk") table(c, x, 0.6, true);
  }
  void cone;
  return {
    group: c.g,
    light,
    update: (n) => { for (const u of c.updates) u(n); },
    seatY: SEAT_H,
    bedY,
  };
}
