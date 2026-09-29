"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { NOISE, POCKET_APPS, POCKET_TRY } from "@/lib/content";
import { sound } from "@/lib/sound";
import { DialAnchor } from "@/components/dial/DialAnchor";
import { AppIcon, APP_NAMES } from "@/components/brand/AppIcon";
import { Lock, Tap } from "@/components/icons";
import styles from "./PocketTry.module.css";

// Pocket, to try. It's stuck on the hallway wall beside the front door (the
// same wall as the story before this, rendered from its scene), and your
// phone is across the room. Drag the phone onto it (or press the button) and
// it taps: a ripple, a tick you can feel, the tap's two notes, and the phone
// goes quiet. Tap again to have the apps back, which means carrying the
// phone all the way back to the door.

// Where the phone's antenna is, down from its top: the point that meets the disc.
const NFC = 0.2;
// The phone at the disc sits a touch smaller: pressed to the wall, further off.
const PRESSED = 0.95;
const TIMES = { reach: 520, snap: 180, lift: 200, hold: 650, back: 720 }; // ms
// How far the phone comes off the disc to tap it again, in its own height.
const LIFT = 0.1;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PocketTry() {
  const [locked, setLocked] = useState(false);
  const [taps, setTaps] = useState(0);
  // Where the phone is in a tap: on its way to the disc (or in the hand),
  // pressed to it, or on its way back. A press while it's out waits its turn
  // and taps again once this one has landed; a press while it's coming back
  // turns it round. The button stays enabled, so keyboard focus never drops.
  const phase = useRef<"reach" | "hold" | "back" | null>(null);
  const again = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const disc = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const drag = useRef<{ id: number; x: number; y: number; dx: number; dy: number; moved: boolean } | null>(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Moves the phone by (dx, dy) from where it rests, in pixels. `pose` is how
  // it's held: at rest, being carried, or pressed to the disc.
  const place = (dx: number, dy: number, pose: "rest" | "carry" | "tap", ms: number) => {
    const el = phone.current!;
    el.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    el.style.setProperty("--dy", `${dy.toFixed(1)}px`);
    el.style.setProperty("--move", `${ms}ms`);
    el.dataset.pose = pose;
  };

  // Where the phone rests, and the offset that puts its antenna on the disc.
  const geometry = () => {
    const el = phone.current!;
    const s = stage.current!.getBoundingClientRect();
    const d = disc.current!.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const rest = { x: s.left + parseFloat(cs.left), y: s.top + parseFloat(cs.top) };
    const h = el.offsetHeight;
    const target = { dx: d.left + d.width / 2 - rest.x, dy: d.top + d.height / 2 + (0.5 - NFC) * h * PRESSED - rest.y };
    return { s, d, rest, h, w: el.offsetWidth, target };
  };

  // The tap itself, once the phone is on the disc.
  const land = () => {
    const next = !lockedRef.current;
    lockedRef.current = next;
    setLocked(next);
    setTaps((n) => n + 1);
    sound.tap(next);
    try {
      navigator.vibrate?.(6);
    } catch {
      // haptics are a nicety
    }
  };

  // Carries the phone to the disc, taps, and takes it back across the room.
  const tapFrom = (fromDrag: boolean) => {
    clearTimers();
    again.current = false;
    const still = reducedMotion();
    const { target, h } = geometry();
    const reach = still ? 0 : fromDrag ? TIMES.snap : TIMES.reach;
    phase.current = "reach";
    place(target.dx, target.dy, "tap", reach);
    later(reach, () => settle(target, h, still));
  };

  // On the disc: the tap lands, the phone holds there a moment, then either
  // lifts off and taps again (a press came in meanwhile) or goes back.
  const settle = (target: { dx: number; dy: number }, h: number, still: boolean) => {
    land();
    phase.current = "hold";
    later(still ? 900 : TIMES.hold, () => {
      if (again.current) {
        again.current = false;
        phase.current = "reach";
        const ms = still ? 0 : TIMES.lift;
        place(target.dx, target.dy - h * LIFT, "carry", ms);
        later(ms, () => {
          place(target.dx, target.dy, "tap", still ? 0 : TIMES.snap);
          later(still ? 0 : TIMES.snap, () => settle(target, h, still));
        });
        return;
      }
      goBack(still);
    });
  };

  const goBack = (still: boolean) => {
    phase.current = "back";
    place(0, 0, "rest", still ? 0 : TIMES.back);
    later(still ? 0 : TIMES.back, () => (phase.current = null));
  };

  const onPress = () => {
    if (phase.current === "reach" || phase.current === "hold") again.current = true;
    else tapFrom(false);
  };

  // The phone lets the page have vertical swipes (touch-action: pan-y): a
  // swipe that starts on it still scrolls, and the browser cancels the drag.
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    clearTimers();
    const el = phone.current!;
    el.setPointerCapture(e.pointerId);
    const dx = parseFloat(el.style.getPropertyValue("--dx")) || 0;
    const dy = parseFloat(el.style.getPropertyValue("--dy")) || 0;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx, dy, moved: false };
    again.current = false;
    phase.current = "reach";
    stage.current!.dataset.dragging = "";
    place(dx, dy, "carry", 0);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    const mx = e.clientX - g.x;
    const my = e.clientY - g.y;
    if (Math.hypot(mx, my) > 6) g.moved = true;
    const { s, d, rest, h, w, target } = geometry();
    // Kept inside the wall, with a little margin.
    const x = Math.min(s.right - w / 2 - 8, Math.max(s.left + w / 2 + 8, rest.x + g.dx + mx));
    const y = Math.min(s.bottom - h / 2 - 8, Math.max(s.top + h / 2 + 8, rest.y + g.dy + my));
    place(x - rest.x, y - rest.y, "carry", 0);
    // Near enough when the antenna is over the disc.
    const near = Math.hypot(x - rest.x - target.dx, y - rest.y - target.dy) < d.width * 0.75;
    stage.current!.toggleAttribute("data-near", near);
  };

  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g || g.id !== e.pointerId) return;
    drag.current = null;
    const st = stage.current!;
    const near = st.hasAttribute("data-near");
    delete st.dataset.dragging;
    st.removeAttribute("data-near");
    // A drag onto the disc taps; a plain tap on the phone carries it there.
    // A cancelled one (the page took the swipe) only goes back to rest.
    if (e.type !== "pointercancel" && (near || !g.moved)) tapFrom(near);
    else goBack(reducedMotion());
  };

  const lockedApps = POCKET_APPS.length;

  return (
    <section id="tap" className={`section ${styles.try}`} data-theme="day" data-locked={locked ? "" : undefined} aria-labelledby="tap-title">
      <div className={`inner ${styles.grid}`}>
        <div className={styles.copy}>
          <h2 id="tap-title" className="title" data-reveal="">
            {POCKET_TRY.title}
          </h2>
          <p className={`lede ${styles.lede}`}>{POCKET_TRY.lede}</p>
          <div className={styles.controls}>
            <button type="button" className="btn btn-lg" onClick={onPress}>
              <Tap />
              {locked ? POCKET_TRY.unlock : POCKET_TRY.lock}
            </button>
            <p className={styles.status} role="status" aria-live="polite">
              <span className={styles.dot} aria-hidden="true" />
              {locked ? POCKET_TRY.locked : POCKET_TRY.unlocked}
            </p>
          </div>
        </div>

        <div ref={stage} className={styles.stage} data-fresh={taps === 0 ? "" : undefined} aria-hidden="true">
          <picture>
            <source media="(max-width: 600px) and (max-aspect-ratio: 21/20)" srcSet="/stills/pocket-wall-tall.webp" width={720} height={900} />
            <img className={styles.wall} src="/stills/pocket-wall.webp" alt="" width={1500} height={1200} loading="lazy" decoding="async" />
          </picture>

          {/* The guide and the ripple spread on the plaster and stop at the
              door's frame, which stands proud of it. */}
          <div className={styles.plaster}>
            <div className={styles.target} />
            <div key={taps} className={styles.ripple} data-on={taps > 0 ? "" : undefined}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <div ref={disc} className={styles.disc}>
            <DialAnchor kind="pocket" name="tap" tilt={1.32} still="/stills/pocket-night.webp" className={styles.anchor} />
          </div>

          <div
            ref={phone}
            className={styles.phone}
            data-pose="rest"
            data-depicted=""
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <div className={styles.body}>
              <div className={styles.screen}>
                <span className={styles.island} />
                <span className={styles.bar}>21:40</span>
                <span className={styles.date}>Friday 26 September</span>
                <span className={styles.time}>21:40</span>
                <ul className={styles.notes}>
                  {POCKET_APPS.map((app, i) => (
                    <li key={app} style={{ "--i": i } as CSSProperties}>
                      <AppIcon app={app} className={styles.noteIcon} />
                      <span className={styles.noteText}>
                        <strong>{APP_NAMES[app]}</strong>
                        <span>{NOISE.find((n) => n.app === app)?.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className={styles.quiet}>
                  <div className={styles.row}>
                    {POCKET_APPS.map((app) => (
                      <span key={app} className={styles.lockedApp}>
                        <AppIcon app={app} className={styles.lockedIcon} />
                        <span className={styles.badge}>
                          <Lock />
                        </span>
                      </span>
                    ))}
                  </div>
                  <span className={styles.quietTitle}>{lockedApps} apps locked</span>
                  <span className={styles.quietText}>Tap Pocket to unlock</span>
                </div>
                <span className={styles.home} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
