"use client";

import { useEffect } from "react";

// Motion that isn't one section's own: smooth scrolling on pointer devices,
// kept in step with GSAP's ScrollTrigger; section titles whose lines rise out
// of a mask once, as they arrive; and a slight magnetic pull on the big pill
// buttons. Reduced motion gets none of it, and native scrolling.
export function Motion() {
  // A looping animation keeps costing a style, paint and layer pass every
  // frame even where nobody can see it. So a section more than a quarter of a
  // screen out of view is marked idle, and globals.css pauses whatever loops
  // in it; it picks up where it left off as the section comes back.
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("main > section, body > footer")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.toggleAttribute("data-idle", !e.isIntersecting);
      },
      { rootMargin: "25% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => {
      io.disconnect();
      sections.forEach((s) => s.removeAttribute("data-idle"));
    };
  }, []);

  // A section two screens or more away skips style, layout and paint
  // altogether (content-visibility), held at exactly the size it has, so
  // something that restyles the whole page, like the dial's colour changing,
  // only costs what's near. It's let go well before the browser would draw
  // it again. Sizes are taken once the fonts are in, and taken again after
  // the window changes width (or, with a mouse, height: a phone's toolbar
  // coming and going changes no section's size).
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("main > section, body > footer")];
    const far = new Set<HTMLElement>();
    let started = false; // the fonts are in and the page has loaded
    let ready = false; // and the window isn't mid-resize
    const hold = (s: HTMLElement, box: DOMRectReadOnly) => {
      const c = getComputedStyle(s);
      const px = (v: string) => parseFloat(v) || 0;
      const w = box.width - px(c.paddingLeft) - px(c.paddingRight) - px(c.borderLeftWidth) - px(c.borderRightWidth);
      const h = box.height - px(c.paddingTop) - px(c.paddingBottom) - px(c.borderTopWidth) - px(c.borderBottomWidth);
      s.style.containIntrinsicSize = `auto ${w}px auto ${h}px`;
      s.style.contentVisibility = "auto";
    };
    const free = (s: HTMLElement) => {
      s.style.contentVisibility = "";
      s.style.containIntrinsicSize = "";
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const s = e.target as HTMLElement;
          if (e.isIntersecting) {
            far.delete(s);
            free(s);
          } else {
            far.add(s);
            if (ready) hold(s, e.boundingClientRect);
          }
        }
      },
      { rootMargin: "200% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    const holdAll = () => {
      // Measured first, then held, so it's one layout.
      const boxes = [...far].map((s) => [s, s.getBoundingClientRect()] as const);
      for (const [s, box] of boxes) hold(s, box);
    };
    let cancelled = false;
    const loaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    });
    void Promise.all([document.fonts.ready, loaded]).then(() => {
      if (cancelled) return;
      started = ready = true;
      holdAll();
    });
    const fine = window.matchMedia("(pointer: fine)").matches;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let timer = 0;
    const onResize = () => {
      const moved = window.innerWidth !== width || (fine && window.innerHeight !== height);
      width = window.innerWidth;
      height = window.innerHeight;
      if (!moved || !started) return;
      ready = false;
      sections.forEach(free);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        ready = true;
        holdAll();
      }, 400);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      io.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      sections.forEach(free);
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduced) return;
    let destroy = () => {};
    let cancelled = false;
    (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      const cleanups: (() => void)[] = [];

      if (fine) {
        const navHeight = () => parseFloat(getComputedStyle(document.documentElement).fontSize) * 4;
        const lenis = new Lenis({ lerp: 0.11, anchors: { offset: -navHeight() }, autoRaf: false });
        lenis.on("scroll", ScrollTrigger.update);
        // Lenis runs on the clock, so a slow frame never holds the scroll
        // back; the tweens keep GSAP's lag smoothing, so a slow frame (WebGL
        // warming up in the first seconds) pauses them instead of skipping
        // them to their end.
        const tick = () => lenis.raf(performance.now());
        gsap.ticker.add(tick);
        cleanups.push(() => {
          gsap.ticker.remove(tick);
          lenis.destroy();
        });
      }

      // Titles: one reveal grammar for the whole page. A title already on
      // screen when the page loads is left alone rather than hidden.
      await document.fonts.ready;
      if (cancelled) return;
      for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
        if (el.getBoundingClientRect().top < window.innerHeight) continue;
        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "reveal-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 112,
              duration: 1.15,
              ease: "expo.out",
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: "top 86%", once: true },
            }),
        });
        cleanups.push(() => split.revert());
      }

      // The big pills lean toward the pointer, a few pixels, and settle back.
      // They use `translate`, so their own press (a transform) still works.
      if (fine) {
        for (const btn of document.querySelectorAll<HTMLElement>(".btn-lg")) {
          const move = (e: PointerEvent) => {
            const r = btn.getBoundingClientRect();
            const dx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 10;
            const dy = ((e.clientY - (r.top + r.height / 2)) / r.height) * 7;
            btn.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
          };
          const leave = () => {
            btn.style.translate = "";
          };
          btn.addEventListener("pointermove", move);
          btn.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            btn.removeEventListener("pointermove", move);
            btn.removeEventListener("pointerleave", leave);
          });
        }
      }
      destroy = () => cleanups.forEach((c) => c());
    })();
    return () => {
      cancelled = true;
      destroy();
    };
  }, []);

  return null;
}
