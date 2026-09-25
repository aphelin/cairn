"use client";

import { useSyncExternalStore } from "react";
import type { ColourId } from "./content";

// The few choices that cross sections: the stone's colour (picked in the
// colours section, shown on every stone and carried into the pre-order) and
// the order quantities a section can prefill.
type State = { colour: ColourId; pocket: number; home: number };

const INITIAL: State = { colour: "granite", pocket: 1, home: 0 };
let state: State = INITIAL;
const listeners = new Set<() => void>();

export const store = {
  get: () => state,
  set(patch: Partial<State>) {
    state = { ...state, ...patch };
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
