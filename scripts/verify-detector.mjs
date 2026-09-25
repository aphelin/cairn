#!/usr/bin/env node
// G8: the impeccable design detector finds nothing in the page source. The
// detector is first run on a planted positive control, so a silent or broken
// detector can't pass for a clean page.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const bin = process.env.IMPECCABLE_BIN || join(homedir(), ".claude/skills/impeccable/scripts/impeccable");
const detect = (targets) => {
  try {
    return JSON.parse(execFileSync(bin, ["detect", "--json", ...targets], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }) || "[]");
  } catch (err) {
    // The detector exits non-zero when it finds something; its JSON is still on stdout.
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
};

const control = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "detector-control-"));
writeFileSync(join(control, "planted.css"), ".x { transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1); }\n");
const planted = detect([control]);
rmSync(control, { recursive: true, force: true });
if (!planted.length) {
  console.error("The detector missed its planted positive control");
  process.exit(1);
}

const findings = detect(["app", "components"]);
for (const f of findings) console.log(`${f.severity} ${f.antipattern}: ${f.file}:${f.line} ${f.snippet ?? ""}`);
if (findings.length) process.exit(1);
console.log(`control caught (${planted.length}); page source clean`);
console.log("DETECTOR_CLEAN");
