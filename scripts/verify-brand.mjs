#!/usr/bin/env node
// G10: Cairn's identity is its own. The favicon and the logo are the dial seen
// from above (a ring, a ceramic face and an indicator dot); nothing shipped
// carries a stacked-stone mark; the pebble stills and photo are gone. The
// stacked-stone detector is first run on the old three-stone icon, from git,
// which it must flag.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const num = (s, name) => Number(new RegExp(`\\b${name}="([-\\d.]+)"`).exec(s)?.[1] ?? NaN);

// Ellipses (or circles) piled on top of each other, each above the last: a cairn.
function stackedStones(svg) {
  const shapes = [...svg.matchAll(/<(ellipse|circle)\b[^>]*>/g)].map(([tag, kind]) => ({
    cx: num(tag, "cx"),
    cy: num(tag, "cy"),
    rx: kind === "ellipse" ? num(tag, "rx") : num(tag, "r"),
    ry: kind === "ellipse" ? num(tag, "ry") : num(tag, "r"),
  }));
  const ovals = shapes.filter((s) => [s.cx, s.cy, s.rx, s.ry].every(Number.isFinite) && s.rx > s.ry * 1.25);
  for (const a of ovals)
    for (const b of ovals) {
      if (a === b) continue;
      const aligned = Math.abs(a.cx - b.cx) < Math.max(a.rx, b.rx) * 0.5;
      const above = b.cy < a.cy - Math.min(a.ry, b.ry) * 0.8;
      if (aligned && above && b.rx < a.rx) return true;
    }
  return false;
}

// The dial from above: two concentric circles and a small dot inside the inner one.
function dialMark(svg) {
  const circles = [...svg.matchAll(/<circle\b[^>]*>/g)].map(([tag]) => ({ cx: num(tag, "cx"), cy: num(tag, "cy"), r: num(tag, "r") }));
  const byR = [...circles].sort((a, b) => b.r - a.r);
  const [ring, face] = byR;
  const dot = byR.at(-1);
  if (!ring || !face || !dot || circles.length < 3) return false;
  const concentric = ring.cx === face.cx && ring.cy === face.cy && face.r < ring.r && face.r > ring.r * 0.5;
  const inside = Math.hypot(dot.cx - face.cx, dot.cy - face.cy) + dot.r <= face.r && dot.r < face.r * 0.3;
  return concentric && inside;
}

// Controls: the old icon must be flagged, and the new one must pass.
const oldIcon = execSync("git show 8282596:public/icon.svg", { encoding: "utf8" });
if (!stackedStones(oldIcon)) failures.push("the stacked-stone detector missed the old three-stone icon");
const oldGlyph = execSync("git show 8282596:components/icons.tsx", { encoding: "utf8" });
if (!stackedStones(oldGlyph.slice(oldGlyph.indexOf("CairnMark"), oldGlyph.indexOf("export const Arrow")))) {
  failures.push("the stacked-stone detector missed the old CairnMark glyph");
}

// The favicon.
const icon = readFileSync("public/icon.svg", "utf8");
if (!dialMark(icon)) failures.push("public/icon.svg is not the dial seen from above");
if (stackedStones(icon)) failures.push("public/icon.svg carries a stacked-stone mark");

// The logo, as shipped in the page.
if (!existsSync("out/index.html")) failures.push("out/index.html missing: build first");
else {
  const html = readFileSync("out/index.html", "utf8");
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
  const logo = header.match(/<svg[\s\S]*?<\/svg>/)?.[0] ?? "";
  if (!dialMark(logo)) failures.push("the nav logo is not the dial seen from above");
  for (const svg of html.match(/<svg[\s\S]*?<\/svg>/g) ?? []) if (stackedStones(svg)) failures.push("an inline SVG in the page carries a stacked-stone mark");
  if (/data-stone|CairnMark|pebble/i.test(html)) failures.push("the page still carries stone-era markup");
}

// Every SVG and component that ships.
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
for (const file of [...walk("public"), ...walk("components")]) {
  if (!/\.(svg|tsx)$/.test(file)) continue;
  if (stackedStones(readFileSync(file, "utf8"))) failures.push(`${file} carries a stacked-stone mark`);
}

// The pebble era's rasters are gone.
for (const file of walk("public")) {
  if (/pocket-(chalk|granite|basalt|ochre)|home-granite|hallway|pebble|stone/i.test(file)) failures.push(`stone-era asset still ships: ${file}`);
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("controls flagged (old icon, old glyph); favicon and logo are the dial; no stones ship");
console.log("BRAND_OK");
