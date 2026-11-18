import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { World } from "@/lib/world/world";
import { autoWorld, TEMPLATES, WORLD_KINDS } from "@/lib/world/auto";
import { CATALOG, CATALOG_BY_TYPE, hasTrait, type ModelDef, newId, TRAITS, type GroundKind, type WorldDoc, type WorldObj } from "@/lib/world/types";
import { parseRecipe, type Recipe, recipePrompt, recipeToWorld } from "@/lib/world/recipe";
import { STARTER } from "@/lib/world/starter";
import { BLUEPRINTS, blueprintFor, buildBlueprint } from "@/lib/world/blueprints";
import { kitsOf, loadKitIndex, preloadKits } from "@/lib/world/kits";
import { getGeminiKey } from "@/lib/gemini";

/** The main colours of a picture (no AI needed): bright, different colours first. */
async function pictureColours(dataUrl: string): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = dataUrl; });
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0, 64, 64);
  const px = g.getImageData(0, 0, 64, 64).data;
  const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!, gg = px[i + 1]!, b = px[i + 2]!;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (mx - mn < 28 || mx < 70) continue; // skip greys / dark (roads, shadows)
    const k = `${r >> 5},${gg >> 5},${b >> 5}`;
    const e = bins.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += gg; e.b += b;
    bins.set(k, e);
  }
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 7).map((e) => `#${hex(e.r / e.n)}${hex(e.g / e.n)}${hex(e.b / e.n)}`);
}

type PicturePlan = { blueprint?: string; name?: string; time?: string; palette?: string[]; density?: number; extra?: string[]; description?: string };
/** A picture → a small JPEG data URL (fast to send, enough for the AI). */
async function shrinkPicture(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = url; });
    const k = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

/**
 * Environment Designer (Story Animator 3D): build your own living 3D
 * worlds. Put trees, rivers, huts, rocks, fruit, animals… anywhere; switch
 * on what every object can do (climbable, fruits fall when shaken, door
 * opens, has fish…); save it with a name. A scene uses it when its place
 * says that name ("# Scene: Mera Jungle — by the river").
 */
type Mode = { kind: "select" } | { kind: "place"; type: string } | { kind: "line"; type: string; pts: [number, number][] } | { kind: "stage" };
type Saved = { name: string; kind: string; objects: number; summary: string };

const GROUNDS: GroundKind[] = ["grass", "jungle", "farm", "sand", "dirt", "snow", "rock", "moon"];
const KINDS_2D = ["jungle", "forest", "park", "farm", "village", "beach", "mountain", "snow", "desert", "plain"];
const CATS = ["Trees & plants", "Water", "Ground & rocks", "Buildings", "Things", "Life", "My things"] as const;
const OPT_LABELS: Record<string, string> = {
  fruits: "Fruits", fish: "Fish", width: "Width (m)", radius: "Size (m)", len: "Length (m)", count: "How many",
  height: "Height (m)", text: "Text", species: "Animal", word: "What is it (word)", lit: "Burning at start",
};

function blankWorld(): WorldDoc {
  return TEMPLATES.find((t) => t.id === "empty")!.make(1);
}
function guessKind(text: string): string {
  const low = text.toLowerCase();
  for (const k of WORLD_KINDS) if (low.includes(k)) return k === "garden" ? "park" : k === "lake" || k === "river" || k === "field" ? "plain" : k === "camp" ? "mountain" : k;
  if (/sea|ocean|island/.test(low)) return "beach";
  if (/woods|pine/.test(low)) return "forest";
  if (/hill|valley/.test(low)) return "mountain";
  return "plain";
}

export function WorldDesigner() {
  const [glError, setGlError] = useState("");
  const [doc, setDoc] = useState<WorldDoc>(() => TEMPLATES[0]!.make(Math.floor(Math.random() * 1000)));
  const [sel, setSel] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "select" });
  const [saved, setSaved] = useState<Saved[]>([]);
  const [msg, setMsg] = useState("");
  const [words, setWords] = useState("");
  const [desc, setDesc] = useState(() => { try { return localStorage.getItem("ytguru-world-desc") ?? ""; } catch { return ""; } });
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lib, setLib] = useState<Record<string, ModelDef>>({});
  const loadLib = async () => {
    let mine: Record<string, ModelDef> = {};
    try { mine = (await (await fetch("/api/worlds/_things")).json()).models ?? {}; } catch { /* none */ }
    setLib({ ...STARTER, ...mine }); // ready-made things + yours
  };
  const [cat, setCat] = useState<(typeof CATS)[number]>("Trees & plants");
  const host = useRef<HTMLDivElement>(null);
  const three = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls;
    hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; world: World | null; ring: THREE.Mesh; stage: THREE.Group;
    linePreview: THREE.Line; n: number; raf: number;
  } | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const selRef = useRef(sel);
  selRef.current = sel;
  const libRef = useRef(lib);
  libRef.current = lib;

  const selected = useMemo(() => doc.objects.find((o) => o.id === sel) ?? null, [doc, sel]);
  const update = (fn: (d: WorldDoc) => WorldDoc) => setDoc((d) => fn(structuredClone(d)));
  const patchObj = (id: string, patch: Partial<WorldObj>) => update((d) => ({ ...d, objects: d.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));

  const loadList = async () => {
    try { setSaved((await (await fetch("/api/worlds")).json()).worlds ?? []); } catch { setSaved([]); }
  };
  useEffect(() => { void loadList(); void loadLib(); }, []);

  // ---------------------------------------------------------- the 3D view
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      // Chrome has switched its 3D off for now (e.g. after a crash): say so, never a blank crashed page
      setGlError("Chrome's 3D is switched off right now (this happens after a 3D crash). Close ALL Chrome windows, open Chrome again, and come back.");
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(0, 9, 16);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, -3);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();
    const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.4);
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(8, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 80 });
    scene.add(hemi, sun);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 40), new THREE.MeshBasicMaterial({ color: 0xfacc15, depthTest: false, transparent: true }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 10; ring.visible = false;
    scene.add(ring);
    // where the characters stand + where the camera looks from
    const stage = new THREE.Group();
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.2), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, depthWrite: false }));
    strip.rotation.x = -Math.PI / 2; strip.position.y = 0.05;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 12), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    arrow.rotation.x = -Math.PI / 2; arrow.position.set(0, 0.4, 3.2);
    const camBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    camBox.position.set(0, 1.6, 6);
    stage.add(strip, arrow, camBox);
    scene.add(stage);
    const linePreview = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x2563eb }));
    linePreview.frustumCulled = false;
    scene.add(linePreview);
    const t = { renderer, scene, camera, controls, hemi, sun, world: null as World | null, ring, stage, linePreview, n: 0, raf: 0 };
    three.current = t;
    const resize = () => {
      const w = el.clientWidth, h = Math.max(380, Math.round(w * 0.56));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = () => {
      t.n++;
      t.world?.update(t.n, { hand: () => false, yawOf: () => 0, walkers: [] });
      const o = t.world?.objects.find((x) => x.o.id === selRef.current);
      ring.visible = !!o;
      if (o) { ring.position.set(o.pos.x, (o.pos.y ?? 0) + 0.06, o.pos.z); ring.scale.setScalar(Math.max(0.5, o.b.radius + 0.3)); }
      renderer.render(scene, camera);
      t.raf = requestAnimationFrame(loop);
    };
    loop();
    // ----- mouse: select / place / drag / draw a river / set the stage
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const toGround = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const p = new THREE.Vector3();
      return ray.ray.intersectPlane(ground, p) ? p : null;
    };
    let drag: { id: string; root: THREE.Object3D; moved: boolean } | null = null;
    let downAt = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
      const m = modeRef.current;
      if (m.kind !== "select" || !t.world) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(t.world.group.children, true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o && !o.userData.objId) o = o.parent;
        if (o) {
          const id = o.userData.objId as string;
          setSel(id);
          const ro = t.world.objects.find((x) => x.o.id === id);
          if (ro && !CATALOG_BY_TYPE.get(ro.o.type)?.line) { drag = { id, root: ro.b.root, moved: false }; controls.enabled = false; }
          return;
        }
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const p = toGround(e);
      if (!p) return;
      drag.moved = true;
      drag.root.position.x = p.x; drag.root.position.z = p.z;
    };
    const onUp = (e: PointerEvent) => {
      controls.enabled = true;
      if (drag) {
        if (drag.moved) { const { x, z } = drag.root.position; const id = drag.id; setDoc((d) => ({ ...d, objects: d.objects.map((o) => (o.id === id ? { ...o, x: +x.toFixed(2), z: +z.toFixed(2) } : o)) })); }
        drag = null;
        return;
      }
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return; // that was the camera turning
      const p = toGround(e);
      if (!p) return;
      const m = modeRef.current;
      if (m.kind === "place" && m.type.startsWith("model:")) {
        const name = m.type.slice(6), def = libRef.current[name];
        if (def) {
          const traits: Record<string, boolean> = {};
          for (const a of def.abilities ?? []) traits[a] = true;
          const o: WorldObj = { id: newId(), type: "model", x: +p.x.toFixed(2), z: +p.z.toFixed(2), rot: 0, scale: 1, opts: { model: name }, traits };
          setDoc((d) => ({ ...d, models: { ...(d.models ?? {}), [name]: def }, objects: [...d.objects, o] }));
          setSel(o.id);
        }
        if (!e.shiftKey) setMode({ kind: "select" });
      } else if (m.kind === "place") {
        const c = CATALOG_BY_TYPE.get(m.type)!;
        const o: WorldObj = { id: newId(), type: m.type, x: +p.x.toFixed(2), z: +p.z.toFixed(2), rot: 0, scale: 1, opts: c.opts ? { ...c.opts } : undefined };
        setDoc((d) => ({ ...d, objects: [...d.objects, o] }));
        setSel(o.id);
        if (!e.shiftKey) setMode({ kind: "select" });
      } else if (m.kind === "line") {
        const pts = [...m.pts, [+p.x.toFixed(2), +p.z.toFixed(2)] as [number, number]];
        setMode({ ...m, pts });
      } else if (m.kind === "stage") {
        setDoc((d) => ({ ...d, stage: { ...d.stage, x: +p.x.toFixed(2), z: +p.z.toFixed(2) } }));
        setMode({ kind: "select" });
      } else if (m.kind === "select") setSel(null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(t.raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerup", onUp);
      t.world?.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      three.current = null;
    };
  }, []);

  // rebuild the world after every change
  useEffect(() => {
    let cancelled = false;
    void (async () => {
    const t = three.current;
    if (!t) return;
    // ready-made models (houses, cars, furniture…) are loaded first — once
    const ids = kitsOf(doc.objects);
    if (ids.length) { setMsg((m) => m || "Loading 3D models…"); await preloadKits(ids); }
    if (cancelled || three.current !== t) return;
    if (t.world) { t.scene.remove(t.world.group); t.world.dispose(); }
    const w = new World({ ...doc, stage: { x: 0, z: 0, rot: 0 } }, { seed: 3 });
    t.world = w;
    t.scene.add(w.group);
    void w.loadIcons();
    const L = w.light;
    t.scene.background = new THREE.Color(L.skyBottom);
    t.scene.fog = new THREE.Fog(L.fog, L.fogNear * 2, L.fogFar * 2);
    t.hemi.color.set(L.hemiSky).lerp(new THREE.Color("#ffffff"), 0.65);
    t.hemi.groundColor.set(L.hemiGround);
    t.hemi.intensity = L.hemi;
    t.sun.color.set(L.sun);
    t.sun.intensity = L.sunI;
    t.stage.position.set(doc.stage.x, 0, doc.stage.z);
    t.stage.rotation.y = doc.stage.rot;
    })();
    return () => { cancelled = true; };
  }, [doc]);

  // river being drawn
  useEffect(() => {
    const t = three.current;
    if (!t) return;
    const pts = mode.kind === "line" ? mode.pts.map(([x, z]) => new THREE.Vector3(x, 0.15, z)) : [];
    t.linePreview.geometry.dispose();
    t.linePreview.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    t.linePreview.visible = pts.length > 1;
  }, [mode]);

  const finishLine = () => {
    if (mode.kind !== "line") return;
    if (mode.pts.length >= 2) {
      const c = CATALOG_BY_TYPE.get(mode.type)!;
      const o: WorldObj = { id: newId(), type: mode.type, x: mode.pts[0]![0], z: mode.pts[0]![1], points: mode.pts, opts: c.opts ? { ...c.opts } : undefined };
      setDoc((d) => ({ ...d, objects: [...d.objects, o] }));
      setSel(o.id);
    }
    setMode({ kind: "select" });
  };
  const pickTool = (type: string) => {
    if (type.startsWith("model:")) { setMode({ kind: "place", type }); return; }
    const c = CATALOG_BY_TYPE.get(type)!;
    setMode(c.line ? { kind: "line", type, pts: [] } : { kind: "place", type });
  };
  const remove = (id: string) => { update((d) => ({ ...d, objects: d.objects.filter((o) => o.id !== id) })); setSel(null); };
  const duplicate = (o: WorldObj) => {
    const c: WorldObj = { ...structuredClone(o), id: newId(), x: o.x + 1.5, z: o.z + 0.5, points: o.points?.map(([x, z]) => [x + 1.5, z + 0.5] as [number, number]) };
    setDoc((d) => ({ ...d, objects: [...d.objects, c] }));
    setSel(c.id);
  };
  const save = async () => {
    const name = doc.name.trim();
    if (name.length < 2) { setMsg("Give your world a name first."); return; }
    try {
      const r = await fetch(`/api/worlds/${encodeURIComponent(name)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });
      if (!r.ok) throw new Error((await r.json()).detail ?? "Save failed");
      setMsg(`✓ Saved "${name}". Use it in a script: # Scene: ${name}`);
      void loadList();
    } catch (e) { setMsg(String((e as Error).message)); }
  };
  const load = async (name: string) => {
    try {
      const d = (await (await fetch(`/api/worlds/${encodeURIComponent(name)}`)).json()) as WorldDoc;
      if (d?.objects) { setDoc({ ...blankWorld(), ...d }); setSel(null); setMsg(`Opened "${name}".`); }
    } catch { setMsg("Could not open it."); }
  };
  const del = async (name: string) => {
    if (!window.confirm(`Delete the world "${name}"?`)) return;
    await fetch(`/api/worlds/${encodeURIComponent(name)}`, { method: "DELETE" });
    void loadList();
  };
  /** A detailed ready-made place (real models) — city, airport, classroom… */
  const fromBlueprint = async (id: string, text: string) => {
    const bp = BLUEPRINTS.find((b) => b.id === id);
    if (!bp) return false;
    setMsg(`Building a detailed ${bp.label}…`);
    await loadKitIndex();
    const d = buildBlueprint(bp, { seed: Math.floor(Math.random() * 1e6), span: 9, words: text || bp.label });
    setDoc({ ...d, name: text.trim().slice(0, 40) || bp.label, recipe: { blueprint: bp.id, words: text } });
    setSel(null);
    setMsg(`✓ Built "${bp.label}" — ${d.objects.length} things from the free model library. 🎲 = a new layout. Then 💾 Save.`);
    return true;
  };
  const generate = () => {
    const bp = blueprintFor(words);
    if (bp) { void fromBlueprint(bp.id, words); return; }
    const kind = guessKind(words);
    const d = autoWorld({ kind, seed: Math.floor(Math.random() * 100000), span: 9, needs: [], location: words });
    setDoc({ ...d, name: words.trim().slice(0, 40) || d.name });
    setSel(null);
  };

  // ---- describe it → a world
  const buildRecipe = (rc: Recipe) => {
    const d = recipeToWorld(rc, Math.floor(Math.random() * 1e6), 9, lib);
    // every newly designed thing goes to "My things" (for every world)
    for (const [name, def] of Object.entries(rc.models ?? {})) {
      if (!def?.parts?.length) continue;
      void fetch(`/api/worlds/_things/${encodeURIComponent(name)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(def) }).then(() => loadLib());
    }
    setDoc(d);
    setSel(null);
    setMsg(`✓ Built "${d.name}" — ${d.objects.length} things. Not right? Press 🎲 for a new layout, or change the words. Then 💾 Save.`);
  };
  const saveDesc = (t: string) => { setDesc(t); try { localStorage.setItem("ytguru-world-desc", t); } catch { /* ignore */ } };
  const copyWorldPrompt = async () => {
    const text = recipePrompt(desc, Object.keys(lib));
    try { await navigator.clipboard.writeText(text); } catch { window.prompt("Copy this prompt:", text); }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };
  // ---- a reference picture → a world like it (user, 2026-11-18)
  const [picture, setPicture] = useState("");
  const [picNote, setPicNote] = useState("");
  const buildFromPlan = async (plan: PicturePlan) => {
    const bp = BLUEPRINTS.find((b) => b.id === plan.blueprint) ?? blueprintFor(`${plan.name ?? ""} ${plan.description ?? ""}`);
    if (!bp) { setMsg("Could not tell what kind of place that is — pick one from 'Open / start from…'."); return; }
    setMsg(`Building a detailed ${bp.label} like your picture…`);
    await loadKitIndex();
    const words = `${plan.name ?? ""} ${plan.description ?? ""}`;
    const t = plan.time === "night" || plan.time === "sunset" ? plan.time : "day";
    const d = buildBlueprint(bp, { seed: Math.floor(Math.random() * 1e6), span: 9, words, palette: plan.palette, density: Number(plan.density) || 1, time: t, extra: plan.extra });
    setDoc({ ...d, name: (plan.name ?? bp.label).slice(0, 40), recipe: { blueprint: bp.id, words } });
    setSel(null);
    setMsg(`✓ Built "${plan.name ?? bp.label}" from your picture — ${d.objects.length} things. 🎲 = a new layout. Then 💾 Save.`);
  };
  const buildFromPicture = async () => {
    if (!picture) { setMsg("Choose a picture first."); return; }
    setBusy(true); setMsg("The free picture AI is looking at your picture… (up to a minute)");
    try {
      const r = await fetch("/api/worlds/from_image", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: picture, note: picNote, gemini_key: getGeminiKey(), places: BLUEPRINTS.map((b) => ({ id: b.id, label: b.label })) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail ?? "The picture AI did not answer.");
      await buildFromPlan(j.plan as PicturePlan);
    } catch (e) {
      // no AI today: still build it — your picture's own colours, the place your words (or the note) say
      const palette = await pictureColours(picture).catch(() => [] as string[]);
      const guess = blueprintFor(`${picNote} ${desc}`) ?? BLUEPRINTS.find((b) => b.id === "city")!;
      await buildFromPlan({ blueprint: guess.id, name: guess.label, palette, density: 1.3 });
      setMsg(`⚠ The picture AI did not answer (${String((e as Error).message).slice(0, 220)}). So I built a ${guess.label} in your picture's colours. Wrong place type? Write it in the note box (e.g. "airport") and press again — or use 📋 Picture prompt for ChatGPT.`);
    } finally { setBusy(false); }
  };
  const copyPicturePrompt = async () => {
    const r = await fetch("/api/worlds/image_prompt", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: picNote, places: BLUEPRINTS.map((b) => ({ id: b.id, label: b.label })) }) });
    const text = String((await r.json()).prompt ?? "");
    try { await navigator.clipboard.writeText(text); } catch { window.prompt("Copy this prompt:", text); }
    setMsg("✓ Copied. In ChatGPT / Gemini: attach your picture, paste this, then paste the answer in the box below and press 🏗 Build.");
  };
  const buildFromAnswer = () => {
    // an answer about a PICTURE (it names a place type)
    try {
      const m = answer.match(/\{[\s\S]*\}/);
      const j = m ? JSON.parse(m[0]) as PicturePlan : null;
      if (j && typeof j.blueprint === "string" && !("things" in (j as object))) { void buildFromPlan(j); return; }
    } catch { /* a normal recipe */ }
    const rc = parseRecipe(answer);
    if (!rc) { setMsg("That answer has no recipe in it. Paste ChatGPT's whole reply (the part inside the code block)."); return; }
    buildRecipe(rc);
  };
  const buildWithAi = async () => {
    if (desc.trim().length < 10) { setMsg("Write your description first."); return; }
    // a place we know well (a city, an airport, a classroom…): the detailed ready-made one, at once
    const known = blueprintFor(desc);
    if (known && !/\b(ai|design|custom)\b/i.test(desc)) { await fromBlueprint(known.id, desc); return; }
    setBusy(true); setMsg("The free AI is reading your description… (up to a minute)");
    try {
      const r = await fetch("/api/worlds/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: recipePrompt(desc, Object.keys(lib)) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail ?? "The free AI did not answer.");
      const rc = parseRecipe(String(j.text ?? ""));
      if (!rc) throw new Error("The free AI answered without a recipe — try again, or use ChatGPT.");
      setAnswer(JSON.stringify(rc, null, 1));
      buildRecipe(rc);
    } catch (e) { setMsg(String((e as Error).message)); }
    setBusy(false);
  };
  const variant = () => {
    const rc = doc.recipe as (Recipe & { blueprint?: string; words?: string }) | undefined;
    if (!rc) return;
    if (rc.blueprint) { const nm = doc.name; void fromBlueprint(rc.blueprint, rc.words ?? "").then(() => setDoc((d) => ({ ...d, name: nm }))); return; }
    buildRecipe({ ...rc, name: doc.name });
  };

  const cItem = selected ? CATALOG_BY_TYPE.get(selected.type) : null;
  const optKeys = cItem?.opts ? Object.keys(cItem.opts) : [];

  return (
    <div className="glass space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <div className="text-lg font-semibold">🌍 Environment Designer</div>
          <div className="text-xs text-muted-foreground">Build a living 3D world. Click an object type, then click the ground. Drag to move. Every object's abilities are on the right.</div>
        </div>
        <input className="field w-56" placeholder="World name (e.g. Mera Jungle)" value={doc.name} onChange={(e) => setDoc((d) => ({ ...d, name: e.target.value }))} />
        <button className="btn btn-primary" onClick={() => void save()}>💾 Save world</button>
      </div>
      <div className="space-y-2 rounded-xl border border-primary/40 p-3">
        <div className="text-sm font-medium">📝 Describe your world — in your own words (Urdu / English, as long as you like)</div>
        <textarea className="field h-28 w-full text-sm" value={desc} onChange={(e) => saveDesc(e.target.value)}
          placeholder="Ek pahari ilaqa jis mein nadiyan behti hain, sardi ka mausam hai, nadi ke ek kinare ducks tair rahi hain, nadi mein kashtiyan chal rahi hain jin ko mallah chala rahe hain, sher, bandar aur doosre janwar nadi ke idhar udhar khel rahe hain…" />
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void buildWithAi()}>{busy ? "⏳ Building…" : "✨ Build it (free AI)"}</button>
          <span className="text-xs text-muted-foreground">or</span>
          <button className="btn btn-secondary btn-sm" onClick={() => void copyWorldPrompt()}>{copied ? "✓ Prompt copied — paste it in ChatGPT" : "📋 Copy prompt for ChatGPT"}</button>
          {!!doc.recipe && <button className="btn btn-secondary btn-sm" onClick={variant}>🎲 New layout (same description)</button>}
          {!!doc.recipe && (
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!doc.fresh} onChange={(e) => setDoc((d) => ({ ...d, fresh: e.target.checked }))} /> New layout in every video</label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary/5 p-2">
          <span className="text-sm font-medium">🖼 Or from a picture:</span>
          <input type="file" accept="image/*" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) void shrinkPicture(f).then(setPicture); }} />
          {picture && <img src={picture} alt="" className="h-12 rounded" />}
          <input className="field min-w-40 flex-1 text-xs" value={picNote} onChange={(e) => setPicNote(e.target.value)} placeholder="(optional) what you want from it: the colourful houses, more shops…" />
          <button className="btn btn-primary btn-sm" disabled={busy || !picture} onClick={() => void buildFromPicture()}>{busy ? "⏳…" : "🖼 Build like this picture"}</button>
          <button className="btn btn-secondary btn-sm" onClick={() => void copyPicturePrompt()}>📋 Picture prompt for ChatGPT</button>
        </div>
        <textarea className="field h-16 w-full font-mono text-xs" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Paste ChatGPT's answer (the world recipe) here…" />
        <button className="btn btn-secondary btn-sm" disabled={!answer.trim()} onClick={buildFromAnswer}>🏗 Build from ChatGPT's answer</button>
      </div>
      {msg && <div className="text-sm">{msg}</div>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select className="field w-44" value="" onChange={(e) => {
          const v = e.target.value;
          if (v.startsWith("saved:")) { void load(v.slice(6)); return; }
          if (v.startsWith("bp:")) { void fromBlueprint(v.slice(3), ""); return; }
          const t = TEMPLATES.find((x) => x.id === v); if (t) { setDoc({ ...t.make(Math.floor(Math.random() * 100000)), name: doc.name }); setSel(null); }
        }}>
          <option value="">Open / start from…</option>
          {saved.length > 0 && (
            <optgroup label="💾 Your saved worlds">
              {saved.map((w) => <option key={w.name} value={`saved:${w.name}`}>{w.name}</option>)}
            </optgroup>
          )}
          <optgroup label="🏙 Ready-made detailed places">
            {BLUEPRINTS.map((b) => <option key={b.id} value={`bp:${b.id}`}>{b.inside ? "🏠" : "🏙"} {b.label}</option>)}
          </optgroup>
          <optgroup label="Templates">
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </optgroup>
        </select>
        <input className="field flex-1" placeholder="…or describe it: a village by the river with mango trees and a hut" value={words} onChange={(e) => setWords(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") generate(); }} />
        <button className="btn btn-secondary btn-sm" onClick={generate}>✨ Make it</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_260px]">
        {/* left: what to add */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {CATS.map((c) => <button key={c} className={`btn btn-sm ${cat === c ? "btn-primary" : "btn-ghost"}`} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {cat === "My things" && Object.keys(lib).length === 0 && <div className="col-span-2 text-xs text-muted-foreground">Things the AI designs for you (a train, a clock tower…) appear here, ready for every world.</div>}
            {cat === "My things" && Object.entries(lib).map(([name, def]) => {
              const on = mode.kind === "place" && mode.type === `model:${name}`;
              return (
                <div key={name} className={`flex items-center rounded-lg border p-1 text-xs ${on ? "border-primary bg-primary/10" : "border-border bg-white/70"}`}>
                  <button className="flex-1 truncate text-left" title={def.label ?? name} onClick={() => pickTool(`model:${name}`)}>🧩 {name}</button>
                  {!(name in STARTER) && <button className="text-red-600" title="Delete from My things" onClick={() => { if (window.confirm(`Delete "${name}" from My things?`)) void fetch(`/api/worlds/_things/${encodeURIComponent(name)}`, { method: "DELETE" }).then(() => loadLib()); }}>✕</button>}
                </div>
              );
            })}
            {CATALOG.filter((c) => c.cat === cat && c.type !== "model").map((c) => {
              const on = (mode.kind === "place" || mode.kind === "line") && mode.type === c.type;
              return (
                <button key={c.type} className={`rounded-lg border p-1 text-left text-xs ${on ? "border-primary bg-primary/10" : "border-border bg-white/70"}`} onClick={() => pickTool(c.type)} title={c.label}>
                  <span className="text-lg">{c.icon}</span> {c.label}
                </button>
              );
            })}
          </div>
          {mode.kind === "place" && <div className="text-xs">Click the ground to put a <b>{mode.type.startsWith("model:") ? mode.type.slice(6) : CATALOG_BY_TYPE.get(mode.type)?.label}</b> (hold Shift to put many). <button className="underline" onClick={() => setMode({ kind: "select" })}>Cancel</button></div>}
          {mode.kind === "line" && (
            <div className="space-y-1 text-xs">
              Click along the ground to draw the {CATALOG_BY_TYPE.get(mode.type)?.label.toLowerCase()} ({mode.pts.length} points).
              <div className="flex gap-1"><button className="btn btn-primary btn-sm" onClick={finishLine}>✓ Done</button><button className="btn btn-ghost btn-sm" onClick={() => setMode({ kind: "select" })}>Cancel</button></div>
            </div>
          )}
          <div className="rounded-xl border border-border p-2">
            <div className="mb-1 text-xs font-medium">In this world ({doc.objects.length})</div>
            <div className="max-h-56 space-y-0.5 overflow-auto text-xs">
              {doc.objects.map((o) => (
                <button key={o.id} className={`block w-full truncate rounded px-1 text-left ${o.id === sel ? "bg-primary/15" : "hover:bg-black/5"}`} onClick={() => setSel(o.id)}>
                  {CATALOG_BY_TYPE.get(o.type)?.icon} {o.name || (o.type === "model" ? String(o.opts?.model ?? "") : o.type === "item" ? String(o.opts?.word ?? "") : CATALOG_BY_TYPE.get(o.type)?.label)}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border p-2">
            <div className="mb-1 text-xs font-medium">Your saved worlds</div>
            {saved.length === 0 && <div className="text-xs text-muted-foreground">None yet.</div>}
            {saved.map((w) => (
              <div key={w.name} className="flex items-center gap-1 text-xs">
                <button className="flex-1 truncate text-left underline" title={w.summary} onClick={() => void load(w.name)}>{w.name}</button>
                <button className="text-red-600" onClick={() => void del(w.name)}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* the 3D view */}
        <div>
          {glError && <p className="rounded-xl border border-destructive p-4 text-sm text-destructive">{glError}</p>}
          <div ref={host} className="overflow-hidden rounded-xl border border-border" />
          <div className="mt-1 text-xs text-muted-foreground">Left-drag: turn · Right-drag: slide · Wheel: zoom · The blue strip is where the characters stand; the dark box is the camera.</div>
        </div>

        {/* right: the world / the selected object */}
        <div className="space-y-3 text-sm">
          {!selected && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="font-medium">The world</div>
              <label className="block text-xs">Ground<select className="field w-full" value={doc.ground} onChange={(e) => setDoc((d) => ({ ...d, ground: e.target.value as GroundKind }))}>{GROUNDS.map((g) => <option key={g}>{g}</option>)}</select></label>
              <label className="block text-xs">Time<select className="field w-full" value={doc.time} onChange={(e) => setDoc((d) => ({ ...d, time: e.target.value as WorldDoc["time"] }))}><option>day</option><option>sunset</option><option>night</option></select></label>
              <label className="block text-xs">Weather<select className="field w-full" value={doc.weather ?? ""} onChange={(e) => setDoc((d) => ({ ...d, weather: e.target.value as WorldDoc["weather"] }))}><option value="">clear</option><option value="rain">rain</option><option value="snow">snow</option></select></label>
              <label className="block text-xs">Wind {Math.round(doc.wind * 100)}%<input type="range" min={0} max={1} step={0.05} className="w-full" value={doc.wind} onChange={(e) => setDoc((d) => ({ ...d, wind: +e.target.value }))} /></label>
              <label className="block text-xs">Grass {Math.round((doc.grass ?? 1) * 100)}%<input type="range" min={0} max={1.5} step={0.1} className="w-full" value={doc.grass ?? 1} onChange={(e) => setDoc((d) => ({ ...d, grass: +e.target.value }))} /></label>
              <label className="block text-xs">2D tool draws it as<select className="field w-full" value={doc.kind ?? "plain"} onChange={(e) => setDoc((d) => ({ ...d, kind: e.target.value }))}>{KINDS_2D.map((k) => <option key={k}>{k}</option>)}</select></label>
              <div className="text-xs font-medium">Where the characters stand</div>
              <button className="btn btn-secondary btn-sm w-full" onClick={() => setMode({ kind: "stage" })}>{mode.kind === "stage" ? "Click the ground…" : "📍 Move the stage"}</button>
              <label className="block text-xs">Camera direction {Math.round((doc.stage.rot * 180) / Math.PI)}°<input type="range" min={-Math.PI} max={Math.PI} step={0.05} className="w-full" value={doc.stage.rot} onChange={(e) => setDoc((d) => ({ ...d, stage: { ...d.stage, rot: +e.target.value } }))} /></label>
            </div>
          )}
          {selected && cItem && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2"><span className="text-2xl">{cItem.icon}</span><div className="font-medium">{cItem.label}</div></div>
              <label className="block text-xs">Its own name (scripts can use it)<input className="field w-full" value={selected.name ?? ""} placeholder={cItem.words[0] ?? ""} onChange={(e) => patchObj(selected.id, { name: e.target.value })} /></label>
              {!cItem.line && (
                <>
                  <label className="block text-xs">Turn {Math.round(((selected.rot ?? 0) * 180) / Math.PI)}°<input type="range" min={-Math.PI} max={Math.PI} step={0.05} className="w-full" value={selected.rot ?? 0} onChange={(e) => patchObj(selected.id, { rot: +e.target.value })} /></label>
                  <label className="block text-xs">Size ×{(selected.scale ?? 1).toFixed(2)}<input type="range" min={0.4} max={2.5} step={0.05} className="w-full" value={selected.scale ?? 1} onChange={(e) => patchObj(selected.id, { scale: +e.target.value })} /></label>
                </>
              )}
              {optKeys.map((k) => {
                const v = selected.opts?.[k] ?? cItem.opts![k];
                const set = (val: string | number | boolean) => patchObj(selected.id, { opts: { ...(selected.opts ?? {}), [k]: val } });
                return (
                  <label key={k} className="block text-xs">{OPT_LABELS[k] ?? k}
                    {typeof v === "boolean" ? <input type="checkbox" className="ml-2" checked={v} onChange={(e) => set(e.target.checked)} />
                      : typeof v === "number" ? <input type="number" className="field w-full" value={v} step={k === "width" || k === "radius" || k === "height" || k === "len" ? 0.5 : 1} onChange={(e) => set(+e.target.value)} />
                        : <input className="field w-full" value={String(v)} onChange={(e) => set(e.target.value)} />}
                  </label>
                );
              })}
              {cItem.traits.length > 0 && <div className="pt-1 text-xs font-medium">What it can do</div>}
              {cItem.traits.map((tid) => {
                const tr = TRAITS.find((x) => x.id === tid)!;
                return (
                  <label key={tid} className="flex items-start gap-2 text-xs" title={tr.help}>
                    <input type="checkbox" checked={hasTrait(selected, tid)} onChange={(e) => patchObj(selected.id, { traits: { ...(selected.traits ?? {}), [tid]: e.target.checked } })} />
                    <span>{tr.label}<span className="block text-[10px] text-muted-foreground">{tr.help}</span></span>
                  </label>
                );
              })}
              <div className="text-[11px] text-muted-foreground">Script words: {[selected.name, ...cItem.words].filter(Boolean).slice(0, 5).join(", ")}</div>
              <div className="flex gap-1 pt-1">
                <button className="btn btn-secondary btn-sm" onClick={() => duplicate(selected)}>⧉ Copy</button>
                <button className="btn btn-ghost btn-sm text-red-600" onClick={() => remove(selected.id)}>🗑 Delete</button>
                <button className="btn btn-ghost btn-sm ml-auto" onClick={() => setSel(null)}>Done</button>
              </div>
            </div>
          )}
          <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
            Use it in a script: <b># Scene: {doc.name || "World name"}</b>, then actions like
            {" "}<code>{"{climb:mango tree}"}</code> <code>{"{pick:mango}"}</code> <code>{"{swim:river}"}</code> <code>{"{enter:hut}"}</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
