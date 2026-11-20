/**
 * 3D World — worlds made automatically. For every outdoor scene of a video
 * the tool builds a fresh living world for the place (jungle, forest, park,
 * farm, village, beach, mountains, snow, desert, any place…) — different
 * for every video — and makes sure everything the script USES is there:
 * "{climb:mango tree}" → a mango tree near the characters, "{swim:river}"
 * → a river behind them, "{pick:phone}" → a phone (its picture)…
 *
 * Also the ready-made templates of the Environment Designer.
 */
import { findKit } from "./kits";
import { rng } from "../three3d/kit";
import { CATALOG, type ModelDef, type WorldDoc, type WorldObj, type GroundKind } from "./types";
import { starterFor } from "./starter";
import { norm } from "./world";

export type Need = { verb: string; word: string; on?: string };

/** Places the 3D world engine builds (others use the 3D sets in places.ts). */
export const WORLD_KINDS = new Set(["jungle", "forest", "park", "farm", "village", "beach", "mountain", "snow", "desert", "plain", "garden", "river", "lake", "camp", "field"]);

const TREE_FOR: Record<string, string[]> = {
  jungle: ["mango_tree", "big_tree", "palm_tree", "banana_plant"],
  forest: ["pine_tree", "big_tree", "pine_tree"],
  park: ["apple_tree", "orange_tree", "big_tree"],
  farm: ["apple_tree", "mango_tree", "big_tree"],
  village: ["mango_tree", "big_tree", "palm_tree"],
  beach: ["palm_tree"],
  mountain: ["pine_tree", "big_tree"],
  snow: ["pine_tree"],
  desert: ["palm_tree"],
  plain: ["big_tree", "apple_tree"],
};
const GROUND_FOR: Record<string, GroundKind> = {
  jungle: "jungle", forest: "grass", park: "grass", farm: "farm", village: "dirt", beach: "sand",
  mountain: "grass", snow: "snow", desert: "sand", plain: "grass", space: "moon",
};
const ANIMALS_FOR: Record<string, string[]> = {
  farm: ["cow", "goat", "chicken", "sheep"], village: ["goat", "chicken", "dog"], forest: ["deer", "rabbit"],
  jungle: ["monkey", "parrot", "deer"], park: ["dog", "duck"], mountain: ["goat"], snow: ["penguin"], desert: ["camel"],
};

/** Which catalog type a script word means. */
export function typeForWord(word: string, kind: string, verb = ""): string | null {
  const w = norm(word);
  if (!w) return null;
  if (w === "tree" || w === "branch" || w === "trees") return verb === "pick" || verb === "shake" ? (TREE_FOR[kind]?.[0] === "pine_tree" ? "apple_tree" : TREE_FOR[kind]?.[0] ?? "mango_tree") : (kind === "forest" || kind === "snow" ? "big_tree" : TREE_FOR[kind]?.[0] === "palm_tree" ? "palm_tree" : "big_tree");
  if (w === "fruit") return TREE_FOR[kind]?.find((t) => t !== "big_tree" && t !== "pine_tree") ?? "mango_tree";
  if (w === "water") return kind === "village" || kind === "farm" ? (verb === "drink" ? "well" : "river") : kind === "park" ? "pond" : kind === "beach" ? "river" : "river";
  if (w === "fish" || w === "sea" || w === "ocean") return "river";
  if (w === "door" || w === "inside" || w === "home" || w === "room") return kind === "park" || kind === "plain" ? "house" : "hut";
  if (w === "fire" || w === "campfire" || w === "bonfire") return "campfire";
  for (const c of CATALOG) if (c.words.some((x) => norm(x) === w)) return c.type;
  for (const c of CATALOG) if (c.words.some((x) => norm(x).split(" ").includes(w))) return c.type;
  return null;
}

type Slot = { x: number; z: number };

/** A brand-new world for one scene. */
export function autoWorld(opts: { kind: string; seed: number; needs: Need[]; span: number; night?: boolean; weather?: string; avoid?: string[]; location?: string }): WorldDoc {
  const r = rng(opts.seed * 7907 + 13);
  const kind = WORLD_KINDS.has(opts.kind) ? (opts.kind === "garden" ? "park" : opts.kind === "river" || opts.kind === "lake" || opts.kind === "field" ? "plain" : opts.kind === "camp" ? "mountain" : opts.kind) : "plain";
  const sx = opts.span / 9; // narrow (reel) videos: things closer together
  const objs: WorldObj[] = [];
  let idn = 0;
  const add = (type: string, x: number, z: number, extra: Partial<WorldObj> = {}) => {
    const o: WorldObj = { id: `${type}-${opts.seed}-${idn++}`, type, x, z, rot: 0, scale: 1, ...extra };
    objs.push(o);
    return o;
  };
  const taken: { x: number; z: number; r: number }[] = [];
  const free = (x: number, z: number, rad: number) => taken.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + rad);
  const place = (type: string, x: number, z: number, rad: number, extra: Partial<WorldObj> = {}) => {
    taken.push({ x, z, r: rad });
    return add(type, x, z, extra);
  };
  const needed = (o: WorldObj) => { o.opts = { ...(o.opts ?? {}), need: true }; return o; };
  const ground = GROUND_FOR[kind] ?? "grass";
  const time = opts.night ? "night" : r() < 0.15 ? "sunset" : "day";

  // ---- what the script needs (and what the scene's own words mention:
  // "a village by the river with mango trees")
  const needTypes: { type: string; verb: string; word: string }[] = [];
  const loc = ` ${(opts.location ?? "").toLowerCase()} `;
  const fromWords: Need[] = [];
  const SKIP = new Set(["inside", "home", "seat", "board", "sign", "wood", "track", "road", "fire", "door", "box", "chest", "water"]);
  for (const c of CATALOG) {
    for (const w of c.words) {
      if (w.length < 3 || SKIP.has(w)) continue;
      if (new RegExp(`[^a-z]${w}[^a-z]`).test(loc)) { fromWords.push({ verb: "", word: w }); break; }
    }
  }
  if (/\b(lake|pond)\b/.test(loc)) fromWords.push({ verb: "", word: "pond" });
  if (/\b(river|stream|riverside|river bank|nadi)\b/.test(loc)) fromWords.push({ verb: "", word: "river" });
  if (/\b(campfire|bonfire|camp)\b/.test(loc)) fromWords.push({ verb: "", word: "campfire" });
  for (const n of [...opts.needs, ...fromWords]) {
    const t = typeForWord(n.word, kind, n.verb) ?? (n.verb === "swim" || n.verb === "fish" || n.verb === "drink" ? "river"
      : n.verb === "climb" ? (TREE_FOR[kind]?.[0] ?? "big_tree") : n.verb === "sit" ? "log" : n.verb === "light" ? "campfire"
        : n.verb === "enter" || n.verb === "exit" || n.verb === "open" || n.verb === "close" ? "hut" : n.verb === "hide" ? "bush"
          : n.verb === "chop" || n.verb === "cut" || n.verb === "shake" ? "big_tree" : n.word ? "item" : null);
    if (t && !needTypes.some((x) => x.type === t && (t !== "item" || x.word === n.word))) needTypes.push({ type: t, verb: n.verb, word: n.word });
  }
  const has = (t: string) => needTypes.some((x) => x.type === t);
  // the big shapes of the place, from its own words
  const wantFall = has("waterfall") || /waterfall|\bfalls\b|cascade/.test(loc);
  const wantHills = wantFall || /\bhills?\b|valley|between the|slope/.test(loc);
  const open: { x: number; z0: number; z1: number }[] = [];
  if (wantFall) {
    needed(add("waterfall", 0, -14, { opts: { height: 5.5 + r() * 1.5 } }));
    taken.push({ x: 0, z: -14, r: 5 });
    needed(place("pond", 0, -10.2, 3.6, { opts: { radius: 3.4, fish: 6 } }));
    const side = r() < 0.5 ? -1 : 1;
    add("river", 0, -10, { points: [[0, -10.2], [side * 4, -8.6], [side * 10, -8.2], [side * 18, -9.5], [side * 34, -11]], opts: { width: 2.6, fish: 3 } });
    open.push({ x: 5, z0: -17, z1: -2 });
  }
  if (wantHills) {
    const gap = wantFall ? 7.5 : 10;
    for (const sd of [-1, 1]) add("hill", sd * (gap + r() * 2), wantFall ? -15 : -13, { opts: { radius: 8 + r() * 2, height: wantFall ? 5.5 : 3.5 + r() * 1.5 } });
    for (const sd of [-1, 1]) add("hill", sd * (gap + 9 + r() * 4), -20, { opts: { radius: 9, height: 4 + r() * 2 } });
  }
  const wantWater = !wantFall && (has("river") || has("bridge") || has("boat") || kind === "beach" || (["jungle", "forest", "village", "mountain", "plain"].includes(kind) && r() < 0.4));
  const bigNear = has("hut") || has("house") || has("tent") || has("well");
  const riverZ = kind === "beach" ? -12 : (bigNear ? -9.5 : -6.2) - r() * 1.2;
  const wav = kind === "beach" ? 0 : 0.8 + r() * 1.2, ph = r() * 6;
  const riverAt = (x: number) => riverZ + Math.sin(x / 9 + ph) * wav;
  if (wantWater) {
    const pts: [number, number][] = [];
    for (let x = -44; x <= 44; x += 4) pts.push([x, riverAt(x)]);
    add("river", 0, riverZ, { points: pts, opts: { width: kind === "beach" ? 14 : 3.2 + r() * 1.2, fish: kind === "beach" ? 8 : 6 } });
    taken.push({ x: 0, z: riverZ, r: 0 });
  }
  const bankZ = riverZ + (kind === "beach" ? 7 : 2.4);
  // slots right behind the characters for the things they use
  const back: Slot[] = [{ x: -3.3, z: -2.7 }, { x: 3.4, z: -2.9 }, { x: -1.4, z: -3.8 }, { x: 1.7, z: -4.0 }, { x: -5.6, z: -3.2 }, { x: 5.7, z: -3.4 }].map((s) => ({ x: s.x * Math.max(0.62, sx), z: s.z }));
  const near: Slot[] = [{ x: 2.0, z: -1.1 }, { x: -2.1, z: -1.2 }, { x: 0.6, z: -1.5 }, { x: -0.9, z: -1.6 }].map((s) => ({ x: s.x * Math.max(0.6, sx), z: s.z }));
  let bi = 0, ni = 0;
  const big = new Set(["mango_tree", "apple_tree", "orange_tree", "big_tree", "pine_tree", "palm_tree", "banana_plant", "bush", "berry_bush", "rock", "log", "stump", "ladder", "campfire", "well", "bench", "tent", "crate", "tall_grass", "fence", "signpost"]);
  for (const nt of needTypes) {
    const t = nt.type;
    if (t === "river" && wantFall) continue;
    if (t === "river" || t === "waterfall") continue;
    if (t === "pond") { needed(place("pond", 4.5 * sx, -6.5, 3.4)); continue; }
    if (t === "bridge") { add("bridge", 2.6 * sx, riverZ, { rot: Math.PI / 2, opts: { len: 6 } }); continue; }
    if (t === "boat") { add("boat", -2.2 * sx, riverZ + 0.2, { rot: 0 }); continue; }
    if (t === "hut" || t === "house") { const s = r() < 0.5 ? -1 : 1; needed(place(t, s * 4.6 * Math.max(0.7, sx), -4.8, 2.4)); continue; }
    if (big.has(t)) {
      let s = back[bi++ % back.length]!;
      if (wantWater && s.z < bankZ + 1 && t.endsWith("tree")) s = { x: s.x, z: Math.max(s.z, bankZ + 1.2) };
      const o = needed(place(t, s.x, s.z, 1.2));
      if (t === "campfire") { o.z = -1.6; o.x = s.x * 0.6; o.opts = { lit: nt.verb !== "light", need: true }; }
      if (t === "log" || t === "stump" || t === "bench" || t === "rock") { o.z = -1.7; }
      continue;
    }
    const s = near[ni++ % near.length]!;
    const o = place(t, s.x, s.z, 0.6);
    if (t === "item") o.opts = { word: nt.word || "gift", edible: nt.verb === "eat" };
    if (t === "flowers") o.opts = { count: 10, radius: 0.8 };
    needed(o);
  }

  // ---- the place itself (all around, never in front of the characters)
  const trees = TREE_FOR[kind] ?? TREE_FOR.plain!;
  const scatter = (type: string, n: number, zMin: number, zMax: number, xr: number, rad: number, extra: (o: WorldObj) => void = () => {}) => {
    for (let i = 0, tries = 0; i < n && tries < n * 12; tries++) {
      const x = (r() - 0.5) * 2 * xr, z = zMin + r() * (zMax - zMin);
      const small = type === "flowers" || type === "stones" || type === "mushroom";
      if (Math.abs(x) < opts.span * 0.62 && z > -2.2) continue; // the stage
      if (!small && Math.abs(x) < Math.max(4.5, opts.span * 0.55) && z > -4.6) continue; // keep the view behind them open
      if (!small && open.some((o) => Math.abs(x) < o.x && z > o.z0 && z < o.z1)) continue; // the waterfall stays in view
      if (wantWater && Math.abs(z - riverAt(x)) < (kind === "beach" ? 8 : 2.4 + rad)) continue;
      if (!free(x, z, rad)) continue;
      const o = place(type, x, z, rad, { rot: r() * 6, scale: 0.85 + r() * 0.4 });
      extra(o);
      i++;
    }
  };
  const nTrees = { jungle: 22, forest: 26, park: 9, farm: 6, village: 7, beach: 7, mountain: 12, snow: 14, desert: 2, plain: 6 }[kind] ?? 8;
  for (let i = 0; i < nTrees; i++) scatter(trees[i % trees.length]!, 1, -24, -3, 22, 1.6, (o) => { if (o.type === "pine_tree" && kind === "snow") o.opts = { snow: true }; o.rot = 0; });
  if (["jungle", "forest", "park", "plain", "mountain", "village"].includes(kind)) scatter("bush", kind === "jungle" ? 8 : 4, -12, -2.5, 16, 1);
  if (kind === "jungle") { scatter("tall_grass", 4, -12, -4, 16, 1.6); scatter("berry_bush", 1, -6, -2.5, 9, 1); }
  if (["forest", "mountain", "jungle"].includes(kind)) { scatter("log", 2, -9, -2.5, 12, 1); scatter("stump", 2, -9, -2.5, 12, 0.6); scatter("mushroom", 2, -6, -1, 8, 0.4); }
  if (["park", "plain", "farm", "village", "jungle", "mountain"].includes(kind)) scatter("flowers", kind === "park" ? 5 : 3, -8, 1, 14, 1.4);
  scatter("rock", kind === "mountain" || kind === "desert" ? 5 : 2, -12, -2.5, 15, 1);
  scatter("stones", 1, -3, 1, 6, 0.5);
  if (kind === "farm") { add("fence", -6 * sx - 2, -5.5, { opts: { len: 8 } }); add("fence", 7, -5.5, { opts: { len: 6 } }); scatter("tall_grass", 4, -16, -7, 16, 2); if (!has("hut") && !has("house")) place("house", 7.5, -9, 3); scatter("well", 1, -9, -4, 10, 1.2); }
  if (kind === "village") { scatter("hut", 3, -14, -5, 15, 2.6); scatter("well", 1, -8, -4, 10, 1.2); scatter("bench", 1, -6, -3, 9, 1); if (!has("campfire") && r() < 0.4) scatter("campfire", 1, -6, -3, 8, 1); }
  if (kind === "park") { scatter("bench", 2, -6, -3, 10, 1.2); add("path", 0, -2.6, { points: [[-40, -2.6], [40, -2.6]], opts: { width: 1.5 } }); if (r() < 0.4 && !has("pond")) place("pond", (r() < 0.5 ? -1 : 1) * 7, -9, 3.5); }
  if (kind === "mountain" && !wantHills) { for (let i = 0; i < 4; i++) add("hill", (i - 1.5) * 13 + (r() - 0.5) * 5, -18 - r() * 6, { opts: { radius: 7 + r() * 4, height: 2.5 + r() * 2.5 } }); if (r() < 0.6) scatter("tent", 1, -8, -4, 10, 1.6); }
  if (kind === "desert") for (let i = 0; i < 5; i++) add("hill", (i - 2) * 12 + (r() - 0.5) * 6, -12 - r() * 10, { opts: { radius: 6 + r() * 4, height: 1.2 + r() * 1.4 } });
  if (kind === "beach" && !has("boat") && r() < 0.6) add("boat", 6 * sx, riverZ + 5.5, {});
  if (kind === "jungle" && r() < 0.5) scatter("signpost", 1, -4, -2.5, 8, 0.5, (o) => { o.opts = { text: ["JUNGLE", "DANGER!", "THIS WAY", "SAFARI"][Math.floor(r() * 4)]! }; o.rot = 0.2; });
  // life
  if (!opts.night && kind !== "snow") add("birds", 0, -10, { opts: { count: 3 + Math.floor(r() * 4) } });
  if (!opts.night && ["park", "jungle", "plain", "farm", "village"].includes(kind)) add("butterflies", (r() - 0.5) * 6, -3, { opts: { count: 3 } });
  const avoid = new Set((opts.avoid ?? []).map((a) => a.toLowerCase()));
  const animals = (ANIMALS_FOR[kind] ?? []).filter((a) => !avoid.has(a));
  for (let i = 0; i < Math.min(animals.length, 2); i++) {
    const a = animals[Math.floor(r() * animals.length)]!;
    scatter("animal", 1, -11, -5.5, 12, 2.5, (o) => { o.opts = { species: a, radius: 2 + r() * 1.5 }; o.rot = 0; o.scale = 1; });
  }
  return {
    version: 1, name: `${kind} ${opts.seed}`, kind, ground, time, wind: 0.35 + r() * 0.5,
    weather: (opts.weather as WorldDoc["weather"]) ?? "", grass: ground === "sand" || ground === "snow" || ground === "dirt" || ground === "moon" ? 0 : 1,
    objects: objs, stage: { x: 0, z: 0, rot: 0 },
  };
}

/** Only the things a script uses — for rooms and other 3D sets (a ladder in the classroom…). */
export function extraObjects(needs: Need[], kind: string, span: number, seed: number): WorldDoc | null {
  const objs: WorldObj[] = [];
  const slots = [{ x: 2.4, z: -2.2 }, { x: -2.4, z: -2.3 }, { x: 1.2, z: -1.4 }, { x: -1.2, z: -1.4 }];
  let i = 0;
  const done = new Set<string>();
  for (const n of needs) {
    let t = typeForWord(n.word, kind, n.verb);
    if (!t && n.word) t = "item";
    if (!t || done.has(t + n.word) || ["river", "pond", "hut", "house", "bridge", "boat", "hill", "path"].includes(t)) continue;
    done.add(t + n.word);
    const s = slots[i++ % slots.length]!;
    objs.push({ id: `x-${seed}-${i}`, type: t, x: s.x * (span / 9), z: s.z, rot: 0, opts: t === "item" ? { word: n.word, edible: n.verb === "eat" } : t === "campfire" ? { lit: n.verb !== "light" } : undefined });
  }
  if (!objs.length) return null;
  return { version: 1, name: "extras", ground: "grass", time: "day", wind: 0.1, objects: objs, stage: { x: 0, z: 0, rot: 0 }, grass: 0 };
}

/** Ready-made worlds for the Environment Designer. */
export const TEMPLATES: { id: string; label: string; make: (seed: number) => WorldDoc }[] = [
  { id: "jungle", label: "Jungle with river", make: (s) => autoWorld({ kind: "jungle", seed: s, span: 9, needs: [{ verb: "swim", word: "river" }, { verb: "climb", word: "mango tree" }, { verb: "hide", word: "bush" }] }) },
  { id: "forest", label: "Pine forest camp", make: (s) => autoWorld({ kind: "forest", seed: s, span: 9, needs: [{ verb: "sit", word: "log" }, { verb: "light", word: "campfire" }, { verb: "chop", word: "tree" }] }) },
  { id: "village", label: "Village", make: (s) => autoWorld({ kind: "village", seed: s, span: 9, needs: [{ verb: "enter", word: "hut" }, { verb: "drink", word: "well" }, { verb: "pick", word: "mango" }] }) },
  { id: "farm", label: "Farm", make: (s) => autoWorld({ kind: "farm", seed: s, span: 9, needs: [{ verb: "pick", word: "apple" }, { verb: "climb", word: "ladder" }] }) },
  { id: "park", label: "Park", make: (s) => autoWorld({ kind: "park", seed: s, span: 9, needs: [{ verb: "kick", word: "ball" }, { verb: "sit", word: "bench" }] }) },
  { id: "beach", label: "Beach", make: (s) => autoWorld({ kind: "beach", seed: s, span: 9, needs: [{ verb: "swim", word: "sea" }, { verb: "climb", word: "palm" }] }) },
  { id: "river", label: "River with bridge & fish", make: (s) => autoWorld({ kind: "plain", seed: s, span: 9, needs: [{ verb: "fish", word: "river" }, { verb: "cross", word: "bridge" }, { verb: "sit", word: "boat" }] }) },
  { id: "snow", label: "Snowy hills", make: (s) => autoWorld({ kind: "snow", seed: s, span: 9, needs: [{ verb: "light", word: "campfire" }, { verb: "enter", word: "tent" }] }) },
  { id: "empty", label: "Empty grass field", make: () => ({ version: 1, name: "My world", kind: "plain", ground: "grass", time: "day", wind: 0.5, grass: 1, objects: [], stage: { x: 0, z: 0, rot: 0 } }) },
];

const FRUITS = ["mango", "apple", "orange", "banana", "coconut", "berry", "fruit"];
const HANDY = new Set(["pick", "eat", "give", "throw", "drop", "carry", "kick", ""]);

/** Things the script uses that this world does not have (a mango on the
 * railway platform, a clock to point at…): made and put near the characters. */
/** Your own designed thing a word means (exact name, its label, or all its words). */
export function myThingFor(word: string, lib: Record<string, ModelDef>): [string, ModelDef] | null {
  const w = norm(word);
  const key = w.replace(/\s+/g, "_");
  if (lib[key]) return [key, lib[key]!];
  for (const [k, d] of Object.entries(lib)) {
    const names = [k.replace(/_/g, " "), String(d.label ?? "").toLowerCase()];
    if (names.some((n) => n === w)) return [k, d];
  }
  const toks = w.split(" ").filter((t) => t.length > 2);
  for (const [k, d] of Object.entries(lib)) {
    const kt = k.replace(/_/g, " ").split(" ");
    if (toks.length && kt.length && kt.every((t) => toks.includes(t))) return [k, d];
  }
  return null;
}

export function missingThings(needs: Need[], has: (w: string) => boolean, span: number, seed: number, lib: Record<string, ModelDef> = {}): { objects: WorldObj[]; models: Record<string, ModelDef> } {
  const objects: WorldObj[] = [], models: Record<string, ModelDef> = {};
  const near = [[2.6, -1.6], [-2.6, -1.7], [1.3, -2.4], [-1.4, -2.5], [4.0, -2.0], [-4.1, -2.1]];
  const far = [[5.2, -3.6], [-5.3, -3.7], [3.0, -4.6], [-3.2, -4.8]];
  let ni = 0, fi = 0;
  const seen = new Set<string>();
  for (const nd of needs) {
    const w = norm(nd.word);
    if (!w || seen.has(w) || has(w)) continue;
    seen.add(w);
    const sx = Math.max(0.6, span / 9);
    const small = HANDY.has(nd.verb) || nd.verb === "look" && FRUITS.some((f) => w.includes(f));
    let o: WorldObj;
    if (FRUITS.some((f) => w.includes(f)) && nd.verb !== "climb" && nd.verb !== "shake" && nd.verb !== "chop") {
      const kind = FRUITS.find((f) => w.includes(f)) ?? "mango";
      const [x, z] = near[ni++ % near.length]!;
      o = { id: `miss-${seed}-${objects.length}`, type: "fruit", x: x! * sx, z: z!, opts: { kind: kind === "fruit" ? "mango" : kind, count: 3 } };
    } else {
      const mine = myThingFor(w, lib);
      const model = mine?.[1] ?? starterFor(w);
      const t = typeForWord(w, "plain", nd.verb);
      const [x, z] = (small ? near[ni++ % near.length] : far[fi++ % far.length])!;
      if (mine) { models[mine[0]] = mine[1]; o = { id: `miss-${seed}-${objects.length}`, type: "model", x: x! * sx, z: z!, opts: { model: mine[0] }, traits: Object.fromEntries((mine[1].abilities ?? []).map((a) => [a, true])) }; }
      else if (model && !small) { models[w.replace(/\s+/g, "_")] = model; o = { id: `miss-${seed}-${objects.length}`, type: "model", x: x! * sx, z: z!, opts: { model: w.replace(/\s+/g, "_") }, traits: Object.fromEntries((model.abilities ?? []).map((a) => [a, true])) }; }
      else if (t && !["river", "pond", "waterfall", "hill", "path", "bridge"].includes(t) && !(small && /tree|palm|plant|hut|house|tent|well/.test(t))) o = { id: `miss-${seed}-${objects.length}`, type: t, x: x! * sx, z: z!, rot: 0 };
      else if (findKit(w)) o = { id: `miss-${seed}-${objects.length}`, type: "kit", x: x! * sx, z: z!, rot: 0, opts: { kit: findKit(w)!.id } }; // a real 3D model from the library
      else o = { id: `miss-${seed}-${objects.length}`, type: "item", x: x! * sx, z: z!, opts: { word: w, size: small ? 0.42 : 1.2, edible: nd.verb === "eat" }, traits: small ? undefined : { pickable: false } };
    }
    objects.push(o);
  }
  return { objects, models };
}
