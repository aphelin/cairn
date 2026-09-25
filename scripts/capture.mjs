#!/usr/bin/env node
// Review captures. Usage:
//   node scripts/capture.mjs <url> <out-dir> [--hero] [--full]
// --hero: the hero at 1440 and 390, noisy and quiet (after the button).
// --full: full-page captures at 1440 and 390, with the page scrolled through
//         once so every stone and lazy image has rendered.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [url = "http://127.0.0.1:3300/", out = ".impeccable/review"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
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
  // Intent starts the WebGL stone.
  await page.mouse.move(200, 300);
  await page.waitForFunction(() => document.documentElement.dataset.gl === "ready", null, { timeout: 30000 }).catch(() => console.log("no gl"));
  await page.waitForTimeout(600);
  return { context, page };
}

try {
  for (const size of sizes) {
    if (flags.has("--hero")) {
      const { context, page } = await open(size);
      await page.screenshot({ path: join(out, `hero-${size.name}-noisy.png`) });
      await page.getByRole("button", { name: "Tap to quiet" }).click();
      await page.waitForTimeout(2600);
      await page.screenshot({ path: join(out, `hero-${size.name}-quiet.png`) });
      await context.close();
    }
    if (flags.has("--full")) {
      const { context, page } = await open(size);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 500) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.waitForTimeout(60);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(800);
      // Sticky and fixed layers make a stitched full-page shot lie, so capture
      // one viewport at a time down the page.
      const vh = size.viewport.height;
      let i = 0;
      for (let y = 0; y < height; y += vh) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(out, `${size.name}-${String(i++).padStart(2, "0")}.png`) });
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
