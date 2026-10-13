import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pcbMaterial, steel, vaporMaterial, type FxUniforms } from "../materials";
import { easeInOutCubic, easeOutCubic, lerp, mulberry32, range } from "../math";
import { Part } from "../timeline";
import {
  boardTextures,
  chipLidTexture,
  dieShotTexture,
  memoryDieTexture,
  packageTexture,
  vaporChamberTextures,
} from "../textures";

interface Layer {
  obj: THREE.Object3D;
  y0: number;
  y1: number;
}

export interface ChipStudio {
  part: Part;
  screws: Part;
  dieAnchor: THREE.Object3D;
  coolingAnchor: THREE.Object3D;
  setExplode(t: number, time: number): void;
}

const SCREWS = 22;

function topPlane(w: number, d: number, y: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

export function buildChipStudio(fx: FxUniforms, label: string): ChipStudio {
  const group = new THREE.Group();
  group.name = "chip-studio";
  const layers: Layer[] = [];
  const add = (obj: THREE.Object3D, y0: number, y1: number) => {
    obj.position.y = y0;
    group.add(obj);
    layers.push({ obj, y0, y1 });
  };

  // Board section with routed traces (shares the pulsing trace shader).
  const half = 3.2;
  const outline = [
    new THREE.Vector2(-half, -half),
    new THREE.Vector2(half, -half),
    new THREE.Vector2(half, half),
    new THREE.Vector2(-half, half),
  ];
  const tex = boardTextures({
    bounds: { minX: -half, maxX: half, minY: -half, maxY: half },
    outline,
    components: [{ x: 0, y: 0, w: 4.1, h: 4.1 }],
    hubs: [{ x: 0, y: 0 }],
    ppc: 150,
    seed: 404,
  });
  const board = new THREE.Group();
  board.add(
    new THREE.Mesh(
      new RoundedBoxGeometry(half * 2, 0.18, half * 2, 2, 0.04),
      new THREE.MeshStandardMaterial({ name: "board-core", color: 0x0d2a22, roughness: 0.5, metalness: 0.2 }),
    ),
  );
  board.add(topPlane(half * 2 - 0.02, half * 2 - 0.02, 0.092, pcbMaterial(tex.map, tex.glow, fx)));
  add(board, 0, -2.5);

  // Solder balls.
  const ballGeo = new THREE.SphereGeometry(0.075, 12, 8);
  const balls = new THREE.InstancedMesh(ballGeo, steel(), 18 * 18);
  const m = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < 18; i++) {
    for (let j = 0; j < 18; j++) {
      m.makeTranslation(-1.87 + i * 0.22, 0, -1.87 + j * 0.22);
      balls.setMatrixAt(n++, m);
    }
  }
  balls.instanceMatrix.needsUpdate = true;
  add(balls, 0.17, -1.55);

  // Package substrate.
  const substrate = new THREE.Group();
  substrate.add(
    new THREE.Mesh(
      new RoundedBoxGeometry(4.1, 0.22, 4.1, 2, 0.04),
      new THREE.MeshStandardMaterial({ name: "substrate", color: 0x14281f, roughness: 0.45, metalness: 0.2 }),
    ),
  );
  substrate.add(
    topPlane(4.0, 4.0, 0.112, new THREE.MeshStandardMaterial({ name: "substrate-top", map: packageTexture(), roughness: 0.4, metalness: 0.4 })),
  );
  add(substrate, 0.34, -0.55);

  // SoC die beside its memory (M-series style packaging).
  const silicon = new THREE.Group();
  const dieBody = new THREE.MeshStandardMaterial({ name: "die-body", color: 0x2b2c33, roughness: 0.3, metalness: 0.6 });
  const soc = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.1, 2.05, 2, 0.015), dieBody);
  soc.position.x = -0.62;
  silicon.add(soc);
  const socTop = topPlane(
    2.16,
    2.0,
    0.051,
    new THREE.MeshPhysicalMaterial({
      name: "die-shot",
      map: dieShotTexture(),
      roughness: 0.18,
      metalness: 0.55,
      iridescence: 0.8,
      iridescenceIOR: 1.7,
      clearcoat: 1,
    }),
  );
  socTop.position.x = -0.62;
  silicon.add(socTop);
  const memTex = memoryDieTexture();
  for (let i = 0; i < 2; i++) {
    const x = 0.95 + i * 0.66;
    const mem = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.1, 2.05, 2, 0.015), dieBody);
    mem.position.x = x;
    silicon.add(mem);
    const memTop = topPlane(
      0.55,
      2.0,
      0.051,
      new THREE.MeshPhysicalMaterial({ name: "mem-die", map: memTex, roughness: 0.2, metalness: 0.5, iridescence: 0.6 }),
    );
    memTop.position.x = x;
    silicon.add(memTop);
  }
  const dieAnchor = new THREE.Object3D();
  dieAnchor.position.set(-1.72, 0.05, -0.2);
  silicon.add(dieAnchor);
  add(silicon, 0.5, 0.75);

  // Thermal interface material.
  const tim = new THREE.Mesh(
    new RoundedBoxGeometry(3.7, 0.04, 3.7, 2, 0.015),
    new THREE.MeshPhysicalMaterial({
      name: "tim",
      color: 0x9aa0a8,
      roughness: 0.6,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  add(tim, 0.58, 1.7);

  // Heat spreader lid.
  const lid = new THREE.Group();
  lid.add(new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.16, 3.9, 3, 0.06), steel()));
  lid.add(
    topPlane(
      3.6,
      3.6,
      0.081,
      new THREE.MeshStandardMaterial({ name: "lid-etch", map: chipLidTexture(label, "APL1V20 · 2NM"), metalness: 0.9, roughness: 0.3 }),
    ),
  );
  add(lid, 0.69, 2.55);

  // Vapor chamber and graphite spreader.
  const vTex = vaporChamberTextures(0.42, 0.5);
  const vapor = new THREE.Group();
  vapor.add(
    new THREE.Mesh(
      new RoundedBoxGeometry(6.4, 0.12, 5.2, 3, 0.05),
      new THREE.MeshStandardMaterial({ name: "copper", color: 0xb8713f, metalness: 1, roughness: 0.3 }),
    ),
  );
  // Texture is portrait; lay it in rotated so the lattice runs the long way.
  const vTop = topPlane(5.1, 6.3, 0.061, vaporMaterial(vTex.map, vTex.heat, fx));
  vTop.rotation.z = Math.PI / 2;
  vapor.add(vTop);
  const coolingAnchor = new THREE.Object3D();
  coolingAnchor.position.set(3.2, 0.06, -1.2);
  vapor.add(coolingAnchor);
  add(vapor, 0.84, 3.6);

  const graphite = new THREE.Mesh(
    new RoundedBoxGeometry(6.6, 0.03, 5.4, 2, 0.012),
    new THREE.MeshPhysicalMaterial({ name: "graphite", color: 0x25262b, roughness: 0.3, metalness: 0.5, clearcoat: 0.4 }),
  );
  add(graphite, 0.93, 4.5);

  // Screws: seated around the board, then thrown into a slow orbit.
  const screwGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.17, 0.17, 0.08, 24).translate(0, 0.04, 0),
    new THREE.CylinderGeometry(0.075, 0.07, 0.42, 16).translate(0, -0.21, 0),
  ]);
  const screwMesh = new THREE.InstancedMesh(screwGeo, steel(), SCREWS);
  const screwGroup = new THREE.Group();
  screwGroup.add(screwMesh);
  const rng = mulberry32(12);
  const seats = Array.from({ length: SCREWS }, (_, i) => {
    const a = (i / SCREWS) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * 2.9, 0.2, Math.sin(a) * 2.9);
  });
  const orbit = Array.from({ length: SCREWS }, () => ({
    radius: 5.2 + rng() * 1.8,
    angle: rng() * Math.PI * 2,
    height: -0.5 + rng() * 3.6,
    speed: 0.08 + rng() * 0.08,
    spin: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
    spinRate: 0.5 + rng() * 1.2,
  }));

  const part = new Part("chip-studio", group);
  const screws = new Part("screws", screwGroup);
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const target = new THREE.Vector3();

  return {
    part,
    screws,
    dieAnchor,
    coolingAnchor,
    setExplode(t: number, time: number) {
      const e = easeInOutCubic(t);
      for (const l of layers) l.obj.position.y = lerp(l.y0, l.y1, e);
      const fly = easeOutCubic(range(0, 0.8, t));
      for (let i = 0; i < SCREWS; i++) {
        const o = orbit[i];
        const a = o.angle + time * o.speed;
        target.set(Math.cos(a) * o.radius, o.height + Math.sin(a * 2) * 0.25, Math.sin(a) * o.radius);
        p.lerpVectors(seats[i], target, fly);
        q.setFromAxisAngle(o.spin, time * o.spinRate * fly);
        m.compose(p, q, one);
        screwMesh.setMatrixAt(i, m);
      }
      screwMesh.instanceMatrix.needsUpdate = true;
    },
  };
}

