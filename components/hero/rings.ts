// Contour rings: when the phone meets the stone, a front spreads from the stone
// and leaves a topographic map behind it, the stone at its summit. Every fifth
// line is an index contour, heavier and labelled, the way survey maps do it.

export type RingState = { cx: number; cy: number; front: number };

type Ring = { r: number; phase: number[]; amp: number[] };

const TWO_PI = Math.PI * 2;

export class Rings {
  private ctx: CanvasRenderingContext2D;
  private rings: Ring[] = [];
  private spacing = 56;
  private w = 0;
  private h = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private family: string,
  ) {
    this.ctx = canvas.getContext("2d")!;
  }

  resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.spacing = w < 700 ? 38 : 56;
    const count = Math.ceil(Math.hypot(w, h) / this.spacing) + 2;
    // Deterministic shapes, so the map is the same every visit.
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const base = [rand() * TWO_PI, rand() * TWO_PI, rand() * TWO_PI];
    this.rings = Array.from({ length: count }, (_, i) => ({
      r: (i + 1) * this.spacing,
      // Neighbouring rings share most of their shape, like real terrain.
      phase: base.map((p, k) => p + i * 0.05 * (k + 1) + rand() * 0.25),
      amp: [0.07 + rand() * 0.02, 0.04 + rand() * 0.02, 0.025],
    }));
  }

  get maxFront() {
    return Math.hypot(this.w, this.h) + this.spacing;
  }

  private radius(ring: Ring, a: number) {
    const [p0, p1, p2] = ring.phase as [number, number, number];
    const [a0, a1, a2] = ring.amp as [number, number, number];
    // Shape varies less near the summit and more further out.
    const grow = Math.min(1, ring.r / 260);
    return ring.r * (1 + grow * (a0 * Math.sin(2 * a + p0) + a1 * Math.sin(3 * a + p1) + a2 * Math.sin(5 * a + p2)));
  }

  draw({ cx, cy, front }: RingState, ink: string) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (front <= 0) return;
    ctx.lineJoin = "round";
    ctx.font = `600 11px ${this.family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const steps = 144;
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i]!;
      if (ring.r > front) break;
      const index = (i + 1) % 5 === 0;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * TWO_PI;
        const r = this.radius(ring, a);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.78; // the ground is seen at an angle
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = ink;
      ctx.globalAlpha = index ? 0.34 : 0.16;
      ctx.lineWidth = index ? 1.8 : 1.1;
      ctx.stroke();
      if (index) {
        // An elevation label on the index contour, knocked out of the line.
        const a = -0.62;
        const r = this.radius(ring, a);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.78;
        const label = String(1200 - (i + 1) * 20);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillRect(-15, -7, 30, 14);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = ink;
        ctx.fillText(label, 0, 0.5);
        ctx.restore();
      }
    }
    // The front itself: a bold line that thins as it travels.
    const t = Math.min(1, front / this.maxFront);
    if (t < 1) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, front, front * 0.78, 0, 0, TWO_PI);
      ctx.globalAlpha = 0.85 * (1 - t);
      ctx.lineWidth = 3.5 * (1 - t) + 0.5;
      ctx.strokeStyle = ink;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
