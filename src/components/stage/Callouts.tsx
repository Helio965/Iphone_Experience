"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { CALLOUTS, type ModelId } from "@/data/products";
import type { FrameInfo } from "@/lib/three/Experience";
import { clamp, window4 } from "@/lib/three/math";

export interface CalloutController {
  update(info: FrameInfo): void;
}

const formatF = (f: number) => `ƒ/${f < 1.6 ? f.toFixed(2) : f.toFixed(1)}`;
const EDGE = 12;

/**
 * Labels pinned to points on the 3D parts; positions arrive every frame from
 * the renderer. Wide screens hang labels left or right of the anchor; phones
 * drop them below it and clamp them inside the viewport.
 */
export function Callouts({ ref }: { ref?: Ref<CalloutController> }) {
  const { model } = useExperience();
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const labels = useRef(new Map<string, HTMLDivElement>());
  const details = useRef(new Map<string, HTMLParagraphElement>());
  const modelRef = useRef<ModelId>(model);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useImperativeHandle(
    ref,
    () => ({
      update(info: FrameInfo) {
        const vw = window.innerWidth;
        const narrow = vw < 640;
        for (const c of CALLOUTS) {
          const el = nodes.current.get(c.id);
          if (!el) continue;
          const a = info.anchors[c.anchor];
          const alpha = a?.visible ? window4(c.window[0], c.window[1], c.window[2], c.window[3], info.progress) : 0;
          el.style.opacity = alpha.toFixed(3);
          el.style.visibility = alpha > 0.01 ? "visible" : "hidden";
          if (alpha <= 0.01 || !a) continue;

          if (c.live === "aperture" && modelRef.current === "proMax" && info.aperture !== null) {
            const d = details.current.get(c.id);
            const text = `${formatF(info.aperture)} · six blades`;
            if (d && d.textContent !== text) d.textContent = text;
          }

          let side: string = c.side;
          const label = labels.current.get(c.id);
          if (narrow) {
            side = "below";
            if (label) {
              const lw = label.offsetWidth;
              label.style.left = `${clamp(-lw / 2, EDGE - a.x, vw - EDGE - a.x - lw).toFixed(1)}px`;
            }
          } else {
            if (side === "left" && a.x < 300) side = "right";
            else if (side === "right" && a.x > vw - 300) side = "left";
            if (label && label.style.left) label.style.left = "";
          }
          if (el.dataset.side !== side) el.dataset.side = side;
          el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
        }
      },
    }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {CALLOUTS.filter((c) => c.models.includes(model)).map((c) => (
        <div
          key={c.id}
          ref={(el) => {
            nodes.current.set(c.id, el!);
            return () => void nodes.current.delete(c.id);
          }}
          data-side={c.side}
          className="group invisible absolute left-0 top-0 opacity-0 will-change-transform"
        >
          <span className="absolute -left-[5px] -top-[5px] h-[10px] w-[10px] rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.95)]" />
          <span className="absolute -left-[5px] -top-[5px] h-[10px] w-[10px] animate-pulse-ring rounded-full border border-white/80" />
          <span
            className={[
              "absolute left-0 top-0 h-px w-16 bg-gradient-to-r from-white/80 to-white/5",
              "group-data-[side=left]:left-auto group-data-[side=left]:right-0 group-data-[side=left]:bg-gradient-to-l",
              "group-data-[side=below]:h-5 group-data-[side=below]:w-px group-data-[side=below]:bg-gradient-to-b",
            ].join(" ")}
          />
          <div
            ref={(el) => {
              labels.current.set(c.id, el!);
              return () => void labels.current.delete(c.id);
            }}
            className={[
              "glass absolute left-[4.5rem] top-0 -translate-y-1/2 whitespace-nowrap rounded-2xl px-3.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
              "group-data-[side=left]:left-auto group-data-[side=left]:right-[4.5rem]",
              "group-data-[side=below]:top-6 group-data-[side=below]:translate-y-0 group-data-[side=below]:px-3 group-data-[side=below]:py-2",
            ].join(" ")}
          >
            <p className="text-[12px] font-semibold tracking-[-0.01em] text-white sm:text-[13px]">{c.title}</p>
            <p
              ref={(el) => {
                details.current.set(c.id, el!);
                return () => void details.current.delete(c.id);
              }}
              className="mt-0.5 font-mono text-[10px] text-mute sm:text-[11px]"
            >
              {c.live === "aperture" && model === "proMax" ? `${formatF(1.48)} · six blades` : c.detail[model]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
