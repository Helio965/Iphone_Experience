import type { SVGProps } from "react";
import { APPLE_LOGO_PATH, APPLE_LOGO_VIEWBOX } from "./brand";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

export function AppleLogo({ title, ...props }: IconProps) {
  return (
    <svg viewBox={`0 0 ${APPLE_LOGO_VIEWBOX} ${APPLE_LOGO_VIEWBOX}`} fill="currentColor" aria-hidden={title ? undefined : true} {...props}>
      {title ? <title>{title}</title> : null}
      <path d={APPLE_LOGO_PATH} />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden {...props}>
      <path d="M3.5 6l4.5 4.5L12.5 6" />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden {...props}>
      <path d="M6 3.5L10.5 8 6 12.5" />
    </svg>
  );
}

export function MenuIcon({ open, ...props }: IconProps & { open: boolean }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" aria-hidden {...props}>
      <path d={open ? "M4 4l10 10" : "M2.5 6.5h13"} className="transition-all duration-300" />
      <path d={open ? "M14 4L4 14" : "M2.5 11.5h13"} className="transition-all duration-300" />
    </svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M13.2 2.5L4.8 13.4h6l-1 8.1 8.4-10.9h-6l1-8.1z" />
    </svg>
  );
}

export function WifiIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden {...props}>
      <path d="M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.6 16a5 5 0 016.8 0" />
      <circle cx="12" cy="19.2" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 2.8l7.5 3v5.6c0 4.6-3.1 8.6-7.5 9.8-4.4-1.2-7.5-5.2-7.5-9.8V5.8l7.5-3z" />
      <path d="M8.6 12.2l2.4 2.4 4.6-4.8" strokeLinecap="round" />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 21.5c-4 0-6.8-2.7-6.8-6.4 0-3.9 3.2-5.8 3.9-10.1 2.4 1.4 3.4 3.6 3.5 5.6 1-.7 1.7-1.9 1.9-3.3 2.3 1.9 4.3 4.6 4.3 7.8 0 3.7-2.8 6.4-6.8 6.4z" />
    </svg>
  );
}
