"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Minus, Plus } from "@/components/icons";
import { sound } from "@/lib/sound";
import { ChevronLeftIcon, ChevronRightIcon, CheckmarkIcon } from "./icons";
import { attachScroll } from "./scroll";
import { usePage } from "./Stack";
import styles from "./ios.module.css";

// The pieces every screen of the drawn app is made of, at iOS's own metrics:
// a tab's scrolling screen with a large title that hands over to a compact
// one, inset grouped lists, and the switch.

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The detent's feel, shared with the page's dial: a click (when sound is on)
// and a 6 ms buzz on touch.
export function detent(up: boolean) {
  sound.click(up);
  try {
    navigator.vibrate?.(6);
  } catch {
    // haptics are a nicety
  }
}

// The screen's own geometry, in points: a 62-point status bar over a 44-point
// navigation bar on top, the floating tab bar (62 points, 21 off the bottom)
// below. Controls brought into view clear both.
export const BARS = { top: 106, bottom: 83 };
const CLEAR = { top: BARS.top + 12, bottom: BARS.bottom + 20 };

// Scroll a screen, and only the screen, so an element clears the bars at the
// top and the floating tab bar at the bottom. The phone is scaled, so
// on-screen distances are converted back to points.
export function revealInScreen(el: HTMLElement | null, top = CLEAR.top, bottom = CLEAR.bottom) {
  const panel = el?.closest<HTMLElement>("[data-ios-scroll]");
  if (!el || !panel) return;
  const p = panel.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const k = p.height / panel.offsetHeight || 1;
  const from = (r.top - p.top) / k;
  const to = (r.bottom - p.top) / k;
  let delta = 0;
  if (to > panel.clientHeight - bottom) delta = to - (panel.clientHeight - bottom);
  if (from - delta < top) delta = from - top;
  if (Math.abs(delta) > 1) panel.scrollTo({ top: panel.scrollTop + delta, behavior: reducedMotion() ? "auto" : "smooth" });
}

type ScreenProps = {
  title: string;
  sub?: ReactNode;
  children: ReactNode;
  // A picture over the title on a pushed screen: an app's icon, a device.
  art?: ReactNode;
  // The navigation bar's trailing item.
  trailing?: ReactNode;
  // A mode whose colour the screen's controls take (a mode's own settings).
  tint?: string;
  screenRef?: (el: HTMLDivElement | null) => void;
};

// One screen, keeping its own scroll the way each screen does in iOS. The
// large title sits under the navigation bar; once it has scrolled under the
// bar, the inline title fades in over the scroll edge. Pulled down past the
// top, the large title stretches. A pushed screen's bar carries the back
// button.
export function Screen({ title, sub, children, art, trailing, tint, screenRef }: ScreenProps) {
  const page = usePage();
  const ref = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    const inner = content.current;
    const large = heading.current;
    if (!el || !inner || !large) return;
    return attachScroll(el, { content: inner, indicator: indicator.current, title: large, track: [BARS.top + 4, BARS.bottom + 12] });
  }, []);

  return (
    <div
      ref={(el) => {
        ref.current = el;
        screenRef?.(el);
      }}
      className={styles.screen}
      data-ios-scroll=""
      data-tint={tint}
    >
      <div className={styles.bar}>
        {page.depth > 0 && (
          <button type="button" className={styles.back} data-back="" aria-label="Back" onClick={page.pop}>
            <ChevronLeftIcon />
          </button>
        )}
        <span className={styles.inline} aria-hidden="true">
          {title}
        </span>
        {trailing && <span className={styles.trailing}>{trailing}</span>}
        <span ref={indicator} className={styles.indicator} aria-hidden="true" />
      </div>
      <div ref={content} className={styles.content} data-art={art ? "" : undefined}>
        <header className={styles.head} data-art={art ? "" : undefined}>
          {art}
          <h3 ref={heading} className={styles.large} tabIndex={-1}>
            {title}
          </h3>
          {sub && <p className={styles.sub}>{sub}</p>}
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}

// A number that travels to a new value on a spring and settles, written
// straight into its text so the screen around it doesn't re-render every
// frame. Reduced motion snaps. `format` must be a stable function.
export function Tween({ value, format, stiffness = 170, damping = 22 }: { value: number; format: (n: number) => string; stiffness?: number; damping?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [first] = useState(() => format(value));
  const spring = useRef({ x: value, v: 0, raf: 0 });

  useEffect(() => {
    const el = ref.current;
    const s = spring.current;
    if (!el) return;
    cancelAnimationFrame(s.raf);
    const write = (n: number) => {
      const text = format(n);
      if (el.textContent !== text) el.textContent = text;
    };
    if (reducedMotion()) {
      s.x = value;
      s.v = 0;
      write(value);
      return;
    }
    let last = performance.now();
    const step = (now: number) => {
      // A frame's timestamp is when it began, which can be before the effect
      // ran: never step back in time, or the spring flings the wrong way.
      const dt = Math.min(0.032, Math.max(0, (now - last) / 1000));
      last = now;
      s.v += ((value - s.x) * stiffness - s.v * damping) * dt;
      s.x += s.v * dt;
      const done = Math.abs(value - s.x) < 0.01 && Math.abs(s.v) < 0.01;
      if (done) {
        s.x = value;
        s.v = 0;
      }
      write(s.x);
      if (!done) s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(s.raf);
  }, [value, format, stiffness, damping]);

  return (
    <span ref={ref} aria-hidden="true">
      {first}
    </span>
  );
}

const clockOf = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Time left to a moment, as 14:59, ticking each second in its own text.
export function Countdown({ end }: { end: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [first] = useState(() => clockOf(end - Date.now()));
  useEffect(() => {
    const tick = () => {
      if (ref.current) ref.current.textContent = clockOf(end - Date.now());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [end]);
  return (
    <span ref={ref} className={styles.num}>
      {first}
    </span>
  );
}

// The light tap a control gives as it changes, where the device can buzz.
export function haptic(ms = 4) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // haptics are a nicety
  }
}

type SwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  id?: string;
  describedBy?: string;
  // Locked in place: announced as unavailable, and it shakes instead of moving.
  held?: boolean;
  onHeld?: () => void;
};

// The iOS switch: tap it, or slide the knob the way it should go. The knob
// stretches under a finger and springs across.
export function Switch({ checked, onChange, label, id, describedBy, held, onHeld }: SwitchProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const press = useRef<{ id: number; x: number; y: number; slid: boolean; shook: boolean } | null>(null);
  const slid = useRef(false);

  const refuse = () => {
    if (!reducedMotion())
      ref.current?.animate(
        [{ translate: "0" }, { translate: "-5px" }, { translate: "4px" }, { translate: "-3px" }, { translate: "2px" }, { translate: "0" }],
        { duration: 380, easing: "ease-out" },
      );
    onHeld?.();
  };

  const set = (next: boolean) => {
    if (held) return refuse();
    if (next === checked) return;
    onChange(next);
    haptic();
  };

  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={held || undefined}
      className={styles.switch}
      data-no-drag=""
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        slid.current = false;
        press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, slid: false, shook: false };
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (!p || p.id !== e.pointerId) return;
        const dx = e.clientX - p.x;
        if (!p.slid) {
          if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - p.y)) return;
          p.slid = true;
          ref.current?.setPointerCapture(e.pointerId);
        }
        const want = dx > 0;
        if (want === checked) return;
        if (held) {
          if (!p.shook) refuse();
          p.shook = true;
          return;
        }
        set(want);
      }}
      onPointerUp={() => {
        slid.current = press.current?.slid ?? false;
        press.current = null;
      }}
      onPointerCancel={() => {
        press.current = null;
      }}
      onClick={() => {
        // A slide has already set it; the click that ends one is not a tap.
        if (slid.current) {
          slid.current = false;
          return;
        }
        set(!checked);
      }}
    >
      <span className={styles.knob} />
    </button>
  );
}

// Dragging across a row of equal segments, the way iOS 26 lets a finger slide
// the tab bar's lens or a segmented control's thumb from one to the next.
// While it slides, the row carries --drag (a fractional index) and data-scrub;
// on release the nearest segment is picked. A press without a slide is left
// to the segment's own click, so keyboard and tap behave as before.
export function useScrub<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { count, pad, onPick, onNear }: { count: number; pad: number; onPick: (i: number) => void; onNear?: (i: number) => void },
) {
  const state = useRef<{ id: number; x: number; on: boolean; near: number } | null>(null);
  const swallow = useRef(false);

  const at = (x: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const k = r.width / el.offsetWidth || 1;
    const w = (r.width - 2 * pad * k) / count;
    return Math.min(count - 1, Math.max(0, (x - r.left - pad * k) / w - 0.5));
  };

  const end = (pick: boolean, x: number) => {
    const s = state.current;
    const el = ref.current;
    state.current = null;
    el?.removeAttribute("data-press");
    if (!s || !el || !s.on) return;
    swallow.current = true;
    el.removeAttribute("data-scrub");
    el.style.removeProperty("--drag");
    if (pick) onPick(Math.round(at(x)));
  };

  return {
    onPointerDown(e: React.PointerEvent<T>) {
      if (e.button !== 0) return;
      swallow.current = false;
      state.current = { id: e.pointerId, x: e.clientX, on: false, near: -1 };
      ref.current?.setAttribute("data-press", "");
    },
    onPointerMove(e: React.PointerEvent<T>) {
      const s = state.current;
      const el = ref.current;
      if (!s || !el || s.id !== e.pointerId) return;
      if (!s.on) {
        if (Math.abs(e.clientX - s.x) < 8) return;
        s.on = true;
        el.setPointerCapture(e.pointerId);
        el.setAttribute("data-scrub", "");
      }
      const f = at(e.clientX);
      el.style.setProperty("--drag", f.toFixed(3));
      const near = Math.round(f);
      if (near !== s.near) {
        s.near = near;
        onNear?.(near);
      }
    },
    onPointerUp(e: React.PointerEvent<T>) {
      end(true, e.clientX);
    },
    onPointerCancel(e: React.PointerEvent<T>) {
      end(false, e.clientX);
    },
    onLostPointerCapture(e: React.PointerEvent<T>) {
      if (state.current?.on) end(true, e.clientX);
    },
    onClickCapture(e: React.MouseEvent<T>) {
      if (!swallow.current) return;
      swallow.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}

// One half of the stepper. Held down, it repeats, a little faster each step,
// the way an iOS stepper does; a tap or a key press is one step.
function StepButton({ label, disabled, onStep, children }: { label: string; disabled: boolean; onStep: () => void; children: ReactNode }) {
  const timer = useRef(0);
  const repeated = useRef(false);
  const stop = () => window.clearTimeout(timer.current);
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);
  const step = () => {
    onStep();
    haptic(3);
  };
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        repeated.current = false;
        const next = (delay: number) => {
          timer.current = window.setTimeout(() => {
            repeated.current = true;
            step();
            next(Math.max(90, delay * 0.78));
          }, delay);
        };
        next(420);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={() => {
        if (repeated.current) {
          repeated.current = false;
          return;
        }
        step();
      }}
    >
      {children}
    </button>
  );
}

// The iOS stepper: one capsule, two halves.
export function Stepper({
  label,
  less,
  more,
  onLess,
  onMore,
  lessLabel = "Less",
  moreLabel = "More",
}: {
  label: string;
  less: boolean;
  more: boolean;
  onLess: () => void;
  onMore: () => void;
  lessLabel?: string;
  moreLabel?: string;
}) {
  return (
    <span className={styles.stepper} role="group" aria-label={label}>
      <StepButton label={lessLabel} disabled={!less} onStep={onLess}>
        <Minus />
      </StepButton>
      <span className={styles.stepRule} aria-hidden="true" />
      <StepButton label={moreLabel} disabled={!more} onStep={onMore}>
        <Plus />
      </StepButton>
    </span>
  );
}

// The iOS slider: a native range input, so keys and assistive tech work as
// they do anywhere, drawn as iOS 26 draws it: a thin track filled in the
// tint up to a capsule knob, with a small and a large symbol at its ends.
export function Slider({
  value,
  min,
  max,
  step,
  label,
  valueText,
  onChange,
  lead,
  trail,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  valueText: string;
  onChange: (v: number) => void;
  lead?: ReactNode;
  trail?: ReactNode;
}) {
  return (
    <span className={styles.slider} style={{ "--p": (value - min) / (max - min) } as React.CSSProperties}>
      {lead && <span className={styles.sliderEnd}>{lead}</span>}
      <input
        type="range"
        className={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        data-no-drag=""
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v === value) return;
          onChange(v);
          haptic(2);
        }}
      />
      {trail && <span className={styles.sliderEnd}>{trail}</span>}
    </span>
  );
}

// A row that opens a screen: the whole row is the button, with a chevron at
// its end. It stays highlighted while its screen is open and fades back as
// that screen closes, the way a table view deselects its row.
export function NavRow({
  icon,
  title,
  sub,
  detail,
  selected,
  onOpen,
  id,
  className,
  label,
}: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  detail?: ReactNode;
  selected?: boolean;
  onOpen: (el: HTMLButtonElement) => void;
  id?: string;
  className?: string;
  label?: string;
}) {
  return (
    <li className={`${styles.row} ${styles.navRow} ${className ?? ""}`}>
      <button type="button" id={id} className={styles.navButton} data-selected={selected ? "" : undefined} data-push="" aria-label={label} onClick={(e) => onOpen(e.currentTarget)}>
        {icon}
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{title}</span>
          {sub && <span className={styles.rowSub}>{sub}</span>}
        </span>
        {detail && <span className={styles.detail}>{detail}</span>}
        <ChevronRightIcon className={styles.chevron} />
      </button>
    </li>
  );
}

// A row in a list you pick from: a checkmark in the tint marks the ones
// chosen. Many can be chosen (a checkbox) or one (a radio).
export function CheckRow({
  icon,
  title,
  sub,
  checked,
  onToggle,
  single,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  checked: boolean;
  onToggle: () => void;
  single?: boolean;
  className?: string;
}) {
  return (
    <li className={`${styles.row} ${styles.navRow} ${className ?? ""}`}>
      <button
        type="button"
        role={single ? "radio" : "checkbox"}
        aria-checked={checked}
        className={styles.navButton}
        onClick={() => {
          onToggle();
          haptic(3);
        }}
      >
        {icon}
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{title}</span>
          {sub && <span className={styles.rowSub}>{sub}</span>}
        </span>
        <CheckmarkIcon className={styles.check} data-on={checked ? "" : undefined} />
      </button>
    </li>
  );
}

// A small symbol in a rounded tile, as iOS Settings draws its rows' icons.
// A mode's own tile takes that mode's colour.
export function Tile({ children, mode }: { children: ReactNode; mode?: string }) {
  return (
    <span className={styles.tile} data-mode={mode} aria-hidden="true">
      {children}
    </span>
  );
}

export function GroupHead({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h4 id={id} className={styles.groupHead}>
      {children}
    </h4>
  );
}

export function Footnote({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} className={styles.footnote}>
      {children}
    </p>
  );
}

export { styles as ios };
