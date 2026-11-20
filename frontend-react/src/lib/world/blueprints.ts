/**
 * Place BLUEPRINTS (user, 2026-11-18: "a detailed airport / a real city —
 * not a bare road and three boxes"). Each blueprint knows what such a
 * place really has and how it is laid out, and fills it densely with
 * ready-made models (kits.ts) + our designed things (starter.ts):
 *
 *   city street, suburb, airport (outside + terminal inside), railway
 *   station, railroad across a canyon, park, forest camp, beach / harbour,
 *   farm, graveyard, castle, space base, desert, construction site,
 *   and rooms: bedroom, living room, kitchen, bathroom, classroom, office,
 *   restaurant / café, shop / supermarket, library, hospital, train / bus.
 *
 * Rules every blueprint follows (one place, so all of them obey):
 *  - nothing is placed inside anything else (footprints are checked),
 *  - where the characters stand stays free, and nothing tall stands
 *    between them and the camera (+z),
 *  - roads / tracks / runways keep their lanes clear,
 *  - the place goes on to the horizon (far rows), so no empty edges.
 * A seed makes every video's layout different (colours, which houses…).
 */
import { allKits, findKit, kitInfo } from "./kits";
import { STARTER } from "./starter";
import type { GroundKind, ModelDef, RoomDef, TimeOfDay, WorldDoc, WorldObj } from "./types";

type Rect = { x: number; z: number; hw: number; hd: number };
type Opts = Partial<WorldObj> & { opts?: Record<string, unknown> };

export type Blueprint = {
  id: string;
  label: string;
  words: RegExp; // what in a scene's words means this place
  inside?: boolean;
  ground: GroundKind;
  kind: string; // the closest 2D place
  build: (c: Ctx) => void;
};

function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export class Ctx {
  objs: WorldObj[] = [];
  models: Record<string, ModelDef> = {};
  room?: RoomDef;
  time: TimeOfDay = "day";
  grass = 0.6;
  tints: string[] = PASTEL; // colours for buildings / walls (a reference picture can set them)
  dens = 1; // how full the place is
  private solids: Rect[] = [];
  private clear: Rect[] = []; // lanes, stage: no solid thing here
  private low: Rect[] = []; // camera side: only low things here
  private n = 0;
  r: () => number;
  constructor(public seed: number, public span: number, public words: string) {
    this.r = rng(seed * 9301 + 49297);
    const S = span / 2 + 0.8;
    this.keepClear(0, 0.4, S, 1.9); // where the characters stand (z -1.5 … 2.3)
    this.keepLow(0, 6.5, S + 3, 4.2); // between them and the camera
  }
  pick<T>(list: readonly T[]): T { return list[Math.floor(this.r() * list.length) % list.length]!; }
  between(a: number, b: number) { return a + (b - a) * this.r(); }
  has(re: RegExp) { return re.test(this.words); }
  keepClear(x: number, z: number, hw: number, hd: number) { this.clear.push({ x, z, hw, hd }); }
  keepLow(x: number, z: number, hw: number, hd: number) { this.low.push({ x, z, hw, hd }); }

  private hit(a: Rect, list: Rect[], pad = 0) {
    return list.some((b) => Math.abs(a.x - b.x) < a.hw + b.hw + pad && Math.abs(a.z - b.z) < a.hd + b.hd + pad);
  }
  /** Can a thing of this footprint / height stand here? */
  free(x: number, z: number, w: number, d: number, h: number, solid = true, pad = 0.15): boolean {
    const r: Rect = { x, z, hw: w / 2, hd: d / 2 };
    if (solid && this.hit(r, this.solids, pad)) return false;
    if (solid && this.hit(r, this.clear)) return false;
    if (h > 1.2 && this.hit(r, this.low)) return false;
    return true;
  }
  private take(x: number, z: number, w: number, d: number) { this.solids.push({ x, z, hw: w / 2, hd: d / 2 }); }

  private push(type: string, x: number, z: number, rot: number, extra: Opts): WorldObj {
    const o: WorldObj = { id: `${type}-${this.seed}-${this.n++}`, type, x: +x.toFixed(2), z: +z.toFixed(2), rot, scale: 1, ...extra } as WorldObj;
    this.objs.push(o);
    return o;
  }
  /** A ready-made model. Returns null (and adds nothing) if it would overlap. */
  kit(id: string, x: number, z: number, rot = 0, extra: Opts & { force?: boolean; flat?: boolean } = {}): WorldObj | null {
    const info = kitInfo(id);
    if (!info) return null;
    const k = (extra.scale ?? 1) * Number(extra.opts?.size ?? 1);
    const veh = info.cat === "vehicle"; // vehicles lead along +x (like ours)
    const bw = veh ? info.d : info.w, bd = veh ? info.w : info.d;
    const q = Math.abs(Math.sin(rot)) > 0.7;
    const w = (q ? bd : bw) * k, d = (q ? bw : bd) * k, h = info.h * k;
    const flat = extra.flat ?? (info.cat === "road" || h < 0.15);
    if (!extra.force && !this.free(x, z, w, d, h, !flat)) return null;
    if (!flat) this.take(x, z, w, d);
    const { force: _f, flat: _fl, ...rest } = extra;
    return this.push("kit", x, z, rot, { ...rest, opts: { ...(rest.opts ?? {}), kit: id } });
  }
  /** One of our designed things (airplane, terminal, train…). */
  model(name: string, x: number, z: number, rot: number, size: [number, number, number], extra: Opts & { force?: boolean } = {}): WorldObj | null {
    const def = STARTER[name];
    if (!def) return null;
    const q = Math.abs(Math.sin(rot)) > 0.7;
    const w = q ? size[2] : size[0], d = q ? size[0] : size[2];
    if (!extra.force && !extra.opts?.moves && !this.free(x, z, w, d, size[1], true)) return null;
    if (!extra.opts?.moves) this.take(x, z, w, d);
    this.models[name] = def;
    const { force: _f, ...rest } = extra;
    return this.push("model", x, z, rot, { ...rest, opts: { ...(rest.opts ?? {}), model: name } });
  }
  /** A flat slab (pavement, tarmac, platform, rug…) you can stand on. */
  slab(x: number, z: number, w: number, d: number, color: string, h = 0.12, rot = 0) {
    const key = `slab_${color.replace("#", "")}_${Math.round(w * 10)}_${Math.round(d * 10)}_${Math.round(h * 100)}`;
    this.models[key] = { label: "ground", floor: true, parts: [{ shape: "box", size: [w, h, d], pos: [0, h / 2, 0], color }] };
    return this.push("model", x, z, rot, { scale: 1, opts: { model: key, flat: true }, traits: { solid: false } as WorldObj["traits"] });
  }
  /** A thing designed right here from simple parts (a studio screen, LED pillars…). */
  custom(key: string, def: ModelDef, x: number, z: number, rot = 0, extra: Opts = {}) {
    this.models[key] = def;
    return this.push("model", x, z, rot, { scale: 1, ...extra, opts: { ...(extra.opts ?? {}), model: key }, traits: { solid: false } as WorldObj["traits"] });
  }
  /** Any of the old builders (trees, river, hill, people…). */
  thing(type: string, x: number, z: number, rot = 0, extra: Opts & { w?: number; d?: number; h?: number; solid?: boolean } = {}) {
    const w = extra.w ?? 1, d = extra.d ?? w, h = extra.h ?? 1.5;
    const solid = extra.solid ?? true;
    if (solid && !this.free(x, z, w, d, h, true)) return null;
    if (solid) this.take(x, z, w, d);
    const { w: _w, d: _d, h: _h, solid: _s, ...rest } = extra;
    return this.push(type, x, z, rot, rest);
  }
  /** Ids of the ready-made models whose id matches (from the whole library). */
  ids(re: RegExp, cat?: string): string[] {
    return allKits().filter((m) => re.test(m.id) && (!cat || m.cat === cat)).map((m) => m.id);
  }
  /** Try a few spots until one is free. */
  scatter(make: (x: number, z: number) => WorldObj | null, n: number, x0: number, x1: number, z0: number, z1: number, tries = 6) {
    let made = 0;
    n = Math.max(1, Math.round(n * this.dens));
    for (let i = 0; i < n * tries && made < n; i++) if (make(this.between(x0, x1), this.between(z0, z1))) made++;
    return made;
  }
}

const PASTEL = ["#ffd6e0", "#ffe9a8", "#c8f7dc", "#cde7ff", "#e5d4ff", "#ffd8b5", "#d4f0f0", "#fff1c1", "#f9c6c9", "#d9f99d"];
const CAR = /car-kit\/(sedan|suv|taxi|hatchback-sports|van|sedan-sports|suv-luxury|delivery|police|truck)$/;
const D90 = Math.PI / 2;

// ---------------------------------------------------------------- outdoor
function cityStreet(c: Ctx) {
  const S = c.span / 2;
  const L = 90; // the street goes on and on
  // sidewalk the characters stand on, the road behind them, shops behind that
  pavement(c, 0, 0.4, L, 5.2);
  c.slab(0, 8, L, 10, "#b8bcc4", 0.13); // the square on the camera side
  c.slab(0, -2.35, L, 0.35, "#8b8f97", 0.2); // kerb
  for (let x = -L / 2 + 3.5; x < L / 2; x += 7) c.kit("city-kit-roads/road-straight", x, -6, D90, { flat: true, force: true });
  c.keepClear(0, -6, L / 2, 3.6); // the road: only cars
  pavement(c, 0, -10.4, L, 5);
  // crossing + traffic lights
  const cx = c.pick([-S - 6, S + 6]);
  c.kit("city-kit-roads/road-crossing", cx, -6, D90, { flat: true, force: true });
  c.kit("city-kit-roads/traffic-light", cx - 4, -2.9, Math.PI, { force: true });
  c.kit("city-kit-roads/traffic-light", cx + 4, -9.3, 0, { force: true });
  // shops / houses / offices behind the road (fronts face the camera), pastel colours
  const shops = c.ids(/city-kit-commercial\/building-[a-n]$/);
  const tall = c.ids(/city-kit-commercial\/building-skyscraper/);
  let x = -L / 2;
  while (x < L / 2) {
    const id = c.r() < 0.15 && tall.length ? c.pick(tall) : c.pick(shops);
    const info = kitInfo(id);
    if (!info) break;
    const k = c.between(0.9, 1.15);
    const w = info.w * k;
    const o = c.kit(id, x + w / 2, -13 - info.d * k / 2, 0, { scale: k, opts: { tint: c.pick(c.tints) } });
    if (o && c.r() < 0.55) c.kit(c.pick(["city-kit-commercial/detail-awning", "city-kit-commercial/detail-awning-wide"]), x + w / 2, -12.6, 0, { force: true, opts: { tint: c.pick(c.tints) } });
    x += w + c.between(0.2, 1.2);
  }
  // the camera-side row (seen when the camera turns around)
  x = -L / 2;
  while (x < L / 2) {
    const id = c.pick(shops);
    const info = kitInfo(id);
    if (!info) break;
    c.kit(id, x + info.w / 2, 13 + info.d / 2, Math.PI, { opts: { tint: c.pick(c.tints) } });
    x += info.w + c.between(0.3, 1.5);
  }
  // street furniture on our sidewalk: lamps, trees in planters, benches, bins, parasols
  for (let lx = -L / 2 + 4; lx < L / 2; lx += 9) {
    if (Math.abs(lx) < S + 1) continue;
    c.kit(c.pick(["city-kit-roads/light-square", "city-kit-roads/light-curved"]), lx, -2.0, Math.PI, { force: true });
    if (Math.abs(lx + 4.5) > S + 2 && c.kit("city-kit-suburban/planter", lx + 4.5, -1.9, 0, { force: true })) c.kit("city-kit-suburban/tree-small", lx + 4.5, -1.9, 0, { force: true, opts: { y: 0.3 } });
  }
  c.scatter((sx, sz) => c.kit(c.pick(["furniture-kit/bench", "city-kit-roads/dumpster", "city-kit-commercial/detail-parasol-a", "city-kit-commercial/detail-parasol-b"]), sx, sz, c.pick([0, Math.PI])), 6, -L / 2 + 3, L / 2 - 3, -2, 2.5);
  for (let lx = -L / 2 + 8; lx < L / 2; lx += 11) c.kit("city-kit-roads/light-square", lx, -8.4, 0);
  // traffic: cars both ways
  const cars = c.ids(CAR);
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 ? 1 : -1;
    c.kit(c.pick(cars), c.between(-30, 30), dir > 0 ? -7.6 : -4.4, dir > 0 ? D90 : -D90, { opts: { moves: "loop", dir, speed: c.between(0.1, 0.18), tint: c.r() < 0.4 ? c.pick(c.tints) : "" }, force: true });
    void D90;
  }
  // parked cars + people on the far sidewalk
  c.scatter((sx) => c.kit(c.pick(cars), sx, -9.1, c.pick([0, Math.PI])), 3, -L / 2 + 5, L / 2 - 5, 0, 0);
  c.scatter((sx, sz) => c.thing("person", sx, sz, c.r() * 6, { opts: { doing: c.pick(["walk", "talk", "wave", "walk"]) }, w: 0.6 }), 7, -L / 2 + 4, L / 2 - 4, -11.6, -9.4);
  // skyline far away
  const far = c.ids(/low-detail-building/);
  for (let fx = -70; fx < 70; fx += c.between(6, 11)) c.kit(c.pick(far), fx, c.between(-34, -46), 0, { scale: c.between(1.2, 2), force: true, opts: { tint: c.pick(c.tints) } });
  c.grass = 0;
}

function suburb(c: Ctx) {
  const L = 80, S = c.span / 2;
  c.slab(0, 0.6, L, 4.4, "#e7e5e4", 0.1);
  for (let x = -L / 2 + 3.5; x < L / 2; x += 7) c.kit("city-kit-roads/road-straight", x, -5.2, D90, { flat: true, force: true });
  c.keepClear(0, -5.2, L / 2, 3.6);
  const houses = c.ids(/city-kit-suburban\/building-type/);
  let x = -L / 2;
  while (x < L / 2) {
    const id = c.pick(houses);
    const info = kitInfo(id)!;
    const z = -13 - info.d / 2;
    if (c.kit(id, x + info.w / 2, z, 0, { opts: { tint: c.r() < 0.5 ? c.pick(c.tints) : "" } })) {
      c.kit(c.pick(["city-kit-suburban/driveway-short", "city-kit-suburban/path-short", "city-kit-suburban/path-stones-short"]), x + info.w / 2, -10.2, 0, { flat: true, force: true });
      c.kit(c.pick(["city-kit-suburban/fence-1x3", "city-kit-suburban/fence-1x4", "city-kit-suburban/fence-low"]), x + info.w / 2 + info.w * 0.32, -9.5, 0);
      c.kit(c.pick(["city-kit-suburban/tree-large", "city-kit-suburban/tree-small"]), x + 1, -11 - c.r() * 3, 0);
    }
    x += info.w + c.between(2, 4);
  }
  x = -L / 2;
  while (x < L / 2) {
    const id = c.pick(houses);
    const info = kitInfo(id)!;
    c.kit(id, x + info.w / 2, 12 + info.d / 2, Math.PI);
    x += info.w + c.between(2, 5);
  }
  for (let lx = -L / 2 + 5; lx < L / 2; lx += 12) if (Math.abs(lx) > S + 1) c.kit("city-kit-roads/light-curved", lx, -1.6, Math.PI);
  const cars = c.ids(CAR);
  for (let i = 0; i < 3; i++) c.kit(c.pick(cars), c.between(-30, 30), i % 2 ? -6.8 : -3.6, i % 2 ? D90 : -D90, { opts: { moves: "loop", dir: i % 2 ? 1 : -1, speed: 0.1 }, force: true });
  c.scatter((sx, sz) => c.thing("person", sx, sz, c.r() * 6, { opts: { doing: c.pick(["walk", "talk", "wave"]) }, w: 0.6 }), 4, -30, 30, -9.5, -8);
  natureRing(c, 30, 0.6);
  c.grass = 0.7;
}

function airport(c: Ctx) {
  // the apron (tarmac): characters stand near a parked plane, the terminal behind
  c.slab(0, -10, 220, 70, "#9ca3af", 0.08);
  c.slab(0, 0.5, 40, 4.4, "#d1d5db", 0.12); // walkway / stand
  for (let x = -60; x <= 60; x += 4) c.slab(x, 3.4, 2, 0.18, "#facc15", 0.1); // taxi line
  // the terminal with gates + jet bridges, planes at the gates
  c.model("terminal", 0, -34, 0, [60, 11, 22], { force: true });
  c.model("terminal", -62, -34, 0, [60, 11, 22], { force: true });
  c.model("terminal", 62, -34, 0, [60, 11, 22], { force: true });
  for (const gx of [-40, -14, 14, 40]) {
    c.model("jet_bridge", gx - 7, -23, -D90, [3, 6, 15], { force: true });
    c.model("airplane", gx + 7, -12, D90, [28, 9, 27], { force: true, opts: { tint: "" } });
  }
  // the plane right behind the characters
  c.model("airplane", c.pick([-11, 11]), -16, 0, [28, 9, 27], { force: true });
  // ground vehicles + cones + baggage
  const gv = ["car-kit/delivery-flat", "car-kit/truck", "car-kit/van", "car-kit/truck-flat", "car-kit/box"];
  c.scatter((x, z) => c.kit(c.pick(gv), x, z, c.r() * 6), 7, -50, 50, -20, -4);
  c.scatter((x, z) => c.kit(c.pick(["car-kit/cone", "city-kit-roads/construction-cone"]), x, z, 0), 12, -30, 30, -16, -1.8);
  // the control tower, a runway with markings far away, a plane taking off
  c.model("control_tower", c.pick([-48, 48]), -60, 0, [8, 31, 8], { force: true });
  c.slab(0, -82, 400, 18, "#4b5563", 0.1);
  for (let x = -190; x < 190; x += 12) c.slab(x, -82, 6, 0.6, "#ffffff", 0.12);
  c.model("airplane", -30, -82, 0, [28, 9, 27], { force: true, opts: { moves: "loop", speed: 0.35, lift: 0 } });
  // people waiting / working
  c.scatter((x, z) => c.thing("person", x, z, c.r() * 6, { opts: { doing: c.pick(["walk", "work", "wave", "talk"]) }, w: 0.6 }), 6, -25, 25, -12, -2.5);
  c.grass = 0;
}

function railwayStation(c: Ctx) {
  const L = 70;
  c.model("platform", 0, 0.4, 0, [30, 0.6, 3.6], { force: true });
  c.model("platform", -30, 0.4, 0, [30, 0.6, 3.6], { force: true });
  c.model("platform", 30, 0.4, 0, [30, 0.6, 3.6], { force: true });
  for (let x = -L; x <= L; x += 2) c.model("rail_track", x, -3.6, 0, [2, 0.3, 3.2], { force: true });
  c.keepClear(0, -3.6, L, 1.8);
  c.model("train", 6, -3.6, 0, [36, 4, 3], { opts: { moves: "arrive", lift: 0, passengers: true } });
  c.model("station_building", c.pick([-12, 12]), 5.6, Math.PI, [9, 6, 6]);
  for (const x of [-14, -7, 7, 14]) c.kit("graveyard-kit/lightpost-single", x, 1.6, 0);
  c.scatter((x, z) => c.kit(c.pick(["furniture-kit/bench", "furniture-kit/benchcushion"]), x, z, Math.PI), 4, -18, 18, 1.2, 1.8);
  c.scatter((x, z) => c.thing("person", x, z, c.r() * 6, { opts: { doing: c.pick(["walk", "talk", "wave"]) }, w: 0.6 }), 6, -25, 25, -0.5, 2);
  natureRing(c, 18, 0.5, -10);
  c.grass = 0.5;
}

/** A railroad along the edge of a canyon so deep you can't see the bottom (and a bridge across it). */
function canyonRailroad(c: Ctx) {
  c.time = c.pick(["day", "sunset"] as const);
  const H = 14; // the rim is this high above the canyon floor
  // the near rim: a high plateau the characters (and the railroad) are on
  c.slab(0, 13, 240, 38, "#c2703d", H);
  c.slab(0, -50, 240, 26, "#b4632f", H - 3); // the far rim, a bit lower: you look down into the canyon
  c.slab(0, -23, 240, 36, "#24160e", 0.05); // the canyon floor, far below (dark)
  c.slab(0, -23, 240, 3, "#1d4ed8", 0.08); // a thin river at the bottom
  const cliffs = c.ids(/nature-kit\/cliff-(large|rock|stone)$/);
  for (let x = -70; x <= 70; x += 4) {
    // rock faces: blocks INSIDE each rim, so only their rocky face shows at the edge
    const a = c.pick(cliffs), b = c.pick(cliffs);
    const ka = H / (kitInfo(a)?.h || 3), kb = (H - 3) / (kitInfo(b)?.h || 3); // exactly as high as the rim
    c.kit(a, x, -6 + ((kitInfo(a)?.d ?? 3) * ka) / 2, Math.PI, { scale: ka, force: true, opts: { fromGround: true } }); // the near wall going down
    c.kit(b, x, -37 - ((kitInfo(b)?.d ?? 3) * kb) / 2, 0, { scale: kb, force: true, name: Math.abs(x) < 2 ? "canyon" : undefined, opts: { fromGround: true } }); // the far wall
  }
  // the railroad on the rim
  for (let x = -80; x <= 80; x += 2) c.model("rail_track", x, -3.4, 0, [2, 0.3, 3.2], { force: true });
  c.keepClear(0, -3.4, 80, 1.8);
  c.model("train", 0, -3.4, 0, [36, 4, 3], { opts: { moves: "loop", speed: 0.16, passengers: true } });
  // a bridge across the canyon (deck at the rim height, tall legs down to the floor)
  const bx = c.pick([-24, 24]);
  c.slab(bx, -22, 4, 34, "#7c5a3c", 0.5, 0).opts!.y = H - 0.5;
  for (let z = -10; z >= -36; z -= 6) c.slab(bx, z, 1.2, 1.2, "#6b4f3a", H - 0.5);
  for (let z = -6; z >= -38; z -= 3.2) c.model("rail_track", bx, z, Math.PI / 2, [2, 0.3, 3.2], { force: true });
  // rocks, dry plants, a signpost on the rim
  c.scatter((x, z) => c.kit(c.pick(c.ids(/nature-kit\/(rock-tall|rock-large|stone-tall)/)), x, z, c.r() * 6), 12, -45, 45, 3, 16);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/nature-kit\/(cactus|plant-bush)/)), x, z, 0), 10, -45, 45, -1.5, 14);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/nature-kit\/(rock-tall|cactus-tall)/)), x, z, 0, { scale: 2 }), 12, -60, 60, -52, -42);
  c.grass = 0.15;
}

/** Pavement: light grey slabs with tile lines. */
function pavement(c: Ctx, x: number, z: number, w: number, d: number) {
  c.slab(x, z, w, d, "#bfc5cf", 0.14);
  for (let lx = x - w / 2 + 2; lx < x + w / 2; lx += 2) c.slab(lx, z, 0.05, d, "#a9adb5", 0.145);
}

function park(c: Ctx) {
  const trees = c.ids(/nature-kit\/tree-(default|oak|detailed|fat|plateau|simple|tall)$/);
  for (let x = -40; x <= 40; x += 3) c.kit("nature-kit/path-stone", x, 0.5, 0, { flat: true, force: true, scale: 0.8 });
  c.scatter((x, z) => c.kit(c.pick(trees), x, z, c.r() * 6, { scale: c.between(0.9, 1.4) }), 30, -45, 45, -30, -2.5);
  c.scatter((x, z) => c.kit(c.pick(trees), x, z, c.r() * 6, { scale: c.between(0.9, 1.4) }), 12, -45, 45, 9, 25);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/nature-kit\/(plant-bush|flower-)/)), x, z, 0), 40, -40, 40, -14, 8);
  c.scatter((x, z) => c.kit("furniture-kit/bench", x, z, Math.PI, { force: false }), 4, -20, 20, -2.4, -2);
  for (const x of [-12, 12, -26, 26]) c.kit("graveyard-kit/lightpost-single", x, -1.6, 0);
  c.thing("pond", c.pick([-14, 14]), -9, 0, { opts: { radius: 3.5 }, w: 7.5, solid: false });
  c.kit("nature-kit/statue-column", 0, -8, 0);
  c.scatter((x, z) => c.thing("person", x, z, c.r() * 6, { opts: { doing: c.pick(["walk", "talk", "sit", "wave"]) }, w: 0.6 }), 5, -25, 25, -10, -3);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/cube-pets\/animal-(dog|cat|bunny|parrot)/)), x, z, c.r() * 6), 2, -15, 15, -6, -2.5);
  c.grass = 1;
}

function forestCamp(c: Ctx) {
  const trees = c.ids(/nature-kit\/tree-(pine|cone|default|tall|detailed)/);
  c.scatter((x, z) => c.kit(c.pick(trees), x, z, c.r() * 6, { scale: c.between(1, 1.6) }), 70, -50, 50, -40, -3);
  c.scatter((x, z) => c.kit(c.pick(trees), x, z, c.r() * 6, { scale: c.between(1, 1.6) }), 25, -50, 50, 10, 35);
  c.kit(c.pick(["nature-kit/tent-detailedopen", "nature-kit/tent-smallopen"]), c.pick([-6, 6]), -5, 0, { scale: 1.3 });
  c.kit("nature-kit/tent-detailedclosed", c.pick([-11, 11]), -7, 0.4, { scale: 1.3 });
  c.thing("campfire", 0, -3.6, 0, { w: 1.2 });
  c.kit("nature-kit/log", -2.2, -3.6, D90); c.kit("nature-kit/log", 2.2, -3.6, D90);
  c.kit("nature-kit/log-stack", 8, -4, 0);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/nature-kit\/(rock-large|stone-large|mushroom|plant-bush|stump)/)), x, z, c.r() * 6), 25, -35, 35, -20, 6);
  c.thing("river", 0, -16, 0, { points: [[-60, -16], [-20, -14], [20, -17], [60, -15]], opts: { width: 4, fish: 4 }, solid: false });
  c.grass = 0.9;
}

function beachHarbour(c: Ctx) {
  const palms = c.ids(/pirate-kit\/palm|nature-kit\/tree-palm/);
  c.thing("river", 0, -26, 0, { points: [[-100, -26], [0, -25], [100, -26]], opts: { width: 26, fish: 8 }, solid: false });
  c.kit("pirate-kit/structure-platform-dock", c.pick([-10, 10]), -9, 0, { scale: 1.2 });
  c.kit(c.pick(["pirate-kit/ship-pirate-large", "pirate-kit/ship-large", "pirate-kit/ship-medium"]), c.pick([-20, 20]), -26, D90, { force: true });
  c.kit(c.pick(["pirate-kit/boat-row-large", "nature-kit/canoe"]), 3, -11, 0.3, { force: true });
  c.scatter((x, z) => c.kit(c.pick(palms), x, z, c.r() * 6, { scale: c.between(0.9, 1.3) }), 16, -40, 40, -8, 14);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/pirate-kit\/(rocks-sand|patch-sand|barrel|crate|chest)/)), x, z, c.r() * 6), 14, -35, 35, -8, 8);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/cube-pets\/animal-(crab|parrot)/)), x, z, c.r() * 6), 3, -12, 12, -5, -2);
  c.grass = 0;
}

function farm(c: Ctx) {
  c.model("barn", c.pick([-10, 10]), -12, 0, [8.5, 8, 6.5]);
  for (let x = -40; x < 40; x += 2.2) for (let z = -26; z < -18; z += 2.2) c.kit(c.pick(c.ids(/nature-kit\/crops-(corn|wheat|leafs)/)), x, z, 0, { scale: 1.2 });
  for (let x = -40; x < 40; x += 3) { c.kit("nature-kit/fence-simple", x, -3.2, 0, { scale: 1.3 }); }
  const animals = c.ids(/cube-pets\/animal-(cow|pig|chick|hog)|prototype-kit\/animal-horse/);
  c.scatter((x, z) => c.kit(c.pick(animals), x, z, c.r() * 6), 7, -30, 30, -16, -5);
  c.kit(c.pick(["car-kit/tractor", "car-kit/tractor-shovel"]), c.pick([-18, 18]), -7, 0.6);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/graveyard-kit\/hay-bale/)), x, z, c.r() * 6), 6, -30, 30, -16, -4);
  natureRing(c, 32, 0.8);
  c.grass = 0.8;
}

function graveyard(c: Ctx) {
  c.time = "night";
  const graves = c.ids(/graveyard-kit\/(gravestone|grave$|cross)/);
  for (let x = -24; x <= 24; x += 2.6) for (let z = -18; z <= -4; z += 3) if (c.r() < 0.8) c.kit(c.pick(graves), x + c.between(-0.4, 0.4), z, 0);
  c.kit(c.pick(["graveyard-kit/crypt-large", "graveyard-kit/crypt-a", "graveyard-kit/crypt-b"]), c.pick([-12, 12]), -22, 0, { force: true });
  for (let x = -30; x <= 30; x += 2) c.kit("graveyard-kit/iron-fence", x, -2.8, 0, { force: true });
  c.scatter((x, z) => c.kit(c.pick(c.ids(/graveyard-kit\/(pine|pumpkin|lantern|lightpost|candle|urn)/)), x, z, c.r() * 6), 18, -30, 30, -26, 6);
  c.grass = 0.4;
}

function castle(c: Ctx) {
  for (let x = -24; x <= 24; x += c.span > 12 ? 4.5 : 4.5) c.kit("castle-kit/wall", x, -14, 0, { force: true });
  for (const x of [-27, 27]) { c.kit("castle-kit/tower-square", x, -14, 0, { force: true, scale: 1.2 }); c.kit("castle-kit/tower-square-roof", x, -14, 0, { force: true, scale: 1.2, opts: { y: 6.5 } }); }
  c.kit("castle-kit/gate", 0, -14.2, 0, { force: true });
  c.kit("castle-kit/flag-banner-long", -6, -13, 0); c.kit("castle-kit/flag-banner-long", 6, -13, 0);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/castle-kit\/(siege|tree|rocks)/)), x, z, c.r() * 6), 8, -30, 30, -10, 8);
  natureRing(c, 36, 0.6);
  c.grass = 0.8;
}

function spaceBase(c: Ctx) {
  c.time = "night";
  c.scatter((x, z) => c.kit(c.pick(c.ids(/space-kit\/(hangar|structure$|machine|satellitedish)/)), x, z, c.pick([0, D90])), 10, -45, 45, -35, -6);
  c.kit(c.pick(["space-kit/rocket-basea", "space-kit/rocket-baseb"]), c.pick([-14, 14]), -14, 0, { scale: 1.4 });
  c.scatter((x, z) => c.kit(c.pick(c.ids(/space-kit\/(rock|crater|meteor)/)), x, z, c.r() * 6), 20, -45, 45, -30, 15);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/space-kit\/(rover|craft-)/)), x, z, c.r() * 6), 3, -25, 25, -12, -4);
  c.scatter((x, z) => c.kit(c.pick(["space-kit/astronauta", "space-kit/astronautb", "space-kit/alien"]), x, z, c.r() * 6), 3, -15, 15, -9, -3);
  c.grass = 0;
}

function desert(c: Ctx) {
  c.scatter((x, z) => c.kit(c.pick(c.ids(/nature-kit\/(cactus|rock-tall|rock-large|stone-tall)/)), x, z, c.r() * 6, { scale: c.between(1, 2) }), 40, -55, 55, -40, 20);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/cube-pets\/animal-(crab|fox)|prototype-kit\/animal-(bison|horse)/)), x, z, c.r() * 6), 2, -20, 20, -10, -3);
  c.grass = 0;
}

function construction(c: Ctx) {
  c.slab(0, -8, 60, 20, "#a16207", 0.04);
  c.scatter((x, z) => c.kit(c.pick(c.ids(/city-kit-roads\/construction|car-kit\/(cone|tractor-shovel|truck)|tower-defense-kit\/wood-structure/)), x, z, c.r() * 6), 18, -30, 30, -18, -2);
  c.kit("city-kit-commercial/building-skyscraper-a", 0, -26, 0, { force: true, scale: 0.8, opts: { tint: "#fde68a" } });
  cityBackdrop(c);
  c.grass = 0.1;
}

/** Trees / bushes all round (no empty edges). */
function natureRing(c: Ctx, inner: number, density = 1, zMin = -60) {
  const trees = c.ids(/nature-kit\/tree-(default|oak|detailed|fat|tall|simple|pine)/);
  const n = Math.round(60 * density);
  c.scatter((x, z) => (Math.hypot(x, z * 1.3) > inner ? c.kit(c.pick(trees), x, z, c.r() * 6, { scale: c.between(1, 1.6) }) : null), n, -70, 70, zMin, 50);
}
function cityBackdrop(c: Ctx) {
  const far = c.ids(/low-detail-building/);
  for (let fx = -70; fx < 70; fx += c.between(6, 11)) c.kit(c.pick(far), fx, c.between(-40, -52), 0, { scale: c.between(1.2, 2), force: true, opts: { tint: c.pick(c.tints) } });
}

// ---------------------------------------------------------------- rooms
/** A room: walls from RoomDef, then furniture along the back and side walls. */
function roomBase(c: Ctx, room: RoomDef) {
  c.room = room;
  const W = room.width ?? 10, D = room.depth ?? 7;
  c.grass = 0;
  return { W, D, back: 2 - D + 0.5, left: -W / 2 + 0.6, right: W / 2 - 0.6 };
}
function furnish(c: Ctx, ids: string[], z: number, x0: number, x1: number, rot = 0, gap = 0.3) {
  // the row is centred (narrow videos only see the middle of a room)
  const total = ids.reduce((t, id) => { const i = kitInfo(id); return t + (i ? (Math.abs(Math.sin(rot)) > 0.7 ? i.d : i.w) + gap : 0); }, -gap);
  let x = Math.max(x0, -total / 2);
  for (const id of ids) {
    const info = kitInfo(id);
    if (!info) continue;
    const w = Math.abs(Math.sin(rot)) > 0.7 ? info.d : info.w;
    if (x + w > x1) break;
    c.kit(id, x + w / 2, z, rot);
    x += w + gap;
  }
}
function bedroom(c: Ctx) {
  const R = roomBase(c, { width: 11, depth: 7, height: 3.2, wall: c.pick(["#fde2e4", "#e0f2fe", "#fef3c7", "#ede9fe"]), floor: "#c8a27a", windows: 2, lamps: true });
  furnish(c, ["furniture-kit/beddouble", "furniture-kit/sidetabledrawers", "furniture-kit/bookcaseclosed", "furniture-kit/desk", "furniture-kit/chairdesk"], R.back + 0.6, R.left, R.right, 0);
  c.kit("furniture-kit/rugrounded", 0, -1.8, 0, { flat: true, force: true });
  c.kit("furniture-kit/lamproundtable", R.left + 2.6, R.back + 0.4, 0, { force: true, opts: { y: 0.6 } });
  c.kit("furniture-kit/pottedplant", R.right - 0.2, -1.5, 0);
  c.kit("furniture-kit/bear", R.left + 1, R.back + 1.4, 0, { force: true });
}
function livingRoom(c: Ctx) {
  const R = roomBase(c, { width: 12, depth: 7, height: 3.2, wall: c.pick(["#f5e6c8", "#e7f5e8", "#fde68a", "#e0e7ff"]), floor: "#a87c55", windows: 2, lamps: true });
  furnish(c, ["furniture-kit/bookcaseopen", "furniture-kit/cabinettelevision", "furniture-kit/pottedplant", "furniture-kit/loungesofa", "furniture-kit/lampsquarefloor"], R.back + 0.5, R.left, R.right, 0);
  c.kit("furniture-kit/televisionmodern", R.left + 2.2, R.back + 0.4, 0, { force: true, opts: { y: 0.55 } });
  c.kit("furniture-kit/rugrectangle", 0, -1.5, 0, { flat: true, force: true });
  c.kit("furniture-kit/tablecoffee", 0, -3, 0);
  c.kit("furniture-kit/loungechair", R.right - 0.8, -2.5, -D90);
}
function kitchen(c: Ctx) {
  const R = roomBase(c, { width: 11, depth: 6.5, height: 3, wall: c.pick(["#ecfccb", "#fff7ed", "#e0f2fe"]), floor: "#e5e7eb", windows: 1, lamps: true });
  furnish(c, ["furniture-kit/kitchenfridgelarge", "furniture-kit/kitchencabinet", "furniture-kit/kitchensink", "furniture-kit/kitchencabinetdrawer", "furniture-kit/kitchenstove", "furniture-kit/kitchencabinet", "furniture-kit/kitchencabinet"], R.back + 0.35, R.left, R.right, 0, 0);
  c.kit("furniture-kit/kitchenmicrowave", R.left + 3.5, R.back + 0.3, 0, { force: true, opts: { y: 0.95 } });
  c.kit("furniture-kit/table", 0, -2.6, 0);
  for (const x of [-1.1, 1.1]) c.kit("furniture-kit/chair", x, -2.6, x < 0 ? D90 : -D90);
  c.kit("food-kit/bowl-soup", 0, -2.6, 0, { force: true, opts: { y: 0.75 } });
}
/** A TV / YouTube studio for a presenter (Auto Video, 2026-11-18): dark
 * walls, a big glowing video wall behind, LED pillars, a lit round stage. */
function studio(c: Ctx) {
  const accent = c.pick(["#2563eb", "#7c3aed", "#0891b2", "#db2777", "#ea580c"]);
  const soft = c.pick(["#60a5fa", "#a78bfa", "#22d3ee", "#f472b6", "#fb923c"]);
  roomBase(c, { width: 16, depth: 10, height: 4.6, wall: "#141a2e", floor: "#161c2c", ceiling: "#0d1120", windows: 0, lamps: true });
  const back = 2 - 10 + 0.4;
  // the video wall: a frame, a glowing screen, light bars and big rings
  c.custom("studio_wall", { label: "screen", parts: [
    { shape: "box", size: [8.4, 3.7, 0.2], pos: [0, 2.15, 0], color: "#05070d" },
    { shape: "box", size: [8.0, 3.3, 0.05], pos: [0, 2.15, 0.12], color: accent, glow: true },
    { shape: "box", size: [8.0, 0.08, 0.06], pos: [0, 1.05, 0.16], color: "#ffffff", glow: true },
    { shape: "box", size: [3.6, 0.12, 0.06], pos: [-1.6, 2.9, 0.16], color: soft, glow: true },
    { shape: "box", size: [2.4, 0.12, 0.06], pos: [-2.2, 2.6, 0.16], color: soft, glow: true },
    { shape: "torus", radius: 0.9, tube: 0.05, pos: [2.4, 2.3, 0.18], color: "#ffffff", glow: true },
    { shape: "torus", radius: 0.6, tube: 0.04, pos: [2.4, 2.3, 0.18], color: soft, glow: true },
  ] }, 0, back + 0.4, 0);
  // LED pillars and side panels
  for (const x of [-6.2, -4.9, 4.9, 6.2]) {
    c.custom(`studio_pillar`, { label: "light", parts: [
      { shape: "box", size: [0.5, 4.2, 0.5], pos: [0, 2.1, 0], color: "#0b0f1c" },
      { shape: "box", size: [0.08, 3.8, 0.08], pos: [0, 2.1, 0.27], color: soft, glow: true },
    ] }, x, back + 0.9, 0);
  }
  for (const x of [-7.6, 7.6]) {
    c.custom("studio_panel", { label: "panel", parts: [
      { shape: "box", size: [0.15, 3.6, 4.5], pos: [0, 1.9, 0], color: "#1e2540" },
      { shape: "box", size: [0.05, 0.08, 4.2], pos: [x < 0 ? 0.09 : -0.09, 0.6, 0], color: accent, glow: true },
      { shape: "box", size: [0.05, 0.08, 4.2], pos: [x < 0 ? 0.09 : -0.09, 3.3, 0], color: accent, glow: true },
    ] }, x, -2.5, 0);
  }
  // the round stage the presenter stands on, with a light ring
  c.custom("studio_stage", { label: "stage", floor: true, parts: [
    { shape: "cylinder", radius: 1.5, height: 0.12, pos: [0, 0.06, 0], color: "#202842" },
    { shape: "torus", radius: 1.5, tube: 0.04, pos: [0, 0.12, 0], rot: [90, 0, 0], color: soft, glow: true },
  ] }, 0, 0.6, 0);
  // a few things that make it a real set
  c.kit("furniture-kit/pottedplant", -3.9, back + 1.6, 0, { force: true, scale: 1.3 });
  c.kit("furniture-kit/pottedplant", 3.9, back + 1.6, 0, { force: true, scale: 1.3 });
  c.kit("furniture-kit/loungedesignchair", -5.2, -1.4, Math.PI / 5, { force: true });
  c.kit("furniture-kit/tableround", -4.1, -1.2, 0, { force: true });
}
function bathroom(c: Ctx) {
  const R = roomBase(c, { width: 8, depth: 6, height: 3, wall: "#e0f2fe", floor: "#f1f5f9", windows: 1, lamps: true });
  furnish(c, ["furniture-kit/bathtub", "furniture-kit/toilet", "furniture-kit/bathroomsink", "furniture-kit/shower"], R.back + 0.5, R.left, R.right, 0);
  c.kit("furniture-kit/bathroommirror", R.left + 4, R.back + 0.1, 0, { force: true, opts: { y: 1.2 } });
}
function classroom(c: Ctx) {
  const R = roomBase(c, { width: 14, depth: 9, height: 3.4, wall: c.pick(["#fef9c3", "#e0f2fe", "#dcfce7"]), floor: "#c8a27a", windows: 3, lamps: true });
  c.model("blackboard", 0, R.back + 0.1, 0, [4, 2, 0.3], { force: true });
  c.kit("furniture-kit/desk", 3.5, R.back + 1.6, 0);
  for (let row = 0; row < 2; row++) for (let x = -5; x <= 5; x += 2.5) c.model("school_desk", x, R.back + 3.3 + row * 1.6, 0, [1.2, 1, 1]);
  c.kit("furniture-kit/bookcaseopen", R.left + 0.4, R.back + 0.5, 0);
  c.kit("furniture-kit/pottedplant", R.right - 0.3, R.back + 0.5, 0);
}
function office(c: Ctx) {
  const R = roomBase(c, { width: 13, depth: 8, height: 3.2, wall: "#f1f5f9", floor: "#94a3b8", windows: 3, lamps: true });
  for (let x = -5; x <= 5; x += 3.3) {
    c.kit("furniture-kit/desk", x, R.back + 1.6, 0);
    c.kit("furniture-kit/computerscreen", x, R.back + 1.5, 0, { force: true, opts: { y: 0.7 } });
    c.kit("furniture-kit/chairdesk", x, R.back + 2.4, Math.PI);
  }
  furnish(c, ["furniture-kit/bookcaseclosed", "furniture-kit/pottedplant", "furniture-kit/kitchencoffeemachine", "furniture-kit/bookcaseclosedwide"], R.back + 0.3, R.left, R.right, 0, 1.5);
}
function restaurant(c: Ctx) {
  const R = roomBase(c, { width: 14, depth: 8, height: 3.4, wall: c.pick(["#fde68a", "#fecaca", "#fed7aa"]), floor: "#7c4a2d", windows: 3, lamps: true });
  furnish(c, ["furniture-kit/kitchenbar", "furniture-kit/kitchenbar", "furniture-kit/kitchenbarend", "furniture-kit/kitchencoffeemachine"], R.back + 0.6, R.left, R.right, 0, 0);
  const food = c.ids(/food-kit\/(pizza|burger|cake|sandwich|soup|salad|fries|sushi|donut)/);
  for (const [x, z] of [[-2.6, -3.4], [2.6, -3.4], [0, -4.6], [-5, -2], [5, -2]] as const) {
    if (c.kit(c.pick(["furniture-kit/tableround", "furniture-kit/tablecloth"]), x, z, 0)) {
      c.kit("furniture-kit/chair", x - 0.9, z, D90); c.kit("furniture-kit/chair", x + 0.9, z, -D90);
      c.kit(c.pick(food), x, z, 0, { force: true, scale: 1.6, opts: { y: 0.78 } });
    }
  }
}
function shop(c: Ctx) {
  const R = roomBase(c, { width: 14, depth: 8, height: 3.4, wall: "#f8fafc", floor: "#e2e8f0", windows: 0, lamps: true });
  const food = c.ids(/food-kit\/(apple|banana|bread|carrot|cheese|watermelon|pumpkin|soda|can|bottle|carton|tomato|orange|grapes|corn|loaf)/);
  for (let x = R.left + 0.6; x < R.right - 0.6; x += 1.2) {
    c.kit("furniture-kit/bookcaseopen", x, R.back + 0.3, 0, { opts: { tint: "#fde68a" } });
    for (const y of [0.35, 0.85, 1.35]) c.kit(c.pick(food), x, R.back + 0.3, 0, { force: true, scale: 2.2, opts: { y } });
  }
  c.model("check_in_counter", R.right - 2, -3.2, -D90, [1, 2.5, 3.3]);
  for (const x of [-3.5, 0, 3.5]) {
    c.kit("furniture-kit/kitchenbar", x, -3.8, 0);
    c.kit(c.pick(food), x, -3.8, 0, { force: true, scale: 2.2, opts: { y: 1.0 } });
  }
}
function library(c: Ctx) {
  const R = roomBase(c, { width: 14, depth: 8, height: 3.6, wall: "#fef3c7", floor: "#92400e", windows: 2, lamps: true });
  for (let x = R.left + 0.7; x < R.right - 0.7; x += 1.5) c.kit(c.pick(["furniture-kit/bookcaseopen", "furniture-kit/bookcaseclosedwide"]), x, R.back + 0.3, 0);
  for (const x of [-3.5, 3.5]) { c.kit("furniture-kit/table", x, -3, 0); c.kit("furniture-kit/chair", x - 1, -3, D90); c.kit("furniture-kit/books", x, -3, 0, { force: true, opts: { y: 0.75 } }); }
}
function hospital(c: Ctx) {
  const R = roomBase(c, { width: 12, depth: 7.5, height: 3.2, wall: "#ecfeff", floor: "#e2e8f0", windows: 2, lamps: true });
  for (const x of [-3.5, 3.5]) { c.kit("furniture-kit/bedsingle", x, R.back + 1.2, 0, { opts: { tint: "#dbeafe" } }); c.kit("furniture-kit/sidetable", x + 1.4, R.back + 0.5, 0); }
  c.kit("mini-characters/wheelchair", R.right - 1, -2.5, -D90);
  c.kit("furniture-kit/pottedplant", R.left + 0.4, -1.4, 0);
}
function terminalInside(c: Ctx) {
  const R = roomBase(c, { width: 26, depth: 12, height: 6, wall: "#e2e8f0", floor: "#cbd5e1", windows: 6, outside: "sky", lamps: true });
  c.model("departures_board", -5, R.back + 0.4, 0, [3.4, 4, 0.3], { force: true });
  c.model("departures_board", 5, R.back + 0.4, 0, [3.4, 4, 0.3], { force: true });
  for (const x of [-9, -3, 3, 9]) c.model("check_in_counter", x, R.back + 2.5, 0, [3.3, 2.6, 1]);
  for (let x = -10; x <= 10; x += 1.1) if (Math.abs(x) > 3.6) c.kit("furniture-kit/chairmoderncushion", x, -3.6, Math.PI, { opts: { tint: "#93c5fd" } });
  c.scatter((x, z) => c.thing("person", x, z, c.r() * 6, { opts: { doing: c.pick(["walk", "talk", "wave"]) }, w: 0.6 }), 6, -12, 12, R.back + 4, -2.5);
  c.scatter((x, z) => c.kit("car-kit/box", x, z, c.r() * 6, { scale: 0.35 }), 6, -10, 10, R.back + 4, -2.5);
}
function vehicleInside(c: Ctx, kind: "train" | "bus" | "plane") {
  const R = roomBase(c, kind === "plane"
    ? { width: 16, depth: 4.2, height: 2.6, wall: "#f1f5f9", floor: "#64748b", windows: 8, moving: true, outside: "sky", lamps: true }
    : { width: 16, depth: 4.4, height: 2.8, wall: kind === "bus" ? "#fef3c7" : "#e7e5e4", floor: "#57534e", windows: 6, moving: true, outside: c.pick(["fields", "city", "trees"] as const), lamps: true });
  for (let x = R.left + 0.6; x < R.right - 0.5; x += 1.2) c.model("train_seat", x, R.back + 0.5, 0, [1, 1.2, 0.9], { opts: { tint: kind === "plane" ? "#1d4ed8" : "" } });
}

// ---------------------------------------------------------------- the list
export const BLUEPRINTS: Blueprint[] = [
  { id: "airport_inside", label: "Airport terminal (inside)", words: /\b(inside|in)\b.*\b(airport|terminal)\b|\b(terminal|departure lounge|check.?in|boarding gate|waiting lounge)\b/, inside: true, ground: "dirt", kind: "custom", build: terminalInside },
  { id: "airport", label: "Airport", words: /\b(airport|airfield|runway|tarmac|hangar|aeroplane|airplane|plane|flight|jet)\b/, ground: "dirt", kind: "plain", build: airport },
  { id: "plane_inside", label: "Inside a plane", words: /\b(inside|in|on|aboard)\b.*\b(plane|aeroplane|airplane|flight|jet)\b/, inside: true, ground: "dirt", kind: "plane", build: (c) => vehicleInside(c, "plane") },
  { id: "train_inside", label: "Inside a train", words: /\b(inside|in|on|aboard)\b.*\b(train|coach|compartment|carriage)\b/, inside: true, ground: "dirt", kind: "train", build: (c) => vehicleInside(c, "train") },
  { id: "bus_inside", label: "Inside a bus", words: /\b(inside|in|on|aboard)\b.*\bbus\b/, inside: true, ground: "dirt", kind: "bus", build: (c) => vehicleInside(c, "bus") },
  { id: "canyon_railroad", label: "Railroad by a deep canyon", words: /\b(canyon|gorge|ravine|cliff edge|chasm)\b/, ground: "rock", kind: "desert", build: canyonRailroad },
  { id: "railway_station", label: "Railway station", words: /\b(railway|railroad|rail road|train station|platform|station|tracks?|locomotive)\b/, ground: "dirt", kind: "plain", build: railwayStation },
{ id: "park", label: "Park", words: /\b(park|garden|playground|picnic)\b/, ground: "grass", kind: "park", build: park },
  { id: "city", label: "City street", words: /\b(city|downtown|street|market|bazaar|shops?|mall|traffic|road|crossing|town square|avenue|newspaper office)\b/, ground: "dirt", kind: "street", build: cityStreet },
  { id: "suburb", label: "Neighbourhood", words: /\b(neighbou?rhood|suburb|houses|colony|society|residential|lane|mohalla)\b/, ground: "grass", kind: "street", build: suburb },
  { id: "construction", label: "Construction site", words: /\b(construction|building site|site office|workers?|crane)\b/, ground: "dirt", kind: "street", build: construction },
  { id: "camp", label: "Forest camp", words: /\b(camp|campsite|camping|tent|bonfire|woods)\b/, ground: "grass", kind: "forest", build: forestCamp },
  { id: "beach", label: "Beach / harbour", words: /\b(beach|harbou?r|port|dock|pier|sea ?shore|island|pirates?|ship)\b/, ground: "sand", kind: "beach", build: beachHarbour },
  { id: "farm", label: "Farm", words: /\b(farm|barn|fields?|crops|cows?|tractor|village farm)\b/, ground: "farm", kind: "farm", build: farm },
  { id: "graveyard", label: "Graveyard", words: /\b(graveyard|cemetery|grave|tomb|haunted|ghosts?)\b/, ground: "grass", kind: "plain", build: graveyard },
  { id: "castle", label: "Castle", words: /\b(castle|fort|palace|kingdom|knights?|qila)\b/, ground: "grass", kind: "plain", build: castle },
  { id: "space", label: "Space base", words: /\b(space|moon|mars|planet|rocket|astronaut|alien)\b/, ground: "moon", kind: "space", build: spaceBase },
  { id: "desert", label: "Desert", words: /\b(desert|sahara|dunes|thar|cactus)\b/, ground: "sand", kind: "desert", build: desert },
  { id: "bedroom", label: "Bedroom", words: /\b(bedroom|bed room|my room|her room|his room|kids room|sleeping)\b/, inside: true, ground: "dirt", kind: "bedroom", build: bedroom },
  { id: "studio", label: "TV studio", words: /\b(studio|tv studio|news ?room|podcast|broadcast|talk show)\b/, inside: true, ground: "dirt", kind: "studio", build: studio },
  { id: "kitchen", label: "Kitchen", words: /\b(kitchen|cooking)\b/, inside: true, ground: "dirt", kind: "kitchen", build: kitchen },
  { id: "bathroom", label: "Bathroom", words: /\b(bathroom|washroom|toilet)\b/, inside: true, ground: "dirt", kind: "home", build: bathroom },
  { id: "classroom", label: "Classroom", words: /\b(classroom|class room|class|school|lecture)\b/, inside: true, ground: "dirt", kind: "classroom", build: classroom },
  { id: "office", label: "Office", words: /\b(office|boss|meeting room|company|newsroom|engineer'?s office)\b/, inside: true, ground: "dirt", kind: "office", build: office },
  { id: "restaurant", label: "Restaurant / café", words: /\b(restaurant|cafe|café|hotel|dhaba|canteen|diner|food court)\b/, inside: true, ground: "dirt", kind: "restaurant", build: restaurant },
  { id: "shop", label: "Shop / supermarket", words: /\b(inside|in)\b.*\b(shop|store)\b|\b(supermarket|grocery|general store|kiryana|bakery)\b/, inside: true, ground: "dirt", kind: "shop", build: shop },
  { id: "library", label: "Library", words: /\b(library|bookshop|book store)\b/, inside: true, ground: "dirt", kind: "library", build: library },
  { id: "hospital", label: "Hospital", words: /\b(hospital|clinic|doctor|ward)\b/, inside: true, ground: "dirt", kind: "hospital", build: hospital },
  { id: "living_room", label: "Living room", words: /\b(living room|lounge|drawing room|home|house|inside the house|tv room)\b/, inside: true, ground: "dirt", kind: "home", build: livingRoom },
];

/** The blueprint a scene's words ask for (first, most specific match), or null. */
export function blueprintFor(words: string, kind = ""): Blueprint | null {
  const w = ` ${words.toLowerCase()} `;
  // "inside a plane", "inside the gas station store": an INSIDE place first (not the airport / the railway station)
  if (/\b(inside|interior|aboard)\b/.test(w)) for (const b of BLUEPRINTS) if (b.inside && b.words.test(w)) return b;
  for (const b of BLUEPRINTS) if (b.words.test(w)) return b;
  const byKind: Record<string, string> = { street: "city", park: "park", farm: "farm", beach: "beach", desert: "desert", space: "space", classroom: "classroom", kitchen: "kitchen", bedroom: "bedroom", home: "living_room", office: "office", restaurant: "restaurant", shop: "shop", library: "library", hospital: "hospital", train: "train_inside", bus: "bus_inside", plane: "plane_inside" };
  const id = byKind[kind];
  return id ? BLUEPRINTS.find((b) => b.id === id) ?? null : null;
}

/** Picture colours can be dark: a toned-down pastel of them reads better as a tint. */
function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * 0.45);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** All the ready-made models a blueprint may use (to load them before building). */
export function kitsForBlueprint(bp: Blueprint, seed: number, span: number): string[] {
  const c = new Ctx(seed, span, "");
  try { bp.build(c); } catch { /* ignore */ }
  return c.objs.filter((o) => o.type === "kit").map((o) => String(o.opts?.kit));
}

/** Build the world of a blueprint. */
export function buildBlueprint(bp: Blueprint, opts: { seed: number; span: number; words: string; night?: boolean; weather?: string;
  palette?: string[]; density?: number; time?: TimeOfDay; extra?: string[]; signs?: string[] }): WorldDoc {
  const c = new Ctx(opts.seed, opts.span, opts.words.toLowerCase());
  const pal = (opts.palette ?? []).filter((x) => /^#[0-9a-f]{6}$/i.test(x));
  if (pal.length >= 2) c.tints = pal.map(lighten);
  if (opts.density) c.dens = Math.max(0.5, Math.min(1.8, opts.density));
  if (opts.night) c.time = "night";
  bp.build(c);
  // the story's own words on big glowing billboards (GTA 6 launch night…), outdoors
  if (!bp.inside && (opts.signs ?? []).length) {
    const neon = ["#ff4fd8", "#38bdf8", "#facc15", "#a78bfa"];
    const xs = [-9, 8.5, -1];
    (opts.signs ?? []).slice(0, 3).forEach((t, i) => {
      const txt = t.replace(/\s+/g, " ").trim().slice(0, 40);
      const col = neon[(i + opts.seed) % neon.length]!;
      c.custom(`billboard_${i}`, { label: "billboard", parts: [
        { shape: "box", size: [0.3, 4.4, 0.3], pos: [-2, 2.2, 0], color: "#1f2937" },
        { shape: "box", size: [0.3, 4.4, 0.3], pos: [2, 2.2, 0], color: "#1f2937" },
        { shape: "box", size: [6.2, 2.0, 0.2], pos: [0, 5.2, 0], color: "#05070d" },
        { shape: "text", text: txt, size: [5.8, 1.6], pos: [0, 5.2, 0.12], color: "#0b1020", textColor: col },
        { shape: "box", size: [6.3, 0.08, 0.08], pos: [0, 6.24, 0.14], color: col, glow: true },
        { shape: "box", size: [6.3, 0.08, 0.08], pos: [0, 4.16, 0.14], color: col, glow: true },
      ] } as unknown as ModelDef, xs[i]!, -13 - i * 1.5, 0);
    });
  }
  if (opts.night) c.time = "night";
  if (opts.time) c.time = opts.time;
  // things the picture / the words clearly have, from the model library
  for (const [i, w] of (opts.extra ?? []).slice(0, 8).entries()) {
    const k = findKit(w, undefined, opts.seed + i);
    if (!k) continue;
    const inside = !!c.room;
    c.scatter((x, z) => c.kit(k.id, x, z, c.r() * 6), k.h > 3 ? 2 : 4, inside ? -5 : -22, inside ? 5 : 22, inside ? -3.5 : -14, inside ? -1.6 : -2.5);
  }
  return {
    version: 1, name: bp.label, kind: bp.kind, ground: bp.ground, time: c.time, wind: 0.2,
    weather: (opts.weather as WorldDoc["weather"]) ?? "", grass: c.grass, season: "", fog: 0,
    models: c.models, room: c.room, objects: c.objs, stage: { x: 0, z: 0, rot: 0 },
  };
}
