#!/usr/bin/env node
// G4: axe-core finds no serious or critical violations at desktop and phone
// widths, in the noisy hero and again after the quiet, with error states shown.
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
    if (viewport.width < 900) await page.getByRole("button", { name: "Route" }).click();

    for (const state of ["noisy", "quiet"]) {
      if (state === "quiet") {
        // Scrolling back through the hero toggles the scroll-driven quiet; wait
        // for it to settle noisy at the top before pressing the button.
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => document.documentElement.dataset.quiet === "false", null, { timeout: 15000 });
        await page.locator("#top").getByRole("button", { name: "Tap to quiet" }).click();
        await page.waitForFunction(() => document.documentElement.dataset.quiet === "true");
        await page.waitForFunction(
          () => [...document.querySelectorAll("#top ul[aria-hidden] > li")].every((li) => getComputedStyle(li).visibility === "hidden" || getComputedStyle(li).display === "none"),
          null,
          { timeout: 15000 },
        );
      }
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      console.log(`${viewport.width}px ${state}: ${result.violations.length} violations, ${serious.length} serious or critical`);
      for (const v of result.violations) {
        console.log(`  ${v.impact} ${v.id}: ${v.help}`);
        for (const n of v.nodes.slice(0, 4)) console.log(`    ${n.target.join(" ")} ${n.failureSummary?.split("\n")[1] ?? ""}`);
      }
      bad += serious.length;
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (bad) process.exit(1);
console.log("AXE_OK");
