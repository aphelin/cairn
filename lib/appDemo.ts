// Demo data for the companion app drawn in the app section. Cairn is
// fictional, and so are these numbers: one Friday evening in one person's week.
// The apps and their minutes today come from APPS in lib/content.ts.

import type { AppId } from "@/components/brand/appGlyphs";
import type { Level } from "@/lib/content";

export type TabId = "today" | "modes" | "apps" | "schedules" | "insights";

export const TABS: { id: TabId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "modes", label: "Modes" },
  { id: "apps", label: "Apps" },
  { id: "schedules", label: "Schedules" },
  { id: "insights", label: "Insights" },
];

// The phone's clock: a Friday evening, so bedtime is next.
export const CLOCK = "21:40";
export const NOW = 21 * 60 + 40; // minutes since midnight
export const TODAY = 4; // Monday is 0

export const DAYS = [
  { short: "Mon", long: "Monday" },
  { short: "Tue", long: "Tuesday" },
  { short: "Wed", long: "Wednesday" },
  { short: "Thu", long: "Thursday" },
  { short: "Fri", long: "Friday" },
  { short: "Sat", long: "Saturday" },
  { short: "Sun", long: "Sunday" },
];

// Minutes each app's lock has given back today, counted while it was locked.
export const SAVED_TODAY: Partial<Record<AppId, number>> = {
  instagram: 24,
  tiktok: 31,
  youtube: 14,
  x: 9,
  reddit: 7,
  snapchat: 5,
  netflix: 11,
  whatsapp: 6,
};

// Any app can have its own daily limit, in 15-minute steps. It holds with
// the dial off too: at the limit the app locks until midnight.
export const LIMIT = { initial: 30, min: 15, max: 180, step: 15 };

// The three modes that lock something. Off (0) locks nothing by itself.
export type ModeLevel = 1 | 2 | 3;
export const MODE_LEVELS: ModeLevel[] = [1, 2, 3];
export const MODE_NAMES = ["off", "desk", "room", "home"] as const;

// Each app's own rules: the modes it locks in (none means it's allowed) and
// its daily limit in minutes (null for none).
export type AppRule = { modes: ModeLevel[]; limit: number | null };
export const APP_RULES: Partial<Record<AppId, AppRule>> = {
  instagram: { modes: [1, 2, 3], limit: null },
  tiktok: { modes: [1, 2, 3], limit: null },
  youtube: { modes: [1, 2], limit: 60 },
  x: { modes: [1, 2, 3], limit: null },
  netflix: { modes: [2, 3], limit: null },
  reddit: { modes: [], limit: 30 },
  snapchat: { modes: [], limit: 15 },
  whatsapp: { modes: [], limit: null },
};

// The flat the dial guards: the same five rooms as the house in How it
// works (components/house/plan.ts), in metres. x runs west to east, z north
// to south. The dial sits on the study desk, under the window.
export type RoomId = "bedroom" | "study" | "kitchen" | "hall" | "living";
export const FLAT = { x0: -5, x1: 5, z0: -3.6, z1: 3.6 };
export const ROOMS: { id: RoomId; name: string; x0: number; x1: number; z0: number; z1: number }[] = [
  { id: "bedroom", name: "Bedroom", x0: -5, x1: -1.3, z0: -3.6, z1: -0.5 },
  { id: "study", name: "Study", x0: -1.3, x1: 1.7, z0: -3.6, z1: -0.5 },
  { id: "kitchen", name: "Kitchen", x0: 1.7, x1: 5, z0: -3.6, z1: -0.5 },
  { id: "hall", name: "Hall", x0: -5, x1: -2.6, z0: -0.5, z1: 3.6 },
  { id: "living", name: "Living room", x0: -2.6, x1: 5, z0: -0.5, z1: 3.6 },
];
export const DIAL_ROOM: RoomId = "study";
export const DIAL_AT = { x: 0.55, z: -3.1 };
// The study desk the dial sits on, its chair, and the phone lying on it
// (the same phone as in the house, turned a little).
export const DESK = { x0: -0.35, x1: 1.45, z0: -3.6, z1: -2.95 };
export const CHAIR = { x: 0.45, z: -2.55, r: 0.26 };
export const DESK_PHONE = { x: 1.05, z: -3.2, turn: -13 };

// How far each mode can reach, in metres, and where it starts.
export const REACH: Record<ModeLevel, { min: number; max: number; step: number }> = {
  1: { min: 0.5, max: 2, step: 0.25 },
  2: { min: 2, max: 8, step: 0.5 },
  3: { min: 6, max: 20, step: 1 },
};

// What still gets through while a mode is on.
export type ThroughId = "calls" | "messages" | "alarms" | "maps";
export const THROUGH: { id: ThroughId; name: string }[] = [
  { id: "calls", name: "Calls from favourites" },
  { id: "messages", name: "Messages from favourites" },
  { id: "alarms", name: "Alarms and timers" },
  { id: "maps", name: "Maps" },
];

// A mode's own rules. Turning the dial down always unlocks; walking out of
// the zone and tapping Pocket can too.
export type ModeRule = { reach: number; rooms: RoomId[]; through: Record<ThroughId, boolean>; walk: boolean; pocket: boolean };
export const MODE_RULES: Record<ModeLevel, ModeRule> = {
  1: { reach: 1, rooms: [], through: { calls: true, messages: true, alarms: true, maps: false }, walk: true, pocket: false },
  2: { reach: 4, rooms: ["study"], through: { calls: true, messages: false, alarms: true, maps: false }, walk: true, pocket: false },
  3: { reach: 12, rooms: ["bedroom", "study", "kitchen", "hall", "living"], through: { calls: true, messages: true, alarms: true, maps: true }, walk: true, pocket: true },
};

// With the dial off, nothing locks by the dial, but these still can.
export const OFF_RULES = { limits: true, schedules: true };

// The two devices' own settings: the mode a tap on Pocket turns on for your
// phone, and whether Home's band glows.
export const DEVICE_RULES = { pocket: { mode: 3 as ModeLevel, again: true }, home: { light: true } };

// "1 m", "0.75 m", "12 m".
export const metres = (m: number) => `${Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, "")}\u00a0m`;
export const spokenMetres = (m: number) => `${Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, "")} metre${m === 1 ? "" : "s"}`;

// "Study", "Study and hall", "Study and 2 more rooms", "Every room".
export function roomLine(rooms: RoomId[]) {
  if (rooms.length === ROOMS.length) return "Every room";
  if (!rooms.length) return "No rooms";
  const names = ROOMS.filter((r) => rooms.includes(r.id)).map((r, i) => (i ? r.name.toLowerCase() : r.name));
  if (names.length <= 2) return names.join(" and ");
  return `${names[0]} and ${names.length - 1} more rooms`;
}

// "Desk, Room and Home", "Room", "Not locked".
export function modesLine(modes: ModeLevel[]) {
  const names = [...modes].sort().map((m) => ["Off", "Desk", "Room", "Home"][m]!);
  if (!names.length) return "Not locked";
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Schedules turn a mode on by the clock. Times are minutes since midnight;
// an end before its start runs past midnight.
export type ScheduleId = "work" | "bed" | "weekend";
export const PLAN: { id: ScheduleId; name: string; when: string; days: number[]; start: number; end: number; level: Level; on: boolean }[] = [
  { id: "work", name: "Work hours", when: "Weekdays, 9:00 to 17:00", days: [0, 1, 2, 3, 4], start: 9 * 60, end: 17 * 60, level: 1, on: true },
  { id: "bed", name: "Bedtime", when: "Every night, 22:30 to 7:00", days: [0, 1, 2, 3, 4, 5, 6], start: 22 * 60 + 30, end: 7 * 60, level: 3, on: true },
  { id: "weekend", name: "Weekends", when: "Saturday and Sunday, all day", days: [5, 6], start: 0, end: 24 * 60, level: 2, on: false },
];

// Screen time a day, in minutes. This week runs to today (Friday, so far).
export const WEEK: { now: (number | null)[]; last: number[] } = {
  now: [132, 118, 141, 96, 104, null, null],
  last: [188, 172, 205, 164, 190, 236, 214],
};

// The apps that took the most time this week, in minutes.
export const MOST_USED: { id: AppId; minutes: number }[] = [
  { id: "tiktok", minutes: 192 },
  { id: "instagram", minutes: 158 },
  { id: "youtube", minutes: 111 },
  { id: "whatsapp", minutes: 82 },
];

// Nights the bedtime lock held, oldest first; the last is last night.
export const NIGHTS = [true, false, true, true, true, true, true, true, true, true, true, true, true, true];
export const BEST_STREAK = 19;

export const DEVICES = {
  home: { name: "Cairn Home", place: "On the desk", battery: 87 },
  pocket: { name: "Cairn Pocket", place: "On the hallway wall" },
};

export const UNLOCKS = { perMonth: 3, minutes: 15, refill: "1 October" };

// "1h 27m", "45m", "0m".
export function hm(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}m`;
  return r ? `${h}h ${r}m` : `${h}h`;
}

// The same, for screen readers: "1 hour 27 minutes".
export function spoken(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (r || !h) parts.push(`${r} minute${r === 1 ? "" : "s"}`);
  return parts.join(" ");
}

// "22:30" from minutes since midnight.
export const clock = (minutes: number) => `${Math.floor(minutes / 60) % 24}:${String(minutes % 60).padStart(2, "0")}`;

// The current streak: nights kept, counting back from last night.
export function streak(nights: boolean[]) {
  let n = 0;
  for (let i = nights.length - 1; i >= 0 && nights[i]; i--) n++;
  return n;
}
