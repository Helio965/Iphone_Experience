"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { Reveal } from "@/components/ui/Reveal";
import { MODEL_IDS, PRODUCTS, SPEC_GROUPS, type ModelId } from "@/data/products";

const THUMBS: Record<ModelId, { src: string; w: number; h: number; alt: string }> = {
  proMax: { src: "/images/pro-max-lineup.webp", w: 419, h: 299, alt: "iPhone 18 Pro Max in four finishes" },
  duo: { src: "/images/duo-lineup.webp", w: 508, h: 272, alt: "iPhone Duo closed and open" },
};

export function SpecsTable() {
  const { model, setModel } = useExperience();
  const [diffOnly, setDiffOnly] = useState(false);
  const switchId = useId();

  return (
    <section id="specs" aria-labelledby="specs-title" className="relative scroll-mt-[var(--nav-h)] px-4 py-28 md:px-8 md:py-40">
      <Reveal className="mx-auto max-w-[1080px]" stagger={0.04}>
        <div data-reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-mute">Tech specs</p>
            <h2 id="specs-title" className="headline mt-4 text-[clamp(2.4rem,5.4vw,4.6rem)]">
              Compare the models.
            </h2>
          </div>
          <label htmlFor={switchId} className="flex cursor-pointer items-center gap-3 text-[14px] text-mute">
            Highlight differences
            <button
              id={switchId}
              type="button"
              role="switch"
              aria-checked={diffOnly}
              onClick={() => setDiffOnly((d) => !d)}
              className={`relative h-[26px] w-[44px] rounded-full transition-colors duration-300 ${diffOnly ? "bg-[#30d158]" : "bg-white/15"}`}
            >
              <span
                className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-[var(--ease-apple)] ${
                  diffOnly ? "translate-x-[18px]" : ""
                }`}
              />
            </button>
          </label>
        </div>

        <div
          data-reveal
          className="sticky top-[var(--nav-h)] z-10 -mx-4 mt-12 bg-gradient-to-b from-black from-60% to-transparent px-4 pb-6 pt-3 md:-mx-6 md:px-6"
        >
          <div className="glass-strong grid grid-cols-2 gap-4 rounded-3xl p-4 md:grid-cols-[200px_1fr_1fr] md:gap-8 md:p-5">
            <div className="hidden items-end md:flex">
              <p className="eyebrow text-dim">Model</p>
            </div>
            {MODEL_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setModel(id)}
                aria-pressed={model === id}
                className={`flex items-center gap-3 rounded-2xl p-2 text-left transition-colors md:gap-4 ${
                  model === id ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                }`}
              >
                <Image
                  src={THUMBS[id].src}
                  alt={THUMBS[id].alt}
                  width={THUMBS[id].w}
                  height={THUMBS[id].h}
                  className="hidden h-12 w-auto sm:block"
                />
                <span>
                  <span className="block text-[15px] font-semibold tracking-[-0.01em] md:text-[17px]">{PRODUCTS[id].name}</span>
                  <span className="block text-[12px] text-mute md:text-[13px]">{PRODUCTS[id].price}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {SPEC_GROUPS.map((group) => (
            <div key={group.title} data-reveal className="border-b border-white/10 py-8 last:border-b-0">
              <h3 className="text-[21px] font-semibold tracking-[-0.02em] md:text-[24px]">{group.title}</h3>
              <dl className="mt-4">
                {group.rows.map((row) => {
                  const same = row.values.proMax === row.values.duo;
                  const dim = diffOnly && same;
                  return (
                    <div
                      key={row.label}
                      className={`grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/[0.06] py-4 transition-opacity duration-500 md:grid-cols-[200px_1fr_1fr] md:gap-8 ${
                        dim ? "opacity-30" : "opacity-100"
                      }`}
                    >
                      <dt className="col-span-2 text-[12px] font-medium uppercase tracking-[0.08em] text-dim md:col-span-1 md:pt-0.5 md:text-[13px] md:normal-case md:tracking-normal">
                        {row.label}
                        {diffOnly && !same ? <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#30d158] align-middle" /> : null}
                      </dt>
                      {MODEL_IDS.map((id) => (
                        <dd
                          key={id}
                          className={`whitespace-pre-line text-[14px] leading-relaxed transition-colors md:text-[16px] ${
                            model === id ? "text-ink" : "text-ink/60"
                          }`}
                        >
                          {row.values[id]}
                        </dd>
                      ))}
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
