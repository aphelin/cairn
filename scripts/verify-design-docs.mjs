#!/usr/bin/env node
// G9: DESIGN.md and its sidecar describe the Waymark world as built: the four
// trail grounds and the black footer, blaze red for the active state, signpost
// plates, contour lines, the stone, and the quiet motion. Nightbloom's tokens
// must not have leaked in.
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
const tokens = { yellow: token("yellow"), blue: token("blue"), green: token("green"), chalk: token("chalk"), black: token("black"), blaze: token("blaze") };
for (const [name, hex] of Object.entries(tokens)) {
  if (!hex) failures.push(`could not read --${name} from globals.css`);
  else {
    if (!mdText.includes(hex)) failures.push(`DESIGN.md lacks the ${name} token ${hex}`);
    if (!jsonText.includes(hex)) failures.push(`design.json lacks the ${name} token ${hex}`);
  }
}

for (const [label, re] of [
  ["blaze red as the active state", /blaze[\s\S]{0,200}(active|you are here)|(active|you are here)[\s\S]{0,200}blaze/],
  ["signpost plates", /signpost/],
  ["contour lines", /contour/],
  ["the 3d stone", /stone[\s\S]{0,300}(webgl|three|3d)|(webgl|three|3d)[\s\S]{0,300}stone/],
  ["the quiet motion", /quiet/],
  ["the type faces", /barlow/],
]) {
  if (!re.test(mdText)) failures.push(`DESIGN.md does not describe ${label}`);
}

for (const stale of ["#ece4d2", "#0b1417", "gelasio", "nightbloom"]) {
  if (mdText.includes(stale) || jsonText.includes(stale)) failures.push(`stale Nightbloom token in the docs: ${stale}`);
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("DESIGN_DOCS_OK");
