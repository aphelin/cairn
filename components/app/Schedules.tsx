"use client";

import { memo, type CSSProperties } from "react";
import { ZONES } from "@/lib/content";
import { DAYS, MODE_NAMES, NOW, PLAN, TODAY, clock, type ScheduleId } from "@/lib/appDemo";
import { act, useApp } from "./state";
import { BriefcaseIcon, CalendarIcon, MoonIcon } from "./icons";
import { Footnote, GroupHead, Screen, Switch, ios } from "./ios";
import styles from "./Schedules.module.css";
const ICONS: Record<ScheduleId, typeof MoonIcon> = { work: BriefcaseIcon, bed: MoonIcon, weekend: CalendarIcon };
const WEEK = 7 * 1440;
// Drawn bottom to top, so bedtime sits over a weekend.
const LAYERS: ScheduleId[] = ["weekend", "work", "bed"];

type Plan = (typeof PLAN)[number];

// The stretches of one day a schedule covers, in minutes since midnight.
function spans(s: Plan, day: number): [number, number][] {
  if (s.end > s.start) return s.days.includes(day) ? [[s.start, s.end]] : [];
  const out: [number, number][] = [];
  if (s.days.includes((day + 6) % 7)) out.push([0, s.end]);
  if (s.days.includes(day)) out.push([s.start, 1440]);
  return out;
}

// What's on now, or what comes next, for the line under the title.
export function scheduleLine(on: Record<ScheduleId, boolean>) {
  const now = TODAY * 1440 + NOW;
  const live = PLAN.filter((s) => on[s.id]);
  if (!live.length) return "No schedules are on";
  let next: { s: Plan; at: number } | null = null;
  for (const s of live) {
    for (const d of s.days) {
      const start = d * 1440 + s.start;
      const end = start + ((s.end - s.start + 1440) % 1440 || 1440);
      for (const shift of [-WEEK, 0, WEEK]) {
        if (now >= start + shift && now < end + shift) return `${s.name} ${s.id === "weekend" ? "are" : "is"} on until ${clock(s.end % 1440)}`;
        if (start + shift > now && (!next || start + shift < next.at)) next = { s, at: start + shift };
      }
    }
  }
  if (!next) return "No schedules are on";
  const wait = next.at - now;
  const verb = next.s.id === "weekend" ? "start" : "starts";
  if (wait < 60) return `${next.s.name} ${verb} in ${wait} min`;
  const day = Math.floor(next.at / 1440) % 7;
  const when = day === TODAY ? "at" : day === (TODAY + 1) % 7 ? "tomorrow at" : `${DAYS[day]!.long} at`;
  return `${next.s.name} ${verb} ${when} ${clock(next.at % 1440)}`;
}

export const Schedules = memo(function Schedules() {
  const on = useApp((s) => s.schedules);
  const onToggle = act.toggleSchedule;
  const plan = Object.fromEntries(PLAN.map((s) => [s.id, s])) as Record<ScheduleId, Plan>;
  const summary = PLAN.filter((s) => on[s.id])
    .map((s) => `${s.name}, ${s.when.toLowerCase()}`)
    .join(". ");

  return (
    <Screen title="Schedules" sub={scheduleLine(on)}>
      <section className={styles.week} aria-labelledby="cairn-week-title">
        <div className={styles.weekHead}>
          <h4 id="cairn-week-title" className={styles.weekTitle}>
            This week
          </h4>
          <p className={`${styles.now} ${ios.num}`}>
            <span className={styles.nowDot} aria-hidden="true" />
            Now, {clock(NOW)}
          </p>
        </div>
        <div className={styles.grid} role="img" aria-label={summary ? `Week plan. ${summary}.` : "Week plan. No schedules are on."}>
          <div className={styles.hours}>
            {[0, 6, 12, 18, 24].map((h) => (
              <span key={h} className={ios.num} style={{ "--x": h / 24 } as CSSProperties}>
                {h}
              </span>
            ))}
          </div>
          {DAYS.map((d, day) => (
            <div key={d.short} className={styles.day} data-today={day === TODAY ? "" : undefined}>
              <span className={styles.dayName}>{d.short}</span>
              <span className={styles.track}>
                {[6, 12, 18].map((h) => (
                  <span key={h} className={styles.tick} style={{ "--x": h / 24 } as CSSProperties} />
                ))}
                {LAYERS.flatMap((id) =>
                  spans(plan[id], day).map(([a, b]) => (
                    <span
                      key={`${id}-${a}`}
                      className={styles.block}
                      data-mode={MODE_NAMES[plan[id].level]}
                      data-on={on[id] ? "" : undefined}
                      data-from={a === 0 && id === "bed" ? "end" : undefined}
                      style={{ "--a": a / 1440, "--w": (b - a) / 1440, "--d": day } as CSSProperties}
                    />
                  )),
                )}
                {day === TODAY && <span className={styles.marker} style={{ "--x": NOW / 1440 } as CSSProperties} />}
              </span>
            </div>
          ))}
        </div>
      </section>

      <GroupHead>Schedules</GroupHead>
      <ul className={ios.group}>
        {PLAN.map((s) => {
          const Icon = ICONS[s.id];
          const zone = ZONES[s.level]!;
          return (
            <li key={s.id} className={`${ios.row} ${styles.item}`}>
              <span className={styles.badge} data-mode={MODE_NAMES[s.level]} data-on={on[s.id] ? "" : undefined} aria-hidden="true">
                <Icon />
              </span>
              <span className={ios.rowText}>
                <span className={ios.rowTitle}>{s.name}</span>
                <span className={ios.rowSub} id={`cairn-plan-${s.id}`}>
                  {s.when}
                  <br />
                  Turns on {zone.label}, {zone.range}
                </span>
              </span>
              <Switch label={s.name} describedBy={`cairn-plan-${s.id}`} checked={on[s.id]} onChange={() => onToggle(s.id)} />
            </li>
          );
        })}
      </ul>
      <Footnote>A schedule turns the mode on by itself. The dial can always go higher.</Footnote>
    </Screen>
  );
});
