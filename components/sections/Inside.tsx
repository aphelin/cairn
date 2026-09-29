"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PARTS } from "@/lib/content";
import { live } from "@/lib/store";
import { DialAnchor } from "@/components/dial/DialAnchor";
import { stage } from "@/components/dial/DialLayer";
import styles from "./Inside.module.css";

// The exploded device's name in the 3D stage (the anchor's data-dial-name).
const DEVICE = "inside";

// A polyline as an SVG path, its corners rounded to `radius` (or less, where
// a leg is short), so each callout bends like a drawn line, not a joint.
function elbow(points: [number, number][], radius: number) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(points[0]![0])} ${f(points[0]![1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1]!;
    const [x, y] = points[i]!;
    const [nx, ny] = points[i + 1]!;
    const a = Math.hypot(x - px, y - py);
    const b = Math.hypot(nx - x, ny - y);
    const r = Math.min(radius, a / 2, b / 2);
    if (r < 0.5) {
      d += ` L${f(x)} ${f(y)}`;
      continue;
    }
    d += ` L${f(x - ((x - px) / a) * r)} ${f(y - ((y - py) / a) * r)} Q${f(x)} ${f(y)} ${f(x + ((nx - x) / b) * r)} ${f(y + ((ny - y) / b) * r)}`;
  }
  const [lx, ly] = points[points.length - 1]!;
  return `${d} L${f(lx)} ${f(ly)}`;
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// The loop below runs every frame the section is on screen, but most frames
// nothing has moved (a part pinned, the page still). These write to the DOM
// only when a value changes, so a still section costs no style or paint work.
const written = new WeakMap<Element, Map<string, string | boolean>>();
const changed = (el: Element, key: string, value: string | boolean) => {
  let seen = written.get(el);
  if (!seen) written.set(el, (seen = new Map()));
  if (seen.get(key) === value) return false;
  seen.set(key, value);
  return true;
};
const attr = (el: Element, name: string, value: string) => {
  if (changed(el, name, value)) el.setAttribute(name, value);
};
const flag = (el: Element, name: string, on: boolean) => {
  if (changed(el, name, on)) el.toggleAttribute(name, on);
};
const style = (el: HTMLElement | SVGElement, prop: string, value: string) => {
  if (changed(el, `style ${prop}`, value)) el.style.setProperty(prop, value);
};

// The least space between two names, and how far the view has to be open
// (as a share of the track) before every part and name is in place.
const PITCH = 14;
const OPEN = [0.64, 0.98] as const;

// Where the view is a pinned track: wide enough for three columns and tall
// enough for every name beside the dial. Everywhere else it's the plain list
// (the other side of the narrow query in Inside.module.css).
const WIDE = "(min-width: 821px) and (min-height: 576px)";

// The dial comes apart as you scroll through the section, and each part is
// named beside it: each name sits level with its part's edge, nudged only as
// far as it takes to keep the names apart. A callout runs from the part's
// edge to its name, level where it can be, drawn on as the part separates.
// Pointing at a part, on the dial or by its name, picks it out: the part
// grows a touch and catches the light while the rest dim, and its line and
// name brighten. A click or tap pins it; keyboard focus on a name does the
// same as pointing, and opens the view first if it isn't open yet. Before
// WebGL runs, or on narrow screens, the names are a plain list (a tap still
// picks the part out on the dial).
export function Inside() {
  const track = useRef<HTMLDivElement>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const leads = useRef<SVGSVGElement>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const active = preview ?? pinned;
  const activeRef = useRef<number | null>(null);
  const pinnedRef = useRef<number | null>(null);
  // What's pointing at a part right now: the pointer on the dial, the
  // pointer on a name, or keyboard focus on a name. The first wins.
  const sources = useRef<{ scene: number | null; label: number | null; focus: number | null }>({ scene: null, label: null, focus: null });
  const refresh = useCallback(() => {
    const s = sources.current;
    setPreview(s.scene ?? s.label ?? s.focus);
  }, []);

  useEffect(() => {
    activeRef.current = active;
    pinnedRef.current = pinned;
    stage()?.highlight(DEVICE, active);
  }, [active, pinned]);

  useEffect(() => {
    const trackEl = track.current!;
    const box = stageBox.current!;
    const anchor = box.querySelector<HTMLElement>("[data-dial]")!;
    const items = [...list.current!.querySelectorAll<HTMLElement>("li")];
    const names = items.map((li) => li.querySelector("strong")!);
    const callouts = [...leads.current!.querySelectorAll<SVGGElement>(":scope > g")].map((g) => ({
      g,
      line: g.querySelector<SVGPathElement>("[data-line]")!,
      glint: g.querySelector<SVGPathElement>("[data-glint]")!,
      marker: g.querySelector<SVGGElement>("[data-marker]")!,
    }));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.matchMedia(WIDE);
    const fine = window.matchMedia("(pointer: fine)");
    let raf = 0;
    let frame = 0;
    let wasOpen = live.explode;
    // On narrow or short screens the section isn't a pinned track: the dial
    // holds under the nav while its names pass beneath (or beside it, on a
    // phone on its side), and it comes apart as it arrives, so it's open by
    // the time it's in the middle of the window.
    // Where it holds (its sticky top), measured as the layout changes.
    let holdAt = 0;
    const measure = () => {
      holdAt = parseFloat(getComputedStyle(anchor).top) || 0;
    };
    measure();
    window.addEventListener("resize", measure);
    // How far each name is moved from its place in the list to sit beside
    // its part, in pixels.
    const offsets = items.map(() => 0);

    // The pointer over the section, for picking parts on the dial. Picking
    // runs in the frame loop, not on every move, and again every few frames
    // while the pointer rests, since the parts move under it as you scroll.
    const pointer = { x: 0, y: 0, over: false, moved: false };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.over = true;
      pointer.moved = true;
    };
    const onLeave = () => {
      pointer.over = false;
      pointer.moved = true;
    };
    // A click or tap on a part pins it (again unpins it); anywhere else in
    // the section lets go.
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest("button, a")) return;
      const hit = stage()?.pick(DEVICE, e.clientX, e.clientY) ?? null;
      setPinned((p) => (hit === null || p === hit ? null : hit));
    };
    box.addEventListener("pointermove", onMove, { passive: true });
    box.addEventListener("pointerleave", onLeave);
    box.addEventListener("click", onClick);

    const follow = () => {
      raf = requestAnimationFrame(follow);
      frame++;
      const s = stage();
      // The stage may start after this section mounts: keep it told.
      s?.highlight(DEVICE, activeRef.current);

      if (fine.matches && (pointer.moved || (pointer.over && frame % 6 === 0))) {
        pointer.moved = false;
        const hit = pointer.over ? (s?.pick(DEVICE, pointer.x, pointer.y) ?? null) : null;
        if (hit !== sources.current.scene) {
          sources.current.scene = hit;
          box.style.cursor = hit === null ? "" : "pointer";
          refresh();
        }
      }

      // Read everything first, then write.
      const vh = window.innerHeight;
      const frameBox = anchor.getBoundingClientRect();
      // Narrow: apart from as the dial's top clears the foot of the window
      // (90%) to as its centre reaches the middle, or it holds, if sooner.
      if (!wide.matches && !reduced) {
        const from = vh * 0.9;
        const to = Math.max(holdAt, (vh - frameBox.height) / 2);
        live.explode = clamp01((from - frameBox.top) / Math.max(1, from - to));
      }
      const open = live.explode;
      // Once the dial goes back together, a pinned part lets go: its name
      // and line have gone, and the dial is whole again.
      if (wasOpen >= 0.3 && open < 0.3 && pinnedRef.current !== null) setPinned(null);
      wasOpen = open;

      // A plain list on a narrow screen: every name shows, in its place in
      // the list, and there are no lines to draw.
      if (!wide.matches) {
        items.forEach((li, i) => {
          offsets[i] = 0;
          style(li, "translate", "");
          flag(li, "data-away", false);
        });
        flag(box, "data-drawn", false);
        return;
      }

      const b = box.getBoundingClientRect();
      const c = s?.callouts(DEVICE) ?? null;
      const rows = items.map((li) => li.getBoundingClientRect());
      const labels = names.map((n) => n.getBoundingClientRect());

      items.forEach((li, i) => {
        const show = clamp01((open - 0.35 - i * 0.05) / 0.3);
        style(li, "--show", show.toFixed(3));
        // A name that hasn't arrived yet can't be pointed at (it can still
        // take keyboard focus, which shows it).
        flag(li, "data-away", !reduced && show < 0.02);
      });

      // Each name sits level with its part's edge. Where two parts are closer
      // together than two names are tall, the lower name steps down, and near
      // the foot of the stage they step back up, so a line has at most a
      // short jog. The dial's own box bounds them.
      const placed = c !== null && c.parts.length === items.length;
      if (placed) {
        const lo = frameBox.top - b.top;
        const hi = frameBox.bottom - b.top;
        const want = c.parts.map((p, i) => p.rest - labels[i]!.height / 2 - (labels[i]!.top - rows[i]!.top) - b.top);
        for (let i = 0; i < want.length; i++) want[i] = Math.max(want[i]!, i ? want[i - 1]! + rows[i - 1]!.height + PITCH : lo);
        for (let i = want.length - 1; i >= 0; i--) want[i] = Math.min(want[i]!, i < want.length - 1 ? want[i + 1]! - PITCH - rows[i]!.height : hi - rows[i]!.height);
        items.forEach((li, i) => {
          // Whole pixels, so the text stays crisp and doesn't shimmer as the
          // dial leans after the pointer.
          const unmoved = rows[i]!.top - b.top - offsets[i]!;
          const y = Math.round(want[i]! - unmoved);
          // Where the name will be once it's moved, for its line.
          labels[i] = new DOMRect(labels[i]!.x, labels[i]!.y + y - offsets[i]!, labels[i]!.width, labels[i]!.height);
          offsets[i] = y;
          style(li, "translate", `0 ${y}px`);
        });
      }

      // Lines only while the view is on screen (pinned, as you scroll through
      // it; with reduced motion it isn't pinned, so while most of it shows),
      // there's room between the dial and the names, and the parts have
      // started to separate.
      const inView = reduced ? b.top < vh * 0.2 && b.bottom > vh * 0.8 : b.top > -2 && b.bottom < vh + 2;
      const clear = c ? c.right - b.left + 22 : 0; // the column the lines turn in, clear of the dial
      const gap = labels.length ? labels[0]!.left - b.left - clear : 0;
      const drawn = placed && inView && open > 0.05 && gap > 56;
      flag(box, "data-drawn", drawn);
      if (!drawn) return;

      callouts.forEach((o, i) => {
        const p = c.parts[i]!;
        const l = labels[i]!;
        // The marker sits just off the part's edge; the line leaves from it.
        const mx = p.x - b.left + 8;
        const my = p.y - b.top;
        const lx = l.left - b.left - 14;
        const ly = l.top - b.top + l.height / 2;
        const run = Math.min(34, Math.max(16, (lx - clear) * 0.28));
        const turn = Math.max(clear + 10, lx - run);
        // Straight across when the name is level with its part.
        const d =
          Math.abs(ly - my) < 1.5
            ? elbow(
                [
                  [mx + 6, my],
                  [lx, my],
                ],
                0,
              )
            : elbow(
                [
                  [mx + 6, my],
                  [clear, my],
                  [turn, ly],
                  [lx, ly],
                ],
                9,
              );
        attr(o.line, "d", d);
        attr(o.glint, "d", d);
        const draw = clamp01((open - 0.26 - i * 0.05) / 0.3);
        style(o.line, "stroke-dashoffset", (1 - draw).toFixed(3));
        // The glint and the pulse only run on a line that's all there.
        flag(o.g, "data-full", draw > 0.97);
        attr(o.marker, "transform", `translate(${mx.toFixed(1)} ${my.toFixed(1)})`);
        style(o.marker, "opacity", clamp01(draw * 4).toFixed(3));
      });
    };

    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e!.isIntersecting) raf = requestAnimationFrame(follow);
    });
    io.observe(trackEl);

    const detach = () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerleave", onLeave);
      box.removeEventListener("click", onClick);
      box.style.cursor = "";
      stage()?.highlight(DEVICE, null);
    };

    if (reduced) {
      live.explode = 1;
      return detach;
    }
    let kill = () => {};
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      // Apart between 12% and 62% of the track; held open after that. Only on
      // wide screens: narrow ones follow the dial's own place (in follow()).
      const fromTrack = (self: { progress: number }) => {
        if (wide.matches) live.explode = Math.max(0, Math.min(1, (self.progress - 0.12) / 0.5));
      };
      const st = ScrollTrigger.create({
        trigger: trackEl,
        start: "top top",
        end: "bottom bottom",
        onUpdate: fromTrack,
        // Widening the window past the breakpoint picks the track up again.
        onRefresh: fromTrack,
      });
      kill = () => st.kill();
    });
    return () => {
      cancelled = true;
      kill();
      detach();
    };
  }, [refresh]);

  const onLabel = (i: number | null) => {
    sources.current.label = i;
    refresh();
  };
  const onFocus = (i: number | null) => {
    sources.current.focus = i;
    refresh();
  };
  // Tabbing to a name while the view is still closed (arriving from the
  // section above) or scrolled past (from below) would focus a name you
  // can't see and pick out a part that isn't apart. So keyboard focus
  // scrolls to the nearest point where the view is fully open. The names
  // stay in the tab order either way; with reduced motion, or as a plain list
  // on a narrow screen, they're always on show and the browser's own
  // scrolling is enough.
  const reveal = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia(WIDE).matches) return;
    const t = track.current!;
    const span = t.offsetHeight - window.innerHeight;
    if (span <= 0) return;
    const r = t.getBoundingClientRect();
    const at = -r.top / span;
    if (at >= OPEN[0] && at <= OPEN[1]) return;
    const top = r.top + window.scrollY + span * Math.min(OPEN[1], Math.max(OPEN[0], at));
    requestAnimationFrame(() => window.scrollTo({ top, behavior: "smooth" }));
  };

  return (
    <section id="inside" className={styles.inside} data-theme="night" aria-labelledby="inside-title">
      <div ref={track} className={styles.track}>
        <div ref={stageBox} className={styles.stage}>
          <div className={styles.head}>
            <h2 id="inside-title" className="title" data-reveal="">
              Machined, not moulded.
            </h2>
            <p className="lede">Seven parts, and every one of them clicks.</p>
          </div>
          <DialAnchor kind="home" name={DEVICE} order={3} explode still="/stills/home-night-home.webp" className={styles.anchor} />
          <svg ref={leads} className={styles.leads} data-focus={active !== null || undefined} aria-hidden="true">
            {PARTS.map((p, i) => (
              <g key={p.name} data-on={active === i || undefined}>
                <path data-line="" className={styles.line} pathLength={1} />
                <path data-glint="" className={styles.glint} pathLength={1} />
                <g data-marker="" className={styles.marker}>
                  <circle className={styles.halo} r={4.5} />
                  <circle className={styles.ring} r={4.5} />
                  <circle className={styles.dot} r={1.6} />
                </g>
              </g>
            ))}
          </svg>
          <ol
            ref={list}
            className={styles.parts}
            data-focus={active !== null || undefined}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPinned(null);
            }}
          >
            {PARTS.map((p, i) => (
              <li key={p.name} data-on={active === i || undefined}>
                <button
                  type="button"
                  className={styles.part}
                  aria-pressed={pinned === i}
                  onClick={() => setPinned((v) => (v === i ? null : i))}
                  onPointerEnter={(e) => e.pointerType === "mouse" && onLabel(i)}
                  onPointerLeave={(e) => e.pointerType === "mouse" && onLabel(null)}
                  onFocus={(e) => {
                    if (!e.currentTarget.matches(":focus-visible")) return;
                    onFocus(i);
                    reveal();
                  }}
                  onBlur={() => onFocus(null)}
                >
                  <strong>{p.name}</strong>
                  <span>{p.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
