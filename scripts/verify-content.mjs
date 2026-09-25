#!/usr/bin/env node
// G2: every launch-page section is present with its real content, and the
// visible words (main plus footer) stay within the 900-word budget.
import { readFileSync } from "node:fs";

const BUDGET = 900;
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
const words = (s) => strip(s).split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const text = strip(html).replace(/\s+/g, " ");
const failures = [];
const needId = (id) => !new RegExp(`id="${id}"`).test(html) && failures.push(`missing #${id}`);
const needText = (label, re) => !re.test(text) && failures.push(`missing ${label}`);
const needHtml = (label, re) => !re.test(html) && failures.push(`missing ${label}`);
const ground = (id, g) =>
  needHtml(`#${id} on the ${g} ground`, new RegExp(`id="${id}"[^>]*data-ground="${g}"|data-ground="${g}"[^>]*id="${id}"`));

// Structure, and every section on its own trail colour
["main", "top", "how", "stones", "colours", "app", "time", "box", "compare", "reviews", "preorder", "faq", "contact"].forEach(needId);
[
  ["top", "yellow"],
  ["how", "chalk"],
  ["stones", "blue"],
  ["colours", "green"],
  ["app", "chalk"],
  ["time", "yellow"],
  ["box", "blue"],
  ["compare", "chalk"],
  ["reviews", "green"],
  ["preorder", "yellow"],
  ["faq", "chalk"],
  ["contact", "blue"],
].forEach(([id, g]) => ground(id, g));
needHtml("black footer", /<footer[^>]*data-ground="black"/);

// Hero
needText("headline", /An off switch, set in stone\./);
needText("offer", /apps you choose stay locked until you walk back\. From \$49\./);
needText("pre-order action", /Pre-order/);
needText("quiet action", /Tap to quiet/);
if ((html.match(/data-stone="main"/g) ?? []).length < 4) failures.push("the stone's anchors (hero, how, stones, colours)");

// How it works, in three steps
for (const t of ["Choose", "Tap", "Walk back", "Pick the apps that pull at you", "come back and tap again"]) needText(`step ${t}`, new RegExp(t));

// Both models at $49, Home with an adjustable range
needText("Cairn Pocket", /Cairn Pocket/);
needText("Cairn Home", /Cairn Home/);
needText("tap to lock", /Tap to lock/);
needText("guards a room", /Guards a room/);
needHtml("range slider", /type="range"[^>]*min="1"[^>]*max="15"/);
if ((text.match(/\$49/g) ?? []).length < 4) failures.push("$49 on each model, the hero and the pre-order");

// Four named colours
for (const c of ["Chalk", "Granite", "Basalt", "Ochre"]) needText(`colour ${c}`, new RegExp(c));

// The app demo
needText("app demo", /Set the rules once\./);
needText("locks", /apps locked/);
needText("daily limit", /Daily limit/);
for (const s of ["Work hours", "Bedtime", "Weekends"]) needText(`schedule ${s}`, new RegExp(s));
needText("emergency unlocks", /emergency unlocks/i);

// Time back
needText("calculator", /Hours a day on apps you.d lock/);
needText("days a year", /days a year/);

// Box, specs and compatibility
for (const item of ["Linen pouch", "Start card", "Battery, fitted", "Wall plate and screws"]) needText(item, new RegExp(item));
needText("compatibility", /iOS 17 or later, Android 12 or later/);
needText("no subscription", /No subscription/);

// Comparison
needText("comparison", /Why a stone\?/);
needText("comparison rows", /Unlocking takes getting up/);

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

// Word budget: main plus footer
const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "";
const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
const count = words(main) + words(footer);
console.log(`visible words in main and footer: ${count} (budget ${BUDGET})`);
if (count > BUDGET) failures.push(`${count} words is over the ${BUDGET} budget`);
if (count < 300) failures.push(`${count} words is too few to be the real page`);

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("CONTENT_OK");
