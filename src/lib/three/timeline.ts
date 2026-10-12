import * as THREE from "three";
import { easeInOutCubic, lerp, type Ease } from "./math";

export type Vec3 = [number, number, number];

export interface Pose {
  /** Offset from the part's assembled position. */
  p: Vec3;
  /** Euler rotation (XYZ) added to the part's assembled rotation. */
  r: Vec3;
  s: number;
  o: number;
}

export interface KeyInput {
  t: number;
  p?: Vec3;
  r?: Vec3;
  s?: number;
  o?: number;
  ease?: Ease;
}

interface Key extends Pose {
  t: number;
  ease: Ease;
}

export type Track = Key[];

export const newPose = (): Pose => ({ p: [0, 0, 0], r: [0, 0, 0], s: 1, o: 1 });

/**
 * Normalises keyframes: sorted by time, and any field a key omits is carried
 * forward from the previous key so tracks stay terse.
 */
export function track(keys: KeyInput[]): Track {
  const sorted = [...keys].sort((a, b) => a.t - b.t);
  const out: Key[] = [];
  let prev: Pose = newPose();
  for (const k of sorted) {
    const key: Key = {
      t: k.t,
      p: k.p ?? prev.p,
      r: k.r ?? prev.r,
      s: k.s ?? prev.s,
      o: k.o ?? prev.o,
      ease: k.ease ?? easeInOutCubic,
    };
    out.push(key);
    prev = key;
  }
  return out;
}

function copyInto(k: Pose, out: Pose) {
  out.p[0] = k.p[0];
  out.p[1] = k.p[1];
  out.p[2] = k.p[2];
  out.r[0] = k.r[0];
  out.r[1] = k.r[1];
  out.r[2] = k.r[2];
  out.s = k.s;
  out.o = k.o;
  return out;
}

export function sample(tr: Track, t: number, out: Pose): Pose {
  if (tr.length === 0) return out;
  if (t <= tr[0].t) return copyInto(tr[0], out);
  const last = tr[tr.length - 1];
  if (t >= last.t) return copyInto(last, out);
  let i = 1;
  while (tr[i].t < t) i++;
  const a = tr[i - 1];
  const b = tr[i];
  const u = b.ease((t - a.t) / (b.t - a.t));
  for (let j = 0; j < 3; j++) {
    out.p[j] = lerp(a.p[j], b.p[j], u);
    out.r[j] = lerp(a.r[j], b.r[j], u);
  }
  out.s = lerp(a.s, b.s, u);
  out.o = lerp(a.o, b.o, u);
  return out;
}

interface FadeState {
  baseOpacity: number;
  baseTransparent: boolean;
  baseDepthWrite: boolean;
  /** Extra per-material factor, e.g. a lens barrel ghosting while the optics leave it. */
  mult: number;
}

/**
 * A rigid sub-assembly of the device. It owns private copies of its materials
 * so it can fade without affecting other parts that share the same look.
 */
export class Part {
  readonly group: THREE.Group;
  readonly base = new THREE.Vector3();
  readonly baseRot = new THREE.Euler();
  readonly pose = newPose();
  track: Track = track([{ t: 0 }]);
  private readonly mats: THREE.Material[] = [];
  private lastOpacity = -1;

  constructor(
    readonly name: string,
    group: THREE.Group,
  ) {
    this.group = group;
    this.base.copy(group.position);
    this.baseRot.copy(group.rotation);
    const cloned = new Map<THREE.Material, THREE.Material>();
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh && !(obj as THREE.Points).isPoints) return;
      const swap = (m: THREE.Material) => {
        if (m.userData.noFade) return m;
        let c = cloned.get(m);
        if (!c) {
          c = m.clone();
          // clone() drops shader hooks; keep them so patched materials (glowing
          // traces, vapor heat) still share their uniforms with the original.
          c.onBeforeCompile = m.onBeforeCompile;
          c.customProgramCacheKey = m.customProgramCacheKey;
          const state: FadeState = {
            baseOpacity: m.opacity,
            baseTransparent: m.transparent,
            baseDepthWrite: m.depthWrite,
            mult: 1,
          };
          c.userData.fade = state;
          cloned.set(m, c);
          this.mats.push(c);
        }
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    });
  }

  /** Materials owned by this part, e.g. to drive uniforms or recolour finishes. */
  get materials(): readonly THREE.Material[] {
    return this.mats;
  }

  findMaterial(name: string) {
    return this.mats.find((m) => m.name === name);
  }

  setTrack(tr: Track) {
    this.track = tr;
  }

  update(t: number, presence = 1) {
    sample(this.track, t, this.pose);
    this.applyPose(this.pose, presence);
  }

  applyPose(pose: Pose, presence = 1) {
    const g = this.group;
    g.position.set(this.base.x + pose.p[0], this.base.y + pose.p[1], this.base.z + pose.p[2]);
    g.rotation.set(this.baseRot.x + pose.r[0], this.baseRot.y + pose.r[1], this.baseRot.z + pose.r[2]);
    g.scale.setScalar(Math.max(pose.s, 1e-4));
    this.setOpacity(pose.o * presence);
  }

  /** Scales one material's opacity on top of the part fade. */
  setMaterialFactor(name: string, mult: number) {
    const m = this.findMaterial(name);
    if (!m) return;
    const s = m.userData.fade as FadeState;
    if (Math.abs(s.mult - mult) < 1e-3) return;
    s.mult = mult;
    this.lastOpacity = -1;
  }

  setOpacity(o: number) {
    const v = Math.round(o * 1000) / 1000;
    if (v === this.lastOpacity) return;
    this.lastOpacity = v;
    this.group.visible = v > 0.004;
    for (const m of this.mats) {
      const s = m.userData.fade as FadeState;
      const eff = v * s.mult;
      const transparent = eff < 0.999 || s.baseTransparent;
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.needsUpdate = true;
      }
      m.opacity = s.baseOpacity * eff;
      m.depthWrite = s.baseDepthWrite && eff > 0.6;
    }
  }
}
