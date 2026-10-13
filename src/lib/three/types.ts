import type * as THREE from "three";
import type { ModelId } from "@/data/products";
import type { Ease } from "./math";
import type { Part, Vec3 } from "./timeline";
import type { LogicBoard } from "./parts/board";

export interface CamKey {
  t: number;
  target: Vec3;
  /** Azimuth around +Y: 0 looks at the front (+Z), π at the back. */
  az: number;
  /** Elevation in radians. */
  el: number;
  /** World-space width / height that must fit in view. */
  w: number;
  h: number;
  /** Horizontal lens shift on wide viewports (fraction of width, + moves content right). */
  sx?: number;
  /** Vertical lens shift on tall viewports (fraction of height, + moves content up). */
  sy?: number;
  /** Vertical lens shift on wide viewports. */
  dy?: number;
  ease?: Ease;
}

export interface DeviceModel {
  readonly id: ModelId;
  readonly root: THREE.Group;
  readonly parts: Part[];
  readonly board: LogicBoard;
  readonly anchors: Record<string, THREE.Object3D>;
  /** World-space height reference for the heat particles (vapor chamber). */
  readonly vapor: Part;
  cameraKeys(aspect: number): CamKey[];
  /** Rebuild aspect-dependent tracks (row vs. grid layouts). */
  layout(aspect: number): void;
  update(p: number, time: number): void;
  setPresence(v: number): void;
  setFinish(metal: THREE.ColorRepresentation, glass: THREE.ColorRepresentation): void;
}

export type { Vec3 };
