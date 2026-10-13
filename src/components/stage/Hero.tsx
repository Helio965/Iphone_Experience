"use client";

import type { Ref } from "react";
import { ChevronDown } from "@/assets/icons";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { FinishPicker } from "@/components/ui/FinishPicker";
import { ModelToggle } from "@/components/ui/ModelToggle";
import { PRODUCTS } from "@/data/products";
import { scrollToSelector } from "@/lib/smooth";

interface HeroProps {
  ref?: Ref<HTMLDivElement>;
  onExplore: () => void;
}

/** First frame of the stage: headline, model toggle and finishes over the live 3D product. */
export function Hero({ ref, onExplore }: HeroProps) {
  const { model } = useExperience();
  const product = PRODUCTS[model];

  return (
    <div ref={ref} className="absolute inset-0 z-20">
      <div className="mx-auto flex h-full w-full max-w-[1240px] flex-col px-6 pt-[calc(var(--nav-h)+28px)] md:justify-center md:px-12 md:pt-0">
        <div data-hero-item className="max-w-[580px]">
          <p className="eyebrow flex items-center gap-2 text-mute">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-heat)] shadow-[0_0_12px_var(--color-heat)]" />
            New · Two ways to go further
          </p>
        </div>
        <h1 className="headline mt-4 max-w-[640px] text-[clamp(2.6rem,7.4vw,5.6rem)]">
          <span
            data-hero-item
            className={`block text-titanium transition-opacity duration-700 ${model === "proMax" ? "opacity-100" : "opacity-35"}`}
          >
            Pro Max Power.
          </span>
          <span
            data-hero-item
            className={`block text-glacier transition-opacity duration-700 ${model === "duo" ? "opacity-100" : "opacity-35"}`}
          >
            Duo Innovation.
          </span>
        </h1>
        <p data-hero-item className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-mute md:mt-6 md:text-[19px]">
          <span key={model} className="inline-block animate-fade-in">
            {product.intro}
          </span>
        </p>
        <div data-hero-item className="mt-5 md:mt-8">
          <ModelToggle />
        </div>
        <div data-hero-item className="mt-4 md:mt-5">
          <FinishPicker />
        </div>
        <div data-hero-item className="mt-6 hidden items-center gap-6 sm:flex md:mt-9">
          <a
            href="#buy"
            onClick={(e) => {
              e.preventDefault();
              scrollToSelector("#buy");
            }}
            className="rounded-full bg-buy px-5 py-2.5 text-[15px] font-medium text-white transition-[filter,transform] hover:brightness-110 active:scale-95"
          >
            Buy
          </a>
          <span className="text-[15px] text-mute">{product.price}</span>
          <button
            type="button"
            onClick={onExplore}
            className="group flex items-center gap-1.5 text-[15px] text-link transition-colors hover:text-white"
          >
            Look inside
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
