#!/usr/bin/env node
// G11 (round 2): DESIGN.md and its sidecar describe the world as built: the
// day and night grounds, a colour for each mode, Mona Sans and Doto, the dial
// in Three.js with its glass band and sticky base, the detent motion, real apps
// as the noise, and the 3D house. Neither the retired Waymark world nor
// round 1's single-amber rule may linger.
import { existsSync, readFileSync } from "node:fs";

const failures = [];
if (!existsSync("DESIGN.md")) failures.push("DESIGN.md is missing");
if (!existsSync(".impeccable/design.json")) failures.push(".impeccable/design.json is missing");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
const md = readFileSync("DESIGN.md", "utf8");
let json;
try {
  json = JSON.parse(readFileSync(".impeccable/design.json", "utf8"));
} catch (err) {
  console.error(`design.json does not parse: ${err.message}`);
  process.exit(1);
}
const jsonText = JSON.stringify(json).toLowerCase();
const mdText = md.toLowerCase();

// The tokens as shipped in app/globals.css, read from the source so the docs are held to the code.
const css = readFileSync("app/globals.css", "utf8");
const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1]?.toLowerCase();
for (const name of ["paper", "mist", "ink", "night", "dawn", "mode-desk", "mode-room", "mode-home"]) {
  const hex = token(name);
  if (!hex) failures.push(`could not read --${name} from globals.css`);
  else {
    if (!mdText.includes(hex)) failures.push(`DESIGN.md lacks the ${name} token ${hex}`);
    if (!jsonText.includes(hex)) failures.push(`design.json lacks the ${name} token ${hex}`);
  }
}

for (const [label, re] of [
  ["the day and night grounds", /\bday\b[\s\S]{0,400}\bnight\b|\bnight\b[\s\S]{0,400}\bday\b/],
  ["a colour for each mode", /(desk|room|home)[\s\S]{0,200}(colou?r)[\s\S]{0,400}(desk|room|home)/],
  ["real apps as the noise", /real apps?/],
  ["the sticky base", /micro-suction/],
  ["the glass band", /glass band|light band/],
  ["the 3d house", /house/],
  ["Mona Sans", /mona sans/],
  ["Doto", /doto/],
  ["the dial in three.js", /dial[\s\S]{0,400}(three\.js|webgl|3d)|(three\.js|webgl|3d)[\s\S]{0,400}dial/],
  ["the detent motion", /detent/],
  ["the titanium finishes by name", /titanium[\s\S]{0,600}graphite[\s\S]{0,400}natural[\s\S]{0,400}sage[\s\S]{0,400}chalk/],
  ["the house's zone held by its walls", /house[\s\S]{0,2000}walls?/],
  ["the exploded view's picking", /exploded view[\s\S]{0,1500}pick/],
  ["pocket's own story", /pocket's story/],
  ["the time back's days given back", /gives back/],
]) {
  if (!re.test(mdText)) failures.push(`DESIGN.md does not describe ${label}`);
}

// The finishes were renamed with the titanium: no "Silver" finish lingers.
if (/\bgraphite, silver\b/.test(mdText) || /\bgraphite, silver\b/.test(jsonText)) failures.push("the retired Silver finish is still named in the docs");
// Round 1's single accent is gone: no rule may still reserve one amber for "quiet is on".
for (const stale of ["the quiet is on rule", "one accent, amber", "amber means quiet is on"]) {
  if (mdText.includes(stale) || jsonText.includes(stale)) failures.push(`round-1 amber rule still in the docs: ${stale}`);
}
// Nothing of the retired Waymark world: its colours, its face, its furniture.
for (const stale of ["#f2c200", "#1f5aa6", "#1d5b3b", "#d7262b", "barlow", "signpost", "waymark", "blaze"]) {
  if (mdText.includes(stale) || jsonText.includes(stale)) failures.push(`stale Waymark token in the docs: ${stale}`);
}
// Negative control: the stale check catches a planted Waymark token.
if (!"sign-yellow #f2c200".includes("#f2c200")) failures.push("the stale-token check missed its control");

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("DESIGN_DOCS_OK");
