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
const level = (page) => page.evaluate(() => Number(document.querySelector("#top")?.dataset.level));
const waitLevel = (page, v) => waitFor(page, (v) => document.querySelector("#top")?.dataset.level === String(v), v);
const heroTheme = (page) => page.evaluate(() => document.querySelector("#top")?.dataset.theme);
const bannersLeft = (page) => page.evaluate(() => [...document.querySelectorAll("#top ul[aria-hidden] > li")].filter((li) => li.dataset.state === "shown").length);
const zone = (page, name) => page.locator("#top").getByRole("radio", { name: new RegExp(`^${name}`) });
const scrollTrack = async (page, p) => {
  await page.evaluate((p) => {
    const track = document.querySelector("#top > div");
    const top = track.getBoundingClientRect().top + scrollY;
    window.scrollTo(0, top + (track.offsetHeight - innerHeight) * p);
  }, p);
};
const goTo = async (page, selector, offset = 60) => {
  await page.evaluate(([s, o]) => {
    const el = document.querySelector(s);
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY + o);
  }, [selector, offset]);
  await page.waitForTimeout(400);
};

try {
  // ——— Desktop: the noise, and every way to turn it down ———
  {
    const { context, page, errors } = await open();
    check((await level(page)) === 0, "the hero opens at Off");
    check((await heroTheme(page)) === "day", "on a light page");
    check((await bannersLeft(page)) === 0, "the first screen is calm, with no notifications yet");
    // Into the track: the noise arrives and the control comes out.
    // The notifications arrive across the first half of the track (5% to 47%).
    await scrollTrack(page, 0.48);
    check(await waitFor(page, () => [...document.querySelectorAll("#top ul[aria-hidden] > li")].filter((li) => li.dataset.state === "shown").length === 9), "scrolling in, nine notifications crowd the dial");
    check(await zone(page, "Desk").isVisible(), "and the zone control comes out");

    await zone(page, "Desk").click();
    await waitLevel(page, 1);
    const atDesk = await bannersLeft(page);
    check(atDesk < 9 && atDesk > 0, `Desk sweeps the nearest banners away (${atDesk} left)`);
    await zone(page, "Room").click();
    await waitLevel(page, 2);
    const atRoom = await bannersLeft(page);
    check(atRoom < atDesk && atRoom > 0, `Room sweeps more (${atRoom} left)`);
    await zone(page, "Home").click();
    await waitLevel(page, 3);
    check(await waitFor(page, () => document.querySelector("#top")?.dataset.theme === "night"), "at Home the page is night");
    check((await bannersLeft(page)) === 0, "at Home every banner is gone");
    check(await page.locator("#top [role=status]").getByText("Quiet is on").isVisible(), "the lock message shows");
    await zone(page, "Off").click();
    await waitLevel(page, 0);
    check((await bannersLeft(page)) === 9, "turning back to Off brings the noise back");
    check(await waitFor(page, () => document.querySelector("#top")?.dataset.theme === "day"), "and the day");

    // The keyboard, on the dial itself.
    const dial = page.getByRole("slider", { name: "Cairn Home dial" });
    await dial.focus();
    await page.keyboard.press("ArrowRight");
    check(await waitLevel(page, 1), "the right arrow turns it up a click");
    await page.keyboard.press("End");
    check(await waitLevel(page, 3), "End turns it all the way");
    check((await dial.getAttribute("aria-valuetext")) === "home, 12 metres", "the dial says where it's set");
    await page.keyboard.press("Home");
    check(await waitLevel(page, 0), "Home turns it off");

    // Dragging round the crown, clockwise over the top.
    const box = await dial.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height * 0.42;
    const r = box.width * 0.34;
    await page.mouse.move(cx - r, cy);
    await page.mouse.down();
    for (let i = 1; i <= 24; i++) {
      const a = Math.PI + (Math.PI * i) / 24;
      await page.mouse.move(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.52);
    }
    await page.mouse.up();
    check((await level(page)) >= 2, `dragging the crown clockwise turns it up (to ${await level(page)})`);
    await zone(page, "Off").click();
    await waitLevel(page, 0);

    // Scrolling turns it through every stop, and back.
    // Desk, Room and Home click at 51%, 66% and 81% of the track.
    await scrollTrack(page, 0.9);
    check(await waitLevel(page, 3), "scrolling through the hero turns it to Home");
    await scrollTrack(page, 0);
    check(await waitLevel(page, 0), "scrolling back turns it off");

    check(await waitFor(page, () => document.documentElement.dataset.gl === "ready", null, 30000), "the 3D dial took over from its still");

    // How it works: the 3D house shows each mode's reach.
    await goTo(page, "#how", 200);
    check(await waitFor(page, () => ["ready", "fallback"].includes(document.querySelector("#how figure")?.dataset.scene), null, 30000), "the 3D house loads as How comes into view");
    const houseZones = page.locator("#how").getByRole("radiogroup", { name: "Zone in the model" });
    // Bring the Turn step (where the chips live) on screen first, as a visitor
    // would; scrolling into it sets its own mode, which a pick then overrides.
    await houseZones.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await houseZones.getByRole("radio", { name: /^Home/ }).click();
    check(await waitFor(page, () => document.querySelector("#how")?.dataset.mode === "home"), "picking Home in the house sets its zone to Home");
    // The ring grows frame by frame; on a software renderer that can take a while.
    check(await waitFor(page, () => Number(document.querySelector("#how figure")?.dataset.locked) === 4, null, 30000), "at Home every phone in the house is locked");
    await houseZones.getByRole("radio", { name: /^Desk/ }).click();
    check(await waitFor(page, () => document.querySelector("#how")?.dataset.mode === "desk" && Number(document.querySelector("#how figure")?.dataset.locked) < 4, null, 30000), "Desk reaches only the phone on the desk");
    // Room fills the study and stops at its walls: the desk phone is held,
    // the phone on the bed next door is not.
    await houseZones.getByRole("radio", { name: /^Room/ }).click();
    check(
      await waitFor(page, () => {
        const f = document.querySelector("#how figure");
        return document.querySelector("#how")?.dataset.mode === "room" && f?.querySelector("[data-phone=desk][data-locked]") && !f.querySelector("[data-phone=bed][data-locked]");
      }, null, 30000),
      "Room holds the study and stops at its walls",
    );

    // The nav follows you.
    await goTo(page, "#devices", 200);
    check(await waitFor(page, () => document.querySelector('header nav a[href="#devices"]')?.getAttribute("aria-current") === "location"), "the nav marks the section you're in");

    // Pocket's story: its own 3D scene, told beat by beat as you scroll through it.
    await goTo(page, "#pocket", 200);
    check(await waitFor(page, () => ["ready", "fallback"].includes(document.querySelector("#pocket figure")?.dataset.scene), null, 30000), "Pocket's story loads its 3D scene");
    await page.evaluate(() => {
      const track = document.querySelector("#pocket > div");
      window.scrollTo(0, track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * 0.5);
    });
    check(await waitFor(page, () => Number(document.querySelector("#pocket")?.dataset.beat) >= 2), "scrolling through it reaches the tap");
    await page.evaluate(() => {
      const track = document.querySelector("#pocket > div");
      window.scrollTo(0, track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * 0.97);
    });
    check(await waitFor(page, () => document.querySelector("#pocket")?.dataset.beat === "4"), "and ends by the door");

    // Give it a tap: the button carries the phone over, and a second tap unlocks.
    await goTo(page, "#tap", 0);
    const tap = page.locator("#tap");
    await tap.getByRole("button", { name: "Tap to lock" }).click();
    check(await waitFor(page, () => document.querySelector("#tap")?.hasAttribute("data-locked") && document.querySelector("#tap [role=status]")?.textContent.trim() === "Locked."), "tapping Pocket locks the phone");
    await page.waitForFunction(() => document.querySelector("#tap [data-pose]")?.dataset.pose === "rest", null, { timeout: 10000 }).catch(() => {});
    await tap.getByRole("button", { name: "Tap to unlock" }).click();
    check(await waitFor(page, () => !document.querySelector("#tap")?.hasAttribute("data-locked") && document.querySelector("#tap [role=status]")?.textContent.trim() === "Unlocked."), "and tapping again unlocks it");

    // Pocket's own pre-order prefills the order.
    await page.getByRole("link", { name: "Pre-order Pocket" }).click();
    await page.waitForTimeout(600);
    const outputs = await page.locator("#preorder [role=group] output").allInnerTexts();
    check(outputs.join(",") === "0,1", `Pre-order Pocket puts one Pocket in the order (${outputs.join(",")})`);

    // Finishes carry into the order.
    await goTo(page, "#finishes");
    await page.locator('#finishes input[value="chalk"]').check();
    check(/Chalk\./.test(await page.locator("#finishes [aria-live]").innerText()), "picking Chalk names it");
    check(await page.locator('#preorder input[value="chalk"]').isChecked(), "the finish carries into the pre-order");

    // The exploded view comes apart as you scroll through it.
    await page.evaluate(() => {
      const track = document.querySelector("#inside > div");
      window.scrollTo(0, track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * 0.75);
    });
    check(
      await waitFor(page, () => Number(document.querySelector("#inside ol li:last-child")?.style.getPropertyValue("--show")) > 0.9, null, 30000),
      "the exploded view separates and names its last part",
    );
    // Pointing at a part's name picks it out: the name and its callout light.
    const battery = page.locator("#inside ol li").nth(5).getByRole("button");
    await battery.hover();
    const picked = () =>
      page.evaluate(() => {
        const names = [...document.querySelectorAll("#inside ol li")].map((li) => li.hasAttribute("data-on"));
        const lines = [...document.querySelectorAll("#inside path[data-line]")].map((l) => l.parentElement.hasAttribute("data-on"));
        return `${names.indexOf(true)}:${names.filter(Boolean).length}/${lines.indexOf(true)}:${lines.filter(Boolean).length}`;
      });
    check(await waitFor(page, () => document.querySelector("#inside ol li:nth-child(6)")?.hasAttribute("data-on")), "pointing at Battery picks it out");
    check((await picked()) === "5:1/5:1", `only Battery's name and callout light (${await picked()})`);
    await page.mouse.move(4, 450);
    check(await waitFor(page, () => !document.querySelector("#inside [data-on]")), "moving away lets it go");
    await battery.click();
    check((await battery.getAttribute("aria-pressed")) === "true", "a click pins it");
    // Once the dial goes back together, a pinned part lets go.
    await page.evaluate(() => {
      const track = document.querySelector("#inside > div");
      window.scrollTo(0, track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * 0.05);
    });
    check(await waitFor(page, () => document.querySelector("#inside ol li:nth-child(6) button")?.getAttribute("aria-pressed") === "false"), "and closing the view lets a pinned part go");

    // The app: tabs, switches, search, schedules, and its mode in step with the dial.
    await goTo(page, "#app");
    const app = page.locator("#app");
    const tabs = app.getByRole("tablist", { name: "Cairn app" });
    check(await tabs.isVisible(), "the app has a tab bar");
    await app.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name: /^Room/ }).click();
    check(await waitLevel(page, 2), "picking Room in the app turns the page's dial to Room");
    await app.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name: /^Off/ }).click();
    check(await waitLevel(page, 0), "and Off turns it off");
    await tabs.getByRole("tab", { name: "Apps" }).click();
    check(await app.locator("#cairn-panel-apps").isVisible(), "the Apps tab opens its screen");
    const reddit = app.getByRole("switch", { name: "Lock Reddit" });
    const was = await reddit.getAttribute("aria-checked");
    await reddit.click();
    check(await waitFor(page, (w) => document.querySelector("#cairn-lock-reddit")?.getAttribute("aria-checked") !== w, was), "a lock switch flips");
    await app.getByRole("searchbox", { name: "Search apps" }).or(app.getByRole("textbox", { name: "Search apps" })).fill("tik");
    check(await waitFor(page, () => /TikTok/.test(document.querySelector("#cairn-panel-apps")?.innerText ?? "") && !/Instagram/.test(document.querySelector("#cairn-panel-apps")?.innerText ?? "")), "search narrows the list to TikTok");
    await tabs.getByRole("tab", { name: "Schedules" }).click();
    const bedtime = app.getByRole("switch", { name: "Bedtime" });
    const bed = await bedtime.getAttribute("aria-checked");
    await bedtime.click();
    check((await bedtime.getAttribute("aria-checked")) !== bed, "a schedule switches");
    await tabs.getByRole("tab", { name: "Insights" }).click();
    check(await app.locator("#cairn-panel-insights").isVisible(), "the Insights tab opens its screen");
    await tabs.getByRole("tab", { name: "Today" }).click();

    // The details: an emergency unlock can be spent, and says how many are left.
    await goTo(page, "#details", 300);
    await page.locator("#details").getByRole("button", { name: "Use one" }).click();
    check(/2 left this month/.test(await page.locator("#details").innerText()), "using an emergency unlock leaves two");

    // Time back.
    await goTo(page, "#time");
    await page.locator("#time input[type=range]").fill("6");
    check(await waitFor(page, () => /91 days a year/.test(document.querySelector("#time")?.innerText ?? "")), "six hours a day is 91 days a year");
    // And what Cairn saves: at eight hours, locking most of it away gives back 91 days.
    await page.locator("#time input[type=range]").fill("8");
    await page.locator("#time label", { hasText: "Most" }).click();
    check(
      await waitFor(page, () => /Cairn gives back 91 days/.test(document.querySelector("#time [aria-live]")?.textContent ?? "")),
      "locking most of eight hours away gives back 91 days",
    );
    check(
      await waitFor(page, () => document.querySelectorAll("#time [data-day]").length === 122 && document.querySelectorAll('#time [data-day="back"]').length === 91),
      "the year rings 122 days on the apps and fills the 91 given back",
    );

    // The order: pair pricing, validation, confirmation.
    await goTo(page, "#preorder");
    const total = () => page.locator("#preorder form output[aria-live]").last().innerText();
    const settle = (v) => waitFor(page, (v) => [...document.querySelectorAll("#preorder form output[aria-live]")].at(-1)?.textContent === v, v);
    await page.getByRole("button", { name: "One more Cairn Home" }).click();
    check(await settle("$88"), "two devices are the $88 pair");
    check(/Pair price saves you \$10/.test(await page.locator("#preorder").innerText()), "the pair saving shows");
    await page.getByRole("button", { name: "One more Cairn Pocket" }).click();
    check(await settle("$137"), `three devices are a pair plus one, $137 (${await total()})`);
    await page.getByRole("button", { name: "One fewer Cairn Home" }).click();
    await page.getByRole("button", { name: "One fewer Cairn Pocket" }).click();
    check(await settle("$49"), "one device is $49");
    check(await page.getByRole("button", { name: "One fewer Cairn Pocket" }).isDisabled(), "the order can't drop to nothing");
    await page.getByRole("button", { name: /Reserve for/ }).click();
    const email = page.locator("#preorder input[type=email]");
    check((await email.getAttribute("aria-invalid")) === "true", "an empty email is flagged");
    check(await email.evaluate((el) => el === document.activeElement), "focus moves to the email");
    await email.fill("walker@example.com");
    await page.getByRole("button", { name: /Reserve for/ }).click();
    check(await page.waitForSelector("text=Reserved. Enjoy the quiet.", { timeout: 4000 }).then(() => true, () => false), "the pre-order confirms");

    // Newsletter and contact.
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

    // FAQ and sound.
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
    check((await page.evaluate(() => document.documentElement.dataset.gl)) === undefined, "a phone paints the still dial before any WebGL");
    // Scrolling in brings the noise and the control; then a tap turns it.
    await scrollTrack(page, 0.33);
    await page.waitForTimeout(1200);
    await zone(page, "Home").tap();
    check(await waitLevel(page, 3), "a tap on Home turns it on a phone");
    check(await waitFor(page, () => document.documentElement.dataset.gl === "ready", null, 30000), "the first touch starts the 3D dial");
    await page.getByRole("button", { name: "Menu" }).tap();
    check(await page.locator("#nav-sheet").isVisible(), "the menu opens");
    check((await page.locator("#nav-sheet a").count()) === 6, "the menu lists five sections and the pre-order");
    check(errors.length === 0, `no console errors on a phone${errors.length ? `: ${errors.join(" | ")}` : ""}`);
    await context.close();
  }

  // ——— Reduced motion: quiet from the start, no pinned scroll ———
  {
    const { context, page } = await open({ reducedMotion: "reduce" });
    check(await waitLevel(page, 3), "reduced motion starts at Home");
    check((await bannersLeft(page)) === 0, "with no notifications");
    const pinned = await page.evaluate(() => document.querySelector("#top > div").offsetHeight > window.innerHeight * 1.2);
    check(!pinned, "reduced motion drops the pinned scroll");
    await zone(page, "Off").click();
    check(await waitLevel(page, 0), "the noise can still be brought back, at once");
    check((await page.locator("#pocket[data-static]").count()) === 1, "Pocket's story is still pictures, not a scroll film");
    await goTo(page, "#time", 0);
    await page.waitForTimeout(600);
    // Three hours a day, half locked away: 46 days on the apps, 23 given back.
    const year = await page.evaluate(() => [document.querySelectorAll("#time [data-day]").length, document.querySelectorAll('#time [data-day="back"]').length].join("/"));
    check(year === "46/23", `the year shows its real numbers at once, never empty (${year})`);
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
