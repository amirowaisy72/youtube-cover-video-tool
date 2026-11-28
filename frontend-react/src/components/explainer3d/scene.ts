// ExplainerScene — the three.js engine for the 3D Explainer.
//
// Framework-free TypeScript: the React wrapper (ExplainerScene.tsx)
// owns the canvas + playback clock; the headless render route drives
// seek(t) directly. DETERMINISM RULE: nothing here reads the wall
// clock — every animation is a pure function of the t passed to
// seek(), so frame N of a render is reproducible exactly.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STYLE3D, QUALITY, type QualityName } from "./style";
import type { Shot, ShotCard, ShotLabel } from "./templates";

// ---------------------------------------------------------------- helpers

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
/** Eased 0→1 progress of t through the [t0,t1] window. */
export const seg = (t: number, t0: number, t1: number) =>
  easeInOut(clamp01((t - t0) / Math.max(0.0001, t1 - t0)));
/** Visibility envelope for a label/card: in at t0, out at t1 (shot end if unset). */
export function envelope(t: number, t0: number | undefined, t1: number | undefined, dur: number): number {
  const a = t0 ?? 0;
  const b = t1 ?? dur;
  const fade = 0.45;
  return clamp01((t - a) / fade) * clamp01((b - t) / fade + 1) * (t >= a && t <= b + fade ? 1 : 0);
}

/** Deterministic PRNG (mulberry32) — procedural textures/layouts must
 *  be identical on every seek and every machine. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

export function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Wrap text to at most `max` px per line. */
function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > max && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

// ------------------------------------------------------- label + card sprites

interface Tracked {
  group: THREE.Group;
  anchorFn: () => THREE.Vector3;
  line?: THREE.Line;
  t0?: number;
  t1?: number;
  baseScale: THREE.Vector3;
}

function makeLabelSprite(text: string): { sprite: THREE.Sprite; w: number; h: number } {
  const pad = 18, fontPx = 44;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `600 ${fontPx}px ${STYLE3D.font}`;
  const tw = Math.min(measure.measureText(text).width, 560);
  const w = Math.ceil(tw + pad * 2), h = fontPx + pad * 2;
  const tex = canvasTexture(w, h, (g) => {
    g.fillStyle = STYLE3D.labelBg;
    g.beginPath();
    g.roundRect(2, 2, w - 4, h - 4, 18);
    g.fill();
    g.strokeStyle = STYLE3D.accent;
    g.lineWidth = 3;
    g.stroke();
    g.font = `600 ${fontPx}px ${STYLE3D.font}`;
    g.fillStyle = STYLE3D.label;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 2, 560);
  });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  const scale = 0.0038;
  sprite.scale.set(w * scale, h * scale, 1);
  sprite.renderOrder = 20;
  return { sprite, w, h };
}

function makeCardPlane(card: ShotCard, big = false): THREE.Mesh {
  const w = big ? 1024 : 640, h = big ? 560 : 340;
  const tex = canvasTexture(w, h, (g) => {
    g.fillStyle = STYLE3D.cardBg;
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, 28);
    g.fill();
    g.strokeStyle = STYLE3D.data;
    g.lineWidth = 5;
    g.stroke();
    g.textAlign = "center";
    g.fillStyle = STYLE3D.data;
    g.font = `800 ${big ? 190 : 120}px ${STYLE3D.font}`;
    g.textBaseline = "middle";
    g.fillText(card.value, w / 2, h * (card.sub ? 0.34 : 0.4), w - 80);
    if (card.unit) {
      g.fillStyle = STYLE3D.cardText;
      g.font = `500 ${big ? 52 : 38}px ${STYLE3D.font}`;
      const lines = wrap(g, card.unit, w - 110);
      lines.forEach((ln, i) => g.fillText(ln, w / 2, h * 0.62 + i * (big ? 62 : 46)));
    }
    if (card.sub) {
      g.fillStyle = STYLE3D.muted;
      g.font = `400 ${big ? 38 : 28}px ${STYLE3D.font}`;
      g.fillText(card.sub, w / 2, h * 0.88, w - 80);
    }
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(big ? 3.4 : 2.1, (big ? 3.4 : 2.1) * (h / w)), mat);
  mesh.renderOrder = 19;
  return mesh;
}

/** Glowing arc: tube along a quadratic bezier lifted between a and b. */
function makeArc(a: THREE.Vector3, b: THREE.Vector3, lift = 0.35, color: string = STYLE3D.data, radius = 0.016): THREE.Mesh {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dist = a.distanceTo(b);
  mid.normalize().multiplyScalar(mid.length() + dist * lift);
  if (a.y !== undefined && Math.abs(a.length() - b.length()) > 0.01) mid.y += dist * lift * 0.4;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const geo = new THREE.TubeGeometry(curve, 40, radius, 6, false);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

function makePin(color: string = STYLE3D.data): THREE.Group {
  const grp = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 12),
    new THREE.MeshBasicMaterial({ color }),
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 16, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  grp.add(head, halo);
  return grp;
}

// ------------------------------------------------------- procedural textures

function earthTexture(): THREE.CanvasTexture {
  const rnd = seeded(42);
  return canvasTexture(1024, 512, (g, w, h) => {
    g.fillStyle = STYLE3D.deep;
    g.fillRect(0, 0, w, h);
    // stylised continents: clusters of soft blobs, seeded → stable
    for (let c = 0; c < 26; c++) {
      const cx = rnd() * w, cy = h * 0.16 + rnd() * h * 0.68;
      const blobs = 5 + Math.floor(rnd() * 7);
      g.fillStyle = rnd() > 0.35 ? STYLE3D.land : STYLE3D.landAlt;
      for (let i = 0; i < blobs; i++) {
        const bx = cx + (rnd() - 0.5) * 130, by = cy + (rnd() - 0.5) * 60;
        const r = 14 + rnd() * 42;
        g.beginPath();
        g.ellipse(bx, by, r * 1.5, r, rnd() * 0.6, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = "rgba(255,255,255,0.85)"; // polar caps
    g.fillRect(0, 0, w, 14);
    g.fillRect(0, h - 18, w, 18);
  });
}

function mapTexture(place: string): THREE.CanvasTexture {
  const rnd = seeded(7);
  return canvasTexture(1024, 576, (g, w, h) => {
    g.fillStyle = STYLE3D.deep;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = STYLE3D.grid;
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = STYLE3D.land; // landmass blobs
    for (let c = 0; c < 10; c++) {
      const cx = rnd() * w, cy = rnd() * h;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.ellipse(cx + (rnd() - 0.5) * 160, cy + (rnd() - 0.5) * 90, 40 + rnd() * 70, 26 + rnd() * 44, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.strokeStyle = STYLE3D.accent; // roads/rivers
    g.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(rnd() * w, 0);
      g.bezierCurveTo(rnd() * w, h * 0.33, rnd() * w, h * 0.66, rnd() * w, h);
      g.stroke();
    }
    // target marker at centre
    g.fillStyle = STYLE3D.data;
    g.beginPath(); g.arc(w / 2, h / 2, 16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = STYLE3D.data; g.lineWidth = 5;
    g.beginPath(); g.arc(w / 2, h / 2, 34, 0, Math.PI * 2); g.stroke();
    if (place) {
      g.font = `700 44px ${STYLE3D.font}`;
      g.fillStyle = "#fff";
      g.textAlign = "center";
      g.fillText(place, w / 2, h / 2 - 58);
    }
  });
}

function circuitTexture(boardColor: string): THREE.CanvasTexture {
  const rnd = seeded(99);
  return canvasTexture(1024, 640, (g, w, h) => {
    g.fillStyle = boardColor;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,190,90,0.85)";
    g.lineWidth = 5;
    for (let i = 0; i < 46; i++) { // traces: right-angle polylines
      let x = rnd() * w, y = rnd() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        if (rnd() > 0.5) x += (rnd() - 0.5) * 320; else y += (rnd() - 0.5) * 220;
        g.lineTo(x, y);
      }
      g.stroke();
      g.fillStyle = "#ffd98a";
      g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "rgba(210,220,230,0.9)"; // pads / chips
    for (let i = 0; i < 26; i++) g.fillRect(rnd() * w, rnd() * h, 26 + rnd() * 60, 16 + rnd() * 30);
    g.fillStyle = "#101418";
    g.fillRect(w * 0.42, h * 0.38, 170, 130); // main chip
    g.strokeStyle = "#ffd98a"; g.lineWidth = 3; g.strokeRect(w * 0.42, h * 0.38, 170, 130);
  });
}

function windowsTexture(): THREE.CanvasTexture {
  const rnd = seeded(5);
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = "#0a1c30";
    g.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 18) for (let x = 8; x < w - 8; x += 18) {
      g.fillStyle = rnd() > 0.45 ? "rgba(255,205,110,0.95)" : "rgba(90,140,180,0.35)";
      g.fillRect(x, y, 10, 11);
    }
  });
}

// ------------------------------------------------------- procedural models

function stdMat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.35, ...opts });
}

export function buildProceduralModel(name: string, accentColor: string): { group: THREE.Group; anchors: Map<string, THREE.Vector3> } {
  const group = new THREE.Group();
  const anchors = new Map<string, THREE.Vector3>();
  const accent = stdMat(accentColor, { emissive: accentColor, emissiveIntensity: 0.25 });
  const body = stdMat("#d7dee6");
  const dark = stdMat("#1c2733");
  const add = (mesh: THREE.Mesh, anchorName: string, anchor: THREE.Vector3) => {
    group.add(mesh);
    anchors.set(anchorName, anchor);
    return mesh;
  };
  switch (name) {
    case "chip": {
      const base = add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 1.8), dark), "top", new THREE.Vector3(0, 0.3, 0));
      base.position.y = 0.15;
      const die = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.9), accent);
      die.position.y = 0.36; group.add(die);
      anchors.set("front", new THREE.Vector3(0, 0.2, 0.95));
      for (let i = -3; i <= 3; i++) for (const s of [-1, 1]) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.34), body);
        pin.position.set(i * 0.24, 0.08, s * 1.05); group.add(pin);
        const pin2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.1), body);
        pin2.position.set(s * 1.05, 0.08, i * 0.24); group.add(pin2);
      }
      break;
    }
    case "ship": {
      const hull = add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 1.1), stdMat("#b3392e")), "deck", new THREE.Vector3(0, 0.75, 0));
      hull.position.y = 0.35;
      const bow = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4), stdMat("#b3392e"));
      bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(2.2, 0.35, 0); group.add(bow);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.8), body);
      bridge.position.set(-1.1, 1.05, 0); group.add(bridge);
      anchors.set("front", new THREE.Vector3(1.4, 0.8, 0.6));
      const cols = ["#35c4ff", "#ff8c1a", "#3fae6a", "#d7dee6"];
      cols.forEach((c, i) => {
        const boxC = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.95), stdMat(c));
        boxC.position.set(-0.3 + i * 0.66, 0.92, 0); group.add(boxC);
      });
      break;
    }
    case "cable": {
      const coil = add(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.3, 14, 40), dark), "top", new THREE.Vector3(0, 1.35, 0));
      coil.rotation.x = Math.PI / 2; coil.position.y = 0.55;
      const coil2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.3, 14, 40), dark);
      coil2.rotation.x = Math.PI / 2; coil2.position.y = 1.15; group.add(coil2);
      const core = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 8, 40), new THREE.MeshBasicMaterial({ color: STYLE3D.data }));
      core.rotation.x = Math.PI / 2; core.position.y = 0.85; group.add(core);
      anchors.set("front", new THREE.Vector3(1.35, 0.85, 0));
      break;
    }
    case "server": {
      const tower = add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 1.6), dark), "top", new THREE.Vector3(0, 2.25, 0));
      tower.position.y = 1.1;
      anchors.set("front", new THREE.Vector3(0, 1.4, 0.85));
      for (let i = 0; i < 5; i++) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.04), stdMat("#0d1620"));
        slot.position.set(0, 0.35 + i * 0.42, 0.82); group.add(slot);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? STYLE3D.data : "#3fae6a" }));
        led.position.set(0.45, 0.35 + i * 0.42, 0.86); group.add(led);
      }
      break;
    }
    case "box": {
      const crate = add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 1.7), stdMat("#8a97a5", { metalness: 0.6, roughness: 0.3 })), "top", new THREE.Vector3(0, 1.2, 0));
      crate.position.y = 0.58;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 1.8), accent);
      lid.position.y = 1.2; group.add(lid);
      const port = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 16), dark);
      port.rotation.x = Math.PI / 2; port.position.set(0, 0.6, 0.9); group.add(port);
      anchors.set("front", new THREE.Vector3(0, 0.6, 0.95));
      break;
    }
    default: { // phone
      const phone = add(new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.1, 0.12), dark), "top", new THREE.Vector3(0, 2.15, 0));
      phone.position.y = 1.05;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.92), new THREE.MeshBasicMaterial({ color: accentColor }));
      screen.position.set(0, 1.05, 0.065); group.add(screen);
      const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), body);
      cam.rotation.x = Math.PI / 2; cam.position.set(-0.32, 1.85, -0.07); group.add(cam);
      anchors.set("front", new THREE.Vector3(0, 1.05, 0.2));
      anchors.set("screen", new THREE.Vector3(0, 1.05, 0.2));
      break;
    }
  }
  return { group, anchors };
}

// ------------------------------------------------------- the scene engine

export interface ExplainerSceneOpts {
  width: number;
  height: number;
  quality?: QualityName;
}

type Updater = (t: number) => void;

export class ExplainerScene {
  duration = 6;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private hud = new THREE.Group(); // cards, attached to the camera
  private tracked: Tracked[] = [];
  private updaters: Updater[] = [];
  private shot: Shot | null = null;
  private assetsBase = "";
  private time = 0;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, opts: ExplainerSceneOpts) {
    const q = QUALITY[opts.quality ?? "medium"] ?? QUALITY.medium;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(opts.width, opts.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(new THREE.Color(STYLE3D.bg), 1);
    this.camera = new THREE.PerspectiveCamera(46, opts.width / opts.height, 0.1, 200);
    this.camera.position.set(0, 1.2, 7);
    this.scene.add(this.root);
    this.scene.add(this.camera);
    this.camera.add(this.hud);
    this.scene.background = new THREE.Color(STYLE3D.bg);
    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(4, 7, 5);
    const rim = new THREE.DirectionalLight(new THREE.Color(STYLE3D.accent), 0.7);
    rim.position.set(-6, 2, -4);
    this.scene.add(amb, dir, rim);
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private resolveUrl(u: string): string {
    if (!u) return "";
    if (/^(https?:|data:|\/)/.test(u)) return u;
    return `${this.assetsBase.replace(/\/?$/, "/")}${u}`;
  }

  // ---- shared builders (used by several templates) ----

  private addLabel(label: ShotLabel, anchorFn: () => THREE.Vector3, parent: THREE.Object3D = this.root) {
    const { sprite } = makeLabelSprite(label.text);
    const group = new THREE.Group();
    group.add(sprite);
    sprite.position.set(0, 0.42, 0);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.36, 0)]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: STYLE3D.accent, transparent: true }));
    group.add(line);
    parent.add(group);
    const tracked: Tracked = { group, anchorFn, line, t0: label.t0, t1: label.t1, baseScale: sprite.scale.clone() };
    this.tracked.push(tracked);
    return tracked;
  }

  private labelsFromShot(resolveAnchor: (l: ShotLabel) => (() => THREE.Vector3) | null) {
    if (!this.shot) return;
    for (const l of this.shot.labels) {
      const fn = resolveAnchor(l);
      if (fn) this.addLabel(l, fn);
    }
  }

  /** HUD data cards: slide in from the right, out again at t1. */
  private addCards(cards: ShotCard[]) {
    cards.forEach((card, i) => {
      const mesh = makeCardPlane(card);
      const y = 0.85 - i * 1.05;
      mesh.position.set(2.6, y, -5);
      this.hud.add(mesh);
      this.updaters.push((t) => {
        const a = card.t0 ?? this.duration * 0.45;
        const b = card.t1 ?? this.duration;
        const inn = seg(t, a, a + 0.6);
        const out = 1 - seg(t, b - 0.5, b);
        const vis = Math.min(inn, Math.max(out, t < b ? 1 : 0));
        mesh.position.x = lerp(3.4, 1.55, easeOut(inn)) ;
        mesh.visible = t >= a - 0.01 && t <= b;
        (mesh.material as THREE.MeshBasicMaterial).opacity = clamp01(vis);
      });
    });
  }

  private finishCommon() {
    // tracked labels: follow anchors, face camera (sprites do), envelope fade
    this.updaters.push((t) => {
      for (const tr of this.tracked) {
        const p = tr.anchorFn();
        tr.group.position.copy(p);
        const v = envelope(t, tr.t0, tr.t1, this.duration);
        tr.group.visible = v > 0.01;
        const s = tr.group.children[0] as THREE.Sprite;
        (s.material as THREE.SpriteMaterial).opacity = v;
        if (tr.line) (tr.line.material as THREE.LineBasicMaterial).opacity = v;
      }
    });
    if (this.shot && this.shot.template !== "data_card") this.addCards(this.shot.cards);
  }

  private cameraPath(t: number, from: THREE.Vector3, to: THREE.Vector3, look: THREE.Vector3, t0 = 0, t1?: number) {
    const p = seg(t, t0, t1 ?? this.duration);
    this.camera.position.lerpVectors(from, to, p);
    this.camera.lookAt(look);
  }

  private orbitCamera(t: number, radius: number, height: number, sweep: number, look = new THREE.Vector3(0, 0.9, 0), centre = 0) {
    const p = clamp01(t / this.duration);
    const ang = centre + lerp(-sweep / 2, sweep / 2, easeInOut(p));
    this.camera.position.set(Math.sin(ang) * radius, height, Math.cos(ang) * radius);
    this.camera.lookAt(look);
  }

  // ---- template builders ----

  private buildGlobe() {
    const shot = this.shot!;
    const params = shot.params as Record<string, unknown>;
    const R = 2;
    const globe = new THREE.Group();
    this.root.add(globe);
    const dayTexUrl = this.resolveUrl(String(params.textureUrl || ""));
    const mat = new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.85, metalness: 0.05 });
    if (dayTexUrl) new THREE.TextureLoader().load(dayTexUrl, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; mat.map = tex; mat.needsUpdate = true; }, undefined, () => { /* keep procedural */ });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), mat);
    globe.add(earth);
    const nightUrl = this.resolveUrl(String(params.textureUrlNight || ""));
    if (nightUrl) {
      const nightMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      const night = new THREE.Mesh(new THREE.SphereGeometry(R * 1.002, 48, 32), nightMat);
      new THREE.TextureLoader().load(nightUrl, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; nightMat.map = tex; nightMat.needsUpdate = true; }, undefined, () => night.removeFromParent());
      globe.add(night);
    }
    // atmosphere: backside fresnel-ish shader halo
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.14, 48, 32),
      new THREE.ShaderMaterial({
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.21,0.77,1.0,1.0) * i; }`,
        blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
      }),
    );
    globe.add(atmo);
    // routes: params.routes = [{fromLat,fromLon,toLat,toLon}] (optional)
    const routes = Array.isArray(params.routes) ? (params.routes as Record<string, number>[]) : [];
    for (const r of routes) {
      const a = latLonToVec3(r.fromLat ?? 0, r.fromLon ?? 0, R * 1.01);
      const b = latLonToVec3(r.toLat ?? 0, r.toLon ?? 0, R * 1.01);
      const arc = makeArc(a, b, 0.3);
      arc.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R + a.distanceTo(b) * 0.3), b), 40, 0.016, 6, false);
      globe.add(arc);
    }
    // default demo route between the first two lat/lon labels, if any
    const ll = shot.labels.filter((l) => l.lat !== undefined && l.lon !== undefined);
    if (!routes.length && ll.length >= 2) {
      globe.add(makeArc(latLonToVec3(ll[0].lat!, ll[0].lon!, R * 1.01), latLonToVec3(ll[1].lat!, ll[1].lon!, R * 1.01), 0.3));
      if (ll.length >= 3) globe.add(makeArc(latLonToVec3(ll[1].lat!, ll[1].lon!, R * 1.01), latLonToVec3(ll[2].lat!, ll[2].lon!, R * 1.01), 0.3));
    }
    // highlighted countries from GeoJSON (graceful skip on any failure)
    const countriesUrl = this.resolveUrl(String(params.countriesUrl || ""));
    if (countriesUrl) {
      const wanted = String(params.highlightCountries || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      fetch(countriesUrl).then((r) => r.json()).then((gj: { features?: { properties?: { name?: string }; geometry?: { type: string; coordinates: unknown } }[] }) => {
        if (this.disposed) return;
        const lineMat = new THREE.LineBasicMaterial({ color: STYLE3D.accent });
        for (const f of gj.features ?? []) {
          const name = String(f.properties?.name ?? "").toLowerCase();
          if (wanted.length && !wanted.includes(name)) continue;
          const polys: number[][][][] = f.geometry?.type === "Polygon" ? (f.geometry.coordinates as number[][][][]) : f.geometry?.type === "MultiPolygon" ? (f.geometry.coordinates as unknown as number[][][][]).flatMap((p) => p as unknown as number[][][]) as never : [];
          const rings: number[][][] = f.geometry?.type === "Polygon" ? (f.geometry.coordinates as number[][][]) : (f.geometry?.coordinates as number[][][][])?.flatMap((p) => p) ?? [];
          void polys;
          for (const ring of rings) {
            const pts = ring.map(([lon, lat]) => latLonToVec3(lat, lon, R * 1.012));
            globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
          }
        }
      }).catch(() => { /* offline / bad GeoJSON: skip silently */ });
    }
    // pins + labels (labels live outside the spinning group so text stays readable;
    // their anchors are recomputed from the globe's current spin each frame)
    const spinSpeed = Number(params.spinSpeed ?? 0.05);
    let spin = 0;
    for (const l of ll) {
      const pin = makePin();
      pin.position.copy(latLonToVec3(l.lat!, l.lon!, R * 1.02));
      globe.add(pin);
    }
    this.labelsFromShot((l) => {
      if (l.lat === undefined || l.lon === undefined) return null;
      const lat = l.lat, lon = l.lon;
      return () => latLonToVec3(lat, lon, R * 1.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), spin);
    });
    const flyLat = Number(shot.camera?.lat ?? params.lat ?? 20);
    const flyLon = Number(shot.camera?.lon ?? params.lon ?? 30);
    const zoom = Number(shot.camera?.zoom ?? params.zoom ?? 1.4);
    this.updaters.push((t) => {
      spin = t * spinSpeed;
      globe.rotation.y = spin;
      if (shot.camera?.mode === "orbit") { this.orbitCamera(t, 5.6, 1.4, 1.2, new THREE.Vector3()); return; }
      const target = latLonToVec3(flyLat, flyLon, 5.6 / Math.max(0.6, zoom)).applyAxisAngle(new THREE.Vector3(0, 1, 0), spin * 0.25);
      const start = new THREE.Vector3(0, 1.6, 7.2);
      const p = seg(t, this.duration * 0.15, this.duration * 0.75);
      this.camera.position.lerpVectors(start, target, p);
      this.camera.position.y += Math.sin(p * Math.PI) * 0.5;
      this.camera.lookAt(0, 0, 0);
    });
  }

  private buildMapZoom() {
    const shot = this.shot!;
    const params = shot.params as Record<string, unknown>;
    const lat = Number(params.lat ?? 31.5), lon = Number(params.lon ?? 74.3);
    // mini globe behind
    const globe = new THREE.Mesh(new THREE.SphereGeometry(2, 40, 28), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.9 }));
    this.root.add(globe);
    // flat map plane
    const mapMat = new THREE.MeshBasicMaterial({ map: mapTexture(String(params.place || "")), transparent: true, opacity: 0 });
    const texUrl = this.resolveUrl(String(params.textureUrl || ""));
    if (texUrl) new THREE.TextureLoader().load(texUrl, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; mapMat.map = tex; mapMat.needsUpdate = true; }, undefined, () => { /* keep canvas map */ });
    const map = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 4.7), mapMat);
    map.position.z = 0.6;
    this.root.add(map);
    const pin = makePin();
    const px = ((lon + 180) / 360 - 0.5) * 8.4, py = ((90 - lat) / 180 - 0.5) * -4.7;
    pin.position.set(px, py, 0.75);
    pin.scale.setScalar(2.2);
    this.root.add(pin);
    this.labelsFromShot((l) => {
      if (l.lat !== undefined && l.lon !== undefined) {
        const x = ((l.lon + 180) / 360 - 0.5) * 8.4, y = ((90 - l.lat) / 180 - 0.5) * -4.7;
        return () => new THREE.Vector3(x, y, 0.8);
      }
      return l.anchor && Array.isArray(l.anchor) ? () => new THREE.Vector3(...(l.anchor as [number, number, number])) : null;
    });
    this.updaters.push((t) => {
      const p = seg(t, this.duration * 0.25, this.duration * 0.8);
      globe.rotation.y = t * 0.06;
      globe.position.z = lerp(0, -2.5, p);
      globe.scale.setScalar(lerp(1, 1.5, p));
      mapMat.opacity = p;
      map.scale.setScalar(lerp(0.55, 1, p));
      pin.visible = p > 0.6;
      const camStart = new THREE.Vector3(0, 1.2, 7.4);
      const camEnd = new THREE.Vector3(px * 0.55, py * 0.55, 4.6);
      this.camera.position.lerpVectors(camStart, camEnd, p);
      this.camera.lookAt(lerp(0, px * 0.55, p), lerp(0, py * 0.55, p), 0);
    });
  }

  private stage(): THREE.Group {
    const grp = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), stdMat(STYLE3D.stage, { roughness: 0.9, metalness: 0 }));
    disc.rotation.x = -Math.PI / 2;
    grp.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: STYLE3D.accent }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.02;
    grp.add(ring);
    const bgTex = canvasTexture(16, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, STYLE3D.deep); grad.addColorStop(1, STYLE3D.bg);
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), new THREE.MeshBasicMaterial({ map: bgTex }));
    bg.position.z = -6;
    grp.add(bg);
    this.root.add(grp);
    return grp;
  }

  private buildHero() {
    const shot = this.shot!;
    const params = shot.params as Record<string, unknown>;
    this.stage();
    const name = String(params.model || "phone");
    const color = String(params.color || STYLE3D.accent);
    const built = buildProceduralModel(name === "cable" ? "cable" : name, color);
    let current: THREE.Group = built.group;
    let anchors = built.anchors;
    this.root.add(current);
    const modelUrl = this.resolveUrl(String(params.modelUrl || ""));
    if (modelUrl) {
      new GLTFLoader().load(modelUrl, (gltf) => {
        if (this.disposed) return;
        current.removeFromParent();
        current = gltf.scene;
        // normalise: scale to ~2.2 units tall, sit on the stage
        const box = new THREE.Box3().setFromObject(current);
        const size = box.getSize(new THREE.Vector3());
        const s = 2.2 / Math.max(size.y, 0.001);
        current.scale.setScalar(s);
        current.position.y = -box.min.y * s;
        anchors = new Map([["top", new THREE.Vector3(0, size.y * s, 0)], ["front", new THREE.Vector3(0, size.y * s * 0.5, size.z * s * 0.55)]]);
        this.root.add(current);
        this.retrackModelLabels(anchors, () => current);
      }, undefined, () => { /* fall back: procedural model already on stage */ });
    }
    this.modelLabelAnchors(anchors, () => current);
    const orbitAmt = Number(params.orbit ?? 0.6);
    this.updaters.push((t) => {
      if (shot.camera?.mode === "dolly") {
        const p = seg(t, 0, this.duration);
        this.camera.position.set(0, 1.5, lerp(7.5, 4.2, p));
        this.camera.lookAt(0, 1, 0);
      } else if (shot.camera?.mode === "static") {
        this.camera.position.set(2.6, 1.8, 5.2);
        this.camera.lookAt(0, 1, 0);
      } else {
        this.orbitCamera(t, 5.4, 1.9, orbitAmt * Math.PI * 1.1, new THREE.Vector3(0, 1, 0), 0.5);
      }
      current.rotation.y = Math.sin(clamp01(t / this.duration) * Math.PI) * 0.15;
    });
  }

  private modelLabelAnchors(anchors: Map<string, THREE.Vector3>, getObj: () => THREE.Group) {
    this.labelsFromShot((l) => {
      if (typeof l.anchor === "string") {
        const name = l.anchor;
        return () => {
          const local = anchors.get(name) ?? new THREE.Vector3(0, 1.4, 0);
          return getObj().localToWorld(local.clone());
        };
      }
      if (Array.isArray(l.anchor)) { const a = l.anchor; return () => new THREE.Vector3(a[0], a[1], a[2]); }
      return () => new THREE.Vector3(0, 1.6, 0);
    });
  }

  private retrackModelLabels(anchors: Map<string, THREE.Vector3>, getObj: () => THREE.Group) {
    // Rebind string-anchored tracked labels to the loaded model's anchors.
    if (!this.shot) return;
    this.shot.labels.forEach((l, i) => {
      if (typeof l.anchor !== "string") return;
      const tr = this.tracked[i];
      if (!tr) return;
      const name = l.anchor;
      tr.anchorFn = () => getObj().localToWorld((anchors.get(name) ?? new THREE.Vector3(0, 1.4, 0)).clone());
    });
  }

  private buildCutaway() {
    const shot = this.shot!;
    const params = shot.params as Record<string, unknown>;
    this.stage();
    const model = String(params.model || "cable");
    const explodeAmt = Number(params.explode ?? 1);
    const defaultParts: Record<string, string[]> = {
      cable: ["Steel armour", "Waterproof jacket", "Power conductor", "Glass fibre core"],
      phone: ["Glass screen", "Display", "Battery", "Main board", "Back cover"],
      ship: ["Hull section", "Cargo deck", "Engine room", "Bridge"],
      chip: ["Heat spreader", "Silicon die", "Substrate"],
      server: ["Front panel", "Drive bays", "Main board", "Power supply"],
    };
    const names = String(params.parts || "").split(",").map((s) => s.trim()).filter(Boolean);
    const partNames = names.length ? names : defaultParts[model] ?? defaultParts.cable;
    const parts: { obj: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    const group = new THREE.Group();
    this.root.add(group);
    const palette = [STYLE3D.accent, "#8a97a5", STYLE3D.data, "#ffd34d", "#3fae6a"];
    partNames.forEach((pname, i) => {
      let obj: THREE.Object3D;
      if (model === "cable") {
        // concentric half-pipe layers along X: radius shrinks per layer
        const r = 0.95 - i * 0.2;
        const geo = new THREE.CylinderGeometry(r, r, 3.4, 24, 1, true, 0, Math.PI);
        const m = new THREE.Mesh(geo, stdMat(palette[i % palette.length], { side: THREE.DoubleSide, emissive: i === partNames.length - 1 ? STYLE3D.data : "#000000", emissiveIntensity: i === partNames.length - 1 ? 0.7 : 0 }));
        m.rotation.z = Math.PI / 2;
        m.position.y = 1.15;
        obj = m;
      } else {
        const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 1.4), stdMat(palette[i % palette.length]));
        m.position.y = 0.35 + i * 0.42;
        obj = m;
      }
      group.add(obj);
      const dir = model === "cable" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 1, 0);
      parts.push({ obj, base: obj.position.clone(), dir });
      void pname;
    });
    // labels: anchor "part-N" or per-part default spread
    this.labelsFromShot((l) => {
      if (typeof l.anchor === "string" && l.anchor.startsWith("part-")) {
        const idx = Math.min(parts.length - 1, Math.max(0, parseInt(l.anchor.slice(5), 10) || 0));
        return () => parts[idx].obj.position.clone().add(new THREE.Vector3(1.2, 0.25, 0));
      }
      if (Array.isArray(l.anchor)) { const a = l.anchor; return () => new THREE.Vector3(a[0], a[1], a[2]); }
      return null;
    });
    if (!shot.labels.length) {
      partNames.forEach((pname, i) => {
        this.addLabel({ text: pname, t0: this.duration * 0.3 + i * 0.3 }, () => parts[i].obj.position.clone().add(new THREE.Vector3(1.3, 0.2, 0)));
      });
    }
    this.updaters.push((t) => {
      const d = this.duration;
      const explode = (seg(t, d * 0.08, d * 0.33) - seg(t, d * 0.7, d * 0.95)) * explodeAmt;
      parts.forEach((p, i) => {
        const spread = model === "cable" ? i * 0.34 : i * 0.3;
        p.obj.position.copy(p.base).addScaledVector(p.dir, explode * spread);
      });
      this.orbitCamera(t, 5.6, 2.1, 0.7, new THREE.Vector3(0, 1.05, 0), 0.35);
    });
  }

  private buildMacro() {
    const shot = this.shot!;
    const params = shot.params as Record<string, unknown>;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 13),
      new THREE.MeshStandardMaterial({ map: circuitTexture(String(params.boardColor || "#0b3d2e")), roughness: 0.7 }),
    );
    const tex = board.material as THREE.MeshStandardMaterial;
    if (tex.map) { tex.map.wrapS = tex.map.wrapT = THREE.RepeatWrapping; tex.map.repeat.set(2, 1); }
    board.rotation.x = -Math.PI / 2;
    this.root.add(board);
    const chip = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 1.3), stdMat("#101418"));
    chip.position.set(0.8, 0.15, -1);
    this.root.add(chip);
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-8, 0, 4.5), new THREE.Vector3(-4, 0, 2), new THREE.Vector3(-1, 0, 0.6),
      new THREE.Vector3(0.8, 0, -1), new THREE.Vector3(4, 0, -2), new THREE.Vector3(8, 0, -4),
    ]);
    const packet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), new THREE.MeshBasicMaterial({ color: STYLE3D.data }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), new THREE.MeshBasicMaterial({ color: STYLE3D.data, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    packet.add(halo);
    this.root.add(packet);
    const trailMat = new THREE.LineBasicMaterial({ color: STYLE3D.data, transparent: true, opacity: 0.9 });
    const trail = new THREE.Line(new THREE.BufferGeometry(), trailMat);
    this.root.add(trail);
    this.labelsFromShot((l) => {
      if (Array.isArray(l.anchor)) { const a = l.anchor; return () => new THREE.Vector3(a[0], a[1], a[2]); }
      return () => path.getPoint(0.5).add(new THREE.Vector3(0, 0.5, 0));
    });
    const speed = Number(params.speed ?? 1);
    this.updaters.push((t) => {
      const p = clamp01((t / this.duration) * speed);
      const pos = path.getPoint(p);
      packet.position.copy(pos).setY(0.28);
      const trailPts: THREE.Vector3[] = [];
      const n = Math.max(2, Math.floor(p * 60));
      for (let i = 0; i <= n; i++) trailPts.push(path.getPoint((i / 60)).setY(0.12));
      trail.geometry.dispose();
      trail.geometry = new THREE.BufferGeometry().setFromPoints(trailPts);
      // camera glides low, behind + above the packet, looking ahead
      const behind = path.getPoint(Math.max(0, p - 0.09));
      this.camera.position.set(behind.x, 1.05, behind.z + 0.4);
      const ahead = path.getPoint(Math.min(1, p + 0.08));
      this.camera.lookAt(ahead.x, 0.2, ahead.z);
    });
  }

  private buildUnderwater() {
    const shot = this.shot!;
    const params = shot.params as Record<string, unknown>;
    const depth = Number(params.depth ?? 0.6);
    this.scene.fog = new THREE.FogExp2(new THREE.Color(STYLE3D.deep), 0.045 + depth * 0.05);
    this.renderer.setClearColor(new THREE.Color(STYLE3D.deep), 1);
    const rnd = seeded(31);
    // sand floor with deterministic bumps
    const floorGeo = new THREE.PlaneGeometry(30, 18, 48, 28);
    const posAttr = floorGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setZ(i, rnd() * 0.35 + Math.sin(posAttr.getX(i) * 0.5) * 0.12);
    }
    floorGeo.computeVertexNormals();
    const floor = new THREE.Mesh(floorGeo, stdMat(STYLE3D.sand, { roughness: 1, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2;
    this.root.add(floor);
    for (let i = 0; i < 16; i++) { // rocks
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + rnd() * 0.6), stdMat("#5c665f", { roughness: 1 }));
      rock.position.set((rnd() - 0.5) * 24, 0.2, (rnd() - 0.5) * 12);
      rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      this.root.add(rock);
    }
    // light rays: translucent slanted planes from the surface
    const rayMat = new THREE.MeshBasicMaterial({ color: STYLE3D.accent, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.1 + rnd(), 9), rayMat);
      ray.position.set(-8 + i * 4 + rnd() * 2, 4.4, -2 + rnd() * 3);
      ray.rotation.z = 0.35;
      this.root.add(ray);
    }
    // cable along the floor + repeater boxes
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-13, 0.22, 2.5), new THREE.Vector3(-6, 0.18, 0.8), new THREE.Vector3(0, 0.22, 0),
      new THREE.Vector3(6, 0.18, -0.8), new THREE.Vector3(13, 0.22, -2.5),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 60, 0.11, 8), stdMat("#14181d", { roughness: 0.6 }));
    this.root.add(cable);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 60, 0.035, 6), new THREE.MeshBasicMaterial({ color: STYLE3D.data }));
    glow.position.y = 0.1;
    this.root.add(glow);
    const repeaters = Math.max(0, Math.floor(Number(params.repeaters ?? 4)));
    for (let i = 0; i < repeaters; i++) {
      const p = cableCurve.getPoint((i + 0.5) / Math.max(1, repeaters));
      const boxM = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.6), stdMat("#8a97a5", { metalness: 0.6, roughness: 0.35 }));
      boxM.position.copy(p).setY(0.32);
      this.root.add(boxM);
    }
    // fish: cone body + tail plane, swimming loops
    const fishCount = Math.max(0, Math.floor(Number(params.fish ?? 7)));
    const fishes: { grp: THREE.Group; cx: number; cz: number; r: number; ph: number; sp: number; y: number }[] = [];
    for (let i = 0; i < fishCount; i++) {
      const grp = new THREE.Group();
      const fbody = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.55, 8), stdMat(i % 2 ? "#c8d4dc" : STYLE3D.data, { roughness: 0.5 }));
      fbody.rotation.z = Math.PI / 2;
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshBasicMaterial({ color: "#9fb4c2", side: THREE.DoubleSide }));
      tail.position.x = -0.36;
      grp.add(fbody, tail);
      this.root.add(grp);
      fishes.push({ grp, cx: (rnd() - 0.5) * 14, cz: (rnd() - 0.5) * 7, r: 1.6 + rnd() * 2.6, ph: rnd() * Math.PI * 2, sp: 0.25 + rnd() * 0.3, y: 1.4 + rnd() * 1.8 });
    }
    this.labelsFromShot((l) => {
      if (Array.isArray(l.anchor)) { const a = l.anchor; return () => new THREE.Vector3(a[0], a[1], a[2]); }
      return () => new THREE.Vector3(0, 0.6, 0);
    });
    this.updaters.push((t) => {
      for (const f of fishes) {
        const a = f.ph + t * f.sp;
        f.grp.position.set(f.cx + Math.cos(a) * f.r, f.y + Math.sin(t * 0.9 + f.ph) * 0.15, f.cz + Math.sin(a) * f.r);
        f.grp.rotation.y = -a;
      }
      const p = clamp01(t / this.duration);
      this.camera.position.set(lerp(-7.5, 7.5, p), 1.7, 5.2 - p * 1.4);
      this.camera.lookAt(lerp(-4, 9, p), 0.5, 0);
    });
  }

  private buildCity() {
    const shot = this.shot!;
    const params = shot.params as Record<string, unknown>;
    const blocks = Math.max(4, Math.floor(Number(params.blocks ?? 9)));
    const rnd = seeded(17);
    const winTex = windowsTexture();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.85 });
    const inst = new THREE.InstancedMesh(geo, mat, blocks * blocks);
    const tops: THREE.Vector3[] = [];
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let x = 0; x < blocks; x++) for (let z = 0; z < blocks; z++) {
      if (rnd() < 0.12) { idx++; continue; } // park gap — still consume the slot
      const hgt = 0.7 + rnd() * 3.1;
      const px = (x - blocks / 2) * 1.55, pz = (z - blocks / 2) * 1.55;
      dummy.position.set(px, 0, pz);
      dummy.scale.set(1.15, hgt, 1.15);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
      if (rnd() > 0.55) tops.push(new THREE.Vector3(px, hgt + 0.05, pz));
      idx++;
    }
    inst.count = idx;
    this.root.add(inst);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(blocks * 1.7 + 6, blocks * 1.7 + 6), stdMat(STYLE3D.deep, { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02;
    this.root.add(ground);
    for (let i = 0; i + 1 < tops.length && i < 6; i += 2) { // rooftop data arcs
      const a = tops[i], b = tops[i + 1];
      const arc = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 1.2, 0)), b), 32, 0.02, 6),
        new THREE.MeshBasicMaterial({ color: STYLE3D.data, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      this.root.add(arc);
    }
    this.labelsFromShot((l) => {
      if (Array.isArray(l.anchor)) { const a = l.anchor; return () => new THREE.Vector3(a[0], a[1], a[2]); }
      return () => (tops[0] ?? new THREE.Vector3(0, 3, 0)).clone();
    });
    this.updaters.push((t) => {
      const p = clamp01(t / this.duration);
      const span = blocks * 0.85;
      this.camera.position.set(lerp(-span, span, p), 4.6 - p * 1.2, 6.4);
      this.camera.lookAt(lerp(-span * 0.4, span * 0.5, p), 0.8, 0);
    });
  }

  private buildDataCard() {
    const shot = this.shot!;
    const params = shot.params as Record<string, unknown>;
    // subtle animated background: drifting dot field (pure function of t)
    const dotGeo = new THREE.BufferGeometry();
    const rnd = seeded(23);
    const pts: number[] = [];
    for (let i = 0; i < 240; i++) pts.push((rnd() - 0.5) * 16, (rnd() - 0.5) * 9, -3 - rnd() * 3);
    dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: STYLE3D.accent, size: 0.045, transparent: true, opacity: 0.5 }));
    this.root.add(dots);
    const mainCard: ShotCard = shot.cards[0] ?? { value: String(params.value || "—"), unit: String(params.unit || ""), sub: params.sub ? String(params.sub) : undefined, t0: 0.4 };
    const cardMesh = makeCardPlane(mainCard, true);
    cardMesh.position.set(0, params.title ? -0.35 : 0, 0);
    this.root.add(cardMesh);
    let titleMesh: THREE.Mesh | null = null;
    if (params.title) {
      titleMesh = makeCardPlane({ value: "", unit: String(params.title) }, false);
      // repaint: title cards reuse the card texture slot but show only text —
      // simpler: a label-style plane via canvas
      const tex = canvasTexture(1024, 200, (g, w, h) => {
        g.fillStyle = STYLE3D.labelBg; g.fillRect(0, 0, w, h);
        g.font = `700 84px ${STYLE3D.font}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(String(params.title), w / 2, h / 2, w - 60);
      });
      (titleMesh.material as THREE.MeshBasicMaterial).map = tex;
      (titleMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
      titleMesh.scale.set(2.2, 0.5, 1);
      titleMesh.position.set(0, 1.75, 0);
      this.root.add(titleMesh);
    }
    this.updaters.push((t) => {
      dots.rotation.z = t * 0.012;
      dots.position.y = Math.sin(t * 0.4) * 0.12;
      const inn = seg(t, mainCard.t0 ?? 0.3, (mainCard.t0 ?? 0.3) + 0.7);
      cardMesh.scale.setScalar(lerp(0.8, 1, easeOut(inn)));
      (cardMesh.material as THREE.MeshBasicMaterial).opacity = inn;
      if (titleMesh) {
        const ti = seg(t, 0, 0.6);
        (titleMesh.material as THREE.MeshBasicMaterial).opacity = ti;
        titleMesh.position.y = lerp(2.1, 1.75, easeOut(ti));
      }
      this.camera.position.set(0, 0, 5.4);
      this.camera.lookAt(0, 0, 0);
    });
  }

  // ---- public API ----

  setShot(shot: Shot, assetsBase = "") {
    this.shot = shot;
    this.assetsBase = assetsBase;
    this.duration = Math.max(0.5, shot.duration || 6);
    // clear previous build
    this.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const m = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose()); else if (m) m.dispose();
    });
    this.root.clear();
    this.hud.clear();
    this.tracked = [];
    this.updaters = [];
    this.scene.fog = null;
    this.renderer.setClearColor(new THREE.Color(STYLE3D.bg), 1);
    switch (shot.template) {
      case "map_zoom": this.buildMapZoom(); break;
      case "hero_object": this.buildHero(); break;
      case "cutaway": this.buildCutaway(); break;
      case "macro_flyover": this.buildMacro(); break;
      case "underwater": this.buildUnderwater(); break;
      case "city_aerial": this.buildCity(); break;
      case "data_card": this.buildDataCard(); break;
      case "globe":
      default: this.buildGlobe(); break;
    }
    this.finishCommon();
    this.seek(this.time);
  }

  seek(tSeconds: number) {
    this.time = Math.min(Math.max(0, tSeconds), this.duration);
    for (const u of this.updaters) u(this.time);
    this.render();
  }

  render() {
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.renderer.dispose();
  }
}
