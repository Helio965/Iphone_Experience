"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Staggers every `[data-reveal]` descendant into view as it scrolls in.
 * Content stays visible without JS and when motion is reduced.
 */
export function Reveal({ children, className, stagger = 0.08 }: { children: ReactNode; className?: string; stagger?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !root.current) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", root.current);
      gsap.set(items, { autoAlpha: 0, y: 40 });
      ScrollTrigger.batch(items, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out", stagger, overwrite: true }),
      });
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
