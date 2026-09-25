"use client";

// Sound is off until the visitor turns it on. The phone buzzes on the table in
// double pulses; the contact is one low knock, and then nothing. Everything is
// synthesised, so there are no audio files to load.

type Listener = (on: boolean) => void;

let ctx: AudioContext | null = null;
let on = false;
let noisy = true;
let timer = 0;
const listeners = new Set<Listener>();

function audio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function buzzOnce(at: number) {
  const a = audio();
  const osc = a.createOscillator();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(152, at);
  filter.type = "lowpass";
  filter.frequency.value = 420;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.16, at + 0.02);
  gain.gain.setValueAtTime(0.16, at + 0.28);
  gain.gain.linearRampToValueAtTime(0, at + 0.33);
  // A slow wobble makes it rattle like a phone on wood.
  const lfo = a.createOscillator();
  const depth = a.createGain();
  lfo.frequency.value = 31;
  depth.gain.value = 0.06;
  lfo.connect(depth).connect(gain.gain);
  osc.connect(filter).connect(gain).connect(a.destination);
  osc.start(at);
  lfo.start(at);
  osc.stop(at + 0.36);
  lfo.stop(at + 0.36);
}

function schedule() {
  window.clearTimeout(timer);
  if (!on || !noisy) return;
  const a = audio();
  buzzOnce(a.currentTime + 0.05);
  buzzOnce(a.currentTime + 0.5);
  timer = window.setTimeout(schedule, 2600 + Math.random() * 900);
}

export const sound = {
  get on() {
    return on;
  },
  toggle() {
    on = !on;
    if (on) audio();
    schedule();
    listeners.forEach((l) => l(on));
  },
  setNoisy(value: boolean) {
    noisy = value;
    schedule();
  },
  knock() {
    if (!on) return;
    const a = audio();
    const t = a.currentTime;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.18);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + 0.42);
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
