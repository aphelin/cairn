#!/usr/bin/env node
// G12: nothing left uncommitted.
import { execSync } from "node:child_process";

const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
if (status) {
  console.error(status);
  process.exit(1);
}
console.log(`HEAD ${execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()}`);
console.log("COMMITTED_CLEAN");
