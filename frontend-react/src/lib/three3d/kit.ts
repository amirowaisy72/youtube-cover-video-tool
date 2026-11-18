/**
 * Story Animator 3D — shared building blocks: cartoon (toon) materials with
 * thick dark outlines (the same look as the 2D characters), seeded random
 * numbers, text / picture textures and simple shapes.
 */
import * as THREE from "three";

export const INK = 0x1b1b1b;

// Three light steps = the flat "cartoon" shading.
let gradient: THREE.DataTexture | null = null;
export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const matCache = new Map<string, THREE.Material>();
/** A cartoon-shaded material (cached per colour). */
export function toon(color: string | number, opts: { emissive?: number; transparent?: boolean; opacity?: number } = {}): THREE.MeshToonMaterial {
  const key = `${color}|${opts.emissive ?? ""}|${opts.opacity ?? ""}`;
  let m = matCache.get(key) as THREE.MeshToonMaterial | undefined;
  if (!m) {
    m = new THREE.MeshToonMaterial({ color: new THREE.Color(color as THREE.ColorRepresentation), gradientMap: toonGradient() });
    if (opts.emissive) m.emissive = new THREE.Color(opts.emissive);
    if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 0.6; }
    matCache.set(key, m);
  }
  return m;
}

const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
/** Mesh with a dark outline (an inverted, slightly bigger copy behind it). */
export function mesh(geo: THREE.BufferGeometry, color: string | number, outline = 0.045, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, toon(color));
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (outline > 0) {
    const o = new THREE.Mesh(geo, outlineMat);
    o.scale.setScalar(1 + outline);
    o.userData.outline = true;
    m.add(o);
  }
  return m;
}

/** Outline that grows by a fixed thickness (good for long thin limbs). */
export function limbMesh(radius: number, length: number, color: string | number, ink = 0.018): THREE.Mesh {
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.001, length), 4, 10);
  geo.translate(0, -length / 2, 0); // hangs down from its joint
  const m = new THREE.Mesh(geo, toon(color));
  m.castShadow = true;
  const og = new THREE.CapsuleGeometry(radius + ink, Math.max(0.001, length), 4, 10);
  og.translate(0, -length / 2, 0);
  const o = new THREE.Mesh(og, outlineMat);
  o.userData.outline = true;
  m.add(o);
  return m;
}

export function box(w: number, h: number, d: number, color: string | number, outline = 0.02): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), color, outline);
}
export function sphere(r: number, color: string | number, outline = 0.06, seg = 20): THREE.Mesh {
  return mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), color, outline);
}
export function cyl(rt: number, rb: number, h: number, color: string | number, outline = 0.04, seg = 16): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, outline);
}
export function cone(r: number, h: number, color: string | number, outline = 0.05, seg = 14): THREE.Mesh {
  return mesh(new THREE.ConeGeometry(r, h, seg), color, outline);
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

// ------------------------------------------------------------ randomness
export function rng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pickOf = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)]!;

export function shade(hex: string, amt: number): string {
  const v = parseInt(hex.replace("#", ""), 16);
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x + amt)));
  return `#${((c((v >> 16) & 255) << 16) | (c((v >> 8) & 255) << 8) | c(v & 255)).toString(16).padStart(6, "0")}`;
}

// ------------------------------------------------------------- textures
/** A flat sign / board with text drawn on it. */
export function textTexture(text: string, bg: string, fg: string, w = 512, h = 128, font = "bold 64px Arial"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  x.fillStyle = fg;
  x.font = font;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Any drawing (canvas callback) as a texture. */
export function drawnTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A soft round puff (smoke / dust / clouds of particles). */
let puffTex: THREE.CanvasTexture | null = null;
export function puffTexture(): THREE.CanvasTexture {
  if (puffTex) return puffTex;
  puffTex = drawnTexture(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  });
  return puffTex;
}

/** An SVG string or picture URL loaded into a texture (pop-ups, emotes, your pictures). */
export async function imageTexture(src: string): Promise<THREE.Texture> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image"));
    img.src = src.startsWith("<svg") ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src) : src;
  });
  const c = document.createElement("canvas");
  const s = Math.min(1024, Math.max(img.naturalWidth || 256, 256));
  c.width = s; c.height = Math.round(s * ((img.naturalHeight || s) / (img.naturalWidth || s)));
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A picture standing upright in the world (always facing the camera). */
export function billboard(tex: THREE.Texture, height: number): THREE.Sprite {
  const img = tex.image as { width: number; height: number };
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const aspect = img ? img.width / img.height : 1;
  s.scale.set(height * aspect, height, 1);
  s.center.set(0.5, 0);
  return s;
}

export function dispose(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
}
