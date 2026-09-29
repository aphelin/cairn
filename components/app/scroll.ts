"use client";

// Scrolling inside the drawn phone the way an iPhone scrolls. A wheel or
// trackpad gesture that starts over the screen belongs to the screen until it
// ends, the way a browser latches a gesture to one scroller; one that starts
// where the screen can't go any further is the page's. With a mouse you can
// also drag the screen like a finger and flick it: it glides on at iOS's
// deceleration, and past either end it stretches and springs back. Touch
// keeps the browser's own scrolling, which already does all of this.

const GAP = 160; // ms between wheel events that still belong to one gesture
const DECEL = 0.998; // iOS's normal deceleration rate, per millisecond
const SPRING = 0.012; // the bounce back from an edge: a critically damped spring, per ms
const SLOP = 6; // points a press can wander before it becomes a drag
const WHEEL_STRETCH = 130; // how far a wheel may pull past an edge, before the rubber band

type Controller = { wheel: (dy: number) => void };

const controllers = new WeakMap<HTMLElement, Controller>();
const latch = { at: -Infinity, owner: null as HTMLElement | null };
let listeners = 0;

const room = (el: HTMLElement, dy: number) =>
  dy > 0 ? el.scrollTop < el.scrollHeight - el.clientHeight - 1 : dy < 0 ? el.scrollTop > 1 : false;

function onWheel(e: WheelEvent) {
  if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
  const dy = e.deltaY * unit;
  const fresh = e.timeStamp - latch.at > GAP;
  latch.at = e.timeStamp;
  if (fresh) {
    // Over the bars round a screen (the status bar, the tab bar), the wheel
    // moves the screen that's showing, as a finger there would.
    const t = e.target instanceof Element ? e.target : null;
    const el =
      t?.closest<HTMLElement>("[data-ios-scroll]") ??
      t?.closest("[data-ios-host]")?.querySelector<HTMLElement>("[role=tabpanel]:not([hidden]) > [data-ios-top] > [data-ios-scroll]") ??
      null;
    latch.owner = el && controllers.has(el) && room(el, dy) ? el : null;
  }
  const owner = latch.owner;
  if (!owner) return;
  if (!owner.isConnected || owner.hidden) {
    latch.owner = null;
    return;
  }
  // The screen has it: keep it from the page's smooth scroll too.
  e.preventDefault();
  e.stopPropagation();
  controllers.get(owner)?.wheel(dy);
}

// iOS's rubber band: the further past the edge, the less each point of pull moves.
const rubber = (x: number, d: number) => Math.sign(x) * (1 - 1 / ((Math.abs(x) * 0.55) / d + 1)) * d;

type Parts = {
  // What moves when the screen stretches past an edge.
  content: HTMLElement;
  // The scroll indicator, drawn while the screen moves.
  indicator: HTMLElement | null;
  // The large title: the inline title takes over once it has scrolled under
  // the bar, and it grows when the screen is pulled past the top.
  title: HTMLElement;
  // Where the indicator's track runs, in points from the top and the bottom.
  track: [number, number];
};

// Everything here runs per frame while the screen moves, so it reads the
// layout only when the layout has changed (sizes are kept from a resize
// observer), never between its own writes, and it writes only what changed.
export function attachScroll(el: HTMLElement, { content, indicator, title, track }: Parts) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raw = el.scrollTop; // the position, free to run past either end
  let target = raw; // where a wheel gesture is heading
  let vel = 0; // points per ms, while a flick glides
  let mode: "idle" | "wheel" | "fling" = "idle";
  let raf = 0;
  let last = 0;
  let wheelAt = 0;
  let hide = 0;
  let stretch = 0;
  let pull = "0";
  let drag: { id: number; y0: number; raw0: number; moved: boolean; samples: { t: number; raw: number }[] } | null = null;
  let swallow = false;
  let pos = el.scrollTop; // the scroll position, as last set or seen
  let under = pos > 1;
  let compact = false;
  let lifted = false;
  let shown = { y: -1, h: -1, on: false };

  // Sizes, kept up to date by observers rather than read every frame. The
  // phone is scaled as a whole, so on-screen distances are divided by `k`.
  let size = { client: el.clientHeight, full: el.scrollHeight, handover: 0, k: 1 };
  const art = !!title.closest("[data-art]");
  const measure = () => {
    size = {
      client: el.clientHeight,
      full: el.scrollHeight,
      // The large title has gone under the bar (106 points) once the screen
      // has scrolled past its bottom edge; a title under a picture (an app's
      // screen) hands over at its middle, since a short screen may never
      // scroll it all the way under.
      handover: title.offsetTop + (art ? title.offsetHeight / 2 : title.offsetHeight) - 108,
      k: el.getBoundingClientRect().height / el.offsetHeight || 1,
    };
    // A screen measured while hidden learns its title's place only now.
    if (compact !== pos > size.handover) el.toggleAttribute("data-compact", (compact = pos > size.handover));
  };
  measure();
  const resize = new ResizeObserver(measure);
  resize.observe(el);
  resize.observe(content);
  window.addEventListener("resize", measure);

  const max = () => Math.max(0, size.full - size.client);

  // The indicator, the scroll edge and the inline title follow the position.
  const paint = () => {
    const top = pos;
    if (under !== top > 1) el.toggleAttribute("data-under", (under = top > 1));
    if (compact !== top > size.handover) el.toggleAttribute("data-compact", (compact = top > size.handover));
    const next = stretch < 0 ? (-stretch).toFixed(1) : "0";
    // Only the title reads it, so only the title restyles.
    if (next !== pull) title.style.setProperty("--pull", (pull = next));
    if (!indicator) return;
    const m = max();
    if (m < 1) return;
    const [t, b] = track;
    const len = size.client - t - b;
    let h = Math.max(36, (len * size.client) / size.full);
    let y = t + (len - h) * Math.min(1, Math.max(0, top / m));
    if (stretch) {
      h = Math.max(8, h - Math.abs(stretch));
      y = stretch < 0 ? t : size.client - b - h;
    }
    if (Math.abs(y - shown.y) > 0.05) indicator.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    if (Math.abs(h - shown.h) > 0.05) indicator.style.height = `${h.toFixed(1)}px`;
    if (!shown.on) indicator.setAttribute("data-show", "");
    shown = { y, h, on: true };
    window.clearTimeout(hide);
    hide = window.setTimeout(() => {
      indicator.removeAttribute("data-show");
      shown.on = false;
    }, 650);
  };

  // Put the screen where `raw` says: scrolled inside the range, stretched past it.
  const place = () => {
    const m = max();
    const top = Math.min(m, Math.max(0, raw));
    stretch = raw === top ? 0 : rubber(raw - top, size.client);
    if (Math.abs(pos - top) > 0.01) el.scrollTop = pos = top;
    // Stretched, the content moves on its own layer, so the rubber band
    // doesn't repaint the screen every frame.
    if (lifted !== !!stretch) content.style.willChange = (lifted = !!stretch) ? "transform" : "";
    content.style.transform = stretch ? `translate3d(0, ${(-stretch).toFixed(2)}px, 0)` : "";
    paint();
  };

  const frame = (now: number) => {
    // Frame timestamps can come before `last` (taken mid-frame): never negative.
    const total = Math.max(0, Math.min(64, now - last));
    last = now;
    let busy = false;
    if (mode === "wheel") {
      const idle = now - wheelAt > 140;
      const m = max();
      if (idle) target = Math.min(m, Math.max(0, target));
      raw += (target - raw) * (1 - Math.pow(0.8, total / 16.67));
      busy = Math.abs(target - raw) > 0.25 || !idle;
      if (!busy) raw = target;
    } else if (mode === "fling") {
      // Small steps keep the spring steady at any frame rate.
      for (let t = 0; t < total; t += 4) {
        const dt = Math.min(4, total - t);
        const m = max();
        const edge = raw < 0 ? 0 : raw > m ? m : null;
        if (edge === null) {
          vel *= Math.pow(DECEL, dt);
          raw += vel * dt;
        } else {
          const x = raw - edge;
          vel += (-SPRING * SPRING * x - 2 * SPRING * vel) * dt;
          raw += vel * dt;
        }
      }
      const m = max();
      const inside = raw >= 0 && raw <= m;
      busy = inside ? Math.abs(vel) > 0.01 : Math.abs(vel) > 0.005 || Math.abs(raw - Math.min(m, Math.max(0, raw))) > 0.4;
      if (!busy) raw = Math.min(m, Math.max(0, raw));
    }
    place();
    if (busy) raf = requestAnimationFrame(frame);
    else {
      raf = 0;
      mode = "idle";
    }
  };

  const run = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    mode = "idle";
  };

  controllers.set(el, {
    wheel(dy) {
      const k = size.k;
      if (mode !== "wheel") {
        stop();
        raw = target = stretch ? raw : pos;
      }
      mode = "wheel";
      wheelAt = performance.now();
      const m = max();
      target = Math.min(m + WHEEL_STRETCH, Math.max(-WHEEL_STRETCH, target + dy / k));
      if (reduce) {
        raw = target = Math.min(m, Math.max(0, target));
        place();
        mode = "idle";
        return;
      }
      run();
    },
  });

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [data-no-drag]")) return;
    stop();
    if (!stretch) raw = pos;
    drag = { id: e.pointerId, y0: e.clientY, raw0: raw, moved: false, samples: [] };
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const k = size.k;
    const dy = (e.clientY - drag.y0) / k;
    if (!drag.moved) {
      if (Math.abs(dy) < SLOP) return;
      drag.moved = true;
      drag.y0 = e.clientY;
      drag.raw0 = raw;
      el.setPointerCapture(e.pointerId);
      el.setAttribute("data-dragging", "");
      window.getSelection()?.removeAllRanges();
      return;
    }
    raw = drag.raw0 - dy;
    // Past an edge, the rubber band already slows the screen; hold the
    // pull inside the band so a long drag can't wind it up for ever.
    const m = max();
    raw = Math.min(m + size.client, Math.max(-size.client, raw));
    place();
    drag.samples.push({ t: e.timeStamp, raw });
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0]!.t > 90) drag.samples.shift();
  };

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    const s = drag.samples;
    drag = null;
    el.removeAttribute("data-dragging");
    if (!moved) return;
    swallow = true;
    const a = s[0];
    const b = s[s.length - 1];
    // A flick is the last few moves; a drag that stopped before letting go doesn't glide.
    vel = a && b && b.t > a.t && e.timeStamp - b.t < 60 ? (b.raw - a.raw) / (b.t - a.t) : 0;
    vel = Math.max(-8, Math.min(8, vel));
    if (reduce) {
      vel = 0;
      raw = Math.min(max(), Math.max(0, raw));
      place();
      return;
    }
    mode = "fling";
    run();
  };

  // A drag isn't a tap: the click it ends on is dropped.
  const onClick = (e: MouseEvent) => {
    if (!swallow) return;
    swallow = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const onDownReset = () => {
    swallow = false;
  };

  // Scroll events come once a frame, before it's drawn, when the layout is
  // already clean: the one place the position is read back.
  const onScroll = () => {
    pos = el.scrollTop;
    if (mode === "idle" && !drag) {
      raw = pos;
      stretch = 0;
    }
    paint();
  };

  if (!listeners++) window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  el.addEventListener("pointerdown", onDownReset, true);
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("click", onClick, true);
  el.addEventListener("scroll", onScroll, { passive: true });
  el.toggleAttribute("data-compact", (compact = pos > size.handover));
  el.toggleAttribute("data-under", (under = pos > 1));

  return () => {
    stop();
    resize.disconnect();
    window.removeEventListener("resize", measure);
    window.clearTimeout(hide);
    controllers.delete(el);
    if (latch.owner === el) latch.owner = null;
    if (!--listeners) window.removeEventListener("wheel", onWheel, { capture: true });
    el.removeEventListener("pointerdown", onDownReset, true);
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    el.removeEventListener("click", onClick, true);
    el.removeEventListener("scroll", onScroll);
    content.style.transform = "";
    content.style.willChange = "";
  };
}
