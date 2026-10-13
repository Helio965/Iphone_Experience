import { AppleLogo } from "@/assets/icons";
import { SOURCES } from "@/data/products";

const NOTES = [
  "Battery life varies by use and configuration. Video playback figures are for eSIM models as published by Apple.",
  "Performance comparisons are against the previous generation as stated at launch; the vapor chamber figure compares with iPhone 17 Pro.",
  "Internal layouts are illustrative: every 3D part is modelled and textured procedurally in the browser, not taken from teardown data. Product photography is used for illustration only.",
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0b0b0c] px-4 pb-14 pt-12 text-[12px] leading-relaxed text-mute md:px-8">
      <div className="mx-auto max-w-[1080px]">
        <ol className="list-decimal space-y-2 pl-4 marker:text-dim">
          {NOTES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ol>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-ink/70">Sources</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <AppleLogo className="h-3.5 w-3.5 text-ink/60" />
            Independent concept study. Not affiliated with or endorsed by Apple Inc.
          </p>
          <p className="text-dim">Apple, iPhone and the Apple logo are trademarks of Apple Inc.</p>
        </div>
      </div>
    </footer>
  );
}
