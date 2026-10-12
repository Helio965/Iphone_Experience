"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { BentoCard, CardEyebrow, CardTitle } from "./BentoCard";

type Block = { x: number; y: number; w: number; h: number };

interface Region {
  id: string;
  name: string;
  detail: string;
  hue: string;
  blocks: Block[];
}

const grid = (x0: number, y0: number, cols: number, rows: number, w: number, h: number, gap: number, count = cols * rows) =>
  Array.from({ length: count }, (_, i) => ({
    x: x0 + (i % cols) * (w + gap),
    y: y0 + Math.floor(i / cols) * (h + gap),
    w,
    h,
  }));

const REGIONS: Region[] = [
  {
    id: "cpu",
    name: "6-core CPU",
    detail: "2 performance and 4 efficiency cores, up to 20% faster than A19 Pro.",
    hue: "#f2c86b",
    blocks: [
      { x: 16, y: 16, w: 70, h: 120 },
      { x: 92, y: 16, w: 70, h: 120 },
      ...grid(170, 16, 2, 2, 38, 56, 4),
      { x: 16, y: 142, w: 146, h: 40 },
    ],
  },
  {
    id: "gpu",
    name: "7-core GPU",
    detail: "Neural Accelerators in every core and hardware ray tracing. Up to 40% faster graphics.",
    hue: "#6cc7ff",
    blocks: grid(260, 16, 4, 2, 35.5, 78, 4, 7),
  },
  {
    id: "neural",
    name: "Dual 16-core Neural Engine",
    detail: "Two 16-core clusters for on-device intelligence, from Photographic Styles to Siri.",
    hue: "#7ee0a3",
    blocks: [...grid(16, 196, 4, 4, 19, 19, 3), ...grid(106, 196, 4, 4, 19, 19, 3)],
  },
  {
    id: "cache",
    name: "System cache + memory",
    detail: "Memory sits beside the die, M-series style: up to 50% more bandwidth and a shorter path for heat.",
    hue: "#b49cff",
    blocks: [
      { x: 200, y: 196, w: 166, h: 50 },
      { x: 376, y: 100, w: 34, h: 146 },
    ],
  },
  {
    id: "media",
    name: "ISP + media engines",
    detail: "Feeds three 48MP Fusion cameras and records ProRes RAW and Apple Log 2.",
    hue: "#ff8f70",
    blocks: [
      { x: 200, y: 252, w: 66, h: 32 },
      { x: 270, y: 252, w: 66, h: 32 },
      { x: 340, y: 252, w: 70, h: 32 },
    ],
  },
];

const STATS = [
  { value: "20%", label: "faster CPU" },
  { value: "40%", label: "faster GPU" },
  { value: "50%", label: "more memory bandwidth" },
];

export function ChipCard({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (pinned || reduced) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % REGIONS.length), 2600);
    return () => window.clearInterval(id);
  }, [pinned, reduced]);

  const region = REGIONS[active];

  return (
    <BentoCard className={className} bodyClassName="flex h-full flex-col p-7 md:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl transition-colors duration-1000"
        style={{ background: `radial-gradient(closest-side, ${region.hue}55, transparent)` }}
      />
      <CardEyebrow>A20 Pro · 2 nm</CardEyebrow>
      <CardTitle>Built like a Mac chip.</CardTitle>
      <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-mute md:text-[17px]">
        Six CPU cores, seven GPU cores and a dual 16-core Neural Engine, packaged like a Mac chip.
        <span className="text-ink/60"> Hover the die to explore it.</span>
      </p>

      <div className="mt-8 grid flex-1 items-center gap-8 md:grid-cols-[1.25fr_1fr]">
        <svg
          viewBox="0 0 426 300"
          className="w-full overflow-visible"
          role="img"
          aria-label={`A20 Pro die map, ${region.name} highlighted`}
          onMouseLeave={() => setPinned(false)}
        >
          <defs>
            <linearGradient id="die-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1d1a24" />
              <stop offset="1" stopColor="#0f0e14" />
            </linearGradient>
            <pattern id="die-lines" width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M0 4h4" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="4" y="4" width="418" height="292" rx="10" fill="url(#die-bg)" stroke="rgba(255,255,255,0.12)" />
          {REGIONS.map((r, i) => {
            const on = i === active;
            return (
              <g
                key={r.id}
                onMouseEnter={() => {
                  setActive(i);
                  setPinned(true);
                }}
                className="cursor-pointer"
                style={{ filter: on ? `drop-shadow(0 0 10px ${r.hue}88)` : "none", transition: "filter 600ms" }}
              >
                {r.blocks.map((b, k) => (
                  <g key={k}>
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      rx={3}
                      fill={r.hue}
                      fillOpacity={on ? 0.42 : 0.1}
                      stroke={on ? r.hue : "rgba(255,255,255,0.14)"}
                      strokeWidth={on ? 1.4 : 1}
                      style={{ transition: "fill-opacity 600ms, stroke 600ms" }}
                    />
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill="url(#die-lines)" />
                  </g>
                ))}
              </g>
            );
          })}
        </svg>

        <div>
          <ul className="space-y-1" aria-label="Die regions">
            {REGIONS.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setPinned(true);
                  }}
                  onFocus={() => {
                    setActive(i);
                    setPinned(true);
                  }}
                  aria-pressed={i === active}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] transition-colors ${
                    i === active ? "bg-white/[0.07] text-white" : "text-mute hover:text-ink"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: r.hue, opacity: i === active ? 1 : 0.4 }} />
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
          <p key={region.id} aria-live="polite" className="mt-4 min-h-[66px] animate-fade-in px-3 text-[14px] leading-relaxed text-ink/75">
            {region.detail}
          </p>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="mt-1 text-[12px] text-mute md:text-[13px]">
              {s.label} <span className="text-dim">vs A19 Pro</span>
            </dt>
            <dd className="headline text-[28px] md:text-[40px]">
              <span className="text-[0.6em] align-top text-mute">up to </span>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </BentoCard>
  );
}
