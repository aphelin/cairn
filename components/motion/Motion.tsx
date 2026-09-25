"use client";

import { useEffect } from "react";

// Smooth scrolling on pointer devices, kept in step with GSAP's ScrollTrigger.
// Touch devices and reduced motion keep native scrolling.
export function Motion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;
    let destroy = () => {};
    let cancelled = false;
    (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const navHeight = () => parseFloat(getComputedStyle(document.documentElement).fontSize) * 4;
      const lenis = new Lenis({ lerp: 0.12, anchors: { offset: -navHeight() - 16 }, autoRaf: false });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      destroy = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    })();
    return () => {
      cancelled = true;
      destroy();
    };
  }, []);

  return null;
}
