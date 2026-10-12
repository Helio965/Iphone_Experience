import * as THREE from "three";
import { APPLE_LOGO_PATH, APPLE_LOGO_VIEWBOX, DISPLAY_FONT_STACK, MONO_FONT_STACK } from "@/assets/brand";
import { mulberry32, pick, type Rng } from "./math";

/*
 * Every surface detail in the scene is painted here at runtime: no bitmap
 * downloads, nothing licensed, and it stays sharp at any device pixel ratio.
 */

type Ctx = CanvasRenderingContext2D;

let maxAnisotropy = 8;
export const setMaxAnisotropy = (v: number) => {
  maxAnisotropy = v;
};

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function grain(ctx: Ctx, w: number, h: number, rng: Rng, count: number, alpha: number, light = true) {
  for (let i = 0; i < count; i++) {
    const v = light ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rng()})`;
    ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 1.5, 1 + rng() * 1.5);
  }
}

const logoPath = () => new Path2D(APPLE_LOGO_PATH);

function drawLogo(ctx: Ctx, cx: number, cy: number, size: number, fill: string) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / APPLE_LOGO_VIEWBOX, size / APPLE_LOGO_VIEWBOX);
  ctx.fillStyle = fill;
  ctx.fill(logoPath());
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Logic board                                                         */
/* ------------------------------------------------------------------ */

export interface BoardRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface BoardTextureOptions {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  outline: THREE.Vector2[];
  holes?: { x: number; y: number; r: number }[];
  components: BoardRect[];
  hubs: { x: number; y: number }[];
  ppc: number;
  seed: number;
  mask?: string;
}

export function boardTextures(o: BoardTextureOptions) {
  const { bounds, ppc } = o;
  const W = (bounds.maxX - bounds.minX) * ppc;
  const H = (bounds.maxY - bounds.minY) * ppc;
  const { canvas, ctx } = makeCanvas(W, H);
  const { canvas: gCanvas, ctx: g } = makeCanvas(W, H);
  const rng = mulberry32(o.seed);
  const X = (x: number) => (x - bounds.minX) * ppc;
  const Y = (y: number) => (bounds.maxY - y) * ppc;

  // Solder mask.
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, o.mask ?? "#0a2b23");
  base.addColorStop(1, "#071d18");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);

  // Copper pours glimpsed through the mask.
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(90, 170, 130, ${0.03 + rng() * 0.04})`;
    const w = (0.4 + rng() * 1.6) * ppc;
    const h = (0.3 + rng() * 1.2) * ppc;
    roundRect(ctx, rng() * W - w / 2, rng() * H - h / 2, w, h, 0.05 * ppc);
    ctx.fill();
  }

  const dirs = [
    [1, 0],
    [Math.SQRT1_2, -Math.SQRT1_2],
    [0, -1],
    [-Math.SQRT1_2, -Math.SQRT1_2],
    [-1, 0],
    [-Math.SQRT1_2, Math.SQRT1_2],
    [0, 1],
    [Math.SQRT1_2, Math.SQRT1_2],
  ];

  const traceColor = "rgba(120, 214, 168, 0.32)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  g.lineCap = "round";
  g.lineJoin = "round";

  const vias: [number, number][] = [];

  // Free-running routes.
  for (let i = 0; i < 260; i++) {
    let x = rng() * W;
    let y = rng() * H;
    let d = pick(rng, [0, 2, 4, 6]);
    const width = (0.012 + rng() * 0.03) * ppc;
    const hot = rng() < 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    g.beginPath();
    g.moveTo(x, y);
    const segs = 2 + Math.floor(rng() * 5);
    for (let s = 0; s < segs; s++) {
      const len = (0.12 + rng() * 0.9) * ppc;
      x += dirs[d][0] * len;
      y += dirs[d][1] * len;
      ctx.lineTo(x, y);
      g.lineTo(x, y);
      d = (d + pick(rng, [-1, 0, 0, 1]) + 8) % 8;
    }
    ctx.strokeStyle = traceColor;
    ctx.lineWidth = width;
    ctx.stroke();
    g.strokeStyle = hot ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)";
    g.lineWidth = width * 1.1;
    g.stroke();
    vias.push([x, y]);
  }

  // Buses fanning out of each hub (DRAM / PCIe style bundles with mitred 45° bends).
  for (const hub of o.hubs) {
    for (let side = 0; side < 4; side++) {
      const n1 = [
        [1, 0],
        [0, -1],
        [-1, 0],
        [0, 1],
      ][side];
      const bendLeft = rng() < 0.5;
      const turn = bendLeft ? 1 : -1;
      // second direction rotated 45° from the first
      const a = Math.atan2(n1[1], n1[0]) + (turn * Math.PI) / 4;
      const n2 = [Math.cos(a), Math.sin(a)];
      const perp = [-n1[1], n1[0]];
      const count = 8 + Math.floor(rng() * 8);
      const pitch = 0.045 * ppc;
      const l1 = (0.9 + rng() * 0.6) * ppc;
      const l2 = (0.6 + rng() * 1.4) * ppc;
      const sx = X(hub.x) + n1[0] * 0.75 * ppc;
      const sy = Y(hub.y) + n1[1] * 0.75 * ppc;
      for (let k = 0; k < count; k++) {
        const off = (k - (count - 1) / 2) * pitch;
        const ox = perp[0] * off;
        const oy = perp[1] * off;
        const cx = sx + ox + n1[0] * (l1 + off * turn * 0.414);
        const cy = sy + oy + n1[1] * (l1 + off * turn * 0.414);
        ctx.beginPath();
        ctx.moveTo(sx + ox, sy + oy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + n2[0] * l2, cy + n2[1] * l2);
        ctx.strokeStyle = "rgba(150, 230, 186, 0.38)";
        ctx.lineWidth = 0.016 * ppc;
        ctx.stroke();
        g.beginPath();
        g.moveTo(sx + ox, sy + oy);
        g.lineTo(cx, cy);
        g.lineTo(cx + n2[0] * l2, cy + n2[1] * l2);
        g.strokeStyle = "rgba(255,255,255,1)";
        g.lineWidth = 0.02 * ppc;
        g.stroke();
        if (k % 3 === 0) vias.push([cx + n2[0] * l2, cy + n2[1] * l2]);
      }
    }
  }

  // Vias.
  for (let i = 0; i < 520; i++) vias.push([rng() * W, rng() * H]);
  for (const [vx, vy] of vias) {
    const r = (0.012 + rng() * 0.012) * ppc;
    ctx.beginPath();
    ctx.arc(vx, vy, r * 1.7, 0, Math.PI * 2);
    ctx.fillStyle = "#c9a45a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vx, vy, r * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = "#1b120a";
    ctx.fill();
    g.beginPath();
    g.arc(vx, vy, r * 1.5, 0, Math.PI * 2);
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.fill();
  }

  // Footprints, silkscreen and pad rows for every placed component.
  ctx.font = `${Math.round(0.07 * ppc)}px ${MONO_FONT_STACK}`;
  for (const c of o.components) {
    const x = X(c.x - c.w / 2);
    const y = Y(c.y + c.h / 2);
    const w = c.w * ppc;
    const h = c.h * ppc;
    ctx.fillStyle = "rgba(8, 22, 18, 0.9)";
    ctx.fillRect(x - 0.03 * ppc, y - 0.03 * ppc, w + 0.06 * ppc, h + 0.06 * ppc);
    ctx.fillStyle = "#c8a25a";
    const pad = 0.03 * ppc;
    for (let px = x; px < x + w; px += pad * 2.2) {
      ctx.fillRect(px, y - pad * 2.2, pad, pad * 1.4);
      ctx.fillRect(px, y + h + pad * 0.8, pad, pad * 1.4);
    }
    ctx.strokeStyle = "rgba(235, 240, 235, 0.55)";
    ctx.lineWidth = Math.max(1, 0.008 * ppc);
    const m = 0.08 * ppc;
    ctx.strokeRect(x - m, y - m, w + 2 * m, h + 2 * m);
    if (c.label) {
      ctx.fillStyle = "rgba(235, 240, 235, 0.6)";
      ctx.fillText(c.label, x - m, y - m - 0.03 * ppc);
    }
  }

  // Scattered silkscreen reference designators.
  ctx.fillStyle = "rgba(235, 240, 235, 0.35)";
  ctx.font = `${Math.round(0.05 * ppc)}px ${MONO_FONT_STACK}`;
  for (let i = 0; i < 70; i++) {
    const label = `${pick(rng, ["C", "R", "L", "U", "J", "FL", "TP"])}${1000 + Math.floor(rng() * 8999)}`;
    ctx.fillText(label, rng() * W, rng() * H);
  }

  // Mask grain.
  grain(ctx, W, H, rng, Math.round((W * H) / 90), 0.05);

  // Gold edge plating and mounting pads.
  ctx.save();
  ctx.beginPath();
  o.outline.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
  ctx.closePath();
  ctx.strokeStyle = "#d7b56d";
  ctx.lineWidth = 0.07 * ppc;
  ctx.stroke();
  ctx.restore();
  for (const hole of o.holes ?? []) {
    ctx.beginPath();
    ctx.arc(X(hole.x), Y(hole.y), (hole.r + 0.07) * ppc, 0, Math.PI * 2);
    ctx.fillStyle = "#d9b86e";
    ctx.fill();
  }

  return { map: toTexture(canvas), glow: toTexture(gCanvas, false) };
}

/* ------------------------------------------------------------------ */
/* Silicon                                                             */
/* ------------------------------------------------------------------ */

function sramBlock(ctx: Ctx, x: number, y: number, w: number, h: number, tint: string, rng: Rng, vertical = false) {
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  const step = 3 + rng() * 2;
  ctx.beginPath();
  if (vertical) {
    for (let i = x; i < x + w; i += step) {
      ctx.moveTo(i, y);
      ctx.lineTo(i, y + h);
    }
  } else {
    for (let i = y; i < y + h; i += step) {
      ctx.moveTo(x, i);
      ctx.lineTo(x + w, i);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function logicBlock(ctx: Ctx, x: number, y: number, w: number, h: number, tint: string, rng: Rng) {
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 26; i++) {
    const bw = w * (0.08 + rng() * 0.35);
    const bh = h * (0.06 + rng() * 0.3);
    ctx.fillStyle = `rgba(${rng() < 0.5 ? "255,255,255" : "0,0,0"},${0.05 + rng() * 0.12})`;
    ctx.fillRect(x + rng() * (w - bw), y + rng() * (h - bh), bw, bh);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

/** A20 Pro die: 2 P-cores, 4 E-cores, 7 GPU cores, dual 16-core Neural Engine, SLC, I/O. */
export function dieShotTexture(size = 1024) {
  const { canvas, ctx } = makeCanvas(size, size);
  const rng = mulberry32(2026);
  const S = size;
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, "#2a2232");
  bg.addColorStop(1, "#16141d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  const r = (x: number, y: number, w: number, h: number) => [x * S, y * S, w * S, h * S] as const;

  // Performance cores + their L2.
  for (let i = 0; i < 2; i++) logicBlock(ctx, ...r(0.05 + i * 0.16, 0.05, 0.15, 0.34), "#8b7a49", rng);
  sramBlock(ctx, ...r(0.05, 0.4, 0.31, 0.15), "#4b4a7a", rng);
  // Efficiency cores.
  for (let i = 0; i < 4; i++) logicBlock(ctx, ...r(0.38 + (i % 2) * 0.075, 0.05 + Math.floor(i / 2) * 0.13, 0.07, 0.12), "#7d6d4a", rng);
  sramBlock(ctx, ...r(0.38, 0.32, 0.145, 0.08), "#4a4777", rng, true);
  // GPU: 4 + 3 cores.
  for (let i = 0; i < 7; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    logicBlock(ctx, ...r(0.56 + col * 0.1, 0.05 + row * 0.25, 0.095, 0.24), "#3f5f78", rng);
  }
  // Dual 16-core Neural Engine.
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < 16; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      logicBlock(ctx, ...r(0.05 + c * 0.215 + col * 0.05, 0.6 + row * 0.08, 0.046, 0.074), "#4d6b4f", rng);
    }
  }
  // System level cache.
  sramBlock(ctx, ...r(0.5, 0.6, 0.46, 0.17), "#55507f", rng);
  // ISP, display engine, media engines.
  const misc = ["#6f4c5c", "#5c5c6c", "#7a5a3c", "#3d6060", "#665d82"];
  for (let i = 0; i < 5; i++) logicBlock(ctx, ...r(0.5 + i * 0.093, 0.79, 0.088, 0.16), misc[i], rng);
  // Memory PHY stripes along the edges.
  sramBlock(ctx, ...r(0.01, 0.05, 0.03, 0.9), "#6c6450", rng);
  sramBlock(ctx, ...r(0.05, 0.965, 0.9, 0.025), "#6c6450", rng, true);

  // Microscope sheen.
  ctx.globalCompositeOperation = "overlay";
  const sheen = ctx.createLinearGradient(0, S, S, 0);
  sheen.addColorStop(0, "rgba(255,80,160,0.35)");
  sheen.addColorStop(0.35, "rgba(80,200,255,0.25)");
  sheen.addColorStop(0.7, "rgba(120,255,140,0.25)");
  sheen.addColorStop(1, "rgba(255,190,90,0.35)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = "source-over";
  grain(ctx, S, S, rng, 26000, 0.06);
  return toTexture(canvas);
}

export function memoryDieTexture() {
  const { canvas, ctx } = makeCanvas(256, 512);
  const rng = mulberry32(77);
  ctx.fillStyle = "#24232c";
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 4; i++) sramBlock(ctx, 12, 12 + i * 124, 232, 112, i % 2 ? "#4e4a6e" : "#45435f", rng);
  grain(ctx, 256, 512, rng, 4000, 0.06);
  return toTexture(canvas);
}

export function chipLidTexture(label: string, sub: string) {
  const S = 1024;
  const { canvas, ctx } = makeCanvas(S, S);
  const rng = mulberry32(9);
  ctx.fillStyle = "#8e9196";
  ctx.fillRect(0, 0, S, S);
  // Brushed finish.
  for (let i = 0; i < 2200; i++) {
    const y = rng() * S;
    ctx.strokeStyle = `rgba(${rng() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + rng() * 0.05})`;
    ctx.lineWidth = 1 + rng();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y + (rng() - 0.5) * 6);
    ctx.stroke();
  }
  const etch = "rgba(40, 42, 46, 0.78)";
  drawLogo(ctx, S * 0.5, S * 0.3, S * 0.2, etch);
  ctx.fillStyle = etch;
  ctx.textAlign = "center";
  ctx.font = `600 ${S * 0.14}px ${DISPLAY_FONT_STACK}`;
  ctx.fillText(label, S * 0.5, S * 0.62);
  ctx.font = `500 ${S * 0.045}px ${MONO_FONT_STACK}`;
  ctx.fillText(sub, S * 0.5, S * 0.74);
  ctx.fillText("2NM · 2618 · TW", S * 0.5, S * 0.8);
  ctx.beginPath();
  ctx.arc(S * 0.1, S * 0.9, S * 0.018, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas);
}

export function packageTexture() {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S, S);
  const rng = mulberry32(31);
  ctx.fillStyle = "#132b22";
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = "#c6a15a";
  for (let i = 0; i < 18; i++) {
    for (let j = 0; j < 18; j++) {
      if (i > 3 && i < 14 && j > 3 && j < 14) continue;
      ctx.fillRect(14 + i * 27.5, 14 + j * 27.5, 12, 12);
    }
  }
  grain(ctx, S, S, rng, 4000, 0.06);
  return toTexture(canvas);
}

/* ------------------------------------------------------------------ */
/* Displays                                                            */
/* ------------------------------------------------------------------ */

interface DunePalette {
  skyTop: string;
  skyBottom: string;
  ridge: string;
  sandLight: string;
  sandShade: string;
  glow: string;
}

const DUSK: DunePalette = {
  skyTop: "#0d1730",
  skyBottom: "#c8835f",
  ridge: "#2b2230",
  sandLight: "#d9a27a",
  sandShade: "#4a2a2c",
  glow: "rgba(255, 170, 120, 0.55)",
};

const DAY: DunePalette = {
  skyTop: "#8fb0cf",
  skyBottom: "#efe2cf",
  ridge: "#6f6559",
  sandLight: "#f1e3cb",
  sandShade: "#a88c6c",
  glow: "rgba(255, 245, 225, 0.6)",
};

function drawDunes(ctx: Ctx, w: number, h: number, pal: DunePalette, seed: number, horizon = 0.45) {
  const rng = mulberry32(seed);
  const sky = ctx.createLinearGradient(0, 0, 0, h * (horizon + 0.05));
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sun = ctx.createRadialGradient(w * 0.62, h * horizon, 0, w * 0.62, h * horizon, w * 0.7);
  sun.addColorStop(0, pal.glow);
  sun.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // Distant ridge.
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += w / 160) {
    const u = x / w;
    const y =
      h * horizon -
      h * (0.035 * Math.sin(u * 6.3 + 0.4) + 0.016 * Math.sin(u * 19.1 + 1.3) + 0.008 * Math.sin(u * 47 + 2) + 0.02);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  const ridge = ctx.createLinearGradient(0, h * (horizon - 0.08), 0, h * (horizon + 0.05));
  ridge.addColorStop(0, pal.ridge);
  ridge.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = ridge;
  ctx.fill();

  // Dune layers, front-most last.
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const y0 = h * (horizon + 0.02 + t * 0.32);
    const amp = h * (0.04 + t * 0.05);
    const phase = rng() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 120) {
      const u = x / w;
      const y = y0 - amp * Math.sin(u * Math.PI * (1.2 + t * 0.8) + phase) * Math.sin(u * 2.1 + phase * 0.5);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, y0 - amp, w * 0.3, y0 + h * 0.25);
    grad.addColorStop(0, pal.sandLight);
    grad.addColorStop(0.55, pal.sandShade);
    grad.addColorStop(1, pal.sandLight);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Wind ripples.
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = Math.max(1, w / 900);
    for (let k = 0; k < 18; k++) {
      ctx.beginPath();
      const yy = y0 + k * (h * 0.012);
      for (let x = 0; x <= w; x += w / 60) {
        const u = x / w;
        const y = yy - amp * 0.8 * Math.sin(u * Math.PI * (1.2 + t * 0.8) + phase) * Math.sin(u * 2.1 + phase * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function lockScreenClock(ctx: Ctx, w: number, cx: number, y: number, scale: number) {
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${w * 0.05 * scale}px ${DISPLAY_FONT_STACK}`;
  ctx.fillText("Monday, October 12", cx, y);
  ctx.font = `700 ${w * 0.26 * scale}px ${DISPLAY_FONT_STACK}`;
  ctx.fillText("9:41", cx, y + w * 0.24 * scale);
}

export function proMaxScreenTexture() {
  const w = 1024;
  const h = 2144;
  const { canvas, ctx } = makeCanvas(w, h);
  drawDunes(ctx, w, h, DUSK, 18, 0.5);
  lockScreenClock(ctx, w, w / 2, h * 0.14, 1);
  // Dynamic Island.
  ctx.fillStyle = "#000";
  roundRect(ctx, w / 2 - w * 0.13, h * 0.022, w * 0.26, w * 0.075, w * 0.0375);
  ctx.fill();
  // Home indicator.
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  roundRect(ctx, w / 2 - w * 0.17, h - h * 0.018, w * 0.34, w * 0.012, w * 0.006);
  ctx.fill();
  return toTexture(canvas);
}

export function duoInnerScreenTexture() {
  const w = 2048;
  const h = 1466;
  const { canvas, ctx } = makeCanvas(w, h);
  drawDunes(ctx, w, h, DAY, 7, 0.46);
  // Status bar.
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "right";
  ctx.font = `600 ${h * 0.032}px ${DISPLAY_FONT_STACK}`;
  ctx.fillText("9:41", w * 0.965, h * 0.06);
  // Widget column and glass tiles.
  const tile = (x: number, y: number, tw: number, th: number) => {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRect(ctx, x, y, tw, th, h * 0.045);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  tile(w * 0.08, h * 0.12, w * 0.2, h * 0.68);
  tile(w * 0.55, h * 0.12, w * 0.15, h * 0.2);
  tile(w * 0.72, h * 0.12, w * 0.15, h * 0.2);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = `hsla(${(r * 4 + c) * 31 + 190}, 70%, ${62 + ((r + c) % 2) * 8}%, 0.92)`;
      roundRect(ctx, w * (0.55 + c * 0.082), h * (0.38 + r * 0.15), w * 0.06, w * 0.06, w * 0.014);
      ctx.fill();
    }
  }
  // Dock column.
  tile(w * 0.92, h * 0.3, w * 0.055, h * 0.36);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = `700 ${h * 0.05}px ${DISPLAY_FONT_STACK}`;
  ctx.fillText("54°", w * 0.565, h * 0.22);
  ctx.font = `600 ${h * 0.022}px ${DISPLAY_FONT_STACK}`;
  ctx.fillText("Cupertino", w * 0.565, h * 0.16);
  ctx.font = `700 ${h * 0.032}px ${DISPLAY_FONT_STACK}`;
  ctx.fillText("On This Day", w * 0.095, h * 0.74);
  // Crease: a hairline of shadow and light down the middle.
  const crease = ctx.createLinearGradient(w / 2 - 14, 0, w / 2 + 14, 0);
  crease.addColorStop(0, "rgba(0,0,0,0)");
  crease.addColorStop(0.45, "rgba(0,0,0,0.12)");
  crease.addColorStop(0.55, "rgba(255,255,255,0.10)");
  crease.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = crease;
  ctx.fillRect(w / 2 - 14, 0, 28, h);
  return toTexture(canvas);
}

export function duoOuterScreenTexture() {
  const w = 1024;
  const h = 1466;
  const { canvas, ctx } = makeCanvas(w, h);
  drawDunes(ctx, w, h, DUSK, 3, 0.52);
  lockScreenClock(ctx, w, w / 2, h * 0.16, 0.9);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.03, w * 0.026, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas);
}

/* ------------------------------------------------------------------ */
/* Housing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ceramic Shield back maps: frosted glass with a mirror-polished logo.
 * `roughness` (G channel) is matte everywhere but the glyph; `metalness`
 * (B channel) is zero except the glyph, so the logo reflects like chrome.
 */
export function backGlassMaps(wCm: number, hCm: number, logoY: number, logoSize: number) {
  const ppc = 96;
  const W = wCm * ppc;
  const H = hCm * ppc;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = mulberry32(5);
  ctx.fillStyle = "rgb(140,140,140)";
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, rng, 9000, 0.12, false);
  drawLogo(ctx, W / 2, H * (1 - logoY), logoSize * ppc, "rgb(14,14,14)");
  const { canvas: mc, ctx: m } = makeCanvas(W, H);
  m.fillStyle = "#000";
  m.fillRect(0, 0, W, H);
  drawLogo(m, W / 2, H * (1 - logoY), logoSize * ppc, "#fff");
  return { roughness: toTexture(canvas, false), metalness: toTexture(mc, false) };
}

export function batteryLabelTexture(title: string) {
  const W = 1024;
  const H = 1536;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = mulberry32(11);
  ctx.fillStyle = "#121316";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 3;
  roundRect(ctx, 40, 40, W - 80, H - 80, 36);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.textAlign = "left";
  ctx.font = `600 56px ${DISPLAY_FONT_STACK}`;
  ctx.fillText("Li-ion Battery", 100, 180);
  ctx.font = `500 30px ${DISPLAY_FONT_STACK}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(title, 100, 230);
  ctx.font = `400 22px ${MONO_FONT_STACK}`;
  const lines = [
    "Rechargeable lithium-ion cell",
    "Electrically debonding adhesive",
    "Do not puncture, crush or expose to heat",
    "Assembled in final configuration",
  ];
  lines.forEach((l, i) => ctx.fillText(l, 100, 300 + i * 38));
  // Icon row.
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    roundRect(ctx, 100 + i * 120, 500, 90, 90, 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(145 + i * 120, 545, 22 - (i % 2) * 6, 0, Math.PI * (1.2 + i * 0.2));
    ctx.stroke();
  }
  // Barcode + matrix.
  let x = 100;
  while (x < 700) {
    const bw = 2 + Math.floor(rng() * 6);
    if (rng() > 0.35) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(x, H - 330, bw, 120);
    }
    x += bw + 2;
  }
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      if (rng() > 0.5 || i === 0 || j === 15) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(760 + i * 10, H - 330 + j * 10, 10, 10);
      }
    }
  }
  drawLogo(ctx, W - 160, 170, 90, "rgba(255,255,255,0.85)");
  return toTexture(canvas);
}

export function vaporChamberTextures(hotU: number, hotV: number) {
  const W = 1024;
  const H = 1536;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = mulberry32(21);
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, "#a5612f");
  base.addColorStop(0.5, "#7d4220");
  base.addColorStop(1, "#b0703f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // Brushing.
  for (let i = 0; i < 1500; i++) {
    const y = rng() * H;
    ctx.strokeStyle = `rgba(${rng() < 0.5 ? "255,220,190" : "60,25,10"},${0.04 + rng() * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + (rng() - 0.5) * 8);
    ctx.stroke();
  }
  // Wick lattice.
  ctx.strokeStyle = "rgba(70, 30, 12, 0.28)";
  ctx.lineWidth = 3;
  const step = 46;
  for (let k = -H; k < W + H; k += step) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + H * 0.6, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(k, H);
    ctx.lineTo(k + H * 0.6, 0);
    ctx.stroke();
  }
  // Laser-weld seam.
  ctx.fillStyle = "rgba(255, 210, 160, 0.55)";
  for (let t = 0; t < 1; t += 0.004) {
    const px = 30 + (W - 60) * t;
    ctx.fillRect(px, 26, 5, 5);
    ctx.fillRect(px, H - 31, 5, 5);
  }
  for (let t = 0; t < 1; t += 0.003) {
    const py = 30 + (H - 60) * t;
    ctx.fillRect(26, py, 5, 5);
    ctx.fillRect(W - 31, py, 5, 5);
  }

  // Heat mask (emissive): hottest over the chip, bleeding outward.
  const { canvas: hc, ctx: h } = makeCanvas(256, 384);
  h.fillStyle = "#000";
  h.fillRect(0, 0, 256, 384);
  const hx = hotU * 256;
  const hy = (1 - hotV) * 384;
  const heat = h.createRadialGradient(hx, hy, 0, hx, hy, 300);
  heat.addColorStop(0, "rgba(255,255,255,1)");
  heat.addColorStop(0.25, "rgba(255,255,255,0.55)");
  heat.addColorStop(0.6, "rgba(255,255,255,0.15)");
  heat.addColorStop(1, "rgba(255,255,255,0)");
  h.fillStyle = heat;
  h.fillRect(0, 0, 256, 384);
  return { map: toTexture(canvas), heat: toTexture(hc, false) };
}

/* ------------------------------------------------------------------ */
/* Optics                                                              */
/* ------------------------------------------------------------------ */

export function lensCoverTexture() {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S, S);
  const c = S / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "#020307");
  g.addColorStop(0.55, "#070a12");
  g.addColorStop(0.8, "#121826");
  g.addColorStop(0.93, "#1d2333");
  g.addColorStop(1, "#05060a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const rings = [0.18, 0.3, 0.42, 0.62, 0.78];
  rings.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(c, c, r * c, 0, Math.PI * 2);
    ctx.strokeStyle = i % 2 ? "rgba(140, 90, 255, 0.28)" : "rgba(80, 255, 200, 0.18)";
    ctx.lineWidth = 3 + i;
    ctx.stroke();
  });
  // Coating reflection.
  const refl = ctx.createRadialGradient(c * 0.7, c * 0.62, 0, c * 0.7, c * 0.62, c * 0.35);
  refl.addColorStop(0, "rgba(170, 120, 255, 0.55)");
  refl.addColorStop(1, "rgba(170, 120, 255, 0)");
  ctx.fillStyle = refl;
  ctx.fillRect(0, 0, S, S);
  const refl2 = ctx.createRadialGradient(c * 1.3, c * 1.35, 0, c * 1.3, c * 1.35, c * 0.25);
  refl2.addColorStop(0, "rgba(90, 255, 190, 0.35)");
  refl2.addColorStop(1, "rgba(90, 255, 190, 0)");
  ctx.fillStyle = refl2;
  ctx.fillRect(0, 0, S, S);
  return toTexture(canvas);
}

export function sensorTexture() {
  const W = 768;
  const H = 576;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(0, 0, W, H);
  // Bond pads.
  ctx.fillStyle = "#d4b06a";
  for (let x = 30; x < W - 30; x += 18) {
    ctx.fillRect(x, 10, 8, 14);
    ctx.fillRect(x, H - 24, 8, 14);
  }
  // Active area: Bayer micro-lens array.
  const ax = 60;
  const ay = 50;
  const aw = W - 120;
  const ah = H - 100;
  const cell = 6;
  for (let y = 0; y < ah; y += cell) {
    for (let x = 0; x < aw; x += cell) {
      const ix = (x / cell) % 2;
      const iy = (y / cell) % 2;
      ctx.fillStyle = ix === iy ? "#2f7a3c" : ix ? "#8a2f36" : "#2c3f8f";
      ctx.fillRect(ax + x, ay + y, cell - 1, cell - 1);
    }
  }
  ctx.globalCompositeOperation = "overlay";
  const rainbow = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
  ["#ff3d6e", "#ffb13d", "#c8ff3d", "#3dffd2", "#3d7bff", "#c43dff"].forEach((c, i, a) =>
    rainbow.addColorStop(i / (a.length - 1), c),
  );
  ctx.fillStyle = rainbow;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(ax, ay, aw, ah);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return toTexture(canvas);
}

/** Soft round sprite for heat particles. */
export function particleTexture() {
  const S = 64;
  const { canvas, ctx } = makeCanvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(canvas);
}
