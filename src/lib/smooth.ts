import type Lenis from "lenis";

/** The page-wide Lenis instance (null when motion is reduced or before mount). */
let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};

export const getLenis = () => instance;

/** Smooth-scrolls to an absolute Y, falling back to native scrolling. */
export function scrollToY(y: number, opts: { immediate?: boolean; duration?: number } = {}) {
  if (instance) {
    instance.scrollTo(y, { immediate: opts.immediate, duration: opts.duration ?? 1.4 });
  } else {
    window.scrollTo({ top: y, behavior: opts.immediate ? "auto" : "smooth" });
  }
}

export function scrollToSelector(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 48;
  scrollToY(el.getBoundingClientRect().top + window.scrollY - (selector === "#overview" ? 0 : nav));
}
