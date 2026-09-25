"use client";

import { useEffect, useRef } from "react";
import { COLOURS } from "@/lib/content";
import { store } from "@/lib/store";
import styles from "./StoneLayer.module.css";

// The one canvas that draws every stone. Until WebGL is running, each anchor
// shows a still render of the stone in the same framing; the canvas takes over
// without a visible change. WebGL starts on the first sign of intent (pointer,
// scroll, key or touch), or after a long idle wait on desktop, so the first
// paint never waits for it.
export function StoneLayer() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let stage: import("./stone").StoneStage | null = null;
    let cancelled = false;
    let started = false;
    const cleanups: (() => void)[] = [];
    const hex = (id: string) => COLOURS.find((c) => c.id === id)?.hex ?? COLOURS[1]!.hex;

    const start = async () => {
      if (started) return;
      started = true;
      const { StoneStage } = await import("./stone");
      if (cancelled) return;
      try {
        stage = new StoneStage(el, hex(store.get().colour));
      } catch {
        return; // no WebGL: the stills stay
      }
      const byOrder = (a: HTMLElement, b: HTMLElement) => Number(a.dataset.stoneOrder ?? 0) - Number(b.dataset.stoneOrder ?? 0);
      const main = [...document.querySelectorAll<HTMLElement>('[data-stone="main"]')].sort(byOrder);
      const home = [...document.querySelectorAll<HTMLElement>('[data-stone="home"]')];
      // On wide screens one stone travels between its anchors. On narrow ones
      // the anchors stack with text between them, so each keeps its own stone.
      const travel = window.matchMedia("(min-width: 821px)").matches;
      if (travel && main.length) stage.add("main", "pocket", main);
      else main.forEach((a, i) => stage!.add(i === 0 ? "main" : `main-${i}`, "pocket", [a]));
      if (home.length) stage.add("home", "home", home);
      let handed = false;
      stage.start(() => {
        if (handed) return;
        handed = true;
        document.documentElement.dataset.gl = "ready";
      });

      const onResize = () => stage?.resize();
      const onPointer = (e: PointerEvent) => stage?.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
      const onContact = (e: Event) => stage?.bump((e as CustomEvent<string>).detail ?? "main");
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("cairn:contact", onContact);
      let colour = store.get().colour;
      const unsubscribe = store.subscribe(() => {
        const next = store.get().colour;
        if (next === colour) return;
        colour = next;
        stage?.setColour(hex(next));
      });
      cleanups.push(() => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("cairn:contact", onContact);
        unsubscribe();
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
    const fine = window.matchMedia("(pointer: fine)").matches;
    const idleStart = () => {
      if (fine) idle = window.setTimeout(() => void start(), 9000);
    };
    if (document.readyState === "complete") idleStart();
    else window.addEventListener("load", idleStart, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(idle);
      for (const [target, type] of intents) target.removeEventListener(type, onIntent);
      cleanups.forEach((c) => c());
      stage?.dispose();
      delete document.documentElement.dataset.gl;
    };
  }, []);

  return <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />;
}
