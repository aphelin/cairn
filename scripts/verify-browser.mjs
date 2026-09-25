#!/usr/bin/env node
// G3: the page works in a real browser, against the static export.
import { chromium } from "playwright";
import { serve } from "./serve-out.mjs";

const server = await serve(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
};

async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  return { context, page, errors };
}

// Wait for a state rather than a fixed time, so a busy machine can't fake a failure.
const waitFor = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true, () => false);
const quiet = (page) => page.evaluate(() => document.documentElement.dataset.quiet);
const waitQuiet = (page, v) => waitFor(page, (v) => document.documentElement.dataset.quiet === v, v);
const visibleBanners = (page) =>
  page.evaluate(() => [...document.querySelectorAll("#top ul[aria-hidden] > li")].filter((li) => getComputedStyle(li).display !== "none" && getComputedStyle(li).visibility !== "hidden").length);
const navOn = (page) => page.getAttribute("header[data-on]", "data-on");
const waitNav = (page, g) => waitFor(page, (g) => document.querySelector("header[data-on]")?.dataset.on === g, g, 6000);
const scrollTrack = async (page, p) => {
  await page.evaluate((p) => {
    const track = document.querySelector("#top");
    const top = track.getBoundingClientRect().top + scrollY;
    window.scrollTo(0, top + (track.offsetHeight - innerHeight) * p);
  }, p);
};
const goTo = async (page, selector) => {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 60);
  }, selector);
  await page.waitForTimeout(300);
};
const quietButton = (page) => page.locator("#top").getByRole("button", { name: /Tap to quiet|Bring the noise back/ });

try {
  // ——— Desktop: the noise, and the four ways to quiet it ———
  {
    const { context, page, errors } = await open();
    check((await quiet(page)) === "false", "the hero opens noisy");
    check((await visibleBanners(page)) === 9, "nine notifications litter the field");
    check((await navOn(page)) === "yellow", "the signpost sits on the yellow ground");

    await page.getByRole("button", { name: "Tap to quiet" }).click();
    await waitQuiet(page, "true");
    await waitFor(page, () => [...document.querySelectorAll("#top ul[aria-hidden] > li")].every((li) => getComputedStyle(li).visibility === "hidden"));
    check((await visibleBanners(page)) === 0, "the button pushes every notification off the page");
    check(/Locked/.test(await page.locator("#top").innerText()), "the phone shows it's locked");
    await page.getByRole("button", { name: "Bring the noise back" }).click();
    await waitQuiet(page, "false");
    await waitFor(page, () => [...document.querySelectorAll("#top ul[aria-hidden] > li")].every((li) => getComputedStyle(li).visibility !== "hidden"));
    check((await visibleBanners(page)) === 9, "quiet can be undone");

    await quietButton(page).focus();
    await page.keyboard.press("Enter");
    check(await waitQuiet(page, "true"), "the keyboard quiets it");
    await page.keyboard.press("Enter");
    await waitQuiet(page, "false");

    // Drag the phone down onto the stone.
    const drag = async () => {
      const { x, y, reach } = await page.evaluate(() => {
        const phone = document.querySelector("#top [class*=phone]");
        const stone = document.querySelector('#top [data-stone="main"]');
        const p = phone.getBoundingClientRect();
        const s = stone.getBoundingClientRect();
        return { x: p.left + p.width / 2, y: p.top + p.height / 2, reach: s.top + s.height * 0.3 - p.bottom };
      });
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(x, y + ((reach + 12) * i) / 12);
      await page.mouse.up();
    };
    await drag();
    check(await waitQuiet(page, "true"), "dragging the phone onto the stone quiets it");
    await page.waitForTimeout(1200);
    await drag();
    check(await waitQuiet(page, "false"), "tapping the stone again brings the noise back");

    await scrollTrack(page, 0.65);
    check(await waitQuiet(page, "true"), "scrolling lowers the phone onto the stone");
    await scrollTrack(page, 0);
    check(await waitQuiet(page, "false"), "scrolling back up brings the noise back");

    check(await waitFor(page, () => document.documentElement.dataset.gl === "ready", null, 30000), "the 3D stone took over from its still");

    // The signpost follows you: the ground below, and where you are.
    for (const [selector, g] of [
      ["#how", "chalk"],
      ["#stones", "blue"],
      ["#colours", "green"],
      ["#app", "chalk"],
      ["#time", "yellow"],
      ["#preorder", "yellow"],
      ["#faq", "chalk"],
      ["#contact", "blue"],
    ]) {
      await goTo(page, selector);
      check(await waitNav(page, g), `the signpost takes the ${g} ground over ${selector}`);
    }
    await goTo(page, "#stones");
    check(
      await waitFor(page, () => document.querySelector('header nav a[href="#stones"]')?.getAttribute("aria-current") === "location"),
      "the stones plate says you are here",
    );
    check(await page.locator('header nav a[href="#how"][data-back]').count() === 1, "a plate behind you points back");

    // Home's range
    const range = page.locator("#stones input[type=range]");
    await range.fill("10");
    check((await page.locator("#stones output").innerText()) === "10 m", "Home's range slider sets 10 m");

    // A stone's own pre-order prefills the order
    await page.getByRole("link", { name: "Pre-order Home" }).click();
    await waitFor(page, () => document.querySelector("#preorder")?.innerText.includes("Reserve for $49"));
    const outputs = await page.locator("#preorder [role=group] output").allInnerTexts();
    check(outputs.join(",") === "0,1", `Pre-order Home puts one Home stone in the order (${outputs.join(",")})`);

    // Colours
    await goTo(page, "#colours");
    await page.locator("#colours label", { hasText: "Basalt" }).click();
    check(/Basalt\./.test(await page.locator("#colours [aria-live]").innerText()), "picking Basalt names it");
    check(await page.locator('#preorder input[value="basalt"]').isChecked(), "the colour carries into the pre-order");

    // The app demo
    await goTo(page, "#app");
    const chat = page.locator("#app").getByRole("button", { name: /Group chat/ });
    await chat.click();
    check((await chat.getAttribute("aria-pressed")) === "true", "placing a stone on Group chat locks it");
    await waitFor(page, () => /5 of 9/.test(document.querySelector("#app [aria-live]")?.textContent ?? ""));
    check(/5 of 9/.test(await page.locator("#app [aria-live]").first().innerText()), "the locked count springs to 5");
    await page.getByRole("button", { name: "Longer limit" }).click();
    await waitFor(page, () => document.querySelector("#app output")?.textContent === "1h 45m");
    check((await page.locator("#app output").innerText()) === "1h 45m", "the limit steps to 1h 45m");
    check(/15m less than last week/.test(await page.locator("#app").innerText()), "the trend follows the limit");
    const bedtime = page.getByRole("switch", { name: "Bedtime" });
    await bedtime.click();
    check((await bedtime.getAttribute("aria-checked")) === "false", "a schedule switches off");

    // Time back
    await goTo(page, "#time");
    await page.locator("#time input[type=range]").fill("6");
    await waitFor(page, () => /91 days a year/.test(document.querySelector("#time")?.innerText ?? ""));
    check(/91 days a year/.test(await page.locator("#time").innerText()), "six hours a day is 91 days a year");

    // The buy module
    await goTo(page, "#preorder");
    const total = () => page.locator("#preorder form > div output, #preorder [class*=total] output").last().innerText();
    await page.getByRole("button", { name: "One more Cairn Pocket" }).click();
    check((await total()) === "$88", "two stones are the $88 pair");
    check(/Pair price saves you \$10/.test(await page.locator("#preorder").innerText()), "the pair saving shows");
    await page.getByRole("button", { name: "One more Cairn Pocket" }).click();
    check((await total()) === "$137", "three stones are a pair plus one, $137");
    await page.getByRole("button", { name: "One fewer Cairn Home" }).click();
    await page.getByRole("button", { name: "One fewer Cairn Pocket" }).click();
    check((await total()) === "$49", "one stone is $49");
    check(await page.getByRole("button", { name: "One fewer Cairn Pocket" }).isDisabled(), "the order can't drop to no stones");
    await page.getByRole("button", { name: /Reserve for/ }).click();
    const email = page.locator("#preorder input[type=email]");
    check((await email.getAttribute("aria-invalid")) === "true", "an empty email is flagged");
    check(await email.evaluate((el) => el === document.activeElement), "focus moves to the email");
    await email.fill("walker@example.com");
    await page.getByRole("button", { name: /Reserve for/ }).click();
    check(await page.waitForSelector("text=Reserved. Enjoy the quiet.", { timeout: 4000 }).then(() => true, () => false), "the pre-order confirms");

    // Newsletter and contact
    const news = page.locator("form", { hasText: "Launch news" });
    await news.getByRole("button", { name: "Sign up" }).click();
    check(await news.locator(".field-error").isVisible(), "the newsletter rejects an empty email");
    await news.locator("input").fill("owl@example.com");
    await news.getByRole("button", { name: "Sign up" }).click();
    check(await page.locator("text=You’re on the list").isVisible(), "the newsletter confirms");
    const contact = page.locator("form", { hasText: "Send a note" });
    await contact.getByRole("button", { name: "Send note" }).click();
    check((await contact.locator(".field-error").count()) === 3, "the contact form flags three empty fields");
    await contact.locator('[name="name"]').fill("Ada Lovelace");
    await contact.locator('[name="email"]').fill("ada@example.com");
    await contact.locator('[name="message"]').fill("Does Home work through a wall?");
    await contact.getByRole("button", { name: "Send note" }).click();
    check(await page.waitForSelector("text=Thank you, Ada", { timeout: 4000 }).then(() => true, () => false), "the contact form confirms");

    // FAQ and sound
    const second = page.locator("#faq details").nth(1);
    await second.locator("summary").click();
    check(await second.evaluate((el) => el.open), "the FAQ opens a question");
    const soundButton = page.getByRole("button", { name: "Sound" });
    check((await soundButton.getAttribute("aria-pressed")) === "false", "sound starts off");
    await soundButton.click();
    check((await soundButton.getAttribute("aria-pressed")) === "true", "the sound toggle turns it on");

    check(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
    await context.close();
  }

  // ——— Phone: stills first, then touch ———
  {
    const { context, page, errors } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    check((await page.evaluate(() => document.documentElement.dataset.gl)) === undefined, "a phone paints the still stone before any WebGL");
    await page.getByRole("button", { name: "Tap to quiet" }).tap();
    check(await waitQuiet(page, "true"), "a tap quiets it on a phone");
    check(await waitFor(page, () => document.documentElement.dataset.gl === "ready", null, 30000), "the first touch starts the 3D stone");
    await page.getByRole("button", { name: "Route" }).tap();
    check(await page.locator("#route-panel").isVisible(), "the Route button opens the signpost");
    check((await page.locator("#route-panel a").count()) === 4, "the signpost lists four plates");
    check(errors.length === 0, `no console errors on a phone${errors.length ? `: ${errors.join(" | ")}` : ""}`);
    await context.close();
  }

  // ——— Reduced motion: quiet from the start, no pinned scroll ———
  {
    const { context, page } = await open({ reducedMotion: "reduce" });
    check((await quiet(page)) === "true", "reduced motion starts quiet");
    check((await visibleBanners(page)) === 0, "with no notifications");
    const pinned = await page.evaluate(() => {
      const track = document.querySelector("#top");
      return track.offsetHeight > window.innerHeight * 1.2;
    });
    check(!pinned, "reduced motion drops the pinned scroll");
    await page.getByRole("button", { name: "Bring the noise back" }).click();
    check(await waitQuiet(page, "false"), "the noise can still be brought back, at once");
    await context.close();
  }

  // ——— No horizontal overflow ———
  for (const width of [390, 768, 1280, 1440]) {
    const { context, page } = await open({ viewport: { width, height: 900 } });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 0, `no horizontal overflow at ${width}px`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("BROWSER_OK");
