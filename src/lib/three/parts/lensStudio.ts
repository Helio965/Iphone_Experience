import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { lensGeometry, tubeGeometry } from "../geometry";
import { darkMetal, filterGlass, gold, lensGlass, steel } from "../materials";
import { easeInOutCubic, lerp } from "../math";
import { Part } from "../timeline";
import { sensorTexture } from "../textures";

interface Element {
  obj: THREE.Object3D;
  y0: number;
  y1: number;
  /** Optional sideways drift while exploded, for a less mechanical spread. */
  x1?: number;
}

export interface LensStudio {
  part: Part;
  /** Anchor at the iris for the aperture callout. */
  irisAnchor: THREE.Object3D;
  sensorAnchor: THREE.Object3D;
  setExplode(t: number): void;
  /** `null` draws a fixed stop (no blades), otherwise an f-number for the six-blade iris. */
  setAperture(f: number | null): void;
}

const F_WIDE = 1.48;

/** Paints a six-blade iris into a canvas texture; alpha cuts the opening. */
class IrisPainter {
  readonly canvas = document.createElement("canvas");
  readonly texture: THREE.CanvasTexture;
  private last = "";

  constructor() {
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  draw(f: number | null) {
    const key = f === null ? "fixed" : f.toFixed(3);
    if (key === this.last) return;
    this.last = key;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    const S = 512;
    const c = S / 2;
    const R = S / 2 - 4;
    ctx.clearRect(0, 0, S, S);

    if (f === null) {
      ctx.fillStyle = "#26272c";
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.arc(c, c, R * 0.62, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c, c, R * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      this.texture.needsUpdate = true;
      return;
    }

    // Opening (hexagon inradius) scales with 1/f, as the physical aperture does.
    const a = R * (F_WIDE / f) * 0.66;
    const swirl = 0.55;
    const verts: [number, number][] = [];
    const outer: [number, number][] = [];
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const vr = a / Math.cos(Math.PI / 6);
      verts.push([c + Math.cos(ang) * vr, c + Math.sin(ang) * vr]);
      const oa = ang + swirl + (1 - a / R) * 0.5;
      outer.push([c + Math.cos(oa) * R * 1.08, c + Math.sin(oa) * R * 1.08]);
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.clip();
    for (let k = 0; k < 6; k++) {
      const n = (k + 1) % 6;
      const grad = ctx.createLinearGradient(verts[k][0], verts[k][1], outer[n][0], outer[n][1]);
      const shade = 34 + (k % 3) * 9;
      grad.addColorStop(0, `rgb(${shade + 26},${shade + 27},${shade + 32})`);
      grad.addColorStop(1, `rgb(${shade},${shade},${shade + 4})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(verts[k][0], verts[k][1]);
      ctx.lineTo(verts[n][0], verts[n][1]);
      ctx.quadraticCurveTo(
        lerp(verts[n][0], outer[n][0], 0.5) + (outer[n][1] - verts[n][1]) * 0.12,
        lerp(verts[n][1], outer[n][1], 0.5) - (outer[n][0] - verts[n][0]) * 0.12,
        outer[n][0],
        outer[n][1],
      );
      ctx.lineTo(outer[k][0], outer[k][1]);
      ctx.quadraticCurveTo(
        lerp(verts[k][0], outer[k][0], 0.5) + (outer[k][1] - verts[k][1]) * 0.12,
        lerp(verts[k][1], outer[k][1], 0.5) - (outer[k][0] - verts[k][0]) * 0.12,
        verts[k][0],
        verts[k][1],
      );
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(verts[k][0], verts[k][1]);
      ctx.lineTo(verts[n][0], verts[n][1]);
      ctx.stroke();
    }
    ctx.restore();
    this.texture.needsUpdate = true;
  }
}

export function buildLensStudio(cover: THREE.Texture): LensStudio {
  const group = new THREE.Group();
  group.name = "lens-studio";
  const elements: Element[] = [];
  const add = (obj: THREE.Object3D, y0: number, y1: number, x1 = 0) => {
    obj.position.y = y0;
    group.add(obj);
    elements.push({ obj, y0, y1, x1 });
  };

  const rimMat = new THREE.MeshStandardMaterial({ name: "lens-rim", color: 0x0d0e12, roughness: 0.6, metalness: 0.2 });
  const element = (r: number, t: number, front: number, back: number, wing = 0) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(lensGeometry(r, t, front, back, wing), lensGlass()));
    const rim = new THREE.Mesh(tubeGeometry(r * 0.97, r * 1.02, t * 0.7, 0.005), rimMat);
    g.add(rim);
    return g;
  };

  // Sapphire cover in its stainless ring.
  const coverGroup = new THREE.Group();
  const coverMat = new THREE.MeshPhysicalMaterial({
    name: "sapphire",
    map: cover,
    roughness: 0.03,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    iridescence: 0.7,
    transparent: true,
    opacity: 0.92,
  });
  const coverDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.06, 72), [steel(), coverMat, coverMat]);
  coverGroup.add(coverDisc);
  coverGroup.add(new THREE.Mesh(tubeGeometry(1.08, 1.3, 0.26, 0.04), steel()));
  add(coverGroup, 2.08, 5.0, 0.15);

  add(element(0.82, 0.2, 0.12, 0.03), 1.8, 4.1, -0.1);
  add(element(0.74, 0.12, -0.05, 0.09), 1.57, 3.35, 0.08);

  // Iris.
  const iris = new IrisPainter();
  iris.draw(F_WIDE);
  const irisGroup = new THREE.Group();
  const irisMat = new THREE.MeshStandardMaterial({
    name: "iris",
    map: iris.texture,
    transparent: true,
    alphaTest: 0.02,
    metalness: 0.8,
    roughness: 0.38,
    side: THREE.DoubleSide,
  });
  const irisDisc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 72), irisMat);
  irisDisc.rotation.x = -Math.PI / 2;
  irisGroup.add(irisDisc);
  irisGroup.add(new THREE.Mesh(tubeGeometry(0.98, 1.12, 0.1, 0.02), darkMetal()));
  const irisAnchor = new THREE.Object3D();
  irisAnchor.position.set(1.12, 0, 0);
  irisGroup.add(irisAnchor);
  add(irisGroup, 1.38, 2.6, 0);

  add(element(0.7, 0.16, 0.06, 0.06), 1.19, 1.86, -0.06);
  add(element(0.88, 0.1, 0.03, -0.02, 0.08), 0.97, 1.12, 0.05);
  add(element(1.0, 0.08, -0.02, 0, 0.12), 0.74, 0.38, 0);

  // Barrel: stays put and turns into a ghost as the optics leave it.
  const barrelMat = new THREE.MeshStandardMaterial({ name: "barrel", color: 0x17181c, metalness: 0.7, roughness: 0.38 });
  const barrel = new THREE.Mesh(tubeGeometry(1.04, 1.2, 1.7, 0.04), barrelMat);
  barrel.position.y = 1.32;
  group.add(barrel);

  // IR cut filter.
  const filter = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.03, 1.25, 2, 0.01), filterGlass());
  add(filter, 0.4, -0.45, 0);

  // 48MP sensor package.
  const sensor = new THREE.Group();
  sensor.add(
    new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 0.12, 1.5, 2, 0.03),
      new THREE.MeshStandardMaterial({ name: "sensor-pkg", color: 0x2a2b30, roughness: 0.5, metalness: 0.4 }),
    ),
  );
  const die = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.2),
    new THREE.MeshPhysicalMaterial({
      name: "sensor-die",
      map: sensorTexture(),
      roughness: 0.2,
      metalness: 0.3,
      iridescence: 1,
      iridescenceIOR: 1.8,
      clearcoat: 1,
    }),
  );
  die.rotation.x = -Math.PI / 2;
  die.position.y = 0.061;
  sensor.add(die);
  const sensorAnchor = new THREE.Object3D();
  sensorAnchor.position.set(0.95, 0.06, 0);
  sensor.add(sensorAnchor);
  add(sensor, 0.2, -1.3, 0);

  // Sensor-shift OIS: magnets and coil.
  const ois = new THREE.Group();
  const magnet = new THREE.MeshStandardMaterial({ name: "magnet", color: 0x3a3c42, metalness: 0.9, roughness: 0.3 });
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.18, 0.22, 2, 0.03), magnet);
    const a = (i / 4) * Math.PI * 2;
    m.position.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25);
    m.rotation.y = -a + Math.PI / 2;
    ois.add(m);
  }
  const coil = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.06, 16, 96),
    new THREE.MeshStandardMaterial({ name: "coil", color: 0xc06a32, metalness: 1, roughness: 0.25 }),
  );
  coil.rotation.x = Math.PI / 2;
  ois.add(coil);
  add(ois, 0.02, -2.05, 0);

  // Flex circuit.
  const flex = new THREE.Group();
  flex.add(
    new THREE.Mesh(
      new RoundedBoxGeometry(2.4, 0.05, 2.1, 2, 0.02),
      new THREE.MeshStandardMaterial({ name: "flex", color: 0xb8692b, roughness: 0.4, metalness: 0.2 }),
    ),
  );
  const contacts = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.06, 0.3, 2, 0.01), gold());
  contacts.position.set(0.6, 0.01, 0.95);
  flex.add(contacts);
  add(flex, -0.12, -2.7, 0);

  const part = new Part("lens-studio", group);

  return {
    part,
    irisAnchor,
    sensorAnchor,
    setExplode(t: number) {
      const e = easeInOutCubic(t);
      for (const el of elements) {
        el.obj.position.y = lerp(el.y0, el.y1, e);
        el.obj.position.x = lerp(0, el.x1 ?? 0, e);
      }
      part.setMaterialFactor("barrel", lerp(1, 0.16, e));
    },
    setAperture(f: number | null) {
      iris.draw(f);
    },
  };
}
