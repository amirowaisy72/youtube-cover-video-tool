/**
 * Script Planner logic (user, 2026-11-19): what the app can / cannot show for
 * a script, and the ONE prompt that gets the missing pieces made by an AI as
 * an add-on pack (data only). The page is routes/planner.tsx.
 */
import { speciesFor } from "./creatures";
import { blueprintFor } from "./world/blueprints";
import { myThingFor, typeForWord, WORLD_KINDS } from "./world/auto";
import { findKit } from "./world/kits";
import { recipeSpec } from "./world/recipe";
import { starterFor } from "./world/starter";
import type { ModelDef } from "./world/types";

export type Where = { scene: number; line: number; text: string };
export type Check = {
  scenes: { i: number; location: string; place: string; clock: string; world: string; world_exact: boolean; lines: number }[];
  tags: { tag: string; verb: string; obj: string; status: "ok" | "near" | "missing"; shown_as: string; count: number; example: Where }[];
  things: { word: string; verbs: string[]; count: number; example: Where }[];
  outfits: { name: string; status: "ok" | "near"; shown_as: string; count: number; example: Where }[];
  sounds: { word: string; count: number; example: string }[];
  speakers: { name: string; lines: number; look: boolean; saved?: boolean; animal?: boolean }[];
  screens: number;
  lines: number;
};
export type Status = "ok" | "near" | "missing";
export type Row = { key: string; label: string; status: Status; how: string; example?: string };
export type PackInfo = { outfits: Record<string, unknown>; cast: Record<string, unknown>; aliases: Record<string, string>; sounds: Record<string, string>;
  packs: { name: string; installed: string; counts: Record<string, number> }[]; actions: string[] };

const HANDY = new Set(["pick", "eat", "give", "throw", "drop", "carry", "hold", "drink"]);
const VEHICLE_VERBS = /^(drive|ride|enter|board|crash|get-in)$/;
const FRUITS = ["mango", "apple", "orange", "banana", "coconut", "berry", "fruit"];


/** The first JSON object in an AI answer (code fences, words around it, trailing commas…). */
export function parsePack(text: string): Record<string, unknown> | null {
  const raw = text.replace(/```(?:json)?/g, "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  for (const cand of [raw.slice(a, b + 1), raw.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1").replace(/^\s*\/\/.*$/gm, "")]) {
    try { const v = JSON.parse(cand); if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>; } catch { /* next */ }
  }
  return null;
}

export function placeRow(s: Check["scenes"][number]): Row {
  const label = s.location || s.place || `scene ${s.i + 1}`;
  const ex = `Scene ${s.i + 1}${s.clock ? ` (${s.clock})` : ""}, ${s.lines} lines`;
  if (s.world && s.world_exact) return { key: label, label, status: "ok", how: `your own 3D world "${s.world}"`, example: ex };
  const bp = blueprintFor(label, s.place);
  if (bp) return { key: label, label, status: "ok", how: `ready-made place: ${bp.label}`, example: ex };
  if (s.world) return { key: label, label, status: "ok", how: `your own 3D world "${s.world}" (close match)`, example: ex };
  if (WORLD_KINDS.has(s.place)) return { key: label, label, status: "ok", how: `nature world (${s.place})`, example: ex };
  const nature = label.toLowerCase().split(/[^a-z]+/).find((t) => WORLD_KINDS.has(t));
  if (nature) return { key: label, label, status: "near", how: `a plain outdoor world with a ${nature} — no ready-made "${label}" place`, example: ex };
  return { key: label, label, status: "missing", how: "no 3D place for this yet — it would be a plain, empty set", example: ex };
}

export function thingRow(t: Check["things"][number], lib: Record<string, ModelDef>): Row {
  const w = t.word;
  const base = { key: w, label: w, example: `${t.example.text}  (${t.verbs.join(", ")} · ${t.count}×)` };
  const vehicle = t.verbs.some((v) => VEHICLE_VERBS.test(v));
  const mine = myThingFor(w, lib);
  if (mine) return { ...base, status: "ok", how: `your designed thing "${mine[0]}"` };
  if (speciesFor(w)) return { ...base, status: "ok", how: "an animal" };
  if (FRUITS.some((f) => w.includes(f))) return { ...base, status: "ok", how: "fruit" };
  if (starterFor(w)) return { ...base, status: "ok", how: "ready-made 3D model" };
  const k = findKit(w, vehicle ? "vehicle" : undefined);
  if (k) return { ...base, status: "ok", how: `3D model from the library (${k.id.split("/").pop()})` };
  if (!vehicle && typeForWord(w, "plain", t.verbs[0] ?? "")) return { ...base, status: "ok", how: "a 3D world object" };
  if (t.verbs.every((v) => HANDY.has(v))) return { ...base, status: "ok", how: "small thing in the hand (its picture)" };
  if (vehicle) return { ...base, status: "missing", how: "no 3D vehicle like this yet — nobody could get in or drive it" };
  return { ...base, status: "near", how: "no 3D model — shown as a flat picture" };
}

export function buildPrompt(res: Check, rows: Record<string, Row[]>, script: string, opts: { builtin: string[]; custom: string[]; sounds: string[]; library: string[] }): string {
  const need = (k: string) => rows[k]!.filter((r) => r.status !== "ok");
  const sceneLines = (i: number) => {
    // the first lines of that scene, so the AI knows what happens there
    const out: string[] = [];
    let sc = -1;
    for (const line of script.split("\n")) {
      if (/^\s*#*\s*(scene\s*:|#)/i.test(line) && !/time\s*skip/i.test(line)) { sc++; continue; }
      if (sc === i && line.includes(":") && out.length < 6) out.push(line.trim().slice(0, 160));
    }
    return out;
  };
  const parts: string[] = [];
  const places = need("places");
  if (places.length) {
    parts.push("PLACES (each needs a 3D world; the key must be EXACTLY the place text below):\n" + places.map((r) => {
      const s = res.scenes.find((x) => (x.location || x.place) === r.key);
      return `- "${r.key}" — ${r.example}${s ? "\n    what happens there:\n      " + sceneLines(s.i).join("\n      ") : ""}`;
    }).join("\n"));
  }
  const tags = res.tags.filter((t) => t.status === "missing");
  if (tags.length) parts.push("ACTIONS the app cannot act yet (make each one in \"actions\", named exactly like the tag's first word):\n"
    + tags.map((t) => `- ${t.tag} (${t.count}×) e.g. "${t.example.text}"`).join("\n"));
  const near = res.tags.filter((t) => t.status === "near");
  if (near.length) parts.push("APPROXIMATE TAGS (the app would show something close instead). For each: if the close one is right, add an alias; if not, make a real action:\n"
    + near.map((t) => `- ${t.tag} — now shown as ${t.shown_as || "something close"}; e.g. "${t.example.text}"`).join("\n"));
  const things = need("things");
  if (things.length) parts.push("THINGS with no 3D model yet (design each one in \"things\"; vehicles must be big enough for 2 people to sit in, abilities [\"solid\",\"enterable\"]):\n"
    + things.map((r) => `- "${r.key}" — ${r.how}; ${r.example}`).join("\n"));
  const outfits = res.outfits.filter((o) => o.status !== "ok");
  if (outfits.length) parts.push("OUTFITS ({wear:name}) the app does not have:\n" + outfits.map((o) => `- "${o.name}" e.g. "${o.example.text}"`).join("\n"));
  if (res.sounds.length) parts.push("SOUNDS / words in [ ] the app does not know (add each to \"sounds\" with Freesound search words; if it is really an expression or pose, use \"aliases\" instead):\n"
    + res.sounds.map((s) => `- "${s.word}" e.g. "${s.example}"`).join("\n"));
  const cast = res.speakers.filter((s) => !s.look && !s.saved && !s.animal && !speciesFor(s.name)).slice(0, 20);
  if (cast.length) parts.push("SIDE CHARACTERS (optional: give the important ones a fitting look in \"cast\"; otherwise the app picks a random look):\n"
    + cast.map((s) => `- ${s.name} (${s.lines} lines)`).join("\n"));

  return `I make 3D cartoon videos with my own animation app. My script needs some things the app does not have yet. Make them as ONE ADD-ON PACK: a JSON file my app imports (data only, no code). Reply with ONLY that JSON inside one code block.

=== WHAT MY SCRIPT NEEDS ===
${parts.join("\n\n")}

=== THE ADD-ON PACK FORMAT ===
{
  "ytguru_pack": 1,
  "name": "short name for this pack",
  "places":  { "<exact place text>": WORLD RECIPE },
  "actions": { "<tag name>": ACTION },
  "aliases": { "<new tag>": "<existing tag>" },
  "things":  { "<thing name>": MODEL },
  "outfits": { "<outfit name>": OUTFIT },
  "cast":    { "<Character name>": LOOK },
  "sounds":  { "<word>": "<2-4 English words to search freesound.org>" }
}
Leave out any section you do not need. Use the EXACT names from the lists above as keys.

ACTION = {
  "label": "short description", "words": ["other words for it", "-ing form", "past tense"],
  "go": true if the character first walks up to the thing,
  "atStart": true only if nobody does it and the thing is already like that when the scene starts,
  "body": "stand" | "kneel" | "crouch" | "sit" | "lie",
  "arms": "work" | "hammer" | "reach" | "point" | "up" | "wave" | "drive" | "none",
  "hold": "what is in the hand (hammer, welding torch, shovel, brush, frying pan, wrench, stick, sword, or any simple thing)" or "",
  "ride": true if the character gets on/in the thing and it moves away with them, "rideDist": metres it moves (0-60),
  "effect": "sparks" | "smoke" | "fire" | "dust" | "sparkle" | "splash" | "",
  "change": "break" | "fix" | "fall" | "hide" | "show" | "glow" | "color" | "" (what happens to the thing), "color": "#hex" when change is color,
  "sound": one of the SOUNDS below (or a new one you add in "sounds") or "",
  "frames": length at 24 per second (24-192), "closeup": true | false,
  "thing": "the thing it is done to (one or two words; design it in \\"things\\" if it is new)"
}
Example: "surf": {"label":"surf on a board","words":["surfing","surfs"],"go":true,"body":"crouch","arms":"up","hold":"","ride":true,"rideDist":14,"effect":"splash","change":"","sound":"splash","frames":120,"closeup":false,"thing":"surfboard"}

ALIASES: the new tag means an EXISTING one, e.g. "sprint": "run", "dive": "swim:river". Existing tags: ${opts.builtin.join(", ")}${opts.custom.length ? `; and my own: ${opts.custom.join(", ")}` : ""}.

SOUNDS that exist: ${opts.sounds.join(", ")}.

OUTFIT = { "top": "tshirt"|"shirt"|"checks"|"kurta"|"jacket"|"police", "topColor": "#hex", "top2Color": "#hex (second colour: checks / jacket inside)",
  "bottom": "jeans"|"trousers"|"shorts"|"shalwar"|"skirt", "bottomColor": "#hex", "hat": "none"|"cap"|"police"|"beanie"|"topi", "hatColor": "#hex",
  "shoes": "sneakers"|"shoes"|"slippers", "shoeColor": "#hex", "add": [any of "glasses","sunglasses","mustache","beard","chain"], "remove": [same] }
LOOK = an OUTFIT plus "skin": one of "#ffffff","#f6d7b8","#e9b98f","#c98c5a","#8d5524","#5c3a21", "hair": "none"|"spiky"|"short"|"side"|"curly"|"long"|"bun", "hairColor": "#hex", "female": true|false.

MODEL (for "things") = exactly the "models" format and MODEL RULES of the world recipe below (parts made of simple shapes, real sizes in metres, front +z, vehicles long along x with the front at +x, 20-60 parts for vehicles and buildings).

WORLD RECIPE (for "places"):
${recipeSpec(opts.library)}

FINAL CHECK before you answer: every key above is in the pack; every "model:<name>" a place uses is ready-made or designed in that place's "models" (or in "things"); the JSON is valid (no comments, no trailing commas).`;
}

