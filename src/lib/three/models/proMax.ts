import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FLAT_ROT, flatCenterFor, flatOffset, studioCameraKeys } from "../chapters";
import { extrude, planarUVs, rectShape4, squircleHole, squircleShape } from "../geometry";
import { anodizedAluminum, applyFinish, blackGlass, blackPlastic, ceramicGlass, type FxUniforms } from "../materials";
import { easeInOutQuint, easeOutCubic } from "../math";
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
import { backGlassMaps, proMaxScreenTexture } from "../textures";
import { Part, track, type Vec3 } from "../timeline";
import type { CamKey, DeviceModel } from "../types";

/** iPhone 18 Pro Max: 163.4 × 78.0 × 8.75 mm, modelled in centimetres. */
const W = 7.8;
const H = 16.34;
const D = 0.875;
const R = 1.5;

const BACK_Z = -D / 2;
const PLATEAU_BOTTOM = 3.9;
const PLATEAU_FACE = BACK_Z - 0.15;

/** Camera positions as seen from the front (+X is the right edge). */
const LENSES = {
  main: [2.55, 6.85] as const,
  ultra: [2.55, 5.18] as const,
  tele: [0.93, 6.02] as const,
};

const CHIP: [number, number] = [-1.75, 5.75];
const BOARD_CENTER = new THREE.Vector3(0, 5.3, -0.2);
const VAPOR_CENTER = new THREE.Vector3(0, 2.5, 0.25);
const BATTERY_CENTER = new THREE.Vector3(0, -2.75, -0.12);

function local(points: [number, number][], c: THREE.Vector3) {
  return points.map(([x, y]) => new THREE.Vector2(x - c.x, y - c.y));
}

function boardSpec(): BoardSpec {
  const c = BOARD_CENTER;
  const at = (x: number, y: number) => ({ x: x - c.x, y: y - c.y });
  return {
    outline: local(
      [
        [-3.55, 2.85],
        [3.55, 2.85],
        [3.55, 4.2],
        [0.1, 4.2],
        [0.1, 7.75],
        [-3.55, 7.75],
      ],
      c,
    ),
    holes: [at(-3.2, 7.42), at(3.22, 3.1), at(-3.2, 3.1), at(-0.22, 7.42)].map((p) => ({ ...p, r: 0.09 })),
    chip: at(...CHIP),
    seed: 18,
    chipLabel: "A20 PRO",
    top: [
      { ...at(...CHIP), w: 1.5, h: 1.5, d: 0.11, kind: "soc", label: "U1000" },
      { ...at(-1.72, 7.22), w: 3.0, h: 0.7, d: 0.12, kind: "shield", label: "SH2" },
      { ...at(-0.45, 6.05), w: 0.6, h: 0.9, d: 0.08, kind: "ic", label: "U2010" },
      { ...at(-3.1, 5.75), w: 0.55, h: 1.2, d: 0.08, kind: "ic", label: "U3300" },
      { ...at(-0.5, 4.72), w: 0.7, h: 0.35, d: 0.1, kind: "connector", label: "J4100" },
      { ...at(-2.75, 3.5), w: 0.8, h: 0.8, d: 0.08, kind: "ic", label: "PMU" },
      { ...at(-1.45, 3.5), w: 1.2, h: 0.95, d: 0.1, kind: "ic", label: "NAND" },
      { ...at(0.05, 3.5), w: 1.15, h: 0.95, d: 0.09, kind: "ic", label: "C2" },
      { ...at(1.4, 3.5), w: 0.65, h: 0.65, d: 0.07, kind: "ic", label: "N1" },
      { ...at(2.7, 3.5), w: 1.3, h: 0.95, d: 0.12, kind: "shield", label: "RF" },
    ],
    bottom: [
      { ...at(-1.75, 5.75), w: 1.2, h: 1.2, d: 0.08, kind: "ic" },
      { ...at(1.0, 3.5), w: 1.0, h: 0.8, d: 0.08, kind: "ic" },
      { ...at(-2.6, 3.6), w: 0.7, h: 0.7, d: 0.08, kind: "ic" },
      { ...at(-0.4, 7.25), w: 0.35, h: 0.35, d: 0.14, kind: "inductor" },
      { ...at(2.5, 3.4), w: 0.4, h: 0.4, d: 0.14, kind: "inductor" },
    ],
  };
}

export function buildProMax(fx: FxUniforms, finish: { metal: string; glass: string }, lensCover: THREE.Texture): DeviceModel {
  const root = new THREE.Group();
  root.name = "iphone-18-pro-max";
  const metal = anodizedAluminum(finish.metal);

  /* Unibody shell ------------------------------------------------------- */
  const shell = new THREE.Group();
  const bandShape = squircleShape(W, H, R);
  // Bevel must stay under half the wall or the cap ring collapses into a solid sheet.
  bandShape.holes.push(squircleHole(W - 0.34, H - 0.34, R - 0.17));
  shell.add(new THREE.Mesh(extrude(bandShape, { depth: D, bevel: 0.07, bevelSegments: 6, curveSegments: 16 }), metal));

  const backPlate = new THREE.Mesh(extrude(squircleShape(W - 0.12, H - 0.12, R - 0.06), { depth: 0.07, bevel: 0.02, bevelSegments: 2 }), metal);
  backPlate.position.z = BACK_Z + 0.045;
  shell.add(backPlate);

  const pTop = H / 2 - 0.17;
  const plateau = new THREE.Mesh(
    extrude(rectShape4(W - 0.34, pTop - PLATEAU_BOTTOM, [R - 0.17, R - 0.17, 0.62, 0.62], 0, (pTop + PLATEAU_BOTTOM) / 2), {
      depth: 0.17,
      bevel: 0.06,
      bevelSegments: 5,
      curveSegments: 14,
    }),
    metal,
  );
  plateau.position.z = BACK_Z - 0.065;
  shell.add(plateau);

  const lensAnchor = new THREE.Object3D();
  for (const [key, [x, y]] of Object.entries(LENSES)) {
    const ring = lensRing(0.8, 0.24, metal, lensCover);
    ring.position.set(x, y, PLATEAU_FACE - 0.06);
    shell.add(ring);
    if (key === "main") {
      lensAnchor.position.set(x - 0.8, y, PLATEAU_FACE - 0.18);
      shell.add(lensAnchor);
    }
  }
  const flash = flashUnit(0.27);
  flash.position.set(-2.45, 6.85, PLATEAU_FACE - 0.003);
  shell.add(flash);
  const lidar = sensorDot(0.25);
  lidar.position.set(-2.45, 5.22, PLATEAU_FACE - 0.003);
  shell.add(lidar);
  const mic = sensorDot(0.055);
  mic.position.set(-1.25, 7.45, PLATEAU_FACE - 0.003);
  shell.add(mic);

  // Ceramic Shield back inset with the mirror-polished logo (roughness map).
  const gTop = PLATEAU_BOTTOM - 0.28;
  const gBottom = -H / 2 + 0.24;
  const gW = W - 0.48;
  const gH = gTop - gBottom;
  const gCy = (gTop + gBottom) / 2;
  const logoY = (-0.4 - gBottom) / gH;
  const glassGeo = extrude(rectShape4(gW, gH, [0.45, 0.45, R - 0.24, R - 0.24], 0, gCy), {
    depth: 0.05,
    bevel: 0.016,
    bevelSegments: 2,
  });
  // Mirror U so the logo reads correctly from behind.
  planarUVs(glassGeo, { minX: gW / 2, maxX: -gW / 2, minY: gBottom, maxY: gTop });
  const glass = new THREE.Mesh(glassGeo, [ceramicGlass(finish.glass, backGlassMaps(gW, gH, logoY, 2.0)), metal]);
  glass.position.z = BACK_Z - 0.006;
  shell.add(glass);

  // Buttons, port and antenna bands.
  const button = (len: number, y: number, side: -1 | 1, mat: THREE.Material) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.12, len, 0.3, 3, 0.05), mat);
    b.position.set(side * (W / 2 + 0.015), y, 0.02);
    shell.add(b);
  };
  button(0.75, 4.6, -1, metal);
  button(1.2, 3.25, -1, metal);
  button(1.2, 1.8, -1, metal);
  button(1.85, 3.3, 1, metal);
  button(1.5, -2.6, 1, blackGlass());
  const port = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.12, 0.32, 3, 0.05), blackPlastic());
  port.position.set(0, -H / 2 + 0.02, 0);
  shell.add(port);
  const band = blackPlastic();
  for (const [x, y] of [
    [-1, 6.6],
    [1, 6.6],
    [-1, -6.9],
    [1, -6.9],
  ]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, D * 0.7), band);
    b.position.set(x * (W / 2 - 0.005), y, 0);
    shell.add(b);
  }
  const shellAnchor = new THREE.Object3D();
  shellAnchor.position.set(W / 2 + 0.05, 1.5, 0);
  shell.add(shellAnchor);
  root.add(shell);

  /* Front display -------------------------------------------------------- */
  const display = buildDisplay(W - 0.2, H - 0.2, R - 0.1, 0.12, proMaxScreenTexture(), 0.13);
  display.position.z = D / 2 - 0.07;
  root.add(display);

  /* Vapor chamber --------------------------------------------------------- */
  const vapor = buildVaporChamber(6.7, 9.6, CHIP[0] - VAPOR_CENTER.x, CHIP[1] - VAPOR_CENTER.y, fx);
  vapor.position.copy(VAPOR_CENTER);
  const vaporAnchor = new THREE.Object3D();
  vaporAnchor.position.set(CHIP[0] - VAPOR_CENTER.x + 1.2, CHIP[1] - VAPOR_CENTER.y - 0.6, 0.03);
  vapor.add(vaporAnchor);
  root.add(vapor);

  /* Logic board ------------------------------------------------------------ */
  const board = buildLogicBoard(boardSpec(), fx);
  board.group.position.copy(BOARD_CENTER);
  root.add(board.group);

  /* Camera modules ---------------------------------------------------------- */
  const cams = new THREE.Group();
  for (const [x, y] of Object.values(LENSES)) {
    const m = cameraModule(0.62, 0.78);
    m.position.set(x, y, -0.12);
    cams.add(m);
  }
  root.add(cams);

  /* Battery ------------------------------------------------------------------ */
  const battery = buildBattery(7.0, 9.7, 0.46, "iPhone 18 Pro Max");
  battery.position.copy(BATTERY_CENTER);
  const batteryAnchor = new THREE.Object3D();
  batteryAnchor.position.set(-2.4, 2.2, 0.24);
  battery.add(batteryAnchor);
  root.add(battery);

  const parts = {
    shell: new Part("shell", shell),
    display: new Part("display", display),
    vapor: new Part("vapor", vapor),
    board: new Part("board", board.group),
    cams: new Part("cams", cams),
    battery: new Part("battery", battery),
  };
  const all = Object.values(parts);
  let presence = 1;

  /* Choreography ------------------------------------------------------------- */
  const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const flatC = flatCenterFor(BOARD_CENTER);
  const flatVapor = flatOffset(VAPOR_CENTER, 2.7, flatC);
  // Battery tucked under the board so the thermal stack reads as one tower.
  const flatBattery = add(flatOffset(BATTERY_CENTER, -2.6, flatC), [0, 0, -6.6]);
  const flatBoard = flatOffset(BOARD_CENTER, 0, flatC);
  const O: Vec3 = [0, 0, 0];
  const PI = Math.PI;

  function layout(aspect: number) {
    const wide = aspect >= 1.1;
    const slots: Record<string, [number, number]> = wide
      ? { shell: [-18.6, 0], battery: [-9.3, 0], board: [0, 0], vapor: [9.3, 0], display: [18.6, 0] }
      : { shell: [-8.8, 9.6], battery: [0, 9.6], board: [8.8, 9.6], vapor: [-4.4, -9.6], display: [4.4, -9.6] };
    const row = (name: string, base: THREE.Vector3): Vec3 => {
      const [x, dy] = slots[name];
      return [x - base.x, dy, -base.z];
    };
    const rShell = row("shell", parts.shell.base);
    const rDisplay = row("display", parts.display.base);
    const rVapor = row("vapor", parts.vapor.base);
    const rBoard = row("board", parts.board.base);
    const rBattery = row("battery", parts.battery.base);

    parts.shell.setTrack(
      track([
        { t: 0 },
        { t: 0.205 },
        { t: 0.27, p: [0, 0, -4.6] },
        { t: 0.285 },
        { t: 0.36, p: rShell, r: [0, PI, 0], ease: easeInOutQuint },
        { t: 0.385 },
        { t: 0.425, p: add(rShell, [-10, -2, -8]), o: 0 },
      ]),
    );
    parts.display.setTrack(
      track([
        { t: 0 },
        { t: 0.205 },
        { t: 0.27, p: [0, 0, 4.2] },
        { t: 0.285 },
        { t: 0.36, p: rDisplay, ease: easeInOutQuint },
        { t: 0.385 },
        { t: 0.425, p: add(rDisplay, [10, -2, -8]), o: 0 },
      ]),
    );
    parts.vapor.setTrack(
      track([
        { t: 0 },
        { t: 0.205 },
        { t: 0.27, p: [0, 0, 2.4] },
        { t: 0.285 },
        { t: 0.36, p: rVapor, ease: easeInOutQuint },
        { t: 0.385 },
        { t: 0.425, p: add(rVapor, [6, 4, -8]), o: 0 },
        { t: 0.555, p: add(flatVapor, [0, 6, 0]), r: FLAT_ROT, o: 0 },
        { t: 0.6, p: flatVapor, o: 1, ease: easeOutCubic },
        { t: 0.7 },
        { t: 0.745, p: add(flatVapor, [0, -5, 0]), o: 0 },
      ]),
    );
    parts.board.setTrack(
      track([
        { t: 0 },
        { t: 0.205 },
        { t: 0.27, p: [0, 0, 0.9] },
        { t: 0.285 },
        { t: 0.36, p: rBoard, ease: easeInOutQuint },
        { t: 0.385 },
        { t: 0.435, p: flatBoard, r: FLAT_ROT },
        { t: 0.7 },
        { t: 0.745, p: add(flatBoard, [0, -5, 0]), o: 0 },
      ]),
    );
    parts.cams.setTrack(
      track([
        { t: 0 },
        { t: 0.205 },
        { t: 0.27, p: [0, 0, 0.9] },
        { t: 0.285 },
        { t: 0.36, p: rBoard, ease: easeInOutQuint },
        { t: 0.385 },
        { t: 0.415, p: add(rBoard, [0, 3, 3]), o: 0 },
      ]),
    );
    parts.battery.setTrack(
      track([
        { t: 0 },
        { t: 0.205 },
        { t: 0.27, p: [0, 0, -1.6] },
        { t: 0.285 },
        { t: 0.36, p: rBattery, ease: easeInOutQuint },
        { t: 0.385 },
        { t: 0.425, p: add(rBattery, [-6, -6, -8]), o: 0 },
        { t: 0.555, p: add(flatBattery, [0, -6, 0]), r: FLAT_ROT, o: 0 },
        { t: 0.6, p: flatBattery, o: 1, ease: easeOutCubic },
        { t: 0.7 },
        { t: 0.745, p: add(flatBattery, [0, -8, 0]), o: 0 },
      ]),
    );
  }
  layout(16 / 9);

  return {
    id: "proMax",
    root,
    parts: all,
    board,
    vapor: parts.vapor,
    anchors: {
      mainLens: lensAnchor,
      shell: shellAnchor,
      chip: board.chipAnchor,
      vapor: vaporAnchor,
      battery: batteryAnchor,
    },
    layout,
    cameraKeys(aspect: number): CamKey[] {
      const wide = aspect >= 1.1;
      const stackCenter: Vec3 = [0, 0.2, 1.8];
      return [
        { t: 0, target: O, az: PI + 0.62, el: 0.12, w: 12, h: 21, sx: 0.2, sy: -0.16 },
        { t: 0.06, target: O, az: PI + 0.42, el: 0.1, w: 12, h: 21, sx: 0.2, sy: -0.16 },
        { t: 0.12, target: O, az: PI + 0.1, el: 0.06, w: 12, h: 20.5, sx: 0.2, sy: 0.1 },
        { t: 0.195, target: O, az: 0.5, el: 0.1, w: 12, h: 20.5, sx: 0.2, sy: 0.1 },
        { t: 0.255, target: O, az: 0.95, el: 0.24, w: 22, h: 24, sx: 0.12, sy: 0.1 },
        { t: 0.285, target: O, az: 0.9, el: 0.2, w: 22, h: 24, sx: 0.12, sy: 0.1 },
        { t: 0.365, target: O, az: 0, el: 0.03, w: wide ? 50 : 25, h: wide ? 29 : 62, sx: 0, sy: 0.06, dy: -0.15 },
        { t: 0.385, target: O, az: 0, el: 0.03, w: wide ? 50 : 25, h: wide ? 29 : 62, sx: 0, sy: 0.06, dy: -0.15 },
        { t: 0.43, target: O, az: 0.28, el: 0.66, w: 11, h: 9, sx: 0.16, sy: 0.1 },
        { t: 0.48, target: [0, 0.2, 0.2], az: 0.48, el: 0.34, w: 8, h: 7, sx: 0.16, sy: 0.1 },
        { t: 0.535, target: [0, 0.2, 0.2], az: 0.62, el: 0.3, w: 8, h: 7, sx: 0.16, sy: 0.1 },
        { t: 0.6, target: stackCenter, az: 0.72, el: 0.42, w: 17, h: 15, sx: 0.16, sy: 0.1 },
        { t: 0.7, target: stackCenter, az: 0.98, el: 0.36, w: 17, h: 15, sx: 0.16, sy: 0.1 },
        ...studioCameraKeys(),
      ];
    },
    update(p: number) {
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

/** Board sandwich opens mid-chapter 03 and closes again before the thermal chapter. */
export function splitAmount(p: number) {
  const open = THREE.MathUtils.smoothstep(p, 0.44, 0.485);
  const close = THREE.MathUtils.smoothstep(p, 0.53, 0.565);
  return Math.max(0, open - close);
}
