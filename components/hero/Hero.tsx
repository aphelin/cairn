"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HERO, NOISE } from "@/lib/content";
import { sound } from "@/lib/sound";
import { StoneAnchor } from "@/components/stone/StoneAnchor";
import { AppGlyph, Arrow, Battery, CairnMark, Signal } from "@/components/icons";
import { Rings } from "./rings";
import styles from "./Hero.module.css";

// Where each banner lands, as % of the stage: [x, y, tilt] on wide screens,
// then on phones (where only the first five show).
const SPOTS: { wide: [number, number, number]; tall: [number, number, number] }[] = [
  { wide: [60, 21, -4], tall: [72, 45, -4] },
  { wide: [89, 30, 5], tall: [22, 55, 5] },
  { wide: [52, 63, 3], tall: [82, 66, 3] },
  { wide: [91, 64, -6], tall: [18, 77, -5] },
  { wide: [63, 86, -3], tall: [80, 89, 3] },
  { wide: [33, 91, 4], tall: [0, 0, 0] },
  { wide: [88, 91, 2], tall: [0, 0, 0] },
  { wide: [44, 12, -2], tall: [0, 0, 0] },
  { wide: [13, 95, -5], tall: [0, 0, 0] },
];

const glyphFor = (app: string) => app.toLowerCase().split(" ").pop() ?? "chat";

type Gsap = typeof import("gsap").gsap;

export function Hero() {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const ringCanvas = useRef<HTMLCanvasElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const noise = useRef<HTMLUListElement>(null);
  const [quiet, setQuiet] = useState(false);
  const quietRef = useRef(false);
  const api = useRef<{ toggle: (source: "button" | "drag" | "scroll") => void } | null>(null);

  const toggle = useCallback((source: "button" | "drag" | "scroll" = "button") => api.current?.toggle(source), []);

  useEffect(() => {
    const trackEl = track.current!;
    const stageEl = stage.current!;
    const phoneEl = phone.current!;
    const canvas = ringCanvas.current!;
    const stoneEl = stageEl.querySelector<HTMLElement>('[data-stone="main"]')!;
    const banners = [...noise.current!.querySelectorAll<HTMLElement>("li")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-barlow-condensed").trim() || "sans-serif";
    const rings = new Rings(canvas, family);
    const ring = { front: 0 };
    let gsap: Gsap | null = null;
    let cancelled = false;
    let fromScroll = false;
    const cleanups: (() => void)[] = [];

    // The ring centre is the stone's centre, in the rings canvas's own space.
    const centre = () => {
      const c = canvas.getBoundingClientRect();
      const s = stoneEl.getBoundingClientRect();
      return { cx: s.left + s.width / 2 - c.left, cy: s.top + s.height * 0.56 - c.top };
    };
    const draw = () => rings.draw({ ...centre(), front: ring.front }, "#141414");
    const size = () => {
      const r = canvas.getBoundingClientRect();
      rings.resize(r.width, r.height);
      if (quietRef.current && !gsap?.isTweening(ring)) ring.front = rings.maxFront;
      draw();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    cleanups.push(() => ro.disconnect());

    // How far the phone must travel down from its resting place (no offset)
    // to touch the stone's crown.
    const contactDistance = () => {
      const p = phoneEl.getBoundingClientRect();
      const s = stoneEl.getBoundingClientRect();
      const current = Number(phoneEl.dataset.y ?? 0);
      return s.top + s.height * 0.3 - (p.bottom - current);
    };

    const setPhone = (y: number, x = 0) => {
      phoneEl.dataset.y = String(y);
      phoneEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const announce = (value: boolean) => {
      quietRef.current = value;
      setQuiet(value);
      document.documentElement.dataset.quiet = value ? "true" : "false";
      sound.setNoisy(!value);
    };

    // One contact: the stone squashes, and the front pushes every banner out.
    const goQuiet = (g: Gsap) => {
      announce(true);
      window.dispatchEvent(new CustomEvent("cairn:contact", { detail: "main" }));
      sound.knock();
      const { cx, cy } = centre();
      const c = canvas.getBoundingClientRect();
      const max = rings.maxFront;
      const T = 1.7;
      g.killTweensOf(ring);
      g.to(ring, { front: max, duration: T, ease: "power3.out", onUpdate: draw });
      for (const el of banners) {
        const b = el.getBoundingClientRect();
        if (!b.width) continue;
        const bx = b.left + b.width / 2 - c.left;
        const by = b.top + b.height / 2 - c.top;
        const dx = bx - cx;
        const dy = (by - cy) / 0.78;
        const d = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / d;
        const uy = (by - cy) / Math.max(1, Math.hypot(bx - cx, by - cy));
        // When the front reaches it: invert the cubic ease-out.
        const e = Math.min(0.999, Math.max(0, (d - b.width * 0.3) / max));
        const hit = T * (1 - Math.cbrt(1 - e));
        const push = Math.hypot(c.width, c.height) * 0.9;
        const mover = el.firstElementChild as HTMLElement;
        g.killTweensOf(mover);
        g.to(mover, {
          x: `+=${ux * push}`,
          y: `+=${uy * push}`,
          rotation: `+=${(ux >= 0 ? 1 : -1) * (14 + (d % 9))}`,
          duration: 1.1,
          delay: hit,
          ease: "power3.out",
          onStart: () => el.setAttribute("data-gone", ""),
          onComplete: () => {
            el.style.visibility = "hidden";
          },
        });
      }
    };

    // Undo: the map sinks back and the noise comes back, one banner at a time.
    const goNoisy = (g: Gsap) => {
      announce(false);
      g.killTweensOf(ring);
      g.to(ring, { front: 0, duration: 0.8, ease: "power2.inOut", onUpdate: draw });
      banners.forEach((el, i) => {
        const mover = el.firstElementChild as HTMLElement;
        g.killTweensOf(mover);
        el.style.visibility = "";
        el.removeAttribute("data-gone");
        g.to(mover, { x: 0, y: 0, rotation: 0, duration: 0.9, delay: 0.15 + i * 0.06, ease: "back.out(1.3)" });
      });
    };

    const instant = (value: boolean) => {
      announce(value);
      ring.front = value ? rings.maxFront : 0;
      banners.forEach((el) => (el.style.visibility = value ? "hidden" : ""));
      draw();
    };

    api.current = {
      toggle(source) {
        const next = !quietRef.current;
        if (source !== "scroll") fromScroll = false;
        if (reduced || !gsap) return instant(next);
        if (next) goQuiet(gsap);
        else {
          window.dispatchEvent(new CustomEvent("cairn:contact", { detail: "main" }));
          if (source === "drag") sound.knock();
          goNoisy(gsap);
        }
      },
    };

    if (reduced) {
      instant(true);
      return () => cleanups.forEach((c) => c());
    }
    document.documentElement.dataset.quiet = "false";

    // ——— Dragging the phone onto the stone ———
    let drag: { x: number; y: number; base: number; id: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      phoneEl.setPointerCapture(e.pointerId);
      gsap?.killTweensOf(phoneEl);
      drag = { x: e.clientX, y: e.clientY, base: Number(phoneEl.dataset.y ?? 0), id: e.pointerId };
      phoneEl.dataset.dragging = "";
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y;
      const dx = (e.clientX - drag.x) * 0.5;
      // It can't sink into the stone: past contact, it only presses.
      const y = Math.min(drag.base + dy, contactDistance() + 4);
      setPhone(y, dx);
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      delete phoneEl.dataset.dragging;
      const touching = Number(phoneEl.dataset.y ?? 0) >= contactDistance() - 14;
      const base = drag.base;
      drag = null;
      if (touching) toggle("drag");
      const back = { y: Number(phoneEl.dataset.y ?? 0), x: 0 };
      const m = /translate3d\(([-\d.]+)px/.exec(phoneEl.style.transform);
      back.x = m ? Number(m[1]) : 0;
      gsap?.to(back, {
        y: touching ? base - 10 : base,
        x: 0,
        duration: touching ? 0.9 : 0.7,
        ease: touching ? "power3.out" : "expo.out",
        onUpdate: () => setPhone(back.y, back.x),
        onComplete: () => setPhone(base, 0),
      });
    };
    phoneEl.addEventListener("pointerdown", onDown);
    phoneEl.addEventListener("pointermove", onMove);
    phoneEl.addEventListener("pointerup", onUp);
    phoneEl.addEventListener("pointercancel", onUp);
    cleanups.push(() => {
      phoneEl.removeEventListener("pointerdown", onDown);
      phoneEl.removeEventListener("pointermove", onMove);
      phoneEl.removeEventListener("pointerup", onUp);
      phoneEl.removeEventListener("pointercancel", onUp);
    });

    // ——— Scrolling lowers the phone onto the stone ———
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap: g }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap = g;
      g.registerPlugin(ScrollTrigger);
      let reach = contactDistance();
      const st = ScrollTrigger.create({
        trigger: trackEl,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onRefresh: () => {
          setPhone(0);
          reach = contactDistance();
        },
        onUpdate: (self) => {
          if (drag) return;
          const p = self.progress;
          // Down to the stone by 45%, then lifted a little off it.
          const down = Math.min(1, p / 0.45);
          const lift = Math.max(0, Math.min(1, (p - 0.45) / 0.3));
          const eased = 1 - Math.pow(1 - down, 3);
          setPhone(reach * eased - lift * reach * 0.35);
          if (p >= 0.45 && !quietRef.current) {
            fromScroll = true;
            toggle("scroll");
          } else if (p < 0.2 && quietRef.current && fromScroll) {
            fromScroll = false;
            toggle("scroll");
          }
        },
      });
      cleanups.push(() => st.kill());
    });

    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
      api.current = null;
    };
  }, [toggle]);

  return (
    <div ref={track} className={styles.track} data-ground="yellow" id="top">
      <div className={styles.ringsLayer} aria-hidden="true">
        <canvas ref={ringCanvas} className={styles.rings} />
      </div>
      <section ref={stage} className={styles.stage} data-quiet={quiet ? "" : undefined} aria-labelledby="hero-title">
        <div className={styles.copy}>
          <h1 id="hero-title" className={styles.title}>
            <span>{HERO.title[0]}</span> <span>{HERO.title[1]}</span>
          </h1>
          <p className={styles.offer}>{HERO.offer}</p>
          <div className={styles.actions}>
            <span className="plate-wrap">
              <a className="plate" href="#preorder">
                Pre-order <Arrow />
              </a>
            </span>
            <button type="button" className="plate plate-square" onClick={() => toggle("button")}>
              {quiet ? "Bring the noise back" : "Tap to quiet"}
            </button>
          </div>
        </div>

        <div className={styles.scene}>
          <div ref={phone} className={styles.phone} aria-hidden="true">
            <div className={styles.screen}>
              <div className={styles.status}>
                <span>9:41</span>
                <span className={styles.statusIcons}>
                  <Signal />
                  <Battery />
                </span>
              </div>
              <p className={styles.clock}>9:41</p>
              {quiet ? (
                <div className={styles.locked}>
                  <CairnMark className={styles.lockedMark} />
                  <strong>Locked</strong>
                  <span>6 apps</span>
                </div>
              ) : (
                <ul className={styles.mini}>
                  {NOISE.slice(0, 3).map((n) => (
                    <li key={n.app}>
                      <AppGlyph name={glyphFor(n.app)} data-tone={n.tone} />
                      <span>{n.app}</span>
                    </li>
                  ))}
                  <li className={styles.more}>+37 more</li>
                </ul>
              )}
            </div>
          </div>
          <p className={styles.hint} aria-hidden="true">
            {quiet ? "Quiet" : "Drag the phone onto the stone"}
          </p>
          <StoneAnchor stone="main" order={0} still="/stills/pocket-granite.webp" className={styles.stone} priority />
        </div>

        <ul ref={noise} className={styles.noise} aria-hidden="true">
          {NOISE.map((n, i) => {
            const spot = SPOTS[i]!;
            return (
              <li
                key={n.app}
                className={styles.banner}
                style={
                  {
                    "--x": `${spot.wide[0]}%`,
                    "--y": `${spot.wide[1]}%`,
                    "--r": `${spot.wide[2]}deg`,
                    "--tx": `${spot.tall[0]}%`,
                    "--ty": `${spot.tall[1]}%`,
                    "--tr": `${spot.tall[2]}deg`,
                    "--delay": `${(i * 0.37) % 2.2}s`,
                  } as React.CSSProperties
                }
              >
                <span className={styles.mover}>
                  <span className={styles.card}>
                    <span className={styles.glyph} data-tone={n.tone}>
                      <AppGlyph name={glyphFor(n.app)} />
                    </span>
                    <span className={styles.bannerText}>
                      <strong>{n.app}</strong>
                      <span>{n.text}</span>
                    </span>
                    <span className={styles.now}>now</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="visually-hidden" aria-live="polite">
          {quiet ? `Quiet. ${HERO.quiet}` : ""}
        </p>
      </section>
    </div>
  );
}
