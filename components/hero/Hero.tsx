"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HERO, NOISE, ZONES, type Level } from "@/lib/content";
import { live, store, useStore } from "@/lib/store";
import { sound } from "@/lib/sound";
import { DialAnchor } from "@/components/dial/DialAnchor";
import { Mark } from "@/components/brand/Logo";
import { AppIcon, APP_NAMES } from "@/components/brand/AppIcon";
import { Arrow } from "@/components/icons";
import styles from "./Hero.module.css";

// The hero is a pinned scroll track, told in three beats:
//   1. Calm: the headline, the two buttons and the dial, nothing else.
//   2. Noise: scrolling brings the notifications in, one at a time, each with
//      a chime, while the headline steps aside and the dial rises to centre.
//   3. The turn: the dial punches forward and clicks to Desk in a burst of its
//      colour; scrolling on turns it to Room and to Home, night falls, and each
//      zone blows away the notifications it reaches.

// Where each notification lands on wide screens, as % of the stage:
// [x, y, tilt], in NOISE's order. They sit in rings round the risen dial:
// the ones Desk sweeps nearest, Room's further out, Home's at the edges, so
// every zone's rim can fall cleanly between the ones it takes and the ones
// it leaves. On phones, upright tablets and short windows they stack like a
// lock screen instead.
const SPOTS: [number, number, number][] = [
  [23, 60, -2], // WhatsApp, Desk
  [13, 40, 2], // TikTok, Room
  [77, 52, 2], // Instagram, Desk
  [50, 19, 0], // YouTube, Home
  [87, 36, -2], // Snapchat, Room
  [27, 81, -2], // Discord, Desk
  [9, 20, 2], // Netflix, Home
  [85, 84, 2], // Reddit, Room
  [91, 22, -3], // X, Home
];

// Shares of the track (540svh, 460svh on phones). The headline steps aside
// and the dial rises early; then the notifications arrive between ARRIVE's
// two points, each with about a fifth of a screen of scroll to itself, right
// up to the click to Desk.
const AWAY = [0.012, 0.075];
const LIFT = [0.02, 0.18];
const AWAKE = 0.11;
const ARRIVE = [0.05, 0.47];
// The scroll positions where scrolling clicks to Desk, Room and Home.
const STOPS = [0.51, 0.66, 0.81];
// However fast the scroll, the notifications land one after another, this
// many ms apart (and leave, going back, a little quicker), and a click up the
// dial waits for them, then takes one detent at a time. The full crowd is
// held for a beat (HOLD) before the first click, so the noise peaks before
// the turn rather than blurring into it.
const LAND_GAP = 140;
const LEAVE_GAP = 70;
const DETENT_GAP = 480;
const HOLD = 450;
// How far the dial has zoomed at each detent, in the rings and in the stack.
const ZOOM = { wide: [1, 1.26, 1.32, 1.38], narrow: [1, 1.1, 1.14, 1.18] };

// The page's darkness at each detent: day, still day, dusk, night.
const NIGHT_AT = [0, 0.08, 0.8, 1];
const nightOf = (q: number) => {
  const lo = Math.max(0, Math.min(2, Math.floor(q)));
  const f = Math.max(0, Math.min(1, q - lo));
  return NIGHT_AT[lo]! + (NIGHT_AT[lo + 1]! - NIGHT_AT[lo]!) * f;
};
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i]! - v) * t));
const DAY_RGB = [255, 255, 255];
const NIGHT_RGB = [7, 7, 8];
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// Where the notifications stack like a lock screen rather than ring the dial:
// phones, upright tablets and short windows, as the stylesheet has it.
const STACKED = "(max-width: 760px), (max-height: 560px), (orientation: portrait)";

// The fixed nav bar is 4rem tall; nothing drawn in the hero should run under
// it. Measured once, and again when the window changes size.
let navH = 0;
const navHeight = () => (navH ||= parseFloat(getComputedStyle(document.documentElement).fontSize) * 4);

// Each mode's radius in px, measured on the floor ellipse (its height is
// 0.52 of its width) from the zone's centre to each notification's spot.
// `at` takes the zone's centre and the stage's box as measured here, which a
// new radius doesn't move.
type Box = { left: number; top: number; right: number; bottom: number };
function reaches(dial: HTMLElement, zone: HTMLElement, list: HTMLElement | null, at?: { cx: number; cy: number; stage: Box }) {
  const narrow = window.matchMedia(STACKED).matches;
  const box = dial.getBoundingClientRect();
  const z = zone.getBoundingClientRect();
  const s = zone.parentElement!.getBoundingClientRect();
  const cx = z.left + z.width / 2;
  const cy = z.top + z.height / 2;
  if (at) {
    at.cx = cx;
    at.cy = cy;
    at.stage = s;
  }
  // The largest zone whose whole rim stays inside the window, clear of its
  // edges and the nav bar: Desk and Room never grow past it.
  const m = Math.max(12, Math.min(28, innerWidth * 0.03));
  const fit = Math.max(0, Math.min(cx - s.left - m, s.right - cx - m, (cy - Math.max(s.top, 0) - navHeight() - m) / 0.52, (s.bottom - m - cy) / 0.52));
  const min = box.width * 0.62;
  if (narrow || !list) {
    const room = Math.min(fit, Math.max(innerWidth, innerHeight) * 0.62);
    return [0, Math.min(min * 1.3, room * 0.74), room, Math.hypot(innerWidth, innerHeight) * 1.1];
  }
  // Each card's nearest and farthest points on the floor ellipse's scale.
  const ell = (x: number, y: number) => Math.hypot(x - cx, (y - cy) / 0.52);
  const spots = [...list.querySelectorAll<HTMLElement>("li")].map((li) => {
    const b = li.getBoundingClientRect();
    const nx = Math.max(b.left, Math.min(cx, b.right));
    const ny = Math.max(b.top, Math.min(cy, b.bottom));
    return {
      level: Number(li.dataset.level),
      near: ell(nx, ny),
      far: Math.max(ell(b.left, b.top), ell(b.right, b.top), ell(b.left, b.bottom), ell(b.right, b.bottom)),
    };
  });
  // A rim never touches a card it leaves behind: it stops short of the
  // nearest one's nearest edge, and reaches past the cards it takes where
  // there's room in the window. Home, which takes them all, just clears the
  // farthest; its rim has faded by then, so only the pool shows.
  const rim = (l: number) => {
    const inside = spots.filter((p) => p.level <= l);
    const outside = spots.filter((p) => p.level > l);
    if (!outside.length) return Math.max(...inside.map((p) => p.far)) * 1.02;
    const limit = Math.min(...outside.map((p) => p.near)) - 28;
    const want = Math.max(min, ...inside.map((p) => p.far));
    return Math.min(fit, Math.max(min, Math.min(limit, want)));
  };
  return [0, rim(1), rim(2), rim(3)];
}

type Gsap = typeof import("gsap").gsap;

export function Hero() {
  const level = useStore((s) => s.level);
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const noise = useRef<HTMLUListElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const burst = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLDivElement>(null);
  const dialBox = useRef<HTMLDivElement>(null);
  const gsapRef = useRef<Gsap | null>(null);
  const q = useRef({ v: 0 });
  const zoom = useRef({ v: 1 });
  const arrived = useRef(0);
  // How many the scroll says should be in; the queue walks `arrived` to it.
  const wanted = useRef(0);
  const [touched, setTouched] = useState(false);
  const [awake, setAwake] = useState(false); // the notifications have started and the controls are out
  const prevLevel = useRef<Level>(0);
  // A detent the scroll has crossed but the dial hasn't clicked to yet, and
  // the timer that will click it.
  const turns = useRef<{ pending: number | null; timer: number }>({ pending: null, timer: 0 });
  // The last value written for the rim and the island, so a frame that
  // changes neither writes nothing.
  const rimAt = useRef("");

  // "quiet" is the story catching up while nobody is watching: no click.
  const turnTo = useCallback((next: number, source: "drag" | "key" | "button" | "scroll" | "quiet") => {
    const clamped = Math.max(0, Math.min(3, Math.round(next))) as Level;
    const hand = source !== "scroll" && source !== "quiet";
    // A zone set by hand wins over any detents the scroll still had queued.
    if (hand) {
      window.clearTimeout(turns.current.timer);
      turns.current.timer = 0;
      turns.current.pending = null;
    }
    const prev = store.get().level;
    if (clamped === prev) return;
    store.set({ level: clamped });
    if (source !== "quiet") sound.click(clamped > prev);
    if (hand) {
      setTouched(true);
      try {
        navigator.vibrate?.(6);
      } catch {
        // haptics are a nicety
      }
    }
  }, []);

  // Each notification is waiting (not arrived yet), shown, or gone (swept by
  // the zone). This puts every one where the scroll and the dial say it
  // belongs, animating only the ones whose state changed.
  const settle = useCallback((animate: boolean, chime: boolean) => {
    const list = noise.current;
    const box = dialBox.current;
    if (!list || !box) return;
    const g = gsapRef.current;
    const banners = [...list.querySelectorAll<HTMLElement>("li")];
    const lvl = store.get().level;
    const narrow = window.matchMedia(STACKED).matches;
    const r0 = box.getBoundingClientRect();
    const cx = r0.left + r0.width / 2;
    const cy = r0.top + r0.height * 0.55;
    // Measured before any state is written, so it's one layout, not nine.
    const rects = banners.map((b) => b.getBoundingClientRect());
    banners.forEach((b, i) => {
      // A swept card already queued to leave (a jump back up the track)
      // isn't brought back just to go again.
      const state =
        i >= arrived.current
          ? "waiting"
          : lvl >= Number(b.dataset.level) - 0.5 || (b.dataset.state === "gone" && i >= wanted.current)
            ? "gone"
            : "shown";
      if (b.dataset.state === state) return;
      const was = b.dataset.state;
      b.dataset.state = state;
      const mover = b.firstElementChild as HTMLElement;
      const r = rects[i]!;
      const dx = r.left + r.width / 2 - cx;
      const dy = r.top + r.height / 2 - cy;
      const d = Math.max(1, Math.hypot(dx, dy));
      // A waiting card rises into place round the dial; in the stack it drops
      // onto the front from above, as a lock screen's would.
      const waiting = { x: 0, y: narrow ? -26 : 34, scale: narrow ? 0.94 : 0.82, rotation: 0, opacity: 0, filter: "blur(6px)" };
      const target =
        state === "shown"
          ? { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, filter: "blur(0px)" }
          : state === "gone"
            ? { x: (dx / d) * (150 + d * 0.35), y: (dy / d) * (150 + d * 0.35), scale: 0.84, rotation: (dx >= 0 ? 1 : -1) * 7, opacity: 0, filter: "blur(10px)" }
            : waiting;
      if (!animate || !g) {
        if (g) {
          g.killTweensOf(mover);
          g.set(mover, target);
        } else mover.style.opacity = state === "shown" ? "1" : "0";
        return;
      }
      g.killTweensOf(mover);
      if (state === "shown" && was === "waiting") {
        // From the waiting pose, stated: until a card's first trip, its
        // hiding comes only from the stylesheet's waiting rule, which lets go
        // the moment the state changes, so a plain tween would start from the
        // card already shown and play nothing.
        g.fromTo(mover, waiting, { ...target, duration: 0.7, ease: "back.out(1.6)" });
        if (chime) sound.notify(i);
      } else if (state === "gone") {
        g.to(mover, { ...target, duration: 0.85, delay: Math.min(0.35, d / 2400), ease: "expo.out" });
      } else {
        g.to(mover, { ...target, duration: state === "shown" ? 0.75 : 0.4, ease: "expo.out" });
      }
    });
    // Stacked, the notifications sit like a lock screen's: the front card
    // is read, three more peek out below it, and the rest tuck away behind
    // (deep), so their shadows don't pile up under the stack.
    let k = 0;
    for (const b of [...banners].reverse()) {
      if (b.dataset.state !== "shown") continue;
      b.style.setProperty("--k", String(Math.min(k, 3)));
      if (k === 0) b.dataset.front = "";
      else delete b.dataset.front;
      b.toggleAttribute("data-deep", k > 3);
      k++;
    }
    sound.setNoise(banners.filter((b) => b.dataset.state === "shown").length / banners.length);
  }, []);

  // The zone's rim is a line, and a line cut off by the window's edge reads
  // as a stray arc. So it fades out as the zone grows from Room to Home (at
  // Home the whole page is the zone, and quiet), and whenever the ellipse
  // comes within a few pixels of the window's edges or the nav bar. The pool
  // under it stays. Called as the zone grows and as the dial rises.
  // The control's island only has a job while a rim is showing (it hides the
  // rim passing behind the control), so it fades with it: gone at Off, where
  // there's no zone, and at Home, where it would only be a dark patch in the
  // pool. Both are set on the hero, where the rim, the island and the stage's
  // foot can all read them.
  // `known` is the zone's and the stage's boxes when the caller has them
  // already, so the rim can be fitted without measuring the page again.
  const fitRim = useCallback((known?: { zone: Box; stage: Box }) => {
    const z = zone.current;
    const stage = z?.parentElement;
    const el = root.current;
    if (!z || !stage || !el) return;
    const v = q.current.v;
    let rim = clamp01(3 - v);
    if (rim > 0) {
      const b = known?.zone ?? z.getBoundingClientRect();
      const s = known?.stage ?? stage.getBoundingClientRect();
      const gap = Math.min(b.left - s.left, s.right - b.right, b.top - Math.max(s.top, 0) - navHeight(), s.bottom - b.bottom);
      rim *= clamp01((gap - 4) / 8);
    }
    const at = `${rim.toFixed(3)} ${(rim * Math.min(1, v * 1.4)).toFixed(3)}`;
    if (at === rimAt.current) return;
    rimAt.current = at;
    const [r, island] = at.split(" ");
    el.style.setProperty("--rim", r!);
    el.style.setProperty("--island", island!);
  }, []);

  // The page at a point on the dial (fractional while it turns): darkness,
  // the theme, and the zone's size and rim. Everything is measured before
  // anything is written, so a frame of the turn lays the page out once.
  const bg = useRef("");
  const paint = useCallback(
    (v: number) => {
      const el = root.current!;
      // The zone: a pool of the mode's colour with a bright rim. Its rim falls
      // between the notifications that mode takes and the ones it leaves (on
      // a phone, where they stack, it simply grows).
      const at = { cx: 0, cy: 0, stage: { left: 0, top: 0, right: 0, bottom: 0 } };
      const reach = reaches(dialBox.current!, zone.current!, noise.current, at);
      const lo = Math.max(0, Math.min(2, Math.floor(v)));
      const f = clamp01(v - lo);
      const r = reach[lo]! + (reach[lo + 1]! - reach[lo]!) * f;
      const n = nightOf(v);
      live.night = n;
      // The background restyles the whole hero, so it's only written when
      // the colour actually changes (most frames of a turn's tail don't).
      const colour = `rgb(${mix(DAY_RGB, NIGHT_RGB, n).join(" ")})`;
      if (colour !== bg.current) {
        bg.current = colour;
        el.style.setProperty("--hero-bg", colour);
      }
      const dark = n > 0.45;
      if ((el.dataset.theme === "night") !== dark) {
        el.dataset.theme = dark ? "night" : "day";
        window.dispatchEvent(new CustomEvent("cairn:theme"));
      }
      const rr = Number(r.toFixed(1));
      zone.current!.style.setProperty("--r", `${r.toFixed(1)}px`);
      zone.current!.style.opacity = String(Math.min(1, v * 1.4));
      // The zone is centred on its spot, so its new box follows from the
      // centre just measured and the new radius (its height is 0.52 of it).
      fitRim({ zone: { left: at.cx - rr, right: at.cx + rr, top: at.cy - rr * 0.52, bottom: at.cy + rr * 0.52 }, stage: at.stage });
    },
    [fitRim],
  );

  // A new window size moves the cards and the dial, so the zone is measured
  // again.
  useEffect(() => {
    const onResize = () => {
      navH = 0;
      paint(q.current.v);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [paint]);

  // The dial rests wherever the first screen's layout leaves it (under the
  // copy, the two centred together) and rises to the stage's --lift-to. The
  // zone is placed at the risen dial's foot, 0.32 of the dial's width below
  // its centre, so the way up is the zone's place less the dial's resting
  // centre: measured here, and again whenever the stage or the copy changes
  // size (a new window, the fonts arriving).
  useEffect(() => {
    const d = dialBox.current!;
    const z = zone.current!;
    const el = root.current!;
    const measure = () => {
      const up = parseFloat(getComputedStyle(z).top) - d.offsetWidth * 0.32;
      const rise = `${(up - d.offsetTop - d.offsetHeight / 2).toFixed(1)}px`;
      if (el.style.getPropertyValue("--rise") === rise) return;
      el.style.setProperty("--rise", rise);
      if (q.current.v > 0) paint(q.current.v);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(d.parentElement!);
    if (copy.current) ro.observe(copy.current);
    return () => ro.disconnect();
  }, [paint]);

  // ——— The page follows the dial: darkness, colour, the zone and the noise ———
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const g = gsapRef.current;
    const narrow = window.matchMedia(STACKED).matches;
    const up = level > prevLevel.current;
    prevLevel.current = level;

    // Reduced motion never lifts the dial, so it doesn't zoom either: it
    // would only grow down behind the control.
    const zoomTo = reduced ? 1 : ZOOM[narrow ? "narrow" : "wide"][level]!;
    if (reduced || !g) {
      q.current.v = level;
      paint(level);
      zoom.current.v = zoomTo;
      dialBox.current!.style.setProperty("--zoom", String(zoomTo));
      settle(false, false);
      return;
    }
    g.killTweensOf(q.current);
    g.to(q.current, { v: level, duration: 0.9, ease: "expo.out", onUpdate: () => paint(q.current.v) });

    // The turn: a small wind-up, then the dial punches forward as the colour
    // bursts out of it. The first click, to Desk, is the big one.
    const setZoom = () => dialBox.current!.style.setProperty("--zoom", zoom.current.v.toFixed(4));
    g.killTweensOf(zoom.current);
    if (up && level > 0) {
      const big = level === 1;
      g.timeline()
        .to(zoom.current, { v: zoom.current.v * (big ? 0.95 : 0.98), duration: big ? 0.14 : 0.1, ease: "power2.in", onUpdate: setZoom })
        .to(zoom.current, { v: zoomTo, duration: big ? 1.1 : 0.8, ease: big ? "elastic.out(1, 0.55)" : "expo.out", onUpdate: setZoom });
      const b = burst.current!;
      g.killTweensOf(b);
      g.fromTo(
        b,
        { scale: 0.2, opacity: big ? 0.95 : 0.7 },
        { scale: big ? 2.4 : 1.9, opacity: 0, duration: big ? 1.3 : 1, ease: "expo.out", delay: big ? 0.12 : 0.08 },
      );
    } else {
      g.to(zoom.current, { v: zoomTo, duration: 0.8, ease: "expo.out", onUpdate: setZoom });
    }
    settle(true, false);
  }, [level, settle, paint]);

  // ——— Scrolling tells the story: the track is pinned, each stop is a click ———
  useEffect(() => {
    const trackEl = track.current!;
    const el = root.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // The calm end state, straight away: the dial set to Home, no noise.
      // (The stylesheet shows the control and hides the scroll cue.)
      arrived.current = 0;
      store.set({ level: 3 });
      return;
    }
    let cancelled = false;
    let kill = () => {};
    // The gap between how many notifications the scroll says are in (wanted)
    // and how many are (arrived) plays out one card at a time.
    let landTimer = 0;
    // The detent the scroll last crossed into, the last click and the moment
    // the last forward run of notifications finished landing.
    let from = 0;
    let lastTurn = -Infinity;
    let lastLand = -Infinity;
    // Queued detents live in `turns`, where a hand on the control can clear
    // them.
    const queued = turns.current;

    // Once the hero is half scrolled away (a fast scroll or a nav link past
    // it), nobody is watching the story any more, so whatever is still queued
    // catches up at once and silently: no chimes or clicks under the next
    // section. The scroll stops sending updates once the track is behind it,
    // so every queued step checks this for itself before it plays.
    const unseen = () => el.getBoundingClientRect().bottom < innerHeight * 0.5;
    const flush = () => {
      window.clearTimeout(landTimer);
      window.clearTimeout(queued.timer);
      landTimer = queued.timer = 0;
      // The dial first, so the cards go straight to where it leaves them.
      if (queued.pending !== null) {
        turnTo(queued.pending, "quiet");
        queued.pending = null;
      }
      if (arrived.current !== wanted.current) {
        arrived.current = wanted.current;
        settle(false, false);
      }
    };

    // Clicks the dial towards the scroll's detent. Down is at once; up waits
    // until the noise has landed and been held a beat, then goes one detent
    // at a time, so even a fling past every stop gets Desk's big punch before
    // Room and Home.
    const release = () => {
      window.clearTimeout(queued.timer);
      queued.timer = 0;
      if (queued.pending === null) return;
      if (unseen()) return flush();
      const lvl = store.get().level;
      if (queued.pending <= lvl) {
        turnTo(queued.pending, "scroll");
        queued.pending = null;
        return;
      }
      if (arrived.current < wanted.current) return; // land() calls back once they're in
      const wait = Math.max(lastTurn + DETENT_GAP, lastLand + HOLD) - performance.now();
      if (wait > 0) {
        queued.timer = window.setTimeout(release, wait);
        return;
      }
      turnTo(lvl + 1, "scroll");
      lastTurn = performance.now();
      if (lvl + 1 === queued.pending) queued.pending = null;
      else queued.timer = window.setTimeout(release, DETENT_GAP);
    };

    // Lands (or, going back, dismisses) the next notification, and books the
    // one after it, each with its chime.
    const land = () => {
      landTimer = 0;
      if (unseen()) return flush();
      if (arrived.current !== wanted.current) {
        const forward = wanted.current > arrived.current;
        arrived.current += forward ? 1 : -1;
        settle(true, forward);
        if (arrived.current !== wanted.current) {
          landTimer = window.setTimeout(land, forward ? LAND_GAP : LEAVE_GAP);
          return;
        }
        if (forward) lastLand = performance.now();
      }
      release();
    };

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      gsapRef.current = gsap;
      settle(false, false);
      const share = (p: number, [a, b]: number[]) => clamp01((p - a!) / (b! - a!));
      let away = "";
      let lift = "";
      const st = ScrollTrigger.create({
        trigger: trackEl,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          // The headline steps aside and the dial rises to the middle. Both
          // stop early in the track, so past them a frame writes nothing.
          const a = share(p, AWAY).toFixed(4);
          // Each is set on what reads it, not the hero, so a frame of it
          // restyles a few elements rather than the whole hero.
          if (a !== away) {
            away = a;
            copy.current?.style.setProperty("--away", a);
            el.toggleAttribute("data-away", Number(a) > 0.6);
            el.toggleAttribute("data-gone", Number(a) >= 1);
          }
          const l = share(p, LIFT).toFixed(4);
          if (l !== lift) {
            lift = l;
            dialBox.current?.style.setProperty("--lift", l);
            zone.current?.style.setProperty("--lift", l);
            // The rising dial carries the zone, so its rim is fitted again.
            if (q.current.v > 0) fitRim();
          }
          setAwake(p > AWAKE);
          const count = Math.round(share(p, ARRIVE) * NOISE.length);
          const at = STOPS.filter((s) => p >= s).length;
          const more = count !== wanted.current;
          wanted.current = count;
          // Only a crossing moves the dial, so a hand-set zone holds until the
          // visitor scrolls across the next stop.
          const crossed = at !== from;
          if (crossed) {
            from = at;
            queued.pending = at;
          }
          // Jumped right past the hero in one go: nothing is left to play.
          if (p >= 1 && unseen()) return flush();
          if (more && !landTimer) land();
          if (crossed) release();
        },
      });
      kill = () => st.kill();
    });
    return () => {
      cancelled = true;
      kill();
      window.clearTimeout(landTimer);
      window.clearTimeout(queued.timer);
      queued.timer = 0;
      queued.pending = null;
    };
  }, [turnTo, settle, fitRim]);

  // ——— Dragging the crown round ———
  useEffect(() => {
    const el = grip.current!;
    let drag: { id: number; start: number; from: number; last: number; cx: number; cy: number; flat: number } | null = null;
    const angle = (x: number, y: number, d: NonNullable<typeof drag>) => Math.atan2((y - d.cy) / d.flat, x - d.cx);
    const STEP = (40 * Math.PI) / 180; // one detent per 40° of hand movement

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      const d = { id: e.pointerId, start: 0, from: store.get().level, last: 0, cx: r.left + r.width / 2, cy: r.top + r.height * 0.42, flat: 0.52 };
      d.start = d.last = angle(e.clientX, e.clientY, d);
      drag = d;
      live.drag = d.from;
      el.dataset.dragging = "";
      setTouched(true);
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      let a = angle(e.clientX, e.clientY, drag);
      // Unwrap, so a turn past the left edge keeps counting.
      while (a - drag.last > Math.PI) a -= Math.PI * 2;
      while (a - drag.last < -Math.PI) a += Math.PI * 2;
      drag.last = a;
      const v = Math.max(0, Math.min(3, drag.from + (a - drag.start) / STEP));
      live.drag = v;
      turnTo(v, "drag");
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      live.drag = null;
      delete el.dataset.dragging;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [turnTo]);

  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowRight: level + 1,
      ArrowUp: level + 1,
      PageUp: level + 1,
      ArrowLeft: level - 1,
      ArrowDown: level - 1,
      PageDown: level - 1,
      Home: 0,
      End: 3,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    turnTo(map[e.key]!, "key");
  };

  const zoneNow = ZONES[level]!;

  return (
    <section ref={root} id="top" className={styles.hero} data-theme="day" data-level={level} aria-labelledby="hero-title">
      <div ref={track} className={styles.track}>
        <div className={styles.stage}>
          <div ref={copy} className={styles.copy}>
            <h1 id="hero-title" className={`display ${styles.title}`}>
              {HERO.title}
            </h1>
            <p className={`lede ${styles.offer}`}>{HERO.offer}</p>
            <div className={styles.actions}>
              <a className="btn btn-lg" href="#preorder">
                Pre-order <Arrow />
              </a>
              <a className={`btn btn-lg btn-ghost ${styles.how}`} href="#how">
                How it works
              </a>
            </div>
          </div>

          <div ref={zone} className={styles.zone} aria-hidden="true" />

          <ul ref={noise} className={styles.noise} aria-hidden="true" data-depicted="">
            {NOISE.map((n, i) => {
              const [x, y, tilt] = SPOTS[i]!;
              return (
                <li
                  key={n.app}
                  className={styles.banner}
                  data-level={n.level}
                  data-state="waiting"
                  style={{ "--x": `${x}%`, "--y": `${y}%`, "--r": `${tilt}deg`, "--i": i } as React.CSSProperties}
                >
                  <span className={styles.mover}>
                    <span className={styles.card}>
                      <AppIcon app={n.app} className={styles.icon} />
                      <span className={styles.bannerText}>
                        <strong>{APP_NAMES[n.app]}</strong>
                        <span>{n.text}</span>
                      </span>
                      <span className={styles.now}>now</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div ref={dialBox} className={styles.dial}>
            <div ref={burst} className={styles.burst} aria-hidden="true" />
            <DialAnchor kind="home" name="hero" order={0} still="/stills/home-night-off.webp" priority className={styles.anchor} />
            <div
              ref={grip}
              className={styles.grip}
              role="slider"
              tabIndex={0}
              aria-label="Cairn Home dial"
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={level}
              aria-valuetext={zoneNow.spoken}
              aria-describedby="hero-zone-line"
              onKeyDown={onKey}
            />
            <p className={styles.hint} data-hidden={touched || !awake ? "" : undefined} aria-hidden="true">
              Drag to turn
            </p>
          </div>

          <p className={styles.cue} data-hidden={awake ? "" : undefined} aria-hidden="true">
            <span className={styles.cueLine} />
            Scroll
          </p>

          <div className={styles.controls} data-shown={awake ? "" : undefined}>
            <div className={styles.zones} role="radiogroup" aria-label="Zone">
              <span className={styles.thumb} style={{ "--at": level } as React.CSSProperties} aria-hidden="true" />
              {ZONES.map((z, i) => (
                <button
                  key={z.id}
                  type="button"
                  role="radio"
                  aria-checked={level === i}
                  className={styles.zoneButton}
                  data-zone={z.id}
                  onClick={() => turnTo(i, "button")}
                >
                  <span>{z.label}</span>
                  <span className={`readout ${styles.range}`}>{z.range}</span>
                </button>
              ))}
            </div>
            <p id="hero-zone-line" className={styles.line} aria-live="polite">
              {zoneNow.line}
            </p>
          </div>

          <div className={styles.toast} data-on={level === 3 ? "" : undefined} role="status">
            {level === 3 && (
              <>
                <Mark level={3} className={styles.toastMark} />
                <span className={styles.toastText}>
                  <strong>{HERO.lock.title}</strong>
                  <span>{HERO.lock.text}</span>
                </span>
                <span className={styles.now}>now</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
