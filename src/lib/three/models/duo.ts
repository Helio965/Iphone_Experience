import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FLAT_ROT, flatCenterFor, flatOffset, studioCameraKeys } from "../chapters";
import { extrude, planarUVs, rectShape4 } from "../geometry";
import {
  applyFinish,
  blackGlass,
  carbonFiber,
  ceramicGlass,
  polishedTitanium,
  screenMaterial,
  steel,
  type FxUniforms,
} from "../materials";
import { easeInOutCubic, easeInOutQuint, easeOutCubic, range } from "../math";
import { buildLogicBoard, type BoardSpec } from "../parts/board";
import {
  buildBattery,
  buildDisplay,
  buildVaporChamber,
  cameraModule,
  flashUnit,
  lensRing,
  sensorDot,
} from "../parts/internals";
import { backGlassMaps, duoInnerScreenTexture, duoOuterScreenTexture } from "../textures";
import { Part, track, type Vec3 } from "../timeline";
import type { CamKey, DeviceModel } from "../types";
import { splitAmount } from "./proMax";

/**
 * iPhone Duo: 164.6 × 117.8 × 5.2 mm open, 84.1 × 117.8 × 11.3 mm closed.
 * Each half is 8.23 cm wide; the hinge axis is the world Y axis at x = 0.
 */
const W2 = 8.23;
const H2 = 11.78;
const D2 = 0.52;
const R2 = 1.15;
const INNER_R = 0.08;

const BOARD_CENTER = new THREE.Vector3(4.15, 3.05, -0.48);
const VAPOR_CENTER = new THREE.Vector3(4.15, 3.0, -0.1);
const BATTERY_R = new THREE.Vector3(4.3, -2.9, -0.27);
const BATTERY_L = new THREE.Vector3(-4.25, -0.6, -0.27);
const CHIP: [number, number] = [2.3, 2.9];
const LENSES: [number, number][] = [
  [7.0, 4.55],
  [5.45, 4.55],
];

/**
 * Frame for one half as a single C-shaped outline: walls on the outer three
 * sides only, open at the hinge so the inner display can meet its twin.
 */
function frameShape(side: -1 | 1, wall: number) {
  const r = R2;
  const ri = R2 - wall;
  const sx = side;
  const hh = H2 / 2;
  const pts: THREE.Vector2[] = [];
  const arc = (cx: number, cy: number, rad: number, a0: number, a1: number) => {
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(new THREE.Vector2(sx * (cx + Math.cos(a) * rad), cy + Math.sin(a) * rad));
    }
  };
  // Outer edge, top → bottom around the far side.
  pts.push(new THREE.Vector2(0, hh));
  arc(W2 - r, hh - r, r, Math.PI / 2, 0);
  arc(W2 - r, -hh + r, r, 0, -Math.PI / 2);
  pts.push(new THREE.Vector2(0, -hh));
  // Inner edge, bottom → top.
  pts.push(new THREE.Vector2(0, -hh + wall));
  arc(W2 - r, -hh + r, ri, -Math.PI / 2, 0);
  arc(W2 - r, hh - r, ri, 0, Math.PI / 2);
  pts.push(new THREE.Vector2(0, hh - wall));
  return new THREE.Shape(side === 1 ? pts : pts.reverse());
}

/** Inner display panel: inset on the outer sides, flush to the hinge. */
function displayShape(side: -1 | 1, inset: number) {
  const w = W2 - inset;
  const radii: [number, number, number, number] =
    side === 1 ? [0, R2 - inset, R2 - inset, 0] : [R2 - inset, 0, 0, R2 - inset];
  return rectShape4(w, H2 - inset * 2, radii, (side * w) / 2, 0);
}

/** Outline of one half: only the outer corners are rounded. */
function halfShape(side: -1 | 1, inset = 0) {
  const w = W2 - inset * 2;
  const h = H2 - inset * 2;
  const r = Math.max(R2 - inset, 0.1);
  const i = Math.max(INNER_R - inset * 0.5, 0.02);
  const radii: [number, number, number, number] = side === 1 ? [i, r, r, i] : [r, i, i, r];
  return rectShape4(w, h, radii, (side * W2) / 2, 0);
}

function gearShape(r: number, teeth: number) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2;
    const rr = k % 4 < 2 ? r : r * 0.82;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (k === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

interface Hinge {
  group: THREE.Group;
  anchor: THREE.Object3D;
  metal: THREE.MeshPhysicalMaterial;
  setFold(angle: number): void;
  setExplode(e: number): void;
}

function buildHinge(metal: THREE.MeshPhysicalMaterial): Hinge {
  const group = new THREE.Group();
  group.name = "hinge";
  const length = 10.8;

  // Full-height spine: when closed it is the rounded edge of the phone.
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.535, 0.535, H2 - 0.14, 48, 1, false, Math.PI / 2, Math.PI),
    metal,
  );
  const spinePivot = new THREE.Group();
  spinePivot.add(spine);
  group.add(spinePivot);
  // Left-side internals ride with the left half; the link plates turn half as far,
  // so nothing pokes out of the spine when the phone is closed.
  const leftPivot = new THREE.Group();
  const midPivot = new THREE.Group();
  group.add(leftPivot, midPivot);

  const gearGeo = extrude(gearShape(0.2, 12), { depth: 0.12, bevel: 0.01, bevelSegments: 1, curveSegments: 4 });
  gearGeo.rotateX(Math.PI / 2);
  const gearMat = steel();
  const linkMat = new THREE.MeshStandardMaterial({ name: "hinge-link", color: 0x8d9097, metalness: 1, roughness: 0.35 });
  const modules: { y: number; gears: THREE.Mesh[]; link: THREE.Mesh }[] = [];
  for (let i = 0; i < 7; i++) {
    const y = -4.5 + i * 1.5;
    const gears: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      const g = new THREE.Mesh(gearGeo, gearMat);
      g.position.set(sx * 0.3, y, -0.27);
      g.rotation.y = sx * 0.13;
      (sx === -1 ? leftPivot : group).add(g);
      gears.push(g);
    }
    const link = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.1, 0.22, 2, 0.03), linkMat);
    link.position.set(0, y + 0.12, -0.2);
    midPivot.add(link);
    modules.push({ y, gears, link });
  }

  const plates: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(1.5, length - 0.4, 0.04, 2, 0.015), carbonFiber());
    p.position.set(sx * 1.0, 0, -0.12);
    (sx === -1 ? leftPivot : group).add(p);
    plates.push(p);
  }
  const rods: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, length - 0.6, 16), steel());
    r.position.set(sx * 0.46, 0, -0.32);
    (sx === -1 ? leftPivot : group).add(r);
    rods.push(r);
  }
  const anchor = new THREE.Object3D();
  anchor.position.set(0.55, 2.4, -0.3);
  group.add(anchor);

  return {
    group,
    anchor,
    metal,
    setFold(angle: number) {
      spinePivot.rotation.y = angle / 2;
      midPivot.rotation.y = angle / 2;
      leftPivot.rotation.y = angle;
    },
    setExplode(e: number) {
      for (const m of modules) {
        const y = m.y * (1 + 0.6 * e);
        m.link.position.y = y + 0.12;
        m.gears.forEach((g, k) => {
          g.position.y = y;
          g.position.x = (k === 0 ? -1 : 1) * (0.3 + 0.3 * e);
          g.rotation.y = (k === 0 ? -1 : 1) * (0.13 + e * 1.2);
        });
      }
      plates.forEach((p, k) => {
        p.position.x = (k === 0 ? -1 : 1) * (1.0 + 1.5 * e);
        p.position.z = -0.12 + 0.4 * e;
      });
      rods.forEach((r, k) => {
        r.position.x = (k === 0 ? -1 : 1) * (0.46 + 0.7 * e);
      });
      spine.position.z = -1.1 * e;
    },
  };
}

function boardSpec(): BoardSpec {
  const c = BOARD_CENTER;
  const at = (x: number, y: number) => ({ x: x - c.x, y: y - c.y });
  const pts: [number, number][] = [
    [0.55, 0.55],
    [7.75, 0.55],
    [7.75, 3.55],
    [4.75, 3.55],
    [4.75, 5.55],
    [0.55, 5.55],
  ];
  return {
    outline: pts.map(([x, y]) => new THREE.Vector2(x - c.x, y - c.y)),
    holes: [at(0.85, 0.85), at(7.45, 0.85), at(0.85, 5.25), at(7.45, 3.25)].map((p) => ({ ...p, r: 0.09 })),
    chip: at(...CHIP),
    seed: 26,
    chipLabel: "A20 PRO",
    top: [
      { ...at(...CHIP), w: 1.5, h: 1.5, d: 0.11, kind: "soc", label: "U1000" },
      { ...at(2.6, 4.75), w: 3.2, h: 0.75, d: 0.12, kind: "shield", label: "SH1" },
      { ...at(4.35, 2.9), w: 1.2, h: 0.95, d: 0.1, kind: "ic", label: "NAND" },
      { ...at(5.85, 2.9), w: 1.15, h: 0.95, d: 0.09, kind: "ic", label: "C2" },
      { ...at(7.1, 2.95), w: 0.65, h: 0.65, d: 0.07, kind: "ic", label: "N1" },
      { ...at(4.35, 1.3), w: 0.8, h: 0.8, d: 0.08, kind: "ic", label: "PMU" },
      { ...at(6.3, 1.3), w: 2.2, h: 0.9, d: 0.12, kind: "shield", label: "RF" },
      { ...at(1.25, 1.1), w: 0.8, h: 0.4, d: 0.1, kind: "connector", label: "J2200" },
    ],
    bottom: [
      { ...at(...CHIP), w: 1.2, h: 1.2, d: 0.08, kind: "ic" },
      { ...at(5.6, 2.0), w: 1.0, h: 0.8, d: 0.08, kind: "ic" },
      { ...at(3.6, 4.6), w: 0.4, h: 0.4, d: 0.14, kind: "inductor" },
      { ...at(7.0, 1.2), w: 0.4, h: 0.4, d: 0.14, kind: "inductor" },
    ],
  };
}

export function buildDuo(fx: FxUniforms, finish: { metal: string; glass: string }, lensCover: THREE.Texture): DeviceModel {
  const root = new THREE.Group();
  root.name = "iphone-duo";
  const metal = polishedTitanium(finish.metal);

  const leftHalf = new THREE.Group();
  const rightHalf = new THREE.Group();
  root.add(leftHalf, rightHalf);

  /* Frames ------------------------------------------------------------- */
  const frame = (side: -1 | 1) => {
    const g = new THREE.Group();
    // Bevel stays under half the 1.4 mm wall so the cap keeps its shape.
    const m = new THREE.Mesh(extrude(frameShape(side, 0.14), { depth: D2, bevel: 0.05, bevelSegments: 5, curveSegments: 12 }), metal);
    m.position.z = -D2 / 2;
    g.add(m);
    return g;
  };
  const lFrame = frame(-1);
  const rFrame = frame(1);
  // Volume + Touch ID side button on the outer edge of the camera half.
  const btn = (len: number, y: number) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.1, len, 0.26, 3, 0.04), metal);
    b.position.set(W2 + 0.01, y, -D2 / 2);
    rFrame.add(b);
  };
  btn(1.6, 3.2);
  btn(0.9, 1.3);
  btn(0.9, 0.2);
  const frameAnchor = new THREE.Object3D();
  frameAnchor.position.set(W2 + 0.05, 3.6, -D2 / 2);
  rFrame.add(frameAnchor);
  leftHalf.add(lFrame);
  rightHalf.add(rFrame);

  /* Backs ---------------------------------------------------------------- */
  const rBack = new THREE.Group();
  const backGeo = extrude(halfShape(1, 0.05), { depth: 0.05, bevel: 0.015, bevelSegments: 2 });
  planarUVs(backGeo, { minX: W2, maxX: 0, minY: -H2 / 2, maxY: H2 / 2 });
  const rough = backGlassMaps(W2, H2, 0.47, 1.7);
  rBack.add(new THREE.Mesh(backGeo, [ceramicGlass(finish.glass, rough), metal]));
  rBack.children[0].position.z = -D2 + 0.02;
  const pillMat = ceramicGlass(finish.glass);
  pillMat.roughness = 0.22;
  const pill = new THREE.Mesh(
    extrude(rectShape4(4.2, 1.74, [0.87, 0.87, 0.87, 0.87], 5.72, 4.55), { depth: 0.14, bevel: 0.05, bevelSegments: 5, curveSegments: 16 }),
    pillMat,
  );
  pill.position.z = -D2 - 0.05;
  rBack.add(pill);
  const pillFace = -D2 - 0.12;
  let mainLens: THREE.Object3D | null = null;
  for (const [x, y] of LENSES) {
    const ring = lensRing(0.66, 0.2, metal, lensCover);
    ring.position.set(x, y, pillFace - 0.05);
    rBack.add(ring);
    mainLens ??= ring;
  }
  const flash = flashUnit(0.17);
  flash.position.set(4.1, 4.86, pillFace - 0.003);
  rBack.add(flash);
  const mic = sensorDot(0.05);
  mic.position.set(4.1, 4.24, pillFace - 0.003);
  rBack.add(mic);
  rightHalf.add(rBack);

  const lBack = new THREE.Group();
  lBack.add(new THREE.Mesh(extrude(halfShape(-1, 0.05), { depth: 0.05, bevel: 0.015, bevelSegments: 2 }), blackGlass()));
  lBack.children[0].position.z = -D2 + 0.02;
  const outer = buildDisplay(W2 - 0.34, H2 - 0.34, 0.95, 0.06, duoOuterScreenTexture(), 0.12);
  outer.rotation.y = Math.PI;
  outer.position.set(-W2 / 2, 0, -D2 - 0.01);
  lBack.add(outer);
  const outerAnchor = new THREE.Object3D();
  outerAnchor.position.set(-W2 / 2 - 2.4, 1.8, -D2 - 0.05);
  lBack.add(outerAnchor);
  leftHalf.add(lBack);

  /* Inner display, split across the halves ------------------------------- */
  const innerTex = duoInnerScreenTexture();
  const innerBounds = { minX: -W2 + 0.16, maxX: W2 - 0.16, minY: -H2 / 2 + 0.16, maxY: H2 / 2 - 0.16 };
  const innerHalf = (side: -1 | 1) => {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(extrude(displayShape(side, 0.07), { depth: 0.08, bevel: 0.012, bevelSegments: 2 }), blackGlass());
    glass.position.z = -0.056;
    g.add(glass);
    const screenGeo = planarUVs(new THREE.ShapeGeometry(displayShape(side, 0.16), 12), innerBounds);
    const screen = new THREE.Mesh(screenGeo, screenMaterial(innerTex));
    screen.position.z = -0.004;
    g.add(screen);
    return g;
  };
  const lDisplay = innerHalf(-1);
  const rDisplay = innerHalf(1);
  const innerAnchor = new THREE.Object3D();
  innerAnchor.position.set(W2 * 0.62, 2.6, 0);
  rDisplay.add(innerAnchor);
  leftHalf.add(lDisplay);
  rightHalf.add(rDisplay);

  /* Internals ------------------------------------------------------------- */
  const board = buildLogicBoard(boardSpec(), fx);
  board.group.position.copy(BOARD_CENTER);
  rightHalf.add(board.group);

  const vapor = buildVaporChamber(6.9, 4.9, CHIP[0] - VAPOR_CENTER.x, CHIP[1] - VAPOR_CENTER.y, fx);
  vapor.position.copy(VAPOR_CENTER);
  const vaporAnchor = new THREE.Object3D();
  vaporAnchor.position.set(CHIP[0] - VAPOR_CENTER.x + 1.3, CHIP[1] - VAPOR_CENTER.y - 0.6, 0.03);
  vapor.add(vaporAnchor);
  rightHalf.add(vapor);

  const cams = new THREE.Group();
  for (const [x, y] of LENSES) {
    const m = cameraModule(0.52, 0.42);
    m.position.set(x, y, -0.3);
    cams.add(m);
  }
  rightHalf.add(cams);

  const rBattery = buildBattery(6.4, 5.4, 0.28, "iPhone Duo");
  rBattery.position.copy(BATTERY_R);
  const batteryAnchor = new THREE.Object3D();
  batteryAnchor.position.set(-2.2, 1.0, 0.15);
  rBattery.add(batteryAnchor);
  rightHalf.add(rBattery);
  const lBattery = buildBattery(6.2, 8.8, 0.28, "iPhone Duo");
  lBattery.position.copy(BATTERY_L);
  leftHalf.add(lBattery);

  /* Hinge ------------------------------------------------------------------ */
  const hinge = buildHinge(metal);
  root.add(hinge.group);

  const parts = {
    lFrame: new Part("l-frame", lFrame),
    rFrame: new Part("r-frame", rFrame),
    lBack: new Part("l-back", lBack),
    rBack: new Part("r-back", rBack),
    lDisplay: new Part("l-display", lDisplay),
    rDisplay: new Part("r-display", rDisplay),
    board: new Part("board", board.group),
    vapor: new Part("vapor", vapor),
    cams: new Part("cams", cams),
    rBattery: new Part("r-battery", rBattery),
    lBattery: new Part("l-battery", lBattery),
    hinge: new Part("hinge", hinge.group),
  };
  const all = Object.values(parts);
  let presence = 1;

  /* Choreography ------------------------------------------------------------ */
  const flatC = flatCenterFor(BOARD_CENTER);
  const flatBoard = flatOffset(BOARD_CENTER, 0, flatC);
  const flatVapor = flatOffset(VAPOR_CENTER, 2.4, flatC);
  const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  // Batteries slide under the board, still side by side across the hinge.
  const flatR = add(flatOffset(BATTERY_R, -2.3, flatC), [0, 0, -3.2]);
  const flatL = add(flatOffset(BATTERY_L, -2.3, flatC), [0, 0, -3.2]);
  const O: Vec3 = [0, 0, 0];
  const PI = Math.PI;

  /** Z-explode during "First surface", then drift away when the board takes over. */
  const layer = (dz: number, away: Vec3, fadeAt = 0.425) =>
    track([{ t: 0 }, { t: 0.205 }, { t: 0.285, p: [0, 0, dz] }, { t: 0.385 }, { t: fadeAt, p: add([0, 0, dz], away), o: 0 }]);

  parts.lDisplay.setTrack(layer(4.0, [-4, 3, 6]));
  parts.rDisplay.setTrack(layer(4.0, [4, 3, 6]));
  parts.lFrame.setTrack(layer(-1.3, [-6, -3, -6]));
  parts.rFrame.setTrack(layer(-1.3, [6, -3, -6]));
  parts.lBack.setTrack(layer(-3.6, [-6, 0, -8]));
  parts.rBack.setTrack(layer(-3.6, [6, 0, -8]));
  parts.cams.setTrack(layer(1.4, [0, 3, 3], 0.415));
  parts.hinge.setTrack(
    track([
      { t: 0 },
      { t: 0.205 },
      { t: 0.29, p: [0, -8.6, 1.2], ease: easeInOutQuint },
      { t: 0.385 },
      { t: 0.425, p: [0, -13, 1.2], o: 0 },
    ]),
  );
  parts.board.setTrack(
    track([
      { t: 0 },
      { t: 0.205 },
      { t: 0.285, p: [0, 0, 1.4] },
      { t: 0.385 },
      { t: 0.435, p: flatBoard, r: FLAT_ROT },
      { t: 0.7 },
      { t: 0.745, p: add(flatBoard, [0, -5, 0]), o: 0 },
    ]),
  );
  const flyIn = (dz: number, flat: Vec3, away: Vec3, from: Vec3) =>
    track([
      { t: 0 },
      { t: 0.205 },
      { t: 0.285, p: [0, 0, dz] },
      { t: 0.385 },
      { t: 0.425, p: add([0, 0, dz], away), o: 0 },
      { t: 0.555, p: add(flat, from), r: FLAT_ROT, o: 0 },
      { t: 0.6, p: flat, o: 1, ease: easeOutCubic },
      { t: 0.7 },
      { t: 0.745, p: add(flat, [0, -6, 0]), o: 0 },
    ]);
  parts.vapor.setTrack(flyIn(2.6, flatVapor, [5, 4, -8], [0, 6, 0]));
  parts.rBattery.setTrack(flyIn(0.2, flatR, [6, -6, -8], [0, -6, 0]));
  parts.lBattery.setTrack(flyIn(0.2, flatL, [-6, -6, -8], [0, -6, 0]));

  const fold = (p: number) => PI * (1 - easeInOutCubic(range(0.12, 0.185, p)));

  return {
    id: "duo",
    root,
    parts: all,
    board,
    vapor: parts.vapor,
    anchors: {
      outerDisplay: outerAnchor,
      innerDisplay: innerAnchor,
      hinge: hinge.anchor,
      frame: frameAnchor,
      chip: board.chipAnchor,
      vapor: vaporAnchor,
      battery: batteryAnchor,
      mainLens: mainLens ?? rBack,
    },
    layout() {
      /* The Duo stack reads well at every aspect; nothing to re-slot. */
    },
    cameraKeys(): CamKey[] {
      const closed: Vec3 = [W2 / 2, 0, 0];
      const stack: Vec3 = [-3.6, 0, 1.2];
      return [
        { t: 0, target: closed, az: PI + 0.6, el: 0.12, w: 10, h: 15.5, sx: 0.2, sy: -0.16 },
        { t: 0.06, target: closed, az: PI + 0.42, el: 0.1, w: 10, h: 15.5, sx: 0.2, sy: -0.16 },
        { t: 0.105, target: closed, az: 0.38, el: 0.08, w: 10, h: 15, sx: 0.2, sy: 0.1 },
        { t: 0.12, target: closed, az: 0.32, el: 0.08, w: 10, h: 15, sx: 0.2, sy: 0.1 },
        { t: 0.185, target: O, az: 0.12, el: 0.1, w: 30, h: 18, sx: 0.2, sy: 0.1 },
        { t: 0.205, target: O, az: 0.12, el: 0.1, w: 30, h: 18, sx: 0.2, sy: 0.1 },
        { t: 0.285, target: [0, -2.4, 0], az: 0.72, el: 0.4, w: 27, h: 27, sx: 0.12, sy: 0.1, dy: -0.12 },
        { t: 0.385, target: [0, -2.4, 0], az: 0.6, el: 0.34, w: 27, h: 27, sx: 0.12, sy: 0.1, dy: -0.12 },
        { t: 0.43, target: O, az: 0.28, el: 0.66, w: 11, h: 9, sx: 0.16, sy: 0.1 },
        { t: 0.48, target: [0, 0.2, 0.2], az: 0.48, el: 0.34, w: 8, h: 7, sx: 0.16, sy: 0.1 },
        { t: 0.535, target: [0, 0.2, 0.2], az: 0.62, el: 0.3, w: 8, h: 7, sx: 0.16, sy: 0.1 },
        { t: 0.6, target: stack, az: 0.75, el: 0.55, w: 22, h: 15, sx: 0.12, sy: 0.1 },
        { t: 0.7, target: stack, az: 0.95, el: 0.48, w: 22, h: 15, sx: 0.12, sy: 0.1 },
        ...studioCameraKeys(),
      ];
    },
    update(p: number) {
      const f = fold(p);
      leftHalf.rotation.y = f;
      hinge.setFold(f);
      hinge.setExplode(easeInOutCubic(range(0.29, 0.345, p)));
      for (const part of all) part.update(p, presence);
      board.setSplit(splitAmount(p));
    },
    setPresence(v: number) {
      presence = v;
    },
    setFinish(metalColor, glassColor) {
      for (const part of all) applyFinish(part.materials, metalColor, glassColor);
    },
  };
}
