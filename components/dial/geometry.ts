// Procedural geometry for the two devices, in millimetres, base at y = 0.
// Everything is turned (lathe profiles) or cut (the knurl), the way the real
// parts would be made. Small edge breaks are modelled on purpose: machined
// metal reads as machined because its edges catch a thin line of light.

import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  SRGBColorSpace,
  Vector2,
} from "three";

// Cairn Home, the Halo band: 72 across, 48 tall. From the table up: a
// micro-suction pad, a titanium body with a soft fillet at its foot, a band
// of frosted glass that glows in the mode's colour, then the crown that
// turns (a smooth lip, the knurl, and a thick rounded rim holding a white
// ceramic button with an engraved pointer line).
export const HOME = {
  r: 36,
  h: 48,
  band: [15.5, 20] as const, // the frosted glass band
  bandY: 17.75,
  crownY: 20, // where the turning crown starts
  knurl: [23.2, 40.6] as const,
  capY: 46.95, // the ceramic button's edge
  capR: 27.05,
  line: [18.5, 24] as const, // the pointer line, as radii on the ceramic
};
export const POCKET = { r: 28, h: 14, capY: 13.05, capR: 21.1 };

// The four detents, as the dot's angle round the top, clockwise from the back
// (radians). Like any volume knob it turns clockwise to go up: Off sits at half
// past seven, Home at half past four, the same arc the logo's dot travels.
export const DETENTS = [-135, -45, 45, 135].map((d) => (d * Math.PI) / 180);
export const detentAngle = (level: number) => {
  const i = Math.max(0, Math.min(3, level));
  const lo = Math.floor(i);
  const hi = Math.min(3, lo + 1);
  return DETENTS[lo]! + (DETENTS[hi]! - DETENTS[lo]!) * (i - lo);
};

// A profile point: radius, height, and whether it's a polished edge break
// (1) or plain turned metal (0, the default).
type P = [number, number, number?];

// Turned parts. Their UVs run once round (u) and along the profile by arc
// length (v, one unit per 48 mm, starting at the first point's height so no
// two parts share a stretch), which is how a lathe leaves its lines: round
// the walls, and in concentric rings across the flat faces. Each vertex also
// carries its tangent, the direction of the turn, so the metal's anisotropy
// and normal maps have an exact frame everywhere, even on the flat faces
// where a frame taken from the UVs' screen derivatives would fall apart. And
// a `polish` weight: 1 on the edge breaks, which are polished bright.
const lathe = (points: P[], segments = 160) => {
  const g = new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
  const along = [points[0]![1]];
  for (let j = 1; j < points.length; j++) {
    const [r0, y0] = points[j - 1]!;
    const [r1, y1] = points[j]!;
    along.push(along[j - 1]! + Math.hypot(r1 - r0, y1 - y0));
  }
  const uv = g.attributes.uv!;
  const tangent: number[] = [];
  const polish: number[] = [];
  for (let i = 0; i < uv.count; i++) {
    const j = i % points.length;
    const phi = uv.getX(i) * Math.PI * 2;
    uv.setY(i, along[j]! / 48);
    tangent.push(Math.cos(phi), 0, -Math.sin(phi), 1);
    polish.push(points[j]![2] ?? 0);
  }
  g.setAttribute("tangent", new Float32BufferAttribute(tangent, 4));
  g.setAttribute("polish", new Float32BufferAttribute(polish, 1));
  return g;
};

// A straight knurl, `count` ridges round a plain band. The ridges live in the
// knurl maps, one ridge to each unit of u, not in the mesh: cut into the mesh,
// each flat flank caught one light or none, so the ridges lit in clumps, and
// where they crowd together toward the sides they aliased. Mapped, every ridge
// has a rounded profile that finds some light, and the mipmaps average the
// ridges away as they get too fine to draw. Its ends are open, so callers run
// it a little way inside the smooth lips, where the lips' surface hides them.
export function knurlBand(radius: number, y0: number, y1: number, count: number): BufferGeometry {
  const g = new CylinderGeometry(radius, radius, y1 - y0, 192, 1, true).translate(0, (y0 + y1) / 2, 0);
  const uv = g.attributes.uv!;
  const pos = g.attributes.position!;
  const tangent: number[] = [];
  for (let i = 0; i < uv.count; i++) {
    uv.setX(i, uv.getX(i) * count);
    // The direction of the turn, as on the turned parts.
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z) || 1;
    tangent.push(z / r, 0, -x / r, 1);
  }
  g.setAttribute("tangent", new Float32BufferAttribute(tangent, 4));
  g.setAttribute("polish", new Float32BufferAttribute(new Array(uv.count).fill(0), 1));
  return g;
}

// ——— Cairn Home, the dial ———

// A quarter-round fillet as points, from angle a0 to a1 (radians) about a
// centre in (radius, height), for lathe profiles.
const arc = (cr: number, cy: number, rad: number, a0: number, a1: number, steps = 8): [number, number][] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [cr + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  });

// The micro-suction pad: a dark, slightly soft disc stepped out under a
// shadowed neck, so the dial seems to stand on it and hover a little.
export function homePad() {
  return lathe(
    [
      [0, 0],
      [31.6, 0],
      ...arc(31.6, 1.3, 1.3, -Math.PI / 2, Math.PI / 2, 8),
      [29.6, 2.6],
      [29.4, 3.1],
      [29.4, 3.7],
      [0, 3.7],
    ],
    128,
  );
}

// The body: its foot rolls under on a 4 mm fillet, the wall runs plain, and
// a small polished break at the top seats the glass band.
export function homeBody() {
  return lathe([
    [0, 3.6],
    [31, 3.6],
    ...arc(32.4, 7.2, 3.6, -Math.PI / 2, 0, 10),
    [36, 15.05],
    [35.94, 15.3, 1],
    [35.7, 15.45, 1],
    [35.3, 15.5, 1],
  ]);
}

// The light band: frosted glass with softly rounded edges, just proud of
// its seat and a hair inside the metal on either side.
export function lightBand() {
  const [y0, y1] = HOME.band;
  const g = lathe(
    [
      [35.3, y0],
      [35.72, y0 + 0.04],
      [35.9, y0 + 0.25],
      [35.93, y0 + 0.6],
      [35.93, (y0 + y1) / 2],
      [35.93, y1 - 0.6],
      [35.9, y1 - 0.25],
      [35.72, y1 - 0.04],
      [35.3, y1],
    ],
    160,
  );
  // Frosted glass is lighter where the light gathers in its middle and
  // darker at its edges, which gives the band depth even when it's off.
  const pos = g.attributes.position!;
  const colour: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - y0) / (y1 - y0);
    const v = 0.62 + 0.38 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.8);
    colour.push(v, v, v);
  }
  g.setAttribute("color", new Float32BufferAttribute(colour, 3));
  return g;
}

// The light guide behind the glass: a dark core the band is seen against,
// which glows through it when a mode is on.
export function bandCore() {
  const [y0, y1] = HOME.band;
  return new CylinderGeometry(34.9, 34.9, y1 - y0, 160, 1, true).translate(0, (y0 + y1) / 2, 0);
}

// The crown's smooth lip over the band, and its thick top rim: a 3.2 mm
// round over the top edge, a flat ring, and a soft inner edge dropping to the
// ceramic's seat. The lip and the inner edge are polished, so a thin bright
// line runs round the band and round the ceramic.
export function homeCrownRings() {
  const [, y1] = HOME.band;
  const bottom = lathe([
    [35.3, y1, 1],
    [35.75, y1 + 0.05, 1],
    [35.95, y1 + 0.3, 1],
    [36, y1 + 0.7],
    [36, HOME.knurl[0] + 0.5],
  ]);
  const top = lathe([
    [36, HOME.knurl[1] - 0.5],
    [36, 44.3],
    ...arc(32.8, 44.3, 3.2, 0, Math.PI / 2, 12),
    [28.5, 47.5],
    [28.05, 47.44, 1],
    [27.7, 47.28, 1],
    [27.5, 47.02, 1],
    [27.45, 46.6, 1],
    [27.45, 46.2, 1],
    [26.9, 46.2, 1],
  ]);
  return { bottom, top };
}

// Just inside the rim's radius, and running into the lip and the rim, so no
// ridge end ever shows at the joins. 180 ridges: a 1.26 mm pitch, bold
// enough to read at the hero's size.
export function homeKnurl() {
  return knurlBand(35.97, HOME.knurl[0], HOME.knurl[1], 180);
}

// The ceramic button: a flat face that rounds off at its rim, walked from
// the edge up and in to the centre so its face points up.
export function ceramicButton(radius: number, y: number, dome = 0.32) {
  return lathe(
    [
      [radius, y - 0.8],
      [radius, y - 0.25],
      [radius - 0.12, y],
      [radius - 0.45, y + dome * 0.55],
      [radius - 1.2, y + dome * 0.85],
      [radius * 0.6, y + dome],
      [0, y + dome],
    ],
    128,
  );
}

// The pointer: a short engraved line on the ceramic, pointing out from the
// centre toward the back of the dial when it's at zero.
export function pointerLine() {
  const [r0, r1] = HOME.line;
  return new BoxGeometry(0.75, 0.16, r1 - r0).translate(0, HOME.capY + 0.3, -(r0 + r1) / 2);
}

// The glow is a wider band round the light band; its shader fades it vertically.
export function bandGlow(height: number) {
  return new CylinderGeometry(36.7, 36.7, height, 160, 1, true).translate(0, HOME.bandY, 0);
}

// ——— The parts you only see in the exploded view ———

export function detentRing() {
  return lathe(
    [
      [26.5, 0],
      [33.2, 0],
      [33.4, 0.2],
      [33.4, 1.8],
      [33.2, 2],
      [26.5, 2],
      [26.3, 1.8],
      [26.3, 0.2],
      [26.5, 0],
    ],
    96,
  );
}

export function lightGuide() {
  return lathe(
    [
      [31.6, 0],
      [35.1, 0],
      [35.1, 0.9],
      [31.6, 0.9],
      [31.6, 0],
    ],
    128,
  );
}

// A plain short cylinder, standing on y = 0 (the chip on the board).
export function puck(radius: number, h: number) {
  return new CylinderGeometry(radius, radius, h, 48).translate(0, h / 2, 0);
}

export function disc(radius: number) {
  return new CircleGeometry(radius, 64).rotateX(-Math.PI / 2);
}

export function board() {
  return new CylinderGeometry(31, 31, 1.2, 96);
}

export function battery() {
  return lathe(
    [
      [0, 0],
      [11.6, 0],
      [12.1, 0.3],
      [12.25, 0.8],
      [12.25, 6.9],
      [12.05, 7.4],
      [11.5, 7.7],
      [0, 7.7],
    ],
    96,
  );
}

// The board's top: traces, pads and a radio, drawn once.
export function boardTexture(): CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0e1512";
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  ctx.strokeStyle = "rgba(196, 164, 92, 0.55)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 60, cx + Math.sin(a) * 60);
    ctx.lineTo(cx + Math.cos(a) * 150, cx + Math.sin(a) * 150);
    ctx.lineTo(cx + Math.cos(a + 0.18) * 205, cx + Math.sin(a + 0.18) * 205);
    ctx.stroke();
  }
  ctx.fillStyle = "#c9a45e";
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    ctx.fillRect(cx + Math.cos(a) * 222 - 5, cx + Math.sin(a) * 222 - 5, 10, 10);
  }
  // The antenna: a meandering trace near the rim.
  ctx.strokeStyle = "#d4af6a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = -0.9 + (i / 40) * 1.4;
    const r = 176 + (i % 2 ? 12 : -12);
    const x = cx + Math.cos(a) * r;
    const y = cx + Math.sin(a) * r;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ——— Cairn Pocket, the disc ———

// The same family, low: a pad on its back, a titanium body with a soft foot,
// a knurled side and a rounded rim round an inset ceramic face, its inner
// edge polished like Home's.
export function pocketPad() {
  return lathe(
    [
      [0, 0],
      [23.6, 0],
      ...arc(23.6, 0.6, 0.6, -Math.PI / 2, Math.PI / 2, 6),
      [22.4, 1.2],
      [22.4, 1.7],
      [0, 1.7],
    ],
    112,
  );
}

export function pocketRings() {
  const bottom = lathe([
    [0, 1.65],
    [24.2, 1.65],
    ...arc(24.9, 4.75, 3.1, -Math.PI / 2, 0, 8),
    [28, 5.2],
  ]);
  const top = lathe([
    [28, 9.6],
    [28, 11.6],
    ...arc(25.6, 11.6, 2.4, 0, Math.PI / 2, 10),
    [22.4, 14],
    [21.95, 13.93, 1],
    [21.65, 13.72, 1],
    [21.52, 13.4, 1],
    [21.5, 12.6, 1],
    [21, 12.6, 1],
  ]);
  return { bottom, top };
}

export function pocketKnurl() {
  return knurlBand(27.97, 4.6, 10.2, 140);
}

// Soft round textures, drawn once: the contact shadow and the light the seam
// throws on the table at night.
export function radialTexture(stops: [number, string][]): CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function floorDisc(radius: number) {
  return new CircleGeometry(radius, 64).rotateX(-Math.PI / 2);
}
