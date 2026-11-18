/** Things a character holds for a custom action (hammer, welding torch…). */
import * as THREE from "three";
import { at, box, cyl, sphere } from "./kit";
import { findKit, kitInstance, preloadKits } from "../world/kits";

/** A small thing to hold, made from simple shapes (or a ready-made model of that name). Points along +y. */
export function handProp(name: string): THREE.Object3D {
  const g = new THREE.Group();
  const w = name.toLowerCase();
  const stick = (len: number, col: string) => g.add(at(cyl(0.018, 0.018, len, col, 0.04, 8), 0, len / 2, 0));
  if (/hammer|mallet/.test(w)) { stick(0.32, "#92400e"); g.add(at(box(0.16, 0.07, 0.07, "#4b5563"), 0, 0.33, 0)); }
  else if (/weld|torch|solder|blow/.test(w)) {
    g.add(at(cyl(0.03, 0.03, 0.22, "#1f2937", 0.04, 10), 0, 0.11, 0));
    g.add(at(cyl(0.012, 0.02, 0.1, "#9ca3af", 0.03, 8), 0, 0.27, 0));
    const tip = sphere(0.035, "#fde047", 0, 8); (tip.material as THREE.MeshToonMaterial).emissive = new THREE.Color("#f59e0b"); g.add(at(tip, 0, 0.33, 0));
    g.add(at(box(0.2, 0.16, 0.02, "#1e293b"), 0, 0.02, 0.14)); // the face shield
  }
  else if (/shovel|spade/.test(w)) { stick(0.7, "#92400e"); g.add(at(box(0.16, 0.2, 0.02, "#6b7280"), 0, 0.78, 0)); }
  else if (/brush|paint/.test(w)) { stick(0.25, "#b45309"); g.add(at(box(0.06, 0.08, 0.03, "#f472b6"), 0, 0.3, 0)); }
  else if (/pan|wok/.test(w)) { stick(0.22, "#1f2937"); g.add(at(cyl(0.13, 0.11, 0.04, "#374151", 0.04, 16), 0.0, 0.3, 0)); }
  else if (/wrench|spanner|tool/.test(w)) { stick(0.24, "#6b7280"); g.add(at(box(0.07, 0.05, 0.03, "#6b7280"), 0, 0.26, 0)); }
  else if (/sword|stick|rod|bat/.test(w)) stick(0.6, /sword/.test(w) ? "#cbd5e1" : "#92400e");
  else {
    const k = findKit(name);
    const inst = k ? kitInstance(k.id) : null;
    if (k && !inst) void preloadKits([k.id]);
    if (inst) { const sc = 0.35 / Math.max(0.05, Math.max(k!.w, k!.h, k!.d)); inst.scale.multiplyScalar(sc); g.add(inst); }
    else {
      // any other thing (a cookie jar…): its picture from the Asset Library, held upright
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, color: 0xffffff }));
      sp.visible = false;
      sp.center.set(0.5, 0.25);
      sp.scale.set(0.42, 0.42, 1);
      sp.userData.iconWord = name.toLowerCase();
      g.add(sp);
    }
  }
  return g;
}
