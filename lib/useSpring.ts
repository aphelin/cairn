"use client";

import { useEffect, useRef, useState } from "react";

// A damped spring for numbers: they travel to a new value physically and
// settle, instead of snapping. Reduced motion snaps.
export function useSpring(target: number, stiffness = 170, damping = 22) {
  const [value, setValue] = useState(target);
  const state = useRef({ x: target, v: 0 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      state.current = { x: target, v: 0 };
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const s = state.current;
      s.v += ((target - s.x) * stiffness - s.v * damping) * dt;
      s.x += s.v * dt;
      if (Math.abs(target - s.x) < 0.01 && Math.abs(s.v) < 0.01) {
        s.x = target;
        s.v = 0;
        setValue(target);
        return;
      }
      setValue(s.x);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, stiffness, damping]);

  return value;
}
