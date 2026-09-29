"use client";

import { memo } from "react";
import { ZONES } from "@/lib/content";
import { useStore } from "@/lib/store";
import { DEVICES, MODE_LEVELS, metres, type ModeLevel } from "@/lib/appDemo";
import { ModeTile } from "./Modes";
import { act, lockedIn, useApp } from "./state";
import { DeviceGlyph } from "./Today";
import { BatteryIcon, LightIcon, TapIcon } from "./icons";
import { CheckRow, Footnote, GroupHead, Screen, Switch, Tile, ios } from "./ios";
import styles from "./Devices.module.css";

// Each device's own screen. Home: the mode it's on, its battery and its
// light. Pocket: what a tap turns on, and whether a second tap unlocks.
export const DeviceDetail = memo(function DeviceDetail({ id }: { id: "home" | "pocket" }) {
  return id === "home" ? <HomeDetail /> : <PocketDetail />;
});

function HomeDetail() {
  const level = useStore((s) => s.level);
  const home = useApp((s) => s.home);
  const reach = useApp((s) => (level ? s.modes[level as ModeLevel].reach : 0));
  return (
    <Screen title={DEVICES.home.name} sub={DEVICES.home.place} art={<DeviceGlyph level={level} light={home.light} className={styles.art} />}>
      <ul className={ios.group}>
        <li className={`${ios.row} ${styles.item}`}>
          <ModeTile level={level} />
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Set to</span>
          </span>
          <span className={`${styles.value} ${ios.num}`}>
            {ZONES[level]!.label}
            {level > 0 && `, ${metres(reach)}`}
          </span>
        </li>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <BatteryIcon level={DEVICES.home.battery / 100} className={styles.battery} />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Battery</span>
          </span>
          <span className={`${styles.value} ${ios.num}`}>{DEVICES.home.battery}%</span>
        </li>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <LightIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Light band</span>
            <span className={ios.rowSub} id="cairn-home-light">
              Glows in the mode’s colour
            </span>
          </span>
          <Switch label="Light band" describedBy="cairn-home-light" checked={home.light} onChange={(v) => act.setHome({ light: v })} />
        </li>
      </ul>
      <Footnote>Turn the dial to change its mode. The battery lasts about two years; swap it with a coin.</Footnote>
    </Screen>
  );
}

function PocketDetail() {
  const pocket = useApp((s) => s.pocket);
  const counts = useApp((s) => MODE_LEVELS.map((m) => lockedIn(s, m).length).join(","));
  const n = counts.split(",").map(Number);
  return (
    <Screen title={DEVICES.pocket.name} sub={DEVICES.pocket.place} art={<DeviceGlyph pocket className={styles.art} />}>
      <GroupHead>A tap turns on</GroupHead>
      <div
        role="radiogroup"
        aria-label="A tap turns on"
        onKeyDown={(e) => {
          // Arrow keys move along the choices, as in any radio group.
          const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (!d) return;
          e.preventDefault();
          const next = Math.min(3, Math.max(1, pocket.mode + d)) as ModeLevel;
          act.setPocket({ mode: next });
          e.currentTarget.querySelectorAll<HTMLElement>("[role=radio]")[next - 1]?.focus({ preventScroll: true });
        }}
      >
        <ul className={ios.group}>
          {MODE_LEVELS.map((m) => (
            <CheckRow
              key={m}
              single
              className={styles.item}
              icon={<ModeTile level={m} />}
              title={ZONES[m]!.label}
              sub={<span className={ios.num}>{`${n[m - 1]} app${n[m - 1] === 1 ? "" : "s"} locked`}</span>}
              checked={pocket.mode === m}
              onToggle={() => act.setPocket({ mode: m })}
            />
          ))}
        </ul>
      </div>
      <Footnote>Pocket locks what that mode locks, wherever your phone goes, until you tap again.</Footnote>

      <ul className={`${ios.group} ${styles.gap}`}>
        <li className={`${ios.row} ${styles.item}`}>
          <Tile>
            <TapIcon />
          </Tile>
          <span className={ios.rowText}>
            <span className={ios.rowTitle}>Tap again to unlock</span>
            <span className={ios.rowSub} id="cairn-pocket-again">
              {pocket.again ? "Walk back and tap to open them" : "Only the dial or the clock opens them"}
            </span>
          </span>
          <Switch label="Tap again to unlock" describedBy="cairn-pocket-again" checked={pocket.again} onChange={(v) => act.setPocket({ again: v })} />
        </li>
      </ul>
      <Footnote>No battery: your phone powers it as it taps.</Footnote>
    </Screen>
  );
}
