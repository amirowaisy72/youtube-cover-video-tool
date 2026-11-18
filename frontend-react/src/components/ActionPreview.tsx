/**
 * A small live 3D preview of an action (user, 2026-11-18: "show me a preview
 * so I can confirm it is what I wanted"). A character in a little place with
 * the thing the action is done to, doing it again and again — with the
 * real brain, world effects and props the video will use.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { World } from "@/lib/world/world";
import { Brain, type Body } from "@/lib/world/brain";
import { missingThings } from "@/lib/world/auto";
import { kitsOf, loadKitIndex, preloadKits } from "@/lib/world/kits";
import type { CustomAction, WorldDoc } from "@/lib/world/types";
import { buildHuman, type Face, JOINT_KEYS, type Joints, targetJoints } from "@/lib/three3d/human";
import { autoHumanConfig } from "@/lib/player";
import { handProp } from "@/lib/three3d/props";
import { normalizeCharacter, type CharacterConfig } from "@/lib/stickman";

export function ActionPreview({ name, def, thing }: { name: string; def: CustomAction; thing: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([name, def, thing]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let stop = false, raf = 0;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const W = el.clientWidth || 420, H = 240;
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
    (async () => {
      await loadKitIndex();
      const word = (thing || def.thing || "").trim();
      const base: WorldDoc = { version: 1, name: "preview", ground: "grass", time: "day", wind: 0.2, grass: 0.3, objects: [], stage: { x: 0, z: 0, rot: 0 } };
      const miss = word ? missingThings([{ verb: name, word }], () => false, 9, 7) : { objects: [], models: {} };
      // the thing right next to the character
      const objs = miss.objects.map((o) => ({ ...o, x: 1.6, z: -1.2 }));
      await preloadKits(kitsOf(objs));
      if (stop) return;
      const doc: WorldDoc = { ...base, objects: objs, models: miss.models };
      const world = new World(doc, { seed: 3 });
      world.n0 = 0;
      const N = Math.max(24, def.frames || 72), LOOP = N + 40;
      world.n1 = LOOP;
      scene.add(world.group);
      const L = world.light;
      scene.background = new THREE.Color(L.skyBottom);
      scene.add(new THREE.HemisphereLight(new THREE.Color(L.hemiSky).lerp(new THREE.Color("#ffffff"), 0.65), L.hemiGround, L.hemi));
      const sun = new THREE.DirectionalLight(L.sun, L.sunI); sun.position.set(6, 10, 8); scene.add(sun);
      const human = buildHuman(normalizeCharacter(autoHumanConfig("Teddy", false) as unknown as CharacterConfig));
      scene.add(human.root);
      const brain = new Brain([world], () => false, { [name]: def });
      // the whole loop worked out once (the brain decides everything at the start)
      const track: Record<string, number>[] = [];
      const props: string[] = [];
      const held = new Map<string, THREE.Object3D>();
      for (let n = 0; n < LOOP; n++) {
        const c = { cid: "p", x: 0.3, wact: n < N ? { v: name, o: word, t: n, n: N, id: "preview" } : null, stance: "stand", facing: "right" };
        const tj = targetJoints({ pose: "idle", stance: "stand", expr: "normal", talk: 0, energy: 0, walkPhase: 0, walking: false, n, seed: 0.4 });
        const body: Body = { x: -1.2, y: 0, z: 0.2, yaw: 0.9, roll: 0, j: { ...tj } as Record<string, number>, walking: false, ov: false };
        brain.step(n, 0, c, [c], body, () => ({ x: -1.2, z: 0.2 }));
        const prev = track[n - 1];
        const vals: Record<string, number> = { ...body.j, x: body.x, y: body.y, z: body.z, yaw: body.yaw, roll: body.roll };
        if (prev) for (const k of JOINT_KEYS) if (k !== "x" && k !== "y" && k !== "z") vals[k] = prev[k]! + ((vals[k] ?? 0) - prev[k]!) * 0.5;
        track.push(vals);
        props.push(body.prop ?? "");
      }
      const face: Face = { expr: "normal", mouth: null, talk: 0, blink: false, look: "center", tears: false, sweat: false, hold: "", lie: false };
      const hand = new THREE.Vector3();
      let n = 0, last = performance.now();
      const tick = () => {
        if (stop) return;
        const now = performance.now();
        if (now - last >= 1000 / 24) { last = now; n = (n + 1) % LOOP; }
        const v = track[n]!;
        const j = {} as Joints;
        for (const k of JOINT_KEYS) (j as Record<string, number>)[k] = v[k] ?? 0;
        human.apply(j, { ...face, blink: n % 70 < 3 }, n);
        const pn = props[n]!;
        if (pn && !held.has(pn)) {
          const o = handProp(pn), dir = new THREE.Vector3(0, -0.7, 0.7).normalize();
          o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          const g = new THREE.Group(); g.add(o); human.hand("r").add(g); held.set(pn, g);
        }
        for (const [k, o] of held) o.visible = k === pn;
        human.root.updateMatrixWorld(true);
        world.update(n, { hand: (_c, side, out) => { human.hand(side === "l" ? "l" : "r").getWorldPosition(out); return true; }, yawOf: () => j.yaw, walkers: [] });
        human.hand("r").getWorldPosition(hand);
        const tx = (j.x + 1.6) / 2, tz = (j.z - 1.2) / 2;
        cam.position.set(tx + 2.2, 2.2, tz + 5.2);
        cam.lookAt(tx, 0.9, tz);
        renderer.render(scene, cam);
        raf = requestAnimationFrame(tick);
      };
      tick();
    })();
    return () => { stop = true; cancelAnimationFrame(raf); renderer.dispose(); if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <div ref={ref} className="h-[240px] w-full overflow-hidden rounded-lg border border-border bg-black" />;
}
