"use client";

// Sound is off until the visitor turns it on. Notifications arrive with a
// phone's chime: two quick glassy notes with a soft tick at the front, a
// touch of room around them, a different pair for each kind of app. While
// notifications are still on screen, one chimes now and then, less often as
// the dial clears them. Each detent is one short mechanical click.
// Everything is synthesised, so there are no audio files.

type Listener = (on: boolean) => void;

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let on = false;
let noise = 0; // 0 (silent) to 1 (a chime every few seconds)
let timer = 0;
let variant = 0;
const listeners = new Set<Listener>();

// Pairs of notes (Hz): bright, short, and rising or falling like a phone's alert.
const CHIMES: [number, number][] = [
  [1318.5, 1760], // E6 → A6
  [1567.98, 1174.66], // G6 → D6
  [1396.91, 2093], // F6 → C7
  [1760, 1318.5], // A6 → E6
];

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    // A short, bright room: a decaying noise impulse, mixed in low.
    const len = Math.floor(ctx.sampleRate * 0.7);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const verb = ctx.createConvolver();
    verb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);
    out.connect(verb).connect(wet).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// One glassy note: a sine with quieter inharmonic partials, like struck glass.
function note(a: BaseAudioContext, dest: AudioNode, freq: number, at: number, level: number, decay: number) {
  for (const [ratio, amp] of [
    [1, 1],
    [2.756, 0.22],
    [5.404, 0.06],
  ] as const) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * ratio, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level * amp, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay / ratio);
    osc.connect(gain).connect(dest);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

// A notification's chime, built into any audio context (the page's, or an
// offline one when scripts/verify-sound.mjs measures it): the tick of the
// speaker waking, then two glassy notes, panned a little by app.
export function chimeVoice(a: BaseAudioContext, dest: AudioNode, at: number, kind: number, level: number) {
  const pan = a.createStereoPanner();
  pan.pan.value = Math.sin(kind * 2.3) * 0.35;
  pan.connect(dest);
  const len = Math.floor(a.sampleRate * 0.006);
  const buffer = a.createBuffer(1, len, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const tick = a.createBufferSource();
  tick.buffer = buffer;
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 4000;
  const tickGain = a.createGain();
  tickGain.gain.value = level * 0.5;
  tick.connect(hp).connect(tickGain).connect(pan);
  tick.start(at);
  const [first, second] = CHIMES[kind % CHIMES.length]!;
  note(a, pan, first, at, level, 0.5);
  note(a, pan, second, at + 0.095, level * 0.9, 0.7);
}

function chime(kind: number, level = 0.16) {
  const a = audio();
  chimeVoice(a, out!, a.currentTime + 0.01, kind, level);
}

function schedule() {
  window.clearTimeout(timer);
  if (!on || noise <= 0) return;
  timer = window.setTimeout(
    () => {
      chime(variant++, 0.08 + 0.08 * noise);
      schedule();
    },
    (2600 + Math.random() * 1400) / Math.max(0.35, noise),
  );
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
  // How much noise is left on the page, 0 to 1.
  setNoise(value: number) {
    const was = noise;
    noise = Math.max(0, Math.min(1, value));
    if ((was <= 0) !== (noise <= 0)) schedule();
  },
  // A notification arriving: `kind` picks the app's pair of notes.
  notify(kind: number) {
    if (!on) return;
    chime(kind);
  },
  // A phone tapped on Pocket: the soft two-note confirm a phone gives when it
  // reads a tag, rising as a lock goes on and falling as it comes off.
  tap(locking = true) {
    if (!on) return;
    const a = audio();
    const t = a.currentTime + 0.01;
    const [first, second] = locking ? [987.77, 1479.98] : [1479.98, 987.77]; // B5 and F#6
    note(a, out!, first, t, 0.12, 0.32);
    note(a, out!, second, t + 0.075, 0.11, 0.55);
  },
  // One detent: a bright tick over a short body, like a knob with a spring ball.
  click(up = true) {
    if (!on) return;
    const a = audio();
    const t = a.currentTime;
    const len = Math.floor(a.sampleRate * 0.03);
    const buffer = a.createBuffer(1, len, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const src = a.createBufferSource();
    src.buffer = buffer;
    const band = a.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = up ? 3400 : 2800;
    band.Q.value = 3.2;
    const gain = a.createGain();
    gain.gain.value = 0.55;
    src.connect(band).connect(gain).connect(out!);
    const body = a.createOscillator();
    const bodyGain = a.createGain();
    body.frequency.setValueAtTime(up ? 190 : 160, t);
    body.frequency.exponentialRampToValueAtTime(90, t + 0.06);
    bodyGain.gain.setValueAtTime(0.18, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    body.connect(bodyGain).connect(out!);
    src.start(t);
    body.start(t);
    body.stop(t + 0.09);
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
