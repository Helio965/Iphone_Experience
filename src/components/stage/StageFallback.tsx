"use client";

import Image from "next/image";
import { useExperience } from "@/components/providers/ExperienceProvider";

/** Shown when WebGL is unavailable: the photography still carries the story. */
export function StageFallback() {
  const { model } = useExperience();
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-[18vh] md:items-center md:justify-end md:pb-0 md:pr-[8vw]">
      <div className="relative w-[min(86vw,560px)]">
        <div aria-hidden className="absolute inset-[10%] rounded-full bg-[radial-gradient(closest-side,rgba(120,160,255,0.22),transparent)] blur-2xl" />
        {model === "proMax" ? (
          <Image
            src="/images/pro-max-lineup.webp"
            alt="iPhone 18 Pro Max in Black, Silver, Glacier and Burgundy"
            width={419}
            height={299}
            className="relative h-auto w-full"
            preload
          />
        ) : (
          <Image
            src="/images/duo-lineup.webp"
            alt="iPhone Duo in Night Sky and Star White, closed and open"
            width={508}
            height={272}
            className="relative h-auto w-full"
            preload
          />
        )}
      </div>
    </div>
  );
}
