"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { CHAPTERS, PRODUCTS } from "@/data/products";
import { smoothstep } from "@/lib/three/math";
import { CHAPTER_WINDOWS } from "./ChapterOverlays";

export interface HudController {
  update(progress: number): void;
}

const FRAMES = 240;

/** Where each chapter settles: the middle of its readable hold. */
export const chapterStops = CHAPTERS.map((ch) => {
  const [, b, c, d] = CHAPTER_WINDOWS[ch.key];
  return d === null ? Math.min(b + 0.06, 1) : (b + c) / 2;
});

/**
 * The "study in separation" instrument layer: object id, frame counter and a
 * chapter rail you can click to jump between stages.
 */
export function Hud({ ref, onJump }: { ref?: Ref<HudController>; onJump: (progress: number) => void }) {
  const { model } = useExperience();
  const top = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const ticks = useRef<(HTMLButtonElement | null)[]>([]);
  const lastActive = useRef(-1);

  useImperativeHandle(
    ref,
    () => ({
      update(p: number) {
        const f = Math.min(FRAMES, Math.round(p * FRAMES));
        if (frame.current) frame.current.textContent = String(f).padStart(3, "0");
        if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
        if (cue.current) cue.current.style.opacity = (1 - smoothstep(0.004, 0.03, p)).toFixed(3);
        if (top.current) top.current.style.opacity = (0.45 + 0.55 * smoothstep(0.03, 0.08, p)).toFixed(3);
        let active = -1;
        CHAPTERS.forEach((ch, i) => {
          if (p >= CHAPTER_WINDOWS[ch.key][0] - 0.005) active = i;
        });
        if (active !== lastActive.current) {
          lastActive.current = active;
          ticks.current.forEach((t, i) => {
            if (!t) return;
            t.dataset.active = String(i === active);
            t.dataset.done = String(i < active);
          });
        }
      },
    }),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      <div
        ref={top}
        className="absolute inset-x-0 top-[calc(var(--nav-h)+16px)] mx-auto hidden max-w-[1240px] items-start justify-between px-6 opacity-45 md:flex md:px-12"
      >
        <p className="eyebrow text-mute">
          <span className="text-white/85">Object / {model === "proMax" ? "18PM" : "DUO"}</span>
          <span className="mx-2 text-white/25">—</span>
          {PRODUCTS[model].name}
        </p>
        <p className="eyebrow text-mute">A study in separation</p>
      </div>

      <nav
        aria-label="Chapters"
        className="pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-3 md:right-8"
      >
        {CHAPTERS.map((ch, i) => (
          <button
            key={ch.key}
            ref={(el) => {
              ticks.current[i] = el;
            }}
            type="button"
            data-active="false"
            data-done="false"
            onClick={() => onJump(chapterStops[i])}
            className="group flex items-center justify-end gap-3 py-0.5"
            aria-label={`Go to chapter ${ch.index}: ${ch.title}`}
          >
            <span className="eyebrow hidden translate-x-1 text-[10px] text-white/0 transition-all duration-500 group-hover:translate-x-0 group-hover:text-white/75 group-focus-visible:text-white/75 lg:inline">
              {ch.index} {ch.label}
            </span>
            <span className="h-px w-4 bg-white/25 transition-all duration-500 group-hover:w-6 group-hover:bg-white/60 group-data-[active=true]:w-8 group-data-[active=true]:bg-white group-data-[done=true]:bg-white/50" />
          </button>
        ))}
      </nav>

      <div className="absolute inset-x-0 bottom-5 mx-auto hidden max-w-[1240px] items-end justify-between px-6 md:flex md:px-12">
        <div className="w-44">
          <p className="eyebrow text-mute">
            Frame <span ref={frame} className="tabular-nums text-white/85">000</span> / {FRAMES}
          </p>
          <span className="mt-2 block h-px w-full bg-white/10">
            <span ref={bar} className="block h-px origin-left bg-white/70" style={{ transform: "scaleX(0)" }} />
          </span>
        </div>
        <p className="eyebrow text-dim">Index · 01—06</p>
      </div>

      <div ref={cue} className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 md:bottom-8">
        <span className="eyebrow text-[10px] text-mute">Scroll to separate</span>
        <span className="relative block h-10 w-px overflow-hidden bg-white/10">
          <span className="absolute inset-0 animate-scroll-cue bg-white/80" />
        </span>
      </div>
    </div>
  );
}
