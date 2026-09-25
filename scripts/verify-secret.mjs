#!/usr/bin/env node
// G6: the FAL key never ships. Scans the static export and every git-tracked
// file, after proving the scanner catches a planted copy.
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const key = env.split("\n").find((l) => l.startsWith("FAL_KEY="))?.slice(8).trim();
if (!key || key.length < 20) {
  console.error("No FAL_KEY in .env to test against");
  process.exit(1);
}
const needles = [key, key.split(":")[0], key.split(":")[1]].filter((n) => n && n.length >= 16);

function scanFiles(files) {
  const hits = [];
  for (const file of files) {
    let buf;
    try {
      buf = readFileSync(file);
    } catch {
      continue;
    }
    const s = buf.toString("latin1");
    if (needles.some((n) => s.includes(n))) hits.push(file);
  }
  return hits;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Positive control
const control = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "secret-control-"));
writeFileSync(join(control, "planted.js"), `const k = "${key}";`);
const caught = scanFiles(walk(control));
rmSync(control, { recursive: true, force: true });
if (caught.length !== 1) {
  console.error("Scanner failed its positive control");
  process.exit(1);
}

if (!existsSync("out")) {
  console.error("out/ missing: build first");
  process.exit(1);
}
const tracked = execSync("git ls-files -z", { encoding: "utf8" }).split("\0").filter(Boolean);
const leaks = [...scanFiles(walk("out")), ...scanFiles(tracked)];
if (tracked.includes(".env")) leaks.push(".env is tracked by git");
if (leaks.length) {
  console.error(`Key found in:\n${leaks.join("\n")}`);
  process.exit(1);
}
console.log(`scanned ${walk("out").length} exported files and ${tracked.length} tracked files`);
console.log("NO_SECRET_LEAK");
