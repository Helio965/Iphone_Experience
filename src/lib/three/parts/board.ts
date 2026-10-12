import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { extrude, planarUVs } from "../geometry";
import { blackPlastic, brushedSteel, gold, pcbMaterial, type FxUniforms } from "../materials";
import { mulberry32, type Rng } from "../math";
import { boardTextures, chipLidTexture } from "../textures";

export type ComponentKind = "soc" | "ic" | "shield" | "connector" | "inductor";

export interface BoardComponent {
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
  kind: ComponentKind;
  label?: string;
}

export interface BoardSpec {
  /** Closed outline, counter-clockwise, in the board's own XY plane (cm). */
  outline: THREE.Vector2[];
  holes: { x: number; y: number; r: number }[];
  chip: { x: number; y: number };
  top: BoardComponent[];
  bottom: BoardComponent[];
  seed: number;
  chipLabel: string;
}

export interface LogicBoard {
  group: THREE.Group;
  top: THREE.Group;
  interposer: THREE.Mesh;
  /** Sits on the A20 Pro lid; drives callouts and the heat particles. */
  chipAnchor: THREE.Object3D;
  setSplit(v: number): void;
}

const LAYER = 0.06;
const GAP = 0.2;

function inside(pt: THREE.Vector2, poly: THREE.Vector2[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function outlineShape(outline: THREE.Vector2[], holes: BoardSpec["holes"]) {
  const shape = new THREE.Shape(outline);
  for (const h of holes) {
    const p = new THREE.Path();
    p.absarc(h.x, h.y, h.r, 0, Math.PI * 2, true);
    shape.holes.push(p);
  }
  return shape;
}

/** Shrinks a polygon toward its centroid; good enough for the interposer ring on convex-ish outlines. */
function inset(outline: THREE.Vector2[], d: number) {
  const n = outline.length;
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = outline[(i - 1 + n) % n];
    const cur = outline[i];
    const next = outline[(i + 1) % n];
    const e1 = new THREE.Vector2().subVectors(cur, prev).normalize();
    const e2 = new THREE.Vector2().subVectors(next, cur).normalize();
    // Left normals for a counter-clockwise polygon point inward.
    const n1 = new THREE.Vector2(-e1.y, e1.x);
    const n2 = new THREE.Vector2(-e2.y, e2.x);
    const m = new THREE.Vector2().addVectors(n1, n2).normalize();
    const len = d / Math.max(m.dot(n1), 0.3);
    out.push(new THREE.Vector2(cur.x + m.x * len, cur.y + m.y * len));
  }
  return out;
}

function placePassives(
  rng: Rng,
  outline: THREE.Vector2[],
  avoid: BoardComponent[],
  count: number,
  z: number,
  dir: 1 | -1,
) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0, 0.5);
  const mat = new THREE.MeshStandardMaterial({ name: "passive", roughness: 0.45, metalness: 0.35 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  const palette = ["#b39a73", "#c4a985", "#8a7458", "#1c1c1f", "#2a2a2e", "#6d6f75", "#a8916d"];
  const pt = new THREE.Vector2();
  let placed = 0;
  let tries = 0;
  while (placed < count && tries < count * 30) {
    tries++;
    pt.set(minX + rng() * (maxX - minX), minY + rng() * (maxY - minY));
    if (!inside(pt, outline)) continue;
    const blocked = avoid.some(
      (a) => Math.abs(pt.x - a.x) < a.w / 2 + 0.06 && Math.abs(pt.y - a.y) < a.h / 2 + 0.06,
    );
    if (blocked) continue;
    const tall = rng() < 0.08;
    const w = tall ? 0.12 + rng() * 0.1 : 0.03 + rng() * 0.06;
    const h = tall ? w : 0.018 + rng() * 0.03;
    const d = tall ? 0.06 + rng() * 0.08 : 0.015 + rng() * 0.03;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rng() < 0.5 ? 0 : Math.PI / 2);
    if (dir === -1) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI));
    s.set(w, h, d);
    p.set(pt.x, pt.y, z);
    m.compose(p, q, s);
    mesh.setMatrixAt(placed, m);
    c.set(tall ? "#55585f" : palette[Math.floor(rng() * palette.length)]);
    mesh.setColorAt(placed, c);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function componentMesh(c: BoardComponent, z: number, dir: 1 | -1, lid?: THREE.Texture) {
  const g = new THREE.Group();
  const radius = Math.min(c.d / 2, 0.025);
  const geo = new RoundedBoxGeometry(c.w, c.h, c.d, 2, radius);
  const mat =
    c.kind === "shield"
      ? brushedSteel()
      : c.kind === "connector"
        ? gold()
        : c.kind === "inductor"
          ? new THREE.MeshStandardMaterial({ name: "inductor", color: 0x4a4c52, metalness: 0.6, roughness: 0.5 })
          : blackPlastic();
  const body = new THREE.Mesh(geo, mat);
  body.position.set(c.x, c.y, z + (dir * c.d) / 2);
  g.add(body);
  if (c.kind === "connector") {
    const housing = new THREE.Mesh(new RoundedBoxGeometry(c.w * 0.9, c.h * 0.55, c.d * 1.3, 2, 0.01), blackPlastic());
    housing.position.set(c.x, c.y, z + dir * c.d * 0.65);
    g.add(housing);
  }
  if (c.kind === "soc" && lid) {
    const lidMat = new THREE.MeshStandardMaterial({ name: "soc-lid", map: lid, metalness: 0.9, roughness: 0.32 });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(c.w * 0.86, c.h * 0.86), lidMat);
    plate.position.set(c.x, c.y, z + dir * (c.d + 0.002));
    if (dir === -1) plate.rotation.x = Math.PI;
    g.add(plate);
  }
  return g;
}

export function buildLogicBoard(spec: BoardSpec, fx: FxUniforms): LogicBoard {
  const rng = mulberry32(spec.seed);
  const xs = spec.outline.map((p) => p.x);
  const ys = spec.outline.map((p) => p.y);
  const bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  const comps = [...spec.top, ...spec.bottom].map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h, label: c.label }));
  const tex = boardTextures({
    bounds,
    outline: spec.outline,
    holes: spec.holes,
    components: comps,
    hubs: [spec.chip],
    ppc: 240,
    seed: spec.seed,
  });
  const pcb = pcbMaterial(tex.map, tex.glow, fx);
  const edge = new THREE.MeshStandardMaterial({ name: "pcb-edge", color: 0x2a3b2c, metalness: 0.6, roughness: 0.5 });

  const shape = outlineShape(spec.outline, spec.holes);
  const slab = () => planarUVs(extrude(shape, { depth: LAYER, bevel: 0.006, bevelSegments: 1 }), bounds);

  const group = new THREE.Group();
  group.name = "logic-board";

  // Lower layer: components face up into the sandwich.
  const bottom = new THREE.Group();
  const bottomSlab = new THREE.Mesh(slab(), [pcb, edge]);
  bottomSlab.position.z = LAYER / 2;
  bottom.add(bottomSlab);
  for (const c of spec.bottom) bottom.add(componentMesh(c, LAYER, 1));
  bottom.add(placePassives(rng, spec.outline, spec.bottom, 700, LAYER, 1));
  group.add(bottom);

  // Interposer ring that stacks the two layers.
  const ringShape = new THREE.Shape(inset(spec.outline, 0.04));
  ringShape.holes.push(new THREE.Path(inset(spec.outline, 0.26).reverse()));
  const interposer = new THREE.Mesh(
    extrude(ringShape, { depth: GAP, bevel: 0.004, bevelSegments: 1 }),
    [new THREE.MeshStandardMaterial({ name: "interposer", color: 0x18342a, roughness: 0.5, metalness: 0.2 }), gold()],
  );
  interposer.position.z = LAYER + GAP / 2;
  group.add(interposer);

  // Upper layer: SoC, modem, storage, PMIC under shields.
  const top = new THREE.Group();
  const topSlab = new THREE.Mesh(slab(), [pcb, edge]);
  topSlab.position.z = LAYER / 2;
  top.add(topSlab);
  const lid = chipLidTexture(spec.chipLabel, "APL1V20");
  for (const c of spec.top) top.add(componentMesh(c, LAYER, 1, c.kind === "soc" ? lid : undefined));
  top.add(placePassives(rng, spec.outline, spec.top, 900, LAYER, 1));
  top.position.z = LAYER + GAP;
  group.add(top);

  const soc = spec.top.find((c) => c.kind === "soc");
  const chipAnchor = new THREE.Object3D();
  chipAnchor.position.set(spec.chip.x, spec.chip.y, LAYER + (soc?.d ?? 0.1));
  top.add(chipAnchor);

  return {
    group,
    top,
    interposer,
    chipAnchor,
    setSplit(v: number) {
      top.position.z = LAYER + GAP + v * 1.1;
      interposer.position.z = LAYER + GAP / 2 + v * 0.5;
    },
  };
}
