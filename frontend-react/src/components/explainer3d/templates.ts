// Template registry for the 3D Explainer — mirrors the backend
// schema (backend /api/3d/projects shots). The route page builds its
// param editors / shot defaults from TEMPLATES; scene.ts reads the
// same Shot shape. Keep keys in sync with the backend template list.

export type ParamKind = "text" | "number" | "url" | "select" | "color";

export interface ParamDef {
  key: string;
  label: string;
  kind: ParamKind;
  def: string | number;
  options?: string[]; // for kind === "select"
}

export interface ShotLabel {
  text: string;
  /** Anchor in scene space [x,y,z], or a named anchor on a model (hero/cutaway). */
  anchor?: [number, number, number] | string;
  lat?: number;
  lon?: number;
  t0?: number; // seconds: fade/slide in (default 0)
  t1?: number; // seconds: fade out (default = shot end)
}

export interface ShotCard {
  value: string;
  unit: string;
  sub?: string;
  t0?: number;
  t1?: number;
}

export interface CameraSpec {
  mode?: "flyTo" | "orbit" | "dolly" | "glide" | "static";
  lat?: number;
  lon?: number;
  zoom?: number; // 1 = default framing, >1 = closer
  from?: [number, number, number];
  to?: [number, number, number];
  lookAt?: [number, number, number];
}

export interface Shot {
  id: string;
  template: string;
  duration: number; // seconds
  narration: string;
  say?: string; // optional spoken override (defaults to narration)
  params: Record<string, string | number | unknown>;
  labels: ShotLabel[];
  cards: ShotCard[];
  camera?: CameraSpec;
  transition_in?: string; // e.g. "fade" | "cut" | "dissolve"
}

export interface TemplateDef {
  title: string;
  blurb: string;
  params: ParamDef[];
}

export const TEMPLATES: Record<string, TemplateDef> = {
  globe: {
    title: "Spinning Globe",
    blurb: "Earth with routes, pins, labels and highlighted countries — for anything global.",
    params: [
      { key: "textureUrl", label: "Day texture (optional)", kind: "url", def: "" },
      { key: "textureUrlNight", label: "Night lights texture (optional)", kind: "url", def: "" },
      { key: "countriesUrl", label: "Countries GeoJSON (optional)", kind: "url", def: "" },
      { key: "highlightCountries", label: "Countries to highlight (comma names)", kind: "text", def: "" },
      { key: "lat", label: "Fly-to latitude", kind: "number", def: 20 },
      { key: "lon", label: "Fly-to longitude", kind: "number", def: 30 },
      { key: "zoom", label: "Fly-to zoom (1 = whole earth)", kind: "number", def: 1.6 },
      { key: "spinSpeed", label: "Spin speed", kind: "number", def: 0.05 },
    ],
  },
  map_zoom: {
    title: "Map Zoom",
    blurb: "Start on the globe and dive down onto a flat map, framed on one place.",
    params: [
      { key: "textureUrl", label: "Map texture (optional)", kind: "url", def: "" },
      { key: "lat", label: "Target latitude", kind: "number", def: 31.5 },
      { key: "lon", label: "Target longitude", kind: "number", def: 74.3 },
      { key: "place", label: "Place name", kind: "text", def: "" },
    ],
  },
  hero_object: {
    title: "Hero Object",
    blurb: "One product/object on a clean stage, camera orbiting it, labels pointing at its parts.",
    params: [
      { key: "model", label: "Model", kind: "select", def: "phone", options: ["phone", "chip", "ship", "box", "cable", "server"] },
      { key: "modelUrl", label: "GLB/GLTF model URL (optional)", kind: "url", def: "" },
      { key: "color", label: "Body colour", kind: "color", def: "#35c4ff" },
      { key: "orbit", label: "Orbit amount (0–1)", kind: "number", def: 0.6 },
    ],
  },
  cutaway: {
    title: "Cutaway / Exploded View",
    blurb: "A model split into named layers that slide apart, hold, and close again.",
    params: [
      { key: "model", label: "Model", kind: "select", def: "cable", options: ["cable", "phone", "ship", "chip", "server"] },
      { key: "parts", label: "Part names (comma separated)", kind: "text", def: "" },
      { key: "explode", label: "Explode amount (0–1)", kind: "number", def: 1 },
    ],
  },
  macro_flyover: {
    title: "Macro Flyover",
    blurb: "Skim low over a circuit board while a glowing data packet races along the traces.",
    params: [
      { key: "boardColor", label: "Board colour", kind: "color", def: "#0b3d2e" },
      { key: "speed", label: "Flight speed", kind: "number", def: 1 },
    ],
  },
  underwater: {
    title: "Underwater",
    blurb: "Seabed with light rays, rocks, fish — and a cable with repeater boxes along it.",
    params: [
      { key: "depth", label: "Depth feel (fog, 0–1)", kind: "number", def: 0.6 },
      { key: "fish", label: "Fish count", kind: "number", def: 7 },
      { key: "repeaters", label: "Repeater boxes on the cable", kind: "number", def: 4 },
    ],
  },
  city_aerial: {
    title: "City Aerial",
    blurb: "Glide over a glowing low-poly city with data arcs jumping between rooftops.",
    params: [
      { key: "blocks", label: "City blocks across", kind: "number", def: 9 },
      { key: "night", label: "Night look (0/1)", kind: "number", def: 1 },
    ],
  },
  data_card: {
    title: "Data Card",
    blurb: "A full-frame stat moment: one big number on the shared card style, nothing else competing.",
    params: [
      { key: "title", label: "Title card text (optional)", kind: "text", def: "" },
      { key: "value", label: "Big value", kind: "text", def: "98%" },
      { key: "unit", label: "Unit / line under the value", kind: "text", def: "" },
      { key: "sub", label: "Small print (optional)", kind: "text", def: "" },
    ],
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES);

let shotCounter = 0;

/** A new shot for `template` with every param at its registry default. */
export function makeShot(template: string, partial: Partial<Shot> = {}): Shot {
  const def = TEMPLATES[template] ?? TEMPLATES.globe;
  const params: Record<string, unknown> = {};
  for (const p of def.params) params[p.key] = p.def;
  shotCounter += 1;
  const { params: partialParams, ...rest } = partial;
  return {
    id: `shot-${Date.now().toString(36)}-${shotCounter}`,
    template,
    duration: 6,
    narration: "",
    labels: [],
    cards: [],
    transition_in: "fade",
    ...rest,
    params: { ...params, ...(partialParams ?? {}) },
  };
}

// One hand-written example per template — used by the page's
// "Insert example" affordance and as living documentation of the
// shot JSON the shot-prompt is expected to return.
export const EXAMPLES: Record<string, Shot> = {
  globe: makeShot("globe", {
    duration: 8,
    narration: "One cable system now links three continents, carrying most of the world's internet traffic.",
    params: { lat: 25, lon: 55, zoom: 1.8, highlightCountries: "" },
    labels: [
      { text: "Europe", lat: 50, lon: 10, t0: 1 },
      { text: "Middle East hub", lat: 25, lon: 55, t0: 2 },
      { text: "South Asia", lat: 21, lon: 78, t0: 3 },
    ],
    cards: [{ value: "99%", unit: "of intercontinental data travels under the sea", t0: 4 }],
  }),
  map_zoom: makeShot("map_zoom", {
    duration: 7,
    narration: "It all lands here — one coastal city where a dozen cables come ashore.",
    params: { lat: 19.1, lon: 72.9, place: "Mumbai" },
    labels: [{ text: "Mumbai landing station", lat: 19.1, lon: 72.9, t0: 4 }],
  }),
  hero_object: makeShot("hero_object", {
    duration: 6,
    narration: "This small box repeats the signal, boosting it for the next stretch of ocean.",
    params: { model: "box" },
    labels: [
      { text: "Titanium shell", anchor: "top", t0: 1 },
      { text: "Signal amplifier", anchor: "front", t0: 2.5 },
    ],
  }),
  cutaway: makeShot("cutaway", {
    duration: 8,
    narration: "Inside the cable: layers of steel and plastic protect a hair-thin strand of glass.",
    params: { model: "cable", parts: "Steel armour,Waterproof jacket,Power conductor,Glass fibre core" },
    labels: [
      { text: "Steel armour", anchor: "part-0", t0: 2 },
      { text: "Glass fibre core", anchor: "part-3", t0: 3 },
    ],
  }),
  macro_flyover: makeShot("macro_flyover", {
    duration: 7,
    narration: "On land, your request becomes a pulse of light racing across the network's circuits.",
    labels: [
      { text: "Your request", anchor: [0, 0.4, 3], t0: 0.5 },
      { text: "Switching chip", anchor: [0.8, 0.4, -1], t0: 3.5 },
    ],
  }),
  underwater: makeShot("underwater", {
    duration: 8,
    narration: "On the seabed, in total darkness, the cable lies quietly — carrying everything.",
    params: { fish: 7, repeaters: 4 },
    labels: [{ text: "Fibre-optic cable", anchor: [0, 0.5, 0], t0: 2 }],
    cards: [{ value: "8,000 m", unit: "deep in places — Mount Everest would fit", t0: 4.5 }],
  }),
  city_aerial: makeShot("city_aerial", {
    duration: 7,
    narration: "And in the city, millions of devices wake up and ask the network for data.",
    labels: [{ text: "Data centre", anchor: [0, 2.4, 0], t0: 2.5 }],
    cards: [{ value: "5.4 bn", unit: "people online right now", t0: 4 }],
  }),
  data_card: makeShot("data_card", {
    duration: 5,
    narration: "Ninety-nine percent of everything between continents travels this way.",
    params: { title: "The hidden internet", value: "99%", unit: "of intercontinental traffic", sub: "Source: industry estimates" },
    cards: [{ value: "99%", unit: "of intercontinental traffic", sub: "Source: industry estimates", t0: 0.5 }],
  }),
};
