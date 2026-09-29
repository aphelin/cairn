"use client";

import { useEffect, useRef } from "react";
import { FAQ } from "@/lib/content";
import { Plus } from "@/components/icons";
import styles from "./Faq.module.css";

// How long an answer takes to open or fold away, on the page's ease-out.
const DURATION = 420;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

// Native disclosure rows: keyboard and screen readers get them for free, and
// without scripts they simply open and close. With scripts the rows run
// themselves, one open at a time: the answer's height eases in every browser,
// the open one folds away as the next opens, and the question you pressed
// stays put under the pointer while an answer above it folds.
export function Faq() {
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = list.current!;
    const items = [...root.querySelectorAll<HTMLDetailsElement>("details")];
    // The group's one-open rule moves here, so a closing answer can ease shut
    // rather than vanish the moment another opens.
    items.forEach((d) => d.removeAttribute("name"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const running = new Map<HTMLDetailsElement, Animation>();

    const closing = (d: HTMLDetailsElement) => d.dataset.closing !== undefined;

    const set = (d: HTMLDetailsElement, open: boolean) => {
      const answer = d.querySelector<HTMLElement>("[data-answer]")!;
      const from = d.open ? answer.getBoundingClientRect().height : 0;
      running.get(d)?.cancel();
      running.delete(d);
      d.toggleAttribute("data-closing", !open);
      d.open = true;
      if (reduced.matches) {
        d.open = open;
        delete d.dataset.closing;
        return;
      }
      const to = open ? answer.offsetHeight : 0;
      const anim = answer.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration: DURATION,
        easing: EASE,
        fill: "forwards",
      });
      running.set(d, anim);
      anim.onfinish = () => {
        d.open = open;
        delete d.dataset.closing;
        anim.cancel();
        running.delete(d);
      };
    };

    // Keeps a row where it was while the rows above it change height, by
    // scrolling the page the same amount. Any other scroll (a wheel, a key)
    // takes over and ends the hold.
    let frame = 0;
    const hold = (row: HTMLElement) => {
      cancelAnimationFrame(frame);
      const top = row.getBoundingClientRect().top;
      const end = performance.now() + DURATION + 100;
      let y = window.scrollY;
      const step = () => {
        if (window.scrollY !== y) return;
        const drift = row.getBoundingClientRect().top - top;
        if (Math.abs(drift) >= 0.5) {
          window.scrollTo({ top: y + drift, behavior: "instant" });
          y = window.scrollY;
        }
        if (performance.now() < end) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    const onClick = (e: MouseEvent) => {
      const summary = (e.target as Element).closest("summary");
      const d = summary?.parentElement;
      if (!summary || !(d instanceof HTMLDetailsElement) || !items.includes(d)) return;
      e.preventDefault();
      const open = !d.open || closing(d);
      hold(summary);
      if (open) for (const o of items) if (o !== d && o.open && !closing(o)) set(o, false);
      set(d, open);
    };

    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      running.forEach((a) => a.finish());
    };
  }, []);

  return (
    <section id="faq" className="section" data-theme="day" aria-labelledby="faq-title">
      <div className={`inner ${styles.grid}`}>
        <h2 id="faq-title" className={`title ${styles.title}`} data-reveal="">
          Questions, answered.
        </h2>
        <div ref={list} className={styles.list}>
          {FAQ.map((f) => (
            <details key={f.q} name="faq" className={styles.item}>
              <summary>
                <span>{f.q}</span>
                <Plus className={styles.icon} />
              </summary>
              <div data-answer="" className={styles.answer}>
                <p>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
