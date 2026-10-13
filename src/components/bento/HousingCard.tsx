"use client";

import { useState } from "react";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { FinishPicker } from "@/components/ui/FinishPicker";
import { AppleLogo } from "@/assets/icons";
import { MODEL_IDS, PRODUCTS, type ModelId } from "@/data/products";
import { BentoCard, CardEyebrow, CardTitle } from "./BentoCard";

const COPY: Record<ModelId, { title: string; body: string }> = {
  proMax: {
    title: "One piece of aluminum.",
    body: "A unibody that runs into a full-width camera plateau, with a colour-matched Ceramic Shield back. Choose a finish and the 3D model above changes with it.",
  },
  duo: {
    title: "Grade 5 titanium, mirror-polished.",
    body: "A titanium enclosure over a recycled aluminum frame, with a titanium hinge of more than 100 parts. Choose a finish and the 3D model above changes with it.",
  },
};

function Lens({ className }: { className: string }) {
  return (
    <span
      className={`absolute rounded-full border-[3px] border-white/25 bg-[radial-gradient(circle_at_35%_30%,#4b5a8a_0%,#0b0e18_45%,#000_75%)] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.45)] ${className}`}
    />
  );
}

function DeviceBack({ model }: { model: ModelId }) {
  const { finishOf } = useExperience();
  const f = finishOf(model);
  const light = model === "proMax" ? ["Silver", "Glacier"].includes(f.name) : f.name === "Star White";
  const sheen = "linear-gradient(115deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.16) 100%)";

  if (model === "proMax") {
    return (
      <div
        className="relative aspect-[78/163] w-[118px] rounded-[26px] p-[3px] shadow-[0_30px_60px_rgba(0,0,0,0.6)] transition-[background] duration-700 md:w-[136px]"
        style={{ background: `linear-gradient(90deg, ${f.metal}, #ffffff66 50%, ${f.metal})` }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[23px]" style={{ background: f.swatch }}>
          <div className="absolute inset-x-[3%] top-[1.5%] h-[33%] rounded-[20px_20px_12px_12px]" style={{ background: f.metal }} />
          <Lens className="left-[7%] top-[4%] aspect-square w-[29%]" />
          <Lens className="left-[7%] top-[17.5%] aspect-square w-[29%]" />
          <Lens className="left-[37%] top-[10.75%] aspect-square w-[29%]" />
          <span className="absolute right-[12%] top-[7%] h-3 w-3 rounded-full bg-[#f3e6c4]" />
          <span className="absolute right-[12%] top-[20%] h-3 w-3 rounded-full bg-black" />
          <AppleLogo
            className={`absolute left-1/2 top-[56%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 ${light ? "text-black/20" : "text-white/25"}`}
          />
          <div className="absolute inset-0" style={{ background: sheen }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-[84/118] w-[150px] rounded-[22px] p-[3px] shadow-[0_30px_60px_rgba(0,0,0,0.6)] transition-[background] duration-700 md:w-[172px]"
      style={{ background: `linear-gradient(90deg, ${f.metal}, #ffffffaa 50%, ${f.metal})` }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[19px]" style={{ background: f.swatch }}>
        <div
          className="absolute left-[6%] top-[5%] flex h-[19%] w-[56%] items-center gap-[6%] rounded-full px-[4%]"
          style={{ background: f.swatch, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35), 0 4px 10px rgba(0,0,0,0.25)" }}
        >
          <span className="relative block aspect-square h-[78%] rounded-full border-[3px] border-white/30 bg-[radial-gradient(circle_at_35%_30%,#4b5a8a_0%,#0b0e18_45%,#000_75%)]" />
          <span className="relative block aspect-square h-[78%] rounded-full border-[3px] border-white/30 bg-[radial-gradient(circle_at_35%_30%,#4b5a8a_0%,#0b0e18_45%,#000_75%)]" />
          <span className="block h-2 w-2 rounded-full bg-[#f3e6c4]" />
        </div>
        <AppleLogo
          className={`absolute left-1/2 top-[56%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 ${light ? "text-black/20" : "text-white/25"}`}
        />
        <div className="absolute inset-0" style={{ background: sheen }} />
      </div>
    </div>
  );
}

export function HousingCard({ className = "" }: { className?: string }) {
  const { model: active } = useExperience();
  const [tab, setTab] = useState<ModelId>(active);

  return (
    <BentoCard className={className} bodyClassName="flex h-full flex-col p-7 md:p-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardEyebrow>Housing</CardEyebrow>
        <div role="tablist" aria-label="Housing material" className="glass flex rounded-full p-1">
          {MODEL_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                tab === id ? "bg-white/[0.14] text-white" : "text-mute hover:text-ink"
              }`}
            >
              {PRODUCTS[id].material}
            </button>
          ))}
        </div>
      </div>
      <CardTitle>{COPY[tab].title}</CardTitle>
      <p className="mt-3 max-w-[440px] text-[15px] leading-relaxed text-mute">{COPY[tab].body}</p>
      <div className="mt-6 flex flex-1 items-center justify-center py-4" role="tabpanel">
        <DeviceBack model={tab} />
      </div>
      <FinishPicker model={tab} className="mt-4 flex-wrap" />
    </BentoCard>
  );
}
