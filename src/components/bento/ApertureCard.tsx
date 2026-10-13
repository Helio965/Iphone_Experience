"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { gsap } from "@/lib/gsap";
import { BentoCard, CardEyebrow, CardTitle } from "./BentoCard";

const STOPS = [1.48, 1.8, 2.8, 4.0] as const;
const DEPTH = ["Shallowest", "Shallow", "Deep", "Deepest"];
const fmt = (f: number) => (f < 1.6 ? f.toFixed(2) : f.toFixed(1));

/** Six-blade iris: each blade's inner edge is one side of a hexagon whose inradius tracks 1/f. */
function irisPaths(f: number, c = 100, R = 92) {
  const a = R * (STOPS[0] / f) * 0.66;
  const swirl = 0.55 + (1 - a / R) * 0.5;
  const verts: [number, number][] = [];
  const outer: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const vr = a / Math.cos(Math.PI / 6);
    verts.push([c + Math.cos(ang) * vr, c + Math.sin(ang) * vr]);
    outer.push([c + Math.cos(ang + swirl) * R * 1.12, c + Math.sin(ang + swirl) * R * 1.12]);
  }
  return verts.map((v, k) => {
    const n = (k + 1) % 6;
    const [vx, vy] = v;
    const [nx, ny] = verts[n];
    const [ox, oy] = outer[k];
    const [onx, ony] = outer[n];
    const bend = (x0: number, y0: number, x1: number, y1: number) =>
      `${(x0 + x1) / 2 + (y1 - y0) * 0.12} ${(y0 + y1) / 2 - (x1 - x0) * 0.12}`;
    return `M${vx} ${vy} L${nx} ${ny} Q${bend(nx, ny, onx, ony)} ${onx} ${ony} L${ox} ${oy} Q${bend(vx, vy, ox, oy)} ${vx} ${vy}Z`;
  });
}

const BOKEH = [
  { x: 14, y: 22, s: 34, c: "#ffb35c" },
  { x: 72, y: 16, s: 26, c: "#ff6a8a" },
  { x: 86, y: 58, s: 38, c: "#6cc7ff" },
  { x: 28, y: 70, s: 30, c: "#ffd27a" },
  { x: 56, y: 82, s: 22, c: "#a98bff" },
  { x: 8, y: 52, s: 18, c: "#7ee0a3" },
  { x: 92, y: 26, s: 16, c: "#ffffff" },
];

export function ApertureCard({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [f, setF] = useState<number>(STOPS[0]);
  const state = useRef({ f: STOPS[0] as number });
  const tween = useRef<gsap.core.Tween | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => () => void tween.current?.kill(), []);

  const go = (i: number) => {
    setIndex(i);
    tween.current?.kill();
    if (reduced) {
      state.current.f = STOPS[i];
      setF(STOPS[i]);
      return;
    }
    tween.current = gsap.to(state.current, {
      f: STOPS[i],
      duration: 0.75,
      ease: "power3.inOut",
      onUpdate: () => setF(state.current.f),
    });
  };

  const blur = Math.max(0, (4 / f - 1) * 3.6);
  const light = Math.round((STOPS[0] / f) ** 2 * 100);

  return (
    <BentoCard className={className} bodyClassName="flex h-full flex-col p-7 md:p-9">
      <CardEyebrow>Variable aperture · 18 Pro Max</CardEyebrow>
      <CardTitle>
        ƒ/1.48 to ƒ/4.0.
        <br />
        Six blades.
      </CardTitle>

      <div className="relative mx-auto mt-7 aspect-square w-full max-w-[260px]">
        <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={`Six-blade iris at ƒ/${fmt(f)}`}>
          <defs>
            <clipPath id="iris-clip">
              <circle cx="100" cy="100" r="92" />
            </clipPath>
            <radialGradient id="iris-glass" cx="0.4" cy="0.35" r="0.8">
              <stop offset="0" stopColor="#3b4a7a" />
              <stop offset="0.5" stopColor="#0b0e18" />
              <stop offset="1" stopColor="#020205" />
            </radialGradient>
            <linearGradient id="blade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4a4b52" />
              <stop offset="1" stopColor="#1e1f24" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#iris-glass)" />
          <circle cx="78" cy="74" r="16" fill="#a98bff" opacity="0.18" />
          <g clipPath="url(#iris-clip)">
            {irisPaths(f).map((d, k) => (
              <path key={k} d={d} fill="url(#blade)" stroke="rgba(0,0,0,0.65)" strokeWidth="1.2" />
            ))}
          </g>
          <circle cx="100" cy="100" r="92" fill="none" stroke="#5a5b62" strokeWidth="6" />
          <circle cx="100" cy="100" r="97" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        </svg>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[13px] tabular-nums text-white/90">
          ƒ/{fmt(f)}
        </span>
      </div>

      <div className="mt-7">
        <input
          type="range"
          min={0}
          max={STOPS.length - 1}
          step={1}
          value={index}
          onChange={(e) => go(Number(e.target.value))}
          className="aperture-range"
          aria-label="Aperture"
          aria-valuetext={`ƒ/${fmt(STOPS[index])}`}
        />
        <div className="mt-3 flex justify-between font-mono text-[11px] text-mute">
          {STOPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => go(i)}
              className={`transition-colors ${i === index ? "text-white" : "hover:text-ink"}`}
            >
              ƒ/{fmt(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6 h-32 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07080b]">
        <div className="absolute inset-0" style={{ filter: `blur(${blur.toFixed(2)}px)` }}>
          {BOKEH.map((b, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: b.s * (0.55 + 0.45 * (STOPS[0] / f)),
                height: b.s * (0.55 + 0.45 * (STOPS[0] / f)),
                background: b.c,
                opacity: 0.25 + 0.5 * (STOPS[0] / f),
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>
        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2">
          {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map(
            (c) => (
              <span key={c} className={`absolute h-3 w-3 border-[#ffd60a] ${c}`} />
            ),
          )}
          <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.6)]" />
        </div>
        <div className="absolute inset-x-3 bottom-2 flex justify-between font-mono text-[10px] text-white/70">
          <span>Depth · {DEPTH[index]}</span>
          <span>Light · {light}%</span>
        </div>
      </div>
      <p className="mt-4 text-[12px] text-dim">iPhone Duo uses a fixed ƒ/1.6 Fusion Main camera.</p>
    </BentoCard>
  );
}
