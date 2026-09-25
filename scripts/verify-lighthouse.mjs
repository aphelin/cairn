#!/usr/bin/env node
// G5: Lighthouse on the static export, desktop and mobile.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { serve } from "./serve-out.mjs";

const server = await serve(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const dir = process.env.LIGHTHOUSE_DIR || mkdtempSync(join(process.env.TMPDIR || tmpdir(), "lighthouse-"));
const bars = {
  desktop: { performance: 90, accessibility: 95, "best-practices": 95, seo: 95 },
  mobile: { performance: 75, accessibility: 95, "best-practices": 95, seo: 95 },
};
let failed = false;

try {
  // Median of three runs per form factor, as Lighthouse recommends for
  // variable machines: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring#run-to-run-variability
  const RUNS = Number(process.env.LIGHTHOUSE_RUNS || 3);
  for (const form of ["desktop", "mobile"]) {
    const reports = [];
    for (let run = 0; run < RUNS; run++) {
      const out = join(dir, `${form}-${run}.json`);
      const args = [
        "exec",
        "lighthouse",
        url,
        "--quiet",
        "--output=json",
        `--output-path=${out}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        "--chrome-flags=--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader",
      ];
      if (form === "desktop") args.push("--preset=desktop");
      // Async, so this process's static server keeps answering Lighthouse.
      await promisify(execFile)("pnpm", args, { timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
      reports.push(JSON.parse(readFileSync(out, "utf8")));
    }
    reports.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
    const report = reports[Math.floor(reports.length / 2)];
    console.log(`${form} runs: ${reports.map((r) => Math.round(r.categories.performance.score * 100)).join(", ")} (median shown)`);
    const scores = Object.fromEntries(Object.entries(report.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    const audits = report.audits;
    console.log(
      `${form}: ${Object.entries(scores)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ")} · LCP ${audits["largest-contentful-paint"].displayValue} · TBT ${audits["total-blocking-time"].displayValue} · CLS ${audits["cumulative-layout-shift"].displayValue}`,
    );
    for (const [cat, min] of Object.entries(bars[form])) {
      if ((scores[cat] ?? 0) < min) {
        failed = true;
        console.log(`  ✗ ${cat} ${scores[cat]} < ${min}`);
        const refs = report.categories[cat].auditRefs.filter((r) => r.weight > 0 && audits[r.id].score !== null && audits[r.id].score < 0.9);
        for (const r of refs.slice(0, 8)) console.log(`      ${r.id}: ${audits[r.id].displayValue ?? audits[r.id].score}`);
      }
    }
  }
} finally {
  server.close();
}

if (failed) process.exit(1);
console.log("LIGHTHOUSE_OK");
