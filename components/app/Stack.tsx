"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppId } from "@/components/brand/appGlyphs";
import type { Level } from "@/lib/content";
import type { TabId } from "@/lib/appDemo";
import { haptic, reducedMotion } from "./ios";
import styles from "./Stack.module.css";

// Each tab keeps its own navigation stack, as it does in iOS: a row pushes
// its screen in from the right while the one under it slides a third of the
// way left and dims; the back button, or a swipe from the left edge, takes
// it off again. Focus goes into a pushed screen and comes back to the row
// that opened it.

export type Route = { kind: "app"; id: AppId } | { kind: "mode"; level: Level } | { kind: "device"; id: "home" | "pocket" };

export const routeKey = (r: Route) => (r.kind === "app" ? `app-${r.id}` : r.kind === "mode" ? `mode-${r.level}` : `device-${r.id}`);
const same = (a: Route[], b: Route[], n: number) => a.slice(0, n).every((r, i) => b[i] && routeKey(r) === routeKey(b[i]!));

// iOS's push: quick to leave, long to settle.
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const MS = 500;
// How far the screen underneath travels, as a share of the width.
const UNDER = 0.3;

type Page = {
  depth: number;
  // The screen open over this one, if any (its route's key): its row shows it.
  above: string | null;
  // Open a screen on top of this one; `opener` gets focus back when it closes.
  push: (route: Route, opener?: HTMLElement | null) => void;
  pop: () => void;
};

const PageContext = createContext<Page>({ depth: 0, above: null, push: () => {}, pop: () => {} });
export const usePage = () => useContext(PageContext);

type Props = {
  tab: TabId;
  active: boolean;
  // Which way the last tab change went: 1 right, -1 left, 0 none.
  from: number;
  routes: Route[];
  onChange: (tab: TabId, routes: Route[]) => void;
  root: ReactNode;
  render: (route: Route) => ReactNode;
};

type Seen = { routes: Route[]; active: boolean; tx: "push" | "pop" | "none"; n: number; leaving: Route | null };

export function Stack({ tab, active, from, routes, onChange, root, render }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const current = useRef(routes);
  const openers = useRef<(HTMLElement | null)[]>([]);
  // Set as a swipe carries the top screen off, so the pop doesn't slide it again.
  const [swiped, setSwiped] = useState(false);
  const [seen, setSeen] = useState<Seen>({ routes, active, tx: "none", n: 0, leaving: null });

  // A change of stack, worked out while rendering: a push or a pop on a
  // stack that's on screen slides; anything else (a note opening a screen on
  // another tab) simply shows.
  if (seen.routes !== routes || seen.active !== active) {
    const shown = seen.active && active;
    const push = routes.length === seen.routes.length + 1 && same(seen.routes, routes, seen.routes.length);
    const pop = routes.length < seen.routes.length && same(routes, seen.routes, routes.length);
    const tx = !shown || swiped ? "none" : push ? "push" : pop ? "pop" : "none";
    if (swiped) setSwiped(false);
    setSeen({
      routes,
      active,
      tx,
      n: seen.routes !== routes ? seen.n + 1 : seen.n,
      leaving: tx === "pop" ? seen.routes[seen.routes.length - 1]! : null,
    });
  }

  useEffect(() => {
    current.current = routes;
  }, [routes]);

  const nav = useMemo(() => {
    const push = (route: Route, opener?: HTMLElement | null) => {
      const now = current.current;
      // A second tap on a row that's already opening its screen does nothing.
      if (now.some((r) => routeKey(r) === routeKey(route))) return;
      openers.current[now.length] = opener ?? null;
      current.current = [...now, route];
      onChange(tab, current.current);
    };
    const pop = () => {
      const now = current.current;
      if (!now.length) return;
      current.current = now.slice(0, -1);
      onChange(tab, current.current);
    };
    // The pop at the end of a swipe, which has already moved the screens.
    const swipedOff = () => {
      setSwiped(true);
      pop();
    };
    return { push, pop, swipedOff };
  }, [tab, onChange]);

  // The slide itself, once the new screen is in the page.
  useLayoutEffect(() => {
    const root = el.current;
    if (!root || !seen.n) return;
    const pages = [...root.querySelectorAll<HTMLElement>(":scope > [data-page]")];
    const depth = seen.routes.length;
    const top = pages.find((p) => p.dataset.page === String(depth) && !p.hasAttribute("data-leaving"));
    const reduce = reducedMotion();
    if (seen.tx === "push") {
      const under = pages.find((p) => p.dataset.page === String(depth - 1));
      if (top && under) slide(top, under, "in", reduce);
      top?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
      return;
    }
    if (seen.tx === "pop") {
      const out = pages.find((p) => p.hasAttribute("data-leaving"));
      const back = () => {
        const opener = openers.current[depth];
        openers.current.length = depth;
        if (opener?.isConnected) opener.focus({ preventScroll: true });
        else top?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
      };
      back();
      if (!out || !top) return setSeen((s) => ({ ...s, leaving: null }));
      const a = slide(out, top, "out", reduce);
      a.onfinish = () => setSeen((s) => ({ ...s, leaving: null }));
      return;
    }
    // Shown without a slide: a swipe that already carried it, or a note.
    openers.current.length = depth;
  }, [seen.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tabs switch in place, as they do in iOS: the new screen is simply there,
  // settling in with a short crossfade.
  useEffect(() => {
    const top = el.current?.querySelector<HTMLElement>(":scope > [data-ios-top]");
    if (!active || !top || !from || reducedMotion()) return;
    const a = top.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    return () => a.cancel();
  }, [active, from]);

  const depth = routes.length;
  const pages: { key: string; route: Route | null; depth: number; leaving?: boolean }[] = [
    { key: "root", route: null, depth: 0 },
    ...routes.map((r, i) => ({ key: routeKey(r), route: r, depth: i + 1 })),
  ];
  const leaving = seen.leaving;
  if (leaving && !routes.some((r) => routeKey(r) === routeKey(leaving))) pages.push({ key: routeKey(leaving), route: leaving, depth: depth + 1, leaving: true });

  return (
    <div ref={el} id={`cairn-panel-${tab}`} role="tabpanel" aria-labelledby={`cairn-tab-${tab}`} hidden={!active} className={styles.stack}>
      {pages.map((p) => (
        <PageView
          key={p.key}
          depth={p.depth}
          above={routes[p.depth] ? routeKey(routes[p.depth]!) : null}
          top={p.depth === depth && !p.leaving}
          leaving={!!p.leaving}
          nav={nav}
        >
          {p.route ? render(p.route) : root}
        </PageView>
      ))}
    </div>
  );
}

// Slides a screen in over the one under it, or off it.
function slide(top: HTMLElement, under: HTMLElement, way: "in" | "out", reduce: boolean) {
  const shade = under.querySelector<HTMLElement>(":scope > [data-shade]");
  const o = { duration: reduce ? 200 : way === "in" ? MS : MS * 0.86, easing: reduce ? "ease-out" : EASE };
  if (reduce) {
    under.animate([{ visibility: "visible" }, { visibility: "visible" }], o);
    return top.animate(way === "in" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { ...o, fill: "forwards" });
  }
  const far = `${-UNDER * 100}% 0`;
  under.animate(
    way === "in"
      ? [
          { translate: "0 0", visibility: "visible" },
          { translate: far, visibility: "visible" },
        ]
      : [
          { translate: far, visibility: "visible" },
          { translate: "0 0", visibility: "visible" },
        ],
    o,
  );
  shade?.animate(
    way === "in"
      ? [
          { opacity: 0, visibility: "visible" },
          { opacity: 1, visibility: "visible" },
        ]
      : [
          { opacity: 1, visibility: "visible" },
          { opacity: 0, visibility: "visible" },
        ],
    o,
  );
  return top.animate(way === "in" ? [{ translate: "100% 0" }, { translate: "0 0" }] : [{ translate: "0 0" }, { translate: "100% 0" }], { ...o, fill: "forwards" });
}

type PageProps = {
  depth: number;
  above: string | null;
  top: boolean;
  leaving: boolean;
  nav: Omit<Page, "depth" | "above"> & { swipedOff: () => void };
  children: ReactNode;
};

function PageView({ depth, above, top, leaving, nav, children }: PageProps) {
  const page = useMemo(() => ({ depth, above, push: nav.push, pop: nav.pop }), [depth, above, nav]);
  const grip = useEdgeSwipe(nav.swipedOff);
  return (
    <PageContext.Provider value={page}>
      <div className={styles.page} data-page={depth} data-ios-top={top ? "" : undefined} data-leaving={leaving ? "" : undefined} inert={!top}>
        {children}
        <span className={styles.shade} data-shade="" aria-hidden="true" />
        {depth > 0 && top && <span className={styles.grip} aria-hidden="true" {...grip} />}
      </div>
    </PageContext.Provider>
  );
}

// The swipe back from the left edge: the screen follows the finger, and the
// one under it comes back into view. Let go past a third of the way, or with
// a flick, and it goes; otherwise it springs back. The back button does the
// same by keyboard or tap.
function useEdgeSwipe(swipedOff: () => void) {
  const drag = useRef<{ id: number; x0: number; y0: number; k: number; w: number; on: boolean; x: number; t: number; v: number } | null>(null);

  const parts = (e: React.PointerEvent) => {
    const page = (e.currentTarget as HTMLElement).parentElement!;
    const under = page.previousElementSibling as HTMLElement | null;
    return { page, under, shade: under?.querySelector<HTMLElement>(":scope > [data-shade]") ?? null };
  };

  const place = (e: React.PointerEvent, x: number) => {
    const { page, under, shade } = parts(e);
    const d = drag.current!;
    const f = Math.min(1, Math.max(0, x / d.w));
    page.style.translate = `${(f * d.w).toFixed(1)}px 0`;
    if (under) {
      under.style.visibility = "visible";
      under.style.translate = `${(-UNDER * d.w * (1 - f)).toFixed(1)}px 0`;
    }
    if (shade) {
      shade.style.visibility = "visible";
      shade.style.opacity = String(1 - f);
    }
  };

  const end = (e: React.PointerEvent, cancel: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.on) return;
    const { page, under, shade } = parts(e);
    const f = Math.min(1, Math.max(0, d.x / d.w));
    const go = !cancel && (f > 0.35 || d.v > 0.5);
    const reduce = reducedMotion();
    const o = { duration: reduce ? 1 : Math.max(160, 380 * (go ? 1 - f : f)), easing: EASE, fill: "forwards" as const };
    const clear = () => {
      [page, under].forEach((p) => p?.style.removeProperty("translate"));
      under?.style.removeProperty("visibility");
      shade?.style.removeProperty("opacity");
      shade?.style.removeProperty("visibility");
    };
    const a = page.animate([{ translate: `${f * d.w}px 0` }, { translate: go ? `${d.w}px 0` : "0 0" }], o);
    under?.animate([{ translate: `${-UNDER * d.w * (1 - f)}px 0` }, { translate: go ? "0 0" : `${-UNDER * d.w}px 0` }], o);
    shade?.animate(
      [
        { opacity: 1 - f, visibility: "visible" },
        { opacity: go ? 0 : 1, visibility: "visible" },
      ],
      o,
    );
    a.onfinish = () => {
      if (go) {
        swipedOff();
        haptic(3);
        requestAnimationFrame(() => {
          under?.getAnimations().forEach((x) => x.cancel());
          shade?.getAnimations().forEach((x) => x.cancel());
          clear();
        });
      } else {
        [page, under, shade].forEach((p) => p?.getAnimations().forEach((x) => x.cancel()));
        clear();
      }
    };
  };

  return {
    onPointerDown(e: React.PointerEvent) {
      if (e.button !== 0) return;
      const grip = e.currentTarget as HTMLElement;
      const page = grip.parentElement!;
      const k = page.getBoundingClientRect().width / page.offsetWidth || 1;
      drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, k, w: page.offsetWidth, on: false, x: 0, t: e.timeStamp, v: 0 };
      // Held from the start: the strip is narrow, and a quick hand leaves it
      // before it has moved far enough to count as a swipe.
      grip.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent) {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = (e.clientX - d.x0) / d.k;
      if (!d.on) {
        const dy = (e.clientY - d.y0) / d.k;
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dx < 0 || Math.abs(dy) > Math.abs(dx)) {
          drag.current = null;
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          return;
        }
        d.on = true;
      }
      const dt = Math.max(1, e.timeStamp - d.t);
      d.v = (dx - d.x) / dt;
      d.x = dx;
      d.t = e.timeStamp;
      place(e, dx);
    },
    onPointerUp(e: React.PointerEvent) {
      end(e, false);
    },
    onPointerCancel(e: React.PointerEvent) {
      end(e, true);
    },
  };
}
