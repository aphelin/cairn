#!/usr/bin/env node
// G4: axe-core finds no serious or critical violations at desktop and phone
// widths, at the hero's calm first screen, with the noise in, and at Home
// (night), with error states shown; and once more after a visitor has played
// with the page: Pocket tapped to lock, a part of the exploded view picked
// out (the other names dim), and the time-back share set to Most.
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { serve } from "./serve-out.mjs";

const server = await serve(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let bad = 0;

try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Error states, so their markup is audited too.
    await page.locator("#preorder button[type=submit]").click();
    await page.locator("form", { hasText: "Send a note" }).getByRole("button", { name: "Send note" }).click();
    if (viewport.width < 980) await page.getByRole("button", { name: "Menu" }).click();

    // Three moments of the hero: the calm first screen, the noise arriving,
    // and Home (night). Each is reached by scrolling the pinned track.
    const scrollTrack = async (p) => {
      const target = await page.evaluate((p) => {
        const track = document.querySelector("#top > div");
        return Math.round(track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * p);
      }, p);
      let y = await page.evaluate(() => scrollY);
      while (Math.abs(target - y) > 4) {
        y += Math.sign(target - y) * Math.min(160, Math.abs(target - y));
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await page.waitForTimeout(30);
      }
    };
    const audit = async (state) => {
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      console.log(`${viewport.width}px ${state}: ${result.violations.length} violations, ${serious.length} serious or critical`);
      for (const v of result.violations) {
        console.log(`  ${v.impact} ${v.id}: ${v.help}`);
        for (const n of v.nodes.slice(0, 4)) console.log(`    ${n.target.join(" ")} ${n.failureSummary?.split("\n")[1] ?? ""}`);
      }
      bad += serious.length;
    };
    // The notifications arrive between 5% and 47% of the track; Home clicks at 81%.
    for (const [state, p, level, theme] of [
      ["calm", 0, "0", "day"],
      ["noise", 0.33, "0", "day"],
      ["home", 0.9, "3", "night"],
    ]) {
      await scrollTrack(p);
      await page.waitForFunction(([l, t]) => document.querySelector("#top")?.dataset.level === l && document.querySelector("#top")?.dataset.theme === t, [level, theme], { timeout: 15000 });
      // The zone animates the page's colours over about a second, and the
      // notifications spring in; measure the settled page.
      await page.waitForTimeout(1800);
      await audit(state);
    }
    await scrollTrack(0);

    // After some play, top to bottom: Pocket locked, a part picked out in the
    // exploded view (on wide screens, where the names sit beside the dial),
    // and the share at Most.
    const to = async (selector, share = 0) => {
      await page.evaluate(([s, f]) => {
        const el = document.querySelector(s);
        window.scrollTo(0, el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * f);
      }, [selector, share]);
      await page.waitForTimeout(500);
    };
    // The menu (opened above for its own audit) would cover the page.
    if (viewport.width < 980) await page.keyboard.press("Escape");
    await to("#tap");
    await page.locator("#tap").getByRole("button", { name: "Tap to lock" }).click();
    await page.waitForFunction(() => document.querySelector("#tap [role=status]")?.textContent.trim() === "Locked.", null, { timeout: 15000 });
    if (viewport.width > 820) {
      await to("#inside > div", 0.8);
      await page.waitForFunction(() => Number(document.querySelector("#inside ol li:last-child")?.style.getPropertyValue("--show")) > 0.9, null, { timeout: 30000 });
      await page.locator("#inside ol li").nth(5).getByRole("button").click();
      await page.waitForFunction(() => document.querySelector("#inside ol li:nth-child(6)")?.hasAttribute("data-on"), null, { timeout: 15000 });
    }
    await to("#time");
    await page.locator("#time label", { hasText: "Most" }).click();
    await page.waitForTimeout(1800);
    await audit("played");
    await scrollTrack(0);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (bad) process.exit(1);
console.log("AXE_OK");
