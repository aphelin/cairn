#!/usr/bin/env node
// G1: type-check, lint and build the static export.
import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";

const run = (cmd) => {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

run("pnpm exec tsc --noEmit");
run("pnpm exec eslint . --max-warnings=0");
run("pnpm exec next build");
if (!existsSync("out/index.html") || statSync("out/index.html").size < 10_000) {
  console.error("out/index.html is missing or suspiciously small");
  process.exit(1);
}
console.log("BUILD_OK");
