"use client";

import { Fragment, useEffect, useRef } from "react";
import { STATEMENT } from "@/lib/content";
import styles from "./Statement.module.css";

// One sentence, lit a word at a time as you scroll: the argument for the whole
// product, read at reading speed. It starts lighting as the paragraph comes up
// from the bottom and is fully lit a little before its middle reaches the
// middle of the window, so you never sit on a half-read line. Every word is on
// the page from the start, so without scripts (or with reduced motion) it
// simply reads.

// How many words wide the lighting front is: each word comes up over this
// much of the scroll, so the edge between read and unread is soft.
const FRONT = 2.5;

export function Statement() {
  const text = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = text.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = [...el.querySelectorAll<HTMLElement>("[data-w]")];
    el.dataset.lit = "";
    let kill = () => {};
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 92%",
        end: "center 56%",
        scrub: true,
        onUpdate: (self) => {
          const at = self.progress * (words.length + FRONT);
          words.forEach((w, i) => {
            const lit = Math.max(0, Math.min(1, (at - i) / FRONT));
            w.style.setProperty("--lit", lit.toFixed(3));
            // A lit word drops its filter, so the read part costs nothing.
            w.toggleAttribute("data-read", lit >= 1);
          });
        },
      });
      kill = () => st.kill();
    });
    return () => {
      cancelled = true;
      kill();
      delete el.dataset.lit;
    };
  }, []);

  // The last sentence is the answer; it's set apart.
  const [question, answer] = STATEMENT.split(/(?<=\.) (?=Cairn)/);
  const words = (s: string, offset: number) =>
    s.split(" ").map((w, i) => (
      <Fragment key={i + offset}>
        <span data-w="" className={styles.word}>
          {w}
        </span>{" "}
      </Fragment>
    ));

  return (
    <section id="why" className={`section ${styles.statement}`} data-theme="night" aria-label="Why Cairn">
      <div className="inner">
        <p ref={text} className={styles.text}>
          {words(question ?? STATEMENT, 0)}
          {answer && <span className={styles.answer}>{words(answer, 100)}</span>}
        </p>
      </div>
    </section>
  );
}
