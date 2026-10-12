"use client";

import { useImperativeHandle, useRef, type Ref, type RefObject } from "react";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { CHAPTERS, type ChapterKey } from "@/data/products";
import { gsap, useGSAP } from "@/lib/gsap";

export interface OverlayController {
  update(progress: number): void;
}

/** [fade-in start, fade-in end, fade-out start, fade-out end] in stage progress. */
export const CHAPTER_WINDOWS: Record<ChapterKey, [number, number, number, number | null]> = {
  inside: [0.072, 0.1, 0.185, 0.205],
  surface: [0.21, 0.24, 0.37, 0.39],
  routes: [0.395, 0.425, 0.535, 0.555],
  air: [0.56, 0.59, 0.69, 0.71],
  eye: [0.718, 0.745, 0.845, 0.865],
  chip: [0.872, 0.9, 1, null],
};

const TOP_PLACED: ChapterKey[] = ["surface"];

interface Props {
  ref?: Ref<OverlayController>;
  heroRef: RefObject<HTMLDivElement | null>;
}

/**
 * Chapter typography. A paused GSAP timeline laid out on a 0–1 axis is seeked
 * with the same smoothed progress that drives the 3D scene, so words land in
 * sync with the parts they describe.
 */
export function ChapterOverlays({ ref, heroRef }: Props) {
  const { model } = useExperience();
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const progress = useRef(0);

  useGSAP(
    () => {
      const scope = root.current;
      if (!scope) return;
      const t = gsap.timeline({ paused: true });
      if (heroRef.current) {
        t.to(heroRef.current, { autoAlpha: 0, y: -56, duration: 0.036, ease: "power2.in" }, 0.026);
      }
      for (const ch of CHAPTERS) {
        const el = scope.querySelector<HTMLElement>(`[data-chapter="${ch.key}"]`);
        if (!el) continue;
        const [a, b, c, d] = CHAPTER_WINDOWS[ch.key];
        const span = b - a;
        t.set(el, { autoAlpha: 1 }, a);
        t.fromTo(el.querySelector("[data-label]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: span, ease: "power2.out" }, a);
        t.fromTo(
          el.querySelectorAll("[data-word]"),
          { yPercent: 118 },
          { yPercent: 0, duration: span, stagger: span * 0.14, ease: "power3.out" },
          a,
        );
        t.fromTo(
          el.querySelector("[data-body]"),
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: span, ease: "power2.out" },
          a + span * 0.45,
        );
        if (d !== null) t.to(el, { autoAlpha: 0, y: -32, duration: d - c, ease: "power2.in" }, c);
      }
      t.set({}, {}, 1);
      t.progress(progress.current);
      tl.current = t;
    },
    { scope: root },
  );

  useImperativeHandle(
    ref,
    () => ({
      update(p: number) {
        progress.current = p;
        tl.current?.progress(p);
      },
    }),
    [],
  );

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 z-20">
      {CHAPTERS.map((ch) => {
        const top = TOP_PLACED.includes(ch.key);
        return (
          <section
            key={ch.key}
            data-chapter={ch.key}
            aria-label={ch.title}
            className={`invisible absolute inset-x-0 bottom-0 opacity-0 md:bottom-auto ${
              top ? "md:top-[calc(var(--nav-h)+64px)]" : "md:top-1/2 md:-translate-y-1/2"
            }`}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[150%] bg-gradient-to-t from-black via-black/75 to-transparent md:hidden"
            />
            <div className="relative mx-auto max-w-[1240px] px-6 pb-12 md:px-12 md:pb-0">
              <div className={top ? "max-w-[480px] md:flex md:max-w-none md:items-end md:gap-14" : "max-w-[480px]"}>
                <div className={top ? "md:max-w-[620px]" : undefined}>
                  <p data-label className="eyebrow flex items-center gap-3 text-mute">
                    <span className="text-white/90">{ch.index}</span>
                    <span className="h-px w-8 bg-white/30" />
                    {ch.label}
                  </p>
                  <h2
                    className={`headline mt-4 text-[clamp(2.4rem,6.2vw,5.2rem)] ${
                      top ? "md:text-[clamp(2.4rem,4.2vw,3.9rem)]" : ""
                    }`}
                  >
                    {ch.title.split(" ").map((w, i) => (
                      <span key={i} className="-mb-[0.1em] inline-block overflow-hidden pb-[0.1em] align-bottom">
                        <span data-word className="inline-block">
                          {w}
                          {"\u00a0"}
                        </span>
                      </span>
                    ))}
                  </h2>
                </div>
                <p
                  data-body
                  className={`mt-5 max-w-[420px] text-[15px] leading-relaxed text-ink/70 md:text-[17px] ${
                    top ? "md:mb-1 md:max-w-[400px] md:text-[15px]" : ""
                  }`}
                >
                  {ch.body[model]}
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
