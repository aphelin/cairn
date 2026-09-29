"use client";

// The drawn app's own settings: each app's rules, each mode's rules, the
// schedules and the safeguards. They live outside React so a screen reads
// only the slice it shows and re-renders only when that slice changes; the
// dial's mode is the page's, in lib/store.ts.

import { useSyncExternalStore } from "react";
import type { AppId } from "@/components/brand/appGlyphs";
import { APPS } from "@/lib/content";
import {
  APP_RULES,
  DEVICE_RULES,
  DIAL_ROOM,
  MODE_RULES,
  OFF_RULES,
  PLAN,
  UNLOCKS,
  type AppRule,
  type ModeLevel,
  type ModeRule,
  type RoomId,
  type ScheduleId,
  type ThroughId,
} from "@/lib/appDemo";

export type AppState = {
  apps: Record<AppId, AppRule>;
  modes: Record<ModeLevel, ModeRule>;
  off: typeof OFF_RULES;
  schedules: Record<ScheduleId, boolean>;
  lockMode: boolean;
  unlocksLeft: number;
  // When an emergency unlock runs out, or null when none is running.
  pauseEnd: number | null;
  pocket: typeof DEVICE_RULES.pocket;
  home: typeof DEVICE_RULES.home;
};

const INITIAL: AppState = {
  apps: Object.fromEntries(APPS.map((a) => [a.id, APP_RULES[a.id] ?? { modes: a.locked ? [1, 2, 3] : [], limit: null }])) as Record<AppId, AppRule>,
  modes: MODE_RULES,
  off: OFF_RULES,
  schedules: Object.fromEntries(PLAN.map((s) => [s.id, s.on])) as Record<ScheduleId, boolean>,
  lockMode: true,
  unlocksLeft: UNLOCKS.perMonth,
  pauseEnd: null,
  pocket: DEVICE_RULES.pocket,
  home: DEVICE_RULES.home,
};

let state = INITIAL;
const listeners = new Set<() => void>();
let relockTimer = 0;
// The modes an app locked in before its lock was switched off, to bring back.
const lastModes = new Map<AppId, ModeLevel[]>();

function set(next: AppState) {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(INITIAL),
  );
}

export const getApp = () => state;

const patchApp = (id: AppId, patch: Partial<AppRule>) => set({ ...state, apps: { ...state.apps, [id]: { ...state.apps[id], ...patch } } });
const patchMode = (m: ModeLevel, patch: Partial<ModeRule>) => set({ ...state, modes: { ...state.modes, [m]: { ...state.modes[m], ...patch } } });

// The apps a mode locks, in the list's order.
export const lockedIn = (s: AppState, m: ModeLevel) => APPS.filter((a) => s.apps[a.id].modes.includes(m)).map((a) => a.id);
// The apps on Cairn's list at all: those that lock in some mode.
export const onList = (s: AppState) => APPS.filter((a) => s.apps[a.id].modes.length > 0).map((a) => a.id);

export const act = {
  toggleAppMode(id: AppId, m: ModeLevel) {
    const modes = state.apps[id].modes;
    patchApp(id, { modes: modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m].sort() });
  },
  setAppLocked(id: AppId, on: boolean) {
    const modes = state.apps[id].modes;
    if (on === modes.length > 0) return;
    if (!on) lastModes.set(id, modes);
    patchApp(id, { modes: on ? (lastModes.get(id) ?? [1, 2, 3]) : [] });
  },
  setLimit(id: AppId, limit: number | null) {
    patchApp(id, { limit });
  },
  setReach(m: ModeLevel, reach: number) {
    if (state.modes[m].reach !== reach) patchMode(m, { reach });
  },
  // Rooms come and go, but the dial's own room stays in Room, and Home keeps
  // at least one room. Returns false when the change is refused.
  toggleRoom(m: ModeLevel, room: RoomId) {
    const rooms = state.modes[m].rooms;
    const has = rooms.includes(room);
    if (has && ((m === 2 && room === DIAL_ROOM) || rooms.length === 1)) return false;
    patchMode(m, { rooms: has ? rooms.filter((r) => r !== room) : [...rooms, room] });
    return true;
  },
  setThrough(m: ModeLevel, id: ThroughId, on: boolean) {
    patchMode(m, { through: { ...state.modes[m].through, [id]: on } });
  },
  setUnlock(m: ModeLevel, way: "walk" | "pocket", on: boolean) {
    patchMode(m, { [way]: on });
  },
  setOff(key: keyof AppState["off"], on: boolean) {
    set({ ...state, off: { ...state.off, [key]: on } });
  },
  toggleSchedule(id: ScheduleId) {
    set({ ...state, schedules: { ...state.schedules, [id]: !state.schedules[id] } });
  },
  setLockMode(on: boolean) {
    set({ ...state, lockMode: on });
  },
  // An emergency unlock: every locked app opens for a while, then locks again
  // by itself.
  unlock() {
    const end = Date.now() + UNLOCKS.minutes * 60_000;
    set({ ...state, unlocksLeft: Math.max(0, state.unlocksLeft - 1), pauseEnd: end });
    window.clearTimeout(relockTimer);
    relockTimer = window.setTimeout(() => act.relock(), end - Date.now());
  },
  relock() {
    window.clearTimeout(relockTimer);
    set({ ...state, pauseEnd: null });
  },
  setPocket(patch: Partial<AppState["pocket"]>) {
    set({ ...state, pocket: { ...state.pocket, ...patch } });
  },
  setHome(patch: Partial<AppState["home"]>) {
    set({ ...state, home: { ...state.home, ...patch } });
  },
};
