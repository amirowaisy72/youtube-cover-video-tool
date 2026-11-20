/**
 * 3D World — the living world at run time. Builds a WorldDoc into a 3D set
 * and plays it frame by frame (every frame can be drawn on its own, so
 * the preview can jump around and the video encoder gets the same picture):
 *
 *  - wind: trees, branches, bushes, flowers and every blade of grass sway
 *  - grass bends where characters walk (and stays a bit flat behind them)
 *  - rivers flow (things that float drift away), fish swim and jump
 *  - things fall with gravity, bounce, roll, splash into water or float
 *  - trees fall when chopped, branches drop when cut, fruit drops on shaking
 *  - doors swing, fires burn with smoke, birds fly, animals wander
 *
 * The characters' "brain" (brain.ts) tells the world what happens and
 * when (schedule…), and the world remembers it for every frame.
 */
import * as THREE from "three";
import { at, drawnTexture, pickOf, puffTexture, rng, shade, sphere } from "../three3d/kit";
import { clouds, type Ctx, mountains, type PlaceLight, skyDome, sunMoon } from "../three3d/places";
import { type Built, buildObject, rodMesh, axeMesh, type ThingSpec } from "./catalog";
import { targetJoints } from "../three3d/human";
import { kitInfo } from "./kits";
import { CATALOG_BY_TYPE, hasTrait, optOf, type TraitId, type Vec2, type WorldDoc, type WorldObj } from "./types";

const G = 16 / (24 * 24); // gravity per frame² (cartoon-strong)
const FPS = 24;

// ------------------------------------------------------------------ types
type Seg =
  | { f: number; mode: "home" }
  | { f: number; mode: "held"; cid: string; side: Side; eatFrom?: number; bites?: number[] }
  | { f: number; mode: "path"; pos: Float32Array; quat: Float32Array; len: number }
  | { f: number; mode: "gone" };

export type Side = "l" | "r" | "m" | "c"; // left hand, right hand, mouth (animals), both hands (chest)
export type Thing = ThingSpec & {
  id: string;
  homeParent: THREE.Object3D;
  homePos: THREE.Vector3; homeQuat: THREE.Quaternion; homeScale: THREE.Vector3;
  owner: RObj | null;
  segs: Seg[];
  auto?: (n: number, o: THREE.Object3D) => void; // fish swimming while "home"
  busyUntil: number; // the brain: someone is using it
};

export type RObj = {
  o: WorldObj; b: Built;
  pos: THREE.Vector3; // scene coords of the object
  yaw: number; // scene rotation
  front: THREE.Vector3; // where a character stands to use it
  words: string[];
  chop?: { f: number; dir: number };
  states?: ObjState[]; // broken / fixed / fallen / hidden… (custom actions)
  drives?: { f0: number; f1: number; dist: number }[]; // driven / ridden along its own front
  base?: { x: number; y: number; z: number; rotY: number; visible: boolean; mats?: Map<THREE.Mesh, THREE.Color> };
  stVis?: boolean; // its story state says it is seen (not hidden / not yet built)
  arriveAt?: number; // a train that must wait (the track is being mended) comes in from this frame
  shakes: [number, number][];
  doors: { f: number; open: boolean }[];
  litAt: number | null;
};

export type Water = {
  kind: "river" | "pond" | "well";
  obj: RObj;
  contains: (x: number, z: number) => boolean;
  depthAt: (x: number, z: number) => number;
  nearest: (x: number, z: number) => { x: number; z: number; bx: number; bz: number; tx: number; tz: number }; // centre point, bank point, flow dir
  flow: (x: number, z: number) => [number, number];
  surface: number;
  half: number; // half the width (river) / radius (pond)
  /** a point d metres along the water from near (x0, z0), "lane" metres off the middle; and the direction there */
  along: (x0: number, z0: number, d: number, lane: number) => { x: number; z: number; dx: number; dz: number; nz: number };
};

type Particle = { f: number; kind: "splash" | "leaves" | "dust" | "sparkle" | "ripple" | "sparks" | "smoke" | "fire"; x: number; y: number; z: number; n: number; color?: string; big?: number };
/** What happens to a thing in the story (user, 2026-11-18): it breaks, gets fixed, falls, appears… and stays that way. */
export type ObjState = { f: number; kind: "break" | "fix" | "hide" | "show" | "fall" | "glow" | "color"; color?: string };

export type UpdateCtx = {
  hand: (cid: string, side: Side, out: THREE.Vector3) => boolean;
  yawOf: (cid: string) => number;
  walkers: { x: number; z: number; s: number }[]; // grass bending
};

export type WorldLook = { light: PlaceLight; bare: boolean };

// ------------------------------------------------------------- the world
export class World {
  group = new THREE.Group(); // scene coordinates
  content = new THREE.Group(); // the objects (moved so the stage is at 0,0)
  free = new THREE.Group(); // things that left their home (falling, held…)
  light: PlaceLight;
  objects: RObj[] = [];
  things: Thing[] = [];
  waters: Water[] = [];
  solids: { x: number; z: number; r: number }[] = [];
  doc: WorldDoc;
  private hills: { x: number; z: number; r: number; h: number }[] = [];
  private bridges: { m: THREE.Matrix4; inv: THREE.Matrix4; len: number; w: number }[] = [];
  private floors: { inv: THREE.Matrix4; ft: NonNullable<Built["floorTop"]>; oy: number }[] = [];
  private updates: ((n: number) => void)[] = [];
  private particles: Particle[] = [];
  private sprites: THREE.Sprite[] = [];
  private rings: THREE.Mesh[] = [];
  private grassMat: THREE.MeshBasicMaterial | null = null;
  private grassU = { uTime: { value: 0 }, uWind: { value: 0.5 }, uPush: { value: Array.from({ length: 16 }, () => new THREE.Vector3(999, 999, 0)) } };
  private waterTex: THREE.Texture[] = [];
  private stageM = new THREE.Matrix4();
  private stageInv = new THREE.Matrix4();
  private r: () => number;
  private leafTex: THREE.Texture;
  private dropTex: THREE.Texture;
  bare: boolean;
  n0 = 0; // the first frame of the scene (a train arrives soon after it starts)
  n1 = 0; // its last frame (the train leaves just before the scene ends)

  constructor(doc: WorldDoc, opts: { bare?: boolean; seed?: number } = {}) {
    this.doc = doc;
    this.bare = !!opts.bare;
    this.r = rng((opts.seed ?? 7) * 7919 + doc.objects.length);
    const st = doc.stage ?? { x: 0, z: 0, rot: 0 };
    this.stageM.makeRotationY(st.rot).setPosition(st.x, 0, st.z).invert();
    this.stageInv.copy(this.stageM).invert();
    this.content.applyMatrix4(this.stageM);
    this.group.add(this.content, this.free);
    this.leafTex = drawnTexture(64, 64, (x) => { x.fillStyle = "#4caf50"; x.beginPath(); x.ellipse(32, 32, 26, 12, 0.6, 0, Math.PI * 2); x.fill(); x.strokeStyle = "#1b1b1b"; x.lineWidth = 3; x.stroke(); });
    this.dropTex = drawnTexture(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(190,225,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    this.light = this.buildSky();
    this.buildObjects();
    if (doc.room) this.buildRoom();
    else if (!this.bare) { this.buildGround(); this.buildGrass(); }
    this.buildFish();
    this.attachLife();
    this.buildParticles();
  }

  /** world-file point → scene point */
  toScene(x: number, z: number): THREE.Vector3 { return new THREE.Vector3(x, 0, z).applyMatrix4(this.stageM); }
  /** scene point → world-file point */
  toDoc(x: number, z: number): THREE.Vector3 { return new THREE.Vector3(x, 0, z).applyMatrix4(this.stageInv); }

  // ---------------------------------------------------------------- sky
  private buildSky(): PlaceLight {
    const d = this.doc;
    const c: Ctx = { g: this.group, r: this.r, span: 9, seed: 1, updates: this.updates };
    const night = d.time === "night", sunset = d.time === "sunset";
    const p = night ? { top: "#0b1640", bottom: "#2b3a67", sun: "#a5b4fc", sunI: 0.75, hemi: 0.5, fog: "#1e2a50" }
      : sunset ? { top: "#ff8a4c", bottom: "#ffe3b8", sun: "#ffb27a", sunI: 2.0, hemi: 1.2, fog: "#ffd9b0" }
        : { top: "#5aaeff", bottom: "#d9f0ff", sun: "#fff3c4", sunI: 2.6, hemi: 1.5, fog: "#cfe9ff" };
    const jungle = d.ground === "jungle";
    const winter = d.season === "winter";
    if (d.room) {
      // inside: no sky; soft room light
      return { skyTop: "#1f2937", skyBottom: "#2a2633", fog: "#2a2633", fogNear: 40, fogFar: 140, hemiSky: "#fff7ed", hemiGround: "#a8a29e",
        hemi: night ? 1.15 : 1.35, sun: "#fff3c4", sunI: night ? 0.95 : 1.6, sunPos: [3, 8, 6], night, indoor: true };
    }
    if (!this.bare) {
      skyDome(c, p.top, p.bottom);
      sunMoon(c, night ? "#f8f4d7" : sunset ? "#ff7b3a" : "#ffe066", night);
      if (!night) clouds(c, 7);
      if (d.ground !== "moon") mountains(c, night ? "#3b4a6b" : d.ground === "snow" ? "#c7d2fe" : "#9fb0c8", d.ground === "snow");
    }
    const mist = Math.max(d.fog ?? 0, winter ? 0.45 : 0);
    const fogC = winter && !night ? "#dfe7ef" : jungle ? (night ? "#14301c" : "#a9d8a0") : p.fog;
    return {
      skyTop: p.top, skyBottom: winter && !night ? "#e2e8f0" : p.bottom, fog: fogC,
      fogNear: (jungle ? 14 : 30) * (1 - mist * 0.7), fogFar: (jungle ? 70 : 130) * (1 - mist * 0.55),
      hemiSky: p.top, hemiGround: "#556b3a", hemi: p.hemi, sun: p.sun, sunI: p.sunI, sunPos: [8, 14, 10], night, indoor: false,
    };
  }

  // ------------------------------------------------------------ objects
  private buildObjects() {
    const jungle = this.doc.ground === "jungle";
    for (const o of this.doc.objects) {
      const b = buildObject(o, rng(hashStr(o.id) + 3), jungle, this.doc.models);
      if (!b) continue;
      const cat = CATALOG_BY_TYPE.get(o.type);
      const line = !!cat?.line;
      // a designed thing can do what its design says (unless switched off)
      if (b.abilities?.length) { const tr = { ...(o.traits ?? {}) }; for (const a of b.abilities) if (tr[a] === undefined) tr[a] = true; o.traits = tr; }
      if (!line) {
        b.root.position.set(o.x, o.opts?.moves ? 0 : Number(o.opts?.y ?? 0), o.z); // y: on a table, a bridge deck…
        b.root.rotation.y = o.rot ?? 0;
        if (o.type !== "hill") this.content.add(b.root);
      } else this.content.add(b.root);
      this.content.updateMatrixWorld(true);
      const pos = line ? this.toScene(o.points?.[0]?.[0] ?? o.x, o.points?.[0]?.[1] ?? o.z)
        : o.type === "hill" ? this.toScene(o.x, o.z) : b.root.getWorldPosition(new THREE.Vector3());
      const yaw = (o.rot ?? 0) - (this.doc.stage?.rot ?? 0);
      const frontLocal = b.door ? b.door.front.clone() : new THREE.Vector3(0, 0, b.radius + 0.45);
      const front = b.root.localToWorld(frontLocal.clone());
      const words = [...(cat?.words ?? []), ...(o.name ? [o.name.toLowerCase()] : [])];
      if (o.type === "animal") words.push(String(o.opts?.species ?? "animal"));
      if (o.type === "model") { const nm = String(o.opts?.model ?? ""); words.push(nm, ...nm.split(/[ _-]/), String(this.doc.models?.[nm]?.label ?? "").toLowerCase()); }
      if (o.type === "item") words.push(String(o.opts?.word ?? ""));
      if (o.type === "kit") words.push(...kitWords(String(o.opts?.kit ?? ""), kitInfo(String(o.opts?.kit ?? ""))?.words ?? ""));
      if (o.type === "person") words.push(String(o.opts?.who ?? "person"));
      const ro: RObj = { o, b, pos, yaw, front, words, shakes: [], doors: [], litAt: b.fire && (o.opts?.lit ?? true) !== false ? -1e9 : null };
      this.objects.push(ro);
      if (b.solid) this.solids.push({ x: pos.x, z: pos.z, r: Math.max(0.35, b.radius * (b.door ? 0.95 : 0.7)) });
      if (b.hill) this.hills.push({ x: pos.x, z: pos.z, r: b.hill.r, h: b.hill.h });
      if (b.bridge) {
        const m = b.root.matrixWorld.clone();
        this.bridges.push({ m, inv: m.clone().invert(), len: b.bridge.len, w: b.bridge.width });
      }
      if (b.water) this.buildWater(ro);
      if (b.floorTop && !o.opts?.moves) this.floors.push({ inv: b.root.matrixWorld.clone().invert(), ft: b.floorTop, oy: b.root.getWorldPosition(new THREE.Vector3()).y });
      this.updates.push((n) => ro.b.update?.(n, this.doc.wind));
      // things (fruit, stones, ball…)
      for (const t of b.things) {
        t.obj.updateMatrixWorld(true);
        const th: Thing = {
          ...t, id: `${o.id}:${this.things.length}`, homeParent: t.obj.parent!, homePos: t.obj.position.clone(),
          homeQuat: t.obj.quaternion.clone(), homeScale: t.obj.scale.clone(), owner: ro, segs: [{ f: -1e9, mode: "home" }], busyUntil: -1,
        };
        th.obj.userData.thing = th.id;
        this.things.push(th);
      }
    }
    // ground under things that sit on hills
    for (const ro of this.objects) {
      if (CATALOG_BY_TYPE.get(ro.o.type)?.line || ro.b.water || ro.b.floorTop || ro.o.opts?.fromGround) continue; // a cliff face stands on the real ground
      const h = this.heightAt(ro.pos.x, ro.pos.z, true);
      if (h !== 0) { ro.b.root.position.y += h; ro.pos.y = h; ro.front.y = this.heightAt(ro.front.x, ro.front.z, true); }
      if (ro.b.boat) ro.b.root.position.y = 0.02;
    }
  }

  // -------------------------------------------------------------- water
  private waterTexture(color: string): THREE.Texture {
    const t = drawnTexture(256, 128, (x) => {
      x.fillStyle = color; x.fillRect(0, 0, 256, 128);
      x.strokeStyle = shade(color, 45); x.lineWidth = 3; x.lineCap = "round";
      const rr = rng(5);
      for (let i = 0; i < 26; i++) {
        const y = rr() * 128, x0 = rr() * 256, w = 20 + rr() * 40;
        x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo(x0 + w / 2, y - 4, x0 + w, y); x.stroke();
      }
      x.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < 30; i++) x.fillRect(rr() * 256, rr() * 128, 3, 2);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    this.waterTex.push(t);
    return t;
  }
  private buildWater(ro: RObj) {
    const w = ro.b.water!;
    const night = this.doc.time === "night";
    const col = night ? "#1e3a8a" : this.doc.ground === "jungle" ? "#2a9d8f" : "#3b9ae1";
    if (w.kind === "river" || w.kind === "path") {
      const pts = (w.pts ?? []).map(([x, z]) => this.toScene(x, z));
      if (pts.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(pts);
      const len = curve.getLength();
      const N = Math.max(8, Math.ceil(len / 0.5));
      const cs: THREE.Vector3[] = [], ts: THREE.Vector3[] = [];
      for (let i = 0; i <= N; i++) { cs.push(curve.getPointAt(i / N)); ts.push(curve.getTangentAt(i / N)); }
      const half = (w.width ?? 3) / 2;
      const ribbon = (hw: number, y: number, mat: THREE.Material, uScale: number) => {
        const pos: number[] = [], uv: number[] = [], idx: number[] = [];
        for (let i = 0; i <= N; i++) {
          const c = cs[i]!, t = ts[i]!;
          const nx = -t.z, nz = t.x;
          pos.push(c.x + nx * hw, y, c.z + nz * hw, c.x - nx * hw, y, c.z - nz * hw);
          uv.push((i / N) * len * uScale, 0, (i / N) * len * uScale, 1);
          if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(idx);
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, mat);
        m.receiveShadow = true;
        m.userData.objId = ro.o.id;
        this.group.add(m);
        return m;
      };
      if (w.kind === "path") {
        ribbon(half, 0.012, new THREE.MeshToonMaterial({ color: this.doc.ground === "snow" ? "#e5e7eb" : "#c9a36b" }), 1);
        return;
      }
      ribbon(half + 0.55, 0.008, new THREE.MeshToonMaterial({ color: this.doc.ground === "sand" ? "#e8c77d" : "#b8955e" }), 1);
      const tex = this.waterTexture(col);
      ribbon(half, 0.03, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.86, depthWrite: false }), 1 / 6);
      const flowSpeed = hasTrait(ro.o, "flowing") ? 0.03 : 0.004;
      this.updates.push((n) => { tex.offset.x = -n * flowSpeed / 6 * 1.0; });
      const nearestOn = (x: number, z: number) => {
        let best = 1e9, bi = 0;
        for (let i = 0; i <= N; i++) { const c = cs[i]!; const d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < best) { best = d; bi = i; } }
        return { i: bi, d: Math.sqrt(best) };
      };
      this.waters.push({
        kind: "river", obj: ro, surface: 0.03,
        contains: (x, z) => nearestOn(x, z).d < half,
        depthAt: (x, z) => { const d = nearestOn(x, z).d; return d < half ? 0.75 * (1 - (d / half) ** 2) : 0; },
        nearest: (x, z) => {
          const { i } = nearestOn(x, z);
          const c = cs[i]!, t = ts[i]!;
          let nx = -t.z, nz = t.x;
          if ((x - c.x) * nx + (z - c.z) * nz < 0) { nx = -nx; nz = -nz; }
          return { x: c.x, z: c.z, bx: c.x + nx * (half + 0.45), bz: c.z + nz * (half + 0.45), tx: t.x, tz: t.z };
        },
        flow: (x, z) => { const t = ts[nearestOn(x, z).i]!; return [t.x * flowSpeed, t.z * flowSpeed]; },
        half,
        along: (x0, z0, d, lane) => {
          const i0 = nearestOn(x0, z0).i, step = len / N;
          const fi = Math.max(0, Math.min(N - 0.001, i0 + d / step));
          const i = Math.floor(fi), k = fi - i;
          const a = cs[i]!, b = cs[Math.min(N, i + 1)]!, t = ts[i]!;
          const nx = -t.z, nz = t.x;
          return { x: a.x + (b.x - a.x) * k + nx * lane, z: a.z + (b.z - a.z) * k + nz * lane, dx: t.x, dz: t.z, nz };
        },
      });
    } else {
      const R = w.radius ?? 3;
      const c = ro.pos.clone();
      const shore = new THREE.Mesh(new THREE.CircleGeometry(R + 0.55, 40), new THREE.MeshToonMaterial({ color: "#b8955e" }));
      shore.rotation.x = -Math.PI / 2; shore.position.set(c.x, 0.008, c.z);
      this.group.add(shore);
      const tex = this.waterTexture(col);
      tex.repeat.set(R / 3, R / 3);
      const m = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.86, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(c.x, 0.03, c.z);
      m.userData.objId = ro.o.id;
      this.group.add(m);
      this.updates.push((n) => { tex.offset.set(Math.sin(n / 90) * 0.05, n * 0.0006); });
      this.waters.push({
        kind: "pond", obj: ro, surface: 0.03,
        contains: (x, z) => Math.hypot(x - c.x, z - c.z) < R,
        depthAt: (x, z) => { const d = Math.hypot(x - c.x, z - c.z); return d < R ? 0.8 * (1 - (d / R) ** 2) : 0; },
        nearest: (x, z) => {
          const a = Math.atan2(z - c.z, x - c.x);
          return { x: c.x + Math.cos(a) * R * 0.4, z: c.z + Math.sin(a) * R * 0.4, bx: c.x + Math.cos(a) * (R + 0.45), bz: c.z + Math.sin(a) * (R + 0.45), tx: -Math.sin(a), tz: Math.cos(a) };
        },
        flow: () => [0, 0],
        half: R,
        along: (x0, z0, d, lane) => {
          const rr = R * 0.6 + lane;
          const a = Math.atan2(z0 - c.z, x0 - c.x) + d / Math.max(0.5, rr);
          return { x: c.x + Math.cos(a) * rr, z: c.z + Math.sin(a) * rr, dx: -Math.sin(a), dz: Math.cos(a), nz: Math.sin(a) };
        },
      });
    }
  }

  /** Ground height (hills, river beds, bridges) in scene coords. */
  heightAt(x: number, z: number, noWater = false, noFloors = false): number {
    let h = 0;
    for (const hl of this.hills) {
      const d = Math.hypot(x - hl.x, z - hl.z);
      if (d < hl.r) h += hl.h * 0.5 * (1 + Math.cos(Math.PI * d / hl.r));
    }
    for (const br of this.bridges) {
      const p = new THREE.Vector3(x, 0, z).applyMatrix4(br.inv);
      if (Math.abs(p.x) < br.len / 2 && Math.abs(p.z) < br.w / 2) return 0.32 * (1 - (2 * p.x / br.len) ** 2) + 0.09;
    }
    if (!noFloors) for (const f of this.floors) {
      const p = new THREE.Vector3(x, f.oy, z).applyMatrix4(f.inv);
      if (Math.abs(p.x - f.ft.cx) < f.ft.w / 2 && Math.abs(p.z - f.ft.cz) < f.ft.d / 2) h = Math.max(h, f.oy + f.ft.h);
    }
    if (!noWater) for (const w of this.waters) { const d = w.depthAt(x, z); if (d > 0) return -d; } // water lies flat, even between hills
    return h;
  }
  waterAt(x: number, z: number): Water | null {
    for (const w of this.waters) if (w.contains(x, z)) return w;
    return null;
  }
  onBridge(x: number, z: number): boolean {
    for (const br of this.bridges) {
      const p = new THREE.Vector3(x, 0, z).applyMatrix4(br.inv);
      if (Math.abs(p.x) < br.len / 2 && Math.abs(p.z) < br.w / 2) return true;
    }
    return false;
  }

  // ------------------------------------------------------------- ground
  private groundColor(): string {
    const night = this.doc.time === "night";
    if (this.doc.season === "winter" && this.doc.ground !== "snow") {
      const w = { grass: "#a7b98c", jungle: "#7f9c6a", farm: "#b5b98a", dirt: "#b49a76", sand: "#d8c59a", rock: "#a8a29e", moon: "#9ca3af", snow: "#f1f5f9" }[this.doc.ground] ?? "#a7b98c";
      return night ? shade(w, -70) : w;
    }
    if (this.doc.season === "autumn" && this.doc.ground === "grass") return night ? shade("#b5b55f", -70) : "#b5b55f";
    const c = { grass: "#8cc66b", jungle: "#5e9e45", sand: "#f2d48f", snow: "#f1f5f9", dirt: "#c9a36b", rock: "#a8a29e", farm: "#a3d977", moon: "#9ca3af" }[this.doc.ground] ?? "#8cc66b";
    return night ? shade(c, -70) : c;
  }
  private buildGround() {
    const size = 90, seg = 150;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const base = new THREE.Color(this.groundColor()), tmp = new THREE.Color();
    const cols: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const onBridge = this.onBridge(x, z);
      pos.setY(i, onBridge ? this.heightAt(x, z, true) : this.heightAt(x, z, false, true) - (this.waterAt(x, z) ? 0.02 : 0)); // the ground itself: under the pavements / platforms
      const nse = Math.sin(x * 0.35) * Math.cos(z * 0.41) + Math.sin(x * 0.11 + z * 0.17);
      tmp.copy(base).offsetHSL(0, 0, nse * 0.025);
      if (this.waterAt(x, z)) tmp.set("#6b5a3e");
      cols.push(tmp.r, tmp.g, tmp.b);
    }
    for (const br of this.bridges) void br;
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true }));
    m.receiveShadow = true;
    this.group.add(m);
    const far = new THREE.Mesh(new THREE.RingGeometry(size * 0.7, 160, 32), new THREE.MeshToonMaterial({ color: base }));
    far.rotation.x = -Math.PI / 2; far.position.y = -0.02;
    this.group.add(far);
    // far away trees / dunes all around, so the world never ends
    const rr = rng(99 + this.doc.objects.length);
    const c: Ctx = { g: this.group, r: rr, span: 9, seed: 3, updates: this.updates };
    void c;
    const g = this.doc.ground;
    for (let i = 0; i < 46; i++) {
      const a = rr() * Math.PI * 2, d = 26 + rr() * 22;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (z > 8) continue; // keep the view behind the camera free
      if (this.doc.objects.some((o) => o.type === "kit")) break; // a detailed ready-made place has its own surroundings
      if (this.floors.some((f) => { const p = new THREE.Vector3(x, f.oy, z).applyMatrix4(f.inv); return Math.abs(p.x - f.ft.cx) < f.ft.w / 2 && Math.abs(p.z - f.ft.cz) < f.ft.d / 2; })) continue;
      const s = 1.2 + rr() * 1.2;
      if (g === "sand" || g === "moon") { const dn = sphere(3 * s, shade(this.groundColor(), -10), 0, 12); dn.scale.y = 0.3; dn.position.set(x, 0, z); this.group.add(dn); continue; }
      const t = new THREE.Group();
      const leaf = g === "snow" ? "#2f7d4a" : pickOf(rr, g === "jungle" ? ["#2f7d3a", "#2d6e3e", "#3a8f45"] : ["#4caf50", "#5fae55", "#3f9d4a", "#6fbf5a"]);
      t.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.28 * s, 2.4 * s, 6), new THREE.MeshToonMaterial({ color: "#7a4b24" })), 0, 1.2 * s, 0));
      if (g === "snow" || rr() < 0.3) t.add(at(new THREE.Mesh(new THREE.ConeGeometry(1.4 * s, 3.2 * s, 8), new THREE.MeshToonMaterial({ color: leaf })), 0, 3.4 * s, 0));
      else t.add(at(new THREE.Mesh(new THREE.SphereGeometry(1.5 * s, 10, 8), new THREE.MeshToonMaterial({ color: leaf })), 0, 3.3 * s, 0));
      t.position.set(x, this.heightAt(x, z), z);
      this.group.add(t);
    }
  }

  // -------------------------------------------------------------- grass
  private buildGrass() {
    const amount = this.doc.grass ?? (["grass", "jungle", "farm"].includes(this.doc.ground) ? 1 : 0);
    if (amount <= 0) return;
    // one tuft = 3 thin blades; every tuft an instance
    const pos: number[] = [], col: number[] = [];
    for (let b = 0; b < 3; b++) {
      const a = (b / 3) * Math.PI + 0.3, cx = Math.cos(a), cz = Math.sin(a), lean = (b - 1) * 0.12;
      const w = 0.045;
      const quad = [[-w, 0], [w, 0], [0, 1]] as const;
      for (const [u, v] of quad) {
        pos.push(u * cx + lean * v, v, u * cz + lean * v * 0.5);
        const k = v;
        col.push(0.55 + k * 0.45, 0.6 + k * 0.4, 0.5 + k * 0.4);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const base = new THREE.Color(this.groundColor()).offsetHSL(0, 0.05, 0.02);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, color: base, side: THREE.DoubleSide });
    const u = this.grassU;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uWind; uniform vec3 uPush[16];")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float hh = position.y;
  float kk = hh * hh;
  float wv = sin(uTime * 0.06 + ip.x * 0.45 + ip.z * 0.25) * 0.6 + sin(uTime * 0.17 + ip.x * 1.3) * 0.25;
  vec2 bend = vec2(wv * uWind * 0.45, wv * uWind * 0.18);
  for (int i = 0; i < 16; i++) {
    vec2 d = ip.xz - uPush[i].xy;
    float dist = length(d);
    float s = uPush[i].z * (1.0 - smoothstep(0.15, 0.7, dist));
    bend += normalize(d + vec2(0.0001)) * s * 1.6;
  }
  float sc = max(0.05, length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2])));
  transformed.xz += bend * kk / sc;
  transformed.y *= 1.0 - min(0.65, length(bend) * 0.55);
#endif`);
    };
    this.grassMat = mat;
    const rr = rng(1234 + this.doc.objects.length);
    const X0 = -16, X1 = 16, Z0 = -13, Z1 = 7;
    const count = Math.round((X1 - X0) * (Z1 - Z0) * 9 * amount);
    const im = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let k = 0;
    for (let i = 0; i < count * 1.4 && k < count; i++) {
      const x = X0 + rr() * (X1 - X0), z = Z0 + rr() * (Z1 - Z0);
      if (this.waterAt(x, z) || this.onBridge(x, z)) continue;
      if (this.solids.some((o) => Math.hypot(o.x - x, o.z - z) < o.r * 0.8)) continue;
      if (this.heightAt(x, z, true) > this.heightAt(x, z, true, true) + 0.01) continue; // no grass on pavements / platforms / floors
      const h = 0.14 + rr() * 0.22;
      p.set(x, this.heightAt(x, z), z);
      s.set(1 + rr() * 0.6, h, 1 + rr() * 0.6);
      m.compose(p, q, s);
      im.setMatrixAt(k, m);
      c.setHSL(0, 0, 0.82 + rr() * 0.3);
      im.setColorAt(k, c);
      k++;
    }
    im.count = k;
    im.frustumCulled = false;
    this.group.add(im);
  }

  // ---------------------------------------------------------------- fish
  private buildFish() {
    for (const w of this.waters) {
      if (!hasTrait(w.obj.o, "fish")) continue;
      const n = Math.round(optOf(w.obj.o, "fish", 5));
      for (let i = 0; i < n; i++) {
        const g = new THREE.Group();
        const col = pickOf(this.r, ["#f97316", "#94a3b8", "#facc15", "#60a5fa", "#ef4444"]);
        const body = sphere(0.09, col, 0.08, 10);
        body.scale.set(0.7, 0.9, 1.8);
        g.add(body);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), new THREE.MeshToonMaterial({ color: shade(col, -30) }));
        tail.rotation.x = -Math.PI / 2; tail.position.z = -0.2;
        tail.scale.set(0.3, 1, 1);
        g.add(tail);
        g.add(at(sphere(0.018, "#111827", 0, 6), 0.045, 0.03, 0.12), at(sphere(0.018, "#111827", 0, 6), -0.045, 0.03, 0.12));
        this.free.add(g);
        const ph = this.r() * 100, sp = 0.6 + this.r() * 0.6, home = w.nearest(0, -2);
        const lane = (this.r() - 0.5) * 0.8;
        const jumpEvery = 180 + Math.floor(this.r() * 260), jumpOff = Math.floor(this.r() * 200);
        const swim = (n2: number, o: THREE.Object3D) => {
          let x: number, z: number, dx: number, dz: number;
          if (w.kind === "river") {
            const s = Math.sin((n2 * 0.01 * sp) + ph) * 6;
            const [tx, tz] = [home.tx, home.tz];
            x = home.x + tx * s - tz * lane; z = home.z + tz * s + tx * lane;
            const ds = Math.cos(n2 * 0.01 * sp + ph);
            dx = tx * ds; dz = tz * ds;
          } else {
            const R = (w.obj.b.water?.radius ?? 3) * 0.6;
            const a = n2 * 0.012 * sp + ph;
            x = w.obj.pos.x + Math.cos(a) * R * (0.5 + lane); z = w.obj.pos.z + Math.sin(a) * R * (0.5 + lane);
            dx = -Math.sin(a); dz = Math.cos(a);
          }
          // a jump now and then
          const jt = (n2 + jumpOff) % jumpEvery;
          const y = jt < 18 ? 0.02 + Math.sin((jt / 18) * Math.PI) * 0.7 : -0.16;
          o.position.set(x, y, z);
          o.rotation.set(jt < 18 ? -Math.cos((jt / 18) * Math.PI) * 0.9 : 0, Math.atan2(dx, dz), 0);
          tail.rotation.y = Math.sin(n2 * 0.6 + ph) * 0.5;
        };
        const th: Thing = {
          obj: g, kind: "fish", words: ["fish", "fishes", "machhli"], size: 0.1, floats: false, edible: true,
          id: `fish:${this.things.length}`, homeParent: this.free, homePos: new THREE.Vector3(), homeQuat: new THREE.Quaternion(), homeScale: new THREE.Vector3(1, 1, 1),
          owner: w.obj, segs: [{ f: -1e9, mode: "home" }], auto: swim, busyUntil: -1,
        };
        this.things.push(th);
        // splashes when it jumps
        for (let f = -jumpOff; f < 20000; f += jumpEvery) if (f >= 0) { th.obj.userData.j = 1; this.lazyJumps.push({ th, f, swim }); }
      }
    }
  }
  private lazyJumps: { th: Thing; f: number; swim: (n: number, o: THREE.Object3D) => void }[] = [];

  // ---------------------------------------------------------------- room
  private roomBoxes: THREE.Box3[] = [];
  /** An inside place: floor, walls with windows, ceiling, lamps; outside the
   * windows the world passes by when it is a moving vehicle. */
  private buildRoom() {
    const R = this.doc.room!;
    const W = Math.max(4, Math.min(40, R.width ?? 10)), D = Math.max(3, Math.min(30, R.depth ?? 7)), H = Math.max(2.2, Math.min(8, R.height ?? 3.2));
    const z0 = 2 - D; // back wall; the front (camera side) stays open
    const g = new THREE.Group();
    const mat = (c: string) => new THREE.MeshToonMaterial({ color: c });
    const add = (w: number, h: number, d: number, x: number, y: number, z: number, c: string, block = true) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
      m.position.set(x, y, z); m.receiveShadow = true; g.add(m);
      if (block) this.roomBoxes.push(new THREE.Box3().setFromObject(m));
      return m;
    };
    const wall = R.wall ?? "#f5e6c8", trim = R.trim ?? shade(wall, -40);
    add(W + 0.4, 0.1, D + 0.4, 0, -0.05, z0 + D / 2, R.floor ?? "#c8a27a", false);
    add(W + 0.4, 0.1, 9, 0, -0.06, 2 + 4.5, R.floor ?? "#c8a27a", false); // in front of the open side too (no empty void under the camera)
    { // the ceiling only shows from inside (the designer can look in from above)
      // it reaches over the camera too (the camera stands in the open front)
      const c = new THREE.Mesh(new THREE.PlaneGeometry(W, D + 5), mat(R.ceiling ?? "#f8fafc"));
      c.rotation.x = Math.PI / 2; c.position.set(0, H, z0 + (D + 5) / 2); g.add(c);
    }
    for (const sx of [-1, 1]) add(0.2, H, D + 5, sx * W / 2, H / 2, z0 + (D + 5) / 2, wall);
    // back wall with window holes
    const nWin = Math.max(0, Math.min(10, Math.round(R.windows ?? (R.moving ? Math.floor(W / 2.2) : 2))));
    const sill = R.moving ? 1.0 : 1.1, top = Math.min(H - 0.3, sill + (R.moving ? 1.1 : 1.3));
    add(W, sill, 0.2, 0, sill / 2, z0, wall);
    add(W, H - top, 0.2, 0, top + (H - top) / 2, z0, wall);
    const ww = nWin ? Math.min(1.8, (W - 0.6) / nWin - 0.5) : 0;
    const step = nWin ? W / nWin : W;
    let last = -W / 2;
    for (let i = 0; i < nWin; i++) {
      const cx = -W / 2 + step * (i + 0.5);
      const pw = cx - ww / 2 - last;
      if (pw > 0.01) add(pw, top - sill, 0.2, last + pw / 2, sill + (top - sill) / 2, z0, wall);
      last = cx + ww / 2;
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, top - sill), new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.18, depthWrite: false }));
      glass.position.set(cx, sill + (top - sill) / 2, z0 + 0.02);
      g.add(glass);
      add(ww + 0.12, 0.08, 0.3, cx, sill, z0 + 0.1, trim, false);
    }
    const pw = W / 2 - last;
    if (pw > 0.01) add(pw, top - sill, 0.2, last + pw / 2, sill + (top - sill) / 2, z0, wall);
    add(W, 0.12, 0.05, 0, 0.06, z0 + 0.12, trim, false);
    if (R.lamps !== false) for (let x = -W / 2 + 2.5; x < W / 2 - 1; x += 5) {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.12, 16), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
      lamp.position.set(x, H - 0.08, z0 + D / 2); g.add(lamp);
      const pl = new THREE.PointLight(0xfff1d6, 6, 9, 1.5); pl.position.set(x, H - 0.4, z0 + D / 2); g.add(pl);
    }
    this.group.add(g);
    // what you see through the windows
    const out = new THREE.Group();
    const kind = R.outside ?? (R.moving ? "fields" : "trees");
    // at night the windows are dark, with a moon (user, 2026-11-18)
    const dark = this.doc.time === "night";
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), new THREE.MeshBasicMaterial({ color: dark ? "#101a45" : kind === "sky" ? "#7cc4ff" : "#a5d8ff" }));
    sky.position.set(0, 10, z0 - 40); this.group.add(sky);
    if (dark) {
      const moon = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: "#fdf6c8" }));
      moon.position.set(W * 0.18, 7, z0 - 39); this.group.add(moon);
      const sr = rng(5 + W);
      for (let k = 0; k < 40; k++) {
        const st = new THREE.Mesh(new THREE.CircleGeometry(0.08 + sr() * 0.08, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
        st.position.set((sr() - 0.5) * W * 1.6, 3 + sr() * 9, z0 - 39.5); this.group.add(st);
      }
    }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), mat(dark ? "#1f3326" : kind === "sea" ? "#3b9ae1" : kind === "city" ? "#9ca3af" : "#8cc66b"));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.4, z0 - 30); this.group.add(ground);
    const rr = rng(77 + W);
    const TILE = 60;
    for (const off of [-TILE, 0, TILE]) {
      const tile = new THREE.Group(); tile.position.x = off;
      for (let i = 0; i < 16; i++) {
        const x = (rr() - 0.5) * TILE, z = z0 - 4 - rr() * 30;
        if (kind === "city") tile.add(at(new THREE.Mesh(new THREE.BoxGeometry(3 + rr() * 4, 4 + rr() * 12, 3), mat(pickOf(rr, ["#cbd5e1", "#fde68a", "#fca5a5", "#a5b4fc"]))), x, 3, z));
        else if (kind === "sky") tile.add(at(new THREE.Mesh(new THREE.SphereGeometry(2 + rr() * 3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })), x, 1 + rr() * 6, z));
        else if (kind !== "sea") { const t = new THREE.Group(); t.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6), mat("#7a4b24")), 0, 1.2, 0), at(new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), mat(pickOf(rr, ["#4caf50", "#5fae55", "#3f9d4a"]))), 0, 3, 0)); t.position.set(x, -0.4, z); tile.add(t); }
      }
      if (R.moving && kind !== "sky") for (let x = -TILE / 2; x < TILE / 2; x += 6) tile.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), mat("#57534e")), x, 1.2, z0 - 2.5));
      out.add(tile);
    }
    this.group.add(out);
    if (R.moving) this.updates.push((n) => { out.position.x = -((n * 0.45) % TILE); g.position.y = Math.sin(n * 0.9) * 0.008; });
  }

  // ---------------------------------------------------------------- life
  /** Animals, people and boats that live here: walk, swim, play, row, fish… */
  private attachLife() {
    const stageRot = this.doc.stage?.rot ?? 0;
    const waters = this.waters.filter((w) => w.kind !== "well");
    const nearestWater = (p: THREE.Vector3) => {
      let best: Water | null = null, bd = 1e9;
      for (const w of waters) { const nr = w.nearest(p.x, p.z); const d = Math.hypot(nr.x - p.x, nr.z - p.z); if (d < bd) { bd = d; best = w; } }
      return best;
    };
    const face = { expr: "happy" as const, mouth: null, talk: 0, blink: false, look: "center" as const, tears: false, sweat: false, hold: "" as const, lie: false };
    for (const ro of this.objects) {
      const { o, b } = ro;
      const doing = String(o.opts?.doing ?? "walk").toLowerCase();
      const ph = (hashStr(o.id) % 1000) / 159;
      const home = ro.pos.clone();
      const radius = optOf(o, "radius", 2.5);
      const put = (x: number, y: number, z: number, yaw: number) => {
        b.root.position.copy(new THREE.Vector3(x, y, z).applyMatrix4(this.stageInv));
        b.root.rotation.y = yaw + stageRot;
      };
      const side = (hashStr(o.id) >> 4) % 2 ? 1 : -1;
      // ---- designed things that move (a train arrives / leaves, cars pass…)
      if ((o.type === "model" || o.type === "kit") && o.opts?.moves) {
        const mv = String(o.opts.moves), x0 = home.x, z0 = home.z;
        const off = Math.round(ph * 100);
        const wheels = b.wheels ?? [];
        const spin = (dist: number) => { for (const w of wheels) w.o.quaternion.copy(w.q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -dist / w.r)); };
        b.update = (n) => {
          let x = x0, z = z0, yaw = 0, dist = 0, show = true;
          if (mv === "loop" || mv === "pass") {
            const sp = optOf(o, "speed", 0.12);
            const t = ((n + off) * sp) % 140, dir = optOf(o, "dir", 1) < 0 ? -1 : 1;
            x = dir > 0 ? x0 - 70 + t : x0 + 70 - t; dist = (n + off) * sp; yaw = dir > 0 ? 0 : Math.PI;
          } else if (mv === "around") {
            const a = (n + off) * 0.01;
            x = x0 + Math.cos(a) * 3; z = z0 + Math.sin(a) * 3; yaw = Math.atan2(-Math.cos(a), -Math.sin(a)) + Math.PI / 2; dist = a * 3;
          } else { // arrive: comes in early, waits at the station the whole scene, leaves at its end
            const start = ro.arriveAt ?? this.n0; // later when the track must be mended first
            const dur = Math.max(300, (this.n1 || this.n0 + 1080) - start), t = n - start, L = 70;
            const inT = Math.min(240, dur * 0.3), outT = dur > 700 ? 240 : 0;
            if (t < inT) { const k = 1 - t / inT; x = x0 + L * k * k; dist = -L * k * k; }
            else if (!outT || t < dur - outT) { x = x0; dist = 0; }
            else { const k = Math.min(1, (t - (dur - outT)) / outT); x = x0 - L * k * k; dist = -L * k * k; }
            yaw = Math.PI; // its front (+x) leads the way, to the left
          }
          b.root.visible = show;
          b.root.position.copy(new THREE.Vector3(x, home.y + optOf(o, "lift", 0), z).applyMatrix4(this.stageInv));
          b.root.rotation.y = yaw + stageRot;
          spin(dist);
        };
        continue;
      }
      // ---- boats that sail up and down the river (a boatman rows)
      if (o.type === "boat") {
        const w = o.opts?.moving ? nearestWater(home) : null;
        if (!w) { if (b.rower) b.update = (n) => b.rower!(n, 0.35); continue; }
        const amp = 7 + (ph % 4), sp = 0.0035 + (ph % 1) * 0.002, lane = ((hashStr(o.id) >> 3) % 3 - 1) * Math.min(0.8, w.half * 0.3);
        b.update = (n) => {
          const t = n * sp + ph, v = Math.cos(t);
          const p = w.along(home.x, home.z, Math.sin(t) * amp, lane);
          const k = Math.max(0, Math.min(1, (v + 0.25) / 0.5));
          const yaw = Math.atan2(-p.dz, p.dx) + Math.PI * (1 - k * k * (3 - 2 * k));
          put(p.x, 0.02 + Math.sin(n / 18) * 0.03, p.z, yaw - stageRot * 0);
          b.root.rotation.z = Math.sin(n / 23) * 0.04;
          b.rower?.(n, 1);
        };
        continue;
      }
      // ---- animals
      if (b.creature) {
        const a = b.creature, H = a.height;
        const w = doing === "swim" ? nearestWater(home) : null;
        const laneSide = w ? (w.along(home.x, home.z, 0, 0).nz > 0 ? 1 : -1) * (o.opts?.bank === "far" ? -1 : 1) : 1;
        b.update = (n) => {
          let x = home.x, z = home.z, y = 0, dx = 1, dz = 0, walking = false, flying = false, talk = 0, roll = 0;
          if (w) {
            const t = n * 0.005 + ph;
            const p = w.along(home.x, home.z, Math.sin(t) * 6, laneSide * Math.max(0, w.half - 0.7 - (ph % 1) * 0.6));
            const v = Math.cos(t) >= 0 ? 1 : -1;
            x = p.x; z = p.z; dx = p.dx * v; dz = p.dz * v; y = w.surface - H * 0.28 + Math.sin(n / 9 + ph) * 0.02;
            walking = true;
          } else if (doing === "play" || doing === "run" || doing === "chase" || doing === "jump") {
            const t = n * 0.05 + ph;
            x = home.x + Math.cos(t) * radius * 0.6 + Math.sin(t * 2.7) * 0.4;
            z = home.z + Math.sin(t * 1.3) * radius * 0.4;
            dx = -Math.sin(t) * radius * 0.6 + Math.cos(t * 2.7) * 1.08; dz = Math.cos(t * 1.3) * radius * 0.52;
            y = Math.abs(Math.sin(n * 0.28 + ph)) * 0.22 * H;
            walking = true; talk = (n + Math.round(ph * 10)) % 90 < 12 ? 1 : 0;
          } else if (doing === "fly") {
            const t = n * 0.02 + ph;
            x = home.x + Math.cos(t) * radius * 1.5; z = home.z + Math.sin(t) * radius; y = 3 + Math.sin(t * 2) * 0.5;
            dx = -Math.sin(t); dz = Math.cos(t); walking = true; flying = true;
          } else if (doing === "sleep" || doing === "rest" || doing === "sit") {
            dx = Math.cos(ph); dz = Math.sin(ph); roll = doing === "sleep" ? 0.0 : 0;
            talk = 0;
          } else if (doing === "graze" || doing === "eat" || doing === "drink") {
            dx = Math.cos(ph); dz = Math.sin(ph); talk = n % 40 < 20 ? 0.5 : 0;
          } else {
            const cyc = (n + ph * 100) % 400;
            walking = cyc < 220;
            const kk = (Math.floor((n + ph * 100) / 400) * 220 + Math.min(cyc, 220)) / 260;
            x = home.x + Math.sin(kk + ph) * radius; z = home.z + Math.sin(kk * 1.7 + ph) * radius * 0.5;
            dx = Math.cos(kk + ph); dz = Math.cos(kk * 1.7 + ph) * 0.85;
          }
          if (!w && !flying) y += this.heightAt(x, z, true);
          put(x, y, z, Math.atan2(dx, dz) - Math.PI / 2);
          a.root.position.set(0, 0, 0); a.root.rotation.set(0, 0, roll);
          a.animate({ n, walking, talk, blink: n % 97 < 4 || doing === "sleep", expr: "happy", flying });
        };
        continue;
      }
      // ---- people
      if (b.person) {
        const { h } = b.person;
        const w = doing === "fish" || doing === "wash" ? nearestWater(home) : null;
        let spot = home.clone(), look = 0;
        if (w) { const nr = w.nearest(home.x, home.z); spot = new THREE.Vector3(nr.bx, 0, nr.bz); look = Math.atan2(nr.x - nr.bx, nr.z - nr.bz); }
        let tool: THREE.Object3D | null = null;
        if (doing === "fish" || doing === "work" || doing === "chop") {
          tool = doing === "fish" ? rodMesh() : axeMesh();
          const dir = new THREE.Vector3(0, -0.7, 0.7).normalize();
          tool.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          h.hand("r").add(tool);
        }
        const seed = ph * 3;
        b.update = (n) => {
          let x = spot.x, z = spot.z, yaw = look, walking = false, pose = "idle", talk = 0;
          if (doing === "walk" || doing === "wander") {
            const cyc = (n + ph * 100) % 360;
            walking = cyc < 240;
            const kk = (Math.floor((n + ph * 100) / 360) * 240 + Math.min(cyc, 240)) / 300;
            x = home.x + Math.sin(kk + ph) * radius; z = home.z + Math.sin(kk * 1.7 + ph) * radius * 0.5;
            yaw = Math.atan2(Math.cos(kk + ph), Math.cos(kk * 1.7 + ph) * 0.85);
          } else if (doing === "talk") { pose = "talk"; talk = (n % 50) < 30 ? 0.6 : 0; yaw = ph; }
          else if (doing === "wave") pose = "wave";
          else if (doing === "dance") pose = (n >> 4) % 2 ? "shrug" : "wave";
          else if (doing === "sit" || doing === "rest") pose = "idle";
          if (!w && doing !== "walk" && doing !== "wander") yaw = yaw || Math.sin(ph) * 0.8;
          const j = targetJoints({ pose, stance: walking ? "walk-a" : doing === "sit" ? "sit" : "stand", expr: "happy", talk, energy: talk, walkPhase: n * 0.36, walking, n, seed }) as Record<string, number>;
          let y = 0;
          if (doing === "sit" || doing === "rest") { j.lhx = j.rhx = -1.45; j.lk = j.rk = 0.1; y = -0.47; j.spine = -0.1; }
          if (doing === "dance") { y = Math.abs(Math.sin(n * 0.25)) * 0.12; j.spineZ = Math.sin(n * 0.12) * 0.15; }
          if (doing === "fish") { j.rsx = -1.1 + Math.sin(n / 9) * 0.05; j.rsz = -0.2; j.rex = -0.45; j.lsx = -0.95; j.lsz = 0.15; j.lex = -0.9; }
          if (doing === "work" || doing === "chop") { const k = Math.max(0, Math.sin(n * 0.18)); j.rsx = -1.2 - k * 1.6; j.lsx = -1.1 - k * 1.6; j.rex = -0.2 - k * 0.6; j.lex = -0.3 - k * 0.6; j.spine = 0.25 - k * 0.3; }
          if (doing === "wash") { j.spine = 0.8; j.lhx = j.rhx = 0.05; j.lk = j.rk = 1.6; y = -0.27; j.rsx = -0.9 + Math.sin(n * 0.3) * 0.3; j.lsx = -0.9 - Math.sin(n * 0.3) * 0.3; }
          put(x, y + this.heightAt(x, z, true), z, yaw);
          h.apply({ x: 0, y: 0, z: 0, yaw: 0, roll: 0, spine: 0, spineZ: 0, headX: 0, headY: 0, headZ: 0, lsx: 0, lsz: 0, lex: 0, lez: 0, rsx: 0, rsz: 0, rex: 0, rez: 0, lhx: 0, lk: 0, rhx: 0, rk: 0, ...j },
            { ...face, talk, blink: n % 89 < 4 }, n);
          h.root.position.y = y >= 0 ? 0 : 0;
        };
      }
    }
  }

  // ----------------------------------------------------------- particles
  private buildParticles() {
    const mat = new THREE.SpriteMaterial({ map: puffTexture(), transparent: true, depthWrite: false });
    for (let i = 0; i < 160; i++) { const s = new THREE.Sprite(mat.clone()); s.visible = false; this.group.add(s); this.sprites.push(s); }
    for (let i = 0; i < 10; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
      r.rotation.x = -Math.PI / 2; r.visible = false;
      this.group.add(r); this.rings.push(r);
    }
  }
  addParticle(p: Particle) { this.particles.push(p); }

  // ----------------------------------------------------- finding things
  /** Objects / things that a word means ("mango", "the river", "tree"…). */
  find(word: string, near: { x: number; z: number }, need?: TraitId): { obj?: RObj; thing?: Thing } | null {
    const w = norm(word);
    const d = (p: THREE.Vector3) => Math.hypot(p.x - near.x, p.z - near.z);
    const objOk = (o: RObj) => !need || hasTrait(o.o, need) || (need === "swimmable" && !!o.b.water && o.b.water.kind !== "path");
    const objMatch = (o: RObj) => {
      if (!w) return true;
      if (o.o.name && norm(o.o.name).includes(w)) return true;
      if (o.words.some((x) => norm(x) === w || norm(x).split(" ").includes(w))) return true;
      if (w === "tree" && /tree|palm|pine|banana/.test(o.o.type)) return true;
      if (w === "water" && (o.b.water && o.b.water.kind !== "path" || o.o.type === "well")) return true;
      return false;
    };
    // a thing first (a mango, a stone, a ball, a fish)
    if (w && (!need || ["pickable", "eatable", "throwable", "kickable", "pushable"].includes(need))) {
      const ts = this.things.filter((t) => t.words.some((x) => norm(x) === w) || (w === "fruit" && t.edible && t.kind !== "fish"));
      if (ts.length) return { thing: ts.sort((a, b) => d(this.thingRest(a)) - d(this.thingRest(b)))[0] };
    }
    const os = this.objects.filter((o) => objOk(o) && objMatch(o));
    // your own name for it first, then what the script asked for (placed
    // near the characters), then trees that still have fruit, then the nearest
    const score = (o: RObj) => d(o.pos) - (o.o.name && w && norm(o.o.name).includes(w) ? 100 : 0) - (o.o.opts?.need ? 4 : 0)
      - ((need === "shakeable" || need === "fruits") && this.things.some((t) => t.owner === o && t.kind !== "branch" && t.segs.length === 1) ? 3 : 0);
    if (os.length) return { obj: os.sort((a, b) => score(a) - score(b))[0] };
    if (w) return this.find("", near, need);
    return null;
  }
  /** A thing of this place that a word in a line NAMES ("the waterfall", "this train") —
   *  exact matches only (no "nearest anything" fallback), for the camera to show it. */
  named(word: string): RObj | null {
    const w = norm(word);
    if (w.length < 3 || NOT_THINGS.has(w)) return null;
    const hit = this.objects.filter((o) => !CATALOG_BY_TYPE.get(o.o.type)?.line && !o.b.creature && !o.b.person && o.b.height >= (o.o.type === "kit" ? 0.25 : 0.6) && (
      (o.o.name && norm(o.o.name).split(" ").includes(w)) || o.words.some((x) => norm(x) === w || norm(x).split(" ").includes(w))));
    // "police car": the one that is ALL of it (not just any car)
    const toks = String(word).toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (toks.length > 1) {
      const all = this.objects.filter((o) => !o.b.creature && !o.b.person && toks.every((t) => o.words.join(" ").toLowerCase().includes(t)));
      if (all.length) return all[0]!;
    }
    return hit.find((o) => String(o.o.opts?.kit ?? "").split("/").pop() === w) ?? hit[0] ?? null;
  }
  /** Boxes the camera must never be inside (and should see past), at frame n. */
  private staticBoxes: { box: THREE.Box3; ro: RObj }[] | null = null;
  blockers(n: number): { box: THREE.Box3; ro: RObj }[] {
    if (!this.staticBoxes) {
      this.poseStatic(0);
      this.group.updateMatrixWorld(true);
      this.staticBoxes = [];
      for (const ro of this.objects) {
        const b = ro.b;
        if (b.water || b.hill || CATALOG_BY_TYPE.get(ro.o.type)?.line || ro.o.opts?.moves || b.creature || b.person) continue;
        if (b.height < 0.5 || ["flowers", "stones", "mushroom", "birds", "butterflies", "tall_grass"].includes(ro.o.type)) continue;
        const box = new THREE.Box3().setFromObject(b.root);
        if (!box.isEmpty()) this.staticBoxes.push({ box, ro });
      }
    }
    const out = this.staticBoxes.slice();
    for (const box of this.roomBoxes) out.push({ box, ro: null as unknown as RObj });
    for (const ro of this.objects) {
      if (!ro.o.opts?.moves) continue;
      this.lastStatic = NaN;
      ro.b.update?.(n, this.doc.wind);
      if (!ro.b.root.visible) continue;
      ro.b.root.updateMatrixWorld(true);
      out.push({ box: new THREE.Box3().setFromObject(ro.b.root), ro });
    }
    return out;
  }

  /** Is something like this already in the world? ("ducks", "boat", "lion"…) */
  has(word: string): boolean {
    const w = norm(word);
    if (!w) return false;
    if (this.things.some((t) => t.words.some((x) => norm(x) === w))) return true;
    return this.objects.some((o) => o.words.some((x) => norm(x) === w || norm(x).split(" ").includes(w))
      || norm(String(o.o.opts?.species ?? "")) === w || norm(String(o.o.opts?.who ?? "")) === w);
  }

  /** Where a thing is when nobody has moved it (or its last resting place). */
  thingRest(t: Thing): THREE.Vector3 {
    const last = t.segs[t.segs.length - 1]!;
    if (last.mode === "path") { const i = (last.len - 1) * 3; return new THREE.Vector3(last.pos[i], last.pos[i + 1], last.pos[i + 2]); }
    return t.obj.getWorldPosition(new THREE.Vector3());
  }
  /** Where the thing is at frame n (posing the world at n first). */
  thingAt(t: Thing, n: number): THREE.Vector3 {
    this.poseStatic(n);
    const seg = segAt(t.segs, n);
    if (seg.mode === "path") { const i = Math.min(seg.len - 1, Math.max(0, n - seg.f)) * 3; return new THREE.Vector3(seg.pos[i], seg.pos[i + 1], seg.pos[i + 2]); }
    if (seg.mode === "home") {
      if (t.auto) t.auto(n, t.obj);
      this.setParent(t.obj, t.homeParent);
      t.obj.position.copy(t.homePos); t.obj.quaternion.copy(t.homeQuat);
      t.obj.updateMatrixWorld(true);
      return t.obj.getWorldPosition(new THREE.Vector3());
    }
    return t.obj.getWorldPosition(new THREE.Vector3());
  }
  isHome(t: Thing, n: number): boolean { return segAt(t.segs, n).mode === "home"; }
  heldBy(t: Thing, n: number): string | null { const s = segAt(t.segs, n); return s.mode === "held" ? s.cid : null; }

  // ------------------------------------------------------------- events
  private addSeg(t: Thing, s: Seg) {
    t.segs = t.segs.filter((x) => x.f < s.f);
    t.segs.push(s);
  }
  hold(t: Thing, f: number, cid: string, side: Side) { this.addSeg(t, { f, mode: "held", cid, side }); }
  eat(t: Thing, f: number, cid: string, side: Side, bites: number[]) {
    this.addSeg(t, { f, mode: "held", cid, side, eatFrom: f, bites });
    this.addSeg(t, { f: bites[bites.length - 1]! + 2, mode: "gone" });
  }
  gone(t: Thing, f: number) { this.addSeg(t, { f, mode: "gone" }); }
  /** Let go / knock off / throw: flies from p0 with velocity v0 (per frame), then gravity does the rest. */
  fling(t: Thing, f: number, p0: THREE.Vector3, v0: THREE.Vector3, spin = 0.25) {
    const sim = this.simulate(t, p0, v0, spin, f);
    this.addSeg(t, { f, mode: "path", pos: sim.pos, quat: sim.quat, len: sim.len });
    if (sim.sink >= 0) this.addSeg(t, { f: f + sim.sink, mode: "gone" });
  }
  fall(t: Thing, f: number, push?: THREE.Vector3) {
    const p0 = this.thingAt(t, f);
    const v = push ?? new THREE.Vector3((this.r() - 0.5) * 0.03, 0.02, (this.r() - 0.5) * 0.03);
    this.fling(t, f, p0, v, 0.15);
  }
  throwTo(t: Thing, f: number, from: THREE.Vector3, to: THREE.Vector3, flight = 20) {
    const v = new THREE.Vector3((to.x - from.x) / flight, 0, (to.z - from.z) / flight);
    v.y = (to.y - from.y) / flight + 0.5 * G * flight;
    this.fling(t, f, from, v, 0.35);
  }
  /** Something big pushed along a path (log, rock, box), then rolls on a little. */
  pushAlong(t: Thing, f0: number, f1: number, from: THREE.Vector3, to: THREE.Vector3) {
    const len = f1 - f0 + 40;
    const pos = new Float32Array(len * 3), quat = new Float32Array(len * 4);
    const q = new THREE.Quaternion(), axis = new THREE.Vector3(to.z - from.z, 0, -(to.x - from.x)).normalize();
    const base = t.obj.getWorldQuaternion(new THREE.Quaternion());
    let ang = 0;
    const roll = t.kind === "log" || t.kind === "ball" || t.kind === "rock";
    for (let i = 0; i < len; i++) {
      const k = i < f1 - f0 ? i / (f1 - f0) : 1 + (1 - Math.exp(-(i - (f1 - f0)) / 10)) * 0.25;
      const x = from.x + (to.x - from.x) * k, z = from.z + (to.z - from.z) * k;
      pos.set([x, this.heightAt(x, z, true) + from.y, z], i * 3);
      if (i > 0 && roll) ang += Math.hypot(pos[i * 3]! - pos[i * 3 - 3]!, pos[i * 3 + 2]! - pos[i * 3 - 1]!) / Math.max(0.15, t.size);
      q.setFromAxisAngle(axis, -ang).multiply(base);
      quat.set([q.x, q.y, q.z, q.w], i * 4);
    }
    this.addSeg(t, { f: f0, mode: "path", pos, quat, len });
  }
  /** A branch is cut off: it becomes a thing of its own and falls (with its fruit). */
  cutBranch(o: RObj, f: number, which = -1): Thing | null {
    const list = o.b.branches;
    if (!list.length) return null;
    const used = new Set(this.things.filter((t) => t.kind === "branch" && t.owner === o).map((t) => t.obj));
    const br = (which >= 0 ? list[which] : list.find((b) => b.low && !used.has(b.group)) ?? list.find((b) => !used.has(b.group)));
    if (!br || used.has(br.group)) return null;
    const th: Thing = {
      obj: br.group, kind: "branch", words: ["branch", "stick", "wood"], size: 0.5, floats: true, edible: false,
      id: `${o.o.id}:branch:${list.indexOf(br)}`, homeParent: br.group.parent!, homePos: br.group.position.clone(), homeQuat: br.group.quaternion.clone(),
      homeScale: br.group.scale.clone(), owner: o, segs: [{ f: -1e9, mode: "home" }], busyUntil: -1,
    };
    this.things.push(th);
    // stop swaying it once it is off the tree
    o.b.sway = o.b.sway.filter((s) => s.o !== br.group);
    const p0 = this.thingAt(th, f);
    th.obj.getWorldQuaternion(new THREE.Quaternion());
    const out = new THREE.Vector3(p0.x - o.pos.x, 0, p0.z - o.pos.z).normalize().multiplyScalar(0.02);
    this.fling(th, f, p0, out.setY(0.01), 0.12);
    this.leaves(f, p0.x, p0.y + 0.3, p0.z, 10);
    return th;
  }
  chop(o: RObj, f: number, dir: number) {
    o.chop = { f, dir };
    const fallDir = new THREE.Vector3(Math.sin(dir), 0, Math.cos(dir));
    const tip = o.pos.clone().addScaledVector(fallDir, o.b.height * 0.6);
    this.particles.push({ f: f + 22, kind: "dust", x: tip.x, y: 0.2, z: tip.z, n: 10, big: 1.6 });
    this.particles.push({ f: f + 22, kind: "leaves", x: tip.x, y: 1.2, z: tip.z, n: 16 });
  }
  shake(o: RObj, f0: number, f1: number) {
    o.shakes.push([f0, f1]);
    this.particles.push({ f: f0 + 4, kind: "leaves", x: o.pos.x, y: o.b.height * 0.75, z: o.pos.z, n: 12 });
  }
  door(o: RObj, f: number, open: boolean) { o.doors.push({ f, open }); o.doors.sort((a, b) => a.f - b.f); }
  lightFire(o: RObj, f: number) { o.litAt = f; this.particles.push({ f, kind: "sparkle", x: o.pos.x, y: 0.4, z: o.pos.z, n: 8 }); }
  splash(f: number, x: number, z: number, big = 1) { this.particles.push({ f, kind: "splash", x, y: 0.05, z, n: 12, big }); this.particles.push({ f, kind: "ripple", x, y: 0.05, z, n: 1, big }); }
  dust(f: number, x: number, z: number, big = 1) { this.particles.push({ f, kind: "dust", x, y: 0.1, z, n: 6, big }); }
  leaves(f: number, x: number, y: number, z: number, n = 8) { this.particles.push({ f, kind: "leaves", x, y, z, n }); }

  /** Gravity, bounces, rolling, splashing / floating. */
  private simulate(t: Thing, p0: THREE.Vector3, v0: THREE.Vector3, spin: number, f0: number) {
    const MAX = 24 * 14;
    const pos = new Float32Array(MAX * 3), quat = new Float32Array(MAX * 4);
    const p = p0.clone(), v = v0.clone();
    const q = t.obj.getWorldQuaternion(new THREE.Quaternion());
    const axis = new THREE.Vector3(this.r() - 0.5, this.r() - 0.5, this.r() - 0.5).normalize();
    const dq = new THREE.Quaternion();
    let resting = false, inWater = false, sink = -1, len = MAX, landed = false;
    const r = Math.max(0.03, t.size * 0.8);
    for (let i = 0; i < MAX; i++) {
      if (!resting && !inWater) {
        v.y -= G;
        p.add(v);
        const ground = this.heightAt(p.x, p.z) + r;
        const w = this.waterAt(p.x, p.z);
        if (w && p.y < w.surface + r * 0.3) {
          inWater = true;
          this.splash(f0 + i, p.x, p.z, Math.min(1.6, 0.5 + t.size * 3));
          if (!t.floats) { sink = i + 6; }
          v.multiplyScalar(0.2);
        } else if (p.y < ground) {
          p.y = ground;
          if (!landed) { landed = true; this.dust(f0 + i, p.x, p.z, Math.min(1.5, t.size * 4)); }
          if (Math.abs(v.y) > 0.04) { v.y = -v.y * 0.38; v.x *= 0.7; v.z *= 0.7; }
          else {
            v.y = 0; v.x *= 0.9; v.z *= 0.9;
            const sp = Math.hypot(v.x, v.z);
            if (sp > 0.002) { axis.set(v.z, 0, -v.x).normalize(); dq.setFromAxisAngle(axis, sp / r); q.premultiply(dq); }
            else resting = true;
          }
        }
        if (!resting && p.y > ground + 0.01) { dq.setFromAxisAngle(axis, spin); q.premultiply(dq); }
      } else if (inWater) {
        const w = this.waterAt(p.x, p.z);
        if (sink >= 0) { p.y -= 0.02; }
        else if (w) {
          const [fx, fz] = w.flow(p.x, p.z);
          v.x += (fx - v.x) * 0.05; v.z += (fz - v.z) * 0.05;
          p.x += v.x; p.z += v.z;
          p.y = w.surface + Math.sin((f0 + i) / 9) * 0.02 - r * 0.3;
          dq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.01); q.premultiply(dq);
        } else { inWater = false; resting = true; }
      }
      pos.set([p.x, p.y, p.z], i * 3);
      quat.set([q.x, q.y, q.z, q.w], i * 4);
      if (resting && i > 2) { len = i + 1; break; }
    }
    return { pos, quat, len, sink };
  }

  // ------------------------------------------------------------- update
  private setParent(o: THREE.Object3D, p: THREE.Object3D) { if (o.parent !== p) p.add(o); }
  private lastStatic = NaN;
  /** Wind, shaking, chopping, doors, fires, boats, birds… (no things). */
  poseStatic(n: number) {
    if (n === this.lastStatic) return;
    this.lastStatic = n;
    const wind = this.doc.wind ?? 0.5;
    const gust = wind * (0.75 + 0.25 * Math.sin(n / 70) + 0.15 * Math.sin(n / 23));
    for (const ro of this.objects) {
      const b = ro.b;
      let shake = 0;
      for (const [a, z] of ro.shakes) if (n >= a && n <= z) shake = Math.max(shake, Math.min(1, (n - a) / 4, (z - n) / 6));
      for (const s of b.sway) {
        const k = s.amp * (gust * 1.6 + shake * 5);
        s.o.rotation.z = s.bz + k * (Math.sin(n * 0.055 + s.ph) + 0.4 * Math.sin(n * 0.15 + s.ph * 2)) + (shake ? Math.sin(n * 1.9 + s.ph) * s.amp * 3 * shake : 0);
        s.o.rotation.x = s.bx + k * 0.6 * Math.sin(n * 0.047 + s.ph * 1.3);
      }
      b.pivot.quaternion.identity();
      if (shake) b.pivot.rotation.set(Math.sin(n * 1.7) * 0.025 * shake, 0, Math.sin(n * 2.1) * 0.03 * shake);
      if (ro.chop && n >= ro.chop.f) {
        const t = n - ro.chop.f;
        const end = Math.PI / 2 - 0.12;
        let th = end * Math.min(1, (t / 22) ** 2);
        if (t > 22) th = end - 0.1 * Math.abs(Math.sin((t - 22) / 2.5)) * Math.exp(-(t - 22) / 7);
        const local = ro.chop.dir - ro.yaw;
        const axis = new THREE.Vector3(Math.cos(local), 0, -Math.sin(local));
        b.pivot.quaternion.setFromAxisAngle(axis, th);
      }
      if (b.door && !b.flap) {
        let ang = 0, last: { f: number; open: boolean } | null = null, prevOpen = false;
        for (const d of ro.doors) { if (d.f <= n) { prevOpen = last ? last.open : false; last = d; } }
        if (last) {
          const k = Math.min(1, (n - last.f) / 10);
          const from = prevOpen ? -1.75 : 0, to = last.open ? -1.75 : 0;
          ang = from + (to - from) * (1 - (1 - k) ** 2);
        }
        b.door.pivot.rotation.y = ang;
      }
      if (b.fire) {
        const lit = ro.litAt !== null && n >= ro.litAt;
        b.fire.group.visible = lit;
        if (lit) {
          const grow = Math.min(1, (n - (ro.litAt ?? 0)) / 16);
          b.fire.flames.forEach((fl, k) => fl.scale.set(grow, grow * (1 + Math.sin(n * 1.7 + k) * 0.2 + Math.sin(n * 3.3 + k) * 0.1), grow));
          b.fire.light.intensity = (9 + Math.sin(n * 2.3) * 2.5) * grow;
        }
      }
      if (b.boat && !ro.o.opts?.moving) { b.root.position.y = 0.02 + Math.sin(n / 18) * 0.03; b.root.rotation.z = Math.sin(n / 23) * 0.04; }
      if (ro.states?.length || ro.drives?.length) this.applyStates(ro, n);
    }
    for (const u of this.updates) u(n);
  }

  /** Something happens to a thing at frame f (and it stays that way). */
  setState(ro: RObj, f: number, kind: ObjState["kind"], color?: string) {
    (ro.states ??= []).push({ f, kind, color });
    ro.states.sort((a, b) => a.f - b.f);
    this.lastStatic = NaN;
    if (kind === "break" || kind === "hide" || kind === "fall") this.particles.push({ f, kind: "dust", x: ro.pos.x, y: 0.2, z: ro.pos.z, n: 10, big: Math.max(1, ro.b.radius) });
  }
  /** Trains / buses that arrive on this row wait until frame f (someone is working on their track). */
  delayArrivals(z: number, f: number) {
    for (const ro of this.objects) {
      if (ro.o.opts?.moves !== "arrive") continue;
      if (Math.abs(ro.pos.z - z) > 2.5) continue;
      ro.arriveAt = Math.max(ro.arriveAt ?? 0, f);
    }
  }
  /** A vehicle is driven / ridden forward (along its own front) from f0 to f1. */
  drive(ro: RObj, f0: number, f1: number, dist: number) { (ro.drives ??= []).push({ f0, f1, dist }); this.lastStatic = NaN; }
  /** Where a thing is at frame n (after drives), in scene space. */
  posAt(ro: RObj, n: number): THREE.Vector3 {
    this.poseStatic(n);
    ro.b.root.updateMatrixWorld(true);
    return ro.b.root.getWorldPosition(new THREE.Vector3());
  }
  emit(f: number, kind: Particle["kind"], x: number, y: number, z: number, n = 8, big = 1) { this.particles.push({ f, kind, x, y, z, n, big }); }

  private applyStates(ro: RObj, n: number) {
    const r = ro.b.root;
    if (!ro.base) {
      const mats = new Map<THREE.Mesh, THREE.Color>();
      r.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || m.userData.outline || Array.isArray(m.material)) return;
        const mat = m.material as THREE.MeshToonMaterial;
        if (!mat.color) return;
        m.material = mat.clone();
        mats.set(m, mat.color.clone());
      });
      ro.base = { x: r.position.x, y: r.position.y, z: r.position.z, rotY: r.rotation.y, visible: r.visible, mats };
    }
    const B = ro.base;
    // driven forward along its own front (+x of the thing)
    let dist = 0;
    for (const d of ro.drives ?? []) if (n >= d.f0) { const k = Math.min(1, (n - d.f0) / Math.max(1, d.f1 - d.f0)); dist += d.dist * (k * k * (3 - 2 * k)); }
    r.position.set(B.x + Math.cos(B.rotY) * dist, B.y, B.z - Math.sin(B.rotY) * dist);
    r.rotation.set(0, B.rotY, 0);
    // the latest state up to now
    let cur: ObjState | null = null;
    const sts = ro.states ?? [];
    const firstShow = sts.find((x) => x.kind === "show");
    for (const st of sts) if (st.f <= n) cur = st;
    r.visible = B.visible && !(firstShow && n < firstShow.f && (!cur || cur.f < firstShow.f));
    const t = cur ? n - cur.f : 0;
    const k = Math.min(1, t / 14);
    let tint: THREE.Color | null = null, glow = 0;
    if (cur?.kind === "break") {
      // clearly broken: twisted up out of line, one end in the air, darker
      r.rotation.set(0.32 * k, B.rotY + 0.35 * k, 0.4 * k);
      r.position.set(r.position.x + 0.25 * k, B.y + 0.18 * k, r.position.z + 0.3 * k);
      tint = new THREE.Color("#5b5b5b");
    }
    else if (cur?.kind === "fall") { const th = (Math.PI / 2 - 0.1) * Math.min(1, (t / 18) ** 2); r.rotation.set(0, B.rotY, th); }
    else if (cur?.kind === "hide") r.visible = t < 6;
    else if (cur?.kind === "show") { r.visible = B.visible; const sc = Math.min(1, t / 12); r.scale.setScalar(0.4 + 0.6 * (1 - (1 - sc) ** 3)); }
    else if (cur?.kind === "glow") glow = 0.5 + 0.5 * Math.sin(n * 0.3);
    else if (cur?.kind === "fix") glow = Math.max(0, 1 - t / 20) * 0.8;
    else if (cur?.kind === "color" && cur.color) tint = new THREE.Color(cur.color);
    if (cur?.kind !== "show") r.scale.setScalar(1);
    ro.stVis = r.visible;
    for (const [m, c0] of B.mats ?? []) {
      const mat = m.material as THREE.MeshToonMaterial;
      mat.color.copy(c0);
      if (tint) mat.color.lerp(tint, cur?.kind === "color" ? 0.75 * k : 0.35 * k);
      if (mat.emissive) mat.emissive.setRGB(glow * 0.9, glow * 0.55, glow * 0.1);
    }
  }

  /** The whole world at frame n. */
  private sirens: THREE.Object3D[] | null = null;
  update(n: number, ctx: UpdateCtx) {
    if (this.sirens === null) { this.sirens = []; this.group.traverse((o) => { if (o.userData.siren) this.sirens!.push(o); }); }
    for (const s of this.sirens) s.visible = (Math.floor(n / 6) % 2 === 0) === (s.userData.siren === "r");
    this.poseStatic(n);
    const tmp = new THREE.Vector3();
    for (const t of this.things) {
      const s = segAt(t.segs, n);
      t.obj.visible = s.mode !== "gone";
      if (s.mode === "home") {
        this.setParent(t.obj, t.homeParent);
        if (t.auto) t.auto(n, t.obj);
        else { t.obj.position.copy(t.homePos); t.obj.quaternion.copy(t.homeQuat); }
        t.obj.scale.copy(t.homeScale);
      } else if (s.mode === "path") {
        this.setParent(t.obj, this.free);
        const i = Math.min(s.len - 1, n - s.f);
        t.obj.position.set(s.pos[i * 3]!, s.pos[i * 3 + 1]!, s.pos[i * 3 + 2]!);
        t.obj.quaternion.set(s.quat[i * 4]!, s.quat[i * 4 + 1]!, s.quat[i * 4 + 2]!, s.quat[i * 4 + 3]!);
        t.obj.scale.copy(t.homeScale);
      } else if (s.mode === "held") {
        this.setParent(t.obj, this.free);
        if (ctx.hand(s.cid, s.side, tmp)) {
          t.obj.position.copy(tmp);
          if (!t.big) t.obj.position.y -= t.size * 0.3;
          t.obj.rotation.set(0, ctx.yawOf(s.cid), 0);
          if (t.kind === "fish") t.obj.rotation.set(Math.PI / 2 + Math.sin(n * 0.9) * 0.4, ctx.yawOf(s.cid), Math.sin(n * 1.3) * 0.3);
        }
        let sc = 1;
        if (s.bites) for (const b of s.bites) if (n >= b) sc -= 1 / (s.bites.length + 0.3);
        t.obj.scale.copy(t.homeScale).multiplyScalar(Math.max(0.15, sc));
      }
    }
    // grass bends under feet (and a little behind them)
    if (this.grassMat) {
      this.grassU.uTime.value = n;
      this.grassU.uWind.value = this.doc.wind ?? 0.5;
      const P = this.grassU.uPush.value;
      for (let i = 0; i < 16; i++) { const w = ctx.walkers[i]; P[i]!.set(w ? w.x : 999, w ? w.z : 999, w ? w.s : 0); }
    }
    this.drawParticles(n);
  }

  private drawParticles(n: number) {
    let si = 0, ri = 0;
    const sprite = () => (si < this.sprites.length ? this.sprites[si++]! : null);
    const set = (s: THREE.Sprite, tex: THREE.Texture, col: string | number, x: number, y: number, z: number, sc: number, op: number, rot = 0) => {
      s.visible = true;
      if (s.material.map !== tex) { s.material.map = tex; s.material.needsUpdate = true; }
      s.material.color.set(col); s.position.set(x, y, z); s.scale.setScalar(sc); s.material.opacity = op; s.material.rotation = rot;
    };
    const all = this.particles.concat(this.lazyJumps.filter((j) => n - j.f >= 15 && n - j.f < 40).map((j) => {
      const o = new THREE.Object3D(); j.swim(j.f + 16, o);
      return { f: j.f + 16, kind: "splash" as const, x: o.position.x, y: 0.05, z: o.position.z, n: 6, big: 0.5 };
    }));
    for (const p of all) {
      const t = n - p.f;
      if (t < 0) continue;
      const rr = rng(p.f * 31 + Math.round(p.x * 100));
      if (p.kind === "splash" && t < 22) {
        for (let k = 0; k < p.n; k++) {
          const s = sprite(); if (!s) break;
          const a = rr() * Math.PI * 2, sp = (0.03 + rr() * 0.04) * (p.big ?? 1), up = (0.09 + rr() * 0.07) * Math.sqrt(p.big ?? 1);
          const y = p.y + up * t - 0.5 * G * 1.2 * t * t;
          if (y < 0) continue;
          set(s, this.dropTex, 0xdbeafe, p.x + Math.cos(a) * sp * t, y, p.z + Math.sin(a) * sp * t, 0.12 * (p.big ?? 1), 1);
        }
      } else if (p.kind === "ripple" && t < 40 && ri < this.rings.length) {
        const r = this.rings[ri++]!;
        r.visible = true; r.position.set(p.x, 0.045, p.z);
        r.scale.setScalar(0.2 + t * 0.05 * (p.big ?? 1));
        (r.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t / 40);
      } else if (p.kind === "leaves" && t < 70) {
        for (let k = 0; k < p.n; k++) {
          const s = sprite(); if (!s) break;
          const ox = (rr() - 0.5) * 2.2, oz = (rr() - 0.5) * 1.6, sp = 0.025 + rr() * 0.02, ph = rr() * 6;
          const y = p.y + (rr() - 0.3) * 0.8 - sp * t;
          if (y < 0.02) continue;
          set(s, this.leafTex, rr() < 0.5 ? 0x9be15d : 0xffffff, p.x + ox + Math.sin(t / 6 + ph) * 0.25, y, p.z + oz, 0.13, 1, t / 5 + ph);
        }
      } else if (p.kind === "dust" && t < 20) {
        for (let k = 0; k < p.n; k++) {
          const s = sprite(); if (!s) break;
          const a = rr() * Math.PI * 2, k2 = t / 20;
          set(s, puffTexture(), 0xb5a283, p.x + Math.cos(a) * k2 * 0.7 * (p.big ?? 1), p.y + k2 * 0.25, p.z + Math.sin(a) * k2 * 0.5, (0.25 + k2 * 0.6) * (p.big ?? 1), 0.6 * (1 - k2));
        }
      } else if (p.kind === "sparks" && t < 14) {
        for (let k = 0; k < p.n; k++) {
          const s = sprite(); if (!s) break;
          const a = rr() * Math.PI * 2, sp = 0.05 + rr() * 0.07, up = 0.06 + rr() * 0.08;
          const y = p.y + up * t - 0.5 * G * 0.8 * t * t;
          if (y < 0.02) continue;
          set(s, puffTexture(), k % 3 ? 0xfff7a8 : 0xffffff, p.x + Math.cos(a) * sp * t, y, p.z + Math.sin(a) * sp * t, 0.07 * (1 - t / 14) + 0.02, 1);
        }
      } else if ((p.kind === "smoke" || p.kind === "fire") && t < 40) {
        for (let k = 0; k < p.n; k++) {
          const s = sprite(); if (!s) break;
          const k2 = t / 40, ox = (rr() - 0.5) * 0.6 * (p.big ?? 1);
          const col = p.kind === "fire" ? (k2 < 0.35 ? (k % 2 ? 0xfb923c : 0xfde047) : 0x6b6b75) : 0x9ca3af;
          set(s, puffTexture(), col, p.x + ox + k2 * 0.3, p.y + k2 * (p.kind === "fire" ? 3 : 1.8) * (p.big ?? 1), p.z + (rr() - 0.5) * 0.4, (0.3 + k2 * 1.1) * (p.big ?? 1), 0.75 * (1 - k2));
        }
      } else if (p.kind === "sparkle" && t < 18) {
        for (let k = 0; k < p.n; k++) {
          const s = sprite(); if (!s) break;
          const a = rr() * Math.PI * 2, k2 = t / 18;
          set(s, puffTexture(), k % 2 ? 0xfde047 : 0xfb923c, p.x + Math.cos(a) * k2 * 0.5, p.y + k2 * 0.6, p.z + Math.sin(a) * k2 * 0.5, 0.12 * (1 - k2) + 0.03, 1 - k2);
        }
      }
    }
    // smoke from every burning fire
    for (const ro of this.objects) {
      if (!ro.b.fire || ro.litAt === null || n < ro.litAt || !ro.b.fire.group.visible) continue;
      for (let k = 0; k < 8; k++) {
        const s = sprite(); if (!s) break;
        const age = ((n + k * 11) % 88) / 88;
        if (n - ro.litAt < k * 11 && ro.litAt > -1e8) { s.visible = false; continue; }
        set(s, puffTexture(), 0x8a8a96, ro.pos.x + Math.sin(age * 6 + k) * 0.2 + age * 0.4, ro.pos.y + 0.9 + age * 3.2, ro.pos.z - 0.05, 0.3 + age * 1.1, 0.5 * (1 - age));
      }
    }
    // smoke from chimneys of designed things (a train engine…)
    const wp = new THREE.Vector3();
    for (const ro of this.objects) {
      if (!ro.b.smokes?.length || !ro.b.root.visible) continue;
      for (const sm of ro.b.smokes) {
        sm.getWorldPosition(wp);
        for (let k = 0; k < 6; k++) {
          const s2 = sprite(); if (!s2) break;
          const age = ((n + k * 9) % 54) / 54;
          set(s2, puffTexture(), 0xd1d5db, wp.x + age * 0.8, wp.y + 0.2 + age * 2.4, wp.z, 0.35 + age * 1.2, 0.65 * (1 - age));
        }
      }
    }
    for (let i = si; i < this.sprites.length; i++) this.sprites[i]!.visible = false;
    for (let i = ri; i < this.rings.length; i++) this.rings[i]!.visible = false;
  }

  /** Anything standing between the camera and the action is hidden for
   * that picture (a bush or a banana plant must never cover the story). */
  /** The solid middle of a thing (a tree's trunk, a hut's walls) as a
   *  standing cylinder — what really blocks a look, unlike its wide leaves. */
  private cores(): { ro: RObj; r: number; h: number }[] {
    return this.objects.filter((ro) => {
      const b = ro.b;
      return !(b.water || b.hill || b.bridge || b.creature || b.person || ro.o.opts?.moves || ro.o.opts?.flat || b.floorTop || CATALOG_BY_TYPE.get(ro.o.type)?.line) && b.height >= 0.8 && b.radius >= 0.12;
    }).map((ro) => ({ ro, r: Math.max(0.25, ro.b.radius), h: ro.b.height }));
  }

  /** The objects whose solid middle is between the eye and a point
   *  (the point's own spot excluded: someone leaning on a tree is fine). */
  blocking(eye: THREE.Vector3, p: THREE.Vector3): RObj[] {
    const out: RObj[] = [];
    const dx = p.x - eye.x, dz = p.z - eye.z, L2 = dx * dx + dz * dz;
    if (L2 < 1e-6) return out;
    const L = Math.sqrt(L2);
    for (const { ro, r, h } of this.cores()) {
      const qx = ro.pos.x, qz = ro.pos.z;
      if (Math.hypot(p.x - qx, p.z - qz) < r) continue; // the point is inside it (someone in a hut)
      // where the eye→point line enters the trunk circle (0 = eye, 1 = point)
      const fx = eye.x - qx, fz = eye.z - qz;
      const b = (fx * dx + fz * dz) / L2, c = (fx * fx + fz * fz - r * r) / L2;
      const disc = b * b - c;
      if (disc <= 0) continue;
      const tIn = -b - Math.sqrt(disc);
      if (tIn <= 0 || tIn >= 1 - 0.05 / L) continue;
      const y = eye.y + (p.y - eye.y) * tIn;
      if (y < ro.pos.y + h) out.push(ro);
    }
    return out;
  }

  /** Is the eye standing inside something solid (a trunk, a wall)? */
  eyeInside(eye: THREE.Vector3): boolean {
    return this.cores().some(({ ro, r, h }) => Math.hypot(eye.x - ro.pos.x, eye.z - ro.pos.z) < r + 0.35 && eye.y < ro.pos.y + h);
  }

  clearView(cam: THREE.Vector3, target: THREE.Vector3, faces: THREE.Vector3[] = []) {
    const mustHide = new Set<RObj>();
    for (const p of faces) for (const ro of this.blocking(cam, p)) mustHide.add(ro);
    for (const { ro, r, h } of this.cores()) if (Math.hypot(cam.x - ro.pos.x, cam.z - ro.pos.z) < r + 0.35 && cam.y < ro.pos.y + h) mustHide.add(ro); // the camera is in a trunk / wall
    const seg = new THREE.Vector3().subVectors(target, cam);
    const L2 = seg.lengthSq();
    const c = new THREE.Vector3();
    for (const ro of this.objects) {
      const b = ro.b;
      if (b.water || b.hill || b.bridge || ro.o.opts?.flat || b.floorTop || CATALOG_BY_TYPE.get(ro.o.type)?.line) continue;
      if (mustHide.has(ro) || ro.stVis === false) { b.root.visible = false; continue; }
      let hide = false;
      const R = b.vr ?? Math.max(0.5, b.radius, b.height * 0.3);
      if (Math.hypot(ro.pos.x - target.x, ro.pos.z - target.z) > R + 1.2) {
        c.set(ro.pos.x, Math.min(b.height * 0.5, Math.max(0.5, target.y)), ro.pos.z);
        const t = Math.max(0, Math.min(1, c.clone().sub(cam).dot(seg) / L2));
        if (t < 0.85) hide = cam.clone().addScaledVector(seg, t).distanceTo(c) < R * 0.95;
        if (Math.hypot(cam.x - ro.pos.x, cam.z - ro.pos.z) < R * 1.15 && cam.y < ro.pos.y + b.height + 0.5) hide = true; // the camera is inside it
      }
      b.root.visible = !hide;
    }
  }

  /** "Any thing" objects show their picture from the Asset Library. */
  async loadIcons() { await loadIconsIn(this.group); }
  /** Free the GPU memory (the designer rebuilds the world after every edit). */
  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    for (const t of this.waterTex) t.dispose();
  }

  /** The night-time / sunset tint for the grass (no lights on it). */
  setGrassLight(k: number) { if (this.grassMat) this.grassMat.color.multiplyScalar(k); }
}

function segAt(segs: Seg[], n: number): Seg {
  let s = segs[0]!;
  for (const x of segs) if (x.f <= n) s = x; else break;
  return s;
}
/** Pictures for every "any thing" sprite under a group (things in the world, things in a hand). */
export async function loadIconsIn(root: THREE.Object3D) {
  const sprites: THREE.Sprite[] = [];
  root.traverse((o) => { if ((o as THREE.Sprite).isSprite && o.userData.iconWord && !o.userData.iconDone) sprites.push(o as THREE.Sprite); });
  for (const sp of sprites) {
    sp.userData.iconDone = true;
    try {
      const res = await (await fetch(`/api/assets/search?q=${encodeURIComponent(sp.userData.iconWord as string)}&limit=1`)).json();
      const src = res?.mine?.[0]?.src ?? res?.openmoji?.[0]?.src;
      if (!src) continue;
      const img = await new Promise<HTMLImageElement>((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = `/api/assets/file/${encodeURIComponent(src)}`; });
      sp.material.map = drawnTexture(256, 256, (x) => x.drawImage(img, 0, 0, 256, 256));
      sp.material.needsUpdate = true;
      sp.visible = true;
    } catch { /* no picture: stays hidden */ }
  }
}

/** Plain words hidden in a model's name ("kitchenfridgelarge" → fridge). */
const KIT_WORDS = ["fridge", "refrigerator", "sink", "stove", "oven", "cabinet", "cupboard", "counter", "table", "chair", "bed", "sofa", "couch",
  "lamp", "shelf", "bookcase", "desk", "door", "television", "tv", "pillow", "rug", "carpet", "plant", "toilet", "bath", "shower", "microwave",
  "washer", "dryer", "mirror", "bench", "stool", "drawer", "wardrobe", "closet", "box", "crate", "barrel", "car", "truck", "bus", "taxi", "van",
  "train", "plane", "boat", "ship", "tree", "bush", "rock", "fence", "house", "shop", "tower", "bridge", "statue", "fountain", "sign", "light",
  "laptop", "computer", "radio", "speaker", "piano", "guitar", "bear", "teddy", "coat", "hanger", "trash", "bin"];
const KIT_SYN: Record<string, string[]> = { cabinet: ["cupboard", "counter", "shelf"], kitchencabinet: ["counter", "cupboard", "shelf"], bookcase: ["shelf", "shelves"],
  sofa: ["couch"], loungesofa: ["couch", "sofa"], fridge: ["refrigerator"], television: ["tv"], rug: ["carpet"], beddouble: ["bed"], bedsingle: ["bed"] };
export function kitWords(id: string, words = ""): string[] {
  const tail = id.split("/").pop()!.toLowerCase();
  const out = new Set<string>([tail, ...tail.split(/[-_]/), ...words.split(/\s+/).filter((x) => x.length > 2)]);
  for (const k of KIT_WORDS) if (tail.includes(k)) out.add(k);
  for (const [k, syn] of Object.entries(KIT_SYN)) if (tail.includes(k)) syn.forEach((x) => out.add(x));
  return [...out];
}

const NOT_THINGS = new Set(["thing", "way", "time", "place", "here", "there", "one", "big", "small", "look", "come", "water"]);
export function norm(w: string): string {
  let s = w.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\b(the|a|an|my|your|that|this|big|small|old)\b/g, " ").replace(/\s+/g, " ").trim();
  if (s.length > 3 && s.endsWith("es") && /(oes|ches|shes)$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  return s;
}
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export type { Vec2 };
export { FPS };
