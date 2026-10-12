"use client";

import { useExperience } from "@/components/providers/ExperienceProvider";
import { PRODUCTS, type ModelId } from "@/data/products";

export function FinishPicker({ model: forced, className = "" }: { model?: ModelId; className?: string }) {
  const { model: active, finishes, setFinish, finishOf } = useExperience();
  const model = forced ?? active;
  const product = PRODUCTS[model];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div role="radiogroup" aria-label={`${product.name} finish`} className="flex items-center gap-2.5">
        {product.finishes.map((f) => {
          const selected = finishes[model] === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={f.name}
              title={f.name}
              onClick={() => setFinish(model, f.id)}
              className={`relative h-[22px] w-[22px] rounded-full transition-transform duration-300 hover:scale-110 ${
                selected ? "ring-2 ring-white/90 ring-offset-[3px] ring-offset-black" : "ring-1 ring-white/20"
              }`}
              style={{
                background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 42%), ${f.swatch}`,
              }}
            />
          );
        })}
      </div>
      <span className="text-[13px] text-mute">
        {finishOf(model).name} <span className="text-dim">· {product.material}</span>
      </span>
    </div>
  );
}
