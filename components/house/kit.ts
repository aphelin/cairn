import {
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { seeded, type Region } from "./textures";

// The kit the house is built with. Every part is added in the current local
// frame (a spot on the floor and a turn), takes its texture coordinates from
// that frame so wood grain follows the piece, and lands in the pile for its
// material. At the end each pile is merged into one mesh: the whole static
// house is a handful of draw calls.

export type Mat = "plain" | "wood" | "fabric" | "planks" | "tiles" | "splash" | "print";

export type Look = {
  mat?: Mat;
  // Colour, as sRGB hex. Textured materials multiply their map by it.
  c: string;
  // Roughness and metalness, per part.
  r?: number;
  m?: number;
  // The local axis the grain or weave runs along; the longest by default.
  grain?: "x" | "y" | "z";
  // Metres per repeat of the material's texture.
  span?: number;
  // A picture from the print atlas, laid over the part's top or front.
  region?: Region;
  face?: "top" | "front";
  // How dark a contact shadow it leaves on the floor (0 for none).
  ao?: number;
  // Per-vertex colour, by local position and normal.
  tone?: (p: Vector3, n: Vector3) => string;
  // Keep the texture where the world puts it (floors that must line up).
  fixed?: boolean;
};

const ROUGH: Record<Mat, number> = { plain: 0.6, wood: 0.55, fabric: 0.95, planks: 1, tiles: 1, splash: 0.2, print: 0.95 };
const SPAN: Record<Mat, number> = { plain: 1, wood: 0.9, fabric: 0.32, planks: 2.56, tiles: 1.2, splash: 0.8, print: 1 };

export type Foot = { x0: number; x1: number; z0: number; z1: number; ao: number };
export type Instance = { m: Matrix4; c: Color };

const colours = new Map<string, Color>();
export const lin = (hex: string) => {
  let c = colours.get(hex);
  if (!c) colours.set(hex, (c = new Color(hex)));
  return c;
};

export class Kit {
  readonly piles = new Map<Mat, BufferGeometry[]>();
  readonly glows: BufferGeometry[] = [];
  readonly panes: BufferGeometry[] = [];
  readonly leaves: Instance[] = [];
  readonly books: Instance[] = [];
  readonly feet: Foot[] = [];
  private frames: Matrix4[] = [new Matrix4()];
  private rnd = seeded(97);

  // Build what follows `fn` in a frame at (x, z), turned by `turn` about y
  // (a turn of 0 leaves the local front, +z, facing south).
  at(x: number, z: number, turn: number, fn: () => void, y = 0) {
    const m = new Matrix4().makeRotationY(turn).setPosition(x, y, z);
    this.frames.push(this.top().clone().multiply(m));
    fn();
    this.frames.pop();
  }

  // A frame from any matrix: a tilt, a lean.
  with(m: Matrix4, fn: () => void) {
    this.frames.push(this.top().clone().multiply(m));
    fn();
    this.frames.pop();
  }

  private top() {
    return this.frames[this.frames.length - 1]!;
  }

  // Any geometry, in the current frame.
  add(g: BufferGeometry, look: Look) {
    const mat = look.mat ?? "plain";
    prepare(g);
    uvs(g, look, mat, this.rnd);
    paint(g, look, mat);
    g.applyMatrix4(this.top());
    this.foot(g, look);
    let pile = this.piles.get(mat);
    if (!pile) this.piles.set(mat, (pile = []));
    pile.push(g);
    return g;
  }

  // A box from its extents, with softened edges.
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, look: Look, radius = 0.012, segments = 2) {
    return this.add(block(x0, x1, y0, y1, z0, z1, radius, segments), look);
  }

  // A cylinder standing on (x, y, z); `top` tapers it.
  cyl(x: number, y: number, z: number, h: number, r: number, look: Look, radial = 20, top = r) {
    const g = new CylinderGeometry(top, r, h, radial, 1);
    g.translate(x, y + h / 2, z);
    return this.add(g, look);
  }

  // A turned profile of [radius, height] pairs, standing on (x, y, z).
  lathe(profile: [number, number][], x: number, y: number, z: number, look: Look, segments = 28) {
    const g = new LatheGeometry(
      profile.map(([r, h]) => new Vector2(r, h)),
      segments,
    );
    g.translate(x, y, z);
    return this.add(g, look);
  }

  // A cylinder laid along x or z, for rails, rods and bars.
  bar(axis: "x" | "z", a: number, b: number, y: number, at: number, r: number, look: Look, radial = 10) {
    const g = new CylinderGeometry(r, r, Math.abs(b - a), radial, 1);
    if (axis === "x") {
      g.rotateZ(Math.PI / 2);
      g.translate((a + b) / 2, y, at);
    } else {
      g.rotateX(Math.PI / 2);
      g.translate(at, y, (a + b) / 2);
    }
    return this.add(g, look);
  }

  // Lamp shades and anything else that gives light: drawn unlit, warm.
  glow(g: BufferGeometry, hex: string, k = 1) {
    prepare(g);
    const c = lin(hex).clone().multiplyScalar(k);
    const pos = g.getAttribute("position");
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new BufferAttribute(col, 3));
    g.deleteAttribute("uv");
    g.applyMatrix4(this.top());
    this.glows.push(g);
  }

  // Window glass, deepening from a pale top to a darker foot between y0
  // and y1, like the night reflected in it.
  pane(g: BufferGeometry, y0: number, y1: number) {
    prepare(g);
    g.deleteAttribute("uv");
    g.applyMatrix4(this.top());
    const pos = g.getAttribute("position");
    const col = new Float32Array(pos.count * 3);
    const foot = lin("#5d6d84");
    const head = lin("#cfd9e6");
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      c.lerpColors(foot, head, Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0))));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new BufferAttribute(col, 3));
    this.panes.push(g);
  }

  leaf(m: Matrix4, hex: string) {
    this.leaves.push({ m: this.top().clone().multiply(m), c: lin(hex) });
  }

  book(m: Matrix4, hex: string) {
    this.books.push({ m: this.top().clone().multiply(m), c: lin(hex) });
  }

  random() {
    return this.rnd();
  }

  private foot(g: BufferGeometry, look: Look) {
    if (look.ao === 0) return;
    g.computeBoundingBox();
    const b = g.boundingBox as Box3;
    if (b.min.y > 0.03 || b.max.y - b.min.y < 0.025) return;
    this.feet.push({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, ao: look.ao ?? 0.75 });
  }

  // One geometry per material, and the lit and glass parts.
  merged() {
    const out = new Map<Mat, BufferGeometry>();
    for (const [mat, pile] of this.piles) {
      out.set(mat, mergeGeometries(pile, false)!);
      pile.forEach((g) => g.dispose());
    }
    const glow = this.glows.length ? mergeGeometries(this.glows, false) : null;
    const glass = this.panes.length ? mergeGeometries(this.panes, false) : null;
    this.glows.forEach((g) => g.dispose());
    this.panes.forEach((g) => g.dispose());
    return { out, glow, glass };
  }
}

// A box from extents, rounded where there's room for it. Every vertex of a
// rounded box is a corner of its inner box plus a fixed direction times the
// radius, and those directions depend only on the segment count. So each
// count's directions are worked out once, from one small rounded box, and
// every box after that is a few multiplications per vertex.
type Template = { sign: Float32Array; normal: Float32Array; index: ArrayLike<number> };
const templates = new Map<number, Template>();

function template(segments: number) {
  let t = templates.get(segments);
  if (!t) {
    const raw = new RoundedBoxGeometry(1, 1, 1, segments, 0.1);
    raw.deleteAttribute("uv");
    const g = mergeVertices(raw, 1e-5);
    raw.dispose();
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const sign = new Float32Array(p.count * 3);
    const normal = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      for (let a = 0; a < 3; a++) {
        const na = n.getComponent(i, a);
        normal[i * 3 + a] = na;
        sign[i * 3 + a] = Math.sign(p.getComponent(i, a) - na * 0.1);
      }
    }
    t = { sign, normal, index: g.index!.array };
    templates.set(segments, t);
    g.dispose();
  }
  return t;
}

export function block(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, radius = 0.012, segments = 2) {
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  const d = Math.abs(z1 - z0);
  const r = Math.min(radius, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const cz = (z0 + z1) / 2;
  if (r < 0.002) {
    const g = new BoxGeometry(w, h, d);
    g.translate(cx, cy, cz);
    return g;
  }
  const t = template(segments);
  const n = t.sign.length / 3;
  const pos = new Float32Array(n * 3);
  const half = [w / 2 - r, h / 2 - r, d / 2 - r];
  const centre = [cx, cy, cz];
  for (let i = 0; i < n * 3; i++) pos[i] = centre[i % 3]! + half[i % 3]! * t.sign[i]! + t.normal[i]! * r;
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("normal", new BufferAttribute(t.normal.slice(), 3));
  const index = n > 65535 ? new Uint32Array(t.index) : new Uint16Array(t.index);
  g.setIndex(new BufferAttribute(index, 1));
  return g;
}

// A geometry as plain arrays, to cross from a worker, and back.
export type Packed = { attributes: Record<string, { array: Float32Array; size: number }>; index: Uint16Array | Uint32Array | null };

export function pack(g: BufferGeometry): Packed {
  const attributes: Packed["attributes"] = {};
  for (const [name, a] of Object.entries(g.attributes)) attributes[name] = { array: a.array as Float32Array, size: a.itemSize };
  return { attributes, index: g.index ? (g.index.array as Uint16Array | Uint32Array) : null };
}

export function unpack(p: Packed) {
  const g = new BufferGeometry();
  for (const [name, a] of Object.entries(p.attributes)) g.setAttribute(name, new BufferAttribute(a.array, a.size));
  if (p.index) g.setIndex(new BufferAttribute(p.index, 1));
  return g;
}

// The arrays a packed geometry holds, for a transfer list.
export const buffers = (p: Packed | null) => (p ? [...Object.values(p.attributes).map((a) => a.array.buffer), ...(p.index ? [p.index.buffer] : [])] : []);

// Every part must carry the same attributes, indexed, for the merge.
function prepare(g: BufferGeometry) {
  if (!g.index) {
    const n = g.getAttribute("position").count;
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new BufferAttribute(idx, 1));
  }
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color", "aRM"].includes(name)) g.deleteAttribute(name);
}

// Texture coordinates in the part's own frame, before it's placed: planar
// per face, with the grain along the chosen axis and a random offset so no
// two parts show the same patch.
function uvs(g: BufferGeometry, look: Look, mat: Mat, rnd: () => number) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  g.computeBoundingBox();
  const b = g.boundingBox as Box3;
  const size = b.getSize(new Vector3());
  const r = look.region;
  if (mat === "print" && r) {
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - b.min.x) / Math.max(size.x, 1e-6);
      const v = look.face === "front" ? (pos.getY(i) - b.min.y) / Math.max(size.y, 1e-6) : 1 - (pos.getZ(i) - b.min.z) / Math.max(size.z, 1e-6);
      uv[i * 2] = r[0] + Math.min(1, Math.max(0, u)) * (r[2] - r[0]);
      uv[i * 2 + 1] = r[1] + Math.min(1, Math.max(0, v)) * (r[3] - r[1]);
    }
  } else {
    const grain = look.grain ?? (size.y > size.x && size.y > size.z ? "y" : size.x >= size.z ? "x" : "z");
    const span = look.span ?? SPAN[mat];
    const ou = look.fixed ? 0 : rnd() * 7;
    const ov = look.fixed ? 0 : rnd() * 7;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ax = Math.abs(nor.getX(i));
      const ay = Math.abs(nor.getY(i));
      const az = Math.abs(nor.getZ(i));
      let u: number;
      let v: number;
      if (ay >= ax && ay >= az) [u, v] = grain === "z" ? [z, x] : [x, z];
      else if (ax >= az) [u, v] = grain === "y" ? [y, z] : [z, y];
      else [u, v] = grain === "y" ? [y, x] : [x, y];
      uv[i * 2] = u / span + ou;
      uv[i * 2 + 1] = v / span + ov;
    }
  }
  g.setAttribute("uv", new BufferAttribute(uv, 2));
}

const tmpP = new Vector3();
const tmpN = new Vector3();

function paint(g: BufferGeometry, look: Look, mat: Mat) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const col = new Float32Array(pos.count * 3);
  const rm = new Float32Array(pos.count * 2);
  const base = lin(look.c);
  const rough = look.r ?? ROUGH[mat];
  const metal = look.m ?? 0;
  for (let i = 0; i < pos.count; i++) {
    let c = base;
    if (look.tone) {
      tmpP.fromBufferAttribute(pos, i);
      tmpN.fromBufferAttribute(nor, i);
      c = lin(look.tone(tmpP, tmpN));
    }
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    rm[i * 2] = rough;
    rm[i * 2 + 1] = metal;
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.setAttribute("aRM", new BufferAttribute(rm, 2));
}

// Plain attributes for a geometry that's instanced rather than merged.
export function instanceReady(g: BufferGeometry, rough: number) {
  prepare(g);
  const n = g.getAttribute("position").count;
  const col = new Float32Array(n * 3).fill(1);
  const rm = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) rm[i * 2] = rough;
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.setAttribute("aRM", new BufferAttribute(rm, 2));
  if (!g.getAttribute("uv")) g.setAttribute("uv", new BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
