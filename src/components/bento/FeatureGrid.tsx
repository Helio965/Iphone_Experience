import Image from "next/image";
import type { ReactNode } from "react";
import { FlameIcon, ShieldIcon, WifiIcon } from "@/assets/icons";
import { Reveal } from "@/components/ui/Reveal";
import { ApertureCard } from "./ApertureCard";
import { BatteryCard } from "./BatteryCard";
import { BentoCard, CardEyebrow, CardTitle } from "./BentoCard";
import { ChipCard } from "./ChipCard";
import { HousingCard } from "./HousingCard";

function StatCard({ icon, value, title, body, glow }: { icon: ReactNode; value: string; title: string; body: string; glow: string }) {
  return (
    <BentoCard className="lg:col-span-2" bodyClassName="flex h-full flex-col p-7">
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full opacity-50 blur-3xl" style={{ background: glow }} />
      <div className="flex items-center gap-2 text-mute">{icon}</div>
      <p className="headline mt-6 text-[44px]">{value}</p>
      <p className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">{title}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-mute">{body}</p>
    </BentoCard>
  );
}

/** Bento grid of highlights. Interactive cards are client components; the shell renders on the server. */
export function FeatureGrid() {
  return (
    <section id="highlights" aria-labelledby="highlights-title" className="relative px-4 py-28 md:px-8 md:py-40">
      <Reveal className="mx-auto max-w-[1180px]">
        <div data-reveal className="mb-12 flex flex-col justify-between gap-6 md:mb-16 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-mute">Get the highlights</p>
            <h2 id="highlights-title" className="headline mt-4 text-[clamp(2.4rem,5.4vw,4.6rem)]">
              Everything you just
              <br />
              took apart, explained.
            </h2>
          </div>
          <p className="max-w-[380px] text-[17px] leading-relaxed text-mute">
            Silicon, optics, power and housing, the four systems that set iPhone 18 Pro Max and iPhone Duo apart.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-6">
          <ChipCard className="lg:col-span-4 lg:row-span-2" />
          <ApertureCard className="lg:col-span-2 lg:row-span-2" />
          <BatteryCard className="lg:col-span-3" />
          <HousingCard className="lg:col-span-3" />

          <BentoCard className="min-h-[420px] lg:col-span-3" bodyClassName="flex h-full flex-col justify-end p-7 md:p-9">
            <Image
              src="/images/duo-preview.webp"
              alt="iPhone Duo held open from behind: its cameras frame a group while the outer display shows them the shot"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="-z-10 object-cover transition-transform duration-[1600ms] ease-[var(--ease-apple)] group-hover/card:scale-[1.04]"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <CardEyebrow tone="text-white/70">Duo Preview</CardEyebrow>
            <CardTitle className="max-w-[420px]">Your subject sees the shot before you take it.</CardTitle>
            <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-white/70">
              Open iPhone Duo and shoot with the 48MP Fusion cameras while the outer display shows everyone in frame.
            </p>
          </BentoCard>

          <BentoCard className="min-h-[420px] lg:col-span-3" bodyClassName="flex h-full flex-col p-7 md:p-9">
            <CardEyebrow>Inner display</CardEyebrow>
            <CardTitle>
              7.6 inches.
              <br />
              5.2 millimeters.
            </CardTitle>
            <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-mute">
              Open, iPhone Duo is a wide 2670 × 1878 canvas with two apps side by side and a widget column.
            </p>
            <div className="relative -mx-7 -mb-7 mt-auto pt-6 md:-mx-9 md:-mb-9">
              <Image
                src="/images/duo-open-hands.webp"
                alt="Two hands holding iPhone Duo open, showing a widget-filled home screen across the inner display"
                width={966}
                height={640}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="h-auto w-full transition-transform duration-[1600ms] ease-[var(--ease-apple)] group-hover/card:scale-[1.03]"
              />
            </div>
          </BentoCard>

          <StatCard
            icon={<FlameIcon className="h-6 w-6" />}
            value="3×"
            title="Larger vapor chamber"
            body="Three times the surface area of iPhone 17 Pro, for up to 40% better sustained performance."
            glow="radial-gradient(closest-side, rgba(255,106,43,0.55), transparent)"
          />
          <StatCard
            icon={<ShieldIcon className="h-6 w-6" />}
            value="3×"
            title="Ceramic Shield 2"
            body="Three times the scratch resistance of iPhone 16 Pro on the front of iPhone 18 Pro Max."
            glow="radial-gradient(closest-side, rgba(108,199,255,0.45), transparent)"
          />
          <StatCard
            icon={<WifiIcon className="h-6 w-6" />}
            value="Wi-Fi 7"
            title="N1 and C2, both Apple"
            body="The N1 chip runs Wi-Fi 7, Bluetooth 6 and Thread. The C2 modem handles 5G on both models."
            glow="radial-gradient(closest-side, rgba(126,224,163,0.4), transparent)"
          />
        </div>
      </Reveal>
    </section>
  );
}
