#!/usr/bin/env node
// G2: the hero's first screen is calm and its buttons work at common window
// sizes, and scrolling tells the story: the notifications (real apps) arrive
// a few at a time as you scroll, and one after another however fast you go,
// then the dial zooms and clicks to Desk, Room and Home (where the zone is a
// pool with no rim), and back again.
import { chromium } from "playwright";
import { serve } from "./serve-out.mjs";

// BASE points it at a running server instead (for example the dev server).
const server = process.env.BASE ? null : await serve(0);
const base = process.env.BASE ?? `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
};
const REAL = ["WhatsApp", "TikTok", "Instagram", "YouTube", "Snapchat", "Discord", "Netflix", "Reddit", "X"];
const SIZES = [
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [768, 1024],
  [390, 844],
];

async function open(width, height) {
  const mobile = width < 600;
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return { context, page, errors };
}

// The banners, as the page shows them: state and whether they can be seen.
const banners = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#top ul[aria-hidden] > li")].map((li) => ({
      state: li.dataset.state,
      seen: Number(getComputedStyle(li.firstElementChild).opacity) > 0.5,
      name: li.querySelector("strong")?.textContent ?? "",
      icon: !!li.querySelector("svg path[d]"),
    })),
  );
const level = (page) => page.evaluate(() => Number(document.querySelector("#top")?.dataset.level));
const zoom = (page) => page.evaluate(() => Number(document.querySelector("#top [role=slider]")?.parentElement?.style.getPropertyValue("--zoom") || 1));
const waitFor = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true, () => false);
// Scroll the track to a share of its length in small steps, like a wheel would.
async function scrollTo(page, p) {
  const target = await page.evaluate((p) => {
    const track = document.querySelector("#top > div");
    return Math.round(track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * p);
  }, p);
  let y = await page.evaluate(() => scrollY);
  while (Math.abs(target - y) > 4) {
    y += Math.sign(target - y) * Math.min(140, Math.abs(target - y));
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(900);
}

try {
  // ——— The first screen, at every size: calm, and the buttons on top ———
  for (const [w, h] of SIZES) {
    const { context, page, errors } = await open(w, h);
    const covered = await page.evaluate(() => {
      const out = [];
      for (const a of document.querySelectorAll("#top .btn")) {
        const r = a.getBoundingClientRect();
        for (const x of [r.left + 6, r.left + r.width / 2, r.right - 6]) {
          const top = document.elementFromPoint(x, r.top + r.height / 2);
          if (!top || !(top === a || a.contains(top))) out.push(`${a.textContent.trim()} at ${Math.round(x)}`);
        }
      }
      return out;
    });
    check(covered.length === 0, `${w}×${h}: both buttons are on top${covered.length ? ` (covered: ${covered.join(", ")})` : ""}`);
    const b = await banners(page);
    check(b.length === 9 && b.every((x) => x.state === "waiting" && !x.seen), `${w}×${h}: no notification shows before scrolling`);
    if (w === 1366 || w === 390) {
      for (const [name, target] of [
        ["Pre-order", "#preorder"],
        ["How it works", "#how"],
      ]) {
        // A fresh load for each, so the smooth scroller starts at the top.
        await page.goto(base, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        await page.locator("#top").getByRole("link", { name: new RegExp(`^${name}`) }).click();
        const arrived = await waitFor(page, (s) => {
          const r = document.querySelector(s).getBoundingClientRect();
          return r.top < innerHeight * 0.4 && r.bottom > 0;
        }, target);
        check(arrived, `${w}×${h}: ${name} takes you to ${target}`);
      }
    }
    check(errors.length === 0, `${w}×${h}: no page errors${errors.length ? `: ${errors[0]}` : ""}`);
    await context.close();
  }

  // ——— The story, on a laptop and a phone ———
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
  ]) {
    const { context, page } = await open(w, h);
    // The notifications arrive across the first half of the track (5% to
    // 47%), a few for each stretch of scroll, not all at once.
    await scrollTo(page, 0.2);
    const early = (await banners(page)).filter((x) => x.state === "shown" && x.seen).length;
    check(early >= 2 && early <= 4, `${w}: a fifth of the way in, only the first few have arrived (${early} shown)`);
    await scrollTo(page, 0.33);
    let b = await banners(page);
    const shown = b.filter((x) => x.state === "shown" && x.seen);
    check(shown.length >= 5 && shown.length <= 7 && (await level(page)) === 0, `${w}: scrolling on brings more in (${shown.length} shown) with the dial still off`);
    check(shown.every((x) => REAL.includes(x.name) && x.icon), `${w}: each is a real app with its icon (${shown.map((x) => x.name).join(", ")})`);
    await scrollTo(page, 0.46);
    b = await banners(page);
    check(b.filter((x) => x.state === "shown").length === 9 && (await level(page)) === 0, `${w}: all nine are in just before the dial turns`);
    // The dial holds the full crowd for a beat before its first click.
    await scrollTo(page, 0.58);
    check(await waitFor(page, () => document.querySelector("#top")?.dataset.level === "1"), `${w}: then the dial clicks to Desk`);
    // The punch winds up before it lands, so wait for the zoom to settle in.
    await waitFor(page, () => Number(document.querySelector("#top [role=slider]")?.parentElement?.style.getPropertyValue("--zoom") || 1) > 1.05, null, 4000);
    const z = await zoom(page);
    check(z > 1.05, `${w}: and zooms in (zoom ${z.toFixed(2)})`);
    b = await banners(page);
    check(b.some((x) => x.state === "gone") && b.some((x) => x.state === "shown"), `${w}: Desk sweeps away the nearest notifications, not all`);
    await scrollTo(page, 0.73);
    check(await waitFor(page, () => document.querySelector("#top")?.dataset.level === "2"), `${w}: scrolling on turns it to Room`);
    await scrollTo(page, 0.9);
    check(await waitFor(page, () => document.querySelector("#top")?.dataset.level === "3"), `${w}: and to Home`);
    b = await banners(page);
    check(b.every((x) => x.state !== "shown"), `${w}: at Home no notification is left`);
    check((await page.evaluate(() => document.querySelector("#top").dataset.theme)) === "night", `${w}: and night has fallen`);
    // At Home the zone is only a pool of violet: no rim line at the window's edges.
    const rim = await page.evaluate(() => document.querySelector("#top").style.getPropertyValue("--rim"));
    check(rim !== "" && Number(rim) === 0, `${w}: at Home the zone has no rim (--rim ${rim || "unset"})`);
    await scrollTo(page, 0);
    b = await banners(page);
    check((await level(page)) === 0 && b.every((x) => x.state === "waiting"), `${w}: scrolling back returns it to Off and calm`);
    await context.close();
  }

  // ——— A flick: however fast the scroll, they land one after another ———
  {
    const { context, page } = await open(1440, 900);
    await page.evaluate(() => {
      window.__landed = [];
      const seen = new Set();
      new MutationObserver((list) => {
        for (const m of list) {
          const li = m.target;
          if (li.dataset.state === "shown" && !seen.has(li)) {
            seen.add(li);
            window.__landed.push(performance.now());
          }
        }
      }).observe(document.querySelector("#top ul[aria-hidden]"), { subtree: true, attributes: true, attributeFilter: ["data-state"] });
    });
    // One jump to just before Desk, as a fast wheel or a trackpad fling would.
    await page.evaluate(() => {
      const track = document.querySelector("#top > div");
      window.scrollTo(0, Math.round(track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * 0.46));
    });
    await waitFor(page, () => window.__landed.length === 9);
    const landed = await page.evaluate(() => window.__landed);
    const gaps = landed.slice(1).map((t, i) => t - landed[i]);
    const least = gaps.length ? Math.min(...gaps) : 0;
    // 140ms apart by design; timers never fire early, so allow only their jitter.
    check(landed.length === 9 && least >= 120, `a flick still lands them one at a time (${landed.length} landed, at least ${Math.round(least)}ms apart)`);
    check((await level(page)) === 0, "and the dial waits for the crowd before it turns");
    await context.close();
  }
} finally {
  await browser.close();
  server?.close();
}

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("HERO_OK");
