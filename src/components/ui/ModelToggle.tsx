"use client";

import { useExperience } from "@/components/providers/ExperienceProvider";
import { MODEL_IDS, PRODUCTS } from "@/data/products";

/** Segmented control with a sliding glass thumb. */
export function ModelToggle({ className = "" }: { className?: string }) {
  const { model, setModel } = useExperience();
  const index = MODEL_IDS.indexOf(model);

  return (
    <div
      role="radiogroup"
      aria-label="Choose a model"
      className={`glass relative grid w-full max-w-[360px] grid-cols-2 rounded-full p-1 ${className}`}
    >
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-[var(--ease-apple)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {MODEL_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={model === id}
          onClick={() => setModel(id)}
          className={`relative z-10 rounded-full px-3 py-2.5 text-[13px] font-medium tracking-[-0.01em] transition-colors duration-300 sm:text-[14px] ${
            model === id ? "text-white" : "text-ink/55 hover:text-ink/85"
          }`}
        >
          {PRODUCTS[id].name}
        </button>
      ))}
    </div>
  );
}
