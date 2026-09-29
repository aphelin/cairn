#!/usr/bin/env node
// G3: each mode has its own colour, and the page and the 3D dial both take it.
// The expected colours are read from lib/modes.ts and app/globals.css, which
// must agree; then, in a real browser, at Desk, Room and Home:
//   - the root's --mode resolves to that mode's colour, and the three differ;
//   - the hero's detent thumb is painted with it;
//   - the dial's light settles on it (the stage reports it on its canvas).
// At Off, --mode is unset: the control that proves the check can see a change.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { serve } from "./serve-out.mjs";

const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
};

const ts = readFileSync("lib/modes.ts", "utf8");
const fromTs = JSON.parse(`[${ts.match(/MODE_HEX = \[([^\]]+)\]/)[1].replace(/'/g, '"')}]`).map((h) => h.toLowerCase());
const css = readFileSync("app/globals.css", "utf8");
const token = (name) => css.match(new RegExp(`--mode-${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1]?.toLowerCase();
const expected = ["desk", "room", "home"].map(token);
check(expected.every(Boolean), `the stylesheet defines --mode-desk, --mode-room and --mode-home (${expected.join(", ")})`);
check(expected.every((h, i) => h === fromTs[i + 1]), "lib/modes.ts and the stylesheet agree on every mode's colour");
check(new Set(expected).size === 3, "the three modes have three different colours");

const hex = (rgb) => {
  const m = rgb.match(/\d+(\.\d+)?/g);
  return m ? `#${m.slice(0, 3).map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("")}` : rgb;
};

const server = process.env.BASE ? null : await serve(0);
const base = process.env.BASE ?? `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.mouse.move(40, 40);
  await page.waitForFunction(() => document.documentElement.dataset.gl === "ready", null, { timeout: 90000 }).catch(() => {});
  const read = () =>
    page.evaluate(() => ({
      mode: getComputedStyle(document.documentElement).getPropertyValue("--mode").trim(),
      thumb: getComputedStyle(document.querySelector("#top [role=radiogroup] > span")).backgroundColor,
      tint: document.querySelector("canvas[data-stage=dial]")?.dataset.tint ?? "",
      level: document.querySelector("#top").dataset.level,
    }));
  const off = await read();
  check(off.mode === "", `control: at Off, --mode is unset ("${off.mode}")`);
  // Into the track, where the control is out, then each mode by its button.
  await page.evaluate(() => {
    const track = document.querySelector("#top > div");
    window.scrollTo(0, track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * 0.3);
  });
  await page.waitForTimeout(1200);
  // Back to Desk at the end: the dial's light starts in Desk's colour, so only
  // a return from Home proves it changes back.
  for (const [i, name] of [
    [0, "Desk"],
    [1, "Room"],
    [2, "Home"],
    [0, "Desk"],
  ]) {
    await page.locator("#top").getByRole("radio", { name: new RegExp(`^${name}`) }).click();
    await page.waitForFunction((v) => document.querySelector("#top").dataset.level === String(v), i + 1, { timeout: 10000 });
    await page.waitForFunction((h) => document.querySelector("canvas[data-stage=dial]")?.dataset.tint === h, expected[i], { timeout: 20000 }).catch(() => {});
    // The thumb's colour eases in; wait for it rather than for a fixed time.
    await page
      .waitForFunction(
        (h) => {
          const m = getComputedStyle(document.querySelector("#top [role=radiogroup] > span")).backgroundColor.match(/\d+/g);
          return m && `#${m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, "0")).join("")}` === h;
        },
        expected[i],
        { timeout: 5000 },
      )
      .catch(() => {});
    const r = await read();
    check(r.mode.toLowerCase() === expected[i], `${name}: the page's --mode is ${r.mode}`);
    check(hex(r.thumb) === expected[i], `${name}: the detent thumb is ${hex(r.thumb)}`);
    check(r.tint === expected[i], `${name}: the dial's light settles on ${r.tint || "(nothing)"}`);
  }
} finally {
  await browser.close();
  server?.close();
}

if (failures.length) process.exit(1);
console.log("MODES_OK");
