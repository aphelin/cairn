// All page copy and product data. Cairn is fictional: nothing here ships, and
// the reviews are invented. Kept short on purpose: one idea per screen.

import type { AppId } from "@/components/brand/appGlyphs";

export type ModelId = "home" | "pocket";
export type FinishId = "night" | "silver" | "sage" | "chalk";
export type Level = 0 | 1 | 2 | 3;

export const PRICE = { single: 49, pair: 88 };
export const SHIP_WINDOW = "Ships spring 2027";

export const HERO = {
  title: "Turn your phone down.",
  offer: "A dial for your desk or bedside. Turn it, and the apps you choose stay locked in the room. From $49.",
  lock: { app: "Cairn", title: "Quiet is on", text: "6 apps locked while your phone is home." },
};

// The dial's four detents. The range is how far the quiet reaches.
export const ZONES: { id: string; label: string; range: string; spoken: string; line: string }[] = [
  { id: "off", label: "Off", range: "0 m", spoken: "off", line: "Everything gets through." },
  { id: "desk", label: "Desk", range: "1 m", spoken: "desk, 1 metre", line: "Locked while your phone is on the desk." },
  { id: "room", label: "Room", range: "4 m", spoken: "room, 4 metres", line: "Locked anywhere in the room." },
  { id: "home", label: "Home", range: "12 m", spoken: "home, 12 metres", line: "Locked anywhere at home." },
];

// The noise: real apps, because the pull is real. `level` is the zone that
// sweeps each banner away (Desk takes the nearest, Home takes them all).
// The names and icons belong to their owners; Cairn is not affiliated.
export const NOISE: { app: AppId; text: string; level: Level }[] = [
  { app: "whatsapp", text: "Family: 23 new messages", level: 1 },
  { app: "tiktok", text: "12 new videos from people you follow", level: 2 },
  { app: "instagram", text: "maya.lin and 11 others liked your photo", level: 1 },
  { app: "youtube", text: "A channel you watch is live now", level: 3 },
  { app: "snapchat", text: "You have 4 new Snaps", level: 2 },
  { app: "discord", text: "#general: 47 new messages", level: 1 },
  { app: "netflix", text: "Next episode starts in 5 seconds", level: 3 },
  { app: "reddit", text: "Your comment got 128 upvotes", level: 2 },
  { app: "x", text: "Trending near you: 12.4K posts", level: 3 },
];

export const STATEMENT = "Screen-time limits never last, because one tap turns them off. Cairn puts that tap across the room.";

export const STEPS = [
  { title: "Choose", text: "Pick the apps that pull at you, once, in the app." },
  { title: "Turn", text: "Click the dial to your desk, your room or your home. Or tap Pocket." },
  { title: "Get up", text: "To have them back, walk over and turn it down." },
];

export const MODELS: { id: ModelId; name: string; kind: string; text: string; facts: string[] }[] = [
  {
    id: "home",
    name: "Cairn Home",
    kind: "The dial",
    text: "Guards a room. Turn it to set how far the quiet reaches.",
    facts: ["Bluetooth LE", "Sticks to a desk or a wall", "72 × 48 mm"],
  },
  {
    id: "pocket",
    name: "Cairn Pocket",
    kind: "The disc",
    text: "Stick it anywhere out of reach. Tap your phone on it to lock, and again to unlock.",
    facts: ["NFC, no battery", "Sticks to walls and ceilings", "56 × 14 mm"],
  },
];

// Pocket's own story, told as the page scrolls: the disc, your phone as it
// is, the tap, what's inside, and where it lives. One beat per screen.
export const POCKET_STORY = {
  title: "A tap by the door.",
  lede: "Cairn Pocket. Titanium, 56 mm across.",
  beats: [
    { title: "Your phone, as usual.", text: "" },
    { title: "One tap, and it’s quiet.", text: "The apps you chose stay locked." },
    { title: "No battery.", text: "The tap powers it." },
    { title: "It lives by the door.", text: "Unlocking takes the walk back." },
  ],
};

// The apps the Pocket sections lock: the same four How's first step picks.
export const POCKET_APPS: AppId[] = ["instagram", "tiktok", "youtube", "x"];

// Pocket, to try: tap a phone on it to lock, and again to unlock.
export const POCKET_TRY = {
  title: "Give it a tap.",
  lede: "Drag the phone onto Pocket to lock it. Unlocking means walking back to the door.",
  lock: "Tap to lock",
  unlock: "Tap to unlock",
  locked: "Locked.",
  unlocked: "Unlocked.",
};

// Top to bottom, the way the dial comes apart.
export const PARTS = [
  { name: "Ceramic top", text: "The line shows where it’s set." },
  { name: "Knurled crown", text: "Turned titanium, 180 ridges." },
  { name: "Detent ring", text: "Four clicks you can feel in the dark." },
  { name: "Light band", text: "Frosted glass. Glows in the mode’s colour." },
  { name: "Board and radio", text: "Bluetooth LE. It measures, it doesn’t record." },
  { name: "Battery", text: "About two years. Swap it with a coin." },
  { name: "Micro-suction base", text: "Sticks to glass, wood or a wall. Peels off clean." },
];

export const FINISHES: { id: FinishId; name: string; note: string; hex: string }[] = [
  { id: "night", name: "Graphite", note: "Dark titanium", hex: "#6e6e74" },
  { id: "silver", name: "Natural", note: "Bare titanium", hex: "#bab6af" },
  { id: "sage", name: "Sage", note: "A soft green coat", hex: "#929b8b" },
  { id: "chalk", name: "Chalk", note: "A warm white coat", hex: "#e2dcd1" },
];

// The companion app's demo: the apps it can lock, and whether each is on the list.
export const APPS: { id: AppId; locked: boolean; today: number }[] = [
  { id: "instagram", locked: true, today: 74 },
  { id: "tiktok", locked: true, today: 96 },
  { id: "youtube", locked: true, today: 52 },
  { id: "x", locked: true, today: 31 },
  { id: "reddit", locked: false, today: 18 },
  { id: "snapchat", locked: false, today: 12 },
  { id: "netflix", locked: true, today: 40 },
  { id: "whatsapp", locked: false, today: 22 },
];

export const SCHEDULES = [
  { id: "work", name: "Work hours", time: "9:00 to 17:00", on: true },
  { id: "bed", name: "Bedtime", time: "22:30 to 7:00", on: true },
  { id: "weekend", name: "Weekends", time: "All day", on: false },
];

export const BOX = {
  home: ["The dial", "Battery, fitted", "Start card"],
  pocket: ["The disc", "Spare suction pad", "Start card"],
};

export const SPECS = [
  { label: "Phones", value: "iPhone on iOS 17 or later, Android 12 or later" },
  { label: "App", value: "Free. No subscription, no account." },
  { label: "Unlocks", value: "Three emergency unlocks a month" },
  { label: "Material", value: "Titanium and ceramic" },
];

// true = yes, false = no, string = a qualified answer
export const COMPARE = {
  columns: ["Cairn", "Built-in limits", "Willpower"],
  rows: [
    { label: "Undoing it takes getting up", values: [true, false, false] },
    { label: "Can’t be switched off in one tap", values: [true, false, false] },
    { label: "Works on any app", values: [true, true, "Some days"] },
    { label: "Cost", values: ["$49 once", "Free", "Free, until 1 a.m."] },
  ],
};

export const REVIEWS = [
  { name: "Maya R.", where: "Leeds", text: "I read two books in March. I haven’t done that since school." },
  { name: "Tomás G.", where: "Valencia", text: "The dial sits on my desk, set to Desk. Nine to five, my phone is just a phone again." },
  { name: "Priya S.", where: "Toronto", text: "Getting up to turn it down is exactly enough friction to not bother." },
];

export const FAQ = [
  {
    q: "Will it work with my phone?",
    a: "Any iPhone on iOS 17 or later, and Android 12 or later. Pocket needs NFC, which almost every phone has.",
  },
  {
    q: "What if I really need a locked app?",
    a: "You get three emergency unlocks a month, no walk required. They refill on the first.",
  },
  {
    q: "Can’t I just delete the app?",
    a: "Not while a lock is on. Lock mode stops the app from being removed until you turn the dial down or tap Pocket.",
  },
  {
    q: "What does it know about me?",
    a: "Nothing leaves your phone. The devices hold no data, and the app has no account.",
  },
  {
    q: "When does it ship?",
    a: "Spring 2027. You pay nothing until it ships, and you can return it within 30 days.",
  },
  {
    q: "Is Cairn real?",
    a: "No. It’s a design concept and nothing ships. The problem it solves is real enough.",
  },
];

export const AUTHOR = {
  name: "Aphelin",
  links: [{ label: "GitHub", href: "https://github.com/aphelin" }],
};

export const NAV = [
  { id: "how", label: "How it works" },
  { id: "devices", label: "Home & Pocket" },
  { id: "inside", label: "Inside" },
  { id: "app", label: "App" },
  { id: "faq", label: "FAQ" },
];
