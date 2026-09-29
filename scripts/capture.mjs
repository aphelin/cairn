#!/usr/bin/env node
// Review captures. Usage:
//   node scripts/capture.mjs <url> <out-dir> [--hero] [--full]
// --hero: the hero at 1440 and 390: calm, the noise arriving, Desk, and Home.
// --full: the page a viewport at a time at 1440 and 390 (pinned sections make
//         a single full-page shot lie), stitched into desktop.png and mobile.png.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [url = "http://127.0.0.1:3300/", out = ".impeccable/review"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
mkdirSync(out, { recursive: true });

// Headless Chromium hints fonts in a way no device does; turn it off so type
// spacing in the captures matches a real screen.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--font-render-hinting=none"] });
const sizes = [
  { name: "desktop", viewport: { width: 1440, height: 900 } },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

async function open(size) {
  const context = await browser.newContext({ viewport: size.viewport, isMobile: size.isMobile, hasTouch: size.hasTouch, deviceScaleFactor: size.deviceScaleFactor ?? 1 });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${size.name}] pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && console.log(`[${size.name}] console: ${m.text()}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // Intent starts WebGL.
  await page.keyboard.press("Shift");
  await page.waitForFunction(() => document.documentElement.dataset.gl === "ready", null, { timeout: 30000 }).catch(() => console.log("no gl"));
  await page.waitForTimeout(1500);
  return { context, page };
}

try {
  for (const size of sizes) {
    if (flags.has("--hero")) {
      const { context, page } = await open(size);
      // The hero's beats, reached by scrolling its pinned track step by step:
      // calm at the top, the noise arriving, the click to Desk, and Home.
      const range = await page.evaluate(() => {
        const t = document.querySelector("#top > div");
        return t.offsetHeight - innerHeight;
      });
      let y = 0;
      // The noise arrives between 5% and 47%; Desk, Room and Home click at
      // 51%, 66% and 81%.
      for (const [name, p] of [
        ["off", 0],
        ["noise", 0.33],
        ["desk", 0.58],
        ["home", 0.9],
      ]) {
        const target = Math.round(range * p);
        while (Math.abs(target - y) > 4) {
          y += Math.sign(target - y) * Math.min(140, Math.abs(target - y));
          await page.evaluate((v) => window.scrollTo(0, v), y);
          await page.waitForTimeout(40);
        }
        await page.waitForTimeout(3200);
        await page.screenshot({ path: join(out, `hero-${size.name}-${name}.png`) });
      }
      await context.close();
    }
    if (flags.has("--full")) {
      const { context, page } = await open(size);
      const slices = join(out, "slices");
      mkdirSync(slices, { recursive: true });
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const vh = size.viewport.height;
      const files = [];
      for (let y = 0, i = 0; y < height; y += vh, i++) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        // Let scroll-driven motion and the travelling dial settle.
        await page.waitForTimeout(2200);
        const file = join(slices, `${size.name}-${String(i).padStart(2, "0")}.png`);
        await page.screenshot({ path: file });
        files.push(file);
      }
      execFileSync("magick", [...files, "-append", join(out, `${size.name}.png`)]);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
