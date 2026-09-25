"use client";

import { useState } from "react";
import { APPS, COLOURS, SCHEDULES } from "@/lib/content";
import { useStore } from "@/lib/store";
import { useSpring } from "@/lib/useSpring";
import { AppGlyph, Battery, Minus, Plus, Signal, TrendDown } from "@/components/icons";
import styles from "./AppDemo.module.css";

const LAST_WEEK = 120; // demo data: last week's average, in minutes
const fmt = (m: number) => {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return h ? `${h}h${r ? ` ${r}m` : ""}` : `${r}m`;
};

// The companion app, working. Placing a stone on an app locks it; the limit
// and the counts move on springs and show their trend.
export function AppDemo() {
  const [locked, setLocked] = useState<Set<string>>(() => new Set(APPS.filter((a) => a.locked).map((a) => a.id)));
  const [limit, setLimit] = useState(90);
  const [schedules, setSchedules] = useState(() => Object.fromEntries(SCHEDULES.map((s) => [s.id, s.on])));
  const colour = useStore((s) => s.colour);
  const hex = COLOURS.find((c) => c.id === colour)?.hex ?? COLOURS[1]!.hex;
  const count = useSpring(locked.size);
  const shown = useSpring(limit);
  const diff = limit - LAST_WEEK;

  const toggle = (id: string) =>
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section id="app" className="section" data-ground="chalk" aria-labelledby="app-title">
      <div className={`inner ${styles.grid}`}>
        <div className={styles.head}>
          <h2 id="app-title" className="title">
            Set the rules once.
          </h2>
          <p className="lede">The app is free, and it needs no account.</p>
        </div>

        <ul className={styles.notes} aria-hidden="true">
          <li className={styles.noteA}>Put a stone on an app to lock it</li>
          <li className={styles.noteB}>Set a daily limit</li>
          <li className={styles.noteC}>Choose quiet hours</li>
        </ul>

        <div className={styles.phone}>
          <div className={styles.screen}>
            <div className={styles.status} aria-hidden="true">
              <span>9:41</span>
              <span className={styles.statusIcons}>
                <Signal />
                <Battery />
              </span>
            </div>

            <div className={styles.appHead}>
              <h3>Locks</h3>
              <span className={styles.inRange}>Home stone in range</span>
            </div>

            <p className={styles.count} aria-live="polite">
              <strong>{Math.round(count)}</strong> of {APPS.length} apps locked
            </p>
            <ul className={styles.apps}>
              {APPS.map((a) => {
                const on = locked.has(a.id);
                return (
                  <li key={a.id}>
                    <button type="button" className={styles.app} aria-pressed={on} onClick={() => toggle(a.id)}>
                      <span className={styles.icon}>
                        <AppGlyph name={a.glyph} />
                      </span>
                      <span className={styles.appName}>{a.name}</span>
                      {on && (
                        <svg className={styles.pebble} viewBox="0 0 24 16" aria-hidden="true">
                          <ellipse cx="12" cy="8.5" rx="10.5" ry="6.5" fill={hex} stroke="#141414" strokeWidth="1.5" />
                        </svg>
                      )}
                      <span className="visually-hidden">{on ? ", locked" : ", not locked"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className={styles.limit}>
              <span className={styles.rowLabel} id="limit-label">
                Daily limit
              </span>
              <div className={styles.stepper} role="group" aria-labelledby="limit-label">
                <button type="button" onClick={() => setLimit((l) => Math.max(15, l - 15))} disabled={limit <= 15} aria-label="Shorter limit">
                  <Minus />
                </button>
                <output aria-live="polite">{fmt(shown)}</output>
                <button type="button" onClick={() => setLimit((l) => Math.min(240, l + 15))} disabled={limit >= 240} aria-label="Longer limit">
                  <Plus />
                </button>
              </div>
              <p className={styles.trend} data-up={diff > 0 ? "" : undefined}>
                <TrendDown />
                {diff === 0 ? "Same as last week" : `${fmt(Math.abs(diff))} ${diff < 0 ? "less" : "more"} than last week`}
              </p>
            </div>

            <ul className={styles.schedules}>
              {SCHEDULES.map((s) => (
                <li key={s.id}>
                  <span>
                    <strong>{s.name}</strong>
                    <span>{s.time}</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={schedules[s.id]}
                    aria-label={s.name}
                    className={styles.switch}
                    onClick={() => setSchedules((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                  />
                </li>
              ))}
            </ul>
            <p className={styles.unlocks}>3 emergency unlocks left this month</p>
          </div>
        </div>
      </div>
    </section>
  );
}
