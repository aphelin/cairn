import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from "three";

// Every surface texture in the house is painted at runtime on a canvas: no
// downloads. Each is seeded, so the house looks the same on every visit.
// The big surfaces are painted in the house's worker where the browser can
// paint off the page (an OffscreenCanvas), and here, a step at a time, where
// it can't; either way they become textures here (asTextures).

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Surface = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// A canvas to paint on: the page's, or an offscreen one in the worker.
function canvas(w: number, h = w): { c: Surface; ctx: Ctx } {
  if (typeof document === "undefined") {
    const c = new OffscreenCanvas(w, h);
    return { c, ctx: c.getContext("2d", { willReadFrequently: false })! };
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d", { willReadFrequently: false })! };
}

// A painted surface as a texture. A bitmap from the worker comes already
// flipped and with its colour not premultiplied (see paintOffscreen), exactly
// as a canvas is uploaded, so it goes up as it is: no copy on the page, and no
// conversion on the way to the GPU.
function texture(s: Surface | ImageBitmap, colour: boolean, anisotropy: number) {
  const bitmap = typeof ImageBitmap !== "undefined" && s instanceof ImageBitmap;
  const t = bitmap ? new Texture(s) : new CanvasTexture(s as HTMLCanvasElement);
  if (bitmap) {
    t.flipY = false;
    t.needsUpdate = true;
  }
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = anisotropy;
  if (colour) t.colorSpace = SRGBColorSpace;
  return t;
}

// The house's surfaces as painted, before they're textures: canvases, or
// bitmaps handed over from the worker.
export type Painted<S = Surface> = {
  planks: { map: S; rough: S };
  tiles: { map: S; rough: S };
  splash: S;
  grain: S;
  weave: S;
  prints: S;
};

export function asTextures(p: Painted<Surface | ImageBitmap>, anisotropy: number) {
  const t = (s: Surface | ImageBitmap, colour: boolean) => texture(s, colour, anisotropy);
  return {
    planks: { map: t(p.planks.map, true), rough: t(p.planks.rough, false) },
    tiles: { map: t(p.tiles.map, true), rough: t(p.tiles.rough, false) },
    splash: t(p.splash, true),
    grain: t(p.grain, true),
    weave: t(p.weave, true),
    prints: t(p.prints, true),
  };
}

const rgb = (r: number, g: number, b: number, a = 1) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;

// A wavy line along x, for grain.
function grainLine(ctx: Ctx, x0: number, x1: number, y: number, amp: number, wave: number, phase: number, step = 12) {
  ctx.beginPath();
  for (let x = x0; x <= x1 + step; x += step) {
    const yy = y + Math.sin(x / wave + phase) * amp + Math.sin(x / (wave * 0.37) + phase * 2.1) * amp * 0.3;
    if (x === x0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
}

// Oak planks, 16 cm wide and 0.7 to 1.8 m long, laid east to west. The
// canvas is 2.56 m square and tiles seamlessly. Each plank has its own tone,
// grain, the odd knot and a darker joint; a second canvas holds how rough
// each plank's lacquer is.
export const PLANK_SPAN = 2.56;

function planks() {
  const S = 1024;
  const px = S / PLANK_SPAN;
  const { c, ctx } = canvas(S);
  const { c: rc, ctx: rctx } = canvas(S / 2);
  const rnd = seeded(11);
  const rows = 16;
  const h = S / rows;
  // Natural oak with a greige cast: lamplight warms it, so it starts cool
  // enough that lit boards still read as oak, not amber.
  const tones = [
    [171, 151, 126],
    [155, 135, 112],
    [183, 164, 140],
    [163, 143, 118],
    [145, 126, 104],
    [177, 158, 133],
  ];
  for (let r = 0; r < rows; r++) {
    const y = r * h;
    const start = rnd() * S;
    const lengths: number[] = [];
    let total = 0;
    while (total < S) {
      let len = (0.7 + rnd() * 1.1) * px;
      if (S - total - len < 0.45 * px) len = S - total;
      lengths.push(len);
      total += len;
    }
    let x = start;
    for (const len of lengths) {
      const t = tones[Math.floor(rnd() * tones.length)]!;
      const k = 0.93 + rnd() * 0.14;
      const base = [t[0]! * k, t[1]! * k, t[2]! * k] as const;
      const rough = 0.5 + rnd() * 0.16;
      const seed = rnd() * 1000;
      // Draw it where it lies, and again one tile over where it wraps.
      for (const off of [0, -S]) {
        const x0 = x + off;
        if (x0 > S || x0 + len < 0) continue;
        plank(ctx, x0, y, len, h, base, seed);
        rctx.fillStyle = rgb(rough * 255, rough * 255, rough * 255);
        rctx.fillRect(x0 / 2, y / 2, len / 2, h / 2);
        rctx.fillStyle = "rgb(235,235,235)";
        rctx.fillRect(x0 / 2, y / 2, len / 2, 1);
        rctx.fillRect(x0 / 2, y / 2, 1, h / 2);
      }
      x += len;
      if (x > S) x -= S;
    }
  }
  return { map: c, rough: rc };
}

function plank(ctx: Ctx, x: number, y: number, w: number, h: number, base: readonly [number, number, number], seed: number) {
  const rnd = seeded(Math.floor(seed * 1000));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // Tone, with a slow drift along the board.
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  for (let i = 0; i <= 4; i++) {
    const k = 0.95 + rnd() * 0.1;
    g.addColorStop(i / 4, rgb(base[0] * k, base[1] * k, base[2] * k));
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Grain: long, gently wavering lines, darker and lighter.
  const lines = 30;
  for (let i = 0; i < lines; i++) {
    const dark = rnd() < 0.7;
    ctx.strokeStyle = dark ? rgb(88, 66, 46, 0.05 + rnd() * 0.12) : rgb(232, 216, 194, 0.05 + rnd() * 0.08);
    ctx.lineWidth = 0.6 + rnd() * 1.6;
    grainLine(ctx, x - 10, x + w + 10, y + rnd() * h, 0.8 + rnd() * 2.6, 60 + rnd() * 220, rnd() * 6.28);
  }
  // A cathedral figure on some boards: nested arches of darker grain.
  if (rnd() < 0.45) {
    const cx = x + w * (0.25 + rnd() * 0.5);
    const cy = y + h * (0.3 + rnd() * 0.4);
    for (let k = 0; k < 7; k++) {
      ctx.strokeStyle = rgb(92, 68, 46, 0.07 + rnd() * 0.06);
      ctx.lineWidth = 0.8 + rnd();
      ctx.beginPath();
      ctx.ellipse(cx, cy, 30 + k * 26 + rnd() * 10, 4 + k * 3.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Pores.
  for (let i = 0; i < w * 0.35; i++) {
    ctx.fillStyle = rgb(70, 44, 24, 0.12 + rnd() * 0.15);
    ctx.fillRect(x + rnd() * w, y + rnd() * h, 1.5 + rnd() * 4, 0.8);
  }
  // The odd knot.
  if (rnd() < 0.22) {
    const kx = x + rnd() * w;
    const ky = y + h * (0.25 + rnd() * 0.5);
    for (let k = 4; k >= 0; k--) {
      ctx.fillStyle = rgb(88 - k * 6, 54 - k * 3, 28, 0.18 + (4 - k) * 0.1);
      ctx.beginPath();
      ctx.ellipse(kx, ky, 3 + k * 3.2, 1.6 + k * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // The joints: a dark line where boards meet, a faint bevel light below it.
  ctx.fillStyle = rgb(52, 32, 18, 0.7);
  ctx.fillRect(x, y, w, 1.6);
  ctx.fillRect(x, y, 1.6, h);
  ctx.fillStyle = rgb(255, 236, 210, 0.1);
  ctx.fillRect(x + 1.6, y + 1.6, w - 1.6, 1.2);
}

// A pale, neutral wood grain for furniture; the vertex colour gives the
// species (oak, walnut). Grain runs along u.
function grain() {
  const S = 512;
  const { c, ctx } = canvas(S);
  const rnd = seeded(23);
  ctx.fillStyle = "rgb(236,230,222)";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) {
    ctx.strokeStyle = rnd() < 0.75 ? rgb(120, 96, 76, 0.06 + rnd() * 0.12) : rgb(255, 250, 240, 0.08 + rnd() * 0.1);
    ctx.lineWidth = 0.5 + rnd() * 2.2;
    const y = rnd() * S;
    // Drawn three times across the seam so the tile wraps.
    for (const dy of [-S, 0, S]) grainLine(ctx, -20, S + 20, y + dy, 1 + rnd() * 5, 40 + rnd() * 120, rnd() * 6.28, 8);
  }
  for (let k = 0; k < 5; k++) {
    const cx = rnd() * S;
    const cy = rnd() * S;
    for (let j = 0; j < 6; j++) {
      ctx.strokeStyle = rgb(110, 84, 62, 0.08);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 24 + j * 20, 3 + j * 2.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return c;
}

// Woven fabric: a fine basket weave with a heathered mottle, near white so
// the vertex colour carries the dye.
function weave() {
  const S = 256;
  const { c, ctx } = canvas(S);
  const rnd = seeded(5);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const warp = (x >> 1) % 2 === (y >> 1) % 2 ? 1 : 0;
      const v = 222 + warp * 14 + (rnd() - 0.5) * 22;
      const i = (y * S + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 6 + rnd() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() < 0.5;
    g.addColorStop(0, light ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) ctx.fillRect(x - r + dx, y - r + dy, r * 2, r * 2);
  }
  return c;
}

// The kitchen floor: 30 cm tiles in a cream and warm-grey check, each a
// little different, with grout; a second canvas makes the grout rough.
export const TILE_SPAN = 1.2;

function floorTiles() {
  const S = 512;
  const n = 4;
  const t = S / n;
  const { c, ctx } = canvas(S);
  const { c: rc, ctx: rctx } = canvas(S / 2);
  const rnd = seeded(31);
  ctx.fillStyle = "rgb(176,166,150)";
  ctx.fillRect(0, 0, S, S);
  rctx.fillStyle = "rgb(230,230,230)";
  rctx.fillRect(0, 0, S / 2, S / 2);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const light = (i + j) % 2 === 0;
      const k = 0.96 + rnd() * 0.07;
      const [r, g, b] = light ? [226, 216, 199] : [150, 138, 124];
      const x = i * t + 2;
      const y = j * t + 2;
      const grad = ctx.createLinearGradient(x, y, x + t, y + t);
      grad.addColorStop(0, rgb(r * k * 1.02, g * k * 1.02, b * k * 1.02));
      grad.addColorStop(1, rgb(r * k * 0.97, g * k * 0.97, b * k * 0.97));
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, t - 4, t - 4);
      for (let s = 0; s < 260; s++) {
        ctx.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.12)" : "rgba(60,48,36,0.1)";
        ctx.fillRect(x + rnd() * (t - 4), y + rnd() * (t - 4), 1.2, 1.2);
      }
      const rough = light ? 0.34 : 0.4;
      rctx.fillStyle = rgb(rough * 255, rough * 255, rough * 255);
      rctx.fillRect(x / 2, y / 2, (t - 4) / 2, (t - 4) / 2);
    }
  }
  return { map: c, rough: rc };
}

// The backsplash: small handmade glazed tiles, cream, each glazed a touch
// differently, like zellige.
export const SPLASH_SPAN = 0.8;

function splashTiles() {
  const S = 512;
  const n = 8;
  const t = S / n;
  const { c, ctx } = canvas(S);
  const rnd = seeded(43);
  ctx.fillStyle = "rgb(205,195,178)";
  ctx.fillRect(0, 0, S, S);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = 0.9 + rnd() * 0.14;
      const x = i * t + 1.5;
      const y = j * t + 1.5;
      const g = ctx.createRadialGradient(x + t * rnd(), y + t * rnd(), 2, x + t / 2, y + t / 2, t);
      g.addColorStop(0, rgb(244 * k, 236 * k, 222 * k));
      g.addColorStop(1, rgb(226 * k, 214 * k, 196 * k));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, t - 3, t - 3);
    }
  }
  return c;
}

// One atlas for everything printed or woven with a picture: the three rugs,
// the hall runner and the framed prints. Regions are in UV space (v up).
export type Region = [number, number, number, number];
export const ATLAS: Record<"living" | "bedroom" | "study" | "runner" | "art1" | "art2" | "art3", Region> = {
  living: [0, 0.46875, 0.625, 1],
  bedroom: [0.625, 0.75, 1, 1],
  study: [0.625, 0.46875, 1, 0.75],
  runner: [0, 0, 0.1640625, 0.46875],
  art1: [0.1796875, 0, 0.4453125, 0.46875],
  art2: [0.4609375, 0, 0.7265625, 0.46875],
  art3: [0.7421875, 0, 1, 0.46875],
};

function prints() {
  const S = 1024;
  const { c, ctx } = canvas(S);
  const rnd = seeded(71);
  // The atlas's v runs up; the canvas's y runs down.
  const box = (r: Region) => ({ x: r[0] * S, y: (1 - r[3]) * S, w: (r[2] - r[0]) * S, h: (r[3] - r[1]) * S });
  const wool = (b: { x: number; y: number; w: number; h: number }, amount: number) => {
    for (let i = 0; i < b.w * b.h * 0.05; i++) {
      ctx.fillStyle = rnd() < 0.5 ? `rgba(255,250,240,${amount})` : `rgba(40,30,20,${amount})`;
      ctx.fillRect(b.x + rnd() * b.w, b.y + rnd() * b.h, 1 + rnd() * 2, 1);
    }
  };

  // The living-room rug: a cream Berber with a hand-knotted charcoal lattice.
  {
    const b = box(ATLAS.living);
    ctx.fillStyle = "rgb(230,221,204)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    wool(b, 0.12);
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x + 14, b.y + 14, b.w - 28, b.h - 28);
    ctx.clip();
    ctx.strokeStyle = "rgba(58,52,48,0.85)";
    ctx.lineCap = "round";
    const cell = b.w / 6;
    for (let k = -8; k <= 14; k++) {
      for (const dir of [1, -1]) {
        ctx.lineWidth = 3 + rnd() * 1.5;
        ctx.beginPath();
        const x0 = b.x + k * cell;
        for (let s = 0; s <= 24; s++) {
          const yy = b.y + (s / 24) * b.h;
          const xx = x0 + dir * (s / 24) * b.h * 0.9 + (rnd() - 0.5) * 3;
          if (s === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(58,52,48,0.7)";
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x + 14, b.y + 14, b.w - 28, b.h - 28);
    ctx.fillStyle = "rgba(90,74,60,0.1)";
    ctx.fillRect(b.x, b.y, b.w, 6);
    ctx.fillRect(b.x, b.y + b.h - 6, b.w, 6);
  }

  // The bedroom rug: soft stripes of oat, sand, olive and a browned rust.
  {
    const b = box(ATLAS.bedroom);
    ctx.fillStyle = "rgb(204,190,166)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const bands = [
      [0.1, 0.16, "rgba(123,81,64,0.9)"],
      [0.19, 0.21, "rgba(109,114,80,0.85)"],
      [0.44, 0.56, "rgba(233,225,211,0.9)"],
      [0.79, 0.81, "rgba(109,114,80,0.85)"],
      [0.84, 0.9, "rgba(123,81,64,0.9)"],
    ] as const;
    for (const [a, z, col] of bands) {
      ctx.fillStyle = col;
      ctx.fillRect(b.x + a * b.w, b.y, (z - a) * b.w, b.h);
    }
    wool(b, 0.14);
  }

  // The study rug: a faded two-tone grid in sand and walnut.
  {
    const b = box(ATLAS.study);
    ctx.fillStyle = "rgb(178,160,134)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = "rgba(92,66,48,0.55)";
    ctx.lineWidth = 5;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(b.x + (i / 8) * b.w, b.y);
      ctx.lineTo(b.x + (i / 8) * b.w, b.y + b.h);
      ctx.stroke();
    }
    for (let j = 1; j < 6; j++) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + (j / 6) * b.h);
      ctx.lineTo(b.x + b.w, b.y + (j / 6) * b.h);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(92,66,48,0.8)";
    ctx.lineWidth = 10;
    ctx.strokeRect(b.x + 12, b.y + 12, b.w - 24, b.h - 24);
    wool(b, 0.16);
  }

  // The hall runner: a kilim of stacked diamonds.
  {
    const b = box(ATLAS.runner);
    ctx.fillStyle = "rgb(214,200,176)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const cols = ["rgb(123,81,64)", "rgb(109,114,80)", "rgb(67,64,61)"];
    const step = b.w * 0.8;
    let k = 0;
    for (let y = b.y + step * 0.6; y < b.y + b.h - step * 0.4; y += step) {
      const cx = b.x + b.w / 2;
      ctx.fillStyle = cols[k++ % cols.length]!;
      ctx.beginPath();
      ctx.moveTo(cx, y - step * 0.42);
      ctx.lineTo(cx + b.w * 0.34, y);
      ctx.lineTo(cx, y + step * 0.42);
      ctx.lineTo(cx - b.w * 0.34, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgb(214,200,176)";
      ctx.beginPath();
      ctx.moveTo(cx, y - step * 0.18);
      ctx.lineTo(cx + b.w * 0.14, y);
      ctx.lineTo(cx, y + step * 0.18);
      ctx.lineTo(cx - b.w * 0.14, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgb(123,81,64)";
    ctx.fillRect(b.x + 6, b.y, 5, b.h);
    ctx.fillRect(b.x + b.w - 11, b.y, 5, b.h);
    wool(b, 0.15);
  }

  // Three prints: a low sun over hills, a still sea, a stem of leaves.
  {
    const b = box(ATLAS.art1);
    ctx.fillStyle = "rgb(236,228,214)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "rgb(150,104,79)";
    ctx.beginPath();
    ctx.arc(b.x + b.w * 0.58, b.y + b.h * 0.42, b.w * 0.2, 0, Math.PI * 2);
    ctx.fill();
    const hills = ["rgb(184,165,134)", "rgb(109,114,80)", "rgb(76,50,34)"];
    hills.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.h);
      const base = b.y + b.h * (0.55 + i * 0.12);
      for (let s = 0; s <= 20; s++) ctx.lineTo(b.x + (s / 20) * b.w, base - Math.sin(s / 3.2 + i * 1.7) * b.h * 0.05);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.closePath();
      ctx.fill();
    });
  }
  {
    const b = box(ATLAS.art2);
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, "rgb(214,208,196)");
    g.addColorStop(0.55, "rgb(176,178,170)");
    g.addColorStop(0.56, "rgb(95,106,104)");
    g.addColorStop(1, "rgb(70,78,80)");
    ctx.fillStyle = g;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = "rgba(230,226,216,0.25)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const y = b.y + b.h * (0.6 + rnd() * 0.38);
      ctx.beginPath();
      ctx.moveTo(b.x + rnd() * b.w * 0.5, y);
      ctx.lineTo(b.x + b.w * (0.5 + rnd() * 0.5), y);
      ctx.stroke();
    }
  }
  {
    const b = box(ATLAS.art3);
    ctx.fillStyle = "rgb(233,225,211)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = "rgb(67,64,61)";
    ctx.fillStyle = "rgb(91,97,71)";
    ctx.lineWidth = 3;
    const cx = b.x + b.w * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, b.y + b.h * 0.88);
    ctx.bezierCurveTo(cx - 20, b.y + b.h * 0.6, cx + 26, b.y + b.h * 0.4, cx - 6, b.y + b.h * 0.14);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const t = 0.2 + i * 0.1;
      const y = b.y + b.h * (0.88 - t * 0.85);
      const s = i % 2 ? 1 : -1;
      ctx.save();
      ctx.translate(cx + s * 4, y);
      ctx.rotate(s * 0.7);
      ctx.beginPath();
      ctx.ellipse(s * 26, 0, 30 - i * 2, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  return c;
}

// The painters, one per surface, in the order they're painted.
export const PAINTERS: { [K in keyof Painted]: () => Painted[K] } = {
  planks,
  tiles: floorTiles,
  splash: splashTiles,
  grain,
  weave,
  prints,
};

// Every surface painted, as bitmaps ready to hand over, where this thread can
// paint offscreen; otherwise null. Each is flipped top to bottom and its
// colour taken back out of premultiplied alpha, which is what three does to a
// canvas as it uploads it, and can't do to a bitmap: the page then uploads
// the bitmap as it is, and the GPU gets exactly what it got from a canvas.
export async function paintOffscreen(): Promise<{ painted: Painted<ImageBitmap>; transfer: ImageBitmap[] } | null> {
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap !== "function") return null;
  const done: Partial<Record<keyof Painted, unknown>> = {};
  const transfer: ImageBitmap[] = [];
  const bitmap = async (c: Surface) => {
    const { width: w, height: h } = c;
    const flipped = new OffscreenCanvas(w, h);
    const ctx = flipped.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, -1, 0, h);
    ctx.drawImage(c, 0, 0);
    const b = await createImageBitmap(flipped, { premultiplyAlpha: "none" });
    transfer.push(b);
    return b;
  };
  for (const [name, paint] of Object.entries(PAINTERS) as [keyof Painted, () => Surface | { map: Surface; rough: Surface }][]) {
    const out = paint();
    done[name] = "map" in out ? { map: await bitmap(out.map), rough: await bitmap(out.rough) } : await bitmap(out);
  }
  return { painted: done as Painted<ImageBitmap>, transfer };
}

// The night outside, behind the model: a deep blue that darkens downward.
export function backdrop(): Texture {
  const { c, ctx } = canvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#1c2438");
  g.addColorStop(0.55, "#131a29");
  g.addColorStop(1, "#0c1019");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// The soft shadow the plinth casts on the night below it.
export function softShadow() {
  const { c, ctx } = canvas(256);
  ctx.save();
  ctx.translate(128, 128);
  ctx.scale(1, 0.78);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 128);
  g.addColorStop(0, "rgba(3,5,10,0.85)");
  g.addColorStop(0.55, "rgba(3,5,10,0.6)");
  g.addColorStop(1, "rgba(3,5,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-128, -170, 256, 340);
  ctx.restore();
  return new CanvasTexture(c);
}

// A soft round glow, for the light a phone's screen throws round it.
export function glowTexture() {
  const { c, ctx } = canvas(64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}
