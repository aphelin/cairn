#!/usr/bin/env node
// G5: every launch-page section is present with its real content (Pocket's
// own story and tap among them, the titanium finishes, and what Cairn gives
// back as well as what the apps take), no visible copy calls the product a
// stone or aluminium, and the page's own words (main plus footer) stay
// within budget. Text drawn inside a depicted interface (the app on the
// drawn phone, the notification banners, the 3D house's labels and its text
// equivalent) is marked data-depicted and is part of the demo, not the copy a
// visitor reads, so the budget leaves it out; the count is taken in a browser
// with scripts off, on the exported HTML.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BUDGET = 950;
const html = readFileSync("out/index.html", "utf8");
const strip = (s) =>
  s
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z#0-9]+;/gi, " ");
const text = strip(html).replace(/\s+/g, " ");
const failures = [];
const needId = (id) => !new RegExp(`id="${id}"`).test(html) && failures.push(`missing #${id}`);
const needText = (label, re) => !re.test(text) && failures.push(`missing ${label}`);
const needHtml = (label, re) => !re.test(html) && failures.push(`missing ${label}`);
const theme = (id, t) =>
  needHtml(`#${id} on the ${t} theme`, new RegExp(`id="${id}"[^>]*data-theme="${t}"|data-theme="${t}"[^>]*id="${id}"`));

// Structure, and the day/night rhythm
["main", "top", "why", "how", "devices", "pocket", "tap", "inside", "finishes", "app", "time", "details", "compare", "reviews", "preorder", "faq", "contact"].forEach(needId);
[
  ["top", "day"],
  ["why", "night"],
  ["how", "day"],
  ["devices", "mist"],
  ["pocket", "night"],
  ["tap", "day"],
  ["inside", "night"],
  ["finishes", "day"],
  ["app", "mist"],
  ["time", "night"],
  ["details", "day"],
  ["compare", "mist"],
  ["reviews", "day"],
  ["preorder", "night"],
  ["faq", "day"],
  ["contact", "mist"],
].forEach(([id, t]) => theme(id, t));
needHtml("night footer", /<footer[^>]*data-theme="night"/);

// Hero: the headline, the offer, the action and the dial with its four zones
needText("headline", /Turn your phone down\./);
needText("offer", /Turn it, and the apps you choose stay locked in the room\. From \$49\./);
needText("pre-order action", /Pre-order/);
needHtml("the dial as a slider", /role="slider"[^>]*aria-label="Cairn Home dial"/);
for (const z of ["Off", "Desk", "Room", "Home"]) needHtml(`zone ${z}`, new RegExp(`role="radio"[^>]*>\\s*<span>${z}</span>`));
if ((html.match(/data-dial="home"/g) ?? []).length < 6) failures.push("the dial's anchors (hero, how, devices, inside, finishes, pre-order)");
needHtml("Pocket's anchor", /data-dial="pocket"/);

// How it works, in three steps
for (const t of ["Choose", "Turn", "Get up", "Pick the apps that pull at you", "walk over and turn it down"]) needText(`step ${t}`, new RegExp(t));

// Both devices at $49; Home turns, Pocket taps
needText("Cairn Home", /Cairn Home/);
needText("Cairn Pocket", /Cairn Pocket/);
needText("the dial guards a room", /Guards a room\. Turn it to set how far the quiet reaches\./);
needText("the disc taps", /Tap your phone on it to lock, and again to unlock\./);
if ((text.match(/\$49/g) ?? []).length < 4) failures.push("$49 on each device, the hero and the pre-order");

// Pocket gets its own story, told on scroll, and a tap to try
needText("Pocket's story", /A tap by the door\./);
needText("Pocket in titanium", /Cairn Pocket\. Titanium, 56 mm across\./);
needText("Pocket's tap", /Give it a tap\./);
needHtml("Pocket's tap button", /<button[^>]*>(?:(?!<\/button>)[\s\S]){0,2000}?Tap to lock<\/button>/);
needHtml("Pocket's status line", /role="status"[^>]*>(?:(?!<\/p>)[\s\S]){0,600}?Unlocked\./);
needHtml("Pocket's own 3D scene", /id="pocket"[\s\S]{0,4000}?<canvas/);

// The exploded view names its parts
for (const p of ["Ceramic top", "Knurled crown", "Detent ring", "Light band", "Board and radio", "Battery", "Micro-suction base"]) needText(`part ${p}`, new RegExp(p));

// Both devices stick to surfaces
needText("Home sticks", /Sticks to a desk or a wall/);
needText("Pocket sticks", /Sticks to walls and ceilings/);

// The noise is real apps, named with their icons, and the footer says whose they are
for (const app of ["WhatsApp", "TikTok", "Instagram", "YouTube", "Snapchat", "Netflix"]) needText(`real app ${app}`, new RegExp(`\\b${app}\\b`));
needText("trademark note", /App names and icons belong to their owners/);

// Four named finishes, all titanium: two bare and two coated
for (const f of ["Night", "Silver", "Sage", "Chalk"]) needHtml(`finish ${f}`, new RegExp(`value="${f.toLowerCase()}"`));
for (const f of ["Graphite", "Natural", "Sage", "Chalk"]) needText(`finish name ${f}`, new RegExp(`\\b${f}\\b`));
needText("titanium finishes", /Turned titanium in four colours\./);
needText("the finish picked first", /Graphite\. Dark titanium\./);
needText("titanium material", /Titanium, a ceramic top, and a band of light\./);
needText("turned titanium crown", /Turned titanium, 180 ridges\./);
// The retired aluminium body is gone from what a visitor reads.
if (/\balumini?um\b|\banodi[sz]ed\b/i.test(text)) failures.push("aluminium wording left in the copy");

// The app demo
needText("app demo", /Set the rules once\./);
// Its four tabs, each named within its own button (after the icon's markup).
for (const tab of ["Today", "Apps", "Schedules", "Insights"]) needHtml(`app tab ${tab}`, new RegExp(`role="tab"[^>]*>(?:(?!</button>)[\\s\\S]){0,4000}?>${tab}<`));
needText("daily limit", /Daily limit/);
for (const s of ["Work hours", "Bedtime", "Weekends"]) needText(`schedule ${s}`, new RegExp(s));
needText("emergency unlocks", /emergency unlocks/i);

// Time back
needText("calculator", /Hours a day on apps you.d lock/);
needText("days a year", /days a year/);
// Not only what the apps take: what Cairn gives back.
needText("share control", /How much of it you.d lock away/);
for (const s of ["A quarter", "Half", "Most"]) needHtml(`share ${s}`, new RegExp(`type="radio"[^>]*>\\s*<span>${s}</span>`));
needText("days given back", /days a year Cairn gives back/);

// Box, specs and compatibility
for (const item of ["Battery, fitted", "Spare suction pad", "Start card"]) needText(item, new RegExp(item));
needText("compatibility", /iOS 17 or later, Android 12 or later/);
needText("no subscription", /No subscription/);

// Comparison
needText("comparison", /Why not just set a limit\?/);
needText("comparison rows", /Undoing it takes getting up/);

// Reviews labelled fictional
needText("reviews", /Quiet, reported\./);
needText("reviews labelled fictional", /These reviews are fictional/);

// FAQ covers the questions a buyer has
needText("faq compatibility", /Will it work with my phone\?/);
needText("faq emergency", /really need a locked app/);
needText("faq privacy", /Nothing leaves your phone/);
needText("faq shipping", /When does it ship\?/);
needText("faq returns", /return it within 30 days/);
needText("faq fiction", /Is Cairn real\?/);
if ((html.match(/<details/g) ?? []).length < 6) failures.push("six FAQ entries");

// Pre-order, newsletter, contact
needText("pair price", /Any two for \$88/);
needText("ship window", /Ships spring 2027/);
needText("reserve", /Reserve for \$49/);
needText("demo note", /nothing is sent or charged/);
needText("newsletter", /Launch news/);
needText("contact", /Send a note/);
for (const f of ["Name", "Email", "Message"]) needText(`contact field ${f}`, new RegExp(f));

// Footer: fiction disclaimer and credit
needText("disclaimer", /Cairn is a design concept\. There is no product, nothing ships/);
needText("credit", /Concept, design and build by Aphelin/);
needHtml("credit link", /href="https:\/\/github\.com\/aphelin"/);

// The product is machined, not found: no stone words in what a visitor reads.
const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "";
const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
const visible = strip(main + footer);
const stony = visible.match(/\b(stones?|pebbles?|rocks?)\b/gi);
if (stony) failures.push(`stone words in the copy: ${[...new Set(stony)].join(", ")}`);
// Negative control: the same test catches a planted stone.
if (!/\b(stones?|pebbles?|rocks?)\b/i.test(strip("<p>A small smooth stone.</p>"))) failures.push("the stone-word check missed its control");

// Word budget: the page's own copy in main plus footer.
const browser = await chromium.launch();
const counted = await (async () => {
  const page = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
  await page.setContent(html);
  return page.evaluate(() => {
    const words = (el) => (el?.textContent.match(/[A-Za-z0-9][^\s]*/g) ?? []).length;
    const depicted = [...document.querySelectorAll("[data-depicted]")];
    const left = depicted.map(words).reduce((a, b) => a + b, 0);
    depicted.forEach((el) => el.remove());
    return { own: words(document.querySelector("main")) + words(document.querySelector("footer")), depicted: left, regions: depicted.length };
  });
})();
await browser.close();
const count = counted.own;
console.log(`the page's own words in main and footer: ${count} (budget ${BUDGET}); left out, inside ${counted.regions} depicted interfaces: ${counted.depicted}`);
if (counted.regions < 3) failures.push(`expected the three depicted interfaces (phone, notifications, house) marked, found ${counted.regions}`);
if (count > BUDGET) failures.push(`${count} words is over the ${BUDGET} budget`);
if (count < 300) failures.push(`${count} words is too few to be the real page`);

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("CONTENT_OK");
