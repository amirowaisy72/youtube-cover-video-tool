/**
 * 3D World — "describe it and get it". You write the place in your own
 * words (any language, a long paragraph is fine); ChatGPT (with the copied
 * prompt) or the free AI turns it into a WORLD RECIPE (JSON, below); this
 * file turns the recipe into a real world: rivers that run where you said,
 * hills, the season, every tree / hut / boat / animal / person in its
 * place and doing what you said (ducks swimming along one bank, boatmen
 * rowing their boats, lions and monkeys playing by the river…).
 *
 * Every build is a NEW world (new seed): same description, fresh layout.
 */
import { rng } from "../three3d/kit";
import { SPECIES } from "../creatures";
import { CATALOG, CATALOG_BY_TYPE, type GroundKind, type ModelDef, type RoomDef, type WorldDoc, type WorldObj } from "./types";
import { typeForWord } from "./auto";
import { STARTER, starterFor } from "./starter";

export type Recipe = {
  name?: string;
  place?: string; // closest simple place: jungle, forest, mountain, village…
  ground?: GroundKind;
  time?: "day" | "sunset" | "night";
  weather?: "clear" | "rain" | "snow" | "fog";
  season?: "spring" | "summer" | "autumn" | "winter";
  wind?: number;
  grass?: number;
  terrain?: { hills?: "none" | "few" | "many"; mountains?: boolean };
  water?: { type: "river" | "pond" | "waterfall"; from?: string; to?: string; where?: string; size?: string; width?: number; fish?: boolean | number; name?: string }[];
  things?: { what: string; count?: number; where?: string; size?: number; name?: string; moving?: boolean; rower?: boolean; color?: string; lit?: boolean; abilities?: string[];
    x?: number; z?: number; turn?: number; row?: boolean; spacing?: number; moves?: "arrive" | "loop" | "around" }[];
  models?: Record<string, ModelDef>; // new things designed from shapes
  room?: RoomDef; // an INSIDE place
  animals?: { species: string; count?: number; where?: string; doing?: string; name?: string }[];
  people?: { who: string; count?: number; where?: string; doing?: string; female?: boolean }[];
};

export const WHERE = ["stage", "behind", "back", "far", "left", "right", "front-left", "front-right", "everywhere", "on-hills",
  "river", "river-banks", "near-bank", "far-bank", "around-pond", "near-waterfall"] as const;
export const ANIMAL_DOING = ["walk", "play", "run", "swim", "fly", "graze", "sleep", "sit"];
export const PEOPLE_DOING = ["walk", "row", "fish", "work", "talk", "wave", "dance", "sit", "wash"];
const DIRS: Record<string, [number, number]> = {
  "back-left": [-34, -30], back: [0, -40], "back-right": [34, -30], left: [-40, -7], right: [40, -7],
  "front-left": [-34, 9], "front-right": [34, 9], front: [0, 12],
};

/** The prompt to copy into ChatGPT (with the user's own description inside). */
export function recipePrompt(description: string, library: string[] = []): string {
  library = [...new Set([...Object.keys(STARTER), ...library])];
  const types = CATALOG.filter((c) => !["animal", "person", "item", "river", "pond", "waterfall", "path", "hill"].includes(c.type)).map((c) => c.type);
  const species = Object.keys(SPECIES).filter((s) => !["kitty", "bandar", "hen", "lamb", "pony", "cobra"].includes(s));
  return `You design 3D cartoon worlds for an animation tool. Read my description and turn it into a WORLD RECIPE in JSON — exactly the format below, nothing else.

MY DESCRIPTION (it may be in Urdu / Roman Urdu / English):
"""
${description.trim() || "(write your description here)"}
"""

FORMAT (reply with ONLY this JSON inside one code block):
{
  "name": "short name for this world",
  "place": one of "jungle","forest","mountain","village","farm","park","beach","desert","snow","plain",
  "ground": one of "grass","jungle","farm","sand","dirt","snow","rock","moon",
  "time": "day" | "sunset" | "night",
  "season": "spring" | "summer" | "autumn" | "winter",
  "weather": "clear" | "rain" | "snow" | "fog",
  "wind": 0.0-1.0,
  "terrain": { "hills": "none" | "few" | "many", "mountains": true|false },
  "water": [ { "type": "river", "from": DIR, "to": DIR, "width": 2-6, "fish": true },
             { "type": "pond", "where": WHERE, "size": "small"|"big", "fish": true },
             { "type": "waterfall", "where": "back" } ],
  "things": [ { "what": TYPE, "count": 1-30, "where": WHERE, "size": 0.5-2 } ],
  "animals": [ { "species": SPECIES, "count": 1-12, "where": WHERE, "doing": ANIMAL_DOING } ],
  "people": [ { "who": "boatman" | "farmer" | "fisherman" | "villager" | "old man" | "girl" | any short role, "count": 1-6, "where": WHERE, "doing": PEOPLE_DOING, "female": false } ]
}

INSIDE PLACES (a room, a kitchen, a classroom, a shop, a hospital ward, INSIDE a train / bus / plane…): add
  "room": { "width": 6-20, "depth": 4-10, "height": 2.6-4, "wall": "#hex", "floor": "#hex", "ceiling": "#hex", "windows": 0-8,
            "moving": true only for a vehicle on the move (the world outside the windows passes by), "outside": "fields" | "city" | "sky" | "trees" | "sea" }
  and leave "water" and "terrain" empty. The front (camera side) has no wall. Put the furniture in "things" (ready-made: chair, table, sofa, bed, cupboard, tv, train_seat, school_desk, blackboard, lamp_post, stall — or design your own); "x" from -width/2 to width/2, "z" from 2 - depth (the back wall) to about -1 (the characters stand at z = 0).
  Example — inside a moving train: "room": {"width":14,"depth":4,"height":2.8,"wall":"#e5e7eb","floor":"#6b7280","windows":6,"moving":true,"outside":"fields"}, things: train_seat in a row along the back wall (z = -1.6, x = -6, -3.5, -1, 1.5, 4, 6.5) facing the camera.

DIR (where a river comes from / goes to, seen from the camera; the characters stand in the middle, the camera looks at them from the front): ${Object.keys(DIRS).join(", ")}.
WHERE: ${WHERE.join(", ")}  ("stage" = right next to the characters, "behind" = just behind them, "back"/"far" = far behind, "near-bank" = the river bank near the camera, "far-bank" = the other bank, "river" = ON the water).
TYPE (things that exist and WORK — trees can be climbed/shaken/chopped, huts have doors, campfires burn, boats float…): ${types.join(", ")}.
  - For a moving boat with someone rowing: { "what": "boat", "where": "river", "moving": true, "rower": true }.
  - For a campfire that is not burning yet: add "lit": false.
  - Anything else (a temple, a tower, a car, a statue…): { "what": "picture:<word>", "size": metres tall } — it is shown with its picture.
SPECIES: ${species.join(", ")}.
ANIMAL_DOING: walk, play (runs and jumps around), run, swim (on the water — needs "where": "river"/"near-bank"/"far-bank"/"around-pond"), fly, graze, sleep, sit.
PEOPLE_DOING: walk, row (in a boat on the river), fish (at the water), work (chopping), talk, wave, dance, sit, wash (clothes at the water).

NEW 3D THINGS (very important): every "model:<name>" you use must EITHER be one of the ready-made ones listed here OR be designed by you in "models" in this same answer (otherwise it will be missing). If the place needs something that is NOT in TYPE (a train, railway track, platform, clock, water tank, shop, temple, car, bus, tower, stall, tractor, swing…), DESIGN it from simple shapes in "models" and use it as { "what": "model:<name>" }.${library.length ? ` Already designed (you can use these as model:<name> without designing again): ${library.join(", ")}.` : ""}
"models": {
  "<name>": {
    "label": "what it is",
    "abilities": [ any of: "solid", "sittable", "enterable", "climbable", "pickable", "hide_behind", "openable" ],
    "floor": true if characters can stand/walk on top of it (a platform, a stage, a deck),
    "seat_height": metres (if sittable),
    "parts": [ { "shape": "box", "size": [w,h,d], "pos": [x,y,z], "rot": [0,0,0], "color": "#hex" },
               { "shape": "cylinder", "radius": r, "radiusTop": r2, "height": h, "pos": [...], "rot": [90,0,0], "color": "#hex", "wheel": true },
               { "shape": "sphere", "radius": r, ... }, { "shape": "cone", "radius": r, "height": h, ... }, { "shape": "torus", "radius": r, "tube": t, ... },
               { "shape": "text", "text": "STATION", "size": [w,h], "color": "#background", "textColor": "#letters", "pos": [...] },
               { "shape": "box", ..., "glass": true }  (windows),  { ..., "glow": true } (lamps),  { "shape": "box", "size": [0.9,2,0.06], ..., "door": true },
               { "shape": "cylinder", ..., "smoke": true } (chimney: smoke comes out), { ..., "spin": 0.5 } (fan/windmill turning) ]
  }
}
Placing things exactly (optional): "x" (metres, + = right) and "z" (metres, negative = behind the characters; the characters stand around x = -4..4, z = 0; the camera is at z = +10), "turn" (degrees).
Long rows (railway track, road, fence, lamp posts, shops in a line): { "what": "model:rail_track", "row": true, "z": -6 } repeats it from far left to far right.
Moving: { "what": "model:train", "z": -6, "moves": "arrive" } (comes in from the right, stops in front of the characters, then leaves to the left — same z as its track), "loop" (keeps passing by, like cars on a road), "around" (drives in a circle).
A platform / stage / deck the characters stand on: a low wide box model with "floor": true placed at z = 0 (under the characters).

MODEL RULES (follow exactly, or the thing looks wrong):
1. Every "pos" is measured from the thing's OWN centre on the ground: x = 0, z = 0 is the middle of the thing, y = 0 is the ground under it. NEVER use world positions inside a model (no z = -7). Where the thing stands in the world is set ONLY in "things" (x / z / where).
2. Real sizes in metres (a person is 1.7 m, a door 0.9 x 2.1 m, a train coach 3 m tall and 12 m long). In "things" leave "size" out (or 1) for models.
3. pos is the CENTRE of each part: a box 2 m tall standing on the ground has y = 1.
4. A cylinder stands upright; for a wheel use "rot": [90, 0, 0] so it faces sideways, and put wheels on BOTH sides (z = +width/2 and -width/2).
5. The front faces +z (the camera). Vehicles are long along x with their FRONT (engine, headlight) at +x.
6. Make it detailed: vehicles and buildings 20-60 parts (body, roof, windows on the +z side, doors, wheels, lights, chimney, railings, signs). A thing with 5 parts looks like a plain box.
7. A row piece (track, road, fence, wall) is ONE short piece that continues along x: the rails / road / rails of a fence run along x.
8. Something that moves on a track or road: give it the SAME "z" as that row.

EXAMPLE of a good model and its use — only to show the STYLE (rail_track and train are already ready-made, you can just use them):
"models": {
 "rail_track": { "label": "railway track", "parts": [
  {"shape":"box","size":[2,0.04,3.2],"pos":[0,0.02,0],"color":"#9ca3af"},
  {"shape":"box","size":[0.25,0.1,2.6],"pos":[-0.5,0.07,0],"color":"#6b4f3a"},
  {"shape":"box","size":[0.25,0.1,2.6],"pos":[0.5,0.07,0],"color":"#6b4f3a"},
  {"shape":"box","size":[2,0.12,0.1],"pos":[0,0.18,-0.72],"color":"#6b7280"},
  {"shape":"box","size":[2,0.12,0.1],"pos":[0,0.18,0.72],"color":"#6b7280"} ] },
 "train": { "label": "steam train with a coach", "parts": [
  {"shape":"box","size":[6,1.6,2.6],"pos":[0.5,1.5,0],"color":"#166534"},
  {"shape":"cylinder","radius":1.0,"height":4,"pos":[1.5,2.2,0],"rot":[0,0,90],"color":"#15803d"},
  {"shape":"box","size":[2.2,2.6,2.8],"pos":[-1.9,2.3,0],"color":"#14532d"},
  {"shape":"box","size":[2.6,0.25,3.1],"pos":[-1.9,3.7,0],"color":"#7f1d1d"},
  {"shape":"box","size":[0.9,0.8,0.05],"pos":[-1.9,2.8,1.42],"color":"#bae6fd","glass":true},
  {"shape":"cylinder","radius":0.3,"radiusTop":0.45,"height":1.2,"pos":[2.9,3.4,0],"color":"#1f2937","smoke":true},
  {"shape":"sphere","radius":0.25,"pos":[3.6,2.3,0],"color":"#fde68a","glow":true},
  {"shape":"box","size":[0.3,0.6,2.8],"pos":[3.6,0.8,0],"color":"#b91c1c"},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[2.2,0.6,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[0.6,0.6,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[-1.0,0.6,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[2.2,0.6,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[0.6,0.6,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.55,"height":0.2,"pos":[-1.0,0.6,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"box","size":[11,2.6,2.8],"pos":[-9.3,2.0,0],"color":"#b91c1c"},
  {"shape":"box","size":[11.4,0.25,3.1],"pos":[-9.3,3.4,0],"color":"#7f1d1d"},
  {"shape":"box","size":[1,0.8,0.05],"pos":[-5.6,2.4,1.42],"color":"#bae6fd","glass":true},
  {"shape":"box","size":[1,0.8,0.05],"pos":[-7.6,2.4,1.42],"color":"#bae6fd","glass":true},
  {"shape":"box","size":[1,0.8,0.05],"pos":[-9.6,2.4,1.42],"color":"#bae6fd","glass":true},
  {"shape":"box","size":[1,0.8,0.05],"pos":[-11.6,2.4,1.42],"color":"#bae6fd","glass":true},
  {"shape":"box","size":[0.9,1.9,0.05],"pos":[-13.8,1.7,1.42],"color":"#7f1d1d"},
  {"shape":"text","text":"PAKISTAN RAILWAYS","size":[5,0.45],"color":"#b91c1c","textColor":"#fde047","pos":[-9.3,1.3,1.42]},
  {"shape":"cylinder","radius":0.45,"height":0.2,"pos":[-5.5,0.5,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.45,"height":0.2,"pos":[-13,0.5,1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.45,"height":0.2,"pos":[-5.5,0.5,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true},
  {"shape":"cylinder","radius":0.45,"height":0.2,"pos":[-13,0.5,-1.35],"rot":[90,0,0],"color":"#111827","wheel":true} ] }
}
"things": [ {"what":"model:rail_track","row":true,"z":-6}, {"what":"model:train","z":-6,"moves":"arrive"} ]

RULES:
- Put EVERYTHING the description mentions into the recipe, with the right counts, places and actions. Add natural details that fit (trees, rocks, flowers, birds…) so the place looks full and alive, 40-120 things in total.
- Never put big things on "stage" (the characters need room); small things (stones, flowers, a basket, a ball) are fine there.
- Winter: season "winter" (snow only if the description says snow); use pine_tree and bare_tree.
- Plural rivers ("nadiyan") = 2 or 3 rivers from different DIRs.`;
}

/** First JSON object in a reply (it may have ``` fences or words around it). */
export function parseRecipe(text: string): Recipe | null {
  const raw = text.replace(/```(?:json)?/g, "");
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(raw.slice(a, b + 1)) as Recipe; } catch { /* try a softer clean-up */ }
  try { return JSON.parse(raw.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1").replace(/[“”]/g, '"')) as Recipe; } catch { return null; }
}

/** How big a designed thing is, and which way its long thin parts (rails,
 * planks) run — so a row of track pieces always joins up into one line. */
export function modelShape(def: ModelDef) {
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
  let alongX = 0, alongZ = 0, longX = 0, longZ = 0;
  for (const p of def.parts ?? []) {
    const pos = Array.isArray(p.pos) ? p.pos : [0, 0.5, 0];
    let [w, h, d] = p.shape === "box" ? (Array.isArray(p.size) ? p.size : [1, 1, 1])
      : p.shape === "text" || p.shape === "plane" ? [...(Array.isArray(p.size) ? p.size.slice(0, 2) : [1, 1]), 0.05]
        : p.shape === "torus" ? [(p.radius ?? 0.5) * 2, (p.radius ?? 0.5) * 2, (p.tube ?? 0.1) * 2]
          : [(p.radius ?? 0.4) * 2, p.shape === "sphere" ? (p.radius ?? 0.4) * 2 : p.height ?? 1, (p.radius ?? 0.4) * 2];
    const rot = Array.isArray(p.rot) ? p.rot : [0, 0, 0];
    const q = (a: unknown) => Math.abs(((Math.round(Number(a ?? 0) / 90) % 2) + 2) % 2) === 1;
    if (q(rot[0])) [h, d] = [d, h];
    if (q(rot[2])) [w, h] = [h, w];
    if (q(rot[1])) [w, d] = [d, w];
    w = Math.abs(Number(w) || 0); h = Math.abs(Number(h) || 0); d = Math.abs(Number(d) || 0);
    const x = Number(pos[0]) || 0, y = Number(pos[1]) || 0, z = Number(pos[2]) || 0;
    minX = Math.min(minX, x - w / 2); maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y - h / 2); maxY = Math.max(maxY, y + h / 2);
    minZ = Math.min(minZ, z - d / 2); maxZ = Math.max(maxZ, z + d / 2);
    // long and thin = a rail / plank / pole lying down
    if (w > 4 * Math.max(h, d) && h < 0.6) { alongX += w; longX = Math.max(longX, w); }
    if (d > 4 * Math.max(h, w) && h < 0.6) { alongZ += d; longZ = Math.max(longZ, d); }
  }
  if (minX > maxX) { minX = -0.5; maxX = 0.5; minY = 0; maxY = 1; minZ = -0.5; maxZ = 0.5; }
  return { w: maxX - minX, d: maxZ - minZ, top: maxY - minY, alongZ: alongZ > alongX, railLen: alongZ > alongX ? longZ : longX };
}

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const deg = (v: unknown) => (typeof v === "number" ? (v * Math.PI) / 180 : 0);

/** Build a NEW world from a recipe (seed = which variant). */
export function recipeToWorld(rc: Recipe, seed: number, span = 9, library: Record<string, ModelDef> = {}): WorldDoc {
  const models: Record<string, ModelDef> = {};
  for (const [k, v] of Object.entries(rc.models ?? {})) {
    if (!v || !Array.isArray(v.parts)) continue;
    // designed too plainly (a box or two)? the ready-made one of the same thing is better
    const good = v.parts.length < 8 ? starterFor(k, true) : null;
    models[k.toLowerCase().trim()] = good ? { ...good, abilities: v.abilities?.length ? v.abilities : good.abilities } : v;
  }
  const r = rng(seed * 4099 + 17);
  const objs: WorldObj[] = [];
  let idn = 0;
  const add = (type: string, x: number, z: number, extra: Partial<WorldObj> = {}): WorldObj => {
    const o: WorldObj = { id: `${type}-${seed}-${idn++}`, type, x: +x.toFixed(2), z: +z.toFixed(2), rot: 0, scale: 1, ...extra };
    objs.push(o);
    return o;
  };
  const taken: { x: number; z: number; r: number }[] = [];
  const stageClear = (x: number, z: number, rad: number) => !(Math.abs(x) < span * 0.62 + rad && z > -2.3 - rad && z < 2.5 + rad);
  const free = (x: number, z: number, rad: number) => taken.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + rad);

  // ---- rivers (as lines of points), ponds, waterfalls
  type River = { pts: [number, number][]; half: number; id: string };
  const rivers: River[] = [];
  const ponds: { x: number; z: number; r: number; id: string }[] = [];
  let fall: { x: number; z: number } | null = null;
  const nearRiver = (x: number, z: number, extra: number) => rivers.some((rv) => rv.pts.some((p, i) => {
    const q = rv.pts[i + 1]; if (!q) return false;
    const dx = q[0] - p[0], dz = q[1] - p[1], L2 = dx * dx + dz * dz;
    const u = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / L2));
    return Math.hypot(p[0] + dx * u - x, p[1] + dz * u - z) < rv.half + extra;
  }));
  const inPond = (x: number, z: number, extra: number) => ponds.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + extra);

  const hills: { x: number; z: number; r: number; h: number }[] = [];
  const rowBands: number[] = []; // z of every row (track, road…): nothing big stands on them
  const waterList = (rc.water ?? []).slice(0, 5);
  waterList.forEach((w, wi) => {
    if (w.type === "river") {
      const A = DIRS[w.from ?? ""] ?? DIRS[["left", "back-left", "back-right"][wi % 3]!]!;
      let B = DIRS[w.to ?? ""] ?? DIRS[["right", "front-right", "front-left"][wi % 3]!]!;
      if (B[0] === A[0] && B[1] === A[1]) B = [-A[0], A[1]];
      // bend it so it never runs over the characters
      let mx = (A[0] + B[0]) / 2 + (r() - 0.5) * 8, mz = (A[1] + B[1]) / 2;
      const dist = Math.hypot(mx, mz);
      const segPass = (() => { const dx = B[0] - A[0], dz = B[1] - A[1]; const u = Math.max(0, Math.min(1, -(A[0] * dx + A[1] * dz) / (dx * dx + dz * dz))); return Math.hypot(A[0] + dx * u, A[1] + dz * u); })();
      if (segPass < 8 || dist < 8) { mz = -7 - wi * 3 - r() * 2; mx *= 0.5; }
      const pts: [number, number][] = [];
      for (let k = 0; k <= 14; k++) {
        const t = k / 14;
        const x = (1 - t) * (1 - t) * A[0] + 2 * (1 - t) * t * mx + t * t * B[0];
        const z = (1 - t) * (1 - t) * A[1] + 2 * (1 - t) * t * mz + t * t * B[1] + Math.sin(t * 9 + wi) * 0.8;
        pts.push([x, z]);
      }
      // still too close to the stage? push those points back
      for (const p of pts) if (Math.abs(p[0]) < span * 0.7 + 3 && p[1] > -6) p[1] = -6 - (r() * 1.5);
      const width = Math.max(1.6, Math.min(8, num(w.width, 3.2 + r())));
      const o = add("river", pts[0]![0], pts[0]![1], { points: pts, name: w.name, opts: { width, fish: w.fish === false ? 0 : num(w.fish, 6) || 6 } });
      rivers.push({ pts, half: width / 2, id: o.id });
    } else if (w.type === "pond") {
      const R = w.size === "small" ? 2.4 : w.size === "big" ? 4.6 : 3.4;
      const p = spotIn(w.where ?? "behind", R + 1, true) ?? { x: 8, z: -9 };
      const o = add("pond", p.x, p.z, { name: w.name, opts: { radius: R, fish: w.fish === false ? 0 : num(w.fish, 5) || 5 } });
      ponds.push({ x: p.x, z: p.z, r: R, id: o.id });
      taken.push({ x: p.x, z: p.z, r: R + 0.6 });
    } else if (w.type === "waterfall" && !fall) {
      fall = { x: 0, z: -15 };
      add("waterfall", 0, -15, { opts: { height: 5.5 + r() * 1.5 } });
      taken.push({ x: 0, z: -15, r: 5 });
      const pr = 3.4;
      add("pond", 0, -11.2, { opts: { radius: pr, fish: 5 } });
      ponds.push({ x: 0, z: -11.2, r: pr, id: "fallpond" });
      taken.push({ x: 0, z: -11.2, r: pr + 0.5 });
    }
  });
  // ---- hills and far mountains
  const nh = rc.terrain?.hills === "many" ? 7 : rc.terrain?.hills === "few" ? 3 : 0;
  for (let i = 0, tries = 0; i < nh && tries < 60; tries++) {
    const sd = i % 2 ? 1 : -1;
    const x = sd * (10 + r() * 18), z = -6 - r() * 26, R = 6 + r() * 5, H = 2 + r() * (rc.terrain?.hills === "many" ? 4 : 3);
    if (nearRiver(x, z, R * 0.5) || inPond(x, z, R * 0.6)) continue;
    if (Math.hypot(x, z) < R + span * 0.6 + 2) continue; // the characters stand on flat ground
    hills.push({ x, z, r: R, h: H });
    add("hill", x, z, { opts: { radius: R, height: H } });
    i++;
  }
  if (fall) for (const sd of [-1, 1]) { const h = { x: sd * 8, z: -16, r: 8, h: 5.5 }; hills.push(h); add("hill", h.x, h.z, { opts: { radius: h.r, height: h.h } }); }
  if (rc.terrain?.mountains) for (let i = 0; i < 5; i++) add("hill", (i - 2) * 22 + (r() - 0.5) * 8, -48 - r() * 10, { opts: { radius: 14 + r() * 6, height: 9 + r() * 7 } });

  // ---- where things go
  function riverPoint(lane: number): { x: number; z: number; rot: number } | null {
    if (!rivers.length) return null;
    const rv = rivers[Math.floor(r() * rivers.length)]!;
    const cand = rv.pts.map((p, i) => ({ p, i })).filter(({ p }) => Math.abs(p[0]) < 26 && p[1] > -30 && p[1] < 6);
    if (!cand.length) return null;
    const { p, i } = cand[Math.floor(r() * cand.length)]!;
    const q = rv.pts[Math.min(rv.pts.length - 1, i + 1)]!, pp = rv.pts[Math.max(0, i - 1)]!;
    const tx = q[0] - pp[0], tz = q[1] - pp[1], L = Math.hypot(tx, tz) || 1;
    let nx = -tz / L, nz = tx / L;
    if (nz < 0) { nx = -nx; nz = -nz; } // normal towards the camera = near bank
    const k = (r() - 0.5) * 0.6;
    return { x: p[0] + tx * k + nx * lane * rv.half, z: p[1] + tz * k + nz * lane * rv.half, rot: Math.atan2(-tz, tx) };
  }
  function spotIn(where: string, rad: number, big: boolean): { x: number; z: number; rot?: number } | null {
    const w = where.toLowerCase();
    for (let t = 0; t < 40; t++) {
      let x = 0, z = 0, rot: number | undefined;
      if (rc.room) {
        // inside a room: everything stays inside its walls
        const RW = Math.max(4, rc.room.width ?? 10), RD = Math.max(3, rc.room.depth ?? 7);
        x = (r() - 0.5) * (RW - 1.4); z = 1.5 - RD + 0.7 + r() * (RD - 1.6);
        if (w === "stage") z = -1.2 - r() * 0.8;
        if (w === "left") x = -RW / 2 + 0.8 + r() * RW * 0.3;
        if (w === "right") x = RW / 2 - 0.8 - r() * RW * 0.3;
        if (w === "behind" || w === "back" || w === "far") z = 2 - RD + 0.6 + r() * 1.2;
      } else if (w === "river") { const p = riverPoint((r() - 0.5) * 0.8); if (!p) break; ({ x, z, rot } = p); }
      else if (w === "near-bank" || w === "river-banks" || w === "far-bank") {
        const sideK = w === "far-bank" ? -1 : w === "near-bank" ? 1 : r() < 0.5 ? 1 : -1;
        const p = riverPoint(sideK * (1 + (rad + 0.6 + r() * 2) / 2)); if (!p) break; ({ x, z } = p);
      } else if (w === "around-pond" && ponds.length) {
        const pd = ponds[Math.floor(r() * ponds.length)]!; const a = r() * Math.PI * 2, d = pd.r + rad + 0.6 + r() * 2.5;
        x = pd.x + Math.cos(a) * d; z = pd.z + Math.sin(a) * d;
      } else if (w === "near-waterfall" && fall) { x = (r() - 0.5) * 14; z = -13 + (r() - 0.5) * 5; }
      else if (w === "on-hills" && hills.length) { const h = hills[Math.floor(r() * hills.length)]!; const a = r() * 6.28, d = r() * h.r * 0.6; x = h.x + Math.cos(a) * d; z = h.z + Math.sin(a) * d; }
      else if (w === "stage") { x = (r() - 0.5) * span * 1.4; z = -1.3 - r() * 1.4; }
      else if (w === "behind") { x = (r() - 0.5) * 18; z = -3 - r() * 6; }
      else if (w === "back" || w === "far") { x = (r() - 0.5) * 50; z = -10 - r() * 22; }
      else if (w === "left") { x = -7 - r() * 18; z = -16 + r() * (big ? 14.5 : 18); }
      else if (w === "right") { x = 7 + r() * 18; z = -16 + r() * (big ? 14.5 : 18); }
      else if (w === "front-left") { x = -8 - r() * 12; z = 0 + r() * 5; }
      else if (w === "front-right") { x = 8 + r() * 12; z = 0 + r() * 5; }
      else { x = (r() - 0.5) * 54; z = -30 + r() * (big ? 28 : 34); }
      const onWater = w === "river";
      if (!onWater && (nearRiver(x, z, rad * 0.8 + 0.4) || inPond(x, z, rad + 0.3))) continue;
      if (big && !stageClear(x, z, rad)) continue;
      if (!onWater && rowBands.some((rz) => Math.abs(z - rz) < rad + 1.9)) continue; // not on the track / road
      if (big && rad > 1.2 && rowBands.length && (w === "behind" || w === "back" || w === "far" || w === "everywhere") && z > Math.min(...rowBands) - rad - 2) continue; // big buildings stand beyond it
      if (w !== "stage" && !stageClear(x, z, 0)) continue;
      if (!free(x, z, rad)) continue;
      // big things never block the view of the characters from the camera
      if (big && rad > 0.8 && z > 0 && Math.abs(x) < 9) continue;
      return { x, z, rot };
    }
    return null;
  }

  /** An exact spot the AI asked for — moved just enough so it does not stand
   * on the track / road, inside another building or on the characters. */
  function nudge(x0: number, z0: number, rad: number, big: boolean): { x: number; z: number } {
    if (rc.room) { // inside: exactly where it was asked, just kept within the walls
      const RW = Math.max(4, rc.room.width ?? 10), RD = Math.max(3, rc.room.depth ?? 7);
      return { x: Math.max(-RW / 2 + 0.4, Math.min(RW / 2 - 0.4, x0)), z: Math.max(2 - RD + 0.35, Math.min(1.6, z0)) };
    }
    const ok = (x: number, z: number) => free(x, z, rad) && !rowBands.some((rz) => Math.abs(z - rz) < rad + 1.7)
      && (!big || (stageClear(x, z, rad * 0.7) && !(z > -1 - rad * 0.5 && Math.abs(x) < 10))) && !nearRiver(x, z, rad * 0.6) && !inPond(x, z, rad);
    if (ok(x0, z0)) return { x: x0, z: z0 };
    // nearest free spot — rather further back than towards the camera
    const cands: { x: number; z: number; s: number }[] = [];
    for (let ring = 1; ring <= 30; ring++) {
      const d = ring * 0.7;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const x = x0 + Math.cos(a) * d, z = z0 + Math.sin(a) * d;
        cands.push({ x, z, s: d + Math.max(0, z - z0) * 2.5 });
      }
    }
    cands.sort((a, b) => a.s - b.s);
    for (const c of cands) if (ok(c.x, c.z)) return { x: c.x, z: c.z };
    return { x: x0, z: Math.min(z0, -12) };
  }

  // ---- things
  const RAD: Record<string, number> = { signpost: 0.5, hut: 2.2, house: 2.6, tent: 1.6, well: 1.0, campfire: 1.0, rock: 0.9, log: 1.0, bench: 1.0, fence: 3, bridge: 0.5, boat: 1.0 };
  const ROW_Z: Record<string, number> = { stage: -2.2, behind: -5.5, back: -12, far: -20, front: 4 };
  // rows (railway track, road…) first: things that move run ON them
  const rows: { z: number; name: string; top: number }[] = [];
  for (const t of rc.things ?? []) {
    const nm = String(t.what || "").toLowerCase().trim();
    if (!t.row || !nm.startsWith("model:")) continue;
    const def = models[nm.slice(6).trim()] ?? library[nm.slice(6).trim()] ?? starterFor(nm.slice(6).trim());
    if (!def) continue;
    rows.push({ z: typeof t.z === "number" ? t.z : ROW_Z[t.where ?? "behind"] ?? -5.5, name: nm.slice(6), top: Math.min(0.5, modelShape(def).top) });
    if (modelShape(def).top < 0.6) rowBands.push(rows[rows.length - 1]!.z);
  }
  const rowFor = (z: number | undefined) => {
    if (!rows.length) return null;
    const pref = rows.filter((r2) => /track|rail|road|lane|line|street|path/.test(r2.name));
    const list = pref.length ? pref : rows;
    return typeof z === "number" ? list.slice().sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0]! : list[0]!;
  };
  for (const t of (rc.things ?? []).slice(0, 80)) {
    let type = String(t.what || "").toLowerCase().trim();
    let word = "";
    // a thing designed from shapes
    if (type.startsWith("model:")) {
      const name = type.slice(6).trim();
      const def = models[name] ?? library[name] ?? starterFor(name);
      if (!def) { word = name.replace(/_/g, " "); type = "item"; }
      else {
        models[name] = def;
        const traits: Record<string, boolean> = {};
        for (const a of [...(def.abilities ?? []), ...(t.abilities ?? [])]) traits[a] = true;
        // the parts are real metres already: "size" only nudges it a little
        const shape = modelShape(def);
        const scale = shape.w < 0.4 && shape.d < 0.4 ? Math.max(0.5, Math.min(4, num(t.size, 1))) : Math.max(0.6, Math.min(1.6, num(t.size, 1)));
        const base = { opts: { model: name } as Record<string, string | number | boolean>, traits, scale, name: t.name };
        if (t.moves) base.opts.moves = t.moves;
        let rowZ = typeof t.z === "number" ? t.z : ROW_Z[t.where ?? "behind"] ?? -5.5;
        if (t.row) {
          // pieces join into one line along x (turn a piece whose rails run along z)
          const turn = shape.alongZ ? Math.PI / 2 : deg(t.turn);
          const pieceLen = (shape.alongZ ? shape.d : shape.w) * scale;
          let sp = Math.max(0.3, num(t.spacing, Math.max(0.5, pieceLen)));
          if (shape.railLen > 0) sp = Math.max(0.3, shape.railLen * scale * 0.98); // rails touch, no gaps
          for (let x = -46; x <= 46; x += sp) add("model", x, rowZ, { ...base, rot: turn });
          continue;
        }
        // a train / car / bus that moves runs ON its track / road row
        if (t.moves && t.moves !== "around") {
          const row = rowFor(typeof t.z === "number" ? t.z : undefined);
          if (row && (typeof t.z !== "number" || Math.abs(t.z - row.z) > 0.6 || true)) { rowZ = row.z; base.opts.lift = row.top; }
        }
        // how much ground it covers (so nothing else is put inside it)
        let foot = 1;
        for (const pt of def.parts) {
          const [px, , pz] = Array.isArray(pt.pos) ? pt.pos : [0, 0, 0];
          const [w, , d] = Array.isArray(pt.size) ? pt.size : [(pt.radius ?? 0.3) * 2, 0, (pt.radius ?? 0.3) * 2];
          foot = Math.max(foot, Math.abs(px ?? 0) + (w ?? 0) / 2, Math.abs(pz ?? 0) + (d ?? 0) / 2);
        }
        foot = Math.min(foot * scale, 25);
        const count = Math.max(1, Math.min(30, Math.round(num(t.count, 1))));
        for (let i = 0; i < count; i++) {
          if (t.moves) { add("model", typeof t.x === "number" ? t.x : 0, rowZ, { ...base, rot: deg(t.turn) }); continue; }
          if (typeof t.x === "number" || typeof t.z === "number") {
            let x = typeof t.x === "number" ? t.x + i * (foot * 2 + 0.5) : (r() - 0.5) * 20;
            let z = typeof t.z === "number" ? t.z : rowZ;
            if (!def.floor) ({ x, z } = nudge(x, z, foot * 0.85, true));
            add("model", x, z, { ...base, rot: deg(t.turn) });
            if (!def.floor) taken.push({ x, z, r: foot * 0.85 });
            continue;
          }
          const p = spotIn(t.where ?? "behind", foot, !def.floor) ?? spotIn("back", foot, !def.floor) ?? spotIn("far", foot, !def.floor);
          if (!p) continue;
          taken.push({ x: p.x, z: p.z, r: foot });
          add("model", p.x, p.z, { ...base, rot: typeof t.turn === "number" ? deg(t.turn) : (r() - 0.5) * 0.5 });
        }
        continue;
      }
    }
    if (type.startsWith("picture:")) { word = type.slice(8).trim(); type = "item"; }
    if (!CATALOG_BY_TYPE.has(type)) { const tt = typeForWord(type, rc.place ?? "plain"); if (tt) type = tt; else { word = word || type; type = "item"; } }
    if (["river", "pond", "waterfall", "hill", "path"].includes(type)) continue;
    const count = Math.max(1, Math.min(40, Math.round(num(t.count, 1))));
    const size = Math.max(0.4, Math.min(3, num(t.size, 1)));
    const rad = (RAD[type] ?? (/(tree|palm|plant)/.test(type) ? 1.3 : 0.5)) * (type === "item" ? 1 : size);
    for (let i = 0; i < count; i++) {
      let where = t.where ?? (type.includes("tree") || type === "palm_tree" ? "everywhere" : "behind");
      if (type === "boat" && !t.where) where = "river";
      if (type === "bridge") {
        const p = riverPoint(0); if (!p) break;
        add("bridge", p.x, p.z, { rot: p.rot + Math.PI / 2, opts: { len: (rivers[0]?.half ?? 1.6) * 2 + 2.5 } });
        continue;
      }
      const p = typeof t.x === "number" || typeof t.z === "number"
        ? { ...nudge((typeof t.x === "number" ? t.x : (r() - 0.5) * 16) + i * (rad * 2 + 0.5), typeof t.z === "number" ? t.z : -5, rad, rad > 0.6), rot: typeof t.turn === "number" ? deg(t.turn) : undefined }
        : spotIn(where, rad, rad > 0.6) ?? spotIn("everywhere", rad, true);
      if (!p) continue;
      taken.push({ x: p.x, z: p.z, r: rad });
      const opts: Record<string, string | number | boolean> = {};
      if (type === "item") { opts.word = word || "box"; opts.size = num(t.size, 1); }
      if (type === "boat") { opts.moving = !!t.moving || !!t.rower; opts.rower = !!t.rower; }
      if (type === "campfire") opts.lit = t.lit !== false;
      if (type === "signpost") { const nm = String(t.name || rc.name || "WELCOME").toUpperCase(); opts.text = /STATION/.test(nm) ? "STATION" : nm.split(/\s+/).find((w) => w.length > 2)?.slice(0, 12) ?? "WELCOME"; }
      if ((type === "pine_tree" || type === "bare_tree") && (rc.weather === "snow" || rc.ground === "snow")) opts.snow = true;
      const traits: Record<string, boolean> = {};
      for (const a of t.abilities ?? []) traits[a] = true;
      add(type, p.x, p.z, {
        rot: p.rot ?? (/(tree|palm|plant|bush)/.test(type) ? r() * 6 : (r() - 0.5) * 0.8), scale: type === "item" ? 1 : size * (0.85 + r() * 0.3),
        name: t.name, opts: Object.keys(opts).length ? opts : undefined, traits: Object.keys(traits).length ? traits : undefined,
      });
    }
  }
  // ---- animals
  for (const a of (rc.animals ?? []).slice(0, 20)) {
    const species = String(a.species || "dog").toLowerCase();
    const doing = ANIMAL_DOING.includes(String(a.doing)) ? String(a.doing) : "walk";
    const count = Math.max(1, Math.min(12, Math.round(num(a.count, 1))));
    let where = a.where ?? (doing === "swim" ? "river" : "behind");
    if (doing === "swim") where = ponds.length && !rivers.length ? "around-pond" : where === "river" ? "near-bank" : where;
    for (let i = 0; i < count; i++) {
      let p = spotIn(where === "river" ? "near-bank" : where, 0.6, false);
      if (doing === "swim") { const q = rivers.length ? riverPoint(where === "far-bank" ? -0.6 : 0.6) : ponds[0] ? { x: ponds[0].x + ponds[0].r * 0.5, z: ponds[0].z } : null; if (q) p = q; }
      if (!p) continue;
      add("animal", p.x, p.z, { name: a.name, opts: { species, doing, radius: rc.room ? 0.8 : 1.5 + r() * 2, bank: where === "far-bank" ? "far" : "near" } });
    }
  }
  // ---- people
  for (const pe of (rc.people ?? []).slice(0, 12)) {
    const doing = PEOPLE_DOING.includes(String(pe.doing)) ? String(pe.doing) : "walk";
    const count = Math.max(1, Math.min(8, Math.round(num(pe.count, 1))));
    for (let i = 0; i < count; i++) {
      if (doing === "row") {
        const p = riverPoint((r() - 0.5) * 0.6) ?? (ponds[0] ? { x: ponds[0].x, z: ponds[0].z, rot: 0 } : null);
        if (!p) continue;
        add("boat", p.x, p.z, { rot: p.rot, opts: { moving: true, rower: true, who: pe.who || "boatman" } });
        continue;
      }
      const where = pe.where ?? (doing === "fish" || doing === "wash" ? "near-bank" : "behind");
      const p = spotIn(where, 0.6, false);
      if (!p) continue;
      add("person", p.x, p.z, { opts: { who: pe.who || "villager", doing, female: !!pe.female, radius: rc.room ? 0.8 : 2 + r() * 2 } });
    }
  }
  // a little life always (outside)
  if (!rc.room && !(rc.animals ?? []).some((a) => /bird|parrot|owl/.test(a.species)) && rc.time !== "night") add("birds", 0, -12, { opts: { count: 4 } });

  const place = rc.place ?? "plain";
  const ground: GroundKind = rc.ground ?? (rc.weather === "snow" ? "snow" : place === "jungle" ? "jungle" : place === "desert" || place === "beach" ? "sand" : place === "village" ? "dirt" : "grass");
  return {
    version: 1, name: (rc.name || "My world").slice(0, 60), kind: place, ground, time: rc.time ?? "day",
    wind: Math.max(0, Math.min(1, num(rc.wind, 0.5))), weather: rc.weather === "rain" || rc.weather === "snow" ? rc.weather : "",
    season: rc.season ?? "", fog: rc.weather === "fog" ? 0.8 : rc.season === "winter" ? 0.45 : 0,
    grass: ground === "snow" || ground === "sand" || ground === "dirt" || ground === "moon" || ground === "rock" ? 0 : num(rc.grass, rc.season === "winter" ? 0.5 : 1),
    objects: objs, stage: { x: 0, z: 0, rot: 0 }, recipe: rc, models,
    ...(rc.room ? { room: rc.room, grass: 0 } : {}),
  };
}
