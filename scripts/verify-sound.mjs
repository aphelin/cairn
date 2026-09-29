#!/usr/bin/env node
// G13: a notification sounds like a phone's chime, not a buzz. The chime is
// built by lib/sound.ts's own chimeVoice(), rendered offline in a real
// browser, and measured:
//   - most of its energy sits above 800 Hz (a buzz lives low);
//   - it rings and then decays to under 5% of its peak by 1.2 s.
// The old table-buzz is rendered the same way as a control, and must fail the
// first test, so a check that passes everything can't pass.
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { chromium } from "playwright";

// The module, as plain JavaScript the browser can run.
const source = stripTypeScriptTypes(readFileSync("lib/sound.ts", "utf8")).replace(/^"use client";/m, "");

const browser = await chromium.launch();
const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
};

try {
  const page = await browser.newPage();
  await page.goto("about:blank");
  const result = await page.evaluate(async (code) => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const { chimeVoice } = await import(url);
    const rate = 44100;
    // Render a sound twice, once as it is and once through a steep (4th
    // order) high-pass at 800 Hz; the energy that survives is the bright share.
    const render = async (build, bright = false) => {
      const ctx = new OfflineAudioContext(1, rate * 1.4, rate);
      let dest = ctx.destination;
      if (bright) {
        const a = ctx.createBiquadFilter();
        const b = ctx.createBiquadFilter();
        a.type = b.type = "highpass";
        a.frequency.value = b.frequency.value = 800;
        // Butterworth sections (Q 0.541 and 1.307); Web Audio takes a
        // high-pass Q in decibels.
        a.Q.value = 20 * Math.log10(0.5412);
        b.Q.value = 20 * Math.log10(1.3066);
        a.connect(b).connect(ctx.destination);
        dest = a;
      }
      build(ctx, dest);
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };
    const energy = (x) => x.reduce((s, v) => s + v * v, 0);
    // RMS in 20 ms windows: the peak, and the level by 1.2 s.
    const envelope = (x) => {
      const n = Math.floor(rate * 0.02);
      const rms = [];
      for (let i = 0; i + n <= x.length; i += n) {
        let s = 0;
        for (let j = i; j < i + n; j++) s += x[j] * x[j];
        rms.push(Math.sqrt(s / n));
      }
      const peak = Math.max(...rms);
      const at = Math.floor(1.2 / 0.02);
      return { peak, late: rms[at] ?? 0 };
    };
    // The tick's noise differs per render, but it is a tiny share of the
    // energy either way; the notes dominate.
    const playChime = (ctx, dest) => chimeVoice(ctx, dest, 0.01, 0, 0.3);
    const chime = await render(playChime);
    const chimeHigh = energy(await render(playChime, true)) / energy(chime);
    // The control: the buzz the page used to make.
    const playBuzz = (ctx, dest) => {
      const osc = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 152;
      lp.type = "lowpass";
      lp.frequency.value = 420;
      g.gain.setValueAtTime(0.15, 0);
      g.gain.setValueAtTime(0, 0.31);
      osc.connect(lp).connect(g).connect(dest);
      osc.start(0);
      osc.stop(0.34);
    };
    const buzz = await render(playBuzz);
    const buzzHigh = energy(await render(playBuzz, true)) / energy(buzz);
    const e = envelope(chime);
    return { chimeHigh, buzzHigh, peak: e.peak, late: e.late };
  }, source);

  check(result.peak > 0.01, `the chime makes sound (peak RMS ${result.peak.toFixed(3)})`);
  check(result.chimeHigh > 0.8, `its energy is bright: ${(result.chimeHigh * 100).toFixed(0)}% above 800 Hz`);
  check(result.late < result.peak * 0.05, `it rings out: ${((result.late / result.peak) * 100).toFixed(1)}% of peak at 1.2 s`);
  check(result.buzzHigh < 0.5, `control: the old buzz is not bright (${(result.buzzHigh * 100).toFixed(0)}% above 800 Hz), so the test can fail`);
} finally {
  await browser.close();
}

if (failures.length) process.exit(1);
console.log("SOUND_OK");
