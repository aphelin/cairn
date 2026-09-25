#!/usr/bin/env node
// Renders the still images of the stone from the live WebGL scene, so the
// stills and the canvas share one source and one framing. Each still is the
// anchor's own box, captured with everything but the stone canvas hidden.
// Usage: node scripts/render-stills.mjs [url]   (a dev or static server)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2] ?? "http://localhost:3300/";
const outDir = "public/stills";
const work = join(process.env.TMPDIR || tmpdir(), "cairn-stills");
const impeccable = process.env.IMPECCABLE_BIN || join(homedir(), ".claude/skills/impeccable/scripts/impeccable");
mkdirSync(outDir, { recursive: true });
mkdirSync(work, { recursive: true });

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
// No idle spin, and the pointer stays centred: the still is the stone at rest.
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.documentElement.setAttribute("data-stone-freeze", ""));
await page.keyboard.press("Shift");
await page.waitForFunction(() => document.documentElement.dataset.gl === "ready", null, { timeout: 60000 });

async function centre(selector) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2);
  }, selector);
  await page.waitForTimeout(900);
}

async function shoot(selector, name) {
  await centre(selector);
  const box = await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, selector);
  await page.addStyleTag({
    content: "html,body{background:transparent!important} body>*:not(canvas){visibility:hidden!important}",
  });
  await page.waitForTimeout(250);
  const png = join(work, `${name}.png`);
  await page.screenshot({ path: png, clip: box, omitBackground: true });
  await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent?.includes("visibility:hidden!important") && s.remove()));
  const webp = join(outDir, `${name}.webp`);
  execFileSync("magick", [png, "-resize", "800x560!", "-quality", "86", "-define", "webp:alpha-quality=90", webp]);
  execFileSync(impeccable, [
    "embed-prompt",
    webp,
    "--prompt",
    `Origin: rendered from the site's own WebGL stone (components/stone/stone.ts, procedural geometry and shader, no generated imagery), captured by scripts/render-stills.mjs as the still for the ${name.replace("-", " stone in ")} colour.`,
  ]);
  console.log(`wrote ${webp}`);
}

try {
  for (const colour of ["chalk", "granite", "basalt", "ochre"]) {
    await centre("#colours");
    // Clicked from script, so the pointer never moves and never tilts the stone.
    await page.evaluate((c) => document.querySelector(`#colours input[value="${c}"]`).click(), colour);
    await page.waitForTimeout(1600); // the colour eases over 0.6 s
    await shoot('#colours [data-stone="main"]', `pocket-${colour}`);
  }
  await page.evaluate(() => document.querySelector('#colours input[value="granite"]').click());
  await page.waitForTimeout(1600);
  await shoot('#stones [data-stone="home"]', "home-granite");
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
