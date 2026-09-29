"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ZONES, type Level } from "@/lib/content";
import { AppIcon, APP_NAMES } from "@/components/brand/AppIcon";
import { Lock } from "@/components/icons";
import type { HouseScene, WalkState } from "./scene";
import { MARKS, PHONES } from "./plan";
import styles from "./HouseStage.module.css";

type Props = {
  level: Level;
  walk: boolean;
  still: boolean;
  replay: number;
  labels: boolean;
  pocket: boolean;
  walker: boolean;
  onLevel: (level: Level) => void;
  onWalk: (state: WalkState) => void;
};

const COVERS = ["", "the desk", "the study", "the whole house"];
const MODE = ["off", "desk", "room", "home"] as const;

// A lock is lit in the colour of the light that holds its phone, which,
// while one mode drains back past another, isn't always the dial's.
const litBy = (level: Level) =>
  ({ "--zone-lit": `var(--mode-${MODE[level]})`, "--zone-lit-ink": `var(--mode-${MODE[level]}-ink)` }) as CSSProperties;

// A pin comes no closer to the frame's edge than this (CSS pixels): nearer,
// it's hidden rather than left cut off.
const EDGE = 4;
const FIGURE = MARKS.indexOf("figure");
const DIAL = MARKS.indexOf("dial");

// Where a label can sit round its point, best first: on its own side, then
// the other, then straight up (Cairn Home's on a taller lead, over the pins
// round the desk). It moves only to keep off a phone's pin or inside the
// frame.
const SIDES: Partial<Record<number, string[]>> = { [DIAL]: ["", "right", "up"], [FIGURE]: ["", "right", "up"] };

type Box = [number, number, number, number];
const clash = (a: Box, b: Box, pad = 6) => a[0] < b[2] + pad && b[0] < a[2] + pad && a[1] < b[3] + pad && b[1] < a[3] + pad;
// How much of box a lies over box b grown by `pad`, in square pixels.
const covered = (a: Box, b: Box, pad = 0) =>
  Math.max(0, Math.min(a[2], b[2] + pad) - Math.max(a[0], b[0] - pad)) * Math.max(0, Math.min(a[3], b[3] + pad) - Math.max(a[1], b[1] - pad));
// A label may brush a pin's card, by no more than this share of its own
// area, but never the phone the pin stands on.
const BRUSH = 0.15;
// The phone itself, round its point.
const BODY: Box = [-10, -2, 10, 8];

// The scale an element is animating through (the note, the lock and the
// stem shrink and grow about their foot's centre).
function scaleOf(el: Element): [number, number] {
  const s = getComputedStyle(el).scale;
  if (!s || s === "none") return [1, 1];
  const [x = 1, y = x] = s.split(" ").map(Number);
  return [Math.max(0.05, x || 1), Math.max(0.05, y || 1)];
}

// A pin's reach from its point, at full size, whatever it's showing now
// (leaving out one part, `skip`, such as the lock while measuring the
// notification). A label's lead is a hairline that may cross anything, so
// it doesn't count.
function extent(pin: HTMLDivElement, skip?: string): Box {
  const box: Box = [Infinity, Infinity, -Infinity, -Infinity];
  const p = pin.getBoundingClientRect();
  for (const child of pin.children) {
    if (child.classList.contains(styles.lead!) || (skip && child.classList.contains(skip))) continue;
    const r = child.getBoundingClientRect();
    const [sx, sy] = scaleOf(child);
    const ox = (r.left + r.right) / 2;
    const oy = r.bottom;
    for (const el of [child, ...child.children]) {
      const q = el.getBoundingClientRect();
      box[0] = Math.min(box[0], ox + (q.left - ox) / sx - p.left);
      box[1] = Math.min(box[1], oy + (q.top - oy) / sy - p.top);
      box[2] = Math.max(box[2], ox + (q.right - ox) / sx - p.left);
      box[3] = Math.max(box[3], oy + (q.bottom - oy) / sy - p.top);
    }
  }
  return Number.isFinite(box[0]) ? box : [0, 0, 0, 0];
}

// Every box a pin can take: a phone's with its notification and with its
// lock; a label's in each place it can sit, trying each in turn.
function measure(pin: HTMLDivElement | null, sides: string[] = [""]): Box[] {
  if (!pin) return sides.map(() => [0, 0, 0, 0]);
  if (pin.hasAttribute("data-phone")) return [extent(pin, styles.lock), extent(pin, styles.note)];
  const was = pin.getAttribute("data-side");
  const boxes = sides.map((side) => {
    if (side) pin.setAttribute("data-side", side);
    else pin.removeAttribute("data-side");
    return extent(pin);
  });
  if (was) pin.setAttribute("data-side", was);
  else pin.removeAttribute("data-side");
  return boxes;
}

const flag = (el: Element, name: string, on: boolean) => {
  if (on !== el.hasAttribute(name)) el.toggleAttribute(name, on);
};

// The house in real 3D, with its own canvas. WebGL starts only as the section
// nears the viewport (the model and its light are built in steps, so the
// page keeps scrolling), runs only while it's on screen, and the DOM pins
// that ride on it (notifications, locks, labels) stay crisp at any size.
export function HouseStage({ level, walk, still, replay, labels, pocket, walker, onLevel, onWalk }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pins = useRef<(HTMLDivElement | null)[]>([]);
  // How far each pin's card or label reaches from its point, as [left, top,
  // right, bottom] in CSS pixels, for each place it can sit: measured once,
  // and again after a resize, since labels differ in length and in size
  // from screen to screen.
  const reach = useRef<Box[][]>([]);
  const scene = useRef<HouseScene | null>(null);
  const latest = useRef({ level, walk, onLevel, onWalk });
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [locked, setLocked] = useState<boolean[]>(() => PHONES.map(() => false));
  const [lockLevels, setLockLevels] = useState<Level[] | null>(null);

  useEffect(() => {
    latest.current = { level, walk, onLevel, onWalk };
  });

  useEffect(() => {
    const el = frame.current!;
    const cv = canvas.current!;
    let cancelled = false;
    let visible = false;
    let started = false;
    // Within eight screens of the window (from anywhere in the hero): needed
    // soon, since its build takes a few seconds of frames, so its steps stop
    // waiting for the page to be still.
    let urgent = false;
    // Within a screen and a half: its GPU work goes whatever else on the
    // page is building, its steps kept apart only from each other.
    let close = false;
    let s: HouseScene | null = null;
    let size = { w: el.clientWidth, h: el.clientHeight };
    const run = () => s?.setActive(visible && !document.hidden);

    const start = async () => {
      if (started) return;
      started = true;
      const { createHouse } = await import("./scene");
      if (cancelled) return;
      try {
        s = await createHouse(
          cv,
          {
            frame: (pts) => {
              const { w, h } = size;
              if (!reach.current.length) reach.current = pins.current.map((pin, i) => measure(pin, SIDES[i]));
              const at = (i: number, k = 0): Box => {
                const r = reach.current[i]![k]!;
                const x = pts[i * 2]!;
                const y = pts[i * 2 + 1]!;
                return [x + r[0], y + r[1], x + r[2], y + r[3]];
              };
              const inFrame = (b: Box) => b[0] >= EDGE && b[1] >= EDGE && b[2] <= w - EDGE && b[3] <= h - EDGE;
              for (let i = 0; i < MARKS.length; i++) {
                const pin = pins.current[i];
                if (pin) pin.style.transform = `translate3d(${pts[i * 2]!.toFixed(1)}px, ${pts[i * 2 + 1]!.toFixed(1)}px, 0)`;
              }
              // The phones' pins and Pocket's label only ever hide at the edge.
              const cards: Box[] = [];
              const bodies: Box[] = [];
              for (let i = 0; i < MARKS.length; i++) {
                const pin = pins.current[i];
                if (!pin || SIDES[i]) continue;
                const box = at(i, i < PHONES.length && pin.hasAttribute("data-locked") ? 1 : 0);
                const out = !inFrame(box);
                flag(pin, "data-out", out);
                if (i >= PHONES.length) continue;
                const x = pts[i * 2]!;
                const y = pts[i * 2 + 1]!;
                bodies.push([x + BODY[0], y + BODY[1], x + BODY[2], y + BODY[3]]);
                if (!out) cards.push(box);
              }
              const phones = [...cards, ...bodies];
              // The labels keep off the phones' pins. Each stays where it is
              // while that's clear, goes back to its own side as soon as
              // that's clearly free, and otherwise moves to the first place
              // that is; with nowhere clear, to the first where it only
              // brushes a pin's card. With nowhere even that, it hides.
              const place = (i: number) => {
                const pin = pins.current[i];
                const sides = SIDES[i]!;
                if (!pin || !pin.hasAttribute("data-shown")) return null;
                const boxes = sides.map((_, k) => at(i, k));
                const cost = (k: number, pad: number) =>
                  inFrame(boxes[k]!) ? phones.reduce((sum, q) => sum + covered(boxes[k]!, q, pad), 0) : Infinity;
                const fits = (k: number) => {
                  const b = boxes[k]!;
                  const brushed = cards.reduce((sum, q) => sum + covered(b, q), 0);
                  return inFrame(b) && !bodies.some((q) => covered(b, q) > 0) && brushed <= BRUSH * (b[2] - b[0]) * (b[3] - b[1]);
                };
                let k = Math.max(0, sides.indexOf(pin.getAttribute("data-side") ?? ""));
                if (k !== 0 && cost(0, 14) === 0) k = 0;
                else if (cost(k, 6) > 0) {
                  const free = sides.findIndex((_, j) => cost(j, 12) === 0);
                  if (free >= 0) k = free;
                  else if (!fits(k)) k = Math.max(0, sides.findIndex((_, j) => fits(j)));
                }
                if (sides[k]) pin.setAttribute("data-side", sides[k]!);
                else pin.removeAttribute("data-side");
                const shown = fits(k);
                flag(pin, "data-out", !shown);
                return shown ? boxes[k]! : null;
              };
              const walker = place(FIGURE);
              const dial = place(DIAL);
              // While the walker's label is up and would sit on Cairn Home's,
              // theirs wins; Cairn Home's comes back as they arrive.
              const pin = pins.current[DIAL];
              if (pin) flag(pin, "data-yield", !!walker && !!dial && clash(walker, dial));
            },
            locks: (l, levels) => {
              setLocked(l);
              setLockLevels(levels);
            },
            level: (l) => latest.current.onLevel(l),
            walk: (w) => latest.current.onWalk(w),
            ready: () => setStatus("ready"),
            lost: () => setStatus("fallback"),
          },
          {
            still,
            // Phones and narrow windows, as How.module.css has them.
            small: window.matchMedia("(max-width: 820px)").matches,
            fine: window.matchMedia("(pointer: fine)").matches,
            width: size.w,
            height: size.h,
          },
          () => cancelled,
          () => (close ? "now" : urgent),
          async () => {
            while (!cancelled && !close && document.documentElement.dataset.gl !== "ready") await new Promise((r) => window.setTimeout(r, 200));
          },
        );
      } catch {
        if (!cancelled) setStatus("fallback");
        return;
      }
      if (!s) return;
      if (cancelled) {
        s.dispose();
        s = null;
        return;
      }
      scene.current = s;
      const r = el.getBoundingClientRect();
      s.setLevel(latest.current.level);
      s.setWalk(latest.current.walk);
      s.resize(r.width, r.height);
      run();
    };

    // Started well ahead, so it's ready by the time it scrolls into view. The
    // model and its surfaces are made off the page from the visitor's first
    // move, in a quiet moment; the GPU work waits for the page's device
    // canvas (so a phone never makes a context before a touch, and the two
    // don't build at once), or for the section to near. Then it's made a
    // step at a time, as fast as the frames allow, unless the visitor is far
    // past the house, when each step waits for a still moment.
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        close = true;
        void start();
      },
      { rootMargin: "150% 0px" },
    );
    const soon = new IntersectionObserver(
      (entries) => {
        urgent = entries[entries.length - 1]!.isIntersecting;
      },
      { rootMargin: "800% 0px" },
    );
    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]!.isIntersecting;
      run();
    });
    near.observe(el);
    soon.observe(el);
    seen.observe(el);
    const INTENTS = ["pointermove", "pointerdown", "scroll", "keydown", "touchstart"] as const;
    const onIntent = () => {
      INTENTS.forEach((type) => window.removeEventListener(type, onIntent));
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => !cancelled && void start(), { timeout: 1500 });
      else void start();
    };
    INTENTS.forEach((type) => window.addEventListener(type, onIntent, { passive: true }));

    const sized = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      size = { w: r.width, h: r.height };
      reach.current = [];
      s?.resize(r.width, r.height);
    });
    sized.observe(el);

    const onPointer = (e: PointerEvent) => {
      if (!s || !visible) return;
      const r = el.getBoundingClientRect();
      s.setPointer((e.clientX - (r.left + r.width / 2)) / (r.width * 0.75), (e.clientY - (r.top + r.height / 2)) / (r.height * 0.75));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", run);

    return () => {
      cancelled = true;
      INTENTS.forEach((type) => window.removeEventListener(type, onIntent));
      near.disconnect();
      soon.disconnect();
      seen.disconnect();
      sized.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", run);
      s?.dispose();
      scene.current = null;
    };
  }, [still]);

  useEffect(() => {
    scene.current?.setLevel(level);
  }, [level]);

  useEffect(() => {
    scene.current?.setWalk(walk);
  }, [walk]);

  useEffect(() => {
    if (replay > 0) scene.current?.replay();
  }, [replay]);

  const count = locked.filter(Boolean).length;
  const zone = ZONES[level]!;
  const now =
    level === 0
      ? "The dial is off, and all four phones are buzzing."
      : `The dial is set to ${zone.label}: the zone covers ${COVERS[level]}, and ${count} of 4 phones ${count === 1 ? "is" : "are"} locked.`;

  return (
    <figure className={styles.stage} data-scene={status} data-labels={labels ? "" : undefined} data-locked={count} data-depicted="">
      <div ref={frame} className={styles.frame}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <div className={styles.pins} aria-hidden="true">
          {PHONES.map((p, i) => (
            <div
              key={p.id}
              ref={(el) => {
                pins.current[i] = el;
              }}
              className={styles.pin}
              data-phone={p.id}
              data-locked={locked[i] ? "" : undefined}
              style={lockLevels ? litBy(lockLevels[i]!) : undefined}
            >
              <span className={styles.stem} />
              <span className={styles.note}>
                <AppIcon app={p.app} className={styles.icon} />
                <span className={styles.badge}>{p.count}</span>
              </span>
              <span className={styles.lock}>
                <Lock />
              </span>
            </div>
          ))}
          {["Cairn Home", "Cairn Pocket", "You, at 1 a.m."].map((t, k) => (
            <div
              key={t}
              ref={(el) => {
                pins.current[PHONES.length + k] = el;
              }}
              className={styles.pin}
              data-tag={["dial", "pocket", "figure"][k]}
              data-shown={[labels, pocket, walker][k] ? "" : undefined}
            >
              {k === 0 && <span className={styles.lead} />}
              <span className={styles.tag}>{t}</span>
            </div>
          ))}
        </div>
        <p className={styles.readout} aria-hidden="true">
          <span className={styles.mode}>
            <span className={styles.dot} />
            {zone.label}
            <span className={`readout ${styles.range}`}>{zone.range}</span>
          </span>
          <span className={styles.count}>
            {count} of 4 locked
          </span>
        </p>
        {status === "fallback" && <p className={styles.fallback}>{now}</p>}
      </div>
      <figcaption className="visually-hidden">
        A cutaway model of a flat at night, seen from above: warm lamps on in a bedroom, a study, a kitchen, a hall and a living
        room with oak floors, a sofa and rug, a bookshelf, plants and a dining table. Cairn Home sits on the study desk under the
        window, and Cairn Pocket is stuck on the wall by the front door. There are phones on the bed, the sofa, the kitchen island
        and the desk, showing {PHONES.map((p) => APP_NAMES[p.app]).join(", ")}. The zone is light in the mode&apos;s colour that
        spreads from the dial across the floor and stops at the walls. {walk ? "Someone gets out of bed, walks across the house to the desk and turns the dial down. " : ""}
        {now}
      </figcaption>
    </figure>
  );
}
