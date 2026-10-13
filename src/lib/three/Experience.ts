import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { ModelId } from "@/data/products";
import { adaptForAspect } from "./chapters";
import { createFx, type FxUniforms } from "./materials";
import { clamp, damp, easeInOutCubic, lerp, range, smoothstep, window4 } from "./math";
import { buildDuo } from "./models/duo";
import { buildProMax } from "./models/proMax";
import { buildChipStudio, type ChipStudio } from "./parts/chipStudio";
import { HeatFlow } from "./parts/heat";
import { buildLensStudio, type LensStudio } from "./parts/lensStudio";
import { lensCoverTexture, particleTexture, setMaxAnisotropy } from "./textures";
import { track } from "./timeline";
import type { CamKey, DeviceModel } from "./types";

export interface AnchorState {
  x: number;
  y: number;
  visible: boolean;
}

export interface FrameInfo {
  progress: number;
  /** Screen-space anchor positions in CSS pixels relative to the canvas. */
  anchors: Record<string, AnchorState>;
  /** Live f-number while the iris animates (null when fixed or hidden). */
  aperture: number | null;
}

export interface FinishColors {
  metal: string;
  glass: string;
}

export interface ExperienceOptions {
  model: ModelId;
  finishes: Record<ModelId, FinishColors>;
  reducedMotion: boolean;
  onFrame?: (info: FrameInfo) => void;
}

const APERTURE_STOPS = [1.48, 1.8, 2.8, 4.0];

interface CamPose {
  target: THREE.Vector3;
  az: number;
  el: number;
  w: number;
  h: number;
  sx: number;
  sy: number;
  dy: number;
}

const newCamPose = (): CamPose => ({ target: new THREE.Vector3(), az: 0, el: 0, w: 1, h: 1, sx: 0, sy: 0, dy: 0 });

function sampleCamera(keys: CamKey[], t: number, out: CamPose) {
  let a = keys[0];
  let b = keys[keys.length - 1];
  if (t <= a.t) b = a;
  else if (t >= b.t) a = b;
  else {
    let i = 1;
    while (keys[i].t < t) i++;
    a = keys[i - 1];
    b = keys[i];
  }
  const u = a === b ? 0 : (b.ease ?? easeInOutCubic)((t - a.t) / (b.t - a.t));
  out.target.set(lerp(a.target[0], b.target[0], u), lerp(a.target[1], b.target[1], u), lerp(a.target[2], b.target[2], u));
  out.az = lerp(a.az, b.az, u);
  out.el = lerp(a.el, b.el, u);
  out.w = lerp(a.w, b.w, u);
  out.h = lerp(a.h, b.h, u);
  out.sx = lerp(a.sx ?? 0, b.sx ?? 0, u);
  out.sy = lerp(a.sy ?? 0, b.sy ?? 0, u);
  out.dy = lerp(a.dy ?? 0, b.dy ?? 0, u);
  return out;
}

/** Waits for web fonts so canvas-painted labels use Inter / SF instead of a fallback. */
async function fontsReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* Painting with a fallback face is fine. */
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export class Experience {
  private readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
  private readonly fx: FxUniforms = createFx();
  private readonly models: Record<ModelId, DeviceModel>;
  private readonly mix: Record<ModelId, number>;
  private readonly lens: LensStudio;
  private readonly chip: ChipStudio;
  private readonly heat: HeatFlow;
  private readonly camKeys = {} as Record<ModelId, CamKey[]>;
  private readonly poseA = newCamPose();
  private readonly poseB = newCamPose();
  private readonly finishFrom: Record<ModelId, { metal: THREE.Color; glass: THREE.Color }>;
  private readonly finishTo: Record<ModelId, { metal: THREE.Color; glass: THREE.Color }>;
  private readonly finishT: Record<ModelId, number> = { proMax: 1, duo: 1 };
  private readonly tmpMetal = new THREE.Color();
  private readonly tmpGlass = new THREE.Color();
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();
  private readonly anchorOut: Record<string, AnchorState> = {};
  private readonly info: FrameInfo = { progress: 0, anchors: this.anchorOut, aperture: null };

  private active: ModelId;
  private targetProgress = 0;
  private progress = 0;
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private width = 1;
  private height = 1;
  private raf = 0;
  private running = false;
  private visible = true;
  private disposed = false;
  private last = 0;
  private time = 0;
  private resizeObserver: ResizeObserver | null = null;
  private reduced: boolean;

  /** Resolves to `null` if `cancelled()` turns true while fonts load (e.g. a fast unmount). */
  static async create(canvas: HTMLCanvasElement, opts: ExperienceOptions, cancelled: () => boolean = () => false) {
    await fontsReady();
    if (cancelled()) return null;
    return new Experience(canvas, opts);
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opts: ExperienceOptions,
  ) {
    this.reduced = opts.reducedMotion;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    setMaxAnisotropy(Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8));

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.8;
    room.dispose();
    pmrem.dispose();

    this.setupLights();

    const cover = lensCoverTexture();
    this.models = {
      proMax: buildProMax(this.fx, opts.finishes.proMax, cover),
      duo: buildDuo(this.fx, opts.finishes.duo, cover),
    };
    this.active = opts.model;
    this.mix = { proMax: opts.model === "proMax" ? 1 : 0, duo: opts.model === "duo" ? 1 : 0 };
    for (const m of Object.values(this.models)) this.scene.add(m.root);

    const color = (c: string) => new THREE.Color(c);
    this.finishFrom = {
      proMax: { metal: color(opts.finishes.proMax.metal), glass: color(opts.finishes.proMax.glass) },
      duo: { metal: color(opts.finishes.duo.metal), glass: color(opts.finishes.duo.glass) },
    };
    this.finishTo = {
      proMax: { metal: color(opts.finishes.proMax.metal), glass: color(opts.finishes.proMax.glass) },
      duo: { metal: color(opts.finishes.duo.metal), glass: color(opts.finishes.duo.glass) },
    };

    this.lens = buildLensStudio(cover);
    this.lens.part.setTrack(
      track([
        { t: 0, o: 0, s: 0.7, p: [0, -0.6, 0] },
        { t: 0.715 },
        { t: 0.755, o: 1, s: 1, p: [0, 0, 0] },
        { t: 0.85 },
        { t: 0.878, o: 0, s: 0.92, p: [-3.2, 0.8, 0] },
      ]),
    );
    this.scene.add(this.lens.part.group);

    this.chip = buildChipStudio(this.fx, "A20 PRO");
    const chipTrack = track([
      { t: 0, o: 0, s: 0.75, p: [0, -1.2, 0] },
      { t: 0.86 },
      { t: 0.9, o: 1, s: 1, p: [0, 0, 0] },
      { t: 1 },
    ]);
    this.chip.part.setTrack(chipTrack);
    this.chip.screws.setTrack(chipTrack);
    this.scene.add(this.chip.part.group, this.chip.screws.group);

    this.heat = new HeatFlow(particleTexture());
    this.scene.add(this.heat.points);

    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas.parentElement ?? canvas);
    }
    this.renderer.compile(this.scene, this.camera);
    if (process.env.NODE_ENV === "development") {
      // Handy from the console: __experience.scene, __experience.setProgress(0.5)
      (window as unknown as { __experience?: Experience }).__experience = this;
    }
  }

  private setupLights() {
    // Lights ride with the camera so every chapter keeps a studio key / rim look.
    this.scene.add(this.camera);
    const aim = new THREE.Object3D();
    aim.position.set(0, 0, -30);
    this.camera.add(aim);
    const light = (color: number, intensity: number, pos: [number, number, number]) => {
      const l = new THREE.DirectionalLight(color, intensity);
      l.position.set(...pos);
      l.target = aim;
      this.camera.add(l);
    };
    light(0xffffff, 2.4, [-10, 12, 6]);
    light(0xaecbff, 2.2, [16, 6, -48]);
    light(0xffd7b0, 1.6, [-16, -4, -46]);
    light(0xffffff, 0.5, [4, -8, 2]);
    this.scene.add(new THREE.HemisphereLight(0x9aa6b8, 0x050505, 0.35));
  }

  /* Public API ----------------------------------------------------------- */

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      if (this.visible) this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setProgress(p: number) {
    this.targetProgress = clamp(p);
  }

  /** Jump without easing (e.g. after programmatic scroll on load). */
  syncProgress(p: number) {
    this.targetProgress = clamp(p);
    this.progress = this.targetProgress;
  }

  setVisible(v: boolean) {
    this.visible = v;
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  setModel(id: ModelId) {
    this.active = id;
  }

  setReducedMotion(v: boolean) {
    this.reduced = v;
  }

  setFinish(model: ModelId, colors: FinishColors) {
    const t = this.finishT[model];
    // Start the blend from wherever the current blend has reached.
    this.finishFrom[model].metal.lerpColors(this.finishFrom[model].metal, this.finishTo[model].metal, easeInOutCubic(t));
    this.finishFrom[model].glass.lerpColors(this.finishFrom[model].glass, this.finishTo[model].glass, easeInOutCubic(t));
    this.finishTo[model].metal.set(colors.metal);
    this.finishTo[model].glass.set(colors.glass);
    this.finishT[model] = 0;
  }

  /** Renders a single frame immediately (used when motion is reduced and nothing animates). */
  renderOnce() {
    this.frame(0);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    const texs = new Set<THREE.Texture>();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) geos.add(mesh.geometry);
      const m = mesh.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => mats.add(mm));
    });
    for (const m of mats) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) texs.add(v);
      m.dispose();
    }
    geos.forEach((g) => g.dispose());
    texs.forEach((t) => t.dispose());
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }

  /* Internals ------------------------------------------------------------- */

  private resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(parent.clientWidth, 1);
    const h = Math.max(parent.clientHeight, 1);
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    for (const id of Object.keys(this.models) as ModelId[]) {
      this.models[id].layout(this.camera.aspect);
      this.camKeys[id] = adaptForAspect(this.models[id].cameraKeys(this.camera.aspect), this.camera.aspect);
    }
    if (!this.running) this.frame(0);
  }

  private frame(dt: number) {
    const reduced = this.reduced;
    this.time += dt;
    const time = this.time;
    this.progress = reduced ? this.targetProgress : damp(this.progress, this.targetProgress, 7, dt);
    const p = this.progress;

    // Model crossfade.
    for (const id of Object.keys(this.models) as ModelId[]) {
      const goal = id === this.active ? 1 : 0;
      this.mix[id] = reduced || dt === 0 ? goal : damp(this.mix[id], goal, 6, dt);
      if (Math.abs(this.mix[id] - goal) < 0.002) this.mix[id] = goal;
    }

    // Finish colour blends.
    for (const id of Object.keys(this.models) as ModelId[]) {
      if (this.finishT[id] >= 1) continue;
      this.finishT[id] = reduced ? 1 : Math.min(1, this.finishT[id] + dt / 0.6);
      const e = easeInOutCubic(this.finishT[id]);
      this.tmpMetal.lerpColors(this.finishFrom[id].metal, this.finishTo[id].metal, e);
      this.tmpGlass.lerpColors(this.finishFrom[id].glass, this.finishTo[id].glass, e);
      this.models[id].setFinish(this.tmpMetal, this.tmpGlass);
    }

    // Pointer parallax (eased) and idle sway, only while the product is whole.
    this.pointer.sx = damp(this.pointer.sx, this.pointer.x, 4, dt);
    this.pointer.sy = damp(this.pointer.sy, this.pointer.y, 4, dt);
    const heroFactor = 1 - smoothstep(0.03, 0.2, p);
    const sway = reduced ? 0 : Math.sin(time * 0.45) * 0.06;

    for (const id of Object.keys(this.models) as ModelId[]) {
      const m = this.models[id];
      const v = this.mix[id];
      m.root.visible = v > 0.002;
      if (!m.root.visible) continue;
      m.setPresence(v);
      m.update(p, time);
      m.root.rotation.set(this.pointer.sy * 0.08 * heroFactor, (sway + this.pointer.sx * 0.22) * heroFactor, 0);
      m.root.position.y = (1 - easeInOutCubic(v)) * -1.6;
    }

    // Shared studio close-ups.
    this.lens.part.update(p);
    this.lens.setExplode(range(0.755, 0.8, p));
    let aperture: number | null = null;
    if (this.active === "proMax") {
      const u = range(0.795, 0.85, p) * (APERTURE_STOPS.length - 1);
      const seg = Math.min(Math.floor(u), APERTURE_STOPS.length - 2);
      const e = smoothstep(0.25, 0.75, u - seg);
      aperture = lerp(APERTURE_STOPS[seg], APERTURE_STOPS[seg + 1], e);
      this.lens.setAperture(aperture);
    } else {
      this.lens.setAperture(null);
    }
    this.lens.part.group.rotation.y = reduced ? 0 : time * 0.12;

    this.chip.part.update(p);
    this.chip.screws.update(p);
    this.chip.setExplode(range(0.9, 0.955, p), time);
    this.chip.part.group.rotation.y = reduced ? 0.4 : 0.4 + time * 0.05;

    // Shader drivers.
    this.fx.uTime.value = reduced ? 1.5 : time;
    this.fx.uGlow.value = Math.max(window4(0.4, 0.455, 0.6, 0.7, p), 0.7 * window4(0.88, 0.93, 1.1, 1.2, p));
    this.fx.uHeat.value = Math.max(window4(0.57, 0.62, 0.69, 0.73, p), 0.9 * window4(0.9, 0.95, 1.1, 1.2, p));

    // Heat leaves through the top of the vapor chamber, right above the die.
    const dev = this.models[this.active];
    dev.board.chipAnchor.getWorldPosition(this.tmpV);
    dev.vapor.group.getWorldPosition(this.tmpV2);
    this.tmpV.y = this.tmpV2.y + 0.04;
    this.heat.update(reduced ? 2 : time, window4(0.585, 0.62, 0.69, 0.72, p) * this.mix[this.active], this.tmpV);

    this.updateCamera(p);
    this.renderer.render(this.scene, this.camera);
    this.emit(p, aperture);
  }

  private updateCamera(p: number) {
    const a = sampleCamera(this.camKeys.proMax, p, this.poseA);
    const b = sampleCamera(this.camKeys.duo, p, this.poseB);
    const k = easeInOutCubic(this.mix.duo / Math.max(this.mix.duo + this.mix.proMax, 1e-3));
    const target = this.tmpV.lerpVectors(a.target, b.target, k);
    const az = lerp(a.az, b.az, k);
    const el = lerp(a.el, b.el, k);
    const w = lerp(a.w, b.w, k);
    const h = lerp(a.h, b.h, k);
    const aspect = this.camera.aspect;
    const kx = smoothstep(0.85, 1.3, aspect);
    const sx = lerp(a.sx, b.sx, k) * kx;
    const sy = lerp(lerp(a.sy, b.sy, k), lerp(a.dy, b.dy, k), kx);

    const halfTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = Math.max(h / (2 * halfTan), w / (2 * halfTan * aspect)) * (1 + Math.abs(sx) * 0.6);
    this.camera.position.set(
      target.x + dist * Math.sin(az) * Math.cos(el),
      target.y + dist * Math.sin(el),
      target.z + dist * Math.cos(az) * Math.cos(el),
    );
    this.camera.lookAt(target);
    this.camera.setViewOffset(this.width, this.height, -sx * this.width, sy * this.height, this.width, this.height);
    this.camera.updateProjectionMatrix();
  }

  private emit(p: number, aperture: number | null) {
    const cb = this.opts.onFrame;
    if (!cb) return;
    const dev = this.models[this.active];
    const anchors: Record<string, THREE.Object3D> = {
      ...dev.anchors,
      iris: this.lens.irisAnchor,
      sensor: this.lens.sensorAnchor,
      die: this.chip.dieAnchor,
      cooling: this.chip.coolingAnchor,
    };
    for (const [id, obj] of Object.entries(anchors)) {
      obj.getWorldPosition(this.tmpV).project(this.camera);
      const out = (this.anchorOut[id] ??= { x: 0, y: 0, visible: false });
      out.x = (this.tmpV.x * 0.5 + 0.5) * this.width;
      out.y = (-this.tmpV.y * 0.5 + 0.5) * this.height;
      out.visible = this.tmpV.z < 1 && Math.abs(this.tmpV.x) < 1.1 && Math.abs(this.tmpV.y) < 1.1;
    }
    this.info.progress = p;
    this.info.aperture = this.active === "proMax" && p > 0.76 && p < 0.87 ? aperture : null;
    cb(this.info);
  }
}
