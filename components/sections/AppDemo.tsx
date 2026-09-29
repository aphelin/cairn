"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CairnApp, type Command } from "@/components/app/CairnApp";
import type { Route } from "@/components/app/Stack";
import { Arrow } from "@/components/icons";
import { store } from "@/lib/store";
import { TABS, type TabId } from "@/lib/appDemo";
import styles from "./AppDemo.module.css";

// Each note opens the part of the app it talks about: an app's own rules,
// a mode's own settings (the one that's on, or Room), Today's safeguards.
const NOTES: { tab: TabId; title: string; text: string; route?: () => Route; reveal?: boolean }[] = [
  { tab: "apps", title: "Rules for each app", text: "The modes that lock it, and its own daily limit.", route: () => ({ kind: "app", id: "youtube" }) },
  { tab: "modes", title: "Tune each mode", text: "How far it reaches, which rooms, what gets through.", route: () => ({ kind: "mode", level: store.get().level || 2 }) },
  { tab: "today", title: "No easy way out", text: "It can’t be deleted while on. Three emergency unlocks a month.", reveal: true },
];

const order = (tab: TabId) => TABS.findIndex((t) => t.id === tab);

// The companion app, working, in a drawn iPhone. It shares the page's dial:
// a mode picked here turns the dial, and the dial shows here.
export function AppDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLSpanElement>(null);

  // The reflection on the cover glass slides as the page carries the phone
  // past, the way light moves across a real one. Only while it's on screen.
  useEffect(() => {
    const el = sheen.current;
    const box = stage.current;
    if (!el || !box || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const place = () => {
      raf = 0;
      const r = box.getBoundingClientRect();
      const p = (r.top + r.height / 2) / window.innerHeight - 0.5;
      el.style.transform = `translate3d(0, ${(-p * 18).toFixed(2)}%, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      } else window.removeEventListener("scroll", onScroll);
    });
    io.observe(box);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const [nav, setNav] = useState<{ tab: TabId; from: number; note: number; command: Command | null }>({ tab: "today", from: 0, note: -1, command: null });

  // A tab picked in the app; a note marks itself only when it's the one
  // that opened what's showing.
  const onTab = useCallback(
    (tab: TabId) => setNav((p) => ({ ...p, tab, from: Math.sign(order(tab) - order(p.tab)), note: -1 })),
    [],
  );

  const open = (i: number) => {
    const n = NOTES[i]!;
    setNav((p) => ({
      tab: n.tab,
      from: Math.sign(order(n.tab) - order(p.tab)),
      note: i,
      command: { n: (p.command?.n ?? 0) + 1, tab: n.tab, route: n.route?.(), reveal: n.reveal },
    }));
  };

  return (
    <section id="app" className="section" data-theme="mist" aria-labelledby="app-title">
      <div className={`inner ${styles.grid}`}>
        <div className={styles.head}>
          <h2 id="app-title" className="title" data-reveal="">
            Set the rules once.
          </h2>
          <p className="lede">The app is free, with no account and no subscription.</p>
        </div>

        <ul className={styles.notes}>
          {NOTES.map((n, i) => (
            <li key={n.title}>
              <button
                type="button"
                className={styles.note}
                aria-controls={`cairn-panel-${n.tab}`}
                aria-current={nav.note === i ? "true" : undefined}
                onClick={() => {
                  open(i);
                  // Wherever the phone is partly out of view (stacked on a phone, the notes sit under
                  // it), bring it in to show the change: whole where it fits the window, else the end
                  // that changes: the top for a screen that opens, the foot for Today's safeguards.
                  // The page's scroll padding keeps it off the nav.
                  const el = stage.current;
                  if (!el) return;
                  const r = el.getBoundingClientRect();
                  const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
                  const nav = parseFloat(getComputedStyle(document.documentElement).fontSize) * 4;
                  if (r.top >= nav && r.bottom <= window.innerHeight) return;
                  el.scrollIntoView({
                    block: r.height <= window.innerHeight - pad ? "center" : n.reveal ? "end" : "start",
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                  });
                }}
              >
                <span className={styles.noteTitle}>
                  {n.title}
                  <Arrow className={styles.noteArrow} />
                </span>
                <span className={styles.noteText}>{n.text}</span>
              </button>
            </li>
          ))}
        </ul>

        <div ref={stage} className={styles.stage}>
          <div className={styles.fit}>
            <div className={styles.phone} role="group" aria-label="The Cairn app, working">
              <span className={styles.buttons} aria-hidden="true">
                <i data-b="action" />
                <i data-b="up" />
                <i data-b="down" />
                <i data-b="side" />
                <i data-b="camera" />
              </span>
              <div className={styles.glass}>
                <div className={styles.screen}>
                  <CairnApp tab={nav.tab} from={nav.from} onTab={onTab} command={nav.command} />
                </div>
                <span className={styles.island} aria-hidden="true" />
                <span ref={sheen} className={styles.sheen} aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
