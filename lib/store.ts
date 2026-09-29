"use client";

import { useSyncExternalStore } from "react";
import type { FinishId, Level } from "./content";

// The few choices that cross sections: the dial's zone (set in the hero, and
// shown by the dial wherever it travels), the finish (picked in the finishes
// section, shown on every device and carried into the pre-order) and the
// order quantities a section can prefill.
type State = { level: Level; finish: FinishId; pocket: number; home: number };

const INITIAL: State = { level: 0, finish: "night", pocket: 0, home: 1 };
let state: State = INITIAL;
const listeners = new Set<() => void>();

export const store = {
  get: () => state,
  set(patch: Partial<State>) {
    const next = { ...state, ...patch };
    if ((Object.keys(patch) as (keyof State)[]).every((k) => next[k] === state[k])) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(state),
    () => select(INITIAL),
  );
}

// Values that change every frame (a drag in progress, the exploded view's
// progress) live here instead, read by the 3D stage without re-rendering React.
export const live = {
  // The crown's angle while someone is dragging it, in detents (0 to 3); null
  // when nobody is.
  drag: null as number | null,
  // The exploded view, 0 (assembled) to 1 (apart).
  explode: 0,
  // How dark the hero has gone behind the dial, 0 (day) to 1 (night).
  night: 0,
};
