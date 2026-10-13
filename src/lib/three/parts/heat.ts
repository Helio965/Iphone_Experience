import * as THREE from "three";
import { mulberry32 } from "../math";

const COUNT = 320;

/**
 * Heat leaving A20 Pro through the vapor chamber: embers bloom over the hot
 * spot, then rise and cool from white-orange to deep red.
 */
export class HeatFlow {
  readonly points: THREE.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly seeds: Float32Array;
  private readonly material: THREE.PointsMaterial;
  private readonly hot = new THREE.Color(1, 0.86, 0.55);
  private readonly cool = new THREE.Color(0.85, 0.18, 0.05);
  private readonly c = new THREE.Color();

  constructor(sprite: THREE.Texture) {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(COUNT * 3);
    this.colors = new Float32Array(COUNT * 3);
    this.seeds = new Float32Array(COUNT * 4);
    const rng = mulberry32(99);
    for (let i = 0; i < COUNT; i++) {
      this.seeds[i * 4] = rng();
      this.seeds[i * 4 + 1] = rng() * Math.PI * 2;
      this.seeds[i * 4 + 2] = 0.25 + rng() * 0.35;
      this.seeds[i * 4 + 3] = 1.5 + rng() * 3.5;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size: 0.32,
      map: sprite,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  /**
   * `origin` is the hot spot on the vapor chamber's top face. Particles bloom
   * there, spread a little, then rise and cool as heat leaves into the air.
   */
  update(time: number, intensity: number, origin: THREE.Vector3) {
    this.points.visible = intensity > 0.01;
    if (!this.points.visible) return;
    this.material.opacity = intensity;
    for (let i = 0; i < COUNT; i++) {
      const phase = (this.seeds[i * 4] + time * this.seeds[i * 4 + 2] * 0.6) % 1;
      const ang = this.seeds[i * 4 + 1];
      const spread = this.seeds[i * 4 + 3];
      const r = 0.2 + spread * 0.55 * Math.sqrt(phase) + phase * 0.6;
      const swirl = ang + phase * 1.4 + Math.sin(time * 0.7 + ang) * 0.15;
      this.positions[i * 3] = origin.x + Math.cos(swirl) * r;
      this.positions[i * 3 + 1] = origin.y + 0.05 + phase * (2.4 + spread * 0.5);
      this.positions[i * 3 + 2] = origin.z + Math.sin(swirl) * r;
      const heat = 1 - phase;
      const fade = Math.min(phase / 0.08, 1) * heat;
      this.c.copy(this.cool).lerp(this.hot, heat * heat).multiplyScalar(fade);
      this.colors[i * 3] = this.c.r;
      this.colors[i * 3 + 1] = this.c.g;
      this.colors[i * 3 + 2] = this.c.b;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
