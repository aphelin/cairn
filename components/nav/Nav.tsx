"use client";

import { useEffect, useRef, useState } from "react";
import { NAV } from "@/lib/content";
import { sound } from "@/lib/sound";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/brand/Logo";
import { Arrow, Cross, Menu, SoundOff, SoundOn } from "@/components/icons";
import styles from "./Nav.module.css";

// A slim bar that takes the theme of whatever is under it. The logo is a tiny
// working dial: its dot follows the zone you set in the hero.
export function Nav() {
  const level = useStore((s) => s.level);
  const bar = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<"day" | "night" | "mist">("day");
  const [here, setHere] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const off = sound.subscribe(setSoundOn);
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    // The section under the middle of the bar sets its theme: the innermost
    // ground there, so a night tile inside a day section wins. Found from the
    // grounds' boxes, which costs a tenth of asking the page to hit-test the
    // point on every scrolled frame; the page is asked only should two
    // grounds ever overlap there, or none be found.
    let grounds: HTMLElement[] = [];
    // A ground that mounts later (a lazy section, a tile) or gains a theme
    // clears the list, so the next read finds it; a removed one is caught by
    // isConnected below. The bar's own theme is left out of it.
    const holdsGround = (n: Node) => n instanceof Element && (n.matches("[data-theme]") || n.querySelector("[data-theme]") !== null);
    const watch = new MutationObserver((records) => {
      const changed = records.some((r) =>
        r.type === "attributes" ? !bar.current?.contains(r.target) : [...r.addedNodes].some(holdsGround),
      );
      if (changed) grounds = [];
    });
    watch.observe(document.body, { subtree: true, childList: true, attributeFilter: ["data-theme"] });
    const hit = (x: number, y: number) =>
      document
        .elementsFromPoint(x, y)
        .map((el) => el.closest<HTMLElement>("[data-theme]"))
        .find((el) => el && !bar.current?.contains(el));
    const under = () => {
      if (!grounds.length || grounds.some((el) => !el.isConnected)) {
        grounds = [...document.querySelectorAll<HTMLElement>("[data-theme]")].filter((el) => !bar.current?.contains(el));
      }
      const x = window.innerWidth / 2;
      const y = (bar.current?.offsetHeight ?? 64) / 2;
      const at = grounds.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= y && r.bottom > y && r.left <= x && r.right > x;
      });
      const inner = at.filter((el) => !at.some((o) => o !== el && el.contains(o)));
      return inner.length === 1 ? inner[0] : hit(x, y);
    };
    const read = () => {
      raf = 0;
      const t = (under()?.dataset.theme as "day" | "night" | "mist" | undefined) ?? "day";
      setTheme(t);
      setScrolled(window.scrollY > 8);
      // You are here: the last section whose top has passed a third of the way down.
      let current: string | null = null;
      for (const item of NAV) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.34) current = item.id;
      }
      setHere(current);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("cairn:theme", schedule);
    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("cairn:theme", schedule);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header ref={bar} className={styles.bar} data-theme={theme} data-scrolled={scrolled ? "" : undefined} data-open={open ? "" : undefined}>
      <div className={styles.row}>
        <a className={styles.home} href="#top" aria-label="Cairn, back to the top">
          <Logo level={level} />
        </a>
        <nav className={styles.links} aria-label="Sections">
          {NAV.map((item) => (
            <a key={item.id} href={`#${item.id}`} aria-current={here === item.id ? "location" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.tools}>
          <button
            type="button"
            className={styles.icon}
            aria-pressed={soundOn}
            aria-label="Sound"
            title={soundOn ? "Sound on" : "Sound off"}
            onClick={() => sound.toggle()}
          >
            {soundOn ? <SoundOn /> : <SoundOff />}
          </button>
          <a className={`btn ${styles.cta}`} href="#preorder">
            Pre-order <Arrow />
          </a>
          <button
            type="button"
            className={`${styles.icon} ${styles.menu}`}
            aria-expanded={open}
            aria-controls="nav-sheet"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <Cross /> : <Menu />}
          </button>
        </div>
      </div>
      {/* Lenis leaves the wheel to the sheet, which scrolls itself when the window is short. */}
      <div id="nav-sheet" className={styles.sheet} hidden={!open} data-lenis-prevent>
        <nav aria-label="Sections">
          {NAV.map((item, i) => (
            <a key={item.id} href={`#${item.id}`} onClick={() => setOpen(false)} style={{ "--i": i } as React.CSSProperties}>
              {item.label}
            </a>
          ))}
          <a href="#preorder" onClick={() => setOpen(false)} style={{ "--i": NAV.length } as React.CSSProperties}>
            Pre-order
          </a>
        </nav>
      </div>
    </header>
  );
}
