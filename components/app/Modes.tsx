"use client";

import { memo, useId, useRef } from "react";
import { AppIcon, APP_NAMES } from "@/components/brand/AppIcon";
import { WALLS } from "@/components/house/plan";
import { APPS, ZONES, type Level } from "@/lib/content";
import { useStore } from "@/lib/store";
import {
  CHAIR,
  DESK,
  DESK_PHONE,
  DIAL_AT,
  DIAL_ROOM,
  FLAT,
  MODE_LEVELS,
  MODE_NAMES,
  PLAN,
  REACH,
  ROOMS,
  THROUGH,
  metres,
  roomLine,
  spokenMetres,
  type ModeLevel,
  type ModeRule,
  type RoomId,
  type ThroughId,
} from "@/lib/appDemo";
import { act, lockedIn, useApp, type AppState } from "./state";
import { routeKey, usePage } from "./Stack";
import { DeviceGlyph, reachLine, setLevel } from "./Today";
import {
  AlarmIcon,
  CheckmarkIcon,
  DialDownIcon,
  HourglassIcon,
  MapIcon,
  MessageIcon,
  PhoneIcon,
  PlusIcon,
  ReachLargeIcon,
  ReachSmallIcon,
  SchedulesIcon,
  TapIcon,
  TodayIcon,
  WalkIcon,
} from "./icons";
import { CheckRow, Footnote, GroupHead, NavRow, Screen, Slider, Switch, Tile, haptic, ios, reducedMotion } from "./ios";
import styles from "./Modes.module.css";

const THROUGH_ICONS: Record<ThroughId, typeof PhoneIcon> = { calls: PhoneIcon, messages: MessageIcon, alarms: AlarmIcon, maps: MapIcon };

// A mode in a few words, for its row: how far, where, and how many apps.
function modeSub(s: AppState, m: Level) {
  if (!m) {
    const limits = Object.values(s.apps).filter((a) => a.limit !== null).length;
    const parts = [s.off.limits && limits ? "daily limits" : "", s.off.schedules ? "schedules" : ""].filter(Boolean);
    return parts.length ? `Only ${parts.join(" and ")}` : "Nothing locks";
  }
  const rule = s.modes[m as ModeLevel];
  const n = lockedIn(s, m as ModeLevel).length;
  const apps = `${n} app${n === 1 ? "" : "s"}`;
  return m === 1 ? `${metres(rule.reach)} round the dial · ${apps}` : `${metres(rule.reach)} · ${roomLine(rule.rooms)} · ${apps}`;
}

// The mode's symbol, on a tile in its own colour: the dial seen from above,
// pointing at it.
export function ModeTile({ level }: { level: Level }) {
  return (
    <Tile mode={MODE_NAMES[level]}>
      <TodayIcon level={level} />
    </Tile>
  );
}

// ——— The Modes tab ———

export const Modes = memo(function Modes() {
  const level = useStore((s) => s.level);
  const s = useApp((x) => x);
  const page = usePage();

  return (
    <Screen title="Modes" sub={level ? `${ZONES[level]!.label} is on` : "The dial is off"}>
      <section className={styles.card} aria-label="Where each mode reaches">
        <FloorPlan view="flat" level={level} rules={s.modes} overview />
        <ul className={styles.legend} aria-hidden="true">
          {MODE_LEVELS.map((m) => (
            <li key={m} data-mode={MODE_NAMES[m]} data-on={m === level ? "" : undefined}>
              <i />
              {ZONES[m]!.label} <span className={ios.num}>{metres(s.modes[m].reach)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ul className={`${ios.group} ${styles.list}`}>
        {([0, 1, 2, 3] as Level[]).map((m) => (
          <NavRow
            key={m}
            className={styles.mode}
            id={`cairn-mode-${MODE_NAMES[m]}`}
            icon={<ModeTile level={m} />}
            title={ZONES[m]!.label}
            sub={modeSub(s, m)}
            detail={m === level ? "On" : undefined}
            selected={page.above === routeKey({ kind: "mode", level: m })}
            onOpen={(el) => page.push({ kind: "mode", level: m }, el)}
          />
        ))}
      </ul>
      <Footnote>Each mode keeps its own settings. Turn the dial, or pick a mode on Today.</Footnote>

      <GroupHead>Cairn Pocket</GroupHead>
      <ul className={ios.group}>
        <NavRow
          className={styles.mode}
          icon={<DeviceGlyph pocket className={styles.glyph} />}
          title="A tap turns on"
          detail={ZONES[s.pocket.mode]!.label}
          selected={page.above === "device-pocket"}
          onOpen={(el) => page.push({ kind: "device", id: "pocket" }, el)}
        />
      </ul>
    </Screen>
  );
});

// ——— A mode's own settings ———

export const ModeEditor = memo(function ModeEditor({ level }: { level: Level }) {
  return level ? <ZoneEditor level={level as ModeLevel} /> : <OffEditor />;
});

// Turns the dial to this mode from its own screen, or says it's on (Off,
// being on, needs no saying).
function NowButton({ level, current }: { level: Level; current: Level }) {
  if (current === level && !level) return null;
  if (current === level)
    return (
      <span className={styles.now}>
        <i aria-hidden="true" />
        On
      </span>
    );
  return (
    <button type="button" onClick={() => setLevel(level)}>
      {level ? "Turn on" : "Turn off"}
    </button>
  );
}

function ZoneEditor({ level }: { level: ModeLevel }) {
  const rule = useApp((s) => s.modes[level]);
  const modes = useApp((s) => s.modes);
  const apps = useApp((s) => s.apps);
  const current = useStore((s) => s.level);
  const zone = ZONES[level]!;
  const r = REACH[level];
  const count = APPS.filter((a) => apps[a.id].modes.includes(level)).length;

  return (
    <Screen title={zone.label} sub={reachLine(level, rule)} tint={MODE_NAMES[level]} trailing={<NowButton level={level} current={current} />}>
      <section className={styles.card} aria-label={`Where ${zone.label} reaches`}>
        <FloorPlan view={level === 1 ? "desk" : "flat"} level={level} rules={modes} edit />
        <div className={styles.reach}>
          <p className={styles.reachHead}>
            <span>Reach</span>
            <span className={`${styles.reachValue} ${ios.num}`} aria-hidden="true">
              {metres(rule.reach)}
            </span>
          </p>
          <Slider
            value={rule.reach}
            min={r.min}
            max={r.max}
            step={r.step}
            label={`How far ${zone.label} reaches`}
            valueText={spokenMetres(rule.reach)}
            onChange={(v) => act.setReach(level, v)}
            lead={<ReachSmallIcon />}
            trail={<ReachLargeIcon />}
          />
        </div>
      </section>
      <Footnote>
        {level === 1
          ? "Desk reaches round the dial, on whichever desk it sits."
          : level === 2
            ? "Tap a room to add it. The study, where the dial is, is always in."
            : "Tap a room to leave it out. Past the reach, a room stays open."}
      </Footnote>

      <GroupHead>
        Locks <span className={`${styles.count} ${ios.num}`}>{count}</span>
      </GroupHead>
      <div role="group" aria-label={`Apps ${zone.label} locks`}>
        <ul className={ios.group}>
          {APPS.map((a) => (
            <CheckRow
              key={a.id}
              className={styles.app}
              icon={<AppIcon app={a.id} className={styles.appIcon} />}
              title={APP_NAMES[a.id]}
              checked={apps[a.id].modes.includes(level)}
              onToggle={() => act.toggleAppMode(a.id, level)}
            />
          ))}
        </ul>
      </div>

      <GroupHead>Still gets through</GroupHead>
      <ul className={ios.group}>
        {THROUGH.map((t) => {
          const Icon = THROUGH_ICONS[t.id];
          return (
            <li key={t.id} className={`${ios.row} ${styles.item}`}>
              <Tile>
                <Icon />
              </Tile>
              <span className={ios.rowText}>
                <span className={ios.rowTitle}>{t.name}</span>
              </span>
              <Switch label={t.name} checked={rule.through[t.id]} onChange={(v) => act.setThrough(level, t.id, v)} />
            </li>
          );
        })}
      </ul>

      <GroupHead>Unlocks when</GroupHead>
      <ul className={ios.group}>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <DialDownIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>You turn the dial down</span>
          </span>
          <span className={styles.always}>Always</span>
        </li>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <WalkIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>You walk out of reach</span>
          </span>
          <Switch label="Unlock when you walk out of reach" checked={rule.walk} onChange={(v) => act.setUnlock(level, "walk", v)} />
        </li>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <TapIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>You tap Pocket</span>
          </span>
          <Switch label="Unlock when you tap Pocket" checked={rule.pocket} onChange={(v) => act.setUnlock(level, "pocket", v)} />
        </li>
      </ul>
      <Footnote>Emergency unlocks work in every mode.</Footnote>
    </Screen>
  );
}

function OffEditor() {
  const off = useApp((s) => s.off);
  const apps = useApp((s) => s.apps);
  const schedules = useApp((s) => s.schedules);
  const current = useStore((s) => s.level);
  const page = usePage();
  const limited = APPS.filter((a) => apps[a.id].limit !== null);
  const on = PLAN.filter((p) => schedules[p.id]).map((p) => p.name);
  const scheduleSub = on.length ? `${on.join(" and ")} still turn${on.length === 1 ? "s" : ""} a mode on` : "No schedules are on";

  return (
    <Screen title="Off" sub="What still holds with the dial off" trailing={<NowButton level={0} current={current} />}>
      <ul className={ios.group}>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <HourglassIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Daily limits</span>
            <span className={ios.rowSub} id="cairn-off-limits">
              {limited.length} app{limited.length === 1 ? "" : "s"} lock at their limit
            </span>
          </span>
          <Switch label="Daily limits" describedBy="cairn-off-limits" checked={off.limits} onChange={(v) => act.setOff("limits", v)} />
        </li>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <SchedulesIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Schedules</span>
            <span className={ios.rowSub} id="cairn-off-schedules">
              {scheduleSub}
            </span>
          </span>
          <Switch label="Schedules" describedBy="cairn-off-schedules" checked={off.schedules} onChange={(v) => act.setOff("schedules", v)} />
        </li>
      </ul>
      <Footnote>Everything else gets through until you turn the dial.</Footnote>

      <GroupHead>Daily limits</GroupHead>
      {limited.length ? (
        <ul className={ios.group}>
          {limited.map((a) => {
            const limit = apps[a.id].limit!;
            return (
              <NavRow
                key={a.id}
                className={styles.app}
                icon={<AppIcon app={a.id} className={styles.appIcon} />}
                title={APP_NAMES[a.id]}
                sub={<span className={ios.num}>{a.today >= limit ? "Limit reached for today" : `${a.today} of ${limit} min today`}</span>}
                detail={<span className={ios.num}>{limit} min</span>}
                selected={page.above === routeKey({ kind: "app", id: a.id })}
                onOpen={(el) => page.push({ kind: "app", id: a.id }, el)}
              />
            );
          })}
        </ul>
      ) : null}
      <Footnote>{limited.length ? "Tap an app to change its limit." : "No app has a limit yet. Set one on any app in Apps."}</Footnote>
    </Screen>
  );
}

// ——— The floor plan ———

// The flat in decimetres, from its north-west corner.
const X = (x: number) => (x - FLAT.x0) * 10;
const Y = (z: number) => (z - FLAT.z0) * 10;
const W = X(FLAT.x1);
const H = Y(FLAT.z1);
const PAD = 4;
const DIAL = { x: X(DIAL_AT.x), y: Y(DIAL_AT.z) };
// Desk's longest reach, and the steps its close-up marks out to it.
const DESK_MAX = REACH[1].max * 10;
const DESK_MARKS = Array.from({ length: Math.round(REACH[1].max / 0.5) }, (_, i) => (i + 1) * 5);
// The whole flat, or Desk's close-up: the desk and the floor round it, just
// wide and deep enough for its longest reach, with a strip of the window
// wall above. The study's side walls run on out of the frame.
const VIEWS = {
  flat: { x: -PAD, y: -PAD, w: W + 2 * PAD, h: H + 2 * PAD },
  desk: { x: DIAL.x - DESK_MAX - 3, y: -3, w: 2 * DESK_MAX + 6, h: DIAL.y + DESK_MAX + 6 },
};
// The study's floor, which the close-up's marks stay inside.
const STUDY = ROOMS.find((r) => r.id === DIAL_ROOM)!;
// Where the close-up's walls start to fade, so they read as running on past
// the frame rather than stopping at it: below the longest reach's last
// crossing of a side wall.
const DESK_FADE = { from: DIAL.y + DESK_MAX * 0.85, to: VIEWS.desk.y + VIEWS.desk.h };
const POCKET = { x: X(-4.9), y: Y(1.12) };

// Each wall as the lengths of solid wall between its doorways and windows,
// and its windows as thin panes.
const WALL_PARTS = WALLS.flatMap((w) => {
  const at = w.axis === "x" ? Y(w.at) : X(w.at);
  const to = (v: number) => (w.axis === "x" ? X(v) : Y(v));
  const gaps = [...(w.openings ?? [])].sort((a, b) => a[0] - b[0]);
  const parts: { d: string; pane: boolean }[] = [];
  let from = w.a;
  const seg = (a: number, b: number, pane: boolean) =>
    parts.push({ d: w.axis === "x" ? `M${to(a)} ${at}H${to(b)}` : `M${at} ${to(a)}V${to(b)}`, pane });
  for (const [a, b, sill] of gaps) {
    seg(from, a, false);
    if (sill > 0) seg(a, b, true);
    from = b;
  }
  seg(from, w.b, false);
  return parts;
});

type PlanProps = {
  view: "flat" | "desk";
  // The mode it shows lit (0 for none).
  level: Level;
  rules: Record<ModeLevel, ModeRule>;
  // The Modes tab's overview: every mode's reach as a ring, the one that's on lit.
  overview?: boolean;
  // A mode's own settings: its rooms can be tapped in and out.
  edit?: boolean;
};

// The flat from above with the dial on the study desk. The lit mode's zone
// is where its reach and its rooms meet: the ring shows how far it reaches,
// and the rooms it covers are washed in its colour.
function FloorPlan({ view, level, rules, overview, edit }: PlanProps) {
  const id = useId().replace(/:/g, "");
  const v = VIEWS[view];
  const rule = level ? rules[level as ModeLevel] : null;
  const rooms = rule ? (level === 1 ? ROOMS.map((r) => r.id) : rule.rooms) : [];
  const reach = rule ? rule.reach * 10 : 0;
  const pct = (n: number, of: number) => `${(n / of) * 100}%`;

  return (
    <div className={styles.plan} data-view={view} data-lit={rule ? "" : undefined}>
      <svg viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} className={styles.planSvg} aria-hidden="true">
        <defs>
          <clipPath id={`${id}-reach`}>
            <circle cx={DIAL.x} cy={DIAL.y} r={Math.max(0.01, reach)} className={styles.reachCircle} />
          </clipPath>
          <clipPath id={`${id}-flat`}>
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          {view === "desk" && (
            <>
              <clipPath id={`${id}-study`}>
                <rect x={X(STUDY.x0)} y={Y(STUDY.z0)} width={(STUDY.x1 - STUDY.x0) * 10} height={(STUDY.z1 - STUDY.z0) * 10} />
              </clipPath>
              <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1="0" y1={DESK_FADE.from} x2="0" y2={DESK_FADE.to}>
                <stop offset="0" />
                <stop offset="1" stopOpacity="0" />
              </linearGradient>
              <mask id={`${id}-crop`} className={styles.fade} maskUnits="userSpaceOnUse" x={v.x} y={v.y} width={v.w} height={v.h}>
                <rect x={v.x} y={v.y} width={v.w} height={v.h} fill={`url(#${id}-fade)`} />
              </mask>
            </>
          )}
        </defs>
        {ROOMS.map((r) => (
          <rect
            key={r.id}
            x={X(r.x0)}
            y={Y(r.z0)}
            width={(r.x1 - r.x0) * 10}
            height={(r.z1 - r.z0) * 10}
            className={styles.floor}
            data-in={rule && level > 1 && rooms.includes(r.id) ? "" : undefined}
          />
        ))}
        <rect x={X(DESK.x0)} y={Y(DESK.z0)} width={(DESK.x1 - DESK.x0) * 10} height={(DESK.z1 - DESK.z0) * 10} rx="0.6" className={styles.desk} />
        <rect x={X(CHAIR.x) - CHAIR.r * 10} y={Y(CHAIR.z) - CHAIR.r * 10} width={CHAIR.r * 20} height={CHAIR.r * 20} rx="1.6" className={styles.desk} />
        <g transform={`translate(${X(DESK_PHONE.x)} ${Y(DESK_PHONE.z)}) rotate(${DESK_PHONE.turn})`}>
          <rect x="-0.9" y="-1.75" width="1.8" height="3.5" rx="0.45" className={styles.phone} />
        </g>
        {/* the zone: the rooms it covers, as far as it reaches */}
        {rule && (
          <g clipPath={`url(#${id}-flat)`}>
            <g clipPath={`url(#${id}-reach)`}>
              {ROOMS.filter((r) => rooms.includes(r.id)).map((r) => (
                <rect key={r.id} x={X(r.x0)} y={Y(r.z0)} width={(r.x1 - r.x0) * 10} height={(r.z1 - r.z0) * 10} className={styles.zone} />
              ))}
            </g>
          </g>
        )}
        {/* Desk's close-up marks every half metre out to its longest reach,
            on the study's floor and stopping at its walls */}
        {view === "desk" && (
          <g clipPath={`url(#${id}-study)`}>
            {DESK_MARKS.map((r) => (
              <circle key={r} cx={DIAL.x} cy={DIAL.y} r={r} className={styles.mark} />
            ))}
          </g>
        )}
        <g mask={view === "desk" ? `url(#${id}-crop)` : undefined}>
          {WALL_PARTS.map((p, i) => (
            <path key={i} d={p.d} className={p.pane ? styles.pane : styles.wall} />
          ))}
        </g>
        {/* every mode's reach, in the overview; the lit one's, when editing */}
        {overview &&
          MODE_LEVELS.map((m) => (
            <circle key={m} cx={DIAL.x} cy={DIAL.y} r={rules[m].reach * 10} className={styles.ring} data-mode={MODE_NAMES[m]} data-on={m === level ? "" : undefined} />
          ))}
        {!overview && rule && <circle cx={DIAL.x} cy={DIAL.y} r={reach} className={`${styles.ring} ${styles.reachCircle}`} data-on="" />}
        <circle cx={POCKET.x + 0.9} cy={POCKET.y} r="1.5" className={styles.pocket} />
        <circle cx={DIAL.x} cy={DIAL.y} r={view === "desk" ? 2.1 : 2.6} className={styles.dialBody} />
        <circle cx={DIAL.x} cy={DIAL.y} r={view === "desk" ? 1.2 : 1.5} className={styles.dialCap} />
      </svg>
      {view === "flat" &&
        ROOMS.map((r) => {
          const box = {
            left: pct(X(r.x0) - v.x, v.w),
            top: pct(Y(r.z0) - v.y, v.h),
            width: pct((r.x1 - r.x0) * 10, v.w),
            height: pct((r.z1 - r.z0) * 10, v.h),
          };
          const included = rooms.includes(r.id);
          if (!edit)
            return (
              <span key={r.id} className={styles.roomName} style={box} data-in={level > 1 && included ? "" : undefined}>
                {r.name}
              </span>
            );
          return <RoomButton key={r.id} level={level as ModeLevel} room={r.id} name={r.name} included={included} fixed={level === 2 && r.id === DIAL_ROOM} style={box} />;
        })}
      {view === "desk" && (
        <span
          className={styles.deskName}
          style={{ left: pct(X((DESK.x0 + DIAL_AT.x) / 2 - 0.1) - v.x, v.w), top: pct(Y((DESK.z0 + DESK.z1) / 2) - v.y, v.h) }}
        >
          Desk
        </span>
      )}
    </div>
  );
}

// A room on the plan, tapped in or out of a mode. The dial's own room can't
// leave Room: it shakes its head instead.
function RoomButton({ level, room, name, included, fixed, style }: { level: ModeLevel; room: RoomId; name: string; included: boolean; fixed: boolean; style: React.CSSProperties }) {
  const pill = useRef<HTMLSpanElement>(null);
  return (
    <button
      type="button"
      className={styles.room}
      style={style}
      aria-pressed={included}
      aria-disabled={fixed || undefined}
      aria-label={fixed ? `${name}, where the dial is, always in` : name}
      data-no-drag=""
      onClick={() => {
        if (act.toggleRoom(level, room)) return haptic(3);
        if (!reducedMotion())
          pill.current?.animate([{ translate: "0" }, { translate: "-4px" }, { translate: "3px" }, { translate: "-2px" }, { translate: "0" }], { duration: 320, easing: "ease-out" });
      }}
    >
      <span ref={pill} className={styles.pill}>
        {included ? <CheckmarkIcon className={styles.pillIcon} /> : <PlusIcon className={styles.pillIcon} />}
        {name}
      </span>
    </button>
  );
}
