/**
 * 3D World — the data. A world is a list of objects; every object has a
 * type (mango tree, river, hut…) and its own list of abilities ("traits"):
 * what it does by itself (sways in the wind, water flows, fish swim) and
 * what characters can do with it (climb, cut a branch, pick fruit, swim,
 * open the door…). The Environment Designer edits this; the video player
 * builds it in 3D; the backend only stores it.
 */

export type Vec2 = [number, number];

export type WorldObj = {
  id: string;
  type: string;
  name?: string; // your own name for it ("the old mango tree")
  x: number; z: number; // metres
  rot?: number; // radians around up
  scale?: number;
  traits?: Record<string, boolean>; // overrides of the type's defaults
  opts?: Record<string, number | string | boolean>;
  points?: Vec2[]; // river / path line (absolute x, z)
};

/** An object the AI (or you) designed from simple shapes — a train, a
 * platform, a clock tower, a temple… Units are metres; y = 0 is the ground;
 * a character is 1.7 m tall. Vehicles face +x (the front). */
export type ModelPart = {
  shape: "box" | "cylinder" | "sphere" | "cone" | "torus" | "plane" | "text";
  size?: number[]; // box [w, h, d], plane / text [w, h]
  radius?: number; radiusTop?: number; height?: number; tube?: number;
  pos?: number[]; // [x, y, z] of the part's centre
  rot?: number[]; // degrees [x, y, z]
  color?: string;
  text?: string; textColor?: string;
  glass?: boolean; // see-through (windows)
  glow?: boolean; // lights, lamps
  wheel?: boolean; // turns when it moves
  door?: boolean; // swings open (hinge on its left edge)
  smoke?: boolean; // smoke comes out of it (chimney)
  sway?: boolean; // moves in the wind (flags, leaves)
  spin?: number; // keeps turning (fan, windmill) — turns per second
};
export type ModelDef = {
  parts: ModelPart[];
  abilities?: string[]; // traits: sittable, enterable, climbable, pickable, solid…
  seat_height?: number; climb_height?: number;
  floor?: boolean; // characters can walk / stand on top of it (platform, stage, deck)
  label?: string;
};

/** The shell of an inside place: floor, back + side walls (the camera side
 * stays open, like a stage set), ceiling, lamps, windows. "moving" = it is a
 * vehicle: the world outside the windows passes by. */
export type RoomDef = {
  width?: number; depth?: number; height?: number;
  wall?: string; floor?: string; ceiling?: string; trim?: string;
  windows?: number; // windows in the back wall
  moving?: boolean; // a train / bus / plane on the move
  outside?: "fields" | "city" | "sky" | "trees" | "sea";
  lamps?: boolean;
};

export type GroundKind = "grass" | "jungle" | "sand" | "snow" | "dirt" | "rock" | "farm" | "moon";
export type TimeOfDay = "day" | "sunset" | "night";

export type WorldDoc = {
  version: 1;
  name: string;
  kind?: string; // the closest 2D place (for the 2D tool): jungle, farm…
  ground: GroundKind;
  time: TimeOfDay;
  wind: number; // 0..1
  weather?: "" | "rain" | "snow";
  grass?: number; // 0..1 how much grass
  season?: "" | "spring" | "summer" | "autumn" | "winter";
  fog?: number; // 0..1 extra mist
  recipe?: unknown; // the description it was built from (to build a new variant)
  fresh?: boolean; // build a NEW layout from the recipe in every video
  models?: Record<string, ModelDef>; // things designed from shapes (see ModelDef)
  room?: RoomDef; // an INSIDE place: a room, a classroom, inside a train / bus / plane, a shop…
  objects: WorldObj[];
  stage: { x: number; z: number; rot: number }; // where the characters stand (camera looks from +z)
};

// ------------------------------------------------------------------ traits
export type TraitId =
  | "sway" | "climbable" | "fruits" | "shakeable" | "branches_cut" | "choppable"
  | "pickable" | "eatable" | "throwable" | "kickable" | "pushable" | "sittable" | "hide_behind"
  | "swimmable" | "flowing" | "fish" | "drinkable" | "openable" | "enterable"
  | "burnable" | "floats" | "solid" | "wander" | "flies";

export const TRAITS: { id: TraitId; label: string; help: string }[] = [
  { id: "sway", label: "Sways in the wind", help: "Leaves, branches and grass move with the wind." },
  { id: "climbable", label: "Can be climbed", help: "Characters climb it (facing it) and sit up on top." },
  { id: "fruits", label: "Has fruits", help: "Fruits hang on it; they can be picked or fall down." },
  { id: "shakeable", label: "Shake → fruits fall", help: "Shaking it makes fruits / leaves fall." },
  { id: "branches_cut", label: "Branches can be cut", help: "A branch can be cut off and falls down." },
  { id: "choppable", label: "Can be chopped down", help: "Chopped with an axe it falls over (TIMBER!)." },
  { id: "pickable", label: "Can be picked up", help: "Characters pick it up and carry it in their hand." },
  { id: "eatable", label: "Can be eaten", help: "Bitten until it is gone." },
  { id: "throwable", label: "Can be thrown", help: "Flies through the air, bounces, splashes in water." },
  { id: "kickable", label: "Can be kicked", help: "Flies off when kicked." },
  { id: "pushable", label: "Can be pushed", help: "Rolls / slides when pushed." },
  { id: "sittable", label: "Can be sat on", help: "Characters sit on it." },
  { id: "hide_behind", label: "Hide behind it", help: "Characters crouch behind it to hide." },
  { id: "swimmable", label: "Swim in it", help: "Characters jump in and swim." },
  { id: "flowing", label: "Water flows", help: "The water moves; things in it drift away." },
  { id: "fish", label: "Has fish", help: "Fish swim (and jump) in it; they can be caught." },
  { id: "drinkable", label: "Drink from it", help: "Characters kneel and drink." },
  { id: "openable", label: "Door opens", help: "The door opens and closes." },
  { id: "enterable", label: "Can go inside", help: "Characters walk in through the door (and come out)." },
  { id: "burnable", label: "Can be lit (fire)", help: "A fire can be lit; it burns with smoke." },
  { id: "floats", label: "Floats on water", help: "Bobs and drifts on water instead of sinking." },
  { id: "solid", label: "Solid (walk around it)", help: "Characters walk around it, not through it." },
  { id: "wander", label: "Moves around by itself", help: "Animals walk around on their own." },
  { id: "flies", label: "Flies", help: "Birds / butterflies fly around." },
];

// ---------------------------------------------------------------- catalog
export type CatalogItem = {
  type: string;
  label: string;
  cat: "Trees & plants" | "Water" | "Ground & rocks" | "Buildings" | "Things" | "Life";
  icon: string;
  traits: TraitId[]; // what it CAN do
  on: TraitId[]; // what is switched on by default
  words: string[]; // what a script may call it
  opts?: Record<string, number | string | boolean>;
  line?: boolean; // drawn as a line of points (river)
};

const T = (s: string) => s.split(" ").filter(Boolean) as TraitId[];
const TREE = T("sway climbable fruits shakeable branches_cut choppable hide_behind solid");

export const CATALOG: CatalogItem[] = [
  { type: "mango_tree", label: "Mango tree", cat: "Trees & plants", icon: "🥭", traits: TREE, on: TREE, words: ["mango tree", "mango", "mangoes", "tree"], opts: { fruits: 9 } },
  { type: "apple_tree", label: "Apple tree", cat: "Trees & plants", icon: "🍎", traits: TREE, on: TREE, words: ["apple tree", "apple", "apples"], opts: { fruits: 10 } },
  { type: "orange_tree", label: "Orange tree", cat: "Trees & plants", icon: "🍊", traits: TREE, on: TREE, words: ["orange tree", "orange", "oranges"], opts: { fruits: 9 } },
  { type: "big_tree", label: "Big shady tree", cat: "Trees & plants", icon: "🌳", traits: TREE, on: T("sway climbable shakeable branches_cut choppable hide_behind solid"), words: ["big tree", "tree", "oak", "banyan", "branch"], opts: { fruits: 0 } },
  { type: "bare_tree", label: "Bare tree (winter)", cat: "Trees & plants", icon: "🪾", traits: T("sway climbable branches_cut choppable hide_behind solid"), on: T("sway climbable branches_cut choppable hide_behind solid"), words: ["bare tree", "dry tree", "dead tree", "winter tree"] },
  { type: "pine_tree", label: "Pine tree", cat: "Trees & plants", icon: "🌲", traits: T("sway climbable choppable shakeable hide_behind solid"), on: T("sway climbable choppable shakeable hide_behind solid"), words: ["pine", "pine tree", "fir"] },
  { type: "palm_tree", label: "Coconut palm", cat: "Trees & plants", icon: "🌴", traits: TREE, on: T("sway climbable fruits shakeable choppable hide_behind solid"), words: ["palm", "palm tree", "coconut tree", "coconut", "coconuts"], opts: { fruits: 4 } },
  { type: "banana_plant", label: "Banana plant", cat: "Trees & plants", icon: "🍌", traits: T("sway fruits shakeable choppable hide_behind"), on: T("sway fruits shakeable choppable hide_behind"), words: ["banana", "bananas", "banana tree", "banana plant"], opts: { fruits: 1 } },
  { type: "bush", label: "Bush", cat: "Trees & plants", icon: "🌿", traits: T("sway hide_behind shakeable"), on: T("sway hide_behind shakeable"), words: ["bush", "bushes", "shrub", "leaves"] },
  { type: "berry_bush", label: "Berry bush", cat: "Trees & plants", icon: "🫐", traits: T("sway hide_behind fruits shakeable"), on: T("sway hide_behind fruits shakeable"), words: ["berry", "berries", "berry bush"], opts: { fruits: 8 } },
  { type: "flowers", label: "Flowers", cat: "Trees & plants", icon: "🌼", traits: T("sway pickable"), on: T("sway pickable"), words: ["flower", "flowers", "rose", "roses"], opts: { count: 14, radius: 1.4 } },
  { type: "tall_grass", label: "Tall grass", cat: "Trees & plants", icon: "🌾", traits: T("sway hide_behind"), on: T("sway hide_behind"), words: ["tall grass", "reeds", "crops", "wheat"], opts: { radius: 1.6 } },
  { type: "mushroom", label: "Mushrooms", cat: "Trees & plants", icon: "🍄", traits: T("pickable eatable"), on: T("pickable eatable"), words: ["mushroom", "mushrooms"] },
  { type: "river", label: "River", cat: "Water", icon: "🏞️", traits: T("swimmable flowing fish drinkable"), on: T("swimmable flowing fish drinkable"), words: ["river", "stream", "water", "nadi", "canal"], opts: { width: 3.2, fish: 6 }, line: true },
  { type: "waterfall", label: "Waterfall (with cliff)", cat: "Water", icon: "🌊", traits: T("solid sway"), on: T("solid sway"), words: ["waterfall", "falls", "cascade"], opts: { height: 5.5 } },
  { type: "pond", label: "Pond / lake", cat: "Water", icon: "💧", traits: T("swimmable fish drinkable"), on: T("swimmable fish drinkable"), words: ["pond", "lake", "pool", "water"], opts: { radius: 3.2, fish: 5 } },
  { type: "bridge", label: "Wooden bridge", cat: "Water", icon: "🌉", traits: T("solid"), on: [], words: ["bridge"], opts: { len: 5 } },
  { type: "boat", label: "Boat", cat: "Water", icon: "🛶", traits: T("sittable floats"), on: T("sittable floats"), words: ["boat", "canoe", "kashti"], opts: { moving: false, rower: false } },
  { type: "rock", label: "Rock (sit / hide)", cat: "Ground & rocks", icon: "🪨", traits: T("sittable hide_behind solid pushable"), on: T("sittable hide_behind solid"), words: ["rock", "boulder", "big stone"] },
  { type: "stones", label: "Small stones", cat: "Ground & rocks", icon: "🥌", traits: T("pickable throwable"), on: T("pickable throwable"), words: ["stone", "stones", "pebble", "pebbles"], opts: { count: 5 } },
  { type: "log", label: "Log", cat: "Ground & rocks", icon: "🪵", traits: T("sittable pushable floats solid"), on: T("sittable pushable floats"), words: ["log", "wood", "timber"] },
  { type: "stump", label: "Tree stump", cat: "Ground & rocks", icon: "🪵", traits: T("sittable"), on: T("sittable"), words: ["stump"] },
  { type: "hill", label: "Hill", cat: "Ground & rocks", icon: "⛰️", traits: [], on: [], words: ["hill", "mound"], opts: { radius: 6, height: 1.6 } },
  { type: "path", label: "Dirt path", cat: "Ground & rocks", icon: "🟫", traits: [], on: [], words: ["path", "road", "track"], opts: { width: 1.6 }, line: true },
  { type: "hut", label: "Hut (door, go inside)", cat: "Buildings", icon: "🛖", traits: T("openable enterable hide_behind solid"), on: T("openable enterable hide_behind solid"), words: ["hut", "house", "home", "cottage", "door", "inside"] },
  { type: "house", label: "House", cat: "Buildings", icon: "🏠", traits: T("openable enterable hide_behind solid"), on: T("openable enterable hide_behind solid"), words: ["house", "home", "building", "door"] },
  { type: "tent", label: "Tent", cat: "Buildings", icon: "⛺", traits: T("enterable hide_behind solid"), on: T("enterable hide_behind solid"), words: ["tent", "camp"] },
  { type: "fence", label: "Fence", cat: "Buildings", icon: "🚧", traits: T("solid hide_behind"), on: T("solid"), words: ["fence"], opts: { len: 6 } },
  { type: "well", label: "Water well", cat: "Buildings", icon: "🪣", traits: T("drinkable solid"), on: T("drinkable solid"), words: ["well"] },
  { type: "bench", label: "Bench", cat: "Buildings", icon: "🪑", traits: T("sittable solid"), on: T("sittable"), words: ["bench", "seat"] },
  { type: "campfire", label: "Campfire", cat: "Buildings", icon: "🔥", traits: T("burnable solid"), on: T("burnable"), words: ["campfire", "fire", "bonfire", "firewood"], opts: { lit: true } },
  { type: "ladder", label: "Ladder", cat: "Buildings", icon: "🪜", traits: T("climbable solid"), on: T("climbable"), words: ["ladder", "stairs"] },
  { type: "signpost", label: "Sign post", cat: "Buildings", icon: "🪧", traits: [], on: [], words: ["sign", "signpost", "board"], opts: { text: "JUNGLE" } },
  { type: "ball", label: "Ball", cat: "Things", icon: "⚽", traits: T("pickable throwable kickable pushable floats"), on: T("pickable throwable kickable pushable floats"), words: ["ball", "football"] },
  { type: "basket", label: "Basket of fruit", cat: "Things", icon: "🧺", traits: T("pickable"), on: T("pickable"), words: ["basket"] },
  { type: "crate", label: "Wooden box", cat: "Things", icon: "📦", traits: T("pushable sittable hide_behind solid"), on: T("pushable sittable hide_behind"), words: ["box", "crate", "chest"] },
  { type: "axe", label: "Axe", cat: "Things", icon: "🪓", traits: T("pickable"), on: T("pickable"), words: ["axe", "hatchet"] },
  { type: "fruit", label: "Fruit (to pick & eat)", cat: "Things", icon: "🥭", traits: T("pickable eatable throwable"), on: T("pickable eatable throwable"), words: ["mango", "apple", "orange", "banana", "coconut", "fruit"], opts: { kind: "mango", count: 3 } },
  { type: "item", label: "Any thing (its picture)", cat: "Things", icon: "🎁", traits: T("pickable eatable throwable solid"), on: T("pickable throwable"), words: [], opts: { word: "gift", size: 0.42 } },
  { type: "person", label: "Person (walks, works, fishes…)", cat: "Life", icon: "🧑", traits: T("wander"), on: T("wander"), words: ["person", "man", "woman", "people", "villager", "boatman", "mallah", "farmer", "fisherman"], opts: { who: "villager", doing: "walk", female: false } },
  { type: "kit", label: "Ready-made model", cat: "Things", icon: "🏙", traits: T("solid hide_behind"), on: T("solid hide_behind sittable pickable enterable"), words: [], opts: { kit: "" } },
  { type: "model", label: "Designed thing", cat: "Things", icon: "🧩", traits: T("sittable enterable climbable pickable throwable pushable solid hide_behind openable burnable"), on: [], words: [], opts: { model: "" } },
  { type: "birds", label: "Birds flying", cat: "Life", icon: "🐦", traits: T("flies"), on: T("flies"), words: ["birds", "bird"], opts: { count: 5 } },
  { type: "butterflies", label: "Butterflies", cat: "Life", icon: "🦋", traits: T("flies"), on: T("flies"), words: ["butterfly", "butterflies"], opts: { count: 4 } },
  { type: "animal", label: "Animal (walks, swims, plays…)", cat: "Life", icon: "🐄", traits: T("wander"), on: T("wander"), words: [], opts: { species: "cow", doing: "walk" } },
];

export const CATALOG_BY_TYPE = new Map(CATALOG.map((c) => [c.type, c]));

/** Is this ability switched on for this object? */
export function hasTrait(o: WorldObj, t: TraitId): boolean {
  const c = CATALOG_BY_TYPE.get(o.type);
  if (o.traits && t in o.traits) return !!o.traits[t] && !!c?.traits.includes(t);
  return !!c?.on.includes(t);
}
export function optOf(o: WorldObj, k: string, d: number): number {
  const v = o.opts?.[k] ?? CATALOG_BY_TYPE.get(o.type)?.opts?.[k];
  return typeof v === "number" ? v : d;
}
export function optStr(o: WorldObj, k: string, d: string): string {
  const v = o.opts?.[k] ?? CATALOG_BY_TYPE.get(o.type)?.opts?.[k];
  return typeof v === "string" ? v : d;
}

/** Fruit look per tree. */
export const FRUIT_OF: Record<string, { kind: string; color: string; r: number; long?: number }> = {
  mango_tree: { kind: "mango", color: "#f59e0b", r: 0.085, long: 1.35 },
  apple_tree: { kind: "apple", color: "#dc2626", r: 0.075 },
  orange_tree: { kind: "orange", color: "#f97316", r: 0.08 },
  palm_tree: { kind: "coconut", color: "#7c4a21", r: 0.12 },
  banana_plant: { kind: "banana", color: "#facc15", r: 0.07, long: 2.2 },
  berry_bush: { kind: "berry", color: "#7c3aed", r: 0.035 },
};

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Interactions characters can do (script tags {verb:thing}) — timings are
 * shared with the backend (tools_animator.WORLD_ACTS): A = frames walking to
 * the thing, hits = frames where something happens. */
export const WACTS: Record<string, { n: number; a: number; hits?: number[] }> = {
  go: { n: 48, a: 48 }, return: { n: 40, a: 40 }, cross: { n: 96, a: 96 },
  climb: { n: 96, a: 28 }, "climb-down": { n: 60, a: 0 },
  pick: { n: 56, a: 26, hits: [40] }, shake: { n: 76, a: 24, hits: [40, 50, 60] },
  cut: { n: 90, a: 26, hits: [40, 54, 68] }, chop: { n: 120, a: 26, hits: [40, 54, 68, 82] },
  eat: { n: 56, a: 24, hits: [34, 42, 50] }, throw: { n: 40, a: 0, hits: [16] }, give: { n: 48, a: 28, hits: [36] },
  swim: { n: 144, a: 24, hits: [30] }, fish: { n: 156, a: 24, hits: [34, 100, 116] }, drink: { n: 72, a: 24, hits: [38, 50] },
  sit: { n: 40, a: 28 }, "stand-up": { n: 18, a: 0 },
  open: { n: 40, a: 24, hits: [30] }, close: { n: 36, a: 20, hits: [26] },
  enter: { n: 64, a: 24, hits: [26, 56] }, exit: { n: 56, a: 0, hits: [2, 44] },
  light: { n: 60, a: 24, hits: [40] }, push: { n: 76, a: 24 }, kick: { n: 44, a: 24, hits: [30] },
  hide: { n: 44, a: 36 }, look: { n: 30, a: 0 }, carry: { n: 56, a: 26, hits: [40] }, drop: { n: 24, a: 0, hits: [10] },
};

/** An action you made in the Action Builder (or a ready-made one): weld, ride, break… (backend: tools_animator CUSTOM). */
export type CustomAction = {
  label?: string; words?: string[]; frames: number; go?: boolean;
  body?: string; // stand | kneel | sit | crouch | lie
  arms?: string; // work | hammer | up | point | wave | drive | reach | none
  hold?: string; // a prop in the hand (hammer, welding torch, shovel… or any model)
  ride?: boolean; rideDist?: number; // sit on the thing and both move
  effect?: string; // sparks | smoke | fire | dust | sparkle | splash
  change?: string; color?: string; atStart?: boolean; // what happens to the thing
  sound?: string; closeup?: boolean; thing?: string;
};
