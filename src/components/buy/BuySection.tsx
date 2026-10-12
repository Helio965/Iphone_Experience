"use client";

import Image from "next/image";
import { ChevronRight } from "@/assets/icons";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { FinishPicker } from "@/components/ui/FinishPicker";
import { Reveal } from "@/components/ui/Reveal";
import { MODEL_IDS, PRODUCTS, type ModelId } from "@/data/products";
import { scrollToSelector } from "@/lib/smooth";

const CARDS: Record<ModelId, { image: { src: string; w: number; h: number; alt: string }; points: string[]; glow: string }> = {
  proMax: {
    image: { src: "/images/pro-max-lineup.webp", w: 419, h: 299, alt: "iPhone 18 Pro Max in Black, Silver, Glacier and Burgundy" },
    points: ["6.9″ display, ProMotion up to 120Hz", "48MP Fusion camera with variable aperture", "Up to 45 hours video playback"],
    glow: "rgba(201,196,187,0.22)",
  },
  duo: {
    image: { src: "/images/duo-lineup.webp", w: 508, h: 272, alt: "iPhone Duo in Night Sky and Star White, closed and open" },
    points: ["7.6″ inner + 5.4″ outer displays", "Titanium hinge, 5.2 mm open", "Touch ID in the side button"],
    glow: "rgba(110,150,210,0.25)",
  },
};

export function BuySection() {
  const { model } = useExperience();

  return (
    <section id="buy" aria-labelledby="buy-title" className="relative scroll-mt-[var(--nav-h)] px-4 pb-28 pt-10 md:px-8 md:pb-40">
      <Reveal className="mx-auto max-w-[1180px]">
        <div data-reveal className="text-center">
          <p className="eyebrow text-mute">Which one is yours?</p>
          <h2 id="buy-title" className="headline mx-auto mt-4 max-w-[760px] text-[clamp(2.4rem,5.4vw,4.6rem)]">
            <span className="text-titanium">Pro Max Power.</span>
            <br />
            <span className="text-glacier">Duo Innovation.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {MODEL_IDS.map((id) => {
            const p = PRODUCTS[id];
            const c = CARDS[id];
            const selected = model === id;
            return (
              <article
                key={id}
                data-reveal
                className={`relative isolate flex flex-col overflow-hidden rounded-[32px] border p-8 transition-colors duration-700 hover:border-white/20 md:p-10 ${
                  selected ? "border-white/20 bg-[var(--color-panel-2)]" : "border-white/[0.07] bg-[var(--color-panel)]"
                }`}
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 -z-10 h-2/3 opacity-80"
                  style={{ background: `radial-gradient(60% 70% at 50% 30%, ${c.glow}, transparent)` }}
                />
                <div className="flex h-[220px] items-center justify-center md:h-[260px]">
                  <Image
                    src={c.image.src}
                    alt={c.image.alt}
                    width={c.image.w}
                    height={c.image.h}
                    sizes="(min-width: 768px) 460px, 90vw"
                    className="h-auto max-h-full w-auto max-w-full"
                  />
                </div>
                <h3 className="headline mt-6 text-[32px]">{p.name}</h3>
                <p className="mt-1 text-[17px] text-mute">{p.price}</p>
                <ul className="mt-6 space-y-2 text-[15px] text-ink/80">
                  {c.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2">
                      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-white/50" />
                      {pt}
                    </li>
                  ))}
                </ul>
                <FinishPicker model={id} className="mt-7 flex-wrap" />
                <div className="mt-8 flex items-center gap-6">
                  <a
                    href="https://www.apple.com/shop/buy-iphone"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-buy px-5 py-2.5 text-[15px] font-medium text-white transition-[filter,transform] hover:brightness-110 active:scale-95"
                  >
                    Buy<span className="sr-only"> {p.name} (opens apple.com)</span>
                  </a>
                  <a
                    href="#specs"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSelector("#specs");
                    }}
                    className="group flex items-center gap-1 text-[15px] text-link hover:text-white"
                  >
                    Compare
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
