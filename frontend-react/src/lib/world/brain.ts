/**
 * 3D World — the characters' brain. When the script says
 *   "Teddy: {climb:mango tree} I can see the river!"
 * the brain finds the mango tree, walks Teddy there (around anything in
 * the way), turns him to FACE the trunk, climbs hand over hand, steps onto
 * a branch and sits there, looking at the others — and he stays up there
 * until he climbs down or goes somewhere else. Every interaction works the
 * same way: walk up to the thing, face it, use hands and feet on it, and
 * the world reacts (fruit falls, the branch drops, the door swings, water
 * splashes…). Timings match the backend (sounds land on the right frame).
 */
import * as THREE from "three";
import { HIP_H, SEAT_H } from "../three3d/human";
import type { RObj, Thing, Water, World } from "./world";
import { type CustomAction, WACTS } from "./types";

export type Body = {
  x: number; y: number; z: number; yaw: number; roll: number;
  j: Record<string, number>; // spine, head, arms, legs (see human.ts JOINT_KEYS)
  walking: boolean;
  ov: boolean; // the brain moved this character
  acting?: boolean; // in the middle of doing something (the camera must see it)
  hidden?: boolean;
  mouth?: string | null;
  tool?: "axe" | "rod" | "match" | null;
  prop?: string | null; // anything else in the hand (a custom action: hammer, welding torch…)
  line?: [number, number, number] | null; // fishing line goes to this point
};
export type WAct = { v: string; o: string; t: number; n: number; id: string };
type FrameChar = { cid: string; x: number; wact?: WAct | null; act?: string | null; stance: string; facing: string };
type P = { x: number; z: number };
type Park = { x: number; z: number; y: number; yaw: number; mode: "stand" | "sit" | "perch" | "cling" | "inside" | "hide" | "kneel"; obj?: RObj; faceCam?: boolean };
type Plan = {
  id: string; verb: string; f0: number; N: number; A: number;
  path: P[]; // walk along this in the first A frames
  pose: (t: number, b: Body) => void; // the doing (and anything during the walk)
  after: Park | null | "keep";
  focus: THREE.Vector3[];
  holdAfter?: Thing | null;
  cam?: number; // the camera turns to see it from the side (radians)
};
type CState = {
  scene: number; park: Park | null; plan: Plan | null; hold: Thing | null; ph: number;
  ret: { from: P; fy: number; f0: number; n: number; climbDown: boolean } | null;
  lastAct: string;
};

const TAU = Math.PI * 2;
const ease = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function yawTo(fx: number, fz: number, tx: number, tz: number) { return Math.atan2(tx - fx, tz - fz); }
function wrapNear(a: number, ref: number) { while (a - ref > Math.PI) a -= TAU; while (a - ref < -Math.PI) a += TAU; return a; }
const MOVE_2D = new Set(["walk-to", "step-back", "pace", "run", "chase", "fight", "kick", "push", "hug", "high-five", "walk-out"]);

// ------------------------------------------------------------- body parts
function legsWalk(j: Record<string, number>, ph: number, amp = 0.55, armsToo = true) {
  j.lhx = Math.sin(ph) * amp; j.rhx = Math.sin(ph + Math.PI) * amp;
  j.lk = Math.max(0, Math.sin(ph + 1.6)) * 0.95 * (amp / 0.55); j.rk = Math.max(0, Math.sin(ph + Math.PI + 1.6)) * 0.95 * (amp / 0.55);
  if (armsToo) { j.lsx = Math.sin(ph + Math.PI) * 0.5 * (amp / 0.55); j.rsx = Math.sin(ph) * 0.5 * (amp / 0.55); j.lsz = 0.12; j.rsz = -0.12; j.lex = j.rex = -0.35; j.lez = j.rez = 0; }
  j.spine = (j.spine ?? 0) * 0.3 + 0.06 + (amp > 0.7 ? 0.15 : 0);
}
function legsSit(j: Record<string, number>) { j.lhx = j.rhx = -1.5; j.lk = j.rk = 1.5; }
function legsKneel(j: Record<string, number>) { j.lhx = j.rhx = 0.05; j.lk = j.rk = 1.6; }
function legsCrouch(j: Record<string, number>) { j.lhx = j.rhx = -1.3; j.lk = j.rk = 2.0; }
function legsStand(j: Record<string, number>) { j.lhx = j.rhx = 0; j.lk = j.rk = 0; }
function arm(j: Record<string, number>, side: "l" | "r", sx: number, sz: number, ex: number) {
  j[side + "sx"] = sx; j[side + "sz"] = side === "l" ? sz : -sz; j[side + "ex"] = ex; j[side + "ez"] = 0;
}

/** Reach a hand to a point in the world (two-bone arm). */
function reach(j: Record<string, number>, side: "l" | "r", b: { x: number; y: number; z: number; yaw: number }, t: { x: number; y: number; z: number }) {
  const dx = t.x - b.x, dz = t.z - b.z, dy = t.y - b.y;
  const lx = dx * Math.cos(b.yaw) - dz * Math.sin(b.yaw), lz = dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw);
  const sp = j.spine ?? 0;
  const vy = dy - HIP_H, vz = lz;
  const yy = vy * Math.cos(sp) + vz * Math.sin(sp), zz = -vy * Math.sin(sp) + vz * Math.cos(sp);
  const ux = lx - (side === "l" ? 0.21 : -0.21), uy = yy - 0.38, uz = zz;
  const dist = Math.max(0.05, Math.hypot(ux, uy, uz));
  let sz = Math.asin(clamp(ux / dist, -1, 1));
  let sx = Math.atan2(-uz / dist, -uy / dist);
  const a = 0.23, bb = 0.23;
  let ex = 0;
  if (dist < a + bb) {
    const cosE = clamp((a * a + bb * bb - dist * dist) / (2 * a * bb), -1, 1);
    ex = -(Math.PI - Math.acos(cosE));
    sx += Math.acos(clamp((a * a + dist * dist - bb * bb) / (2 * a * dist), -1, 1));
  }
  sx = clamp(sx, -3.2, 0.9);
  if (side === "l") sz = clamp(sz, -0.5, 2.8); else sz = clamp(sz, -2.8, 0.5);
  j[side + "sx"] = sx; j[side + "sz"] = sz; j[side + "ex"] = ex; j[side + "ez"] = 0;
}

// ------------------------------------------------------------------ brain
export class Brain {
  private st = new Map<string, CState>();
  focus: THREE.Vector3[][] = [];
  hiddenAt: Set<string>[] = [];
  camYaw: (number | undefined)[] = [];
  private assist = new Map<string, { f0: number; f1: number; to: THREE.Vector3 }>();

  constructor(
    private worlds: (World | null)[],
    private isAnimal: (cid: string) => boolean,
    private customs: Record<string, CustomAction> = {},
  ) {}

  private state(cid: string, scene: number): CState {
    let s = this.st.get(cid);
    if (!s || s.scene !== scene) {
      s = { scene, park: null, plan: null, hold: null, ph: 0, ret: null, lastAct: "" };
      this.st.set(cid, s);
    }
    return s;
  }

  /** Called for every character on every frame (in order). Changes `b`. */
  step(n: number, scene: number, c: FrameChar, all: FrameChar[], b: Body, pos2d: (cid: string) => P) {
    const w = this.worlds[scene];
    if (!this.focus[n]) this.focus[n] = [];
    if (!this.hiddenAt[n]) this.hiddenAt[n] = new Set();
    const s = this.state(c.cid, scene);
    if (!w) return;
    const animal = this.isAnimal(c.cid);
    // a new interaction starts
    if (c.wact && (!s.plan || s.plan.id !== c.wact.id)) {
      // the last thing finished right now: stand where it left us first
      if (s.plan) { if (s.plan.after !== "keep") s.park = s.plan.after; s.plan = null; }
      s.ret = null;
      s.plan = this.plan(n - c.wact.t, c, all, s, b, w, pos2d, animal);
    }
    const p = s.plan;
    if (p && n < p.f0 + p.N) {
      const t = n - p.f0;
      b.ov = true;
      b.acting = true;
      if (t < p.A && p.path.length > 1) this.walk(b, p.path, t / p.A, s, animal, w);
      else if (p.path.length) { const e = p.path[p.path.length - 1]!; b.x = e.x; b.z = e.z; b.y = w.heightAt(e.x, e.z, true); }
      p.pose(t, b);
      this.focus[n]!.push(...p.focus, new THREE.Vector3(b.x, b.y + 1.2, b.z));
      if (p.cam !== undefined && t >= p.A * 0.6) this.camYaw[n] = p.cam;
      if (b.hidden) this.hiddenAt[n]!.add(c.cid);
      return;
    }
    if (p && n >= p.f0 + p.N) {
      if (p.after !== "keep") s.park = p.after;
      s.plan = null;
    }
    // parked (up a tree, sitting on a rock, inside the hut…) until something moves them
    if (s.park && c.act && MOVE_2D.has(c.act) && s.lastAct !== c.act) {
      const home = pos2d(c.cid);
      const d = Math.hypot(home.x - s.park.x, home.z - s.park.z);
      s.ret = { from: { x: s.park.x, z: s.park.z }, fy: s.park.y, f0: n, n: Math.round(clamp(d / 0.09, 8, 40)) + (s.park.mode === "perch" || s.park.mode === "cling" ? 24 : 0), climbDown: s.park.mode === "perch" || s.park.mode === "cling" };
      s.park = null;
    }
    s.lastAct = c.act ?? "";
    if (s.ret) {
      const t = n - s.ret.f0;
      if (t < s.ret.n) {
        b.ov = true;
        b.acting = true;
        const home = pos2d(c.cid);
        const down = s.ret.climbDown ? 24 : 0;
        if (t < down) { b.x = s.ret.from.x; b.z = s.ret.from.z; b.y = lerp(s.ret.fy, 0, ease(t / down)); this.limbsClimb(b, t * 0.5, animal); return; }
        this.walk(b, [s.ret.from, home], (t - down) / Math.max(1, s.ret.n - down), s, animal, w);
        return;
      }
      s.ret = null;
    }
    if (s.park) this.parked(n, c, all, s, b, w, animal);
    // helping someone (taking what they give)
    const as = this.assist.get(c.cid);
    if (as && n >= as.f0 && n <= as.f1 && !animal) reach(b.j, "r", b, as.to);
    if (s.hold && !animal && !s.park?.mode?.match(/inside/)) { b.j.rsx = Math.min(b.j.rsx ?? 0, -0.75); b.j.rex = -1.1; }
  }

  // ---------------------------------------------------------- staying put
  private parked(n: number, c: FrameChar, all: FrameChar[], s: CState, b: Body, w: World, animal: boolean) {
    const k = s.park!;
    b.ov = true;
    b.x = k.x; b.z = k.z; b.y = k.y;
    b.walking = false;
    // look at whoever else is here (and a bit at the camera)
    let others = all.filter((o) => o.cid !== c.cid).map((o) => this.st.get(o.cid)?.park ?? null).filter(Boolean) as Park[];
    void others;
    const tgt = this.lookTarget(c, all);
    const want = tgt ? yawTo(k.x, k.z, tgt.x, tgt.z) * 0.65 : 0;
    if (k.mode === "cling") b.yaw = k.yaw;
    else if (k.mode === "perch" || k.mode === "sit") b.yaw = clamp(want, -0.8, 0.8) + (k.faceCam ? 0 : k.yaw * 0);
    else if (k.mode === "inside") { b.hidden = true; this.hiddenAt[n]!.add(c.cid); }
    else b.yaw = want;
    if (animal) { if (k.mode === "cling") b.roll = Math.PI / 2 - 0.25; return; }
    const j = b.j;
    if (k.mode === "sit" || k.mode === "perch") legsSit(j);
    else if (k.mode === "kneel") legsKneel(j);
    else if (k.mode === "hide") { legsCrouch(j); j.spine = 0.45; j.headX = -0.2; }
    else if (k.mode === "cling") {
      legsStand(j); j.lhx = j.rhx = -0.5; j.lk = j.rk = 0.9;
      arm(j, "l", -2.5, 0.25, -0.6); arm(j, "r", -2.2, 0.25, -0.8);
      j.headY = clamp(Math.PI - Math.abs(b.yaw), -1.2, 1.2) * (b.yaw > 0 ? 1 : -1); // turns his head to talk
    } else legsStand(j);
    if (c.stance.startsWith("walk")) legsStand(j);
  }
  private lookTarget(c: FrameChar, all: FrameChar[]): P | null {
    let best: P | null = null, bd = 1e9;
    const me = this.lastPos.get(c.cid);
    if (!me) return null;
    for (const o of all) {
      if (o.cid === c.cid) continue;
      const p = this.lastPos.get(o.cid);
      if (!p) continue;
      const d = Math.hypot(p.x - me.x, p.z - me.z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  /** The player tells the brain where everyone ended up (after smoothing). */
  lastPos = new Map<string, P>();

  // ---------------------------------------------------------------- walking
  private route(w: World, from: P, to: P, ignore?: RObj | null): P[] {
    const path: P[] = [from];
    let cur = from;
    for (let k = 0; k < 3; k++) {
      let hit: { x: number; z: number; r: number } | null = null, best = 1e9;
      for (const s of w.solids) {
        if (ignore && Math.hypot(s.x - ignore.pos.x, s.z - ignore.pos.z) < 0.05) continue;
        if (Math.hypot(s.x - to.x, s.z - to.z) < s.r + 0.05) continue;
        const dx = to.x - cur.x, dz = to.z - cur.z, L = Math.hypot(dx, dz);
        if (L < 0.01) break;
        const u = clamp(((s.x - cur.x) * dx + (s.z - cur.z) * dz) / (L * L), 0, 1);
        const px = cur.x + dx * u, pz = cur.z + dz * u;
        const d = Math.hypot(s.x - px, s.z - pz);
        if (d < s.r + 0.3 && u > 0.02 && u < 0.98 && u * L < best) { best = u * L; hit = s; }
      }
      if (!hit) break;
      const dx = to.x - cur.x, dz = to.z - cur.z, L = Math.hypot(dx, dz);
      let nx = -dz / L, nz = dx / L;
      if ((hit.x - cur.x) * nx + (hit.z - cur.z) * nz > 0) { nx = -nx; nz = -nz; }
      const wp = { x: hit.x + nx * (hit.r + 0.55), z: hit.z + nz * (hit.r + 0.55) };
      path.push(wp);
      cur = wp;
    }
    path.push(to);
    return path;
  }
  private walk(b: Body, path: P[], k: number, s: CState, animal: boolean, w: World) {
    let total = 0;
    const segs: number[] = [];
    for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.z - path[i - 1]!.z); segs.push(d); total += d; }
    const kk = ease(clamp(k, 0, 1)) * 0.15 + clamp(k, 0, 1) * 0.85;
    let d = kk * total, i = 0;
    while (i < segs.length - 1 && d > segs[i]!) { d -= segs[i]!; i++; }
    const a = path[i]!, c = path[i + 1] ?? a;
    const u = segs[i] ? clamp(d / segs[i]!, 0, 1) : 1;
    b.x = lerp(a.x, c.x, u); b.z = lerp(a.z, c.z, u);
    const wt = w.waterAt(b.x, b.z);
    b.y = w.onBridge(b.x, b.z) ? w.heightAt(b.x, b.z, true) : wt ? -Math.min(0.55, w.heightAt(b.x, b.z) * -0.7) : w.heightAt(b.x, b.z, true);
    if (total > 0.05 && k < 1) {
      b.yaw = yawTo(a.x, a.z, c.x, c.z);
      b.walking = true;
      const speed = total / Math.max(1, 1);
      void speed;
      s.ph += 0.36;
      if (!animal) legsWalk(b.j, s.ph, total > 4 ? 0.85 : 0.55);
    }
  }
  private limbsClimb(b: Body, ph: number, animal: boolean) {
    if (animal) { b.roll = Math.PI / 2 - 0.25; b.walking = true; return; }
    const j = b.j, up = Math.sin(ph);
    arm(j, "l", -2.75 + 0.35 * up, 0.28, -0.45 - 0.35 * Math.max(0, up));
    arm(j, "r", -2.75 - 0.35 * up, 0.28, -0.45 - 0.35 * Math.max(0, -up));
    j.lhx = -0.75 - 0.45 * Math.max(0, -up); j.lk = 1.1 + 0.6 * Math.max(0, -up);
    j.rhx = -0.75 - 0.45 * Math.max(0, up); j.rk = 1.1 + 0.6 * Math.max(0, up);
    j.spine = 0.12; j.headX = -0.35;
  }

  // ---------------------------------------------------------------- plans
  private plan(f0: number, c: FrameChar, all: FrameChar[], s: CState, b: Body, w: World, pos2d: (cid: string) => P, animal: boolean): Plan {
    const wa = c.wact!;
    const cd = this.customs[wa.v];
    if (cd) return this.planCustom(f0, c, s, b, w, animal, cd);
    const spec = WACTS[wa.v] ?? { n: wa.n, a: 0 };
    const N = wa.n, A = Math.min(spec.a, N);
    const me: P = s.park ? { x: s.park.x, z: s.park.z } : { x: b.x, z: b.z };
    const startY = s.park?.y ?? 0;
    const fromTree = s.park && (s.park.mode === "perch" || s.park.mode === "cling");
    const id = wa.id;
    const hand = (bb: Body, side = 0.2) => new THREE.Vector3(bb.x + Math.sin(bb.yaw + Math.PI / 2) * -side, bb.y + 1.25, bb.z + Math.cos(bb.yaw + Math.PI / 2) * -side);
    const hit = (i: number) => f0 + (spec.hits?.[i] ?? Math.round(N / 2));
    const base: Plan = { id, verb: wa.v, f0, N, A, path: [me], pose: () => {}, after: "keep", focus: [] };
    const otherCids = all.filter((o) => o.cid !== c.cid).map((o) => o.cid);
    // a step down from the tree first, if needed (folded into the walk)
    const preDown = (t: number, bb: Body) => {
      if (fromTree && t < 14 && wa.v !== "climb-down") { bb.y = lerp(startY, 0, ease(t / 14)); this.limbsClimb(bb, t * 0.5, animal); }
    };
    const standAt = (to: P, ignore: RObj | null = null): P[] => this.route(w, me, to, ignore);
    const nearestOther = (): { cid: string; p: P } | null => {
      let best: { cid: string; p: P } | null = null, bd = 1e9;
      for (const o of otherCids) { const p = this.lastPos.get(o) ?? pos2d(o); const d = Math.hypot(p.x - me.x, p.z - me.z); if (d < bd) { bd = d; best = { cid: o, p }; } }
      return best;
    };
    const word = wa.o;
    const v = wa.v;
    const sideOf = (o: RObj, dist: number): P => {
      // the side the character comes from, but towards the camera (+z) so we see them
      const dx = me.x - o.pos.x, dz = me.z - o.pos.z, L = Math.hypot(dx, dz) || 1;
      const ux = dx / L * 0.6, uz = Math.max(0.2, dz / L) * 0.6 + 0.9;
      const L2 = Math.hypot(ux, uz);
      return { x: o.pos.x + (ux / L2) * dist, z: o.pos.z + (uz / L2) * dist };
    };
    const parkStand = (p: P, yaw = 0): Park => ({ x: p.x, z: p.z, y: w.heightAt(p.x, p.z, true), yaw, mode: "stand" });
    const findThing = (need: "pickable" | "eatable" | "throwable" | "kickable" | "pushable") => {
      const f = w.find(word, me, need);
      return f?.thing ?? null;
    };

    // ------------------------------------------------ go / return / cross
    if (v === "return") {
      const home = pos2d(c.cid);
      return { ...base, path: standAt(home), pose: (t, bb) => preDown(t, bb), after: null };
    }
    if (v === "go" || v === "cross") {
      const f = w.find(word, me);
      let to: P = { x: me.x + 2, z: me.z };
      const wat = w.waters.find((x) => x.obj === f?.obj);
      if (wat) { const nr = wat.nearest(me.x, me.z); to = { x: nr.bx, z: nr.bz }; if (v === "cross") to = { x: nr.x * 2 - nr.bx, z: nr.z * 2 - nr.bz }; }
      else if (f?.obj) { to = f.obj.b.bridge ? this.bridgeEnds(f.obj, me)[1] : { x: f.obj.front.x, z: f.obj.front.z }; }
      else if (f?.thing) { const p = w.thingRest(f.thing); to = { x: p.x + (me.x - p.x > 0 ? 0.6 : -0.6), z: p.z + 0.2 }; }
      let path = standAt(to, f?.obj ?? null);
      if (f?.obj?.b.bridge) { const [a, z] = this.bridgeEnds(f.obj, me); path = [...standAt(a), z, { x: z.x + (z.x - a.x) * 0.15, z: z.z + (z.z - a.z) * 0.15 }]; }
      const end = path[path.length - 1]!;
      return { ...base, path, pose: (t, bb) => preDown(t, bb), after: parkStand(end), focus: [new THREE.Vector3(end.x, 1, end.z)] };
    }

    // --------------------------------------------------------------- climb
    if (v === "climb") {
      const f = w.find(word, me, "climbable");
      const o = f?.obj && f.obj.b.climb && !f.obj.chop ? f.obj : null;
      if (!o) return { ...base, pose: (t, bb) => { if (!animal) { arm(bb.j, "r", -2.6, 0.2, -0.3); } void t; } };
      const cl = o.b.climb!;
      const at = cl.ladder ? { x: o.front.x, z: o.front.z } : sideOf(o, cl.trunkR + (animal ? 0.25 : 0.36));
      const at2 = cl.ladder ? { x: o.pos.x + (o.front.x - o.pos.x) * 0.25, z: o.pos.z + (o.front.z - o.pos.z) * 0.25 } : at;
      const face = yawTo(at.x, at.z, o.pos.x, o.pos.z);
      const perch = cl.perch ? o.b.root.localToWorld(cl.perch.clone()) : null;
      const top = cl.top + o.pos.y;
      const climbEnd = 80;
      return {
        ...base, path: standAt(at, o), focus: [new THREE.Vector3(o.pos.x, top + 1.2, o.pos.z)], cam: (o.pos.x >= 0 ? 1 : -1) * 0.6,
        pose: (t, bb) => {
          preDown(t, bb);
          if (t < A) return;
          const k = clamp((t - A) / (climbEnd - A), 0, 1);
          bb.walking = false;
          if (t < climbEnd) {
            bb.yaw = face;
            bb.x = lerp(at.x, at2.x, k); bb.z = lerp(at.z, at2.z, k);
            bb.y = o.pos.y + top * ease(k);
            this.limbsClimb(bb, (t - A) * 0.42, animal);
          } else if (perch) {
            const k2 = ease((t - climbEnd) / 12);
            bb.x = lerp(at2.x, perch.x, k2); bb.z = lerp(at2.z, perch.z, k2);
            const seatY = perch.y + 0.04 - HIP_H;
            bb.y = lerp(o.pos.y + top, seatY, k2);
            bb.yaw = lerp(face, 0, k2);
            if (!animal) { legsSit(bb.j); arm(bb.j, "l", -0.6, 0.6, -0.5); }
          } else {
            bb.yaw = face; bb.y = o.pos.y + top;
            this.limbsClimb(bb, 0, animal);
          }
        },
        after: perch ? { x: perch.x, z: perch.z, y: perch.y + 0.04 - HIP_H, yaw: 0, mode: "perch", obj: o, faceCam: true }
          : { x: at2.x, z: at2.z, y: o.pos.y + top, yaw: face, mode: "cling", obj: o },
      };
    }
    if (v === "climb-down") {
      const o = s.park?.obj;
      if (!fromTree || !o) return { ...base, after: "keep" };
      const cl = o.b.climb!;
      const at = cl.ladder ? { x: o.front.x, z: o.front.z } : sideOf(o, cl.trunkR + 0.36);
      const face = yawTo(at.x, at.z, o.pos.x, o.pos.z);
      const top = cl.top + o.pos.y;
      const from = { x: s.park!.x, z: s.park!.z, y: s.park!.y };
      return {
        ...base, path: [me], focus: [new THREE.Vector3(o.pos.x, 1, o.pos.z)],
        pose: (t, bb) => {
          bb.walking = false;
          if (t < 12) { const k = ease(t / 12); bb.x = lerp(from.x, at.x, k); bb.z = lerp(from.z, at.z, k); bb.y = lerp(from.y, top, k); bb.yaw = lerp(0, face, k); this.limbsClimb(bb, 0, animal); }
          else if (t < 52) { bb.x = at.x; bb.z = at.z; bb.yaw = face; bb.y = top * (1 - ease((t - 12) / 40)); this.limbsClimb(bb, (t - 12) * 0.45, animal); }
          else { bb.x = at.x; bb.z = at.z; bb.y = 0; bb.yaw = lerp(face, 0, ease((t - 52) / 8)); if (!animal) { bb.j.lk = bb.j.rk = 0.6 * (1 - (t - 52) / 8); bb.j.lhx = bb.j.rhx = -0.3 * (1 - (t - 52) / 8); } }
        },
        after: parkStand(at),
      };
    }

    // ------------------------------------------------- pick / carry / eat
    if (v === "pick" || v === "carry" || v === "eat") {
      if (v === "eat" && s.hold && (s.hold.edible || !word)) {
        const th = s.hold;
        w.eat(th, f0, c.cid, animal ? "m" : "r", (spec.hits ?? [34, 42, 50]).map((h) => f0 + h));
        s.hold = null;
        return {
          ...base, path: [me], after: "keep", pose: (t, bb) => {
            preDown(t, bb);
            if (animal) { bb.mouth = (t >> 2) % 2 ? "talk-open" : null; return; }
            const head = { x: bb.x + Math.sin(bb.yaw) * 0.25, y: bb.y + 1.28, z: bb.z + Math.cos(bb.yaw) * 0.25 };
            if (t > 20) { reach(bb.j, "r", bb, head); bb.mouth = (t >> 2) % 2 ? "talk-open" : "talk-half"; }
          },
        };
      }
      // fishing for it?
      if (/fish/.test(word)) { const wat = w.waters.find((x) => x.kind !== "well"); if (wat) return this.planFish(base, c, s, w, wat, me, animal, f0, spec); }
      const th = findThing(v === "eat" ? "eatable" : "pickable") ?? findThing("pickable");
      if (!th) return { ...base, pose: (t, bb) => { if (!animal && t > 10) reach(bb.j, "r", bb, { x: bb.x + Math.sin(bb.yaw) * 0.5, y: 0.2, z: bb.z + Math.cos(bb.yaw) * 0.5 }); } };
      const tp = w.thingAt(th, f0 + (spec.hits?.[0] ?? 40));
      const onMyTree = fromTree && s.park?.obj && th.owner === s.park.obj && w.isHome(th, f0);
      const high = !onMyTree && w.isHome(th, f0) && th.reach === "high";
      const grabAt = v === "eat" ? 30 : (spec.hits?.[0] ?? 40);
      if (high && th.owner) {
        // too high: shake the tree until it falls, then pick it up from the ground
        const o = th.owner;
        const at = sideOf(o, (o.b.climb?.trunkR ?? 0.25) + 0.4);
        w.shake(o, f0 + A, f0 + A + 10);
        w.fall(th, f0 + A + 4, new THREE.Vector3((me.x - tp.x) * 0.012, 0.02, (me.z - tp.z) * 0.012));
        const land = w.thingAt(th, f0 + grabAt);
        const grabPos = { x: land.x + (at.x - land.x) * 0.3, z: land.z + (at.z - land.z) * 0.3 };
        this.grab(w, th, f0 + grabAt, c.cid, animal, v === "eat", spec, f0, s);
        return {
          ...base, path: standAt(at, o), focus: [land.clone().setY(1)],
          pose: (t, bb) => {
            preDown(t, bb);
            if (t < A) return;
            if (t < A + 12) { bb.yaw = yawTo(bb.x, bb.z, o.pos.x, o.pos.z); if (!animal) { reach(bb.j, "l", bb, { x: o.pos.x, y: 1.2, z: o.pos.z }); reach(bb.j, "r", bb, { x: o.pos.x, y: 1.0, z: o.pos.z }); bb.x += Math.sin(t * 1.8) * 0.05; } return; }
            const k = ease((t - A - 12) / Math.max(1, grabAt - A - 12));
            bb.x = lerp(at.x, grabPos.x, k); bb.z = lerp(at.z, grabPos.z, k);
            bb.walking = k < 1 && k > 0; if (bb.walking) { s.ph += 0.3; if (!animal) legsWalk(bb.j, s.ph); }
            bb.yaw = yawTo(bb.x, bb.z, land.x, land.z);
            if (t >= grabAt - 8) this.bendTo(bb, land, t - (grabAt - 8), animal);
            this.afterGrab(bb, t, grabAt, v === "eat", animal);
          },
          after: parkStand(grabPos),
        };
      }
      const ground = !w.isHome(th, f0) || th.reach === "ground" || th.big;
      const stand: P = onMyTree ? me : { x: tp.x + (me.x > tp.x ? 0.42 : -0.42), z: tp.z + 0.22 };
      this.grab(w, th, f0 + grabAt, c.cid, animal, v === "eat", spec, f0, s, th.big ? "c" : undefined);
      return {
        ...base, path: onMyTree ? [me] : standAt(stand, th.owner), focus: [tp.clone()],
        pose: (t, bb) => {
          if (!onMyTree) preDown(t, bb);
          if (t < A) return;
          if (!onMyTree) bb.yaw = yawTo(bb.x, bb.z, tp.x, tp.z);
          if (onMyTree && !animal) legsSit(bb.j);
          if (t < grabAt + 2) {
            if (ground && !onMyTree) this.bendTo(bb, tp, t - A, animal);
            else if (!animal) { reach(bb.j, "r", bb, tp); bb.j.headX = -0.4; if (!onMyTree) bb.y += 0.04 * Math.min(1, (t - A) / 6); }
          }
          this.afterGrab(bb, t, grabAt, v === "eat", animal);
        },
        after: onMyTree ? "keep" : parkStand(stand),
      };
    }

    // --------------------------------------------------------------- shake
    if (v === "shake") {
      const f = w.find(word || "tree", me, "shakeable");
      const o = f?.obj ?? f?.thing?.owner ?? null;
      if (!o) return base;
      const at = sideOf(o, (o.b.climb?.trunkR ?? 0.25) + 0.4);
      w.shake(o, f0 + A, f0 + N - 8);
      const fruit = w.things.filter((t) => t.owner === o && t.kind !== "branch" && w.isHome(t, f0)).slice(0, 3);
      fruit.forEach((t, i) => w.fall(t, hit(i), new THREE.Vector3((Math.sin(i * 2.3)) * 0.02, 0.02, 0.015)));
      return {
        ...base, path: standAt(at, o), focus: [new THREE.Vector3(o.pos.x, 2.4, o.pos.z)],
        pose: (t, bb) => {
          preDown(t, bb);
          if (t < A) return;
          bb.yaw = yawTo(at.x, at.z, o.pos.x, o.pos.z);
          const wob = Math.sin((t - A) * 1.8);
          bb.x = at.x + Math.sin(bb.yaw) * wob * 0.06; bb.z = at.z + Math.cos(bb.yaw) * wob * 0.06;
          if (animal) return;
          bb.j.spine = 0.15 + wob * 0.12;
          reach(bb.j, "l", bb, { x: o.pos.x - Math.cos(bb.yaw) * 0.12, y: 1.15, z: o.pos.z + Math.sin(bb.yaw) * 0.12 });
          reach(bb.j, "r", bb, { x: o.pos.x + Math.cos(bb.yaw) * 0.12, y: 1.0, z: o.pos.z - Math.sin(bb.yaw) * 0.12 });
          bb.j.lhx = -0.25; bb.j.rhx = 0.3; bb.j.lk = 0.3;
          bb.mouth = "talk-half";
        },
        after: parkStand(at),
      };
    }

    // ---------------------------------------------------------- cut / chop
    if (v === "cut" || v === "chop") {
      const f = w.find(word || "tree", me, v === "chop" ? "choppable" : "branches_cut");
      const o = f?.obj ?? f?.thing?.owner ?? null;
      if (!o || o.chop) return base;
      const dist = v === "chop" ? (o.b.climb?.trunkR ?? 0.25) + 0.7 : 0.95;
      const at = v === "cut" && !fromTree ? { x: o.front.x + (o.front.x - o.pos.x) * 0.05, z: o.front.z } : sideOf(o, dist);
      const hits = spec.hits ?? [40, 54, 68];
      if (v === "cut") w.cutBranch(o, hits[hits.length - 1]! + f0);
      else {
        // fall away from the character, never towards the camera
        let dir = yawTo(at.x, at.z, o.pos.x, o.pos.z);
        if (Math.cos(dir) > -0.2) dir = Math.sign(Math.sin(dir) || 1) * 2.0;
        w.chop(o, f0 + hits[hits.length - 1]! + 2, dir);
      }
      return {
        ...base, path: standAt(at, o), focus: [new THREE.Vector3(o.pos.x, v === "chop" ? 1.5 : 2.2, o.pos.z)], after: parkStand(at), cam: (at.x >= 0 ? 1 : -1) * 0.45,
        pose: (t, bb) => {
          preDown(t, bb);
          if (t < A) return;
          bb.yaw = yawTo(at.x, at.z, o.pos.x, o.pos.z) + (v === "chop" ? -0.5 : 0);
          bb.tool = animal ? null : "axe";
          if (animal) return;
          // swings: lift … hit on every hit frame
          let k = 1;
          for (const h of hits) { const d = t - h; if (d > -12 && d <= 2) { k = d <= 0 ? 1 - Math.max(0, (d + 12) / 12) ** 2 : 0; break; } if (t < hits[0]! - 12) k = (t - A) / Math.max(1, hits[0]! - 12 - A); }
          k = clamp(k, 0, 1); // 1 = lifted, 0 = hit
          if (v === "cut") {
            arm(bb.j, "r", lerp(-1.25, -2.95, k), 0.15, lerp(-0.15, -0.9, k));
            arm(bb.j, "l", lerp(-1.15, -2.85, k), 0.05, lerp(-0.3, -1.0, k));
            bb.j.spine = lerp(0.15, -0.2, k); bb.j.headX = -0.45;
          } else {
            bb.yaw += lerp(0.45, -0.55, k);
            arm(bb.j, "r", -1.35, lerp(0.15, 1.0, k), lerp(-0.1, -0.7, k));
            arm(bb.j, "l", -1.3, lerp(-0.3, 0.6, k), lerp(-0.2, -0.8, k));
            bb.j.spine = 0.25; bb.j.spineZ = lerp(-0.1, 0.15, k);
          }
          bb.j.lhx = -0.2; bb.j.rhx = 0.25; bb.j.lk = 0.25;
          bb.mouth = k < 0.2 ? "o" : null;
        },
      };
    }

    // ------------------------------------------------------------ throwing
    if (v === "throw" || v === "drop" || v === "give") {
      let th = s.hold && (!word || s.hold.words.some((x) => x.includes(word.replace(/s$/, ""))) || v !== "give") ? s.hold : null;
      if (!th) {
        th = findThing("throwable") ?? findThing("pickable");
        if (th) { w.hold(th, f0, c.cid, animal ? "m" : "r"); }
      }
      if (!th) return base;
      s.hold = null;
      if (v === "drop") {
        w.fling(th, hit(0), new THREE.Vector3(me.x + Math.sin(b.yaw) * 0.35, 1.0, me.z + Math.cos(b.yaw) * 0.35), new THREE.Vector3(0, 0, 0), 0.1);
        return { ...base, pose: (t, bb) => { if (!animal && t < 10) arm(bb.j, "r", -0.9, 0.1, -0.3); } };
      }
      if (v === "give") {
        const o = nearestOther();
        if (!o) return base;
        const to = { x: o.p.x + (me.x > o.p.x ? 0.75 : -0.75), z: o.p.z + 0.1 };
        const handAt = new THREE.Vector3((to.x + o.p.x) / 2, 1.15, (to.z + o.p.z) / 2);
        w.hold(th, hit(0), o.cid, this.isAnimal(o.cid) ? "m" : "r");
        this.assist.set(o.cid, { f0: hit(0) - 8, f1: hit(0) + 4, to: handAt });
        const other = this.st.get(o.cid);
        if (other) other.hold = th;
        return {
          ...base, path: standAt(to), after: parkStand(to), focus: [handAt],
          pose: (t, bb) => { preDown(t, bb); if (t >= A) { bb.yaw = yawTo(bb.x, bb.z, o.p.x, o.p.z); if (!animal && t < hit(0) - f0 + 4) reach(bb.j, "r", bb, handAt); } },
        };
      }
      // throw: at a friend (just missing), or into the water
      const o = nearestOther();
      const wat = w.waters.find((x) => x.kind !== "well");
      const intoWater = !!wat && (!o || (id.length % 2 === 0));
      let to: THREE.Vector3;
      if (intoWater && wat) { const nr = wat.nearest(me.x, me.z); to = new THREE.Vector3(nr.x, 0.05, nr.z); }
      else if (o) to = new THREE.Vector3(o.p.x + 0.55, 0.1, o.p.z + 0.4);
      else to = new THREE.Vector3(me.x + 4, 0.1, me.z - 1.5);
      const face = yawTo(me.x, me.z, to.x, to.z);
      const rel = hit(0);
      const from = new THREE.Vector3(me.x + Math.sin(face) * 0.35 - Math.cos(face) * 0.2, startY + 1.75, me.z + Math.cos(face) * 0.35 + Math.sin(face) * 0.2);
      w.throwTo(th, rel, from, to, Math.round(clamp(Math.hypot(to.x - me.x, to.z - me.z) * 3.2, 14, 32)));
      return {
        ...base, path: [me], after: "keep", focus: [to.clone().setY(0.8)],
        pose: (t, bb) => {
          bb.yaw = face;
          if (animal) return;
          const k = t < 14 ? t / 14 : t < 18 ? 1 - (t - 14) / 4 : 0;
          arm(bb.j, "r", lerp(-1.0, -2.9, ease(k)), lerp(0.2, 0.35, k), lerp(-0.1, -1.4, k));
          arm(bb.j, "l", lerp(-1.4, -0.6, k), 0.3, -0.3);
          bb.j.spine = lerp(0.35, -0.25, k); bb.j.spineZ = lerp(0, 0.1, k);
          bb.j.lhx = -0.35; bb.j.rhx = 0.3;
        },
      };
    }

    // ----------------------------------------------------- swim / fish / drink
    if (v === "swim" || v === "fish" || v === "drink") {
      const f = w.find(word || "water", me, v === "drink" ? "drinkable" : "swimmable");
      const wat = w.waters.find((x) => x.obj === f?.obj) ?? (v === "drink" ? null : w.waters[0] ?? null);
      if (v === "drink" && !wat && f?.obj?.o.type === "well") return this.planDrink(base, c, s, w, null, f.obj, me, animal, f0);
      if (!wat) return base;
      if (v === "fish") return this.planFish(base, c, s, w, wat, me, animal, f0, spec);
      if (v === "drink") return this.planDrink(base, c, s, w, wat, null, me, animal, f0);
      // swim
      const nr = wat.nearest(me.x, me.z);
      const bank = { x: nr.bx, z: nr.bz };
      const inX = nr.x + (nr.bx - nr.x) * 0.25, inZ = nr.z + (nr.bz - nr.z) * 0.25;
      const swimY = animal ? -0.35 : -0.86;
      w.splash(f0 + 30, inX, inZ, 1.6);
      for (let k = 46; k < 118; k += 12) { const p = this.swimPos(nr, inX, inZ, (k - 34) / 86); w.splash(f0 + k, p.x, p.z, 0.45); }
      return {
        ...base, path: standAt(bank), after: parkStand(bank), focus: [new THREE.Vector3(nr.x, 0.4, nr.z)], cam: (bank.x >= 0 ? 1 : -1) * 0.9,
        pose: (t, bb) => {
          preDown(t, bb);
          if (t < A) return;
          bb.walking = false;
          if (t < 34) { // jump in
            const k = (t - A) / 10;
            bb.x = lerp(bank.x, inX, k); bb.z = lerp(bank.z, inZ, k);
            bb.y = lerp(0, swimY, k) + Math.sin(k * Math.PI) * 0.6;
            bb.yaw = yawTo(bank.x, bank.z, inX, inZ);
            if (!animal) { arm(bb.j, "l", -2.9, 0.2, 0); arm(bb.j, "r", -2.9, 0.2, 0); bb.j.lhx = bb.j.rhx = -0.4; }
            return;
          }
          if (t < 120) {
            const k = (t - 34) / 86;
            const p = this.swimPos(nr, inX, inZ, k), p2 = this.swimPos(nr, inX, inZ, k + 0.01);
            bb.x = p.x; bb.z = p.z; bb.y = swimY + Math.sin(t / 5) * 0.03;
            bb.yaw = yawTo(p.x, p.z, p2.x, p2.z);
            if (!animal) {
              const ph = t * 0.32;
              bb.j.spine = 1.0; bb.j.headX = -0.75;
              arm(bb.j, "l", -2.2 + Math.sin(ph) * 0.9, 0.35, -0.3);
              arm(bb.j, "r", -2.2 - Math.sin(ph) * 0.9, 0.35, -0.3);
              bb.j.lhx = Math.sin(ph * 2) * 0.35; bb.j.rhx = -Math.sin(ph * 2) * 0.35; bb.j.lk = bb.j.rk = 0.3;
              bb.mouth = "talk-half";
            } else bb.walking = true;
            return;
          }
          const k = ease((t - 120) / 24);
          const p = this.swimPos(nr, inX, inZ, 1);
          bb.x = lerp(p.x, bank.x, k); bb.z = lerp(p.z, bank.z, k); bb.y = lerp(swimY, 0, k);
          bb.yaw = yawTo(p.x, p.z, bank.x, bank.z);
          s.ph += 0.3; if (!animal) legsWalk(bb.j, s.ph);
          bb.walking = true;
        },
      };
    }

    // ------------------------------------------------------------- sitting
    if (v === "sit") {
      const f = w.find(word, me, "sittable");
      const o = f?.obj && f.obj.b.seatH ? f.obj : null;
      if (!o) {
        return { ...base, after: { x: me.x, z: me.z, y: 0.25 - HIP_H, yaw: 0, mode: "sit" }, pose: (t, bb) => { preDown(t, bb); if (!animal) { const k = ease(t / 12); bb.y = lerp(0, 0.25 - HIP_H + 0.3, k) - 0.3 * k; legsSit(bb.j); } } };
      }
      const taken = [...this.st.values()].filter((x) => x.park?.obj === o && x.park.mode === "sit").length;
      const seat = o.b.root.localToWorld(new THREE.Vector3((taken % 2 ? -1 : 1) * Math.min(0.5, o.b.radius * 0.5) * (taken ? 1 : 0), 0, 0.05));
      const front = { x: seat.x + 0, z: seat.z + 0.55 };
      const seatY = o.pos.y + o.b.seatH! + 0.04 - HIP_H + (o.b.boat ? 0.02 : 0);
      return {
        ...base, path: standAt(front, o), focus: [seat.clone().setY(1)],
        pose: (t, bb) => {
          preDown(t, bb);
          if (t < A) return;
          const k = ease((t - A) / 12);
          bb.x = lerp(front.x, seat.x, k); bb.z = lerp(front.z, seat.z, k);
          bb.y = lerp(o.pos.y, seatY, k); bb.yaw = lerp(bb.yaw, 0, k);
          if (!animal) { bb.j.lhx = bb.j.rhx = -1.5 * k; bb.j.lk = bb.j.rk = 1.5 * k; }
        },
        after: { x: seat.x, z: seat.z, y: seatY, yaw: 0, mode: "sit", obj: o, faceCam: true },
      };
    }
    if (v === "stand-up") {
      const pk = s.park;
      if (!pk) return base;
      if (pk.mode === "perch" || pk.mode === "cling") return { ...base, after: "keep" };
      const to = { x: pk.x, z: pk.z + (pk.mode === "sit" ? 0.5 : 0) };
      return {
        ...base, path: [me], after: parkStand(to),
        pose: (t, bb) => { const k = ease(t / N); bb.x = lerp(pk.x, to.x, k); bb.z = lerp(pk.z, to.z, k); bb.y = lerp(pk.y, 0, k); if (!animal) { bb.j.lhx = bb.j.rhx = -1.5 * (1 - k); bb.j.lk = bb.j.rk = 1.5 * (1 - k); bb.j.spine = 0.3 * Math.sin(k * Math.PI); } },
      };
    }

    // ------------------------------------------------------ doors / houses
    if (v === "open" || v === "close" || v === "enter" || v === "exit") {
      const f = w.find(word || "door", me, v === "enter" || v === "exit" ? "enterable" : "openable");
      const o = (v === "exit" && s.park?.mode === "inside" ? s.park.obj : null) ?? f?.obj ?? null;
      if (!o || !o.b.door) return base;
      let front = { x: o.front.x, z: o.front.z };
      // a train / bus (no real door): get in from the side you are on
      if (o.b.flap) {
        const mir = { x: 2 * o.pos.x - front.x, z: 2 * o.pos.z - front.z };
        if (Math.hypot(mir.x - me.x, mir.z - me.z) < Math.hypot(front.x - me.x, front.z - me.z)) front = mir;
        if (o.o.type === "model") { const dx = me.x - o.pos.x; front = { x: o.pos.x + Math.max(-4, Math.min(4, dx)), z: front.z }; }
      }
      const inside = o.b.root.localToWorld(o.b.door.inside.clone());
      const handle = o.b.root.localToWorld(new THREE.Vector3(0.35, 1.0, (o.b.door.front.z - 0.85) + 0.05));
      const face = yawTo(front.x, front.z, o.pos.x, o.pos.z);
      if (v === "open" || v === "close") {
        w.door(o, hit(0), v === "open");
        return {
          ...base, path: standAt(front, o), after: parkStand(front), focus: [handle.clone()],
          pose: (t, bb) => { preDown(t, bb); if (t < A) return; bb.yaw = face; if (!animal && t < hit(0) - f0 + 8) reach(bb.j, "r", bb, handle); },
        };
      }
      if (v === "enter") {
        if (!o.b.flap) { w.door(o, hit(0), true); w.door(o, hit(1), false); }
        return {
          ...base, path: standAt(front, o), focus: [new THREE.Vector3(o.front.x, 1.2, o.front.z)],
          after: { x: inside.x, z: inside.z, y: 0, yaw: face, mode: "inside", obj: o },
          pose: (t, bb) => {
            preDown(t, bb);
            if (t < A) return;
            bb.yaw = face;
            if (t < 34) { if (!animal && !o.b.flap) reach(bb.j, "r", bb, handle); return; }
            const k = clamp((t - 34) / 18, 0, 1);
            bb.x = lerp(front.x, inside.x, k); bb.z = lerp(front.z, inside.z, k);
            s.ph += 0.36; if (!animal) legsWalk(bb.j, s.ph); bb.walking = true;
            if (t >= 50) bb.hidden = true;
          },
        };
      }
      // exit
      if (!o.b.flap) { w.door(o, hit(0), true); w.door(o, hit(1), false); }
      return {
        ...base, path: [{ x: inside.x, z: inside.z }], after: parkStand(front), focus: [new THREE.Vector3(o.front.x, 1.2, o.front.z)],
        pose: (t, bb) => {
          bb.x = inside.x; bb.z = inside.z; bb.y = 0;
          if (t < 8) { bb.hidden = true; return; }
          const k = clamp((t - 10) / 26, 0, 1);
          bb.x = lerp(inside.x, front.x, k); bb.z = lerp(inside.z, front.z, k);
          bb.yaw = face + Math.PI;
          if (k < 1) { s.ph += 0.36; if (!animal) legsWalk(bb.j, s.ph); bb.walking = true; } else bb.yaw = 0;
        },
      };
    }

    // ---------------------------------------------------------- light fire
    if (v === "light") {
      const f = w.find(word || "fire", me, "burnable");
      const o = f?.obj?.b.fire ? f.obj : null;
      if (!o) return base;
      const at = sideOf(o, 0.85);
      w.lightFire(o, hit(0));
      return {
        ...base, path: standAt(at, o), after: parkStand(at), focus: [o.pos.clone().setY(0.6)],
        pose: (t, bb) => {
          preDown(t, bb);
          if (t < A) return;
          bb.yaw = yawTo(at.x, at.z, o.pos.x, o.pos.z);
          if (animal) return;
          const k = ease(Math.min(1, (t - A) / 8)) * (t > N - 10 ? 1 - (t - (N - 10)) / 10 : 1);
          bb.y = -0.27 * k; legsKneel(bb.j); bb.j.lk = bb.j.rk = 1.6 * k; bb.j.lhx = bb.j.rhx = 0.05 * k;
          bb.j.spine = 0.45 * k;
          if (t < hit(0) - f0 + 10) { bb.tool = "match"; reach(bb.j, "r", bb, { x: o.pos.x, y: 0.25 + Math.sin(t * 0.9) * 0.04, z: o.pos.z }); }
        },
      };
    }

    // ---------------------------------------------------------- push / kick
    if (v === "push" || v === "kick") {
      const th = findThing(v === "kick" ? "kickable" : "pushable");
      if (!th) return base;
      const tp = w.thingAt(th, f0 + A);
      // push / kick it away from the characters, sideways
      const o = nearestOther();
      const dirX = o ? (o.p.x > tp.x ? -1 : 1) : (tp.x > 0 ? 1 : -1);
      const dir = new THREE.Vector3(dirX, 0, -0.35).normalize();
      const back = th.big ? th.size + 0.55 : 0.4;
      const at = { x: tp.x - dir.x * back, z: tp.z - dir.z * back };
      const face = yawTo(at.x, at.z, tp.x, tp.z);
      if (v === "kick") {
        const to = new THREE.Vector3(tp.x + dir.x * 5.5, 0.15, tp.z + dir.z * 5.5);
        w.throwTo(th, hit(0), tp, to, 24);
        return {
          ...base, path: standAt(at), after: parkStand(at), focus: [tp.clone(), to],
          pose: (t, bb) => {
            preDown(t, bb); if (t < A) return;
            bb.yaw = face;
            if (animal) return;
            const k = t < 28 ? (t - A) / 4 : t < 33 ? -1 : 0;
            bb.j.rhx = k > 0 ? lerp(0, 0.6, Math.min(1, k)) : k < 0 ? -1.3 : 0; bb.j.rk = k > 0 ? 0.8 : 0.1;
            arm(bb.j, "l", -0.9, 0.6, -0.2); arm(bb.j, "r", -0.3, 0.7, -0.2); bb.j.spine = k < 0 ? -0.15 : 0.1;
          },
        };
      }
      const dist = 2.2;
      const end = { x: at.x + dir.x * dist, z: at.z + dir.z * dist };
      w.pushAlong(th, f0 + 30, f0 + 64, new THREE.Vector3(tp.x, tp.y, tp.z), new THREE.Vector3(tp.x + dir.x * dist, tp.y, tp.z + dir.z * dist));
      return {
        ...base, path: standAt(at), after: parkStand(end), focus: [tp.clone().setY(0.8)],
        pose: (t, bb) => {
          preDown(t, bb); if (t < A) return;
          bb.yaw = face;
          const k = clamp((t - 30) / 34, 0, 1);
          bb.x = lerp(at.x, end.x, k); bb.z = lerp(at.z, end.z, k);
          if (animal) { bb.walking = k > 0 && k < 1; return; }
          bb.j.spine = 0.55;
          const hp = { x: bb.x + Math.sin(face) * (back - 0.05), y: th.big ? Math.min(1.0, th.size * 1.4) : 0.4, z: bb.z + Math.cos(face) * (back - 0.05) };
          reach(bb.j, "l", bb, { x: hp.x - Math.cos(face) * 0.18, y: hp.y, z: hp.z + Math.sin(face) * 0.18 });
          reach(bb.j, "r", bb, { x: hp.x + Math.cos(face) * 0.18, y: hp.y, z: hp.z - Math.sin(face) * 0.18 });
          if (k > 0 && k < 1) { s.ph += 0.22; legsWalk(bb.j, s.ph, 0.45, false); bb.j.spine = 0.55; }
          bb.mouth = k > 0 && k < 1 ? "talk-half" : null;
        },
      };
    }

    // ---------------------------------------------------------------- hide
    if (v === "hide") {
      const f = w.find(word, me, "hide_behind");
      const o = f?.obj ?? null;
      if (!o) return base;
      const behind = { x: o.pos.x + (me.x > o.pos.x ? 0.25 : -0.25), z: o.pos.z - (o.b.radius + 0.45) };
      return {
        ...base, path: standAt(behind, o), focus: [o.pos.clone().setY(0.8)],
        after: { x: behind.x, z: behind.z, y: -0.34, yaw: 0, mode: "hide", obj: o },
        pose: (t, bb) => {
          preDown(t, bb); if (t < A) return;
          const k = ease((t - A) / 8);
          bb.y = -0.34 * k; bb.yaw = lerp(bb.yaw, 0, k);
          if (!animal) { bb.j.lhx = bb.j.rhx = -1.3 * k; bb.j.lk = bb.j.rk = 2.0 * k; bb.j.spine = 0.45 * k; }
        },
      };
    }

    // ---------------------------------------------------------------- look
    if (v === "look") {
      const f = w.find(word, me);
      const p = f?.thing ? w.thingAt(f.thing, f0 + 10) : f?.obj ? f.obj.pos.clone().setY(1.6) : null;
      if (!p) return base;
      return {
        ...base, path: [me], focus: [p.clone()],
        pose: (t, bb) => {
          bb.yaw = yawTo(me.x, me.z, p.x, p.z) * 0.8;
          if (!animal && !fromTree) { reach(bb.j, "r", bb, { x: bb.x + (p.x - bb.x) * 3, y: bb.y + 1.25 + (p.y - bb.y - 1.25) * 0.4, z: bb.z + (p.z - bb.z) * 3 }); bb.j.headX = -0.15; }
          void t;
        },
      };
    }
    return base;
  }

  private swimPos(nr: ReturnType<Water["nearest"]>, x0: number, z0: number, k: number): P {
    const s = Math.sin(clamp(k, 0, 1) * Math.PI * 2) * 2.2;
    const off = Math.sin(clamp(k, 0, 1) * Math.PI) * 0.35;
    return { x: x0 + nr.tx * s + (nr.x - x0) * off, z: z0 + nr.tz * s + (nr.z - z0) * off };
  }
  private bridgeEnds(o: RObj, me: P): [P, P] {
    const L = (o.b.bridge?.len ?? 5) / 2 + 0.6;
    const a = o.b.root.localToWorld(new THREE.Vector3(-L, 0, 0)), z = o.b.root.localToWorld(new THREE.Vector3(L, 0, 0));
    return Math.hypot(a.x - me.x, a.z - me.z) < Math.hypot(z.x - me.x, z.z - me.z) ? [{ x: a.x, z: a.z }, { x: z.x, z: z.z }] : [{ x: z.x, z: z.z }, { x: a.x, z: a.z }];
  }
  private bendTo(bb: Body, p: { x: number; y: number; z: number }, t: number, animal: boolean) {
    const k = ease(clamp(t / 8, 0, 1));
    if (animal) { bb.roll = -0.35 * k; return; }
    bb.j.spine = 0.95 * k; bb.j.lhx = bb.j.rhx = -0.5 * k; bb.j.lk = bb.j.rk = 0.9 * k; bb.y -= 0.1 * k;
    reach(bb.j, "r", bb, p);
  }
  private afterGrab(bb: Body, t: number, grabAt: number, eat: boolean, animal: boolean) {
    if (t <= grabAt) return;
    if (animal) { if (eat) bb.mouth = (t >> 2) % 2 ? "talk-open" : null; return; }
    if (eat) {
      const head = { x: bb.x + Math.sin(bb.yaw) * 0.26, y: bb.y + 1.28, z: bb.z + Math.cos(bb.yaw) * 0.26 };
      reach(bb.j, "r", bb, head);
      bb.mouth = (t >> 2) % 2 ? "talk-open" : "talk-half";
    } else { arm(bb.j, "r", -1.0, 0.15, -1.1); bb.j.headX = 0.15; }
  }
  private grab(w: World, th: Thing, f: number, cid: string, animal: boolean, eat: boolean, spec: { hits?: number[] }, f0: number, s: CState, side?: "c") {
    const sd = side ?? (animal ? "m" : "r");
    if (eat) { w.eat(th, f, cid, sd, (spec.hits ?? [34, 42, 50]).map((h) => f0 + h).filter((h) => h > f)); s.hold = null; }
    else { w.hold(th, f, cid, sd); s.hold = th; }
  }


  // ------------------------------------------------ your own actions (Action Builder)
  /** weld, ride, break, fix, cook… : walk to the thing, face it, do it with the body,
   *  hold a prop, maybe ride it — and the world reacts (sparks, it breaks, it moves…). */
  private planCustom(f0: number, c: FrameChar, s: CState, b: Body, w: World, animal: boolean, cd: CustomAction): Plan {
    const wa = c.wact!;
    const N = wa.n;
    const me: P = s.park ? { x: s.park.x, z: s.park.z } : { x: b.x, z: b.z };
    const f = wa.o ? w.find(wa.o, cd.atStart ? { x: 0, z: 0 } : me) : null;
    let obj = f?.obj && (!wa.o || w.named(wa.o) || f.obj.words.some((x) => x.includes(wa.o) || wa.o.includes(x))) ? f.obj : (wa.o ? w.named(wa.o) : null);
    // mending: the one that IS broken (not just any track piece)
    if (cd.change === "fix" || cd.change === "show") {
      const want = cd.change === "fix" ? "break" : "hide";
      const broken = w.objects.filter((o) => o.states?.some((x) => x.kind === want) && (!wa.o || o.words.some((x) => x.includes(wa.o) || wa.o.includes(x))));
      if (broken.length) obj = broken.sort((a, b) => Math.hypot(a.pos.x - me.x, a.pos.z - me.z) - Math.hypot(b.pos.x - me.x, b.pos.z - me.z))[0]!;
    }
    const go = !!cd.go && !!obj && !cd.atStart;
    let to: P = me;
    if (go && obj) {
      const r = Math.max(0.5, Math.min(2.5, obj.b.radius)) + (cd.ride ? 0.2 : 0.55);
      const dx = me.x - obj.pos.x, dz = me.z - obj.pos.z, L = Math.hypot(dx, dz) || 1;
      to = { x: obj.pos.x + (dx / L) * 0.5 * r + 0.0, z: obj.pos.z + Math.max(0.35, dz / L) * r };
    }
    const path = go ? this.route(w, me, to, obj) : [me];
    const A = go ? Math.min(30, N - 8) : 0;
    const doF = f0 + A, work = Math.max(8, N - A);
    const fx = obj ? obj.pos.x : me.x + Math.sin(b.yaw) * 0.6, fz = obj ? obj.pos.z : me.z + Math.cos(b.yaw) * 0.6;
    const fy = obj ? Math.min(1.1, Math.max(0.15, obj.b.height * 0.55)) + obj.pos.y : 0.8;
    // the world reacts (all decided now: every frame can be shown in any order)
    const kind = ({ sparks: "sparks", smoke: "smoke", fire: "fire", dust: "dust", sparkle: "sparkle" } as const)[cd.effect as "sparks"] ?? null;
    if (cd.effect === "splash") w.splash(doF + Math.round(work * 0.4), fx, fz, 1.2);
    else if (kind) for (let k = 0; k < work - 6; k += kind === "sparks" ? 4 : 8) w.emit(doF + 4 + k, kind, fx, fy, fz, kind === "sparks" ? 9 : 5, obj ? Math.max(0.8, Math.min(2.5, obj.b.radius)) : 1);
    if (obj && cd.change) w.setState(obj, cd.atStart ? (w.n0 || f0) : doF + Math.round(work * 0.65), cd.change as "break", cd.color);
    // a track being broken / mended: the train on it comes only after that
    if (obj && (cd.change === "break" || cd.change === "fix") && obj.words.some((x) => /track|rail|line|road|bridge/.test(x))) w.delayArrivals(obj.pos.z, f0 + N + 30);
    const riding = !!cd.ride && !!obj && !animal;
    if (riding) w.drive(obj!, doF + 12, f0 + N - 6, cd.rideDist ?? 8);
    const seat = obj ? Math.max(0.45, Math.min(1.3, obj.b.height * 0.55)) : 0.5;
    let after: Park | null | "keep" = "keep";
    if (riding) {
      const end = w.posAt(obj!, f0 + N + 1);
      w.posAt(obj!, f0); // back to now
      after = { x: end.x, z: end.z + 0.9, y: w.heightAt(end.x, end.z + 0.9, true), yaw: 0, mode: "stand" };
    } else if (go) after = { x: to.x, z: to.z, y: w.heightAt(to.x, to.z, true), yaw: 0, mode: "stand" };
    const pose = (t: number, bb: Body) => {
      if (t < A) return;
      const n = f0 + t, u = t - A;
      bb.walking = false;
      if (riding) {
        const p = w.posAt(obj!, n);
        bb.x = p.x; bb.z = p.z; bb.y = p.y + seat;
        bb.yaw = obj!.yaw + Math.PI / 2 + (obj!.b.root.rotation.y - (obj!.base?.rotY ?? obj!.b.root.rotation.y));
      } else if (obj) bb.yaw = yawTo(bb.x, bb.z, fx, fz);
      if (animal) return;
      const j = bb.j;
      const body = riding ? "sit" : cd.body ?? "stand";
      if (body === "kneel") legsKneel(j); else if (body === "sit") legsSit(j); else if (body === "crouch") legsCrouch(j); else legsStand(j);
      if (body === "kneel" || body === "crouch") j.spine = 0.35;
      const target = { x: fx, y: fy, z: fz };
      const arms = riding ? "drive" : cd.arms ?? "work";
      if (arms === "work" || arms === "reach") {
        reach(j, "r", bb, { x: target.x + Math.sin(u * 0.7) * 0.06, y: target.y + Math.cos(u * 0.9) * 0.05, z: target.z });
        if (arms === "work") reach(j, "l", bb, { x: target.x - 0.1, y: target.y, z: target.z });
      } else if (arms === "hammer") {
        const up = Math.max(0, Math.sin(u * 0.45));
        arm(j, "r", -1.2 - 1.4 * up, 0.15, -0.4 - 0.6 * up);
        arm(j, "l", -0.9, 0.2, -0.6);
        if (up < 0.1 && u % 14 === 7 && obj) w.dust(n, fx, fz, 0.5);
      } else if (arms === "up") { arm(j, "l", -2.8, 0.4, -0.2); arm(j, "r", -2.8, 0.4, -0.2); }
      else if (arms === "point") arm(j, "r", -1.5, 0.1, 0);
      else if (arms === "wave") arm(j, "r", -0.2, 2.6 + Math.sin(u * 0.5) * 0.3, -0.4);
      else if (arms === "drive") { arm(j, "l", -1.2, 0.05, -0.5); arm(j, "r", -1.2, 0.05, -0.5); }
      bb.prop = cd.hold && !riding ? cd.hold : null;
      bb.mouth = null;
    };
    const focus = obj && !riding ? [new THREE.Vector3(fx, fy, fz)] : []; // a rider: the camera follows them
    return { id: wa.id, verb: wa.v, f0, N, A, path, pose, after, focus, cam: cd.closeup && obj ? yawTo(to.x, to.z, fx, fz) + Math.PI / 2 : undefined };
  }

  private planFish(base: Plan, c: FrameChar, s: CState, w: World, wat: Water, me: P, animal: boolean, f0: number, spec: { hits?: number[] }): Plan {
    const nr = wat.nearest(me.x, me.z);
    const bank = { x: nr.bx, z: nr.bz };
    const face = yawTo(bank.x, bank.z, nr.x, nr.z);
    const bob = new THREE.Vector3(nr.x + (nr.bx - nr.x) * 0.2, 0.04, nr.z + (nr.bz - nr.z) * 0.2);
    const [cast, bite, land] = spec.hits ?? [34, 100, 116];
    const fish = w.things.filter((t) => t.kind === "fish" && t.owner === wat.obj && w.isHome(t, f0)).sort((a, b) => w.thingAt(a, f0 + bite!).distanceTo(bob) - w.thingAt(b, f0 + bite!).distanceTo(bob))[0];
    w.splash(f0 + 44, bob.x, bob.z, 0.5);
    if (fish) {
      w.splash(f0 + bite!, bob.x, bob.z, 1.1);
      const handAt = new THREE.Vector3(bank.x + Math.sin(face) * 0.4, 1.45, bank.z + Math.cos(face) * 0.4);
      w.throwTo(fish, f0 + bite!, bob.clone(), handAt, land! - bite!);
      w.hold(fish, f0 + land!, c.cid, animal ? "m" : "r");
      s.hold = fish;
    }
    void cast;
    return {
      ...base, path: this.route(w, me, bank, null), after: { ...{ x: bank.x, z: bank.z, y: 0, yaw: face, mode: "stand" } }, focus: [bob.clone().setY(0.6)], cam: (bank.x >= 0 ? 1 : -1) * 1.0,
      pose: (t, bb) => {
        if (t < base.A) return;
        bb.yaw = face;
        if (animal) { if (t > bite! && t < land!) bb.mouth = "talk-open"; return; }
        bb.tool = t < land! ? "rod" : null;
        if (t < 44) { const k = clamp((t - base.A) / 20, 0, 1); const back = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2; arm(bb.j, "r", lerp(-1.1, -2.8, back), 0.2, -0.4); arm(bb.j, "l", -0.9, 0.2, -0.9); bb.line = null; }
        else if (t < bite!) { arm(bb.j, "r", -1.05 + Math.sin(t / 9) * 0.05, 0.2, -0.45); arm(bb.j, "l", -0.95, 0.15, -0.9); bb.line = [bob.x, bob.y + Math.sin(t / 7) * 0.03 - (t > bite! - 10 ? 0.06 : 0), bob.z]; }
        else if (t < land!) { const k = (t - bite!) / (land! - bite!); arm(bb.j, "r", lerp(-1.05, -2.7, ease(Math.min(1, k * 2))), 0.2, -0.3); bb.j.spine = -0.2; bb.mouth = "o"; if (fish) { const p = w.thingAt(fish, f0 + t); bb.line = [p.x, p.y, p.z]; } }
        else { bb.line = null; arm(bb.j, "r", -1.2, 0.2, -1.2); bb.mouth = "grin"; }
      },
    };
  }
  private planDrink(base: Plan, c: FrameChar, s: CState, w: World, wat: Water | null, well: RObj | null, me: P, animal: boolean, f0: number): Plan {
    void c; void s;
    let bank: P, water: THREE.Vector3;
    if (wat) { const nr = wat.nearest(me.x, me.z); bank = { x: nr.bx, z: nr.bz }; water = new THREE.Vector3(nr.bx + (nr.x - nr.bx) * 0.22, 0.04, nr.bz + (nr.z - nr.bz) * 0.22); w.splash(f0 + 38, water.x, water.z, 0.5); }
    else { bank = { x: well!.front.x, z: well!.front.z }; water = well!.pos.clone().setY(0.7); }
    const face = yawTo(bank.x, bank.z, water.x, water.z);
    return {
      ...base, path: this.route(w, me, bank, well), after: { x: bank.x, z: bank.z, y: 0, yaw: face, mode: "stand" }, focus: [water.clone().setY(0.5)], cam: (bank.x >= 0 ? 1 : -1) * 0.9,
      pose: (t, bb) => {
        if (t < base.A) return;
        bb.yaw = face;
        if (animal) { bb.roll = t < 62 ? -0.4 : 0; bb.mouth = t > 36 && t < 60 && (t >> 2) % 2 ? "talk-open" : null; return; }
        const kneel = wat ? ease(clamp((t - 24) / 10, 0, 1)) * (t > 62 ? 1 - (t - 62) / 10 : 1) : 0;
        bb.y = -0.27 * kneel; bb.j.lk = bb.j.rk = 1.6 * kneel; bb.j.lhx = bb.j.rhx = 0.05 * kneel;
        bb.j.spine = (wat ? 0.75 : 0.5) * Math.min(1, (t - 24) / 10) * (t > 62 ? 1 - (t - 62) / 10 : 1);
        const mouth = { x: bb.x + Math.sin(face) * 0.25, y: bb.y + 1.15, z: bb.z + Math.cos(face) * 0.25 };
        if (t < 46) { reach(bb.j, "l", bb, { x: water.x - Math.cos(face) * 0.07, y: water.y + 0.05, z: water.z + Math.sin(face) * 0.07 }); reach(bb.j, "r", bb, { x: water.x + Math.cos(face) * 0.07, y: water.y + 0.05, z: water.z - Math.sin(face) * 0.07 }); }
        else if (t < 62) { reach(bb.j, "l", bb, { x: mouth.x - Math.cos(face) * 0.05, y: mouth.y, z: mouth.z }); reach(bb.j, "r", bb, { x: mouth.x + Math.cos(face) * 0.05, y: mouth.y, z: mouth.z }); bb.mouth = "o"; }
      },
    };
  }
}
export { SEAT_H };
