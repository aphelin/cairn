// All page copy and product data. Cairn is fictional: nothing here ships, and
// the reviews are invented. Kept short on purpose: one idea per screen.

export type ModelId = "pocket" | "home";
export type ColourId = "chalk" | "granite" | "basalt" | "ochre";

export const PRICE = { single: 49, pair: 88 };
export const SHIP_WINDOW = "Ships spring 2027";

export const HERO = {
  title: ["An off switch,", "set in stone."],
  offer: "Tap your phone on Cairn and the apps you choose stay locked until you walk back. From $49.",
  quiet: "Locked until you walk back to the stone.",
};

// The noise. Invented apps, so no real product is named.
export const NOISE = [
  { app: "Group chat", text: "23 new messages", tone: "green" },
  { app: "Reels", text: "40 new videos for you", tone: "red" },
  { app: "Mail", text: "3 unread from work", tone: "blue" },
  { app: "News", text: "Breaking: you won't believe this", tone: "red" },
  { app: "Shop", text: "Your cart misses you", tone: "yellow" },
  { app: "Chirp", text: "12 people liked your post", tone: "blue" },
  { app: "Stream", text: "Next episode in 5 seconds", tone: "red" },
  { app: "Game", text: "Your lives are full", tone: "green" },
  { app: "Calendar", text: "Standup moved again", tone: "yellow" },
] as const;

export const STEPS = [
  { title: "Choose", text: "Pick the apps that pull at you.", time: "In the app" },
  { title: "Tap", text: "Hold your phone to the stone. They lock.", time: "One second" },
  { title: "Walk back", text: "To unlock them, come back and tap again.", time: "However far" },
];

export const MODELS: {
  id: ModelId;
  name: string;
  verb: string;
  text: string;
  facts: string[];
}[] = [
  {
    id: "pocket",
    name: "Cairn Pocket",
    verb: "Tap to lock",
    text: "Leave it by the door or on your desk. Locking and unlocking both take a walk to the stone.",
    facts: ["NFC", "No battery", "58 × 42 × 24 mm"],
  },
  {
    id: "home",
    name: "Cairn Home",
    verb: "Guards a room",
    text: "Your apps stay locked while your phone is in range, however many times you pick it up.",
    facts: ["Bluetooth LE", "2-year battery, replaceable", "72 × 60 × 34 mm"],
  },
];

export const COLOURS: { id: ColourId; name: string; found: string; hex: string }[] = [
  { id: "chalk", name: "Chalk", found: "Seven Sisters cliffs", hex: "#e9e4d8" },
  { id: "granite", name: "Granite", found: "Cairngorms", hex: "#8f8a82" },
  { id: "basalt", name: "Basalt", found: "Reynisfjara", hex: "#34332f" },
  { id: "ochre", name: "Ochre", found: "Roussillon", hex: "#c4863d" },
];

// The companion app's demo. Invented apps again.
export const APPS = [
  { id: "chirp", name: "Chirp", glyph: "chirp", locked: true },
  { id: "reels", name: "Reels", glyph: "reels", locked: true },
  { id: "chat", name: "Group chat", glyph: "chat", locked: false },
  { id: "news", name: "News", glyph: "news", locked: true },
  { id: "shop", name: "Shop", glyph: "shop", locked: false },
  { id: "stream", name: "Stream", glyph: "stream", locked: true },
  { id: "mail", name: "Mail", glyph: "mail", locked: false },
  { id: "game", name: "Game", glyph: "game", locked: false },
  { id: "maps", name: "Maps", glyph: "maps", locked: false },
] as const;

export const SCHEDULES = [
  { id: "work", name: "Work hours", time: "9:00 to 17:00", on: true },
  { id: "bed", name: "Bedtime", time: "22:30 to 7:00", on: true },
  { id: "weekend", name: "Weekends", time: "All day", on: false },
];

export const BOX = {
  pocket: ["Cairn Pocket", "Linen pouch", "Start card"],
  home: ["Cairn Home", "Battery, fitted", "Wall plate and screws", "Start card"],
};

export const SPECS = [
  { label: "Phones", value: "iPhone on iOS 17 or later, Android 12 or later" },
  { label: "App", value: "Free. No subscription, no account." },
  { label: "Unlocks", value: "Three emergency unlocks a month" },
  { label: "Material", value: "Cast stone composite, matte sealed" },
];

// true = yes, false = no, string = a qualified answer
export const COMPARE = {
  columns: ["Cairn", "Built-in limits", "Willpower"],
  rows: [
    { label: "Unlocking takes getting up", values: [true, false, false] },
    { label: "Can't be switched off in one tap", values: [true, false, false] },
    { label: "Works on any app", values: [true, true, "Some days"] },
    { label: "Cost", values: ["$49 once", "Free", "Free, until 1 a.m."] },
  ],
};

export const REVIEWS = [
  { name: "Maya R.", where: "Leeds", text: "I read two books in March. I haven't done that since school." },
  { name: "Tomás G.", where: "Valencia", text: "The Home stone lives on my desk. Nine to five, my phone is just a phone again." },
  { name: "Priya S.", where: "Toronto", text: "Walking to the hallway to unlock Chirp is exactly enough friction to not bother." },
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
    q: "Can't I just delete the app?",
    a: "Not while a lock is on. Lock mode stops the app from being removed until you tap the stone.",
  },
  {
    q: "What does it know about me?",
    a: "Nothing leaves your phone. The stone holds no data, and the app has no account.",
  },
  {
    q: "When does it ship?",
    a: "Spring 2027. You pay nothing until it ships, and you can return it within 30 days.",
  },
  {
    q: "Is Cairn real?",
    a: "No. It's a design concept and nothing ships. The problem it solves is real enough.",
  },
];

export const AUTHOR = {
  name: "Aphelin",
  links: [{ label: "GitHub", href: "https://github.com/aphelin" }],
};

// The signpost: section, label, and the plate's colour on arrival.
export const ROUTE = [
  { id: "how", label: "How it works" },
  { id: "stones", label: "The stones" },
  { id: "app", label: "The app" },
  { id: "preorder", label: "Pre-order" },
];
