import * as THREE from "three";

/** Uniforms shared by every shader patch in the scene, advanced once per frame. */
export interface FxUniforms {
  uTime: { value: number };
  /** 0–1: how strongly logic-board traces pulse. */
  uGlow: { value: number };
  /** 0–1: vapor chamber heat map intensity. */
  uHeat: { value: number };
}

export const createFx = (): FxUniforms => ({
  uTime: { value: 0 },
  uGlow: { value: 0 },
  uHeat: { value: 0 },
});

export const HOUSING_METAL = "housing-metal";
export const HOUSING_GLASS = "housing-glass";

export function anodizedAluminum(color: THREE.ColorRepresentation) {
  return new THREE.MeshPhysicalMaterial({
    name: HOUSING_METAL,
    color,
    metalness: 1,
    roughness: 0.36,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
    envMapIntensity: 1.15,
  });
}

export function polishedTitanium(color: THREE.ColorRepresentation) {
  return new THREE.MeshPhysicalMaterial({
    name: HOUSING_METAL,
    color,
    metalness: 1,
    roughness: 0.11,
    envMapIntensity: 1.35,
  });
}

export function ceramicGlass(color: THREE.ColorRepresentation, maps?: { roughness: THREE.Texture; metalness: THREE.Texture }) {
  return new THREE.MeshPhysicalMaterial({
    name: HOUSING_GLASS,
    color,
    metalness: maps ? 1 : 0.04,
    metalnessMap: maps?.metalness ?? null,
    roughness: maps ? 1 : 0.5,
    roughnessMap: maps?.roughness ?? null,
    clearcoat: 0.7,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.1,
  });
}

export function screenMaterial(map: THREE.Texture) {
  return new THREE.MeshPhysicalMaterial({
    name: "screen",
    color: 0x030303,
    emissive: 0xffffff,
    emissiveMap: map,
    emissiveIntensity: 1.05,
    roughness: 0.12,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
}

export const blackGlass = () =>
  new THREE.MeshPhysicalMaterial({
    name: "black-glass",
    color: 0x050506,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });

export const darkMetal = () =>
  new THREE.MeshStandardMaterial({ name: "dark-metal", color: 0x1d1e22, metalness: 0.85, roughness: 0.42 });

export const steel = () =>
  new THREE.MeshStandardMaterial({ name: "steel", color: 0xb9bcc2, metalness: 1, roughness: 0.28 });

export const brushedSteel = () =>
  new THREE.MeshStandardMaterial({ name: "brushed-steel", color: 0x9da1a8, metalness: 1, roughness: 0.42 });

export const gold = () =>
  new THREE.MeshStandardMaterial({ name: "gold", color: 0xd9b36a, metalness: 1, roughness: 0.3 });

export const blackPlastic = () =>
  new THREE.MeshStandardMaterial({ name: "black-plastic", color: 0x101114, metalness: 0.1, roughness: 0.55 });

export const carbonFiber = () =>
  new THREE.MeshPhysicalMaterial({
    name: "carbon",
    color: 0x16171a,
    metalness: 0.4,
    roughness: 0.35,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  });

export function lensGlass() {
  return new THREE.MeshPhysicalMaterial({
    name: "lens-glass",
    color: 0xe8f0ff,
    metalness: 0,
    roughness: 0.03,
    transparent: true,
    opacity: 0.38,
    iridescence: 1,
    iridescenceIOR: 1.65,
    iridescenceThicknessRange: [220, 640],
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function filterGlass() {
  return new THREE.MeshPhysicalMaterial({
    name: "ir-filter",
    color: 0x6f8cff,
    metalness: 0.2,
    roughness: 0.05,
    transparent: true,
    opacity: 0.45,
    iridescence: 1,
    iridescenceIOR: 1.9,
    iridescenceThicknessRange: [300, 900],
    envMapIntensity: 2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Solder-mask board whose copper traces light up with travelling pulses. */
export function pcbMaterial(map: THREE.Texture, glow: THREE.Texture, fx: FxUniforms) {
  const mat = new THREE.MeshStandardMaterial({
    name: "pcb",
    map,
    emissive: 0x47e6ff,
    emissiveMap: glow,
    emissiveIntensity: 1,
    roughness: 0.48,
    metalness: 0.25,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = fx.uTime;
    shader.uniforms.uGlow = fx.uGlow;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uGlow;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          vec2 q = vEmissiveMapUv;
          float b1 = fract(q.x * 1.4 + q.y * 0.6 - uTime * 0.16);
          float b2 = fract(q.y * 2.2 - q.x * 0.5 - uTime * 0.11 + 0.37);
          float p1 = smoothstep(0.0, 0.06, b1) * (1.0 - smoothstep(0.06, 0.26, b1));
          float p2 = smoothstep(0.0, 0.05, b2) * (1.0 - smoothstep(0.05, 0.18, b2));
          totalEmissiveRadiance *= (0.12 + 3.2 * p1 + 2.2 * p2) * uGlow;
        }`,
      );
  };
  mat.customProgramCacheKey = () => "pcb-glow";
  return mat;
}

/** Copper vapor chamber with a live heat map that blooms during the thermal chapter. */
export function vaporMaterial(map: THREE.Texture, heat: THREE.Texture, fx: FxUniforms) {
  const mat = new THREE.MeshPhysicalMaterial({
    name: "vapor",
    map,
    metalness: 1,
    roughness: 0.26,
    emissive: 0xff5a1c,
    emissiveMap: heat,
    emissiveIntensity: 1,
    clearcoat: 0.2,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = fx.uTime;
    shader.uniforms.uHeat = fx.uHeat;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uHeat;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float core = smoothstep(0.55, 1.0, emissiveColor.r);
          float shimmer = 0.85 + 0.15 * sin(uTime * 2.6 + vEmissiveMapUv.y * 18.0);
          totalEmissiveRadiance = mix(totalEmissiveRadiance, vec3(1.0, 0.82, 0.45) * emissiveColor.r * 1.4, core);
          totalEmissiveRadiance *= uHeat * shimmer * 1.6;
        }`,
      );
  };
  mat.customProgramCacheKey = () => "vapor-heat";
  return mat;
}

/** Recolour every housing material of a group in place (finish picker). */
export function applyFinish(materials: readonly THREE.Material[], metal: THREE.ColorRepresentation, glass: THREE.ColorRepresentation) {
  for (const m of materials) {
    if (m.name === HOUSING_METAL) (m as THREE.MeshPhysicalMaterial).color.set(metal);
    if (m.name === HOUSING_GLASS) (m as THREE.MeshPhysicalMaterial).color.set(glass);
  }
}
