#!/usr/bin/env node
// Renders the still images of the devices from the live WebGL scene, so the
// stills and the canvas share one source and one framing. Each still is the
// anchor's own box, captured with everything but the canvas hidden and the
// background left transparent, so it sits on any section like the canvas does.
// Usage: node scripts/render-stills.mjs [url]   (a dev or static server)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2] ?? "http://localhost:3311/";
const outDir = "public/stills";
const work = join(process.env.TMPDIR || tmpdir(), "cairn-stills");
const impeccable = process.env.IMPECCABLE_BIN || join(homedir(), ".claude/skills/impeccable/scripts/impeccable");
mkdirSync(outDir, { recursive: true });
mkdirSync(work, { recursive: true });

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
// Frozen: no pointer lean and no easing, so each still is the device at rest.
// Set after hydration (which would drop it) and before WebGL starts, which
// is when the stage reads it.
await page.evaluate(() => document.documentElement.setAttribute("data-dial-freeze", ""));
await page.keyboard.press("Shift");
await page.waitForFunction(() => document.documentElement.dataset.gl === "ready", null, { timeout: 60000 });

// The finishes by their ids, as the page names them.
const NAMES = { night: "Graphite", silver: "Natural", sage: "Sage", chalk: "Chalk" };

async function centre(selector) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2);
  }, selector);
  await page.waitForTimeout(1200);
}

// `feather` fades the still's alpha to nothing over that share of its width
// at the left and right edges. The canvas draws a dial's floor shadow wider
// than the anchor, so a still clipped to the box would end it in a hard edge.
async function shoot(selector, name, what, { feather = 0 } = {}) {
  const box = await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, selector);
  await page.addStyleTag({
    content: "html,body{background:transparent!important} body>*:not(canvas){visibility:hidden!important}",
  });
  await page.waitForTimeout(300);
  const png = join(work, `${name}.png`);
  // Software WebGL can take a while per frame on the close-ups, more so on a busy machine.
  await page.screenshot({ path: png, clip: box, omitBackground: true, timeout: 180000 });
  await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent?.includes("visibility:hidden!important") && s.remove()));
  const webp = join(outDir, `${name}.webp`);
  const fade = feather
    ? ["-channel", "A", "-fx", `ramp=max(0,min(1,min(i,w-1-i)/(${feather}*w))); u*ramp*ramp*(3-2*ramp)`, "+channel"]
    : [];
  execFileSync("magick", [png, ...fade, "-quality", "88", "-define", "webp:alpha-quality=92", webp]);
  execFileSync(impeccable, [
    "embed-prompt",
    webp,
    "--prompt",
    `Origin: rendered from the site's own WebGL scene (components/dial/stage.ts, geometry.ts, materials.ts and studio.ts: procedural geometry, turned-titanium materials and a baked studio, no generated imagery), captured by scripts/render-stills.mjs as the still for ${what}.`,
  ]);
  console.log(`wrote ${webp}`);
}

try {
  // The hero at Off, in daylight, before anything is scrolled.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await shoot('#top [data-dial="home"]', "home-night-off", "Cairn Home in Graphite at Off, in daylight (the hero)");

  // Home and Pocket in their tiles. Scrolling past the hero has turned the
  // dial to Home, as it has for a visitor, so the tiles show it lit violet.
  await centre('#devices [data-dial="home"]');
  await shoot('#devices [data-dial="home"]', "home-night-room", "Cairn Home in Graphite at Home (the devices tile)");
  await shoot('#devices [data-dial="pocket"]', "pocket-night", "Cairn Pocket in Graphite, stuck to the wall face on (the devices tile)");

  // The dial in the exploded view's night, still assembled, at Home.
  await centre('#inside [data-dial="home"]');
  await shoot('#inside [data-dial="home"]', "home-night-home", "Cairn Home in Graphite at Home, at night (the exploded view before it opens)");

  // Every finish, the whole dial a little above eye level, at Home, in
  // daylight (the finishes window's studio sweep).
  for (const finish of ["night", "silver", "sage", "chalk"]) {
    await centre('#finishes [data-dial="home"]');
    // Clicked from script, so the pointer never moves and never tilts the dial.
    await page.evaluate((f) => document.querySelector(`#finishes input[value="${f}"]`).click(), finish);
    await page.waitForTimeout(1600);
    // The dial stands about 6% in from the box's sides; its shadow runs on.
    await shoot('#finishes [data-dial="home"]', `home-${finish}-studio`, `Cairn Home in ${NAMES[finish]} at Home, the whole dial in daylight (the finishes window)`, { feather: 0.045 });
  }

  // The material tile: Graphite, close up at the glass band, at night.
  await page.evaluate(() => document.querySelector('#finishes input[value="night"]').click());
  await centre('#details [data-dial="home"]');
  await shoot('#details [data-dial="home"]', "detail-macro", "Cairn Home in Graphite, close up at the glass band, at night (the material tile)");

  // Every finish beside the order form, at Home, at night.
  for (const finish of ["night", "silver", "sage", "chalk"]) {
    await page.evaluate((f) => document.querySelector(`#preorder input[value="${f}"]`).click(), finish);
    await centre('#preorder [data-dial="home"]');
    await page.waitForTimeout(600);
    await shoot('#preorder [data-dial="home"]', `home-${finish}-order`, `Cairn Home in ${NAMES[finish]} at Home, at night (the pre-order)`);
  }
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
