import * as THREE from "three";
import type { CamKey, Vec3 } from "./types";

/**
 * Scroll progress windows for the pinned sequence (0 → 1 over the stage).
 * The DOM overlays read the same table, so text and 3D can never drift apart.
 */
export const CH = {
  hero: [0, 0.07],
  inside: [0.07, 0.2],
  surface: [0.2, 0.38],
  routes: [0.38, 0.55],
  air: [0.55, 0.71],
  eye: [0.71, 0.86],
  chip: [0.86, 1],
} as const;

export type ChapterId = keyof typeof CH;

const FLAT = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
const tmp = new THREE.Vector3();

/**
 * Lays a part flat (front face up) as if the whole phone were placed on a
 * table, then lifts it along world Y. Returns the offset from `base`.
 */
export function flatOffset(base: THREE.Vector3, lift: number, center: Vec3): Vec3 {
  tmp.copy(base).applyMatrix4(FLAT);
  return [center[0] + tmp.x - base.x, center[1] + tmp.y + lift - base.y, center[2] + tmp.z - base.z];
}

/** Translation that puts `base` (once laid flat) at the world origin. */
export function flatCenterFor(base: THREE.Vector3): Vec3 {
  tmp.copy(base).applyMatrix4(FLAT);
  return [-tmp.x, -tmp.y, -tmp.z];
}

export const FLAT_ROT: Vec3 = [-Math.PI / 2, 0, 0];

/** Camera moves shared by both models once the studio close-ups take over. */
export function studioCameraKeys(): CamKey[] {
  return [
    { t: 0.735, target: [0, 1.25, 0], az: -0.55, el: 0.34, w: 5, h: 5, sx: 0.16, sy: 0.1 },
    { t: 0.8, target: [0, 1.25, 0], az: -0.05, el: 0.42, w: 7, h: 10.5, sx: 0.16, sy: 0.1 },
    { t: 0.855, target: [0, 1.25, 0], az: 0.3, el: 0.5, w: 7, h: 10.5, sx: 0.16, sy: 0.1 },
    { t: 0.895, target: [0, 1.1, 0], az: 0.62, el: 0.62, w: 10, h: 9, sx: 0.16, sy: 0.1 },
    { t: 0.955, target: [0, 1.1, 0], az: 0.95, el: 0.42, w: 14, h: 14, sx: 0.16, sy: 0.1 },
    { t: 1, target: [0, 1.1, 0], az: 1.12, el: 0.38, w: 14, h: 14, sx: 0.16, sy: 0.1 },
  ];
}

/**
 * Portrait phones stack the copy under the product, so the camera pulls back
 * a touch and lifts the subject into the upper half of the screen. The hero
 * instead drops the product below the headline and controls.
 */
export function adaptForAspect(keys: CamKey[], aspect: number): CamKey[] {
  if (aspect >= 0.8) return keys;
  return keys.map((k) => {
    if (k.t < CH.inside[0]) return { ...k, w: Math.max(k.w * 1.45, 16), h: Math.max(k.h * 1.7, 34), sy: -0.24 };
    // Whole-phone shots in chapter 01 need less lift than the close-ups.
    if (k.t < CH.surface[0]) return { ...k, w: Math.min(k.w * 1.3, 22), sy: 0.12 };
    return { ...k, w: k.w * 1.18, sy: Math.max(k.sy ?? 0, 0.17) };
  });
}

