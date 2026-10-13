"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AppleLogo, MenuIcon } from "@/assets/icons";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { MODEL_IDS, PRODUCTS, type ModelId } from "@/data/products";
import { scrollToSelector, scrollToY } from "@/lib/smooth";
import { stageBus } from "@/lib/stageBus";

const LINKS = [
  { label: "Overview", href: "#overview" },
  { label: "Tech Specs", href: "#specs" },
];

export function GlobalNav() {
  const { model, setModel } = useExperience();
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      stageBus.subscribe((p) => {
        const bar = barRef.current;
        if (!bar) return;
        bar.style.transform = `scaleX(${p})`;
        bar.style.opacity = p > 0.002 && p < 0.999 ? "1" : "0";
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (href: string) => (e: MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollToSelector(href);
  };

  const pick = (id: ModelId) => {
    setModel(id);
    setOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav aria-label="Primary" className="glass-strong relative h-[var(--nav-h)] border-x-0 border-t-0">
        <div className="mx-auto flex h-full max-w-[1080px] items-center justify-between gap-6 px-5">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToY(0);
            }}
            className="text-ink/90 transition-colors hover:text-white"
            aria-label="Back to top"
          >
            <AppleLogo className="h-[18px] w-[18px] -translate-y-px" />
          </a>

          <ul className="hidden items-center gap-1 text-[12px] md:flex">
            {MODEL_IDS.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => pick(id)}
                  aria-pressed={model === id}
                  className={`relative rounded-full px-3 py-1.5 tracking-[-0.01em] transition-colors duration-300 ${
                    model === id ? "text-white" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {PRODUCTS[id].name}
                  <span
                    aria-hidden
                    className={`absolute inset-x-3 -bottom-[7px] h-px bg-white transition-transform duration-500 ease-[var(--ease-apple)] ${
                      model === id ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              </li>
            ))}
            <li aria-hidden className="mx-3 h-3.5 w-px bg-white/15" />
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={go(l.href)} className="rounded-full px-3 py-1.5 text-ink/60 transition-colors hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="#buy"
              onClick={go("#buy")}
              className="rounded-full bg-buy px-3.5 py-1 text-[12px] font-medium text-white transition-[filter,transform] hover:brightness-110 active:scale-95"
            >
              Buy
            </a>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full text-ink/80 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <MenuIcon open={open} className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <div
          ref={barRef}
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-px origin-left bg-gradient-to-r from-[var(--color-trace)] via-white to-[var(--color-heat)] opacity-0 transition-opacity duration-500"
          style={{ transform: "scaleX(0)" }}
        />
      </nav>

      <div
        id="mobile-menu"
        className={`glass-strong overflow-hidden border-x-0 border-t-0 !bg-black/90 transition-[max-height,opacity] duration-500 ease-[var(--ease-apple)] md:hidden ${
          open ? "max-h-80 opacity-100" : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <ul className="px-6 pb-6 pt-2 text-[22px] font-semibold tracking-[-0.02em]">
          {MODEL_IDS.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => pick(id)}
                aria-pressed={model === id}
                className={`w-full py-2 text-left ${model === id ? "text-white" : "text-ink/55"}`}
              >
                {PRODUCTS[id].name}
              </button>
            </li>
          ))}
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={go(l.href)} className="block py-2 text-ink/55">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
