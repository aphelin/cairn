"use client";

import { memo, useState, type CSSProperties } from "react";
import { AppIcon, APP_NAMES } from "@/components/brand/AppIcon";
import { BEST_STREAK, DAYS, MOST_USED, NIGHTS, TODAY, WEEK, hm, spoken, streak } from "@/lib/appDemo";
import { ArrowDownIcon, MoonIcon } from "./icons";
import { GroupHead, Screen, Tween, ios } from "./ios";
import styles from "./Insights.module.css";

const MAX = 240; // the chart's top, 4 hours
const GRID = [60, 120, 180, 240];
const days = WEEK.now.filter((m): m is number => m !== null);
const AVG_NOW = days.reduce((a, b) => a + b, 0) / days.length;
const AVG_LAST = WEEK.last.reduce((a, b) => a + b, 0) / WEEK.last.length;

// Screen time, this week against last. Tap a day to read it; tap it again
// to go back to the week.
export const Insights = memo(function Insights() {
  const [day, setDay] = useState<number | null>(null);
  const now = day === null ? AVG_NOW : (WEEK.now[day] ?? 0);
  const last = day === null ? AVG_LAST : WEEK.last[day]!;
  const future = day !== null && WEEK.now[day] === null;
  const diff = last - now;
  const nights = streak(NIGHTS);
  const top = MOST_USED[0]!.minutes;

  const label = day === null ? "Daily average" : `${DAYS[day]!.long}${day === TODAY ? ", so far" : ""}`;
  const compare = day === null ? "last week" : `last ${DAYS[day]!.long}`;

  return (
    <Screen title="Insights" sub="This week so far">
      <section className={styles.card} aria-labelledby="cairn-figure-label">
        <div className={styles.figure}>
          <p id="cairn-figure-label" className={styles.figureLabel}>
            {label}
          </p>
          <p className={styles.figureValue} aria-live="polite">
            {future ? <span aria-hidden="true">Not yet</span> : <Tween value={now} format={hm} />}
            <span className="visually-hidden">{future ? "No screen time yet" : spoken(now)}</span>
          </p>
          <p className={styles.delta} data-up={!future && diff < 0 ? "" : undefined}>
            {future ? (
              <>This day hasn’t happened yet</>
            ) : (
              <>
                <ArrowDownIcon className={styles.deltaIcon} />
                <span className={ios.num}>{hm(Math.abs(diff))}</span> {diff >= 0 ? "less" : "more"} than {compare}
              </>
            )}
          </p>
        </div>

        <div className={styles.chart}>
          <div className={styles.plot}>
            {GRID.map((g) => (
              <span key={g} className={styles.gridline} style={{ "--y": g / MAX } as CSSProperties} aria-hidden="true">
                <span className={ios.num}>{g / 60}h</span>
              </span>
            ))}
            <div className={styles.slots} role="group" aria-label="Screen time by day">
              {DAYS.map((d, i) => {
                const n = WEEK.now[i] ?? null;
                const l = WEEK.last[i]!;
                const selected = day === i;
                return (
                  <button
                    key={d.short}
                    type="button"
                    className={styles.slot}
                    aria-pressed={selected}
                    aria-label={`${d.long}: ${n === null ? "no data yet" : spoken(n)} this week, ${spoken(l)} last week`}
                    data-dim={day !== null && !selected ? "" : undefined}
                    data-today={i === TODAY ? "" : undefined}
                    style={{ "--i": i } as CSSProperties}
                    onClick={() => setDay(selected ? null : i)}
                  >
                    <span className={styles.bars} aria-hidden="true">
                      <span className={styles.barLast} style={{ "--h": l / MAX } as CSSProperties} />
                      <span className={styles.barNow} data-empty={n === null ? "" : undefined} style={{ "--h": (n ?? 0) / MAX } as CSSProperties} />
                    </span>
                    <span className={styles.dayLetter} aria-hidden="true">
                      {d.short.slice(0, 1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className={styles.legend} aria-hidden="true">
            <span>
              <i className={styles.keyNow} />
              This week
            </span>
            <span>
              <i className={styles.keyLast} />
              Last week
            </span>
          </p>
        </div>
      </section>

      <section className={styles.streak} aria-labelledby="cairn-streak">
        <span className={styles.streakIcon} aria-hidden="true">
          <MoonIcon />
        </span>
        <div className={styles.streakText}>
          <p id="cairn-streak" className={styles.streakValue}>
            <span className={ios.num}>{nights}</span> nights in a row
          </p>
          <p className={styles.streakLabel}>Bedtime kept. Your best is {BEST_STREAK}.</p>
        </div>
        <ol className={styles.nights} aria-label={`Last ${NIGHTS.length} nights: ${NIGHTS.filter(Boolean).length} kept`}>
          {NIGHTS.map((kept, i) => (
            <li key={i} data-kept={kept ? "" : undefined} style={{ "--i": i } as CSSProperties} />
          ))}
        </ol>
        <p className={styles.nightsScale} aria-hidden="true">
          <span>Two weeks ago</span>
          <span>Last night</span>
        </p>
      </section>

      <GroupHead>Most used this week</GroupHead>
      <ul className={ios.group}>
        {MOST_USED.map((a) => (
          <li key={a.id} className={`${ios.row} ${styles.used}`}>
            <AppIcon app={a.id} className={styles.icon} />
            <span className={ios.rowText}>
              <span className={styles.usedHead}>
                <span className={ios.rowTitle}>{APP_NAMES[a.id]}</span>
                <span className={`${styles.usedTime} ${ios.num}`}>{hm(a.minutes)}</span>
              </span>
              <span className={styles.usedBar} aria-hidden="true">
                <span style={{ "--f": a.minutes / top } as CSSProperties} />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
});
