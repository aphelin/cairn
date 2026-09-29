import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  PlaneGeometry,
  SphereGeometry,
  type Vector3,
} from "three";
import { furnish } from "./furniture";
import { instanceReady, Kit, type Look } from "./kit";
import {
  DIAL,
  HOUSE,
  isOutside,
  KITCHEN,
  PAL,
  PHONES,
  PHONE_SIZE,
  PLINTH,
  POCKET,
  WALLS,
  WALL_H,
  WALL_T,
} from "./plan";

// The house, assembled: its shell (plinth, floors, walls, skirting, window
// frames and glass), the furniture, and the story's objects (Cairn Home,
// Cairn Pocket, the phones). Everything that never moves ends up in one
// merged mesh per material.

const plaster: Look = {
  c: PAL.plaster,
  r: 0.9,
  ao: 0,
  // The walls are cut at WALL_H; the cut reads dark, like an architect's poché.
  tone: (p, n) => (n.y > 0.5 && p.y > WALL_H - 0.03 ? PAL.poche : PAL.plaster),
};

export function buildHouse() {
  const k = new Kit();
  const t = WALL_T / 2;

  // The plinth the model stands on, floating in the night.
  k.box(PLINTH.x0, PLINTH.x1, -PLINTH.h, 0, PLINTH.z0, PLINTH.z1, { c: PAL.plinth, r: 0.8, ao: 0 }, 0.035, 3);
  k.box(-5.46, -5.08, 0, 0.05, 1.42, 2.53, { c: "#3b3f47", r: 0.85, ao: 0 }, 0.01);

  // Oak planks everywhere but the kitchen, which is tiled; a walnut strip
  // where the two meet.
  const floor = (x0: number, x1: number, z0: number, z1: number, look: Look) => {
    const g = new PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0.002, (z0 + z1) / 2);
    k.add(g, { ...look, ao: 0, fixed: true });
  };
  floor(HOUSE.x0, HOUSE.x1, -0.5, HOUSE.z1, { mat: "planks", c: "#ffffff" });
  floor(HOUSE.x0, KITCHEN.x0, HOUSE.z0, -0.5, { mat: "planks", c: "#ffffff" });
  floor(KITCHEN.x0, KITCHEN.x1, KITCHEN.z0, KITCHEN.z1, { mat: "tiles", c: "#ffffff" });
  k.box(KITCHEN.x0 + t, KITCHEN.x1 - t, 0.002, 0.006, -0.515, -0.485, { mat: "wood", c: PAL.walnut, ao: 0 }, 0.002, 1);

  // Walls, cut at WALL_H, broken for doorways and dropped to the sill under
  // windows; skirting runs along every face that looks into a room.
  for (const w of WALLS) {
    const outside = isOutside(w);
    const openings = [...(w.openings ?? [])].sort((p, q) => p[0] - q[0]);
    let at = w.a - t;
    const runs: [number, number, number][] = [];
    for (const [from, to, sill] of openings) {
      runs.push([at, from, WALL_H]);
      if (sill > 0) runs.push([from, to, sill]);
      at = to;
    }
    runs.push([at, w.b + t, WALL_H]);
    for (const [a, b, h] of runs) {
      if (b - a < 0.01) continue;
      // Under a window the wall's top is its outside sill: bronze, like the
      // frames, so no pale edge runs along the outside of the house.
      const look = h < WALL_H ? { ...plaster, tone: (p: Vector3, n: Vector3) => (n.y > 0.5 && p.y > h - 0.01 ? PAL.bronze : PAL.plaster) } : plaster;
      if (w.axis === "x") k.box(a, b, 0, h, w.at - t, w.at + t, look, 0.008, 2);
      else k.box(w.at - t, w.at + t, 0, h, a, b, look, 0.008, 2);
    }
    // Skirting on the faces that look into rooms.
    const inward = w.axis === "x" ? (w.at < 0 ? 1 : -1) : w.at < 0 ? 1 : -1;
    const sides = outside ? [inward] : [1, -1];
    let s = w.a - t;
    const spans: [number, number][] = [];
    for (const [from, to, sill] of openings) {
      if (sill > 0) continue;
      spans.push([s, from]);
      s = to;
    }
    spans.push([s, w.b + t]);
    for (const side of sides) {
      const f0 = w.at + side * t;
      const f1 = f0 + side * 0.012;
      for (const [a, b] of spans) {
        if (b - a < 0.02) continue;
        const look: Look = { c: PAL.skirting, r: 0.45, ao: 0 };
        if (w.axis === "x") k.box(a, b, 0, 0.075, Math.min(f0, f1), Math.max(f0, f1), look, 0.003, 1);
        else k.box(Math.min(f0, f1), Math.max(f0, f1), 0, 0.075, a, b, look, 0.003, 1);
      }
    }
    // Windows: a painted sill board inside, slim bronze frames with
    // mullions and a head rail at the cut, and glass.
    for (const [from, to, sill] of openings) {
      if (sill === 0) {
        if (outside) {
          if (w.axis === "x") k.box(from, to, 0, 0.012, w.at - t, w.at + t, { mat: "wood", c: PAL.walnut, ao: 0 }, 0.003, 1);
          else k.box(w.at - t, w.at + t, 0, 0.012, from, to, { mat: "wood", c: PAL.walnut, ao: 0 }, 0.003, 1);
        }
        continue;
      }
      const depth = 0.03;
      // The board runs from the frame into the room, and no further out.
      const lip = w.at + inward * (t + 0.04);
      const back = w.at + inward * depth;
      const sillLook: Look = { c: PAL.skirting, r: 0.4, ao: 0 };
      if (w.axis === "x") k.box(from - 0.04, to + 0.04, sill, sill + 0.028, Math.min(back, lip), Math.max(back, lip), sillLook, 0.006);
      else k.box(Math.min(back, lip), Math.max(back, lip), sill, sill + 0.028, from - 0.04, to + 0.04, sillLook, 0.006);
      const frameLook: Look = { c: PAL.bronze, r: 0.5, m: 0.25, ao: 0 };
      const put = (a: number, b: number, y0: number, y1: number) => {
        if (w.axis === "x") k.box(a, b, y0, y1, w.at - depth, w.at + depth, frameLook, 0.004, 1);
        else k.box(w.at - depth, w.at + depth, y0, y1, a, b, frameLook, 0.004, 1);
      };
      const len = to - from;
      const panes = Math.max(1, Math.round(len / 1.5));
      const pw = len / panes;
      const head = WALL_H - 0.045;
      put(from, to, sill + 0.028, sill + 0.07);
      put(from, to, head, WALL_H);
      for (let i = 0; i <= panes; i++) {
        const x = from + i * pw;
        const half = i === 0 || i === panes ? 0.035 : 0.014;
        put(Math.max(from, x - half), Math.min(to, x + half), sill + 0.028, WALL_H);
      }
      const gh = head - sill - 0.07;
      const glass = w.axis === "x" ? new BoxGeometry(len, gh, 0.008) : new BoxGeometry(0.008, gh, len);
      glass.translate(w.axis === "x" ? (from + to) / 2 : w.at, sill + 0.07 + gh / 2, w.axis === "x" ? w.at : (from + to) / 2);
      k.pane(glass, sill + 0.07, head);
    }
  }

  furnish(k);

  // Cairn Pocket on the hall wall: a graphite disc with a ceramic face.
  const disc = new CylinderGeometry(0.105, 0.108, 0.05, 44, 1);
  disc.rotateZ(-Math.PI / 2);
  disc.translate(POCKET.x + 0.025, POCKET.y, POCKET.z);
  k.add(disc, { c: "#26262a", r: 0.42, m: 0.3, ao: 0 });
  const face = new CylinderGeometry(0.088, 0.088, 0.008, 44, 1);
  face.rotateZ(-Math.PI / 2);
  face.translate(POCKET.x + 0.052, POCKET.y, POCKET.z);
  k.add(face, { c: "#f1efea", r: 0.35, ao: 0 });

  // Cairn Home's body on the desk; its crown turns, so it's built apart. Like
  // the phones it's drawn larger than life, a little more so, as the hero.
  k.cyl(DIAL.x, DIAL.y, DIAL.z, 0.107, 0.14, { c: "#232327", r: 0.4, m: 0.35, ao: 0 }, 48);

  // The phones' bodies. Their screens are separate, so they can change.
  for (const p of PHONES) {
    k.at(p.at[0], p.at[2], p.turn, () => {
      k.box(-PHONE_SIZE.w / 2, PHONE_SIZE.w / 2, 0, PHONE_SIZE.t, -PHONE_SIZE.l / 2, PHONE_SIZE.l / 2, { c: "#1d1d21", r: 0.3, m: 0.4, ao: 0 }, 0.01, 2);
    }, p.at[1]);
  }

  return k;
}

// One leaf, for the instanced foliage: 1 long from its base at the origin up
// +y, folded along the midrib and arching back.
export function buildLeaf() {
  const along = 9;
  const across = 4;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= along; i++) {
    const s = i / along;
    const half = 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.06)), 0.75) * (1 - 0.25 * s);
    for (let j = 0; j <= across; j++) {
      const w = (j / across) * 2 - 1;
      pos.push(w * half * 0.46, s, Math.abs(w) * half * 0.14 - s * s * 0.14);
    }
  }
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j;
      const b = a + across + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return instanceReady(g, 0.62);
}

// A book: a unit box standing on its base.
export function buildBook() {
  const g = new BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return instanceReady(g, 0.72);
}

function solo(fn: (k: Kit) => void) {
  const k = new Kit();
  fn(k);
  return k.merged().out.get("plain")!;
}

// The dial's crown and ceramic top, with the indicator dot. It turns about
// its own axis, so it's built around the origin and placed by the scene.
export function buildCrown() {
  return solo((k) => {
    k.cyl(0, 0.115, 0, 0.059, 0.14, { c: "#232327", r: 0.38, m: 0.4, ao: 0 }, 48);
    k.cyl(0, 0.174, 0, 0.007, 0.126, { c: "#f1efea", r: 0.3, ao: 0 }, 48);
    k.cyl(0.082, 0.181, 0, 0.004, 0.016, { c: "#232327", r: 0.4, ao: 0 }, 16);
  });
}

// The seam between crown and body, which glows in the mode's colour.
export function buildSeam() {
  const g = new CylinderGeometry(0.1415, 0.1415, 0.009, 48, 1, true);
  g.translate(0, 0.111, 0);
  return g;
}

// The person who gets out of bed: a body, and legs and arms that swing from
// the hip and the shoulder. Each limb is built hanging from its pivot.
export function buildFigure() {
  const body = solo((k) => {
    const torso = new CapsuleGeometry(0.155, 0.34, 6, 16);
    torso.scale(1, 1, 0.66);
    torso.translate(0, 1.14, 0);
    k.add(torso, { c: PAL.tee, r: 0.9, ao: 0 });
    const hips = new CapsuleGeometry(0.15, 0.04, 6, 16);
    hips.scale(1, 1, 0.7);
    hips.translate(0, 0.9, 0);
    k.add(hips, { c: PAL.trousers, r: 0.9, ao: 0 });
    k.cyl(0, 1.4, 0, 0.09, 0.045, { c: PAL.skin, r: 0.7, ao: 0 }, 12);
    const head = new SphereGeometry(0.1, 20, 14);
    head.scale(0.92, 1.08, 1);
    head.translate(0, 1.565, 0.005);
    k.add(head, { c: PAL.skin, r: 0.7, ao: 0 });
    const hair = new SphereGeometry(0.106, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
    hair.scale(0.94, 1.05, 1.02);
    hair.rotateX(-0.35);
    hair.translate(0, 1.585, -0.012);
    k.add(hair, { c: PAL.hair, r: 0.8, ao: 0 });
  });
  const leg = solo((k) => {
    const g = new CapsuleGeometry(0.066, 0.7, 6, 12);
    g.translate(0, -0.42, 0);
    k.add(g, { c: PAL.trousers, r: 0.9, ao: 0 });
    k.box(-0.05, 0.05, -0.86, -0.8, -0.05, 0.12, { c: PAL.oat, r: 0.9, ao: 0 }, 0.03, 2);
  });
  const arm = solo((k) => {
    const g = new CapsuleGeometry(0.043, 0.52, 6, 12);
    g.translate(0, -0.3, 0);
    k.add(g, { c: PAL.skin, r: 0.75, ao: 0, tone: (p) => (p.y > -0.2 ? PAL.tee : PAL.skin) });
  });
  return { body, leg, arm, hip: { x: 0.085, y: 0.86 }, shoulder: { x: 0.2, y: 1.34 }, height: 1.7 };
}

export function buildScreen() {
  const g = new PlaneGeometry(PHONE_SIZE.w - 0.02, PHONE_SIZE.l - 0.03);
  g.rotateX(-Math.PI / 2);
  return g;
}

// A flat ribbon along the walk, carrying its length for the dashes.
export function buildPath(points: { x: number; z: number }[], width = 0.075) {
  const n = points.length;
  const pos = new Float32Array(n * 2 * 3);
  const s = new Float32Array(n * 2);
  const side = new Float32Array(n * 2);
  const idx: number[] = [];
  let len = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(n - 1, i + 1)]!;
    let dx = b.x - a.x;
    let dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    if (i > 0) len += Math.hypot(p.x - points[i - 1]!.x, p.z - points[i - 1]!.z);
    for (let k = 0; k < 2; k++) {
      const sgn = k === 0 ? -1 : 1;
      pos.set([p.x - dz * width * sgn, 0.02, p.z + dx * width * sgn], (i * 2 + k) * 3);
      s[i * 2 + k] = len;
      side[i * 2 + k] = sgn;
    }
    if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aS", new BufferAttribute(s, 1));
  g.setAttribute("aSide", new BufferAttribute(side, 1));
  g.setIndex(idx);
  return { geometry: g, length: len };
}

