import type { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  /** Extra classes for the inner padding box. */
  bodyClassName?: string;
  as?: "article" | "div";
}

export function BentoCard({ children, className = "", bodyClassName = "p-7 md:p-9", as: Tag = "article" }: BentoCardProps) {
  return (
    <Tag
      data-reveal
      className={`group/card relative isolate overflow-hidden rounded-[28px] border border-white/[0.07] bg-[var(--color-panel)] shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] transition-[border-color,transform] duration-700 ease-[var(--ease-apple)] hover:border-white/[0.14] ${className}`}
    >
      <div className={`relative h-full ${bodyClassName}`}>{children}</div>
    </Tag>
  );
}

export function CardEyebrow({ children, tone = "text-mute" }: { children: ReactNode; tone?: string }) {
  return <p className={`eyebrow ${tone}`}>{children}</p>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`headline mt-3 text-[28px] md:text-[34px] ${className}`}>{children}</h3>;
}
