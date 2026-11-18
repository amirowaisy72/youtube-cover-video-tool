/**
 * Ready-made 3D models (user, 2026-11-18: "realistic environments, not
 * rough boxes"): 1,100+ low-poly models by Kenney (www.kenney.nl), CC0 —
 * houses, shops, skyscrapers, roads, street lights, cars, buses, furniture,
 * trees, rocks, food, animals… The backend downloads a model the first time
 * a world needs it (/api/models/file/…) and keeps it.
 *
 * Every model is shown in OUR look: cartoon shading + dark outline, and at
 * real size (a person is 1.7 m).
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { INK, toonGradient } from "../three3d/kit";

export type KitInfo = {
  id: string; // "city-kit-commercial/building-a"
  cat: string; // building | vehicle | road | streetlight | tree | plant | rock | furniture | food | animal | person | prop
  words: string;
  s: number; // scale to metres
  w: number; h: number; d: number; // real size (metres)
  o: [number, number, number]; // offset that puts the model's base centre at 0
  kb: number;
};

let index: Map<string, KitInfo> | null = null;
let loading: Promise<Map<string, KitInfo>> | null = null;

/** The list of models (small, loaded once). */
export function loadKitIndex(): Promise<Map<string, KitInfo>> {
  if (index) return Promise.resolve(index);
  if (!loading) {
    loading = fetch("/api/models/index").then((r) => r.json()).then((j: { models: KitInfo[] }) => {
      index = new Map(j.models.map((m) => [m.id, m]));
      return index;
    }).catch(() => { index = new Map(); return index; });
  }
  return loading;
}
export function kitInfo(id: string): KitInfo | undefined { return index?.get(id); }
export function kitIndexReady(): boolean { return !!index && index.size > 0; }
export function allKits(): KitInfo[] { return index ? [...index.values()] : []; }

/** Best model for some words ("taxi", "office chair", "palm tree"), optionally of one kind. */
export function findKit(words: string, cat?: string | string[], seed = 0): KitInfo | null {
  if (!index) return null;
  const want = words.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2).map(sing);
  if (!want.length) return null;
  const cats = cat ? (Array.isArray(cat) ? cat : [cat]) : null;
  let best: KitInfo[] = [], bestS = 0;
  for (const m of index.values()) {
    if (cats && !cats.includes(m.cat)) continue;
    const mw = m.words.split(" ").map(sing);
    let s = 0;
    for (const w of want) if (mw.includes(w)) s += 2; else if (mw.some((x) => x.startsWith(w) || w.startsWith(x))) s += 0.5;
    if (m.words.startsWith(want.join(" "))) s += 1.5;
    if (s > bestS) { bestS = s; best = [m]; } else if (s === bestS && s > 0) best.push(m);
  }
  if (bestS < 1.5 || !best.length) return null;
  return best[Math.abs(seed) % best.length]!;
}
function sing(w: string) { return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w; }

// ------------------------------------------------------------------ loading
const templates = new Map<string, THREE.Group>();
const pending = new Map<string, Promise<void>>();
const loader = new GLTFLoader();
const toonCache = new Map<string, THREE.Material>();
const outlineCache = new Map<number, THREE.Material>();

/** A dark outline that grows along the normals (same thickness everywhere). */
function outlineMat(thick: number): THREE.Material {
  const k = Math.round(thick * 10000);
  let m = outlineCache.get(k);
  if (!m) {
    const mm = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    mm.onBeforeCompile = (sh) => {
      sh.uniforms.thick = { value: thick };
      sh.vertexShader = "uniform float thick;\n" + sh.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = position + normalize(normal) * thick;");
    };
    mm.customProgramCacheKey = () => `kit-outline-${k}`;
    m = mm;
    outlineCache.set(k, m);
  }
  return m;
}

function toToon(src: THREE.Material): THREE.Material {
  let m = toonCache.get(src.uuid);
  if (!m) {
    const s = src as THREE.MeshStandardMaterial;
    const t = new THREE.MeshToonMaterial({ color: s.color?.clone() ?? new THREE.Color("#ffffff"), map: s.map ?? null, gradientMap: toonGradient() });
    if (s.map) s.map.colorSpace = THREE.SRGBColorSpace;
    if (s.transparent || (s.opacity ?? 1) < 1) { t.transparent = true; t.opacity = s.opacity; }
    if (s.emissive && s.emissive.getHex()) t.emissive = s.emissive.clone();
    t.side = s.side;
    m = t;
    toonCache.set(src.uuid, m);
  }
  return m;
}

function prepare(id: string, scene: THREE.Object3D): THREE.Group {
  const info = index?.get(id);
  const s = info?.s ?? 1;
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(scene);
  if (info) inner.position.set(...info.o);
  g.add(inner);
  g.scale.setScalar(s);
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  // thin flat things (roads, rugs) get no outline; others a thin one
  const flat = info ? info.h < 0.12 : false;
  const thick = 0.025 / s;
  for (const me of meshes) {
    me.material = Array.isArray(me.material) ? me.material.map(toToon) : toToon(me.material);
    me.castShadow = !flat;
    me.receiveShadow = true;
    if (!flat && me.geometry.attributes.normal) {
      const ol = new THREE.Mesh(me.geometry, outlineMat(thick));
      ol.userData.outline = true;
      ol.raycast = () => {};
      me.add(ol);
    }
  }
  g.userData.kit = id;
  return g;
}

/** Load these models (once; already loaded ones are free). */
export async function preloadKits(ids: Iterable<string>, onProgress?: (done: number, total: number) => void): Promise<void> {
  await loadKitIndex();
  const list = [...new Set(ids)].filter((id) => index?.has(id) && !templates.has(id));
  let done = 0;
  const one = (id: string) => {
    let p = pending.get(id);
    if (!p) {
      p = loader.loadAsync(`/api/models/file/${id}`).then((gl) => { templates.set(id, prepare(id, gl.scene)); })
        .catch(() => { /* stays a simple box */ });
      pending.set(id, p);
    }
    return p.then(() => onProgress?.(++done, list.length));
  };
  // a few at a time (weak PCs, slow internet)
  const queue = list.slice();
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await one(queue.shift()!); }));
}

/** A new copy of a loaded model (geometry and materials shared), or null. */
export function kitInstance(id: string, tint?: string): THREE.Group | null {
  const t = templates.get(id);
  if (!t) return null;
  const c = t.clone(true);
  if (tint) {
    const col = new THREE.Color(tint);
    c.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh || me.userData.outline) return;
      const key = `${(me.material as THREE.Material).uuid}|${tint}`;
      let m = toonCache.get(key) as THREE.MeshToonMaterial | undefined;
      if (!m) {
        m = (me.material as THREE.MeshToonMaterial).clone();
        m.color.multiply(col);
        toonCache.set(key, m);
      }
      me.material = m;
    });
  }
  return c;
}

/** All the "kit" models a world needs. */
export function kitsOf(objs: { type: string; opts?: Record<string, unknown> }[]): string[] {
  return objs.filter((o) => o.type === "kit" && o.opts?.kit).map((o) => String(o.opts!.kit));
}
