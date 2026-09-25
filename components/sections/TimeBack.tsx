"use client";

import { useId, useState } from "react";
import { useSpring } from "@/lib/useSpring";
import { Arrow } from "@/components/icons";
import styles from "./TimeBack.module.css";

// The visitor's own arithmetic: hours a day, as days a year. The year is a
// survey scale bar with a tick per week, and the days spent fill in from the left.
export function TimeBack() {
  const [hours, setHours] = useState(3);
  const id = useId();
  const days = Math.round((hours * 365) / 24);
  const shown = useSpring(days);

  return (
    <section id="time" className="section" data-ground="yellow" aria-labelledby="time-title">
      <div className="inner">
        <h2 id="time-title" className="title">
          Where does the day go?
        </h2>
        <div className={styles.control}>
          <label htmlFor={id}>Hours a day on apps you’d lock</label>
          <input
            id={id}
            type="range"
            min={0.5}
            max={8}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            aria-valuetext={`${hours} hours`}
          />
        </div>
        <p className={styles.answer} aria-live="polite">
          <span className={styles.hours}>{hours} {hours === 1 ? "hour" : "hours"} a day</span> is{" "}
          <strong>
            <span className={styles.days}>{Math.round(shown)}</span> days a year.
          </strong>
        </p>
        <div className={styles.scale} aria-hidden="true" style={{ "--filled": shown / 365 } as React.CSSProperties}>
          <div className={styles.ticks} />
          <div className={styles.fill} />
          <div className={styles.labels}>
            <span>Jan</span>
            <span>Apr</span>
            <span>Jul</span>
            <span>Oct</span>
            <span>Dec</span>
          </div>
        </div>
        <span className={`plate-wrap ${styles.cta}`}>
          <a className="plate" href="#preorder">
            Walk them back <Arrow />
          </a>
        </span>
      </div>
    </section>
  );
}
