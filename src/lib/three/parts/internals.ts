import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { boundsOf, extrude, planarUVs, roundedPlane, squircleShape, tubeGeometry } from "../geometry";
import {
  blackGlass,
  brushedSteel,
  darkMetal,
  screenMaterial,
  vaporMaterial,
  type FxUniforms,
} from "../materials";
import { batteryLabelTexture, vaporChamberTextures } from "../textures";

/* Battery ----------------------------------------------------------- */

export function buildBattery(w: number, h: number, d: number, title: string) {
  const group = new THREE.Group();
  group.name = "battery";
  const label = new THREE.MeshStandardMaterial({
    name: "battery-label",
    map: batteryLabelTexture(title),
    roughness: 0.55,
    metalness: 0.15,
  });
  const geo = planarUVs(extrude(squircleShape(w, h, 0.45), { depth: d, bevel: 0.05, bevelSegments: 3 }), boundsOf(w, h));
  const body = new THREE.Mesh(geo, [label, brushedSteel()]);
  group.add(body);
  // Flex tail with gold contacts.
  const flex = new THREE.Mesh(
    new RoundedBoxGeometry(1.4, 0.9, 0.03, 2, 0.012),
    new THREE.MeshStandardMaterial({ name: "flex", color: 0xc5772f, roughness: 0.4, metalness: 0.2 }),
  );
  flex.position.set(w * 0.22, h / 2 + 0.35, d / 2 - 0.02);
  group.add(flex);
  return group;
}

/* Vapor chamber ------------------------------------------------------ */

export function buildVaporChamber(w: number, h: number, hotX: number, hotY: number, fx: FxUniforms) {
  const group = new THREE.Group();
  group.name = "vapor-chamber";
  const u = hotX / w + 0.5;
  const v = hotY / h + 0.5;
  const tex = vaporChamberTextures(u, v);
  const mat = vaporMaterial(tex.map, tex.heat, fx);
  const side = new THREE.MeshStandardMaterial({ name: "copper", color: 0xb8713f, metalness: 1, roughness: 0.3 });
  const geo = planarUVs(extrude(squircleShape(w, h, 0.6), { depth: 0.05, bevel: 0.012, bevelSegments: 2 }), boundsOf(w, h));
  group.add(new THREE.Mesh(geo, [mat, side]));
  return group;
}

/* Displays ----------------------------------------------------------- */

/**
 * Cover glass slab with the emissive panel just beneath its front face.
 * Front faces +Z.
 */
export function buildDisplay(w: number, h: number, r: number, d: number, screen: THREE.Texture, bezel = 0.12) {
  const group = new THREE.Group();
  group.name = "display";
  const glass = new THREE.Mesh(extrude(squircleShape(w, h, r), { depth: d, bevel: 0.03, bevelSegments: 3 }), blackGlass());
  group.add(glass);
  const panel = new THREE.Mesh(roundedPlane(w - bezel * 2, h - bezel * 2, Math.max(r - bezel, 0.1)), screenMaterial(screen));
  // Far enough above the glass to avoid z-fighting at wide shots.
  panel.position.z = d / 2 + 0.008;
  group.add(panel);
  return group;
}

/* Camera hardware on the housing ------------------------------------ */

/**
 * Raised stainless ring with a sapphire cover, facing -Z (out of the back).
 */
export function lensRing(r: number, height: number, ringMat: THREE.Material, cover: THREE.Texture) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(tubeGeometry(r * 0.84, r, height, 0.03), ringMat);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const coverMat = new THREE.MeshPhysicalMaterial({
    name: "lens-cover",
    map: cover,
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    iridescence: 0.6,
    iridescenceIOR: 1.5,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.85, 64), coverMat);
  disc.rotation.y = Math.PI;
  disc.position.z = -height / 2 + 0.01;
  g.add(disc);
  // Inner dark well so the glass reads as deep.
  const well = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.84, r * 0.6, 0.3, 48, 1, true), darkMetal());
  well.rotation.x = Math.PI / 2;
  well.position.z = -height / 2 + 0.17;
  g.add(well);
  return g;
}

export function flashUnit(r: number) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    name: "flash",
    color: 0xf3e6c4,
    roughness: 0.35,
    transmission: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    emissive: 0x2a2416,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), mat);
  disc.rotation.y = Math.PI;
  g.add(disc);
  return g;
}

export function sensorDot(r: number) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), blackGlass());
  m.rotation.y = Math.PI;
  return m;
}

/** Simplified internal camera module (barrel + sensor block) used inside the phone. */
export function cameraModule(r: number, length: number) {
  const g = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.82, length, 40), darkMetal());
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);
  const base = new THREE.Mesh(
    new RoundedBoxGeometry(r * 2.1, r * 2.1, length * 0.45, 2, 0.04),
    new THREE.MeshStandardMaterial({ name: "cam-module", color: 0x4c4f56, metalness: 0.9, roughness: 0.38 }),
  );
  base.position.z = length * 0.45;
  g.add(base);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.7, 40), blackGlass());
  glass.rotation.y = Math.PI;
  glass.position.z = -length / 2 - 0.001;
  g.add(glass);
  return g;
}
