"use client";

import { useStore } from "@/lib/store";
import { Mark } from "./Logo";

// The mark set to wherever the page's dial is, so a mode's colour only shows
// on it while that mode is on.
export function LiveMark({ className, knurl }: { className?: string; knurl?: boolean }) {
  const level = useStore((s) => s.level);
  return <Mark level={level} knurl={knurl} className={className} />;
}
