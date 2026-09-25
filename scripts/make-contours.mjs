#!/usr/bin/env node
// Draws the page's survey linework once: a contour map of an invented hill,
// written as an SVG used as a mask, so each ground tints it in its own ink.
// Deterministic: the same hill every run.
import { contours } from "d3-contour";
import { writeFileSync } from "node:fs";

const W = 160;
const H = 100;
const hills = [
  [0.72, 0.38, 0.22, 1.0],
  [0.3, 0.7, 0.18, 0.7],
  [0.52, 0.12, 0.12, 0.45],
  [0.12, 0.22, 0.14, 0.4],
  [0.9, 0.85, 0.16, 0.5],
];
const values = new Float64Array(W * H);
for (let j = 0; j < H; j++) {
  for (let i = 0; i < W; i++) {
    const x = i / W;
    const y = j / H;
    let v = 0.08 * Math.sin(x * 9.1 + y * 3.3) + 0.06 * Math.cos(y * 7.7 - x * 4.2);
    for (const [cx, cy, r, a] of hills) v += a * Math.exp(-((x - cx) ** 2 + ((y - cy) * 0.85) ** 2) / (2 * r * r));
    values[j * W + i] = v;
  }
}
const levels = Array.from({ length: 22 }, (_, k) => -0.1 + k * 0.055);
const scale = 15; // 2400 × 1500 user units
const round = (n) => Math.round(n * scale);
// d3 closes each band along the grid's edge; cropping the frame hides those closing lines.
const inset = 1.5 * scale;
let paths = "";
contours().size([W, H]).smooth(true).thresholds(levels)(values).forEach((c, k) => {
  const d = c.coordinates
    .flatMap((poly) => poly.map((ring) => "M" + ring.map(([x, y]) => `${round(x)} ${round(y)}`).join("L") + "Z"))
    .join("");
  if (d) paths += `<path d="${d}" stroke-width="${k % 5 === 4 ? 3 : 1.6}"/>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${inset} ${inset} ${W * scale - 2 * inset} ${H * scale - 2 * inset}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#000" stroke-linejoin="round">${paths}</g></svg>\n`;
writeFileSync("public/contours.svg", svg);
console.log(`wrote public/contours.svg (${(svg.length / 1024).toFixed(0)} KB, ${levels.length} levels)`);
