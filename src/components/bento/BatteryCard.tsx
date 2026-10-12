"use client";

import { useRef } from "react";
import { BoltIcon } from "@/assets/icons";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { gsap, useGSAP } from "@/lib/gsap";
import { BentoCard, CardEyebrow } from "./BentoCard";

const BARS = [
  { label: "iPhone 18 Pro Max", hours: 45, tone: "from-[#7ee0a3] to-[#3fbf7a]" },
  { label: "iPhone Duo · outer display", hours: 44, tone: "from-[#9fc2e6] to-[#5e86b4]" },
  { label: "iPhone Duo · inner display", hours: 31, tone: "from-[#9fc2e6]/70 to-[#5e86b4]/70" },
];

const MAX = 45;

export function BatteryCard({ className = "" }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !root.current) return;
      const counter = root.current.querySelector<HTMLElement>("[data-count]");
      const bars = gsap.utils.toArray<HTMLElement>("[data-bar]", root.current);
      const n = { v: 0 };
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
      tl.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.out", stagger: 0.12 }, 0);
      tl.to(
        n,
        {
          v: MAX,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            if (counter) counter.textContent = String(Math.round(n.v));
          },
        },
        0,
      );
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <BentoCard className={className} bodyClassName="p-7 md:p-9">
      <div ref={root}>
        <CardEyebrow>Battery architecture</CardEyebrow>
        <p className="headline mt-3 text-[56px] md:text-[72px]">
          <span className="text-[0.4em] align-top text-mute">up to </span>
          <span data-count className="tabular-nums">
            {MAX}
          </span>
          <span className="text-[0.45em] text-mute"> hrs</span>
        </p>
        <p className="max-w-[420px] text-[15px] leading-relaxed text-mute md:text-[17px]">
          Video playback on iPhone 18 Pro Max. In eSIM-only models, the space the SIM tray used to take goes to a
          bigger battery.
        </p>
        <ul className="mt-7 space-y-4">
          {BARS.map((b) => (
            <li key={b.label}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-ink/80">{b.label}</span>
                <span className="font-mono text-mute">{b.hours} h</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  data-bar
                  className={`h-full origin-left rounded-full bg-gradient-to-r ${b.tone}`}
                  style={{ width: `${(b.hours / MAX) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap gap-2">
          {["18 Pro Max · 50% in ~15 min", "Duo · 50% in ~20 min", "MagSafe + Qi2 · 25W"].map((t) => (
            <span key={t} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink/80">
              <BoltIcon className="h-3.5 w-3.5 text-[#ffd60a]" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}
