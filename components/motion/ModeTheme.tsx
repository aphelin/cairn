"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

// The page takes the dial's colour: while a mode is on, the root carries
// --mode (that mode's colour) and --accent follows it; while the dial is off
// --mode is unset and --accent falls back to Desk's colour.
const NAMES = ["", "desk", "room", "home"];

export function ModeTheme() {
  const level = useStore((s) => s.level);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.mode = NAMES[level] || "off";
    if (level > 0) {
      el.style.setProperty("--mode", `var(--mode-${NAMES[level]})`);
      el.style.setProperty("--mode-ink", `var(--mode-${NAMES[level]}-ink)`);
      el.style.setProperty("--accent", `var(--mode-${NAMES[level]})`);
      el.style.setProperty("--accent-ink", `var(--mode-${NAMES[level]}-ink)`);
    } else {
      for (const p of ["--mode", "--mode-ink", "--accent", "--accent-ink"]) el.style.removeProperty(p);
    }
  }, [level]);
  return null;
}
