// The flat, as a plan: its walls, the points the story needs (the phones,
// the dial, Pocket, the lamps, the walk) and the furniture's palette, in
// metres. x runs west to east, z north to south (toward the camera), y up.
// The floor is at y = 0 and the walls are cut at 70% of a 2.5 m storey.
//
//   z -3.6 ┌──────────┬──────────┬───────────┐
//          │ Bedroom  │  Study   │  Kitchen  │
//   z -0.5 ├───d──┬───┴───d──────┘           │
//          │ Hall │   Living room            │
//   door → │      │                          │
//   z  3.6 └──────┴──────────────────────────┘
//        x -5   -2.6  -1.3      1.7          5
//
// Nothing here imports three.js, so the section can read it without the chunk.

export const WALL_H = 1.75;
export const WALL_T = 0.16;
export const HOUSE = { x0: -5, x1: 5, z0: -3.6, z1: 3.6 };
export const PLINTH = { x0: -5.7, x1: 5.7, z0: -4.3, z1: 4.3, h: 0.26 };

// The study, where the dial lives: Desk and Room stay inside it.
export const STUDY = { x0: -1.3, x1: 1.7, z0: -3.6, z1: -0.5 };
// The kitchen's tiled floor; it opens onto the living room.
export const KITCHEN = { x0: 1.7, x1: 5, z0: -3.6, z1: -0.5 };

// Cairn Home sits on the study desk, under the window.
export const DESK_TOP = 0.76;
export const DIAL = { x: 0.55, y: DESK_TOP, z: -3.1 };

// A wall runs along x (at z) or along z (at x), from `a` to `b`. Openings are
// [from, to, sill]: sill 0 is a doorway, anything higher is a window.
export type Wall = { axis: "x" | "z"; at: number; a: number; b: number; openings?: [number, number, number][] };

export const WALLS: Wall[] = [
  // Outside
  { axis: "x", at: -3.6, a: -5, b: 5, openings: [[-0.3, 1.2, 1.0], [2.75, 3.95, 1.05]] },
  { axis: "x", at: 3.6, a: -5, b: 5, openings: [[-1.7, 3.9, 0.45]] },
  { axis: "z", at: -5, a: -3.6, b: 3.6, openings: [[-3.05, -2.35, 1.0], [1.5, 2.45, 0]] },
  { axis: "z", at: 5, a: -3.6, b: 3.6, openings: [[0.5, 2.9, 0.9]] },
  // Inside
  { axis: "x", at: -0.5, a: -5, b: 1.7, openings: [[-3.6, -2.8, 0], [-0.95, -0.15, 0]] },
  { axis: "z", at: -1.3, a: -3.6, b: -0.5 },
  { axis: "z", at: 1.7, a: -3.6, b: -0.5 },
  { axis: "z", at: -2.6, a: -0.5, b: 3.6, openings: [[-0.42, 0.55, 0]] },
];

export const isOutside = (w: Wall) =>
  w.axis === "x" ? w.at <= HOUSE.z0 || w.at >= HOUSE.z1 : w.at <= HOUSE.x0 || w.at >= HOUSE.x1;

// How far the zone reaches along the floor, walking round walls, for Off,
// Desk and Room. Desk lights the desk and the floor round it, wide enough to
// read clear of the desk phone's pin; Room is past the study's far corner,
// so its light rests against the walls. Home's reach is measured from the
// house itself (the furthest corner, plus a margin).
export const REACH = [0, 1.4, 4.0] as const;

// Warm light: every lamp and the few unseen ceiling lights, as the floor
// sees them. `power` scales the baked pool, `reach` is where it fades out.
// `real` lamps also get a small live light, for sheen on what's near them.
export type Lamp = { at: [number, number, number]; power: number; reach: number; real?: number };
export const LAMPS: Lamp[] = [
  { at: [-4.31, 0.8, -3.3], power: 0.95, reach: 2.6 }, // bedside, left
  { at: [-2.09, 0.8, -3.3], power: 0.95, reach: 2.6 }, // bedside, right
  { at: [-3.2, 1.05, -3.0], power: 0, reach: 0, real: 1.5 }, // the pair, as one live light over the headboard
  { at: [-0.22, 1.02, -3.12], power: 0.85, reach: 2.2, real: 1.1 }, // desk lamp
  { at: [-1.08, 1.38, -1.08], power: 0.7, reach: 2.4 }, // reading lamp in the study
  { at: [1.96, 1.42, 0.58], power: 1.0, reach: 2.9, real: 2.2 }, // living-room floor lamp
  { at: [1.32, 1.02, -0.2], power: 0.8, reach: 2.4, real: 1.2 }, // sideboard lamp
  { at: [-4.76, 1.02, 0.28], power: 0.85, reach: 2.4 }, // hall console lamp
  { at: [3.3, 1.9, -2.2], power: 0.65, reach: 3.2 }, // kitchen, from above
  { at: [3.6, 1.9, 1.65], power: 0.45, reach: 2.2 }, // over the dining table
  { at: [0.6, 1.9, 2.0], power: 0.35, reach: 3.0 }, // living room, from above
  { at: [-3.2, 1.9, -1.8], power: 0.3, reach: 2.4 }, // bedroom, from above
];

// Lamps glow a soft warm white in the evening, closer to paper than to
// candlelight, so lit oak stays oak and never reads as Desk's amber: the
// zone is the only saturated light in the scene.
export const WARM = "#fff0e0";
export const SHADE = "#fff3e6";
export const COOL = "#7d93c4";

// The furniture's palette: warm woods, oat and cream fabrics, olive, walnut
// and a browned rust. None of it sits near a mode colour, even lit by a lamp:
// the woods and the clay are kept low in chroma, so they read as oak, walnut
// and terracotta rather than as Desk's amber.
export const PAL = {
  plaster: "#ece5da",
  poche: "#2d2926",
  skirting: "#f1ebe1",
  oak: "#b9a286",
  oakPale: "#d0c0a8",
  walnut: "#6b4f3b",
  walnutDark: "#49362a",
  oat: "#cdbfa7",
  cream: "#e9e1d3",
  linen: "#efe9de",
  sheet: "#f5f1ea",
  olive: "#6d7250",
  moss: "#5b6147",
  sand: "#b8a586",
  rust: "#7b5140",
  charcoal: "#43403d",
  slate: "#5b6470",
  ceramic: "#e6ddcd",
  pottery: "#9d9385",
  terracotta: "#8d7162",
  black: "#262523",
  steel: "#b7b3ac",
  bronze: "#5e564e",
  counter: "#e8e2d6",
  fridge: "#dfd8c8",
  screen: "#0e0f11",
  plinth: "#2a2e37",
  skin: "#c79c80",
  hair: "#35291f",
  tee: "#d8ccb6",
  trousers: "#56606c",
};

// The leaves and the books' spines: muted, varied, never loud.
export const LEAVES = ["#566842", "#667650", "#4a5a39", "#73805a", "#5f7148"];
export const SPINES = ["#7b5140", "#6d7250", "#cdbfa7", "#3e4854", "#b8a88f", "#57493f", "#7b8889", "#e2dacb", "#43403d", "#9a8166", "#5f6a5a", "#a4876d"];

// The front door's leaf, hinged at the south jamb and left a little open.
export const DOOR = { hinge: [-4.92, 2.45] as [number, number], width: 0.93, open: 0.55 };

// Cairn Pocket, stuck on the hall wall beside the door, facing into the hall.
export const POCKET = { x: -4.92 + 0.02, y: 1.12, z: 1.12 };

export type PhoneId = "bed" | "sofa" | "kitchen" | "desk";

// Where the phones lie: the duvet's top, a sofa cushion, the island, the desk.
export const BED_TOP = 0.62;
export const SEAT_TOP = 0.46;
export const ISLAND_TOP = 0.94;

// Four phones, each buzzing with one of the apps from the first step.
export const PHONES: { id: PhoneId; at: [number, number, number]; turn: number; app: "instagram" | "youtube" | "tiktok" | "x"; where: string; count: number }[] = [
  { id: "bed", at: [-2.92, BED_TOP + 0.002, -2.25], turn: 0.42, app: "instagram", where: "the bed", count: 12 },
  { id: "sofa", at: [1.42, SEAT_TOP + 0.002, 1.72], turn: -0.3, app: "youtube", where: "the sofa", count: 4 },
  { id: "kitchen", at: [3.02, ISLAND_TOP + 0.002, -1.56], turn: 0.18, app: "tiktok", where: "the kitchen counter", count: 9 },
  { id: "desk", at: [1.02, DESK_TOP + 0.002, -3.02], turn: -0.22, app: "x", where: "the desk", count: 7 },
];

// Points the section pins DOM labels to: the four phones, the dial, Pocket
// and the walker's head. The scene reports them in this order.
export const MARKS: string[] = [...PHONES.map((p) => p.id), "dial", "pocket", "figure"];

// About twice life size: small enough to lie on a pillow or beside a fruit
// bowl like a phone, large enough to read at a phone's width (the pins
// mark them anyway).
export const PHONE_SIZE = { w: 0.17, l: 0.34, t: 0.022 };

// The walk: from the bedside, out through the hall, across the living room
// and into the study, to stand at the desk beside the dial.
export const WALK: [number, number][] = [
  [-1.92, -2.3],
  [-1.98, -1.25],
  [-2.72, -0.92],
  [-3.2, -0.52],
  [-3.2, -0.02],
  [-2.78, 0.08],
  [-2.3, 0.08],
  [-1.45, 0.16],
  [-0.82, 0.02],
  [-0.55, -0.5],
  [-0.3, -1.0],
  [0.04, -1.62],
  [0.14, -2.4],
];
