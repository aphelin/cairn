import { BufferAttribute, BufferGeometry, Color, CylinderGeometry, Euler, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { Kit, type Look } from "./kit";
import { ATLAS, type Region } from "./textures";
import { BED_TOP, DESK_TOP, DOOR, ISLAND_TOP, LEAVES, PAL, SEAT_TOP, SHADE, SPINES } from "./plan";

// The furniture, room by room, in the plan's metres. Pieces that sit square
// to the walls are placed in world coordinates; anything turned (chairs, the
// sofa, the door) is built facing +z in its own frame and turned into place.

const wood = (c: string = PAL.oak, extra: Partial<Look> = {}): Look => ({ mat: "wood", c, r: 0.52, ...extra });
const cloth = (c: string, extra: Partial<Look> = {}): Look => ({ mat: "fabric", c, ...extra });
const matte = (c: string, r = 0.62, extra: Partial<Look> = {}): Look => ({ c, r, ...extra });
const metal = (c: string = PAL.black, r = 0.4): Look => ({ c, r, m: 0.85, ao: 0.35 });
const glaze = (c: string): Look => ({ c, r: 0.32 });

export function furnish(k: Kit) {
  bedroom(k);
  study(k);
  kitchen(k);
  living(k);
  hall(k);
}

// ——— Shared pieces ———

function rug(k: Kit, x0: number, x1: number, z0: number, z1: number, region: Region) {
  k.box(x0, x1, 0, 0.012, z0, z1, { mat: "print", c: "#ffffff", region, face: "top", ao: 0 }, 0.006, 1);
}

// Four legs, tapering toward the floor.
function legs(k: Kit, x0: number, x1: number, z0: number, z1: number, h: number, r: number, look: Look, inset = 0.04) {
  for (const x of [x0 + inset, x1 - inset]) for (const z of [z0 + inset, z1 - inset]) k.cyl(x, 0, z, h, r * 0.65, { ...look, ao: 0.45 }, 10, r);
}

function frame(k: Kit, face: number, a: number, b: number, y0: number, y1: number, region: Region, edge: string = PAL.walnutDark) {
  // A picture on a wall that runs along x, hung on its south face: a thin
  // frame, a cream mount and the print.
  const z = (lift: number) => [face, face + lift] as const;
  k.box(a, b, y0, y1, ...z(0.025), wood(edge, { ao: 0 }), 0.004, 1);
  k.box(a + 0.025, b - 0.025, y0 + 0.025, y1 - 0.025, ...z(0.028), matte(PAL.linen, 0.8, { ao: 0 }), 0.002, 1);
  const m = 0.065;
  k.box(a + m, b - m, y0 + m, y1 - m, ...z(0.03), { mat: "print", c: "#ffffff", region, face: "front", ao: 0 }, 0.001, 1);
}

// A table lamp: a turned ceramic base and a lit drum shade.
function tableLamp(k: Kit, x: number, y: number, z: number, base: string, shadeR = 0.13, shadeH = 0.17, scale = 1) {
  const s = scale;
  k.lathe(
    [
      [0.0, 0],
      [0.05 * s, 0],
      [0.07 * s, 0.03 * s],
      [0.082 * s, 0.09 * s],
      [0.072 * s, 0.15 * s],
      [0.034 * s, 0.19 * s],
      [0.016 * s, 0.205 * s],
      [0.0, 0.205 * s],
    ],
    x,
    y,
    z,
    glaze(base),
    26,
  );
  k.cyl(x, y + 0.205 * s, z, 0.02 * s, 0.009, metal(), 8);
  const g = new CylinderGeometry(shadeR * 0.9, shadeR, shadeH, 28, 1, false);
  g.translate(x, y + 0.2 * s + shadeH / 2, z);
  k.glow(g, SHADE, 1);
}

function floorLamp(k: Kit, x: number, z: number, h: number, shadeR: number, shadeH: number) {
  k.cyl(x, 0, z, 0.025, 0.14, metal(PAL.black, 0.45), 28);
  k.cyl(x, 0.025, z, h - 0.025, 0.011, metal(), 10);
  const g = new CylinderGeometry(shadeR * 0.88, shadeR, shadeH, 30, 1, false);
  g.translate(x, h + shadeH / 2 - 0.02, z);
  k.glow(g, SHADE, 1);
}

// A leaf for the instanced foliage: base at the origin, pointing up +y.
function leafAt(k: Kit, p: Vector3, azimuth: number, tilt: number, size: number, width = 1, hex?: string, roll = 0) {
  const m = new Matrix4().compose(p, new Quaternion().setFromEuler(new Euler(tilt, azimuth, roll, "YXZ")), new Vector3(size * width, size, size));
  k.leaf(m, hex ?? LEAVES[Math.floor(k.random() * LEAVES.length)]!);
}

type PlantKind = "fig" | "bush" | "snake" | "trail" | "herb";

function plant(k: Kit, x: number, y: number, z: number, kind: PlantKind, potR: number, potH: number, pot: string, height: number) {
  // The pot, its rim and the soil.
  k.lathe(
    [
      [0, 0],
      [potR * 0.78, 0],
      [potR * 0.82, 0.01],
      [potR, potH * 0.92],
      [potR * 1.04, potH * 0.94],
      [potR * 1.04, potH],
      [potR * 0.94, potH],
      [potR * 0.92, potH * 0.9],
      [0, potH * 0.9],
    ],
    x,
    y,
    z,
    matte(pot, 0.7, { ao: 0.8 }),
    28,
  );
  const soil = y + potH * 0.9 + 0.002;
  const top = new Vector3(x, soil, z);
  const stem = matte(PAL.moss, 0.8);
  if (kind === "fig") {
    k.cyl(x, soil, z, height * 0.62, 0.014, matte(PAL.walnut, 0.8), 8, 0.009);
    for (let i = 0; i < 46; i++) {
      const t = 0.3 + (i / 46) * 0.7;
      const a = i * 2.39996 + k.random() * 0.4;
      const r = 0.05 + Math.sin(t * Math.PI) * height * 0.2;
      const p = new Vector3(x + Math.cos(a) * r * 0.5, soil + t * height * 0.86, z + Math.sin(a) * r * 0.5);
      leafAt(k, p, Math.PI / 2 - a, 0.9 + k.random() * 0.5, 0.16 + k.random() * 0.07, 0.72);
    }
  } else if (kind === "bush") {
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39996;
      const tilt = 0.25 + (i / 26) * 1.0 + k.random() * 0.15;
      const len = height * (0.55 + k.random() * 0.4);
      const p = top.clone().add(new Vector3(Math.cos(a) * 0.02, 0, Math.sin(a) * 0.02));
      // A stem, then the leaf at its end.
      const dir = new Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
      const end = p.clone().addScaledVector(dir, len * 0.55);
      stemTo(k, p, end, 0.005, stem);
      leafAt(k, end, Math.PI / 2 - a, tilt + 0.3, len * 0.55, 0.62);
    }
  } else if (kind === "snake") {
    for (let i = 0; i < 11; i++) {
      const a = i * 2.39996;
      const p = top.clone().add(new Vector3(Math.cos(a) * potR * 0.45, 0, Math.sin(a) * potR * 0.45));
      leafAt(k, p, Math.PI / 2 - a, 0.05 + k.random() * 0.22, height * (0.62 + k.random() * 0.38), 0.2, i % 3 ? "#4f6a3f" : "#65784a", k.random() * 0.6);
    }
  } else if (kind === "trail") {
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39996;
      const out = potR * (0.8 + k.random() * 0.5);
      const drop = k.random() * height;
      const p = new Vector3(x + Math.cos(a) * out, soil + 0.02 - drop, z + Math.sin(a) * out);
      leafAt(k, p, Math.PI / 2 - a, 1.2 + k.random() * 0.8, 0.06 + k.random() * 0.03, 0.8);
    }
  } else {
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996;
      leafAt(k, top.clone().add(new Vector3(Math.cos(a) * 0.015, 0, Math.sin(a) * 0.015)), Math.PI / 2 - a, 0.3 + k.random() * 0.8, height * (0.5 + k.random() * 0.5), 0.5);
    }
  }
}

function stemTo(k: Kit, a: Vector3, b: Vector3, r: number, look: Look) {
  const len = a.distanceTo(b);
  const g = new CylinderGeometry(r, r, len, 5, 1);
  g.translate(0, len / 2, 0);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyMatrix4(new Matrix4().compose(a, q, new Vector3(1, 1, 1)));
  k.add(g, { ...look, ao: 0 });
}

// Curtains: a panel of a few soft, wide folds hanging from just under the
// cut to the floor, along a wall face; `into` is the direction into the
// room. Built facing +z in its own frame, two-sided (the camera sees the
// back of those on the front wall), with the fold valleys a shade darker
// and a slim heading across the top.
function curtain(k: Kit, axis: "x" | "z", face: number, into: 1 | -1, a: number, b: number, look: Look, top = 1.7, bottom = 0.015) {
  const len = b - a;
  const folds = Math.max(2, Math.round(len / 0.11));
  const across = folds * 10;
  const amp = 0.045;
  const back = 0.01;
  // Deeper toward the hem, as cloth hangs.
  const depth = (u: number, v: number) => 0.012 + amp * (0.85 + 0.3 * (1 - v)) * (0.5 - 0.5 * Math.cos(2 * Math.PI * folds * u));
  const pos: number[] = [];
  const idx: number[] = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= 2; j++) {
      const v = j / 2;
      for (let i = 0; i <= across; i++) {
        const u = i / across;
        pos.push(-len / 2 + u * len, bottom + v * (top - bottom), depth(u, v) - (side < 0 ? back : 0));
      }
    }
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < across; i++) {
        const p0 = base + j * (across + 1) + i;
        const p2 = p0 + across + 1;
        if (side > 0) idx.push(p0, p0 + 1, p2, p0 + 1, p2 + 1, p2);
        else idx.push(p0, p2, p0 + 1, p0 + 1, p2, p2 + 1);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const crest = look.c;
  const valley = `#${new Color(look.c).multiplyScalar(0.8).getHexString()}`;
  const panel = () => {
    k.add(g, { ...look, ao: 0.4, grain: "y", tone: (p, n) => (p.z + (n.z < 0 ? back : 0) < 0.012 + amp * 0.4 ? valley : crest) });
    k.box(-len / 2 - 0.005, len / 2 + 0.005, top - 0.03, top + 0.004, 0.004, 0.012 + amp * 1.1, { ...look, ao: 0 }, 0.008, 2);
  };
  const c = (a + b) / 2;
  const off = face + into * 0.006;
  if (axis === "x") k.at(c, off, into > 0 ? 0 : Math.PI, panel);
  else k.at(off, c, into > 0 ? Math.PI / 2 : -Math.PI / 2, panel);
}

function books(k: Kit, x0: number, x1: number, y: number, z0: number, z1: number, maxH: number, along: "x" | "z", depth: [number, number], seed = 0) {
  // Books along a shelf: spines of varied height and colour, with the odd
  // gap, a leaning volume and a flat stack.
  let s = along === "x" ? x0 : z0;
  const end = along === "x" ? x1 : z1;
  let i = seed;
  while (s < end - 0.02) {
    const roll = k.random();
    if (roll < 0.08) {
      s += 0.04 + k.random() * 0.08;
      continue;
    }
    if (roll < 0.14 && end - s > 0.2) {
      // A flat stack of two or three.
      const n = 2 + Math.floor(k.random() * 2);
      const w = 0.2 + k.random() * 0.04;
      const d = depth[0] + k.random() * (depth[1] - depth[0]);
      let hy = y;
      for (let j = 0; j < n; j++) {
        const t = 0.025 + k.random() * 0.02;
        const m = along === "x"
          ? new Matrix4().compose(new Vector3(s + w / 2, hy, z0 + d / 2), new Quaternion(), new Vector3(w, t, d))
          : new Matrix4().compose(new Vector3(x0 + d / 2, hy, s + w / 2), new Quaternion(), new Vector3(d, t, w));
        k.book(m, SPINES[i++ % SPINES.length]!);
        hy += t;
      }
      s += w + 0.01;
      continue;
    }
    const t = 0.018 + k.random() * 0.03;
    const h = Math.min(maxH, 0.17 + k.random() * 0.12);
    const d = depth[0] + k.random() * (depth[1] - depth[0]);
    const lean = roll > 0.93 ? 0.22 : 0;
    const pos = along === "x" ? new Vector3(s + t / 2, y, z0 + d / 2) : new Vector3(x0 + d / 2, y, s + t / 2);
    const q = new Quaternion().setFromEuler(along === "x" ? new Euler(0, 0, -lean) : new Euler(lean, 0, 0));
    const scale = along === "x" ? new Vector3(t, h, d) : new Vector3(d, h, t);
    k.book(new Matrix4().compose(pos, q, scale), SPINES[Math.floor(k.random() * SPINES.length)]!);
    s += t + (lean ? 0.06 : 0.001);
  }
}

// An upholstered seat, built facing +z: a sofa when wide, an armchair when not.
function sofa(k: Kit, W: number, D: number, fabric: string, cushions: number, pillows: string[]) {
  const back = -D / 2;
  const arm = 0.15;
  const f = cloth(fabric);
  legs(k, -W / 2 + 0.02, W / 2 - 0.02, back + 0.02, D / 2 - 0.02, 0.12, 0.022, wood(PAL.walnut), 0.06);
  k.box(-W / 2 + 0.02, W / 2 - 0.02, 0.12, 0.3, back + 0.02, D / 2 - 0.03, f, 0.04);
  for (const s of [-1, 1]) k.box(s < 0 ? -W / 2 : W / 2 - arm, s < 0 ? -W / 2 + arm : W / 2, 0.12, 0.6, back, D / 2, f, 0.07, 3);
  k.box(-W / 2 + arm - 0.02, W / 2 - arm + 0.02, 0.12, 0.74, back, back + 0.2, f, 0.07, 3);
  const inner = W - arm * 2;
  const cw = inner / cushions;
  for (let i = 0; i < cushions; i++) {
    const x0 = -W / 2 + arm + i * cw + 0.004;
    k.box(x0, x0 + cw - 0.008, 0.3, SEAT_TOP, back + 0.2, D / 2 - 0.01, f, 0.06, 3);
    // Back cushions lean into the frame.
    k.with(new Matrix4().makeRotationX(-0.16).setPosition(0, 0.44, back + 0.24), () => {
      k.box(x0, x0 + cw - 0.008, -0.02, 0.36, -0.08, 0.1, f, 0.08, 3);
    });
  }
  pillows.forEach((c, i) => {
    const side = i % 2 ? 1 : -1;
    k.with(new Matrix4().makeRotationFromEuler(new Euler(-0.3, side * 0.35, side * 0.12)).setPosition(side * (W / 2 - arm - 0.22), SEAT_TOP + 0.17, back + 0.33), () => {
      k.box(-0.2, 0.2, -0.19, 0.19, -0.06, 0.06, cloth(c), 0.06, 3);
    });
  });
}

function woodChair(k: Kit, seat: Look, frameWood: string, padded = true) {
  const fw = wood(frameWood);
  legs(k, -0.22, 0.22, -0.21, 0.21, 0.44, 0.02, fw, 0.03);
  k.box(-0.23, 0.23, 0.43, 0.47, -0.22, 0.22, fw, 0.012);
  if (padded) k.box(-0.21, 0.21, 0.47, 0.51, -0.2, 0.2, seat, 0.025, 3);
  for (const x of [-0.19, 0.19]) k.box(x - 0.018, x + 0.018, 0.47, 0.84, -0.215, -0.185, fw, 0.008);
  k.box(-0.22, 0.22, 0.66, 0.82, -0.225, -0.19, fw, 0.02, 3);
}

// ——— Rooms ———

function bedroom(k: Kit) {
  rug(k, -4.45, -1.85, -2.62, -0.92, ATLAS.bedroom);

  // The bed: a walnut frame, a channel-tufted headboard, the duvet turned
  // down, two pillows and a cushion, and a throw folded across the foot.
  const x0 = -4.0;
  const x1 = -2.4;
  const zh = -3.5;
  const zf = -1.42;
  for (const [x, z] of [[x0 + 0.06, zh + 0.16], [x1 - 0.06, zh + 0.16], [x0 + 0.06, zf - 0.06], [x1 - 0.06, zf - 0.06]] as const) k.box(x - 0.03, x + 0.03, 0, 0.1, z - 0.03, z + 0.03, wood(PAL.walnut, { ao: 0.6 }), 0.008);
  k.box(x0, x1, 0.1, 0.3, zh + 0.1, zf, wood(PAL.walnut, { ao: 0.9 }), 0.02);
  k.box(x0 - 0.06, x1 + 0.06, 0.08, 1.04, zh, zh + 0.035, wood(PAL.walnut), 0.012);
  const panels = 7;
  const pw = (x1 - x0 + 0.1) / panels;
  for (let i = 0; i < panels; i++) {
    const a = x0 - 0.05 + i * pw;
    k.box(a + 0.003, a + pw - 0.003, 0.12, 1.06, zh + 0.03, zh + 0.11, cloth(PAL.oat), 0.035, 3);
  }
  k.box(x0 + 0.03, x1 - 0.03, 0.3, 0.52, zh + 0.12, zf - 0.02, cloth(PAL.sheet), 0.06, 3);
  for (const cx of [-3.58, -2.82]) {
    k.with(new Matrix4().makeRotationX(-0.42).setPosition(cx, 0.6, zh + 0.33), () => {
      k.box(-0.31, 0.31, -0.075, 0.075, -0.2, 0.2, cloth(PAL.linen), 0.07, 3);
    });
  }
  k.with(new Matrix4().makeRotationFromEuler(new Euler(-0.3, 0.1, 0)).setPosition(-3.22, 0.66, zh + 0.52), () => {
    k.box(-0.23, 0.23, -0.07, 0.07, -0.16, 0.16, cloth(PAL.rust), 0.06, 3);
  });
  k.box(x0 - 0.012, x1 + 0.012, 0.36, BED_TOP, zh + 0.7, zf + 0.018, cloth(PAL.linen, { ao: 0 }), 0.08, 3);
  k.box(x0 - 0.006, x1 + 0.006, 0.56, BED_TOP + 0.032, zh + 0.6, zh + 0.84, cloth(PAL.linen), 0.05, 3);
  k.box(x0 - 0.03, x1 + 0.03, BED_TOP - 0.004, BED_TOP + 0.022, zf - 0.42, zf - 0.04, cloth(PAL.rust), 0.012);
  for (const s of [-1, 1]) {
    const x = s < 0 ? x0 - 0.042 : x1 + 0.012;
    k.box(x, x + 0.03, 0.32, BED_TOP + 0.02, zf - 0.42, zf - 0.04, cloth(PAL.rust, { ao: 0 }), 0.012);
  }

  // Nightstands, each with a lamp; a book on one, a mug on the other.
  for (const [a, b] of [[-4.55, -4.08], [-2.32, -1.85]] as const) {
    legs(k, a, b, -3.5, -3.1, 0.16, 0.014, metal(), 0.03);
    k.box(a, b, 0.16, 0.52, -3.5, -3.1, wood(PAL.walnut), 0.015);
    k.box(a + 0.02, b - 0.02, 0.19, 0.49, -3.1, -3.088, wood(PAL.walnutDark), 0.006);
    k.cyl((a + b) / 2, 0.37, -3.086, 0.012, 0.012, metal(PAL.steel, 0.3), 10);
    tableLamp(k, (a + b) / 2, 0.52, -3.3, a < -3 ? PAL.ceramic : PAL.pottery);
  }
  k.box(-4.5, -4.3, 0.52, 0.55, -3.22, -3.1, matte(PAL.slate), 0.006);
  k.cyl(-2.0, 0.52, -3.16, 0.09, 0.038, glaze(PAL.cream), 18);

  // The wardrobe on the west wall.
  k.box(-4.9, -4.36, 0, 0.06, -2.08, -0.68, matte(PAL.black, 0.7, { ao: 0.9 }), 0.004);
  k.box(-4.92, -4.34, 0.06, 1.64, -2.1, -0.66, wood(PAL.oakPale), 0.01);
  for (const [a, b] of [[-2.1, -1.382], [-1.378, -0.66]] as const) {
    k.box(-4.34, -4.326, 0.08, 1.62, a + 0.004, b - 0.004, wood(PAL.oakPale, { grain: "y" }), 0.006);
  }
  for (const z of [-1.42, -1.34]) k.cyl(-4.316, 0.78, z, 0.34, 0.008, metal(), 8);

  plant(k, -1.66, 0, -3.26, "bush", 0.15, 0.28, PAL.terracotta, 0.62);
  frame(k, -3.52, -3.62, -3.28, 1.18, 1.64, ATLAS.art1);
  frame(k, -3.52, -3.12, -2.78, 1.18, 1.64, ATLAS.art2);
  curtain(k, "z", -4.92, 1, -3.26, -3.02, cloth(PAL.oat));
  curtain(k, "z", -4.92, 1, -2.38, -2.14, cloth(PAL.oat));
}

function study(k: Kit) {
  rug(k, -0.8, 1.25, -2.72, -1.22, ATLAS.study);

  // The desk under the window, where Cairn Home lives.
  k.box(-0.4, 1.3, DESK_TOP - 0.036, DESK_TOP, -3.5, -2.82, wood(PAL.walnut), 0.01);
  for (const [x, z] of [[-0.35, -3.45], [1.25, -3.45], [-0.35, -2.87], [1.25, -2.87]] as const) k.cyl(x, 0, z, DESK_TOP - 0.036, 0.014, wood(PAL.walnut, { ao: 0.5 }), 10, 0.022);
  k.box(-0.35, 1.25, DESK_TOP - 0.1, DESK_TOP - 0.036, -3.46, -3.43, wood(PAL.walnut), 0.006);
  k.box(0.72, 1.22, DESK_TOP - 0.13, DESK_TOP - 0.036, -3.43, -2.86, wood(PAL.walnut), 0.008);
  k.box(0.74, 1.2, DESK_TOP - 0.12, DESK_TOP - 0.045, -2.86, -2.848, wood(PAL.walnutDark), 0.004);
  // A desk lamp on an arm, a stack of books, a cup of pens, a trailing plant.
  const lx = -0.22;
  const lz = -3.36;
  k.cyl(lx, DESK_TOP, lz, 0.018, 0.07, metal(), 24);
  k.cyl(lx, DESK_TOP + 0.018, lz, 0.4, 0.009, metal(), 8);
  k.bar("z", lz, -3.12, DESK_TOP + 0.41, lx, 0.009, metal());
  const shade = new CylinderGeometry(0.035, 0.085, 0.12, 22, 1);
  shade.translate(lx, DESK_TOP + 0.35, -3.12);
  k.add(shade, metal(PAL.black, 0.45));
  const bulb = new CylinderGeometry(0.078, 0.078, 0.006, 22, 1);
  bulb.translate(lx, DESK_TOP + 0.286, -3.12);
  k.glow(bulb, SHADE, 1.2);
  let y = DESK_TOP;
  for (const [t, c, dx] of [[0.03, PAL.rust, 0], [0.024, PAL.cream, 0.01], [0.028, PAL.slate, -0.012]] as const) {
    k.box(0.02 + dx, 0.26 + dx, y, y + t, -3.46, -3.28, matte(c, 0.7), 0.004);
    y += t;
  }
  k.cyl(0.32, DESK_TOP, -3.4, 0.1, 0.03, glaze(PAL.pottery), 16);
  for (const [dx, dz, c] of [[-0.008, 0.004, PAL.black], [0.01, -0.006, PAL.slate]] as const) k.cyl(0.32 + dx, DESK_TOP + 0.08, -3.4 + dz, 0.07, 0.004, matte(c), 6);
  plant(k, 1.2, DESK_TOP, -3.38, "trail", 0.065, 0.1, PAL.ceramic, 0.25);

  // The chair, pushed back a little.
  k.at(0.92, -2.5, Math.PI - 0.32, () => woodChair(k, cloth(PAL.oat), PAL.oak));

  // Bookshelf on the west wall.
  const bx0 = -1.22;
  const bx1 = -0.9;
  const bz0 = -3.45;
  const bz1 = -2.2;
  const oak = wood(PAL.oak);
  k.box(bx0, bx1, 0, 1.62, bz0, bz0 + 0.025, oak, 0.006);
  k.box(bx0, bx1, 0, 1.62, bz1 - 0.025, bz1, oak, 0.006);
  k.box(bx0, bx0 + 0.015, 0, 1.62, bz0, bz1, wood(PAL.oakPale), 0.003);
  k.box(bx0, bx1, 0, 0.07, bz0, bz1, { ...oak, ao: 0.9 }, 0.004);
  for (const sy of [0.42, 0.78, 1.14, 1.595]) k.box(bx0, bx1, sy, sy + 0.025, bz0, bz1, oak, 0.004);
  [0.07, 0.445, 0.805, 1.165].forEach((sy, i) => books(k, bx0 + 0.02, bx1, sy, bz0 + 0.03, bz1 - 0.03, 0.32, "z", [0.16, 0.24], i * 3));
  plant(k, -1.06, 1.62, -2.5, "trail", 0.06, 0.08, PAL.cream, 0.4);
  k.box(-1.18, -0.94, 1.62, 1.645, -3.3, -3.02, matte(PAL.rust, 0.7), 0.004);

  // A reading chair and its lamp.
  k.at(-0.76, -1.74, 1.75, () => sofa(k, 0.76, 0.76, PAL.olive, 1, [PAL.cream]));
  floorLamp(k, -1.08, -1.08, 1.26, 0.17, 0.24);

  frame(k, -3.52, -0.86, -0.46, 1.02, 1.48, ATLAS.art3);
  // A roman blind, half up, in the window over the desk.
  for (let i = 0; i < 3; i++) k.box(-0.28, 1.18, 1.46 + i * 0.09, 1.56 + i * 0.09, -3.57, -3.52, cloth(PAL.linen, { ao: 0 }), 0.03, 3);
}

function kitchen(k: Kit) {
  const oak = wood(PAL.oak);
  const counter = matte(PAL.counter, 0.28);
  // The fridge, in the corner.
  k.box(1.8, 2.44, 0.02, 1.72, -3.5, -2.86, matte(PAL.fridge, 0.32, { ao: 1 }), 0.035, 3);
  k.box(1.81, 2.43, 1.095, 1.105, -2.868, -2.855, matte(PAL.charcoal, 0.6), 0.003);
  for (const [y0, h] of [[1.18, 0.34], [0.7, 0.3]] as const) k.cyl(2.37, y0, -2.835, h, 0.01, metal(PAL.steel, 0.28), 10);

  // The run along the north wall: oak doors, a quartz top, the sink under
  // the window and a zellige splashback.
  k.box(2.48, 4.9, 0, 0.1, -3.48, -2.99, matte(PAL.black, 0.7, { ao: 1 }), 0.004);
  k.box(2.46, 4.92, 0.1, 0.86, -3.52, -2.95, oak, 0.006);
  const dw = (4.92 - 2.46) / 4;
  for (let i = 0; i < 4; i++) {
    const a = 2.46 + i * dw + 0.003;
    const b = 2.46 + (i + 1) * dw - 0.003;
    if (i === 3) {
      // A bank of drawers.
      [[0.105, 0.39], [0.395, 0.62], [0.625, 0.855]].forEach(([y0, y1]) => {
        k.box(a, b, y0!, y1!, -2.95, -2.932, wood(PAL.oak, { grain: "x" }), 0.006);
        k.bar("x", a + 0.16, b - 0.16, y1! - 0.05, -2.918, 0.007, metal());
      });
    } else {
      k.box(a, b, 0.105, 0.855, -2.95, -2.932, wood(PAL.oak, { grain: "y" }), 0.006);
      k.bar("x", a + 0.18, b - 0.18, 0.79, -2.918, 0.007, metal());
    }
  }
  k.box(2.44, 4.94, 0.86, 0.9, -3.52, -2.9, counter, 0.006);
  k.box(3.08, 3.62, 0.9, 0.903, -3.42, -3.0, metal(PAL.steel, 0.3), 0.004);
  k.box(3.11, 3.59, 0.9, 0.9045, -3.39, -3.03, matte("#5b5955", 0.35, { m: 0.6 }), 0.004);
  k.cyl(3.35, 0.9, -3.44, 0.28, 0.013, metal(PAL.steel, 0.25), 12);
  k.bar("z", -3.44, -3.29, 1.17, 3.35, 0.011, metal(PAL.steel, 0.25));
  k.cyl(3.35, 1.1, -3.3, 0.07, 0.011, metal(PAL.steel, 0.25), 12);
  const splash = { mat: "splash" as const, c: "#ffffff", ao: 0 };
  k.box(2.46, 2.75, 0.9, 1.5, -3.52, -3.51, splash, 0.002, 1);
  k.box(2.75, 3.95, 0.9, 1.05, -3.52, -3.51, splash, 0.002, 1);
  k.box(3.95, 4.92, 0.9, 1.5, -3.52, -3.51, splash, 0.002, 1);
  // An open shelf with jars, and herbs on the sill.
  k.box(4.08, 4.88, 1.52, 1.55, -3.52, -3.3, oak, 0.004);
  [[4.2, 0.12, PAL.ceramic], [4.36, 0.16, PAL.pottery], [4.5, 0.1, PAL.cream]].forEach(([x, h, c]) => k.cyl(x as number, 1.55, -3.41, h as number, 0.045, glaze(c as string), 18));
  plant(k, 4.74, 1.55, -3.41, "trail", 0.055, 0.08, PAL.terracotta, 0.2);
  plant(k, 3.28, 1.05, -3.53, "herb", 0.055, 0.09, PAL.terracotta, 0.16);
  plant(k, 3.56, 1.05, -3.53, "herb", 0.05, 0.08, PAL.ceramic, 0.14);

  // The run along the east wall, with the hob and a kettle.
  k.box(4.38, 4.9, 0, 0.1, -2.92, -1.32, matte(PAL.black, 0.7, { ao: 1 }), 0.004);
  k.box(4.32, 4.92, 0.1, 0.86, -2.94, -1.3, oak, 0.006);
  const ew = (2.94 - 1.3) / 3;
  for (let i = 0; i < 3; i++) {
    const a = -2.94 + i * ew + 0.003;
    const b = -2.94 + (i + 1) * ew - 0.003;
    k.box(4.306, 4.32, 0.105, 0.855, a, b, wood(PAL.oak, { grain: "y" }), 0.006);
    k.bar("z", a + 0.17, b - 0.17, 0.79, 4.296, 0.007, metal());
  }
  k.box(4.26, 4.94, 0.86, 0.9, -2.94, -1.26, counter, 0.006);
  k.box(4.42, 4.84, 0.9, 0.906, -2.5, -1.88, matte("#1a1a1b", 0.14), 0.004);
  for (const [x, z, r] of [[4.53, -2.35, 0.075], [4.74, -2.35, 0.06], [4.53, -2.03, 0.06], [4.74, -2.03, 0.075]] as const) k.cyl(x, 0.906, z, 0.001, r, matte("#3a3a3c", 0.3), 28);
  k.lathe([[0, 0], [0.07, 0], [0.08, 0.04], [0.078, 0.13], [0.05, 0.19], [0.02, 0.2], [0.02, 0.215], [0, 0.215]], 4.62, 0.9, -1.52, glaze(PAL.cream), 22);

  // The island: an oak body with a fluted front toward the room, a
  // quartz top that overhangs for the stools, fruit in a bowl.
  k.box(2.6, 3.9, 0, 0.1, -1.9, -1.36, matte(PAL.black, 0.7, { ao: 1 }), 0.004);
  k.box(2.55, 3.95, 0.1, 0.9, -1.95, -1.32, oak, 0.006);
  for (let x = 2.575; x < 3.94; x += 0.05) k.cyl(x, 0.1, -1.315, 0.8, 0.014, wood(PAL.oak, { grain: "y", ao: 0 }), 8);
  k.box(2.5, 4.0, 0.9, ISLAND_TOP, -1.98, -1.05, counter, 0.008);
  k.lathe([[0, 0], [0.06, 0], [0.12, 0.03], [0.15, 0.08], [0.14, 0.085], [0.11, 0.035], [0, 0.03]], 3.62, ISLAND_TOP, -1.64, glaze(PAL.pottery), 28);
  for (const [dx, dz, c] of [[0.03, 0.02, "#9d9860"], [-0.05, -0.02, "#8a9056"], [0.02, -0.07, "#a7a266"], [-0.02, 0.07, "#978f58"]] as const) {
    const g = new SphereGeometry(0.042, 14, 10);
    g.scale(1, 1.22, 1);
    g.translate(3.62 + dx, ISLAND_TOP + 0.085, -1.64 + dz);
    k.add(g, matte(c, 0.45, { ao: 0 }));
  }
  k.box(3.28, 3.44, ISLAND_TOP, ISLAND_TOP + 0.018, -1.82, -1.44, wood(PAL.oakPale), 0.006);

  // Two stools at the overhang.
  for (const sx of [2.98, 3.58]) {
    k.cyl(sx, 0.62, -0.82, 0.04, 0.18, wood(PAL.oak), 28);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      k.cyl(sx + Math.cos(a) * 0.125, 0, -0.82 + Math.sin(a) * 0.125, 0.62, 0.012, wood(PAL.walnut, { ao: 0.5 }), 8, 0.016);
    }
    const ring = new TorusGeometry(0.13, 0.007, 6, 28);
    ring.rotateX(Math.PI / 2);
    ring.translate(sx, 0.26, -0.82);
    k.add(ring, metal());
  }
}

function living(k: Kit) {
  rug(k, -1.3, 1.65, 0.78, 3.22, ATLAS.living);

  // The sofa faces the television across the rug.
  k.at(1.62, 1.95, -Math.PI / 2, () => sofa(k, 2.1, 0.95, PAL.oat, 3, [PAL.rust, PAL.olive]));
  // A throw over the sofa's arm.
  k.box(1.14, 2.1, 0.58, 0.63, 2.84, 3.02, cloth(PAL.sand), 0.02);
  k.box(1.12, 1.16, 0.3, 0.62, 2.84, 3.02, cloth(PAL.sand, { ao: 0 }), 0.015);

  // The coffee table: a round walnut top with books and a vase.
  k.cyl(0.35, 0.36, 1.95, 0.04, 0.48, wood(PAL.walnut), 40);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    k.cyl(0.35 + Math.cos(a) * 0.34, 0, 1.95 + Math.sin(a) * 0.34, 0.36, 0.016, wood(PAL.walnut, { ao: 0.5 }), 10, 0.024);
  }
  let y = 0.4;
  for (const [t, c] of [[0.035, PAL.cream], [0.028, PAL.charcoal], [0.022, PAL.sand]] as const) {
    k.box(0.02, 0.32, y, y + t, 1.78, 2.0, matte(c, 0.7), 0.004);
    y += t;
  }
  k.lathe([[0, 0], [0.045, 0], [0.07, 0.06], [0.06, 0.16], [0.03, 0.22], [0.034, 0.25], [0, 0.25]], 0.52, 0.4, 2.12, glaze(PAL.pottery), 22);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    const base = new Vector3(0.52, 0.64, 2.12);
    const tip = base.clone().add(new Vector3(Math.cos(a) * 0.12, 0.28 + (i % 2) * 0.08, Math.sin(a) * 0.12));
    stemTo(k, base, tip, 0.004, matte(PAL.walnut, 0.8));
    for (let j = 1; j <= 3; j++) leafAt(k, base.clone().lerp(tip, j / 3.2), Math.PI / 2 - a, 1.1, 0.05, 0.6);
  }
  k.cyl(0.18, 0.4, 2.28, 0.07, 0.035, matte(PAL.linen, 0.8), 16);

  // The reading corner by the window.
  k.at(-1.4, 2.88, 2.5, () => sofa(k, 0.84, 0.82, PAL.rust, 1, [PAL.oat]));

  // The television on a low walnut console, off for the night.
  legs(k, -2.52, -2.1, 1.0, 2.9, 0.14, 0.018, wood(PAL.walnut), 0.05);
  k.box(-2.52, -2.1, 0.14, 0.52, 1.0, 2.9, wood(PAL.walnut), 0.012);
  for (let z = 1.03; z < 2.88; z += 0.034) k.box(-2.1, -2.09, 0.17, 0.49, z, z + 0.022, wood(PAL.walnut, { grain: "y", ao: 0 }), 0.004, 1);
  k.box(-2.48, -2.34, 0.52, 0.54, 1.86, 2.04, metal(PAL.black, 0.4), 0.004);
  k.box(-2.46, -2.44, 0.54, 0.66, 1.93, 1.97, metal(PAL.black, 0.4), 0.003);
  k.box(-2.475, -2.43, 0.64, 1.36, 1.22, 2.68, matte(PAL.black, 0.4), 0.01);
  k.box(-2.43, -2.426, 0.66, 1.34, 1.24, 2.66, matte(PAL.screen, 0.14), 0.002, 1);
  plant(k, -2.3, 0.52, 2.72, "herb", 0.06, 0.1, PAL.ceramic, 0.2);
  k.box(-2.46, -2.2, 0.52, 0.55, 1.08, 1.3, matte(PAL.rust, 0.7), 0.004);

  floorLamp(k, 1.96, 0.58, 1.3, 0.2, 0.26);

  // The sideboard against the study wall, with a lamp and a print above.
  legs(k, 0.1, 1.62, -0.42, 0.02, 0.14, 0.016, wood(PAL.walnut), 0.05);
  k.box(0.1, 1.62, 0.14, 0.72, -0.42, 0.02, wood(PAL.walnut), 0.012);
  const sw = (1.62 - 0.1) / 3;
  for (let i = 0; i < 3; i++) {
    const a = 0.1 + i * sw + 0.004;
    k.box(a, a + sw - 0.008, 0.16, 0.7, 0.02, 0.032, wood(PAL.walnut, { grain: "y" }), 0.005);
    k.cyl(a + (i === 2 ? 0.04 : sw - 0.04), 0.4, 0.038, 0.14, 0.007, metal(), 8);
  }
  tableLamp(k, 1.32, 0.72, -0.2, PAL.pottery, 0.15, 0.2, 1.1);
  k.lathe([[0, 0], [0.05, 0], [0.13, 0.05], [0.14, 0.065], [0.12, 0.06], [0, 0.03]], 0.52, 0.72, -0.2, glaze(PAL.cream), 26);
  k.box(0.78, 1.0, 0.72, 0.75, -0.34, -0.1, matte(PAL.olive, 0.7), 0.004);
  frame(k, -0.42, 0.28, 0.92, 0.96, 1.52, ATLAS.art1);

  // Dinner for four by the kitchen.
  k.cyl(3.62, 0.72, 1.62, 0.04, 0.55, wood(PAL.walnut), 44);
  k.cyl(3.62, 0.03, 1.62, 0.69, 0.05, wood(PAL.walnut), 16, 0.07);
  k.cyl(3.62, 0, 1.62, 0.03, 0.28, wood(PAL.walnut, { ao: 0.8 }), 32);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const cx = 3.62 + Math.cos(a) * 0.66;
    const cz = 1.62 + Math.sin(a) * 0.66;
    k.at(cx, cz, Math.atan2(3.62 - cx, 1.62 - cz) + (i % 2 ? 0.12 : -0.1), () => woodChair(k, cloth(PAL.oat), PAL.oak, false));
  }
  k.lathe([[0, 0], [0.04, 0], [0.05, 0.08], [0.03, 0.16], [0.018, 0.2], [0.024, 0.22], [0, 0.22]], 3.62, 0.76, 1.62, glaze(PAL.terracotta), 20);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6;
    const base = new Vector3(3.62, 0.96, 1.62);
    const tip = base.clone().add(new Vector3(Math.cos(a) * 0.1, 0.22, Math.sin(a) * 0.1));
    stemTo(k, base, tip, 0.003, matte(PAL.walnut, 0.8));
    leafAt(k, tip, Math.PI / 2 - a, 0.6, 0.06, 0.5);
  }

  plant(k, 4.5, 0, 0.15, "fig", 0.2, 0.36, PAL.pottery, 1.28);
  plant(k, -2.22, 0, 0.8, "bush", 0.16, 0.3, PAL.cream, 0.72);

  const drape = cloth(PAL.linen);
  curtain(k, "x", 3.52, -1, -1.7, -1.42, drape);
  curtain(k, "x", 3.52, -1, 3.62, 3.9, drape);
  curtain(k, "z", 4.92, -1, 0.5, 0.76, drape);
  curtain(k, "z", 4.92, -1, 2.64, 2.9, drape);
}

function hall(k: Kit) {
  rug(k, -4.22, -3.32, 0.3, 3.05, ATLAS.runner);
  k.box(-4.88, -4.42, 0, 0.014, 1.58, 2.38, cloth(PAL.sand, { r: 1, ao: 0 }), 0.006, 1);

  // The front door, left a little open, with three panels and a lever.
  k.at(DOOR.hinge[0] + 0.02, DOOR.hinge[1], -DOOR.open, () => {
    k.box(0, 0.05, 0, 1.72, -DOOR.width, 0, wood(PAL.walnut, { grain: "y", ao: 0.5 }), 0.008);
    for (const [y0, y1] of [[0.12, 0.58], [0.68, 1.14], [1.24, 1.66]] as const) k.box(0.05, 0.058, y0, y1, -DOOR.width + 0.12, -0.12, wood(PAL.walnutDark, { grain: "y", ao: 0 }), 0.004);
    k.box(0.05, 0.1, 0.98, 1.0, -DOOR.width + 0.06, -DOOR.width + 0.18, metal(), 0.006);
  });

  // A console with a lamp and a dish for keys, and a round mirror above.
  legs(k, -4.92, -4.62, 0.05, 0.92, 0.76, 0.012, metal(), 0.03);
  k.box(-4.92, -4.62, 0.76, 0.79, 0.05, 0.92, wood(PAL.oak), 0.008);
  k.box(-4.9, -4.64, 0.2, 0.22, 0.08, 0.89, wood(PAL.oak), 0.004);
  tableLamp(k, -4.77, 0.79, 0.28, PAL.ceramic, 0.12, 0.15, 0.9);
  k.lathe([[0, 0], [0.04, 0], [0.09, 0.025], [0.1, 0.035], [0.085, 0.03], [0, 0.015]], -4.77, 0.79, 0.68, glaze(PAL.pottery), 22);
  k.at(-4.915, 0.55, Math.PI / 2, () => {
    const ring = new TorusGeometry(0.255, 0.016, 8, 48);
    ring.translate(0, 1.4, 0.01);
    k.add(ring, wood(PAL.walnut, { ao: 0 }));
    const glass = new CylinderGeometry(0.25, 0.25, 0.008, 48);
    glass.rotateX(Math.PI / 2);
    glass.translate(0, 1.4, 0.008);
    k.add(glass, { c: "#9aa1a6", r: 0.06, m: 1, ao: 0 });
  });

  // The bench by the door, with shoes under it, and coats on hooks.
  legs(k, -4.9, -4.5, 2.62, 3.44, 0.4, 0.016, wood(PAL.oak), 0.04);
  k.box(-4.9, -4.5, 0.4, 0.44, 2.62, 3.44, wood(PAL.oak), 0.008);
  k.box(-4.88, -4.52, 0.44, 0.49, 2.65, 3.41, cloth(PAL.olive), 0.02, 3);
  k.box(-4.88, -4.52, 0.1, 0.12, 2.66, 3.4, wood(PAL.oak), 0.004);
  for (const [z, c] of [[2.74, PAL.charcoal], [2.86, PAL.charcoal], [3.08, PAL.sand], [3.2, PAL.sand]] as const) k.box(-4.84, -4.58, 0.12, 0.2, z, z + 0.09, matte(c, 0.75, { ao: 0 }), 0.03, 3);
  k.box(-4.92, -4.9, 1.5, 1.6, 2.6, 3.46, wood(PAL.oak), 0.004);
  for (const z of [2.72, 2.92, 3.12, 3.32]) k.bar("x", -4.9, -4.84, 1.55, z, 0.009, metal());
  k.box(-4.9, -4.7, 0.76, 1.56, 2.74, 3.0, cloth(PAL.charcoal), 0.07, 3);
  k.box(-4.9, -4.72, 0.86, 1.56, 3.08, 3.34, cloth(PAL.sand), 0.07, 3);

  plant(k, -4.66, 0, -0.2, "snake", 0.14, 0.3, PAL.ceramic, 0.72);
}
