/**
 * Story Animator 3D — the player. It reads the SAME timeline the backend
 * makes for the 2D tool (who stands where, who talks, every action, the
 * camera shots, pop-ups, extras, effects…) and plays it as a real 3D film:
 * 3D sets, 3D people and animals with skeletons, real lights and shadows,
 * a camera that moves around them. Subtitles, pop-ups, time cards and
 * scene transitions are shared with the 2D player, so the final video is
 * encoded the same way (in the browser) and gets the same sound.
 *
 * Outdoor scenes are LIVING worlds (../world): trees sway, grass bends
 * under feet, rivers flow, and characters really climb trees, pick fruit,
 * swim, chop, open doors… as the script says ({climb:mango tree}…).
 */
import * as THREE from "three";
import { type CharacterConfig, type Emote, emoteSvg, normalizeCharacter } from "../stickman";
import { madeUpSpecies, type Species, speciesFor, vehicleFor } from "../creatures";
import { type Pop, StoryPlayer, type Timeline } from "../player";
import { buildAnimal, buildVehicle, type Creature3D, type Vehicle3D } from "./animal";
import { buildHuman, CHAR_H, type Face, HIP_H, type Human, JOINT_KEYS, type Joints, SEAT_H, targetJoints } from "./human";
import { at, billboard, box, cone, cyl, drawnTexture, puffTexture, sphere, toon } from "./kit";
import { buildPlace, type Place } from "./places";
import { World, loadIconsIn } from "../world/world";
import { autoWorld, extraObjects, missingThings, WORLD_KINDS } from "../world/auto";
import { type Recipe, recipeToWorld } from "../world/recipe";
import { STARTER } from "../world/starter";
import { BLUEPRINTS, blueprintFor, buildBlueprint } from "../world/blueprints";
import { findKit, kitsOf, loadKitIndex, preloadKits } from "../world/kits";
import { Brain, type Body } from "../world/brain";
import { axeMesh, rodMesh } from "../world/catalog";
import type { CustomAction, ModelDef, WorldDoc, WorldObj } from "../world/types";
import { handProp } from "./props";

type Frame = Timeline["frames"][number];
function wrapNear(a: number, ref: number) { while (a - ref > Math.PI) a -= Math.PI * 2; while (a - ref < -Math.PI) a += Math.PI * 2; return a; }
type CharF = Frame["chars"][number];
const NJ = JOINT_KEYS.length;

/** Picture → texture (ImageBitmaps from the 2D player's picture cache). */
function bitmapTexture(img: ImageBitmap): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d")!.drawImage(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type Extra3D = { obj: THREE.Object3D; e: NonNullable<Timeline["extras"]>[number]; animal?: Creature3D; vehicle?: Vehicle3D; len: number };

/** A quiet scene (night, sneaking, hiding): the strangers go home. */
function quietDoc(doc: WorldDoc, quiet?: boolean): WorldDoc {
  if (!quiet) return doc;
  return { ...doc, objects: doc.objects.filter((o) => o.type !== "person" && !/\/(character|person|astronaut|human)/.test(String(o.opts?.kit ?? ""))) };
}

export class StoryPlayer3D extends StoryPlayer {
  private renderer!: THREE.WebGLRenderer;
  private glLost = false; // Chrome took the 3D away (a graphics crash)
  private scene3 = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.4);
  private sun = new THREE.DirectionalLight(0xffffff, 2);
  private places: Place[] = [];
  private humans = new Map<string, Human>();
  private animals = new Map<string, Creature3D>();
  private forms = new Map<string, Creature3D>(); // "cid|frog" -> the body they were turned into
  private magic: { group: THREE.Group; puffs: THREE.Sprite[]; stars: THREE.Mesh[] } | null = null;
  private tracks = new Map<string, Float32Array>(); // joints per frame
  private faces: Map<string, Face>[] = [];
  private camTrack: Float32Array; // per frame: x, y, z, tx, ty, tz
  private extras3: Extra3D[] = [];
  private fx = new THREE.Group();
  private emoteTex = new Map<string, THREE.Texture>();
  private emoteSprites = new Map<string, THREE.Sprite>();
  private propsFx: { ladder: THREE.Group; rope: THREE.Mesh; match: THREE.Group };
  private weather: { rain: THREE.LineSegments; snow: THREE.Points };
  private fires = new Map<string, THREE.Group>();
  private puffs: THREE.Sprite[] = [];
  private hitTex: THREE.Texture[] = [];
  private span: number;
  private pxPerWorld: number;
  private feetY: number;
  private currentScene = -1;
  private configs3: Map<string, CharacterConfig>;
  private tmpV = new THREE.Vector3();
  private worlds: (World | null)[] = [];
  private brain: Brain | null = null;
  private extraF: Map<string, { tool: Body["tool"]; line: Body["line"]; hidden: boolean; ov: boolean; walking: boolean; acting: boolean; prop?: string | null }>[] = [];
  private tools = new Map<string, { axe: THREE.Object3D; rod: THREE.Object3D; match: THREE.Object3D; line: THREE.Line }>();

  constructor(tl: Timeline, configs: Map<string, CharacterConfig>, bgUrl: (i: number) => string) {
    super(tl, configs, bgUrl);
    this.configs3 = configs;
    this.span = tl.width >= tl.height ? 9 : 4.6;
    const u = tl.size[1] / 400;
    this.pxPerWorld = (376 * u) / CHAR_H;
    this.feetY = tl.feetY;
    this.camera = new THREE.PerspectiveCamera(tl.width >= tl.height ? 32 : 48, tl.width / tl.height, 0.1, 400);
    this.camTrack = new Float32Array(tl.frames.length * 6);
    const ladder = new THREE.Group();
    for (const s of [-1, 1]) ladder.add(at(cyl(0.04, 0.04, 3.4, "#b45309", 0.08, 8), s * 0.28, 1.7, 0));
    for (let y = 0.3; y < 3.3; y += 0.38) { const r = box(0.56, 0.05, 0.05, "#b45309", 0.05); r.position.y = y; ladder.add(r); }
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.018, 6, 40), toon("#dc2626"));
    const match = new THREE.Group();
    match.add(at(cyl(0.012, 0.012, 0.18, "#a16207", 0, 6), 0, 0.09, 0), at(cone(0.04, 0.12, "#f97316", 0, 8), 0, 0.22, 0));
    this.propsFx = { ladder, rope, match };
    this.fx.add(ladder, rope, match);
    // rain + snow particles (moved every frame)
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(600 * 6), 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xbcd4ff, transparent: true, opacity: 0.7 }));
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(700 * 3), 3));
    const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07 }));
    rain.frustumCulled = snow.frustumCulled = false;
    this.weather = { rain, snow };
    this.fx.add(rain, snow);
  }

  private toWorldX(x: number) { return (x - 0.5) * this.span; }

  async prepare(onProgress?: (msg: string) => void) {
    const tl = this.tl;
    onProgress?.("Building the 3D world…");
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.W, this.H, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.sun.castShadow = true;
    // lighter on the graphics card for long films and Reels (user, 2026-11-18: Chrome's 3D crashed on a Reel)
    const heavy = this.H > this.W || tl.frames.length > tl.fps * 240;
    this.sun.shadow.mapSize.set(heavy ? 1024 : 2048, heavy ? 1024 : 2048);
    this.renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.glLost = true; });
    Object.assign(this.sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -6, near: 1, far: 60 });
    this.scene3.add(this.hemi, this.sun, this.sun.target, this.fx);
    // the sets: a living 3D world for outdoor places, a 3D set for rooms
    const castSpecies = (tl.auto_chars ?? []).map((a) => a.species).filter(Boolean);
    await loadKitIndex(); // the free ready-made 3D models (houses, cars, furniture…)
    if (tl.layouts.some((l) => (l.props ?? []).some((p) => p.type === "bed"))) await preloadKits(["furniture-kit/bedsingle"]);
    for (let i = 0; i < tl.scenes; i++) {
      const layout = tl.layouts[i] ?? { kind: "plain", props: [], seed: i + 1 };
      const kind = layout.kind as string;
      const seed = layout.seed ?? i + 1;
      let world: World | null = null;
      const sceneWords = `${layout.location ?? ""} ${layout.name ?? ""}`;
      // a saved world only when you named / chose it, or when no ready-made place fits these words
      if (layout.world && !layout.blueprint && (layout.world_exact || !blueprintFor(sceneWords, kind))) {
        try {
          let doc = (await (await fetch(`/api/worlds/${encodeURIComponent(layout.world)}`)).json()) as WorldDoc;
          // "new layout in every video": the same description, built fresh
          const bpr = doc?.recipe as { blueprint?: string; words?: string } | undefined;
          const bpSaved = bpr?.blueprint ? BLUEPRINTS.find((b) => b.id === bpr.blueprint) : undefined;
          if (doc?.fresh && bpSaved) {
            doc = { ...buildBlueprint(bpSaved, { seed: seed * 31 + (tl.frames.length % 997), span: this.span, words: bpr?.words ?? "" }), name: doc.name };
          } else if (doc?.fresh && doc.recipe) {
            let lib: Record<string, ModelDef> = {};
            try { lib = (await (await fetch("/api/worlds/_things")).json()).models ?? {}; } catch { /* none */ }
            doc = { ...recipeToWorld(doc.recipe as Recipe, seed * 31 + (tl.frames.length % 997), this.span, { ...lib, ...(doc.models ?? {}) }), name: doc.name };
          }
          if (doc?.objects) {
            await preloadKits(kitsOf(doc.objects), (d, t) => onProgress?.(`Loading 3D models for "${doc.name}"… ${d} of ${t}`));
            world = new World(this.withSeats(doc, layout.props ?? [], kind), { seed });
          }
        } catch { /* fall back to an automatic world */ }
      }
      // the place the story talks about, built from a blueprint (a city street, an airport, a
      // classroom…) with real models — unless it is a nature place our own worlds do best
      if (!world) {
        const words = sceneWords;
        const bp = layout.blueprint ? BLUEPRINTS.find((b) => b.id === layout.blueprint) ?? null : blueprintFor(words, kind);
        if (bp) {
          const doc = quietDoc(buildBlueprint(bp, { seed, span: this.span, words, night: layout.night, weather: layout.weather }), layout.quiet);
          onProgress?.(`Building "${bp.label}" (scene ${i + 1})…`);
          await preloadKits(kitsOf(doc.objects), (d, t) => onProgress?.(`Loading 3D models for "${bp.label}"… ${d} of ${t}`));
          world = new World(this.withSeats(doc, layout.props ?? [], kind), { seed });
        }
      }
      if (!world && (WORLD_KINDS.has(kind) || (kind === "custom" && layout.outdoor))) {
        const doc = quietDoc(autoWorld({ kind: kind === "custom" ? "plain" : kind, seed, needs: layout.need ?? [], span: this.span, night: layout.night, weather: layout.weather, avoid: castSpecies, location: layout.location }), layout.quiet);
        world = new World(this.withSeats(doc, layout.props ?? [], kind), { seed });
      }
      // what the script uses but this world does not have yet (a mango, a clock…): add it
      if (world && !world.bare && (layout.need ?? []).length) {
        const w0 = world;
        // "the jar is on the top shelf", "the empty jar on the table": put it right there (user, 2026-11-18)
        const placed: WorldObj[] = [];
        const onDone = new Set<string>();
        for (const nd of layout.need ?? []) {
          if (!nd.on || onDone.has(nd.word)) continue;
          const floor = /^(floor|ground)$/.test(nd.on);
          const ro = floor ? null : w0.named(nd.on);
          if (!floor && !ro) continue;
          onDone.add(nd.word);
          let x = 0.9, z = 0.9, y = 0;
          if (ro) {
            ro.b.root.updateMatrixWorld(true);
            const bx = new THREE.Box3().setFromObject(ro.b.root);
            x = ro.o.x; z = ro.o.z; y = Math.max(0, bx.max.y) + 0.01;
          }
          const item = { id: `on-${seed}-${placed.length}`, type: "item", x, z, rot: 0, opts: { word: nd.word, size: 0.42, y, edible: false }, traits: { pickable: true } } as unknown as WorldObj;
          placed.push(ro ? item : this.toDocSpace(w0.doc, item));
        }
        const miss = missingThings((layout.need ?? []).filter((nd) => !onDone.has(nd.word)), (wd) => w0.has(wd), this.span, seed);
        if (miss.objects.length || placed.length) {
          await preloadKits(kitsOf(miss.objects));
          const doc = { ...w0.doc, stage: w0.doc.stage, objects: [...w0.doc.objects, ...placed, ...miss.objects.map((o) => this.toDocSpace(w0.doc, o))], models: { ...(w0.doc.models ?? {}), ...miss.models } };
          world = new World(doc, { seed });
        }
      }
      let p: Place;
      if (world) {
        p = { group: world.group, light: world.light, update: () => {}, seatY: SEAT_H, bedY: 0.62 };
      } else {
        p = buildPlace(layout, this.span);
        const ex = extraObjects(layout.need ?? [], kind, this.span, seed);
        if (ex) { world = new World(ex, { bare: true, seed }); p.group.add(world.group); }
      }
      p.group.visible = false;
      this.scene3.add(p.group);
      this.places.push(p);
      this.worlds.push(world);
      if (world) await world.loadIcons();
      // your own background picture: a big backdrop behind the set
      if (layout.image) {
        try {
          const img = await new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `/api/assets/file/${encodeURIComponent(layout.image!)}`; });
          const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
          const h = 14, w = h * (img.width / img.height);
          const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
          plane.position.set(0, h / 2 - h * (1 - (layout.floor ?? 0.82)), -9);
          p.group.add(plane);
        } catch { /* skip */ }
      }
      onProgress?.(`Building the 3D world… ${i + 1} of ${tl.scenes}`);
    }
    // the cast
    onProgress?.("Building the characters…");
    const cids = new Set<string>();
    for (const f of tl.frames) for (const c of f.chars) cids.add(c.cid);
    for (const cid of cids) {
      const sp = this.creatureOf(cid);
      if (sp) {
        const a = buildAnimal(sp);
        a.root.visible = false;
        this.scene3.add(a.root);
        this.animals.set(cid, a);
      } else {
        const cfg = this.configs3.get(cid);
        if (!cfg) continue;
        const h = buildHuman(normalizeCharacter(cfg));
        h.root.visible = false;
        h.root.traverse((o) => { o.castShadow = !o.userData.outline; });
        this.scene3.add(h.root);
        this.humans.set(cid, h);
      }
    }
    // what magic turns them into (a frog…): built once, shown while they are it
    for (const f of tl.frames) for (const c of f.chars) {
      for (const form of [c.form, c.morph?.to, c.morph?.was]) {
        if (!form || this.forms.has(`${c.cid}|${form}`)) continue;
        const a = buildAnimal(speciesFor(form) ?? madeUpSpecies(form));
        // a magic frog is a cartoon frog: big enough to read on screen (half a person at least)
        a.root.userData.formScale = Math.min(2.6, Math.max(1, (CHAR_H * 0.5) / a.height));
        a.height *= a.root.userData.formScale as number;
        a.root.visible = false;
        a.root.traverse((o) => { o.castShadow = !o.userData.outline; });
        this.scene3.add(a.root);
        this.forms.set(`${c.cid}|${form}`, a);
      }
    }
    // things still in a hand from an earlier scene (the cookie jar…): made and pictured now
    for (const f of tl.frames) for (const c of f.chars) {
      const h = c.hand ? this.humans.get(c.cid) : undefined;
      if (!h || !c.hand) continue;
      const k = findKit(c.hand);
      if (k) await preloadKits([k.id]);
      this.prop3(c.cid, h, c.hand);
    }
    for (const m of this.props.values()) for (const g of m.values()) { g.visible = false; await loadIconsIn(g); }
    this.buildMagic();
    // pictures for pop-ups and extras (shared with 2D)
    await this.preparePictures();
    this.buildExtras();
    this.buildEffects();
    for (const name of ["idea", "question", "exclaim", "zzz", "love", "dizzy", "angry"] as Emote[]) {
      for (const fr of [0, 1]) {
        const svg = emoteSvg(name, fr);
        const img = new Image();
        await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
        const t = drawnTexture(160, 160, (x) => x.drawImage(img, 0, 0, 160, 160));
        this.emoteTex.set(`${name}|${fr}`, t);
      }
    }
    this.tl.frames.forEach((f, n) => { const w = this.worlds[f.scene]; if (w && (n === 0 || this.tl.frames[n - 1]!.scene !== f.scene)) w.n0 = n; if (w) w.n1 = n; });
    onProgress?.("Rehearsing the acting…");
    this.brain = new Brain(this.worlds, (cid) => this.animals.has(cid), (tl as { actions?: Record<string, CustomAction> }).actions ?? {});
    this.computeTracks3();
  }

  /** A spot given around the characters (scene space) → the world file's own space. */
  private toDocSpace(doc: WorldDoc, o: WorldObj): WorldObj {
    const st = doc.stage ?? { x: 0, z: 0, rot: 0 };
    return { ...o, x: st.x + o.x * Math.cos(st.rot) + o.z * Math.sin(st.rot), z: st.z - o.x * Math.sin(st.rot) + o.z * Math.cos(st.rot), rot: (o.rot ?? 0) + st.rot };
  }

  /** Seats the 2D director asked for (characters sitting) as logs / benches in a world. */
  private withSeats(doc: WorldDoc, props: { type: string; x: number; x2?: number }[], kind: string): WorldDoc {
    const st = doc.stage ?? { x: 0, z: 0, rot: 0 };
    const toDoc = (x: number, z: number) => ({ x: st.x + x * Math.cos(st.rot) + z * Math.sin(st.rot), z: st.z - x * Math.sin(st.rot) + z * Math.cos(st.rot) });
    const nature = ["jungle", "forest", "mountain", "beach", "snow", "desert", "plain", "custom"].includes(kind) || doc.ground === "jungle";
    const extra: WorldObj[] = [];
    props.forEach((p, i) => {
      if (p.type === "bed" && doc.room) {
        // sitting in a bedroom = sitting on the edge of a bed (user, 2026-11-18: they sat on air)
        const x1 = (p.x - 0.5) * this.span, x2 = ((p.x2 ?? p.x) - 0.5) * this.span;
        const n = Math.max(1, Math.round((Math.abs(x2 - x1) + 0.9) / 2.1));
        for (let k = 0; k < n; k++) {
          const bx = n === 1 ? (x1 + x2) / 2 : Math.min(x1, x2) + (Math.abs(x2 - x1) * k) / (n - 1);
          const c = toDoc(bx, -0.6);
          extra.push({ id: `seat-bed-${i}-${k}`, type: "kit", x: c.x, z: c.z, rot: st.rot + Math.PI / 2, opts: { kit: "furniture-kit/bedsingle" }, traits: { sittable: true, solid: false } } as WorldObj);
        }
        return;
      }
      if (!["bench", "sofa", "chair"].includes(p.type)) return;
      const x1 = (p.x - 0.5) * this.span, x2 = ((p.x2 ?? p.x) - 0.5) * this.span;
      const c = toDoc((x1 + x2) / 2, -0.12);
      const len = Math.abs(x2 - x1) + 0.9;
      if (doc.room) {
        // inside: real seats (train seats on the move, chairs in a room)
        const nm = doc.room.moving ? "train_seat" : "chair", step = doc.room.moving ? 1.15 : 0.7;
        const n = Math.max(1, Math.round(len / step));
        for (let k = 0; k < n; k++) {
          const cx = toDoc(Math.min(x1, x2) - 0.45 + step / 2 + k * step, -0.12);
          extra.push({ id: `seat-${i}-${k}`, type: "model", x: cx.x, z: cx.z, rot: st.rot, opts: { model: nm }, traits: { sittable: true } });
        }
        return;
      }
      if (nature) extra.push({ id: `seat-${i}`, type: "log", x: c.x, z: c.z, rot: st.rot, opts: { len }, traits: { solid: false } });
      else for (let k = 0; k < Math.max(1, Math.round(len / 1.8)); k++) {
        const cx = toDoc(Math.min(x1, x2) - 0.45 + 0.9 + k * 1.8, -0.12);
        extra.push({ id: `seat-${i}-${k}`, type: "bench", x: cx.x, z: cx.z, rot: st.rot, traits: { solid: false } });
      }
    });
    if (!extra.length) return doc;
    const models = { ...(doc.models ?? {}) };
    for (const e of extra) if (e.type === "model") { const nm = String(e.opts?.model); if (!models[nm] && STARTER[nm]) models[nm] = STARTER[nm]!; }
    return { ...doc, objects: [...doc.objects, ...extra], models };
  }

  /** How tall a character is right now (a frog is small). */
  private heightOf(c: { cid: string; form?: string | null }): number {
    if (c.form) { const a = this.forms.get(`${c.cid}|${c.form}`); if (a) return a.height; }
    return this.animals.get(c.cid)?.height ?? CHAR_H;
  }

  /** The magic puff: sparkles circle the one changing, then a cloud — and a new body. */
  private buildMagic() {
    const group = new THREE.Group();
    group.visible = false;
    const puffs: THREE.Sprite[] = [];
    const tex = puffTexture();
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: i % 3 ? 0xffffff : 0xe9d5ff, transparent: true, depthWrite: false }));
      group.add(s);
      puffs.push(s);
    }
    const stars: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfde047 : 0xf0abfc }));
      group.add(m);
      stars.push(m);
    }
    this.scene3.add(group);
    this.magic = { group, puffs, stars };
  }

  private magic3(cx: number, cy: number, cz: number, h: number, mo: { t: number; n: number; swap: number }) {
    const M = this.magic;
    if (!M) return;
    M.group.visible = true;
    M.group.position.set(cx, cy, cz);
    const t = mo.t;
    // sparkles spiral up around the body, faster and faster
    M.stars.forEach((s, i) => {
      const k = Math.min(1, t / mo.swap);
      const a = i * 0.52 + t * (0.18 + k * 0.25);
      const r = (0.75 - 0.35 * k) * Math.max(0.6, h / CHAR_H) + 0.1;
      s.visible = t < mo.swap + 6;
      s.position.set(Math.cos(a) * r, ((i / 12) * h * 1.1 + t * 0.03) % (h * 1.2) + 0.1, Math.sin(a) * r);
      s.rotation.set(t * 0.2, t * 0.3, 0);
    });
    // the puff: a cloud that bursts out at the swap and fades
    const pt = t - (mo.swap - 3);
    M.puffs.forEach((p, i) => {
      const on = pt >= 0 && pt < 26;
      p.visible = on;
      if (!on) return;
      const k = pt / 26;
      const a = i * 2.4;
      const r = (0.15 + 0.7 * Math.sqrt(k)) * (0.6 + (i % 4) * 0.15);
      p.position.set(Math.cos(a) * r, 0.25 + (i % 5) * 0.18 + k * 0.5, Math.sin(a) * r * 0.6 + 0.2);
      const sc = (0.7 + 1.2 * Math.sqrt(k)) * (0.8 + (i % 3) * 0.2);
      p.scale.set(sc, sc, sc);
      (p.material as THREE.SpriteMaterial).opacity = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
    });
  }

  private creatureOf(cid: string): Species | null {
    const a = this.tl.auto_chars?.find((x) => x.id === cid);
    if (!a || !a.species) return null;
    return speciesFor(a.species) ?? speciesFor(a.name) ?? madeUpSpecies(a.name);
  }

  /** Talked-about animals / vehicles / things that come into the scene. */
  private buildExtras() {
    for (const e of this.tl.extras ?? []) {
      const word = e.word ?? e.name;
      const sp = speciesFor(word) ?? speciesFor(e.name) ?? (e.kind === "animal" ? madeUpSpecies(word) : null);
      const veh = sp ? null : vehicleFor(word) ?? vehicleFor(e.name);
      let item: Extra3D;
      if (sp) {
        const a = buildAnimal(sp);
        item = { obj: a.root, e, animal: a, len: sp.h * CHAR_H * sp.len * 0.6 };
      } else if (veh) {
        const v = buildVehicle(veh, ["#facc15", "#ef4444", "#3b82f6", "#10b981", "#f97316"][Math.round(e.x * 10) % 5]!);
        item = { obj: v.root, e, vehicle: v, len: v.length };
      } else {
        const img = this.popIcons.get(e.src);
        if (!img) continue;
        const s = billboard(bitmapTexture(img), Math.max(0.5, e.size * 6));
        item = { obj: s, e, len: 1 };
      }
      item.obj.visible = false;
      this.scene3.add(item.obj);
      this.extras3.push(item);
    }
  }

  /** Fires (with smoke), hit bursts. */
  private buildEffects() {
    for (const ef of this.tl.effects ?? []) {
      if (ef.type !== "fire") continue;
      const g = new THREE.Group();
      for (const a of [-0.5, 0.5]) {
        const lg = cyl(0.07, 0.07, 0.8, "#8b5a2b", 0.06, 10);
        lg.rotation.set(Math.PI / 2, a, 0);
        lg.position.y = 0.07;
        g.add(lg);
      }
      for (let k = 0; k < 3; k++) {
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.16 - k * 0.04, 0.55 - k * 0.12, 10), new THREE.MeshBasicMaterial({ color: ["#ef4444", "#f97316", "#fde047"][k], transparent: true, opacity: 0.92 }));
        fl.position.y = 0.32 - k * 0.04;
        fl.userData.k = k;
        g.add(fl);
      }
      const light = new THREE.PointLight(0xffa040, 12, 9, 1.4);
      light.position.y = 0.6;
      g.add(light);
      g.visible = false;
      this.scene3.add(g);
      this.fires.set(`${ef.scene}|${ef.frame}`, g);
    }
    const pm = new THREE.SpriteMaterial({ map: puffTexture(), color: 0x8a8a96, transparent: true, depthWrite: false });
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(pm.clone());
      s.visible = false;
      this.fx.add(s);
      this.puffs.push(s);
    }
    for (const word of ["POW!", "BAM!", "WHACK!"]) {
      this.hitTex.push(drawnTexture(256, 256, (x) => {
        x.translate(128, 128);
        x.fillStyle = "#fde047"; x.strokeStyle = "#1b1b1b"; x.lineWidth = 8;
        x.beginPath();
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 60 : 120; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        x.closePath(); x.fill(); x.stroke();
        x.fillStyle = "#dc2626"; x.font = "900 54px Arial Black, Arial"; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText(word, 0, 0);
      }));
    }
  }

  /** Every character's body angles for every frame, smoothed (so scrubbing works). */
  private computeTracks3() {
    const tl = this.tl;
    const prev = new Map<string, Float32Array>();
    const energy = new Map<string, number>();
    const phase = new Map<string, number>();
    const seeds = new Map<string, number>();
    let prevScene = -1;
    const lie = tl.lie;
    const unit = CHAR_H / 376;
    const iYaw = JOINT_KEYS.indexOf("yaw");
    tl.frames.forEach((f, n) => {
      const faces = new Map<string, Face>();
      const ex = new Map<string, { tool: Body["tool"]; line: Body["line"]; hidden: boolean; ov: boolean; walking: boolean; acting: boolean; prop?: string | null }>();
      const snap = f.scene !== prevScene;
      prevScene = f.scene;
      const order = f.chars.map((c) => c.cid);
      // everybody's 2D mark this frame, in 3D
      const marks = new Map(f.chars.map((c) => [c.cid, { x: this.toWorldX(c.x) + c.dx * unit, z: (order.indexOf(c.cid) % 2) * -0.45 }]));
      for (const c of f.chars) {
        if (!seeds.has(c.cid)) seeds.set(c.cid, seeds.size * 1.7 + 0.4);
        const level = c.mouth === "talk-open" ? 1 : c.mouth === "talk-half" ? 0.5 : 0;
        const e = Math.max(level, (energy.get(c.cid) ?? 0) * 0.93);
        energy.set(c.cid, e);
        const walking = c.stance.startsWith("walk");
        const ph = (phase.get(c.cid) ?? 0) + (walking ? 0.36 : 0);
        phase.set(c.cid, ph);
        const tj = targetJoints({ pose: c.pose, stance: c.stance, expr: c.expr, talk: level, energy: e, walkPhase: ph, walking, n, seed: seeds.get(c.cid)! });
        const animal = this.animals.has(c.cid);
        let x = marks.get(c.cid)!.x, y = -c.dy * unit, z = marks.get(c.cid)!.z;
        let yaw = walking ? (c.facing === "right" ? 1.35 : -1.35) : f.chars.length > 1 ? (c.facing === "right" ? 0.62 : -0.62) : 0.15;
        // studio presenter: turns toward the word that pops up beside him
        if ((tl as { studio?: boolean }).studio && !walking) yaw = c.look === "right" ? 0.55 : c.look === "left" ? -0.55 : 0.05;
        let roll = (c.rot * Math.PI) / 180;
        if (c.stance === "sit") { y += SEAT_H + 0.04 - HIP_H; z = -0.08; }
        const wld = this.worlds[f.scene];
        if (wld && c.stance !== "lie") y += wld.heightAt(x, z, true); // standing on a hill / a platform
        if (c.stance === "lie") {
          const info = lie[f.scene] ?? { sitting: false, seat_end: null };
          const pillow = info.seat_end !== null ? this.toWorldX(info.seat_end) + 0.6 : x + 1.4;
          x = pillow - 1.65; z = -0.15; yaw = 0; roll = -Math.PI / 2;
          y = 0.72;
          tj.lhx = tj.rhx = 0; tj.lk = tj.rk = 0;
          tj.lsx = tj.rsx = 0; tj.lsz = 0.1; tj.rsz = -0.1; tj.lex = tj.rex = 0;
        }
        if (c.flags?.ladder) {
          // the 2D "climb": up the ladder FACING it (back to the camera)
          yaw = Math.PI;
          const up = Math.sin(n * 0.42);
          Object.assign(tj, { lsx: -2.75 + 0.35 * up, lsz: 0.28, lex: -0.5, rsx: -2.75 - 0.35 * up, rsz: -0.28, rex: -0.5, lhx: -0.7 - 0.4 * Math.max(0, -up), lk: 1.1, rhx: -0.7 - 0.4 * Math.max(0, up), rk: 1.1 });
        }
        const body: Body = { x, y, z, yaw, roll, j: { ...tj } as Record<string, number>, walking, ov: false };
        this.brain?.step(n, f.scene, c, f.chars, body, (cid) => marks.get(cid) ?? { x: 0, z: 0 });
        if (animal && !body.ov) body.yaw = c.facing === "left" ? -1.12 : 1.12; // animals look along +x
        if (animal && body.ov && !body.walking && Math.abs(body.roll) < 0.01) body.roll = (c.rot * Math.PI) / 180;
        const vals: Record<string, number> = { ...body.j, x: body.x, y: body.y, z: body.z, yaw: body.yaw, roll: body.roll };
        const target = new Float32Array(NJ);
        JOINT_KEYS.forEach((k, i) => { target[i] = vals[k] ?? 0; });
        const p = prev.get(c.cid);
        if (p) target[iYaw] = wrapNear(target[iYaw]!, p[iYaw]!);
        const out = new Float32Array(NJ);
        for (let i = 0; i < NJ; i++) {
          const k = JOINT_KEYS[i]!;
          const fast = k === "x" || k === "y" || k === "z" || k === "roll";
          out[i] = !p || snap ? target[i]! : p[i]! + (target[i]! - p[i]!) * (fast ? 0.6 : body.ov ? 0.5 : k === "yaw" ? 0.25 : 0.3);
        }
        prev.set(c.cid, out);
        this.brain?.lastPos.set(c.cid, { x: out[0]!, z: out[2]! });
        let tr = this.tracks.get(c.cid);
        if (!tr) { tr = new Float32Array(tl.frames.length * NJ).fill(NaN); this.tracks.set(c.cid, tr); }
        tr.set(out, n * NJ);
        const hold = c.pose === "read" || c.pose === "page" ? "book" : c.pose === "phone" ? "phone" : c.pose === "drink" ? "cup" : "";
        const mouth = body.mouth !== undefined ? (body.mouth as Face["mouth"]) : c.mouth;
        const talk = body.mouth !== undefined ? (body.mouth === "talk-open" ? 1 : body.mouth === "talk-half" ? 0.5 : 0) : level;
        faces.set(c.cid, { expr: c.expr, mouth, talk, blink: c.blink, look: c.look,
          tears: !!c.flags?.tears, sweat: !!c.flags?.sweat, hold: body.ov && body.tool ? "" : hold, lie: c.stance === "lie" });
        ex.set(c.cid, { tool: body.tool ?? null, line: body.line ?? null, hidden: !!body.hidden, ov: body.ov, walking: body.walking, acting: !!body.acting, prop: body.prop ?? null });
      }
      this.faces.push(faces);
      this.extraF.push(ex);
    });
    this.computeCamera();
  }

  /** The camera: the 2D director's shots, as a real 3D camera that frames
   * where everybody REALLY is (up a tree, by the river…) and what they use. */
  private computeCamera() {
    const tl = this.tl;
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const D0 = (this.span * 0.55) / Math.tan(hfov / 2);
    let yawS = 0, pitchS = 0.12, lastShot = "";
    let shotYaw = 0, shotPitch = 0.12;
    let sm: { x: number; y: number; z: number; d: number } | null = null;
    let lastTalker = "";
    // the thing a line talks about ("look at the waterfall!") comes into the shot with the speaker
    const mentions = new Map<number, THREE.Vector3[]>();
    const mentionAt = (n: number, scene: number): { id: number; pts: THREE.Vector3[] } | null => {
      const t = n / tl.fps;
      const i = tl.cues.findIndex((c) => t >= c.start && t <= c.end + 0.3);
      if (i < 0) return null;
      if (!mentions.has(i)) {
        const pts: THREE.Vector3[] = [];
        const world = this.worlds[scene];
        if (world) {
          for (const w of tl.cues[i]!.text.split(/[^A-Za-z']+/)) {
            const ro = world.named(w);
            if (!ro) continue;
            const h = Math.min(ro.b.height, 5);
            pts.push(new THREE.Vector3(ro.pos.x, ro.pos.y + h * 0.35, ro.pos.z), new THREE.Vector3(ro.pos.x, ro.pos.y + h * 0.8, ro.pos.z));
            break;
          }
        }
        mentions.set(i, pts);
      }
      return { id: i, pts: mentions.get(i)! };
    };
    tl.frames.forEach((f, n) => {
      const cam = f.cam ?? { z: 1, x: this.W / 2, y: this.H / 2, sx: 0, sy: 0 };
      const zoom = Math.max(0.85, cam.z);
      const ment = f.chars.some((c) => c.morph) ? null : mentionAt(n, f.scene);
      const shot = `${f.scene}|${Math.round(cam.z * 6)}|${Math.round(cam.x / 90)}|${ment?.pts.length ? ment.id : ""}`;
      const newScene = f.scene !== (tl.frames[n - 1]?.scene ?? -1);
      const shotChanged = shot !== lastShot;
      // who / what is in this shot, in 3D
      const cx2d = cam.x / this.W, half = 0.5 / zoom;
      const hid = this.extraF[n];
      const all: THREE.Vector3[] = [], key: THREE.Vector3[] = [], morphing: THREE.Vector3[] = [];
      const talking = f.chars.find((c) => c.mouth === "talk-open" || c.mouth === "talk-half");
      if (talking) lastTalker = talking.cid;
      for (const c of f.chars) {
        if (hid?.get(c.cid)?.hidden) continue;
        // in the shot: whoever the 2D director framed, plus whoever is busy doing something
        const acting = hid?.get(c.cid)?.acting || !!c.morph;
        if (!acting && Math.abs(c.x - cx2d) > half + 0.04) continue;
        const tr = this.tracks.get(c.cid);
        if (!tr) continue;
        const o = n * NJ, h = this.heightOf(c);
        const pts = [new THREE.Vector3(tr[o]!, tr[o + 1]! + 0.1, tr[o + 2]!), new THREE.Vector3(tr[o]!, tr[o + 1]! + h * 0.95, tr[o + 2]!)];
        all.push(...pts);
        if (acting || c.cid === lastTalker) key.push(...pts);
        if (c.morph) { morphing.push(...pts); }
      }
      const fp = this.brain?.focus[n] ?? [];
      all.push(...fp); key.push(...fp);
      let behind: THREE.Vector3 | null = null;
      if (ment?.pts.length && key.length) {
        // near: in the picture with the speaker; far (a waterfall, a hill): seen behind the speaker
        const sp = key[0]!;
        if (Math.hypot(ment.pts[0]!.x - sp.x, ment.pts[0]!.z - sp.z) < 7) { all.push(...ment.pts); key.push(...ment.pts); }
        else behind = ment.pts[1]!;
      }
      const fit = (pts: THREE.Vector3[]) => {
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
        for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
        const needW = Math.max(maxX - minX, (maxZ - minZ) * 0.5) / 2 + 0.75, needH = (maxY - minY) / 2 + 0.5;
        const dFit = Math.max(needW / Math.tan(hfov / 2), needH / Math.tan(vfov / 2));
        return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, y: Math.max(0.55, minY + (maxY - minY) * 0.6) + (this.W < this.H ? 0.25 : 0), d: dFit };
      };
      let tx: number, ty: number, tz: number, dist: number;
      if (all.length) {
        let g = fit(all);
        // people far apart (one up a tree, one across the river): look at who matters now
        if (key.length && key.length < all.length) { const k = fit(key); if (g.d > k.d * 1.6) g = k; }
        // magic: the camera goes close on the one who is changing
        if (morphing.length) { const k = fit(morphing); g = { ...k, d: Math.max(k.d, 2.2) }; }
        // someone DOING something in the world (swimming, climbing, fishing…): the camera goes to them
        const doing = f.chars.some((c) => c.wact && !hid?.get(c.cid)?.hidden) && !morphing.length;
        if (doing) {
          const dp: THREE.Vector3[] = [];
          for (const c of f.chars) {
            if (!c.wact) continue;
            const tr = this.tracks.get(c.cid);
            if (!tr) continue;
            const o2 = n * NJ, h2 = this.heightOf(c);
            dp.push(new THREE.Vector3(tr[o2]!, tr[o2 + 1]! + 0.1, tr[o2 + 2]!), new THREE.Vector3(tr[o2]!, tr[o2 + 1]! + h2 * 0.95, tr[o2 + 2]!));
          }
          dp.push(...fp);
          if (dp.length) g = fit(dp);
        }
        tx = g.x; ty = g.y; tz = g.z;
        dist = Math.min(Math.max(g.d, (D0 / zoom) * (doing ? 0.55 : 0.95) * (zoom > 1.15 ? 0.85 : 1)), D0 * 2.2);
      } else {
        tx = this.toWorldX(cx2d); tz = 0;
        ty = Math.max(0.55, (this.feetY - cam.y) / this.pxPerWorld) + (this.W < this.H ? 0.35 : 0);
        dist = (D0 / zoom) * 0.95;
      }
      // a new shot: the director looks around the place and picks the best angle
      // (sees faces, nothing in the way, the camera never inside a building,
      // the interesting things of the place in the background, not the same angle again)
      const world = this.worlds[f.scene];
      // STUDIO (Auto Video presenter, 2026-11-18): a TV camera on the presenter —
      // a medium shot, a close-up or a wide, always from the front (a slight angle)
      const pc = (tl as { studio?: boolean }).studio ? f.chars[0] : undefined;
      const ptr = pc ? this.tracks.get(pc.cid) : undefined;
      if (pc && ptr) {
        const o0 = n * NJ, h0 = this.heightOf(pc);
        const close = cam.z >= 1.3, medium = cam.z >= 1.1;
        tx = ptr[o0]!; tz = ptr[o0 + 2]!;
        ty = ptr[o0 + 1]! + h0 * (close ? 0.72 : medium ? 0.6 : 0.5);
        dist = h0 * (close ? 1.45 : medium ? 2.2 : 3.3) * (this.W < this.H ? 1.25 : 1);
        if (shotChanged) {
          lastShot = shot;
          shotYaw = [0, -0.22, 0.18, -0.1, 0.26][Math.floor(n / 7) % 5]!;
          shotPitch = close ? 0.02 : 0.06;
          yawS = shotYaw; pitchS = shotPitch; // a TV cut, not a slow pan
          sm = { x: tx, y: ty, z: tz, d: dist };
        }
      } else if (shotChanged) {
        lastShot = shot;
        const best = this.pickAngle(n, f, new THREE.Vector3(tx, ty, tz), dist, hfov, shotYaw, newScene, behind);
        shotYaw = best.yaw; shotPitch = best.pitch;
        if (newScene) { yawS = shotYaw; pitchS = shotPitch; }
      }
      const side = this.brain?.camYaw[n];
      if (side !== undefined) yawS += (wrapNear(side, yawS) - yawS) * 0.06; // see the action from the side
      else yawS += (wrapNear(shotYaw, yawS) - yawS) * 0.05;
      pitchS += (shotPitch - pitchS) * 0.05;
      if (!sm || newScene) sm = { x: tx, y: ty, z: tz, d: dist };
      else { const k = 0.1; sm.x += (tx - sm.x) * k; sm.y += (ty - sm.y) * k; sm.z += (tz - sm.z) * k; sm.d += (dist - sm.d) * k; }
      const drift = Math.sin(n / 160 + f.scene) * 0.08;
      const yaw = yawS + drift;
      const sx = (cam.sx ?? 0) / this.pxPerWorld * 0.4, sy = (cam.sy ?? 0) / this.pxPerWorld * 0.4;
      const o = n * 6;
      const C = new THREE.Vector3(sm.x + Math.sin(yaw) * sm.d + sx, sm.y + Math.sin(pitchS) * sm.d + 0.15 + sy, sm.z + Math.cos(yaw) * sm.d);
      if (world) {
        // never inside a building / train / platform, never under the ground
        const T = new THREE.Vector3(sm.x, sm.y, sm.z);
        const boxes = world.blockers(n).filter((b) => !b.box.containsPoint(T));
        const inside = (p: THREE.Vector3) => boxes.some((b) => b.box.clone().expandByScalar(0.25).containsPoint(p));
        for (let k = 0; k < 40 && inside(C) && C.distanceTo(T) > 1.3; k++) C.lerp(T, 0.08);
        C.y = Math.max(C.y, world.heightAt(C.x, C.z, true) + 0.5);
        if (inside(C)) C.y += 1.5;
        const R = world.doc.room;
        if (R) {
          // a room: the camera stays under the ceiling, between the side walls, not far out of the open front
          const W = Math.max(4, Math.min(40, R.width ?? 10)), H = Math.max(2.2, Math.min(8, R.height ?? 3.2));
          C.y = Math.min(C.y, H - 0.35);
          C.x = Math.max(-W / 2 + 0.4, Math.min(W / 2 - 0.4, C.x));
          C.z = Math.min(C.z, 2 + 4.5);
        }
      }
      this.camTrack[o] = C.x;
      this.camTrack[o + 1] = C.y;
      this.camTrack[o + 2] = C.z;
      this.camTrack[o + 3] = sm.x;
      this.camTrack[o + 4] = sm.y;
      this.camTrack[o + 5] = sm.z;
    });
  }

  /** Score camera angles around the subject and keep the best one. */
  private pickAngle(n: number, f: Frame, T: THREE.Vector3, d: number, hfov: number, prevYaw: number, establishing: boolean, behind: THREE.Vector3 | null = null): { yaw: number; pitch: number } {
    const world = this.worlds[f.scene];
    let h = n * 7 + f.scene * 131;
    const rnd = () => { h = (h * 1103515245 + 12345) >>> 0; return (h % 1000) / 1000; };
    if (!world) return { yaw: (rnd() - 0.5) * 0.7, pitch: 0.06 + rnd() * 0.16 };
    const boxes = world.blockers(n);
    const own = boxes.filter((b) => !b.box.clone().expandByScalar(0.2).containsPoint(T));
    const talker = f.chars.find((c) => c.mouth === "talk-open" || c.mouth === "talk-half");
    const yaws = [-1.25, -0.85, -0.5, -0.2, 0.2, 0.5, 0.85, 1.25, Math.PI - 0.9, Math.PI - 0.45, Math.PI + 0.45, Math.PI + 0.9];
    const pitches = [0.07, 0.2, 0.36];
    let best = { yaw: 0, pitch: 0.12, s: -1e9 };
    const C = new THREE.Vector3(), P = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
    for (const yaw of yaws) for (const pitch of pitches) {
      C.set(T.x + Math.sin(yaw) * d, T.y + Math.sin(pitch) * d + 0.15, T.z + Math.cos(yaw) * d);
      let sc = Math.cos(yaw) * 1.2 + rnd() * 0.6;
      if (C.y < world.heightAt(C.x, C.z, true) + 0.6) sc -= 50;
      for (const b of own) {
        if (b.box.clone().expandByScalar(0.3).containsPoint(C)) { sc -= 50; continue; }
        let hits = 0;
        for (let t = 0.12; t < 0.9; t += 0.11) { P.lerpVectors(C, T, t); if (b.box.containsPoint(P)) hits++; }
        sc -= Math.min(6, hits * 1.5);
        // the place's big things behind the characters make a good picture
        const size = b.box.getSize(P).length();
        if (size > 2.5) {
          b.box.getCenter(v1).sub(C); v2.copy(T).sub(C);
          if (v1.length() > d * 0.8 && v1.normalize().dot(v2.normalize()) > Math.cos(hfov * 0.45)) sc += Math.min(1.5, size / 6);
        }
      }
      if (world.eyeInside(C)) sc -= 50;
      // faces, not backs — and nothing solid (a trunk, a wall) between the camera and anyone in the shot
      for (const c of f.chars) {
        const tr = this.tracks.get(c.cid);
        if (!tr || this.extraF[n]?.get(c.cid)?.hidden) continue;
        const o = n * NJ;
        const hh = this.heightOf(c);
        const head = P.set(tr[o]!, tr[o + 1]! + hh * 0.85, tr[o + 2]!);
        if (head.distanceTo(T) < d * 1.2 && world.blocking(C, head).length) sc -= c.cid === talker?.cid ? 12 : 4;
        if (this.animals.has(c.cid)) continue;
        const toCam = Math.atan2(C.x - tr[o]!, C.z - tr[o + 2]!);
        const diff = Math.abs(wrapNear(toCam - tr[o + 3]!, 0));
        if (diff > 1.9) sc -= c.cid === talker?.cid ? 4 : 1.2;
      }
      if (!establishing && Math.abs(wrapNear(yaw - prevYaw, 0)) < 0.35) sc -= 1.5; // a new shot = a new angle
      if (establishing && pitch > 0.3) sc += 0.8; // the first look at a place: a bit from above
      if (behind) {
        // the thing the line talks about must be in the picture, behind the speaker
        v1.copy(behind).sub(C).normalize(); v2.copy(T).sub(C).normalize();
        const off = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));
        sc += off < hfov * 0.38 ? 6 - off * 4 : -2;
      }
      if (sc > best.s) best = { yaw, pitch, s: sc };
    }
    return { yaw: best.yaw, pitch: best.pitch };
  }

  /** Put the world in the state of frame n and render it. */
  private render3(n: number) {
    const tl = this.tl;
    const f = tl.frames[n]!;
    if (f.scene !== this.currentScene) {
      this.places.forEach((p, i) => { p.group.visible = i === f.scene; });
      this.currentScene = f.scene;
      const L = this.places[f.scene]?.light;
      if (L) {
        this.scene3.background = new THREE.Color(L.indoor ? "#2a2633" : L.skyBottom);
        this.scene3.fog = new THREE.Fog(L.fog, L.fogNear, L.fogFar);
        this.hemi.color.set(L.hemiSky).lerp(new THREE.Color("#ffffff"), 0.65); // keep skin colours true
        this.hemi.groundColor.set(L.hemiGround);
        this.hemi.intensity = L.hemi;
        this.sun.color.set(L.sun);
        this.sun.intensity = L.sunI;
        this.sun.position.set(...L.sunPos);
      }
    }
    this.places[f.scene]?.update(n);
    const faces = this.faces[n]!;
    const ex = this.extraF[n]!;
    const shown = new Set(f.chars.filter((c) => !ex.get(c.cid)?.hidden).map((c) => c.cid));
    for (const [cid, h] of this.humans) h.root.visible = shown.has(cid);
    for (const [cid, a] of this.animals) a.root.visible = shown.has(cid);
    for (const a of this.forms.values()) a.root.visible = false;
    if (this.magic) this.magic.group.visible = false;
    for (const s of this.emoteSprites.values()) s.visible = false;
    for (const t of this.tools.values()) { t.axe.visible = t.rod.visible = t.match.visible = t.line.visible = false; }
    this.propsFx.ladder.visible = this.propsFx.rope.visible = this.propsFx.match.visible = false;
    const j = {} as Joints;
    for (const c of f.chars) {
      const tr = this.tracks.get(c.cid);
      if (!tr) continue;
      JOINT_KEYS.forEach((k, i) => { (j as Record<string, number>)[k] = tr[n * NJ + i]!; });
      const head = this.tmpV;
      const e = ex.get(c.cid);
      const fb = c.form ? this.forms.get(`${c.cid}|${c.form}`) : undefined;
      if (c.morph && shown.has(c.cid)) this.magic3(j.x, j.y, j.z, this.heightOf(c), c.morph);
      // the pop of the new body / the wobble before it
      const mk = c.morph ? c.morph.t - c.morph.swap : 99;
      const sq = mk < 0 ? 1 + 0.07 * Math.sin(c.morph!.t * 1.3) : mk < 14 ? 0.35 + 0.65 * (1 - Math.pow(1 - mk / 14, 2)) + 0.12 * Math.sin((mk / 14) * Math.PI) : 1;
      if (fb) {
        // turned into something: that body stands where they are, and talks with their voice
        this.humans.get(c.cid)?.root && (this.humans.get(c.cid)!.root.visible = false);
        const own = this.animals.get(c.cid);
        if (own) own.root.visible = false;
        if (!shown.has(c.cid)) continue;
        fb.root.visible = true;
        const gy = this.worlds[f.scene]?.heightAt(j.x, j.z) ?? 0;
        fb.root.position.set(j.x, Math.min(j.y, gy + 0.02) + (c.stance.startsWith("walk") ? Math.abs(Math.sin(n * 0.5)) * 0.12 : 0), j.z);
        fb.root.rotation.set(0, j.yaw - Math.PI / 2, 0);
        fb.root.scale.setScalar(sq * ((fb.root.userData.formScale as number) ?? 1));
        const fc = faces.get(c.cid)!;
        fb.animate({ n, walking: c.stance.startsWith("walk"), talk: fc.talk, blink: c.blink, expr: c.expr });
        head.set(j.x, j.y + fb.height * 0.9, j.z);
        if (c.emote) this.emote3(c, head);
        continue;
      }
      const h = this.humans.get(c.cid);
      if (h) h.root.scale.setScalar(sq);
      else this.animals.get(c.cid)?.root.scale.setScalar(sq);
      if (h) {
        h.apply(j, faces.get(c.cid)!, n);
        h.root.updateMatrixWorld(true);
        h.headWorld(head);
        if (e?.tool || e?.line) this.tool3(c.cid, h, e.tool ?? null, e.line ?? null);
        this.prop3(c.cid, h, e?.prop ?? (e?.tool ? null : c.hand ?? null));
      } else {
        const a = this.animals.get(c.cid);
        if (!a) continue;
        a.root.position.set(j.x, j.y, j.z);
        a.root.rotation.set(0, j.yaw - Math.PI / 2, j.roll);
        const fc = faces.get(c.cid)!;
        a.animate({ n, walking: e?.ov ? e.walking : c.stance.startsWith("walk"), talk: fc.talk, blink: c.blink, expr: c.expr });
        head.set(j.x, j.y + a.height * 0.9, j.z);
      }
      if (!e?.ov) this.props3(c, j, n, h);
      if (c.emote && shown.has(c.cid)) this.emote3(c, head);
    }
    // the living world: wind, water, fish, things in hands, falling fruit…
    const world = this.worlds[f.scene];
    if (world) {
      const walkers: { x: number; z: number; s: number }[] = [];
      for (const c of f.chars) {
        const tr = this.tracks.get(c.cid);
        if (!tr || !shown.has(c.cid)) continue;
        for (const [lag, s] of [[0, 1], [10, 0.55], [24, 0.3]] as const) {
          const m = Math.max(0, n - lag) * NJ;
          if (Number.isNaN(tr[m]!) || tr[m + 1]! > 0.3) continue;
          walkers.push({ x: tr[m]!, z: tr[m + 2]!, s: s * (this.animals.has(c.cid) ? 0.8 : 1) });
        }
      }
      world.update(n, {
        walkers: walkers.slice(0, 16),
        yawOf: (cid) => this.tracks.get(cid)?.[n * NJ + 3] ?? 0,
        hand: (cid, side, out) => {
          const hh = this.humans.get(cid);
          if (hh) {
            if (side === "c") { const a2 = new THREE.Vector3(); hh.handWorld("l", a2); hh.handWorld("r", out); out.add(a2).multiplyScalar(0.5); }
            else if (side === "m") { hh.headWorld(out); out.y -= 0.15; }
            else hh.handWorld(side, out);
            return true;
          }
          const a = this.animals.get(cid);
          if (!a) return false;
          const ry = a.root.rotation.y;
          out.copy(a.root.position).add(new THREE.Vector3(Math.cos(ry) * a.height * 0.45, a.height * 0.7, -Math.sin(ry) * a.height * 0.45));
          return true;
        },
      });
    }
    this.extras3D(n, f.scene);
    this.effects3D(n, f.scene);
    const o = n * 6;
    this.camera.position.set(this.camTrack[o]!, this.camTrack[o + 1]!, this.camTrack[o + 2]!);
    this.camera.lookAt(this.camTrack[o + 3]!, this.camTrack[o + 4]!, this.camTrack[o + 5]!);
    this.camera.updateMatrixWorld(true);
    // whoever is on screen must be SEEN: a trunk or wall between the camera and a face is taken away
    const seen: THREE.Vector3[] = [];
    for (const c of f.chars) {
      if (!shown.has(c.cid)) continue;
      const tr = this.tracks.get(c.cid);
      if (!tr) continue;
      const q = n * NJ, hh = this.heightOf(c);
      for (const k of [0.85, 0.45]) {
        const p = new THREE.Vector3(tr[q]!, tr[q + 1]! + hh * k, tr[q + 2]!);
        const sp = p.clone().project(this.camera);
        if (Math.abs(sp.x) < 1.05 && Math.abs(sp.y) < 1.05 && sp.z < 1) seen.push(p);
      }
    }
    this.worlds[f.scene]?.clearView(this.camera.position, new THREE.Vector3(this.camTrack[o + 3]!, this.camTrack[o + 4]!, this.camTrack[o + 5]!), seen);
    this.sun.target.position.set(this.camTrack[o + 3]!, 0, this.camTrack[o + 5]!);
    this.sun.position.set(this.camTrack[o + 3]! + 8, 14, this.camTrack[o + 5]! + 10);
    this.renderer.render(this.scene3, this.camera);
  }

  /** The ground under a point of a scene (hills, platforms…). */
  private groundAt(scene: number, x: number, z: number): number {
    return this.worlds[scene]?.heightAt(x, z, true) ?? 0;
  }

  /** Free the WebGL context (several films in one page: Auto Video's studio scenes). */
  dispose() {
    try {
      this.scene3.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); });
      this.renderer?.dispose();
      this.renderer?.forceContextLoss();
    } catch { /* already gone */ }
  }

  /** Axe / fishing rod / match in the right hand, and the fishing line. */
  /** Anything in the hand for a custom action: hammer, welding torch, shovel, brush, pan… or any model. */
  private props = new Map<string, Map<string, THREE.Object3D>>();
  private prop3(cid: string, h: Human, name: string | null) {
    let m = this.props.get(cid);
    if (!m) { m = new Map(); this.props.set(cid, m); }
    for (const [k, o] of m) o.visible = k === name;
    if (!name || m.has(name)) return;
    const o = handProp(name);
    const dir = new THREE.Vector3(0, -0.7, 0.7).normalize();
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    o.position.copy(dir).multiplyScalar(-0.08);
    const g = new THREE.Group(); g.add(o);
    h.hand("r").add(g);
    m.set(name, g);
  }

  private tool3(cid: string, h: Human, tool: Body["tool"], line: Body["line"]) {
    let t = this.tools.get(cid);
    const dir = new THREE.Vector3(0, -0.7, 0.7).normalize();
    if (!t) {
      const hand = h.hand("r");
      const mk = (o: THREE.Object3D, grip: number) => {
        const g = new THREE.Group();
        o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        o.position.copy(dir).multiplyScalar(-grip);
        g.add(o);
        g.visible = false;
        hand.add(g);
        return g;
      };
      const match = new THREE.Group();
      match.add(at(cyl(0.01, 0.01, 0.16, "#a16207", 0, 6), 0, 0.08, 0), at(cone(0.03, 0.09, "#f97316", 0, 8), 0, 0.2, 0));
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const ln = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf8fafc }));
      ln.frustumCulled = false;
      this.fx.add(ln);
      t = { axe: mk(axeMesh(), 0.12), rod: mk(rodMesh(), 0.2), match: mk(match, 0.02), line: ln };
      this.tools.set(cid, t);
    }
    t.axe.visible = tool === "axe";
    t.rod.visible = tool === "rod";
    t.match.visible = tool === "match";
    if (line && tool === "rod") {
      const tip = h.hand("r").localToWorld(dir.clone().multiplyScalar(1.5));
      const a = t.line.geometry.getAttribute("position") as THREE.BufferAttribute;
      a.setXYZ(0, tip.x, tip.y, tip.z); a.setXYZ(1, line[0], line[1], line[2]);
      a.needsUpdate = true;
      t.line.visible = true;
    }
  }

  private props3(c: CharF, j: Joints, n: number, h?: Human) {
    if (c.flags?.ladder) {
      this.propsFx.ladder.visible = true;
      this.propsFx.ladder.position.set(j.x, 0, j.z - 0.22);
    }
    if (typeof c.flags?.rope === "number") {
      const r = this.propsFx.rope;
      r.visible = true;
      r.position.set(j.x, j.y + 0.85, j.z);
      r.rotation.set(0, j.yaw + Math.PI / 2, 0);
      r.rotation.x = (c.flags.rope as number) * Math.PI * 2;
      r.scale.set(0.55, 1.15, 1);
    }
    if (c.flags?.match && h) {
      h.handWorld("r", this.propsFx.match.position);
      this.propsFx.match.visible = true;
      this.propsFx.match.children[1]!.scale.setScalar(1 + Math.sin(n * 1.7) * 0.2);
    }
  }

  private emote3(c: CharF, head: THREE.Vector3) {
    const [name, fr] = c.emote!;
    const key = `${name}|${fr}`;
    let s = this.emoteSprites.get(c.cid);
    if (!s) {
      s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      s.scale.set(0.55, 0.55, 1);
      this.fx.add(s);
      this.emoteSprites.set(c.cid, s);
    }
    const t = this.emoteTex.get(key);
    if (t && s.material.map !== t) { s.material.map = t; s.material.needsUpdate = true; }
    s.position.set(head.x + 0.25, head.y + 0.55, head.z);
    s.visible = true;
  }

  private extras3D(n: number, scene: number) {
    for (const x of this.extras3) {
      const e = x.e;
      // already living in this 3D world (the ducks on the river): no extra copy walks in
      const inWorld = this.worlds[e.scene]?.has(e.word ?? e.name) || this.worlds[e.scene]?.has(e.name);
      const on = e.scene === scene && n >= e.enter && !inWorld;
      x.obj.visible = on;
      if (!on) continue;
      const t = n - e.enter;
      const target = this.toWorldX(e.x), fromLeft = e.from === "left";
      const startX = fromLeft ? -this.span * 0.85 - x.len : this.span * 0.85 + x.len;
      const k = Math.min(1, t / (x.vehicle ? 40 : 42));
      const ease = 1 - (1 - k) ** 2;
      const px = startX + (target - startX) * ease;
      const arrived = k >= 1;
      if (x.vehicle) {
        x.obj.position.set(px, this.groundAt(scene, px, -3.2), -3.2);
        x.obj.rotation.y = fromLeft ? 0 : Math.PI;
        x.vehicle.animate(n, !arrived);
      } else if (x.animal) {
        const wander = arrived ? Math.sin(t / 60) * 0.5 : 0;
        const walking = !arrived || Math.abs(Math.cos(t / 60)) > 0.6;
        const dir = !arrived ? (fromLeft ? 1 : -1) : Math.cos(t / 60) > 0 ? 1 : -1;
        x.obj.position.set(px + wander, this.groundAt(scene, px + wander, -0.9), -0.9);
        x.obj.rotation.y = dir > 0 ? -0.45 : Math.PI + 0.45;
        x.animal.animate({ n, walking, talk: 0, blink: n % 90 < 4, expr: "happy", flying: e.motion === "fly" });
      } else {
        const k2 = Math.min(1, t / 8);
        x.obj.position.set(target, this.groundAt(scene, target, -0.9), -0.9);
        x.obj.scale.setScalar(k2 < 1 ? 1 + 2.4 * (k2 - 1) ** 3 + 1.4 * (k2 - 1) ** 2 : 1);
      }
    }
  }

  private effects3D(n: number, scene: number) {
    // fires keep burning once lit, with smoke
    let puff = 0;
    for (const [key, g] of this.fires) {
      const [sc, fr] = key.split("|").map(Number) as [number, number];
      const ef = (this.tl.effects ?? []).find((e) => e.type === "fire" && e.scene === sc && e.frame === fr)!;
      const on = sc === scene && n >= fr;
      g.visible = on;
      if (!on) continue;
      const grow = Math.min(1, (n - fr) / 14);
      g.position.set(this.toWorldX(ef.x), this.groundAt(scene, this.toWorldX(ef.x), 0.7), 0.7);
      g.children.forEach((ch) => {
        if (ch.userData.k !== undefined) {
          const k = ch.userData.k as number;
          ch.scale.set(grow, grow * (1 + Math.sin(n * 1.7 + k) * 0.18 + Math.sin(n * 3.1 + k) * 0.1), grow);
        }
        if ((ch as THREE.PointLight).isPointLight) (ch as THREE.PointLight).intensity = 10 + Math.sin(n * 2.3) * 3;
      });
      for (let k = 0; k < 8 && puff < this.puffs.length; k++) {
        const age = ((n - fr + k * 11) % 88) / 88;
        if (n - fr < k * 11) continue;
        const s = this.puffs[puff++]!;
        s.visible = true;
        s.position.set(g.position.x + Math.sin(age * 6 + k) * 0.2, 0.8 + age * 3.2, g.position.z - 0.1);
        s.scale.setScalar(0.3 + age * 1.1);
        s.material.opacity = 0.55 * (1 - age);
      }
    }
    // dust, hits, sparkles
    for (const ef of this.tl.effects ?? []) {
      if (ef.scene !== scene || ef.type === "fire") continue;
      const t = n - ef.frame;
      if (t < 0 || t > 16 || puff >= this.puffs.length) continue;
      const k = t / 16, x = this.toWorldX(ef.x);
      const s = this.puffs[puff++]!;
      s.visible = true;
      if (ef.type === "dust") {
        s.material.map = puffTexture(); s.material.color.set(0xa08c6e);
        s.position.set(x, 0.15 + k * 0.2, 0.2);
        s.scale.setScalar(0.3 + k * 0.6);
        s.material.opacity = 0.6 * (1 - k);
      } else if (ef.type === "hit") {
        if (t > 8) { s.visible = false; continue; }
        s.material.map = this.hitTex[Math.round(ef.x * 100 + ef.frame) % 3]!; s.material.color.set(0xffffff);
        s.position.set(x, 1.35, 0.3);
        s.scale.setScalar(0.9 + t * 0.06);
        s.material.opacity = 1;
        s.material.rotation = t * 0.2;
      } else {
        s.material.map = puffTexture(); s.material.color.set(t % 2 ? 0xfde047 : 0xf472b6);
        s.position.set(x, 1.6 + k * 0.5, 0.3);
        s.scale.setScalar(0.25 * (1 - k) + 0.05);
        s.material.opacity = 1 - k;
      }
      s.material.needsUpdate = true;
    }
    for (let i = puff; i < this.puffs.length; i++) this.puffs[i]!.visible = false;
    // weather
    const lay = this.tl.layouts[scene];
    const { rain, snow } = this.weather;
    const wx = lay?.weather || this.worlds[scene]?.doc.weather || "";
    rain.visible = wx === "rain";
    snow.visible = wx === "snow";
    const cx = this.camTrack[n * 6 + 3]!;
    if (rain.visible) {
      const a = rain.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < 600; i++) {
        const x = cx + (((i * 97.13) % 24) - 12), z = ((i * 31.7) % 10) - 6, y = 8 - ((i * 0.53 + n * 0.45) % 9);
        a.setXYZ(i * 2, x, y, z); a.setXYZ(i * 2 + 1, x - 0.05, y - 0.35, z);
      }
      a.needsUpdate = true;
    }
    if (snow.visible) {
      const a = snow.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < 700; i++) a.setXYZ(i, cx + (((i * 97.13) % 24) - 12) + Math.sin(n / 20 + i) * 0.3, 7 - ((i * 0.37 + n * 0.04) % 8), ((i * 31.7) % 12) - 8);
      a.needsUpdate = true;
    }
  }

  /** One finished picture: the 3D world + pop-ups (subtitles / cards / transitions come from the 2D player). */
  protected renderPlain(ctx: CanvasRenderingContext2D, n: number) {
    const f = this.tl.frames[n]!;
    if (f.card) { super.renderPlain(ctx, n); return; }
    if (this.glLost) throw new Error("Chrome's 3D crashed while filming (the graphics card ran out). Close ALL Chrome windows, open Chrome again and press the button again — your video job is kept.");
    this.render3(n);
    ctx.drawImage(this.renderer.domElement, 0, 0, this.W, this.H);
    // pop-ups: in a FREE part of the picture (never over a face or a body), only when it
    // makes sense (not while someone runs / fights), smaller — the spot is chosen once
    this.drawPops(ctx, n, 0, 0, 1, (pop: Pop) => this.popSpot(pop), 0.17);
  }

  private popSpots = new Map<Pop, [number, number] | null>();
  private static BUSY = new Set(["run", "chase", "fight", "kick", "push", "walk-out", "fall", "climb", "jump-rope", "dance", "hug", "high-five", "walk-to", "step-back", "pace"]);
  private popSpot(pop: Pop): [number, number] | null {
    if (this.popSpots.has(pop)) return this.popSpots.get(pop)!;
    let spot: [number, number] | null = null;
    const f = this.tl.frames[Math.min(this.tl.frames.length - 1, pop.frame)];
    const ex = this.extraF[pop.frame];
    const busy = !f || f.chars.some((c) => (c.act && StoryPlayer3D.BUSY.has(c.act)) || c.wact || ex?.get(c.cid)?.walking || c.morph);
    if (!busy) {
      // where everybody is on screen at that moment (boxes from feet to head)
      const cam = new THREE.PerspectiveCamera(this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
      const o = pop.frame * 6;
      cam.position.set(this.camTrack[o]!, this.camTrack[o + 1]!, this.camTrack[o + 2]!);
      cam.lookAt(this.camTrack[o + 3]!, this.camTrack[o + 4]!, this.camTrack[o + 5]!);
      cam.updateMatrixWorld(true);
      const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
      const v = new THREE.Vector3();
      for (const c of f.chars) {
        const tr = this.tracks.get(c.cid);
        if (!tr || ex?.get(c.cid)?.hidden) continue;
        const q = pop.frame * NJ, h = this.heightOf(c);
        v.set(tr[q]!, tr[q + 1]! + h * 1.05, tr[q + 2]!).project(cam);
        const hx = (v.x * 0.5 + 0.5) * this.W, hy = (-v.y * 0.5 + 0.5) * this.H;
        v.set(tr[q]!, tr[q + 1]!, tr[q + 2]!).project(cam);
        const fy = (-v.y * 0.5 + 0.5) * this.H;
        const half = Math.max(30, (fy - hy) * 0.32);
        boxes.push({ x0: hx - half, x1: hx + half, y0: hy - half * 0.4, y1: fy });
      }
      const r = Math.min(this.W, this.H) * 0.17 * 0.78; // the burst's size on screen
      const W = this.W, H = this.H;
      const cands: [number, number][] = [[W * 0.22, H * 0.2], [W * 0.78, H * 0.2], [W * 0.5, H * 0.16], [W * 0.2, H * 0.36], [W * 0.8, H * 0.36], [W * 0.16, H * 0.55], [W * 0.84, H * 0.55]];
      // near the speaker first
      const sp = f.chars.findIndex((c) => c.mouth === "talk-open" || c.mouth === "talk-half");
      const near = sp >= 0 && boxes[sp] ? (boxes[sp]!.x0 + boxes[sp]!.x1) / 2 : W / 2;
      cands.sort((a, b) => Math.abs(a[0] - near) - Math.abs(b[0] - near));
      for (const [cx, cy] of cands) {
        const clear = boxes.every((b) => cx + r < b.x0 || cx - r > b.x1 || cy + r < b.y0 || cy - r > b.y1);
        if (clear) { spot = [cx, cy]; break; }
      }
    }
    this.popSpots.set(pop, spot);
    return spot;
  }
}

