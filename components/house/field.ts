import { DataTexture, DataUtils, HalfFloatType, LinearFilter, RGBAFormat, UnsignedByteType } from "three";
import type { Foot } from "./kit";
import { DIAL, HOUSE, LAMPS, PLINTH, STUDY, WALLS, WALL_T, isOutside, type Wall } from "./plan";

// Light that stays inside the walls. Everything here is baked once, on a
// 5 cm grid over the house, into a half-float texture the shaders read by
// world x and z:
//
//   r  how far each spot is from the dial, walking round walls (metres)
//   g  the same, inside the study only; far everywhere else
//   b  warm lamplight on the floor, blocked by walls, spilling a little
//      through doorways
//   a  cool evening light through the windows
//
// Distances are exact shortest paths on the plan: a spot the dial can see
// is a straight line away; any other is reached round the doorway jambs.
// So the zone floods a room as a true circle, bends round a jamb into the
// next, and never passes through a wall. Wall cells take the distance of
// the room beside them, so a wall's cut top lights with its room.

export const FIELD_RECT = { x: HOUSE.x0 - 0.4, z: HOUSE.z0 - 0.4, w: HOUSE.x1 - HOUSE.x0 + 0.8, d: HOUSE.z1 - HOUSE.z0 + 0.8 };
const PX = 20; // cells per metre
export const FAR = 99;

type Box = { x0: number; x1: number; z0: number; z1: number };

// A wall's solid pieces on the plan. Windows block at floor level; doorways
// pass only where `doors` is set.
function pieces(w: Wall, doors: boolean): Box[] {
  const t = WALL_T / 2;
  const span = (a: number, b: number): Box => (w.axis === "x" ? { x0: a, x1: b, z0: w.at - t, z1: w.at + t } : { x0: w.at - t, x1: w.at + t, z0: a, z1: b });
  const out: Box[] = [];
  let at = w.a - t;
  const gaps = (w.openings ?? []).filter(([, , sill]) => doors && sill === 0).sort((p, q) => p[0] - q[0]);
  for (const [from, to] of gaps) {
    out.push(span(at, from));
    at = to;
  }
  out.push(span(at, w.b + t));
  return out.filter((b) => b.x1 - b.x0 > 1e-3 && b.z1 - b.z0 > 1e-3);
}

// The outside walls hold everything in, front door included; inside walls
// let light through their doorways.
const SOLID = WALLS.flatMap((w) => pieces(w, !isOutside(w)));
// Only inside walls can stand between two points in the house.
const BLOCKERS = WALLS.filter((w) => !isOutside(w)).flatMap((w) => pieces(w, true));

// Whether the segment a→b passes through a box (touching doesn't count).
function hits(ax: number, az: number, bx: number, bz: number, b: Box) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  if (Math.abs(dx) < 1e-9) {
    if (ax <= b.x0 || ax >= b.x1) return false;
  } else {
    let u0 = (b.x0 - ax) / dx;
    let u1 = (b.x1 - ax) / dx;
    if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0);
    t1 = Math.min(t1, u1);
    if (t0 >= t1) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (az <= b.z0 || az >= b.z1) return false;
  } else {
    let u0 = (b.z0 - az) / dz;
    let u1 = (b.z1 - az) / dz;
    if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0);
    t1 = Math.min(t1, u1);
    if (t0 >= t1) return false;
  }
  return true;
}

const sees = (ax: number, az: number, bx: number, bz: number) => !BLOCKERS.some((b) => hits(ax, az, bx, bz, b));
const inBox = (x: number, z: number, b: Box) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;

// The grid: 0 outside, 1 a floor cell, 2 inside a wall.
const W = Math.round(FIELD_RECT.w * PX);
const H = Math.round(FIELD_RECT.d * PX);
const cx = (i: number) => FIELD_RECT.x + (i + 0.5) / PX;
const cz = (j: number) => FIELD_RECT.z + (j + 0.5) / PX;

function classify() {
  const cells = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = cx(i);
      const z = cz(j);
      if (SOLID.some((b) => inBox(x, z, b))) cells[j * W + i] = 2;
      else if (x > HOUSE.x0 && x < HOUSE.x1 && z > HOUSE.z0 && z < HOUSE.z1) cells[j * W + i] = 1;
    }
  }
  return cells;
}

// The jambs and ends of the inside walls, stepped just clear of them: the
// only places a shortest path can bend.
function corners(cells: Uint8Array) {
  const eps = 0.025;
  const out: [number, number][] = [];
  for (const b of BLOCKERS) {
    for (const [x, sx] of [[b.x0, -1], [b.x1, 1]] as const) {
      for (const [z, sz] of [[b.z0, -1], [b.z1, 1]] as const) {
        const px = x + sx * eps;
        const pz = z + sz * eps;
        const i = Math.floor((px - FIELD_RECT.x) * PX);
        const j = Math.floor((pz - FIELD_RECT.z) * PX);
        if (i >= 0 && j >= 0 && i < W && j < H && cells[j * W + i] === 1 && !SOLID.some((s) => inBox(px, pz, s))) out.push([px, pz]);
      }
    }
  }
  return out;
}

// Shortest walking distance from (sx, sz) to every floor cell, and whether
// the source sees it directly. Cells further than `limit` in a straight
// line are left unreached.
function geodesic(sx: number, sz: number, cells: Uint8Array, bends: [number, number][], limit = Infinity) {
  const nodes: [number, number][] = [[sx, sz], ...bends];
  const n = nodes.length;
  const dn = new Float64Array(n).fill(Infinity);
  const done = new Uint8Array(n);
  dn[0] = 0;
  for (let step = 0; step < n; step++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!done[v] && (u < 0 || dn[v]! < dn[u]!)) u = v;
    if (u < 0 || dn[u] === Infinity) break;
    done[u] = 1;
    const [ux, uz] = nodes[u]!;
    for (let v = 0; v < n; v++) {
      if (done[v]) continue;
      const [vx, vz] = nodes[v]!;
      const c = dn[u]! + Math.hypot(vx - ux, vz - uz);
      if (c < dn[v]! && sees(ux, uz, vx, vz)) dn[v] = c;
    }
  }
  const order = [...Array(n - 1).keys()].map((k) => k + 1).filter((k) => dn[k]! < Infinity).sort((a, b) => dn[a]! - dn[b]!);
  const dist = new Float32Array(W * H).fill(Infinity);
  const direct = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (cells[k] !== 1) continue;
      const x = cx(i);
      const z = cz(j);
      const straight = Math.hypot(x - sx, z - sz);
      if (straight > limit) continue;
      if (sees(sx, sz, x, z)) {
        dist[k] = straight;
        direct[k] = 1;
        continue;
      }
      let best = Infinity;
      for (const m of order) {
        const d0 = dn[m]!;
        if (d0 >= best) break;
        const [mx, mz] = nodes[m]!;
        const c = d0 + Math.hypot(x - mx, z - mz);
        if (c < best && sees(mx, mz, x, z)) best = c;
      }
      dist[k] = best;
    }
  }
  return { dist, direct };
}

// Wall cells take the nearest floor's value, so a wall's cut top reads the
// room beside it.
function dilate(src: Float32Array, cells: Uint8Array, reach = 3) {
  const out = src.slice();
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (cells[j * W + i] !== 2) continue;
      let best = Infinity;
      for (let dj = -reach; dj <= reach; dj++) {
        const jj = j + dj;
        if (jj < 0 || jj >= H) continue;
        for (let di = -reach; di <= reach; di++) {
          const ii = i + di;
          if (ii < 0 || ii >= W || cells[jj * W + ii] !== 1) continue;
          best = Math.min(best, src[jj * W + ii]!);
        }
      }
      out[j * W + i] = best;
    }
  }
  return out;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// What the bake makes, as plain arrays, so it can be made in a worker.
export type FieldData = {
  data: Uint16Array;
  all: Float32Array;
  study: Float32Array;
  furthest: number;
  studyFurthest: number;
  threshold: number;
};

export type Field = {
  texture: DataTexture;
  // The dial's distances at a point, as the shader reads them.
  sample: (x: number, z: number) => { all: number; study: number };
  // The furthest floor from the dial, the furthest in the study, and the
  // nearest floor outside the study (just past its threshold).
  furthest: number;
  studyFurthest: number;
  threshold: number;
};

export function bakeField(): FieldData {
  const cells = classify();
  const bends = corners(cells);

  const zone = geodesic(DIAL.x, DIAL.z, cells, bends);
  const all = zone.dist;
  const study = new Float32Array(W * H).fill(Infinity);
  let furthest = 0;
  let studyFurthest = 0;
  let threshold = Infinity;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (cells[k] !== 1) continue;
      const x = cx(i);
      const z = cz(j);
      const inside = x > STUDY.x0 && x < STUDY.x1 && z > STUDY.z0 && z < STUDY.z1;
      if (inside) {
        study[k] = all[k]!;
        studyFurthest = Math.max(studyFurthest, all[k]!);
      } else threshold = Math.min(threshold, all[k]!);
      if (all[k]! < Infinity) furthest = Math.max(furthest, all[k]!);
    }
  }
  const allD = dilate(all, cells);
  const studyD = dilate(study, cells);

  // Lamplight: each lamp lights what it can see, and a little of what's
  // round a jamb from it, falling off quickly, so each reads as a pool.
  const warm = new Float32Array(W * H);
  for (const l of LAMPS) {
    if (!l.power) continue;
    const g = geodesic(l.at[0], l.at[2], cells, bends, l.reach);
    for (let k = 0; k < W * H; k++) {
      const d = g.dist[k]!;
      if (d === Infinity) continue;
      const f = (1 / (1 + (d / 0.7) ** 2)) * (1 - smoothstep(l.reach * 0.5, l.reach, d));
      warm[k] = warm[k]! + l.power * f * (g.direct[k] ? 1 : 0.4);
    }
  }

  // Evening light through each window, falling inward and fading.
  const cool = new Float32Array(W * H);
  const t = WALL_T / 2;
  for (const w of WALLS) {
    if (!isOutside(w)) continue;
    const inward = w.axis === "x" ? (w.at < 0 ? 1 : -1) : w.at < 0 ? 1 : -1;
    for (const [from, to, sill] of w.openings ?? []) {
      if (sill === 0) continue;
      const mid = (from + to) / 2;
      const half = (to - from) / 2;
      const ox = w.axis === "x" ? mid : w.at + inward * (t + 0.05);
      const oz = w.axis === "x" ? w.at + inward * (t + 0.05) : mid;
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const k = j * W + i;
          if (cells[k] !== 1) continue;
          const x = cx(i);
          const z = cz(j);
          const along = (w.axis === "x" ? z - oz : x - ox) * inward;
          if (along < 0 || along > 3) continue;
          const lat = Math.abs(w.axis === "x" ? x - ox : z - oz);
          const f = Math.exp(-along / 1.1) * (1 - smoothstep(half - 0.05 + along * 0.25, half + 0.35 + along * 0.45, lat));
          if (f > 0.01 && sees(ox, oz, x, z)) cool[k] = Math.min(1, cool[k]! + f * (sill < 0.6 ? 0.8 : 0.6));
        }
      }
    }
  }

  const data = new Uint16Array(W * H * 4);
  const h = DataUtils.toHalfFloat;
  for (let k = 0; k < W * H; k++) {
    data[k * 4] = h(clampD(allD[k]!));
    data[k * 4 + 1] = h(clampD(studyD[k]!));
    data[k * 4 + 2] = h(Math.min(1.6, warm[k]!));
    data[k * 4 + 3] = h(cool[k]!);
  }
  for (let k = 0; k < W * H; k++) {
    allD[k] = clampD(allD[k]!);
    studyD[k] = clampD(studyD[k]!);
  }
  return { data, all: allD, study: studyD, furthest, studyFurthest, threshold };
}

const clampD = (d: number) => (d === Infinity ? FAR : Math.min(FAR, d));

// The baked field as the scene uses it: a texture for the shaders, and the
// same distances read on the CPU, for the phones.
export function fieldFrom(f: FieldData): Field {
  const texture = new DataTexture(f.data, W, H, RGBAFormat, HalfFloatType);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.flipY = false;
  texture.needsUpdate = true;

  const read = (buf: Float32Array, x: number, z: number) => {
    const fx = (x - FIELD_RECT.x) * PX - 0.5;
    const fz = (z - FIELD_RECT.z) * PX - 0.5;
    const i = Math.max(0, Math.min(W - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(H - 2, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - i));
    const v = Math.min(1, Math.max(0, fz - j));
    const at = (ii: number, jj: number) => buf[jj * W + ii]!;
    return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
  };

  return {
    texture,
    sample: (x, z) => ({ all: read(f.all, x, z), study: read(f.study, x, z) }),
    furthest: f.furthest,
    studyFurthest: f.studyFurthest,
    threshold: f.threshold,
  };
}

// Baked shade. Red darkens the floor where walls and furniture meet it;
// green darkens the ground round the plinth. Built on a small grid, blurred,
// and read in the shader by world x and z.
export const AO_RECT = { x: -8, z: -6.4, w: 16, d: 12.8 };
const AO_PX = 22;

export type AOData = { data: Uint8Array; w: number; h: number };

export function bakeAO(feet: Foot[]): AOData {
  const AW = Math.round(AO_RECT.w * AO_PX);
  const AH = Math.round(AO_RECT.d * AO_PX);
  const floor = new Float32Array(AW * AH);
  const ground = new Float32Array(AW * AH);
  const fill = (buf: Float32Array, x0: number, x1: number, z0: number, z1: number, v: number) => {
    const i0 = Math.max(0, Math.floor((x0 - AO_RECT.x) * AO_PX));
    const i1 = Math.min(AW - 1, Math.ceil((x1 - AO_RECT.x) * AO_PX));
    const j0 = Math.max(0, Math.floor((z0 - AO_RECT.z) * AO_PX));
    const j1 = Math.min(AH - 1, Math.ceil((z1 - AO_RECT.z) * AO_PX));
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) buf[j * AW + i] = Math.max(buf[j * AW + i]!, v);
  };
  // Window sills still meet the floor, so only doorways are left clear.
  for (const w of WALLS) for (const b of pieces(w, true)) fill(floor, b.x0, b.x1, b.z0, b.z1, 1);
  for (const w of WALLS) {
    for (const [from, to, sill] of w.openings ?? []) {
      if (sill === 0) continue;
      const t = WALL_T / 2;
      if (w.axis === "x") fill(floor, from, to, w.at - t, w.at + t, 1);
      else fill(floor, w.at - t, w.at + t, from, to, 1);
    }
  }
  for (const f of feet) fill(floor, f.x0, f.x1, f.z0, f.z1, f.ao);
  fill(ground, PLINTH.x0, PLINTH.x1, PLINTH.z0, PLINTH.z1, 1);

  const tight = blur(floor, AW, AH, 2);
  const wide = blur(floor, AW, AH, 7);
  const gTight = blur(ground, AW, AH, 3);
  const gWide = blur(ground, AW, AH, 16);
  const data = new Uint8Array(AW * AH * 4);
  for (let i = 0; i < AW * AH; i++) {
    const f = Math.min(1, tight[i]! * 0.5 + wide[i]! * 0.34);
    const g = Math.min(1, gTight[i]! * 0.5 + gWide[i]! * 0.42);
    data[i * 4] = Math.round(f * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 3] = 255;
  }
  return { data, w: AW, h: AH };
}

export function aoTexture(ao: AOData) {
  const tex = new DataTexture(ao.data, ao.w, ao.h, RGBAFormat, UnsignedByteType);
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

// Three box blurs make a near-Gaussian.
function blur(src: Float32Array, w: number, h: number, r: number) {
  let a = src.slice();
  let b = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < h; j++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += a[j * w + Math.min(w - 1, Math.max(0, i))]!;
      for (let i = 0; i < w; i++) {
        b[j * w + i] = acc / (2 * r + 1);
        acc += a[j * w + Math.min(w - 1, i + r + 1)]! - a[j * w + Math.max(0, i - r)]!;
      }
    }
    [a, b] = [b, a];
    for (let i = 0; i < w; i++) {
      let acc = 0;
      for (let j = -r; j <= r; j++) acc += a[Math.min(h - 1, Math.max(0, j)) * w + i]!;
      for (let j = 0; j < h; j++) {
        b[j * w + i] = acc / (2 * r + 1);
        acc += a[Math.min(h - 1, j + r + 1) * w + i]! - a[Math.max(0, j - r) * w + i]!;
      }
    }
    [a, b] = [b, a];
  }
  return a;
}
