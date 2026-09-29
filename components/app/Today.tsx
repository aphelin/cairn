"use client";

import { memo, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ZONES, type Level } from "@/lib/content";
import { store, useStore } from "@/lib/store";
import { DEVICES, MODE_NAMES, ROOMS, SAVED_TODAY, THROUGH, UNLOCKS, hm, metres, spoken, type ModeLevel, type ModeRule } from "@/lib/appDemo";
import { act, lockedIn, onList, useApp, type AppState } from "./state";
import { usePage } from "./Stack";
import { BatteryIcon, BoltIcon, ChevronRightIcon, ShieldIcon, TapIcon } from "./icons";
import { Countdown, Footnote, GroupHead, NavRow, Screen, Switch, Tween, detent, ios, revealInScreen, useScrub } from "./ios";
import styles from "./Today.module.css";

const ANGLES = [-135, -45, 45, 135];
const RINGS = [44, 76, 108]; // Desk, Room, Home, in map units (the map is 240 across)
const MAP = 224; // the map's size on screen, in points

const round = (n: number) => String(Math.round(n));

// Turns the page's dial from inside the app, with the detent's click.
export function setLevel(next: Level) {
  const prev = store.get().level;
  if (next === prev) return;
  store.set({ level: next });
  detent(next > prev);
}

// The line under "Quiet is on": how far the active mode reaches, and where.
export function reachLine(level: ModeLevel, rule: ModeRule) {
  if (level === 1) return `Locked within ${metres(rule.reach)} of the dial.`;
  // 8.7 m from the dial reaches the flat's furthest corner.
  if (rule.rooms.length === ROOMS.length && rule.reach >= 8.7) return "Locked anywhere at home.";
  const names = ROOMS.filter((r) => rule.rooms.includes(r.id)).map((r) => r.name.toLowerCase());
  const where =
    names.length === ROOMS.length ? "in every room" : names.length <= 2 ? `in the ${names.join(" and the ")}` : `in the ${names[0]} and ${names.length - 1} more rooms`;
  return `Locked within ${metres(rule.reach)}, ${where}.`;
}

// What still gets through, in a few words: "Calls and alarms get through".
export function throughLine(rule: ModeRule) {
  const on = THROUGH.filter((t) => rule.through[t.id]).map((t) => t.name.split(" ")[0]!.toLowerCase());
  if (!on.length) return "Nothing gets through";
  const list = on.length === 1 ? on[0]! : `${on.slice(0, -1).join(", ")} and ${on[on.length - 1]}`;
  return `${list[0]!.toUpperCase()}${list.slice(1)} get through`;
}

const offLine = (s: AppState) => {
  const limits = onLimit(s);
  const parts = [s.off.limits && limits ? `Daily limits on ${limits} app${limits === 1 ? "" : "s"}` : "", s.off.schedules ? "schedules" : ""].filter(Boolean);
  if (!parts.length) return "Nothing applies";
  return `${parts.join(" and ")} still apply`.replace(/^s/, "S");
};

const onLimit = (s: AppState) => Object.values(s.apps).filter((a) => a.limit !== null).length;

export const Today = memo(function Today() {
  const level = useStore((s) => s.level);
  const s = useApp((x) => x);
  const page = usePage();
  const on = level > 0;
  const paused = on && s.pauseEnd !== null;
  const quiet = on && !paused;
  const rule = level ? s.modes[level as ModeLevel] : null;
  const locked = level ? lockedIn(s, level as ModeLevel).length : onList(s).length;
  const saved = onList(s).reduce((sum, id) => sum + (SAVED_TODAY[id] ?? 0), 0);
  const reaches = [1, 2, 3].map((m) => s.modes[m as ModeLevel].reach);

  return (
    <Screen title="Today" sub="Friday evening">
      <section className={styles.card} data-on={on ? "" : undefined} data-paused={paused ? "" : undefined} aria-label="Status">
        <ZoneMap level={level} quiet={quiet} desk={reaches[0]!} room={reaches[1]!} home={reaches[2]!} />
        <div className={styles.status}>
          <p className={styles.state}>{paused ? "Unlocked for now" : on ? "Quiet is on" : "Quiet is off"}</p>
          <p className={styles.line}>
            {paused && s.pauseEnd !== null ? (
              <>
                Locks again in <Countdown end={s.pauseEnd} />
              </>
            ) : rule ? (
              reachLine(level as ModeLevel, rule)
            ) : (
              ZONES[0]!.line
            )}
          </p>
          {paused && (
            <button type="button" className={`${ios.pillButton} ${styles.relock}`} data-strong="" onClick={act.relock}>
              Lock again
            </button>
          )}
        </div>
        <div className={styles.stats}>
          <p className={styles.stat}>
            <span className={`${styles.statValue} ${ios.num}`}>
              <Tween value={locked} format={round} />
            </span>
            <span className="visually-hidden">{locked} </span>
            <span className={styles.statLabel}>{paused ? "apps open for now" : on ? "apps locked" : "apps on your list"}</span>
          </p>
          <p className={styles.stat}>
            <span className={`${styles.statValue} ${ios.num}`}>
              <Tween value={saved} format={hm} />
            </span>
            <span className="visually-hidden">{spoken(saved)} </span>
            <span className={styles.statLabel}>back today</span>
          </p>
        </div>
        <button
          type="button"
          className={styles.summary}
          data-push=""
          onClick={(e) => page.push({ kind: "mode", level }, e.currentTarget)}
        >
          <span className={styles.summaryText}>
            <span className={styles.summaryTitle}>{level ? `${ZONES[level]!.label} settings` : "With the dial off"}</span>
            <span className={styles.summaryLine}>{rule ? throughLine(rule) : offLine(s)}</span>
          </span>
          <ChevronRightIcon className={styles.summaryChevron} />
        </button>
        <ModeControl level={level} reaches={reaches} />
      </section>

      <GroupHead>Devices</GroupHead>
      <ul className={ios.group}>
        <NavRow
          className={styles.device}
          icon={<DeviceGlyph level={level} light={s.home.light} />}
          title={DEVICES.home.name}
          sub={
            <span className={styles.battery}>
              {DEVICES.home.place}
              <span aria-hidden="true">·</span>
              <BatteryIcon level={DEVICES.home.battery / 100} className={styles.batteryIcon} />
              <span className={ios.num}>{DEVICES.home.battery}%</span>
              <span className="visually-hidden">battery</span>
            </span>
          }
          detail={
            <span className={styles.chip} data-mode={MODE_NAMES[level]}>
              <span className={styles.chipDot} aria-hidden="true" />
              {ZONES[level]!.label}
            </span>
          }
          selected={page.above === "device-home"}
          onOpen={(el) => page.push({ kind: "device", id: "home" }, el)}
        />
        <NavRow
          className={styles.device}
          icon={<DeviceGlyph pocket />}
          title={DEVICES.pocket.name}
          sub={DEVICES.pocket.place}
          detail={
            <span className={styles.chip}>
              <TapIcon className={styles.tapIcon} />
              {ZONES[s.pocket.mode]!.label}
            </span>
          }
          label={`${DEVICES.pocket.name}, a tap turns on ${ZONES[s.pocket.mode]!.label}`}
          selected={page.above === "device-pocket"}
          onOpen={(el) => page.push({ kind: "device", id: "pocket" }, el)}
        />
      </ul>

      <Safeguards on={on} pauseEnd={paused ? s.pauseEnd : null} unlocksLeft={s.unlocksLeft} lockMode={s.lockMode} />
    </Screen>
  );
});

// The dial from above at the centre, the three reaches around it, and the
// phone on the desk beside it. The ring for the current mode fills with its
// colour, and a pulse runs out to its edge while quiet is on (drawn on its
// own layer, so it costs nothing while the rest stands still).
const ZoneMap = memo(function ZoneMap({ level, quiet, desk, room, home }: { level: Level; quiet: boolean; desk: number; room: number; home: number }) {
  const gid = useId().replace(/:/g, "");
  const reach = level ? RINGS[level - 1]! : 12;
  const deg = ANGLES[level] ?? -135;
  const labels = [desk, room, home];
  return (
    <div className={styles.mapBox} data-level={level} data-quiet={quiet ? "" : undefined}>
      <svg className={styles.map} viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <radialGradient id={`${gid}-z`}>
            <stop offset="0" className={styles.stopIn} />
            <stop offset="0.72" className={styles.stopMid} />
            <stop offset="1" className={styles.stopOut} />
          </radialGradient>
        </defs>
        {RINGS.map((r) => (
          <circle key={r} cx="120" cy="120" r={r} className={styles.ring} />
        ))}
        <g className={styles.zone} style={{ "--k": reach / 108 } as React.CSSProperties}>
          <circle cx="120" cy="120" r="108" fill={`url(#${gid}-z)`} className={styles.zoneFill} />
          <circle cx="120" cy="120" r="108" className={styles.zoneEdge} />
        </g>
        {RINGS.map((r, i) => {
          const d = r * Math.SQRT1_2;
          return (
            <text key={r} x={120 + d + 4} y={120 - d - 2} className={styles.ringLabel} data-on={level === i + 1 ? "" : undefined}>
              {metres(labels[i]!)}
            </text>
          );
        })}
        {/* the phone, on the desk */}
        <g className={styles.phone} transform="translate(147 150) rotate(-16)">
          <rect x="-7" y="-12" width="14" height="24" rx="3.4" className={styles.phoneBody} />
          <rect x="-5.4" y="-10.4" width="10.8" height="20.8" rx="2.2" className={styles.phoneScreen} />
          <g className={styles.phoneLock}>
            <path d="M-2.1 -0.4v-1.5a2.1 2.1 0 0 1 4.2 0v1.5" />
            <rect x="-3.2" y="-0.6" width="6.4" height="4.6" rx="1.1" />
          </g>
        </g>
        {/* the dial */}
        <circle cx="120" cy="120" r="19.5" className={styles.seam} />
        <circle cx="120" cy="120" r="18" className={styles.body} />
        {MAP_KNURL}
        <circle cx="120" cy="120" r="12.5" className={styles.cap} />
        <circle cx="120" cy="112.6" r="2.3" className={styles.dot} style={{ rotate: `${deg}deg`, transformOrigin: "120px 120px" }} />
      </svg>
      <span className={styles.ripple} style={{ "--d": (reach * 2 * MAP) / 240 } as React.CSSProperties} aria-hidden="true" />
    </div>
  );
});

// The iOS segmented control, one segment per detent. Arrow keys move along it,
// as a radio group should, and the thumb can be dragged: each detent it
// passes turns the dial, with its click.
function ModeControl({ level, reaches }: { level: Level; reaches: number[] }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const row = useRef<HTMLDivElement>(null);
  const scrub = useScrub(row, { count: 4, pad: 3, onPick: (i) => setLevel(i as Level), onNear: (i) => setLevel(i as Level) });
  const onKey = (e: KeyboardEvent) => {
    const next = { ArrowRight: level + 1, ArrowDown: level + 1, ArrowLeft: level - 1, ArrowUp: level - 1, Home: 0, End: 3 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const clamped = Math.max(0, Math.min(3, next)) as Level;
    setLevel(clamped);
    refs.current[clamped]?.focus({ preventScroll: true });
  };
  return (
    <div
      ref={row}
      className={styles.segments}
      role="radiogroup"
      aria-label="Mode"
      data-mode={MODE_NAMES[level]}
      data-no-drag=""
      onKeyDown={onKey}
      style={{ "--at": level } as React.CSSProperties}
      {...scrub}
    >
      <span className={styles.thumb} aria-hidden="true" />
      {ZONES.map((z, i) => (
        <button
          key={z.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={level === i}
          tabIndex={level === i ? 0 : -1}
          className={styles.segment}
          onClick={() => setLevel(i as Level)}
        >
          <span className={styles.segLabel}>{z.label}</span>{" "}
          <span className={`${styles.segRange} ${ios.num}`}>{i ? metres(reaches[i - 1]!) : z.range}</span>
        </button>
      ))}
    </div>
  );
}

// The knurled edges, drawn once: they never change.
const knurl = (n: number, from: number, to: number, c: number) => (
  <g className={styles.knurl}>
    {Array.from({ length: n }, (_, i) => (
      <line key={i} x1={c} y1={from} x2={c} y2={to} transform={`rotate(${(i * 360) / n} ${c} ${c})`} />
    ))}
  </g>
);
const MAP_KNURL = knurl(60, 103, 105.4, 120);
const HOME_KNURL = knurl(40, 20 - 15.5 + 0.6, 20 - 10.5 - 1.2, 20);
const POCKET_KNURL = knurl(40, 20 - 17 + 0.6, 20 - 12 - 1.2, 20);

// Cairn Home or Pocket, seen from above, for the device rows and screens.
export function DeviceGlyph({ level = 0, pocket, light = true, className }: { level?: number; pocket?: boolean; light?: boolean; className?: string }) {
  const outer = pocket ? 17 : 15.5;
  const cap = pocket ? 12 : 10.5;
  return (
    <svg
      viewBox="0 0 40 40"
      className={`${styles.deviceGlyph} ${className ?? ""}`}
      data-pocket={pocket ? "" : undefined}
      data-on={!pocket && level > 0 && light ? "" : undefined}
      aria-hidden="true"
    >
      {!pocket && <circle cx="20" cy="20" r="17" className={styles.seam} />}
      <circle cx="20" cy="20" r={outer} className={styles.body} />
      {pocket ? POCKET_KNURL : HOME_KNURL}
      <circle cx="20" cy="20" r={cap} className={styles.cap} />
      {!pocket && <circle cx="20" cy="14" r="1.9" className={styles.dot} style={{ rotate: `${ANGLES[level] ?? -135}deg`, transformOrigin: "20px 20px" }} />}
    </svg>
  );
}

type SafeguardProps = {
  on: boolean;
  pauseEnd: number | null;
  unlocksLeft: number;
  lockMode: boolean;
};

// Lock mode and the emergency unlocks: the two ways out, and how narrow they are.
function Safeguards({ on, pauseEnd, unlocksLeft, lockMode }: SafeguardProps) {
  const [asking, setAsking] = useState(false);
  const [heldNote, setHeldNote] = useState(false);
  const use = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const relock = useRef<HTMLButtonElement>(null);
  const held = on && lockMode;
  const paused = pauseEnd !== null;
  const showAsk = asking && on && unlocksLeft > 0 && !paused;
  const ask = useRef<HTMLLIElement>(null);

  // The held message fades back to the plain line after a while.
  useEffect(() => {
    if (!heldNote) return;
    const id = window.setTimeout(() => setHeldNote(false), 4200);
    return () => window.clearTimeout(id);
  }, [heldNote]);

  const unlockSub = paused ? (
    <>
      In use, <Countdown end={pauseEnd} /> left
    </>
  ) : unlocksLeft === 0 ? (
    `None left until ${UNLOCKS.refill}`
  ) : !on ? (
    "Nothing is locked right now"
  ) : (
    `${unlocksLeft} left this month`
  );

  return (
    <>
      <GroupHead>
        <span id="cairn-safeguards" tabIndex={-1} className={styles.anchor}>
          Safeguards
        </span>
      </GroupHead>
      <ul className={ios.group}>
        <li className={`${ios.row} ${styles.guard}`}>
          <span className={styles.guardIcon} aria-hidden="true">
            <ShieldIcon />
          </span>
          <span className={ios.rowText}>
            <span className={ios.rowTitle} id="cairn-lockmode-name">
              Lock mode
            </span>
            <span className={`${ios.rowSub} ${styles.guardSub}`} id="cairn-lockmode-sub" data-alert={heldNote && held ? "" : undefined} aria-live="polite">
              {heldNote && held ? "Holds while quiet is on. Turn the dial to Off first." : "Cairn can’t be deleted"}
            </span>
          </span>
          <Switch
            label="Lock mode"
            describedBy="cairn-lockmode-sub"
            checked={lockMode}
            onChange={(v) => {
              setHeldNote(false);
              act.setLockMode(v);
            }}
            held={held}
            onHeld={() => setHeldNote(true)}
          />
        </li>
        <li className={`${ios.row} ${styles.guard}`}>
          <span className={styles.guardIcon} aria-hidden="true">
            <BoltIcon />
          </span>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Emergency unlock</span>
            <span className={`${ios.rowSub} ${ios.num}`} id="cairn-unlock-sub">
              {unlockSub}
            </span>
          </span>
          {paused ? (
            <button
              ref={relock}
              type="button"
              className={ios.pillButton}
              onClick={() => {
                act.relock();
                requestAnimationFrame(() => use.current?.focus({ preventScroll: true }));
              }}
            >
              Lock again
            </button>
          ) : (
            <button
              ref={use}
              type="button"
              className={ios.pillButton}
              aria-expanded={showAsk}
              aria-controls="cairn-unlock-ask"
              aria-describedby="cairn-unlock-sub"
              disabled={!on || unlocksLeft === 0}
              onClick={() => {
                setAsking((a) => !a);
                requestAnimationFrame(() => {
                  cancel.current?.focus({ preventScroll: true });
                  revealInScreen(ask.current);
                });
              }}
            >
              Unlock now
            </button>
          )}
        </li>
        <li ref={ask} className={`${ios.row} ${styles.ask}`} id="cairn-unlock-ask" hidden={!showAsk}>
          <p className={styles.askText}>
            Every locked app opens for {UNLOCKS.minutes} minutes. You’ll have {unlocksLeft - 1} left until {UNLOCKS.refill}.
          </p>
          <div className={styles.askButtons}>
            <button
              ref={cancel}
              type="button"
              className={ios.pillButton}
              onClick={() => {
                setAsking(false);
                requestAnimationFrame(() => use.current?.focus({ preventScroll: true }));
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={ios.pillButton}
              data-strong=""
              onClick={() => {
                setAsking(false);
                act.unlock();
                requestAnimationFrame(() => relock.current?.focus({ preventScroll: true }));
              }}
            >
              Unlock for {UNLOCKS.minutes} min
            </button>
          </div>
        </li>
      </ul>
      <Footnote>Emergency unlocks refill on {UNLOCKS.refill}.</Footnote>
    </>
  );
}
