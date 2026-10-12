import * as THREE from "three";

export function roundedRectPath<T extends THREE.Path>(
  target: T,
  w: number,
  h: number,
  r: number,
  cx = 0,
  cy = 0,
): T {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  target.moveTo(x + rr, y);
  target.lineTo(x + w - rr, y);
  target.quadraticCurveTo(x + w, y, x + w, y + rr);
  target.lineTo(x + w, y + h - rr);
  target.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  target.lineTo(x + rr, y + h);
  target.quadraticCurveTo(x, y + h, x, y + h - rr);
  target.lineTo(x, y + rr);
  target.quadraticCurveTo(x, y, x + rr, y);
  return target;
}

/**
 * Squircle-ish rounded rectangle. Apple corners are continuous curves rather
 * than circular arcs; a superellipse corner reads much closer to the real part.
 */
export function squirclePath<T extends THREE.Path>(target: T, w: number, h: number, r: number, cx = 0, cy = 0, segments = 12): T {
  const rr = Math.min(r, w / 2, h / 2);
  const corners: [number, number, number][] = [
    [cx + w / 2 - rr, cy + h / 2 - rr, 0],
    [cx - w / 2 + rr, cy + h / 2 - rr, Math.PI / 2],
    [cx - w / 2 + rr, cy - h / 2 + rr, Math.PI],
    [cx + w / 2 - rr, cy - h / 2 + rr, (3 * Math.PI) / 2],
  ];
  const n = 4.2;
  corners.forEach(([ox, oy, start], ci) => {
    for (let i = 0; i <= segments; i++) {
      const a = start + (i / segments) * (Math.PI / 2);
      const c = Math.cos(a);
      const s = Math.sin(a);
      const x = ox + rr * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = oy + rr * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (ci === 0 && i === 0) target.moveTo(x, y);
      else target.lineTo(x, y);
    }
  });
  target.closePath();
  return target;
}

/** Rounded rectangle with an independent radius per corner: [topLeft, topRight, bottomRight, bottomLeft]. */
export function rectShape4(w: number, h: number, radii: [number, number, number, number], cx = 0, cy = 0) {
  const [tl, tr, br, bl] = radii.map((r) => Math.min(r, w / 2, h / 2));
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + bl, y0);
  s.lineTo(x1 - br, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + br);
  s.lineTo(x1, y1 - tr);
  s.quadraticCurveTo(x1, y1, x1 - tr, y1);
  s.lineTo(x0 + tl, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - tl);
  s.lineTo(x0, y0 + bl);
  s.quadraticCurveTo(x0, y0, x0 + bl, y0);
  return s;
}

export const squircleShape = (w: number, h: number, r: number, cx = 0, cy = 0) =>
  squirclePath(new THREE.Shape(), w, h, r, cx, cy);

export const squircleHole = (w: number, h: number, r: number, cx = 0, cy = 0) =>
  squirclePath(new THREE.Path(), w, h, r, cx, cy);

export const circleHole = (r: number, cx = 0, cy = 0) => {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
};

export interface ExtrudeOpts {
  depth: number;
  bevel?: number;
  bevelSegments?: number;
  curveSegments?: number;
}

/**
 * Extrudes along +Z and recentres so the solid spans [-depth/2, depth/2].
 * Groups: 0 = caps (front/back faces), 1 = side walls.
 */
export function extrude(shape: THREE.Shape | THREE.Shape[], o: ExtrudeOpts) {
  const bevel = o.bevel ?? 0;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(o.depth - bevel * 2, 0.0001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: o.bevelSegments ?? 4,
    curveSegments: o.curveSegments ?? 10,
  });
  geo.translate(0, 0, -(o.depth - bevel * 2) / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Re-derive planar UVs from XY so cap textures map exactly onto `bounds`. */
export function planarUVs(geo: THREE.BufferGeometry, bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - bounds.minX) / w;
    uv[i * 2 + 1] = (pos.getY(i) - bounds.minY) / h;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

export const boundsOf = (w: number, h: number, cx = 0, cy = 0) => ({
  minX: cx - w / 2,
  maxX: cx + w / 2,
  minY: cy - h / 2,
  maxY: cy + h / 2,
});

/** Flat rounded plane facing +Z with UVs spanning its bounds. */
export function roundedPlane(w: number, h: number, r: number) {
  const geo = new THREE.ShapeGeometry(squircleShape(w, h, r), 12);
  return planarUVs(geo, boundsOf(w, h));
}

/**
 * Lathe profile for a single lens element. `front`/`back` are surface sag at
 * the rim (positive = convex outward), giving bi-convex, meniscus or "gull
 * wing" aspheres depending on the signs.
 */
export function lensGeometry(radius: number, thickness: number, front: number, back: number, wing = 0) {
  const pts: THREE.Vector2[] = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = Math.max(t * radius, 0.0001);
    const sag = front * (1 - t * t) + wing * Math.sin(t * Math.PI) * 0.6;
    pts.push(new THREE.Vector2(r, thickness / 2 + sag));
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const r = Math.max(t * radius, 0.0001);
    const sag = back * (1 - t * t) - wing * Math.sin(t * Math.PI) * 0.4;
    pts.push(new THREE.Vector2(r, -thickness / 2 - sag));
  }
  const geo = new THREE.LatheGeometry(pts, 64);
  geo.computeVertexNormals();
  return geo;
}

/** Hollow tube (barrel, ring) via lathe. */
export function tubeGeometry(inner: number, outer: number, height: number, chamfer = 0.02, segments = 64) {
  const h = height / 2;
  const c = Math.min(chamfer, (outer - inner) / 3, h / 2);
  const pts = [
    new THREE.Vector2(inner, -h),
    new THREE.Vector2(outer - c, -h),
    new THREE.Vector2(outer, -h + c),
    new THREE.Vector2(outer, h - c),
    new THREE.Vector2(outer - c, h),
    new THREE.Vector2(inner, h),
    new THREE.Vector2(inner, -h),
  ];
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}
