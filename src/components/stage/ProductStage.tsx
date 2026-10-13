"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useExperience } from "@/components/providers/ExperienceProvider";
import { PRODUCTS } from "@/data/products";
import { useReducedMotion } from "@/hooks/useMediaQuery";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { scrollToY } from "@/lib/smooth";
import { stageBus } from "@/lib/stageBus";
import { Experience, webglAvailable, type FrameInfo } from "@/lib/three/Experience";
import { Callouts, type CalloutController } from "./Callouts";
import { ChapterOverlays, type OverlayController } from "./ChapterOverlays";
import { Hero } from "./Hero";
import { chapterStops, Hud, type HudController } from "./Hud";
import { StageFallback } from "./StageFallback";

/** Scroll length of the pinned sequence. The sticky viewport is 100vh of it. */
const STAGE_VH = 900;

type Status = "loading" | "ready" | "fallback";

/**
 * Hero + scroll-driven separation study. A sticky viewport holds the WebGL
 * canvas; ScrollTrigger maps the section's scroll range to 0–1 and every
 * layer (3D parts, typography, callouts, HUD) reads that one number.
 */
export function ProductStage() {
  const { model, finishOf } = useExperience();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const overlays = useRef<OverlayController>(null);
  const callouts = useRef<CalloutController>(null);
  const hud = useRef<HudController>(null);
  const exp = useRef<Experience | null>(null);
  const progress = useRef(0);
  const [status, setStatus] = useState<Status>("loading");

  const proMaxFinish = finishOf("proMax");
  const duoFinish = finishOf("duo");
  const latest = useRef({ model, proMaxFinish, duoFinish, reduced });
  useEffect(() => {
    latest.current = { model, proMaxFinish, duoFinish, reduced };
  });

  /* Renderer lifecycle -------------------------------------------------- */
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancelled = false;
    let instance: Experience | null = null;

    const onFrame = (info: FrameInfo) => {
      overlays.current?.update(info.progress);
      hud.current?.update(info.progress);
      callouts.current?.update(info);
      stageBus.publish(info.progress);
    };

    (async () => {
      if (!webglAvailable()) throw new Error("WebGL unavailable");
      const init = latest.current;
      instance = await Experience.create(
        el,
        {
          model: init.model,
          finishes: { proMax: init.proMaxFinish, duo: init.duoFinish },
          reducedMotion: init.reduced,
          onFrame,
        },
        () => cancelled,
      );
      if (!instance) return;
      // Catch up on anything the visitor changed while we were loading.
      const now = latest.current;
      instance.setModel(now.model);
      instance.setReducedMotion(now.reduced);
      instance.setFinish("proMax", now.proMaxFinish);
      instance.setFinish("duo", now.duoFinish);
      instance.syncProgress(progress.current);
      instance.start();
      exp.current = instance;
      setStatus("ready");
    })().catch((err: unknown) => {
      console.warn("[stage] Falling back to photography:", err);
      if (!cancelled) setStatus("fallback");
    });

    return () => {
      cancelled = true;
      instance?.dispose();
      exp.current = null;
    };
  }, []);

  useEffect(() => {
    exp.current?.setModel(model);
  }, [model]);

  useEffect(() => {
    exp.current?.setReducedMotion(reduced);
  }, [reduced]);

  useEffect(() => {
    exp.current?.setFinish("proMax", proMaxFinish);
  }, [proMaxFinish]);

  useEffect(() => {
    exp.current?.setFinish("duo", duoFinish);
  }, [duoFinish]);

  /* Only render while the stage is on screen. */
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => exp.current?.setVisible(entry.isIntersecting), {
      rootMargin: "120px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Scroll → progress ---------------------------------------------------- */
  useGSAP(
    () => {
      const drive = (p: number) => {
        progress.current = p;
        if (exp.current) {
          exp.current.setProgress(p);
        } else {
          overlays.current?.update(p);
          hud.current?.update(p);
          stageBus.publish(p);
        }
      };
      const st = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => drive(self.progress),
        onRefresh: (self) => drive(self.progress),
      });
      drive(st.progress);

      if (!reduced) {
        gsap.from("[data-hero-item]", {
          y: 26,
          autoAlpha: 0,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.07,
          delay: 0.1,
        });
      }
    },
    { scope: section, dependencies: [reduced], revertOnUpdate: true },
  );

  const jump = useCallback((p: number) => {
    const el = section.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    scrollToY(top + p * range, { duration: 1.8 });
  }, []);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    exp.current?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };

  return (
    <section
      id="overview"
      ref={section}
      aria-label={`${PRODUCTS[model].name}: inside the object`}
      className="relative"
      style={{ height: `${STAGE_VH}vh` }}
    >
      <div
        className="sticky top-0 h-[100svh] w-full overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerLeave={() => exp.current?.setPointer(0, 0)}
      >
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_68%_45%,#16181d_0%,#060607_52%,#000_100%)]" />
          <div className="absolute left-[62%] top-[46%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(96,128,190,0.16),transparent)] blur-3xl" />
        </div>

        {status === "fallback" ? (
          <StageFallback />
        ) : (
          <canvas
            ref={canvas}
            aria-hidden
            className={`absolute inset-0 h-full w-full transition-opacity duration-[1400ms] ease-[var(--ease-apple)] ${
              status === "ready" ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {status === "loading" ? (
          <div className="absolute inset-x-0 bottom-[22%] flex justify-center md:bottom-auto md:left-[34%] md:top-1/2">
            <p className="eyebrow animate-pulse text-dim">Assembling object…</p>
          </div>
        ) : null}

        <Callouts ref={callouts} />
        <Hero ref={hero} onExplore={() => jump(chapterStops[0])} />
        <ChapterOverlays ref={overlays} heroRef={hero} />
        <Hud ref={hud} onJump={jump} />

        <p className="sr-only">
          An interactive 3D model of {PRODUCTS[model].name}. As you scroll, the housing lifts away, the logic board, battery
          and vapor chamber separate, and the camera lens and A20 Pro chip are shown in exploded close-ups.
        </p>
      </div>
    </section>
  );
}
