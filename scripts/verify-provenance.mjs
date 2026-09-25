#!/usr/bin/env node
// G7: every raster the page ships carries its provenance (an embedded prompt
// or origin), checked by impeccable's own scanner.
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const bin = process.env.IMPECCABLE_BIN || join(homedir(), ".claude/skills/impeccable/scripts/impeccable");
let out = "";
try {
  out = execFileSync(bin, ["embed-prompt", "--scan", "public"], { encoding: "utf8" });
} catch (err) {
  out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  console.error(out);
  process.exit(1);
}
console.log(out.trim());
if (/missing|no prompt|without/i.test(out) && !/0 missing/i.test(out)) process.exit(1);
console.log("PROVENANCE_OK");
