"use client";

import { useEffect, useRef } from "react";
import { live, store } from "@/lib/store";
import type { DialStage } from "./stage";
import styles from "./DialLayer.module.css";

let current: DialStage | null = null;
// The running stage, for sections that read it (the exploded view's callouts).
export const stage = () => current;

// The one canvas that draws every device. Until WebGL is running, each anchor
// shows a still render in the same framing; the canvas takes over without a
// visible change. WebGL starts on the first sign of intent (pointer, scroll,
// key or touch), or after an idle wait on desktop, so the first paint never
// waits for it. Its code is loaded in a quiet moment after the page has
// loaded, sooner if asked: evaluating it takes a noticeable moment on a
// phone, better spent before the visitor's first touch than on it.
export function DialLayer() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let s: DialStage | null = null;
    let cancelled = false;
    let started = false;
    const cleanups: (() => void)[] = [];

    const start = async () => {
      if (started) return;
      started = true;
      const { DialStage } = await import("./stage");
      if (cancelled) return;
      try {
        s = new DialStage(el, store.get().finish);
      } catch {
        return; // no WebGL: the stills stay
      }
      current = s;
      // Every anchor keeps its own device, set up for its own shot, so a
      // device never has to cross the words between two sections.
      for (const kind of ["home", "pocket"] as const) {
        document.querySelectorAll<HTMLElement>(`[data-dial="${kind}"]`).forEach((a, i) => s!.add(a.dataset.dialName ?? `${kind}-${i}`, kind, [a]));
      }
      s.state.level = store.get().level;

      const onResize = () => s?.resize();
      const onPointer = (e: PointerEvent) => s?.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onPointer, { passive: true });
      let finish = store.get().finish;
      const unsubscribe = store.subscribe(() => {
        const next = store.get();
        if (s) s.state.level = next.level;
        if (next.finish === finish) return;
        finish = next.finish;
        s?.setFinish(next.finish);
      });
      cleanups.push(() => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointer);
        unsubscribe();
      });

      // Everything is built first, a step at a time, while the stills stay.
      if (!(await s.warm(() => cancelled)) || cancelled) return;
      let handed = false;
      s.start(() => {
        s!.state.drag = live.drag;
        s!.state.explode = live.explode;
        s!.state.night = live.night;
        if (handed) return;
        handed = true;
        document.documentElement.dataset.gl = "ready";
      });
    };

    const intents: [EventTarget, string][] = [
      [window, "pointermove"],
      [window, "pointerdown"],
      [window, "scroll"],
      [window, "keydown"],
      [window, "touchstart"],
    ];
    const onIntent = () => void start();
    for (const [target, type] of intents) target.addEventListener(type, onIntent, { once: true, passive: true });
    let idle = 0;
    let preload = 0;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const idleStart = () => {
      if (fine) idle = window.setTimeout(() => void start(), 6000);
      // Loading the code makes no WebGL context, so a phone still paints
      // only stills until it's touched.
      preload = window.setTimeout(() => {
        if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => void import("./stage"), { timeout: 3000 });
        else void import("./stage");
      }, 1500);
    };
    if (document.readyState === "complete") idleStart();
    else window.addEventListener("load", idleStart, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(idle);
      window.clearTimeout(preload);
      window.removeEventListener("load", idleStart);
      for (const [target, type] of intents) target.removeEventListener(type, onIntent);
      cleanups.forEach((c) => c());
      s?.dispose();
      current = null;
      delete document.documentElement.dataset.gl;
    };
  }, []);

  return <canvas data-stage="dial" ref={canvas} className={styles.canvas} aria-hidden="true" />;
}
