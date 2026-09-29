// The handset's screen in Pocket's story, painted on a canvas and shown on
// the 3D phone as its display. It depicts an iPhone's lock screen: while the
// apps are open, real apps' notifications pile up under the clock; once
// Pocket is tapped they're swept away and the apps you chose sit greyed, each
// with a lock in the current mode's colour. It's drawn at a real iPhone's 393
// × 852 points, so the type and spacing are the platform's own.

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";
import { APP_GLYPHS, type AppId } from "@/components/brand/appGlyphs";
import { NOISE } from "@/lib/content";

export const SCREEN_PT = { w: 393, h: 852 };
// The display's own corner, in points (the glass mesh rounds the same).
const CORNER = 55;

export type ScreenState = {
  notes: number; // how many notifications have arrived, fractional while one lands
  calm: number; // 0 (the apps open) to 1 (locked by the tap)
  colour: string; // the lock's colour: the mode that's on, or Desk's
};

// How each app's icon is drawn: its tile and its glyph, in the owners'
// colours (the same looks components/brand/AppIcon.tsx gives the DOM icons).
type Look = { tile: string | ((ctx: CanvasRenderingContext2D, s: number) => CanvasGradient); ink: string; scale: number; split?: [string, string] };
const LOOKS: Partial<Record<AppId, Look>> = {
  instagram: {
    tile: (ctx, s) => {
      const g = ctx.createRadialGradient(s * 0.3, s * 1.07, 0, s * 0.3, s * 1.07, s * 1.28);
      for (const [at, c] of [
        [0, "#fdf497"],
        [0.05, "#fdf497"],
        [0.45, "#fd5949"],
        [0.6, "#d6249f"],
        [0.9, "#285aeb"],
      ] as const)
        g.addColorStop(at, c);
      return g;
    },
    ink: "#ffffff",
    scale: 0.62,
  },
  tiktok: { tile: "#000000", ink: "#ffffff", scale: 0.58, split: ["#25f4ee", "#fe2c55"] },
  youtube: { tile: "#ffffff", ink: "#ff0000", scale: 0.7 },
  x: { tile: "#000000", ink: "#ffffff", scale: 0.52 },
};

const APP_NAME: Partial<Record<AppId, string>> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X" };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export class PhoneScreen {
  readonly canvas = document.createElement("canvas");
  readonly texture: CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private glyphs = new Map<AppId, Path2D>();
  private family: string;
  private last = "";
  private greyable: boolean;

  // `px`: texels a point.
  constructor(
    private apps: AppId[],
    private px = 2,
  ) {
    this.canvas.width = Math.round(SCREEN_PT.w * px);
    this.canvas.height = Math.round(SCREEN_PT.h * px);
    this.ctx = this.canvas.getContext("2d")!;
    this.greyable = "filter" in this.ctx;
    // The page's own Mona Sans, as next/font named it.
    this.family = getComputedStyle(document.documentElement).getPropertyValue("--font-mona").trim() || "Helvetica Neue, Arial, sans-serif";
    for (const app of apps) this.glyphs.set(app, new Path2D(APP_GLYPHS[app]));
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearMipmapLinearFilter;
    this.texture.magFilter = LinearFilter;
    this.texture.anisotropy = 4;
  }

  // Repaints only when what's shown has changed, in steps of a fortieth: a
  // scroll through a notification landing or the quiet coming on repaints
  // (and uploads) the screen forty times at most, not on every frame.
  paint(s: ScreenState) {
    const notes = Math.round(s.notes * 40) / 40;
    const calm = Math.round(s.calm * 40) / 40;
    const key = `${notes}|${calm}|${s.colour}`;
    if (key === this.last) return false;
    this.last = key;
    const ctx = this.ctx;
    ctx.setTransform(this.px, 0, 0, this.px, 0, 0);
    this.wallpaper(calm);
    this.clock(calm);
    this.notifications(notes, calm);
    this.locked(calm, s.colour);
    this.chrome();
    this.texture.needsUpdate = true;
    return true;
  }

  private font(weight: number, size: number) {
    return `${weight} ${size}px ${this.family}`;
  }

  // A dark lock-screen wallpaper: graphite with a soft light toward the top.
  // As the lock goes on it dims, the way a quiet phone looks.
  private wallpaper(calm: number) {
    const ctx = this.ctx;
    const { w, h } = SCREEN_PT;
    const dim = 1 - 0.55 * smooth(calm);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgb(${58 * dim} ${60 * dim} ${68 * dim})`);
    g.addColorStop(0.55, `rgb(${24 * dim} ${25 * dim} ${29 * dim})`);
    g.addColorStop(1, `rgb(${10 * dim} ${10 * dim} ${12 * dim})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.12, 0, w * 0.7, h * 0.12, w * 0.9);
    glow.addColorStop(0, `rgb(255 255 255 / ${0.14 * dim})`);
    glow.addColorStop(1, "rgb(255 255 255 / 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  private clock(calm: number) {
    const ctx = this.ctx;
    const { w } = SCREEN_PT;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgb(255 255 255 / ${0.82 - 0.12 * calm})`;
    ctx.font = this.font(600, 19);
    ctx.fillText("Friday 26 September", w / 2, 118);
    ctx.fillStyle = `rgb(255 255 255 / ${0.96 - 0.16 * calm})`;
    ctx.font = this.font(700, 96);
    ctx.fillText("21:40", w / 2, 210);
  }

  // The noise: newest on top under the clock, each landing with a small drop
  // and pushing the others down. The tap sweeps them all up and away.
  private notifications(notes: number, calm: number) {
    const ctx = this.ctx;
    const { w } = SCREEN_PT;
    const gone = smooth(calm * 1.6);
    if (gone >= 1 || notes <= 0) return;
    const cardH = 74;
    const gap = 9;
    const x = 12;
    const cw = w - 24;
    const top = 262 - 48 * gone;
    const count = Math.min(this.apps.length, Math.ceil(notes));
    for (let i = 0; i < count; i++) {
      const arrive = smooth(notes - i); // 0 while it drops in, 1 once it's landed
      // The cards that came after this one push it down.
      let y = top;
      for (let j = i + 1; j < count; j++) y += (cardH + gap) * smooth(notes - j);
      y += (1 - arrive) * -22;
      const alpha = arrive * (1 - gone);
      if (alpha <= 0.002) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      const s = 0.94 + 0.06 * arrive;
      ctx.translate(w / 2, y + cardH / 2);
      ctx.scale(s, s);
      ctx.translate(-w / 2, -(y + cardH / 2));
      // The platform's translucent material, dark on a dark wallpaper.
      roundRect(ctx, x, y, cw, cardH, 22);
      ctx.fillStyle = "rgb(62 62 68 / 0.78)";
      ctx.fill();
      ctx.strokeStyle = "rgb(255 255 255 / 0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const app = this.apps[i]!;
      this.icon(app, x + 13, y + 16, 42, false);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgb(255 255 255 / 0.96)";
      ctx.font = this.font(650, 16);
      ctx.fillText(APP_NAME[app] ?? app, x + 67, y + 32);
      ctx.fillStyle = "rgb(235 235 245 / 0.6)";
      ctx.font = this.font(450, 14);
      ctx.textAlign = "right";
      ctx.fillText("now", x + cw - 15, y + 31);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgb(255 255 255 / 0.9)";
      ctx.font = this.font(450, 15.5);
      const text = NOISE.find((n) => n.app === app)?.text ?? "";
      ctx.fillText(this.fit(text, cw - 67 - 14), x + 67, y + 54);
      ctx.restore();
    }
  }

  // Once tapped: the chosen apps greyed, each with a lock in the mode's colour.
  private locked(calm: number, colour: string) {
    const show = smooth((calm - 0.35) / 0.65);
    if (show <= 0) return;
    const ctx = this.ctx;
    const { w } = SCREEN_PT;
    const size = 58;
    const gap = 24;
    const row = this.apps.length * size + (this.apps.length - 1) * gap;
    const y = 318 + (1 - show) * 18;
    ctx.save();
    ctx.globalAlpha = show;
    this.apps.forEach((app, i) => {
      const x = (w - row) / 2 + i * (size + gap);
      this.icon(app, x, y, size, true);
      // The lock badge, over the icon's top right corner.
      const cx = x + size - 4;
      const cy = y + 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 13.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgb(12 12 14)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 11.5, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      this.lock(cx, cy, 1, "rgb(12 12 14)");
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "rgb(255 255 255 / 0.94)";
    ctx.font = this.font(680, 21);
    ctx.fillText(`${this.apps.length} apps locked`, w / 2, y + size + 50);
    ctx.fillStyle = "rgb(235 235 245 / 0.58)";
    ctx.font = this.font(450, 16);
    ctx.fillText("Tap Pocket to unlock", w / 2, y + size + 76);
    ctx.restore();
  }

  // A lock glyph centred on (x, y), about 12 points tall at scale 1.
  private lock(x: number, y: number, k: number, ink: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.9;
    roundRect(ctx, -5, -1, 10, 7.5, 1.6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -2, 3.3, Math.PI, 0);
    ctx.lineTo(3.3, -0.5);
    ctx.moveTo(-3.3, -2);
    ctx.lineTo(-3.3, -0.5);
    ctx.stroke();
    ctx.restore();
  }

  // A real app's icon: its tile in the owner's colours and its glyph, with
  // iOS's corner (22.5% of the tile). Greyed, it's desaturated and dimmed.
  private icon(app: AppId, x: number, y: number, size: number, grey: boolean) {
    const ctx = this.ctx;
    const look = LOOKS[app] ?? { tile: "#3a3a3e", ink: "#ffffff", scale: 0.6 };
    const glyph = this.glyphs.get(app);
    ctx.save();
    if (grey) {
      ctx.globalAlpha *= 0.42;
      if (this.greyable) ctx.filter = "grayscale(1)";
    }
    ctx.translate(x, y);
    roundRect(ctx, 0, 0, size, size, size * 0.225);
    ctx.fillStyle = typeof look.tile === "string" ? look.tile : look.tile(ctx, size);
    ctx.fill();
    if (glyph) {
      const k = size / 24;
      const s = look.scale;
      const draw = (fill: string, dx = 0, dy = 0) => {
        ctx.save();
        ctx.scale(k, k);
        ctx.translate(12 - 12 * s + dx, 12 - 12 * s + dy);
        ctx.scale(s, s);
        ctx.fillStyle = fill;
        ctx.fill(glyph);
        ctx.restore();
      };
      if (look.split) {
        draw(look.split[0], -0.55, -0.45);
        draw(look.split[1], 0.55, 0.45);
      }
      draw(look.ink);
    }
    ctx.restore();
  }

  // The status bar, the Dynamic Island, the lock screen's two buttons and
  // the home indicator: the same in both states.
  private chrome() {
    const ctx = this.ctx;
    const { w, h } = SCREEN_PT;
    ctx.fillStyle = "#000000";
    roundRect(ctx, (w - 126) / 2, 11, 126, 37, 18.5);
    ctx.fill();
    ctx.fillStyle = "rgb(255 255 255 / 0.96)";
    ctx.font = this.font(620, 17);
    ctx.textAlign = "center";
    ctx.fillText("21:40", 67, 37);
    // Signal, then the battery.
    for (let i = 0; i < 4; i++) {
      roundRect(ctx, 300 + i * 5, 34 - 4 - i * 2.4, 3.2, 4 + i * 2.4, 1);
      ctx.fill();
    }
    ctx.strokeStyle = "rgb(255 255 255 / 0.45)";
    ctx.lineWidth = 1;
    roundRect(ctx, 329.5, 24.5, 25, 12, 3.5);
    ctx.stroke();
    roundRect(ctx, 331.5, 26.5, 17, 8, 2);
    ctx.fill();
    // The flashlight and camera buttons.
    for (const cx of [72, w - 72]) {
      ctx.beginPath();
      ctx.arc(cx, h - 88, 25, 0, Math.PI * 2);
      ctx.fillStyle = "rgb(255 255 255 / 0.12)";
      ctx.fill();
    }
    ctx.strokeStyle = "rgb(255 255 255 / 0.9)";
    ctx.lineWidth = 1.8;
    roundRect(ctx, 67, h - 98, 10, 19, 2.5);
    ctx.stroke();
    roundRect(ctx, w - 83, h - 95, 22, 15, 3.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w - 72, h - 87.5, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgb(255 255 255 / 0.62)";
    roundRect(ctx, (w - 136) / 2, h - 13, 136, 5, 2.5);
    ctx.fill();
    // The display's edge, a hair of black inside the glass's rounded corner.
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    roundRect(ctx, 0, 0, w, h, CORNER);
    ctx.stroke();
  }

  // Cuts a line to fit, with an ellipsis, the way a notification does.
  private fit(text: string, width: number) {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= width) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }

  dispose() {
    this.texture.dispose();
  }
}
