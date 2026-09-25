"use client";

import { useEffect, useRef, useState } from "react";
import { ROUTE } from "@/lib/content";
import { sound } from "@/lib/sound";
import { CairnMark, SoundOff, SoundOn } from "@/components/icons";
import styles from "./Signpost.module.css";

const WPM = 230;

type Plate = { id: string; label: string; minutes: number; ahead: boolean; here: boolean };

// The navbar is a trail signpost: a white location plate, then arrow plates
// for where you can go and how long the walk is. The minutes are reading time
// from where you stand, so they change as you move, and a plate behind you
// points back. The plates take the colour that reads on the ground below.
export function Signpost() {
  const [ground, setGround] = useState("yellow");
  const [plates, setPlates] = useState<Plate[]>(() =>
    ROUTE.map((r) => ({ id: r.id, label: r.label, minutes: 1, ahead: true, here: false })),
  );
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unsubscribe = sound.subscribe(setSoundOn);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Words before the start of every top-level section, counted once.
    const sections = [...document.querySelectorAll<HTMLElement>("main > [id]")];
    const counts = sections.map((s) => (s.innerText.match(/\S+/g) ?? []).length);
    const starts = counts.map((_, i) => counts.slice(0, i).reduce((a, b) => a + b, 0));
    let frame = 0;
    let lastKey = "";

    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const navH = header.current?.offsetHeight ?? 64;

      // Which ground is under the plates?
      const probe = document
        .elementsFromPoint(window.innerWidth / 2, navH / 2)
        .find((el) => !header.current?.contains(el) && el.closest("[data-ground]"));
      const g = probe?.closest<HTMLElement>("[data-ground]")?.dataset.ground;
      if (g) setGround(g);

      // Where you stand, in words read so far.
      const line = vh * 0.4;
      let here = 0;
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= line) here = i;
      });
      const r = sections[here]!.getBoundingClientRect();
      const within = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height)));
      const position = starts[here]! + counts[here]! * within;

      const next = ROUTE.map((route) => {
        const i = sections.findIndex((s) => s.id === route.id);
        const words = Math.abs(starts[i]! - position);
        return {
          id: route.id,
          label: route.label,
          minutes: Math.max(1, Math.round(words / WPM)),
          ahead: starts[i]! >= position - 1,
          here: i === here,
        };
      });
      // Only re-render the plates when what they say has changed.
      const key = next.map((p) => `${p.minutes}${p.ahead ? ">" : "<"}${p.here ? "*" : ""}`).join("|");
      if (key !== lastKey) {
        lastKey = key;
        setPlates(next);
      }
      const max = document.documentElement.scrollHeight - vh;
      setProgress(max > 0 ? Math.round((window.scrollY / max) * 1000) / 1000 : 0);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const soundButton = (
    <button
      type="button"
      className={styles.sound}
      aria-pressed={soundOn}
      onClick={() => sound.toggle()}
      title={soundOn ? "Sound on" : "Sound off"}
    >
      {soundOn ? <SoundOn /> : <SoundOff />}
      <span className="visually-hidden">Sound</span>
    </button>
  );

  return (
    <>
      <header ref={header} className={styles.header} data-on={ground}>
        <nav className={styles.nav} aria-label="Main">
          <a className={styles.location} href="#top">
            <CairnMark />
            <span>Cairn</span>
          </a>
          <ul className={styles.route}>
            {plates.map((p) => (
              <li key={p.id}>
                <a
                  className={styles.plate}
                  href={`#${p.id}`}
                  data-back={p.ahead ? undefined : ""}
                  aria-current={p.here ? "location" : undefined}
                >
                  {p.here && <span className={styles.here} aria-hidden="true" />}
                  <span className={styles.label}>{p.label}</span>
                  <span className={styles.time}>{p.here ? "here" : `${p.minutes} min`}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className={styles.tools}>
            {soundButton}
            <button
              ref={menuButton}
              type="button"
              className={styles.menu}
              aria-expanded={open}
              aria-controls="route-panel"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Close" : "Route"}
            </button>
          </div>
        </nav>
        <div id="route-panel" className={styles.panel} hidden={!open}>
          <ul>
            {plates.map((p) => (
              <li key={p.id}>
                <a className={styles.plate} href={`#${p.id}`} data-back={p.ahead ? undefined : ""} onClick={() => setOpen(false)}>
                  <span className={styles.label}>{p.label}</span>
                  <span className={styles.time}>{p.here ? "here" : `${p.minutes} min`}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* The blaze spine: the trail's own stripe, with you on it. */}
      <div className={styles.spine} aria-hidden="true">
        <span className={styles.marker} style={{ top: `${progress * 100}%` }} />
      </div>
    </>
  );
}
